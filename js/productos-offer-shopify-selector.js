/* PRODUCTOS · Ofertas · Selector Shopify multi variante */
(function () {
  const BUILD = 'PRODUCTOS_OFFER_SHOPIFY_SELECTOR_2026_07_04_02';
  const CATALOG_URL = 'https://cuuzsbhpjmjbbnghtiny.supabase.co/functions/v1/shopify-catalog-list';
  const ATTACH_VARIANT_RPC = 'rpc_products_attach_variant_to_commercial_offer';

  const State = {
    variants: [],
    selected: new Map(),
    loading: false,
    loaded: false,
    query: ''
  };

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function esc_(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money_(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '$ 0';
    return '$ ' + n.toLocaleString('es-AR', {
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2
    });
  }

  function client_() {
    return window.SazzuSupabase || null;
  }

  async function rpc_(name, params) {
    const client = client_();
    if (!client || typeof client.rpc !== 'function') throw new Error('Supabase no está disponible en el panel.');

    const res = await client.rpc(name, params || {});
    if (res && res.error) throw res.error;

    const payload = res && Object.prototype.hasOwnProperty.call(res, 'data') ? res.data : res;
    if (!payload) throw new Error('La RPC no devolvió respuesta.');
    if (payload.ok === false) throw new Error(payload.reason || payload.error || 'La RPC respondió ok:false.');
    return payload;
  }

  function currentOfferId_() {
    const btn = document.getElementById('prodOfferVariantSubmitBtn');
    return clean_(btn && btn.dataset && btn.dataset.commercialOfferId);
  }

  function offers_() {
    const payload = window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ || { items: [] };
    return Array.isArray(payload.items) ? payload.items : [];
  }

  function linkedVariantMap_() {
    const map = new Map();

    offers_().forEach(function (offer) {
      const offerId = clean_(offer && offer.commercial_offer_id);
      const offerName = clean_(offer && (offer.nombre_comercial || offer.nombre_interno || offer.codigo_oferta));
      const variants = Array.isArray(offer && offer.variants) ? offer.variants : [];

      variants.forEach(function (item) {
        const variantId = clean_(item && item.id_variante_shopify);
        if (!variantId) return;
        map.set(variantId, {
          offer_id: offerId,
          offer_name: offerName,
          contexto: clean_(item && item.contexto)
        });
      });
    });

    return map;
  }

  function injectCss_() {
    if (document.getElementById('prodOfferShopifySelectorCss')) return;

    const style = document.createElement('style');
    style.id = 'prodOfferShopifySelectorCss';
    style.textContent = `
      .prodOfferVariantPickerRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}.prodOfferVariantPickerRow #prodOfferVariantInput{min-width:0}.prodOfferShopifySelectBtn{border:0;background:#14b8a6;color:#fff;border-radius:5px;padding:0 13px;min-height:44px;font:inherit;font-size:13px;font-weight:950;cursor:pointer;white-space:nowrap;transition:transform .16s ease,background-color .16s ease}.prodOfferShopifySelectBtn:hover{background:#0f9f90;transform:translateY(-1px)}.prodOfferShopifySelectBtn:active{transform:translateY(0)}
      .prodOfferShopifySelectorOverlay{position:fixed;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(2px);z-index:10008;opacity:0;pointer-events:none;transition:opacity .18s ease}.prodOfferShopifySelectorOverlay.is-open{opacity:1;pointer-events:auto}.prodOfferShopifySelector{position:fixed;top:0;right:0;height:100vh;width:min(940px,calc(100vw - 360px));background:#fff;z-index:10009;box-shadow:-22px 0 54px rgba(15,23,42,.20);transform:translateX(104%);transition:transform .22s ease;display:flex;flex-direction:column;overflow:hidden;border-left:1px solid #e5e7eb}.prodOfferShopifySelector.is-open{transform:translateX(0)}
      .prodOfferShopifySelector__header{height:76px;flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:0 26px;border-bottom:1px solid #e5e7eb;background:#f8fafc}.prodOfferShopifySelector__back,.prodOfferShopifySelector__close{width:40px;height:40px;border:0;border-radius:5px;background:#fff;color:#111827;font-size:22px;font-weight:950;cursor:pointer;box-shadow:0 1px 7px rgba(15,23,42,.08)}.prodOfferShopifySelector__title{font-size:21px;font-weight:950;color:#111827;letter-spacing:-.03em}.prodOfferShopifySelector__spacer{flex:1}.prodOfferShopifySelector__body{flex:1;min-height:0;overflow:auto;background:#fff}.prodOfferShopifySelector__intro{padding:22px 26px;border-bottom:1px solid #e5e7eb;background:#fff}.prodOfferShopifySelector__eyebrow{color:#94a3b8;font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.prodOfferShopifySelector__headline{margin-top:6px;color:#111827;font-size:22px;font-weight:950;line-height:1.12;letter-spacing:-.03em}.prodOfferShopifySelector__desc{margin-top:8px;max-width:760px;color:#64748b;font-size:13px;font-weight:650;line-height:1.45}.prodOfferShopifySelector__toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);gap:10px;padding:14px 26px;border-bottom:1px solid #e5e7eb;background:#fff}.prodOfferShopifySelector__input{width:100%;min-height:40px;border:1px solid #dbe3ef;border-radius:5px;background:#fff;color:#111827;padding:0 12px;font:inherit;font-size:13px;font-weight:750;outline:none;box-sizing:border-box}.prodOfferShopifySelector__input:focus{border-color:rgba(36,121,255,.52);box-shadow:0 0 0 3px rgba(36,121,255,.10)}
      .prodOfferShopifySelector__list{background:#fff}.prodOfferShopifySelector__row{display:grid;grid-template-columns:minmax(0,1fr) 150px 152px;gap:18px;align-items:center;min-height:86px;padding:16px 26px;border-bottom:1px solid #e5e7eb;background:#fff;cursor:pointer;transition:background-color .16s ease,box-shadow .16s ease}.prodOfferShopifySelector__row:not(.is-linked):hover{background:#f8fbff;box-shadow:inset 3px 0 0 #2479ff}.prodOfferShopifySelector__row.is-selected{background:#f0f7ff;box-shadow:inset 3px 0 0 #2479ff}.prodOfferShopifySelector__row.is-linked{background:#f8fafc;opacity:.66;cursor:not-allowed}.prodOfferShopifySelector__name{color:#111827;font-size:14px;font-weight:950;line-height:1.2}.prodOfferShopifySelector__sku{margin-top:5px;color:#94a3b8;font-size:12px;font-weight:850;line-height:1.2}.prodOfferShopifySelector__meta{margin-top:6px;color:#64748b;font-size:11px;font-weight:750;line-height:1.3}.prodOfferShopifySelector__price{text-align:right}.prodOfferShopifySelector__price span{display:block;color:#94a3b8;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.prodOfferShopifySelector__price strong{display:block;margin-top:5px;color:#111827;font-size:15px;font-weight:950}.prodOfferShopifySelector__action{display:flex;justify-content:flex-end}.prodOfferShopifySelector__toggle,.prodOfferShopifySelector__badge{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border-radius:5px;font:inherit;font-size:12px;font-weight:950;white-space:nowrap}.prodOfferShopifySelector__toggle{border:0;background:#2479ff;color:#fff;cursor:pointer}.prodOfferShopifySelector__row.is-selected .prodOfferShopifySelector__toggle{background:#111827}.prodOfferShopifySelector__badge{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0}.prodOfferShopifySelector__footer{flex:0 0 auto;display:flex;align-items:center;gap:12px;justify-content:space-between;padding:14px 26px;border-top:1px solid #e5e7eb;background:#fff}.prodOfferShopifySelector__count{color:#64748b;font-size:13px;font-weight:850}.prodOfferShopifySelector__primary{border:0;background:#2479ff;color:#fff;border-radius:5px;min-height:42px;padding:0 16px;font:inherit;font-size:13px;font-weight:950;cursor:pointer}.prodOfferShopifySelector__primary:disabled{opacity:.55;cursor:not-allowed}.prodOfferShopifySelector__status{padding:18px 26px;border-bottom:1px solid #e5e7eb;background:#f8fafc;color:#64748b;font-size:13px;font-weight:850}.prodOfferShopifySelector__status.is-error{background:#fff1f0;color:#b42318}
      @media(max-width:900px){.prodOfferShopifySelector{width:calc(100vw - 24px)}.prodOfferShopifySelector__toolbar{grid-template-columns:1fr}.prodOfferShopifySelector__row{grid-template-columns:1fr;gap:9px}.prodOfferShopifySelector__price{text-align:left}.prodOfferShopifySelector__action{justify-content:flex-start}}@media(max-width:640px){.prodOfferVariantPickerRow{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureSelector_() {
    injectCss_();

    let overlay = document.getElementById('prodOfferShopifySelectorOverlay');
    let panel = document.getElementById('prodOfferShopifySelector');

    if (overlay && panel) return panel;

    overlay = document.createElement('div');
    overlay.id = 'prodOfferShopifySelectorOverlay';
    overlay.className = 'prodOfferShopifySelectorOverlay';

    panel = document.createElement('aside');
    panel.id = 'prodOfferShopifySelector';
    panel.className = 'prodOfferShopifySelector';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="prodOfferShopifySelector__header">
        <button type="button" class="prodOfferShopifySelector__back" id="prodOfferShopifySelectorBackBtn" aria-label="Volver">‹</button>
        <div class="prodOfferShopifySelector__title">Seleccionar variantes Shopify</div>
        <div class="prodOfferShopifySelector__spacer"></div>
        <button type="button" class="prodOfferShopifySelector__close" id="prodOfferShopifySelectorCloseBtn" aria-label="Cerrar">×</button>
      </div>
      <div class="prodOfferShopifySelector__body">
        <div class="prodOfferShopifySelector__intro">
          <div class="prodOfferShopifySelector__eyebrow">Shopify → Oferta Comercial</div>
          <div class="prodOfferShopifySelector__headline">Vincular variantes a esta oferta</div>
          <div class="prodOfferShopifySelector__desc">Seleccioná una o varias variantes Shopify para que las ventas entrantes resuelvan esta oferta comercial. Las variantes ya usadas en otra oferta quedan bloqueadas.</div>
        </div>
        <div class="prodOfferShopifySelector__toolbar">
          <input class="prodOfferShopifySelector__input" id="prodOfferShopifySelectorSearch" type="search" placeholder="Buscar por producto, SKU, variant_id o tipo..." aria-label="Buscar variante Shopify">
          <input class="prodOfferShopifySelector__input" id="prodOfferShopifySelectorContext" type="text" placeholder="Contexto común. Ej: Landing A · Meta Ads" aria-label="Contexto común de variantes">
        </div>
        <div class="prodOfferShopifySelector__list" id="prodOfferShopifySelectorList"></div>
      </div>
      <div class="prodOfferShopifySelector__footer">
        <div class="prodOfferShopifySelector__count" id="prodOfferShopifySelectorCount">0 variantes seleccionadas</div>
        <button type="button" class="prodOfferShopifySelector__primary" id="prodOfferShopifySelectorAttachBtn" disabled>Vincular seleccionadas</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    return panel;
  }

  function openSelector_() {
    const offerId = currentOfferId_();
    if (!offerId) return setDrawerStatus_('No se encontró la oferta actual para vincular variantes.', 'error');

    ensureSelector_();
    State.selected.clear();

    const contextInput = document.getElementById('prodOfferShopifySelectorContext');
    const drawerContext = document.getElementById('prodOfferVariantContextInput');
    if (contextInput && drawerContext) contextInput.value = clean_(drawerContext.value);

    document.getElementById('prodOfferShopifySelectorOverlay')?.classList.add('is-open');
    const panel = document.getElementById('prodOfferShopifySelector');
    if (panel) {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
    }

    setTimeout(loadCatalog_, 80);
  }

  function closeSelector_() {
    document.getElementById('prodOfferShopifySelectorOverlay')?.classList.remove('is-open');
    const panel = document.getElementById('prodOfferShopifySelector');
    if (panel) {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    }
  }

  function setDrawerStatus_(message, kind) {
    const status = document.getElementById('prodOfferDrawerStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = 'prodOfferDrawerStatus' + (kind ? ' is-' + kind : '');
  }

  function listEl_() { return document.getElementById('prodOfferShopifySelectorList'); }
  function searchEl_() { return document.getElementById('prodOfferShopifySelectorSearch'); }

  function selectorStatusHtml_(message, kind) {
    return '<div class="prodOfferShopifySelector__status ' + (kind === 'error' ? 'is-error' : '') + '">' + esc_(message) + '</div>';
  }

  function isLinked_(variantId) {
    return linkedVariantMap_().get(clean_(variantId)) || null;
  }

  function rowHtml_(variant) {
    const variantId = clean_(variant.variant_id);
    const linked = isLinked_(variantId);
    const selected = State.selected.has(variantId);
    const title = clean_(variant.title || variant.product_title || 'Producto Shopify');
    const sku = clean_(variant.sku) || 'SKU no informado en Shopify';
    const productId = clean_(variant.product_id) || 'pendiente';
    const price = money_(variant.price);
    const currentOffer = currentOfferId_();
    const linkedText = linked
      ? (linked.offer_id === currentOffer ? 'Ya en esta oferta' : 'Ya vinculado')
      : '';

    return `
      <div class="prodOfferShopifySelector__row ${linked ? 'is-linked' : ''} ${selected ? 'is-selected' : ''}" data-offer-shopify-variant-id="${esc_(variantId)}">
        <div>
          <div class="prodOfferShopifySelector__name">${esc_(title)}</div>
          <div class="prodOfferShopifySelector__sku">SKU Shopify: ${esc_(sku)}</div>
          <div class="prodOfferShopifySelector__meta">product_id: ${esc_(productId)} · variant_id: ${esc_(variantId)}${linked ? ' · ' + esc_(linked.offer_name || linkedText) : ''}</div>
        </div>
        <div class="prodOfferShopifySelector__price">
          <span>Precio Shopify</span>
          <strong>${esc_(price)}</strong>
        </div>
        <div class="prodOfferShopifySelector__action">
          ${linked
            ? `<span class="prodOfferShopifySelector__badge">${esc_(linkedText)}</span>`
            : `<button type="button" class="prodOfferShopifySelector__toggle">${selected ? 'Seleccionado' : 'Seleccionar'}</button>`}
        </div>
      </div>
    `;
  }

  function filteredVariants_() {
    const query = clean_(State.query).toLowerCase();
    if (!query) return State.variants;

    return State.variants.filter(function (variant) {
      const haystack = [
        variant.title,
        variant.product_title,
        variant.variant_title,
        variant.sku,
        variant.product_id,
        variant.variant_id,
        variant.product_type,
        variant.vendor,
        variant.status
      ].map(clean_).join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }

  function render_() {
    const list = listEl_();
    if (!list) return;

    const rows = filteredVariants_();
    if (!rows.length) {
      list.innerHTML = selectorStatusHtml_('No se encontraron variantes Shopify para mostrar.', 'empty');
    } else {
      list.innerHTML = rows.map(rowHtml_).join('');
    }

    updateFooter_();
  }

  function updateFooter_() {
    const count = document.getElementById('prodOfferShopifySelectorCount');
    const btn = document.getElementById('prodOfferShopifySelectorAttachBtn');
    const selectedCount = State.selected.size;

    if (count) count.textContent = selectedCount === 1 ? '1 variante seleccionada' : selectedCount + ' variantes seleccionadas';
    if (btn) btn.disabled = selectedCount <= 0;
  }

  async function loadCatalog_() {
    const list = listEl_();
    if (!list || State.loading) return;

    if (State.loaded && State.variants.length) {
      render_();
      return;
    }

    State.loading = true;
    list.innerHTML = selectorStatusHtml_('Leyendo variantes reales de Shopify...', 'loading');

    try {
      const res = await fetch(CATALOG_URL + '?limit=100', { method: 'GET', headers: { Accept: 'application/json' } });
      const json = await res.json().catch(function () { return {}; });
      if (!res.ok || !json.ok) throw new Error(json.message || 'No se pudo leer el catálogo Shopify.');

      State.variants = Array.isArray(json.variants) ? json.variants : [];
      State.loaded = true;
      render_();
    } catch (error) {
      list.innerHTML = selectorStatusHtml_(error && error.message ? error.message : 'No se pudo leer el catálogo Shopify.', 'error');
    } finally {
      State.loading = false;
    }
  }

  function toggleVariant_(variantId) {
    const id = clean_(variantId);
    if (!id || isLinked_(id)) return;

    const variant = State.variants.find(function (item) { return clean_(item.variant_id) === id; });
    if (!variant) return;

    if (State.selected.has(id)) State.selected.delete(id);
    else State.selected.set(id, variant);

    render_();
  }

  async function attachSelected_() {
    const offerId = currentOfferId_();
    const btn = document.getElementById('prodOfferShopifySelectorAttachBtn');
    const contextInput = document.getElementById('prodOfferShopifySelectorContext');
    const context = clean_(contextInput && contextInput.value);
    const selected = Array.from(State.selected.values());

    if (!offerId || !selected.length) return;

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Vinculando...';
      }

      for (const variant of selected) {
        const variantId = clean_(variant.variant_id);
        if (!variantId || isLinked_(variantId)) continue;

        await rpc_(ATTACH_VARIANT_RPC, {
          input_mapping: {
            commercial_offer_id: offerId,
            id_variante_shopify: variantId,
            contexto: context || clean_(variant.title || variant.product_title) || undefined,
            estado: 'active'
          }
        });
      }

      State.selected.clear();
      if (window.ProductosOfferDetailDrawer && typeof window.ProductosOfferDetailDrawer.reloadCommercialOffers === 'function') {
        await window.ProductosOfferDetailDrawer.reloadCommercialOffers();
      }
      if (window.ProductosOfferDetailDrawer && typeof window.ProductosOfferDetailDrawer.open === 'function') {
        window.ProductosOfferDetailDrawer.open(offerId);
      }

      closeSelector_();
      setDrawerStatus_('Variantes Shopify vinculadas correctamente.', 'success');
    } catch (error) {
      const message = error && error.message ? error.message : 'No se pudieron vincular las variantes Shopify.';
      setDrawerStatus_(message, 'error');
      alert('Error vinculando variantes Shopify: ' + message);
    } finally {
      if (btn) {
        btn.textContent = 'Vincular seleccionadas';
        updateFooter_();
      }
    }
  }

  function bindSelectorEvents_() {
    if (document.body.dataset.prodOfferShopifySelectorEvents === BUILD) return;
    document.body.dataset.prodOfferShopifySelectorEvents = BUILD;

    document.addEventListener('click', function (event) {
      const close = event.target && event.target.closest ? event.target.closest('#prodOfferShopifySelectorBackBtn, #prodOfferShopifySelectorCloseBtn, #prodOfferShopifySelectorOverlay') : null;
      if (close) {
        event.preventDefault();
        closeSelector_();
        return;
      }

      const row = event.target && event.target.closest ? event.target.closest('.prodOfferShopifySelector__row') : null;
      if (row && !row.classList.contains('is-linked')) {
        event.preventDefault();
        toggleVariant_(row.dataset.offerShopifyVariantId);
        return;
      }

      const attach = event.target && event.target.closest ? event.target.closest('#prodOfferShopifySelectorAttachBtn') : null;
      if (attach) {
        event.preventDefault();
        attachSelected_();
      }
    }, true);

    document.addEventListener('input', function (event) {
      if (!event.target || event.target.id !== 'prodOfferShopifySelectorSearch') return;
      State.query = event.target.value || '';
      render_();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSelector_();
    });
  }

  function wireDrawer_() {
    const input = document.getElementById('prodOfferVariantInput');
    if (!input || input.dataset.shopifySelectorReady === '1') return;

    input.dataset.shopifySelectorReady = '1';

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
    btn.addEventListener('click', openSelector_);

    row.appendChild(btn);
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    injectCss_();
    ensureSelector_();
    bindSelectorEvents_();
    wireDrawer_();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  const observer = new MutationObserver(function () { init_(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('sazzu:page:load', function () { setTimeout(init_, 120); });

  window.ProductosOfferShopifySelector = { build: BUILD, refresh: init_, open: openSelector_, close: closeSelector_ };
})();
