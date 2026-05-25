/*
  ETAPA A · Combos: Agregados opcionales desde productos existentes

  Reglas:
  - No toca el motor de Extras.
  - No intercepta Guardar.
  - No crea productos manuales.
  - No cambia IDs durante edición.
  - No duplica combos.
*/
(function () {
  const LINKS_KEY = 'sazzu_entity_extra_links_v1';
  const BUILDER_KEY = 'sazzu_productos_combos_v1';
  const DELETED_KEY = 'sazzu_productos_deleted_rows_v1';
  const OPTIONAL_KEY = 'sazzu_combo_optional_products_v1';
  const OWNER_TYPE = 'combo';
  const PAGE_SIZE = 10;

  const DEFAULT_PRODUCTS = [
    { id: 'box-dulce-nube', nombre: 'Box Dulce Nube', categoria: 'Postre armado', precio: 9800, imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80' },
    { id: 'torta-choco-cream', nombre: 'Torta Choco Cream', categoria: 'Torta artesanal', precio: 16500, imagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80' },
    { id: 'muffins-mix', nombre: 'Muffins Mix', categoria: 'Pastelería rápida', precio: 7200, imagen: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=80' },
    { id: 'cookies-con-chips', nombre: 'Cookies con chips', categoria: 'Cookies', precio: 2200, imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
    { id: 'mini-alfajores', nombre: 'Mini alfajores', categoria: 'Alfajores', precio: 2600, imagen: 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?auto=format&fit=crop&w=900&q=80' }
  ];

  let comboRendererWrapped = false;
  let tablePage = 1;
  let tableObserver = null;
  let observedTableBody = null;
  let tableApplyTimer = null;
  let optionalObserver = null;
  let pendingSelectedProducts = new Set();
  let lastHydratedComboId = '';

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
      console.warn('[productos-combo-opcionales] No se pudo escribir ' + key, error);
    }
  }

  function readObject(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeObject(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value || {}));
    } catch (error) {
      console.warn('[productos-combo-opcionales] No se pudo escribir ' + key, error);
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

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function normalizeProduct(product) {
    const data = product || {};
    const identity = data.identity || {};
    const images = Array.isArray(data.images) ? data.images : [];
    const rawId = data.client_product_key || data.product_id || data.id || data.combo_id || identity.id || data.nombre || data.name || data.title;
    const id = String(rawId || '').trim();
    return {
      id: id,
      product_id: id,
      nombre: String(data.nombre || data.name || data.title || identity.name || identity.nombre || 'Producto comestible').trim(),
      categoria: String(data.categoria || data.category || identity.category || identity.categoria || 'Producto').trim(),
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : (data.base_price != null ? data.base_price : (identity.base_price != null ? identity.base_price : identity.precio || 0)))) || 0,
      imagen: String(data.imagen || data.image || data.primary_image_url || (images[0] && images[0].image_url) || '').trim(),
      estado: String(data.estado || data.status || 'Borrador').trim(),
      badge: String(data.badge || identity.badge || '').trim(),
      product_type: String(data.product_type || 'producto_simple').trim()
    };
  }

  function readProducts() {
    const map = new Map();
    function add(product) {
      const normalized = normalizeProduct(product);
      if (!normalized.id || !normalized.nombre) return;
      if (String(normalized.product_type).toLowerCase() === 'combo') return;
      if (String(normalized.product_type).toLowerCase() === 'food_combo_product') return;
      const prev = map.get(normalized.id) || {};
      map.set(normalized.id, Object.assign({}, prev, normalized));
    }

    (window.__lastSupabaseProducts || []).forEach(function (item) {
      if (String(item.product_type || '').toLowerCase() === 'combo') return;
      add(item);
    });

    readArray('sazzu_productos_payloads_local_v1').forEach(add);
    readArray('sazzu_productos_comestibles_v1').forEach(add);

    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (typeText.includes('combo')) return;
      const edit = row.querySelector('[data-edit-supabase-product], [data-edit-local-product]');
      const name = row.querySelector('.prodComCell strong');
      const sub = row.querySelector('.prodComCell span');
      const img = row.querySelector('.prodComThumb img');
      const priceCell = row.children[2];
      if (!edit || !name) return;
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

  function getProduct(id) {
    return readProducts().find(function (product) { return String(product.id) === String(id); }) || null;
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset.comboId ? slide.dataset.comboId : '').trim();
  }

  function injectStyles() {
    if (document.getElementById('productosComboOptionalStageAStyles')) return;
    const style = document.createElement('style');
    style.id = 'productosComboOptionalStageAStyles';
    style.textContent = `
      body[data-page="productos"] .prodSlideDeleteBtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:38px;height:38px;padding:0 11px;color:#b42318!important;background:#fff5f4!important;border:1px solid #fecdca!important;}
      body[data-page="productos"] .prodSlideDeleteBtn svg{width:16px;height:16px;display:block;}
      body[data-page="productos"] .prodSlideDeleteBtn:hover{background:#fee4e2!important;}
      body[data-page="productos"] .prodComPagination{margin-top:14px;padding-top:14px;border-top:1px solid #eaecf0;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
      body[data-page="productos"] .prodComPagination__info{color:#667085;font-size:12px;font-weight:750;}
      body[data-page="productos"] .prodComPagination__controls{display:flex;align-items:center;gap:6px;}
      body[data-page="productos"] .prodComPageBtn{min-width:32px;height:32px;border-radius:6px;border:1px solid #d0d5dd;background:#fff;color:#344054;font-family:inherit;font-size:12px;font-weight:850;cursor:pointer;}
      body[data-page="productos"] .prodComPageBtn.is-active{border-color:#2479ff;background:#eff6ff;color:#2479ff;}
      body[data-page="productos"] .prodComPageBtn:disabled{opacity:.45;cursor:not-allowed;}

      body[data-page="productos"] .prodComboSection--optionalStageA .prodComboItems{display:grid;gap:12px;}
      body[data-page="productos"] .prodComboSection--optionalStageA .prodComboItem--product:not([data-combo-optional-source="selector"]){display:none!important;}
      body[data-page="productos"] .prodComboOptionalEmpty{padding:14px;border-radius:5px;background:#f8fafc;color:#64748b;font-size:13px;font-weight:750;}
      body[data-page="productos"] .prodComboOptionalEmpty strong{display:block;color:#0f172a;font-size:14px;font-weight:950;margin-bottom:4px;}
      body[data-page="productos"] .prodComboOptionalActions{display:flex;justify-content:flex-start;margin-top:12px;}
      body[data-page="productos"] .prodComboOptionalAddBtn{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border:0;border-radius:5px;background:#eaf2ff;color:#2479ff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;transition:background .16s ease,transform .16s ease;}
      body[data-page="productos"] .prodComboOptionalAddBtn:hover{background:#dcebff;transform:translateY(-1px);}
      body[data-page="productos"] .prodComboOptionalCard{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr) 38px;align-items:start;gap:14px;padding:14px;border-radius:5px;background:#f8fbff;box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07);}
      body[data-page="productos"] .prodComboOptionalImage{width:64px;height:64px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:11px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComboOptionalBody{display:grid;gap:10px;min-width:0;}
      body[data-page="productos"] .prodComboOptionalHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
      body[data-page="productos"] .prodComboOptionalHead strong{display:block;color:#0f172a;font-size:14px;font-weight:950;line-height:1.15;}
      body[data-page="productos"] .prodComboOptionalHead span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComboOptionalHead b{color:#2479ff;font-size:14px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComboOptionalFields{display:grid;grid-template-columns:.85fr .85fr 1fr;gap:10px;}
      body[data-page="productos"] .prodComboOptionalDelete{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:5px;background:#fee2e2;color:#b91c1c;cursor:pointer;}
      body[data-page="productos"] .prodComboOptionalDelete svg{width:17px;height:17px;display:block;}
      body[data-page="productos"] .prodComboOptionalPicker{display:none;margin-top:12px;padding:14px;border-radius:5px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.10),0 1px 3px rgba(15,23,42,.08);}
      body[data-page="productos"] .prodComboOptionalPicker.is-active{display:grid;gap:12px;}
      body[data-page="productos"] .prodComboOptionalPicker__head{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      body[data-page="productos"] .prodComboOptionalPicker__head strong{color:#0f172a;font-size:14px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalPicker__head span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:700;}
      body[data-page="productos"] .prodComboOptionalPicker__close{width:34px;height:34px;border:0;border-radius:5px;background:#f2f4f7;color:#0f172a;font-size:20px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .prodComboOptionalSearch{width:100%;min-height:40px;border:1px solid #e5e7eb;border-radius:5px;padding:0 12px;font-family:inherit;font-weight:800;}
      body[data-page="productos"] .prodComboOptionalPickerGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      body[data-page="productos"] .prodComboOptionalPickCard{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:2px solid transparent;border-radius:5px;background:#f8fafc;cursor:pointer;text-align:left;font-family:inherit;}
      body[data-page="productos"] .prodComboOptionalPickCard:hover,body[data-page="productos"] .prodComboOptionalPickCard.is-selected{border-color:#2479ff;background:#eff6ff;}
      body[data-page="productos"] .prodComboOptionalPickImage{width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#eaf2ff;color:#2479ff;font-size:10px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalPickImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .prodComboOptionalPickCard strong{color:#0f172a;font-size:13px;font-weight:950;}
      body[data-page="productos"] .prodComboOptionalPickCard span{display:block;margin-top:3px;color:#64748b;font-size:11px;font-weight:750;}
      body[data-page="productos"] .prodComboOptionalPickCard b{color:#2479ff;font-size:13px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .prodComboOptionalPicker__actions{display:flex;justify-content:flex-end;}
      body[data-page="productos"] .prodComboOptionalPickerConfirm{min-height:38px;padding:0 14px;border:0;border-radius:5px;background:#2479ff;color:#fff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}
      @media(max-width:980px){body[data-page="productos"] .prodComboOptionalCard{grid-template-columns:minmax(0,1fr) 38px;}body[data-page="productos"] .prodComboOptionalImage{display:none;}body[data-page="productos"] .prodComboOptionalFields,body[data-page="productos"] .prodComboOptionalPickerGrid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function clearVisibleComboExtras() {
    const list = document.querySelector('.prodComboExtrasList[data-combo-extras-list="1"]');
    if (!list) return;
    list.classList.remove('prodComboExtrasList--selected');
    list.dataset.selectedExtrasCount = '0';
    list.innerHTML = '<div class="prodComboEmptyBox"><strong>Sin extras cargados todavía</strong><span>Usá + Agregar Extra para asociar extras reutilizables del banco a este combo.</span></div>';
    const section = list.closest('[data-prod-combo-extras-section="1"]');
    if (section) section.dataset.selectedExtrasCount = '0';
  }

  function prepareTrustedNewCombo() {
    const slide = document.getElementById('prodComboSlide');
    if (!slide || !slide.classList.contains('is-active')) return;
    slide.dataset.comboId = 'nuevo-combo';
    clearVisibleComboExtras();
    clearOptionalProducts();
  }

  function normalizeExtra(extra, index) {
    const data = extra || {};
    const title = String(data.title || data.name || data.nombre || 'Extra').trim();
    const id = String(data.extra_id || data.id || title).trim();
    const price = Number(String(data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio || 0)).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
    return { id, extra_id: id, title, nombre: title, name: title, description: String(data.description || data.descripcion || '').trim(), descripcion: String(data.descripcion || data.description || '').trim(), price, precio: price, price_delta: price, status: data.status || data.estado || 'Activo', estado: data.estado || data.status || 'Activo', badge: data.badge || '', image: data.image || data.imagen || data.image_url || '', imagen: data.imagen || data.image || data.image_url || '', image_url: data.image_url || data.image || data.imagen || '', folder: data.folder || '', tags: data.tags || '', position: index + 1 };
  }

  function syncExtraLinks(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return [];
    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra).filter(function (extra) { return extra.extra_id || extra.id; });
    const allLinks = readArray(LINKS_KEY);
    const previous = new Map(allLinks.filter(function (link) { return link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id; }).map(function (link) { return [String(link.extra_id || ''), link]; }));
    const untouched = allLinks.filter(function (link) { return !(link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id); });
    const now = new Date().toISOString();
    const nextLinks = normalized.map(function (extra, index) {
      const extraId = extra.extra_id || extra.id;
      const old = previous.get(String(extraId));
      return { link_id: [OWNER_TYPE, id, extraId].map(slugify).join('__'), owner_type: OWNER_TYPE, owner_id: id, extra_id: extraId, orden: index + 1, estado: 'activo', precio_override: null, snapshot_extra: Object.assign({}, extra, { id: extraId, extra_id: extraId }), created_at: old && old.created_at ? old.created_at : now, updated_at: now };
    });
    writeArray(LINKS_KEY, untouched.concat(nextLinks));
    try { window.dispatchEvent(new CustomEvent('productos-extra-links:changed', { detail: { owner_type: OWNER_TYPE, owner_id: id, links: nextLinks } })); } catch (_) {}
    return nextLinks;
  }

  function syncExistingBuilderCombo(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return null;
    const combos = readArray(BUILDER_KEY);
    const index = combos.findIndex(function (combo) { return String(combo.id || combo.combo_id || '') === id; });
    if (index < 0) return null;
    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra).filter(function (extra) { return extra.extra_id || extra.id; });
    combos[index] = Object.assign({}, combos[index], { extras_combo: normalized, extrasCombo: normalized, extras_ids: normalized.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean), extras_count: normalized.length, updated_at: new Date().toISOString() });
    writeArray(BUILDER_KEY, combos);
    return combos[index];
  }

  function handlePayloadReady(event) {
    const payload = event && event.detail ? event.detail.payload : null;
    if (!payload || payload.product_type !== 'combo') return;
    const comboId = String(payload.product_id || '').trim();
    const extras = Array.isArray(payload.combo_extras) ? payload.combo_extras : [];
    syncExtraLinks(comboId, extras);
    syncExistingBuilderCombo(comboId, extras);
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

  function selectedOptionalIds() {
    const list = optionalList();
    if (!list) return new Set();
    return new Set(Array.from(list.querySelectorAll('[data-combo-optional-card]')).map(function (card) { return String(card.dataset.productId || '').trim(); }).filter(Boolean));
  }

  function findSavedCombo(comboId) {
    const id = String(comboId || '').trim();
    if (!id) return null;
    return readArray(BUILDER_KEY).find(function (combo) { return String(combo.id || combo.combo_id || '') === id; }) || null;
  }

  function getStoredOptionalItems(comboId) {
    const combo = findSavedCombo(comboId);
    if (combo && Array.isArray(combo.optional_products)) return combo.optional_products;
    const payload = readObject(OPTIONAL_KEY, null);
    if (payload && String(payload.combo_id || '') === String(comboId || '') && Array.isArray(payload.items)) return payload.items;
    return [];
  }

  function optionalCardHtml(item, index) {
    const product = normalizeProduct((item && item.snapshot_producto) || getProduct(item && (item.product_id || item.linked_product_id)) || item || {});
    const productId = item && (item.product_id || item.linked_product_id) ? (item.product_id || item.linked_product_id) : product.id;
    const cantidad = item && (item.cantidad_label || item.quantity_label || item.cantidad) ? (item.cantidad_label || item.quantity_label || item.cantidad) : '1 unidad';
    const estado = item && (item.estado_visual || item.status || item.estado) ? (item.estado_visual || item.status || item.estado) : 'Visible';
    const imageHtml = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
    return '<article class="prodComboItem prodComboItem--product prodComboOptionalCard" data-combo-optional-card="1" data-combo-optional-source="selector" data-product-id="' + esc(productId) + '">' +
      '<div class="prodComboOptionalImage">' + imageHtml + '</div>' +
      '<div class="prodComboOptionalBody"><div class="prodComboOptionalHead"><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.categoria || 'Producto comestible') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></div>' +
      '<div class="prodComboOptionalFields"><label class="prodComboField"><span>Cantidad</span><input id="combo_opcional_' + index + '_cantidad" type="text" value="' + esc(cantidad) + '"></label>' +
      '<label class="prodComboField"><span>Estado visual</span><select id="combo_opcional_' + index + '_estado"><option value="Visible" ' + (estado !== 'Oculto' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (estado === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '<label class="prodComboField"><span>Precio tomado del producto</span><input id="combo_opcional_' + index + '_precio" value="' + esc(money(product.precio)) + '" readonly></label></div>' +
      '<input type="hidden" id="combo_opcional_' + index + '_product" value="' + esc(productId) + '"><input type="hidden" id="combo_opcional_' + index + '_nombre" value="' + esc(product.nombre) + '"><input type="hidden" id="combo_opcional_' + index + '_imagen" value="' + esc(product.imagen) + '"></div>' +
      '<button type="button" class="prodComboOptionalDelete" data-combo-optional-delete="1" aria-label="Eliminar producto agregado">' + trashIcon() + '</button></article>';
  }

  function ensureOptionalEmpty(list) {
    if (!list) return;
    const hasCards = !!list.querySelector('[data-combo-optional-card]');
    const empty = list.querySelector('[data-combo-optional-empty]');
    if (hasCards && empty) empty.remove();
    if (!hasCards && !empty) {
      list.innerHTML = '<div class="prodComboOptionalEmpty" data-combo-optional-empty="1"><strong>Sin productos agregados todavía</strong><span>Usá + Agregar producto para seleccionar productos existentes. No se crean opciones manuales.</span></div>';
    }
  }

  function ensureOptionalPicker(section) {
    if (!section || section.querySelector('[data-combo-optional-picker]')) return;
    const picker = document.createElement('div');
    picker.className = 'prodComboOptionalPicker';
    picker.dataset.comboOptionalPicker = '1';
    picker.innerHTML = '<div class="prodComboOptionalPicker__head"><div><strong>Seleccionar productos existentes</strong><span>Elegí productos ya creados para ofrecerlos como agregados opcionales.</span></div><button type="button" class="prodComboOptionalPicker__close" data-combo-optional-picker-close="1">×</button></div><input type="search" class="prodComboOptionalSearch" data-combo-optional-search="1" placeholder="Buscar producto..."><div class="prodComboOptionalPickerGrid" data-combo-optional-picker-grid="1"></div><div class="prodComboOptionalPicker__actions"><button type="button" class="prodComboOptionalPickerConfirm" data-combo-optional-confirm="1">Agregar seleccionados</button></div>';
    section.appendChild(picker);
  }

  function ensureOptionalActions(section, list) {
    if (!section || !list) return;
    let actions = section.querySelector('.prodComboOptionalActions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'prodComboOptionalActions';
      actions.innerHTML = '<button type="button" class="prodComboOptionalAddBtn" data-combo-optional-add="1">+ Agregar producto</button>';
      list.insertAdjacentElement('afterend', actions);
    }
    ensureOptionalPicker(section);
  }

  function renderOptionalPicker(query) {
    const section = findOptionalSection();
    const picker = section ? section.querySelector('[data-combo-optional-picker]') : null;
    const grid = picker ? picker.querySelector('[data-combo-optional-picker-grid]') : null;
    if (!grid) return;
    const q = String(query || '').toLowerCase().trim();
    const selected = selectedOptionalIds();
    const products = readProducts().filter(function (product) {
      if (selected.has(product.id)) return false;
      const haystack = [product.nombre, product.categoria, product.estado, product.badge].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
    grid.innerHTML = products.length ? products.map(function (product) {
      const image = product.imagen ? '<img src="' + esc(product.imagen) + '" alt="">' : '<span>IMG</span>';
      return '<button type="button" class="prodComboOptionalPickCard ' + (pendingSelectedProducts.has(product.id) ? 'is-selected' : '') + '" data-combo-optional-pick="1" data-product-id="' + esc(product.id) + '"><div class="prodComboOptionalPickImage">' + image + '</div><div><strong>' + esc(product.nombre) + '</strong><span>' + esc(product.categoria || 'Producto') + '</span></div><b>+ ' + esc(money(product.precio)) + '</b></button>';
    }).join('') : '<div class="prodComboOptionalEmpty"><strong>No hay productos disponibles</strong><span>Ya seleccionaste todos los productos disponibles para este combo.</span></div>';
  }

  function openOptionalPicker() {
    const section = findOptionalSection();
    if (!section) return;
    ensureOptionalPicker(section);
    pendingSelectedProducts = new Set();
    const picker = section.querySelector('[data-combo-optional-picker]');
    if (picker) picker.classList.add('is-active');
    const search = picker ? picker.querySelector('[data-combo-optional-search]') : null;
    if (search) search.value = '';
    renderOptionalPicker('');
  }

  function closeOptionalPicker() {
    const picker = document.querySelector('[data-combo-optional-picker]');
    if (picker) picker.classList.remove('is-active');
    pendingSelectedProducts = new Set();
  }

  function confirmOptionalPicker() {
    const list = optionalList();
    if (!list || !pendingSelectedProducts.size) { closeOptionalPicker(); return; }
    const empty = list.querySelector('[data-combo-optional-empty]');
    if (empty) empty.remove();
    let index = list.querySelectorAll('[data-combo-optional-card]').length;
    pendingSelectedProducts.forEach(function (productId) {
      if (selectedOptionalIds().has(productId)) return;
      const product = getProduct(productId);
      if (!product) return;
      list.insertAdjacentHTML('beforeend', optionalCardHtml({ product_id: product.id, cantidad_label: '1 unidad', estado_visual: 'Visible', snapshot_producto: product }, index));
      index += 1;
    });
    closeOptionalPicker();
    ensureOptionalEmpty(list);
    persistOptionalProducts();
    renderOptionalPicker('');
  }

  function collectOptionalProducts() {
    const list = optionalList();
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-combo-optional-card]')).map(function (card, index) {
      const product = getProduct(card.dataset.productId) || normalizeProduct({ id: card.dataset.productId, nombre: card.querySelector('.prodComboOptionalHead strong')?.textContent || 'Producto' });
      const cantidad = card.querySelector('input[id^="combo_opcional_"][id$="_cantidad"]');
      const estado = card.querySelector('select[id^="combo_opcional_"][id$="_estado"]');
      return {
        product_id: product.id,
        linked_product_id: product.id,
        cantidad: cantidad ? cantidad.value : '1 unidad',
        cantidad_label: cantidad ? cantidad.value : '1 unidad',
        quantity_label: cantidad ? cantidad.value : '1 unidad',
        estado_visual: estado ? estado.value : 'Visible',
        status: estado ? estado.value : 'Visible',
        activo: !(estado && estado.value === 'Oculto'),
        position: index + 1,
        snapshot_producto: product
      };
    });
  }

  function persistOptionalProducts() {
    const comboId = currentComboId() || 'nuevo-combo';
    const items = collectOptionalProducts();
    const payload = { combo_id: comboId, section_key: 'agregados_opcionales', section_title: 'Agregados opcionales', source: 'productos_comestibles', relation_model: 'combo_optional_product_links', manual_creation_enabled: false, items: items, updated_at: new Date().toISOString() };
    writeObject(OPTIONAL_KEY, payload);
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_PAYLOAD__ = payload;
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_LAST__ = items;

    const combos = readArray(BUILDER_KEY);
    const index = combos.findIndex(function (combo) { return String(combo.id || combo.combo_id || '') === String(comboId); });
    if (index >= 0) {
      combos[index] = Object.assign({}, combos[index], {
        optional_products: items,
        optional_products_count: items.length,
        optional_count: items.length,
        opcionales: items.map(function (item) { return { productId: item.product_id, cantidad: item.cantidad_label, agregado: item.activo !== false }; }),
        updated_at: new Date().toISOString()
      });
      writeArray(BUILDER_KEY, combos);
    }
    patchTableCounts();
    return payload;
  }

  function clearOptionalProducts() {
    const list = optionalList();
    if (list) {
      list.innerHTML = '';
      ensureOptionalEmpty(list);
    }
    persistOptionalProducts();
  }

  function hydrateOptionalProducts() {
    const comboId = currentComboId();
    const list = optionalList();
    if (!comboId || !list) return;
    if (lastHydratedComboId === comboId && list.querySelector('[data-combo-optional-card]')) return;
    const items = getStoredOptionalItems(comboId);
    list.innerHTML = items.length ? items.map(optionalCardHtml).join('') : '';
    ensureOptionalEmpty(list);
    lastHydratedComboId = comboId;
  }

  function enhanceOptionalSection() {
    injectStyles();
    const section = findOptionalSection();
    if (!section) return;
    const list = section.querySelector('.prodComboItems');
    if (!list) return;
    section.classList.add('prodComboSection--optionalStageA');
    Array.from(list.querySelectorAll('.prodComboItem--product:not([data-combo-optional-source="selector"])')).forEach(function (node) { node.remove(); });
    ensureOptionalActions(section, list);
    hydrateOptionalProducts();
    ensureOptionalEmpty(list);
  }

  function ensureSlideDeleteButtons() {
    const productActions = document.querySelector('#prodComSlide .prodComSlide__actions');
    const productSave = document.getElementById('prodComSaveBtn');
    if (productActions && productSave && !document.getElementById('prodComDeleteBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'prodComDeleteBtn';
      btn.className = 'prodComGhost prodSlideDeleteBtn';
      btn.setAttribute('aria-label', 'Eliminar producto de la tabla');
      btn.innerHTML = trashIcon();
      productActions.insertBefore(btn, productSave);
    }
    const comboActions = document.querySelector('#prodComboSlide .prodComboSlide__actions');
    const comboSave = document.getElementById('prodComboSaveBtn');
    if (comboActions && comboSave && !document.getElementById('prodComboDeleteBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'prodComboDeleteBtn';
      btn.className = 'prodComboGhost prodSlideDeleteBtn';
      btn.setAttribute('aria-label', 'Eliminar combo de la tabla');
      btn.innerHTML = trashIcon();
      comboActions.insertBefore(btn, comboSave);
    }
  }

  function deletedIds() { return new Set(readArray(DELETED_KEY).map(function (id) { return String(id || '').trim(); }).filter(Boolean)); }
  function markDeleted(id) { const set = deletedIds(); set.add(String(id || '').trim()); writeArray(DELETED_KEY, Array.from(set)); }
  function removeFromStorage(key, predicate) { writeArray(key, readArray(key).filter(function (item) { return !predicate(item || {}); })); }

  function cleanupDeletedEntity(id, type) {
    const clean = String(id || '').trim();
    if (!clean) return;
    markDeleted(clean);
    removeFromStorage('sazzu_productos_payloads_local_v1', function (item) { return String(item.product_id || item.id || '') === clean; });
    removeFromStorage('sazzu_combos_payloads_local_v1', function (item) { return String(item.product_id || item.id || item.combo_id || '') === clean; });
    removeFromStorage('sazzu_productos_comestibles_v1', function (item) { return String(item.id || item.product_id || '') === clean; });
    removeFromStorage(BUILDER_KEY, function (item) { return String(item.id || item.combo_id || item.product_id || '') === clean; });
    removeFromStorage(LINKS_KEY, function (item) { const owner = type === 'combo' ? 'combo' : 'producto_comestible'; return item.owner_type === owner && String(item.owner_id || '') === clean; });
  }

  function closeActiveSlide(type) {
    const closeBtn = type === 'combo' ? document.getElementById('prodComboCloseBtn') : document.getElementById('prodComCloseBtn');
    if (closeBtn) closeBtn.click();
  }

  function deleteActiveProduct() {
    const slide = document.getElementById('prodComSlide');
    const id = slide && slide.dataset ? String(slide.dataset.productId || '').trim() : '';
    if (!id) { closeActiveSlide('product'); return; }
    if (!window.confirm('¿Eliminar este producto de la tabla?')) return;
    cleanupDeletedEntity(id, 'product');
    closeActiveSlide('product');
    removeRowsById(id);
    applyTableControls();
  }

  function deleteActiveCombo() {
    const slide = document.getElementById('prodComboSlide');
    const id = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
    if (!id || id === 'nuevo-combo') { closeActiveSlide('combo'); return; }
    if (!window.confirm('¿Eliminar este combo de la tabla?')) return;
    cleanupDeletedEntity(id, 'combo');
    closeActiveSlide('combo');
    removeRowsById(id);
    applyTableControls();
  }

  function getRowEntityId(row) {
    if (!row) return '';
    return String(row.dataset.supabaseProductId || row.dataset.localProductId || row.dataset.productRowId || row.querySelector('[data-edit-com]')?.dataset.editCom || row.querySelector('[data-edit-local-product]')?.dataset.editLocalProduct || row.querySelector('[data-edit-supabase-product]')?.dataset.editSupabaseProduct || '').trim();
  }

  function isDataRow(row) { return !!(row && row.querySelector('td') && !row.querySelector('.prodComEmpty')); }
  function removeRowsById(id) { document.querySelectorAll('#prodComTableBody tr').forEach(function (row) { if (getRowEntityId(row) === String(id || '').trim()) row.remove(); }); }

  function optionalCountForCombo(id) {
    const combo = findSavedCombo(id);
    if (!combo) return null;
    if (Array.isArray(combo.optional_products)) return combo.optional_products.length;
    if (Array.isArray(combo.opcionales)) return combo.opcionales.length;
    return combo.optional_products_count != null ? Number(combo.optional_products_count || 0) : null;
  }

  function patchTableCounts() {
    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      const id = getRowEntityId(row);
      const typeText = String(row.children[1] ? row.children[1].textContent : '').toLowerCase();
      if (!id || !typeText.includes('combo')) return;
      const count = optionalCountForCombo(id);
      if (count == null) return;
      if (row.children[6]) row.children[6].textContent = String(count);
    });
  }

  function ensurePaginationHost() {
    const tableCard = document.querySelector('.prodComTableCard');
    const wrap = tableCard && tableCard.querySelector('.prodComTableWrap');
    if (!tableCard || !wrap) return null;
    let host = tableCard.querySelector('.prodComPagination');
    if (!host) { host = document.createElement('div'); host.className = 'prodComPagination'; wrap.insertAdjacentElement('afterend', host); }
    return host;
  }

  function renderPagination(totalRows, totalPages) {
    const host = ensurePaginationHost();
    if (!host) return;
    if (!totalRows) { host.innerHTML = ''; return; }
    const buttons = ['<button type="button" class="prodComPageBtn" data-prod-table-page="prev" ' + (tablePage <= 1 ? 'disabled' : '') + '>‹</button>'];
    for (let i = 1; i <= totalPages; i += 1) buttons.push('<button type="button" class="prodComPageBtn ' + (i === tablePage ? 'is-active' : '') + '" data-prod-table-page="' + i + '">' + i + '</button>');
    buttons.push('<button type="button" class="prodComPageBtn" data-prod-table-page="next" ' + (tablePage >= totalPages ? 'disabled' : '') + '>›</button>');
    const from = ((tablePage - 1) * PAGE_SIZE) + 1;
    const to = Math.min(totalRows, tablePage * PAGE_SIZE);
    host.innerHTML = '<div class="prodComPagination__info">Mostrando ' + from + '-' + to + ' de ' + totalRows + '</div><div class="prodComPagination__controls">' + buttons.join('') + '</div>';
  }

  function applyTableControls() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;
    const deleted = deletedIds();
    Array.from(tbody.querySelectorAll('tr')).forEach(function (row) { const id = getRowEntityId(row); if (id && deleted.has(id)) row.remove(); });
    patchTableCounts();
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(isDataRow);
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    tablePage = Math.min(Math.max(1, tablePage), totalPages);
    const start = (tablePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    rows.forEach(function (row, index) { row.style.display = index >= start && index < end ? '' : 'none'; });
    renderPagination(totalRows, totalPages);
  }

  function scheduleTableControls() { clearTimeout(tableApplyTimer); tableApplyTimer = setTimeout(applyTableControls, 80); }
  function bindTableObserver() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody || tbody === observedTableBody) return;
    if (tableObserver) tableObserver.disconnect();
    observedTableBody = tbody;
    tableObserver = new MutationObserver(scheduleTableControls);
    tableObserver.observe(tbody, { childList: true });
    scheduleTableControls();
  }

  function handlePaginationClick(event) {
    const btn = event.target && event.target.closest && event.target.closest('[data-prod-table-page]');
    if (!btn) return;
    event.preventDefault();
    const action = String(btn.dataset.prodTablePage || '1');
    const rows = Array.from(document.querySelectorAll('#prodComTableBody tr')).filter(isDataRow);
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (action === 'prev') tablePage -= 1;
    else if (action === 'next') tablePage += 1;
    else tablePage = Number(action || 1);
    tablePage = Math.min(Math.max(1, tablePage), totalPages);
    applyTableControls();
  }

  function wrapComboExtraRenderer() {
    if (comboRendererWrapped) return;
    const api = window.ProductosExtrasSelector;
    if (!api || typeof api.renderSelectedExtrasIntoComboBuilder !== 'function') return;
    const original = api.renderSelectedExtrasIntoComboBuilder;
    api.renderSelectedExtrasIntoComboBuilder = function () {
      const slide = document.getElementById('prodComboSlide');
      const body = document.getElementById('prodComboSlideBody');
      const active = !!(slide && slide.classList.contains('is-active'));
      const savedTop = body ? body.scrollTop : null;
      const winX = window.scrollX;
      const winY = window.scrollY;
      const result = original.apply(this, arguments);
      if (active) {
        requestAnimationFrame(function () { if (body && savedTop != null) body.scrollTop = savedTop; window.scrollTo(winX, winY); });
        setTimeout(function () { if (body && savedTop != null) body.scrollTop = savedTop; window.scrollTo(winX, winY); }, 80);
      }
      return result;
    };
    comboRendererWrapped = true;
  }

  function scheduleEnhancements() {
    injectStyles();
    [0, 80, 220, 520, 1000].forEach(function (delay) {
      setTimeout(function () {
        ensureSlideDeleteButtons();
        bindTableObserver();
        wrapComboExtraRenderer();
        enhanceOptionalSection();
        applyTableControls();
      }, delay);
    });
  }

  function bindOptionalObserver() {
    const body = document.getElementById('prodComboSlideBody');
    if (!body || optionalObserver) return;
    optionalObserver = new MutationObserver(function () { setTimeout(enhanceOptionalSection, 80); });
    optionalObserver.observe(body, { childList: true, subtree: true });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasSafeGuardBound === '4') return;
    document.body.dataset.comboExtrasSafeGuardBound = '4';

    window.addEventListener('productos:payload-ready', handlePayloadReady);

    window.addEventListener('click', function (event) {
      const isNewCombo = event.target && event.target.closest && event.target.closest('#prodComboNewBtn');
      if (isNewCombo && event.isTrusted === true) [20, 100, 260, 620].forEach(function (delay) { setTimeout(prepareTrustedNewCombo, delay); });

      if (event.target && event.target.closest && event.target.closest('#prodComDeleteBtn')) { event.preventDefault(); deleteActiveProduct(); return; }
      if (event.target && event.target.closest && event.target.closest('#prodComboDeleteBtn')) { event.preventDefault(); deleteActiveCombo(); return; }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-add]')) { event.preventDefault(); openOptionalPicker(); return; }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-picker-close]')) { event.preventDefault(); closeOptionalPicker(); return; }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-pick]')) {
        event.preventDefault();
        const card = event.target.closest('[data-combo-optional-pick]');
        const id = card.dataset.productId;
        if (pendingSelectedProducts.has(id)) pendingSelectedProducts.delete(id); else pendingSelectedProducts.add(id);
        card.classList.toggle('is-selected', pendingSelectedProducts.has(id));
        return;
      }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-confirm]')) { event.preventDefault(); confirmOptionalPicker(); return; }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-delete]')) { event.preventDefault(); const card = event.target.closest('[data-combo-optional-card]'); if (card) card.remove(); ensureOptionalEmpty(optionalList()); persistOptionalProducts(); patchTableCounts(); return; }
      handlePaginationClick(event);
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target && event.target.matches && event.target.matches('[data-combo-optional-search]')) { renderOptionalPicker(event.target.value || ''); return; }
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-card]')) persistOptionalProducts();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target && event.target.closest && event.target.closest('[data-combo-optional-card]')) persistOptionalProducts();
    }, true);

    document.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('#prodComboSaveBtn')) persistOptionalProducts();
    }, true);

    window.ProductosCombosUpsellsUi = { refresh: enhanceOptionalSection, collect: collectOptionalProducts, payload: function () { return { combo_id: currentComboId(), items: collectOptionalProducts() }; }, persist: persistOptionalProducts, products: readProducts };
    window.ProductosComboExtrasDebug = { snapshot: function () { return { safe_guard_active: true, optional_stage_a_active: true, combo_id: currentComboId(), optional_count: collectOptionalProducts().length, time: new Date().toISOString() }; } };

    bindOptionalObserver();
    scheduleEnhancements();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', function () { bind(); scheduleEnhancements(); });
  window.addEventListener('load', function () { bind(); scheduleEnhancements(); });
})();
