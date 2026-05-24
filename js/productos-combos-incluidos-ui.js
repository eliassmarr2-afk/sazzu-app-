(function () {
  const STYLE_ID = 'productos-combos-incluidos-ui-css';
  const STORAGE_KEY = 'sazzu_combo_included_value_v1';
  let observerStarted = false;
  let rafPending = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] .main .prodComboSection--includedValueV2 .prodComboSection__head{
        border-bottom:0;
        margin-bottom:10px;
      }

      body[data-page="productos"] .main .prodComboSection--includedValueV2 .prodComboItems{
        gap:12px;
      }

      body[data-page="productos"] .main .prodComboIncludedCard{
        position:relative;
        display:grid;
        grid-template-columns:56px minmax(0,1fr) 38px;
        gap:14px;
        align-items:start;
        padding:14px;
        border:0 !important;
        border-radius:5px;
        background:#EAF8FF;
        box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07);
        transition:transform .16s ease,box-shadow .16s ease,background .16s ease,opacity .16s ease;
        cursor:pointer;
      }

      body[data-page="productos"] .main .prodComboIncludedCard:hover{
        transform:translateY(-1px);
        background:#E2F5FF;
        box-shadow:0 12px 28px rgba(15,23,42,.10),0 2px 6px rgba(15,23,42,.07);
      }

      body[data-page="productos"] .main .prodComboIncludedCard.is-removed{
        opacity:.74;
      }

      body[data-page="productos"] .main .prodComboIncludedCard .prodComboItem__image,
      body[data-page="productos"] .main .prodComboIncludedCard [data-combo-included-image-field="1"],
      body[data-page="productos"] .main .prodComboIncludedCard [id$="_img"],
      body[data-page="productos"] .main .prodComboIncludedCard label:has([id$="_img"]),
      body[data-page="productos"] .main .prodComboIncludedCard img:not(.prodComboIncludedSafeImage){
        display:none !important;
      }

      body[data-page="productos"] .main .prodComboSection--includedValueV2 .prodComboAdd,
      body[data-page="productos"] .main .prodComboSection--includedValueV2 [data-add-com-option],
      body[data-page="productos"] .main .prodComboSection--includedValueV2 [data-combo-add-included-option],
      body[data-page="productos"] .main .prodComboSection--includedValueV2 .prodComboIncludedActions,
      body[data-page="productos"] .main .prodComboSection--includedValueV2 .prodComboIncludedAddBtn,
      body[data-page="productos"] .main .prodComboSection--includedValueV2 button[data-combo-included-legacy-add="1"]{
        display:none !important;
      }

      body[data-page="productos"] .main .prodComboIncludedSwitch{
        width:48px;
        height:30px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:0;
        border:0;
        border-radius:999px;
        background:transparent !important;
        color:inherit;
        cursor:pointer;
      }

      body[data-page="productos"] .main .prodComboIncludedSwitch__track{
        position:relative;
        width:46px;
        height:26px;
        display:block;
        border-radius:999px;
        background:#CBD5E1;
        box-shadow:inset 0 1px 2px rgba(15,23,42,.18);
        transition:background .18s ease,box-shadow .18s ease;
      }

      body[data-page="productos"] .main .prodComboIncludedSwitch__knob{
        position:absolute;
        top:3px;
        left:3px;
        width:20px;
        height:20px;
        display:block;
        border-radius:999px;
        background:#fff;
        box-shadow:0 2px 6px rgba(15,23,42,.22);
        transition:transform .18s ease;
      }

      body[data-page="productos"] .main .prodComboIncludedCard.is-included .prodComboIncludedSwitch__track,
      body[data-page="productos"] .main .prodComboIncludedSwitch.is-on .prodComboIncludedSwitch__track{
        background:#2479FF;
        box-shadow:0 8px 18px rgba(36,121,255,.22),inset 0 1px 2px rgba(15,23,42,.12);
      }

      body[data-page="productos"] .main .prodComboIncludedCard.is-included .prodComboIncludedSwitch__knob,
      body[data-page="productos"] .main .prodComboIncludedSwitch.is-on .prodComboIncludedSwitch__knob{
        transform:translateX(20px);
      }

      body[data-page="productos"] .main .prodComboIncludedDelete{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        align-self:start;
        border:0;
        border-radius:5px;
        background:#FEE2E2;
        color:#B91C1C;
        cursor:pointer;
        transition:background .16s ease,transform .16s ease;
      }

      body[data-page="productos"] .main .prodComboIncludedDelete:hover{
        background:#FECACA;
        transform:translateY(-1px);
      }

      body[data-page="productos"] .main .prodComboIncludedDelete svg{
        width:17px;
        height:17px;
        display:block;
      }

      body[data-page="productos"] .main .prodComboIncludedCard .prodComboGrid--item{
        grid-template-columns:1.1fr .85fr minmax(220px,1.2fr);
        gap:10px 12px;
        align-items:end;
      }

      body[data-page="productos"] .main .prodComboIncludedCard .prodComboField span{
        color:#64748B;
      }

      body[data-page="productos"] .main .prodComboIncludedCard .prodComboField input,
      body[data-page="productos"] .main .prodComboIncludedCard .prodComboField select{
        background:#fff;
        border:1px solid rgba(148,163,184,.28);
        box-shadow:0 1px 1px rgba(15,23,42,.03);
      }

      body[data-page="productos"] .main .prodComboIncludedCard .prodComboField input:focus,
      body[data-page="productos"] .main .prodComboIncludedCard .prodComboField select:focus{
        outline:2px solid rgba(36,121,255,.28);
        border-color:#2479FF;
      }

      body[data-page="productos"] .main .prodComboIncludedEmpty{
        padding:14px;
        border-radius:5px;
        background:#F8FAFC;
        color:#64748B;
        font-size:13px;
        font-weight:700;
      }

      @media(max-width:980px){
        body[data-page="productos"] .main .prodComboIncludedCard{
          grid-template-columns:52px minmax(0,1fr) 38px;
        }
        body[data-page="productos"] .main .prodComboIncludedCard .prodComboGrid--item{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function switchHtml(isOn) {
    return '<span class="prodComboIncludedSwitch__track"><span class="prodComboIncludedSwitch__knob"></span></span><input type="hidden" data-combo-included-enabled-input="1" value="' + (isOn ? '1' : '0') + '">';
  }

  function field(label, id, value, type) {
    return '<label class="prodComboField"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(id) + '" type="' + escapeHtml(type || 'text') + '" value="' + escapeHtml(value || '') + '"></label>';
  }

  function visualSelect(id, value) {
    const current = String(value || '').toLowerCase() === 'oculto' ? 'Oculto' : 'Visible';
    return '<label class="prodComboField"><span>Estado visual</span><select id="' + escapeHtml(id) + '"><option value="Visible" ' + (current === 'Visible' ? 'selected' : '') + '>Visible</option><option value="Oculto" ' + (current === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>';
  }

  function staticText(id, value) {
    return '<label class="prodComboField"><span>Texto estático</span><input id="' + escapeHtml(id) + '" value="' + escapeHtml(value || 'Incluido en el combo original') + '" readonly></label>';
  }

  function buildIncludedCardInner(index, item) {
    const data = item || {};
    const isOn = data.incluido !== false;
    return '<button type="button" class="prodComboToggle prodComboIncludedSwitch ' + (isOn ? 'is-on' : 'is-off') + '" data-combo-included-toggle="1" aria-label="Activar o desactivar componente incluido" aria-pressed="' + (isOn ? 'true' : 'false') + '">' + switchHtml(isOn) + '</button>' +
      '<div class="prodComboGrid prodComboGrid--item">' +
        field('Nombre', 'combo_incluido_' + index + '_nombre', data.nombre || 'Nueva opción') +
        field('Cantidad', 'combo_incluido_' + index + '_cantidad', data.cantidad || '1 unidad') +
        field('Descripción', 'combo_incluido_' + index + '_desc', data.descripcion || 'Componente del pack base.') +
        visualSelect('combo_incluido_' + index + '_estado', data.estadoVisual || data.estado_visual || 'Visible') +
        staticText('combo_incluido_' + index + '_texto', data.texto || data.texto_estatico || 'Incluido en el combo original') +
      '</div>' +
      '<button type="button" class="prodComboIncludedDelete" data-combo-included-delete="1" aria-label="Eliminar componente incluido">' + trashIcon() + '</button>';
  }

  function findIncludedSection() {
    const sections = Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection'));
    return sections.find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').trim().toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').trim().toLowerCase();
      return eyebrow.includes('valor incluido') && title.includes('incluye');
    }) || null;
  }

  function fieldValueBySuffix(card, suffix) {
    const field = Array.from(card.querySelectorAll('input, select, textarea')).find(function (el) {
      return String(el.id || '').endsWith(suffix);
    });
    return field ? String(field.value || '').trim() : '';
  }

  function fieldValueByLabel(card, pattern) {
    const label = Array.from(card.querySelectorAll('label')).find(function (item) {
      return pattern.test(String(item.textContent || ''));
    });
    const field = label ? label.querySelector('input, select, textarea') : null;
    return field ? String(field.value || '').trim() : '';
  }

  function cardIndex(card) {
    const field = card.querySelector('input[id^="combo_incluido_"], select[id^="combo_incluido_"], textarea[id^="combo_incluido_"]');
    const match = field && String(field.id || '').match(/^combo_incluido_(\d+)_/);
    if (match) return Number(match[1]);
    const list = card.closest('.prodComboItems');
    return list ? Array.from(list.querySelectorAll('.prodComboItem, [data-combo-included-card]')).indexOf(card) : 0;
  }

  function extractCardData(card) {
    const estadoRaw = fieldValueBySuffix(card, '_estado') || fieldValueByLabel(card, /estado visual/i);
    const enabled = String(card.dataset.includedEnabled || '').trim();
    const isOn = enabled ? enabled === '1' : (card.classList.contains('is-included') || !card.classList.contains('is-removed'));
    return {
      key: card.dataset.comboIncludedKey || ('included_' + Date.now()),
      nombre: fieldValueBySuffix(card, '_nombre') || fieldValueByLabel(card, /nombre/i) || 'Nueva opción',
      cantidad: fieldValueBySuffix(card, '_cantidad') || fieldValueByLabel(card, /cantidad/i) || '1 unidad',
      descripcion: fieldValueBySuffix(card, '_desc') || fieldValueByLabel(card, /descripción/i) || 'Componente del pack base.',
      estadoVisual: String(estadoRaw || '').toLowerCase() === 'oculto' ? 'Oculto' : 'Visible',
      texto: fieldValueBySuffix(card, '_texto') || fieldValueByLabel(card, /texto estático/i) || 'Incluido en el combo original',
      incluido: isOn
    };
  }

  function removeLegacyVisuals(card) {
    const image = card.querySelector('.prodComboItem__image');
    if (image) image.remove();

    Array.from(card.querySelectorAll('.prodComboField, label')).forEach(function (label) {
      const txt = String(label.textContent || '').toLowerCase();
      if (txt.includes('imagen 4x4')) label.remove();
    });

    Array.from(card.querySelectorAll('img, picture, figure')).forEach(function (node) {
      if (node.closest('.prodComboIncludedDelete') || node.closest('.prodComboIncludedSwitch')) return;
      node.remove();
    });

    Array.from(card.querySelectorAll('button')).forEach(function (button) {
      if (button.matches('[data-combo-included-toggle], [data-combo-included-delete]')) return;
      const text = String(button.textContent || '').trim().toLowerCase();
      if (button.querySelector('img') || text.includes('🗑') || text.includes('borrar') || text.includes('eliminar') || text.includes('trash')) button.remove();
    });
  }

  function normalizeEstadoSelect(card) {
    const select = Array.from(card.querySelectorAll('select')).find(function (item) {
      const label = item.closest('label');
      return label && /estado visual/i.test(label.textContent || '');
    });
    if (!select || select.dataset.visualNormalized === '1') return;
    const currentRaw = String(select.value || '').trim().toLowerCase();
    const current = currentRaw === 'oculto' ? 'Oculto' : 'Visible';
    select.innerHTML = '<option value="Visible">Visible</option><option value="Oculto">Oculto</option>';
    select.value = current;
    select.dataset.visualNormalized = '1';
    card.dataset.visualState = current;
  }

  function normalizeCard(card) {
    if (!card) return;
    if (card.dataset.comboIncludedEnhanced !== '1') {
      const index = cardIndex(card);
      const data = extractCardData(card);
      card.className = 'prodComboItem prodComboIncludedCard ' + (data.incluido ? 'is-included' : 'is-removed');
      card.dataset.comboIncludedCard = '1';
      card.dataset.comboIncludedEnhanced = '1';
      card.dataset.comboIncludedKey = data.key;
      card.dataset.includedEnabled = data.incluido ? '1' : '0';
      card.dataset.visualState = data.estadoVisual;
      card.innerHTML = buildIncludedCardInner(index, data);
      return;
    }
    removeLegacyVisuals(card);
    normalizeEstadoSelect(card);
  }

  function syncCardToggleState(card, isOn) {
    if (!card) return;
    const toggle = card.querySelector('[data-combo-included-toggle]');
    const hidden = toggle ? toggle.querySelector('[data-combo-included-enabled-input]') : null;
    card.classList.toggle('is-included', !!isOn);
    card.classList.toggle('is-removed', !isOn);
    card.dataset.includedEnabled = isOn ? '1' : '0';
    if (toggle) {
      toggle.classList.toggle('is-on', !!isOn);
      toggle.classList.toggle('is-off', !isOn);
      toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }
    if (hidden) hidden.value = isOn ? '1' : '0';
  }

  function removeManualAddControls(section) {
    if (!section) return;
    Array.from(section.querySelectorAll('.prodComboIncludedActions')).forEach(function (node) { node.remove(); });
    Array.from(section.querySelectorAll('button')).forEach(function (button) {
      const text = String(button.textContent || '').trim().toLowerCase();
      if (text.includes('agregar opción') || button.matches('[data-combo-add-included-option], [data-add-com-option]')) {
        button.dataset.comboIncludedLegacyAdd = '1';
        button.remove();
      }
    });
  }

  function enhanceIncludedSection() {
    injectStyles();
    const section = findIncludedSection();
    if (!section) return;
    const list = section.querySelector('.prodComboItems');
    if (!list) return;

    section.classList.add('prodComboSection--includedValueV2');
    list.classList.add('prodComboIncludedList');
    Array.from(list.querySelectorAll('.prodComboItem, [data-combo-included-card]')).forEach(normalizeCard);
    removeManualAddControls(section);
  }

  function scheduleEnhance() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      enhanceIncludedSection();
    });
  }

  function deleteIncludedOption(card) {
    if (!card) return;
    const list = card.closest('.prodComboItems');
    card.remove();
    if (list && !list.querySelector('[data-combo-included-card], .prodComboItem')) {
      list.innerHTML = '<div class="prodComboIncludedEmpty">Sin componentes incluidos. Agregá componentes desde la estructura real del combo, no desde opciones manuales libres.</div>';
    }
    persistIncludedItems();
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset.comboId ? slide.dataset.comboId : 'combo-borrador').trim();
  }

  function collectIncludedItems() {
    const section = findIncludedSection();
    const list = section ? section.querySelector('.prodComboItems') : null;
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-combo-included-card], .prodComboItem')).map(function (card, index) {
      if (!card.dataset.comboIncludedCard) normalizeCard(card);
      const fields = Array.from(card.querySelectorAll('input, select, textarea'));
      const bySuffix = function (suffix) {
        const field = fields.find(function (el) { return String(el.id || '').endsWith(suffix); });
        return field ? String(field.value || '').trim() : '';
      };
      const estadoVisual = bySuffix('_estado') || 'Visible';
      const incluido = String(card.dataset.includedEnabled || '1') === '1';
      return {
        landing_section: 'valor_incluido',
        render_target: 'Incluye este combo',
        orden: index + 1,
        nombre: bySuffix('_nombre'),
        cantidad: bySuffix('_cantidad'),
        descripcion: bySuffix('_desc'),
        incluido: incluido,
        estado_visual: estadoVisual,
        visible: estadoVisual === 'Visible',
        show_on_landing: estadoVisual === 'Visible',
        texto_estatico: bySuffix('_texto') || 'Incluido en el combo original'
      };
    }).filter(function (item) {
      return item.nombre || item.cantidad || item.descripcion;
    });
  }

  function buildIncludedPayload() {
    return {
      combo_id: currentComboId(),
      section_key: 'valor_incluido',
      section_title: 'Incluye este combo',
      source: 'prodComboSlide',
      creation_mode: 'fixed_existing_components_only',
      manual_creation_enabled: false,
      items: collectIncludedItems(),
      updated_at: new Date().toISOString()
    };
  }

  function persistIncludedItems() {
    const payload = buildIncludedPayload();
    window.__PRODUCTOS_COMBO_INCLUDED_LAST__ = payload.items;
    window.__PRODUCTOS_COMBO_INCLUDED_PAYLOAD__ = payload;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('[productos-combos-incluidos-ui.js] No se pudo guardar payload local:', error);
    }
    return payload;
  }

  function bind() {
    if (document.body.dataset.productosCombosIncluidosUiBound === '1') return;
    document.body.dataset.productosCombosIncluidosUiBound = '1';

    document.addEventListener('click', function (event) {
      const addBtn = event.target.closest('[data-combo-add-included-option], [data-add-com-option]');
      if (addBtn && addBtn.closest('.prodComboSection--includedValueV2')) {
        event.preventDefault();
        event.stopPropagation();
        const wrap = addBtn.closest('.prodComboIncludedActions');
        if (wrap) wrap.remove();
        else addBtn.remove();
        return;
      }

      const deleteBtn = event.target.closest('[data-combo-included-delete]');
      if (deleteBtn) {
        event.preventDefault();
        event.stopPropagation();
        deleteIncludedOption(deleteBtn.closest('[data-combo-included-card]'));
        return;
      }

      const toggle = event.target.closest('[data-combo-included-toggle]');
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        const card = toggle.closest('[data-combo-included-card]');
        const next = !(card && String(card.dataset.includedEnabled || '1') === '1');
        syncCardToggleState(card, next);
        persistIncludedItems();
      }
    }, true);

    document.addEventListener('change', function (event) {
      const card = event.target.closest('[data-combo-included-card]');
      if (!card) return;
      if (event.target.matches('select')) {
        const label = event.target.closest('label');
        if (label && /estado visual/i.test(label.textContent || '')) {
          card.dataset.visualState = String(event.target.value || 'Visible');
        }
      }
      persistIncludedItems();
    }, true);

    document.addEventListener('input', function (event) {
      if (!event.target.closest('[data-combo-included-card]')) return;
      persistIncludedItems();
    }, true);

    document.addEventListener('click', function (event) {
      const saveBtn = event.target.closest('#prodComboSaveBtn');
      if (!saveBtn) return;
      const payload = persistIncludedItems();
      console.log('[productos-combos-incluidos-ui.js] Valor incluido preparado:', payload);
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

  window.ProductosCombosIncluidosUi = {
    refresh: enhanceIncludedSection,
    collect: collectIncludedItems,
    payload: buildIncludedPayload,
    persist: persistIncludedItems
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();