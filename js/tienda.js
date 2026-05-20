// Protocol Data · Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  function initTiendaBuilder_() {
    const root = document.querySelector(".tiendaBuilderSandbox");
    if (!root || root.dataset.ready === "1") return;

    root.dataset.ready = "1";

    const tabs = Array.from(root.querySelectorAll("[data-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-builder-panel]"));

    function activateTab_(tabName) {
      tabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.builderTab === tabName);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.builderPanel === tabName);
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab_(tab.dataset.builderTab));
    });

    activateTab_("identity");
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();
