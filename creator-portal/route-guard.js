import {
  getOnboardingState,
  getSession,
  getSupabaseClient,
  isDemoMode,
  signOut,
} from './api-client.js';

const RETURN_KEY = 'pci_creator_return_to_v1';
let accessPromise = null;

function portalRootUrl() {
  return new URL('./', import.meta.url);
}

function onboardingUrl() {
  return new URL('auth/accept-invitation/', portalRootUrl());
}

function signInUrl() {
  return new URL('auth/sign-in/', portalRootUrl());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function internalReturnValue() {
  const current = new URL(window.location.href);
  const root = portalRootUrl();
  if (current.origin !== root.origin || !current.pathname.startsWith(root.pathname)) return null;
  return `${current.pathname}${current.search}${current.hash}`;
}

function rememberReturnLocation() {
  try {
    const value = internalReturnValue();
    if (value) sessionStorage.setItem(RETURN_KEY, value);
  } catch {
    // Storage may be unavailable in privacy modes; return routing is optional.
  }
}

function redirectTo(url, reason) {
  rememberReturnLocation();
  const target = new URL(url.toString());
  if (reason) target.searchParams.set('reason', reason);
  window.location.replace(target.toString());
  return new Promise(() => {});
}

function redirectToOnboarding(reason) {
  return redirectTo(onboardingUrl(), reason);
}

function redirectToSignIn(reason) {
  return redirectTo(signInUrl(), reason);
}

function relationshipsOf(state) {
  return Array.isArray(state?.relationships) ? state.relationships : [];
}

function firstActiveRelationship(state) {
  return relationshipsOf(state).find((item) => item?.status === 'active') || null;
}

function hasPendingOnboardingRelationship(state) {
  return relationshipsOf(state).some((item) => {
    if (item?.status !== 'invited') return false;
    const invitationStatus = String(item?.latest_invitation?.status || '');
    return invitationStatus === 'accepted' || invitationStatus === 'pending';
  });
}

function relationshipBlockState(state) {
  return relationshipsOf(state).find((item) => ['restricted', 'suspended', 'closed'].includes(item?.status)) || null;
}

function blockCopy(creatorStatus, relationshipStatus) {
  const status = ['restricted', 'suspended', 'closed'].includes(creatorStatus)
    ? creatorStatus
    : relationshipStatus;
  if (status === 'restricted') return {
    kicker: 'ACCESO RESTRINGIDO',
    title: 'Tu acceso comercial está restringido',
    message: 'Podés conservar tu sesión, pero no podés abrir oportunidades ni ejecutar acciones comerciales hasta que Protocol revise tu estado.',
  };
  if (status === 'suspended') return {
    kicker: 'CUENTA SUSPENDIDA',
    title: 'Tu cuenta está suspendida',
    message: 'Las operaciones del Creator Portal están temporalmente bloqueadas. Tu historial no se elimina ni se modifica.',
  };
  return {
    kicker: 'RELACIÓN CERRADA',
    title: 'Este acceso ya no está activo',
    message: 'La relación comercial con Protocol está cerrada. El portal no permite nuevas operaciones con este estado.',
  };
}

function renderBlocked(state, relationship) {
  const copy = blockCopy(state?.creator_status, relationship?.status);
  const creatorName = escapeHtml(state?.display_name || 'Creator');
  const status = escapeHtml(state?.creator_status || relationship?.status || 'bloqueado');
  document.documentElement.setAttribute('data-pci-access', 'blocked');
  document.body.innerHTML = `
    <main class="pci-access-block" role="main">
      <section class="pci-access-block__card" aria-labelledby="pci-access-title">
        <div class="pci-access-block__brand" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p>${copy.kicker}</p>
        <h1 id="pci-access-title" tabindex="-1">${copy.title}</h1>
        <span>${copy.message}</span>
        <div class="pci-access-block__meta">
          <div><small>Creator</small><strong>${creatorName}</strong></div>
          <div><small>Estado</small><strong>${status}</strong></div>
        </div>
        <button type="button" data-pci-guard-sign-out>Cerrar sesión</button>
      </section>
    </main>`;
  const title = document.getElementById('pci-access-title');
  requestAnimationFrame(() => title?.focus());
  document.querySelector('[data-pci-guard-sign-out]')?.addEventListener('click', async () => {
    const button = document.querySelector('[data-pci-guard-sign-out]');
    if (button) button.disabled = true;
    await signOut().catch(() => {});
    window.location.replace(signInUrl().toString());
  });
  return new Promise(() => {});
}

async function forceRefreshSession() {
  try {
    const client = await getSupabaseClient();
    const { data } = await client.auth.refreshSession();
    return data?.session || null;
  } catch {
    return null;
  }
}

async function resolvePortalAccess() {
  document.documentElement.setAttribute('data-pci-access', 'checking');

  if (isDemoMode()) {
    const context = {
      demo: true,
      session: { user: { id: '00000000-0000-4000-8000-000000000001', email: 'tomas@example.com' } },
      onboarding: {
        linked: true,
        creator_id: '00000000-0000-4000-8000-000000000001',
        display_name: 'Tomás',
        creator_status: 'active',
        relationships: [{ workspace_id: 'protocol-demo', status: 'active', activated_at: new Date().toISOString() }],
      },
      activeRelationship: { workspace_id: 'protocol-demo', status: 'active' },
    };
    window.PCI_GUARD_CONTEXT = context;
    document.documentElement.setAttribute('data-pci-access', 'active');
    return context;
  }

  let session = await getSession();
  if (!session?.access_token) session = await forceRefreshSession();
  if (!session?.access_token) return redirectToSignIn('session_required');

  let state;
  try {
    state = await getOnboardingState();
  } catch (error) {
    if (Number(error?.status) !== 401) throw error;
    session = await forceRefreshSession();
    if (!session?.access_token) return redirectToSignIn('session_required');
    try {
      state = await getOnboardingState();
    } catch (retryError) {
      if (Number(retryError?.status) === 401) return redirectToSignIn('session_required');
      throw retryError;
    }
  }

  if (!state?.linked) return redirectToSignIn('creator_not_linked');

  const creatorStatus = String(state?.creator_status || '');
  if (['restricted', 'suspended', 'closed'].includes(creatorStatus)) {
    return renderBlocked(state, null);
  }

  const activeRelationship = firstActiveRelationship(state);
  if (creatorStatus === 'active' && activeRelationship) {
    const context = { demo: false, session, onboarding: state, activeRelationship };
    window.PCI_GUARD_CONTEXT = context;
    document.documentElement.setAttribute('data-pci-access', 'active');
    return context;
  }

  // A Creator may later have multiple workspaces. An invited relationship that can still
  // complete onboarding must not be hidden by an unrelated restricted/closed relationship.
  if (hasPendingOnboardingRelationship(state)) {
    return redirectToOnboarding('onboarding_incomplete');
  }

  const relationshipBlocked = relationshipBlockState(state);
  if (relationshipBlocked) return renderBlocked(state, relationshipBlocked);

  return redirectToOnboarding('onboarding_incomplete');
}

export function requirePortalAccess() {
  if (!accessPromise) {
    accessPromise = resolvePortalAccess().catch((error) => {
      console.error('[PCI Creator Portal] route guard failed', {
        code: error?.message || 'unknown_error',
        status: error?.status || null,
      });
      return redirectToSignIn('access_check_failed');
    });
  }
  return accessPromise;
}

export function getGuardContext() {
  return window.PCI_GUARD_CONTEXT || null;
}

export const CREATOR_RETURN_STORAGE_KEY = RETURN_KEY;
