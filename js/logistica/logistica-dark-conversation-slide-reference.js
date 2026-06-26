/* ==========================================================
   Protocol Data · Logística Dark · Conversation Slide Reference
   Replica visual del diseño objetivo para el slide de conversaciones.
   Solo UI. No toca Supabase, mensajes, lectura, envío ni estados.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkConversationSlideReferenceStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  const css = `
    body[data-page="logistica"].logistica-dark .logConversationSlide{
      z-index:2147483200!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__overlay{
      background:rgba(0,0,0,.34)!important;
      opacity:0!important;
      backdrop-filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide.is-open .logConversationSlide__overlay{
      opacity:1!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__panel{
      position:absolute!important;
      inset:0!important;
      width:100vw!important;
      max-width:none!important;
      height:100dvh!important;
      transform:translateX(105%)!important;
      background:linear-gradient(135deg,#191919 0%,#262626 52%,#202020 100%)!important;
      color:#ececec!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:-30px 0 80px rgba(0,0,0,.54)!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide.is-open .logConversationSlide__panel{
      transform:translateX(0)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header{
      position:relative!important;
      top:auto!important;
      z-index:8!important;
      display:grid!important;
      grid-template-columns:50px minmax(0,1fr)210px!important;
      align-items:center!important;
      gap:14px!important;
      min-height:126px!important;
      padding:22px 28px!important;
      background:linear-gradient(180deg,#202020 0%,#1d1d1d 100%)!important;
      color:#ececec!important;
      border-bottom:1px solid rgba(255,255,255,.10)!important;
      box-shadow:0 18px 36px rgba(0,0,0,.18)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__close{
      width:46px!important;
      height:46px!important;
      min-width:46px!important;
      border-radius:999px!important;
      background:rgba(255,255,255,.045)!important;
      color:#ececec!important;
      border:1px solid rgba(255,255,255,.20)!important;
      box-shadow:none!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__close:hover{
      background:rgba(255,255,255,.09)!important;
      border-color:rgba(255,255,255,.30)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title,
    body[data-page="logistica"].logistica-dark .logConversationHeaderMain{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:8px!important;
      min-width:0!important;
      align-items:start!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong,
    body[data-page="logistica"].logistica-dark .logConversationHeaderMain strong{
      display:inline-flex!important;
      align-items:center!important;
      gap:10px!important;
      color:#ffffff!important;
      font-size:23px!important;
      line-height:1!important;
      font-weight:850!important;
      letter-spacing:-.035em!important;
      max-width:100%!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong::after,
    body[data-page="logistica"].logistica-dark .logConversationHeaderMain strong::after{
      content:"✓ Recibido"!important;
      display:inline-flex!important;
      align-items:center!important;
      min-height:24px!important;
      padding:0 10px!important;
      border-radius:7px!important;
      background:rgba(68,180,116,.22)!important;
      border:1px solid rgba(68,180,116,.34)!important;
      color:#9ce8bf!important;
      font-size:14px!important;
      font-weight:800!important;
      letter-spacing:0!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title span,
    body[data-page="logistica"].logistica-dark .logConversationHeaderMain span{
      display:inline-flex!important;
      width:fit-content!important;
      max-width:min(520px,100%)!important;
      min-height:45px!important;
      align-items:center!important;
      gap:10px!important;
      padding:0 14px!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.08)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#bdbdbd!important;
      box-shadow:0 10px 22px rgba(0,0,0,.18)!important;
      font-size:14px!important;
      font-weight:800!important;
      opacity:1!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderId{
      display:inline-flex!important;
      width:fit-content!important;
      max-width:min(520px,100%)!important;
      min-height:45px!important;
      align-items:center!important;
      gap:10px!important;
      justify-self:start!important;
      padding:0 14px!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.08)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#bdbdbd!important;
      box-shadow:0 10px 22px rgba(0,0,0,.18)!important;
      font-size:14px!important;
      font-weight:800!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationCopyId{
      width:26px!important;
      height:26px!important;
      min-width:26px!important;
      border-radius:6px!important;
      background:rgba(255,255,255,.09)!important;
      border:1px solid rgba(255,255,255,.18)!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[style*="width:38px"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]{
      display:block!important;
      width:auto!important;
      min-width:0!important;
      justify-self:end!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]::before{
      content:"Finalizada⌄"!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      min-width:172px!important;
      min-height:48px!important;
      padding:0 16px!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.06)!important;
      border:1px solid rgba(255,255,255,.17)!important;
      color:#ececec!important;
      font-size:16px!important;
      font-weight:500!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__content{
      display:grid!important;
      gap:0!important;
      height:calc(100dvh - 126px)!important;
      padding:28px 16px 16px!important;
      background:transparent!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow{
      display:flex!important;
      flex-wrap:wrap!important;
      align-items:center!important;
      gap:10px!important;
      min-height:38px!important;
      padding:0 0 26px!important;
      margin:0!important;
      border:0!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified{
      display:inline-flex!important;
      align-items:center!important;
      min-height:28px!important;
      gap:6px!important;
      padding:0 11px!important;
      border-radius:7px!important;
      font-size:13px!important;
      font-weight:850!important;
      line-height:1!important;
      border:1px solid rgba(255,255,255,.14)!important;
      box-shadow:0 8px 18px rgba(0,0,0,.12)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--gray{background:rgba(255,120,120,.30)!important;color:#ffc2c2!important;border-color:rgba(255,120,120,.38)!important}
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--orange{background:rgba(242,138,43,.28)!important;color:#ffc078!important;border-color:rgba(242,138,43,.40)!important}
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--green,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified--yes{background:rgba(68,180,116,.28)!important;color:#9ce8bf!important;border-color:rgba(68,180,116,.40)!important}
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--blue{background:rgba(36,121,255,.24)!important;color:#b8d2ff!important;border-color:rgba(36,121,255,.38)!important}

    body[data-page="logistica"].logistica-dark .logConversationDetailGrid{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)430px!important;
      gap:0!important;
      height:calc(100dvh - 218px)!important;
      min-height:0!important;
      overflow:hidden!important;
      border:1px solid rgba(255,255,255,.14)!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.035)!important;
      box-shadow:0 24px 60px rgba(0,0,0,.24)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox{
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      color:#ececec!important;
      min-height:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox--chat,
    body[data-page="logistica"].logistica-dark .logConversationDetailGrid > .logConversationBox:first-child{
      display:grid!important;
      grid-template-rows:auto minmax(0,1fr)auto!important;
      padding:16px!important;
      background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.025))!important;
      border-right:1px solid rgba(255,255,255,.14)!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox--data,
    body[data-page="logistica"].logistica-dark .logConversationDetailGrid > .logConversationBox:last-child{
      padding:16px!important;
      background:linear-gradient(135deg,rgba(255,255,255,.050),rgba(255,255,255,.020))!important;
      overflow-y:auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head{
      display:flex!important;
      align-items:flex-start!important;
      justify-content:space-between!important;
      gap:12px!important;
      padding:0 0 12px!important;
      margin:0!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head h3,
    body[data-page="logistica"].logistica-dark .logConversationBox__head strong{
      color:#ffffff!important;
      font-size:21px!important;
      line-height:1.05!important;
      font-weight:850!important;
      letter-spacing:-.035em!important;
      margin:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head span,
    body[data-page="logistica"].logistica-dark .logConversationBox__head small{
      color:#b4b4b4!important;
      font-size:14px!important;
      font-weight:700!important;
      line-height:1.15!important;
      margin:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationChatMeta{
      display:flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      padding:104px 0 16px!important;
      margin:0!important;
      background:transparent!important;
      border:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationChatMeta strong{
      color:#ececec!important;
      font-size:18px!important;
      font-weight:780!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationChatMeta span{
      color:#b4b4b4!important;
      font-size:14px!important;
      font-weight:700!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationChat{
      display:flex!important;
      flex-direction:column!important;
      gap:14px!important;
      min-height:0!important;
      padding:16px 12px 24px!important;
      overflow-y:auto!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble{
      position:relative!important;
      width:fit-content!important;
      max-width:min(70%,650px)!important;
      min-width:0!important;
      display:grid!important;
      gap:7px!important;
      padding:13px 16px!important;
      border-radius:18px!important;
      box-shadow:none!important;
      line-height:1.35!important;
      margin:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer{
      align-self:flex-start!important;
      justify-self:start!important;
      background:#383838!important;
      border:1px solid rgba(255,255,255,.18)!important;
      color:#ffffff!important;
      border-bottom-left-radius:6px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer::after{
      content:""!important;
      position:absolute!important;
      left:-4px!important;
      bottom:1px!important;
      width:13px!important;
      height:13px!important;
      background:#383838!important;
      clip-path:polygon(100% 0,0 100%,100% 100%)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--operator{
      align-self:flex-end!important;
      justify-self:end!important;
      background:#2479ff!important;
      border:1px solid #2479ff!important;
      color:#ffffff!important;
      border-bottom-right-radius:6px!important;
      box-shadow:0 14px 30px rgba(36,121,255,.22)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--operator::after{
      content:""!important;
      position:absolute!important;
      right:-4px!important;
      bottom:1px!important;
      width:13px!important;
      height:13px!important;
      background:#2479ff!important;
      clip-path:polygon(0 0,0 100%,100% 100%)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--system{
      align-self:center!important;
      justify-self:center!important;
      background:rgba(255,255,255,.08)!important;
      border:1px dashed rgba(255,255,255,.16)!important;
      color:#b4b4b4!important;
      text-align:center!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble strong{
      color:inherit!important;
      display:block!important;
      font-size:14px!important;
      font-weight:850!important;
      margin:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble p{
      color:inherit!important;
      margin:0!important;
      font-size:16px!important;
      font-weight:750!important;
      line-height:1.34!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble small{
      display:block!important;
      margin-top:5px!important;
      color:rgba(255,255,255,.62)!important;
      font-size:13px!important;
      font-weight:750!important;
      text-align:right!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply{
      display:flex!important;
      align-items:center!important;
      gap:10px!important;
      min-height:74px!important;
      margin:12px 0 0!important;
      padding:8px 10px!important;
      border:1px solid rgba(255,255,255,.14)!important;
      border-radius:999px!important;
      background:rgba(255,255,255,.045)!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply textarea{
      flex:1 1 auto!important;
      min-height:48px!important;
      max-height:86px!important;
      border:1px solid rgba(255,255,255,.13)!important;
      border-radius:9px!important;
      background:rgba(255,255,255,.035)!important;
      color:#ececec!important;
      padding:13px 16px!important;
      resize:none!important;
      outline:0!important;
      font-size:16px!important;
      font-weight:500!important;
      line-height:1.3!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply textarea::placeholder{
      color:#9a9a9a!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions{
      display:flex!important;
      align-items:center!important;
      gap:10px!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary,
    body[data-page="logistica"].logistica-dark .logChatAttachBtn,
    body[data-page="logistica"].logistica-dark .logChatToolsBtn{
      width:50px!important;
      height:50px!important;
      min-width:50px!important;
      border-radius:999px!important;
      border:0!important;
      background:rgba(255,255,255,.08)!important;
      color:#ececec!important;
      font-size:0!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary::before,
    body[data-page="logistica"].logistica-dark .logChatToolsBtn::before{
      content:"{}"!important;
      font-size:18px!important;
      font-weight:900!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--primary{
      width:54px!important;
      height:54px!important;
      min-width:54px!important;
      border-radius:999px!important;
      padding:0!important;
      border:0!important;
      background:#2f6fe7!important;
      color:#ffffff!important;
      font-size:0!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--primary::before{
      content:"➤"!important;
      font-size:25px!important;
      line-height:1!important;
      transform:translateX(1px)!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentWrap{
      margin:12px 0 18px!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentBtn{
      min-height:50px!important;
      border-radius:6px!important;
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      padding:0 42px 0 16px!important;
      font-size:15px!important;
      font-weight:780!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentBtn::after{
      color:#69d39d!important;
      right:16px!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentBadges{
      display:flex!important;
      flex-wrap:wrap!important;
      gap:8px!important;
      margin:0 0 10px!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentBadge{
      min-height:28px!important;
      border-radius:8px!important;
      padding:0 10px!important;
      font-size:13px!important;
      font-weight:850!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentPanel,
    body[data-page="logistica"].logistica-dark .logQuickTools{
      background:#303030!important;
      border-color:rgba(255,255,255,.14)!important;
      box-shadow:0 18px 36px rgba(0,0,0,.28)!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentItem,
    body[data-page="logistica"].logistica-dark .logQuickTool{
      background:#303030!important;
      color:#ececec!important;
      border-color:rgba(255,255,255,.10)!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentItem:hover,
    body[data-page="logistica"].logistica-dark .logQuickTool:hover{
      background:#3a3a3a!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataList{
      display:grid!important;
      gap:0!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem{
      display:grid!important;
      gap:6px!important;
      padding:14px 0!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      background:transparent!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem span{
      color:#b4b4b4!important;
      font-size:13px!important;
      font-weight:850!important;
      text-transform:uppercase!important;
      letter-spacing:.05em!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem strong{
      color:#ffffff!important;
      font-size:16px!important;
      font-weight:820!important;
      line-height:1.28!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem:first-of-type,
    body[data-page="logistica"].logistica-dark .logConversationDataItem:nth-of-type(2){
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.13)!important;
      padding:14px 16px!important;
    }

    @media(max-width:1100px){
      body[data-page="logistica"].logistica-dark .logConversationDetailGrid{grid-template-columns:1fr!important;height:auto!important;overflow-y:auto!important}
      body[data-page="logistica"].logistica-dark .logConversationSlide__content{overflow-y:auto!important}
      body[data-page="logistica"].logistica-dark .logConversationSlide__header{grid-template-columns:50px minmax(0,1fr)!important}
      body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]{display:none!important}
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
    if (!isLogisticaPage()) return;
    ensureStyle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(boot, 180);
    window.setTimeout(boot, 520);
  }, true);
})();
