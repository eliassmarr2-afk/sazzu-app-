/*
  Persistencia puntual de extras en Combos.

  No intercepta el botón Guardar.
  No usa observers.
  Solo guarda en el payload local cuando el selector realmente pinta extras en el combo.
*/
(function () {
  const COMBOS_KEY = 'sazzu_combos_payloads_local_v1';
  let wrapped = false;

  function readCombos() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMBOS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[productos-combo-extras-payload-fix.js] No se pudo leer combos:', error);
      return [];
    }
  }

  function writeCombos(combos) {
    try {
      localStorage.setItem(COMBOS_KEY, JSON.stringify(Array.isArray(combos) ? combos : []));
    } catch (error) {
      console.warn('[productos-combo-extras-payload-fix.js] No se pudo guardar combos:', error);
    }
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
  }

  function normalizeExtra(extra, index) {
    const data = extra || {};
    const title = String(data.title || data.name || data.nombre || 'Extra').trim();
    const id = String(data.extra_id || data.id || title).trim();
    const price = Number(data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio || 0)) || 0;

    return {
      id: id,
      extra_id: id,
      name: title,
      title: title,
      nombre: title,
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price_delta: price,
      price: price,
      precio: price,
      badge: data.badge || '',
      image_url: data.image_url || data.image || data.imagen || '',
      image: data.image || data.image_url || data.imagen || '',
      imagen: data.imagen || data.image || data.image_url || '',
      status: data.status || data.estado || 'activo',
      estado: data.estado || data.status || 'activo',
      position: data.position || index + 1
    };
  }

  function persistRenderedComboExtras(extras) {
    const comboId = currentComboId();
    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (extra) { return extra.extra_id || extra.id; });

    if (!comboId || !normalized.length) return null;

    const combos = readCombos();
    const index = combos.findIndex(function (combo) {
      return String(combo.product_id || '') === comboId;
    });

    if (index < 0) {
      window.__PRODUCTOS_COMBO_EXTRAS_PENDING__ = {
        combo_id: comboId,
        combo_extras: normalized,
        updated_at: new Date().toISOString()
      };
      return null;
    }

    combos[index] = Object.assign({}, combos[index], {
      combo_extras: normalized,
      updated_at: new Date().toISOString()
    });

    writeCombos(combos);
    window.__lastComboPayload = combos[index];
    window.__PRODUCTOS_COMBO_EXTRAS_SELECTOR_PERSIST_LAST__ = combos[index];

    if (window.ProductosPayloads && typeof window.ProductosPayloads.renderLocalRows === 'function') {
      setTimeout(function () { window.ProductosPayloads.renderLocalRows(); }, 30);
      setTimeout(function () { window.ProductosPayloads.renderLocalRows(); }, 220);
    }

    return combos[index];
  }

  function wrapSelector() {
    if (wrapped) return;
    if (!window.ProductosExtrasSelector || typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder !== 'function') return;

    const original = window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder;
    window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder = function (extras) {
      const result = original.call(window.ProductosExtrasSelector, extras);
      if (result) persistRenderedComboExtras(extras);
      return result;
    };

    wrapped = true;
    window.ProductosComboExtrasPayloadFixActive = true;
  }

  function scheduleWrap() {
    [0, 80, 220, 520, 1000].forEach(function (delay) {
      setTimeout(wrapSelector, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleWrap);
  else scheduleWrap();
  document.addEventListener('sazzu:page:load', scheduleWrap);
  window.addEventListener('load', scheduleWrap);
})();
