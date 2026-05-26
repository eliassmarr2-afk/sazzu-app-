/*
  FASE 2 · Producto Comestible: persistencia de Agregados opcionales

  Motivo:
  - productos-payloads.js intercepta #prodComSaveBtn y puede bloquear saveLocal().
  - Este bridge persiste recomendados/agregados opcionales en sazzu_productos_comestibles_v1
    antes de ese interceptor.

  No toca Extras. No usa ProductosExtrasSelector. No modifica entity_extra_links.
*/
(function () {
  const PRODUCTS_KEY = 'sazzu_productos_comestibles_v1';

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
      console.warn('[productos-comestibles-optionals-persist-bridge.js] No se pudo guardar ' + key, error);
    }
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function numberOf(id) {
    const raw = valueOf(id).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function currentProductId() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset ? slide.dataset.productId || '' : '').trim();
  }

  function ensureProductId() {
    const slide = document.getElementById('prodComSlide');
    const current = currentProductId();
    if (current) return current;
    const name = valueOf('com_nombre') || 'Nuevo producto comestible';
    const id = 'prod-com-' + slugify(name) + '-' + Date.now();
    if (slide) slide.dataset.productId = id;
    return id;
  }

  function collectImages() {
    return Array.from({ length: 6 })
      .map(function (_, index) { return valueOf('com_img_' + (index + 1)); })
      .filter(Boolean);
  }

  function collectOptions(key, hasPrice) {
    return Array.from(document.querySelectorAll('.prodComOptions[data-options-key="' + key + '"] .prodComOption:not([data-prod-com-optionals-card])')).map(function (card, index) {
      return {
        nombre: valueOf(key + '_' + index + '_nombre'),
        descripcion: valueOf(key + '_' + index + '_desc'),
        precio: hasPrice ? Number(valueOf(key + '_' + index + '_precio') || 0) : 0,
        estado: valueOf(key + '_' + index + '_estado') || (hasPrice ? 'Activo' : 'Incluido'),
        badge: valueOf(key + '_' + index + '_badge'),
        imagen: valueOf(key + '_' + index + '_img')
      };
    }).filter(function (item) { return item.nombre || item.descripcion || item.imagen; });
  }

  function collectRecommended() {
    return Array.from(document.querySelectorAll('.prodComOptions[data-options-key="recomendados"] [data-prod-com-optionals-card]')).map(function (card, index) {
      const productId = String(card.dataset.productId || '').trim();
      const name = card.querySelector('input[id^="recomendados_"][id$="_nombre"]');
      const desc = card.querySelector('input[id^="recomendados_"][id$="_desc"]');
      const price = card.querySelector('input[id^="recomendados_"][id$="_precio"]');
      const state = card.querySelector('input[id^="recomendados_"][id$="_estado"]');
      const badge = card.querySelector('input[id^="recomendados_"][id$="_badge"]');
      const img = card.querySelector('input[id^="recomendados_"][id$="_img"]');
      const qty = card.querySelector('input[id^="prod_com_recomendado_"][id$="_cantidad"]');
      const visualState = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
      const title = name ? String(name.value || '').trim() : '';
      if (!productId && !title) return null;
      return {
        id: productId || slugify(title),
        product_id: productId || slugify(title),
        linked_product_id: productId || slugify(title),
        nombre: title || 'Producto recomendado',
        descripcion: desc ? String(desc.value || '').trim() : '',
        precio: price ? Number(price.value || 0) || 0 : 0,
        estado: visualState ? visualState.value : (state ? state.value : 'Visible'),
        badge: badge ? String(badge.value || '').trim() : 'Agregado opcional',
        imagen: img ? String(img.value || '').trim() : '',
        cantidad: qty ? String(qty.value || '').trim() : '1 unidad',
        cantidad_label: qty ? String(qty.value || '').trim() : '1 unidad',
        estado_visual: visualState ? visualState.value : (state ? state.value : 'Visible'),
        position: index + 1
      };
    }).filter(Boolean);
  }

  function collectExtrasSnapshot(existing) {
    const keep = existing || {};
    const cards = Array.from(document.querySelectorAll('.prodComOptions[data-options-key="extras"] .prodComSelectedExtraCard'));
    if (!cards.length) {
      return {
        extras: Array.isArray(keep.extras) ? keep.extras : [],
        extras_ids: Array.isArray(keep.extras_ids) ? keep.extras_ids : [],
        extras_count: Number(keep.extras_count || 0)
      };
    }
    const extras = cards.map(function (card, index) {
      const id = String(card.dataset.extraSourceId || valueOf('extras_' + index + '_nombre') || '').trim();
      return {
        id: id,
        extra_id: id,
        nombre: valueOf('extras_' + index + '_nombre'),
        title: valueOf('extras_' + index + '_nombre'),
        descripcion: valueOf('extras_' + index + '_desc'),
        description: valueOf('extras_' + index + '_desc'),
        precio: Number(valueOf('extras_' + index + '_precio') || 0),
        price: Number(valueOf('extras_' + index + '_precio') || 0),
        estado: valueOf('extras_' + index + '_estado') || 'Activo',
        status: valueOf('extras_' + index + '_estado') || 'Activo',
        badge: valueOf('extras_' + index + '_badge'),
        imagen: valueOf('extras_' + index + '_img'),
        image: valueOf('extras_' + index + '_img')
      };
    }).filter(function (item) { return item.nombre || item.extra_id; });
    return {
      extras: keep.extras || [],
      extras_ids: extras.map(function (item) { return item.extra_id || item.id; }).filter(Boolean),
      extras_count: extras.length
    };
  }

  function persistProduct() {
    if (!document.getElementById('prodComSlide') || !document.getElementById('prodComSaveBtn')) return null;

    const id = ensureProductId();
    const products = readArray(PRODUCTS_KEY);
    const index = products.findIndex(function (item) { return String(item.id || item.product_id || '') === String(id); });
    const existing = index >= 0 ? products[index] : {};
    const extrasSnapshot = collectExtrasSnapshot(existing);
    const recommended = collectRecommended();

    const payload = Object.assign({}, existing, {
      id: id,
      product_id: id,
      product_type: 'food_simple_product',
      combo: false,
      structure_locked: true,
      relation_model: 'entity_extra_links',
      nombre: valueOf('com_nombre') || existing.nombre || 'Nuevo producto comestible',
      categoria: valueOf('com_categoria') || existing.categoria || 'Categoría',
      estado: valueOf('com_estado') || existing.estado || 'Borrador',
      precio: numberOf('com_precio'),
      badge: valueOf('com_badge'),
      descripcion: valueOf('com_descripcion'),
      promesa: valueOf('com_promesa'),
      imagenes: collectImages(),
      versiones: collectOptions('versiones', true),
      sinCosto: collectOptions('sinCosto', false),
      extras: extrasSnapshot.extras,
      extras_ids: extrasSnapshot.extras_ids,
      extras_count: extrasSnapshot.extras_count,
      recomendados: recommended,
      recommended_products: recommended,
      recommended_count: recommended.length,
      optional_products_count: recommended.length,
      updated_at: new Date().toISOString()
    });

    if (index >= 0) products[index] = payload;
    else products.unshift(Object.assign({}, payload, { created_at: payload.updated_at }));

    writeArray(PRODUCTS_KEY, products);
    window.__lastProductoComestiblePersistBridge = payload;
    return payload;
  }

  function patchRecommendedCell(payload) {
    if (!payload || !payload.id) return;
    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const btn = row.querySelector('[data-edit-com]');
      if (!btn || String(btn.dataset.editCom || '') !== String(payload.id)) return;
      if (row.children && row.children[6]) row.children[6].textContent = String((payload.recomendados || []).length);
    });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (window.__productosComestiblesPersistBridgeBound) return;
    window.__productosComestiblesPersistBridgeBound = true;

    window.addEventListener('click', function (event) {
      if (!event.target || !event.target.closest || !event.target.closest('#prodComSaveBtn')) return;
      const payload = persistProduct();
      setTimeout(function () { patchRecommendedCell(payload); }, 60);
      setTimeout(function () { patchRecommendedCell(payload); }, 260);
    }, true);

    window.ProductosComestiblesPersistBridge = {
      persist: persistProduct,
      debug: function () {
        const id = currentProductId();
        const products = readArray(PRODUCTS_KEY);
        const product = products.find(function (item) { return String(item.id || item.product_id || '') === String(id); }) || null;
        return {
          active: true,
          product_id: id,
          selected_recommended_count: collectRecommended().length,
          stored_recommended_count: product && Array.isArray(product.recomendados) ? product.recomendados.length : null,
          product: product
        };
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
