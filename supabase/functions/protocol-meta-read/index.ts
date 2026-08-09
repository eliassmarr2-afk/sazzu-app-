import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, any>;
type MetaReadAction = "summary" | "campaigns" | "adsets" | "ads" | "tracking";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTION_RPC: Record<MetaReadAction, string> = {
  summary: "rpc_meta_ads_summary",
  campaigns: "rpc_meta_ads_campaigns",
  adsets: "rpc_meta_ads_adsets",
  ads: "rpc_meta_ads_ads",
  tracking: "rpc_meta_ads_tracking",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableText(value: unknown): string | null {
  const normalized = cleanText(value);
  return normalized || null;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

function inclusiveDays(from: string, to: string): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toMs - fromMs) / 86_400_000) + 1;
}

function bearerToken(req: Request): string | null {
  const authorization = cleanText(req.headers.get("Authorization"));
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? cleanText(match[1]) : null;
}

function parseAction(value: unknown): MetaReadAction | null {
  const action = cleanText(value).toLowerCase();
  return action in ACTION_RPC ? (action as MetaReadAction) : null;
}

function buildRpcParams(
  action: MetaReadAction,
  workspaceId: string,
  storeId: string,
  body: JsonRecord,
  dateFrom: string,
  dateTo: string,
): JsonRecord {
  const params: JsonRecord = {
    p_workspace_id: workspaceId,
    p_store_id: storeId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  };

  if (action === "campaigns" || action === "adsets" || action === "ads" || action === "tracking") {
    params.p_meta_campaign_id = nullableText(body.meta_campaign_id);
  }

  if (action === "adsets" || action === "ads" || action === "tracking") {
    params.p_meta_adset_id = nullableText(body.meta_adset_id);
  }

  if (action === "ads" || action === "tracking") {
    params.p_meta_ad_id = nullableText(body.meta_ad_id);
  }

  return params;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "method_not_allowed",
        message: "Use POST para consultar datos Meta.",
      },
      405,
    );
  }

  const supabaseUrl = cleanText(Deno.env.get("SUPABASE_URL"));
  const supabaseAnonKey = cleanText(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = cleanText(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error("[protocol-meta-read] Missing Supabase server environment.");
    return jsonResponse(
      {
        ok: false,
        error: "server_not_configured",
        message: "El gateway de lectura no está configurado correctamente.",
      },
      500,
    );
  }

  const token = bearerToken(req);
  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error: "authentication_required",
        message: "Se requiere una sesión autenticada de Protocol Data.",
      },
      401,
    );
  }

  // Verificación explícita contra Supabase Auth. No confiamos en IDs enviados
  // por el navegador para resolver identidad, workspace o permisos.
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user ?? null;

  if (authError || !user?.id) {
    console.warn("[protocol-meta-read] Invalid user token", {
      error: authError?.message || null,
    });
    return jsonResponse(
      {
        ok: false,
        error: "invalid_session",
        message: "La sesión de Protocol Data no es válida o expiró.",
      },
      401,
    );
  }

  let body: JsonRecord;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
        message: "El body debe ser JSON válido.",
      },
      400,
    );
  }

  const action = parseAction(body.action);
  const storeId = cleanText(body.store_id);
  const dateFrom = cleanText(body.date_from);
  const dateTo = cleanText(body.date_to);

  if (!action) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_action",
        message: "action debe ser summary, campaigns, adsets, ads o tracking.",
      },
      400,
    );
  }

  if (!storeId) {
    return jsonResponse(
      {
        ok: false,
        error: "store_required",
        message: "store_id es obligatorio.",
      },
      400,
    );
  }

  if (!isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_date_range",
        message: "date_from y date_to deben usar formato YYYY-MM-DD.",
      },
      400,
    );
  }

  const days = inclusiveDays(dateFrom, dateTo);
  if (days <= 0) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_date_range",
        message: "date_to no puede ser anterior a date_from.",
      },
      400,
    );
  }

  if (days > 370) {
    return jsonResponse(
      {
        ok: false,
        error: "date_range_too_large",
        message: "El rango máximo permitido por consulta es de 370 días.",
      },
      400,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // El browser sólo identifica la tienda. El workspace se deriva server-side.
  const { data: store, error: storeError } = await admin
    .from("protocol_stores")
    .select("store_id,workspace_id,name,status")
    .eq("store_id", storeId)
    .maybeSingle();

  if (storeError) {
    console.error("[protocol-meta-read] Store lookup failed", storeError);
    return jsonResponse(
      {
        ok: false,
        error: "scope_lookup_failed",
        message: "No se pudo resolver el scope solicitado.",
      },
      500,
    );
  }

  if (!store || store.status !== "active") {
    return jsonResponse(
      {
        ok: false,
        error: "store_not_found",
        message: "La tienda solicitada no existe o no está activa.",
      },
      404,
    );
  }

  const workspaceId = cleanText(store.workspace_id);

  const { data: workspace, error: workspaceError } = await admin
    .from("protocol_workspaces")
    .select("workspace_id,name,status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (workspaceError) {
    console.error("[protocol-meta-read] Workspace lookup failed", workspaceError);
    return jsonResponse(
      {
        ok: false,
        error: "scope_lookup_failed",
        message: "No se pudo resolver el workspace de la tienda.",
      },
      500,
    );
  }

  if (!workspace || workspace.status !== "active") {
    return jsonResponse(
      {
        ok: false,
        error: "workspace_inactive",
        message: "El workspace de esta tienda no está activo.",
      },
      403,
    );
  }

  const { data: membership, error: membershipError } = await admin
    .from("protocol_workspace_members")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (membershipError) {
    console.error("[protocol-meta-read] Membership lookup failed", membershipError);
    return jsonResponse(
      {
        ok: false,
        error: "authorization_lookup_failed",
        message: "No se pudieron validar los permisos del usuario.",
      },
      500,
    );
  }

  if (!membership || membership.status !== "active") {
    console.warn("[protocol-meta-read] Access denied", {
      userId: user.id,
      workspaceId,
      storeId,
    });
    return jsonResponse(
      {
        ok: false,
        error: "forbidden",
        message: "No tenés acceso a esta tienda.",
      },
      403,
    );
  }

  const rpcName = ACTION_RPC[action];
  const rpcParams = buildRpcParams(
    action,
    workspaceId,
    storeId,
    body,
    dateFrom,
    dateTo,
  );

  const { data, error: rpcError } = await admin.rpc(rpcName, rpcParams);

  if (rpcError) {
    console.error("[protocol-meta-read] RPC failed", {
      action,
      rpcName,
      workspaceId,
      storeId,
      error: rpcError,
    });

    return jsonResponse(
      {
        ok: false,
        error: "meta_read_failed",
        message: "No se pudieron obtener los datos de Meta para esta consulta.",
      },
      500,
    );
  }

  console.log("[protocol-meta-read] Read completed", {
    userId: user.id,
    role: membership.role,
    action,
    workspaceId,
    storeId,
    dateFrom,
    dateTo,
  });

  return jsonResponse({
    ok: true,
    action,
    scope: {
      workspace_id: workspaceId,
      workspace_name: workspace.name,
      store_id: store.store_id,
      store_name: store.name,
      role: membership.role,
    },
    period: {
      date_from: dateFrom,
      date_to: dateTo,
      days,
    },
    data,
  });
});
