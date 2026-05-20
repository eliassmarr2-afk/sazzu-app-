// Protocol Data · Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  const SLIDE_META = {
    identity: {
      kicker: "store_config",
      title: "Identidad",
      description: "Editá nombre, rubro, portada, logo y descripción visible de la tienda."
    },
    theme: {
      kicker: "theme_tokens",
      title: "Diseño",
      description: "Elegí presets visuales controlados para mantener una tienda prolija y vendible."
    },
    sections: {
      kicker: "store_sections",
      title: "Secciones",
      description: "Activá, ocultá y ordená secciones predeterminadas sin romper la estructura."
    },
    products: {
      kicker: "products",
      title: "Productos",
      description: "Catálogo, imágenes, stock, precios, badges y upsells asociados."
    },
    offers: {
      kicker: "offers",
      title: "Combos",
      description: "Ofertas, componentes incluidos, agregados opcionales y estructuras de ticket promedio."
    },
    checkout: {
      kicker: "checkout_settings",
      title: "Checkout",
      description: "Pago, pedido mínimo, campos requeridos y futuras zonas de envío."
    },
    publish: {
      kicker: "stores",
      title: "Publicación",
      description: "Estado de tienda, URL pública, UTM, login comprador e integraciones."
    }
  };

  function initTiendaBuilder_() {
    const root = document.querySelector(".storeBuilderShell");
    if (!root || root.dataset.ready === "1") return;

    root.dataset.ready = "1";

    const railItems = Array.from(root.querySelectorAll("[data-store-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-store-builder-panel]"));
    const slide = root.querySelector("[data-store-builder-slide]");
    const storeNameInput = root.querySelector("[data-preview-store-name]");
    const storeDescriptionInput = root.querySelector("[data-preview-store-description]");
    const previewName = root.querySelector("[data-store-preview-name]");
    const previewDescription = root.querySelector("[data-store-preview-description]");
    const slideKicker = root.querySelector("[data-slide-kicker]");
    const slideTitle = root.querySelector("[data-slide-title]");
    const slideDescription = root.querySelector("[data-slide-description]");

    function activateTab_(tabName, shouldOpenSlide) {
      const meta = SLIDE_META[tabName] || SLIDE_META.identity;

      railItems.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.storeBuilderTab === tabName);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.storeBuilderPanel === tabName);
      });

      if (slideKicker) slideKicker.textContent = meta.kicker;
      if (slideTitle) slideTitle.textContent = meta.title;
      if (slideDescription) slideDescription.textContent = meta.description;

      if (shouldOpenSlide) openSlide_();
    }

    function openSlide_() {
      if (!slide) return;
      slide.classList.add("is-open");
      slide.setAttribute("aria-hidden", "false");
      document.body.classList.add("store-builder-slide-open");
    }

    function closeSlide_() {
      if (!slide) return;
      slide.classList.remove("is-open");
      slide.setAttribute("aria-hidden", "true");
      document.body.classList.remove("store-builder-slide-open");
    }

    railItems.forEach((item) => {
      item.addEventListener("click", () => activateTab_(item.dataset.storeBuilderTab, true));
    });

    root.querySelectorAll("[data-open-store-panel]").forEach((button) => {
      button.addEventListener("click", () => activateTab_(button.dataset.openStorePanel, true));
    });

    root.querySelectorAll("[data-close-store-slide]").forEach((button) => {
      button.addEventListener("click", closeSlide_);
    });

    root.querySelectorAll("[data-save-store-slide]").forEach((button) => {
      button.addEventListener("click", closeSlide_);
    });

    if (storeNameInput && previewName) {
      storeNameInput.addEventListener("input", () => {
        previewName.textContent = storeNameInput.value.trim() || "Nombre de tienda";
      });
    }

    if (storeDescriptionInput && previewDescription) {
      storeDescriptionInput.addEventListener("input", () => {
        previewDescription.textContent = storeDescriptionInput.value.trim() || "Descripción corta de la tienda.";
      });
    }

    activateTab_("identity", false);
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();
