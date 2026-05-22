(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v1';

  const EXTRAS_DEFAULT = [
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugify(value) {
    return String(value || 'extra')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'extra';
  }

  function money(value) {
    return '+ $' + Number(value || 0).toLocaleString('es-AR');
  }

  function readExtras() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('[productos-extras.js] No se pudo leer banco local:', error);
    }
    return EXTRAS_DEFAULT.slice();
  }

  function writeExtras(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
  }

  function byId(id) {
    return readExtras().find(function (item) { return item.id === id; });
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function numberOf(id) {
    const raw = valueOf(id).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) ? parsed : 0;
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
            <p>La estructura del extra es fija. Solo editás imagen, textos, badge, precio y metadatos.</p>
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
    const badge = extra.badge ? `<span class="prodExtraCard__badge">${escapeHtml(extra.badge)}</span>` : '';
    const folder = extra.folder ? `<em>${escapeHtml(extra.folder)}</em>` : '';

    return `
      <button type="button" class="prodExtraCard" data-extra-id="${escapeHtml(extra.id)}">
        <div class="prodExtraCard__image">
          ${badge}
          ${extra.image ? `<img src="${escapeHtml(extra.image)}" alt="">` : `<span class="prodExtraCard__empty">Sin imagen</span>`}
        </div>
        <div class="prodExtraCard__info">
          <div>
            <strong>${escapeHtml(extra.title)}</strong>
            <span>${escapeHtml(extra.description)}</span>
            ${folder}
          </div>
          <b class="prodExtraCard__price">${escapeHtml(money(extra.price))}</b>
        </div>
      </button>
    `;
  }

  function renderGrid() {
    const grid = document.getElementById('prodExtrasGrid');
    if (!grid) return;
    grid.innerHTML = readExtras().map(renderExtraCard).join('');
  }

  function renderConfig(extra) {
    const body = document.getElementById('prodExtraConfigBody');
    const title = document.getElementById('prodExtraConfigTitle');
    const slide = document.getElementById('prodExtraConfigSlide');
    if (!body) return;

    const data = extra || {
      id: '',
      title: 'Nuevo extra',
      description: 'Descripción breve del extra.',
      price: 0,
      status: 'Borrador',
      badge: '',
      folder: '',
      tags: '',
      image: ''
    };

    if (slide) slide.dataset.extraId = data.id || '';
    if (title) title.textContent = data.id ? 'Editar extra' : 'Nuevo extra';

    body.innerHTML = `
      <section class="prodExtraConfigCard">
        <div class="prodExtraConfigPreview" id="prodExtraConfigPreview">
          ${data.badge ? `<span class="prodExtraConfigPreview__badge">${escapeHtml(data.badge)}</span>` : ''}
          ${data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : `<span class="prodExtraConfigPreview__empty">Imagen del extra</span>`}
        </div>

        <div class="prodExtraConfigGrid">
          <label class="prodExtraField">
            <span>Nombre del extra</span>
            <input id="prodExtraName" type="text" value="${escapeHtml(data.title)}" placeholder="Ej: Salsa de chocolate">
          </label>
          <label class="prodExtraField">
            <span>Valor agregado</span>
            <input id="prodExtraPrice" type="number" value="${escapeHtml(data.price)}" placeholder="2000">
          </label>
        </div>

        <label class="prodExtraField">
          <span>Descripción breve</span>
          <textarea id="prodExtraDescription" placeholder="Texto corto visible debajo del título">${escapeHtml(data.description)}</textarea>
        </label>

        <div class="prodExtraConfigGrid">
          <label class="prodExtraField">
            <span>Badge comercial</span>
            <input id="prodExtraBadge" type="text" value="${escapeHtml(data.badge || '')}" placeholder="Ej: abundante">
          </label>
          <label class="prodExtraField">
            <span>Estado</span>
            <select id="prodExtraStatus">
              <option ${data.status === 'Activo' ? 'selected' : ''}>Activo</option>
              <option ${data.status === 'Borrador' ? 'selected' : ''}>Borrador</option>
              <option ${data.status === 'Oculto' ? 'selected' : ''}>Oculto</option>
            </select>
          </label>
        </div>

        <label class="prodExtraField">
          <span>URL de imagen</span>
          <input id="prodExtraImage" type="url" value="${escapeHtml(data.image || '')}" placeholder="https://...">
        </label>

        <div class="prodExtraConfigGrid">
          <label class="prodExtraField">
            <span>Carpeta / clasificación comercial</span>
            <input id="prodExtraFolder" type="text" value="${escapeHtml(data.folder || '')}" placeholder="Ej: Tortas, Alfajores, Cafetería">
          </label>
          <label class="prodExtraField">
            <span>Etiquetas internas</span>
            <input id="prodExtraTags" type="text" value="${escapeHtml(data.tags || '')}" placeholder="Ej: chocolate, regalo, cumpleaños">
          </label>
        </div>
      </section>
    `;
  }

  function refreshConfigPreview() {
    const preview = document.getElementById('prodExtraConfigPreview');
    if (!preview) return;
    const image = valueOf('prodExtraImage');
    const badge = valueOf('prodExtraBadge');
    preview.innerHTML = `${badge ? `<span class="prodExtraConfigPreview__badge">${escapeHtml(badge)}</span>` : ''}${image ? `<img src="${escapeHtml(image)}" alt="">` : `<span class="prodExtraConfigPreview__empty">Imagen del extra</span>`}`;
  }

  function saveExtra() {
    const slide = document.getElementById('prodExtraConfigSlide');
    const currentId = slide?.dataset.extraId || '';
    const title = valueOf('prodExtraName') || 'Nuevo extra';
    const items = readExtras();
    const next = {
      id: currentId || 'extra-' + slugify(title) + '-' + Date.now(),
      title: title,
      description: valueOf('prodExtraDescription'),
      price: numberOf('prodExtraPrice'),
      status: valueOf('prodExtraStatus') || 'Borrador',
      badge: valueOf('prodExtraBadge'),
      folder: valueOf('prodExtraFolder'),
      tags: valueOf('prodExtraTags'),
      image: valueOf('prodExtraImage')
    };

    const index = items.findIndex(function (item) { return item.id === next.id; });
    if (index >= 0) items[index] = next;
    else items.unshift(next);

    writeExtras(items);
    renderGrid();
    closeConfigSlide();
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
      slide.dataset.extraId = '';
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
      if (card) {
        event.preventDefault();
        openConfigSlide(byId(card.dataset.extraId));
        return;
      }

      const save = event.target.closest('#prodExtraConfigSaveBtn');
      if (save) {
        event.preventDefault();
        saveExtra();
        return;
      }

      const closeConfig = event.target.closest('#prodExtraConfigCloseBtn, #prodExtraConfigOverlay');
      if (closeConfig) {
        event.preventDefault();
        closeConfigSlide();
      }
    });

    document.addEventListener('input', function (event) {
      if (event.target.closest('#prodExtraImage, #prodExtraBadge')) {
        refreshConfigPreview();
      }
    });
  }

  function mountEverything() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return false;

    const launcherReady = mountLauncher();
    const slidesReady = mountSlides();
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

    const observer = new MutationObserver(function () {
      mountEverything();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function initProductosExtras() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;

    bindUi();
    mountEverything();
    startMountLoop();
    startObserver();
  }

  document.addEventListener('DOMContentLoaded', initProductosExtras);
  document.addEventListener('sazzu:page:load', initProductosExtras);
  window.addEventListener('productos:payload-ready', function () { setTimeout(forceEditButtons, 200); });
  window.addEventListener('productos:supabase-saved', function () { setTimeout(forceEditButtons, 200); });
  window.addEventListener('load', initProductosExtras);
})();
