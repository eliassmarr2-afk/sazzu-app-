/* Protocol Data · Pedidos Offer Matches · Fase 05C.2 */
(function () {
  'use strict';

  const BUILD = 'PEDIDOS_OFFER_MATCHES_05C2_20260703';
  const RPC = 'rpc_products_order_offer_matches_lookup';
  const SYNC_FUNCTION = 'shopify-resolve-order-offers';
  const state = { loading: false, syncing: false, loadedKey: '', syncKey: '', items: [], byName: new Map(), lastTracking: '' };

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

  async function syncVisibleOrders() {
    const c = client();
    if (!c || !c.functions || typeof c.functions.invoke !== 'function') return null;
    if (state.syncing) return null;

    const names = uniq(visibleOrders().map(orderName)).slice(0, 12);
    const key = names.join('|');
    if (!names.length || key === state.syncKey) return null;

    state.syncing = true;
    try {
      const res = await c.functions.invoke(SYNC_FUNCTION, { body: { order_names: names } });
      if (res.error) throw res.error;
      state.syncKey = key;
      state.loadedKey = '';
      window.__PEDIDOS_OFFER_SYNC_LAST__ = res.data;
      return res.data;
    } catch (err) {
      console.warn('[Pedidos Offer Sync]', err);
      return null;
    } finally {
      state.syncing = false;
    }
  }

  async function hydrate(options) {
    if (!page() || state.loading) return;
    const opts = options || {};
    const orders = Array.isArray(st().all) ? st().all : [];
    const names = uniq(orders.map(orderName));
    const key = names.join('|');
    if (!names.length) return;

    const c = client();
    if (!c) return;

    if (opts.syncFirst) await syncVisibleOrders();

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
    if (document.getElementById('pedidosOfferMatchesCss05C')) return;
    const css = document.createElement('style');
    css.id = 'pedidosOfferMatchesCss05C';
    css.textContent = '.ordersOfferBadges{display:flex;gap:6px;align-items:center;margin-top:7px;flex-wrap:wrap}.ordersOfferBadge{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:950;white-space:nowrap}.ordersOfferBadge--purple{background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff}.ordersOfferBadge--green{background:#ecfdf3;color:#067647;border:1px solid #b7e4c7}.ordersOfferBadge--blue{background:#eaf2ff;color:#2479ff;border:1px solid #cfe0ff}.ordersOfferBadge--gray{background:#f2f4f7;color:#667085;border:1px solid #e4e7ec}.ordersOfferCardLine{padding:10px 0;border-bottom:1px solid #eef2f7}.ordersOfferCardLine:last-child{border-bottom:0}.ordersOfferCardLine strong{display:block;color:#252A32;font-size:13px;font-weight:950}.ordersOfferCardLine span{display:block;margin-top:3px;color:#697386;font-size:12px;font-weight:750}.ordersOfferComponent{display:grid;grid-template-columns:48px 1fr;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #eef2f7}.ordersOfferQty{display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:5px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:950}.ordersOfferEmpty{border:1px dashed #c8d7ee;border-radius:5px;padding:12px;color:#697386;font-size:13px;font-weight:800;line-height:1.4}';
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
    return comps.map(function (c) {
      const qty = c.quantity_total || c.quantity_sold || c.quantity_per_unit || 1;
      return '<div class="ordersOfferComponent"><div class="ordersOfferQty">x' + esc(qty) + '</div><div><strong>' + esc(c.sku || 'SKU') + '</strong><span>' + esc(c.nombre_producto || '') + '</span></div></div>';
    }).join('');
  }

  function injectDetail(tracking) {
    const content = document.getElementById('ordersDetailContent');
    if (!content) return;
    content.querySelector('[data-offer-match-card="1"]')?.remove();
    const order = (Array.isArray(st().all) ? st().all : []).find(x => text(x.tracking_id) === text(tracking));
    if (!order) return;
    const match = primary(order);
    const html = match
      ? '<article class="ordersDetailCard" data-offer-match-card="1"><h3>Cruce de oferta</h3><div class="ordersOfferCardLine"><strong>' + esc(match.codigo_oferta || 'Oferta') + '</strong><span>' + esc(match.nombre_comercial || '') + '</span></div><div class="ordersDetailGrid" style="margin-top:10px;"><div class="ordersDetailItem"><span>Tipo</span><strong>' + esc(match.classification_badge || match.tipo_oferta || 'Oferta') + '</strong></div><div class="ordersDetailItem"><span>Variant ID</span><strong>' + esc(match.id_variante_shopify || '') + '</strong></div><div class="ordersDetailItem"><span>Contexto</span><strong>' + esc(match.variant_contexto || '—') + '</strong></div><div class="ordersDetailItem"><span>Estado match</span><strong>' + esc(match.match_status || '—') + '</strong></div></div>' + componentsHtml(match) + '</article>'
      : '<article class="ordersDetailCard" data-offer-match-card="1"><h3>Cruce de oferta</h3><div class="ordersOfferEmpty">Este pedido no tiene coincidencias de oferta registradas todavía.</div></article>';
    content.insertAdjacentHTML('afterbegin', html);
  }

  function bind() {
    if (document.body.dataset.pedidosOfferMatchesBound === BUILD) return;
    document.body.dataset.pedidosOfferMatchesBound = BUILD;
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-order-detail]');
      if (!btn) return;
      state.lastTracking = text(btn.dataset.orderDetail);
      setTimeout(function () { hydrate({ syncFirst: true }).then(function () { injectDetail(state.lastTracking); }); }, 100);
    }, true);
    const list = document.getElementById('ordersList');
    if (list && typeof MutationObserver === 'function') {
      new MutationObserver(function () { setTimeout(function () { hydrate({ syncFirst: false }); decorate(); }, 120); }).observe(list, { childList: true, subtree: true });
    }
  }

  function init() {
    if (!page()) return;
    injectCss();
    bind();
    [300, 900, 1800, 3200].forEach(function (t) { setTimeout(function () { hydrate({ syncFirst: t === 900 }); decorate(); }, t); });
    window.ProtocolPedidosOfferMatches = { build: BUILD, hydrate: hydrate, syncVisibleOrders: syncVisibleOrders, decorate: decorate, state: state };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', function () { setTimeout(init, 120); });
})();
