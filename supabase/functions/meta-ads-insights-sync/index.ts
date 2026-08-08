import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-protocol-meta-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const DEFAULT_GRAPH_VERSION = "v26.0";
const GRAPH_BASE = "https://graph.facebook.com";
const UPSERT_BATCH_SIZE = 500;
const LOOKUP_BATCH_SIZE = 400;

type JsonRecord = Record<string, any>;

type InsightsMode = "historical" | "recent" | "custom";

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

function normalizeAdAccountId(value: unknown): string {
  return cleanText(value).replace(/^act_/i, "");
}

function graphAccountId(value: unknown): string {
  const clean = normalizeAdAccountId(value);
  return clean ? `act_${clean}` : "";
}

function nullableText(value: unknown): string | null {
  const clean = cleanText(value);
  return clean || null;
}

function toNonNegativeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function toNonNegativeInteger(value: unknown): number {
  return Math.trunc(toNonNegativeNumber(value));
}

function sumActionMetric(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => {
      return total + toNonNegativeNumber(item?.value);
    }, 0);
  }

  return toNonNegativeNumber(value);
}

function normalizeActionArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value : [];
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.toISOString().slice(0, 10) === value;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function minDate(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((min, value) => (value < min ? value : min), values[0]);
}

function maxDate(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((max, value) => (value > max ? value : max), values[0]);
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
      function: "meta-ads-insights-sync",
      mode: "read-only-insights-daily-v1",
      graph_version:
        Deno.env.get("META_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION,
      meta_access_token_configured: Boolean(
        Deno.env.get("META_ACCESS_TOKEN")
      ),
      sync_token_configured: Boolean(Deno.env.get("META_SYNC_TOKEN")),
      supported_sync_modes: ["historical", "recent", "custom"],
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
  const requestedMode = cleanText(input.sync_mode || "recent").toLowerCase();

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

  if (!["historical", "recent", "custom"].includes(requestedMode)) {
    return jsonResponse(
      {
        status: "error",
        error: "invalid_sync_mode",
        message: "sync_mode must be historical, recent or custom.",
      },
      400
    );
  }

  const syncMode = requestedMode as InsightsMode;
  const customSince = cleanText(input.since);
  const customUntil = cleanText(input.until);

  if (syncMode === "custom") {
    if (!isIsoDate(customSince) || !isIsoDate(customUntil)) {
      return jsonResponse(
        {
          status: "error",
          error: "invalid_custom_date_range",
          message: "Custom mode requires since/until in YYYY-MM-DD format.",
        },
        400
      );
    }

    if (customUntil < customSince) {
      return jsonResponse(
        {
          status: "error",
          error: "invalid_custom_date_order",
          message: "until must be greater than or equal to since.",
        },
        400
      );
    }
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

  async function graphGetInsights(): Promise<{
    rows: JsonRecord[];
    pages: number;
  }> {
    const fields = [
      "date_start",
      "date_stop",
      "account_id",
      "account_name",
      "account_currency",
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
      "ad_name",
      "spend",
      "impressions",
      "reach",
      "frequency",
      "clicks",
      "outbound_clicks",
      "ctr",
      "cpc",
      "cpm",
      "actions",
      "action_values",
    ].join(",");

    const firstUrl = new URL(`${graphBase}/${graphAdAccountId}/insights`);
    firstUrl.searchParams.set("fields", fields);
    firstUrl.searchParams.set("level", "ad");
    firstUrl.searchParams.set("time_increment", "1");
    firstUrl.searchParams.set("limit", "100");
    firstUrl.searchParams.set("access_token", metaAccessToken);

    if (syncMode === "historical") {
      firstUrl.searchParams.set("date_preset", "maximum");
    } else if (syncMode === "recent") {
      firstUrl.searchParams.set("date_preset", "last_7d");
    } else {
      firstUrl.searchParams.set(
        "time_range",
        JSON.stringify({
          since: customSince,
          until: customUntil,
        })
      );
    }

    const rows: JsonRecord[] = [];
    let nextUrl: string | null = firstUrl.toString();
    let pages = 0;

    while (nextUrl) {
      pages += 1;

      if (pages > 200) {
        throw new GraphApiError(
          "Meta Insights pagination exceeded the safety limit of 200 pages.",
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
          message:
            "Run meta-ads-sync first for this workspace/store/account before syncing Insights.",
        },
        409
      );
    }

    connectionId = connection.id;

    const { data: adAccount, error: adAccountError } = await supabase
      .from("meta_ad_accounts")
      .select("id,meta_ad_account_id,currency,timezone_name")
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
          message:
            "Run meta-ads-sync first so the advertising account exists locally.",
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
        sync_type: "insights_daily",
        status: "running",
        date_from: syncMode === "custom" ? customSince : null,
        date_to: syncMode === "custom" ? customUntil : null,
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: metaAdAccountId,
          sync_mode: syncMode,
          account_timezone: adAccount.timezone_name || null,
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

    const insightResult = await graphGetInsights();
    const insights = insightResult.rows;

    const externalAdIds = Array.from(
      new Set(
        insights
          .map((item) => cleanText(item.ad_id))
          .filter(Boolean)
      )
    );

    const localAds: JsonRecord[] = [];

    for (const batch of chunkArray(externalAdIds, LOOKUP_BATCH_SIZE)) {
      if (batch.length === 0) continue;

      const { data, error } = await supabase
        .from("meta_ads")
        .select(
          "id,ad_account_id,campaign_id,adset_id,meta_ad_account_id,meta_campaign_id,meta_adset_id,meta_ad_id"
        )
        .eq("workspace_id", workspaceId)
        .eq("store_id", storeId)
        .eq("meta_ad_account_id", metaAdAccountId)
        .in("meta_ad_id", batch);

      if (error) {
        throw new Error(`meta_ads lookup failed: ${error.message}`);
      }

      localAds.push(...(data || []));
    }

    const localAdMap = new Map<string, JsonRecord>(
      localAds.map((row) => [cleanText(row.meta_ad_id), row])
    );

    const insightRows: JsonRecord[] = [];
    const skippedReasons: JsonRecord[] = [];
    const missingLocalAdIds = new Set<string>();

    for (const item of insights) {
      const metaAdId = cleanText(item.ad_id);
      const dateStart = cleanText(item.date_start);
      const dateStop = cleanText(item.date_stop || item.date_start);

      if (!metaAdId || !isIsoDate(dateStart) || !isIsoDate(dateStop)) {
        skippedReasons.push({
          reason: "invalid_identity_or_date",
          meta_ad_id: metaAdId || null,
          date_start: dateStart || null,
          date_stop: dateStop || null,
        });
        continue;
      }

      const localAd = localAdMap.get(metaAdId);

      if (!localAd?.id) {
        missingLocalAdIds.add(metaAdId);
        skippedReasons.push({
          reason: "local_ad_not_found",
          meta_ad_id: metaAdId,
          date_start: dateStart,
        });
        continue;
      }

      insightRows.push({
        ad_account_id: localAd.ad_account_id,
        campaign_id: localAd.campaign_id,
        adset_id: localAd.adset_id,
        ad_id: localAd.id,

        workspace_id: workspaceId,
        store_id: storeId,

        meta_ad_account_id: normalizeAdAccountId(
          item.account_id || localAd.meta_ad_account_id || metaAdAccountId
        ),
        meta_campaign_id: cleanText(
          item.campaign_id || localAd.meta_campaign_id
        ),
        meta_adset_id: cleanText(item.adset_id || localAd.meta_adset_id),
        meta_ad_id: metaAdId,

        account_name_snapshot: nullableText(item.account_name),
        campaign_name_snapshot: nullableText(item.campaign_name),
        adset_name_snapshot: nullableText(item.adset_name),
        ad_name_snapshot: nullableText(item.ad_name),
        account_currency: nullableText(
          item.account_currency || adAccount.currency
        ),

        date_start: dateStart,
        date_stop: dateStop,

        spend: toNonNegativeNumber(item.spend),
        impressions: toNonNegativeInteger(item.impressions),
        reach: toNonNegativeInteger(item.reach),
        frequency: toNonNegativeNumber(item.frequency),
        clicks: toNonNegativeInteger(item.clicks),
        outbound_clicks: toNonNegativeInteger(
          sumActionMetric(item.outbound_clicks)
        ),
        ctr: toNonNegativeNumber(item.ctr),
        cpc: toNonNegativeNumber(item.cpc),
        cpm: toNonNegativeNumber(item.cpm),

        actions: normalizeActionArray(item.actions),
        action_values: normalizeActionArray(item.action_values),

        raw_payload: item,
        synced_at: new Date().toISOString(),
      });
    }

    let upsertedCount = 0;

    for (const batch of chunkArray(insightRows, UPSERT_BATCH_SIZE)) {
      if (batch.length === 0) continue;

      const { error } = await supabase
        .from("meta_insights_daily")
        .upsert(batch, {
          onConflict: "workspace_id,store_id,meta_ad_id,date_start",
        });

      if (error) {
        throw new Error(`meta_insights_daily upsert failed: ${error.message}`);
      }

      upsertedCount += batch.length;
    }

    const returnedDates = insights
      .map((item) => cleanText(item.date_start))
      .filter((value) => isIsoDate(value));

    const actualDateFrom = minDate(returnedDates);
    const actualDateTo = maxDate(returnedDates);
    const skippedCount = insights.length - insightRows.length;
    const finalStatus = skippedCount > 0 ? "partial" : "success";
    const finishedAt = new Date().toISOString();

    const { error: finishRunError } = await supabase
      .from("meta_sync_runs")
      .update({
        status: finalStatus,
        insights_received: insights.length,
        insights_upserted: upsertedCount,
        insights_skipped: skippedCount,
        date_from:
          actualDateFrom || (syncMode === "custom" ? customSince : null),
        date_to: actualDateTo || (syncMode === "custom" ? customUntil : null),
        finished_at: finishedAt,
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: metaAdAccountId,
          graph_account_id: graphAdAccountId,
          sync_mode: syncMode,
          graph_pages: insightResult.pages,
          account_timezone: adAccount.timezone_name || null,
          read_only: true,
          missing_local_ad_ids: Array.from(missingLocalAdIds).slice(0, 100),
          skipped_reasons_sample: skippedReasons.slice(0, 50),
        },
      })
      .eq("id", syncRunId);

    if (finishRunError) {
      throw new Error(`meta_sync_runs finish failed: ${finishRunError.message}`);
    }

    const { error: connectionFinishError } = await supabase
      .from("meta_connections")
      .update({
        last_synced_at: finishedAt,
        status: "active",
      })
      .eq("id", connectionId);

    if (connectionFinishError) {
      throw new Error(
        `meta_connections finish failed: ${connectionFinishError.message}`
      );
    }

    console.log("[meta-ads-insights-sync] Daily insights sync completed", {
      workspaceId,
      storeId,
      metaAdAccountId,
      syncMode,
      received: insights.length,
      upserted: upsertedCount,
      skipped: skippedCount,
      dateFrom: actualDateFrom,
      dateTo: actualDateTo,
    });

    return jsonResponse({
      status: finalStatus === "success" ? "ok" : "partial",
      mode: "read-only-insights-daily-v1",
      sync_mode: syncMode,
      workspace_id: workspaceId,
      store_id: storeId,
      meta_ad_account_id: metaAdAccountId,
      graph_account_id: graphAdAccountId,
      sync_run_id: syncRunId,
      date_range: {
        from: actualDateFrom,
        to: actualDateTo,
      },
      counts: {
        insights_received: insights.length,
        insights_upserted: upsertedCount,
        insights_skipped: skippedCount,
        graph_pages: insightResult.pages,
      },
      missing_local_ad_ids: Array.from(missingLocalAdIds),
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const isGraphError = error instanceof GraphApiError;
    const errorCode = isGraphError ? error.code : "insights_sync_failed";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[meta-ads-insights-sync] Sync failed", {
      workspaceId,
      storeId,
      metaAdAccountId,
      syncMode,
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
            sync_mode: syncMode,
            read_only: true,
            graph_detail: isGraphError ? error.detail : null,
          },
        })
        .eq("id", syncRunId);
    }

    if (connectionId) {
      await supabase
        .from("meta_connections")
        .update({ status: "error" })
        .eq("id", connectionId);
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
