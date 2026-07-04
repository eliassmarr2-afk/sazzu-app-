/* PRODUCTOS · Ofertas · Selector Shopify visual inicial */
(function () {
  const BUILD = 'PRODUCTOS_OFFER_SHOPIFY_SELECTOR_2026_07_04_01';

  function injectCss_() {
    if (document.getElementById('prodOfferShopifySelectorCss')) return;

    const style = document.createElement('style');
    style.id = 'prodOfferShopifySelectorCss';
    style.textContent = `
      .prodOfferVariantPickerRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: stretch;
      }

      .prodOfferVariantPickerRow #prodOfferVariantInput {
        min-width: 0;
      }

      .prodOfferShopifySelectBtn {
        border: 0;
        background: #14b8a6;
        color: #ffffff;
        border-radius: 5px;
        padding: 0 13px;
        min-height: 44px;
        font: inherit;
        font-size: 13px;
        font-weight: 950;
        cursor: pointer;
        white-space: nowrap;
        transition: transform .16s ease, background-color .16s ease;
      }

      .prodOfferShopifySelectBtn:hover {
        background: #0f9f90;
        transform: translateY(-1px);
      }

      .prodOfferShopifySelectBtn:active {
        transform: translateY(0);
      }

      @media (max-width: 640px) {
        .prodOfferVariantPickerRow {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setStatus_(message) {
    const status = document.getElementById('prodOfferDrawerStatus');
    if (!status) return;
    status.textContent = message;
    status.className = 'prodOfferDrawerStatus';
  }

  function wireDrawer_() {
    const input = document.getElementById('prodOfferVariantInput');
    if (!input || input.dataset.shopifySelectorReady === '1') return;

    input.dataset.shopifySelectorReady = '1';

    const form = input.closest('.prodOfferAttachForm');
    if (!form) return;

    const row = document.createElement('div');
    row.className = 'prodOfferVariantPickerRow';

    input.parentNode.insertBefore(row, input);
    row.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prodOfferShopifySelectBtn';
    btn.id = 'prodOfferShopifySelectBtn';
    btn.textContent = 'Seleccionar desde Shopify';
    btn.setAttribute('aria-label', 'Seleccionar variante desde Shopify');

    btn.addEventListener('click', function () {
      setStatus_('Selector Shopify preparado. Próximo paso: abrir catálogo real de variantes y completar este ID automáticamente.');
    });

    row.appendChild(btn);
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    injectCss_();
    wireDrawer_();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  const observer = new MutationObserver(function () {
    init_();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('sazzu:page:load', function () { setTimeout(init_, 120); });
  window.ProductosOfferShopifySelector = { build: BUILD, refresh: init_ };
})();
