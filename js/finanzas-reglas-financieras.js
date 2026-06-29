console.log("[finanzas-reglas-financieras.js] cargado OK");

(function () {
  const BUILD = "FINANCE_RULES_UI_2026_06_29_03";
  const VIEW_KEY = "sazzu_finanzas_active_view";
  const STYLE_ID = "finRulesStylesheet";
  const STYLE_HREF = "/css/finanzas-reglas-financieras.css?v=20260629_02";

  const state = {
    rows: [],
    selectedRuleCode: "",
    loading: false,
    error: ""
  };

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

  function num(value, fallback) {
    const n = Number(String(value == null ? "" : value).replace(",", "."));
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function fmtPct(value) {
    return num(value, 0).toLocaleString("es-AR", { maximumFractionDigits: 3 }) + "%";
  }

  function normalizeRuleCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function rulesMarkup() {
    return `
      <div class="u-card finRulesCard">
        <div class="u-cardInner finRulesInner">
          <div class="finRulesHead">
            <div>
              <div class="u-sectionLabel">Reglas financieras</div>
              <div class="u-muted" style="margin-top:6px;" id="finRulesMeta">
                Configuración manual de tasas, costos por cuotas, costos por cobro y plazos de acreditación.
              </div>
            </div>

            <div class="finRulesActions">
              <button class="btn" type="button" id="finRulesNewBtn">Nueva regla</button>
              <button class="btn btn--primary" type="button" id="finRulesReloadBtn">Actualizar</button>
            </div>
          </div>

          <div class="finRulesNotice">
            Estas reglas todavía no recalculan pedidos automáticamente. Primero configuramos la matriz financiera; después conectamos el cálculo proyectado al flujo de ingestión.
          </div>

          <section class="finRulesList" aria-label="Listado de reglas financieras">
            <div class="finRulesList__top">
              <div class="finRulesEditor__title">Matriz de reglas</div>
              <div class="finRulesFilters">
                <select id="finRulesProviderFilter" class="u-input">
                  <option value="">Todos</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="cod">COD</option>
                  <option value="manual">Manual</option>
                </select>
                <input id="finRulesSearch" class="u-input" type="search" placeholder="Buscar regla" />
              </div>
            </div>

            <div class="u-muted" id="finRulesEmpty" style="display:none; margin-top:12px;"></div>

            <div class="finRulesTableWrap">
              <table class="finRulesTable" aria-label="Tabla de reglas financieras">
                <thead>
                  <tr>
                    <th>Regla</th>
                    <th>Medio</th>
                    <th>Cuotas</th>
                    <th>Cobro</th>
                    <th>Cuotas %</th>
                    <th>Plazo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody id="finRulesTableBody">
                  <tr><td colspan="7"><div class="u-muted">Cargando reglas...</div></td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function editorMarkup() {
    return `
      <div class="finRuleEditorBackdrop" id="finRuleEditorBackdrop"></div>
      <aside class="finRuleEditorPanel" role="dialog" aria-modal="false" aria-label="Editor de regla financiera">
        <header class="finRuleEditorPanel__head">
          <div>
            <div class="finRuleEditorPanel__kicker">Regla financiera</div>
            <h2 class="finRuleEditorPanel__title" id="finRuleEditorTitle">Nueva regla</h2>
            <div class="finRuleEditorPanel__sub" id="finRuleEditorSub">Configurá tasas, cuotas, costos por cobro y plazo.</div>
          </div>
          <button class="finRuleEditorPanel__close" id="finRuleEditorClose" type="button" aria-label="Cerrar editor">×</button>
        </header>

        <div class="finRuleEditorPanel__body">
          <div class="finRulesFormGrid">
            <label class="finRulesField finRulesField--span2">
              <span>Código de regla</span>
              <input id="finRuleCode" class="u-input" placeholder="MP_CHECKOUT_CREDIT_3X_10D" />
            </label>

            <label class="finRulesField finRulesField--span2">
              <span>Nombre operativo</span>
              <input id="finRuleLabel" class="u-input" placeholder="Mercado Pago · Crédito · 3 cuotas · 10 días" />
            </label>

            <label class="finRulesField">
              <span>Proveedor</span>
              <select id="finRuleProvider" class="u-input">
                <option value="mercadopago">Mercado Pago</option>
                <option value="cod">Contra reembolso</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label class="finRulesField">
              <span>Gateway</span>
              <select id="finRuleGateway" class="u-input">
                <option value="mercadopago">mercadopago</option>
                <option value="cod">cod</option>
                <option value="manual">manual</option>
              </select>
            </label>

            <label class="finRulesField">
              <span>Método</span>
              <select id="finRuleMethod" class="u-input">
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="debit_card">Tarjeta de débito</option>
                <option value="account_money">Dinero en cuenta</option>
                <option value="cash_on_delivery">Pago al recibir</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label class="finRulesField">
              <span>Canal</span>
              <select id="finRuleChannel" class="u-input">
                <option value="checkout">Checkout</option>
                <option value="link_pago">Link de pago</option>
                <option value="point">Point</option>
                <option value="qr">QR</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label class="finRulesField">
              <span>Financiación</span>
              <select id="finRuleFinancing" class="u-input">
                <option value="none">Sin financiación</option>
                <option value="cuotas_sin_interes">Cuotas sin interés</option>
                <option value="cuotas_con_interes">Cuotas con interés</option>
              </select>
            </label>

            <label class="finRulesField">
              <span>Cuotas</span>
              <input id="finRuleInstallments" class="u-input" type="number" min="0" step="1" value="1" />
            </label>

            <label class="finRulesField">
              <span>Acreditación días</span>
              <input id="finRulePayoutDelay" class="u-input" type="number" min="0" step="1" value="0" />
            </label>

            <label class="finRulesField">
              <span>Costo por cobro %</span>
              <input id="finRuleCollectionRate" class="u-input" type="number" min="0" step="0.001" value="0" />
            </label>

            <label class="finRulesField">
              <span>Impuesto cobro %</span>
              <input id="finRuleCollectionTax" class="u-input" type="number" min="0" step="0.001" value="0" />
            </label>

            <label class="finRulesField">
              <span>Costo cuotas %</span>
              <input id="finRuleInstallmentRate" class="u-input" type="number" min="0" step="0.001" value="0" />
            </label>

            <label class="finRulesField">
              <span>Impuesto cuotas %</span>
              <input id="finRuleInstallmentTax" class="u-input" type="number" min="0" step="0.001" value="0" />
            </label>

            <label class="finRulesField">
              <span>Costo fijo $</span>
              <input id="finRuleFixedFee" class="u-input" type="number" min="0" step="0.01" value="0" />
            </label>

            <label class="finRulesField">
              <span>Prioridad</span>
              <input id="finRulePriority" class="u-input" type="number" step="1" value="100" />
            </label>

            <label class="finRulesCheck finRulesField--span2">
              <input id="finRuleActive" type="checkbox" checked />
              <span>Regla activa</span>
            </label>

            <label class="finRulesField finRulesField--span2">
              <span>Notas</span>
              <textarea id="finRuleNotes" class="u-input" rows="3" placeholder="Ej: tasa tomada del simulador de Mercado Pago, vigente hasta revisión manual."></textarea>
            </label>
          </div>
        </div>

        <footer class="finRuleEditorPanel__foot">
          <div class="u-muted" id="finRulesFormStatus"></div>
          <div class="finRulesEditorActions">
            <button class="btn" type="button" id="finRulesClearBtn">Limpiar</button>
            <button class="btn btn--primary" type="button" id="finRulesSaveBtn">Guardar regla</button>
          </div>
        </footer>
      </aside>
    `;
  }

  function ensureEditorSlide() {
    let overlay = $("finRuleEditorOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "finRuleEditorOverlay";
    overlay.className = "finRuleEditorOverlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = editorMarkup();
    document.body.appendChild(overlay);

    const close = $("finRuleEditorClose");
    const backdrop = $("finRuleEditorBackdrop");
    const save = $("finRulesSaveBtn");
    const clear = $("finRulesClearBtn");

    if (close) close.addEventListener("click", closeEditorSlide);
    if (backdrop) backdrop.addEventListener("click", closeEditorSlide);
    if (save) save.addEventListener("click", saveRule);
    if (clear) clear.addEventListener("click", () => openRuleEditor(null));

    return overlay;
  }

  function openEditorSlide() {
    const overlay = ensureEditorSlide();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("finRuleEditorOpen");
  }

  function closeEditorSlide() {
    const overlay = $("finRuleEditorOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("finRuleEditorOpen");
  }

  function onKeydown(ev) {
    if (ev.key === "Escape") closeEditorSlide();
  }

  function ensureSection() {
    const main = document.querySelector("main.main");
    if (!main) return null;

    let section = $("finFinanceRulesSection");
    if (section) return section;

    section = document.createElement("section");
    section.id = "finFinanceRulesSection";
    section.className = "grid";
    section.dataset.finView = "reglas";
    section.style.marginTop = "16px";
    section.style.display = "none";
    section.innerHTML = rulesMarkup();

    const header = main.querySelector(".appHeader");
    if (header) header.insertAdjacentElement("afterend", section);
    else main.insertBefore(section, main.firstChild);

    return section;
  }

  function ensureRulesTab() {
    const tabs = $("finTopTabs");
    if (!tabs) return false;

    if (!tabs.querySelector('[data-fin-view-btn="reglas"]')) {
      const btn = document.createElement("button");
      btn.className = "finTopTabs__btn";
      btn.type = "button";
      btn.id = "finViewReglas";
      btn.setAttribute("data-fin-view-btn", "reglas");
      btn.setAttribute("role", "tab");
      btn.textContent = "Reglas";
      tabs.appendChild(btn);
    }

    if (!tabs.__financeRulesCaptureWired) {
      tabs.__financeRulesCaptureWired = true;
      tabs.addEventListener("click", ev => {
        const btn = ev.target.closest && ev.target.closest('[data-fin-view-btn="reglas"]');
        if (!btn) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        showRulesView();
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

  function showRulesView() {
    const section = ensureSection();
    if (!section) return;

    try {
      window.localStorage.setItem(VIEW_KEY, "reglas");
    } catch (e) {}

    setTabActive("reglas");

    document.querySelectorAll("main.main > section").forEach(el => {
      el.style.display = el === section ? "" : "none";
    });

    loadRules();
  }

  function getDefaultRule() {
    return {
      provider: "mercadopago",
      payment_gateway: "mercadopago",
      payment_method: "credit_card",
      collection_channel: "checkout",
      financing_type: "none",
      installments_count: 1,
      payout_delay_days: 0,
      collection_fee_rate: 0,
      collection_fee_tax_rate: 0,
      installment_fee_rate: 0,
      installment_fee_tax_rate: 0,
      fixed_fee_amount: 0,
      priority: 100,
      active: true,
      notes: ""
    };
  }

  function openRuleEditor(rule) {
    ensureEditorSlide();
    const isEdit = !!(rule && rule.rule_code);
    state.selectedRuleCode = isEdit ? rule.rule_code : "";

    const title = $("finRuleEditorTitle");
    const sub = $("finRuleEditorSub");
    if (title) title.textContent = isEdit ? "Editar regla" : "Nueva regla";
    if (sub) sub.textContent = isEdit ? `Editando ${rule.rule_code}.` : "Configurá una nueva regla de costos financieros.";

    fillForm(isEdit ? rule : getDefaultRule());

    if (!isEdit) {
      const code = $("finRuleCode");
      const label = $("finRuleLabel");
      const notes = $("finRuleNotes");
      if (code) code.value = "";
      if (label) label.value = "";
      if (notes) notes.value = "";
      setStatus("Nueva regla lista para configurar.");
    } else {
      setStatus(`Editando ${rule.rule_code}.`);
    }

    openEditorSlide();
  }

  function fillForm(rule) {
    const set = (id, value) => {
      const el = $(id);
      if (el) el.value = value == null ? "" : String(value);
    };

    set("finRuleCode", rule.rule_code || "");
    set("finRuleLabel", rule.label || "");
    set("finRuleProvider", rule.provider || "mercadopago");
    set("finRuleGateway", rule.payment_gateway || rule.provider || "mercadopago");
    set("finRuleMethod", rule.payment_method || "credit_card");
    set("finRuleChannel", rule.collection_channel || "checkout");
    set("finRuleFinancing", rule.financing_type || "none");
    set("finRuleInstallments", rule.installments_count ?? 1);
    set("finRulePayoutDelay", rule.payout_delay_days ?? 0);
    set("finRuleCollectionRate", rule.collection_fee_rate ?? 0);
    set("finRuleCollectionTax", rule.collection_fee_tax_rate ?? 0);
    set("finRuleInstallmentRate", rule.installment_fee_rate ?? 0);
    set("finRuleInstallmentTax", rule.installment_fee_tax_rate ?? 0);
    set("finRuleFixedFee", rule.fixed_fee_amount ?? 0);
    set("finRulePriority", rule.priority ?? 100);
    set("finRuleNotes", rule.notes || "");

    const active = $("finRuleActive");
    if (active) active.checked = rule.active !== false;
  }

  function collectForm() {
    const get = id => {
      const el = $(id);
      return el ? String(el.value || "").trim() : "";
    };

    return {
      rule_code: normalizeRuleCode(get("finRuleCode")),
      label: get("finRuleLabel"),
      provider: get("finRuleProvider"),
      payment_gateway: get("finRuleGateway") || get("finRuleProvider"),
      payment_method: get("finRuleMethod"),
      collection_channel: get("finRuleChannel"),
      financing_type: get("finRuleFinancing"),
      installments_count: Math.max(Math.round(num(get("finRuleInstallments"), 1)), 0),
      payout_delay_days: Math.max(Math.round(num(get("finRulePayoutDelay"), 0)), 0),
      collection_fee_rate: num(get("finRuleCollectionRate"), 0),
      collection_fee_tax_rate: num(get("finRuleCollectionTax"), 0),
      installment_fee_rate: num(get("finRuleInstallmentRate"), 0),
      installment_fee_tax_rate: num(get("finRuleInstallmentTax"), 0),
      fixed_fee_amount: num(get("finRuleFixedFee"), 0),
      priority: Math.round(num(get("finRulePriority"), 100)),
      active: !!($("finRuleActive") && $("finRuleActive").checked),
      jurisdiction: "AR",
      notes: get("finRuleNotes"),
      metadata: {
        source: "protocol_data_ui",
        build: BUILD
      }
    };
  }

  function setStatus(message, isError) {
    const el = $("finRulesFormStatus");
    if (!el) return;
    el.textContent = message || "";
    el.style.color = isError ? "#DC2626" : "";
  }

  function renderRules() {
    const body = $("finRulesTableBody");
    const empty = $("finRulesEmpty");
    const meta = $("finRulesMeta");
    if (!body) return;

    if (meta) meta.textContent = `${state.rows.length} regla${state.rows.length === 1 ? "" : "s"} financiera${state.rows.length === 1 ? "" : "s"} configurada${state.rows.length === 1 ? "" : "s"}.`;

    if (!state.rows.length) {
      body.innerHTML = "";
      if (empty) {
        empty.style.display = "";
        empty.textContent = "No hay reglas para los filtros activos.";
      }
      return;
    }

    if (empty) empty.style.display = "none";

    body.innerHTML = state.rows.map(rule => {
      const status = rule.active ? "Activa" : "Inactiva";
      const statusClass = rule.active ? "is-active" : "is-inactive";
      return `
        <tr data-fin-rule-code="${escapeHtml(rule.rule_code)}" tabindex="0" aria-label="Editar regla ${escapeHtml(rule.rule_code)}">
          <td>
            <div class="finRulesTable__strong">${escapeHtml(rule.label || rule.rule_code)}</div>
            <div class="u-muted" style="font-size:12px;">${escapeHtml(rule.rule_code)}</div>
          </td>
          <td>
            <div class="finRulesTable__strong">${escapeHtml(rule.provider || "—")}</div>
            <div class="u-muted" style="font-size:12px;">${escapeHtml(rule.payment_method || "—")} · ${escapeHtml(rule.collection_channel || "—")}</div>
          </td>
          <td>${Number(rule.installments_count || 0)}x</td>
          <td>${fmtPct(rule.collection_fee_rate)}</td>
          <td>${fmtPct(rule.installment_fee_rate)}</td>
          <td>${Number(rule.payout_delay_days || 0)} días</td>
          <td><span class="finRulesStatus ${statusClass}">${escapeHtml(status)}</span></td>
        </tr>
      `;
    }).join("");
  }

  async function loadRules() {
    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      state.error = "Supabase no está disponible para cargar reglas financieras.";
      renderRulesError(state.error);
      return;
    }

    const provider = $("finRulesProviderFilter") ? $("finRulesProviderFilter").value : "";
    const q = $("finRulesSearch") ? $("finRulesSearch").value : "";

    state.loading = true;
    state.error = "";

    const body = $("finRulesTableBody");
    if (body) body.innerHTML = `<tr><td colspan="7"><div class="u-muted">Cargando reglas financieras...</div></td></tr>`;

    try {
      const payload = await window.SazzuSupabase.rpc("rpc_finance_payment_rules_list", {
        input_active: null,
        input_provider: provider || null,
        input_q: q || null
      });

      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error ? payload.error : "Supabase no devolvió reglas financieras válidas.");
      }

      state.rows = Array.isArray(payload.rows) ? payload.rows : [];
      console.log("[finanzas-reglas] reglas", BUILD, payload.build, state.rows.length);
      renderRules();
    } catch (err) {
      state.rows = [];
      state.error = String(err && err.message ? err.message : err);
      renderRulesError(state.error);
    } finally {
      state.loading = false;
    }
  }

  function renderRulesError(message) {
    const body = $("finRulesTableBody");
    const empty = $("finRulesEmpty");
    if (body) body.innerHTML = "";
    if (empty) {
      empty.style.display = "";
      empty.textContent = message || "No se pudieron cargar las reglas financieras.";
    }
  }

  async function saveRule() {
    const rule = collectForm();

    if (!rule.rule_code) {
      setStatus("Falta el código de regla.", true);
      return;
    }

    if (!rule.label) {
      setStatus("Falta el nombre operativo de la regla.", true);
      return;
    }

    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      setStatus("Supabase no está disponible para guardar reglas.", true);
      return;
    }

    setStatus("Guardando regla...");

    try {
      const payload = await window.SazzuSupabase.rpc("rpc_finance_payment_rule_upsert", {
        input_rule: rule
      });

      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error ? payload.error : "No se pudo guardar la regla financiera.");
      }

      setStatus("Regla guardada correctamente.");
      await loadRules();
      const saved = payload.rule || rule;
      fillForm(saved);
      state.selectedRuleCode = saved.rule_code || rule.rule_code;
    } catch (err) {
      setStatus(String(err && err.message ? err.message : err), true);
    }
  }

  function openRuleFromCode(code) {
    const rule = state.rows.find(item => String(item.rule_code) === String(code));
    if (rule) openRuleEditor(rule);
  }

  function wire() {
    const section = ensureSection();
    ensureEditorSlide();

    if (!window.__finRulesEscapeWired) {
      window.__finRulesEscapeWired = true;
      document.addEventListener("keydown", onKeydown);
    }

    if (!section || section.__wiredFinanceRules) return;
    section.__wiredFinanceRules = true;

    const reload = $("finRulesReloadBtn");
    const fresh = $("finRulesNewBtn");
    const providerFilter = $("finRulesProviderFilter");
    const search = $("finRulesSearch");
    const body = $("finRulesTableBody");

    if (reload) reload.addEventListener("click", loadRules);
    if (fresh) fresh.addEventListener("click", () => openRuleEditor(null));

    if (providerFilter) providerFilter.addEventListener("change", loadRules);
    if (search) {
      search.addEventListener("keydown", ev => {
        if (ev.key === "Enter") loadRules();
      });
    }

    if (body) {
      body.addEventListener("click", ev => {
        const tr = ev.target.closest && ev.target.closest("tr[data-fin-rule-code]");
        if (!tr) return;
        openRuleFromCode(tr.getAttribute("data-fin-rule-code"));
      });

      body.addEventListener("keydown", ev => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        const tr = ev.target.closest && ev.target.closest("tr[data-fin-rule-code]");
        if (!tr) return;
        ev.preventDefault();
        openRuleFromCode(tr.getAttribute("data-fin-rule-code"));
      });
    }
  }

  function init() {
    if (!document.body || document.body.getAttribute("data-page") !== "finanzas") return;
    ensureStyle();
    ensureSection();
    wire();

    const hasTabs = ensureRulesTab();
    if (!hasTabs) {
      window.setTimeout(ensureRulesTab, 150);
      window.setTimeout(ensureRulesTab, 500);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("sazzu:page:load", () => setTimeout(init, 0));

  window.finFinanceRules = {
    reload: loadRules,
    setView: showRulesView,
    openNew: function () { openRuleEditor(null); },
    openByCode: openRuleFromCode,
    closeEditor: closeEditorSlide
  };
})();
