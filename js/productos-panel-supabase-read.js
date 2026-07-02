/* =========================================================
   Protocol Data · Productos Panel Supabase Bridge
   Fase: FRONTEND PRODUCTOS 04B

   Modelo correcto:
   - Conjuntos de productos = estructura operativa / SKUs físicos.
   - Ofertas = identidad comercial / campaña / narrativa.
   - Variante Shopify = mapeo operativo para resolver ventas.

   No toca Productos Comestibles.
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_PANEL_SUPABASE_BRIDGE_2026_07_02_04B";
  const BOOTSTRAP_RPC = "rpc_products_panel_bootstrap";
  const COMMERCIAL_OFFERS_RPC = "rpc_products_panel_commercial_offers_list";
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
    sets: [],
    commercialOffers: [],
    financialScenarios: [],
    legacyPatched: false
  };

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function client_() {
    return window.SazzuSupabase || null;
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

  function escapeAttr_(value) {
    return escapeHtml_(value).replace(/`/g, "&#096;");
  }

  function isSupabaseWinner_() {
    return !!(ReadState.loaded && ReadState.lastPayload && ReadState.lastPayload.ok === true);
  }

  async function rpc_(name, params) {
    const c = client_();
    if (!c || typeof c.rpc !== "function") throw new Error("Supabase no está disponible en el panel.");

    const res = await c.rpc(name, params || {});
    if (res && res.error) throw res.error;

    const payload = res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;
    if (!payload) throw new Error(`La RPC ${name} no devolvió respuesta.`);
    if (payload.ok === false) throw new Error(payload.reason || payload.error || `La RPC ${name} respondió ok:false.`);
    return payload;
  }

  function pieces_(payload) {
    return {
      skus: payload && payload.skus && Array.isArray(payload.skus.items) ? payload.skus.items : [],
      sets: payload && payload.offers && Array.isArray(payload.offers.items) ? payload.offers.items : [],
      scenarios: payload && payload.financial_scenarios && Array.isArray(payload.financial_scenarios.items) ? payload.financial_scenarios.items : []
    };
  }

  function normalizeSku_(item) {
    const sku = safeText_(item && item.sku);
    const nombre = safeText_(item && (item.nombre_producto || item.nombre));
    const estado = safeText_(item && item.estado).toLowerCase() || "active";

    return {
      ...item,
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
      escenario_financiero_resumen: safeText_(item && item.escenario_financiero_resumen),
      raw_supabase: item || {}
    };
  }

  function normalizeSet_(item) {
    const rawKind = safeText_(item && (item.offer_kind || item.tipo_oferta || item.tipo)).toLowerCase();
    const isQuantity = rawKind === "quantity" || rawKind === "cantidad" || rawKind.includes("cantidad");
    const isBundle = rawKind === "bundle" || rawKind.includes("bundle") || rawKind.includes("combin");
    const components = Array.isArray(item && item.components) ? item.components : [];
    const skus = Array.isArray(item && item.skus) ? item.skus : components.map(c => c && c.sku).filter(Boolean);
    const idVariante = safeText_(item && (item.id_variante || item.id_variante_shopify || item.shopify_variant_id));

    return {
      ...item,
      offer_set_id: safeText_(item && item.offer_set_id),
      row_type: isBundle ? "bundle" : "equivalencia",
      tipo: isBundle ? "bundle" : (isQuantity ? "equivalencia" : "oferta"),
      tipo_oferta: isQuantity ? "cantidad" : (isBundle ? "bundle" : safeText_(item && item.tipo_oferta)),
      estado: safeText_(item && item.estado) || "activo",
      id_variante: idVariante,
      id_variante_shopify: safeText_(item && (item.id_variante_shopify || item.shopify_variant_id || idVariante)),
      nombre_interno: safeText_(item && item.nombre_interno) || idVariante,
      nombre_comercial: safeText_(item && item.nombre_comercial),
      subtitulo_oferta: safeText_(item && item.subtitulo_oferta),
      descripcion_corta: safeText_(item && item.descripcion_corta),
      components,
      skus,
      composicion_resumen: safeText_(item && item.composicion_resumen) || skus.join(" + "),
      costo_productos: toNumber_(item && (item.costo_productos || item.costo_productos_total || item.supplier_cost_total), 0),
      costo_productos_total: toNumber_(item && (item.costo_productos || item.costo_productos_total || item.supplier_cost_total), 0),
      base_operativa_pack: toNumber_(item && item.base_operativa_pack, 0),
      precio_final_pack: toNumber_(item && (item.precio_final_pack || item.precio_final_snapshot), 0),
      precio_final_snapshot: toNumber_(item && (item.precio_final_snapshot || item.precio_final_pack), 0),
      escenario_financiero_id: safeText_(item && item.escenario_financiero_id),
      unidades_totales: toNumber_(item && item.unidades_totales, 0),
      raw_supabase: item || {}
    };
  }

  function normalizeCommercialOffer_(item) {
    return {
      commercial_offer_id: safeText_(item && item.commercial_offer_id),
      codigo_oferta: safeText_(item && item.codigo_oferta),
      offer_set_id: safeText_(item && item.offer_set_id),
      mapping_id: safeText_(item && item.mapping_id),
      nombre_interno: safeText_(item && item.nombre_interno),
      nombre_comercial: safeText_(item && item.nombre_comercial),
      subtitulo_oferta: safeText_(item && item.subtitulo_oferta),
      descripcion_corta: safeText_(item && item.descripcion_corta),
      estado_oferta: safeText_(item && item.estado_oferta) || "active",
      vigencia_desde: safeText_(item && item.vigencia_desde),
      vigencia_hasta: safeText_(item && item.vigencia_hasta),
      canal_previsto: safeText_(item && item.canal_previsto),
      campaign_key: safeText_(item && item.campaign_key),
      landing_key: safeText_(item && item.landing_key),
      id_variante: safeText_(item && (item.id_variante || item.id_variante_shopify)),
      id_variante_shopify: safeText_(item && (item.id_variante_shopify || item.id_variante)),
      tipo_oferta: safeText_(item && item.tipo_oferta) || "comercial",
      fecha_creacion: safeText_(item && (item.fecha_creacion || item.created_at)),
      fecha_actualizacion: safeText_(item && (item.fecha_actualizacion || item.updated_at)),
      raw_supabase: item || {}
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

  function money_(value) {
    try {
      return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(value || 0));
    } catch (err) {
      return `$ ${Number(value || 0).toFixed(2)}`;
    }
  }

  function dateLabel_(from, to) {
    const f = safeText_(from);
    const t = safeText_(to);
    if (!f && !t) return "A definir";
    if (f && t) return `${f} → ${t}`;
    return f || t;
  }

  function buildSetSummary_(sets) {
    const normalized = (sets || []).map(normalizeSet_);
    const bundles = normalized.filter(item => item.row_type === "bundle");
    const equivalencias = normalized.filter(item => item.row_type !== "bundle");

    return {
      ok: true,
      build: BUILD,
      source: "supabase_sets",
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

  function resetEmptyMarkers_() {
    ["prodResumenTableBody", "prodOffersTableBody", "prodSetsTableBody"].forEach(id => {
      const el = document.getElementById(id);
      if (el) delete el.dataset.supabaseEmptyRendered;
    });
  }

  function renderEmptyRow_(tbodyId, colspan, message, className) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="${className || "prodTableEmpty"}">${escapeHtml_(message)}</td></tr>`;
  }

  function renderCommercialOffersTable_() {
    const tbody = document.getElementById("prodOffersTableBody");
    const note = document.getElementById("prodOffersTableNote");
    if (!tbody) return;

    const items = (ReadState.commercialOffers || []).map(normalizeCommercialOffer_);
    if (note) note.textContent = `${items.length} oferta${items.length === 1 ? "" : "s"} comercial${items.length === 1 ? "" : "es"} encontrada${items.length === 1 ? "" : "s"}`;

    if (!items.length) {
      renderEmptyRow_("prodOffersTableBody", 7, "No hay ofertas comerciales creadas todavía. Crea una desde + Nueva oferta.", "prodOffersTable__empty");
      return;
    }

    tbody.innerHTML = items.map((item) => {
      const offerCode = item.codigo_oferta || item.commercial_offer_id || "—";
      const offerName = item.nombre_comercial || item.nombre_interno || "Oferta comercial";
      const sub = item.subtitulo_oferta || item.descripcion_corta || "Sin subtítulo";
      const type = item.tipo_oferta === "cantidad" ? "Cantidad" : (item.tipo_oferta === "bundle" ? "Bundle" : "Comercial");
      const variant = item.id_variante_shopify || "Sin variant_id";
      const created = item.fecha_creacion ? item.fecha_creacion.slice(0, 10) : "—";

      return `
        <tr data-commercial-offer-id="${escapeAttr_(item.commercial_offer_id)}">
          <td><button type="button" class="prodOffersRowToggle" aria-label="Ver detalle">›</button></td>
          <td>${escapeHtml_(offerCode)}</td>
          <td><strong>${escapeHtml_(offerName)}</strong><br><span>${escapeHtml_(sub)}</span></td>
          <td><span class="prodOfferTypeBadge">${escapeHtml_(type)}</span></td>
          <td>${escapeHtml_(variant)}</td>
          <td>${escapeHtml_(dateLabel_(item.vigencia_desde, item.vigencia_hasta))}</td>
          <td>${escapeHtml_(created)}</td>
        </tr>
      `;
    }).join("");
  }

  async function loadCommercialOffers_() {
    try {
      const payload = await rpc_(COMMERCIAL_OFFERS_RPC, {});
      const items = Array.isArray(payload.items) ? payload.items : [];
      ReadState.commercialOffers = items;
      window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ = payload;
      renderCommercialOffersTable_();
      setText_("prodKpiOfertas", items.length);
      return payload;
    } catch (err) {
      ReadState.commercialOffers = [];
      console.warn("[productos-panel-supabase-read] No se pudieron leer ofertas comerciales:", err);
      renderCommercialOffersTable_();
      return null;
    }
  }

  function applySummaryDirect_(summary) {
    const metrics = summary && summary.metrics ? summary.metrics : {};
    setText_("prodKpiSkus", toNumber_(metrics.skus_active, 0));
    setText_("prodKpiPacks", toNumber_(metrics.quantity_offers_active, 0));
    setText_("prodKpiBundles", toNumber_(metrics.bundle_offers_active, 0));
    setText_("prodKpiOfertas", (ReadState.commercialOffers || []).length);
  }

  function applySnapshotToState_(payload) {
    if (!payload || payload.ok !== true) return;

    const p = pieces_(payload);
    const normalizedSkus = p.skus.map(normalizeSku_);
    const normalizedSets = p.sets.map(normalizeSet_);
    const normalizedScenarios = p.scenarios.map(normalizeScenarioForBuilder_).filter(item => item.id_escenario);

    ReadState.skus = p.skus;
    ReadState.sets = p.sets;
    ReadState.financialScenarios = p.scenarios;
    ReadState.lastPayload = payload;

    window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__ = payload;
    window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__ = ReadState;
    window.__PRODUCTOS_SUPABASE_READ_ACTIVE__ = true;

    if (typeof ProductosState !== "undefined") {
      ProductosState.all = normalizedSkus;
      ProductosState.filtered = [];
      ProductosState.offersSummary = buildSetSummary_(p.sets);
      ProductosState.offersAll = [];
      ProductosState.offersFiltered = [];
      ProductosState.offersLoaded = true;
      ProductosState.offersLoading = false;
      ProductosState.productSets = normalizedSets.slice();
      ProductosState.productSetsLoaded = true;
      ProductosState.productSetsLoading = false;
    }

    if (typeof ProductosNuevaOfertaState !== "undefined") {
      ProductosNuevaOfertaState.sets = normalizedSets.slice();
      const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
      const stillExists = normalizedSets.some(item => safeText_(item.id_variante) === selectedId);
      if (selectedId && !stillExists) {
        ProductosNuevaOfertaState.selectedId = "";
        ProductosNuevaOfertaState.selectedSet = null;
      }
    }

    if (typeof ProductosSetBuilderState !== "undefined") {
      ProductosSetBuilderState.products = normalizedSkus
        .filter(item => item && item.sku && item.activo === true)
        .map(item => ({
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
        .filter(item => item && item.sku)
        .map(item => ({ sku: safeText_(item.sku), nombre: safeText_(item.nombre || item.nombre_producto) }));
      ProductosLoteState.skusLoaded = true;
      ProductosLoteState.skusLoading = false;
    }
  }

  function populateFinanceSelects_() {
    const scenarios = ReadState.financialScenarios || [];
    const valid = new Set(scenarios.map(scenarioValue_).filter(Boolean));

    ["prodSkuCreateEscenario", "prodSetFinanceScenario"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      const current = safeText_(select.value);
      select.innerHTML = '<option value="">Seleccionar escenario</option>' + scenarios.map(item => {
        const value = scenarioValue_(item);
        if (!value) return "";
        return `<option value="${escapeAttr_(value)}">${escapeHtml_(scenarioLabel_(item))}</option>`;
      }).join("");
      select.value = current && valid.has(current) ? current : "";
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

  function populateSetSkuSelects_() {
    const skus = ReadState.skus || [];
    const valid = new Set(skus.map(item => safeText_(item && item.sku)).filter(Boolean));
    const html = '<option value="">Seleccionar SKU</option>' + skus.map(item => {
      const sku = safeText_(item && item.sku);
      const name = safeText_(item && (item.nombre_producto || item.nombre));
      const cost = toNumber_(item && (item.costo_proveedor_actual || item.costo_proveedor), 0);
      return `<option value="${escapeAttr_(sku)}" data-name="${escapeAttr_(name)}" data-cost="${escapeAttr_(String(cost))}">${escapeHtml_(sku)} — ${escapeHtml_(name)}</option>`;
    }).join("");

    [1, 2, 3].forEach(index => {
      const select = document.getElementById(`prodSetSku${index}`);
      if (!select) return;
      const current = safeText_(select.value);
      select.innerHTML = html;
      select.value = current && valid.has(current) ? current : "";
      select.dataset.supabaseSkuLoaded = "1";
      select.disabled = false;
    });

    if (typeof refreshAllProductosSetBuilderSkuSelects_ === "function") refreshAllProductosSetBuilderSkuSelects_();
    if (typeof syncProductosSetBuilderFieldsFromSelection_ === "function") syncProductosSetBuilderFieldsFromSelection_();
    if (typeof updateProductosSetBuilderSummary_ === "function") updateProductosSetBuilderSummary_();
  }

  function hydrateNuevaOfertaSelect_() {
    if (!isSupabaseWinner_()) return;
    const select = document.getElementById("offerSetSelect");
    if (!select) return;

    const sets = (ReadState.sets || []).map(normalizeSet_);
    if (typeof ProductosNuevaOfertaState !== "undefined") ProductosNuevaOfertaState.sets = sets.slice();

    let html = `<option value="">${sets.length ? "Selecciona un conjunto disponible" : "No hay conjuntos disponibles"}</option>`;
    html += sets.map(item => {
      const tipo = item.tipo_oferta === "cantidad" ? "Cantidad" : "Bundle";
      return `<option value="${escapeAttr_(item.id_variante)}">${escapeHtml_(item.id_variante)} · ${escapeHtml_(tipo)}</option>`;
    }).join("");

    select.innerHTML = html;
    select.disabled = sets.length === 0;

    const status = document.getElementById("offerWizardStatus");
    if (status) {
      status.textContent = sets.length ? "Selecciona un conjunto para crear una oferta comercial." : "No hay conjuntos disponibles todavía.";
      status.className = "offerWizard__status";
    }

    if (typeof refreshOfferSetSelectUi_ === "function") refreshOfferSetSelectUi_();
    if (typeof renderProductosNuevaOfertaSelectedSet_ === "function") renderProductosNuevaOfertaSelectedSet_();
  }

  function renderSnapshot_() {
    const payload = ReadState.lastPayload;
    if (!payload || payload.ok !== true) return;

    const p = pieces_(payload);
    const normalizedSets = p.sets.map(normalizeSet_);
    if (p.skus.length || normalizedSets.length) resetEmptyMarkers_();

    if (typeof applyProductosFilters_ === "function") applyProductosFilters_();
    if (typeof renderProductosKpis_ === "function") renderProductosKpis_();
    if (typeof renderProductosTable_ === "function") renderProductosTable_();
    if (typeof wireProductosLocalSwitches_ === "function") wireProductosLocalSwitches_();
    if (!p.skus.length) renderEmptyRow_("prodResumenTableBody", 6, "No se encontraron productos con los filtros actuales.", "prodTableEmpty");

    if (document.getElementById("prodSetsTableBody")) {
      if (typeof renderProductSetsTable_ === "function") renderProductSetsTable_(normalizedSets);
      if (!normalizedSets.length) renderEmptyRow_("prodSetsTableBody", 9, "No se encontraron conjuntos para mostrar.", "prodSetsTable__empty");
    }

    renderCommercialOffersTable_();
    if (payload.summary) applySummaryDirect_(payload.summary);
    populateFinanceSelects_();
    populateSetSkuSelects_();
    hydrateNuevaOfertaSelect_();
  }

  function enforce_() {
    const payload = ReadState.lastPayload;
    if (!payload || payload.ok !== true) return;
    applySnapshotToState_(payload);
    renderSnapshot_();
  }

  async function loadBootstrap_() {
    if (!isProductosPage_()) return null;
    if (ReadState.loading) return ReadState.lastPayload;

    ReadState.loading = true;
    ReadState.lastError = null;

    try {
      const payload = await rpc_(BOOTSTRAP_RPC, {});
      if (!payload || payload.ok !== true) throw new Error("Bootstrap Supabase inválido para Productos.");

      ReadState.loaded = true;
      applySnapshotToState_(payload);
      patchLegacy_();
      await loadCommercialOffers_();
      renderSnapshot_();
      console.log("[productos-panel-supabase-read] Supabase OK", { build: BUILD, payload });
      [120, 350, 800, 1500, 3000, 5000].forEach(delay => setTimeout(enforce_, delay));
      return payload;
    } catch (err) {
      ReadState.lastError = err;
      ReadState.loaded = false;
      window.__PRODUCTOS_SUPABASE_READ_ACTIVE__ = false;
      console.warn("[productos-panel-supabase-read] Falló Supabase. Fallback legacy disponible:", err);
      return null;
    } finally {
      ReadState.loading = false;
    }
  }

  async function reloadAfterWrite_() {
    await loadBootstrap_();
    await loadCommercialOffers_();
    [150, 500, 1200].forEach(delay => setTimeout(enforce_, delay));
  }

  async function saveSku_() {
    const payload = typeof ProductosCreateSkuState !== "undefined" ? ProductosCreateSkuState.pendingPayload : null;
    if (!payload) return null;

    const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");
    const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Guardando..."; }
    if (cancelBtn) cancelBtn.disabled = true;

    try {
      const res = await rpc_(UPSERT_PRODUCT_RPC, { input_product: payload });
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

  async function saveProductSet_() {
    if (typeof collectProductosSetBuilderPayload_ !== "function") {
      alert("No se encontró el payload del constructor de conjuntos.");
      return null;
    }

    const payload = collectProductosSetBuilderPayload_();
    const error = typeof validateProductosSetBuilderPayload_ === "function" ? validateProductosSetBuilderPayload_(payload) : "";
    const saveBtn = document.getElementById("prodSetSaveBtn");
    const msg = document.getElementById("prodSetSummaryMessage");

    if (error) {
      if (msg) msg.textContent = error;
      alert(error);
      return null;
    }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Guardando..."; }

    try {
      const res = await rpc_(UPSERT_PRODUCT_SET_RPC, { input_set: payload });
      if (typeof ProductosSetBuilderState !== "undefined") ProductosSetBuilderState.saved = true;
      if (typeof showProductosSetSuccessNotice_ === "function") showProductosSetSuccessNotice_();
      if (typeof syncProductosSetBuilderLocks_ === "function") syncProductosSetBuilderLocks_();
      if (typeof syncProductosSetBuilderActionState_ === "function") syncProductosSetBuilderActionState_();
      if (msg) msg.textContent = `Conjunto guardado en Supabase. Precio final: ${money_(res.precio_final_pack)}.`;
      await reloadAfterWrite_();
      return res;
    } catch (err) {
      const message = "Error guardando el conjunto en Supabase: " + String(err && err.message ? err.message : err);
      if (msg) msg.textContent = message;
      alert(message);
      return null;
    } finally {
      if (saveBtn) saveBtn.textContent = "Guardar conjunto";
      if (typeof syncProductosSetBuilderActionState_ === "function") syncProductosSetBuilderActionState_();
    }
  }

  function selectedSet_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;
    const current = ProductosNuevaOfertaState.selectedSet;
    if (current && current.offer_set_id) return current;

    const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
    if (!selectedId) return null;
    return (ProductosNuevaOfertaState.sets || []).find(item => safeText_(item.id_variante) === selectedId) || null;
  }

  function advanceOffer_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;

    const status = document.getElementById("offerWizardStatus");
    const selectedId = safeText_(ProductosNuevaOfertaState.selectedId);
    if (!selectedId) {
      if (status) {
        status.textContent = "Primero selecciona un conjunto.";
        status.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    const set = selectedSet_();
    if (!set || !set.offer_set_id) {
      if (status) {
        status.textContent = "El conjunto seleccionado no tiene offer_set_id Supabase. Refresca el panel y vuelve a intentar.";
        status.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    ProductosNuevaOfertaState.selectedSet = set;
    ProductosNuevaOfertaState.activationResult = {
      ok: true,
      source: "supabase",
      skipped_legacy_activation: true,
      offer_set_id: set.offer_set_id,
      id_variante: set.id_variante
    };

    if (status) {
      status.textContent = "Conjunto validado. Continuando con identidad comercial.";
      status.className = "offerWizard__status offerWizard__status--success";
    }

    if (typeof renderProductosNuevaOfertaStep2_ === "function") renderProductosNuevaOfertaStep2_();
    return set;
  }

  async function saveCommercialOffer_() {
    if (typeof ProductosNuevaOfertaState === "undefined") return null;
    if (ProductosNuevaOfertaState.saving) return null;

    if (typeof persistProductosNuevaOfertaStep3Form_ === "function") persistProductosNuevaOfertaStep3Form_();

    const set = selectedSet_();
    const form = ProductosNuevaOfertaState.form || {};
    const status = document.getElementById("offerWizardStatus");
    const saveBtn = document.getElementById("offerSaveBtn");

    if (!set || !set.offer_set_id) {
      if (status) {
        status.textContent = "No se encontró el conjunto operativo Supabase para esta oferta.";
        status.className = "offerWizard__status offerWizard__status--error";
      }
      return null;
    }

    const required = [
      ["nombre_interno", "Debes completar el nombre interno."],
      ["nombre_comercial", "Debes completar el nombre comercial."],
      ["subtitulo_oferta", "Debes completar el subtítulo."],
      ["descripcion_corta", "Debes completar la descripción corta."]
    ];

    for (const [key, message] of required) {
      if (!safeText_(form[key])) {
        if (status) {
          status.textContent = message;
          status.className = "offerWizard__status offerWizard__status--error";
        }
        return null;
      }
    }

    ProductosNuevaOfertaState.saving = true;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Guardando..."; }
    if (status) { status.textContent = "Guardando oferta comercial en Supabase..."; status.className = "offerWizard__status"; }

    try {
      let mappingId = "";
      const idVariante = safeText_(set.id_variante_shopify || set.id_variante);

      if (idVariante) {
        const mappingRes = await rpc_(UPSERT_VARIANT_MAPPING_RPC, {
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

      const res = await rpc_(UPSERT_COMMERCIAL_OFFER_RPC, { input_offer: offerPayload });
      const code = safeText_(res && res.offer && res.offer.codigo_oferta);
      ProductosNuevaOfertaState.savedResult = res;

      await loadCommercialOffers_();
      await reloadAfterWrite_();

      if (status) {
        status.textContent = `Oferta comercial guardada correctamente${code ? `: ${code}` : ""}.`;
        status.className = "offerWizard__status offerWizard__status--success";
      }
      if (saveBtn) { saveBtn.textContent = "Oferta guardada"; saveBtn.disabled = true; }

      return res;
    } catch (err) {
      const message = String(err && err.message ? err.message : err || "Error guardando oferta comercial.");
      if (status) { status.textContent = message; status.className = "offerWizard__status offerWizard__status--error"; }
      if (saveBtn) { saveBtn.textContent = "Guardar oferta"; saveBtn.disabled = false; }
      return null;
    } finally {
      ProductosNuevaOfertaState.saving = false;
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

  function patchLegacy_() {
    if (ReadState.legacyPatched) return;
    ReadState.legacyPatched = true;

    patchFunction_("loadProductos_", async function (original, args) {
      if (isSupabaseWinner_()) { enforce_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadOffersSummary_", async function (original, args) {
      if (isSupabaseWinner_()) { renderCommercialOffersTable_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadOffers_", async function (original, args) {
      if (isSupabaseWinner_()) { await loadCommercialOffers_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("renderOffersTable_", function (original, args) {
      if (isSupabaseWinner_()) { renderCommercialOffersTable_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductSets_", async function (original, args) {
      if (isSupabaseWinner_()) { enforce_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosNuevaOfertaSets_", async function (original, args) {
      if (isSupabaseWinner_()) { hydrateNuevaOfertaSelect_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("handleProductosNuevaOfertaStep1Next_", async function (original, args) {
      if (isSupabaseWinner_()) return advanceOffer_();
      return original.apply(window, args || []);
    });

    patchFunction_("saveProductosNuevaOferta_", async function (original, args) {
      if (isSupabaseWinner_()) return saveCommercialOffer_();
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosSetBuilderProducts_", async function (original, args) {
      if (isSupabaseWinner_()) { applySnapshotToState_(ReadState.lastPayload); populateSetSkuSelects_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosSetBuilderFinancialScenarios_", async function (original, args) {
      if (isSupabaseWinner_()) { applySnapshotToState_(ReadState.lastPayload); populateFinanceSelects_(); return null; }
      return original.apply(window, args || []);
    });

    patchFunction_("loadProductosLoteSkuOptions_", async function (original, args) {
      if (isSupabaseWinner_()) {
        applySnapshotToState_(ReadState.lastPayload);
        if (typeof hydrateProductosLoteSkuSelects_ === "function") hydrateProductosLoteSkuSelects_();
        return null;
      }
      return original.apply(window, args || []);
    });

    patchFunction_("confirmProductosCreateSkuSave_", async function () { return saveSku_(); });
    patchFunction_("saveProductosSetBuilder_", async function () { return saveProductSet_(); });
  }

  function bindAutofill_() {
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

  function hydrateLater_() {
    [80, 350, 900, 1600, 3000].forEach(delay => {
      setTimeout(function () {
        patchLegacy_();
        enforce_();
        renderCommercialOffersTable_();
      }, delay);
    });
  }

  function bindEvents_() {
    document.addEventListener("click", function (event) {
      const shouldHydrate = event.target && event.target.closest && event.target.closest(
        "#prodNewProductBtn, #prodNewOfferBtn, [data-action='crear-conjunto'], #prodSetCreateBtn, #prodSlideCreateSetBtn, .prodTab"
      );
      if (shouldHydrate) hydrateLater_();
    }, true);
  }

  function init_() {
    if (!isProductosPage_()) return;
    if (document.body.dataset.productosPanelSupabaseReadReady === BUILD) { hydrateLater_(); return; }
    document.body.dataset.productosPanelSupabaseReadReady = BUILD;
    bindAutofill_();
    bindEvents_();
    patchLegacy_();
    setTimeout(loadBootstrap_, 80);
    setTimeout(loadBootstrap_, 650);
  }

  window.ProductosPanelSupabaseRead = {
    build: BUILD,
    state: ReadState,
    load: loadBootstrap_,
    loadCommercialOffers: loadCommercialOffers_,
    renderCommercialOffers: renderCommercialOffersTable_,
    enforce: enforce_,
    hydrate: hydrateLater_,
    patchLegacyReaders: patchLegacy_,
    saveSku: saveSku_,
    saveProductSet: saveProductSet_,
    saveCommercialOffer: saveCommercialOffer_,
    advanceOffer: advanceOffer_
  };

  document.addEventListener("DOMContentLoaded", init_);
  document.addEventListener("sazzu:page:load", function () { setTimeout(init_, 120); });
})();
