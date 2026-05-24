/* =========================================================
   PRODUCTOS · EXTRA LINKS ENGINE
   Capa relacional local para asociar extras reutilizables a entidades.
   Preparado para migrar directo a Supabase.
   ========================================================= */
(function () {
  const STORAGE_KEY = 'sazzu_entity_extra_links_v1';
  const OWNER_TYPES = {
    PRODUCTO_COMESTIBLE: 'producto_comestible',
    COMBO: 'combo'
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function normalizeOwnerType(ownerType) {
    const value = String(ownerType || '').trim().toLowerCase();
    if (value === OWNER_TYPES.COMBO) return OWNER_TYPES.COMBO;
    return OWNER_TYPES.PRODUCTO_COMESTIBLE;
  }

  function normalizeId(value, fallback) {
    const clean = String(value || '').trim();
    return clean || fallback || ('id-' + Date.now());
  }

  function readLinks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('[productos-extra-links.js] No se pudo leer storage:', error);
    }
    return [];
  }

  function writeLinks(links) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(links) ? links : []));
    } catch (error) {
      console.warn('[productos-extra-links.js] No se pudo guardar storage:', error);
    }
  }

  function snapshotExtra(extra) {
    const data = extra || {};
    const extraId = normalizeId(data.extra_id || data.id, 'extra-' + slugify(data.title || data.nombre || 'extra'));
    return {
      extra_id: extraId,
      id: extraId,
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

  function buildLinkId(ownerType, ownerId, extraId) {
    return [
      normalizeOwnerType(ownerType),
      normalizeId(ownerId, 'owner'),
      normalizeId(extraId, 'extra')
    ].map(slugify).join('__');
  }

  function makeLink(ownerType, ownerId, extra, order, previous) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, 'owner');
    const snapshot = snapshotExtra(extra);
    const linkId = buildLinkId(type, owner, snapshot.extra_id);
    const createdAt = previous && previous.created_at ? previous.created_at : nowIso();

    return {
      link_id: linkId,
      owner_type: type,
      owner_id: owner,
      extra_id: snapshot.extra_id,
      orden: Number.isFinite(Number(order)) ? Number(order) : 0,
      estado: String((extra && (extra.link_estado || extra.estado_link)) || (previous && previous.estado) || 'activo'),
      precio_override: extra && extra.precio_override != null ? Number(extra.precio_override) : (previous && previous.precio_override != null ? previous.precio_override : null),
      snapshot_extra: snapshot,
      created_at: createdAt,
      updated_at: nowIso()
    };
  }

  function sameOwner(link, ownerType, ownerId) {
    return link &&
      link.owner_type === normalizeOwnerType(ownerType) &&
      String(link.owner_id || '') === String(ownerId || '');
  }

  function getLinksForOwner(ownerType, ownerId) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, '');
    if (!owner) return [];
    return readLinks()
      .filter(function (link) { return sameOwner(link, type, owner); })
      .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); });
  }

  function getExtrasForOwner(ownerType, ownerId) {
    return getLinksForOwner(ownerType, ownerId).map(function (link) {
      return Object.assign({}, clone(link.snapshot_extra) || {}, {
        extra_id: link.extra_id,
        link_id: link.link_id,
        link_estado: link.estado,
        orden: link.orden,
        precio_override: link.precio_override
      });
    });
  }

  function setLinksForOwner(ownerType, ownerId, extras) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, '');
    if (!owner) return [];

    const incoming = Array.isArray(extras) ? extras : [];
    const all = readLinks();
    const previousForOwner = all.filter(function (link) { return sameOwner(link, type, owner); });
    const previousByExtra = new Map(previousForOwner.map(function (link) { return [String(link.extra_id), link]; }));
    const untouched = all.filter(function (link) { return !sameOwner(link, type, owner); });

    const nextForOwner = incoming.map(function (extra, index) {
      const snap = snapshotExtra(extra);
      const previous = previousByExtra.get(String(snap.extra_id));
      return makeLink(type, owner, snap, index + 1, previous);
    });

    const next = untouched.concat(nextForOwner);
    writeLinks(next);
    dispatchChanged(type, owner, nextForOwner);
    return clone(nextForOwner);
  }

  function upsertExtraForOwner(ownerType, ownerId, extra, order) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, '');
    if (!owner || !extra) return null;

    const all = readLinks();
    const snap = snapshotExtra(extra);
    const linkId = buildLinkId(type, owner, snap.extra_id);
    const index = all.findIndex(function (link) { return link.link_id === linkId; });
    const link = makeLink(type, owner, snap, order || getLinksForOwner(type, owner).length + 1, index >= 0 ? all[index] : null);

    if (index >= 0) all[index] = link;
    else all.push(link);

    writeLinks(all);
    dispatchChanged(type, owner, getLinksForOwner(type, owner));
    return clone(link);
  }

  function removeExtraFromOwner(ownerType, ownerId, extraId) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, '');
    const extra = normalizeId(extraId, '');
    if (!owner || !extra) return [];

    const next = readLinks().filter(function (link) {
      return !(sameOwner(link, type, owner) && String(link.extra_id || '') === String(extra));
    });

    const normalizedOwnerLinks = normalizeOrder(next.filter(function (link) { return sameOwner(link, type, owner); }));
    const others = next.filter(function (link) { return !sameOwner(link, type, owner); });
    const finalLinks = others.concat(normalizedOwnerLinks);

    writeLinks(finalLinks);
    dispatchChanged(type, owner, normalizedOwnerLinks);
    return clone(normalizedOwnerLinks);
  }

  function clearOwner(ownerType, ownerId) {
    const type = normalizeOwnerType(ownerType);
    const owner = normalizeId(ownerId, '');
    if (!owner) return [];
    const next = readLinks().filter(function (link) { return !sameOwner(link, type, owner); });
    writeLinks(next);
    dispatchChanged(type, owner, []);
    return [];
  }

  function normalizeOrder(links) {
    return (Array.isArray(links) ? links : [])
      .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); })
      .map(function (link, index) {
        return Object.assign({}, link, { orden: index + 1, updated_at: nowIso() });
      });
  }

  function dispatchChanged(ownerType, ownerId, links) {
    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: {
          owner_type: ownerType,
          owner_id: ownerId,
          links: clone(links || [])
        }
      }));
    } catch (error) {
      console.warn('[productos-extra-links.js] No se pudo emitir evento:', error);
    }
  }

  function autoloadScript(loaderId, src, globalName) {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (globalName && window[globalName]) return;
    if (document.querySelector('script[data-loader="' + loaderId + '"]')) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute('data-loader', loaderId);
    document.body.appendChild(script);
  }

  function autoloadComboUis() {
    autoloadScript('productos-combos-incluidos-ui-js', '../js/productos-combos-incluidos-ui.js', 'ProductosCombosIncluidosUi');
    autoloadScript('productos-combos-upsells-ui-js', '../js/productos-combos-upsells-ui.js', 'ProductosCombosUpsellsUi');
  }

  window.ProductosExtraLinks = {
    STORAGE_KEY: STORAGE_KEY,
    OWNER_TYPES: OWNER_TYPES,
    readLinks: readLinks,
    writeLinks: writeLinks,
    snapshotExtra: snapshotExtra,
    buildLinkId: buildLinkId,
    getLinksForOwner: getLinksForOwner,
    getExtrasForOwner: getExtrasForOwner,
    setLinksForOwner: setLinksForOwner,
    upsertExtraForOwner: upsertExtraForOwner,
    removeExtraFromOwner: removeExtraFromOwner,
    clearOwner: clearOwner,
    normalizeOwnerType: normalizeOwnerType
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoloadComboUis);
  } else {
    autoloadComboUis();
  }
  document.addEventListener('sazzu:page:load', autoloadComboUis);
  window.addEventListener('load', autoloadComboUis);
})();