/* ==========================================================
   Protocol Data · Logística · Conversaciones · Force real data
   Capa puente: fuerza la TAB Conversaciones a leer Supabase real
   cuando el panel fue inyectado tarde por el módulo mock.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaConversacionesForceRealReady';

  const statusLabels = {
    nueva: 'Nueva',
    en_proceso: 'En proceso',
    respondida: 'Respondida',
    cerrada: 'Cerrada'
  };

  const statusClasses = {
    nueva: 'logBadge--blue',
    en_proceso: 'logBadge--orange',
    respondida: 'logBadge--green',
    cerrada: 'logBadge--gray'
  };

  const priorityLabels = {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
  };

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function panel() {
    return root()?.querySelector('[data-log-panel="conversaciones"]') || null;
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
    return String(value === null || value === undefined || value === '' ? '—' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
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

  function ensureBadge() {
    const p = panel();
    const toolbar = p?.querySelector('.logConversationsToolbar');
    if (!toolbar) return null;

    let badge = toolbar.querySelector('#logConversationsLiveBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'logConversationsLiveBadge';
      toolbar.prepend(badge);
    }

    return badge;
  }

  function setBadge(label, isLive) {
    const badge = ensureBadge();
    if (!badge) return;
    badge.textContent = label;
    badge.className = 'logConversationsLiveBadge' + (isLive ? '' : ' is-demo');
  }

  function renderSummary(summary) {
    const box = panel()?.querySelector('#logConversationsSummary');
    if (!box || !summary) return;

    box.innerHTML = `
      <div class="logConversationMetric"><span>Nuevas</span><strong>${Number(summary.nuevas || 0)}</strong></div>
      <div class="logConversationMetric"><span>En proceso</span><strong>${Number(summary.en_proceso || 0)}</strong></div>
      <div class="logConversationMetric"><span>Respondidas</span><strong>${Number(summary.respondidas || 0)}</strong></div>
      <div class="logConversationMetric"><span>Cerradas</span><strong>${Number(summary.cerradas || 0)}</strong></div>
      <div class="logConversationMetric"><span>No verificadas</span><strong>${Number(summary.no_verificadas || 0)}</strong></div>
    `;
  }

  function renderTable(items) {
    const tbody = panel()?.querySelector('#logConversationsTbody');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="logConversationLiveEmpty">No hay conversaciones reales para los filtros seleccionados.</div></td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${esc(item.conversation_id)}</strong><br><span>${esc(shortDate(item.created_at))}</span></td>
        <td>${esc(item.customer_name)}<br><span>${esc(item.customer_email)}</span><br><span class="logConversationVerified ${item.is_verified ? 'logConversationVerified--yes' : 'logConversationVerified--no'}">${item.is_verified ? 'Verificada' : 'No verificada'}</span></td>
        <td><div class="logConversationOrder"><strong>${esc(item.tracking_id)} · ${esc(item.shopify_order_name)}</strong><em>${esc(item.product_name)}</em><em>${esc(item.shipping_address)}</em></div></td>
        <td>${esc(item.shipping_status)}<br><span>${esc(item.logistics_status)}</span><br><span>${esc(item.payment_status)}</span></td>
        <td>${esc(item.reason)}<br><span>Prioridad ${esc(priorityLabels[item.priority] || item.priority)}</span></td>
        <td><div class="logConversationMessage">${esc(item.last_message)}</div><span>${esc(shortDate(item.last_message_at))} · ${Number(item.messages_count || 0)} mensajes</span></td>
        <td><span class="logBadge ${statusClasses[item.status] || 'logBadge--gray'}">${esc(statusLabels[item.status] || item.status)}</span></td>
        <td>${esc(item.assigned_to || 'Sin asignar')}</td>
        <td><button class="logActionBtn" type="button" data-log-open-conversation="${esc(item.conversation_id)}" data-log-open-conversation-real="1">Ver</button></td>
      </tr>
    `).join('');
  }

  async function loadRealConversations() {
    const p = panel();
    if (!p) return false;

    const status = p.querySelector('#logConversationsStatus')?.value || 'todos';
    const query = (p.querySelector('#logConversationsSearch')?.value || '').trim();

    setBadge('Sincronizando...', true);

    try {
      const data = await rpc('protocol_support_conversations', {
        input_status: status,
        input_query: query,
        input_limit: 50,
        input_offset: 0
      });

      renderSummary(data?.summary || {});
      renderTable(Array.isArray(data?.items) ? data.items : []);
      setBadge('Supabase activo', true);
      window.__protocolLogisticaConversacionesRealLoaded = true;
      return true;
    } catch (error) {
      console.warn('[Conversaciones Force Real]', error);
      setBadge('Modo demo', false);
      return false;
    }
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.logisticaConversacionesForceRealBound === '1') return;
    main.dataset.logisticaConversacionesForceRealBound = '1';

    main.addEventListener('click', event => {
      const tab = event.target.closest('[data-log-tab="conversaciones"]');
      if (tab) window.setTimeout(loadRealConversations, 80);
    }, true);

    main.addEventListener('input', event => {
      if (!event.target.closest('#logConversationsSearch')) return;
      window.clearTimeout(window.__logConversationsForceRealTimer);
      window.__logConversationsForceRealTimer = window.setTimeout(loadRealConversations, 240);
    }, true);

    main.addEventListener('change', event => {
      if (event.target.closest('#logConversationsStatus')) loadRealConversations();
    }, true);
  }

  function boot() {
    const main = root();
    if (!main) return;

    if (window[READY_FLAG] && main.dataset.logisticaConversacionesForceRealBooted === '1') return;
    window[READY_FLAG] = true;
    main.dataset.logisticaConversacionesForceRealBooted = '1';

    bind();
    window.setTimeout(loadRealConversations, 100);
    window.setTimeout(loadRealConversations, 500);
    window.setTimeout(loadRealConversations, 1200);
  }

  window.ProtocolLogisticaSupportForceRefresh = loadRealConversations;

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
