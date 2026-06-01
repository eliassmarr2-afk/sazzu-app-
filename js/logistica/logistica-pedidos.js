/* ==========================================================
   Protocol Data · Logística · Tab Pedidos
   Módulo aislado preparado para estados públicos de envío.
   No toca reglas, CP, excepciones, banners ni bridge Supabase.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaPedidosReady';
  const TRACKING_STORAGE_KEY = 'alpaso_tracking_orders';
  const TRACKING_EVENT = 'alpaso:tracking-orders-updated';

  const state = window.__protocolLogisticaPedidosState || {
    query: '',
    status: 'todos',
    orders: [
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
    ]
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

  function normalizeForTracking(order) {
    return {
      tracking_id: order.tracking_id,
      shopify_order_name: order.shopify_order_name || '',
      cliente: order.cliente || '',
      email_cliente: order.email_cliente || '',
      telefono_cliente: order.telefono_cliente || '',
      estado_logistico: order.estado_logistico || 'recibido',
      estado_visual_index: order.estado_visual_index || 1,
      banner_id: order.banner_id || '',
      banda_horaria_estimada: order.banda_horaria_estimada || 'A confirmar',
      domicilio_entrega: order.domicilio_entrega || '--',
      producto: order.producto || '--',
      pago_estado: order.pago_estado || 'no_pagado',
      monto_a_pagar_repartidor: order.monto_a_pagar_repartidor || '$0,00',
      envio_estado: order.envio_estado || 'gratis',
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

  function buildTrackingOrdersMap() {
    return state.orders.reduce((acc, order) => {
      const normalized = normalizeForTracking(order);
      acc[String(normalized.tracking_id || '').toUpperCase()] = normalized;
      return acc;
    }, {});
  }

  function publishTrackingContract() {
    const orders = buildTrackingOrdersMap();
    const payload = {
      source: 'protocol-data-logistica-pedidos-mock',
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

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function q(selector) {
    const r = root();
    return r ? r.querySelector(selector) : null;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

    const orders = filteredOrders();

    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="12"><div class="logPedidosEmpty">No hay pedidos para mostrar con los filtros actuales.</div></td></tr>';
      return;
    }

    tbody.innerHTML = orders.map((order) => {
      return '<tr>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.tracking_id) + '</strong><span>' + esc(order.shopify_order_name) + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.cliente) + '</strong><span>' + esc(order.email_cliente || order.telefono_cliente || 'Sin contacto') + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.domicilio_entrega) + '</strong><span>' + esc(order.telefono_cliente || '') + '</span></div></td>' +
        '<td><div class="logPedidosMiniStack"><strong>' + esc(order.producto) + '</strong><span>Banner ' + esc(order.banner_id) + '</span></div></td>' +
        '<td>' + getPaymentBadge(order) + '<br><span>' + esc(order.monto_a_pagar_repartidor || '$0,00') + '</span></td>' +
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
    setValue('#logPedidoEditShippingStatus', order.envio_estado);
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

  function savePedido(event) {
    event.preventDefault();

    const trackingId = q('#logPedidoEditTrackingId')?.value;
    const order = state.orders.find((item) => item.tracking_id === trackingId);

    if (!order) return;

    const value = (selector) => q(selector)?.value || '';

    order.estado_logistico = value('#logPedidoEditStatus');
    order.estado_visual_index = ['recibido', 'despachado', 'en_camino', 'entregado'].indexOf(order.estado_logistico) + 1;
    order.banda_horaria_estimada = value('#logPedidoEditTimeBand');
    order.banner_id = value('#logPedidoEditBanner');
    order.domicilio_entrega = value('#logPedidoEditAddress');
    order.producto = value('#logPedidoEditProduct');
    order.pago_estado = value('#logPedidoEditPaymentStatus');
    order.monto_a_pagar_repartidor = value('#logPedidoEditAmountToCollect');
    order.envio_estado = value('#logPedidoEditShippingStatus');
    order.envio_valor = value('#logPedidoEditShippingValue');
    order.issue_active = Boolean(q('#logPedidoEditIssueActive')?.checked);
    order.issue_stage = value('#logPedidoEditIssueStage');
    order.issue_type = value('#logPedidoEditIssueType');
    order.issue_message_public = value('#logPedidoEditIssueMessage');
    order.observacion_publica = value('#logPedidoEditPublicObservation');
    order.observacion_interna = value('#logPedidoEditInternalObservation');
    order.fecha_ultima_actualizacion = new Date().toISOString().slice(0, 16).replace('T', ' ');

    closeSlide();
    renderAll();
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
    if (window[READY_FLAG] && root()?.dataset.logisticaPedidosBound === '1') {
      renderAll();
      return;
    }

    window[READY_FLAG] = true;
    bind();
    renderAll();
  }

  window.ProtocolLogisticaPedidosInit = init;
  document.addEventListener(PAGE_EVENT, init);
  document.addEventListener('DOMContentLoaded', init);

  if (document.readyState !== 'loading') {
    init();
  }
})();
