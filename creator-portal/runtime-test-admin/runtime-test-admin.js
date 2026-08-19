import { getPortalConfig, getSession, getSupabaseClient, signOut } from '../api-client.js';

const WORKSPACE_ID = 'pci-runtime-test';
const config = getPortalConfig();
const output = document.querySelector('#output');
const sessionState = document.querySelector('#session-state');
const operatorEmail = document.querySelector('#operator-email');
const operatorPassword = document.querySelector('#operator-password');

function clean(value) { return String(value ?? '').trim(); }
function show(value) { output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
function currentRedirectUrl() { const url = new URL(window.location.href); url.search = ''; url.hash = ''; return url.toString(); }
function idempotencyKey() { return crypto.randomUUID(); }

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requireSession() {
  const session = await getSession();
  if (!session?.access_token) throw new Error('pci_auth_session_required');
  return session;
}

async function apiRequest(baseUrl, path, options = {}) {
  const session = await requireSession();
  if (!baseUrl) throw new Error('pci_runtime_api_url_missing');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(body?.code || `http_${response.status}`);
    error.status = response.status;
    error.payload = body;
    throw error;
  }
  return body ?? {};
}

function onboardingRequest(path, options = {}) {
  return apiRequest(config.onboardingApiUrl, path, options);
}

function invitationRequest(path, options = {}) {
  return apiRequest(config.invitationApiUrl, path, options);
}

async function refreshSession() {
  const session = await getSession();
  if (!session?.access_token) {
    sessionState.className = 'warn';
    sessionState.textContent = 'Sin sesión Auth.';
    return null;
  }
  sessionState.className = 'ok';
  sessionState.textContent = `Sesión válida · ${session.user?.email || 'sin email'} · ${session.user?.id || ''}`;
  return session;
}

async function signInWithPassword() {
  const email = clean(operatorEmail.value).toLowerCase();
  const password = String(operatorPassword?.value ?? '');
  if (!email) throw new Error('operator_email_required');
  if (!password) throw new Error('operator_password_required');
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (operatorPassword) operatorPassword.value = '';
  await refreshSession();
  show({ ok: true, signed_in: Boolean(data?.session?.access_token), user: data?.user ? { id: data.user.id, email: data.user.email } : null });
}

async function sendMagicLink() {
  const email = clean(operatorEmail.value).toLowerCase();
  if (!email) throw new Error('operator_email_required');
  const client = await getSupabaseClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: currentRedirectUrl(),
    },
  });
  if (error) throw error;
  show('Magic Link solicitado. Abrilo desde ese correo y volverás a este harness.');
}

async function verifyOperator() {
  const invitationApiUrl = clean(config.invitationApiUrl);
  if (!invitationApiUrl || !invitationApiUrl.endsWith('/pci-invitation-api')) throw new Error('pci_secure_invitation_api_not_loaded');
  const result = await onboardingRequest(`/v1/admin/workspaces/${encodeURIComponent(WORKSPACE_ID)}/invitations`, { method: 'GET' });
  show({
    ok: true,
    operator_authorized: true,
    workspace_id: WORKSPACE_ID,
    secure_invitation_api_loaded: true,
    invitation_api_url: invitationApiUrl,
    response: result,
  });
}

async function publishLegalDocuments() {
  const docs = [
    {
      document_type: 'creator_terms',
      document_version: '1.0-test',
      title: 'Términos para Creators · Runtime Test',
      content_ref: 'runtime://pci/creator-terms/1.0-test',
      body: 'PCI Runtime Test — Creator Terms v1.0-test. Pago por activo adquirido conforme a criterios de aceptación definidos en el brief. Mientras no te paguemos, tu video sigue siendo tuyo.',
    },
    {
      document_type: 'privacy_notice',
      document_version: '1.0-test',
      title: 'Aviso de privacidad · Runtime Test',
      content_ref: 'runtime://pci/privacy-notice/1.0-test',
      body: 'PCI Runtime Test — Privacy Notice v1.0-test. Datos usados únicamente para validar el flujo Creator en el entorno descartable de Phase 1O.',
    },
  ];

  const results = [];
  for (const doc of docs) {
    const key = idempotencyKey();
    const documentHash = await sha256Hex(doc.body);
    const result = await onboardingRequest(`/v1/admin/workspaces/${encodeURIComponent(WORKSPACE_ID)}/legal-documents`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        document_type: doc.document_type,
        document_version: doc.document_version,
        title: doc.title,
        document_hash: documentHash,
        content_ref: doc.content_ref,
        required_for_activation: true,
        idempotency_key: key,
      }),
    });
    results.push(result);
  }
  show({ ok: true, legal_documents: results });
}

async function inviteCreator() {
  const email = clean(document.querySelector('#creator-email').value).toLowerCase();
  const displayName = clean(document.querySelector('#creator-name').value);
  const legalName = clean(document.querySelector('#creator-legal-name').value);
  if (!email || !displayName) throw new Error('creator_email_and_display_name_required');
  const key = idempotencyKey();
  const result = await invitationRequest(`/v1/admin/workspaces/${encodeURIComponent(WORKSPACE_ID)}/invitations`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify({
      email,
      display_name: displayName,
      legal_name: legalName || null,
      expires_in_hours: 48,
      idempotency_key: key,
    }),
  });
  show(result);
}

async function listInvitations() {
  show(await onboardingRequest(`/v1/admin/workspaces/${encodeURIComponent(WORKSPACE_ID)}/invitations`, { method: 'GET' }));
}

function bind(selector, handler) {
  document.querySelector(selector)?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await handler(); }
    catch (error) {
      console.error(error);
      show({ ok: false, code: error?.message || 'runtime_harness_error', status: error?.status || error?.statusCode || null, payload: error?.payload || null });
    } finally { button.disabled = false; }
  });
}

bind('#sign-in-password', signInWithPassword);
bind('#send-link', sendMagicLink);
bind('#refresh-session', refreshSession);
bind('#verify-operator', verifyOperator);
bind('#publish-legal', publishLegalDocuments);
bind('#invite-creator', inviteCreator);
bind('#list-invitations', listInvitations);
bind('#sign-out', async () => { await signOut(); if (operatorPassword) operatorPassword.value = ''; await refreshSession(); show('Sesión cerrada.'); });

refreshSession().catch((error) => show({ ok: false, code: error?.message || 'session_check_failed' }));
