const config = window.PCI_CONFIG ?? {};
let supabaseClientPromise = null;
let creatorSubmissionsReadPromise = null;

function ensureBrowserConfig(requiredKeys = ['supabaseUrl', 'supabasePublishableKey']) {
  if (config.demoMode) return;
  const missing = requiredKeys.filter((key) => !String(config[key] ?? '').trim());
  if (missing.length) throw new Error(`pci_portal_config_missing:${missing.join(',')}`);
}

export function isDemoMode() { return Boolean(config.demoMode); }
export function getPortalConfig() { return config; }

export async function getSupabaseClient() {
  ensureBrowserConfig();
  if (config.demoMode) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2.102.0').then(({ createClient }) => createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } },
    ));
  }
  return supabaseClientPromise;
}

export async function getSession() {
  if (config.demoMode) {
    return { access_token: 'demo-session-token', user: { id: '00000000-0000-4000-8000-000000000001', email: 'tomas@example.com' } };
  }
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  if (config.demoMode) return () => {};
  let subscription = null;
  let cancelled = false;
  getSupabaseClient().then((client) => {
    if (cancelled) return;
    const result = client.auth.onAuthStateChange((event, session) => callback(event, session));
    subscription = result.data.subscription;
  });
  return () => { cancelled = true; subscription?.unsubscribe?.(); };
}

function newIdempotencyKey() { return crypto.randomUUID(); }

async function requestJson(url, options = {}) {
  const session = await getSession();
  if (!session?.access_token) throw new Error('pci_auth_session_required');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) {
    const error = new Error(body?.code || `pci_http_${response.status}`);
    error.status = response.status;
    error.payload = body;
    throw error;
  }
  return body ?? {};
}

async function onboardingRequest(path, options = {}) {
  ensureBrowserConfig(['supabaseUrl', 'supabasePublishableKey', 'onboardingApiUrl']);
  return requestJson(`${config.onboardingApiUrl}${path}`, options);
}

async function creatorRequest(path, options = {}) {
  ensureBrowserConfig(['supabaseUrl', 'supabasePublishableKey', 'creatorApiUrl']);
  return requestJson(`${config.creatorApiUrl}${path}`, options);
}

export async function getOnboardingState() {
  if (config.demoMode) return null;
  return onboardingRequest('/v1/creator/state', { method: 'GET' });
}

export async function bootstrapInvitation(invitationToken, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) return null;
  return onboardingRequest('/v1/creator/bootstrap', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ invitation_token: invitationToken, idempotency_key: idempotencyKey }),
  });
}

export async function acceptLegalDocument(invitationId, legalDocument, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) return null;
  return onboardingRequest(`/v1/creator/invitations/${encodeURIComponent(invitationId)}/legal-acceptances`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      legal_document_id: legalDocument.legal_document_id,
      document_hash: legalDocument.document_hash,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function getCreatorOpportunities() { return config.demoMode ? null : creatorRequest('/v1/opportunities', { method: 'GET' }); }
export async function getCreatorSubmissions() {
  if (config.demoMode) return null;
  if (!creatorSubmissionsReadPromise) {
    creatorSubmissionsReadPromise = creatorRequest('/v1/submissions', { method: 'GET' });
    setTimeout(() => { creatorSubmissionsReadPromise = null; }, 0);
  }
  return creatorSubmissionsReadPromise;
}
export async function getCreatorNegotiations() { return config.demoMode ? null : creatorRequest('/v1/negotiations', { method: 'GET' }); }
export async function getCreatorPayables() { return config.demoMode ? null : creatorRequest('/v1/payables', { method: 'GET' }); }
export async function getCreatorPayouts() { return config.demoMode ? null : creatorRequest('/v1/payouts', { method: 'GET' }); }

export async function getCreatorSubmissionDetail(submissionId) {
  if (config.demoMode) return null;
  return creatorRequest(`/v1/submissions/${encodeURIComponent(submissionId)}`, { method: 'GET' });
}

export async function joinCreatorOpportunity(consignmentId, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) {
    return {
      ok: true,
      participation_id: crypto.randomUUID(),
      consignment_id: consignmentId,
      status: 'active',
      demo: true,
    };
  }
  return creatorRequest(`/v1/consignments/${encodeURIComponent(consignmentId)}/join`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
}

export async function createCreatorSubmission(consignmentId, conceptLabel = null, conceptMetadata = {}, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) {
    return {
      ok: true,
      submission_id: crypto.randomUUID(),
      status: 'draft',
      demo: true,
    };
  }
  return creatorRequest('/v1/submissions', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      consignment_id: consignmentId,
      concept_label: String(conceptLabel ?? '').trim() || null,
      concept_metadata: conceptMetadata && typeof conceptMetadata === 'object' && !Array.isArray(conceptMetadata) ? conceptMetadata : {},
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function reserveCreatorSubmissionVersion(submissionId, file, idempotencyKey = newIdempotencyKey()) {
  const name = String(file?.name ?? '').trim();
  const mimeType = String(file?.type ?? '').trim().toLowerCase();
  if (!name) throw new Error('pci_upload_file_name_required');
  if (!['video/mp4', 'video/quicktime'].includes(mimeType)) throw new Error('pci_video_mime_not_allowed');

  if (config.demoMode) {
    const versionId = crypto.randomUUID();
    return {
      ok: true,
      submission_id: submissionId,
      submission_version_id: versionId,
      version_number: 1,
      status: 'uploading',
      storage_bucket: 'pci-submissions',
      storage_path: `demo/${submissionId}/${versionId}/${mimeType === 'video/quicktime' ? 'original.mov' : 'original.mp4'}`,
      mime_type: mimeType,
      upload: {
        protocol: 'tus',
        endpoint: 'demo://pci-storage',
        bucket_name: 'pci-submissions',
        object_name: `demo/${submissionId}/${versionId}`,
        content_type: mimeType,
        signature_token: 'demo-signature',
        signature_header: 'x-signature',
        chunk_size_bytes: 6 * 1024 * 1024,
        upsert: false,
        signed_token_ttl_seconds: 7200,
      },
      demo: true,
    };
  }

  return creatorRequest(`/v1/submissions/${encodeURIComponent(submissionId)}/versions`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      original_filename: name,
      mime_type: mimeType,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function finalizeCreatorSubmissionVersion(submissionVersionId, metadata, idempotencyKey = newIdempotencyKey()) {
  const payload = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  if (config.demoMode) {
    return {
      ok: true,
      submission_version_id: submissionVersionId,
      version_status: 'ready',
      submission_status: 'submitted',
      sha256: payload.sha256 || null,
      demo: true,
    };
  }
  return creatorRequest(`/v1/versions/${encodeURIComponent(submissionVersionId)}/finalize`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      sha256: payload.sha256,
      duration_seconds: payload.duration_seconds ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function getCreatorDashboardSnapshot() {
  if (config.demoMode) return null;
  const [identity, opportunities, submissions, negotiations, payables, payouts] = await Promise.all([
    getOnboardingState(),
    getCreatorOpportunities(),
    getCreatorSubmissions(),
    getCreatorNegotiations(),
    getCreatorPayables(),
    getCreatorPayouts(),
  ]);
  return { identity, opportunities, submissions, negotiations, payables, payouts };
}

export async function signOut() {
  if (config.demoMode) return;
  const client = await getSupabaseClient();
  await client.auth.signOut();
}