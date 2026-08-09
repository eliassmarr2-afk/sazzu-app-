import { createClient } from "npm:@supabase/supabase-js@2";

type EventRow = {
  id: string;
  logistics_order_id: string | null;
  order_id: string;
  tracking_id: string;
  from_status: string;
  to_status: string;
  template_key: string;
  status: string;
  attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  sent_at: string | null;
  brevo_message_id: string | null;
  error_message: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  tracking_id?: string | null;
  shopify_order_name?: string | null;
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  producto_resumen?: string | null;
};

type ClaimResult = {
  status: string;
  event_id?: string;
  logistics_order_id?: string;
  order_id?: string;
  tracking_id?: string;
  from_status?: string;
  to_status?: string;
  template_key?: string;
  attempts?: number;
  brevo_message_id?: string | null;
  sent_at?: string | null;
  next_retry_at?: string | null;
  error_message?: string | null;
};

type TemplateConfig = {
  templateKey: string;
  subject: string;
  title: string;
  cta: string;
  message: (customer: string) => string;
};

const EVENT_TABLE =
  "protocol_logistics_status_email_events";

const ORDER_TABLE =
  "protocol_orders";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const TEMPLATES: Record<string, TemplateConfig> = {
  despachado: {
    templateKey: "logistics_despachado",
    subject: "Tu pedido fue despachado",
    title: "Tu pedido fue despachado",
    cta: "Ver estado de mi compra",
    message: (customer: string) =>
      `Hola ${customer}, tenemos una actualización sobre tu compra. Tu pedido ya fue despachado y comenzó su recorrido hacia el domicilio de entrega.`,
  },

  en_camino: {
    templateKey: "logistics_en_camino",
    subject: "Tu pedido está en camino",
    title: "Tu pedido está en camino",
    cta: "Seguir mi pedido",
    message: (customer: string) =>
      `Hola ${customer}, tu compra continúa avanzando. El pedido ya se encuentra en camino hacia el domicilio de entrega.`,
  },

  entregado: {
    templateKey: "logistics_entregado",
    subject: "Tu compra se entregó con éxito",
    title: "Tu compra se entregó con éxito",
    cta: "Ver detalle de mi compra",
    message: (customer: string) =>
      `Hola ${customer}, registramos tu pedido como entregado. Esperamos que disfrutes tu compra y agradecemos que hayas elegido Al Paso Store.`,
  },
};

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
        ...CORS_HEADERS,
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

function text(value: unknown) {
  return String(
    value ?? "",
  ).trim();
}

function tracking(value: unknown) {
  return text(value).toUpperCase();
}

function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    text(value).toLowerCase(),
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusLabel(status: string) {
  switch (status) {
    case "despachado":
      return "Despachado";

    case "en_camino":
      return "En camino";

    case "entregado":
      return "Entregado";

    default:
      return status;
  }
}

function trackingUrl(
  trackingId: string,
) {
  const base =
    env(
      "ALPASO_TRACKING_BASE_URL",
      false,
    ) ||
    "https://alpaso.store/pages/estado-de-tu-envio";

  return `${base}?tracking=${encodeURIComponent(
    trackingId,
  )}`;
}

function templateFor(
  event: Pick<
    EventRow,
    "to_status" | "template_key"
  >,
) {
  const config =
    TEMPLATES[event.to_status];

  if (!config) {
    throw new Error(
      `Estado de email no permitido: ${event.to_status}`,
    );
  }

  if (
    event.template_key !==
    config.templateKey
  ) {
    throw new Error(
      `Template inconsistente: ${event.template_key} / ${event.to_status}`,
    );
  }

  return config;
}

function html(
  event: EventRow,
  order: OrderRow,
  url: string,
) {
  const config =
    templateFor(event);

  const customer =
    text(order.cliente_nombre) ||
    "Cliente";

  const orderName =
    text(
      order.shopify_order_name,
    ) ||
    "Pedido registrado";

  const trackingId =
    tracking(event.tracking_id);

  const product =
    text(
      order.producto_resumen,
    );

  const message =
    config.message(customer);

  const status =
    statusLabel(
      event.to_status,
    );

  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#252A32;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f8;padding:24px 0;">
  <tr>
    <td align="center">

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">

        <tr>
          <td style="background:#2479FF;padding:18px 20px;color:#ffffff;">
            <div style="font-size:18px;font-weight:800;line-height:1.2;">
              Al Paso Store
            </div>

            <div style="font-size:13px;font-weight:600;opacity:.92;margin-top:4px;">
              Seguimiento de compra
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 20px 8px;">
            <h1 style="margin:0;font-size:22px;line-height:1.15;color:#252A32;font-weight:900;">
              ${escapeHtml(config.title)}
            </h1>

            <p style="margin:12px 0 0;font-size:15px;line-height:1.45;color:#697386;font-weight:500;">
              ${escapeHtml(message)}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:12px 20px;">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f9fc;border:1px solid #e5eaf2;border-radius:8px;">

              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e5eaf2;">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">
                    Pedido
                  </div>

                  <div style="font-size:16px;color:#252A32;font-weight:900;margin-top:4px;">
                    ${escapeHtml(orderName)}
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e5eaf2;">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">
                    Seguimiento
                  </div>

                  <div style="font-size:16px;color:#2479FF;font-weight:900;margin-top:4px;">
                    ${escapeHtml(trackingId)}
                  </div>
                </td>
              </tr>

              ${
                product
                  ? `
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e5eaf2;">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">
                    Producto
                  </div>

                  <div style="font-size:14px;color:#252A32;font-weight:700;margin-top:4px;">
                    ${escapeHtml(product)}
                  </div>
                </td>
              </tr>
              `
                  : ""
              }

              <tr>
                <td style="padding:14px 16px;">
                  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">
                    Estado
                  </div>

                  <div style="font-size:14px;color:#252A32;font-weight:900;margin-top:4px;">
                    ${escapeHtml(status)}
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:18px 20px 8px;">
            <a
              href="${escapeHtml(url)}"
              style="display:inline-block;background:#2479FF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;padding:14px 22px;border-radius:8px;"
            >
              ${escapeHtml(config.cta)}
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:12px 20px 24px;">
            <p style="margin:0;font-size:12px;line-height:1.45;color:#697386;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
              <br>

              <a
                href="${escapeHtml(url)}"
                style="color:#2479FF;word-break:break-all;"
              >
                ${escapeHtml(url)}
              </a>
            </p>
          </td>
        </tr>

      </table>

      <p style="max-width:560px;margin:12px auto 0;font-size:11px;line-height:1.4;color:#8A94A6;">
        Este correo fue enviado automáticamente para informarte sobre el estado de tu compra.
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;
}

function plain(
  event: EventRow,
  order: OrderRow,
  url: string,
) {
  const config =
    templateFor(event);

  const customer =
    text(order.cliente_nombre) ||
    "Cliente";

  const orderName =
    text(
      order.shopify_order_name,
    ) ||
    "Pedido registrado";

  const trackingId =
    tracking(event.tracking_id);

  const product =
    text(
      order.producto_resumen,
    );

  const lines = [
    "Al Paso Store",
    "",
    config.title,
    "",
    config.message(customer),
    "",
    `Pedido: ${orderName}`,
    `Seguimiento: ${trackingId}`,
  ];

  if (product) {
    lines.push(
      `Producto: ${product}`,
    );
  }

  lines.push(
    `Estado: ${statusLabel(
      event.to_status,
    )}`,
    "",
    `${config.cta}: ${url}`,
    "",
    "Gracias por comprar en Al Paso Store.",
  );

  return lines.join("\n");
}

async function loadEvent(
  supabase: ReturnType<
    typeof createClient
  >,
  eventId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(EVENT_TABLE)
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No existe el evento solicitado.",
    );
  }

  return data as EventRow;
}

async function loadOrder(
  supabase: ReturnType<
    typeof createClient
  >,
  orderId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from(ORDER_TABLE)
    .select(
      "id,tracking_id,shopify_order_name,cliente_nombre,cliente_email,producto_resumen",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No existe el pedido asociado al evento.",
    );
  }

  return data as OrderRow;
}

async function markError(
  supabase: ReturnType<
    typeof createClient
  >,
  eventId: string,
  attempts: number,
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const nextRetry =
    attempts >= 3
      ? null
      : new Date(
          Date.now() +
            Math.min(
              30,
              5 * attempts,
            ) *
              60 *
              1000,
        ).toISOString();

  const {
    error: updateError,
  } = await supabase
    .from(EVENT_TABLE)
    .update({
      status: "error",
      error_message: message,
      next_retry_at: nextRetry,
    })
    .eq("id", eventId);

  if (updateError) {
    console.warn(
      "[Logistics Status Email] No se pudo registrar error",
      updateError,
    );
  }

  return {
    message,
    next_retry_at: nextRetry,
  };
}

async function markSent(
  supabase: ReturnType<
    typeof createClient
  >,
  eventId: string,
  messageId: string | null,
) {
  const {
    error,
  } = await supabase
    .from(EVENT_TABLE)
    .update({
      status: "sent",
      brevo_message_id:
        messageId || null,
      sent_at:
        new Date().toISOString(),
      next_retry_at: null,
      error_message: null,
    })
    .eq("id", eventId);

  if (error) {
    throw error;
  }
}

async function sendBrevo(
  event: EventRow,
  order: OrderRow,
) {
  const token =
    env(
      "ALPASO_TRACKING_BREVO_TOKEN",
    );

  const senderEmail =
    env(
      "ALPASO_TRACKING_SENDER_EMAIL",
    );

  const senderName =
    env(
      "ALPASO_TRACKING_SENDER_NAME",
      false,
    ) ||
    "Al Paso Store";

  const recipientEmail =
    text(
      order.cliente_email,
    ).toLowerCase();

  if (
    !isEmail(recipientEmail)
  ) {
    throw new Error(
      `Email de cliente inválido: ${recipientEmail || "(vacío)"}`,
    );
  }

  const config =
    templateFor(event);

  const trackingId =
    tracking(
      event.tracking_id,
    );

  const url =
    trackingUrl(
      trackingId,
    );

  const endpoint =
    "https://api.brevo.com/v3/smtp/email";

  const payload = {
    sender: {
      email: senderEmail,
      name: senderName,
    },

    to: [
      {
        email:
          recipientEmail,

        name:
          text(
            order.cliente_nombre,
          ) ||
          undefined,
      },
    ],

    subject:
      config.subject,

    htmlContent:
      html(
        event,
        order,
        url,
      ),

    textContent:
      plain(
        event,
        order,
        url,
      ),

    headers: {
      idempotencyKey:
        event.id,
    },

    params: {
      event_id:
        event.id,

      tracking_id:
        trackingId,

      shopify_order_name:
        text(
          order.shopify_order_name,
        ),

      logistics_status:
        event.to_status,

      tracking_url:
        url,
    },
  };

  const headers: Record<
    string,
    string
  > = {
    "Content-Type":
      "application/json",

    Accept:
      "application/json",
  };

  headers["api-key"] =
    token;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify(
          payload,
        ),
      },
    );

  const raw =
    await response.text();

  let body:
    Record<string, unknown> = {};

  try {
    body =
      raw
        ? JSON.parse(raw)
        : {};
  } catch {
    body = {
      raw,
    };
  }

  /*
   * Si estamos recuperando un intento cuyo POST anterior
   * sí llegó a Brevo pero el worker cayó antes de guardar
   * "sent", Brevo puede responder que la idempotency key
   * ya fue utilizada.
   *
   * En ese caso NO reenviamos: consideramos el evento
   * protegido como ya procesado por el proveedor.
   */
  if (!response.ok) {
    const code =
      text(
        body.code,
      );

    if (
      code ===
      "duplicate_parameter"
    ) {
      return {
        messageId: null,
        duplicateGuarded: true,
        providerResponse:
          body,
      };
    }

    throw new Error(
      typeof body.message ===
        "string"
        ? body.message
        : `Brevo HTTP ${response.status}`,
    );
  }

  return {
    messageId:
      text(
        body.messageId,
      ) || null,

    duplicateGuarded: false,

    providerResponse:
      body,
  };
}

async function previewEvent(
  supabase: ReturnType<
    typeof createClient
  >,
  eventId: string,
) {
  const event =
    await loadEvent(
      supabase,
      eventId,
    );

  const order =
    await loadOrder(
      supabase,
      event.order_id,
    );

  const config =
    templateFor(event);

  const customer =
    text(
      order.cliente_nombre,
    ) ||
    "Cliente";

  return {
    status: "dry_run",

    event: {
      id: event.id,
      status:
        event.status,
      attempts:
        event.attempts,
      tracking_id:
        event.tracking_id,
      from_status:
        event.from_status,
      to_status:
        event.to_status,
      template_key:
        event.template_key,
    },

    recipient: {
      name:
        customer,
      email:
        text(
          order.cliente_email,
        ),
    },

    email: {
      subject:
        config.subject,

      title:
        config.title,

      message:
        config.message(
          customer,
        ),

      cta:
        config.cta,

      tracking_url:
        trackingUrl(
          tracking(
            event.tracking_id,
          ),
        ),
    },
  };
}

async function processEvent(
  supabase: ReturnType<
    typeof createClient
  >,
  eventId: string,
) {
  const {
    data: claimData,
    error: claimError,
  } = await supabase.rpc(
    "protocol_logistics_status_email_claim",
    {
      input_event_id:
        eventId,
    },
  );

  if (claimError) {
    throw claimError;
  }

  const claim =
    claimData as ClaimResult;

  if (
    !claim ||
    claim.status !==
      "claimed"
  ) {
    return {
      status:
        claim?.status ||
        "claim_failed",

      event_id:
        eventId,

      claim:
        claim || null,
    };
  }

  const attempts =
    Number(
      claim.attempts || 1,
    );

  try {
    const event =
      await loadEvent(
        supabase,
        eventId,
      );

    if (
      !event.order_id
    ) {
      throw new Error(
        "El evento no tiene order_id.",
      );
    }

    const order =
      await loadOrder(
        supabase,
        event.order_id,
      );

    const orderTracking =
      tracking(
        order.tracking_id,
      );

    const eventTracking =
      tracking(
        event.tracking_id,
      );

    if (
      orderTracking &&
      orderTracking !==
        eventTracking
    ) {
      throw new Error(
        `Tracking inconsistente entre evento y pedido: ${eventTracking} / ${orderTracking}`,
      );
    }

    /*
     * Valida explícitamente estado/template antes
     * de cualquier llamada al proveedor.
     */
    templateFor(event);

    if (
      !isEmail(
        order.cliente_email,
      )
    ) {
      throw new Error(
        "El pedido no tiene un email de cliente válido.",
      );
    }

    const provider =
      await sendBrevo(
        event,
        order,
      );

    await markSent(
      supabase,
      eventId,
      provider.messageId,
    );

    return {
      status: "sent",

      event_id:
        eventId,

      tracking_id:
        eventTracking,

      to_status:
        event.to_status,

      attempts,

      message_id:
        provider.messageId,

      duplicate_guarded:
        provider.duplicateGuarded,
    };
  } catch (error) {
    const failure =
      await markError(
        supabase,
        eventId,
        attempts,
        error,
      );

    return {
      status: "error",

      event_id:
        eventId,

      attempts,

      error:
        failure.message,

      next_retry_at:
        failure.next_retry_at,
    };
  }
}

async function candidateEventIds(
  supabase: ReturnType<
    typeof createClient
  >,
  limit: number,
) {
  const {
    data,
    error,
  } = await supabase
    .from(EVENT_TABLE)
    .select(
      "id,status,attempts,next_retry_at,last_attempt_at,created_at",
    )
    .in(
      "status",
      [
        "pending",
        "error",
        "processing",
      ],
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    )
    .limit(50);

  if (error) {
    throw error;
  }

  const now =
    Date.now();

  return (
    data || []
  )
    .filter(
      (
        event: {
          id: string;
          status: string;
          attempts: number;
          next_retry_at:
            | string
            | null;
          last_attempt_at:
            | string
            | null;
        },
      ) => {
        const attempts =
          Number(
            event.attempts || 0,
          );

        if (
          attempts >= 3
        ) {
          return false;
        }

        if (
          event.status ===
          "pending"
        ) {
          return true;
        }

        if (
          event.status ===
          "error"
        ) {
          if (
            !event.next_retry_at
          ) {
            return true;
          }

          return (
            new Date(
              event.next_retry_at,
            ).getTime() <= now
          );
        }

        if (
          event.status ===
          "processing"
        ) {
          if (
            !event.last_attempt_at
          ) {
            return true;
          }

          return (
            now -
              new Date(
                event.last_attempt_at,
              ).getTime() >
            5 * 60 * 1000
          );
        }

        return false;
      },
    )
    .slice(
      0,
      limit,
    )
    .map(
      (
        event: {
          id: string;
        },
      ) => event.id,
    );
}

Deno.serve(
  async (req) => {
    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            CORS_HEADERS,
        },
      );
    }

    if (
      req.method !==
      "POST"
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
      const body =
        await req
          .json()
          .catch(
            () => ({}),
          );

      const eventId =
        text(
          body.event_id ||
            body.eventId ||
            "",
        );

      const autoMode =
        text(
          body.mode,
        ).toLowerCase() ===
        "auto";

      const dryRun =
        body.send === true
          ? false
          : true;

      if (
        !eventId &&
        !autoMode
      ) {
        return responseJson(
          {
            status:
              "blocked",

            message:
              "Indicá event_id o mode:auto.",
          },
          400,
        );
      }

      /*
       * La invocación normal desde Protocol usa JWT
       * verificado por Supabase.
       *
       * Para una futura ejecución automática puede
       * definirse además este secreto opcional.
       */
      if (autoMode) {
        const cronSecret =
          env(
            "ALPASO_LOGISTICS_STATUS_EMAIL_CRON_SECRET",
            false,
          );

        if (!cronSecret) {
          return responseJson(
            {
              status:
                "server_misconfigured",

              message:
                "El modo automático no tiene cron secret configurado.",
            },
            503,
          );
        }

        if (
          req.headers.get(
            "x-cron-secret",
          ) !== cronSecret
        ) {
          return responseJson(
            {
              status:
                "unauthorized",
            },
            401,
          );
        }
      }

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

      /*
       * Las invocaciones manuales sólo pueden venir
       * de una sesión real de Supabase Auth.
       *
       * No alcanza con poseer una API key pública:
       * necesitamos identificar un usuario válido.
       */
      if (!autoMode) {
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

        const userJwt =
          match
            ? text(match[1])
            : "";

        if (!userJwt) {
          return responseJson(
            {
              status:
                "unauthorized",

              message:
                "Se requiere una sesión autenticada de Protocol Data.",
            },
            401,
          );
        }

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser(
            userJwt,
          );

        if (
          authError ||
          !authData?.user
        ) {
          return responseJson(
            {
              status:
                "unauthorized",

              message:
                "La sesión de Protocol Data no es válida.",
            },
            401,
          );
        }
      }

      /*
       * event_id concreto:
       * ideal para el envío inmediato después de Guardar.
       */
      if (eventId) {
        if (dryRun) {
          const preview =
            await previewEvent(
              supabase,
              eventId,
            );

          return responseJson(
            preview,
          );
        }

        const result =
          await processEvent(
            supabase,
            eventId,
          );

        return responseJson(
          result,
        );
      }

      /*
       * mode:auto:
       * quedará disponible para recuperar pending/error
       * mediante scheduler sin depender del navegador.
       */
      const maxPerRun =
        Math.max(
          1,
          Math.min(
            20,
            Number(
              env(
                "ALPASO_LOGISTICS_STATUS_EMAIL_MAX_PER_RUN",
                false,
              ) || 5,
            ),
          ),
        );

      const ids =
        await candidateEventIds(
          supabase,
          maxPerRun,
        );

      if (dryRun) {
        const previews = [];

        for (
          const id of ids
        ) {
          try {
            previews.push(
              await previewEvent(
                supabase,
                id,
              ),
            );
          } catch (error) {
            previews.push({
              status:
                "preview_error",

              event_id: id,

              error:
                error instanceof
                  Error
                  ? error.message
                  : String(
                      error,
                    ),
            });
          }
        }

        return responseJson({
          status:
            "dry_run",

          auto_mode: true,

          candidate_count:
            ids.length,

          previews,
        });
      }

      const results = [];

      for (
        const id of ids
      ) {
        results.push(
          await processEvent(
            supabase,
            id,
          ),
        );
      }

      return responseJson({
        status: "ok",
        auto_mode: true,
        processed:
          results.length,
        results,
      });
    } catch (error) {
      console.error(
        "[Logistics Status Email]",
        error,
      );

      return responseJson(
        {
          status: "error",

          message:
            error instanceof
              Error
              ? error.message
              : String(error),
        },
        500,
      );
    }
  },
);
