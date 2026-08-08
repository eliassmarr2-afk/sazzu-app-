import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-protocol-meta-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const DEFAULT_GRAPH_VERSION = "v26.0";
const GRAPH_BASE = "https://graph.facebook.com";

type JsonRecord = Record<string, any>;

class GraphApiError extends Error {
  code: string;
  status: number;
  detail: unknown;

  constructor(
    message: string,
    code = "graph_api_error",
    status = 502,
    detail?: unknown
  ) {
    super(message);
    this.name = "GraphApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableText(value: unknown): string | null {
  const clean = cleanText(value);
  return clean || null;
}

function normalizeAdAccountId(value: unknown): string {
  return cleanText(value).replace(/^act_/i, "");
}

function graphAccountId(value: unknown): string {
  const clean = normalizeAdAccountId(value);
  return clean ? `act_${clean}` : "";
}

function nullableBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function nullableInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function nullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeJsonValue(value: unknown): unknown | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return value;
}

function extractPixelId(pixel: unknown): string | null {
  if (!pixel) return null;

  if (typeof pixel === "string" || typeof pixel === "number") {
    return nullableText(pixel);
  }

  if (typeof pixel === "object") {
    return nullableText((pixel as JsonRecord).id);
  }

  return null;
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
      function: "meta-custom-conversions-sync",
      mode: "read-only-custom-conversions-v1",
      graph_version:
        Deno.env.get("META_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION,
      meta_access_token_configured: Boolean(
        Deno.env.get("META_ACCESS_TOKEN")
      ),
      sync_token_configured: Boolean(Deno.env.get("META_SYNC_TOKEN")),
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

  const expectedSyncToken = Deno.env.get("META_SYNC_TOKEN");
  const receivedSyncToken = req.headers.get("x-protocol-meta-sync-token");

  if (!expectedSyncToken) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_meta_sync_token",
        message: "Missing META_SYNC_TOKEN in Supabase Edge Function secrets.",
      },
      500
    );
  }

  if (!receivedSyncToken || receivedSyncToken !== expectedSyncToken) {
    return jsonResponse(
      {
        status: "error",
        error: "invalid_meta_sync_token",
      },
      401
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
  const graphVersion =
    Deno.env.get("META_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_supabase_env",
        message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      },
      500
    );
  }

  if (!metaAccessToken) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_meta_access_token",
        message: "Missing META_ACCESS_TOKEN in Supabase Edge Function secrets.",
      },
      500
    );
  }

  let input: JsonRecord;

  try {
    input = await req.json();
  } catch {
    return jsonResponse(
      {
        status: "error",
        error: "invalid_json",
      },
      400
    );
  }

  const workspaceId = cleanText(input.workspace_id);
  const storeId = cleanText(input.store_id);
  const metaAdAccountId = normalizeAdAccountId(
    input.meta_ad_account_id || input.graph_account_id
  );
  const graphAdAccountId = graphAccountId(metaAdAccountId);
  const connectionKey = cleanText(input.connection_key) || "default";

  if (!workspaceId || !storeId || !metaAdAccountId) {
    return jsonResponse(
      {
        status: "error",
        error: "missing_scope_or_account",
        message: "workspace_id, store_id and meta_ad_account_id are required.",
      },
      400
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const graphBase = `${GRAPH_BASE}/${graphVersion}`;

  async function graphFetchUrl(url: URL | string): Promise<JsonRecord> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    let payload: JsonRecord = {};

    try {
      payload = await response.json();
    } catch {
      throw new GraphApiError(
        "Meta Graph API returned a non-JSON response.",
        "graph_non_json",
        502
      );
    }

    if (!response.ok || payload.error) {
      const graphError = payload.error || {};

      throw new GraphApiError(
        graphError.message ||
          `Meta Graph API request failed with HTTP ${response.status}.`,
        String(graphError.code || "graph_request_failed"),
        response.status >= 400 ? response.status : 502,
        {
          type: graphError.type || null,
          error_subcode: graphError.error_subcode || null,
          fbtrace_id: graphError.fbtrace_id || null,
        }
      );
    }

    return payload;
  }

  async function graphGetAll(
    path: string,
    fields: string
  ): Promise<{ rows: JsonRecord[]; pages: number }> {
    const firstUrl = new URL(`${graphBase}/${path.replace(/^\//, "")}`);
    firstUrl.searchParams.set("fields", fields);
    firstUrl.searchParams.set("limit", "100");
    firstUrl.searchParams.set("access_token", metaAccessToken);

    const rows: JsonRecord[] = [];
    let nextUrl: string | null = firstUrl.toString();
    let pages = 0;

    while (nextUrl) {
      pages += 1;

      if (pages > 100) {
        throw new GraphApiError(
          "Meta Custom Conversions pagination exceeded the safety limit of 100 pages.",
          "graph_pagination_limit",
          502
        );
      }

      const payload = await graphFetchUrl(nextUrl);
      const data = Array.isArray(payload.data) ? payload.data : [];
      rows.push(...data);
      nextUrl = nullableText(payload?.paging?.next);
    }

    return { rows, pages };
  }

  let syncRunId: string | null = null;
  let connectionId: string | null = null;
  let adAccountInternalId: string | null = null;

  try {
    const { data: connection, error: connectionError } = await supabase
      .from("meta_connections")
      .select("id,status")
      .eq("workspace_id", workspaceId)
      .eq("store_id", storeId)
      .eq("provider", "meta")
      .eq("connection_key", connectionKey)
      .maybeSingle();

    if (connectionError) {
      throw new Error(`meta_connections read failed: ${connectionError.message}`);
    }

    if (!connection?.id) {
      return jsonResponse(
        {
          status: "error",
          error: "meta_connection_not_found",
          message: "Run meta-ads-sync first for this workspace/store/account.",
        },
        409
      );
    }

    connectionId = connection.id;

    const { data: adAccount, error: adAccountError } = await supabase
      .from("meta_ad_accounts")
      .select("id,meta_ad_account_id")
      .eq("workspace_id", workspaceId)
      .eq("store_id", storeId)
      .eq("meta_ad_account_id", metaAdAccountId)
      .maybeSingle();

    if (adAccountError) {
      throw new Error(`meta_ad_accounts read failed: ${adAccountError.message}`);
    }

    if (!adAccount?.id) {
      return jsonResponse(
        {
          status: "error",
          error: "meta_ad_account_not_found",
          message: "Run meta-ads-sync first so the ad account exists locally.",
        },
        409
      );
    }

    adAccountInternalId = adAccount.id;

    const { data: syncRun, error: syncRunError } = await supabase
      .from("meta_sync_runs")
      .insert({
        connection_id: connectionId,
        ad_account_id: adAccountInternalId,
        workspace_id: workspaceId,
        store_id: storeId,
        sync_type: "custom_conversions",
        status: "running",
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: metaAdAccountId,
          read_only: true,
        },
      })
      .select("id")
      .single();

    if (syncRunError || !syncRun?.id) {
      throw new Error(
        `meta_sync_runs insert failed: ${syncRunError?.message || "missing id"}`
      );
    }

    syncRunId = syncRun.id;

    const CUSTOM_CONVERSION_FIELDS = [
      "id",
      "account_id",
      "name",
      "description",
      "custom_event_type",
      "event_source_type",
      "pixel",
      "rule",
      "is_archived",
      "is_unavailable",
      "retention_days",
      "default_conversion_value",
      "creation_time",
      "first_fired_time",
      "last_fired_time",
    ].join(",");

    const result = await graphGetAll(
      `${graphAdAccountId}/customconversions`,
      CUSTOM_CONVERSION_FIELDS
    );

    const nowIso = new Date().toISOString();

    const rows = result.rows
      .filter((item) => cleanText(item.id))
      .map((item) => ({
        ad_account_id: adAccountInternalId,
        workspace_id: workspaceId,
        store_id: storeId,
        meta_ad_account_id: normalizeAdAccountId(
          item.account_id || metaAdAccountId
        ),
        meta_custom_conversion_id: cleanText(item.id),
        name: nullableText(item.name),
        description: nullableText(item.description),
        custom_event_type: nullableText(item.custom_event_type),
        event_source_type: nullableText(item.event_source_type),
        pixel_id: extractPixelId(item.pixel),
        pixel: normalizeJsonValue(item.pixel),
        rule: normalizeJsonValue(item.rule),
        is_archived: nullableBoolean(item.is_archived),
        is_unavailable: nullableBoolean(item.is_unavailable),
        retention_days: nullableInteger(item.retention_days),
        default_conversion_value: nullableNumber(item.default_conversion_value),
        creation_time: nullableText(item.creation_time),
        first_fired_time: nullableText(item.first_fired_time),
        last_fired_time: nullableText(item.last_fired_time),
        raw_payload: item,
        synced_at: nowIso,
      }));

    let upsertedCount = 0;

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("meta_custom_conversions")
        .upsert(rows, {
          onConflict: "workspace_id,store_id,meta_custom_conversion_id",
        });

      if (upsertError) {
        throw new Error(
          `meta_custom_conversions upsert failed: ${upsertError.message}`
        );
      }

      upsertedCount = rows.length;
    }

    const finishedAt = new Date().toISOString();

    const { error: finishRunError } = await supabase
      .from("meta_sync_runs")
      .update({
        status: "success",
        custom_conversions_received: result.rows.length,
        custom_conversions_upserted: upsertedCount,
        finished_at: finishedAt,
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: metaAdAccountId,
          graph_account_id: graphAdAccountId,
          read_only: true,
          graph_pages: result.pages,
        },
      })
      .eq("id", syncRunId);

    if (finishRunError) {
      throw new Error(`meta_sync_runs finish failed: ${finishRunError.message}`);
    }

    await supabase
      .from("meta_connections")
      .update({
        last_synced_at: finishedAt,
        status: "active",
      })
      .eq("id", connectionId);

    console.log("[meta-custom-conversions-sync] Sync completed", {
      workspaceId,
      storeId,
      metaAdAccountId,
      received: result.rows.length,
      upserted: upsertedCount,
    });

    return jsonResponse({
      status: "ok",
      mode: "read-only-custom-conversions-v1",
      workspace_id: workspaceId,
      store_id: storeId,
      meta_ad_account_id: metaAdAccountId,
      graph_account_id: graphAdAccountId,
      sync_run_id: syncRunId,
      counts: {
        custom_conversions_received: result.rows.length,
        custom_conversions_upserted: upsertedCount,
        graph_pages: result.pages,
      },
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const isGraphError = error instanceof GraphApiError;
    const errorCode = isGraphError ? error.code : "custom_conversions_sync_failed";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[meta-custom-conversions-sync] Sync failed", {
      workspaceId,
      storeId,
      metaAdAccountId,
      errorCode,
      errorMessage,
      detail: isGraphError ? error.detail : null,
    });

    if (syncRunId) {
      await supabase
        .from("meta_sync_runs")
        .update({
          status: "error",
          error_code: errorCode,
          error_message: errorMessage,
          finished_at: finishedAt,
          metadata: {
            graph_version: graphVersion,
            meta_ad_account_id: metaAdAccountId,
            read_only: true,
            graph_detail: isGraphError ? error.detail : null,
          },
        })
        .eq("id", syncRunId);
    }

    return jsonResponse(
      {
        status: "error",
        error: errorCode,
        message: errorMessage,
        sync_run_id: syncRunId,
      },
      isGraphError ? Math.max(400, Math.min(error.status, 599)) : 500
    );
  }
});
