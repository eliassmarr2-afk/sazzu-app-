(function () {
  const PRODUCTOS_COMESTIBLES = [
    {
      id: 'box-dulce-nube',
      nombre: 'Box Dulce Nube',
      categoria: 'Postre armado',
      estado: 'Activo',
      precio: 9800,
      badge: '15% OFF',
      descripcion: 'Una caja pensada para resolver antojo, regalo o sobremesa sin pensar demasiado.',
      promesa: 'Llega HOY a CABA pidiendo en las próximas 2 horas',
      imagenes: [
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
        '', '', '', '', ''
      ],
      versiones: [
        { nombre: 'Mini', descripcion: 'Tamaño del box · Opción base del box.', precio: 0, estado: 'Incluido', badge: '' },
        { nombre: 'Mediano', descripcion: 'Mejor equilibrio entre precio y cantidad.', precio: 4200, estado: 'Activo', badge: 'Más elegido' },
        { nombre: 'Premium', descripcion: 'No disponible por stock.', precio: 0, estado: 'Agotado', badge: '' }
      ],
      extras: [
        { nombre: 'Salsa extra de chocolate', descripcion: 'Extra recomendado para mejorar el pedido.', precio: 900, estado: 'Activo', badge: 'Banco de extras' },
        { nombre: 'Caja regalo', descripcion: 'Extra recomendado para mejorar el pedido.', precio: 1800, estado: 'Activo', badge: 'Banco de extras' }
      ],
      sinCosto: [
        { nombre: 'Sin nueces', descripcion: 'Personalizá el producto.', estado: 'Incluido' },
        { nombre: 'Sin coco rallado', descripcion: 'Personalizá el producto.', estado: 'Incluido' }
      ],
      recomendados: [
        { nombre: 'Velita de cumpleaños', descripcion: 'Sumalo al pedido sin fricción.', precio: 700, estado: 'Activo', badge: 'Recomendado' },
        { nombre: 'Tarjeta con dedicatoria', descripcion: 'Sumalo al pedido sin fricción.', precio: 1200, estado: 'Activo', badge: '' }
      ]
    },
    {
      id: 'torta-choco-cream',
      nombre: 'Torta Choco Cream',
      categoria: 'Torta',
      estado: 'Activo',
      precio: 16500,
      badge: 'Especial',
      descripcion: 'Torta húmeda con crema suave y terminación lista para regalo.',
      promesa: 'Entrega coordinada según zona.',
      imagenes: [
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
        '', '', '', '', ''
      ],
      versiones: [
        { nombre: 'Chica', descripcion: 'Rinde 4 porciones.', precio: 0, estado: 'Incluido', badge: '' },
        { nombre: 'Mediana', descripcion: 'Rinde 8 porciones.', precio: 5400, estado: 'Activo', badge: 'Más elegido' },
        { nombre: 'Grande', descripcion: 'Rinde 12 porciones.', precio: 8900, estado: 'Activo', badge: '' }
      ],
      extras: [
        { nombre: 'Mensaje en chocolate', descripcion: 'Agregá una frase breve.', precio: 1200, estado: 'Activo', badge: 'Banco de extras' }
      ],
      sinCosto: [
        { nombre: 'Sin decoración crocante', descripcion: 'Personalizá el producto.', estado: 'Incluido' }
      ],
      recomendados: [
        { nombre: 'Velas numéricas', descripcion: 'Ideal para cumpleaños.', precio: 2500, estado: 'Activo', badge: 'Recomendado' }
      ]
    },
    {
      id: 'muffins-mix',
      nombre: 'Muffins Mix',
      categoria: 'Muffins',
      estado: 'Borrador',
      precio: 7200,
      badge: 'Nuevo',
      descripcion: 'Caja de muffins surtidos para merienda rápida.',
      promesa: 'Disponible para retiro o envío.',
      imagenes: [
        'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=80',
        '', '', '', '', ''
      ],
      versiones: [
        { nombre: 'x4', descripcion: 'Caja chica.', precio: 0, estado: 'Incluido', badge: '' },
        { nombre: 'x6', descripcion: 'Caja recomendada.', precio: 2600, estado: 'Activo', badge: 'Más elegido' },
        { nombre: 'x12', descripcion: 'Caja para compartir.', precio: 7200, estado: 'Activo', badge: '' }
      ],
      extras: [
        { nombre: 'Dip de chocolate', descripcion: 'Acompañamiento para muffins.', precio: 900, estado: 'Activo', badge: 'Banco de extras' }
      ],
      sinCosto: [
        { nombre: 'Sin chips', descripcion: 'Personalizá el producto.', estado: 'Incluido' }
      ],
      recomendados: [
        { nombre: 'Café frío 350 ml', descripcion: 'Ideal para acompañar algo dulce.', precio: 1900, estado: 'Activo', badge: '' }
      ]
    }
  ];

  const OPTION_PRESETS = {
    versiones: { nombre: 'Nueva versión', descripcion: 'Ej: 6 porciones, 12 porciones, individual o familiar.', precio: 0, estado: 'Activo', badge: '', imagen: '' },
    extras: { nombre: 'Seleccionar extra del banco', descripcion: 'Extra global pendiente de selección.', precio: 0, estado: 'Activo', badge: 'Banco de extras', imagen: '' },
    sinCosto: { nombre: 'Nueva opción sin costo', descripcion: 'Ej: sin nueces, sin coco, sin azúcar agregada.', estado: 'Incluido', imagen: '' },
    recomendados: { nombre: 'Seleccionar producto recomendado', descripcion: 'Producto existente pendiente de selección.', precio: 0, estado: 'Activo', badge: 'Recomendado', imagen: '' }
  };

  function initProductosComestibles() {
    const shell = document.querySelector('body[data-page="productos"] .prodShell');
    if (!shell || shell.dataset.comestiblesReady === '1') return;
    shell.dataset.comestiblesReady = '1';
    mountTab();
    mountPanel();
    mountSlide();
    bindUi();
    renderTable();
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
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
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
        const addButton = event.target.closest('[data-add-com-option]');
        if (!addButton) return;
        event.preventDefault();
        addOptionCard(addButton.dataset.addComOption);
      });
    }
  }

  function activateTab() {
    document.querySelectorAll('.prodTab').forEach(btn => { const active = btn.id === 'prodTabComestibles'; btn.classList.toggle('is-active', active); btn.setAttribute('aria-selected', active ? 'true' : 'false'); });
    document.querySelectorAll('.prodPanelTab').forEach(panel => { panel.style.display = panel.id === 'prodPanelComestibles' ? 'block' : 'none'; });
    renderTable();
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
    tbody.innerHTML = rows.map(p => `<tr><td><div class="prodComCell"><div class="prodComThumb">${p.imagenes && p.imagenes[0] ? `<img src="${escapeHtml(p.imagenes[0])}" alt="">` : '<span>IMG</span>'}</div><div><strong>${escapeHtml(p.nombre)}</strong><span>${escapeHtml(p.categoria)}</span></div></div></td><td><span class="prodComBadge prodComBadge--blue">Producto simple</span></td><td><strong>${money(p.precio)}</strong></td><td>${p.versiones.length}</td><td>${p.extras.length}</td><td>${p.sinCosto.length}</td><td>${p.recomendados.length}</td><td>${(p.imagenes || []).filter(Boolean).length}/6</td><td><span class="prodComBadge ${p.estado === 'Activo' ? 'prodComBadge--green' : 'prodComBadge--gray'}">${escapeHtml(p.estado)}</span></td><td><button type="button" class="prodComEdit" data-edit-com="${escapeHtml(p.id)}">Editar</button></td></tr>`).join('');
  }

  function blankProduct() {
    return { id: 'nuevo-producto-comestible', nombre: 'Nuevo producto comestible', categoria: 'Categoría', estado: 'Borrador', precio: 0, badge: 'Nuevo', descripcion: '', promesa: '', imagenes: ['', '', '', '', '', ''], versiones: [{ nombre: 'Mini', descripcion: 'Opción base.', precio: 0, estado: 'Incluido', badge: '' }], extras: [{ nombre: 'Seleccionar extra del banco', descripcion: 'Extra global pendiente de selección.', precio: 0, estado: 'Activo', badge: 'Banco de extras' }], sinCosto: [{ nombre: 'Sin ingrediente', descripcion: 'Personalizá el producto.', estado: 'Incluido' }], recomendados: [{ nombre: 'Seleccionar producto recomendado', descripcion: 'Sumalo al pedido.', precio: 0, estado: 'Activo', badge: 'Recomendado' }] };
  }

  function openSlide(product) {
    const slide = document.getElementById('prodComSlide');
    const overlay = document.getElementById('prodComOverlay');
    const title = document.getElementById('prodComSlideTitle');
    const body = document.getElementById('prodComSlideBody');
    if (!slide || !overlay || !body) return;
    slide.dataset.productId = product.id;
    if (title) title.textContent = product.nombre;
    body.innerHTML = renderEditor(product);
    overlay.classList.add('is-active');
    slide.classList.add('is-active');
    slide.setAttribute('aria-hidden', 'false');
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
    return `<div class="prodComBuilder prodComBuilder--full"><section class="prodComEditor prodComEditor--full">${identitySection(product)}${imagesSection(product)}${optionsSection('Tamaño', 'Elegí tu versión', 'versiones', product.versiones, true, 'Agregá tamaños o presentaciones: Mini, Mediano, 6 porciones, 12 porciones, familiar, etc.')}${optionsSection('Extras', 'Agregá algo más', 'extras', product.extras, true, 'Estos extras deberían venir del Banco de extras. Por ahora quedan como asociaciones editables hasta crear el sub-slide del banco.', 'Banco de extras')}${optionsSection('Sin costo', 'Sacá ingredientes', 'sinCosto', product.sinCosto, false, 'Opciones para que el comprador quite ingredientes sin modificar el precio.')}${optionsSection('Recomendados', 'Sumá al pedido', 'recomendados', product.recomendados, true, 'Luego esta sección va a seleccionar productos o combos existentes. Por ahora queda preparada como asociación editable.', 'Selector de productos')}${payloadSection(product)}</section></div>`;
  }

  function field(label, id, value, type = 'text') { return `<label class="prodComField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}"></label>`; }
  function select(label, id, value, options) { return `<label class="prodComField"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}">${options.map(opt => `<option value="${escapeHtml(opt)}" ${String(opt) === String(value) ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`; }

  function identitySection(product) {
    return `<section class="prodComSection"><div class="prodComSection__head"><div><span class="prodComEyebrow">Paso 1 · Identidad</span><h3>Información principal</h3><p>Esto alimenta el encabezado de la página de producto.</p></div><span class="prodComBadge prodComBadge--blue">Producto simple</span></div><div class="prodComGrid">${field('Nombre del producto', 'com_nombre', product.nombre)}${field('Categoría visible', 'com_categoria', product.categoria)}${field('Badge comercial', 'com_badge', product.badge)}${field('Precio base', 'com_precio', product.precio, 'number')}${field('Promesa de entrega', 'com_promesa', product.promesa)}${select('Estado', 'com_estado', product.estado, ['Activo', 'Borrador', 'Oculto'])}</div><label class="prodComField prodComField--full"><span>Descripción</span><textarea id="com_descripcion">${escapeHtml(product.descripcion)}</textarea></label></section>`;
  }

  function imagesSection(product) {
    return `<section class="prodComSection"><div class="prodComSection__head"><div><span class="prodComEyebrow">Paso 2 · Galería</span><h3>Imágenes del producto</h3><p>La primera imagen será la principal. Podés preparar hasta 6 imágenes.</p></div><span class="prodComBadge prodComBadge--green">${(product.imagenes || []).filter(Boolean).length}/6 cargadas</span></div><div class="prodComImages">${Array.from({ length: 6 }).map((_, i) => imageField(i, product.imagenes[i] || '')).join('')}</div></section>`;
  }

  function imageField(index, value) { return `<label class="prodComImageField"><span>Imagen ${index + 1}${index === 0 ? ' · Principal' : ''}</span><div class="prodComImagePreview">${value ? `<img src="${escapeHtml(value)}" alt="">` : `<b>IMG ${index + 1}</b>`}</div><input type="url" id="com_img_${index + 1}" value="${escapeHtml(value)}" placeholder="URL de imagen"></label>`; }

  function optionsSection(kicker, title, key, items, hasPrice, helper, sourceBadge) {
    const sectionBadge = sourceBadge || 'Estructura fija';
    return `<section class="prodComSection" data-prod-com-section="${escapeHtml(key)}"><div class="prodComSection__head"><div><span class="prodComEyebrow">${escapeHtml(kicker)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(helper || 'Estructura fija orientada a conversión. Solo editás las tarjetas.')}</p></div><span class="prodComBadge prodComBadge--gray">${escapeHtml(sectionBadge)}</span></div><div class="prodComOptions" data-options-key="${escapeHtml(key)}">${items.map((item, index) => optionEditor(key, item, index, hasPrice)).join('')}</div><div class="prodComSectionActions"><button type="button" class="prodComAdd" data-add-com-option="${escapeHtml(key)}">+ Agregar opción</button>${key === 'extras' ? '<button type="button" class="prodComSecondaryAction" disabled>Abrir banco de extras · Fase siguiente</button>' : ''}${key === 'recomendados' ? '<button type="button" class="prodComSecondaryAction" disabled>Seleccionar productos · Fase siguiente</button>' : ''}</div></section>`;
  }

  function optionEditor(key, item, index, hasPrice) {
    const visualImage = item.imagen ? `<img src="${escapeHtml(item.imagen)}" alt="">` : '<span>4×4</span>';
    return `<article class="prodComOption" data-option-key="${escapeHtml(key)}"><div class="prodComOption__num">${index + 1}</div><div class="prodComOption__visual">${visualImage}</div><div class="prodComGrid prodComGrid--option">${field('Nombre', `${key}_${index}_nombre`, item.nombre)}${field('Descripción', `${key}_${index}_desc`, item.descripcion)}${hasPrice ? field('Precio adicional', `${key}_${index}_precio`, item.precio, 'number') : select('Costo', `${key}_${index}_costo`, 'Incluido', ['Incluido'])}${select('Estado', `${key}_${index}_estado`, item.estado || 'Activo', ['Activo', 'Incluido', 'Agotado', 'Oculto'])}${field('Badge', `${key}_${index}_badge`, item.badge || '')}${field('Imagen 4x4', `${key}_${index}_img`, item.imagen || '', 'url')}</div></article>`;
  }

  function addOptionCard(key) {
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
    const payload = { product_id: product.id, product_type: 'producto_simple', combo: false, structure_locked: true, sections: ['identity', 'images', 'size', 'extras_bank_links', 'removables', 'recommended_product_links'], future_keys: ['user_id', 'workspace_id', 'store_id', 'draft_version', 'published_version'] };
    return `<section class="prodComSection prodComSection--payload"><div class="prodComSection__head"><div><span class="prodComEyebrow">Salida futura</span><h3>Payload que irá a Supabase</h3><p>En esta fase no se guarda real. Dejamos la estructura lista para cuenta, tienda y versión.</p></div><span class="prodComBadge prodComBadge--blue">Mock local</span></div><pre class="prodComPayload">${escapeHtml(JSON.stringify(payload, null, 2))}</pre></section>`;
  }

  function saveLocal() {
    const btn = document.getElementById('prodComSaveBtn');
    const payload = { product_id: document.getElementById('prodComSlide')?.dataset.productId || 'nuevo', product_type: 'food_simple_product', combo: false, structure_locked: true, identity: { nombre: valueOf('com_nombre'), categoria: valueOf('com_categoria'), badge: valueOf('com_badge'), precio: Number(valueOf('com_precio') || 0), promesa: valueOf('com_promesa'), estado: valueOf('com_estado'), descripcion: valueOf('com_descripcion') }, imagenes: Array.from({ length: 6 }).map((_, i) => valueOf(`com_img_${i + 1}`)).filter(Boolean) };
    console.log('[productos-comestibles.js] Borrador local preparado:', payload);
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Borrador preparado';
    btn.classList.add('is-success');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('is-success'); }, 1500);
  }

  function valueOf(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

  document.addEventListener('DOMContentLoaded', initProductosComestibles);
  document.addEventListener('sazzu:page:load', function () { setTimeout(initProductosComestibles, 80); setTimeout(initProductosComestibles, 260); });
  window.ProductosComestiblesMount = initProductosComestibles;
})();
