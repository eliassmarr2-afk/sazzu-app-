import { CREATOR_RETURN_STORAGE_KEY } from './route-guard.js';

function portalRootUrl() {
  return new URL('./', import.meta.url);
}

function safeStoredReturn() {
  let raw = '';
  try { raw = sessionStorage.getItem(CREATOR_RETURN_STORAGE_KEY) || ''; }
  catch { return null; }
  if (!raw) return null;

  try {
    const target = new URL(raw, window.location.origin);
    const root = portalRootUrl();
    if (target.origin !== root.origin) return null;
    if (!target.pathname.startsWith(root.pathname)) return null;
    if (target.pathname.includes('/auth/accept-invitation')) return null;
    return target;
  } catch {
    return null;
  }
}

function consumeStoredReturn() {
  const target = safeStoredReturn();
  if (!target) return null;
  try { sessionStorage.removeItem(CREATOR_RETURN_STORAGE_KEY); } catch {}
  return target;
}

function enhanceReadyAction() {
  const link = document.querySelector('[data-state="ready"] a.pci-primary-button');
  if (!link) return;
  const target = safeStoredReturn();
  if (!target) return;

  link.href = target.toString();
  link.addEventListener('click', () => {
    consumeStoredReturn();
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceReadyAction, { once: true });
} else {
  enhanceReadyAction();
}
