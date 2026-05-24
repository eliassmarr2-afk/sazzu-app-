/*
  DEBUG TEMPORAL · Extras en Combos

  Objetivo:
  Diagnosticar por qué Editar combo → Añadir extras → Guardar no conserva combo_extras.

  No intercepta el guardado.
  No corta propagación.
  No toca loaders.
  No modifica productos comestibles.
*/
(function () {
  const COMBOS_KEY = 'sazzu_combos_payloads_local_v1';
  const DEBUG_ID = 'prodComboExtrasDebugPanel';

  function readCombos() {
    try {
      const parsed = JSON.parse(localStorage.getItem(COMBOS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
  }

  function getStoredCombo(comboId) {
    const id = String(comboId || '').trim();
    if (!id) return null;
    return readCombos().find(function (combo) {
      return String(combo.product_id || '') === id;
    }) || null;
  }

  function field(card, suffix) {
    const el = Array.from(card.querySelectorAll('input, select, textarea')).find(function (node) {
      const nodeId = String(node.id || '');
      return nodeId.indexOf('combo_extra_') === 0 && nodeId.endsWith('_' + suffix);
    });
    return el ? String(el.value || '').trim() : '';
  }

  function text(card, selector) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
  }

  function collectCardsDebug() {
    const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));

    return cards.map(function (card, index) {
      return {
        index: index,
        extra_source_id: card.dataset.extraSourceId || '',
        title: field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || '',
        extra_id: field(card, 'extra_id') || field(card, 'id') || '',
        price: field(card, 'precio') || '',
        hidden_inputs: card.querySelectorAll('input, select, textarea').length
      };
    });
  }

  function safeCount(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  function htmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensurePanel() {
    let panel = document.getElementById(DEBUG_ID);
    if (panel) return panel;

    panel = document.createElement('aside');
    panel.id = DEBUG_ID;
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:99999',
      'width:min(460px, calc(100vw - 36px))',
      'max-height:min(72vh, 620px)',
      'overflow:auto',
      'background:#0f172a',
      'color:#e5e7eb',
      'border:1px solid rgba(255,255,255,.18)',
      'box-shadow:0 24px 80px rgba(15,23,42,.38)',
      'border-radius:8px',
      'font-family:Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      'padding:14px'
    ].join(';');

    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel(title, data) {
    const panel = ensurePanel();
    panel.innerHTML = '' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">' +
        '<strong style="font-size:14px;color:#fff;">' + htmlEscape(title) + '</strong>' +
        '<button type="button" data-close-combo-debug="1" style="border:0;background:#1d4ed8;color:#fff;border-radius:6px;padding:6px 9px;font-weight:800;cursor:pointer;">Cerrar</button>' +
      '</div>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;margin:0;background:rgba(255,255,255,.06);border-radius:6px;padding:12px;font-size:12px;line-height:1.45;color:#d1d5db;">' + htmlEscape(JSON.stringify(data, null, 2)) + '</pre>';
  }

  function buildSnapshot(stage) {
    const comboId = currentComboId();
    const cards = collectCardsDebug();
    const stored = getStoredCombo(comboId);

    return {
      stage: stage,
      time: new Date().toISOString(),
      script_loaded: true,
      selector_available: !!(window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder === 'function'),
      payloads_available: !!(window.ProductosPayloads && typeof window.ProductosPayloads.buildComboPayload === 'function'),
      combo_id: comboId,
      visible_cards_detected: cards.length,
      visible_cards: cards,
      stored_combo_exists: !!stored,
      stored_combo_extras_count: stored ? safeCount(stored.combo_extras) : null,
      stored_optional_products_count: stored ? safeCount(stored.optional_products) : null,
      stored_combo_keys: stored ? Object.keys(stored) : [],
      last_combo_payload_extras_count: window.__lastComboPayload ? safeCount(window.__lastComboPayload.combo_extras) : null,
      last_combo_payload_id: window.__lastComboPayload ? window.__lastComboPayload.product_id : null
    };
  }

  function showDebug(stage) {
    const initial = buildSnapshot(stage + ' · antes');
    renderPanel('Debug Extras Combo · antes/después', initial);

    setTimeout(function () {
      const after120 = buildSnapshot(stage + ' · después 120ms');
      renderPanel('Debug Extras Combo · después 120ms', after120);
      window.__PRODUCTOS_COMBO_EXTRAS_DEBUG_LAST__ = after120;
    }, 120);

    setTimeout(function () {
      const after650 = buildSnapshot(stage + ' · después 650ms');
      renderPanel('Debug Extras Combo · después 650ms', after650);
      window.__PRODUCTOS_COMBO_EXTRAS_DEBUG_LAST__ = after650;
    }, 650);
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasDebugBound === '1') return;
    document.body.dataset.comboExtrasDebugBound = '1';

    window.addEventListener('click', function (event) {
      if (event.target && event.target.closest && event.target.closest('#prodComboSaveBtn')) {
        showDebug('click guardar combo');
      }

      if (event.target && event.target.closest && event.target.closest('[data-close-combo-debug]')) {
        const panel = document.getElementById(DEBUG_ID);
        if (panel) panel.remove();
      }
    }, true);

    window.ProductosComboExtrasDebug = {
      show: function () { showDebug('manual'); },
      snapshot: buildSnapshot
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
