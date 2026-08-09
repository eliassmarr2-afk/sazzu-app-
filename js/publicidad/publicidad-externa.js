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
    fallbackClient: null
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
    if (!state.ads.length) { body.innerHTML = '<tr><td class="pubExtEmpty" colspan="10">No hay anuncios en el scope actual.</td></tr>'; return; }
    const currency = state.summary?.currency?.meta_account_currency || "USD";
    body.innerHTML = state.ads.map((item, index) => {
      const ad = item.ad || {}, adset = item.adset || {}, meta = item.meta || {}, protocol = item.protocol || {};
      const metaPurchases = current_(meta.purchases), protocolPaid = current_(protocol.paid_orders), mismatch = Math.abs(metaPurchases - protocolPaid) > .0001;
      return `<tr><td>${entityCell_(ad.name, ad.meta_ad_id)}</td><td><div class="pubExtEntity__name" title="${escape_(adset.name)}">${escape_(adset.name || "—")}</div></td><td>${stateBadge_(ad.effective_status || ad.status)}</td><td class="pubExtTableMetric">${escape_(fmtMoney_(current_(meta.spend), currency))}</td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.landing_page_views), 0)}</td><td><span class="pubExtLadder"><span>${fmtNumber_(current_(meta.landing_l1), 0)}</span><span>${fmtNumber_(current_(meta.landing_l2), 0)}</span><span>${fmtNumber_(current_(meta.landing_l3), 0)}</span></span></td><td class="pubExtTableMetric">${fmtNumber_(current_(meta.add_to_cart), 0)}</td><td class="pubExtTableMetric">${fmtNumber_(metaPurchases, 0)}</td><td class="pubExtTableMetric">${mismatch ? '<span class="pubExtState pubExtState--warn">' : ""}${fmtNumber_(protocolPaid, 0)}${mismatch ? "</span>" : ""}</td><td>${rowButton_("ad", index)}</td></tr>`;
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
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Identidad</h3><div class="pubExtDrawerGrid">${drawerMetric_("Campaign ID", e.meta_campaign_id)}${drawerMetric_("Estado", e.effective_status || e.status)}${drawerMetric_("Objetivo", e.objective || "—")}${drawerMetric_("Bid strategy", e.bid_strategy || "—")}</div></section>${detailMetrics_(item)}`;
    } else if (type === "adset") {
      item = state.adsets[index]; if (!item) return; const e = item.adset || {}; eyebrow = "Conjunto de anuncios"; title = e.name || e.meta_adset_id || "Conjunto";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Jerarquía</h3><div class="pubExtDrawerGrid">${drawerMetric_("AdSet ID", e.meta_adset_id)}${drawerMetric_("Campaña", item.campaign?.name || "—")}${drawerMetric_("Estado", e.effective_status || e.status)}${drawerMetric_("Presupuesto", e.daily_budget_raw || e.lifetime_budget_raw || "—")}</div></section>${detailMetrics_(item)}`;
    } else if (type === "ad") {
      item = state.ads[index]; if (!item) return; const e = item.ad || {}, creative = item.creative || {}; eyebrow = "Anuncio"; title = e.name || e.meta_ad_id || "Anuncio";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Jerarquía</h3><div class="pubExtDrawerGrid">${drawerMetric_("Ad ID", e.meta_ad_id)}${drawerMetric_("Conjunto", item.adset?.name || "—")}${drawerMetric_("Campaña", item.campaign?.name || "—")}${drawerMetric_("Estado", e.effective_status || e.status)}</div></section>${detailMetrics_(item)}<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Creativo</h3><div class="pubExtDrawerGrid">${drawerMetric_("Creative ID", creative.meta_creative_id || e.meta_creative_id)}${drawerMetric_("Tipo", creative.object_type || "—")}${drawerMetric_("Título", creative.title || creative.name || "—")}${drawerMetric_("URL", creative.link_url || "—")}</div>${creative.url_tags ? `<h3 class="pubExtDrawerSection__title" style="margin-top:14px">URL tags</h3><pre class="pubExtDrawerCode">${escape_(creative.url_tags)}</pre>` : ""}</section>`;
    } else if (type === "tracking") {
      item = state.tracking[index]; if (!item) return; const ad = item.ad || {}, tracking = item.tracking || {}, adId = tracking.ad_id || {}, params = Array.isArray(tracking.parameters) ? tracking.parameters : [], obs = item.protocol_observation || {}; eyebrow = "Tracking"; title = ad.name || ad.meta_ad_id || "Tracking";
      body = `<section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Salud</h3><div class="pubExtDrawerGrid">${drawerMetric_("Estado", tracking.status)}${drawerMetric_("Ad ID dinámico", adId.present && adId.is_dynamic ? "Sí" : "No")}${drawerMetric_("Parámetros válidos", `${tracking.valid_parameters_count || 0}/${tracking.parameters_count || 0}`)}${drawerMetric_("Ventas atribuidas", fmtNumber_(current_(obs.attributed_orders), 0))}</div></section><section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">URL</h3><pre class="pubExtDrawerCode">${escape_(tracking.destination_url || "Sin destination_url")}</pre>${tracking.raw_url_tags ? `<h3 class="pubExtDrawerSection__title" style="margin-top:14px">url_tags</h3><pre class="pubExtDrawerCode">${escape_(tracking.raw_url_tags)}</pre>` : ""}</section><section class="pubExtDrawerSection"><h3 class="pubExtDrawerSection__title">Parámetros</h3><div class="pubExtParamList">${params.length ? params.map((param) => `<div class="pubExtParam"><span class="pubExtParam__key">${escape_(param.campo_utm || param.field || "—")}</span><span class="pubExtParam__value">${escape_(param.valor_template ?? param.value_template ?? "")}</span><span class="pubExtParam__state ${param.campo_valido === false || param.field_valid === false ? "is-bad" : ""}">${param.campo_valido === false || param.field_valid === false ? "Inválido" : "OK"}</span></div>`).join("") : '<div class="pubExtEmpty">Sin parámetros normalizados.</div>'}</div></section>`;
    }

    const drawer = qs_("[data-drawer]"), backdrop = qs_("[data-drawer-backdrop]"), eyebrowEl = qs_("[data-drawer-eyebrow]"), titleEl = qs_("[data-drawer-title]"), bodyEl = qs_("[data-drawer-body]");
    if (!drawer || !backdrop || !bodyEl) return;
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    if (titleEl) titleEl.textContent = title;
    bodyEl.innerHTML = body;
    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => drawer.classList.add("is-open"));
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
      const settled = await Promise.allSettled(ACTIONS.map((action) => invokeMetaRead_({ ...base, action })));
      if (seq !== state.loadSeq) return;
      const errors = normalizeResponses_(settled);
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
      if (detail) { openDetail_(detail.dataset.openDetail, num_(detail.dataset.detailIndex)); return; }
      if (event.target.closest("[data-close-drawer]")) closeDrawer_();
    });
    const backdrop = qs_("[data-drawer-backdrop]");
    if (backdrop) backdrop.addEventListener("click", closeDrawer_);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer_(); });
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
