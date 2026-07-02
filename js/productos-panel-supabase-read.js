/* =========================================================
   Protocol Data · Productos Panel Supabase Read Bridge
   Fase: FRONTEND PRODUCTOS 01

   Alcance:
   - Solo lectura.
   - Intenta cargar Resumen / SKUs / Ofertas / Escenarios desde Supabase.
   - Mantiene AppScript como fallback: si Supabase falla, no pisa el estado actual.
   - No escribe productos, conjuntos ni ofertas.
   - No toca Productos Comestibles.
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_PANEL_SUPABASE_READ_2026_07_02_01";
  const BOOTSTRAP_RPC = "rpc_products_panel_bootstrap";

  const ReadState = {
    loaded: false,
    loading: false,
    lastPayload: null,
    lastError: null,
    skus: [],
    offers: [],
    financialScenarios: []
  };

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function getSupabaseClient_() {
    return window.SazzuSupabase || null;
  }

  function toNumber_(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function safeText_(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeSkuForLegacyUi_(item) {
    const sku = safeText_(item && item.sku);
    const nombre = safeText_(item && item.nombre_producto);
    const estado = safeText_(item && item.estado).toLowerCase() || "active";

    return {
      sku,
      nombre,
      nombre_producto: nombre,
      activo: estado === "active" || estado === "activo",
      estado,
      tipo: safeText_(item && item.relacion_venta) || "sku",
      relacion_venta: safeText_(item && item.relacion_venta) || "sku",
      costo_proveedor: toNumber_(item && item.costo_proveedor_actual, 0),
      costo_proveedor_actual: toNumber_(item && item.costo_proveedor_actual, 0),
      costo_handling: toNumber_(item && item.costo_handling, 0),
      cpa_costo: toNumber_(item && item.cpa_costo, 0),
      costo_envio_promedio: toNumber_(item && item.costo_envio_promedio, 0),
      margen_pretendido_pct: toNumber_(item && item.margen_pretendido_pct, 0),
      neto_pretendido: toNumber_(item && item.neto_pretendido, 0),
      precio_venta: toNumber_(item && item.precio_venta_estimado, 0),
      precio_venta_estimado: toNumber_(item && item.precio_venta_estimado, 0),
      factor_neto: toNumber_(item && item.factor_neto, 1),
      escenario_financiero_id: safeText_(item && item.escenario_financiero_id),
      escenario_financiero_rule_code: safeText_(item && item.escenario_financiero_rule_code),
      escenario_financiero_resumen: safeText_(item && item.escenario_financiero_resumen),
      raw_supabase: item || {}
    };
  }

  function normalizeOfferForLegacyUi_(item) {
    const offerKind = safeText_(item && item.offer_kind).toLowerCase();
    const isBundle = offerKind === "bundle";
    const isQuantity = offerKind === "quantity";
    const components = Array.isArray(item && item.components) ? item.components : [];
    const skus = Array.isArray(item && item.skus) ? item.skus : components.map(c => c && c.sku).filter(Boolean);

    return {
      ...item,
      row_type: isBundle ? "bundle" : "equivalencia",
      tipo: isBundle ? "bundle" : (isQuantity ? "equivalencia" : "oferta"),
      estado: "activo",
      origen_tabla: isBundle ? "TablaBundles" : "TablaEquivalencias",
      id_variante_shopify: safeText_(item && item.id_variante_shopify),
      id_variante: safeText_(item && (item.id_variante || item.id_variante_shopify)),
      tipo_oferta: safeText_(item && item.tipo_oferta),
      nombre_interno: safeText_(item && item.nombre_interno),
      cantidad_filas: toNumber_(item && item.components_count, components.length),
      skus,
      components,
      precio_final_snapshot: toNumber_(item && item.precio_final_snapshot, 0),
      costo_productos_total: toNumber_(item && item.costo_productos_total, 0),
      unidades_totales: toNumber_(item && item.unidades_totales, 0),
      raw_supabase: item || {}
    };
  }

  function buildOffersSummary_(offers) {
    const normalized = (offers || []).map(normalizeOfferForLegacyUi_);
    const bundles = normalized.filter(item => item.row_type === "bundle");
    const equivalencias = normalized.filter(item => item.row_type !== "bundle");

    return {
      ok: true,
      build: BUILD,
      source: "supabase",
      resumen: {
        ofertas_activas_total: normalized.length,
        ofertas_equivalencias_total: equivalencias.length,
        ofertas_bundles_total: bundles.length
      },
      detalle: {
        equivalencias,
        bundles
      },
      items: normalized
    };
  }

  function setText_(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value == null ? "" : value);
  }

  function applySummaryDirect_(summary) {
    const metrics = summary && summary.metrics ? summary.metrics : {};
    setText_("prodKpiSkus", toNumber_(metrics.skus_active, 0));
    setText_("prodKpiOfertas", toNumber_(metrics.offers_active, 0));
    setText_("prodKpiPacks", toNumber_(metrics.quantity_offers_active, 0));
    setText_("prodKpiBundles", toNumber_(metrics.bundle_offers_active, 0));
  }

  function applyBootstrapToLegacyState_(payload) {
    const skus = payload && payload.skus && Array.isArray(payload.skus.items)
      ? payload.skus.items
      : [];
    const offers = payload && payload.offers && Array.isArray(payload.offers.items)
      ? payload.offers.items
      : [];
    const scenarios = payload && payload.financial_scenarios && Array.isArray(payload.financial_scenarios.items)
      ? payload.financial_scenarios.items
      : [];

    ReadState.skus = skus;
    ReadState.offers = offers;
    ReadState.financialScenarios = scenarios;
    ReadState.lastPayload = payload;
    window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__ = payload;
    window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__ = ReadState;

    if (typeof ProductosState !== "undefined") {
      ProductosState.all = skus.map(normalizeSkuForLegacyUi_);
      ProductosState.offersSummary = buildOffersSummary_(offers);
      ProductosState.offersAll = offers.map(normalizeOfferForLegacyUi_);
      ProductosState.offersFiltered = ProductosState.offersAll.slice();
      ProductosState.offersLoaded = true;
      ProductosState.offersLoading = false;
      ProductosState.productSets = ProductosState.offersAll.slice();
      ProductosState.productSetsLoaded = true;
      ProductosState.productSetsLoading = false;
    }

    if (payload && payload.summary) {
      applySummaryDirect_(payload.summary);
    }

    if (typeof applyProductosFilters_ === "function") applyProductosFilters_();
    if (typeof renderProductosKpis_ === "function") renderProductosKpis_();
    if (typeof renderProductosTable_ === "function") renderProductosTable_();
    if (typeof wireProductosLocalSwitches_ === "function") wireProductosLocalSwitches_();

    populateFinancialScenarioSelects_();
    populateProductSetSkuSelects_();
  }

  async function loadBootstrapFromSupabase_() {
    if (!isProductosPage_()) return null;
    if (ReadState.loading) return ReadState.lastPayload;

    const client = getSupabaseClient_();
    if (!client || typeof client.rpc !== "function") {
      console.warn("[productos-panel-supabase-read] Supabase no disponible. Se mantiene fallback AppScript.");
      return null;
    }

    ReadState.loading = true;
    ReadState.lastError = null;

    try {
      const payload = await client.rpc(BOOTSTRAP_RPC, {});
      if (!payload || payload.ok !== true) {
        throw new Error("Bootstrap Supabase inválido para Productos.");
      }

      ReadState.loaded = true;
      applyBootstrapToLegacyState_(payload);
      console.log("[productos-panel-supabase-read] Lectura Supabase OK", payload);
      return payload;
    } catch (error) {
      ReadState.lastError = error;
      console.warn("[productos-panel-supabase-read] Falló Supabase. Se mantiene AppScript fallback:", error);
      return null;
    } finally {
      ReadState.loading = false;
    }
  }

  function scenarioLabel_(item) {
    const label = safeText_(item && item.label);
    const cost = toNumber_(item && item.total_financial_cost_pct, 0);
    const factor = toNumber_(item && item.net_factor, 0);
    if (!label) return "Escenario financiero";
    if (!cost) return label;
    return `${label} · costo ${cost.toFixed(2)}% · factor ${factor.toFixed(4)}`;
  }

  function populateFinancialScenarioSelects_() {
    const scenarios = ReadState.financialScenarios || [];
    if (!scenarios.length) return;

    const selectorIds = [
      "prodSkuCreateEscenario",
      "prodSetFinanceScenario"
    ];

    selectorIds.forEach((id) => {
      const select = document.getElementById(id);
      if (!select || select.dataset.supabaseScenarioLoaded === "1") return;

      const currentValue = select.value || "";
      select.innerHTML = '<option value="">Seleccionar escenario</option>' + scenarios.map((item) => {
        const value = safeText_(item.rule_code || item.id);
        return `<option value="${escapeHtmlForAttr_(value)}">${escapeHtml_(scenarioLabel_(item))}</option>`;
      }).join("");

      if (currentValue) select.value = currentValue;
      select.dataset.supabaseScenarioLoaded = "1";
    });
  }

  function populateProductSetSkuSelects_() {
    const skus = ReadState.skus || [];
    if (!skus.length) return;

    [1, 2, 3].forEach((index) => {
      const select = document.getElementById(`prodSetSku${index}`);
      if (!select || select.dataset.supabaseSkuLoaded === "1") return;

      const currentValue = select.value || "";
      select.innerHTML = '<option value="">Seleccionar SKU</option>' + skus.map((item) => {
        const sku = safeText_(item.sku);
        const name = safeText_(item.nombre_producto);
        const cost = toNumber_(item.costo_proveedor_actual, 0);
        return `<option value="${escapeHtmlForAttr_(sku)}" data-name="${escapeHtmlForAttr_(name)}" data-cost="${escapeHtmlForAttr_(String(cost))}">${escapeHtml_(sku)} · ${escapeHtml_(name)}</option>`;
      }).join("");

      if (currentValue) select.value = currentValue;
      select.dataset.supabaseSkuLoaded = "1";
    });
  }

  function bindProductSetSkuAutofill_() {
    document.addEventListener("change", function (event) {
      const select = event.target && event.target.closest ? event.target.closest("#prodSetSku1, #prodSetSku2, #prodSetSku3") : null;
      if (!select) return;

      const index = select.id.replace("prodSetSku", "");
      const option = select.options[select.selectedIndex];
      const nameInput = document.getElementById(`prodSetName${index}`);
      const costInput = document.getElementById(`prodSetCost${index}`);

      if (nameInput) nameInput.value = option ? (option.dataset.name || "") : "";
      if (costInput) costInput.value = option ? (option.dataset.cost || "") : "";
    }, true);
  }

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeHtmlForAttr_(value) {
    return escapeHtml_(value).replace(/`/g, "&#096;");
  }

  function schedulePostRenderHydration_() {
    setTimeout(function () {
      populateFinancialScenarioSelects_();
      populateProductSetSkuSelects_();
    }, 120);

    setTimeout(function () {
      populateFinancialScenarioSelects_();
      populateProductSetSkuSelects_();
    }, 500);
  }

  function bindHydrationEvents_() {
    document.addEventListener("click", function (event) {
      const shouldHydrate = event.target && event.target.closest && event.target.closest(
        "#prodNewProductBtn, #prodNewOfferBtn, [data-action='crear-conjunto'], #prodSetCreateBtn"
      );
      if (shouldHydrate) schedulePostRenderHydration_();
    }, true);

    const observer = new MutationObserver(function () {
      schedulePostRenderHydration_();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function initProductosPanelSupabaseRead_() {
    if (!isProductosPage_()) return;
    if (document.body.dataset.productosPanelSupabaseReadReady === "1") {
      schedulePostRenderHydration_();
      return;
    }

    document.body.dataset.productosPanelSupabaseReadReady = "1";
    bindProductSetSkuAutofill_();
    bindHydrationEvents_();

    setTimeout(loadBootstrapFromSupabase_, 80);
    setTimeout(loadBootstrapFromSupabase_, 650);
  }

  window.ProductosPanelSupabaseRead = {
    build: BUILD,
    state: ReadState,
    load: loadBootstrapFromSupabase_,
    hydrate: schedulePostRenderHydration_
  };

  document.addEventListener("DOMContentLoaded", initProductosPanelSupabaseRead_);
  document.addEventListener("sazzu:page:load", function () {
    setTimeout(initProductosPanelSupabaseRead_, 120);
  });
})();
