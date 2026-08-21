import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;
type Respond = (body: JsonRecord, status?: number) => Response;

type HandlerContext = {
  request: Request;
  path: string;
  admin: SupabaseAdmin;
  userId: string;
  respond: Respond;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isWorkspaceId(value: string): boolean {
  return Boolean(value && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value));
}

function parseIntegerParam(value: string | null, fallback: number): number | null {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function rpc(admin: SupabaseAdmin, name: string, args: JsonRecord) {
  const { data, error } = await admin.schema("pci_api").rpc(name, args);
  return { data, error: error ? { message: error.message, code: error.code } : null };
}

function readRpcError(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_operator_context_required",
    "pci_workspace_access_denied",
    "pci_consignment_not_found",
    "pci_submission_not_found",
    "pci_purchase_not_found",
    "pci_workspace_creator_not_found",
    "pci_creative_asset_not_found",
    "pci_asset_not_available",
    "pci_asset_rights_not_active",
    "pci_submission_status_invalid",
    "pci_workspace_creator_status_invalid",
    "pci_pagination_invalid",
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? "pci_read_failed";

  if (["pci_operator_context_required", "pci_workspace_access_denied"].includes(code)) {
    return { code, status: 403 };
  }
  if ([
    "pci_consignment_not_found",
    "pci_submission_not_found",
    "pci_purchase_not_found",
    "pci_workspace_creator_not_found",
    "pci_creative_asset_not_found",
  ].includes(code)) {
    return { code, status: 404 };
  }
  if (["pci_asset_not_available", "pci_asset_rights_not_active"].includes(code)) {
    return { code, status: 409 };
  }
  if (["pci_submission_status_invalid", "pci_workspace_creator_status_invalid", "pci_pagination_invalid"].includes(code)) {
    return { code, status: 422 };
  }
  return { code, status: 400 };
}

async function rpcResponse(
  respond: Respond,
  admin: SupabaseAdmin,
  name: string,
  args: JsonRecord,
  requestId: string,
): Promise<Response> {
  const result = await rpc(admin, name, args);
  if (result.error) {
    const mapped = readRpcError(result.error);
    return respond({ ok: false, code: mapped.code, request_id: requestId }, mapped.status);
  }
  return respond({ ...((result.data ?? {}) as JsonRecord), request_id: requestId });
}

function validateWorkspace(
  respond: Respond,
  workspaceRaw: string,
  requestId: string,
): { workspaceId: string } | Response {
  const workspaceId = decodeURIComponent(workspaceRaw);
  if (!isWorkspaceId(workspaceId)) {
    return respond({ ok: false, code: "invalid_workspace_id", request_id: requestId }, 400);
  }
  return { workspaceId };
}

function validateWorkspaceAndUuid(
  respond: Respond,
  workspaceRaw: string,
  idRaw: string,
  invalidCode: string,
  requestId: string,
): { workspaceId: string; id: string } | Response {
  const workspace = validateWorkspace(respond, workspaceRaw, requestId);
  if (workspace instanceof Response) return workspace;
  const id = idRaw.toLowerCase();
  if (!isUuid(id)) {
    return respond({ ok: false, code: invalidCode, request_id: requestId }, 400);
  }
  return { workspaceId: workspace.workspaceId, id };
}

export async function handleOperatorReadRoute({
  request,
  path,
  admin,
  userId,
  respond,
}: HandlerContext): Promise<Response | null> {
  let match: RegExpMatchArray | null;

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/dashboard$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_dashboard_summary", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_consignments", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(respond, match[1], match[2], "invalid_consignment_id", requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_consignment_detail", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_consignment_id: validated.id,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;

    const url = new URL(request.url);
    const status = clean(url.searchParams.get("status")).toLowerCase() || null;
    const limit = parseIntegerParam(url.searchParams.get("limit"), 100);
    const offset = parseIntegerParam(url.searchParams.get("offset"), 0);
    if (limit === null || offset === null) {
      return respond({ ok: false, code: "pci_pagination_invalid", request_id: requestId }, 422);
    }

    return rpcResponse(respond, admin, "admin_submissions", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/purchases\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(respond, match[1], match[2], "invalid_purchase_id", requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_purchase_detail", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_purchase_id: validated.id,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/library$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_library", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/assets\/([0-9a-f-]+)\/playback$/i);
  if (request.method === "POST" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(respond, match[1], match[2], "invalid_creative_asset_id", requestId);
    if (validated instanceof Response) return validated;

    const context = await rpc(admin, "admin_asset_playback_context", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_creative_asset_id: validated.id,
    });
    if (context.error) {
      const mapped = readRpcError(context.error);
      return respond({ ok: false, code: mapped.code, request_id: requestId }, mapped.status);
    }

    const value = (context.data ?? {}) as JsonRecord;
    const bucket = clean(value.storage_bucket);
    const storagePath = clean(value.storage_path);
    if (bucket !== "pci-assets" || !storagePath) {
      return respond({ ok: false, code: "asset_playback_context_unavailable", request_id: requestId }, 409);
    }

    const { data, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 600);
    if (error || !data?.signedUrl) {
      return respond({ ok: false, code: "asset_playback_url_failed", request_id: requestId }, 500);
    }

    return respond({
      ok: true,
      request_id: requestId,
      creative_asset_id: value.creative_asset_id,
      sha256: value.sha256,
      mime_type: value.mime_type,
      original_filename: value.original_filename,
      file_size_bytes: value.file_size_bytes,
      duration_seconds: value.duration_seconds,
      width: value.width,
      height: value.height,
      playback: {
        signed_url: data.signedUrl,
        expires_in_seconds: 600,
      },
    });
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/creators$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;

    const url = new URL(request.url);
    const status = clean(url.searchParams.get("status")).toLowerCase() || null;
    const limit = parseIntegerParam(url.searchParams.get("limit"), 100);
    const offset = parseIntegerParam(url.searchParams.get("offset"), 0);
    if (limit === null || offset === null) {
      return respond({ ok: false, code: "pci_pagination_invalid", request_id: requestId }, 422);
    }

    return rpcResponse(respond, admin, "admin_creators", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_relationship_status: status,
      p_limit: limit,
      p_offset: offset,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/creators\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(respond, match[1], match[2], "invalid_creator_id", requestId);
    if (validated instanceof Response) return validated;
    return rpcResponse(respond, admin, "admin_creator_detail", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_creator_id: validated.id,
    }, requestId);
  }

  return null;
}
