/*
  ETAPA A AISLADA · Combos: Agregados opcionales

  Este archivo gestiona SOLO la sección:
  Combos → Podés sumar → Agregados opcionales.

  No toca Extras.
  No usa ProductosExtrasSelector.
  No modifica prodComboExtrasList.
*/
(function () {
  const STORAGE_KEY = 'sazzu_combo_optional_products_v1';
  const COMBOS_KEY = 'sazzu_productos_combos_v1';
  const STYLE_ID = 'productos-combo-optionals-stage-a-css';

  let observerReady = false;
  let pendingSelected = new Set();

  const DEFAULT_PRODUCTS = [
    { id: 'box-dulce-nube', nombre: 'Box Dulce Nube', categoria: 'Postre armado', precio: 9800, imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80' },
    { id: 'torta-choco-cream', nombre: 'Torta Choco Cream', categoria: 'Torta artesanal', precio: 16500, imagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80' },
    { id: 'muffins-mix', nombre: 'Muffins Mix', categoria: 'Pastelería rápida', precio: 7200, imagen: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=80' },
    { id: 'cookies-con-chips', nombre: 'Cookies con chips', categoria: 'Cookies', precio: 2200, imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
    { id: 'mini-alfajores', nombre: 'Mini alfajores', categoria: 'Alfajores', precio: 2600, imagen: 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?auto=format&fit=crop&w=900&q=80' }
  ];

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
      console.warn('[productos-combo-optionals-stage-a.js] No se pudo escribir ' + key, error);
    }
  }

  function writeObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value || {}));
    } catch (error) {
      console.warn('[productos-combo-optionals-stage-a.js] No se pudo escribir ' + key, error);
    }
  }

  function normalizeProduct(product) {
    const data = product || {};
    const identity = data.identity || {};
    const images = Array.isArray(data.images) ? data.images : [];
    const id = String(data.client_product_key || data.product_id || data.id || identity.id || data.nombre || data.name || data.title || '').trim();
    return {
      id,
      product_id: id,
      nombre: String(data.nombre || data.name || data.title || identity.nombre || identity.name || 'Producto comestible').trim(),
      categoria: String(data.categoria || data.category || identity.categoria || identity.category || 'Producto').trim(),
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : (data.base_price != null ? data.base_price : identity.precio || identity.base_price || 0))) || 0,
      imagen: String(data.imagen || data.image || data.primary_image_url || (images[0] && images[0].image_url) || '').trim(),
      estado: String(data.estado || data.status || 'Borrador').trim(),
      product_type: String(data.product_type || 'producto_simple').trim()
    };
  }

  function readProducts() {
    const map = new Map();

    function add(product) {
      const normalized = normalizeProduct(product);
      if (!normalized.id || !normalized.nombre) return;
      const type = String(normalized.product_type || '').toLowerCase();
      if (type === 'combo' || type === 'food_combo_product') return;
      map.set(normalized.id, Object.assign({}, map.get(normalized.id) || {}, normalized));
    }

    if (Array.isArray(window.__lastSupabaseProducts)) {
      window.__lastSupabaseProducts.forEach(add);
    }

    readArray('sazzu_productos_payloads_local_v1').forEach(add);
    readArray('sazzu_productos_comestibles_v1').forEach(add);

    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (typeText.includes('combo')) return;

      const edit = row.querySelector('[data-edit-supabase-product], [data-edit-local-product]');
      const name = row.querySelector('.prodComCell strong');
      if (!edit || !name) return;

      const sub = row.querySelector('.prodComCell span');
      const img = row.querySelector('.prodComThumb img');
      const priceCell = row.children[2];

      add({
        id: edit.dataset.editSupabaseProduct || edit.dataset.editLocalProduct,
        nombre: name.textContent,
        categoria: sub ? String(sub.textContent || '').replace('· Supabase', '').replace('· Guardado local', '').trim() : 'Producto',
        precio: priceCell ? Number(String(priceCell.textContent || '').replace(/[^0-9]/g, '')) || 0 : 0,
        imagen: img ? img.getAttribute('src') : '',
        product_type: 'producto_simple'
      });
    });

    if (!map.size) DEFAULT_PRODUCTS.forEach(add);
    return Array.from(map.values());
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset ? slide.dataset.comboId || '' : '').trim();
  }

  function findOptionalSection() {
    return Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection')).find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').toLowerCase();
      return (eyebrow.includes('podés sumar') || eyebrow.includes('podes sumar')) && title.includes('agregados opcionales');
    }) || null;
  }

  function optionalList() {
    const section = findOptionalSection();
    return section ? section.querySelector('.prodComboItems') : null;
  }

  function getSavedCombo(comboId) {
    return readArray(COMBOS_KEY).find(function (combo) {
      return String(combo.id || combo.combo_id || '') === String(comboId || '');
    }) || null;
  }

  function getStoredItems(comboId) {
    const combo = getSavedCombo(comboId);
    if (combo && Array.isArray(combo.optional_products)) return combo.optional_products;
    return [];
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] .prodComboOptionalStageAEmpty{padding:14px;border-radius:5px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:750;}
      body[data-page="productos"] .prodComboOptionalStageAEmpty strong{display:block;color:#0f172a;font-size:14px;font-weight:950;margin-bottom:4px;}
      body[data-page="productos"] .prodComboOptionalStageAActions{display:flex;justify-content:flex-start;margin-top:12px;}
      body[data-page="productos"] .prodComboOptionalStageAAdd{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border:0;border-radius:5px;background:#eaf2ff;color:#2479ff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .prodComboOptionalStageAAdd:hover{background:#dcebff;}
      body[data-page="productos"] .prodComboOptionalStageACard{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr) 38px;align-items:start;gap:14px;padding:14px;border-radius:5px;background:#f8fbff;box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07);}
      body[data-page="productos"] .prodComboOptionalStageAImage{width:64px;height:64px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:11px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalStageAImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComboOptionalStageABody{display:grid;gap:10px;min-width:0;}
      body[data-page="productos"] .prodComboOptionalStageAHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
      body[data-page="productos"] .prodComboOptionalStageAHead strong{display:block;color:#0f172a;font-size:14px;font-weight:950;line-height:1.15;}
      body[data-page="productos"] .prodComboOptionalStageAHead span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComboOptionalStageAHead b{color:#2479ff;font-size:14px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComboOptionalStageAFields{display:grid;grid-template-columns:.85fr .85fr 1fr;gap:10px;}
      body[data-page="productos"] .prodComboOptionalStageADelete{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:5px;background:#fee2e2;color:#b91c1c;cursor:pointer;}
      body[data-page="productos"] .prodComboOptionalStageADelete svg{width:17px;height:17px;display:block;}
      body[data-page="productos"] .prodComboOptionalStageAPicker{display:none;margin-top:12px;padding:14px;border-radius:5px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.10),0 1px 3px rgba(15,23,42,.08);}
      body[data-page="productos"] .prodComboOptionalStageAPicker.is-active{display:grid;gap:12px;}
      body[data-page="productos"] .prodComboOptionalStageAPickerHead{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      body[data-page="productos"] .prodComboOptionalStageAPickerHead strong{color:#0f172a;font-size:14px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalStageAPickerHead span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComboOptionalStageAClose{width:34px;height:34px;border:0;border-radius:5px;background:#f2f4f7;color:#0f172a;font-size:20px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .prodComboOptionalStageASearch{width:100%;min-height:40px;border:1px solid #e5e7eb;border-radius:5px;padding:0 12px;font-family:inherit;font-weight:800;}
      body[data-page="productos"] .prodComboOptionalStageAGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      body[data-page="productos"] .prodComboOptionalStageAPick{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:2px solid transparent;border-radius:5px;background:#f8fafc;cursor:pointer;text-align:left;font-family:inherit;}
      body[data-page="productos"] .prodComboOptionalStageAPick:hover,body[data-page="productos"] .prodComboOptionalStageAPick.is-selected{border-color:#2479ff;background:#eff6ff;}
      body[data-page="productos"] .prodComboOptionalStageAPickImage{width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:10px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalStageAPickImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComboOptionalStageAPick strong{color:#0f172a;font-size:13px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalStageAPick span{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:750;}
      body[data-page="productos"] .prodComboOptionalStageAPick b{color:#2479ff;font-size:13px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComboOptionalStageAPickerActions{display:flex;justify-content:flex-end;}
      body[data-page="productos"] .prodComboOptionalStageAConfirm{min-height:38px;padding:0 14px;border:0;border-radius:5px;background:#2479ff;color:#fff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}
      @media(max-width:980px){body[data-page="productos"] .prodComboOptionalStageACard{grid-template-columns:minmax(0,1fr) 38px;}body[data-page="productos"] .prodComboOptionalStageAImage{display:none;}body[data-page="productos"] .prodComboOptionalStageAFields,body[data-page="productos"] .prodComboOptionalStageAGrid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function cardHtml(item, index) {
    const product = normalizeProduct((item && item.snapshot_producto) || item || {});
    const productId = String(item && (item.product_id || item.linked_product_id) ? (item.product_id || item.linked_product_id) : product.id).trim();
    const qty = item && (item.cantidad_label || item.quantity_label || item.cantidad) ? (item.cantidad_label || item.quantity_label || item.cantidad) : '1 unidad';
    const state = item && (item.estado_visual || item.status || item.estado) ? (item.estado_visual || item.status || item.estado) : 'Visible';
    const image = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
    return '<article class="prodComboOptionalStageACard" data-combo-optionals-stage-card="1" data-product-id="' + esc(productId) + '">' +
      '<div class="prodComboOptionalStageAImage">' + image + '</div>' +
      '<div class="prodComboOptionalStageABody"><div class="prodComboOptionalStageAHead"><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.categoria || 'Producto') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></div>' +
      '<div class="prodComboOptionalStageAFields"><label class="prodComboField"><span>Cantidad</span><input id="combo_opcional_stagea_' + index + '_cantidad" type="text" value="' + esc(qty) + '"></label>' +
      '<label class="prodComboField"><span>Estado visual</span><select id="combo_opcional_stagea_' + index + '_estado"><option value="Visible" ' + (state !== 'Oculto' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (state === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComboField"><span>Precio tomado del producto</span><input id="combo_opcional_stagea_' + index + '_precio" value="' + esc(money(product.precio)) + '" readonly></label></div>' +
      '<input type="hidden" id="combo_opcional_stagea_' + index + '_product" value="' + esc(productId) + '"></div>' +
      '<button type="button" class="prodComboOptionalStageADelete" data-combo-optionals-stage-delete="1" aria-label="Eliminar producto agregado">' + trashIcon() + '</button></article>';
  }

  function selectedIds() {
    const list = optionalList();
    if (!list) return new Set();
    return new Set(Array.from(list.querySelectorAll('[data-combo-optionals-stage-card]')).map(function (card) {
      return String(card.dataset.productId || '').trim();
    }).filter(Boolean));
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

  function ensurePicker(section) {
    if (!section || section.querySelector('[data-combo-optionals-stage-picker]')) return;
    const picker = document.createElement('div');
    picker.className = 'prodComboOptionalStageAPicker';
    picker.dataset.comboOptionalsStagePicker = '1';
    picker.innerHTML = '<div class="prodComboOptionalStageAPickerHead"><div><strong>Seleccionar productos existentes</strong><span>Elegí productos ya creados para ofrecerlos como agregados opcionales.</span></div><button type="button" class="prodComboOptionalStageAClose" data-combo-optionals-stage-close="1">×</button></div><input type="search" class="prodComboOptionalStageASearch" data-combo-optionals-stage-search="1" placeholder="Buscar producto..."><div class="prodComboOptionalStageAGrid" data-combo-optionals-stage-grid="1"></div><div class="prodComboOptionalStageAPickerActions"><button type="button" class="prodComboOptionalStageAConfirm" data-combo-optionals-stage-confirm="1">Agregar seleccionados</button></div>';
    section.appendChild(picker);
  }

  function ensureActions(section, list) {
    if (!section || !list) return;
    let actions = section.querySelector('[data-combo-optionals-stage-actions]');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'prodComboOptionalStageAActions';
      actions.dataset.comboOptionalsStageActions = '1';
      actions.innerHTML = '<button type="button" class="prodComboOptionalStageAAdd" data-combo-optionals-stage-add="1">+ Agregar producto</button>';
      list.insertAdjacentElement('afterend', actions);
    }
    ensurePicker(section);
  }

  function renderPicker(query) {
    const section = findOptionalSection();
    const picker = section ? section.querySelector('[data-combo-optionals-stage-picker]') : null;
    const grid = picker ? picker.querySelector('[data-combo-optionals-stage-grid]') : null;
    if (!grid) return;
    const q = String(query || '').toLowerCase().trim();
    const selected = selectedIds();
    const products = readProducts().filter(function (product) {
      if (selected.has(product.id)) return false;
      const haystack = [product.nombre, product.categoria, product.estado].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
    grid.innerHTML = products.length ? products.map(function (product) {
      const image = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
      return '<button type="button" class="prodComboOptionalStageAPick ' + (pendingSelected.has(product.id) ? 'is-selected' : '') + '" data-combo-optionals-stage-pick="1" data-product-id="' + esc(product.id) + '"><div class="prodComboOptionalStageAPickImage">' + image + '</div><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.categoria || 'Producto') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></button>';
    }).join('') : '<div class="prodComboOptionalStageAEmpty"><strong>No hay productos disponibles</strong><span>Ya seleccionaste todos los productos existentes disponibles.</span></div>';
  }

  function openPicker() {
    const section = findOptionalSection();
    if (!section) return;
    ensurePicker(section);
    pendingSelected = new Set();
    const picker = section.querySelector('[data-combo-optionals-stage-picker]');
    if (picker) picker.classList.add('is-active');
    const search = picker ? picker.querySelector('[data-combo-optionals-stage-search]') : null;
    if (search) search.value = '';
    renderPicker('');
  }

  function closePicker() {
    const picker = document.querySelector('[data-combo-optionals-stage-picker]');
    if (picker) picker.classList.remove('is-active');
    pendingSelected = new Set();
  }

  function confirmPicker() {
    const list = optionalList();
    if (!list || !pendingSelected.size) { closePicker(); return; }
    const empty = list.querySelector('[data-combo-optionals-stage-empty]');
    if (empty) empty.remove();
    let index = list.querySelectorAll('[data-combo-optionals-stage-card]').length;
    pendingSelected.forEach(function (productId) {
      if (selectedIds().has(productId)) return;
      const product = readProducts().find(function (item) { return String(item.id) === String(productId); });
      if (!product) return;
      list.insertAdjacentHTML('beforeend', cardHtml({ product_id: product.id, cantidad_label: '1 unidad', estado_visual: 'Visible', snapshot_producto: product }, index));
      index += 1;
    });
    closePicker();
    ensureEmpty(list);
    persist();
  }

  function collect() {
    const list = optionalList();
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-combo-optionals-stage-card]')).map(function (card, index) {
      const product = readProducts().find(function (item) { return String(item.id) === String(card.dataset.productId); }) || normalizeProduct({ id: card.dataset.productId, nombre: card.querySelector('.prodComboOptionalStageAHead strong')?.textContent || 'Producto' });
      const qty = card.querySelector('input[id^="combo_opcional_stagea_"][id$="_cantidad"]');
      const state = card.querySelector('select[id^="combo_opcional_stagea_"][id$="_estado"]');
      return {
        product_id: product.id,
        linked_product_id: product.id,
        cantidad: qty ? qty.value : '1 unidad',
        cantidad_label: qty ? qty.value : '1 unidad',
        quantity_label: qty ? qty.value : '1 unidad',
        estado_visual: state ? state.value : 'Visible',
        status: state ? state.value : 'Visible',
        activo: !(state && state.value === 'Oculto'),
        position: index + 1,
        snapshot_producto: product
      };
    });
  }

  function persist() {
    const comboId = currentComboId() || 'nuevo-combo';
    const items = collect();
    const payload = {
      combo_id: comboId,
      section_key: 'agregados_opcionales',
      section_title: 'Agregados opcionales',
      source: 'productos_comestibles',
      relation_model: 'combo_optional_product_links',
      manual_creation_enabled: false,
      items,
      updated_at: new Date().toISOString()
    };

    writeObject(STORAGE_KEY, payload);
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_PAYLOAD__ = payload;
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_LAST__ = items;

    const combos = readArray(COMBOS_KEY);
    const index = combos.findIndex(function (combo) {
      return String(combo.id || combo.combo_id || '') === String(comboId);
    });

    if (index >= 0) {
      combos[index] = Object.assign({}, combos[index], {
        optional_products: items,
        optional_products_count: items.length,
        optional_count: items.length,
        recommended_count: items.length,
        opcionales: items.map(function (item) {
          return { productId: item.product_id, cantidad: item.cantidad_label, agregado: item.activo !== false };
        }),
        updated_at: new Date().toISOString()
      });
      writeArray(COMBOS_KEY, combos);
    }

    patchTableCount(comboId, items.length);
    return payload;
  }

  function patchTableCount(comboId, count) {
    const id = String(comboId || '').trim();
    if (!id) return;
    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const rowId = String(row.dataset.supabaseProductId || row.dataset.localProductId || row.querySelector('[data-edit-supabase-product]')?.dataset.editSupabaseProduct || row.querySelector('[data-edit-local-product]')?.dataset.editLocalProduct || '').trim();
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (rowId === id && typeText.includes('combo') && row.children[6]) row.children[6].textContent = String(count);
    });
  }

  function hydrate() {
    const comboId = currentComboId();
    const list = optionalList();
    if (!comboId || !list) return;
    const items = getStoredItems(comboId);
    list.innerHTML = items.length ? items.map(cardHtml).join('') : '';
    ensureEmpty(list);
  }

  function enhance() {
    injectStyles();
    const section = findOptionalSection();
    if (!section) return;
    const list = section.querySelector('.prodComboItems');
    if (!list) return;
    section.classList.add('prodComboSection--optionalStageA2');
    Array.from(list.querySelectorAll('.prodComboItem--product:not([data-combo-optionals-stage-card])')).forEach(function (node) { node.remove(); });
    ensureActions(section, list);
    if (!list.querySelector('[data-combo-optionals-stage-card], [data-combo-optionals-stage-empty]')) hydrate();
    ensureEmpty(list);
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboOptionalsStageABound === '1') return;
    document.body.dataset.comboOptionalsStageABound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-combo-optionals-stage-add]')) { event.preventDefault(); openPicker(); return; }
      if (event.target.closest('[data-combo-optionals-stage-close]')) { event.preventDefault(); closePicker(); return; }
      if (event.target.closest('[data-combo-optionals-stage-pick]')) {
        event.preventDefault();
        const card = event.target.closest('[data-combo-optionals-stage-pick]');
        const id = card.dataset.productId;
        if (pendingSelected.has(id)) pendingSelected.delete(id); else pendingSelected.add(id);
        card.classList.toggle('is-selected', pendingSelected.has(id));
        return;
      }
      if (event.target.closest('[data-combo-optionals-stage-confirm]')) { event.preventDefault(); confirmPicker(); return; }
      if (event.target.closest('[data-combo-optionals-stage-delete]')) {
        event.preventDefault();
        const card = event.target.closest('[data-combo-optionals-stage-card]');
        if (card) card.remove();
        ensureEmpty(optionalList());
        persist();
        renderPicker('');
        return;
      }
      if (event.target.closest('#prodComboSaveBtn')) persist();
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.matches('[data-combo-optionals-stage-search]')) { renderPicker(event.target.value || ''); return; }
      if (event.target.closest('[data-combo-optionals-stage-card]')) persist();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target.closest('[data-combo-optionals-stage-card]')) persist();
    }, true);

    window.ProductosCombosUpsellsUi = {
      refresh: enhance,
      collect,
      payload: function () { return { combo_id: currentComboId(), items: collect() }; },
      persist,
      products: readProducts
    };

    if (!observerReady) {
      observerReady = true;
      const observer = new MutationObserver(function () { setTimeout(enhance, 60); });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    [0, 120, 360, 800].forEach(function (delay) { setTimeout(enhance, delay); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
