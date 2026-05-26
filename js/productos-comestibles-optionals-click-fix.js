/* FASE 1 FIX · Producto Comestible: click del selector de agregados opcionales */
(function () {
  const PRODUCTS_KEY = 'sazzu_productos_comestibles_v1';
  const COMBOS_KEY = 'sazzu_productos_combos_v1';
  const LOCAL_PRODUCTS_KEY = 'sazzu_productos_payloads_local_v1';
  const LOCAL_COMBOS_KEY = 'sazzu_combos_payloads_local_v1';
  let selected = new Set();

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function money(v) {
    return '$ ' + Number(v || 0).toLocaleString('es-AR');
  }

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function slugify(value) {
    return String(value || 'producto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
  }

  function currentProductId() {
    const slide = document.getElementById('prodComSlide');
    return String(slide && slide.dataset ? slide.dataset.productId || '' : '').trim();
  }

  function section() {
    return document.querySelector('#prodComSlideBody [data-prod-com-section="recomendados"]');
  }

  function list() {
    const s = section();
    return s ? s.querySelector('.prodComOptions[data-options-key="recomendados"]') : null;
  }

  function normalize(item, type) {
    const data = item || {};
    const identity = data.identity || {};
    const imgs = Array.isArray(data.imagenes) ? data.imagenes : [];
    const images = Array.isArray(data.images) ? data.images : [];
    const isCombo = String(type || data.product_type || '').toLowerCase().includes('combo') || data.combo === true;
    const name = String(data.nombre || data.name || data.title || identity.name || identity.nombre || 'Producto').trim();
    const id = String(data.product_id || data.combo_id || data.id || identity.id || slugify(name)).trim();
    return {
      id,
      nombre: name,
      categoria: String(data.categoria || data.category || identity.category || identity.categoria || (isCombo ? 'Combo' : 'Producto')).trim(),
      precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : (identity.base_price || data.base_price || 0))) || 0,
      imagen: String(data.imagen || data.image || data.primary_image_url || imgs[0] || (images[0] && images[0].image_url) || '').trim(),
      tipo: isCombo ? 'Combo' : 'Producto'
    };
  }

  function candidates() {
    const map = new Map();
    const active = currentProductId();
    function add(item, type) {
      const p = normalize(item, type);
      if (!p.id || !p.nombre || (active && p.id === active)) return;
      map.set(p.id, Object.assign({}, map.get(p.id) || {}, p));
    }
    readArray(PRODUCTS_KEY).forEach(x => add(x, 'producto'));
    readArray(LOCAL_PRODUCTS_KEY).forEach(x => add(x, 'producto'));
    readArray(COMBOS_KEY).forEach(x => add(x, 'combo'));
    readArray(LOCAL_COMBOS_KEY).forEach(x => add(x, 'combo'));
    return Array.from(map.values());
  }

  function currentSelectedIds() {
    const l = list();
    if (!l) return new Set();
    return new Set(Array.from(l.querySelectorAll('[data-prod-com-optionals-card]')).map(card => String(card.dataset.productId || '')).filter(Boolean));
  }

  function ensurePicker() {
    const s = section();
    if (!s) return null;
    let picker = s.querySelector('[data-prod-com-optionals-picker]');
    if (picker) return picker;
    picker = document.createElement('div');
    picker.className = 'prodComOptionalStageAPicker';
    picker.dataset.prodComOptionalsPicker = '1';
    picker.innerHTML = '<div class="prodComOptionalStageAPickerHead"><div><strong>Seleccionar productos existentes</strong><span>Elegí productos o combos ya creados para ofrecerlos como agregados opcionales.</span></div><button type="button" class="prodComOptionalStageAClose" data-prod-com-optionals-close="1">×</button></div><input type="search" class="prodComOptionalStageASearch" data-prod-com-optionals-search="1" placeholder="Buscar producto o combo..."><div class="prodComOptionalStageAGrid" data-prod-com-optionals-grid="1"></div><div class="prodComOptionalStageAPickerActions"><button type="button" class="prodComOptionalStageAConfirm" data-prod-com-optionals-confirm="1">Agregar seleccionados</button></div>';
    s.appendChild(picker);
    return picker;
  }

  function renderPicker(q) {
    const picker = ensurePicker();
    const grid = picker && picker.querySelector('[data-prod-com-optionals-grid]');
    if (!grid) return;
    const term = String(q || '').toLowerCase().trim();
    const already = currentSelectedIds();
    const rows = candidates().filter(p => !already.has(p.id) && (!term || [p.nombre, p.categoria, p.tipo].join(' ').toLowerCase().includes(term)));
    grid.innerHTML = rows.length ? rows.map(p => '<button type="button" class="prodComOptionalStageAPick ' + (selected.has(p.id) ? 'is-selected' : '') + '" data-prod-com-optionals-pick="1" data-product-id="' + esc(p.id) + '"><div class="prodComOptionalStageAPickImage">' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="">' : '<span>IMG</span>') + '</div><div><strong>' + esc(p.nombre) + '</strong><span>' + esc(p.tipo) + ' · ' + esc(p.categoria) + '</span></div><b>+ ' + esc(money(p.precio)) + '</b></button>').join('') : '<div class="prodComOptionalStageAEmpty"><strong>No hay productos disponibles</strong><span>No hay más productos o combos para seleccionar.</span></div>';
  }

  function openPicker() {
    const picker = ensurePicker();
    if (!picker) return;
    selected = new Set();
    picker.classList.add('is-active');
    const search = picker.querySelector('[data-prod-com-optionals-search]');
    if (search) search.value = '';
    renderPicker('');
    setTimeout(() => picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30);
  }

  function closePicker() {
    const picker = document.querySelector('[data-prod-com-optionals-picker]');
    if (picker) picker.classList.remove('is-active');
    selected = new Set();
  }

  function cardHtml(p, index) {
    return '<article class="prodComOption prodComOptionalStageACard" data-prod-com-optionals-card="1" data-option-key="recomendados" data-product-id="' + esc(p.id) + '"><div class="prodComOptionalStageAImage">' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="">' : '<span>IMG</span>') + '</div><div class="prodComOptionalStageABody"><div class="prodComOptionalStageAHead"><div><strong>' + esc(p.nombre) + '</strong><span>' + esc(p.tipo) + ' · ' + esc(p.categoria) + '</span></div><b>+ ' + esc(money(p.precio)) + '</b></div><div class="prodComOptionalStageAFields"><label class="prodComField"><span>Cantidad</span><input id="prod_com_recomendado_' + index + '_cantidad" type="text" value="1 unidad"></label><label class="prodComField"><span>Estado visual</span><select id="prod_com_recomendado_' + index + '_estado"><option value="Visible" selected>Visible</option><option value="Oculto">Oculto</option></select></label><label class="prodComField"><span>Precio tomado del producto</span><input id="prod_com_recomendado_' + index + '_precio_visible" value="' + esc(money(p.precio)) + '" readonly></label></div><input type="hidden" id="recomendados_' + index + '_nombre" value="' + esc(p.nombre) + '"><input type="hidden" id="recomendados_' + index + '_desc" value="' + esc(p.tipo + ' · ' + p.categoria) + '"><input type="hidden" id="recomendados_' + index + '_precio" value="' + esc(p.precio) + '"><input type="hidden" id="recomendados_' + index + '_estado" value="Visible"><input type="hidden" id="recomendados_' + index + '_badge" value="Agregado opcional"><input type="hidden" id="recomendados_' + index + '_img" value="' + esc(p.imagen) + '"></div><button type="button" class="prodComOptionalStageADelete" data-prod-com-optionals-delete="1" aria-label="Eliminar producto agregado">×</button></article>';
  }

  function syncHiddenState() {
    const l = list();
    if (!l) return;
    Array.from(l.querySelectorAll('[data-prod-com-optionals-card]')).forEach((card, index) => {
      card.querySelectorAll('input, select').forEach(field => {
        field.id = String(field.id || '').replace(/prod_com_recomendado_\d+_/g, 'prod_com_recomendado_' + index + '_').replace(/recomendados_\d+_/g, 'recomendados_' + index + '_');
      });
      const visible = card.querySelector('select[id^="prod_com_recomendado_"][id$="_estado"]');
      const hidden = card.querySelector('input[id^="recomendados_"][id$="_estado"]');
      if (visible && hidden) hidden.value = visible.value;
    });
  }

  function ensureEmpty() {
    const l = list();
    if (!l) return;
    const empty = l.querySelector('[data-prod-com-optionals-empty]');
    const has = !!l.querySelector('[data-prod-com-optionals-card]');
    if (has && empty) empty.remove();
    if (!has && !empty) l.innerHTML = '<div class="prodComOptionalStageAEmpty" data-prod-com-optionals-empty="1"><strong>Sin productos agregados todavía</strong><span>Usá + Agregar producto para seleccionar productos o combos existentes. No se crean opciones manuales.</span></div>';
  }

  function confirmSelection() {
    const l = list();
    if (!l || !selected.size) { closePicker(); return; }
    const empty = l.querySelector('[data-prod-com-optionals-empty]');
    if (empty) empty.remove();
    const rows = candidates();
    let index = l.querySelectorAll('[data-prod-com-optionals-card]').length;
    selected.forEach(id => {
      if (currentSelectedIds().has(id)) return;
      const p = rows.find(x => String(x.id) === String(id));
      if (!p) return;
      l.insertAdjacentHTML('beforeend', cardHtml(p, index));
      index += 1;
    });
    syncHiddenState();
    ensureEmpty();
    closePicker();
    renderPicker('');
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.productosComestiblesOptionalsClickFix === '1') return;
    document.body.dataset.productosComestiblesOptionalsClickFix = '1';

    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-prod-com-optionals-add]')) { event.preventDefault(); openPicker(); return; }
      if (event.target.closest('[data-prod-com-optionals-close]')) { event.preventDefault(); closePicker(); return; }
      if (event.target.closest('[data-prod-com-optionals-pick]')) {
        event.preventDefault();
        const pick = event.target.closest('[data-prod-com-optionals-pick]');
        const id = pick.dataset.productId;
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        pick.classList.toggle('is-selected', selected.has(id));
        return;
      }
      if (event.target.closest('[data-prod-com-optionals-confirm]')) { event.preventDefault(); confirmSelection(); return; }
      if (event.target.closest('[data-prod-com-optionals-delete]')) {
        event.preventDefault();
        const card = event.target.closest('[data-prod-com-optionals-card]');
        if (card) card.remove();
        syncHiddenState();
        ensureEmpty();
        renderPicker('');
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.matches('[data-prod-com-optionals-search]')) renderPicker(event.target.value || '');
      if (event.target.closest('[data-prod-com-optionals-card]')) syncHiddenState();
    }, true);

    document.addEventListener('change', function (event) {
      if (event.target.closest('[data-prod-com-optionals-card]')) syncHiddenState();
    }, true);

    window.ProductosComestiblesOptionalsClickFix = {
      open: openPicker,
      close: closePicker,
      products: candidates,
      debug: function () {
        return {
          active: true,
          product_id: currentProductId(),
          candidates: candidates().length,
          has_section: !!section(),
          has_list: !!list(),
          has_picker: !!document.querySelector('[data-prod-com-optionals-picker]')
        };
      }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
  window.addEventListener('load', bind);
})();
