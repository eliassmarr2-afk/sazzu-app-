(function () {
  var COMBOS_KEY = 'sazzu_combos_payloads_local_v1';

  function read(key) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function field(card, suffix) {
    var el = Array.from(card.querySelectorAll('input, select, textarea')).find(function (node) {
      return String(node.id || '').indexOf('combo_extra_') === 0 && String(node.id || '').endsWith('_' + suffix);
    });
    return el ? String(el.value || '').trim() : '';
  }

  function text(card, selector) {
    var el = card.querySelector(selector);
    return el ? String(el.textContent || '').trim() : '';
  }

  function price(value) {
    var parsed = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeExtra(extra, index) {
    var data = extra || {};
    var name = String(data.title || data.name || data.nombre || 'Extra').trim();
    var id = String(data.extra_id || data.id || name).trim();
    var priceValue = data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio);

    return {
      extra_id: id,
      id: id,
      name: name,
      title: name,
      nombre: name,
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price_delta: Number(priceValue || 0) || 0,
      price: Number(priceValue || 0) || 0,
      precio: Number(priceValue || 0) || 0,
      badge: data.badge || null,
      image_url: data.image_url || data.image || data.imagen || null,
      image: data.image || data.image_url || data.imagen || null,
      imagen: data.imagen || data.image || data.image_url || null,
      status: data.status || data.estado || 'activo',
      estado: data.estado || data.status || 'activo',
      position: data.position || index + 1
    };
  }

  function collectExtras() {
    return Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'))
      .map(function (card, index) {
        var name = field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || 'Extra';
        var id = card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || name;
        return normalizeExtra({
          extra_id: id,
          id: id,
          name: name,
          title: name,
          description: field(card, 'desc') || text(card, '.prodComboSelectedExtraCard__body span') || '',
          price_delta: price(field(card, 'precio')),
          price: price(field(card, 'precio')),
          badge: field(card, 'badge') || null,
          image_url: field(card, 'img') || null,
          image: field(card, 'img') || null,
          status: field(card, 'estado') || 'activo',
          position: index + 1
        }, index);
      })
      .filter(function (item) { return item.extra_id || item.name; });
  }

  function getComboById(comboId) {
    var id = String(comboId || '').trim();
    if (!id) return null;
    return read(COMBOS_KEY).find(function (combo) {
      return String(combo.product_id || '') === id;
    }) || null;
  }

  function persistCurrentVisibleExtras() {
    var slide = document.getElementById('prodComboSlide');
    var comboId = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
    var extras = collectExtras();
    if (!comboId || !extras.length) return;

    var combos = read(COMBOS_KEY);
    var index = combos.findIndex(function (combo) { return String(combo.product_id || '') === comboId; });
    if (index < 0) return;

    combos[index] = Object.assign({}, combos[index], {
      combo_extras: extras,
      updated_at: new Date().toISOString()
    });

    write(COMBOS_KEY, combos);
    window.__lastComboPayload = combos[index];
    window.__PRODUCTOS_COMBO_EXTRAS_PAYLOAD_FIX_LAST__ = combos[index];
  }

  function money(value) {
    return '+ $' + Number(value || 0).toLocaleString('es-AR');
  }

  function hidden(extra, index) {
    return [
      ['id', extra.id],
      ['extra_id', extra.extra_id],
      ['nombre', extra.title || extra.name],
      ['desc', extra.description],
      ['precio', extra.price_delta || extra.price],
      ['estado', extra.status || 'activo'],
      ['badge', extra.badge || ''],
      ['img', extra.image_url || extra.image || '']
    ].map(function (pair) {
      return '<input type="hidden" id="combo_extra_' + index + '_' + esc(pair[0]) + '" value="' + esc(pair[1]) + '">';
    }).join('');
  }

  function cardHtml(extra, index) {
    var data = normalizeExtra(extra, index);
    var img = data.image_url || data.image;
    var imageHtml = img ? '<img src="' + esc(img) + '" alt="">' : '<span>4×4</span>';
    var badgeHtml = data.badge ? '<span class="prodComboSelectedExtraCard__badge">' + esc(data.badge) + '</span>' : '<span class="prodComboSelectedExtraCard__badge prodComboSelectedExtraCard__badge--soft">Banco de extras</span>';

    return '<article class="prodComboSelectedExtraCard" data-combo-extra-card="1" data-extra-source-id="' + esc(data.extra_id || data.id) + '">' +
      '<div class="prodComboSelectedExtraCard__image">' + imageHtml + '</div>' +
      '<div class="prodComboSelectedExtraCard__body"><strong>' + esc(data.title || data.name) + '</strong><span>' + esc(data.description || 'Extra agregado al combo.') + '</span></div>' +
      '<div class="prodComboSelectedExtraCard__meta">' + badgeHtml + '<b>' + esc(money(data.price_delta || data.price)) + '</b></div>' +
      '<button type="button" class="prodComboSelectedExtraCard__delete" data-remove-selected-extra="' + esc(data.extra_id || data.id) + '" aria-label="Eliminar extra ' + esc(data.title || data.name) + '">×</button>' +
      hidden(data, index) +
    '</article>';
  }

  function renderExtras(comboId) {
    var combo = getComboById(comboId);
    var extras = combo && Array.isArray(combo.combo_extras) ? combo.combo_extras.map(normalizeExtra) : [];
    if (!extras.length) return false;

    var list = document.querySelector('.prodComboExtrasList[data-combo-extras-list="1"]');
    if (!list) return false;

    if (window.ProductosExtrasSelector && typeof window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder === 'function') {
      var rendered = window.ProductosExtrasSelector.renderSelectedExtrasIntoComboBuilder(extras.map(function (extra) {
        return {
          id: extra.extra_id || extra.id,
          extra_id: extra.extra_id || extra.id,
          title: extra.title || extra.name,
          nombre: extra.name || extra.title,
          description: extra.description,
          descripcion: extra.description,
          price: extra.price_delta || extra.price,
          precio: extra.price_delta || extra.price,
          badge: extra.badge || '',
          image: extra.image_url || extra.image || '',
          imagen: extra.image_url || extra.image || '',
          status: extra.status || 'Activo',
          estado: extra.status || 'Activo'
        };
      }));
      if (rendered) return true;
    }

    list.classList.add('prodComboExtrasList--selected');
    list.innerHTML = extras.map(cardHtml).join('');
    list.dataset.selectedExtrasCount = String(extras.length);
    return true;
  }

  function hydrateCurrentSlideFromPayload() {
    var slide = document.getElementById('prodComboSlide');
    if (!slide || !slide.classList.contains('is-active')) return;
    var comboId = String(slide.dataset.comboId || '').trim();
    if (!comboId) return;
    renderExtras(comboId);
  }

  function schedulePersist() {
    [0, 80, 220, 520].forEach(function (delay) {
      setTimeout(persistCurrentVisibleExtras, delay);
    });
  }

  function scheduleHydrate(comboId) {
    [120, 320, 700, 1100].forEach(function (delay) {
      setTimeout(function () {
        if (comboId) renderExtras(comboId);
        else hydrateCurrentSlideFromPayload();
      }, delay);
    });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasPayloadFix === '2') return;
    document.body.dataset.comboExtrasPayloadFix = '2';

    window.addEventListener('productos:payload-ready', function (event) {
      var payload = event.detail && event.detail.payload ? event.detail.payload : null;
      if (!payload || payload.product_type !== 'combo') return;
      schedulePersist();
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('#prodComboSaveBtn')) {
        schedulePersist();
        return;
      }

      var edit = event.target.closest('[data-edit-local-product]');
      if (edit) {
        scheduleHydrate(edit.dataset.editLocalProduct);
      }
    }, true);

    var observer = new MutationObserver(function () {
      hydrateCurrentSlideFromPayload();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
})();
