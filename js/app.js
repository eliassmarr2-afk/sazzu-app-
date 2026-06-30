// Sazzú Control Tower - SPA light + page init event (sidebar persistente)
(function () {
  console.log("Sazzú Control Tower - SPA light");

  const PAGE_EVENT = "sazzu:page:load";
  const SIDEBAR_URL = "/partials/sidebar-panel.html";
  const FINANCE_ORDERS_SCRIPT_URL = "/js/finanzas-pedidos-financieros.js";
  const FINANCE_ORDERS_SCRIPT_VERSION = "20260629_06";
  const FINANCE_ORDERS_SCRIPT_SRC = FINANCE_ORDERS_SCRIPT_URL + "?v=" + FINANCE_ORDERS_SCRIPT_VERSION;
  const FINANCE_DARK_SCRIPT_URL = "/js/finanzas-dark-mode.js";
  const FINANCE_DARK_SCRIPT_VERSION = "20260630_01";
  const FINANCE_DARK_SCRIPT_SRC = FINANCE_DARK_SCRIPT_URL + "?v=" + FINANCE_DARK_SCRIPT_VERSION;
  const FINANCE_VIEW_STORAGE_KEY = "sazzu_finanzas_active_view";

  function getCurrentFile_() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function isPanelPage_() {
    return location.pathname.toLowerCase().includes("/panel/");
  }

  function isFinancePage_() {
    const page = (document.body.getAttribute("data-page") || "").toLowerCase();
    const file = getCurrentFile_();
    return page === "finanzas" || file === "finanzas.html";
  }

  function injectFinanceTabStyles_() {
    if (document.getElementById("finTopTabsStyle")) return;

    const style = document.createElement("style");
    style.id = "finTopTabsStyle";
    style.textContent = `
      .finTopTabs {
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:4px;
        border:1px solid rgba(148,163,184,.35);
        border-radius:999px;
        background:rgba(248,250,252,.88);
        box-shadow:0 1px 3px rgba(15,23,42,.06);
        flex:0 0 auto;
        margin-left:auto;
        margin-right:12px;
      }
      .finTopTabs__btn {
        appearance:none;
        border:0;
        border-radius:999px;
        background:transparent;
        color:#64748B;
        cursor:pointer;
        font-size:13px;
        font-weight:800;
        line-height:1;
        padding:9px 16px;
        white-space:nowrap;
      }
      .finTopTabs__btn.is-active {
        background:#fff;
        color:#0F172A;
        box-shadow:0 1px 7px rgba(15,23,42,.12);
      }
      .finTopTabsFallbackBar {
        display:flex;
        justify-content:flex-end;
        margin:10px 0 0;
      }
    `;

    document.head.appendChild(style);
  }

  function setFinanceTabVisual_(view) {
    const cleanView = view === "movimientos" ? "movimientos" : "pedidos";

    document.querySelectorAll("[data-fin-view-btn]").forEach((btn) => {
      const isActive = String(btn.getAttribute("data-fin-view-btn") || "") === cleanView;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function requestFinanceView_(view) {
    const cleanView = view === "movimientos" ? "movimientos" : "pedidos";

    try {
      window.localStorage.setItem(FINANCE_VIEW_STORAGE_KEY, cleanView);
    } catch (e) {}

    setFinanceTabVisual_(cleanView);

    if (
      window.finFinanceOrdersTable &&
      typeof window.finFinanceOrdersTable.setView === "function"
    ) {
      window.finFinanceOrdersTable.setView(cleanView);
    }
  }

  function ensureFinanceOrderDetailClickFallback_() {
    if (!isFinancePage_()) return;
    if (window.__financeOrderDetailClickFallbackWired) return;

    window.__financeOrderDetailClickFallbackWired = true;

    document.addEventListener("click", (ev) => {
      const tr = ev.target.closest && ev.target.closest("tr[data-fin-order-id]");
      if (!tr) return;

      const interactive = ev.target.closest && ev.target.closest("button, a, input, select, textarea, label");
      if (interactive) return;

      const rowId = tr.getAttribute("data-fin-order-id");
      if (!rowId) return;

      if (
        window.finFinanceOrdersTable &&
        typeof window.finFinanceOrdersTable.openDetailById === "function"
      ) {
        window.finFinanceOrdersTable.openDetailById(rowId);
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;

      const tr = ev.target.closest && ev.target.closest("tr[data-fin-order-id]");
      if (!tr) return;

      const rowId = tr.getAttribute("data-fin-order-id");
      if (!rowId) return;

      if (
        window.finFinanceOrdersTable &&
        typeof window.finFinanceOrdersTable.openDetailById === "function"
      ) {
        ev.preventDefault();
        window.finFinanceOrdersTable.openDetailById(rowId);
      }
    });
  }

  function ensureFinanceHeaderTabs_() {
    if (!isFinancePage_()) return null;

    injectFinanceTabStyles_();

    let tabs = document.getElementById("finTopTabs");
    if (tabs) {
      setFinanceTabVisual_("pedidos");
      return tabs;
    }

    tabs = document.createElement("div");
    tabs.id = "finTopTabs";
    tabs.className = "finTopTabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Vistas de Finanzas");
    tabs.innerHTML = `
      <button class="finTopTabs__btn" type="button" id="finViewPedidos" data-fin-view-btn="pedidos" role="tab">Pedidos</button>
      <button class="finTopTabs__btn" type="button" id="finViewMovimientos" data-fin-view-btn="movimientos" role="tab">Movimientos</button>
    `;

    tabs.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-fin-view-btn]");
      if (!btn) return;
      requestFinanceView_(String(btn.getAttribute("data-fin-view-btn") || "pedidos"));
    });

    const header = document.querySelector(".appHeader");
    const headerRight = document.querySelector(".appHeader__right");

    if (header && headerRight && headerRight.parentNode === header) {
      header.insertBefore(tabs, headerRight);
      setFinanceTabVisual_("pedidos");
      return tabs;
    }

    const headerRightRow = document.querySelector(".appHeader__right .u-row");
    if (headerRightRow) {
      headerRightRow.insertBefore(tabs, headerRightRow.firstChild);
      setFinanceTabVisual_("pedidos");
      return tabs;
    }

    const main = document.querySelector("main.main");
    if (main) {
      const fallbackBar = document.createElement("div");
      fallbackBar.className = "finTopTabsFallbackBar";
      fallbackBar.appendChild(tabs);
      const appHeader = main.querySelector(".appHeader");
      if (appHeader) appHeader.insertAdjacentElement("afterend", fallbackBar);
      else main.insertBefore(fallbackBar, main.firstChild);
    }

    setFinanceTabVisual_("pedidos");
    return tabs;
  }

  function ensureFinanceDarkModeScript_() {
    if (!isFinancePage_()) return;
    if (window.finanzasDarkMode && typeof window.finanzasDarkMode.init === "function") {
      window.finanzasDarkMode.init();
      return;
    }

    const already = Array.from(document.scripts).some((script) => {
      return String(script.src || "").includes(FINANCE_DARK_SCRIPT_URL);
    });

    if (already || window.__financeDarkModeScriptLoading) return;

    window.__financeDarkModeScriptLoading = true;

    const script = document.createElement("script");
    script.src = FINANCE_DARK_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => {
      window.__financeDarkModeScriptLoading = false;
      if (window.finanzasDarkMode && typeof window.finanzasDarkMode.init === "function") {
        window.finanzasDarkMode.init();
      }
    };
    script.onerror = () => {
      window.__financeDarkModeScriptLoading = false;
      console.error("[app.js] No se pudo cargar:", FINANCE_DARK_SCRIPT_SRC);
    };

    document.body.appendChild(script);
  }

  function ensureFinanceOrdersTableScript_() {
    if (!isFinancePage_()) return;

    ensureFinanceHeaderTabs_();
    ensureFinanceDarkModeScript_();
    ensureFinanceOrderDetailClickFallback_();

    if (
      window.finFinanceOrdersTable &&
      typeof window.finFinanceOrdersTable.setView === "function"
    ) {
      window.finFinanceOrdersTable.setView("pedidos");
      setFinanceTabVisual_("pedidos");
      ensureFinanceDarkModeScript_();
      return;
    }

    const already = Array.from(document.scripts).some((script) => {
      return String(script.src || "").includes(FINANCE_ORDERS_SCRIPT_SRC);
    });

    if (already || window.__financeOrdersTableScriptLoading) return;

    window.__financeOrdersTableScriptLoading = true;

    const script = document.createElement("script");
    script.src = FINANCE_ORDERS_SCRIPT_SRC;
    script.defer = true;
    script.onload = () => {
      window.__financeOrdersTableScriptLoading = false;
      ensureFinanceHeaderTabs_();
      ensureFinanceDarkModeScript_();
      ensureFinanceOrderDetailClickFallback_();
      if (
        window.finFinanceOrdersTable &&
        typeof window.finFinanceOrdersTable.setView === "function"
      ) {
        window.finFinanceOrdersTable.setView("pedidos");
        setFinanceTabVisual_("pedidos");
      } else if (
        window.finFinanceOrdersTable &&
        typeof window.finFinanceOrdersTable.reload === "function"
      ) {
        window.finFinanceOrdersTable.reload();
      }
    };
    script.onerror = () => {
      window.__financeOrdersTableScriptLoading = false;
      console.error("[app.js] No se pudo cargar:", FINANCE_ORDERS_SCRIPT_SRC);
    };

    document.body.appendChild(script);
  }

  function runPageSpecificInit_() {
    const page = (document.body.getAttribute("data-page") || "").toLowerCase();
    const file = getCurrentFile_();

    if ((page === "logistica" || file === "logistica.html") && typeof window.ProtocolLogisticaInit === "function") {
      window.ProtocolLogisticaInit();
    }

    ensureFinanceOrdersTableScript_();
  }

  async function injectSidebarIfNeeded_() {
    const aside = document.querySelector('aside.sidebar[data-include="sidebar"]');
    if (!aside) return;

    // Evitar reinyectar si ya existe
    if (aside.dataset.loaded === "1") return;

    try {
      const res = await fetch(SIDEBAR_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      aside.innerHTML = await res.text();
      aside.dataset.loaded = "1";
    } catch (err) {
      console.error("[app.js] No se pudo cargar sidebar:", err);
      aside.innerHTML = `
        <div class="u-muted" style="font-size:13px; padding:10px;">
          Error cargando sidebar (${String(err)}).<br>
          Verificá que exista: <b>${SIDEBAR_URL}</b>
        </div>
      `;
    }
  }

  function setActiveNav_() {
    const currentFile = getCurrentFile_();

    document.querySelectorAll("a.navSubItem[href]").forEach((a) => {
      a.classList.remove("is-active-sub");
      const href = (a.getAttribute("href") || "").toLowerCase();
      const hrefFile = href.split("/").pop();
      if (hrefFile && hrefFile === currentFile) {
        a.classList.add("is-active-sub");
      }
    });

    const hero = document.querySelector("a.navHero[href]");
    if (hero) {
      const isHome = currentFile === "" || currentFile === "index.html" || currentFile === "home.html";
      hero.classList.toggle("is-active", isHome);
    }
  }

  function firePageLoadEvent_() {
    document.dispatchEvent(new CustomEvent(PAGE_EVENT, {
      detail: {
        url: location.href,
        file: getCurrentFile_(),
        isPanel: isPanelPage_()
      }
    }));
  }

  async function softNavigateTo_(href) {
    const res = await fetch(href, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const newMain = doc.querySelector("main.main");
    const currentMain = document.querySelector("main.main");
    if (!newMain || !currentMain) {
      throw new Error("No se encontró <main class='main'>");
    }

    const targetUrl = new URL(href, location.href);

    async function ensureStyleLoaded_(hrefAbs) {
      return new Promise((resolve, reject) => {
        const norm = (s) => (s || "").toLowerCase();

        const already = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
          .some(l => norm(l.href) === norm(hrefAbs));

        if (already) return resolve(true);

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = hrefAbs;
        link.onload = () => resolve(true);
        link.onerror = () => reject(new Error("No se pudo cargar stylesheet: " + hrefAbs));

        document.head.appendChild(link);
      });
    }

    async function ensureScriptLoaded_(srcAbs) {
      return new Promise((resolve, reject) => {
        const norm = (s) => (s || "").toLowerCase();

        const already = Array.from(document.scripts)
          .some(s => norm(s.src) === norm(srcAbs));

        if (already) return resolve(true);

        const s = document.createElement("script");
        s.src = srcAbs;
        s.defer = true;
        s.onload = () => resolve(true);
        s.onerror = () => reject(new Error("No se pudo cargar script: " + srcAbs));

        document.body.appendChild(s);
      });
    }

    const incomingStyles = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'))
      .map(l => new URL(l.getAttribute("href"), targetUrl).href)
      .filter(Boolean);

    for (const hrefAbs of incomingStyles) {
      await ensureStyleLoaded_(hrefAbs);
    }

    const incomingScripts = Array.from(doc.querySelectorAll("script[src]"))
      .map(s => new URL(s.getAttribute("src"), targetUrl).href)
      .filter(Boolean)
      .filter(srcAbs => !srcAbs.includes("/js/app.js"));

    history.pushState({}, "", href);

    if (doc.title) document.title = doc.title;

    const newBody = doc.querySelector("body");
    if (newBody && newBody.getAttribute("data-page")) {
      document.body.setAttribute("data-page", newBody.getAttribute("data-page"));
    }

    /*
      Primero insertamos el nuevo <main>.
      Después cargamos el JS del módulo.
      Si cargamos el JS antes, el módulo intenta renderizar sobre elementos que todavía no existen.
    */
    currentMain.replaceWith(newMain);

    for (const srcAbs of incomingScripts) {
      await ensureScriptLoaded_(srcAbs);
    }

    setActiveNav_();
    firePageLoadEvent_();
    runPageSpecificInit_();

    window.requestAnimationFrame(() => {
      runPageSpecificInit_();
    });
  }

  function enableSoftNavigation_() {
    document.addEventListener("click", async (e) => {
      const a = e.target.closest("a.navSubItem, a.navHero");
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href) return;

      if (!href.endsWith(".html")) return;

      e.preventDefault();

      document.body.classList.add("sidebar-force-collapsed");

      if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
      }

      try {
        await softNavigateTo_(href);
      } catch (err) {
        console.error("[app.js] Soft nav falló, hago navegación normal:", err);
        location.href = href;
      } finally {
        setTimeout(() => {
          document.body.classList.remove("sidebar-force-collapsed");
        }, 220);
      }
    });

    window.addEventListener("popstate", () => location.reload());
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await injectSidebarIfNeeded_();
    setActiveNav_();
    enableSoftNavigation_();
    firePageLoadEvent_();
    runPageSpecificInit_();
  });
})();
/* =========================================================
   INICIO · AEVA · Escritura IA en hover del sidebar
   ========================================================= */

   (function initAevaSidebarTypewriter_() {
    const AEVA_TEXT = "Puedo ayudarte a entender cualquier módulo de Protocol Data";
    const TYPE_SPEED_MS = 14;
  
    let activeTimer = null;
    let activeCard = null;
  
    function getAevaTypeTarget_(card) {
      if (!card) return null;
      return card.querySelector(".sidebarAevaCard__type");
    }
  
    function clearAevaTyping_() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
  
      if (activeCard) {
        const target = getAevaTypeTarget_(activeCard);
        if (target) {
          target.textContent = "";
          target.classList.remove("is-typing", "is-complete");
        }
  
        activeCard.classList.remove("is-expanded");
      }
  
      activeCard = null;
    }
  
    function startAevaTyping_(card) {
      if (!card || card === activeCard) return;
  
      clearAevaTyping_();
  
      const target = getAevaTypeTarget_(card);
      if (!target) return;
  
      activeCard = card;
      activeCard.classList.add("is-expanded");
  
      target.textContent = "";
      target.classList.add("is-typing");
      target.classList.remove("is-complete");
  
      let index = 0;
  
      activeTimer = setInterval(function () {
        index += 1;
        target.textContent = AEVA_TEXT.slice(0, index);
  
        if (index >= AEVA_TEXT.length) {
          clearInterval(activeTimer);
          activeTimer = null;
          target.classList.remove("is-typing");
          target.classList.add("is-complete");
        }
      }, TYPE_SPEED_MS);
    }
  
    document.addEventListener("mouseover", function (event) {
      const card = event.target.closest && event.target.closest(".sidebarAevaCard");
      if (!card) return;
      if (card.contains(event.relatedTarget)) return;
  
      startAevaTyping_(card);
    });
  
    document.addEventListener("mouseout", function (event) {
      const card = event.target.closest && event.target.closest(".sidebarAevaCard");
      if (!card) return;
      if (card.contains(event.relatedTarget)) return;
  
      clearAevaTyping_();
    });
  })();
  
  /* =========================================================
     FIN · AEVA · Escritura IA en hover del sidebar
     ========================================================= */