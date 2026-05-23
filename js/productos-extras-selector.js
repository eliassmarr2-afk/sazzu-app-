(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';
  let selectionMode = false;
  let selectedIds = new Set();
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
    const index = getIndexFromCard(card);
    if (index == null) return;

    setInput('extras_' + index + '_nombre', extra.title || 'Extra');
    setInput('extras_' + index + '_desc', extra.description || '');
    setInput('extras_' + index + '_precio', extra.price || 0);
    setInput('extras_' + index + '_estado', extra.status || 'Activo');
    setInput('extras_' + index + '_badge', extra.badge || 'Banco de extras');
    setInput('extras_' + index + '_img', extra.image || '');

    card.dataset.extraSourceId = extra.id || '';
    card.dataset.extraFolder = extra.folder || '';
    card.dataset.extraTags = extra.tags || '';
    updateSmallPreview(card, extra.image || '');
  }

  function createEmptyExtraCard() {
    const list = document.querySelector('.prodComOptions[data-options-key="extras"]');
    const add = document.querySelector('[data-add-com-option="extras"]');
    if (!list || !add) return null;
    add.click();
    return list.querySelector('.prodComOption:last-child');
  }

  function ensurePickButtons() {
    document.querySelectorAll('.prodComOptions[data-options-key="extras"] [data-open-extra-bank="slot"]').forEach(function (btn) {
      btn.remove();
    });

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
    const launcher = document.getElementById('prodExtrasLauncherBtn');
    if (launcher) launcher.click();
    setTimeout(enterSelectionMode, 120);
    setTimeout(enterSelectionMode, 320);
  }

  function enterSelectionMode() {
    const slide = document.getElementById('prodExtrasSlide');
    if (!slide) return;
    selectionMode = true;
    ensureSelectControls();
    slide.classList.add('is-selecting');
    document.querySelectorAll('#prodExtrasGrid .prodExtraCard').forEach(function (card) {
      card.classList.add('is-selectable');
      card.classList.remove('is-selected');
    });
    updateConfirmLabel();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds = new Set();
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
      card.classList.remove('is-selected');
    } else {
      selectedIds.add(id);
      card.classList.add('is-selected');
    }
    updateConfirmLabel();
  }

  function applySelectedExtras() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    ids.forEach(function (id) {
      const extra = getExtra(id);
      if (!extra) return;
      const card = createEmptyExtraCard();
      fillExtraCard(card, extra);
    });

    const close = document.getElementById('prodExtrasCloseBtn');
    if (close) close.click();
    exitSelectionMode();
    setTimeout(ensurePickButtons, 120);
  }

  function bind() {
    if (document.body.dataset.productosExtrasSelectorBound === '1') return;
    document.body.dataset.productosExtrasSelectorBound = '1';

    document.addEventListener('click', function (event) {
      const picker = event.target.closest('[data-open-extra-bank]');
      if (picker) {
        event.preventDefault();
        event.stopPropagation();
        openBankAsSelector();
        return;
      }

      const card = event.target.closest('#prodExtrasSlide.is-selecting #prodExtrasGrid .prodExtraCard');
      if (card && selectionMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleExtra(card);
        return;
      }

      const confirm = event.target.closest('#prodExtrasSelectConfirm');
      if (confirm && selectionMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        applySelectedExtras();
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
    ensurePickButtons: ensurePickButtons
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
  window.addEventListener('productos:payload-ready', function () { setTimeout(ensurePickButtons, 200); });
})();
