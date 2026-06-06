/* Protocol Data · Logística · Conversaciones · ajuste fino de header y burbujas */
(function () {
  const READY = '__logConversationHeaderFineTuneReady';
  const PAGE_EVENT = 'sazzu:page:load';

  function esc(value) {
    return String(value == null || value === '' ? '—' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  function text(el) {
    return (el && el.textContent || '').trim();
  }

  function ensureStyles() {
    if (document.getElementById('logConversationHeaderFineTuneStyles')) return;

    const style = document.createElement('style');
    style.id = 'logConversationHeaderFineTuneStyles';
    style.textContent = `
      #logConversationSlide .logConversationSlide__header {
        background: #EDEDED !important;
        color: #252A32 !important;
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
        border-bottom: 1px solid #DCE2EA !important;
      }

      #logConversationSlide .logConversationSlide__header > div[style*="width:38px"] {
        display: none !important;
      }

      #logConversationSlide .logConversationSlide__title {
        flex: 1 1 auto !important;
        width: 100% !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 14px !important;
        min-width: 0 !important;
      }

      #logConversationSlide .logConversationHeaderMain {
        min-width: 0 !important;
        display: grid !important;
        gap: 3px !important;
      }

      #logConversationSlide .logConversationHeaderMain strong {
        display: block !important;
        color: #252A32 !important;
        font-size: 17px !important;
        line-height: 1.1 !important;
        font-weight: 950 !important;
        letter-spacing: -0.02em !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #logConversationSlide .logConversationHeaderMain span {
        display: block !important;
        color: #697386 !important;
        font-size: 12px !important;
        line-height: 1.15 !important;
        font-weight: 850 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #logConversationSlide .logConversationHeaderId {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        max-width: 330px !important;
        padding: 7px 9px !important;
        border-radius: 5px !important;
        border: 1px solid #DFE5EE !important;
        background: #F4F6F9 !important;
        color: #697386 !important;
        font-size: 11px !important;
        line-height: 1 !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      #logConversationSlide .logConversationCopyId {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        padding: 0 !important;
        border-radius: 5px !important;
        border: 1px solid #DFE5EE !important;
        background: #FFFFFF !important;
        color: #2479FF !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 13px !important;
        line-height: 1 !important;
        cursor: pointer !important;
      }

      #logConversationSlide .logConversationBubble--customer::after {
        content: "" !important;
        position: absolute !important;
        left: -4px !important;
        right: auto !important;
        bottom: 1px !important;
        width: 13px !important;
        height: 13px !important;
        background: #FFFFFF !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        clip-path: polygon(100% 0, 0 100%, 100% 100%) !important;
      }

      #logConversationSlide .logConversationBubble--operator::after {
        content: "" !important;
        position: absolute !important;
        right: -4px !important;
        left: auto !important;
        bottom: 1px !important;
        width: 13px !important;
        height: 13px !important;
        background: #2479FF !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        clip-path: polygon(0 0, 0 100%, 100% 100%) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function enhanceHeader() {
    const slide = document.getElementById('logConversationSlide');
    if (!slide || !slide.classList.contains('is-open')) return;

    const titleEl = slide.querySelector('#logConversationSlideTitle');
    const subtitleEl = slide.querySelector('#logConversationSlideSubtitle');
    if (!titleEl || !subtitleEl) return;

    const currentIdFromDataset = slide.querySelector('[data-log-conversation-reply-real]')?.dataset?.logConversationReplyReal;
    const currentHeaderId = titleEl.querySelector('[data-log-copy-conversation-id]')?.dataset?.logCopyConversationId;
    const conversationId = currentIdFromDataset || currentHeaderId || text(titleEl);

    if (!conversationId || titleEl.dataset.fineTuneConversationId === conversationId) return;

    const rawSubtitle = text(subtitleEl);
    const parts = rawSubtitle.split('·').map(function (x) { return x.trim(); }).filter(Boolean);
    const clientName = parts[0] || 'Cliente';
    const trackingId = parts[1] || 'Sin tracking';

    titleEl.innerHTML =
      '<span class="logConversationHeaderMain">' +
        '<strong>' + esc(clientName) + '</strong>' +
        '<span>' + esc(trackingId) + '</span>' +
      '</span>' +
      '<span class="logConversationHeaderId" title="' + esc(conversationId) + '">' +
        'ID ' + esc(conversationId) +
        '<button class="logConversationCopyId" type="button" data-log-copy-conversation-id="' + esc(conversationId) + '" title="Copiar ID">▣</button>' +
      '</span>';

    subtitleEl.style.display = 'none';
    titleEl.dataset.fineTuneConversationId = conversationId;
  }

  function bind() {
    if (window[READY]) return;
    window[READY] = true;
    ensureStyles();

    document.addEventListener('click', function (event) {
      const copy = event.target.closest('[data-log-copy-conversation-id]');
      if (!copy) return;
      event.preventDefault();
      event.stopPropagation();
      navigator.clipboard?.writeText(copy.dataset.logCopyConversationId || '');
      copy.textContent = '✓';
      setTimeout(function () { copy.textContent = '▣'; }, 900);
    }, true);

    setInterval(enhanceHeader, 500);
  }

  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener(PAGE_EVENT, bind);
  if (document.readyState !== 'loading') bind();
})();
