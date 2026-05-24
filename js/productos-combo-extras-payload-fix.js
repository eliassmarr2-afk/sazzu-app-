(function () {
  var KEY = 'sazzu_combos_payloads_local_v1';
  var CONTEXT = {
    workspace_id: 'workspace_demo_sazzu',
    store_id: 'store_demo_food',
    created_by: 'user_demo'
  };

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

  function valueOf(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function numberOf(id) {
    var raw = valueOf(id).replace(/[^0-9.,-]/g, '').replace(',', '.');
    var parsed = Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function slugify(value) {
    return String(value || 'combo')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'combo';
  }

  function normalizeStatus(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'activo' || v === 'active') return 'activo';
    if (v === 'oculto' || v === 'hidden') return 'oculto';
    if (v === 'archivado' || v === 'archived') return 'archivado';
    return 'borrador';
  }

  function normalizeOptionStatus(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'incluido' || v === 'included') return 'incluido';
    if (v === 'agotado' || v === 'sold_out') return 'agotado';
    if (v === 'oculto' || v === 'hidden') return 'oculto';
    if (v === 'agregado' || v === 'added') return 'agregado';
    if (v === 'disponible' || v === 'available') return 'disponible';
    if (v === 'marcado' || v === 'selected') return 'marcado';
    if (v === 'desmarcado' || v === 'unselected') return 'desmarcado';
    return v || 'activo';
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

  function normalizeExtra(extra, index) {
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

  function collectComboExtras() {
    var cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
    var used = {};

    return cards.map(function (card, index) {
      var title = field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || 'Extra';
      var id = card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || title;

      return normalizeExtra({
        id: id,
        extra_id: id,
        title: title,
        name: title,
        description: field(card, 'desc') || text(card, '.prodComboSelectedExtraCard__body span') || '',
        price_delta: Number(field(card, 'precio') || 0) || 0,
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

  function collectImages() {
    return Array.from({ length: 6 }).map(function (_, index) {
      var url = valueOf('combo_img_' + (index + 1));
      if (!url) return null;
      return {
        image_url: url,
        storage_path: null,
        position: index + 1,
        is_primary: index === 0
      };
    }).filter(Boolean);
  }

  function collectComboComponents() {
    var inputs = Array.from(document.querySelectorAll('[id^="combo_incluido_"][id$="_nombre"]'));
    return inputs.map(function (input) {
      var match = input.id.match(/^combo_incluido_(\d+)_nombre$/);
      var index = match ? Number(match[1]) : 0;
      var estado = normalizeOptionStatus(valueOf('combo_incluido_' + index + '_estado'));
      return {
        name: valueOf('combo_incluido_' + index + '_nombre'),
        quantity_label: valueOf('combo_incluido_' + index + '_cantidad'),
        description: valueOf('combo_incluido_' + index + '_desc'),
        image_url: valueOf('combo_incluido_' + index + '_img') || null,
        is_included_by_default: estado !== 'desmarcado',
        position: index + 1
      };
    }).filter(function (item) { return !!item.name; });
  }

  function collectComboOptionalProducts() {
    var selects = Array.from(document.querySelectorAll('[id^="combo_opcional_"][id$="_product"]'));
    return selects.map(function (select) {
      var match = select.id.match(/^combo_opcional_(\d+)_product$/);
      var index = match ? Number(match[1]) : 0;
      var productId = valueOf('combo_opcional_' + index + '_product');
      return {
        linked_product_id: productId,
        quantity_label: valueOf('combo_opcional_' + index + '_cantidad'),
        status: normalizeOptionStatus(valueOf('combo_opcional_' + index + '_estado')),
        position: index + 1
      };
    }).filter(function (item) { return !!item.linked_product_id; });
  }

  function ensureComboId() {
    var slide = document.getElementById('prodComboSlide');
    var name = valueOf('combo_nombre');
    var id = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
    var isPlaceholder = !id || id === 'nuevo' || id === 'nuevo-combo';
    if (isPlaceholder) id = 'local-combo-' + slugify(name || 'combo') + '-' + Date.now();
    if (slide) slide.dataset.comboId = id;
    return id;
  }

  function buildPayload() {
    var comboId = ensureComboId();
    return {
      workspace_id: CONTEXT.workspace_id,
      store_id: CONTEXT.store_id,
      created_by: CONTEXT.created_by,
      product_id: comboId,
      product_type: 'combo',
      structure_locked: true,
      no_component_prorated_price: true,
      status: normalizeStatus(valueOf('combo_estado')),
      identity: {
        name: valueOf('combo_nombre'),
        category: valueOf('combo_categoria'),
        badge: valueOf('combo_badge') || null,
        description: valueOf('combo_descripcion'),
        base_price: numberOf('combo_precio'),
        delivery_promise: valueOf('combo_promesa') || null
      },
      images: collectImages(),
      combo_components: collectComboComponents(),
      optional_products: collectComboOptionalProducts(),
      combo_extras: collectComboExtras(),
      source: {
        panel: 'productos',
        module: 'productos_combos',
        phase: 'backend_0_1_payload_frontend_normalizado_override'
      }
    };
  }

  function upsert(payload) {
    var list = read();
    var index = list.findIndex(function (item) { return item.product_id === payload.product_id; });
    var now = new Date().toISOString();
    var next = Object.assign({}, payload, { updated_at: now });
    if (index >= 0) list[index] = next;
    else list.push(Object.assign({}, next, { created_at: now }));
    write(list);
    window.__lastComboPayload = next;
    window.__PRODUCTOS_COMBO_EXTRAS_PAYLOAD_FIX_LAST__ = next;
    return next;
  }

  function renderRows() {
    if (window.ProductosPayloads && typeof window.ProductosPayloads.renderLocalRows === 'function') {
      window.ProductosPayloads.renderLocalRows();
      setTimeout(function () { window.ProductosPayloads.renderLocalRows(); }, 180);
    }
  }

  function flash(btn) {
    if (!btn) return;
    var original = btn.textContent;
    btn.textContent = 'Guardado en tabla';
    btn.classList.add('is-success');
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('is-success');
    }, 1500);
  }

  function saveCombo(event) {
    var btn = event.target && event.target.closest && event.target.closest('#prodComboSaveBtn');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var payload = upsert(buildPayload());
    renderRows();
    flash(btn);

    try {
      window.dispatchEvent(new CustomEvent('productos:payload-ready', { detail: { payload: payload } }));
    } catch (_) {}
  }

  function getPayload(comboId) {
    var id = String(comboId || '').trim();
    if (!id) return null;
    return read().find(function (combo) { return String(combo.product_id || '') === id; }) || null;
  }

  function renderExtras(comboId) {
    var payload = getPayload(comboId);
    var extras = payload && Array.isArray(payload.combo_extras) ? payload.combo_extras.map(normalizeExtra) : [];
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

  function scheduleRender(comboId) {
    [160, 420, 800].forEach(function (delay) {
      setTimeout(function () { renderExtras(comboId); }, delay);
    });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasPayloadFix === 'override1') return;
    document.body.dataset.comboExtrasPayloadFix = 'override1';

    window.addEventListener('click', saveCombo, true);

    document.addEventListener('click', function (event) {
      var edit = event.target.closest('[data-edit-local-product]');
      if (edit) scheduleRender(edit.dataset.editLocalProduct);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
})();
