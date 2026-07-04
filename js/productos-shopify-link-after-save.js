/* PRODUCTOS · Shopify SKU link post-save */
(function () {
  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function byId_(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function currentSku_() {
    const el = byId_(['prodSkuCreateSku', 'prodCreateProductSku', 'prodSkuInput', 'sku']);
    return clean_(el && el.value);
  }

  function currentName_() {
    const el = byId_(['prodSkuCreateNombre', 'prodCreateProductName', 'prodCreateProductNombre', 'nombre_producto']);
    return clean_(el && el.value);
  }

  function buildPayload_() {
    const draft = window.__PRODUCTOS_CREATE_SKU_SHOPIFY_LINK_DRAFT__;
    const sku = currentSku_();
    if (!draft || !sku || !clean_(draft.variant_id)) return null;

    return {
      sku_operativo: sku,
      nombre_operativo: currentName_(),
      shopify_product_id: clean_(draft.product_id),
      shopify_variant_id: clean_(draft.variant_id),
      shopify_sku: clean_(draft.sku_shopify),
      shopify_title: clean_(draft.title_shopify),
      shopify_price: clean_(draft.price_shopify),
      shopify_status: clean_(draft.status_shopify),
      source: 'productos-panel-nuevo-sku'
    };
  }

  function notifyCatalog_(payload) {
    window.dispatchEvent(new CustomEvent('productos:shopify-sku-linked', {
      detail: {
        shopify_variant_id: clean_(payload && payload.shopify_variant_id),
        sku_operativo: clean_(payload && payload.sku_operativo)
      }
    }));
  }

  async function persist_(payload) {
    if (!payload || typeof window.productosShopifySkuLinkUpsert !== 'function') return;

    const result = await window.productosShopifySkuLinkUpsert(payload);
    if (result && result.ok === true) {
      window.__PRODUCTOS_CREATE_SKU_SHOPIFY_LINK_DRAFT__ = null;
      notifyCatalog_(payload);
      console.log('[productos-shopify-link-after-save] vínculo Shopify ↔ SKU guardado OK', result);
      return;
    }

    console.warn('[productos-shopify-link-after-save] SKU guardado; vínculo Shopify pendiente o fallido.', result);
  }

  function modalClosed_() {
    const modal = document.getElementById('prodSkuConfirmModal');
    return !modal || !modal.classList.contains('is-active');
  }

  function waitClosedAndPersist_(payload, attemptsLeft) {
    if (!payload) return;

    if (modalClosed_()) {
      window.setTimeout(function () { persist_(payload); }, 150);
      return;
    }

    if (attemptsLeft <= 0) return;

    window.setTimeout(function () {
      waitClosedAndPersist_(payload, attemptsLeft - 1);
    }, 350);
  }

  function bind_() {
    if (document.documentElement.dataset.shopifySkuLinkAfterSaveBound === '1') return;
    document.documentElement.dataset.shopifySkuLinkAfterSaveBound = '1';

    document.addEventListener('click', function (event) {
      const btn = event.target && event.target.closest ? event.target.closest('#prodSkuConfirmSubmitBtn') : null;
      if (!btn) return;

      const payload = buildPayload_();
      if (!payload) return;

      window.setTimeout(function () {
        waitClosedAndPersist_(payload, 45);
      }, 450);
    }, true);
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bind_();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  document.addEventListener('sazzu:page:load', init_);
  window.addEventListener('load', init_);
})();
