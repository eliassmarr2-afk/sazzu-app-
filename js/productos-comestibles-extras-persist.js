(function () {
  if (
    window.ProductosComestiblesExtrasPersist &&
    window.ProductosComestiblesExtrasPersist.__stageA === '2026-05-24'
  ) {
    return;
  }

  const OWNER_TYPE = 'producto_comestible';
  const PRODUCTOS_STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  const LINKS_STORAGE_KEY = 'sazzu_entity_extra_links_v1';

  let hydrateTimer = null;
  let observerStarted = false;

  function nowIso() {
    return new Date().toISOString();
  }

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '+ $' + Number(value || 0).toLocaleString('es-AR');
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
    const rawId = String(data.extra_id || data.id || '').trim();
    const title = String(data.title || data.nombre || 'Extra').trim();
    const fallbackId = 'extra-' + slugify(title);
    const id = rawId || fallbackId;

    return {
      id,
      extra_id: id,
      title,
      nombre: String(data.nombre || data.title || title || 'Extra').trim(),
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : 0)) || 0,
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : 0)) || 0,
      status: String(data.status || data.estado || 'Activo').trim(),
      estado: String(data.estado || data.status || 'Activo').trim(),
      badge: String(data.badge || '').trim(),
      image: String(data.image || data.imagen || '').trim(),
      imagen: String(data.imagen || data.image || '').trim(),
      folder: String(data.folder || data.carpeta || '').trim(),
      tags: String(data.tags || data.etiquetas || '').trim()
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
    return link &&
      link.owner_type === ownerType &&
      String(link.owner_id || '') === String(ownerId || '');
  }

  function setLinksForOwner(ownerType, ownerId, extras) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];

    const incoming = Array.isArray(extras)
      ? extras.map(normalizeExtra).filter(function (extra) {
          return extra.extra_id || extra.id;
        })
      : [];

    const all = readLinks();

    const previous = new Map(
      all
        .filter(function (link) {
          return sameOwner(link, ownerType, owner);
        })
        .map(function (link) {
          return [String(link.extra_id), link];
        })
    );

    const untouched = all.filter(function (link) {
      return !sameOwner(link, ownerType, owner);
    });

    const now = nowIso();

    const nextOwnerLinks = incoming.map(function (extra, index) {
      const old = previous.get(String(extra.extra_id));

      return {
        link_id: [ownerType, owner, extra.extra_id].map(slugify).join('__'),
        owner_type: ownerType,
        owner_id: owner,
        extra_id: extra.extra_id,
        orden: index + 1,
        estado: 'activo',
        precio_override: extra.precio_override != null ? Number(extra.precio_override) : null,
        snapshot_extra: extra,
        created_at: old && old.created_at ? old.created_at : now,
        updated_at: now
      };
    });

    writeLinks(untouched.concat(nextOwnerLinks));

    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: {
          owner_type: ownerType,
          owner_id: owner,
          links: nextOwnerLinks
        }
      }));
    } catch (_) {}

    return nextOwnerLinks;
  }

  function getExtrasForOwner(ownerType, ownerId) {
    const owner = String(ownerId || '').trim();
    if (!owner) return [];

    return readLinks()
      .filter(function (link) {
        return sameOwner(link, ownerType, owner);
      })
      .sort(function (a, b) {
        return Number(a.orden || 0) - Number(b.orden || 0);
      })
      .map(function (link) {
        return normalizeExtra(Object.assign({}, link.snapshot_extra || {}, {
          id: link.extra_id,
          extra_id: link.extra_id
        }));
      });
  }

  function productIdFromSlide() {
    const slide = document.getElementById('prodComSlide');
    if (!slide || !slide.classList.contains('is-active')) return '';
    return String(slide.dataset.productId || '').trim();
  }

  function getActiveExtrasList() {
    return document.querySelector('.prodComOptions[data-options-key="extras"]');
  }

  function fieldValue(card, prefix, field) {
    if (!card) return '';

    const direct = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });

    return direct ? String(direct.value || '').trim() : '';
  }

  function textValue(card, selector) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
  }

  function collectSelectedExtrasFromDom() {
    const list = getActiveExtrasList();
    if (!list) return [];

    const cards = Array.from(
      list.querySelectorAll('.prodComSelectedExtraCard, .prodComOption[data-option-key="extras"]')
    ).filter(function (card) {
      return !card.classList.contains('prodComExtrasEmptyState');
    });

    const used = new Set();
    const extras = [];

    cards.forEach(function (card) {
      const title =
        fieldValue(card, 'extras', 'nombre') ||
        textValue(card, '.prodComSelectedExtraCard__body strong') ||
        fieldValue(card, 'extras', 'title') ||
        'Extra';

      const desc =
        fieldValue(card, 'extras', 'desc') ||
        textValue(card, '.prodComSelectedExtraCard__body span') ||
        '';

      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id') || title,
        extra_id: card.dataset.extraSourceId || fieldValue(card, 'extras', 'extra_id') || fieldValue(card, 'extras', 'id') || title,
        title,
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

    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra);

    const ids = normalized
      .map(function (extra) {
        return extra.extra_id || extra.id;
      })
      .filter(Boolean);

    const next = productos.map(function (product) {
      const id = String(product.id || product.product_id || '').trim();
      if (id !== String(productId)) return product;

      return Object.assign({}, product, {
        extras: normalized,
        extras_ids: ids,
        extras_count: ids.length,
        relation_model: 'entity_extra_links',
        updated_at: nowIso()
      });
    });

    writeJson(PRODUCTOS_STORAGE_KEY, next);
  }

  function getProductMirrorExtras(productId) {
    const productos = readJson(PRODUCTOS_STORAGE_KEY, []);
    if (!Array.isArray(productos) || !productId) return [];

    const product = productos.find(function (item) {
      return String(item.id || item.product_id || '') === String(productId);
    });

    if (!product || !Array.isArray(product.extras)) return [];

    return product.extras.map(normalizeExtra).filter(function (extra) {
      return extra.extra_id || extra.id;
    });
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function selectedExtraHiddenFields(extra, index) {
    const data = normalizeExtra(extra);

    return [
      ['id', data.id],
      ['extra_id', data.extra_id || data.id],
      ['nombre', data.title || data.nombre],
      ['desc', data.description || data.descripcion],
      ['precio', data.price],
      ['estado', data.status || data.estado],
      ['badge', data.badge],
      ['img', data.image || data.imagen],
      ['folder', data.folder],
      ['tags', data.tags]
    ].map(function (pair) {
      return '<input type="hidden" id="extras_' + index + '_' + escapeHtml(pair[0]) + '" value="' + escapeHtml(pair[1]) + '">';
    }).join('');
  }

  function selectedExtraCardHtml(extra, index) {
    const data = normalizeExtra(extra);

    const imageHtml = data.image
      ? '<img src="' + escapeHtml(data.image) + '" alt="">'
      : '<span>4×4</span>';

    const badgeHtml = data.badge
      ? '<span class="prodComSelectedExtraCard__badge">' + escapeHtml(data.badge) + '</span>'
      : '<span class="prodComSelectedExtraCard__badge prodComSelectedExtraCard__badge--soft">Banco de extras</span>';

    return '' +
      '<article class="prodComOption prodComSelectedExtraCard" data-option-key="extras" data-extra-source-id="' + escapeHtml(data.extra_id || data.id) + '" data-extra-folder="' + escapeHtml(data.folder) + '" data-extra-tags="' + escapeHtml(data.tags) + '">' +
        '<div class="prodComSelectedExtraCard__image">' + imageHtml + '</div>' +
        '<div class="prodComSelectedExtraCard__body"><strong>' + escapeHtml(data.title || data.nombre) + '</strong><span>' + escapeHtml(data.description || data.descripcion || 'Extra agregado al producto.') + '</span></div>' +
        '<div class="prodComSelectedExtraCard__meta">' + badgeHtml + '<b>' + escapeHtml(money(data.price || data.precio)) + '</b></div>' +
        '<button type="button" class="prodComSelectedExtraCard__delete" data-remove-selected-extra="' + escapeHtml(data.extra_id || data.id) + '" aria-label="Eliminar extra ' + escapeHtml(data.title || data.nombre) + '">' + trashIcon() + '</button>' +
        selectedExtraHiddenFields(data, index) +
      '</article>';
  }

  function renderExtrasIntoProductSlide(extras) {
    const list = getActiveExtrasList();
    if (!list) return false;

    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra).filter(function (extra) {
      return extra.extra_id || extra.id;
    });

    if (!normalized.length) {
      list.classList.remove('prodComOptions--selectedExtras');
      list.dataset.selectedExtrasCount = '0';
      list.innerHTML = '<div class="prodComExtrasEmptyState">Sin extras seleccionados. Usá + Agregar Extra para traerlos desde el Banco.</div>';
      return true;
    }

    list.classList.add('prodComOptions--selectedExtras');
    list.dataset.selectedExtrasCount = String(normalized.length);
    list.innerHTML = normalized.map(selectedExtraCardHtml).join('');

    const section = list.closest('[data-prod-com-section="extras"]');
    if (section) section.dataset.selectedExtrasCount = String(normalized.length);

    if (
      window.ProductosExtrasSelector &&
      typeof window.ProductosExtrasSelector.ensurePickButtons === 'function'
    ) {
      window.ProductosExtrasSelector.ensurePickButtons();
    }

    return true;
  }

  function persistCurrentProductExtras() {
    const productId = productIdFromSlide();
    if (!productId) return [];

    const extras = collectSelectedExtrasFromDom();
    const links = setLinksForOwner(OWNER_TYPE, productId, extras);

    mirrorExtrasIntoProduct(productId, extras);

    window.__PRODUCTOS_COMESTIBLES_EXTRA_LINKS_LAST__ = {
      product_id: productId,
      extras,
      links,
      updated_at: nowIso()
    };

    try {
      window.dispatchEvent(new CustomEvent('productos-comestibles-extras:stage-a-persisted', {
        detail: window.__PRODUCTOS_COMESTIBLES_EXTRA_LINKS_LAST__
      }));
    } catch (_) {}

    return links;
  }

  function hydrateCurrentProductExtras() {
    const productId = productIdFromSlide();
    const slide = document.getElementById('prodComSlide');

    if (!productId || !slide || !slide.classList.contains('is-active')) return;

    let extras = getExtrasForOwner(OWNER_TYPE, productId);

    if (!extras.length) {
      extras = getProductMirrorExtras(productId);
      if (extras.length) setLinksForOwner(OWNER_TYPE, productId, extras);
    }

    if (!extras.length) return;

    renderExtrasIntoProductSlide(extras);
    mirrorExtrasIntoProduct(productId, extras);
  }

  function scheduleHydrate(delay) {
    window.clearTimeout(hydrateTimer);
    hydrateTimer = window.setTimeout(hydrateCurrentProductExtras, delay || 180);
  }

  function scheduleHydrateBurst() {
    [120, 360, 760, 1200].forEach(function (delay) {
      setTimeout(function () {
        scheduleHydrate(40);
      }, delay);
    });
  }

  function schedulePersistBurst() {
    [80, 260, 620].forEach(function (delay) {
      setTimeout(persistCurrentProductExtras, delay);
    });
  }

  function bind() {
    if (document.body.dataset.productosComestiblesExtrasPersistStageA === '1') return;
    document.body.dataset.productosComestiblesExtrasPersistStageA = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComSaveBtn')) {
        schedulePersistBurst();
        return;
      }

      if (event.target.closest('[data-edit-com]')) {
        scheduleHydrateBurst();
        return;
      }

      if (event.target.closest('#prodExtrasSelectConfirm')) {
        schedulePersistBurst();
        return;
      }

      if (event.target.closest('[data-remove-selected-extra]')) {
        schedulePersistBurst();
      }
    }, true);

    window.addEventListener('productos-comestibles:saved', function () {
      schedulePersistBurst();
      scheduleHydrateBurst();
    });

    window.addEventListener('productos-extra-links:changed', function (event) {
      const detail = event.detail || {};

      if (
        detail.owner_type === OWNER_TYPE &&
        String(detail.owner_id || '') === productIdFromSlide()
      ) {
        scheduleHydrate(180);
      }
    });
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    const observer = new MutationObserver(function () {
      const productId = productIdFromSlide();
      if (!productId) return;

      const list = getActiveExtrasList();
      if (!list) return;

      if (list.dataset.stageAHydrated === productId) return;

      list.dataset.stageAHydrated = productId;
      scheduleHydrate(160);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    bind();
    startObserver();
    scheduleHydrate(260);
  }

  window.ProductosComestiblesExtrasPersist = {
    __stageA: '2026-05-24',
    persist: persistCurrentProductExtras,
    hydrate: hydrateCurrentProductExtras,
    collect: collectSelectedExtrasFromDom,
    get: function (productId) {
      return getExtrasForOwner(OWNER_TYPE, productId);
    },
    render: renderExtrasIntoProductSlide
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();