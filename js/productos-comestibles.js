(function () {
  const STORAGE_KEY = 'sazzu_productos_comestibles_v1';
  const EXTRA_LINKS_STORAGE_KEY = 'sazzu_entity_extra_links_v1';
  const OWNER_TYPE = 'producto_comestible';

  const DEFAULT_PRODUCTS = [
    {
      id: 'box-dulce-nube',
      nombre: 'Box Dulce Nube Test',
      categoria: 'Postre armado',
      estado: 'Borrador',
      precio: 9800,
      badge: 'Nuevo',
      descripcion: 'Producto de prueba creado desde RPC.',
      promesa: 'Llega hoy según zona.',
      imagenes: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80'],
      versiones: [
        { nombre: 'Mini', descripcion: 'Opción base incluida.', precio: 0, estado: 'Incluido', badge: '' },
        { nombre: 'Mediano', descripcion: 'Mejor equilibrio entre precio y cantidad.', precio: 4200, estado: 'Activo', badge: 'Más elegido' }
      ],
      extras: [],
      extras_ids: [],
      extras_count: 0,
      sinCosto: [
        { nombre: 'Sin nueces', descripcion: 'El comprador puede quitar este ingrediente.', estado: 'Incluido' }
      ],
      recomendados: []
    }
  ];

  const PRODUCTOS_COMESTIBLES = readProducts();

  const OPTION_PRESETS = {
    versiones: { nombre: 'Nueva versión', descripcion: 'Presentación del producto.', precio: 0, estado: 'Activo', badge: '', imagen: '' },
    extras: { nombre: 'Seleccionar extra del banco', descripcion: 'Extra global pendiente de selección.', precio: 0, estado: 'Activo', badge: 'Banco de extras', imagen: '' },
    sinCosto: { nombre: 'Sin ingrediente', descripcion: 'Personalizá el producto.', estado: 'Incluido', badge: '', imagen: '' },
    recomendados: { nombre: 'Producto recomendado', descripcion: 'Sumalo al pedido.', precio: 0, estado: 'Activo', badge: 'Recomendado', imagen: '' }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readProducts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (error) {
      console.warn('[productos-comestibles.js] No se pudo leer storage:', error);
    }
    return clone(DEFAULT_PRODUCTS);
  }

  function writeProducts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTOS_COMESTIBLES));
    } catch (error) {
      console.warn('[productos-comestibles.js] No se pudo guardar storage:', error);
    }
  }

  function ensureExtraLinksEngine() {
    if (window.ProductosExtraLinks) return;
    if (document.querySelector('script[data-loader="productos-extra-links-js"]')) return;
    const script = document.createElement('script');
    script.src = '../js/productos-extra-links.js';
    script.defer = true;
    script.setAttribute('data-loader', 'productos-extra-links-js');
    document.body.appendChild(script);
  }

  function getExtraLinksApi() {
    if (window.ProductosExtraLinks) return window.ProductosExtraLinks;

    function nowIso() { return new Date().toISOString(); }
    function readLinks() {
      try {
        const parsed = JSON.parse(localStorage.getItem(EXTRA_LINKS_STORAGE_KEY) || 'null');
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        console.warn('[productos-comestibles.js] No se pudieron leer links:', error);
      }
      return [];
    }
    function writeLinks(links) {
      try { localStorage.setItem(EXTRA_LINKS_STORAGE_KEY, JSON.stringify(Array.isArray(links) ? links : [])); }
      catch (error) { console.warn('[productos-comestibles.js] No se pudieron guardar links:', error); }
    }
    function slug(value) {
      return String(value || 'item').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
    }
    function snapshotExtra(extra) {
      const data = extra || {};
      const extraId = String(data.extra_id || data.id || ('extra-' + slug(data.title || data.nombre || 'extra'))).trim();
      return {
        extra_id: extraId,
        id: extraId,
        title: String(data.title || data.nombre || 'Extra').trim(),
        nombre: String(data.nombre || data.title || 'Extra').trim(),
        description: String(data.description || data.descripcion || '').trim(),
        descripcion: String(data.descripcion || data.description || '').trim(),
        price: Number(data.price != null ? data.price : (data.precio != null ? data.precio : 0)) || 0,
        precio: Number(data.precio != null ? data.precio : (data.price != null ? data.price : 0)) || 0,
        status: String(data.status || data.estado || 'Activo').trim(),
        estado: String(data.estado || data.status || 'Activo').trim(),
        badge: String(data.badge || '').trim(),
        image: String(data.image || data.imagen || '').trim(),
        imagen: String(data.imagen || data.image || '').trim(),
        folder: String(data.folder || '').trim(),
        tags: String(data.tags || '').trim()
      };
    }
    function sameOwner(link, ownerType, ownerId) {
      return link && link.owner_type === ownerType && String(link.owner_id || '') === String(ownerId || '');
    }
    return {
      snapshotExtra,
      getLinksForOwner(ownerType, ownerId) {
        return readLinks().filter(link => sameOwner(link, ownerType, ownerId)).sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
      },
      getExtrasForOwner(ownerType, ownerId) {
        return this.getLinksForOwner(ownerType, ownerId).map(link => Object.assign({}, link.snapshot_extra || {}, {
          extra_id: link.extra_id,
          link_id: link.link_id,
          link_estado: link.estado,
          orden: link.orden,
          precio_override: link.precio_override
        }));
      },
      setLinksForOwner(ownerType, ownerId, extras) {
        const incoming = Array.isArray(extras) ? extras : [];
        const all = readLinks();
        const untouched = all.filter(link => !sameOwner(link, ownerType, ownerId));
        const previous = new Map(all.filter(link => sameOwner(link, ownerType, ownerId)).map(link => [String(link.extra_id), link]));
        const nextOwnerLinks = incoming.map((extra, index) => {
          const snapshot = snapshotExtra(extra);
          const old = previous.get(String(snapshot.extra_id));
          return {
            link_id: [ownerType, ownerId, snapshot.extra_id].map(slug).join('__'),
            owner_type: ownerType,
            owner_id: ownerId,
            extra_id: snapshot.extra_id,
            orden: index + 1,
            estado: 'activo',
            precio_override: extra.precio_override != null ? Number(extra.precio_override) : null,
            snapshot_extra: snapshot,
            created_at: old && old.created_at ? old.created_at : nowIso(),
            updated_at: nowIso()
          };
        });
        writeLinks(untouched.concat(nextOwnerLinks));
        window.dispatchEvent(new CustomEvent('productos-extra-links:changed', { detail: { owner_type: ownerType, owner_id: ownerId, links: nextOwnerLinks } }));
        return nextOwnerLinks;
      }
    };
  }

  function initProductosComestibles() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    ensureExtraLinksEngine();
    mountTab();
    mountPanel();
    mountSlide();
    bindUi();
    renderTable();
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') {
      window.ProductosExtrasSelector.ensurePickButtons();
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function slugify(value) {
    return String(value || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'producto';
  }

  function mountTab() {
    const tabs = document.querySelector('.prodTabs');
    const ref = document.getElementById('prodTabConjuntos');
    if (!tabs || document.getElementById('prodTabComestibles')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodTab prodTab--comestibles';
    btn.id = 'prodTabComestibles';
    btn.dataset.tab = 'comestibles';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML = '<span class="prodTab__icon" aria-hidden="true"></span><span class="prodTab__label">+ Productos Comestibles</span>';
    if (ref) ref.insertAdjacentElement('afterend', btn);
    else tabs.appendChild(btn);
  }

  function mountPanel() {
    const rentabilidad = document.getElementById('prodPanelRentabilidad');
    const shell = document.querySelector('.prodShell');
    if (!shell || document.getElementById('prodPanelComestibles')) return;
    const panel = document.createElement('section');
    panel.id = 'prodPanelComestibles';
    panel.className = 'prodPanelTab prodComestiblesPanel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'prodTabComestibles');
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="prodComShell">
        <section class="prodComHero">
          <div>
            <span class="prodComEyebrow">Constructor comercial</span>
            <h2>Productos Comestibles</h2>
            <p>Productos simples para tiendas rápidas. No combos. No stock profundo. Solo la información que alimenta la página de producto.</p>
          </div>
          <div class="prodComHero__badges">
            <span>Producto simple</span><span>No es combo</span><span>Estructura fija</span>
          </div>
          <button type="button" class="prodComPrimary" id="prodComNuevoBtn">+ Nuevo producto comestible</button>
        </section>
        <section class="prodComGuide">
          <article><b>1</b><strong>Identidad</strong><span>Nombre, precio, descripción y promesa.</span></article>
          <article><b>2</b><strong>Imágenes</strong><span>Hasta 6 imágenes para la galería.</span></article>
          <article><b>3</b><strong>Opciones</strong><span>Tamaño, extras, sin costo y recomendados.</span></article>
        </section>
        <section class="prodComTableCard">
          <div class="prodComTableCard__head">
            <div><span class="prodComEyebrow">Base editable</span><h3>Tabla de productos</h3><p>Solo productos comestibles simples. Los combos tendrán otro constructor.</p></div>
            <div class="prodComTools"><input id="prodComSearch" type="text" placeholder="Buscar producto..."><select id="prodComEstado"><option value="todos">Todos</option><option value="activo">Activos</option><option value="borrador">Borradores</option></select></div>
          </div>
          <div class="prodComTableWrap"><table class="prodComTable"><thead><tr><th>Producto</th><th>Tipo</th><th>Precio base</th><th>Tamaños</th><th>Extras</th><th>Sin costo</th><th>Recomendados</th><th>Imágenes</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="prodComTableBody"></tbody></table></div>
        </section>
      </div>`;
    if (rentabilidad) rentabilidad.insertAdjacentElement('beforebegin', panel);
    else shell.appendChild(panel);
  }

  function mountSlide() {
    const main = document.querySelector('body[data-page="productos"] .main');
    if (!main || document.getElementById('prodComSlide')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="prodComOverlay" id="prodComOverlay"></div>
      <aside class="prodComSlide" id="prodComSlide" aria-hidden="true">
        <header class="prodComSlide__header">
          <div><span class="prodComEyebrow">Constructor de producto</span><h2 id="prodComSlideTitle">Producto comestible</h2><p>Completá contenido. La estructura visual de la tienda no se modifica.</p></div>
          <div class="prodComSlide__actions"><button type="button" class="prodComGhost" id="prodComSaveBtn">Guardar borrador local</button><button type="button" class="prodComClose" id="prodComCloseBtn">×</button></div>
        </header>
        <div class="prodComSlide__body" id="prodComSlideBody"></div>
      </aside>`;
    main.appendChild(wrap);
  }

  function bindUi() {
    const tab = document.getElementById('prodTabComestibles');
    const tableBody = document.getElementById('prodComTableBody');
    const search = document.getElementById('prodComSearch');
    const estado = document.getElementById('prodComEstado');
    const nuevo = document.getElementById('prodComNuevoBtn');
    const overlay = document.getElementById('prodComOverlay');
    const close = document.getElementById('prodComCloseBtn');
    const save = document.getElementById('prodComSaveBtn');
    const slideBody = document.getElementById('prodComSlideBody');

    if (tab && tab.dataset.bound !== '1') { tab.dataset.bound = '1'; tab.addEventListener('click', activateTab); }
    if (tableBody && tableBody.dataset.bound !== '1') { tableBody.dataset.bound = '1'; tableBody.addEventListener('click', function (event) { const btn = event.target.closest('[data-edit-com]'); if (!btn) return; const product = PRODUCTOS_COMESTIBLES.find(p => p.id === btn.dataset.editCom); if (product) openSlide(product); }); }
    if (search && search.dataset.bound !== '1') { search.dataset.bound = '1'; search.addEventListener('input', renderTable); }
    if (estado && estado.dataset.bound !== '1') { estado.dataset.bound = '1'; estado.addEventListener('change', renderTable); }
    if (nuevo && nuevo.dataset.bound !== '1') { nuevo.dataset.bound = '1'; nuevo.addEventListener('click', () => openSlide(blankProduct())); }
    if (overlay && overlay.dataset.bound !== '1') { overlay.dataset.bound = '1'; overlay.addEventListener('click', closeSlide); }
    if (close && close.dataset.bound !== '1') { close.dataset.bound = '1'; close.addEventListener('click', closeSlide); }
    if (save && save.dataset.bound !== '1') { save.dataset.bound = '1'; save.addEventListener('click', saveLocal); }
    if (slideBody && slideBody.dataset.bound !== '1') {
      slideBody.dataset.bound = '1';
      slideBody.addEventListener('click', function (event) {
        const selectorButton = event.target.closest('[data-open-extra-bank]');
        if (selectorButton) {
          event.preventDefault();
          const card = selectorButton.closest('.prodComOption');
          if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.open === 'function') {
            window.ProductosExtrasSelector.open(selectorButton.dataset.openExtraBank || 'append', card);
          }
          return;
        }

        const addButton = event.target.closest('[data-add-com-option]');
        if (!addButton) return;
        const key = String(addButton.dataset.addComOption || '');
        if (key === 'extras') return;
        event.preventDefault();
        addOptionCard(key);
      });
    }
  }

  function activateTab() {
    document.querySelectorAll('.prodTab').forEach(btn => { const active = btn.id === 'prodTabComestibles'; btn.classList.toggle('is-active', active); btn.setAttribute('aria-selected', active ? 'true' : 'false'); });
    document.querySelectorAll('.prodPanelTab').forEach(panel => { panel.style.display = panel.id === 'prodPanelComestibles' ? 'block' : 'none'; });
    renderTable();
  }

  function getProductLinkedExtras(product) {
    if (!product || !product.id) return Array.isArray(product?.extras) ? product.extras : [];
    const api = getExtraLinksApi();
    const linked = api.getExtrasForOwner(OWNER_TYPE, product.id);
    if (linked.length) return linked;

    if (Array.isArray(product.extras) && product.extras.length) {
      api.setLinksForOwner(OWNER_TYPE, product.id, product.extras);
      const migrated = api.getExtrasForOwner(OWNER_TYPE, product.id);
      product.extras = [];
      product.extras_ids = migrated.map(item => item.extra_id || item.id).filter(Boolean);
      product.extras_count = migrated.length;
      writeProducts();
      return migrated;
    }

    return [];
  }

  function getProductExtrasCount(product) {
    if (!product) return 0;
    return getProductLinkedExtras(product).length || Number(product.extras_count || 0) || (Array.isArray(product.extras_ids) ? product.extras_ids.length : 0);
  }

  function filteredProducts() {
    const q = String(document.getElementById('prodComSearch')?.value || '').trim().toLowerCase();
    const estado = String(document.getElementById('prodComEstado')?.value || 'todos').trim().toLowerCase();
    return PRODUCTOS_COMESTIBLES.filter(p => {
      const haystack = [p.nombre, p.categoria, p.estado, p.badge].join(' ').toLowerCase();
      const status = String(p.estado || '').toLowerCase();
      return (!q || haystack.includes(q)) && (estado === 'todos' || status === estado);
    });
  }

  function renderTable() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;
    const rows = filteredProducts();
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="10" class="prodComEmpty">No hay productos comestibles con estos filtros.</td></tr>'; return; }
    tbody.innerHTML = rows.map(p => `<tr><td><div class="prodComCell"><div class="prodComThumb">${p.imagenes && p.imagenes[0] ? `<img src="${escapeHtml(p.imagenes[0])}" alt="">` : '<span>IMG</span>'}</div><div><strong>${escapeHtml(p.nombre)}</strong><span>${escapeHtml(p.categoria)}</span></div></div></td><td><span class="prodComBadge prodComBadge--blue">Producto simple</span></td><td><strong>${money(p.precio)}</strong></td><td>${(p.versiones || []).length}</td><td>${getProductExtrasCount(p)}</td><td>${(p.sinCosto || []).length}</td><td>${(p.recomendados || []).length}</td><td>${(p.imagenes || []).filter(Boolean).length}/6</td><td><span class="prodComBadge ${p.estado === 'Activo' ? 'prodComBadge--green' : 'prodComBadge--gray'}">${escapeHtml(p.estado)}</span></td><td><button type="button" class="prodComEdit" data-edit-com="${escapeHtml(p.id)}">Editar</button></td></tr>`).join('');
  }

  function blankProduct() {
    return { id: '', nombre: 'Nuevo producto comestible', categoria: 'Categoría', estado: 'Borrador', precio: 0, badge: 'Nuevo', descripcion: '', promesa: '', imagenes: ['', '', '', '', '', ''], versiones: [{ nombre: 'Mini', descripcion: 'Opción base.', precio: 0, estado: 'Incluido', badge: '' }], extras: [], extras_ids: [], extras_count: 0, sinCosto: [{ nombre: 'Sin ingrediente', descripcion: 'Personalizá el producto.', estado: 'Incluido' }], recomendados: [] };
  }

  function openSlide(product) {
    const slide = document.getElementById('prodComSlide');
    const overlay = document.getElementById('prodComOverlay');
    const title = document.getElementById('prodComSlideTitle');
    const body = document.getElementById('prodComSlideBody');
    if (!slide || !overlay || !body) return;
    const linkedExtras = getProductLinkedExtras(product);
    slide.dataset.productId = product.id || '';
    if (title) title.textContent = product.nombre;
    body.innerHTML = renderEditor(Object.assign({}, product, { extras: linkedExtras }));
    overlay.classList.add('is-active');
    slide.classList.add('is-active');
    slide.setAttribute('aria-hidden', 'false');
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder === 'function' && linkedExtras.length) {
      window.ProductosExtrasSelector.renderSelectedExtrasIntoBuilder(linkedExtras.map((item) => ({
        id: item.extra_id || item.id || item.nombre,
        extra_id: item.extra_id || item.id || item.nombre,
        title: item.title || item.nombre,
        description: item.description || item.descripcion,
        price: item.price != null ? item.price : item.precio,
        status: item.status || item.estado || 'Activo',
        badge: item.badge || '',
        folder: item.folder || '',
        tags: item.tags || '',
        image: item.image || item.imagen || ''
      })));
    }
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') {
      window.ProductosExtrasSelector.ensurePickButtons();
    }
  }

  function closeSlide() {
    const slide = document.getElementById('prodComSlide');
    const overlay = document.getElementById('prodComOverlay');
    const body = document.getElementById('prodComSlideBody');
    if (overlay) overlay.classList.remove('is-active');
    if (slide) { slide.classList.remove('is-active'); slide.setAttribute('aria-hidden', 'true'); slide.dataset.productId = ''; }
    if (body) body.innerHTML = '';
  }

  function renderEditor(product) {
    return `<div class="prodComBuilder prodComBuilder--full"><section class="prodComEditor prodComEditor--full">${identitySection(product)}${imagesSection(product)}${optionsSection('Tamaño', 'Elegí tu versión', 'versiones', product.versiones || [], true, 'Agregá tamaños o presentaciones: Mini, Mediano, 6 porciones, 12 porciones, familiar, etc.')}${optionsSection('Extras', 'Agregá algo más', 'extras', product.extras || [], true, 'Los extras se traen exclusivamente desde el Banco de extras para evitar duplicados y variaciones manuales.', 'Banco de extras')}${optionsSection('Sin costo', 'Sacá ingredientes', 'sinCosto', product.sinCosto || [], false, 'Opciones para que el comprador quite ingredientes sin modificar el precio.')}${optionsSection('Recomendados', 'Sumá al pedido', 'recomendados', product.recomendados || [], true, 'Luego esta sección va a seleccionar productos o combos existentes. Por ahora queda preparada como asociación editable.', 'Selector de productos')}${payloadSection(product)}</section></div>`;
  }

  function field(label, id, value, type = 'text') { return `<label class="prodComField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}"></label>`; }
  function select(label, id, value, options) { return `<label class="prodComField"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}">${options.map(opt => `<option value="${escapeHtml(opt)}" ${String(opt) === String(value) ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`; }

  function identitySection(product) {
    return `<section class="prodComSection"><div class="prodComSection__head"><div><span class="prodComEyebrow">Paso 1 · Identidad</span><h3>Información principal</h3><p>Esto alimenta el encabezado de la página de producto.</p></div><span class="prodComBadge prodComBadge--blue">Producto simple</span></div><div class="prodComGrid">${field('Nombre del producto', 'com_nombre', product.nombre)}${field('Categoría visible', 'com_categoria', product.categoria)}${field('Badge comercial', 'com_badge', product.badge)}${field('Precio base', 'com_precio', product.precio, 'number')}${field('Promesa de entrega', 'com_promesa', product.promesa)}${select('Estado', 'com_estado', product.estado, ['Activo', 'Borrador', 'Oculto'])}</div><label class="prodComField prodComField--full"><span>Descripción</span><textarea id="com_descripcion">${escapeHtml(product.descripcion)}</textarea></label></section>`;
  }

  function imagesSection(product) {
    return `<section class="prodComSection"><div class="prodComSection__head"><div><span class="prodComEyebrow">Paso 2 · Galería</span><h3>Imágenes del producto</h3><p>La primera imagen será la principal. Podés preparar hasta 6 imágenes.</p></div><span class="prodComBadge prodComBadge--green">${(product.imagenes || []).filter(Boolean).length}/6 cargadas</span></div><div class="prodComImages">${Array.from({ length: 6 }).map((_, i) => imageField(i, (product.imagenes || [])[i] || '')).join('')}</div></section>`;
  }

  function imageField(index, value) { return `<label class="prodComImageField"><span>Imagen ${index + 1}${index === 0 ? ' · Principal' : ''}</span><div class="prodComImagePreview">${value ? `<img src="${escapeHtml(value)}" alt="">` : `<b>IMG ${index + 1}</b>`}</div><input type="url" id="com_img_${index + 1}" value="${escapeHtml(value)}" placeholder="URL de imagen"></label>`; }

  function optionsSection(kicker, title, key, items, hasPrice, helper, sourceBadge) {
    const sectionBadge = sourceBadge || 'Estructura fija';
    const listHtml = key === 'extras' && !items.length
      ? '<div class="prodComExtrasEmptyState">Sin extras seleccionados. Usá + Agregar Extra para traerlos desde el Banco.</div>'
      : items.map((item, index) => optionEditor(key, item, index, hasPrice)).join('');
    const addBtn = key === 'extras' ? '' : `<button type="button" class="prodComAdd" data-add-com-option="${escapeHtml(key)}">+ Agregar opción</button>`;
    const bankBtn = key === 'extras' ? '<button type="button" class="prodComSecondaryAction prodComBankPick" data-open-extra-bank="append">+ Agregar Extra</button>' : '';
    const recommendedBtn = key === 'recomendados' ? '<button type="button" class="prodComSecondaryAction" disabled>Seleccionar productos · Fase siguiente</button>' : '';
    return `<section class="prodComSection" data-prod-com-section="${escapeHtml(key)}"><div class="prodComSection__head"><div><span class="prodComEyebrow">${escapeHtml(kicker)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(helper || 'Estructura fija orientada a conversión. Solo editás las tarjetas.')}</p></div><span class="prodComBadge prodComBadge--gray">${escapeHtml(sectionBadge)}</span></div><div class="prodComOptions${key === 'extras' && items.length ? ' prodComOptions--selectedExtras' : ''}" data-options-key="${escapeHtml(key)}">${listHtml}</div><div class="prodComSectionActions">${addBtn}${bankBtn}${recommendedBtn}</div></section>`;
  }

  function optionEditor(key, item, index, hasPrice) {
    const visualImage = item.imagen || item.image ? `<img src="${escapeHtml(item.imagen || item.image)}" alt="">` : '<span>4×4</span>';
    return `<article class="prodComOption" data-option-key="${escapeHtml(key)}"><div class="prodComOption__num">${index + 1}</div><div class="prodComOption__visual">${visualImage}</div><div class="prodComGrid prodComGrid--option">${field('Nombre', `${key}_${index}_nombre`, item.nombre || item.title || '')}${field('Descripción', `${key}_${index}_desc`, item.descripcion || item.description || '')}${hasPrice ? field('Precio adicional', `${key}_${index}_precio`, item.precio != null ? item.precio : (item.price || 0), 'number') : select('Costo', `${key}_${index}_costo`, 'Incluido', ['Incluido'])}${select('Estado', `${key}_${index}_estado`, item.estado || item.status || 'Activo', ['Activo', 'Incluido', 'Agotado', 'Oculto'])}${field('Badge', `${key}_${index}_badge`, item.badge || '')}${field('Imagen 4x4', `${key}_${index}_img`, item.imagen || item.image || '', 'url')}</div></article>`;
  }

  function addOptionCard(key) {
    if (key === 'extras') return;
    const list = document.querySelector(`.prodComOptions[data-options-key="${key}"]`);
    if (!list) return;
    const index = list.querySelectorAll('.prodComOption').length;
    const hasPrice = key !== 'sinCosto';
    const preset = Object.assign({}, OPTION_PRESETS[key] || OPTION_PRESETS.versiones);
    list.insertAdjacentHTML('beforeend', optionEditor(key, preset, index, hasPrice));
    const added = list.querySelector('.prodComOption:last-child');
    if (added) added.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function payloadSection(product) {
    const payload = { product_id: product.id || 'nuevo', product_type: 'producto_simple', combo: false, structure_locked: true, relation_model: 'entity_extra_links', sections: ['identity', 'images', 'size', 'extras_bank_links', 'removables', 'recommended_product_links'], future_keys: ['user_id', 'workspace_id', 'store_id', 'draft_version', 'published_version'] };
    return `<section class="prodComSection prodComSection--payload"><div class="prodComSection__head"><div><span class="prodComEyebrow">Salida futura</span><h3>Payload que irá a Supabase</h3><p>En esta fase no se guarda real. Dejamos la estructura lista para cuenta, tienda y versión.</p></div><span class="prodComBadge prodComBadge--blue">Mock local</span></div><pre class="prodComPayload">${escapeHtml(JSON.stringify(payload, null, 2))}</pre></section>`;
  }

  function collectOptions(key, hasPrice) {
    return Array.from(document.querySelectorAll(`.prodComOptions[data-options-key="${key}"] .prodComOption`)).map((card, index) => ({
      nombre: valueOf(`${key}_${index}_nombre`),
      descripcion: valueOf(`${key}_${index}_desc`),
      precio: hasPrice ? Number(valueOf(`${key}_${index}_precio`) || 0) : 0,
      estado: valueOf(`${key}_${index}_estado`) || 'Activo',
      badge: valueOf(`${key}_${index}_badge`),
      imagen: valueOf(`${key}_${index}_img`)
    })).filter(item => item.nombre || item.descripcion || item.imagen);
  }

  function collectSelectedExtras() {
    return Array.from(document.querySelectorAll('.prodComOptions[data-options-key="extras"] .prodComSelectedExtraCard')).map((card, index) => ({
      id: card.dataset.extraSourceId || valueOf(`extras_${index}_nombre`),
      extra_id: card.dataset.extraSourceId || '',
      nombre: valueOf(`extras_${index}_nombre`),
      title: valueOf(`extras_${index}_nombre`),
      descripcion: valueOf(`extras_${index}_desc`),
      description: valueOf(`extras_${index}_desc`),
      precio: Number(valueOf(`extras_${index}_precio`) || 0),
      price: Number(valueOf(`extras_${index}_precio`) || 0),
      estado: valueOf(`extras_${index}_estado`) || 'Activo',
      status: valueOf(`extras_${index}_estado`) || 'Activo',
      badge: valueOf(`extras_${index}_badge`),
      imagen: valueOf(`extras_${index}_img`),
      image: valueOf(`extras_${index}_img`),
      folder: valueOf(`extras_${index}_folder`),
      tags: valueOf(`extras_${index}_tags`)
    })).filter(item => item.nombre || item.extra_id);
  }

  function saveLocal() {
    const btn = document.getElementById('prodComSaveBtn');
    const slide = document.getElementById('prodComSlide');
    const currentId = slide?.dataset.productId || '';
    const nombre = valueOf('com_nombre') || 'Nuevo producto comestible';
    const id = currentId || 'prod-com-' + slugify(nombre) + '-' + Date.now();
    const selectedExtras = collectSelectedExtras();
    const api = getExtraLinksApi();
    const links = api.setLinksForOwner(OWNER_TYPE, id, selectedExtras);
    const extrasIds = links.map(link => link.extra_id).filter(Boolean);

    const payload = {
      id,
      product_id: id,
      product_type: 'food_simple_product',
      combo: false,
      structure_locked: true,
      relation_model: 'entity_extra_links',
      nombre,
      categoria: valueOf('com_categoria') || 'Categoría',
      badge: valueOf('com_badge'),
      precio: Number(valueOf('com_precio') || 0),
      promesa: valueOf('com_promesa'),
      estado: valueOf('com_estado') || 'Borrador',
      descripcion: valueOf('com_descripcion'),
      imagenes: Array.from({ length: 6 }).map((_, i) => valueOf(`com_img_${i + 1}`)).filter(Boolean),
      versiones: collectOptions('versiones', true),
      extras: [],
      extras_ids: extrasIds,
      extras_count: extrasIds.length,
      sinCosto: collectOptions('sinCosto', false),
      recomendados: collectOptions('recomendados', true)
    };

    const index = PRODUCTOS_COMESTIBLES.findIndex(item => item.id === id);
    if (index >= 0) PRODUCTOS_COMESTIBLES[index] = payload;
    else PRODUCTOS_COMESTIBLES.unshift(payload);

    writeProducts();
    renderTable();

    if (slide) slide.dataset.productId = id;
    const title = document.getElementById('prodComSlideTitle');
    if (title) title.textContent = nombre;

    console.log('[productos-comestibles.js] Producto guardado con links reutilizables:', { producto: payload, extra_links: links });
    window.dispatchEvent(new CustomEvent('productos-comestibles:saved', { detail: { producto: payload, extra_links: links } }));

    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Producto preparado';
    btn.classList.add('is-success');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('is-success'); }, 1500);
  }

  function valueOf(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

  function scheduleProductosComestiblesMount() {
    setTimeout(initProductosComestibles, 0);
    setTimeout(initProductosComestibles, 80);
    setTimeout(initProductosComestibles, 260);
    setTimeout(initProductosComestibles, 520);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleProductosComestiblesMount);
  } else {
    scheduleProductosComestiblesMount();
  }

  document.addEventListener('sazzu:page:load', scheduleProductosComestiblesMount);
  window.ProductosComestiblesMount = scheduleProductosComestiblesMount;
})();
