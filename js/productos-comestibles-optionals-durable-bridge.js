/*
  FASE 2 FIX · Producto Comestible: persistencia durable de Agregados opcionales

  Corrige el caso:
  - Recomendados aparece en 2 temporalmente.
  - Al refrescar, vuelve a 0.
  - Al editar, las cards ya no existen.

  Estrategia:
  - Mantener un storage propio y durable por product_id y por slug de nombre.
  - Rehidratar cards al abrir el slide.
  - Parchear la columna Recomendados al renderizar la tabla.

  No toca Extras. No toca Combos.
*/
(function () {
  const STORE_KEY = 'sazzu_food_product_optionals_durable_v1';
  const STYLE_SAFE_ATTR = 'data-prod-com-optionals-card';
  let observerBound = false;
  let saveTimer = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.assign({ by_id: {}, by_slug: {} }, parsed)
        : { by_id: {}, by_slug: {} };
    } catch (_) {
      return { by_id: {}, by_slug: {} };
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign({ by_id: {}, by_slug: {} }, store || {})));
    } catch (error) {
      console.warn('[productos-comestibles-optionals-durable-bridge.js] No se pudo guardar storage durable:', error);
    }
  }

  function currentSlide() {
    return document.getElementById('prodComSlide');
  }

  function currentProductId() {
    const slide = currentSlide();
    return String(slide && slide.dataset ? slide.dataset.productId || '' : '').trim();
  }

  function currentProductName() {
    const input = document.getElementById('com_nombre');
    if (input && input.value) return String(input.value).trim();
    const title = document.getElementById('prodComSlideTitle');
    return title ? String(title.textContent || '').trim() : '';
  }

  function currentSlug() {
    return slugify(currentProductName());
  }

  function section() {
    return document.querySelector('#prodComSlideBody [data-prod-com-section="recomendados"]');
  }

  function list() {
    const s = section();
    return s ? s.querySelector('.prodComOptions[data-options-key="recomendados"]') : null;
  }

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }

  function normalizeItem(item, index) {
    const data = item || {};
    const id = String(data.linked_product_id || data.product_id || data.id || slugify(data.nombre || data.title || 'producto')).trim();
    const name = String(data.nombre || data.title || data.name || 'Producto recomendado').trim();
    const description = String(data.descripcion || data.description || data.categoria || data.category || '').trim();
    const price = Number(data.precio != null ? data.precio : (data.price != null ? data.price : data.price_delta || 0)) || 0;
    const image = String(data.imagen || data.image || data.image_url || '').trim();
    const qty = String(data.cantidad_label || data.quantity_label || data.cantidad || '1 unidad').trim() || '1 unidad';
    const state = String(data.estado_visual || data.estado || data.status || 'Visible').trim() || 'Visible';
    return {
      id: id,
      product_id: id,
      linked_product_id: id,
      nombre: name,
      title: name,
      descripcion: description,
      description: description,
      precio: price,
      price: price,
      estado: state,
      status: state,
      badge: String(data.badge || 'Agregado opcional').trim() || 'Agregado opcional',
      imagen: image,
      image: image,
      cantidad: qty,
      cantidad_label: qty,
      quantity_label: qty,
      estado_visual: state,
      activo: state !== 'Oculto',
      position: Number(data.position || index + 1) || index + 1
    };
  }

  function collectFromCards() {
    const cards = Array.from(document.querySelectorAll('.prodComOptions[data-options-key="recomendados"] [' + STYLE_SAFE_ATTR + '="1"]'));
    return cards.map(function (card, index) {
      const productId = String(card.dataset.productId || '').trim();
      const nameInput = card.querySelector('input[id^="recomendados_"][id$="_nombre"]');
      const descInput = card.querySelector('input[id^="recomendados_"][id$="_desc"]');
      const priceInput = card.querySelector('input[id^="recomendados_"][id$="_precio"]');
      const imgInput = card.querySelector('input[id^="recomendados_"][id$="_img"]');
      const badgeInput = card.querySelector('input[id^="recomendados_"][id$="_badge"]');
      const qtyInput = card.querySelector('input[id^="prod_com_recomendado_"][id$="_cantidad"]');
      const stateSelect = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
      const titleNode = card.querySelector('.prodComOptionalStageAHead strong');
      const descNode = card.querySelector('.prodComOptionalStageAHead span');
      const priceNode = card.querySelector('.prodComOptionalStageAHead b');
      const imageNode = card.querySelector('.prodComOptionalStageAImage img');
      return normalizeItem({
        id: productId,
        product_id: productId,
        linked_product_id: productId,
        nombre: nameInput ? nameInput.value : (titleNode ? titleNode.textContent : ''),
        descripcion: descInput ? descInput.value : (descNode ? descNode.textContent : ''),
        precio: priceInput ? Number(priceInput.value || 0) : parseMoney(priceNode ? priceNode.textContent : 0),
        imagen: imgInput ? imgInput.value : (imageNode ? imageNode.getAttribute('src') : ''),
        badge: badgeInput ? badgeInput.value : 'Agregado opcional',
        cantidad_label: qtyInput ? qtyInput.value : '1 unidad',
        estado_visual: stateSelect ? stateSelect.value : 'Visible',
        position: index + 1
      }, index);
    }).filter(function (item) { return item.product_id && item.nombre; });
  }

  function currentKeys() {
    return {
      id: currentProductId(),
      slug: currentSlug()
    };
  }

  function saveCurrent() {
    const items = collectFromCards();
    if (!items.length) return null;
    const keys = currentKeys();
    const store = readStore();
    const record = {
      product_id: keys.id || '',
      product_slug: keys.slug || '',
      product_name: currentProductName(),
      items: items,
      count: items.length,
      updated_at: new Date().toISOString()
    };
    if (keys.id) store.by_id[keys.id] = record;
    if (keys.slug) store.by_slug[keys.slug] = record;
    writeStore(store);
    window.__PRODUCTOS_COMESTIBLES_OPTIONALS_DURABLE_LAST__ = record;
    return record;
  }

  function getRecordFor(id, slug) {
    const store = readStore();
    const byId = id ? store.by_id[id] : null;
    if (byId && Array.isArray(byId.items)) return byId;
    const bySlug = slug ? store.by_slug[slug] : null;
    if (bySlug && Array.isArray(bySlug.items)) return bySlug;
    return null;
  }

  function cardHtml(item, index) {
    const data = normalizeItem(item, index);
    const image = data.imagen ? '<img src="' + esc(data.imagen) + '" alt="">' : '<span>IMG</span>';
    return '<article class="prodComOption prodComOptionalStageACard" data-prod-com-optionals-card="1" data-option-key="recomendados" data-product-id="' + esc(data.product_id) + '">' +
      '<div class="prodComOptionalStageAImage">' + image + '</div>' +
      '<div class="prodComOptionalStageABody"><div class="prodComOptionalStageAHead"><div><strong>' + esc(data.nombre) + '</strong><span>' + esc(data.descripcion || 'Producto') + '</span></div><b>+ ' + esc(money(data.precio)) + '</b></div>' +
      '<div class="prodComOptionalStageAFields"><label class="prodComField"><span>Cantidad</span><input id="prod_com_recomendado_' + index + '_cantidad" type="text" value="' + esc(data.cantidad_label) + '"></label>' +
      '<label class="prodComField"><span>Estado visual</span><select id="prod_com_recomendado_' + index + '_estado"><option value="Visible" ' + (data.estado_visual !== 'Oculto' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (data.estado_visual === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComField"><span>Precio tomado del producto</span><input id="prod_com_recomendado_' + index + '_precio_visible" value="' + esc(money(data.precio)) + '" readonly></label></div>' +
      '<input type="hidden" id="recomendados_' + index + '_nombre" value="' + esc(data.nombre) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_desc" value="' + esc(data.descripcion) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_precio" value="' + esc(data.precio) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_estado" value="' + esc(data.estado_visual) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_badge" value="' + esc(data.badge) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_img" value="' + esc(data.imagen) + '"></div>' +
      '<button type="button" class="prodComOptionalStageADelete" data-prod-com-optionals-delete="1" aria-label="Eliminar producto agregado">×</button></article>';
  }

  function rehydrateCurrent() {
    const l = list();
    if (!l) return false;
    if (l.querySelector('[' + STYLE_SAFE_ATTR + '="1"]')) return false;
    const keys = currentKeys();
    const record = getRecordFor(keys.id, keys.slug);
    if (!record || !Array.isArray(record.items) || !record.items.length) return false;
    l.innerHTML = record.items.map(cardHtml).join('');
    window.__PRODUCTOS_COMESTIBLES_OPTIONALS_DURABLE_REHYDRATED__ = {
      product_id: keys.id,
      product_slug: keys.slug,
      count: record.items.length,
      updated_at: new Date().toISOString()
    };
    return true;
  }

  function rowId(row) {
    if (!row) return '';
    const btn = row.querySelector('[data-edit-com], [data-edit-local-product], [data-edit-supabase-product]');
    return String(
      row.dataset.localProductId ||
      row.dataset.supabaseProductId ||
      row.dataset.productRowId ||
      (btn && (btn.dataset.editCom || btn.dataset.editLocalProduct || btn.dataset.editSupabaseProduct)) ||
      ''
    ).trim();
  }

  function rowSlug(row) {
    const name = row ? row.querySelector('.prodComCell strong') : null;
    return slugify(name ? name.textContent : '');
  }

  function patchTableRows() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;
    Array.from(tbody.querySelectorAll('tr')).forEach(function (row) {
      const typeText = String(row.children && row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (typeText.includes('combo')) return;
      const record = getRecordFor(rowId(row), rowSlug(row));
      if (!record || !Array.isArray(record.items) || !record.items.length) return;
      if (row.children && row.children[6]) row.children[6].textContent = String(record.items.length);
    });
  }

  function debouncedSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveCurrent();
      patchTableRows();
    }, 80);
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (window.__productosComestiblesOptionalsDurableBridgeBound) return;
    window.__productosComestiblesOptionalsDurableBridgeBound = true;

    document.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('[data-prod-com-optionals-confirm]')) {
        setTimeout(debouncedSave, 160);
        setTimeout(patchTableRows, 320);
      }
      if (event.target && event.target.closest && event.target.closest('[data-prod-com-optionals-delete]')) {
        setTimeout(debouncedSave, 120);
      }
      if (event.target && event.target.closest && event.target.closest('#prodComSaveBtn')) {
        setTimeout(debouncedSave, 80);
        setTimeout(debouncedSave, 360);
        setTimeout(patchTableRows, 600);
      }
      if (event.target && event.target.closest && event.target.closest('[data-edit-com], [data-edit-local-product], [data-edit-supabase-product]')) {
        setTimeout(rehydrateCurrent, 220);
        setTimeout(rehydrateCurrent, 620);
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target && event.target.closest && event.target.closest('[' + STYLE_SAFE_ATTR + '="1"]')) debouncedSave();
      if (event.target && event.target.id === 'com_nombre') setTimeout(debouncedSave, 120);
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target && event.target.closest && event.target.closest('[' + STYLE_SAFE_ATTR + '="1"]')) debouncedSave();
    }, true);

    window.addEventListener('productos:payload-ready', function () {
      setTimeout(debouncedSave, 120);
      setTimeout(patchTableRows, 300);
    });

    const observer = new MutationObserver(function () {
      setTimeout(rehydrateCurrent, 120);
      setTimeout(patchTableRows, 160);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerBound = true;

    [100, 400, 900, 1600].forEach(function (delay) {
      setTimeout(function () {
        rehydrateCurrent();
        patchTableRows();
      }, delay);
    });

    window.ProductosComestiblesOptionalsDurableBridge = {
      save: saveCurrent,
      rehydrate: rehydrateCurrent,
      patchTable: patchTableRows,
      debug: function () {
        const keys = currentKeys();
        const record = getRecordFor(keys.id, keys.slug);
        return {
          active: true,
          product_id: keys.id,
          product_slug: keys.slug,
          current_cards: collectFromCards().length,
          stored_count: record && Array.isArray(record.items) ? record.items.length : 0,
          record: record || null,
          observer_bound: observerBound
        };
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
