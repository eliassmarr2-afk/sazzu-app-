/* =========================================================
   PROTOCOL DATA · SIDEBAR TAB SHORTCUTS
   Accesos directos a tabs existentes.
   No reemplaza ni replica la lógica interna de los paneles.
========================================================= */

(function () {
  "use strict";

  if (window.__protocolSidebarTabShortcutsLoaded) return;
  window.__protocolSidebarTabShortcutsLoaded = true;

  const PARAM_NAME = "pdTab";

  const CONFIG = {
    "/panel/productos.html": {
      key: "productos",
      label: "Productos",
      type: "productos",
      items: [
        { label: "Ofertas", tab: "ofertas", icon: "tag" },
        { label: "Rentabilidad", tab: "rentabilidad", icon: "chart" },
        { label: "Conjuntos de productos", tab: "conjuntos", icon: "layers" }
      ]
    },

    "/panel/finanzas.html": {
      key: "finanzas",
      label: "Finanzas",
      type: "finanzas",
      items: [
        { label: "Pedidos", tab: "pedidos", icon: "receipt" },
        { label: "Movimientos", tab: "movimientos", icon: "arrows" },
        { label: "Reglas", tab: "reglas", icon: "sliders" }
      ]
    },

    "/panel/logistica/logistica.html": {
      key: "logistica",
      label: "Logística",
      type: "logistica",
      items: [
        { label: "Simular CP", tab: "simulador", icon: "search" },
        { label: "Pedidos", tab: "pedidos", icon: "receipt" },
        { label: "Conversaciones", tab: "conversaciones", icon: "message" },
        { label: "Reglas de envío", tab: "reglas", icon: "sliders" },
        { label: "Calendario", tab: "calendario", icon: "calendar" },
        { label: "Códigos postales", tab: "codigos", icon: "pin" },
        { label: "Excepciones", tab: "excepciones", icon: "alert" },
        { label: "Banners", tab: "banners", icon: "megaphone" }
      ]
    },

    "/panel/publicidad/publicidad-utm.html": {
      key: "publicidad-utm",
      label: "Publicidad / UTM",
      type: "publicidad-utm",
      items: [
        { label: "Audiencias", tab: "audiencias", icon: "users" },
        { label: "Parámetros UTM", tab: "conjuntos", icon: "sliders" },
        { label: "Control", tab: "control", icon: "shield" }
      ]
    },

    "/panel/paginas-editor.html": {
      key: "rendimiento-web",
      label: "Rendimiento web",
      type: "rendimiento-web",
      items: [
        { label: "Versiones", tab: "versions", icon: "history" }
      ]
    }
  };

  const ICON_PATHS = {
    tag:
      '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"></path>' +
      '<circle cx="8" cy="8" r="1"></circle>',

    chart:
      '<path d="M3 3v18h18"></path>' +
      '<path d="m7 15 4-4 3 3 5-7"></path>',

    layers:
      '<path d="m12 2 9 5-9 5-9-5Z"></path>' +
      '<path d="m3 12 9 5 9-5"></path>' +
      '<path d="m3 17 9 5 9-5"></path>',

    receipt:
      '<path d="M6 3h12l2 5H4l2-5Z"></path>' +
      '<path d="M5 8v12h14V8"></path>' +
      '<path d="M9 12h6"></path>',

    arrows:
      '<path d="M7 7h11l-3-3"></path>' +
      '<path d="M17 17H6l3 3"></path>' +
      '<path d="m18 7-3 3"></path>' +
      '<path d="m6 17 3-3"></path>',

    sliders:
      '<path d="M4 6h16"></path>' +
      '<path d="M4 12h16"></path>' +
      '<path d="M4 18h16"></path>' +
      '<circle cx="9" cy="6" r="2"></circle>' +
      '<circle cx="15" cy="12" r="2"></circle>' +
      '<circle cx="7" cy="18" r="2"></circle>',

    search:
      '<circle cx="10" cy="10" r="6"></circle>' +
      '<path d="m15 15 5 5"></path>',

    message:
      '<path d="M4 4h16v12H8l-4 4V4Z"></path>' +
      '<path d="M8 9h8"></path>' +
      '<path d="M8 12h5"></path>',

    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"></rect>' +
      '<path d="M7 3v4"></path>' +
      '<path d="M17 3v4"></path>' +
      '<path d="M3 10h18"></path>',

    pin:
      '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>' +
      '<circle cx="12" cy="10" r="2"></circle>',

    alert:
      '<path d="m12 3 10 18H2L12 3Z"></path>' +
      '<path d="M12 9v5"></path>' +
      '<path d="M12 18h.01"></path>',

    megaphone:
      '<path d="m3 11 16-6v14L3 13v-2Z"></path>' +
      '<path d="M7 14v5"></path>',

    users:
      '<circle cx="9" cy="8" r="3"></circle>' +
      '<circle cx="17" cy="10" r="2"></circle>' +
      '<path d="M3 20c0-4 3-7 6-7s6 3 6 7"></path>' +
      '<path d="M15 15c3 0 5 2 5 5"></path>',

    shield:
      '<path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z"></path>' +
      '<path d="m9 12 2 2 4-4"></path>',

    history:
      '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path>' +
      '<path d="M3 3v5h5"></path>' +
      '<path d="M12 7v5l3 2"></path>'
  };

  let enhanceTimer = null;
  let activationTimer = null;

  function normalizePath(pathname) {
    let value = String(pathname || "").replace(/\/+/g, "/");

    if (value.length > 1 && value.endsWith("/")) {
      value = value.slice(0, -1);
    }

    return value.toLowerCase();
  }

  function iconMarkup(name) {
    const content = ICON_PATHS[name] || ICON_PATHS.layers;

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      content +
      "</svg>"
    );
  }

  function getConfigForCurrentPage() {
    return CONFIG[normalizePath(window.location.pathname)] || null;
  }

  function findParentAnchor(pathname) {
    const normalizedTarget = normalizePath(pathname);

    return Array.from(
      document.querySelectorAll(".sidebar a.navSubItem[href]")
    ).find(function (anchor) {
      try {
        const url = new URL(anchor.getAttribute("href"), window.location.origin);
        return normalizePath(url.pathname) === normalizedTarget;
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function makeShortcutHref(pathname, tab) {
    const url = new URL(pathname, window.location.origin);
    url.searchParams.set(PARAM_NAME, tab);

    return url.pathname + url.search;
  }

  function closeAllMenus(exceptKey) {
    document
      .querySelectorAll(".pdSidebarNavEntry[data-sidebar-entry]")
      .forEach(function (entry) {
        const key = entry.getAttribute("data-sidebar-entry");

        if (key === exceptKey) return;

        const toggle = entry.querySelector(".pdSidebarNavEntry__toggle");
        const menuId = toggle && toggle.getAttribute("aria-controls");
        const menu = menuId ? document.getElementById(menuId) : null;

        entry.classList.remove("is-open");

        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
        }

        if (menu) {
          menu.hidden = true;
        }
      });
  }

  function createSubmenu(config, pathname) {
    const submenu = document.createElement("div");

    submenu.className = "pdSidebarSubmenu";
    submenu.id = "pdSidebarSubmenu-" + config.key;
    submenu.setAttribute("data-sidebar-submenu", config.key);
    submenu.setAttribute("aria-label", "Accesos directos de " + config.label);
    submenu.hidden = true;

    config.items.forEach(function (item) {
      const shortcut = document.createElement("a");

      shortcut.className = "pdSidebarSubItem";
      shortcut.href = makeShortcutHref(pathname, item.tab);

      shortcut.setAttribute("data-sidebar-shortcut-page", config.key);
      shortcut.setAttribute("data-sidebar-shortcut-tab", item.tab);

      shortcut.innerHTML =
        '<span class="pdSidebarSubItem__icon" aria-hidden="true">' +
          iconMarkup(item.icon) +
        "</span>" +
        '<span class="pdSidebarSubItem__label">' +
          item.label +
        "</span>";

      submenu.appendChild(shortcut);
    });

    return submenu;
  }

  function enhanceEntry(pathname, config) {
    const anchor = findParentAnchor(pathname);

    if (!anchor) return false;
    if (anchor.closest(".pdSidebarNavEntry")) return true;

    const parent = anchor.parentNode;
    if (!parent) return false;

    const wrapper = document.createElement("div");
    wrapper.className = "pdSidebarNavEntry";
    wrapper.setAttribute("data-sidebar-entry", config.key);

    parent.insertBefore(wrapper, anchor);
    wrapper.appendChild(anchor);

    anchor.classList.add("pdSidebarNavEntry__link");

    const toggle = document.createElement("button");
    const submenuId = "pdSidebarSubmenu-" + config.key;

    toggle.className = "pdSidebarNavEntry__toggle";
    toggle.type = "button";

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", submenuId);
    toggle.setAttribute(
      "aria-label",
      "Mostrar accesos directos de " + config.label
    );

    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="m7 9 5 5 5-5"></path>' +
      "</svg>";

    wrapper.appendChild(toggle);

    const submenu = createSubmenu(config, pathname);
    wrapper.insertAdjacentElement("afterend", submenu);

    return true;
  }

  function enhanceSidebar() {
    let enhanced = 0;

    Object.keys(CONFIG).forEach(function (pathname) {
      if (enhanceEntry(pathname, CONFIG[pathname])) {
        enhanced += 1;
      }
    });

    syncShortcutActiveState();

    return enhanced;
  }

  function toggleMenu(button) {
    const entry = button.closest(".pdSidebarNavEntry");
    if (!entry) return;

    const key = entry.getAttribute("data-sidebar-entry");
    const menuId = button.getAttribute("aria-controls");
    const menu = menuId ? document.getElementById(menuId) : null;

    if (!menu) return;

    const willOpen = button.getAttribute("aria-expanded") !== "true";

    closeAllMenus(willOpen ? key : "");

    entry.classList.toggle("is-open", willOpen);
    button.setAttribute("aria-expanded", willOpen ? "true" : "false");
    menu.hidden = !willOpen;
  }

  function setFinanceStorage(tab) {
    if (!["pedidos", "movimientos", "reglas"].includes(tab)) return;

    try {
      window.localStorage.setItem("sazzu_finanzas_active_view", tab);
    } catch (error) {}
  }

  function clickSelector(selector) {
    const button = document.querySelector(selector);

    if (!button) return false;

    button.click();
    return true;
  }

  function activateTab(config, tab) {
    if (!config || !tab) return false;

    if (config.type === "productos") {
      const selector = '.prodTab[data-tab="' + tab + '"]';
      const button = document.querySelector(selector);

      if (!button) return false;

      button.click();

      return (
        button.classList.contains("is-active") ||
        button.getAttribute("aria-selected") === "true"
      );
    }

    if (config.type === "finanzas") {
      setFinanceStorage(tab);

      if (
        tab === "reglas" &&
        window.finFinanceRules &&
        typeof window.finFinanceRules.setView === "function"
      ) {
        window.finFinanceRules.setView();
      } else if (
        ["pedidos", "movimientos"].includes(tab) &&
        window.finFinanceOrdersTable &&
        typeof window.finFinanceOrdersTable.setView === "function"
      ) {
        window.finFinanceOrdersTable.setView(tab);
      } else {
        clickSelector('[data-fin-view-btn="' + tab + '"]');
      }

      const activeButton = document.querySelector(
        '[data-fin-view-btn="' + tab + '"]'
      );

      const activeSection = document.querySelector(
        'main.main > section[data-fin-view="' + tab + '"]'
      );

      return Boolean(
        (activeButton &&
          (
            activeButton.classList.contains("is-active") ||
            activeButton.getAttribute("aria-selected") === "true"
          )) ||
        (activeSection &&
          !activeSection.hidden &&
          activeSection.style.display !== "none")
      );
    }

    if (config.type === "logistica") {
      const button = document.querySelector(
        '[data-log-tab="' + tab + '"]'
      );

      if (!button) return false;

      button.click();
      return button.classList.contains("is-active");
    }

    if (config.type === "publicidad-utm") {
      const button = document.querySelector(
        '[data-tab-target="' + tab + '"]'
      );

      if (!button) return false;

      button.click();

      return (
        button.classList.contains("is-active") ||
        button.getAttribute("aria-selected") === "true"
      );
    }

    if (config.type === "rendimiento-web") {
      const button = document.querySelector(
        '[data-rw-tab="' + tab + '"]'
      );

      if (!button) return false;

      button.click();

      return (
        button.classList.contains("is-active") ||
        button.getAttribute("aria-selected") === "true"
      );
    }

    return false;
  }

  function syncShortcutActiveState() {
    const url = new URL(window.location.href);
    const requestedTab = url.searchParams.get(PARAM_NAME);
    const currentPath = normalizePath(url.pathname);

    document.querySelectorAll(".pdSidebarSubItem").forEach(function (item) {
      let itemUrl;

      try {
        itemUrl = new URL(item.href, window.location.origin);
      } catch (error) {
        return;
      }

      const itemTab = item.getAttribute("data-sidebar-shortcut-tab");
      const active =
        normalizePath(itemUrl.pathname) === currentPath &&
        itemTab === requestedTab;

      item.classList.toggle("is-active", active);

      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function scheduleActivation() {
    if (activationTimer) {
      window.clearInterval(activationTimer);
      activationTimer = null;
    }

    const url = new URL(window.location.href);
    const requestedTab = url.searchParams.get(PARAM_NAME);
    const config = getConfigForCurrentPage();

    syncShortcutActiveState();

    if (!config || !requestedTab) return;

    const valid = config.items.some(function (item) {
      return item.tab === requestedTab;
    });

    if (!valid) return;

    if (config.type === "finanzas") {
      setFinanceStorage(requestedTab);
    }

    let attempts = 0;

    function attempt() {
      attempts += 1;

      const activated = activateTab(config, requestedTab);

      if (activated || attempts >= 60) {
        if (activationTimer) {
          window.clearInterval(activationTimer);
          activationTimer = null;
        }

        syncShortcutActiveState();
      }
    }

    attempt();
    activationTimer = window.setInterval(attempt, 100);
  }

  function scheduleEnhancement() {
    if (enhanceTimer) {
      window.clearInterval(enhanceTimer);
      enhanceTimer = null;
    }

    let attempts = 0;

    function attempt() {
      attempts += 1;

      const enhanced = enhanceSidebar();

      if (enhanced === Object.keys(CONFIG).length || attempts >= 60) {
        if (enhanceTimer) {
          window.clearInterval(enhanceTimer);
          enhanceTimer = null;
        }

        scheduleActivation();
      }
    }

    attempt();
    enhanceTimer = window.setInterval(attempt, 100);
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest(".pdSidebarNavEntry__toggle");

    if (toggle) {
      event.preventDefault();
      event.stopPropagation();

      toggleMenu(toggle);
      return;
    }

    const shortcut = event.target.closest("a.pdSidebarSubItem");

    if (!shortcut) return;

    let targetUrl;

    try {
      targetUrl = new URL(shortcut.href, window.location.href);
    } catch (error) {
      return;
    }

    const samePage =
      normalizePath(targetUrl.pathname) ===
      normalizePath(window.location.pathname);

    if (!samePage) {
      return;
    }

    event.preventDefault();

    window.history.pushState(
      {},
      "",
      targetUrl.pathname + targetUrl.search + targetUrl.hash
    );

    scheduleActivation();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeAllMenus("");
  });

  document.addEventListener("sazzu:page:load", function () {
    scheduleEnhancement();
    scheduleActivation();
  });

  window.addEventListener("popstate", function () {
    scheduleActivation();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      scheduleEnhancement();
      scheduleActivation();
    });
  } else {
    scheduleEnhancement();
    scheduleActivation();
  }
})();
