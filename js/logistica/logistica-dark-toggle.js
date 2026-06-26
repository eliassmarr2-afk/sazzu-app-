/* ==========================================================
   Protocol Data · Logística Dark Toggle
   Alcance aislado: solo panel Logística.
   No toca lógica Supabase, pedidos, conversaciones ni router.
   ========================================================== */

(function () {
  const STORAGE_KEY = 'protocolData.logistica.theme';
  const DARK_CLASS = 'logistica-dark';
  const PEDIDOS_BADGES_SCRIPT_ID = 'logisticaDarkPedidosBadgesScript';
  const PEDIDOS_BADGES_SCRIPT_SRC = '../../js/logistica/logistica-dark-pedidos-badges.js';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch (error) {
      return 'light';
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // localStorage puede fallar en contextos restringidos. La UI sigue funcionando en memoria.
    }
  }

  function getMoonIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 14.3A8.8 8.8 0 0 1 9.7 3a7.3 7.3 0 1 0 11.3 11.3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function getSunIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4V2m0 20v-2m8-8h2M2 12h2m14.95 6.95 1.42 1.42M3.63 3.63l1.42 1.42m13.9-1.42-1.42 1.42M5.05 18.95l-1.42 1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/></svg>';
  }

  function ensurePedidosBadgesModule() {
    if (!isLogisticaPage()) return;
    if (document.getElementById(PEDIDOS_BADGES_SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = PEDIDOS_BADGES_SCRIPT_ID;
    script.src = PEDIDOS_BADGES_SCRIPT_SRC;
    script.defer = true;
    document.body.appendChild(script);
  }

  function schedulePedidosBadgesModule() {
    window.setTimeout(ensurePedidosBadgesModule, 0);
    window.setTimeout(ensurePedidosBadgesModule, 180);
    window.setTimeout(ensurePedidosBadgesModule, 520);
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle(DARK_CLASS, dark);

    const toggle = document.getElementById('logThemeToggle');
    if (!toggle) return;

    toggle.innerHTML = dark ? getSunIcon() : getMoonIcon();
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.setAttribute('title', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    toggle.setAttribute('aria-label', dark ? 'Cambiar Logística a modo claro' : 'Cambiar Logística a modo oscuro');

    if (dark) schedulePedidosBadgesModule();
  }

  function ensureToggle() {
    const headerActions = document.querySelector('.logisticsHeader__right');
    if (!headerActions) return null;

    let toggle = document.getElementById('logThemeToggle');
    if (toggle) return toggle;

    toggle = document.createElement('button');
    toggle.id = 'logThemeToggle';
    toggle.className = 'logThemeToggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');

    const syncButton = document.getElementById('logBtnSyncSupabase');
    if (syncButton && syncButton.parentNode === headerActions) {
      headerActions.insertBefore(toggle, syncButton);
    } else {
      headerActions.appendChild(toggle);
    }

    toggle.addEventListener('click', function () {
      const nextTheme = document.body.classList.contains(DARK_CLASS) ? 'light' : 'dark';
      setStoredTheme(nextTheme);
      applyTheme(nextTheme);
    });

    return toggle;
  }

  function initLogisticaDarkToggle() {
    if (!isLogisticaPage()) return;
    ensureToggle();
    applyTheme(getStoredTheme());
    schedulePedidosBadgesModule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogisticaDarkToggle);
  } else {
    initLogisticaDarkToggle();
  }

  document.addEventListener('sazzu:page:load', initLogisticaDarkToggle);
})();
