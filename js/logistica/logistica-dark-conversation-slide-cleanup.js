/* ==========================================================
   Protocol Data · Logística Dark · Conversation Slide Cleanup
   Correcciones puntuales seguras del slide de conversaciones.
   Mantiene vivos #logConversationSlideTitle y #logConversationSlideSubtitle.
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
    /* Header seguro: no borra nodos requeridos por openShell/renderDetail */
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

    body[data-page="logistica"].logistica-dark .logConversationSlide__title{
      min-width:0!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark #logConversationSlideTitle{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      width:fit-content!important;
      max-width:100%!important;
      min-height:36px!important;
      padding:0 10px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ffffff!important;
      font-size:15px!important;
      font-weight:900!important;
      letter-spacing:-.02em!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    body[data-page="logistica"].logistica-dark #logConversationSlideTitle::after{
      content:"✓ Recibido"!important;
      display:inline-flex!important;
      align-items:center!important;
      min-height:22px!important;
      padding:0 8px!important;
      border-radius:6px!important;
      background:rgba(68,180,116,.72)!important;
      border:1px solid rgba(68,180,116,.84)!important;
      color:#ffffff!important;
      font-size:12px!important;
      font-weight:900!important;
      line-height:1!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark #logConversationSlideSubtitle{
      display:inline-flex!important;
      align-items:center!important;
      gap:8px!important;
      width:fit-content!important;
      max-width:100%!important;
      min-height:32px!important;
      margin-top:5px!important;
      padding:0 10px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#cfcfcf!important;
      font-size:12px!important;
      font-weight:850!important;
      opacity:1!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
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

    body[data-page="logistica"].logistica-dark .logConversationHeaderStatusSafe{
      width:132px!important;
      min-height:36px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      box-shadow:none!important;
      justify-self:end!important;
      position:relative!important;
      overflow:hidden!important;
      display:flex!important;
      align-items:center!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderStatusSafe::before{
      content:"✓"!important;
      width:30px!important;
      align-self:stretch!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      color:#9ce8bf!important;
      background:#2f2f2f!important;
      border-right:1px solid rgba(255,255,255,.12)!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderStatusSafe select{
      appearance:none!important;
      -webkit-appearance:none!important;
      flex:1 1 auto!important;
      width:100%!important;
      min-width:0!important;
      height:36px!important;
      padding:0 24px 0 8px!important;
      border:0!important;
      outline:0!important;
      background:#2f2f2f!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-size:13px!important;
      font-weight:650!important;
      cursor:pointer!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderStatusSafe::after{
      content:"⌄"!important;
      position:absolute!important;
      right:9px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      color:#69d39d!important;
      font-size:13px!important;
      font-weight:900!important;
      pointer-events:none!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationHeaderStatusSafe select option{
      background:#2f2f2f!important;
      color:#ececec!important;
    }

    body[data-page="logistica"].logistica-dark .logConversationSlide__header .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header .logConversationVerified,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header .logStatusPill{
      display:none!important;
    }

    /* Composer limpio: solo textarea + enviar */
    body[data-page="logistica"].logistica-dark .logConversationReply__actions .btn--secondary,
    body[data-page="logistica"].logistica-dark .logConversationReply__actions button:not(.btn--primary),
    body[data-page="logistica"].logistica-dark .logChatToolsBtn,
    body[data-page="logistica"].logistica-dark .logChatAttachBtn{
      display:none!important;
      visibility:hidden!important;
      pointer-events:none!important;
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

    /* Badges superiores con contraste real */
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

  function currentConversationId() {
    const title = document.querySelector('#logConversationSlideTitle')?.textContent || '';
    const subtitle = document.querySelector('#logConversationSlideSubtitle')?.textContent || '';
    const combined = `${title} ${subtitle}`;
    const uuid = combined.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) return uuid[0];
    const conv = combined.match(/CONV-[A-Z0-9-]+/i);
    if (conv) return conv[0];
    return title.trim();
  }

  function currentConversationStatus() {
    const status = (document.querySelector('.logConversationStatusRow .logStatusPill, .logConversationStatusRow .logBadge')?.textContent || '').toLowerCase();
    if (status.includes('cerrada') || status.includes('respondida')) return 'Finalizada';
    return 'Abierta';
  }

  function enhanceHeader() {
    if (!isDark()) return;

    const header = document.querySelector('.logConversationSlide__header');
    const title = document.querySelector('#logConversationSlideTitle');
    const subtitle = document.querySelector('#logConversationSlideSubtitle');
    if (!header || !title || !subtitle) return;

    let copy = header.querySelector('.logConversationHeaderCopySafe');
    if (!copy) {
      copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'logConversationHeaderCopySafe';
      copy.setAttribute('aria-label', 'Copiar ID de conversación');
      copy.setAttribute('title', 'Copiar ID');
      subtitle.insertAdjacentElement('afterend', copy);
    }

    let slot = Array.from(header.children).find(node => node.getAttribute && node.getAttribute('aria-hidden') === 'true');
    if (!slot) {
      slot = document.createElement('div');
      header.appendChild(slot);
    }

    slot.removeAttribute('style');
    slot.setAttribute('aria-hidden', 'false');
    slot.className = 'logConversationHeaderStatusSafe';

    if (!slot.querySelector('select')) {
      slot.innerHTML = '<select aria-label="Estado de conversación"><option>Abierta</option><option>Finalizada</option></select>';
    }

    const select = slot.querySelector('select');
    if (select) select.value = currentConversationStatus();
  }

  function cleanComposer() {
    if (!isDark()) return;

    document.querySelectorAll('.logConversationReply__actions .btn--secondary, .logChatToolsBtn, .logChatAttachBtn').forEach((node) => {
      node.remove();
    });
  }

  function bindCopy() {
    if (!isLogisticaPage() || document.body.dataset.logDarkConversationCopyBound === '1') return;
    document.body.dataset.logDarkConversationCopyBound = '1';

    document.addEventListener('click', function (event) {
      const copy = event.target.closest('.logConversationHeaderCopySafe');
      if (!copy) return;

      event.preventDefault();
      event.stopPropagation();

      const id = currentConversationId();
      if (!id) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).catch(() => {});
      }

      copy.setAttribute('title', 'Copiado');
      window.setTimeout(() => copy.setAttribute('title', 'Copiar ID'), 1200);
    }, true);
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
    bindCopy();
    window.setTimeout(enhanceHeader, 0);
    window.setTimeout(enhanceHeader, 160);
    window.setTimeout(enhanceHeader, 480);
    window.setTimeout(cleanComposer, 0);
    window.setTimeout(cleanComposer, 160);
    window.setTimeout(cleanComposer, 480);
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

  document.addEventListener('change', function () {
    window.setTimeout(boot, 80);
  }, true);
})();
