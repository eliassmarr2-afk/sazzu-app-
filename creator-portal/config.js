// Protocol Creative Insights · Creator Portal
// Safe browser configuration scaffold.
// NEVER place SUPABASE_SERVICE_ROLE_KEY or any other secret here.
window.PCI_CONFIG = Object.freeze({
  demoMode: true,
  supabaseUrl: '',
  supabasePublishableKey: '',
  onboardingApiUrl: '',
  creatorApiUrl: '',
  dashboardUrl: '../../index.html',
});

// Temporary compatibility shim while Phase 1N finishes replacing legacy hash placeholders.
// It changes navigation only; it never reads auth/session/business data.
(function normalizePortalLegacyRoutes() {
  const configScriptUrl = document.currentScript?.src || '';
  function run() {
    if (!configScriptUrl) return;
    const portalRoot = new URL('./', configScriptUrl);
    const replacements = {
      '#pagos': new URL('payments/', portalRoot).toString(),
      '../#pagos': new URL('payments/', portalRoot).toString(),
      '#conversaciones': new URL('conversations/', portalRoot).toString(),
      '../#conversaciones': new URL('conversations/', portalRoot).toString(),
    };
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href && replacements[href]) anchor.setAttribute('href', replacements[href]);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
