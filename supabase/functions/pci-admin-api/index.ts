import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5502",
  "http://127.0.0.1:5502",
  "http://localhost:5503",
  "http://127.0.0.1:5503",
];

const ENV_ALLOWED_ORIGINS = (Deno.env.get("PCI_ADMIN_ALLOWED_ORIGINS") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]));

function clean(value: unknown): string { return String(value ?? "").trim(); }
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function isWorkspaceId(value: string): boolean {
  return Boolean(value && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value));
}
function isAllowedOrigin(request: Request): boolean {
  const origin = clean(request.headers.get("origin"));
  return !origin || ALLOWED_ORIGINS.includes(origin);
}
function corsHeaders(request: Request): HeadersInit {
  const origin = clean(request.headers.get("origin"));
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin : ALLOWED_ORIGINS[0] ?? "http://localhost:5500";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function json(request: Request, body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function adminClient(): SupabaseAdmin {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("pci_backend_not_configured");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
async function requireUser(request: Request, admin: SupabaseAdmin): Promise<{ id: string } | null> {
  const match = clean(request.headers.get("authorization")).match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(clean(match[1]));
  if (error || !data?.user?.id) return null;
  return { id: data.user.id };
}
async function parseObject(request: Request): Promise<JsonRecord | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
  } catch { return null; }
}
function rejectUnexpected(payload: JsonRecord, allowed: string[]): string[] {
  const accepted = new Set(allowed);
  return Object.keys(payload).filter((key) => !accepted.has(key));
}
function normalizePathname(url: URL): string {
  const marker = "/pci-admin-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}
function requestId(): string { return crypto.randomUUID(); }
function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const value = clean(request.headers.get("idempotency-key")) || clean(payload?.idempotency_key);
  return isUuid(value) ? value.toLowerCase() : null;
}
function objectValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function parseDate(value: unknown): string | null | false {
  const raw = clean(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : false;
}
async function rpc(admin: SupabaseAdmin, functionName: string, args: JsonRecord) {
  const { data, error } = await admin.schema("pci_api").rpc(functionName, args);
  return { data, error: error ? { message: error.message, code: error.code } : null };
}
function rpcErrorCode(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_operator_context_required","pci_workspace_access_denied","pci_submission_not_found",
    "pci_submission_version_not_found","pci_submission_version_not_ready","pci_submission_version_storage_invalid",
    "pci_review_context_required","pci_submission_not_reviewable","pci_submission_current_version_required",
    "pci_submission_current_version_not_ready","pci_submission_review_decision_not_allowed","pci_creator_feedback_required",
    "pci_submission_participation_invalid","pci_submission_brief_revision_invalid","pci_pre_purchase_revision_limit_reached",
    "pci_rejection_reason_invalid","pci_internal_note_context_required","pci_internal_note_body_required",
    "pci_negotiation_context_required","pci_negotiation_not_found","pci_negotiation_already_open","pci_negotiation_reopen_required",
    "pci_negotiation_not_closed","pci_negotiation_not_open","pci_negotiation_purchase_exists","pci_negotiation_close_reason_invalid",
    "pci_negotiation_message_context_required","pci_negotiation_message_invalid","pci_submission_not_preselected",
    "pci_offer_context_required","pci_offer_not_found","pci_parent_offer_not_found","pci_parent_offer_not_live",
    "pci_offer_amount_invalid","pci_offer_currency_invalid","pci_offer_expiry_invalid","pci_offer_rights_snapshot_required",
    "pci_offer_payment_terms_required","pci_rights_clearance_incomplete","pci_submission_version_hash_required",
    "pci_live_offer_exists","pci_another_offer_is_live","pci_admin_can_only_reject_creator_offer",
    "pci_admin_can_only_withdraw_workspace_offer","pci_offer_not_live","pci_command_already_processing","pci_idempotency_conflict",
  ];
  const code = known.find((item) => message.includes(item)) ?? "pci_operation_failed";
  if (["pci_operator_context_required","pci_workspace_access_denied"].includes(code)) return { code, status: 403 };
  if (["pci_submission_not_found","pci_submission_version_not_found","pci_negotiation_not_found","pci_offer_not_found","pci_parent_offer_not_found"].includes(code)) return { code, status: 404 };
  if ([
    "pci_submission_version_not_ready","pci_submission_version_storage_invalid","pci_submission_not_reviewable",
    "pci_submission_current_version_required","pci_submission_current_version_not_ready","pci_submission_review_decision_not_allowed",
    "pci_pre_purchase_revision_limit_reached","pci_negotiation_already_open","pci_negotiation_reopen_required",
    "pci_negotiation_not_closed","pci_negotiation_not_open","pci_negotiation_purchase_exists","pci_submission_not_preselected",
    "pci_parent_offer_not_live","pci_live_offer_exists","pci_another_offer_is_live","pci_rights_clearance_incomplete",
    "pci_submission_version_hash_required","pci_admin_can_only_reject_creator_offer","pci_admin_can_only_withdraw_workspace_offer",
    "pci_offer_not_live","pci_command_already_processing","pci_idempotency_conflict",
  ].includes(code)) return { code, status: 409 };
  if ([
    "pci_creator_feedback_required","pci_submission_participation_invalid","pci_submission_brief_revision_invalid",
    "pci_rejection_reason_invalid","pci_internal_note_body_required","pci_negotiation_close_reason_invalid",
    "pci_negotiation_message_invalid","pci_offer_amount_invalid","pci_offer_currency_invalid","pci_offer_expiry_invalid",
    "pci_offer_rights_snapshot_required","pci_offer_payment_terms_required",
  ].includes(code)) return { code, status: 422 };
  return { code, status: 400 };
}
function validateWorkspaceAndSubmission(request: Request, workspaceRaw: string, submissionRaw: string, reqId: string): Response | { workspaceId: string; submissionId: string } {
  const workspaceId = decodeURIComponent(workspaceRaw);
  const submissionId = submissionRaw.toLowerCase();
  if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
  if (!isUuid(submissionId)) return json(request, { ok: false, code: "invalid_submission_id", request_id: reqId }, 400);
  return { workspaceId, submissionId };
}
function validateWorkspaceAndUuid(request: Request, workspaceRaw: string, idRaw: string, invalidCode: string, reqId: string): Response | { workspaceId: string; id: string } {
  const workspaceId = decodeURIComponent(workspaceRaw);
  const id = idRaw.toLowerCase();
  if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
  if (!isUuid(id)) return json(request, { ok: false, code: invalidCode, request_id: reqId }, 400);
  return { workspaceId, id };
}
async function rpcJson(request: Request, admin: SupabaseAdmin, name: string, args: JsonRecord, reqId: string, successStatus = 200): Promise<Response> {
  const result = await rpc(admin, name, args);
  if (result.error) {
    const mapped = rpcErrorCode(result.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }
  return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId }, successStatus);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request)) return new Response("origin_not_allowed", { status: 403 });
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (!isAllowedOrigin(request)) return json(request, { ok: false, code: "origin_not_allowed" }, 403);

  let admin: SupabaseAdmin;
  try { admin = adminClient(); } catch { return json(request, { ok: false, code: "backend_not_configured" }, 503); }
  const user = await requireUser(request, admin);
  if (!user) return json(request, { ok: false, code: "unauthorized", message: "Se requiere una sesión válida de Protocol Data." }, 401);

  const path = normalizePathname(new URL(request.url));

  let match = path.match(/^\/v1\/workspaces\/([^/]+)\/review-queue$/);
  if (request.method === "GET" && match) {
    const reqId = requestId(); const workspaceId = decodeURIComponent(match[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_review_queue", { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review-context$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndSubmission(request, match[1], match[2], reqId); if (v instanceof Response) return v;
    return rpcJson(request, admin, "admin_submission_review_context", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_id: v.submissionId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndSubmission(request, match[1], match[2], reqId); if (v instanceof Response) return v;
    return rpcJson(request, admin, "admin_submission_detail", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_id: v.submissionId }, reqId);
  }

  const reviewCommands: Array<[RegExp, string, string[]]> = [
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/start$/i, "start_review", []],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/request-changes$/i, "request_changes", ["creator_feedback","internal_summary"]],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/preselect$/i, "preselect_submission", ["creator_feedback","internal_summary"]],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/reject$/i, "reject_submission", ["rejection_reason_code","creator_feedback","internal_summary"]],
  ];
  for (const [pattern, command, fields] of reviewCommands) {
    const m = path.match(pattern);
    if (request.method !== "POST" || !m) continue;
    const reqId = requestId(); const v = validateWorkspaceAndSubmission(request, m[1], m[2], reqId); if (v instanceof Response) return v;
    const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, [...fields, "idempotency_key"]); if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload); if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const args: JsonRecord = { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_id: v.submissionId, p_idempotency_key: idem, p_request_id: reqId };
    if (command === "request_changes") {
      const feedback = clean(payload.creator_feedback), summary = clean(payload.internal_summary);
      if (!feedback || feedback.length > 5000) return json(request, { ok: false, code: "invalid_creator_feedback", request_id: reqId }, 400);
      if (summary.length > 5000) return json(request, { ok: false, code: "invalid_internal_summary", request_id: reqId }, 400);
      args.p_creator_feedback = feedback; args.p_internal_summary = summary || null;
    } else if (command === "preselect_submission") {
      const feedback = clean(payload.creator_feedback), summary = clean(payload.internal_summary);
      if (feedback.length > 5000 || summary.length > 5000) return json(request, { ok: false, code: "invalid_review_text", request_id: reqId }, 400);
      args.p_creator_feedback = feedback || null; args.p_internal_summary = summary || null;
    } else if (command === "reject_submission") {
      const reason = clean(payload.rejection_reason_code).toLowerCase(), feedback = clean(payload.creator_feedback), summary = clean(payload.internal_summary);
      if (!reason || reason.length > 80 || !/^[a-z0-9_:-]+$/.test(reason)) return json(request, { ok: false, code: "pci_rejection_reason_invalid", request_id: reqId }, 422);
      if (!feedback || feedback.length > 5000 || summary.length > 5000) return json(request, { ok: false, code: "invalid_review_text", request_id: reqId }, 400);
      args.p_rejection_reason_code = reason; args.p_creator_feedback = feedback; args.p_internal_summary = summary || null;
    }
    return rpcJson(request, admin, command, args, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/internal-notes$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndSubmission(request, match[1], match[2], reqId); if (v instanceof Response) return v;
    const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["body","idempotency_key"]); if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), body = clean(payload.body);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!body || body.length > 5000) return json(request, { ok: false, code: "invalid_internal_note", request_id: reqId }, 400);
    return rpcJson(request, admin, "add_internal_note", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_id: v.submissionId, p_body: body, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_negotiations", { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId); if (v instanceof Response) return v;
    return rpcJson(request, admin, "admin_negotiation_detail", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_negotiation_id: v.id }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/negotiation\/open$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndSubmission(request, match[1], match[2], reqId); if (v instanceof Response) return v;
    const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]); if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload); if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "open_negotiation", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_id: v.submissionId, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)\/(reopen|close|messages)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId); if (v instanceof Response) return v;
    const action = match[3].toLowerCase(); const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const allowed = action === "close" ? ["close_reason","idempotency_key"] : action === "messages" ? ["body","idempotency_key"] : ["idempotency_key"];
    const unexpected = rejectUnexpected(payload, allowed); if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload); if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (action === "reopen") return rpcJson(request, admin, "reopen_negotiation", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_negotiation_id: v.id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    if (action === "close") {
      const reason = clean(payload.close_reason).toLowerCase(); if (!reason) return json(request, { ok: false, code: "close_reason_required", request_id: reqId }, 400);
      return rpcJson(request, admin, "close_negotiation", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_negotiation_id: v.id, p_close_reason: reason, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    }
    const body = clean(payload.body); if (!body || body.length > 5000) return json(request, { ok: false, code: "invalid_message", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_send_negotiation_message", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_negotiation_id: v.id, p_body: body, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)\/offers$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId); if (v instanceof Response) return v;
    const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["submission_version_id","total_amount","currency","expires_at","rights_package_snapshot","payment_terms_snapshot","bonus_terms_snapshot","commercial_terms_snapshot","parent_offer_id","idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), versionId = clean(payload.submission_version_id).toLowerCase(), currency = clean(payload.currency).toUpperCase(), parentId = clean(payload.parent_offer_id).toLowerCase();
    const amount = Number(payload.total_amount), expiresAt = parseDate(payload.expires_at);
    const rights = objectValue(payload.rights_package_snapshot), payment = objectValue(payload.payment_terms_snapshot), bonus = objectValue(payload.bonus_terms_snapshot) ?? {}, commercial = objectValue(payload.commercial_terms_snapshot) ?? {};
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!isUuid(versionId)) return json(request, { ok: false, code: "invalid_submission_version_id", request_id: reqId }, 400);
    if (parentId && !isUuid(parentId)) return json(request, { ok: false, code: "invalid_parent_offer_id", request_id: reqId }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json(request, { ok: false, code: "pci_offer_amount_invalid", request_id: reqId }, 422);
    if (!/^[A-Z]{3}$/.test(currency)) return json(request, { ok: false, code: "pci_offer_currency_invalid", request_id: reqId }, 422);
    if (expiresAt === false) return json(request, { ok: false, code: "pci_offer_expiry_invalid", request_id: reqId }, 422);
    if (!rights || Object.keys(rights).length === 0) return json(request, { ok: false, code: "pci_offer_rights_snapshot_required", request_id: reqId }, 422);
    if (!payment || Object.keys(payment).length === 0) return json(request, { ok: false, code: "pci_offer_payment_terms_required", request_id: reqId }, 422);
    return rpcJson(request, admin, "send_purchase_offer", {
      p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_negotiation_id: v.id,
      p_submission_version_id: versionId, p_total_amount: amount, p_currency: currency,
      p_expires_at: expiresAt || null, p_rights_package_snapshot: rights, p_payment_terms_snapshot: payment,
      p_bonus_terms_snapshot: bonus, p_commercial_terms_snapshot: commercial,
      p_parent_offer_id: parentId || null, p_idempotency_key: idem, p_request_id: reqId,
    }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/offers\/([0-9a-f-]+)\/(reject|withdraw)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_offer_id", reqId); if (v instanceof Response) return v;
    const payload = await parseObject(request); if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]); if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload); if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const command = match[3].toLowerCase() === "reject" ? "admin_reject_offer" : "withdraw_purchase_offer";
    return rpcJson(request, admin, command, { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_offer_id: v.id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/versions\/([0-9a-f-]+)\/playback$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(); const v = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_submission_version_id", reqId); if (v instanceof Response) return v;
    const context = await rpc(admin, "admin_version_playback_context", { p_actor_user_id: user.id, p_workspace_id: v.workspaceId, p_submission_version_id: v.id });
    if (context.error) { const mapped = rpcErrorCode(context.error); return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status); }
    const value = (context.data ?? {}) as JsonRecord, bucket = clean(value.storage_bucket), storagePath = clean(value.storage_path);
    if (bucket !== "pci-submissions" || !storagePath) return json(request, { ok: false, code: "playback_context_unavailable", request_id: reqId }, 409);
    const { data: signedUrl, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 600);
    if (error || !signedUrl?.signedUrl) return json(request, { ok: false, code: "playback_url_failed", request_id: reqId }, 500);
    return json(request, { ok: true, request_id: reqId, submission_id: value.submission_id, submission_version_id: value.submission_version_id, version_number: value.version_number, mime_type: value.mime_type, original_filename: value.original_filename, file_size_bytes: value.file_size_bytes, duration_seconds: value.duration_seconds, width: value.width, height: value.height, sha256: value.sha256, playback: { signed_url: signedUrl.signedUrl, expires_in_seconds: 600 } });
  }

  return json(request, { ok: false, code: "route_not_found", method: request.method, path }, 404);
});