/* =========================================================
   Protocol Data · Productos Panel Supabase Set Finance Fix
   Fase: FRONTEND PRODUCTOS 03B

   Objetivo:
   - El selector financiero del slide "Crear conjunto de productos"
     debe usar reglas vivas de Supabase / Finanzas > Reglas.
   - Bloquea la carga legacy getFinancialScenarios de Apps Script
     cuando Supabase ya respondió OK.
   - No toca Productos Comestibles.
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_PANEL_SUPABASE_SET_FINANCE_2026_07_02_01";

  function safeText_(value) {
    return String(value == null ? "" : value).trim();
  }

  function toNumber_(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function isSupabaseReady_() {
    const state = window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__;
    const payload = window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__;

    return !!(
      state &&
      state.loaded === true &&
      payload &&
      payload.ok === true
    );
  }

  function getSupabaseScenarios_() {
    const state = window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__;
    if (!state || !Array.isArray(state.financialScenarios)) return [];
    return state.financialScenarios;
  }

  function scenarioValue_(item) {
    return safeText_(item && (item.rule_code || item.id || item.id_escenario));
  }

  function scenarioMainLabel_(item) {
    return safeText_(item && (item.label || item.descripcion_escenario || item.nombre || item.rule_code || item.id));
  }

  function scenarioSubLabel_(item) {
    const provider = safeText_(item && item.provider);
    const gateway = safeText_(item && item.payment_gateway);
    const method = safeText_(item && item.payment_method);
    const financingType = safeText_(item && item.financing_type);
    const installments = toNumber_(item && item.installments_count, 0);
    const payoutDays = toNumber_(item && item.payout_delay_days, 0);
    const costRate = toNumber_(item && item.total_financial_cost_rate, 0);
    const costPct = costRate > 0 ? (costRate * 100) : toNumber_(item && item.total_financial_cost_pct, 0);

    const parts = [];

    if (provider) parts.push(provider);
    else if (gateway) parts.push(gateway);

    if (installments > 1) parts.push(`${installments} cuotas`);
    else if (installments === 1) parts.push("1 cuota");
    else if (financingType) parts.push(financingType);

    if (payoutDays > 0) parts.push(`${payoutDays} días`);
    if (costPct > 0) parts.push(`costo ${costPct.toFixed(2)}%`);
    if (method && !parts.includes(method)) parts.push(method);

    return parts.join(" · ");
  }

  function scenarioOptionLabel_(item) {
    const main = scenarioMainLabel_(item) || "Escenario financiero";
    const sub = scenarioSubLabel_(item);
    return sub ? `${main} · ${sub}` : main;
  }

  function normalizeForBuilderState_(scenarios) {
    return scenarios
      .map((item) => {
        const value = scenarioValue_(item);
        if (!value) return null;

        return {
          id_escenario: value,
          descripcion_escenario: scenarioOptionLabel_(item),
          proveedor_pago: safeText_(item && (item.provider || item.payment_gateway)),
          plazo_dias: toNumber_(item && item.payout_delay_days, 0),
          cuotas: toNumber_(item && item.installments_count, 0),
          factor_neto: toNumber_(item && item.net_factor, 0),
          source_supabase: item
        };
      })
      .filter(Boolean);
  }

  function applyFinanceScenariosToSetBuilder_() {
    if (!isSupabaseReady_()) return false;

    const nativeSelect = document.getElementById("prodSetFinanceScenario");
    if (!nativeSelect) return false;

    const scenarios = getSupabaseScenarios_();
    const validValues = new Set(scenarios.map(scenarioValue_).filter(Boolean));
    const currentValue = safeText_(nativeSelect.value);

    if (typeof ProductosSetBuilderState !== "undefined") {
      ProductosSetBuilderState.financialScenarios = normalizeForBuilderState_(scenarios);
      ProductosSetBuilderState.loadingFinancialScenarios = false;
    }

    nativeSelect.innerHTML = '<option value="">Seleccionar escenario</option>' + scenarios.map((item) => {
      const value = scenarioValue_(item);
      const label = scenarioOptionLabel_(item);
      if (!value) return "";
      return `<option value="${escapeHtmlForAttr_(value)}">${escapeHtml_(label)}</option>`;
    }).join("");

    nativeSelect.value = currentValue && validValues.has(currentValue) ? currentValue : "";
    nativeSelect.dataset.supabaseScenarioLoaded = "1";
    nativeSelect.dataset.source = "supabase_finance_rules";

    if (typeof refreshProductosSetBuilderFinanceSelectUi_ === "function") {
      refreshProductosSetBuilderFinanceSelectUi_();
    }

    if (typeof updateProductosSetBuilderSummary_ === "function") {
      updateProductosSetBuilderSummary_();
    }

    if (typeof syncProductosSetBuilderLocks_ === "function") {
      syncProductosSetBuilderLocks_();
    }

    return true;
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

  function patchFunction_(name, wrapper) {
    try {
      const original = window[name];
      if (typeof original !== "function") return false;
      if (original.__productosSupabaseSetFinancePatched === BUILD) return true;

      const patched = function () {
        return wrapper(original, Array.prototype.slice.call(arguments));
      };

      patched.__productosSupabaseSetFinancePatched = BUILD;
      patched.__productosSupabaseSetFinanceOriginal = original;
      window[name] = patched;

      try {
        window.eval(`${name} = window[${JSON.stringify(name)}];`);
      } catch (err) {}

      return true;
    } catch (err) {
      console.warn("[productos-panel-supabase-set-finance] No se pudo parchear", name, err);
      return false;
    }
  }

  function patchLegacyFinanceLoader_() {
    patchFunction_("loadProductosSetBuilderFinancialScenarios_", async function (original, args) {
      if (isSupabaseReady_()) {
        applyFinanceScenariosToSetBuilder_();
        return null;
      }

      return original.apply(window, args || []);
    });
  }

  function scheduleHydration_() {
    [50, 150, 400, 900, 1600, 3000].forEach((delay) => {
      setTimeout(function () {
        patchLegacyFinanceLoader_();
        applyFinanceScenariosToSetBuilder_();
      }, delay);
    });
  }

  function bindEvents_() {
    document.addEventListener("click", function (event) {
      const target = event.target && event.target.closest
        ? event.target.closest("#prodSlideCreateSetBtn, [data-action='crear-conjunto'], #prodNewOfferBtn, .prodTab")
        : null;

      if (target) scheduleHydration_();
    }, true);

    document.addEventListener("change", function (event) {
      const target = event.target && event.target.closest
        ? event.target.closest("#prodSetFinanceScenario")
        : null;

      if (target && typeof updateProductosSetBuilderSummary_ === "function") {
        updateProductosSetBuilderSummary_();
      }
    }, true);
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    patchLegacyFinanceLoader_();
    bindEvents_();
    scheduleHydration_();
  }

  window.ProductosPanelSupabaseSetFinance = {
    build: BUILD,
    apply: applyFinanceScenariosToSetBuilder_,
    hydrate: scheduleHydration_,
    patch: patchLegacyFinanceLoader_
  };

  document.addEventListener("DOMContentLoaded", init_);
  document.addEventListener("sazzu:page:load", function () {
    setTimeout(init_, 100);
  });
})();
