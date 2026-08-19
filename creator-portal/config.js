// Protocol Creative Insights · Creator Portal
// Disposable Phase 1O runtime configuration.
// Browser-safe values only. NEVER place SUPABASE_SERVICE_ROLE_KEY or PCI_* secrets here.
window.PCI_CONFIG = Object.freeze({
  demoMode: false,
  supabaseUrl: 'https://dgpmdqmdwqyiwhkbiakd.supabase.co',
  supabasePublishableKey: 'sb_publishable_TGcjjsn4UTMhr70Rjiz1gA_33--XXjR',
  onboardingApiUrl: 'https://dgpmdqmdwqyiwhkbiakd.supabase.co/functions/v1/pci-onboarding-api',
  invitationApiUrl: 'https://dgpmdqmdwqyiwhkbiakd.supabase.co/functions/v1/pci-invitation-api',
  creatorApiUrl: 'https://dgpmdqmdwqyiwhkbiakd.supabase.co/functions/v1/pci-creator-api',
  dashboardUrl: '../../index.html',
});

// Shared non-business bootstrap: access-paint guard + accessibility + compatibility navigation.
// It never reads auth/session/business data.
(function bootstrapCreatorPortalShell() {
  const configScriptUrl = document.currentScript?.src || '';
  if (!configScriptUrl) return;
  const portalRoot = new URL('./', configScriptUrl);
  const current = new URL(window.location.href);
  const relativePath = current.pathname.startsWith(portalRoot.pathname)
    ? current.pathname.slice(portalRoot.pathname.length)
    : '';
  const isAuthSurface = relativePath.startsWith('auth/');

  if (!isAuthSurface) {
    document.documentElement.setAttribute('data-pci-access', 'checking');
    const paintGuard = document.createElement('style');
    paintGuard.setAttribute('data-pci-paint-guard', '');
    paintGuard.textContent = 'html[data-pci-access="checking"] body{background:#0f0f10}html[data-pci-access="checking"] .pci-app{visibility:hidden}';
    document.head.appendChild(paintGuard);
  }

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
    document.querySelectorAll('button.pci-profile-chip:not([data-account-scroll-top])').forEach((button) => {
      button.addEventListener('click', () => {
        window.location.href = new URL('account/', portalRoot).toString();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', normalizeRoutes, { once: true });
  else normalizeRoutes();
})();
