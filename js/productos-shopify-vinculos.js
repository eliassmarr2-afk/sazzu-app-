/* =========================================================
   PRODUCTOS · Shopify vínculos · Puente visual inicial
   Abre el sub-slide editorial desde el botón del alta de SKU.
   No persiste datos y no toca costos ni payloads todavía.
   ========================================================= */
(function () {
  const BTN_ID = 'prodCreateProductShopifyLinkBtn';
  const PARTIAL_PATH = '/partials/prod-subslide-shopify-vinculos.html';

  function openShopifyLinksSubSlide_() {
    if (typeof window.openProductosCreateProductSubSlide_ === 'function') {
      window.openProductosCreateProductSubSlide_('Vincular desde Shopify', PARTIAL_PATH);
      return;
    }

    if (typeof openProductosCreateProductSubSlide_ === 'function') {
      openProductosCreateProductSubSlide_('Vincular desde Shopify', PARTIAL_PATH);
      return;
    }

    console.warn('[productos-shopify-vinculos] No se encontró openProductosCreateProductSubSlide_.');
  }

  function bind_() {
    const btn = document.getElementById(BTN_ID);
    if (!btn || btn.dataset.shopifyLinksBound === '1') return;

    btn.dataset.shopifyLinksBound = '1';
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      openShopifyLinksSubSlide_();
    });
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    bind_();

    const panel = document.getElementById('prodCreateProductPanel');
    if (panel && panel.dataset.shopifyLinksObserverBound !== '1') {
      panel.dataset.shopifyLinksObserverBound = '1';
      const observer = new MutationObserver(bind_);
      observer.observe(panel, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  document.addEventListener('sazzu:page:load', init_);
  window.addEventListener('load', init_);
})();
