import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PCI_CREATOR_APP_URL = Deno.env.get("PCI_CREATOR_APP_URL") ?? "";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5503",
  "http://127.0.0.1:5503",
];
const ENV_ALLOWED_ORIGINS = (Deno.env.get("PCI_ONBOARDING_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS]));

function clean(value: unknown): string { return String(value ?? "").trim(); }
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isWorkspaceId(value: string): boolean { return Boolean(value && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value)); }
function requestId(): string { return crypto.randomUUID(); }
function isAllowedOrigin(request: Request): boolean { const origin = clean(request.headers.get("origin")); return !origin || ALLOWED_ORIGINS.includes(origin); }

function corsHeaders(request: Request): HeadersInit {
  const origin = clean(request.headers.get("origin"));
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const value = clean(request.headers.get("idempotency-key")) || clean(payload?.idempotency_key);
  return isUuid(value) ? value.toLowerCase() : null;
}

function normalizePathname(url: URL): string {
  const marker = "/pci-invitation-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function internalInvitationHash(): Promise<string> {
  // Legacy schema requires a token_hash. New flows never expose the preimage;
  // it is random, one-way, and discarded immediately after hashing.
  return sha256Hex(`${crypto.randomUUID()}:${crypto.randomUUID()}`);
}

function creatorRedirectUrl(invitationId: string): string {
  if (!PCI_CREATOR_APP_URL) throw new Error("pci_creator_app_url_not_configured");
  const url = new URL("/auth/accept-invitation/", PCI_CREATOR_APP_URL);
  url.searchParams.set("pci_invitation_id", invitationId);
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
    "pci_required_legal_documents_missing", "pci_creator_invitation_context_required", "pci_creator_invitation_email_invalid", "pci_creator_display_name_invalid", "pci_creator_legal_name_invalid", "pci_creator_invitation_expiry_invalid", "pci_creator_invitation_revocation_context_invalid",
    "pci_creator_closed", "pci_creator_suspended", "pci_workspace_creator_closed", "pci_workspace_creator_not_invitable", "pci_workspace_creator_already_active",
    "pci_creator_invitation_not_found", "pci_creator_invitation_not_pending", "pci_creator_invitation_not_delivered",
    "pci_creator_invitation_revocation_context_invalid", "pci_creator_invitation_not_revocable", "pci_creator_invitation_expired", "pci_creator_invitation_email_mismatch", "pci_creator_invitation_user_mismatch", "pci_creator_auth_already_linked_elsewhere", "pci_creator_invitation_relationship_invalid", "pci_creator_invitation_relationship_not_invited",
    "pci_creator_bootstrap_context_invalid", "pci_command_already_processing", "pci_idempotency_conflict",
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? "pci_invitation_operation_failed";
  if (["pci_workspace_access_denied", "pci_operator_context_required", "pci_creator_invitation_email_mismatch", "pci_creator_invitation_user_mismatch", "pci_creator_auth_already_linked_elsewhere"].includes(code)) return { code, status: 403 };
  if (code === "pci_creator_invitation_not_found") return { code, status: 404 };
  if (["pci_required_legal_documents_missing", "pci_creator_closed", "pci_creator_suspended", "pci_workspace_creator_closed", "pci_workspace_creator_not_invitable", "pci_workspace_creator_already_active", "pci_creator_invitation_not_pending", "pci_creator_invitation_not_delivered", "pci_creator_invitation_expired", "pci_creator_invitation_relationship_invalid", "pci_creator_invitation_relationship_not_invited", "pci_creator_invitation_not_revocable", "pci_command_already_processing", "pci_idempotency_conflict"].includes(code)) return { code, status: 409 };
  if (["pci_creator_invitation_email_invalid", "pci_creator_display_name_invalid", "pci_creator_legal_name_invalid", "pci_creator_invitation_expiry_invalid"].includes(code)) return { code, status: 422 };
  return { code, status: 400 };
}

async function markDeliveryFailure(admin: SupabaseAdmin, userId: string, workspaceId: string, invitationId: string, reqId: string): Promise<void> {
  const result = await rpc(admin, "admin_fail_creator_invitation_delivery", {
    p_actor_user_id: userId,
    p_workspace_id: workspaceId,
    p_invitation_id: invitationId,
    p_error_code: "supabase_auth_email_delivery_failed",
    p_request_id: reqId,
  });
  if (result.error) console.error("[PCI Invitation] failed to persist delivery failure", { reqId, invitationId, code: result.error.code });
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

  match = path.match(/^\/v1\/creator\/invitations\/([0-9a-f-]+)\/bootstrap$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId(), invitationId = match[1].toLowerCase(), payload = await parseObject(request);
    if (!isUuid(invitationId)) return json(request, { ok: false, code: "invalid_invitation_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);

    const result = await rpc(admin, "creator_bootstrap_invitation_identity", {
      p_actor_user_id: user.id,
      p_actor_email: user.email,
      p_invitation_id: invitationId,
      p_idempotency_key: idem,
      p_request_id: reqId,
    });
    if (result.error) {
      const mapped = mapRpcError(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId }, 200);
  }

  // PCI 2.1H.1B.2A · PROTOCOL DATA INVITATIONS
  match = path.match(
    /^\/v1\/admin\/workspaces\/([^/]+)\/invitations\/([0-9a-f-]+)\/revoke$/i
  );

  if (request.method === "POST" && match) {
    const reqId = requestId();
    const workspaceId =
      decodeURIComponent(match[1]);
    const invitationId =
      match[2].toLowerCase();

    if (!isWorkspaceId(workspaceId)) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_workspace_id",
          request_id: reqId
        },
        400
      );
    }

    if (!isUuid(invitationId)) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_invitation_id",
          request_id: reqId
        },
        400
      );
    }

    const payload =
      await parseObject(request);

    if (!payload) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_json",
          request_id: reqId
        },
        400
      );
    }

    const unexpected =
      rejectUnexpected(
        payload,
        [
          "reason",
          "idempotency_key"
        ]
      );

    if (unexpected.length) {
      return json(
        request,
        {
          ok: false,
          code: "unexpected_fields",
          fields: unexpected,
          request_id: reqId
        },
        400
      );
    }

    const reason =
      clean(payload.reason);

    const idem =
      idempotencyKey(
        request,
        payload
      );

    if (!idem) {
      return json(
        request,
        {
          ok: false,
          code: "idempotency_key_required",
          request_id: reqId
        },
        400
      );
    }

    if (
      !reason ||
      reason.length > 500
    ) {
      return json(
        request,
        {
          ok: false,
          code:
            "pci_creator_invitation_revocation_context_invalid",
          request_id: reqId
        },
        422
      );
    }

    const result =
      await rpc(
        admin,
        "admin_revoke_creator_invitation",
        {
          p_actor_user_id:
            user.id,
          p_workspace_id:
            workspaceId,
          p_invitation_id:
            invitationId,
          p_reason:
            reason,
          p_idempotency_key:
            idem,
          p_request_id:
            reqId
        }
      );

    if (result.error) {
      const mapped =
        mapRpcError(
          result.error
        );

      return json(
        request,
        {
          ok: false,
          code: mapped.code,
          request_id: reqId
        },
        mapped.status
      );
    }

    return json(
      request,
      {
        ...(
          (result.data ?? {})
        ),
        request_id: reqId
      },
      200
    );
  }

  match = path.match(/^\/v1\/admin\/workspaces\/([^/]+)\/invitations$/);
  if (request.method === "POST" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]), payload = await parseObject(request);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["email", "display_name", "legal_name", "expires_in_hours", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);

    const email = clean(payload.email).toLowerCase();
    const displayName = clean(payload.display_name);
    const legalName = clean(payload.legal_name) || null;
    const idem = idempotencyKey(request, payload);
    const expiresInHours = payload.expires_in_hours == null ? 48 : Number(payload.expires_in_hours);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!email || email.length > 320) return json(request, { ok: false, code: "pci_creator_invitation_email_invalid", request_id: reqId }, 422);
    if (!displayName || displayName.length > 160) return json(request, { ok: false, code: "pci_creator_display_name_invalid", request_id: reqId }, 422);
    if (!Number.isInteger(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) return json(request, { ok: false, code: "pci_creator_invitation_expiry_invalid", request_id: reqId }, 422);

    const tokenHash = await internalInvitationHash();
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
    const invitationId = clean(invitation.invitation_id);
    const creatorId = clean(invitation.creator_id);
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
    try { redirectTo = creatorRedirectUrl(invitationId); }
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
      await markDeliveryFailure(admin, user.id, workspaceId, invitationId, reqId);
      console.error("[PCI Invitation] Auth email delivery failed", { reqId, invitationId, deliveryMethod });
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
      console.error("[PCI Invitation] email delivered but delivery metadata failed", { reqId, invitationId, deliveryMethod });
      return json(request, { ...invitation, delivery_status: "sent_unconfirmed_metadata", delivery_method: deliveryMethod, request_id: reqId }, 202);
    }

    return json(request, {
      ...invitation,
      delivery_status: "sent",
      delivery_method: deliveryMethod,
      request_id: reqId,
    }, 201);
  }

  return json(request, { ok: false, code: "route_not_found", method: request.method, path }, 404);
});
