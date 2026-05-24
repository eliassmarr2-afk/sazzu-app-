(function () {
  const STYLE_ID = 'productos-combos-upsells-ui-css';
  const STORAGE_KEY = 'sazzu_combo_optional_products_v1';
  const PRODUCTS_STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  let observerStarted = false;
  let rafPending = false;
  let pendingSelected = new Set();

  const DEFAULT_PRODUCTS = [
    { id: 'box-dulce-nube', nombre: 'Box Dulce Nube', categoria: 'Postre armado', precio: 9800, imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80' },
    { id: 'torta-choco-cream', nombre: 'Torta Choco Cream', categoria: 'Torta artesanal', precio: 16500, imagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80' },
    { id: 'muffins-mix', nombre: 'Muffins Mix', categoria: 'Pastelería rápida', precio: 7200, imagen: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=80' },
    { id: 'cookies-con-chips', nombre: 'Cookies con chips', categoria: 'Cookies', precio: 2200, imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
    { id: 'mini-alfajores', nombre: 'Mini alfajores', categoria: 'Alfajores', precio: 2600, imagen: 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?auto=format&fit=crop&w=900&q=80' }
  ];

  function escapeHtml(value) {
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
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function normalizeProduct(product) {
    const data = product || {};
    const id = String(data.id || data.product_id || ('prod-com-' + slugify(data.nombre || data.title || 'producto'))).trim();
    const imagenes = Array.isArray(data.imagenes) ? data.imagenes.filter(Boolean) : [];
    return {
      id,
      product_id: id,
      nombre: String(data.nombre || data.title || 'Producto comestible').trim(),
      categoria: String(data.categoria || data.category || 'Producto').trim(),
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : 0)) || 0,
      imagen: String(data.imagen || data.image || imagenes[0] || '').trim(),
      estado: String(data.estado || data.status || 'Borrador').trim(),
      badge: String(data.badge || '').trim()
    };
  }

  function readProducts() {
    let rows = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) rows = parsed;
    } catch (error) {
      console.warn('[productos-combos-upsells-ui.js] No se pudo leer productos comestibles:', error);
    }

    const map = new Map();
    DEFAULT_PRODUCTS.map(normalizeProduct).forEach(function (product) { map.set(product.id, product); });
    rows.map(normalizeProduct).forEach(function (product) {
      const base = map.get(product.id) || {};
      map.set(product.id, Object.assign({}, base, product));
    });

    return Array.from(map.values()).filter(function (product) { return product.id && product.nombre; });
  }

  function getProduct(productId) {
    return readProducts().find(function (product) { return String(product.id) === String(productId); }) || readProducts()[0] || normalizeProduct({});
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 .prodComboSection__head{border-bottom:0;margin-bottom:10px;}
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 .prodComboItems{gap:12px;}
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 .prodComboIncludedActions,
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 [data-combo-add-included-option],
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 [data-add-com-option],
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 .prodComboAdd,
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 button[data-combo-optional-legacy-add="1"]{display:none!important;}
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 button[data-combo-optional-legacy-trash="1"],
      body[data-page="productos"] .main .prodComboSection--optionalUpsellsV1 img[data-combo-optional-legacy-trash="1"]{display:none!important;}

      body[data-page="productos"] .main .prodComboUpsellCard{position:relative;display:grid;grid-template-columns:48px 72px minmax(0,1fr) 38px;align-items:start;gap:14px;padding:14px;border:0!important;border-radius:5px;background:#F8FBFF;box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07);transition:transform .16s ease,box-shadow .16s ease,background .16s ease,opacity .16s ease;cursor:pointer;}
      body[data-page="productos"] .main .prodComboUpsellCard:hover{transform:translateY(-1px);background:#F2F8FF;box-shadow:0 12px 28px rgba(15,23,42,.10),0 2px 6px rgba(15,23,42,.07);}
      body[data-page="productos"] .main .prodComboUpsellCard.is-disabled{opacity:.72;}
      body[data-page="productos"] .main .prodComboUpsellCard .prodComboItem__image,
      body[data-page="productos"] .main .prodComboUpsellCard .prodComboToggle:not(.prodComboUpsellSwitch){display:none!important;}

      body[data-page="productos"] .main .prodComboUpsellSwitch{width:48px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:999px;background:transparent!important;color:inherit;cursor:pointer;}
      body[data-page="productos"] .main .prodComboUpsellSwitch__track{position:relative;width:46px;height:26px;display:block;border-radius:999px;background:#CBD5E1;box-shadow:inset 0 1px 2px rgba(15,23,42,.18);transition:background .18s ease,box-shadow .18s ease;}
      body[data-page="productos"] .main .prodComboUpsellSwitch__knob{position:absolute;top:3px;left:3px;width:20px;height:20px;display:block;border-radius:999px;background:#fff;box-shadow:0 2px 6px rgba(15,23,42,.22);transition:transform .18s ease;}
      body[data-page="productos"] .main .prodComboUpsellCard.is-active .prodComboUpsellSwitch__track,
      body[data-page="productos"] .main .prodComboUpsellSwitch.is-on .prodComboUpsellSwitch__track{background:#2479FF;box-shadow:0 8px 18px rgba(36,121,255,.22),inset 0 1px 2px rgba(15,23,42,.12);}
      body[data-page="productos"] .main .prodComboUpsellCard.is-active .prodComboUpsellSwitch__knob,
      body[data-page="productos"] .main .prodComboUpsellSwitch.is-on .prodComboUpsellSwitch__knob{transform:translateX(20px);}

      body[data-page="productos"] .main .prodComboUpsellImage{width:64px;height:64px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#EAF2FF;color:#2479FF;font-size:11px;font-weight:950;}
      body[data-page="productos"] .main .prodComboUpsellImage img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .main .prodComboUpsellCard__body{min-width:0;display:grid;gap:10px;}
      body[data-page="productos"] .main .prodComboUpsellHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
      body[data-page="productos"] .main .prodComboUpsellHead strong{color:#0F172A;font-size:14px;font-weight:950;line-height:1.15;}
      body[data-page="productos"] .main .prodComboUpsellHead span{display:block;margin-top:3px;color:#64748B;font-size:12px;font-weight:700;}
      body[data-page="productos"] .main .prodComboUpsellPrice{color:#2479FF;font-size:14px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .main .prodComboUpsellFields{display:grid;grid-template-columns:.8fr .75fr 1fr;gap:10px;}
      body[data-page="productos"] .main .prodComboUpsellCard .prodComboField span{color:#64748B;}
      body[data-page="productos"] .main .prodComboUpsellCard .prodComboField input,
      body[data-page="productos"] .main .prodComboUpsellCard .prodComboField select{background:#fff;border:1px solid rgba(148,163,184,.28);box-shadow:0 1px 1px rgba(15,23,42,.03);}

      body[data-page="productos"] .main .prodComboUpsellDelete{width:34px;height:34px;display:grid;place-items:center;align-self:start;border:0;border-radius:5px;background:#FEE2E2;color:#B91C1C;cursor:pointer;transition:background .16s ease,transform .16s ease;}
      body[data-page="productos"] .main .prodComboUpsellDelete:hover{background:#FECACA;transform:translateY(-1px);}
      body[data-page="productos"] .main .prodComboUpsellDelete svg{width:17px;height:17px;display:block;}
      body[data-page="productos"] .main .prodComboUpsellActions{display:flex;justify-content:flex-start;margin-top:12px;}
      body[data-page="productos"] .main .prodComboUpsellAddBtn{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;border:0;border-radius:5px;background:#EAF2FF;color:#2479FF;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;transition:background .16s ease,transform .16s ease;}
      body[data-page="productos"] .main .prodComboUpsellAddBtn:hover{background:#DCEBFF;transform:translateY(-1px);}
      body[data-page="productos"] .main .prodComboUpsellEmpty{padding:14px;border-radius:5px;background:#F8FAFC;color:#64748B;font-size:13px;font-weight:750;}
      body[data-page="productos"] .main .prodComboUpsellEmpty strong{display:block;color:#0F172A;font-size:14px;font-weight:950;margin-bottom:4px;}

      body[data-page="productos"] .main .prodComboUpsellPicker{display:none;margin-top:12px;padding:14px;border-radius:5px;background:#FFFFFF;box-shadow:0 10px 26px rgba(15,23,42,.10),0 1px 3px rgba(15,23,42,.08);}
      body[data-page="productos"] .main .prodComboUpsellPicker.is-active{display:grid;gap:12px;}
      body[data-page="productos"] .main .prodComboUpsellPicker__head{display:flex;align-items:center;justify-content:space-between;gap:12px;}
      body[data-page="productos"] .main .prodComboUpsellPicker__head strong{color:#0F172A;font-size:14px;font-weight:950;}
      body[data-page="productos"] .main .prodComboUpsellPicker__head span{display:block;margin-top:3px;color:#64748B;font-size:12px;font-weight:700;}
      body[data-page="productos"] .main .prodComboUpsellPicker__close{width:34px;height:34px;border:0;border-radius:5px;background:#F2F4F7;color:#0F172A;font-size:20px;font-weight:950;cursor:pointer;}
      body[data-page="productos"] .main .prodComboUpsellSearch{width:100%;min-height:40px;border:1px solid #E5E7EB;border-radius:5px;padding:0 12px;font-family:inherit;font-weight:800;}
      body[data-page="productos"] .main .prodComboUpsellPickerGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      body[data-page="productos"] .main .prodComboUpsellPickCard{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:2px solid transparent;border-radius:5px;background:#F8FAFC;cursor:pointer;text-align:left;font-family:inherit;}
      body[data-page="productos"] .main .prodComboUpsellPickCard:hover,
      body[data-page="productos"] .main .prodComboUpsellPickCard.is-selected{border-color:#2479FF;background:#EFF6FF;}
      body[data-page="productos"] .main .prodComboUpsellPickCard__image{width:54px;height:54px;display:grid;place-items:center;overflow:hidden;border-radius:5px;background:#EAF2FF;color:#2479FF;font-size:10px;font-weight:950;}
      body[data-page="productos"] .main .prodComboUpsellPickCard__image img{width:100%;height:100%;object-fit:cover;display:block;}
      body[data-page="productos"] .main .prodComboUpsellPickCard strong{color:#0F172A;font-size:13px;font-weight:950;}
      body[data-page="productos"] .main .prodComboUpsellPickCard span{display:block;margin-top:3px;color:#64748B;font-size:11px;font-weight:750;}
      body[data-page="productos"] .main .prodComboUpsellPickCard b{color:#2479FF;font-size:13px;font-weight:950;white-space:nowrap;}
      body[data-page="productos"] .main .prodComboUpsellPicker__actions{display:flex;justify-content:flex-end;}
      body[data-page="productos"] .main .prodComboUpsellPickerConfirm{min-height:38px;padding:0 14px;border:0;border-radius:5px;background:#2479FF;color:#fff;font-family:inherit;font-size:13px;font-weight:950;cursor:pointer;}

      @media(max-width:980px){body[data-page="productos"] .main .prodComboUpsellCard{grid-template-columns:48px minmax(0,1fr) 38px;}body[data-page="productos"] .main .prodComboUpsellImage{display:none;}body[data-page="productos"] .main .prodComboUpsellFields,body[data-page="productos"] .main .prodComboUpsellPickerGrid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function switchHtml(isOn) {
    return '<span class="prodComboUpsellSwitch__track"><span class="prodComboUpsellSwitch__knob"></span></span><input type="hidden" data-combo-upsell-enabled-input="1" value="' + (isOn ? '1' : '0') + '">';
  }

  function field(label, id, value, type) {
    return '<label class="prodComboField"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(id) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '"></label>';
  }

  function readonlyField(label, id, value) {
    return '<label class="prodComboField"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(id) + '" value="' + escapeHtml(value || '') + '" readonly></label>';
  }

  function visualSelect(id, value) {
    const current = String(value || '').toLowerCase() === 'oculto' ? 'Oculto' : 'Visible';
    return '<label class="prodComboField"><span>Estado visual</span><select id="' + escapeHtml(id) + '"><option value="Visible" ' + (current === 'Visible' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (current === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>';
  }

  function findOptionalSection() {
    const sections = Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection'));
    return sections.find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').trim().toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').trim().toLowerCase();
      return (eyebrow.includes('podés sumar') || eyebrow.includes('podes sumar')) && title.includes('agregados opcionales');
    }) || null;
  }

  function fieldValueBySuffix(card, suffix) {
    const field = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      return String(el.id || '').endsWith(suffix);
    });
    return field ? String(field.value || '').trim() : '';
  }

  function buildUpsellCardInner(index, data) {
    const product = normalizeProduct((data && data.snapshot_producto) || getProduct(data && data.product_id));
    const isOn = !data || data.activo !== false;
    const cantidad = data && data.cantidad ? data.cantidad : '1 unidad';
    const estado = data && (data.estadoVisual || data.estado_visual) ? (data.estadoVisual || data.estado_visual) : 'Visible';
    const imageHtml = product.imagen ? '<img src="' + escapeHtml(product.imagen) + '" alt="">' : '<span>IMG</span>';

    return '<button type="button" class="prodComboToggle prodComboUpsellSwitch ' + (isOn ? 'is-on' : 'is-off') + '" data-combo-upsell-toggle="1" aria-label="Activar o desactivar producto upsell" aria-pressed="' + (isOn ? 'true' : 'false') + '">' + switchHtml(isOn) + '</button>' +
      '<div class="prodComboUpsellImage">' + imageHtml + '</div>' +
      '<div class="prodComboUpsellCard__body">' +
        '<div class="prodComboUpsellHead"><div><strong>' + escapeHtml(product.nombre) + '</strong><span>' + escapeHtml(product.categoria || 'Producto comestible') + '</span></div><b class="prodComboUpsellPrice">+ ' + escapeHtml(money(product.precio)) + '</b></div>' +
        '<div class="prodComboUpsellFields">' +
          field('Cantidad', 'combo_opcional_' + index + '_cantidad', cantidad) +
          visualSelect('combo_opcional_' + index + '_estado', estado) +
          readonlyField('Precio tomado del producto', 'combo_opcional_' + index + '_precio', money(product.precio)) +
        '</div>' +
        '<input type="hidden" id="combo_opcional_' + index + '_product" value="' + escapeHtml(product.id) + '">' +
        '<input type="hidden" id="combo_opcional_' + index + '_nombre" value="' + escapeHtml(product.nombre) + '">' +
        '<input type="hidden" id="combo_opcional_' + index + '_imagen" value="' + escapeHtml(product.imagen) + '">' +
      '</div>' +
      '<button type="button" class="prodComboUpsellDelete" data-combo-upsell-delete="1" aria-label="Eliminar producto upsell">' + trashIcon() + '</button>';
  }

  function buildUpsellCard(index, data) {
    const product = normalizeProduct((data && data.snapshot_producto) || getProduct(data && data.product_id));
    const isOn = !data || data.activo !== false;
    return '<article class="prodComboItem prodComboItem--product prodComboUpsellCard ' + (isOn ? 'is-active' : 'is-disabled') + '" data-combo-upsell-card="1" data-combo-upsell-enhanced="1" data-combo-upsell-source="picker" data-product-id="' + escapeHtml(product.id) + '" data-upsell-enabled="' + (isOn ? '1' : '0') + '">' +
      buildUpsellCardInner(index, Object.assign({}, data || {}, { product_id: product.id, snapshot_producto: product })) +
    '</article>';
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset.comboId ? slide.dataset.comboId : 'combo-borrador').trim();
  }

  function optionalList() {
    const section = findOptionalSection();
    return section ? section.querySelector('.prodComboItems') : null;
  }

  function ensureEmptyState(list) {
    if (!list) return;
    const hasCards = list.querySelector('[data-combo-upsell-card][data-combo-upsell-source="picker"]');
    const empty = list.querySelector('[data-combo-upsell-empty]');
    if (hasCards && empty) empty.remove();
    if (!hasCards && !empty) {
      list.innerHTML = '<div class="prodComboUpsellEmpty" data-combo-upsell-empty="1"><strong>Sin productos upsell todavía</strong><span>Usá + Agregar producto upsell para traer productos comestibles existentes. No se crean opciones manuales en esta sección.</span></div>';
    }
  }

  function removeLegacyOptionalControls(section, list) {
    if (!section || !list) return;

    Array.from(section.querySelectorAll('.prodComboIncludedActions')).forEach(function (node) { node.remove(); });
    Array.from(section.querySelectorAll('button')).forEach(function (button) {
      const text = String(button.textContent || '').trim().toLowerCase();
      if (button.matches('[data-combo-upsell-add], [data-combo-upsell-picker-close], [data-combo-upsell-pick], [data-combo-upsell-confirm], [data-combo-upsell-toggle], [data-combo-upsell-delete]')) return;
      if (text.includes('agregar opción') || button.matches('[data-combo-add-included-option], [data-add-com-option], .prodComboAdd')) {
        button.dataset.comboOptionalLegacyAdd = '1';
        button.remove();
        return;
      }
      if (button.querySelector('img') || text.includes('🗑') || text.includes('borrar') || text.includes('eliminar') || text.includes('trash')) {
        button.dataset.comboOptionalLegacyTrash = '1';
        button.remove();
      }
    });

    Array.from(list.querySelectorAll('img, picture, figure')).forEach(function (node) {
      if (node.closest('.prodComboUpsellImage') || node.closest('[data-combo-upsell-picker]')) return;
      node.dataset.comboOptionalLegacyTrash = '1';
      node.remove();
    });

    Array.from(list.querySelectorAll('.prodComboItem--product:not([data-combo-upsell-source="picker"]), [data-combo-upsell-card]:not([data-combo-upsell-source="picker"])')).forEach(function (node) {
      node.remove();
    });

    ensureEmptyState(list);
  }

  function existingProductIds() {
    const list = optionalList();
    if (!list) return new Set();
    return new Set(Array.from(list.querySelectorAll('[data-combo-upsell-card][data-combo-upsell-source="picker"]')).map(function (card) { return String(card.dataset.productId || '').trim(); }).filter(Boolean));
  }

  function nextIndex(list) {
    const ids = Array.from(list.querySelectorAll('input[id^="combo_opcional_"], select[id^="combo_opcional_"]'))
      .map(function (input) {
        const match = String(input.id || '').match(/^combo_opcional_(\d+)_/);
        return match ? Number(match[1]) : -1;
      })
      .filter(function (n) { return n >= 0; });
    return ids.length ? Math.max.apply(Math, ids) + 1 : list.querySelectorAll('[data-combo-upsell-card]').length;
  }

  function ensureActions(section, list) {
    if (!section || !list) return;
    if (!section.querySelector('[data-combo-upsell-add]')) {
      const actions = document.createElement('div');
      actions.className = 'prodComboUpsellActions';
      actions.innerHTML = '<button type="button" class="prodComboUpsellAddBtn" data-combo-upsell-add="1">+ Agregar producto upsell</button>';
      list.insertAdjacentElement('afterend', actions);
    }
    ensurePicker(section);
  }

  function ensurePicker(section) {
    if (!section || section.querySelector('[data-combo-upsell-picker]')) return;
    const picker = document.createElement('div');
    picker.className = 'prodComboUpsellPicker';
    picker.dataset.comboUpsellPicker = '1';
    picker.innerHTML = '<div class="prodComboUpsellPicker__head"><div><strong>Seleccionar productos comestibles</strong><span>Elegí productos existentes para ofrecerlos como upsell dentro del combo.</span></div><button type="button" class="prodComboUpsellPicker__close" data-combo-upsell-picker-close="1">×</button></div><input type="search" class="prodComboUpsellSearch" data-combo-upsell-search="1" placeholder="Buscar producto..."><div class="prodComboUpsellPickerGrid" data-combo-upsell-picker-grid="1"></div><div class="prodComboUpsellPicker__actions"><button type="button" class="prodComboUpsellPickerConfirm" data-combo-upsell-confirm="1">Agregar seleccionados</button></div>';
    section.appendChild(picker);
  }

  function renderPicker(query) {
    const section = findOptionalSection();
    const picker = section ? section.querySelector('[data-combo-upsell-picker]') : null;
    const grid = picker ? picker.querySelector('[data-combo-upsell-picker-grid]') : null;
    if (!grid) return;
    const q = String(query || '').trim().toLowerCase();
    const existing = existingProductIds();
    const products = readProducts().filter(function (product) {
      const haystack = [product.nombre, product.categoria, product.estado, product.badge].join(' ').toLowerCase();
      return !existing.has(product.id) && (!q || haystack.includes(q));
    });
    grid.innerHTML = products.length ? products.map(function (product) {
      const image = product.imagen ? '<img src="' + escapeHtml(product.imagen) + '" alt="">' : '<span>IMG</span>';
      return '<button type="button" class="prodComboUpsellPickCard ' + (pendingSelected.has(product.id) ? 'is-selected' : '') + '" data-combo-upsell-pick="1" data-product-id="' + escapeHtml(product.id) + '"><div class="prodComboUpsellPickCard__image">' + image + '</div><div><strong>' + escapeHtml(product.nombre) + '</strong><span>' + escapeHtml(product.categoria || 'Producto comestible') + '</span></div><b>+ ' + escapeHtml(money(product.precio)) + '</b></button>';
    }).join('') : '<div class="prodComboUpsellEmpty"><strong>No hay productos disponibles</strong><span>Ya seleccionaste todos los productos comestibles disponibles para este combo.</span></div>';
  }

  function openPicker() {
    const section = findOptionalSection();
    if (!section) return;
    ensurePicker(section);
    const picker = section.querySelector('[data-combo-upsell-picker]');
    pendingSelected = new Set();
    if (picker) picker.classList.add('is-active');
    renderPicker('');
    const search = picker && picker.querySelector('[data-combo-upsell-search]');
    if (search) search.value = '';
  }

  function closePicker() {
    const picker = document.querySelector('[data-combo-upsell-picker]');
    if (picker) picker.classList.remove('is-active');
    pendingSelected = new Set();
  }

  function confirmPicker() {
    const section = findOptionalSection();
    const list = section ? section.querySelector('.prodComboItems') : null;
    if (!list || !pendingSelected.size) { closePicker(); return; }
    const empty = list.querySelector('[data-combo-upsell-empty]');
    if (empty) empty.remove();
    let index = nextIndex(list);
    pendingSelected.forEach(function (productId) {
      if (existingProductIds().has(productId)) return;
      const product = getProduct(productId);
      list.insertAdjacentHTML('beforeend', buildUpsellCard(index, {
        product_id: product.id,
        cantidad: '1 unidad',
        estadoVisual: 'Visible',
        activo: true,
        snapshot_producto: product
      }));
      index += 1;
    });
    closePicker();
    enhanceOptionalSection();
    persistOptionalProducts();
  }

  function enhanceOptionalSection() {
    injectStyles();
    const section = findOptionalSection();
    if (!section) return;
    const list = section.querySelector('.prodComboItems');
    if (!list) return;
    section.classList.add('prodComboSection--optionalUpsellsV1');
    list.classList.add('prodComboUpsellList');
    removeLegacyOptionalControls(section, list);
    ensureActions(section, list);
    ensureEmptyState(list);
  }

  function scheduleEnhance() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      enhanceOptionalSection();
    });
  }

  function deleteUpsell(card) {
    const list = card ? card.closest('.prodComboItems') : optionalList();
    if (card) card.remove();
    ensureEmptyState(list);
    persistOptionalProducts();
    renderPicker('');
  }

  function syncToggle(card, isOn) {
    if (!card) return;
    const toggle = card.querySelector('[data-combo-upsell-toggle]');
    const hidden = toggle ? toggle.querySelector('[data-combo-upsell-enabled-input]') : null;
    card.classList.toggle('is-active', !!isOn);
    card.classList.toggle('is-disabled', !isOn);
    card.dataset.upsellEnabled = isOn ? '1' : '0';
    if (toggle) {
      toggle.classList.toggle('is-on', !!isOn);
      toggle.classList.toggle('is-off', !isOn);
      toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }
    if (hidden) hidden.value = isOn ? '1' : '0';
  }

  function collectOptionalProducts() {
    const list = optionalList();
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-combo-upsell-card][data-combo-upsell-source="picker"]')).map(function (card, index) {
      const product = getProduct(card.dataset.productId);
      const estado = fieldValueBySuffix(card, '_estado') || 'Visible';
      return {
        landing_section: 'agregados_opcionales',
        render_target: 'Podés sumar / Agregados opcionales',
        combo_id: currentComboId(),
        product_id: product.id,
        orden: index + 1,
        cantidad_label: fieldValueBySuffix(card, '_cantidad') || '1 unidad',
        activo: String(card.dataset.upsellEnabled || '1') === '1',
        estado_visual: estado,
        visible: estado === 'Visible',
        show_on_landing: estado === 'Visible',
        precio_source: 'producto_comestible',
        precio_override: null,
        snapshot_producto: product
      };
    });
  }

  function buildPayload() {
    return {
      combo_id: currentComboId(),
      section_key: 'agregados_opcionales',
      section_title: 'Agregados opcionales',
      source: 'productos_comestibles',
      relation_model: 'combo_optional_product_links',
      manual_creation_enabled: false,
      default_cards_enabled: false,
      items: collectOptionalProducts(),
      updated_at: new Date().toISOString()
    };
  }

  function persistOptionalProducts() {
    const payload = buildPayload();
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_LAST__ = payload.items;
    window.__PRODUCTOS_COMBO_OPTIONAL_PRODUCTS_PAYLOAD__ = payload;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[productos-combos-upsells-ui.js] No se pudo guardar payload local:', error);
    }
    return payload;
  }

  function bind() {
    if (document.body.dataset.productosCombosUpsellsUiBound === '1') return;
    document.body.dataset.productosCombosUpsellsUiBound = '1';

    document.addEventListener('click', function (event) {
      const legacyAdd = event.target.closest('[data-combo-add-included-option], [data-add-com-option], .prodComboAdd');
      if (legacyAdd && legacyAdd.closest('.prodComboSection--optionalUpsellsV1')) {
        event.preventDefault();
        event.stopPropagation();
        legacyAdd.remove();
        return;
      }

      const add = event.target.closest('[data-combo-upsell-add]');
      if (add) {
        event.preventDefault();
        event.stopPropagation();
        openPicker();
        return;
      }

      const close = event.target.closest('[data-combo-upsell-picker-close]');
      if (close) {
        event.preventDefault();
        event.stopPropagation();
        closePicker();
        return;
      }

      const pick = event.target.closest('[data-combo-upsell-pick]');
      if (pick) {
        event.preventDefault();
        event.stopPropagation();
        const id = pick.dataset.productId;
        if (pendingSelected.has(id)) pendingSelected.delete(id);
        else pendingSelected.add(id);
        pick.classList.toggle('is-selected', pendingSelected.has(id));
        return;
      }

      const confirm = event.target.closest('[data-combo-upsell-confirm]');
      if (confirm) {
        event.preventDefault();
        event.stopPropagation();
        confirmPicker();
        return;
      }

      const del = event.target.closest('[data-combo-upsell-delete]');
      if (del) {
        event.preventDefault();
        event.stopPropagation();
        deleteUpsell(del.closest('[data-combo-upsell-card]'));
        return;
      }

      const toggle = event.target.closest('[data-combo-upsell-toggle]');
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        const card = toggle.closest('[data-combo-upsell-card]');
        syncToggle(card, !(card && String(card.dataset.upsellEnabled || '1') === '1'));
        persistOptionalProducts();
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.matches('[data-combo-upsell-search]')) {
        renderPicker(event.target.value || '');
        return;
      }
      if (event.target.closest('[data-combo-upsell-card]')) persistOptionalProducts();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target.closest('[data-combo-upsell-card]')) persistOptionalProducts();
    }, true);

    document.addEventListener('click', function (event) {
      const saveBtn = event.target.closest('#prodComboSaveBtn');
      if (!saveBtn) return;
      const payload = persistOptionalProducts();
      console.log('[productos-combos-upsells-ui.js] Agregados opcionales preparados:', payload);
    }, true);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const body = document.getElementById('prodComboSlideBody');
    if (!body) return;
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(body, { childList: true, subtree: true });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    injectStyles();
    bind();
    startObserver();
    scheduleEnhance();
    setTimeout(scheduleEnhance, 160);
    setTimeout(scheduleEnhance, 420);
  }

  window.ProductosCombosUpsellsUi = {
    refresh: enhanceOptionalSection,
    collect: collectOptionalProducts,
    payload: buildPayload,
    persist: persistOptionalProducts,
    products: readProducts
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();