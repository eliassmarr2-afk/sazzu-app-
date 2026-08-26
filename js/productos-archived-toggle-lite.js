/* PRODUCTOS · archivados toggle lite · sin observers */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_ARCHIVED_TOGGLE_LITE_2026_07_07_01";

  const state = {
    resumen: false,
    ofertas: false,
    conjuntos: false
  };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function isArchived(value) {
    return clean(value).toLowerCase() === "archived";
  }

  function icon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 4h6m-8 4h10m-9 0 .7 11.2c.1 1.1.9 1.8 2 1.8h2.6c1.1 0 1.9-.7 2-1.8L16 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  function ensureStyle() {
    if (document.getElementById("productosArchivedToggleLiteCss")) return;

    const style = document.createElement("style");
    style.id = "productosArchivedToggleLiteCss";
    style.textContent = `
      .prodArchivedLiteHost {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .prodArchivedLiteHost .prodTableTopbar__left,
      .prodArchivedLiteHost .prodOffersTableCard__title,
      .prodArchivedLiteHost .prodSetsTableCard__title {
        order: 1;
      }

      .prodArchivedLiteHost .prodArchivedLiteBtn {
        order: 2;
        margin-left: auto;
      }

      .prodArchivedLiteHost .prodTableTopbar__note,
      .prodArchivedLiteHost .prodOffersTableCard__note,
      .prodArchivedLiteHost .prodSetsTableCard__note {
        order: 3;
      }

      .prodArchivedLiteBtn {
        appearance: none;
        position: static;
        z-index: 1;
        min-height: 30px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 10px;
        border-radius: 5px;
        border: 1px solid rgba(255,82,82,.34);
        background: rgba(255,82,82,.13);
        color: #ff9a9a;
        cursor: pointer;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: .02em;
        flex: 0 0 auto;
      }

      .prodArchivedLiteBtn svg {
        width: 14px;
        height: 14px;
      }

      .prodArchivedLiteBtn.is-active {
        background: rgba(255,82,82,.28);
        border-color: rgba(255,82,82,.70);
        color: #ffd1d1;
      }

      .prodArchivedLiteBtn__count {
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.10);
        font-size: 10px;
        font-weight: 900;
      }

      #prodPanelResumen.prodArchivedLiteClean #prodResumenTableBody tr.is-sku-archived {
        display: none !important;
      }

      #prodPanelResumen.prodArchivedLiteOnly #prodResumenTableBody tr[data-product-sku]:not(.is-sku-archived) {
        display: none !important;
      }

      #prodPanelOfertas.prodArchivedLiteClean #prodOffersTableBody tr.is-offer-archived {
        display: none !important;
      }

      #prodPanelOfertas.prodArchivedLiteOnly #prodOffersTableBody tr[data-commercial-offer-id]:not(.is-offer-archived) {
        display: none !important;
      }

      #prodPanelConjuntos.prodArchivedLiteClean #prodSetsTableBody tr.prodSetsRow--main.is-set-archived,
      #prodPanelConjuntos.prodArchivedLiteClean #prodSetsTableBody tr.prodSetsRow--main.is-set-archived + tr.prodSetsRow--detail {
        display: none !important;
      }

      #prodPanelConjuntos.prodArchivedLiteOnly #prodSetsTableBody tr.prodSetsRow--main:not(.is-set-archived),
      #prodPanelConjuntos.prodArchivedLiteOnly #prodSetsTableBody tr.prodSetsRow--main:not(.is-set-archived) + tr.prodSetsRow--detail {
        display: none !important;
      }

      .prodSkuArchivedLiteBadge {
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

      #prodResumenTableBody tr.is-sku-archived .prodArchiveSkuBtn {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function readState() {
    return window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__ || {};
  }

  function skuItems() {
    const rs = readState();
    return Array.isArray(rs.skus) ? rs.skus : [];
  }

  function offerItems() {
    const payload = window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ || {};
    return Array.isArray(payload.items) ? payload.items : [];
  }

  function setItems() {
    const rs = readState();
    if (Array.isArray(rs.sets)) return rs.sets;

    const payload = window.__PRODUCTOS_PANEL_SUPABASE_BOOTSTRAP__ || {};
    const offers = payload.offers || {};
    return Array.isArray(offers.items) ? offers.items : [];
  }

  function mapBy(items, keyGetter) {
    const map = new Map();
    (items || []).forEach(function (item) {
      const key = clean(keyGetter(item));
      if (key) map.set(key, item);
    });
    return map;
  }

  function markSkus() {
    const tbody = document.getElementById("prodResumenTableBody");
    if (!tbody) return 0;

    const bySku = mapBy(skuItems(), item => item && item.sku);
    let count = 0;

    tbody.querySelectorAll("tr[data-product-sku]").forEach(function (row) {
      const sku = clean(row.getAttribute("data-product-sku"));
      const item = bySku.get(sku);
      const archived = isArchived(item && item.estado);

      row.classList.toggle("is-sku-archived", archived);

      if (archived) {
        count += 1;

        const cells = row.children || [];
        const statusCell = cells.length >= 2 ? cells[cells.length - 2] : null;

        if (statusCell && !statusCell.querySelector(".prodSkuArchivedLiteBadge")) {
          statusCell.insertAdjacentHTML(
            "beforeend",
            '<br><span class="prodSkuArchivedLiteBadge">Archivado</span>'
          );
        }
      }
    });

    return count;
  }

  function markOffers() {
    const tbody = document.getElementById("prodOffersTableBody");
    if (!tbody) return 0;

    const byId = mapBy(offerItems(), item => item && item.commercial_offer_id);
    let count = 0;

    tbody.querySelectorAll("tr[data-commercial-offer-id]").forEach(function (row) {
      const id = clean(row.getAttribute("data-commercial-offer-id"));
      const item = byId.get(id);
      const archived = row.classList.contains("is-offer-archived") || isArchived(item && item.estado_oferta);

      row.classList.toggle("is-offer-archived", archived);
      if (archived) count += 1;
    });

    return count;
  }

  function markSets() {
    const tbody = document.getElementById("prodSetsTableBody");
    if (!tbody) return 0;

    const sets = setItems();
    const byId = mapBy(sets, item => item && item.offer_set_id);
    const rows = Array.from(tbody.querySelectorAll("tr.prodSetsRow--main"));

    let count = 0;

    rows.forEach(function (row, index) {
      const id = clean(row.getAttribute("data-offer-set-id"));
      const item = id ? byId.get(id) : sets[index];
      const archived = row.classList.contains("is-set-archived") || isArchived(item && item.estado);

      row.classList.toggle("is-set-archived", archived);
      if (archived) count += 1;
    });

    return count;
  }

  function ensureButton(hostSelector, target, count) {
    const host = document.querySelector(hostSelector);
    if (!host) return;

    host.classList.add("prodArchivedLiteHost");

    let btn = host.querySelector(`[data-prod-archived-lite="${target}"]`);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prodArchivedLiteBtn";
      btn.setAttribute("data-prod-archived-lite", target);
      btn.title = "Ver archivados";
      host.appendChild(btn);
    }

    btn.classList.toggle("is-active", !!state[target]);
    btn.setAttribute("aria-pressed", state[target] ? "true" : "false");

    btn.innerHTML = `
      ${icon()}
      <span>Archivados</span>
      <span class="prodArchivedLiteBtn__count">${Number(count || 0)}</span>
    `;
  }

  function setPanelMode(panelId, active) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.classList.toggle("prodArchivedLiteClean", !active);
    panel.classList.toggle("prodArchivedLiteOnly", !!active);
  }

  function apply() {
    ensureStyle();

    const skuCount = markSkus();
    const offerCount = markOffers();
    const setCount = markSets();

    ensureButton("#prodPanelResumen .prodTableTopbar", "resumen", skuCount);
    ensureButton("#prodPanelOfertas .prodOffersTableCard__topbar", "ofertas", offerCount);
    ensureButton("#prodPanelConjuntos .prodSetsTableCard__topbar", "conjuntos", setCount);

    setPanelMode("prodPanelResumen", state.resumen);
    setPanelMode("prodPanelOfertas", state.ofertas);
    setPanelMode("prodPanelConjuntos", state.conjuntos);
  }

  function bind() {
    if (window.__PRODUCTOS_ARCHIVED_TOGGLE_LITE_BOUND__ === true) return;
    window.__PRODUCTOS_ARCHIVED_TOGGLE_LITE_BOUND__ = true;

    document.addEventListener("click", function (event) {
      const btn = event.target && event.target.closest
        ? event.target.closest("[data-prod-archived-lite]")
        : null;

      if (btn) {
        event.preventDefault();
        event.stopPropagation();

        const target = clean(btn.getAttribute("data-prod-archived-lite"));
        if (!Object.prototype.hasOwnProperty.call(state, target)) return;

        state[target] = !state[target];
        apply();
        return;
      }

      if (event.target && event.target.closest && event.target.closest(".prodTab")) {
        setTimeout(apply, 80);
        setTimeout(apply, 250);
      }
    }, true);
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    bind();
    apply();

    setTimeout(apply, 150);
    setTimeout(apply, 500);
    setTimeout(apply, 1200);
    setTimeout(apply, 2500);

    console.log("[productos-archived-toggle-lite] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("sazzu:page:load", init);
  window.addEventListener("load", init);
})();
