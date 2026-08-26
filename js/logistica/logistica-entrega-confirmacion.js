/* ==========================================================
   Protocol Data · Confirmación de estado logístico
   Reutiliza el diseño original de confirmación de entrega.
   No contiene lógica de Experiencias ni envío de correos.
   ========================================================== */

(function () {
  'use strict';

  const state = {
    root: null,
    resolver: null,
    context: null,
    step: 0
  };

  const STATUS_LABELS = {
    recibido: 'Recibido',
    despachado: 'Despachado',
    en_camino: 'En camino',
    entregado: 'Entregado'
  };

  const EMAIL_CONFIG = {
    recibido: null,

    despachado: {
      subject: 'Tu pedido fue despachado'
    },

    en_camino: {
      subject: 'Tu pedido está en camino'
    },

    entregado: {
      subject: 'Tu compra se entregó con éxito'
    }
  };

  window.__LOG_DELIVERY_CONFIRM_LOADED__ = true;
  window.__LOG_PEDIDOS_STATUS_CONFIRM_VERSION__ =
    '20260809_01';

  function ensureDeliveryStyles() {
    const existing = document.querySelector(
      'link[data-log-delivery-confirm-css]'
    );

    if (existing) return;

    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href =
      '/css/logistica/' +
      'logistica-entrega-confirmacion.css' +
      '?v=20260809_01';

    link.dataset.logDeliveryConfirmCss = '1';

    document.head.appendChild(link);
  }

  ensureDeliveryStyles();

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeStatus(value) {
    const clean = String(value || '')
      .trim()
      .toLowerCase();

    return Object.prototype.hasOwnProperty.call(
      STATUS_LABELS,
      clean
    )
      ? clean
      : '';
  }

  function statusLabel(value) {
    const status = normalizeStatus(value);

    return STATUS_LABELS[status] || 'Sin definir';
  }

  function normalizeOrderLabel(value) {
    const clean = String(value || '').trim();
    const orderMatch = clean.match(/#\d+/);

    if (orderMatch) return orderMatch[0];

    if (/^\d+$/.test(clean)) {
      return `#${clean}`;
    }

    return clean || 'Pedido';
  }

  function maskEmail(value) {
    const clean = String(value || '').trim();
    const parts = clean.split('@');

    if (parts.length !== 2) {
      return clean || 'Correo registrado';
    }

    return (
      `${parts[0].slice(0, 2)}***@` +
      parts[1].toLowerCase()
    );
  }

  function normalizedContext(input) {
    const context = input || {};

    const previousStatus =
      normalizeStatus(context.previousStatus);

    const nextStatus =
      normalizeStatus(context.nextStatus);

    const emailConfig =
      EMAIL_CONFIG[nextStatus] || null;

    return {
      trackingId:
        String(context.trackingId || ''),

      orderLabel:
        normalizeOrderLabel(
          context.orderLabel ||
          context.orderId ||
          context.trackingId
        ),

      customer:
        String(context.customer || '').trim() ||
        'Cliente',

      email:
        String(context.email || '').trim(),

      product:
        String(context.product || '').trim() ||
        'Producto del pedido',

      previousStatus,
      nextStatus,

      previousStatusLabel:
        statusLabel(previousStatus),

      nextStatusLabel:
        statusLabel(nextStatus),

      sendsEmail:
        Boolean(emailConfig),

      emailSubject:
        emailConfig
          ? emailConfig.subject
          : ''
    };
  }

  function ensureRoot() {
    if (state.root) return state.root;

    const root = document.createElement('section');

    root.id = 'logDeliveryConfirm';
    root.className = 'logDeliveryConfirm';
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
      <button
        class="logDeliveryConfirm__overlay"
        type="button"
        tabindex="-1"
        aria-label="Cerrar"
        data-delivery-overlay
      ></button>

      <article
        class="logDeliveryConfirm__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logDeliveryConfirmTitle"
        data-mode="idle"
      >
        <div class="logDeliveryConfirm__top">
          <span
            class="logDeliveryConfirm__caption"
            data-delivery-caption
          >
            Confirmación operativa
          </span>

          <button
            class="logDeliveryConfirm__close"
            type="button"
            aria-label="Cerrar"
            data-delivery-close
          >
            ×
          </button>
        </div>

        <div
          class="logDeliveryConfirm__content"
          data-delivery-content
        ></div>
      </article>
    `;

    root.addEventListener('click', handleClick);

    document.body.appendChild(root);

    state.root = root;

    return root;
  }

  function orderCard(context) {
    return `
      <div class="logDeliveryConfirm__card">
        <div class="logDeliveryConfirm__cardTitle">
          Resumen del pedido
        </div>

        <div class="logDeliveryConfirm__rows">
          <div class="logDeliveryConfirm__row">
            <span>Pedido</span>
            <strong>${esc(context.orderLabel)}</strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Cliente</span>
            <strong>${esc(context.customer)}</strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Producto</span>
            <strong>${esc(context.product)}</strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Correo</span>
            <strong>${esc(maskEmail(context.email))}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function emailNotice(context) {
    if (!context.sendsEmail) {
      return `
        <div class="logDeliveryConfirm__notice">
          <div class="logDeliveryConfirm__noticeIcon">
            i
          </div>

          <div>
            <strong>Sin correo logístico adicional</strong>

            <p>
              Este cambio de estado no genera una nueva
              notificación por correo.
            </p>
          </div>
        </div>
      `;
    }

    return `
      <div
        class="
          logDeliveryConfirm__notice
          logDeliveryConfirm__notice--success
        "
      >
        <div class="logDeliveryConfirm__noticeIcon">
          ✓
        </div>

        <div>
          <strong>Notificación inmediata</strong>

          <p>
            Este estado tiene configurado un correo
            logístico inmediato para el cliente.
          </p>

          <p>
            Asunto:
            <strong>
              ${esc(context.emailSubject)}
            </strong>
          </p>
        </div>
      </div>
    `;
  }

  function stepOne(context) {
    return `
      <div class="logDeliveryConfirm__icon">
        !
      </div>

      <span class="logDeliveryConfirm__eyebrow">
        Confirmación operativa
      </span>

      <h2
        class="logDeliveryConfirm__title"
        id="logDeliveryConfirmTitle"
      >
        Cambiar estado a
        ${esc(context.nextStatusLabel)}
      </h2>

      <p class="logDeliveryConfirm__description">
        Esta acción actualizará el estado logístico
        visible del pedido.
      </p>

      ${orderCard(context)}

      <div class="logDeliveryConfirm__card">
        <div class="logDeliveryConfirm__cardTitle">
          Impacto de esta acción
        </div>

        <div class="logDeliveryConfirm__rows">
          <div class="logDeliveryConfirm__row">
            <span>Estado actual</span>

            <strong>
              ${esc(context.previousStatusLabel)}
            </strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Nuevo estado</span>

            <strong>
              ${esc(context.nextStatusLabel)}
            </strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Actualización</span>

            <strong>
              Se registrará en este momento
            </strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Correo logístico</span>

            <strong>
              ${
                context.sendsEmail
                  ? 'Envío inmediato'
                  : 'No corresponde'
              }
            </strong>
          </div>
        </div>
      </div>

      ${emailNotice(context)}

      <div class="logDeliveryConfirm__actions">
        <button
          class="logDeliveryConfirm__button"
          type="button"
          data-delivery-action="cancel"
        >
          Cancelar
        </button>

        <button
          class="
            logDeliveryConfirm__button
            logDeliveryConfirm__button--primary
          "
          type="button"
          data-delivery-action="continue"
          data-delivery-primary
        >
          Continuar
        </button>
      </div>
    `;
  }

  function stepTwo(context) {
    return `
      <div class="logDeliveryConfirm__icon">
        !
      </div>

      <span class="logDeliveryConfirm__eyebrow">
        Confirmación definitiva
      </span>

      <h2
        class="logDeliveryConfirm__title"
        id="logDeliveryConfirmTitle"
      >
        ¿Confirmar cambio a
        ${esc(context.nextStatusLabel)}?
      </h2>

      <p class="logDeliveryConfirm__description">
        El pedido ${esc(context.orderLabel)}
        cambiará de
        ${esc(context.previousStatusLabel)}
        a
        ${esc(context.nextStatusLabel)}.
      </p>

      ${orderCard(context)}

      <div
        class="
          logDeliveryConfirm__notice
          logDeliveryConfirm__notice--warning
        "
      >
        <div class="logDeliveryConfirm__noticeIcon">
          !
        </div>

        <div>
          <strong>
            Confirmación del cambio logístico
          </strong>

          <p>
            Al confirmar, Protocol guardará el nuevo
            estado del pedido.
          </p>

          ${
            context.sendsEmail
              ? `
                <p>
                  Este estado también tiene configurada
                  una notificación inmediata al correo
                  registrado del cliente.
                </p>
              `
              : ''
          }
        </div>
      </div>

      ${emailNotice(context)}

      <div class="logDeliveryConfirm__actions">
        <button
          class="logDeliveryConfirm__button"
          type="button"
          data-delivery-action="back"
        >
          Volver
        </button>

        <button
          class="
            logDeliveryConfirm__button
            logDeliveryConfirm__button--primary
          "
          type="button"
          data-delivery-action="confirm"
          data-delivery-primary
        >
          Confirmar cambio
        </button>
      </div>
    `;
  }

  function stepThree(context) {
    const changedAt =
      new Intl.DateTimeFormat(
        'es-AR',
        {
          dateStyle: 'short',
          timeStyle: 'short'
        }
      ).format(new Date());

    return `
      <div
        class="
          logDeliveryConfirm__icon
          logDeliveryConfirm__icon--success
        "
      >
        ✓
      </div>

      <span class="logDeliveryConfirm__eyebrow">
        Operación completada
      </span>

      <h2
        class="logDeliveryConfirm__title"
        id="logDeliveryConfirmTitle"
      >
        Estado actualizado
      </h2>

      <p class="logDeliveryConfirm__description">
        El pedido ${esc(context.orderLabel)}
        fue actualizado correctamente.
      </p>

      <div class="logDeliveryConfirm__card">
        <div class="logDeliveryConfirm__cardTitle">
          Resultado de la operación
        </div>

        <div class="logDeliveryConfirm__rows">
          <div class="logDeliveryConfirm__row">
            <span>Estado anterior</span>

            <strong>
              ${esc(context.previousStatusLabel)}
            </strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Estado actual</span>

            <strong>
              ${esc(context.nextStatusLabel)}
            </strong>
          </div>

          <div class="logDeliveryConfirm__row">
            <span>Actualizado</span>

            <strong>
              ${esc(changedAt)}
            </strong>
          </div>

          ${
            context.sendsEmail
              ? `
                <div class="logDeliveryConfirm__row">
                  <span>Notificación logística</span>

                  <strong>
                    Envío inmediato configurado
                  </strong>
                </div>
              `
              : ''
          }
        </div>
      </div>

      <div
        class="
          logDeliveryConfirm__actions
          logDeliveryConfirm__actions--single
        "
      >
        <button
          class="
            logDeliveryConfirm__button
            logDeliveryConfirm__button--primary
          "
          type="button"
          data-delivery-action="done"
          data-delivery-primary
        >
          Listo
        </button>
      </div>
    `;
  }

  function show(step) {
    const root = ensureRoot();

    const content = root.querySelector(
      '[data-delivery-content]'
    );

    state.step = step;

    const dialog = root.querySelector(
      '.logDeliveryConfirm__dialog'
    );

    const caption = root.querySelector(
      '[data-delivery-caption]'
    );

    if (dialog) {
      dialog.dataset.mode =
        step === 3
          ? 'success'
          : 'idle';
    }

    if (caption) {
      caption.textContent =
        step === 3
          ? 'Operación completada'
          : 'Confirmación operativa';
    }

    if (step === 1) {
      content.innerHTML =
        stepOne(state.context);
    } else if (step === 2) {
      content.innerHTML =
        stepTwo(state.context);
    } else {
      content.innerHTML =
        stepThree(state.context);
    }

    root.classList.add('is-open');

    root.setAttribute(
      'aria-hidden',
      'false'
    );

    document.documentElement.classList.add(
      'logDeliveryConfirmLock'
    );

    document.body.classList.add(
      'logDeliveryConfirmLock'
    );

    window.setTimeout(() => {
      root.querySelector(
        '[data-delivery-primary]'
      )?.focus();
    }, 20);
  }

  function close() {
    const root = ensureRoot();

    root.classList.remove('is-open');

    root.setAttribute(
      'aria-hidden',
      'true'
    );

    document.documentElement.classList.remove(
      'logDeliveryConfirmLock'
    );

    document.body.classList.remove(
      'logDeliveryConfirmLock'
    );

    state.step = 0;
  }

  function resolveConfirmation(value) {
    const resolver = state.resolver;

    state.resolver = null;

    close();

    if (typeof resolver === 'function') {
      resolver(Boolean(value));
    }
  }

  function handleClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (
      target.closest(
        '[data-delivery-close]'
      )
    ) {
      if (state.step === 3) {
        close();
        state.context = null;
      } else {
        resolveConfirmation(false);
      }

      return;
    }

    const button = target.closest(
      '[data-delivery-action]'
    );

    if (
      target.closest(
        '[data-delivery-overlay]'
      ) &&
      state.step !== 3
    ) {
      resolveConfirmation(false);
      return;
    }

    if (!button) return;

    const action =
      button.dataset.deliveryAction;

    if (action === 'cancel') {
      resolveConfirmation(false);
      return;
    }

    if (action === 'continue') {
      show(2);
      return;
    }

    if (action === 'back') {
      show(1);
      return;
    }

    if (action === 'confirm') {
      resolveConfirmation(true);
      return;
    }

    if (action === 'done') {
      close();
      state.context = null;
    }
  }

  function confirm(context) {
    if (state.resolver) {
      return Promise.resolve(false);
    }

    state.context =
      normalizedContext(context);

    if (
      !state.context.previousStatus ||
      !state.context.nextStatus ||
      state.context.previousStatus ===
        state.context.nextStatus
    ) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      state.resolver = resolve;
      show(1);
    });
  }

  function success(context) {
    state.context =
      normalizedContext(context);

    show(3);
  }

  function preview(nextStatus) {
    const destination =
      normalizeStatus(nextStatus) ||
      'despachado';

    return confirm({
      previousStatus: 'recibido',
      nextStatus: destination,
      orderLabel: '#VISTA PREVIA',
      trackingId: 'PREVIEW',
      customer: 'Cliente de ejemplo',
      email: 'cliente@ejemplo.com',
      product: 'Producto de ejemplo'
    });
  }

  const api = {
    confirm,
    success,
    preview
  };

  window.ProtocolLogisticsStatusConfirm =
    api;

  /*
   * Alias de compatibilidad con el bridge anterior.
   * No implica lógica de Experiencias.
   */
  window.ProtocolDeliveryConfirm = api;
})();
