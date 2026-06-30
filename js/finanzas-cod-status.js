console.log("[finanzas-cod-status.js] cargado OK");

(function () {
  const BUILD = "FINANCE_COD_STATUS_UI_2026_06_30_01";

  const statusMap = {
    Pendiente: "pending",
    Procesado: "processed",
    Intervenido: "intervened"
  };

  const labelMap = {
    pending: "Pendiente",
    processed: "Procesado",
    intervened: "Intervenido"
  };

  const state = {
    pending: null,
    observer: null
  };

  function isFinancePage() {
    return document.body && document.body.getAttribute("data-page") === "finanzas";
  }

  function norm(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeStatusLabel(value) {
    const raw = norm(value).toLowerCase();
    if (raw === "processed" || raw === "procesado") return "Procesado";
    if (raw === "intervened" || raw === "intervenido" || raw === "intervenida") return "Intervenido";
    return "Pendiente";
  }

  function normalizeStatusDb(value) {
    const label = normalizeStatusLabel(value);
    return statusMap[label] || "pending";
  }

  function isCodRow(row) {
    if (!row) return false;
    if (row.is_cod === true) return true;
    const provider = norm(row.provider).toLowerCase();
    const gateway = norm(row.payment_gateway).toLowerCase();
    const method = norm(row.payment_method).toLowerCase();
    return provider === "cod" || gateway === "cod" || method === "cash_on_delivery" || method === "contra_reembolso" || method === "contra-reembolso";
  }

  function stripHash(value) {
    return norm(value).replace(/^#/, "");
  }

  function findFinanceRow(id) {
    const rows = window.FinanzasState && Array.isArray(window.FinanzasState.rows)
      ? window.FinanzasState.rows
      : [];

    const needle = norm(id);
    const cleanNeedle = stripHash(needle);

    return rows.find(row => {
      const keys = [
        row.id,
        row.finance_order_id,
        row.shopify_order_id,
        row.shopify_order_name
      ].map(v => norm(v));

      return keys.some(key => key === needle || stripHash(key) === cleanNeedle);
    }) || null;
  }

  function getFinanceOrderId(row, fallbackId) {
    return norm(row && row.finance_order_id) || norm(fallbackId);
  }

  function replaceElectronicSelect(select, row) {
    const wrap = select.parentElement;
    if (!wrap || wrap.dataset.codStatusLocked === "1") return;

    wrap.dataset.codStatusLocked = "1";
    wrap.innerHTML = `
      <span class="finCodStatusLocked" title="Los pagos electrónicos se actualizan por conciliación de pasarela">
        Automático por pasarela
      </span>
    `;
  }

  function decorateAlerts() {
    if (!isFinancePage()) return;

    document.querySelectorAll(".finEstadoIngresoSelect").forEach(select => {
      const id = select.getAttribute("data-id") || "";
      const row = findFinanceRow(id);

      if (!row) return;

      if (!isCodRow(row)) {
        replaceElectronicSelect(select, row);
        return;
      }

      select.dataset.codManual = "1";
      select.dataset.financeOrderId = getFinanceOrderId(row, id);
      select.dataset.paymentKind = "cod";
      select.title = "Cambio manual permitido para pedidos contra reembolso";
    });
  }

  function patchLocalRows(financeOrderId, fallbackId, dbStatus, resultRow) {
    const label = labelMap[dbStatus] || normalizeStatusLabel(dbStatus);
    const ids = new Set([norm(financeOrderId), norm(fallbackId), stripHash(fallbackId)].filter(Boolean));
    const actualPayout = resultRow && resultRow.actual_payout_date_iso ? resultRow.actual_payout_date_iso : null;

    function patch(row) {
      const keys = [row.id, row.finance_order_id, row.shopify_order_id, row.shopify_order_name].map(v => norm(v));
      const hit = keys.some(key => ids.has(key) || ids.has(stripHash(key)));
      if (!hit) return row;

      return Object.assign({}, row, {
        estado_ingreso: label,
        payment_status: dbStatus,
        financial_status: dbStatus,
        actual_payout_date_iso: actualPayout || row.actual_payout_date_iso || null,
        fecha_ingreso_iso: actualPayout || row.fecha_ingreso_iso
      });
    }

    if (window.FinanzasState && Array.isArray(window.FinanzasState.rows)) {
      window.FinanzasState.rows = window.FinanzasState.rows.map(patch);
    }

    const cache = window.__FINANZAS_CACHE__;
    if (cache && cache.res && Array.isArray(cache.res.rows)) {
      cache.res.rows = cache.res.rows.map(patch);
    }
  }

  function clearFinanceCacheAndRefresh() {
    window.__FINANZAS_CACHE__ = null;

    const apply = document.getElementById("btnApplyFin");
    if (apply) {
      window.setTimeout(() => apply.click(), 120);
    }

    if (window.finFinanceOrdersTable && typeof window.finFinanceOrdersTable.reload === "function") {
      window.setTimeout(() => window.finFinanceOrdersTable.reload(), 350);
    }

    if (window.finanzasMovimientosMetricsSync) {
      window.setTimeout(window.finanzasMovimientosMetricsSync, 600);
    }
  }

  function modalEls() {
    return {
      modal: document.getElementById("finConfirmModal"),
      pedido: document.getElementById("finConfirmPedido"),
      prev: document.getElementById("finConfirmEstadoAnterior"),
      next: document.getElementById("finConfirmEstadoNuevo"),
      ok: document.getElementById("finConfirmOk"),
      cancel: document.getElementById("finConfirmCancel"),
      backdrop: document.getElementById("finConfirmBackdrop")
    };
  }

  function openConfirm(ctx) {
    const els = modalEls();
    state.pending = ctx;

    if (els.pedido) els.pedido.textContent = ctx.orderLabel || ctx.fallbackId || ctx.financeOrderId;
    if (els.prev) els.prev.textContent = ctx.prevLabel || "Pendiente";
    if (els.next) els.next.textContent = ctx.nextLabel || "Pendiente";

    if (els.modal) {
      els.modal.classList.add("is-open");
      els.modal.setAttribute("aria-hidden", "false");
    } else if (!window.confirm(`Confirmar cambio de ${ctx.prevLabel} a ${ctx.nextLabel}?`)) {
      cancelPending();
      return;
    } else {
      confirmPending();
    }
  }

  function closeConfirm() {
    const els = modalEls();
    if (els.modal) {
      els.modal.classList.remove("is-open");
      els.modal.setAttribute("aria-hidden", "true");
    }
  }

  function cancelPending() {
    const ctx = state.pending;
    if (ctx && ctx.selectEl) {
      ctx.selectEl.value = ctx.prevLabel || "Pendiente";
    }
    state.pending = null;
    closeConfirm();
  }

  function setLoading(isLoading) {
    const els = modalEls();
    if (els.ok) {
      els.ok.disabled = !!isLoading;
      els.ok.classList.toggle("is-loading", !!isLoading);
    }
    if (state.pending && state.pending.selectEl) {
      state.pending.selectEl.disabled = !!isLoading;
    }
  }

  async function confirmPending() {
    const ctx = state.pending;
    if (!ctx) return;

    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      console.error("[finanzas-cod-status] Supabase no disponible");
      cancelPending();
      return;
    }

    setLoading(true);

    try {
      const payload = await window.SazzuSupabase.rpc("rpc_finance_cod_status_update", {
        input_finance_order_id: ctx.financeOrderId,
        input_status: normalizeStatusDb(ctx.nextLabel),
        input_actor: "panel-web",
        input_origin: "slide-confirmaciones-cod"
      });

      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error ? payload.error : "No se pudo actualizar el estado COD.");
      }

      const dbStatus = payload.status || normalizeStatusDb(ctx.nextLabel);
      patchLocalRows(ctx.financeOrderId, ctx.fallbackId, dbStatus, payload.row || {});

      if (ctx.selectEl) {
        ctx.selectEl.value = labelMap[dbStatus] || ctx.nextLabel;
        ctx.selectEl.setAttribute("data-current", labelMap[dbStatus] || ctx.nextLabel);
      }

      console.log("[finanzas-cod-status] estado COD actualizado", BUILD, payload);
      state.pending = null;
      closeConfirm();
      clearFinanceCacheAndRefresh();
    } catch (err) {
      console.error("[finanzas-cod-status] error actualizando COD", err);
      if (ctx.selectEl) ctx.selectEl.value = ctx.prevLabel || "Pendiente";
      state.pending = null;
      closeConfirm();
    } finally {
      setLoading(false);
    }
  }

  function onSelectChangeCapture(ev) {
    if (!isFinancePage()) return;

    const target = ev.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.classList.contains("finEstadoIngresoSelect")) return;

    const fallbackId = target.getAttribute("data-id") || "";
    const row = findFinanceRow(fallbackId);

    if (!row || !isCodRow(row)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const prev = target.getAttribute("data-current") || "Pendiente";
      target.value = prev;
      decorateAlerts();
      return;
    }

    const prevLabel = normalizeStatusLabel(target.getAttribute("data-current") || target.value || "Pendiente");
    const nextLabel = normalizeStatusLabel(target.value || "Pendiente");

    if (prevLabel === nextLabel) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    target.value = prevLabel;

    openConfirm({
      selectEl: target,
      row,
      fallbackId,
      financeOrderId: getFinanceOrderId(row, fallbackId),
      orderLabel: row.id || row.shopify_order_name || fallbackId,
      prevLabel,
      nextLabel
    });
  }

  function onModalClickCapture(ev) {
    if (!state.pending) return;

    const target = ev.target;
    if (!target || !target.closest) return;

    if (target.closest("#finConfirmOk")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      confirmPending();
      return;
    }

    if (target.closest("#finConfirmCancel") || target.closest("#finConfirmBackdrop")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      cancelPending();
    }
  }

  function installObserver() {
    const list = document.getElementById("finAlertsList");
    if (!list) return;

    if (state.observer) return;

    state.observer = new MutationObserver(() => {
      window.setTimeout(decorateAlerts, 0);
    });

    state.observer.observe(list, { childList: true, subtree: true });
    decorateAlerts();
  }

  function injectStyles() {
    if (document.getElementById("finCodStatusStyle")) return;
    const style = document.createElement("style");
    style.id = "finCodStatusStyle";
    style.textContent = `
      .finCodStatusLocked{
        display:inline-flex;
        align-items:center;
        min-height:24px;
        padding:4px 8px;
        border-radius:8px;
        border:1px solid rgba(148,163,184,.28);
        background:rgba(148,163,184,.12);
        color:#64748B;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
      }
      body.finanzas-dark .finCodStatusLocked{
        background:rgba(255,255,255,.07);
        border-color:rgba(255,255,255,.12);
        color:#c9c9c9;
      }
      .finEstadoIngresoSelect[data-cod-manual="1"]{
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    if (!isFinancePage()) return;
    injectStyles();
    installObserver();
    decorateAlerts();
  }

  document.addEventListener("change", onSelectChangeCapture, true);
  document.addEventListener("click", onModalClickCapture, true);
  document.addEventListener("sazzu:page:load", () => window.setTimeout(init, 0));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    window.setTimeout(init, 0);
  }

  window.finanzasCodStatus = {
    init,
    decorate: decorateAlerts,
    build: BUILD
  };
})();
