/* Protocol Data · Pedidos Offer Matches · Fase 05C.3 */
(function () {
  'use strict';

  const BUILD = 'PEDIDOS_OFFER_MATCHES_05C3_20260703';
  const RPC = 'rpc_products_order_offer_matches_lookup';
  const state = { loading: false, loadedKey: '', items: [], byName: new Map(), lastTracking: '' };

  function page() { return !!document.querySelector('body[data-page="pedidos"]'); }
  function st() { return window.__protocolSidebarPedidosState || { all: [], filtered: [], page: 1, pageSize: 12 }; }
  function text(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function uniq(arr) { return Array.from(new Set((arr || []).map(text).filter(Boolean))); }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const c = window.ProtocolAuth.getClient();
      if (c) return c;
    }
    if (window.__protocolSidebarPedidosClient) return window.__protocolSidebarPedidosClient;
    if (window.__pedidosOfferMatchesClient) return window.__pedidosOfferMatchesClient;
    const cfg = window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
    const key = cfg && (cfg.anonKey || cfg.publishableKey || cfg.key);
    if (!window.supabase || !cfg || !cfg.url || !key) return null;
    window.__pedidosOfferMatchesClient = window.supabase.createClient(cfg.url, key);
    return window.__pedidosOfferMatchesClient;
  }

  function orderName(order) { return text(order && (order.shopify_order_name || order.order_name || order.name)); }
  function visibleOrders() {
    const s = st();
    const list = Array.isArray(s.filtered) && s.filtered.length ? s.filtered : (Array.isArray(s.all) ? s.all : []);
    const page = Number(s.page || 1);
    const size = Number(s.pageSize || 12);
    return list.slice(Math.max(0, (page - 1) * size), Math.max(0, (page - 1) * size) + size);
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
    const orders = Array.isArray(st().all) ? st().all : [];
    const names = uniq(orders.map(orderName));
    const key = names.join('|');
    if (!names.length) return;

    const c = client();
    if (!c) return;

    if (key === state.loadedKey && state.items.length) { decorate(); return; }

    state.loading = true;
    try {
      const res = await c.rpc(RPC, { input_lookup: { order_ids: [], order_names: names } });
      if (res.error) throw res.error;
      const payload = res.data || {};
      rebuild(Array.isArray(payload.items) ? payload.items : []);
      state.loadedKey = key;
      decorate();
      window.__PEDIDOS_OFFER_MATCHES__ = state;
    } catch (err) {
      console.warn('[Pedidos Offer Matches]', err);
    } finally {
      state.loading = false;
    }
  }

  function primary(order) {
    const list = state.byName.get(orderName(order)) || [];
    return list.find(x => x.match_status === 'matched') || list[0] || null;
  }

  function badge(match) {
    if (!match) return '<span class="ordersOfferBadge ordersOfferBadge--gray">SKU directo</span>';
    const label = text(match.classification_badge) || 'Oferta';
    const lower = label.toLowerCase();
    const cls = lower.includes('pack') ? 'ordersOfferBadge--purple' : (lower.includes('cant') ? 'ordersOfferBadge--green' : 'ordersOfferBadge--blue');
    return '<span class="ordersOfferBadge ' + cls + '">' + esc(label) + '</span>';
  }

  function injectCss() {
    document.getElementById('pedidosOfferMatchesCss05C')?.remove();
    if (document.getElementById('pedidosOfferMatchesCss05C3')) return;
    const css = document.createElement('style');
    css.id = 'pedidosOfferMatchesCss05C3';
    css.textContent = `
      .ordersOfferBadges{display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap}.ordersOfferBadge{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:950;white-space:nowrap}.ordersOfferBadge--purple{background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff}.ordersOfferBadge--green{background:#ecfdf3;color:#067647;border:1px solid #b7e4c7}.ordersOfferBadge--blue{background:#eaf2ff;color:#2479ff;border:1px solid #cfe0ff}.ordersOfferBadge--gray{background:#f2f4f7;color:#667085;border:1px solid #e4e7ec}
      .ordersOfferMatchCard{background:#fff!important;color:#111827!important}.ordersOfferMatchCard h3{margin-bottom:12px!important}.ordersOfferHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #e6edf7}.ordersOfferHeader__text strong{display:block;color:#111827;font-size:13px;font-weight:950;letter-spacing:.01em}.ordersOfferHeader__text span{display:block;margin-top:4px;color:#526176;font-size:12px;font-weight:750;line-height:1.35}.ordersOfferGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 0;border-bottom:1px solid #e6edf7}.ordersOfferMetric span{display:block;color:#8a98ae;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.ordersOfferMetric strong{display:block;margin-top:4px;color:#111827;font-size:13px;font-weight:900;line-height:1.25;word-break:break-word}.ordersOfferComponentsTitle{padding-top:12px;color:#8a98ae;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.ordersOfferComponents{display:grid;gap:0;margin-top:4px}.ordersOfferComponent{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid #edf2fa}.ordersOfferComponent:last-child{border-bottom:0}.ordersOfferQty{display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:5px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:950}.ordersOfferComponentInfo{min-width:0}.ordersOfferSku{display:block;color:#111827;font-size:13px;font-weight:950;line-height:1.25;word-break:break-word}.ordersOfferName{display:block;margin-top:3px;color:#526176;font-size:12px;font-weight:750;line-height:1.35;word-break:break-word}.ordersOfferEmpty{border:1px dashed #c8d7ee;border-radius:5px;padding:12px;color:#697386;font-size:13px;font-weight:800;line-height:1.4;background:#fff}@media(max-width:640px){.ordersOfferGrid{grid-template-columns:1fr}.ordersOfferHeader{display:block}.ordersOfferHeader .ordersOfferBadge{margin-top:8px}}
    `;
    document.head.appendChild(css);
  }

  function decorate() {
    injectCss();
    const tbody = document.querySelector('#ordersList table.ordersTable tbody');
    if (!tbody) return;
    const orders = visibleOrders();
    Array.from(tbody.querySelectorAll('tr')).forEach(function (row, idx) {
      const order = orders[idx];
      if (!order) return;
      const cell = row.children[3];
      if (!cell) return;
      cell.querySelector('.ordersOfferBadges')?.remove();
      const box = document.createElement('div');
      box.className = 'ordersOfferBadges';
      box.innerHTML = badge(primary(order));
      cell.appendChild(box);
    });
  }

  function componentsHtml(match) {
    const comps = Array.isArray(match && match.components) ? match.components : [];
    if (!comps.length) return '<div class="ordersOfferEmpty">La oferta fue detectada, pero no hay componentes en el snapshot.</div>';
    return '<div class="ordersOfferComponentsTitle">Componentes operativos</div><div class="ordersOfferComponents">' + comps.map(function (c) {
      const qty = c.quantity_total || c.quantity_sold || c.quantity_per_unit || 1;
      return '<div class="ordersOfferComponent"><div class="ordersOfferQty">x' + esc(qty) + '</div><div class="ordersOfferComponentInfo"><strong class="ordersOfferSku">' + esc(c.sku || 'SKU') + '</strong><span class="ordersOfferName">' + esc(c.nombre_producto || 'Producto sin nombre') + '</span></div></div>';
    }).join('') + '</div>';
  }

  function injectDetail(tracking) {
    const content = document.getElementById('ordersDetailContent');
    if (!content) return;
    content.querySelector('[data-offer-match-card="1"]')?.remove();
    const order = (Array.isArray(st().all) ? st().all : []).find(x => text(x.tracking_id) === text(tracking));
    if (!order) return;
    const match = primary(order);
    const html = match
      ? '<article class="ordersDetailCard ordersOfferMatchCard" data-offer-match-card="1"><h3>Cruce de oferta</h3><div class="ordersOfferHeader"><div class="ordersOfferHeader__text"><strong>' + esc(match.codigo_oferta || 'Oferta') + '</strong><span>' + esc(match.nombre_comercial || '') + '</span></div>' + badge(match) + '</div><div class="ordersOfferGrid"><div class="ordersOfferMetric"><span>Tipo</span><strong>' + esc(match.classification_badge || match.tipo_oferta || 'Oferta') + '</strong></div><div class="ordersOfferMetric"><span>Variant ID</span><strong>' + esc(match.id_variante_shopify || '') + '</strong></div><div class="ordersOfferMetric"><span>Contexto</span><strong>' + esc(match.variant_contexto || '—') + '</strong></div><div class="ordersOfferMetric"><span>Estado match</span><strong>' + esc(match.match_status || '—') + '</strong></div></div>' + componentsHtml(match) + '</article>'
      : '<article class="ordersDetailCard ordersOfferMatchCard" data-offer-match-card="1"><h3>Cruce de oferta</h3><div class="ordersOfferEmpty">Este pedido no tiene coincidencias de oferta registradas todavía.</div></article>';
    content.insertAdjacentHTML('afterbegin', html);
  }

  function bind() {
    if (document.body.dataset.pedidosOfferMatchesBound === BUILD) return;
    document.body.dataset.pedidosOfferMatchesBound = BUILD;
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-order-detail]');
      if (!btn) return;
      state.lastTracking = text(btn.dataset.orderDetail);
      setTimeout(function () { hydrate().then(function () { injectDetail(state.lastTracking); }); }, 100);
    }, true);
    const list = document.getElementById('ordersList');
    if (list && typeof MutationObserver === 'function') {
      new MutationObserver(function () { setTimeout(function () { hydrate(); decorate(); }, 120); }).observe(list, { childList: true, subtree: true });
    }
  }

  function init() {
    if (!page()) return;
    injectCss();
    bind();
    [300, 900, 1800, 3200].forEach(function (t) { setTimeout(function () { hydrate(); decorate(); }, t); });
    window.ProtocolPedidosOfferMatches = { build: BUILD, hydrate: hydrate, decorate: decorate, state: state };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', function () { setTimeout(init, 120); });
})();
