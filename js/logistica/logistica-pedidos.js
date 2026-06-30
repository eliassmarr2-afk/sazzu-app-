/* ==========================================================
   Protocol Data · Logística · Tab Pedidos
   Fase 2C · lectura/escritura defensiva contra Supabase.
   No toca reglas, CP, excepciones, banners ni el bridge global.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaPedidosReady';
  const TRACKING_STORAGE_KEY = 'alpaso_tracking_orders';
  const TRACKING_EVENT = 'alpaso:tracking-orders-updated';

  const FALLBACK_ORDERS = [
    {
      tracking_id: 'ALP-000124',
      shopify_order_name: '#1001',
      cliente: 'Cliente Demo',
      email_cliente: 'cliente@email.com',
      telefono_cliente: '+54 9 11 0000-0001',
      estado_logistico: 'recibido',
      estado_visual_index: 1,
      banner_id: 'ban_navid_001',
      banda_horaria_estimada: '14:00 a 18:00',
      domicilio_entrega: 'Recoleta, 1189, Capital Federal',
      producto: 'Bandera Argentina para Capó | 130x120cm · Pack x3',
      pago_estado: 'no_pagado',
      monto_a_pagar_repartidor: '$15.990,00',
      envio_estado: 'gratis',
      envio_valor: '$0,00',
      issue_active: false,
      issue_stage: '',
      issue_type: '',
      issue_message_public: '',
      observacion_publica: 'Tu pedido fue recibido correctamente. El equipo de logística está preparando la compra para avanzar al siguiente estado.',
      observacion_interna: 'Pedido mock inicial preparado para conectar con Shopify orders/create.',
      responsable: 'Equipo de logística Al Paso Store',
      fecha_ultima_actualizacion: '2026-05-29 14:30'
    },
    {
      tracking_id: 'ALP-000125',
      shopify_order_name: '#1002',
      cliente: 'Comprador Demo',
      email_cliente: 'comprador@email.com',
      telefono_cliente: '+54 9 11 0000-0002',
      estado_logistico: 'en_camino',
      estado_visual_index: 3,
      banner_id: 'ban_navid_002',
      banda_horaria_estimada: '16:00 a 20:00',
      domicilio_entrega: 'Palermo, 1414, Capital Federal',
      producto: 'Sombrero Mundialista Argentina | Goma Espuma',
      pago_estado: 'pagado',
      monto_a_pagar_repartidor: '$0,00',
      envio_estado: 'pagado',
      envio_valor: '$7.240,00',
      issue_active: false,
      issue_stage: '',
      issue_type: '',
      issue_message_public: '',
      observacion_publica: 'Tu pedido ya fue despachado y se encuentra en distribución hacia el domicilio indicado.',
      observacion_interna: 'Entrega en curso sin incidencia.',
      responsable: 'Equipo de logística Al Paso Store',
      fecha_ultima_actualizacion: '2026-05-29 15:10'
    },
    {
      tracking_id: 'ALP-000126',
      shopify_order_name: '#1003',
      cliente: 'Usuario Intervenido',
      email_cliente: 'usuario@email.com',
      telefono_cliente: '+54 9 11 0000-0003',
      estado_logistico: 'despachado',
      estado_visual_index: 2,
      banner_id: 'ban_issue_001',
      banda_horaria_estimada: 'Pendiente',
      domicilio_entrega: 'Av. Siempre Viva 742, Buenos Aires',
      producto: 'Combo Accesorios Mundialistas',
      pago_estado: 'no_pagado',
      monto_a_pagar_repartidor: '$29.990,00',
      envio_estado: 'pagado',
      envio_valor: '$8.900,00',
      issue_active: true,
      issue_stage: 'despachado',
      issue_type: 'direccion_incorrecta',
      issue_message_public: 'Tuvimos un inconveniente con tu dirección de entrega. Nos pondremos en contacto contigo lo antes posible.',
      observacion_publica: 'El pedido está en revisión por el equipo de logística.',
      observacion_interna: 'CP no coincide con localidad declarada. Validar por soporte.',
      responsable: 'Equipo de logística Al Paso Store',
      fecha_ultima_actualizacion: '2026-05-29 15:35'
    }
  ];

  const state = window.__protocolLogisticaPedidosState || {
    query: '',
    status: 'todos',
    loading: false,
    saving: false,
    live: false,
    error: '',
    total: 0,
    orders: FALLBACK_ORDERS.slice()
  };

  window.__protocolLogisticaPedidosState = state;

  const statusLabels = {
    recibido: 'Recibido',
    despachado: 'Despachado',
    en_camino: 'En camino',
    entregado: 'Entregado'
  };

  const statusClasses = {
    recibido: 'logPedidosBadge--blue',
    despachado: 'logPedidosBadge--orange',
    en_camino: 'logPedidosBadge--green',
    entregado: 'logPedidosBadge--gray'
  };

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function q(selector) {
    const r = root();
    return r ? r.querySelector(selector) : null;
  }

  function cfg() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const shared = window.ProtocolAuth.getClient();
      if (shared) return shared;
    }

    if (window.__protocolLogisticaPedidosClient) return window.__protocolLogisticaPedidosClient;

    const c = cfg();
    const key = c && (c.anonKey || c.publishableKey || c.key);

    if (!window.supabase || !c || !c.url || !key) return null;

    window.__protocolLogisticaPedidosClient = window.supabase.createClient(c.url, key);
    return window.__protocolLogisticaPedidosClient;
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

  function toast(message, type) {
    let el = document.querySelector('#logToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'logToast';
      document.body.appendChild(el);
    }

    el.className = 'logToast is-visible is-' + (type || 'info');
    el.textContent = message;
    window.clearTimeout(window.__logPedidosToastTimer);
    window.__logPedidosToastTimer = window.setTimeout(() => {
      el.classList.remove('is-visible');
    }, 2600);
  }

  function statusIndex(status) {
    return Math.max(['recibido', 'despachado', 'en_camino', 'entregado'].indexOf(status) + 1, 1);
  }

  function normalizeOrder(order) {
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
      estado_logistico: order.estado_logistico || 'recibido',
      estado_visual_index: Number(order.estado_visual_index || statusIndex(order.estado_logistico)),
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
      fecha_ultima_actualizacion: order.fecha_ultima_actualizacion || new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
  }

  function normalizeForTracking(order) {
    return normalizeOrder(order);
  }

  function buildTrackingOrdersMap() {
    return state.orders.reduce((acc, order) => {
      const normalized = normalizeForTracking(order);
      if (normalized.tracking_id) acc[normalized.tracking_id] = normalized;
      return acc;
    }, {});
  }

  function publishTrackingContract() {
    const orders = buildTrackingOrdersMap();
    const payload = {
      source: state.live ? 'protocol-data-logistica-pedidos-supabase' : 'protocol-data-logistica-pedidos-mock',
      updated_at: new Date().toISOString(),
      orders
    };

    window.ALPASO_TRACKING_ORDERS = orders;
    window.__protocolTrackingOrdersPayload = payload;

    try {
      window.localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // El contrato global sigue disponible aunque el navegador bloquee localStorage.
    }

    window.dispatchEvent(new CustomEvent(TRACKING_EVENT, { detail: payload }));

    return payload;
  }

  window.ProtocolLogisticaPedidosExport = publishTrackingContract;

  function getStatusClass(status) {
    return statusClasses[status] || 'logPedidosBadge--gray';
  }

  function getPaymentBadge(order) {
    if (order.pago_estado === 'pagado') {
      return '<span class="logPedidosBadge logPedidosBadge--green">Pagado</span>';
    }

    return '<span class="logPedidosBadge logPedidosBadge--orange">No pagado</span>';
  }

  function getShippingBadge(order) {
    if (order.envio_estado === 'gratis') {
      return '<span class="logPedidosBadge logPedidosBadge--green">Envío gratis</span>';
    }

    if (order.envio_estado === 'a_confirmar') {
      return '<span class="logPedidosBadge logPedidosBadge--gray">Envío a confirmar</span>';
    }

    return '<span class="logPedidosBadge logPedidosBadge--blue">Envío ' + esc(order.envio_valor || '--') + '</span>';
  }

  function filteredOrders() {
    const query = state.query.trim().toLowerCase();

    return state.orders.filter((order) => {
      const matchesStatus = state.status === 'todos' || order.estado_logistico === state.status || (state.status === 'intervenido' && order.issue_active);
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
        order.issue_type
      ].join(' ').toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }

  function renderMetrics() {
    const active = state.orders.filter((order) => order.estado_logistico !== 'entregado').length;
    const pendingPayment = state.orders.filter((order) => order.pago_estado !== 'pagado').length;
    const issues = state.orders.filter((order) => order.issue_active).length;
    const delivered = state.orders.filter((order) => order.estado_logistico === 'entregado').length;

    const map = {
      '#logPedidosMetricActive': active,
      '#logPedidosMetricPendingPayment': pendingPayment,
      '#logPedidosMetricIssues': issues,
      '#logPedidosMetricDelivered': delivered
    };

    Object.keys(map).forEach((selector) => {
      const el = q(selector);
      if (el) el.textContent = map[selector];
    });
  }

  function renderTable() {
    const tbody = q('#logPedidosTbody');
    if (!tbody) return;

    if (state.loading) {
      tbody.innerHTML = '<tr><td colspan="12"><div class="logPedidosEmpty">Sincronizando pedidos desde Supabase...</div></td></tr>';
      return;
    }

    const orders = filteredOrders();

    if (!orders.length) {
      const message = state.error
        ? 'No se pudo leer Supabase. Se mantiene el fallback local hasta corregir la conexión.'
        : 'No hay pedidos para mostrar con los filtros actuales.';
      tbody.innerHTML = '<tr><td colspan="12"><div class="logPedidosEmpty">' + esc(message) + '</div></td></tr>';
      return;
    }

    tbody.innerHTML = orders.map((order) => {
      const payment = buildPaymentDisplay(order);
      return '<tr>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.tracking_id) + '</strong><span>' + esc(order.shopify_order_name) + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.cliente) + '</strong><span>' + esc(order.email_cliente || order.telefono_cliente || 'Sin contacto') + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.domicilio_entrega) + '</strong><span>' + esc(order.telefono_cliente || '') + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.producto) + '</strong><span>Banner ' + esc(order.banner_id) + '</span></div></td>' +
        '<td>' + getPaymentBadge(order) + '<br><span>' + esc(payment.main || '$0,00') + '</span>' + (payment.sub ? '<br><span>' + esc(payment.sub) + '</span>' : '') + '</td>' +
        '<td>' + getShippingBadge(order) + '</td>' +
        '<td><span class="logPedidosBadge ' + getStatusClass(order.estado_logistico) + '">' + esc(statusLabels[order.estado_logistico] || order.estado_logistico) + '</span><br><span>' + esc(order.banda_horaria_estimada || 'A confirmar') + '</span></td>' +
        '<td><span>' + esc(order.banner_id || '--') + '</span></td>' +
        '<td>' + (order.issue_active ? '<span class="logPedidosBadge logPedidosBadge--red">' + esc(order.issue_type || 'Intervenido') + '</span>' : '<span class="logPedidosBadge logPedidosBadge--gray">Sin incidencia</span>') + '</td>' +
        '<td><span>' + esc(order.observacion_publica || '--') + '</span></td>' +
        '<td><span>' + esc(order.fecha_ultima_actualizacion || '--') + '</span></td>' +
        '<td><button class="logPedidosActionBtn" type="button" data-log-pedido-edit="' + esc(order.tracking_id) + '">Editar</button></td>' +
      '</tr>';
    }).join('');
  }

  function renderAll() {
    publishTrackingContract();
    renderMetrics();
    renderTable();
  }

  async function loadOrdersFromSupabase(options) {
    const opts = options || {};
    const previousOrders = state.orders.slice();

    state.loading = true;
    state.error = '';
    renderTable();

    try {
      const result = await rpc('protocol_logistics_orders_list', {
        input_query: '',
        input_status: 'todos',
        input_limit: 100,
        input_offset: 0
      });

      const items = Array.isArray(result && result.items) ? result.items : [];
      state.orders = items.map(normalizeOrder);
      state.total = Number((result && result.total) || state.orders.length || 0);
      state.live = true;
      state.error = '';

      if (!opts.silent) toast('Pedidos sincronizados desde Supabase.', 'success');
    } catch (error) {
      console.warn('[Logística Pedidos Supabase]', error);
      state.orders = previousOrders.length ? previousOrders : FALLBACK_ORDERS.slice();
      state.live = false;
      state.error = error && error.message ? error.message : 'No se pudo conectar con Supabase';
      if (!opts.silent) toast('No se pudo sincronizar pedidos. Se mantiene el fallback local.', 'error');
    } finally {
      state.loading = false;
      renderAll();
    }
  }

  function fillSlide(order) {
    const setValue = (selector, value) => {
      const el = q(selector);
      if (el) el.value = value ?? '';
    };

    setValue('#logPedidoEditTrackingId', order.tracking_id);
    setValue('#logPedidoEditStatus', order.estado_logistico);
    setValue('#logPedidoEditTimeBand', order.banda_horaria_estimada);
    setValue('#logPedidoEditBanner', order.banner_id);
    setValue('#logPedidoEditAddress', order.domicilio_entrega);
    setValue('#logPedidoEditProduct', order.producto);
    setValue('#logPedidoEditPaymentStatus', order.pago_estado);
    setValue('#logPedidoEditAmountToCollect', order.monto_a_pagar_repartidor);
    setValue('#logPedidoEditShippingStatus', order.envio_estado === 'a_confirmar' ? 'pagado' : order.envio_estado);
    setValue('#logPedidoEditShippingValue', order.envio_valor);
    setValue('#logPedidoEditIssueStage', order.issue_stage);
    setValue('#logPedidoEditIssueType', order.issue_type);
    setValue('#logPedidoEditIssueMessage', order.issue_message_public);
    setValue('#logPedidoEditPublicObservation', order.observacion_publica);
    setValue('#logPedidoEditInternalObservation', order.observacion_interna);

    const issueActive = q('#logPedidoEditIssueActive');
    if (issueActive) issueActive.checked = Boolean(order.issue_active);

    const subtitle = q('#logPedidosSlideSubtitle');
    if (subtitle) subtitle.textContent = order.tracking_id + ' · ' + order.cliente;
  }

  function openSlide(trackingId) {
    const order = state.orders.find((item) => item.tracking_id === trackingId);
    const slide = q('#logPedidosSlide');

    if (!order || !slide) return;

    fillSlide(order);
    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('logPedidosLock');
    document.body.classList.add('logPedidosLock');
  }

  function closeSlide() {
    const slide = q('#logPedidosSlide');
    if (!slide) return;

    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('logPedidosLock');
    document.body.classList.remove('logPedidosLock');
  }

  function normalizeMoneyInput(value) {
    let clean = String(value || '').trim();
    if (!clean) return '0';

    clean = clean.replace(/[^0-9,.-]/g, '');

    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }

    const parsed = Number(clean);
    return Number.isFinite(parsed) ? String(parsed) : '0';
  }

  async function savePedido(event) {
    event.preventDefault();

    if (state.saving) return;

    const trackingId = q('#logPedidoEditTrackingId')?.value;
    const order = state.orders.find((item) => item.tracking_id === trackingId);

    if (!order) return;

    const value = (selector) => q(selector)?.value || '';

    const draft = {
      estado_logistico: value('#logPedidoEditStatus'),
      banda_horaria_estimada: value('#logPedidoEditTimeBand'),
      banner_id: value('#logPedidoEditBanner'),
      domicilio_entrega: value('#logPedidoEditAddress'),
      producto: value('#logPedidoEditProduct'),
      pago_estado: value('#logPedidoEditPaymentStatus'),
      monto_a_pagar_repartidor: value('#logPedidoEditAmountToCollect'),
      envio_estado: value('#logPedidoEditShippingStatus'),
      envio_valor: value('#logPedidoEditShippingValue'),
      issue_active: Boolean(q('#logPedidoEditIssueActive')?.checked),
      issue_stage: value('#logPedidoEditIssueStage'),
      issue_type: value('#logPedidoEditIssueType'),
      issue_message_public: value('#logPedidoEditIssueMessage'),
      observacion_publica: value('#logPedidoEditPublicObservation'),
      observacion_interna: value('#logPedidoEditInternalObservation')
    };

    draft.estado_visual_index = statusIndex(draft.estado_logistico);
    draft.fecha_ultima_actualizacion = new Date().toISOString().slice(0, 16).replace('T', ' ');

    state.saving = true;

    try {
      if (state.live) {
        const result = await rpc('protocol_logistics_order_update', {
          input_tracking_id: trackingId,
          input_estado_logistico: draft.estado_logistico,
          input_banda_horaria_estimada: draft.banda_horaria_estimada,
          input_banner_id: draft.banner_id,
          input_envio_estado: draft.envio_estado,
          input_envio_valor: normalizeMoneyInput(draft.envio_valor),
          input_monto_a_pagar_repartidor: normalizeMoneyInput(draft.monto_a_pagar_repartidor),
          input_issue_active: draft.issue_active,
          input_issue_stage: draft.issue_stage,
          input_issue_type: draft.issue_type,
          input_issue_message_public: draft.issue_message_public,
          input_observacion_publica: draft.observacion_publica,
          input_observacion_interna: draft.observacion_interna
        });

        if (!result || result.status !== 'ok') {
          throw new Error((result && result.message) || 'No se pudo actualizar el pedido.');
        }
      }

      Object.assign(order, draft);
      closeSlide();
      renderAll();
      toast(state.live ? 'Pedido actualizado en Supabase.' : 'Pedido actualizado en modo local.', 'success');
    } catch (error) {
      console.warn('[Logística Pedidos Update]', error);
      toast(error && error.message ? error.message : 'No se pudo guardar el pedido.', 'error');
    } finally {
      state.saving = false;
    }
  }

  function bind() {
    const r = root();
    if (!r || r.dataset.logisticaPedidosBound === '1') return;

    r.dataset.logisticaPedidosBound = '1';

    q('#logPedidosSearch')?.addEventListener('input', (event) => {
      state.query = event.target.value || '';
      renderTable();
    });

    q('#logPedidosStatusFilter')?.addEventListener('change', (event) => {
      state.status = event.target.value || 'todos';
      renderTable();
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('#logBtnSyncSupabase')) {
        window.setTimeout(() => loadOrdersFromSupabase({ silent: true }), 350);
      }
    }, true);

    r.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-log-pedido-edit]');
      if (editBtn) openSlide(editBtn.dataset.logPedidoEdit);
    });

    q('#logPedidosSlideOverlay')?.addEventListener('click', closeSlide);
    q('#logPedidosSlideClose')?.addEventListener('click', closeSlide);
    q('#logPedidosSlideCancel')?.addEventListener('click', closeSlide);
    q('#logPedidosForm')?.addEventListener('submit', savePedido);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSlide();
    });
  }

  function init() {
    bind();
    renderAll();
    loadOrdersFromSupabase({ silent: true });
  }

  window.ProtocolLogisticaPedidosInit = init;
  window.ProtocolLogisticaPedidosRefresh = loadOrdersFromSupabase;

  document.addEventListener(PAGE_EVENT, init);
  document.addEventListener('DOMContentLoaded', init);

  if (document.readyState !== 'loading') {
    init();
  }
})();