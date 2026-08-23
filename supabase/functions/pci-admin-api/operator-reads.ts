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

const CONSIGNMENT_REVISION_FIELDS = new Set([
  "title",
  "summary",
  "objective",
  "creative_angle",
  "hook_guidance",
  "matching_tags",
  "format_requirements",
  "acceptance_criteria",
  "subject_type",
  "subject_ref",
  "subject_snapshot",
  "base_price_amount",
  "currency",
  "slots_available",
  "performance_bonus_policy",
  "pre_purchase_revision_limit",
  "rights_package_snapshot",
]);

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

function parseOptionalPositiveInteger(value: unknown): number | null | false {
  if (value === null || value === undefined || clean(value) === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : false;
}

function parseDate(value: unknown): string | null | false {
  const raw = clean(value);
  if (!raw) return null;
  const millis = Date.parse(raw);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : false;
}

function objectValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

async function parseObject(request: Request): Promise<JsonRecord | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as JsonRecord
      : null;
  } catch {
    return null;
  }
}

function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const value = clean(request.headers.get("idempotency-key")) || clean(payload?.idempotency_key);
  return isUuid(value) ? value.toLowerCase() : null;
}

function normalizeMatchingTags(value: unknown): string[] | null {
  const rawTags = value ?? [];
  if (
    !Array.isArray(rawTags) ||
    rawTags.length > 20 ||
    rawTags.some(
      (tag) =>
        typeof tag !== "string" ||
        !clean(tag) ||
        clean(tag).length > 60,
    )
  ) {
    return null;
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const rawTag of rawTags) {
    const tag = clean(rawTag);
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
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
    "pci_consignment_not_publishable",
    "pci_consignment_revision_required",
    "pci_consignment_revision_context_required",
    "pci_consignment_revision_not_publishable",
    "pci_consignment_initial_draft_not_editable",
    "pci_consignment_title_required",
    "pci_consignment_matching_tags_invalid",
    "pci_invalid_consignment_visibility",
    "pci_invalid_submission_limit",
    "pci_invalid_version_limit",
    "pci_invalid_consignment_window",
    "pci_command_already_processing",
    "pci_idempotency_conflict",
    "pci_submission_not_found",
    "pci_negotiation_not_found",
    "pci_purchase_not_found",
    "pci_payout_not_found",
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
    "pci_negotiation_not_found",
    "pci_purchase_not_found",
    "pci_payout_not_found",
    "pci_workspace_creator_not_found",
    "pci_creative_asset_not_found",
  ].includes(code)) {
    return { code, status: 404 };
  }
  if ([
    "pci_consignment_not_publishable",
    "pci_consignment_revision_required",
    "pci_consignment_revision_not_publishable",
    "pci_consignment_initial_draft_not_editable",
    "pci_command_already_processing",
    "pci_idempotency_conflict",
    "pci_asset_not_available",
    "pci_asset_rights_not_active",
  ].includes(code)) {
    return { code, status: 409 };
  }
  if ([
    "pci_consignment_revision_context_required",
    "pci_consignment_title_required",
    "pci_consignment_matching_tags_invalid",
    "pci_invalid_consignment_visibility",
    "pci_invalid_submission_limit",
    "pci_invalid_version_limit",
    "pci_invalid_consignment_window",
    "pci_submission_status_invalid",
    "pci_workspace_creator_status_invalid",
    "pci_pagination_invalid",
  ].includes(code)) {
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

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/lifecycle$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(
      respond,
      match[1],
      match[2],
      "invalid_consignment_id",
      requestId,
    );
    if (validated instanceof Response) return validated;

    return rpcResponse(
      respond,
      admin,
      "admin_consignment_lifecycle_context",
      {
        p_actor_user_id: userId,
        p_workspace_id: validated.workspaceId,
        p_consignment_id: validated.id,
      },
      requestId,
    );
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/draft$/i);
  if (request.method === "POST" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(
      respond,
      match[1],
      match[2],
      "invalid_consignment_id",
      requestId,
    );
    if (validated instanceof Response) return validated;

    const payload = await parseObject(request);
    if (!payload) {
      return respond({ ok: false, code: "invalid_json", request_id: requestId }, 400);
    }

    const allowed = new Set([
      "idempotency_key",
      "revision",
      "visibility",
      "max_submissions_per_creator",
      "max_versions_per_submission",
      "opens_at",
      "closes_at",
    ]);
    const unexpected = Object.keys(payload).filter((key) => !allowed.has(key));
    if (unexpected.length) {
      return respond({
        ok: false,
        code: "unexpected_fields",
        fields: unexpected,
        request_id: requestId,
      }, 400);
    }

    const idem = idempotencyKey(request, payload);
    if (!idem) {
      return respond({
        ok: false,
        code: "idempotency_key_required",
        request_id: requestId,
      }, 400);
    }

    const revision = objectValue(payload.revision);
    if (!revision) {
      return respond({
        ok: false,
        code: "pci_consignment_revision_context_required",
        request_id: requestId,
      }, 422);
    }

    const revisionUnexpected = Object.keys(revision).filter(
      (key) => !CONSIGNMENT_REVISION_FIELDS.has(key),
    );
    if (revisionUnexpected.length) {
      return respond({
        ok: false,
        code: "unexpected_revision_fields",
        fields: revisionUnexpected,
        request_id: requestId,
      }, 400);
    }

    if (!clean(revision.title)) {
      return respond({
        ok: false,
        code: "pci_consignment_title_required",
        request_id: requestId,
      }, 422);
    }

    const matchingTags = normalizeMatchingTags(revision.matching_tags);
    if (!matchingTags) {
      return respond({
        ok: false,
        code: "pci_consignment_matching_tags_invalid",
        request_id: requestId,
      }, 422);
    }

    const normalizedRevision: JsonRecord = {
      ...revision,
      matching_tags: matchingTags,
    };

    const visibility = clean(payload.visibility).toLowerCase();
    if (!["open", "invite_only"].includes(visibility)) {
      return respond({
        ok: false,
        code: "pci_invalid_consignment_visibility",
        request_id: requestId,
      }, 422);
    }

    const maxSubmissions = parseOptionalPositiveInteger(payload.max_submissions_per_creator);
    if (maxSubmissions === false) {
      return respond({
        ok: false,
        code: "pci_invalid_submission_limit",
        request_id: requestId,
      }, 422);
    }

    const maxVersions = parseOptionalPositiveInteger(payload.max_versions_per_submission);
    if (maxVersions === false) {
      return respond({
        ok: false,
        code: "pci_invalid_version_limit",
        request_id: requestId,
      }, 422);
    }

    const opensAt = parseDate(payload.opens_at);
    const closesAt = parseDate(payload.closes_at);
    if (opensAt === false || closesAt === false) {
      return respond({
        ok: false,
        code: "pci_invalid_consignment_window",
        request_id: requestId,
      }, 422);
    }
    if (opensAt && closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) {
      return respond({
        ok: false,
        code: "pci_invalid_consignment_window",
        request_id: requestId,
      }, 422);
    }

    return rpcResponse(respond, admin, "admin_update_initial_consignment_draft", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_consignment_id: validated.id,
      p_revision: normalizedRevision,
      p_visibility: visibility,
      p_max_submissions_per_creator: maxSubmissions,
      p_max_versions_per_submission: maxVersions,
      p_opens_at: opensAt,
      p_closes_at: closesAt,
      p_idempotency_key: idem,
      p_request_id: requestId,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/publish$/i);
  if (request.method === "POST" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(
      respond,
      match[1],
      match[2],
      "invalid_consignment_id",
      requestId,
    );
    if (validated instanceof Response) return validated;

    const payload = await parseObject(request);
    if (!payload) {
      return respond({ ok: false, code: "invalid_json", request_id: requestId }, 400);
    }

    const unexpected = Object.keys(payload).filter((key) => key !== "idempotency_key");
    if (unexpected.length) {
      return respond({
        ok: false,
        code: "unexpected_fields",
        fields: unexpected,
        request_id: requestId,
      }, 400);
    }

    const idem = idempotencyKey(request, payload);
    if (!idem) {
      return respond({
        ok: false,
        code: "idempotency_key_required",
        request_id: requestId,
      }, 400);
    }

    return rpcResponse(respond, admin, "publish_consignment", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_consignment_id: validated.id,
      p_idempotency_key: idem,
      p_request_id: requestId,
    }, requestId);
  }

  match = path.match(
    /^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)\/publish$/i,
  );
  if (request.method === "POST" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(
      respond,
      match[1],
      match[2],
      "invalid_consignment_id",
      requestId,
    );
    if (validated instanceof Response) return validated;

    const revisionId = match[3].toLowerCase();
    if (!isUuid(revisionId)) {
      return respond({
        ok: false,
        code: "invalid_consignment_revision_id",
        request_id: requestId,
      }, 400);
    }

    const payload = await parseObject(request);
    if (!payload) {
      return respond({ ok: false, code: "invalid_json", request_id: requestId }, 400);
    }

    const unexpected = Object.keys(payload).filter((key) => key !== "idempotency_key");
    if (unexpected.length) {
      return respond({
        ok: false,
        code: "unexpected_fields",
        fields: unexpected,
        request_id: requestId,
      }, 400);
    }

    const idem = idempotencyKey(request, payload);
    if (!idem) {
      return respond({
        ok: false,
        code: "idempotency_key_required",
        request_id: requestId,
      }, 400);
    }

    return rpcResponse(respond, admin, "admin_publish_consignment_revision", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_consignment_id: validated.id,
      p_consignment_revision_id: revisionId,
      p_idempotency_key: idem,
      p_request_id: requestId,
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

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(respond, match[1], requestId);
    if (validated instanceof Response) return validated;

    return rpcResponse(respond, admin, "admin_negotiations", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspaceAndUuid(
      respond,
      match[1],
      match[2],
      "invalid_negotiation_id",
      requestId,
    );
    if (validated instanceof Response) return validated;

    return rpcResponse(respond, admin, "admin_negotiation_detail", {
      p_actor_user_id: userId,
      p_workspace_id: validated.workspaceId,
      p_negotiation_id: validated.id,
    }, requestId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/purchases$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(
      respond,
      match[1],
      requestId,
    );
    if (validated instanceof Response) return validated;

    return rpcResponse(
      respond,
      admin,
      "admin_purchases",
      {
        p_actor_user_id: userId,
        p_workspace_id: validated.workspaceId,
      },
      requestId,
    );
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payables$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(
      respond,
      match[1],
      requestId,
    );
    if (validated instanceof Response) return validated;

    return rpcResponse(
      respond,
      admin,
      "admin_payables",
      {
        p_actor_user_id: userId,
        p_workspace_id: validated.workspaceId,
      },
      requestId,
    );
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payouts$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();
    const validated = validateWorkspace(
      respond,
      match[1],
      requestId,
    );
    if (validated instanceof Response) return validated;

    return rpcResponse(
      respond,
      admin,
      "admin_payouts",
      {
        p_actor_user_id: userId,
        p_workspace_id: validated.workspaceId,
      },
      requestId,
    );
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payouts\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const requestId = crypto.randomUUID();

    const validated =
      validateWorkspaceAndUuid(
        respond,
        match[1],
        match[2],
        "invalid_payout_id",
        requestId,
      );

    if (validated instanceof Response) return validated;

    return rpcResponse(
      respond,
      admin,
      "admin_payout_detail",
      {
        p_actor_user_id: userId,
        p_workspace_id: validated.workspaceId,
        p_payout_id: validated.id,
      },
      requestId,
    );
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
