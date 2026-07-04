/* PRODUCTOS · Shopify link UI sync */
(function () {
  const STORE_KEY = 'productos.shopify.linkedVariants.v1';

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function readStore_() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeStore_(value) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(value || {}));
    } catch (_) {}
  }

  function remember_(variantId, sku) {
    const id = clean_(variantId);
    if (!id) return;
    const store = readStore_();
    store[id] = { sku: clean_(sku), at: new Date().toISOString() };
    writeStore_(store);
  }

  function applyToRow_(row, sku) {
    if (!row) return;
    row.classList.add('is-linked');
    row.dataset.shopifyLinked = '1';

    const action = row.querySelector('.prodShopifyLink__action');
    if (action) {
      const label = clean_(sku) ? 'Vinculado · ' + clean_(sku) : 'Vinculado';
      action.innerHTML = '<span class="prodShopifyLink__linkedBadge">' + label + '</span>';
    }
  }

  function applyAll_() {
    const store = readStore_();
    const ids = Object.keys(store);
    if (!ids.length) return;

    ids.forEach(function (variantId) {
      const safeId = String(variantId).replace(/"/g, '\\"');
      const rows = document.querySelectorAll('.prodShopifyLink__row[data-shopify-variant-id="' + safeId + '"]');
      rows.forEach(function (row) {
        applyToRow_(row, store[variantId] && store[variantId].sku);
      });
    });
  }

  function bind_() {
    if (window.__PRODUCTOS_SHOPIFY_LINK_UI_SYNC_BOUND__ === true) return;
    window.__PRODUCTOS_SHOPIFY_LINK_UI_SYNC_BOUND__ = true;

    window.addEventListener('productos:shopify-sku-linked', function (event) {
      const detail = event && event.detail ? event.detail : {};
      remember_(detail.shopify_variant_id, detail.sku_operativo);
      applyAll_();
    });

    const observer = new MutationObserver(function () {
      applyAll_();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    applyAll_();
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
