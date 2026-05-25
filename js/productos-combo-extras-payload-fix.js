/*
  GUARD SEGURO · Extras en Combos

  Objetivo:
  - Evitar que + Nuevo combo herede extras del mock combo-merienda-duo.
  - Sincronizar links de extras cuando el guardado real emite productos:payload-ready.

  Reglas:
  - No intercepta Guardar.
  - No crea combos.
  - No cambia IDs durante edición.
  - No duplica registros.
*/
(function () {
  const LINKS_KEY = 'sazzu_entity_extra_links_v1';
  const BUILDER_KEY = 'sazzu_productos_combos_v1';
  const OWNER_TYPE = 'combo';

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
    } catch (error) {
      console.warn('[productos-combo-extras-payload-fix.js] No se pudo escribir ' + key, error);
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

  function normalizeExtra(extra, index) {
    const data = extra || {};
    const title = String(data.title || data.name || data.nombre || 'Extra').trim();
    const id = String(data.extra_id || data.id || title).trim();
    const price = Number(String(data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio || 0)).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;

    return {
      id: id,
      extra_id: id,
      title: title,
      nombre: title,
      name: title,
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price: price,
      precio: price,
      price_delta: price,
      status: data.status || data.estado || 'Activo',
      estado: data.estado || data.status || 'Activo',
      badge: data.badge || '',
      image: data.image || data.imagen || data.image_url || '',
      imagen: data.imagen || data.image || data.image_url || '',
      image_url: data.image_url || data.image || data.imagen || '',
      folder: data.folder || '',
      tags: data.tags || '',
      position: index + 1
    };
  }

  function clearVisibleComboExtras() {
    const list = document.querySelector('.prodComboExtrasList[data-combo-extras-list="1"]');
    if (!list) return;

    list.classList.remove('prodComboExtrasList--selected');
    list.dataset.selectedExtrasCount = '0';
    list.innerHTML = '<div class="prodComboEmptyBox"><strong>Sin extras cargados todavía</strong><span>Usá + Agregar Extra para asociar extras reutilizables del banco a este combo.</span></div>';

    const section = list.closest('[data-prod-combo-extras-section="1"]');
    if (section) section.dataset.selectedExtrasCount = '0';
  }

  function prepareTrustedNewCombo() {
    const slide = document.getElementById('prodComboSlide');
    if (!slide || !slide.classList.contains('is-active')) return;

    slide.dataset.comboId = 'nuevo-combo';
    clearVisibleComboExtras();

    window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ = {
      action: 'trusted_new_combo_reset',
      combo_id: 'nuevo-combo',
      time: new Date().toISOString()
    };
  }

  function syncExtraLinks(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return [];

    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (extra) { return extra.extra_id || extra.id; });

    const allLinks = readArray(LINKS_KEY);
    const previous = new Map(
      allLinks
        .filter(function (link) {
          return link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id;
        })
        .map(function (link) { return [String(link.extra_id || ''), link]; })
    );

    const untouched = allLinks.filter(function (link) {
      return !(link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id);
    });

    const now = new Date().toISOString();
    const nextLinks = normalized.map(function (extra, index) {
      const extraId = extra.extra_id || extra.id;
      const old = previous.get(String(extraId));
      return {
        link_id: [OWNER_TYPE, id, extraId].map(slugify).join('__'),
        owner_type: OWNER_TYPE,
        owner_id: id,
        extra_id: extraId,
        orden: index + 1,
        estado: 'activo',
        precio_override: null,
        snapshot_extra: Object.assign({}, extra, { id: extraId, extra_id: extraId }),
        created_at: old && old.created_at ? old.created_at : now,
        updated_at: now
      };
    });

    writeArray(LINKS_KEY, untouched.concat(nextLinks));

    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: {
          owner_type: OWNER_TYPE,
          owner_id: id,
          links: nextLinks
        }
      }));
    } catch (_) {}

    return nextLinks;
  }

  function syncExistingBuilderCombo(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return null;

    const combos = readArray(BUILDER_KEY);
    const index = combos.findIndex(function (combo) {
      return String(combo.id || combo.combo_id || '') === id;
    });

    if (index < 0) return null;

    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (extra) { return extra.extra_id || extra.id; });

    combos[index] = Object.assign({}, combos[index], {
      extras_combo: normalized,
      extrasCombo: normalized,
      extras_ids: normalized.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean),
      extras_count: normalized.length,
      updated_at: new Date().toISOString()
    });

    writeArray(BUILDER_KEY, combos);
    return combos[index];
  }

  function handlePayloadReady(event) {
    const payload = event && event.detail ? event.detail.payload : null;
    if (!payload || payload.product_type !== 'combo') return;

    const comboId = String(payload.product_id || '').trim();
    const extras = Array.isArray(payload.combo_extras) ? payload.combo_extras : [];

    const links = syncExtraLinks(comboId, extras);
    const builderCombo = syncExistingBuilderCombo(comboId, extras);

    window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ = {
      action: 'payload_ready_sync',
      combo_id: comboId,
      extras_count: extras.length,
      links_count: links.length,
      builder_updated: !!builderCombo,
      time: new Date().toISOString()
    };
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasSafeGuardBound === '1') return;
    document.body.dataset.comboExtrasSafeGuardBound = '1';

    window.addEventListener('productos:payload-ready', handlePayloadReady);

    window.addEventListener('click', function (event) {
      const isNewCombo = event.target && event.target.closest && event.target.closest('#prodComboNewBtn');
      if (isNewCombo && event.isTrusted === true) {
        [20, 100, 260, 620].forEach(function (delay) {
          setTimeout(prepareTrustedNewCombo, delay);
        });
      }
    }, true);

    window.ProductosComboExtrasDebug = {
      snapshot: function () {
        const slide = document.getElementById('prodComboSlide');
        const comboId = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
        const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
        return {
          safe_guard_active: true,
          combo_id: comboId,
          visible_cards_detected: cards.length,
          last_action: window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ || null,
          time: new Date().toISOString()
        };
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
