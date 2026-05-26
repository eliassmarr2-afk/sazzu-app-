/* FASE 1 FIX · Producto Comestible: fallback pointer para + Agregar producto */
(function () {
  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.productosComestiblesOptionalsPointerFix === '1') return;
    document.body.dataset.productosComestiblesOptionalsPointerFix = '1';

    document.addEventListener('pointerdown', function (event) {
      const btn = event.target.closest && event.target.closest('[data-prod-com-optionals-add]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      setTimeout(function () {
        if (window.ProductosComestiblesOptionalsClickFix && typeof window.ProductosComestiblesOptionalsClickFix.open === 'function') {
          window.ProductosComestiblesOptionalsClickFix.open();
        } else if (window.ProductosComestiblesOptionalsUi && typeof window.ProductosComestiblesOptionalsUi.refresh === 'function') {
          window.ProductosComestiblesOptionalsUi.refresh();
          const picker = document.querySelector('[data-prod-com-optionals-picker]');
          if (picker) picker.classList.add('is-active');
        }
      }, 0);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('sazzu:page:load', boot);
  window.addEventListener('load', boot);
})();
