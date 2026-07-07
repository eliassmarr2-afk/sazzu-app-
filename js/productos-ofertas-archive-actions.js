/* =========================================================
   PRODUCTOS · OFERTAS · archivado seguro
   Build: PRODUCTOS_OFERTAS_ARCHIVE_2026_07_07_01
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_OFERTAS_ARCHIVE_2026_07_07_01";

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function clean_(value) {
    return String(value == null ? "" : value).trim();
  }

  function esc_(value) {
    return clean_(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureStyle_() {
    if (document.getElementById("prodOfferArchiveStyle")) return;

    const style = document.createElement("style");
    style.id = "prodOfferArchiveStyle";
    style.textContent = `
      .prodOfferArchiveActionTh,
      .prodOfferArchiveActionCell {
        width: 92px;
        text-align: right;
        white-space: nowrap;
      }

      .prodOfferArchiveBtn {
        appearance: none;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.045);
        color: rgba(255,255,255,.82);
        border-radius: 5px;
        width: 34px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .prodOfferArchiveBtn:hover,
      .prodOfferArchiveBtn:focus-visible {
        background: rgba(255,80,80,.14);
        border-color: rgba(255,90,90,.42);
        color: #ff8a8a;
        outline: none;
      }

      .prodOfferArchiveOverlay {
        position: fixed;
        inset: 0;
        z-index: 99991;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(0,0,0,.58);
        backdrop-filter: blur(3px);
      }

      .prodOfferArchiveOverlay.is-open {
        display: flex;
      }

      .prodOfferArchiveDialog {
        width: min(470px, calc(100vw - 32px));
        border-radius: 5px;
        background: #242424;
        border: 1px solid rgba(255,255,255,.11);
        box-shadow: 0 24px 70px rgba(0,0,0,.45);
        color: #fff;
        overflow: hidden;
      }

      .prodOfferArchiveDialog__top {
        height: 38px;
        padding: 0 12px 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1f1f1f;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .prodOfferArchiveDialog__caption {
        font-size: 11px;
        color: rgba(255,255,255,.58);
      }

      .prodOfferArchiveDialog__close {
        appearance: none;
        border: 0;
        background: transparent;
        color: rgba(255,255,255,.68);
        width: 26px;
        height: 26px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }

      .prodOfferArchiveDialog__body {
        padding: 22px 22px 18px;
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 16px;
      }

      .prodOfferArchiveDialog__icon {
        width: 46px;
        height: 46px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.055);
        border: 1px solid rgba(255,255,255,.12);
        font-size: 20px;
      }

      .prodOfferArchiveDialog[data-mode="error"] .prodOfferArchiveDialog__icon {
        color: #ff8a8a;
        background: rgba(255,80,80,.11);
        border-color: rgba(255,80,80,.22);
      }

      .prodOfferArchiveDialog[data-mode="success"] .prodOfferArchiveDialog__icon {
        color: #7ee2a8;
        background: rgba(61,220,132,.11);
        border-color: rgba(61,220,132,.24);
      }

      .prodOfferArchiveDialog__title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 750;
        color: #fff;
      }

      .prodOfferArchiveDialog__text {
        color: rgba(255,255,255,.70);
        font-size: 12px;
        line-height: 1.45;
      }

      .prodOfferArchiveDialog__text p {
        margin: 0 0 8px;
      }

      .prodOfferArchiveDialog__meta {
        margin-top: 12px;
        padding: 10px 11px;
        border-radius: 5px;
        background: rgba(255,255,255,.045);
        border: 1px solid rgba(255,255,255,.08);
        color: rgba(255,255,255,.70);
      }

      .prodOfferArchiveDialog__list {
        margin: 8px 0 0;
        padding-left: 16px;
      }

      .prodOfferArchiveDialog__list li {
        margin: 4px 0;
      }

      .prodOfferArchiveDialog__badge {
        display: inline-flex;
        margin-top: 9px;
        padding: 4px 7px;
        border-radius: 5px;
        background: rgba(36,121,255,.12);
        border: 1px solid rgba(36,121,255,.24);
        color: #8fb8ff;
        font-size: 11px;
        font-weight: 700;
      }

      .prodOfferArchiveDialog__actions {
        padding: 12px 16px 16px;
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        border-top: 1px solid rgba(255,255,255,.07);
      }

      .prodOfferArchiveDialog__btn {
        appearance: none;
        min-height: 32px;
        padding: 0 13px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.12);
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      .prodOfferArchiveDialog__btn--secondary {
        background: rgba(255,255,255,.055);
        color: rgba(255,255,255,.82);
      }

      .prodOfferArchiveDialog__btn--primary {
        background: #2479FF;
        border-color: #2479FF;
        color: #fff;
      }

      .prodOfferArchiveDialog__btn--danger {
        background: #ef4444;
        border-color: #ef4444;
        color: #fff;
      }

      .prodOfferArchiveDialog__btn[disabled] {
        opacity: .62;
        cursor: wait;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureModal_() {
    let overlay = document.getElementById("prodOfferArchiveOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "prodOfferArchiveOverlay";
    overlay.className = "prodOfferArchiveOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="prodOfferArchiveDialog" id="prodOfferArchiveDialog" role="dialog" aria-modal="true" data-mode="idle">
        <div class="prodOfferArchiveDialog__top">
          <span class="prodOfferArchiveDialog__caption">Confirmación operativa</span>
          <button type="button" class="prodOfferArchiveDialog__close" data-prod-offer-archive-close>×</button>
        </div>

        <div class="prodOfferArchiveDialog__body">
          <div class="prodOfferArchiveDialog__icon">🗑</div>
          <div>
            <h3 class="prodOfferArchiveDialog__title" id="prodOfferArchiveTitle"></h3>
            <div class="prodOfferArchiveDialog__text" id="prodOfferArchiveText"></div>
          </div>
        </div>

        <div class="prodOfferArchiveDialog__actions" id="prodOfferArchiveActions"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function closeModal_() {
    const overlay = document.getElementById("prodOfferArchiveOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function button_(label, type, attr) {
    return `
      <button
        type="button"
        class="prodOfferArchiveDialog__btn prodOfferArchiveDialog__btn--${type || "secondary"}"
        ${attr || ""}
      >${esc_(label)}</button>
    `;
  }

  function showModal_(mode, title, html, actionsHtml) {
    const overlay = ensureModal_();
    const dialog = document.getElementById("prodOfferArchiveDialog");
    const titleEl = document.getElementById("prodOfferArchiveTitle");
    const textEl = document.getElementById("prodOfferArchiveText");
    const actionsEl = document.getElementById("prodOfferArchiveActions");

    if (dialog) dialog.setAttribute("data-mode", mode || "idle");
    if (titleEl) titleEl.textContent = title || "";
    if (textEl) textEl.innerHTML = html || "";
    if (actionsEl) actionsEl.innerHTML = actionsHtml || "";

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }

  async function rpc_(name, params) {
    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      throw new Error("Supabase no está disponible en el panel.");
    }

    const res = await window.SazzuSupabase.rpc(name, params || {});
    if (res && res.error) throw res.error;

    return res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;
  }

  function refreshAfterArchive_() {
    try {
      if (window.ProductosPanelSupabaseRead) {
        const read = window.ProductosPanelSupabaseRead;

        if (typeof read.loadCommercialOffers === "function") read.loadCommercialOffers();
        if (typeof read.load === "function") {
          read.load().then(function () {
            if (typeof read.hydrate === "function") read.hydrate();
          });
        }

        return;
      }
    } catch (_) {}

    try {
      if (typeof loadOffers_ === "function") loadOffers_();
    } catch (_) {}

    try {
      if (typeof renderOffersTable_ === "function") renderOffersTable_();
    } catch (_) {}
  }

  function confirmHtml_(payload) {
    const variantCount = Number(payload && payload.active_variant_mappings_count || 0);
    const historyCount = Number(payload && payload.historical_matches_count || 0);
    const variants = Array.isArray(payload && payload.active_variant_mappings) ? payload.active_variant_mappings : [];

    const variantList = variants.length
      ? `
        <ul class="prodOfferArchiveDialog__list">
          ${variants.map(function (item) {
            return `
              <li>
                <strong>${esc_(item.id_variante_shopify || item.mapping_id || "Variante")}</strong>
                ${item.contexto ? " · " + esc_(item.contexto) : ""}
              </li>
            `;
          }).join("")}
        </ul>
      `
      : "";

    return `
      <p>Esta oferta dejará de resolver compras futuras.</p>
      <div class="prodOfferArchiveDialog__meta">
        Se desactivarán ${variantCount} variante${variantCount === 1 ? "" : "s"} Shopify vinculada${variantCount === 1 ? "" : "s"}.
        Hay ${historyCount} compra${historyCount === 1 ? "" : "s"} histórica${historyCount === 1 ? "" : "s"} relacionada${historyCount === 1 ? "" : "s"}, que conservarán su snapshot.
      </div>
      ${variantList}
      <span class="prodOfferArchiveDialog__badge">${esc_(payload && (payload.codigo_oferta || payload.commercial_offer_id))}</span>
    `;
  }

  async function runArchiveOffer_(commercialOfferId) {
    showModal_(
      "loading",
      "Archivando oferta",
      "<p>Aplicando archivado seguro sobre la oferta comercial.</p>",
      button_("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc_("rpc_product_commercial_offer_archive", {
        input_commercial_offer_id: commercialOfferId,
        input_reason: "Archivado desde Productos > Ofertas"
      });

      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.message) || "No se pudo archivar la oferta.");
      }

      refreshAfterArchive_();

      showModal_(
        "success",
        "Oferta archivada",
        `<p>${esc_(payload.message || "Oferta archivada correctamente.")}</p>
         <span class="prodOfferArchiveDialog__badge">${esc_(payload.codigo_oferta || commercialOfferId)}</span>`,
        button_("Entendido", "primary", "data-prod-offer-archive-close")
      );
    } catch (err) {
      showModal_(
        "error",
        "No se pudo archivar",
        `<p>${esc_(err && err.message ? err.message : err)}</p>`,
        button_("Entendido", "primary", "data-prod-offer-archive-close")
      );
    }
  }

  async function openArchiveFlow_(commercialOfferId) {
    const offerId = clean_(commercialOfferId);
    if (!offerId) return;

    showModal_(
      "loading",
      "Revisando impacto",
      "<p>Validando variantes Shopify y compras históricas asociadas.</p>",
      button_("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc_("rpc_product_commercial_offer_archive_impact_check", {
        input_commercial_offer_id: offerId
      });

      if (!payload) throw new Error("Supabase no devolvió impacto de archivado.");

      if (payload.can_archive !== true) {
        showModal_(
          "error",
          "No se puede eliminar",
          `<p>${esc_(payload.message || "La oferta no puede archivarse.")}</p>`,
          button_("Entendido", "primary", "data-prod-offer-archive-close")
        );
        return;
      }

      showModal_(
        "confirm",
        "Confirmar eliminación",
        confirmHtml_(payload),
        button_("Cancelar", "secondary", "data-prod-offer-archive-close") +
          button_("Confirmar", "danger", `data-prod-offer-archive-confirm="${esc_(offerId)}"`)
      );
    } catch (err) {
      showModal_(
        "error",
        "No se pudo revisar impacto",
        `<p>${esc_(err && err.message ? err.message : err)}</p>`,
        button_("Entendido", "primary", "data-prod-offer-archive-close")
      );
    }
  }

  function applyArchiveCells_() {
    const tbody = document.getElementById("prodOffersTableBody");
    if (!tbody) return;
  
    const table = tbody.closest("table");
    if (!table) return;
  
    const headerRow = table.querySelector("thead tr");
    if (headerRow && !headerRow.querySelector('[data-prod-offer-archive-th="1"]')) {
      headerRow.insertAdjacentHTML(
        "beforeend",
        '<th class="prodOfferArchiveActionTh" data-prod-offer-archive-th="1">Acciones</th>'
      );
    }
  
    tbody.querySelectorAll(".prodOffersTable__empty, .prodTableEmpty").forEach(function (cell) {
      const current = Number(cell.getAttribute("colspan") || 0);
      if (current && current < 8) cell.setAttribute("colspan", "8");
    });
  
    tbody.querySelectorAll("tr[data-commercial-offer-id]").forEach(function (row) {
      let cell = row.querySelector(".prodOfferArchiveActionCell");
      const offerId = clean_(row.getAttribute("data-commercial-offer-id"));
      if (!offerId) return;
  
      if (!cell) {
        row.insertAdjacentHTML(
          "beforeend",
          `
            <td class="prodOfferArchiveActionCell">
              <button
                type="button"
                class="prodOfferArchiveBtn"
                data-prod-offer-archive-id="${esc_(offerId)}"
                aria-label="Eliminar oferta ${esc_(offerId)}"
                title="Eliminar oferta"
              >🗑</button>
            </td>
          `
        );
  
        cell = row.querySelector(".prodOfferArchiveActionCell");
      }
  
      const btn = cell ? cell.querySelector("[data-prod-offer-archive-id]") : null;
      if (!btn || btn.dataset.offerArchiveDirectBound === "1") return;
  
      btn.dataset.offerArchiveDirectBound = "1";
  
      ["pointerdown", "mousedown", "mouseup", "dblclick"].forEach(function (eventName) {
        btn.addEventListener(eventName, function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") {
            event.stopImmediatePropagation();
          }
        }, true);
      });
  
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
  
        openArchiveFlow_(offerId);
      }, true);
  
      if (cell.dataset.offerArchiveCellBound !== "1") {
        cell.dataset.offerArchiveCellBound = "1";
  
        ["pointerdown", "mousedown", "mouseup", "click", "dblclick"].forEach(function (eventName) {
          cell.addEventListener(eventName, function (event) {
            const targetBtn = event.target && event.target.closest
              ? event.target.closest("[data-prod-offer-archive-id]")
              : null;
  
            if (!targetBtn) return;
  
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") {
              event.stopImmediatePropagation();
            }
          }, true);
        });
      }
    });
  }

  function bindEvents_() {
    if (window.__PRODUCTOS_OFERTAS_ARCHIVE_BOUND__ === true) return;
    window.__PRODUCTOS_OFERTAS_ARCHIVE_BOUND__ = true;

    document.addEventListener("click", function (event) {
      const archiveBtn = event.target.closest && event.target.closest("[data-prod-offer-archive-id]");
      if (archiveBtn) {
        event.preventDefault();
        event.stopPropagation();
        openArchiveFlow_(archiveBtn.getAttribute("data-prod-offer-archive-id"));
        return;
      }

      const confirmBtn = event.target.closest && event.target.closest("[data-prod-offer-archive-confirm]");
      if (confirmBtn) {
        event.preventDefault();
        event.stopPropagation();
        runArchiveOffer_(confirmBtn.getAttribute("data-prod-offer-archive-confirm"));
        return;
      }

      const closeBtn = event.target.closest && event.target.closest("[data-prod-offer-archive-close]");
      if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        closeModal_();
        return;
      }

      if (event.target && event.target.id === "prodOfferArchiveOverlay") {
        closeModal_();
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal_();
    });

    const observer = new MutationObserver(function () {
      applyArchiveCells_();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init_() {
    if (!isProductosPage_()) return;

    ensureStyle_();
    ensureModal_();
    bindEvents_();
    applyArchiveCells_();

    setTimeout(applyArchiveCells_, 150);
    setTimeout(applyArchiveCells_, 500);
    setTimeout(applyArchiveCells_, 1200);

    console.log("[productos-ofertas-archive-actions] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_);
  } else {
    init_();
  }

  document.addEventListener("sazzu:page:load", init_);
  window.addEventListener("load", init_);
})();
