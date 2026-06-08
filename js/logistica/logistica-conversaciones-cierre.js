/* ==========================================================
   Protocol Data · Logística · Conversaciones · Cierre operativo
   Agrega estado Abierta/Finalizada dentro del slide de conversación.
   Bloquea respuestas de soporte cuando el caso está finalizado.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaConversacionesCierreReady';
  const STYLE_ID = 'logistica-conversaciones-cierre-style';

  if (window[READY_FLAG]) return;
  window[READY_FLAG] = true;

  const statusToUi = {
    nueva: 'abierta',
    en_proceso: 'abierta',
    respondida: 'abierta',
    abierta: 'abierta',
    cerrada: 'finalizada',
    finalizada: 'finalizada'
  };

  const uiToStatus = {
    abierta: 'en_proceso',
    finalizada: 'cerrada'
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

    if (window.__protocolLogisticaSupportClient) return window.__protocolLogisticaSupportClient;

    const c = cfg();
    const key = c && (c.anonKey || c.publishableKey || c.key);

    if (!window.supabase || !c || !c.url || !key) return null;

    window.__protocolLogisticaSupportClient = window.supabase.createClient(c.url, key);
    return window.__protocolLogisticaSupportClient;
  }

  function esc(value) {
    return String(value === null || value === undefined || value === '' ? '—' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .logConversationSlide__header {
        position: sticky !important;
        background: #ededed !important;
        color: #252a32 !important;
      }

      .logConversationSlide__header .logConversationSlide__title {
        padding-right: 184px !important;
      }

      .logConversationSlide__header .logConversationSlide__title strong {
        color: #252a32 !important;
      }

      .logConversationSlide__header .logConversationSlide__title span {
        color: #68768a !important;
        opacity: 1 !important;
      }

      .logConversationSlideStatusControl {
        position: absolute;
        right: 14px;
        top: 50%;
        z-index: 4;
        transform: translateY(-50%);
        display: inline-flex;
        width: 166px;
        height: 38px;
        align-items: center;
        gap: 7px;
        border: 1px solid #9ee7dc;
        border-radius: 5px;
        background: #d9f8f2;
        color: #117c70;
        padding: 0 10px;
        box-shadow: 0 8px 18px rgba(17, 124, 112, 0.10);
      }

      .logConversationSlideStatusControl.is-finalizada {
        border-color: #d8dee8;
        background: #f1f3f6;
        color: #596274;
        box-shadow: none;
      }

      .logConversationSlideStatusControl__icon {
        display: inline-flex;
        width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: currentColor;
        font-size: 12px;
        font-weight: 950;
        flex: 0 0 auto;
      }

      .logConversationSlideStatusControl select {
        width: 100%;
        min-width: 0;
        height: 100%;
        border: 0;
        background: transparent;
        color: currentColor;
        font: inherit;
        font-size: 12px;
        font-weight: 950;
        outline: none;
        cursor: pointer;
        appearance: none;
      }

      .logConversationSlideStatusControl__arrow {
        color: currentColor;
        font-size: 13px;
        line-height: 1;
        font-weight: 950;
        flex: 0 0 auto;
      }

      .logConversationReply.is-closed textarea {
        background: #f1f3f6 !important;
        color: #8a94a6 !important;
        cursor: not-allowed !important;
      }

      .logConversationReply.is-closed .btn {
        opacity: 0.55 !important;
        cursor: not-allowed !important;
      }

      .logConversationClosedNotice {
        display: grid;
        gap: 3px;
        margin-bottom: 10px;
        border-radius: 5px;
        background: #f1f3f6;
        color: #596274;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.35;
        font-weight: 800;
      }

      .logConversationClosedNotice strong {
        color: #252a32;
        font-size: 13px;
        font-weight: 950;
      }

      .logConversationStatusUpdateMessage {
        position: absolute;
        right: 14px;
        top: 54px;
        z-index: 5;
        max-width: 260px;
        border-radius: 5px;
        padding: 9px 10px;
        font-size: 12px;
        line-height: 1.32;
        font-weight: 850;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
      }

      .logConversationStatusUpdateMessage.is-success {
        background: #eaf8f1;
        color: #107a51;
      }

      .logConversationStatusUpdateMessage.is-error {
        background: #fff1f0;
        color: #b42318;
      }

      @media (max-width: 760px) {
        .logConversationSlide__header .logConversationSlide__title {
          padding-right: 0 !important;
        }

        .logConversationSlideStatusControl {
          position: static;
          transform: none;
          width: 100%;
          grid-column: 1 / -1;
          margin-top: 8px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function getActiveConversationId() {
    const form = q('[data-log-conversation-reply-real]');
    if (form?.dataset?.logConversationReplyReal) return form.dataset.logConversationReplyReal;

    const title = q('#logConversationSlideTitle');
    return (title?.textContent || '').trim();
  }

  function normalizeStatus(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('finalizada') || raw.includes('cerrada')) return 'finalizada';
    return 'abierta';
  }

  function currentStatusFromDom() {
    const pill = q('.logConversationStatusRow .logStatusPill');
    return normalizeStatus(pill?.textContent || 'abierta');
  }

  function readDataItem(label) {
    const items = Array.from(root()?.querySelectorAll('.logConversationDataItem') || []);
    const target = label.trim().toLowerCase();
    const item = items.find(row => (row.querySelector('span')?.textContent || '').trim().toLowerCase() === target);
    return (item?.querySelector('strong')?.textContent || '').trim();
  }

  function enhanceHeaderContext() {
    const title = q('#logConversationSlideTitle');
    const subtitle = q('#logConversationSlideSubtitle');
    if (!title || !subtitle) return;

    const product = readDataItem('Producto');
    const logistics = readDataItem('Estado logístico') || readDataItem('Estado envío');
    const tracking = readDataItem('Tracking');

    if (product && product !== '—') title.textContent = product;

    const pieces = [];
    if (logistics && logistics !== '—') pieces.push('Estado logístico · ' + logistics);
    if (tracking && tracking !== '—') pieces.push(tracking);

    if (pieces.length) subtitle.textContent = pieces.join(' · ');
  }

  function setInlineStatus(message, type) {
    const header = q('.logConversationSlide__header');
    if (!header) return;

    let box = header.querySelector('.logConversationStatusUpdateMessage');
    if (!box) {
      box = document.createElement('div');
      box.className = 'logConversationStatusUpdateMessage';
      header.appendChild(box);
    }

    box.textContent = message;
    box.className = 'logConversationStatusUpdateMessage is-' + (type || 'success');

    window.clearTimeout(window.__logConversationStatusMessageTimer);
    window.__logConversationStatusMessageTimer = window.setTimeout(() => {
      if (box && box.parentNode) box.remove();
    }, 2400);
  }

  function applyReplyLock(status) {
    const isClosed = status === 'finalizada';
    const form = q('[data-log-conversation-reply-real]');
    if (!form) return;

    form.classList.toggle('is-closed', isClosed);
    form.dataset.conversationClosed = isClosed ? '1' : '0';

    const textarea = form.querySelector('textarea');
    const buttons = Array.from(form.querySelectorAll('button'));

    if (textarea) {
      textarea.disabled = isClosed;
      textarea.placeholder = isClosed
        ? 'Conversación finalizada. Reabrila para responder.'
        : 'Escribir respuesta para el cliente...';
    }

    buttons.forEach(button => {
      button.disabled = isClosed;
    });

    let notice = form.querySelector('.logConversationClosedNotice');
    if (isClosed && !notice) {
      notice = document.createElement('div');
      notice.className = 'logConversationClosedNotice';
      notice.innerHTML = '<strong>Conversación finalizada</strong><span>Reabrí el caso desde el estado de conversación para responder al cliente.</span>';
      form.prepend(notice);
    }

    if (!isClosed && notice) notice.remove();
  }

  function ensureStatusControl() {
    const header = q('.logConversationSlide__header');
    if (!header) return;

    let control = header.querySelector('.logConversationSlideStatusControl');
    const status = currentStatusFromDom();

    if (!control) {
      control = document.createElement('label');
      control.className = 'logConversationSlideStatusControl';
      control.innerHTML = `
        <span class="logConversationSlideStatusControl__icon" aria-hidden="true">✓</span>
        <select id="logConversationSlideStatusSelect" aria-label="Estado de conversación">
          <option value="abierta">Abierta</option>
          <option value="finalizada">Finalizada</option>
        </select>
        <span class="logConversationSlideStatusControl__arrow" aria-hidden="true">⌄</span>
      `;
      header.appendChild(control);
    }

    const select = control.querySelector('select');
    if (select && select.value !== status) select.value = status;
    control.classList.toggle('is-finalizada', status === 'finalizada');
    applyReplyLock(status);
  }

  async function updateStatusInSupabase(conversationId, nextUiStatus) {
    const c = client();
    if (!c) throw new Error('Supabase no configurado.');

    const nextStatus = uiToStatus[nextUiStatus] || 'en_proceso';
    const now = new Date().toISOString();

    const rpcAttempts = [
      {
        name: 'protocol_support_conversation_update_status',
        args: {
          input_conversation_id: conversationId,
          input_status: nextStatus,
          input_closed_by: nextStatus === 'cerrada' ? 'Soporte' : null
        }
      },
      {
        name: 'protocol_support_update_conversation_status',
        args: {
          input_conversation_id: conversationId,
          input_next_status: nextStatus,
          input_operator_name: 'Soporte'
        }
      }
    ];

    for (const attempt of rpcAttempts) {
      try {
        const response = await c.rpc(attempt.name, attempt.args);
        if (!response.error) return response.data || { status: 'ok' };
      } catch (error) {
        // Si la RPC no existe, probamos la siguiente estrategia.
      }
    }

    const richPayload = nextStatus === 'cerrada'
      ? { status: nextStatus, closed_at: now, closed_by: 'Soporte', updated_at: now }
      : { status: nextStatus, closed_at: null, closed_by: null, reopened_at: now, reopened_by: 'Soporte', updated_at: now };

    let direct = await c
      .from('support_conversations')
      .update(richPayload)
      .eq('conversation_id', conversationId)
      .select('conversation_id,status')
      .maybeSingle();

    if (!direct.error) return direct.data || { status: 'ok' };

    direct = await c
      .from('support_conversations')
      .update({ status: nextStatus, updated_at: now })
      .eq('conversation_id', conversationId)
      .select('conversation_id,status')
      .maybeSingle();

    if (direct.error) throw direct.error;
    return direct.data || { status: 'ok' };
  }

  function updateVisibleStatus(nextUiStatus) {
    const nextLabel = nextUiStatus === 'finalizada' ? 'Cerrada' : 'En proceso';
    const nextClass = nextUiStatus === 'finalizada' ? 'logStatusPill--gray' : 'logStatusPill--orange';
    const nextIcon = nextUiStatus === 'finalizada' ? '✓' : '↻';
    const pill = q('.logConversationStatusRow .logStatusPill');

    if (pill) {
      pill.className = 'logStatusPill ' + nextClass;
      pill.innerHTML = '<span class="logStatusIcon">' + esc(nextIcon) + '</span>' + esc(nextLabel);
    }

    const control = q('.logConversationSlideStatusControl');
    if (control) control.classList.toggle('is-finalizada', nextUiStatus === 'finalizada');

    applyReplyLock(nextUiStatus);
  }

  async function handleStatusChange(event) {
    const select = event.target.closest('#logConversationSlideStatusSelect');
    if (!select) return;

    const conversationId = getActiveConversationId();
    const nextStatus = select.value;
    const previousStatus = q('.logConversationSlideStatusControl')?.classList.contains('is-finalizada') ? 'finalizada' : 'abierta';

    if (!conversationId) return;

    select.disabled = true;
    setInlineStatus('Actualizando estado de conversación...', 'success');

    try {
      await updateStatusInSupabase(conversationId, nextStatus);
      updateVisibleStatus(nextStatus);
      setInlineStatus(nextStatus === 'finalizada' ? 'Conversación finalizada.' : 'Conversación reabierta.', 'success');

      if (typeof window.ProtocolLogisticaSupportRefresh === 'function') {
        window.ProtocolLogisticaSupportRefresh();
      } else if (typeof window.ProtocolLogisticaSupportForceRefresh === 'function') {
        window.ProtocolLogisticaSupportForceRefresh();
      }
    } catch (error) {
      console.warn('[Estado conversación]', error);
      select.value = previousStatus;
      setInlineStatus('No se pudo actualizar el estado. Revisá permisos o RPC.', 'error');
    } finally {
      select.disabled = false;
    }
  }

  function blockClosedSubmit(event) {
    const form = event.target.closest('[data-log-conversation-reply-real]');
    if (!form) return;

    if (form.dataset.conversationClosed !== '1') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setInlineStatus('La conversación está finalizada. Reabrila para responder.', 'error');
  }

  function enhanceSlide() {
    const slide = q('#logConversationSlide');
    if (!slide || !slide.classList.contains('is-open')) return;

    enhanceHeaderContext();
    ensureStatusControl();
  }

  function bind() {
    const main = root();
    if (!main) return;

    injectStyles();

    if (main.dataset.logisticaConversacionesCierreBound !== '1') {
      main.dataset.logisticaConversacionesCierreBound = '1';
      main.addEventListener('change', handleStatusChange, true);
      document.addEventListener('submit', blockClosedSubmit, true);
    }

    if (!window.__logConversacionesCierreObserver) {
      window.__logConversacionesCierreObserver = new MutationObserver(() => {
        window.clearTimeout(window.__logConversacionesCierreTimer);
        window.__logConversacionesCierreTimer = window.setTimeout(enhanceSlide, 30);
      });
      window.__logConversacionesCierreObserver.observe(main, { childList: true, subtree: true });
    }

    window.setTimeout(enhanceSlide, 60);
    window.setTimeout(enhanceSlide, 260);
  }

  function boot() {
    const main = root();
    if (!main) return;
    bind();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);

  if (document.readyState !== 'loading') boot();
})();
