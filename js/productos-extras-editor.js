(function () {
  const STORAGE_KEY = 'sazzu_productos_extras_bank_v2';

  const DEFAULTS = [
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
      console.warn('[productos-extras-editor.js] No se pudo leer storage:', error);
    }
    return DEFAULTS.slice();
  }

  function writeExtras(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
  }

  function getExtra(id) {
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

  function cardHtml(extra) {
    const badge = extra.badge ? '<span class="prodExtraCard__badge">' + escapeHtml(extra.badge) + '</span>' : '';
    const image = extra.image ? '<img src="' + escapeHtml(extra.image) + '" alt="">' : '<span class="prodExtraCard__empty">Sin imagen</span>';
    const folder = extra.folder ? '<em>' + escapeHtml(extra.folder) + '</em>' : '';
    return '<button type="button" class="prodExtraCard" data-extra-id="' + escapeHtml(extra.id) + '">' +
      '<div class="prodExtraCard__image">' + badge + image + '</div>' +
      '<div class="prodExtraCard__info"><div><strong>' + escapeHtml(extra.title) + '</strong><span>' + escapeHtml(extra.description) + '</span>' + folder + '</div><b class="prodExtraCard__price">' + escapeHtml(money(extra.price)) + '</b></div>' +
      '</button>';
  }

  function renderGridOverride() {
    const grid = document.getElementById('prodExtrasGrid');
    if (!grid) return;
    grid.innerHTML = readExtras().map(cardHtml).join('');
  }

  function previewHtml(data) {
    const badge = data.badge ? '<span class="prodExtraPreviewBadge">' + escapeHtml(data.badge) + '</span>' : '';
    const image = data.image ? '<img src="' + escapeHtml(data.image) + '" alt="">' : '<span class="prodExtraPreviewEmpty">Imagen del extra</span>';
    return badge + image;
  }

  function editorHtml(data) {
    return '<section class="prodExtraConfigCard" data-extra-editor="1">' +
      '<div class="prodExtraConfigPreview" id="prodExtraEditorPreview">' + previewHtml(data) + '</div>' +
      '<p class="prodExtraEditorNotice">La estructura visual del extra es fija. Solo se editan sus características comerciales.</p>' +
      '<div class="prodExtraEditorGrid">' +
        '<label class="prodExtraField"><span>Nombre del extra</span><input id="prodExtraEditorName" type="text" value="' + escapeHtml(data.title) + '" placeholder="Ej: Salsa de chocolate"></label>' +
        '<label class="prodExtraField"><span>Valor agregado</span><input id="prodExtraEditorPrice" type="number" value="' + escapeHtml(data.price) + '" placeholder="2000"></label>' +
      '</div>' +
      '<label class="prodExtraField"><span>Descripción breve</span><textarea id="prodExtraEditorDescription" placeholder="Texto corto visible debajo del título">' + escapeHtml(data.description) + '</textarea></label>' +
      '<div class="prodExtraEditorGrid">' +
        '<label class="prodExtraField"><span>Badge comercial</span><input id="prodExtraEditorBadge" type="text" value="' + escapeHtml(data.badge || '') + '" placeholder="Ej: abundante"></label>' +
        '<label class="prodExtraField"><span>Estado</span><select id="prodExtraEditorStatus"><option ' + (data.status === 'Activo' ? 'selected' : '') + '>Activo</option><option ' + (data.status === 'Borrador' ? 'selected' : '') + '>Borrador</option><option ' + (data.status === 'Oculto' ? 'selected' : '') + '>Oculto</option></select></label>' +
      '</div>' +
      '<label class="prodExtraField"><span>URL de imagen</span><input id="prodExtraEditorImage" type="url" value="' + escapeHtml(data.image || '') + '" placeholder="https://..."></label>' +
      '<div class="prodExtraEditorGrid">' +
        '<label class="prodExtraField"><span>Carpeta / clasificación comercial</span><input id="prodExtraEditorFolder" type="text" value="' + escapeHtml(data.folder || '') + '" placeholder="Ej: Tortas, Alfajores, Cafetería"></label>' +
        '<label class="prodExtraField"><span>Etiquetas internas</span><input id="prodExtraEditorTags" type="text" value="' + escapeHtml(data.tags || '') + '" placeholder="Ej: chocolate, regalo, cumpleaños"></label>' +
      '</div>' +
    '</section>';
  }

  function openEditor(extra) {
    const body = document.getElementById('prodExtraConfigBody');
    const title = document.getElementById('prodExtraConfigTitle');
    const save = document.querySelector('.prodExtraConfigSave');
    const slide = document.getElementById('prodExtraConfigSlide');
    const overlay = document.getElementById('prodExtraConfigOverlay');
    if (!body || !slide || !overlay) return;

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

    slide.dataset.extraEditorId = data.id || '';
    body.innerHTML = editorHtml(data);
    if (title) title.textContent = data.id ? 'Editar extra' : 'Nuevo extra';
    if (save) {
      save.textContent = 'Guardar extra';
      save.disabled = false;
      save.removeAttribute('disabled');
      save.id = 'prodExtraEditorSaveBtn';
    }

    overlay.classList.add('is-active');
    slide.classList.add('is-active');
    slide.setAttribute('aria-hidden', 'false');
  }

  function refreshPreview() {
    const preview = document.getElementById('prodExtraEditorPreview');
    if (!preview) return;
    preview.innerHTML = previewHtml({
      image: valueOf('prodExtraEditorImage'),
      badge: valueOf('prodExtraEditorBadge')
    });
  }

  function saveEditor() {
    const slide = document.getElementById('prodExtraConfigSlide');
    const currentId = slide?.dataset.extraEditorId || '';
    const title = valueOf('prodExtraEditorName') || 'Nuevo extra';
    const items = readExtras();
    const next = {
      id: currentId || 'extra-' + slugify(title) + '-' + Date.now(),
      title: title,
      description: valueOf('prodExtraEditorDescription'),
      price: numberOf('prodExtraEditorPrice'),
      status: valueOf('prodExtraEditorStatus') || 'Borrador',
      badge: valueOf('prodExtraEditorBadge'),
      folder: valueOf('prodExtraEditorFolder'),
      tags: valueOf('prodExtraEditorTags'),
      image: valueOf('prodExtraEditorImage')
    };
    const index = items.findIndex(function (item) { return item.id === next.id; });
    if (index >= 0) items[index] = next;
    else items.unshift(next);
    writeExtras(items);
    renderGridOverride();
    document.getElementById('prodExtraConfigOverlay')?.classList.remove('is-active');
    if (slide) {
      slide.classList.remove('is-active');
      slide.setAttribute('aria-hidden', 'true');
      slide.dataset.extraEditorId = '';
    }
  }

  function ensureGridWhenSlideOpens() {
    const slide = document.getElementById('prodExtrasSlide');
    if (slide && slide.classList.contains('is-active')) renderGridOverride();
  }

  function bindEditor() {
    if (document.body.dataset.productosExtrasEditorBound === '1') return;
    document.body.dataset.productosExtrasEditorBound = '1';

    document.addEventListener('click', function (event) {
      const add = event.target.closest('#prodExtrasAddBtn');
      if (add) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openEditor(null);
        return;
      }

      const card = event.target.closest('[data-extra-id]');
      const bankSlide = document.getElementById('prodExtrasSlide');
      if (card && bankSlide?.classList.contains('is-active')) {
        if (bankSlide.classList.contains('is-selecting')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openEditor(getExtra(card.dataset.extraId));
        return;
      }

      const save = event.target.closest('#prodExtraEditorSaveBtn, .prodExtraConfigSave');
      if (save && document.querySelector('[data-extra-editor="1"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveEditor();
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (event.target.closest('#prodExtraEditorImage, #prodExtraEditorBadge')) refreshPreview();
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodExtrasLauncherBtn')) {
        setTimeout(renderGridOverride, 80);
        setTimeout(renderGridOverride, 260);
      }
    }, true);
  }

  function init() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;
    bindEditor();
    setTimeout(ensureGridWhenSlideOpens, 250);
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('sazzu:page:load', function () { setTimeout(init, 160); });
  window.addEventListener('load', init);
})();
