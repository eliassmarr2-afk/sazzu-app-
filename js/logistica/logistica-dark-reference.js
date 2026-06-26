/* ==========================================================
   Protocol Data · Logística Dark Reference Runtime
   Capa final: replica el mock dark, compacta proporciones y corrige hover blanco.
   Solo actúa cuando body[data-page="logistica"].logistica-dark está activo.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkReferenceRuntimeStyles';
  const HOVER_CLASS = 'logDarkRowHover';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function isLogisticaDark() {
    return isLogisticaPage() && document.body.classList.contains('logistica-dark');
  }

  const css = `
    body[data-page="logistica"].logistica-dark{
      background:#202020!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .appShell,
    body[data-page="logistica"].logistica-dark .bodyGrid,
    body[data-page="logistica"].logistica-dark .logisticsMain{
      background:linear-gradient(135deg,#1b1b1b 0%,#262626 58%,#202020 100%)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logisticsMain{
      padding:24px 24px 26px!important;
      font-size:14px!important;
    }

    /* Sidebar */
    body[data-page="logistica"].logistica-dark .sidebar{
      background:linear-gradient(180deg,#151515 0%,#1c1c1c 100%)!important;
      border-right:1px solid rgba(255,255,255,.08)!important;
      box-shadow:14px 0 32px rgba(0,0,0,.26)!important;
    }

    body[data-page="logistica"].logistica-dark .sidebar::before,
    body[data-page="logistica"].logistica-dark .sidebar::after{
      opacity:0!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .navSubItem,
    body[data-page="logistica"].logistica-dark .navHero,
    body[data-page="logistica"].logistica-dark .sidebar__account{
      background:transparent!important;
      color:#bdbdbd!important;
      border-color:transparent!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .navSubItem:hover,
    body[data-page="logistica"].logistica-dark .navHero:hover{
      background:rgba(255,255,255,.075)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .navSubItem.is-active-sub{
      background:rgba(36,121,255,.20)!important;
      color:#9dc2ff!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .navSubItem__txt,
    body[data-page="logistica"].logistica-dark .navSubItem__ico,
    body[data-page="logistica"].logistica-dark .navHero__chev,
    body[data-page="logistica"].logistica-dark .navGroup__name,
    body[data-page="logistica"].logistica-dark .navGroup__kicker,
    body[data-page="logistica"].logistica-dark .navGroup__caret{
      color:inherit!important;
    }

    /* Header */
    body[data-page="logistica"].logistica-dark .logisticsHeader{
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      color:#ececec!important;
      margin-bottom:22px!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__title{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      color:#ffffff!important;
      font-size:21px!important;
      line-height:1!important;
      font-weight:850!important;
      letter-spacing:-.03em!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__title::after{
      content:""!important;
      width:8px!important;
      height:8px!important;
      border-radius:999px!important;
      background:#90f2b5!important;
      box-shadow:0 0 13px rgba(144,242,181,.82)!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__sub{
      color:#c9c9c9!important;
      font-size:15px!important;
      font-weight:400!important;
    }

    body[data-page="logistica"].logistica-dark .logConnectionBadge,
    body[data-page="logistica"].logistica-dark .logConversationsLiveBadge{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      min-height:36px!important;
      padding:0 13px!important;
      border-radius:999px!important;
      background:rgba(80,190,128,.18)!important;
      border:1px solid rgba(111,232,166,.24)!important;
      color:#8fe6b4!important;
      box-shadow:0 0 18px rgba(111,232,166,.10)!important;
      font-size:13px!important;
      font-weight:750!important;
      white-space:nowrap!important;
    }

    body[data-page="logistica"].logistica-dark .logConnectionBadge::before,
    body[data-page="logistica"].logistica-dark .logConversationsLiveBadge::before{
      content:""!important;
      width:9px!important;
      height:9px!important;
      border-radius:999px!important;
      background:#79e6a6!important;
      box-shadow:0 0 11px rgba(121,230,166,.72)!important;
    }

    body[data-page="logistica"].logistica-dark .logThemeToggle,
    body[data-page="logistica"].logistica-dark .btn.btn--secondary,
    body[data-page="logistica"].logistica-dark #logBtnSyncSupabase,
    body[data-page="logistica"].logistica-dark #logBtnNewRule{
      min-height:38px!important;
      border-radius:10px!important;
      background:rgba(255,255,255,.045)!important;
      border:1px solid rgba(255,255,255,.15)!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-size:15px!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logThemeToggle:hover,
    body[data-page="logistica"].logistica-dark .btn:hover,
    body[data-page="logistica"].logistica-dark #logBtnSyncSupabase:hover,
    body[data-page="logistica"].logistica-dark #logBtnNewRule:hover{
      background:rgba(255,255,255,.09)!important;
      border-color:rgba(255,255,255,.24)!important;
      transform:none!important;
    }

    /* KPIs */
    body[data-page="logistica"].logistica-dark .logisticsHero{
      gap:14px!important;
      margin-bottom:24px!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard,
    body[data-page="logistica"].logistica-dark .logCard,
    body[data-page="logistica"].logistica-dark .logConversationMetric,
    body[data-page="logistica"].logistica-dark .logPedidosMetric{
      background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))!important;
      border:1px solid rgba(255,255,255,.16)!important;
      border-radius:9px!important;
      box-shadow:none!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard{
      padding:15px 16px!important;
      min-height:96px!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard--primary{
      background:linear-gradient(135deg,rgba(36,121,255,.13),rgba(255,255,255,.035))!important;
      border-color:rgba(126,166,255,.35)!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard__label,
    body[data-page="logistica"].logistica-dark .logHeroCard small{
      color:#d0d0d0!important;
      font-weight:500!important;
      font-size:13px!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard strong{
      color:#ffffff!important;
      font-size:31px!important;
      font-weight:780!important;
      letter-spacing:-.04em!important;
    }

    /* Tabs lineales */
    body[data-page="logistica"].logistica-dark .logisticsTabs{
      display:flex!important;
      gap:32px!important;
      align-items:flex-end!important;
      padding:0 0 11px!important;
      margin:0 0 28px!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      overflow-x:auto!important;
    }

    body[data-page="logistica"].logistica-dark .logTab{
      min-height:31px!important;
      padding:0!important;
      background:transparent!important;
      border:0!important;
      border-radius:0!important;
      color:#bdbdbd!important;
      box-shadow:none!important;
      font-size:15px!important;
      font-weight:500!important;
      position:relative!important;
    }

    body[data-page="logistica"].logistica-dark .logTab:hover{
      background:transparent!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logTab.is-active{
      background:transparent!important;
      color:#ffffff!important;
      border:0!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logTab.is-active::after{
      content:""!important;
      position:absolute!important;
      left:0!important;
      right:0!important;
      bottom:-12px!important;
      height:2px!important;
      border-radius:99px!important;
      background:#ffffff!important;
    }

    /* Panel conversaciones */
    body[data-page="logistica"].logistica-dark .logCard{
      padding:22px 18px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationsCard,
    body[data-page="logistica"].logistica-dark [data-log-panel="conversaciones"] .logCard{
      padding:22px 18px 0!important;
      border-radius:9px!important;
      background:rgba(255,255,255,.035)!important;
      border:1px solid rgba(255,255,255,.14)!important;
    }

    body[data-page="logistica"].logistica-dark .u-sectionLabel,
    body[data-page="logistica"].logistica-dark .logCard__head .u-sectionLabel{
      color:#bdbdbd!important;
      letter-spacing:.14em!important;
      font-size:11px!important;
      font-weight:800!important;
    }

    body[data-page="logistica"].logistica-dark .logCard__head h2{
      color:#ffffff!important;
      font-size:23px!important;
      font-weight:780!important;
      letter-spacing:-.04em!important;
    }

    body[data-page="logistica"].logistica-dark .logInput,
    body[data-page="logistica"].logistica-dark .logSelect,
    body[data-page="logistica"].logistica-dark .logTextarea,
    body[data-page="logistica"].logistica-dark input,
    body[data-page="logistica"].logistica-dark select,
    body[data-page="logistica"].logistica-dark textarea{
      background:rgba(255,255,255,.035)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      border-radius:10px!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-weight:400!important;
    }

    body[data-page="logistica"].logistica-dark input::placeholder,
    body[data-page="logistica"].logistica-dark textarea::placeholder{
      color:#8f8f8f!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationsSummary,
    body[data-page="logistica"].logistica-dark .logPedidosSummary{
      display:grid!important;
      grid-template-columns:repeat(5,minmax(0,1fr))!important;
      gap:12px!important;
      margin:16px 0 14px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric,
    body[data-page="logistica"].logistica-dark .logPedidosMetric{
      min-height:64px!important;
      padding:12px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric span,
    body[data-page="logistica"].logistica-dark .logPedidosMetric span{
      color:#bdbdbd!important;
      font-size:12px!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric strong,
    body[data-page="logistica"].logistica-dark .logPedidosMetric strong{
      color:#ffffff!important;
      font-size:28px!important;
      font-weight:780!important;
    }

    /* Tabla exacta dark: transparente, lineal y compacta */
    body[data-page="logistica"].logistica-dark .logTableWrap,
    body[data-page="logistica"].logistica-dark .logPedidosTableWrap{
      background:transparent!important;
      border-radius:0!important;
      border:0!important;
      box-shadow:none!important;
      overflow:auto!important;
    }

    body[data-page="logistica"].logistica-dark .logTable,
    body[data-page="logistica"].logistica-dark .logConversationsTable,
    body[data-page="logistica"].logistica-dark .logPedidosTable{
      background:transparent!important;
      border-collapse:collapse!important;
      border-spacing:0!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable thead,
    body[data-page="logistica"].logistica-dark .logTable thead tr,
    body[data-page="logistica"].logistica-dark .logTable th,
    body[data-page="logistica"].logistica-dark .logConversationsTable th,
    body[data-page="logistica"].logistica-dark .logPedidosTable th{
      background:rgba(0,0,0,.10)!important;
      color:#bdbdbd!important;
      border-top:0!important;
      border-bottom:1px solid rgba(255,255,255,.10)!important;
      font-size:11px!important;
      font-weight:700!important;
      letter-spacing:.055em!important;
      text-transform:uppercase!important;
      padding:14px 11px!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr{
      background:transparent!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody td{
      background:transparent!important;
      color:#ececec!important;
      border-top:1px solid rgba(255,255,255,.10)!important;
      border-bottom:0!important;
      font-size:13px!important;
      font-weight:650!important;
      line-height:1.22!important;
      padding:14px 11px!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody td span,
    body[data-page="logistica"].logistica-dark .logTable tbody td em,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody td span,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody td em,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody td span,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody td em{
      color:#c9c9c9!important;
      font-style:normal!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody td strong,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody td strong,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody td strong,
    body[data-page="logistica"].logistica-dark .logConversationMessage{
      color:#ffffff!important;
      font-weight:760!important;
    }

    /* Hover oscuro: misma familia visual que el contenedor, nunca blanco */
    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logTable tbody tr.${HOVER_CLASS},
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr.${HOVER_CLASS},
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.${HOVER_CLASS},
    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover td,
    body[data-page="logistica"].logistica-dark .logTable tbody tr.${HOVER_CLASS} td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr.${HOVER_CLASS} td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.${HOVER_CLASS} td{
      background:#303030!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logTable tbody tr[style] td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style] td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style] td{
      background:rgba(255,255,255,.04)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logTable tbody tr.${HOVER_CLASS} *,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr.${HOVER_CLASS} *,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.${HOVER_CLASS} *{
      color:inherit!important;
    }

    body[data-page="logistica"].logistica-dark .logBadge,
    body[data-page="logistica"].logistica-dark .logPedidosBadge,
    body[data-page="logistica"].logistica-dark .logConversationVerified{
      border-radius:6px!important;
      box-shadow:none!important;
      font-size:11px!important;
      font-weight:700!important;
    }

    body[data-page="logistica"].logistica-dark .logBadge--gray{background:rgba(160,166,180,.35)!important;color:#ffffff!important}
    body[data-page="logistica"].logistica-dark .logBadge--green,
    body[data-page="logistica"].logistica-dark .logConversationVerified--yes{background:rgba(68,180,116,.75)!important;color:#ffffff!important}
    body[data-page="logistica"].logistica-dark .logBadge--orange{background:rgba(242,138,43,.92)!important;color:#ffffff!important}
    body[data-page="logistica"].logistica-dark .logBadge--red,
    body[data-page="logistica"].logistica-dark .logConversationVerified--no{background:#ef4444!important;color:#ffffff!important}
    body[data-page="logistica"].logistica-dark .logBadge--blue{background:rgba(36,121,255,.82)!important;color:#ffffff!important}

    body[data-page="logistica"].logistica-dark .logActionBtn,
    body[data-page="logistica"].logistica-dark .logConversationsTable button,
    body[data-page="logistica"].logistica-dark .logPedidosTable button{
      background:transparent!important;
      color:#ffffff!important;
      border:0!important;
      box-shadow:none!important;
      font-size:14px!important;
      font-weight:650!important;
      padding:4px 0!important;
      border-radius:0!important;
    }

    body[data-page="logistica"].logistica-dark .logActionBtn:hover,
    body[data-page="logistica"].logistica-dark .logConversationsTable button:hover,
    body[data-page="logistica"].logistica-dark .logPedidosTable button:hover{
      background:transparent!important;
      color:#ffffff!important;
      text-decoration:underline!important;
    }

    /* Slide conversación */
    body[data-page="logistica"].logistica-dark .logConversationSlide__overlay,
    body[data-page="logistica"].logistica-dark .logPedidosSlide__overlay,
    body[data-page="logistica"].logistica-dark .logRuleSlide__overlay{
      background:rgba(0,0,0,.34)!important;
      opacity:1!important;
      backdrop-filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__panel,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header,
    body[data-page="logistica"].logistica-dark .logConversationSlide__content,
    body[data-page="logistica"].logistica-dark .logConversationDetailGrid{
      background:#202020!important;
      color:#ececec!important;
      border-color:rgba(255,255,255,.12)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox,
    body[data-page="logistica"].logistica-dark .logConversationBox--chat,
    body[data-page="logistica"].logistica-dark .logConversationBox--data,
    body[data-page="logistica"].logistica-dark .logConversationChat,
    body[data-page="logistica"].logistica-dark .logConversationChatMeta,
    body[data-page="logistica"].logistica-dark .logConversationDataItem{
      background:#2f2f2f!important;
      color:#ececec!important;
      border-color:rgba(255,255,255,.12)!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head{
      background:transparent!important;
      border-color:rgba(255,255,255,.12)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer{
      background:#3a3a3a!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer::after{
      background:#3a3a3a!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--operator{
      background:#2479ff!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply{
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.12)!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply textarea{
      background:transparent!important;
      color:#ececec!important;
      border:0!important;
    }
  `;

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
    }

    if (document.head.lastElementChild !== style) {
      document.head.appendChild(style);
    }
  }

  function rowBase(row) {
    if (!row) return 'transparent';
    if (row.classList.contains(HOVER_CLASS)) return '#303030';
    if (row.querySelector('.logBadge--red,.logConversationVerified--no')) return 'rgba(239,68,68,.035)';
    if (row.querySelector('.logBadge--orange')) return 'rgba(242,138,43,.035)';
    return 'transparent';
  }

  function forceRow(row) {
    if (!row || !isLogisticaDark()) return;
    const bg = rowBase(row);
    row.style.setProperty('background', bg, 'important');
    row.style.setProperty('color', '#ececec', 'important');

    row.querySelectorAll('td').forEach(td => {
      td.style.setProperty('background', bg, 'important');
      td.style.setProperty('color', '#ececec', 'important');
    });
  }

  function normalizeRows() {
    if (!isLogisticaDark()) return;
    document.querySelectorAll('.logConversationsTable tbody tr,.logPedidosTable tbody tr,.logTable tbody tr').forEach(forceRow);
  }

  function bindHover() {
    if (!isLogisticaPage() || document.body.dataset.logDarkReferenceHoverBound === '1') return;
    document.body.dataset.logDarkReferenceHoverBound = '1';

    document.addEventListener('mouseover', event => {
      const row = event.target.closest('.logConversationsTable tbody tr,.logPedidosTable tbody tr,.logTable tbody tr');
      if (!row || !isLogisticaDark()) return;
      row.classList.add(HOVER_CLASS);
      forceRow(row);
    }, true);

    document.addEventListener('mouseout', event => {
      const row = event.target.closest('.logConversationsTable tbody tr,.logPedidosTable tbody tr,.logTable tbody tr');
      if (!row || !isLogisticaDark()) return;
      if (row.contains(event.relatedTarget)) return;
      row.classList.remove(HOVER_CLASS);
      forceRow(row);
    }, true);
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
    bindHover();
    window.setTimeout(normalizeRows, 0);
    window.setTimeout(normalizeRows, 160);
    window.setTimeout(normalizeRows, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(normalizeRows, 120);
    window.setTimeout(normalizeRows, 360);
  }, true);

  document.addEventListener('mousemove', function (event) {
    const row = event.target.closest && event.target.closest('.logConversationsTable tbody tr,.logPedidosTable tbody tr,.logTable tbody tr');
    if (!row || !isLogisticaDark()) return;
    row.classList.add(HOVER_CLASS);
    forceRow(row);
  }, true);

  const observer = new MutationObserver(function () {
    if (!isLogisticaDark()) return;
    ensureStyle();
    normalizeRows();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
