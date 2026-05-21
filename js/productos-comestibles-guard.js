(function () {
  function syncProductosComestiblesVisibility() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;

    const panel = document.getElementById('prodPanelComestibles');
    if (!panel) return;

    const activeTab = document.querySelector('.prodTab.is-active');
    const isComestiblesActive = !!(activeTab && activeTab.id === 'prodTabComestibles');

    panel.style.display = isComestiblesActive ? 'block' : 'none';
  }

  function initProductosComestiblesGuard() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body || body.dataset.comestiblesGuardReady === '1') return;
    body.dataset.comestiblesGuardReady = '1';

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.prodTab')) return;
      setTimeout(syncProductosComestiblesVisibility, 0);
      setTimeout(syncProductosComestiblesVisibility, 80);
    });

    setTimeout(syncProductosComestiblesVisibility, 0);
    setTimeout(syncProductosComestiblesVisibility, 250);
  }

  document.addEventListener('DOMContentLoaded', initProductosComestiblesGuard);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosComestiblesGuard, 80);
    setTimeout(syncProductosComestiblesVisibility, 260);
  });
})();
