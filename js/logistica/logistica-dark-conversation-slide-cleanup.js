/* ==========================================================
   Protocol Data · Logística Dark · Conversation Slide Cleanup
   Correcciones puntuales del slide de conversaciones.
   No cambia tamaño, ancho, alto, posición, inset ni transform.
   No toca Supabase, mensajes, envío ni estados funcionales.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkConversationSlideCleanupStyles';
  const NORMALIZED_ATTR = 'data-log-dark-header-normalized';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function isDark() {
    return isLogisticaPage() && document.body.classList.contains('logistica-dark');
  }

  const css = `
    /* Header normalizado: no cambia tamaño del slide, solo orden interno */
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader{
      display:grid!important;
      grid-template-columns:44px minmax(210px,auto) minmax(260px,1fr) 164px!important;
      align-items:center!important;
      gap:10px!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__state,
    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__id,
    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__selectWrap{
      min-height:38px!important;
      border-radius:7px!important;
      background:#2f2f2f!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      box-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__state{
      display:inline-flex!important;
      align-items:center!important;
      gap:9px!important;
      padding:0 12px!important;
      white-space:nowrap!important;
      min-width:210px!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__stateTitle{
      color:#ffffff!important;
      font-size:15px!important;
      font-weight:900!important;
      letter-spacing:-.02em!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__stateBadge{
      display:inline-flex!important;
      align-items:center!important;
      gap:5px!important;
      min-height:22px!important;
      padding:0 8px!important;
      border-radius:6px!important;
      background:rgba(68,180,116,.72)!important;
      border:1px solid rgba(68,180,116,.84)!important;
      color:#ffffff!important;
      font-size:12px!important;
      font-weight:900!important;
      line-height:1!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__id{
      display:flex!important;
      align-items:center!important;
      gap:8px!important;
      padding:0 9px 0 12px!important;
      min-width:0!important;
      overflow:hidden!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__idText{
      min-width:0!important;
      flex:1 1 auto!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
      color:#cfcfcf!important;
      font-size:12px!important;
      font-weight:850!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__copy{
      width:27px!important;
      height:27px!important;
      min-width:27px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      border-radius:6px!important;
      background:rgba(255,255,255,.08)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#ececec!important;
      cursor:pointer!important;
      padding:0!important;
      box-shadow:none!important;
      font-size:0!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__copy::before{
      content:"⧉"!important;
      font-size:15px!important;
      line-height:1!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__copy:hover{
      background:rgba(255,255,255,.12)!important;
      border-color:rgba(255,255,255,.26)!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__selectWrap{
      position:relative!important;
      display:flex!important;
      align-items:center!important;
      width:164px!important;
      max-width:164px!important;
      overflow:hidden!important;
      justify-self:end!important;
      background:#2f2f2f!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__selectWrap::before{
      content:"✓"!important;
      width:32px!important;
      height:100%!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      color:#9ce8bf!important;
      font-size:14px!important;
      font-weight:900!important;
      background:#2f2f2f!important;
      border-right:1px solid rgba(255,255,255,.12)!important;
      flex:0 0 auto!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__select{
      appearance:none!important;
      -webkit-appearance:none!important;
      flex:1 1 auto!important;
      min-width:0!important;
      height:100%!important;
      min-height:38px!important;
      margin:0!important;
      padding:0 28px 0 10px!important;
      border:0!important;
      outline:0!important;
      border-radius:0!important;
      background:#2f2f2f!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-size:13px!important;
      font-weight:650!important;
      cursor:pointer!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__selectWrap::after{
      content:"⌄"!important;
      position:absolute!important;
      right:10px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      color:#69d39d!important;
      font-size:13px!important;
      font-weight:900!important;
      pointer-events:none!important;
    }

    body[data-page="logistica"].logistica-dark .logDarkConversationHeader__select option{
      background:#2f2f2f!important;
      color:#ececec!important;
    }

    /* Ocultar redundancias previas del encabezado */
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader .logConversationSlide__title,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader .logBadge,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader .logConversationVerified,
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader [class*="StatusPill"],
    body[data-page="logistica"].logistica-dark .logConversationSlide__header.logDarkConversationHeader [class*="statusPill"]{
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

  function extractText(selector) {
    return (document.querySelector(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findConversationId() {
    const candidates = [
      extractText('#logConversationSlideTitle'),
      extractText('#logConversationSlideSubtitle'),
      extractText('.logConversationDataItem strong')
    ].join(' ');

    const uuid = candidates.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) return uuid[0];

    const conv = candidates.match(/CONV-[A-Z0-9-]+/i);
    if (conv) return conv[0];

    return extractText('#logConversationSlideTitle') || 'Conversación';
  }

  function findLogisticStatus() {
    const dataItems = Array.from(document.querySelectorAll('.logConversationDataItem'));
    const item = dataItems.find(node => /estado\s+env[ií]o/i.test(node.querySelector('span')?.textContent || ''));
    const value = (item?.querySelector('strong')?.textContent || '').replace(/\s+/g, ' ').trim();
    if (value && value !== '—') return value;

    const status = extractText('.logConversationStatusRow .logStatusPill, .logConversationStatusRow .logBadge');
    return status || 'Recibido';
  }

  function findConversationStatus() {
    const status = extractText('.logConversationStatusRow .logStatusPill, .logConversationStatusRow .logBadge').toLowerCase();
    if (status.includes('cerrada') || status.includes('respondida')) return 'Finalizada';
    return 'Abierta';
  }

  function normalizeHeader() {
    if (!isDark()) return;

    const header = document.querySelector('.logConversationSlide__header');
    const close = document.querySelector('#logConversationSlideClose');
    if (!header || !close) return;

    const conversationId = findConversationId();
    const logisticStatus = findLogisticStatus();
    const conversationStatus = findConversationStatus();
    const previousId = header.getAttribute('data-log-dark-conversation-id') || '';
    const previousStatus = header.getAttribute('data-log-dark-logistic-status') || '';

    if (header.getAttribute(NORMALIZED_ATTR) === '1' && previousId === conversationId && previousStatus === logisticStatus) return;

    header.classList.add('logDarkConversationHeader');
    header.setAttribute(NORMALIZED_ATTR, '1');
    header.setAttribute('data-log-dark-conversation-id', conversationId);
    header.setAttribute('data-log-dark-logistic-status', logisticStatus);

    const currentSelectValue = conversationStatus === 'Finalizada' ? 'Finalizada' : 'Abierta';

    header.innerHTML = '';
    header.appendChild(close);

    const stateCard = document.createElement('div');
    stateCard.className = 'logDarkConversationHeader__state';
    stateCard.innerHTML = `<span class="logDarkConversationHeader__stateTitle">Estado logístico</span><span class="logDarkConversationHeader__stateBadge">✓ ${logisticStatus}</span>`;
    header.appendChild(stateCard);

    const idCard = document.createElement('div');
    idCard.className = 'logDarkConversationHeader__id';
    idCard.innerHTML = `<span class="logDarkConversationHeader__idText">ID ${conversationId}</span><button class="logDarkConversationHeader__copy" type="button" aria-label="Copiar ID de conversación" title="Copiar ID"></button>`;
    header.appendChild(idCard);

    const selectWrap = document.createElement('div');
    selectWrap.className = 'logDarkConversationHeader__selectWrap';
    selectWrap.innerHTML = `<select class="logDarkConversationHeader__select" aria-label="Estado de conversación"><option${currentSelectValue === 'Abierta' ? ' selected' : ''}>Abierta</option><option${currentSelectValue === 'Finalizada' ? ' selected' : ''}>Finalizada</option></select>`;
    header.appendChild(selectWrap);
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

  function bindCopy() {
    if (!isLogisticaPage() || document.body.dataset.logDarkConversationCopyBound === '1') return;
    document.body.dataset.logDarkConversationCopyBound = '1';

    document.addEventListener('click', function (event) {
      const copy = event.target.closest('.logDarkConversationHeader__copy');
      if (!copy) return;

      event.preventDefault();
      event.stopPropagation();

      const id = copy.closest('.logDarkConversationHeader__id')?.querySelector('.logDarkConversationHeader__idText')?.textContent?.replace(/^ID\s+/i, '').trim();
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
    window.setTimeout(normalizeHeader, 0);
    window.setTimeout(normalizeHeader, 160);
    window.setTimeout(normalizeHeader, 480);
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
