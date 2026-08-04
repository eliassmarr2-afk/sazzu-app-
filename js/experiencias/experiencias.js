/* ============================================================
   Protocol Data · Experiencias postcompra
   Interacciones del esqueleto visual · sin datos reales
   ============================================================ */

(function () {
  "use strict";

  const PAGE_EVENT = "sazzu:page:load";

  function getRoot_() {
    return document.getElementById("experienciasPage");
  }

  function setActiveTab_(root, target) {
    if (!root || !target) return;

    root.querySelectorAll("[data-exp-tab]").forEach((button) => {
      const isActive = button.getAttribute("data-exp-tab") === target;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    root.querySelectorAll("[data-exp-panel]").forEach((panel) => {
      const isActive = panel.getAttribute("data-exp-panel") === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  function updateEmptyState_(root) {
    const search = root.querySelector("[data-exp-search]");
    const activeFilter = root.querySelector("[data-exp-filter].is-active");
    const title = root.querySelector("[data-exp-empty-title]");
    const copy = root.querySelector("[data-exp-empty-copy]");

    if (!title || !copy) return;

    const query = String(search?.value || "").trim();
    const filter = activeFilter?.getAttribute("data-exp-filter") || "all";

    if (query) {
      title.textContent = `Sin resultados para “${query}”`;
      copy.textContent = "Cuando conectemos la lectura real, la búsqueda abarcará pedido, cliente, correo y producto.";
      return;
    }

    if (filter !== "all") {
      const labels = {
        scheduled: "programadas",
        sent: "enviadas",
        opened: "abiertas",
        submitted: "respondidas",
        error: "con error"
      };

      title.textContent = `No hay experiencias ${labels[filter] || "para este filtro"}`;
      copy.textContent = "El filtro ya está preparado y comenzará a operar cuando conectemos Supabase.";
      return;
    }

    title.textContent = "Todavía no hay experiencias cargadas";
    copy.textContent = "En el próximo bloque conectaremos la lectura multicuentas desde Supabase.";
  }

  function openDrawer_(root) {
    const drawer = root.querySelector("[data-exp-drawer]");
    if (!drawer) return;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("expDrawerOpen");

    const closeButton = drawer.querySelector("[data-exp-close-drawer]");
    if (closeButton instanceof HTMLElement) {
      closeButton.focus({ preventScroll: true });
    }
  }

  function closeDrawer_(root) {
    const drawer = root.querySelector("[data-exp-drawer]");
    if (!drawer) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("expDrawerOpen");
  }

  function init_(root) {
    root = root || getRoot_();
    if (!root || root.dataset.expInitialized === "1") return;

    root.dataset.expInitialized = "1";

    const initialTab = root.querySelector("[data-exp-tab].is-active")?.getAttribute("data-exp-tab") || "resumen";
    setActiveTab_(root, initialTab);

    root.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-exp-tab]");
      if (tab) {
        setActiveTab_(root, tab.getAttribute("data-exp-tab"));
        return;
      }

      const filter = event.target.closest("[data-exp-filter]");
      if (filter) {
        root.querySelectorAll("[data-exp-filter]").forEach((button) => {
          button.classList.toggle("is-active", button === filter);
        });
        updateEmptyState_(root);
        return;
      }

      if (event.target.closest("[data-exp-open-drawer]")) {
        openDrawer_(root);
        return;
      }

      if (event.target.closest("[data-exp-close-drawer]")) {
        closeDrawer_(root);
      }
    });

    const search = root.querySelector("[data-exp-search]");
    if (search) {
      search.addEventListener("input", () => updateEmptyState_(root));
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const drawer = root.querySelector("[data-exp-drawer].is-open");
      if (drawer) closeDrawer_(root);
    });

    updateEmptyState_(root);
  }

  window.ProtocolExperienciasInit = function () {
    init_(getRoot_());
  };

  document.addEventListener("DOMContentLoaded", () => {
    init_(getRoot_());
  });

  document.addEventListener(PAGE_EVENT, () => {
    init_(getRoot_());
  });
})();
