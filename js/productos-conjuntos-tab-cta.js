/* =========================================================
   PRODUCTOS · TAB CONJUNTOS · CTA
   Inserta botón "Crear conjunto de productos" dentro del tab
   y abre DIRECTO el constructor. No abre Productos combinados.
   ========================================================= */
(function () {
  "use strict";

  const CREATE_SET_PARTIAL = "/partials/productos-slide-crear-conjunto.html";

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function ensureToolbar_() {
    const panel = document.getElementById("prodPanelConjuntos");
    if (!panel) return;

    if (panel.querySelector(".prodConjuntosToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "prodConjuntosToolbar";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "prodConjuntosCreateBtn";
    btn.id = "prodConjuntosCreateBtn";
    btn.textContent = "Crear conjunto de productos";

    toolbar.appendChild(btn);

    const tableCard = panel.querySelector(".prodSetsTableCard");
    if (tableCard) {
      panel.insertBefore(toolbar, tableCard);
    } else {
      panel.insertBefore(toolbar, panel.firstElementChild || null);
    }

    btn.addEventListener("click", openCreateSetFlow_);
  }

  function openCreateSetFlow_() {
    const overlay = document.getElementById("prodSlideOverlay");
    const panel = document.getElementById("prodSlidePanel");
    const content = document.getElementById("prodSlideContent");
    const titleEl = document.getElementById("prodSlideTitle");
    const subSlide = document.getElementById("prodSubSlide");
    const subContent = document.getElementById("prodSubSlideContent");

    if (!overlay || !panel || !content) return;

    if (typeof ProductosUiState !== "undefined") {
      ProductosUiState.mainSlideReqId++;
      ProductosUiState.subSlideReqId++;
      ProductosUiState.mainSlideLoading = false;
      ProductosUiState.subSlideLoading = false;
    }

    panel.classList.remove("is-subslide-open");
    panel.setAttribute("data-main-layout", "create-set-direct");
    panel.setAttribute("data-slide-kind", "create-set-direct");

    if (titleEl) titleEl.textContent = "Crear conjunto de productos";

    if (subSlide) {
      subSlide.classList.remove("is-active");
      subSlide.setAttribute("aria-hidden", "true");
    }

    if (subContent) subContent.innerHTML = "";

    content.innerHTML = `<div class="prodSlideLoading">Cargando constructor...</div>`;

    overlay.classList.add("is-active");
    panel.classList.add("is-active");
    panel.setAttribute("aria-hidden", "false");

    fetch(CREATE_SET_PARTIAL + "?_t=" + Date.now())
      .then((res) => res.text())
      .then((html) => {
        content.innerHTML = html;

        requestAnimationFrame(() => {
          try {
            if (typeof initProductosSetBuilder_ === "function") {
              initProductosSetBuilder_();
            }
          } catch (err) {
            console.warn("[productos-conjuntos-tab-cta] Error inicializando constructor", err);
          }
        });
      })
      .catch(() => {
        content.innerHTML = `<div class="prodSlideLoading">Error cargando el constructor de conjuntos.</div>`;
      });
  }

  function init_() {
    if (!isProductosPage_()) return;
    ensureToolbar_();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_);
  } else {
    init_();
  }

  document.addEventListener("sazzu:page:load", init_);
  window.addEventListener("load", init_);
})();
