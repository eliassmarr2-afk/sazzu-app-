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
    ? origin
    : ALLOWED_ORIGINS[0] ?? "http://localhost:5500";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function normalizePathname(url: URL): string {
  const marker = "/pci-admin-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  const value = url.pathname.slice(index + marker.length);
  return value || "/";
}

function requestId(): string {
  return crypto.randomUUID();
}

async function rpc(
  admin: SupabaseAdmin,
  functionName: string,
  args: JsonRecord,
): Promise<{ data: unknown; error: { message?: string; code?: string } | null }> {
  const { data, error } = await admin.schema("pci_api").rpc(functionName, args);
  return { data, error };
}

function rpcErrorCode(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_operator_context_required",
    "pci_workspace_access_denied",
    "pci_submission_not_found",
    "pci_submission_version_not_found",
    "pci_submission_version_not_ready",
    "pci_submission_version_storage_invalid",
  ];
  const code = known.find((item) => message.includes(item)) ?? "pci_operation_failed";

  if (["pci_operator_context_required", "pci_workspace_access_denied"].includes(code)) {
    return { code, status: 403 };
  }
  if (["pci_submission_not_found", "pci_submission_version_not_found"].includes(code)) {
    return { code, status: 404 };
  }
  if (["pci_submission_version_not_ready", "pci_submission_version_storage_invalid"].includes(code)) {
    return { code, status: 409 };
  }
  return { code, status: 400 };
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
    return json(request, { ok: false, code: "unauthorized", message: "Se requiere una sesión válida de Protocol Data." }, 401);
  }

  const url = new URL(request.url);
  const path = normalizePathname(url);

  const reviewQueueMatch = path.match(/^\/v1\/workspaces\/([^/]+)\/review-queue$/);
  if (request.method === "GET" && reviewQueueMatch) {
    const reqId = requestId();
    const workspaceId = decodeURIComponent(reviewQueueMatch[1]);
    if (!isWorkspaceId(workspaceId)) {
      return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    }

    const result = await rpc(admin, "admin_review_queue", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
    });

    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }

    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  const submissionMatch = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && submissionMatch) {
    const reqId = requestId();
    const workspaceId = decodeURIComponent(submissionMatch[1]);
    const submissionId = submissionMatch[2].toLowerCase();

    if (!isWorkspaceId(workspaceId)) {
      return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    }
    if (!isUuid(submissionId)) {
      return json(request, { ok: false, code: "invalid_submission_id", request_id: reqId }, 400);
    }

    const result = await rpc(admin, "admin_submission_detail", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_submission_id: submissionId,
    });

    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }

    return json(request, { ...((result.data ?? {}) as JsonRecord), request_id: reqId });
  }

  const playbackMatch = path.match(/^\/v1\/workspaces\/([^/]+)\/versions\/([0-9a-f-]+)\/playback$/i);
  if (request.method === "POST" && playbackMatch) {
    const reqId = requestId();
    const workspaceId = decodeURIComponent(playbackMatch[1]);
    const versionId = playbackMatch[2].toLowerCase();

    if (!isWorkspaceId(workspaceId)) {
      return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    }
    if (!isUuid(versionId)) {
      return json(request, { ok: false, code: "invalid_submission_version_id", request_id: reqId }, 400);
    }

    const context = await rpc(admin, "admin_version_playback_context", {
      p_actor_user_id: user.id,
      p_workspace_id: workspaceId,
      p_submission_version_id: versionId,
    });

    if (context.error) {
      const mapped = rpcErrorCode(context.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }

    const value = (context.data ?? {}) as JsonRecord;
    const bucket = clean(value.storage_bucket);
    const storagePath = clean(value.storage_path);

    if (bucket !== "pci-submissions" || !storagePath) {
      return json(request, { ok: false, code: "playback_context_unavailable", request_id: reqId }, 409);
    }

    const { data: signedUrl, error: signedError } = await admin.storage
      .from(bucket)
      .createSignedUrl(storagePath, 600);

    if (signedError || !signedUrl?.signedUrl) {
      console.error("[PCI Admin API] playback URL failed", { reqId, message: signedError?.message });
      return json(request, { ok: false, code: "playback_url_failed", request_id: reqId }, 500);
    }

    return json(request, {
      ok: true,
      request_id: reqId,
      submission_id: value.submission_id,
      submission_version_id: value.submission_version_id,
      version_number: value.version_number,
      mime_type: value.mime_type,
      original_filename: value.original_filename,
      file_size_bytes: value.file_size_bytes,
      duration_seconds: value.duration_seconds,
      width: value.width,
      height: value.height,
      sha256: value.sha256,
      playback: {
        signed_url: signedUrl.signedUrl,
        expires_in_seconds: 600,
      },
    });
  }

  return json(request, {
    ok: false,
    code: "route_not_found",
    method: request.method,
    path,
  }, 404);
});
