/* ==========================================================
   Protocol Data · Logística · Pedidos · Intervención operativa
   Capa aislada para el slide de Logística > Pedidos.
   No toca Conversaciones.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaPedidosIntervencionReady';
  const STYLE_ID = 'logistica-pedidos-intervencion-style';

  if (window[READY_FLAG]) return;
  window[READY_FLAG] = true;

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function q(selector) {
    const r = root();
    return r ? r.querySelector(selector) : null;
  }

  function getState() {
    return window.__protocolLogisticaPedidosState || null;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .logPedidosSlide__panel {
        width: min(65vw, 960px) !important;
        max-width: 100% !important;
      }

      .logPedidosInterventionCard {
        border-left: 4px solid #d93025 !important;
      }

      .logPedidosCheck--intervention {
        min-height: 46px;
        padding: 12px;
        border-radius: 5px;
        background: #fff1f0;
        box-shadow: inset 0 0 0 1px rgba(217, 48, 37, 0.10);
      }

      .logPedidosCheck--intervention input {
        width: 17px;
        height: 17px;
        accent-color: #d93025;
      }

      .logPedidosCheck--intervention span {
        color: #9f1f18;
        font-weight: 950;
      }

      .logPedidosInterventionHelp {
        margin: 0;
        color: #8a4b46;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 750;
      }

      @media (max-width: 1180px) {
        .logPedidosSlide__panel {
          width: min(78vw, 900px) !important;
        }
      }

      @media (max-width: 760px) {
        .logPedidosSlide__panel {
          width: 100% !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureHiddenInput(form, id) {
    let el = q('#' + id);
    if (el) return el;

    el = document.createElement('input');
    el.type = 'hidden';
    el.id = id;
    form.appendChild(el);
    return el;
  }

  function ensurePaymentContract() {
    const select = q('#logPedidoEditPaymentStatus');
    if (!select || select.dataset.protocolPaymentContract === '1') return;

    select.innerHTML = [
      '<option value="pagado">Pagado</option>',
      '<option value="no_pagado">No pagado · cobra repartidor</option>'
    ].join('');

    select.dataset.protocolPaymentContract = '1';
  }

  function ensureAliases(form) {
    ensureHiddenInput(form, 'logPedidoEditAmountToCollect');
    ensureHiddenInput(form, 'logPedidoEditShippingStatus');
    ensureHiddenInput(form, 'logPedidoEditShippingValue');
    ensureHiddenInput(form, 'logPedidoEditPublicObservation');
    ensureHiddenInput(form, 'logPedidoEditInternalObservation');
    ensureHiddenInput(form, 'logPedidoEditIssueStage');
  }

  function ensureInterventionCard() {
    const form = q('#logPedidosForm');
    if (!form) return;

    ensurePaymentContract();
    ensureAliases(form);

    if (q('[data-log-pedidos-intervention-card]')) return;

    const firstCard = form.querySelector('.logPedidosForm__card');
    const card = document.createElement('section');
    card.className = 'logPedidosForm__card logPedidosInterventionCard';
    card.setAttribute('data-log-pedidos-intervention-card', '');
    card.innerHTML = `
      <div class="logPedidosForm__cardHead">
        <strong>Incidencia operativa</strong>
        <span>Marca el pedido como intervenido sin reemplazar el estado logístico.</span>
      </div>

      <div class="logPedidosForm__grid">
        <label class="logPedidosCheck logPedidosCheck--intervention logPedidosField--full">
          <input id="logPedidoEditIssueActive" type="checkbox">
          <span>Pedido intervenido</span>
        </label>

        <div class="logPedidosField logPedidosField--full">
          <label for="logPedidoEditIssueMessage">Nota de intervención</label>
          <textarea id="logPedidoEditIssueMessage" placeholder="Mensaje público visible debajo del estado actual del pedido"></textarea>
          <p class="logPedidosInterventionHelp">Esta nota se muestra debajo del estado actual. La observación pública de abajo queda reservada para “Ver observaciones del responsable”.</p>
        </div>

        <div class="logPedidosField logPedidosField--full">
          <label for="logPedidoEditIssueType">Tipo de incidencia</label>
          <select id="logPedidoEditIssueType">
            <option value="intervencion_operativa">Intervención operativa</option>
            <option value="direccion_incorrecta">Dirección incorrecta</option>
            <option value="demora_logistica">Demora logística</option>
            <option value="cliente_ausente">Cliente ausente</option>
            <option value="problema_transportadora">Problema con transportadora</option>
            <option value="stock_revisar">Stock a revisar</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
    `;

    if (firstCard && firstCard.parentNode) {
      firstCard.parentNode.insertBefore(card, firstCard.nextSibling);
    } else {
      form.insertBefore(card, form.firstChild);
    }
  }

  function numberFromMoney(value) {
    let clean = String(value || '').trim();
    if (!clean) return '0';

    clean = clean.replace(/[^0-9,.-]/g, '');

    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }

    const parsed = Number(clean);
    return Number.isFinite(parsed) ? String(Math.max(0, Math.round(parsed))) : '0';
  }

  function setValue(selector, value) {
    const el = q(selector);
    if (el) el.value = value == null ? '' : value;
  }

  function getValue(selector) {
    const el = q(selector);
    return el ? el.value : '';
  }

  function getCurrentOrder() {
    const state = getState();
    const trackingId = getValue('#logPedidoEditTrackingId');
    if (!state || !Array.isArray(state.orders) || !trackingId) return null;
    return state.orders.find((item) => item.tracking_id === trackingId) || null;
  }

  function fillVisibleFieldsFromOrder() {
    ensureInterventionCard();

    const order = getCurrentOrder();
    if (!order) return;

    setValue('#logPedidoEditPaymentStatus', order.pago_estado === 'pagado' ? 'pagado' : 'no_pagado');
    setValue('#logPedidoEditAmount', numberFromMoney(order.monto_a_pagar_repartidor));
    setValue('#logPedidoEditShippingCost', numberFromMoney(order.envio_valor));
    setValue('#logPedidoEditCustomerNote', order.observacion_publica || '');
    setValue('#logPedidoEditInternalNote', order.observacion_interna || '');
    setValue('#logPedidoEditIssueMessage', order.issue_message_public || '');
    setValue('#logPedidoEditIssueType', order.issue_type || 'intervencion_operativa');

    const issueActive = q('#logPedidoEditIssueActive');
    if (issueActive) issueActive.checked = Boolean(order.issue_active);

    syncBeforeSave();
  }

  function syncBeforeSave() {
    ensureInterventionCard();

    const shippingCost = numberFromMoney(getValue('#logPedidoEditShippingCost'));
    const issueActive = Boolean(q('#logPedidoEditIssueActive')?.checked);
    const status = getValue('#logPedidoEditStatus') || 'recibido';

    setValue('#logPedidoEditAmountToCollect', numberFromMoney(getValue('#logPedidoEditAmount')));
    setValue('#logPedidoEditShippingValue', shippingCost);
    setValue('#logPedidoEditShippingStatus', Number(shippingCost) > 0 ? 'pagado' : 'gratis');
    setValue('#logPedidoEditPublicObservation', getValue('#logPedidoEditCustomerNote'));
    setValue('#logPedidoEditInternalObservation', getValue('#logPedidoEditInternalNote'));
    setValue('#logPedidoEditIssueStage', issueActive ? status : '');

    if (issueActive && !getValue('#logPedidoEditIssueType')) {
      setValue('#logPedidoEditIssueType', 'intervencion_operativa');
    }
  }

  function bind() {
    const r = root();
    if (!r) return;

    injectStyles();
    ensureInterventionCard();

    if (r.dataset.logisticaPedidosIntervencionBound === '1') return;
    r.dataset.logisticaPedidosIntervencionBound = '1';

    r.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-log-pedido-edit]');
      if (!editBtn) return;
      window.setTimeout(fillVisibleFieldsFromOrder, 0);
      window.setTimeout(fillVisibleFieldsFromOrder, 80);
    });

    r.addEventListener('input', (event) => {
      if (event.target.closest('#logPedidosForm')) syncBeforeSave();
    }, true);

    r.addEventListener('change', (event) => {
      if (event.target.closest('#logPedidosForm')) syncBeforeSave();
    }, true);

    const form = q('#logPedidosForm');
    if (form && form.dataset.logisticaIntervencionSubmitBound !== '1') {
      form.dataset.logisticaIntervencionSubmitBound = '1';
      form.addEventListener('submit', syncBeforeSave, true);
    }
  }

  function init() {
    bind();
    window.setTimeout(bind, 80);
    window.setTimeout(bind, 350);
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener(PAGE_EVENT, init);

  if (document.readyState !== 'loading') init();
})();
