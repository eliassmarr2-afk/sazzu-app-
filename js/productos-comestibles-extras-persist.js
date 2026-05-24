(function () {
  const OWNER_TYPE = 'producto_comestible';
  const PRODUCTOS_STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  const LINKS_STORAGE_KEY = 'sazzu_entity_extra_links_v1';
  let hydrateTimer = null;

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch (error) {
      console.warn('[productos-comestibles-extras-persist.js] No se pudo leer storage:', key, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[productos-comestibles-extras-persist.js] No se pudo guardar storage:', key, error);
    }
  }

  function normalizeExtra(extra) {
    const data = extra || {};
    const id = String(data.extra_id || data.id || data.nombre || data.title || ('extra-' + Date.now())).trim();
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

  function readLinks() {
    const parsed = readJson(LINKS_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  function writeLinks(links) {
    writeJson(LINKS_STORAGE_KEY, Array.isArray(links) ? links : []);
  }

  function sameOwner(link, ownerType, ownerId) {
    return link && link.owner_type === ownerType && String(link.owner_id || '') === String(ownerId || '');
  }

  function setLinksForOwner(ownerType, ownerId, extras) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];
    const incoming = Array.isArray(extras) ? extras.map(normalizeExtra) : [];
    const all = readLinks();
    const previous = new Map(all.filter(function (link) {
      return sameOwner(link, ownerType, owner);
    }).map(function (link) {
      return [String(link.extra_id), link];
    }));
    const untouched = all.filter(function (link) {
      return !sameOwner(link, ownerType, owner);
    });
    const now = new Date().toISOString();
    const nextOwnerLinks = incoming.map(function (extra, index) {
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
    writeLinks(untouched.concat(nextOwnerLinks));
    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: { owner_type: ownerType, owner_id: owner, links: nextOwnerLinks }
      }));
    } catch (_) {}
    return nextOwnerLinks;
  }

  function getExtrasForOwner(ownerType, ownerId) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];
    return readLinks()
      .filter(function (link) { return sameOwner(link, ownerType, owner); })
      .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); })
      .map(function (link) {
        return normalizeExtra(Object.assign({}, link.snapshot_extra || {}, {
          id: link.extra_id,
          extra_id: link.extra_id
        }));
      });
  }

  function productIdFromSlide() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset.productId ? slide.dataset.productId : '').trim();
  }

  function fieldValue(card, prefix, field) {
    const direct = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });
    return direct ? String(direct.value || '').trim() : '';
  }

  function collectSelectedExtrasFromDom() {
    const cards = Array.from(document.querySelectorAll('.prodComOptions[data-options-key="extras"] .prodComSelectedExtraCard'));
    const used = new Set();
    const extras = [];

    cards.forEach(function (card) {
      const title = fieldValue(card, 'extras', 'nombre') || (card.querySelector('.prodComSelectedExtraCard__body strong') || {}).textContent || '';
      const desc = fieldValue(card, 'extras', 'desc') || (card.querySelector('.prodComSelectedExtraCard__body span') || {}).textContent || '';
      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id') || title,
        extra_id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id') || title,
        title: title,
        nombre: title,
        description: desc,
        descripcion: desc,
        price: fieldValue(card, 'extras', 'precio'),
        precio: fieldValue(card, 'extras', 'precio'),
        status: fieldValue(card, 'extras', 'estado') || 'Activo',
        estado: fieldValue(card, 'extras', 'estado') || 'Activo',
        badge: fieldValue(card, 'extras', 'badge'),
        image: fieldValue(card, 'extras', 'img'),
        imagen: fieldValue(card, 'extras', 'img'),
        folder: card.dataset.extraFolder || fieldValue(card, 'extras', 'folder'),
        tags: card.dataset.extraTags || fieldValue(card, 'extras', 'tags')
      });
      const key = String(extra.extra_id || extra.id || '').trim().toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });

    return extras;
  }

  function mirrorExtrasIntoProduct(productId, extras) {
    const productos = readJson(PRODUCTOS_STORAGE_KEY, []);
    if (!Array.isArray(productos) || !productId) return;
    const ids = extras.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean);
    const next = productos.map(function (product) {
      const id = String(product.id || product.product_id || '').trim();
      if (id !== String(productId)) return product;
      return Object.assign({}, product, {
        extras: extras,
        extras_ids: ids,
        extras_count: ids.length,
        relation_model: 'entity_extra_links'
      });
    });
    writeJson(PRODUCTOS_STORAGE_KEY, next);
  }

  function persistCurrentProductExtras() {
    const productId = productIdFromSlide();
    if (!productId) return [];
    const extras = collectSelectedExtrasFromDom();
    const links = setLinksForOwner(OWNER_TYPE, productId, extras);
    mirrorExtrasIntoProduct(productId, extras);
    window.__PRODUCTOS_COMESTIBLES_EXTRA_LINKS_LAST__ = {
      product_id: productId,
      extras: extras,
      links: links
    };
    return links;
  }

  function renderExtrasIntoProductSlide(extras) {
    if (!extras.length) return false;
    if (!window.ProductosExtrasSelector || typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder !== 'function') return false;
    window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder(extras);
    if (typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') {
      window.ProductosExtrasSelector.ensurePickButtons();
    }
    return true;
  }

  function hydrateCurrentProductExtras() {
    const productId = productIdFromSlide();
    const slide = document.getElementById('prodComSlide');
    if (!productId || !slide || !slide.classList.contains('is-active')) return;

    const linked = getExtrasForOwner(OWNER_TYPE, productId);
    if (linked.length && renderExtrasIntoProductSlide(linked)) return;

    const productos = readJson(PRODUCTOS_STORAGE_KEY, []);
    const product = Array.isArray(productos) ? productos.find(function (item) {
      return String(item.id || item.product_id || '') === String(productId);
    }) : null;
    const mirrored = product && Array.isArray(product.extras) ? product.extras.map(normalizeExtra) : [];
    if (mirrored.length) {
      setLinksForOwner(OWNER_TYPE, productId, mirrored);
      renderExtrasIntoProductSlide(mirrored);
    }
  }

  function scheduleHydrate(delay) {
    window.clearTimeout(hydrateTimer);
    hydrateTimer = window.setTimeout(hydrateCurrentProductExtras, delay || 220);
  }

  function schedulePersist() {
    [40, 180, 420].forEach(function (delay) {
      setTimeout(persistCurrentProductExtras, delay);
    });
  }

  function bind() {
    if (document.body.dataset.productosComestiblesExtrasPersistV2Bound === '1') return;
    document.body.dataset.productosComestiblesExtrasPersistV2Bound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComSaveBtn')) {
        schedulePersist();
        return;
      }
      if (event.target.closest('[data-edit-com]')) {
        [220, 520, 950].forEach(function (delay) { setTimeout(function () { scheduleHydrate(60); }, delay); });
        return;
      }
      if (event.target.closest('#prodExtrasSelectConfirm')) {
        setTimeout(function () {
          const slide = document.getElementById('prodComSlide');
          if (slide && slide.classList.contains('is-active') && productIdFromSlide()) persistCurrentProductExtras();
        }, 260);
      }
    }, true);

    window.addEventListener('productos-comestibles:saved', function () {
      schedulePersist();
      setTimeout(function () { scheduleHydrate(60); }, 500);
    });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bind();
    scheduleHydrate(300);
  }

  window.ProductosComestiblesExtrasPersist = {
    persist: persistCurrentProductExtras,
    hydrate: hydrateCurrentProductExtras,
    collect: collectSelectedExtrasFromDom,
    get: function (productId) { return getExtrasForOwner(OWNER_TYPE, productId); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();
