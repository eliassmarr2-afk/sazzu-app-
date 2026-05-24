(function () {
  const COMBO_LINK_OWNER_TYPE = 'combo';

  const PRODUCTOS_COMESTIBLES_REFERENCIA = [
    { id: 'box-dulce-nube', nombre: 'Box Dulce Nube', precio: 9800, imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80' },
    { id: 'torta-choco-cream', nombre: 'Torta Choco Cream', precio: 16500, imagen: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80' },
    { id: 'muffins-mix', nombre: 'Muffins Mix', precio: 7200, imagen: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=80' },
    { id: 'cookies-con-chips', nombre: 'Cookies con chips', precio: 2200, imagen: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=80' },
    { id: 'mini-alfajores', nombre: 'Mini alfajores', precio: 2600, imagen: 'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?auto=format&fit=crop&w=900&q=80' }
  ];

  const COMBO_MOCK = {
    id: 'combo-merienda-duo',
    nombre: 'Merienda Dúo',
    categoria: 'Combo rápido',
    estado: 'Borrador',
    precio: 12900,
    badge: 'Combo recomendado',
    descripcion: 'Combo rápido pensado para dos personas. Incluye piezas dulces y bebidas para convertir el pedido en una merienda completa sin configurar demasiado.',
    promesa: 'Llega gratis según zona configurada.',
    imagenes: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80', '', '', '', '', ''],
    incluidos: [
      { nombre: 'Muffins surtidos', cantidad: '2 unidades', descripcion: 'Componente del pack base.', incluido: true, imagen: '' },
      { nombre: 'Brownie', cantidad: '1 unidad', descripcion: 'Componente del pack base.', incluido: true, imagen: '' },
      { nombre: 'Café frío', cantidad: '2 unidades', descripcion: 'Componente del pack base.', incluido: true, imagen: '' }
    ],
    opcionales: [
      { productId: 'cookies-con-chips', cantidad: '2 unidades', agregado: false },
      { productId: 'mini-alfajores', cantidad: '3 unidades', agregado: true }
    ],
    extrasCombo: [],
    extras_ids: [],
    extras_count: 0
  };

  function initProductosCombos() {
    const body = document.querySelector('body[data-page="productos"]');
    const panel = document.getElementById('prodPanelComestibles');
    if (!body || !panel) { setTimeout(initProductosCombos, 180); return; }
    ensureExtraLinksEngine();
    mountComboLauncher(panel);
    mountComboSlide();
    bindComboUi();
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
    return null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function money(value) { return '$ ' + Number(value || 0).toLocaleString('es-AR'); }

  function getProductoComestible(productId) {
    return PRODUCTOS_COMESTIBLES_REFERENCIA.find((product) => product.id === productId) || PRODUCTOS_COMESTIBLES_REFERENCIA[0];
  }

  function normalizeExtraForSelector(extra) {
    const data = extra || {};
    return {
      id: data.extra_id || data.id || data.nombre || data.title,
      extra_id: data.extra_id || data.id || data.nombre || data.title,
      title: data.title || data.nombre || 'Extra',
      nombre: data.nombre || data.title || 'Extra',
      description: data.description || data.descripcion || '',
      descripcion: data.descripcion || data.description || '',
      price: data.price != null ? data.price : (data.precio || 0),
      precio: data.precio != null ? data.precio : (data.price || 0),
      status: data.status || data.estado || 'Activo',
      estado: data.estado || data.status || 'Activo',
      badge: data.badge || '',
      image: data.image || data.imagen || '',
      imagen: data.imagen || data.image || '',
      folder: data.folder || '',
      tags: data.tags || ''
    };
  }

  function getComboLinkedExtras(combo) {
    if (!combo || !combo.id) return Array.isArray(combo?.extrasCombo) ? combo.extrasCombo : [];
    const api = getExtraLinksApi();
    if (!api || typeof api.getExtrasForOwner !== 'function') return Array.isArray(combo.extrasCombo) ? combo.extrasCombo : [];
    const linked = api.getExtrasForOwner(COMBO_LINK_OWNER_TYPE, combo.id);
    if (linked.length) return linked;
    if (Array.isArray(combo.extrasCombo) && combo.extrasCombo.length && typeof api.setLinksForOwner === 'function') {
      api.setLinksForOwner(COMBO_LINK_OWNER_TYPE, combo.id, combo.extrasCombo);
      return api.getExtrasForOwner(COMBO_LINK_OWNER_TYPE, combo.id);
    }
    return [];
  }

  function collectComboExtras() {
    return Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard')).map((card, index) => ({
      id: card.dataset.extraSourceId || valueOf(`combo_extra_${index}_nombre`),
      extra_id: card.dataset.extraSourceId || valueOf(`combo_extra_${index}_extra_id`) || '',
      nombre: valueOf(`combo_extra_${index}_nombre`),
      title: valueOf(`combo_extra_${index}_nombre`),
      descripcion: valueOf(`combo_extra_${index}_desc`),
      description: valueOf(`combo_extra_${index}_desc`),
      precio: Number(valueOf(`combo_extra_${index}_precio`) || 0),
      price: Number(valueOf(`combo_extra_${index}_precio`) || 0),
      estado: valueOf(`combo_extra_${index}_estado`) || 'Activo',
      status: valueOf(`combo_extra_${index}_estado`) || 'Activo',
      badge: valueOf(`combo_extra_${index}_badge`),
      imagen: valueOf(`combo_extra_${index}_img`),
      image: valueOf(`combo_extra_${index}_img`),
      folder: valueOf(`combo_extra_${index}_folder`),
      tags: valueOf(`combo_extra_${index}_tags`)
    })).filter(item => item.nombre || item.extra_id);
  }

  function mountComboLauncher(panel) {
    if (document.getElementById('prodComboLauncher')) return;
    const guide = panel.querySelector('.prodComGuide');
    const block = document.createElement('section');
    block.className = 'prodComboLauncher';
    block.id = 'prodComboLauncher';
    block.innerHTML = `
      <div><span class="prodComboEyebrow">Constructor comercial</span><h3>Combos</h3><p>Creá combos con componentes incluidos y agregados opcionales. La estructura de la página no se edita: solo cargás el contenido.</p></div>
      <div class="prodComboLauncher__badges"><span>Combo</span><span>Valor incluido</span><span>Agregados opcionales</span></div>
      <button type="button" class="prodComboPrimary" id="prodComboNewBtn">+ Nuevo combo</button>
    `;
    if (guide) guide.insertAdjacentElement('afterend', block); else panel.prepend(block);
  }

  function mountComboSlide() {
    const main = document.querySelector('body[data-page="productos"] .main');
    if (!main || document.getElementById('prodComboSlide')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="prodComboOverlay" id="prodComboOverlay"></div>
      <aside class="prodComboSlide" id="prodComboSlide" aria-hidden="true">
        <header class="prodComboSlide__header">
          <div><span class="prodComboEyebrow">Constructor de combo</span><h2>Nuevo combo</h2><p>Cargá componentes. La estructura visual del combo queda fija para conversión rápida.</p></div>
          <div class="prodComboSlide__actions"><button type="button" class="prodComboGhost" id="prodComboSaveBtn">Guardar borrador local</button><button type="button" class="prodComboClose" id="prodComboCloseBtn" aria-label="Cerrar constructor de combo">×</button></div>
        </header>
        <div class="prodComboSlide__body" id="prodComboSlideBody"></div>
      </aside>`;
    main.appendChild(wrap);
  }

  function bindComboUi() {
    const newBtn = document.getElementById('prodComboNewBtn');
    const closeBtn = document.getElementById('prodComboCloseBtn');
    const overlay = document.getElementById('prodComboOverlay');
    const saveBtn = document.getElementById('prodComboSaveBtn');
    const body = document.getElementById('prodComboSlideBody');

    if (newBtn && newBtn.dataset.bound !== '1') { newBtn.dataset.bound = '1'; newBtn.addEventListener('click', function () { openComboSlide(COMBO_MOCK); }); }
    if (closeBtn && closeBtn.dataset.bound !== '1') { closeBtn.dataset.bound = '1'; closeBtn.addEventListener('click', closeComboSlide); }
    if (overlay && overlay.dataset.bound !== '1') { overlay.dataset.bound = '1'; overlay.addEventListener('click', closeComboSlide); }
    if (saveBtn && saveBtn.dataset.bound !== '1') { saveBtn.dataset.bound = '1'; saveBtn.addEventListener('click', saveComboLocal); }
    if (body && body.dataset.comboExtrasBound !== '1') {
      body.dataset.comboExtrasBound = '1';
      body.addEventListener('click', function (event) {
        const picker = event.target.closest('[data-combo-extra-picker]');
        if (!picker) return;
        event.preventDefault();
        if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.open === 'function') {
          window.ProductosExtrasSelector.open({ target: 'combo' });
        }
      });
    }
  }

  function openComboSlide(combo) {
    const slide = document.getElementById('prodComboSlide');
    const overlay = document.getElementById('prodComboOverlay');
    const body = document.getElementById('prodComboSlideBody');
    if (!slide || !overlay || !body) return;
    const linkedExtras = getComboLinkedExtras(combo);
    slide.dataset.comboId = combo.id;
    body.innerHTML = renderComboBuilder(Object.assign({}, combo, { extrasCombo: linkedExtras }));
    overlay.classList.add('is-active');
    slide.classList.add('is-active');
    slide.setAttribute('aria-hidden', 'false');
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder === 'function' && linkedExtras.length) {
      window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder(linkedExtras.map(normalizeExtraForSelector));
    }
    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.ensurePickButtons === 'function') window.ProductosExtrasSelector.ensurePickButtons();
  }

  function closeComboSlide() {
    const slide = document.getElementById('prodComboSlide');
    const overlay = document.getElementById('prodComboOverlay');
    const body = document.getElementById('prodComboSlideBody');
    if (overlay) overlay.classList.remove('is-active');
    if (slide) { slide.classList.remove('is-active'); slide.setAttribute('aria-hidden', 'true'); slide.dataset.comboId = ''; }
    if (body) body.innerHTML = '';
  }

  function renderComboBuilder(combo) {
    return `<div class="prodComboBuilder prodComboBuilder--full"><section class="prodComboEditor prodComboEditor--full">${identitySection(combo)}${imagesSection(combo)}${includedSection(combo)}${optionalSection(combo)}${comboExtrasSection(combo)}${payloadSection(combo)}</section></div>`;
  }

  function identitySection(combo) {
    return `<section class="prodComboSection"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Paso 1 · Identidad</span><h3>Información principal</h3><p>Esto alimenta el encabezado de la página del combo.</p></div><span class="prodComboBadge prodComboBadge--blue">Combo</span></div><div class="prodComboGrid">${field('Nombre del combo', 'combo_nombre', combo.nombre)}${field('Categoría visible', 'combo_categoria', combo.categoria)}${field('Badge comercial', 'combo_badge', combo.badge)}${field('Precio base del combo', 'combo_precio', combo.precio, 'number')}${field('Promesa de entrega', 'combo_promesa', combo.promesa)}${select('Estado', 'combo_estado', combo.estado, ['Activo', 'Borrador', 'Oculto'])}</div><label class="prodComboField prodComboField--full"><span>Descripción</span><textarea id="combo_descripcion">${escapeHtml(combo.descripcion)}</textarea></label></section>`;
  }

  function imagesSection(combo) {
    const imgs = combo.imagenes || [];
    return `<section class="prodComboSection"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Paso 2 · Galería</span><h3>Imágenes del combo</h3><p>La primera imagen será la principal. Podés preparar hasta 6 imágenes.</p></div><span class="prodComboBadge prodComboBadge--green">${imgs.filter(Boolean).length}/6 cargadas</span></div><div class="prodComboImages">${Array.from({ length: 6 }).map((_, i) => imageField(i, imgs[i] || '')).join('')}</div></section>`;
  }

  function includedSection(combo) {
    const incluidos = combo.incluidos || [];
    const removedCount = incluidos.filter(item => !item.incluido).length;
    return `<section class="prodComboSection"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Valor incluido</span><h3>Incluye este combo</h3><p>Estos componentes forman el pack base. Podés quitarlos, pero no muestran precio individual.</p></div><span class="prodComboBadge prodComboBadge--gray">Sin precio prorrateado</span></div>${removedCount ? `<div class="prodComboWarning"><strong>Modificaste el combo original</strong><span>Quitaste ${removedCount} componente. El precio puede mantenerse porque el combo conserva su estructura promocional.</span></div>` : ''}<div class="prodComboItems">${incluidos.map((item, index) => includedItem(item, index)).join('')}</div></section>`;
  }

  function optionalSection(combo) {
    const opcionales = combo.opcionales || [];
    return `<section class="prodComboSection"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Podés sumar</span><h3>Agregados opcionales</h3></div><span class="prodComboBadge prodComboBadge--blue">Trae productos comestibles</span></div><div class="prodComboItems">${opcionales.map((item, index) => optionalItem(item, index)).join('')}</div></section>`;
  }

  function comboExtrasSection(combo) {
    const extras = (combo.extrasCombo || []).map(normalizeExtraForSelector);
    const listHtml = extras.length
      ? extras.map((extra, index) => comboExtraCardHtml(extra, index)).join('')
      : '<div class="prodComboEmptyBox"><strong>Sin extras cargados todavía</strong><span>Usá + Agregar Extra para asociar extras reutilizables del banco a este combo.</span></div>';
    return `<section class="prodComboSection" data-prod-combo-extras-section="1"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Sumá extras al combo</span><h3>Extras del combo</h3><p>Los extras se traen desde el Banco de extras y se guardan como relaciones reutilizables.</p></div><span class="prodComboBadge prodComboBadge--gray">EntityExtraLinks</span></div><div class="prodComboExtrasList${extras.length ? ' prodComboExtrasList--selected' : ''}" data-combo-extras-list="1">${listHtml}</div><div class="prodComboExtrasActions"><button type="button" class="prodComboExtraAdd" data-combo-extra-picker="1" data-open-extra-bank="append" data-extra-target="combo">+ Agregar Extra</button></div></section>`;
  }

  function comboExtraCardHtml(extra, index) {
    const data = normalizeExtraForSelector(extra);
    const imageHtml = data.image ? `<img src="${escapeHtml(data.image)}" alt="">` : '<span>4×4</span>';
    const badgeHtml = data.badge ? `<span class="prodComboSelectedExtraCard__badge">${escapeHtml(data.badge)}</span>` : '<span class="prodComboSelectedExtraCard__badge prodComboSelectedExtraCard__badge--soft">Banco de extras</span>';
    return `<article class="prodComboSelectedExtraCard" data-combo-extra-card="1" data-extra-source-id="${escapeHtml(data.extra_id || data.id)}" data-extra-folder="${escapeHtml(data.folder)}" data-extra-tags="${escapeHtml(data.tags)}"><div class="prodComboSelectedExtraCard__image">${imageHtml}</div><div class="prodComboSelectedExtraCard__body"><strong>${escapeHtml(data.title)}</strong><span>${escapeHtml(data.description || 'Extra agregado al combo.')}</span></div><div class="prodComboSelectedExtraCard__meta">${badgeHtml}<b>+ ${money(data.price).replace('$', '$')}</b></div><button type="button" class="prodComboSelectedExtraCard__delete" data-remove-selected-extra="${escapeHtml(data.extra_id || data.id)}" aria-label="Eliminar extra ${escapeHtml(data.title)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg></button>${comboExtraHiddenFields(data, index)}</article>`;
  }

  function comboExtraHiddenFields(extra, index) {
    const data = normalizeExtraForSelector(extra);
    return [['id', data.id], ['extra_id', data.extra_id || data.id], ['nombre', data.title], ['desc', data.description], ['precio', data.price], ['estado', data.status], ['badge', data.badge], ['img', data.image], ['folder', data.folder], ['tags', data.tags]].map(pair => `<input type="hidden" id="combo_extra_${index}_${escapeHtml(pair[0])}" value="${escapeHtml(pair[1])}">`).join('');
  }

  function includedItem(item, index) {
    return `<article class="prodComboItem ${item.incluido ? 'is-included' : 'is-removed'}"><button type="button" class="prodComboToggle" aria-label="Estado incluido">${item.incluido ? '●' : '○'}</button><div class="prodComboItem__image"><span>4×4</span></div><div class="prodComboGrid prodComboGrid--item">${field('Nombre', `combo_incluido_${index}_nombre`, item.nombre)}${field('Cantidad', `combo_incluido_${index}_cantidad`, item.cantidad)}${field('Descripción', `combo_incluido_${index}_desc`, item.descripcion)}${select('Estado visual', `combo_incluido_${index}_estado`, item.incluido ? 'Marcado' : 'Desmarcado', ['Marcado', 'Desmarcado'])}${field('Imagen 4x4', `combo_incluido_${index}_img`, item.imagen || '', 'url')}<label class="prodComboField"><span>Texto estático</span><input value="Incluido en el combo original" readonly></label></div></article>`;
  }

  function optionalItem(item, index) {
    const product = getProductoComestible(item.productId);
    return `<article class="prodComboItem prodComboItem--product ${item.agregado ? 'is-added' : 'is-optional'}"><button type="button" class="prodComboToggle" aria-label="Estado agregado">${item.agregado ? '●' : '○'}</button><div class="prodComboItem__image prodComboItem__image--product">${product.imagen ? `<img src="${escapeHtml(product.imagen)}" alt="">` : '<span>4×4</span>'}</div><div class="prodComboGrid prodComboGrid--item">${productSelect('Producto comestible', `combo_opcional_${index}_product`, item.productId)}<label class="prodComboField"><span>Nombre tomado del producto</span><input value="${escapeHtml(product.nombre)}" readonly></label>${field('Cantidad', `combo_opcional_${index}_cantidad`, item.cantidad)}<label class="prodComboField"><span>Precio tomado del producto</span><input value="${escapeHtml(money(product.precio))}" readonly></label>${select('Estado visual', `combo_opcional_${index}_estado`, item.agregado ? 'Agregado' : 'Disponible', ['Disponible', 'Agregado', 'Oculto'])}<label class="prodComboField"><span>Texto estático</span><input value="${item.agregado ? 'Agregado al pedido' : 'Disponible para sumar'}" readonly></label></div></article>`;
  }

  function payloadSection(combo) {
    const payload = { combo_id: combo.id, product_type: 'food_combo_product', combo: true, structure_locked: true, relation_model: 'entity_extra_links', no_component_prorated_price: true, optional_addons_source: 'productos_comestibles', combo_extras_source: 'extras_bank', sections: ['identity', 'images', 'included_value', 'optional_addons', 'combo_extras'], future_keys: ['user_id', 'workspace_id', 'store_id', 'draft_version', 'published_version'] };
    return `<section class="prodComboSection prodComboSection--payload"><div class="prodComboSection__head"><div><span class="prodComboEyebrow">Salida futura</span><h3>Payload que irá a Supabase</h3><p>En esta fase no se guarda real. Dejamos la estructura lista para cuenta, tienda y versión.</p></div><span class="prodComboBadge prodComboBadge--blue">Mock local</span></div><pre class="prodComboPayload">${escapeHtml(JSON.stringify(payload, null, 2))}</pre></section>`;
  }

  function field(label, id, value, type = 'text') { return `<label class="prodComboField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}"></label>`; }
  function select(label, id, value, options) { return `<label class="prodComboField"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}">${options.map(opt => `<option value="${escapeHtml(opt)}" ${String(opt) === String(value) ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`; }
  function productSelect(label, id, value) { return `<label class="prodComboField"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}">${PRODUCTOS_COMESTIBLES_REFERENCIA.map(product => `<option value="${escapeHtml(product.id)}" ${String(product.id) === String(value) ? 'selected' : ''}>${escapeHtml(product.nombre)}</option>`).join('')}</select></label>`; }
  function imageField(index, value) { return `<label class="prodComboImageField"><span>Imagen ${index + 1}${index === 0 ? ' · Principal' : ''}</span><div class="prodComboImagePreview">${value ? `<img src="${escapeHtml(value)}" alt="">` : `<b>IMG ${index + 1}</b>`}</div><input id="combo_img_${index + 1}" type="url" value="${escapeHtml(value)}" placeholder="URL de imagen"></label>`; }

  function saveComboLocal() {
    const btn = document.getElementById('prodComboSaveBtn');
    const comboId = document.getElementById('prodComboSlide')?.dataset.comboId || 'nuevo-combo';
    const comboExtras = collectComboExtras();

    let links = [];
    const api = getExtraLinksApi();

    if (api && typeof api.setLinksForOwner === 'function') {
      links = api.setLinksForOwner(COMBO_LINK_OWNER_TYPE, comboId, comboExtras);
    }

    const extrasIds = comboExtras
      .map(extra => extra.extra_id || extra.id)
      .filter(Boolean);

    const visiblePayload = {
      combo_id: comboId,
      id: comboId,
      product_type: 'food_combo_product',
      combo: true,
      structure_locked: true,
      relation_model: 'combo_commercial_builder',

      identity: {
        nombre: valueOf('combo_nombre'),
        categoria: valueOf('combo_categoria'),
        badge: valueOf('combo_badge'),
        precio: Number(valueOf('combo_precio') || 0),
        promesa: valueOf('combo_promesa'),
        estado: valueOf('combo_estado'),
        descripcion: valueOf('combo_descripcion')
      },

      nombre: valueOf('combo_nombre'),
      categoria: valueOf('combo_categoria'),
      badge: valueOf('combo_badge'),
      precio: Number(valueOf('combo_precio') || 0),
      promesa: valueOf('combo_promesa'),
      estado: valueOf('combo_estado'),
      descripcion: valueOf('combo_descripcion'),

      imagenes: Array.from({ length: 6 })
        .map((_, i) => valueOf(`combo_img_${i + 1}`))
        .filter(Boolean),

      opcionales_source: 'productos_comestibles',

      extras_combo_source: 'extras_bank',
      extras_combo: comboExtras,
      extrasCombo: comboExtras,
      extras_ids: links.length
        ? links.map(link => link.extra_id).filter(Boolean)
        : extrasIds,
      extras_count: comboExtras.length,

      updated_at: new Date().toISOString()
    };

    let persistedPayload = null;

    if (
      window.ProductosCombosPersist &&
      typeof window.ProductosCombosPersist.persist === 'function'
    ) {
      try {
        persistedPayload = window.ProductosCombosPersist.persist();
      } catch (error) {
        console.warn('[productos-combos.js] No se pudo ejecutar ProductosCombosPersist.persist():', error);
      }
    }

    const finalPayload = Object.assign({}, persistedPayload || {}, visiblePayload, {
      extras_combo: comboExtras,
      extrasCombo: comboExtras,
      extras_ids: links.length
        ? links.map(link => link.extra_id).filter(Boolean)
        : extrasIds,
      extras_count: comboExtras.length,
      extras_combo_source: 'extras_bank',
      updated_at: new Date().toISOString()
    });

    try {
      const key = 'sazzu_productos_combos_v1';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const list = Array.isArray(current) ? current : [];

      const index = list.findIndex(combo =>
        String(combo.id || combo.combo_id || '') === String(comboId)
      );

      if (index >= 0) {
        list[index] = Object.assign({}, list[index], finalPayload);
      } else {
        list.unshift(finalPayload);
      }

      localStorage.setItem(key, JSON.stringify(list));
    } catch (error) {
      console.warn('[productos-combos.js] No se pudo guardar el combo en storage local:', error);
    }

    try {
      if (!links.length && comboExtras.length) {
        const key = 'sazzu_entity_extra_links_v1';
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        const allLinks = Array.isArray(current) ? current : [];

        const untouched = allLinks.filter(link =>
          !(link.owner_type === COMBO_LINK_OWNER_TYPE && String(link.owner_id || '') === String(comboId))
        );

        const now = new Date().toISOString();

        const fallbackLinks = comboExtras.map((extra, index) => {
          const extraId = extra.extra_id || extra.id || extra.nombre || extra.title || `extra-${index + 1}`;

          return {
            link_id: [COMBO_LINK_OWNER_TYPE, comboId, extraId]
              .map(value => String(value || 'item')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'item')
              .join('__'),
            owner_type: COMBO_LINK_OWNER_TYPE,
            owner_id: comboId,
            extra_id: extraId,
            orden: index + 1,
            estado: 'activo',
            precio_override: null,
            snapshot_extra: Object.assign({}, extra, {
              id: extraId,
              extra_id: extraId
            }),
            created_at: now,
            updated_at: now
          };
        });

        localStorage.setItem(key, JSON.stringify(untouched.concat(fallbackLinks)));
        links = fallbackLinks;
      }
    } catch (error) {
      console.warn('[productos-combos.js] No se pudo guardar fallback de links del combo:', error);
    }

    window.__PRODUCTOS_COMBO_DRAFT_LAST__ = finalPayload;
    window.__PRODUCTOS_COMBO_EXTRA_LINKS_LAST__ = {
      combo_id: comboId,
      extras: comboExtras,
      links,
      updated_at: new Date().toISOString()
    };

    console.log('[productos-combos.js] Combo guardado con persistencia forzada:', {
      combo: finalPayload,
      extra_links: links,
      extras_visibles_detectados: comboExtras.length
    });

    if (
      window.ProductosCombosPersist &&
      typeof window.ProductosCombosPersist.hydrate === 'function'
    ) {
      setTimeout(() => window.ProductosCombosPersist.hydrate(), 180);
    }

    if (!btn) return;

    const original = btn.textContent;
    btn.textContent = 'Combo preparado';
    btn.classList.add('is-success');

    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-success');
    }, 1500);
  }

  function valueOf(id) { const el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

  function scheduleProductosCombosMount() { setTimeout(initProductosCombos, 0); setTimeout(initProductosCombos, 120); setTimeout(initProductosCombos, 420); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleProductosCombosMount); else scheduleProductosCombosMount();
  document.addEventListener('sazzu:page:load', scheduleProductosCombosMount);
  window.ProductosCombosMount = scheduleProductosCombosMount;
})();
