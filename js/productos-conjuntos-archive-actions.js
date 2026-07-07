/* PRODUCTOS · CONJUNTOS · archivado seguro */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_CONJUNTOS_ARCHIVE_2026_07_07_01";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function items() {
    const read = window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__;
    if (read && Array.isArray(read.sets)) return read.sets;

    const payload = window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__ || {};
    const offers = payload.offers || {};
    if (Array.isArray(offers.items)) return offers.items;

    return [];
  }

  function findSetByIndex(index) {
    const list = items();
    return list[Number(index)] || null;
  }

  function setId(item) {
    return clean(item && item.offer_set_id);
  }

  function setName(item) {
    return clean(item && (item.nombre_interno || item.id_variante_shopify || item.id_variante || item.offer_set_id));
  }

  function setStatus(item) {
    return clean(item && item.estado).toLowerCase();
  }

  function isArchived(item) {
    return setStatus(item) === "archived";
  }

  function ensureStyle() {
    if (document.getElementById("prodSetArchiveStyle")) return;

    const style = document.createElement("style");
    style.id = "prodSetArchiveStyle";
    style.textContent = `
      .prodSetArchiveActionTh,
      .prodSetArchiveActionCell {
        width: 92px;
        text-align: right;
        white-space: nowrap;
      }

      .prodSetArchiveBtn {
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

      .prodSetArchiveBtn:hover,
      .prodSetArchiveBtn:focus-visible {
        background: rgba(255,80,80,.14);
        border-color: rgba(255,90,90,.42);
        color: #ff8a8a;
        outline: none;
      }

      .prodSetArchivedBadge {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        margin-top: 6px;
        padding: 4px 7px;
        border-radius: 5px;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.13);
        color: rgba(255,255,255,.64);
        font-size: 11px;
        font-weight: 850;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      #prodSetsTableBody tr.is-set-archived {
        opacity: .72;
      }

      #prodSetsTableBody tr.is-set-archived .prodSetArchiveBtn {
        display: none !important;
      }

      #prodSetsTableBody tr.is-set-archived .prodSetArchiveActionCell::before {
        content: "Archivado";
        display: inline-flex;
        align-items: center;
        padding: 4px 7px;
        border-radius: 5px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.11);
        color: rgba(255,255,255,.52);
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      .prodSetArchiveOverlay {
        position: fixed;
        inset: 0;
        z-index: 99992;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(0,0,0,.58);
        backdrop-filter: blur(3px);
      }

      .prodSetArchiveOverlay.is-open {
        display: flex;
      }

      .prodSetArchiveDialog {
        width: min(470px, calc(100vw - 32px));
        border-radius: 5px;
        background: #242424;
        border: 1px solid rgba(255,255,255,.11);
        box-shadow: 0 24px 70px rgba(0,0,0,.45);
        color: #fff;
        overflow: hidden;
      }

      .prodSetArchiveDialog__top {
        height: 38px;
        padding: 0 12px 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1f1f1f;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .prodSetArchiveDialog__caption {
        font-size: 11px;
        color: rgba(255,255,255,.58);
      }

      .prodSetArchiveDialog__close {
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

      .prodSetArchiveDialog__body {
        padding: 22px 22px 18px;
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 16px;
      }

      .prodSetArchiveDialog__icon {
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

      .prodSetArchiveDialog[data-mode="blocked"] .prodSetArchiveDialog__icon,
      .prodSetArchiveDialog[data-mode="error"] .prodSetArchiveDialog__icon {
        color: #ff8a8a;
        background: rgba(255,80,80,.11);
        border-color: rgba(255,80,80,.22);
      }

      .prodSetArchiveDialog[data-mode="success"] .prodSetArchiveDialog__icon {
        color: #7ee2a8;
        background: rgba(61,220,132,.11);
        border-color: rgba(61,220,132,.24);
      }

      .prodSetArchiveDialog__title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 750;
        color: #fff;
      }

      .prodSetArchiveDialog__text {
        color: rgba(255,255,255,.70);
        font-size: 12px;
        line-height: 1.45;
      }

      .prodSetArchiveDialog__text p {
        margin: 0 0 8px;
      }

      .prodSetArchiveDialog__meta {
        margin-top: 12px;
        padding: 10px 11px;
        border-radius: 5px;
        background: rgba(255,255,255,.045);
        border: 1px solid rgba(255,255,255,.08);
        color: rgba(255,255,255,.70);
      }

      .prodSetArchiveDialog__list {
        margin: 8px 0 0;
        padding-left: 16px;
      }

      .prodSetArchiveDialog__list li {
        margin: 4px 0;
      }

      .prodSetArchiveDialog__badge {
        display: inline-flex;
        margin-top: 9px;
        padding: 4px 7px;
        border-radius: 5px;
        background: rgba(36,121,255,.12);
        border: 1px solid rgba(36,121,255,.24);
        color: #8fb8ff;
        font-size: 11px;
        font-weight: 800;
      }

      .prodSetArchiveDialog__actions {
        padding: 12px 16px 16px;
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        border-top: 1px solid rgba(255,255,255,.07);
      }

      .prodSetArchiveDialog__btn {
        appearance: none;
        min-height: 32px;
        padding: 0 13px;
        border-radius: 5px;
        border: 1px solid rgba(255,255,255,.12);
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      .prodSetArchiveDialog__btn--secondary {
        background: rgba(255,255,255,.055);
        color: rgba(255,255,255,.82);
      }

      .prodSetArchiveDialog__btn--primary {
        background: #2479FF;
        border-color: #2479FF;
        color: #fff;
      }

      .prodSetArchiveDialog__btn--danger {
        background: #ef4444;
        border-color: #ef4444;
        color: #fff;
      }

      .prodSetArchiveDialog__btn[disabled] {
        opacity: .62;
        cursor: wait;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let overlay = document.getElementById("prodSetArchiveOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "prodSetArchiveOverlay";
    overlay.className = "prodSetArchiveOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="prodSetArchiveDialog" id="prodSetArchiveDialog" role="dialog" aria-modal="true" data-mode="idle">
        <div class="prodSetArchiveDialog__top">
          <span class="prodSetArchiveDialog__caption">Confirmación operativa</span>
          <button type="button" class="prodSetArchiveDialog__close" data-prod-set-archive-close>×</button>
        </div>

        <div class="prodSetArchiveDialog__body">
          <div class="prodSetArchiveDialog__icon">🗑</div>
          <div>
            <h3 class="prodSetArchiveDialog__title" id="prodSetArchiveTitle"></h3>
            <div class="prodSetArchiveDialog__text" id="prodSetArchiveText"></div>
          </div>
        </div>

        <div class="prodSetArchiveDialog__actions" id="prodSetArchiveActions"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function closeModal() {
    const overlay = document.getElementById("prodSetArchiveOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function button(label, type, attr) {
    return `
      <button
        type="button"
        class="prodSetArchiveDialog__btn prodSetArchiveDialog__btn--${type || "secondary"}"
        ${attr || ""}
      >${esc(label)}</button>
    `;
  }

  function showModal(mode, title, html, actionsHtml) {
    const overlay = ensureModal();
    const dialog = document.getElementById("prodSetArchiveDialog");
    const titleEl = document.getElementById("prodSetArchiveTitle");
    const textEl = document.getElementById("prodSetArchiveText");
    const actionsEl = document.getElementById("prodSetArchiveActions");

    if (dialog) dialog.setAttribute("data-mode", mode || "idle");
    if (titleEl) titleEl.textContent = title || "";
    if (textEl) textEl.innerHTML = html || "";
    if (actionsEl) actionsEl.innerHTML = actionsHtml || "";

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }

  async function rpc(name, params) {
    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      throw new Error("Supabase no está disponible en el panel.");
    }

    const res = await window.SazzuSupabase.rpc(name, params || {});
    if (res && res.error) throw res.error;
    return res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;
  }

  function blockingHtml(payload) {
    const offers = Array.isArray(payload && payload.blocking_offers) ? payload.blocking_offers : [];
    const mappings = Array.isArray(payload && payload.blocking_variant_mappings) ? payload.blocking_variant_mappings : [];

    const offerList = offers.length
      ? `<ul class="prodSetArchiveDialog__list">${offers.map(function (item) {
          return `<li><strong>${esc(item.codigo_oferta || item.nombre_comercial || item.commercial_offer_id)}</strong>${item.estado_oferta ? " · " + esc(item.estado_oferta) : ""}</li>`;
        }).join("")}</ul>`
      : "";

    const mappingList = mappings.length
      ? `<ul class="prodSetArchiveDialog__list">${mappings.map(function (item) {
          return `<li><strong>${esc(item.id_variante_shopify || item.mapping_id)}</strong>${item.contexto ? " · " + esc(item.contexto) : ""}</li>`;
        }).join("")}</ul>`
      : "";

    return `
      <p>Este conjunto no se puede eliminar porque todavía tiene ofertas o variantes Shopify activas vinculadas.</p>
      ${offers.length ? `<div class="prodSetArchiveDialog__meta"><strong>Ofertas activas:</strong>${offerList}</div>` : ""}
      ${mappings.length ? `<div class="prodSetArchiveDialog__meta"><strong>Variantes activas:</strong>${mappingList}</div>` : ""}
      <span class="prodSetArchiveDialog__badge">${esc(payload && (payload.nombre_conjunto || payload.offer_set_id))}</span>
    `;
  }

  function confirmHtml(payload) {
    return `
      <p>Este conjunto puede archivarse sin afectar ofertas activas ni variantes Shopify activas.</p>
      <div class="prodSetArchiveDialog__meta">
        Se archivará el conjunto operativo. No se borrarán componentes ni snapshots históricos.
      </div>
      <span class="prodSetArchiveDialog__badge">${esc(payload && (payload.nombre_conjunto || payload.offer_set_id))}</span>
    `;
  }

  function markRowArchived(offerSetId) {
    const tbody = document.getElementById("prodSetsTableBody");
    if (!tbody) return;

    tbody.querySelectorAll(".prodSetsRow--main[data-offer-set-id]").forEach(function (row) {
      if (clean(row.getAttribute("data-offer-set-id")) !== clean(offerSetId)) return;
      row.classList.add("is-set-archived");

      const firstCell = row.children && row.children[0] ? row.children[0] : null;
      if (firstCell && !firstCell.querySelector(".prodSetArchivedBadge")) {
        firstCell.insertAdjacentHTML("beforeend", '<span class="prodSetArchivedBadge">Archivado</span>');
      }

      const btn = row.querySelector(".prodSetArchiveBtn");
      if (btn) btn.remove();
    });
  }

  async function runArchive(offerSetId) {
    showModal(
      "loading",
      "Archivando conjunto",
      "<p>Aplicando archivado seguro sobre el conjunto operativo.</p>",
      button("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc("rpc_product_offer_set_archive", {
        input_offer_set_id: offerSetId,
        input_reason: "Archivado desde Productos > Conjuntos"
      });

      if (!payload || payload.ok !== true) {
        throw new Error((payload && payload.message) || "No se pudo archivar el conjunto.");
      }

      markRowArchived(offerSetId);

      showModal(
        "success",
        "Conjunto archivado",
        `<p>${esc(payload.message || "Conjunto archivado correctamente.")}</p>
         <span class="prodSetArchiveDialog__badge">${esc(payload.nombre_conjunto || offerSetId)}</span>`,
        button("Entendido", "primary", "data-prod-set-archive-close")
      );
    } catch (err) {
      showModal(
        "error",
        "No se pudo archivar",
        `<p>${esc(err && err.message ? err.message : err)}</p>`,
        button("Entendido", "primary", "data-prod-set-archive-close")
      );
    }
  }

  async function openFlow(offerSetId) {
    const id = clean(offerSetId);
    if (!id) return;

    showModal(
      "loading",
      "Revisando impacto",
      "<p>Validando ofertas activas, variantes Shopify activas y componentes del conjunto.</p>",
      button("Procesando...", "secondary", "disabled")
    );

    try {
      const payload = await rpc("rpc_product_offer_set_archive_impact_check", {
        input_offer_set_id: id
      });

      if (!payload) throw new Error("Supabase no devolvió impacto de archivado.");

      if (payload.can_archive !== true) {
        showModal(
          "blocked",
          "No se puede eliminar",
          blockingHtml(payload),
          button("Entendido", "primary", "data-prod-set-archive-close")
        );
        return;
      }

      showModal(
        "confirm",
        "Confirmar eliminación",
        confirmHtml(payload),
        button("Cancelar", "secondary", "data-prod-set-archive-close") +
          button("Confirmar", "danger", `data-prod-set-archive-confirm="${esc(id)}"`)
      );
    } catch (err) {
      showModal(
        "error",
        "No se pudo revisar impacto",
        `<p>${esc(err && err.message ? err.message : err)}</p>`,
        button("Entendido", "primary", "data-prod-set-archive-close")
      );
    }
  }

  function applyActions() {
    const tbody = document.getElementById("prodSetsTableBody");
    if (!tbody) return;

    const table = tbody.closest("table");
    if (!table) return;

    ensureStyle();

    const headerRow = table.querySelector("thead tr");
    if (headerRow && !headerRow.querySelector('[data-prod-set-archive-th="1"]')) {
      headerRow.insertAdjacentHTML(
        "beforeend",
        '<th class="prodSetArchiveActionTh" data-prod-set-archive-th="1">Acciones</th>'
      );
    }

    tbody.querySelectorAll(".prodSetsTable__empty, .prodTableEmpty").forEach(function (cell) {
      const current = Number(cell.getAttribute("colspan") || 0);
      if (current && current < 8) cell.setAttribute("colspan", "8");
    });

    tbody.querySelectorAll(".prodSetsRow--detail td").forEach(function (cell) {
      const current = Number(cell.getAttribute("colspan") || 0);
      if (current && current < 8) cell.setAttribute("colspan", "8");
    });

    const rows = Array.from(tbody.querySelectorAll(".prodSetsRow--main"));

    rows.forEach(function (row, index) {
      const item = findSetByIndex(index);
      const id = setId(item);
      if (!id) return;

      row.setAttribute("data-offer-set-id", id);

      let cell = row.querySelector(".prodSetArchiveActionCell");
      if (!cell) {
        row.insertAdjacentHTML("beforeend", '<td class="prodSetArchiveActionCell"></td>');
        cell = row.querySelector(".prodSetArchiveActionCell");
      }

      if (isArchived(item)) {
        row.classList.add("is-set-archived");

        const firstCell = row.children && row.children[0] ? row.children[0] : null;
        if (firstCell && !firstCell.querySelector(".prodSetArchivedBadge")) {
          firstCell.insertAdjacentHTML("beforeend", '<span class="prodSetArchivedBadge">Archivado</span>');
        }

        cell.innerHTML = "";
        return;
      }

      if (!cell.querySelector("[data-prod-set-archive-id]")) {
        cell.innerHTML = `
          <button
            type="button"
            class="prodSetArchiveBtn"
            data-prod-set-archive-id="${esc(id)}"
            aria-label="Eliminar conjunto ${esc(id)}"
            title="Eliminar conjunto"
          >🗑</button>
        `;
      }

      const btn = cell.querySelector("[data-prod-set-archive-id]");
      if (!btn || btn.dataset.setArchiveBound === "1") return;

      btn.dataset.setArchiveBound = "1";

      ["pointerdown", "mousedown", "mouseup", "dblclick"].forEach(function (eventName) {
        btn.addEventListener(eventName, function (event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        }, true);
      });

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        openFlow(id);
      }, true);
    });
  }

  function bindEvents() {
    if (window.__PRODUCTOS_CONJUNTOS_ARCHIVE_BOUND__ === true) return;
    window.__PRODUCTOS_CONJUNTOS_ARCHIVE_BOUND__ = true;

    document.addEventListener("click", function (event) {
      const confirmBtn = event.target.closest && event.target.closest("[data-prod-set-archive-confirm]");
      if (confirmBtn) {
        event.preventDefault();
        event.stopPropagation();
        runArchive(confirmBtn.getAttribute("data-prod-set-archive-confirm"));
        return;
      }

      const closeBtn = event.target.closest && event.target.closest("[data-prod-set-archive-close]");
      if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
        return;
      }

      if (event.target && event.target.id === "prodSetArchiveOverlay") closeModal();
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });

    const observer = new MutationObserver(applyActions);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    ensureStyle();
    ensureModal();
    bindEvents();
    applyActions();

    setTimeout(applyActions, 150);
    setTimeout(applyActions, 500);
    setTimeout(applyActions, 1200);

    console.log("[productos-conjuntos-archive-actions] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("sazzu:page:load", init);
  window.addEventListener("load", init);
})();
