/* =========================================================
   PRODUCTOS · Shopify vínculos · Catálogo real
   Abre el sub-slide editorial y reemplaza mocks por variantes
   reales leídas desde Shopify vía Edge Function.
   No persiste datos y no toca costos ni payloads todavía.
   ========================================================= */
(function () {
  const BTN_ID = 'prodCreateProductShopifyLinkBtn';
  const PARTIAL_PATH = '/partials/prod-subslide-shopify-vinculos.html';
  const CATALOG_URL = 'https://cuuzsbhpjmjbbnghtiny.supabase.co/functions/v1/shopify-catalog-list';

  const state = {
    variants: [],
    loading: false,
    loaded: false,
    lastQuery: ''
  };

  function esc_(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function money_(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '$ 0';
    return '$ ' + n.toLocaleString('es-AR', {
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2
    });
  }

  function findList_() {
    return document.querySelector('.prodShopifyLink__list');
  }

  function findSearch_() {
    return document.querySelector('.prodShopifyLink__search');
  }

  function statusHtml_(message, tone) {
    const color = tone === 'error' ? '#b42318' : '#64748b';
    const bg = tone === 'error' ? '#fff1f0' : '#f8fafc';
    return '' +
      '<div class="prodShopifyLink__row" style="display:block;min-height:auto;background:' + bg + ';cursor:default;box-shadow:none;">' +
        '<div style="color:' + color + ';font-size:13px;font-weight:850;line-height:1.4;">' + esc_(message) + '</div>' +
      '</div>';
  }

  function rowHtml_(variant) {
    const linked = Boolean(variant && variant.linked);
    const title = clean_(variant.title || variant.product_title || 'Producto Shopify');
    const sku = clean_(variant.sku) || 'SKU no informado en Shopify';
    const productId = clean_(variant.product_id) || 'pendiente';
    const variantId = clean_(variant.variant_id) || 'pendiente';
    const price = money_(variant.price);
    const linkedSku = clean_(variant.linked_sku_operativo);
    const linkedText = linkedSku ? 'Vinculado · ' + linkedSku : 'Vinculado';

    return '' +
      '<div class="prodShopifyLink__row ' + (linked ? 'is-linked' : '') + '" ' +
        'data-shopify-product-title="' + esc_(variant.product_title || '') + '" ' +
        'data-shopify-title="' + esc_(title) + '" ' +
        'data-shopify-sku="' + esc_(sku) + '" ' +
        'data-shopify-product-id="' + esc_(productId) + '" ' +
        'data-shopify-variant-id="' + esc_(variantId) + '" ' +
        'data-shopify-linked="' + (linked ? '1' : '0') + '">' +
        '<div class="prodShopifyLink__main">' +
          '<div class="prodShopifyLink__name">' + esc_(title) + '</div>' +
          '<div class="prodShopifyLink__sku">SKU Shopify: ' + esc_(sku) + '</div>' +
          '<div class="prodShopifyLink__meta">product_id: ' + esc_(productId) + ' · variant_id: ' + esc_(variantId) + '</div>' +
        '</div>' +
        '<div class="prodShopifyLink__price">' +
          '<span>Precio Shopify</span>' +
          '<strong>' + esc_(price) + '</strong>' +
        '</div>' +
        '<div class="prodShopifyLink__action">' +
          (linked
            ? '<span class="prodShopifyLink__linkedBadge">' + esc_(linkedText) + '</span>'
            : '<button class="prodShopifyLink__useBtn" type="button" data-shopify-use-variant="1">Usar variante</button>') +
        '</div>' +
      '</div>';
  }

  function render_(variants) {
    const list = findList_();
    if (!list) return;

    const rows = Array.isArray(variants) ? variants : [];
    if (!rows.length) {
      list.innerHTML = statusHtml_('No se encontraron variantes de Shopify para mostrar.', 'empty');
      return;
    }

    list.innerHTML = rows.map(rowHtml_).join('');
  }

  function filterLocal_(query) {
    const q = clean_(query).toLowerCase();
    if (!q) {
      render_(state.variants);
      return;
    }

    const filtered = state.variants.filter(function (variant) {
      const haystack = [
        variant.title,
        variant.product_title,
        variant.variant_title,
        variant.sku,
        variant.product_id,
        variant.variant_id,
        variant.product_type,
        variant.vendor,
        variant.status
      ].map(clean_).join(' ').toLowerCase();

      return haystack.includes(q);
    });

    render_(filtered);
  }

  function bindSearch_() {
    const input = findSearch_();
    if (!input || input.dataset.shopifySearchBound === '1') return;

    input.dataset.shopifySearchBound = '1';
    input.addEventListener('input', function () {
      state.lastQuery = input.value || '';
      filterLocal_(state.lastQuery);
    });
  }

  function setProductFormValue_(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function useVariant_(row) {
    if (!row || row.dataset.shopifyLinked === '1') return;

    const sku = clean_(row.dataset.shopifySku);
    const title = clean_(row.dataset.shopifyTitle || row.dataset.shopifyProductTitle);
    const safeSku = sku && sku !== 'SKU no informado en Shopify' ? sku : '';

    setProductFormValue_('prodCreateProductSku', safeSku);
    setProductFormValue_('prodCreateProductName', title);

    window.__PRODUCTOS_CREATE_SKU_SHOPIFY_LINK_DRAFT__ = {
      product_id: clean_(row.dataset.shopifyProductId),
      variant_id: clean_(row.dataset.shopifyVariantId),
      sku_shopify: safeSku,
      title_shopify: title,
      selected_at: new Date().toISOString()
    };

    const backBtn = document.getElementById('prodCreateProductSubSlideBackBtn');
    if (backBtn) backBtn.click();
  }

  function bindUseButtons_() {
    const list = findList_();
    if (!list || list.dataset.shopifyUseBound === '1') return;

    list.dataset.shopifyUseBound = '1';
    list.addEventListener('click', function (event) {
      const row = event.target.closest('.prodShopifyLink__row');
      if (!row || row.classList.contains('is-linked')) return;
      useVariant_(row);
    });
  }

  async function loadCatalog_() {
    const list = findList_();
    if (!list) return;

    if (state.loading) return;

    bindSearch_();
    bindUseButtons_();

    if (state.loaded && state.variants.length) {
      render_(state.variants);
      filterLocal_(state.lastQuery);
      return;
    }

    state.loading = true;
    list.innerHTML = statusHtml_('Leyendo productos reales de Shopify...', 'loading');

    try {
      const response = await fetch(CATALOG_URL + '?limit=100', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      const json = await response.json().catch(function () { return {}; });

      if (!response.ok || !json.ok) {
        throw new Error(json.message || ('Shopify catalog respondió ' + response.status));
      }

      state.variants = Array.isArray(json.variants) ? json.variants : [];
      state.loaded = true;
      render_(state.variants);
      filterLocal_(state.lastQuery);
    } catch (error) {
      console.warn('[productos-shopify-vinculos] No se pudo leer catálogo Shopify.', error);
      list.innerHTML = statusHtml_(error && error.message ? error.message : 'No se pudo leer el catálogo de Shopify.', 'error');
    } finally {
      state.loading = false;
    }
  }

  function scheduleCatalogLoad_() {
    window.setTimeout(loadCatalog_, 220);
    window.setTimeout(loadCatalog_, 700);
  }

  function openShopifyLinksSubSlide_() {
    if (typeof window.openProductosCreateProductSubSlide_ === 'function') {
      window.openProductosCreateProductSubSlide_('Vincular desde Shopify', PARTIAL_PATH);
      scheduleCatalogLoad_();
      return;
    }

    if (typeof openProductosCreateProductSubSlide_ === 'function') {
      openProductosCreateProductSubSlide_('Vincular desde Shopify', PARTIAL_PATH);
      scheduleCatalogLoad_();
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
