import { createClient } from "npm:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

function responseJson(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function env(
  name: string,
  required = true,
) {
  const value =
    Deno.env.get(name) || "";

  if (required && !value) {
    throw new Error(
      `Falta secret: ${name}`,
    );
  }

  return value;
}

function text(
  value: unknown,
) {
  return String(
    value ?? "",
  ).trim();
}

function objectValue(
  value: unknown,
): JsonObject | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonObject;
}

/*
 * Comparación del token sin devolver información
 * útil sobre diferencias parciales.
 */
function secureEquals(
  left: string,
  right: string,
) {
  if (
    !left ||
    !right ||
    left.length !== right.length
  ) {
    return false;
  }

  let diff = 0;

  for (
    let i = 0;
    i < left.length;
    i += 1
  ) {
    diff |=
      left.charCodeAt(i) ^
      right.charCodeAt(i);
  }

  return diff === 0;
}

function bearerToken(
  req: Request,
) {
  const authorization =
    text(
      req.headers.get(
        "authorization",
      ),
    );

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i,
    );

  return match
    ? text(match[1])
    : "";
}

function providerWebhookId(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    !Number.isSafeInteger(parsed)
  ) {
    return null;
  }

  return parsed;
}

function normalizeTags(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    Array.isArray(value) ||
    typeof value === "object"
  ) {
    return value;
  }

  const raw =
    text(value);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [raw];
  }
}

function hasProtocolLogisticsTag(
  value: unknown,
) {
  const normalized =
    normalizeTags(value);

  if (!Array.isArray(normalized)) {
    return false;
  }

  return normalized.some(
    (tag) =>
      text(tag).toLowerCase() ===
      "protocol-logistics-status",
  );
}

/*
 * Brevo informa timestamps en distintos campos
 * según el tipo de evento.
 *
 * Aceptamos:
 * - ts_epoch
 * - ts_event
 * - ts
 * - date como último fallback
 *
 * Algunos timestamps están en segundos y otros
 * pueden venir expresados en milisegundos.
 */
function occurredAtIso(
  body: JsonObject,
): string | null {
  const candidates = [
    body.ts_epoch,
    body.ts_event,
    body.ts,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      candidate === null ||
      candidate === undefined ||
      candidate === ""
    ) {
      continue;
    }

    const numeric =
      Number(candidate);

    if (
      !Number.isFinite(numeric) ||
      numeric <= 0
    ) {
      continue;
    }

    const milliseconds =
      numeric > 100_000_000_000
        ? numeric
        : numeric * 1000;

    const date =
      new Date(milliseconds);

    if (
      Number.isFinite(
        date.getTime(),
      )
    ) {
      return date.toISOString();
    }
  }

  const dateRaw =
    text(body.date);

  if (dateRaw) {
    const parsed =
      new Date(dateRaw);

    if (
      Number.isFinite(
        parsed.getTime(),
      )
    ) {
      return parsed.toISOString();
    }
  }

  return null;
}

Deno.serve(
  async (req) => {
    if (
      req.method !== "POST"
    ) {
      return responseJson(
        {
          status:
            "method_not_allowed",
        },
        405,
      );
    }

    try {
      /* ----------------------------------------------------
         1. Autenticación exclusiva Brevo → Protocol.
         ---------------------------------------------------- */

      const expectedToken =
        env(
          "ALPASO_LOGISTICS_BREVO_WEBHOOK_TOKEN",
        );

      const receivedToken =
        bearerToken(req);

      if (
        !secureEquals(
          receivedToken,
          expectedToken,
        )
      ) {
        return responseJson(
          {
            status:
              "unauthorized",
          },
          401,
        );
      }


      /* ----------------------------------------------------
         2. Payload.
         ---------------------------------------------------- */

      const parsed =
        await req
          .json()
          .catch(
            () => null,
          );

      const body =
        objectValue(parsed);

      if (!body) {
        return responseJson(
          {
            status:
              "invalid_payload",
          },
          400,
        );
      }


      const rawTags =
        body.tags ??
        body.tag;

      if (
        !hasProtocolLogisticsTag(
          rawTags,
        )
      ) {
        return responseJson(
          {
            status:
              "ignored",

            reason:
              "not_protocol_logistics_status",
          },
          200,
        );
      }


      const eventType =
        text(
          body.event,
        );

      const messageId =
        text(
          body["message-id"] ??
          body.message_id ??
          body.messageId,
        );

      const occurredAt =
        occurredAtIso(body);


      if (!eventType) {
        return responseJson(
          {
            status:
              "invalid_payload",

            message:
              "Falta event.",
          },
          400,
        );
      }


      if (!messageId) {
        return responseJson(
          {
            status:
              "invalid_payload",

            message:
              "Falta message-id.",
          },
          400,
        );
      }


      if (!occurredAt) {
        return responseJson(
          {
            status:
              "invalid_payload",

            message:
              "No se pudo determinar occurred_at.",
          },
          400,
        );
      }


      /* ----------------------------------------------------
         3. Supabase service role.

         Nunca exponemos esta credencial al caller.
         ---------------------------------------------------- */

      const supabaseUrl =
        env(
          "SUPABASE_URL",
        );

      const supabaseKey =
        env(
          "SUPABASE_SERVICE_ROLE_KEY",
          false,
        ) ||
        env(
          "ALPASO_TRACKING_SUPABASE_KEY",
        );

      const supabase =
        createClient(
          supabaseUrl,
          supabaseKey,
          {
            auth: {
              persistSession:
                false,
            },
          },
        );


      /* ----------------------------------------------------
         4. Registro transaccional.

         El RPC:
         - correlaciona message-id
         - deduplica
         - guarda histórico
         - actualiza resumen
         ---------------------------------------------------- */

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "protocol_logistics_status_email_activity_record",
          {
            input_brevo_message_id:
              messageId,

            input_event_type:
              eventType,

            input_occurred_at:
              occurredAt,

            input_recipient_email:
              text(body.email) ||
              null,

            input_clicked_url:
              text(body.link) ||
              null,

            input_subject:
              text(body.subject) ||
              null,

            input_reason:
              text(body.reason) ||
              null,

            input_tags:
              normalizeTags(
                rawTags,
              ),

            input_provider_webhook_id:
              providerWebhookId(
                body.id,
              ),

            input_correlation_method:
              "message_id",

            input_payload:
              body,
          },
        );


      if (error) {
        console.error(
          "[Brevo Logistics Webhook] RPC error",
          {
            message:
              error.message,
          },
        );

        return responseJson(
          {
            status:
              "internal_error",
          },
          500,
        );
      }


      const result =
        objectValue(data);

      const resultStatus =
        text(
          result?.status,
        );


      /*
       * duplicate es éxito:
       * Brevo simplemente reintentó el mismo webhook.
       */
      if (
        resultStatus ===
        "recorded" ||
        resultStatus ===
        "duplicate"
      ) {
        return responseJson(
          {
            status:
              "ok",

            result,
          },
          200,
        );
      }


      /*
       * Si el message-id no pertenece a un email
       * logístico de Protocol, lo reconocemos pero
       * no pedimos a Brevo que lo reintente eternamente.
       */
      if (
        resultStatus ===
        "not_found"
      ) {
        console.warn(
          "[Brevo Logistics Webhook] Message ID no pertenece al outbox logístico.",
          {
            event:
              eventType,
            messageId,
          },
        );

        return responseJson(
          {
            status:
              "ignored",

            reason:
              "message_id_not_found",
          },
          200,
        );
      }


      /*
       * Un Message ID ambiguo indica inconsistencia
       * interna. Lo registramos en logs pero también
       * lo ACKeamos para evitar una tormenta de reintentos.
       */
      if (
        resultStatus ===
        "ambiguous"
      ) {
        console.error(
          "[Brevo Logistics Webhook] Message ID ambiguo.",
          {
            event:
              eventType,
            messageId,
            result,
          },
        );

        return responseJson(
          {
            status:
              "ignored",

            reason:
              "ambiguous_message_id",
          },
          200,
        );
      }


      if (
        resultStatus ===
        "invalid"
      ) {
        return responseJson(
          {
            status:
              "invalid",

            result,
          },
          400,
        );
      }


      console.error(
        "[Brevo Logistics Webhook] Respuesta RPC inesperada.",
        {
          event:
            eventType,
          messageId,
          result,
        },
      );

      return responseJson(
        {
          status:
            "internal_error",
        },
        500,
      );
    } catch (error) {
      console.error(
        "[Brevo Logistics Webhook]",
        error,
      );

      return responseJson(
        {
          status:
            "internal_error",
        },
        500,
      );
    }
  },
);
