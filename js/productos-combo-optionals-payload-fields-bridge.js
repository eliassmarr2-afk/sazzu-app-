/*
  FASE 2 · Puente pasivo de campos payload para Agregados opcionales
  No toca Extras. No intercepta Guardar. No modifica el payload principal.

  Mantiene campos hidden legacy sincronizados para que productos-payloads.js
  pueda leer los productos opcionales desde el collector oficial existente.
*/
(function () {
  const HOST_ATTR = 'data-combo-optionals-payload-fields-bridge';
  let observedList = null;
  let observer = null;
  let lastSignature = '';

  function optionalSection() {
    return Array.from(document.querySelectorAll('#prodComboSlideBody .prodComboSection')).find(function (section) {
      const eyebrow = String((section.querySelector('.prodComboEyebrow') || {}).textContent || '').toLowerCase();
      const title = String((section.querySelector('h3') || {}).textContent || '').toLowerCase();
      return (eyebrow.includes('podés sumar') || eyebrow.includes('podes sumar')) && title.includes('agregados opcionales');
    }) || null;
  }

  function optionalList() {
    const section = optionalSection();
    return section ? section.querySelector('.prodComboItems') : null;
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset ? slide.dataset.comboId || '' : '').trim();
  }

  function getItems() {
    const api = window.ProductosCombosUpsellsUi;
    if (!api || typeof api.collect !== 'function') return [];
    try {
      const items = api.collect();
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.warn('[productos-combo-optionals-payload-fields-bridge.js] No se pudo leer collector oficial:', error);
      return [];
    }
  }

  function ensureHost() {
    const section = optionalSection();
    if (!section) return null;
    let host = section.querySelector('[' + HOST_ATTR + '="1"]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute(HOST_ATTR, '1');
      host.hidden = true;
      section.appendChild(host);
    }
    return host;
  }

  function detachStageAProductFields() {
    const list = optionalList();
    if (!list) return;
    Array.from(list.querySelectorAll('input[id^="combo_opcional_stagea_"][id$="_product"]')).forEach(function (input) {
      if (!input.dataset.stageaOriginalId) input.dataset.stageaOriginalId = input.id;
      input.id = input.id.replace('combo_opcional_stagea_', 'comboStageAProduct_');
    });
  }

  function hasLegacyFieldsOutsideHost(host) {
    return Array.from(document.querySelectorAll('input[id^="combo_opcional_"][id$="_product"]')).some(function (input) {
      if (host && host.contains(input)) return false;
      return /^combo_opcional_\d+_product$/.test(String(input.id || ''));
    });
  }

  function createHidden(host, id, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.id = id;
    input.value = value == null ? '' : String(value);
    host.appendChild(input);
  }

  function signature(items) {
    return items.map(function (item) {
      return [
        item.linked_product_id || item.product_id || '',
        item.quantity_label || item.cantidad_label || item.cantidad || '',
        item.estado_visual || item.status || ''
      ].join(':');
    }).join('|');
  }

  function syncFields() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    detachStageAProductFields();

    const host = ensureHost();
    if (!host) return;

    const items = getItems();
    const nextSignature = signature(items);
    const existingLegacy = hasLegacyFieldsOutsideHost(host);

    if (nextSignature === lastSignature && host.dataset.existingLegacy === String(existingLegacy)) return;
    lastSignature = nextSignature;
    host.dataset.existingLegacy = String(existingLegacy);
    host.innerHTML = '';

    if (existingLegacy) {
      window.__PRODUCTOS_COMBO_OPTIONALS_PAYLOAD_FIELDS_BRIDGE__ = {
        combo_id: currentComboId(),
        mirrored: false,
        reason: 'existing_legacy_fields',
        count: items.length,
        updated_at: new Date().toISOString()
      };
      return;
    }

    items.forEach(function (item, index) {
      createHidden(host, 'combo_opcional_' + index + '_product', item.linked_product_id || item.product_id || '');
      createHidden(host, 'combo_opcional_' + index + '_cantidad', item.quantity_label || item.cantidad_label || item.cantidad || '1 unidad');
      createHidden(host, 'combo_opcional_' + index + '_estado', item.estado_visual || item.status || 'Visible');
    });

    window.__PRODUCTOS_COMBO_OPTIONALS_PAYLOAD_FIELDS_BRIDGE__ = {
      combo_id: currentComboId(),
      mirrored: true,
      count: items.length,
      updated_at: new Date().toISOString()
    };
  }

  function bindObserver() {
    const list = optionalList();
    if (!list || list === observedList) return;
    if (observer) observer.disconnect();
    observedList = list;
    observer = new MutationObserver(function () {
      setTimeout(syncFields, 40);
    });
    observer.observe(list, { childList: true, subtree: true });
    syncFields();
  }

  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bindObserver();
    syncFields();
  }

  [0, 120, 360, 800, 1400].forEach(function (delay) { setTimeout(boot, delay); });
  document.addEventListener('sazzu:page:load', function () {
    [80, 260, 700].forEach(function (delay) { setTimeout(boot, delay); });
  });
  window.addEventListener('load', boot);
})();
