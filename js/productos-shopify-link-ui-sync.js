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

  function ensureDarkPolish_() {
    appendCss_('productosDarkPolishCss', '../css/productos-dark-polish.css');
    appendCss_('productosDarkHardFixCss', '../css/productos-dark-hard-fix.css');
    appendCss_('productosDarkLayoutFixCss', '../css/productos-dark-layout-fix.css');
    appendCss_('productosDarkContainerCleanupCss', '../css/productos-dark-container-cleanup.css');
    appendCss_('productosOffersDarkFinalCss', '../css/productos-offers-dark-final.css');
    appendCss_('productosOfferShopifySelectorDarkFixCss', '../css/productos-offer-shopify-selector-dark-fix.css');
    appendCss_('productosResumenProductDetailCss', '../css/productos-resumen-product-detail.css');
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

      const skuCell = row.querySelector('.prodTable__sku') || row.querySelector('td:first-child');
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

    ids.forEach(function (variantId) {
      const safeId = String(variantId).replace(/"/g, '\\"');
      const rows = document.querySelectorAll('.prodShopifyLink__row[data-shopify-variant-id="' + safeId + '"]');
      rows.forEach(function (row) {
        applyToRow_(row, store[variantId] && store[variantId].sku);
      });
    });
  }

  function applyExistingSkuLinks_() {
    const existingSkus = collectExistingSkuSet_();
    if (!existingSkus.size) return;

    document.querySelectorAll('.prodShopifyLink__row').forEach(function (row) {
      if (row.dataset.shopifyLinked === '1') return;

      const shopifySku = normSku_(row.dataset && row.dataset.shopifySku);
      if (!shopifySku || shopifySku === 'SKU NO INFORMADO EN SHOPIFY') return;

      if (existingSkus.has(shopifySku)) {
        applyToRow_(row, shopifySku);
      }
    });
  }

  function applyAll_() {
    applyStoredVariantLinks_();
    applyExistingSkuLinks_();
  }

  function escapeHtmlLocal_(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function moneyLocal_(value) {
    try {
      if (typeof formatMoneyAr_ === 'function') return formatMoneyAr_(value);
    } catch (_) {}
    const n = Number(value || 0);
    return '$ ' + n.toLocaleString('es-AR');
  }

  function numLocal_(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }

  function firstValue_(item, source, keys) {
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key];
      if (source && source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') return source[key];
    }
    return '';
  }

  function numberValue_(item, source, keys) {
    const raw = firstValue_(item, source, keys);
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeProductRecord_(item) {
    item = item || {};
    const source = item.source && typeof item.source === 'object' ? item.source : {};

    const sku = clean_(firstValue_(item, source, ['sku', 'SKU']));
    const nombre = clean_(firstValue_(item, source, ['nombre', 'nombre_producto', 'nombre_comercial', 'producto', 'title'])) || sku;

    return {
      ...item,
      source: { ...source },
      sku,
      nombre,
      activo: item.activo === true || String(item.estado || source.estado || '').toLowerCase() === 'active',
      costo_proveedor: numberValue_(item, source, ['costo_proveedor', 'costo_producto', 'costo_unitario', 'costo']),
      costo_handling: numberValue_(item, source, ['costo_handling', 'handling']),
      cpa_costo: numberValue_(item, source, ['cpa_costo', 'cpa']),
      costo_envio_promedio: numberValue_(item, source, ['costo_envio_promedio', 'costo_envio', 'envio']),
      margen_pretendido_pct: numberValue_(item, source, ['margen_pretendido_pct', 'margen_pretendido', 'margen_pct', 'margen']),
      cpa_break_even: numberValue_(item, source, ['cpa_break_even', 'cpa_breakeven', 'break_even']),
      neto_pretendido: numberValue_(item, source, ['neto_pretendido', 'neto_objetivo', 'neto']),
      precio_venta: numberValue_(item, source, ['precio_venta', 'precio_venta_financ', 'precio_final', 'precio']),
      precio_blindado: numberValue_(item, source, ['precio_blindado', 'precio_seguro']),
      escenario_financiero_id: clean_(firstValue_(item, source, ['escenario_financiero_id', 'escenario', 'financial_scenario_id']))
    };
  }

  function getProductosState_() {
    try {
      if (typeof ProductosState !== 'undefined') return ProductosState;
    } catch (_) {}
    return null;
  }

  function syncResumenTableHeader_() {
    const table = document.querySelector('.prodTable');
    if (!table) return;
    const headRow = table.querySelector('thead tr');
    if (!headRow) return;

    headRow.innerHTML = `
      <th>SKU</th>
      <th>Nombre comercial</th>
      <th>Neto pretendido</th>
      <th>Precio de venta (financ)</th>
      <th>Estado</th>
    `;
  }

  function relocateResumenSearch_() {
    const right = document.querySelector('.prodSectionHead__right');
    const searchWrap = document.querySelector('.prodTableSearchWrap');
    if (!right || !searchWrap) return;

    const miniPills = right.querySelector('.prodMiniPills');
    if (miniPills) miniPills.remove();

    if (!right.contains(searchWrap)) {
      right.innerHTML = '';
      right.appendChild(searchWrap);
    }
  }

  function valueText_(value, options) {
    const opts = options || {};
    if (opts.money) return moneyLocal_(value || 0);
    if (opts.percent) return value ? numLocal_(value) + '%' : '—';
    const text = clean_(value);
    return text || '—';
  }

  function detailKv_(label, value, opts) {
    return `
      <div class="prodProductDetail__kv">
        <div class="prodProductDetail__label">${escapeHtmlLocal_(label)}</div>
        <div class="prodProductDetail__value${clean_(valueText_(value, opts)) === '—' ? ' prodProductDetail__value--muted' : ''}">${escapeHtmlLocal_(valueText_(value, opts))}</div>
      </div>
    `;
  }

  function getProductBySku_(sku) {
    const state = getProductosState_();
    if (!state) return null;
    const target = normSku_(sku);
    const all = Array.isArray(state.all) ? state.all : [];
    const filtered = Array.isArray(state.filtered) ? state.filtered : [];

    return all.find((item) => normSku_(item && item.sku) === target) ||
      filtered.find((item) => normSku_(item && item.sku) === target) ||
      null;
  }

  function renderProductDetailHtml_(product) {
    const item = normalizeProductRecord_(product || {});
    const status = item.activo ? 'SKU activo' : 'SKU inactivo';

    return `
      <section class="prodProductDetail">
        <div class="prodProductDetail__hero">
          <div class="prodProductDetail__eyebrow">Producto operativo</div>
          <h2 class="prodProductDetail__title">${escapeHtmlLocal_(item.nombre || 'Producto sin nombre')}</h2>
          <div class="prodProductDetail__skuLine">SKU · ${escapeHtmlLocal_(item.sku || '—')}</div>
        </div>

        <div class="prodProductDetail__grid">
          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Identidad del producto</h3>
            <div class="prodProductDetail__kvGrid">
              ${detailKv_('SKU', item.sku)}
              ${detailKv_('Estado', status)}
              ${detailKv_('Nombre del producto', item.nombre)}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Costo base del SKU</h3>
            <div class="prodProductDetail__kvGrid">
              ${detailKv_('Costo proveedor', item.costo_proveedor, { money: true })}
              ${detailKv_('Costo handling', item.costo_handling, { money: true })}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Costos de comercialización</h3>
            <div class="prodProductDetail__kvGrid">
              ${detailKv_('CPA costo', item.cpa_costo, { money: true })}
              ${detailKv_('Costo envío promedio', item.costo_envio_promedio, { money: true })}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Objetivo económico</h3>
            <div class="prodProductDetail__kvGrid">
              ${detailKv_('Margen pretendido %', item.margen_pretendido_pct, { percent: true })}
              ${detailKv_('Escenario financiero', item.escenario_financiero_id)}
            </div>
          </article>

          <article class="prodProductDetail__section prodProductDetail__section--wide">
            <h3 class="prodProductDetail__sectionTitle">Resultados automáticos</h3>
            <div class="prodProductDetail__kvGrid">
              ${detailKv_('CPA break even', item.cpa_break_even, { money: true })}
              ${detailKv_('Neto pretendido', item.neto_pretendido, { money: true })}
              ${detailKv_('Precio venta', item.precio_venta, { money: true })}
              ${detailKv_('Precio blindado', item.precio_blindado, { money: true })}
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function openProductDetailSlide_(sku) {
    const product = getProductBySku_(sku);
    if (!product) return;

    const overlay = document.getElementById('prodSlideOverlay');
    const panel = document.getElementById('prodSlidePanel');
    const content = document.getElementById('prodSlideContent');
    const titleEl = document.getElementById('prodSlideTitle');

    if (!overlay || !panel || !content) return;

    if (titleEl) titleEl.textContent = 'Detalle de producto';
    content.innerHTML = renderProductDetailHtml_(product);

    panel.classList.remove('is-subslide-open');
    panel.classList.add('is-product-detail');
    overlay.classList.add('is-active');
    panel.classList.add('is-active');
    panel.setAttribute('aria-hidden', 'false');
  }

  function wireSummaryRows_() {
    const tbody = document.getElementById('prodResumenTableBody');
    if (!tbody || tbody.dataset.productDetailBound === '1') return;
    tbody.dataset.productDetailBound = '1';

    tbody.addEventListener('click', function (event) {
      const row = event.target.closest('.prodSummaryProductRow');
      if (!row || !tbody.contains(row)) return;
      openProductDetailSlide_(row.dataset.productSku || row.dataset.sku || '');
    });

    tbody.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.prodSummaryProductRow');
      if (!row || !tbody.contains(row)) return;
      event.preventDefault();
      openProductDetailSlide_(row.dataset.productSku || row.dataset.sku || '');
    });
  }

  function patchProductosResumen_() {
    if (window.__PRODUCTOS_RESUMEN_DETAIL_PATCHED__ === true) return;
    window.__PRODUCTOS_RESUMEN_DETAIL_PATCHED__ = true;

    try {
      if (typeof closeProductosSlide_ === 'function') {
        const originalClose = closeProductosSlide_;
        closeProductosSlide_ = function () {
          const panel = document.getElementById('prodSlidePanel');
          if (panel) panel.classList.remove('is-product-detail');
          return originalClose.apply(this, arguments);
        };
      }

      if (typeof openProductosSlide_ === 'function') {
        const originalOpen = openProductosSlide_;
        openProductosSlide_ = function () {
          const panel = document.getElementById('prodSlidePanel');
          if (panel) panel.classList.remove('is-product-detail');
          return originalOpen.apply(this, arguments);
        };
      }

      if (typeof loadProductos_ === 'function') {
        loadProductos_ = async function () {
          if (typeof setProductosDebugRow_ === 'function') {
            setProductosDebugRow_('Consultando backend de productos...');
          }

          const url = `${window.__PRODUCTOS_BACKEND_URL__ || PRODUCTOS_BACKEND_URL}?action=getProductos&_t=${Date.now()}`;
          const res = await jsonp(url);

          if (!res || res.ok !== true) {
            if (typeof setProductosDebugRow_ === 'function') {
              setProductosDebugRow_(`Error al cargar productos: ${(res && res.error) ? escapeHtmlLocal_(res.error) : 'respuesta inválida del backend'}`);
            }
            return;
          }

          const productos = Array.isArray(res.productos) ? res.productos : [];

          if (!productos.length) {
            if (typeof setProductosDebugRow_ === 'function') {
              setProductosDebugRow_('El backend respondió OK, pero no devolvió productos.');
            }
            return;
          }

          const state = getProductosState_();
          if (state) {
            state.all = productos.map(normalizeProductRecord_);
            window.__PRODUCTOS_CACHE__ = window.__PRODUCTOS_CACHE__ || {};
            window.__PRODUCTOS_CACHE__.productos = state.all.map((p) => ({ ...p, source: { ...(p.source || {}) } }));
          }

          if (typeof renderProductos_ === 'function') renderProductos_();
        };
      }

      renderProductosTable_ = function () {
        const tbody = document.getElementById('prodResumenTableBody');
        const state = getProductosState_();
        if (!tbody || !state) return;

        syncResumenTableHeader_();
        relocateResumenSearch_();

        const rows = Array.isArray(state.filtered) ? state.filtered : [];

        if (!rows.length) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="prodTableEmpty">No se encontraron productos con los filtros actuales.</td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = rows.map((raw) => {
          const item = normalizeProductRecord_(raw);
          const tipo = 'SKU';

          return `
            <tr class="prodSummaryProductRow" data-product-sku="${escapeHtmlLocal_(item.sku)}" data-sku="${escapeHtmlLocal_(item.sku)}" tabindex="0" role="button" aria-label="Abrir detalle de ${escapeHtmlLocal_(item.sku)}">
              <td><div class="prodTable__sku">${escapeHtmlLocal_(item.sku)}</div></td>
              <td><div class="prodTable__name">${escapeHtmlLocal_(item.nombre)}</div></td>
              <td><div class="prodTable__money">${moneyLocal_(item.neto_pretendido)}</div></td>
              <td><div class="prodTable__money">${moneyLocal_(item.precio_venta)}</div></td>
              <td><span class="badge">${escapeHtmlLocal_(tipo)}</span></td>
            </tr>
          `;
        }).join('');

        wireSummaryRows_();
      };
    } catch (err) {
      console.warn('[productos-resumen] No se pudo aplicar patch visual de resumen', err);
    }
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
      relocateResumenSearch_();
      applyAll_();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    applyAll_();
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    ensureDarkPolish_();
    patchProductosResumen_();
    relocateResumenSearch_();
    syncResumenTableHeader_();
    wireSummaryRows_();
    bind_();
  }

  init_();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  document.addEventListener('sazzu:page:load', init_);
  window.addEventListener('load', init_);
})();
