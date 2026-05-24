(function () {
  var COMBOS_KEY = 'sazzu_combos_payloads_local_v1';

  function read(key) {
    try { var value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch (error) { return []; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  function collectExtras() {
    return Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard')).map(function (card, index) {
      var name = field(card, 'nombre') || text(card, '.prodComboSelectedExtraCard__body strong') || 'Extra';
      var id = card.dataset.extraSourceId || field(card, 'extra_id') || field(card, 'id') || name;
      return {
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
      };
    }).filter(function (item) { return item.extra_id || item.name; });
  }

  function persistIntoLastComboPayload() {
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
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasPayloadFix === '1') return;
    document.body.dataset.comboExtrasPayloadFix = '1';

    document.addEventListener('click', function (event) {
      if (!event.target.closest('#prodComboSaveBtn')) return;
      setTimeout(persistIntoLastComboPayload, 20);
      setTimeout(persistIntoLastComboPayload, 160);
      setTimeout(persistIntoLastComboPayload, 420);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', bind);
})();
