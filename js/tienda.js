// Protocol Data · Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  const TAB_META = {
    identity: "Identidad",
    theme: "Diseño",
    sections: "Secciones",
    products: "Productos",
    offers: "Combos",
    checkout: "Checkout",
    publish: "Publicación"
  };

  function initTiendaBuilder_() {
    const root = document.querySelector(".storeBuilderShell");
    if (!root || root.dataset.ready === "1") return;

    root.dataset.ready = "1";

    const tabTriggers = Array.from(root.querySelectorAll("[data-store-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-store-builder-panel]"));
    const inspector = root.querySelector(".storeBuilderInspector");
    const editorTitle = root.querySelector("[data-editor-title]");
    const tabsTrack = root.querySelector("[data-store-builder-tabs-track]");
    const storeNameInput = root.querySelector("[data-preview-store-name]");
    const storeDescriptionInput = root.querySelector("[data-preview-store-description]");
    const previewName = root.querySelector("[data-store-preview-name]");
    const previewDescription = root.querySelector("[data-store-preview-description]");
    let tabsPage = 0;

    function activateTab_(tabName) {
      tabTriggers.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.storeBuilderTab === tabName);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.storeBuilderPanel === tabName);
      });

      if (editorTitle) editorTitle.textContent = TAB_META[tabName] || "Editor";
      if (inspector) inspector.classList.add("is-mobile-open");
    }

    function shiftTabs_(direction) {
      if (!tabsTrack) return;
      const maxPage = 2;
      tabsPage = Math.max(0, Math.min(maxPage, tabsPage + direction));
      tabsTrack.style.transform = `translateX(-${tabsPage * 100}%)`;
    }

    tabTriggers.forEach((item) => {
      item.addEventListener("click", () => activateTab_(item.dataset.storeBuilderTab));
    });

    root.querySelectorAll("[data-tabs-shift]").forEach((button) => {
      button.addEventListener("click", () => {
        shiftTabs_(button.dataset.tabsShift === "right" ? 1 : -1);
      });
    });

    root.querySelectorAll("[data-toggle-tool-card]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-tool-card]");
        if (!card) return;
        card.classList.toggle("is-open");
      });
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

    activateTab_("identity");
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();
