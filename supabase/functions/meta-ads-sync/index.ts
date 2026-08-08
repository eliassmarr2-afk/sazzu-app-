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

type TrackingParamDraft = {
  position: number;
  campo_utm: string;
  valor_template: string;
  raw_pair: string;
  es_dinamico: boolean;
  dynamic_token: string | null;
};

type TrackingParamValidated = TrackingParamDraft & {
  campo_existe: boolean;
  campo_activo: boolean;
  usa_catalogo: boolean;
  valor_existe: boolean | null;
  valor_activo: boolean | null;
  campo_valido: boolean;
  valor_valido: boolean | null;
  estado_validacion: string;
  familia_campo: string | null;
};

class GraphApiError extends Error {
  code: string;
  status: number;
  detail: unknown;

  constructor(message: string, code = "graph_api_error", status = 502, detail?: unknown) {
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

function nullableJson(value: unknown): unknown | null {
  if (value === undefined || value === null) return null;
  return value;
}

function extractDestinationUrl(creative: JsonRecord | null | undefined): string | null {
  if (!creative) return null;

  const direct = nullableText(creative.link_url);
  if (direct) return direct;

  const story = creative.object_story_spec || {};

  const linkData = nullableText(story?.link_data?.link);
  if (linkData) return linkData;

  const videoCta = nullableText(story?.video_data?.call_to_action?.value?.link);
  if (videoCta) return videoCta;

  const photoCta = nullableText(story?.photo_data?.call_to_action?.value?.link);
  if (photoCta) return photoCta;

  const templateLink = nullableText(story?.template_data?.link);
  if (templateLink) return templateLink;

  const assetLinks = Array.isArray(creative.asset_feed_spec?.link_urls)
    ? creative.asset_feed_spec.link_urls
    : [];

  for (const item of assetLinks) {
    const websiteUrl = nullableText(item?.website_url);
    if (websiteUrl) return websiteUrl;

    const fallbackUrl = nullableText(item?.url);
    if (fallbackUrl) return fallbackUrl;
  }

  return null;
}

function parseTrackingParams(rawUrlTags: unknown): TrackingParamDraft[] {
  const raw = cleanText(rawUrlTags).replace(/^\?/, "");
  if (!raw) return [];

  const params = new URLSearchParams(raw);
  const rows: TrackingParamDraft[] = [];
  let position = 0;

  for (const [key, value] of params.entries()) {
    position += 1;

    const dynamicMatches = [...value.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]);

    rows.push({
      position,
      campo_utm: key,
      valor_template: value,
      raw_pair: `${key}=${value}`,
      es_dinamico: dynamicMatches.length > 0,
      dynamic_token: dynamicMatches.length > 0 ? dynamicMatches.join(",") : null,
    });
  }

  return rows;
}

function getTrackingStatus(params: TrackingParamValidated[], rawUrlTags: unknown): string {
  if (!cleanText(rawUrlTags) || params.length === 0) return "missing";

  const hasInvalid = params.some(
    (item) => item.campo_valido === false || item.valor_valido === false
  );

  if (hasInvalid) return "invalid";

  const hasUnresolved = params.some(
    (item) => item.valor_valido === null || item.estado_validacion === "dynamic_unresolved"
  );

  if (hasUnresolved) return "incomplete";

  return "valid";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
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
      function: "meta-ads-sync",
      mode: "read-only-structural-v1",
      graph_version: Deno.env.get("META_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION,
      meta_access_token_configured: Boolean(Deno.env.get("META_ACCESS_TOKEN")),
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
  const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || DEFAULT_GRAPH_VERSION;

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
        graphError.message || `Meta Graph API request failed with HTTP ${response.status}.`,
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

  async function graphGetObject(path: string, fields: string): Promise<JsonRecord> {
    const url = new URL(`${graphBase}/${path.replace(/^\//, "")}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", metaAccessToken);
    return await graphFetchUrl(url);
  }

  async function graphGetAll(path: string, fields: string): Promise<JsonRecord[]> {
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
          "Meta pagination exceeded the safety limit of 100 pages.",
          "graph_pagination_limit",
          502
        );
      }

      const payload = await graphFetchUrl(nextUrl);
      const data = Array.isArray(payload.data) ? payload.data : [];
      rows.push(...data);
      nextUrl = nullableText(payload?.paging?.next);
    }

    return rows;
  }

  let syncRunId: string | null = null;
  let connectionId: string | null = null;
  let adAccountInternalId: string | null = null;

  try {
    const nowIso = new Date().toISOString();

    const { data: connection, error: connectionError } = await supabase
      .from("meta_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          store_id: storeId,
          provider: "meta",
          connection_key: connectionKey,
          status: "active",
          meta_app_id: nullableText(Deno.env.get("META_APP_ID")),
          meta_business_id: nullableText(Deno.env.get("META_BUSINESS_ID")),
          secret_ref: "META_ACCESS_TOKEN",
          api_version: graphVersion,
          metadata: {
            mode: "single-secret-read-only-v1",
          },
        },
        {
          onConflict: "workspace_id,store_id,provider,connection_key",
        }
      )
      .select("id")
      .single();

    if (connectionError || !connection?.id) {
      throw new Error(
        `meta_connections upsert failed: ${connectionError?.message || "missing id"}`
      );
    }

    connectionId = connection.id;

    const { data: syncRun, error: syncRunError } = await supabase
      .from("meta_sync_runs")
      .insert({
        connection_id: connectionId,
        workspace_id: workspaceId,
        store_id: storeId,
        sync_type: "structural",
        status: "running",
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: metaAdAccountId,
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

    const ACCOUNT_FIELDS = "id,name,account_status,currency,timezone_name";
    const CAMPAIGN_FIELDS =
      "id,name,status,effective_status,objective,buying_type,start_time,stop_time,created_time,updated_time";
    const ADSET_FIELDS =
      "id,name,campaign_id,status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,start_time,end_time,created_time,updated_time";
    const AD_FIELDS =
      "id,name,adset_id,campaign_id,status,effective_status,creative,created_time,updated_time";
    const CREATIVE_FIELDS =
      "id,name,status,body,title,object_type,object_story_id,object_story_spec,asset_feed_spec,image_hash,image_url,video_id,thumbnail_url,link_url,url_tags,effective_object_story_id";

    const accountPayload = await graphGetObject(graphAdAccountId, ACCOUNT_FIELDS);

    const canonicalAccountId = normalizeAdAccountId(accountPayload.id || metaAdAccountId);
    const canonicalGraphAccountId = graphAccountId(canonicalAccountId);

    const { data: accountRow, error: accountError } = await supabase
      .from("meta_ad_accounts")
      .upsert(
        {
          connection_id: connectionId,
          workspace_id: workspaceId,
          store_id: storeId,
          meta_ad_account_id: canonicalAccountId,
          graph_account_id: canonicalGraphAccountId,
          name: nullableText(accountPayload.name),
          account_status:
            accountPayload.account_status === undefined || accountPayload.account_status === null
              ? null
              : Number(accountPayload.account_status),
          currency: nullableText(accountPayload.currency),
          timezone_name: nullableText(accountPayload.timezone_name),
          raw_payload: accountPayload,
          synced_at: nowIso,
        },
        {
          onConflict: "workspace_id,store_id,meta_ad_account_id",
        }
      )
      .select("id")
      .single();

    if (accountError || !accountRow?.id) {
      throw new Error(
        `meta_ad_accounts upsert failed: ${accountError?.message || "missing id"}`
      );
    }

    adAccountInternalId = accountRow.id;

    await supabase
      .from("meta_sync_runs")
      .update({ ad_account_id: adAccountInternalId })
      .eq("id", syncRunId);

    const [campaigns, adsets, ads] = await Promise.all([
      graphGetAll(`${canonicalGraphAccountId}/campaigns`, CAMPAIGN_FIELDS),
      graphGetAll(`${canonicalGraphAccountId}/adsets`, ADSET_FIELDS),
      graphGetAll(`${canonicalGraphAccountId}/ads`, AD_FIELDS),
    ]);

    const campaignRows = campaigns.map((item) => ({
      ad_account_id: adAccountInternalId,
      workspace_id: workspaceId,
      store_id: storeId,
      meta_ad_account_id: canonicalAccountId,
      meta_campaign_id: cleanText(item.id),
      name: nullableText(item.name),
      status: nullableText(item.status),
      effective_status: nullableText(item.effective_status),
      objective: nullableText(item.objective),
      buying_type: nullableText(item.buying_type),
      start_time: nullableText(item.start_time),
      stop_time: nullableText(item.stop_time),
      meta_created_time: nullableText(item.created_time),
      meta_updated_time: nullableText(item.updated_time),
      raw_payload: item,
      synced_at: nowIso,
    }));

    let campaignDbRows: JsonRecord[] = [];

    if (campaignRows.length > 0) {
      const { data, error } = await supabase
        .from("meta_campaigns")
        .upsert(campaignRows, {
          onConflict: "workspace_id,store_id,meta_campaign_id",
        })
        .select("id,meta_campaign_id");

      if (error) throw new Error(`meta_campaigns upsert failed: ${error.message}`);
      campaignDbRows = data || [];
    }

    const campaignIdMap = new Map<string, string>(
      campaignDbRows.map((row) => [cleanText(row.meta_campaign_id), cleanText(row.id)])
    );

    const adsetRows = adsets.map((item) => {
      const metaCampaignId = cleanText(item.campaign_id);
      const campaignInternalId = campaignIdMap.get(metaCampaignId);

      if (!campaignInternalId) {
        throw new Error(`Missing campaign parent for Meta AdSet ${cleanText(item.id)}.`);
      }

      return {
        ad_account_id: adAccountInternalId,
        campaign_id: campaignInternalId,
        workspace_id: workspaceId,
        store_id: storeId,
        meta_ad_account_id: canonicalAccountId,
        meta_campaign_id: metaCampaignId,
        meta_adset_id: cleanText(item.id),
        name: nullableText(item.name),
        status: nullableText(item.status),
        effective_status: nullableText(item.effective_status),
        optimization_goal: nullableText(item.optimization_goal),
        billing_event: nullableText(item.billing_event),
        bid_strategy: nullableText(item.bid_strategy),
        daily_budget_raw: nullableText(item.daily_budget),
        lifetime_budget_raw: nullableText(item.lifetime_budget),
        start_time: nullableText(item.start_time),
        end_time: nullableText(item.end_time),
        meta_created_time: nullableText(item.created_time),
        meta_updated_time: nullableText(item.updated_time),
        raw_payload: item,
        synced_at: nowIso,
      };
    });

    let adsetDbRows: JsonRecord[] = [];

    if (adsetRows.length > 0) {
      const { data, error } = await supabase
        .from("meta_adsets")
        .upsert(adsetRows, {
          onConflict: "workspace_id,store_id,meta_adset_id",
        })
        .select("id,meta_adset_id");

      if (error) throw new Error(`meta_adsets upsert failed: ${error.message}`);
      adsetDbRows = data || [];
    }

    const adsetIdMap = new Map<string, string>(
      adsetDbRows.map((row) => [cleanText(row.meta_adset_id), cleanText(row.id)])
    );

    const creativeIds = Array.from(
      new Set(
        ads
          .map((item) => cleanText(item?.creative?.id))
          .filter(Boolean)
      )
    );

    const creativePayloads = await mapWithConcurrency(
      creativeIds,
      5,
      async (creativeId) => await graphGetObject(creativeId, CREATIVE_FIELDS)
    );

    const creativeRows = creativePayloads.map((item) => ({
      ad_account_id: adAccountInternalId,
      workspace_id: workspaceId,
      store_id: storeId,
      meta_ad_account_id: canonicalAccountId,
      meta_creative_id: cleanText(item.id),
      name: nullableText(item.name),
      status: nullableText(item.status),
      body: nullableText(item.body),
      title: nullableText(item.title),
      object_type: nullableText(item.object_type),
      object_story_id: nullableText(item.object_story_id),
      effective_object_story_id: nullableText(item.effective_object_story_id),
      image_hash: nullableText(item.image_hash),
      image_url: nullableText(item.image_url),
      video_id: nullableText(item.video_id),
      thumbnail_url: nullableText(item.thumbnail_url),
      link_url: nullableText(item.link_url),
      url_tags: nullableText(item.url_tags),
      object_story_spec: nullableJson(item.object_story_spec),
      asset_feed_spec: nullableJson(item.asset_feed_spec),
      raw_payload: item,
      synced_at: nowIso,
    }));

    let creativeDbRows: JsonRecord[] = [];

    if (creativeRows.length > 0) {
      const { data, error } = await supabase
        .from("meta_creatives")
        .upsert(creativeRows, {
          onConflict: "workspace_id,store_id,meta_creative_id",
        })
        .select("id,meta_creative_id");

      if (error) throw new Error(`meta_creatives upsert failed: ${error.message}`);
      creativeDbRows = data || [];
    }

    const creativeIdMap = new Map<string, string>(
      creativeDbRows.map((row) => [cleanText(row.meta_creative_id), cleanText(row.id)])
    );

    const creativePayloadMap = new Map<string, JsonRecord>(
      creativePayloads.map((item) => [cleanText(item.id), item])
    );

    const adRows = ads.map((item) => {
      const metaCampaignId = cleanText(item.campaign_id);
      const metaAdsetId = cleanText(item.adset_id);
      const metaCreativeId = cleanText(item?.creative?.id);

      const campaignInternalId = campaignIdMap.get(metaCampaignId);
      const adsetInternalId = adsetIdMap.get(metaAdsetId);
      const creativeInternalId = metaCreativeId
        ? creativeIdMap.get(metaCreativeId) || null
        : null;

      if (!campaignInternalId) {
        throw new Error(`Missing campaign parent for Meta Ad ${cleanText(item.id)}.`);
      }

      if (!adsetInternalId) {
        throw new Error(`Missing adset parent for Meta Ad ${cleanText(item.id)}.`);
      }

      return {
        ad_account_id: adAccountInternalId,
        campaign_id: campaignInternalId,
        adset_id: adsetInternalId,
        creative_id: creativeInternalId,
        workspace_id: workspaceId,
        store_id: storeId,
        meta_ad_account_id: canonicalAccountId,
        meta_campaign_id: metaCampaignId,
        meta_adset_id: metaAdsetId,
        meta_ad_id: cleanText(item.id),
        meta_creative_id: metaCreativeId || null,
        name: nullableText(item.name),
        status: nullableText(item.status),
        effective_status: nullableText(item.effective_status),
        meta_created_time: nullableText(item.created_time),
        meta_updated_time: nullableText(item.updated_time),
        raw_payload: item,
        synced_at: nowIso,
      };
    });

    let adDbRows: JsonRecord[] = [];

    if (adRows.length > 0) {
      const { data, error } = await supabase
        .from("meta_ads")
        .upsert(adRows, {
          onConflict: "workspace_id,store_id,meta_ad_id",
        })
        .select("id,meta_ad_id,meta_creative_id,creative_id");

      if (error) throw new Error(`meta_ads upsert failed: ${error.message}`);
      adDbRows = data || [];
    }

    const allParamDrafts = ads.flatMap((ad) => {
      const metaCreativeId = cleanText(ad?.creative?.id);
      const creative = metaCreativeId ? creativePayloadMap.get(metaCreativeId) : null;
      return parseTrackingParams(creative?.url_tags);
    });

    const uniqueFields = Array.from(
      new Set(allParamDrafts.map((item) => item.campo_utm).filter(Boolean))
    );

    let utmFieldRows: JsonRecord[] = [];

    if (uniqueFields.length > 0) {
      const { data, error } = await supabase
        .from("utm_campos")
        .select("campo_utm,activo,usa_catalogo_valores,familia_campo")
        .in("campo_utm", uniqueFields);

      if (error) {
        throw new Error(`utm_campos read failed: ${error.message}`);
      }

      utmFieldRows = data || [];
    }

    const fieldConfigMap = new Map<string, JsonRecord>(
      utmFieldRows.map((row) => [cleanText(row.campo_utm), row])
    );

    const catalogFields = utmFieldRows
      .filter((row) => row.usa_catalogo_valores === true)
      .map((row) => cleanText(row.campo_utm))
      .filter(Boolean);

    let utmValueRows: JsonRecord[] = [];

    if (catalogFields.length > 0) {
      const { data, error } = await supabase
        .from("utm_valores")
        .select("campo_utm,valor_permitido,activo,estado_revision")
        .in("campo_utm", catalogFields);

      if (error) {
        throw new Error(`utm_valores read failed: ${error.message}`);
      }

      utmValueRows = data || [];
    }

    const valueConfigMap = new Map<string, JsonRecord>();

    for (const row of utmValueRows) {
      const key = `${cleanText(row.campo_utm)}\u0000${cleanText(row.valor_permitido)}`;
      valueConfigMap.set(key, row);
    }

    function validateParam(draft: TrackingParamDraft): TrackingParamValidated {
      const field = fieldConfigMap.get(draft.campo_utm);
      const campoExiste = Boolean(field);
      const campoActivo = field?.activo === true;
      const usaCatalogo = field?.usa_catalogo_valores === true;
      const campoValido = campoExiste && campoActivo;
      const familiaCampo = nullableText(field?.familia_campo);

      if (!campoExiste) {
        return {
          ...draft,
          campo_existe: false,
          campo_activo: false,
          usa_catalogo: false,
          valor_existe: null,
          valor_activo: null,
          campo_valido: false,
          valor_valido: false,
          estado_validacion: "campo_no_permitido",
          familia_campo: null,
        };
      }

      if (!campoActivo) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: false,
          usa_catalogo: usaCatalogo,
          valor_existe: null,
          valor_activo: null,
          campo_valido: false,
          valor_valido: false,
          estado_validacion: "campo_inactivo",
          familia_campo: familiaCampo,
        };
      }

      if (!draft.valor_template) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: true,
          usa_catalogo: usaCatalogo,
          valor_existe: null,
          valor_activo: null,
          campo_valido: true,
          valor_valido: false,
          estado_validacion: "valor_vacio",
          familia_campo: familiaCampo,
        };
      }

      if (!usaCatalogo) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: true,
          usa_catalogo: false,
          valor_existe: null,
          valor_activo: null,
          campo_valido: true,
          valor_valido: true,
          estado_validacion: draft.es_dinamico ? "ok_dynamic" : "ok",
          familia_campo: familiaCampo,
        };
      }

      if (draft.es_dinamico) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: true,
          usa_catalogo: true,
          valor_existe: null,
          valor_activo: null,
          campo_valido: true,
          valor_valido: null,
          estado_validacion: "dynamic_unresolved",
          familia_campo: familiaCampo,
        };
      }

      const valueKey = `${draft.campo_utm}\u0000${draft.valor_template}`;
      const valueRow = valueConfigMap.get(valueKey);
      const valorExiste = Boolean(valueRow);
      const valorActivo = valueRow?.activo === true;

      if (!valorExiste) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: true,
          usa_catalogo: true,
          valor_existe: false,
          valor_activo: false,
          campo_valido: true,
          valor_valido: false,
          estado_validacion: "valor_no_encontrado",
          familia_campo: familiaCampo,
        };
      }

      if (!valorActivo) {
        return {
          ...draft,
          campo_existe: true,
          campo_activo: true,
          usa_catalogo: true,
          valor_existe: true,
          valor_activo: false,
          campo_valido: true,
          valor_valido: false,
          estado_validacion: "valor_inactivo",
          familia_campo: familiaCampo,
        };
      }

      return {
        ...draft,
        campo_existe: true,
        campo_activo: true,
        usa_catalogo: true,
        valor_existe: true,
        valor_activo: true,
        campo_valido: true,
        valor_valido: true,
        estado_validacion: "ok",
        familia_campo: familiaCampo,
      };
    }

    const adInternalMap = new Map<string, JsonRecord>(
      adDbRows.map((row) => [cleanText(row.meta_ad_id), row])
    );

    const trackingWork = ads.map((ad) => {
      const metaAdId = cleanText(ad.id);
      const metaCreativeId = cleanText(ad?.creative?.id);
      const creative = metaCreativeId ? creativePayloadMap.get(metaCreativeId) : null;
      const drafts = parseTrackingParams(creative?.url_tags);
      const validated = drafts.map(validateParam);
      const internalAd = adInternalMap.get(metaAdId);

      if (!internalAd?.id) {
        throw new Error(`Missing internal Meta Ad row for ${metaAdId}.`);
      }

      const validCount = validated.filter(
        (item) => item.campo_valido === true && item.valor_valido === true
      ).length;

      const invalidCount = validated.filter(
        (item) => item.campo_valido === false || item.valor_valido === false
      ).length;

      return {
        metaAdId,
        metaCreativeId,
        creative,
        validated,
        trackingRow: {
          ad_id: internalAd.id,
          creative_id: internalAd.creative_id || null,
          workspace_id: workspaceId,
          store_id: storeId,
          meta_ad_id: metaAdId,
          meta_creative_id: metaCreativeId || null,
          destination_url: extractDestinationUrl(creative),
          raw_url_tags: nullableText(creative?.url_tags),
          tracking_status: getTrackingStatus(validated, creative?.url_tags),
          parameters_count: validated.length,
          valid_parameters_count: validCount,
          invalid_parameters_count: invalidCount,
          synced_at: nowIso,
        },
      };
    });

    let trackingDbRows: JsonRecord[] = [];

    if (trackingWork.length > 0) {
      const { data, error } = await supabase
        .from("meta_ad_tracking")
        .upsert(
          trackingWork.map((item) => item.trackingRow),
          { onConflict: "ad_id" }
        )
        .select("id,meta_ad_id");

      if (error) throw new Error(`meta_ad_tracking upsert failed: ${error.message}`);
      trackingDbRows = data || [];
    }

    const trackingIdMap = new Map<string, string>(
      trackingDbRows.map((row) => [cleanText(row.meta_ad_id), cleanText(row.id)])
    );

    const trackingIds = trackingDbRows.map((row) => cleanText(row.id)).filter(Boolean);

    if (trackingIds.length > 0) {
      const { error: deleteParamsError } = await supabase
        .from("meta_ad_tracking_params")
        .delete()
        .in("tracking_id", trackingIds);

      if (deleteParamsError) {
        throw new Error(
          `meta_ad_tracking_params cleanup failed: ${deleteParamsError.message}`
        );
      }
    }

    const trackingParamRows = trackingWork.flatMap((item) => {
      const trackingId = trackingIdMap.get(item.metaAdId);
      if (!trackingId) return [];

      return item.validated.map((param) => ({
        tracking_id: trackingId,
        workspace_id: workspaceId,
        store_id: storeId,
        position: param.position,
        campo_utm: param.campo_utm,
        valor_template: param.valor_template,
        raw_pair: param.raw_pair,
        es_dinamico: param.es_dinamico,
        dynamic_token: param.dynamic_token,
        campo_existe: param.campo_existe,
        campo_activo: param.campo_activo,
        usa_catalogo: param.usa_catalogo,
        valor_existe: param.valor_existe,
        valor_activo: param.valor_activo,
        campo_valido: param.campo_valido,
        valor_valido: param.valor_valido,
        estado_validacion: param.estado_validacion,
        familia_campo: param.familia_campo,
      }));
    });

    if (trackingParamRows.length > 0) {
      const { error } = await supabase
        .from("meta_ad_tracking_params")
        .insert(trackingParamRows);

      if (error) {
        throw new Error(`meta_ad_tracking_params insert failed: ${error.message}`);
      }
    }

    const finishedAt = new Date().toISOString();

    const { error: finishRunError } = await supabase
      .from("meta_sync_runs")
      .update({
        status: "success",
        campaigns_received: campaigns.length,
        adsets_received: adsets.length,
        ads_received: ads.length,
        creatives_received: creativePayloads.length,
        tracking_rows_processed: trackingWork.length,
        tracking_params_processed: trackingParamRows.length,
        finished_at: finishedAt,
        metadata: {
          graph_version: graphVersion,
          meta_ad_account_id: canonicalAccountId,
          graph_account_id: canonicalGraphAccountId,
          read_only: true,
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
      throw new Error(`meta_connections finish failed: ${connectionFinishError.message}`);
    }

    const trackingSummary = trackingWork.reduce(
      (acc, item) => {
        const status = item.trackingRow.tracking_status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log("[meta-ads-sync] Structural sync completed", {
      workspaceId,
      storeId,
      metaAdAccountId: canonicalAccountId,
      campaigns: campaigns.length,
      adsets: adsets.length,
      ads: ads.length,
      creatives: creativePayloads.length,
      tracking: trackingSummary,
    });

    return jsonResponse({
      status: "ok",
      mode: "read-only-structural-v1",
      workspace_id: workspaceId,
      store_id: storeId,
      meta_ad_account_id: canonicalAccountId,
      graph_account_id: canonicalGraphAccountId,
      sync_run_id: syncRunId,
      counts: {
        campaigns: campaigns.length,
        adsets: adsets.length,
        ads: ads.length,
        creatives: creativePayloads.length,
        tracking_rows: trackingWork.length,
        tracking_params: trackingParamRows.length,
      },
      tracking_status: trackingSummary,
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const isGraphError = error instanceof GraphApiError;
    const errorCode = isGraphError ? error.code : "sync_failed";
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[meta-ads-sync] Sync failed", {
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
