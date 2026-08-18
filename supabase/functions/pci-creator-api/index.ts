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
  storageTusEndpoint,
  type JsonObject,
} from '../_shared/pci.ts';

const FUNCTION_SLUG = 'pci-creator-api';

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
      message: 'Se requiere una sesión válida de Protocol Creative Insights.',
    }, 401);
  }

  const reqId = requestId(request);
  const path = relativePath(request, FUNCTION_SLUG).replace(/\/+$/, '') || '/';

  try {
    // GET /v1/opportunities
    if (request.method === 'GET' && path === '/v1/opportunities') {
      const items = await pciRpc<unknown[]>(admin, 'creator_list_opportunities', {
        p_actor_user_id: actor.id,
      });

      return jsonResponse(request, {
        ok: true,
        request_id: reqId,
        items: Array.isArray(items) ? items : [],
      });
    }

    // POST /v1/consignments/:id/join
    const joinMatch = path.match(/^\/v1\/consignments\/([0-9a-f-]+)\/join$/i);
    if (request.method === 'POST' && joinMatch) {
      const consignmentId = joinMatch[1].toLowerCase();
      if (!isUuid(consignmentId)) throw new Error('invalid_consignment_id');

      const payload = await readJsonObject(request);
      assertAllowedFields(payload, []);

      const idem = idempotencyKey(request);
      if (!idem) throw new Error('invalid_or_missing_idempotency_key');

      const hash = await requestHash(path, payload);
      const result = await pciRpc<JsonObject>(admin, 'creator_join_consignment', {
        p_actor_user_id: actor.id,
        p_consignment_id: consignmentId,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_request_hash: hash,
      });

      return jsonResponse(request, { ...result, request_id: reqId });
    }

    // POST /v1/participations/:id/submissions
    const submissionMatch = path.match(/^\/v1\/participations\/([0-9a-f-]+)\/submissions$/i);
    if (request.method === 'POST' && submissionMatch) {
      const participationId = submissionMatch[1].toLowerCase();
      if (!isUuid(participationId)) throw new Error('invalid_participation_id');

      const payload = await readJsonObject(request);
      assertAllowedFields(payload, [
        'title',
        'concept_label',
        'hook_label',
        'angle_label',
        'creator_note',
        'metadata',
      ]);

      const idem = idempotencyKey(request);
      if (!idem) throw new Error('invalid_or_missing_idempotency_key');

      const hash = await requestHash(path, payload);
      const result = await pciRpc<JsonObject>(admin, 'creator_create_submission', {
        p_actor_user_id: actor.id,
        p_participation_id: participationId,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_request_hash: hash,
        p_payload: payload,
      });

      return jsonResponse(request, { ...result, request_id: reqId }, 201);
    }

    // POST /v1/submissions/:id/versions/prepare
    const versionMatch = path.match(/^\/v1\/submissions\/([0-9a-f-]+)\/versions\/prepare$/i);
    if (request.method === 'POST' && versionMatch) {
      const submissionId = versionMatch[1].toLowerCase();
      if (!isUuid(submissionId)) throw new Error('invalid_submission_id');

      const payload = await readJsonObject(request);
      assertAllowedFields(payload, ['mime_type', 'original_file_name']);

      const mimeType = clean(payload.mime_type).toLowerCase();
      const originalFileName = clean(payload.original_file_name);
      if (!mimeType) throw new Error('mime_type_required');
      if (!originalFileName || originalFileName.length > 255) {
        throw new Error('invalid_original_file_name');
      }

      const idem = idempotencyKey(request);
      if (!idem) throw new Error('invalid_or_missing_idempotency_key');

      const hash = await requestHash(path, payload);
      const result = await pciRpc<JsonObject>(admin, 'creator_prepare_submission_version', {
        p_actor_user_id: actor.id,
        p_submission_id: submissionId,
        p_mime_type: mimeType,
        p_original_file_name: originalFileName,
        p_idempotency_key: idem,
        p_request_id: reqId,
        p_request_hash: hash,
      });

      const bucket = clean(result.storage_bucket);
      const storagePath = clean(result.storage_path);
      if (!bucket || !storagePath) throw new Error('upload_reservation_invalid');

      // A retry with the same Idempotency-Key returns the same immutable path
      // from PostgreSQL and simply mints a fresh short-lived token for it.
      const { data: signed, error: signedError } = await admin.storage
        .from(bucket)
        .createSignedUploadUrl(storagePath);

      if (signedError || !signed?.token) {
        console.error('[PCI creator API] signed upload token failed', {
          request_id: reqId,
          submission_id: submissionId,
          submission_version_id: clean(result.submission_version_id),
        });
        return jsonResponse(request, {
          ok: false,
          code: 'signed_upload_token_failed',
          request_id: reqId,
          retryable: true,
          reservation: result,
        }, 503);
      }

      return jsonResponse(request, {
        ...result,
        request_id: reqId,
        upload: {
          protocol: 'tus',
          endpoint: storageTusEndpoint(),
          token: signed.token,
          bucket,
          object_name: storagePath,
          content_type: mimeType,
          upsert: false,
          chunk_size_bytes: 6 * 1024 * 1024,
        },
      }, 201);
    }

    return jsonResponse(request, { ok: false, code: 'route_not_found', request_id: reqId }, 404);
  } catch (error) {
    const normalized = normalizeError(error);
    const raw = error instanceof Error ? error.message : String(error);

    if (
      raw === 'invalid_or_missing_idempotency_key' ||
      raw === 'invalid_consignment_id' ||
      raw === 'invalid_participation_id' ||
      raw === 'invalid_submission_id' ||
      raw === 'mime_type_required' ||
      raw === 'invalid_original_file_name'
    ) {
      return jsonResponse(request, { ok: false, code: raw, request_id: reqId }, 400);
    }

    console.error('[PCI creator API]', {
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
