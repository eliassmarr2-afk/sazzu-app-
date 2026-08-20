import { getPortalConfig, getSession, getSupabaseClient, signOut } from '../api-client.js';

const WORKSPACE_ID = 'pci-runtime-test';
const EXPECTED_RUNTIME_PROJECT_REF = 'dgpmdqmdwqyiwhkbiakd';
const EXPECTED_RUNTIME_ORIGIN = `https://${EXPECTED_RUNTIME_PROJECT_REF}.supabase.co`;
const TARGET_SUBMISSION_ID = 'a7266afd-7fbf-4ae9-9f43-c37684de33f6';
const TARGET_VERSION_ID = '70bd1eb0-9f27-4c1f-956c-71e9caf36d09';
const TARGET_NEGOTIATION_ID = '08e4a156-8e7b-4775-9723-63b0fe31851e';
const TARGET_PAYABLE_ID = '25ccf7ac-46c9-47e4-918c-e2f9bca92ff3';
const TARGET_PAYOUT_ID = 'c883c9bf-f3be-4952-ac59-9971c3065390';
const config = getPortalConfig();
const ADMIN_API_URL = `${EXPECTED_RUNTIME_ORIGIN}/functions/v1/pci-admin-api`;
const output = document.querySelector('#output');
const sessionState = document.querySelector('#session-state');
const operatorEmail = document.querySelector('#operator-email');
const operatorPassword = document.querySelector('#operator-password');

function clean(value) { return String(value ?? '').trim(); }
function show(value) { output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
function currentRedirectUrl() { const url = new URL(window.location.href); url.search = ''; url.hash = ''; return url.toString(); }
function idempotencyKey() { return crypto.randomUUID(); }

function assertDisposableRuntime() {
  const expectedOnboarding = `${EXPECTED_RUNTIME_ORIGIN}/functions/v1/pci-onboarding-api`;
  const expectedInvitation = `${EXPECTED_RUNTIME_ORIGIN}/functions/v1/pci-invitation-api`;
  const supabaseUrl = clean(config.supabaseUrl).replace(/\/+$/, '');
  const onboardingUrl = clean(config.onboardingApiUrl).replace(/\/+$/, '');
  const invitationUrl = clean(config.invitationApiUrl).replace(/\/+$/, '');
  if (
    WORKSPACE_ID !== 'pci-runtime-test' ||
    supabaseUrl !== EXPECTED_RUNTIME_ORIGIN ||
    onboardingUrl !== expectedOnboarding ||
    invitationUrl !== expectedInvitation
  ) {
    const error = new Error('pci_runtime_project_guard_failed');
    error.payload = {
      guard: 'blocked_non_disposable_runtime',
      expected_project_ref: EXPECTED_RUNTIME_PROJECT_REF,
    };
    throw error;
  }
}

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
  assertDisposableRuntime();
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

function adminRequest(path, options = {}) {
  return apiRequest(ADMIN_API_URL, path, options);
}

async function refreshSession() {
  assertDisposableRuntime();
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

async function completeRightsClearance() {
  const key = idempotencyKey();
  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/versions/${encodeURIComponent(TARGET_VERSION_ID)}/rights-clearance`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        clearance_status: 'complete',
        reason: null,
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'rights_clearance_complete',
    workspace_id: WORKSPACE_ID,
    submission_version_id: TARGET_VERSION_ID,
    response: result,
  });
}

async function startV2Review() {
  const key = idempotencyKey();

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/submissions/${encodeURIComponent(TARGET_SUBMISSION_ID)}/review/start`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'start_v2_review',
    workspace_id: WORKSPACE_ID,
    submission_id: TARGET_SUBMISSION_ID,
    expected_version_id: TARGET_VERSION_ID,
    response: result,
  });
}

async function preselectV2() {
  const key = idempotencyKey();

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/submissions/${encodeURIComponent(TARGET_SUBMISSION_ID)}/review/preselect`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        creator_feedback: 'V2 preseleccionada para continuar con la validación de Phase 1O.',
        internal_summary: 'Phase 1O runtime: V2 con rights clearance complete. La preselección no implica compra ni activación de derechos.',
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'preselect_v2',
    workspace_id: WORKSPACE_ID,
    submission_id: TARGET_SUBMISSION_ID,
    expected_version_id: TARGET_VERSION_ID,
    response: result,
  });
}

async function openV2Negotiation() {
  const key = idempotencyKey();

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/submissions/${encodeURIComponent(TARGET_SUBMISSION_ID)}/negotiation/open`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'open_v2_negotiation',
    workspace_id: WORKSPACE_ID,
    submission_id: TARGET_SUBMISSION_ID,
    expected_version_id: TARGET_VERSION_ID,
    response: result,
  });
}

async function sendV2FormalOffer() {
  const key = idempotencyKey();

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/negotiations/${encodeURIComponent(TARGET_NEGOTIATION_ID)}/offers`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        submission_version_id: TARGET_VERSION_ID,
        total_amount: 30000,
        currency: 'ARS',
        expires_at: null,
        rights_package_snapshot: {
          scope: 'purchased_asset_only',
          activation: 'after_payment',
          pre_purchase_use: 'evaluation_only',
        },
        payment_terms_snapshot: {
          payable_creation: 'on_offer_acceptance',
          payment_destination: 'creator_confirmation_required',
          rights_activation: 'after_full_payment',
        },
        bonus_terms_snapshot: {
          enabled: false,
        },
        commercial_terms_snapshot: {
          source: 'consignment_revision',
          consignment_revision_id: '80ce1ae5-27f9-468a-8293-d3d5fb8b6a03',
          pricing_basis: 'per_acquired_asset',
        },
        parent_offer_id: null,
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'send_v2_formal_offer',
    workspace_id: WORKSPACE_ID,
    negotiation_id: TARGET_NEGOTIATION_ID,
    submission_id: TARGET_SUBMISSION_ID,
    submission_version_id: TARGET_VERSION_ID,
    amount: 30000,
    currency: 'ARS',
    response: result,
  });
}

async function readPaymentExecutionContext() {
  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/payables/${encodeURIComponent(TARGET_PAYABLE_ID)}/execution-context`,
    {
      method: 'POST',
    },
  );

  show({
    ok: true,
    action: 'read_payment_execution_context',
    workspace_id: WORKSPACE_ID,
    payable_id: TARGET_PAYABLE_ID,
    mutation_performed: false,
    response: result,
  });
}

async function registerSyntheticRuntimePayout() {
  const key = idempotencyKey();
  const providerReference = 'PCI-RUNTIME-1O-PAYABLE-25CCF7AC';

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/payables/${encodeURIComponent(TARGET_PAYABLE_ID)}/payouts`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        amount: 30000,
        provider: 'runtime_test',
        method: 'synthetic_transfer',
        provider_reference: providerReference,
        transferred_at: new Date().toISOString(),
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'register_synthetic_runtime_payout',
    synthetic_runtime_only: true,
    external_money_moved: false,
    workspace_id: WORKSPACE_ID,
    payable_id: TARGET_PAYABLE_ID,
    amount: 30000,
    currency: 'ARS',
    provider: 'runtime_test',
    method: 'synthetic_transfer',
    provider_reference: providerReference,
    response: result,
  });
}

async function confirmSyntheticRuntimePayout() {
  const key = idempotencyKey();

  const result = await adminRequest(
    `/v1/workspaces/${encodeURIComponent(WORKSPACE_ID)}/payouts/${encodeURIComponent(TARGET_PAYOUT_ID)}/confirm`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        idempotency_key: key,
      }),
    },
  );

  show({
    ok: true,
    action: 'confirm_synthetic_runtime_payout',
    synthetic_runtime_only: true,
    external_money_moved: false,
    workspace_id: WORKSPACE_ID,
    payable_id: TARGET_PAYABLE_ID,
    payout_id: TARGET_PAYOUT_ID,
    expected_amount: 30000,
    currency: 'ARS',
    response: result,
  });
}

function bind(selector, handler) {
  document.querySelector(selector)?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { assertDisposableRuntime(); await handler(); }
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
bind('#complete-rights-clearance', completeRightsClearance);
bind('#start-v2-review', startV2Review);
bind('#preselect-v2', preselectV2);
bind('#open-v2-negotiation', openV2Negotiation);
bind('#send-v2-formal-offer', sendV2FormalOffer);
bind('#read-payment-execution-context', readPaymentExecutionContext);
bind('#register-synthetic-payout', registerSyntheticRuntimePayout);
bind('#confirm-synthetic-payout', confirmSyntheticRuntimePayout);
bind('#sign-out', async () => { await signOut(); if (operatorPassword) operatorPassword.value = ''; await refreshSession(); show('Sesión cerrada.'); });

try {
  assertDisposableRuntime();
  refreshSession().catch((error) => show({ ok: false, code: error?.message || 'session_check_failed' }));
} catch (error) {
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  sessionState.className = 'warn';
  sessionState.textContent = 'BLOQUEADO · este harness solo puede usar el runtime descartable de Phase 1O.';
  show({
    ok: false,
    code: error?.message || 'pci_runtime_project_guard_failed',
    guard: 'blocked_non_disposable_runtime',
    expected_project_ref: EXPECTED_RUNTIME_PROJECT_REF,
  });
}
