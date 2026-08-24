import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PCI_PAYMENT_DATA_KEY = Deno.env.get("PCI_PAYMENT_DATA_KEY") ?? "";
const PROJECT_REF = (() => {
  try { return new URL(SUPABASE_URL).hostname.split(".")[0] ?? ""; }
  catch { return ""; }
})();
const DIRECT_STORAGE_TUS_ENDPOINT = PROJECT_REF
  ? `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`
  : "";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];
const ENV_ALLOWED_ORIGINS = (Deno.env.get("PCI_CREATOR_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]));

function clean(value: unknown): string { return String(value ?? "").trim(); }
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isSha256(value: string): boolean { return /^[0-9a-f]{64}$/i.test(value); }
function isAllowedOrigin(request: Request): boolean { const origin = clean(request.headers.get("origin")); return !origin || ALLOWED_ORIGINS.includes(origin); }

function corsHeaders(request: Request): HeadersInit {
  const origin = clean(request.headers.get("origin"));
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "http://localhost:5173";
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
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
    },
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

function requestId(): string { return crypto.randomUUID(); }
function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const value = clean(request.headers.get("idempotency-key")) || clean(payload?.idempotency_key);
  return isUuid(value) ? value.toLowerCase() : null;
}
function normalizePathname(url: URL): string {
  const marker = "/pci-creator-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}
function objectValue(value: unknown): JsonRecord | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null; }

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function encryptPaymentIdentifier(value: string): Promise<string> {
  if (!PCI_PAYMENT_DATA_KEY) throw new Error("pci_payment_crypto_not_configured");
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PCI_PAYMENT_DATA_KEY));
  const key = await crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

function identifierLast4(value: string): string | null {
  const normalized = value.replace(/\s+/g, "");
  return normalized ? normalized.slice(-4) : null;
}

async function rpc(admin: SupabaseAdmin, name: string, args: JsonRecord) {
  const { data, error } = await admin.schema("pci_api").rpc(name, args);
  return { data, error: error ? { message: error.message, code: error.code } : null };
}

function rpcErrorCode(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_creator_not_linked", "pci_creator_not_active", "pci_creator_workspace_access_denied",
    "pci_consignment_not_found", "pci_consignment_not_open", "pci_consignment_invitation_required", "pci_consignment_invitation_not_pending", "pci_decline_consignment_invitation_context_required", "pci_active_participation_required",
    "pci_submission_not_found", "pci_submission_limit_reached", "pci_submission_version_not_found", "pci_submission_version_not_allowed", "pci_version_limit_reached",
    "pci_video_mime_not_allowed", "pci_video_size_invalid", "pci_sha256_invalid", "pci_storage_object_not_verified", "pci_submission_version_mime_mismatch", "pci_submission_version_not_finalizable", "pci_submission_version_not_invalidatable", "pci_invalidation_reason_invalid", "pci_ready_submission_version_immutable",
    "pci_negotiation_message_context_required", "pci_negotiation_message_invalid", "pci_negotiation_not_found", "pci_negotiation_not_open",
    "pci_offer_context_required", "pci_offer_not_found", "pci_creator_can_only_reject_workspace_offer", "pci_creator_can_only_accept_workspace_offer", "pci_offer_not_live", "pci_offer_expired", "pci_offer_purchase_already_exists", "pci_offer_total_mismatch", "pci_offer_submission_invalid", "pci_offer_submission_not_preselected", "pci_offer_version_not_current", "pci_offer_version_not_preselected", "pci_offer_version_not_ready", "pci_offer_rights_clearance_incomplete", "pci_offer_version_hash_invalid", "pci_submission_version_already_acquired",
    "pci_counter_requires_workspace_offer", "pci_offer_amount_invalid", "pci_counter_note_invalid", "pci_offer_item_required", "pci_counter_multi_item_not_supported",
    "pci_rights_declaration_context_required", "pci_rights_declaration_invalid", "pci_rights_declaration_locked_after_grant",
    "pci_payment_account_context_required", "pci_payment_provider_invalid", "pci_payment_account_type_invalid", "pci_payment_holder_name_invalid", "pci_payment_destination_required", "pci_payment_alias_invalid", "pci_payment_identifier_ciphertext_invalid", "pci_payment_identifier_last4_invalid", "pci_payment_account_not_found", "pci_payment_account_not_active",
    "pci_payable_confirmation_context_required", "pci_payable_not_found", "pci_payable_confirmation_not_supported", "pci_payable_not_confirmable", "pci_purchase_not_payable",
    "pci_payout_not_found", "pci_payout_proof_not_available", "pci_command_already_processing", "pci_idempotency_conflict",
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? "pci_operation_failed";
  if (code === "pci_consignment_invitation_not_pending") return { code, status: 409 };
  if (code === "pci_decline_consignment_invitation_context_required") return { code, status: 422 };
  if (["pci_creator_not_linked", "pci_creator_not_active", "pci_creator_workspace_access_denied", "pci_consignment_invitation_required", "pci_active_participation_required"].includes(code)) return { code, status: 403 };
  if (["pci_consignment_not_found", "pci_submission_not_found", "pci_submission_version_not_found", "pci_negotiation_not_found", "pci_offer_not_found", "pci_payment_account_not_found", "pci_payable_not_found", "pci_payout_not_found"].includes(code)) return { code, status: 404 };
  if ([
    "pci_command_already_processing", "pci_idempotency_conflict", "pci_submission_version_not_finalizable", "pci_submission_version_not_invalidatable", "pci_submission_version_not_allowed", "pci_consignment_not_open", "pci_submission_limit_reached", "pci_version_limit_reached", "pci_ready_submission_version_immutable", "pci_negotiation_not_open", "pci_creator_can_only_reject_workspace_offer", "pci_creator_can_only_accept_workspace_offer", "pci_offer_not_live", "pci_offer_expired", "pci_offer_purchase_already_exists", "pci_offer_submission_not_preselected", "pci_offer_version_not_current", "pci_offer_version_not_preselected", "pci_offer_version_not_ready", "pci_offer_rights_clearance_incomplete", "pci_submission_version_already_acquired", "pci_counter_requires_workspace_offer", "pci_offer_item_required", "pci_counter_multi_item_not_supported", "pci_rights_declaration_locked_after_grant", "pci_payment_account_not_active", "pci_payable_confirmation_not_supported", "pci_payable_not_confirmable", "pci_purchase_not_payable", "pci_payout_proof_not_available",
  ].includes(code)) return { code, status: 409 };
  if ([
    "pci_video_mime_not_allowed", "pci_video_size_invalid", "pci_sha256_invalid", "pci_submission_version_mime_mismatch", "pci_storage_object_not_verified", "pci_invalidation_reason_invalid", "pci_negotiation_message_invalid", "pci_offer_amount_invalid", "pci_counter_note_invalid", "pci_rights_declaration_invalid", "pci_offer_total_mismatch", "pci_offer_submission_invalid", "pci_offer_version_hash_invalid", "pci_payment_provider_invalid", "pci_payment_account_type_invalid", "pci_payment_holder_name_invalid", "pci_payment_destination_required", "pci_payment_alias_invalid", "pci_payment_identifier_ciphertext_invalid", "pci_payment_identifier_last4_invalid",
  ].includes(code)) return { code, status: 422 };
  return { code, status: 400 };
}

async function rpcJson(request: Request, admin: SupabaseAdmin, name: string, args: JsonRecord, reqId: string, successStatus = 200): Promise<Response> {
  const result = await rpc(admin, name, args);
  if (result.error) {
    const mapped = rpcErrorCode(result.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }
  return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId }, successStatus);
}

async function createUploadReservation(request: Request, admin: SupabaseAdmin, userId: string, submissionId: string, payload: JsonRecord): Promise<Response> {
  const unexpected = rejectUnexpected(payload, ["original_filename", "mime_type", "idempotency_key"]);
  if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected }, 400);
  const originalFilename = clean(payload.original_filename), mimeType = clean(payload.mime_type).toLowerCase(), idem = idempotencyKey(request, payload), reqId = requestId();
  if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
  if (!originalFilename || originalFilename.length > 255) return json(request, { ok: false, code: "invalid_original_filename", request_id: reqId }, 400);
  if (!["video/mp4", "video/quicktime"].includes(mimeType)) return json(request, { ok: false, code: "pci_video_mime_not_allowed", request_id: reqId }, 422);
  const command = await rpc(admin, "reserve_submission_version", { p_actor_user_id: userId, p_submission_id: submissionId, p_idempotency_key: idem, p_request_id: reqId, p_original_filename: originalFilename, p_mime_type: mimeType });
  if (command.error) {
    const mapped = rpcErrorCode(command.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }
  const result = (command.data ?? {}) as JsonRecord, bucket = clean(result.storage_bucket), path = clean(result.storage_path);
  if (bucket !== "pci-submissions" || !path || !DIRECT_STORAGE_TUS_ENDPOINT) return json(request, { ok: false, code: "upload_context_unavailable", request_id: reqId }, 500);
  const { data: signed, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !signed?.token) return json(request, { ok: false, code: "signed_upload_token_failed", request_id: reqId }, 500);
  return json(request, { ...result, request_id: reqId, upload: { protocol: "tus", endpoint: DIRECT_STORAGE_TUS_ENDPOINT, bucket_name: bucket, object_name: path, content_type: mimeType, signature_token: signed.token, signature_header: "x-signature", chunk_size_bytes: 6 * 1024 * 1024, upsert: false, signed_token_ttl_seconds: 7200 } });
}

async function verifyStorageObject(admin: SupabaseAdmin, bucket: string, path: string): Promise<{ exists: boolean; size: number | null; mimeType: string | null; objectId: string | null }> {
  const slash = path.lastIndexOf("/"), folder = slash >= 0 ? path.slice(0, slash) : "", filename = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, search: filename });
  if (error) throw new Error(`storage_list_failed:${error.message}`);
  const object = (data ?? []).find((entry) => entry.name === filename);
  if (!object) return { exists: false, size: null, mimeType: null, objectId: null };
  const metadata = (object.metadata ?? {}) as JsonRecord, rawSize = metadata.size;
  const size = typeof rawSize === "number" ? rawSize : Number.isFinite(Number(rawSize)) ? Number(rawSize) : null;
  const mimeType = clean(metadata.mimetype || metadata.contentType || metadata.content_type).toLowerCase() || null;
  return { exists: true, size, mimeType, objectId: clean(object.id) || null };
}

async function persistInvalidVersion(admin: SupabaseAdmin, userId: string, versionId: string, idem: string, reqId: string, reasonCode: "file_too_large" | "mime_mismatch" | "invalid_media" | "storage_metadata_invalid", validation: JsonRecord): Promise<void> {
  const result = await rpc(admin, "invalidate_submission_version", { p_actor_user_id: userId, p_submission_version_id: versionId, p_idempotency_key: idem, p_request_id: reqId, p_reason_code: reasonCode, p_validation_metadata: validation });
  if (result.error) console.error("[PCI Creator API] failed to persist invalid version", { reqId, versionId, reasonCode, message: result.error.message });
}

async function finalizeVersion(request: Request, admin: SupabaseAdmin, userId: string, versionId: string, payload: JsonRecord): Promise<Response> {
  const unexpected = rejectUnexpected(payload, ["sha256", "duration_seconds", "width", "height", "idempotency_key"]);
  if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected }, 400);
  const reqId = requestId(), idem = idempotencyKey(request, payload), sha256 = clean(payload.sha256).toLowerCase();
  if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
  if (!isSha256(sha256)) return json(request, { ok: false, code: "pci_sha256_invalid", request_id: reqId }, 422);
  const context = await rpc(admin, "creator_version_upload_context", { p_actor_user_id: userId, p_submission_version_id: versionId });
  if (context.error) {
    const mapped = rpcErrorCode(context.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }
  const uploadContext = (context.data ?? {}) as JsonRecord, bucket = clean(uploadContext.storage_bucket), path = clean(uploadContext.storage_path), expectedMime = clean(uploadContext.mime_type).toLowerCase();
  if (bucket !== "pci-submissions" || !path) return json(request, { ok: false, code: "upload_context_unavailable", request_id: reqId }, 409);
  let stored: { exists: boolean; size: number | null; mimeType: string | null; objectId: string | null };
  try { stored = await verifyStorageObject(admin, bucket, path); }
  catch (error) {
    console.error("[PCI Creator API] storage verification failed", { reqId, message: error instanceof Error ? error.message : String(error) });
    return json(request, { ok: false, code: "storage_verification_failed", request_id: reqId }, 503);
  }
  if (!stored.exists) return json(request, { ok: false, code: "storage_object_not_found", request_id: reqId }, 409);
  const validation: JsonRecord = { object_exists: true, verified_by: "pci-creator-api", storage_object_id: stored.objectId, storage_size_bytes: stored.size, storage_mime_type: stored.mimeType, storage_checked_at: new Date().toISOString() };
  if (!stored.size || stored.size <= 0) {
    await persistInvalidVersion(admin, userId, versionId, idem, reqId, "storage_metadata_invalid", validation);
    return json(request, { ok: false, code: "storage_object_size_unavailable", version_status: "invalid", request_id: reqId }, 422);
  }
  if (stored.size > 262144000) {
    await persistInvalidVersion(admin, userId, versionId, idem, reqId, "file_too_large", validation);
    return json(request, { ok: false, code: "pci_video_size_invalid", version_status: "invalid", request_id: reqId }, 422);
  }
  if (stored.mimeType && stored.mimeType !== expectedMime) {
    await persistInvalidVersion(admin, userId, versionId, idem, reqId, "mime_mismatch", validation);
    return json(request, { ok: false, code: "pci_submission_version_mime_mismatch", version_status: "invalid", request_id: reqId }, 422);
  }
  const duration = payload.duration_seconds == null ? null : Number(payload.duration_seconds), width = payload.width == null ? null : Number(payload.width), height = payload.height == null ? null : Number(payload.height);
  return rpcJson(request, admin, "finalize_submission_version", { p_actor_user_id: userId, p_submission_version_id: versionId, p_idempotency_key: idem, p_request_id: reqId, p_file_size_bytes: stored.size, p_mime_type: expectedMime, p_sha256: sha256, p_duration_seconds: Number.isFinite(duration as number) ? duration : null, p_width: Number.isInteger(width) ? width : null, p_height: Number.isInteger(height) ? height : null, p_storage_validation: validation }, reqId);
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
  if (!user) return json(request, { ok: false, code: "unauthorized", message: "Se requiere una sesión válida de Protocol Creative Insights." }, 401);
  const path = normalizePathname(new URL(request.url));

  const simpleReads: Record<string, string> = {
    "/v1/opportunities": "creator_opportunities",
    "/v1/submissions": "creator_submissions",
    "/v1/negotiations": "creator_negotiations",
    "/v1/payment-accounts": "creator_payment_accounts",
    "/v1/payables": "creator_payables",
    "/v1/purchases": "creator_purchases",
    "/v1/payouts": "creator_payouts",
  };
  if (request.method === "GET" && simpleReads[path]) {
    const reqId = requestId();
    return rpcJson(request, admin, simpleReads[path], { p_actor_user_id: user.id }, reqId);
  }

  let match = path.match(/^\/v1\/submissions\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(), id = match[1].toLowerCase();
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_submission_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "creator_submission_detail", { p_actor_user_id: user.id, p_submission_id: id }, reqId);
  }

  match = path.match(/^\/v1\/negotiations\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(), id = match[1].toLowerCase();
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_negotiation_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "creator_negotiation_detail", { p_actor_user_id: user.id, p_negotiation_id: id }, reqId);
  }

  match = path.match(/^\/v1\/payouts\/([0-9a-f-]+)\/proof$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase();
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_payout_id", request_id: reqId }, 400);
    const context = await rpc(admin, "creator_payout_proof_context", { p_actor_user_id: user.id, p_payout_id: id });
    if (context.error) {
      const mapped = rpcErrorCode(context.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    const value = (context.data ?? {}) as JsonRecord, bucket = clean(value.storage_bucket), storagePath = clean(value.storage_path);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 600);
    if (error || !data?.signedUrl) return json(request, { ok: false, code: "payout_proof_url_failed", request_id: reqId }, 500);
    return json(request, { ok: true, request_id: reqId, payout_id: value.payout_id, payout_status: value.status, signed_url: data.signedUrl, expires_in_seconds: 600 });
  }

  match = path.match(/^\/v1\/consignments\/([0-9a-f-]+)\/join$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_consignment_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "join_consignment", { p_actor_user_id: user.id, p_consignment_id: id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/consignments\/([0-9a-f-]+)\/decline$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_consignment_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "decline_consignment_invitation", { p_actor_user_id: user.id, p_consignment_id: id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  if (request.method === "POST" && path === "/v1/submissions") {
    const reqId = requestId(), payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["consignment_id", "concept_label", "concept_metadata", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const id = clean(payload.consignment_id).toLowerCase(), idem = idempotencyKey(request, payload), metadata = objectValue(payload.concept_metadata) ?? {};
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_consignment_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "create_submission", { p_actor_user_id: user.id, p_consignment_id: id, p_idempotency_key: idem, p_request_id: reqId, p_concept_label: clean(payload.concept_label) || null, p_concept_metadata: metadata }, reqId, 201);
  }

  if (request.method === "POST" && path === "/v1/payment-accounts") {
    const reqId = requestId(), payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["provider", "account_type", "holder_name", "holder_document_masked", "alias", "account_identifier", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), provider = clean(payload.provider).toLowerCase(), accountType = clean(payload.account_type).toLowerCase() || "transfer", holderName = clean(payload.holder_name), holderDocumentMasked = clean(payload.holder_document_masked), alias = clean(payload.alias), identifier = clean(payload.account_identifier);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!provider || provider.length > 80 || !/^[a-z0-9_:-]+$/.test(provider)) return json(request, { ok: false, code: "pci_payment_provider_invalid", request_id: reqId }, 422);
    if (!accountType || accountType.length > 80 || !/^[a-z0-9_:-]+$/.test(accountType)) return json(request, { ok: false, code: "pci_payment_account_type_invalid", request_id: reqId }, 422);
    if (!holderName || holderName.length > 200) return json(request, { ok: false, code: "pci_payment_holder_name_invalid", request_id: reqId }, 422);
    if (!alias && !identifier) return json(request, { ok: false, code: "pci_payment_destination_required", request_id: reqId }, 422);
    if (alias.length > 160 || identifier.length > 256 || holderDocumentMasked.length > 80) return json(request, { ok: false, code: "invalid_payment_account_payload", request_id: reqId }, 400);
    let ciphertext: string | null = null;
    try { ciphertext = identifier ? await encryptPaymentIdentifier(identifier) : null; }
    catch (error) {
      console.error("[PCI Creator API] payment encryption unavailable", { reqId, message: error instanceof Error ? error.message : String(error) });
      return json(request, { ok: false, code: "payment_crypto_unavailable", request_id: reqId }, 503);
    }
    return rpcJson(request, admin, "creator_create_payment_account", { p_actor_user_id: user.id, p_provider: provider, p_account_type: accountType, p_holder_name: holderName, p_holder_document_masked: holderDocumentMasked || null, p_alias: alias || null, p_account_identifier_ciphertext: ciphertext, p_account_identifier_last4: identifierLast4(identifier), p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/payment-accounts\/([0-9a-f-]+)\/deactivate$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_payment_account_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "creator_deactivate_payment_account", { p_actor_user_id: user.id, p_payment_account_id: id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/payables\/([0-9a-f-]+)\/confirm-payment-account$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), payableId = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(payableId)) return json(request, { ok: false, code: "invalid_payable_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["payment_account_id", "idempotency_key"]), accountId = clean(payload.payment_account_id).toLowerCase(), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!isUuid(accountId)) return json(request, { ok: false, code: "invalid_payment_account_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "creator_confirm_payable_payment_account", { p_actor_user_id: user.id, p_payable_id: payableId, p_payment_account_id: accountId, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/submissions\/([0-9a-f-]+)\/versions$/i);
  if (request.method === "POST" && match) {
    const id = match[1].toLowerCase();
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_submission_id" }, 400);
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json" }, 400);
    return createUploadReservation(request, admin, user.id, id, payload);
  }

  match = path.match(/^\/v1\/versions\/([0-9a-f-]+)\/finalize$/i);
  if (request.method === "POST" && match) {
    const id = match[1].toLowerCase();
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_submission_version_id" }, 400);
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json" }, 400);
    return finalizeVersion(request, admin, user.id, id, payload);
  }

  match = path.match(/^\/v1\/versions\/([0-9a-f-]+)\/rights-declaration$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_submission_version_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["declaration", "idempotency_key"]), idem = idempotencyKey(request, payload), declaration = objectValue(payload.declaration);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!declaration || Object.keys(declaration).length === 0) return json(request, { ok: false, code: "pci_rights_declaration_invalid", request_id: reqId }, 422);
    return rpcJson(request, admin, "creator_submit_rights_declaration", { p_actor_user_id: user.id, p_submission_version_id: id, p_declaration: declaration, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/negotiations\/([0-9a-f-]+)\/messages$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_negotiation_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["body", "idempotency_key"]), body = clean(payload.body), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!body || body.length > 5000) return json(request, { ok: false, code: "invalid_message", request_id: reqId }, 400);
    return rpcJson(request, admin, "creator_send_negotiation_message", { p_actor_user_id: user.id, p_negotiation_id: id, p_body: body, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/offers\/([0-9a-f-]+)\/(accept|reject|counter)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), id = match[1].toLowerCase(), action = match[2].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(id)) return json(request, { ok: false, code: "invalid_offer_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const allowed = action === "counter" ? ["total_amount", "counter_note", "idempotency_key"] : ["idempotency_key"], unexpected = rejectUnexpected(payload, allowed), idem = idempotencyKey(request, payload);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (action === "accept") return rpcJson(request, admin, "creator_accept_offer", { p_actor_user_id: user.id, p_offer_id: id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    if (action === "reject") return rpcJson(request, admin, "creator_reject_offer", { p_actor_user_id: user.id, p_offer_id: id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    const amount = Number(payload.total_amount), note = clean(payload.counter_note);
    if (!Number.isFinite(amount) || amount <= 0) return json(request, { ok: false, code: "pci_offer_amount_invalid", request_id: reqId }, 422);
    if (note.length > 2000) return json(request, { ok: false, code: "pci_counter_note_invalid", request_id: reqId }, 422);
    return rpcJson(request, admin, "creator_counter_offer", { p_actor_user_id: user.id, p_parent_offer_id: id, p_total_amount: amount, p_counter_note: note || null, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  return json(request, { ok: false, code: "route_not_found", method: request.method, path }, 404);
});
