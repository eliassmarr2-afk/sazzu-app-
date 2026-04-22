// Sazzú Control Tower - SPA light + page init event (sidebar persistente)
(function () {
  console.log("Sazzú Control Tower - SPA light");

  const PAGE_EVENT = "sazzu:page:load";
  const SIDEBAR_URL = "/partials/sidebar-panel.html";

  function getCurrentFile_() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function isPanelPage_() {
    return location.pathname.toLowerCase().includes("/panel/");
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

    for (const srcAbs of incomingScripts) {
      await ensureScriptLoaded_(srcAbs);
    }

    history.pushState({}, "", href);

    if (doc.title) document.title = doc.title;

    const newBody = doc.querySelector("body");
    if (newBody && newBody.getAttribute("data-page")) {
      document.body.setAttribute("data-page", newBody.getAttribute("data-page"));
    }

    currentMain.replaceWith(newMain);

    setActiveNav_();
    firePageLoadEvent_();
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
  });
})();