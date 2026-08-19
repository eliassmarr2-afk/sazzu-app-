import {
  acceptLegalDocument,
  bootstrapInvitationById,
  getOnboardingState,
  getSession,
  isDemoMode,
  onAuthStateChange,
  signOut,
} from './api-client.js';

const root = document.querySelector('[data-onboarding-root]');
const states = [...document.querySelectorAll('[data-state]')];
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const progressBars = [...document.querySelectorAll('.pci-onboarding-progress > b')];
const legalList = document.querySelector('[data-legal-list]');
const confirmAll = document.querySelector('[data-legal-confirm-all]');
const acceptButton = document.querySelector('[data-accept-terms]');
const authEmail = document.querySelector('[data-auth-email]');

let currentSession = null;
let invitationIdFromUrl = new URL(window.location.href).searchParams.get('pci_invitation_id') || '';
let currentInvitationId = null;
let requiredDocuments = [];
let acceptedDocumentIds = new Set();
let bootstrapResult = null;
let busy = false;

const demoDocuments = [
  {
    legal_document_id: '10000000-0000-4000-8000-000000000001',
    document_type: 'creator_terms',
    document_version: '1.0',
    title: 'Términos para Creators',
    document_hash: 'a'.repeat(64),
    content_ref: '#demo-creator-terms',
  },
  {
    legal_document_id: '10000000-0000-4000-8000-000000000002',
    document_type: 'content_rights',
    document_version: '1.0',
    title: 'Condiciones de propiedad y adquisición',
    document_hash: 'b'.repeat(64),
    content_ref: '#demo-content-rights',
  },
];

function setState(name) {
  states.forEach((node) => { node.hidden = node.getAttribute('data-state') !== name; });
  const levels = { loading: 0, 'auth-required': 0, bootstrap: 0, terms: 1, ready: 2, error: -1 };
  const activeLevel = levels[name] ?? 0;
  progressSteps.forEach((step, index) => {
    step.classList.toggle('is-active', index === activeLevel);
    step.classList.toggle('is-done', activeLevel > index || name === 'ready');
  });
  progressBars.forEach((bar, index) => bar.classList.toggle('is-done', activeLevel > index || name === 'ready'));
}

function setBusy(value) {
  busy = value;
  root?.classList.toggle('is-busy', value);
  document.querySelectorAll('button').forEach((button) => {
    if (button.matches('[data-sign-out]')) return;
    button.disabled = value || (button === acceptButton && !confirmAll?.checked);
  });
}

function scrubInvitationReferenceFromAddressBar() {
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ['pci_invitation_id', 'pci_invitation']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function normalizeDocuments(value) {
  return Array.isArray(value) ? value.filter((item) => item && item.legal_document_id && item.document_hash) : [];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeDocumentHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderLegalDocuments() {
  if (!legalList) return;
  legalList.innerHTML = requiredDocuments.map((doc) => {
    const accepted = acceptedDocumentIds.has(doc.legal_document_id);
    const safeTitle = String(doc.title || doc.document_type || 'Documento');
    const version = String(doc.document_version || '—');
    const shortHash = String(doc.document_hash || '').slice(0, 10);
    const contentRef = safeDocumentHref(doc.content_ref);
    return `
      <article class="pci-legal-document${accepted ? ' is-accepted' : ''}">
        <div class="pci-legal-document__copy">
          <strong>${escapeHtml(safeTitle)}${accepted ? ' · Aceptado' : ''}</strong>
          <span>Versión ${escapeHtml(version)} · ${escapeHtml(shortHash)}…</span>
        </div>
        ${contentRef ? `<a class="pci-legal-document__action" href="${escapeHtml(contentRef)}" target="_blank" rel="noopener noreferrer">Ver documento</a>` : ''}
      </article>
    `;
  }).join('');
}

function showError(error) {
  console.error('[PCI Creator Portal] onboarding error', {
    code: error?.message || 'unknown_error',
    status: error?.status || null,
  });

  const code = String(error?.message || 'pci_onboarding_error');
  const messages = {
    pci_creator_invitation_expired: ['La invitación venció', 'Pedile a Protocol que genere una invitación nueva.'],
    pci_creator_invitation_not_found: ['No encontramos esta invitación', 'El enlace puede ser incorrecto o ya no estar disponible.'],
    pci_creator_invitation_not_pending: ['Esta invitación ya no está disponible', 'Puede haber sido aceptada, reemplazada o revocada.'],
    pci_creator_invitation_not_delivered: ['La invitación todavía no está habilitada', 'Pedile a Protocol que reenvíe una invitación válida.'],
    pci_creator_invitation_email_mismatch: ['Este enlace pertenece a otra cuenta', 'Abrí la invitación con el mismo correo al que fue enviada.'],
    pci_creator_invitation_user_mismatch: ['La invitación pertenece a otro usuario', 'Cerrá sesión y volvé a ingresar desde el correo correcto.'],
    pci_auth_session_required: ['Necesitamos validar tu sesión', 'Volvé al correo de invitación y abrí el enlace nuevamente.'],
  };
  const [title, message] = messages[code] || ['No pudimos completar la activación', 'Podés reintentar. Si el problema continúa, contactá a Protocol.'];
  const titleNode = document.querySelector('[data-error-title]');
  const messageNode = document.querySelector('[data-error-message]');
  const codeNode = document.querySelector('[data-error-code]');
  if (titleNode) titleNode.textContent = title;
  if (messageNode) messageNode.textContent = message;
  if (codeNode) codeNode.textContent = `Código: ${code}`;
  setBusy(false);
  setState('error');
}

function relationshipFromState(state) {
  const relationships = Array.isArray(state?.relationships) ? state.relationships : [];
  return relationships.find((item) => item?.status === 'active')
    || relationships.find((item) => item?.latest_invitation?.status === 'accepted')
    || relationships[0]
    || null;
}

async function hydrateFromOnboardingState() {
  if (isDemoMode()) {
    currentInvitationId = '20000000-0000-4000-8000-000000000001';
    requiredDocuments = demoDocuments;
    acceptedDocumentIds = new Set();
    renderLegalDocuments();
    setState('terms');
    return;
  }

  const state = await getOnboardingState();
  if (!state?.linked) {
    if (invitationIdFromUrl) {
      setState('bootstrap');
      return;
    }
    throw new Error('pci_creator_invitation_not_found');
  }

  const relationship = relationshipFromState(state);
  if (!relationship) throw new Error('pci_creator_invitation_not_found');
  if (relationship.status === 'active') {
    setState('ready');
    return;
  }

  const invitation = relationship.latest_invitation;
  if (!invitation || invitation.status !== 'accepted') {
    if (invitationIdFromUrl) {
      setState('bootstrap');
      return;
    }
    throw new Error('pci_creator_invitation_not_pending');
  }

  currentInvitationId = invitation.invitation_id;
  requiredDocuments = normalizeDocuments(invitation.required_legal_documents);
  acceptedDocumentIds = new Set(Array.isArray(invitation.accepted_legal_document_ids) ? invitation.accepted_legal_document_ids : []);
  renderLegalDocuments();

  if (requiredDocuments.every((doc) => acceptedDocumentIds.has(doc.legal_document_id))) setState('ready');
  else setState('terms');
}

async function initialLoad() {
  setState('loading');
  try {
    currentSession = await getSession();
    if (!currentSession?.access_token) {
      setState('auth-required');
      return;
    }
    if (authEmail) authEmail.textContent = currentSession.user?.email || 'Sesión autenticada';

    if (isDemoMode()) {
      invitationIdFromUrl = invitationIdFromUrl || '20000000-0000-4000-8000-000000000001';
      setState('bootstrap');
      return;
    }

    if (invitationIdFromUrl) {
      setState('bootstrap');
      return;
    }

    await hydrateFromOnboardingState();
  } catch (error) {
    showError(error);
  }
}

async function runBootstrap() {
  if (busy) return;
  if (!invitationIdFromUrl) {
    await hydrateFromOnboardingState().catch(showError);
    return;
  }
  setBusy(true);
  try {
    if (isDemoMode()) {
      bootstrapResult = {
        invitation_id: '20000000-0000-4000-8000-000000000001',
        required_legal_documents: demoDocuments,
      };
    } else {
      bootstrapResult = await bootstrapInvitationById(invitationIdFromUrl);
    }

    currentInvitationId = bootstrapResult?.invitation_id || currentInvitationId;
    requiredDocuments = normalizeDocuments(bootstrapResult?.required_legal_documents);
    acceptedDocumentIds = new Set();
    scrubInvitationReferenceFromAddressBar();
    invitationIdFromUrl = '';

    if (!requiredDocuments.length && !isDemoMode()) await hydrateFromOnboardingState();
    else {
      renderLegalDocuments();
      setState('terms');
    }
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function runLegalAcceptance() {
  if (busy || !confirmAll?.checked) return;
  setBusy(true);
  try {
    if (!currentInvitationId) throw new Error('pci_creator_invitation_not_found');
    const pending = requiredDocuments.filter((doc) => !acceptedDocumentIds.has(doc.legal_document_id));

    for (const doc of pending) {
      if (!isDemoMode()) await acceptLegalDocument(currentInvitationId, doc);
      acceptedDocumentIds.add(doc.legal_document_id);
      renderLegalDocuments();
    }

    if (!isDemoMode()) {
      const state = await getOnboardingState();
      const relationship = relationshipFromState(state);
      if (relationship?.status !== 'active') throw new Error('pci_creator_not_activatable');
    }

    setState('ready');
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  document.querySelector('[data-bootstrap]')?.addEventListener('click', runBootstrap);
  document.querySelector('[data-retry]')?.addEventListener('click', initialLoad);
  document.querySelector('[data-retry-auth]')?.addEventListener('click', initialLoad);
  acceptButton?.addEventListener('click', runLegalAcceptance);
  confirmAll?.addEventListener('change', () => {
    if (acceptButton) acceptButton.disabled = busy || !confirmAll.checked;
  });
  document.querySelector('[data-sign-out]')?.addEventListener('click', async () => {
    await signOut();
    window.location.reload();
  });

  onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.access_token) {
      currentSession = session;
      if (authEmail) authEmail.textContent = session.user?.email || 'Sesión autenticada';
    }
    if (event === 'SIGNED_OUT') {
      currentSession = null;
      setState('auth-required');
    }
  });
}

bindEvents();
initialLoad();
