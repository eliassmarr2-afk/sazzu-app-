(function () {
  const STORAGE_KEYS = {
    products: 'sazzu_productos_payloads_local_v1',
    combos: 'sazzu_combos_payloads_local_v1'
  };

  const COMBO_PRODUCT_OPTIONS = [
    { id: 'box-dulce-nube', name: 'Box Dulce Nube' },
    { id: 'torta-choco-cream', name: 'Torta Choco Cream' },
    { id: 'muffins-mix', name: 'Muffins Mix' },
    { id: 'cookies-con-chips', name: 'Cookies con chips' },
    { id: 'mini-alfajores', name: 'Mini alfajores' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function readStored(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function getPayloadById(productId) {
    return readStored(STORAGE_KEYS.products)
      .concat(readStored(STORAGE_KEYS.combos))
      .find((item) => item.product_id === productId);
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureStyles() {
    if (document.getElementById('productosOperacionesStyles')) return;
    const style = document.createElement('style');
    style.id = 'productosOperacionesStyles';
    style.textContent = `
      body[data-page="productos"] .prodOpDelete{
        border:0;
        width:30px;
        height:30px;
        border-radius:5px;
        background:#FEF3F2;
        color:#B42318;
        font-size:15px;
        font-weight:950;
        cursor:pointer;
        display:grid;
        place-items:center;
      }
      body[data-page="productos"] .prodComOption > .prodOpDelete,
      body[data-page="productos"] .prodComboItem > .prodOpDelete{
        align-self:start;
      }
      body[data-page="productos"] .prodComboSectionActions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:12px;
      }
      body[data-page="productos"] .prodComboAddOption{
        min-height:36px;
        padding:0 13px;
        border:0;
        border-radius:5px;
        background:#EFF6FF;
        color:#2479FF;
        font-family:inherit;
        font-weight:850;
        cursor:pointer;
      }
      .prodSavePopupOverlay{
        position:fixed;
        inset:0;
        z-index:9999;
        display:grid;
        place-items:center;
        background:rgba(15,23,42,.22);
      }
      .prodSavePopupCard{
        width:min(420px,calc(100vw - 32px));
        background:#fff;
        border-radius:5px;
        box-shadow:0 24px 70px rgba(15,23,42,.20);
        padding:22px;
        text-align:center;
        font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
      }
      .prodSavePopupIcon{
        width:42px;
        height:42px;
        margin:0 auto 12px;
        border-radius:999px;
        display:grid;
        place-items:center;
        background:#ECFDF3;
        color:#027A48;
        font-weight:950;
      }
      .prodSavePopupCard strong{
        display:block;
        color:#0F172A;
        font-size:18px;
        font-weight:900;
        letter-spacing:-.02em;
      }
      .prodSavePopupCard span{
        display:block;
        margin-top:6px;
        color:#667085;
        font-size:13px;
        font-weight:650;
        line-height:1.4;
      }
    `;
    document.head.appendChild(style);
  }

  function showSavePopup(payload) {
    const typeLabel = payload.product_type === 'combo' ? 'combo' : 'producto';
    const name = payload.identity && payload.identity.name ? payload.identity.name : 'Producto';
    document.querySelectorAll('.prodSavePopupOverlay').forEach((el) => el.remove());
    const overlay = document.createElement('div');
    overlay.className = 'prodSavePopupOverlay';
    overlay.innerHTML = `
      <article class="prodSavePopupCard">
        <div class="prodSavePopupIcon">✓</div>
        <strong>Cambios guardados correctamente</strong>
        <span>El ${escapeHtml(typeLabel)} “${escapeHtml(name)}” se guardó y la fila quedó actualizada en la tabla.</span>
      </article>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => overlay.remove());
    setTimeout(() => overlay.remove(), 1800);
  }

  function enhanceLocalRows() {
    document.querySelectorAll('tr[data-local-product-row="1"]').forEach((row) => {
      const productId = row.dataset.localProductId;
      const payload = getPayloadById(productId);
      if (!payload) return;
      const lastCell = row.querySelector('td:last-child');
      if (!lastCell) return;
      lastCell.innerHTML = '<button type="button" class="prodComEdit" data-edit-local-product="' + escapeHtml(productId) + '">Editar</button>';
    });
  }

  function optionStatusLabel(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'incluido') return 'Incluido';
    if (v === 'agotado') return 'Agotado';
    if (v === 'oculto') return 'Oculto';
    return 'Activo';
  }

  function renderProductOption(key, item, index, hasPrice) {
    const visual = item.image_url ? '<img src="' + escapeHtml(item.image_url) + '" alt="">' : '<span>4×4</span>';
    const priceOrCost = hasPrice
      ? '<label class="prodComField"><span>Precio adicional</span><input id="' + key + '_' + index + '_precio" type="number" value="' + escapeHtml(item.price_delta || 0) + '"></label>'
      : '<label class="prodComField"><span>Costo</span><select id="' + key + '_' + index + '_costo"><option value="Incluido" selected>Incluido</option></select></label>';
    const badge = item.badge || '';

    return '<article class="prodComOption" data-option-key="' + escapeHtml(key) + '">' +
      '<div class="prodComOption__num">' + (index + 1) + '</div>' +
      '<div class="prodComOption__visual">' + visual + '</div>' +
      '<div class="prodComGrid prodComGrid--option">' +
        '<label class="prodComField"><span>Nombre</span><input id="' + key + '_' + index + '_nombre" type="text" value="' + escapeHtml(item.name || '') + '"></label>' +
        '<label class="prodComField"><span>Descripción</span><input id="' + key + '_' + index + '_desc" type="text" value="' + escapeHtml(item.description || '') + '"></label>' +
        priceOrCost +
        '<label class="prodComField"><span>Estado</span><select id="' + key + '_' + index + '_estado"><option value="Activo" ' + (optionStatusLabel(item.status) === 'Activo' ? 'selected' : '') + '>Activo</option><option value="Incluido" ' + (optionStatusLabel(item.status) === 'Incluido' ? 'selected' : '') + '>Incluido</option><option value="Agotado" ' + (optionStatusLabel(item.status) === 'Agotado' ? 'selected' : '') + '>Agotado</option><option value="Oculto" ' + (optionStatusLabel(item.status) === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
        '<label class="prodComField"><span>Badge</span><input id="' + key + '_' + index + '_badge" type="text" value="' + escapeHtml(badge) + '"></label>' +
        '<label class="prodComField"><span>Imagen 4x4</span><input id="' + key + '_' + index + '_img" type="url" value="' + escapeHtml(item.image_url || '') + '"></label>' +
      '</div>' +
      '<button type="button" class="prodOpDelete" data-delete-product-option="1" aria-label="Eliminar opción">🗑</button>' +
    '</article>';
  }

  function fillProductSlide(payload) {
    const identity = payload.identity || {};
    const slide = document.getElementById('prodComSlide');
    if (slide) slide.dataset.productId = payload.product_id;
    const title = document.getElementById('prodComSlideTitle');
    if (title) title.textContent = identity.name || 'Producto comestible';

    setValue('com_nombre', identity.name);
    setValue('com_categoria', identity.category);
    setValue('com_badge', identity.badge);
    setValue('com_precio', identity.base_price);
    setValue('com_promesa', identity.delivery_promise);
    setValue('com_estado', payload.status === 'activo' ? 'Activo' : payload.status === 'oculto' ? 'Oculto' : 'Borrador');
    setValue('com_descripcion', identity.description);

    (payload.images || []).forEach((img, i) => setValue('com_img_' + (i + 1), img.image_url));

    const groups = {
      versiones: { type: 'version', hasPrice: true },
      extras: { type: 'extra', hasPrice: true },
      sinCosto: { type: 'removable', hasPrice: false },
      recomendados: { type: 'recommended', hasPrice: true }
    };

    Object.keys(groups).forEach((key) => {
      const meta = groups[key];
      const list = document.querySelector('.prodComOptions[data-options-key="' + key + '"]');
      if (!list) return;
      const items = (payload.options || []).filter((item) => item.section_type === meta.type);
      list.innerHTML = items.map((item, index) => renderProductOption(key, item, index, meta.hasPrice)).join('');
    });
    enhanceOptionDeletes();
  }

  function openLocalProduct(productId) {
    const payload = getPayloadById(productId);
    if (!payload) return;
    if (payload.product_type === 'combo') {
      const btn = document.getElementById('prodComboNewBtn');
      if (btn) btn.click();
      setTimeout(() => fillComboSlide(payload), 80);
      return;
    }
    const btn = document.getElementById('prodComNuevoBtn');
    if (btn) btn.click();
    setTimeout(() => fillProductSlide(payload), 80);
  }

  function enhanceOptionDeletes(root) {
    const scope = root || document;
    scope.querySelectorAll('.prodComOption').forEach((card) => {
      if (card.querySelector('[data-delete-product-option]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prodOpDelete';
      btn.dataset.deleteProductOption = '1';
      btn.setAttribute('aria-label', 'Eliminar opción');
      btn.textContent = '🗑';
      card.appendChild(btn);
    });
    scope.querySelectorAll('.prodComboItem').forEach((card) => {
      if (card.querySelector('[data-delete-combo-item]')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prodOpDelete';
      btn.dataset.deleteComboItem = '1';
      btn.setAttribute('aria-label', 'Eliminar opción');
      btn.textContent = '🗑';
      card.appendChild(btn);
    });
  }

  function nextIndexByPrefix(prefix, suffix) {
    const inputs = Array.from(document.querySelectorAll('[id^="' + prefix + '"][id$="' + suffix + '"]'));
    const indexes = inputs.map((input) => {
      const match = input.id.match(/_(\d+)_/);
      return match ? Number(match[1]) : -1;
    });
    return indexes.length ? Math.max.apply(null, indexes) + 1 : 0;
  }

  function comboProductSelect(id, value) {
    return '<select id="' + escapeHtml(id) + '">' + COMBO_PRODUCT_OPTIONS.map((product) => '<option value="' + escapeHtml(product.id) + '" ' + (product.id === value ? 'selected' : '') + '>' + escapeHtml(product.name) + '</option>').join('') + '</select>';
  }

  function renderIncludedItem(index, data) {
    const item = data || {};
    return '<article class="prodComboItem is-included">' +
      '<button type="button" class="prodComboToggle" aria-label="Estado incluido">●</button>' +
      '<div class="prodComboItem__image"><span>4×4</span></div>' +
      '<div class="prodComboGrid prodComboGrid--item">' +
        '<label class="prodComboField"><span>Nombre</span><input id="combo_incluido_' + index + '_nombre" type="text" value="' + escapeHtml(item.name || 'Nuevo componente incluido') + '"></label>' +
        '<label class="prodComboField"><span>Cantidad</span><input id="combo_incluido_' + index + '_cantidad" type="text" value="' + escapeHtml(item.quantity_label || '1 unidad') + '"></label>' +
        '<label class="prodComboField"><span>Descripción</span><input id="combo_incluido_' + index + '_desc" type="text" value="' + escapeHtml(item.description || 'Componente del combo base.') + '"></label>' +
        '<label class="prodComboField"><span>Estado visual</span><select id="combo_incluido_' + index + '_estado"><option value="Marcado" selected>Marcado</option><option value="Desmarcado">Desmarcado</option></select></label>' +
        '<label class="prodComboField"><span>Imagen 4x4</span><input id="combo_incluido_' + index + '_img" type="url" value="' + escapeHtml(item.image_url || '') + '"></label>' +
        '<label class="prodComboField"><span>Texto estático</span><input value="Incluido en el combo original" readonly></label>' +
      '</div>' +
      '<button type="button" class="prodOpDelete" data-delete-combo-item="1" aria-label="Eliminar opción">🗑</button>' +
    '</article>';
  }

  function renderOptionalItem(index, data) {
    const item = data || {};
    const productId = item.linked_product_id || COMBO_PRODUCT_OPTIONS[0].id;
    return '<article class="prodComboItem prodComboItem--product is-optional">' +
      '<button type="button" class="prodComboToggle" aria-label="Estado agregado">○</button>' +
      '<div class="prodComboItem__image prodComboItem__image--product"><span>4×4</span></div>' +
      '<div class="prodComboGrid prodComboGrid--item">' +
        '<label class="prodComboField"><span>Producto comestible</span>' + comboProductSelect('combo_opcional_' + index + '_product', productId) + '</label>' +
        '<label class="prodComboField"><span>Cantidad</span><input id="combo_opcional_' + index + '_cantidad" type="text" value="' + escapeHtml(item.quantity_label || '1 unidad') + '"></label>' +
        '<label class="prodComboField"><span>Estado visual</span><select id="combo_opcional_' + index + '_estado"><option value="Disponible" selected>Disponible</option><option value="Agregado">Agregado</option><option value="Oculto">Oculto</option></select></label>' +
        '<label class="prodComboField"><span>Texto estático</span><input value="Disponible para sumar" readonly></label>' +
      '</div>' +
      '<button type="button" class="prodOpDelete" data-delete-combo-item="1" aria-label="Eliminar opción">🗑</button>' +
    '</article>';
  }

  function sectionHasInput(section, prefix) {
    return !!section.querySelector('[id^="' + prefix + '"]');
  }

  function enhanceComboAddButtons() {
    document.querySelectorAll('.prodComboSection').forEach((section) => {
      const items = section.querySelector('.prodComboItems');
      if (!items || section.querySelector('[data-add-combo-section]')) return;
      let type = '';
      if (sectionHasInput(section, 'combo_incluido_')) type = 'incluido';
      if (sectionHasInput(section, 'combo_opcional_')) type = 'opcional';
      if (!type) return;
      const actions = document.createElement('div');
      actions.className = 'prodComboSectionActions';
      actions.innerHTML = '<button type="button" class="prodComboAddOption" data-add-combo-section="' + type + '">+ Agregar opción</button>';
      items.insertAdjacentElement('afterend', actions);
    });
  }

  function fillComboSlide(payload) {
    const identity = payload.identity || {};
    const slide = document.getElementById('prodComboSlide');
    if (slide) slide.dataset.comboId = payload.product_id;

    setValue('combo_nombre', identity.name);
    setValue('combo_categoria', identity.category);
    setValue('combo_badge', identity.badge);
    setValue('combo_precio', identity.base_price);
    setValue('combo_promesa', identity.delivery_promise);
    setValue('combo_estado', payload.status === 'activo' ? 'Activo' : payload.status === 'oculto' ? 'Oculto' : 'Borrador');
    setValue('combo_descripcion', identity.description);
    (payload.images || []).forEach((img, i) => setValue('combo_img_' + (i + 1), img.image_url));

    const includedList = document.querySelector('.prodComboItems:has([id^="combo_incluido_"])');
    if (includedList) includedList.innerHTML = (payload.combo_components || []).map((item, index) => renderIncludedItem(index, item)).join('');
    const optionalList = document.querySelector('.prodComboItems:has([id^="combo_opcional_"])');
    if (optionalList) optionalList.innerHTML = (payload.optional_products || []).map((item, index) => renderOptionalItem(index, item)).join('');
    enhanceComboAddButtons();
    enhanceOptionDeletes();
  }

  function handleDocumentClick(event) {
    const localEdit = event.target.closest('[data-edit-local-product]');
    if (localEdit) {
      event.preventDefault();
      openLocalProduct(localEdit.dataset.editLocalProduct);
      return;
    }

    const productDelete = event.target.closest('[data-delete-product-option]');
    if (productDelete) {
      event.preventDefault();
      productDelete.closest('.prodComOption')?.remove();
      return;
    }

    const comboDelete = event.target.closest('[data-delete-combo-item]');
    if (comboDelete) {
      event.preventDefault();
      comboDelete.closest('.prodComboItem')?.remove();
      return;
    }

    const addCombo = event.target.closest('[data-add-combo-section]');
    if (addCombo) {
      event.preventDefault();
      const type = addCombo.dataset.addComboSection;
      const section = addCombo.closest('.prodComboSection');
      const list = section && section.querySelector('.prodComboItems');
      if (!list) return;
      if (type === 'incluido') list.insertAdjacentHTML('beforeend', renderIncludedItem(nextIndexByPrefix('combo_incluido_', '_nombre')));
      if (type === 'opcional') list.insertAdjacentHTML('beforeend', renderOptionalItem(nextIndexByPrefix('combo_opcional_', '_product')));
      enhanceOptionDeletes(list);
    }
  }

  function observeUi() {
    const observer = new MutationObserver(() => {
      enhanceLocalRows();
      enhanceOptionDeletes();
      enhanceComboAddButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initProductosOperaciones() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body || body.dataset.productosOperacionesReady === '1') return;
    body.dataset.productosOperacionesReady = '1';
    ensureStyles();
    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('productos:payload-ready', (event) => {
      showSavePopup(event.detail && event.detail.payload ? event.detail.payload : {});
      setTimeout(enhanceLocalRows, 40);
    });
    observeUi();
    setTimeout(() => { enhanceLocalRows(); enhanceOptionDeletes(); enhanceComboAddButtons(); }, 300);
  }

  document.addEventListener('DOMContentLoaded', initProductosOperaciones);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosOperaciones, 120);
    setTimeout(initProductosOperaciones, 420);
  });
})();
