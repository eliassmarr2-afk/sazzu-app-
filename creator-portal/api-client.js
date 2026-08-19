const config = window.PCI_CONFIG ?? {};
let supabaseClientPromise = null;

function ensureBrowserConfig() {
  if (config.demoMode) return;
  const required = ['supabaseUrl', 'supabasePublishableKey', 'onboardingApiUrl'];
  const missing = required.filter((key) => !String(config[key] ?? '').trim());
  if (missing.length) throw new Error(`pci_portal_config_missing:${missing.join(',')}`);
}

export function isDemoMode() {
  return Boolean(config.demoMode);
}

export function getPortalConfig() {
  return config;
}

export async function getSupabaseClient() {
  ensureBrowserConfig();
  if (config.demoMode) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2.102.0').then(({ createClient }) => createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    ));
  }
  return supabaseClientPromise;
}

export async function getSession() {
  if (config.demoMode) {
    return {
      access_token: 'demo-session-token',
      user: { id: '00000000-0000-4000-8000-000000000001', email: 'tomas@example.com' },
    };
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
  return () => {
    cancelled = true;
    subscription?.unsubscribe?.();
  };
}

function newIdempotencyKey() {
  return crypto.randomUUID();
}

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

export async function getOnboardingState() {
  if (config.demoMode) return null;
  return requestJson(`${config.onboardingApiUrl}/v1/creator/state`, { method: 'GET' });
}

export async function bootstrapInvitation(invitationToken, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) return null;
  return requestJson(`${config.onboardingApiUrl}/v1/creator/bootstrap`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ invitation_token: invitationToken, idempotency_key: idempotencyKey }),
  });
}

export async function acceptLegalDocument(invitationId, legalDocument, idempotencyKey = newIdempotencyKey()) {
  if (config.demoMode) return null;
  return requestJson(`${config.onboardingApiUrl}/v1/creator/invitations/${encodeURIComponent(invitationId)}/legal-acceptances`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      legal_document_id: legalDocument.legal_document_id,
      document_hash: legalDocument.document_hash,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function signOut() {
  if (config.demoMode) return;
  const client = await getSupabaseClient();
  await client.auth.signOut();
}
