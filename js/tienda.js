// Protocol Data - Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  function initTiendaBuilder_() {
    const root = document.querySelector(".tiendaBuilderSandbox");
    if (!root || root.dataset.ready === "1") return;

    root.dataset.ready = "1";

    const tabs = Array.from(root.querySelectorAll("[data-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-builder-panel]"));
    const sidePanel = root.querySelector(".builderSidePanel");
    const editor = root.querySelector("[data-builder-inner-editor]");
    const nameInput = root.querySelector("[data-store-name-input]");
    const nameTargets = Array.from(root.querySelectorAll("[data-store-name-preview-small], [data-store-name-preview-title], [data-store-name-preview-row]"));

    function activateTab_(tabName) {
      tabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.builderTab === tabName);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.builderPanel === tabName);
      });
    }

    function syncStoreName_() {
      const value = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Nombre de tienda";
      nameTargets.forEach((target) => {
        target.textContent = value;
      });
    }

    function openEditor_() {
      if (!sidePanel) return;
      sidePanel.classList.add("is-editing");
      if (editor) editor.setAttribute("aria-hidden", "false");
      setTimeout(() => {
        if (nameInput) nameInput.focus();
      }, 220);
    }

    function closeEditor_() {
      if (!sidePanel) return;
      sidePanel.classList.remove("is-editing");
      if (editor) editor.setAttribute("aria-hidden", "true");
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab_(tab.dataset.builderTab));
    });

    root.querySelectorAll("[data-builder-open-editor]").forEach((button) => {
      button.addEventListener("click", openEditor_);
    });

    root.querySelectorAll("[data-builder-editor-back]").forEach((button) => {
      button.addEventListener("click", closeEditor_);
    });

    root.querySelectorAll("[data-builder-editor-save]").forEach((button) => {
      button.addEventListener("click", () => {
        syncStoreName_();
        closeEditor_();
      });
    });

    if (nameInput) nameInput.addEventListener("input", syncStoreName_);

    activateTab_("identity");
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();
