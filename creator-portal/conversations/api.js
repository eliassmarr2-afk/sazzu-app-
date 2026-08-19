import { getPortalConfig, getSession, isDemoMode } from '../api-client.js';

function creatorApiUrl() {
  const config = getPortalConfig();
  const value = String(config.creatorApiUrl ?? '').replace(/\/+$/, '');
  if (!isDemoMode() && !value) throw new Error('pci_portal_config_missing:creatorApiUrl');
  return value;
}

async function creatorRequest(path, options = {}) {
  if (isDemoMode()) return null;
  const session = await getSession();
  if (!session?.access_token) throw new Error('pci_auth_session_required');
  const response = await fetch(`${creatorApiUrl()}${path}`, {
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

function mutation(path, body = {}, idempotencyKey = crypto.randomUUID()) {
  return creatorRequest(path, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...body, idempotency_key: idempotencyKey }),
  });
}

export async function getCreatorNegotiationDetail(negotiationId) {
  if (isDemoMode()) return null;
  return creatorRequest(`/v1/negotiations/${encodeURIComponent(negotiationId)}`, { method: 'GET' });
}

export async function sendCreatorNegotiationMessage(negotiationId, body, idempotencyKey = crypto.randomUUID()) {
  const message = String(body ?? '').trim();
  if (!message || message.length > 5000) throw new Error('pci_negotiation_message_invalid');
  if (isDemoMode()) return { ok: true, message_id: crypto.randomUUID(), demo: true };
  return mutation(`/v1/negotiations/${encodeURIComponent(negotiationId)}/messages`, { body: message }, idempotencyKey);
}

export async function acceptCreatorOffer(offerId, idempotencyKey = crypto.randomUUID()) {
  if (isDemoMode()) return { ok: true, offer_id: offerId, purchase_id: crypto.randomUUID(), status: 'accepted', demo: true };
  return mutation(`/v1/offers/${encodeURIComponent(offerId)}/accept`, {}, idempotencyKey);
}

export async function rejectCreatorOffer(offerId, idempotencyKey = crypto.randomUUID()) {
  if (isDemoMode()) return { ok: true, offer_id: offerId, status: 'rejected', demo: true };
  return mutation(`/v1/offers/${encodeURIComponent(offerId)}/reject`, {}, idempotencyKey);
}

export async function counterCreatorOffer(offerId, totalAmount, counterNote = null, idempotencyKey = crypto.randomUUID()) {
  const amount = Number(totalAmount);
  const note = String(counterNote ?? '').trim();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('pci_offer_amount_invalid');
  if (note.length > 2000) throw new Error('pci_counter_note_invalid');
  if (isDemoMode()) return { ok: true, offer_id: crypto.randomUUID(), parent_offer_id: offerId, total_amount: amount, status: 'sent', demo: true };
  return mutation(`/v1/offers/${encodeURIComponent(offerId)}/counter`, {
    total_amount: amount,
    counter_note: note || null,
  }, idempotencyKey);
}
