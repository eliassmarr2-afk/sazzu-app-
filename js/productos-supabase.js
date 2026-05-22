(function () {
  const PRODUCTOS_CONTEXT = {
    workspace_id: 'workspace_demo_sazzu',
    store_id: 'store_demo_food',
    created_by: 'user_demo'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(value) {
    return '$ ' + Number(value || 0).toLocaleString('es-AR');
  }

  function statusLabel(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'activo') return 'Activo';
    if (v === 'oculto') return 'Oculto';
    if (v === 'archivado') return 'Archivado';
    return 'Borrador';
  }

  function typeLabel(value) {
    return value === 'combo' ? 'Combo' : 'Producto simple';
  }

  function rowCounts(item) {
    if (item.product_type === 'combo') {
      return {
        size: item.component_count || 0,
        extra: item.optional_count || 0,
        removable: 0,
        recommended: item.combo_extra_count || 0
      };
    }

    return {
      size: item.version_count || 0,
      extra: item.extra_count || 0,
      removable: item.removable_count || 0,
      recommended: item.recommended_count || 0
    };
  }

  function currentFilters() {
    return {
      q: String(document.getElementById('prodComSearch')?.value || '').trim().toLowerCase(),
      status: String(document.getElementById('prodComEstado')?.value || 'todos').trim().toLowerCase()
    };
  }

  function rowMatches(item, filters) {
    const haystack = [item.name, item.category, item.product_type, item.status].join(' ').toLowerCase();
    const qOk = !filters.q || haystack.includes(filters.q);
    const statusOk = filters.status === 'todos' || String(item.status || '').toLowerCase() === filters.status;
    return qOk && statusOk;
  }

  function renderSupabaseRows(items) {
    const tbody = document.getElementById('prodComTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('[data-supabase-product-row="1"]').forEach((row) => row.remove());

    const filters = currentFilters();
    const rows = (items || []).filter((item) => rowMatches(item, filters));
    if (!rows.length) return;

    rows.forEach((item) => {
      const localRow = tbody.querySelector('[data-local-product-id="' + CSS.escape(item.client_product_key) + '"]');
      if (localRow) localRow.remove();
    });

    const html = rows.map((item) => {
      const counts = rowCounts(item);
      const label = statusLabel(item.status);
      const statusClass = label === 'Activo' ? 'prodComBadge--green' : 'prodComBadge--gray';
      const image = item.primary_image_url;
      return '<tr data-supabase-product-row="1" data-supabase-product-id="' + escapeHtml(item.client_product_key) + '">' +
        '<td><div class="prodComCell"><div class="prodComThumb">' + (image ? '<img src="' + escapeHtml(image) + '" alt="">' : '<span>IMG</span>') + '</div><div><strong>' + escapeHtml(item.name || 'Producto sin nombre') + '</strong><span>' + escapeHtml(item.category || '') + ' · Supabase</span></div></div></td>' +
        '<td><span class="prodComBadge prodComBadge--blue">' + escapeHtml(typeLabel(item.product_type)) + '</span></td>' +
        '<td><strong>' + escapeHtml(formatMoney(item.base_price)) + '</strong></td>' +
        '<td>' + escapeHtml(counts.size) + '</td>' +
        '<td>' + escapeHtml(counts.extra) + '</td>' +
        '<td>' + escapeHtml(counts.removable) + '</td>' +
        '<td>' + escapeHtml(counts.recommended) + '</td>' +
        '<td>' + escapeHtml(item.images_count || 0) + '/6</td>' +
        '<td><span class="prodComBadge ' + statusClass + '">' + escapeHtml(label) + '</span></td>' +
        '<td><button type="button" class="prodComEdit" data-edit-supabase-product="' + escapeHtml(item.client_product_key) + '">Editar</button></td>' +
      '</tr>';
    }).join('');

    tbody.insertAdjacentHTML('afterbegin', html);
  }

  async function listProducts() {
    if (!window.SazzuSupabase) return null;
    const result = await window.SazzuSupabase.rpc('rpc_products_list_products', {
      p_workspace_id: PRODUCTOS_CONTEXT.workspace_id,
      p_store_id: PRODUCTOS_CONTEXT.store_id,
      p_status: null,
      p_product_type: null,
      p_search: null
    });
    const items = result && result.items ? result.items : [];
    window.__lastSupabaseProducts = items;
    renderSupabaseRows(items);
    return items;
  }

  async function upsertProduct(payload) {
    if (!window.SazzuSupabase || !payload) return null;
    return window.SazzuSupabase.rpc('rpc_products_upsert_product', {
      p_payload: payload
    });
  }

  async function getProductDetail(clientProductKey) {
    if (!window.SazzuSupabase) return null;
    const result = await window.SazzuSupabase.rpc('rpc_products_get_product_detail', {
      p_workspace_id: PRODUCTOS_CONTEXT.workspace_id,
      p_store_id: PRODUCTOS_CONTEXT.store_id,
      p_client_product_key: clientProductKey
    });
    return result && result.product ? result.product : null;
  }

  function removeLocalDuplicate(clientProductKey) {
    if (!clientProductKey) return;
    document.querySelectorAll('[data-local-product-id="' + CSS.escape(clientProductKey) + '"]').forEach((row) => row.remove());
  }

  async function handlePayloadReady(event) {
    const payload = event.detail && event.detail.payload ? event.detail.payload : null;
    if (!payload) return;

    try {
      const result = await upsertProduct(payload);
      console.log('[productos-supabase.js] Producto guardado en Supabase:', result);
      removeLocalDuplicate(payload.product_id);
      await listProducts();
      window.dispatchEvent(new CustomEvent('productos:supabase-saved', { detail: { payload, result } }));
    } catch (error) {
      console.warn('[productos-supabase.js] Falló Supabase. Se mantiene fallback local:', error);
      window.dispatchEvent(new CustomEvent('productos:supabase-error', { detail: { payload, error } }));
    }
  }

  function fillProductLikePayload(detail) {
    if (!detail || !window.ProductosPayloads) return;
    const payload = Object.assign({}, detail, {
      product_id: detail.product_id,
      identity: detail.identity || {},
      images: detail.images || [],
      options: detail.options || [],
      combo_components: detail.combo_components || [],
      optional_products: detail.optional_products || [],
      combo_extras: detail.combo_extras || []
    });
    window.__lastSupabaseProductDetail = payload;
  }

  function openSupabaseProduct(clientProductKey) {
    getProductDetail(clientProductKey).then((detail) => {
      if (!detail) return;
      fillProductLikePayload(detail);
      if (detail.product_type === 'combo') {
        const btn = document.getElementById('prodComboNewBtn');
        if (btn) btn.click();
        window.setTimeout(() => {
          const localEvent = new CustomEvent('productos:open-local-payload', { detail });
          window.dispatchEvent(localEvent);
        }, 120);
        return;
      }
      const btn = document.getElementById('prodComNuevoBtn');
      if (btn) btn.click();
      window.setTimeout(() => {
        const localEvent = new CustomEvent('productos:open-local-payload', { detail });
        window.dispatchEvent(localEvent);
      }, 120);
    }).catch((error) => {
      console.warn('[productos-supabase.js] No se pudo cargar detalle Supabase:', error);
    });
  }

  function bindUi() {
    const tab = document.getElementById('prodTabComestibles');
    const search = document.getElementById('prodComSearch');
    const status = document.getElementById('prodComEstado');

    if (tab && tab.dataset.supabaseBound !== '1') {
      tab.dataset.supabaseBound = '1';
      tab.addEventListener('click', function () {
        setTimeout(listProducts, 180);
      });
    }

    if (search && search.dataset.supabaseBound !== '1') {
      search.dataset.supabaseBound = '1';
      search.addEventListener('input', function () {
        renderSupabaseRows(window.__lastSupabaseProducts || []);
      });
    }

    if (status && status.dataset.supabaseBound !== '1') {
      status.dataset.supabaseBound = '1';
      status.addEventListener('change', function () {
        renderSupabaseRows(window.__lastSupabaseProducts || []);
      });
    }
  }

  function handleDocumentClick(event) {
    const edit = event.target.closest && event.target.closest('[data-edit-supabase-product]');
    if (!edit) return;
    event.preventDefault();
    openSupabaseProduct(edit.dataset.editSupabaseProduct);
  }

  function initProductosSupabase() {
    const body = document.querySelector('body[data-page="productos"]');
    if (!body) return;

    if (body.dataset.productosSupabaseReady !== '1') {
      body.dataset.productosSupabaseReady = '1';
      window.addEventListener('productos:payload-ready', handlePayloadReady);
      document.addEventListener('click', handleDocumentClick, true);
    }

    bindUi();
    setTimeout(listProducts, 500);
  }

  window.ProductosSupabase = {
    listProducts,
    upsertProduct,
    getProductDetail,
    renderSupabaseRows
  };

  document.addEventListener('DOMContentLoaded', initProductosSupabase);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(initProductosSupabase, 160);
    setTimeout(initProductosSupabase, 500);
  });
})();
