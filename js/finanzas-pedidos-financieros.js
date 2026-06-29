console.log("[finanzas-pedidos-financieros.js] cargado OK");

(function () {
  const BUILD = "FINANCE_ORDERS_TABLE_UI_2026_06_29_03";
  const VIEW_STORAGE_KEY = "sazzu_finanzas_active_view";

  const state = {
    rows: [],
    total: 0,
    loading: false,
    error: "",
    limit: 50,
    offset: 0,
    view: "pedidos"
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

  function tableMarkup() {
    return `
      <div class="u-card">
        <div class="u-cardInner">
          <div class="u-row u-row--between u-row--center" style="gap:12px; flex-wrap:wrap;">
            <div>
              <div class="u-sectionLabel">Pedidos financieros</div>
              <div class="u-muted" style="margin-top:6px;" id="finOrdersMeta">
                Vista operativa de pagos, cuotas, costos financieros y neto esperado.
              </div>
            </div>

            <div class="u-row u-row--center" style="gap:8px; flex-wrap:wrap; justify-content:flex-end;">
              <input
                id="finOrdersSearch"
                type="search"
                class="u-input"
                placeholder="Buscar pedido, cliente o email"
                style="min-width:220px; max-width:280px;"
              />

              <select id="finOrdersGatewayFilter" class="u-input" style="max-width:170px;">
                <option value="">Todos los medios</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="cod">Contra reembolso</option>
              </select>

              <select id="finOrdersStatusFilter" class="u-input" style="max-width:170px;">
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="processed">Procesado</option>
                <option value="intervened">Intervenido</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
                <option value="failed">Fallido</option>
              </select>

              <button id="finOrdersApplyFilters" class="btn btn--primary" type="button">
                Actualizar tabla
              </button>
            </div>
          </div>

          <div class="u-muted" id="finOrdersEmpty" style="display:none; margin-top:14px;"></div>

          <div style="margin-top:14px; overflow:auto; max-height:520px;">
            <table class="finHistTable" aria-label="Tabla financiera de pedidos" style="min-width:1180px; width:100%;">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Medio</th>
                  <th>Cuotas</th>
                  <th>Estado</th>
                  <th>Bruto</th>
                  <th>Costo financiero</th>
                  <th>Neto esperado</th>
                  <th>Costo cobro</th>
                  <th>Costo cuotas</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody id="finOrdersTableBody">
                <tr>
                  <td colspan="11">
                    <div class="u-muted" style="padding:14px 0;">Esperando datos financieros...</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function getMain() {
    return document.querySelector("main.main");
  }

  function findLegacyPlaceholderSection(main) {
    if (!main) return null;
    const sections = Array.from(main.querySelectorAll(":scope > section"));
    return sections.find(section => {
      const label = section.querySelector(".u-sectionLabel");
      const text = String(label && label.textContent || "").trim().toLowerCase();
      return text === "pedidos (financiero)" || text === "pedidos financieros";
    }) || null;
  }

  function ensureSection() {
    const main = getMain();
    if (!main) return null;

    let section = $("finOrdersFinancialSection");

    if (!section) {
      section = findLegacyPlaceholderSection(main) || document.createElement("section");
      section.className = "grid";
      section.id = "finOrdersFinancialSection";
      section.style.marginTop = "16px";
      section.innerHTML = tableMarkup();
    }

    section.dataset.finView = "pedidos";

    const header = main.querySelector(".appHeader");
    if (header && header.nextElementSibling !== section) {
      header.insertAdjacentElement("afterend", section);
    } else if (!section.parentNode) {
      main.insertBefore(section, main.firstChild);
    }

    return section;
  }

  function injectTabStyles() {
    if ($("finTopTabsStyle")) return;
    const style = document.createElement("style");
    style.id = "finTopTabsStyle";
    style.textContent = `
      .finTopTabs {
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:4px;
        border:1px solid rgba(148,163,184,.35);
        border-radius:999px;
        background:rgba(248,250,252,.88);
        box-shadow:0 1px 3px rgba(15,23,42,.06);
      }
      .finTopTabs__btn {
        appearance:none;
        border:0;
        border-radius:999px;
        background:transparent;
        color:#64748B;
        cursor:pointer;
        font-size:13px;
        font-weight:800;
        line-height:1;
        padding:9px 16px;
        white-space:nowrap;
      }
      .finTopTabs__btn.is-active {
        background:#fff;
        color:#0F172A;
        box-shadow:0 1px 7px rgba(15,23,42,.12);
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTopTabs() {
    injectTabStyles();

    let tabs = $("finTopTabs");
    if (tabs) return tabs;

    const headerRightRow = document.querySelector(".appHeader__right .u-row");
    if (!headerRightRow) return null;

    tabs = document.createElement("div");
    tabs.id = "finTopTabs";
    tabs.className = "finTopTabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Vistas de Finanzas");
    tabs.innerHTML = `
      <button class="finTopTabs__btn" type="button" id="finViewPedidos" data-fin-view-btn="pedidos" role="tab">Pedidos</button>
      <button class="finTopTabs__btn" type="button" id="finViewMovimientos" data-fin-view-btn="movimientos" role="tab">Movimientos</button>
    `;

    headerRightRow.insertBefore(tabs, headerRightRow.firstChild);

    tabs.addEventListener("click", ev => {
      const btn = ev.target.closest("[data-fin-view-btn]");
      if (!btn) return;
      setView(String(btn.getAttribute("data-fin-view-btn") || "pedidos"));
    });

    return tabs;
  }

  function markMovementSections() {
    const main = getMain();
    const tableSection = ensureSection();
    if (!main || !tableSection) return;

    Array.from(main.querySelectorAll(":scope > section")).forEach(section => {
      if (section === tableSection) return;
      section.dataset.finView = "movimientos";
    });
  }

  function setView(view) {
    const next = view === "movimientos" ? "movimientos" : "pedidos";
    state.view = next;

    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch (e) {}

    const tableSection = ensureSection();
    markMovementSections();

    document.querySelectorAll("[data-fin-view-btn]").forEach(btn => {
      const isActive = String(btn.getAttribute("data-fin-view-btn") || "") === next;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    document.querySelectorAll("main.main > section[data-fin-view]").forEach(section => {
      const key = String(section.dataset.finView || "");
      section.style.display = key === next ? "" : "none";
    });

    if (next === "pedidos") {
      loadOrdersTable();
    } else if (tableSection) {
      tableSection.style.display = "none";
    }
  }

  function getInitialView() {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "pedidos" || saved === "movimientos") return saved;
    } catch (e) {}
    return "pedidos";
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

    body.innerHTML = `
      <tr>
        <td colspan="11">
          <div class="u-muted" style="padding:14px 0;">Cargando operación financiera...</div>
        </td>
      </tr>
    `;
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
            <div class="u-muted" style="font-size:12px;">Movimiento: ${fmtDate(row.movement_date_iso || row.expected_payout_date_iso || row.sale_date_iso)}</div>
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
            <div class="u-muted" style="font-size:12px;">Ingreso: ${fmtDate(row.expected_payout_date_iso)}</div>
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
    const section = ensureSection();
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
    const section = ensureSection();
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
    ensureTopTabs();
    ensureSection();
    wireOrdersTable();
    observeAlerts();
    cleanLegacyAlertLabels();
    setView(getInitialView());
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("sazzu:page:load", () => setTimeout(init, 0));

  window.finFinanceOrdersTable = {
    reload: loadOrdersTable,
    cleanLegacyAlertLabels,
    setView
  };
})();
