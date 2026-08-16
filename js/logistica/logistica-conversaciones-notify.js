/* ==========================================================
   Protocol Data · Logística · Conversaciones · Aviso de respuesta
   Fase 8: acción manual general para conversaciones elegibles.
   El backend sigue siendo la autoridad final.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolSupportReplyNotificationReady';
  const FUNCTION_NAME = 'send-support-reply-notification';
  const uiState = new Map();
  let observer = null;
  let injectQueued = false;

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      return window.ProtocolAuth.getClient();
    }
    return null;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function conversationId() {
    const form = root()?.querySelector('[data-log-conversation-reply-real]');
    return String(form?.dataset.logConversationReplyReal || '').trim().toLowerCase();
  }

  function bubbles() {
    return root()?.querySelectorAll('.logConversationChat .logConversationBubble') || [];
  }

  function latestBubble() {
    const list = bubbles();
    return list.length ? list[list.length - 1] : null;
  }

  function latestIsOperator() {
    return Boolean(latestBubble()?.classList.contains('logConversationBubble--operator'));
  }

  function slideLooksFinalized() {
    const panel = root()?.querySelector('.logConversationSlide__panel');
    if (!panel) return false;
    const statusText = Array.from(panel.querySelectorAll('.logConversationStatusRow .logStatusPill'))
      .map(node => String(node.textContent || '').trim().toLowerCase())
      .join(' ');
    return /\bcerrad[ao]\b|\bfinalizad[ao]\b/.test(statusText);
  }

  function currentFingerprint() {
    const id = conversationId();
    const list = bubbles();
    const latest = list.length ? list[list.length - 1] : null;
    const text = String(latest?.textContent || '').replace(/\s+/g, ' ').trim();
    return `${id}|${list.length}|${text}`;
  }

  function setText(element, value) {
    if (!element) return;
    const next = String(value || '');
    if (element.textContent !== next) element.textContent = next;
  }

  function messageIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" stroke="currentColor" stroke-width="1.9"/>
        <path d="m5 7.3 6.15 4.75a1.4 1.4 0 0 0 1.7 0L19 7.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function ensureStyles() {
    if (document.getElementById('logSupportReplyNotifyStyles')) return;
    const style = document.createElement('style');
    style.id = 'logSupportReplyNotifyStyles';
    style.textContent = `
      .logSupportReplyNotify{flex:0 0 auto;display:grid;gap:7px;margin:0 0 12px}
      .logSupportReplyNotify .logSupportReplyNotify__button{width:100%;min-height:44px;display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid #2479FF!important;border-radius:5px!important;background:#2479FF!important;color:#fff!important;padding:10px 14px;font:inherit;font-size:13px;line-height:1.15;font-weight:900;letter-spacing:-.01em;cursor:pointer;box-shadow:none!important;transition:background .16s ease,border-color .16s ease,color .16s ease}
      .logSupportReplyNotify .logSupportReplyNotify__button:hover:not(:disabled){background:#1f6ee8!important;border-color:#1f6ee8!important;box-shadow:none!important}
      .logSupportReplyNotify .logSupportReplyNotify__button:focus-visible{outline:2px solid rgba(36,121,255,.38);outline-offset:2px}
      .logSupportReplyNotify .logSupportReplyNotify__button:disabled{cursor:not-allowed!important;opacity:1!important;transform:none!important;box-shadow:none!important;background:rgba(36,121,255,.20)!important;border-color:rgba(36,121,255,.30)!important;color:rgba(255,255,255,.48)!important}
      .logSupportReplyNotify .logSupportReplyNotify__button svg{width:18px;height:18px;flex:0 0 auto;color:currentColor!important}
      .logSupportReplyNotify__status{min-height:0;margin:0;padding:0 2px;font-size:11px;line-height:1.3;font-weight:800;color:#8f99aa}
      .logSupportReplyNotify__status:empty{display:none}
      .logSupportReplyNotify__status.is-success{color:#43c98b}
      .logSupportReplyNotify__status.is-error{color:#ff6b6b}
      .logSupportReplyNotify__status.is-info{color:#8fbaff}
    `;
    document.head.appendChild(style);
  }

  function renderUiState(wrapper) {
    if (!wrapper) return;
    const button = wrapper.querySelector('[data-log-support-reply-notify]');
    const status = wrapper.querySelector('[data-log-support-reply-notify-status]');
    const label = button?.querySelector('[data-label]');
    if (!button || !status || !label) return;

    const eligible = latestIsOperator() && !slideLooksFinalized();
    const saved = uiState.get(currentFingerprint()) || null;

    if (saved) {
      button.disabled = Boolean(saved.disabled);
      button.dataset.loading = saved.loading ? '1' : '0';
      setText(label, saved.label || 'Enviar aviso de respuesta');
      setText(status, saved.message || '');
      status.className = 'logSupportReplyNotify__status' + (saved.kind ? ` is-${saved.kind}` : '');
      return;
    }

    button.disabled = !eligible;
    button.dataset.loading = '0';
    setText(label, 'Enviar aviso de respuesta');
    setText(status, eligible ? '' : 'Disponible cuando la conversación está activa y el último mensaje público pertenece al operador.');
    status.className = 'logSupportReplyNotify__status' + (eligible ? '' : ' is-info');
  }

  function removeOwnButton(main) {
    main?.querySelectorAll('[data-log-support-reply-notify-wrap]').forEach(node => node.remove());
  }

  function injectButton() {
    injectQueued = false;
    const main = root();
    if (!main) return;

    const id = conversationId();
    const dataBox = main.querySelector('.logConversationBox--data');
    if (!dataBox || !isUuid(id) || slideLooksFinalized()) {
      removeOwnButton(main);
      return;
    }

    let wrapper = dataBox.querySelector('[data-log-support-reply-notify-wrap]');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'logSupportReplyNotify';
      wrapper.dataset.logSupportReplyNotifyWrap = '1';
      wrapper.innerHTML = `
        <button class="logSupportReplyNotify__button" type="button" data-log-support-reply-notify="${id}">
          <span data-label>Enviar aviso de respuesta</span>
          ${messageIcon()}
        </button>
        <p class="logSupportReplyNotify__status" data-log-support-reply-notify-status aria-live="polite"></p>
      `;
      const head = dataBox.querySelector('.logConversationBox__head');
      dataBox.insertBefore(wrapper, head || dataBox.firstChild);
    } else {
      const button = wrapper.querySelector('[data-log-support-reply-notify]');
      if (button) button.dataset.logSupportReplyNotify = id;
    }

    renderUiState(wrapper);
  }

  function queueInject() {
    if (injectQueued) return;
    injectQueued = true;
    window.requestAnimationFrame(injectButton);
  }

  function setState(fingerprint, patch) {
    uiState.set(fingerprint, { ...(uiState.get(fingerprint) || {}), ...patch });
    queueInject();
  }

  async function errorPayload(error) {
    const response = error?.context;
    if (!response || typeof response.clone !== 'function') return null;
    try {
      return await response.clone().json();
    } catch (_) {
      return null;
    }
  }

  function friendlyError(payload) {
    const code = String(payload?.code || '').trim();
    if (payload?.message) return String(payload.message);
    if (code === 'conversation_closed') return 'La conversación está finalizada. No se puede enviar un nuevo aviso.';
    if (code === 'latest_public_message_not_operator') return 'El último mensaje público no pertenece al operador.';
    if (code === 'invalid_customer_email') return 'La conversación no tiene un email de cliente válido.';
    if (code === 'unauthorized') return 'Tu sesión de Protocol Data no es válida. Volvé a iniciar sesión.';
    if (code === 'notification_already_sending') return 'El aviso ya se está procesando o requiere revisión antes de un nuevo intento.';
    if (code === 'email_sent_audit_failed') return 'Brevo pudo haber aceptado el correo, pero falló la auditoría. No reintentes automáticamente.';
    if (code === 'brevo_send_failed') return 'Brevo rechazó el envío. El chat no fue modificado.';
    return 'No se pudo enviar el aviso. Revisá la conexión y volvé a intentar.';
  }

  async function handleNotify(button) {
    const id = String(button?.dataset.logSupportReplyNotify || '').trim().toLowerCase();
    if (!button || !isUuid(id) || id !== conversationId() || slideLooksFinalized()) return;

    const fingerprint = currentFingerprint();
    if (!latestIsOperator()) {
      setState(fingerprint, {
        disabled: true,
        loading: false,
        label: 'Enviar aviso de respuesta',
        kind: 'info',
        message: 'Disponible cuando el último mensaje público pertenece al operador.'
      });
      return;
    }

    const supabaseClient = client();
    if (!supabaseClient) {
      setState(fingerprint, {
        disabled: false,
        loading: false,
        label: 'Enviar aviso de respuesta',
        kind: 'error',
        message: 'No se encontró la sesión de Protocol Data.'
      });
      return;
    }

    setState(fingerprint, {
      disabled: true,
      loading: true,
      label: 'Enviando aviso…',
      kind: 'info',
      message: 'Generando acceso seguro y enviando por Brevo…'
    });

    try {
      const sessionResult = await supabaseClient.auth.getSession();
      if (sessionResult.error || !sessionResult.data?.session) throw new Error('missing_protocol_session');

      const result = await supabaseClient.functions.invoke(FUNCTION_NAME, {
        body: { conversation_id: id }
      });

      if (result.error) {
        throw {
          notificationPayload: await errorPayload(result.error),
          original: result.error
        };
      }

      const data = result.data || {};
      if (data.sent === true) {
        setState(fingerprint, {
          disabled: true,
          loading: false,
          label: 'Aviso enviado',
          kind: 'success',
          message: 'Se envió un nuevo acceso seguro a esta conversación.'
        });
        return;
      }

      if (data.idempotency_state === 'already_sent') {
        setState(fingerprint, {
          disabled: true,
          loading: false,
          label: 'Aviso ya enviado',
          kind: 'info',
          message: 'Esta última respuesta del operador ya fue notificada. No se envió un duplicado.'
        });
        return;
      }

      setState(fingerprint, {
        disabled: false,
        loading: false,
        label: 'Enviar aviso de respuesta',
        kind: 'error',
        message: friendlyError(data)
      });
    } catch (error) {
      const payload = error?.notificationPayload || null;
      const code = String(payload?.code || '').trim();
      const missingSession = error instanceof Error && error.message === 'missing_protocol_session';
      const mustBlockRetry = code === 'email_sent_audit_failed' || code === 'notification_already_sending';

      setState(fingerprint, {
        disabled: mustBlockRetry,
        loading: false,
        label: mustBlockRetry ? 'Revisión requerida' : 'Enviar aviso de respuesta',
        kind: 'error',
        message: missingSession
          ? 'No hay una sesión válida de Protocol Data. Iniciá sesión nuevamente.'
          : friendlyError(payload)
      });

      console.warn('[Aviso de respuesta soporte]', error?.original || error);
    }
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.logSupportReplyNotifyBound === '1') return;
    main.dataset.logSupportReplyNotifyBound = '1';

    main.addEventListener('click', function (event) {
      const button = event.target.closest('[data-log-support-reply-notify]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (button.disabled || button.dataset.loading === '1') return;
      handleNotify(button);
    }, true);
  }

  function observe() {
    if (observer) observer.disconnect();
    const main = root();
    if (!main) return;

    observer = new MutationObserver(function (mutations) {
      const onlyOwnUi = mutations.length > 0 && mutations.every(function (mutation) {
        return mutation.target?.closest?.('[data-log-support-reply-notify-wrap]');
      });
      if (!onlyOwnUi) queueInject();
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  function boot() {
    const main = root();
    if (!main) return;
    if (window[READY_FLAG] && main.dataset.logSupportReplyNotifyBooted === '1') {
      queueInject();
      return;
    }

    window[READY_FLAG] = true;
    main.dataset.logSupportReplyNotifyBooted = '1';
    ensureStyles();
    bind();
    observe();
    queueInject();
  }

  window.ProtocolSupportReplyNotification = Object.freeze({
    refresh: queueInject
  });

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
