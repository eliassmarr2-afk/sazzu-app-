/*
  SYNC AISLADO · Agregados opcionales en Combos

  Objetivo:
  - Persistir Agregados opcionales por combo_id.
  - Rehidratar al editar el combo.
  - No tocar Extras.
  - No crear combos nuevos ni duplicar filas.
*/
(function () {
  const MAP_KEY = 'sazzu_combo_optional_products_by_combo_v1';
  const LAST_KEY = 'sazzu_combo_optional_products_v1';
  const PAYLOAD_KEY = 'sazzu_combos_payloads_local_v1';
  const BUILDER_KEY = 'sazzu_productos_combos_v1';

  let lastComboId = '';
  let syncTimer = null;
  let hydrationTimer = null;

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
      console.warn('[productos-combo-optionals-payload-sync.js] No se pudo escribir ' + key, error);
    }
  }

  function readObject(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value && typeof value === 'object' ? value : {}));
    } catch (error) {
      console.warn('[productos-combo-optionals-payload-sync.js] No se pudo escribir ' + key, error);
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset ? slide.dataset.comboId || '' : '').trim();
  }

  function optionalSection() {
    return Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection')).find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').toLowerCase();
      return (eyebrow.includes('podés sumar') || eyebrow.includes('podes sumar')) && title.includes('agregados opcionales');
    }) || null;
  }

  function optionalList() {
    const section = optionalSection();
    return section ? section.querySelector('.prodComboItems') : null;
  }

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }

  function collectFromDom() {
    const list = optionalList();
    if (!list) return [];

    return Array.from(list.querySelectorAll('[data-combo-optionals-stage-card]')).map(function (card, index) {
      const title = card.querySelector('.prodComboOptionalStageAHead strong');
      const category = card.querySelector('.prodComboOptionalStageAHead span');
      const price = card.querySelector('.prodComboOptionalStageAHead b');
      const img = card.querySelector('.prodComboOptionalStageAImage img');
      const qty = card.querySelector('input[id^="combo_opcional_stagea_"][id$="_cantidad"]');
      const state = card.querySelector('select[id^="combo_opcional_stagea_"][id$="_estado"]');
      const id = String(card.dataset.productId || '').trim();

      return {
        product_id: id,
        linked_product_id: id,
        cantidad: qty ? String(qty.value || '1 unidad').trim() : '1 unidad',
        cantidad_label: qty ? String(qty.value || '1 unidad').trim() : '1 unidad',
        quantity_label: qty ? String(qty.value || '1 unidad').trim() : '1 unidad',
        estado_visual: state ? String(state.value || 'Visible').trim() : 'Visible',
        status: state ? String(state.value || 'Visible').trim() : 'Visible',
        activo: !(state && String(state.value || '') === 'Oculto'),
        position: index + 1,
        snapshot_producto: {
          id: id,
          product_id: id,
          nombre: title ? String(title.textContent || '').trim() : 'Producto',
          name: title ? String(title.textContent || '').trim() : 'Producto',
          categoria: category ? String(category.textContent || '').trim() : 'Producto',
          category: category ? String(category.textContent || '').trim() : 'Producto',
          precio: price ? parseMoney(price.textContent) : 0,
          price: price ? parseMoney(price.textContent) : 0,
          imagen: img ? String(img.getAttribute('src') || '').trim() : '',
          image: img ? String(img.getAttribute('src') || '').trim() : '',
          product_type: 'producto_simple'
        }
      };
    }).filter(function (item) { return item.product_id; });
  }

  function cardHtml(item, index) {
    const product = item.snapshot_producto || {};
    const id = item.product_id || item.linked_product_id || product.id || product.product_id || '';
    const name = product.nombre || product.name || 'Producto';
    const category = product.categoria || product.category || 'Producto';
    const price = Number(product.precio != null ? product.precio : product.price || 0) || 0;
    const image = product.imagen || product.image || '';
    const qty = item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad';
    const state = item.estado_visual || item.status || 'Visible';
    const imageHtml = image ? '<img src="' + esc(image) + '" alt="">' : '<span>IMG</span>';

    return '<article class="prodComboOptionalStageACard" data-combo-optionals-stage-card="1" data-product-id="' + esc(id) + '">' +
      '<div class="prodComboOptionalStageAImage">' + imageHtml + '</div>' +
      '<div class="prodComboOptionalStageABody"><div class="prodComboOptionalStageAHead"><div><strong>' + esc(name) + '</strong><span>' + esc(category) + '</span></div><b>+ ' + esc(money(price)) + '</b></div>' +
      '<div class="prodComboOptionalStageAFields"><label class="prodComboField"><span>Cantidad</span><input id="combo_opcional_stagea_sync_' + index + '_cantidad" type="text" value="' + esc(qty) + '"></label>' +
      '<label class="prodComboField"><span>Estado visual</span><select id="combo_opcional_stagea_sync_' + index + '_estado"><option value="Visible" ' + (state !== 'Oculto' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (state === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComboField"><span>Precio tomado del producto</span><input id="combo_opcional_stagea_sync_' + index + '_precio" value="' + esc(money(price)) + '" readonly></label></div></div>' +
      '<button type="button" class="prodComboOptionalStageADelete" data-combo-optionals-stage-delete="1" aria-label="Eliminar producto agregado"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg></button>' +
      '</article>';
  }

  function ensureEmpty(list) {
    if (!list) return;
    const hasCards = !!list.querySelector('[data-combo-optionals-stage-card]');
    const empty = list.querySelector('[data-combo-optionals-stage-empty]');
    if (hasCards && empty) empty.remove();
    if (!hasCards && !empty) {
      list.innerHTML = '<div class="prodComboOptionalStageAEmpty" data-combo-optionals-stage-empty="1"><strong>Sin productos agregados todavía</strong><span>Usá + Agregar producto para seleccionar productos existentes. No se crean opciones manuales.</span></div>';
    }
  }

  function readItems(comboId) {
    const id = String(comboId || '').trim();
    if (!id) return [];

    const map = readObject(MAP_KEY);
    if (Array.isArray(map[id])) return map[id];

    const payload = readArray(PAYLOAD_KEY).find(function (combo) {
      return String(combo.product_id || combo.id || combo.combo_id || '') === id;
    });
    if (payload && Array.isArray(payload.optional_products)) return payload.optional_products;

    const builder = readArray(BUILDER_KEY).find(function (combo) {
      return String(combo.id || combo.combo_id || combo.product_id || '') === id;
    });
    if (builder && Array.isArray(builder.optional_products)) return builder.optional_products;
    if (builder && Array.isArray(builder.opcionales)) {
      return builder.opcionales.map(function (item, index) {
        return {
          product_id: item.productId || item.product_id || item.id || '',
          cantidad_label: item.cantidad || item.cantidad_label || '1 unidad',
          estado_visual: item.agregado === false ? 'Oculto' : 'Visible',
          position: index + 1,
          snapshot_producto: item.snapshot_producto || {}
        };
      }).filter(function (item) { return item.product_id; });
    }

    return [];
  }

  function writeItems(comboId, items) {
    const id = String(comboId || '').trim();
    if (!id) return;

    const normalized = Array.isArray(items) ? items : [];
    const now = new Date().toISOString();

    const map = readObject(MAP_KEY);
    map[id] = normalized;
    writeObject(MAP_KEY, map);
    writeObject(LAST_KEY, {
      combo_id: id,
      section_key: 'agregados_opcionales',
      section_title: 'Agregados opcionales',
      source: 'productos_comestibles',
      relation_model: 'combo_optional_product_links',
      manual_creation_enabled: false,
      items: normalized,
      updated_at: now
    });

    const payloads = readArray(PAYLOAD_KEY);
    const payloadIndex = payloads.findIndex(function (combo) {
      return String(combo.product_id || combo.id || combo.combo_id || '') === id;
    });
    if (payloadIndex >= 0) {
      payloads[payloadIndex] = Object.assign({}, payloads[payloadIndex], {
        optional_products: normalized,
        optional_products_count: normalized.length,
        optional_count: normalized.length,
        recommended_count: normalized.length,
        updated_at: now
      });
      writeArray(PAYLOAD_KEY, payloads);
    }

    const builders = readArray(BUILDER_KEY);
    const builderIndex = builders.findIndex(function (combo) {
      return String(combo.id || combo.combo_id || combo.product_id || '') === id;
    });
    if (builderIndex >= 0) {
      builders[builderIndex] = Object.assign({}, builders[builderIndex], {
        optional_products: normalized,
        optional_products_count: normalized.length,
        optional_count: normalized.length,
        recommended_count: normalized.length,
        opcionales: normalized.map(function (item) {
          return {
            productId: item.product_id,
            cantidad: item.cantidad_label || item.quantity_label || item.cantidad || '1 unidad',
            agregado: item.activo !== false
          };
        }),
        updated_at: now
      });
      writeArray(BUILDER_KEY, builders);
    }

    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_LAST__ = normalized;
    window.__PRODUCTOS_COMBO_OPTIONALS_SYNC_LAST__ = {
      combo_id: id,
      count: normalized.length,
      payload_updated: payloadIndex >= 0,
      builder_updated: builderIndex >= 0,
      updated_at: now
    };

    patchTableCount(id, normalized.length);
  }

  function persistFromDom() {
    const comboId = currentComboId();
    if (!comboId) return;
    writeItems(comboId, collectFromDom());
  }

  function hydrateIntoDom() {
    const comboId = currentComboId();
    const list = optionalList();
    if (!comboId || !list) return;

    const hasCards = !!list.querySelector('[data-combo-optionals-stage-card]');
    const items = readItems(comboId);

    if (items.length && !hasCards) {
      list.innerHTML = items.map(cardHtml).join('');
      ensureEmpty(list);
      patchTableCount(comboId, items.length);
    }

    if (!items.length && !hasCards) ensureEmpty(list);
  }

  function patchTableCount(comboId, count) {
    const id = String(comboId || '').trim();
    if (!id) return;

    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const rowId = String(
        row.dataset.supabaseProductId ||
        row.dataset.localProductId ||
        row.querySelector('[data-edit-supabase-product]')?.dataset.editSupabaseProduct ||
        row.querySelector('[data-edit-local-product]')?.dataset.editLocalProduct ||
        ''
      ).trim();
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (rowId === id && typeText.includes('combo') && row.children[6]) {
        row.children[6].textContent = String(count);
      }
    });
  }

  function scheduleHydrate() {
    clearTimeout(hydrationTimer);
    hydrationTimer = setTimeout(hydrateIntoDom, 90);
  }

  function schedulePersist() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(persistFromDom, 80);
  }

  function pollComboChange() {
    const id = currentComboId();
    if (id && id !== lastComboId) {
      lastComboId = id;
      [80, 220, 520, 900].forEach(function (delay) {
        setTimeout(hydrateIntoDom, delay);
      });
    }
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboOptionalsPayloadSyncBound === '1') return;
    document.body.dataset.comboOptionalsPayloadSyncBound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComboSaveBtn')) {
        persistFromDom();
        setTimeout(persistFromDom, 180);
        setTimeout(hydrateIntoDom, 260);
      }
      if (
        event.target.closest('[data-combo-optionals-stage-confirm]') ||
        event.target.closest('[data-combo-optionals-stage-delete]')
      ) {
        setTimeout(schedulePersist, 80);
      }
      if (
        event.target.closest('[data-edit-supabase-product]') ||
        event.target.closest('[data-edit-local-product]') ||
        event.target.closest('#prodComboNewBtn')
      ) {
        [180, 420, 900].forEach(function (delay) { setTimeout(scheduleHydrate, delay); });
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.closest('[data-combo-optionals-stage-card]')) schedulePersist();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target.closest('[data-combo-optionals-stage-card]')) schedulePersist();
    }, true);

    window.addEventListener('productos:payload-ready', function () {
      setTimeout(persistFromDom, 30);
      setTimeout(persistFromDom, 220);
    });

    setInterval(pollComboChange, 250);
    [120, 360, 800, 1400].forEach(function (delay) { setTimeout(hydrateIntoDom, delay); });

    window.ProductosComboOptionalsPayloadSync = {
      collect: collectFromDom,
      persist: persistFromDom,
      hydrate: hydrateIntoDom,
      read: function () { return readItems(currentComboId()); },
      last: function () { return window.__PRODUCTOS_COMBO_OPTIONALS_SYNC_LAST__ || null; }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
