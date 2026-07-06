/* =========================================================
   PRODUCTOS · TAB CONJUNTOS · CTA
   Inserta botón "Crear conjunto de productos" dentro del tab
   y reutiliza el flujo existente del slide/subslide.
   ========================================================= */
   (function () {
    "use strict";
  
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
  
      const firstChild = panel.firstElementChild;
      if (firstChild) {
        panel.insertBefore(toolbar, firstChild);
      } else {
        panel.appendChild(toolbar);
      }
  
      btn.addEventListener("click", openCreateSetFlow_);
    }
  
    function openCreateSetFlow_() {
      if (typeof openProductosSlide_ !== "function") return;
  
      /* Abrimos un slide base y luego disparamos el mismo botón
         existente que abre el sub-slide del constructor */
      openProductosSlide_(
        "Conjuntos de productos",
        "/partials/productos-slide-bundles.html"
      );
  
      const triggerSubslide = () => {
        const headerBtn = document.getElementById("prodSlideCreateSetBtn");
        if (headerBtn) headerBtn.click();
      };
  
      setTimeout(triggerSubslide, 120);
      setTimeout(triggerSubslide, 320);
      setTimeout(triggerSubslide, 620);
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