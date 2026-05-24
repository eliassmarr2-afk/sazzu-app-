(function () {
  const PAYLOAD_KEY = 'sazzu_combos_payloads_local_v1';
  const BUILDER_KEY = 'sazzu_productos_combos_v1';
  const LINKS_KEY = 'sazzu_entity_extra_links_v1';
  const DEBUG_ID = 'prodComboExtrasDebugPanel';

  function read(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
    } catch (error) {
      console.warn('[combo extras sync] No se pudo escribir', key, error);
    }
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
  }

  function field(card, suffix) {
    const el = Array.from(card.querySelectorAll('input, select, textarea')).find(function (node) {
      const id = String(node.id || '');
      return id.indexOf('combo_extra_') === 0 && id.endsWith('_' + suffix);
    });
    return el ? String(el.value || '').trim() : '';
  }

  function text(card, selector) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
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

  function visibleExtras() {
    const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
    const used = new Set();
    const extras = [];

    cards.forEach(function (card, index) {
      const title = field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || 'Extra';
      const extra = normalizeExtra({
        id: card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || title,
        extra_id: card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || title,
        title: title,
        description: field(card, 'desc') || text(card, '.prodComboSelectedExtraCard__body span') || '',
        price: field(card, 'precio'),
        status: field(card, 'estado') || 'Activo',
        badge: field(card, 'badge'),
        image: field(card, 'img'),
        folder: field(card, 'folder') || card.dataset.extraFolder || '',
        tags: field(card, 'tags') || card.dataset.extraTags || ''
      }, index);
      const key = String(extra.extra_id || extra.id || '').toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });

    return extras;
  }

  function payloadCombo(comboId) {
    return read(PAYLOAD_KEY).find(function (combo) {
      return String(combo.product_id || '') === String(comboId || '');
    }) || null;
  }

  function builderCombo(comboId) {
    return read(BUILDER_KEY).find(function (combo) {
      return String(combo.id || combo.combo_id || '') === String(comboId || '');
    }) || null;
  }

  function bestExtras(comboId) {
    const fromDom = visibleExtras();
    if (fromDom.length) return fromDom;
    const payload = payloadCombo(comboId);
    if (payload && Array.isArray(payload.combo_extras) && payload.combo_extras.length) return payload.combo_extras.map(normalizeExtra);
    const builder = builderCombo(comboId);
    if (builder && Array.isArray(builder.extras_combo) && builder.extras_combo.length) return builder.extras_combo.map(normalizeExtra);
    return [];
  }

  function syncLinks(comboId, extras) {
    const links = read(LINKS_KEY);
    const untouched = links.filter(function (link) {
      return !(link.owner_type === 'combo' && String(link.owner_id || '') === String(comboId));
    });
    const now = new Date().toISOString();
    const next = extras.map(function (extra, index) {
      return {
        link_id: ['combo', comboId, extra.extra_id || extra.id].join('__'),
        owner_type: 'combo',
        owner_id: comboId,
        extra_id: extra.extra_id || extra.id,
        orden: index + 1,
        estado: 'activo',
        precio_override: null,
        snapshot_extra: extra,
        created_at: now,
        updated_at: now
      };
    });
    write(LINKS_KEY, untouched.concat(next));
  }

  function syncBuilder() {
    const comboId = currentComboId();
    const extras = bestExtras(comboId);
    if (!comboId || !extras.length) return null;

    const payload = payloadCombo(comboId) || {};
    const identity = payload.identity || {};
    const combos = read(BUILDER_KEY);
    const index = combos.findIndex(function (combo) {
      return String(combo.id || combo.combo_id || '') === comboId;
    });
    const base = index >= 0 ? combos[index] : {};

    const next = Object.assign({}, base, {
      id: comboId,
      combo_id: comboId,
      product_type: 'food_combo_product',
      combo: true,
      nombre: base.nombre || identity.name || document.getElementById('combo_nombre')?.value || 'Combo',
      categoria: base.categoria || identity.category || document.getElementById('combo_categoria')?.value || 'Combo rápido',
      precio: base.precio != null ? base.precio : Number(identity.base_price || document.getElementById('combo_precio')?.value || 0),
      estado: base.estado || 'Borrador',
      extras_combo: extras,
      extrasCombo: extras,
      extras_ids: extras.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean),
      extras_count: extras.length,
      updated_at: new Date().toISOString()
    });

    if (index >= 0) combos[index] = next;
    else combos.push(next);

    write(BUILDER_KEY, combos);
    syncLinks(comboId, extras);

    window.__PRODUCTOS_COMBO_EXTRAS_SYNC_LAST__ = {
      combo_id: comboId,
      extras_count: extras.length,
      updated_at: new Date().toISOString()
    };

    return next;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function panel(data) {
    let box = document.getElementById(DEBUG_ID);
    if (!box) {
      box = document.createElement('aside');
      box.id = DEBUG_ID;
      box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;width:min(460px,calc(100vw - 36px));max-height:72vh;overflow:auto;background:#0f172a;color:#e5e7eb;border-radius:8px;padding:14px;box-shadow:0 24px 80px rgba(15,23,42,.38);font-family:Inter,Arial,sans-serif';
      document.body.appendChild(box);
    }
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px"><strong style="color:#fff">Debug Extras Combo</strong><button data-close-combo-debug="1" style="border:0;background:#1d4ed8;color:#fff;border-radius:6px;padding:6px 9px;font-weight:800;cursor:pointer">Cerrar</button></div><pre style="white-space:pre-wrap;word-break:break-word;margin:0;background:rgba(255,255,255,.06);border-radius:6px;padding:12px;font-size:12px;line-height:1.45">' + esc(JSON.stringify(data, null, 2)) + '</pre>';
  }

  function snapshot(stage) {
    const comboId = currentComboId();
    const p = payloadCombo(comboId);
    const b = builderCombo(comboId);
    return {
      stage: stage,
      combo_id: comboId,
      visible_cards_detected: visibleExtras().length,
      payload_combo_extras_count: p && Array.isArray(p.combo_extras) ? p.combo_extras.length : null,
      builder_combo_extras_count: b && Array.isArray(b.extras_combo) ? b.extras_combo.length : null,
      builder_combo_extras_ids_count: b && Array.isArray(b.extras_ids) ? b.extras_ids.length : null,
      last_sync_extras_count: window.__PRODUCTOS_COMBO_EXTRAS_SYNC_LAST__ ? window.__PRODUCTOS_COMBO_EXTRAS_SYNC_LAST__.extras_count : null,
      time: new Date().toISOString()
    };
  }

  function show(stage) {
    syncBuilder();
    panel(snapshot(stage + ' antes'));
    setTimeout(function () { syncBuilder(); panel(snapshot(stage + ' 120ms')); }, 120);
    setTimeout(function () { syncBuilder(); const data = snapshot(stage + ' 650ms'); window.__PRODUCTOS_COMBO_EXTRAS_DEBUG_LAST__ = data; panel(data); }, 650);
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasSyncBound === '1') return;
    document.body.dataset.comboExtrasSyncBound = '1';

    window.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('#prodComboSaveBtn')) show('guardar combo');
      if (event.target && event.target.closest && event.target.closest('[data-close-combo-debug]')) {
        const box = document.getElementById(DEBUG_ID);
        if (box) box.remove();
      }
    }, true);

    window.ProductosComboExtrasDebug = { show: function () { show('manual'); }, snapshot: snapshot, sync: syncBuilder };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
