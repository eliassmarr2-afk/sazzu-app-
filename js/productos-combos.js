(function () {
  const COMBO_MOCK = {
    id: 'combo-merienda-duo',
    nombre: 'Merienda Dúo',
    categoria: 'Combo rápido',
    estado: 'Borrador',
    precio: 12900,
    badge: 'Combo recomendado',
    descripcion: 'Combo rápido pensado para dos personas. Incluye piezas dulces y bebidas para convertir el pedido en una merienda completa sin configurar demasiado.',
    promesa: 'Llega gratis según zona configurada.',
    imagenes: [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
      '', '', '', '', ''
    ],
    incluidos: [
      { nombre: 'Muffins surtidos', cantidad: '2 unidades', descripcion: 'Componente del pack base.', incluido: true, imagen: '' },
      { nombre: 'Brownie', cantidad: '1 unidad', descripcion: 'Componente del pack base.', incluido: true, imagen: '' },
      { nombre: 'Café frío', cantidad: '2 unidades', descripcion: 'Componente del pack base.', incluido: true, imagen: '' }
    ],
    opcionales: [
      { nombre: 'Cookies con chips', cantidad: '2 unidades', precio: 2200, agregado: false, imagen: '' },
      { nombre: 'Mini alfajores', cantidad: '3 unidades', precio: 2600, agregado: true, imagen: '' }
    ]
  };

  function initProductosCombos() {
    const body = document.querySelector('body[data-page="productos"]');
    const panel = document.getElementById('prodPanelComestibles');
    if (!body || !panel) {
      setTimeout(initProductosCombos, 180);
      return;
    }
    if (body.dataset.combosReady === '1') return;
    body.dataset.combosReady = '1';

    mountComboLauncher(panel);
    mountComboSlide();
    bindComboUi();
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

  function mountComboLauncher(panel) {
    if (document.getElementById('prodComboLauncher')) return;
    const guide = panel.querySelector('.prodComGuide');
    const block = document.createElement('section');
    block.className = 'prodComboLauncher';
    block.id = 'prodComboLauncher';
    block.innerHTML = `
      <div>
        <span class="prodComboEyebrow">Constructor comercial</span>
        <h3>Combos</h3>
        <p>Creá combos con componentes incluidos y agregados opcionales. La estructura de la página no se edita: solo cargás el contenido.</p>
      </div>
      <div class="prodComboLauncher__badges">
        <span>Combo</span>
        <span>Valor incluido</span>
        <span>Agregados opcionales</span>
      </div>
      <button type="button" class="prodComboPrimary" id="prodComboNewBtn">+ Nuevo combo</button>
    `;
    if (guide) guide.insertAdjacentElement('afterend', block);
    else panel.prepend(block);
  }

  function mountComboSlide() {
    const main = document.querySelector('body[data-page="productos"] .main');
    if (!main || document.getElementById('prodComboSlide')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="prodComboOverlay" id="prodComboOverlay"></div>
      <aside class="prodComboSlide" id="prodComboSlide" aria-hidden="true">
        <header class="prodComboSlide__header">
          <div>
            <span class="prodComboEyebrow">Constructor de combo</span>
            <h2>Nuevo combo</h2>
            <p>Cargá componentes. La estructura visual del combo queda fija para conversión rápida.</p>
          </div>
          <div class="prodComboSlide__actions">
            <button type="button" class="prodComboGhost" id="prodComboSaveBtn">Guardar borrador local</button>
            <button type="button" class="prodComboClose" id="prodComboCloseBtn" aria-label="Cerrar constructor de combo">×</button>
          </div>
        </header>
        <div class="prodComboSlide__body" id="prodComboSlideBody"></div>
      </aside>
    `;
    main.appendChild(wrap);
  }

  function bindComboUi() {
    const newBtn = document.getElementById('prodComboNewBtn');
    const closeBtn = document.getElementById('prodComboCloseBtn');
    const overlay = document.getElementById('prodComboOverlay');
    const saveBtn = document.getElementById('prodComboSaveBtn');

    if (newBtn && newBtn.dataset.bound !== '1') {
      newBtn.dataset.bound = '1';
      newBtn.addEventListener('click', function () { openComboSlide(COMBO_MOCK); });
    }
    if (closeBtn && closeBtn.dataset.bound !== '1') {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', closeComboSlide);
    }
    if (overlay && overlay.dataset.bound !== '1') {
      overlay.dataset.bound = '1';
      overlay.addEventListener('click', closeComboSlide);
    }
    if (saveBtn && saveBtn.dataset.bound !== '1') {
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', saveComboLocal);
    }
  }

  function openComboSlide(combo) {
    const slide = document.getElementById('prodComboSlide');
    const overlay = document.getElementById('prodComboOverlay');
    const body = document.getElementById('prodComboSlideBody');
    if (!slide || !overlay || !body) return;
    slide.dataset.comboId = combo.id;
    body.innerHTML = renderComboBuilder(combo);
    overlay.classList.add('is-active');
    slide.classList.add('is-active');
    slide.setAttribute('aria-hidden', 'false');
  }

  function closeComboSlide() {
    const slide = document.getElementById('prodComboSlide');
    const overlay = document.getElementById('prodComboOverlay');
    const body = document.getElementById('prodComboSlideBody');
    if (overlay) overlay.classList.remove('is-active');
    if (slide) {
      slide.classList.remove('is-active');
      slide.setAttribute('aria-hidden', 'true');
      slide.dataset.comboId = '';
    }
    if (body) body.innerHTML = '';
  }

  function renderComboBuilder(combo) {
    return `
      <div class="prodComboBuilder">
        <aside class="prodComboMap">
          <div class="prodComboMap__sticky">
            <span class="prodComboEyebrow">Mapa fácil</span>
            <h3>Qué estás editando</h3>
            ${mapStep('1', 'Identidad', 'Nombre, precio y descripción del combo.')}
            ${mapStep('2', 'Imágenes', 'Hasta 6 imágenes para la galería.')}
            ${mapStep('3', 'Valor incluido', 'Componentes que forman el combo base.')}
            ${mapStep('4', 'Podés sumar', 'Agregados opcionales con precio.')}
            ${mapStep('5', 'Preview', 'Vista compacta de la estructura.')}
            <div class="prodComboMap__note">No se editan títulos estructurales ni tabs. Solo contenido del combo.</div>
          </div>
        </aside>

        <section class="prodComboEditor">
          ${identitySection(combo)}
          ${imagesSection(combo)}
          ${includedSection(combo)}
          ${optionalSection(combo)}
          ${payloadSection(combo)}
        </section>

        <aside class="prodComboPreviewRail">
          ${previewCard(combo)}
        </aside>
      </div>
    `;
  }

  function mapStep(num, title, text) {
    return `<div class="prodComboMapStep"><b>${escapeHtml(num)}</b><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div></div>`;
  }

  function identitySection(combo) {
    return `
      <section class="prodComboSection">
        <div class="prodComboSection__head">
          <div>
            <span class="prodComboEyebrow">Paso 1 · Identidad</span>
            <h3>Información principal</h3>
            <p>Esto alimenta el encabezado de la página del combo.</p>
          </div>
          <span class="prodComboBadge prodComboBadge--blue">Combo</span>
        </div>
        <div class="prodComboGrid">
          ${field('Nombre del combo', 'combo_nombre', combo.nombre)}
          ${field('Categoría visible', 'combo_categoria', combo.categoria)}
          ${field('Badge comercial', 'combo_badge', combo.badge)}
          ${field('Precio base del combo', 'combo_precio', combo.precio, 'number')}
          ${field('Promesa de entrega', 'combo_promesa', combo.promesa)}
          ${select('Estado', 'combo_estado', combo.estado, ['Activo', 'Borrador', 'Oculto'])}
        </div>
        <label class="prodComboField prodComboField--full">
          <span>Descripción</span>
          <textarea id="combo_descripcion">${escapeHtml(combo.descripcion)}</textarea>
        </label>
      </section>
    `;
  }

  function imagesSection(combo) {
    const imgs = combo.imagenes || [];
    return `
      <section class="prodComboSection">
        <div class="prodComboSection__head">
          <div>
            <span class="prodComboEyebrow">Paso 2 · Galería</span>
            <h3>Imágenes del combo</h3>
            <p>La primera imagen será la principal. Podés preparar hasta 6 imágenes.</p>
          </div>
          <span class="prodComboBadge prodComboBadge--green">${imgs.filter(Boolean).length}/6 cargadas</span>
        </div>
        <div class="prodComboImages">
          ${Array.from({ length: 6 }).map((_, i) => imageField(i, imgs[i] || '')).join('')}
        </div>
      </section>
    `;
  }

  function includedSection(combo) {
    const removedCount = combo.incluidos.filter(item => !item.incluido).length;
    return `
      <section class="prodComboSection">
        <div class="prodComboSection__head">
          <div>
            <span class="prodComboEyebrow">Valor incluido</span>
            <h3>Incluye este combo</h3>
            <p>Estos componentes forman el pack base. Podés quitarlos, pero no muestran precio individual.</p>
          </div>
          <span class="prodComboBadge prodComboBadge--gray">Sin precio prorrateado</span>
        </div>
        ${removedCount ? `<div class="prodComboWarning"><strong>Modificaste el combo original</strong><span>Quitaste ${removedCount} componente. El precio puede mantenerse porque el combo conserva su estructura promocional.</span></div>` : ''}
        <div class="prodComboItems">
          ${combo.incluidos.map((item, index) => includedItem(item, index)).join('')}
        </div>
      </section>
    `;
  }

  function optionalSection(combo) {
    return `
      <section class="prodComboSection">
        <div class="prodComboSection__head">
          <div>
            <span class="prodComboEyebrow">Podés sumar</span>
            <h3>Agregados opcionales</h3>
          </div>
          <span class="prodComboBadge prodComboBadge--blue">Sube ticket</span>
        </div>
        <div class="prodComboItems">
          ${combo.opcionales.map((item, index) => optionalItem(item, index)).join('')}
        </div>
      </section>
    `;
  }

  function includedItem(item, index) {
    return `
      <article class="prodComboItem ${item.incluido ? 'is-included' : 'is-removed'}">
        <button type="button" class="prodComboToggle" aria-label="Estado incluido">${item.incluido ? '●' : '○'}</button>
        <div class="prodComboItem__image"><span>4×4</span></div>
        <div class="prodComboGrid prodComboGrid--item">
          ${field('Nombre', `combo_incluido_${index}_nombre`, item.nombre)}
          ${field('Cantidad', `combo_incluido_${index}_cantidad`, item.cantidad)}
          ${field('Descripción', `combo_incluido_${index}_desc`, item.descripcion)}
          ${select('Estado visual', `combo_incluido_${index}_estado`, item.incluido ? 'Marcado' : 'Desmarcado', ['Marcado', 'Desmarcado'])}
          ${field('Imagen 4x4', `combo_incluido_${index}_img`, item.imagen || '', 'url')}
          <label class="prodComboField"><span>Texto estático</span><input value="Incluido en el combo original" readonly></label>
        </div>
      </article>
    `;
  }

  function optionalItem(item, index) {
    return `
      <article class="prodComboItem ${item.agregado ? 'is-added' : 'is-optional'}">
        <button type="button" class="prodComboToggle" aria-label="Estado agregado">${item.agregado ? '●' : '○'}</button>
        <div class="prodComboItem__image"><span>4×4</span></div>
        <div class="prodComboGrid prodComboGrid--item">
          ${field('Nombre', `combo_opcional_${index}_nombre`, item.nombre)}
          ${field('Cantidad', `combo_opcional_${index}_cantidad`, item.cantidad)}
          ${field('Precio adicional', `combo_opcional_${index}_precio`, item.precio, 'number')}
          ${select('Estado visual', `combo_opcional_${index}_estado`, item.agregado ? 'Agregado' : 'Disponible', ['Disponible', 'Agregado', 'Oculto'])}
          ${field('Imagen 4x4', `combo_opcional_${index}_img`, item.imagen || '', 'url')}
          <label class="prodComboField"><span>Texto estático</span><input value="${item.agregado ? 'Agregado al pedido' : 'Disponible para sumar'}" readonly></label>
        </div>
      </article>
    `;
  }

  function previewCard(combo) {
    return `
      <section class="prodComboPreview">
        <span class="prodComboEyebrow">Preview estructural</span>
        <h3>${escapeHtml(combo.nombre)}</h3>
        <p>${escapeHtml(combo.descripcion)}</p>
        <div class="prodComboPreview__price"><span>Total</span><strong>${money(combo.precio)}</strong></div>
        <div class="prodComboPreview__block">
          <strong>Incluye este combo</strong>
          ${combo.incluidos.map(item => `<div class="prodComboPreview__line ${item.incluido ? '' : 'is-muted'}"><span>${item.incluido ? '●' : '○'} ${escapeHtml(item.nombre)}</span><small>${escapeHtml(item.cantidad)} · ${item.incluido ? 'Incluido' : 'Quitado'}</small></div>`).join('')}
        </div>
        <div class="prodComboPreview__block">
          <strong>Podés sumar</strong>
          ${combo.opcionales.map(item => `<div class="prodComboPreview__line"><span>${item.agregado ? '●' : '○'} ${escapeHtml(item.nombre)}</span><small>${item.agregado ? 'Agregado al pedido' : 'Disponible para sumar'} · ${money(item.precio)}</small></div>`).join('')}
        </div>
      </section>
    `;
  }

  function payloadSection(combo) {
    const payload = {
      combo_id: combo.id,
      product_type: 'food_combo_product',
      combo: true,
      structure_locked: true,
      no_component_prorated_price: true,
      sections: ['identity', 'images', 'included_value', 'optional_addons'],
      future_keys: ['user_id', 'workspace_id', 'store_id', 'draft_version', 'published_version']
    };
    return `
      <section class="prodComboSection prodComboSection--payload">
        <div class="prodComboSection__head">
          <div>
            <span class="prodComboEyebrow">Salida futura</span>
            <h3>Payload que irá a Supabase</h3>
            <p>En esta fase no se guarda real. Dejamos la estructura lista para cuenta, tienda y versión.</p>
          </div>
          <span class="prodComboBadge prodComboBadge--blue">Mock local</span>
        </div>
        <pre class="prodComboPayload">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
      </section>
    `;
  }

  function field(label, id, value, type = 'text') {
    return `<label class="prodComboField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}"></label>`;
  }

  function select(label, id, value, options) {
    return `<label class="prodComboField"><span>${escapeHtml(label)}</span><select id="${escapeHtml(id)}">${options.map(opt => `<option value="${escapeHtml(opt)}" ${String(opt) === String(value) ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`;
  }

  function imageField(index, value) {
    return `<label class="prodComboImageField"><span>Imagen ${index + 1}${index === 0 ? ' · Principal' : ''}</span><div class="prodComboImagePreview">${value ? `<img src="${escapeHtml(value)}" alt="">` : `<b>IMG ${index + 1}</b>`}</div><input id="combo_img_${index + 1}" type="url" value="${escapeHtml(value)}" placeholder="URL de imagen"></label>`;
  }

  function saveComboLocal() {
    const btn = document.getElementById('prodComboSaveBtn');
    const payload = {
      combo_id: document.getElementById('prodComboSlide')?.dataset.comboId || 'nuevo-combo',
      product_type: 'food_combo_product',
      combo: true,
      structure_locked: true,
      identity: {
        nombre: valueOf('combo_nombre'),
        categoria: valueOf('combo_categoria'),
        badge: valueOf('combo_badge'),
        precio: Number(valueOf('combo_precio') || 0),
        promesa: valueOf('combo_promesa'),
        estado: valueOf('combo_estado'),
        descripcion: valueOf('combo_descripcion')
      },
      imagenes: Array.from({ length: 6 }).map((_, i) => valueOf(`combo_img_${i + 1}`)).filter(Boolean)
    };
    console.log('[productos-combos.js] Borrador de combo preparado:', payload);
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Combo preparado';
    btn.classList.add('is-success');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('is-success'); }, 1500);
  }

  function valueOf(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  document.addEventListener('DOMContentLoaded', initProductosCombos);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosCombos, 120);
    setTimeout(initProductosCombos, 420);
  });
  window.ProductosCombosMount = initProductosCombos;
})();
