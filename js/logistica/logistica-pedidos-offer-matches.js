/* Protocol Data · Logística Pedidos · Cruce de oferta */
(function () {
  'use strict';

  const BUILD = 'LOGISTICA_PEDIDOS_OFFER_MATCHES_20260703_04';
  const RPC = 'rpc_products_order_offer_matches_lookup';
  const state = { loading: false, loadedKey: '', items: [], byName: new Map(), currentTracking: '' };

  function page() { return !!document.querySelector('body[data-page="logistica"]'); }
  function root() { return document.querySelector('main.logisticsMain') || document; }
  function text(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function uniq(arr) { return Array.from(new Set((arr || []).map(text).filter(Boolean))); }
  function ordersState() { return window.__protocolLogisticaPedidosState || { orders: [] }; }
  function orders() { return Array.isArray(ordersState().orders) ? ordersState().orders : []; }
  function orderName(order) { return text(order && (order.shopify_order_name || order.order_name || order.name)); }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const c = window.ProtocolAuth.getClient();
      if (c) return c;
    }
    if (window.__protocolLogisticaPedidosClient) return window.__protocolLogisticaPedidosClient;
    if (window.__logisticaOfferMatchesClient) return window.__logisticaOfferMatchesClient;
    const cfg = window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
    const key = cfg && (cfg.anonKey || cfg.publishableKey || cfg.key);
    if (!window.supabase || !cfg || !cfg.url || !key) return null;
    window.__logisticaOfferMatchesClient = window.supabase.createClient(cfg.url, key);
    return window.__logisticaOfferMatchesClient;
  }

  function rebuild(items) {
    state.items = Array.isArray(items) ? items : [];
    state.byName = new Map();
    state.items.forEach(function (item) {
      const name = text(item.shopify_order_name);
      if (!name) return;
      const list = state.byName.get(name) || [];
      list.push(item);
      state.byName.set(name, list);
    });
  }

  async function hydrate() {
    if (!page() || state.loading) return;
    const names = uniq(orders().map(orderName));
    const key = names.join('|');
    if (!names.length) return;
    if (key === state.loadedKey && state.items.length) return;
    const c = client();
    if (!c) return;

    state.loading = true;
    try {
      const res = await c.rpc(RPC, { input_lookup: { order_ids: [], order_names: names } });
      if (res.error) throw res.error;
      const payload = res.data || {};
      rebuild(Array.isArray(payload.items) ? payload.items : []);
      state.loadedKey = key;
      window.__LOGISTICA_PEDIDOS_OFFER_MATCHES__ = state;
    } catch (err) {
      console.warn('[Logística Offer Matches]', err);
    } finally {
      state.loading = false;
    }
  }

  function primary(order) {
    const list = state.byName.get(orderName(order)) || [];
    return list.find(x => x.match_status === 'matched') || list[0] || null;
  }

  function badge(match) {
    if (!match) return '<span class="logOfferBadge logOfferBadge--gray">SKU directo</span>';
    const label = text(match.classification_badge) || 'Oferta';
    const lower = label.toLowerCase();
    const cls = lower.includes('pack') ? 'logOfferBadge--purple' : (lower.includes('cant') ? 'logOfferBadge--green' : 'logOfferBadge--blue');
    return '<span class="logOfferBadge ' + cls + '">' + esc(label) + '</span>';
  }

  function injectCss() {
    if (document.getElementById('logisticaPedidosOfferMatchesCss')) return;
    const css = document.createElement('style');
    css.id = 'logisticaPedidosOfferMatchesCss';
    css.textContent = `
      .logOfferCard{border-radius:5px;background:#fff;border:1px solid #e6edf7;padding:14px;margin:0 0 12px;color:#111827}.logOfferCard h3{margin:0 0 12px;color:#111827;font-size:15px;font-weight:950}.logOfferHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #e6edf7}.logOfferHeader strong{display:block;color:#111827;font-size:13px;font-weight:950}.logOfferHeader span{display:block;margin-top:4px;color:#526176;font-size:12px;font-weight:750;line-height:1.35}.logOfferBadge{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:950;white-space:nowrap}.logOfferBadge--purple{background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff}.logOfferBadge--green{background:#ecfdf3;color:#067647;border:1px solid #b7e4c7}.logOfferBadge--blue{background:#eaf2ff;color:#2479ff;border:1px solid #cfe0ff}.logOfferBadge--gray{background:#f2f4f7;color:#667085;border:1px solid #e4e7ec}.logOfferGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 0;border-bottom:1px solid #e6edf7}.logOfferMetric span{display:block;color:#8a98ae;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.logOfferMetric strong{display:block;margin-top:4px;color:#111827;font-size:13px;font-weight:900;line-height:1.25;word-break:break-word}.logOfferComponentsTitle{padding-top:12px;color:#8a98ae;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.logOfferComponent{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid #edf2fa}.logOfferComponent:last-child{border-bottom:0}.logOfferQty{display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:5px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:950}.logOfferSku{display:block;color:#111827;font-size:13px;font-weight:950;line-height:1.25}.logOfferName{display:block;margin-top:3px;color:#526176;font-size:12px;font-weight:750;line-height:1.35}.logOfferEmpty{border:1px dashed #c8d7ee;border-radius:5px;padding:12px;color:#697386;font-size:13px;font-weight:800;line-height:1.4;background:#fff}@media(max-width:640px){.logOfferGrid{grid-template-columns:1fr}.logOfferHeader{display:block}.logOfferHeader .logOfferBadge{margin-top:8px}}
      body.is-dark .logOfferCard,html.is-dark .logOfferCard,.theme-dark .logOfferCard{background:#2f2f2f!important;border-color:rgba(255,255,255,.10)!important;color:#fff!important}.theme-dark .logOfferCard h3,body.is-dark .logOfferCard h3,html.is-dark .logOfferCard h3,.theme-dark .logOfferHeader strong,body.is-dark .logOfferHeader strong,html.is-dark .logOfferHeader strong,.theme-dark .logOfferMetric strong,body.is-dark .logOfferMetric strong,html.is-dark .logOfferMetric strong,.theme-dark .logOfferSku,body.is-dark .logOfferSku,html.is-dark .logOfferSku{color:#fff!important}.theme-dark .logOfferHeader span,body.is-dark .logOfferHeader span,html.is-dark .logOfferHeader span,.theme-dark .logOfferName,body.is-dark .logOfferName,html.is-dark .logOfferName{color:rgba(255,255,255,.76)!important}.theme-dark .logOfferMetric span,body.is-dark .logOfferMetric span,html.is-dark .logOfferMetric span,.theme-dark .logOfferComponentsTitle,body.is-dark .logOfferComponentsTitle,html.is-dark .logOfferComponentsTitle{color:rgba(255,255,255,.62)!important}.theme-dark .logOfferHeader,.theme-dark .logOfferGrid,.theme-dark .logOfferComponent,body.is-dark .logOfferHeader,body.is-dark .logOfferGrid,body.is-dark .logOfferComponent,html.is-dark .logOfferHeader,html.is-dark .logOfferGrid,html.is-dark .logOfferComponent{border-color:rgba(255,255,255,.16)!important}
    `;
    document.head.appendChild(css);
  }

  function componentsHtml(match) {
    const comps = Array.isArray(match && match.components) ? match.components : [];
    if (!comps.length) return '<div class="logOfferEmpty">La oferta fue detectada, pero no hay componentes en el snapshot.</div>';
    return '<div class="logOfferComponentsTitle">Componentes operativos</div>' + comps.map(function (c) {
      const qty = c.quantity_total || c.quantity_sold || c.quantity_per_unit || 1;
      return '<div class="logOfferComponent"><div class="logOfferQty">x' + esc(qty) + '</div><div><strong class="logOfferSku">' + esc(c.sku || 'SKU') + '</strong><span class="logOfferName">' + esc(c.nombre_producto || 'Producto sin nombre') + '</span></div></div>';
    }).join('');
  }

  function cardHtml(match) {
    if (!match) return '';
    return '<section class="logOfferCard" data-log-offer-card="1"><h3>Cruce de oferta</h3><div class="logOfferHeader"><div><strong>' + esc(match.codigo_oferta || 'Oferta') + '</strong><span>' + esc(match.nombre_comercial || '') + '</span></div>' + badge(match) + '</div><div class="logOfferGrid"><div class="logOfferMetric"><span>Tipo</span><strong>' + esc(match.classification_badge || match.tipo_oferta || 'Oferta') + '</strong></div><div class="logOfferMetric"><span>Variant ID</span><strong>' + esc(match.id_variante_shopify || '') + '</strong></div><div class="logOfferMetric"><span>Contexto</span><strong>' + esc(match.variant_contexto || '—') + '</strong></div><div class="logOfferMetric"><span>Estado match</span><strong>' + esc(match.match_status || '—') + '</strong></div></div>' + componentsHtml(match) + '</section>';
  }

  function injectForTracking(trackingId) {
    injectCss();
    const form = root().querySelector('#logPedidosForm');
    if (!form) return;
    form.querySelector('[data-log-offer-card="1"]')?.remove();
    const order = orders().find(item => text(item.tracking_id) === text(trackingId));
    if (!order) return;
    const html = cardHtml(primary(order));
    if (html) form.insertAdjacentHTML('afterbegin', html);
  }

  function loadProductInfoHelper() {
    if (window.ProtocolLogisticaPedidosProductInfo || document.querySelector('script[data-logistica-product-info="1"]')) return;
    const script = document.createElement('script');
    script.src = '../../js/logistica/logistica-pedidos-product-info.js?v=20260703_04';
    script.async = true;
    script.dataset.logisticaProductInfo = '1';
    document.body.appendChild(script);
  }

  function bind() {
    if (document.body.dataset.logisticaOfferMatchesBound === BUILD) return;
    document.body.dataset.logisticaOfferMatchesBound = BUILD;
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-log-pedido-edit]');
      if (!btn) return;
      state.currentTracking = text(btn.dataset.logPedidoEdit);
      setTimeout(function () {
        hydrate().then(function () {
          injectForTracking(state.currentTracking);
          if (window.ProtocolLogisticaPedidosProductInfo) window.ProtocolLogisticaPedidosProductInfo.injectForTracking(state.currentTracking, { syncFirst: true });
        });
      }, 120);
    }, true);
  }

  function init() {
    if (!page()) return;
    injectCss();
    loadProductInfoHelper();
    bind();
    setTimeout(hydrate, 800);
    window.ProtocolLogisticaPedidosOfferMatches = { build: BUILD, hydrate, injectForTracking, state };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', function () { setTimeout(init, 120); });
})();
