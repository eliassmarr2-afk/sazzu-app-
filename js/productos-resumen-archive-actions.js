/* =========================================================
   PRODUCTOS · RESUMEN · archivado seguro de SKUs
   Build: PRODUCTOS_RESUMEN_ARCHIVE_2026_07_07_01
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_RESUMEN_ARCHIVE_2026_07_07_01";

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
    if (document.getElementById("prodArchiveSkuStyle")) return;

    const style = document.createElement("style");
    style.id = "prodArchiveSkuStyle";
    style.textContent = `
      .prodArchiveActionTh,
      .prodArchiveActionCell {
        width: 92px;
        text-align: right;
        white-space: nowrap;
      }

      .prodArchiveSkuBtn {
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

      .prodArchiveSkuBtn:hover,
      .prodArchiveSkuBtn:focus-visible {
        background: rgba(255,80,80,.14);
        border-color: rgba(255,90,90,.42);
        color: #ff8a8a;
        outline: none;
      }

      .prodArchiveSkuOverlay {
        position: fixed;
        inset: 0;
        z-index: 99990;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(0,0,0,.58);
        backdrop-filter: blur(3px);
      }

      .prodArchiveSkuOverlay.is-open {
        display: flex;
      }

      .prodArchiveSkuDialog {
        width: min(440px, calc(100vw - 32px));
        border-radius: 5px;
        background: #242424;
        border: 1px solid rgba(255,255,255,.11);
        box-shadow: 0 24px 70px rgba(0,0,0,.45);
        color: #fff;
        overflow: hidden;
      }

      .prodArchiveSkuDialog__top {
        height: 38px;
        padding: 0 12px 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1f1f1f;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .prodArchiveSkuDialog__caption {
        font-size: 11px;
        color: rgba(255,255,255,.58);
      }

      .prodArchiveSkuDialog__close {
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

      .prodArchiveSkuDialog__body {
        padding: 22px 22px 18px;
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 16px;
      }

      .prodArchiveSkuDialog__icon {
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

      .prodArchiveSkuDialog[data-mode="blocked"] .prodArchiveSkuDialog__icon,
      .prodArchiveSkuDialog[data-mode="error"] .prodArchiveSkuDialog__icon {
        color: #ff8a8a;
        background: rgba(255,80,80,.11);
        border-color: rgba(255,80,80,.22);
      }

      .prodArchiveSkuDialog[data-mode="success"] .prodArchiveSkuDialog__icon {
        color: #7ee2a8;
        background: rgba(61,220,132,.11);
        border-color: rgba(61,220,132,.24);
      }

      .prodArchiveSkuDialog__title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 750;
        color: #fff;
      }

      .prodArchiveSkuDialog__text {
        color: rgba(255,255,255,.70);
        font-size: 12px;
        line-height: 1.45;
      }

      .prodArchiveSkuDialog__text p {
        margin: 0 0 8px;
      }

      .prodArchiveSkuDialog__meta {
        margin-top: 12px;
        padding: 10px 11px;
        border-radius: 5px;
        background: rgba(255,255,255,.045);
        border: 1px solid rgba(255,255,255,.08);
        color: rgba(255,255,255,.70);
      }

      .prodArchiveSkuDialog__list {
        margin: 8px 0 0;
        padding-left: 16px;
      }

      .prodArchiveSkuDialog__list li {
        margin: 4px 0;
      }

      .prodArchiveSkuDialog__sku {
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

      .prodArchiveSkuDialog__actions {
        padding: 12px 16px 16px;
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        border-top: 1px solid rgba(255,255,255,.07);
      }

      .prodArchiveSkuDialog__btn {
        appearance: none;
        min-height: 32px;
        padding: 0 13px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.12);
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      .prodArchiveSkuDialog__btn--secondary {
        background: rgba(255,255,255,.055);
        color: rgba(255,255,255,.82);
      }

      .prodArchiveSkuDialog__btn--primary {
        background: #2479FF;
        border-color: #2479FF;
        color: #fff;
      }

      .prodArchiveSkuDialog__btn--danger {
        background: #ef4444;
        border-color: #ef4444;
        color: #fff;
      }

      .prodArchiveSkuDialog__btn[disabled] {
        opacity: .62;
        cursor: wait;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureModal_() {
    let overlay = document.getElementById("prodArchiveSkuOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "prodArchiveSkuOverlay";
    overlay.className = "prodArchiveSkuOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="prodArchiveSkuDialog" id="prodArchiveSkuDialog" role="dialog" aria-modal="true" data-mode="idle">
        <div class="prodArchiveSkuDialog__top">
          <span class="prodArchiveSkuDialog__caption">Confirmación operativa</span>
          <button type="button" class="prodArchiveSkuDialog__close" data-prod-archive-sku-close>×</button>
        </div>

        <div class="prodArchiveSkuDialog__body">
          <div class="prodArchiveSkuDialog__icon">🗑</div>
          <div>
            <h3 class="prodArchiveSkuDialog__title" id="prodArchiveSkuTitle"></h3>
            <div class="prodArchiveSkuDialog__text" id="prodArchiveSkuText"></div>
          </div>
        </div>

        <div class="prodArchiveSkuDialog__actions" id="prodArchiveSkuActions"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function closeModal_() {
    const overlay = document.getElementById("prodArchiveSkuOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function button_(label, type, attr) {
    return `
      <button
        type="button"
        class="prodArchiveSkuDialog__btn prodArchiveSkuDialog__btn--${type || "secondary"}"
        ${attr || ""}
      >${esc_(label)}</button>
    `;
  }

  function showModal_(mode, title, html, actionsHtml) {
    const overlay = ensureModal_();
    const dialog = document.getElementById("prodArchiveSkuDialog");
    const titleEl = document.getElementById("prodArchiveSkuTitle");
    const textEl = document.getElementById("prodArchiveSkuText");
    const actionsEl = document.getElementById("prodArchiveSkuActions");

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
      if (window.ProductosPanelSupabaseRead && typeof window.ProductosPanelSupabaseRead.load === "function") {
        window.ProductosPanelSupabaseRead.load().then(function () {
          if (window.ProductosPanelSupabaseRead && typeof window.ProductosPanelSupabaseRead.hydrate === "function") {
            window.ProductosPanelSupabaseRead.hydrate();
          }
        });
        return;
      }
    } catch (_) {}

    try {
      if (typeof loadProductos_ === "function") loadProductos_();
    } catch (_) {}

    try {
      if (typeof renderProductosTable_ === "function") renderProductosTable_();
    } catch (_) {}
  }

  function blockedHtml_(payload) {
    const sets = Array.isArray(payload && payload.blocking_sets) ? payload.blocking_sets : [];
    const count = Number((payload && payload.blocking_sets_count) || sets.length || 0);

    const list = sets.length
      ? `
        <ul class="prodArchiveSkuDialog__list">
          ${sets.map(function (item) {
            return `
              <li>
                <strong>${esc_(item.nombre_conjunto || item.offer_set_id || "Conjunto")}</strong>
                ${item.tipo_oferta ? " · " + esc_(item.tipo_oferta) : ""}
              </li>
            `;
          }).join("")}
        </ul>
      `
      : "";

    return `
      <p>Este producto no se puede eliminar porque pertenece a ${count} conjunto${count === 1 ? "" : "s"} activo${count === 1 ? "" : "s"}.</p>
      ${list}
      <div class="prodArchiveSkuDialog__meta">
        Primero archivá esos conjuntos. Si el conjunto está vinculado a una oferta, primero vas a tener que archivar la oferta o desvincular sus variantes Shopify.
      </div>
      <span class="prodArchiveSkuDialog__sku">${esc_(payload && payload.sku)}</span>
    `;
  }

  function confirmHtml_(payload) {
    return `
      <p>Este producto puede archivarse sin afectar conjuntos activos.</p>
      <div class="prodArchiveSkuDialog__meta">
        Se archivará el SKU y sus vínculos/mappings activos. Las compras históricas conservan sus snapshots.
      </div>
      <span class="prodArchiveSkuDialog__sku">${esc_(payload && payload.sku)}</span>
    `;
  }

  async function runArchiveSku_(sku) {
    showModal_(
      "loading",
      "Archivando producto",
      "<p>Aplicando archivado seguro sobre el SKU.</p>",
      button_("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc_("rpc_product_sku_archive", {
        input_sku: sku,
        input_reason: "Archivado desde Productos > Resumen"
      });

      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.message) || "No se pudo archivar el SKU.");
      }

      refreshAfterArchive_();

      showModal_(
        "success",
        "Producto archivado",
        `<p>${esc_(payload.message || "Producto archivado correctamente.")}</p>
         <span class="prodArchiveSkuDialog__sku">${esc_(payload.sku || sku)}</span>`,
        button_("Entendido", "primary", "data-prod-archive-sku-close")
      );
    } catch (err) {
      showModal_(
        "error",
        "No se pudo archivar",
        `<p>${esc_(err && err.message ? err.message : err)}</p>`,
        button_("Entendido", "primary", "data-prod-archive-sku-close")
      );
    }
  }

  async function openArchiveFlow_(sku) {
    const cleanSku = clean_(sku);
    if (!cleanSku) return;

    showModal_(
      "loading",
      "Revisando impacto",
      "<p>Validando si el producto pertenece a conjuntos u ofertas activas.</p>",
      button_("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc_("rpc_product_sku_archive_impact_check", {
        input_sku: cleanSku
      });

      if (!payload) throw new Error("Supabase no devolvió impacto de archivado.");

      if (payload.can_archive !== true) {
        showModal_(
          "blocked",
          "No se puede eliminar",
          blockedHtml_(payload),
          button_("Entendido", "primary", "data-prod-archive-sku-close")
        );
        return;
      }

      showModal_(
        "confirm",
        "Confirmar eliminación",
        confirmHtml_(payload),
        button_("Cancelar", "secondary", "data-prod-archive-sku-close") +
          button_("Confirmar", "danger", `data-prod-archive-sku-confirm="${esc_(cleanSku)}"`)
      );
    } catch (err) {
      showModal_(
        "error",
        "No se pudo revisar impacto",
        `<p>${esc_(err && err.message ? err.message : err)}</p>`,
        button_("Entendido", "primary", "data-prod-archive-sku-close")
      );
    }
  }

  function applyArchiveCells_() {
    const tbody = document.getElementById("prodResumenTableBody");
    if (!tbody) return;

    const table = tbody.closest("table") || document.querySelector("#prodPanelResumen .prodTable");
    if (!table) return;

    const headerRow = table.querySelector("thead tr");
    if (headerRow && !headerRow.querySelector('[data-prod-archive-sku-th="1"]')) {
      headerRow.insertAdjacentHTML(
        "beforeend",
        '<th class="prodArchiveActionTh" data-prod-archive-sku-th="1">Acciones</th>'
      );
    }

    tbody.querySelectorAll(".prodTableEmpty").forEach(function (cell) {
      const current = Number(cell.getAttribute("colspan") || 0);
      if (current && current < 6) cell.setAttribute("colspan", "6");
    });

    tbody.querySelectorAll("tr[data-product-sku]").forEach(function (row) {
      if (row.querySelector(".prodArchiveActionCell")) return;

      const sku = clean_(row.getAttribute("data-product-sku"));
      row.insertAdjacentHTML(
        "beforeend",
        `
          <td class="prodArchiveActionCell">
            <button
              type="button"
              class="prodArchiveSkuBtn"
              data-prod-archive-sku="${esc_(sku)}"
              aria-label="Eliminar producto ${esc_(sku)}"
            >🗑</button>
          </td>
        `
      );
    });
  }

  function bindEvents_() {
    if (window.__PRODUCTOS_RESUMEN_ARCHIVE_BOUND__ === true) return;
    window.__PRODUCTOS_RESUMEN_ARCHIVE_BOUND__ = true;

    document.addEventListener("click", function (event) {
      const archiveBtn = event.target.closest && event.target.closest(".prodArchiveSkuBtn");
      if (archiveBtn) {
        event.preventDefault();
        event.stopPropagation();
        openArchiveFlow_(archiveBtn.getAttribute("data-prod-archive-sku"));
        return;
      }

      const confirmBtn = event.target.closest && event.target.closest("[data-prod-archive-sku-confirm]");
      if (confirmBtn) {
        event.preventDefault();
        event.stopPropagation();
        runArchiveSku_(confirmBtn.getAttribute("data-prod-archive-sku-confirm"));
        return;
      }

      const closeBtn = event.target.closest && event.target.closest("[data-prod-archive-sku-close]");
      if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        closeModal_();
        return;
      }

      if (event.target && event.target.id === "prodArchiveSkuOverlay") {
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

    console.log("[productos-resumen-archive-actions] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_);
  } else {
    init_();
  }

  document.addEventListener("sazzu:page:load", init_);
  window.addEventListener("load", init_);
})();
