import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PCI_CREATOR_APP_URL = Deno.env.get("PCI_CREATOR_APP_URL") ?? "";
const PCI_INVITATION_TOKEN_KEY = Deno.env.get("PCI_INVITATION_TOKEN_KEY") ?? "";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];
const ENV_ALLOWED_ORIGINS = (Deno.env.get("PCI_ONBOARDING_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]));

function clean(value: unknown): string { return String(value ?? "").trim(); }
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isSha256(value: string): boolean { return /^[0-9a-f]{64}$/i.test(value); }
function isWorkspaceId(value: string): boolean { return Boolean(value && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)); }
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

async function requireUser(request: Request, admin: SupabaseAdmin): Promise<{ id: string; email: string } | null> {
  const match = clean(request.headers.get("authorization")).match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const { data, error } = await admin.auth.getUser(clean(match[1]));
  const id = clean(data?.user?.id), email = clean(data?.user?.email).toLowerCase();
  if (error || !id || !email) return null;
  return { id, email };
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
  const marker = "/pci-onboarding-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""); }

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function deriveInvitationToken(workspaceId: string, email: string, idem: string): Promise<string> {
  if (!PCI_INVITATION_TOKEN_KEY) throw new Error("pci_invitation_token_key_not_configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PCI_INVITATION_TOKEN_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = `pci-invitation-v1\n${workspaceId}\n${email}\n${idem}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function creatorRedirectUrl(token: string): string {
  if (!PCI_CREATOR_APP_URL) throw new Error("pci_creator_app_url_not_configured");
  const url = new URL("/auth/accept-invitation", PCI_CREATOR_APP_URL);
  url.searchParams.set("pci_invitation", token);
  return url.toString();
}

async function rpc(admin: SupabaseAdmin, name: string, args: JsonRecord) {
  const { data, error } = await admin.schema("pci_api").rpc(name, args);
  return { data, error: error ? { message: error.message, code: error.code } : null };
}

function mapRpcError(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_workspace_access_denied", "pci_operator_context_required",
    "pci_required_legal_documents_missing", "pci_legal_document_context_required", "pci_legal_document_type_invalid", "pci_legal_document_version_invalid", "pci_legal_document_title_invalid", "pci_legal_document_hash_invalid", "pci_legal_document_content_ref_invalid",
    "pci_creator_invitation_context_required", "pci_creator_invitation_email_invalid", "pci_creator_display_name_invalid", "pci_creator_legal_name_invalid", "pci_creator_invitation_token_hash_invalid", "pci_creator_invitation_expiry_invalid",
    "pci_creator_closed", "pci_creator_suspended", "pci_workspace_creator_closed", "pci_workspace_creator_not_invitable", "pci_workspace_creator_already_active",
    "pci_creator_invitation_not_found", "pci_creator_invitation_not_pending", "pci_creator_invitation_not_revocable", "pci_invitation_delivery_context_invalid",
    "pci_creator_bootstrap_context_invalid", "pci_creator_invitation_expired", "pci_creator_invitation_email_mismatch", "pci_creator_invitation_user_mismatch", "pci_creator_auth_already_linked_elsewhere", "pci_creator_invitation_relationship_invalid", "pci_creator_invitation_relationship_not_invited",
    "pci_legal_acceptance_context_invalid", "pci_registration_legal_acceptance_context_invalid", "pci_creator_not_linked", "pci_creator_not_activatable", "pci_workspace_creator_not_found", "pci_creator_invitation_not_bootstrapped", "pci_legal_document_not_required_by_invitation", "pci_legal_document_not_required_by_registration", "pci_registration_relationship_not_pending", "pci_registration_application_not_approved", "pci_registration_legal_snapshot_missing", "pci_registration_legal_acceptance_conflict", "pci_workspace_creator_activation_requires_onboarding_basis", "pci_workspace_creator_activation_requires_legal_acceptance", "pci_legal_document_hash_mismatch", "pci_legal_document_not_found", "pci_legal_document_snapshot_mismatch",
    "pci_creator_invitation_revocation_context_invalid", "pci_command_already_processing", "pci_idempotency_conflict",
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? "pci_onboarding_operation_failed";
  if (["pci_workspace_access_denied", "pci_operator_context_required", "pci_creator_invitation_email_mismatch", "pci_creator_invitation_user_mismatch", "pci_creator_auth_already_linked_elsewhere", "pci_creator_not_linked", "pci_creator_not_activatable"].includes(code)) return { code, status: 403 };
  if (["pci_creator_invitation_not_found", "pci_workspace_creator_not_found", "pci_legal_document_not_found"].includes(code)) return { code, status: 404 };
  if ([
    "pci_registration_relationship_not_pending", "pci_registration_application_not_approved", "pci_registration_legal_snapshot_missing", "pci_legal_document_not_required_by_registration", "pci_registration_legal_acceptance_conflict", "pci_workspace_creator_activation_requires_onboarding_basis", "pci_workspace_creator_activation_requires_legal_acceptance",
    "pci_required_legal_documents_missing", "pci_creator_closed", "pci_creator_suspended", "pci_workspace_creator_closed", "pci_workspace_creator_not_invitable", "pci_workspace_creator_already_active", "pci_creator_invitation_not_pending", "pci_creator_invitation_not_revocable", "pci_creator_invitation_expired", "pci_creator_invitation_relationship_invalid", "pci_creator_invitation_relationship_not_invited", "pci_creator_invitation_not_bootstrapped", "pci_legal_document_not_required_by_invitation", "pci_legal_document_hash_mismatch", "pci_legal_document_snapshot_mismatch", "pci_command_already_processing", "pci_idempotency_conflict",
  ].includes(code)) return { code, status: 409 };
  if ([
    "pci_registration_legal_acceptance_context_invalid",
    "pci_legal_document_type_invalid", "pci_legal_document_version_invalid", "pci_legal_document_title_invalid", "pci_legal_document_hash_invalid", "pci_legal_document_content_ref_invalid", "pci_creator_invitation_email_invalid", "pci_creator_display_name_invalid", "pci_creator_legal_name_invalid", "pci_creator_invitation_expiry_invalid",
  ].includes(code)) return { code, status: 422 };
  return { code, status: 400 };
}

async function rpcJson(request: Request, admin: SupabaseAdmin, name: string, args: JsonRecord, reqId: string, successStatus = 200): Promise<Response> {
  const result = await rpc(admin, name, args);
  if (result.error) {
    const mapped = mapRpcError(result.error);
    return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
  }
  return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId }, successStatus);
}

async function markDeliveryFailure(admin: SupabaseAdmin, userId: string, workspaceId: string, invitationId: string, reqId: string, errorCode: string): Promise<void> {
  const result = await rpc(admin, "admin_fail_creator_invitation_delivery", {
    p_actor_user_id: userId,
    p_workspace_id: workspaceId,
    p_invitation_id: invitationId,
    p_error_code: errorCode,
    p_request_id: reqId,
  });
  if (result.error) console.error("[PCI Onboarding] failed to persist delivery failure", { reqId, invitationId, code: result.error.code });
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
  if (!user) return json(request, { ok: false, code: "unauthorized" }, 401);

  const path = normalizePathname(new URL(request.url));
  let match: RegExpMatchArray | null;

  // Creator onboarding state is intentionally available before creator activation.
  if (request.method === "GET" && path === "/v1/creator/state") {
    const reqId = requestId();
    return rpcJson(request, admin, "creator_onboarding_state", { p_actor_user_id: user.id }, reqId);
  }

  if (request.method === "POST" && path === "/v1/creator/bootstrap") {
    const reqId = requestId(), payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["invitation_token", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const token = clean(payload.invitation_token), idem = idempotencyKey(request, payload);
    if (!token || token.length > 512) return json(request, { ok: false, code: "invalid_invitation_token", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const tokenHash = await sha256Hex(token);
    return rpcJson(request, admin, "creator_bootstrap_invitation", {
      p_actor_user_id: user.id,
      p_actor_email: user.email,
      p_token_hash: tokenHash,
      p_idempotency_key: idem,
      p_request_id: reqId,
    }, reqId);
  }

  match = path.match(/^\/v1\/creator\/invitations\/([0-9a-f-]+)\/legal-acceptances$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), invitationId = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(invitationId)) return json(request, { ok: false, code: "invalid_invitation_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["legal_document_id", "document_hash", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const legalDocumentId = clean(payload.legal_document_id).toLowerCase(), documentHash = clean(payload.document_hash).toLowerCase(), idem = idempotencyKey(request, payload);
    if (!isUuid(legalDocumentId)) return json(request, { ok: false, code: "invalid_legal_document_id", request_id: reqId }, 400);
    if (!isSha256(documentHash)) return json(request, { ok: false, code: "invalid_document_hash", request_id: reqId }, 400);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const userAgent = clean(request.headers.get("user-agent")).slice(0, 1000) || null;
    return rpcJson(request, admin, "creator_accept_legal_document", {
      p_actor_user_id: user.id,
      p_invitation_id: invitationId,
      p_legal_document_id: legalDocumentId,
      p_document_hash: documentHash,
      p_accepted_from_ip: null,
      p_accepted_user_agent: userAgent,
      p_idempotency_key: idem,
      p_request_id: reqId,
    }, reqId, 201);
  }

  /* PCI 2.1T.5 · SELF-REGISTRATION LEGAL ACCEPTANCE ROUTE */

  if (
    request.method === "POST" &&
    path === "/v1/creator/registration/legal-acceptances"
  ) {
    const reqId =
      requestId();

    const payload =
      await parseObject(request);

    if (!payload) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_json",
          request_id: reqId,
        },
        400,
      );
    }

    const unexpected =
      rejectUnexpected(
        payload,
        [
          "workspace_id",
          "legal_document_id",
          "document_hash",
          "idempotency_key",
        ],
      );

    if (unexpected.length) {
      return json(
        request,
        {
          ok: false,
          code: "unexpected_fields",
          fields: unexpected,
          request_id: reqId,
        },
        400,
      );
    }

    const workspaceId =
      clean(
        payload.workspace_id
      );

    const legalDocumentId =
      clean(
        payload.legal_document_id
      ).toLowerCase();

    const documentHash =
      clean(
        payload.document_hash
      ).toLowerCase();

    const idem =
      idempotencyKey(
        request,
        payload,
      );

    if (!isWorkspaceId(workspaceId)) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_workspace_id",
          request_id: reqId,
        },
        400,
      );
    }

    if (!isUuid(legalDocumentId)) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_legal_document_id",
          request_id: reqId,
        },
        400,
      );
    }

    if (!isSha256(documentHash)) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_document_hash",
          request_id: reqId,
        },
        400,
      );
    }

    if (!idem) {
      return json(
        request,
        {
          ok: false,
          code: "idempotency_key_required",
          request_id: reqId,
        },
        400,
      );
    }

    const userAgent =
      clean(
        request.headers.get(
          "user-agent"
        )
      ).slice(
        0,
        1000,
      ) || null;

    return rpcJson(
      request,
      admin,
      "creator_accept_registration_legal_document",
      {
        p_actor_user_id:
          user.id,

        p_workspace_id:
          workspaceId,

        p_legal_document_id:
          legalDocumentId,

        p_document_hash:
          documentHash,

        p_accepted_from_ip:
          null,

        p_accepted_user_agent:
          userAgent,

        p_idempotency_key:
          idem,

        p_request_id:
          reqId,
      },
      reqId,
      201,
    );
  }


  match = path.match(/^\/v1\/admin\/workspaces\/([^/]+)\/legal-documents$/);
  if (request.method === "POST" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]), payload = await parseObject(request);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["document_type", "document_version", "title", "document_hash", "content_ref", "required_for_activation", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_publish_creator_legal_document", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_document_type: clean(payload.document_type).toLowerCase(),
      p_document_version: clean(payload.document_version),
      p_title: clean(payload.title),
      p_document_hash: clean(payload.document_hash).toLowerCase(),
      p_content_ref: clean(payload.content_ref),
      p_required_for_activation: payload.required_for_activation !== false,
      p_idempotency_key: idem,
      p_request_id: reqId,
    }, reqId, 201);
  }

  match = path.match(/^\/v1\/admin\/workspaces\/([^/]+)\/invitations$/);
  if (request.method === "GET" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_creator_invitations", { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }

  if (request.method === "POST" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]), payload = await parseObject(request);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["email", "display_name", "legal_name", "expires_in_hours", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const email = clean(payload.email).toLowerCase(), displayName = clean(payload.display_name), legalName = clean(payload.legal_name) || null, idem = idempotencyKey(request, payload);
    const expiresInHours = payload.expires_in_hours == null ? 48 : Number(payload.expires_in_hours);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!email || email.length > 320) return json(request, { ok: false, code: "pci_creator_invitation_email_invalid", request_id: reqId }, 422);
    if (!displayName || displayName.length > 160) return json(request, { ok: false, code: "pci_creator_display_name_invalid", request_id: reqId }, 422);
    if (!Number.isInteger(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) return json(request, { ok: false, code: "pci_creator_invitation_expiry_invalid", request_id: reqId }, 422);

    let token: string;
    try { token = await deriveInvitationToken(workspaceId, email, idem); }
    catch { return json(request, { ok: false, code: "invitation_token_configuration_missing", request_id: reqId }, 503); }
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const prepared = await rpc(admin, "admin_create_creator_invitation", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_email: email,
      p_display_name: displayName,
      p_legal_name: legalName,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
      p_idempotency_key: idem,
      p_request_id: reqId,
    });
    if (prepared.error) {
      const mapped = mapRpcError(prepared.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }

    const invitation = (prepared.data ?? {}) as JsonRecord;
    const invitationId = clean(invitation.invitation_id), creatorId = clean(invitation.creator_id);
    if (!isUuid(invitationId) || !isUuid(creatorId)) return json(request, { ok: false, code: "invitation_prepare_invalid_response", request_id: reqId }, 500);

    const context = await rpc(admin, "admin_creator_invitation_delivery_context", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_invitation_id: invitationId,
    });
    if (context.error) return json(request, { ok: false, code: "invitation_delivery_context_failed", request_id: reqId }, 500);
    const delivery = (context.data ?? {}) as JsonRecord;
    if (clean(delivery.delivery_status) === "sent") {
      return json(request, { ...invitation, delivery_status: "sent", idempotent_replay: true, request_id: reqId }, 200);
    }

    let redirectTo: string;
    try { redirectTo = creatorRedirectUrl(token); }
    catch { return json(request, { ok: false, code: "creator_app_url_configuration_missing", request_id: reqId }, 503); }

    const knownAuthUserId = clean(delivery.auth_user_id);
    let deliveryMethod: "supabase_invite" | "magic_link" = knownAuthUserId ? "magic_link" : "supabase_invite";
    let authUserId: string | null = knownAuthUserId || null;
    let authError: { message?: string } | null = null;

    if (knownAuthUserId) {
      const sent = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
      authError = sent.error;
    } else {
      const sent = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      authError = sent.error;
      authUserId = clean(sent.data?.user?.id) || null;
      if (authError && /already|registered|exists/i.test(clean(authError.message))) {
        const fallback = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
        authError = fallback.error;
        deliveryMethod = "magic_link";
        authUserId = null;
      }
    }

    if (authError) {
      await markDeliveryFailure(admin, user.id, workspaceId, invitationId, reqId, "supabase_auth_email_delivery_failed");
      console.error("[PCI Onboarding] Auth email delivery failed", { reqId, invitationId, deliveryMethod });
      return json(request, { ok: false, code: "invitation_email_delivery_failed", request_id: reqId }, 502);
    }

    const marked = await rpc(admin, "admin_mark_creator_invitation_delivery", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_invitation_id: invitationId,
      p_auth_user_id: authUserId,
      p_delivery_method: deliveryMethod,
      p_request_id: reqId,
    });
    if (marked.error) {
      console.error("[PCI Onboarding] email delivered but delivery metadata failed", { reqId, invitationId, deliveryMethod });
      return json(request, { ...invitation, delivery_status: "sent_unconfirmed_metadata", delivery_method: deliveryMethod, request_id: reqId }, 202);
    }

    return json(request, {
      ...invitation,
      delivery_status: "sent",
      delivery_method: deliveryMethod,
      request_id: reqId,
    }, 201);
  }

  match = path.match(/^\/v1\/admin\/workspaces\/([^/]+)\/invitations\/([0-9a-f-]+)\/revoke$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]), invitationId = match[2].toLowerCase(), payload = await parseObject(request);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    if (!isUuid(invitationId)) return json(request, { ok: false, code: "invalid_invitation_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["reason", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const reason = clean(payload.reason), idem = idempotencyKey(request, payload);
    if (!reason || reason.length > 500) return json(request, { ok: false, code: "invalid_revocation_reason", request_id: reqId }, 422);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_revoke_creator_invitation", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_invitation_id: invitationId,
      p_reason: reason,
      p_idempotency_key: idem,
      p_request_id: reqId,
    }, reqId);
  }

  return json(request, { ok: false, code: "route_not_found", method: request.method, path }, 404);
});
