(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';
  let selectionMode = false;
  let selectedIds = new Set();
  let selectedExtras = new Map();
  let observerStarted = false;

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

  function normalizeExtra(extra) {
    const data = extra || {};
    return {
      id: String(data.id || ('extra-seleccionado-' + Date.now())).trim(),
      title: String(data.title || data.nombre || 'Extra').trim(),
      description: String(data.description || data.descripcion || '').trim(),
      price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : 0)) || 0,
      status: String(data.status || data.estado || 'Activo').trim(),
      badge: String(data.badge || '').trim(),
      folder: String(data.folder || data.carpeta || '').trim(),
      tags: String(data.tags || data.etiquetas || '').trim(),
      image: String(data.image || data.imagen || '').trim()
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

    const card = document.querySelector('#prodExtrasGrid .prodExtraCard[data-extra-id="' + CSS.escape(id) + '"]');
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

  function updateSmallPreview(card, image) {
    if (!card) return;
    const preview = card.querySelector('.prodComOption__visual');
    if (!preview) return;
    preview.innerHTML = image ? '<img src="' + escapeHtml(image) + '" alt="">' : '<span>4×4</span>';
  }

  function getIndexFromCard(card) {
    const input = card && card.querySelector('[id^="extras_"][id$="_nombre"]');
    if (!input) return null;
    const match = input.id.match(/^extras_(\d+)_nombre$/);
    return match ? Number(match[1]) : null;
  }

  function fillExtraCard(card, extra) {
    if (!card || !extra) return;
    const data = normalizeExtra(extra);
    const index = getIndexFromCard(card);
    if (index == null) return;

    setInput('extras_' + index + '_nombre', data.title || 'Extra');
    setInput('extras_' + index + '_desc', data.description || '');
    setInput('extras_' + index + '_precio', data.price || 0);
    setInput('extras_' + index + '_estado', data.status || 'Activo');
    setInput('extras_' + index + '_badge', data.badge || 'Banco de extras');
    setInput('extras_' + index + '_img', data.image || '');

    card.dataset.extraSourceId = data.id || '';
    card.dataset.extraFolder = data.folder || '';
    card.dataset.extraTags = data.tags || '';
    updateSmallPreview(card, data.image || '');
  }

  function selectedExtraHiddenFields(extra, index) {
    const data = normalizeExtra(extra);
    return [
      ['nombre', data.title],
      ['desc', data.description],
      ['precio', data.price],
      ['estado', data.status],
      ['badge', data.badge],
      ['img', data.image],
      ['folder', data.folder],
      ['tags', data.tags]
    ].map(function (pair) {
      return '<input type="hidden" id="extras_' + index + '_' + escapeHtml(pair[0]) + '" value="' + escapeHtml(pair[1]) + '">';
    }).join('');
  }

  function selectedExtraCardHtml(extra, index) {
    const data = normalizeExtra(extra);
    const imageHtml = data.image
      ? '<img src="' + escapeHtml(data.image) + '" alt="">'
      : '<span>4×4</span>';
    const badgeHtml = data.badge
      ? '<span class="prodComSelectedExtraCard__badge">' + escapeHtml(data.badge) + '</span>'
      : '<span class="prodComSelectedExtraCard__badge prodComSelectedExtraCard__badge--soft">Banco de extras</span>';

    return '' +
      '<article class="prodComOption prodComSelectedExtraCard" data-option-key="extras" data-extra-source-id="' + escapeHtml(data.id) + '" data-extra-folder="' + escapeHtml(data.folder) + '" data-extra-tags="' + escapeHtml(data.tags) + '">' +
        '<div class="prodComSelectedExtraCard__image">' + imageHtml + '</div>' +
        '<div class="prodComSelectedExtraCard__body">' +
          '<strong>' + escapeHtml(data.title) + '</strong>' +
          '<span>' + escapeHtml(data.description || 'Extra agregado al producto.') + '</span>' +
        '</div>' +
        '<div class="prodComSelectedExtraCard__meta">' +
          badgeHtml +
          '<b>' + escapeHtml(money(data.price)) + '</b>' +
        '</div>' +
        selectedExtraHiddenFields(data, index) +
      '</article>';
  }

  function renderSelectedExtrasIntoBuilder(extras) {
    const list = document.querySelector('.prodComOptions[data-options-key="extras"]');
    if (!list) return false;

    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (item) { return item && item.id && item.title; });

    if (!normalized.length) return false;

    list.classList.add('prodComOptions--selectedExtras');
    list.innerHTML = normalized.map(selectedExtraCardHtml).join('');
    list.dataset.selectedExtrasCount = String(normalized.length);

    const extrasSection = list.closest('[data-prod-com-section="extras"]');
    if (extrasSection) {
      extrasSection.dataset.selectedExtrasCount = String(normalized.length);
    }

    const first = list.querySelector('.prodComSelectedExtraCard');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  function createEmptyExtraCard() {
    const list = document.querySelector('.prodComOptions[data-options-key="extras"]');
    const add = document.querySelector('[data-add-com-option="extras"]');
    if (!list || !add) return null;
    add.click();
    return list.querySelector('.prodComOption:last-child');
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
      if (/Abrir banco de extras/i.test(btn.textContent || '')) {
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.classList.add('prodComBankPick');
        btn.dataset.openExtraBank = 'append';
        btn.textContent = 'Abrir Banco de extras';
      }
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
      label.textContent = 'Modo selección activo: marcá extras y confirmá para traerlos al producto.';
      headerText.insertAdjacentElement('afterend', label);
    }
  }

  function openBankAsSelector() {
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
    const slide = document.getElementById('prodExtrasSlide');
    if (slide) slide.classList.remove('is-selecting');
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

    const extras = ids
      .map(getSelectedExtraById)
      .filter(Boolean)
      .map(normalizeExtra);

    if (!extras.length) return;

    const rendered = renderSelectedExtrasIntoBuilder(extras);

    if (!rendered) {
      extras.forEach(function (extra) {
        const card = createEmptyExtraCard();
        fillExtraCard(card, extra);
      });
    }

    const close = document.getElementById('prodExtrasCloseBtn');
    if (close) close.click();
    exitSelectionMode();
    setTimeout(ensurePickButtons, 120);
  }

  function interceptSelectionClicks(event) {
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
        openBankAsSelector();
        return;
      }

      if (event.target.closest('#prodExtrasCloseBtn, #prodExtrasOverlay')) {
        exitSelectionMode();
      }
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

  window.ProductosExtrasSelector = {
    open: openBankAsSelector,
    ensurePickButtons: ensurePickButtons,
    renderSelectedExtrasIntoBuilder: renderSelectedExtrasIntoBuilder
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
  window.addEventListener('productos:payload-ready', function () { setTimeout(ensurePickButtons, 200); });
})();
