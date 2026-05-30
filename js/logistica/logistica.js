/* ==========================================================
   Protocol Data · Panel Logística
   Mock operativo preparado para migrar a Supabase
   Compatible con navegación SPA de app.js
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';

  const state = window.__protocolLogisticaState || {
    activeTab: 'resumen',
    orders: [
      {
        tracking_id: 'ALP-000124',
        order_id: 'SHOP-1001',
        cliente: 'Cliente Demo',
        email_cliente: 'cliente@email.com',
        producto: 'Bandera Argentina para Capó | Pack x3',
        domicilio_entrega: 'Recoleta, 1189, Capital Federal',
        codigo_postal: '1189',
        provincia: 'Capital Federal',
        localidad: 'Recoleta',
        estado_logistico: 'recibido',
        banda_horaria_estimada: '14:00 a 18:00',
        banner_id: 'ban_navid_001',
        issue_active: false,
        issue_type: '',
        issue_message_public: '',
        observacion_publica: 'Tu pedido fue recibido correctamente. El equipo de logística está preparando la compra.',
        observacion_interna: 'Pedido mock inicial para validar flujo.',
        fecha_ultima_actualizacion: '2026-05-29 14:30'
      },
      {
        tracking_id: 'ALP-000125',
        order_id: 'SHOP-1002',
        cliente: 'Comprador Demo',
        email_cliente: 'comprador@email.com',
        producto: 'Sombrero Mundialista Argentina',
        domicilio_entrega: 'Palermo, 1414, Capital Federal',
        codigo_postal: '1414',
        provincia: 'Capital Federal',
        localidad: 'Palermo',
        estado_logistico: 'en_camino',
        banda_horaria_estimada: '16:00 a 20:00',
        banner_id: 'ban_navid_002',
        issue_active: false,
        issue_type: '',
        issue_message_public: '',
        observacion_publica: 'Tu pedido ya fue despachado y se encuentra en distribución hacia el domicilio indicado.',
        observacion_interna: 'Entrega en curso sin incidencia.',
        fecha_ultima_actualizacion: '2026-05-29 15:10'
      },
      {
        tracking_id: 'ALP-000126',
        order_id: 'SHOP-1003',
        cliente: 'Usuario Intervenido',
        email_cliente: 'usuario@email.com',
        producto: 'Combo Accesorios Mundialistas',
        domicilio_entrega: 'Av. Siempre Viva 742',
        codigo_postal: '9999',
        provincia: 'Buenos Aires',
        localidad: 'Sin validar',
        estado_logistico: 'despachado',
        banda_horaria_estimada: 'Pendiente',
        banner_id: 'ban_issue_001',
        issue_active: true,
        issue_type: 'direccion_incorrecta',
        issue_message_public: 'Tuvimos un inconveniente con tu dirección de entrega. Nos pondremos en contacto contigo lo antes posible.',
        observacion_publica: 'El pedido está en revisión por el equipo de logística.',
        observacion_interna: 'CP no coincide con localidad declarada. Validar por soporte.',
        fecha_ultima_actualizacion: '2026-05-29 15:35'
      }
    ],
    rules: [
      { regla_id: 'reg_caba_001', nivel_regla: 'provincia', valor_regla: 'Capital Federal', envio_estado: 'gratis', envio_valor: 0, promesa_entrega: 'Llega mañana', prioridad: 30, activo: true },
      { regla_id: 'reg_pba_001', nivel_regla: 'provincia', valor_regla: 'Buenos Aires', envio_estado: 'pagado', envio_valor: 7240, promesa_entrega: 'Llega en 2 a 4 días', prioridad: 30, activo: true },
      { regla_id: 'reg_default_001', nivel_regla: 'default', valor_regla: 'Argentina', envio_estado: 'pagado', envio_valor: 8900, promesa_entrega: 'Llega en 3 a 7 días', prioridad: 10, activo: true }
    ],
    postalCodes: [
      { codigo_postal: '1189', localidad: 'Recoleta', provincia: 'Capital Federal', zona_operativa: 'CABA', regla: 'reg_caba_001' },
      { codigo_postal: '1414', localidad: 'Palermo', provincia: 'Capital Federal', zona_operativa: 'CABA', regla: 'reg_caba_001' },
      { codigo_postal: '5000', localidad: 'Córdoba', provincia: 'Córdoba', zona_operativa: 'Interior', regla: 'reg_default_001' },
      { codigo_postal: '2000', localidad: 'Rosario', provincia: 'Santa Fe', zona_operativa: 'Interior', regla: 'reg_default_001' }
    ],
    banners: [
      { banner_id: 'ban_navid_001', titulo: 'Seguimiento activo', mensaje: 'Tu pedido está registrado y será actualizado por logística.', tipo: 'info', activo: true },
      { banner_id: 'ban_navid_002', titulo: 'Pedido en distribución', mensaje: 'El pedido se encuentra camino al domicilio indicado.', tipo: 'success', activo: true },
      { banner_id: 'ban_issue_001', titulo: 'Revisión logística', mensaje: 'Hay una incidencia activa y el equipo la está revisando.', tipo: 'warning', activo: true }
    ]
  };

  window.__protocolLogisticaState = state;

  const statusLabels = {
    recibido: 'Recibido',
    despachado: 'Despachado',
    en_camino: 'En camino',
    entregado: 'Entregado'
  };

  const statusClass = {
    recibido: 'logBadge--blue',
    despachado: 'logBadge--orange',
    en_camino: 'logBadge--green',
    entregado: 'logBadge--gray'
  };

  function getRoot() {
    return document.querySelector('main.logisticsMain');
  }

  function $(root, selector) {
    return root ? root.querySelector(selector) : null;
  }

  function $all(root, selector) {
    return root ? Array.from(root.querySelectorAll(selector)) : [];
  }

  function money(value) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function setText(root, selector, value) {
    const el = $(root, selector);
    if (el) el.textContent = value;
  }

  function renderKpis(root) {
    const active = state.orders.filter(order => order.estado_logistico !== 'entregado').length;
    const issues = state.orders.filter(order => order.issue_active).length;
    const delivered = state.orders.filter(order => order.estado_logistico === 'entregado').length;
    const unknownCp = state.orders.filter(order => order.localidad === 'Sin validar').length;

    setText(root, '#logKpiActive', active);
    setText(root, '#logKpiIssues', issues);
    setText(root, '#logKpiDelivered', delivered);
    setText(root, '#logKpiUnknownCp', unknownCp);
  }

  function renderSummary(root) {
    const states = ['recibido', 'despachado', 'en_camino', 'entregado'];
    const stateList = $(root, '#logStateList');
    const insightList = $(root, '#logInsightList');

    if (stateList) {
      stateList.innerHTML = states.map(status => {
        const count = state.orders.filter(order => order.estado_logistico === status).length;
        return `<div class="logStateItem"><div><strong>${statusLabels[status]}</strong><span>${count} pedidos en este estado</span></div><span class="logBadge ${statusClass[status]}">${count}</span></div>`;
      }).join('');
    }

    if (insightList) {
      insightList.innerHTML = [
        '<div class="logInsightItem"><strong>Supabase como fuente operativa</strong><span>El panel debe escribir estados, reglas y eventos en tablas relacionales. Shopify solo consultará endpoints públicos.</span></div>',
        '<div class="logInsightItem"><strong>Reglas antes que 22 mil precios</strong><span>La base de CP reconoce localidad/provincia. Las tarifas deben resolverse por regla global y excepciones.</span></div>',
        '<div class="logInsightItem"><strong>Eventos obligatorios</strong><span>Cada cambio de estado debe crear historial para auditoría y soporte.</span></div>'
      ].join('');
    }
  }

  function getFilteredOrders(root) {
    const query = ($(root, '#logOrderSearch')?.value || '').trim().toLowerCase();
    const filter = $(root, '#logOrderStatusFilter')?.value || 'todos';

    return state.orders.filter(order => {
      const matchesQuery = !query || [order.tracking_id, order.order_id, order.cliente, order.email_cliente, order.codigo_postal, order.producto]
        .join(' ')
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        filter === 'todos' ||
        order.estado_logistico === filter ||
        (filter === 'intervenido' && order.issue_active);

      return matchesQuery && matchesStatus;
    });
  }

  function renderOrders(root) {
    const tbody = $(root, '#logOrdersTbody');
    if (!tbody) return;

    const rows = getFilteredOrders(root);

    tbody.innerHTML = rows.map(order => `
      <tr>
        <td><strong>${order.tracking_id}</strong><br><span>${order.order_id}</span></td>
        <td>${order.cliente}<br><span>${order.email_cliente}</span></td>
        <td>${order.codigo_postal}<br><span>${order.localidad}</span></td>
        <td><span class="logBadge ${statusClass[order.estado_logistico]}">${statusLabels[order.estado_logistico]}</span></td>
        <td>${order.issue_active ? `<span class="logBadge logBadge--red">${order.issue_type}</span>` : '<span class="logBadge logBadge--gray">Sin incidencia</span>'}</td>
        <td>${order.fecha_ultima_actualizacion}</td>
        <td><button class="logActionBtn" type="button" data-edit-order="${order.tracking_id}">Editar</button></td>
      </tr>
    `).join('');
  }

  function renderRules(root) {
    const list = $(root, '#logRulesList');
    if (!list) return;

    list.innerHTML = state.rules.map(rule => `
      <div class="logRuleItem">
        <strong>${rule.valor_regla} · ${rule.nivel_regla}</strong>
        <span>${rule.envio_estado === 'gratis' ? 'Envío gratis' : 'Envío ' + money(rule.envio_valor)} · ${rule.promesa_entrega} · Prioridad ${rule.prioridad}</span>
      </div>
    `).join('');
  }

  function renderPostalCodes(root) {
    const tbody = $(root, '#logCpTbody');
    if (!tbody) return;

    const query = ($(root, '#logCpSearch')?.value || '').trim().toLowerCase();
    const rows = state.postalCodes.filter(cp => !query || [cp.codigo_postal, cp.localidad, cp.provincia, cp.zona_operativa].join(' ').toLowerCase().includes(query));

    tbody.innerHTML = rows.map(cp => `
      <tr>
        <td><strong>${cp.codigo_postal}</strong></td>
        <td>${cp.localidad}</td>
        <td>${cp.provincia}</td>
        <td><span class="logBadge logBadge--blue">${cp.zona_operativa}</span></td>
        <td>${cp.regla}</td>
      </tr>
    `).join('');
  }

  function renderIssues(root) {
    const list = $(root, '#logIssueList');
    if (!list) return;

    const issues = state.orders.filter(order => order.issue_active);
    list.innerHTML = issues.length
      ? issues.map(order => `<div class="logIssueItem"><strong>${order.tracking_id} · ${order.issue_type}</strong><span>${order.issue_message_public}</span></div>`).join('')
      : '<div class="logIssueItem"><strong>Sin incidencias activas</strong><span>No hay pedidos intervenidos en este momento.</span></div>';
  }

  function renderBanners(root) {
    const list = $(root, '#logBannerList');
    if (!list) return;

    list.innerHTML = state.banners.map(banner => `
      <div class="logBannerItem">
        <strong>${banner.banner_id} · ${banner.titulo}</strong>
        <span>${banner.mensaje} · Tipo: ${banner.tipo} · ${banner.activo ? 'Activo' : 'Inactivo'}</span>
      </div>
    `).join('');
  }

  function openOrderSlide(root, trackingId) {
    const order = state.orders.find(item => item.tracking_id === trackingId);
    const slide = $(root, '#logOrderSlide');
    if (!order || !slide) return;

    setText(root, '#logSlideSubtitle', `${order.tracking_id} · ${order.cliente}`);
    $('#logEditTrackingId');

    const trackingInput = $(root, '#logEditTrackingId');
    const statusInput = $(root, '#logEditStatus');
    const timeBandInput = $(root, '#logEditTimeBand');
    const issueActiveInput = $(root, '#logEditIssueActive');
    const issueTypeInput = $(root, '#logEditIssueType');
    const issueMessageInput = $(root, '#logEditIssueMessage');
    const publicNoteInput = $(root, '#logEditPublicNote');
    const internalNoteInput = $(root, '#logEditInternalNote');
    const bannerSelect = $(root, '#logEditBanner');

    if (trackingInput) trackingInput.value = order.tracking_id;
    if (statusInput) statusInput.value = order.estado_logistico;
    if (timeBandInput) timeBandInput.value = order.banda_horaria_estimada || '';
    if (issueActiveInput) issueActiveInput.checked = Boolean(order.issue_active);
    if (issueTypeInput) issueTypeInput.value = order.issue_type || '';
    if (issueMessageInput) issueMessageInput.value = order.issue_message_public || '';
    if (publicNoteInput) publicNoteInput.value = order.observacion_publica || '';
    if (internalNoteInput) internalNoteInput.value = order.observacion_interna || '';

    if (bannerSelect) {
      bannerSelect.innerHTML = state.banners.map(banner => `<option value="${banner.banner_id}">${banner.banner_id} · ${banner.titulo}</option>`).join('');
      bannerSelect.value = order.banner_id;
    }

    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('logSlideLock');
    document.body.classList.add('logSlideLock');
  }

  function closeOrderSlide(root) {
    const slide = $(root, '#logOrderSlide') || document.querySelector('#logOrderSlide');
    if (!slide) return;

    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('logSlideLock');
    document.body.classList.remove('logSlideLock');
  }

  function saveOrder(root, event) {
    event.preventDefault();

    const trackingId = $(root, '#logEditTrackingId')?.value;
    const order = state.orders.find(item => item.tracking_id === trackingId);
    if (!order) return;

    order.estado_logistico = $(root, '#logEditStatus')?.value || order.estado_logistico;
    order.banda_horaria_estimada = $(root, '#logEditTimeBand')?.value || '';
    order.banner_id = $(root, '#logEditBanner')?.value || order.banner_id;
    order.issue_active = Boolean($(root, '#logEditIssueActive')?.checked);
    order.issue_type = $(root, '#logEditIssueType')?.value || '';
    order.issue_message_public = $(root, '#logEditIssueMessage')?.value || '';
    order.observacion_publica = $(root, '#logEditPublicNote')?.value || '';
    order.observacion_interna = $(root, '#logEditInternalNote')?.value || '';
    order.fecha_ultima_actualizacion = new Date().toISOString().slice(0, 16).replace('T', ' ');

    closeOrderSlide(root);
    renderAll(root);
  }

  function setTab(root, tab) {
    state.activeTab = tab;
    $all(root, '[data-log-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.logTab === tab));
    $all(root, '[data-log-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.logPanel === tab));
  }

  function bindEvents(root) {
    if (!root || root.dataset.logisticaBound === '1') return;
    root.dataset.logisticaBound = '1';

    $all(root, '[data-log-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(root, button.dataset.logTab));
    });

    $(root, '#logOrderSearch')?.addEventListener('input', () => renderOrders(root));
    $(root, '#logOrderStatusFilter')?.addEventListener('change', () => renderOrders(root));
    $(root, '#logCpSearch')?.addEventListener('input', () => renderPostalCodes(root));

    root.addEventListener('click', event => {
      const editBtn = event.target.closest('[data-edit-order]');
      if (editBtn) openOrderSlide(root, editBtn.dataset.editOrder);
    });

    $(root, '#logSlideCloseOverlay')?.addEventListener('click', () => closeOrderSlide(root));
    $(root, '#logSlideCloseBtn')?.addEventListener('click', () => closeOrderSlide(root));
    $(root, '#logOrderForm')?.addEventListener('submit', event => saveOrder(root, event));

    $(root, '#logBtnSyncSupabase')?.addEventListener('click', () => {
      window.alert('Próxima etapa: conectar con Supabase. Este panel ya está pensado para tablas relacionales, no Sheets.');
    });

    $(root, '#logBtnNewRule')?.addEventListener('click', () => {
      setTab(root, 'reglas');
    });
  }

  function renderAll(root) {
    if (!root) return;
    renderKpis(root);
    renderSummary(root);
    renderOrders(root);
    renderRules(root);
    renderPostalCodes(root);
    renderIssues(root);
    renderBanners(root);
    setTab(root, state.activeTab || 'resumen');
  }

  function initLogisticaPanel() {
    const root = getRoot();
    if (!root) return;

    bindEvents(root);
    renderAll(root);
  }

  window.ProtocolLogisticaInit = initLogisticaPanel;

  document.addEventListener(PAGE_EVENT, initLogisticaPanel);
  document.addEventListener('DOMContentLoaded', initLogisticaPanel);

  if (document.readyState !== 'loading') {
    initLogisticaPanel();
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeOrderSlide(getRoot());
  });
})();
