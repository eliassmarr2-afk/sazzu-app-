import { getPortalConfig, getSession, isDemoMode } from '../api-client.js';

const retryKeys = new Map();

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

async function mutation(path, body = {}, explicitIdempotencyKey = null) {
  const fingerprint = `${path}:${JSON.stringify(body)}`;
  const managed = !explicitIdempotencyKey;
  const idempotencyKey = explicitIdempotencyKey || retryKeys.get(fingerprint) || crypto.randomUUID();
  if (managed) retryKeys.set(fingerprint, idempotencyKey);

  try {
    const result = await creatorRequest(path, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...body, idempotency_key: idempotencyKey }),
    });
    if (managed) retryKeys.delete(fingerprint);
    return result;
  } catch (error) {
    const shouldKeepForRetry = !error?.status || Number(error.status) >= 500 || String(error?.message || '') === 'pci_command_already_processing';
    if (managed && !shouldKeepForRetry) retryKeys.delete(fingerprint);
    throw error;
  }
}

export async function getCreatorPaymentAccounts() {
  if (isDemoMode()) return null;
  return creatorRequest('/v1/payment-accounts', { method: 'GET' });
}

export async function getCreatorPaymentPayables() {
  if (isDemoMode()) return null;
  return creatorRequest('/v1/payables', { method: 'GET' });
}

export async function getCreatorPaymentPayouts() {
  if (isDemoMode()) return null;
  return creatorRequest('/v1/payouts', { method: 'GET' });
}

export async function createCreatorPaymentAccount(input, idempotencyKey = null) {
  const provider = String(input?.provider ?? '').trim().toLowerCase();
  const accountType = String(input?.account_type ?? 'transfer').trim().toLowerCase();
  const holderName = String(input?.holder_name ?? '').trim();
  const holderDocumentMasked = String(input?.holder_document_masked ?? '').trim();
  const alias = String(input?.alias ?? '').trim();
  const accountIdentifier = String(input?.account_identifier ?? '').replace(/\s+/g, '').trim();

  if (!provider) throw new Error('pci_payment_provider_invalid');
  if (!holderName) throw new Error('pci_payment_holder_name_invalid');
  if (!alias && !accountIdentifier) throw new Error('pci_payment_destination_required');
  if (alias.length > 160 || accountIdentifier.length > 256 || holderDocumentMasked.length > 80) throw new Error('invalid_payment_account_payload');

  if (isDemoMode()) {
    return {
      ok: true,
      payment_account_id: crypto.randomUUID(), provider, account_type: accountType,
      holder_name: holderName, holder_document_masked: holderDocumentMasked || null,
      alias: alias || null, account_identifier_last4: accountIdentifier ? accountIdentifier.slice(-4) : null,
      status: 'active', demo: true,
    };
  }

  return mutation('/v1/payment-accounts', {
    provider,
    account_type: accountType,
    holder_name: holderName,
    holder_document_masked: holderDocumentMasked || null,
    alias: alias || null,
    account_identifier: accountIdentifier || null,
  }, idempotencyKey);
}

export async function deactivateCreatorPaymentAccount(paymentAccountId, idempotencyKey = null) {
  if (isDemoMode()) return { ok: true, payment_account_id: paymentAccountId, status: 'inactive', demo: true };
  return mutation(`/v1/payment-accounts/${encodeURIComponent(paymentAccountId)}/deactivate`, {}, idempotencyKey);
}

export async function confirmCreatorPayableDestination(payableId, paymentAccountId, idempotencyKey = null) {
  if (isDemoMode()) return { ok: true, payable_id: payableId, payment_account_id: paymentAccountId, status: 'ready_to_pay', confirmation_id: crypto.randomUUID(), demo: true };
  return mutation(`/v1/payables/${encodeURIComponent(payableId)}/confirm-payment-account`, {
    payment_account_id: paymentAccountId,
  }, idempotencyKey);
}

export async function getCreatorPayoutProof(payoutId) {
  if (isDemoMode()) return { ok: true, payout_id: payoutId, signed_url: 'about:blank', expires_in_seconds: 600, demo: true };
  return creatorRequest(`/v1/payouts/${encodeURIComponent(payoutId)}/proof`, { method: 'POST', body: JSON.stringify({}) });
}
