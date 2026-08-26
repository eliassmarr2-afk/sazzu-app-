console.log("[finanzas-movimientos-v2-final.js] cargado OK");

(function () {
  const BUILD = "FIN_MOVEMENTS_V2_FINAL_20260709_01";

  function id(name) {
    return document.getElementById(name);
  }

  function money(value) {
    const n = Number(value || 0);
    return n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    });
  }

  function ymdFromIso(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.slice(0, 10);
  }

  function todayYmd() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function addDaysYmd(ymd, days) {
    if (!ymd) return "";
    const d = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return ymd;

    d.setDate(d.getDate() + Number(days || 0));

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function addDaysToIsoEnd(iso, days) {
    const ymd = ymdFromIso(iso);
    if (!ymd) return iso;

    const next = addDaysYmd(ymd, days);
    return `${next}T23:59:59-03:00`;
  }

  function dateLabel(ymd) {
    const raw = String(ymd || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";

    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));

    const months = [
      "Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.",
      "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."
    ];

    const label = `${day} de ${months[Math.max(0, Math.min(11, month - 1))]}`;
    return year === new Date().getFullYear() ? label : `${label} ${year}`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isDemoRow(row) {
    const haystack = [
      row && row.id,
      row && row.shopify_order_name,
      row && row.shopify_order_id,
      row && row.customer_name,
      row && row.customer_email,
      row && row.source
    ].join(" ").toUpperCase();

    return (
      haystack.includes("TEST") ||
      haystack.includes("SIM") ||
      haystack.includes("DEMO") ||
      haystack.includes("@TEST.COM") ||
      haystack.includes("CLIENTE TEST") ||
      haystack.includes("CLIENTE EDGE") ||
      haystack.includes("900001") ||
      haystack.includes("900002")
    );
  }

  function cleanRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter((row) => !isDemoRow(row));
  }

  function isCod(row) {
    if (!row) return false;
    if (row.is_cod === true) return true;

    const haystack = [
      row.provider,
      row.payment_gateway,
      row.payment_method,
      row.source,
      row.applied_rule_snapshot && row.applied_rule_snapshot.provider,
      row.applied_rule_snapshot && row.applied_rule_snapshot.rule_code
    ].join(" ").toLowerCase();

    return (
      haystack.includes("cod") ||
      haystack.includes("cash_on_delivery") ||
      haystack.includes("contra") ||
      haystack.includes("reembolso")
    );
  }

  function statusKind(row) {
    const haystack = [
      row && row.estado_ingreso,
      row && row.payment_status
    ].join(" ").toLowerCase();

    if (haystack.includes("interven")) return "intervened";
    if (haystack.includes("proces") || haystack.includes("processed")) return "processed";
    return "pending";
  }

  function gross(row) {
    const candidates = [
      row && row.gross_amount,
      row && row.monto_bruto_n,
      row && row.net_expected_amount,
      row && row.neto_ingreso_v
    ];

    for (const value of candidates) {
      const n = Number(value || 0);
      if (Number.isFinite(n) && n !== 0) return n;
    }

    return 0;
  }

  function panelRows(rows) {
    const state = window.FinanzasState || {};
    const maxYmd = ymdFromIso(state.toIso);

    return cleanRows(rows).filter((row) => {
      if (!maxYmd) return true;

      const movementYmd = ymdFromIso(
        row.fecha_ingreso_iso ||
        row.movement_date_iso ||
        row.fecha_compra_iso
      );

      return !movementYmd || movementYmd <= maxYmd;
    });
  }

  function pctLabel(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n === 0) return "0%";
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return pct.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
  }

  function feeLabel(pctValue, amount) {
    return `${pctLabel(pctValue)} · ${money(Number(amount || 0))}`;
  }

  function ruleCode(row) {
    const snap = row && row.applied_rule_snapshot;
    return String(
      (snap && (snap.rule_code || snap.ruleCode || snap.code)) ||
      row.rule_code ||
      ""
    ).trim();
  }

  function providerLabel(row, cod) {
    if (cod) return "COD · Contra-entrega";

    const provider = String(row.provider || row.payment_gateway || "financiero").toLowerCase();

    if (provider.includes("mercadopago")) return "Financiero · Mercado Pago";
    if (provider.includes("bank") || provider.includes("banco")) return "Financiero · Banco";
    if (provider.includes("card") || provider.includes("tarjeta")) return "Financiero · Tarjeta";

    return "Financiero · Pasarela";
  }

  function applyKpis(rows) {
    const sourceRows = panelRows(rows || (window.FinanzasState && window.FinanzasState.rows));

    let brutoCod = 0;
    let brutoFinancial = 0;
    let sumFinancialCostPct = 0;
    let countFinancialCostPct = 0;
    let sumCollectionPct = 0;
    let countCollectionPct = 0;

    for (const row of sourceRows) {
      const cod = isCod(row);
      const status = statusKind(row);

      if (status !== "intervened") {
        if (cod) brutoCod += gross(row);
        else brutoFinancial += gross(row);
      }

      if (!cod) {
        const financialPct = Number(row.retencion_cuotas_u || row.total_financial_cost_rate);
        if (Number.isFinite(financialPct) && financialPct !== 0) {
          sumFinancialCostPct += financialPct;
          countFinancialCostPct += 1;
        }

        const collectionUnit = Number(row.retencion_real_w);
        if (Number.isFinite(collectionUnit) && collectionUnit !== 0) {
          sumCollectionPct += collectionUnit;
          countCollectionPct += 1;
        }
      }
    }

    const brutoOperativo = brutoCod + brutoFinancial;
    const avgFinancial = countFinancialCostPct ? sumFinancialCostPct / countFinancialCostPct : 0;
    const avgCollection = countCollectionPct ? sumCollectionPct / countCollectionPct : 0;

    const elOperativo = id("kpiFinBrutoN");
    const elCod = id("kpiFinBrutoCOD");
    const elFinancial = id("kpiFinBrutoElectronic");
    const elU = id("kpiFinRetU");
    const elW = id("kpiFinRetW");

    if (elOperativo) elOperativo.textContent = money(brutoOperativo);
    if (elCod) elCod.textContent = money(brutoCod);
    if (elFinancial) elFinancial.textContent = money(brutoFinancial);
    if (elU) elU.textContent = avgFinancial.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
    if (elW) elW.textContent = pctLabel(avgCollection);

    console.log("[finanzas-v2-final] KPIs corregidos", {
      brutoOperativo,
      brutoCod,
      brutoFinancial,
      rows: sourceRows.length
    });
  }

  function buildSeries(rows) {
    const byDate = {};
    const dates = [];

    function bucket() {
      return {
        financial: { processed: 0, pending: 0, overdue: 0, countProcessed: 0, countPending: 0, countOverdue: 0 },
        cod: { processed: 0, pending: 0, overdue: 0, countProcessed: 0, countPending: 0, countOverdue: 0 },
        intervened: { financial: 0, cod: 0, countFinancial: 0, countCod: 0 }
      };
    }

    for (const row of panelRows(rows)) {
      const ymd = ymdFromIso(row.fecha_ingreso_iso || row.movement_date_iso || row.fecha_compra_iso);
      if (!ymd) continue;

      const cod = isCod(row);
      const status = statusKind(row);
      const amount = gross(row);

      if (!byDate[ymd]) {
        byDate[ymd] = bucket();
        dates.push(ymd);
      }

      const b = byDate[ymd];

      if (status === "intervened") {
        if (cod) {
          b.intervened.cod += amount;
          b.intervened.countCod += 1;
        } else {
          b.intervened.financial += amount;
          b.intervened.countFinancial += 1;
        }
        continue;
      }

      const target = cod ? b.cod : b.financial;
      if (status === "processed") {
        target.processed += amount;
        target.countProcessed += 1;
      } else {
        target.pending += amount;
        target.countPending += 1;
      }
    }

    dates.sort();

    return {
      dates,
      financial: dates.map((d) => {
        const b = byDate[d].financial;
        return b.processed + b.pending + b.overdue;
      }),
      cod: dates.map((d) => {
        const b = byDate[d].cod;
        return b.processed + b.pending + b.overdue;
      }),
      intervened: dates.map((d) => {
        const b = byDate[d].intervened;
        return b.financial + b.cod;
      }),
      details: dates.map((d) => byDate[d])
    };
  }

  function buildAlerts(rows) {
    const state = window.FinanzasState || {};
    const sourceRows = cleanRows(
      Array.isArray(state.alertRows) && state.alertRows.length
        ? state.alertRows
        : rows
    );

    const alerts = [];
    const today = todayYmd();
    const tomorrow = addDaysYmd(today, 1);

    for (const row of sourceRows) {
      if (statusKind(row) !== "pending") continue;

      const cod = isCod(row);
      const purchaseYmd = ymdFromIso(row.fecha_compra_iso || row.movement_date_iso || row.fecha_ingreso_iso);
      const incomeYmd = ymdFromIso(row.fecha_ingreso_iso || row.movement_date_iso || row.fecha_compra_iso);

      const dueYmd = cod ? addDaysYmd(purchaseYmd, 20) : incomeYmd;
      if (!dueYmd) continue;

      if (dueYmd > tomorrow) continue;

      let status = "por_entrar";

      if (dueYmd === tomorrow) {
        status = "por_entrar";
      } else if (dueYmd === today) {
        status = "hoy";
      } else {
        const diff = Math.round(
          (new Date(`${today}T00:00:00`).getTime() - new Date(`${dueYmd}T00:00:00`).getTime()) / 86400000
        );

        status = diff === 1 ? "vencio_ayer" : "vencido";
      }

      alerts.push({
        id: String(row.id || ""),
        channel: cod ? "cod" : "financial",
        channel_label: providerLabel(row, cod),
        due_ymd: dueYmd,
        fecha_compra_ymd: purchaseYmd,
        fecha_ingreso_ymd: incomeYmd,
        estado_ingreso: String(row.estado_ingreso || "Pendiente"),
        gross_amount: gross(row),
        net_expected_amount: Number(row.net_expected_amount ?? row.neto_ingreso_v ?? 0),
        collection_fee_amount: Number(row.collection_fee_amount || 0),
        total_financial_cost_amount: Number(row.total_financial_cost_amount || 0),
        total_financial_cost_rate: Number(row.total_financial_cost_rate || row.retencion_cuotas_u || 0),
        collection_fee_rate_unit: Number(row.retencion_real_w || 0),
        installments_count: Number(row.installments_count || 1),
        payout_delay_days: Number(row.payout_delay_days || 0),
        rule_code: ruleCode(row),
        status
      });
    }

    alerts.sort((a, b) => {
      const rank = (status) => {
        if (status === "vencido") return 0;
        if (status === "vencio_ayer") return 1;
        if (status === "hoy") return 2;
        return 3;
      };

      const diff = rank(a.status) - rank(b.status);
      if (diff) return diff;

      if (a.channel !== b.channel) return a.channel === "financial" ? -1 : 1;

      return String(a.due_ymd || "").localeCompare(String(b.due_ymd || ""));
    });

    return alerts;
  }

  function renderAlerts() {
    const state = window.FinanzasState || {};
    const list = id("finAlertsList");
    const empty = id("finAlertsEmpty");
    if (!list) return;

    const alerts = Array.isArray(state.alerts) ? state.alerts : [];

    list.innerHTML = "";

    if (!alerts.length) {
      if (empty) {
        empty.style.display = "";
        empty.textContent = "No hay cobros para revisar en este momento.";
      }
      return;
    }

    if (empty) empty.style.display = "none";

    function chip(alert) {
      if (alert.status === "por_entrar") return "Entra mañana";
      if (alert.status === "hoy") return "Entra hoy";
      if (alert.status === "vencio_ayer") return "Venció ayer";
      return "Vencido";
    }

    function statusText(alert) {
      if (alert.status === "por_entrar") return "Entra mañana";
      if (alert.status === "hoy") return "Entra hoy · confirmar ingreso";
      if (alert.status === "vencio_ayer") return "Venció ayer";
      return "Vencido";
    }

    function statusClass(alert) {
      return alert.status === "vencio_ayer" ? "vencido" : alert.status;
    }

    function selectMarkup(alert, estadoLabel) {
      const lower = String(estadoLabel || "").toLowerCase();
      const selPend = lower.includes("pend") ? "selected" : "";
      const selProc = lower.includes("proces") ? "selected" : "";
      const selInt = lower.includes("inter") ? "selected" : "";

      return `
        <select class="finEstadoIngresoSelect" data-id="${escapeHtml(alert.id)}" data-current="${escapeHtml(estadoLabel)}">
          <option value="Pendiente" ${selPend}>Pendiente</option>
          <option value="Procesado" ${selProc}>Procesado</option>
          <option value="Intervenido" ${selInt}>Intervenido</option>
        </select>
      `;
    }

    function lockedMarkup() {
      return `
        <span class="finAlertLocked">
          <span>Automático por pasarela</span>
          <small>Se habilita desde el día de ingreso.</small>
        </span>
      `;
    }

    const frag = document.createDocumentFragment();

    for (const alert of alerts) {
      const article = document.createElement("article");

      const isFinancial = alert.channel === "financial";
      const estadoLabel = String(alert.estado_ingreso || "Pendiente");
      const idLabel = alert.id ? (alert.id.startsWith("#") ? alert.id : `#${alert.id}`) : "(sin ID)";

      const canChange =
        alert.channel === "cod" ||
        alert.status === "hoy" ||
        alert.status === "vencio_ayer" ||
        alert.status === "vencido";

      article.className = [
        "finAlertCard",
        `finAlertCard--${statusClass(alert)}`,
        isFinancial ? "finAlertCard--financial" : "finAlertCard--cod"
      ].join(" ");

      const ruleLabel = alert.rule_code
        ? `${alert.rule_code}${alert.payout_delay_days ? " · " + alert.payout_delay_days + " días" : ""}`
        : (alert.payout_delay_days ? `${alert.payout_delay_days} días` : "Sin regla visible");

      const financialRows = isFinancial ? `
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Cuotas</span>
          <span class="finAlertCard__value">${alert.installments_count} cuota${alert.installments_count === 1 ? "" : "s"}</span>
        </div>
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Costo por cobro</span>
          <span class="finAlertCard__value">${feeLabel(alert.collection_fee_rate_unit, alert.collection_fee_amount)}</span>
        </div>
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Costo cuotas / financiación</span>
          <span class="finAlertCard__value">${feeLabel(alert.total_financial_cost_rate, alert.total_financial_cost_amount)}</span>
        </div>
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Regla aplicada</span>
          <span class="finAlertCard__value">${escapeHtml(ruleLabel)}</span>
        </div>
      ` : `
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Fecha de compra</span>
          <span class="finAlertCard__value">${escapeHtml(dateLabel(alert.fecha_compra_ymd))}</span>
        </div>
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Vencimiento operativo</span>
          <span class="finAlertCard__value">${escapeHtml(dateLabel(alert.due_ymd))} · 20 días</span>
        </div>
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Costo financiero</span>
          <span class="finAlertCard__value">No aplica</span>
        </div>
      `;

      const primaryLabel = isFinancial ? "Neto esperado" : "A cobrar por repartidor";
      const primaryValue = isFinancial ? alert.net_expected_amount : alert.gross_amount;

      article.innerHTML = `
        <div class="finAlertCard__head">
          <div class="finAlertCard__titleWrap">
            <div class="finAlertCard__title">Pedido ${escapeHtml(idLabel)}</div>
            <div class="finAlertCard__channel">${escapeHtml(alert.channel_label)}</div>
          </div>
          <span class="finAlertCard__status finAlertCard__status--${statusClass(alert)}">${escapeHtml(chip(alert))}</span>
        </div>

        <div class="finAlertCard__body">
          <div class="finAlertCard__row">
            <span class="finAlertCard__label">Ingreso previsto</span>
            <span class="finAlertCard__value">${escapeHtml(dateLabel(alert.due_ymd))}</span>
          </div>
          <div class="finAlertCard__row">
            <span class="finAlertCard__label">Estado operativo</span>
            <span class="finAlertCard__value">${escapeHtml(statusText(alert))}</span>
          </div>
          <div class="finAlertCard__row">
            <span class="finAlertCard__label">Bruto vendido</span>
            <span class="finAlertCard__value">${money(alert.gross_amount)}</span>
          </div>
          <div class="finAlertCard__row finAlertCard__row--strong">
            <span class="finAlertCard__label">${escapeHtml(primaryLabel)}</span>
            <span class="finAlertCard__value">${money(primaryValue)}</span>
          </div>

          ${financialRows}

          <div class="finAlertCard__row finAlertCard__row--action">
            <span class="finAlertCard__label">Acción</span>
            <span class="finAlertCard__value">${canChange ? selectMarkup(alert, estadoLabel) : lockedMarkup()}</span>
          </div>
        </div>

        <div class="finAlertCard__meta">
          <span class="finAlertMetaPill">${escapeHtml(statusText(alert))} · previsto ${escapeHtml(dateLabel(alert.due_ymd))}</span>
          <span>${escapeHtml(alert.channel_label)}</span>
        </div>
      `;

      frag.appendChild(article);
    }

    list.appendChild(frag);
  }

  function renderAlertsAndBadge() {
    const state = window.FinanzasState || {};
    state.alerts = buildAlerts(
      Array.isArray(state.alertRows) && state.alertRows.length
        ? state.alertRows
        : state.rows
    );

    renderAlerts();

    const badge = id("finAlertsBadge");
    if (badge) {
      const count = state.alerts.length;
      badge.textContent = count ? String(count) : "";
      badge.classList.toggle("is-visible", count > 0);
    }
  }

  function injectStyles() {
    if (document.getElementById("finMovementsV2FinalStyles")) return;

    const style = document.createElement("style");
    style.id = "finMovementsV2FinalStyles";
    style.textContent = `
      [data-page="finanzas"] .finAlertCard{
        background:rgba(255,255,255,.045);
        border:1px solid rgba(255,255,255,.10);
        border-left-width:4px;
        box-shadow:none;
        color:rgba(255,255,255,.88);
      }
      [data-page="finanzas"] .finAlertCard--financial{ border-left-color:#2479FF; }
      [data-page="finanzas"] .finAlertCard--cod{ border-left-color:rgba(34,197,94,.95); }
      [data-page="finanzas"] .finAlertCard__channel{
        font-size:11px;
        font-weight:800;
        letter-spacing:.08em;
        text-transform:uppercase;
        color:rgba(255,255,255,.58);
      }
      [data-page="finanzas"] .finAlertCard__title{ color:#fff; font-weight:850; }
      [data-page="finanzas"] .finAlertCard__label{ color:rgba(255,255,255,.54); }
      [data-page="finanzas"] .finAlertCard__value{ color:rgba(255,255,255,.92); font-weight:750; text-align:right; }
      [data-page="finanzas"] .finAlertCard__row--strong,
      [data-page="finanzas"] .finAlertCard__row--action{
        padding-top:6px;
        margin-top:4px;
        border-top:1px dashed rgba(255,255,255,.12);
      }
      [data-page="finanzas"] .finEstadoIngresoSelect{
        min-width:132px;
        height:30px;
        border-radius:6px;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(0,0,0,.22);
        color:rgba(255,255,255,.92);
        padding:0 8px;
        font-size:12px;
        font-weight:750;
      }
      [data-page="finanzas"] .finAlertLocked{
        display:inline-flex;
        flex-direction:column;
        align-items:flex-end;
        gap:2px;
        color:rgba(255,255,255,.72);
      }
      [data-page="finanzas"] .finAlertLocked span{ font-weight:850; }
      [data-page="finanzas"] .finAlertLocked small{ color:rgba(255,255,255,.42); font-size:10px; }
      [data-page="finanzas"] .finAlertMetaPill{ background:rgba(36,121,255,.16); color:#dbeafe; }
    `;

    document.head.appendChild(style);
  }

  function patchFetch() {
    const original =
      window.fin_callSupabaseCashflow_ ||
      (typeof fin_callSupabaseCashflow_ === "function" ? fin_callSupabaseCashflow_ : null);

    if (!original || original.__finMovementsV2Final) return;

    const wrapped = async function (fromIso, toIso) {
      const extendedToIso = addDaysToIsoEnd(toIso, 1);
      const response = await original(fromIso, extendedToIso);

      const allRows = cleanRows(Array.isArray(response && response.rows) ? response.rows : []);

      if (window.FinanzasState) {
        window.FinanzasState.alertRows = allRows.slice();
      }

      return Object.assign({}, response, {
        rows: panelRows(allRows)
      });
    };

    wrapped.__finMovementsV2Final = true;

    try { window.fin_callSupabaseCashflow_ = wrapped; } catch (error) {}
    try { fin_callSupabaseCashflow_ = wrapped; } catch (error) {}

    window.__FINANZAS_CACHE__ = null;
  }

  function patchRenderFunctions() {
    try { window.fin_renderKpis_ = applyKpis; } catch (error) {}
    try { fin_renderKpis_ = applyKpis; } catch (error) {}

    try { window.fin_buildSeries_ = buildSeries; } catch (error) {}
    try { fin_buildSeries_ = buildSeries; } catch (error) {}

    try { window.fin_buildAlertsFromRows_ = buildAlerts; } catch (error) {}
    try { fin_buildAlertsFromRows_ = buildAlerts; } catch (error) {}

    try { window.fin_renderAlertsList_ = renderAlerts; } catch (error) {}
    try { fin_renderAlertsList_ = renderAlerts; } catch (error) {}

    const originalRender =
      window.renderFinanzas_ ||
      (typeof renderFinanzas_ === "function" ? renderFinanzas_ : null);

    if (originalRender && !originalRender.__finMovementsV2Final) {
      const wrappedRender = function () {
        originalRender();

        applyKpis();
        renderAlertsAndBadge();

        window.setTimeout(applyKpis, 80);
        window.setTimeout(renderAlertsAndBadge, 80);
        window.setTimeout(applyKpis, 250);
      };

      wrappedRender.__finMovementsV2Final = true;

      try { window.renderFinanzas_ = wrappedRender; } catch (error) {}
      try { renderFinanzas_ = wrappedRender; } catch (error) {}
    }
  }

  function watchKpiMutation() {
    const target = id("kpiFinBrutoN");
    if (!target || target.__finMovementsV2Observer) return;

    target.__finMovementsV2Observer = true;

    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__finMovementsV2KpiFixTimer);
      window.__finMovementsV2KpiFixTimer = window.setTimeout(() => applyKpis(), 10);
    });

    observer.observe(target, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  function boot() {
    if (document.body && document.body.getAttribute("data-page") !== "finanzas") return;

    injectStyles();
    patchFetch();
    patchRenderFunctions();
    watchKpiMutation();

    window.setTimeout(() => {
      applyKpis();
      renderAlertsAndBadge();
    }, 120);

    window.setTimeout(() => {
      applyKpis();
      renderAlertsAndBadge();
    }, 650);

    console.log("[finanzas-v2-final] boot OK", BUILD);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
  if (document.readyState !== "loading") boot();
})();



/* =========================================================
   FINANZAS · Movimientos V2B
   Forecast + presets + tabs scrolleables.
   Carga después del override final.
   ========================================================= */

(function () {
  const BUILD = "FIN_MOVEMENTS_V2B_FORECAST_TABS_20260709_01";
  const FORECAST_DEFAULT_DAYS = 30;

  const state = {
    forecastDays: FORECAST_DEFAULT_DAYS,
    activeTab: "todos",
    booted: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function money(value) {
    const n = Number(value || 0);
    return n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    });
  }

  function ymd(value) {
    const raw = String(value || "").trim();
    return raw ? raw.slice(0, 10) : "";
  }

  function todayYmd() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function addDaysYmd(baseYmd, days) {
    if (!baseYmd) return "";
    const d = new Date(`${baseYmd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return baseYmd;

    d.setDate(d.getDate() + Number(days || 0));

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function startOfMonthYmd() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      "01"
    ].join("-");
  }

  function startOfYearYmd() {
    return `${new Date().getFullYear()}-01-01`;
  }

  function endOfYearYmd() {
    return `${new Date().getFullYear()}-12-31`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function dateLabel(dateYmd) {
    const raw = String(dateYmd || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";

    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));

    const months = [
      "Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.",
      "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."
    ];

    const label = `${day} de ${months[Math.max(0, Math.min(11, month - 1))]}`;
    return year === new Date().getFullYear() ? label : `${label} ${year}`;
  }

  function isDemoRow(row) {
    const haystack = [
      row && row.id,
      row && row.shopify_order_name,
      row && row.shopify_order_id,
      row && row.customer_name,
      row && row.customer_email,
      row && row.source
    ].join(" ").toUpperCase();

    return (
      haystack.includes("TEST") ||
      haystack.includes("SIM") ||
      haystack.includes("DEMO") ||
      haystack.includes("@TEST.COM") ||
      haystack.includes("CLIENTE TEST") ||
      haystack.includes("CLIENTE EDGE") ||
      haystack.includes("900001") ||
      haystack.includes("900002")
    );
  }

  function cleanRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter((row) => !isDemoRow(row));
  }

  function isCod(row) {
    if (!row) return false;
    if (row.is_cod === true) return true;

    const haystack = [
      row.provider,
      row.payment_gateway,
      row.payment_method,
      row.source,
      row.applied_rule_snapshot && row.applied_rule_snapshot.provider,
      row.applied_rule_snapshot && row.applied_rule_snapshot.rule_code
    ].join(" ").toLowerCase();

    return (
      haystack.includes("cod") ||
      haystack.includes("cash_on_delivery") ||
      haystack.includes("contra") ||
      haystack.includes("reembolso")
    );
  }

  function statusKind(row) {
    const haystack = [
      row && row.estado_ingreso,
      row && row.payment_status
    ].join(" ").toLowerCase();

    if (haystack.includes("interven")) return "intervened";
    if (haystack.includes("proces") || haystack.includes("processed")) return "processed";
    return "pending";
  }

  function gross(row) {
    const candidates = [
      row && row.gross_amount,
      row && row.monto_bruto_n,
      row && row.net_expected_amount,
      row && row.neto_ingreso_v
    ];

    for (const value of candidates) {
      const n = Number(value || 0);
      if (Number.isFinite(n) && n !== 0) return n;
    }

    return 0;
  }

  function netExpected(row) {
    const n = Number(row && (row.net_expected_amount ?? row.neto_ingreso_v));
    return Number.isFinite(n) ? n : 0;
  }

  function getAllRows() {
    const fs = window.FinanzasState || {};
    const alertRows = Array.isArray(fs.alertRows) ? fs.alertRows : [];
    const panelRows = Array.isArray(fs.rows) ? fs.rows : [];

    return cleanRows(alertRows.length ? alertRows : panelRows);
  }

  function dueYmd(row) {
    const cod = isCod(row);
    const purchaseYmd = ymd(row.fecha_compra_iso || row.movement_date_iso || row.fecha_ingreso_iso);
    const incomeYmd = ymd(row.fecha_ingreso_iso || row.movement_date_iso || row.fecha_compra_iso);

    return cod ? addDaysYmd(purchaseYmd, 20) : incomeYmd;
  }

  function pctLabel(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n === 0) return "0%";
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return pct.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
  }

  function feeLabel(pctValue, amount) {
    return `${pctLabel(pctValue)} · ${money(Number(amount || 0))}`;
  }

  function ruleCode(row) {
    const snap = row && row.applied_rule_snapshot;
    return String(
      (snap && (snap.rule_code || snap.ruleCode || snap.code)) ||
      row.rule_code ||
      ""
    ).trim();
  }

  function providerLabel(row, cod) {
    if (cod) return "COD · Contra-entrega";

    const provider = String(row.provider || row.payment_gateway || "financiero").toLowerCase();

    if (provider.includes("mercadopago")) return "Financiero · Mercado Pago";
    if (provider.includes("bank") || provider.includes("banco")) return "Financiero · Banco";
    if (provider.includes("card") || provider.includes("tarjeta")) return "Financiero · Tarjeta";

    return "Financiero · Pasarela";
  }

  function forecastFinancial(days) {
    const today = todayYmd();
    const limit = addDaysYmd(today, Number(days || FORECAST_DEFAULT_DAYS));

    let total = 0;
    let count = 0;

    for (const row of getAllRows()) {
      if (isCod(row)) continue;
      if (statusKind(row) !== "pending") continue;

      const due = dueYmd(row);
      if (!due) continue;

      if (due > today && due <= limit) {
        total += netExpected(row) || gross(row);
        count += 1;
      }
    }

    return { total, count, days };
  }

  function ensureFinancialForecastLine() {
    const target = $("kpiFinBrutoElectronic");
    if (!target) return;

    const card = target.closest(".u-miniStat");
    if (!card) return;

    let line = card.querySelector("#finFinancialForecastLine");

    if (!line) {
      line = document.createElement("button");
      line.id = "finFinancialForecastLine";
      line.type = "button";
      line.className = "finForecastLine";
      line.addEventListener("click", () => {
        openAlertsTab("a_cobrar");
      });

      card.appendChild(line);
    }

    const forecast = forecastFinancial(state.forecastDays);

    const labelDays = Number(state.forecastDays || FORECAST_DEFAULT_DAYS);
    const countLabel = `${forecast.count} movimiento${forecast.count === 1 ? "" : "s"}`;

    line.innerHTML = `
      <span>${money(forecast.total)} a ingresar en los próximos ${labelDays} días</span>
      <small>${countLabel}</small>
    `;
  }

  function ensureHeaderPresetControl() {
    if ($("finRangePresetWrap")) return;

    const headerRow = document.querySelector('[data-page="finanzas"] .appHeader__right .u-row');
    if (!headerRow) return;

    const wrap = document.createElement("div");
    wrap.id = "finRangePresetWrap";
    wrap.className = "finRangePresetWrap";

    wrap.innerHTML = `
      <button type="button" class="finRangePresetBtn" id="finRangePresetBtn" aria-label="Presets de fecha">
        <span aria-hidden="true">📅</span>
      </button>

      <div class="finRangePresetMenu" id="finRangePresetMenu" hidden>
        <button type="button" data-fin-range-preset="todos">Todos</button>
        <button type="button" data-fin-range-preset="hoy">Hoy</button>
        <button type="button" data-fin-range-preset="mes">Este mes</button>
        <button type="button" data-fin-range-preset="anio">Todo el año</button>
        <button type="button" data-fin-range-preset="custom">Personalizado</button>
      </div>
    `;

    headerRow.insertBefore(wrap, headerRow.firstChild);

    const btn = $("finRangePresetBtn");
    const menu = $("finRangePresetMenu");

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      menu.hidden = !menu.hidden;
    });

    menu.addEventListener("click", (ev) => {
      const item = ev.target.closest("[data-fin-range-preset]");
      if (!item) return;

      const preset = item.getAttribute("data-fin-range-preset");
      menu.hidden = true;

      applyPreset(preset);
    });

    document.addEventListener("click", (ev) => {
      if (!wrap.contains(ev.target)) menu.hidden = true;
    });
  }

  function applyPreset(preset) {
    const fromEl = $("finDtFrom");
    const toEl = $("finDtTo");
    const applyBtn = $("btnApplyFin");

    if (!fromEl || !toEl || !applyBtn) return;

    const today = todayYmd();

    if (preset === "custom") {
      return;
    }

    if (preset === "hoy") {
      fromEl.value = today;
      toEl.value = today;
    } else if (preset === "mes") {
      fromEl.value = startOfMonthYmd();
      toEl.value = today;
    } else if (preset === "anio") {
      fromEl.value = startOfYearYmd();
      toEl.value = endOfYearYmd();
    } else {
      // Todos: amplio, pero acotado al año operativo actual para incluir futuros cercanos.
      fromEl.value = "2020-01-01";
      toEl.value = endOfYearYmd();
    }

    try {
      window.localStorage.setItem("finMovementsPreset", preset || "todos");
    } catch (err) {}

    applyBtn.click();
  }

  function maybeApplyDefaultTodos() {
    if (window.__finMovementsV2BDefaultApplied) return;
    window.__finMovementsV2BDefaultApplied = true;

    let saved = "";
    try {
      saved = window.localStorage.getItem("finMovementsPreset") || "";
    } catch (err) {}

    if (saved) return;

    window.setTimeout(() => {
      applyPreset("todos");
    }, 900);
  }

  function buildAllCards() {
    const today = todayYmd();

    const cards = [];

    for (const row of getAllRows()) {
      const kind = statusKind(row);
      const cod = isCod(row);
      const due = dueYmd(row);

      if (!due) continue;

      let bucket = "a_cobrar";
      let operationalStatus = "pendiente";

      if (kind === "intervened") {
        bucket = "intervenidos";
        operationalStatus = "intervenido";
      } else if (kind === "processed") {
        bucket = "procesados";
        operationalStatus = "procesado";
      } else if (due < today) {
        bucket = "vencidos";

        const diff = Math.round(
          (new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / 86400000
        );

        operationalStatus = diff === 1 ? "vencio_ayer" : "vencido";
      } else if (due === today) {
        bucket = "por_entrar";
        operationalStatus = "hoy";
      } else {
        bucket = "a_cobrar";
        operationalStatus = due === addDaysYmd(today, 1) ? "por_entrar" : "a_cobrar";
      }

      cards.push({
        id: String(row.id || ""),
        channel: cod ? "cod" : "financial",
        channel_label: providerLabel(row, cod),
        due_ymd: due,
        fecha_compra_ymd: ymd(row.fecha_compra_iso || row.movement_date_iso || row.fecha_ingreso_iso),
        estado_ingreso: String(row.estado_ingreso || "Pendiente"),
        gross_amount: gross(row),
        net_expected_amount: netExpected(row),
        collection_fee_amount: Number(row.collection_fee_amount || 0),
        total_financial_cost_amount: Number(row.total_financial_cost_amount || 0),
        total_financial_cost_rate: Number(row.total_financial_cost_rate || row.retencion_cuotas_u || 0),
        collection_fee_rate_unit: Number(row.retencion_real_w || 0),
        installments_count: Number(row.installments_count || 1),
        payout_delay_days: Number(row.payout_delay_days || 0),
        rule_code: ruleCode(row),
        bucket,
        operationalStatus
      });
    }

    cards.sort((a, b) => {
      const rank = (card) => {
        if (card.bucket === "vencidos") return 0;
        if (card.bucket === "por_entrar") return 1;
        if (card.bucket === "a_cobrar") return 2;
        if (card.bucket === "intervenidos") return 3;
        if (card.bucket === "procesados") return 4;
        return 9;
      };

      const diff = rank(a) - rank(b);
      if (diff) return diff;

      return String(a.due_ymd || "").localeCompare(String(b.due_ymd || ""));
    });

    return cards;
  }

  function ensureAlertSubtabs() {
    const panel = $("finPanelConfirmaciones");
    const list = $("finAlertsList");

    if (!panel || !list) return;

    let tabs = $("finAlertsSubtabs");

    if (!tabs) {
      tabs = document.createElement("div");
      tabs.id = "finAlertsSubtabs";
      tabs.className = "finAlertsSubtabs";

      tabs.innerHTML = `
        <button type="button" data-fin-alert-tab="todos">Todos</button>
        <button type="button" data-fin-alert-tab="a_cobrar">A cobrar</button>
        <button type="button" data-fin-alert-tab="vencidos">Vencidos</button>
        <button type="button" data-fin-alert-tab="intervenidos">Intervenidos</button>
        <button type="button" data-fin-alert-tab="por_entrar">Por entrar</button>
        <button type="button" data-fin-alert-tab="procesados">Procesados</button>
      `;

      panel.insertBefore(tabs, list);

      tabs.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-fin-alert-tab]");
        if (!btn) return;

        state.activeTab = btn.getAttribute("data-fin-alert-tab") || "todos";
        renderCardsForActiveTab();
      });
    }

    tabs.querySelectorAll("[data-fin-alert-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-fin-alert-tab") === state.activeTab);
    });
  }

  function shouldShowCard(card) {
    if (state.activeTab === "todos") return true;
    if (state.activeTab === "a_cobrar") return card.bucket === "a_cobrar";
    if (state.activeTab === "vencidos") return card.bucket === "vencidos";
    if (state.activeTab === "intervenidos") return card.bucket === "intervenidos";
    if (state.activeTab === "por_entrar") return card.bucket === "por_entrar";
    if (state.activeTab === "procesados") return card.bucket === "procesados";
    return true;
  }

  function chip(card) {
    if (card.operationalStatus === "por_entrar") return "Entra mañana";
    if (card.operationalStatus === "hoy") return "Entra hoy";
    if (card.operationalStatus === "vencio_ayer") return "Venció ayer";
    if (card.operationalStatus === "vencido") return "Vencido";
    if (card.operationalStatus === "intervenido") return "Intervenido";
    if (card.operationalStatus === "procesado") return "Procesado";
    return "A cobrar";
  }

  function statusText(card) {
    if (card.operationalStatus === "por_entrar") return "Entra mañana";
    if (card.operationalStatus === "hoy") return "Entra hoy · confirmar ingreso";
    if (card.operationalStatus === "vencio_ayer") return "Venció ayer";
    if (card.operationalStatus === "vencido") return "Vencido";
    if (card.operationalStatus === "intervenido") return "Intervenido";
    if (card.operationalStatus === "procesado") return "Procesado";
    return "A cobrar";
  }

  function visualStatusClass(card) {
    if (card.operationalStatus === "vencio_ayer") return "vencido";
    if (card.operationalStatus === "intervenido") return "vencido";
    if (card.operationalStatus === "procesado") return "hoy";
    return card.operationalStatus || "pendiente";
  }

  function selectMarkup(card, estadoLabel) {
    const lower = String(estadoLabel || "").toLowerCase();
    const selPend = lower.includes("pend") ? "selected" : "";
    const selProc = lower.includes("proces") ? "selected" : "";
    const selInt = lower.includes("inter") ? "selected" : "";

    return `
      <select class="finEstadoIngresoSelect" data-id="${escapeHtml(card.id)}" data-current="${escapeHtml(estadoLabel)}">
        <option value="Pendiente" ${selPend}>Pendiente</option>
        <option value="Procesado" ${selProc}>Procesado</option>
        <option value="Intervenido" ${selInt}>Intervenido</option>
      </select>
    `;
  }

  function lockedMarkup(card) {
    if (card.operationalStatus === "procesado") {
      return `<span class="finAlertLocked"><span>Procesado</span><small>Movimiento cerrado.</small></span>`;
    }

    if (card.operationalStatus === "intervenido") {
      return `<span class="finAlertLocked"><span>Intervenido</span><small>Revisar incidencia.</small></span>`;
    }

    return `
      <span class="finAlertLocked">
        <span>Automático por pasarela</span>
        <small>Se habilita desde el día de ingreso.</small>
      </span>
    `;
  }

  function cardCanChange(card) {
    return (
      card.channel === "cod" ||
      card.operationalStatus === "hoy" ||
      card.operationalStatus === "vencio_ayer" ||
      card.operationalStatus === "vencido"
    );
  }

  function renderCard(card) {
    const isFinancial = card.channel === "financial";
    const estadoLabel = String(card.estado_ingreso || "Pendiente");
    const idLabel = card.id ? (card.id.startsWith("#") ? card.id : `#${card.id}`) : "(sin ID)";

    const primaryLabel = isFinancial ? "Neto esperado" : "A cobrar por repartidor";
    const primaryValue = isFinancial ? card.net_expected_amount : card.gross_amount;

    const ruleLabel = card.rule_code
      ? `${card.rule_code}${card.payout_delay_days ? " · " + card.payout_delay_days + " días" : ""}`
      : (card.payout_delay_days ? `${card.payout_delay_days} días` : "Sin regla visible");

    const extraRows = isFinancial ? `
      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Cuotas</span>
        <span class="finAlertCard__value">${card.installments_count} cuota${card.installments_count === 1 ? "" : "s"}</span>
      </div>

      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Costo por cobro</span>
        <span class="finAlertCard__value">${feeLabel(card.collection_fee_rate_unit, card.collection_fee_amount)}</span>
      </div>

      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Costo cuotas / financiación</span>
        <span class="finAlertCard__value">${feeLabel(card.total_financial_cost_rate, card.total_financial_cost_amount)}</span>
      </div>

      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Regla aplicada</span>
        <span class="finAlertCard__value">${escapeHtml(ruleLabel)}</span>
      </div>
    ` : `
      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Fecha de compra</span>
        <span class="finAlertCard__value">${escapeHtml(dateLabel(card.fecha_compra_ymd))}</span>
      </div>

      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Vencimiento operativo</span>
        <span class="finAlertCard__value">${escapeHtml(dateLabel(card.due_ymd))} · 20 días</span>
      </div>

      <div class="finAlertCard__row">
        <span class="finAlertCard__label">Costo financiero</span>
        <span class="finAlertCard__value">No aplica</span>
      </div>
    `;

    const article = document.createElement("article");

    article.className = [
      "finAlertCard",
      `finAlertCard--${visualStatusClass(card)}`,
      isFinancial ? "finAlertCard--financial" : "finAlertCard--cod"
    ].join(" ");

    article.innerHTML = `
      <div class="finAlertCard__head">
        <div class="finAlertCard__titleWrap">
          <div class="finAlertCard__title">Pedido ${escapeHtml(idLabel)}</div>
          <div class="finAlertCard__channel">${escapeHtml(card.channel_label)}</div>
        </div>

        <span class="finAlertCard__status finAlertCard__status--${visualStatusClass(card)}">
          ${escapeHtml(chip(card))}
        </span>
      </div>

      <div class="finAlertCard__body">
        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Ingreso previsto</span>
          <span class="finAlertCard__value">${escapeHtml(dateLabel(card.due_ymd))}</span>
        </div>

        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Estado operativo</span>
          <span class="finAlertCard__value">${escapeHtml(statusText(card))}</span>
        </div>

        <div class="finAlertCard__row">
          <span class="finAlertCard__label">Bruto vendido</span>
          <span class="finAlertCard__value">${money(card.gross_amount)}</span>
        </div>

        <div class="finAlertCard__row finAlertCard__row--strong">
          <span class="finAlertCard__label">${escapeHtml(primaryLabel)}</span>
          <span class="finAlertCard__value">${money(primaryValue)}</span>
        </div>

        ${extraRows}

        <div class="finAlertCard__row finAlertCard__row--action">
          <span class="finAlertCard__label">Acción</span>
          <span class="finAlertCard__value">
            ${cardCanChange(card) ? selectMarkup(card, estadoLabel) : lockedMarkup(card)}
          </span>
        </div>
      </div>

      <div class="finAlertCard__meta">
        <span class="finAlertMetaPill">${escapeHtml(statusText(card))} · previsto ${escapeHtml(dateLabel(card.due_ymd))}</span>
        <span>${escapeHtml(card.channel_label)}</span>
      </div>
    `;

    return article;
  }

  function renderCardsForActiveTab() {
    ensureAlertSubtabs();

    const list = $("finAlertsList");
    const empty = $("finAlertsEmpty");
    if (!list) return;

    const cards = buildAllCards().filter(shouldShowCard);

    list.innerHTML = "";

    if (!cards.length) {
      if (empty) {
        empty.style.display = "";
        empty.textContent = "No hay movimientos para este filtro.";
      }
      updateBadge();
      return;
    }

    if (empty) empty.style.display = "none";

    const frag = document.createDocumentFragment();

    cards.forEach((card) => {
      frag.appendChild(renderCard(card));
    });

    list.appendChild(frag);

    updateBadge();
  }

  function updateBadge() {
    const badge = $("finAlertsBadge");
    if (!badge) return;

    const actionable = buildAllCards().filter((card) => {
      return (
        card.operationalStatus === "hoy" ||
        card.operationalStatus === "vencio_ayer" ||
        card.operationalStatus === "vencido" ||
        card.operationalStatus === "por_entrar"
      );
    }).length;

    badge.textContent = actionable ? String(actionable) : "";
    badge.classList.toggle("is-visible", actionable > 0);
  }

  function openAlertsTab(tab) {
    state.activeTab = tab || "todos";

    if (typeof fin_openAlertsOverlay_ === "function") {
      fin_openAlertsOverlay_();
    }

    if (typeof fin_switchAlertsTab_ === "function") {
      fin_switchAlertsTab_("confirmaciones");
    }

    window.setTimeout(renderCardsForActiveTab, 40);
    window.setTimeout(renderCardsForActiveTab, 180);
  }

  function injectStyles() {
    if ($("finMovementsV2BStyles")) return;

    const style = document.createElement("style");
    style.id = "finMovementsV2BStyles";

    style.textContent = `
      [data-page="finanzas"] .finForecastLine{
        width:100%;
        margin-top:6px;
        padding:0;
        border:0;
        background:transparent;
        color:rgba(74,222,128,.96);
        font-size:11px;
        line-height:1.25;
        text-align:left;
        cursor:pointer;
      }

      [data-page="finanzas"] .finForecastLine:hover span{
        text-decoration:underline;
      }

      [data-page="finanzas"] .finForecastLine span,
      [data-page="finanzas"] .finForecastLine small{
        display:block;
      }

      [data-page="finanzas"] .finForecastLine small{
        color:rgba(255,255,255,.42);
        margin-top:1px;
      }

      [data-page="finanzas"] .finRangePresetWrap{
        position:relative;
        display:inline-flex;
        align-items:center;
      }

      [data-page="finanzas"] .finRangePresetBtn{
        width:38px;
        height:38px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.16);
        background:rgba(255,255,255,.06);
        color:#fff;
        cursor:pointer;
        display:inline-flex;
        align-items:center;
        justify-content:center;
      }

      [data-page="finanzas"] .finRangePresetBtn:hover{
        background:rgba(255,255,255,.10);
      }

      [data-page="finanzas"] .finRangePresetMenu{
        position:absolute;
        right:0;
        top:44px;
        min-width:170px;
        padding:6px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.14);
        background:#1d1d1d;
        box-shadow:0 18px 38px rgba(0,0,0,.34);
        z-index:80;
      }

      [data-page="finanzas"] .finRangePresetMenu button{
        width:100%;
        display:block;
        border:0;
        border-radius:8px;
        padding:9px 10px;
        background:transparent;
        color:rgba(255,255,255,.82);
        text-align:left;
        cursor:pointer;
        font-weight:750;
        font-size:13px;
      }

      [data-page="finanzas"] .finRangePresetMenu button:hover{
        background:rgba(36,121,255,.18);
        color:#fff;
      }

      [data-page="finanzas"] .finAlertsSubtabs{
        display:flex;
        gap:8px;
        overflow-x:auto;
        padding:0 0 10px;
        margin-bottom:10px;
        scrollbar-width:none;
      }

      [data-page="finanzas"] .finAlertsSubtabs::-webkit-scrollbar{
        display:none;
      }

      [data-page="finanzas"] .finAlertsSubtabs button{
        flex:0 0 auto;
        border:1px solid rgba(255,255,255,.12);
        border-radius:999px;
        background:rgba(255,255,255,.05);
        color:rgba(255,255,255,.66);
        padding:7px 11px;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
        white-space:nowrap;
      }

      [data-page="finanzas"] .finAlertsSubtabs button.is-active{
        background:rgba(36,121,255,.20);
        border-color:rgba(36,121,255,.44);
        color:#fff;
      }

      [data-page="finanzas"] .finAlertCard--processed,
      [data-page="finanzas"] .finAlertCard--hoy{
        border-left-color:#2479FF;
      }
    `;

    document.head.appendChild(style);
  }

  function patchSupabaseFetchForForecast() {
    const original =
      window.fin_callSupabaseCashflow_ ||
      (typeof fin_callSupabaseCashflow_ === "function" ? fin_callSupabaseCashflow_ : null);

    if (!original || original.__finMovementsV2B) return;

    const wrapped = async function (fromIso, toIso) {
      const extendedToIso = (() => {
        const end = ymd(toIso);
        if (!end) return toIso;
        const plus = addDaysYmd(end, Math.max(31, state.forecastDays + 1));
        return `${plus}T23:59:59-03:00`;
      })();

      const res = await original(fromIso, extendedToIso);
      const allRows = cleanRows(Array.isArray(res && res.rows) ? res.rows : []);

      if (window.FinanzasState) {
        window.FinanzasState.alertRows = allRows.slice();
      }

      return Object.assign({}, res, {
        rows: allRows.filter((row) => {
          const maxYmd = ymd(toIso);
          if (!maxYmd) return true;

          const movementYmd = ymd(row.fecha_ingreso_iso || row.movement_date_iso || row.fecha_compra_iso);

          return !movementYmd || movementYmd <= maxYmd;
        })
      });
    };

    wrapped.__finMovementsV2B = true;

    try { window.fin_callSupabaseCashflow_ = wrapped; } catch (err) {}
    try { fin_callSupabaseCashflow_ = wrapped; } catch (err) {}

    window.__FINANZAS_CACHE__ = null;
  }

  function patchRender() {
    const original =
      window.renderFinanzas_ ||
      (typeof renderFinanzas_ === "function" ? renderFinanzas_ : null);

    if (original && !original.__finMovementsV2B) {
      const wrapped = function () {
        original();

        ensureFinancialForecastLine();
        renderCardsForActiveTab();

        window.setTimeout(ensureFinancialForecastLine, 100);
        window.setTimeout(renderCardsForActiveTab, 100);
        window.setTimeout(ensureFinancialForecastLine, 350);
      };

      wrapped.__finMovementsV2B = true;

      try { window.renderFinanzas_ = wrapped; } catch (err) {}
      try { renderFinanzas_ = wrapped; } catch (err) {}
    }

    try { window.fin_renderAlertsList_ = renderCardsForActiveTab; } catch (err) {}
    try { fin_renderAlertsList_ = renderCardsForActiveTab; } catch (err) {}
  }

  function patchEstadoLocal() {
    const original =
      window.fin_applyEstadoIngresoLocal_ ||
      (typeof fin_applyEstadoIngresoLocal_ === "function" ? fin_applyEstadoIngresoLocal_ : null);

    if (!original || original.__finMovementsV2B) return;

    const wrapped = function (orderId, estadoNuevo) {
      original(orderId, estadoNuevo);

      const fs = window.FinanzasState || {};
      const idStr = String(orderId || "").trim();

      if (Array.isArray(fs.alertRows)) {
        fs.alertRows = fs.alertRows.map((row) => {
          if (String(row.id || "").trim() === idStr) {
            return Object.assign({}, row, {
              estado_ingreso: estadoNuevo,
              payment_status: String(estadoNuevo || "").toLowerCase().includes("proces")
                ? "processed"
                : String(estadoNuevo || "").toLowerCase().includes("inter")
                  ? "intervened"
                  : "pending"
            });
          }

          return row;
        });
      }

      window.setTimeout(() => {
        ensureFinancialForecastLine();
        renderCardsForActiveTab();
      }, 60);
    };

    wrapped.__finMovementsV2B = true;

    try { window.fin_applyEstadoIngresoLocal_ = wrapped; } catch (err) {}
    try { fin_applyEstadoIngresoLocal_ = wrapped; } catch (err) {}
  }

  function boot() {
    if (document.body && document.body.getAttribute("data-page") !== "finanzas") return;

    injectStyles();
    ensureHeaderPresetControl();
    patchSupabaseFetchForForecast();
    patchRender();
    patchEstadoLocal();

    ensureFinancialForecastLine();
    renderCardsForActiveTab();

    maybeApplyDefaultTodos();

    window.setTimeout(() => {
      ensureFinancialForecastLine();
      renderCardsForActiveTab();
    }, 600);

    console.log("[finanzas-v2b] boot OK", BUILD);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);

  if (document.readyState !== "loading") {
    boot();
  }
})();






/* =========================================================
   FINANZAS · Info compacta del gráfico arriba derecha
   Solo visual. No toca lógica.
   ========================================================= */

(function () {
  const BUILD = "FIN_CHART_TOP_INFO_SAFE_20260709_01";

  function ensureChartTopInfo() {
    const card = document.getElementById("finCashflowCard");
    const chart = document.getElementById("finCashflowChart");

    if (!card || !chart) return;

    let topInfo = document.getElementById("finChartTopInfo");

    if (!topInfo) {
      topInfo = document.createElement("div");
      topInfo.id = "finChartTopInfo";

      topInfo.innerHTML = `
        <div class="finChartTopInfo__legend">
          <span class="finChartTopInfo__item">
            <span class="finChartTopInfo__dot finChartTopInfo__dot--fin"></span>
            <span>Financieros</span>
          </span>

          <span class="finChartTopInfo__item">
            <span class="finChartTopInfo__dot finChartTopInfo__dot--cod"></span>
            <span>COD / Contra-entrega</span>
          </span>

          <span class="finChartTopInfo__item">
            <span class="finChartTopInfo__dot finChartTopInfo__dot--int"></span>
            <span>Intervenidos</span>
          </span>
        </div>

        <div class="finChartTopInfo__note">
          Bruto operativo: financieros + COD sin costos y sin intervenidos · COD pendiente vence a 20 días.
        </div>
      `;

      card.appendChild(topInfo);
    }

    const chartWrap = chart.parentElement;
    if (!chartWrap) return;

    // Ocultamos SOLO hermanos directos del gráfico.
    // No buscamos en todo el card para evitar romper contenedores.
    Array.from(chartWrap.children).forEach((el) => {
      if (el === chart) return;
      if (el.id === "finChartTopInfo") return;

      const text = String(el.textContent || "").replace(/\s+/g, " ").trim();

      const isLegend =
        text.includes("Financieros") &&
        text.includes("COD") &&
        text.includes("Intervenidos");

      const isFootnote =
        text.includes("Bruto operativo:") ||
        text.includes("COD pendiente vence");

      if (isLegend || isFootnote) {
        el.classList.add("finChartBottomInfoMoved");
      }
    });
  }

  function bootChartTopInfo() {
    ensureChartTopInfo();

    window.setTimeout(ensureChartTopInfo, 120);
    window.setTimeout(ensureChartTopInfo, 400);
    window.setTimeout(ensureChartTopInfo, 900);
  }

  document.addEventListener("DOMContentLoaded", bootChartTopInfo);
  window.addEventListener("load", bootChartTopInfo);

  if (document.readyState !== "loading") {
    bootChartTopInfo();
  }

  console.log("[fin-chart-top-info-safe] boot OK", BUILD);
})();

