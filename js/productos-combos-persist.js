(function () {
  const COMBOS_STORAGE_KEY = 'sazzu_productos_combos_v1';
  const OPTIONAL_STORAGE_KEY = 'sazzu_combo_optional_products_v1';
  const LINKS_OWNER_TYPE = 'combo';
  let hydrateTimer = null;

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch (error) {
      console.warn('[productos-combos-persist.js] No se pudo leer storage:', key, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn('[productos-combos-persist.js] No se pudo guardar storage:', key, error); }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function normalizeExtra(extra) {
    const data = extra || {};
    const id = String(data.extra_id || data.id || data.nombre || data.title || '').trim();
    return {
      id,
      extra_id: id,
      title: String(data.title || data.nombre || 'Extra').trim(),
      nombre: String(data.nombre || data.title || 'Extra').trim(),
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : 0)) || 0,
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : 0)) || 0,
      status: String(data.status || data.estado || 'Activo').trim(),
      estado: String(data.estado || data.status || 'Activo').trim(),
      badge: String(data.badge || '').trim(),
      image: String(data.image || data.imagen || '').trim(),
      imagen: String(data.imagen || data.image || '').trim(),
      folder: String(data.folder || '').trim(),
      tags: String(data.tags || '').trim()
    };
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset.comboId ? slide.dataset.comboId : '').trim();
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fieldValue(card, prefix, field) {
    const input = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });
    return input ? String(input.value || '').trim() : '';
  }

  function collectComboExtras() {
    const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
    const used = new Set();
    const extras = [];
    cards.forEach(function (card) {
      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || fieldValue(card, 'combo_extra', 'extra_id') || fieldValue(card, 'combo_extra', 'id') || fieldValue(card, 'combo_extra', 'nombre'),
        extra_id: card.dataset.extraSourceId || fieldValue(card, 'combo_extra', 'extra_id') || fieldValue(card, 'combo_extra', 'id'),
        title: fieldValue(card, 'combo_extra', 'nombre') || (card.querySelector('.prodComboSelectedExtraCard__body strong') || {}).textContent,
        nombre: fieldValue(card, 'combo_extra', 'nombre') || (card.querySelector('.prodComboSelectedExtraCard__body strong') || {}).textContent,
        description: fieldValue(card, 'combo_extra', 'desc') || (card.querySelector('.prodComboSelectedExtraCard__body span') || {}).textContent,
        descripcion: fieldValue(card, 'combo_extra', 'desc') || (card.querySelector('.prodComboSelectedExtraCard__body span') || {}).textContent,
        price: fieldValue(card, 'combo_extra', 'precio'),
        precio: fieldValue(card, 'combo_extra', 'precio'),
        status: fieldValue(card, 'combo_extra', 'estado') || 'Activo',
        estado: fieldValue(card, 'combo_extra', 'estado') || 'Activo',
        badge: fieldValue(card, 'combo_extra', 'badge'),
        image: fieldValue(card, 'combo_extra', 'img'),
        imagen: fieldValue(card, 'combo_extra', 'img'),
        folder: card.dataset.extraFolder || fieldValue(card, 'combo_extra', 'folder'),
        tags: card.dataset.extraTags || fieldValue(card, 'combo_extra', 'tags')
      });
      const key = String(extra.extra_id || extra.id || '').trim().toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });
    return extras;
  }

  function getExtraLinksApi() {
    return window.ProductosExtraLinks || null;
  }

  function getOptionalPayloadFromUi(comboId) {
    if (window.ProductosCombosUpsellsUi && typeof window.ProductosCombosUpsellsUi.persist === 'function') {
      return window.ProductosCombosUpsellsUi.persist();
    }
    const payload = window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_PAYLOAD__ || readJson(OPTIONAL_STORAGE_KEY, null);
    if (payload && (!payload.combo_id || String(payload.combo_id) === String(comboId))) return payload;
    return { combo_id: comboId, items: [] };
  }

  function buildComboPayload() {
    const comboId = currentComboId() || 'combo-borrador';
    const optionalPayload = getOptionalPayloadFromUi(comboId);
    const includedPayload = window.ProductosCombosIncluidosUi && typeof window.ProductosCombosIncluidosUi.persist === 'function'
      ? window.ProductosCombosIncluidosUi.persist()
      : (window.__PRODUCTOS_COMBO_INCLUDED_PAYLOAD__ || { items: [] });
    const extras = collectComboExtras();
    let extraLinks = [];
    const api = getExtraLinksApi();
    if (api && typeof api.setLinksForOwner === 'function') {
      extraLinks = api.setLinksForOwner(LINKS_OWNER_TYPE, comboId, extras);
    }

    return {
      combo_id: comboId,
      id: comboId,
      product_type: 'food_combo_product',
      combo: true,
      structure_locked: true,
      relation_model: 'combo_commercial_builder',
      identity: {
        nombre: valueOf('combo_nombre'),
        categoria: valueOf('combo_categoria'),
        badge: valueOf('combo_badge'),
        precio: Number(valueOf('combo_precio') || 0),
        promesa: valueOf('combo_promesa'),
        estado: valueOf('combo_estado'),
        descripcion: valueOf('combo_descripcion')
      },
      imagenes: Array.from({ length: 6 }).map(function (_, i) { return valueOf('combo_img_' + (i + 1)); }).filter(Boolean),
      included_value: includedPayload && Array.isArray(includedPayload.items) ? includedPayload.items : [],
      extras_combo: extras,
      extras_ids: extraLinks.map(function (link) { return link.extra_id; }).filter(Boolean),
      extras_count: extraLinks.length,
      optional_products: optionalPayload && Array.isArray(optionalPayload.items) ? optionalPayload.items : [],
      optional_products_count: optionalPayload && Array.isArray(optionalPayload.items) ? optionalPayload.items.length : 0,
      future_keys: ['workspace_id', 'store_id', 'user_id', 'draft_version', 'published_version'],
      updated_at: new Date().toISOString()
    };
  }

  function persistCombo() {
    const payload = buildComboPayload();
    const combos = readJson(COMBOS_STORAGE_KEY, []);
    const list = Array.isArray(combos) ? combos : [];
    const index = list.findIndex(function (combo) { return String(combo.id || combo.combo_id || '') === String(payload.combo_id); });
    if (index >= 0) list[index] = Object.assign({}, list[index], payload);
    else list.unshift(payload);
    writeJson(COMBOS_STORAGE_KEY, list);
    window.__PRODUCTOS_COMBO_DRAFT_LAST__ = payload;
    window.dispatchEvent(new CustomEvent('productos-combos:persisted', { detail: { combo: payload } }));
    return payload;
  }

  function findSavedCombo(comboId) {
    const combos = readJson(COMBOS_STORAGE_KEY, []);
    if (!Array.isArray(combos)) return null;
    return combos.find(function (combo) { return String(combo.id || combo.combo_id || '') === String(comboId); }) || null;
  }

  function hydrateIdentity(combo) {
    if (!combo || !combo.identity) return;
    setValue('combo_nombre', combo.identity.nombre || '');
    setValue('combo_categoria', combo.identity.categoria || '');
    setValue('combo_badge', combo.identity.badge || '');
    setValue('combo_precio', combo.identity.precio || 0);
    setValue('combo_promesa', combo.identity.promesa || '');
    setValue('combo_estado', combo.identity.estado || 'Borrador');
    setValue('combo_descripcion', combo.identity.descripcion || '');
    (combo.imagenes || []).slice(0, 6).forEach(function (img, index) { setValue('combo_img_' + (index + 1), img); });
  }

  function hydrateExtras(comboId) {
    const api = getExtraLinksApi();
    if (!api || typeof api.getExtrasForOwner !== 'function') return;
    const extras = api.getExtrasForOwner(LINKS_OWNER_TYPE, comboId).map(normalizeExtra);
    if (!extras.length) return;
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder === 'function') {
      window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder(extras);
      if (typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') window.ProductosExtrasSelector.ensurePickButtons();
    }
  }

  function optionalCardHtml(item, index) {
    const product = (item && item.snapshot_producto) || {};
    const productId = item.product_id || product.id || product.product_id || ('upsell-' + index);
    const nombre = product.nombre || product.title || item.nombre || 'Producto upsell';
    const categoria = product.categoria || product.category || 'Producto comestible';
    const precio = Number(product.precio != null ? product.precio : (product.price || 0)) || 0;
    const imagen = product.imagen || product.image || '';
    const activo = item.activo !== false;
    const cantidad = item.cantidad_label || item.cantidad || '1 unidad';
    const estado = item.estado_visual || 'Visible';
    const imageHtml = imagen ? '<img src="' + escapeHtml(imagen) + '" alt="">' : '<span>IMG</span>';

    return '<article class="prodComboItem prodComboItem--product prodComboUpsellCard ' + (activo ? 'is-active' : 'is-disabled') + '" data-combo-upsell-card="1" data-combo-upsell-enhanced="1" data-combo-upsell-source="picker" data-product-id="' + escapeHtml(productId) + '" data-upsell-enabled="' + (activo ? '1' : '0') + '">' +
      '<button type="button" class="prodComboToggle prodComboUpsellSwitch ' + (activo ? 'is-on' : 'is-off') + '" data-combo-upsell-toggle="1" aria-label="Activar o desactivar producto upsell" aria-pressed="' + (activo ? 'true' : 'false') + '"><span class="prodComboUpsellSwitch__track"><span class="prodComboUpsellSwitch__knob"></span></span><input type="hidden" data-combo-upsell-enabled-input="1" value="' + (activo ? '1' : '0') + '"></button>' +
      '<div class="prodComboUpsellImage">' + imageHtml + '</div>' +
      '<div class="prodComboUpsellCard__body"><div class="prodComboUpsellHead"><div><strong>' + escapeHtml(nombre) + '</strong><span>' + escapeHtml(categoria) + '</span></div><b class="prodComboUpsellPrice">+ ' + escapeHtml(money(precio)) + '</b></div>' +
      '<div class="prodComboUpsellFields"><label class="prodComboField"><span>Cantidad</span><input id="combo_opcional_' + index + '_cantidad" type="text" value="' + escapeHtml(cantidad) + '"></label>' +
      '<label class="prodComboField"><span>Estado visual</span><select id="combo_opcional_' + index + '_estado"><option value="Visible" ' + (estado === 'Visible' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (estado === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComboField"><span>Precio tomado del producto</span><input id="combo_opcional_' + index + '_precio" value="' + escapeHtml(money(precio)) + '" readonly></label></div>' +
      '<input type="hidden" id="combo_opcional_' + index + '_product" value="' + escapeHtml(productId) + '"><input type="hidden" id="combo_opcional_' + index + '_nombre" value="' + escapeHtml(nombre) + '"><input type="hidden" id="combo_opcional_' + index + '_imagen" value="' + escapeHtml(imagen) + '"></div>' +
      '<button type="button" class="prodComboUpsellDelete" data-combo-upsell-delete="1" aria-label="Eliminar producto upsell"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg></button></article>';
  }

  function hydrateOptionalProducts(combo) {
    const items = combo && Array.isArray(combo.optional_products) ? combo.optional_products : [];
    const section = Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection')).find(function (sec) {
      const eyebrow = String((sec.querySelector('.prodComboEyebrow') || {}).textContent || '').toLowerCase();
      const title = String((sec.querySelector('h3') || {}).textContent || '').toLowerCase();
      return (eyebrow.includes('podés sumar') || eyebrow.includes('podes sumar')) && title.includes('agregados opcionales');
    });
    const list = section ? section.querySelector('.prodComboItems') : null;
    if (!list) return;
    if (!items.length) return;
    list.innerHTML = items.map(optionalCardHtml).join('');
    const optionalPayload = {
      combo_id: combo.combo_id || combo.id,
      section_key: 'agregados_opcionales',
      section_title: 'Agregados opcionales',
      source: 'productos_comestibles',
      relation_model: 'combo_optional_product_links',
      manual_creation_enabled: false,
      default_cards_enabled: false,
      items: items,
      updated_at: new Date().toISOString()
    };
    writeJson(OPTIONAL_STORAGE_KEY, optionalPayload);
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_PAYLOAD__ = optionalPayload;
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_LAST__ = items;
    if (window.ProductosCombosUpsellsUi && typeof window.ProductosCombosUpsellsUi.refresh === 'function') {
      window.ProductosCombosUpsellsUi.refresh();
    }
  }

  function hydrateCombo() {
    const comboId = currentComboId();
    const slide = document.getElementById('prodComboSlide');
    if (!comboId || !slide || !slide.classList.contains('is-active')) return;
    const combo = findSavedCombo(comboId);
    if (!combo) return;
    hydrateIdentity(combo);
    hydrateExtras(comboId);
    hydrateOptionalProducts(combo);
    window.__PRODUCTOS_COMBO_DRAFT_LAST__ = combo;
  }

  function scheduleHydrate() {
    window.clearTimeout(hydrateTimer);
    hydrateTimer = window.setTimeout(hydrateCombo, 260);
  }

  function bind() {
    if (document.body.dataset.productosCombosPersistBound === '1') return;
    document.body.dataset.productosCombosPersistBound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComboSaveBtn')) {
        setTimeout(persistCombo, 0);
        setTimeout(persistCombo, 140);
        return;
      }
      if (event.target.closest('#prodComboNewBtn')) {
        setTimeout(scheduleHydrate, 260);
        setTimeout(scheduleHydrate, 700);
      }
    }, false);

    window.addEventListener('productos-extra-links:changed', function (event) {
      const detail = event.detail || {};
      if (detail.owner_type === LINKS_OWNER_TYPE && String(detail.owner_id || '') === currentComboId()) {
        setTimeout(scheduleHydrate, 180);
      }
    });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bind();
    scheduleHydrate();
  }

  window.ProductosCombosPersist = {
    persist: persistCombo,
    hydrate: hydrateCombo,
    find: findSavedCombo
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();
