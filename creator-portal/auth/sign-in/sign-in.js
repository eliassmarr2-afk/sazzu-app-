import {
  getOnboardingState,
  getSession,
  isDemoMode,
  onAuthStateChange,
  signOut,
} from '../../api-client.js';
import { CREATOR_RETURN_STORAGE_KEY } from '../../route-guard.js';
import { requestCreatorMagicLink } from './api.js';

const states = [...document.querySelectorAll('[data-sign-in-state]')];
const form = document.querySelector('[data-sign-in-form]');
const submit = document.querySelector('[data-sign-in-submit]');
const errorRoot = document.querySelector('[data-sign-in-error]');
const contextCopy = document.querySelector('[data-sign-in-context]');
const demoEnter = document.querySelector('[data-demo-enter]');
let busy = false;

function portalRootUrl() {
  return new URL('../../', import.meta.url);
}

function onboardingUrl() {
  return new URL('../accept-invitation/', import.meta.url);
}

function setState(name) {
  states.forEach((node) => { node.hidden = node.getAttribute('data-sign-in-state') !== name; });
}

function safeReturnTarget() {
  let raw = '';
  try { raw = sessionStorage.getItem(CREATOR_RETURN_STORAGE_KEY) || ''; }
  catch { return null; }
  if (!raw) return null;
  try {
    const target = new URL(raw, window.location.origin);
    const root = portalRootUrl();
    if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) return null;
    if (target.pathname.includes('/auth/')) return null;
    return target;
  } catch {
    return null;
  }
}

function consumeReturnTarget() {
  const target = safeReturnTarget();
  if (!target) return null;
  try { sessionStorage.removeItem(CREATOR_RETURN_STORAGE_KEY); } catch {}
  return target;
}

function returningRedirectUrl() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function relationshipsOf(state) {
  return Array.isArray(state?.relationships) ? state.relationships : [];
}

function hasActiveRelationship(state) {
  return relationshipsOf(state).some((relationship) => relationship?.status === 'active');
}

function hasBlockedRelationship(state) {
  return relationshipsOf(state).some((relationship) => ['restricted', 'suspended', 'closed'].includes(relationship?.status));
}

function updateReasonCopy() {
  if (!contextCopy) return;
  const reason = new URL(window.location.href).searchParams.get('reason');
  if (reason === 'session_required') contextCopy.textContent = 'Tu sesión terminó. Ingresá nuevamente con el correo asociado a tu cuenta de Creator.';
  else if (reason === 'access_check_failed') contextCopy.textContent = 'Necesitamos volver a validar tu acceso. Te enviaremos un enlace seguro al correo de tu cuenta.';
}

async function resolveSignedInSession() {
  if (isDemoMode()) {
    setState('form');
    return;
  }

  const session = await getSession();
  if (!session?.access_token) {
    setState('form');
    return;
  }

  let onboarding;
  try {
    onboarding = await getOnboardingState();
  } catch (error) {
    if (Number(error?.status) === 401) {
      await signOut().catch(() => {});
      setState('form');
      return;
    }
    throw error;
  }

  if (!onboarding?.linked) {
    setState('unlinked');
    return;
  }

  if (onboarding.creator_status === 'active' && hasActiveRelationship(onboarding)) {
    const target = consumeReturnTarget() || portalRootUrl();
    window.location.replace(target.toString());
    return;
  }

  if (['restricted', 'suspended', 'closed'].includes(onboarding.creator_status) || hasBlockedRelationship(onboarding)) {
    window.location.replace(portalRootUrl().toString());
    return;
  }

  window.location.replace(onboardingUrl().toString());
}

async function submitMagicLink(event) {
  event.preventDefault();
  if (busy) return;
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  errorRoot.hidden = true;
  errorRoot.textContent = '';
  busy = true;
  submit.disabled = true;
  submit.textContent = 'Enviando…';

  try {
    const result = await requestCreatorMagicLink(email, returningRedirectUrl());
    setState('sent');
    if (isDemoMode() && demoEnter) demoEnter.hidden = false;
    if (Number(result?.auth_error_status) === 429) {
      const sentParagraph = document.querySelector('[data-sign-in-state="sent"] p:not(.pci-sign-in-kicker)');
      if (sentParagraph) sentParagraph.textContent = 'Si ese correo está habilitado, vas a recibir un enlace. Si pediste uno hace poco, esperá antes de volver a solicitarlo.';
    }
  } catch (error) {
    const code = String(error?.message || '');
    if (code === 'pci_sign_in_email_invalid') {
      errorRoot.textContent = 'Ingresá un correo válido.';
      errorRoot.hidden = false;
    } else {
      document.querySelector('[data-sign-in-error-message]').textContent = 'No pudimos contactar el servicio de acceso. Reintentá en unos instantes.';
      setState('error');
    }
  } finally {
    busy = false;
    submit.disabled = false;
    submit.textContent = 'Enviar enlace de acceso';
  }
}

function bindEvents() {
  form?.addEventListener('submit', submitMagicLink);
  document.querySelector('[data-sign-in-again]')?.addEventListener('click', () => {
    form?.reset();
    if (demoEnter) demoEnter.hidden = true;
    setState('form');
    form?.querySelector('input[name="email"]')?.focus();
  });
  document.querySelector('[data-sign-in-retry]')?.addEventListener('click', () => {
    setState('loading');
    resolveSignedInSession().catch(() => setState('error'));
  });
  document.querySelector('[data-sign-out]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    await signOut().catch(() => {});
    setState('form');
    event.currentTarget.disabled = false;
  });

  onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.access_token && !isDemoMode()) {
      resolveSignedInSession().catch(() => setState('error'));
    }
  });
}

async function boot() {
  updateReasonCopy();
  bindEvents();
  setState('loading');
  try {
    await resolveSignedInSession();
  } catch {
    setState('error');
  }
}

boot();
