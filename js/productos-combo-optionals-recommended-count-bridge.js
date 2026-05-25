/*
  FASE 3 · Recomendados en tabla para Agregados opcionales de Combos
  No toca Extras. No intercepta Guardar. No modifica payload principal.

  Objetivo:
  - Si un combo tiene productos opcionales, la columna Recomendados debe reflejar esa cantidad.
  - Lee desde collector oficial, payload local y storages auxiliares.
  - Parcha solo la celda visible de la tabla cuando corresponde.
*/
(function () {
  const STORAGE_COMBOS_PAYLOADS = 'sazzu_combos_payloads_local_v1';
  const STORAGE_BUILDER_COMBOS = 'sazzu_productos_combos_v1';
  const STORAGE_LAST_OPTIONALS = 'sazzu_combo_optional_products_v1';
  const STORAGE_OPTIONALS_MAP = 'sazzu_combo_optional_products_by_combo_v1';

  let observedBody = null;
  let observer = null;
  let lastActiveComboId = '';
  let lastActiveCount = null;

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function readObject(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function currentComboId() {
    const slide = document.getElementById('prodComboSlide');
    return String(slide && slide.dataset ? slide.dataset.comboId || '' : '').trim();
  }

  function getRowEntityId(row) {
    if (!row) return '';
    return String(
      row.dataset.supabaseProductId ||
      row.dataset.localProductId ||
      row.dataset.productRowId ||
      row.querySelector('[data-edit-supabase-product]')?.dataset.editSupabaseProduct ||
      row.querySelector('[data-edit-local-product]')?.dataset.editLocalProduct ||
      row.querySelector('[data-edit-com]')?.dataset.editCom ||
      ''
    ).trim();
  }

  function isComboRow(row) {
    const typeText = String(row && row.children && row.children[1] ? row.children[1].textContent : '').toLowerCase();
    return typeText.includes('combo');
  }

  function countFromItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (Array.isArray(item.optional_products)) return item.optional_products.length;
    if (Array.isArray(item.opcionales)) return item.opcionales.length;
    if (item.recommended_count != null) return Number(item.recommended_count || 0);
    if (item.optional_products_count != null) return Number(item.optional_products_count || 0);
    if (item.optional_count != null) return Number(item.optional_count || 0);
    return null;
  }

  function countFromCollector(comboId) {
    const activeId = currentComboId();
    if (!activeId || String(activeId) !== String(comboId || activeId)) return null;

    const api = window.ProductosCombosUpsellsUi;
    if (!api || typeof api.collect !== 'function') return null;

    try {
      const items = api.collect();
      if (!Array.isArray(items)) return null;
      lastActiveComboId = activeId;
      lastActiveCount = items.length;
      return items.length;
    } catch (error) {
      console.warn('[productos-combo-optionals-recommended-count-bridge.js] No se pudo leer collector:', error);
      return null;
    }
  }

  function findStoredCombo(key, comboId) {
    const id = String(comboId || '').trim();
    if (!id) return null;
    return readArray(key).find(function (item) {
      return String(item.product_id || item.id || item.combo_id || '') === id;
    }) || null;
  }

  function countFromLastPayload(comboId) {
    const id = String(comboId || '').trim();
    const payload = window.__lastComboPayload;
    if (!payload || !id) return null;
    const payloadId = String(payload.product_id || payload.combo_id || payload.id || '').trim();
    if (payloadId !== id) return null;
    return countFromItem(payload);
  }

  function countFromLastOptionals(comboId) {
    const id = String(comboId || '').trim();
    if (!id) return null;

    const last = readObject(STORAGE_LAST_OPTIONALS);
    if (String(last.combo_id || '') === id && Array.isArray(last.items)) return last.items.length;

    const map = readObject(STORAGE_OPTIONALS_MAP);
    if (Array.isArray(map[id])) return map[id].length;

    return null;
  }

  function resolveCount(comboId) {
    const id = String(comboId || '').trim();
    if (!id) return null;

    const collectorCount = countFromCollector(id);
    if (collectorCount != null) return collectorCount;

    const lastPayloadCount = countFromLastPayload(id);
    if (lastPayloadCount != null) return lastPayloadCount;

    const localPayloadCount = countFromItem(findStoredCombo(STORAGE_COMBOS_PAYLOADS, id));
    if (localPayloadCount != null) return localPayloadCount;

    const builderCount = countFromItem(findStoredCombo(STORAGE_BUILDER_COMBOS, id));
    if (builderCount != null) return builderCount;

    const lastOptionalsCount = countFromLastOptionals(id);
    if (lastOptionalsCount != null) return lastOptionalsCount;

    if (lastActiveComboId && lastActiveComboId === id && lastActiveCount != null) return lastActiveCount;

    return null;
  }

  function patchRows() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;

    Array.from(tbody.querySelectorAll('tr')).forEach(function (row) {
      if (!isComboRow(row)) return;
      const id = getRowEntityId(row);
      const count = resolveCount(id);
      if (count == null || !row.children || !row.children[6]) return;
      row.children[6].textContent = String(count);
    });

    window.__PRODUCTOS_COMBO_OPTIONALS_RECOMMENDED_COUNT_BRIDGE__ = {
      active_combo_id: currentComboId(),
      last_active_combo_id: lastActiveComboId,
      last_active_count: lastActiveCount,
      updated_at: new Date().toISOString()
    };
  }

  function bindObserver() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody || tbody === observedBody) return;
    if (observer) observer.disconnect();
    observedBody = tbody;
    observer = new MutationObserver(function () {
      setTimeout(patchRows, 60);
    });
    observer.observe(tbody, { childList: true, subtree: true });
  }

  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    bindObserver();
    patchRows();
  }

  document.addEventListener('input', function (event) {
    if (event.target && event.target.closest && (
      event.target.closest('[data-combo-optionals-stage-card]') ||
      event.target.closest('[data-combo-optional-card]')
    )) {
      setTimeout(patchRows, 80);
    }
  }, true);

  document.addEventListener('change', function (event) {
    if (event.target && event.target.closest && (
      event.target.closest('[data-combo-optionals-stage-card]') ||
      event.target.closest('[data-combo-optional-card]')
    )) {
      setTimeout(patchRows, 80);
    }
  }, true);

  window.addEventListener('productos:payload-ready', function () {
    setTimeout(patchRows, 40);
    setTimeout(patchRows, 220);
  });

  window.addEventListener('productos:supabase-saved', function () {
    setTimeout(patchRows, 120);
    setTimeout(patchRows, 500);
  });

  [0, 160, 420, 900, 1500].forEach(function (delay) { setTimeout(boot, delay); });
  document.addEventListener('sazzu:page:load', function () {
    [100, 300, 800].forEach(function (delay) { setTimeout(boot, delay); });
  });
  window.addEventListener('load', boot);
})();
