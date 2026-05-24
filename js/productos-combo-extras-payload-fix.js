(function () {
  var KEY = 'sazzu_combos_payloads_local_v1';

  function read() {
    try {
      var value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function write(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
  }

  function field(card, suffix) {
    var fields = Array.from(card.querySelectorAll('input, select, textarea'));
    var el = fields.find(function (node) {
      var id = String(node.id || '');
      return id.indexOf('combo_extra_') === 0 && id.endsWith('_' + suffix);
    });
    return el ? String(el.value || '').trim() : '';
  }

  function text(card, selector) {
    var el = card.querySelector(selector);
    return el ? String(el.textContent || '').trim() : '';
  }

  function number(value) {
    var parsed = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalize(extra, index) {
    var data = extra || {};
    var title = String(data.title || data.name || data.nombre || 'Extra').trim();
    var id = String(data.extra_id || data.id || title).trim();
    var rawPrice = data.price_delta != null ? data.price_delta : data.price || data.precio || 0;
    var price = Number(rawPrice) || 0;

    return {
      id: id,
      extra_id: id,
      title: title,
      name: title,
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

  function collectVisibleExtras() {
    var cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
    var used = {};

    return cards.map(function (card, index) {
      var title = field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || 'Extra';
      var id = card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || title;

      return normalize({
        id: id,
        extra_id: id,
        title: title,
        name: title,
        description: field(card, 'desc') || text(card, '.prodComboSelectedExtraCard__body span') || '',
        price_delta: number(field(card, 'precio')),
        badge: field(card, 'badge'),
        image_url: field(card, 'img'),
        status: field(card, 'estado') || 'activo'
      }, index);
    }).filter(function (extra) {
      var key = String(extra.extra_id || extra.id || '').toLowerCase();
      if (!key || used[key]) return false;
      used[key] = true;
      return true;
    });
  }

  function saveExtrasForCombo(comboId) {
    var id = String(comboId || '').trim();
    var extras = collectVisibleExtras();
    if (!id || !extras.length) return null;

    var list = read();
    var index = list.findIndex(function (combo) {
      return String(combo.product_id || '') === id;
    });

    if (index < 0) return null;

    list[index] = Object.assign({}, list[index], {
      combo_extras: extras,
      updated_at: new Date().toISOString()
    });

    write(list);
    window.__lastComboPayload = list[index];
    window.__PRODUCTOS_COMBO_EXTRAS_PAYLOAD_FIX_LAST__ = list[index];
    return list[index];
  }

  function getPayload(comboId) {
    var id = String(comboId || '').trim();
    if (!id) return null;
    return read().find(function (combo) {
      return String(combo.product_id || '') === id;
    }) || null;
  }

  function renderExtras(comboId) {
    var payload = getPayload(comboId);
    var extras = payload && Array.isArray(payload.combo_extras) ? payload.combo_extras.map(normalize) : [];
    if (!extras.length) return false;
    if (!window.ProductosExtrasSelector || typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder !== 'function') return false;

    return window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder(extras.map(function (extra) {
      return {
        id: extra.extra_id,
        extra_id: extra.extra_id,
        title: extra.title,
        nombre: extra.title,
        description: extra.description,
        descripcion: extra.description,
        price: extra.price_delta,
        precio: extra.price_delta,
        badge: extra.badge,
        image: extra.image_url,
        imagen: extra.image_url,
        status: extra.status,
        estado: extra.status
      };
    }));
  }

  function scheduleSave(comboId) {
    [30, 140, 360].forEach(function (delay) {
      setTimeout(function () { saveExtrasForCombo(comboId); }, delay);
    });
  }

  function scheduleRender(comboId) {
    [160, 420, 800].forEach(function (delay) {
      setTimeout(function () { renderExtras(comboId); }, delay);
    });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasPayloadFix === 'safe2') return;
    document.body.dataset.comboExtrasPayloadFix = 'safe2';

    window.addEventListener('productos:payload-ready', function (event) {
      var payload = event.detail && event.detail.payload ? event.detail.payload : null;
      if (!payload || payload.product_type !== 'combo') return;
      scheduleSave(payload.product_id);
    });

    document.addEventListener('click', function (event) {
      var edit = event.target.closest('[data-edit-local-product]');
      if (edit) scheduleRender(edit.dataset.editLocalProduct);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
})();
