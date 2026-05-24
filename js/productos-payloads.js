(function () {
  const PRODUCTOS_CONTEXT = {
    workspace_id: 'workspace_demo_sazzu',
    store_id: 'store_demo_food',
    created_by: 'user_demo'
  };

  const STORAGE_KEYS = {
    products: 'sazzu_productos_payloads_local_v1',
    combos: 'sazzu_combos_payloads_local_v1'
  };

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function numberOf(id) {
    const raw = valueOf(id).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function normalizeStatus(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'activo' || v === 'active') return 'activo';
    if (v === 'oculto' || v === 'hidden') return 'oculto';
    if (v === 'archivado' || v === 'archived') return 'archivado';
    return 'borrador';
  }

  function normalizeOptionStatus(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'activo' || v === 'active') return 'activo';
    if (v === 'incluido' || v === 'included') return 'incluido';
    if (v === 'agotado' || v === 'sold_out') return 'agotado';
    if (v === 'oculto' || v === 'hidden') return 'oculto';
    if (v === 'agregado' || v === 'added') return 'agregado';
    if (v === 'disponible' || v === 'available') return 'disponible';
    if (v === 'marcado' || v === 'selected') return 'marcado';
    if (v === 'desmarcado' || v === 'unselected') return 'desmarcado';
    return v || 'activo';
  }

  function labelStatus(value) {
    const v = normalizeStatus(value);
    if (v === 'activo') return 'Activo';
    if (v === 'oculto') return 'Oculto';
    if (v === 'archivado') return 'Archivado';
    return 'Borrador';
  }

  function collectImages(prefix, max) {
    return Array.from({ length: max || 6 })
      .map(function (_, index) {
        const imageUrl = valueOf(prefix + (index + 1));
        if (!imageUrl) return null;
        return {
          image_url: imageUrl,
          storage_path: null,
          position: index + 1,
          is_primary: index === 0
        };
      })
      .filter(Boolean);
  }

  function collectProductOptions(sectionType, prefix, hasPrice) {
    const nameInputs = Array.from(document.querySelectorAll('[id^="' + prefix + '_"][id$="_nombre"]'));

    return nameInputs.map(function (input) {
      const match = input.id.match(new RegExp('^' + prefix + '_(\\d+)_nombre$'));
      const index = match ? Number(match[1]) : 0;
      const name = valueOf(prefix + '_' + index + '_nombre');

      return {
        section_type: sectionType,
        name: name,
        description: valueOf(prefix + '_' + index + '_desc'),
        price_delta: hasPrice ? numberOf(prefix + '_' + index + '_precio') : 0,
        image_url: valueOf(prefix + '_' + index + '_img') || null,
        status: normalizeOptionStatus(valueOf(prefix + '_' + index + '_estado') || valueOf(prefix + '_' + index + '_costo')),
        badge: valueOf(prefix + '_' + index + '_badge') || null,
        position: index + 1
      };
    }).filter(function (item) { return !!item.name; });
  }

  function collectComboComponents() {
    const nameInputs = Array.from(document.querySelectorAll('[id^="combo_incluido_"][id$="_nombre"]'));

    return nameInputs.map(function (input) {
      const match = input.id.match(/^combo_incluido_(\d+)_nombre$/);
      const index = match ? Number(match[1]) : 0;
      const estado = normalizeOptionStatus(valueOf('combo_incluido_' + index + '_estado'));

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
    const productSelects = Array.from(document.querySelectorAll('[id^="combo_opcional_"][id$="_product"]'));

    return productSelects.map(function (select) {
      const match = select.id.match(/^combo_opcional_(\d+)_product$/);
      const index = match ? Number(match[1]) : 0;
      const linkedProductId = valueOf('combo_opcional_' + index + '_product');

      return {
        linked_product_id: linkedProductId,
        quantity_label: valueOf('combo_opcional_' + index + '_cantidad'),
        status: normalizeOptionStatus(valueOf('combo_opcional_' + index + '_estado')),
        position: index + 1
      };
    }).filter(function (item) { return !!item.linked_product_id; });
  }

  function fieldValueFromCard(card, prefix, field) {
    if (!card) return '';
    const input = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      const id = String(el.id || '');
      return id.indexOf(prefix + '_') === 0 && id.endsWith('_' + field);
    });
    return input ? String(input.value || '').trim() : '';
  }

  function textFromCard(card, selector) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
  }

  function parseNumberValue(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeComboExtra(extra, index) {
    const data = extra || {};
    const title = String(data.title || data.name || data.nombre || 'Extra').trim();
    const id = String(data.extra_id || data.id || title).trim();
    const priceRaw = data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio);
    const price = parseNumberValue(priceRaw);

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
      image_url: data.image_url || data.image || data.imagen || null,
      image: data.image || data.image_url || data.imagen || null,
      imagen: data.imagen || data.image || data.image_url || null,
      badge: data.badge || null,
      status: normalizeOptionStatus(data.status || data.estado || 'activo'),
      estado: normalizeOptionStatus(data.estado || data.status || 'activo'),
      position: Number(data.position || index + 1)
    };
  }

  function collectComboExtras() {
    const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
    const used = new Set();
    const extras = [];

    cards.forEach(function (card, index) {
      const title = fieldValueFromCard(card, 'combo_extra', 'nombre') ||
        textFromCard(card, '.prodComboSelectedExtraCard__body strong') ||
        'Extra';

      const extra = normalizeComboExtra({
        id: card.dataset.extraSourceId ||
          fieldValueFromCard(card, 'combo_extra', 'extra_id') ||
          fieldValueFromCard(card, 'combo_extra', 'id') ||
          title,
        extra_id: card.dataset.extraSourceId ||
          fieldValueFromCard(card, 'combo_extra', 'extra_id') ||
          fieldValueFromCard(card, 'combo_extra', 'id') ||
          title,
        title: title,
        name: title,
        description: fieldValueFromCard(card, 'combo_extra', 'desc') ||
          textFromCard(card, '.prodComboSelectedExtraCard__body span') ||
          '',
        price_delta: fieldValueFromCard(card, 'combo_extra', 'precio'),
        image_url: fieldValueFromCard(card, 'combo_extra', 'img') || null,
        badge: fieldValueFromCard(card, 'combo_extra', 'badge') || null,
        status: fieldValueFromCard(card, 'combo_extra', 'estado') || 'activo',
        position: index + 1
      }, index);

      const key = String(extra.extra_id || extra.id || '').trim().toLowerCase();
      if (!key || used.has(key)) return;
      used.add(key);
      extras.push(extra);
    });

    return extras;
  }

  function ensureLocalProductId(currentId, name, type) {
    const normalizedCurrent = String(currentId || '').trim();
    const isPlaceholder = !normalizedCurrent || normalizedCurrent === 'nuevo' || normalizedCurrent === 'nuevo-producto-comestible' || normalizedCurrent === 'nuevo-combo';
    if (!isPlaceholder) return normalizedCurrent;
    return 'local-' + type + '-' + slugify(name) + '-' + Date.now();
  }

  function buildProductoSimplePayload(extraContext) {
    const context = Object.assign({}, PRODUCTOS_CONTEXT, extraContext || {});
    const slide = document.getElementById('prodComSlide');
    const name = valueOf('com_nombre');
    const productId = ensureLocalProductId(slide?.dataset.productId, name, 'producto');
    if (slide) slide.dataset.productId = productId;

    return {
      workspace_id: context.workspace_id,
      store_id: context.store_id,
      created_by: context.created_by,
      product_id: productId,
      product_type: 'producto_simple',
      structure_locked: true,
      status: normalizeStatus(valueOf('com_estado')),
      identity: {
        name: name,
        category: valueOf('com_categoria'),
        badge: valueOf('com_badge') || null,
        description: valueOf('com_descripcion'),
        base_price: numberOf('com_precio'),
        delivery_promise: valueOf('com_promesa') || null
      },
      images: collectImages('com_img_', 6),
      options: [
        ...collectProductOptions('version', 'versiones', true),
        ...collectProductOptions('extra', 'extras', true),
        ...collectProductOptions('removable', 'sinCosto', false),
        ...collectProductOptions('recommended', 'recomendados', true)
      ],
      source: {
        panel: 'productos',
        module: 'productos_comestibles',
        phase: 'backend_0_1_payload_frontend_normalizado'
      }
    };
  }

  function buildComboPayload(extraContext) {
    const context = Object.assign({}, PRODUCTOS_CONTEXT, extraContext || {});
    const slide = document.getElementById('prodComboSlide');
    const name = valueOf('combo_nombre');
    const comboId = ensureLocalProductId(slide?.dataset.comboId, name, 'combo');
    if (slide) slide.dataset.comboId = comboId;

    return {
      workspace_id: context.workspace_id,
      store_id: context.store_id,
      created_by: context.created_by,
      product_id: comboId,
      product_type: 'combo',
      structure_locked: true,
      no_component_prorated_price: true,
      status: normalizeStatus(valueOf('combo_estado')),
      identity: {
        name: name,
        category: valueOf('combo_categoria'),
        badge: valueOf('combo_badge') || null,
        description: valueOf('combo_descripcion'),
        base_price: numberOf('combo_precio'),
        delivery_promise: valueOf('combo_promesa') || null
      },
      images: collectImages('combo_img_', 6),
      combo_components: collectComboComponents(),
      optional_products: collectComboOptionalProducts(),
      combo_extras: collectComboExtras(),
      source: {
        panel: 'productos',
        module: 'productos_combos',
        phase: 'backend_0_1_payload_frontend_normalizado'
      }
    };
  }

  function readStored(key) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[productos-payloads.js] No se pudo leer localStorage:', key, error);
      return [];
    }
  }

  function writeStored(key, items) {
    window.localStorage.setItem(key, JSON.stringify(items));
  }

  function upsertStoredPayload(key, payload) {
    const items = readStored(key);
    const index = items.findIndex(function (item) { return item.product_id === payload.product_id; });
    const nextPayload = Object.assign({}, payload, { updated_at: new Date().toISOString() });

    if (index >= 0) items[index] = nextPayload;
    else items.push(Object.assign({}, nextPayload, { created_at: nextPayload.updated_at }));

    writeStored(key, items);
    return nextPayload;
  }

  function payloadToRow(payload) {
    const identity = payload.identity || {};
    const options = Array.isArray(payload.options) ? payload.options : [];
    const images = Array.isArray(payload.images) ? payload.images : [];
    const isCombo = payload.product_type === 'combo';
    const typeLabel = isCombo ? 'Combo' : 'Producto simple';
    const statusLabel = labelStatus(payload.status);
    const statusClass = statusLabel === 'Activo' ? 'prodComBadge--green' : 'prodComBadge--gray';
    const versionCount = isCombo ? (payload.combo_components || []).length : options.filter(function (item) { return item.section_type === 'version'; }).length;
    const extraCount = isCombo ? (payload.combo_extras || []).length : options.filter(function (item) { return item.section_type === 'extra'; }).length;
    const removableCount = isCombo ? 0 : options.filter(function (item) { return item.section_type === 'removable'; }).length;
    const recommendedCount = isCombo ? (payload.optional_products || []).length : options.filter(function (item) { return item.section_type === 'recommended'; }).length;
    const imageUrl = images[0] && images[0].image_url;

    return {
      id: payload.product_id,
      type: payload.product_type,
      name: identity.name || 'Producto sin nombre',
      category: identity.category || (isCombo ? 'Combo' : 'Producto'),
      typeLabel: typeLabel,
      price: identity.base_price || 0,
      versionCount: versionCount,
      extraCount: extraCount,
      removableCount: removableCount,
      recommendedCount: recommendedCount,
      imageCount: images.length,
      imageUrl: imageUrl,
      statusLabel: statusLabel,
      statusClass: statusClass
    };
  }

  function getStoredRows() {
    return readStored(STORAGE_KEYS.products).concat(readStored(STORAGE_KEYS.combos)).map(payloadToRow);
  }

  function currentTableFilters() {
    return {
      q: String(document.getElementById('prodComSearch')?.value || '').trim().toLowerCase(),
      status: String(document.getElementById('prodComEstado')?.value || 'todos').trim().toLowerCase()
    };
  }

  function rowMatchesFilters(row, filters) {
    const haystack = [row.name, row.category, row.typeLabel, row.statusLabel].join(' ').toLowerCase();
    const matchesSearch = !filters.q || haystack.includes(filters.q);
    const status = String(row.statusLabel || '').toLowerCase();
    const matchesStatus = filters.status === 'todos' || status === filters.status;
    return matchesSearch && matchesStatus;
  }

  function renderLocalRows() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('[data-local-product-row="1"]').forEach(function (row) { row.remove(); });

    const rows = getStoredRows().filter(function (row) { return rowMatchesFilters(row, currentTableFilters()); });

    rows.forEach(function (row) {
      const existingStaticButton = tbody.querySelector('[data-edit-com="' + CSS.escape(row.id) + '"]');
      const existingStaticRow = existingStaticButton && existingStaticButton.closest('tr');
      if (existingStaticRow) existingStaticRow.remove();
    });

    if (!rows.length) return;

    const html = rows.map(function (row) {
      return '<tr data-local-product-row="1" data-local-product-id="' + escapeHtml(row.id) + '">' +
        '<td><div class="prodComCell"><div class="prodComThumb">' + (row.imageUrl ? '<img src="' + escapeHtml(row.imageUrl) + '" alt="">' : '<span>IMG</span>') + '</div><div><strong>' + escapeHtml(row.name) + '</strong><span>' + escapeHtml(row.category) + ' · Guardado local</span></div></div></td>' +
        '<td><span class="prodComBadge prodComBadge--blue">' + escapeHtml(row.typeLabel) + '</span></td>' +
        '<td><strong>' + escapeHtml(formatMoney(row.price)) + '</strong></td>' +
        '<td>' + escapeHtml(row.versionCount) + '</td>' +
        '<td>' + escapeHtml(row.extraCount) + '</td>' +
        '<td>' + escapeHtml(row.removableCount) + '</td>' +
        '<td>' + escapeHtml(row.recommendedCount) + '</td>' +
        '<td>' + escapeHtml(row.imageCount) + '/6</td>' +
        '<td><span class="prodComBadge ' + row.statusClass + '">' + escapeHtml(row.statusLabel) + '</span></td>' +
        '<td><button type="button" class="prodComEdit" disabled title="La edición desde localStorage se conecta en la siguiente fase">Guardado</button></td>' +
      '</tr>';
    }).join('');

    tbody.insertAdjacentHTML('afterbegin', html);
  }

  function flashButton(btn, text) {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = text;
    btn.classList.add('is-success');
    window.setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove('is-success');
    }, 1500);
  }

  function emitPayloadReady(payload) {
    window.dispatchEvent(new CustomEvent('productos:payload-ready', {
      detail: { payload: payload }
    }));
  }

  function interceptSaveClicks(event) {
    const productButton = event.target.closest && event.target.closest('#prodComSaveBtn');
    const comboButton = event.target.closest && event.target.closest('#prodComboSaveBtn');

    if (!productButton && !comboButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (productButton) {
      const payload = upsertStoredPayload(STORAGE_KEYS.products, buildProductoSimplePayload());
      window.__lastProductoSimplePayload = payload;
      console.log('[productos-payloads.js] Payload normalizado producto_simple:', payload);
      emitPayloadReady(payload);
      renderLocalRows();
      flashButton(productButton, 'Guardado en tabla');
      return;
    }

    if (comboButton) {
      const payload = upsertStoredPayload(STORAGE_KEYS.combos, buildComboPayload());
      window.__lastComboPayload = payload;
      console.log('[productos-payloads.js] Payload normalizado combo:', payload);
      emitPayloadReady(payload);
      renderLocalRows();
      flashButton(comboButton, 'Guardado en tabla');
    }
  }

  function bindTableRefreshHooks() {
    const tab = document.getElementById('prodTabComestibles');
    const search = document.getElementById('prodComSearch');
    const status = document.getElementById('prodComEstado');

    if (tab && tab.dataset.payloadRowsBound !== '1') {
      tab.dataset.payloadRowsBound = '1';
      tab.addEventListener('click', function () {
        window.setTimeout(renderLocalRows, 60);
        window.setTimeout(renderLocalRows, 240);
      });
    }

    if (search && search.dataset.payloadRowsBound !== '1') {
      search.dataset.payloadRowsBound = '1';
      search.addEventListener('input', function () { window.setTimeout(renderLocalRows, 0); });
    }

    if (status && status.dataset.payloadRowsBound !== '1') {
      status.dataset.payloadRowsBound = '1';
      status.addEventListener('change', function () { window.setTimeout(renderLocalRows, 0); });
    }
  }

  function initProductosPayloads() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;

    if (body.dataset.productosPayloadsReady !== '1') {
      body.dataset.productosPayloadsReady = '1';
      document.addEventListener('click', interceptSaveClicks, true);
    }

    bindTableRefreshHooks();
    window.setTimeout(renderLocalRows, 120);
    window.setTimeout(renderLocalRows, 420);
  }

  window.ProductosPayloads = {
    context: PRODUCTOS_CONTEXT,
    buildProductoSimplePayload: buildProductoSimplePayload,
    buildComboPayload: buildComboPayload,
    collectComboExtras: collectComboExtras,
    collectImages: collectImages,
    renderLocalRows: renderLocalRows,
    storageKeys: STORAGE_KEYS
  };

  document.addEventListener('DOMContentLoaded', initProductosPayloads);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosPayloads, 80);
    setTimeout(initProductosPayloads, 260);
  });
})();