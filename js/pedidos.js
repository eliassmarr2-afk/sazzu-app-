console.log("[pedidos.js] cargado OK");

// URLs y build aislados para Pedidos (no chocan con home.js)
window.__PEDIDOS_BACKEND_URL__ = window.__PEDIDOS_BACKEND_URL__ || "https://script.google.com/macros/s/AKfycbzmE22xYqN4cHJxuepWlJWcVzYr7mPsdg8lcJSZT5IHDX1oCggjhQSuPX600SLk7xs/exec";
const PEDIDOS_BACKEND_URL = window.__PEDIDOS_BACKEND_URL__;

window.__PEDIDOS_EXPECTED_BUILD__ = window.__PEDIDOS_EXPECTED_BUILD__ || "SAZZU_BACKEND_BUILD_2026-02-11_DEMAND_FIX_01";
const PEDIDOS_EXPECTED_BUILD = window.__PEDIDOS_EXPECTED_BUILD__;

// caché de pedidos para SPA
window.__PEDIDOS_CACHE__ = window.__PEDIDOS_CACHE__ || null;
// Skeleton para listado de pedidos (mientras el backend responde)
const ORDERS_SKELETON_HTML = `
  <div class="ordersListSkeleton" aria-hidden="true">
    <div class="ordersListSkeleton__item">
      <div class="ordersListSkeleton__icon"></div>
      <div class="ordersListSkeleton__body">
        <div class="ordersListSkeleton__line ordersListSkeleton__line--strong"></div>
        <div class="ordersListSkeleton__line"></div>
        <div class="ordersListSkeleton__meta">
          <span class="ordersListSkeleton__pill"></span>
          <span class="ordersListSkeleton__pill"></span>
        </div>
      </div>
    </div>

    <div class="ordersListSkeleton__item">
      <div class="ordersListSkeleton__icon"></div>
      <div class="ordersListSkeleton__body">
        <div class="ordersListSkeleton__line ordersListSkeleton__line--strong"></div>
        <div class="ordersListSkeleton__line"></div>
        <div class="ordersListSkeleton__meta">
          <span class="ordersListSkeleton__pill"></span>
          <span class="ordersListSkeleton__pill"></span>
        </div>
      </div>
    </div>

    <div class="ordersListSkeleton__item">
      <div class="ordersListSkeleton__icon"></div>
      <div class="ordersListSkeleton__body">
        <div class="ordersListSkeleton__line ordersListSkeleton__line--strong"></div>
        <div class="ordersListSkeleton__line"></div>
        <div class="ordersListSkeleton__meta">
          <span class="ordersListSkeleton__pill"></span>
          <span class="ordersListSkeleton__pill"></span>
        </div>
      </div>
    </div>

    <div class="ordersListSkeleton__item">
      <div class="ordersListSkeleton__icon"></div>
      <div class="ordersListSkeleton__body">
        <div class="ordersListSkeleton__line ordersListSkeleton__line--strong"></div>
        <div class="ordersListSkeleton__line"></div>
        <div class="ordersListSkeleton__meta">
          <span class="ordersListSkeleton__pill"></span>
          <span class="ordersListSkeleton__pill"></span>
        </div>
      </div>
    </div>
  </div>
`;

function backendBuildWarn_(msg) {
  const id = "backendBuildWarn";
  let el = document.getElementById(id);

  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.style.position = "fixed";
    el.style.top = "12px";
    el.style.right = "12px";
    el.style.zIndex = "999999";
    el.style.maxWidth = "420px";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "10px";
    el.style.fontSize = "13px";
    el.style.fontWeight = "700";
    el.style.lineHeight = "1.25";
    el.style.boxShadow = "0 10px 25px rgba(0,0,0,.12)";
    el.style.background = "#fff2f2";
    el.style.border = "1px solid #ffd0d0";
    el.style.color = "#8a1f1f";
    document.body.appendChild(el);
  }

  el.textContent = msg;
  el.hidden = false;
}

function backendBuildWarnHide_() {
  const el = document.getElementById("backendBuildWarn");
  if (el) el.hidden = true;
}

function enforceBackendBuild_(res) {
  const got = String(res?.build || "");
  if (!got) {
    backendBuildWarn_("Backend: falta el campo 'build'. Posible deploy desactualizado.");
    return false;
  }
  if (got !== PEDIDOS_EXPECTED_BUILD) {
    backendBuildWarn_(
      `Backend desactualizado. Esperado: ${PEDIDOS_EXPECTED_BUILD} | Recibido: ${got}. ` +
      `Solución: corregir PEDIDOS_BACKEND_URL al deploy correcto.`
    );
    return false;
  }
  backendBuildWarnHide_();
  return true;
}

// ---------- Helpers fecha ----------
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoRangeTodayAR() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return {
    from: `${y}-${m}-${d}T00:00:00-03:00`,
    to: `${y}-${m}-${d}T23:59:59-03:00`
  };
}

function isoRangePreset(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "today") return isoRangeTodayAR();

  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "month") {
    start.setDate(1);
  }

  const pad = (n) => String(n).padStart(2, "0");
  return {
    from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T00:00:00-03:00`,
    to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T23:59:59-03:00`
  };
}

function applyCustomRangeFromInputs_() {
  const dtFrom = document.getElementById("dtFrom");
  const dtTo = document.getElementById("dtTo");
  if (!dtFrom || !dtTo) return null;

  if (!dtFrom.value || !dtTo.value) {
    console.warn("[Pedidos] Rango incompleto. Completar Desde y Hasta.");
    return null;
  }

  let fromIso = dtFrom.value + ":00-03:00";

  const toVal = dtTo.value;
  let toIso = "";
  if (/T00:00$/.test(toVal)) {
    toIso = toVal.replace(/T00:00$/, "T23:59:59") + "-03:00";
  } else {
    toIso = toVal + ":59-03:00";
  }

  return { from: fromIso, to: toIso };
}
function getGlobalRangeForPedidos_() {
  const g = window.__SAZZU_GLOBAL_RANGE__;
  if (!g || !g.from || !g.to) return null;
  return {
    from: String(g.from),
    to: String(g.to)
  };
}

function formatMoney(n) {
  const x = Number(n) || 0;
  return "$" + x.toLocaleString("es-AR");
}

function statusClassLogistica(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("entregado")) return "state--green";
  if (s.includes("despachado")) return "state--navy";
  if (s.includes("intervenido")) return "state--red";
  return "state--sky";
}

function statusClassIngreso(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("procesado")) return "state--green";
  if (s.includes("intervenido")) return "state--red";
  return "state--sky";
}

// ---------- JSONP ----------
function jsonp(url) {
  return new Promise((resolve) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const kill = (payload) => {
      try { delete window[cbName]; } catch(e){}
      if (script && script.parentNode) script.parentNode.removeChild(script);
      resolve(payload);
    };

    const t = setTimeout(() => {
      kill({ ok:false, error:"JSONP timeout (8s). Backend no respondió o bloqueado." });
    }, 8000);

    window[cbName] = (data) => {
      clearTimeout(t);
      kill(data);
    };

    script.onerror = () => {
      clearTimeout(t);
      kill({ ok:false, error:"JSONP script error. URL inválida, deploy caído o bloqueado por red." });
    };

    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cbName + "&_nocache=" + Math.random();
    document.body.appendChild(script);
  });
}

// ================================
// Estado global del panel Pedidos
// ================================
const OrdersState = {
  fromIso: "",
  toIso: "",
  all: [],
  filtered: [],
  page: 1,
  pageSize: 12,
  q: "",
  quick: "" // entregado|despachado|pendiente|intervenido
};

function normalize_(s){ return String(s || "").trim().toLowerCase(); }

function applyFilters_() {
  const q = normalize_(OrdersState.q);
  const quick = normalize_(OrdersState.quick);

  const list = Array.isArray(OrdersState.all) ? OrdersState.all : [];

  const filtered = list.filter(p => {
    const stLog = normalize_(p?.estado_logistica);
    if (quick) {
      if (quick === "pendiente") {
        const isPend = !stLog.includes("entregado") && !stLog.includes("despachado") && !stLog.includes("intervenido");
        if (!isPend) return false;
      } else {
        if (!stLog.includes(quick)) return false;
      }
    }

    if (!q) return true;

    const hay = [
      p?.id,
      p?.cliente,
      p?.email,
      p?.fecha_iso,
      p?.tracking,
      p?.sku,
      p?.producto
    ].map(normalize_).join(" | ");

    return hay.includes(q);
  });

  OrdersState.filtered = filtered;
  OrdersState.page = 1;
}

function updatePagerUI_() {
  const meta = document.getElementById("ordersPagerMeta");
  const btnPrev = document.getElementById("btnPrevOrders");
  const btnNext = document.getElementById("btnNextOrders");

  const total = OrdersState.filtered.length;
  const ps = OrdersState.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / ps));
  let page = OrdersState.page;

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  OrdersState.page = page;

  const start = total ? ((page - 1) * ps + 1) : 0;
  const end = total ? Math.min(page * ps, total) : 0;

  if (meta) meta.textContent = total ? `${start}–${end} de ${total}` : `0 de 0`;
  if (btnPrev) btnPrev.disabled = (page <= 1);
  if (btnNext) btnNext.disabled = (page >= totalPages);
}

function renderOrders_() {
  const cont = document.getElementById("ordersList");
  const info = document.getElementById("ordersInfo");
  if (!cont) return;

  const allFiltered = OrdersState.filtered;
  const total = allFiltered.length;

  if (info) {
    const rangeTxt = OrdersState.fromIso ? OrdersState.fromIso.slice(0,10) : "—";
    const rangeTxt2 = OrdersState.toIso ? OrdersState.toIso.slice(0,10) : "—";
    info.textContent = `${total} pedidos · ${rangeTxt} → ${rangeTxt2}`;
  }

  if (!total) {
    cont.innerHTML = `<div class="u-muted" style="font-size:14px;">No hay pedidos con los filtros actuales.</div>`;
    updatePagerUI_();
    return;
  }

  const page = OrdersState.page;
  const ps = OrdersState.pageSize;
  const startIdx = (page - 1) * ps;
  const slice = allFiltered.slice(startIdx, startIdx + ps);

  let html = "";
  slice.forEach(p => {
    const stLog = p.estado_logistica || "Pendiente";
    const stIng = p.estado_ingreso || "Pendiente";

    html += `
      <div class="listItem orderItem" style="align-items:flex-start;">
        <div class="orderItem__left" style="min-width:0;">
          <div class="orderIconWrap" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true" class="orderIcon">
              <path d="M200-80q-33 0-56.5-23.5T120-160v-480q0-33 23.5-56.5T200-720h80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720h80q33 0 56.5 23.5T840-640v480q0 33-23.5 56.5T760-80H200Zm280-320q83 0 141.5-58.5T680-600h-80q0 50-35 85t-85 35q-50 0-85-35t-35-85h-80q0 83 58.5 141.5T480-400ZM360-720h240q0-50-35-85t-85-35q-50 0-85 35t-35 85Z"/>
            </svg>
          </div>

          <div style="min-width:0;">
            <div style="font-weight:900; margin-bottom:3px;">${p.cliente || "Cliente sin nombre"}</div>
            <div class="u-muted" style="font-size:13px;">
              ID: ${p.id || "(sin ID)"} · ${p.email || ""} · ${p.fecha_iso || ""}
            </div>
            <div class="u-muted" style="font-size:13px; margin-top:4px;">
              Monto: ${formatMoney(p.monto_ars)}
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
          <span class="stateBadge ${statusClassLogistica(stLog)}">${stLog}</span>
          <span class="stateBadge ${statusClassIngreso(stIng)}">${stIng}</span>
        </div>
      </div>
    `;
  });

  cont.innerHTML = html;
  updatePagerUI_();
}

async function loadPedidos_(fromIso, toIso) {
  OrdersState.fromIso = fromIso;
  OrdersState.toIso = toIso;

  const cont = document.getElementById("ordersList");
  if (cont) {
    // Mientras esperamos al backend, mostramos skeleton
    cont.innerHTML = ORDERS_SKELETON_HTML;
  }

  const t = Date.now();
  const url =
    `${PEDIDOS_BACKEND_URL}?action=getHomeSummary` +
    `&from=${encodeURIComponent(fromIso)}` +
    `&to=${encodeURIComponent(toIso)}` +
    `&limit=200` +
    `&debug=1` +
    `&_t=${t}`;

  const res = await jsonp(url);
  window.__lastPedidos = res;

  console.log("[Pedidos] URL:", url);
  console.log("[Pedidos] RES (raw):", res);

  enforceBackendBuild_(res);

  if (!res || res.ok !== true) {
    const msg = (res && res.error) ? res.error : "Respuesta inválida del backend.";
    if (cont) {
      cont.innerHTML = `
        <div class="u-muted" style="font-size:14px;">
          ${msg}<br>
          <span style="font-size:12px; opacity:.85;">${url}</span>
        </div>`;
    }
    return;
  }

  const pedidos = Array.isArray(res?.pedidos) ? res.pedidos : [];
  OrdersState.all = pedidos;

  // guardamos cache para SPA
  window.__PEDIDOS_CACHE__ = {
    from: fromIso,
    to: toIso,
    res
  };

  applyFilters_();
  renderOrders_();
}

// ================================
// UI: buscador + quick filters + pager
// ================================
function wireUI_() {
  const search = document.getElementById("ordersSearch");
  const btnClear = document.getElementById("btnClearOrders");

  const btnPrev = document.getElementById("btnPrevOrders");
  const btnNext = document.getElementById("btnNextOrders");

  if (search) {
    search.addEventListener("input", () => {
      OrdersState.q = search.value || "";
      applyFilters_();
      renderOrders_();
    });
  }

  document.querySelectorAll("[data-quick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = String(btn.dataset.quick || "").toLowerCase();

      OrdersState.quick = (OrdersState.quick === v) ? "" : v;

      document.querySelectorAll("[data-quick]").forEach(b => {
        b.classList.toggle("is-active", String(b.dataset.quick || "").toLowerCase() === OrdersState.quick);
      });

      applyFilters_();
      renderOrders_();
    });
  });

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      OrdersState.q = "";
      OrdersState.quick = "";
      if (search) search.value = "";

      document.querySelectorAll("[data-quick]").forEach(b => b.classList.remove("is-active"));

      applyFilters_();
      renderOrders_();
    });
  }

  if (btnPrev) {
    btnPrev.onclick = () => {
      OrdersState.page = Math.max(1, OrdersState.page - 1);
      renderOrders_();
    };
  }
  if (btnNext) {
    btnNext.onclick = () => {
      const total = OrdersState.filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / OrdersState.pageSize));
      OrdersState.page = Math.min(totalPages, OrdersState.page + 1);
      renderOrders_();
    };
  }
}

// ================================
// UI: dateFilter (mismo patrón que Home)
// ================================
function wireDateFilter_() {
  const wrap = document.getElementById("dateFilter");
  const panel = document.getElementById("datePanel");
  const btnToggle = document.getElementById("btnToggleDates");
  const btnApply = document.getElementById("btnApplyRange");

  function openDates() {
    if (!panel || !btnToggle) return;
    panel.hidden = false;
    btnToggle.setAttribute("aria-expanded", "true");
  }
  function closeDates() {
    if (!panel || !btnToggle) return;
    panel.hidden = true;
    btnToggle.setAttribute("aria-expanded", "false");
  }
  function toggleDates() {
    if (!panel) return;
    panel.hidden ? openDates() : closeDates();
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      toggleDates();
    });
  }

  document.addEventListener("click", (ev) => {
    if (!wrap || !panel) return;
    const inside = wrap.contains(ev.target);
    if (!inside) closeDates();
  });

  document.querySelectorAll(".filterPill[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      const r = isoRangePreset(preset);

      const dtFrom = document.getElementById("dtFrom");
      const dtTo = document.getElementById("dtTo");
      if (dtFrom) dtFrom.value = toLocalInputValue(r.from);
      if (dtTo) dtTo.value = toLocalInputValue(r.to);

      document.querySelectorAll(".filterPill[data-preset]").forEach(b => {
        b.classList.toggle("is-active", b.dataset.preset === preset);
      });

      loadPedidos_(r.from, r.to);
      closeDates();
    });
  });

  if (btnApply) {
    btnApply.addEventListener("click", () => {
      document.querySelectorAll(".filterPill[data-preset]").forEach(b => b.classList.remove("is-active"));

      const r = applyCustomRangeFromInputs_();
      if (!r) return;

      loadPedidos_(r.from, r.to);
      closeDates();
    });
  }
}

// ================================
// Boot (SPA-safe)
// ================================
function initPedidos_() {
  if (!document.getElementById("ordersList")) return;

  if (window.__pedidosInited === true) return;
  window.__pedidosInited = true;

  wireUI_();
  wireDateFilter_();

  const cache = window.__PEDIDOS_CACHE__;
  if (cache && cache.res && Array.isArray(cache.res.pedidos)) {
    OrdersState.fromIso = cache.from;
    OrdersState.toIso = cache.to;
    OrdersState.all = cache.res.pedidos.slice();

    const dtFrom = document.getElementById("dtFrom");
    const dtTo = document.getElementById("dtTo");
    if (dtFrom) dtFrom.value = toLocalInputValue(cache.from);
    if (dtTo) dtTo.value = toLocalInputValue(cache.to);

    document.querySelectorAll(".filterPill[data-preset]").forEach(b => b.classList.remove("is-active"));

    applyFilters_();
    renderOrders_();
    return;
  }

  const globalRange = getGlobalRangeForPedidos_();

  const r = globalRange || {
    from: "2025-10-01T00:00:00-03:00",
    to: "2025-10-31T23:59:59-03:00"
  };

  const dtFrom = document.getElementById("dtFrom");
  const dtTo = document.getElementById("dtTo");
  if (dtFrom) dtFrom.value = toLocalInputValue(r.from);
  if (dtTo) dtTo.value = toLocalInputValue(r.to);

  document.querySelectorAll(".filterPill[data-preset]").forEach(b => b.classList.remove("is-active"));

  loadPedidos_(r.from, r.to);
}

// Carga normal
document.addEventListener("DOMContentLoaded", initPedidos_);

// SPA navigation
document.addEventListener("sazzu:page:load", () => {
  if (document.getElementById("ordersList")) {
    window.__pedidosInited = false;
    initPedidos_();
  }
});

// Hook explícito para router.js (si lo necesitás)
window.PedidosMount = function () {
  window.__pedidosInited = false;
  initPedidos_();
};