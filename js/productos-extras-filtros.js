(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';
  const DEFAULT_FOLDERS = ['Todas', 'Tortas', 'Frutas', 'Premium', 'Desayunos', 'Box dulces'];
  let state = { folder: 'Todas', status: 'Todos', q: '', tag: '' };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function readExtras() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('[productos-extras-filtros.js] No se pudo leer storage:', error);
    }
    return [];
  }

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function getFolders() {
    const fromExtras = readExtras().map(function (extra) { return extra.folder; }).filter(Boolean);
    return Array.from(new Set(DEFAULT_FOLDERS.concat(fromExtras)));
  }

  function buildFilterPanel() {
    if (document.getElementById('prodExtrasFilterPanel')) return;
    const actions = document.querySelector('#prodExtrasSlide .prodExtrasHeaderActions');
    if (!actions) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodExtrasFilterBtn';
    btn.id = 'prodExtrasFilterBtn';
    btn.innerHTML = '<span>🗂</span> Filtrar';
    actions.insertBefore(btn, actions.firstChild);

    const panel = document.createElement('div');
    panel.className = 'prodExtrasFilterPanel';
    panel.id = 'prodExtrasFilterPanel';
    panel.innerHTML = renderFilterPanel();
    actions.appendChild(panel);
  }

  function renderFilterPanel() {
    const folders = getFolders();
    return '<h3>Filtrar extras</h3>' +
      '<div class="prodExtrasFilterGrid">' +
        '<label class="prodExtrasFilterField"><span>Buscar</span><input id="prodExtrasFilterQ" type="search" placeholder="Nombre, descripción o carpeta" value="' + escapeHtml(state.q) + '"></label>' +
        '<label class="prodExtrasFilterField"><span>Carpeta</span><select id="prodExtrasFilterFolder">' + folders.map(function (folder) { return '<option ' + (state.folder === folder ? 'selected' : '') + '>' + escapeHtml(folder) + '</option>'; }).join('') + '</select></label>' +
        '<label class="prodExtrasFilterField"><span>Estado</span><select id="prodExtrasFilterStatus"><option ' + (state.status === 'Todos' ? 'selected' : '') + '>Todos</option><option ' + (state.status === 'Activo' ? 'selected' : '') + '>Activo</option><option ' + (state.status === 'Borrador' ? 'selected' : '') + '>Borrador</option><option ' + (state.status === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
        '<label class="prodExtrasFilterField"><span>Etiqueta interna</span><input id="prodExtrasFilterTag" type="text" placeholder="Ej: chocolate" value="' + escapeHtml(state.tag) + '"></label>' +
      '</div>' +
      '<div class="prodExtrasFilterActions"><button type="button" class="prodExtrasFilterClear" id="prodExtrasFilterClear">Limpiar</button><button type="button" class="prodExtrasFilterApply" id="prodExtrasFilterApply">Aplicar</button></div>';
  }

  function buildQuickFilters() {
    const body = document.querySelector('#prodExtrasSlide .prodExtrasBody');
    if (!body) return;
    let quick = document.getElementById('prodExtrasQuickFilters');
    if (!quick) {
      quick = document.createElement('div');
      quick.className = 'prodExtrasQuickFilters';
      quick.id = 'prodExtrasQuickFilters';
      body.insertBefore(quick, body.firstChild);
    }

    quick.innerHTML = getFolders().slice(0, 8).map(function (folder) {
      return '<button type="button" class="prodExtrasQuickChip ' + (state.folder === folder ? 'is-active' : '') + '" data-extra-folder="' + escapeHtml(folder) + '">' + escapeHtml(folder) + '</button>';
    }).join('');

    if (!document.getElementById('prodExtrasFilterEmpty')) {
      const empty = document.createElement('div');
      empty.className = 'prodExtrasFilterEmpty';
      empty.id = 'prodExtrasFilterEmpty';
      empty.textContent = 'No hay extras que coincidan con los filtros activos.';
      body.appendChild(empty);
    }
  }

  function extractCardData(card) {
    const title = card.querySelector('strong')?.textContent || '';
    const description = card.querySelector('span:not(.prodExtraCard__badge)')?.textContent || '';
    const folder = card.querySelector('em')?.textContent || '';
    const id = card.dataset.extraId || '';
    const extra = readExtras().find(function (item) { return item.id === id; }) || {};
    return {
      title,
      description,
      folder: extra.folder || folder,
      status: extra.status || 'Activo',
      tags: extra.tags || '',
      badge: extra.badge || ''
    };
  }

  function matches(data) {
    const q = normalize(state.q);
    const tag = normalize(state.tag);
    const folderOk = state.folder === 'Todas' || normalize(data.folder) === normalize(state.folder);
    const statusOk = state.status === 'Todos' || normalize(data.status) === normalize(state.status);
    const haystack = normalize([data.title, data.description, data.folder, data.tags, data.badge].join(' '));
    const qOk = !q || haystack.includes(q);
    const tagOk = !tag || normalize(data.tags).includes(tag) || normalize(data.badge).includes(tag);
    return folderOk && statusOk && qOk && tagOk;
  }

  function applyFilters() {
    const cards = Array.from(document.querySelectorAll('#prodExtrasGrid .prodExtraCard'));
    let visible = 0;
    cards.forEach(function (card) {
      const ok = matches(extractCardData(card));
      card.style.display = ok ? '' : 'none';
      if (ok) visible += 1;
    });

    const empty = document.getElementById('prodExtrasFilterEmpty');
    if (empty) empty.classList.toggle('is-active', cards.length > 0 && visible === 0);

    const panel = document.getElementById('prodExtrasFilterPanel');
    if (panel) panel.innerHTML = renderFilterPanel();
    buildQuickFilters();
  }

  function updateStateFromPanel() {
    state = {
      folder: document.getElementById('prodExtrasFilterFolder')?.value || 'Todas',
      status: document.getElementById('prodExtrasFilterStatus')?.value || 'Todos',
      q: document.getElementById('prodExtrasFilterQ')?.value || '',
      tag: document.getElementById('prodExtrasFilterTag')?.value || ''
    };
  }

  function bind() {
    if (document.body.dataset.productosExtrasFiltrosBound === '1') return;
    document.body.dataset.productosExtrasFiltrosBound = '1';

    document.addEventListener('click', function (event) {
      const open = event.target.closest('#prodExtrasFilterBtn');
      if (open) {
        event.preventDefault();
        const panel = document.getElementById('prodExtrasFilterPanel');
        if (panel) panel.classList.toggle('is-active');
        return;
      }

      const chip = event.target.closest('[data-extra-folder]');
      if (chip) {
        event.preventDefault();
        state.folder = chip.dataset.extraFolder || 'Todas';
        applyFilters();
        return;
      }

      const apply = event.target.closest('#prodExtrasFilterApply');
      if (apply) {
        event.preventDefault();
        updateStateFromPanel();
        applyFilters();
        document.getElementById('prodExtrasFilterPanel')?.classList.remove('is-active');
        return;
      }

      const clear = event.target.closest('#prodExtrasFilterClear');
      if (clear) {
        event.preventDefault();
        state = { folder: 'Todas', status: 'Todos', q: '', tag: '' };
        applyFilters();
        return;
      }

      if (!event.target.closest('#prodExtrasFilterPanel, #prodExtrasFilterBtn')) {
        document.getElementById('prodExtrasFilterPanel')?.classList.remove('is-active');
      }

      if (event.target.closest('#prodExtrasLauncherBtn')) {
        setTimeout(initFilters, 80);
        setTimeout(applyFilters, 260);
      }
    }, true);
  }

  function initFilters() {
    const slide = document.getElementById('prodExtrasSlide');
    if (!slide) return;
    buildFilterPanel();
    buildQuickFilters();
    applyFilters();
  }

  function schedule() {
    setTimeout(initFilters, 150);
    setTimeout(initFilters, 500);
  }

  bind();
  document.addEventListener('DOMContentLoaded', schedule);
  document.addEventListener('sazzu:page:load', schedule);
  window.addEventListener('load', schedule);
})();
