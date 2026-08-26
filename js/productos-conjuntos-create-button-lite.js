/* PRODUCTOS · CONJUNTOS · botón crear conjunto en tab */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_CONJUNTOS_CREATE_BUTTON_LITE_2026_07_08_01";

  function branchIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 18V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M6 9h5.5c2.5 0 4.5-2 4.5-4.5V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M6 15h5.5c2.5 0 4.5 2 4.5 4.5V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="16" cy="4" r="2" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="16" cy="20" r="2" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `;
  }

  function ensureStyle() {
    if (document.getElementById("prodSetsCreateButtonLiteCss")) return;

    const style = document.createElement("style");
    style.id = "prodSetsCreateButtonLiteCss";
    style.textContent = `
      #prodPanelConjuntos .prodSetsTableCard__topbar {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #prodPanelConjuntos .prodSetsTableCard__title {
        order: 1;
      }

      .prodSetsCreateLiteBtn {
        appearance: none;
        order: 2;
        margin-left: auto;
        min-height: 30px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 10px;
        border-radius: 5px;
        border: 1px solid rgba(36,121,255,.48);
        background: rgba(36,121,255,.14);
        color: #8fb8ff;
        cursor: pointer;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: .02em;
        flex: 0 0 auto;
      }

      .prodSetsCreateLiteBtn svg {
        width: 15px;
        height: 15px;
        flex: 0 0 auto;
      }

      .prodSetsCreateLiteBtn:hover,
      .prodSetsCreateLiteBtn:focus-visible {
        background: rgba(36,121,255,.22);
        border-color: rgba(36,121,255,.68);
        color: #b7d1ff;
        outline: none;
      }

      #prodPanelConjuntos .prodArchivedLiteBtn {
        order: 3;
        margin-left: 0;
      }

      #prodPanelConjuntos .prodSetsTableCard__note {
        order: 4;
      }
    `;

    document.head.appendChild(style);
  }

  function openCreateSetSlide() {
    try {
      if (typeof openProductosSlide_ !== "function") {
        console.warn("[productos-conjuntos-create-button-lite] No se encontró openProductosSlide_.");
        return;
      }

      openProductosSlide_(
        "Crear conjunto de productos",
        "/partials/productos-slide-crear-conjunto.html"
      );

      const initBuilder = function () {
        try {
          if (typeof initProductosSetBuilder_ === "function") {
            initProductosSetBuilder_();
          }
        } catch (err) {
          console.warn("[productos-conjuntos-create-button-lite] No se pudo inicializar constructor de conjunto", err);
        }
      };

      setTimeout(initBuilder, 250);
      setTimeout(initBuilder, 650);
      setTimeout(initBuilder, 1200);
    } catch (err) {
      console.warn("[productos-conjuntos-create-button-lite] No se pudo abrir creación de conjunto", err);
    }
  }

  function ensureButton() {
    const topbar = document.querySelector("#prodPanelConjuntos .prodSetsTableCard__topbar");
    if (!topbar) return;

    ensureStyle();

    let btn = document.getElementById("prodSetsCreateLiteBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "prodSetsCreateLiteBtn";
      btn.className = "prodSetsCreateLiteBtn";
      btn.setAttribute("aria-label", "Crear conjunto de productos");
      btn.title = "Crear conjunto de productos";
      btn.innerHTML = `${branchIcon()}<span>Crear conjunto</span>`;

      const archivedBtn = topbar.querySelector(".prodArchivedLiteBtn");
      if (archivedBtn) topbar.insertBefore(btn, archivedBtn);
      else topbar.appendChild(btn);
    }

    if (btn.dataset.bound !== "1") {
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openCreateSetSlide();
      });
    }
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    ensureButton();

    setTimeout(ensureButton, 150);
    setTimeout(ensureButton, 500);
    setTimeout(ensureButton, 1200);

    console.log("[productos-conjuntos-create-button-lite] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("sazzu:page:load", init);
  window.addEventListener("load", init);

  document.addEventListener("click", function (event) {
    if (event.target && event.target.closest && event.target.closest("#prodTabConjuntos, .prodTab")) {
      setTimeout(ensureButton, 120);
      setTimeout(ensureButton, 420);
    }
  }, true);
})();
