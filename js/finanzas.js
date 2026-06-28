console.log("[finanzas.js] cargado OK");

// ================================
// BACKEND URL + BUILD GUARD (aislado para Finanzas)
// ================================
window.__FINANZAS_BACKEND_URL__ =
  window.__FINANZAS_BACKEND_URL__ ||
  "https://script.google.com/macros/s/AKfycbw3vslv67nJZzPDMsQwYDCVsTVM0g-AN1zehWYPs1WT_BSQuKN3ugq8tbjiCjP5Qkk/exec";

// Usamos nombres locales para NO chocar con otros módulos (home.js, pedidos.js, etc.)
const FINANZAS_BACKEND_URL_LOCAL   = window.__FINANZAS_BACKEND_URL__;

window.__FINANZAS_EXPECTED_BUILD__ =
  window.__FINANZAS_EXPECTED_BUILD__ ||
  "SAZZU_BACKEND_BUILD_2026-02-11_DEMAND_FIX_01";

const FINANZAS_EXPECTED_BUILD_LOCAL = window.__FINANZAS_EXPECTED_BUILD__;

// Cache SPA
window.__FINANZAS_CACHE__ = window.__FINANZAS_CACHE__ || null;

// Estado
const FinanzasState = {
  fromIso: "",
  toIso: "",
  rows: [],
  series: null, // { dates:[], proc:[], pend:[], intv:[], ma7:[] }
  alerts: [],
  history: [],
  stockCostsSummary: null,
  stockCostsSlideSummary: null,
  stockSlideActiveTab: "stock",
  stockSlideRangeMode: "panel",
  stockSlideFromIso: "",
  stockSlideToIso: "",
  stockSlideDateDropdownOpen: false
 };
 window.FinanzasState = FinanzasState;

const FIN_STOCK_SLIDE_PARTIAL_URL = "../partials/finan-slide-costos-stock.html";
const FIN_FINANCIAL_SLIDE_PARTIAL_URL = "../partials/finan-slide-costos-financieros.html";

// ================================
// Helpers UI
// ================================
function fin_$id(id){ return document.getElementById(id); }

function fin_fmtMoney(n){
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits: 2 });
}

// Formato compacto para ejes (sin símbolo $ para no recargar el gráfico)
function fin_fmtAxisMoney_(n){
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;

  if (v === 0) return "0";

  // Valores grandes en miles / millones, pero manteniendo el valor dinámico
  if (Math.abs(v) >= 1_000_000) {
    const m = v / 1_000_000;
    return m.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "M";
  }
  if (Math.abs(v) >= 1_000) {
    const k = v / 1_000;
    return k.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "k";
  }

  return v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Promedio U: mostramos el valor tal cual, SIN símbolo de porcentaje
function fin_fmtRatioPlain(n){
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

// Promedio W: viene en rango 0–1 → lo convertimos a porcentaje 0–100 + "%"
function fin_fmtPctFromUnit(n){
  const x = Number(n || 0);
  const v = isFinite(x) ? (x * 100) : 0;
  return v.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
}

function fin_dateToIsoRange_(dFromStr, dToStr){
  // inputs type=date devuelven YYYY-MM-DD
  // construimos ISO con TZ -03:00, igual que el backend
  const fromIso = dFromStr ? `${dFromStr}T00:00:00-03:00` : "";
  const toIso   = dToStr   ? `${dToStr}T23:59:59-03:00` : "";
  return { fromIso, toIso };
}

function fin_isoToYmd_(iso){
  // iso esperado: yyyy-mm-ddThh:mm:ss-03:00
  const s = String(iso || "");
  return s.slice(0,10);
}

function fin_enforceBuild_(res){
  if (!res || !res.build) return;
  if (String(res.build) !== String(FINANZAS_EXPECTED_BUILD_LOCAL)) {
    console.warn("[finanzas] build mismatch", res.build, FINANZAS_EXPECTED_BUILD_LOCAL);
    // (si querés banner como Home/Pedidos, lo agregamos después)
  }
}

// ================================
// JSONP
// ================================
function fin_jsonp_(url, cb){
  const script = document.createElement("script");
  script.src = url;
  script.async = true;

  script.onerror = function(){
    script.remove();
    cb(new Error("JSONP error"));
  };

  document.head.appendChild(script);
}

function fin_callBackend_(action, params){
  return new Promise((resolve, reject) => {
    const cbName = "__fin_cb_" + Math.random().toString(36).slice(2);

    window[cbName] = function(payload){
      try {
        delete window[cbName];
      } catch(e) {
        window[cbName] = undefined;
      }
      resolve(payload);
    };

    const qs = new URLSearchParams();
    qs.set("callback", cbName);
    qs.set("action", action);

    Object.keys(params || {}).forEach(k => {
      const v = params[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        qs.set(k, String(v));
      }
    });

    // Usamos la constante local de Finanzas para evitar conflictos globales
    const url = FINANZAS_BACKEND_URL_LOCAL + "?" + qs.toString();

    fin_jsonp_(url, (err) => {
      try { delete window[cbName]; } catch(e){}
      reject(err);
    });
  });
}

async function fin_callSupabaseCashflow_(fromIso, toIso){
  if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
    throw new Error("Supabase no está disponible para Finanzas.");
  }

  const payload = await window.SazzuSupabase.rpc("rpc_finance_cashflow_legacy_bridge", {
    input_from: fromIso || null,
    input_to: toIso || null
  });

  if (!payload || payload.ok !== true) {
    throw new Error(payload && payload.error ? payload.error : "Supabase no devolvió cashflow financiero válido.");
  }

  return payload;
}

// ================================
// API: actualizar estado de ingreso (Z) + patch local
// ================================
async function fin_updateIngresoEstado_(id, estadoNuevo, actor, origen){
  const cleanId = String(id || "").trim();
  const cleanEstado = String(estadoNuevo || "").trim();

  if (!cleanId || !cleanEstado) {
    console.warn("[finanzas] fin_updateIngresoEstado_ llamado sin id o estado", id, estadoNuevo);
    return { ok:false, error:"Missing id or estado" };
  }

  const res = await fin_callBackend_("updateIngresoEstado", {
    id: cleanId,
    estado: cleanEstado,
    actor: actor || "panel-web",
    origen: origen || "slide-confirmaciones"
  });

  fin_enforceBuild_(res);

  if (res && res.ok) {
    // Patch en memoria + cache para mantener todo consistente
    fin_applyEstadoIngresoLocal_(cleanId, cleanEstado);
  } else {
    console.warn("[finanzas] updateIngresoEstado devolvió error", res);
  }

  return res;
}

function fin_applyEstadoIngresoLocal_(id, estadoNuevo){
  if (!FinanzasState.rows || !Array.isArray(FinanzasState.rows)) return;

  const idStr = String(id || "").trim();
  const estadoStr = String(estadoNuevo || "").trim();
  let touched = false;

  // Patch en las filas actuales del cashflow
  FinanzasState.rows = FinanzasState.rows.map(r => {
    if (String(r.id || "").trim() === idStr) {
      touched = true;
      return Object.assign({}, r, { estado_ingreso: estadoStr });
    }
    return r;
  });

  // Patch también en el cache SPA (si existe)
  const cache = window.__FINANZAS_CACHE__;
  if (cache && cache.res && Array.isArray(cache.res.rows)) {
    cache.res.rows = cache.res.rows.map(r => {
      if (String(r.id || "").trim() === idStr) {
        return Object.assign({}, r, { estado_ingreso: estadoStr });
      }
      return r;
    });
  }

  if (touched) {
    console.log("[finanzas] estado_ingreso actualizado localmente para id", idStr, "->", estadoStr);
    // Re-render para que el slide / métricas reflejen el cambio
    renderFinanzas_();
  }
}

// ================================
// Skeleton (dentro del mismo contenedor)
// ================================
const FIN_SKELETON_HTML = `
  <div class="u-skelChart">
    <div class="u-skelLine"></div>
    <div class="u-skelBars">
      ${Array.from({length: 24}).map(()=>`<span></span>`).join("")}
    </div>
  </div>
`;

// ================================
// Data -> series
// ================================
function fin_buildSeries_(rows){
  // Agrupa por fecha_ingreso (Y) y suma neto_ingreso_v por estado
  const byDate = {}; // ymd -> { proc, pend, intv }
  const dates = [];

  for (const r of rows || []) {
    const ymd = fin_isoToYmd_(r.fecha_ingreso_iso);
    if (!ymd) continue;

    if (!byDate[ymd]) {
      byDate[ymd] = { proc:0, pend:0, intv:0 };
      dates.push(ymd);
    }

    const st = String(r.estado_ingreso || "").toLowerCase();
    const val = Number(r.neto_ingreso_v || 0);

    if (st.includes("proces")) byDate[ymd].proc += val;
    else if (st.includes("inter")) byDate[ymd].intv += val;
    else byDate[ymd].pend += val;
  }

  dates.sort(); // YYYY-MM-DD ordena bien lexicográfico

  const proc = dates.map(d => byDate[d].proc);
  const pend = dates.map(d => byDate[d].pend);
  const intv = dates.map(d => byDate[d].intv);

  // media móvil 7d sobre procesado
  const ma7 = proc.map((_, i) => {
    const a = Math.max(0, i-6);
    let s = 0, c = 0;
    for (let k=a; k<=i; k++){ s += proc[k]; c++; }
    return c ? (s/c) : 0;
  });

  return { dates, proc, pend, intv, ma7 };
}

// ================================
// Render SVG chart (simple, estable)
// ================================
function fin_renderChart_(series){
  const host = fin_$id("finCashflowChart");
  if (!host) return;

  const W = host.clientWidth || 900;
  // Alto ajustado al CSS (220px) para que entre en la card con leyenda + nota
  const H = 220;

  // Un poco más de padding derecho para que no se corte la última etiqueta
  const padL = 52, padR = 32, padT = 12, padB = 34;
  const innerW = Math.max(10, W - padL - padR);
  const innerH = Math.max(10, H - padT - padB);

  const n = series.dates.length;
  if (!n) {
    host.innerHTML = `<div class="u-muted">Sin datos en el rango seleccionado.</div>`;
    return;
  }

  // max para escala (procesado, pendiente, intervenida, media móvil)
  const maxVal = Math.max(
    ...series.proc, ...series.pend, ...series.intv, ...series.ma7, 0
  );
  const yMax = maxVal <= 0 ? 1 : maxVal;

  const x = (i) => padL + (n === 1 ? innerW/2 : (i * (innerW/(n-1))));
  const y = (v) => padT + (innerH - (v / yMax) * innerH);

  function pathFrom(arr){
    let d = "";
    for (let i=0;i<arr.length;i++){
      const xi = x(i);
      const yi = y(arr[i]);
      d += (i===0 ? `M ${xi} ${yi}` : ` L ${xi} ${yi}`);
    }
    return d;
  }

  // -----------------------------
  // Grid + etiquetas eje Y
  // -----------------------------
  const gridN = 4;
  let grid = "";
  let ylabels = "";
  const step = yMax / gridN;

  for (let i = 0; i <= gridN; i++){
    const vv = step * i;
    const yy = y(vv);

    // Línea horizontal
    grid += `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" class="finGrid"/>`;

    // Etiqueta numérica (anclada a la izquierda, alineada con la grilla)
    const label = fin_fmtAxisMoney_(vv);
    ylabels += `
      <text
        x="${padL - 6}"
        y="${yy + 4}"
        text-anchor="end"
        class="finAxisTxt finAxisTxt--y"
      >${label}</text>
    `;
  }

  // -----------------------------
  // Etiquetas eje X (fechas)
  // -----------------------------
  const labelEvery = Math.max(1, Math.floor(n/6));
  let xlabels = "";
  for (let i=0;i<n;i+=labelEvery){
    const xi = x(i);
    const lab = series.dates[i].slice(5); // MM-DD
    xlabels += `<text x="${xi}" y="${H-12}" text-anchor="middle" class="finAxisTxt">${lab}</text>`;
  }

  // Puntos interactivos sobre la serie principal (Procesado)
  let dots = "";
  for (let i = 0; i < n; i++) {
    const xi = x(i);
    const yi = y(series.proc[i] || 0);
    // hit grande transparente + punto visible pequeño
    dots += `
      <circle class="finDotHit" cx="${xi}" cy="${yi}" r="10" data-idx="${i}" fill="transparent"></circle>
      <circle class="finDotVis" cx="${xi}" cy="${yi}" r="3" fill="#2479FF"></circle>
    `;
  }

  host.innerHTML = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cashflow por día">
    <g>
      ${grid}
      ${ylabels}
    </g>

    <path d="${pathFrom(series.proc)}" class="finLine finLine--proc" fill="none"/>
    <path d="${pathFrom(series.ma7)}"  class="finLine finLine--ma" fill="none"/>
    <path d="${pathFrom(series.pend)}" class="finLine finLine--pend" fill="none"/>
    <path d="${pathFrom(series.intv)}" class="finLine finLine--int" fill="none"/>

    <g class="finDots">
      ${dots}
    </g>

    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" class="finAxis"/>
    <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" class="finAxis"/>

    <g>${xlabels}</g>
  </svg>
  `;

  // ============================
  // Tooltips (overlay HTML)
  // ============================
  const tipId = "finTooltip";
  let tip = document.getElementById(tipId);
  if (!tip) {
    tip = document.createElement("div");
    tip.id = tipId;
    tip.className = "finTip";
    tip.innerHTML = `
      <div class="finTip__date" id="finTipDate"></div>
      <div class="finTip__rows">
        <div class="finTip__row">
          <span class="finTip__dot finTip__dot--proc"></span>
          <span class="finTip__label">Procesado</span>
          <span class="finTip__value" id="finTipProc"></span>
        </div>
        <div class="finTip__row">
          <span class="finTip__dot finTip__dot--pend"></span>
          <span class="finTip__label">Pendiente</span>
          <span class="finTip__value" id="finTipPend"></span>
        </div>
        <div class="finTip__row">
          <span class="finTip__dot finTip__dot--int"></span>
          <span class="finTip__label">Intervenida</span>
          <span class="finTip__value" id="finTipIntv"></span>
        </div>
        <div class="finTip__row">
          <span class="finTip__dot finTip__dot--ma"></span>
          <span class="finTip__label">Media móvil 7d</span>
          <span class="finTip__value" id="finTipMa7"></span>
        </div>
      </div>
      <div class="finTip__total">
        Total día: <span id="finTipTotal"></span>
      </div>
    `;
    tip.hidden = true;
    host.appendChild(tip);
  }

  const svg = host.querySelector("svg");
  if (!svg) return;

  const hits = svg.querySelectorAll(".finDotHit");
  const dateEl = document.getElementById("finTipDate");
  const procEl = document.getElementById("finTipProc");
  const pendEl = document.getElementById("finTipPend");
  const intEl  = document.getElementById("finTipIntv");
  const maEl   = document.getElementById("finTipMa7");
  const totEl  = document.getElementById("finTipTotal");

  function hideTip(){
    if (tip) tip.hidden = true;
  }

  function showTip(idx, evt){
    if (!tip) return;

    const d = series.dates[idx] || "";
    const vProc = Number(series.proc[idx] || 0);
    const vPend = Number(series.pend[idx] || 0);
    const vInt  = Number(series.intv[idx] || 0);
    const vMa   = Number(series.ma7[idx]  || 0);
    const total = vProc + vPend + vInt;

    if (dateEl) dateEl.textContent = d;
    if (procEl) procEl.textContent = fin_fmtMoney(vProc);
    if (pendEl) pendEl.textContent = fin_fmtMoney(vPend);
    if (intEl)  intEl.textContent  = fin_fmtMoney(vInt);
    if (maEl)   maEl.textContent   = fin_fmtMoney(vMa);
    if (totEl)  totEl.textContent  = fin_fmtMoney(total);

    const hostRect = host.getBoundingClientRect();
    const xClient = evt.clientX;
    const yClient = evt.clientY;

    // Forzamos layout para obtener tamaño real del tooltip
    tip.style.display = "block";
    const tw = tip.offsetWidth || 160;
    const th = tip.offsetHeight || 90;
    tip.style.display = "";

    let xPos = xClient - hostRect.left + 12;
    let yPos = yClient - hostRect.top - 12;

    xPos = Math.max(8, Math.min(xPos, hostRect.width  - tw - 8));
    yPos = Math.max(8, Math.min(yPos, hostRect.height - th - 8));

    tip.style.left = xPos + "px";
    tip.style.top  = yPos + "px";
    tip.hidden = false;
  }

  hits.forEach(el => {
    const idx = Number(el.getAttribute("data-idx") || "0");
    el.addEventListener("mouseenter", (e) => showTip(idx, e));
    el.addEventListener("mousemove",  (e) => showTip(idx, e));
    el.addEventListener("mouseleave", () => hideTip());
  });
}

// ================================
// KPIs
// ================================
function fin_renderKpis_(rows){
  let sumN = 0, sumV = 0, sumU = 0, sumW = 0, cU = 0, cW = 0;

  for (const r of rows || []) {
    sumN += Number(r.monto_bruto_n || 0);
    sumV += Number(r.neto_ingreso_v || 0);

    const u = Number(r.retencion_cuotas_u);
    if (isFinite(u) && u !== 0) { sumU += u; cU++; }

    const w = Number(r.retencion_real_w);
    if (isFinite(w) && w !== 0) { sumW += w; cW++; }
  }

  const avgU = cU ? (sumU / cU) : 0;
  const avgW = cW ? (sumW / cW) : 0;

  const elN = fin_$id("kpiFinBrutoN");
  const elV = fin_$id("kpiFinNetoV");
  const elU = fin_$id("kpiFinRetU");
  const elW = fin_$id("kpiFinRetW");

  if (elN) elN.textContent = fin_fmtMoney(sumN);
  if (elV) elV.textContent = fin_fmtMoney(sumV);

  // U: promedio de retención por cuotas, SIN símbolo "%"
  if (elU) elU.textContent = fin_fmtRatioPlain(avgU);

  // W: promedio de retención real, multiplicado por 100 y con "%"
  if (elW) elW.textContent = fin_fmtPctFromUnit(avgW);
}
// ================================
// Alerts (Confirmaciones) desde rows de cashflow
// ================================
function fin_buildAlertsFromRows_(rows){
  const alerts = [];
  if (!Array.isArray(rows) || !rows.length) return alerts;

  // Hoy en YYYY-MM-DD (zona horaria del navegador)
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayYmd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  for (const r of rows){
    const iso = String(r.fecha_ingreso_iso || "").trim();
    if (!iso) continue;

    const ymd = iso.slice(0,10);
    const estado = String(r.estado_ingreso || "").toLowerCase();

    // Por ahora: solo alertamos pedidos con ingreso PENDIENTE
    const isPendiente = estado.includes("pend");

    // Y cuya fecha de ingreso <= hoy (ya debería haberse acreditado)
    const isVencidoOHOY = (ymd <= todayYmd);

    if (!isPendiente || !isVencidoOHOY) continue;

    const neto = Number(r.neto_ingreso_v || 0);
    const bruto = Number(r.monto_bruto_n || 0);

    let status;
    if (ymd < todayYmd) {
      status = "vencido";
    } else {
      status = "hoy";
    }

    alerts.push({
      id: String(r.id || ""),
      fecha_ingreso_iso: iso,
      estado_ingreso: String(r.estado_ingreso || ""),
      neto_ingreso_v: neto,
      monto_bruto_n: bruto,
      status
    });
  }

  // Orden: primero los más urgentes (vencidos), luego los de hoy, dentro de cada grupo por fecha asc
  alerts.sort((a, b) => {
    const rank = (st) => (st === "vencido" ? 0 : 1);
    const rA = rank(a.status);
    const rB = rank(b.status);
    if (rA !== rB) return rA - rB;
    const fa = a.fecha_ingreso_iso || "";
    const fb = b.fecha_ingreso_iso || "";
    return fa.localeCompare(fb);
  });

  return alerts;
}

function fin_renderAlertsList_(){
  const listEl = fin_$id("finAlertsList");
  const emptyEl = fin_$id("finAlertsEmpty");
  if (!listEl) return;

  const alerts = Array.isArray(FinanzasState.alerts) ? FinanzasState.alerts : [];

  // Reset
  listEl.innerHTML = "";

  if (!alerts.length){
    if (emptyEl) {
      emptyEl.style.display = "";
      // mantenemos el texto por defecto que ya viene del HTML
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  const frag = document.createDocumentFragment();

  // Helper local para formatear fecha y días de diferencia
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayYmd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function diffDias_(ymd){
    if (!ymd) return 0;
    const d = new Date(`${ymd}T00:00:00`);
    const t1 = new Date(`${todayYmd}T00:00:00`).getTime();
    const t2 = d.getTime();
    const diffMs = t1 - t2;
    return Math.round(diffMs / 86400000); // ms → días
  }

  alerts.forEach((a) => {
    const card = document.createElement("article");

    const iso = a.fecha_ingreso_iso ? String(a.fecha_ingreso_iso) : "";
    const ymd = iso ? iso.slice(0,10) : "";
    const dmy = ymd ? `${ymd.slice(8,10)}/${ymd.slice(5,7)}/${ymd.slice(0,4)}` : "-";

    const idClean = String(a.id || "");
    const idLabel = idClean
      ? (idClean.startsWith("#") ? idClean : `#${idClean}`)
      : "(sin ID)";

    const estadoIngresoRaw = (a.estado_ingreso || "").trim();
    const stLower = estadoIngresoRaw.toLowerCase();
    const isPend = stLower.includes("pend");
    const isProc = stLower.includes("proces");
    const isInt  = stLower.includes("inter");

    // Mapeo visual del estado de urgencia (status calculado en fin_buildAlertsFromRows_)
    let statusClass = "pendiente";
    let chipText    = "Pendiente";
    let metaMain    = `Ingreso previsto: ${dmy}`;

    if (a.status === "hoy") {
      statusClass = "hoy";
      chipText    = "Ingresa hoy";
      metaMain    = `Cobro a confirmar hoy (${dmy})`;
    } else if (a.status === "vencido") {
      statusClass = "vencido";
      chipText    = "Vencido";
      const diff = diffDias_(ymd);
      if (diff > 0) {
        metaMain = `Vencido hace ${diff} día${diff === 1 ? "" : "s"} (previsto ${dmy})`;
      } else {
        metaMain = `Vencido (previsto ${dmy})`;
      }
    }

    // Estado actual de ingreso (Z)
    const estadoLabel = estadoIngresoRaw || "Pendiente";

    // Clase raíz de la card según urgencia
    card.className = `finAlertCard finAlertCard--${statusClass}`;

    // Opciones del select (Z)
    const selPend = isPend ? "selected" : "";
    const selProc = isProc ? "selected" : "";
    const selInt  = isInt  ? "selected" : "";

    card.innerHTML = `
      <div class="finAlertCard__head">
        <div class="finAlertCard__title">Pedido ${idLabel}</div>
        <span class="finAlertCard__status finAlertCard__status--${statusClass}">
          ${chipText}
        </span>
      </div>

      <div class="finAlertCard__body">
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Ingreso previsto</span>
          <span class="finAlertCard__value">${dmy}</span>
        </div>

        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Neto estimado a ingresar</span>
          <span class="finAlertCard__value">${fin_fmtMoney(a.neto_ingreso_v)}</span>
        </div>

        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Bruto N</span>
          <span class="finAlertCard__value">${fin_fmtMoney(a.monto_bruto_n)}</span>
        </div>

        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Estado actual (Z)</span>
          <span class="finAlertCard__value">${estadoLabel}</span>
        </div>

        <div class="finAlertCard__row">
        <span class="finAlertCard__label">Cambiar estado</span>
        <span class="finAlertCard__value">
          <select
            class="finEstadoIngresoSelect"
            data-id="${idClean}"
            data-current="${estadoLabel}"
          >
            <option value="Pendiente" ${selPend}>Pendiente</option>
            <option value="Procesado" ${selProc}>Procesado</option>
            <option value="Intervenido" ${selInt}>Intervenido</option>
          </select>
        </span>
      </div>
      </div>

      <div class="finAlertCard__meta">
        <span class="finAlertMetaPill">${metaMain}</span>
        <span>Estado actual: ${estadoLabel}</span>
      </div>
    `;

    frag.appendChild(card);
  });

  listEl.appendChild(frag);
}
// ================================
// Render Historial (pestaña Historial)
// ================================
function fin_renderHistorial_(){
  const listEl = fin_$id("finAlertsHistoryList");
  if (!listEl) return;

  const items = Array.isArray(FinanzasState.history) ? FinanzasState.history : [];
  listEl.innerHTML = "";

  if (!items.length){
    listEl.innerHTML = `<div class="u-muted">Todavía no hay registros en el historial.</div>`;
    return;
  }

  // Tabla compacta de historial
  const table = document.createElement("table");
  table.className = "finHistTable";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Fecha</th>
        <th>ID Pedido</th>
        <th>Estado anterior</th>
        <th>Estado nuevo</th>
        <th>Actor</th>
        <th>Origen</th>
      </tr>
    </thead>
    <tbody>
      ${
        items.map(row => {
          // Intentamos cubrir varios nombres de columnas posibles
          const ts = row.timestamp || row.Timestamp || row["Timestamp"] || "";
          const id = row.id || row.id_pedido || row["ID Pedido"] || row.ID || "";
          const ea = row.estado_anterior || row.EstadoAnterior || row["Estado anterior"] || "";
          const en = row.estado_nuevo   || row.EstadoNuevo   || row["Estado nuevo"]   || "";
          const actor  = row.actor  || row.Actor  || "";
          const origen = row.origen || row.Origen || "";

          return `
            <tr>
              <td>${ts}</td>
              <td>${id}</td>
              <td>${ea}</td>
              <td>${en}</td>
              <td>${actor}</td>
              <td>${origen}</td>
            </tr>
          `;
        }).join("")
      }
    </tbody>
  `;

  listEl.appendChild(table);
}
// ================================
// Load + Render
// ================================
async function loadFinanzas_(fromIso, toIso){
  // skeleton en el MISMO contenedor del chart
  const host = fin_$id("finCashflowChart");
  if (host) host.innerHTML = FIN_SKELETON_HTML;

  try {
    const res = await fin_callSupabaseCashflow_(fromIso, toIso);
    const count = Array.isArray(res.rows) ? res.rows.length : 0;

    console.log("[finanzas] Supabase cashflow:", fromIso, "→", toIso, "| filas:", count);

    return res;
  } catch (supabaseError) {
    console.warn("[finanzas] Supabase falló. Usando fallback Apps Script.", supabaseError);

    const res = await fin_callBackend_("getCashflow", { from: fromIso, to: toIso });
    if (!res || !res.ok) throw new Error((res && res.error) ? res.error : "Backend error");

    fin_enforceBuild_(res);

    const count = Array.isArray(res.rows) ? res.rows.length : 0;
    console.log("[finanzas] fallback Apps Script:", fromIso, "→", toIso, "| filas:", count);

    return res;
  }
}

async function fin_loadStockCostsSummary_(fromIso, toIso){
  const res = await fin_callBackend_("getStockCostsSummary", {
    from: fromIso,
    to: toIso
  });
 
  if (!res || !res.ok) {
    throw new Error((res && res.error) ? res.error : "Backend error en getStockCostsSummary");
  }
 
  if (res.build) {
    console.log("[finanzas] stockCostsSummary build:", res.build);
  }
 
  return res;
 }


 async function fin_loadStockCostsSlideSummary_(fromIso, toIso){
  const res = await fin_callBackend_("getStockCostsSlideSummary", {
    from: fromIso,
    to: toIso
  });

  if (!res || !res.ok) {
    throw new Error((res && res.error) ? res.error : "Backend error en getStockCostsSlideSummary");
  }

  if (res.build) {
    console.log("[finanzas] stockCostsSlideSummary build:", res.build);
  }

  return res;
}

function renderFinanzas_(){
  // KPIs superiores
  fin_renderKpis_(FinanzasState.rows);

  // Series para el gráfico
  FinanzasState.series = fin_buildSeries_(FinanzasState.rows);

  // Construimos alerts a partir de las filas de cashflow
  FinanzasState.alerts = fin_buildAlertsFromRows_(FinanzasState.rows);

  // Gráfico principal
  fin_renderChart_(FinanzasState.series);

  // Etiqueta de rango
  const lbl = fin_$id("finRangeLabel");
  if (lbl && FinanzasState.fromIso && FinanzasState.toIso) {
    lbl.textContent = `Rango: ${FinanzasState.fromIso.slice(0,10)} → ${FinanzasState.toIso.slice(0,10)}`;
  }

  // Nota de pie
  const foot = fin_$id("finFootnote");
  if (foot) {
    foot.textContent = "Basado en columna Y (Fecha de ingreso) como fuente de verdad. Series por estado Z.";
  }

     // Renderizamos la lista de notificaciones y actualizamos badge
  fin_renderAlertsList_();
  fin_updateAlertsBadge_();

  // Rehidratamos la tarjeta visual del panel
  fin_renderStockDashboardCard_();

  // Rehidratamos la tarjeta de costos financieros sin forzar backend si el rango no cambió
  if (typeof window.finFinancialTopCardSync_ === "function") {
    window.finFinancialTopCardSync_();
  }

  // Si el slide de stock está abierto o ya fue montado, rehidratamos su contenido
  fin_renderStockSlide_();
 }

// ================================
// UI: Slide de notificaciones financieras
// ================================
function fin_updateAlertsBadge_(){
  const badge = fin_$id("finAlertsBadge");
  if (!badge) return;

  const count = Array.isArray(FinanzasState.alerts) ? FinanzasState.alerts.length : 0;

  if (count > 0) {
    badge.textContent = String(count);
    badge.classList.add("is-visible");
  } else {
    badge.textContent = "";
    badge.classList.remove("is-visible");
  }
}

function fin_openAlerts_(){
  const overlay = fin_$id("finAlertsOverlay");
  if (!overlay) return;
  overlay.style.display = "block";
  overlay.setAttribute("aria-hidden", "false");
}

function fin_closeAlerts_(){
  const overlay = fin_$id("finAlertsOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
}

function fin_setAlertsTab_(tab){
  const tabConf = fin_$id("finTabConfirmaciones");
  const tabHist = fin_$id("finTabHistorial");
  const panelConf = fin_$id("finPanelConfirmaciones");
  const panelHist = fin_$id("finPanelHistorial");

  if (!tabConf || !tabHist || !panelConf || !panelHist) return;

  const isConf = (tab === "confirmaciones");

  // Tabs
  tabConf.classList.toggle("is-active", isConf);
  tabHist.classList.toggle("is-active", !isConf);
  tabConf.setAttribute("aria-selected", isConf ? "true" : "false");
  tabHist.setAttribute("aria-selected", !isConf ? "true" : "false");

  // Panels
  panelConf.style.display = isConf ? "" : "none";
  panelHist.style.display = isConf ? "none" : "";
}

function fin_initAlertsUI_(){
  // Init ligero: solo estado inicial de tabs + badge.
  // El wiring real (click campanita, backdrop, tabs, ESC, selects)
  // se hace en wireFinanzasUI_ usando el nuevo overlay (.is-open).
  if (window.__finanzasAlertsInited) return;
  window.__finanzasAlertsInited = true;

  // Estado inicial: pestaña Confirmaciones activa
  fin_switchAlertsTab_("confirmaciones");
  fin_updateAlertsBadge_();
}

// ================================
// Helpers overlay / tabs alertas (nuevo overlay con clases .is-open)
// ================================
function fin_openAlertsOverlay_(){
  const overlay = fin_$id("finAlertsOverlay");
  if (!overlay) return;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
}

function fin_closeAlertsOverlay_(){
  const overlay = fin_$id("finAlertsOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

function fin_switchAlertsTab_(tabId){
  const tabConf = fin_$id("finTabConfirmaciones");
  const tabHist = fin_$id("finTabHistorial");
  const panelConf = fin_$id("finPanelConfirmaciones");
  const panelHist = fin_$id("finPanelHistorial");

  const isConf = (tabId === "confirmaciones");

  if (tabConf){
    tabConf.classList.toggle("is-active", isConf);
    tabConf.setAttribute("aria-selected", isConf ? "true" : "false");
  }
  if (tabHist){
    tabHist.classList.toggle("is-active", !isConf);
    tabHist.setAttribute("aria-selected", !isConf ? "true" : "false");
  }

  if (panelConf){
    panelConf.style.display = isConf ? "" : "none";
  }
  if (panelHist){
    panelHist.style.display = isConf ? "none" : "";
  }
}
// ================================
// Modal de confirmación de cambio de estado (Finanzas)
// ================================
const FinConfirmState = {
  pending: null // { id, prevEstado, nuevoEstado, selectEl }
};

function fin_openConfirmModal_(ctx){
  const modal = fin_$id("finConfirmModal");
  if (!modal) return;

  FinConfirmState.pending = ctx || null;

  const idTxt   = ctx && ctx.id ? (String(ctx.id).startsWith("#") ? String(ctx.id) : `#${ctx.id}`) : "(sin ID)";
  const prevTxt = ctx && ctx.prevEstado ? ctx.prevEstado : "Pendiente";
  const newTxt  = ctx && ctx.nuevoEstado ? ctx.nuevoEstado : "Pendiente";

  const elPedido = fin_$id("finConfirmPedido");
  const elPrev   = fin_$id("finConfirmEstadoAnterior");
  const elNuevo  = fin_$id("finConfirmEstadoNuevo");

  if (elPedido) elPedido.textContent = idTxt;
  if (elPrev)   elPrev.textContent   = prevTxt;
  if (elNuevo)  elNuevo.textContent  = newTxt;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function fin_closeConfirmModal_(opts){
  const modal = fin_$id("finConfirmModal");
  if (!modal) return;

  const resetSelect = opts && opts.resetSelect;
  const ctx = FinConfirmState.pending;

  if (resetSelect && ctx && ctx.selectEl) {
    // Volvemos visualmente al estado anterior
    ctx.selectEl.value = ctx.prevEstado || "Pendiente";
  }

  FinConfirmState.pending = null;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function fin_setConfirmLoading_(isLoading, ctx){
  const finBtnConfirm = fin_$id("finConfirmOk");
  const sel = ctx && ctx.selectEl ? ctx.selectEl : null;

  if (isLoading) {
    if (sel) sel.disabled = true;
    if (finBtnConfirm){
      finBtnConfirm.disabled = true;
      finBtnConfirm.classList.add("is-loading");
    }
  } else {
    if (sel) sel.disabled = false;
    if (finBtnConfirm){
      finBtnConfirm.disabled = false;
      finBtnConfirm.classList.remove("is-loading");
    }
  }
}
// ================================
// Wire UI
// ================================
function wireFinanzasUI_(){
  // Filtro de fechas
  const btn = fin_$id("btnApplyFin");

  // ---------- UI Slide Costos de stock ----------
  const btnStockSlide  = fin_$id("btnFinCostStock");
  const stockBackdrop  = fin_$id("finStockBackdrop");

  // ---------- UI Slide Costos financieros ----------
  const btnFinancialSlide = fin_$id("btnFinCostFinancial");
  const financialBackdrop = fin_$id("finFinancialBackdrop");

 if (btnStockSlide && !btnStockSlide.__wiredStockSlide) {
   btnStockSlide.__wiredStockSlide = true;

   btnStockSlide.addEventListener("click", () => {
     fin_openStockSlide_();
   });

   btnStockSlide.addEventListener("keydown", (ev) => {
     if (ev.key === "Enter" || ev.key === " ") {
       ev.preventDefault();
       fin_openStockSlide_();
     }
   });
 }

 if (stockBackdrop && !stockBackdrop.__wiredStockSlide) {
   stockBackdrop.__wiredStockSlide = true;
   stockBackdrop.addEventListener("click", () => {
     fin_closeStockSlide_();
   });
 }
 if (btnFinancialSlide && !btnFinancialSlide.__wiredFinancialSlide) {
  btnFinancialSlide.__wiredFinancialSlide = true;

  btnFinancialSlide.addEventListener("click", () => {
    fin_openFinancialSlide_();
  });

  btnFinancialSlide.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      fin_openFinancialSlide_();
    }
  });
}

if (financialBackdrop && !financialBackdrop.__wiredFinancialSlide) {
  financialBackdrop.__wiredFinancialSlide = true;
  financialBackdrop.addEventListener("click", () => {
    fin_closeFinancialSlide_();
  });
}
  if (btn && !btn.__wired) {
    btn.__wired = true;
    btn.addEventListener("click", async () => {
      const inFromEl = fin_$id("finDtFrom");
      const inToEl   = fin_$id("finDtTo");

      const dFrom = inFromEl ? inFromEl.value : "";
      const dTo   = inToEl   ? inToEl.value   : "";

      const { fromIso, toIso } = fin_dateToIsoRange_(dFrom, dTo);

      console.log("[finanzas] aplicar rango", { dFrom, dTo, fromIso, toIso });

      // guard básico: si el rango es inválido, mostramos mensaje en vez de quedarnos callados
      if (!fromIso || !toIso) {
        const host = fin_$id("finCashflowChart");
        if (host) {
          host.innerHTML = `<div class="u-muted">Selecciona un rango de fechas válido para actualizar el cashflow.</div>`;
        }
        return;
      }

      // Si el rango es EXACTAMENTE el mismo que el cacheado, no pegamos al backend.
      // Esto no rompe nada y evita sorpresas si algo raro pasa con la cache.
      const cache = window.__FINANZAS_CACHE__;
      if (
        cache &&
        cache.res &&
        cache.from === fromIso &&
        cache.to   === toIso
      ) {
        console.log("[finanzas] rango idéntico al cache, solo re-render");
        FinanzasState.fromIso = cache.from;
        FinanzasState.toIso   = cache.to;
        FinanzasState.rows    = Array.isArray(cache.res.rows) ? cache.res.rows : [];
        FinanzasState.stockCostsSummary = cache.stockCostsSummary || null;
        FinanzasState.stockCostsSlideSummary = cache.stockCostsSlideSummary || null;
        renderFinanzas_();
        return;
      }

      // Actualizamos estado con el nuevo rango
      // Actualizamos estado con el nuevo rango
FinanzasState.fromIso = fromIso;
FinanzasState.toIso   = toIso;

FinanzasState.stockSlideRangeMode = "panel";
FinanzasState.stockSlideFromIso = "";
FinanzasState.stockSlideToIso = "";

      try {
        const [res, stockRes, stockSlideRes] = await Promise.all([
          loadFinanzas_(fromIso, toIso),
          fin_loadStockCostsSummary_(fromIso, toIso),
          fin_loadStockCostsSlideSummary_(fromIso, toIso)
        ]);
      
        FinanzasState.rows = Array.isArray(res.rows) ? res.rows : [];
        FinanzasState.history = Array.isArray(res.history) ? res.history : [];
        FinanzasState.stockCostsSummary = stockRes || null;
        FinanzasState.stockCostsSlideSummary = stockSlideRes || null;
      
        window.__FINANZAS_CACHE__ = {
          from: fromIso,
          to: toIso,
          res,
          stockCostsSummary: stockRes || null,
          stockCostsSlideSummary: stockSlideRes || null
        };
      
        renderFinanzas_();
      } catch (e) {
        console.error("[finanzas] error al cargar rango", e);
        const host = fin_$id("finCashflowChart");
        if (host) host.innerHTML = `<div class="u-muted">Error: ${String(e.message || e)}</div>`;
      }
    });
  }

  // ---------- UI Alerts (slide Finanzas) ----------
  const btnAlerts   = fin_$id("btnFinAlerts");
  const overlay     = fin_$id("finAlertsOverlay");
  const backdrop    = fin_$id("finAlertsBackdrop");
  const btnClose    = fin_$id("finAlertsClose");
  const tabConf     = fin_$id("finTabConfirmaciones");
  const tabHist     = fin_$id("finTabHistorial");

   // Botón campanita
   if (btnAlerts && !btnAlerts.__wired) {
    btnAlerts.__wired = true;
    btnAlerts.addEventListener("click", () => {
      console.log("[finanzas] click campanita", {
        overlay: !!fin_$id("finAlertsOverlay")
      });
      fin_openAlertsOverlay_();
      // Por defecto siempre abrimos en "Confirmaciones"
      fin_switchAlertsTab_("confirmaciones");
    });
  }

  // Backdrop
  if (backdrop && !backdrop.__wired) {
    backdrop.__wired = true;
    backdrop.addEventListener("click", () => {
      fin_closeAlertsOverlay_();
    });
  }

  // Botón cerrar (X)
  if (btnClose && !btnClose.__wired) {
    btnClose.__wired = true;
    btnClose.addEventListener("click", () => {
      fin_closeAlertsOverlay_();
    });
  }

  // Tabs: Confirmaciones
  if (tabConf && !tabConf.__wired) {
    tabConf.__wired = true;
    tabConf.addEventListener("click", () => {
      fin_switchAlertsTab_("confirmaciones");
    });
  }

  // Tabs: Historial (SPA-safe + fetch explícito)
  if (tabHist && !tabHist.__wired) {
    tabHist.__wired = true;
    tabHist.addEventListener("click", () => {
      // Cambiamos la pestaña visualmente dentro del slide
      fin_switchAlertsTab_("historial");
      // Cargamos/recargamos el historial para el rango actual
      finHist_fetch();
    });
  }

  // Cerrar overlays con ESC (solo se cablea una vez)
  if (!window.__FIN_GLOBAL_ESC_WIRED__) {
    window.__FIN_GLOBAL_ESC_WIRED__ = true;
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        fin_closeAlertsOverlay_();
        fin_closeStockSlide_();
        fin_closeFinancialSlide_();
      }
    });
  }

 // Botón cerrar del slide de stock (delegado porque el partial se inyecta después)
 const stockPanelMount = fin_$id("finStockPanelMount");
 if (stockPanelMount && !stockPanelMount.__wiredCloseStock) {
   stockPanelMount.__wiredCloseStock = true;

   stockPanelMount.addEventListener("click", (ev) => {
     const target = ev.target;
     if (!(target instanceof HTMLElement)) return;

     if (target.closest("#finStockClose")) {
       fin_closeStockSlide_();
     }
   });
 }

  // ---------- Modal de confirmación (Finanzas) ----------
  const finModal       = fin_$id("finConfirmModal");
  const finModalBack   = fin_$id("finConfirmBackdrop");
  const finBtnConfirm  = fin_$id("finConfirmOk");
  const finBtnCancel   = fin_$id("finConfirmCancel");

  // Botón "Volver"
  if (finBtnCancel && !finBtnCancel.__wired) {
    finBtnCancel.__wired = true;
    finBtnCancel.addEventListener("click", () => {
      fin_closeConfirmModal_({ resetSelect: true });
    });
  }

  // Backdrop del modal
  if (finModalBack && !finModalBack.__wired) {
    finModalBack.__wired = true;
    finModalBack.addEventListener("click", () => {
      fin_closeConfirmModal_({ resetSelect: true });
    });
  }

     // Botón "Confirmar"
  if (finBtnConfirm && !finBtnConfirm.__wired) {
    finBtnConfirm.__wired = true;
    finBtnConfirm.addEventListener("click", async () => {
      const ctx = FinConfirmState.pending;
      if (!ctx || !ctx.selectEl) {
        fin_closeConfirmModal_({ resetSelect: false });
        return;
      }

      const sel = ctx.selectEl;
      const MIN_LOAD_MS = 1500;
      const t0 = performance.now();

      // Estado de carga: barra interna en el botón durante al menos 1.5s
      fin_setConfirmLoading_(true, ctx);

      try {
        const res = await fin_updateIngresoEstado_(
          ctx.id,
          ctx.nuevoEstado,
          "panel-web",
          "slide-confirmaciones"
        );

        if (!res || !res.ok) {
          console.error("[finanzas] fallo updateIngresoEstado", res);
          // Volvemos al estado anterior si algo sale mal
          sel.value = ctx.prevEstado || "Pendiente";
        } else {
          // Éxito: el patch local + renderFinanzas_ ya se encarga
          sel.setAttribute("data-current", ctx.nuevoEstado);
        }
      } catch (err) {
        console.error("[finanzas] error al actualizar estado de ingreso", err);
        sel.value = ctx.prevEstado || "Pendiente";
      } finally {
        const elapsed = performance.now() - t0;

        const finish = () => {
          // Apagamos loading y cerramos modal
          fin_setConfirmLoading_(false, ctx);
          fin_closeConfirmModal_({ resetSelect: false });
        };

        if (elapsed < MIN_LOAD_MS) {
          setTimeout(finish, MIN_LOAD_MS - elapsed);
        } else {
          finish();
        }
      }
    });
  }

    // ------------------------------
  // Delegado: selects de estado de ingreso en slide Confirmaciones
  // HTML esperado: <select class="finEstadoIngresoSelect" data-id="..." data-current="...">...</select>
  // ------------------------------
  const panelConf = fin_$id("finPanelConfirmaciones");
  if (panelConf && !panelConf.__wiredEstados) {
    panelConf.__wiredEstados = true;

    panelConf.addEventListener("change", (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.classList.contains("finEstadoIngresoSelect")) return;

      const id           = target.getAttribute("data-id") || "";
      const nuevoEstado  = target.value || "";
      const prevEstado   = target.getAttribute("data-current") || "";

      if (!id || !nuevoEstado) return;

      // Si el usuario vuelve a elegir el mismo estado, no hacemos nada
      if (nuevoEstado === prevEstado) return;

      // Creamos el contexto pendiente y abrimos el modal de confirmación
      const ctx = {
        id,
        prevEstado: prevEstado || "Pendiente",
        nuevoEstado,
        selectEl: target
      };

      fin_openConfirmModal_(ctx);
    });
  }
}

// ================================
// Delegado global para campanita (SPA-safe)
// ================================
document.addEventListener("click", (ev) => {
  // Solo nos interesa cuando la página actual lógica es "finanzas"
  const page = document.body ? document.body.getAttribute("data-page") : "";
  if (page !== "finanzas") return;

  const target = ev.target;
  if (!target) return;

  // Soportamos click directo en el botón o en algún hijo
  const btn = target.closest ? target.closest("#btnFinAlerts") : null;
  if (!btn) return;

  // Evitamos que algún otro handler se coma el click
  ev.preventDefault();
  ev.stopPropagation();

  console.log("[finanzas] delegado global campanita (SPA-safe)");

  fin_openAlertsOverlay_();
  fin_switchAlertsTab_("confirmaciones");
});

function setDefaultRange_(){
  // Por defecto: últimos 30 días (inclusive hoy)
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // hoy 00:00
  const start = new Date(end);
  // últimos 30 días = hoy y los 29 días anteriores
  start.setDate(start.getDate() - 29);

  const pad = (n) => String(n).padStart(2, "0");

  const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const to   = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;

  const inFrom = fin_$id("finDtFrom");
  const inTo   = fin_$id("finDtTo");

  // Solo seteamos si el input está vacío (respeta cache SPA)
  if (inFrom && !inFrom.value) inFrom.value = from;
  if (inTo   && !inTo.value)   inTo.value   = to;

  const { fromIso, toIso } = fin_dateToIsoRange_(from, to);
  FinanzasState.fromIso = fromIso;
  FinanzasState.toIso   = toIso;
}

/**
 * Rehidrata los inputs de fecha a partir del estado/cache actual.
 * Convierte ISO "yyyy-mm-ddThh:mm:ss-03:00" a "yyyy-mm-dd" para <input type="date">.
 */
function fin_syncDateInputsFromState_(){
  const inFrom = fin_$id("finDtFrom");
  const inTo   = fin_$id("finDtTo");
  if (!inFrom && !inTo) return;

  const cache = window.__FINANZAS_CACHE__ || {};
  const fromIso = FinanzasState.fromIso || cache.from || "";
  const toIso   = FinanzasState.toIso   || cache.to   || "";

  if (inFrom && fromIso) {
    inFrom.value = fin_isoToYmd_(fromIso);
  }
  if (inTo && toIso) {
    inTo.value = fin_isoToYmd_(toIso);
  }
}
function fin_getGlobalRange_(){
  const g = window.__SAZZU_GLOBAL_RANGE__;
  if (!g || !g.from || !g.to) return null;
  return {
    from: String(g.from),
    to: String(g.to)
  };
}

// ================================
// Slide · Costos de stock
// ================================

function fin_startOfTodayIso_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00-03:00`;
}

function fin_endOfTodayIso_() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T23:59:59-03:00`;
}

function fin_getWeekRangeIso_() {
  const now = new Date();
  const day = now.getDay(); // 0 dom, 1 lun...
  const diffToMonday = day === 0 ? 6 : day - 1;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - diffToMonday);

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sy = start.getFullYear();
  const sm = String(start.getMonth() + 1).padStart(2, "0");
  const sd = String(start.getDate()).padStart(2, "0");

  const ey = end.getFullYear();
  const em = String(end.getMonth() + 1).padStart(2, "0");
  const ed = String(end.getDate()).padStart(2, "0");

  return {
    fromIso: `${sy}-${sm}-${sd}T00:00:00-03:00`,
    toIso: `${ey}-${em}-${ed}T23:59:59-03:00`
  };
}

function fin_getMonthRangeIso_() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sy = start.getFullYear();
  const sm = String(start.getMonth() + 1).padStart(2, "0");
  const sd = String(start.getDate()).padStart(2, "0");

  const ey = end.getFullYear();
  const em = String(end.getMonth() + 1).padStart(2, "0");
  const ed = String(end.getDate()).padStart(2, "0");

  return {
    fromIso: `${sy}-${sm}-${sd}T00:00:00-03:00`,
    toIso: `${ey}-${em}-${ed}T23:59:59-03:00`
  };
}

function fin_getEffectiveStockSlideRange_() {
  if (
    FinanzasState.stockSlideRangeMode &&
    FinanzasState.stockSlideRangeMode !== "panel" &&
    FinanzasState.stockSlideFromIso &&
    FinanzasState.stockSlideToIso
  ) {
    return {
      fromIso: FinanzasState.stockSlideFromIso,
      toIso: FinanzasState.stockSlideToIso
    };
  }

  return {
    fromIso: FinanzasState.fromIso,
    toIso: FinanzasState.toIso
  };
}

function fin_syncStockSlideDateInputs_() {
  const fromEl = fin_$id("finStockDateFrom");
  const toEl = fin_$id("finStockDateTo");
  if (!fromEl || !toEl) return;

  const range = fin_getEffectiveStockSlideRange_();
  fromEl.value = fin_isoToYmd_(range.fromIso || "");
  toEl.value = fin_isoToYmd_(range.toIso || "");
}

function fin_applyStockSlideRangeUi_() {
  const slideRoot = document.querySelector(".finStockSlide");
  if (!slideRoot) return;

  const mode = String(FinanzasState.stockSlideRangeMode || "panel").toLowerCase();
  const isDropdownOpen = FinanzasState.stockSlideDateDropdownOpen === true;
  const dateTabs = slideRoot.querySelectorAll("[data-fin-stock-range]");
  const dateBar = fin_$id("finStockDateBar");

  dateTabs.forEach((btn) => {
    const key = String(btn.getAttribute("data-fin-stock-range") || "").trim().toLowerCase();
    const isActive = key === mode;

    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  if (dateBar) {
    dateBar.hidden = !isDropdownOpen;
  }

  fin_syncStockSlideDateInputs_();
}

async function fin_refreshStockSlideByRange_(fromIso, toIso, mode) {
  const res = await fin_loadStockCostsSlideSummary_(fromIso, toIso);
  FinanzasState.stockCostsSlideSummary = res || null;
  FinanzasState.stockSlideFromIso = fromIso;
  FinanzasState.stockSlideToIso = toIso;
  FinanzasState.stockSlideRangeMode = mode || "custom";
  fin_renderStockSlide_();
}

async function fin_handleStockSlideRangeChange_(mode) {
  const key = String(mode || "").trim().toLowerCase();

  if (key === "custom") {
    FinanzasState.stockSlideRangeMode = "custom";
    FinanzasState.stockSlideDateDropdownOpen = true;
    fin_applyStockSlideRangeUi_();
    return;
  }

  if (key === "today") {
    FinanzasState.stockSlideRangeMode = "today";
    FinanzasState.stockSlideDateDropdownOpen = false;
    fin_applyStockSlideRangeUi_();

    await fin_refreshStockSlideByRange_(
      fin_startOfTodayIso_(),
      fin_endOfTodayIso_(),
      "today"
    );
    return;
  }

  if (key === "week") {
    const range = fin_getWeekRangeIso_();

    FinanzasState.stockSlideRangeMode = "week";
    FinanzasState.stockSlideDateDropdownOpen = false;
    fin_applyStockSlideRangeUi_();

    await fin_refreshStockSlideByRange_(range.fromIso, range.toIso, "week");
    return;
  }

  if (key === "month") {
    const range = fin_getMonthRangeIso_();

    FinanzasState.stockSlideRangeMode = "month";
    FinanzasState.stockSlideDateDropdownOpen = false;
    fin_applyStockSlideRangeUi_();

    await fin_refreshStockSlideByRange_(range.fromIso, range.toIso, "month");
    return;
  }

  FinanzasState.stockSlideRangeMode = "panel";
  FinanzasState.stockSlideFromIso = "";
  FinanzasState.stockSlideToIso = "";
  FinanzasState.stockSlideDateDropdownOpen = false;
  fin_applyStockSlideRangeUi_();
}
function fin_bindStockSlideDateTabs_() {
  const slideRoot = document.querySelector(".finStockSlide");
  if (!slideRoot) return;

  const wrap = slideRoot.querySelector("[data-fin-stock-date-tabs]");
  if (!wrap) return;

  if (wrap.dataset.finStockDateTabsBound === "1") return;
  wrap.dataset.finStockDateTabsBound = "1";

  wrap.addEventListener("click", async function (event) {
    const btn = event.target.closest("[data-fin-stock-range]");
    if (!btn) return;

    const mode = String(btn.getAttribute("data-fin-stock-range") || "").trim().toLowerCase();
    if (!mode) return;

    try {
      await fin_handleStockSlideRangeChange_(mode);
    } catch (err) {
      console.error("[finanzas] error al cambiar rango del slide", err);
    }
  });
}

function fin_bindStockSlideDateBar_() {
  const applyBtn = fin_$id("finStockDateApply");
  const cancelBtn = fin_$id("finStockDateCancel");

  if (applyBtn && !applyBtn.__wiredStockDateApply) {
    applyBtn.__wiredStockDateApply = true;

    applyBtn.addEventListener("click", async () => {
      const fromEl = fin_$id("finStockDateFrom");
      const toEl = fin_$id("finStockDateTo");

      const fromYmd = fromEl ? fromEl.value : "";
      const toYmd = toEl ? toEl.value : "";

      if (!fromYmd || !toYmd) return;

      const range = fin_dateToIsoRange_(fromYmd, toYmd);

      try {
        fin_setStockDateApplyLoading_(true);

        // dejamos visible la carga al menos 3 segundos
        await new Promise(resolve => setTimeout(resolve, 3000));

        // recién ahora cerramos el desplegable
        FinanzasState.stockSlideDateDropdownOpen = false;
        fin_applyStockSlideRangeUi_();

        await fin_refreshStockSlideByRange_(range.fromIso, range.toIso, "custom");
      } catch (err) {
        console.error("[finanzas] error al aplicar rango personalizado del slide", err);
      } finally {
        fin_setStockDateApplyLoading_(false);
      }
    });
  }

  if (cancelBtn && !cancelBtn.__wiredStockDateCancel) {
    cancelBtn.__wiredStockDateCancel = true;

    cancelBtn.addEventListener("click", () => {
      fin_syncStockSlideDateInputs_();
      FinanzasState.stockSlideDateDropdownOpen = false;
      fin_applyStockSlideRangeUi_();
    });
  }
}

function fin_setStockDateApplyLoading_(isLoading) {
  const applyBtn = fin_$id("finStockDateApply");
  if (!applyBtn) return;

  if (isLoading) {
    applyBtn.disabled = true;
    applyBtn.classList.add("is-loading");
    applyBtn.setAttribute("data-label", applyBtn.textContent || "Aplicar");
    applyBtn.textContent = "Aplicando";
    return;
  }

  applyBtn.disabled = false;
  applyBtn.classList.remove("is-loading");
  applyBtn.textContent = applyBtn.getAttribute("data-label") || "Aplicar";
}

/* ======= INICIO · FINANZAS · TABS DEL SLIDE COSTOS DE STOCK ======= */

function fin_getStockSlideActiveTab_() {
  if (typeof FinanzasState === "object" && FinanzasState) {
    const current = String(FinanzasState.stockSlideActiveTab || "").trim().toLowerCase();
    if (current === "operativo") return "operativo";
  }
  return "stock";
}

function fin_setStockSlideActiveTab_(tabKey) {
  const normalized = String(tabKey || "").trim().toLowerCase() === "operativo"
    ? "operativo"
    : "stock";

  if (typeof FinanzasState === "object" && FinanzasState) {
    FinanzasState.stockSlideActiveTab = normalized;
  }

  return normalized;
}

function fin_getStockSlideTooltipCopy_(tabKey) {
  if (tabKey === "operativo") {
    return {
      title: "Costo operativo",
      text: "Costos derivados de mover, despachar y operar el flujo de stock y venta."
    };
  }

  return {
    title: "Costos de stock",
    text: "Costo económico de la mercadería consumida en el rango seleccionado."
  };
}

function fin_applyStockSlideTabState_(root, forcedTab) {
  const slideRoot = root || document.querySelector(".finStockSlide");
  if (!slideRoot) return;

  const activeTab = fin_setStockSlideActiveTab_(forcedTab || fin_getStockSlideActiveTab_());

  const tabButtons = slideRoot.querySelectorAll("[data-fin-stock-tab]");
  const tabPanels = slideRoot.querySelectorAll("[data-fin-stock-panel]");

  tabButtons.forEach((btn) => {
    const key = String(btn.getAttribute("data-fin-stock-tab") || "").trim().toLowerCase();
    const isActive = key === activeTab;

    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  tabPanels.forEach((panel) => {
    const key = String(panel.getAttribute("data-fin-stock-panel") || "").trim().toLowerCase();
    const isActive = key === activeTab;

    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
    panel.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  const tooltipTitleNode = slideRoot.querySelector("[data-fin-stock-tooltip-title]");
  const tooltipTextNode = slideRoot.querySelector("[data-fin-stock-tooltip-text]");
  const tooltip = fin_getStockSlideTooltipCopy_(activeTab);

  if (tooltipTitleNode) tooltipTitleNode.textContent = tooltip.title;
  if (tooltipTextNode) tooltipTextNode.textContent = tooltip.text;
}

function fin_bindStockSlideTabs_(root) {
  const slideRoot = root || document.querySelector(".finStockSlide");
  if (!slideRoot) return;

  const tabsWrap = slideRoot.querySelector("[data-fin-stock-tabs]");
  if (!tabsWrap) return;

  if (tabsWrap.dataset.finStockTabsBound === "1") return;
  tabsWrap.dataset.finStockTabsBound = "1";

  tabsWrap.addEventListener("click", function (event) {
    const tabBtn = event.target.closest("[data-fin-stock-tab]");
    if (!tabBtn) return;

    const nextTab = String(tabBtn.getAttribute("data-fin-stock-tab") || "").trim().toLowerCase();
    if (!nextTab) return;

    fin_applyStockSlideTabState_(slideRoot, nextTab);
  });

  tabsWrap.addEventListener("keydown", function (event) {
    const tabBtn = event.target.closest("[data-fin-stock-tab]");
    if (!tabBtn) return;

    const isEnter = event.key === "Enter";
    const isSpace = event.key === " " || event.key === "Spacebar";

    if (!isEnter && !isSpace) return;

    event.preventDefault();

    const nextTab = String(tabBtn.getAttribute("data-fin-stock-tab") || "").trim().toLowerCase();
    if (!nextTab) return;

    fin_applyStockSlideTabState_(slideRoot, nextTab);
  });
}

function fin_initStockSlideTabs_() {
  const slideRoot = document.querySelector(".finStockSlide");
  if (!slideRoot) return;

  fin_bindStockSlideTabs_(slideRoot);
  fin_applyStockSlideTabState_(slideRoot, fin_getStockSlideActiveTab_());

  fin_bindStockSlideDateTabs_();
  fin_bindStockSlideDateBar_();
  fin_applyStockSlideRangeUi_();
}

// ================================
// Slide · Costos de stock
// ================================



function fin_fmtCompactRatio_(n){
  const x = Number(n || 0);
  if (!isFinite(x)) return "0.00x";
  return `${x.toLocaleString("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}x`;
}

function fin_fmtPctPlain_(n){
  const x = Number(n || 0);
  if (!isFinite(x)) return "0%";
  return `${x.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function fin_getHealthMeta_(label){
  const txt = String(label || "").trim();

  if (/sana/i.test(txt)) {
    return { className: "is-good", text: txt };
  }
  if (/moderada/i.test(txt)) {
    return { className: "is-warn", text: txt };
  }
  if (/tensionado/i.test(txt)) {
    return { className: "is-bad", text: txt };
  }
  return { className: "", text: txt || "Sin actividad" };
}

function fin_buildStockDashboardSparklineSvg_(seriesDaily){
  const data = Array.isArray(seriesDaily) ? seriesDaily : [];
  if (!data.length) {
    return `<div class="finCostStock21__chartEmpty"></div>`;
  }

  const values = data.map(item => Number(item.costo_prorrateado || 0));
  const width = 220;
  const height = 72;
  const padX = 8;
  const padY = 8;
  const innerW = width - (padX * 2);
  const innerH = height - (padY * 2);

  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const span = Math.max(1, maxVal - minVal);

  function xAt(i){
    if (values.length === 1) return padX + (innerW / 2);
    return padX + (i * (innerW / (values.length - 1)));
  }

  function yAt(v){
    const norm = (v - minVal) / span;
    return padY + innerH - (norm * innerH);
  }

  const pts = values.map((v, i) => ({
    x: xAt(i),
    y: yAt(v)
  }));

  if (!pts.length) {
    return `<div class="finCostStock21__chartEmpty"></div>`;
  }

  let linePath = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="finCostStockSparkline" aria-label="Tendencia del costo consumido prorrateado">
      <defs>
        <linearGradient id="finCostStockSparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(36,121,255,0.30)"></stop>
          <stop offset="100%" stop-color="rgba(36,121,255,0)"></stop>
        </linearGradient>
      </defs>

      <path d="${areaPath}" fill="url(#finCostStockSparkArea)"></path>
      <path d="${linePath}" class="finCostStockSparkline__line"></path>
    </svg>
  `;
}

function fin_getStockTrendMeta_(comparison){
  const cmp = comparison || {};
  const pct = Number(cmp.variation_pct || 0);
  const dir = String(cmp.variation_direction || "flat").toLowerCase();
 
  if (dir === "up") {
    return {
      className: "is-up",
      pctText: `${Math.abs(pct).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`,
      label: "vs período anterior"
    };
  }
 
  if (dir === "down") {
    return {
      className: "is-down",
      pctText: `-${Math.abs(pct).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`,
      label: "vs período anterior"
    };
  }
 
  return {
    className: "is-neutral",
    pctText: "0%",
    label: "sin variación"
  };
 }
 
 function fin_buildStockSparklineSvg_(seriesDaily){
  const data = Array.isArray(seriesDaily) ? seriesDaily : [];
  if (!data.length) {
    return `
      <div class="finStockHeroCard__empty">
        No hay puntos suficientes para construir el gráfico del período.
      </div>
    `;
  }
 
  const values = data.map(item => Number(item.costo_prorrateado || 0));
  const width = 260;
  const height = 110;
  const padX = 6;
  const padY = 8;
  const innerW = width - (padX * 2);
  const innerH = height - (padY * 2);
 
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const span = Math.max(1, maxVal - minVal);
 
  function xAt(i){
    if (values.length === 1) return padX + innerW / 2;
    return padX + (i * (innerW / (values.length - 1)));
  }
 
  function yAt(v){
    const norm = (v - minVal) / span;
    return padY + innerH - (norm * innerH);
  }
 
  const pts = values.map((v, i) => ({
    x: xAt(i),
    y: yAt(v),
    v
  }));
 
  let linePath = "";
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    linePath += (i === 0)
      ? `M ${p.x} ${p.y}`
      : ` L ${p.x} ${p.y}`;
  }
 
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;
 
  return `
    <svg viewBox="0 0 ${width} ${height}" class="finStockSparkline" aria-label="Serie diaria de costo consumido prorrateado">
      <defs>
        <linearGradient id="finStockSparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(34,197,94,0.34)"></stop>
          <stop offset="100%" stop-color="rgba(34,197,94,0)"></stop>
        </linearGradient>
      </defs>
 
      <path d="${areaPath}" fill="url(#finStockSparkArea)"></path>
      <path
        d="${linePath}"
        fill="none"
        stroke="#22C55E"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
  `;
 }

 async function fin_ensureFinancialSlidePartial_(){
  const mount = fin_$id("finFinancialPanelMount");
  if (!mount) return false;

  if (mount.getAttribute("data-loaded") === "true") {
    if (window.finFinancialSlideModule && typeof window.finFinancialSlideModule.refresh === "function") {
      window.finFinancialSlideModule.refresh();
    }
    return true;
  }

  mount.innerHTML = `
    <div class="finFinancialPanel__loading">
      <div class="u-muted">Cargando slide de costos financieros.</div>
    </div>
  `;

  try {
    const res = await fetch(FIN_FINANCIAL_SLIDE_PARTIAL_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar el partial del slide financiero");

    const html = await res.text();
    mount.innerHTML = html;
    mount.setAttribute("data-loaded", "true");

    if (window.finFinancialSlideModule && typeof window.finFinancialSlideModule.init === "function") {
      window.finFinancialSlideModule.init();
    }

    return true;
  } catch (err) {
    console.error("[finanzas] error cargando partial de costos financieros", err);
    mount.innerHTML = `
      <div class="finFinancialPanel__loading">
        <div class="u-muted">No se pudo cargar el slide de costos financieros.</div>
      </div>
    `;
    return false;
  }
}

async function fin_openFinancialSlide_(){
  const overlay = fin_$id("finFinancialOverlay");
  if (!overlay) return;

  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

  const ok = await fin_ensureFinancialSlidePartial_();
  if (!ok) return;

  if (window.finFinancialSlideModule && typeof window.finFinancialSlideModule.open === "function") {
    window.finFinancialSlideModule.open();
  }
}

function fin_closeFinancialSlide_(){
  const overlay = fin_$id("finFinancialOverlay");
  if (!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  if (window.finFinancialSlideModule && typeof window.finFinancialSlideModule.close === "function") {
    window.finFinancialSlideModule.close();
  }
}

window.fin_openFinancialSlide_ = fin_openFinancialSlide_;
window.fin_closeFinancialSlide_ = fin_closeFinancialSlide_;

async function fin_ensureStockSlidePartial_(){
  const mount = fin_$id("finStockPanelMount");
  if (!mount) return false;
 
  if (mount.getAttribute("data-loaded") === "true") {
    return true;
  }
 
  mount.innerHTML = `
    <div class="finStockPanel__loading">
      <div class="u-muted">Cargando slide de costos de stock...</div>
    </div>
  `;
 
  try {
    const res = await fetch(FIN_STOCK_SLIDE_PARTIAL_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar el partial del slide");
 
    const html = await res.text();
    mount.innerHTML = html;
    mount.setAttribute("data-loaded", "true");

    fin_initStockSlideTabs_();
    fin_renderStockSlide_();
    return true;
  } catch (err) {
    console.error("[finanzas] error cargando partial de costos de stock", err);
    mount.innerHTML = `
      <div class="finStockPanel__loading">
        <div class="u-muted">No se pudo cargar el slide de costos de stock.</div>
      </div>
    `;
    return false;
  }
 }
 
 function fin_renderStockDashboardCard_(){
  const payload = FinanzasState.stockCostsSummary;
  if (!payload || !payload.summary) return;

  const summary = payload.summary || {};
  const comparison = payload.comparison || {};
  const seriesDaily = Array.isArray(payload.series_daily) ? payload.series_daily : [];

  const valueEl = fin_$id("finCostStock");
  const trendWrapEl = fin_$id("finCostStockTrendWrap");
  const trendPctEl = fin_$id("finCostStockTrendPct");
  const trendArrowEl = fin_$id("finCostStockTrendArrow");
  const subEl = fin_$id("finCostStockSub");
  const chartEl = fin_$id("finCostStockChart");

  const trendMeta = fin_getStockTrendMeta_(comparison);
  const valueText = fin_fmtMoney(summary.costo_consumido_prorrateado || 0);

  if (valueEl) {
    valueEl.textContent = valueText;
  }

  if (trendWrapEl) {
    trendWrapEl.classList.remove("is-up", "is-down", "is-neutral");
    trendWrapEl.classList.add(trendMeta.className);
  }

  if (trendPctEl) {
    trendPctEl.textContent = trendMeta.pctText;
  }

  if (trendArrowEl) {
    trendArrowEl.textContent =
      trendMeta.className === "is-up" ? "↑" :
      trendMeta.className === "is-down" ? "↓" : "→";
  }

  if (subEl) {
    subEl.textContent = "Costo consumido prorrateado del rango activo.";
  }

  if (chartEl) {
    chartEl.innerHTML = fin_buildStockDashboardSparklineSvg_(seriesDaily);
  }
}

function fin_fmtShortMonthDay_(rawDate){
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function fin_fmtTooltipDate_(rawDate){
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function fin_buildStockTrendChartSvg_(trend){
  const host = fin_$id("finStockTrendChart");
  if (!host) return;

  const dates = Array.isArray(trend?.dates) ? trend.dates : [];
  const withPr = Array.isArray(trend?.costo_prorrateado) ? trend.costo_prorrateado : [];
  const withoutPr = Array.isArray(trend?.costo_sin_prorrateo) ? trend.costo_sin_prorrateo : [];

  if (!dates.length || !withPr.length || !withoutPr.length) {
    host.innerHTML = `
      <div class="finStockTrendChart__empty">
        Todavía no hay serie de evolución disponible para el rango activo.
      </div>
    `;
    return;
  }

  const points = dates.map((date, i) => ({
    date,
    prorrateado: Number(withPr[i] || 0),
    sinProrrateo: Number(withoutPr[i] || 0)
  }));

  const width = Math.max(320, host.clientWidth || 860);
  const height = Math.max(280, host.clientHeight || 360);

  const pad = {
    top: 18,
    right: 18,
    bottom: 54,
    left: 54
  };

  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxVal = Math.max(
    ...points.map(p => p.prorrateado),
    ...points.map(p => p.sinProrrateo),
    0
  );

  const yMax = maxVal > 0 ? maxVal * 1.08 : 1;

  const xAt = (idx) => {
    if (points.length === 1) return pad.left + (innerW / 2);
    return pad.left + (idx * (innerW / (points.length - 1)));
  };

  const yAt = (val) => {
    const ratio = Math.max(0, Math.min(1, val / yMax));
    return pad.top + innerH - (ratio * innerH);
  };

  const prPoints = points.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.prorrateado),
    v: p.prorrateado,
    date: p.date
  }));

  const sinPoints = points.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.sinProrrateo),
    v: p.sinProrrateo,
    date: p.date
  }));

  function buildSmoothLinePath(arr){
    if (!arr.length) return "";
    let d = `M ${arr[0].x} ${arr[0].y}`;

    for (let i = 0; i < arr.length - 1; i++) {
      const p0 = arr[i];
      const p1 = arr[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return d;
  }

  function buildAreaPath(arr){
    if (!arr.length) return "";
    const line = buildSmoothLinePath(arr);
    return `${line} L ${arr[arr.length - 1].x} ${pad.top + innerH} L ${arr[0].x} ${pad.top + innerH} Z`;
  }

  const linePr = buildSmoothLinePath(prPoints);
  const lineSin = buildSmoothLinePath(sinPoints);
  const areaPr = buildAreaPath(prPoints);
  const areaSin = buildAreaPath(sinPoints);

  const yTicks = 4;
  const gridRows = [];
  const yLabels = [];

  for (let i = 0; i <= yTicks; i++) {
    const val = (yMax / yTicks) * i;
    const y = yAt(val);

    gridRows.push(
      `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>`
    );

    yLabels.push(
      `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" class="finStockTrendAxisLabel finStockTrendAxisLabel--y">${fin_fmtAxisMoney_(val)}</text>`
    );
  }

  const desiredXTicks = Math.min(5, points.length);
  const xStep = Math.max(1, Math.floor((points.length - 1) / Math.max(1, desiredXTicks - 1)));
  const xLabels = [];

  for (let i = 0; i < points.length; i += xStep) {
    const x = xAt(i);
    xLabels.push(
      `<text x="${x}" y="${height - 14}" text-anchor="middle" class="finStockTrendAxisLabel finStockTrendAxisLabel--x">${fin_fmtShortMonthDay_(points[i].date)}</text>`
    );
  }

  const lastIdx = points.length - 1;
  if (lastIdx > 0 && ((lastIdx % xStep) !== 0)) {
    const x = xAt(lastIdx);
    xLabels.push(
      `<text x="${x}" y="${height - 14}" text-anchor="middle" class="finStockTrendAxisLabel finStockTrendAxisLabel--x">${fin_fmtShortMonthDay_(points[lastIdx].date)}</text>`
    );
  }

  const hits = points.map((p, i) => {
    const x = xAt(i);
    return `<rect class="finStockTrendHit" data-idx="${i}" x="${x - 12}" y="${pad.top}" width="24" height="${innerH}"></rect>`;
  }).join("");

  host.innerHTML = `
    <svg class="finStockTrendSvg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <defs>
        <linearGradient id="finStockTrendAreaPrimary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(94,162,255,.30)"></stop>
          <stop offset="100%" stop-color="rgba(94,162,255,0)"></stop>
        </linearGradient>

        <linearGradient id="finStockTrendAreaSecondary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(183,189,200,.26)"></stop>
          <stop offset="100%" stop-color="rgba(183,189,200,0)"></stop>
        </linearGradient>
      </defs>

      <g class="finStockTrendGrid">
        ${gridRows.join("")}
      </g>

      <g>
        ${yLabels.join("")}
        ${xLabels.join("")}
      </g>

      <path class="finStockTrendArea finStockTrendArea--secondary" d="${areaSin}"></path>
      <path class="finStockTrendArea finStockTrendArea--primary" d="${areaPr}"></path>

      <path class="finStockTrendLine finStockTrendLine--secondary" d="${lineSin}"></path>
      <path class="finStockTrendLine finStockTrendLine--primary" d="${linePr}"></path>

      <g id="finStockTrendHoverLayer"></g>
      <g>${hits}</g>
    </svg>

    <div class="finStockTrendTooltip" id="finStockTrendTooltip">
      <div class="finStockTrendTooltip__date" id="finStockTrendTooltipDate">—</div>

      <div class="finStockTrendTooltip__rows">
        <div class="finStockTrendTooltip__row">
          <div class="finStockTrendTooltip__left">
            <span class="finStockTrendTooltip__swatch finStockTrendTooltip__swatch--primary"></span>
            <span class="finStockTrendTooltip__label">Con prorrateo</span>
          </div>
          <div class="finStockTrendTooltip__value" id="finStockTrendTooltipPr">$ 0</div>
        </div>

        <div class="finStockTrendTooltip__row">
          <div class="finStockTrendTooltip__left">
            <span class="finStockTrendTooltip__swatch finStockTrendTooltip__swatch--secondary"></span>
            <span class="finStockTrendTooltip__label">Sin prorrateo</span>
          </div>
          <div class="finStockTrendTooltip__value" id="finStockTrendTooltipSin">$ 0</div>
        </div>
      </div>
    </div>

    <div class="finStockTrendDatePill" id="finStockTrendDatePill">
      <span class="finStockTrendDatePill__txt" id="finStockTrendDatePillTxt">—</span>
    </div>
  `;

  const svg = host.querySelector("svg");
  const hoverLayer = host.querySelector("#finStockTrendHoverLayer");
  const tooltip = fin_$id("finStockTrendTooltip");
  const tooltipDate = fin_$id("finStockTrendTooltipDate");
  const tooltipPr = fin_$id("finStockTrendTooltipPr");
  const tooltipSin = fin_$id("finStockTrendTooltipSin");
  const pill = fin_$id("finStockTrendDatePill");
  const pillTxt = fin_$id("finStockTrendDatePillTxt");

  if (!svg || !hoverLayer || !tooltip || !tooltipDate || !tooltipPr || !tooltipSin || !pill || !pillTxt) {
    return;
  }

  function hideHover(){
    hoverLayer.innerHTML = "";
    tooltip.classList.remove("is-visible");
    pill.classList.remove("is-visible");
  }

  function showHover(idx, evt){
    const pA = prPoints[idx];
    const pB = sinPoints[idx];
    const base = points[idx];
    if (!pA || !pB || !base) return;

    hoverLayer.innerHTML = `
      <line class="finStockTrendCrosshair" x1="${pA.x}" y1="${pad.top}" x2="${pA.x}" y2="${pad.top + innerH}"></line>

      <circle class="finStockTrendDot finStockTrendDot--primary" cx="${pA.x}" cy="${pA.y}" r="5"></circle>
      <circle class="finStockTrendDot finStockTrendDot--secondary" cx="${pB.x}" cy="${pB.y}" r="5"></circle>
    `;

    tooltipDate.textContent = fin_fmtTooltipDate_(base.date);
    tooltipPr.textContent = fin_fmtMoney(base.prorrateado);
    tooltipSin.textContent = fin_fmtMoney(base.sinProrrateo);

    const hostRect = host.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = pA.x + 16;
    let top = Math.min(pA.y, pB.y) - 18;

    if ((left + tooltipRect.width) > (width - 8)) {
      left = pA.x - tooltipRect.width - 16;
    }

    top = Math.max(10, Math.min(top, height - tooltipRect.height - 56));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add("is-visible");

    pillTxt.textContent = fin_fmtShortMonthDay_(base.date);
    pill.style.left = `${pA.x}px`;
    pill.classList.add("is-visible");
  }

  const hitsEls = host.querySelectorAll(".finStockTrendHit");
  hitsEls.forEach((el) => {
    el.addEventListener("mouseenter", (evt) => {
      const idx = Number(el.getAttribute("data-idx") || "0");
      showHover(idx, evt);
    });

    el.addEventListener("mousemove", (evt) => {
      const idx = Number(el.getAttribute("data-idx") || "0");
      showHover(idx, evt);
    });

    el.addEventListener("mouseleave", () => {
      hideHover();
    });
  });

  host.addEventListener("mouseleave", hideHover);
}

function fin_getPctAbsorbidoTone_(currentPct, comparison){
  const pct = Number(currentPct || 0);
  const cmp = comparison || {};
  const dir = String(cmp.variation_direction || "flat").toLowerCase();

  // Para % absorbido:
  // más bajo = mejor
  // más alto = peor

  if (pct <= 0) {
    return {
      tone: "neutral",
      deltaClass: "is-neutral",
      chartClass: "good"
    };
  }

  if (dir === "up") {
    return {
      tone: "bad",
      deltaClass: "is-bad",
      chartClass: "bad"
    };
  }

  if (dir === "down") {
    return {
      tone: "good",
      deltaClass: "is-good",
      chartClass: "good"
    };
  }

  // Flat: lo evaluamos por nivel actual
  if (pct < 35) {
    return {
      tone: "good",
      deltaClass: "is-good",
      chartClass: "good"
    };
  }

  return {
    tone: "bad",
    deltaClass: "is-bad",
    chartClass: "bad"
  };
}

function fin_fmtPctDeltaSigned_(n){
  const x = Number(n || 0);
  const abs = Math.abs(x);
  return `${abs.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function fin_buildMiniSmoothPath_(values, width, height){
  if (!Array.isArray(values) || values.length < 2) {
    return `M 0 ${height * 0.65}`;
  }

  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const span = Math.max(1, maxVal - minVal);

  function xAt(i){
    if (values.length === 1) return width / 2;
    return i * (width / (values.length - 1));
  }

  function yAt(v){
    const norm = (v - minVal) / span;
    return height - (norm * (height * 0.78)) - (height * 0.10);
  }

  const pts = values.map((v, i) => ({
    x: xAt(i),
    y: yAt(v)
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y} ${midX} ${p1.y} ${p1.x} ${p1.y}`;
  }

  return d;
}

function fin_renderHeroPctAbsorbidoCard_(){
  const payload = FinanzasState.stockCostsSlideSummary || null;
  if (!payload || !payload.hero) return;

  const hero = payload.hero || {};
  const comparison = hero.pct_bruto_absorbido_comparison || null;
  const trend = hero.pct_bruto_absorbido_trend || null;

  const periodEl = fin_$id("finSlideHeroPctPeriod");
  const deltaWrapEl = fin_$id("finSlideHeroPctDeltaWrap");
  const deltaValueEl = fin_$id("finSlideHeroPctDeltaValue");
  const deltaArrowEl = fin_$id("finSlideHeroPctDeltaArrow");
  const valueEl = fin_$id("finSlideHeroPctBruto");
  const metaEl = fin_$id("finSlideHeroPctMeta");
  const chartEl = fin_$id("finSlideHeroPctChart");

  const currentPct = Number(hero.pct_bruto_absorbido || 0);
  const toneMeta = fin_getPctAbsorbidoTone_(currentPct, comparison);

  if (periodEl) {
    periodEl.textContent = "Este período";
  }

  if (valueEl) {
    valueEl.textContent = fin_fmtPctPlain_(currentPct);
  }

  if (deltaWrapEl) {
    deltaWrapEl.classList.remove("is-neutral", "is-good", "is-bad");
    deltaWrapEl.classList.add(toneMeta.deltaClass);
  }

  if (deltaValueEl) {
    const cmpVal = Number(comparison && comparison.variation_pct || 0);
    deltaValueEl.textContent = fin_fmtPctDeltaSigned_(cmpVal);
  }

  if (deltaArrowEl) {
    const dir = String(comparison && comparison.variation_direction || "flat").toLowerCase();
    deltaArrowEl.textContent =
      dir === "up" ? "↑" :
      dir === "down" ? "↓" : "→";
  }

  if (metaEl) {
    const prevText = comparison && comparison.previous !== undefined
      ? `Período anterior: ${fin_fmtPctPlain_(comparison.previous)}`
      : "Participación del costo sobre la facturación analítica";

    metaEl.textContent = prevText;
  }

  if (!chartEl) return;

  const trendValues = Array.isArray(trend && trend.values) ? trend.values.map(v => Number(v || 0)) : [];

  if (!trendValues.length) {
    chartEl.innerHTML = `<div class="finStockHeroPct21__chartEmpty"></div>`;
    return;
  }

  const svgWidth = 160;
  const svgHeight = 64;

  const linePath = fin_buildMiniSmoothPath_(trendValues, svgWidth, svgHeight);
  const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  const areaClass = toneMeta.chartClass === "bad"
    ? "finStockHeroPct21__chartArea finStockHeroPct21__chartArea--bad"
    : "finStockHeroPct21__chartArea finStockHeroPct21__chartArea--good";

  const lineClass = toneMeta.chartClass === "bad"
    ? "finStockHeroPct21__chartLine finStockHeroPct21__chartLine--bad"
    : "finStockHeroPct21__chartLine finStockHeroPct21__chartLine--good";

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="finStockHeroPct21__chartSvg" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="finHeroPctAreaGood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(36,121,255,.32)"></stop>
          <stop offset="100%" stop-color="rgba(36,121,255,0)"></stop>
        </linearGradient>

        <linearGradient id="finHeroPctAreaBad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(220,38,38,.28)"></stop>
          <stop offset="100%" stop-color="rgba(220,38,38,0)"></stop>
        </linearGradient>
      </defs>

      <path
        class="${areaClass}"
        d="${areaPath}"
        id="finHeroPctAreaPath"
        style="opacity:0;"
      ></path>

      <path
        class="${lineClass}"
        d="${linePath}"
        id="finHeroPctLinePath"
      ></path>
    </svg>
  `;

  const linePathEl = fin_$id("finHeroPctLinePath");
  const areaPathEl = fin_$id("finHeroPctAreaPath");

  if (linePathEl instanceof SVGPathElement) {
    const len = linePathEl.getTotalLength();

    linePathEl.style.transition = "none";
    linePathEl.style.strokeDasharray = `${len} ${len}`;
    linePathEl.style.strokeDashoffset = `${len}`;

    if (areaPathEl) {
      areaPathEl.style.transition = "none";
      areaPathEl.style.opacity = "0";
    }

    linePathEl.getBoundingClientRect();

    linePathEl.style.transition = "stroke-dashoffset 0.85s ease-in-out";
    linePathEl.style.strokeDashoffset = "0";

    if (areaPathEl) {
      areaPathEl.style.transition = "opacity 0.75s ease-in-out 0.18s";
      areaPathEl.style.opacity = "1";
    }
  }
}

function fin_getRatioTone_(currentRatio, comparison){
  const ratio = Number(currentRatio || 0);
  const cmp = comparison || {};
  const dir = String(cmp.variation_direction || "flat").toLowerCase();

  // Para ratio bruto/costo:
  // más alto = mejor
  // más bajo = peor

  if (ratio <= 0) {
    return {
      tone: "neutral",
      deltaClass: "is-neutral",
      chartClass: "bad"
    };
  }

  if (dir === "up") {
    return {
      tone: "good",
      deltaClass: "is-good",
      chartClass: "good"
    };
  }

  if (dir === "down") {
    return {
      tone: "bad",
      deltaClass: "is-bad",
      chartClass: "bad"
    };
  }

  if (ratio >= 1) {
    return {
      tone: "good",
      deltaClass: "is-good",
      chartClass: "good"
    };
  }

  return {
    tone: "bad",
    deltaClass: "is-bad",
    chartClass: "bad"
  };
}

function fin_fmtRatioDeltaSigned_(n){
  const x = Number(n || 0);
  const abs = Math.abs(x);
  return `${abs.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function fin_renderHeroRatioCard_(){
  const payload = FinanzasState.stockCostsSlideSummary || null;
  if (!payload || !payload.hero) return;

  const hero = payload.hero || {};
  const comparison = hero.ratio_bruto_vs_costo_comparison || null;
  const trend = hero.ratio_bruto_vs_costo_trend || null;

  const periodEl = fin_$id("finSlideHeroRatioPeriod");
  const deltaWrapEl = fin_$id("finSlideHeroRatioDeltaWrap");
  const deltaValueEl = fin_$id("finSlideHeroRatioDeltaValue");
  const deltaArrowEl = fin_$id("finSlideHeroRatioDeltaArrow");
  const valueEl = fin_$id("finSlideHeroRatio");
  const metaEl = fin_$id("finSlideHeroHealth");
  const chartEl = fin_$id("finSlideHeroRatioChart");

  const currentRatio = Number(hero.ratio_bruto_vs_costo || 0);
  const toneMeta = fin_getRatioTone_(currentRatio, comparison);

  if (periodEl) {
    periodEl.textContent = "Este período";
  }

  if (valueEl) {
    valueEl.textContent = fin_fmtCompactRatio_(currentRatio);
  }

  if (deltaWrapEl) {
    deltaWrapEl.classList.remove("is-neutral", "is-good", "is-bad");
    deltaWrapEl.classList.add(toneMeta.deltaClass);
  }

  if (deltaValueEl) {
    const cmpVal = Number(comparison && comparison.variation_pct || 0);
    deltaValueEl.textContent = fin_fmtRatioDeltaSigned_(cmpVal);
  }

  if (deltaArrowEl) {
    const dir = String(comparison && comparison.variation_direction || "flat").toLowerCase();
    deltaArrowEl.textContent =
      dir === "up" ? "↑" :
      dir === "down" ? "↓" : "→";
  }

  if (metaEl) {
    const prevText = comparison && comparison.previous !== undefined
      ? `Período anterior: ${fin_fmtCompactRatio_(comparison.previous)}`
      : (hero.health_label || "Relación sana");

    metaEl.textContent = prevText;
  }

  if (!chartEl) return;

  const trendValues = Array.isArray(trend && trend.values) ? trend.values.map(v => Number(v || 0)) : [];

  if (!trendValues.length) {
    chartEl.innerHTML = `<div class="finStockHeroRatio21__chartEmpty"></div>`;
    return;
  }

  const svgWidth = 160;
  const svgHeight = 64;

  const linePath = fin_buildMiniSmoothPath_(trendValues, svgWidth, svgHeight);
  const areaPath = `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  const areaClass = toneMeta.chartClass === "bad"
    ? "finStockHeroRatio21__chartArea finStockHeroRatio21__chartArea--bad"
    : "finStockHeroRatio21__chartArea finStockHeroRatio21__chartArea--good";

  const lineClass = toneMeta.chartClass === "bad"
    ? "finStockHeroRatio21__chartLine finStockHeroRatio21__chartLine--bad"
    : "finStockHeroRatio21__chartLine finStockHeroRatio21__chartLine--good";

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="finStockHeroRatio21__chartSvg" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="finHeroRatioAreaGood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(36,121,255,.32)"></stop>
          <stop offset="100%" stop-color="rgba(36,121,255,0)"></stop>
        </linearGradient>

        <linearGradient id="finHeroRatioAreaBad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(220,38,38,.28)"></stop>
          <stop offset="100%" stop-color="rgba(220,38,38,0)"></stop>
        </linearGradient>
      </defs>

      <path
        class="${areaClass}"
        d="${areaPath}"
        id="finHeroRatioAreaPath"
        style="opacity:0;"
      ></path>

      <path
        class="${lineClass}"
        d="${linePath}"
        id="finHeroRatioLinePath"
      ></path>
    </svg>
  `;

  const linePathEl = fin_$id("finHeroRatioLinePath");
  const areaPathEl = fin_$id("finHeroRatioAreaPath");

  if (linePathEl instanceof SVGPathElement) {
    const len = linePathEl.getTotalLength();

    linePathEl.style.transition = "none";
    linePathEl.style.strokeDasharray = `${len} ${len}`;
    linePathEl.style.strokeDashoffset = `${len}`;

    if (areaPathEl) {
      areaPathEl.style.transition = "none";
      areaPathEl.style.opacity = "0";
    }

    linePathEl.getBoundingClientRect();

    linePathEl.style.transition = "stroke-dashoffset 0.85s ease-in-out";
    linePathEl.style.strokeDashoffset = "0";

    if (areaPathEl) {
      areaPathEl.style.transition = "opacity 0.75s ease-in-out 0.18s";
      areaPathEl.style.opacity = "1";
    }
  }
}

function fin_renderStockTrendChart_(){
  const payload = FinanzasState.stockCostsSlideSummary || null;
  const trend = payload && payload.trend ? payload.trend : null;
  fin_buildStockTrendChartSvg_(trend);
}

function fin_fmtShortMonthDay_(ymd){
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(5, 7)) - 1;
  const day = Number(s.slice(8, 10));

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return s;

  const monthShort = d.toLocaleDateString("en-US", { month: "short" });
  return `${monthShort} ${day}`;
}

function fin_buildOperationalTrendChartSvg_(trend){
  const host = fin_$id("finOperTrendChart");
  if (!host) return;

  const safeTrend = trend && typeof trend === "object" ? trend : null;
  const dates = safeTrend && Array.isArray(safeTrend.dates) ? safeTrend.dates : [];
  const envio = safeTrend && Array.isArray(safeTrend.envio) ? safeTrend.envio.map(v => Number(v || 0)) : [];
  const otros = safeTrend && Array.isArray(safeTrend.otros) ? safeTrend.otros.map(v => Number(v || 0)) : [];

  if (!dates.length || !envio.length || !otros.length) {
    host.innerHTML = `
      <div class="finStockTrendChart__empty">
        Sin evolución operativa para el rango seleccionado.
      </div>
    `;
    return;
  }

  const W = host.clientWidth || 920;
  const H = 320;
  const padL = 56;
  const padR = 22;
  const padT = 18;
  const padB = 54;

  const innerW = Math.max(10, W - padL - padR);
  const innerH = Math.max(10, H - padT - padB);

  const n = dates.length;
  const allValues = envio.concat(otros).map(v => Number(v || 0));
  const maxVal = Math.max(...allValues, 0);
  const yMax = maxVal <= 0 ? 1 : maxVal;

  const xAt = (i) => padL + (n === 1 ? innerW / 2 : (i * (innerW / (n - 1))));
  const yAt = (v) => padT + (innerH - ((Number(v || 0) / yMax) * innerH));

  function smoothLinePath(arr){
    if (!arr.length) return "";
    const pts = arr.map((v, i) => ({ x: xAt(i), y: yAt(v) }));

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  function smoothAreaPath(arr){
    if (!arr.length) return "";
    const line = smoothLinePath(arr);
    const lastX = xAt(arr.length - 1);
    const firstX = xAt(0);
    const baseY = H - padB;
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }

  const envioLine = smoothLinePath(envio);
  const envioArea = smoothAreaPath(envio);
  const otrosLine = smoothLinePath(otros);
  const otrosArea = smoothAreaPath(otros);

  const gridN = 4;
  let grid = "";
  let ylabels = "";

  for (let i = 0; i <= gridN; i++) {
    const vv = (yMax / gridN) * i;
    const yy = yAt(vv);

    grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" class="finGrid"/>`;
    ylabels += `
      <text
        x="${padL - 8}"
        y="${yy + 4}"
        text-anchor="end"
        class="finAxisTxt finAxisTxt--y"
      >${fin_fmtAxisMoney_(vv)}</text>
    `;
  }

  const labelEvery = Math.max(1, Math.floor(n / 5));
  let xlabels = "";
  for (let i = 0; i < n; i += labelEvery) {
    const xi = xAt(i);
    const lab = fin_fmtShortMonthDay_(dates[i]);
    xlabels += `<text x="${xi}" y="${H - 18}" text-anchor="middle" class="finAxisTxt">${lab}</text>`;
  }

  const defsId = `finOperTrendDefs_${Math.random().toString(36).slice(2)}`;
  const hoverLineId = `finOperHoverLine_${Math.random().toString(36).slice(2)}`;
  const hoverPillId = `finOperHoverPill_${Math.random().toString(36).slice(2)}`;
  const hoverPillTextId = `finOperHoverPillText_${Math.random().toString(36).slice(2)}`;

  host.style.position = "relative";
  host.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del costo operativo de ingreso">
      <defs id="${defsId}">
        <linearGradient id="${defsId}_envio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(36,121,255,0.22)"></stop>
          <stop offset="100%" stop-color="rgba(36,121,255,0.02)"></stop>
        </linearGradient>
        <linearGradient id="${defsId}_otros" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(148,163,184,0.20)"></stop>
          <stop offset="100%" stop-color="rgba(148,163,184,0.02)"></stop>
        </linearGradient>
      </defs>

      <g>
        ${grid}
        ${ylabels}
      </g>

      <path d="${otrosArea}" fill="url(#${defsId}_otros)" opacity="1"></path>
      <path d="${envioArea}" fill="url(#${defsId}_envio)" opacity="1"></path>

      <path d="${otrosLine}" class="finLine finLine--pend" fill="none"></path>
      <path d="${envioLine}" class="finLine finLine--proc" fill="none"></path>

      <line id="${hoverLineId}" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#7C83FF" stroke-width="1.2" opacity="0"></line>

      <g id="${hoverPillId}" opacity="0">
        <rect x="0" y="${H - 44}" width="72" height="32" rx="16" ry="16" fill="#0F172A"></rect>
        <text
          id="${hoverPillTextId}"
          x="36"
          y="${H - 24}"
          text-anchor="middle"
          fill="#FFFFFF"
          font-size="12"
          font-weight="700"
        >—</text>
      </g>

      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" class="finAxis"></line>
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" class="finAxis"></line>

      <g>${xlabels}</g>

      <rect
        x="${padL}"
        y="${padT}"
        width="${innerW}"
        height="${innerH}"
        fill="transparent"
        style="cursor: crosshair;"
        data-fin-oper-hover-layer="1"
      ></rect>
    </svg>
  `;

  let tip = host.querySelector(".finOperTrendTip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "finOperTrendTip";
    tip.style.position = "absolute";
    tip.style.zIndex = "5";
    tip.style.pointerEvents = "none";
    tip.style.minWidth = "164px";
    tip.style.background = "#111827";
    tip.style.color = "#FFFFFF";
    tip.style.borderRadius = "14px";
    tip.style.padding = "12px 14px";
    tip.style.boxShadow = "0 14px 30px rgba(15,23,42,0.28)";
    tip.style.fontSize = "13px";
    tip.style.lineHeight = "1.35";
    tip.style.display = "none";
    tip.innerHTML = `
      <div class="finOperTrendTip__date" style="font-weight:700; margin-bottom:8px;"></div>
      <div class="finOperTrendTip__row" style="display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:10px; height:10px; border-radius:999px; background:#2479FF; display:inline-block;"></span>
          <span>Envío prorrateado</span>
        </div>
        <strong class="finOperTrendTip__envio" style="font-weight:700;"></strong>
      </div>
      <div class="finOperTrendTip__row" style="display:flex; align-items:center; justify-content:space-between; gap:14px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:10px; height:10px; border-radius:999px; background:#94A3B8; display:inline-block;"></span>
          <span>Otros costos</span>
        </div>
        <strong class="finOperTrendTip__otros" style="font-weight:700;"></strong>
      </div>
    `;
    host.appendChild(tip);
  }

  const svg = host.querySelector("svg");
  const hoverRect = svg ? svg.querySelector('[data-fin-oper-hover-layer="1"]') : null;
  const hoverLine = svg ? svg.querySelector(`#${hoverLineId}`) : null;
  const hoverPill = svg ? svg.querySelector(`#${hoverPillId}`) : null;
  const hoverPillText = svg ? svg.querySelector(`#${hoverPillTextId}`) : null;
  const tipDate = tip.querySelector(".finOperTrendTip__date");
  const tipEnvio = tip.querySelector(".finOperTrendTip__envio");
  const tipOtros = tip.querySelector(".finOperTrendTip__otros");

  if (!svg || !hoverRect || !hoverLine || !hoverPill || !hoverPillText) return;

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function getNearestIndex(clientX){
    const rect = svg.getBoundingClientRect();
    const localX = clientX - rect.left;
    const ratio = innerW <= 0 ? 0 : (localX - padL) / innerW;
    const idx = Math.round(clamp(ratio, 0, 1) * (n - 1));
    return clamp(idx, 0, n - 1);
  }

  function showHover(idx, clientX, clientY){
    const safeIdx = clamp(idx, 0, n - 1);
    const activeX = xAt(safeIdx);
    const dateLabel = fin_fmtShortMonthDay_(dates[safeIdx]);
    const envioVal = Number(envio[safeIdx] || 0);
    const otrosVal = Number(otros[safeIdx] || 0);

    hoverLine.setAttribute("x1", activeX);
    hoverLine.setAttribute("x2", activeX);
    hoverLine.setAttribute("opacity", "1");

    const pillWidth = Math.max(66, (dateLabel.length * 7.2) + 26);
    const pillX = clamp(activeX - (pillWidth / 2), padL, W - padR - pillWidth);

    const rectEl = hoverPill.querySelector("rect");
    if (rectEl) {
      rectEl.setAttribute("x", pillX);
      rectEl.setAttribute("width", pillWidth);
    }

    hoverPillText.textContent = dateLabel;
    hoverPillText.setAttribute("x", pillX + (pillWidth / 2));
    hoverPill.setAttribute("opacity", "1");

    if (tipDate) tipDate.textContent = dateLabel;
    if (tipEnvio) tipEnvio.textContent = fin_fmtMoney(envioVal);
    if (tipOtros) tipOtros.textContent = fin_fmtMoney(otrosVal);

    const hostRect = host.getBoundingClientRect();
    tip.style.display = "block";

    const tipW = tip.offsetWidth || 180;
    const tipH = tip.offsetHeight || 86;

    let xPos = clientX - hostRect.left + 16;
    let yPos = clientY - hostRect.top - 14;

    xPos = clamp(xPos, 10, hostRect.width - tipW - 10);
    yPos = clamp(yPos, 10, hostRect.height - tipH - 10);

    tip.style.left = `${xPos}px`;
    tip.style.top = `${yPos}px`;
  }

  function hideHover(){
    hoverLine.setAttribute("opacity", "0");
    hoverPill.setAttribute("opacity", "0");
    tip.style.display = "none";
  }

  hoverRect.addEventListener("mouseenter", (e) => {
    const idx = getNearestIndex(e.clientX);
    showHover(idx, e.clientX, e.clientY);
  });

  hoverRect.addEventListener("mousemove", (e) => {
    const idx = getNearestIndex(e.clientX);
    showHover(idx, e.clientX, e.clientY);
  });

  hoverRect.addEventListener("mouseleave", () => {
    hideHover();
  });
}



function fin_renderOperationalTrendChart_(){
  const payload = FinanzasState.stockCostsSlideSummary || null;
  const operativo = payload && payload.operativo ? payload.operativo : null;
  const ingreso = operativo && operativo.ingreso ? operativo.ingreso : null;
  const trend = ingreso && ingreso.trend ? ingreso.trend : null;

  fin_buildOperationalTrendChartSvg_(trend);
}

function fin_ensureInfoTooltip_(){
  let tip = document.getElementById("finInfoTip");
  if (tip) return tip;

  tip = document.createElement("div");
  tip.id = "finInfoTip";
  tip.className = "finInfoTip";
  tip.innerHTML = `
    <div class="finInfoTip__title" id="finInfoTipTitle"></div>
    <div class="finInfoTip__text" id="finInfoTipText"></div>
  `;

  document.body.appendChild(tip);
  return tip;
}

function fin_hideInfoTooltip_(){
  const tip = document.getElementById("finInfoTip");
  if (!tip) return;
  tip.classList.remove("is-visible");
}

function fin_showInfoTooltip_(title, text, clientX, clientY){
  const tip = fin_ensureInfoTooltip_();
  const titleEl = document.getElementById("finInfoTipTitle");
  const textEl = document.getElementById("finInfoTipText");

  if (titleEl) titleEl.textContent = String(title || "");
  if (textEl) textEl.textContent = String(text || "");

  tip.classList.add("is-visible");

  const pad = 14;
  const rectW = window.innerWidth || document.documentElement.clientWidth || 0;
  const rectH = window.innerHeight || document.documentElement.clientHeight || 0;

  const tipW = tip.offsetWidth || 280;
  const tipH = tip.offsetHeight || 90;

  let x = clientX + 18;
  let y = clientY + 18;

  if (x + tipW > rectW - pad) {
    x = clientX - tipW - 18;
  }
  if (y + tipH > rectH - pad) {
    y = clientY - tipH - 18;
  }

  x = Math.max(pad, x);
  y = Math.max(pad, y);

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function fin_bindInfoTooltipTarget_(el, title, text){
  if (!el) return;
  if (el.dataset.finTipBound === "1") return;

  el.dataset.finTipBound = "1";
  el.classList.add("finInfoTipTarget");

  const safeTitle = String(title || "").trim();
  const safeText = String(text || "").trim();

  el.addEventListener("mouseenter", (ev) => {
    fin_showInfoTooltip_(safeTitle, safeText, ev.clientX, ev.clientY);
  });

  el.addEventListener("mousemove", (ev) => {
    fin_showInfoTooltip_(safeTitle, safeText, ev.clientX, ev.clientY);
  });

  el.addEventListener("mouseleave", () => {
    fin_hideInfoTooltip_();
  });
}

function fin_bindOperationalChartInfoTooltip_(){
  const chartCard = fin_$id("finOperTrendChart")?.closest(".finStockTrendCard");
  if (!chartCard) return;

  if (chartCard.dataset.finOperChartTipBound === "1") return;
  chartCard.dataset.finOperChartTipBound = "1";

  chartCard.classList.add("finInfoTipTarget");

  const title = "Costo operativo de ingreso por lote";
  const text = "Grafica la evolución temporal del costo operativo de ingreso, separando envío prorrateado y otros costos para detectar cuándo sube la fricción de entrada.";

  function moveTip(ev){
    const tip = fin_ensureInfoTooltip_();
    const titleEl = document.getElementById("finInfoTipTitle");
    const textEl = document.getElementById("finInfoTipText");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    tip.classList.add("is-visible");

    const hostRect = chartCard.getBoundingClientRect();
    const pad = 14;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;

    const tipW = tip.offsetWidth || 280;
    const tipH = tip.offsetHeight || 90;

    // Regla nueva:
    // SIEMPRE debajo del gráfico. Nunca dentro del área del chart.
    let x = ev.clientX - (tipW / 2);
    let y = hostRect.bottom + 14;

    // Clamp horizontal
    x = Math.max(pad, Math.min(x, vw - tipW - pad));

    // Si por viewport no entra abajo, lo dejamos arriba del gráfico, pero fuera del área útil
    if (y + tipH > vh - pad) {
      y = Math.max(pad, hostRect.top - tipH - 14);
    }

    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  chartCard.addEventListener("mouseenter", moveTip);
  chartCard.addEventListener("mousemove", moveTip);
  chartCard.addEventListener("mouseleave", () => {
    fin_hideInfoTooltip_();
  });
}

function fin_arrangeOperationalLayout_(){
  const chartCard = fin_$id("finOperTrendChart")?.closest(".finStockTrendCard");
  const structCard = fin_$id("finOperStructEnvio")?.closest(".finStockPanelCard");
  const tableCard = fin_$id("finOperTableBody")?.closest(".finStockPanelCard");

  if (!chartCard || !structCard || !tableCard) return;

  const bodyGrid = chartCard.parentElement;
  if (!bodyGrid) return;

  // 1) Aseguramos que gráfico + participación sigan compartiendo la misma fila
  //    y que la tabla NO se meta entre ambas.
  const bodyGridNext = bodyGrid.nextElementSibling;
  if (bodyGridNext !== tableCard) {
    bodyGrid.insertAdjacentElement("afterend", tableCard);
  }

  // 2) La tabla ocupa todo el ancho permitido del slide
  tableCard.classList.add("finOperTableCardFull");
  tableCard.style.gridColumn = "1 / -1";
  tableCard.style.width = "100%";
  tableCard.style.maxWidth = "100%";
  tableCard.style.marginTop = "18px";

  // 3) Limpiamos cualquier forzado raro anterior
  chartCard.style.gridColumn = "";
  chartCard.style.width = "";
  chartCard.style.maxWidth = "";

  structCard.style.gridColumn = "";
  structCard.style.width = "";
  structCard.style.maxWidth = "";

  // 4) Refuerzo visual del body interno de tabla
  const tableWrap = tableCard.querySelector(".finOperTableWrap");
  if (tableWrap) {
    tableWrap.style.width = "100%";
    tableWrap.style.maxWidth = "100%";
  }
}

function fin_bindOperationalCardTooltips_(){
  fin_bindInfoTooltipTarget_(
    fin_$id("finOperHeroIngreso")?.closest(".finStockInfoCard"),
    "Costo operativo de ingreso",
    "Mide cuánto costó hacer entrar la mercadería al sistema en el rango seleccionado, sumando envío prorrateado y otros costos operativos del lote."
  );

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperHeroEnvio")?.closest(".finStockInfoCard"),
    "Envío operativo de ingreso",
    "Muestra qué parte del costo operativo de ingreso corresponde únicamente al envío absorbido por los lotes cargados en el rango."
  );

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperHeroOtros")?.closest(".finStockInfoCard"),
    "Otros costos operativos",
    "Resume costos adicionales de ingreso, como recepción, manipulación u otras cargas operativas prorrateadas al lote."
  );

  // IMPORTANTE:
  // El gráfico NO usa el bind genérico porque ese tooltip invade el área del chart.
  fin_bindOperationalChartInfoTooltip_();

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperStructEnvio")?.closest(".finStockPanelCard"),
    "Participación del costo operativo de ingreso",
    "Descompone el costo operativo total entre envío prorrateado, otros costos y el peso operativo sobre el costo de compra."
  );

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperRiskLotes")?.closest(".finStockPanelCard"),
    "Métricas operativas del rango",
    "Resume lotes con ingreso, unidades cargadas, operativo por lote, operativo por unidad y niveles de absorción sobre compra y costo final."
  );

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperTableBody")?.closest(".finStockPanelCard"),
    "Lotes con mayor costo operativo absorbido",
    "Muestra qué lotes absorbieron más fricción operativa al ingresar. Ayuda a detectar cuándo el costo prorrateado se separa con más fuerza de la base limpia de compra."
  );

  fin_bindInfoTooltipTarget_(
    fin_$id("finOperRiskNote")?.closest(".finStockPanelCard"),
    "Lectura ejecutiva del rango",
    "Interpreta el comportamiento operativo del ingreso en el período y ayuda a detectar si la fricción está controlada, moderada o elevada."
  );
}


function fin_renderOperationalIngresoPanel_(){
  const payload = FinanzasState.stockCostsSlideSummary || null;
  const operativo = payload && payload.operativo ? payload.operativo : null;
  const ingreso = operativo && operativo.ingreso ? operativo.ingreso : null;

  const hero = ingreso && ingreso.hero ? ingreso.hero : {};
  const composition = ingreso && ingreso.composition ? ingreso.composition : {};
  const metrics = ingreso && ingreso.metrics ? ingreso.metrics : {};
  const ranking = ingreso && Array.isArray(ingreso.ranking_lotes) ? ingreso.ranking_lotes : [];
  const note = ingreso && ingreso.note ? String(ingreso.note) : "Sin actividad operativa de ingreso en el rango.";

  const elHeroIngreso = fin_$id("finOperHeroIngreso");
  const elHeroIngresoMeta = fin_$id("finOperHeroIngresoMeta");
  const elHeroEnvio = fin_$id("finOperHeroEnvio");
  const elHeroEnvioMeta = fin_$id("finOperHeroEnvioMeta");
  const elHeroOtros = fin_$id("finOperHeroOtros");
  const elHeroOtrosMeta = fin_$id("finOperHeroOtrosMeta");

  if (elHeroIngreso) {
    elHeroIngreso.textContent = fin_fmtMoney(hero.ingreso_operativo_total || 0);
  }
  if (elHeroIngresoMeta) {
    elHeroIngresoMeta.textContent = "Suma de envío prorrateado y otros costos operativos del lote";
  }

  if (elHeroEnvio) {
    elHeroEnvio.textContent = fin_fmtMoney(hero.envio_operativo_total || 0);
  }
  if (elHeroEnvioMeta) {
    elHeroEnvioMeta.textContent = "Costo prorrateado de envío absorbido por los lotes del rango";
  }

  if (elHeroOtros) {
    elHeroOtros.textContent = fin_fmtMoney(hero.otros_operativos_total || 0);
  }
  if (elHeroOtrosMeta) {
    elHeroOtrosMeta.textContent = "Costos adicionales de recepción, manipulación u operación prorrateados al lote";
  }

  const envioShare = Number(composition.share_envio || 0);
  const otrosShare = Number(composition.share_otros || 0);
  const pesoOperativo = Number(composition.peso_operativo_total || 0);

  const elEnvioShare = fin_$id("finOperStructEnvioShare");
  const elEnvioFill = fin_$id("finOperStructEnvioFill");
  const elEnvioMeta = fin_$id("finOperStructEnvioMeta");

  const elOtrosShare = fin_$id("finOperStructOtrosShare");
  const elOtrosFill = fin_$id("finOperStructOtrosFill");
  const elOtrosMeta = fin_$id("finOperStructOtrosMeta");

  const elTotalShare = fin_$id("finOperStructTotalShare");
  const elTotalFill = fin_$id("finOperStructTotalFill");
  const elTotalMeta = fin_$id("finOperStructTotalMeta");

  if (elEnvioShare) {
    elEnvioShare.textContent = fin_fmtPctPlain_(envioShare);
  }
  if (elEnvioFill) {
    elEnvioFill.style.width = `${Math.max(0, Math.min(100, envioShare))}%`;
  }
  if (elEnvioMeta) {
    elEnvioMeta.textContent = `${fin_fmtMoney(hero.envio_operativo_total || 0)} absorbidos por envío prorrateado`;
  }

  if (elOtrosShare) {
    elOtrosShare.textContent = fin_fmtPctPlain_(otrosShare);
  }
  if (elOtrosFill) {
    elOtrosFill.style.width = `${Math.max(0, Math.min(100, otrosShare))}%`;
  }
  if (elOtrosMeta) {
    elOtrosMeta.textContent = `${fin_fmtMoney(hero.otros_operativos_total || 0)} absorbidos por otros costos`;
  }

  if (elTotalShare) {
    elTotalShare.textContent = fin_fmtPctPlain_(pesoOperativo);
  }
  if (elTotalFill) {
    elTotalFill.style.width = `${Math.max(0, Math.min(100, pesoOperativo))}%`;
  }
  if (elTotalMeta) {
    elTotalMeta.textContent = `${fin_fmtPctPlain_(metrics.absorcion_sobre_compra || 0)} sobre costo de compra`;
  }

  const elRiskLotes = fin_$id("finOperRiskLotes");
  const elRiskUnidades = fin_$id("finOperRiskUnidades");
  const elRiskOperativoLote = fin_$id("finOperRiskOperativoLote");
  const elRiskOperativoUnidad = fin_$id("finOperRiskOperativoUnidad");
  const elRiskAbsCompra = fin_$id("finOperRiskAbsCompra");
  const elRiskAbsFinal = fin_$id("finOperRiskAbsFinal");
  const elRiskNote = fin_$id("finOperRiskNote");

  if (elRiskLotes) {
    elRiskLotes.textContent = Number(metrics.lotes_con_ingreso || 0).toLocaleString("es-AR");
  }
  if (elRiskUnidades) {
    elRiskUnidades.textContent = Number(metrics.unidades_ingresadas || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 });
  }
  if (elRiskOperativoLote) {
    elRiskOperativoLote.textContent = fin_fmtMoney(metrics.operativo_por_lote || 0);
  }
  if (elRiskOperativoUnidad) {
    elRiskOperativoUnidad.textContent = fin_fmtMoney(metrics.operativo_por_unidad || 0);
  }
  if (elRiskAbsCompra) {
    elRiskAbsCompra.textContent = fin_fmtPctPlain_(metrics.absorcion_sobre_compra || 0);
  }
  if (elRiskAbsFinal) {
    elRiskAbsFinal.textContent = fin_fmtPctPlain_(metrics.absorcion_sobre_costo_final || 0);
  }
  if (elRiskNote) {
    elRiskNote.textContent = note;
  }

  const tableBody = fin_$id("finOperTableBody");
  if (tableBody) {
    if (!ranking.length) {
      tableBody.innerHTML = `
        <div class="finOperTable__empty">
          Todavía no hay datos cargados para el ranking operativo.
        </div>
      `;
    } else {
      tableBody.innerHTML = ranking.map((item) => {
        return `
          <div class="finOperTable__row" role="row">
            <div class="finOperTable__cell" role="cell">${String(item.lote_id || "—")}</div>
            <div class="finOperTable__cell" role="cell">${Number(item.unidades || 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</div>
            <div class="finOperTable__cell" role="cell">${fin_fmtMoney(item.envio || 0)}</div>
            <div class="finOperTable__cell" role="cell">${fin_fmtMoney(item.otros || 0)}</div>
            <div class="finOperTable__cell" role="cell">${fin_fmtMoney(item.operativo_total || 0)}</div>
            <div class="finOperTable__cell" role="cell">${fin_fmtPctPlain_(item.absorcion_sobre_compra || 0)}</div>
          </div>
        `;
      }).join("");
    }
  }

  fin_renderOperationalTrendChart_();
  fin_arrangeOperationalLayout_();
  fin_bindOperationalCardTooltips_();
}

function fin_renderStockSlideSummary_(){
  const payload = FinanzasState.stockCostsSlideSummary;
  if (!payload) return;

  const hero = payload.hero || {};
  const byStructure = payload.by_structure || {};
  const risk = payload.risk || {};

  const elCosto = fin_$id("finSlideHeroCosto");
  const elCostoMeta = fin_$id("finSlideHeroCostoMeta");
  const elPct = fin_$id("finSlideHeroPctBruto");
  const elPctMeta = fin_$id("finSlideHeroPctMeta");
  const elRatio = fin_$id("finSlideHeroRatio");
  const elHealth = fin_$id("finSlideHeroHealth");

  if (elCosto) {
    elCosto.textContent = fin_fmtMoney(hero.costo_consumido_prorrateado || 0);
  }

  if (elCostoMeta) {
    elCostoMeta.textContent =
      `Sin prorrateo: ${fin_fmtMoney(hero.costo_consumido_sin_prorrateo || 0)}`;
  }

  if (elPct) {
    elPct.textContent = fin_fmtPctPlain_(hero.pct_bruto_absorbido || 0);
  }

  if (elPctMeta) {
    elPctMeta.textContent =
      `Facturación analítica: ${fin_fmtMoney(hero.facturacion_analitica_total || 0)}`;
  }

  if (elRatio) {
    elRatio.textContent = fin_fmtCompactRatio_(hero.ratio_bruto_vs_costo || 0);
  }

  if (elHealth) {
    const meta = fin_getHealthMeta_(hero.health_label || "");
    elHealth.classList.remove("is-good", "is-warn", "is-bad");
    if (meta.className) elHealth.classList.add(meta.className);
    elHealth.textContent = meta.text;
  }

  const structMap = [
    {
      key: "unidad",
      share: "finStructUnidadShare",
      fill: "finStructUnidadFill",
      meta: "finStructUnidadMeta"
    },
    {
      key: "equivalencia",
      share: "finStructEquivalenciaShare",
      fill: "finStructEquivalenciaFill",
      meta: "finStructEquivalenciaMeta"
    },
    {
      key: "bundle",
      share: "finStructBundleShare",
      fill: "finStructBundleFill",
      meta: "finStructBundleMeta"
    }
  ];

  structMap.forEach(item => {
    const data = byStructure[item.key] || {};
    const shareVal = Number(data.participacion_sobre_costo_total || 0);

    const shareEl = fin_$id(item.share);
    const fillEl = fin_$id(item.fill);
    const metaEl = fin_$id(item.meta);

    if (shareEl) {
      shareEl.textContent = fin_fmtPctPlain_(shareVal);
    }

    if (fillEl) {
      fillEl.style.width = `${Math.max(0, Math.min(100, shareVal))}%`;
    }

    if (metaEl) {
      metaEl.textContent =
        `${fin_fmtMoney(data.costo_consumido_prorrateado || 0)} · ` +
        `${fin_fmtPctPlain_(data.participacion_sobre_facturacion_total || 0)} del bruto · ` +
        `${Number(data.cantidad_lineas || 0).toLocaleString("es-AR")} líneas`;
    }
  });

  const elRiskMov = fin_$id("finRiskSkuMov");
  const elRiskSinCosto = fin_$id("finRiskSkuSinCosto");
  const elRiskTopSku = fin_$id("finRiskTopSku");
  const elRiskTopSkuCosto = fin_$id("finRiskTopSkuCosto");
  const elRiskTop3 = fin_$id("finRiskTop3");
  const elRiskTop5 = fin_$id("finRiskTop5");
  const elRiskNote = fin_$id("finRiskNote");

  if (elRiskMov) {
    elRiskMov.textContent = Number(risk.skus_con_movimiento || 0).toLocaleString("es-AR");
  }

  if (elRiskSinCosto) {
    elRiskSinCosto.textContent = Number(risk.skus_sin_costo || 0).toLocaleString("es-AR");
  }

  if (elRiskTopSku) {
    elRiskTopSku.textContent = String(risk.top_sku_por_costo || "—");
  }

  if (elRiskTopSkuCosto) {
    elRiskTopSkuCosto.textContent = fin_fmtMoney(risk.top_sku_costo || 0);
  }

  if (elRiskTop3) {
    elRiskTop3.textContent = fin_fmtPctPlain_(risk.top3_participacion_costo || 0);
  }

  if (elRiskTop5) {
    elRiskTop5.textContent = fin_fmtPctPlain_(risk.top5_participacion_costo || 0);
  }

  if (elRiskNote) {
    elRiskNote.textContent =
      `La lectura actual muestra ${Number(risk.skus_con_movimiento || 0).toLocaleString("es-AR")} SKU con movimiento y ` +
      `${Number(risk.skus_sin_costo || 0).toLocaleString("es-AR")} SKU sin costo consolidado. ` +
      `El top 3 explica ${fin_fmtPctPlain_(risk.top3_participacion_costo || 0)} del costo del rango.`;
  }
  
  fin_renderHeroPctAbsorbidoCard_();
  fin_renderHeroRatioCard_();
  fin_renderStockTrendChart_();
  fin_renderOperationalIngresoPanel_();
  }

 function fin_renderStockSlide_(){
  const mount = fin_$id("finStockPanelMount");
  if (!mount) return;
  if (mount.getAttribute("data-loaded") !== "true") return;
 
  const valueEl = fin_$id("finStockHeroValue");
  const rangeEl = fin_$id("finStockHeroRange");
  const noteEl  = fin_$id("finStockHeroNote");
  const trendPctEl = fin_$id("finStockHeroTrendPct");
  const trendLabelEl = fin_$id("finStockHeroTrendLabel");
  const trendWrapEl = fin_$id("finStockHeroTrendWrap");
  const chartEl = fin_$id("finStockHeroChart");
  const triggerValue = fin_$id("finCostStock");
 
  const fromYmd = FinanzasState.fromIso ? FinanzasState.fromIso.slice(0,10) : "—";
  const toYmd   = FinanzasState.toIso   ? FinanzasState.toIso.slice(0,10)   : "—";
 
  const payload = FinanzasState.stockCostsSummary;
  const summary = payload && payload.summary ? payload.summary : null;
  const comparison = payload && payload.comparison ? payload.comparison : null;
  const seriesDaily = payload && Array.isArray(payload.series_daily) ? payload.series_daily : [];
 
  const heroValue = summary
    ? fin_fmtMoney(summary.costo_consumido_prorrateado || 0)
    : "—";
 
  if (valueEl) {
    valueEl.textContent = heroValue;
  }
 
  if (triggerValue && summary) {
    triggerValue.textContent = heroValue;
  }
 
  if (rangeEl) {
    rangeEl.textContent = `Rango activo: ${fromYmd} → ${toYmd}`;
  }
 
  const trendMeta = fin_getStockTrendMeta_(comparison);
 
  if (trendWrapEl) {
    trendWrapEl.classList.remove("is-up", "is-down", "is-neutral");
    trendWrapEl.classList.add(trendMeta.className);
  }
 
  if (trendPctEl) {
    trendPctEl.textContent = trendMeta.pctText;
  }
 
  if (trendLabelEl) {
    trendLabelEl.textContent = trendMeta.label;
  }
 
  if (chartEl) {
    chartEl.innerHTML = `
      <div class="finStockHeroCard__empty">
        El gráfico principal de tendencia vive en la tarjeta del panel. Este slide queda enfocado en lectura operativa y detalle.
      </div>
    `;
  }
 
  if (noteEl) {
    const skusMov = summary ? Number(summary.skus_con_movimiento || 0) : 0;
    const skusSinCosto = summary ? Number(summary.skus_sin_costo || 0) : 0;
    const units = summary ? Number(summary.unidades_vendidas || 0) : 0;

    noteEl.textContent =
      `En el rango actual se reconocieron ${units.toLocaleString("es-AR", { maximumFractionDigits: 2 })} unidades vendidas, ${skusMov} SKU con movimiento y ${skusSinCosto} SKU sin costo consolidado.`;
  }

  fin_renderStockSlideSummary_();
  fin_initStockSlideTabs_();
}

 async function fin_openStockSlide_(){
  const overlay = fin_$id("finStockOverlay");
  if (!overlay) return;
 
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
 
  await fin_ensureStockSlidePartial_();
  fin_renderStockSlide_();
 }
 
 function fin_closeStockSlide_(){
  const overlay = fin_$id("finStockOverlay");
  if (!overlay) return;
 
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  
 }

// ================================
// Init / Mount (SPA-safe)
// ================================
function initFinanzas_(){
  if (window.__finanzasInited) return;
  window.__finanzasInited = true;

  wireFinanzasUI_();
  fin_initAlertsUI_();

  // cache rehidratación: no pestañea
  const cache = window.__FINANZAS_CACHE__;
  if (cache && cache.res && cache.from && cache.to) {
    FinanzasState.fromIso = cache.from;
    FinanzasState.toIso   = cache.to;
    FinanzasState.rows    = Array.isArray(cache.res.rows)    ? cache.res.rows    : [];
    FinanzasState.history = Array.isArray(cache.res.history) ? cache.res.history : [];
    FinanzasState.stockCostsSummary = cache.stockCostsSummary || null;
    FinanzasState.stockCostsSlideSummary = cache.stockCostsSlideSummary || null;

    fin_syncDateInputsFromState_();
    renderFinanzas_();
    return;
  }

  // Si existe rango global aplicado desde Inicio, lo usamos
  const globalRange = fin_getGlobalRange_();

  if (globalRange) {
    FinanzasState.fromIso = globalRange.from;
    FinanzasState.toIso   = globalRange.to;

    fin_syncDateInputsFromState_();

    (async () => {
      try {
        const [res, stockRes, stockSlideRes] = await Promise.all([
          loadFinanzas_(FinanzasState.fromIso, FinanzasState.toIso),
          fin_loadStockCostsSummary_(FinanzasState.fromIso, FinanzasState.toIso),
          fin_loadStockCostsSlideSummary_(FinanzasState.fromIso, FinanzasState.toIso)
        ]);

        FinanzasState.rows    = Array.isArray(res.rows)    ? res.rows    : [];
        FinanzasState.history = Array.isArray(res.history) ? res.history : [];
        FinanzasState.stockCostsSummary = stockRes || null;
        FinanzasState.stockCostsSlideSummary = stockSlideRes || null;

        window.__FINANZAS_CACHE__ = {
          from: FinanzasState.fromIso,
          to:   FinanzasState.toIso,
          res,
          stockCostsSummary: stockRes || null,
          stockCostsSlideSummary: stockSlideRes || null
        };

        renderFinanzas_();
      } catch (e) {
        const host = fin_$id("finCashflowChart");
        if (host) host.innerHTML = `<div class="u-muted">Error: ${String(e.message || e)}</div>`;
      }
    })();

    return;
  }

  // Si no existe rango global, usamos el rango por defecto
  setDefaultRange_();
  fin_syncDateInputsFromState_();

  (async () => {
    try {
      const [res, stockRes, stockSlideRes] = await Promise.all([
        loadFinanzas_(FinanzasState.fromIso, FinanzasState.toIso),
        fin_loadStockCostsSummary_(FinanzasState.fromIso, FinanzasState.toIso),
        fin_loadStockCostsSlideSummary_(FinanzasState.fromIso, FinanzasState.toIso)
      ]);

      FinanzasState.rows    = Array.isArray(res.rows)    ? res.rows    : [];
      FinanzasState.history = Array.isArray(res.history) ? res.history : [];
      FinanzasState.stockCostsSummary = stockRes || null;
      FinanzasState.stockCostsSlideSummary = stockSlideRes || null;

      window.__FINANZAS_CACHE__ = {
        from: FinanzasState.fromIso,
        to:   FinanzasState.toIso,
        res,
        stockCostsSummary: stockRes || null,
        stockCostsSlideSummary: stockSlideRes || null
      };

      renderFinanzas_();
    } catch (e) {
      const host = fin_$id("finCashflowChart");
      if (host) host.innerHTML = `<div class="u-muted">Error: ${String(e.message || e)}</div>`;
    }
  })();
}

function mountFinanzas_(){
  // rewire + rerender si hace falta (SPA navigation)
  wireFinanzasUI_();
  fin_initAlertsUI_();

  const cache = window.__FINANZAS_CACHE__;
  if (cache && cache.res) {
    // Rehidratamos estado lógico desde cache
    FinanzasState.fromIso = cache.from;
    FinanzasState.toIso   = cache.to;
    FinanzasState.rows    = Array.isArray(cache.res.rows)    ? cache.res.rows    : [];
    FinanzasState.history = Array.isArray(cache.res.history) ? cache.res.history : [];
    // Rehidratamos también los inputs de fecha para que no queden en blanco
    fin_syncDateInputsFromState_();
    renderFinanzas_();
  } else {
    // si no hay cache y volvemos por SPA, no duplicamos init
    // disparo manual de carga si el chart está vacío
    const host = fin_$id("finCashflowChart");
    if (host && !host.innerHTML.trim()) initFinanzas_();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body && document.body.getAttribute("data-page") === "finanzas") {
    initFinanzas_();
  }
});

document.addEventListener("sazzu:page:load", (ev) => {
  const page = document.body ? document.body.getAttribute("data-page") : "";
  if (page === "finanzas") {
    mountFinanzas_();
  }
});
// ======================================================
// HISTORIAL FINANCIERO – Slide "Historial" (Finanzas)
// Usa action=getFinHistory y FINANZAS_BACKEND_URL_LOCAL
// ======================================================

function finHist_escape(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function finHist_getRangeParams() {
  const inFrom = document.getElementById("finDtFrom");
  const inTo   = document.getElementById("finDtTo");

  const fromVal = inFrom && inFrom.value ? String(inFrom.value).trim() : "";
  const toVal   = inTo   && inTo.value   ? String(inTo.value).trim()   : "";

  let fromParam = "";
  let toParam   = "";

  if (fromVal) fromParam = fromVal + "T00:00:00";
  if (toVal)   toParam   = toVal   + "T23:59:59";

  return { from: fromParam, to: toParam };
}

function finHist_render(payload) {
  const host = document.getElementById("finAlertsHistoryList");
  if (!host) return;

  const items = (payload && (payload.history || payload.historial)) || [];

  if (!Array.isArray(items) || items.length === 0) {
    host.innerHTML =
      '<div class="u-muted">No hay movimientos de historial en este rango.</div>';
    return;
  }

  let rangeInfo = "";
  const r = payload.range || payload.rango;
  if (r && (r.from || r.desde || r.to || r.hasta)) {
    const fromLabel = r.from  || r.desde || "";
    const toLabel   = r.to    || r.hasta || "";
    rangeInfo =
      `<div class="u-muted" style="margin-bottom:6px;">` +
      `Mostrando movimientos entre <strong>${finHist_escape(fromLabel)}</strong>` +
      ` y <strong>${finHist_escape(toLabel)}</strong>.` +
      `</div>`;
  }

  const rowsHtml = items
    .map(function (it) {
      return (
        "<tr>" +
        "<td>" + finHist_escape(it.timestamp_label || "")      + "</td>" +
        "<td>" + finHist_escape(it.id_pedido || "")            + "</td>" +
        "<td>" + finHist_escape(it.estado_anterior || "")      + "</td>" +
        "<td>" + finHist_escape(it.estado_nuevo || "")         + "</td>" +
        "<td>" + finHist_escape(it.actor || "")                + "</td>" +
        "<td>" + finHist_escape(it.origen || "")               + "</td>" +
        "</tr>"
      );
    })
    .join("");

  host.innerHTML =
    rangeInfo +
    '<div style="max-height:320px; overflow:auto;">' +
    '<table class="finHistTable" aria-label="Historial de cambios de estado de ingresos">' +
    "<thead><tr>" +
    "<th>Fecha y hora</th>" +
    "<th>ID Pedido</th>" +
    "<th>Estado anterior</th>" +
    "<th>Estado nuevo</th>" +
    "<th>Actor</th>" +
    "<th>Origen</th>" +
    "</tr></thead>" +
    "<tbody>" +
    rowsHtml +
    "</tbody></table>" +
    "</div>";
}

function finHist_fetch() {
  const host = document.getElementById("finAlertsHistoryList");
  if (!host) return;

  host.innerHTML = '<div class="u-muted">Cargando historial...</div>';

  const range = finHist_getRangeParams();
  const cbName = "__finHistCb_" + Math.random().toString(36).slice(2);

  const params = new URLSearchParams();
  params.set("action", "getFinHistory");
  params.set("callback", cbName);
  if (range.from) params.set("from", range.from);
  if (range.to)   params.set("to",   range.to);

  const url = FINANZAS_BACKEND_URL_LOCAL + "?" + params.toString();

  const script = document.createElement("script");
  script.src = url;
  script.async = true;

  const cleanup = () => {
    try { script.remove(); } catch(e) {}
    try { delete window[cbName]; } catch(e) {}
  };

  window[cbName] = function (payload) {
    cleanup();
    if (!payload || payload.ok !== true) {
      host.innerHTML =
        '<div class="u-muted">No se pudo cargar el historial financiero.</div>';
      console.warn("Historial inválido:", payload);
      return;
    }
    finHist_render(payload);
  };

  script.onerror = function () {
    cleanup();
    host.innerHTML =
      '<div class="u-muted">Error cargando historial financiero.</div>';
  };

  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", function () {
  const tabHist  = document.getElementById("finTabHistorial");
  const tabConf  = document.getElementById("finTabConfirmaciones");
  const panelHist = document.getElementById("finPanelHistorial");
  const panelConf = document.getElementById("finPanelConfirmaciones");
  const btnApply  = document.getElementById("btnApplyFin");

  if (!tabHist || !tabConf || !panelHist || !panelConf) return;

  if (!tabHist.__wiredHist) {
    tabHist.__wiredHist = true;
    tabHist.addEventListener("click", function () {
      tabHist.classList.add("is-active");
      tabConf.classList.remove("is-active");
      panelHist.style.display = "";
      panelConf.style.display = "none";
      finHist_fetch();
    });
  }

  if (btnApply && !btnApply.__wiredHistApply) {
    btnApply.__wiredHistApply = true;
    btnApply.addEventListener("click", function () {
      if (tabHist.classList.contains("is-active")) {
        finHist_fetch();
      }
    });
  }
});