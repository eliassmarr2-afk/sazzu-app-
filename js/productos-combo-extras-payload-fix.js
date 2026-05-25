/*
  GUARD SEGURO · Extras, eliminación y tabla de Productos

  Objetivos:
  - Evitar que + Nuevo combo herede extras del mock combo-merienda-duo.
  - Sincronizar links de extras cuando el guardado real emite productos:payload-ready.
  - Evitar el scroll automático hacia Extras al abrir/editar combos.
  - Agregar botón de eliminar dentro de slides de producto/combo.
  - Limitar la tabla a 10 filas visibles con paginación inferior.

  Reglas:
  - No intercepta Guardar.
  - No crea combos.
  - No cambia IDs durante edición.
  - No duplica registros.
*/
(function () {
  const LINKS_KEY = 'sazzu_entity_extra_links_v1';
  const BUILDER_KEY = 'sazzu_productos_combos_v1';
  const DELETED_KEY = 'sazzu_productos_deleted_rows_v1';
  const OWNER_TYPE = 'combo';
  const PAGE_SIZE = 10;

  let comboRendererWrapped = false;
  let tablePage = 1;
  let tableObserver = null;
  let observedTableBody = null;
  let tableApplyTimer = null;

  function readArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeArray(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
    } catch (error) {
      console.warn('[productos-combo-extras-payload-fix.js] No se pudo escribir ' + key, error);
    }
  }

  function slugify(value) {
    return String(value || 'item')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function normalizeExtra(extra, index) {
    const data = extra || {};
    const title = String(data.title || data.name || data.nombre || 'Extra').trim();
    const id = String(data.extra_id || data.id || title).trim();
    const price = Number(String(data.price_delta != null ? data.price_delta : (data.price != null ? data.price : data.precio || 0)).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;

    return {
      id: id,
      extra_id: id,
      title: title,
      nombre: title,
      name: title,
      description: String(data.description || data.descripcion || '').trim(),
      descripcion: String(data.descripcion || data.description || '').trim(),
      price: price,
      precio: price,
      price_delta: price,
      status: data.status || data.estado || 'Activo',
      estado: data.estado || data.status || 'Activo',
      badge: data.badge || '',
      image: data.image || data.imagen || data.image_url || '',
      imagen: data.imagen || data.image || data.image_url || '',
      image_url: data.image_url || data.image || data.imagen || '',
      folder: data.folder || '',
      tags: data.tags || '',
      position: index + 1
    };
  }

  function clearVisibleComboExtras() {
    const list = document.querySelector('.prodComboExtrasList[data-combo-extras-list="1"]');
    if (!list) return;

    list.classList.remove('prodComboExtrasList--selected');
    list.dataset.selectedExtrasCount = '0';
    list.innerHTML = '<div class="prodComboEmptyBox"><strong>Sin extras cargados todavía</strong><span>Usá + Agregar Extra para asociar extras reutilizables del banco a este combo.</span></div>';

    const section = list.closest('[data-prod-combo-extras-section="1"]');
    if (section) section.dataset.selectedExtrasCount = '0';
  }

  function prepareTrustedNewCombo() {
    const slide = document.getElementById('prodComboSlide');
    if (!slide || !slide.classList.contains('is-active')) return;

    slide.dataset.comboId = 'nuevo-combo';
    clearVisibleComboExtras();

    window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ = {
      action: 'trusted_new_combo_reset',
      combo_id: 'nuevo-combo',
      time: new Date().toISOString()
    };
  }

  function syncExtraLinks(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return [];

    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (extra) { return extra.extra_id || extra.id; });

    const allLinks = readArray(LINKS_KEY);
    const previous = new Map(
      allLinks
        .filter(function (link) {
          return link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id;
        })
        .map(function (link) { return [String(link.extra_id || ''), link]; })
    );

    const untouched = allLinks.filter(function (link) {
      return !(link.owner_type === OWNER_TYPE && String(link.owner_id || '') === id);
    });

    const now = new Date().toISOString();
    const nextLinks = normalized.map(function (extra, index) {
      const extraId = extra.extra_id || extra.id;
      const old = previous.get(String(extraId));
      return {
        link_id: [OWNER_TYPE, id, extraId].map(slugify).join('__'),
        owner_type: OWNER_TYPE,
        owner_id: id,
        extra_id: extraId,
        orden: index + 1,
        estado: 'activo',
        precio_override: null,
        snapshot_extra: Object.assign({}, extra, { id: extraId, extra_id: extraId }),
        created_at: old && old.created_at ? old.created_at : now,
        updated_at: now
      };
    });

    writeArray(LINKS_KEY, untouched.concat(nextLinks));

    try {
      window.dispatchEvent(new CustomEvent('productos-extra-links:changed', {
        detail: {
          owner_type: OWNER_TYPE,
          owner_id: id,
          links: nextLinks
        }
      }));
    } catch (_) {}

    return nextLinks;
  }

  function syncExistingBuilderCombo(comboId, extras) {
    const id = String(comboId || '').trim();
    if (!id) return null;

    const combos = readArray(BUILDER_KEY);
    const index = combos.findIndex(function (combo) {
      return String(combo.id || combo.combo_id || '') === id;
    });

    if (index < 0) return null;

    const normalized = (Array.isArray(extras) ? extras : [])
      .map(normalizeExtra)
      .filter(function (extra) { return extra.extra_id || extra.id; });

    combos[index] = Object.assign({}, combos[index], {
      extras_combo: normalized,
      extrasCombo: normalized,
      extras_ids: normalized.map(function (extra) { return extra.extra_id || extra.id; }).filter(Boolean),
      extras_count: normalized.length,
      updated_at: new Date().toISOString()
    });

    writeArray(BUILDER_KEY, combos);
    return combos[index];
  }

  function handlePayloadReady(event) {
    const payload = event && event.detail ? event.detail.payload : null;
    if (!payload || payload.product_type !== 'combo') return;

    const comboId = String(payload.product_id || '').trim();
    const extras = Array.isArray(payload.combo_extras) ? payload.combo_extras : [];

    const links = syncExtraLinks(comboId, extras);
    const builderCombo = syncExistingBuilderCombo(comboId, extras);

    window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ = {
      action: 'payload_ready_sync',
      combo_id: comboId,
      extras_count: extras.length,
      links_count: links.length,
      builder_updated: !!builderCombo,
      time: new Date().toISOString()
    };
  }

  function injectStyles() {
    if (document.getElementById('productosTableOpsStyles')) return;
    const style = document.createElement('style');
    style.id = 'productosTableOpsStyles';
    style.textContent = `
      body[data-page="productos"] .prodSlideDeleteBtn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        min-width:38px;
        height:38px;
        padding:0 11px;
        color:#b42318 !important;
        background:#fff5f4 !important;
        border:1px solid #fecdca !important;
      }
      body[data-page="productos"] .prodSlideDeleteBtn svg{
        width:16px;
        height:16px;
        display:block;
      }
      body[data-page="productos"] .prodSlideDeleteBtn:hover{
        background:#fee4e2 !important;
      }
      body[data-page="productos"] .prodComPagination{
        margin-top:14px;
        padding-top:14px;
        border-top:1px solid #eaecf0;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        flex-wrap:wrap;
      }
      body[data-page="productos"] .prodComPagination__info{
        color:#667085;
        font-size:12px;
        font-weight:750;
      }
      body[data-page="productos"] .prodComPagination__controls{
        display:flex;
        align-items:center;
        gap:6px;
      }
      body[data-page="productos"] .prodComPageBtn{
        min-width:32px;
        height:32px;
        border-radius:6px;
        border:1px solid #d0d5dd;
        background:#fff;
        color:#344054;
        font-family:inherit;
        font-size:12px;
        font-weight:850;
        cursor:pointer;
      }
      body[data-page="productos"] .prodComPageBtn.is-active{
        border-color:#2479ff;
        background:#eff6ff;
        color:#2479ff;
      }
      body[data-page="productos"] .prodComPageBtn:disabled{
        opacity:.45;
        cursor:not-allowed;
      }
    `;
    document.head.appendChild(style);
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"/></svg>';
  }

  function ensureSlideDeleteButtons() {
    const productActions = document.querySelector('#prodComSlide .prodComSlide__actions');
    const productSave = document.getElementById('prodComSaveBtn');
    if (productActions && productSave && !document.getElementById('prodComDeleteBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'prodComDeleteBtn';
      btn.className = 'prodComGhost prodSlideDeleteBtn';
      btn.setAttribute('aria-label', 'Eliminar producto de la tabla');
      btn.innerHTML = trashIcon();
      productActions.insertBefore(btn, productSave);
    }

    const comboActions = document.querySelector('#prodComboSlide .prodComboSlide__actions');
    const comboSave = document.getElementById('prodComboSaveBtn');
    if (comboActions && comboSave && !document.getElementById('prodComboDeleteBtn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'prodComboDeleteBtn';
      btn.className = 'prodComboGhost prodSlideDeleteBtn';
      btn.setAttribute('aria-label', 'Eliminar combo de la tabla');
      btn.innerHTML = trashIcon();
      comboActions.insertBefore(btn, comboSave);
    }
  }

  function deletedIds() {
    return new Set(readArray(DELETED_KEY).map(function (id) { return String(id || '').trim(); }).filter(Boolean));
  }

  function markDeleted(id) {
    const clean = String(id || '').trim();
    if (!clean) return;
    const set = deletedIds();
    set.add(clean);
    writeArray(DELETED_KEY, Array.from(set));
  }

  function removeFromStorage(key, predicate) {
    const rows = readArray(key);
    writeArray(key, rows.filter(function (item) { return !predicate(item || {}); }));
  }

  function cleanupDeletedEntity(id, type) {
    const clean = String(id || '').trim();
    if (!clean) return;

    markDeleted(clean);

    removeFromStorage('sazzu_productos_payloads_local_v1', function (item) {
      return String(item.product_id || item.id || '') === clean;
    });
    removeFromStorage('sazzu_combos_payloads_local_v1', function (item) {
      return String(item.product_id || item.id || item.combo_id || '') === clean;
    });
    removeFromStorage('sazzu_productos_comestibles_v1', function (item) {
      return String(item.id || item.product_id || '') === clean;
    });
    removeFromStorage('sazzu_productos_combos_v1', function (item) {
      return String(item.id || item.combo_id || item.product_id || '') === clean;
    });
    removeFromStorage(LINKS_KEY, function (item) {
      const owner = type === 'combo' ? 'combo' : 'producto_comestible';
      return item.owner_type === owner && String(item.owner_id || '') === clean;
    });
  }

  function closeActiveSlide(type) {
    const closeBtn = type === 'combo' ? document.getElementById('prodComboCloseBtn') : document.getElementById('prodComCloseBtn');
    if (closeBtn) closeBtn.click();
  }

  function deleteActiveProduct() {
    const slide = document.getElementById('prodComSlide');
    const id = slide && slide.dataset ? String(slide.dataset.productId || '').trim() : '';
    if (!id) {
      closeActiveSlide('product');
      return;
    }
    if (!window.confirm('¿Eliminar este producto de la tabla?')) return;
    cleanupDeletedEntity(id, 'product');
    closeActiveSlide('product');
    removeRowsById(id);
    applyTableControls();
  }

  function deleteActiveCombo() {
    const slide = document.getElementById('prodComboSlide');
    const id = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
    if (!id || id === 'nuevo-combo') {
      closeActiveSlide('combo');
      return;
    }
    if (!window.confirm('¿Eliminar este combo de la tabla?')) return;
    cleanupDeletedEntity(id, 'combo');
    closeActiveSlide('combo');
    removeRowsById(id);
    applyTableControls();
  }

  function getRowEntityId(row) {
    if (!row) return '';
    return String(
      row.dataset.supabaseProductId ||
      row.dataset.localProductId ||
      row.dataset.productRowId ||
      row.querySelector('[data-edit-com]')?.dataset.editCom ||
      row.querySelector('[data-edit-local-product]')?.dataset.editLocalProduct ||
      row.querySelector('[data-edit-supabase-product]')?.dataset.editSupabaseProduct ||
      ''
    ).trim();
  }

  function isDataRow(row) {
    if (!row) return false;
    if (row.querySelector('.prodComEmpty')) return false;
    return !!row.querySelector('td');
  }

  function removeRowsById(id) {
    const clean = String(id || '').trim();
    if (!clean) return;
    document.querySelectorAll('#prodComTableBody tr').forEach(function (row) {
      if (getRowEntityId(row) === clean) row.remove();
    });
  }

  function ensurePaginationHost() {
    const tableCard = document.querySelector('.prodComTableCard');
    const wrap = tableCard && tableCard.querySelector('.prodComTableWrap');
    if (!tableCard || !wrap) return null;
    let host = tableCard.querySelector('.prodComPagination');
    if (!host) {
      host = document.createElement('div');
      host.className = 'prodComPagination';
      wrap.insertAdjacentElement('afterend', host);
    }
    return host;
  }

  function renderPagination(totalRows, totalPages) {
    const host = ensurePaginationHost();
    if (!host) return;

    if (!totalRows) {
      host.innerHTML = '';
      return;
    }

    const buttons = [];
    buttons.push('<button type="button" class="prodComPageBtn" data-prod-table-page="prev" ' + (tablePage <= 1 ? 'disabled' : '') + '>‹</button>');
    for (let i = 1; i <= totalPages; i += 1) {
      buttons.push('<button type="button" class="prodComPageBtn ' + (i === tablePage ? 'is-active' : '') + '" data-prod-table-page="' + i + '">' + i + '</button>');
    }
    buttons.push('<button type="button" class="prodComPageBtn" data-prod-table-page="next" ' + (tablePage >= totalPages ? 'disabled' : '') + '>›</button>');

    const from = totalRows ? ((tablePage - 1) * PAGE_SIZE) + 1 : 0;
    const to = Math.min(totalRows, tablePage * PAGE_SIZE);

    host.innerHTML = '<div class="prodComPagination__info">Mostrando ' + from + '-' + to + ' de ' + totalRows + '</div><div class="prodComPagination__controls">' + buttons.join('') + '</div>';
  }

  function applyTableControls() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;

    const deleted = deletedIds();
    Array.from(tbody.querySelectorAll('tr')).forEach(function (row) {
      const id = getRowEntityId(row);
      if (id && deleted.has(id)) row.remove();
    });

    const rows = Array.from(tbody.querySelectorAll('tr')).filter(isDataRow);
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    tablePage = Math.min(Math.max(1, tablePage), totalPages);

    const start = (tablePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    rows.forEach(function (row, index) {
      row.style.display = index >= start && index < end ? '' : 'none';
    });

    renderPagination(totalRows, totalPages);
  }

  function scheduleTableControls() {
    clearTimeout(tableApplyTimer);
    tableApplyTimer = setTimeout(applyTableControls, 80);
  }

  function bindTableObserver() {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody || tbody === observedTableBody) return;
    if (tableObserver) tableObserver.disconnect();
    observedTableBody = tbody;
    tableObserver = new MutationObserver(scheduleTableControls);
    tableObserver.observe(tbody, { childList: true });
    scheduleTableControls();
  }

  function handlePaginationClick(event) {
    const btn = event.target && event.target.closest && event.target.closest('[data-prod-table-page]');
    if (!btn) return;
    event.preventDefault();
    const action = String(btn.dataset.prodTablePage || '1');
    const tbody = document.getElementById('prodComTableBody');
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')).filter(isDataRow) : [];
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

    if (action === 'prev') tablePage -= 1;
    else if (action === 'next') tablePage += 1;
    else tablePage = Number(action || 1);

    tablePage = Math.min(Math.max(1, tablePage), totalPages);
    applyTableControls();
  }

  function wrapComboExtraRenderer() {
    if (comboRendererWrapped) return;
    const api = window.ProductosExtrasSelector;
    if (!api || typeof api.renderSelectedExtrasIntoComboBuilder !== 'function') return;

    const original = api.renderSelectedExtrasIntoComboBuilder;
    api.renderSelectedExtrasIntoComboBuilder = function () {
      const slide = document.getElementById('prodComboSlide');
      const body = document.getElementById('prodComboSlideBody');
      const active = !!(slide && slide.classList.contains('is-active'));
      const savedTop = body ? body.scrollTop : null;
      const winX = window.scrollX;
      const winY = window.scrollY;
      const result = original.apply(this, arguments);

      if (active) {
        requestAnimationFrame(function () {
          if (body && savedTop != null) body.scrollTop = savedTop;
          window.scrollTo(winX, winY);
        });
        setTimeout(function () {
          if (body && savedTop != null) body.scrollTop = savedTop;
          window.scrollTo(winX, winY);
        }, 80);
      }

      return result;
    };

    comboRendererWrapped = true;
  }

  function scheduleEnhancements() {
    injectStyles();
    [0, 80, 220, 520, 1000].forEach(function (delay) {
      setTimeout(function () {
        ensureSlideDeleteButtons();
        bindTableObserver();
        wrapComboExtraRenderer();
        applyTableControls();
      }, delay);
    });
  }

  function bind() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.body.dataset.comboExtrasSafeGuardBound === '2') return;
    document.body.dataset.comboExtrasSafeGuardBound = '2';

    window.addEventListener('productos:payload-ready', handlePayloadReady);

    window.addEventListener('click', function (event) {
      const isNewCombo = event.target && event.target.closest && event.target.closest('#prodComboNewBtn');
      if (isNewCombo && event.isTrusted === true) {
        [20, 100, 260, 620].forEach(function (delay) {
          setTimeout(prepareTrustedNewCombo, delay);
        });
      }

      if (event.target && event.target.closest && event.target.closest('#prodComDeleteBtn')) {
        event.preventDefault();
        deleteActiveProduct();
        return;
      }

      if (event.target && event.target.closest && event.target.closest('#prodComboDeleteBtn')) {
        event.preventDefault();
        deleteActiveCombo();
        return;
      }

      handlePaginationClick(event);
    }, true);

    window.ProductosComboExtrasDebug = {
      snapshot: function () {
        const slide = document.getElementById('prodComboSlide');
        const comboId = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
        const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
        return {
          safe_guard_active: true,
          combo_id: comboId,
          visible_cards_detected: cards.length,
          current_table_page: tablePage,
          last_action: window.__PRODUCTOS_COMBO_EXTRAS_SAFE_GUARD_LAST__ || null,
          time: new Date().toISOString()
        };
      }
    };

    scheduleEnhancements();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('sazzu:page:load', function () {
    bind();
    scheduleEnhancements();
  });
  window.addEventListener('load', function () {
    bind();
    scheduleEnhancements();
  });
})();
