/* =========================================================
   SAZZÚ - Publicidad Interna (UI Skeleton)
   Alcance: estructura + placeholders (sin lógica real)
   ========================================================= */

   (function () {
    // Helpers
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    function isoToday() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  
    function isoDaysAgo(days) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  
    // Init only on this page
    function initPublicidadInterna() {
      const desde = $("#piDesde");
      const hasta = $("#piHasta");
      const btnFiltrar = $("#piBtnFiltrar");
      const btnAplicarMix = $("#piBtnAplicarMix");
      const btnResetMix = $("#piBtnResetMix");
  
      if (!desde || !hasta || !btnFiltrar) return;
  
      // Defaults: últimos 30 días (solo UI)
      desde.value = isoDaysAgo(30);
      hasta.value = isoToday();
  
      btnFiltrar.addEventListener("click", () => {
        // Placeholder: más adelante dispara fetch al backend
        const f = { from: desde.value, to: hasta.value };
        console.log("[Publicidad Interna] FILTRAR (placeholder)", f);
  
        // Demo: tocar KPIs para “sensación de vida”
        $("#piKpiCompras").textContent = "—";
        $("#piKpiTicket").textContent = "—";
        $("#piKpiPatrones").textContent = "—";
      });
  
      btnAplicarMix?.addEventListener("click", () => {
        const d1 = $("#piDim1")?.value || "";
        const d2 = $("#piDim2")?.value || "";
        const d3 = $("#piDim3")?.value || "";
        console.log("[Publicidad Interna] MIX aplicado (placeholder)", { d1, d2, d3 });
      });
  
      btnResetMix?.addEventListener("click", () => {
        const dim1 = $("#piDim1");
        const dim2 = $("#piDim2");
        const dim3 = $("#piDim3");
        if (dim1) dim1.value = "utm_source";
        if (dim2) dim2.value = "utm_nicho";
        if (dim3) dim3.value = "utm_oferta";
        console.log("[Publicidad Interna] MIX reset (placeholder)");
      });
  
      // Export CSV (placeholder)
      $$("#piTbodyCoincidencias button[data-export]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const seg = btn.getAttribute("data-export");
          console.log("[Publicidad Interna] Export CSV (placeholder)", seg);
          // Más adelante: construir CSV real con emails deduplicados
          alert(`Export (demo): ${seg}`);
        });
      });
  
      $("#piBtnExportAudiencia")?.addEventListener("click", () => {
        console.log("[Publicidad Interna] Exportar audiencia (placeholder)");
        alert("Exportar audiencia (demo). Luego lo conectamos a datos reales.");
      });
  
      $("#piBtnGuardarSegmento")?.addEventListener("click", () => {
        const nombre = $("#piSegNombre")?.value || "(sin nombre)";
        const modo = $("#piSegModo")?.value || "AND";
        const regla = $("#piSegRegla")?.value || "";
        console.log("[Publicidad Interna] Guardar segmento (placeholder)", { nombre, modo, regla });
        alert("Segmento guardado (demo). Luego lo persistimos en Sheets.");
      });
  
      $("#piBtnVerTodosSeg")?.addEventListener("click", () => {
        console.log("[Publicidad Interna] Ver todos segmentos (placeholder)");
        alert("Ver todos (demo).");
      });
  
      $("#piBtnVerTodosClicks")?.addEventListener("click", () => {
        console.log("[Publicidad Interna] Ver todos clicks (placeholder)");
        alert("Clicks internos (demo).");
      });
    }
  
    document.addEventListener("DOMContentLoaded", initPublicidadInterna);
  })();
  