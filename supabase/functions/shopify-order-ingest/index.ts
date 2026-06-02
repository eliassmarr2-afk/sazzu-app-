import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-topic, x-shopify-shop-domain, x-shopify-webhook-id, x-protocol-webhook-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === "GET") {
    return jsonResponse({
      status: "ok",
      function: "shopify-order-ingest",
      message: "Protocol Data webhook endpoint ready",
      mode: "token-protected-post",
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        status: "error",
        error: "method_not_allowed",
      },
      405
    );
  }

  const url = new URL(req.url);

  const expectedToken = Deno.env.get("PROTOCOL_WEBHOOK_TOKEN");
  const receivedToken =
    url.searchParams.get("token") ||
    req.headers.get("x-protocol-webhook-token");

  if (!expectedToken) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_protocol_webhook_token",
        message: "Missing PROTOCOL_WEBHOOK_TOKEN in Supabase Edge Function secrets.",
      },
      500
    );
  }

  if (!receivedToken || receivedToken !== expectedToken) {
    return jsonResponse(
      {
        status: "error",
        error: "invalid_protocol_webhook_token",
      },
      401
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_supabase_env",
        message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Supabase Edge Function secrets.",
      },
      500
    );
  }

  const rawBody = await req.text();

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return jsonResponse(
      {
        status: "error",
        error: "invalid_json",
        detail: error instanceof Error ? error.message : String(error),
      },
      400
    );
  }

  const webhookId =
    req.headers.get("x-shopify-webhook-id") ||
    `manual-${crypto.randomUUID()}`;

  const topic =
    req.headers.get("x-shopify-topic") ||
    "orders/create";

  const shopDomain =
    req.headers.get("x-shopify-shop-domain") ||
    "alpasostore.myshopify.com";

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.rpc(
    "protocol_ingest_shopify_order_payload",
    {
      input_payload: payload,
      input_webhook_id: webhookId,
      input_topic: topic,
      input_shop_domain: shopDomain,
    }
  );

  if (error) {
    console.error("[shopify-order-ingest] RPC error:", error);

    return jsonResponse(
      {
        status: "error",
        error: "rpc_failed",
        detail: error,
      },
      500
    );
  }

  console.log("[shopify-order-ingest] Order ingested", {
    topic,
    shopDomain,
    webhookId,
    result: data,
  });

  return jsonResponse({
    status: "ok",
    topic,
    shop_domain: shopDomain,
    webhook_id: webhookId,
    result: data,
  });
});
