/* ==========================================================
   Protocol Data · Logística · Conversaciones Read Shim
   Este archivo es cargado por logistica.html.
   Carga el hotfix final de tabs + Abierta/Finalizada.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const SCRIPT_ID = 'logistica-conversaciones-hotfix-loader';
  const SCRIPT_SRC = '../../js/logistica/logistica-conversaciones-hotfix.js?v=20260701_01';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function loadHotfix() {
    if (!isLogisticaPage()) return;

    if (window.LogisticaTabsConversacionHotfix && typeof window.LogisticaTabsConversacionHotfix.boot === 'function') {
      window.LogisticaTabsConversacionHotfix.boot();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.defer = true;
    script.onload = function () {
      if (window.LogisticaTabsConversacionHotfix && typeof window.LogisticaTabsConversacionHotfix.boot === 'function') {
        window.LogisticaTabsConversacionHotfix.boot();
      }
    };
    document.body.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', loadHotfix);
  document.addEventListener(PAGE_EVENT, loadHotfix);
  if (document.readyState !== 'loading') loadHotfix();
})();
