/* ==========================================================
   Protocol Data · Logística Dark Reference Runtime
   Replica visual del mock dark y gana contra estilos dinámicos inyectados.
   Solo actúa cuando body[data-page="logistica"].logistica-dark está activo.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkReferenceRuntimeStyles';

  function isLogisticaDark() {
    return document.body &&
      document.body.getAttribute('data-page') === 'logistica' &&
      document.body.classList.contains('logistica-dark');
  }

  const css = `
    body[data-page="logistica"].logistica-dark{
      background:#202020!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .appShell,
    body[data-page="logistica"].logistica-dark .bodyGrid,
    body[data-page="logistica"].logistica-dark .logisticsMain{
      background:linear-gradient(135deg,#1c1c1c 0%,#262626 55%,#202020 100%)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logisticsMain{
      padding:28px 32px!important;
    }

    body[data-page="logistica"].logistica-dark .sidebar{
      background:linear-gradient(180deg,#151515 0%,#1c1c1c 100%)!important;
      border-right:1px solid rgba(255,255,255,.08)!important;
      box-shadow:16px 0 36px rgba(0,0,0,.28)!important;
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
      background:rgba(255,255,255,.08)!important;
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

    body[data-page="logistica"].logistica-dark .logisticsHeader{
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      color:#ececec!important;
      margin-bottom:26px!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__title{
      display:inline-flex!important;
      align-items:center!important;
      gap:9px!important;
      color:#ffffff!important;
      font-size:22px!important;
      line-height:1!important;
      font-weight:850!important;
      letter-spacing:-.03em!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__title::after{
      content:""!important;
      width:9px!important;
      height:9px!important;
      border-radius:999px!important;
      background:#90f2b5!important;
      box-shadow:0 0 14px rgba(144,242,181,.82)!important;
    }

    body[data-page="logistica"].logistica-dark .appHeader__sub{
      color:#c9c9c9!important;
      font-size:16px!important;
      font-weight:400!important;
    }

    body[data-page="logistica"].logistica-dark .logConnectionBadge,
    body[data-page="logistica"].logistica-dark .logConversationsLiveBadge{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      min-height:38px!important;
      padding:0 14px!important;
      border-radius:999px!important;
      background:rgba(80,190,128,.18)!important;
      border:1px solid rgba(111,232,166,.24)!important;
      color:#8fe6b4!important;
      box-shadow:0 0 20px rgba(111,232,166,.10)!important;
      font-size:14px!important;
      font-weight:750!important;
    }

    body[data-page="logistica"].logistica-dark .logConnectionBadge::before,
    body[data-page="logistica"].logistica-dark .logConversationsLiveBadge::before{
      content:""!important;
      width:10px!important;
      height:10px!important;
      border-radius:999px!important;
      background:#79e6a6!important;
      box-shadow:0 0 12px rgba(121,230,166,.72)!important;
    }

    body[data-page="logistica"].logistica-dark .logThemeToggle,
    body[data-page="logistica"].logistica-dark .btn.btn--secondary,
    body[data-page="logistica"].logistica-dark #logBtnSyncSupabase,
    body[data-page="logistica"].logistica-dark #logBtnNewRule{
      min-height:42px!important;
      border-radius:10px!important;
      background:rgba(255,255,255,.045)!important;
      border:1px solid rgba(255,255,255,.15)!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-size:16px!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark #logBtnNewRule,
    body[data-page="logistica"].logistica-dark .btn.btn--primary{
      background:rgba(255,255,255,.055)!important;
      border-color:rgba(255,255,255,.18)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logThemeToggle:hover,
    body[data-page="logistica"].logistica-dark .btn:hover,
    body[data-page="logistica"].logistica-dark #logBtnSyncSupabase:hover,
    body[data-page="logistica"].logistica-dark #logBtnNewRule:hover{
      background:rgba(255,255,255,.09)!important;
      border-color:rgba(255,255,255,.24)!important;
      transform:none!important;
    }

    body[data-page="logistica"].logistica-dark .logisticsHero{
      gap:14px!important;
      margin-bottom:28px!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard,
    body[data-page="logistica"].logistica-dark .logCard,
    body[data-page="logistica"].logistica-dark .logConversationMetric,
    body[data-page="logistica"].logistica-dark .logPedidosMetric{
      background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025))!important;
      border:1px solid rgba(255,255,255,.16)!important;
      border-radius:10px!important;
      box-shadow:none!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard{
      padding:18px 18px!important;
      min-height:112px!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard--primary{
      background:linear-gradient(135deg,rgba(36,121,255,.13),rgba(255,255,255,.035))!important;
      border-color:rgba(126,166,255,.35)!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard__label,
    body[data-page="logistica"].logistica-dark .logHeroCard small{
      color:#d0d0d0!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logHeroCard strong{
      color:#ffffff!important;
      font-size:35px!important;
      font-weight:780!important;
      letter-spacing:-.04em!important;
    }

    body[data-page="logistica"].logistica-dark .logisticsTabs{
      display:flex!important;
      gap:34px!important;
      align-items:flex-end!important;
      padding:0 0 12px!important;
      margin:0 0 32px!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      overflow-x:auto!important;
    }

    body[data-page="logistica"].logistica-dark .logTab{
      min-height:34px!important;
      padding:0!important;
      background:transparent!important;
      border:0!important;
      border-radius:0!important;
      color:#bdbdbd!important;
      box-shadow:none!important;
      font-size:16px!important;
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
      bottom:-13px!important;
      height:2px!important;
      border-radius:99px!important;
      background:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logCard{
      padding:28px 18px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationsCard,
    body[data-page="logistica"].logistica-dark [data-log-panel="conversaciones"] .logCard{
      padding:28px 18px 0!important;
      border-radius:9px!important;
      background:rgba(255,255,255,.035)!important;
      border:1px solid rgba(255,255,255,.14)!important;
    }

    body[data-page="logistica"].logistica-dark .u-sectionLabel,
    body[data-page="logistica"].logistica-dark .logCard__head .u-sectionLabel{
      color:#bdbdbd!important;
      letter-spacing:.14em!important;
      font-size:12px!important;
      font-weight:800!important;
    }

    body[data-page="logistica"].logistica-dark .logCard__head h2{
      color:#ffffff!important;
      font-size:24px!important;
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
      margin:18px 0 14px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric,
    body[data-page="logistica"].logistica-dark .logPedidosMetric{
      min-height:72px!important;
      padding:14px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric span,
    body[data-page="logistica"].logistica-dark .logPedidosMetric span{
      color:#bdbdbd!important;
      font-size:13px!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationMetric strong,
    body[data-page="logistica"].logistica-dark .logPedidosMetric strong{
      color:#ffffff!important;
      font-size:30px!important;
      font-weight:780!important;
    }

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
      font-size:12px!important;
      font-weight:700!important;
      letter-spacing:.055em!important;
      text-transform:uppercase!important;
      padding:16px 12px!important;
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
      font-size:14px!important;
      font-weight:650!important;
      line-height:1.25!important;
      padding:18px 12px!important;
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

    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover,
    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover td{
      background:rgba(255,255,255,.055)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style],
    body[data-page="logistica"].logistica-dark .logTable tbody tr[style] td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style] td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style] td{
      background:rgba(255,255,255,.045)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr[style]:hover,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style]:hover,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style]:hover,
    body[data-page="logistica"].logistica-dark .logTable tbody tr[style]:hover td,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style]:hover td,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style]:hover td{
      background:rgba(255,255,255,.085)!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover *,
    body[data-page="logistica"].logistica-dark .logTable tbody tr[style] *,
    body[data-page="logistica"].logistica-dark .logConversationsTable tbody tr[style] *,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr[style] *{
      color:inherit!important;
    }

    body[data-page="logistica"].logistica-dark .logBadge,
    body[data-page="logistica"].logistica-dark .logPedidosBadge,
    body[data-page="logistica"].logistica-dark .logConversationVerified{
      border-radius:6px!important;
      box-shadow:none!important;
      font-size:12px!important;
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

  function boot() {
    if (!document.body || document.body.getAttribute('data-page') !== 'logistica') return;
    ensureStyle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(boot, 120);
    window.setTimeout(boot, 360);
  }, true);

  const observer = new MutationObserver(function () {
    if (isLogisticaDark()) ensureStyle();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
