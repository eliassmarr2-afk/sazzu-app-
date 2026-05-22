(function () {
  function ensureExtraAsset(src, marker, type) {
    if (type === 'css') {
      if (document.querySelector('link[data-loader="' + marker + '"]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = src;
      link.setAttribute('data-loader', marker);
      document.head.appendChild(link);
      return;
    }
    if (document.querySelector('script[data-loader="' + marker + '"]')) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute('data-loader', marker);
    document.body.appendChild(script);
  }

  function loadExtrasModule() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    ensureExtraAsset('../css/productos-extras.css', 'productos-extras-css', 'css');
    ensureExtraAsset('../js/productos-extras.js', 'productos-extras-js', 'js');
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'activo') return 'Activo';
    if (value === 'oculto') return 'Oculto';
    return 'Borrador';
  }

  function normalizeOptionStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'incluido') return 'Incluido';
    if (value === 'agotado') return 'Agotado';
    if (value === 'oculto') return 'Oculto';
    return 'Activo';
  }

  function normalizeComboIncludedStatus(value) {
    return value === false ? 'Desmarcado' : 'Marcado';
  }

  function normalizeComboOptionalStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'agregado') return 'Agregado';
    if (value === 'oculto') return 'Oculto';
    return 'Disponible';
  }

  function setPreviewFromInput(inputId, imageUrl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = imageUrl || '';
    const field = input.closest('.prodComImageField, .prodComboImageField');
    const preview = field && field.querySelector('.prodComImagePreview, .prodComboImagePreview');
    if (!preview) return;
    preview.textContent = '';
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = '';
      preview.appendChild(img);
    } else {
      const fallback = document.createElement('b');
      fallback.textContent = 'IMG';
      preview.appendChild(fallback);
    }
  }

  function setSmallPreview(card, imageUrl) {
    if (!card) return;
    const preview = card.querySelector('.prodComOption__visual, .prodComboItem__image');
    if (!preview) return;
    preview.textContent = '';
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = '';
      preview.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = '4×4';
      preview.appendChild(span);
    }
  }

  function fillGallery(prefix, images) {
    const slots = ['', '', '', '', '', ''];
    (images || []).forEach(function (image, index) {
      const position = Number(image.position || index + 1);
      const slot = Math.max(0, Math.min(5, position - 1));
      slots[slot] = image.image_url || '';
    });
    slots.forEach(function (url, index) {
      setPreviewFromInput(prefix + (index + 1), url);
    });
  }

  function ensureCards(list, selector, addButtonSelector, targetCount) {
    if (!list) return [];
    let cards = Array.from(list.querySelectorAll(selector));
    const addButton = document.querySelector(addButtonSelector);

    while (cards.length < targetCount && addButton) {
      addButton.click();
      cards = Array.from(list.querySelectorAll(selector));
    }

    while (cards.length > targetCount) {
      const last = cards[cards.length - 1];
      last.remove();
      cards = Array.from(list.querySelectorAll(selector));
    }

    return cards;
  }

  function fillProductOptions(key, items, hasPrice) {
    const list = document.querySelector('.prodComOptions[data-options-key="' + key + '"]');
    if (!list) return;
    const cards = ensureCards(list, '.prodComOption', '[data-add-com-option="' + key + '"]', items.length);

    items.forEach(function (item, index) {
      setValue(key + '_' + index + '_nombre', item.name || '');
      setValue(key + '_' + index + '_desc', item.description || '');
      if (hasPrice) setValue(key + '_' + index + '_precio', item.price_delta || 0);
      setValue(key + '_' + index + '_estado', normalizeOptionStatus(item.status));
      setValue(key + '_' + index + '_badge', item.badge || '');
      setValue(key + '_' + index + '_img', item.image_url || '');
      setSmallPreview(cards[index], item.image_url || '');
    });
  }

  function fillProduct(payload) {
    const identity = payload.identity || {};
    const slide = document.getElementById('prodComSlide');
    if (slide) slide.dataset.productId = payload.product_id || '';

    const title = document.getElementById('prodComSlideTitle');
    if (title) title.textContent = identity.name || 'Producto comestible';

    setValue('com_nombre', identity.name || '');
    setValue('com_categoria', identity.category || '');
    setValue('com_badge', identity.badge || '');
    setValue('com_precio', identity.base_price || 0);
    setValue('com_promesa', identity.delivery_promise || '');
    setValue('com_estado', normalizeStatus(payload.status));
    setValue('com_descripcion', identity.description || '');
    fillGallery('com_img_', payload.images || []);

    const options = payload.options || [];
    fillProductOptions('versiones', options.filter(function (item) { return item.section_type === 'version'; }), true);
    fillProductOptions('extras', options.filter(function (item) { return item.section_type === 'extra'; }), true);
    fillProductOptions('sinCosto', options.filter(function (item) { return item.section_type === 'removable'; }), false);
    fillProductOptions('recomendados', options.filter(function (item) { return item.section_type === 'recommended'; }), true);
  }

  function getComboList(prefix) {
    const input = document.querySelector('[id^="' + prefix + '"]');
    return input ? input.closest('.prodComboItems') : null;
  }

  function fillComboComponents(items) {
    const list = getComboList('combo_incluido_');
    if (!list) return;
    const cards = ensureCards(list, '.prodComboItem', '[data-add-combo-section="incluido"]', items.length);

    items.forEach(function (item, index) {
      setValue('combo_incluido_' + index + '_nombre', item.name || '');
      setValue('combo_incluido_' + index + '_cantidad', item.quantity_label || '');
      setValue('combo_incluido_' + index + '_desc', item.description || '');
      setValue('combo_incluido_' + index + '_estado', normalizeComboIncludedStatus(item.is_included_by_default));
      setValue('combo_incluido_' + index + '_img', item.image_url || '');
      setSmallPreview(cards[index], item.image_url || '');
    });
  }

  function fillComboOptional(items) {
    const list = getComboList('combo_opcional_');
    if (!list) return;
    const cards = ensureCards(list, '.prodComboItem', '[data-add-combo-section="opcional"]', items.length);

    items.forEach(function (item, index) {
      setValue('combo_opcional_' + index + '_product', item.linked_product_id || '');
      setValue('combo_opcional_' + index + '_cantidad', item.quantity_label || '');
      setValue('combo_opcional_' + index + '_estado', normalizeComboOptionalStatus(item.status));
      setSmallPreview(cards[index], '');
    });
  }

  function fillCombo(payload) {
    const identity = payload.identity || {};
    const slide = document.getElementById('prodComboSlide');
    if (slide) slide.dataset.comboId = payload.product_id || '';

    setValue('combo_nombre', identity.name || '');
    setValue('combo_categoria', identity.category || '');
    setValue('combo_badge', identity.badge || '');
    setValue('combo_precio', identity.base_price || 0);
    setValue('combo_promesa', identity.delivery_promise || '');
    setValue('combo_estado', normalizeStatus(payload.status));
    setValue('combo_descripcion', identity.description || '');
    fillGallery('combo_img_', payload.images || []);
    fillComboComponents(payload.combo_components || []);
    fillComboOptional(payload.optional_products || []);
  }

  function fillPayload(payload) {
    if (!payload) return;
    if (payload.product_type === 'combo') fillCombo(payload);
    else fillProduct(payload);
  }

  function init() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body || body.dataset.productosRehidratacionReady === '1') return;
    body.dataset.productosRehidratacionReady = '1';
    loadExtrasModule();

    window.addEventListener('productos:open-local-payload', function (event) {
      setTimeout(function () { fillPayload(event.detail); }, 80);
      setTimeout(function () { fillPayload(event.detail); }, 260);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(init, 120);
    setTimeout(function(){ init(); loadExtrasModule(); }, 420);
  });
})();
