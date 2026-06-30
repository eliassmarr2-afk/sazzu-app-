console.log("[finanzas-dark-mode.js] cargado OK");

(function () {
  const BUILD = "FINANCE_DARK_MODE_2026_06_30_01";
  const STORAGE_KEY = "sazzu_finanzas_dark_mode";
  const STYLE_ID = "finanzasDarkStylesheet";
  const STYLE_HREF = "/css/finanzas-dark.css?v=20260630_01";
  const TOGGLE_ID = "finThemeToggle";

  const icons = {
    moon: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M21 14.7A8.7 8.7 0 0 1 9.3 3a.75.75 0 0 0-.92-.92A10.2 10.2 0 1 0 21.92 15.62a.75.75 0 0 0-.92-.92ZM12 20.5A8.7 8.7 0 0 1 6.2 5.32 10.2 10.2 0 0 0 18.68 17.8 8.66 8.66 0 0 1 12 20.5Z"/>
      </svg>
    `,
    sun: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-1.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.25a.75.75 0 0 1 .75.75v1.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 17.5a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 .75-.75ZM4.22 4.22a.75.75 0 0 1 1.06 0l.88.88A.75.75 0 1 1 5.1 6.16l-.88-.88a.75.75 0 0 1 0-1.06Zm13.62 13.62a.75.75 0 0 1 1.06 0l.88.88a.75.75 0 1 1-1.06 1.06l-.88-.88a.75.75 0 0 1 0-1.06ZM2.25 12a.75.75 0 0 1 .75-.75h1.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm17.5 0a.75.75 0 0 1 .75-.75H21a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM19.78 4.22a.75.75 0 0 1 0 1.06l-.88.88a.75.75 0 1 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 0ZM6.16 17.84a.75.75 0 0 1 0 1.06l-.88.88a.75.75 0 1 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 0Z"/>
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
    if (!isFinancePage()) return;
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
    enable: function () { applyTheme(true, true); },
    disable: function () { applyTheme(false, true); },
    toggle: function () { applyTheme(!document.body.classList.contains("finanzas-dark"), true); },
    build: BUILD
  };
})();
