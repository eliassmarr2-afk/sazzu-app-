import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PROJECT_REF = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
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

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function isAllowedOrigin(request: Request): boolean {
  const origin = clean(request.headers.get("origin"));
  return !origin || ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(request: Request): HeadersInit {
  const origin = clean(request.headers.get("origin"));
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] ?? "http://localhost:5173";

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
      "Cache-Control": "no-store",
    },
  });
}

function adminClient(): SupabaseAdmin {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("pci_backend_not_configured");
  }

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
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as JsonRecord;
  } catch {
    return null;
  }
}

function rejectUnexpected(payload: JsonRecord, allowed: string[]): string[] {
  const accepted = new Set(allowed);
  return Object.keys(payload).filter((key) => !accepted.has(key));
}

function requestId(): string {
  return crypto.randomUUID();
}

function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const fromHeader = clean(request.headers.get("idempotency-key"));
  const fromBody = clean(payload?.idempotency_key);
  const value = fromHeader || fromBody;
  return isUuid(value) ? value.toLowerCase() : null;
}

function normalizePathname(url: URL): string {
  const marker = "/pci-creator-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  const value = url.pathname.slice(index + marker.length);
  return value || "/";
}

function rpcErrorCode(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_creator_not_linked",
    "pci_creator_not_active",
    "pci_creator_workspace_access_denied",
    "pci_consignment_not_found",
    "pci_consignment_not_open",
    "pci_consignment_invitation_required",
    "pci_active_participation_required",
    "pci_submission_not_found",
    "pci_submission_limit_reached",
    "pci_submission_version_not_found",
    "pci_submission_version_not_allowed",
    "pci_version_limit_reached",
    "pci_video_mime_not_allowed",
    "pci_video_size_invalid",
    "pci_sha256_invalid",
    "pci_storage_object_not_verified",
    "pci_submission_version_mime_mismatch",
    "pci_submission_version_not_finalizable",
    "pci_submission_version_not_invalidatable",
    "pci_invalidation_reason_invalid",
    "pci_ready_submission_version_immutable",
    "pci_command_already_processing",
    "pci_idempotency_conflict",
  ];

  const code = known.find((item) => message.includes(item)) ?? "pci_operation_failed";

  if (["pci_creator_not_linked", "pci_creator_not_active", "pci_creator_workspace_access_denied", "pci_consignment_invitation_required", "pci_active_participation_required"].includes(code)) {
    return { code, status: 403 };
  }
  if (["pci_consignment_not_found", "pci_submission_not_found", "pci_submission_version_not_found"].includes(code)) {
    return { code, status: 404 };
  }
  if (["pci_command_already_processing", "pci_idempotency_conflict", "pci_submission_version_not_finalizable", "pci_submission_version_not_invalidatable", "pci_submission_version_not_allowed", "pci_consignment_not_open", "pci_submission_limit_reached", "pci_version_limit_reached", "pci_ready_submission_version_immutable"].includes(code)) {
    return { code, status: 409 };
  }
  if (["pci_video_mime_not_allowed", "pci_video_size_invalid", "pci_sha256_invalid", "pci_submission_version_mime_mismatch", "pci_storage_object_not_verified", "pci_invalidation_reason_invalid"].includes(code)) {
    return { code, status: 422 };
  }
  return { code, status: 400 };
}

async function rpc(
  admin: SupabaseAdmin,
  functionName: string,
  args: JsonRecord,
): Promise<{ data: unknown; error: { message?: string; code?: string } | null }> {
  const { data, error } = await admin.schema("pci_api").rpc(functionName, args);
  return { data, error };
}

async function createUploadReservation(
  request: Request,
  admin: SupabaseAdmin,
  userId: string,
  submissionId: string,
  payload: JsonRecord,
): Promise<Response> {
  const unexpected = rejectUnexpected(payload, ["original_filename", "mime_type", "idempotency_key"]);
  if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected }, 400);

  const originalFilename = clean(payload.original_filename);
  const mimeType = clean(payload.mime_type).toLowerCase();
  const idem = idempotencyKey(request, payload);
  const reqId = requestId();

  if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
  if (!originalFilename || originalFilename.length > 255) {
    return json(request, { ok: false, code: "invalid_original_filename", request_id: reqId }, 400);
  }
  if (!["video/mp4", "video/quicktime"].includes(mimeType)) {
    return json(request, { ok: false, code: "pci_video_mime_not_allowed", request_id: reqId }, 422);
  }

  const command = await rpc(admin, "reserve_submission_version", {
    p_actor_user_id: userId,
    p_submission_id: submissionId,
    p_idempotency_key: idem,
    p_request_id: reqId,
    p_original_filename: originalFilename,
    p_mime_type: mimeType,
  });

  if (command.error) {
    const mapped = rpcErrorCode(command.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }

  const result = (command.data ?? {}) as JsonRecord;
  const bucket = clean(result.storage_bucket);
  const path = clean(result.storage_path);

  if (bucket !== "pci-submissions" || !path || !DIRECT_STORAGE_TUS_ENDPOINT) {
    console.error("[PCI Creator API] reservation returned invalid storage context", { reqId, bucket, path });
    return json(request, { ok: false, code: "upload_context_unavailable", request_id: reqId }, 500);
  }

  const { data: signed, error: signedError } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (signedError || !signed?.token) {
    console.error("[PCI Creator API] signed upload token creation failed", { reqId, message: signedError?.message });
    return json(request, { ok: false, code: "signed_upload_token_failed", request_id: reqId }, 500);
  }

  return json(request, {
    ...(result as JsonRecord),
    request_id: reqId,
    upload: {
      protocol: "tus",
      endpoint: DIRECT_STORAGE_TUS_ENDPOINT,
      bucket_name: bucket,
      object_name: path,
      content_type: mimeType,
      signature_token: signed.token,
      signature_header: "x-signature",
      chunk_size_bytes: 6 * 1024 * 1024,
      upsert: false,
      signed_token_ttl_seconds: 7200,
    },
  });
}

async function verifyStorageObject(
  admin: SupabaseAdmin,
  bucket: string,
  path: string,
): Promise<{ exists: boolean; size: number | null; mimeType: string | null; objectId: string | null }> {
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const filename = slash >= 0 ? path.slice(slash + 1) : path;

  const { data, error } = await admin.storage.from(bucket).list(folder, {
    limit: 100,
    search: filename,
  });

  if (error) throw new Error(`storage_list_failed:${error.message}`);

  const object = (data ?? []).find((entry) => entry.name === filename);
  if (!object) return { exists: false, size: null, mimeType: null, objectId: null };

  const metadata = (object.metadata ?? {}) as JsonRecord;
  const rawSize = metadata.size;
  const size = typeof rawSize === "number"
    ? rawSize
    : Number.isFinite(Number(rawSize)) ? Number(rawSize) : null;
  const mimeType = clean(metadata.mimetype || metadata.contentType || metadata.content_type).toLowerCase() || null;

  return {
    exists: true,
    size,
    mimeType,
    objectId: clean(object.id) || null,
  };
}

async function persistInvalidVersion(
  admin: SupabaseAdmin,
  userId: string,
  versionId: string,
  idempotencyKeyValue: string,
  reqId: string,
  reasonCode: "file_too_large" | "mime_mismatch" | "invalid_media" | "storage_metadata_invalid",
  validation: JsonRecord,
): Promise<void> {
  const result = await rpc(admin, "invalidate_submission_version", {
    p_actor_user_id: userId,
    p_submission_version_id: versionId,
    p_idempotency_key: idempotencyKeyValue,
    p_request_id: reqId,
    p_reason_code: reasonCode,
    p_validation_metadata: validation,
  });

  if (result.error) {
    console.error("[PCI Creator API] failed to persist invalid version", {
      reqId,
      versionId,
      reasonCode,
      message: result.error.message,
    });
  }
}

async function finalizeVersion(
  request: Request,
  admin: SupabaseAdmin,
  userId: string,
  versionId: string,
  payload: JsonRecord,
): Promise<Response> {
  const unexpected = rejectUnexpected(payload, [
    "sha256", "duration_seconds", "width", "height", "idempotency_key",
  ]);
  if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected }, 400);

  const reqId = requestId();
  const idem = idempotencyKey(request, payload);
  const sha256 = clean(payload.sha256).toLowerCase();

  if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
  if (!isSha256(sha256)) return json(request, { ok: false, code: "pci_sha256_invalid", request_id: reqId }, 422);

  const context = await rpc(admin, "creator_version_upload_context", {
    p_actor_user_id: userId,
    p_submission_version_id: versionId,
  });

  if (context.error) {
    const mapped = rpcErrorCode(context.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }

  const uploadContext = (context.data ?? {}) as JsonRecord;
  const bucket = clean(uploadContext.storage_bucket);
  const path = clean(uploadContext.storage_path);
  const expectedMime = clean(uploadContext.mime_type).toLowerCase();

  if (bucket !== "pci-submissions" || !path) {
    return json(request, { ok: false, code: "upload_context_unavailable", request_id: reqId }, 409);
  }

  let stored: { exists: boolean; size: number | null; mimeType: string | null; objectId: string | null };
  try {
    stored = await verifyStorageObject(admin, bucket, path);
  } catch (error) {
    console.error("[PCI Creator API] storage verification failed", { reqId, message: error instanceof Error ? error.message : String(error) });
    return json(request, { ok: false, code: "storage_verification_failed", request_id: reqId }, 503);
  }

  if (!stored.exists) {
    return json(request, { ok: false, code: "storage_object_not_found", request_id: reqId }, 409);
  }

  const validation: JsonRecord = {
    object_exists: true,
    verified_by: "pci-creator-api",
    storage_object_id: stored.objectId,
    storage_size_bytes: stored.size,
    storage_mime_type: stored.mimeType,
    storage_checked_at: new Date().toISOString(),
  };

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

  const duration = payload.duration_seconds == null ? null : Number(payload.duration_seconds);
  const width = payload.width == null ? null : Number(payload.width);
  const height = payload.height == null ? null : Number(payload.height);

  const command = await rpc(admin, "finalize_submission_version", {
    p_actor_user_id: userId,
    p_submission_version_id: versionId,
    p_idempotency_key: idem,
    p_request_id: reqId,
    p_file_size_bytes: stored.size,
    p_mime_type: expectedMime,
    p_sha256: sha256,
    p_duration_seconds: Number.isFinite(duration as number) ? duration : null,
    p_width: Number.isInteger(width) ? width : null,
    p_height: Number.isInteger(height) ? height : null,
    p_storage_validation: validation,
  });

  if (command.error) {
    const mapped = rpcErrorCode(command.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }

  return json(request, {
    ...((command.data ?? {}) as JsonRecord),
    request_id: reqId,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request)) return new Response("origin_not_allowed", { status: 403 });
    return new Response("ok", { headers: corsHeaders(request) });
  }

  if (!isAllowedOrigin(request)) return json(request, { ok: false, code: "origin_not_allowed" }, 403);

  let admin: SupabaseAdmin;
  try {
    admin = adminClient();
  } catch {
    return json(request, { ok: false, code: "backend_not_configured" }, 503);
  }

  const user = await requireUser(request, admin);
  if (!user) {
    return json(request, { ok: false, code: "unauthorized", message: "Se requiere una sesión válida de Protocol Creative Insights." }, 401);
  }

  const url = new URL(request.url);
  const path = normalizePathname(url);

  if (request.method === "GET" && path === "/v1/opportunities") {
    const reqId = requestId();
    const result = await rpc(admin, "creator_opportunities", { p_actor_user_id: user.id });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  if (request.method === "GET" && path === "/v1/submissions") {
    const reqId = requestId();
    const result = await rpc(admin, "creator_submissions", { p_actor_user_id: user.id });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  const submissionDetailMatch = path.match(/^\/v1\/submissions\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && submissionDetailMatch) {
    const reqId = requestId();
    const submissionId = submissionDetailMatch[1].toLowerCase();
    if (!isUuid(submissionId)) return json(request, { ok: false, code: "invalid_submission_id", request_id: reqId }, 400);

    const result = await rpc(admin, "creator_submission_detail", {
      p_actor_user_id: user.id,
      p_submission_id: submissionId,
    });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  const joinMatch = path.match(/^\/v1\/consignments\/([0-9a-f-]+)\/join$/i);
  if (request.method === "POST" && joinMatch) {
    const payload = await parseObject(request);
    const reqId = requestId();
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);

    const consignmentId = joinMatch[1].toLowerCase();
    const idem = idempotencyKey(request, payload);
    if (!isUuid(consignmentId)) return json(request, { ok: false, code: "invalid_consignment_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);

    const result = await rpc(admin, "join_consignment", {
      p_actor_user_id: user.id,
      p_consignment_id: consignmentId,
      p_idempotency_key: idem,
      p_request_id: reqId,
    });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  if (request.method === "POST" && path === "/v1/submissions") {
    const payload = await parseObject(request);
    const reqId = requestId();
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["consignment_id", "concept_label", "concept_metadata", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);

    const consignmentId = clean(payload.consignment_id).toLowerCase();
    const idem = idempotencyKey(request, payload);
    if (!isUuid(consignmentId)) return json(request, { ok: false, code: "invalid_consignment_id", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);

    const conceptMetadata = payload.concept_metadata && typeof payload.concept_metadata === "object" && !Array.isArray(payload.concept_metadata)
      ? payload.concept_metadata as JsonRecord
      : {};

    const result = await rpc(admin, "create_submission", {
      p_actor_user_id: user.id,
      p_consignment_id: consignmentId,
      p_idempotency_key: idem,
      p_request_id: reqId,
      p_concept_label: clean(payload.concept_label) || null,
      p_concept_metadata: conceptMetadata,
    });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId }, 201);
  }

  const reserveMatch = path.match(/^\/v1\/submissions\/([0-9a-f-]+)\/versions$/i);
  if (request.method === "POST" && reserveMatch) {
    const submissionId = reserveMatch[1].toLowerCase();
    if (!isUuid(submissionId)) return json(request, { ok: false, code: "invalid_submission_id" }, 400);
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json" }, 400);
    return createUploadReservation(request, admin, user.id, submissionId, payload);
  }

  const finalizeMatch = path.match(/^\/v1\/versions\/([0-9a-f-]+)\/finalize$/i);
  if (request.method === "POST" && finalizeMatch) {
    const versionId = finalizeMatch[1].toLowerCase();
    if (!isUuid(versionId)) return json(request, { ok: false, code: "invalid_submission_version_id" }, 400);
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json" }, 400);
    return finalizeVersion(request, admin, user.id, versionId, payload);
  }

  return json(request, {
    ok: false,
    code: "route_not_found",
    method: request.method,
    path,
  }, 404);
});
