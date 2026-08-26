(function () {
  const SECTIONS = Object.freeze({
    inicio: {
      title: "Inicio",
      subtitle: "Control operativo",
    },
    consignaciones: {
      title: "Consignaciones",
      subtitle: "Briefs, revisiones y participación",
    },
    entregas: {
      title: "Entregas",
      subtitle: "Inventario creativo entrante",
    },
    revision: {
      title: "Revisión",
      subtitle: "Evaluación creativa y derechos",
    },
    negociaciones: {
      title: "Negociaciones",
      subtitle: "Conversaciones y ofertas",
    },
    compras: {
      title: "Compras y pagos",
      subtitle: "Adquisiciones, payables y payouts",
    },
    biblioteca: {
      title: "Biblioteca",
      subtitle: "Activos adquiridos y Rights activos",
    },
    creadores: {
      title: "Creadores",
      subtitle: "Red operativa de Creators",
    },
    incidencias: {
      title: "Incidencias",
      subtitle: "Expedientes, holds y resolución",
    },
  });

  function currentSection() {
    const hash = String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase();

    return Object.prototype.hasOwnProperty.call(SECTIONS, hash)
      ? hash
      : "inicio";
  }

  function syncShell() {
    const root = document.querySelector("[data-ci-shell]");
    if (!root) return;

    const section = currentSection();
    const meta = SECTIONS[section];

    root.querySelectorAll("[data-ci-section]").forEach((button) => {
      const active = button.dataset.ciSection === section;

      button.classList.toggle("is-active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const title = root.querySelector("[data-ci-current-title]");
    const subtitle = root.querySelector("[data-ci-current-subtitle]");

    if (title) title.textContent = meta.title;
    if (subtitle) subtitle.textContent = meta.subtitle;

    document.title = `${meta.title} · Creative Insights · Protocol Data`;
  }

  function navigate(section) {
    if (!Object.prototype.hasOwnProperty.call(SECTIONS, section)) return;

    const nextUrl =
      `${location.pathname}${location.search}#${encodeURIComponent(section)}`;

    history.replaceState(history.state, "", nextUrl);
    syncShell();

    // replaceState no dispara hashchange por sí solo.
    // Lo emitimos para que las vistas operativas repinten
    // su contenido al cambiar de sección desde el sub-sidebar.
    window.dispatchEvent(new Event("hashchange"));
  }

  if (!window.__protocolCreativeInsightsShellBound) {
    window.__protocolCreativeInsightsShellBound = true;

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ci-section]");
      if (!button) return;

      const root = button.closest("[data-ci-shell]");
      if (!root) return;

      navigate(button.dataset.ciSection || "inicio");
    });

    window.addEventListener("hashchange", syncShell);

    document.addEventListener("sazzu:page:load", syncShell);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", syncShell, { once:true });
    } else {
      syncShell();
    }
  } else {
    syncShell();
  }
})();
