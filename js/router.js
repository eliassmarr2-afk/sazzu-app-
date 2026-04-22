// router.js — SPA minimal + cache de vistas (Sazzú Control Tower)
(function () {
    const viewCache = new Map(); // url -> { title, mainHTML }
    let busy = false;
  
    function sameOrigin_(url) {
      try { return new URL(url, location.href).origin === location.origin; }
      catch(e){ return false; }
    }
  
    function normalizeUrl_(href) {
      return new URL(href, location.href).toString();
    }
  
    function isPanelLink_(a) {
      if (!a || !a.getAttribute) return false;
      const href = a.getAttribute("href") || "";
      if (!href) return false;
      if (href.startsWith("#")) return false;
      if (a.hasAttribute("download")) return false;
      if (a.getAttribute("target")) return false;
      return true;
    }
  
    async function fetchView_(url) {
      if (viewCache.has(url)) return viewCache.get(url);
  
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
  
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
  
      const main = doc.querySelector("main.main");
      if (!main) throw new Error("No se encontró <main class='main'> en " + url);
  
      const title = (doc.querySelector("title")?.textContent || "").trim();
      const payload = { title, mainHTML: main.innerHTML };
  
      viewCache.set(url, payload);
      return payload;
    }
  
    function swapMain_(payload) {
      const main = document.querySelector("main.main");
      if (!main) throw new Error("Esta página no tiene <main class='main'>");
  
      main.innerHTML = payload.mainHTML;
  
      if (payload.title) document.title = payload.title;
    }
  
    function callPanelMount_() {
      const file = (location.pathname.split("/").pop() || "").toLowerCase();
  
      // Importante: estos mounts los vamos a exponer desde home.js / pedidos.js
      if (file === "home.html" || file === "index.html") {
        if (typeof window.HomeMount === "function") window.HomeMount();
        return;
      }
      if (file === "pedidos.html") {
        if (typeof window.PedidosMount === "function") window.PedidosMount();
        return;
      }
      if (file === "finanzas.html") {
        if (typeof window.FinanzasMount === "function") window.FinanzasMount();
        return;
      }
      if (file === "publicidadinterna.html") {
        if (typeof window.PubInternaMount === "function") window.PubInternaMount();
        return;
      }
    }
  
    async function navigate_(href, push = true) {
      if (busy) return;
      busy = true;
  
      try {
        const url = normalizeUrl_(href);
        if (!sameOrigin_(url)) { location.href = href; return; }
  
        const payload = await fetchView_(url);
        swapMain_(payload);
  
        if (push) history.pushState({ url }, "", url);
  
        // Dejamos que app.js marque nav activo si hace falta
        // y montamos la lógica del panel
        callPanelMount_();
      } catch (err) {
        console.error("[router] navegación falló:", err);
        // fallback seguro: navegación normal
        location.href = href;
      } finally {
        busy = false;
      }
    }
  
    // Delegación de clicks
    document.addEventListener("click", (ev) => {
      const a = ev.target?.closest?.("a");
      if (!isPanelLink_(a)) return;
  
      const href = a.getAttribute("href");
      if (!href) return;
  
      // Solo interceptamos links del panel (misma origin)
      const url = normalizeUrl_(href);
      if (!sameOrigin_(url)) return;
  
      ev.preventDefault();
      navigate_(href, true);
    });
  
    // Back/forward
    window.addEventListener("popstate", (ev) => {
      const url = ev.state?.url || location.href;
      navigate_(url, false);
    });
  })();
  