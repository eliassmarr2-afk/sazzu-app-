(function () {
  const OWNER_TYPE = 'producto_comestible';
  const PRODUCTOS_STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  const LINKS_STORAGE_KEY = 'sazzu_entity_extra_links_v1';
  let observerStarted = false;
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
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn('[productos-comestibles-extras-persist.js] No se pudo guardar storage:', key, error); }
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

  function getExtraKey(extra) {
    const data = normalizeExtra(extra);
    return String(data.extra_id || data.id || data.title || data.nombre || '').trim().toLowerCase();
  }

  function fallbackApi() {
    function nowIso() { return new Date().toISOString(); }
    function readLinks() {
      const parsed = readJson(LINKS_STORAGE_KEY, []);
      return Array.isArray(parsed) ? parsed : [];
    }
    function writeLinks(links) { writeJson(LINKS_STORAGE_KEY, Array.isArray(links) ? links : []); }
    function sameOwner(link, ownerType, ownerId) {
      return link && link.owner_type === ownerType && String(link.owner_id || '') === String(ownerId || '');
    }
    function snapshotExtra(extra) {
      const snap = normalizeExtra(extra);
      return snap;
    }
    return {
      getExtrasForOwner(ownerType, ownerId) {
        return readLinks()
          .filter(function (link) { return sameOwner(link, ownerType, ownerId); })
          .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); })
          .map(function (link) {
            return Object.assign({}, link.snapshot_extra || {}, {
              extra_id: link.extra_id,
              link_id: link.link_id,
              orden: link.orden,
              link_estado: link.estado,
              precio_override: link.precio_override
            });
          });
      },
      setLinksForOwner(ownerType, ownerId, extras) {
        const incoming = Array.isArray(extras) ? extras : [];
        const all = readLinks();
        const previous = new Map(all.filter(function (link) { return sameOwner(link, ownerType, ownerId); }).map(function (link) { return [String(link.extra_id), link]; }));
        const untouched = all.filter(function (link) { return !sameOwner(link, ownerType, ownerId); });
        const links = incoming.map(function (extra, index) {
          const snap = snapshotExtra(extra);
          const old = previous.get(String(snap.extra_id));
          return {
            link_id: [ownerType, ownerId, snap.extra_id].map(slugify).join('__'),
            owner_type: ownerType,
            owner_id: ownerId,
            extra_id: snap.extra_id,
            orden: index + 1,
            estado: 'activo',
            precio_override: null,
            snapshot_extra: snap,
            created_at: old && old.created_at ? old.created_at : nowIso(),
            updated_at: nowIso()
          };
        });
        writeLinks(untouched.concat(links));
        return links;
      }
    };
  }

  function api() {
    return window.ProductosExtraLinks || fallbackApi();
  }

  function fieldValue(card, prefix, field) {
    const input = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });
    return input ? String(input.value || '').trim() : '';
  }

  function collectSelectedExtras() {
    const cards = Array.from(document.querySelectorAll('.prodComOptions[data-options-key="extras"] .prodComSelectedExtraCard'));
    const used = new Set();
    const extras = [];

    cards.forEach(function (card) {
      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id') || fieldValue(card, 'extras', 'nombre'),
        extra_id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id'),
        title: fieldValue(card, 'extras', 'nombre') || (card.querySelector('.prodComSelectedExtraCard__body strong') || {}).textContent,
        nombre: fieldValue(card, 'extras', 'nombre') || (card.querySelector('.prodComSelectedExtraCard__body strong') || {}).textContent,
        description: fieldValue(card, 'extras', 'desc') || (card.querySelector('.prodComSelectedExtraCard__body span') || {}).textContent,
        descripcion: fieldValue(card, 'extras', 'desc') || (card.querySelector('.prodComSelectedExtraCard__body span') || {}).textContent,
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
      const key = getExtraKey(extra);
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });

    return extras;
  }

  function currentProductId() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset.productId ? slide.dataset.productId : '').trim();
  }

  function updateProductStorage(productId, links) {
    if (!productId) return;
    const productos = readJson(PRODUCTOS_STORAGE_KEY, []);
    if (!Array.isArray(productos)) return;
    const ids = (Array.isArray(links) ? links : []).map(function (link) { return link.extra_id; }).filter(Boolean);
    const next = productos.map(function (product) {
      if (String(product.id || product.product_id || '') !== String(productId)) return product;
      return Object.assign({}, product, {
        extras: [],
        extras_ids: ids,
        extras_count: ids.length,
        relation_model: 'entity_extra_links'
      });
    });
    writeJson(PRODUCTOS_STORAGE_KEY, next);
  }

  function persistCurrentProductExtras() {
    const productId = currentProductId();
    if (!productId) return [];
    const extras = collectSelectedExtras();
    const links = api().setLinksForOwner(OWNER_TYPE, productId, extras);
    updateProductStorage(productId, links);
    window.__PRODUCTOS_COMESTIBLES_EXTRA_LINKS_LAST__ = { product_id: productId, extras: extras, links: links };
    return links;
  }

  function hydrateCurrentProductExtras() {
    const productId = currentProductId();
    const slide = document.getElementById('prodComSlide');
    if (!productId || !slide || !slide.classList.contains('is-active')) return;
    const extras = api().getExtrasForOwner(OWNER_TYPE, productId).map(normalizeExtra);
    if (!extras.length) return;
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder === 'function') {
      window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder(extras);
      if (typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') window.ProductosExtrasSelector.ensurePickButtons();
    }
  }

  function scheduleHydrate() {
    window.clearTimeout(hydrateTimer);
    hydrateTimer = window.setTimeout(hydrateCurrentProductExtras, 180);
  }

  function bind() {
    if (document.body.dataset.productosComestiblesExtrasPersistBound === '1') return;
    document.body.dataset.productosComestiblesExtrasPersistBound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComSaveBtn')) {
        setTimeout(persistCurrentProductExtras, 0);
        setTimeout(persistCurrentProductExtras, 120);
        return;
      }
      if (event.target.closest('[data-edit-com]')) {
        setTimeout(scheduleHydrate, 240);
        setTimeout(scheduleHydrate, 600);
      }
    }, false);

    window.addEventListener('productos-comestibles:saved', function () {
      setTimeout(persistCurrentProductExtras, 80);
      setTimeout(scheduleHydrate, 200);
    });

    window.addEventListener('productos-extra-links:changed', function (event) {
      const detail = event.detail || {};
      if (detail.owner_type === OWNER_TYPE && String(detail.owner_id || '') === currentProductId()) {
        setTimeout(scheduleHydrate, 160);
      }
    });
  }

  function startObserver() {
    if (observerStarted) return;
    const body = document.getElementById('prodComSlideBody');
    if (!body) return;
    observerStarted = true;
    const observer = new MutationObserver(function () { scheduleHydrate(); });
    observer.observe(body, { childList: true, subtree: true });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bind();
    startObserver();
    scheduleHydrate();
  }

  window.ProductosComestiblesExtrasPersist = {
    persist: persistCurrentProductExtras,
    hydrate: hydrateCurrentProductExtras,
    collect: collectSelectedExtras
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();
