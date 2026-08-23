import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleOperatorReadRoute } from "./operator-reads.ts";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PCI_PAYMENT_DATA_KEY = Deno.env.get("PCI_PAYMENT_DATA_KEY") ?? "";

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
  } catch {
    return null;
  }
}

function rejectUnexpected(payload: JsonRecord, allowed: string[]): string[] {
  const accepted = new Set(allowed);
  return Object.keys(payload).filter((key) => !accepted.has(key));
}

function objectValue(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function requestId(): string {
  return crypto.randomUUID();
}

function idempotencyKey(request: Request, payload?: JsonRecord): string | null {
  const value = clean(request.headers.get("idempotency-key")) || clean(payload?.idempotency_key);
  return isUuid(value) ? value.toLowerCase() : null;
}

function normalizePathname(url: URL): string {
  const marker = "/pci-admin-api";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}

function parseDate(value: unknown): string | null | false {
  const raw = clean(value);
  if (!raw) return null;
  const millis = Date.parse(raw);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : false;
}

function parseOptionalPositiveInteger(
  value: unknown,
): number | null | false {
  if (
    value === null ||
    value === undefined ||
    clean(value) === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : false;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decryptPaymentIdentifier(ciphertext: string): Promise<string | null> {
  if (!ciphertext) return null;
  if (!PCI_PAYMENT_DATA_KEY) throw new Error("pci_payment_crypto_not_configured");
  const parts = ciphertext.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("pci_payment_ciphertext_invalid");
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PCI_PAYMENT_DATA_KEY));
  const key = await crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(parts[1]) },
    key,
    base64UrlToBytes(parts[2]),
  );
  return new TextDecoder().decode(decrypted);
}

async function rpc(admin: SupabaseAdmin, name: string, args: JsonRecord) {
  const { data, error } = await admin.schema("pci_api").rpc(name, args);
  return { data, error: error ? { message: error.message, code: error.code } : null };
}

function rpcErrorCode(error: { message?: string; code?: string } | null): { code: string; status: number } {
  const message = clean(error?.message);
  const known = [
    "pci_operator_context_required", "pci_workspace_access_denied",
    "pci_creator_operational_profile_context_required", "pci_workspace_creator_not_found", "pci_creator_provider_tier_invalid", "pci_creator_specialty_tags_invalid", "pci_creator_limit_invalid",
    "pci_consignment_not_found", "pci_consignment_not_publishable", "pci_consignment_revision_required", "pci_consignment_revision_not_publishable", "pci_consignment_revision_context_required", "pci_consignment_revision_not_creatable", "pci_consignment_revision_draft_exists", "pci_consignment_revision_not_editable", "pci_consignment_title_required", "pci_consignment_matching_tags_invalid", "pci_invalid_consignment_visibility", "pci_invalid_submission_limit", "pci_invalid_version_limit", "pci_invalid_consignment_window",
    "pci_submission_not_found", "pci_submission_version_not_found", "pci_submission_version_not_ready", "pci_submission_version_storage_invalid",
    "pci_review_context_required", "pci_submission_not_reviewable", "pci_submission_current_version_required", "pci_submission_current_version_not_ready", "pci_submission_review_decision_not_allowed", "pci_creator_feedback_required", "pci_submission_participation_invalid", "pci_submission_brief_revision_invalid", "pci_pre_purchase_revision_limit_reached", "pci_rejection_reason_invalid", "pci_internal_note_context_required", "pci_internal_note_body_required",
    "pci_negotiation_context_required", "pci_negotiation_not_found", "pci_negotiation_already_open", "pci_negotiation_reopen_required", "pci_negotiation_not_closed", "pci_negotiation_not_open", "pci_negotiation_purchase_exists", "pci_negotiation_close_reason_invalid", "pci_negotiation_message_context_required", "pci_negotiation_message_invalid", "pci_submission_not_preselected",
    "pci_offer_context_required", "pci_offer_not_found", "pci_parent_offer_not_found", "pci_parent_offer_not_live", "pci_offer_amount_invalid", "pci_offer_currency_invalid", "pci_offer_expiry_invalid", "pci_offer_rights_snapshot_required", "pci_offer_payment_terms_required", "pci_rights_clearance_incomplete", "pci_submission_version_hash_required", "pci_live_offer_exists", "pci_another_offer_is_live", "pci_admin_can_only_reject_creator_offer", "pci_admin_can_only_withdraw_workspace_offer", "pci_offer_not_live",
    "pci_rights_clearance_context_required", "pci_rights_clearance_status_invalid", "pci_rights_clearance_reason_required", "pci_rights_declaration_required",
    "pci_payable_not_found", "pci_payable_not_ready_to_pay", "pci_payable_destination_not_confirmed", "pci_payable_destination_confirmation_mismatch", "pci_purchase_not_payable",
    "pci_payout_context_required", "pci_payout_amount_invalid", "pci_payout_provider_invalid", "pci_payout_method_invalid", "pci_payout_reference_required", "pci_payout_transferred_at_invalid", "pci_payout_proof_bucket_invalid", "pci_payout_proof_context_invalid", "pci_payout_proof_path_invalid", "pci_payout_exceeds_remaining_balance", "pci_payout_reference_duplicate",
    "pci_payout_confirmation_context_required", "pci_payout_not_found", "pci_payout_not_confirmable", "pci_payout_allocation_required", "pci_multi_payable_payout_not_supported", "pci_payable_not_processing", "pci_payout_destination_snapshot_mismatch",
    "pci_payout_failure_context_required", "pci_payout_failure_reason_invalid", "pci_payout_not_failable",
    "pci_payout_reversal_context_required", "pci_payout_reversal_reason_invalid", "pci_payout_not_reversible", "pci_payout_reversal_requires_incident_after_rights_activation",
    "pci_payout_proof_not_available", "pci_command_already_processing", "pci_idempotency_conflict",
  ];
  const code = known.find((candidate) => message.includes(candidate)) ?? "pci_operation_failed";

  if (["pci_operator_context_required", "pci_workspace_access_denied"].includes(code)) return { code, status: 403 };
  if (["pci_consignment_not_found", "pci_submission_not_found", "pci_submission_version_not_found", "pci_negotiation_not_found", "pci_offer_not_found", "pci_parent_offer_not_found", "pci_payable_not_found", "pci_payout_not_found", "pci_workspace_creator_not_found"].includes(code)) return { code, status: 404 };
  if ([
    "pci_consignment_not_publishable", "pci_consignment_revision_required", "pci_consignment_revision_not_publishable", "pci_consignment_revision_not_creatable", "pci_consignment_revision_draft_exists", "pci_consignment_revision_not_editable",
    "pci_submission_version_not_ready", "pci_submission_version_storage_invalid", "pci_submission_not_reviewable", "pci_submission_current_version_required", "pci_submission_current_version_not_ready", "pci_submission_review_decision_not_allowed", "pci_pre_purchase_revision_limit_reached",
    "pci_negotiation_already_open", "pci_negotiation_reopen_required", "pci_negotiation_not_closed", "pci_negotiation_not_open", "pci_negotiation_purchase_exists", "pci_submission_not_preselected", "pci_parent_offer_not_live", "pci_live_offer_exists", "pci_another_offer_is_live", "pci_rights_clearance_incomplete", "pci_submission_version_hash_required", "pci_admin_can_only_reject_creator_offer", "pci_admin_can_only_withdraw_workspace_offer", "pci_offer_not_live", "pci_rights_declaration_required",
    "pci_payable_not_ready_to_pay", "pci_payable_destination_not_confirmed", "pci_payable_destination_confirmation_mismatch", "pci_purchase_not_payable", "pci_payout_exceeds_remaining_balance", "pci_payout_reference_duplicate", "pci_payout_not_confirmable", "pci_payout_allocation_required", "pci_multi_payable_payout_not_supported", "pci_payable_not_processing", "pci_payout_destination_snapshot_mismatch", "pci_payout_not_failable", "pci_payout_not_reversible", "pci_payout_reversal_requires_incident_after_rights_activation", "pci_payout_proof_not_available", "pci_command_already_processing", "pci_idempotency_conflict",
  ].includes(code)) return { code, status: 409 };
  if ([
    "pci_creator_provider_tier_invalid", "pci_creator_specialty_tags_invalid", "pci_creator_limit_invalid",
    "pci_consignment_revision_context_required", "pci_consignment_title_required", "pci_consignment_matching_tags_invalid", "pci_invalid_consignment_visibility", "pci_invalid_submission_limit", "pci_invalid_version_limit", "pci_invalid_consignment_window",
    "pci_creator_feedback_required", "pci_submission_participation_invalid", "pci_submission_brief_revision_invalid", "pci_rejection_reason_invalid", "pci_internal_note_body_required", "pci_negotiation_close_reason_invalid", "pci_negotiation_message_invalid", "pci_offer_amount_invalid", "pci_offer_currency_invalid", "pci_offer_expiry_invalid", "pci_offer_rights_snapshot_required", "pci_offer_payment_terms_required", "pci_rights_clearance_status_invalid", "pci_rights_clearance_reason_required",
    "pci_payout_amount_invalid", "pci_payout_provider_invalid", "pci_payout_method_invalid", "pci_payout_reference_required", "pci_payout_transferred_at_invalid", "pci_payout_proof_bucket_invalid", "pci_payout_proof_context_invalid", "pci_payout_proof_path_invalid", "pci_payout_failure_reason_invalid", "pci_payout_reversal_reason_invalid",
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

function validateWorkspaceAndUuid(request: Request, workspaceRaw: string, idRaw: string, invalidCode: string, reqId: string): Response | { workspaceId: string; id: string } {
  const workspaceId = decodeURIComponent(workspaceRaw);
  const id = idRaw.toLowerCase();
  if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
  if (!isUuid(id)) return json(request, { ok: false, code: invalidCode, request_id: reqId }, 400);
  return { workspaceId, id };
}

function validateWorkspaceAndSubmission(request: Request, workspaceRaw: string, submissionRaw: string, reqId: string): Response | { workspaceId: string; submissionId: string } {
  const validated = validateWorkspaceAndUuid(request, workspaceRaw, submissionRaw, "invalid_submission_id", reqId);
  if (validated instanceof Response) return validated;
  return { workspaceId: validated.workspaceId, submissionId: validated.id };
}

async function verifyStorageObject(admin: SupabaseAdmin, bucket: string, path: string): Promise<{ exists: boolean; size: number | null; mimeType: string | null }> {
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const filename = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, search: filename });
  if (error) throw new Error(`storage_list_failed:${error.message}`);
  const object = (data ?? []).find((entry) => entry.name === filename);
  if (!object) return { exists: false, size: null, mimeType: null };
  const metadata = (object.metadata ?? {}) as JsonRecord;
  const rawSize = metadata.size;
  const size = typeof rawSize === "number" ? rawSize : Number.isFinite(Number(rawSize)) ? Number(rawSize) : null;
  const mimeType = clean(metadata.mimetype || metadata.contentType || metadata.content_type).toLowerCase() || null;
  return { exists: true, size, mimeType };
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

  const operatorReadResponse = await handleOperatorReadRoute({
    request,
    path,
    admin,
    userId: user.id,
    respond: (body, status = 200) => json(request, body, status),
  });
  if (operatorReadResponse) return operatorReadResponse;

  let match: RegExpMatchArray | null;

  // Existing Review read models.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/review-queue$/);
  if (request.method === "GET" && match) {
    const reqId = requestId();
    const workspaceId = decodeURIComponent(match[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_review_queue", { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review-context$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndSubmission(request, match[1], match[2], reqId);
    if (validated instanceof Response) return validated;
    return rpcJson(request, admin, "admin_submission_review_context", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_id: validated.submissionId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndSubmission(request, match[1], match[2], reqId);
    if (validated instanceof Response) return validated;
    return rpcJson(request, admin, "admin_submission_detail", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_id: validated.submissionId }, reqId);
  }

  // Creator workspace-scoped operational profile.
  match = path.match(
    /^\/v1\/workspaces\/([^/]+)\/creators\/([0-9a-f-]+)\/operational-profile$/i,
  );

  if (request.method === "POST" && match) {
    const reqId = requestId();

    const validated = validateWorkspaceAndUuid(
      request,
      match[1],
      match[2],
      "invalid_creator_id",
      reqId,
    );

    if (validated instanceof Response) {
      return validated;
    }

    const payload = await parseObject(request);

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

    const unexpected = rejectUnexpected(
      payload,
      [
        "provider_tier",
        "specialty_tags",
        "max_simultaneous_jobs",
        "max_open_obligations",
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

    const requiredFields = [
      "provider_tier",
      "specialty_tags",
      "max_simultaneous_jobs",
      "max_open_obligations",
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        !Object.prototype.hasOwnProperty.call(
          payload,
          field,
        ),
    );

    if (missingFields.length) {
      return json(
        request,
        {
          ok: false,
          code: "missing_fields",
          fields: missingFields,
          request_id: reqId,
        },
        400,
      );
    }

    const idem =
      idempotencyKey(
        request,
        payload,
      );

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

    const providerTier =
      clean(
        payload.provider_tier,
      ).toLowerCase() || null;

    if (
      providerTier !== null &&
      ![
        "approved",
        "preferred",
      ].includes(providerTier)
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_creator_provider_tier_invalid",
          request_id: reqId,
        },
        422,
      );
    }

    if (
      !Array.isArray(
        payload.specialty_tags,
      )
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_creator_specialty_tags_invalid",
          request_id: reqId,
        },
        422,
      );
    }

    const rawTags =
      payload.specialty_tags;

    if (
      rawTags.length > 20 ||
      rawTags.some(
        (value) =>
          typeof value !== "string" ||
          !clean(value) ||
          clean(value).length > 60,
      )
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_creator_specialty_tags_invalid",
          request_id: reqId,
        },
        422,
      );
    }

    const specialtyTags:
      string[] = [];

    const seenTags =
      new Set<string>();

    for (
      const rawTag of rawTags
    ) {
      const tag =
        clean(rawTag);

      const key =
        tag.toLowerCase();

      if (
        seenTags.has(key)
      ) {
        continue;
      }

      seenTags.add(key);
      specialtyTags.push(tag);
    }

    const maxSimultaneousJobs =
      parseOptionalPositiveInteger(
        payload.max_simultaneous_jobs,
      );

    const maxOpenObligations =
      parseOptionalPositiveInteger(
        payload.max_open_obligations,
      );

    if (
      maxSimultaneousJobs === false ||
      maxOpenObligations === false
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_creator_limit_invalid",
          request_id: reqId,
        },
        422,
      );
    }

    return rpcJson(
      request,
      admin,
      "admin_update_creator_operational_profile",
      {
        p_actor_user_id:
          user.id,
        p_workspace_id:
          validated.workspaceId,
        p_creator_id:
          validated.id,
        p_provider_tier:
          providerTier,
        p_specialty_tags:
          specialtyTags,
        p_max_simultaneous_jobs:
          maxSimultaneousJobs,
        p_max_open_obligations:
          maxOpenObligations,
        p_idempotency_key:
          idem,
        p_request_id:
          reqId,
      },
      reqId,
    );
  }

  // Consignment commands.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/consignments$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const workspaceId = decodeURIComponent(match[1]);

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

    const payload = await parseObject(request);

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

    const unexpected = rejectUnexpected(
      payload,
      [
        "revision",
        "visibility",
        "max_submissions_per_creator",
        "max_versions_per_submission",
        "opens_at",
        "closes_at",
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

    const idem = idempotencyKey(request, payload);

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

    const revision = objectValue(payload.revision);

    if (!revision) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_consignment_revision",
          request_id: reqId,
        },
        400,
      );
    }

    const revisionUnexpected = rejectUnexpected(
      revision,
      [
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
      ],
    );

    if (revisionUnexpected.length) {
      return json(
        request,
        {
          ok: false,
          code: "unexpected_revision_fields",
          fields: revisionUnexpected,
          request_id: reqId,
        },
        400,
      );
    }

    if (!clean(revision.title)) {
      return json(
        request,
        {
          ok: false,
          code: "pci_consignment_title_required",
          request_id: reqId,
        },
        422,
      );
    }

    const rawMatchingTags =
      revision.matching_tags ?? [];

    if (
      !Array.isArray(rawMatchingTags) ||
      rawMatchingTags.length > 20 ||
      rawMatchingTags.some(
        (value) =>
          typeof value !== "string" ||
          !clean(value) ||
          clean(value).length > 60,
      )
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_consignment_matching_tags_invalid",
          request_id: reqId,
        },
        422,
      );
    }

    const matchingTags: string[] = [];
    const seenMatchingTags =
      new Set<string>();

    for (const rawTag of rawMatchingTags) {
      const tag = clean(rawTag);
      const key = tag.toLowerCase();

      if (seenMatchingTags.has(key)) {
        continue;
      }

      seenMatchingTags.add(key);
      matchingTags.push(tag);
    }

    const normalizedRevision: JsonRecord = {
      ...revision,
      matching_tags: matchingTags,
    };

    const visibility =
      clean(payload.visibility).toLowerCase() || "open";

    if (!["open", "invite_only"].includes(visibility)) {
      return json(
        request,
        {
          ok: false,
          code: "pci_invalid_consignment_visibility",
          request_id: reqId,
        },
        422,
      );
    }

    const maxSubmissions =
      parseOptionalPositiveInteger(
        payload.max_submissions_per_creator,
      );

    const maxVersions =
      parseOptionalPositiveInteger(
        payload.max_versions_per_submission,
      );

    if (maxSubmissions === false) {
      return json(
        request,
        {
          ok: false,
          code: "pci_invalid_submission_limit",
          request_id: reqId,
        },
        422,
      );
    }

    if (maxVersions === false) {
      return json(
        request,
        {
          ok: false,
          code: "pci_invalid_version_limit",
          request_id: reqId,
        },
        422,
      );
    }

    const opensAt = parseDate(payload.opens_at);
    const closesAt = parseDate(payload.closes_at);

    if (opensAt === false || closesAt === false) {
      return json(
        request,
        {
          ok: false,
          code: "invalid_consignment_datetime",
          request_id: reqId,
        },
        422,
      );
    }

    if (
      opensAt &&
      closesAt &&
      Date.parse(closesAt) <= Date.parse(opensAt)
    ) {
      return json(
        request,
        {
          ok: false,
          code: "pci_invalid_consignment_window",
          request_id: reqId,
        },
        422,
      );
    }

    return rpcJson(
      request,
      admin,
      "create_consignment",
      {
        p_actor_user_id: user.id,
        p_workspace_id: workspaceId,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_revision: normalizedRevision,
        p_visibility: visibility,
        p_max_submissions_per_creator: maxSubmissions,
        p_max_versions_per_submission: maxVersions,
        p_opens_at: opensAt,
        p_closes_at: closesAt,
      },
      reqId,
      201,
    );
  }

  // PCI 2.1I.2B.1C · Consignment revision lifecycle.

  match = path.match(
    /^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/revisions$/i,
  );

  if (request.method === "POST" && match) {
    const reqId = requestId();

    const validated =
      validateWorkspaceAndUuid(
        request,
        match[1],
        match[2],
        "invalid_consignment_id",
        reqId,
      );

    if (validated instanceof Response) {
      return validated;
    }

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

    const idem =
      idempotencyKey(
        request,
        payload,
      );

    if (!idem) {
      return json(
        request,
        {
          ok: false,
          code:
            "idempotency_key_required",
          request_id: reqId,
        },
        400,
      );
    }

    return rpcJson(
      request,
      admin,
      "admin_create_consignment_revision",
      {
        p_actor_user_id:
          user.id,

        p_workspace_id:
          validated.workspaceId,

        p_consignment_id:
          validated.id,

        p_idempotency_key:
          idem,

        p_request_id:
          reqId,
      },
      reqId,
      201,
    );
  }


  match = path.match(
    /^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/revisions\/([0-9a-f-]+)$/i,
  );

  if (request.method === "POST" && match) {
    const reqId = requestId();

    const consignment =
      validateWorkspaceAndUuid(
        request,
        match[1],
        match[2],
        "invalid_consignment_id",
        reqId,
      );

    if (consignment instanceof Response) {
      return consignment;
    }

    const revisionId =
      match[3].toLowerCase();

    if (!isUuid(revisionId)) {
      return json(
        request,
        {
          ok: false,
          code:
            "invalid_consignment_revision_id",
          request_id: reqId,
        },
        400,
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
          request_id: reqId,
        },
        400,
      );
    }

    const unexpected =
      rejectUnexpected(
        payload,
        [
          "revision",
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

    const rawRevision =
      payload.revision;

    if (
      !rawRevision ||
      typeof rawRevision !== "object" ||
      Array.isArray(rawRevision)
    ) {
      return json(
        request,
        {
          ok: false,
          code:
            "invalid_consignment_revision",
          request_id: reqId,
        },
        400,
      );
    }

    const revision =
      rawRevision as JsonRecord;

    const revisionUnexpected =
      rejectUnexpected(
        revision,
        [
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
        ],
      );

    if (revisionUnexpected.length) {
      return json(
        request,
        {
          ok: false,
          code:
            "unexpected_revision_fields",
          fields:
            revisionUnexpected,
          request_id:
            reqId,
        },
        400,
      );
    }

    if (!clean(revision.title)) {
      return json(
        request,
        {
          ok: false,
          code:
            "pci_consignment_title_required",
          request_id:
            reqId,
        },
        422,
      );
    }

    const rawMatchingTags =
      revision.matching_tags ?? [];

    if (
      !Array.isArray(
        rawMatchingTags
      ) ||
      rawMatchingTags.length > 20 ||
      rawMatchingTags.some(
        (value) =>
          typeof value !== "string" ||
          !clean(value) ||
          clean(value).length > 60,
      )
    ) {
      return json(
        request,
        {
          ok: false,
          code:
            "pci_consignment_matching_tags_invalid",
          request_id:
            reqId,
        },
        422,
      );
    }

    const matchingTags:
      string[] = [];

    const seenMatchingTags =
      new Set<string>();

    for (
      const rawTag
      of rawMatchingTags
    ) {
      const tag =
        clean(rawTag);

      const key =
        tag.toLowerCase();

      if (
        seenMatchingTags.has(key)
      ) {
        continue;
      }

      seenMatchingTags.add(key);

      matchingTags.push(tag);
    }

    const normalizedRevision:
      JsonRecord = {
        ...revision,
        matching_tags:
          matchingTags,
      };

    const idem =
      idempotencyKey(
        request,
        payload,
      );

    if (!idem) {
      return json(
        request,
        {
          ok: false,
          code:
            "idempotency_key_required",
          request_id:
            reqId,
        },
        400,
      );
    }

    return rpcJson(
      request,
      admin,
      "admin_update_consignment_revision_draft",
      {
        p_actor_user_id:
          user.id,

        p_workspace_id:
          consignment.workspaceId,

        p_consignment_id:
          consignment.id,

        p_consignment_revision_id:
          revisionId,

        p_revision:
          normalizedRevision,

        p_idempotency_key:
          idem,

        p_request_id:
          reqId,
      },
      reqId,
    );
  }


  match = path.match(
    /^\/v1\/workspaces\/([^/]+)\/consignments\/([0-9a-f-]+)\/publish$/i,
  );

  if (request.method === "POST" && match) {
    const reqId = requestId();

    const validated = validateWorkspaceAndUuid(
      request,
      match[1],
      match[2],
      "invalid_consignment_id",
      reqId,
    );

    if (validated instanceof Response) {
      return validated;
    }

    const payload = await parseObject(request);

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

    const unexpected = rejectUnexpected(
      payload,
      ["idempotency_key"],
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

    const idem = idempotencyKey(request, payload);

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

    return rpcJson(
      request,
      admin,
      "publish_consignment",
      {
        p_actor_user_id: user.id,
        p_workspace_id: validated.workspaceId,
        p_consignment_id: validated.id,
        p_idempotency_key: idem,
        p_request_id: reqId,
      },
      reqId,
    );
  }

  // Review commands.
  const reviewCommands: Array<[RegExp, string, string[]]> = [
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/start$/i, "start_review", []],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/request-changes$/i, "request_changes", ["creator_feedback", "internal_summary"]],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/preselect$/i, "preselect_submission", ["creator_feedback", "internal_summary"]],
    [/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/review\/reject$/i, "reject_submission", ["rejection_reason_code", "creator_feedback", "internal_summary"]],
  ];
  for (const [pattern, command, fields] of reviewCommands) {
    const candidate = path.match(pattern);
    if (request.method !== "POST" || !candidate) continue;
    const reqId = requestId();
    const validated = validateWorkspaceAndSubmission(request, candidate[1], candidate[2], reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, [...fields, "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const args: JsonRecord = { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_id: validated.submissionId, p_idempotency_key: idem, p_request_id: reqId };
    if (command === "request_changes") {
      const feedback = clean(payload.creator_feedback), summary = clean(payload.internal_summary);
      if (!feedback || feedback.length > 5000 || summary.length > 5000) return json(request, { ok: false, code: "invalid_review_text", request_id: reqId }, 400);
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
    const reqId = requestId();
    const validated = validateWorkspaceAndSubmission(request, match[1], match[2], reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["body", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), body = clean(payload.body);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!body || body.length > 5000) return json(request, { ok: false, code: "invalid_internal_note", request_id: reqId }, 400);
    return rpcJson(request, admin, "add_internal_note", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_id: validated.submissionId, p_body: body, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  // Rights clearance.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/versions\/([0-9a-f-]+)\/rights-clearance$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_submission_version_id", reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["clearance_status", "reason", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), status = clean(payload.clearance_status).toLowerCase(), reason = clean(payload.reason);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!["complete", "flagged"].includes(status)) return json(request, { ok: false, code: "pci_rights_clearance_status_invalid", request_id: reqId }, 422);
    if (status === "flagged" && !reason) return json(request, { ok: false, code: "pci_rights_clearance_reason_required", request_id: reqId }, 422);
    return rpcJson(request, admin, "admin_set_rights_clearance", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_version_id: validated.id, p_clearance_status: status, p_reason: reason || null, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  // Negotiation reads.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId(), workspaceId = decodeURIComponent(match[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_negotiations", { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId);
    if (validated instanceof Response) return validated;
    return rpcJson(request, admin, "admin_negotiation_detail", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_negotiation_id: validated.id }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/submissions\/([0-9a-f-]+)\/negotiation\/open$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndSubmission(request, match[1], match[2], reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    return rpcJson(request, admin, "open_negotiation", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_id: validated.submissionId, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)\/(reopen|close|messages)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId);
    if (validated instanceof Response) return validated;
    const action = match[3].toLowerCase();
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const allowed = action === "close" ? ["close_reason", "idempotency_key"] : action === "messages" ? ["body", "idempotency_key"] : ["idempotency_key"];
    const unexpected = rejectUnexpected(payload, allowed);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (action === "reopen") return rpcJson(request, admin, "reopen_negotiation", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_negotiation_id: validated.id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    if (action === "close") return rpcJson(request, admin, "close_negotiation", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_negotiation_id: validated.id, p_close_reason: clean(payload.close_reason).toLowerCase(), p_idempotency_key: idem, p_request_id: reqId }, reqId);
    const body = clean(payload.body);
    if (!body || body.length > 5000) return json(request, { ok: false, code: "invalid_message", request_id: reqId }, 400);
    return rpcJson(request, admin, "admin_send_negotiation_message", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_negotiation_id: validated.id, p_body: body, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  // Formal offers.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/negotiations\/([0-9a-f-]+)\/offers$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_negotiation_id", reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["submission_version_id", "total_amount", "currency", "expires_at", "rights_package_snapshot", "payment_terms_snapshot", "bonus_terms_snapshot", "commercial_terms_snapshot", "parent_offer_id", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), versionId = clean(payload.submission_version_id).toLowerCase(), currency = clean(payload.currency).toUpperCase(), parentId = clean(payload.parent_offer_id).toLowerCase(), amount = Number(payload.total_amount), expiresAt = parseDate(payload.expires_at), rights = objectValue(payload.rights_package_snapshot), payment = objectValue(payload.payment_terms_snapshot), bonus = objectValue(payload.bonus_terms_snapshot) ?? {}, commercial = objectValue(payload.commercial_terms_snapshot) ?? {};
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!isUuid(versionId)) return json(request, { ok: false, code: "invalid_submission_version_id", request_id: reqId }, 400);
    if (parentId && !isUuid(parentId)) return json(request, { ok: false, code: "invalid_parent_offer_id", request_id: reqId }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json(request, { ok: false, code: "pci_offer_amount_invalid", request_id: reqId }, 422);
    if (!/^[A-Z]{3}$/.test(currency)) return json(request, { ok: false, code: "pci_offer_currency_invalid", request_id: reqId }, 422);
    if (expiresAt === false) return json(request, { ok: false, code: "pci_offer_expiry_invalid", request_id: reqId }, 422);
    if (!rights || Object.keys(rights).length === 0) return json(request, { ok: false, code: "pci_offer_rights_snapshot_required", request_id: reqId }, 422);
    if (!payment || Object.keys(payment).length === 0) return json(request, { ok: false, code: "pci_offer_payment_terms_required", request_id: reqId }, 422);
    return rpcJson(request, admin, "send_purchase_offer", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_negotiation_id: validated.id, p_submission_version_id: versionId, p_total_amount: amount, p_currency: currency, p_expires_at: expiresAt || null, p_rights_package_snapshot: rights, p_payment_terms_snapshot: payment, p_bonus_terms_snapshot: bonus, p_commercial_terms_snapshot: commercial, p_parent_offer_id: parentId || null, p_idempotency_key: idem, p_request_id: reqId }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/offers\/([0-9a-f-]+)\/(reject|withdraw)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_offer_id", reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    const command = match[3].toLowerCase() === "reject" ? "admin_reject_offer" : "withdraw_purchase_offer";
    return rpcJson(request, admin, command, { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_offer_id: validated.id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  // Purchase/payment queue reads.
  for (const [pattern, command] of [
    [/^\/v1\/workspaces\/([^/]+)\/purchases$/i, "admin_purchases"],
    [/^\/v1\/workspaces\/([^/]+)\/payables$/i, "admin_payables"],
    [/^\/v1\/workspaces\/([^/]+)\/payouts$/i, "admin_payouts"],
  ] as Array<[RegExp, string]>) {
    const candidate = path.match(pattern);
    if (request.method !== "GET" || !candidate) continue;
    const reqId = requestId(), workspaceId = decodeURIComponent(candidate[1]);
    if (!isWorkspaceId(workspaceId)) return json(request, { ok: false, code: "invalid_workspace_id", request_id: reqId }, 400);
    return rpcJson(request, admin, command, { p_actor_user_id: user.id, p_workspace_id: workspaceId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payouts\/([0-9a-f-]+)$/i);
  if (request.method === "GET" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payout_id", reqId);
    if (validated instanceof Response) return validated;
    return rpcJson(request, admin, "admin_payout_detail", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payout_id: validated.id }, reqId);
  }

  // Explicit payment execution context: decrypt only here, never in list endpoints.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payables\/([0-9a-f-]+)\/execution-context$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payable_id", reqId);
    if (validated instanceof Response) return validated;
    const result = await rpc(admin, "admin_payable_execution_context", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payable_id: validated.id });
    if (result.error) {
      const mapped = rpcErrorCode(result.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    const value = (result.data ?? {}) as JsonRecord;
    const privateDestination = objectValue(value.payment_destination_private) ?? {};
    const ciphertext = clean(privateDestination.account_identifier_ciphertext);
    let exactIdentifier: string | null = null;
    if (ciphertext) {
      try { exactIdentifier = await decryptPaymentIdentifier(ciphertext); }
      catch (error) {
        console.error("[PCI Admin API] payment destination decrypt failed", { reqId, message: error instanceof Error ? error.message : String(error) });
        return json(request, { ok: false, code: "payment_crypto_unavailable", request_id: reqId }, 503);
      }
    }
    return json(request, {
      ok: true,
      request_id: reqId,
      workspace_id: value.workspace_id,
      payable_id: value.payable_id,
      purchase_id: value.purchase_id,
      currency: value.currency,
      amount_due: value.amount_due,
      confirmed_amount: value.confirmed_amount,
      inflight_amount: value.inflight_amount,
      remaining_amount: value.remaining_amount,
      creator: value.creator,
      payment_confirmation_id: value.payment_confirmation_id,
      payment_account_confirmed_at: value.payment_account_confirmed_at,
      payment_destination: {
        payment_account_id: privateDestination.payment_account_id,
        provider: privateDestination.provider,
        account_type: privateDestination.account_type,
        holder_name: privateDestination.holder_name,
        holder_document_masked: privateDestination.holder_document_masked,
        alias: privateDestination.alias,
        account_identifier: exactIdentifier,
        account_identifier_last4: privateDestination.account_identifier_last4,
      },
    });
  }

  // Optional proof upload reservation.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payables\/([0-9a-f-]+)\/payout-proof-upload$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payable_id", reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["mime_type"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const mimeType = clean(payload.mime_type).toLowerCase();
    const extensions: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const extension = extensions[mimeType];
    if (!extension) return json(request, { ok: false, code: "payout_proof_mime_not_allowed", request_id: reqId }, 422);
    const context = await rpc(admin, "admin_payout_proof_upload_context", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payable_id: validated.id });
    if (context.error) {
      const mapped = rpcErrorCode(context.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    const proofId = crypto.randomUUID();
    const storagePath = `workspace/${validated.workspaceId}/payable/${validated.id}/proof/${proofId}.${extension}`;
    const { data, error } = await admin.storage.from("pci-payout-proofs").createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data?.token) return json(request, { ok: false, code: "payout_proof_upload_token_failed", request_id: reqId }, 500);
    return json(request, { ok: true, request_id: reqId, storage_bucket: "pci-payout-proofs", storage_path: storagePath, mime_type: mimeType, max_size_bytes: 20 * 1024 * 1024, signed_upload_token: data.token, upsert: false });
  }

  // Register the external transfer after the operator has actually made it.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payables\/([0-9a-f-]+)\/payouts$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payable_id", reqId);
    if (validated instanceof Response) return validated;
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const unexpected = rejectUnexpected(payload, ["amount", "provider", "method", "provider_reference", "transferred_at", "proof_storage_path", "idempotency_key"]);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload), amount = Number(payload.amount), provider = clean(payload.provider).toLowerCase(), method = clean(payload.method).toLowerCase(), reference = clean(payload.provider_reference), transferredAt = parseDate(payload.transferred_at), proofPath = clean(payload.proof_storage_path);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json(request, { ok: false, code: "pci_payout_amount_invalid", request_id: reqId }, 422);
    if (!provider || !/^[a-z0-9_:-]{1,80}$/.test(provider)) return json(request, { ok: false, code: "pci_payout_provider_invalid", request_id: reqId }, 422);
    if (!method || !/^[a-z0-9_:-]{1,80}$/.test(method)) return json(request, { ok: false, code: "pci_payout_method_invalid", request_id: reqId }, 422);
    if (!reference || reference.length > 200) return json(request, { ok: false, code: "pci_payout_reference_required", request_id: reqId }, 422);
    if (transferredAt === false || transferredAt === null) return json(request, { ok: false, code: "pci_payout_transferred_at_invalid", request_id: reqId }, 422);

    if (proofPath) {
      const expectedPrefix = `workspace/${validated.workspaceId}/payable/${validated.id}/proof/`;
      if (!proofPath.startsWith(expectedPrefix)) return json(request, { ok: false, code: "pci_payout_proof_path_invalid", request_id: reqId }, 422);
      try {
        const stored = await verifyStorageObject(admin, "pci-payout-proofs", proofPath);
        if (!stored.exists || !stored.size || stored.size <= 0 || stored.size > 20 * 1024 * 1024) return json(request, { ok: false, code: "payout_proof_storage_invalid", request_id: reqId }, 422);
        if (stored.mimeType && !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(stored.mimeType)) return json(request, { ok: false, code: "payout_proof_mime_not_allowed", request_id: reqId }, 422);
      } catch (error) {
        console.error("[PCI Admin API] payout proof verification failed", { reqId, message: error instanceof Error ? error.message : String(error) });
        return json(request, { ok: false, code: "payout_proof_verification_failed", request_id: reqId }, 503);
      }
    }

    return rpcJson(request, admin, "admin_register_payout", {
      p_actor_user_id: user.id,
      p_workspace_id: validated.workspaceId,
      p_payable_id: validated.id,
      p_amount: amount,
      p_provider: provider,
      p_method: method,
      p_provider_reference: reference,
      p_transferred_at: transferredAt,
      p_proof_storage_bucket: proofPath ? "pci-payout-proofs" : null,
      p_proof_storage_path: proofPath || null,
      p_idempotency_key: idem,
      p_request_id: reqId,
    }, reqId, 201);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payouts\/([0-9a-f-]+)\/(confirm|fail|reverse)$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payout_id", reqId);
    if (validated instanceof Response) return validated;
    const action = match[3].toLowerCase();
    const payload = await parseObject(request);
    if (!payload) return json(request, { ok: false, code: "invalid_json", request_id: reqId }, 400);
    const allowed = action === "confirm" ? ["idempotency_key"] : ["reason", "idempotency_key"];
    const unexpected = rejectUnexpected(payload, allowed);
    if (unexpected.length) return json(request, { ok: false, code: "unexpected_fields", fields: unexpected, request_id: reqId }, 400);
    const idem = idempotencyKey(request, payload);
    if (!idem) return json(request, { ok: false, code: "idempotency_key_required", request_id: reqId }, 400);
    if (action === "confirm") return rpcJson(request, admin, "admin_confirm_payout", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payout_id: validated.id, p_idempotency_key: idem, p_request_id: reqId }, reqId);
    const reason = clean(payload.reason);
    if (!reason || reason.length > 2000) return json(request, { ok: false, code: action === "fail" ? "pci_payout_failure_reason_invalid" : "pci_payout_reversal_reason_invalid", request_id: reqId }, 422);
    const command = action === "fail" ? "admin_fail_payout" : "admin_reverse_payout";
    return rpcJson(request, admin, command, { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payout_id: validated.id, p_reason: reason, p_idempotency_key: idem, p_request_id: reqId }, reqId);
  }

  match = path.match(/^\/v1\/workspaces\/([^/]+)\/payouts\/([0-9a-f-]+)\/proof$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_payout_id", reqId);
    if (validated instanceof Response) return validated;
    const context = await rpc(admin, "admin_payout_proof_context", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_payout_id: validated.id });
    if (context.error) {
      const mapped = rpcErrorCode(context.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    const value = (context.data ?? {}) as JsonRecord, bucket = clean(value.storage_bucket), storagePath = clean(value.storage_path);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 600);
    if (error || !data?.signedUrl) return json(request, { ok: false, code: "payout_proof_url_failed", request_id: reqId }, 500);
    return json(request, { ok: true, request_id: reqId, payout_id: value.payout_id, signed_url: data.signedUrl, expires_in_seconds: 600 });
  }

  // Existing private playback route.
  match = path.match(/^\/v1\/workspaces\/([^/]+)\/versions\/([0-9a-f-]+)\/playback$/i);
  if (request.method === "POST" && match) {
    const reqId = requestId();
    const validated = validateWorkspaceAndUuid(request, match[1], match[2], "invalid_submission_version_id", reqId);
    if (validated instanceof Response) return validated;
    const context = await rpc(admin, "admin_version_playback_context", { p_actor_user_id: user.id, p_workspace_id: validated.workspaceId, p_submission_version_id: validated.id });
    if (context.error) {
      const mapped = rpcErrorCode(context.error);
      return json(request, { ok: false, code: mapped.code, request_id: reqId }, mapped.status);
    }
    const value = (context.data ?? {}) as JsonRecord, bucket = clean(value.storage_bucket), storagePath = clean(value.storage_path);
    if (bucket !== "pci-submissions" || !storagePath) return json(request, { ok: false, code: "playback_context_unavailable", request_id: reqId }, 409);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(storagePath, 600);
    if (error || !data?.signedUrl) return json(request, { ok: false, code: "playback_url_failed", request_id: reqId }, 500);
    return json(request, { ok: true, request_id: reqId, submission_id: value.submission_id, submission_version_id: value.submission_version_id, version_number: value.version_number, mime_type: value.mime_type, original_filename: value.original_filename, file_size_bytes: value.file_size_bytes, duration_seconds: value.duration_seconds, width: value.width, height: value.height, sha256: value.sha256, playback: { signed_url: data.signedUrl, expires_in_seconds: 600 } });
  }

  return json(request, { ok: false, code: "route_not_found", method: request.method, path }, 404);
});