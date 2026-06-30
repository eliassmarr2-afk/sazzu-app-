console.log("[pedidos-dark-mode.js] cargado OK");

(function () {
  const BUILD = "PEDIDOS_DARK_MODE_2026_06_30_02";
  const STORAGE_KEY = "sazzu_pedidos_dark_mode";
  const STYLE_ID = "pedidosPanelStylesheet";
  const STYLE_HREF = "/css/pedidos-panel.css?v=20260630_01";
  const SIDEBAR_STYLE_ID = "pedidosSidebarDarkStylesheet";
  const SIDEBAR_STYLE_HREF = "/css/pedidos-sidebar-dark.css?v=20260630_01";
  const TOGGLE_ID = "ordersThemeToggle";

  const icons = {
    moon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z"/>
      </svg>
    `,
    sun: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 2.75v2M12 19.25v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.75 12h2M19.25 12h2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41"/>
      </svg>
    `
  };

  function isPedidosPage() {
    const page = String(document.body && document.body.getAttribute("data-page") || "").toLowerCase();
    const file = String(location.pathname.split("/").pop() || "").toLowerCase();
    return page === "pedidos" || file === "pedidos.html";
  }

  function ensureLink(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensurePanelStyles() {
    ensureLink(STYLE_ID, STYLE_HREF);
    ensureLink(SIDEBAR_STYLE_ID, SIDEBAR_STYLE_HREF);
  }

  function readPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function savePreference(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch (e) {}
  }

  function getToggle() {
    return document.getElementById(TOGGLE_ID);
  }

  function updateToggle(enabled) {
    const btn = getToggle();
    if (!btn) return;
    btn.innerHTML = enabled ? icons.sun : icons.moon;
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    btn.setAttribute("title", enabled ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    btn.setAttribute("aria-label", enabled ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  }

  function applyTheme(enabled, persist) {
    if (!document.body) return;
    document.body.classList.toggle("pedidos-dark", !!enabled);
    document.documentElement.classList.toggle("pedidos-dark", !!enabled);
    updateToggle(!!enabled);
    if (persist) savePreference(!!enabled);
  }

  function cleanupPedidosArtifacts() {
    if (!document.body) return;
    document.body.classList.remove("pedidos-dark", "ordersSlideLock");
    document.documentElement.classList.remove("pedidos-dark", "ordersSlideLock");

    const slide = document.getElementById("ordersDetailSlide");
    if (slide) {
      slide.classList.remove("is-open");
      slide.setAttribute("aria-hidden", "true");
    }

    const btn = getToggle();
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }

  function ensureToggle() {
    if (!isPedidosPage()) return null;

    let btn = getToggle();
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = TOGGLE_ID;
    btn.className = "ordersThemeToggle";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");

    btn.addEventListener("click", () => {
      const next = !document.body.classList.contains("pedidos-dark");
      applyTheme(next, true);
    });

    const headerRight = document.querySelector(".ordersHeader__right") || document.querySelector(".appHeader__right");
    const connection = document.getElementById("ordersConnectionBadge");

    if (headerRight && connection && connection.parentNode === headerRight) {
      headerRight.insertBefore(btn, connection);
    } else if (headerRight) {
      headerRight.insertBefore(btn, headerRight.firstChild);
    }

    updateToggle(document.body.classList.contains("pedidos-dark"));
    return btn;
  }

  function hydrateRows() {
    if (!isPedidosPage()) return;

    document.querySelectorAll(".ordersTable tbody tr").forEach((row) => {
      if (row.dataset.ordersRowHydrated === "1") return;

      const btn = row.querySelector("[data-order-detail]");
      const tracking = btn ? btn.getAttribute("data-order-detail") : "";
      if (!tracking) return;

      row.dataset.ordersRowHydrated = "1";
      row.dataset.orderDetailRow = tracking;
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute("aria-label", "Abrir detalle del pedido " + tracking);
    });
  }

  function openRow(row) {
    if (!row) return;
    const btn = row.querySelector("[data-order-detail]");
    if (!btn) return;
    btn.click();
  }

  function wireRowDelegation() {
    if (window.__pedidosRowDelegationWired) return;
    window.__pedidosRowDelegationWired = true;

    document.addEventListener("click", (ev) => {
      if (!isPedidosPage()) return;
      const target = ev.target;
      if (!target || !target.closest) return;
      if (target.closest("button, a, input, select, textarea, label")) return;
      const row = target.closest(".ordersTable tbody tr[data-order-detail-row]");
      if (!row) return;
      openRow(row);
    });

    document.addEventListener("keydown", (ev) => {
      if (!isPedidosPage()) return;
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const target = ev.target;
      if (!target || !target.closest) return;
      const row = target.closest(".ordersTable tbody tr[data-order-detail-row]");
      if (!row) return;
      ev.preventDefault();
      openRow(row);
    });
  }

  function observeRows() {
    const list = document.getElementById("ordersList");
    if (!list || list.dataset.pedidosRowsObserved === "1") return;

    list.dataset.pedidosRowsObserved = "1";
    const observer = new MutationObserver(() => {
      window.setTimeout(hydrateRows, 0);
    });
    observer.observe(list, { childList: true, subtree: true });
    hydrateRows();
  }

  function init() {
    if (!isPedidosPage()) {
      cleanupPedidosArtifacts();
      return;
    }

    ensurePanelStyles();
    ensureToggle();
    applyTheme(readPreference(), false);
    wireRowDelegation();
    observeRows();
    hydrateRows();
  }

  document.addEventListener("sazzu:page:load", () => window.setTimeout(init, 0));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    window.setTimeout(init, 0);
  }

  window.pedidosDarkMode = {
    init,
    cleanup: cleanupPedidosArtifacts,
    enable: function () { applyTheme(true, true); },
    disable: function () { applyTheme(false, true); },
    toggle: function () { applyTheme(!document.body.classList.contains("pedidos-dark"), true); },
    build: BUILD
  };
})();
