// Protocol Data · Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  function initTiendaBuilder_() {
    const root = document.querySelector(".storeBuilderShell");
    if (!root || root.dataset.ready === "1") return;

    root.dataset.ready = "1";

    const railItems = Array.from(root.querySelectorAll("[data-store-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-store-builder-panel]"));
    const storeNameInput = root.querySelector("[data-preview-store-name]");
    const storeDescriptionInput = root.querySelector("[data-preview-store-description]");
    const previewName = root.querySelector("[data-store-preview-name]");
    const previewDescription = root.querySelector("[data-store-preview-description]");

    function activateTab_(tabName) {
      railItems.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.storeBuilderTab === tabName);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.storeBuilderPanel === tabName);
      });
    }

    railItems.forEach((item) => {
      item.addEventListener("click", () => activateTab_(item.dataset.storeBuilderTab));
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
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();
