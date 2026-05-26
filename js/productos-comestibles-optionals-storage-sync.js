/*
  FASE 2 FIX · Producto Comestible: sync estable de Agregados opcionales

  Corrige el caso:
  - se ven recomendados temporalmente
  - al refrescar vuelven a 0

  Sin tocar Extras.
*/
(function () {
  const PRODUCTOS_KEY = 'sazzu_productos_comestibles_v1';
  const PAYLOADS_KEY = 'sazzu_productos_payloads_local_v1';

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
      console.warn('[productos-comestibles-optionals-storage-sync.js] No se pudo escribir ' + key, error);
    }
  }

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function currentSlideId() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset ? slide.dataset.productId || '' : '').trim();
  }

  function activeProductId(fallbackPayload) {
    const fromPayload = fallbackPayload && String(fallbackPayload.product_id || fallbackPayload.id || '').trim();
    if (fromPayload) return fromPayload;
    const fromSlide = currentSlideId();
    if (fromSlide) return fromSlide;
    const name = valueOf('com_nombre') || 'Nuevo producto comestible';
    return 'prod-com-' + slugify(name) + '-' + Date.now();
  }

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }

  function collectFromCards() {
    return Array.from(document.querySelectorAll('.prodComOptions[data-options-key="recomendados"] [data-prod-com-optionals-card]')).map(function (card, index) {
      const productId = String(card.dataset.productId || '').trim();
      const nameInput = card.querySelector('input[id^="recomendados_"][id$="_nombre"]');
      const descInput = card.querySelector('input[id^="recomendados_"][id$="_desc"]');
      const priceInput = card.querySelector('input[id^="recomendados_"][id$="_precio"]');
      const imgInput = card.querySelector('input[id^="recomendados_"][id$="_img"]');
      const badgeInput = card.querySelector('input[id^="recomendados_"][id$="_badge"]');
      const qtyInput = card.querySelector('input[id^="prod_com_recomendado_"][id$="_cantidad"]');
      const stateSelect = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
      const title = String(nameInput ? nameInput.value : (card.querySelector('.prodComOptionalStageAHead strong')?.textContent || 'Producto recomendado')).trim();
      const description = String(descInput ? descInput.value : (card.querySelector('.prodComOptionalStageAHead span')?.textContent || '')).trim();
      const price = priceInput ? Number(priceInput.value || 0) || 0 : parseMoney(card.querySelector('.prodComOptionalStageAHead b')?.textContent || '0');
      const image = String(imgInput ? imgInput.value : (card.querySelector('.prodComOptionalStageAImage img')?.getAttribute('src') || '')).trim();
      const state = String(stateSelect ? stateSelect.value : 'Visible').trim() || 'Visible';
      const qty = String(qtyInput ? qtyInput.value : '1 unidad').trim() || '1 unidad';
      const id = productId || slugify(title);
      return {
        id: id,
        product_id: id,
        linked_product_id: id,
        nombre: title,
        title: title,
        descripcion: description,
        description: description,
        precio: price,
        price: price,
        estado: state,
        status: state,
        badge: String(badgeInput ? badgeInput.value : 'Agregado opcional').trim() || 'Agregado opcional',
        imagen: image,
        image: image,
        cantidad: qty,
        cantidad_label: qty,
        quantity_label: qty,
        estado_visual: state,
        activo: state !== 'Oculto',
        position: index + 1
      };
    }).filter(function (item) { return item.nombre || item.product_id; });
  }

  function collectRecommended() {
    if (window.ProductosComestiblesOptionalsUi && typeof window.ProductosComestiblesOptionalsUi.collect === 'function') {
      try {
        const items = window.ProductosComestiblesOptionalsUi.collect();
        if (Array.isArray(items) && items.length) {
          return items.map(function (item, index) {
            const p = item.snapshot_producto || {};
            const id = String(item.linked_product_id || item.product_id || p.id || p.product_id || '').trim();
            return {
              id: id,
              product_id: id,
              linked_product_id: id,
              nombre: p.nombre || p.name || 'Producto recomendado',
              title: p.nombre || p.name || 'Producto recomendado',
              descripcion: p.categoria || p.category || '',
              description: p.categoria || p.category || '',
              precio: Number(p.precio != null ? p.precio : p.price || 0) || 0,
              price: Number(p.price != null ? p.price : p.precio || 0) || 0,
              estado: item.estado_visual || item.status || 'Visible',
              status: item.estado_visual || item.status || 'Visible',
              badge: 'Agregado opcional',
              imagen: p.imagen || p.image || '',
              image: p.imagen || p.image || '',
              cantidad: item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad',
              cantidad_label: item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad',
              quantity_label: item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad',
              estado_visual: item.estado_visual || item.status || 'Visible',
              activo: item.activo !== false,
              position: index + 1
            };
          }).filter(function (item) { return item.product_id; });
        }
      } catch (error) {
        console.warn('[productos-comestibles-optionals-storage-sync.js] No se pudo leer collector:', error);
      }
    }
    return collectFromCards();
  }

  function toPayloadOption(item, index) {
    return {
      section_type: 'recommended',
      name: item.nombre || item.title || 'Producto recomendado',
      description: item.descripcion || item.description || '',
      price_delta: Number(item.precio != null ? item.precio : item.price || 0) || 0,
      image_url: item.imagen || item.image || null,
      status: String(item.estado || item.status || 'visible').toLowerCase(),
      badge: item.badge || 'Agregado opcional',
      position: index + 1,
      linked_product_id: item.linked_product_id || item.product_id || item.id,
      quantity_label: item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad'
    };
  }

  function syncProductStorage(productId, recommended) {
    const products = readArray(PRODUCTOS_KEY);
    const idx = products.findIndex(function (item) {
      return String(item.id || item.product_id || '') === String(productId || '');
    });
    const existing = idx >= 0 ? products[idx] : {};
    const next = Object.assign({}, existing, {
      id: productId,
      product_id: productId,
      product_type: existing.product_type || 'food_simple_product',
      combo: false,
      structure_locked: true,
      relation_model: existing.relation_model || 'entity_extra_links',
      nombre: valueOf('com_nombre') || existing.nombre || 'Producto comestible',
      categoria: valueOf('com_categoria') || existing.categoria || 'Categoría',
      estado: valueOf('com_estado') || existing.estado || 'Borrador',
      precio: Number(valueOf('com_precio') || existing.precio || 0) || 0,
      badge: valueOf('com_badge') || existing.badge || '',
      descripcion: valueOf('com_descripcion') || existing.descripcion || '',
      promesa: valueOf('com_promesa') || existing.promesa || '',
      recomendados: recommended,
      recommended_products: recommended,
      recommended_count: recommended.length,
      optional_products_count: recommended.length,
      updated_at: new Date().toISOString()
    });
    if (idx >= 0) products[idx] = next;
    else products.unshift(Object.assign({}, next, { created_at: next.updated_at }));
    writeArray(PRODUCTOS_KEY, products);
    return next;
  }

  function syncPayloadStorage(productId, recommended) {
    const rows = readArray(PAYLOADS_KEY);
    const idx = rows.findIndex(function (item) {
      return String(item.product_id || item.id || '') === String(productId || '');
    });
    if (idx < 0) return null;
    const row = rows[idx] || {};
    const options = Array.isArray(row.options) ? row.options.filter(function (item) {
      return item && item.section_type !== 'recommended';
    }) : [];
    const recommendedOptions = recommended.map(toPayloadOption);
    rows[idx] = Object.assign({}, row, {
      options: options.concat(recommendedOptions),
      recommended_products: recommended,
      recommended_count: recommended.length,
      optional_products_count: recommended.length,
      updated_at: new Date().toISOString()
    });
    writeArray(PAYLOADS_KEY, rows);
    return rows[idx];
  }

  function syncNow(payloadHint) {
    const recommended = collectRecommended();
    const productId = activeProductId(payloadHint);
    const product = syncProductStorage(productId, recommended);
    const localPayload = syncPayloadStorage(productId, recommended);
    window.__PRODUCTOS_COMESTIBLES_OPTIONALS_STORAGE_SYNC__ = {
      active: true,
      product_id: productId,
      recommended_count: recommended.length,
      product_storage_ok: !!product,
      payload_storage_ok: !!localPayload,
      updated_at: new Date().toISOString()
    };
    return product;
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (window.__productosComestiblesOptionalsStorageSyncBound) return;
    window.__productosComestiblesOptionalsStorageSyncBound = true;

    window.addEventListener('productos:payload-ready', function (event) {
      const payload = event && event.detail ? event.detail.payload : null;
      if (!payload || payload.product_type === 'combo') return;
      setTimeout(function () { syncNow(payload); }, 0);
      setTimeout(function () { syncNow(payload); }, 120);
    });

    document.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest || !event.target.closest('#prodComSaveBtn')) return;
      setTimeout(function () { syncNow(window.__lastProductoSimplePayload || null); }, 180);
      setTimeout(function () { syncNow(window.__lastProductoSimplePayload || null); }, 520);
    }, true);

    window.ProductosComestiblesOptionalsStorageSync = {
      sync: syncNow,
      debug: function () {
        return window.__PRODUCTOS_COMESTIBLES_OPTIONALS_STORAGE_SYNC__ || {
          active: true,
          product_id: activeProductId(window.__lastProductoSimplePayload || null),
          recommended_count: collectRecommended().length,
          synced: false
        };
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
