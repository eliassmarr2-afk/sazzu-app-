import {
  adminClient,
  assertAllowedFields,
  clean,
  corsHeaders,
  idempotencyKey,
  isAllowedOrigin,
  isUuid,
  jsonResponse,
  normalizeError,
  pciRpc,
  readJsonObject,
  relativePath,
  requestHash,
  requestId,
  requireUser,
  type JsonObject,
} from '../_shared/pci.ts';

const FUNCTION_SLUG = 'pci-admin-api';

const CREATE_CONSIGNMENT_FIELDS = [
  'workspace_id',
  'title',
  'summary',
  'objective',
  'angle',
  'hook_guidance',
  'deliverable_type',
  'aspect_ratio',
  'duration_min_seconds',
  'duration_max_seconds',
  'subject_type',
  'subject_ref',
  'subject_snapshot',
  'compensation_mode',
  'base_amount',
  'currency',
  'max_purchasable_assets',
  'max_submissions_per_creator',
  'max_versions_per_submission',
  'technical_requirements',
  'acceptance_criteria',
  'rights_package',
  'performance_bonus_terms',
  'commercial_terms',
  'deadline_at',
  'visibility',
  'metadata',
];

function commandHeaders(request: Request): { idempotencyKey: string; requestId: string } {
  const idem = idempotencyKey(request);
  if (!idem) throw new Error('invalid_or_missing_idempotency_key');
  return { idempotencyKey: idem, requestId: requestId(request) };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    if (!isAllowedOrigin(request)) return new Response('origin_not_allowed', { status: 403 });
    return new Response('ok', { headers: corsHeaders(request) });
  }

  if (!isAllowedOrigin(request)) {
    return jsonResponse(request, { ok: false, code: 'origin_not_allowed' }, 403);
  }

  let admin;
  try {
    admin = adminClient();
  } catch {
    return jsonResponse(request, { ok: false, code: 'backend_not_configured' }, 503);
  }

  const actor = await requireUser(request, admin);
  if (!actor) {
    return jsonResponse(request, {
      ok: false,
      code: 'unauthorized',
      message: 'Se requiere una sesión válida de Protocol Data.',
    }, 401);
  }

  const reqId = requestId(request);
  const path = relativePath(request, FUNCTION_SLUG).replace(/\/+$/, '') || '/';

  try {
    // POST /v1/consignments
    if (request.method === 'POST' && path === '/v1/consignments') {
      const payload = await readJsonObject(request);
      assertAllowedFields(payload, CREATE_CONSIGNMENT_FIELDS);

      const workspaceId = clean(payload.workspace_id);
      if (!workspaceId) throw new Error('workspace_id_required');

      const idem = idempotencyKey(request);
      if (!idem) throw new Error('invalid_or_missing_idempotency_key');

      const draftPayload: JsonObject = { ...payload };
      delete draftPayload.workspace_id;

      const hash = await requestHash(path, payload);
      const result = await pciRpc<JsonObject>(admin, 'admin_create_consignment', {
        p_actor_user_id: actor.id,
        p_workspace_id: workspaceId,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_request_hash: hash,
        p_payload: draftPayload,
      });

      return jsonResponse(request, { ...result, request_id: reqId }, 201);
    }

    // POST /v1/consignments/:id/publish
    const publishMatch = path.match(/^\/v1\/consignments\/([0-9a-f-]+)\/publish$/i);
    if (request.method === 'POST' && publishMatch) {
      const consignmentId = publishMatch[1].toLowerCase();
      if (!isUuid(consignmentId)) throw new Error('invalid_consignment_id');

      const payload = await readJsonObject(request);
      assertAllowedFields(payload, ['workspace_id']);
      const workspaceId = clean(payload.workspace_id);
      if (!workspaceId) throw new Error('workspace_id_required');

      const idem = idempotencyKey(request);
      if (!idem) throw new Error('invalid_or_missing_idempotency_key');

      const hash = await requestHash(path, payload);
      const result = await pciRpc<JsonObject>(admin, 'admin_publish_consignment', {
        p_actor_user_id: actor.id,
        p_workspace_id: workspaceId,
        p_consignment_id: consignmentId,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_request_hash: hash,
      });

      return jsonResponse(request, { ...result, request_id: reqId });
    }

    // GET /v1/review-queue?workspace_id=...
    if (request.method === 'GET' && path === '/v1/review-queue') {
      const workspaceId = clean(new URL(request.url).searchParams.get('workspace_id'));
      if (!workspaceId) throw new Error('workspace_id_required');

      const items = await pciRpc<unknown[]>(admin, 'admin_review_queue', {
        p_actor_user_id: actor.id,
        p_workspace_id: workspaceId,
      });

      return jsonResponse(request, {
        ok: true,
        request_id: reqId,
        items: Array.isArray(items) ? items : [],
      });
    }

    return jsonResponse(request, { ok: false, code: 'route_not_found', request_id: reqId }, 404);
  } catch (error) {
    const normalized = normalizeError(error);
    const raw = error instanceof Error ? error.message : String(error);

    if (raw === 'invalid_or_missing_idempotency_key') {
      return jsonResponse(request, {
        ok: false,
        code: 'invalid_or_missing_idempotency_key',
        request_id: reqId,
      }, 400);
    }

    if (
      raw === 'workspace_id_required' ||
      raw === 'invalid_consignment_id'
    ) {
      return jsonResponse(request, { ok: false, code: raw, request_id: reqId }, 400);
    }

    console.error('[PCI admin API]', {
      request_id: reqId,
      path,
      actor_user_id: actor.id,
      error_code: normalized.code,
    });

    return jsonResponse(request, {
      ok: false,
      code: normalized.code,
      message: normalized.message,
      request_id: reqId,
    }, normalized.status);
  }
});
