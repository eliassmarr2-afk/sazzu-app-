/* PRODUCTOS · Shopify link UI sync */
(function () {
  const STORE_KEY = 'productos.shopify.linkedVariants.v1';

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function normSku_(value) {
    return clean_(value).toUpperCase();
  }

  function appendCss_(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function appendScript_(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function ensureDarkPolish_() {
    appendCss_('productosDarkPolishCss', '../css/productos-dark-polish.css');
    appendCss_('productosDarkHardFixCss', '../css/productos-dark-hard-fix.css');
    appendCss_('productosDarkLayoutFixCss', '../css/productos-dark-layout-fix.css');
    appendCss_('productosDarkContainerCleanupCss', '../css/productos-dark-container-cleanup.css');
    appendCss_('productosOffersDarkFinalCss', '../css/productos-offers-dark-final.css');
    appendCss_('productosOfferShopifySelectorDarkFixCss', '../css/productos-offer-shopify-selector-dark-fix.css');

    /* TAB Resumen · tabla limpia + detalle lateral seguro */
appendCss_('productosResumenRowDetailCss', '../css/productos-resumen-row-detail.css');
appendScript_('productosResumenRowDetailJs', '../js/productos-resumen-row-detail.js');

/* TAB Resumen · archivado seguro de SKU */
appendScript_('productosResumenArchiveActionsJs', '../js/productos-resumen-archive-actions.js');

    /* TAB Conjuntos · constructor dark + CTA seguro */
    appendCss_('productosConjuntosDarkFixCss', '../css/productos-conjuntos-dark-fix.css');
    appendScript_('productosConjuntosTabCtaJs', '../js/productos-conjuntos-tab-cta.js');
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

  function collectExistingSkuSet_() {
    const set = new Set();
    document.querySelectorAll('#prodResumenTableBody tr').forEach(function (row) {
      const byData = clean_(row.dataset && (row.dataset.sku || row.dataset.productSku));
      if (byData) set.add(normSku_(byData));

      const skuCell = row.querySelector('td:nth-child(1)') || row.querySelector('td:nth-child(2)');
      const byCell = clean_(skuCell && skuCell.textContent);
      if (byCell && byCell !== '—' && !byCell.toLowerCase().includes('cargando')) {
        set.add(normSku_(byCell));
      }
    });
    document.querySelectorAll('[data-sku], [data-product-sku]').forEach(function (el) {
      const sku = clean_(el.dataset && (el.dataset.sku || el.dataset.productSku));
      if (sku) set.add(normSku_(sku));
    });
    return set;
  }

  function applyStoredVariantLinks_() {
    const store = readStore_();
    const ids = Object.keys(store);
    document.querySelectorAll('.prodShopifyLink__row').forEach(function (row) {
      const variantId = clean_(row.dataset && row.dataset.shopifyVariantId);
      if (variantId && ids.includes(variantId)) {
        applyToRow_(row, store[variantId] && store[variantId].sku);
      }
    });
  }

  function applyExistingSkuLinks_() {
    const existingSkus = collectExistingSkuSet_();
    if (!existingSkus.size) return;
    document.querySelectorAll('.prodShopifyLink__row').forEach(function (row) {
      if (row.dataset.shopifyLinked === '1') return;
      const shopifySku = normSku_(row.dataset && row.dataset.shopifySku);
      if (!shopifySku || shopifySku === 'SKU NO INFORMADO EN SHOPIFY') return;
      if (existingSkus.has(shopifySku)) applyToRow_(row, shopifySku);
    });
  }

  function applyAll_() {
    applyStoredVariantLinks_();
    applyExistingSkuLinks_();
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
    ensureDarkPolish_();
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
