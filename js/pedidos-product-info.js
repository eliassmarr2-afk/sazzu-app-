/* Protocol Data · Pedidos · Producto del pedido universal */
(function () {
  'use strict';

  const BUILD = 'PEDIDOS_PRODUCT_INFO_20260703_03';
  const LINE_RPC = 'rpc_shopify_order_line_snapshots_lookup';
  const SYNC_FUNCTION = 'shopify-resolve-order-offers';
  const lineState = { loading: false, syncing: false, loadedKey: '', syncKey: '', items: [], byName: new Map() };

  function page() { return !!document.querySelector('body[data-page="pedidos"]'); }
  function state() { return window.__protocolSidebarPedidosState || { all: [], filtered: [], page: 1, pageSize: 12 }; }
  function text(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function uniq(arr) { return Array.from(new Set((arr || []).map(text).filter(Boolean))); }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const c = window.ProtocolAuth.getClient();
      if (c) return c;
    }
    if (window.__protocolSidebarPedidosClient) return window.__protocolSidebarPedidosClient;
    if (window.__pedidosProductInfoClient) return window.__pedidosProductInfoClient;
    const cfg = window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
    const key = cfg && (cfg.anonKey || cfg.publishableKey || cfg.key);
    if (!window.supabase || !cfg || !cfg.url || !key) return null;
    window.__pedidosProductInfoClient = window.supabase.createClient(cfg.url, key);
    return window.__pedidosProductInfoClient;
  }

  function visibleOrders() {
    const s = state();
    const list = Array.isArray(s.filtered) && s.filtered.length ? s.filtered : (Array.isArray(s.all) ? s.all : []);
    const page = Number(s.page || 1);
    const size = Number(s.pageSize || 12);
    return list.slice(Math.max(0, (page - 1) * size), Math.max(0, (page - 1) * size) + size);
  }

  function allOrders() {
    const s = state();
    return Array.isArray(s.all) ? s.all : [];
  }

  function orderName(order) { return text(order && (order.shopify_order_name || order.order_name || order.name)); }
  function byName() { return (window.ProtocolPedidosOfferMatches && window.ProtocolPedidosOfferMatches.state && window.ProtocolPedidosOfferMatches.state.byName) || new Map(); }

  function primaryMatch(order) {
    const list = byName().get(orderName(order)) || [];
    return list.find(x => x.match_status === 'matched') || list[0] || null;
  }

  function lineItems(order) {
    return lineState.byName.get(orderName(order)) || [];
  }

  function primaryLine(order) {
    return lineItems(order)[0] || null;
  }

  function rebuildLines(items) {
    lineState.items = Array.isArray(items) ? items : [];
    lineState.byName = new Map();
    lineState.items.forEach(function (item) {
      const name = text(item.shopify_order_name);
      if (!name) return;
      const list = lineState.byName.get(name) || [];
      list.push(item);
      lineState.byName.set(name, list);
    });
  }

  async function syncVisibleOrders() {
    const c = client();
    if (!c || !c.functions || typeof c.functions.invoke !== 'function' || lineState.syncing) return null;
    const names = uniq(visibleOrders().map(orderName)).slice(0, 12);
    const key = names.join('|');
    if (!names.length || key === lineState.syncKey) return null;

    lineState.syncing = true;
    try {
      const res = await c.functions.invoke(SYNC_FUNCTION, { body: { order_names: names } });
      if (res.error) throw res.error;
      lineState.syncKey = key;
      lineState.loadedKey = '';
      window.__PEDIDOS_PRODUCT_LINE_SYNC_LAST__ = res.data;
      return res.data;
    } catch (err) {
      console.warn('[Pedidos Product Info · Shopify line sync]', err);
      return null;
    } finally {
      lineState.syncing = false;
    }
  }

  async function hydrateLines(options) {
    if (!page() || lineState.loading) return;
    const opts = options || {};
    const names = uniq(allOrders().map(orderName));
    const key = names.join('|');
    if (!names.length) return;

    const c = client();
    if (!c) return;

    if (opts.syncFirst) await syncVisibleOrders();
    if (key === lineState.loadedKey && lineState.items.length) return;

    lineState.loading = true;
    try {
      const res = await c.rpc(LINE_RPC, { input_lookup: { order_ids: [], order_names: names } });
      if (res.error) throw res.error;
      const payload = res.data || {};
      rebuildLines(Array.isArray(payload.items) ? payload.items : []);
      lineState.loadedKey = key;
      window.__PEDIDOS_PRODUCT_LINE_SNAPSHOTS__ = lineState;
    } catch (err) {
      console.warn('[Pedidos Product Info · line lookup]', err);
    } finally {
      lineState.loading = false;
    }
  }

  function pick(order, keys) {
    for (const key of keys) {
      const value = text(order && order[key]);
      if (value) return value;
    }
    return '';
  }

  function directSku(order) {
    const snapshots = lineItems(order).map(item => text(item.sku)).filter(Boolean);
    if (snapshots.length) return uniq(snapshots).join(' + ');
    return pick(order, [
      'sku', 'sku_producto', 'producto_sku', 'shopify_sku', 'variant_sku', 'line_item_sku',
      'sku_shopify', 'codigo_sku', 'sku_operativo', 'sku_principal', 'product_sku'
    ]);
  }

  function directVariant(order) {
    const line = primaryLine(order);
    return text(line && line.shopify_variant_id) || pick(order, [
      'id_variante_shopify', 'variant_id', 'shopify_variant_id', 'line_item_variant_id',
      'variantId', 'id_variante', 'variante_id'
    ]);
  }

  function productTitle(order) {
    const line = primaryLine(order);
    return text(line && line.product_title) || text(order.producto) || 'Producto sin nombre';
  }

  function componentSkus(match) {
    const comps = Array.isArray(match && match.components) ? match.components : [];
    return comps.map(c => text(c.sku)).filter(Boolean);
  }

  function skuLabel(order, match) {
    const skus = componentSkus(match);
    if (skus.length) return skus.join(' + ');
    return directSku(order) || 'SKU no informado por Shopify';
  }

  function injectCss() {
    if (document.getElementById('pedidosProductInfoCss')) return;
    const css = document.createElement('style');
    css.id = 'pedidosProductInfoCss';
    css.textContent = `
      .orderSkuLine{display:inline-flex;align-items:center;min-height:22px;margin-top:6px;padding:0 7px;border-radius:5px;background:#eef2ff;color:#1d4ed8;border:1px solid #dbe7ff;font-size:11px;font-weight:950;line-height:1.2}.orderProductInfoCard{background:#303030!important;color:#fff!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:none!important}.orderProductInfoCard h3{margin-bottom:12px!important;color:#fff!important}.orderProductInfoHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.22)}.orderProductInfoHead strong{display:block;color:#fff!important;font-size:13px;font-weight:950;line-height:1.25}.orderProductInfoHead span{display:block;margin-top:4px;color:rgba(255,255,255,.74)!important;font-size:12px;font-weight:750;line-height:1.35}.orderProductInfoBadge{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 8px;border-radius:5px;font-size:11px;font-weight:950;white-space:nowrap;background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff}.orderProductInfoGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.22)}.orderProductMetric span{display:block;color:rgba(255,255,255,.62)!important;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.orderProductMetric strong{display:block;margin-top:4px;color:#fff!important;font-size:13px;font-weight:900;line-height:1.25;word-break:break-word}.orderProductComponentsTitle{padding-top:12px;color:rgba(255,255,255,.62)!important;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.055em}.orderProductComponent{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.16)}.orderProductComponent:last-child{border-bottom:0}.orderProductQty{display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:5px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:950}.orderProductSku{display:block;color:#fff!important;font-size:13px;font-weight:950;line-height:1.25}.orderProductName{display:block;margin-top:3px;color:rgba(255,255,255,.74)!important;font-size:12px;font-weight:750;line-height:1.35}.orderProductNoSku{color:#fbbf24!important}@media(max-width:640px){.orderProductInfoGrid{grid-template-columns:1fr}.orderProductInfoHead{display:block}.orderProductInfoBadge{margin-top:8px}}
    `;
    document.head.appendChild(css);
  }

  function decorateTable() {
    injectCss();
    const tbody = document.querySelector('#ordersList table.ordersTable tbody');
    if (!tbody) return;
    const rows = visibleOrders();
    Array.from(tbody.querySelectorAll('tr')).forEach(function (tr, idx) {
      const order = rows[idx];
      const productCell = tr.children[3];
      if (!order || !productCell) return;
      productCell.querySelector('.orderSkuLine')?.remove();
      const match = primaryMatch(order);
      const sku = skuLabel(order, match);
      const line = document.createElement('span');
      line.className = 'orderSkuLine' + (sku.includes('no informado') ? ' orderProductNoSku' : '');
      line.textContent = 'SKU: ' + sku;
      productCell.querySelector('.ordersMiniStack')?.appendChild(line);
    });
  }

  function componentsHtml(match) {
    const comps = Array.isArray(match && match.components) ? match.components : [];
    if (!comps.length) return '';
    return '<div class="orderProductComponentsTitle">Componentes internos de la oferta</div>' + comps.map(function (c) {
      const qty = c.quantity_total || c.quantity_sold || c.quantity_per_unit || 1;
      return '<div class="orderProductComponent"><div class="orderProductQty">x' + esc(qty) + '</div><div><strong class="orderProductSku">' + esc(c.sku || 'SKU') + '</strong><span class="orderProductName">' + esc(c.nombre_producto || 'Producto sin nombre') + '</span></div></div>';
    }).join('');
  }

  function cardHtml(order, match) {
    const product = productTitle(order);
    const sku = skuLabel(order, match);
    const variant = (match && text(match.id_variante_shopify)) || directVariant(order) || 'Sin variant ID';
    const hasOffer = !!match;
    const offerBadge = hasOffer ? '<span class="orderProductInfoBadge">' + esc(match.classification_badge || 'Oferta') + '</span>' : '';
    const title = hasOffer ? (match.codigo_oferta || 'Oferta detectada') : 'SKU directo';
    const subtitle = hasOffer ? (match.nombre_comercial || product) : product;

    return '<article class="ordersDetailCard orderProductInfoCard" data-product-info-card="1"><h3>Producto del pedido</h3><div class="orderProductInfoHead"><div><strong>' + esc(title) + '</strong><span>' + esc(subtitle) + '</span></div>' + offerBadge + '</div><div class="orderProductInfoGrid"><div class="orderProductMetric"><span>SKU operativo</span><strong class="' + (sku.includes('no informado') ? 'orderProductNoSku' : '') + '">' + esc(sku) + '</strong></div><div class="orderProductMetric"><span>Variant ID</span><strong>' + esc(variant) + '</strong></div><div class="orderProductMetric"><span>Tipo</span><strong>' + esc(hasOffer ? (match.classification_badge || match.tipo_oferta || 'Oferta') : 'Producto simple') + '</strong></div><div class="orderProductMetric"><span>Contexto</span><strong>' + esc(hasOffer ? (match.variant_contexto || '—') : 'Compra directa / sin oferta') + '</strong></div></div>' + componentsHtml(match) + '</article>';
  }

  async function injectDetail(tracking, options) {
    const opts = options || {};
    if (opts.hydrate !== false) await hydrateLines({ syncFirst: !!opts.syncFirst });
    const content = document.getElementById('ordersDetailContent');
    if (!content) return;
    const s = state();
    const order = (Array.isArray(s.all) ? s.all : []).find(x => text(x.tracking_id) === text(tracking));
    if (!order) return;
    content.querySelector('[data-offer-match-card="1"]')?.remove();
    const existing = content.querySelector('[data-product-info-card="1"]');
    const html = cardHtml(order, primaryMatch(order));
    if (existing) existing.outerHTML = html;
    else content.insertAdjacentHTML('afterbegin', html);
  }

  function bind() {
    if (document.body.dataset.pedidosProductInfoBound === BUILD) return;
    document.body.dataset.pedidosProductInfoBound = BUILD;
    document.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-order-detail]');
      if (!btn) return;
      const tracking = text(btn.dataset.orderDetail);
      setTimeout(function () { injectDetail(tracking, { syncFirst: true }); decorateTable(); }, 260);
      setTimeout(function () { injectDetail(tracking, { syncFirst: false }); decorateTable(); }, 900);
    }, true);
    const list = document.getElementById('ordersList');
    if (list && typeof MutationObserver === 'function') {
      new MutationObserver(function () { setTimeout(function () { decorateTable(); }, 180); }).observe(list, { childList: true, subtree: true });
    }
  }

  function init() {
    if (!page()) return;
    injectCss();
    bind();
    [500, 1200, 2500, 4200].forEach(function (t) {
      setTimeout(function () {
        hydrateLines({ syncFirst: t === 1200 }).then(decorateTable);
      }, t);
    });
    window.ProtocolPedidosProductInfo = { build: BUILD, hydrateLines, decorateTable, injectDetail, lineState };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('sazzu:page:load', function () { setTimeout(init, 120); });
})();
