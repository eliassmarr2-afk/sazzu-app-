import { getSession, getSupabaseClient, signOut } from '../api-client.js';

const emailInput = document.querySelector('#creator-email');
const passwordInput = document.querySelector('#creator-password');
const invitationInput = document.querySelector('#invitation-id');
const sessionState = document.querySelector('#session-state');
const output = document.querySelector('#output');

function clean(value) { return String(value ?? '').trim(); }
function show(value) { output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

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

async function signIn() {
  const email = clean(emailInput.value).toLowerCase();
  const password = String(passwordInput.value ?? '');
  if (!email) throw new Error('creator_email_required');
  if (!password) throw new Error('creator_password_required');
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  passwordInput.value = '';
  await refreshSession();
  show({ ok: true, signed_in: Boolean(data?.session?.access_token), user: data?.user ? { id: data.user.id, email: data.user.email } : null });
}

async function continueOnboarding() {
  const session = await refreshSession();
  if (!session?.access_token) throw new Error('pci_auth_session_required');
  const invitationId = clean(invitationInput.value).toLowerCase();
  if (!isUuid(invitationId)) throw new Error('invalid_invitation_id');
  const target = new URL('../auth/accept-invitation/', import.meta.url);
  target.searchParams.set('pci_invitation_id', invitationId);
  window.location.href = target.toString();
}

function bind(id, handler) {
  document.querySelector(id)?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await handler(); }
    catch (error) {
      console.error(error);
      show({ ok: false, code: error?.message || 'runtime_creator_harness_error' });
    } finally { button.disabled = false; }
  });
}

bind('#sign-in', signIn);
bind('#verify-session', async () => { const session = await refreshSession(); show({ ok: Boolean(session), user: session?.user ? { id: session.user.id, email: session.user.email } : null }); });
bind('#continue-onboarding', continueOnboarding);
bind('#sign-out', async () => { await signOut(); passwordInput.value = ''; await refreshSession(); show('Sesión cerrada.'); });

refreshSession().catch((error) => show({ ok: false, code: error?.message || 'session_check_failed' }));
