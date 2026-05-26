/*
  FASE 1 · Producto Comestible: Podés sumar / Agregados opcionales

  Alcance:
  - Reemplaza visualmente la sección placeholder de Recomendados.
  - Activa selector de productos/combos existentes.
  - No toca Extras.
  - No usa ProductosExtrasSelector.
  - No modifica Banco de extras ni entity_extra_links.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-optionals-stage-a-css';
  const PRODUCTS_KEY = 'sazzu_productos_comestibles_v1';
  const COMBOS_KEY = 'sazzu_productos_combos_v1';
  const LOCAL_PRODUCTS_KEY = 'sazzu_productos_payloads_local_v1';
  const LOCAL_COMBOS_KEY = 'sazzu_combos_payloads_local_v1';

  let observerReady = false;
  let pendingSelected = new Set();

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

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }

  function currentProductId() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset ? slide.dataset.productId || '' : '').trim();
  }

  function normalizeCandidate(item, forcedType) {
    const data = item || {};
    const identity = data.identity || {};
    const images = Array.isArray(data.images) ? data.images : [];
    const imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];
    const productType = String(forcedType || data.product_type || data.type || '').toLowerCase();
    const isCombo = productType.includes('combo') || data.combo === true;
    const id = String(
      data.client_product_key ||
      data.product_id ||
      data.combo_id ||
      data.id ||
      identity.id ||
      data.nombre ||
      data.name ||
      data.title ||
      ''
    ).trim();
    const name = String(data.nombre || data.name || data.title || identity.name || identity.nombre || 'Producto').trim();
    return {
      id: id || slugify(name),
      product_id: id || slugify(name),
      linked_product_id: id || slugify(name),
      nombre: name,
      name: name,
      categoria: String(data.categoria || data.category || identity.category || identity.categoria || (isCombo ? 'Combo' : 'Producto')).trim(),
      category: String(data.category || data.categoria || identity.category || identity.categoria || (isCombo ? 'Combo' : 'Producto')).trim(),
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : (identity.base_price != null ? identity.base_price : data.base_price || 0))) || 0,
      price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : (identity.base_price != null ? identity.base_price : data.base_price || 0))) || 0,
      imagen: String(data.imagen || data.image || data.primary_image_url || imagenes[0] || (images[0] && images[0].image_url) || '').trim(),
      image: String(data.image || data.imagen || data.primary_image_url || imagenes[0] || (images[0] && images[0].image_url) || '').trim(),
      estado: String(data.estado || data.status || 'Borrador').trim(),
      status: String(data.status || data.estado || 'Borrador').trim(),
      product_type: isCombo ? 'combo' : 'producto_simple',
      tipo_label: isCombo ? 'Combo' : 'Producto'
    };
  }

  function readCandidates() {
    const map = new Map();
    const activeId = currentProductId();

    function add(item, forcedType) {
      const normalized = normalizeCandidate(item, forcedType);
      if (!normalized.id || !normalized.nombre) return;
      if (activeId && String(normalized.id) === String(activeId)) return;
      map.set(normalized.id, Object.assign({}, map.get(normalized.id) || {}, normalized));
    }

    if (Array.isArray(window.__lastSupabaseProducts)) window.__lastSupabaseProducts.forEach(function (item) { add(item); });

    readArray(PRODUCTS_KEY).forEach(function (item) { add(item, 'producto_simple'); });
    readArray(LOCAL_PRODUCTS_KEY).forEach(function (item) { add(item, 'producto_simple'); });
    readArray(COMBOS_KEY).forEach(function (item) { add(item, 'combo'); });
    readArray(LOCAL_COMBOS_KEY).forEach(function (item) { add(item, 'combo'); });

    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const edit = row.querySelector('[data-edit-com], [data-edit-supabase-product], [data-edit-local-product]');
      const name = row.querySelector('.prodComCell strong');
      if (!edit || !name) return;
      const id = edit.dataset.editCom || edit.dataset.editSupabaseProduct || edit.dataset.editLocalProduct || '';
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      const sub = row.querySelector('.prodComCell span');
      const img = row.querySelector('.prodComThumb img');
      const priceCell = row.children[2];
      add({
        id: id,
        nombre: name.textContent,
        categoria: sub ? String(sub.textContent || '').trim() : (typeText.includes('combo') ? 'Combo' : 'Producto'),
        precio: priceCell ? Number(String(priceCell.textContent || '').replace(/[^0-9]/g, '')) || 0 : 0,
        imagen: img ? img.getAttribute('src') : '',
        product_type: typeText.includes('combo') ? 'combo' : 'producto_simple'
      });
    });

    return Array.from(map.values());
  }

  function findOptionalSection() {
    return document.querySelector('#prodComSlideBody [data-prod-com-section="recomendados"]') || null;
  }

  function optionalList() {
    const section = findOptionalSection();
    return section ? section.querySelector('.prodComOptions[data-options-key="recomendados"]') : null;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] .prodComSection--optionalStageA .prodComSectionActions{display:flex;justify-content:flex-start;margin-top:12px;}
      body[data-page="productos"] .prodComOptionalStageAEmpty{padding:14px;border-radius:5px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:750;}
      body[data-page="productos"] .prodComOptionalStageAEmpty strong{display:block;color:#0f172a;font-size:14px;font-weight:950;margin-bottom:4px;}
      body[data-page="productos"] .prodComOptionalStageAAdd{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border:0;border-radius:5px;background:#eaf2ff;color:#2479ff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .prodComOptionalStageAAdd:hover{background:#dcebff;}
      body[data-page="productos"] .prodComOptionalStageACard{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr) 38px;align-items:start;gap:14px;padding:14px;border-radius:5px;background:#f8fbff;box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07);}
      body[data-page="productos"] .prodComOptionalStageAImage{width:64px;height:64px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:11px;font-weight:950;}
      body[data-page="productos"] .prodComOptionalStageAImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComOptionalStageABody{display:grid;gap:10px;min-width:0;}
      body[data-page="productos"] .prodComOptionalStageAHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
      body[data-page="productos"] .prodComOptionalStageAHead strong{display:block;color:#0f172a;font-size:14px;font-weight:950;line-height:1.15;}
      body[data-page="productos"] .prodComOptionalStageAHead span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComOptionalStageAHead b{color:#2479ff;font-size:14px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComOptionalStageAFields{display:grid;grid-template-columns:.85fr .85fr 1fr;gap:10px;}
      body[data-page="productos"] .prodComOptionalStageADelete{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:5px;background:#fee2e2;color:#b91c1c;cursor:pointer;}
      body[data-page="productos"] .prodComOptionalStageADelete svg{width:17px;height:17px;display:block;}
      body[data-page="productos"] .prodComOptionalStageAPicker{display:none;margin-top:12px;padding:14px;border-radius:5px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.10),0 1px 3px rgba(15,23,42,.08);}
      body[data-page="productos"] .prodComOptionalStageAPicker.is-active{display:grid;gap:12px;}
      body[data-page="productos"] .prodComOptionalStageAPickerHead{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      body[data-page="productos"] .prodComOptionalStageAPickerHead strong{color:#0f172a;font-size:14px;font-weight:950;}
      body[data-page="productos"] .prodComOptionalStageAPickerHead span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComOptionalStageAClose{width:34px;height:34px;border:0;border-radius:5px;background:#f2f4f7;color:#0f172a;font-size:20px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .prodComOptionalStageASearch{width:100%;min-height:40px;border:1px solid #e5e7eb;border-radius:5px;padding:0 12px;font-family:inherit;font-weight:800;}
      body[data-page="productos"] .prodComOptionalStageAGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      body[data-page="productos"] .prodComOptionalStageAPick{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:2px solid transparent;border-radius:5px;background:#f8fafc;cursor:pointer;text-align:left;font-family:inherit;}
      body[data-page="productos"] .prodComOptionalStageAPick:hover,body[data-page="productos"] .prodComOptionalStageAPick.is-selected{border-color:#2479ff;background:#eff6ff;}
      body[data-page="productos"] .prodComOptionalStageAPickImage{width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:10px;font-weight:950;}
      body[data-page="productos"] .prodComOptionalStageAPickImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComOptionalStageAPick strong{color:#0f172a;font-size:13px;font-weight:950;}
      body[data-page="productos"] .prodComOptionalStageAPick span{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:750;}
      body[data-page="productos"] .prodComOptionalStageAPick b{color:#2479ff;font-size:13px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComOptionalStageAPickerActions{display:flex;justify-content:flex-end;}
      body[data-page="productos"] .prodComOptionalStageAConfirm{min-height:38px;padding:0 14px;border:0;border-radius:5px;background:#2479ff;color:#fff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}
      @media(max-width:980px){body[data-page="productos"] .prodComOptionalStageACard{grid-template-columns:minmax(0,1fr) 38px;}body[data-page="productos"] .prodComOptionalStageAImage{display:none;}body[data-page="productos"] .prodComOptionalStageAFields,body[data-page="productos"] .prodComOptionalStageAGrid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function legacyItemFromCard(card) {
    if (!card) return null;
    const name = card.querySelector('[id^="recomendados_"][id$="_nombre"]');
    const desc = card.querySelector('[id^="recomendados_"][id$="_desc"]');
    const price = card.querySelector('[id^="recomendados_"][id$="_precio"]');
    const state = card.querySelector('[id^="recomendados_"][id$="_estado"]');
    const badge = card.querySelector('[id^="recomendados_"][id$="_badge"]');
    const img = card.querySelector('[id^="recomendados_"][id$="_img"]');
    const productId = card.dataset.productId || slugify(name ? name.value : 'producto');
    if (!name || !name.value) return null;
    return {
      product_id: productId,
      linked_product_id: productId,
      cantidad_label: '1 unidad',
      estado_visual: state ? state.value : 'Visible',
      status: state ? state.value : 'Visible',
      snapshot_producto: {
        id: productId,
        product_id: productId,
        nombre: name.value,
        categoria: desc ? desc.value : 'Producto',
        precio: price ? parseMoney(price.value) : 0,
        imagen: img ? img.value : '',
        badge: badge ? badge.value : '',
        product_type: 'producto_simple'
      }
    };
  }

  function cardHtml(item, index) {
    const product = normalizeCandidate((item && item.snapshot_producto) || item || {});
    const productId = String(item && (item.product_id || item.linked_product_id) ? (item.product_id || item.linked_product_id) : product.id).trim();
    const qty = item && (item.cantidad_label || item.quantity_label || item.cantidad) ? (item.cantidad_label || item.quantity_label || item.cantidad) : '1 unidad';
    const state = item && (item.estado_visual || item.status || item.estado) ? (item.estado_visual || item.status || item.estado) : 'Visible';
    const image = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
    return '<article class="prodComOption prodComOptionalStageACard" data-prod-com-optionals-card="1" data-option-key="recomendados" data-product-id="' + esc(productId) + '">' +
      '<div class="prodComOptionalStageAImage">' + image + '</div>' +
      '<div class="prodComOptionalStageABody"><div class="prodComOptionalStageAHead"><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.categoria || product.tipo_label || 'Producto') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></div>' +
      '<div class="prodComOptionalStageAFields"><label class="prodComField"><span>Cantidad</span><input id="prod_com_recomendado_' + index + '_cantidad" type="text" value="' + esc(qty) + '"></label>' +
      '<label class="prodComField"><span>Estado visual</span><select id="prod_com_recomendado_' + index + '_estado"><option value="Visible" ' + (state !== 'Oculto' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (state === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComField"><span>Precio tomado del producto</span><input id="prod_com_recomendado_' + index + '_precio_visible" value="' + esc(money(product.precio)) + '" readonly></label></div>' +
      '<input type="hidden" id="recomendados_' + index + '_nombre" value="' + esc(product.nombre) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_desc" value="' + esc(product.categoria || product.tipo_label || 'Producto') + '">' +
      '<input type="hidden" id="recomendados_' + index + '_precio" value="' + esc(product.precio) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_estado" value="' + esc(state) + '">' +
      '<input type="hidden" id="recomendados_' + index + '_badge" value="Agregado opcional">' +
      '<input type="hidden" id="recomendados_' + index + '_img" value="' + esc(product.imagen) + '"></div>' +
      '<button type="button" class="prodComOptionalStageADelete" data-prod-com-optionals-delete="1" aria-label="Eliminar producto agregado">' + trashIcon() + '</button></article>';
  }

  function selectedIds() {
    const list = optionalList();
    if (!list) return new Set();
    return new Set(Array.from(list.querySelectorAll('[data-prod-com-optionals-card]')).map(function (card) {
      return String(card.dataset.productId || '').trim();
    }).filter(Boolean));
  }

  function collect() {
    const list = optionalList();
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-prod-com-optionals-card]')).map(function (card, index) {
      const productId = String(card.dataset.productId || '').trim();
      const product = readCandidates().find(function (item) { return String(item.id) === productId; }) || normalizeCandidate({
        id: productId,
        nombre: card.querySelector('.prodComOptionalStageAHead strong')?.textContent || 'Producto',
        categoria: card.querySelector('.prodComOptionalStageAHead span')?.textContent || 'Producto',
        precio: parseMoney(card.querySelector('.prodComOptionalStageAHead b')?.textContent || '0'),
        imagen: card.querySelector('.prodComOptionalStageAImage img')?.getAttribute('src') || ''
      });
      const qty = card.querySelector('input[id^="prod_com_recomendado_"][id$="_cantidad"]');
      const state = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
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

  function ensureEmpty(list) {
    if (!list) return;
    const hasCards = !!list.querySelector('[data-prod-com-optionals-card]');
    const empty = list.querySelector('[data-prod-com-optionals-empty]');
    if (hasCards && empty) empty.remove();
    if (!hasCards && !empty) {
      list.innerHTML = '<div class="prodComOptionalStageAEmpty" data-prod-com-optionals-empty="1"><strong>Sin productos agregados todavía</strong><span>Usá + Agregar producto para seleccionar productos o combos existentes. No se crean opciones manuales.</span></div>';
    }
  }

  function renumberLegacyFields() {
    const list = optionalList();
    if (!list) return;
    Array.from(list.querySelectorAll('[data-prod-com-optionals-card]')).forEach(function (card, index) {
      card.querySelectorAll('input, select').forEach(function (field) {
        const id = String(field.id || '');
        field.id = id
          .replace(/prod_com_recomendado_\d+_/g, 'prod_com_recomendado_' + index + '_')
          .replace(/recomendados_\d+_/g, 'recomendados_' + index + '_');
      });
      const visibleState = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
      const hiddenState = card.querySelector('input[id^="recomendados_"][id$="_estado"]');
      if (visibleState && hiddenState) hiddenState.value = visibleState.value;
    });
  }

  function ensurePicker(section) {
    if (!section || section.querySelector('[data-prod-com-optionals-picker]')) return;
    const picker = document.createElement('div');
    picker.className = 'prodComOptionalStageAPicker';
    picker.dataset.prodComOptionalsPicker = '1';
    picker.innerHTML = '<div class="prodComOptionalStageAPickerHead"><div><strong>Seleccionar productos existentes</strong><span>Elegí productos o combos ya creados para ofrecerlos como agregados opcionales.</span></div><button type="button" class="prodComOptionalStageAClose" data-prod-com-optionals-close="1">×</button></div><input type="search" class="prodComOptionalStageASearch" data-prod-com-optionals-search="1" placeholder="Buscar producto o combo..."><div class="prodComOptionalStageAGrid" data-prod-com-optionals-grid="1"></div><div class="prodComOptionalStageAPickerActions"><button type="button" class="prodComOptionalStageAConfirm" data-prod-com-optionals-confirm="1">Agregar seleccionados</button></div>';
    section.appendChild(picker);
  }

  function enhanceHeader(section) {
    if (!section) return;
    section.classList.add('prodComSection--optionalStageA');
    const eyebrow = section.querySelector('.prodComEyebrow');
    const title = section.querySelector('h3');
    const helper = section.querySelector('.prodComSection__head p');
    const badge = section.querySelector('.prodComBadge');
    if (eyebrow) eyebrow.textContent = 'Podés sumar';
    if (title) title.textContent = 'Agregados opcionales';
    if (helper) helper.textContent = 'Seleccioná productos o combos existentes para ofrecerlos como agregados opcionales dentro del pedido.';
    if (badge) badge.textContent = 'Productos existentes';
  }

  function ensureActions(section, list) {
    if (!section || !list) return;
    let actions = section.querySelector('.prodComSectionActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'prodComSectionActions';
      list.insertAdjacentElement('afterend', actions);
    }
    actions.innerHTML = '<button type="button" class="prodComOptionalStageAAdd" data-prod-com-optionals-add="1">+ Agregar producto</button>';
    ensurePicker(section);
  }

  function hydrateFromLegacyIfNeeded(list) {
    if (!list) return;
    if (list.dataset.prodComOptionalsHydrated === '1') return;
    list.dataset.prodComOptionalsHydrated = '1';

    if (list.querySelector('[data-prod-com-optionals-card]')) return;

    const legacyCards = Array.from(list.querySelectorAll('.prodComOption')).map(legacyItemFromCard).filter(Boolean);
    list.innerHTML = legacyCards.length ? legacyCards.map(cardHtml).join('') : '';
  }

  function renderPicker(query) {
    const section = findOptionalSection();
    const picker = section ? section.querySelector('[data-prod-com-optionals-picker]') : null;
    const grid = picker ? picker.querySelector('[data-prod-com-optionals-grid]') : null;
    if (!grid) return;
    const q = String(query || '').toLowerCase().trim();
    const selected = selectedIds();
    const products = readCandidates().filter(function (product) {
      if (selected.has(product.id)) return false;
      const haystack = [product.nombre, product.categoria, product.estado, product.tipo_label].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
    grid.innerHTML = products.length ? products.map(function (product) {
      const image = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
      return '<button type="button" class="prodComOptionalStageAPick ' + (pendingSelected.has(product.id) ? 'is-selected' : '') + '" data-prod-com-optionals-pick="1" data-product-id="' + esc(product.id) + '"><div class="prodComOptionalStageAPickImage">' + image + '</div><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.tipo_label || product.categoria || 'Producto') + ' · ' + esc(product.categoria || 'General') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></button>';
    }).join('') : '<div class="prodComOptionalStageAEmpty"><strong>No hay productos disponibles</strong><span>Ya seleccionaste todos los productos o combos disponibles.</span></div>';
  }

  function openPicker() {
    const section = findOptionalSection();
    if (!section) return;
    ensurePicker(section);
    pendingSelected = new Set();
    const picker = section.querySelector('[data-prod-com-optionals-picker]');
    if (picker) picker.classList.add('is-active');
    const search = picker ? picker.querySelector('[data-prod-com-optionals-search]') : null;
    if (search) search.value = '';
    renderPicker('');
  }

  function closePicker() {
    const picker = document.querySelector('[data-prod-com-optionals-picker]');
    if (picker) picker.classList.remove('is-active');
    pendingSelected = new Set();
  }

  function confirmPicker() {
    const list = optionalList();
    if (!list || !pendingSelected.size) { closePicker(); return; }
    const empty = list.querySelector('[data-prod-com-optionals-empty]');
    if (empty) empty.remove();
    let index = list.querySelectorAll('[data-prod-com-optionals-card]').length;
    pendingSelected.forEach(function (productId) {
      if (selectedIds().has(productId)) return;
      const product = readCandidates().find(function (item) { return String(item.id) === String(productId); });
      if (!product) return;
      list.insertAdjacentHTML('beforeend', cardHtml({ product_id: product.id, cantidad_label: '1 unidad', estado_visual: 'Visible', snapshot_producto: product }, index));
      index += 1;
    });
    closePicker();
    renumberLegacyFields();
    ensureEmpty(list);
    renderPicker('');
  }

  function enhance() {
    injectStyles();
    const section = findOptionalSection();
    if (!section) return;
    const list = optionalList();
    if (!list) return;
    enhanceHeader(section);
    hydrateFromLegacyIfNeeded(list);
    ensureActions(section, list);
    ensureEmpty(list);
    renumberLegacyFields();
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.productosComestiblesOptionalsStageABound === '1') return;
    document.body.dataset.productosComestiblesOptionalsStageABound = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-prod-com-optionals-add]')) { event.preventDefault(); openPicker(); return; }
      if (event.target.closest('[data-prod-com-optionals-close]')) { event.preventDefault(); closePicker(); return; }
      if (event.target.closest('[data-prod-com-optionals-pick]')) {
        event.preventDefault();
        const card = event.target.closest('[data-prod-com-optionals-pick]');
        const id = card.dataset.productId;
        if (pendingSelected.has(id)) pendingSelected.delete(id); else pendingSelected.add(id);
        card.classList.toggle('is-selected', pendingSelected.has(id));
        return;
      }
      if (event.target.closest('[data-prod-com-optionals-confirm]')) { event.preventDefault(); confirmPicker(); return; }
      if (event.target.closest('[data-prod-com-optionals-delete]')) {
        event.preventDefault();
        const card = event.target.closest('[data-prod-com-optionals-card]');
        if (card) card.remove();
        renumberLegacyFields();
        ensureEmpty(optionalList());
        renderPicker('');
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.matches('[data-prod-com-optionals-search]')) { renderPicker(event.target.value || ''); return; }
      if (event.target.closest('[data-prod-com-optionals-card]')) renumberLegacyFields();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target.closest('[data-prod-com-optionals-card]')) renumberLegacyFields();
    }, true);

    window.ProductosComestiblesOptionalsUi = {
      refresh: enhance,
      collect: collect,
      payload: function () {
        return {
          product_id: currentProductId(),
          section_key: 'agregados_opcionales',
          section_title: 'Agregados opcionales',
          source: 'productos_comestibles',
          items: collect(),
          optional_products_count: collect().length,
          recommended_count: collect().length,
          updated_at: new Date().toISOString()
        };
      },
      products: readCandidates
    };

    if (!observerReady) {
      observerReady = true;
      const observer = new MutationObserver(function () { setTimeout(enhance, 80); });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    [0, 120, 360, 800].forEach(function (delay) { setTimeout(enhance, delay); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
