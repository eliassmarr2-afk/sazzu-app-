(function () {
  const STYLE_ID = 'productos-combos-incluidos-ui-css';
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
      body[data-page="productos"] .main .prodComboIncludedCard [data-combo-included-image-field="1"]{
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

      body[data-page="productos"] .main .prodComboIncludedActions{
        display:flex;
        justify-content:flex-start;
        margin-top:12px;
      }

      body[data-page="productos"] .main .prodComboIncludedAddBtn{
        min-height:38px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:0 14px;
        border:0;
        border-radius:5px;
        background:#EAF2FF;
        color:#2479FF;
        font-family:inherit;
        font-size:13px;
        font-weight:950;
        cursor:pointer;
        transition:background .16s ease,transform .16s ease;
      }

      body[data-page="productos"] .main .prodComboIncludedAddBtn:hover{
        background:#DCEBFF;
        transform:translateY(-1px);
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

  function buildIncludedCard(index, data) {
    const item = data || {};
    const key = item.key || ('custom_' + Date.now());
    const isOn = item.incluido !== false;
    return '<article class="prodComboItem prodComboIncludedCard ' + (isOn ? 'is-included' : 'is-removed') + '" data-combo-included-card="1" data-combo-included-enhanced="1" data-combo-included-key="' + escapeHtml(key) + '">' +
      '<button type="button" class="prodComboToggle prodComboIncludedSwitch ' + (isOn ? 'is-on' : 'is-off') + '" data-combo-included-toggle="1" aria-label="Activar o desactivar componente incluido" aria-pressed="' + (isOn ? 'true' : 'false') + '">' + switchHtml(isOn) + '</button>' +
      '<div class="prodComboGrid prodComboGrid--item">' +
        field('Nombre', 'combo_incluido_' + index + '_nombre', item.nombre || 'Nueva opción') +
        field('Cantidad', 'combo_incluido_' + index + '_cantidad', item.cantidad || '1 unidad') +
        field('Descripción', 'combo_incluido_' + index + '_desc', item.descripcion || 'Componente del pack base.') +
        visualSelect('combo_incluido_' + index + '_estado', item.estadoVisual || 'Visible') +
        staticText('combo_incluido_' + index + '_texto', item.texto || 'Incluido en el combo original') +
      '</div>' +
      '<button type="button" class="prodComboIncludedDelete" data-combo-included-delete="1" aria-label="Eliminar componente incluido">' + trashIcon() + '</button>' +
    '</article>';
  }

  function findIncludedSection() {
    const sections = Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection'));
    return sections.find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').trim().toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').trim().toLowerCase();
      return eyebrow.includes('valor incluido') && title.includes('incluye');
    }) || null;
  }

  function findEstadoSelect(card) {
    return Array.from(card.querySelectorAll('select')).find(function (select) {
      const label = select.closest('label');
      return label && /estado visual/i.test(label.textContent || '');
    }) || null;
  }

  function removeImageField(card) {
    const image = card.querySelector('.prodComboItem__image');
    if (image) image.remove();

    Array.from(card.querySelectorAll('.prodComboField')).forEach(function (label) {
      const txt = String(label.textContent || '').toLowerCase();
      if (txt.includes('imagen 4x4')) {
        label.dataset.comboIncludedImageField = '1';
        label.remove();
      }
    });
  }

  function ensureDeleteButton(card) {
    if (card.querySelector('[data-combo-included-delete]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodComboIncludedDelete';
    btn.dataset.comboIncludedDelete = '1';
    btn.setAttribute('aria-label', 'Eliminar componente incluido');
    btn.innerHTML = trashIcon();
    card.appendChild(btn);
  }

  function normalizeEstadoSelect(card) {
    const select = findEstadoSelect(card);
    if (!select || select.dataset.visualNormalized === '1') return;
    const currentRaw = String(select.value || '').trim().toLowerCase();
    const current = currentRaw === 'oculto' ? 'Oculto' : 'Visible';
    select.innerHTML = '<option value="Visible">Visible</option><option value="Oculto">Oculto</option>';
    select.value = current;
    select.dataset.visualNormalized = '1';
    card.dataset.visualState = current;
  }

  function enhanceToggle(card) {
    let toggle = card.querySelector('.prodComboToggle');
    const isOn = card.classList.contains('is-included') || !card.classList.contains('is-removed');

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      card.prepend(toggle);
    }

    toggle.className = 'prodComboToggle prodComboIncludedSwitch ' + (isOn ? 'is-on' : 'is-off');
    toggle.dataset.comboIncludedToggle = '1';
    toggle.setAttribute('aria-label', 'Activar o desactivar componente incluido');
    toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    toggle.innerHTML = switchHtml(isOn);
    syncCardToggleState(card, isOn);
  }

  function syncCardToggleState(card, isOn) {
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

  function enhanceCard(card) {
    if (!card || card.dataset.comboIncludedEnhanced === '1') return;
    card.dataset.comboIncludedEnhanced = '1';
    card.dataset.comboIncludedCard = '1';
    card.classList.add('prodComboIncludedCard');
    removeImageField(card);
    enhanceToggle(card);
    normalizeEstadoSelect(card);
    ensureDeleteButton(card);
  }

  function ensureAddButton(section, list) {
    if (!section || !list) return;
    if (section.querySelector('[data-combo-add-included-option]')) return;
    const actions = document.createElement('div');
    actions.className = 'prodComboIncludedActions';
    actions.innerHTML = '<button type="button" class="prodComboIncludedAddBtn" data-combo-add-included-option="1">+ Agregar opción</button>';
    list.insertAdjacentElement('afterend', actions);
  }

  function nextIndex(list) {
    const ids = Array.from(list.querySelectorAll('input[id^="combo_incluido_"]'))
      .map(function (input) {
        const match = String(input.id || '').match(/^combo_incluido_(\d+)_/);
        return match ? Number(match[1]) : -1;
      })
      .filter(function (n) { return n >= 0; });
    return ids.length ? Math.max.apply(Math, ids) + 1 : list.querySelectorAll('[data-combo-included-card]').length;
  }

  function enhanceIncludedSection() {
    injectStyles();
    const section = findIncludedSection();
    if (!section) return;
    const list = section.querySelector('.prodComboItems');
    if (!list) return;

    section.classList.add('prodComboSection--includedValueV2');
    list.classList.add('prodComboIncludedList');
    Array.from(list.querySelectorAll('.prodComboItem')).forEach(enhanceCard);
    ensureAddButton(section, list);
  }

  function scheduleEnhance() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      enhanceIncludedSection();
    });
  }

  function addIncludedOption() {
    const section = findIncludedSection();
    const list = section ? section.querySelector('.prodComboItems') : null;
    if (!list) return;

    const empty = list.querySelector('.prodComboIncludedEmpty');
    if (empty) empty.remove();

    const index = nextIndex(list);
    list.insertAdjacentHTML('beforeend', buildIncludedCard(index, {
      key: 'manual_' + Date.now(),
      nombre: 'Nueva opción',
      cantidad: '1 unidad',
      descripcion: 'Componente del pack base.',
      estadoVisual: 'Visible',
      incluido: true
    }));
    enhanceIncludedSection();
  }

  function deleteIncludedOption(card) {
    if (!card) return;
    const list = card.closest('.prodComboItems');
    card.remove();
    if (list && !list.querySelector('[data-combo-included-card], .prodComboItem')) {
      list.innerHTML = '<div class="prodComboIncludedEmpty">Sin componentes incluidos. Agregá una opción para reconstruir el valor incluido del combo.</div>';
    }
  }

  function collectIncludedItems() {
    const section = findIncludedSection();
    const list = section ? section.querySelector('.prodComboItems') : null;
    if (!list) return [];
    return Array.from(list.querySelectorAll('[data-combo-included-card]')).map(function (card, index) {
      const fields = Array.from(card.querySelectorAll('input, select, textarea'));
      const bySuffix = function (suffix) {
        const field = fields.find(function (el) { return String(el.id || '').endsWith(suffix); });
        return field ? String(field.value || '').trim() : '';
      };
      return {
        index: index,
        nombre: bySuffix('_nombre'),
        cantidad: bySuffix('_cantidad'),
        descripcion: bySuffix('_desc'),
        incluido: String(card.dataset.includedEnabled || '1') === '1',
        estado_visual: bySuffix('_estado') || 'Visible',
        texto_estatico: bySuffix('_texto') || 'Incluido en el combo original'
      };
    });
  }

  function bind() {
    if (document.body.dataset.productosCombosIncluidosUiBound === '1') return;
    document.body.dataset.productosCombosIncluidosUiBound = '1';

    document.addEventListener('click', function (event) {
      const addBtn = event.target.closest('[data-combo-add-included-option]');
      if (addBtn) {
        event.preventDefault();
        event.stopPropagation();
        addIncludedOption();
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
    }, true);

    document.addEventListener('click', function (event) {
      const saveBtn = event.target.closest('#prodComboSaveBtn');
      if (!saveBtn) return;
      window.__PRODUCTOS_COMBO_INCLUDED_LAST__ = collectIncludedItems();
      console.log('[productos-combos-incluidos-ui.js] Valor incluido preparado:', window.__PRODUCTOS_COMBO_INCLUDED_LAST__);
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
    collect: collectIncludedItems
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', init);
  window.addEventListener('load', init);
})();
