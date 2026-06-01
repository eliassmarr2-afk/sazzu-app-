/* ==========================================================
   AL PASO STORE · TRACKING CONTRACT V1
   ID de seguimiento -> datos mock/contrato -> página Estado de tu envío
   ========================================================== */

(function () {
  var STORAGE_KEY = 'alpaso_tracking_orders';
  var READY_FLAG = '__alpasoTrackingContractV1';

  if (window[READY_FLAG]) return;
  window[READY_FLAG] = true;

  var fallbackOrders = {
    'ALP-000124': {
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
      fecha_ultima_actualizacion: '2026-05-29 14:30'
    },
    'ALP-000125': {
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
      fecha_ultima_actualizacion: '2026-05-29 15:10'
    },
    'ALP-000126': {
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
      fecha_ultima_actualizacion: '2026-05-29 15:35'
    }
  };

  var statusMap = {
    recibido: { index: 1, label: 'Recibido' },
    despachado: { index: 2, label: 'Despachado' },
    en_camino: { index: 3, label: 'En camino' },
    entregado: { index: 4, label: 'Entregado' }
  };

  function iconSvg(type) {
    var icons = {
      received: '<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 8.5h11l-1 10h-9l-1-10Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      box: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8.2 12 4l8 4.2-8 4.2L4 8.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 8.5v7.3L12 20l8-4.2V8.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 12.4V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      truck: '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 7h11v9h-11V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.5 10h3.2l2.8 3v3h-6v-6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19Z" stroke="currentColor" stroke-width="1.8"/><path d="M17.5 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" stroke="currentColor" stroke-width="1.8"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 7 10 17l-5-5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4v-11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    return icons[type] || icons.received;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeOrdersMap(orders) {
    return Object.keys(orders || {}).reduce(function (acc, key) {
      var order = orders[key];
      var id = String((order && order.tracking_id) || key || '').toUpperCase();
      if (id) acc[id] = order;
      return acc;
    }, {});
  }

  function getContractOrders() {
    var fromGlobal = window.ALPASO_TRACKING_ORDERS;

    if (fromGlobal && typeof fromGlobal === 'object') {
      return Object.assign({}, fallbackOrders, normalizeOrdersMap(fromGlobal));
    }

    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.orders) {
          return Object.assign({}, fallbackOrders, normalizeOrdersMap(parsed.orders));
        }
      }
    } catch (error) {}

    return fallbackOrders;
  }

  function getSteps(order) {
    return [
      { key: 'recibido', title: 'Tu pedido fue recibido', subtitle: 'Estamos preparando tu compra.', icon: 'received' },
      { key: 'despachado', title: 'Despachado', subtitle: 'Tu pedido pronto será enviado a tu domicilio.', icon: 'box' },
      { key: 'en_camino', title: 'En camino', subtitle: 'Tu pedido llega entre las ' + (order.banda_horaria_estimada || 'horas informadas por logística') + '.', icon: 'truck' },
      { key: 'entregado', title: 'Entregado con éxito', subtitle: '¡Disfruta tu compra y vuelve pronto con nosotros!', icon: 'check' }
    ];
  }

  function renderTimeline(root, order) {
    var timeline = root.querySelector('[data-alpaso-tracking-timeline]');
    if (!timeline) return;

    var current = statusMap[order.estado_logistico] || statusMap.recibido;
    var steps = getSteps(order);

    timeline.innerHTML = steps.map(function (step, index) {
      var stepNumber = index + 1;
      var stateClass = '';
      var gmailBranch = '';
      var issueBranch = '';

      if (stepNumber < current.index) stateClass = 'is-complete';
      if (stepNumber === current.index) stateClass = 'is-current';

      if (step.key === 'recibido' && order.estado_logistico === 'recibido') {
        gmailBranch = '<div class="alpaso-track-branch"><span class="alpaso-track-branch__icon" aria-hidden="true">' + iconSvg('mail') + '</span><div><strong>Confirmación por correo electrónico</strong><p>Tendrás noticias en tu correo electrónico enviado a ' + escapeHtml(order.email_cliente || 'tu correo') + '.</p></div></div>';
      }

      if (order.issue_active && order.issue_stage === step.key) {
        issueBranch = '<div class="alpaso-track-issue"><strong>Logística</strong><p>' + escapeHtml(order.issue_message_public || '') + '</p></div>';
      }

      return '<article class="alpaso-track-step ' + stateClass + '"><span class="alpaso-track-step__dot" aria-hidden="true">' + iconSvg(step.icon) + '</span><div class="alpaso-track-step__content"><strong>' + escapeHtml(step.title) + '</strong><p>' + escapeHtml(step.subtitle) + '</p>' + gmailBranch + issueBranch + '</div></article>';
    }).join('');
  }

  function renderDelivery(root, order) {
    var address = root.querySelector('[data-alpaso-delivery-address]');
    var product = root.querySelector('[data-alpaso-delivery-product]');
    var payment = root.querySelector('[data-alpaso-payment-status]');
    var shipping = root.querySelector('[data-alpaso-shipping-status]');

    if (address) address.textContent = order.domicilio_entrega || '--';
    if (product) product.textContent = order.producto || '--';

    if (payment) {
      payment.innerHTML = order.pago_estado === 'pagado'
        ? '<span class="alpaso-detail-badge alpaso-detail-badge--green">Pagado</span>'
        : '<span class="alpaso-detail-pay-alert">Debes pagar al repartidor <strong>' + escapeHtml(order.monto_a_pagar_repartidor || '--') + '</strong></span>';
    }

    if (shipping) {
      shipping.innerHTML = order.envio_estado === 'gratis'
        ? '<span class="alpaso-detail-badge alpaso-detail-badge--green">Gratis</span>'
        : '<span class="alpaso-detail-badge alpaso-detail-badge--blue">Pagado · ' + escapeHtml(order.envio_valor || '--') + '</span>';
    }
  }

  function renderOrder(root, order) {
    var card = root.querySelector('[data-alpaso-tracking-card]');
    var trackingId = root.querySelector('[data-alpaso-tracking-id]');
    var currentStatus = root.querySelector('[data-alpaso-current-status]');
    var banner = root.querySelector('[data-alpaso-banner]');
    var observationDate = root.querySelector('[data-alpaso-observation-date]');
    var observationMessage = root.querySelector('[data-alpaso-observation-message]');
    var status = statusMap[order.estado_logistico] || statusMap.recibido;

    if (card) card.setAttribute('data-banner-id', order.banner_id || '');
    if (trackingId) trackingId.textContent = order.tracking_id || '--';
    if (currentStatus) currentStatus.textContent = status.label;

    if (banner) {
      banner.innerHTML = '<strong>Seguimiento conectado a ' + escapeHtml(order.banner_id || 'banner operativo') + '</strong><span>Este banner luego podrá ser controlado desde Protocol Data según campañas, incidencias o mensajes operativos.</span>';
    }

    if (observationDate) observationDate.textContent = order.fecha_ultima_actualizacion || '--';
    if (observationMessage) observationMessage.textContent = order.observacion_publica || 'No hay observaciones adicionales por el momento.';

    renderTimeline(root, order);
    renderDelivery(root, order);
  }

  function handleTrackingSubmit(event) {
    var form = event.target.closest('[data-alpaso-tracking-form]');
    if (!form) return;

    var root = form.closest('[data-alpaso-tracking-page]');
    var input = root && root.querySelector('[data-alpaso-tracking-input]');
    var message = root && root.querySelector('[data-alpaso-tracking-search-message]');

    if (!root || !input) return;

    window.setTimeout(function () {
      var rawValue = String(input.value || '').trim().toUpperCase();
      var orders = getContractOrders();
      var order = orders[rawValue];

      if (!order) {
        if (message) {
          message.textContent = 'No encontramos un pedido con ese ID. Revisá que esté escrito exactamente como aparece en tu confirmación.';
          message.style.color = '#D93025';
        }
        return;
      }

      if (message) {
        message.textContent = 'Pedido encontrado. Información actualizada desde Protocol Data.';
        message.style.color = '#697386';
      }

      renderOrder(root, order);
    }, 0);
  }

  function renderInitialFromQuery() {
    var root = document.querySelector('[data-alpaso-tracking-page]');
    if (!root) return;

    var input = root.querySelector('[data-alpaso-tracking-input]');
    var params = new URLSearchParams(window.location.search || '');
    var trackingId = String(params.get('tracking') || params.get('pedido') || '').trim().toUpperCase();

    if (!trackingId || !input) return;

    input.value = trackingId;

    var form = root.querySelector('[data-alpaso-tracking-form]');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  document.addEventListener('submit', handleTrackingSubmit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderInitialFromQuery);
  } else {
    renderInitialFromQuery();
  }
})();
