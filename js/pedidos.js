/* ==========================================================
   Protocol Data · Panel Pedidos
   Fase 2D · lectura defensiva desde Supabase / Shopify orders.
   Vista general del pedido. No toca Logística ni Shopify theme.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolSidebarPedidosReady';

  const state = window.__protocolSidebarPedidosState || {
    all: [],
    filtered: [],
    query: '',
    status: 'todos',
    page: 1,
    pageSize: 12,
    total: 0,
    loading: false,
    live: false,
    error: ''
  };

  window.__protocolSidebarPedidosState = state;

  const statusLabels = {
    recibido: 'Recibido',
    despachado: 'Despachado',
    en_camino: 'En camino',
    entregado: 'Entregado'
  };

  const statusClasses = {
    recibido: 'ordersBadge--blue',
    despachado: 'ordersBadge--orange',
    en_camino: 'ordersBadge--green',
    entregado: 'ordersBadge--gray'
  };

  function el(id) {
    return document.getElementById(id);
  }

  function isPedidosPage() {
    return Boolean(document.querySelector('body[data-page="pedidos"]'));
  }

  function cfg() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const shared = window.ProtocolAuth.getClient();
      if (shared) return shared;
    }

    if (window.__protocolSidebarPedidosClient) return window.__protocolSidebarPedidosClient;

    const c = cfg();
    const key = c && (c.anonKey || c.publishableKey || c.key);

    if (!window.supabase || !c || !c.url || !key) return null;

    window.__protocolSidebarPedidosClient = window.supabase.createClient(c.url, key);
    return window.__protocolSidebarPedidosClient;
  }

  async function rpc(name, args) {
    const c = client();
    if (!c) throw new Error('Supabase no configurado');

    const res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function norm(value) {
    return String(value || '').trim().toLowerCase();
  }

  function moneyFromUnknown(value) {
    if (value == null || value === '') return '';

    const raw = String(value).trim();
    if (!raw) return '';
    if (raw.includes('$')) return raw;

    let numeric = raw.replace(/[^0-9,.-]/g, '');
    if (!numeric) return '';

    if (numeric.includes(',')) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    }

    const parsed = Number(numeric);
    if (!Number.isFinite(parsed)) return raw;

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parsed);
  }

  function firstMoney(...values) {
    for (const value of values) {
      const formatted = moneyFromUnknown(value);
      if (!formatted) continue;
      if (formatted.replace(/\s/g, '') === '$0,00') continue;
      return formatted;
    }
    return '';
  }

  function buildPaymentDisplay(order) {
    const saleTotal = firstMoney(
      order.total_venta,
      order.total_venta_pedido,
      order.monto_total_pedido,
      order.total_pedido,
      order.shopify_total_price,
      order.total_price,
      order.gross_amount,
      order.bruto
    );

    const collectAmount = moneyFromUnknown(order.monto_a_pagar_repartidor) || '$0,00';
    const isPaid = order.pago_estado === 'pagado';

    if (saleTotal) {
      return {
        main: saleTotal,
        sub: isPaid && collectAmount.replace(/\s/g, '') === '$0,00'
          ? 'Cobro repartidor: $0,00'
          : (collectAmount ? 'Cobro repartidor: ' + collectAmount : '')
      };
    }

    return {
      main: collectAmount || '$0,00',
      sub: ''
    };
  }

  function setConnection(message, type) {
    const badge = el('ordersConnectionBadge');
    if (!badge) return;

    badge.textContent = message;
    badge.className = 'ordersConnectionBadge ' + (type || '');
  }

  function toast(message, type) {
    let box = document.getElementById('ordersToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ordersToast';
      box.style.position = 'fixed';
      box.style.right = '16px';
      box.style.bottom = '16px';
      box.style.zIndex = '99999';
      box.style.maxWidth = '360px';
      box.style.borderRadius = '5px';
      box.style.padding = '12px 14px';
      box.style.fontSize = '13px';
      box.style.fontWeight = '850';
      box.style.boxShadow = '0 16px 34px rgba(15,23,42,.18)';
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.background = type === 'error' ? '#fff0f0' : '#e9f9f0';
    box.style.color = type === 'error' ? '#b42318' : '#168a50';
    box.hidden = false;

    window.clearTimeout(window.__ordersToastTimer);
    window.__ordersToastTimer = window.setTimeout(() => {
      box.hidden = true;
    }, 2800);
  }

  function statusIndex(status) {
    return Math.max(['recibido', 'despachado', 'en_camino', 'entregado'].indexOf(status) + 1, 1);
  }

  function normalizeOrder(order) {
    const estado = order.estado_logistico || 'recibido';
    const totalVenta = firstMoney(
      order.total_venta,
      order.total_venta_pedido,
      order.monto_total_pedido,
      order.total_pedido,
      order.shopify_total_price,
      order.total_price,
      order.gross_amount,
      order.bruto
    );

    return {
      tracking_id: String(order.tracking_id || '').toUpperCase(),
      shopify_order_name: order.shopify_order_name || '',
      cliente: order.cliente || 'Cliente sin nombre',
      email_cliente: order.email_cliente || '',
      telefono_cliente: order.telefono_cliente || '',
      estado_logistico: estado,
      estado_visual_index: Number(order.estado_visual_index || statusIndex(estado)),
      banner_id: order.banner_id || 'banner_operativo_default',
      banda_horaria_estimada: order.banda_horaria_estimada || 'A confirmar',
      domicilio_entrega: order.domicilio_entrega || '--',
      producto: order.producto || '--',
      pago_estado: order.pago_estado || 'no_pagado',
      monto_a_pagar_repartidor: order.monto_a_pagar_repartidor || '$0,00',
      total_venta: totalVenta,
      envio_estado: order.envio_estado || 'a_confirmar',
      envio_valor: order.envio_valor || '$0,00',
      issue_active: Boolean(order.issue_active),
      issue_stage: order.issue_stage || '',
      issue_type: order.issue_type || '',
      issue_message_public: order.issue_message_public || '',
      observacion_publica: order.observacion_publica || '',
      observacion_interna: order.observacion_interna || '',
      responsable: order.responsable || 'Equipo de logística Al Paso Store',
      fecha_ultima_actualizacion: order.fecha_ultima_actualizacion || '--'
    };
  }

  function getStatusBadge(order) {
    const cls = statusClasses[order.estado_logistico] || 'ordersBadge--gray';
    const label = statusLabels[order.estado_logistico] || order.estado_logistico || 'Pendiente';
    return '<span class="ordersBadge ' + cls + '">' + esc(label) + '</span>';
  }

  function getPaymentBadge(order) {
    if (order.pago_estado === 'pagado') {
      return '<span class="ordersBadge ordersBadge--green">Pagado</span>';
    }

    return '<span class="ordersBadge ordersBadge--orange">No pagado</span>';
  }

  function getShippingBadge(order) {
    if (order.envio_estado === 'gratis') {
      return '<span class="ordersBadge ordersBadge--green">Envío gratis</span>';
    }

    if (order.envio_estado === 'a_confirmar') {
      return '<span class="ordersBadge ordersBadge--gray">A confirmar</span>';
    }

    return '<span class="ordersBadge ordersBadge--blue">Envío ' + esc(order.envio_valor || '--') + '</span>';
  }

  function applyFilters() {
    const query = norm(state.query);
    const filter = norm(state.status || 'todos');

    state.filtered = state.all.filter((order) => {
      const statusMatch =
        filter === 'todos' ||
        order.estado_logistico === filter ||
        (filter === 'intervenido' && order.issue_active) ||
        (filter === 'pago_pendiente' && order.pago_estado !== 'pagado');

      if (!statusMatch) return false;
      if (!query) return true;

      const haystack = [
        order.tracking_id,
        order.shopify_order_name,
        order.cliente,
        order.email_cliente,
        order.telefono_cliente,
        order.domicilio_entrega,
        order.producto,
        order.banner_id,
        order.estado_logistico,
        order.issue_type,
        order.observacion_publica
      ].map(norm).join(' | ');

      return haystack.includes(query);
    });

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
  }

  function renderMetrics() {
    const active = state.all.filter((order) => order.estado_logistico !== 'entregado').length;
    const pendingPayment = state.all.filter((order) => order.pago_estado !== 'pagado').length;
    const issues = state.all.filter((order) => order.issue_active).length;
    const delivered = state.all.filter((order) => order.estado_logistico === 'entregado').length;

    const values = {
      ordersMetricActive: active,
      ordersMetricPendingPayment: pendingPayment,
      ordersMetricIssues: issues,
      ordersMetricDelivered: delivered
    };

    Object.keys(values).forEach((id) => {
      const node = el(id);
      if (node) node.textContent = values[id];
    });
  }

  function renderInfo() {
    const info = el('ordersInfo');
    if (!info) return;

    const source = state.live ? 'Supabase activo' : 'Sin conexión';
    info.textContent = state.filtered.length + ' pedidos visibles · ' + state.all.length + ' totales · ' + source;
  }

  function renderPager() {
    const meta = el('ordersPagerMeta');
    const prev = el('btnPrevOrders');
    const next = el('btnNextOrders');

    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = total ? Math.min(state.page * state.pageSize, total) : 0;

    if (meta) meta.textContent = start + '-' + end + ' de ' + total;
    if (prev) prev.disabled = state.page <= 1;
    if (next) next.disabled = state.page >= totalPages;
  }

  function renderTable() {
    const container = el('ordersList');
    if (!container) return;

    if (state.loading) {
      container.innerHTML = '<div class="ordersEmpty">Sincronizando pedidos desde Supabase...</div>';
      renderPager();
      return;
    }

    applyFilters();
    renderMetrics();
    renderInfo();
    renderPager();

    if (state.error && !state.all.length) {
      container.innerHTML = '<div class="ordersEmpty">No se pudo conectar con Supabase. Revisá configuración o permisos RPC.</div>';
      return;
    }

    if (!state.filtered.length) {
      container.innerHTML = '<div class="ordersEmpty">No hay pedidos para mostrar con los filtros actuales.</div>';
      return;
    }

    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);

    const body = rows.map((order) => {
      const payment = buildPaymentDisplay(order);
      return '<tr>' +
        '<td><div class="ordersMiniStack"><strong>' + esc(order.tracking_id) + '</strong><span>' + esc(order.shopify_order_name || 'Sin número Shopify') + '</span></div></td>' +
        '<td><div class="ordersMiniStack"><strong>' + esc(order.cliente) + '</strong><span>' + esc(order.email_cliente || order.telefono_cliente || 'Sin contacto') + '</span></div></td>' +
        '<td><div class="ordersMiniStack"><strong>' + esc(order.domicilio_entrega) + '</strong><span>' + esc(order.telefono_cliente || '') + '</span></div></td>' +
        '<td><div class="ordersMiniStack"><strong>' + esc(order.producto) + '</strong><span>Banner ' + esc(order.banner_id || '--') + '</span></div></td>' +
        '<td>' + getPaymentBadge(order) + '<br><span>' + esc(payment.main || '$0,00') + '</span>' + (payment.sub ? '<br><span>' + esc(payment.sub) + '</span>' : '') + '</td>' +
        '<td>' + getShippingBadge(order) + '</td>' +
        '<td>' + getStatusBadge(order) + '<br><span>' + esc(order.banda_horaria_estimada || 'A confirmar') + '</span></td>' +
        '<td>' + (order.issue_active ? '<span class="ordersBadge ordersBadge--red">' + esc(order.issue_type || 'Intervenido') + '</span>' : '<span class="ordersBadge ordersBadge--gray">Sin incidencia</span>') + '</td>' +
        '<td><span>' + esc(order.fecha_ultima_actualizacion || '--') + '</span></td>' +
        '<td><button class="ordersActionBtn" type="button" data-order-detail="' + esc(order.tracking_id) + '">Ver detalle</button></td>' +
      '</tr>';
    }).join('');

    container.innerHTML = '<table class="ordersTable" aria-label="Pedidos conectados a Supabase"><thead><tr>' +
      '<th>Pedido</th><th>Cliente</th><th>Domicilio</th><th>Producto</th><th>Pago</th><th>Envío</th><th>Estado</th><th>Incidencia</th><th>Actualización</th><th></th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  async function loadOrders(options) {
    const opts = options || {};

    state.loading = true;
    state.error = '';
    renderTable();
    setConnection('Sincronizando...', 'is-loading');

    try {
      const data = await rpc('protocol_logistics_orders_list', {
        input_query: '',
        input_status: 'todos',
        input_limit: 100,
        input_offset: 0
      });

      const items = Array.isArray(data && data.items) ? data.items : [];
      state.all = items.map(normalizeOrder);
      state.total = Number((data && data.total) || state.all.length || 0);
      state.live = true;
      state.error = '';
      setConnection('Supabase activo', 'is-live');

      if (!opts.silent) toast('Pedidos sincronizados desde Supabase.', 'success');
    } catch (error) {
      console.warn('[Pedidos Supabase]', error);
      state.error = error && error.message ? error.message : 'No se pudo conectar con Supabase';
      state.live = false;
      setConnection('Sin conexión', 'is-error');

      if (!opts.silent) toast('No se pudo sincronizar pedidos.', 'error');
    } finally {
      state.loading = false;
      renderTable();
    }
  }

  function detailItem(label, value) {
    return '<div class="ordersDetailItem"><span>' + esc(label) + '</span><strong>' + esc(value || '—') + '</strong></div>';
  }

  function detailCard(title, items) {
    return '<article class="ordersDetailCard"><h3>' + esc(title) + '</h3><div class="ordersDetailGrid">' + items.join('') + '</div></article>';
  }

  function openDetail(trackingId) {
    const order = state.all.find((item) => item.tracking_id === trackingId);
    const slide = el('ordersDetailSlide');
    const content = el('ordersDetailContent');
    const subtitle = el('ordersDetailSubtitle');

    if (!order || !slide || !content) return;

    if (subtitle) subtitle.textContent = order.tracking_id + ' · ' + order.cliente;

    const payment = buildPaymentDisplay(order);

    content.innerHTML = [
      detailCard('Pedido', [
        detailItem('Tracking ID', order.tracking_id),
        detailItem('Pedido Shopify', order.shopify_order_name),
        detailItem('Estado logístico', statusLabels[order.estado_logistico] || order.estado_logistico),
        detailItem('Última actualización', order.fecha_ultima_actualizacion)
      ]),
      detailCard('Cliente', [
        detailItem('Nombre', order.cliente),
        detailItem('Email', order.email_cliente),
        detailItem('Teléfono', order.telefono_cliente),
        detailItem('Responsable', order.responsable)
      ]),
      detailCard('Entrega', [
        detailItem('Domicilio', order.domicilio_entrega),
        detailItem('Producto resumen', order.producto),
        detailItem('Envío', order.envio_estado + ' · ' + order.envio_valor),
        detailItem('Banda horaria', order.banda_horaria_estimada),
        detailItem('Banner', order.banner_id)
      ]),
      detailCard('Pago e incidencias', [
        detailItem('Estado de pago', order.pago_estado),
        detailItem('Total venta Shopify', payment.main || order.total_venta || '—'),
        detailItem('Monto a cobrar repartidor', order.monto_a_pagar_repartidor),
        detailItem('Incidencia activa', order.issue_active ? 'Sí' : 'No'),
        detailItem('Tipo de incidencia', order.issue_type),
        detailItem('Mensaje público incidencia', order.issue_message_public),
        detailItem('Observación pública', order.observacion_publica),
        detailItem('Observación interna', order.observacion_interna)
      ])
    ].join('');

    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ordersSlideLock');
    document.body.classList.add('ordersSlideLock');
  }

  function closeDetail() {
    const slide = el('ordersDetailSlide');
    if (!slide) return;

    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ordersSlideLock');
    document.body.classList.remove('ordersSlideLock');
  }

  function bind() {
    if (!isPedidosPage()) return;

    const main = document.querySelector('main.ordersMain');
    if (!main || main.dataset.ordersBound === '1') return;

    main.dataset.ordersBound = '1';

    el('ordersRefreshBtn')?.addEventListener('click', () => loadOrders({ silent: false }));

    el('ordersSearch')?.addEventListener('input', (event) => {
      state.query = event.target.value || '';
      state.page = 1;
      renderTable();
    });

    el('ordersStatusFilter')?.addEventListener('change', (event) => {
      state.status = event.target.value || 'todos';
      state.page = 1;
      renderTable();
    });

    el('ordersClearBtn')?.addEventListener('click', () => {
      state.query = '';
      state.status = 'todos';
      state.page = 1;

      const search = el('ordersSearch');
      const filter = el('ordersStatusFilter');
      if (search) search.value = '';
      if (filter) filter.value = 'todos';

      renderTable();
    });

    el('btnPrevOrders')?.addEventListener('click', () => {
      state.page = Math.max(1, state.page - 1);
      renderTable();
    });

    el('btnNextOrders')?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      state.page = Math.min(totalPages, state.page + 1);
      renderTable();
    });

    document.addEventListener('click', (event) => {
      const detailBtn = event.target.closest('[data-order-detail]');
      if (detailBtn) openDetail(detailBtn.dataset.orderDetail);
    });

    el('ordersDetailOverlay')?.addEventListener('click', closeDetail);
    el('ordersDetailClose')?.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDetail();
    });
  }

  function init() {
    if (!isPedidosPage()) return;

    bind();

    if (!window[READY_FLAG]) {
      window[READY_FLAG] = true;
      loadOrders({ silent: true });
      return;
    }

    renderTable();
  }

  window.ProtocolPedidosRefresh = loadOrders;

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener(PAGE_EVENT, init);

  if (document.readyState !== 'loading') {
    init();
  }
})();