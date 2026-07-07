/* PRODUCTOS · OFERTAS · badge de archivado */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_OFERTAS_ARCHIVED_BADGE_2026_07_07_01";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function items() {
    const payload = window.__PRODUCTOS_PANEL_SUPABASE_COMMERCIAL_OFFERS__ || {};
    return Array.isArray(payload.items) ? payload.items : [];
  }

  function findOffer(id) {
    const offerId = clean(id);
    if (!offerId) return null;

    return items().find(function (item) {
      return clean(item && item.commercial_offer_id) === offerId;
    }) || null;
  }

  function isArchived(offer) {
    return clean(offer && offer.estado_oferta).toLowerCase() === "archived";
  }

  function ensureStyle() {
    if (document.getElementById("prodOfferArchivedBadgeHelperCss")) return;

    const style = document.createElement("style");
    style.id = "prodOfferArchivedBadgeHelperCss";
    style.textContent = `
      .prodOfferArchivedBadge {
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

      #prodOffersTableBody tr.is-offer-archived {
        opacity: .72;
      }

      #prodOffersTableBody tr.is-offer-archived .prodOfferArchiveBtn {
        display: none !important;
      }

      #prodOffersTableBody tr.is-offer-archived .prodOfferArchiveActionCell::before {
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
    `;

    document.head.appendChild(style);
  }

  function applyBadges() {
    const tbody = document.getElementById("prodOffersTableBody");
    if (!tbody) return;

    ensureStyle();

    tbody.querySelectorAll("tr[data-commercial-offer-id]").forEach(function (row) {
      const offer = findOffer(row.getAttribute("data-commercial-offer-id"));
      if (!isArchived(offer)) return;

      row.classList.add("is-offer-archived");

      const offerCell = row.children && row.children[2] ? row.children[2] : null;
      if (offerCell && !offerCell.querySelector(".prodOfferArchivedBadge")) {
        offerCell.insertAdjacentHTML(
          "beforeend",
          '<br><span class="prodOfferArchivedBadge">Archivado</span>'
        );
      }
    });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    applyBadges();

    setTimeout(applyBadges, 150);
    setTimeout(applyBadges, 500);
    setTimeout(applyBadges, 1200);

    console.log("[productos-ofertas-archived-badge] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  const observer = new MutationObserver(applyBadges);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("sazzu:page:load", init);
  window.addEventListener("load", init);
})();
