/* ==========================================================
   Protocol Data · Logística Dark · Conversation Slide Skin
   Piel visual interna del slide de conversaciones.
   No modifica ancho, alto, posición, inset ni transform del slide.
   No toca Supabase, lectura, envío, estados ni render funcional.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkConversationSlideSkinStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  const css = `
    /* Marco visual: sin cambiar tamaño/proporción del slide */
    body[data-page="logistica"].logistica-dark .logConversationSlide__panel{
      background:linear-gradient(135deg,#1f1f1f 0%,#282828 54%,#202020 100%)!important;
      color:#ececec!important;
      border-left:1px solid rgba(255,255,255,.12)!important;
      box-shadow:-22px 0 56px rgba(0,0,0,.42)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header{
      background:linear-gradient(180deg,rgba(33,33,33,.98),rgba(27,27,27,.98))!important;
      color:#ececec!important;
      border-bottom:1px solid rgba(255,255,255,.11)!important;
      box-shadow:0 16px 34px rgba(0,0,0,.20)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__close{
      border-radius:999px!important;
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.18)!important;
      color:#ececec!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__close:hover{
      background:rgba(255,255,255,.10)!important;
      border-color:rgba(255,255,255,.28)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      color:#ffffff!important;
      font-weight:850!important;
      letter-spacing:-.025em!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong::after{
      content:"✓ Recibido"!important;
      display:inline-flex!important;
      align-items:center!important;
      min-height:22px!important;
      padding:0 9px!important;
      border-radius:7px!important;
      background:rgba(68,180,116,.22)!important;
      border:1px solid rgba(68,180,116,.34)!important;
      color:#9ce8bf!important;
      font-size:12px!important;
      font-weight:850!important;
      letter-spacing:0!important;
      white-space:nowrap!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__title span{
      display:inline-flex!important;
      width:fit-content!important;
      max-width:100%!important;
      align-items:center!important;
      gap:8px!important;
      padding:7px 10px!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.075)!important;
      border:1px solid rgba(255,255,255,.15)!important;
      color:#bdbdbd!important;
      font-size:12px!important;
      font-weight:800!important;
      opacity:1!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]{
      width:auto!important;
      justify-self:end!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]::before{
      content:"Finalizada⌄"!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:space-between!important;
      min-width:118px!important;
      min-height:36px!important;
      padding:0 12px!important;
      border-radius:7px!important;
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      font-size:13px!important;
      font-weight:600!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__content{
      background:transparent!important;
      color:#ececec!important;
    }

    /* Badges superiores */
    body[data-page="logistica"].logistica-dark .logConversationStatusRow{
      display:flex!important;
      flex-wrap:wrap!important;
      gap:8px!important;
      margin:0 0 12px!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified{
      display:inline-flex!important;
      align-items:center!important;
      min-height:24px!important;
      padding:0 9px!important;
      border-radius:7px!important;
      border:1px solid rgba(255,255,255,.14)!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:850!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--gray{
      background:rgba(255,120,120,.26)!important;
      border-color:rgba(255,120,120,.36)!important;
      color:#ffc1c1!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--orange{
      background:rgba(242,138,43,.24)!important;
      border-color:rgba(242,138,43,.38)!important;
      color:#ffc078!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--green,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified--yes{
      background:rgba(68,180,116,.24)!important;
      border-color:rgba(68,180,116,.38)!important;
      color:#9ce8bf!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--blue{
      background:rgba(36,121,255,.22)!important;
      border-color:rgba(36,121,255,.36)!important;
      color:#b8d2ff!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified--no{
      background:rgba(239,68,68,.22)!important;
      border-color:rgba(239,68,68,.36)!important;
      color:#ffb1b1!important;
    }

    /* Contenedor interno: diseño lineal, sin alterar tamaño general del slide */
    body[data-page="logistica"].logistica-dark .logConversationDetailGrid{
      background:rgba(255,255,255,.030)!important;
      border:1px solid rgba(255,255,255,.13)!important;
      border-radius:8px!important;
      box-shadow:0 18px 46px rgba(0,0,0,.22)!important;
      overflow:hidden!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox{
      background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.020))!important;
      border-color:rgba(255,255,255,.12)!important;
      color:#ececec!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDetailGrid > .logConversationBox:first-child{
      border-right:1px solid rgba(255,255,255,.12)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head{
      padding-bottom:10px!important;
      margin-bottom:12px!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head strong{
      color:#ffffff!important;
      font-size:18px!important;
      line-height:1.05!important;
      font-weight:850!important;
      letter-spacing:-.03em!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBox__head span{
      color:#b4b4b4!important;
      font-size:12px!important;
      font-weight:760!important;
    }

    /* Chat lineal */
    body[data-page="logistica"].logistica-dark .logConversationChat{
      background:transparent!important;
      gap:12px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble{
      position:relative!important;
      border-radius:16px!important;
      padding:12px 14px!important;
      box-shadow:none!important;
      line-height:1.35!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer{
      background:#383838!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ffffff!important;
      border-bottom-left-radius:6px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--customer::after{
      content:""!important;
      position:absolute!important;
      left:-4px!important;
      bottom:1px!important;
      width:12px!important;
      height:12px!important;
      background:#383838!important;
      clip-path:polygon(100% 0,0 100%,100% 100%)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--operator{
      background:#2479ff!important;
      border:1px solid #2479ff!important;
      color:#ffffff!important;
      border-bottom-right-radius:6px!important;
      box-shadow:0 12px 28px rgba(36,121,255,.22)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--operator::after{
      content:""!important;
      position:absolute!important;
      right:-4px!important;
      bottom:1px!important;
      width:12px!important;
      height:12px!important;
      background:#2479ff!important;
      clip-path:polygon(0 0,0 100%,100% 100%)!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble--system{
      background:rgba(255,255,255,.08)!important;
      border:1px dashed rgba(255,255,255,.16)!important;
      color:#b4b4b4!important;
      text-align:center!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble strong,
    body[data-page="logistica"].logistica-dark .logConversationBubble p,
    body[data-page="logistica"].logistica-dark .logConversationBubble small{
      color:inherit!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble strong{
      font-size:12px!important;
      font-weight:850!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble p{
      font-size:13px!important;
      font-weight:720!important;
      line-height:1.35!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationBubble small{
      font-size:11px!important;
      font-weight:750!important;
      opacity:.66!important;
      text-align:right!important;
    }

    /* Escritor tipo barra */
    body[data-page="logistica"].logistica-dark .logConversationReply{
      display:flex!important;
      align-items:center!important;
      gap:8px!important;
      margin-top:12px!important;
      padding:8px!important;
      border:1px solid rgba(255,255,255,.14)!important;
      border-radius:999px!important;
      background:rgba(255,255,255,.045)!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply textarea{
      flex:1 1 auto!important;
      min-height:42px!important;
      max-height:72px!important;
      border:1px solid rgba(255,255,255,.13)!important;
      border-radius:10px!important;
      background:rgba(255,255,255,.035)!important;
      color:#ececec!important;
      padding:11px 13px!important;
      resize:none!important;
      outline:0!important;
      font-size:13px!important;
      font-weight:560!important;
      line-height:1.3!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply textarea::placeholder{
      color:#9a9a9a!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions{
      display:flex!important;
      align-items:center!important;
      gap:8px!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary{
      width:42px!important;
      height:42px!important;
      min-width:42px!important;
      border-radius:999px!important;
      border:0!important;
      background:rgba(255,255,255,.08)!important;
      color:#ececec!important;
      font-size:0!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      padding:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary::before{
      content:"{}"!important;
      font-size:15px!important;
      font-weight:900!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--primary{
      width:44px!important;
      height:44px!important;
      min-width:44px!important;
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
      font-size:21px!important;
      line-height:1!important;
      transform:translateX(1px)!important;
    }

    /* Desplegable / segmentación */
    body[data-page="logistica"].logistica-dark .logSegmentBtn,
    body[data-page="logistica"].logistica-dark .logConversationBox select{
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      border-radius:7px!important;
      font-weight:780!important;
    }

    body[data-page="logistica"].logistica-dark .logSegmentBtn::after{
      color:#69d39d!important;
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

    /* Datos de compra */
    body[data-page="logistica"].logistica-dark .logConversationDataList{
      display:grid!important;
      gap:0!important;
      background:transparent!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem{
      display:grid!important;
      gap:5px!important;
      padding:11px 0!important;
      border-bottom:1px solid rgba(255,255,255,.12)!important;
      background:transparent!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem span{
      color:#b4b4b4!important;
      font-size:11px!important;
      font-weight:850!important;
      text-transform:uppercase!important;
      letter-spacing:.05em!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem strong{
      color:#ffffff!important;
      font-size:13px!important;
      font-weight:820!important;
      line-height:1.28!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationDataItem:first-of-type,
    body[data-page="logistica"].logistica-dark .logConversationDataItem:nth-of-type(2){
      background:rgba(255,255,255,.055)!important;
      border:1px solid rgba(255,255,255,.13)!important;
      padding:12px 13px!important;
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
