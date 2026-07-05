/* PRODUCTOS · Resumen · detalle lateral seguro
   No modifica guardado, RPCs, Shopify ni creación de productos. */
(function () {
  const CSS_ID = 'productosResumenSafePolishCss';
  const CSS_HREF = '../css/productos-resumen-safe-polish.css';

  function qs_(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa_(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function text_(value) {
    return String(value == null ? '' : value).trim();
  }

  function norm_(value) {
    return text_(value).toUpperCase();
  }

  function escape_(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money_(value) {
    if (typeof formatMoneyAr_ === 'function') return formatMoneyAr_(value || 0);
    const n = Number(value || 0);
    return '$ ' + n.toLocaleString('es-AR');
  }

  function appendCss_() {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  function getStateProducts_() {
    try {
      if (typeof ProductosState === 'undefined') return [];
      const all = Array.isArray(ProductosState.all) ? ProductosState.all : [];
      const filtered = Array.isArray(ProductosState.filtered) ? ProductosState.filtered : [];
      return all.length ? all : filtered;
    } catch (_) {
      return [];
    }
  }

  function firstValue_(item, keys) {
    const source = item && item.source && typeof item.source === 'object' ? item.source : {};
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null && text_(item[key]) !== '') return item[key];
      if (source && source[key] !== undefined && source[key] !== null && text_(source[key]) !== '') return source[key];
    }
    return '';
  }

  function numberValue_(item, keys) {
    const raw = firstValue_(item, keys);
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  function normalizeProduct_(item) {
    item = item || {};
    const sku = text_(firstValue_(item, ['sku', 'SKU']));
    const nombre = text_(firstValue_(item, ['nombre', 'nombre_producto', 'nombre_comercial', 'producto', 'title'])) || sku;
    return {
      sku,
      nombre,
      estado: item.activo === true ? 'SKU activo' : text_(firstValue_(item, ['estado'])) || 'SKU',
      costo_proveedor: numberValue_(item, ['costo_proveedor', 'costo_producto', 'costo_unitario', 'costo']),
      costo_handling: numberValue_(item, ['costo_handling', 'handling']),
      cpa_costo: numberValue_(item, ['cpa_costo', 'cpa']),
      costo_envio_promedio: numberValue_(item, ['costo_envio_promedio', 'costo_envio', 'envio']),
      margen_pretendido_pct: numberValue_(item, ['margen_pretendido_pct', 'margen_pretendido', 'margen_pct', 'margen']),
      escenario_financiero_id: text_(firstValue_(item, ['escenario_financiero_id', 'escenario', 'financial_scenario_id'])),
      cpa_break_even: numberValue_(item, ['cpa_break_even', 'cpa_breakeven', 'break_even']),
      neto_pretendido: numberValue_(item, ['neto_pretendido', 'neto_objetivo', 'neto']),
      precio_venta: numberValue_(item, ['precio_venta', 'precio_venta_financ', 'precio_final', 'precio']),
      precio_blindado: numberValue_(item, ['precio_blindado', 'precio_seguro'])
    };
  }

  function findProductBySku_(sku) {
    const target = norm_(sku);
    if (!target) return null;
    return getStateProducts_().find((item) => norm_(firstValue_(item, ['sku', 'SKU'])) === target) || null;
  }

  function moveSearch_() {
    const right = qs_('#prodPanelResumen .prodSectionHead__right');
    const search = qs_('#prodPanelResumen .prodTableSearchWrap');
    if (!right || !search) return;

    const pills = qs_('#prodPanelResumen .prodMiniPills');
    if (pills) pills.remove();

    if (!right.contains(search)) {
      right.innerHTML = '';
      right.appendChild(search);
    }
  }

  function pruneRelationColumn_() {
    const table = qs_('#prodPanelResumen .prodTable');
    const tbody = qs_('#prodResumenTableBody');
    if (!table || !tbody) return;

    const headRow = qs_('thead tr', table);
    if (headRow) {
      const firstTh = headRow.children[0];
      if (firstTh && /relaci/i.test(text_(firstTh.textContent))) firstTh.remove();
    }

    qsa_('td.prodTableEmpty', tbody).forEach((td) => {
      if (td.getAttribute('colspan') === '6') td.setAttribute('colspan', '5');
    });

    qsa_('tbody tr', table).forEach((row) => {
      const firstTd = row.children[0];
      if (firstTd && firstTd.querySelector('.prodRelCell')) firstTd.remove();

      const sku = text_(qs_('.prodTable__sku', row) && qs_('.prodTable__sku', row).textContent);
      if (!sku) return;

      row.classList.add('prodResumenRowClickable');
      row.dataset.productSku = sku;
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Abrir detalle de producto ' + sku);
    });
  }

  function kv_(label, value, options) {
    const opts = options || {};
    let rendered = text_(value);
    if (opts.money) rendered = money_(value || 0);
    if (opts.percent) rendered = Number(value || 0) ? String(value).replace('.', ',') + '%' : '—';
    if (!rendered) rendered = '—';

    return `
      <div class="prodProductDetail__kv">
        <div class="prodProductDetail__label">${escape_(label)}</div>
        <div class="prodProductDetail__value${rendered === '—' ? ' prodProductDetail__value--muted' : ''}">${escape_(rendered)}</div>
      </div>
    `;
  }

  function productDetailHtml_(rawProduct) {
    const item = normalizeProduct_(rawProduct);
    return `
      <section class="prodProductDetail">
        <div class="prodProductDetail__hero">
          <div class="prodProductDetail__eyebrow">Producto operativo</div>
          <h2 class="prodProductDetail__title">${escape_(item.nombre)}</h2>
          <div class="prodProductDetail__skuLine">SKU · ${escape_(item.sku)}</div>
        </div>

        <div class="prodProductDetail__grid">
          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Identidad del producto</h3>
            <div class="prodProductDetail__kvGrid">
              ${kv_('SKU', item.sku)}
              ${kv_('Estado', item.estado)}
              ${kv_('Nombre del producto', item.nombre)}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Costo base del SKU</h3>
            <div class="prodProductDetail__kvGrid">
              ${kv_('Costo proveedor', item.costo_proveedor, { money: true })}
              ${kv_('Costo handling', item.costo_handling, { money: true })}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Costos de comercialización</h3>
            <div class="prodProductDetail__kvGrid">
              ${kv_('CPA costo', item.cpa_costo, { money: true })}
              ${kv_('Costo envío promedio', item.costo_envio_promedio, { money: true })}
            </div>
          </article>

          <article class="prodProductDetail__section">
            <h3 class="prodProductDetail__sectionTitle">Objetivo económico</h3>
            <div class="prodProductDetail__kvGrid">
              ${kv_('Margen pretendido %', item.margen_pretendido_pct, { percent: true })}
              ${kv_('Escenario financiero', item.escenario_financiero_id)}
            </div>
          </article>

          <article class="prodProductDetail__section prodProductDetail__section--wide">
            <h3 class="prodProductDetail__sectionTitle">Resultados automáticos</h3>
            <div class="prodProductDetail__kvGrid">
              ${kv_('CPA break even', item.cpa_break_even, { money: true })}
              ${kv_('Neto pretendido', item.neto_pretendido, { money: true })}
              ${kv_('Precio venta', item.precio_venta, { money: true })}
              ${kv_('Precio blindado', item.precio_blindado, { money: true })}
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function openProductDetail_(sku) {
    const product = findProductBySku_(sku);
    if (!product) return;

    const overlay = qs_('#prodSlideOverlay');
    const panel = qs_('#prodSlidePanel');
    const content = qs_('#prodSlideContent');
    const title = qs_('#prodSlideTitle');
    const subSlide = qs_('#prodSubSlide');
    const subContent = qs_('#prodSubSlideContent');

    if (!overlay || !panel || !content) return;

    if (title) title.textContent = 'Detalle de producto';
    if (subSlide) subSlide.classList.remove('is-active');
    if (subSlide) subSlide.setAttribute('aria-hidden', 'true');
    if (subContent) subContent.innerHTML = '';

    panel.classList.remove('is-subslide-open');
    panel.setAttribute('data-main-layout', 'product-detail');
    content.innerHTML = productDetailHtml_(product);

    overlay.classList.add('is-active');
    panel.classList.add('is-active');
    panel.setAttribute('aria-hidden', 'false');
  }

  function bindRows_() {
    const tbody = qs_('#prodResumenTableBody');
    if (!tbody || tbody.dataset.resumenDetailSafeBound === '1') return;
    tbody.dataset.resumenDetailSafeBound = '1';

    tbody.addEventListener('click', function (event) {
      const row = event.target.closest('.prodResumenRowClickable');
      if (!row || !tbody.contains(row)) return;
      openProductDetail_(row.dataset.productSku || '');
    });

    tbody.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.prodResumenRowClickable');
      if (!row || !tbody.contains(row)) return;
      event.preventDefault();
      openProductDetail_(row.dataset.productSku || '');
    });
  }

  function apply_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    appendCss_();
    moveSearch_();
    pruneRelationColumn_();
    bindRows_();
  }

  function init_() {
    apply_();
    const tbody = qs_('#prodResumenTableBody');
    if (tbody && tbody.dataset.resumenDetailSafeObserver !== '1') {
      tbody.dataset.resumenDetailSafeObserver = '1';
      new MutationObserver(apply_).observe(tbody, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  window.addEventListener('load', init_);
  document.addEventListener('sazzu:page:load', init_);
})();
