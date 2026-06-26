/* ==========================================================
   Protocol Data · Logística Dark · Conversation Safe Fix
   Correcciones mínimas y seguras.
   No reconstruye header. No elimina nodos estructurales.
   No cambia tamaño/proporción del slide. No toca Supabase.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkConversationSafeFixStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function isDark() {
    return isLogisticaPage() && document.body.classList.contains('logistica-dark');
  }

  const css = `
    /* Desactivar pseudo-elementos que generaban redundancia */
    body[data-page="logistica"].logistica-dark .logConversationSlide__title strong::after,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header > div[aria-hidden="true"]::before{
      content:none!important;
      display:none!important;
    }

    /* Desplegable Abierta / Finalizada: dark real */
    body[data-page="logistica"].logistica-dark .logConversationSlide__header select{
      appearance:none!important;
      -webkit-appearance:none!important;
      min-height:36px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:0!important;
      color:#ececec!important;
      box-shadow:none!important;
      outline:0!important;
      font-size:13px!important;
      font-weight:650!important;
      cursor:pointer!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header select option{
      background:#2f2f2f!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header *:has(> select){
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      border-radius:7px!important;
      color:#ececec!important;
      box-shadow:none!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header *:has(> select)::before{
      background:#2f2f2f!important;
      color:#9ce8bf!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header *:has(> select)::after{
      color:#69d39d!important;
    }

    /* Guardar borrador y herramientas {} fuera */
    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary,
    body[data-page="logistica"].logistica-dark .logConversationReply__actions button:not(.btn--primary),
    body[data-page="logistica"].logistica-dark .logChatToolsBtn,
    body[data-page="logistica"].logistica-dark .logChatAttachBtn{
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
      align-items:center!important;
      justify-content:center!important;
      width:44px!important;
      height:44px!important;
      min-width:44px!important;
      border-radius:999px!important;
      padding:0!important;
      border:0!important;
      background:#2f6fe7!important;
      color:#ffffff!important;
      font-size:0!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--primary::before{
      content:"➤"!important;
      font-size:21px!important;
      line-height:1!important;
      transform:translateX(1px)!important;
    }

    /* Badges superiores con contraste fuerte */
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logStatusPill,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified{
      color:#ffffff!important;
      font-weight:900!important;
      text-shadow:none!important;
      opacity:1!important;
      filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logBadge *,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logStatusPill *,
    body[data-page="logistica"].logistica-dark .logConversationStatusRow .logConversationVerified *{
      color:#ffffff!important;
      opacity:1!important;
      filter:none!important;
    }

    /* ID con copia, sin alterar el contrato del slide */
    body[data-page="logistica"].logistica-dark #logConversationSlideSubtitle{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      max-width:100%!important;
      color:#cfcfcf!important;
      opacity:1!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderCopySafe{
      width:25px!important;
      height:25px!important;
      min-width:25px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      border-radius:6px!important;
      background:rgba(255,255,255,.08)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      cursor:pointer!important;
      padding:0!important;
      margin-left:8px!important;
      box-shadow:none!important;
      font-size:0!important;
      vertical-align:middle!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderCopySafe::before{
      content:"⧉"!important;
      font-size:14px!important;
      line-height:1!important;
    }
  `;

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
    }
    if (document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function hideRedundantHeaderText() {
    if (!isDark()) return;
    const header = document.querySelector('.logConversationSlide__header');
    if (!header) return;

    Array.from(header.children).forEach((node) => {
      if (node.matches('.logConversationSlide__close, .logConversationSlide__title')) return;
      if (node.querySelector('select')) return;
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text === 'Recibido' || text === '✓ Recibido' || /Estado logístico\s*•/i.test(text)) {
        node.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function cleanComposer() {
    if (!isDark()) return;
    document.querySelectorAll('.logConversationReply__actions .btn--secondary, .logChatToolsBtn, .logChatAttachBtn').forEach((node) => node.remove());
    document.querySelectorAll('.logConversationReply button').forEach((button) => {
      if (button.classList.contains('btn--primary')) return;
      const text = (button.textContent || '').trim().toLowerCase();
      if (text.includes('guardar borrador') || text === '{}' || text === '{ }') button.remove();
    });
  }

  function addCopyButton() {
    if (!isDark()) return;
    const subtitle = document.querySelector('#logConversationSlideSubtitle');
    if (!subtitle || subtitle.parentNode.querySelector('.logConversationHeaderCopySafe')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'logConversationHeaderCopySafe';
    button.setAttribute('aria-label', 'Copiar ID de conversación');
    button.setAttribute('title', 'Copiar ID');
    subtitle.insertAdjacentElement('afterend', button);
  }

  function bindCopy() {
    if (!isLogisticaPage() || document.body.dataset.logDarkSafeCopyBound === '1') return;
    document.body.dataset.logDarkSafeCopyBound = '1';
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.logConversationHeaderCopySafe');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const title = document.querySelector('#logConversationSlideTitle')?.textContent || '';
      const subtitle = document.querySelector('#logConversationSlideSubtitle')?.textContent || '';
      const id = `${title} ${subtitle}`.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || title.trim();
      if (id && navigator.clipboard?.writeText) navigator.clipboard.writeText(id).catch(() => {});
      button.setAttribute('title', 'Copiado');
      window.setTimeout(() => button.setAttribute('title', 'Copiar ID'), 1200);
    }, true);
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
    bindCopy();
    window.setTimeout(hideRedundantHeaderText, 0);
    window.setTimeout(hideRedundantHeaderText, 160);
    window.setTimeout(hideRedundantHeaderText, 480);
    window.setTimeout(cleanComposer, 0);
    window.setTimeout(cleanComposer, 160);
    window.setTimeout(cleanComposer, 480);
    window.setTimeout(addCopyButton, 0);
    window.setTimeout(addCopyButton, 160);
    window.setTimeout(addCopyButton, 480);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(boot, 160);
    window.setTimeout(boot, 480);
  }, true);
})();
