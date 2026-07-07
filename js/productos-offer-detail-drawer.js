/* Protocol Data · Offer Detail Drawer Helper · 04G */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_OFFER_DETAIL_DRAWER_2026_07_02_04G";
  const ATTACH_VARIANT_RPC = "rpc_products_attach_variant_to_commercial_offer";
  const DETACH_VARIANT_RPC = "rpc_products_detach_variant_from_commercial_offer";
  const COMMERCIAL_OFFERS_RPC = "rpc_products_panel_commercial_offers_list";
  const State = { currentOfferId: "", observerReady: false };

  function safeText(value) { return String(value == null ? "" : value).trim(); }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }

  function client() { return window.SazzuSupabase || null; }

  async function rpc(name, params) {
    const c = client();
    if (!c || typeof c.rpc !== "function") throw new Error("Supabase no está disponible en el panel.");
    const res = await c.rpc(name, params || {});
    if (res && res.error) throw res.error;
    const payload = res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;
    if (!payload) throw new Error(`La RPC ${name} no devolvió respuesta.`);
    if (payload.ok === false) throw new Error(payload.reason || payload.error || `La RPC ${name} respondió ok:false.`);
    return payload;
  }

  function offers() {
    const payload = window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ || { items: [] };
    return Array.isArray(payload.items) ? payload.items : [];
  }

  function normalizeOffer(item) {
    const variants = Array.isArray(item && item.variants)
      ? item.variants.filter(v => safeText(v && v.id_variante_shopify))
      : [];

    return {
      commercial_offer_id: safeText(item && item.commercial_offer_id),
      codigo_oferta: safeText(item && item.codigo_oferta),
      offer_set_id: safeText(item && item.offer_set_id),
      nombre_interno: safeText(item && item.nombre_interno),
      nombre_comercial: safeText(item && item.nombre_comercial),
      subtitulo_oferta: safeText(item && item.subtitulo_oferta),
      descripcion_corta: safeText(item && item.descripcion_corta),
      politica_compra: safeText(item && item.politica_compra) || "Predeterminado",
      politica_envio: safeText(item && item.politica_envio) || "Predeterminado",
      politica_devolucion: safeText(item && item.politica_devolucion) || "Predeterminado",
      condiciones_generales: safeText(item && item.condiciones_generales) || "Predeterminado",
      estado_oferta: safeText(item && item.estado_oferta) || "active",
      vigencia_desde: safeText(item && item.vigencia_desde),
      vigencia_hasta: safeText(item && item.vigencia_hasta),
      tipo_oferta: safeText(item && item.tipo_oferta) || "Comercial",
      composicion_resumen: safeText(item && item.composicion_resumen),
      variants
    };
  }

  function findOffer(id) {
    const offerId = safeText(id);
    return offers().map(normalizeOffer).find(item => item.commercial_offer_id === offerId) || null;
  }

  function dateLabel(from, to) {
    const f = safeText(from);
    const t = safeText(to);
    if (!f && !t) return "A definir";
    if (f && t) return `${f} → ${t}`;
    return f || t;
  }

  function injectCss() {
    if (document.getElementById("prodOfferDrawerCss04G")) return;
    document.getElementById("prodOfferDrawerCss04D")?.remove();
    document.getElementById("prodOfferDrawerCss04E")?.remove();
    document.getElementById("prodOfferDrawerCss04F")?.remove();

    const style = document.createElement("style");
    style.id = "prodOfferDrawerCss04G";
    style.textContent = `
      .prodOffersTable thead th:first-child,#prodOffersTableBody tr td:first-child{display:none!important}.prodOffersTable thead th{white-space:nowrap}.prodOffersTable tbody tr[data-commercial-offer-id]{cursor:pointer;transition:background .16s ease}.prodOffersTable tbody tr[data-commercial-offer-id]:hover{background:#f8fbff}.prodOffersTable tbody tr[data-commercial-offer-id] td{height:68px;vertical-align:middle}.prodOfferVariantAttachBtn{display:none!important}.prodOfferVariantsCell{display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;min-width:0!important;max-width:290px!important;white-space:nowrap;overflow:hidden}.prodOfferVariantItem{display:inline-flex!important;align-items:center;max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 8px;border:1px solid #b7e4c7!important;background:#ecfdf3!important;color:#067647!important;border-radius:5px!important;font-size:12px;font-weight:900;line-height:1}.prodOfferVariantItem strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.prodOfferVariantMore{display:inline-flex;align-items:center;padding:5px 8px;border:1px solid #d0d5dd;background:#fff;color:#667085;border-radius:5px;font-size:12px;font-weight:900;line-height:1}.prodOfferVariantEmpty{font-size:12px;color:#667085}
      .prodOfferOpenDetailBtn{display:none!important}.prodOfferDrawerOverlay{position:fixed;inset:0;background:rgba(15,23,42,.50);backdrop-filter:blur(3px);z-index:9998;opacity:0;pointer-events:none;transition:.2s ease}.prodOfferDrawerOverlay.is-open{opacity:1;pointer-events:auto}.prodOfferDrawer{position:fixed;top:0;right:0;height:100vh;width:min(560px,calc(100vw - 24px));background:#fff;box-shadow:-18px 0 48px rgba(15,23,42,.18);z-index:9999;transform:translateX(104%);transition:.24s ease;display:flex;flex-direction:column;border-left:1px solid #e6edf7;overflow:hidden}.prodOfferDrawer.is-open{transform:translateX(0)}#prodOfferDrawerContent{height:100%;min-height:0;display:flex;flex-direction:column;background:#fff}
      .prodOfferDrawer__header{padding:22px 24px 18px;background:#fff;border-bottom:1px solid #e6edf7;display:flex;justify-content:space-between;gap:16px;flex:0 0 auto}.prodOfferDrawer__eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a98ae;font-weight:900}.prodOfferDrawer__title{font-size:20px;font-weight:950;color:#111827;margin-top:5px}.prodOfferDrawer__sub{font-size:13px;color:#667085;margin-top:4px;line-height:1.45}.prodOfferDrawer__close{border:1px solid #e6edf7;background:#fff;border-radius:5px;width:36px;height:36px;color:#1d2939;font-size:18px;font-weight:950;cursor:pointer}
      .prodOfferDrawer__body{flex:1 1 auto;min-height:0;padding:0 24px 26px;overflow-y:auto;overscroll-behavior:contain;background:#fff}.prodOfferDrawerSection{background:#fff;border:0;border-top:1px solid #e6edf7;border-radius:0;box-shadow:none;padding:18px 0}.prodOfferDrawerSection:first-child{border-top:0}.prodOfferDrawerSection__title{font-size:12px;letter-spacing:.11em;text-transform:uppercase;color:#8a98ae;font-weight:950;margin-bottom:12px}.prodOfferDrawerSection--action{padding-top:18px}
      .prodOfferAttachForm{display:grid;gap:10px}.prodOfferAttachForm label{font-size:12px;font-weight:950;color:#344054}.prodOfferAttachForm input{width:100%;box-sizing:border-box;border:1px solid #d7e0ee;border-radius:5px;padding:12px 13px;font-size:14px;outline:none;background:#fff;color:#111827}.prodOfferAttachForm input:focus{border-color:#2479ff;box-shadow:0 0 0 3px rgba(36,121,255,.12)}.prodOfferAttachSubmit{border:0;background:#2479ff;color:#fff;border-radius:5px;padding:13px 14px;font-weight:950;cursor:pointer;box-shadow:none}.prodOfferAttachSubmit:disabled{opacity:.65;cursor:not-allowed}.prodOfferDrawerStatus{font-size:13px;line-height:1.4}.prodOfferDrawerStatus.is-error{color:#c91f1f}.prodOfferDrawerStatus.is-success{color:#138a3d}
      .prodOfferDrawerGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.prodOfferDrawerMetric{background:#fff;border:1px solid #edf2fa;border-radius:5px;padding:11px 12px}.prodOfferDrawerMetric span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8a98ae;font-weight:950}.prodOfferDrawerMetric strong{display:block;margin-top:5px;font-size:14px;color:#111827}.prodOfferPolicyList{display:grid;gap:0;border-top:1px solid #edf2fa}.prodOfferPolicyItem{display:grid;grid-template-columns:165px 1fr;gap:14px;align-items:start;border-bottom:1px solid #edf2fa;padding:12px 0;background:#fff}.prodOfferPolicyItem span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8a98ae;font-weight:950}.prodOfferPolicyItem strong{font-size:14px;color:#111827;font-weight:800}
      .prodOfferVariantList{display:flex;flex-direction:column;gap:8px}.prodOfferVariantRow{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #dbe7ff;background:#fff;border-radius:5px;padding:10px 12px}.prodOfferVariantRow strong{font-size:13px;color:#14213d}.prodOfferVariantRow span{font-size:12px;color:#667085}.prodOfferVariantRemove{border:0;background:#fff1f3;color:#b42318;border-radius:5px;padding:7px 9px;font-weight:900;cursor:pointer}.prodOfferVariantEmptyCard{border:1px dashed #c8d7ee;background:#fff;border-radius:5px;padding:14px;color:#667085;font-size:13px;line-height:1.45}
      @media(max-width:720px){.prodOfferDrawerGrid{grid-template-columns:1fr}.prodOfferPolicyItem{grid-template-columns:1fr;gap:4px}.prodOfferDrawer__header{padding:18px}.prodOfferDrawer__body{padding:0 16px 22px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDrawer() {
    injectCss();
    let overlay = document.getElementById("prodOfferDrawerOverlay");
    let drawer = document.getElementById("prodOfferDrawer");
    if (overlay && drawer) return drawer;

    overlay = document.createElement("div");
    overlay.id = "prodOfferDrawerOverlay";
    overlay.className = "prodOfferDrawerOverlay";

    drawer = document.createElement("aside");
    drawer.id = "prodOfferDrawer";
    drawer.className = "prodOfferDrawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `<div id="prodOfferDrawerContent"></div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    return drawer;
  }

  function prettifyOffersTable() {
    const tbody = document.getElementById("prodOffersTableBody");
    if (!tbody) return;

    tbody.querySelectorAll("tr[data-commercial-offer-id]").forEach(function (row) {
      row.setAttribute("title", "Abrir detalle de oferta");
      row.querySelectorAll(".prodOfferVariantAttachBtn").forEach(btn => btn.remove());
      row.querySelectorAll(".prodOffersRowToggle, .prodOfferOpenDetailBtn").forEach(btn => btn.remove());

      const items = Array.from(row.querySelectorAll(".prodOfferVariantItem"));
      const existingMore = row.querySelector(".prodOfferVariantMore");
      if (existingMore) existingMore.remove();

      items.forEach(function (item, index) {
        item.style.display = index < 2 ? "inline-flex" : "none";
        const strong = item.querySelector("strong");
        const rawText = item.textContent || "";
        const idText = strong ? strong.textContent : rawText.split("·")[0];
        const contextText = rawText.includes("·") ? rawText.split("·").slice(1).join("·").trim() : "";
        item.innerHTML = `<strong>${escapeHtml(idText.trim())}</strong>${contextText ? `<span style="display:none;">${escapeHtml(contextText)}</span>` : ""}`;
      });

      if (items.length > 2) {
        const more = document.createElement("span");
        more.className = "prodOfferVariantMore";
        more.textContent = `… +${items.length - 2}`;
        const cell = row.querySelector(".prodOfferVariantsCell");
        if (cell) cell.appendChild(more);
      }
    });
  }

  function observeOffersTable() {
    if (State.observerReady) return;
    State.observerReady = true;

    const run = function () { setTimeout(prettifyOffersTable, 30); };
    run();
    [120, 400, 900, 1600].forEach(delay => setTimeout(prettifyOffersTable, delay));

    const tbody = document.getElementById("prodOffersTableBody");
    if (!tbody || typeof MutationObserver !== "function") return;

    const observer = new MutationObserver(run);
    observer.observe(tbody, { childList: true, subtree: true });
  }

  function variantsHtml(offer) {
    if (!offer.variants.length) {
      return `<div class="prodOfferVariantEmptyCard">Esta oferta todavía no tiene IDs Variante Shopify vinculados. Cargalos arriba para que la venta entrante resuelva oferta → conjunto → SKUs.</div>`;
    }

    return `<div class="prodOfferVariantList">${offer.variants.map(v => `
      <div class="prodOfferVariantRow">
        <div><strong>${escapeHtml(v.id_variante_shopify)}</strong><br><span>${escapeHtml(safeText(v.contexto) || "Sin contexto")}</span></div>
        <button type="button" class="prodOfferVariantRemove" data-mapping-id="${escapeAttr(v.mapping_id)}" data-variant-id="${escapeAttr(v.id_variante_shopify)}">Desactivar</button>
      </div>
    `).join("")}</div>`;
  }

  function renderDrawer(offer) {
    ensureDrawer();
    const content = document.getElementById("prodOfferDrawerContent");
    if (!content || !offer) return;

    const title = offer.nombre_comercial || offer.nombre_interno || "Oferta comercial";
    const code = offer.codigo_oferta || offer.commercial_offer_id;

    content.innerHTML = `
      <div class="prodOfferDrawer__header">
        <div>
          <div class="prodOfferDrawer__eyebrow">Oferta comercial · ${escapeHtml(code)}</div>
          <div class="prodOfferDrawer__title">${escapeHtml(title)}</div>
          <div class="prodOfferDrawer__sub">${escapeHtml(offer.subtitulo_oferta || offer.descripcion_corta || "Sin subtítulo")}</div>
        </div>
        <button type="button" class="prodOfferDrawer__close" id="prodOfferDrawerCloseBtn">×</button>
      </div>
      <div class="prodOfferDrawer__body">
        <section class="prodOfferDrawerSection prodOfferDrawerSection--action">
          <div class="prodOfferDrawerSection__title">Incluir ID Variante</div>
          <div class="prodOfferAttachForm">
            <label for="prodOfferVariantInput">ID Variante Shopify</label>
            <input id="prodOfferVariantInput" type="text" placeholder="Ej: 1234567890" autocomplete="off" inputmode="numeric" />
            <label for="prodOfferVariantContextInput">Contexto</label>
            <input id="prodOfferVariantContextInput" type="text" placeholder="Ej: Landing A · Público frío · Meta Ads" autocomplete="off" />
            <button type="button" class="prodOfferAttachSubmit" id="prodOfferVariantSubmitBtn" data-commercial-offer-id="${escapeAttr(offer.commercial_offer_id)}">+ Vincular ID Variante</button>
            <div class="prodOfferDrawerStatus" id="prodOfferDrawerStatus"></div>
          </div>
        </section>

        <section class="prodOfferDrawerSection">
          <div class="prodOfferDrawerSection__title">IDs Variante Shopify vinculados</div>
          ${variantsHtml(offer)}
        </section>

        <section class="prodOfferDrawerSection">
          <div class="prodOfferDrawerSection__title">Resumen operativo</div>
          <div class="prodOfferDrawerGrid">
            <div class="prodOfferDrawerMetric"><span>Conjunto operativo</span><strong>${escapeHtml(offer.composicion_resumen || offer.offer_set_id || "Sin definir")}</strong></div>
            <div class="prodOfferDrawerMetric"><span>Tipo</span><strong>${escapeHtml(offer.tipo_oferta || "Comercial")}</strong></div>
            <div class="prodOfferDrawerMetric"><span>Vigencia</span><strong>${escapeHtml(dateLabel(offer.vigencia_desde, offer.vigencia_hasta))}</strong></div>
            <div class="prodOfferDrawerMetric"><span>Estado</span><strong>${escapeHtml(offer.estado_oferta || "active")}</strong></div>
          </div>
        </section>

        <section class="prodOfferDrawerSection">
          <div class="prodOfferDrawerSection__title">Políticas y condiciones</div>
          <div class="prodOfferPolicyList">
            <div class="prodOfferPolicyItem"><span>Política de compra</span><strong>${escapeHtml(offer.politica_compra)}</strong></div>
            <div class="prodOfferPolicyItem"><span>Política de envío</span><strong>${escapeHtml(offer.politica_envio)}</strong></div>
            <div class="prodOfferPolicyItem"><span>Política de devolución</span><strong>${escapeHtml(offer.politica_devolucion)}</strong></div>
            <div class="prodOfferPolicyItem"><span>Condiciones generales</span><strong>${escapeHtml(offer.condiciones_generales)}</strong></div>
          </div>
        </section>
      </div>
    `;

    setTimeout(function () {
      const input = document.getElementById("prodOfferVariantInput");
      if (input) input.focus();
    }, 120);
  }

  function openDrawer(commercialOfferId) {
    const offer = findOffer(commercialOfferId);
    if (!offer) return alert("No se encontró la oferta comercial en el estado actual del panel.");

    State.currentOfferId = offer.commercial_offer_id;
    renderDrawer(offer);

    document.getElementById("prodOfferDrawerOverlay")?.classList.add("is-open");
    const drawer = document.getElementById("prodOfferDrawer");
    if (drawer) {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
    }
  }

  function closeDrawer() {
    document.getElementById("prodOfferDrawerOverlay")?.classList.remove("is-open");
    const drawer = document.getElementById("prodOfferDrawer");
    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }
  }

  function setStatus(message, kind) {
    const el = document.getElementById("prodOfferDrawerStatus");
    if (!el) return;
    el.textContent = message || "";
    el.className = `prodOfferDrawerStatus${kind ? ` is-${kind}` : ""}`;
  }

  function formatRpcError(err) {
    const raw = String(err && err.message ? err.message : err || "Error vinculando ID Variante.");
    if (raw.includes("Could not find the function") || raw.includes("schema cache")) {
      return "Falta deployar la migración Supabase 04C o recargar la schema cache. Corré Deploy Supabase DB Migrations con migration_ref feature/finance-foundation y luego refrescá.";
    }
    return raw;
  }

  async function reloadCommercialOffers() {
    const payload = await rpc(COMMERCIAL_OFFERS_RPC, {});
    window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ = payload;
    if (window.ProductosPanelSupabaseRead && typeof window.ProductosPanelSupabaseRead.loadCommercialOffers === "function") {
      await window.ProductosPanelSupabaseRead.loadCommercialOffers();
    }
    prettifyOffersTable();
    return payload;
  }

  async function submitVariant() {
    const btn = document.getElementById("prodOfferVariantSubmitBtn");
    const variantInput = document.getElementById("prodOfferVariantInput");
    const contextInput = document.getElementById("prodOfferVariantContextInput");
    if (!btn || !variantInput) return;

    const offerId = safeText(btn.dataset.commercialOfferId);
    const variantId = safeText(variantInput.value);
    const contexto = safeText(contextInput && contextInput.value);

    if (!variantId) return setStatus("Debes completar el ID Variante Shopify.", "error");

    try {
      btn.disabled = true;
      btn.textContent = "Vinculando...";
      setStatus("Vinculando ID Variante con Supabase...", "");

      await rpc(ATTACH_VARIANT_RPC, {
        input_mapping: {
          commercial_offer_id: offerId,
          id_variante_shopify: variantId,
          contexto: contexto || undefined,
          estado: "active"
        }
      });

      await reloadCommercialOffers();
      const updated = findOffer(offerId);
      if (updated) renderDrawer(updated);
      setStatus(`ID Variante vinculado correctamente: ${variantId}`, "success");
    } catch (err) {
      setStatus(formatRpcError(err), "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "+ Vincular ID Variante";
    }
  }

  async function detachVariant(mappingId, variantId) {
    if (!window.confirm(`¿Desactivar el ID Variante ${variantId || mappingId}?`)) return;
    try {
      await rpc(DETACH_VARIANT_RPC, {
        input_mapping: {
          mapping_id: mappingId || undefined,
          id_variante_shopify: variantId || undefined
        }
      });
      await reloadCommercialOffers();
      const updated = findOffer(State.currentOfferId);
      if (updated) renderDrawer(updated);
    } catch (err) {
      alert("Error desactivando ID Variante: " + String(err && err.message ? err.message : err));
    }
  }

  function bindEvents() {
    if (document.body.dataset.productosOfferDrawerBound === BUILD) return;
    document.body.dataset.productosOfferDrawerBound = BUILD;

    window.addEventListener("click", function (event) {
      const archiveTarget = event.target && event.target.closest
        ? event.target.closest(
            "[data-prod-offer-archive-id], .prodOfferArchiveBtn, .prodOfferArchiveActionCell, #prodOfferArchiveOverlay, #prodOfferArchiveDialog"
          )
        : null;
    
      if (archiveTarget) {
        return;
      }
    
      const closeTarget = event.target && event.target.closest ? event.target.closest("#prodOfferDrawerCloseBtn, #prodOfferDrawerOverlay") : null;
      if (closeTarget) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeDrawer();
        return;
      }

      const submitBtn = event.target && event.target.closest ? event.target.closest("#prodOfferVariantSubmitBtn") : null;
      if (submitBtn) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitVariant();
        return;
      }

      const removeBtn = event.target && event.target.closest ? event.target.closest(".prodOfferVariantRemove") : null;
      if (removeBtn) {
        event.preventDefault();
        event.stopImmediatePropagation();
        detachVariant(removeBtn.dataset.mappingId, removeBtn.dataset.variantId);
        return;
      }

      const row = event.target && event.target.closest ? event.target.closest("#prodOffersTableBody tr[data-commercial-offer-id]") : null;
      if (row && row.dataset && row.dataset.commercialOfferId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openDrawer(row.dataset.commercialOfferId);
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    injectCss();
    ensureDrawer();
    bindEvents();
    observeOffersTable();
    window.ProductosOfferDetailDrawer = { build: BUILD, open: openDrawer, close: closeDrawer, reloadCommercialOffers, prettifyOffersTable };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  document.addEventListener("sazzu:page:load", function () { setTimeout(init, 120); });
})();
