import { createClient } from "npm:@supabase/supabase-js@2";

type OrderRow = {
  tracking_id?: string;
  shopify_order_name?: string;
  cliente?: string;
  email_cliente?: string;
  producto?: string;
  fecha_ultima_actualizacion?: string;
  updated_at?: string;
  created_at?: string;
};

type EventRow = {
  tracking_id: string;
  status: string;
  attempts: number;
  next_retry_at: string | null;
  last_attempt_at: string | null;
};

const EVENT_TABLE = "protocol_tracking_email_events";

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function env(name: string, required = true) {
  const value = Deno.env.get(name) || "";
  if (required && !value) throw new Error(`Falta secret: ${name}`);
  return value;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function tracking(value: unknown) {
  return text(value).toUpperCase();
}

function isGenericTracking(value: unknown) {
  const current = tracking(value).toLowerCase();
  return !current || current === "alp-soporte-general" || current.includes("soporte-general");
}

function isEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value).toLowerCase());
}

function rowTime(order: OrderRow) {
  const raw = order.fecha_ultima_actualizacion || order.updated_at || order.created_at || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function passesStartDate(order: OrderRow) {
  const start = env("ALPASO_TRACKING_EMAIL_START_AT", false);
  if (!start) return true;

  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) return true;

  const orderMs = rowTime(order);
  return Boolean(orderMs && orderMs >= startMs);
}

function trackingUrl(trackingId: string) {
  const base = env("ALPASO_TRACKING_BASE_URL", false) || "https://alpaso.store/pages/estado-de-tu-envio";
  return `${base}?tracking=${encodeURIComponent(trackingId)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function html(order: OrderRow, url: string) {
  const customer = text(order.cliente) || "Cliente";
  const orderName = text(order.shopify_order_name) || "Pedido registrado";
  const trackingId = tracking(order.tracking_id);
  const product = text(order.producto);

  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#252A32;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f8;padding:24px 0;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;"><tr><td style="background:#2479FF;padding:18px 20px;color:#ffffff;"><div style="font-size:18px;font-weight:800;line-height:1.2;">Al Paso Store</div><div style="font-size:13px;font-weight:600;opacity:.92;margin-top:4px;">Seguimiento de compra</div></td></tr><tr><td style="padding:24px 20px 8px;"><h1 style="margin:0;font-size:22px;line-height:1.15;color:#252A32;font-weight:900;">Tu pedido ya tiene seguimiento</h1><p style="margin:12px 0 0;font-size:15px;line-height:1.45;color:#697386;font-weight:500;">Hola ${escapeHtml(customer)}, tu compra fue registrada correctamente. Puedes consultar el avance actualizado desde el botón.</p></td></tr><tr><td style="padding:12px 20px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f9fc;border:1px solid #e5eaf2;border-radius:8px;"><tr><td style="padding:14px 16px;border-bottom:1px solid #e5eaf2;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">Pedido</div><div style="font-size:16px;color:#252A32;font-weight:900;margin-top:4px;">${escapeHtml(orderName)}</div></td></tr><tr><td style="padding:14px 16px;border-bottom:1px solid #e5eaf2;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">ID de seguimiento</div><div style="font-size:16px;color:#2479FF;font-weight:900;margin-top:4px;">${escapeHtml(trackingId)}</div></td></tr>${product ? `<tr><td style="padding:14px 16px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#697386;font-weight:800;">Producto</div><div style="font-size:14px;color:#252A32;font-weight:700;margin-top:4px;">${escapeHtml(product)}</div></td></tr>` : ""}</table></td></tr><tr><td align="center" style="padding:18px 20px 8px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#2479FF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;padding:14px 22px;border-radius:8px;">Ver estado de mi compra</a></td></tr><tr><td style="padding:12px 20px 24px;"><p style="margin:0;font-size:12px;line-height:1.45;color:#697386;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${escapeHtml(url)}" style="color:#2479FF;word-break:break-all;">${escapeHtml(url)}</a></p></td></tr></table><p style="max-width:560px;margin:12px auto 0;font-size:11px;line-height:1.4;color:#8A94A6;">Este correo fue enviado automáticamente para que puedas seguir tu compra.</p></td></tr></table></body></html>`;
}

function plain(order: OrderRow, url: string) {
  return [
    "Al Paso Store",
    "",
    "Tu pedido ya tiene seguimiento.",
    "",
    `Pedido: ${text(order.shopify_order_name) || "Pedido registrado"}`,
    `ID de seguimiento: ${tracking(order.tracking_id)}`,
    "",
    `Ver estado de mi compra: ${url}`,
    "",
    "Gracias por comprar en Al Paso Store.",
  ].join("\n");
}

function canSend(event?: EventRow) {
  if (!event) return true;
  if (event.status === "sent") return false;

  if (event.status === "processing") {
    const last = event.last_attempt_at ? new Date(event.last_attempt_at).getTime() : 0;
    return !last || Date.now() - last > 10 * 60 * 1000;
  }

  if (event.status === "error") {
    if ((event.attempts || 0) >= 3) return false;
    if (!event.next_retry_at) return true;
    return new Date(event.next_retry_at).getTime() <= Date.now();
  }

  return false;
}

async function sendEmail(order: OrderRow) {
  const token = env("ALPASO_TRACKING_BREVO_TOKEN");
  const senderEmail = env("ALPASO_TRACKING_SENDER_EMAIL");
  const senderName = env("ALPASO_TRACKING_SENDER_NAME", false) || "Al Paso Store";
  const trackingId = tracking(order.tracking_id);
  const url = trackingUrl(trackingId);
  const endpoint = ["https://api.brevo.com/v3", "smtp", "email"].join("/");

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: text(order.email_cliente).toLowerCase(), name: text(order.cliente) || undefined }],
    subject: "rastrea tu pedido ahora",
    htmlContent: html(order, url),
    textContent: plain(order, url),
    params: {
      tracking_id: trackingId,
      shopify_order_name: text(order.shopify_order_name),
      tracking_url: url,
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  headers["api" + "-key"] = token;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let body: Record<string, unknown> = {};

  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    throw new Error(typeof body.message === "string" ? body.message : `HTTP ${response.status}`);
  }

  return body;
}

Deno.serve(async (req) => {
  try {
    const secret = env("ALPASO_TRACKING_CRON_SECRET", false);
    if (secret && req.headers.get("x-cron-secret") !== secret) {
      return responseJson({ status: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.send === true ? false : true;
    const requestedTrackingId = tracking(body.tracking_id || body.trackingId || body.id || "");
    const autoMode = text(body.mode).toLowerCase() === "auto";

    if (!dryRun && !requestedTrackingId && !autoMode) {
      return responseJson({
        status: "blocked",
        message: "Para enviar un correo real tenés que indicar tracking_id o mode:auto.",
      }, 400);
    }

    const supabaseUrl = env("SUPABASE_URL");
    const supabaseKey = env("ALPASO_TRACKING_SUPABASE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const maxPerRun = Number(env("ALPASO_TRACKING_MAX_PER_RUN", false) || 5);

    const { data: ordersPayload, error: ordersError } = await supabase.rpc("protocol_logistics_orders_list", {
      input_query: "",
      input_status: "todos",
      input_limit: 250,
      input_offset: 0,
    });

    if (ordersError) throw ordersError;

    const orders: OrderRow[] = Array.isArray(ordersPayload?.items) ? ordersPayload.items : [];
    const candidates = orders
      .filter((order) => !isGenericTracking(order.tracking_id))
      .filter((order) => isEmail(order.email_cliente))
      .filter((order) => passesStartDate(order))
      .filter((order) => !requestedTrackingId || tracking(order.tracking_id) === requestedTrackingId)
      .sort((a, b) => rowTime(a) - rowTime(b));

    const ids = candidates.map((order) => tracking(order.tracking_id));

    const { data: existing, error: existingError } = ids.length
      ? await supabase.from(EVENT_TABLE).select("tracking_id,status,attempts,next_retry_at,last_attempt_at").in("tracking_id", ids)
      : { data: [], error: null };

    if (existingError) throw existingError;

    const eventMap = new Map<string, EventRow>();
    (existing || []).forEach((event: EventRow) => eventMap.set(tracking(event.tracking_id), event));

    const pending = candidates
      .filter((order) => canSend(eventMap.get(tracking(order.tracking_id))))
      .slice(0, requestedTrackingId ? 1 : maxPerRun);

    if (dryRun) {
      return responseJson({
        status: "dry_run",
        note: "Para enviar de verdad llamá la función con {\"send\":true,\"tracking_id\":\"ALP-...\"}.",
        requested_tracking_id: requestedTrackingId || null,
        auto_mode: autoMode,
        total_orders_seen: orders.length,
        total_candidates: candidates.length,
        pending_to_send: pending.map((order) => ({
          tracking_id: tracking(order.tracking_id),
          shopify_order_name: order.shopify_order_name || "",
          email_cliente: order.email_cliente || "",
          cliente: order.cliente || "",
          producto: order.producto || "",
          tracking_url: trackingUrl(tracking(order.tracking_id)),
        })),
      });
    }

    const results = [];

    for (const order of pending) {
      const trackingId = tracking(order.tracking_id);
      const oldEvent = eventMap.get(trackingId);
      const nextAttempt = Number(oldEvent?.attempts || 0) + 1;

      try {
        if (!oldEvent) {
          const { error } = await supabase.from(EVENT_TABLE).insert({
            tracking_id: trackingId,
            shopify_order_name: text(order.shopify_order_name),
            email_cliente: text(order.email_cliente).toLowerCase(),
            cliente: text(order.cliente),
            product_name: text(order.producto),
            status: "processing",
            attempts: nextAttempt,
            last_attempt_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from(EVENT_TABLE).update({
            status: "processing",
            attempts: nextAttempt,
            last_attempt_at: new Date().toISOString(),
            error_message: null,
          }).eq("tracking_id", trackingId);
          if (error) throw error;
        }

        const providerResponse = await sendEmail(order);
        const messageId = text((providerResponse as Record<string, unknown>).messageId);

        const { error } = await supabase.from(EVENT_TABLE).update({
          status: "sent",
          brevo_message_id: messageId,
          error_message: null,
          sent_at: new Date().toISOString(),
          next_retry_at: null,
        }).eq("tracking_id", trackingId);

        if (error) throw error;

        results.push({ tracking_id: trackingId, status: "sent", message_id: messageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryMinutes = Math.min(60, 15 * nextAttempt);

        await supabase.from(EVENT_TABLE).update({
          status: "error",
          error_message: message,
          next_retry_at: new Date(Date.now() + retryMinutes * 60 * 1000).toISOString(),
        }).eq("tracking_id", trackingId);

        results.push({ tracking_id: trackingId, status: "error", error: message });
      }
    }

    return responseJson({
      status: "ok",
      requested_tracking_id: requestedTrackingId || null,
      auto_mode: autoMode,
      total_orders_seen: orders.length,
      total_candidates: candidates.length,
      processed: results.length,
      results,
    });
  } catch (error) {
    return responseJson({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
