console.log("[finanzas-simulacion-protocol.js] cargado OK");

(function () {
  const BUILD = "PROTOCOL_SIMULATION_UI_2026_06_29_01";
  const VIEW_KEY = "sazzu_finanzas_active_view";
  const STYLE_ID = "protocolSimulationStylesheet";
  const STYLE_HREF = "/css/finanzas-simulacion-protocol.css?v=20260629_01";

  function $(id) {
    return document.getElementById(id);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function todayDateValue() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function num(value, fallback) {
    const clean = String(value == null ? "" : value).replace(/\./g, "").replace(",", ".");
    const n = Number(clean);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function fmtMoney(value) {
    const n = Number(value || 0);
    return n.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    });
  }

  function fmtPct(value) {
    const n = Number(value || 0);
    return n.toLocaleString("es-AR", { maximumFractionDigits: 3 }) + "%";
  }

  function sectionMarkup() {
    return `
      <div class="u-card protocolSimCard">
        <div class="u-cardInner protocolSimInner">
          <div class="protocolSimHead">
            <div>
              <div class="u-sectionLabel">Simulación Protocol Data</div>
              <div class="u-muted" style="margin-top:6px;">
                Ingresá una venta test para probar reglas financieras sin esperar una venta real.
              </div>
            </div>
            <button class="btn btn--primary" type="button" id="protocolSimSubmitTop">Crear venta simulada</button>
          </div>

          <div class="protocolSimNotice">
            Esta primera versión impacta solo en Finanzas. El payload ya queda preparado para expandirse a UTM, SKU, variant_id, logística, stock y publicidad.
          </div>

          <div class="protocolSimLayout">
            <section class="protocolSimFormCard">
              <div class="protocolSimTitle">Venta simulada</div>

              <div class="protocolSimGrid">
                <label class="protocolSimField">
                  <span>Bruto vendido</span>
                  <input id="protocolSimGross" class="u-input" type="number" min="1" step="0.01" value="100000" />
                </label>

                <label class="protocolSimField">
                  <span>Fecha de venta</span>
                  <input id="protocolSimSaleDate" class="u-input" type="date" />
                </label>

                <label class="protocolSimField">
                  <span>Cliente</span>
                  <input id="protocolSimCustomerName" class="u-input" placeholder="Cliente Simulado" value="Cliente Simulado" />
                </label>

                <label class="protocolSimField">
                  <span>Email</span>
                  <input id="protocolSimCustomerEmail" class="u-input" type="email" placeholder="simulado@protocol.local" value="simulado@protocol.local" />
                </label>

                <label class="protocolSimField">
                  <span>Proveedor</span>
                  <select id="protocolSimProvider" class="u-input">
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="cod">Contra reembolso</option>
                  </select>
                </label>

                <label class="protocolSimField">
                  <span>Gateway</span>
                  <select id="protocolSimGateway" class="u-input">
                    <option value="mercadopago">mercadopago</option>
                    <option value="cod">cod</option>
                  </select>
                </label>

                <label class="protocolSimField">
                  <span>Método</span>
                  <select id="protocolSimMethod" class="u-input">
                    <option value="credit_card">Tarjeta de crédito</option>
                    <option value="debit_card">Tarjeta de débito</option>
                    <option value="account_money">Dinero en cuenta</option>
                    <option value="cash_on_delivery">Pago al recibir</option>
                  </select>
                </label>

                <label class="protocolSimField">
                  <span>Canal</span>
                  <select id="protocolSimChannel" class="u-input">
                    <option value="checkout">Checkout</option>
                    <option value="link_pago">Link de pago</option>
                    <option value="point">Point</option>
                    <option value="qr">QR</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>

                <label class="protocolSimField">
                  <span>Financiación</span>
                  <select id="protocolSimFinancing" class="u-input">
                    <option value="none">Sin financiación</option>
                    <option value="cuotas_sin_interes">Cuotas sin interés</option>
                    <option value="cuotas_con_interes">Cuotas con interés</option>
                  </select>
                </label>

                <label class="protocolSimField">
                  <span>Cuotas</span>
                  <input id="protocolSimInstallments" class="u-input" type="number" min="0" step="1" value="3" />
                </label>

                <label class="protocolSimField">
                  <span>Acreditación días</span>
                  <input id="protocolSimPayoutDelay" class="u-input" type="number" min="0" step="1" value="10" />
                </label>

                <label class="protocolSimField">
                  <span>Estado de pago</span>
                  <select id="protocolSimPaymentStatus" class="u-input">
                    <option value="pending">Pendiente</option>
                    <option value="processed">Procesado</option>
                    <option value="intervened">Intervenido</option>
                  </select>
                </label>
              </div>

              <div class="protocolSimTitle protocolSimTitle--sub">Datos futuros del ecosistema</div>
              <div class="protocolSimGrid protocolSimGrid--future">
                <label class="protocolSimField">
                  <span>SKU</span>
                  <input id="protocolSimSku" class="u-input" placeholder="SKU-DEMO-001" />
                </label>
                <label class="protocolSimField">
                  <span>variant_id</span>
                  <input id="protocolSimVariantId" class="u-input" placeholder="variant_123" />
                </label>
                <label class="protocolSimField">
                  <span>UTM source</span>
                  <input id="protocolSimUtmSource" class="u-input" placeholder="meta" />
                </label>
                <label class="protocolSimField">
                  <span>UTM campaign</span>
                  <input id="protocolSimUtmCampaign" class="u-input" placeholder="test_finanzas" />
                </label>
                <label class="protocolSimField">
                  <span>Código postal</span>
                  <input id="protocolSimZip" class="u-input" placeholder="5000" />
                </label>
                <label class="protocolSimField">
                  <span>Provincia</span>
                  <input id="protocolSimProvince" class="u-input" placeholder="Córdoba" />
                </label>
              </div>

              <div class="protocolSimActions">
                <button class="btn" type="button" id="protocolSimReset">Limpiar</button>
                <button class="btn btn--primary" type="button" id="protocolSimSubmit">Crear venta simulada</button>
              </div>

              <div class="u-muted" id="protocolSimStatus" style="margin-top:10px;"></div>
            </section>

            <section class="protocolSimResultCard">
              <div class="protocolSimTitle">Resultado</div>
              <div id="protocolSimResult" class="protocolSimResultEmpty">
                Todavía no creaste una venta simulada. Al crearla, se aplicará una regla activa y aparecerá en Pedidos financieros.
              </div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function ensureSection() {
    const main = document.querySelector("main.main");
    if (!main) return null;

    let section = $("protocolSimulationSection");
    if (section) return section;

    section = document.createElement("section");
    section.id = "protocolSimulationSection";
    section.className = "grid";
    section.dataset.finView = "simulacion";
    section.style.marginTop = "16px";
    section.style.display = "none";
    section.innerHTML = sectionMarkup();

    const header = main.querySelector(".appHeader");
    if (header) header.insertAdjacentElement("afterend", section);
    else main.insertBefore(section, main.firstChild);

    const dateInput = $("protocolSimSaleDate");
    if (dateInput && !dateInput.value) dateInput.value = todayDateValue();

    return section;
  }

  function ensureTab() {
    const tabs = $("finTopTabs");
    if (!tabs) return false;

    if (!tabs.querySelector('[data-fin-view-btn="simulacion"]')) {
      const btn = document.createElement("button");
      btn.className = "finTopTabs__btn";
      btn.type = "button";
      btn.id = "finViewSimulacion";
      btn.setAttribute("data-fin-view-btn", "simulacion");
      btn.setAttribute("role", "tab");
      btn.textContent = "Simulación";
      tabs.appendChild(btn);
    }

    if (!tabs.__protocolSimulationCaptureWired) {
      tabs.__protocolSimulationCaptureWired = true;
      tabs.addEventListener("click", ev => {
        const btn = ev.target.closest && ev.target.closest('[data-fin-view-btn="simulacion"]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        showSimulationView();
      }, true);
    }

    return true;
  }

  function setTabActive(view) {
    document.querySelectorAll("[data-fin-view-btn]").forEach(btn => {
      const active = String(btn.getAttribute("data-fin-view-btn") || "") === view;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function showSimulationView() {
    const section = ensureSection();
    if (!section) return;

    try {
      window.localStorage.setItem(VIEW_KEY, "simulacion");
    } catch (e) {}

    setTabActive("simulacion");

    document.querySelectorAll("main.main > section").forEach(el => {
      el.style.display = el === section ? "" : "none";
    });
  }

  function getValue(id) {
    const el = $(id);
    return el ? String(el.value || "").trim() : "";
  }

  function collectPayload() {
    const saleDate = getValue("protocolSimSaleDate");
    const provider = getValue("protocolSimProvider") || "mercadopago";
    const gateway = getValue("protocolSimGateway") || provider;
    const method = getValue("protocolSimMethod") || "credit_card";
    const channel = getValue("protocolSimChannel") || "checkout";
    const financing = getValue("protocolSimFinancing") || "none";

    return {
      module_scope: "finance",
      gross_amount: num(getValue("protocolSimGross"), 0),
      sale_date: saleDate ? `${saleDate}T12:00:00-03:00` : null,
      customer_name: getValue("protocolSimCustomerName") || "Cliente Simulado",
      customer_email: getValue("protocolSimCustomerEmail") || "simulado@protocol.local",
      provider,
      payment_gateway: gateway,
      payment_method: method,
      collection_channel: channel,
      financing_type: financing,
      installments_count: Math.max(Math.round(num(getValue("protocolSimInstallments"), 1)), 0),
      payout_delay_days: Math.max(Math.round(num(getValue("protocolSimPayoutDelay"), 0)), 0),
      payment_status: getValue("protocolSimPaymentStatus") || "pending",
      currency: "ARS",
      sku: getValue("protocolSimSku"),
      variant_id: getValue("protocolSimVariantId"),
      utm: {
        source: getValue("protocolSimUtmSource"),
        campaign: getValue("protocolSimUtmCampaign")
      },
      shipping: {
        zip: getValue("protocolSimZip"),
        province: getValue("protocolSimProvince")
      },
      simulation_build: BUILD
    };
  }

  function setStatus(message, isError) {
    const el = $("protocolSimStatus");
    if (!el) return;
    el.textContent = message || "";
    el.style.color = isError ? "#DC2626" : "";
  }

  function renderResult(payload) {
    const mount = $("protocolSimResult");
    if (!mount) return;

    const row = payload && payload.row ? payload.row : null;
    if (!row) {
      mount.className = "protocolSimResultEmpty";
      mount.textContent = "No hay resultado de simulación.";
      return;
    }

    const snapshot = row.applied_rule_snapshot || {};
    mount.className = "protocolSimResult";
    mount.innerHTML = `
      <div class="protocolSimResultHero">
        <div>
          <div class="protocolSimResultLabel">Venta simulada creada</div>
          <div class="protocolSimResultOrder">${escapeHtml(row.shopify_order_name || payload.simulation_code || "SIM")}</div>
          <div class="u-muted" style="margin-top:4px;">Fuente: ${escapeHtml(row.source || "protocol_simulation")}</div>
        </div>
        <span class="protocolSimBadge">TEST</span>
      </div>

      <div class="protocolSimBreakdown">
        <div><span>Bruto vendido</span><strong>${fmtMoney(row.gross_amount)}</strong></div>
        <div><span>Costo por cobro</span><strong>${fmtMoney(row.collection_fee_amount)}</strong></div>
        <div><span>Costo por cuotas</span><strong>${fmtMoney(row.installment_fee_amount)}</strong></div>
        <div><span>Costo financiero total</span><strong>${fmtMoney(row.total_financial_cost_amount)}</strong></div>
        <div><span>Tasa total</span><strong>${fmtPct(row.total_financial_cost_rate)}</strong></div>
        <div><span>Neto esperado</span><strong>${fmtMoney(row.net_expected_amount)}</strong></div>
      </div>

      <div class="protocolSimRuleBox">
        <div class="protocolSimResultLabel">Regla aplicada</div>
        <div class="protocolSimRuleTitle">${escapeHtml(snapshot.label || snapshot.rule_code || "—")}</div>
        <div class="u-muted" style="margin-top:4px;">${escapeHtml(snapshot.rule_code || "Sin código")}</div>
      </div>

      <div class="protocolSimResultActions">
        <button class="btn btn--primary" type="button" id="protocolSimGoOrders">Ver en Pedidos financieros</button>
      </div>
    `;

    const go = $("protocolSimGoOrders");
    if (go) {
      go.addEventListener("click", () => {
        if (window.finFinanceOrdersTable && typeof window.finFinanceOrdersTable.setView === "function") {
          window.finFinanceOrdersTable.setView("pedidos");
          if (typeof window.finFinanceOrdersTable.reload === "function") {
            window.finFinanceOrdersTable.reload();
          }
        }
      });
    }
  }

  async function createSimulation() {
    const payload = collectPayload();

    if (!payload.gross_amount || payload.gross_amount <= 0) {
      setStatus("El bruto vendido debe ser mayor a cero.", true);
      return;
    }

    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      setStatus("Supabase no está disponible para crear ventas simuladas.", true);
      return;
    }

    setStatus("Creando venta simulada y aplicando regla financiera...");

    try {
      const result = await window.SazzuSupabase.rpc("rpc_protocol_simulation_sale_create", {
        input_payload: payload
      });

      if (!result || result.ok !== true) {
        const details = result && result.lookup ? ` Lookup: ${JSON.stringify(result.lookup)}` : "";
        throw new Error((result && result.error ? result.error : "No se pudo crear la venta simulada.") + details);
      }

      setStatus("Venta simulada creada correctamente.");
      renderResult(result);

      if (window.finFinanceOrdersTable && typeof window.finFinanceOrdersTable.reload === "function") {
        window.finFinanceOrdersTable.reload();
      }
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), true);
    }
  }

  function resetForm() {
    const section = ensureSection();
    if (!section) return;
    const ids = [
      "protocolSimGross", "protocolSimCustomerName", "protocolSimCustomerEmail",
      "protocolSimSku", "protocolSimVariantId", "protocolSimUtmSource",
      "protocolSimUtmCampaign", "protocolSimZip", "protocolSimProvince"
    ];
    ids.forEach(id => {
      const el = $(id);
      if (el) el.value = "";
    });
    const gross = $("protocolSimGross");
    const date = $("protocolSimSaleDate");
    const customer = $("protocolSimCustomerName");
    const email = $("protocolSimCustomerEmail");
    const installments = $("protocolSimInstallments");
    const delay = $("protocolSimPayoutDelay");
    if (gross) gross.value = "100000";
    if (date) date.value = todayDateValue();
    if (customer) customer.value = "Cliente Simulado";
    if (email) email.value = "simulado@protocol.local";
    if (installments) installments.value = "3";
    if (delay) delay.value = "10";
    setStatus("Formulario reiniciado.");
  }

  function wire() {
    const section = ensureSection();
    if (!section || section.__wiredProtocolSimulation) return;
    section.__wiredProtocolSimulation = true;

    const topSubmit = $("protocolSimSubmitTop");
    const submit = $("protocolSimSubmit");
    const reset = $("protocolSimReset");
    const provider = $("protocolSimProvider");

    if (topSubmit) topSubmit.addEventListener("click", createSimulation);
    if (submit) submit.addEventListener("click", createSimulation);
    if (reset) reset.addEventListener("click", resetForm);

    if (provider) {
      provider.addEventListener("change", () => {
        if (provider.value === "cod") {
          const gateway = $("protocolSimGateway");
          const method = $("protocolSimMethod");
          const channel = $("protocolSimChannel");
          const financing = $("protocolSimFinancing");
          const installments = $("protocolSimInstallments");
          const delay = $("protocolSimPayoutDelay");
          if (gateway) gateway.value = "cod";
          if (method) method.value = "cash_on_delivery";
          if (channel) channel.value = "manual";
          if (financing) financing.value = "none";
          if (installments) installments.value = "1";
          if (delay) delay.value = "0";
        }
      });
    }
  }

  function init() {
    if (!document.body || document.body.getAttribute("data-page") !== "finanzas") return;
    ensureStyle();
    ensureSection();
    wire();

    const ok = ensureTab();
    if (!ok) {
      window.setTimeout(ensureTab, 150);
      window.setTimeout(ensureTab, 500);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("sazzu:page:load", () => setTimeout(init, 0));

  window.protocolFinanceSimulation = {
    setView: showSimulationView,
    create: createSimulation
  };
})();
