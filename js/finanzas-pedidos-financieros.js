console.log("[finanzas-pedidos-financieros.js] cargado OK");

(function () {
  const BUILD = "FINANCE_ORDERS_TABLE_UI_2026_06_29_01";

  const state = {
    rows: [],
    total: 0,
    loading: false,
    error: "",
    limit: 50,
    offset: 0
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtMoney(value) {
    const n = Number(value || 0);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    });
  }

  function fmtPct(value) {
    const n = Number(value || 0);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
  }

  function fmtDate(value) {
    const s = String(value || "");
    if (!s) return "—";

    const ymd = s.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "—";

    return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
  }

  function getRangeParams() {
    const fromEl = $("finDtFrom");
    const toEl = $("finDtTo");
    const from = fromEl && fromEl.value ? `${fromEl.value}T00:00:00-03:00` : null;
    const to = toEl && toEl.value ? `${toEl.value}T23:59:59-03:00` : null;
    return { from, to };
  }

  function getFilters() {
    const gatewayEl = $("finOrdersGatewayFilter");
    const statusEl = $("finOrdersStatusFilter");
    const searchEl = $("finOrdersSearch");

    return {
      gateway: gatewayEl ? String(gatewayEl.value || "").trim() : "",
      status: statusEl ? String(statusEl.value || "").trim() : "",
      q: searchEl ? String(searchEl.value || "").trim() : ""
    };
  }

  function normalizeGatewayLabel(row) {
    if (row && row.is_cod) return "Contra reembolso";

    const raw = String(row && (row.payment_gateway || row.provider) || "").trim().toLowerCase();
    if (!raw) return "—";
    if (raw === "mercadopago" || raw === "mercado_pago") return "Mercado Pago";
    if (raw === "cod") return "Contra reembolso";
    return raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function normalizeMethodLabel(row) {
    const raw = String(row && row.payment_method || "").trim().toLowerCase();
    if (row && row.is_cod) return "Pago al recibir";
    if (!raw) return "—";
    if (raw === "cash_on_delivery") return "Pago al recibir";
    return raw.replace(/_/g, " ");
  }

  function statusLabel(status) {
    const raw = String(status || "pending").trim().toLowerCase();
    if (raw === "processed") return "Procesado";
    if (raw === "intervened") return "Intervenido";
    if (raw === "cancelled") return "Cancelado";
    if (raw === "refunded") return "Reembolsado";
    if (raw === "failed") return "Fallido";
    return "Pendiente";
  }

  function calculationLabel(row) {
    const raw = String(row && row.calculation_type || "").trim().toLowerCase();
    if (row && row.is_cod) return "COD · sin costo financiero";
    if (raw === "conciliado") return "Conciliado";
    return "Proyectado";
  }

  function renderSkeleton() {
    const body = $("finOrdersTableBody");
    const empty = $("finOrdersEmpty");
    const meta = $("finOrdersMeta");
    if (empty) empty.style.display = "none";
    if (meta) meta.textContent = "Cargando pedidos financieros...";
    if (!body) return;

    body.innerHTML = Array.from({ length: 4 }).map(() => `
      <tr>
        <td colspan="11">
          <div class="u-muted" style="padding:14px 0;">Cargando operación financiera...</div>
        </td>
      </tr>
    `).join("");
  }

  function renderError(message) {
    const body = $("finOrdersTableBody");
    const empty = $("finOrdersEmpty");
    const meta = $("finOrdersMeta");

    if (meta) meta.textContent = "No se pudo cargar la tabla financiera.";
    if (empty) {
      empty.style.display = "";
      empty.textContent = message || "No se pudo cargar la tabla financiera.";
    }
    if (body) body.innerHTML = "";
  }

  function renderTable() {
    const body = $("finOrdersTableBody");
    const empty = $("finOrdersEmpty");
    const meta = $("finOrdersMeta");
    if (!body) return;

    if (meta) {
      meta.textContent = `${state.total.toLocaleString("es-AR")} pedido${state.total === 1 ? "" : "s"} financiero${state.total === 1 ? "" : "s"} en el rango activo.`;
    }

    if (!state.rows.length) {
      body.innerHTML = "";
      if (empty) {
        empty.style.display = "";
        empty.textContent = "No hay pedidos financieros para los filtros activos.";
      }
      return;
    }

    if (empty) empty.style.display = "none";

    body.innerHTML = state.rows.map(row => {
      const orderName = row.shopify_order_name || row.shopify_order_id || "—";
      const customer = row.customer_name || row.customer_email || "—";
      const gateway = normalizeGatewayLabel(row);
      const method = normalizeMethodLabel(row);
      const cuotas = row.is_cod ? "—" : `${Number(row.installments_count || 1)}x`;
      const status = statusLabel(row.payment_status);
      const source = calculationLabel(row);
      const costTotal = Number(row.total_financial_cost_amount || 0);
      const rate = Number(row.total_financial_cost_rate || 0);
      const costClass = row.is_cod ? "color:#16A34A; font-weight:700;" : "font-weight:700;";

      return `
        <tr>
          <td>
            <div style="font-weight:800; color:#0F172A;">${escapeHtml(orderName)}</div>
            <div class="u-muted" style="font-size:12px;">${fmtDate(row.sale_date_iso)}</div>
          </td>
          <td>
            <div style="font-weight:700;">${escapeHtml(customer)}</div>
            <div class="u-muted" style="font-size:12px;">${escapeHtml(row.customer_email || "")}</div>
          </td>
          <td>
            <div style="font-weight:800;">${escapeHtml(gateway)}</div>
            <div class="u-muted" style="font-size:12px;">${escapeHtml(method)}</div>
          </td>
          <td style="font-weight:800;">${escapeHtml(cuotas)}</td>
          <td>
            <span style="display:inline-flex; padding:4px 8px; border-radius:999px; background:#F1F5F9; font-size:12px; font-weight:800; color:#334155;">
              ${escapeHtml(status)}
            </span>
          </td>
          <td style="font-weight:800;">${fmtMoney(row.gross_amount)}</td>
          <td>
            <div style="${costClass}">${fmtMoney(costTotal)}</div>
            <div class="u-muted" style="font-size:12px;">${row.is_cod ? "Sin costo financiero" : fmtPct(rate)}</div>
          </td>
          <td>
            <div style="font-weight:800;">${fmtMoney(row.net_expected_amount)}</div>
            <div class="u-muted" style="font-size:12px;">${fmtDate(row.expected_payout_date_iso)}</div>
          </td>
          <td>
            <div>${fmtMoney(row.collection_fee_amount)}</div>
            <div class="u-muted" style="font-size:12px;">cobro</div>
          </td>
          <td>
            <div>${fmtMoney(row.installment_fee_amount)}</div>
            <div class="u-muted" style="font-size:12px;">cuotas</div>
          </td>
          <td>
            <div style="font-weight:800;">${escapeHtml(source)}</div>
            <div class="u-muted" style="font-size:12px;">${escapeHtml(row.source || "—")}</div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadOrdersTable() {
    const section = $("finOrdersFinancialSection");
    if (!section) return;

    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      renderError("Supabase no está disponible para cargar pedidos financieros.");
      return;
    }

    const range = getRangeParams();
    const filters = getFilters();

    state.loading = true;
    state.error = "";
    renderSkeleton();

    try {
      const payload = await window.SazzuSupabase.rpc("rpc_finance_orders_table", {
        input_from: range.from,
        input_to: range.to,
        input_gateway: filters.gateway || null,
        input_status: filters.status || null,
        input_q: filters.q || null,
        input_limit: state.limit,
        input_offset: state.offset
      });

      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error ? payload.error : "Supabase no devolvió una tabla financiera válida.");
      }

      state.rows = Array.isArray(payload.rows) ? payload.rows : [];
      state.total = Number(payload.total || state.rows.length || 0);
      state.error = "";

      console.log("[finanzas-pedidos] tabla financiera", BUILD, payload.build, state.rows.length);
      renderTable();
    } catch (err) {
      state.rows = [];
      state.total = 0;
      state.error = String(err && err.message ? err.message : err);
      console.warn("[finanzas-pedidos] error cargando tabla", err);
      renderError(state.error);
    } finally {
      state.loading = false;
    }
  }

  function cleanLegacyAlertLabels() {
    const list = $("finAlertsList");
    if (!list) return;

    list.querySelectorAll(".finAlertCard__label").forEach(label => {
      const text = String(label.textContent || "").trim();
      if (text === "Bruto N") label.textContent = "Bruto vendido";
      if (text === "Estado actual (Z)") label.textContent = "Estado financiero";
    });
  }

  function wireOrdersTable() {
    const section = $("finOrdersFinancialSection");
    if (!section || section.__wiredFinanceOrders) return;
    section.__wiredFinanceOrders = true;

    const applyBtn = $("finOrdersApplyFilters");
    const searchEl = $("finOrdersSearch");
    const gatewayEl = $("finOrdersGatewayFilter");
    const statusEl = $("finOrdersStatusFilter");
    const globalApplyBtn = $("btnApplyFin");

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        state.offset = 0;
        loadOrdersTable();
      });
    }

    [gatewayEl, statusEl].forEach(el => {
      if (!el) return;
      el.addEventListener("change", () => {
        state.offset = 0;
        loadOrdersTable();
      });
    });

    if (searchEl) {
      searchEl.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
          state.offset = 0;
          loadOrdersTable();
        }
      });
    }

    if (globalApplyBtn && !globalApplyBtn.__wiredFinanceOrdersTable) {
      globalApplyBtn.__wiredFinanceOrdersTable = true;
      globalApplyBtn.addEventListener("click", () => {
        state.offset = 0;
        setTimeout(loadOrdersTable, 150);
      });
    }
  }

  function observeAlerts() {
    const list = $("finAlertsList");
    if (!list || list.__financeOrdersCleanObserver) return;
    list.__financeOrdersCleanObserver = true;

    const observer = new MutationObserver(() => cleanLegacyAlertLabels());
    observer.observe(list, { childList: true, subtree: true });
    cleanLegacyAlertLabels();
  }

  function init() {
    if (!document.body || document.body.getAttribute("data-page") !== "finanzas") return;
    wireOrdersTable();
    observeAlerts();
    cleanLegacyAlertLabels();
    loadOrdersTable();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("sazzu:page:load", () => setTimeout(init, 0));

  window.finFinanceOrdersTable = {
    reload: loadOrdersTable,
    cleanLegacyAlertLabels
  };
})();
