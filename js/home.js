console.log("[home.js] cargado OK");

window.__HOME_BACKEND_URL__ = window.__HOME_BACKEND_URL__ || "https://script.google.com/macros/s/AKfycbzmE22xYqN4cHJxuepWlJWcVzYr7mPsdg8lcJSZT5IHDX1oCggjhQSuPX600SLk7xs/exec";
const BACKEND_URL = window.__HOME_BACKEND_URL__;

window.__HOME_EXPECTED_BUILD__ = window.__HOME_EXPECTED_BUILD__ || "SAZZU_BACKEND_BUILD_2026-02-11_DEMAND_FIX_01";
const EXPECTED_BACKEND_BUILD = window.__HOME_EXPECTED_BUILD__;

// flags/cache globales para Home
window.__HOME_WIRED__ = window.__HOME_WIRED__ || false;
window.__HOME_LAST_RANGE__ = window.__HOME_LAST_RANGE__ || null;
window.__HOME_KPI_TRENDS__ = window.__HOME_KPI_TRENDS__ || null;

// rango global semilla para aplicar desde Inicio al resto de paneles
window.__SAZZU_GLOBAL_RANGE__ = window.__SAZZU_GLOBAL_RANGE__ || null;

// Crea/actualiza un aviso visible (sin tocar CSS del proyecto)
function backendBuildWarn_(msg) {
  const id = "backendBuildWarn";
  let el = document.getElementById(id);

  if (!el) {
    el = document.createElement("div");
    el.id = id;

    // Estilo mínimo inline (no depende de tu CSS)
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

// Devuelve true si está OK, false si hay mismatch
function enforceBackendBuild_(res) {
  const got = String(res?.build || "");
  if (!got) {
    backendBuildWarn_("Backend: falta el campo 'build'. Posible deploy desactualizado.");
    return false;
  }

  if (got !== EXPECTED_BACKEND_BUILD) {
    backendBuildWarn_(
      `Backend desactualizado. Esperado: ${EXPECTED_BACKEND_BUILD} | Recibido: ${got}. ` +
      `Solución: corregir BACKEND_URL al deploy correcto.`
    );
    return false;
  }

  backendBuildWarnHide_();
  return true;
}

// ---------- Helpers fecha ----------
function toDateInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
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

  // normalizamos a "hoy" local; el backend trabaja con -03:00 por default
  if (preset === "today") {
    return isoRangeTodayAR();
  }

  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "month") {
    start.setDate(1);
  }

  const pad = (n) => String(n).padStart(2, "0");
  const y1 = start.getFullYear();
  const m1 = pad(start.getMonth() + 1);
  const d1 = pad(start.getDate());

  const y2 = end.getFullYear();
  const m2 = pad(end.getMonth() + 1);
  const d2 = pad(end.getDate());

  return {
    from: `${y1}-${m1}-${d1}T00:00:00-03:00`,
    to: `${y2}-${m2}-${d2}T23:59:59-03:00`
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
  return "state--sky"; // pendiente / default
}

function statusClassIngreso(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("procesado")) return "state--green";
  if (s.includes("intervenido")) return "state--red";
  return "state--sky"; // pendiente / default
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

    // timeout defensivo (8s)
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

    script.src =
      url +
      (url.includes("?") ? "&" : "?") +
      "callback=" + cbName +
      "&_nocache=" + Math.random();

    document.body.appendChild(script);
  });
}

function fmtRangeLabel(fromIso, toIso, fallbackFrom, fallbackTo) {
  // Preferimos lo que venga del backend (ya viene sin horas)
  const a = fallbackFrom || "";
  const b = fallbackTo || "";
  if (a && b) return `Datos desde ${a} hasta ${b}`;

  // Fallback: formatear local sin horas
  try {
    const d1 = new Date(fromIso);
    const d2 = new Date(toIso);
    const dd = (d)=> String(d.getDate()).padStart(2,"0");
    const mm = (d)=> String(d.getMonth()+1).padStart(2,"0");
    const yy = (d)=> d.getFullYear();
    return `Datos desde ${dd(d1)}/${mm(d1)}/${yy(d1)} hasta ${dd(d2)}/${mm(d2)}/${yy(d2)}`;
  } catch(e) {
    return `Datos —`;
  }
}

function setDonutSegments(logi) {
  const total = Number(logi.total) || 0;

  const r = 44;
  const C = 2 * Math.PI * r;

  const segE = document.getElementById("segEntregado");
  const segD = document.getElementById("segDespachado");
  const segP = document.getElementById("segPendiente");
  const segI = document.getElementById("segIntervenido");

  // Si no hay datos: dejamos todo en 0
  if (!total) {
    [segE, segD, segP, segI].forEach(s => { if(s) s.setAttribute("stroke-dasharray", `0 ${C}`); });
    return;
  }

  const e = Number(logi.entregado?.n) || 0;
  const d = Number(logi.despachado?.n) || 0;
  const p = Number(logi.pendiente?.n) || 0;
  const i = Number(logi.intervenido?.n) || 0;

  // Longitudes
  const le = (e / total) * C;
  const ld = (d / total) * C;
  const lp = (p / total) * C;
  const li = (i / total) * C;

  // Para “encadenar” segmentos en un donut sin librerías,
  // usamos stroke-dasharray y stroke-dashoffset acumulado.
  // Cada círculo representa un segmento, con offset acumulado.
  const setSeg = (el, len, offset) => {
    if (!el) return;
    el.setAttribute("stroke-dasharray", `${Math.max(0, len)} ${C}`);
    el.setAttribute("stroke-dashoffset", `${-offset}`);
  };

  let acc = 0;
  setSeg(segE, le, acc); acc += le;
  setSeg(segD, ld, acc); acc += ld;
  setSeg(segP, lp, acc); acc += lp;
  setSeg(segI, li, acc); acc += li;
}

function renderLogisticaCard(res) {
  const logi = res && res.logistica ? res.logistica : null;

  const elRange = document.getElementById("logiRange");
  const elTotal = document.getElementById("logiTotal");
  const elCenter = document.getElementById("logiDonutCenter");

  const nE = document.getElementById("nEntregado");
  const nD = document.getElementById("nDespachado");
  const nP = document.getElementById("nPendiente");
  const nI = document.getElementById("nIntervenido");

  if (!logi) {
    if (elRange) elRange.textContent = "Datos —";
    if (elTotal) elTotal.textContent = "0 pedidos";
    if (elCenter) elCenter.textContent = "0";
    if (nE) nE.textContent = "0";
    if (nD) nD.textContent = "0";
    if (nP) nP.textContent = "0";
    if (nI) nI.textContent = "0";
    setDonutSegments({ total: 0 });
    return;
  }

  const total = Number(logi.total) || 0;

  const fromLbl = logi.range_label && logi.range_label.from ? logi.range_label.from : "";
  const toLbl = logi.range_label && logi.range_label.to ? logi.range_label.to : "";

  if (elRange) elRange.textContent = fmtRangeLabel(res.range?.from, res.range?.to, fromLbl, toLbl);
  if (elTotal) elTotal.textContent = `${total} pedidos`;
  if (elCenter) elCenter.textContent = String(total);

  if (nE) nE.textContent = String(Number(logi.entregado?.n) || 0);
  if (nD) nD.textContent = String(Number(logi.despachado?.n) || 0);
  if (nP) nP.textContent = String(Number(logi.pendiente?.n) || 0);
  if (nI) nI.textContent = String(Number(logi.intervenido?.n) || 0);

  setDonutSegments(logi);
}

function renderDemandCard(res, fromIso, toIso) {
  const elRange = document.getElementById("demandRange");
  const elTotal = document.getElementById("demandTotal");
  const elPeak  = document.getElementById("demandPeak");

  const svg     = document.getElementById("demandSpark");
  const pathEl  = document.getElementById("demandPath");
  const dotEl   = document.getElementById("demandDot");
  const tip     = document.getElementById("demandTip");
  const tipT    = document.getElementById("demandTipT");
  const tipV    = document.getElementById("demandTipV");
  const axis    = document.getElementById("demandHours");

  const days = Array.isArray(res?.demand?.days) ? res.demand.days : [];
  if (!days.length || !svg || !pathEl || !axis) return;

  // Rango
  const fromLbl = res?.demand?.range_label?.from || "";
  const toLbl   = res?.demand?.range_label?.to || "";
  if (elRange) elRange.textContent = fmtRangeLabel(fromIso, toIso, fromLbl, toLbl);

  // Día activo (por defecto: hoy)
  const now = new Date();
  const jsDay = now.getDay();                // 0=Dom..6=Sáb
  const mon0 = (jsDay === 0) ? 6 : (jsDay - 1); // 0=Lun..6=Dom
  const currentDay = (window.__demandDayIdx ?? mon0);

  const d = days.find(x => Number(x.day) === Number(currentDay)) || days[0];
  const hours = Array.isArray(d.hours) ? d.hours : Array(24).fill(0);

  // KPIs
  const total = hours.reduce((a,b)=>a+(Number(b)||0),0);
  let peakVal = 0, peakHour = 0;
  for (let h = 0; h < 24; h++) {
    const v = Number(hours[h]) || 0;
    if (v > peakVal) { peakVal = v; peakHour = h; }
  }
  if (elTotal) elTotal.textContent = `Total: ${total}`;
  if (elPeak)  elPeak.textContent  = `Pico: ${String(peakHour).padStart(2,"0")}:00 (${peakVal})`;

  // Tabs UI
  document.querySelectorAll(".demandTab").forEach(btn => {
    const di = Number(btn.dataset.day);
    btn.classList.toggle("is-active", di === Number(d.day));
  });

  // Eje X: más precisión (cada 2 horas + 23)
  const ticks = [];
  for (let h = 0; h <= 22; h += 2) ticks.push(h);
  if (!ticks.includes(23)) ticks.push(23);

  axis.innerHTML = ticks.map(h => `<span>${h}</span>`).join("");

  // Dibujo: curva suavizada en SVG
  const W = 600, H = 90, padX = 12, padY = 10;
  const max = Math.max(...hours.map(v => Number(v) || 0), 1);

  const pts = hours.map((v, i) => {
    const x = padX + (i / 23) * (W - padX*2);
    const y = (H - padY) - ((Number(v) || 0) / max) * (H - padY*2);
    return { x, y, v: (Number(v) || 0), h: i };
  });

  // Catmull-Rom → Bezier (suave)
  const catmullRomPath = (points) => {
    if (!points.length) return "";
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  };

  pathEl.setAttribute("d", catmullRomPath(pts));

  // Tooltip (solo desktop): muestra hora + pedidos
  const svgRect = () => svg.getBoundingClientRect();

  const showTip = (idx, clientX, clientY) => {
    const p = pts[idx];
    if (!p) return;

    if (dotEl){
      dotEl.setAttribute("cx", p.x.toFixed(2));
      dotEl.setAttribute("cy", p.y.toFixed(2));
      dotEl.style.opacity = "1";
    }

    if (tip && tipT && tipV){
      tip.hidden = false;
      tipT.textContent = `Hora: ${String(p.h).padStart(2,"0")}:00`;
      tipV.textContent = `Pedidos: ${p.v}`;

      const r = svgRect();
      const localX = clientX - r.left;
      const localY = clientY - r.top;

      const safeX = Math.max(8, Math.min(localX + 12, r.width - 160));
      const safeY = Math.max(8, Math.min(localY - 36, r.height - 50));

      tip.style.left = `${safeX}px`;
      tip.style.top  = `${safeY}px`;
    }
  };

  const hideTip = () => {
    if (dotEl) dotEl.style.opacity = "0";
    if (tip) tip.hidden = true;
  };

  svg.onmouseleave = null;
  svg.onmousemove = null;

  svg.onmouseleave = () => hideTip();

  svg.onmousemove = (ev) => {
    const r = svgRect();
    const x = ev.clientX - r.left;

    const t = Math.max(0, Math.min(1, x / r.width));
    const idx = Math.round(t * 23);

    showTip(idx, ev.clientX, ev.clientY);
  };

  // por defecto: mostramos pico
  showTip(peakHour, svgRect().left + (peakHour/23)*svgRect().width, svgRect().top + 20);
}

function renderMotorInterno(res) {
  const elE = document.getElementById("miEntregado");
  const elD = document.getElementById("miDespachado");
  const elP = document.getElementById("miPendiente");
  const elI = document.getElementById("miIntervenido");

  if (!elE || !elD || !elP || !elI) {
    console.warn("[MotorInterno] Faltan IDs en el HTML:", {
      miEntregado: !!elE,
      miDespachado: !!elD,
      miPendiente: !!elP,
      miIntervenido: !!elI
    });
    return;
  }

  const pedidos = Array.isArray(res?.pedidos) ? res.pedidos : [];

  let entregado = 0;
  let despachado = 0;
  let pendiente = 0;
  let intervenido = 0;

  for (const p of pedidos) {
    const raw = String(p?.estado_logistica || "").toLowerCase();

    if (raw.includes("entregado")) entregado++;
    else if (raw.includes("despachado")) despachado++;
    else if (raw.includes("intervenido")) intervenido++;
    else pendiente++;
  }

  elE.textContent = String(entregado);
  elD.textContent = String(despachado);
  elP.textContent = String(pendiente);
  elI.textContent = String(intervenido);

  console.log("[MotorInterno] OK", { entregado, despachado, pendiente, intervenido, base: pedidos.length });
}

function renderTopProductsCard(res, fromIso, toIso) {
  const elRange = document.getElementById("topProdRange");
  const elTotal = document.getElementById("topProdTotal");
  const elList = document.getElementById("topProdList");

  const items = Array.isArray(res?.top_products) ? res.top_products : [];

  const fromLbl = res?.logistica?.range_label?.from || "";
  const toLbl = res?.logistica?.range_label?.to || "";
  if (elRange) elRange.textContent = fmtRangeLabel(fromIso, toIso, fromLbl, toLbl);

  const totalTop = items.reduce((acc, it) => acc + (Number(it?.revenue) || 0), 0);
  if (elTotal) elTotal.textContent = formatMoney(totalTop);

  if (!elList) return;

  if (!items.length) {
    elList.innerHTML = `<div class="u-muted" style="font-size:14px; color: rgba(17,24,39,.75);">No hay SKUs en el rango seleccionado.</div>`;
    return;
  }

  const max = Math.max(...items.map(it => Number(it.revenue) || 0), 1);

  elList.innerHTML = items.map((it, i) => {
    const sku = String(it.sku || "").trim() || "(sin SKU)";
    const rev = Number(it.revenue) || 0;
    const orders = Number(it.orders) || 0;
    const pct = Math.max(2, Math.round((rev / max) * 100)); // mínimo visual

    return `
      <div class="topProdItem" role="listitem" aria-label="SKU ${sku}">
        <div class="topProdItem__head">
          <div class="topProdSku">
            <span class="topProdRank">${i + 1}</span>
            <span class="topProdSkuTxt">${sku}</span>
          </div>
          <div class="topProdMeta">
            <span class="topProdMoney">${formatMoney(rev)}</span>
            <span class="topProdOrders">${orders} pedidos</span>
          </div>
        </div>
        <div class="topProdBar">
          <div class="topProdBar__fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

// ================================
// Render completo desde un resultado en memoria
// (para cache SPA y rehidratación sin tocar backend)
// ================================
function renderHomeFromResult_(resNow, fromIso, toIso) {
  const cont = document.getElementById("lista-pedidos");
  const info = document.getElementById("pedidosInfo");

  const kNow = resNow.kpis || { facturacion_total: 0, pedidos_total: 0, ticket_promedio: 0 };

  const elFact = document.getElementById("kpiFacturacion");
  const elPed = document.getElementById("kpiPedidos");
  const elTicket = document.getElementById("kpiTicket");

  if (elFact) elFact.textContent = formatMoney(kNow.facturacion_total);
  if (elPed) elPed.textContent = String(kNow.pedidos_total || 0);
  if (elTicket) elTicket.textContent = formatMoney(kNow.ticket_promedio);

  renderTopProductsCard(resNow, fromIso, toIso);
  renderMotorInterno(resNow);
  renderDemandCard(resNow, fromIso, toIso);

  const PAGE_SIZE = 10;

  const ORDER_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true" class="orderIcon">
      <path d="M200-80q-33 0-56.5-23.5T120-160v-480q0-33 23.5-56.5T200-720h80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720h80q33 0 56.5 23.5T840-640v480q0 33-23.5 56.5T760-80H200Zm280-320q83 0 141.5-58.5T680-600h-80q0 50-35 85t-85 35q-50 0-85-35t-35-85h-80q0 83 58.5 141.5T480-400ZM360-720h240q0-50-35-85t-85-35q-50 0-85 35t-35 85Z"/>
    </svg>
  `;

  const pedidos = Array.isArray(resNow.pedidos) ? resNow.pedidos : [];
  const totalReal = (resNow && resNow.kpis && typeof resNow.kpis.pedidos_total === "number")
    ? resNow.kpis.pedidos_total
    : pedidos.length;

  if (info) info.textContent = `${totalReal} pedidos`;

  window.__ordersAll = pedidos;
  window.__ordersPage = 1;
  window.__ordersPageSize = PAGE_SIZE;

  const meta = document.getElementById("ordersPagerMeta");
  const btnPrev = document.getElementById("btnPrevOrders");
  const btnNext = document.getElementById("btnNextOrders");

  function updatePagerUI() {
    const total = (window.__ordersAll || []).length;
    const pageSize = window.__ordersPageSize || PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    let page = window.__ordersPage || 1;

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    window.__ordersPage = page;

    const start = total ? ((page - 1) * pageSize + 1) : 0;
    const end = total ? Math.min(page * pageSize, total) : 0;

    if (meta) meta.textContent = total ? `${start}–${end} de ${total}` : `0 de 0`;
    if (btnPrev) btnPrev.disabled = (page <= 1);
    if (btnNext) btnNext.disabled = (page >= totalPages);
  }

  function renderOrders() {
    if (!cont) return;

    const all = window.__ordersAll || [];
    const page = window.__ordersPage || 1;
    const pageSize = window.__ordersPageSize || PAGE_SIZE;

    if (!all.length) {
      cont.innerHTML = `<div class="u-muted" style="font-size:14px;">No hay pedidos en el rango seleccionado.</div>`;
      updatePagerUI();
      return;
    }

    const startIdx = (page - 1) * pageSize;
    const slice = all.slice(startIdx, startIdx + pageSize);

    let html = "";
    slice.forEach(p => {
      const stLog = p.estado_logistica || "Pendiente";
      const stIng = p.estado_ingreso || "Pendiente";

      html += `
        <div class="listItem orderItem" style="align-items:flex-start;">
          <div class="orderItem__left" style="min-width:0;">
            <div class="orderIconWrap" aria-hidden="true">
              ${ORDER_ICON}
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
    updatePagerUI();
  }

  renderOrders();

  if (btnPrev) {
    btnPrev.onclick = () => {
      window.__ordersPage = Math.max(1, (window.__ordersPage || 1) - 1);
      renderOrders();
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      const total = (window.__ordersAll || []).length;
      const pageSize = window.__ordersPageSize || PAGE_SIZE;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      window.__ordersPage = Math.min(totalPages, (window.__ordersPage || 1) + 1);
      renderOrders();
    };
  }
}

// ================================
// KPI TRENDS vs PERÍODO ANTERIOR
// ================================
function isoARFromMs_(ms) {
  const arMs = ms - (3 * 60 * 60 * 1000); // UTC-3
  const d = new Date(arMs);
  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`;
}

function prevRangeSameDuration_(fromIso, toIso) {
  const msFrom = new Date(fromIso).getTime();
  const msTo = new Date(toIso).getTime();

  const dur = msTo - msFrom;

  const prevTo = msFrom - 1000;
  const prevFrom = prevTo - dur;

  return {
    from: isoARFromMs_(prevFrom),
    to: isoARFromMs_(prevTo),
  };
}

function pctDelta_(current, previous) {
  const a = Number(current) || 0;
  const b = Number(previous) || 0;

  if (!b) {
    if (a > 0) return "new";
    return 0;
  }

  return ((a - b) / b) * 100;
}

function fmtPct_(p) {
  if (p === "new") return "Nuevo";
  if (typeof p !== "number" || !isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${Math.round(p)}%`;
}

function setKpiTrendText_(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
// Marca visual de carga en Inicio (usa data-home-loading en <main>)
function setHomeLoading(isLoading) {
  const main = document.querySelector("main.main");
  if (!main) return;

  if (isLoading) {
    main.setAttribute("data-home-loading", "1");
  } else {
    main.removeAttribute("data-home-loading");
  }
}
// Llamada única al backend (misma URL que ya venías usando)
async function fetchHomeSummary_(fromIso, toIso) {
  const t = Date.now();
  const url =
    `${BACKEND_URL}?action=getHomeSummary` +
    `&from=${encodeURIComponent(fromIso)}` +
    `&to=${encodeURIComponent(toIso)}` +
    `&limit=200` +
    `&debug=1` +
    `&_t=${t}`;

  const res = await jsonp(url);
  return { res, url };
}



async function loadHome(fromIso, toIso) {
  const cont = document.getElementById("lista-pedidos");
  const info = document.getElementById("pedidosInfo");

  // Encendemos la barra de carga de Inicio
  setHomeLoading(true);

  try {
    const { res: resNow, url: urlNow } = await fetchHomeSummary_(fromIso, toIso);

    window.__lastHome = resNow;
    console.log("[getHomeSummary NOW] URL:", urlNow);
    console.log("[getHomeSummary NOW] RES (raw):", resNow);

    enforceBackendBuild_(resNow);

    if (!resNow || resNow.ok !== true) {
      const msg = (resNow && resNow.error) ? resNow.error : "Respuesta inválida del backend.";
      if (info) info.textContent = "ERROR";
      if (cont) {
        cont.innerHTML = `
          <div class="u-muted" style="font-size:14px;">
            ${msg}<br>
            <span style="font-size:12px; opacity:.85;">${urlNow}</span>
          </div>`;
      }

      setKpiTrendText_("kpiFacturacionTrend", "—");
      setKpiTrendText_("kpiPedidosTrend", "—");
      setKpiTrendText_("kpiTicketTrend", "—");

      window.__HOME_KPI_TRENDS__ = { fact: "—", ped: "—", ticket: "—" };
      return;
    }

    const kNow = resNow.kpis || { facturacion_total: 0, pedidos_total: 0, ticket_promedio: 0 };

    const elFact = document.getElementById("kpiFacturacion");
    const elPed = document.getElementById("kpiPedidos");
    const elTicket = document.getElementById("kpiTicket");

    if (elFact) elFact.textContent = formatMoney(kNow.facturacion_total);
    if (elPed) elPed.textContent = String(kNow.pedidos_total || 0);
    if (elTicket) elTicket.textContent = formatMoney(kNow.ticket_promedio);

    renderTopProductsCard(resNow, fromIso, toIso);
    renderMotorInterno(resNow);
    renderDemandCard(resNow, fromIso, toIso);

    const prev = prevRangeSameDuration_(fromIso, toIso);
    const { res: resPrev, url: urlPrev } = await fetchHomeSummary_(prev.from, prev.to);

    console.log("[getHomeSummary PREV] URL:", urlPrev);
    console.log("[getHomeSummary PREV] RES (raw):", resPrev);

    let trendFact = "—";
    let trendPed  = "—";
    let trendTick = "—";

    if (resPrev && resPrev.ok === true && enforceBackendBuild_(resPrev)) {
      const kPrev = resPrev.kpis || { facturacion_total: 0, pedidos_total: 0, ticket_promedio: 0 };

      const dFact = pctDelta_(kNow.facturacion_total, kPrev.facturacion_total);
      const dPed  = pctDelta_(kNow.pedidos_total,   kPrev.pedidos_total);
      const dTick = pctDelta_(kNow.ticket_promedio, kPrev.ticket_promedio);

      trendFact = fmtPct_(dFact);
      trendPed  = fmtPct_(dPed);
      trendTick = fmtPct_(dTick);
    }

    setKpiTrendText_("kpiFacturacionTrend", trendFact);
    setKpiTrendText_("kpiPedidosTrend", trendPed);
    setKpiTrendText_("kpiTicketTrend", trendTick);

    window.__HOME_KPI_TRENDS__ = {
      fact: trendFact,
      ped: trendPed,
      ticket: trendTick
    };

    window.__HOME_LAST_RANGE__ = { from: fromIso, to: toIso };

    renderHomeFromResult_(resNow, fromIso, toIso);
  } finally {
    // Apagamos la barra de carga sí o sí (éxito o error)
    setHomeLoading(false);
  }
}

// ---------- UI filtros ----------
function setActivePreset(preset) {
  document.querySelectorAll(".filterPill").forEach(b => {
    b.classList.toggle("is-active", b.dataset.preset === preset);
  });
}

function applyPreset(preset) {
  const r = isoRangePreset(preset);
  const dtFrom = document.getElementById("dtFrom");
  const dtTo = document.getElementById("dtTo");

  if (dtFrom) dtFrom.value = toDateInputValue(r.from);
  if (dtTo) dtTo.value = toDateInputValue(r.to);

  setActivePreset(preset);
  loadHome(r.from, r.to);
}

function applyCustomRange() {
  const dtFrom = document.getElementById("dtFrom");
  const dtTo = document.getElementById("dtTo");
  if (!dtFrom || !dtTo) return;

  if (!dtFrom.value || !dtTo.value) {
    console.warn("[applyCustomRange] Rango incompleto. Completar Desde y Hasta.");
    return;
  }

  const fromIso = `${dtFrom.value}T00:00:00-03:00`;
  const toIso = `${dtTo.value}T23:59:59-03:00`;

  document.querySelectorAll(".filterPill").forEach(b => b.classList.remove("is-active"));
  loadHome(fromIso, toIso);
}
function getHomeRangeFromInputs_() {
  const dtFrom = document.getElementById("dtFrom");
  const dtTo = document.getElementById("dtTo");

  if (!dtFrom || !dtTo) return null;

  if (!dtFrom.value || !dtTo.value) {
    console.warn("[home] Rango incompleto. Completar Desde y Hasta.");
    return null;
  }

  return {
    from: `${dtFrom.value}T00:00:00-03:00`,
    to: `${dtTo.value}T23:59:59-03:00`
  };
}

function setGlobalRangeFromHome_(fromIso, toIso) {
  window.__SAZZU_GLOBAL_RANGE__ = {
    from: fromIso,
    to: toIso,
    source: "home",
    ts: Date.now()
  };

  console.log("[home] rango global aplicado", window.__SAZZU_GLOBAL_RANGE__);
}

function flashGlobalRangeButton_() {
  const btn = document.getElementById("btnApplyRangeGlobal");
  if (!btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Aplicado a todos";

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = originalText;
  }, 1400);
}

function applyRangeToAllPanels_() {
  const range = getHomeRangeFromInputs_();
  if (!range) return;

  document.querySelectorAll(".filterPill").forEach(b => b.classList.remove("is-active"));

  // 1) Guardamos la semilla global
  setGlobalRangeFromHome_(range.from, range.to);

  // 2) Invalidamos caches de paneles que hoy tienen rango propio,
  // para que al volver a montar tomen el nuevo rango global.
  window.__FINANZAS_CACHE__ = null;
  window.__PEDIDOS_CACHE__ = null;

  // Si más adelante otros paneles con fecha usan cache similar,
  // se agregan acá también.
  // Ejemplo:
  // window.__LOGISTICA_CACHE__ = null;
  // window.__PUBLICIDAD_CACHE__ = null;

  console.log("[home] caches invalidados para aplicar rango global", {
    finanzas: window.__FINANZAS_CACHE__,
    pedidos: window.__PEDIDOS_CACHE__
  });

  flashGlobalRangeButton_();

  // 3) Inicio también refleja el mismo rango que se sembró al resto
  loadHome(range.from, range.to);
}
// ================================
// Rehidratación desde caché (sin backend)
// ================================
function hydrateHomeFromCache_() {
  const res = window.__lastHome;
  const r = window.__HOME_LAST_RANGE__;
  if (!res || !r) return;

  renderHomeFromResult_(res, r.from, r.to);

  const t = window.__HOME_KPI_TRENDS__ || {};
  setKpiTrendText_("kpiFacturacionTrend", t.fact || "—");
  setKpiTrendText_("kpiPedidosTrend", t.ped || "—");
  setKpiTrendText_("kpiTicketTrend", t.ticket || "—");
}

// ================================
// SPA SAFE BOOT (Home)
// ================================
window.HomeInit = function HomeInit() {
  if (window.__HOME_WIRED__) return;
  window.__HOME_WIRED__ = true;

  document.querySelectorAll(".filterPill").forEach(btn => {
    if (!btn.dataset.preset) return;
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  const btnApply = document.getElementById("btnApplyRange");
  if (btnApply) {
    btnApply.addEventListener("click", () => {
      applyCustomRange();
    });
  }
  
  const btnApplyGlobal = document.getElementById("btnApplyRangeGlobal");
  if (btnApplyGlobal) {
    btnApplyGlobal.addEventListener("click", () => {
      applyRangeToAllPanels_();
    });
  }

  document.querySelectorAll(".demandTab").forEach(btn => {
    btn.addEventListener("click", () => {
      window.__demandDayIdx = Number(btn.dataset.day) || 0;

      if (window.__lastHome && window.__HOME_LAST_RANGE__) {
        const r = window.__HOME_LAST_RANGE__;
        renderDemandCard(window.__lastHome, r.from, r.to);
      }
    });
  });
};

window.HomeMount = function HomeMount() {
  window.HomeInit();

  const cached = window.__HOME_LAST_RANGE__;
  const hasCache = !!(cached && window.__lastHome);

  const r = cached || {
    from: "2025-10-01T00:00:00-03:00",
    to: "2025-10-31T23:59:59-03:00"
  };

  const dtFrom = document.getElementById("dtFrom");
const dtTo = document.getElementById("dtTo");
if (dtFrom) dtFrom.value = toDateInputValue(r.from);
if (dtTo) dtTo.value = toDateInputValue(r.to);

  document.querySelectorAll(".filterPill").forEach(b => b.classList.remove("is-active"));

  if (hasCache) {
    hydrateHomeFromCache_();
  } else {
    window.__HOME_LAST_RANGE__ = r;
    loadHome(r.from, r.to);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const file = (location.pathname.split("/").pop() || "").toLowerCase();
  if (file === "home.html" || file === "index.html") {
    window.HomeMount();
  }
});
document.addEventListener("sazzu:page:load", () => {
  const file = (location.pathname.split("/").pop() || "").toLowerCase();

  if (file === "home.html" || file === "index.html") {
    window.__HOME_WIRED__ = false;
    window.HomeMount();
  }
});
