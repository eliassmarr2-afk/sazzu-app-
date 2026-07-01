/* ==========================================================
   Protocol Data · Logística · Hotfix Tabs + Cierre Conversación
   Build: LOGISTICA_TABS_CONVERSACION_HOTFIX_2026_07_01_01

   Objetivo:
   - Restaurar navegación de tabs cuando Conversaciones captura el panel.
   - Garantizar control Abierta / Finalizada en slide de conversación.
   - Mantener flujo Supabase de cierre/reapertura.
   ========================================================== */

(function () {
  const BUILD = 'LOGISTICA_TABS_CONVERSACION_HOTFIX_2026_07_01_01';
  const STYLE_ID = 'logisticaConversacionesHotfixStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function root() {
    return document.querySelector('main.logisticsMain');
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

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="logistica"] .logTab{
        pointer-events:auto!important;
        cursor:pointer!important;
      }

      body[data-page="logistica"] .logPanel:not(.is-active){
        display:none!important;
      }

      body[data-page="logistica"] .logPanel.is-active{
        display:block!important;
      }

      .logConversationSlideStatusControl{
        position:absolute!important;
        right:14px!important;
        top:50%!important;
        z-index:30!important;
        transform:translateY(-50%)!important;
        display:inline-flex!important;
        width:166px!important;
        height:38px!important;
        align-items:center!important;
        gap:7px!important;
        border:1px solid #9ee7dc!important;
        border-radius:5px!important;
        background:#d9f8f2!important;
        color:#117c70!important;
        padding:0 10px!important;
        box-shadow:0 8px 18px rgba(17,124,112,.10)!important;
      }

      .logConversationSlideStatusControl.is-finalizada{
        border-color:#d8dee8!important;
        background:#f1f3f6!important;
        color:#596274!important;
        box-shadow:none!important;
      }

      .logConversationSlideStatusControl__icon{
        display:inline-flex!important;
        width:20px!important;
        height:20px!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:999px!important;
        background:rgba(255,255,255,.72)!important;
        color:currentColor!important;
        font-size:12px!important;
        font-weight:950!important;
        flex:0 0 auto!important;
      }

      .logConversationSlideStatusControl select{
        width:100%!important;
        min-width:0!important;
        height:100%!important;
        border:0!important;
        background:transparent!important;
        color:currentColor!important;
        font:inherit!important;
        font-size:12px!important;
        font-weight:950!important;
        outline:0!important;
        cursor:pointer!important;
        appearance:none!important;
        -webkit-appearance:none!important;
      }

      .logConversationSlideStatusControl__arrow{
        color:currentColor!important;
        font-size:13px!important;
        line-height:1!important;
        font-weight:950!important;
        flex:0 0 auto!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationSlideStatusControl{
        background:#2f2f2f!important;
        border-color:rgba(255,255,255,.16)!important;
        color:#ececec!important;
        box-shadow:none!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationSlideStatusControl.is-finalizada{
        background:#353535!important;
        border-color:rgba(255,255,255,.14)!important;
        color:#bdbdbd!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationSlideStatusControl__icon{
        background:rgba(255,255,255,.10)!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationSlideStatusControl select option{
        background:#2f2f2f!important;
        color:#ececec!important;
      }

      .logConversationReply.is-closed textarea{
        cursor:not-allowed!important;
        opacity:.68!important;
      }

      .logConversationReply.is-closed button{
        opacity:.56!important;
        cursor:not-allowed!important;
      }

      .logConversationClosedNotice{
        display:grid!important;
        gap:3px!important;
        margin-bottom:10px!important;
        border-radius:5px!important;
        background:#f1f3f6!important;
        color:#596274!important;
        padding:10px 12px!important;
        font-size:12px!important;
        line-height:1.35!important;
        font-weight:800!important;
      }

      .logConversationClosedNotice strong{
        color:#252a32!important;
        font-size:13px!important;
        font-weight:950!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationClosedNotice{
        background:#353535!important;
        color:#c9c9c9!important;
        border:1px solid rgba(255,255,255,.10)!important;
      }

      body[data-page="logistica"].logistica-dark .logConversationClosedNotice strong{
        color:#ffffff!important;
      }

      .logConversationStatusUpdateMessage{
        position:absolute!important;
        right:14px!important;
        top:54px!important;
        z-index:31!important;
        max-width:260px!important;
        border-radius:5px!important;
        padding:9px 10px!important;
        font-size:12px!important;
        line-height:1.32!important;
        font-weight:850!important;
        box-shadow:0 12px 24px rgba(15,23,42,.14)!important;
      }

      .logConversationStatusUpdateMessage.is-success{background:#eaf8f1!important;color:#107a51!important;}
      .logConversationStatusUpdateMessage.is-error{background:#fff1f0!important;color:#b42318!important;}

      body[data-page="logistica"].logistica-dark .logConversationStatusUpdateMessage.is-success{background:#1f513b!important;color:#9cf0c1!important;}
      body[data-page="logistica"].logistica-dark .logConversationStatusUpdateMessage.is-error{background:#5a2727!important;color:#ffb7b7!important;}

      @media(max-width:760px){
        .logConversationSlideStatusControl{
          position:static!important;
          transform:none!important;
          width:100%!important;
          margin-top:8px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setTab(tab) {
    const main = root();
    if (!main || !tab) return;

    main.querySelectorAll('[data-log-tab]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.logTab === tab);
    });

    main.querySelectorAll('[data-log-panel]').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.logPanel === tab);
    });

    main.dataset.logisticaActiveTab = tab;

    if (tab === 'conversaciones') {
      window.setTimeout(() => {
        if (typeof window.ProtocolLogisticaSupportForceRefresh === 'function') {
          window.ProtocolLogisticaSupportForceRefresh();
        } else if (typeof window.ProtocolLogisticaSupportRefresh === 'function') {
          window.ProtocolLogisticaSupportRefresh();
        }
      }, 80);
    }

    if (tab === 'pedidos' && typeof window.ProtocolLogisticaPedidosRefresh === 'function') {
      window.setTimeout(() => window.ProtocolLogisticaPedidosRefresh({ silent: true }), 80);
    }
  }

  function bindTabs() {
    if (!isLogisticaPage() || document.body.dataset.logisticaTabsHotfixBound === '1') return;
    document.body.dataset.logisticaTabsHotfixBound = '1';

    document.addEventListener('click', event => {
      if (!isLogisticaPage()) return;

      const tabBtn = event.target.closest && event.target.closest('main.logisticsMain [data-log-tab]');
      if (tabBtn) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setTab(tabBtn.dataset.logTab);
        return;
      }

      const newRule = event.target.closest && event.target.closest('#logBtnNewRule');
      if (newRule) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setTab('reglas');
      }
    }, true);
  }

  function getActiveConversationId() {
    const form = document.querySelector('#logConversationSlide [data-log-conversation-reply-real], #logConversationSlide [data-log-conversation-reply]');
    if (form) {
      const id = form.dataset.logConversationReplyReal || form.dataset.logConversationReply;
      if (id) return id;
    }

    const copy = document.querySelector('#logConversationSlide [data-log-copy-conversation-id]');
    if (copy && copy.dataset.logCopyConversationId) return copy.dataset.logCopyConversationId;

    const title = document.querySelector('#logConversationSlideTitle');
    const text = (title && title.textContent ? title.textContent : '').trim();
    const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return uuid ? uuid[0] : text;
  }

  function inferUiStatus() {
    const current = document.querySelector('#logConversationSlideStatusSelect');
    if (current && current.value) return current.value;

    const statusRow = document.querySelector('#logConversationSlide .logConversationStatusRow');
    const text = (statusRow && statusRow.textContent ? statusRow.textContent : '').toLowerCase();
    if (text.includes('cerrada') || text.includes('finalizada')) return 'finalizada';
    return 'abierta';
  }

  function setInlineStatus(message, type) {
    const header = document.querySelector('#logConversationSlide .logConversationSlide__header');
    if (!header) return;

    let box = header.querySelector('.logConversationStatusUpdateMessage');
    if (!box) {
      box = document.createElement('div');
      box.className = 'logConversationStatusUpdateMessage';
      header.appendChild(box);
    }

    box.textContent = message;
    box.className = 'logConversationStatusUpdateMessage is-' + (type || 'success');

    window.clearTimeout(window.__logConversationHotfixStatusTimer);
    window.__logConversationHotfixStatusTimer = window.setTimeout(() => {
      if (box && box.parentNode) box.remove();
    }, 2400);
  }

  function applyReplyLock(uiStatus) {
    const isClosed = uiStatus === 'finalizada';
    const form = document.querySelector('#logConversationSlide [data-log-conversation-reply-real], #logConversationSlide [data-log-conversation-reply]');
    if (!form) return;

    form.classList.toggle('is-closed', isClosed);
    form.dataset.conversationClosed = isClosed ? '1' : '0';

    const textarea = form.querySelector('textarea');
    if (textarea) {
      textarea.disabled = isClosed;
      textarea.placeholder = isClosed ? 'Conversación finalizada. Reabrila para responder.' : 'Escribir respuesta para el cliente...';
    }

    form.querySelectorAll('button').forEach(button => {
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
    const slide = document.querySelector('#logConversationSlide.is-open');
    const header = slide ? slide.querySelector('.logConversationSlide__header') : null;
    if (!slide || !header) return;

    let control = header.querySelector('.logConversationSlideStatusControl');
    const uiStatus = inferUiStatus();

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
    if (select && select.value !== uiStatus) select.value = uiStatus;
    control.classList.toggle('is-finalizada', uiStatus === 'finalizada');
    applyReplyLock(uiStatus);
  }

  async function updateStatusInSupabase(conversationId, uiStatus) {
    const c = client();
    if (!c) throw new Error('Supabase no configurado.');

    const nextStatus = uiStatus === 'finalizada' ? 'cerrada' : 'en_proceso';
    const now = new Date().toISOString();

    const attempts = [
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

    for (const attempt of attempts) {
      try {
        const response = await c.rpc(attempt.name, attempt.args);
        if (!response.error) return response.data || { status: 'ok' };
      } catch (_error) {}
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

  function updateVisibleStatus(uiStatus) {
    const label = uiStatus === 'finalizada' ? 'Cerrada' : 'En proceso';
    const badgeClass = uiStatus === 'finalizada' ? 'logBadge--gray' : 'logBadge--orange';

    const statusRow = document.querySelector('#logConversationSlide .logConversationStatusRow');
    const firstBadge = statusRow ? statusRow.querySelector('.logBadge, .logStatusPill') : null;
    if (firstBadge) {
      firstBadge.className = 'logBadge ' + badgeClass;
      firstBadge.textContent = label;
    }

    const control = document.querySelector('#logConversationSlide .logConversationSlideStatusControl');
    if (control) control.classList.toggle('is-finalizada', uiStatus === 'finalizada');

    applyReplyLock(uiStatus);
  }

  function bindConversationStatus() {
    if (!isLogisticaPage() || document.body.dataset.logConversationStatusHotfixBound === '1') return;
    document.body.dataset.logConversationStatusHotfixBound = '1';

    document.addEventListener('change', async event => {
      const select = event.target.closest && event.target.closest('#logConversationSlideStatusSelect');
      if (!select) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const conversationId = getActiveConversationId();
      const nextStatus = select.value;
      const previousStatus = select.closest('.logConversationSlideStatusControl')?.classList.contains('is-finalizada') ? 'finalizada' : 'abierta';

      if (!conversationId) return;

      select.disabled = true;
      setInlineStatus('Actualizando estado de conversación...', 'success');

      try {
        await updateStatusInSupabase(conversationId, nextStatus);
        updateVisibleStatus(nextStatus);
        setInlineStatus(nextStatus === 'finalizada' ? 'Conversación finalizada.' : 'Conversación reabierta.', 'success');

        window.setTimeout(() => {
          if (typeof window.ProtocolLogisticaSupportForceRefresh === 'function') {
            window.ProtocolLogisticaSupportForceRefresh();
          } else if (typeof window.ProtocolLogisticaSupportRefresh === 'function') {
            window.ProtocolLogisticaSupportRefresh();
          }
        }, 250);
      } catch (error) {
        console.warn('[Conversación status hotfix]', error);
        select.value = previousStatus;
        setInlineStatus('No se pudo actualizar el estado. Revisá permisos o RPC.', 'error');
      } finally {
        select.disabled = false;
      }
    }, true);

    document.addEventListener('submit', event => {
      const form = event.target.closest && event.target.closest('#logConversationSlide [data-log-conversation-reply-real], #logConversationSlide [data-log-conversation-reply]');
      if (!form || form.dataset.conversationClosed !== '1') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setInlineStatus('La conversación está finalizada. Reabrila para responder.', 'error');
    }, true);
  }

  function observeConversationSlide() {
    const main = root();
    if (!main || main.dataset.logConversationStatusHotfixObserved === '1') return;
    main.dataset.logConversationStatusHotfixObserved = '1';

    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__logConversationStatusHotfixObserveTimer);
      window.__logConversationStatusHotfixObserveTimer = window.setTimeout(ensureStatusControl, 40);
    });

    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-hidden'] });

    window.setInterval(() => {
      if (document.querySelector('#logConversationSlide.is-open')) ensureStatusControl();
    }, 900);
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyles();
    bindTabs();
    bindConversationStatus();
    observeConversationSlide();
    ensureStatusControl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);

  window.LogisticaTabsConversacionHotfix = {
    build: BUILD,
    setTab,
    ensureStatusControl,
    boot
  };
})();
