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

// Shared non-business bootstrap: accessibility layer + compatibility navigation.
// It never reads auth/session/business data.
(function bootstrapCreatorPortalShell() {
  const configScriptUrl = document.currentScript?.src || '';
  if (!configScriptUrl) return;
  const portalRoot = new URL('./', configScriptUrl);

  const accessibility = document.createElement('link');
  accessibility.rel = 'stylesheet';
  accessibility.href = new URL('accessibility.css', portalRoot).toString();
  document.head.appendChild(accessibility);

  function normalizeRoutes() {
    const replacements = {
      '#pagos': new URL('payments/', portalRoot).toString(),
      '../#pagos': new URL('payments/', portalRoot).toString(),
      '#conversaciones': new URL('conversations/', portalRoot).toString(),
      '../#conversaciones': new URL('conversations/', portalRoot).toString(),
      '#cuenta': new URL('account/', portalRoot).toString(),
      '../#cuenta': new URL('account/', portalRoot).toString(),
      '#soporte': new URL('account/?section=support', portalRoot).toString(),
      '../#soporte': new URL('account/?section=support', portalRoot).toString(),
    };
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href && replacements[href]) anchor.setAttribute('href', replacements[href]);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', normalizeRoutes, { once: true });
  else normalizeRoutes();
})();
