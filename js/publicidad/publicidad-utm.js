(function () {
    const PAGE_FILE = "publicidad-utm.html";
  
    window.__PUB_UTM_WIRED__ = window.__PUB_UTM_WIRED__ || false;
  
    function currentFile_() {
      return (location.pathname.split("/").pop() || "").toLowerCase();
    }
  
    function isThisPage_() {
      return currentFile_() === PAGE_FILE;
    }
  
    function wireTabs_() {
      const tabs = document.querySelectorAll(".pubUtmTab");
      const panels = document.querySelectorAll(".pubUtmTabPanel");
  
      if (!tabs.length || !panels.length) return;
  
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const key = tab.dataset.tab || "";
  
          tabs.forEach((btn) => btn.classList.remove("is-active"));
          panels.forEach((panel) => panel.classList.remove("is-active"));
  
          tab.classList.add("is-active");
  
          const target = document.querySelector(`.pubUtmTabPanel[data-tab-panel="${key}"]`);
          if (target) target.classList.add("is-active");
        });
      });
    }
  
    function wireFilters_() {
      const filters = document.querySelectorAll(".pubUtmFilter");
      if (!filters.length) return;
  
      filters.forEach((btn) => {
        btn.addEventListener("click", () => {
          filters.forEach((item) => item.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });
    }
  
    function PublicidadUtmInit() {
      if (window.__PUB_UTM_WIRED__) return;
      window.__PUB_UTM_WIRED__ = true;
  
      wireTabs_();
      wireFilters_();
    }
  
    function PublicidadUtmMount() {
      if (!isThisPage_()) return;
      window.__PUB_UTM_WIRED__ = false;
      PublicidadUtmInit();
    }
  
    document.addEventListener("DOMContentLoaded", PublicidadUtmMount);
    document.addEventListener("sazzu:page:load", PublicidadUtmMount);
  
    window.PublicidadUtmInit = PublicidadUtmInit;
    window.PublicidadUtmMount = PublicidadUtmMount;
  })();