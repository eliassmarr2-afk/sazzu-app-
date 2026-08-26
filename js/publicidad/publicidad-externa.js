(function () {
  "use strict";

  const PAGE_FILE = "publicidad-externa.html";
  const STORE_ID = "store_alpaso_store";
  const DEFAULT_DAYS = 7;
  const ACTIONS = ["summary", "campaigns", "adsets", "ads", "tracking"];

  const state = {
    root: null,
    dateFrom: null,
    dateTo: null,
    responses: {},
    summary: null,
    campaigns: [],
    adsets: [],
    ads: [],
    tracking: [],
    trackingSummary: null,
    gatewayScope: null,
    loadSeq: 0,
    fallbackClient: null,

    bindingCatalog: {
      loaded: false,
      loading: false,
      error: null,
      products: [],
      productSets: [],
      directBindings: [],
      resolvedAds: []
    },

    bindingModal: {
      open: false,
      scope: null,
      index: null,
      metaEntityId: null,
      entityName: "",
      salesUnitType: "product",
      selectedUnitId: null,
      busy: false
    }
  };

  function currentFile_() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function isPage_() {
    return currentFile_() === PAGE_FILE || document.body?.dataset?.page === "publicidad-externa";
  }

  function qs_(selector, root) {
    return (root || state.root || document).querySelector(selector);
  }

  function qsa_(selector, root) {
    return Array.from((root || state.root || document).querySelectorAll(selector));
  }

  function clean_(value) {
    return String(value ?? "").trim();
  }

  function escape_(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function num_(value) {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function metric_(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return {
        current: num_(value.current),
        previous: num_(value.previous),
        change_absolute: value.change_absolute === null || value.change_absolute === undefined ? null : num_(value.change_absolute),
        change_percent: value.change_percent === null || value.change_percent === undefined ? null : num_(value.change_percent)
      };
    }

    return {
      current: num_(value),
      previous: 0,
      change_absolute: null,
      change_percent: null
    };
  }

  function current_(value) {
    return metric_(value).current;
  }

  function fmtNumber_(value, digits) {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits ?? 0
    }).format(num_(value));
  }

  function fmtMoney_(value, currency) {
    const code = clean_(currency).toUpperCase() || "USD";
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num_(value));
    } catch (_) {
      return `${code} ${fmtNumber_(value, 2)}`;
    }
  }

  function fmtPercent_(value, digits) {
    return `${fmtNumber_(value, digits ?? 1)}%`;
  }

  function fmtRoas_(value) {
    const n = num_(value);
    return n > 0 ? `${fmtNumber_(n, 2)}x` : "—";
  }

  function fmtDateTime_(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  }

  function localIsoDate_(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays_(iso, delta) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + delta);
    return localIsoDate_(d);
  }

  function defaultRange_(days) {
    const to = localIsoDate_(new Date());
    return { from: addDays_(to, -(days - 1)), to };
  }

  function config_() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function configKey_(config) {
    return config && (config.publishableKey || config.anonKey || config.key) || null;
  }

  function configUrl_(config) {
    return clean_(config && config.url)
      .replace(/\/rest\/v1\/?$/i, "")
      .replace(/\/+$/g, "");
  }

  function fallbackClient_() {
    if (state.fallbackClient) return state.fallbackClient;
    const cfg = config_();
    const url = configUrl_(cfg);
    const key = configKey_(cfg);
    if (!window.supabase || !url || !key) return null;

    state.fallbackClient = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return state.fallbackClient;
  }

  function loginUrl_() {
    const next = `${location.pathname}${location.search}`;
    if (window.ProtocolAuth && typeof window.ProtocolAuth.loginUrl === "function") {
      return window.ProtocolAuth.loginUrl(next);
    }
    return `/panel/login.html?next=${encodeURIComponent(next)}`;
  }

  async function getSession_() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getSession === "function") {
      return window.ProtocolAuth.getSession();
    }

    const client = fallbackClient_();
    if (!client) throw new Error("Supabase Auth no está disponible en este panel.");
    const response = await client.auth.getSession();
    if (response.error) throw response.error;
    return response.data?.session || null;
  }

  async function invokeMetaRead_(payload) {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.invokeMetaRead === "function") {
      return window.ProtocolAuth.invokeMetaRead(payload);
    }

    const cfg = config_();
    const url = configUrl_(cfg);
    const key = configKey_(cfg);
    if (!url || !key) throw new Error("Supabase no está configurado para Publicidad Externa.");

    const session = await getSession_();
    if (!session?.access_token) {
      const error = new Error("Se requiere una sesión autenticada de Protocol Data.");
      error.code = "authentication_required";
      throw error;
    }

    const response = await fetch(`${url}/functions/v1/protocol-meta-read`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {})
    });

    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (_) {
      data = raw;
    }

    if (!response.ok) {
      const error = new Error(data?.message || "No se pudieron consultar los datos de Meta.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async function invokeSalesUnitBindings_(payload) {
  const cfg = config_();
  const url = configUrl_(cfg);
  const key = configKey_(cfg);

  if (!url || !key) {
    throw new Error("Supabase no está configurado para vinculación publicitaria.");
  }

  const session = await getSession_();

  if (!session?.access_token) {
    const error = new Error("Se requiere una sesión autenticada de Protocol Data.");
    error.code = "authentication_required";
    throw error;
  }

  const response = await fetch(
    `${url}/functions/v1/protocol-meta-sales-unit-bindings`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {})
    }
  );

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {
    data = raw;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || "No se pudo operar la vinculación publicitaria."
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function loadBindingCatalog_(force) {
  const catalog = state.bindingCatalog;

  if (catalog.loading) {
    return catalog;
  }

  if (catalog.loaded && !force) {
    return catalog;
  }

  catalog.loading = true;
  catalog.error = null;

  try {
    const response = await invokeSalesUnitBindings_({
      action: "state"
    });

    catalog.products = Array.isArray(response?.products)
      ? response.products
      : [];

    catalog.productSets = Array.isArray(response?.product_sets)
      ? response.product_sets
      : [];

    catalog.directBindings = Array.isArray(response?.direct_bindings)
      ? response.direct_bindings
      : [];

    catalog.resolvedAds = Array.isArray(response?.resolved_ads)
      ? response.resolved_ads
      : [];

    catalog.loaded = true;

    return catalog;
  } catch (error) {
    catalog.error = error;
    catalog.loaded = false;
    throw error;
  } finally {
    catalog.loading = false;
  }
}

function unwrap_(response) {
    if (response && typeof response === "object" && response.data && typeof response.data === "object") {
      return response.data;
    }
    return response || {};
  }

  function responseError_(result) {
    if (!result) return "Sin respuesta";
    if (result.status === "rejected") return result.reason?.message || String(result.reason || "Error desconocido");
    return null;
  }

  function revenueText_(revenueByCurrency) {
    const revenue = revenueByCurrency && typeof revenueByCurrency === "object" ? revenueByCurrency : {};
    const entries = Object.entries(revenue).filter(([, value]) => num_(value) !== 0);
    if (!entries.length) return "—";
    return entries.map(([currency, value]) => fmtMoney_(value, currency)).join(" · ");
  }

  function setStatus_(kind, text) {
    const el = qs_("[data-meta-status]");
    if (!el) return;
    el.classList.remove("pubExtStatus--ok", "pubExtStatus--error", "pubExtStatus--loading");
    el.classList.add(kind === "ok" ? "pubExtStatus--ok" : kind === "error" ? "pubExtStatus--error" : "pubExtStatus--loading");
    el.innerHTML = `<span class="pubExtStatus__dot"></span>${escape_(text)}`;
  }

  function setLoading_(on) {
    const el = qs_("[data-loading]");
    if (el) el.hidden = !on;
  }

  function setNotice_(message) {
    const el = qs_("[data-page-notice]");
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function setDelta_(key, value, polarity) {
    const el = qs_(`[data-kpi-delta="${key}"]`);
    if (!el) return;
    const m = metric_(value);
    el.classList.remove("is-positive", "is-negative", "is-new");

    if (m.change_percent === null) {
      if (m.current > 0 && m.previous === 0) {
        el.textContent = "Nuevo";
        el.classList.add("is-new");
      } else {
        el.textContent = "0%";
      }
      return;
    }

    const pct = m.change_percent;
    el.textContent = `${pct > 0 ? "+" : ""}${fmtPercent_(pct, 1)}`;
    const favorable = polarity === "inverse" ? pct < 0 : pct > 0;
    const unfavorable = polarity === "inverse" ? pct > 0 : pct < 0;
    if (favorable) el.classList.add("is-positive");
    if (unfavorable) el.classList.add("is-negative");
  }

  function stateBadge_(status) {
    const raw = clean_(status) || "UNKNOWN";
    const norm = raw.toLowerCase();
    let cls = "pubExtState--neutral";
    if (["active", "valid", "enabled", "ok"].includes(norm)) cls = "pubExtState--active";
    else if (["invalid", "error", "deleted", "archived"].includes(norm)) cls = "pubExtState--invalid";
    else if (["incomplete", "missing", "unvalidated", "warning"].includes(norm)) cls = "pubExtState--incomplete";
    else if (["paused", "inactive", "disabled"].includes(norm)) cls = "pubExtState--paused";
    return `<span class="pubExtState ${cls}">${escape_(raw)}</span>`;
  }

  function renderHeader_() {
    const wrapper = state.responses.summary;
    const scope = wrapper?.scope || state.gatewayScope || {};
    const storeName = scope.store_name || scope.storeName || "Al Paso Store";
    const account = qs_("[data-meta-account]");
    if (account) account.textContent = `${storeName} · Meta Ads`;

    const freshness = state.summary?.data_freshness?.latest_insight_synced_at;
    const freshnessEl = qs_("[data-meta-freshness]");
    if (freshnessEl) freshnessEl.textContent = fmtDateTime_(freshness);
  }

  function renderKpis_() {
    const summary = state.summary || {};
    const meta = summary.meta || {};
    const protocol = summary.protocol || {};
    const currency = summary.currency?.meta_account_currency || "USD";

    const spendEl = qs_('[data-kpi="spend"]');
    const purchaseEl = qs_('[data-kpi="purchases"]');
    const roasEl = qs_('[data-kpi="roas"]');
    const paidEl = qs_('[data-kpi="protocol_paid"]');
    const revenueEl = qs_('[data-kpi="protocol_revenue"]');

    if (spendEl) spendEl.textContent = fmtMoney_(current_(meta.spend), currency);
    if (purchaseEl) purchaseEl.textContent = fmtNumber_(current_(meta.purchases), 0);
    if (roasEl) roasEl.textContent = fmtRoas_(current_(meta.roas));
    if (paidEl) paidEl.textContent = fmtNumber_(current_(protocol.paid_orders), 0);
    if (revenueEl) revenueEl.textContent = `Revenue real atribuido: ${revenueText_(protocol.revenue_by_currency?.current || {})}`;

    setDelta_("spend", meta.spend, "inverse");
    setDelta_("purchases", meta.purchases, "normal");
    setDelta_("roas", meta.roas, "normal");
    setDelta_("protocol_paid", protocol.paid_orders, "normal");
  }

  function ratio_(numerator, denominator) {
    const den = num_(denominator);
    return den > 0 ? (num_(numerator) / den) * 100 : 0;
  }

  function renderFunnel_() {
    const target = qs_("[data-funnel]");
    if (!target) return;

    const summary = state.summary || {};
    const meta = summary.meta || {};
    const funnel = summary.funnel || {};
    const protocol = summary.protocol || {};

    const stages = [
      { key: "impressions", name: "Impresiones", value: current_(meta.impressions), sub: "Entrega del anuncio" },
      { key: "link", name: "Clics en enlace", value: current_(meta.link_clicks), sub: "Link Click canónico" },
      { key: "lpv", name: "Landing Page View", value: current_(meta.landing_page_views), sub: "Llegada real a la landing" },
      { key: "l1", name: "L1 · Interés", value: current_(meta.landing_l1), sub: "10 s + 10% scroll" },
      { key: "l2", name: "L2 · Deseo", value: current_(meta.landing_l2), sub: "20 s + 25% scroll" },
      { key: "l3", name: "L3 · Acción", value: current_(meta.landing_l3), sub: "30 s + 50% scroll" },
      { key: "atc", name: "Agregó al carrito", value: current_(meta.add_to_cart), sub: "Meta · evento canónico" },
      { key: "checkout", name: "Checkout", value: current_(meta.initiate_checkout), sub: "Inicio de checkout" },
      { key: "purchase", name: "Compra Meta", value: current_(meta.purchases), sub: "Atribución Meta" },
      { key: "protocol", name: "Compra real Protocol", value: current_(protocol.paid_orders), sub: "Pedido pagado atribuido por ad_id", protocol: true }
    ];

    const rates = {
      impressions: ratio_(stages[1].value, stages[0].value),
      link: current_(funnel.link_to_lpv_rate),
      lpv: current_(funnel.lpv_to_l1_rate),
      l1: current_(funnel.l1_to_l2_rate),
      l2: current_(funnel.l2_to_l3_rate),
      l3: current_(funnel.l3_to_atc_rate),
      atc: current_(funnel.atc_to_checkout_rate),
      checkout: current_(funnel.checkout_to_purchase_rate)
    };

    const max = Math.max(1, ...stages.map((stage) => stage.value));
    let html = "";

    stages.forEach((stage, index) => {
      const width = stage.value <= 0 ? 0 : Math.max(3, Math.sqrt(stage.value / max) * 100);
      html += `<div class="pubExtFunnelStage ${stage.protocol ? "pubExtFunnelStage--protocol" : ""}"><div class="pubExtFunnelStage__label"><div class="pubExtFunnelStage__name">${escape_(stage.name)}</div><div class="pubExtFunnelStage__sub">${escape_(stage.sub)}</div></div><div class="pubExtFunnelStage__barWrap"><div class="pubExtFunnelStage__bar" style="width:${width.toFixed(2)}%"></div></div><div class="pubExtFunnelStage__value">${fmtNumber_(stage.value, 0)}</div></div>`;

      if (index < stages.length - 1) {
        const label = stage.key === "purchase" ? "Validación con pedidos reales" : `<strong>${fmtPercent_(rates[stage.key], 1)}</strong> avanza al siguiente nivel`;
        html += `<div class="pubExtFunnelRate">${label}</div>`;
      }
    });

    target.innerHTML = html;
  }

  function discrepancyCount_() {
    return state.ads.reduce((count, item) => {
      const metaPurchases = current_(item?.meta?.purchases);
      const protocolPaid = current_(item?.protocol?.paid_orders);
      return count + (Math.abs(metaPurchases - protocolPaid) > 0.0001 ? 1 : 0);
    }, 0);
  }

  function renderCompare_() {
    const target = qs_("[data-meta-protocol-compare]");
    if (!target) return;

    const summary = state.summary || {};
    const meta = summary.meta || {};
    const protocol = summary.protocol || {};
    const currency = summary.currency?.meta_account_currency || "USD";
    const mismatchAds = discrepancyCount_();
    const stateEl = qs_("[data-attribution-state]");

    if (stateEl) {
      stateEl.classList.remove("pubExtPill--soft", "pubExtPill--ok", "pubExtPill--warn", "pubExtPill--bad");
      if (mismatchAds > 0) {
        stateEl.textContent = `${mismatchAds} anuncio${mismatchAds === 1 ? "" : "s"} difiere${mismatchAds === 1 ? "" : "n"}`;
        stateEl.classList.add("pubExtPill--warn");
      } else {
        stateEl.textContent = "Totales consistentes";
        stateEl.classList.add("pubExtPill--ok");
      }
    }

    const protocolRoas = protocol.roas || {};
    const protocolRoasText = protocolRoas.current_status === "comparable" ? fmtRoas_(protocolRoas.current) : "No comparable";

    target.innerHTML = `
      <div class="pubExtCompareRow"><div class="pubExtCompareRow__label"><strong>Compras</strong><span>Atribución reportada vs pedido pagado</span></div><div class="pubExtCompareValue"><span>Meta</span><strong>${fmtNumber_(current_(meta.purchases), 0)}</strong></div><div class="pubExtCompareValue"><span>Protocol</span><strong>${fmtNumber_(current_(protocol.paid_orders), 0)}</strong></div></div>
      <div class="pubExtCompareRow"><div class="pubExtCompareRow__label"><strong>Revenue</strong><span>Cada fuente conserva su moneda</span></div><div class="pubExtCompareValue"><span>Meta</span><strong>${escape_(fmtMoney_(current_(meta.purchase_value), currency))}</strong></div><div class="pubExtCompareValue"><span>Protocol</span><strong>${escape_(revenueText_(protocol.revenue_by_currency?.current || {}))}</strong></div></div>
      <div class="pubExtCompareRow"><div class="pubExtCompareRow__label"><strong>ROAS</strong><span>No se mezclan monedas distintas</span></div><div class="pubExtCompareValue"><span>Meta</span><strong>${fmtRoas_(current_(meta.roas))}</strong></div><div class="pubExtCompareValue"><span>Protocol</span><strong>${escape_(protocolRoasText)}</strong></div></div>
      <div class="pubExtCompareNote">${protocolRoas.current_status === "currency_mismatch" ? "ROAS Protocol no disponible: el gasto Meta y las ventas reales están expresados en monedas distintas." : "Protocol mantiene la atribución real por ad_id separada de la atribución informada por Meta."}</div>`;
  }

  function renderMetricGrid_() {
    const target = qs_("[data-metric-grid]");
    if (!target) return;
    const meta = state.summary?.meta || {};
    const currency = state.summary?.currency?.meta_account_currency || "USD";
    const metrics = [
      ["Impresiones", fmtNumber_(current_(meta.impressions), 0), "Entrega"], ["Link Clicks", fmtNumber_(current_(meta.link_clicks), 0), "Clic canónico"], ["LPV", fmtNumber_(current_(meta.landing_page_views), 0), "Llegadas reales"], ["Outbound", fmtNumber_(current_(meta.outbound_clicks), 0), "Clics salientes"], ["CTR", fmtPercent_(current_(meta.ctr), 2), "Clicks / impresiones"], ["CPC", fmtMoney_(current_(meta.cpc), currency), "Costo por clic"], ["CPM", fmtMoney_(current_(meta.cpm), currency), "Costo por mil"], ["L1", fmtNumber_(current_(meta.landing_l1), 0), "Interés"], ["L2", fmtNumber_(current_(meta.landing_l2), 0), "Deseo"], ["L3", fmtNumber_(current_(meta.landing_l3), 0), "Acción"], ["ATC", fmtNumber_(current_(meta.add_to_cart), 0), "Carrito"], ["Checkout", fmtNumber_(current_(meta.initiate_checkout), 0), "Inicio checkout"]
    ];
    target.innerHTML = metrics.map(([label, value, sub]) => `<div class="pubExtMetric"><div class="pubExtMetric__label">${escape_(label)}</div><div class="pubExtMetric__value">${escape_(value)}</div><div class="pubExtMetric__sub">${escape_(sub)}</div></div>`).join("");
  }

  function entityCell_(name, id) {
    return `<div class="pubExtEntity"><div class="pubExtEntity__name" title="${escape_(name)}">${escape_(name || "Sin nombre")}</div><div class="pubExtEntity__meta">${escape_(id || "—")}</div></div>`;
  }

  function rowButton_(type, index) {
    return `<button class="pubExtRowBtn" type="button" data-open-detail="${escape_(type)}" data-detail-index="${index}" aria-label="Ver detalle">›</button>`;
  }

  function cpaCellForAd_(item, index) {
    const info = bindingInfoFor_("ad", item);

    if (info.loading) {
      return `<span class="pubExtCpaCell pubExtCpaCell--muted">…</span>`;
    }

    if (!info.hasBinding) {
      return `<span class="pubExtCpaCell pubExtCpaCell--muted">—</span>`;
    }

    const ad = item?.ad || {};
    const estimated = info.estimatedCpa === null || info.estimatedCpa === undefined
      ? "—"
      : fmtMoney_(info.estimatedCpa, "ARS");

    return `
      <button
        class="pubExtCpaMini"
        type="button"
        data-open-cpa="ad"
        data-cpa-index="${index}"
        data-meta-entity-id="${escape_(ad.meta_ad_id || "")}"
        aria-label="Ver costo por adquisición"
        title="${escape_(info.salesUnitName || "Unidad promocionada")}"
      >
        <span class="pubExtCpaMini__label">CPA est.</span>
        <strong class="pubExtCpaMini__value">${escape_(estimated)}</strong>
      </button>
    `;
  }

  function renderCampaigns_() {
    const body = qs_("[data-campaigns-body]");
    const count = qs_('[data-count="campaigns"]');
    if (count) count.textContent = `${state.campaigns.length} campaña${state.campaigns.length === 1 ? "" : "s"}`;
    if (!body) return;
    if (!state.campaigns.length) { body.innerHTML = '<tr><td class="pubExtEmpty" colspan="10">No hay campañas en el scope actual.</td></tr>'; return; }
    const currency = state.summary?.currency?.meta_account_currency || "USD";
    body.innerHTML = state.campaigns.map((item, index) => {
      const c = item.campaign || {}, meta = item.meta || {}, protocol = item.protocol || {};
      return `<tr><td>${entityCell_(c.name, c.meta_campaign_id)}</td><td>${stateBadge_(c.effective_status || c.status)}</td><td class="pubExtTableMetric">${escape_(fmtMoney_(current_(meta.spend), currency))}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_page_views), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_l1), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.add_to_cart), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.purchases), 0)}</td><td class="pubExtTableMetric">${fmtRoas_(current_(meta.roas))}</td><td class="pubExtTableMetric">${fmtNumber_(current_(protocol.paid_orders), 0)}</td><td>${rowButton_("campaign", index)}</td></tr>`;
    }).join("");
  }

  function renderAdsets_() {
    const body = qs_("[data-adsets-body]");
    const count = qs_('[data-count="adsets"]');
    if (count) count.textContent = `${state.adsets.length} conjunto${state.adsets.length === 1 ? "" : "s"}`;
    if (!body) return;
    if (!state.adsets.length) { body.innerHTML = '<tr><td class="pubExtEmpty" colspan="10">No hay conjuntos en el scope actual.</td></tr>'; return; }
    const currency = state.summary?.currency?.meta_account_currency || "USD";
    body.innerHTML = state.adsets.map((item, index) => {
      const a = item.adset || {}, c = item.campaign || {}, meta = item.meta || {};
      return `<tr><td>${entityCell_(a.name, a.meta_adset_id)}</td><td><div class="pubExtEntity__name" title="${escape_(c.name)}">${escape_(c.name || "—")}</div></td><td>${stateBadge_(a.effective_status || a.status)}</td><td class="pubExtTableMetric">${escape_(fmtMoney_(current_(meta.spend), currency))}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_page_views), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_l1), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.add_to_cart), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.purchases), 0)}</td><td class="pubExtTableMetric">${fmtRoas_(current_(meta.roas))}</td><td>${rowButton_("adset", index)}</td></tr>`;
    }).join("");
  }

  function renderAds_() {
    const body = qs_("[data-ads-body]");
    const count = qs_('[data-count="ads"]');
    if (count) count.textContent = `${state.ads.length} anuncio${state.ads.length === 1 ? "" : "s"}`;
    if (!body) return;
    if (!state.ads.length) { body.innerHTML = '<tr><td class="pubExtEmpty" colspan="11">No hay anuncios en el scope actual.</td></tr>'; return; }
    const currency = state.summary?.currency?.meta_account_currency || "USD";
    body.innerHTML = state.ads.map((item, index) => {
      const ad = item.ad || {}, adset = item.adset || {}, meta = item.meta || {}, protocol = item.protocol || {};
      const metaPurchases = current_(meta.purchases), protocolPaid = current_(protocol.paid_orders), mismatch = Math.abs(metaPurchases - protocolPaid) > .0001;
      return `<tr><td>${entityCell_(ad.name, ad.meta_ad_id)}</td><td><div class="pubExtEntity__name" title="${escape_(adset.name)}">${escape_(adset.name || "—")}</div></td><td>${stateBadge_(ad.effective_status || ad.status)}</td><td class="pubExtTableMetric">${escape_(fmtMoney_(current_(meta.spend), currency))}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_page_views), 0)}</td><td><span class="pubExtLadder"><span>${fmtNumber_(current_(meta.landing_l1), 0)}</span><span>${fmtNumber_(current_(meta.landing_l2), 0)}</span><span>${fmtNumber_(current_(meta.landing_l3), 0)}</span></span></td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.add_to_cart), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(metaPurchases, 0)}</td><td class="pubExtTableMetric">${mismatch ? '<span class="pubExtState pubExtState--warn">' : ""}${fmtNumber_(protocolPaid, 0)}${mismatch ? "</span>" : ""}</td><td>${cpaCellForAd_(item, index)}</td><td>${rowButton_("ad", index)}</td></tr>`;
    }).join("");
  }

  function renderTracking_() {
    const summary = state.trackingSummary || {}, statusCounts = summary.tracking_status_counts || {};
    const map = { ads: summary.ads_in_scope, valid: num_(statusCounts.valid), params: summary.parameters_count, invalid: summary.invalid_parameters_count };
    Object.entries(map).forEach(([key, value]) => { const el = qs_(`[data-tracking-kpi="${key}"]`); if (el) el.textContent = fmtNumber_(value, 0); });
    const body = qs_("[data-tracking-body]");
    const count = qs_('[data-count="tracking"]');
    if (count) count.textContent = `${state.tracking.length} registro${state.tracking.length === 1 ? "" : "s"}`;
    if (!body) return;
    if (!state.tracking.length) { body.innerHTML = '<tr><td class="pubExtEmpty" colspan="7">No hay tracking estructural disponible.</td></tr>'; return; }
    body.innerHTML = state.tracking.map((item, index) => {
      const ad = item.ad || {}, tracking = item.tracking || {}, adId = tracking.ad_id || {}, obs = item.protocol_observation || {};
      const params = num_(tracking.parameters_count), validParams = num_(tracking.valid_parameters_count);
      return `<tr><td>${entityCell_(ad.name, ad.meta_ad_id)}</td><td>${stateBadge_(tracking.status)}</td><td>${adId.present && adId.is_dynamic ? '<span class="pubExtState pubExtState--valid">Dinámico</span>' : adId.present ? '<span class="pubExtState pubExtState--warn">Estático</span>' : '<span class="pubExtState pubExtState--invalid">Falta</span>'}</td><td class="pubExtTableMetric">${validParams}/${params}</td><td>${tracking.url_tags_match_creative ? '<span class="pubExtState pubExtState--valid">Coincide</span>' : '<span class="pubExtState pubExtState--warn">Revisar</span>'}</td><td class="pubExtTableMetric">${fmtNumber_(current_(obs.attributed_orders), 0)}</td><td>${rowButton_("tracking", index)}</td></tr>`;
    }).join("");
  }

  function renderAll_() {
    renderHeader_(); renderKpis_(); renderFunnel_(); renderCompare_(); renderMetricGrid_(); renderCampaigns_(); renderAdsets_(); renderAds_(); renderTracking_();
  }

  function directBindingFor_(scope, metaEntityId) {
  return state.bindingCatalog.directBindings.find((binding) =>
    clean_(binding?.scope) === clean_(scope) &&
    clean_(binding?.meta_entity_id) === clean_(metaEntityId)
  ) || null;
}

function resolvedBindingForAd_(metaAdId) {
  return state.bindingCatalog.resolvedAds.find((row) =>
    clean_(row?.meta_ad_id) === clean_(metaAdId)
  ) || null;
}

function bindingInfoFor_(type, item) {
  if (!state.bindingCatalog.loaded) {
    return {
      loading: true,
      hasBinding: false,
      direct: false,
      inherited: false,
      scope: null,
      sourceLabel: "Cargando vinculación…",
      salesUnitType: null,
      salesUnitName: null,
      estimatedCpa: null
    };
  }

  if (type === "campaign") {
    const campaign = item?.campaign || {};
    const direct = directBindingFor_("campaign", campaign.meta_campaign_id);

    if (!direct) {
      return {
        loading: false,
        hasBinding: false,
        direct: false,
        inherited: false,
        scope: null,
        sourceLabel: "Sin vincular",
        salesUnitType: null,
        salesUnitName: null,
        estimatedCpa: null
      };
    }

    return {
      loading: false,
      hasBinding: true,
      direct: true,
      inherited: false,
      scope: "campaign",
      sourceLabel: "Vínculo directo",
      salesUnitType: direct.sales_unit_type,
      salesUnitName: direct.sales_unit_name,
      estimatedCpa: direct.estimated_cpa
    };
  }

  if (type === "adset") {
    const adset = item?.adset || {};
    const campaign = item?.campaign || {};

    const direct = directBindingFor_("adset", adset.meta_adset_id);

    if (direct) {
      return {
        loading: false,
        hasBinding: true,
        direct: true,
        inherited: false,
        scope: "adset",
        sourceLabel: "Vínculo directo",
        salesUnitType: direct.sales_unit_type,
        salesUnitName: direct.sales_unit_name,
        estimatedCpa: direct.estimated_cpa
      };
    }

    const inherited = directBindingFor_("campaign", campaign.meta_campaign_id);

    if (inherited) {
      return {
        loading: false,
        hasBinding: true,
        direct: false,
        inherited: true,
        scope: "campaign",
        sourceLabel: "Heredado desde Campaña",
        salesUnitType: inherited.sales_unit_type,
        salesUnitName: inherited.sales_unit_name,
        estimatedCpa: inherited.estimated_cpa
      };
    }

    return {
      loading: false,
      hasBinding: false,
      direct: false,
      inherited: false,
      scope: null,
      sourceLabel: "Sin vincular",
      salesUnitType: null,
      salesUnitName: null,
      estimatedCpa: null
    };
  }

  if (type === "ad") {
    const ad = item?.ad || {};
    const resolved = resolvedBindingForAd_(ad.meta_ad_id);

    if (!resolved?.binding_id) {
      return {
        loading: false,
        hasBinding: false,
        direct: false,
        inherited: false,
        scope: null,
        sourceLabel: "Sin vincular",
        salesUnitType: null,
        salesUnitName: null,
        estimatedCpa: null
      };
    }

    const inherited = Boolean(resolved.is_inherited);
    const sourceLabel = inherited
      ? resolved.resolved_scope === "adset"
        ? "Heredado desde Conjunto"
        : "Heredado desde Campaña"
      : "Vínculo directo";

    return {
      loading: false,
      hasBinding: true,
      direct: !inherited,
      inherited,
      scope: resolved.resolved_scope,
      sourceLabel,
      salesUnitType: resolved.sales_unit_type,
      salesUnitName: resolved.sales_unit_name,
      estimatedCpa: resolved.estimated_cpa
    };
  }

  return {
    loading: false,
    hasBinding: false,
    direct: false,
    inherited: false,
    scope: null,
    sourceLabel: "Sin vincular",
    salesUnitType: null,
    salesUnitName: null,
    estimatedCpa: null
  };
}

function salesUnitTypeLabel_(type) {
  return type === "product_set"
    ? "Conjunto de Productos"
    : type === "product"
      ? "Producto"
      : "—";
}

function bindingDrawerSection_(type, item) {
  const info = bindingInfoFor_(type, item);

  if (info.loading) {
    return `
      <section class="pubExtDrawerSection" data-binding-drawer-section>
        <h3 class="pubExtDrawerSection__title">Unidad promocionada</h3>
        <div class="pubExtBindingDrawerState">
          Cargando vinculación…
        </div>
      </section>
    `;
  }

  const cpa = info.estimatedCpa === null || info.estimatedCpa === undefined
    ? "—"
    : fmtNumber_(info.estimatedCpa, 2);

  let actionLabel = "Vincular";

  if (info.direct) {
    actionLabel = "Cambiar vínculo";
  } else if (info.inherited) {
    actionLabel = "Crear vínculo propio";
  }

  const removeButton = info.direct
    ? `<button class="pubExtBtn pubExtBtn--ghost" type="button" data-clear-binding>Quitar</button>`
    : "";

  return `
    <section class="pubExtDrawerSection" data-binding-drawer-section>
      <h3 class="pubExtDrawerSection__title">Unidad promocionada</h3>

      <div class="pubExtDrawerGrid">
        ${drawerMetric_("Estado", info.sourceLabel)}
        ${drawerMetric_("Tipo", salesUnitTypeLabel_(info.salesUnitType))}
        ${drawerMetric_("Unidad", info.salesUnitName || "Sin unidad vinculada")}
        ${drawerMetric_("CPA estimado", cpa)}
      </div>

      <div class="pubExtBindingDrawerActions">
        <button
          class="pubExtBtn pubExtBtn--primary"
          type="button"
          data-open-binding
          data-binding-scope="${escape_(type)}"
        >
          ${escape_(actionLabel)}
        </button>

        ${removeButton}
      </div>
    </section>
  `;
}

function bindingEntityContext_(type, index) {
  if (type === "campaign") {
    const item = state.campaigns[index];
    const entity = item?.campaign || {};

    return {
      scope: "campaign",
      index,
      metaEntityId: clean_(entity.meta_campaign_id),
      entityName: clean_(entity.name) || clean_(entity.meta_campaign_id)
    };
  }

  if (type === "adset") {
    const item = state.adsets[index];
    const entity = item?.adset || {};

    return {
      scope: "adset",
      index,
      metaEntityId: clean_(entity.meta_adset_id),
      entityName: clean_(entity.name) || clean_(entity.meta_adset_id)
    };
  }

  if (type === "ad") {
    const item = state.ads[index];
    const entity = item?.ad || {};

    return {
      scope: "ad",
      index,
      metaEntityId: clean_(entity.meta_ad_id),
      entityName: clean_(entity.name) || clean_(entity.meta_ad_id)
    };
  }

  return null;
}

function selectableBindingUnits_(salesUnitType) {
  if (salesUnitType === "product_set") {
    return state.bindingCatalog.productSets.filter((item) =>
      clean_(item?.estado).toLowerCase() === "active"
    );
  }

  return state.bindingCatalog.products.filter((item) =>
    clean_(item?.estado).toLowerCase() === "active"
  );
}

function bindingUnitId_(item, salesUnitType) {
  return salesUnitType === "product_set"
    ? clean_(item?.offer_set_id)
    : clean_(item?.sku);
}

function bindingUnitName_(item, salesUnitType) {
  return salesUnitType === "product_set"
    ? clean_(item?.nombre_interno) || "Conjunto sin nombre"
    : clean_(item?.nombre_producto) || "Producto sin nombre";
}

function bindingUnitCpa_(item, salesUnitType) {
  return salesUnitType === "product_set"
    ? item?.cpa
    : item?.cpa_costo;
}

function selectedBindingUnit_() {
  const type = state.bindingModal.salesUnitType;
  const selectedId = clean_(state.bindingModal.selectedUnitId);

  if (!selectedId) return null;

  return selectableBindingUnits_(type).find((item) =>
    bindingUnitId_(item, type) === selectedId
  ) || null;
}

function effectiveBindingSeed_(scope, index) {
  if (scope === "campaign") {
    const item = state.campaigns[index];
    const metaId = item?.campaign?.meta_campaign_id;
    const direct = directBindingFor_("campaign", metaId);

    if (!direct) return null;

    return {
      salesUnitType: direct.sales_unit_type,
      selectedUnitId: direct.sales_unit_type === "product_set"
        ? direct.offer_set_id
        : direct.product_sku
    };
  }

  if (scope === "adset") {
    const item = state.adsets[index];
    const direct = directBindingFor_(
      "adset",
      item?.adset?.meta_adset_id
    );

    if (direct) {
      return {
        salesUnitType: direct.sales_unit_type,
        selectedUnitId: direct.sales_unit_type === "product_set"
          ? direct.offer_set_id
          : direct.product_sku
      };
    }

    const inherited = directBindingFor_(
      "campaign",
      item?.campaign?.meta_campaign_id
    );

    if (!inherited) return null;

    return {
      salesUnitType: inherited.sales_unit_type,
      selectedUnitId: inherited.sales_unit_type === "product_set"
        ? inherited.offer_set_id
        : inherited.product_sku
    };
  }

  if (scope === "ad") {
    const item = state.ads[index];
    const resolved = resolvedBindingForAd_(item?.ad?.meta_ad_id);

    if (!resolved?.binding_id) return null;

    return {
      salesUnitType: resolved.sales_unit_type,
      selectedUnitId: resolved.sales_unit_type === "product_set"
        ? resolved.offer_set_id
        : resolved.product_sku
    };
  }

  return null;
}

function setBindingError_(message) {
  const error = qs_("[data-binding-error]");

  if (!error) return;

  const text = clean_(message);
  error.textContent = text;
  error.hidden = !text;
}

function renderBindingSelection_() {
  const selected = selectedBindingUnit_();
  const type = state.bindingModal.salesUnitType;

  const typeEl = qs_("[data-binding-selection-type]");
  const nameEl = qs_("[data-binding-selection-name]");
  const cpaEl = qs_("[data-binding-selection-cpa]");
  const confirm = qs_("[data-confirm-binding]");

  if (typeEl) {
    typeEl.textContent = selected
      ? salesUnitTypeLabel_(type)
      : "—";
  }

  if (nameEl) {
    nameEl.textContent = selected
      ? bindingUnitName_(selected, type)
      : "—";
  }

  if (cpaEl) {
    const cpa = selected
      ? bindingUnitCpa_(selected, type)
      : null;

    cpaEl.textContent =
      cpa === null || cpa === undefined
        ? "—"
        : fmtNumber_(cpa, 2);
  }

  if (confirm) {
    confirm.disabled = !selected || state.bindingModal.busy;
  }
}

function renderBindingUnits_() {
  const list = qs_("[data-binding-unit-list]");
  if (!list) return;

  const type = state.bindingModal.salesUnitType;
  const units = selectableBindingUnits_(type);
  const selectedId = clean_(state.bindingModal.selectedUnitId);

  if (!units.length) {
    list.innerHTML = `
      <div class="pubExtBindingUnits__empty">
        ${
          type === "product_set"
            ? "No hay Conjuntos de Productos activos disponibles."
            : "No hay Productos activos disponibles."
        }
      </div>
    `;
    renderBindingSelection_();
    return;
  }

  list.innerHTML = units.map((item) => {
    const id = bindingUnitId_(item, type);
    const name = bindingUnitName_(item, type);
    const cpa = bindingUnitCpa_(item, type);
    const selected = id === selectedId;

    let meta = "";

    if (type === "product_set") {
      const components = Array.isArray(item?.components)
        ? item.components
        : [];

      const componentText = components
        .map((component) =>
          `${clean_(component?.nombre_producto) || clean_(component?.sku)} × ${num_(component?.quantity) || 1}`
        )
        .filter(Boolean)
        .join(" · ");

      meta = componentText ||
        `Variante Shopify · ${clean_(item?.id_variante_shopify) || "—"}`;
    } else {
      meta = `SKU · ${id || "—"}`;
    }

    return `
      <button
        class="pubExtBindingUnit${selected ? " is-selected" : ""}"
        type="button"
        data-binding-unit-id="${escape_(id)}"
      >
        <span class="pubExtBindingUnit__radio" aria-hidden="true"></span>

        <span class="pubExtBindingUnit__content">
          <strong>${escape_(name)}</strong>
          <small>${escape_(meta)}</small>
        </span>

        <span class="pubExtBindingUnit__cpa">
          CPA ${escape_(
            cpa === null || cpa === undefined
              ? "—"
              : fmtNumber_(cpa, 2)
          )}
        </span>
      </button>
    `;
  }).join("");

  renderBindingSelection_();
}

function renderBindingModal_() {
  const modal = state.bindingModal;

  qsa_('input[name="pubExtBindingType"]').forEach((input) => {
    input.checked = input.value === modal.salesUnitType;
  });

  const nameEl = qs_("[data-binding-entity-name]");
  const scopeEl = qs_("[data-binding-entity-scope]");

  if (nameEl) nameEl.textContent = modal.entityName || "—";

  if (scopeEl) {
    scopeEl.textContent =
      modal.scope === "campaign"
        ? "Campaña"
        : modal.scope === "adset"
          ? "Conjunto de anuncios"
          : modal.scope === "ad"
            ? "Anuncio"
            : "—";
  }

  setBindingError_("");
  renderBindingUnits_();
}

async function openBindingModal_(scope, index) {
  const context = bindingEntityContext_(scope, index);

  if (!context?.metaEntityId) {
    setNotice_("No se pudo identificar la entidad de Meta.");
    return;
  }

  try {
    await loadBindingCatalog_();
  } catch (error) {
    console.error("[publicidad-externa] binding modal catalog error", error);
    setNotice_(
      error?.message ||
      "No se pudieron cargar las unidades disponibles."
    );
    return;
  }

  const seed = effectiveBindingSeed_(scope, index);

  state.bindingModal.open = true;
  state.bindingModal.scope = context.scope;
  state.bindingModal.index = context.index;
  state.bindingModal.metaEntityId = context.metaEntityId;
  state.bindingModal.entityName = context.entityName;
  state.bindingModal.salesUnitType =
    seed?.salesUnitType === "product_set"
      ? "product_set"
      : "product";
  state.bindingModal.selectedUnitId =
    clean_(seed?.selectedUnitId) || null;
  state.bindingModal.busy = false;

  const overlay = qs_("[data-binding-overlay]");
  const dialog = qs_("[data-binding-dialog]");

  if (!overlay || !dialog) return;

  dialog.dataset.mode = "idle";
  renderBindingModal_();

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
}

function closeBindingModal_() {
  if (state.bindingModal.busy) return;

  const overlay = qs_("[data-binding-overlay]");

  if (overlay) {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  state.bindingModal.open = false;
  state.bindingModal.scope = null;
  state.bindingModal.index = null;
  state.bindingModal.metaEntityId = null;
  state.bindingModal.entityName = "";
  state.bindingModal.salesUnitType = "product";
  state.bindingModal.selectedUnitId = null;
  state.bindingModal.busy = false;

  setBindingError_("");
}

function selectBindingType_(salesUnitType) {
  if (
    salesUnitType !== "product" &&
    salesUnitType !== "product_set"
  ) {
    return;
  }

  state.bindingModal.salesUnitType = salesUnitType;
  state.bindingModal.selectedUnitId = null;
  renderBindingUnits_();
}

function selectBindingUnit_(unitId) {
  const id = clean_(unitId);
  if (!id) return;

  state.bindingModal.selectedUnitId = id;
  renderBindingUnits_();
}

async function confirmBindingClear_() {
  const clearState = state.bindingClear;

  if (!clearState || clearState.busy) return;

  const scope = clean_(clearState.scope);
  const index = clearState.index;
  const metaEntityId = clean_(clearState.metaEntityId);
  const entityName = clean_(clearState.entityName) || "—";

  if (
    !scope ||
    index === null ||
    index === undefined ||
    !metaEntityId
  ) {
    setBindingClearError_(
      "No se pudo identificar el vínculo que se quiere quitar."
    );
    return;
  }

  const confirm = qs_("[data-confirm-binding-clear]");
  const dialog = qs_("[data-binding-clear-dialog]");
  const previousText =
    confirm?.textContent || "Quitar vínculo";

  clearState.busy = true;
  setBindingClearError_("");

  if (dialog) {
    dialog.dataset.mode = "loading";
  }

  if (confirm) {
    confirm.disabled = true;
    confirm.textContent = "Quitando…";
  }

  try {
    await invokeSalesUnitBindings_({
      action: "clear",
      scope,
      meta_entity_id: metaEntityId
    });

    await loadBindingCatalog_(true);

    clearState.busy = false;

    if (dialog) {
      dialog.dataset.mode = "idle";
    }

    closeBindingClearModal_();

    openDetail_(scope, index);

    openBindingClearResultModal_({
      scope,
      index,
      entityName
    });
  } catch (error) {
    console.error(
      "[publicidad-externa] binding clear error",
      error
    );

    clearState.busy = false;

    if (dialog) {
      dialog.dataset.mode = "error";
    }

    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = previousText;
    }

    setBindingClearError_(
      error?.message ||
      "No se pudo quitar la vinculación publicitaria."
    );
  }
}

function bindingInfoAfterClear_(scope, index) {
  if (scope === "campaign") {
    const item = state.campaigns[index];
    return item ? bindingInfoFor_("campaign", item) : null;
  }

  if (scope === "adset") {
    const item = state.adsets[index];
    return item ? bindingInfoFor_("adset", item) : null;
  }

  if (scope === "ad") {
    const item = state.ads[index];
    return item ? bindingInfoFor_("ad", item) : null;
  }

  return null;
}

function openBindingClearResultModal_(data) {
  const overlay = qs_("[data-binding-clear-result-overlay]");
  const dialog = qs_("[data-binding-clear-result-dialog]");

  if (!overlay || !dialog) {
    console.warn(
      "[publicidad-externa] no se encontró el modal de resultado de Quitar."
    );
    return;
  }

  const scope = clean_(data?.scope);
  const index = data?.index;
  const entityName = clean_(data?.entityName) || "—";
  const info = bindingInfoAfterClear_(scope, index);

  const entityEl = qs_("[data-binding-clear-result-entity]");
  const scopeEl = qs_("[data-binding-clear-result-scope]");
  const introEl = qs_("[data-binding-clear-result-intro]");
  const stateEl = qs_("[data-binding-clear-result-state]");
  const statusEl = qs_("[data-binding-clear-result-status]");
  const typeEl = qs_("[data-binding-clear-result-type]");
  const unitEl = qs_("[data-binding-clear-result-unit]");
  const noteEl = qs_("[data-binding-clear-result-note]");

  if (entityEl) {
    entityEl.textContent = entityName;
  }

  if (scopeEl) {
    scopeEl.textContent = bindingScopeLabel_(scope);
  }

  if (introEl) {
    introEl.textContent =
      `El vínculo directo de "${entityName}" fue eliminado correctamente.`;
  }

  if (stateEl) {
    stateEl.classList.remove(
      "is-inherited",
      "is-unbound"
    );
  }

  if (info?.hasBinding && info?.inherited) {
    if (stateEl) {
      stateEl.classList.add("is-inherited");
    }

    if (statusEl) {
      statusEl.textContent = info.sourceLabel || "Vínculo heredado";
    }

    if (typeEl) {
      typeEl.textContent =
        salesUnitTypeLabel_(info.salesUnitType);
    }

    if (unitEl) {
      unitEl.textContent =
        info.salesUnitName || "—";
    }

    if (noteEl) {
      noteEl.textContent =
        `Al quitar el vínculo directo, ${bindingScopeLabel_(scope).toLowerCase()} volvió a utilizar la unidad promocionada definida en el nivel superior.`;
    }
  } else {
    if (stateEl) {
      stateEl.classList.add("is-unbound");
    }

    if (statusEl) {
      statusEl.textContent = "Sin vincular";
    }

    if (typeEl) {
      typeEl.textContent = "—";
    }

    if (unitEl) {
      unitEl.textContent = "—";
    }

    if (noteEl) {
      noteEl.textContent =
        "No existe una vinculación superior disponible, por lo que esta entidad quedó sin unidad promocionada.";
    }
  }

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
}

function closeBindingClearResultModal_() {
  const overlay = qs_("[data-binding-clear-result-overlay]");

  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

function setBindingClearError_(message) {
  const errorEl = qs_("[data-binding-clear-error]");
  if (!errorEl) return;

  const text = clean_(message);

  errorEl.textContent = text;
  errorEl.hidden = !text;
}

function openBindingClearModal_(scope, index) {
  const context = bindingEntityContext_(scope, index);

  if (!context?.metaEntityId) {
    setNotice_("No se pudo identificar la entidad de Meta.");
    return;
  }

  const direct = directBindingFor_(
    context.scope,
    context.metaEntityId
  );

  if (!direct) {
    setNotice_(
      "Esta entidad no tiene un vínculo directo para quitar."
    );
    return;
  }

  const overlay = qs_("[data-binding-clear-overlay]");
  const dialog = qs_("[data-binding-clear-dialog]");

  if (!overlay || !dialog) {
    setNotice_("No se encontró el modal para quitar la vinculación.");
    return;
  }

  state.bindingClear = {
    open: true,
    busy: false,
    scope: context.scope,
    index: context.index,
    metaEntityId: context.metaEntityId,
    entityName: context.entityName,
    bindingId: clean_(direct?.id || direct?.binding_id) || null,
    salesUnitType: clean_(direct?.sales_unit_type),
    salesUnitName: clean_(direct?.sales_unit_name)
  };

  const entityEl = qs_("[data-binding-clear-entity]");
  const scopeEl = qs_("[data-binding-clear-scope]");
  const unitEl = qs_("[data-binding-clear-unit]");
  const typeEl = qs_("[data-binding-clear-type]");
  const confirmEl = qs_("[data-confirm-binding-clear]");

  if (entityEl) {
    entityEl.textContent = context.entityName || "—";
  }

  if (scopeEl) {
    scopeEl.textContent = bindingScopeLabel_(context.scope);
  }

  if (unitEl) {
    unitEl.textContent =
      clean_(direct?.sales_unit_name) || "—";
  }

  if (typeEl) {
    typeEl.textContent =
      salesUnitTypeLabel_(direct?.sales_unit_type);
  }

  if (confirmEl) {
    confirmEl.disabled = false;
    confirmEl.textContent = "Quitar vínculo";
  }

  dialog.dataset.mode = "idle";
  setBindingClearError_("");

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
}

function closeBindingClearModal_() {
  if (state.bindingClear?.busy) return;

  const overlay = qs_("[data-binding-clear-overlay]");

  if (overlay) {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  state.bindingClear = null;
  setBindingClearError_("");
}

function bindingScopeLabel_(scope) {
  if (scope === "campaign") return "Campaña";
  if (scope === "adset") return "Conjunto de anuncios";
  if (scope === "ad") return "Anuncio";
  return "Entidad Meta";
}

function bindingScopeSentence_(scope, entityName, unitType, unitName) {
  const safeEntityName = clean_(entityName) || "—";
  const safeUnitName = clean_(unitName) || "—";

  if (scope === "campaign") {
    return unitType === "product_set"
      ? `La campaña "${safeEntityName}" fue vinculada correctamente al Conjunto de Productos "${safeUnitName}".`
      : `La campaña "${safeEntityName}" fue vinculada correctamente al producto "${safeUnitName}".`;
  }

  if (scope === "adset") {
    return unitType === "product_set"
      ? `El conjunto de anuncios "${safeEntityName}" fue vinculado correctamente al Conjunto de Productos "${safeUnitName}".`
      : `El conjunto de anuncios "${safeEntityName}" fue vinculado correctamente al producto "${safeUnitName}".`;
  }

  if (scope === "ad") {
    return unitType === "product_set"
      ? `El anuncio "${safeEntityName}" fue vinculado correctamente al Conjunto de Productos "${safeUnitName}".`
      : `El anuncio "${safeEntityName}" fue vinculado correctamente al producto "${safeUnitName}".`;
  }

  return `La entidad "${safeEntityName}" fue vinculada correctamente a "${safeUnitName}".`;
}

function openBindingSuccessModal_(data) {
  const overlay = qs_("[data-binding-success-overlay]");
  const dialog = qs_("[data-binding-success-dialog]");

  if (!overlay || !dialog) {
    console.warn(
      "[publicidad-externa] no se encontró el modal de confirmación."
    );
    return;
  }

  const entityEl = qs_("[data-binding-success-entity]");
  const scopeEl = qs_("[data-binding-success-scope]");
  const unitEl = qs_("[data-binding-success-unit]");
  const typeEl = qs_("[data-binding-success-type]");
  const cpaEl = qs_("[data-binding-success-cpa]");
  const noteEl = qs_("[data-binding-success-note]");
  const introEl = dialog.querySelector(".pubExtBindingDialog__intro");

  const scope = clean_(data?.scope);
  const entityName = clean_(data?.entityName) || "—";
  const salesUnitType =
    data?.salesUnitType === "product_set"
      ? "product_set"
      : "product";
  const unitName = clean_(data?.unitName) || "—";
  const cpa = data?.cpa;

  if (entityEl) {
    entityEl.textContent = entityName;
  }

  if (scopeEl) {
    scopeEl.textContent = bindingScopeLabel_(scope);
  }

  if (unitEl) {
    unitEl.textContent = unitName;
  }

  if (typeEl) {
    typeEl.textContent = salesUnitTypeLabel_(salesUnitType);
  }

  if (cpaEl) {
    cpaEl.textContent =
      cpa === null || cpa === undefined
        ? "—"
        : fmtNumber_(cpa, 2);
  }

  if (introEl) {
    introEl.textContent = bindingScopeSentence_(
      scope,
      entityName,
      salesUnitType,
      unitName
    );
  }

  if (noteEl) {
    noteEl.textContent = data?.isOverride
      ? "Este vínculo directo ahora tiene prioridad sobre cualquier vínculo heredado desde un nivel superior."
      : "";
  }

  dialog.dataset.mode = "success";

  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
}

function closeBindingSuccessModal_() {
  const overlay = qs_("[data-binding-success-overlay]");

  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

async function confirmBinding_() {
  if (state.bindingModal.busy) return;

  const selected = selectedBindingUnit_();

  if (!selected) {
    setBindingError_("Seleccioná una unidad antes de vincular.");
    return;
  }

  const scope = state.bindingModal.scope;
  const index = state.bindingModal.index;
  const metaEntityId = clean_(state.bindingModal.metaEntityId);
  const salesUnitType = state.bindingModal.salesUnitType;

  if (
    !scope ||
    index === null ||
    index === undefined ||
    !metaEntityId
  ) {
    setBindingError_(
      "No se pudo identificar la entidad de Meta que se quiere vincular."
    );
    return;
  }

  const confirm = qs_("[data-confirm-binding]");
  const dialog = qs_("[data-binding-dialog]");
  const previousText = confirm?.textContent || "Vincular";

  const previousEffective = effectiveBindingSeed_(scope, index);
  const existingDirect = directBindingFor_(scope, metaEntityId);

  const successContext = {
    scope,
    entityName: state.bindingModal.entityName,
    salesUnitType,
    unitName: bindingUnitName_(selected, salesUnitType),
    cpa: bindingUnitCpa_(selected, salesUnitType),
    isOverride:
      scope !== "campaign" &&
      !existingDirect &&
      !!clean_(previousEffective?.selectedUnitId)
  };

  state.bindingModal.busy = true;
  setBindingError_("");

  if (dialog) {
    dialog.dataset.mode = "loading";
  }

  if (confirm) {
    confirm.disabled = true;
    confirm.textContent = "Vinculando…";
  }

  const payload = {
    action: "set",
    scope,
    meta_entity_id: metaEntityId,
    sales_unit_type: salesUnitType
  };

  if (salesUnitType === "product_set") {
    payload.offer_set_id = bindingUnitId_(
      selected,
      salesUnitType
    );
  } else {
    payload.product_sku = bindingUnitId_(
      selected,
      salesUnitType
    );
  }

  try {
    await invokeSalesUnitBindings_(payload);

    await loadBindingCatalog_(true);

    state.bindingModal.busy = false;

    if (dialog) {
      dialog.dataset.mode = "idle";
    }

    closeBindingModal_();

    openDetail_(scope, index);

    openBindingSuccessModal_(successContext);
  } catch (error) {
    console.error(
      "[publicidad-externa] binding set error",
      error
    );

    state.bindingModal.busy = false;

    if (dialog) {
      dialog.dataset.mode = "error";
    }

    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = previousText;
    }

    setBindingError_(
      error?.message ||
      "No se pudo guardar la vinculación publicitaria."
    );
  }
}

function drawerMetric_(label, value) {
    return `<div class="pubExtDrawerMetric"><span>${escape_(label)}</span><strong>${escape_(value ?? "—")}</strong></div>`;
  }

  function detailMetrics_(item) {
    const meta = item?.meta || {}, protocol = item?.protocol || {};
    const currency = item?.currency?.meta_account_currency || state.summary?.currency?.meta_account_currency || "USD";
    return `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Rendimiento Meta</h3><div class="pubExtDrawerGrid">${drawerMetric_("Gasto", fmtMoney_(current_(meta.spend), currency))}${drawerMetric_("LPV", fmtNumber_(current_(meta.landing_page_views), 0))}${drawerMetric_("L1", fmtNumber_(current_(meta.landing_l1), 0))}${drawerMetric_("L2", fmtNumber_(current_(meta.landing_l2), 0))}${drawerMetric_("L3", fmtNumber_(current_(meta.landing_l3), 0))}${drawerMetric_("ATC", fmtNumber_(current_(meta.add_to_cart), 0))}${drawerMetric_("Checkout", fmtNumber_(current_(meta.initiate_checkout), 0))}${drawerMetric_("Compras", fmtNumber_(current_(meta.purchases), 0))}${drawerMetric_("ROAS", fmtRoas_(current_(meta.roas)))}${drawerMetric_("CTR", fmtPercent_(current_(meta.ctr), 2))}</div></section><section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Observación Protocol</h3><div class="pubExtDrawerGrid">${drawerMetric_("Pedidos atribuidos", fmtNumber_(current_(protocol.attributed_orders), 0))}${drawerMetric_("Pedidos pagados", fmtNumber_(current_(protocol.paid_orders), 0))}${drawerMetric_("Revenue real", revenueText_(protocol.revenue_by_currency?.current || {}))}${drawerMetric_("ROAS Protocol", protocol.roas?.current_status === "comparable" ? fmtRoas_(protocol.roas.current) : "No comparable")}</div></section>`;
  }

  function openDetail_(type, index) {
    let item = null, eyebrow = "Detalle", title = "—", body = "";
    if (type === "campaign") {
      item = state.campaigns[index]; if (!item) return; const e = item.campaign || {}; eyebrow = "Campaña"; title = e.name || e.meta_campaign_id || "Campaña";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Identidad</h3><div class="pubExtDrawerGrid">${drawerMetric_("Campaign ID", e.meta_campaign_id)}${drawerMetric_("Estado", e.effective_status || e.status)}${drawerMetric_("Objetivo", e.objective || "—")}${drawerMetric_("Bid strategy", e.bid_strategy || "—")}</div></section>${bindingDrawerSection_(type, item)}${detailMetrics_(item)}`;
    } else if (type === "adset") {
      item = state.adsets[index]; if (!item) return; const e = item.adset || {}; eyebrow = "Conjunto de anuncios"; title = e.name || e.meta_adset_id || "Conjunto";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Jerarquía</h3><div class="pubExtDrawerGrid">${drawerMetric_("AdSet ID", e.meta_adset_id)}${drawerMetric_("Campaña", item.campaign?.name || "—")}${drawerMetric_("Estado", e.effective_status || e.status)}${drawerMetric_("Presupuesto", e.daily_budget_raw || e.lifetime_budget_raw || "—")}</div></section>${bindingDrawerSection_(type, item)}${detailMetrics_(item)}`;
    } else if (type === "ad") {
      item = state.ads[index]; if (!item) return; const e = item.ad || {}, creative = item.creative || {}; eyebrow = "Anuncio"; title = e.name || e.meta_ad_id || "Anuncio";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Jerarquía</h3><div class="pubExtDrawerGrid">${drawerMetric_("Ad ID", e.meta_ad_id)}${drawerMetric_("Conjunto", item.adset?.name || "—")}${drawerMetric_("Campaña", item.campaign?.name || "—")}${drawerMetric_("Estado", e.effective_status || e.status)}</div></section>${bindingDrawerSection_(type, item)}${detailMetrics_(item)}<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Creativo</h3><div class="pubExtDrawerGrid">${drawerMetric_("Creative ID", creative.meta_creative_id || e.meta_creative_id)}${drawerMetric_("Tipo", creative.object_type || "—")}${drawerMetric_("Título", creative.title || creative.name || "—")}${drawerMetric_("URL", creative.link_url || "—")}</div>${creative.url_tags ? `<h3 class="pubExtDrawerSection__title" style="margin-top:14px">URL tags</h3><pre class="pubExtDrawerCode">${escape_(creative.url_tags)}</pre>` : ""}</section>`;
    } else if (type === "tracking") {
      item = state.tracking[index]; if (!item) return; const ad = item.ad || {}, tracking = item.tracking || {}, adId = tracking.ad_id || {}, params = Array.isArray(tracking.parameters) ? tracking.parameters : [], obs = item.protocol_observation || {}; eyebrow = "Tracking"; title = ad.name || ad.meta_ad_id || "Tracking";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Salud</h3><div class="pubExtDrawerGrid">${drawerMetric_("Estado", tracking.status)}${drawerMetric_("Ad ID dinámico", adId.present && adId.is_dynamic ? "Sí" : "No")}${drawerMetric_("Parámetros válidos", `${tracking.valid_parameters_count || 0}/${tracking.parameters_count || 0}`)}${drawerMetric_("Ventas atribuidas", fmtNumber_(current_(obs.attributed_orders), 0))}</div></section><section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">URL</h3><pre class="pubExtDrawerCode">${escape_(tracking.destination_url || "Sin destination_url")}</pre>${tracking.raw_url_tags ? `<h3 class="pubExtDrawerSection__title" style="margin-top:14px">url_tags</h3><pre class="pubExtDrawerCode">${escape_(tracking.raw_url_tags)}</pre>` : ""}</section><section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Parámetros</h3><div class="pubExtParamList">${params.length ? params.map((param) => `<div class="pubExtParam"><span class="pubExtParam__key">${escape_(param.campo_utm || param.field || "—")}</span><span class="pubExtParam__value">${escape_(param.valor_template ?? param.value_template ?? "")}</span><span class="pubExtParam__state ${param.campo_valido === false || param.field_valid === false ? "is-bad" : ""}">${param.campo_valido === false || param.field_valid === false ? "Inválido" : "OK"}</span></div>`).join("") : '<div class="pubExtEmpty">Sin parámetros normalizados.</div>'}</div></section>`;
    }

    const drawer = qs_("[data-drawer]"), backdrop = qs_("[data-drawer-backdrop]"), eyebrowEl = qs_("[data-drawer-eyebrow]"), titleEl = qs_("[data-drawer-title]"), bodyEl = qs_("[data-drawer-body]");
    if (!drawer || !backdrop || !bodyEl) return;
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    if (titleEl) titleEl.textContent = title;
    bodyEl.innerHTML = body;

    drawer.dataset.bindingDetailType = type;
    drawer.dataset.bindingDetailIndex = String(index);

    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => drawer.classList.add("is-open"));

    const isBindingDetail =
      type === "campaign" ||
      type === "adset" ||
      type === "ad";

    if (
      isBindingDetail &&
      !state.bindingCatalog.loaded &&
      !state.bindingCatalog.loading
    ) {
      loadBindingCatalog_()
        .then(() => {
          const currentDrawer = qs_("[data-drawer]");

          if (
            !currentDrawer?.classList.contains("is-open") ||
            currentDrawer.dataset.bindingDetailType !== type ||
            currentDrawer.dataset.bindingDetailIndex !== String(index)
          ) {
            return;
          }

          openDetail_(type, index);
        })
        .catch((error) => {
          console.error(
            "[publicidad-externa] binding catalog error",
            error
          );

          const currentDrawer = qs_("[data-drawer]");

          if (
            !currentDrawer?.classList.contains("is-open") ||
            currentDrawer.dataset.bindingDetailType !== type ||
            currentDrawer.dataset.bindingDetailIndex !== String(index)
          ) {
            return;
          }

          const section = qs_("[data-binding-drawer-section]");

          if (section) {
            section.innerHTML = `
              <h3 class="pubExtDrawerSection__title">
                Unidad promocionada
              </h3>
              <div class="pubExtBindingDrawerState">
                No se pudo cargar la vinculación publicitaria.
              </div>
            `;
          }
        });
    }
  }

  function closeCpaDrawer_() {
    const drawer = qs_("[data-cpa-drawer]");
    const backdrop = qs_("[data-cpa-drawer-backdrop]");

    if (!drawer || !backdrop) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");

    setTimeout(() => {
      if (!drawer.classList.contains("is-open")) {
        backdrop.hidden = true;
      }
    }, 220);
  }

  function cpaChartDateLabel_(value) {
    const parts = clean_(value).split("-");

    if (parts.length !== 3) {
      return clean_(value) || "—";
    }

    return `${parts[2]}/${parts[1]}`;
  }

  function cpaChartPath_(values, xFor, yFor) {
    let path = "";
    let segmentOpen = false;

    values.forEach((value, index) => {
      if (!Number.isFinite(value)) {
        segmentOpen = false;
        return;
      }

      const x = xFor(index).toFixed(2);
      const y = yFor(value).toFixed(2);

      path += `${segmentOpen ? "L" : "M"}${x} ${y} `;
      segmentOpen = true;
    });

    return path.trim();
  }

  function renderCpaTrendChart_(series, estimatedCpa) {
    const rows = Array.isArray(series) ? series : [];

    if (!rows.length) {
      return `
        <div class="pubExtCpaChartEmpty">
          No hay puntos para graficar.
        </div>
      `;
    }

    const target =
      Number.isFinite(Number(estimatedCpa))
        ? Number(estimatedCpa)
        : null;

    const normalized = rows.map((row) => {
      const metaCpa =
        row?.cpa_meta_cumulative_ars === null ||
        row?.cpa_meta_cumulative_ars === undefined
          ? null
          : Number(row.cpa_meta_cumulative_ars);

      const spendRaw =
        row?.spend_cumulative === null ||
        row?.spend_cumulative === undefined
          ? null
          : Number(row.spend_cumulative);

      const rate =
        row?.usd_ars_rate === null ||
        row?.usd_ars_rate === undefined
          ? null
          : Number(row.usd_ars_rate);

      const currency = clean_(row?.meta_currency).toUpperCase();

      let spendArs = null;

      if (Number.isFinite(spendRaw)) {
        if (currency === "ARS") {
          spendArs = spendRaw;
        } else if (
          currency === "USD" &&
          Number.isFinite(rate)
        ) {
          spendArs = spendRaw * rate;
        }
      }

      return {
        date: clean_(row?.series_date),
        target,
        metaCpa: Number.isFinite(metaCpa) ? metaCpa : null,
        spendArs: Number.isFinite(spendArs) ? spendArs : null
      };
    });

    const allValues = [];

    normalized.forEach((point) => {
      if (Number.isFinite(point.target)) {
        allValues.push(point.target);
      }

      if (Number.isFinite(point.metaCpa)) {
        allValues.push(point.metaCpa);
      }

      if (Number.isFinite(point.spendArs)) {
        allValues.push(point.spendArs);
      }
    });

    if (!allValues.length) {
      return `
        <div class="pubExtCpaChartEmpty">
          No hay valores monetarios comparables en ARS.
        </div>
      `;
    }

    const width = 760;
    const height = 270;

    const left = 18;
    const right = 18;
    const top = 18;
    const bottom = 34;

    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const maxValue = Math.max(...allValues, 1) * 1.12;

    const xFor = (index) => {
      if (normalized.length <= 1) {
        return left + plotWidth / 2;
      }

      return left +
        (index / (normalized.length - 1)) *
        plotWidth;
    };

    const yFor = (value) =>
      top +
      (1 - Math.max(0, value) / maxValue) *
      plotHeight;

    const targetValues = normalized.map((point) => point.target);
    const metaValues = normalized.map((point) => point.metaCpa);
    const spendValues = normalized.map((point) => point.spendArs);

    const targetPath = cpaChartPath_(
      targetValues,
      xFor,
      yFor
    );

    const metaPath = cpaChartPath_(
      metaValues,
      xFor,
      yFor
    );

    const spendPath = cpaChartPath_(
      spendValues,
      xFor,
      yFor
    );

    const last = normalized[normalized.length - 1];

    const firstLabel =
      cpaChartDateLabel_(normalized[0]?.date);

    const middleLabel =
      cpaChartDateLabel_(
        normalized[Math.floor((normalized.length - 1) / 2)]?.date
      );

    const lastLabel =
      cpaChartDateLabel_(last?.date);

    const targetText =
      Number.isFinite(last?.target)
        ? fmtMoney_(last.target, "ARS")
        : "—";

    const metaText =
      Number.isFinite(last?.metaCpa)
        ? fmtMoney_(last.metaCpa, "ARS")
        : "Sin compras";

    const spendText =
      Number.isFinite(last?.spendArs)
        ? fmtMoney_(last.spendArs, "ARS")
        : "—";

    const lastIndex = normalized.length - 1;
    const lastX = xFor(lastIndex);

    return `
      <div class="pubExtCpaTrend">
        <div class="pubExtCpaTrend__legend">
          <div class="pubExtCpaTrendLegend pubExtCpaTrendLegend--target">
            <span class="pubExtCpaTrendLegend__dot"></span>
            <span>CPA objetivo</span>
            <strong>${escape_(targetText)}</strong>
          </div>

          <div class="pubExtCpaTrendLegend pubExtCpaTrendLegend--meta">
            <span class="pubExtCpaTrendLegend__dot"></span>
            <span>CPA Meta</span>
            <strong>${escape_(metaText)}</strong>
          </div>

          <div class="pubExtCpaTrendLegend pubExtCpaTrendLegend--spend">
            <span class="pubExtCpaTrendLegend__dot"></span>
            <span>Gasto</span>
            <strong>${escape_(spendText)}</strong>
          </div>
        </div>

        <div class="pubExtCpaTrend__canvas">
          <svg
            class="pubExtCpaTrend__svg"
            viewBox="0 0 ${width} ${height}"
            role="img"
            aria-label="Tendencia de CPA objetivo, CPA Meta y gasto acumulado en pesos argentinos"
          >
            <line
              class="pubExtCpaTrend__grid"
              x1="${left}"
              y1="${top + plotHeight * .25}"
              x2="${width - right}"
              y2="${top + plotHeight * .25}"
            ></line>

            <line
              class="pubExtCpaTrend__grid"
              x1="${left}"
              y1="${top + plotHeight * .5}"
              x2="${width - right}"
              y2="${top + plotHeight * .5}"
            ></line>

            <line
              class="pubExtCpaTrend__grid"
              x1="${left}"
              y1="${top + plotHeight * .75}"
              x2="${width - right}"
              y2="${top + plotHeight * .75}"
            ></line>

            ${
              targetPath
                ? `<path class="pubExtCpaTrend__line pubExtCpaTrend__line--target" d="${targetPath}"></path>`
                : ""
            }

            ${
              metaPath
                ? `<path class="pubExtCpaTrend__line pubExtCpaTrend__line--meta" d="${metaPath}"></path>`
                : ""
            }

            ${
              spendPath
                ? `<path class="pubExtCpaTrend__line pubExtCpaTrend__line--spend" d="${spendPath}"></path>`
                : ""
            }

            ${
              Number.isFinite(last?.target)
                ? `
                  <circle
                    class="pubExtCpaTrend__point pubExtCpaTrend__point--target"
                    cx="${lastX}"
                    cy="${yFor(last.target)}"
                    r="4"
                  ></circle>
                `
                : ""
            }

            ${
              Number.isFinite(last?.metaCpa)
                ? `
                  <circle
                    class="pubExtCpaTrend__point pubExtCpaTrend__point--meta"
                    cx="${lastX}"
                    cy="${yFor(last.metaCpa)}"
                    r="4"
                  ></circle>
                `
                : ""
            }

            ${
              Number.isFinite(last?.spendArs)
                ? `
                  <circle
                    class="pubExtCpaTrend__point pubExtCpaTrend__point--spend"
                    cx="${lastX}"
                    cy="${yFor(last.spendArs)}"
                    r="4"
                  ></circle>
                `
                : ""
            }
          </svg>

          <div class="pubExtCpaTrend__dates">
            <span>${escape_(firstLabel)}</span>
            <span>${escape_(middleLabel)}</span>
            <span>${escape_(lastLabel)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function toggleCpaRateEditor_(open) {
    const display = qs_("[data-cpa-rate-display]");
    const editor = qs_("[data-cpa-rate-editor]");
    const input = qs_("[data-cpa-rate-input]");

    if (!display || !editor) return;

    display.hidden = Boolean(open);
    editor.hidden = !open;

    if (open && input) {
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }
  }

  async function saveCpaRate_() {
    const drawer = qs_("[data-cpa-drawer]");
    const input = qs_("[data-cpa-rate-input]");
    const saveButton = qs_("[data-save-cpa-rate]");

    if (!drawer || !input) return;

    const raw = clean_(input.value).replace(",", ".");
    const rate = Number(raw);

    if (!Number.isFinite(rate) || rate <= 0) {
      setNotice_("Ingresá una cotización USD/ARS válida.");
      input.focus();
      return;
    }

    const scope = clean_(drawer.dataset.cpaScope);
    const index = Number(drawer.dataset.cpaIndex);

    if (
      !scope ||
      !Number.isInteger(index) ||
      index < 0
    ) {
      setNotice_("No se pudo identificar el análisis CPA abierto.");
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Guardando…";
    }

    try {
      const response = await invokeSalesUnitBindings_({
        action: "set_cpa_rate",
        usd_ars_rate: rate
      });

      if (!response?.ok) {
        throw new Error(
          response?.message ||
          "No se pudo actualizar la cotización."
        );
      }

      await openCpaDrawer_(scope, index);
    } catch (error) {
      console.error(
        "[publicidad-externa] set CPA rate error",
        error
      );

      setNotice_(
        error?.message ||
        "No se pudo actualizar la cotización."
      );

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Guardar";
      }
    }
  }

  async function openCpaDrawer_(scope, index) {
    const item =
      scope === "campaign"
        ? state.campaigns[index]
        : scope === "adset"
          ? state.adsets[index]
          : scope === "ad"
            ? state.ads[index]
            : null;

    if (!item) {
      setNotice_("No se pudo identificar la entidad publicitaria.");
      return;
    }

    const info = bindingInfoFor_(scope, item);

    if (!info?.hasBinding) {
      setNotice_("Esta entidad no tiene una unidad promocionada vinculada.");
      return;
    }

    const entity =
      scope === "campaign"
        ? item.campaign || {}
        : scope === "adset"
          ? item.adset || {}
          : item.ad || {};

    const entityName =
      entity.name ||
      "Entidad sin nombre";

    const entityId =
      scope === "campaign"
        ? entity.meta_campaign_id
        : scope === "adset"
          ? entity.meta_adset_id
          : entity.meta_ad_id;

    if (!entityId) {
      setNotice_("No se pudo identificar el ID de Meta.");
      return;
    }

    const estimatedCpa =
      info.estimatedCpa === null || info.estimatedCpa === undefined
        ? "—"
        : fmtMoney_(info.estimatedCpa, "ARS");

    const drawer = qs_("[data-cpa-drawer]");
    const backdrop = qs_("[data-cpa-drawer-backdrop]");
    const body = qs_("[data-cpa-drawer-body]");

    if (!drawer || !backdrop || !body) return;

    const requestKey =
      `${scope}:${clean_(entityId)}:${Date.now()}`;

    drawer.dataset.cpaScope = scope;
    drawer.dataset.cpaIndex = String(index);
    drawer.dataset.metaEntityId = clean_(entityId);
    drawer.dataset.cpaRequestKey = requestKey;

    body.innerHTML = `
      <section class="pubExtDrawerSection">
        <h3 class="pubExtDrawerSection__title">Entidad publicitaria</h3>
        <div class="pubExtDrawerGrid">
          ${drawerMetric_("Nombre", entityName)}
          ${drawerMetric_("ID Meta", entityId || "—")}
        </div>
      </section>

      <section class="pubExtDrawerSection">
        <h3 class="pubExtDrawerSection__title">Unidad promocionada</h3>
        <div class="pubExtDrawerGrid">
          ${drawerMetric_("Tipo", salesUnitTypeLabel_(info.salesUnitType))}
          ${drawerMetric_("Unidad", info.salesUnitName || "—")}
          ${drawerMetric_("Vinculación", info.sourceLabel || "—")}
          ${drawerMetric_("CPA estimado", estimatedCpa)}
        </div>
      </section>

      <section class="pubExtDrawerSection" data-cpa-series-section>
        <h3 class="pubExtDrawerSection__title">Evolución del CPA</h3>
        <div class="pubExtBindingDrawerState">
          Cargando serie temporal…
        </div>
      </section>
    `;

    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
    });

    try {
      const response = await invokeSalesUnitBindings_({
        action: "cpa_series",
        scope,
        meta_entity_id: clean_(entityId),
        date_from: state.dateFrom,
        date_to: state.dateTo
      });

      if (drawer.dataset.cpaRequestKey !== requestKey) {
        return;
      }

      const series = Array.isArray(response?.series)
        ? response.series
        : [];

      const section = qs_("[data-cpa-series-section]");

      if (!section) return;

      if (!series.length) {
        section.innerHTML = `
          <h3 class="pubExtDrawerSection__title">Evolución del CPA</h3>
          <div class="pubExtBindingDrawerState">
            No hay serie CPA disponible para el rango seleccionado.
          </div>
        `;
        return;
      }

      const last = series[series.length - 1] || {};
      const estimatedRaw = Number(
        last.estimated_cpa ?? info.estimatedCpa
      );

      const metaCpaArs =
        last.cpa_meta_cumulative_ars === null ||
        last.cpa_meta_cumulative_ars === undefined
          ? null
          : Number(last.cpa_meta_cumulative_ars);

      const metaCpaRaw =
        last.cpa_meta_cumulative === null ||
        last.cpa_meta_cumulative === undefined
          ? null
          : Number(last.cpa_meta_cumulative);

      const rate =
        last.usd_ars_rate === null ||
        last.usd_ars_rate === undefined
          ? null
          : Number(last.usd_ars_rate);

      const difference =
        Number.isFinite(metaCpaArs) &&
        Number.isFinite(estimatedRaw)
          ? metaCpaArs - estimatedRaw
          : null;

      const differencePct =
        difference !== null &&
        Number.isFinite(estimatedRaw) &&
        estimatedRaw > 0
          ? (difference / estimatedRaw) * 100
          : null;

      const differenceText =
        difference === null
          ? "—"
          : `${difference > 0 ? "+" : ""}${fmtMoney_(difference, "ARS")}${
              differencePct === null
                ? ""
                : ` · ${differencePct > 0 ? "+" : ""}${fmtNumber_(differencePct, 1)}%`
            }`;

      const metaCurrency = clean_(last.meta_currency) || "USD";

      const rawMetaText =
        metaCpaRaw === null
          ? "—"
          : fmtMoney_(metaCpaRaw, metaCurrency);

      const metaArsText =
        metaCpaArs === null
          ? "Sin compras Meta"
          : fmtMoney_(metaCpaArs, "ARS");

      const rateText =
        rate === null
          ? "—"
          : `1 USD = ${fmtMoney_(rate, "ARS")}`;

      section.innerHTML = `
        <h3 class="pubExtDrawerSection__title">Evolución del CPA</h3>

        <div class="pubExtDrawerGrid">
          ${drawerMetric_(
            "CPA estimado",
            Number.isFinite(estimatedRaw)
              ? fmtMoney_(estimatedRaw, "ARS")
              : "—"
          )}

          ${drawerMetric_(
            "CPA Meta actual",
            metaArsText
          )}

          ${drawerMetric_(
            "Diferencia",
            differenceText
          )}

          ${drawerMetric_(
            "CPA Meta original",
            rawMetaText
          )}
        </div>

        ${renderCpaTrendChart_(
          series,
          estimatedRaw
        )}

        <div class="pubExtCpaRateBox">
          <div
            class="pubExtCpaRateBox__display"
            data-cpa-rate-display
          >
            <div>
              <span class="pubExtCpaRateBox__eyebrow">
                Supuesto de conversión
              </span>

              <strong class="pubExtCpaRateBox__value">
                ${escape_(rateText)}
              </strong>

              <span class="pubExtCpaRateBox__meta">
                ${series.length} punto${series.length === 1 ? "" : "s"}
                · ${escape_(state.dateFrom)} → ${escape_(state.dateTo)}
              </span>
            </div>

            <button
              class="pubExtBtn pubExtBtn--ghost"
              type="button"
              data-edit-cpa-rate
            >
              Cambiar cotización
            </button>
          </div>

          <div
            class="pubExtCpaRateBox__editor"
            data-cpa-rate-editor
            hidden
          >
            <label class="pubExtCpaRateField">
              <span>1 USD =</span>

              <div class="pubExtCpaRateField__inputWrap">
                <span>$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputmode="decimal"
                  value="${Number.isFinite(rate) ? escape_(String(rate)) : ""}"
                  data-cpa-rate-input
                  aria-label="Cotización de un dólar en pesos argentinos"
                />
                <span>ARS</span>
              </div>
            </label>

            <div class="pubExtCpaRateBox__actions">
              <button
                class="pubExtBtn pubExtBtn--ghost"
                type="button"
                data-cancel-cpa-rate
              >
                Cancelar
              </button>

              <button
                class="pubExtBtn pubExtBtn--primary"
                type="button"
                data-save-cpa-rate
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error(
        "[publicidad-externa] cpa series error",
        error
      );

      if (drawer.dataset.cpaRequestKey !== requestKey) {
        return;
      }

      const section = qs_("[data-cpa-series-section]");

      if (section) {
        section.innerHTML = `
          <h3 class="pubExtDrawerSection__title">Evolución del CPA</h3>
          <div class="pubExtBindingDrawerState">
            ${escape_(
              error?.message ||
              "No se pudo cargar la serie CPA."
            )}
          </div>
        `;
      }
    }
  }

  function closeDrawer_() {
    const drawer = qs_("[data-drawer]"), backdrop = qs_("[data-drawer-backdrop]");
    if (!drawer || !backdrop) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    setTimeout(() => { backdrop.hidden = true; }, 220);
  }

  function activateTab_(name) {
    qsa_("[data-tab-target]").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tabTarget === name));
    qsa_("[data-tab-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.tabPanel === name));
  }

  function syncRangeInputs_() {
    const from = qs_("[data-date-from]"), to = qs_("[data-date-to]");
    if (from) from.value = state.dateFrom || "";
    if (to) to.value = state.dateTo || "";
  }

  function setQuickPeriod_(days) {
    const range = defaultRange_(days);
    state.dateFrom = range.from; state.dateTo = range.to; syncRangeInputs_();
    qsa_("[data-period-days]").forEach((btn) => btn.classList.toggle("is-active", num_(btn.dataset.periodDays) === days));
  }

  function normalizeResponses_(settled) {
    const errors = [];
    ACTIONS.forEach((action, index) => {
      const result = settled[index];
      if (result.status === "fulfilled") state.responses[action] = result.value;
      else { state.responses[action] = null; errors.push(`${action}: ${responseError_(result)}`); }
    });
    state.gatewayScope = ACTIONS.map((action) => state.responses[action]?.scope).find(Boolean) || null;
    state.summary = unwrap_(state.responses.summary);
    const campaigns = unwrap_(state.responses.campaigns), adsets = unwrap_(state.responses.adsets), ads = unwrap_(state.responses.ads), tracking = unwrap_(state.responses.tracking);
    state.campaigns = Array.isArray(campaigns.campaigns) ? campaigns.campaigns : [];
    state.adsets = Array.isArray(adsets.adsets) ? adsets.adsets : [];
    state.ads = Array.isArray(ads.ads) ? ads.ads : [];
    state.tracking = Array.isArray(tracking.tracking) ? tracking.tracking : [];
    state.trackingSummary = tracking.summary || null;
    return errors;
  }

  async function loadAll_() {
    const seq = ++state.loadSeq;
    setLoading_(true); setNotice_(""); setStatus_("loading", "Actualizando");
    const base = { store_id: STORE_ID, date_from: state.dateFrom, date_to: state.dateTo };
    try {
      const session = await getSession_();
      if (!session?.access_token) { location.href = loginUrl_(); return; }
      const [settled, bindingLoad] = await Promise.all([
        Promise.allSettled(
          ACTIONS.map((action) => invokeMetaRead_({ ...base, action }))
        ),
        loadBindingCatalog_()
          .then(() => ({ ok: true, error: null }))
          .catch((error) => ({ ok: false, error }))
      ]);

      if (seq !== state.loadSeq) return;

      const errors = normalizeResponses_(settled);

      if (!bindingLoad.ok) {
        console.error(
          "[publicidad-externa] binding catalog load error",
          bindingLoad.error
        );
        errors.push(
          bindingLoad.error?.message ||
          "No se pudieron cargar las vinculaciones publicitarias."
        );
      }

      if (!state.responses.summary) throw new Error(errors[0] || "No se pudo cargar el resumen de Meta.");
      renderAll_();
      setStatus_(errors.length ? "error" : "ok", errors.length ? "Datos parciales" : "Meta conectado");
      if (errors.length) setNotice_(`Algunas vistas no pudieron actualizarse. ${errors.join(" · ")}`);
    } catch (error) {
      console.error("[publicidad-externa] load error", error);
      setStatus_("error", "Sin conexión");
      setNotice_(error?.message || "No se pudieron cargar los datos de Meta Ads.");
    } finally {
      if (seq === state.loadSeq) setLoading_(false);
    }
  }

  function bind_() {
    const root = state.root;
    if (!root || root.dataset.pubextBound === "1") return;
    root.dataset.pubextBound = "1";

    root.addEventListener("click", (event) => {
      const closeBindingClearResult = event.target.closest(
        "[data-close-binding-clear-result]"
      );

      if (closeBindingClearResult) {
        closeBindingClearResultModal_();
        return;
      }

      const bindingClearResultOverlay = event.target.closest(
        "[data-binding-clear-result-overlay]"
      );

      if (
        bindingClearResultOverlay &&
        event.target === bindingClearResultOverlay
      ) {
        closeBindingClearResultModal_();
        return;
      }

      const closeBindingSuccess = event.target.closest("[data-close-binding-success]");
      if (closeBindingSuccess) {
        closeBindingSuccessModal_();
        return;
      }

      const bindingSuccessOverlay = event.target.closest(
        "[data-binding-success-overlay]"
      );

      if (
        bindingSuccessOverlay &&
        event.target === bindingSuccessOverlay
      ) {
        closeBindingSuccessModal_();
        return;
      }

      const closeBindingClear = event.target.closest("[data-close-binding-clear]");
      if (closeBindingClear) {
        closeBindingClearModal_();
        return;
      }

      const bindingClearOverlay = event.target.closest(
        "[data-binding-clear-overlay]"
      );

      if (
        bindingClearOverlay &&
        event.target === bindingClearOverlay
      ) {
        closeBindingClearModal_();
        return;
      }

      const clearBinding = event.target.closest("[data-clear-binding]");
      if (clearBinding) {
        const drawer = qs_("[data-drawer]");
        const scope = clean_(drawer?.dataset.bindingDetailType);
        const indexRaw = drawer?.dataset.bindingDetailIndex;

        if (
          !scope ||
          indexRaw === undefined ||
          indexRaw === null
        ) {
          setNotice_(
            "No se pudo identificar el vínculo que se quiere quitar."
          );
          return;
        }

        openBindingClearModal_(
          scope,
          num_(indexRaw)
        );

        return;
      }

      const closeBinding = event.target.closest("[data-close-binding]");
      if (closeBinding) {
        closeBindingModal_();
        return;
      }

      const bindingOverlay = event.target.closest("[data-binding-overlay]");
      if (
        bindingOverlay &&
        event.target === bindingOverlay
      ) {
        closeBindingModal_();
        return;
      }

      const confirmBindingClear = event.target.closest(
        "[data-confirm-binding-clear]"
      );

      if (confirmBindingClear) {
        confirmBindingClear_();
        return;
      }

      const confirmBinding = event.target.closest("[data-confirm-binding]");
      if (confirmBinding) {
        confirmBinding_();
        return;
      }

      const bindingUnit = event.target.closest("[data-binding-unit-id]");
      if (bindingUnit) {
        selectBindingUnit_(bindingUnit.dataset.bindingUnitId);
        return;
      }

      const openBinding = event.target.closest("[data-open-binding]");
      if (openBinding) {
        const drawer = qs_("[data-drawer]");
        const indexRaw = drawer?.dataset.bindingDetailIndex;

        if (indexRaw === undefined || indexRaw === null) {
          setNotice_("No se pudo identificar el detalle abierto.");
          return;
        }

        openBindingModal_(
          openBinding.dataset.bindingScope,
          num_(indexRaw)
        );

        return;
      }

      const editCpaRate = event.target.closest(
        "[data-edit-cpa-rate]"
      );

      if (editCpaRate) {
        toggleCpaRateEditor_(true);
        return;
      }

      const cancelCpaRate = event.target.closest(
        "[data-cancel-cpa-rate]"
      );

      if (cancelCpaRate) {
        toggleCpaRateEditor_(false);
        return;
      }

      const saveCpaRate = event.target.closest(
        "[data-save-cpa-rate]"
      );

      if (saveCpaRate) {
        saveCpaRate_();
        return;
      }

      const closeCpaDrawer = event.target.closest(
        "[data-close-cpa-drawer]"
      );

      if (closeCpaDrawer) {
        closeCpaDrawer_();
        return;
      }

      const cpaDrawerBackdrop = event.target.closest(
        "[data-cpa-drawer-backdrop]"
      );

      if (
        cpaDrawerBackdrop &&
        event.target === cpaDrawerBackdrop
      ) {
        closeCpaDrawer_();
        return;
      }

      const openCpa = event.target.closest("[data-open-cpa]");

      if (openCpa) {
        openCpaDrawer_(
          openCpa.dataset.openCpa,
          num_(openCpa.dataset.cpaIndex)
        );
        return;
      }

      const period = event.target.closest("[data-period-days]");
      if (period) { setQuickPeriod_(num_(period.dataset.periodDays)); loadAll_(); return; }

      const tab = event.target.closest("[data-tab-target]");
      if (tab) { activateTab_(tab.dataset.tabTarget); return; }

      if (event.target.closest("[data-apply-range]")) {
        const from = clean_(qs_("[data-date-from]")?.value), to = clean_(qs_("[data-date-to]")?.value);
        if (!from || !to || to < from) { setNotice_("Elegí un rango de fechas válido."); return; }
        state.dateFrom = from; state.dateTo = to; qsa_("[data-period-days]").forEach((btn) => btn.classList.remove("is-active")); loadAll_(); return;
      }

      if (event.target.closest("[data-refresh]")) { loadAll_(); return; }

      const detail = event.target.closest("[data-open-detail]");
      if (detail) {
        openDetail_(
          detail.dataset.openDetail,
          num_(detail.dataset.detailIndex)
        );
        return;
      }

      if (event.target.closest("[data-close-drawer]")) {
        closeDrawer_();
      }
    });

    root.addEventListener("change", (event) => {
      const typeInput = event.target.closest(
        'input[name="pubExtBindingType"]'
      );

      if (typeInput) {
        selectBindingType_(typeInput.value);
      }
    });

    const backdrop = qs_("[data-drawer-backdrop]");
    if (backdrop) backdrop.addEventListener("click", closeDrawer_);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      const clearResultOverlay = qs_(
        "[data-binding-clear-result-overlay]"
      );

      if (clearResultOverlay?.classList.contains("is-open")) {
        closeBindingClearResultModal_();
        return;
      }

      const successOverlay = qs_("[data-binding-success-overlay]");

      if (successOverlay?.classList.contains("is-open")) {
        closeBindingSuccessModal_();
        return;
      }

      const clearOverlay = qs_("[data-binding-clear-overlay]");

      if (clearOverlay?.classList.contains("is-open")) {
        closeBindingClearModal_();
        return;
      }

      if (state.bindingModal.open) {
        closeBindingModal_();
        return;
      }

      const cpaDrawer = qs_("[data-cpa-drawer]");

      if (cpaDrawer?.classList.contains("is-open")) {
        closeCpaDrawer_();
        return;
      }

      closeDrawer_();
    });
  }

  function mount_() {
    if (!isPage_()) return;
    const root = document.getElementById("pubExtPage");
    if (!root) return;
    state.root = root; bind_();
    if (root.dataset.pubextMounted === "1") return;
    root.dataset.pubextMounted = "1";
    setQuickPeriod_(DEFAULT_DAYS); activateTab_("resumen"); loadAll_();
  }

  document.addEventListener("DOMContentLoaded", mount_);
  document.addEventListener("sazzu:page:load", mount_);
  if (document.readyState !== "loading") mount_();
})();
