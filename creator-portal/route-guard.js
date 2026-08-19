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

function redirectToOnboarding(reason) {
  rememberReturnLocation();
  const url = onboardingUrl();
  if (reason) url.searchParams.set('reason', reason);
  window.location.replace(url.toString());
  return new Promise(() => {});
}

function firstActiveRelationship(state) {
  const relationships = Array.isArray(state?.relationships) ? state.relationships : [];
  return relationships.find((item) => item?.status === 'active') || null;
}

function relationshipBlockState(state) {
  const relationships = Array.isArray(state?.relationships) ? state.relationships : [];
  return relationships.find((item) => ['restricted', 'suspended', 'closed'].includes(item?.status)) || null;
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
  document.documentElement.setAttribute('data-pci-access', 'blocked');
  document.body.innerHTML = `
    <main class="pci-access-block" role="main">
      <section class="pci-access-block__card" aria-labelledby="pci-access-title">
        <div class="pci-access-block__brand" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p>${copy.kicker}</p>
        <h1 id="pci-access-title" tabindex="-1">${copy.title}</h1>
        <span>${copy.message}</span>
        <div class="pci-access-block__meta">
          <div><small>Creator</small><strong>${String(state?.display_name || 'Creator')}</strong></div>
          <div><small>Estado</small><strong>${String(state?.creator_status || relationship?.status || 'bloqueado')}</strong></div>
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
    window.location.replace(onboardingUrl().toString());
  });
  return new Promise(() => {});
}

async function refreshedSession() {
  let session = await getSession();
  if (session?.access_token) return session;
  try {
    const client = await getSupabaseClient();
    const { data } = await client.auth.refreshSession();
    session = data?.session || null;
  } catch {
    session = null;
  }
  return session;
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

  const session = await refreshedSession();
  if (!session?.access_token) return redirectToOnboarding('session_required');

  let state;
  try {
    state = await getOnboardingState();
  } catch (error) {
    if (Number(error?.status) === 401) return redirectToOnboarding('session_required');
    throw error;
  }

  if (!state?.linked) return redirectToOnboarding('creator_not_linked');

  const creatorStatus = String(state?.creator_status || '');
  const relationshipBlocked = relationshipBlockState(state);
  if (['restricted', 'suspended', 'closed'].includes(creatorStatus) || relationshipBlocked) {
    return renderBlocked(state, relationshipBlocked);
  }

  const activeRelationship = firstActiveRelationship(state);
  if (creatorStatus !== 'active' || !activeRelationship) {
    return redirectToOnboarding('onboarding_incomplete');
  }

  const context = { demo: false, session, onboarding: state, activeRelationship };
  window.PCI_GUARD_CONTEXT = context;
  document.documentElement.setAttribute('data-pci-access', 'active');
  return context;
}

export function requirePortalAccess() {
  if (!accessPromise) {
    accessPromise = resolvePortalAccess().catch((error) => {
      console.error('[PCI Creator Portal] route guard failed', {
        code: error?.message || 'unknown_error',
        status: error?.status || null,
      });
      rememberReturnLocation();
      const url = onboardingUrl();
      url.searchParams.set('reason', 'access_check_failed');
      window.location.replace(url.toString());
      return new Promise(() => {});
    });
  }
  return accessPromise;
}

export function getGuardContext() {
  return window.PCI_GUARD_CONTEXT || null;
}

export const CREATOR_RETURN_STORAGE_KEY = RETURN_KEY;
