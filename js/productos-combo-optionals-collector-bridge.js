/*
  FASE 1 · Collector oficial de Agregados opcionales en Combos
  No toca Extras. No guarda payload principal. Solo normaliza lectura desde UI.
*/
(function () {
  const VERSION = 'phase_1_official_optional_collector_v1';

  function parseMoney(value) {
    return Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset ? slide.dataset.comboId || '' : '').trim();
  }

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

  function readText(card, selector) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.textContent || '').trim() : '';
  }

  function readValue(card, selector, fallback) {
    const el = card ? card.querySelector(selector) : null;
    return el ? String(el.value || '').trim() : (fallback || '');
  }

  function readImage(card, selector) {
    const img = card ? card.querySelector(selector) : null;
    return img ? String(img.getAttribute('src') || '').trim() : '';
  }

  function normalizeItem(raw, index) {
    const productId = String(raw.product_id || raw.linked_product_id || '').trim();
    const qty = String(raw.cantidad_label || raw.quantity_label || raw.cantidad || '1 unidad').trim() || '1 unidad';
    const state = String(raw.estado_visual || raw.status || 'Visible').trim() || 'Visible';
    const product = raw.snapshot_producto || {};

    return {
      product_id: productId,
      linked_product_id: productId,
      cantidad: qty,
      cantidad_label: qty,
      quantity_label: qty,
      estado_visual: state,
      status: state,
      activo: state !== 'Oculto',
      position: index + 1,
      snapshot_producto: {
        id: productId,
        product_id: productId,
        nombre: product.nombre || product.name || 'Producto',
        name: product.name || product.nombre || 'Producto',
        categoria: product.categoria || product.category || 'Producto',
        category: product.category || product.categoria || 'Producto',
        precio: Number(product.precio != null ? product.precio : product.price || 0) || 0,
        price: Number(product.price != null ? product.price : product.precio || 0) || 0,
        imagen: product.imagen || product.image || '',
        image: product.image || product.imagen || '',
        product_type: 'producto_simple'
      }
    };
  }

  function collectStageACard(card, index) {
    const productId = String(card.dataset.productId || '').trim();
    return normalizeItem({
      product_id: productId,
      cantidad_label: readValue(card, 'input[id^="combo_opcional_stagea_"][id$="_cantidad"]', '1 unidad'),
      estado_visual: readValue(card, 'select[id^="combo_opcional_stagea_"][id$="_estado"]', 'Visible'),
      snapshot_producto: {
        nombre: readText(card, '.prodComboOptionalStageAHead strong') || 'Producto',
        categoria: readText(card, '.prodComboOptionalStageAHead span') || 'Producto',
        precio: parseMoney(readText(card, '.prodComboOptionalStageAHead b')),
        imagen: readImage(card, '.prodComboOptionalStageAImage img')
      }
    }, index);
  }

  function collectLegacyCard(card, index) {
    const productId = String(card.dataset.productId || '').trim();
    return normalizeItem({
      product_id: productId,
      cantidad_label: readValue(card, 'input[id^="combo_opcional_"][id$="_cantidad"]', '1 unidad'),
      estado_visual: readValue(card, 'select[id^="combo_opcional_"][id$="_estado"]', 'Visible'),
      snapshot_producto: {
        nombre: readText(card, '.prodComboOptionalHead strong') || 'Producto',
        categoria: readText(card, '.prodComboOptionalHead span') || 'Producto',
        precio: parseMoney(readText(card, '.prodComboOptionalHead b')),
        imagen: readImage(card, '.prodComboOptionalImage img')
      }
    }, index);
  }

  function collectOfficial() {
    const list = optionalList();
    if (!list) return [];

    const rawCards = [];
    Array.from(list.querySelectorAll('[data-combo-optionals-stage-card]')).forEach(function (card) {
      rawCards.push({ type: 'stage_a', card: card });
    });
    Array.from(list.querySelectorAll('[data-combo-optional-card]')).forEach(function (card) {
      rawCards.push({ type: 'legacy', card: card });
    });

    const used = new Set();
    const items = [];

    rawCards.forEach(function (entry) {
      const item = entry.type === 'stage_a'
        ? collectStageACard(entry.card, items.length)
        : collectLegacyCard(entry.card, items.length);
      const key = String(item.product_id || item.linked_product_id || '').trim();
      if (!key || used.has(key)) return;
      used.add(key);
      item.position = items.length + 1;
      items.push(item);
    });

    return items;
  }

  function payloadOfficial() {
    const items = collectOfficial();
    return {
      combo_id: currentComboId(),
      section_key: 'agregados_opcionales',
      section_title: 'Agregados opcionales',
      source: 'productos_comestibles',
      relation_model: 'combo_optional_product_links',
      manual_creation_enabled: false,
      collector_version: VERSION,
      items: items,
      optional_products: items,
      optional_products_count: items.length,
      optional_count: items.length,
      recommended_count: items.length,
      updated_at: new Date().toISOString()
    };
  }

  function install() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    const previous = window.ProductosCombosUpsellsUi || {};
    window.ProductosCombosUpsellsUi = Object.assign({}, previous, {
      version: VERSION,
      collect: collectOfficial,
      payload: payloadOfficial,
      debug: function () {
        const payload = payloadOfficial();
        return {
          active: true,
          version: VERSION,
          combo_id: payload.combo_id,
          count: payload.items.length,
          items: payload.items
        };
      }
    });
    window.__PRODUCTOS_COMBO_OPTIONALS_COLLECTOR_READY__ = {
      active: true,
      version: VERSION,
      installed_at: new Date().toISOString()
    };
  }

  function scheduleInstall() {
    [0, 80, 180, 420, 900, 1400].forEach(function (delay) {
      setTimeout(install, delay);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleInstall);
  else scheduleInstall();
  document.addEventListener('sazzu:page:load', scheduleInstall);
  window.addEventListener('load', scheduleInstall);
})();
