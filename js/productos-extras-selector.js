(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';
  let selectionMode = false;
  let selectedIds = new Set();
  let selectedExtras = new Map();
  let observerStarted = false;
  let activeTarget = 'producto_comestible';

  function readExtras() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('[productos-extras-selector.js] No se pudo leer banco local:', error);
    }
    return [];
  }

  function getExtra(id) {
    return readExtras().find(function (item) { return item.id === id; });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '+ $' + Number(value || 0).toLocaleString('es-AR');
  }

  function parseMoneyText(value) {
    const digits = String(value || '').replace(/[^0-9-]/g, '');
    const parsed = Number(digits || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function safeExtraSelector(id) {
    if (window.CSS && typeof window.CSS.escape === 'function') return CSS.escape(id);
    return String(id || '').replace(/"/g, '\\"');
  }

  function normalizeExtra(extra) {
    const data = extra || {};
    return {
      id: String(data.extra_id || data.id || ('extra-seleccionado-' + Date.now())).trim(),
      extra_id: String(data.extra_id || data.id || '').trim(),
      title: String(data.title || data.nombre || 'Extra').trim(),
      nombre: String(data.nombre || data.title || 'Extra').trim(),
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : 0)) || 0,
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : 0)) || 0,
      status: String(data.status || data.estado || 'Activo').trim(),
      estado: String(data.estado || data.status || 'Activo').trim(),
      badge: String(data.badge || '').trim(),
      folder: String(data.folder || data.carpeta || '').trim(),
      tags: String(data.tags || data.etiquetas || '').trim(),
      image: String(data.image || data.imagen || '').trim(),
      imagen: String(data.imagen || data.image || '').trim()
    };
  }

  function getExtraFromCard(card) {
    if (!card) return null;

    const image = card.querySelector('.prodExtraCard__image img');
    const badge = card.querySelector('.prodExtraCard__badge');
    const title = card.querySelector('.prodExtraCard__info strong');
    const description = card.querySelector('.prodExtraCard__info span');
    const folder = card.querySelector('.prodExtraCard__info em');
    const price = card.querySelector('.prodExtraCard__price');

    return normalizeExtra({
      id: card.dataset.extraId || '',
      extra_id: card.dataset.extraId || '',
      title: title ? title.textContent : '',
      description: description ? description.textContent : '',
      price: price ? parseMoneyText(price.textContent) : 0,
      status: 'Activo',
      badge: badge ? badge.textContent : '',
      folder: folder ? folder.textContent : '',
      tags: '',
      image: image ? image.getAttribute('src') : ''
    });
  }

  function getSelectedExtraById(id) {
    if (!id) return null;
    if (selectedExtras.has(id)) return selectedExtras.get(id);

    const stored = getExtra(id);
    if (stored) return normalizeExtra(stored);

    const card = document.querySelector('#prodExtrasGrid .prodExtraCard[data-extra-id="' + safeExtraSelector(id) + '"]');
    return getExtraFromCard(card);
  }

  function ensureSelectorAssets() {
    if (!document.querySelector('link[data-loader="productos-extras-selector-css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '../css/productos-extras-selector.css';
      link.setAttribute('data-loader', 'productos-extras-selector-css');
      document.head.appendChild(link);
    }
  }

  function setInput(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function selectedExtraHiddenFields(extra, index, prefix) {
    const data = normalizeExtra(extra);
    return [
      ['id', data.id],
      ['extra_id', data.extra_id || data.id],
      ['nombre', data.title],
      ['desc', data.description],
      ['precio', data.price],
      ['estado', data.status],
      ['badge', data.badge],
      ['img', data.image],
      ['folder', data.folder],
      ['tags', data.tags]
    ].map(function (pair) {
      return '<input type="hidden" id="' + prefix + '_' + index + '_' + escapeHtml(pair[0]) + '" value="' + escapeHtml(pair[1]) + '">';
    }).join('');
  }

  function selectedExtraCardHtml(extra, index) {
    const data = normalizeExtra(extra);
    const imageHtml = data.image ? '<img src="' + escapeHtml(data.image) + '" alt="">' : '<span>4×4</span>';
    const badgeHtml = data.badge
      ? '<span class="prodComSelectedExtraCard__badge">' + escapeHtml(data.badge) + '</span>'
      : '<span class="prodComSelectedExtraCard__badge prodComSelectedExtraCard__badge--soft">Banco de extras</span>';

    return '' +
      '<article class="prodComOption prodComSelectedExtraCard" data-option-key="extras" data-extra-source-id="' + escapeHtml(data.extra_id || data.id) + '" data-extra-folder="' + escapeHtml(data.folder) + '" data-extra-tags="' + escapeHtml(data.tags) + '">' +
        '<div class="prodComSelectedExtraCard__image">' + imageHtml + '</div>' +
        '<div class="prodComSelectedExtraCard__body"><strong>' + escapeHtml(data.title) + '</strong><span>' + escapeHtml(data.description || 'Extra agregado al producto.') + '</span></div>' +
        '<div class="prodComSelectedExtraCard__meta">' + badgeHtml + '<b>' + escapeHtml(money(data.price)) + '</b></div>' +
        '<button type="button" class="prodComSelectedExtraCard__delete" data-remove-selected-extra="' + escapeHtml(data.extra_id || data.id) + '" aria-label="Eliminar extra ' + escapeHtml(data.title) + '">' + trashIcon() + '</button>' +
        selectedExtraHiddenFields(data, index, 'extras') +
      '</article>';
  }

  function comboSelectedExtraCardHtml(extra, index) {
    const data = normalizeExtra(extra);
    const imageHtml = data.image ? '<img src="' + escapeHtml(data.image) + '" alt="">' : '<span>4×4</span>';
    const badgeHtml = data.badge
      ? '<span class="prodComboSelectedExtraCard__badge">' + escapeHtml(data.badge) + '</span>'
      : '<span class="prodComboSelectedExtraCard__badge prodComboSelectedExtraCard__badge--soft">Banco de extras</span>';

    return '' +
      '<article class="prodComboSelectedExtraCard" data-combo-extra-card="1" data-extra-source-id="' + escapeHtml(data.extra_id || data.id) + '" data-extra-folder="' + escapeHtml(data.folder) + '" data-extra-tags="' + escapeHtml(data.tags) + '">' +
        '<div class="prodComboSelectedExtraCard__image">' + imageHtml + '</div>' +
        '<div class="prodComboSelectedExtraCard__body"><strong>' + escapeHtml(data.title) + '</strong><span>' + escapeHtml(data.description || 'Extra agregado al combo.') + '</span></div>' +
        '<div class="prodComboSelectedExtraCard__meta">' + badgeHtml + '<b>' + escapeHtml(money(data.price)) + '</b></div>' +
        '<button type="button" class="prodComboSelectedExtraCard__delete" data-remove-selected-extra="' + escapeHtml(data.extra_id || data.id) + '" aria-label="Eliminar extra ' + escapeHtml(data.title) + '">' + trashIcon() + '</button>' +
        selectedExtraHiddenFields(data, index, 'combo_extra') +
      '</article>';
  }

  function updateSelectedExtrasCount(list) {
    if (!list) return;
    const count = list.querySelectorAll('.prodComSelectedExtraCard').length;
    list.dataset.selectedExtrasCount = String(count);
    const extrasSection = list.closest('[data-prod-com-section="extras"]');
    if (extrasSection) extrasSection.dataset.selectedExtrasCount = String(count);

    if (!count) {
      list.classList.remove('prodComOptions--selectedExtras');
      list.innerHTML = '<div class="prodComExtrasEmptyState">Sin extras seleccionados. Usá + Agregar Extra para traerlos desde el Banco.</div>';
    }
  }

  function updateComboSelectedExtrasCount(list) {
    if (!list) return;
    const count = list.querySelectorAll('.prodComboSelectedExtraCard').length;
    list.dataset.selectedExtrasCount = String(count);
    const extrasSection = list.closest('[data-prod-combo-extras-section="1"]');
    if (extrasSection) extrasSection.dataset.selectedExtrasCount = String(count);

    if (!count) {
      list.classList.remove('prodComboExtrasList--selected');
      list.innerHTML = '<div class="prodComboEmptyBox"><strong>Sin extras cargados todavía</strong><span>Usá + Agregar Extra para asociar extras reutilizables del banco a este combo.</span></div>';
    }
  }

  function removeSelectedExtra(button) {
    const productCard = button && button.closest('.prodComSelectedExtraCard');
    if (productCard) {
      const list = productCard.closest('.prodComOptions[data-options-key="extras"]');
      productCard.remove();
      updateSelectedExtrasCount(list);
      setTimeout(ensurePickButtons, 80);
      return;
    }

    const comboCard = button && button.closest('.prodComboSelectedExtraCard');
    if (comboCard) {
      const list = comboCard.closest('.prodComboExtrasList');
      comboCard.remove();
      updateComboSelectedExtrasCount(list);
      setTimeout(ensurePickButtons, 80);
    }
  }

  function renderSelectedExtrasIntoBuilder(extras) {
    const list = document.querySelector('.prodComOptions[data-options-key="extras"]');
    if (!list) return false;
    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra).filter(function (item) { return item && item.id && item.title; });
    if (!normalized.length) return false;
    list.classList.add('prodComOptions--selectedExtras');
    list.innerHTML = normalized.map(selectedExtraCardHtml).join('');
    list.dataset.selectedExtrasCount = String(normalized.length);
    const extrasSection = list.closest('[data-prod-com-section="extras"]');
    if (extrasSection) extrasSection.dataset.selectedExtrasCount = String(normalized.length);
    const first = list.querySelector('.prodComSelectedExtraCard');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  function renderSelectedExtrasIntoComboBuilder(extras) {
    const list = document.querySelector('.prodComboExtrasList[data-combo-extras-list="1"]');
    if (!list) return false;
    const normalized = (Array.isArray(extras) ? extras : []).map(normalizeExtra).filter(function (item) { return item && item.id && item.title; });
    if (!normalized.length) return false;
    list.classList.add('prodComboExtrasList--selected');
    list.innerHTML = normalized.map(comboSelectedExtraCardHtml).join('');
    list.dataset.selectedExtrasCount = String(normalized.length);
    const extrasSection = list.closest('[data-prod-combo-extras-section="1"]');
    if (extrasSection) extrasSection.dataset.selectedExtrasCount = String(normalized.length);
    const first = list.querySelector('.prodComboSelectedExtraCard');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  function removeSlotButtons() {
    document.querySelectorAll('.prodComOptions[data-options-key="extras"] button').forEach(function (btn) {
      const text = String(btn.textContent || '').trim().toLowerCase();
      if (btn.dataset.openExtraBank === 'slot' || text === 'seleccionar del banco de extras') btn.remove();
    });
  }

  function ensurePickButtons() {
    removeSlotButtons();
    document.querySelectorAll('.prodComSecondaryAction').forEach(function (btn) {
      if (/Abrir banco de extras|Agregar Extra/i.test(btn.textContent || '')) {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.classList.add('prodComBankPick');
        btn.dataset.openExtraBank = 'append';
        btn.textContent = '+ Agregar Extra';
      }
    });
    document.querySelectorAll('.prodComboExtraAdd').forEach(function (btn) {
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.dataset.openExtraBank = 'append';
      btn.dataset.extraTarget = 'combo';
      btn.textContent = '+ Agregar Extra';
    });
  }

  function ensureSelectControls() {
    const actions = document.querySelector('#prodExtrasSlide .prodExtrasHeaderActions');
    if (!actions) return;
    if (!document.getElementById('prodExtrasSelectConfirm')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'prodExtrasSelectConfirm';
      btn.className = 'prodExtrasSelectConfirm';
      btn.textContent = 'Agregar seleccionados';
      actions.insertBefore(btn, actions.firstChild);
    }
    const headerText = document.querySelector('#prodExtrasSlide .prodExtrasHeader p');
    if (headerText && !document.getElementById('prodExtrasModeLabel')) {
      const label = document.createElement('span');
      label.id = 'prodExtrasModeLabel';
      label.className = 'prodExtrasModeLabel';
      label.textContent = 'Modo selección activo: marcá extras y confirmá para traerlos al producto o combo.';
      headerText.insertAdjacentElement('afterend', label);
    }
  }

  function openBankAsSelector(target) {
    activeTarget = typeof target === 'string' ? target : (target && target.target) || activeTarget || 'producto_comestible';
    selectedIds = new Set();
    selectedExtras = new Map();
    const launcher = document.getElementById('prodExtrasLauncherBtn');
    if (launcher) launcher.click();
    setTimeout(enterSelectionMode, 80);
    setTimeout(enterSelectionMode, 180);
    setTimeout(enterSelectionMode, 360);
  }

  function enterSelectionMode() {
    const slide = document.getElementById('prodExtrasSlide');
    if (!slide) return;
    selectionMode = true;
    ensureSelectControls();
    slide.classList.add('is-selecting');
    slide.dataset.extraTarget = activeTarget;
    document.querySelectorAll('#prodExtrasGrid .prodExtraCard').forEach(function (card) {
      const id = card.dataset.extraId || '';
      card.classList.add('is-selectable');
      card.classList.toggle('is-selected', selectedIds.has(id));
    });
    updateConfirmLabel();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds = new Set();
    selectedExtras = new Map();
    activeTarget = 'producto_comestible';
    const slide = document.getElementById('prodExtrasSlide');
    if (slide) {
      slide.classList.remove('is-selecting');
      slide.dataset.extraTarget = '';
    }
    document.querySelectorAll('#prodExtrasGrid .prodExtraCard').forEach(function (card) {
      card.classList.remove('is-selectable', 'is-selected');
    });
    updateConfirmLabel();
  }

  function updateConfirmLabel() {
    const btn = document.getElementById('prodExtrasSelectConfirm');
    if (!btn) return;
    const count = selectedIds.size;
    btn.textContent = count ? 'Agregar seleccionados (' + count + ')' : 'Agregar seleccionados';
  }

  function toggleExtra(card) {
    const id = card && card.dataset.extraId;
    if (!id) return;
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      selectedExtras.delete(id);
      card.classList.remove('is-selected');
    } else {
      const extra = getExtra(id) || getExtraFromCard(card);
      selectedIds.add(id);
      selectedExtras.set(id, normalizeExtra(extra));
      card.classList.add('is-selected');
    }
    updateConfirmLabel();
  }

  function applySelectedExtras() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const extras = ids.map(getSelectedExtraById).filter(Boolean).map(normalizeExtra);
    if (!extras.length) return;

    const rendered = activeTarget === 'combo'
      ? renderSelectedExtrasIntoComboBuilder(extras)
      : renderSelectedExtrasIntoBuilder(extras);

    if (!rendered && activeTarget !== 'combo') {
      renderSelectedExtrasIntoBuilder(extras);
    }

    const close = document.getElementById('prodExtrasCloseBtn');
    if (close) close.click();
    exitSelectionMode();
    setTimeout(ensurePickButtons, 120);
  }

  function interceptSelectionClicks(event) {
    const removeBtn = event.target && event.target.closest && event.target.closest('[data-remove-selected-extra]');
    if (removeBtn) {
      event.preventDefault();
      event.stopImmediatePropagation();
      removeSelectedExtra(removeBtn);
      return;
    }

    const selectCard = event.target && event.target.closest && event.target.closest('#prodExtrasSlide.is-selecting #prodExtrasGrid .prodExtraCard');
    if (selectCard) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleExtra(selectCard);
      return;
    }

    const confirm = event.target && event.target.closest && event.target.closest('#prodExtrasSelectConfirm');
    if (confirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      applySelectedExtras();
    }
  }

  function bind() {
    if (document.body.dataset.productosExtrasSelectorBound === '1') return;
    document.body.dataset.productosExtrasSelectorBound = '1';
    window.addEventListener('click', interceptSelectionClicks, true);
    document.addEventListener('click', function (event) {
      const picker = event.target.closest('[data-open-extra-bank]');
      if (picker) {
        event.preventDefault();
        event.stopPropagation();
        openBankAsSelector({ target: picker.dataset.extraTarget === 'combo' ? 'combo' : 'producto_comestible' });
        return;
      }
      if (event.target.closest('#prodExtrasCloseBtn, #prodExtrasOverlay')) exitSelectionMode();
    }, true);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const observer = new MutationObserver(function () {
      ensurePickButtons();
      ensureSelectControls();
      if (selectionMode) enterSelectionMode();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function schedule() {
    ensureSelectorAssets();
    setTimeout(function () { ensurePickButtons(); ensureSelectControls(); }, 80);
    setTimeout(function () { ensurePickButtons(); ensureSelectControls(); }, 240);
    setTimeout(function () { ensurePickButtons(); ensureSelectControls(); }, 520);
  }

  function init() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    bind();
    startObserver();
    schedule();
  }

  function ensureDirectScriptOnce(loaderId, src) {
    if (document.querySelector('script[data-loader="' + loaderId + '"]')) return Promise.resolve(true);
    if (Array.from(document.scripts).some(function (script) { return String(script.src || '').includes(src.replace('../', '/')); })) return Promise.resolve(true);

    return new Promise(function (resolve) {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute('data-loader', loaderId);
      script.onload = function () { resolve(true); };
      script.onerror = function () { resolve(false); };
      document.body.appendChild(script);
    });
  }

  function fireProductosPageLoadBridge() {
    try {
      document.dispatchEvent(new CustomEvent('sazzu:page:load', {
        detail: {
          url: location.href,
          file: (location.pathname.split('/').pop() || '').toLowerCase(),
          isPanel: location.pathname.toLowerCase().includes('/panel/'),
          source: 'productos-direct-refresh-bridge'
        }
      }));
    } catch (error) {
      console.warn('[productos-extras-selector.js] No se pudo emitir sazzu:page:load bridge:', error);
    }
  }

  function runProductosDirectRefreshBridge() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    if (body.dataset.productosDirectRefreshBridge === '1') return;
    body.dataset.productosDirectRefreshBridge = '1';

    ensureDirectScriptOnce('productos-extra-links-js', '../js/productos-extra-links.js');
    ensureDirectScriptOnce('productos-extras-editor-js', '../js/productos-extras-editor.js').then(function () {
      fireProductosPageLoadBridge();
    });

    [120, 360, 820, 1400].forEach(function (delay) {
      setTimeout(function () {
        if (typeof window.ProductosMount === 'function') window.ProductosMount();
        if (typeof window.ProductosSkuResumenMount === 'function') window.ProductosSkuResumenMount();
        if (typeof window.ProductosComestiblesMount === 'function') window.ProductosComestiblesMount();
        if (typeof window.ProductosCombosMount === 'function') window.ProductosCombosMount();
        if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') {
          window.ProductosExtrasSelector.ensurePickButtons();
        }
      }, delay);
    });
  }

  window.ProductosExtrasSelector = {
    open: openBankAsSelector,
    ensurePickButtons: ensurePickButtons,
    renderSelectedExtrasIntoBuilder: renderSelectedExtrasIntoBuilder,
    renderSelectedExtrasIntoComboBuilder: renderSelectedExtrasIntoComboBuilder
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', function () {
    init();
    setTimeout(runProductosDirectRefreshBridge, 90);
  });
  if (document.readyState === 'complete') {
    setTimeout(runProductosDirectRefreshBridge, 90);
  }
  window.addEventListener('productos:payload-ready', function () { setTimeout(ensurePickButtons, 200); });
})();
