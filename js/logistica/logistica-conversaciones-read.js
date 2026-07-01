/* ==========================================================
   Protocol Data · Logística · Conversaciones Read Shim
   Este archivo es cargado por logistica.html.
   Carga el hotfix final de tabs + Abierta/Finalizada
   y la sincronización estructural del modo claro.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const SCRIPT_ID = 'logistica-conversaciones-hotfix-loader';
  const SCRIPT_SRC = '../../js/logistica/logistica-conversaciones-hotfix.js?v=20260701_01';
  const LIGHT_STRUCTURE_LINK_ID = 'logistica-light-structure-sync-css';
  const LIGHT_STRUCTURE_HREF = '../../css/logistica/logistica-light-structure-sync.css?v=20260701_01';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function loadLightStructure() {
    if (!isLogisticaPage()) return;
    if (document.getElementById(LIGHT_STRUCTURE_LINK_ID)) return;

    const link = document.createElement('link');
    link.id = LIGHT_STRUCTURE_LINK_ID;
    link.rel = 'stylesheet';
    link.href = LIGHT_STRUCTURE_HREF;
    document.head.appendChild(link);
  }

  function loadHotfix() {
    if (!isLogisticaPage()) return;
    loadLightStructure();

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
