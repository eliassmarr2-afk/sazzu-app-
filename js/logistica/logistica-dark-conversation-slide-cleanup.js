/* ==========================================================
   Protocol Data · Logística Dark · Conversation Slide Cleanup
   Correcciones puntuales del slide de conversaciones.
   No cambia tamaño, ancho, alto, posición, inset ni transform.
   No toca Supabase, mensajes, envío ni estados funcionales.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkConversationSlideCleanupStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function isDark() {
    return isLogisticaPage() && document.body.classList.contains('logistica-dark');
  }

  const css = `
    /* 1) Estado logístico: una sola aparición visual */
    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong::after{
      content:"✓ Recibido"!important;
      display:inline-flex!important;
      align-items:center!important;
      min-height:22px!important;
      padding:0 9px!important;
      border-radius:7px!important;
      background:rgba(68,180,116,.26)!important;
      border:1px solid rgba(68,180,116,.46)!important;
      color:#ffffff!important;
      font-size:12px!important;
      font-weight:900!important;
      letter-spacing:0!important;
      white-space:nowrap!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header .logConversationVerified{
      display:none!important;
    }

    /* 2) Desplegable superior derecho: dark real, sin blanco interno */
    body[data-page="logistica"].logistica-dark .logConversationSlide__header select,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [role="combobox"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="Dropdown"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="dropdown"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="StatusSelect"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="statusSelect"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="StateSelect"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="stateSelect"]{
      min-height:36px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      box-shadow:none!important;
      outline:0!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header select option{
      background:#2f2f2f!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="Dropdown"] *,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="dropdown"] *,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="StatusSelect"] *,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="statusSelect"] *,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="StateSelect"] *,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header [class*="stateSelect"] *{
      background:transparent!important;
      color:#ececec!important;
      border-color:rgba(255,255,255,.16)!important;
      box-shadow:none!important;
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
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      font-size:13px!important;
      font-weight:600!important;
      box-shadow:none!important;
    }

    /* 3) Composer limpio: solo input + enviar */
    body[data-page="logistica"].logistica-dark .logConversationReply{
      display:flex!important;
      align-items:center!important;
      gap:8px!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary,
    body[data-page="logistica"].logistica-dark .logConversationReply__actions button:not(.btn--primary),
    body[data-page="logistica"].logistica-dark .logChatToolsBtn,
    body[data-page="logistica"].logistica-dark .logChatAttachBtn,
    body[data-page="logistica"].logistica-dark .logConversationReply button[title*="herramienta" i],
    body[data-page="logistica"].logistica-dark .logConversationReply button[aria-label*="herramienta" i],
    body[data-page="logistica"].logistica-dark .logConversationReply button[title*="borrador" i],
    body[data-page="logistica"].logistica-dark .logConversationReply button[aria-label*="borrador" i]{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions{
      display:flex!important;
      align-items:center!important;
      gap:0!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--primary{
      display:inline-flex!important;
      width:44px!important;
      height:44px!important;
      min-width:44px!important;
      border-radius:999px!important;
      padding:0!important;
      border:0!important;
      background:#2f6fe7!important;
      color:#ffffff!important;
      font-size:0!important;
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

    /* 4) Badges superiores con contraste real */
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified{
      color:#ffffff!important;
      font-weight:900!important;
      text-shadow:none!important;
      opacity:1!important;
      filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge *,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified *{
      color:#ffffff!important;
      opacity:1!important;
      filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--orange{
      background:rgba(242,138,43,.86)!important;
      border-color:rgba(242,138,43,.92)!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--green,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified--yes{
      background:rgba(68,180,116,.72)!important;
      border-color:rgba(68,180,116,.82)!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--blue{
      background:rgba(36,121,255,.78)!important;
      border-color:rgba(36,121,255,.88)!important;
      color:#ffffff!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge--gray{
      background:rgba(107,114,128,.78)!important;
      border-color:rgba(156,163,175,.72)!important;
      color:#ffffff!important;
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

  function cleanComposer() {
    if (!isDark()) return;

    document.querySelectorAll('.logConversationReply__actions .btn--secondary, .logChatToolsBtn, .logChatAttachBtn').forEach((node) => {
      node.remove();
    });

    document.querySelectorAll('.logConversationReply button').forEach((button) => {
      const text = (button.textContent || '').trim().toLowerCase();
      const label = ((button.getAttribute('aria-label') || '') + ' ' + (button.getAttribute('title') || '')).toLowerCase();
      const isPrimary = button.classList.contains('btn--primary');
      if (isPrimary) return;
      if (text.includes('guardar borrador') || text === '{}' || text === '{ }' || label.includes('borrador') || label.includes('herramienta')) {
        button.remove();
      }
    });
  }

  function cleanHeaderRedundancy() {
    if (!isDark()) return;

    const header = document.querySelector('.logConversationSlide__header');
    if (!header) return;

    header.querySelectorAll('.logBadge, .logConversationVerified').forEach((node) => {
      node.style.setProperty('display', 'none', 'important');
    });

    header.querySelectorAll('span, div, strong').forEach((node) => {
      if (node.closest('.logConversationSlide__title')) return;
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (/Estado logístico\s*•/i.test(text) || /Recibido\s*•\s*ALP-/i.test(text)) {
        node.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
    window.setTimeout(cleanComposer, 0);
    window.setTimeout(cleanComposer, 160);
    window.setTimeout(cleanComposer, 480);
    window.setTimeout(cleanHeaderRedundancy, 0);
    window.setTimeout(cleanHeaderRedundancy, 160);
    window.setTimeout(cleanHeaderRedundancy, 480);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(boot, 160);
    window.setTimeout(boot, 480);
  }, true);
})();
