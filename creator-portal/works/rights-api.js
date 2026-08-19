import { getPortalConfig, getSession, isDemoMode } from '../api-client.js';

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export async function submitCreatorRightsDeclaration(submissionVersionId, declaration, idempotencyKey = newIdempotencyKey()) {
  if (isDemoMode()) {
    return {
      ok: true,
      submission_version_id: submissionVersionId,
      rights_clearance_status: 'pending',
      demo: true,
    };
  }

  const config = getPortalConfig();
  const apiUrl = String(config.creatorApiUrl ?? '').trim();
  if (!apiUrl) throw new Error('pci_portal_config_missing:creatorApiUrl');

  const session = await getSession();
  if (!session?.access_token) throw new Error('pci_auth_session_required');

  const response = await fetch(`${apiUrl}/v1/versions/${encodeURIComponent(submissionVersionId)}/rights-declaration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ declaration, idempotency_key: idempotencyKey }),
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
