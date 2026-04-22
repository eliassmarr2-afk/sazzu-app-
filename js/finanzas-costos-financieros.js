/* ======= INICIO · JS DEL SLIDE COSTOS FINANCIEROS ======= */
console.log("[finanzas-costos-financieros.js] cargado OK");

window.FinFinancialSlideState = window.FinFinancialSlideState || {
  initialized: false,
  mounted: false,
  rangeMode: "panel",
  fromIso: "",
  toIso: "",
  summary: null,
  loading: false
};

function finFin_$id(id) {
  return document.getElementById(id);
}

function finFin_getOverlay_() {
  return finFin_$id("finFinancialOverlay");
}

function finFin_getMount_() {
  return finFin_$id("finFinancialPanelMount");
}

function finFin_getRoot_() {
  const mount = finFin_getMount_();
  if (!mount) return null;
  return mount.querySelector(".finFinSlide");
}

function finFin_getBackendUrl_() {
  return window.__FINANZAS_BACKEND_URL__ || "";
}

function finFin_fmtMoney_(n) {
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  });
}

function finFin_fmtPct_(n) {
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", {
    maximumFractionDigits: 2
  }) + "%";
}

function finFin_fmtPlain_(n) {
  const x = Number(n || 0);
  const v = isFinite(x) ? x : 0;
  return v.toLocaleString("es-AR", {
    maximumFractionDigits: 2
  });
}

function finFin_normalizePctDisplay_(n) {
    const x = Number(n || 0);
    if (!isFinite(x)) return 0;
  
    // Si viene como unidad decimal (0.1787), lo convertimos a porcentaje visible (17.87)
    if (Math.abs(x) <= 1) {
      return x * 100;
    }
  
    // Si ya viene en formato porcentaje visible (17.87), lo dejamos igual
    return x;
  }

function finFin_open_() {
  const overlay = finFin_getOverlay_();
  if (!overlay) return;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
}

function finFin_close_() {
  const overlay = finFin_getOverlay_();
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
}

function finFin_bindClose_() {
  const closeBtn = finFin_$id("finFinancialClose");
  if (closeBtn && !closeBtn.__wiredFinFinancialClose) {
    closeBtn.__wiredFinFinancialClose = true;
    closeBtn.addEventListener("click", () => {
      finFin_close_();
    });
  }
}

function finFin_bindEsc_() {
  if (window.__finFinancialEscBound__) return;
  window.__finFinancialEscBound__ = true;

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    const overlay = finFin_getOverlay_();
    if (!overlay) return;
    if (!overlay.classList.contains("is-open")) return;
    finFin_close_();
  });
}

function finFin_getPanelRange_() {
  const cache = window.__FINANZAS_CACHE__ || null;

  if (cache && cache.from && cache.to) {
    return {
      fromIso: String(cache.from || ""),
      toIso: String(cache.to || "")
    };
  }

  const fromInput = document.getElementById("finDtFrom");
  const toInput = document.getElementById("finDtTo");

  const fromYmd = fromInput && fromInput.value ? String(fromInput.value).trim() : "";
  const toYmd = toInput && toInput.value ? String(toInput.value).trim() : "";

  if (fromYmd && toYmd) {
    return {
      fromIso: fromYmd + "T00:00:00-03:00",
      toIso: toYmd + "T23:59:59-03:00"
    };
  }

  // Fallback SPA/global si el panel todavía no terminó de hidratar inputs/cache
  const globalRange = window.__SAZZU_GLOBAL_RANGE__ || null;
  if (globalRange && globalRange.from && globalRange.to) {
    return {
      fromIso: String(globalRange.from || ""),
      toIso: String(globalRange.to || "")
    };
  }

  // Último recurso: si finanzas.js expone el estado, lo usamos
  if (
    typeof window.FinanzasState === "object" &&
    window.FinanzasState &&
    window.FinanzasState.fromIso &&
    window.FinanzasState.toIso
  ) {
    return {
      fromIso: String(window.FinanzasState.fromIso || ""),
      toIso: String(window.FinanzasState.toIso || "")
    };
  }

  return {
    fromIso: "",
    toIso: ""
  };
}
function finFin_jsonp_(url, cbName) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    script.onload = function() {
      script.remove();
      resolve();
    };

    script.onerror = function() {
      script.remove();
      reject(new Error("JSONP error"));
    };

    document.head.appendChild(script);
  });
}

function finFin_callBackend_(action, params) {
  return new Promise((resolve, reject) => {
    const backendUrl = finFin_getBackendUrl_();
    if (!backendUrl) {
      reject(new Error("No existe __FINANZAS_BACKEND_URL__"));
      return;
    }

    const cbName = "__fin_financial_cb_" + Math.random().toString(36).slice(2);

    window[cbName] = function(payload) {
      try {
        delete window[cbName];
      } catch (e) {
        window[cbName] = undefined;
      }
      resolve(payload);
    };

    const qs = new URLSearchParams();
    qs.set("callback", cbName);
    qs.set("action", action);

    Object.keys(params || {}).forEach((key) => {
      const v = params[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        qs.set(key, String(v));
      }
    });

    const url = backendUrl + "?" + qs.toString();

    finFin_jsonp_(url, cbName).catch((err) => {
      try {
        delete window[cbName];
      } catch (e) {}
      reject(err);
    });
  });
}

function finFin_renderTopCard_() {
    const summary = window.FinFinancialSlideState.summary || null;
    if (!summary || !summary.hero) return;
  
    const hero = summary.hero || {};
    const trend = Array.isArray(summary.trend) ? summary.trend : [];
  
    const valueEl = document.getElementById("finCostFinancialValue");
    const subEl = document.getElementById("finCostFinancialSub");
    const pctEl = document.getElementById("finCostFinancialTrendPct");
    const wrapEl = document.getElementById("finCostFinancialTrendWrap");
    const arrowEl = document.getElementById("finCostFinancialTrendArrow");
    const chartEl = document.getElementById("finCostFinancialChart");
  
    if (valueEl) {
      valueEl.textContent = finFin_fmtMoney_(hero.retencion_total_monto || 0);
    }
  
    if (subEl) {
      subEl.textContent = "Retención financiera total del rango activo.";
    }
  
    const variationPct = Number(hero.variation_pct || 0);
    const direction = String(hero.variation_direction || "flat").toLowerCase();
  
    if (pctEl) {
      const absPct = Math.abs(variationPct);
      pctEl.textContent = finFin_fmtPct_(absPct);
    }
  
    if (wrapEl) {
      wrapEl.classList.remove("is-up", "is-down", "is-neutral");
  
      if (direction === "up") {
        wrapEl.classList.add("is-up");
      } else if (direction === "down") {
        wrapEl.classList.add("is-down");
      } else {
        wrapEl.classList.add("is-neutral");
      }
    }
  
    if (arrowEl) {
      if (direction === "up") {
        arrowEl.textContent = "↑";
      } else if (direction === "down") {
        arrowEl.textContent = "↓";
      } else {
        arrowEl.textContent = "→";
      }
    }
  
    if (chartEl) {
      chartEl.innerHTML = finFin_buildTopCardSparklineSvg_(trend);
    }
  }
  
  function finFin_buildTopCardSparklineSvg_(trend) {
    const data = Array.isArray(trend) ? trend : [];
    if (!data.length) {
      return `<div class="finCostFinancial21__chartEmpty"></div>`;
    }
  
    const values = data.map(item => Number(item.retencion_real_monto || 0));
    const width = 92;
    const height = 44;
    const padX = 4;
    const padY = 4;
    const innerW = width - (padX * 2);
    const innerH = height - (padY * 2);
  
    const maxVal = Math.max(...values, 0);
    const minVal = Math.min(...values, 0);
    const span = Math.max(1, maxVal - minVal);
  
    function xAt(i) {
      if (values.length === 1) return padX + (innerW / 2);
      return padX + (i * (innerW / (values.length - 1)));
    }
  
    function yAt(v) {
      const norm = (v - minVal) / span;
      return padY + innerH - (norm * innerH);
    }
  
    const pts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    if (!pts.length) {
      return `<div class="finCostFinancial21__chartEmpty"></div>`;
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
      <svg viewBox="0 0 ${width} ${height}" class="finCostFinancial21__sparkline" aria-hidden="true">
        <defs>
          <linearGradient id="finCostFinancialSparklineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36,121,255,.22)"></stop>
            <stop offset="100%" stop-color="rgba(36,121,255,.03)"></stop>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#finCostFinancialSparklineFill)"></path>
        <path d="${linePath}" fill="none" stroke="#2479FF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }

function finFin_renderHero_(summary) {
  const hero = (summary && summary.hero) ? summary.hero : {};

  const elRetAvg   = finFin_$id("finFinHeroRetAvg");
  const elRetTotal = finFin_$id("finFinHeroRetTotal");
  const elAvgInst  = finFin_$id("finFinHeroAvgInst");
  const elGap      = finFin_$id("finFinHeroGap");

  if (elRetAvg) {
    elRetAvg.textContent = finFin_fmtPct_(hero.retencion_real_promedio_pct || 0);
  }

  if (elRetTotal) {
    elRetTotal.textContent = finFin_fmtMoney_(hero.retencion_total_monto || 0);
  }

  if (elAvgInst) {
    elAvgInst.textContent = finFin_fmtPlain_(hero.promedio_cuotas || 0);
  }

  if (elGap) {
    elGap.textContent = finFin_fmtMoney_(hero.brecha_bruto_neto || 0);
  }
}

function finFin_renderTrendChart_(summary) {
  const host = finFin_$id("finFinTrendChart");
  if (!host) return;

  const trend = Array.isArray(summary && summary.trend) ? summary.trend : [];
  if (!trend.length) {
    host.innerHTML = `
      <div class="finFinChartBox__empty">
        No hay datos para el rango seleccionado.
      </div>
    `;
    return;
  }

  const W = host.clientWidth || 760;
  const H = 320;
  const padL = 52;
  const padR = 24;
  const padT = 20;
  const padB = 38;
  const innerW = Math.max(10, W - padL - padR);
  const innerH = Math.max(10, H - padT - padB);

  const values = trend.map(item => finFin_normalizePctDisplay_(item.retencion_real_pct || 0));
  const topLine = 20.69;
  const yMax = Math.max(topLine, ...values, 1);

  function xAt(i) {
    if (trend.length === 1) return padL + innerW / 2;
    return padL + (i * (innerW / (trend.length - 1)));
  }

  function yAt(v) {
    return padT + innerH - ((v / yMax) * innerH);
  }

  let path = "";
  for (let i = 0; i < values.length; i++) {
    const x = xAt(i);
    const y = yAt(values[i]);
    path += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }

  let area = path;
  area += ` L ${xAt(values.length - 1)} ${H - padB}`;
  area += ` L ${xAt(0)} ${H - padB} Z`;

  const gridCount = 4;
  let grid = "";
  let yLabels = "";
  for (let i = 0; i <= gridCount; i++) {
    const val = (yMax / gridCount) * i;
    const yy = yAt(val);
    grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="rgba(17,24,39,.08)" stroke-width="1"/>`;
    yLabels += `<text x="${padL - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#6b7280">${finFin_fmtPlain_(val)}%</text>`;
  }

  let xLabels = "";
  const every = Math.max(1, Math.floor(trend.length / 6));
  for (let i = 0; i < trend.length; i += every) {
    const xi = xAt(i);
    const lab = String(trend[i].date || "").slice(5);
    xLabels += `<text x="${xi}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#6b7280">${lab}</text>`;
  }

  const topY = yAt(topLine);

  host.innerHTML = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="Tendencia de costo financiero total">
      <defs>
        <linearGradient id="finFinTrendArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(36,121,255,0.22)"/>
          <stop offset="100%" stop-color="rgba(36,121,255,0.02)"/>
        </linearGradient>
      </defs>

      <g>${grid}${yLabels}</g>

      <line
        x1="${padL}"
        y1="${topY}"
        x2="${W - padR}"
        y2="${topY}"
        stroke="rgba(245, 158, 11, 0.9)"
        stroke-width="1.5"
        stroke-dasharray="6 5"
      />
      <text
        x="${W - padR}"
        y="${topY - 8}"
        text-anchor="end"
        font-size="11"
        fill="#b45309"
      >
        Tope cuotas 20,69%
      </text>

      <path d="${area}" fill="url(#finFinTrendArea)"></path>
      <path d="${path}" fill="none" stroke="#2479FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>

      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(17,24,39,.16)" stroke-width="1"/>
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(17,24,39,.16)" stroke-width="1"/>

      <g>${xLabels}</g>
    </svg>
  `;
}

function finFin_renderGapChart_(summary) {
  const host = finFin_$id("finFinGapChart");
  if (!host) return;

  const gap = Array.isArray(summary && summary.gap) ? summary.gap : [];
  if (!gap.length) {
    host.innerHTML = `
      <div class="finFinChartBox__empty">
        No hay datos para el rango seleccionado.
      </div>
    `;
    return;
  }

  const rows = gap.slice(-8);
  const maxVal = Math.max(
    ...rows.map(r => Number(r.bruto || 0)),
    ...rows.map(r => Number(r.neto || 0)),
    1
  );

  const bars = rows.map((row) => {
    const bruto = Number(row.bruto || 0);
    const neto = Number(row.neto || 0);
    const brutoH = Math.max(6, (bruto / maxVal) * 180);
    const netoH = Math.max(6, (neto / maxVal) * 180);

    return `
      <div class="finFinMiniBarGroup">
        <div class="finFinMiniBarGroup__bars">
          <div class="finFinMiniBar finFinMiniBar--bruto" style="height:${brutoH}px;" title="Bruto ${finFin_fmtMoney_(bruto)}"></div>
          <div class="finFinMiniBar finFinMiniBar--neto" style="height:${netoH}px;" title="Neto ${finFin_fmtMoney_(neto)}"></div>
        </div>
        <div class="finFinMiniBarGroup__label">${String(row.date || "").slice(5)}</div>
      </div>
    `;
  }).join("");

  host.innerHTML = `
    <div class="finFinMiniBarsWrap">
      <div class="finFinMiniBarsLegend">
        <span><i class="finFinMiniBarsLegend__dot finFinMiniBarsLegend__dot--bruto"></i>Bruto</span>
        <span><i class="finFinMiniBarsLegend__dot finFinMiniBarsLegend__dot--neto"></i>Neto</span>
      </div>
      <div class="finFinMiniBarsChart">
        ${bars}
      </div>
    </div>
  `;
}

function finFin_renderNotifications_(summary) {
  const host = finFin_$id("finFinNotifyList");
  if (!host) return;

  const items = Array.isArray(summary && summary.notifications) ? summary.notifications : [];
  if (!items.length) {
    host.innerHTML = `
      <div class="finFinNotifyList__empty">
        No hay notificaciones para el rango seleccionado.
      </div>
    `;
    return;
  }

  host.innerHTML = items.map((item) => {
    return `
      <article class="finFinNotifyCard finFinNotifyCard--${item.status_key || "futuro"}">
        <div class="finFinNotifyCard__top">
          <div class="finFinNotifyCard__title">${item.message || "-"}</div>
          <span class="finFinNotifyCard__chip">${item.status_label || "-"}</span>
        </div>

        <div class="finFinNotifyCard__meta">
          <span>Ingreso: ${item.fecha_ingreso_label || "-"}</span>
          <span>Estado: ${item.estado_cobro || "-"}</span>
        </div>

        <div class="finFinNotifyCard__values">
          <div>
            <strong>Bruto</strong>
            <span>${finFin_fmtMoney_(item.bruto || 0)}</span>
          </div>
          <div>
            <strong>Neto</strong>
            <span>${finFin_fmtMoney_(item.neto || 0)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function finFin_renderInstallmentsChart_(summary) {
  const host = finFin_$id("finFinInstallmentsChart");
  if (!host) return;

  const trend = Array.isArray(summary && summary.trend) ? summary.trend : [];
  if (!trend.length) {
    host.innerHTML = `
      <div class="finFinChartBox__empty">
        No hay datos para el rango seleccionado.
      </div>
    `;
    return;
  }

  const W = host.clientWidth || 980;
  const H = 360;
  const padL = 52;
  const padR = 24;
  const padT = 20;
  const padB = 46;
  const innerW = Math.max(10, W - padL - padR);
  const innerH = Math.max(10, H - padT - padB);

  const quotaValues = trend.map(item => Number(item.promedio_cuotas || 0));
  const salesValues = trend.map(item => Number(item.pedidos || 0));

  const yMaxQuota = 9;
  const yMaxSales = Math.max(1, ...salesValues);

  function xAt(i) {
    if (trend.length === 1) return padL + innerW / 2;
    return padL + (i * (innerW / (trend.length - 1)));
  }

  function yQuota(v) {
    const safe = Math.max(0, Math.min(v, yMaxQuota));
    return padT + innerH - ((safe / yMaxQuota) * innerH);
  }

  function ySales(v) {
    const safe = Math.max(0, v);
    return padT + innerH - ((safe / yMaxSales) * innerH);
  }

  let linePath = "";
  for (let i = 0; i < quotaValues.length; i++) {
    const x = xAt(i);
    const y = yQuota(quotaValues[i]);
    linePath += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  }

  let areaPath = linePath;
  areaPath += ` L ${xAt(quotaValues.length - 1)} ${H - padB}`;
  areaPath += ` L ${xAt(0)} ${H - padB} Z`;

  const gridCount = 3;
  let grid = "";
  let yLabelsLeft = "";
  for (let i = 0; i <= gridCount; i++) {
    const val = (yMaxQuota / gridCount) * i;
    const yy = yQuota(val);
    grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="rgba(17,24,39,.08)" stroke-width="1"/>`;
    yLabelsLeft += `<text x="${padL - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#6b7280">${finFin_fmtPlain_(val)}</text>`;
  }

  let yLabelsRight = "";
  for (let i = 0; i <= gridCount; i++) {
    const val = (yMaxSales / gridCount) * i;
    const yy = ySales(val);
    yLabelsRight += `<text x="${W - padR + 8}" y="${yy + 4}" text-anchor="start" font-size="11" fill="#94a3b8">${finFin_fmtPlain_(val)}</text>`;
  }

  let xLabels = "";
  const every = Math.max(1, Math.floor(trend.length / 6));
  for (let i = 0; i < trend.length; i += every) {
    const xi = xAt(i);
    const lab = String(trend[i].date || "").slice(5);
    xLabels += `<text x="${xi}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#6b7280">${lab}</text>`;
  }

  const barW = Math.max(10, Math.min(22, innerW / Math.max(1, trend.length * 1.8)));
  const bars = trend.map((item, i) => {
    const x = xAt(i) - (barW / 2);
    const y = ySales(Number(item.pedidos || 0));
    const h = Math.max(0, (H - padB) - y);
    return `
      <rect
        x="${x}"
        y="${y}"
        width="${barW}"
        height="${h}"
        rx="5"
        fill="rgba(148,163,184,.28)"
      ></rect>
    `;
  }).join("");

  host.innerHTML = `
    <div style="position:relative; width:100%; height:${H}px;">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="Promedio de cuotas por día">
        <defs>
          <linearGradient id="finFinInstallmentsArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36,121,255,0.24)"/>
            <stop offset="100%" stop-color="rgba(36,121,255,0.03)"/>
          </linearGradient>
        </defs>

        <g>${grid}${yLabelsLeft}${yLabelsRight}</g>

        <g>${bars}</g>

        <path d="${areaPath}" fill="url(#finFinInstallmentsArea)"></path>
        <path d="${linePath}" fill="none" stroke="#2479FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>

        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(17,24,39,.16)" stroke-width="1"/>
        <line x1="${W - padR}" y1="${padT}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(148,163,184,.16)" stroke-width="1"/>
        <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(17,24,39,.16)" stroke-width="1"/>

        <text
          x="${padL}"
          y="${padT - 6}"
          text-anchor="start"
          font-size="11"
          fill="#6b7280"
        >
          Tope visual: 9 cuotas
        </text>

        <text
          x="${W - padR}"
          y="${padT - 6}"
          text-anchor="end"
          font-size="11"
          fill="#94a3b8"
        >
          Ventas por día
        </text>

        <g>${xLabels}</g>

        <rect
          id="finFinInstallmentsHoverZone"
          x="${padL}"
          y="${padT}"
          width="${innerW}"
          height="${innerH}"
          fill="transparent"
          style="cursor:crosshair;"
        ></rect>
      </svg>

      <div
        id="finFinInstallmentsTooltip"
        style="
          position:absolute;
          left:0;
          top:0;
          transform:translate(-9999px,-9999px);
          background:#000000;
          color:#ffffff;
          border-radius:15px;
          padding:10px 12px;
          min-width:210px;
          box-shadow:0 10px 24px rgba(0,0,0,.24);
          pointer-events:none;
          z-index:4;
          font-size:12px;
          line-height:1.4;
        "
      >
        <div style="font-size:11px; opacity:.75; text-transform:uppercase; letter-spacing:.04em;">Periodo</div>
        <div id="finFinInstallmentsTooltipPeriod" style="font-weight:700; margin-top:2px;">-</div>

        <div style="font-size:11px; opacity:.75; text-transform:uppercase; letter-spacing:.04em; margin-top:8px;">Promedio de cuotas</div>
        <div id="finFinInstallmentsTooltipAvg" style="font-weight:700; margin-top:2px;">-</div>

        <div style="font-size:11px; opacity:.75; text-transform:uppercase; letter-spacing:.04em; margin-top:8px;">Ventas del día</div>
        <div id="finFinInstallmentsTooltipSales" style="font-weight:700; margin-top:2px;">-</div>
      </div>

      <div style="display:flex; gap:18px; align-items:center; margin-top:10px; flex-wrap:wrap; font-size:13px; color:#6b7280;">
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <i style="width:10px; height:10px; border-radius:999px; background:#2479FF; display:inline-block;"></i>
          Promedio de cuotas
        </span>
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <i style="width:12px; height:12px; border-radius:4px; background:rgba(148,163,184,.45); display:inline-block;"></i>
          Ventas por día
        </span>
      </div>
    </div>
  `;

  const hoverZone = document.getElementById("finFinInstallmentsHoverZone");
  const tooltip = document.getElementById("finFinInstallmentsTooltip");
  const tooltipPeriod = document.getElementById("finFinInstallmentsTooltipPeriod");
  const tooltipAvg = document.getElementById("finFinInstallmentsTooltipAvg");
  const tooltipSales = document.getElementById("finFinInstallmentsTooltipSales");

  if (!hoverZone || !tooltip || !tooltipPeriod || !tooltipAvg || !tooltipSales) return;

  function hideTooltip() {
    tooltip.style.transform = "translate(-9999px,-9999px)";
  }

  function showTooltip(ev) {
    const rect = hoverZone.getBoundingClientRect();
    const relX = ev.clientX - rect.left;
    const safeX = Math.max(0, Math.min(relX, innerW));

    let idx = 0;
    if (trend.length > 1) {
      idx = Math.round((safeX / innerW) * (trend.length - 1));
    }

    const item = trend[idx] || {};
    tooltipPeriod.textContent = String(item.date || "-");
    tooltipAvg.textContent = finFin_fmtPlain_(item.promedio_cuotas || 0) + " cuotas";
    tooltipSales.textContent = finFin_fmtPlain_(item.pedidos || 0) + " venta(s)";

    const hostRect = host.getBoundingClientRect();
    const tooltipWidth = 220;
    const tooltipHeight = 110;

    let left = ev.clientX - hostRect.left + 14;
    let top = ev.clientY - hostRect.top - tooltipHeight - 10;

    if (left + tooltipWidth > hostRect.width - 8) {
      left = hostRect.width - tooltipWidth - 8;
    }

    if (left < 8) left = 8;
    if (top < 8) top = ev.clientY - hostRect.top + 12;

    tooltip.style.transform = `translate(${left}px, ${top}px)`;
  }

  hoverZone.addEventListener("mousemove", showTooltip);
  hoverZone.addEventListener("mouseenter", showTooltip);
  hoverZone.addEventListener("mouseleave", hideTooltip);
}

function finFin_renderAll_(summary) {
  const data = summary || window.FinFinancialSlideState.summary || null;
  if (!data) return;

  finFin_renderTopCard_();
  finFin_renderHero_(data);
  finFin_renderTrendChart_(data);
  finFin_renderGapChart_(data);
  finFin_renderNotifications_(data);
  finFin_renderInstallmentsChart_(data);
}

function finFin_isSameRange_(nextRange) {
    const state = window.FinFinancialSlideState || {};
    if (!nextRange) return false;
  
    const aFrom = String(state.fromIso || "");
    const aTo = String(state.toIso || "");
    const bFrom = String(nextRange.fromIso || "");
    const bTo = String(nextRange.toIso || "");
  
    return !!aFrom && !!aTo && aFrom === bFrom && aTo === bTo;
  }
  
  function finFin_hasUsableSummary_() {
    const state = window.FinFinancialSlideState || {};
    return !!(state.summary && typeof state.summary === "object" && state.summary.ok);
  }

  function finFin_renderLoading_() {
    const overlay = finFin_getOverlay_();
    const isOpen = !!(overlay && overlay.classList.contains("is-open"));
    if (!isOpen) return;
  
    const trend = finFin_$id("finFinTrendChart");
    const gap = finFin_$id("finFinGapChart");
    const notify = finFin_$id("finFinNotifyList");
  
    if (trend) {
      trend.innerHTML = `<div class="finFinChartBox__empty">Cargando tendencia...</div>`;
    }
    if (gap) {
      gap.innerHTML = `<div class="finFinChartBox__empty">Cargando brecha...</div>`;
    }
    if (notify) {
      notify.innerHTML = `<div class="finFinNotifyList__empty">Cargando notificaciones...</div>`;
    }
  }

async function finFin_loadSummary_() {
    const range = finFin_getPanelRange_();
  
    if (!range.fromIso || !range.toIso) {
      throw new Error("No hay un rango activo en el panel Finanzas.");
    }
  
    const sameRange = finFin_isSameRange_(range);
    const hasSummary = finFin_hasUsableSummary_();
  
    if (sameRange && hasSummary) {
      return window.FinFinancialSlideState.summary;
    }
  
    window.FinFinancialSlideState.rangeMode = "panel";
    window.FinFinancialSlideState.fromIso = range.fromIso;
    window.FinFinancialSlideState.toIso = range.toIso;
    window.FinFinancialSlideState.loading = true;
  
    finFin_renderLoading_();
  
    const res = await finFin_callBackend_("getFinancialCostsSlideSummary", {
      from: range.fromIso,
      to: range.toIso
    });
  
    if (!res || !res.ok) {
      throw new Error((res && res.error) ? res.error : "Backend error en getFinancialCostsSlideSummary");
    }
  
    window.FinFinancialSlideState.summary = res;
    window.FinFinancialSlideState.loading = false;
  
    return res;
  }

async function finFin_refreshFromBackend_() {
  try {
    const summary = await finFin_loadSummary_();
    finFin_renderAll_(summary);
  } catch (err) {
    console.error("[finanzas-costos-financieros] error cargando summary", err);

    const trend = finFin_$id("finFinTrendChart");
    const gap = finFin_$id("finFinGapChart");
    const notify = finFin_$id("finFinNotifyList");

    if (trend) {
      trend.innerHTML = `<div class="finFinChartBox__empty">Error al cargar tendencia.</div>`;
    }
    if (gap) {
      gap.innerHTML = `<div class="finFinChartBox__empty">Error al cargar brecha.</div>`;
    }
    if (notify) {
      notify.innerHTML = `<div class="finFinNotifyList__empty">Error al cargar notificaciones.</div>`;
    }
  }
}

function finFin_initExtraStyles_() {
  if (document.getElementById("finFinDynamicStyles")) return;

  const style = document.createElement("style");
  style.id = "finFinDynamicStyles";
  style.textContent = `
    .finFinMiniBarsWrap{width:100%;}
    .finFinMiniBarsLegend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;font-size:13px;color:#6b7280}
    .finFinMiniBarsLegend span{display:inline-flex;align-items:center;gap:8px}
    .finFinMiniBarsLegend__dot{width:10px;height:10px;border-radius:999px;display:inline-block}
    .finFinMiniBarsLegend__dot--bruto{background:#2479FF}
    .finFinMiniBarsLegend__dot--neto{background:#94a3b8}
    .finFinMiniBarsChart{display:flex;align-items:flex-end;gap:16px;min-height:230px;padding-top:12px}
    .finFinMiniBarGroup{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:56px}
    .finFinMiniBarGroup__bars{display:flex;align-items:flex-end;gap:8px;height:190px}
    .finFinMiniBar{width:18px;border-radius:5px 5px 0 0}
    .finFinMiniBar--bruto{background:#2479FF}
    .finFinMiniBar--neto{background:#94a3b8}
    .finFinMiniBarGroup__label{font-size:11px;color:#6b7280}
    .finFinNotifyCard{background:#fff;border:1px solid rgba(17,24,39,.06);border-radius:5px;padding:14px 14px 12px;box-shadow:0 10px 24px rgba(15,23,42,.04)}
    .finFinNotifyCard + .finFinNotifyCard{margin-top:12px}
    .finFinNotifyCard__top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .finFinNotifyCard__title{font-size:14px;line-height:1.45;font-weight:700;color:#111827}
    .finFinNotifyCard__chip{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#475569;background:#f1f5f9;border-radius:999px;padding:6px 10px;white-space:nowrap}
    .finFinNotifyCard__meta{display:flex;flex-direction:column;gap:4px;margin-top:10px;font-size:12px;color:#6b7280}
    .finFinNotifyCard__values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
    .finFinNotifyCard__values div{display:flex;flex-direction:column;gap:4px;background:#f8fafc;border-radius:5px;padding:10px}
    .finFinNotifyCard__values strong{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#64748b}
    .finFinNotifyCard__values span{font-size:14px;font-weight:700;color:#111827}
    .finFinNotifyCard--corroborar{border-left:4px solid #f59e0b}
    .finFinNotifyCard--hoy{border-left:4px solid #2479FF}
    .finFinNotifyCard--futuro{border-left:4px solid #94a3b8}
    .finFinNotifyCard--ingresado{border-left:4px solid #10b981}
  `;
  document.head.appendChild(style);
}

function finFin_initSlide_() {
  const root = finFin_getRoot_();
  if (!root) {
    console.warn("[finanzas-costos-financieros] no se encontró .finFinSlide");
    return;
  }

  finFin_bindClose_();
  finFin_bindEsc_();
  finFin_initExtraStyles();

  window.FinFinancialSlideState.initialized = true;
  window.FinFinancialSlideState.mounted = true;

  if (finFin_hasUsableSummary_() && finFin_isSameRange_(finFin_getPanelRange_())) {
    finFin_renderAll_(window.FinFinancialSlideState.summary);
  } else {
    finFin_refreshFromBackend_();
  }

  console.log("[finanzas-costos-financieros] slide inicializado OK");
}

function finFin_initExtraStyles() {
  finFin_initExtraStyles_();
}

function finFin_refreshSlide_(summary) {
  if (summary && typeof summary === "object") {
    window.FinFinancialSlideState.summary = summary;
    finFin_renderAll_(summary);
    return;
  }

  finFin_refreshFromBackend_();
}

function finFin_bootTopCard_() {
    const card = document.getElementById("btnFinCostFinancial");
    if (!card) return;
  
    const applyBtn = document.getElementById("btnApplyFin");
  
    if (applyBtn && !applyBtn.__wiredFinancialTopCard) {
      applyBtn.__wiredFinancialTopCard = true;
      applyBtn.addEventListener("click", () => {
        setTimeout(() => {
          finFin_refreshFromBackend_();
        }, 120);
      });
    }
  
    // Si ya hay summary en memoria, rehidratamos sin pedir nada.
    if (finFin_hasUsableSummary_()) {
      finFin_renderTopCard_();
      return;
    }
  
    // Primera carga real
    finFin_syncTopCard_();
  }
  
  // Exponemos un boot reutilizable para rehidratación SPA
  window.finFinancialTopCardBoot_ = finFin_bootTopCard_;

  function finFin_syncTopCard_() {
    const card = document.getElementById("btnFinCostFinancial");
    if (!card) return;
  
    const currentRange = finFin_getPanelRange_();
    const sameRange = finFin_isSameRange_(currentRange);
    const hasSummary = finFin_hasUsableSummary_();
  
    // Caso ideal: mismo rango + summary ya cargado
    if (sameRange && hasSummary) {
      finFin_renderTopCard_();
      return;
    }
  
    // Si ya hay summary pero el rango visible del panel todavía no está listo,
    // al menos rehidratamos la card para que NO vuelva a cero.
    if ((!currentRange.fromIso || !currentRange.toIso) && hasSummary) {
      finFin_renderTopCard_();
      return;
    }
  
    // Solo llamamos backend si hay rango válido y realmente cambió / no hay datos
    if (currentRange.fromIso && currentRange.toIso) {
      finFin_refreshFromBackend_();
    }
  }
  
  window.finFinancialTopCardSync_ = finFin_syncTopCard_;
  
window.finFinancialSlideModule = window.finFinancialSlideModule || {
  init: finFin_initSlide_,
  refresh: finFin_refreshSlide_,
  open: finFin_open_,
  close: finFin_close_
};

/* ======= FIN · JS DEL SLIDE COSTOS FINANCIEROS ======= */