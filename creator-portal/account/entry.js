import { signOut } from '../api-client.js';
import { requirePortalAccess } from '../route-guard.js';

await requirePortalAccess();

const signOutButton = document.querySelector('[data-sign-out]');
if (signOutButton) {
  signOutButton.removeAttribute('data-sign-out');
  signOutButton.setAttribute('data-account-sign-out', '');
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    signOutButton.textContent = 'Cerrando sesión…';
    await signOut().catch(() => {});
    window.location.replace(new URL('../auth/sign-in/', import.meta.url).toString());
  });
}

await import('./account.js');
