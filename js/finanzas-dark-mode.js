console.log("[finanzas-dark-mode.js] cargado OK");

(function () {
  const BUILD = "FINANCE_DARK_MODE_2026_06_30_02";
  const STORAGE_KEY = "sazzu_finanzas_dark_mode";
  const STYLE_ID = "finanzasDarkStylesheet";
  const STYLE_HREF = "/css/finanzas-dark.css?v=20260630_02";
  const TOGGLE_ID = "finThemeToggle";

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

  function isFinancePage() {
    const page = String(document.body && document.body.getAttribute("data-page") || "").toLowerCase();
    const file = String(location.pathname.split("/").pop() || "").toLowerCase();
    return page === "finanzas" || file === "finanzas.html";
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
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

  function cleanupFinanceArtifacts() {
    if (!document.body) return;

    document.body.classList.remove(
      "finanzas-dark",
      "finOrderDetailOpen",
      "finRuleEditorOpen",
      "finFinancialOpen",
      "finStockOpen",
      "finAlertsOpen",
      "finConfirmModalOpen"
    );
    document.documentElement.classList.remove("finanzas-dark");

    const staleSelectors = [
      "#finOrderDetailOverlay",
      "#finRuleEditorOverlay",
      "#finFinancialOverlay",
      "#finStockOverlay",
      "#finAlertsOverlay",
      "#finConfirmModal",
      ".finOrderDetailOverlay",
      ".finRuleEditorOverlay",
      ".finFinancialOverlay",
      ".finStockOverlay",
      ".finAlertsOverlay",
      ".finConfirmModal",
      "[id^='fin'][id$='Overlay']",
      "[class^='fin'][class$='Overlay']"
    ];

    document.querySelectorAll(staleSelectors.join(",")).forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });

    const btn = getToggle();
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
  }

  function applyTheme(enabled, persist) {
    if (!document.body) return;
    document.body.classList.toggle("finanzas-dark", !!enabled);
    document.documentElement.classList.toggle("finanzas-dark", !!enabled);
    updateToggle(!!enabled);
    if (persist) savePreference(!!enabled);
  }

  function ensureToggle() {
    if (!isFinancePage()) return null;

    let btn = getToggle();
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = TOGGLE_ID;
    btn.className = "finThemeToggle";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");

    btn.addEventListener("click", () => {
      const next = !document.body.classList.contains("finanzas-dark");
      applyTheme(next, true);
    });

    const tabs = document.getElementById("finTopTabs");
    const header = document.querySelector(".appHeader");
    const headerRight = document.querySelector(".appHeader__right");

    if (tabs && tabs.parentNode) {
      tabs.insertAdjacentElement("afterend", btn);
    } else if (header && headerRight && headerRight.parentNode === header) {
      header.insertBefore(btn, headerRight);
    } else {
      const row = document.querySelector(".appHeader__right .u-row");
      if (row) row.insertBefore(btn, row.firstChild);
    }

    updateToggle(document.body.classList.contains("finanzas-dark"));
    return btn;
  }

  function init() {
    if (!isFinancePage()) {
      cleanupFinanceArtifacts();
      return;
    }

    ensureStyle();
    ensureToggle();
    applyTheme(readPreference(), false);
  }

  document.addEventListener("sazzu:page:load", () => window.setTimeout(init, 0));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    window.setTimeout(init, 0);
  }

  window.finanzasDarkMode = {
    init,
    cleanup: cleanupFinanceArtifacts,
    enable: function () { applyTheme(true, true); },
    disable: function () { applyTheme(false, true); },
    toggle: function () { applyTheme(!document.body.classList.contains("finanzas-dark"), true); },
    build: BUILD
  };
})();
