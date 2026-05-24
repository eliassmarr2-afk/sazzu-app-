(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';

  const DEFAULT_EXTRAS = [
    {
      id: 'extra-crema-suave',
      title: 'Extra crema suave',
      description: 'Crema suave para sumar al pedido.',
      price: 2000,
      status: 'Activo',
      badge: 'abundante',
      folder: 'Tortas',
      tags: 'crema, tortas, postres',
      image: 'https://cuuzsbhpjmjbbnghtiny.supabase.co/storage/v1/object/public/product-images/Gemini_Generated_Image_ymyjpvymyjpvymyj.png'
    },
    {
      id: 'extra-frutillas-frescas',
      title: 'Frutillas frescas',
      description: 'Agregado dulce para postres y tortas.',
      price: 3500,
      status: 'Activo',
      badge: 'incluye frambuesa',
      folder: 'Frutas',
      tags: 'frutilla, frutas, tortas',
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80'
    }
  ];

  let observerStarted = false;
  let mountIntervalId = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeExtra(extra) {
    const data = extra || {};
    const id = String(data.id || data.extra_id || ('extra-' + slugify(data.title || data.nombre || 'extra') + '-' + Date.now())).trim();
    return {
      id,
      extra_id: id,
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

  function repairExtras(items) {
    const map = new Map();
    DEFAULT_EXTRAS.forEach(function (extra) {
      const normalized = normalizeExtra(extra);
      map.set(normalized.id, normalized);
    });
    (Array.isArray(items) ? items : []).forEach(function (extra) {
      const normalized = normalizeExtra(extra);
      const seed = map.get(normalized.id) || {};
      map.set(normalized.id, Object.assign({}, seed, normalized));
    });

    const userRows = (Array.isArray(items) ? items : [])
      .map(normalizeExtra)
      .filter(function (extra) {
        return !DEFAULT_EXTRAS.some(function (seed) { return seed.id === extra.id; });
      });
    const seedRows = DEFAULT_EXTRAS.map(function (seed) { return map.get(seed.id); }).filter(Boolean);
    return userRows.concat(seedRows);
  }

  function readExtras() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const repaired = repairExtras(Array.isArray(parsed) ? parsed : DEFAULT_EXTRAS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
      return repaired;
    } catch (error) {
      console.warn('[productos-extras.js] No se pudo leer storage:', error);
      const fallback = repairExtras(DEFAULT_EXTRAS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback)); } catch (_) {}
      return fallback;
    }
  }

  function getExtra(id) {
    return readExtras().find(function (item) { return item.id === id || item.extra_id === id; });
  }

  function slugify(value) {
    return String(value || 'extra')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'extra';
  }

  function ensureEditorAssets() {
    if (!document.querySelector('link[data-loader="productos-extras-editor-css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '../css/productos-extras-editor.css';
      link.setAttribute('data-loader', 'productos-extras-editor-css');
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-loader="productos-extras-editor-js"]')) {
      const script = document.createElement('script');
      script.src = '../js/productos-extras-editor.js';
      script.defer = true;
      script.setAttribute('data-loader', 'productos-extras-editor-js');
      document.body.appendChild(script);
    }
  }

  function ensureFilterAssets() {
    if (!document.querySelector('link[data-loader="productos-extras-filtros-css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '../css/productos-extras-filtros.css';
      link.setAttribute('data-loader', 'productos-extras-filtros-css');
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-loader="productos-extras-filtros-js"]')) {
      const script = document.createElement('script');
      script.src = '../js/productos-extras-filtros.js';
      script.defer = true;
      script.setAttribute('data-loader', 'productos-extras-filtros-js');
      document.body.appendChild(script);
    }
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

  function mountLauncher() {
    const comboLauncher = document.getElementById('prodComboLauncher');
    if (!comboLauncher) return false;
    if (document.getElementById('prodExtrasLauncherBtn')) return true;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodExtrasLauncherBtn';
    btn.id = 'prodExtrasLauncherBtn';
    btn.textContent = '+ Configurar extras';
    comboLauncher.appendChild(btn);
    return true;
  }

  function mountSlides() {
    const main = document.querySelector('body[data-page="productos"] .main');
    if (!main) return false;
    if (document.getElementById('prodExtrasSlide')) return true;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="prodExtrasOverlay" id="prodExtrasOverlay"></div>
      <aside class="prodExtrasSlide" id="prodExtrasSlide" aria-hidden="true">
        <header class="prodExtrasHeader">
          <div>
            <span class="prodExtrasEyebrow">Banco reutilizable</span>
            <h2>Banco de extras</h2>
            <p>Configurá extras globales para traerlos luego a productos sin duplicarlos.</p>
          </div>
          <div class="prodExtrasHeaderActions">
            <button type="button" class="prodExtrasAddBtn" id="prodExtrasAddBtn">+ Extra</button>
            <button type="button" class="prodExtrasClose" id="prodExtrasCloseBtn" aria-label="Cerrar banco de extras">×</button>
          </div>
        </header>
        <div class="prodExtrasBody">
          <div class="prodExtrasGrid" id="prodExtrasGrid"></div>
        </div>
      </aside>

      <div class="prodExtraConfigOverlay" id="prodExtraConfigOverlay"></div>
      <aside class="prodExtraConfigSlide" id="prodExtraConfigSlide" aria-hidden="true">
        <header class="prodExtraConfigHeader">
          <div>
            <span class="prodExtrasEyebrow">Configuración</span>
            <h2 id="prodExtraConfigTitle">Configurar extra</h2>
            <p>La estructura visual del extra es fija. Solo se editan sus características comerciales.</p>
          </div>
          <div class="prodExtraConfigActions">
            <button type="button" class="prodExtraConfigSave" id="prodExtraConfigSaveBtn">Guardar extra</button>
            <button type="button" class="prodExtraConfigClose" id="prodExtraConfigCloseBtn" aria-label="Cerrar configuración">×</button>
          </div>
        </header>
        <div class="prodExtraConfigBody" id="prodExtraConfigBody"></div>
      </aside>
    `;
    main.appendChild(wrap);
    return true;
  }

  function renderExtraCard(extra) {
    const data = normalizeExtra(extra);
    const badge = data.badge ? `<span class="prodExtraCard__badge">${escapeHtml(data.badge)}</span>` : '';
    const folder = data.folder ? `<em>${escapeHtml(data.folder)}</em>` : '';
    const image = data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : '<span class="prodExtraCard__empty">Sin imagen</span>';

    return `
      <button type="button" class="prodExtraCard" data-extra-id="${escapeHtml(data.id)}">
        <div class="prodExtraCard__image">
          ${badge}${image}
        </div>
        <div class="prodExtraCard__info">
          <div>
            <strong>${escapeHtml(data.title)}</strong>
            <span>${escapeHtml(data.description)}</span>
            ${folder}
          </div>
          <b class="prodExtraCard__price">${escapeHtml(money(data.price))}</b>
        </div>
      </button>
    `;
  }

  function renderGrid() {
    const grid = document.getElementById('prodExtrasGrid');
    if (!grid) return;
    const extras = readExtras();
    grid.innerHTML = extras.length
      ? extras.map(renderExtraCard).join('')
      : '<div class="prodExtrasEmpty">Todavía no hay extras creados.</div>';
  }

  function renderConfig(extra) {
    const body = document.getElementById('prodExtraConfigBody');
    const title = document.getElementById('prodExtraConfigTitle');
    if (!body) return;

    const data = normalizeExtra(extra || {
      id: 'nuevo-extra',
      title: 'Nuevo extra',
      description: 'Descripción breve del extra.',
      price: 0,
      status: 'Borrador',
      badge: '',
      folder: '',
      tags: '',
      image: ''
    });

    if (title) title.textContent = data.id && data.id !== 'nuevo-extra' ? 'Editar extra' : 'Nuevo extra';
    body.innerHTML = `
      <section class="prodExtraConfigCard" data-extra-editor="1">
        <div class="prodExtraConfigPreview" id="prodExtraEditorPreview">
          ${data.badge ? `<span class="prodExtraPreviewBadge">${escapeHtml(data.badge)}</span>` : ''}
          ${data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : `<span class="prodExtraPreviewEmpty">Imagen del extra</span>`}
        </div>
        <p class="prodExtraEditorNotice">La estructura visible del extra es fija. Se edita información comercial, no el diseño.</p>
        <div class="prodExtraEditorGrid">
          <label class="prodExtraField"><span>Nombre del extra</span><input id="prodExtraEditorName" type="text" value="${escapeHtml(data.title)}" placeholder="Ej: Salsa de chocolate"></label>
          <label class="prodExtraField"><span>Valor agregado</span><input id="prodExtraEditorPrice" type="number" value="${escapeHtml(data.price)}" placeholder="2000"></label>
        </div>
        <label class="prodExtraField"><span>Descripción breve</span><textarea id="prodExtraEditorDescription" placeholder="Texto corto visible debajo del título">${escapeHtml(data.description)}</textarea></label>
        <div class="prodExtraEditorGrid">
          <label class="prodExtraField"><span>Badge comercial</span><input id="prodExtraEditorBadge" type="text" value="${escapeHtml(data.badge || '')}" placeholder="Ej: abundante"></label>
          <label class="prodExtraField"><span>Estado</span><select id="prodExtraEditorStatus"><option ${data.status === 'Activo' ? 'selected' : ''}>Activo</option><option ${data.status === 'Borrador' ? 'selected' : ''}>Borrador</option><option ${data.status === 'Oculto' ? 'selected' : ''}>Oculto</option></select></label>
        </div>
        <label class="prodExtraField"><span>URL de imagen</span><input id="prodExtraEditorImage" type="url" value="${escapeHtml(data.image || '')}" placeholder="https://..."></label>
        <div class="prodExtraEditorGrid">
          <label class="prodExtraField"><span>Carpeta / clasificación comercial</span><input id="prodExtraEditorFolder" type="text" value="${escapeHtml(data.folder || '')}" placeholder="Ej: Tortas, Alfajores, Cafetería"></label>
          <label class="prodExtraField"><span>Etiquetas internas</span><input id="prodExtraEditorTags" type="text" value="${escapeHtml(data.tags || '')}" placeholder="Ej: chocolate, regalo, cumpleaños"></label>
        </div>
      </section>`;
  }

  function openExtrasSlide() {
    renderGrid();
    document.getElementById('prodExtrasOverlay')?.classList.add('is-active');
    const slide = document.getElementById('prodExtrasSlide');
    if (slide) {
      slide.classList.add('is-active');
      slide.setAttribute('aria-hidden', 'false');
    }
  }

  function closeExtrasSlide() {
    document.getElementById('prodExtrasOverlay')?.classList.remove('is-active');
    const slide = document.getElementById('prodExtrasSlide');
    if (slide) {
      slide.classList.remove('is-active');
      slide.setAttribute('aria-hidden', 'true');
    }
    closeConfigSlide();
  }

  function openConfigSlide(extra) {
    renderConfig(extra);
    document.getElementById('prodExtraConfigOverlay')?.classList.add('is-active');
    const slide = document.getElementById('prodExtraConfigSlide');
    if (slide) {
      slide.classList.add('is-active');
      slide.setAttribute('aria-hidden', 'false');
    }
  }

  function closeConfigSlide() {
    document.getElementById('prodExtraConfigOverlay')?.classList.remove('is-active');
    const slide = document.getElementById('prodExtraConfigSlide');
    if (slide) {
      slide.classList.remove('is-active');
      slide.setAttribute('aria-hidden', 'true');
    }
  }

  function forceEditButtons() {
    document.querySelectorAll('#prodComTableBody button.prodComEdit').forEach(function (btn) {
      if (btn.textContent.trim() === 'Guardado') btn.textContent = 'Editar';
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('title');
    });
  }

  function bindUi() {
    if (document.body.dataset.productosExtrasUiBound === '1') return;
    document.body.dataset.productosExtrasUiBound = '1';

    document.addEventListener('click', function (event) {
      const launcher = event.target.closest('#prodExtrasLauncherBtn');
      if (launcher) {
        event.preventDefault();
        openExtrasSlide();
        return;
      }

      const close = event.target.closest('#prodExtrasCloseBtn, #prodExtrasOverlay');
      if (close) {
        event.preventDefault();
        closeExtrasSlide();
        return;
      }

      const add = event.target.closest('#prodExtrasAddBtn');
      if (add) {
        event.preventDefault();
        openConfigSlide(null);
        return;
      }

      const card = event.target.closest('[data-extra-id]');
      const bankSlide = document.getElementById('prodExtrasSlide');
      if (card && bankSlide?.classList.contains('is-active') && !bankSlide.classList.contains('is-selecting')) {
        event.preventDefault();
        openConfigSlide(getExtra(card.dataset.extraId));
        return;
      }

      const closeConfig = event.target.closest('#prodExtraConfigCloseBtn, #prodExtraConfigOverlay');
      if (closeConfig) {
        event.preventDefault();
        closeConfigSlide();
      }
    });
  }

  function mountEverything() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return false;
    const launcherReady = mountLauncher();
    const slidesReady = mountSlides();
    if (slidesReady) renderGrid();
    forceEditButtons();
    return launcherReady && slidesReady;
  }

  function startMountLoop() {
    if (mountIntervalId) return;
    let attempts = 0;
    mountIntervalId = window.setInterval(function () {
      attempts += 1;
      const ready = mountEverything();
      if (ready || attempts >= 40) {
        window.clearInterval(mountIntervalId);
        mountIntervalId = null;
      }
    }, 150);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const observer = new MutationObserver(function () { mountEverything(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initProductosExtras() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    bindUi();
    mountEverything();
    startMountLoop();
    startObserver();
    ensureEditorAssets();
    ensureFilterAssets();
  }

  window.ProductosExtrasBank = {
    read: readExtras,
    render: renderGrid,
    repair: function () { localStorage.setItem(STORAGE_KEY, JSON.stringify(repairExtras(readExtras()))); renderGrid(); }
  };

  document.addEventListener('DOMContentLoaded', initProductosExtras);
  document.addEventListener('sazzu:page:load', initProductosExtras);
  window.addEventListener('productos:payload-ready', function () { setTimeout(forceEditButtons, 200); });
  window.addEventListener('productos:supabase-saved', function () { setTimeout(forceEditButtons, 200); });
  window.addEventListener('productos-extras:saved', function () { setTimeout(renderGrid, 80); });
  window.addEventListener('load', initProductosExtras);
})();
