(function () {
  const LINKS_STORAGE_KEY = 'sazzu_entity_extra_links_v1';
  const PRODUCTS_STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  const COMBOS_STORAGE_KEY = 'sazzu_productos_combos_v1';
  let hydrateTimer = null;

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch (error) {
      console.warn('[productos-extras-live-persist.js] No se pudo leer storage:', key, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[productos-extras-live-persist.js] No se pudo guardar storage:', key, error);
    }
  }

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
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

  function fieldValue(card, prefix, field) {
    const fieldEl = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });
    return fieldEl ? String(fieldEl.value || '').trim() : '';
  }

  function collectProductExtras() {
    return collectExtras('.prodComOptions[data-options-key="extras"] .prodComSelectedExtraCard', 'extras', '.prodComSelectedExtraCard__body');
  }

  function collectComboExtras() {
    return collectExtras('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard', 'combo_extra', '.prodComboSelectedExtraCard__body');
  }

  function collectExtras(selector, prefix, bodySelector) {
    const used = new Set();
    const extras = [];
    Array.from(document.querySelectorAll(selector)).forEach(function (card) {
      const body = card.querySelector(bodySelector);
      const title = fieldValue(card, prefix, 'nombre') || (body && body.querySelector('strong') ? body.querySelector('strong').textContent : '');
      const desc = fieldValue(card, prefix, 'desc') || (body && body.querySelector('span') ? body.querySelector('span').textContent : '');
      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || fieldValue(card, prefix, 'extra_id') || fieldValue(card, prefix, 'id') || title,
        extra_id: card.dataset.extraSourceId || fieldValue(card, prefix, 'extra_id') || fieldValue(card, prefix, 'id') || title,
        title,
        nombre: title,
        description: desc,
        descripcion: desc,
        price: fieldValue(card, prefix, 'precio'),
        precio: fieldValue(card, prefix, 'precio'),
        status: fieldValue(card, prefix, 'estado') || 'Activo',
        estado: fieldValue(card, prefix, 'estado') || 'Activo',
        badge: fieldValue(card, prefix, 'badge'),
        image: fieldValue(card, prefix, 'img'),
        imagen: fieldValue(card, prefix, 'img'),
        folder: card.dataset.extraFolder || fieldValue(card, prefix, 'folder'),
        tags: card.dataset.extraTags || fieldValue(card, prefix, 'tags')
      });
      const key = String(extra.extra_id || extra.id || '').trim().toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });
    return extras;
  }

  function setLinks(ownerType, ownerId, extras) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];
    const all = readJson(LINKS_STORAGE_KEY, []);
    const rows = Array.isArray(all) ? all : [];
    const previous = new Map(rows
      .filter(function (link) { return link.owner_type === ownerType && String(link.owner_id || '') === owner; })
      .map(function (link) { return [String(link.extra_id), link]; }));
    const untouched = rows.filter(function (link) {
      return !(link.owner_type === ownerType && String(link.owner_id || '') === owner);
    });
    const now = new Date().toISOString();
    const links = extras.map(normalizeExtra).filter(function (extra) { return extra.extra_id; }).map(function (extra, index) {
      const old = previous.get(String(extra.extra_id));
      return {
        link_id: [ownerType, owner, extra.extra_id].map(slugify).join('__'),
        owner_type: ownerType,
        owner_id: owner,
        extra_id: extra.extra_id,
        orden: index + 1,
        estado: 'activo',
        precio_override: null,
        snapshot_extra: extra,
        created_at: old && old.created_at ? old.created_at : now,
        updated_at: now
      };
    });
    writeJson(LINKS_STORAGE_KEY, untouched.concat(links));
    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: { owner_type: ownerType, owner_id: owner, links: links }
      }));
    } catch (_) {}
    return links;
  }

  function getLinks(ownerType, ownerId) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];
    const rows = readJson(LINKS_STORAGE_KEY, []);
    return (Array.isArray(rows) ? rows : [])
      .filter(function (link) { return link.owner_type === ownerType && String(link.owner_id || '') === owner; })
      .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); });
  }

  function getExtras(ownerType, ownerId) {
    return getLinks(ownerType, ownerId).map(function (link) {
      return normalizeExtra(Object.assign({}, link.snapshot_extra || {}, {
        id: link.extra_id,
        extra_id: link.extra_id
      }));
    });
  }

  function activeProductId() {
    const slide = document.getElementById('prodComSlide');
    return slide && slide.classList.contains('is-active') ? String(slide.dataset.productId || '').trim() : '';
  }

  function activeComboId() {
    const slide = document.getElementById('prodComboSlide');
    return slide && slide.classList.contains('is-active') ? String(slide.dataset.comboId || '').trim() : '';
  }

  function mirrorProduct(productId, extras) {
    const products = readJson(PRODUCTS_STORAGE_KEY, []);
    if (!Array.isArray(products) || !productId) return;
    const ids = extras.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean);
    writeJson(PRODUCTS_STORAGE_KEY, products.map(function (product) {
      const id = String(product.id || product.product_id || '').trim();
      if (id !== String(productId)) return product;
      return Object.assign({}, product, {
        extras: extras,
        extras_ids: ids,
        extras_count: ids.length,
        relation_model: 'entity_extra_links'
      });
    }));
  }

  function mirrorCombo(comboId, extras) {
    const combos = readJson(COMBOS_STORAGE_KEY, []);
    if (!Array.isArray(combos) || !comboId) return;
    const ids = extras.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean);
    writeJson(COMBOS_STORAGE_KEY, combos.map(function (combo) {
      const id = String(combo.id || combo.combo_id || '').trim();
      if (id !== String(comboId)) return combo;
      return Object.assign({}, combo, {
        extrasCombo: extras,
        extras_combo: extras,
        extras_ids: ids,
        extras_count: ids.length,
        extras_combo_source: 'extras_bank'
      });
    }));
  }

  function persistActiveExtras() {
    const productId = activeProductId();
    if (productId) {
      const extras = collectProductExtras();
      setLinks('producto_comestible', productId, extras);
      mirrorProduct(productId, extras);
      window.__PRODUCTOS_COMESTIBLES_EXTRA_LINKS_LAST__ = { product_id: productId, extras };
      return;
    }

    const comboId = activeComboId();
    if (comboId) {
      const extras = collectComboExtras();
      setLinks('combo', comboId, extras);
      mirrorCombo(comboId, extras);
      window.__PRODUCTOS_COMBO_EXTRA_LINKS_LAST__ = { combo_id: comboId, extras };
    }
  }

  function hydrateActiveExtras() {
    const productId = activeProductId();
    if (productId) {
      const extras = getExtras('producto_comestible', productId);
      if (extras.length && window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder === 'function') {
        window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder(extras);
        window.ProductosExtrasSelector.ensurePickButtons && window.ProductosExtrasSelector.ensurePickButtons();
      }
      return;
    }

    const comboId = activeComboId();
    if (comboId) {
      const extras = getExtras('combo', comboId);
      if (extras.length && window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder === 'function') {
        window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder(extras);
        window.ProductosExtrasSelector.ensurePickButtons && window.ProductosExtrasSelector.ensurePickButtons();
      }
    }
  }

  function scheduleHydrate() {
    clearTimeout(hydrateTimer);
    hydrateTimer = setTimeout(hydrateActiveExtras, 180);
  }

  function bind() {
    if (document.body.dataset.productosExtrasLivePersistBound === '1') return;
    document.body.dataset.productosExtrasLivePersistBound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodExtrasSelectConfirm')) {
        setTimeout(persistActiveExtras, 240);
        return;
      }
      if (event.target.closest('[data-remove-selected-extra]')) {
        setTimeout(persistActiveExtras, 100);
        return;
      }
      if (event.target.closest('#prodComSaveBtn, #prodComboSaveBtn')) {
        setTimeout(persistActiveExtras, 40);
        setTimeout(persistActiveExtras, 220);
        return;
      }
      if (event.target.closest('[data-edit-com], #prodComboNewBtn')) {
        [220, 520, 920].forEach(function (delay) { setTimeout(scheduleHydrate, delay); });
      }
    }, true);
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bind();
    scheduleHydrate();
  }

  window.ProductosExtrasLivePersist = {
    persist: persistActiveExtras,
    hydrate: hydrateActiveExtras,
    getExtras: getExtras
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();
