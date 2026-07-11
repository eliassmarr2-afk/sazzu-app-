/* ==========================================================
   Protocol Data · Logística · Conversaciones · Supabase real
   Fase 4E.1: tabla + slide operativo con alertas, polling y filas por conversación.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaConversacionesSupabaseReady';
  const LIST_POLLING_MS = 10000;
  const DETAIL_POLLING_MS = 5000;
  const TABLE_PAGE_SIZE = 5;

  const state = {
    items: [],
    visibleItems: [],
    summary: null,
    status: 'todos',
    query: '',
    limit: 50,
    offset: 0,
    tableLimit: TABLE_PAGE_SIZE,
    isLive: false,
    activeConversationId: '',
    listPollTimer: null,
    detailPollTimer: null,
    detailFingerprint: '',
    detailAttachmentsByMessageId: {},
    detailConversation: null
  };

  const statusLabels = {
    nueva: 'Nueva',
    en_proceso: 'En proceso',
    respondida: 'Respondida',
    cerrada: 'Cerrada'
  };

  const statusClasses = {
    nueva: 'logStatusPill--blue',
    en_proceso: 'logStatusPill--orange',
    respondida: 'logStatusPill--green',
    cerrada: 'logStatusPill--gray'
  };

  const statusIcons = {
    nueva: '•',
    en_proceso: '↻',
    respondida: '✓',
    cerrada: '✓'
  };

  const priorityLabels = {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja'
  };

  const QUICK_REPLY_CUSTOM_STORAGE_KEY = 'protocol_logistica_conversaciones_quick_replies_v1';

  const DEFAULT_QUICK_REPLIES = [
    {
      title: 'Pedir más detalle',
      body: 'Hola, {nombre}. Entiendo que tuviste un inconveniente con tu compra. Vamos a revisarlo y solucionarlo lo antes posible. ¿Podrías contarnos un poco más sobre lo ocurrido?'
    },
    {
      title: 'Pedido en camino',
      body: 'Hola, {nombre}. Tu pedido {pedido} ya se encuentra en camino. En principio debería llegar dentro del plazo informado. Te mantenemos al tanto por este mismo chat.'
    },
    {
      title: 'Disculpa por demora',
      body: 'Te pedimos disculpas por la demora, {nombre}. Estamos revisando el estado de tu pedido {pedido} con logística para darte una respuesta concreta cuanto antes.'
    },
    {
      title: 'Verificar con logística',
      body: 'Gracias por la información, {nombre}. Vamos a verificarlo con logística y te responderemos por este mismo chat apenas tengamos una actualización.'
    },
    {
      title: 'Confirmar domicilio',
      body: 'Para avanzar con la revisión, ¿podrías confirmarnos si el domicilio de entrega sigue siendo {domicilio_entrega}?'
    },
    {
      title: 'Cierre cordial',
      body: 'Perfecto, {nombre}. Dejamos registrada tu consulta y vamos a continuar el seguimiento de tu caso. Cualquier novedad te respondemos por este mismo chat.'
    }
  ];

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

  function money(value) {
    const number = Number(value || 0);
    return number.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
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

  function messageDateParts(value) {
    if (!value) {
      return { label: '—', time: '', cls: 'old' };
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { label: String(value), time: '', cls: 'old' };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    let label = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let cls = 'old';

    if (target === today) {
      label = 'Hoy';
      cls = 'today';
    } else if (target === today - oneDay) {
      label = 'Ayer';
      cls = 'yesterday';
    }

    return {
      label,
      cls,
      time: date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };
  }

  function unreadCount(item) {
    if (item?.last_message_sender_type !== 'customer') return 0;
    const explicit = Number(item?.unread_count || item?.customer_unread_count || item?.new_customer_messages_count || 0);
    return explicit > 0 ? explicit : 1;
  }

  function attentionCount(items) {
    return (items || []).reduce((total, item) => total + (unreadCount(item) > 0 ? unreadCount(item) : 0), 0);
  }

  function detailFingerprint(payload) {
    const item = payload?.conversation || {};
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const last = messages.length ? messages[messages.length - 1] : null;
    return [item.updated_at || '', item.last_message_at || '', messages.length, last?.message_id || ''].join('|');
  }

  function dateMs(value) {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function conversationRowKey(item) {
    const email = String(item?.customer_email || '').trim().toLowerCase();
    if (email) return `email:${email}`;

    const tracking = String(item?.tracking_id || '').trim().toLowerCase();
    if (tracking) return `tracking:${tracking}`;

    return `conversation:${String(item?.conversation_id || '').trim()}`;
  }

  function mergeConversationRows(items) {
    const grouped = new Map();

    (items || []).forEach(item => {
      const key = conversationRowKey(item);
      const previous = grouped.get(key);

      if (!previous) {
        grouped.set(key, {
          ...item,
          messages_count: Number(item.messages_count || 0),
          unread_count: unreadCount(item),
          __group_count: 1
        });
        return;
      }

      const currentTime = dateMs(item.last_message_at || item.updated_at || item.created_at);
      const previousTime = dateMs(previous.last_message_at || previous.updated_at || previous.created_at);
      const base = currentTime >= previousTime ? item : previous;
      const totalUnread = unreadCount(previous) + unreadCount(item);

      grouped.set(key, {
        ...base,
        messages_count: Number(previous.messages_count || 0) + Number(item.messages_count || 0),
        unread_count: base.last_message_sender_type === 'customer' ? totalUnread : 0,
        __group_count: Number(previous.__group_count || 1) + 1
      });
    });

    return Array.from(grouped.values()).sort((a, b) => dateMs(b.last_message_at || b.updated_at || b.created_at) - dateMs(a.last_message_at || a.updated_at || a.created_at));
  }

  function buildVisibleSummary(items) {
    return (items || []).reduce((acc, item) => {
      const status = item.status || 'nueva';
      if (status === 'nueva') acc.nuevas += 1;
      if (status === 'en_proceso') acc.en_proceso += 1;
      if (status === 'respondida') acc.respondidas += 1;
      if (status === 'cerrada') acc.cerradas += 1;
      if (!item.is_verified) acc.no_verificadas += 1;
      return acc;
    }, { nuevas: 0, en_proceso: 0, respondidas: 0, cerradas: 0, no_verificadas: 0 });
  }

  function verificationBadge(item) {
    const verified = Boolean(item?.is_verified);
    return `<span class="logConversationVerified ${verified ? 'logConversationVerified--yes' : 'logConversationVerified--no'}"><span class="logVerifyIcon">${verified ? '✓' : '×'}</span>${verified ? 'Verificada' : 'No verificada'}</span>`;
  }

  function statusBadge(item) {
    const status = item?.status || 'nueva';
    const cls = statusClasses[status] || 'logStatusPill--gray';
    const icon = statusIcons[status] || '•';
    const label = statusLabels[status] || status;
    return `<span class="logStatusPill ${cls}"><span class="logStatusIcon">${esc(icon)}</span>${esc(label)}</span>`;
  }

  function responsibleBadge(item) {
    const responsible = item?.assigned_to || 'Sin asignar';
    const assigned = Boolean(item?.assigned_to);
    return `<span class="logResponsiblePill ${assigned ? 'logResponsiblePill--assigned' : 'logResponsiblePill--empty'}"><span class="logResponsibleIcon">${assigned ? '✓' : '•'}</span>${esc(responsible)}</span>`;
  }

  function ensureStyles() {
    if (document.getElementById('logConversationsSupabaseStyles')) return;

    const style = document.createElement('style');
    style.id = 'logConversationsSupabaseStyles';
    style.textContent = `
      .logConversationsLiveBadge{display:inline-flex;align-items:center;justify-content:center;min-height:26px;border-radius:999px;padding:0 10px;background:#eaf8f1;color:#10a66a;font-size:11px;font-weight:950;letter-spacing:.02em}.logConversationsLiveBadge.is-demo{background:#fff7ed;color:#c05621}.logConversationLiveEmpty{padding:18px;border-radius:15px;background:#f7faff;color:#697386;font-size:13px;font-weight:750;text-align:center}.logConversationLiveError{padding:14px;border-radius:15px;background:#fff1f1;color:#b42318;font-size:13px;font-weight:750}.logConversationSlide__loading{padding:16px;border-radius:5px;background:#fff;color:#697386;font-size:13px;font-weight:800}.logConversationSlide__error{padding:16px;border-radius:5px;background:#fff1f1;color:#b42318;font-size:13px;font-weight:800}
      .logPanel[data-log-panel="conversaciones"]{width:calc(100vw - 88px)!important;max-width:none!important;margin-right:0!important}.logPanel[data-log-panel="conversaciones"]>.logCard{width:100%!important;max-width:none!important;border-radius:5px 0 0 5px!important}.logPanel[data-log-panel="conversaciones"] .logTableWrap{overflow-x:auto}.logPanel[data-log-panel="conversaciones"] .logTable{min-width:1260px}.logConversationRow--attention{background:#e9fbf5!important}.logConversationRow--attention td{background:#e9fbf5!important}.logConversationAlertCell{display:flex;align-items:flex-start;gap:8px}.logConversationAlertBadge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:999px;background:#e53935;color:#fff!important;font-size:11px;font-weight:950;box-shadow:0 6px 14px rgba(229,57,53,.24);flex:0 0 auto}.logConversationMessageMeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px}.logConversationNeedsReply{display:inline-flex;align-items:center;min-height:20px;border-radius:5px;background:#e53935;color:#fff!important;padding:0 7px;font-size:10px;font-weight:950;letter-spacing:.02em}.protocolSidebarNotify{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:999px;background:#e53935;color:#fff!important;font-size:11px;font-weight:950;margin-left:auto;padding:0 6px;box-shadow:0 6px 14px rgba(229,57,53,.22)}
      .logConversationSlide__panel{width:80vw!important;max-width:80vw!important;border-radius:5px 0 0 5px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}.logConversationSlide__header{flex:0 0 auto!important}.logConversationSlide__content{flex:1 1 auto!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:14px!important}.logConversationStatusRow{flex:0 0 auto}.logConversationDetailGrid{flex:1 1 auto;min-height:0;height:100%;display:grid;grid-template-columns:minmax(0,1fr)minmax(320px,360px);gap:14px}.logConversationBox{border-radius:5px!important;min-height:0;display:flex;flex-direction:column;overflow:hidden}.logConversationBox--chat{min-height:0}.logConversationBox--data{min-height:0}.logConversationBox__head{flex:0 0 auto}.logConversationChat{flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:6px;scrollbar-width:thin}.logConversationReply{flex:0 0 auto;border-top:1px solid rgba(15,23,42,.08);padding-top:10px;margin-top:10px}.logConversationDataList{flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:6px;scrollbar-width:thin}.logConversationBox--data .logConversationBox__head{margin-bottom:8px}.logConversationBubble{border-radius:5px!important}.logConversationBubble--customer{justify-self:start;background:#f6f8fb!important;border:1px solid #dde1e8!important}.logConversationBubble--operator{justify-self:end;background:#2479ff!important;color:#fff!important}.logConversationBubble--operator p,.logConversationBubble--operator strong,.logConversationBubble--operator small{color:#fff!important}.logConversationReply textarea{min-height:82px!important;max-height:120px!important;resize:none!important;border-radius:5px!important}.logConversationReply__actions .btn{border-radius:5px!important}@media(max-width:980px){.logConversationSlide__panel{width:100vw!important;max-width:100vw!important;border-radius:0!important}.logConversationDetailGrid{grid-template-columns:1fr}.logConversationBox--data{max-height:34vh}.logPanel[data-log-panel="conversaciones"]{width:100%!important}}
      #logConversationsTbody td{vertical-align:top}#logConversationsTbody tr[data-log-row-open]{cursor:pointer;transition:background .18s ease,transform .18s ease,box-shadow .18s ease}#logConversationsTbody tr[data-log-row-open]:hover td{background:#f7fbff!important}#logConversationsTbody tr[data-log-row-open]:hover td:first-child{border-radius:5px 0 0 5px}#logConversationsTbody tr[data-log-row-open]:hover td:last-child{border-radius:0 5px 5px 0}.logConversationRow--attention:hover td{background:#def7ee!important}.logClamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;max-width:100%;line-height:1.28}.logClampStrong{font-weight:950;color:#232a35}.logClampMuted{font-size:12px;font-weight:780;color:#657187}.logConversationVerified,.logStatusPill,.logResponsiblePill{display:inline-flex!important;align-items:center;gap:5px;min-height:22px;border-radius:5px!important;padding:0 7px!important;font-size:11px!important;font-weight:950!important;line-height:1!important;color:#fff!important}.logConversationVerified--yes,.logStatusPill--green,.logResponsiblePill--assigned{background:#12a66a!important}.logConversationVerified--no{background:#e53935!important}.logStatusPill--blue{background:#2479ff!important}.logStatusPill--orange{background:#ff8a00!important}.logStatusPill--gray,.logResponsiblePill--empty{background:#6b7280!important}.logVerifyIcon,.logStatusIcon,.logResponsibleIcon{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:999px;background:rgba(255,255,255,.22);color:#fff!important;font-size:10px;font-weight:950}.logBadge{border-radius:5px!important}.logConversationRelative{font-size:12px;font-weight:950}.logConversationRelative--today{color:#12a66a}.logConversationRelative--yesterday{color:#2479ff}.logConversationRelative--old{color:#657187}.logConversationTime{font-size:12px;font-weight:850;color:#7a8496}.logConversationCount{display:block;margin-top:4px;font-size:12px;font-weight:950;color:#59657a}.logConversationOrder em{font-style:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis}.logConversationMessage{font-weight:900;color:#232a35}.logConversationMessageMeta .logConversationNeedsReply{margin-right:2px}.logActionBtn--ghost{background:transparent!important;color:#2479ff!important;border:0!important;box-shadow:none!important;padding:0!important;display:inline-flex!important;align-items:center!important;gap:5px!important;font-size:12px!important;font-weight:950!important}.logActionArrow{display:inline-flex;transition:transform .18s ease}.logActionBtn--ghost:hover .logActionArrow,#logConversationsTbody tr[data-log-row-open]:hover .logActionArrow{transform:translateX(4px)}.logConversationMoreRow td{background:#fff!important;padding:12px!important;text-align:center}.logConversationMoreBtn{border:1px solid #dde6f3;background:#fff;border-radius:5px;color:#2479ff;font-size:12px;font-weight:950;padding:9px 14px;cursor:pointer}.logConversationMoreBtn:hover{background:#f7fbff}
    `;
    document.head.appendChild(style);
  }


  function ensureAttachmentStyles() {
    if (document.getElementById('logConversationAttachmentStyles')) return;

    const style = document.createElement('style');
    style.id = 'logConversationAttachmentStyles';
    style.textContent = `
      .logConversationAttachmentList{display:grid;gap:8px;margin-top:9px}
      .logConversationAttachmentCard{display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;align-items:center;border-radius:12px;padding:10px;background:rgba(15,23,42,.06);border:1px solid rgba(148,163,184,.28);box-shadow:0 10px 24px rgba(15,23,42,.08)}
      .logConversationAttachmentIcon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(36,121,255,.12);color:#2479ff;flex:0 0 auto}
      .logConversationAttachmentIcon svg{width:21px;height:21px}
      .logConversationAttachmentBody{min-width:0}
      .logConversationAttachmentTitle{display:block;font-size:12px;line-height:1.25;font-weight:950;color:inherit;overflow-wrap:anywhere}
      .logConversationAttachmentMeta{display:block;margin-top:3px;font-size:11px;line-height:1.2;font-weight:850;color:#7a8496}
      .logConversationAttachmentLink{display:inline-flex;align-items:center;justify-content:center;gap:5px;margin-top:8px;min-height:26px;border-radius:999px;padding:0 10px;background:#2479ff;color:#fff!important;text-decoration:none!important;font-size:11px;font-weight:950;box-shadow:0 8px 18px rgba(36,121,255,.22)}
      .logConversationAttachmentPhoto{grid-column:1/-1;display:block;width:100%;max-width:320px;max-height:230px;object-fit:cover;border-radius:12px;background:#111827;border:1px solid rgba(148,163,184,.28)}
      .logConversationBubble--operator .logConversationAttachmentCard{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.24);box-shadow:none}
      .logConversationBubble--operator .logConversationAttachmentIcon{background:rgba(255,255,255,.18);color:#fff}
      .logConversationBubble--operator .logConversationAttachmentTitle,
      .logConversationBubble--operator .logConversationAttachmentMeta{color:#fff!important}
      .logConversationBubble--operator .logConversationAttachmentLink{background:rgba(255,255,255,.18);color:#fff!important;box-shadow:none}
      body.logisticsDark .logConversationAttachmentCard,
      body.logisticaDark .logConversationAttachmentCard,
      .logisticsMain.is-dark .logConversationAttachmentCard{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);box-shadow:none}
      body.logisticsDark .logConversationAttachmentMeta,
      body.logisticaDark .logConversationAttachmentMeta,
      .logisticsMain.is-dark .logConversationAttachmentMeta{color:#a8b3c4}
    `;
    document.head.appendChild(style);
  }


  function ensureQuickReplyStyles() {
    const previousQuickReplyStyles = document.getElementById('logConversationQuickReplyStyles');
    if (previousQuickReplyStyles) previousQuickReplyStyles.remove();

    const style = document.createElement('style');
    style.id = 'logConversationQuickReplyStyles';
    style.textContent = `
      .logConversationReply{
        flex:0 0 auto!important;
        border-top:1px solid rgba(255,255,255,.08)!important;
        padding-top:10px!important;
        margin-top:10px!important;
      }

      .logConversationReplyBar{
        width:100%;
        display:grid;
        grid-template-columns:44px minmax(0,1fr)48px;
        gap:10px;
        align-items:center;
        min-height:64px;
        padding:8px;
        border-radius:999px;
        background:#262626;
        border:1px solid rgba(255,255,255,.12);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.22);
      }

      .logConversationReplyBar textarea{
        width:100%!important;
        min-width:0!important;
        min-height:44px!important;
        max-height:110px!important;
        resize:none!important;
        border:0!important;
        outline:none!important;
        box-shadow:none!important;
        background:transparent!important;
        color:#f8fafc!important;
        padding:12px 4px!important;
        font:inherit!important;
        font-size:14px!important;
        line-height:1.3!important;
        font-weight:800!important;
      }

      .logConversationReplyBar textarea::placeholder{
        color:rgba(248,250,252,.58)!important;
      }

      .logQuickReplyToggle,
      .logConversationReplySend{
        width:44px!important;
        height:44px!important;
        min-width:44px!important;
        border-radius:999px!important;
        display:grid!important;
        place-items:center!important;
        cursor:pointer!important;
        padding:0!important;
      }

      .logQuickReplyToggle{
        border:1px solid rgba(255,255,255,.14)!important;
        background:#303030!important;
        color:#ffffff!important;
      }

      .logConversationReplySend{
        border:0!important;
        background:#2479ff!important;
        color:#ffffff!important;
        box-shadow:0 10px 22px rgba(36,121,255,.25)!important;
      }

      .logQuickReplyToggle svg,
      .logConversationReplySend svg{
        width:21px;
        height:21px;
      }

      .logQuickReplyOverlay[hidden]{
        display:none!important;
      }

      .logQuickReplyOverlay{
        position:fixed;
        inset:0;
        z-index:999999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:28px;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        pointer-events:auto;
      }

      .logQuickReplyOverlay__scrim{
        position:absolute;
        inset:0;
        border:0!important;
        background:rgba(0,0,0,.10)!important;
        background-color:rgba(0,0,0,.10)!important;
        backdrop-filter:blur(7px) brightness(.88)!important;
        -webkit-backdrop-filter:blur(7px) brightness(.88)!important;
        box-shadow:none!important;
        cursor:pointer;
      }

      .logQuickReplyOverlay__dialog{
        position:relative;
        z-index:1;
        width:min(640px,calc(100vw - 56px));
        max-height:min(78vh,720px);
        display:flex;
        flex-direction:column;
        overflow:hidden;
        border-radius:16px;
        background:#1f1f1f;
        color:#ffffff;
        border:1px solid rgba(255,255,255,.14);
        box-shadow:0 30px 90px rgba(0,0,0,.42);
      }

      .logQuickReplyOverlay__head{
        flex:0 0 auto;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:16px;
        padding:16px 16px 12px;
        border-bottom:1px solid rgba(255,255,255,.10);
      }

      .logQuickReplyOverlay__head strong{
        display:block;
        color:#ffffff;
        font-size:17px;
        line-height:1.1;
        font-weight:950;
        letter-spacing:-.03em;
      }

      .logQuickReplyOverlay__head span{
        display:block;
        margin-top:5px;
        color:rgba(255,255,255,.62);
        font-size:12px;
        line-height:1.25;
        font-weight:750;
      }

      .logQuickReplyOverlay__actions{
        display:flex;
        gap:8px;
        align-items:center;
        flex:0 0 auto;
      }

      .logQuickReplyMiniBtn{
        min-height:34px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.14);
        background:#303030;
        color:#ffffff;
        padding:0 12px;
        font-size:12px;
        line-height:1;
        font-weight:950;
        cursor:pointer;
      }

      .logQuickReplyMiniBtn--primary{
        background:#2479ff;
        border-color:#2479ff;
        color:#ffffff;
      }

      .logQuickReplyOverlay__body{
        flex:1 1 auto;
        min-height:0;
        overflow-y:auto;
        padding:12px 16px 16px;
      }

      .logQuickReplyList{
        display:grid;
        gap:9px;
      }

      .logQuickReplyItem{
        width:100%;
        border:1px solid rgba(255,255,255,.12);
        background:#2a2a2a;
        color:#ffffff;
        border-radius:12px;
        padding:11px 12px;
        text-align:left;
        cursor:pointer;
        transition:background .16s ease,border-color .16s ease,transform .16s ease;
      }

      .logQuickReplyItem:hover{
        background:#313131;
        border-color:rgba(36,121,255,.48);
        transform:translateY(-1px);
      }

      .logQuickReplyItem strong{
        display:block;
        color:#ffffff;
        font-size:13px;
        line-height:1.15;
        font-weight:950;
        margin-bottom:5px;
      }

      .logQuickReplyItem span{
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
        color:rgba(255,255,255,.66);
        font-size:12px;
        line-height:1.3;
        font-weight:750;
      }

      .logQuickReplyCreate{
        display:grid;
        gap:9px;
        margin-bottom:12px;
        padding:12px;
        border-radius:12px;
        background:#272727;
        border:1px dashed rgba(36,121,255,.38);
      }

      .logQuickReplyCreate[hidden]{
        display:none!important;
      }

      .logQuickReplyCreate input,
      .logQuickReplyCreate textarea{
        width:100%;
        border:1px solid rgba(255,255,255,.14)!important;
        background:#151515!important;
        color:#ffffff!important;
        border-radius:10px!important;
        padding:10px 11px!important;
        font:inherit!important;
        font-size:13px!important;
        font-weight:800!important;
        outline:none!important;
        box-shadow:none!important;
      }

      .logQuickReplyCreate textarea{
        min-height:92px!important;
        resize:vertical!important;
      }

      .logQuickReplyCreate input::placeholder,
      .logQuickReplyCreate textarea::placeholder{
        color:rgba(255,255,255,.46)!important;
      }

      .logQuickReplyVars{
        color:rgba(255,255,255,.58);
        font-size:11px;
        line-height:1.35;
        font-weight:750;
      }

      .logQuickReplyEmpty{
        padding:14px;
        border-radius:12px;
        background:#2a2a2a;
        color:rgba(255,255,255,.62);
        font-size:13px;
        font-weight:850;
        text-align:center;
      }

      @media(max-width:760px){
        .logQuickReplyOverlay{
          align-items:flex-end;
          padding:14px;
        }

        .logQuickReplyOverlay__dialog{
          width:100%;
          max-height:82vh;
          border-radius:18px;
        }
      }

      /* Mensajes rápidos como popover local: no toca ni oscurece el slide */
      .logConversationReply{
        position:relative!important;
      }

      body .logQuickReplyOverlay,
      main.logisticsMain .logQuickReplyOverlay{
        position:absolute!important;
        inset:auto 0 calc(100% + 12px) 0!important;
        z-index:80!important;
        display:block!important;
        align-items:initial!important;
        justify-content:initial!important;
        padding:0!important;
        background:transparent!important;
        background-color:transparent!important;
        border:0!important;
        box-shadow:none!important;
        pointer-events:none!important;
      }

      body .logQuickReplyOverlay[hidden],
      main.logisticsMain .logQuickReplyOverlay[hidden]{
        display:none!important;
      }

      body .logQuickReplyOverlay__scrim,
      main.logisticsMain .logQuickReplyOverlay__scrim{
        display:none!important;
      }

      body .logQuickReplyOverlay__dialog,
      main.logisticsMain .logQuickReplyOverlay__dialog{
        width:min(640px,100%)!important;
        max-height:min(56vh,520px)!important;
        margin-left:auto!important;
        margin-right:0!important;
        pointer-events:auto!important;
      }

      @media(max-width:980px){
        body .logQuickReplyOverlay,
        main.logisticsMain .logQuickReplyOverlay{
          left:0!important;
          right:0!important;
          bottom:calc(100% + 10px)!important;
        }

        body .logQuickReplyOverlay__dialog,
        main.logisticsMain .logQuickReplyOverlay__dialog{
          width:100%!important;
          max-height:58vh!important;
          border-radius:16px!important;
        }
      }

      body .logQuickReplyOverlay,
      main.logisticsMain .logQuickReplyOverlay{
        background:transparent!important;
        background-color:transparent!important;
        border:0!important;
        box-shadow:none!important;
      }

      body .logQuickReplyOverlay__scrim,
      main.logisticsMain .logQuickReplyOverlay__scrim{
        background:rgba(0,0,0,.10)!important;
        background-color:rgba(0,0,0,.10)!important;
        backdrop-filter:blur(7px) brightness(.88)!important;
        -webkit-backdrop-filter:blur(7px) brightness(.88)!important;
        border:0!important;
        box-shadow:none!important;
      }
    `;
    document.head.appendChild(style);
  }


  function panel() {
    const main = root();
    return main ? main.querySelector('[data-log-panel="conversaciones"]') : null;
  }

  function ensureToolbarBadge() {
    const p = panel();
    const toolbar = p?.querySelector('.logConversationsToolbar');
    if (!toolbar || toolbar.querySelector('#logConversationsLiveBadge')) return;

    const badge = document.createElement('span');
    badge.id = 'logConversationsLiveBadge';
    badge.className = 'logConversationsLiveBadge is-demo';
    badge.textContent = 'Modo demo';
    toolbar.prepend(badge);
  }

  function setLiveBadge(text, isLive) {
    const badge = panel()?.querySelector('#logConversationsLiveBadge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = 'logConversationsLiveBadge' + (isLive ? '' : ' is-demo');
  }

  function setSidebarNotification(count) {
    const sidebar = document.querySelector('[data-include="sidebar"]') || document.querySelector('.sidebar');
    if (!sidebar) return;

    const link = Array.from(sidebar.querySelectorAll('a.navSubItem')).find(item => {
      const href = item.getAttribute('href') || '';
      const label = item.textContent || '';
      return href.includes('/panel/logistica/logistica.html') || label.toLowerCase().includes('logística') || label.toLowerCase().includes('logistica');
    });

    if (!link) return;

    let badge = link.querySelector('.protocolSidebarNotify');
    if (count <= 0) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'protocolSidebarNotify';
      link.appendChild(badge);
    }

    badge.textContent = count > 99 ? '99+' : String(count);
    badge.setAttribute('aria-label', `${count} mensajes nuevos de clientes`);
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
      setSidebarNotification(0);
      return;
    }

    setSidebarNotification(attentionCount(items));
    const visibleItems = items.slice(0, state.tableLimit);

    tbody.innerHTML = visibleItems.map(item => {
      const unread = unreadCount(item);
      const needsAttention = unread > 0;
      const lastMessageDate = messageDateParts(item.last_message_at);

      return `
        <tr class="${needsAttention ? 'logConversationRow--attention' : ''}" data-log-row-open="${esc(item.conversation_id)}">
          <td><div class="logConversationAlertCell">${needsAttention ? `<span class="logConversationAlertBadge">${unread}</span>` : ''}<div><strong class="logClamp logClampStrong">${esc(item.conversation_id)}</strong><span class="logClampMuted">${esc(shortDate(item.created_at))}</span></div></div></td>
          <td><strong class="logClamp logClampStrong">${esc(item.customer_name)}</strong><span class="logClamp logClampMuted">${esc(item.customer_email)}</span>${verificationBadge(item)}</td>
          <td><div class="logConversationOrder"><strong class="logClamp logClampStrong">${esc(item.tracking_id)} · ${esc(item.shopify_order_name)}</strong><em>${esc(item.product_name)}</em><em>${esc(item.shipping_address)}</em></div></td>
          <td><strong class="logClamp logClampStrong">${esc(item.shipping_status)}</strong><span class="logClamp logClampMuted">${esc(item.logistics_status)}</span><span class="logClamp logClampMuted">${esc(item.payment_status)}</span></td>
          <td><strong class="logClamp logClampStrong">${esc(item.reason)}</strong><span class="logClampMuted">Prioridad ${esc(priorityLabels[item.priority] || item.priority)}</span></td>
          <td><div class="logConversationMessage logClamp">${esc(item.last_message)}</div><div class="logConversationMessageMeta">${needsAttention ? '<em class="logConversationNeedsReply">Requiere respuesta</em>' : ''}<span class="logConversationRelative logConversationRelative--${esc(lastMessageDate.cls)}">${esc(lastMessageDate.label)}</span>${lastMessageDate.time ? `<span class="logConversationTime">${esc(lastMessageDate.time)}</span>` : ''}</div><span class="logConversationCount">${Number(item.messages_count || 0)} mensajes</span></td>
          <td>${statusBadge(item)}</td>
          <td>${responsibleBadge(item)}</td>
          <td><button class="logActionBtn logActionBtn--ghost" type="button" data-log-open-conversation="${esc(item.conversation_id)}" data-log-open-conversation-real="1">Ver más <span class="logActionArrow">→</span></button></td>
        </tr>
      `;
    }).join('') + (items.length > visibleItems.length ? `
      <tr class="logConversationMoreRow">
        <td colspan="9"><button class="logConversationMoreBtn" type="button" data-log-table-more="1">Mostrar 5 conversaciones más · ${items.length - visibleItems.length} restantes</button></td>
      </tr>
    ` : '');
  }

  async function loadConversations(options) {
    const config = options || {};
    const silent = Boolean(config.silent);
    const p = panel();
    if (!p) return;

    state.status = p.querySelector('#logConversationsStatus')?.value || 'todos';
    state.query = (p.querySelector('#logConversationsSearch')?.value || '').trim();

    if (!silent) setLiveBadge('Sincronizando...', true);

    try {
      const data = await rpc('protocol_support_conversations', {
        input_status: state.status,
        input_query: state.query,
        input_limit: state.limit,
        input_offset: state.offset
      });

      state.items = Array.isArray(data?.items) ? data.items : [];
      state.visibleItems = mergeConversationRows(state.items);
      state.summary = buildVisibleSummary(state.visibleItems);
      state.isLive = true;

      renderSummary(state.summary);
      renderTable(state.visibleItems);
      setLiveBadge('Supabase activo', true);
    } catch (error) {
      console.warn('[Conversaciones Supabase]', error);
      state.isLive = false;
      setLiveBadge('Modo demo', false);
    }
  }

  function ensureSlide() {
    const main = root();
    if (!main) return null;

    let slide = main.querySelector('#logConversationSlide');
    if (slide) return slide;

    slide = document.createElement('section');
    slide.className = 'logConversationSlide';
    slide.id = 'logConversationSlide';
    slide.setAttribute('aria-hidden', 'true');
    slide.innerHTML = `
      <button class="logConversationSlide__overlay" id="logConversationSlideOverlay" type="button" aria-label="Cerrar conversación"></button>
      <aside class="logConversationSlide__panel" role="dialog" aria-modal="true" aria-label="Detalle de conversación">
        <header class="logConversationSlide__header">
          <button class="logConversationSlide__close" id="logConversationSlideClose" type="button" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18 9 12l6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="logConversationSlide__title"><strong id="logConversationSlideTitle">Conversación</strong><span id="logConversationSlideSubtitle">Soporte logístico</span></div>
          <div style="width:38px" aria-hidden="true"></div>
        </header>
        <div class="logConversationSlide__content" id="logConversationSlideContent"></div>
      </aside>
    `;
    main.appendChild(slide);
    return slide;
  }

  function openShell(id) {
    const main = root();
    const slide = ensureSlide();
    const content = main?.querySelector('#logConversationSlideContent');
    if (!slide || !content) return;

    main.querySelector('#logConversationSlideTitle').textContent = id;
    main.querySelector('#logConversationSlideSubtitle').textContent = 'Cargando conversación real desde Supabase';
    content.innerHTML = '<div class="logConversationSlide__loading">Consultando detalle de conversación...</div>';

    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('logSlideLock');
    document.body.classList.add('logSlideLock');
  }

  function closeSlide() {
    const slide = root()?.querySelector('#logConversationSlide');
    if (!slide) return;
    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    state.activeConversationId = '';
    state.detailFingerprint = '';
    state.detailAttachmentsByMessageId = {};
    document.documentElement.classList.remove('logSlideLock');
    document.body.classList.remove('logSlideLock');
  }


  function supportConversationAttachmentsEndpoint() {
    const c = cfg();
    const baseUrl = c?.url ? String(c.url).replace(/\/$/, '') : 'https://cuuzsbhpjmjbbnghtiny.supabase.co';
    return `${baseUrl}/functions/v1/support-list-conversation-attachments`;
  }

  function messageId(message) {
    return String(message?.message_id || message?.id || '').trim();
  }

  function attachmentsForMessage(message) {
    const id = messageId(message);
    const map = state.detailAttachmentsByMessageId || {};
    const list = id ? map[id] : null;
    return Array.isArray(list) ? list : [];
  }

  function isGenericAttachmentMessage(message) {
    const body = String(message?.message_body || '').trim();
    return /^Documento adjunto:/i.test(body) || /^Foto enviada desde cámara\.?$/i.test(body);
  }

  function attachmentKindLabel(attachment) {
    const type = String(attachment?.attachment_type || '').trim();
    const mime = String(attachment?.mime_type || '').trim().toLowerCase();

    if (type === 'camera_photo') return 'Foto';
    if (mime === 'application/pdf') return 'PDF';
    if (mime.startsWith('text/')) return 'Documento';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Planilla';
    if (mime.includes('word')) return 'Documento';
    return 'Archivo';
  }

  function attachmentIcon(type) {
    if (type === 'camera_photo') {
      return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8.5h2.4L9 6.5h6l1.6 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="2"/></svg>';
    }

    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 3.5H13l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 3.5V8h4" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.8 13h5.4M8.8 16h5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function renderMessageText(message) {
    const attachments = attachmentsForMessage(message);
    if (attachments.length && isGenericAttachmentMessage(message)) return '';

    const body = String(message?.message_body || '').trim();
    return body ? `<p>${esc(body)}</p>` : '';
  }

  function renderAttachmentCards(message) {
    const attachments = attachmentsForMessage(message);
    if (!attachments.length) return '';

    return `<div class="logConversationAttachmentList">${attachments.map(attachment => {
      const type = String(attachment?.attachment_type || '').trim();
      const title = attachment?.original_file_name || attachment?.file_name || attachment?.caption || 'Adjunto';
      const kind = attachmentKindLabel(attachment);
      const size = attachment?.file_size_label || '';
      const meta = [kind, size].filter(Boolean).join(' · ');
      const signedUrl = String(attachment?.signed_url || '').trim();
      const linkLabel = type === 'camera_photo' ? 'Abrir foto' : 'Abrir documento';

      const photo = type === 'camera_photo' && signedUrl
        ? `<img class="logConversationAttachmentPhoto" src="${esc(signedUrl)}" alt="Foto enviada por el cliente" loading="lazy">`
        : '';

      const link = signedUrl
        ? `<a class="logConversationAttachmentLink" href="${esc(signedUrl)}" target="_blank" rel="noopener noreferrer">${esc(linkLabel)} ↗</a>`
        : '';

      return `
        <div class="logConversationAttachmentCard">
          <span class="logConversationAttachmentIcon">${attachmentIcon(type)}</span>
          <span class="logConversationAttachmentBody">
            <strong class="logConversationAttachmentTitle">${esc(title)}</strong>
            <span class="logConversationAttachmentMeta">${esc(meta)}</span>
            ${link}
          </span>
          ${photo}
        </div>
      `;
    }).join('')}</div>`;
  }

  async function loadConversationAttachments(conversationId, messages) {
    const id = String(conversationId || '').trim();
    const messageIds = (Array.isArray(messages) ? messages : [])
      .map(messageId)
      .filter(Boolean);

    if (!id || !messageIds.length) return {};

    try {
      const response = await fetch(supportConversationAttachmentsEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: id,
          message_ids: messageIds
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok !== true) {
        throw new Error(data?.message || 'No se pudieron leer los adjuntos.');
      }

      return data.attachments_by_message_id || {};
    } catch (error) {
      console.warn('[Conversaciones Supabase · Adjuntos]', error);
      return {};
    }
  }


  function readCustomQuickReplies() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUICK_REPLY_CUSTOM_STORAGE_KEY) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter(item => item && item.title && item.body).map(item => ({
            title: String(item.title || '').trim(),
            body: String(item.body || '').trim(),
            custom: true
          }))
        : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustomQuickReplies(list) {
    try {
      localStorage.setItem(QUICK_REPLY_CUSTOM_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (error) {
      console.warn('[Conversaciones Supabase · Mensajes rápidos]', error);
    }
  }

  function allQuickReplies() {
    return DEFAULT_QUICK_REPLIES.concat(readCustomQuickReplies());
  }

  function plain(value, fallback) {
    const clean = String(value === null || value === undefined ? '' : value).trim();
    return clean || fallback || '';
  }

  function quickReplyContext(item) {
    const conversation = item || state.detailConversation || {};
    const domicilio = [
      conversation.shipping_address,
      conversation.locality,
      conversation.province,
      conversation.postal_code
    ].filter(Boolean).join(', ');

    return {
      nombre: plain(conversation.customer_name, 'Cliente'),
      pedido: plain(conversation.shopify_order_name, plain(conversation.tracking_id, 'tu pedido')),
      producto_comprado: plain(conversation.product_name, plain(conversation.sku, 'tu producto')),
      domicilio_entrega: plain(domicilio, 'el domicilio informado'),
      localidad: plain(conversation.locality, ''),
      estado_envio: plain(conversation.shipping_status || conversation.logistics_status, 'en revisión'),
      monto_a_cobrar: conversation.amount_to_collect ? money(conversation.amount_to_collect) : ''
    };
  }

  function applyQuickReplyTemplate(template, item) {
    const context = quickReplyContext(item);
    return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, key) {
      return context[key] || '';
    }).replace(/\s+([,.])/g, '$1').trim();
  }

  function quickReplyIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6.8A3.8 3.8 0 0 1 8.8 3h6.4A3.8 3.8 0 0 1 19 6.8v4.9a3.8 3.8 0 0 1-3.8 3.8h-2.1L9.7 19v-3.5h-.9A3.8 3.8 0 0 1 5 11.7V6.8Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 8.5h6M9 11.2h4.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  }

  function renderQuickReplyItems(item) {
    const replies = allQuickReplies();

    if (!replies.length) {
      return '<div class="logQuickReplyEmpty">Todavía no hay mensajes rápidos.</div>';
    }

    return replies.map(function (reply, index) {
      const preview = applyQuickReplyTemplate(reply.body, item);
      return [
        '<button class="logQuickReplyItem" type="button" data-log-quick-reply-index="' + index + '">',
          '<strong>' + esc(reply.title) + '</strong>',
          '<span>' + esc(preview) + '</span>',
        '</button>'
      ].join('');
    }).join('');
  }

  function renderQuickReplyPanel(item) {
    return [
      '<div class="logQuickReplyOverlay" data-log-quick-panel hidden>',
        '<button class="logQuickReplyOverlay__scrim" type="button" data-log-quick-close aria-label="Cerrar mensajes rápidos"></button>',
        '<section class="logQuickReplyOverlay__dialog" role="dialog" aria-modal="true" aria-label="Mensajes rápidos">',
          '<header class="logQuickReplyOverlay__head">',
            '<div>',
              '<strong>Mensajes rápidos</strong>',
              '<span>Seleccioná una respuesta para insertarla en el campo de escritura.</span>',
            '</div>',
            '<div class="logQuickReplyOverlay__actions">',
              '<button class="logQuickReplyMiniBtn logQuickReplyMiniBtn--primary" type="button" data-log-quick-create-open>Crear</button>',
              '<button class="logQuickReplyMiniBtn" type="button" data-log-quick-close>Cerrar</button>',
            '</div>',
          '</header>',

          '<div class="logQuickReplyOverlay__body">',
            '<div class="logQuickReplyCreate" data-log-quick-create-form hidden>',
              '<input type="text" data-log-quick-title placeholder="Título del mensaje rápido">',
              '<textarea data-log-quick-body placeholder="Escribí el mensaje. Ejemplo: Hola, {nombre}. Tu pedido {pedido} ya se encuentra en camino."></textarea>',
              '<div class="logQuickReplyVars">Llaves disponibles: {nombre}, {pedido}, {producto_comprado}, {domicilio_entrega}, {localidad}, {estado_envio}, {monto_a_cobrar}</div>',
              '<div class="logQuickReplyOverlay__actions">',
                '<button class="logQuickReplyMiniBtn logQuickReplyMiniBtn--primary" type="button" data-log-quick-create-save>Guardar mensaje</button>',
                '<button class="logQuickReplyMiniBtn" type="button" data-log-quick-create-cancel>Cancelar</button>',
              '</div>',
            '</div>',

            '<div class="logQuickReplyList" data-log-quick-list>',
              renderQuickReplyItems(item),
            '</div>',
          '</div>',
        '</section>',
      '</div>'
    ].join('');
  }

  function quickFormFromEvent(event) {
    return event.target.closest('[data-log-conversation-reply-real]');
  }

  function setQuickPanelOpen(form, open) {
    const panel = form ? form.querySelector('[data-log-quick-panel]') : null;
    if (!panel) return;

    panel.hidden = !open;

    if (open) {
      refreshQuickReplyList(form);
    } else {
      setQuickCreateOpen(form, false);
    }
  }

  function refreshQuickReplyList(form) {
    const list = form ? form.querySelector('[data-log-quick-list]') : null;
    if (!list) return;
    list.innerHTML = renderQuickReplyItems(state.detailConversation || {});
  }

  function insertQuickReply(form, index) {
    const textarea = form ? form.querySelector('[data-log-reply-textarea]') : null;
    const reply = allQuickReplies()[Number(index)];
    if (!textarea || !reply) return;

    textarea.value = applyQuickReplyTemplate(reply.body, state.detailConversation || {});
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    setQuickPanelOpen(form, false);
  }

  function setQuickCreateOpen(form, open) {
    const box = form ? form.querySelector('[data-log-quick-create-form]') : null;
    if (!box) return;
    box.hidden = !open;
  }

  function saveCreatedQuickReply(form) {
    const titleInput = form ? form.querySelector('[data-log-quick-title]') : null;
    const bodyInput = form ? form.querySelector('[data-log-quick-body]') : null;
    const title = String(titleInput?.value || '').trim();
    const body = String(bodyInput?.value || '').trim();

    if (!body) {
      alert('Escribí el cuerpo del mensaje rápido antes de guardarlo.');
      return;
    }

    const custom = readCustomQuickReplies();
    custom.push({
      title: title || body.slice(0, 42),
      body
    });

    saveCustomQuickReplies(custom);

    if (titleInput) titleInput.value = '';
    if (bodyInput) bodyInput.value = '';

    setQuickCreateOpen(form, false);
    refreshQuickReplyList(form);
  }


  function bubble(message) {
    const type = message.sender_type === 'operator' ? 'operator' : message.sender_type === 'system' ? 'system' : 'customer';
    return `<div class="logConversationBubble logConversationBubble--${type}"><strong>${esc(message.sender_name || message.sender_type)}</strong>${renderMessageText(message)}${renderAttachmentCards(message)}<small>${esc(shortDate(message.created_at))}</small></div>`;
  }

  function dataItem(label, value) {
    return `<div class="logConversationDataItem"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function isChatNearBottom() {
    const chat = root()?.querySelector('.logConversationChat');
    if (!chat) return true;
    return chat.scrollHeight - chat.scrollTop - chat.clientHeight < 120;
  }

  function scrollChatToBottom() {
    const chat = root()?.querySelector('.logConversationChat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function operatorHasDraft() {
    const textarea = root()?.querySelector('[data-log-conversation-reply-real] [data-log-reply-textarea]');
    return Boolean(textarea && textarea.value.trim());
  }

  function renderDetail(payload, options) {
    const config = options || {};
    const main = root();
    const content = main?.querySelector('#logConversationSlideContent');
    if (!content) return;

    if (!payload || payload.status === 'not_found' || !payload.conversation) {
      content.innerHTML = `<div class="logConversationSlide__error">${esc(payload?.message || 'No se pudo abrir la conversación.')}</div>`;
      return;
    }

    const item = payload.conversation;
    state.detailConversation = item;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    state.detailAttachmentsByMessageId = payload.attachments_by_message_id && typeof payload.attachments_by_message_id === 'object'
      ? payload.attachments_by_message_id
      : {};
    const shouldStick = config.forceScroll ? true : isChatNearBottom();

    main.querySelector('#logConversationSlideTitle').textContent = item.conversation_id;
    main.querySelector('#logConversationSlideSubtitle').textContent = `${item.customer_name || 'Cliente'} · ${item.tracking_id}`;

    content.innerHTML = `
      <div class="logConversationStatusRow">
        ${statusBadge(item)}
        <span class="logStatusPill ${item.priority === 'alta' ? 'logStatusPill--red' : item.priority === 'media' ? 'logStatusPill--orange' : 'logStatusPill--gray'}"><span class="logStatusIcon">!</span>Prioridad ${esc(priorityLabels[item.priority] || item.priority)}</span>
        ${verificationBadge(item).replace('Verificada', 'Verificada por tracking + email')}
      </div>
      <div class="logConversationDetailGrid">
        <section class="logConversationBox logConversationBox--chat">
          <div class="logConversationBox__head"><div><strong>Historial de conversación</strong><span>Mensajes reales desde support_messages</span></div></div>
          <div class="logConversationChat">${messages.map(bubble).join('') || '<div class="logConversationLiveEmpty">Esta conversación todavía no tiene mensajes.</div>'}</div>
          <form class="logConversationReply" data-log-conversation-reply-real="${esc(item.conversation_id)}">
            <div class="logConversationReplyBar">
              <button class="logQuickReplyToggle" type="button" data-log-quick-replies-toggle aria-label="Abrir mensajes rápidos">${quickReplyIcon()}</button>
              <textarea data-log-reply-textarea placeholder="Escribir respuesta para el cliente..."></textarea>
              <button class="logConversationReplySend" type="submit" aria-label="Enviar respuesta">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            ${renderQuickReplyPanel(item)}
          </form>
        </section>
        <aside class="logConversationBox logConversationBox--data">
          <div class="logConversationBox__head"><div><strong>Datos de compra</strong><span>Contexto operativo asociado</span></div></div>
          <div class="logConversationDataList">
            ${dataItem('Cliente', item.customer_name)}${dataItem('Email', item.customer_email)}${dataItem('Teléfono', item.customer_phone)}${dataItem('Tracking', item.tracking_id)}${dataItem('Pedido Shopify', item.shopify_order_name)}${dataItem('Producto', item.product_name)}${dataItem('SKU / variante', `${item.sku || '—'} · ${item.variant_name || '—'}`)}${dataItem('Dirección', item.shipping_address)}${dataItem('Localidad / provincia', `${item.locality || '—'} · ${item.province || '—'}`)}${dataItem('Código postal', item.postal_code)}${dataItem('Pago', item.payment_status)}${dataItem('Monto a cobrar', money(item.amount_to_collect))}${dataItem('Estado envío', item.shipping_status)}${dataItem('Estado logístico', item.logistics_status)}${dataItem('Entrega estimada', item.estimated_delivery)}${dataItem('Motivo', item.reason)}${dataItem('Responsable', item.assigned_to || 'Sin asignar')}
          </div>
        </aside>
      </div>
    `;

    window.requestAnimationFrame(function () {
      if (shouldStick) scrollChatToBottom();
    });
  }

  async function loadConversationDetail(id, options) {
    try {
      const data = await rpc('protocol_support_conversation_detail', {
        input_conversation_id: id
      });

      const fingerprint = detailFingerprint(data);
      if (options?.silent && fingerprint && fingerprint === state.detailFingerprint) return true;
      if (options?.silent && operatorHasDraft()) return true;

      data.attachments_by_message_id = await loadConversationAttachments(id, data?.messages || []);
      state.detailFingerprint = fingerprint;
      renderDetail(data, options || {});
      return true;
    } catch (error) {
      console.warn('[Detalle conversación Supabase]', error);
      if (!options?.silent) renderDetail({ status: 'error', message: 'No se pudo consultar el detalle real en Supabase.' });
      return false;
    }
  }

  async function openConversation(id) {
    state.activeConversationId = id;
    state.detailFingerprint = '';
    state.detailAttachmentsByMessageId = {};
    openShell(id);
    await loadConversationDetail(id, { forceScroll: true });
  }

  function startPolling() {
    if (state.listPollTimer) window.clearInterval(state.listPollTimer);
    if (state.detailPollTimer) window.clearInterval(state.detailPollTimer);

    state.listPollTimer = window.setInterval(function () {
      if (document.hidden) return;
      loadConversations({ silent: true });
    }, LIST_POLLING_MS);

    state.detailPollTimer = window.setInterval(function () {
      if (document.hidden || !state.activeConversationId) return;
      loadConversationDetail(state.activeConversationId, { silent: true, forceScroll: false });
    }, DETAIL_POLLING_MS);
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.logisticaConversacionesSupabaseBound === '1') return;
    main.dataset.logisticaConversacionesSupabaseBound = '1';

    main.addEventListener('click', event => {
      const more = event.target.closest('[data-log-table-more]');
      if (more) {
        event.preventDefault();
        event.stopPropagation();
        state.tableLimit += TABLE_PAGE_SIZE;
        renderTable(state.visibleItems);
        return;
      }

      const quickForm = quickFormFromEvent(event);

      if (event.target.closest('[data-log-quick-replies-toggle]') && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        const panel = quickForm.querySelector('[data-log-quick-panel]');
        setQuickPanelOpen(quickForm, !panel || panel.hidden);
        return;
      }

      const quickItem = event.target.closest('[data-log-quick-reply-index]');
      if (quickItem && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        insertQuickReply(quickForm, quickItem.dataset.logQuickReplyIndex);
        return;
      }

      if (event.target.closest('[data-log-quick-close]') && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        setQuickPanelOpen(quickForm, false);
        return;
      }

      if (event.target.closest('[data-log-quick-create-open]') && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        setQuickCreateOpen(quickForm, true);
        return;
      }

      if (event.target.closest('[data-log-quick-create-cancel]') && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        setQuickCreateOpen(quickForm, false);
        return;
      }

      if (event.target.closest('[data-log-quick-create-save]') && quickForm) {
        event.preventDefault();
        event.stopPropagation();
        saveCreatedQuickReply(quickForm);
        return;
      }

      const open = event.target.closest('[data-log-open-conversation]');
      const row = event.target.closest('[data-log-row-open]');
      const id = open?.dataset.logOpenConversation || row?.dataset.logRowOpen;

      if (id) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openConversation(id);
        return;
      }

      if (event.target.closest('#logConversationSlideOverlay') || event.target.closest('#logConversationSlideClose')) {
        closeSlide();
      }
    }, true);

    main.addEventListener('input', event => {
      if (!event.target.closest('#logConversationsSearch')) return;
      window.clearTimeout(window.__logConversationsLiveSearchTimer);
      window.__logConversationsLiveSearchTimer = window.setTimeout(() => {
        state.tableLimit = TABLE_PAGE_SIZE;
        loadConversations({ silent: false });
      }, 260);
    });

    main.addEventListener('change', event => {
      if (event.target.closest('#logConversationsStatus')) {
        state.tableLimit = TABLE_PAGE_SIZE;
        loadConversations({ silent: false });
      }
    });

    main.addEventListener('submit', event => {
      const form = event.target.closest('[data-log-conversation-reply-real]');
      if (!form) return;
      event.preventDefault();
      alert('Próxima fase: RPC protocol_support_send_message para insertar en support_messages y actualizar la conversación.');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSlide();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        loadConversations({ silent: true });
        if (state.activeConversationId) loadConversationDetail(state.activeConversationId, { silent: true });
      }
    });

    window.addEventListener('pagehide', function () {
      if (state.listPollTimer) window.clearInterval(state.listPollTimer);
      if (state.detailPollTimer) window.clearInterval(state.detailPollTimer);
    });
  }

  function boot() {
    const main = root();
    if (!main) return;

    if (window[READY_FLAG] && main.dataset.logisticaConversacionesSupabaseBooted === '1') return;
    window[READY_FLAG] = true;
    main.dataset.logisticaConversacionesSupabaseBooted = '1';

    ensureStyles();
    ensureAttachmentStyles();
    ensureQuickReplyStyles();
    ensureToolbarBadge();
    ensureSlide();
    bind();
    loadConversations({ silent: false });
    startPolling();
  }

  window.ProtocolLogisticaSupportRefresh = function () {
    loadConversations({ silent: true });
    if (state.activeConversationId) loadConversationDetail(state.activeConversationId, { silent: true, forceScroll: true });
  };

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
