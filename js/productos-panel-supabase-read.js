/* =========================================================
   Protocol Data · Productos Panel Supabase Bridge
   Fase: FRONTEND PRODUCTOS 04A

   Alcance:
   - Lectura: Supabase gana cuando rpc_products_panel_bootstrap responde OK.
   - Escritura: Nuevo producto, Conjunto de productos y Oferta comercial escriben en Supabase.
   - Nueva oferta deja de activar conjuntos por AppScript.
   - Constructor de conjuntos: escenarios financieros vienen de Finanzas > Reglas.
   - AppScript queda como fallback solo si Supabase falla completo.
   - No toca Productos Comestibles.
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_PANEL_SUPABASE_BRIDGE_2026_07_02_04A";
  const BOOTSTRAP_RPC = "rpc_products_panel_bootstrap";
  const UPSERT_PRODUCT_RPC = "rpc_products_upsert_product";
  const UPSERT_PRODUCT_SET_RPC = "rpc_products_upsert_product_set";
  const UPSERT_VARIANT_MAPPING_RPC = "rpc_products_upsert_variant_mapping";
  const UPSERT_COMMERCIAL_OFFER_RPC = "rpc_products_upsert_commercial_offer";

  const ReadState = {
    loaded: false,
    loading: false,
    lastPayload: null,
    lastError: null,
    skus: [],
    offers: [],
    financialScenarios: [],
    legacyPatched: false
  };

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function getSupabaseClient_() {
    return window.SazzuSupabase || null;
  }

  function isSupabaseWinner_() {
    return !!(ReadState.loaded === true && ReadState.lastPayload && ReadState.lastPayload.ok === true);
  }

  function safeText_(value) {
    return String(value == null ? "" : value).trim();
  }

  function toNumber_(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeHtmlForAttr_(value) {
    return escapeHtml_(value).replace(/`/g, "&#096;");
  }

  function getBootstrapPieces_(payload) {
    return {
      skus: payload && payload.skus && Array.isArray(payload.skus.items) ? payload.skus.items : [],
      offers: payload && payload.offers && Array.isArray(payload.offers.items) ? payload.offers.items : [],
      scenarios: payload && payload.financial_scenarios && Array.isArray(payload.financial_scenarios.items) ? payload.financial_scenarios.items : []
    };
  }

  function normalizeSkuForLegacyUi_(item) {
    const sku = safeText_(item && item.sku);
    const nombre = safeText_(item && (item.nombre_producto || item.nombre));
    const estado = safeText_(item && item.estado).toLowerCase() || "active";

    return {
      sku,
      nombre,
      nombre_producto: nombre,
      activo: estado === "active" || estado === "activo",
      estado,
      tipo: safeText_(item && item.relacion_venta) || "sku",
      relacion_venta: safeText_(item && item.relacion_venta) || "sku",
      costo_proveedor: toNumber_(item && (item.costo_proveedor_actual || item.costo_proveedor), 0),
      costo_proveedor_actual: toNumber_(item && (item.costo_proveedor_actual || item.costo_proveedor), 0),
      costo_handling: toNumber_(item && item.costo_handling, 0),
      cpa_costo: toNumber_(item && item.cpa_costo, 0),
      costo_envio_promedio: toNumber_(item && item.costo_envio_promedio, 0),
      margen_pretendido_pct: toNumber_(item && item.margen_pretendido_pct, 0),
      neto_pretendido: toNumber_(item && item.neto_pretendido, 0),
      precio_venta: toNumber_(item && (item.precio_venta_estimado || item.precio_venta), 0),
      precio_venta_estimado: toNumber_(item && (item.precio_venta_estimado || item.precio_venta), 0),
      factor_neto: toNumber_(item && item.factor_neto, 1),
      escenario_financiero_id: safeText_(item && item.escenario_financiero_id),
      escenario_financiero_rule_code: safeText_(item && item.escenario_financiero_rule_code),
      escenario_financiero_resumen: safeText_(item && item.escenario_financiero_resumen),
      raw_supabase: item || {}
    };
  }

  function normalizeOfferKind_(item) {
    const raw = safeText_(item && (item.offer_kind || item.tipo_oferta || item.tipo)).toLowerCase();
    if (raw === "quantity" || raw === "cantidad" || raw.includes("cantidad")) return "quantity";
    if (raw === "bundle" || raw.includes("bundle") || raw.includes("combin")) return "bundle";
    return raw || "single";
  }

  function normalizeOfferForLegacyUi_(item) {
    const offerKind = normalizeOfferKind_(item);
    const isBundle = offerKind === "bundle";
    const isQuantity = offerKind === "quantity";
    const components = Array.isArray(item && item.components) ? item.components : [];
    const skus = Array.isArray(item && item.skus) ? item.skus : components.map(c => c && c.sku).filter(Boolean);
    const idVariante = safeText_(item && (item.id_variante || item.id_variante_shopify || item.shopify_variant_id));
    const tipoOferta = isQuantity ? "cantidad" : (isBundle ? "bundle" : safeText_(item && item.tipo_oferta));
    const costoProductos = toNumber_(item && (item.costo_productos || item.costo_productos_total || item.supplier_cost_total), 0);

    return {
      ...item,
      offer_set_id: safeText_(item && item.offer_set_id),
      row_type: isBundle ? "bundle" : "equivalencia",
      tipo: isBundle ? "bundle" : (isQuantity ? "equivalencia" : "oferta"),
      estado: safeText_(item && item.estado) || "activo",
      estado_oferta: safeText_(item && item.estado_oferta) || "activo",
      origen_tabla: "Supabase · product_offer_sets",
      id_variante_shopify: safeText_(item && (item.id_variante_shopify || item.shopify_variant_id || idVariante)),
      id_variante: idVariante,
      tipo_oferta: tipoOferta,
      nombre_interno: safeText_(item && item.nombre_interno),
      nombre_comercial: safeText_(item && item.nombre_comercial),
      subtitulo_oferta: safeText_(item && item.subtitulo_oferta),
      descripcion_corta: safeText_(item && item.descripcion_corta),
      cantidad_filas: toNumber_(item && item.components_count, components.length),
      skus,
      components,
      composicion_resumen: safeText_(item && item.composicion_resumen) || skus.join(" + "),
      costo_productos: costoProductos,
      costo_productos_total: costoProductos,
      base_operativa_pack: toNumber_(item && item.base_operativa_pack, 0),
      precio_final_pack: toNumber_(item && (item.precio_final_pack || item.precio_final_snapshot), 0),
      precio_final_snapshot: toNumber_(item && (item.precio_final_snapshot || item.precio_final_pack), 0),
      escenario_financiero_id: safeText_(item && item.escenario_financiero_id),
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
        ofertas_bundles_total: bundles.length,
        ofertas_equivalencias_activas: equivalencias.length,
        ofertas_bundles_activas: bundles.length
      },
      detalle: { equivalencias, bundles },
      items: normalized
    };
  }

  function scenarioValue_(item) {
    return safeText_(item && (item.rule_code || item.id || item.id_escenario));
  }

  function scenarioLabel_(item) {
    const main = safeText_(item && (item.label || item.descripcion_escenario || item.nombre || item.rule_code || item.id));
    const provider = safeText_(item && (item.provider || item.payment_gateway || item.proveedor_pago));
    const installments = toNumber_(item && (item.installments_count || item.cuotas), 0);
    const payoutDays = toNumber_(item && (item.payout_delay_days || item.plazo_dias), 0);
    const costRate = toNumber_(item && item.total_financial_cost_rate, 0);
    const costPct = costRate > 0 ? costRate * 100 : toNumber_(item && item.total_financial_cost_pct, 0);
    const parts = [];

    if (provider) parts.push(provider);
    if (installments > 1) parts.push(`${installments} cuotas`);
    else if (installments === 1) parts.push("1 cuota");
    if (payoutDays > 0) parts.push(`${payoutDays} días`);
    if (costPct > 0) parts.push(`costo ${costPct.toFixed(2)}%`);

    return parts.length ? `${main || "Escenario financiero"} · ${parts.join(" · ")}` : (main || "Escenario financiero");
  }

  function normalizeScenarioForBuilder_(item) {
    return {
      id_escenario: scenarioValue_(item),
      descripcion_escenario: scenarioLabel_(item),
      proveedor_pago: safeText_(item && (item.provider || item.payment_gateway || item.proveedor_pago)),
      plazo_dias: toNumber_(item && (item.payout_delay_days || item.plazo_dias), 0),
      cuotas: toNumber_(item && (item.installments_count || item.cuotas), 0),
      factor_neto: toNumber_(item && item.net_factor, 0),
      source_supabase: item || {}
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

  function renderEmptyTable_(id, colspan, message, className) {
    const tbody = document.getElementById(id);
    if (!tbody || tbody.dataset.supabaseEmptyRendered === "1") return;
    tbody.dataset.supabaseEmptyRendered = "1";
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="${className}">${escapeHtml_(message)}</td></tr>`;
  }

  function resetEmptyMarkers_() {
    ["prodResumenTableBody", "prodOffersTableBody", "prodSetsTableBody"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) delete el.dataset.supabaseEmptyRendered;
    });
  }

  function applySnapshotToProductosState_(payload) {
    if (!payload || payload.ok !== true) return;

    const pieces = getBootstrapPieces_(payload);
    const normalizedSkus = pieces.skus.map(normalizeSkuForLegacyUi_);
    const normalizedOffers = pieces.offers.map(normalizeOfferForLegacyUi_);
    const normalizedScenarios = pieces.scenarios.map(normalizeScenarioForBuilder_).filter(item => item.id_escenario);

    ReadState.skus = pieces.skus;
    ReadState.offers = pieces.offers;
    ReadState.financialScenarios = pieces.scenarios;
    ReadState.lastPayload = payload;

    window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__ = payload;
    window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__ = ReadState;
    window.__PRODUCTOS_SUPABASE_READ_ACTIVE__ = true;

    if (typeof ProductosState !== "undefined") {
      ProductosState.all = normalizedSkus;
      ProductosState.filtered = [];
      ProductosState.offersSummary = buildOffersSummary_(pieces.offers);
      ProductosState.offersAll = normalizedOffers;
      ProductosState.offersFiltered = normalizedOffers.slice();
      ProductosState.offersLoaded = true;
      ProductosState.offersLoading = false;
      ProductosState.productSets = normalizedOffers.slice();
      ProductosState.productSetsLoaded = true;
      ProductosState.productSetsLoading = false;
    }

    if (typeof ProductosNuevaOfertaState !== "undefined") {
      ProductosNuevaOfertaState.sets = normalizedOffers.slice();
      const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
      const stillExists = normalizedOffers.some((item) => safeText_(item.id_variante) === selectedId);
      if (selectedId && !stillExists) {
        ProductosNuevaOfertaState.selectedId = "";
        ProductosNuevaOfertaState.selectedSet = null;
      }
    }

    if (typeof ProductosSetBuilderState !== "undefined") {
      ProductosSetBuilderState.products = normalizedSkus
        .filter((item) => item && item.sku && item.activo === true)
        .map((item) => ({
          sku: safeText_(item.sku),
          nombre: safeText_(item.nombre || item.nombre_producto),
          costo_producto: toNumber_(item.costo_proveedor_actual || item.costo_proveedor, 0)
        }));

      ProductosSetBuilderState.financialScenarios = normalizedScenarios;
      ProductosSetBuilderState.loading = false;
      ProductosSetBuilderState.loadingFinancialScenarios = false;
    }

    if (typeof ProductosLoteState !== "undefined") {
      ProductosLoteState.skusOptions = normalizedSkus
        .filter((item) => item && item.sku)
        .map((item) => ({ sku: safeText_(item.sku), nombre: safeText_(item.nombre || item.nombre_producto) }));
      ProductosLoteState.skusLoaded = true;
      ProductosLoteState.skusLoading = false;
    }
  }

  function populateFinancialScenarioSelects_() {
    const scenarios = ReadState.financialScenarios || [];
    const validValues = new Set(scenarios.map(scenarioValue_).filter(Boolean));

    ["prodSkuCreateEscenario", "prodSetFinanceScenario"].forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;

      const currentValue = safeText_(select.value);
      select.innerHTML = '<option value="">Seleccionar escenario</option>' + scenarios.map((item) => {
        const value = scenarioValue_(item);
        if (!value) return "";
        return `<option value="${escapeHtmlForAttr_(value)}">${escapeHtml_(scenarioLabel_(item))}</option>`;
      }).join("");

      select.value = currentValue && validValues.has(currentValue) ? currentValue : "";
      select.dataset.supabaseScenarioLoaded = "1";
      select.dataset.source = "supabase_finance_rules";
    });

    if (typeof ProductosSetBuilderState !== "undefined") {
      ProductosSetBuilderState.financialScenarios = scenarios.map(normalizeScenarioForBuilder_).filter(item => item.id_escenario);
      ProductosSetBuilderState.loadingFinancialScenarios = false;
    }

    if (typeof refreshProductosSetBuilderFinanceSelectUi_ === "function") refreshProductosSetBuilderFinanceSelectUi_();
    if (typeof updateProductosSetBuilderSummary_ === "function") updateProductosSetBuilderSummary_();
  }

  function populateProductSetSkuSelects_() {
    const skus = ReadState.skus || [];
    const validSkuValues = new Set(skus.map((item) => safeText_(item && item.sku)).filter(Boolean));
    const optionsHtml = '<option value="">Seleccionar SKU</option>' + skus.map((item) => {
      const sku = safeText_(item && item.sku);
      const name = safeText_(item && (item.nombre_producto || item.nombre));
      const cost = toNumber_(item && (item.costo_proveedor_actual || item.costo_proveedor), 0);
      return `<option value="${escapeHtmlForAttr_(sku)}" data-name="${escapeHtmlForAttr_(name)}" data-cost="${escapeHtmlForAttr_(String(cost))}">${escapeHtml_(sku)} — ${escapeHtml_(name)}</option>`;
    }).join("");

    [1, 2, 3].forEach((index) => {
      const select = document.getElementById(`prodSetSku${index}`);
      if (!select) return;
      const currentValue = safeText_(select.value);
      select.innerHTML = optionsHtml;
      select.value = currentValue && validSkuValues.has(currentValue) ? currentValue : "";
      select.dataset.supabaseSkuLoaded = "1";
      select.disabled = false;
    });

    if (typeof refreshAllProductosSetBuilderSkuSelects_ === "function") refreshAllProductosSetBuilderSkuSelects_();
    if (typeof syncProductosSetBuilderFieldsFromSelection_ === "function") syncProductosSetBuilderFieldsFromSelection_();
    if (typeof updateProductosSetBuilderSummary_ === "function") updateProductosSetBuilderSummary_();
  }

  function hydrateNuevaOfertaSelectFromSnapshot_() {
    if (!isSupabaseWinner_()) return;
    const selectEl = document.getElementById("offerSetSelect");
    if (!selectEl) return;

    const offers = (ReadState.offers || []).map(normalizeOfferForLegacyUi_);
    if (typeof ProductosNuevaOfertaState !== "undefined") ProductosNuevaOfertaState.sets = offers.slice();

    let html = `<option value="">${offers.length ? "Selecciona un conjunto disponible" : "No hay conjuntos disponibles"}</option>`;
    html += offers.map((item) => {
      const tipo = item.tipo_oferta === "cantidad" ? "Cantidad" : "Bundle";
      return `<option value="${escapeHtmlForAttr_(item.id_variante)}">${escapeHtml_(item.id_variante)} · ${escapeHtml_(tipo)}</option>`;
    }).join("");

    selectEl.innerHTML = html;
    selectEl.disabled = offers.length === 0;
    selectEl.value = "";

    const statusEl = document.getElementById("offerWizardStatus");
    if (statusEl) {
      statusEl.textContent = offers.length ? "Selecciona un componente para continuar." : "No hay conjuntos disponibles todavía.";
      statusEl.className = "offerWizard__status";
    }

    if (typeof refreshOfferSetSelectUi_ === "function") refreshOfferSetSelectUi_();
    if (typeof renderProductosNuevaOfertaSelectedSet_ === "function") renderProductosNuevaOfertaSelectedSet_();
  }

  function getNuevaOfertaSelectedSet_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;
    const current = ProductosNuevaOfertaState.selectedSet;
    if (current && current.offer_set_id) return current;

    const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
    if (!selectedId) return null;

    return (ProductosNuevaOfertaState.sets || []).find((item) => safeText_(item.id_variante) === selectedId) || null;
  }

  function advanceNuevaOfertaWithoutLegacyActivation_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;

    const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
    const statusEl = document.getElementById("offerWizardStatus");
    const nextBtn = document.getElementById("offerSetNextBtn");

    if (!selectedId) {
      if (statusEl) {
        statusEl.textContent = "Primero selecciona un conjunto.";
        statusEl.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    const selectedSet = getNuevaOfertaSelectedSet_();
    if (!selectedSet || !selectedSet.offer_set_id) {
      if (statusEl) {
        statusEl.textContent = "El conjunto seleccionado no tiene offer_set_id Supabase. Refresca el panel y vuelve a intentar.";
        statusEl.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    ProductosNuevaOfertaState.selectedSet = selectedSet;
    ProductosNuevaOfertaState.activationResult = {
      ok: true,
      source: "supabase",
      skipped_legacy_activation: true,
      offer_set_id: selectedSet.offer_set_id,
      id_variante: selectedSet.id_variante
    };

    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.textContent = "Siguiente";
    }

    if (statusEl) {
      statusEl.textContent = "Conjunto validado. Continuando con identidad comercial.";
      statusEl.className = "offerWizard__status offerWizard__status--success";
    }

    if (typeof renderProductosNuevaOfertaStep2_ === "function") {
      renderProductosNuevaOfertaStep2_();
    }

    return selectedSet;
  }

  function renderCurrentSnapshot_() {
    const payload = ReadState.lastPayload;
    if (!payload || payload.ok !== true) return;

    const pieces = getBootstrapPieces_(payload);
    const normalizedOffers = pieces.offers.map(normalizeOfferForLegacyUi_);
    if (pieces.skus.length || normalizedOffers.length) resetEmptyMarkers_();

    if (typeof applyProductosFilters_ === "function") applyProductosFilters_();
    if (typeof renderProductosKpis_ === "function") renderProductosKpis_();
    if (typeof renderProductosTable_ === "function") renderProductosTable_();
    if (typeof wireProductosLocalSwitches_ === "function") wireProductosLocalSwitches_();
    if (!pieces.skus.length) renderEmptyTable_("prodResumenTableBody", 6, "No se encontraron productos con los filtros actuales.", "prodTableEmpty");

    if (document.getElementById("prodOffersTableBody")) {
      if (typeof renderOffersTable_ === "function") renderOffersTable_();
      if (!normalizedOffers.length) renderEmptyTable_("prodOffersTableBody", 7, "No se encontraron ofertas con los filtros actuales.", "prodTableEmpty");
    }

    if (document.getElementById("prodSetsTableBody")) {
      if (typeof renderProductSetsTable_ === "function") renderProductSetsTable_(normalizedOffers);
      if (!normalizedOffers.length) renderEmptyTable_("prodSetsTableBody", 9, "No se encontraron conjuntos para mostrar.", "prodSetsTable__empty");
    }

    if (payload.summary) applySummaryDirect_(payload.summary);
    populateFinancialScenarioSelects_();
    populateProductSetSkuSelects_();
    hydrateNuevaOfertaSelectFromSnapshot_();
  }

  function enforceSupabaseSnapshot_() {
    const payload = ReadState.lastPayload;
    if (!payload || payload.ok !== true) return;
    applySnapshotToProductosState_(payload);
    renderCurrentSnapshot_();
  }

  async function rpcWrite_(rpcName, params) {
    const client = getSupabaseClient_();
    if (!client || typeof client.rpc !== "function") throw new Error("Supabase no está disponible en el panel.");
    const res = await client.rpc(rpcName, params || {});
    if (!res || res.ok !== true) throw new Error(res && res.error ? String(res.error) : `La RPC ${rpcName} no respondió OK.`);
    return res;
  }

  async function reloadAfterWrite_() {
    await loadBootstrapFromSupabase_();
    [150, 500, 1200].forEach((delay) => setTimeout(enforceSupabaseSnapshot_, delay));
  }

  async function saveSkuViaSupabase_() {
    const payload = typeof ProductosCreateSkuState !== "undefined" ? ProductosCreateSkuState.pendingPayload : null;
    if (!payload) return null;

    const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");
    const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Guardando..."; }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const res = await rpcWrite_(UPSERT_PRODUCT_RPC, { input_product: payload });
      if (typeof closeProductosCreateSkuConfirmModal_ === "function") closeProductosCreateSkuConfirmModal_();
      if (typeof resetProductosCreateProductForm_ === "function") resetProductosCreateProductForm_();
      await reloadAfterWrite_();
      alert(`SKU guardado correctamente en Supabase: ${safeText_(res.sku || payload.sku)}`);
      return res;
    } catch (err) {
      alert(String(err && err.message ? err.message : err || "Error guardando SKU en Supabase."));
      return null;
    } finally {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirmar"; }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  }

  async function saveProductSetViaSupabase_() {
    if (typeof collectProductosSetBuilderPayload_ !== "function") {
      alert("No se encontró el payload del constructor de conjuntos.");
      return null;
    }

    const payload = collectProductosSetBuilderPayload_();
    const error = typeof validateProductosSetBuilderPayload_ === "function" ? validateProductosSetBuilderPayload_(payload) : "";
    const saveBtn = document.getElementById("prodSetSaveBtn");
    const messageEl = document.getElementById("prodSetSummaryMessage");

    if (error) {
      if (messageEl) messageEl.textContent = error;
      alert(error);
      return null;
    }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Guardando..."; }

    try {
      const res = await rpcWrite_(UPSERT_PRODUCT_SET_RPC, { input_set: payload });
      if (typeof ProductosSetBuilderState !== "undefined") ProductosSetBuilderState.saved = true;
      if (typeof showProductosSetSuccessNotice_ === "function") showProductosSetSuccessNotice_();
      if (typeof syncProductosSetBuilderLocks_ === "function") syncProductosSetBuilderLocks_();
      if (typeof syncProductosSetBuilderActionState_ === "function") syncProductosSetBuilderActionState_();
      if (messageEl) messageEl.textContent = `Conjunto guardado en Supabase. Precio final: ${formatMoneySafe_(res.precio_final_pack)}.`;
      await reloadAfterWrite_();
      return res;
    } catch (err) {
      const errMsg = "Error guardando el conjunto en Supabase: " + String(err && err.message ? err.message : err);
      if (messageEl) messageEl.textContent = errMsg;
      alert(errMsg);
      return null;
    } finally {
      if (saveBtn) saveBtn.textContent = "Guardar conjunto";
      if (typeof syncProductosSetBuilderActionState_ === "function") syncProductosSetBuilderActionState_();
    }
  }

  async function saveCommercialOfferViaSupabase_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;
    if (ProductosNuevaOfertaState.saving) return null;

    if (typeof persistProductosNuevaOfertaStep3Form_ === "function") {
      persistProductosNuevaOfertaStep3Form_();
    }

    const set = getNuevaOfertaSelectedSet_();
    const form = ProductosNuevaOfertaState.form || {};
    const statusEl = document.getElementById("offerWizardStatus");
    const saveBtn = document.getElementById("offerSaveBtn");

    if (!set || !set.offer_set_id) {
      if (statusEl) {
        statusEl.textContent = "No se encontró el conjunto operativo Supabase para esta oferta.";
        statusEl.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    const required = [
      ["nombre_interno", "Debes completar el nombre interno."],
      ["nombre_comercial", "Debes completar el nombre comercial."],
      ["subtitulo_oferta", "Debes completar el subtítulo."],
      ["descripcion_corta", "Debes completar la descripción corta."]
    ];

    for (const item of required) {
      if (!safeText_(form[item[0]])) {
        if (statusEl) {
          statusEl.textContent = item[1];
          statusEl.className = "offerWizard__status offerWizard__status--error";
        }
        return null;
      }
    }

    ProductosNuevaOfertaState.saving = true;

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }

    if (statusEl) {
      statusEl.textContent = "Guardando oferta comercial en Supabase...";
      statusEl.className = "offerWizard__status";
    }

    try {
      let mappingId = "";
      const idVariante = safeText_(set.id_variante_shopify || set.id_variante);

      if (idVariante) {
        const mappingRes = await rpcWrite_(UPSERT_VARIANT_MAPPING_RPC, {
          input_mapping: {
            id_variante_shopify: idVariante,
            offer_set_id: set.offer_set_id,
            estado: "active",
            contexto: "auto_from_commercial_offer"
          }
        });

        mappingId = safeText_(mappingRes && mappingRes.mapping && mappingRes.mapping.mapping_id);
      }

      const offerPayload = {
        offer_set_id: set.offer_set_id,
        mapping_id: mappingId || undefined,
        nombre_interno: safeText_(form.nombre_interno),
        nombre_comercial: safeText_(form.nombre_comercial),
        subtitulo_oferta: safeText_(form.subtitulo_oferta),
        descripcion_corta: safeText_(form.descripcion_corta),
        politica_compra: safeText_(form.politica_compra || "Predeterminado") || "Predeterminado",
        politica_envio: safeText_(form.politica_envio || "Predeterminado") || "Predeterminado",
        politica_devolucion: safeText_(form.politica_devolucion || "Predeterminado") || "Predeterminado",
        condiciones_generales: safeText_(form.condiciones_generales || "Predeterminado") || "Predeterminado",
        vigencia_desde: safeText_(form.vigencia_desde),
        vigencia_hasta: safeText_(form.vigencia_hasta),
        estado_oferta: "active",
        permite_publicacion: true,
        canal_previsto: "landing_producto",
        landing_key: idVariante || safeText_(set.id_variante),
        campaign_key: safeText_(form.nombre_interno)
      };

      const res = await rpcWrite_(UPSERT_COMMERCIAL_OFFER_RPC, { input_offer: offerPayload });
      const codigo = safeText_(res && res.offer && res.offer.codigo_oferta);

      ProductosNuevaOfertaState.savedResult = res;

      if (statusEl) {
        statusEl.textContent = `Oferta comercial guardada correctamente${codigo ? `: ${codigo}` : ""}.`;
        statusEl.className = "offerWizard__status offerWizard__status--success";
      }

      if (saveBtn) {
        saveBtn.textContent = "Oferta guardada";
        saveBtn.disabled = true;
      }

      await reloadAfterWrite_();
      return res;
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = String(err && err.message ? err.message : err || "Error guardando oferta comercial.");
        statusEl.className = "offerWizard__status offerWizard__status--error";
      }

      if (saveBtn) {
        saveBtn.textContent = "Guardar oferta";
        saveBtn.disabled = false;
      }

      return null;
    } finally {
      ProductosNuevaOfertaState.saving = false;
    }
  }

  function formatMoneySafe_(value) {
    try {
      return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(value || 0));
    } catch (err) {
      return `$ ${Number(value || 0).toFixed(2)}`;
    }
  }

  function patchFunction_(name, wrapper) {
    try {
      const original = window[name];
      if (typeof original !== "function") return;
      if (original.__productosSupabasePatched === BUILD) return;

      const patched = function () { return wrapper(original, Array.prototype.slice.call(arguments)); };
      patched.__productosSupabasePatched = BUILD;
      patched.__productosSupabaseOriginal = original;
      window[name] = patched;

      try { window.eval(`${name} = window[${JSON.stringify(name)}];`); } catch (err) {}
    } catch (err) {
      console.warn(`[productos-panel-supabase-read] No se pudo parchear ${name}`, err);
    }
  }

  function patchLegacyReaders_() {
    if (ReadState.legacyPatched) return;
    ReadState.legacyPatched = true;

    patchFunction_("loadProductos_", async function (original, args) {
      if (isSupabaseWinner_()) { enforceSupabaseSnapshot_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadOffersSummary_", async function (original, args) {
      if (isSupabaseWinner_()) { enforceSupabaseSnapshot_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadOffers_", async function (original, args) {
      if (isSupabaseWinner_()) { enforceSupabaseSnapshot_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductSets_", async function (original, args) {
      if (isSupabaseWinner_()) { enforceSupabaseSnapshot_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosNuevaOfertaSets_", async function (original, args) {
      if (isSupabaseWinner_()) { hydrateNuevaOfertaSelectFromSnapshot_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("handleProductosNuevaOfertaStep1Next_", async function (original, args) {
      if (isSupabaseWinner_()) return advanceNuevaOfertaWithoutLegacyActivation_();
      return original.apply(window, args || []);
    });

    patchFunction_("saveProductosNuevaOferta_", async function (original, args) {
      if (isSupabaseWinner_()) return saveCommercialOfferViaSupabase_();
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosSetBuilderProducts_", async function (original, args) {
      if (isSupabaseWinner_()) { applySnapshotToProductosState_(ReadState.lastPayload); populateProductSetSkuSelects_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosSetBuilderFinancialScenarios_", async function (original, args) {
      if (isSupabaseWinner_()) { applySnapshotToProductosState_(ReadState.lastPayload); populateFinancialScenarioSelects_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosLoteSkuOptions_", async function (original, args) {
      if (isSupabaseWinner_()) {
        applySnapshotToProductosState_(ReadState.lastPayload);
        if (typeof hydrateProductosLoteSkuSelects_ === "function") hydrateProductosLoteSkuSelects_();
        return null;
      }
      return original.apply(window, args || []);
    });

    patchFunction_("confirmProductosCreateSkuSave_", async function () { return saveSkuViaSupabase_(); });
    patchFunction_("saveProductosSetBuilder_", async function () { return saveProductSetViaSupabase_(); });
  }

  async function loadBootstrapFromSupabase_() {
    if (!isProductosPage_()) return null;
    if (ReadState.loading) return ReadState.lastPayload;

    const client = getSupabaseClient_();
    if (!client || typeof client.rpc !== "function") {
      console.warn("[productos-panel-supabase-read] Supabase no disponible. Se mantiene fallback AppScript para lectura.");
      return null;
    }

    ReadState.loading = true;
    ReadState.lastError = null;

    try {
      const result = await client.rpc(BOOTSTRAP_RPC, {});
      if (result && result.error) throw result.error;
      const payload = result && Object.prototype.hasOwnProperty.call(result, "data") ? result.data : result;
      if (!payload || payload.ok !== true) throw new Error("Bootstrap Supabase inválido para Productos.");

      ReadState.loaded = true;
      applySnapshotToProductosState_(payload);
      patchLegacyReaders_();
      renderCurrentSnapshot_();
      console.log("[productos-panel-supabase-read] Lectura Supabase OK", payload);
      [120, 350, 800, 1500, 3000, 5000].forEach((delay) => setTimeout(enforceSupabaseSnapshot_, delay));
      return payload;
    } catch (error) {
      ReadState.lastError = error;
      ReadState.loaded = false;
      window.__PRODUCTOS_SUPABASE_READ_ACTIVE__ = false;
      console.warn("[productos-panel-supabase-read] Falló Supabase. Se mantiene AppScript fallback para lectura:", error);
      return null;
    } finally {
      ReadState.loading = false;
    }
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

  function schedulePostRenderHydration_() {
    [80, 350, 900, 1600, 3000].forEach((delay) => {
      setTimeout(function () { patchLegacyReaders_(); enforceSupabaseSnapshot_(); }, delay);
    });
  }

  function bindHydrationEvents_() {
    document.addEventListener("click", function (event) {
      const shouldHydrate = event.target && event.target.closest && event.target.closest(
        "#prodNewProductBtn, #prodNewOfferBtn, [data-action='crear-conjunto'], #prodSetCreateBtn, #prodSlideCreateSetBtn, .prodTab"
      );
      if (shouldHydrate) schedulePostRenderHydration_();
    }, true);
  }

  function initProductosPanelSupabaseRead_() {
    if (!isProductosPage_()) return;
    if (document.body.dataset.productosPanelSupabaseReadReady === "1") { schedulePostRenderHydration_(); return; }
    document.body.dataset.productosPanelSupabaseReadReady = "1";
    bindProductSetSkuAutofill_();
    bindHydrationEvents_();
    patchLegacyReaders_();
    setTimeout(loadBootstrapFromSupabase_, 80);
    setTimeout(loadBootstrapFromSupabase_, 650);
  }

  window.ProductosPanelSupabaseRead = {
    build: BUILD,
    state: ReadState,
    load: loadBootstrapFromSupabase_,
    enforce: enforceSupabaseSnapshot_,
    hydrate: schedulePostRenderHydration_,
    patchLegacyReaders: patchLegacyReaders_,
    saveSku: saveSkuViaSupabase_,
    saveProductSet: saveProductSetViaSupabase_,
    saveCommercialOffer: saveCommercialOfferViaSupabase_,
    advanceOffer: advanceNuevaOfertaWithoutLegacyActivation_
  };

  document.addEventListener("DOMContentLoaded", initProductosPanelSupabaseRead_);
  document.addEventListener("sazzu:page:load", function () { setTimeout(initProductosPanelSupabaseRead_, 120); });
})();
