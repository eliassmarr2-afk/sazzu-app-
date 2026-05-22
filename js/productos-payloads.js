(function () {
  const PRODUCTOS_CONTEXT = {
    workspace_id: 'workspace_demo_sazzu',
    store_id: 'store_demo_food',
    created_by: 'user_demo'
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

  function buildProductoSimplePayload(extraContext) {
    const context = Object.assign({}, PRODUCTOS_CONTEXT, extraContext || {});
    const productId = document.getElementById('prodComSlide')?.dataset.productId || 'nuevo-producto-comestible';

    return {
      workspace_id: context.workspace_id,
      store_id: context.store_id,
      created_by: context.created_by,
      product_id: productId,
      product_type: 'producto_simple',
      structure_locked: true,
      status: normalizeStatus(valueOf('com_estado')),
      identity: {
        name: valueOf('com_nombre'),
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
    const comboId = document.getElementById('prodComboSlide')?.dataset.comboId || 'nuevo-combo';

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
        name: valueOf('combo_nombre'),
        category: valueOf('combo_categoria'),
        badge: valueOf('combo_badge') || null,
        description: valueOf('combo_descripcion'),
        base_price: numberOf('combo_precio'),
        delivery_promise: valueOf('combo_promesa') || null
      },
      images: collectImages('combo_img_', 6),
      combo_components: collectComboComponents(),
      optional_products: collectComboOptionalProducts(),
      combo_extras: [],
      source: {
        panel: 'productos',
        module: 'productos_combos',
        phase: 'backend_0_1_payload_frontend_normalizado'
      }
    };
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

  function interceptSaveClicks(event) {
    const productButton = event.target.closest && event.target.closest('#prodComSaveBtn');
    const comboButton = event.target.closest && event.target.closest('#prodComboSaveBtn');

    if (!productButton && !comboButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (productButton) {
      const payload = buildProductoSimplePayload();
      window.__lastProductoSimplePayload = payload;
      console.log('[productos-payloads.js] Payload normalizado producto_simple:', payload);
      flashButton(productButton, 'Payload preparado');
      return;
    }

    if (comboButton) {
      const payload = buildComboPayload();
      window.__lastComboPayload = payload;
      console.log('[productos-payloads.js] Payload normalizado combo:', payload);
      flashButton(comboButton, 'Payload preparado');
    }
  }

  function initProductosPayloads() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body || body.dataset.productosPayloadsReady === '1') return;
    body.dataset.productosPayloadsReady = '1';
    document.addEventListener('click', interceptSaveClicks, true);
  }

  window.ProductosPayloads = {
    context: PRODUCTOS_CONTEXT,
    buildProductoSimplePayload: buildProductoSimplePayload,
    buildComboPayload: buildComboPayload,
    collectImages: collectImages
  };

  document.addEventListener('DOMContentLoaded', initProductosPayloads);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosPayloads, 80);
    setTimeout(initProductosPayloads, 260);
  });
})();
