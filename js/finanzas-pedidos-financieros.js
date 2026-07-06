console.log("[finanzas-pedidos-financieros.js] cargado OK");

(function () {
  "use strict";

  const BUILD = "FINANCE_ORDERS_TABLE_ALL_2026_07_06_01";
  const VIEW_STORAGE_KEY = "sazzu_finanzas_active_view";

  const state = {
    rows: [],
    total: 0,
    loading: false,
    error: "",
    limit: 10,
    offset: 0,
    view: "pedidos",
    selectedRow: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
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
                Vista completa de pedidos financieros. No depende del selector de fechas del cashflow.
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
                <option value="pending">Pendiente / por pagar</option>
                <option value="processed">Procesado / pagado</option>
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

          <div
            id="finOrdersPager"
            class="u-row u-row--between u-row--center"
            style="gap:12px; margin-top:14px; flex-wrap:wrap;"
          >
            <div class="u-muted" id="finOrdersPageInfo">—</div>

            <div class="u-row u-row--center" style="gap:8px; justify-content:flex-end;">
              <button id="finOrdersPrev" class="btn" type="button" aria-label="Página anterior">‹</button>
              <button id="finOrdersNext" class="btn" type="button" aria-label="Página siguiente">›</button>
            </div>
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

  function ensureTopTabs() {
    let tabs = $("finTopTabs");
    if (tabs) return tabs;

    const header = document.querySelector(".appHeader");
    const headerRight = document.querySelector(".appHeader__right");
    if (!header) return null;

    tabs = document.createElement("div");
    tabs.id = "finTopTabs";
    tabs.className = "finTopTabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Vistas de Finanzas");
    tabs.innerHTML = `
      <button class="finTopTabs__btn" type="button" id="finViewPedidos" data-fin-view-btn="pedidos" role="tab">Pedidos</button>
      <button class="finTopTabs__btn" type="button" id="finViewMovimientos" data-fin-view-btn="movimientos" role="tab">Movimientos</button>
    `;

    tabs.addEventListener("click", ev => {
      const btn = ev.target.closest("[data-fin-view-btn]");
      if (!btn) return;
      setView(String(btn.getAttribute("data-fin-view-btn") || "pedidos"));
    });

    if (headerRight && headerRight.parentNode === header) {
      header.insertBefore(tabs, headerRight);
    } else {
      header.appendChild(tabs);
    }

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

  function setHeaderDateControlsVisible(isVisible) {
    const headerRight = document.querySelector(".appHeader__right");
    if (!headerRight) return;
    headerRight.style.display = isVisible ? "" : "none";
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

    setHeaderDateControlsVisible(next === "movimientos");

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
    const pageInfo = $("finOrdersPageInfo");
    if (empty) empty.style.display = "none";
    if (meta) meta.textContent = "Cargando todos los pedidos financieros...";
    if (pageInfo) pageInfo.textContent = "Cargando...";
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
    const pageInfo = $("finOrdersPageInfo");

    if (meta) meta.textContent = "No se pudo cargar la tabla financiera.";
    if (pageInfo) pageInfo.textContent = "—";
    if (empty) {
      empty.style.display = "";
      empty.textContent = message || "No se pudo cargar la tabla financiera.";
    }
    if (body) body.innerHTML = "";
    renderPager();
  }

  function renderPager() {
    const pageInfo = $("finOrdersPageInfo");
    const prev = $("finOrdersPrev");
    const next = $("finOrdersNext");

    const total = Number(state.total || 0);
    const limit = Number(state.limit || 10);
    const offset = Number(state.offset || 0);
    const currentCount = Array.isArray(state.rows) ? state.rows.length : 0;

    const from = total && currentCount ? offset + 1 : 0;
    const to = total && currentCount ? Math.min(offset + currentCount, total) : 0;
    const page = limit ? Math.floor(offset / limit) + 1 : 1;
    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;

    if (pageInfo) {
      pageInfo.textContent = total
        ? `Mostrando ${from}-${to} de ${total.toLocaleString("es-AR")} · Página ${page} de ${totalPages}`
        : "Sin pedidos para mostrar";
    }

    if (prev) prev.disabled = offset <= 0 || state.loading;
    if (next) next.disabled = (offset + limit) >= total || state.loading;
  }

  function renderTable() {
    const body = $("finOrdersTableBody");
    const empty = $("finOrdersEmpty");
    const meta = $("finOrdersMeta");
    if (!body) return;

    if (meta) {
      meta.textContent = `${state.total.toLocaleString("es-AR")} pedido${state.total === 1 ? "" : "s"} financiero${state.total === 1 ? "" : "s"} en total. Sin filtro de fecha.`;
    }

    if (!state.rows.length) {
      body.innerHTML = "";
      if (empty) {
        empty.style.display = "";
        empty.textContent = "No hay pedidos financieros para los filtros activos.";
      }
      renderPager();
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
      const rowId = row.finance_order_id || row.shopify_order_id || orderName;

      return `
        <tr data-fin-order-id="${escapeHtml(rowId)}" tabindex="0" aria-label="Abrir detalle financiero del pedido ${escapeHtml(orderName)}">
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

    renderPager();
  }

  function findRowById(rowId) {
    const needle = String(rowId || "");
    return state.rows.find(row => {
      const keys = [row.finance_order_id, row.shopify_order_id, row.shopify_order_name].map(value => String(value || ""));
      return keys.includes(needle);
    }) || null;
  }

  function safeSnapshot(row) {
    const snapshot = row && row.applied_rule_snapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return {};
    return snapshot;
  }

  function renderDetailLine(label, value, opts) {
    const options = opts || {};
    const valueClass = options.strong ? "finOrderDetailLine__value is-strong" : "finOrderDetailLine__value";
    const valueStyle = options.green ? "color:#16A34A;" : options.red ? "color:#DC2626;" : "";

    return `
      <div class="finOrderDetailLine">
        <div class="finOrderDetailLine__label">${escapeHtml(label)}</div>
        <div class="${valueClass}" style="${valueStyle}">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function renderSnapshot(snapshot) {
    const entries = Object.entries(snapshot || {}).filter(([, value]) => value != null && value !== "");
    if (!entries.length) return `<div class="u-muted">Sin snapshot de regla aplicada.</div>`;

    return entries.map(([key, value]) => {
      const label = String(key).replace(/_/g, " ");
      const cleanValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return renderDetailLine(label, cleanValue);
    }).join("");
  }

  function detailMarkup(row) {
    const orderName = row.shopify_order_name || row.shopify_order_id || "—";
    const gateway = normalizeGatewayLabel(row);
    const method = normalizeMethodLabel(row);
    const status = statusLabel(row.payment_status);
    const calcType = calculationLabel(row);
    const installments = row.is_cod ? "—" : `${Number(row.installments_count || 1)}x`;
    const gross = Number(row.gross_amount || 0);
    const collectionFee = Number(row.collection_fee_amount || 0);
    const installmentFee = Number(row.installment_fee_amount || 0);
    const totalCost = Number(row.total_financial_cost_amount || 0);
    const netExpected = Number(row.net_expected_amount || 0);
    const rate = Number(row.total_financial_cost_rate || 0);
    const snapshot = safeSnapshot(row);
    const codNote = row.is_cod
      ? `<div class="finOrderDetailNote finOrderDetailNote--success">Este pedido fue marcado como <strong>Contra reembolso</strong>. No tiene costos financieros proyectados.</div>`
      : `<div class="finOrderDetailNote">Este detalle muestra una proyección financiera. Cuando conectemos Mercado Pago real, se podrá comparar contra el dato conciliado.</div>`;

    return `
      <header class="finOrderDetail__head">
        <div>
          <div class="finOrderDetail__kicker">Detalle financiero</div>
          <h2 class="finOrderDetail__title">Pedido ${escapeHtml(orderName)}</h2>
          <div class="finOrderDetail__sub">${escapeHtml(row.customer_name || "Cliente sin nombre")} · ${escapeHtml(row.customer_email || "Sin email")}</div>
        </div>
        <button class="finOrderDetail__close" id="finOrderDetailClose" type="button" aria-label="Cerrar detalle">×</button>
      </header>

      <div class="finOrderDetail__body">
        <section class="finOrderDetailCard finOrderDetailCard--hero">
          <div>
            <div class="finOrderDetailCard__label">Neto esperado</div>
            <div class="finOrderDetailCard__value">${fmtMoney(netExpected)}</div>
            <div class="finOrderDetailCard__sub">Bruto menos costos financieros proyectados.</div>
          </div>
          <div class="finOrderDetailPill">${escapeHtml(calcType)}</div>
        </section>

        ${codNote}

        <section class="finOrderDetailGrid">
          <div class="finOrderDetailMini"><div class="finOrderDetailMini__label">Bruto vendido</div><div class="finOrderDetailMini__value">${fmtMoney(gross)}</div></div>
          <div class="finOrderDetailMini"><div class="finOrderDetailMini__label">Costo financiero total</div><div class="finOrderDetailMini__value ${totalCost === 0 ? "is-green" : ""}">${fmtMoney(totalCost)}</div></div>
        </section>

        <section class="finOrderDetailCard">
          <div class="finOrderDetailSectionTitle">Breakdown financiero</div>
          ${renderDetailLine("Costo por cobro", fmtMoney(collectionFee), { green: collectionFee === 0 })}
          ${renderDetailLine("Costo por cuotas", fmtMoney(installmentFee), { green: installmentFee === 0 })}
          ${renderDetailLine("Costo financiero total", fmtMoney(totalCost), { strong: true, green: totalCost === 0 })}
          ${renderDetailLine("Tasa financiera total", fmtPct(rate), { strong: true })}
          ${renderDetailLine("Neto esperado", fmtMoney(netExpected), { strong: true })}
        </section>

        <section class="finOrderDetailCard">
          <div class="finOrderDetailSectionTitle">Medio y condiciones</div>
          ${renderDetailLine("Gateway", gateway)}
          ${renderDetailLine("Método", method)}
          ${renderDetailLine("Cuotas", installments)}
          ${renderDetailLine("Plazo de acreditación", `${Number(row.payout_delay_days || 0)} día${Number(row.payout_delay_days || 0) === 1 ? "" : "s"}`)}
          ${renderDetailLine("Estado financiero", status)}
        </section>

        <section class="finOrderDetailCard">
          <div class="finOrderDetailSectionTitle">Fechas</div>
          ${renderDetailLine("Fecha de venta", fmtDate(row.sale_date_iso))}
          ${renderDetailLine("Fecha de movimiento", fmtDate(row.movement_date_iso || row.expected_payout_date_iso || row.sale_date_iso))}
          ${renderDetailLine("Ingreso esperado", fmtDate(row.expected_payout_date_iso))}
          ${renderDetailLine("Ingreso real", fmtDate(row.actual_payout_date_iso))}
        </section>

        <section class="finOrderDetailCard">
          <div class="finOrderDetailSectionTitle">Regla aplicada</div>
          ${renderDetailLine("Origen", row.source || "—")}
          ${renderDetailLine("Tipo de cálculo", calcType)}
          <div class="finOrderDetailSnapshot">${renderSnapshot(snapshot)}</div>
        </section>
      </div>
    `;
  }

  function ensureDetailSlide() {
    let overlay = $("finOrderDetailOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "finOrderDetailOverlay";
    overlay.className = "finOrderDetailOverlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="finOrderDetailBackdrop" id="finOrderDetailBackdrop"></div>
      <aside class="finOrderDetailPanel" role="dialog" aria-modal="false" aria-label="Detalle financiero del pedido">
        <div class="finOrderDetailMount" id="finOrderDetailMount"></div>
      </aside>
    `;

    document.body.appendChild(overlay);
    const backdrop = $("finOrderDetailBackdrop");
    if (backdrop) backdrop.addEventListener("click", closeOrderDetail);

    overlay.addEventListener("click", ev => {
      const closeBtn = ev.target.closest && ev.target.closest("#finOrderDetailClose");
      if (closeBtn) closeOrderDetail();
    });

    return overlay;
  }

  function openOrderDetail(row) {
    if (!row) return;
    state.selectedRow = row;
    const overlay = ensureDetailSlide();
    const mount = $("finOrderDetailMount");
    if (!mount) return;
    mount.innerHTML = detailMarkup(row);
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("finOrderDetailOpen");
  }

  function closeOrderDetail() {
    const overlay = $("finOrderDetailOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("finOrderDetailOpen");
  }

  function onGlobalKeydown(ev) {
    if (ev.key === "Escape") closeOrderDetail();
  }

  async function loadOrdersTable() {
    const section = ensureSection();
    if (!section) return;

    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      renderError("Supabase no está disponible para cargar pedidos financieros.");
      return;
    }

    const filters = getFilters();

    state.loading = true;
    state.error = "";
    renderSkeleton();
    renderPager();

    try {
      const payload = await window.SazzuSupabase.rpc("rpc_finance_orders_table", {
        input_from: null,
        input_to: null,
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

      console.log("[finanzas-pedidos] tabla financiera sin fecha", BUILD, payload.build, state.rows.length);
      renderTable();
    } catch (err) {
      state.rows = [];
      state.total = 0;
      state.error = String(err && err.message ? err.message : err);
      console.warn("[finanzas-pedidos] error cargando tabla", err);
      renderError(state.error);
    } finally {
      state.loading = false;
      renderPager();
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
    const prevBtn = $("finOrdersPrev");
    const nextBtn = $("finOrdersNext");
    const body = $("finOrdersTableBody");

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

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (state.offset <= 0) return;
        state.offset = Math.max(0, state.offset - state.limit);
        loadOrdersTable();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (state.offset + state.limit >= state.total) return;
        state.offset += state.limit;
        loadOrdersTable();
      });
    }

    if (body && !body.__wiredFinanceOrderDetail) {
      body.__wiredFinanceOrderDetail = true;
      body.addEventListener("click", ev => {
        const tr = ev.target.closest && ev.target.closest("tr[data-fin-order-id]");
        if (!tr) return;
        const row = findRowById(tr.getAttribute("data-fin-order-id"));
        openOrderDetail(row);
      });
      body.addEventListener("keydown", ev => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        const tr = ev.target.closest && ev.target.closest("tr[data-fin-order-id]");
        if (!tr) return;
        ev.preventDefault();
        const row = findRowById(tr.getAttribute("data-fin-order-id"));
        openOrderDetail(row);
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
    ensureDetailSlide();
    if (!window.__finOrderDetailEscapeWired) {
      window.__finOrderDetailEscapeWired = true;
      document.addEventListener("keydown", onGlobalKeydown);
    }
    setView(getInitialView());
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("sazzu:page:load", () => setTimeout(init, 0));

  window.finFinanceOrdersTable = {
    reload: loadOrdersTable,
    cleanLegacyAlertLabels,
    setView,
    openDetailById: function (rowId) {
      openOrderDetail(findRowById(rowId));
    },
    closeDetail: closeOrderDetail
  };
})();
