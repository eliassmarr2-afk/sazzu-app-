/* ==========================================================
   Protocol Data · Logística · Conversaciones · Enviar respuesta
   Fase 3F: conecta el submit del slide con protocol_support_send_message.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaConversacionesSendReady';

  function root() {
    return document.querySelector('main.logisticsMain');
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

  async function rpc(name, args) {
    const c = client();
    if (!c) throw new Error('Supabase no configurado');
    const res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  function esc(value) {
    return String(value === null || value === undefined || value === '' ? '—' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c]));
  }

  function shortDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.disabled = Boolean(isLoading);
    button.textContent = isLoading ? 'Enviando...' : 'Enviar respuesta';
  }

  function showInlineStatus(form, message, type) {
    let box = form.querySelector('.logConversationReplyStatus');
    if (!box) {
      box = document.createElement('div');
      box.className = 'logConversationReplyStatus';
      form.appendChild(box);
    }

    box.textContent = message;
    box.className = 'logConversationReplyStatus logConversationReplyStatus--' + (type || 'info');
  }

  function ensureStyles() {
    if (document.getElementById('logConversationSendStyles')) return;

    const style = document.createElement('style');
    style.id = 'logConversationSendStyles';
    style.textContent = `
      .logConversationReplyStatus{border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.35;font-weight:850}.logConversationReplyStatus--success{background:#eaf8f1;color:#10a66a}.logConversationReplyStatus--error{background:#fff1f0;color:#d93025}.logConversationReplyStatus--info{background:#eef5ff;color:#2479ff}
    `;
    document.head.appendChild(style);
  }

  function appendOperatorBubble(form, result) {
    const chat = root()?.querySelector('.logConversationChat');
    const message = result && result.inserted_message;
    if (!chat || !message) return;

    const bubble = document.createElement('div');
    bubble.className = 'logConversationBubble logConversationBubble--operator';
    bubble.innerHTML = `
      <strong>${esc(message.sender_name || 'Soporte')}</strong>
      <p>${esc(message.message_body)}</p>
      <small>${esc(shortDate(message.created_at))}</small>
    `;
    chat.appendChild(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function refreshConversationTable() {
    const status = root()?.querySelector('#logConversationsStatus');
    if (status) {
      status.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (typeof window.ProtocolLogisticaSupabaseRefresh === 'function') {
      window.ProtocolLogisticaSupabaseRefresh();
    }
  }

  async function handleSubmit(event) {
    const form = event.target.closest('[data-log-conversation-reply-real]');
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const conversationId = form.dataset.logConversationReplyReal;
    const textarea = form.querySelector('textarea');
    const button = form.querySelector('button[type="submit"]');
    const message = (textarea && textarea.value ? textarea.value : '').trim();

    if (!message) {
      showInlineStatus(form, 'Escribí una respuesta antes de enviarla.', 'error');
      return;
    }

    setButtonLoading(button, true);
    showInlineStatus(form, 'Enviando respuesta a Supabase...', 'info');

    try {
      const result = await rpc('protocol_support_send_message', {
        input_conversation_id: conversationId,
        input_sender_name: 'Operador Protocol Data',
        input_sender_email: null,
        input_message_body: message,
        input_is_internal: false,
        input_next_status: 'respondida',
        input_assigned_to: 'Soporte'
      });

      if (!result || result.status !== 'ok') {
        showInlineStatus(form, result && result.message ? result.message : 'No se pudo enviar la respuesta.', 'error');
        setButtonLoading(button, false);
        return;
      }

      appendOperatorBubble(form, result);
      textarea.value = '';
      showInlineStatus(form, 'Respuesta enviada correctamente. La conversación pasó a Respondida.', 'success');
      refreshConversationTable();
    } catch (error) {
      console.warn('[Enviar respuesta soporte]', error);
      showInlineStatus(form, 'No se pudo enviar la respuesta. Revisá Supabase o los permisos de la RPC.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.logisticaConversacionesSendBound === '1') return;
    main.dataset.logisticaConversacionesSendBound = '1';
    main.addEventListener('submit', handleSubmit, true);
  }

  function boot() {
    const main = root();
    if (!main) return;
    if (window[READY_FLAG] && main.dataset.logisticaConversacionesSendBooted === '1') return;

    window[READY_FLAG] = true;
    main.dataset.logisticaConversacionesSendBooted = '1';
    ensureStyles();
    bind();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
