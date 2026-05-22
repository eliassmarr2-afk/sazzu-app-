(function () {
  const EXTRAS_MOCK = [
    {
      id: 'extra-crema-suave',
      title: 'Extra crema suave',
      description: 'Crema suave para sumar al pedido.',
      price: 2000,
      status: 'Activo',
      image: 'https://cuuzsbhpjmjbbnghtiny.supabase.co/storage/v1/object/public/product-images/Gemini_Generated_Image_ymyjpvymyjpvymyj.png'
    },
    {
      id: 'extra-frutillas-frescas',
      title: 'Frutillas frescas',
      description: 'Agregado dulce para postres y tortas.',
      price: 3500,
      status: 'Activo',
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80'
    }
  ];

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
    if (document.getElementById('prodExtrasLauncherBtn')) return;
    const comboLauncher = document.getElementById('prodComboLauncher');
    if (!comboLauncher) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodExtrasLauncherBtn';
    btn.id = 'prodExtrasLauncherBtn';
    btn.textContent = '+ Configurar extras';
    comboLauncher.appendChild(btn);
  }

  function mountSlides() {
    const main = document.querySelector('body[data-page="productos"] .main');
    if (!main || document.getElementById('prodExtrasSlide')) return;
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
            <p>Sub-slide estructural. La persistencia real se conecta en la próxima fase.</p>
          </div>
          <div class="prodExtraConfigActions">
            <button type="button" class="prodExtraConfigSave" disabled>Guardar · Próxima fase</button>
            <button type="button" class="prodExtraConfigClose" id="prodExtraConfigCloseBtn" aria-label="Cerrar configuración">×</button>
          </div>
        </header>
        <div class="prodExtraConfigBody" id="prodExtraConfigBody"></div>
      </aside>
    `;
    main.appendChild(wrap);
  }

  function renderExtraCard(extra) {
    return `
      <button type="button" class="prodExtraCard" data-extra-id="${escapeHtml(extra.id)}">
        <div class="prodExtraCard__image">
          <img src="${escapeHtml(extra.image)}" alt="">
        </div>
        <div class="prodExtraCard__info">
          <div>
            <strong>${escapeHtml(extra.title)}</strong>
            <span>${escapeHtml(extra.description)}</span>
          </div>
          <b class="prodExtraCard__price">${escapeHtml(money(extra.price))}</b>
        </div>
      </button>
    `;
  }

  function renderGrid() {
    const grid = document.getElementById('prodExtrasGrid');
    if (!grid) return;
    grid.innerHTML = EXTRAS_MOCK.map(renderExtraCard).join('');
  }

  function renderConfig(extra) {
    const body = document.getElementById('prodExtraConfigBody');
    const title = document.getElementById('prodExtraConfigTitle');
    if (!body) return;
    const data = extra || {
      id: 'nuevo-extra',
      title: 'Nuevo extra',
      description: 'Descripción breve del extra.',
      price: 0,
      status: 'Borrador',
      image: ''
    };
    if (title) title.textContent = data.title || 'Configurar extra';
    body.innerHTML = `
      <section class="prodExtraConfigCard">
        <div class="prodExtraConfigPreview">
          ${data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : ''}
        </div>
        <label class="prodExtraField">
          <span>Nombre del extra</span>
          <input type="text" value="${escapeHtml(data.title)}">
        </label>
        <label class="prodExtraField">
          <span>Descripción breve</span>
          <textarea>${escapeHtml(data.description)}</textarea>
        </label>
        <label class="prodExtraField">
          <span>Valor agregado</span>
          <input type="number" value="${escapeHtml(data.price)}">
        </label>
        <label class="prodExtraField">
          <span>URL de imagen</span>
          <input type="url" value="${escapeHtml(data.image)}">
        </label>
        <label class="prodExtraField">
          <span>Estado</span>
          <select>
            <option ${data.status === 'Activo' ? 'selected' : ''}>Activo</option>
            <option ${data.status === 'Borrador' ? 'selected' : ''}>Borrador</option>
            <option ${data.status === 'Oculto' ? 'selected' : ''}>Oculto</option>
          </select>
        </label>
      </section>
    `;
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
        const extra = EXTRAS_MOCK.find(function (item) { return item.id === card.dataset.extraId; });
        openConfigSlide(extra);
        return;
      }

      const closeConfig = event.target.closest('#prodExtraConfigCloseBtn, #prodExtraConfigOverlay');
      if (closeConfig) {
        event.preventDefault();
        closeConfigSlide();
      }
    });
  }

  function scheduleMount() {
    setTimeout(function () { mountLauncher(); mountSlides(); forceEditButtons(); }, 120);
    setTimeout(function () { mountLauncher(); mountSlides(); forceEditButtons(); }, 420);
  }

  function initProductosExtras() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    if (body.dataset.productosExtrasReady !== '1') {
      body.dataset.productosExtrasReady = '1';
      bindUi();
    }
    scheduleMount();
  }

  document.addEventListener('DOMContentLoaded', initProductosExtras);
  document.addEventListener('sazzu:page:load', initProductosExtras);
  window.addEventListener('productos:payload-ready', function () { setTimeout(forceEditButtons, 200); });
  window.addEventListener('productos:supabase-saved', function () { setTimeout(forceEditButtons, 200); });
})();
