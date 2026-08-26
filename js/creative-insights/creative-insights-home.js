(function () {
  "use strict";

  const SECTION_META = Object.freeze({
    consignaciones: "Briefs, revisiones y participación",
    entregas: "Inventario creativo entrante",
    revision: "Evaluación creativa y derechos",
    negociaciones: "Conversaciones y ofertas",
    compras: "Adquisiciones, payables y payouts",
    biblioteca: "Activos adquiridos y Rights activos",
    creadores: "Red operativa de Creators",
    incidencias: "Expedientes, holds y resolución"
  });

  let dashboardPromise = null;
  let dashboardReadAt = null;

  function stage() {
    return document.querySelector(".ciStage");
  }

  function currentSection() {
    const value = String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase();

    return value || "inicio";
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? new Intl.NumberFormat("es-AR").format(parsed)
      : "0";
  }

  function relativeTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";

    const delta = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(delta / 60000));

    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `Hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;

    const days = Math.floor(hours / 24);
    return `Hace ${days} d`;
  }

  function navigateTo(section, context = {}) {
    const url = new URL(window.location.href);

    const fields = {
      ci_entity_type: context.entityType,
      ci_entity_id: context.entityId,
      ci_reason: context.reason
    };

    Object.entries(fields).forEach(([key, value]) => {
      const clean = String(value || "").trim();
      if (clean) url.searchParams.set(key, clean);
      else url.searchParams.delete(key);
    });

    url.hash = section;

    history.pushState(
      { ...(history.state || {}), pciSection: section },
      "",
      url
    );

    window.dispatchEvent(new Event("hashchange"));
  }

  function attentionSection(item) {
    const reason = String(item?.reason || "");

    const byReason = {
      incident_open: "incidencias",
      asset_failed: "biblioteca",
      ready_to_pay: "compras",
      payment_processing: "compras",
      rights_flagged: "revision",
      waiting_review: "revision"
    };

    if (byReason[reason]) return byReason[reason];

    const byEntity = {
      dispute: "incidencias",
      creative_asset: "biblioteca",
      payable: "compras",
      submission: "revision",
      negotiation: "negociaciones",
      purchase_offer: "negociaciones",
      purchase: "compras"
    };

    return byEntity[item?.entity_type] || "inicio";
  }

  function friendlyError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");

    if (message === "Failed to fetch") {
      return "No pudimos contactar el runtime seguro.";
    }

    if (
      code === "pci_workspace_access_denied" ||
      error?.status === 403
    ) {
      return "La sesión operator no tiene acceso a este workspace.";
    }

    if (
      code === "pci_auth_session_required" ||
      error?.status === 401
    ) {
      return "La sesión operator venció. Volvé a conectarla.";
    }

    return "No se pudo actualizar la Control Tower.";
  }

  function renderOtherSection(section) {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciStageEmpty">
        <span class="material-symbols-rounded ciStageEmpty__icon" aria-hidden="true">
          construction
        </span>

        <div class="ciStageEmpty__copy">
          <strong>${esc(
            section.charAt(0).toUpperCase() + section.slice(1)
          )}</strong>

          <span>
            ${esc(
              SECTION_META[section] ||
              "Esta superficie se conectará en el siguiente movimiento."
            )}
          </span>
        </div>
      </div>
    `;
  }

  function renderConnection() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <section class="ciConnect" aria-labelledby="ciConnectTitle">
        <div class="ciConnect__icon" aria-hidden="true">
          <span class="material-symbols-rounded">lock</span>
        </div>

        <div class="ciConnect__copy">
          <div class="ciConnect__eyebrow">Runtime descartable</div>
          <h2 id="ciConnectTitle">Conectar sesión operator</h2>
          <p>
            Creative Insights utiliza una sesión PCI aislada para consultar
            el entorno seguro de validación. La sesión normal de Protocol Data
            permanece intacta.
          </p>
        </div>

        <form class="ciConnect__form" data-ci-runtime-login>
          <label class="ciField">
            <span>Correo operator</span>
            <input
              type="email"
              autocomplete="username"
              placeholder="operator@ejemplo.com"
              required
              data-ci-runtime-email
            />
          </label>

          <label class="ciField">
            <span>Contraseña temporal</span>
            <input
              type="password"
              autocomplete="current-password"
              required
              data-ci-runtime-password
            />
          </label>

          <div class="ciConnect__actions">
            <button class="ciButton ciButton--primary" type="submit">
              Conectar
            </button>

            <button
              class="ciButton ciButton--secondary"
              type="button"
              data-ci-runtime-magic
            >
              Enviar Magic Link
            </button>
          </div>

          <div
            class="ciConnect__status"
            role="status"
            aria-live="polite"
            data-ci-runtime-status
          ></div>
        </form>

        <div class="ciConnect__security">
          <span class="material-symbols-rounded" aria-hidden="true">
            verified_user
          </span>
          <span>
            Sólo localhost · proyecto descartable · sin service role
          </span>
        </div>
      </section>
    `;

    bindConnection();
  }

  function setConnectionStatus(message, tone) {
    const node = document.querySelector("[data-ci-runtime-status]");
    if (!node) return;

    node.textContent = message || "";
    node.dataset.tone = tone || "";
  }

  function setConnectionBusy(busy) {
    document
      .querySelectorAll(
        "[data-ci-runtime-login] input, [data-ci-runtime-login] button"
      )
      .forEach((element) => {
        element.disabled = Boolean(busy);
      });
  }

  function bindConnection() {
    const form = document.querySelector("[data-ci-runtime-login]");
    const magic = document.querySelector("[data-ci-runtime-magic]");

    if (!form || !magic || !window.PCIRuntime) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email =
        form.querySelector("[data-ci-runtime-email]")?.value || "";
      const passwordInput =
        form.querySelector("[data-ci-runtime-password]");
      const password = passwordInput?.value || "";

      setConnectionBusy(true);
      setConnectionStatus("Validando sesión…", "loading");

      try {
        await window.PCIRuntime.signInWithPassword(email, password);

        if (passwordInput) passwordInput.value = "";

        setConnectionStatus("Sesión conectada.", "success");
        await render();
      } catch (error) {
        if (passwordInput) passwordInput.value = "";

        setConnectionStatus(
          error?.message || "No se pudo conectar la sesión.",
          "error"
        );
      } finally {
        setConnectionBusy(false);
      }
    });

    magic.addEventListener("click", async () => {
      const email =
        form.querySelector("[data-ci-runtime-email]")?.value || "";

      if (!String(email).trim()) {
        setConnectionStatus(
          "Ingresá primero el correo operator.",
          "error"
        );
        return;
      }

      setConnectionBusy(true);
      setConnectionStatus("Solicitando Magic Link…", "loading");

      try {
        await window.PCIRuntime.sendMagicLink(email);

        setConnectionStatus(
          "Magic Link solicitado. Revisá el correo operator.",
          "success"
        );
      } catch (error) {
        setConnectionStatus(
          error?.message || "No se pudo solicitar el Magic Link.",
          "error"
        );
      } finally {
        setConnectionBusy(false);
      }
    });
  }

  function attentionIcon(reason) {
    const icons = {
      incident_open: "report",
      asset_failed: "error",
      ready_to_pay: "payments",
      payment_processing: "pending_actions",
      rights_flagged: "gpp_maybe",
      waiting_review: "rate_review"
    };

    return icons[reason] || "notifications";
  }

  function renderAttention(items) {
    if (!Array.isArray(items) || !items.length) {
      return `
        <div class="ciAttentionEmpty">
          <span class="material-symbols-rounded" aria-hidden="true">
            check_circle
          </span>
          <div>
            <strong>Sin pendientes críticos</strong>
            <span>No hay elementos en la cola de atención.</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="ciAttentionList">
        ${items.map((item) => `
          <button
            class="ciAttentionItem ciAttentionItem--action"
            type="button"
            data-ci-nav="${esc(attentionSection(item))}"
            data-ci-entity-type="${esc(item.entity_type || "")}"
            data-ci-entity-id="${esc(item.entity_id || "")}"
            data-ci-reason="${esc(item.reason || "")}"
          >
            <div class="ciAttentionItem__icon" aria-hidden="true">
              <span class="material-symbols-rounded">
                ${esc(attentionIcon(item.reason))}
              </span>
            </div>

            <div class="ciAttentionItem__body">
              <strong>${esc(item.title || "Requiere atención")}</strong>
              <span>${esc(item.subtitle || "")}</span>
            </div>

            <div class="ciAttentionItem__time">
              ${esc(relativeTime(item.occurred_at))}
            </div>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderDashboard(data) {
    const root = stage();
    if (!root) return;

    const summary = data?.summary || {};
    const attention = Array.isArray(data?.attention)
      ? data.attention
      : [];

    root.innerHTML = `
      <div class="ciDashboard">
        <section class="ciDashboardTools">
          <div class="ciSearch">
            <span class="material-symbols-rounded" aria-hidden="true">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar en Creative Insights"
              aria-label="Buscar en Creative Insights"
              disabled
            />
          </div>

          <button class="ciPill" type="button" disabled>
            <span class="material-symbols-rounded" aria-hidden="true">
              tune
            </span>
            Filtros
          </button>

          <button
            class="ciPill ciPill--action"
            type="button"
            data-ci-refresh
          >
            <span class="material-symbols-rounded" aria-hidden="true">
              refresh
            </span>
            Actualizar
          </button>

          <div class="ciRuntimeBadge">
            <span class="ciRuntimeBadge__dot"></span>
            Runtime · ${esc(relativeTime(dashboardReadAt))}
          </div>
        </section>

        <section class="ciDashboardSection">
          <div class="ciSectionHeading">
            <div>
              <h2>Requiere atención</h2>
              <p>Lo que necesita una decisión operativa ahora.</p>
            </div>

            <span class="ciSectionHeading__count">
              ${number(attention.length)} de ${number(data?.attention_limit || 25)}
            </span>
          </div>

          <div class="ciMetricGrid">
            <button
              class="ciMetricCard ciMetricCard--action"
              type="button"
              data-ci-nav="revision"
            >
              <div class="ciMetricCard__label">Entregas por revisar</div>
              <div class="ciMetricCard__value">
                ${number(summary.submissions_waiting_review)}
              </div>
              <div class="ciMetricCard__meta">
                Esperando revisión inicial
              </div>
              <span class="material-symbols-rounded ciMetricCard__icon">
                rate_review
              </span>
            </button>

            <button
              class="ciMetricCard ciMetricCard--action"
              type="button"
              data-ci-nav="revision"
            >
              <div class="ciMetricCard__label">En revisión</div>
              <div class="ciMetricCard__value">
                ${number(summary.submissions_under_review)}
              </div>
              <div class="ciMetricCard__meta">
                Evaluación activa
              </div>
              <span class="material-symbols-rounded ciMetricCard__icon">
                fact_check
              </span>
            </button>

            <button
              class="ciMetricCard ciMetricCard--action"
              type="button"
              data-ci-nav="negociaciones"
            >
              <div class="ciMetricCard__label">Negociaciones</div>
              <div class="ciMetricCard__value">
                ${number(summary.negotiations_open)}
              </div>
              <div class="ciMetricCard__meta">
                Conversaciones abiertas
              </div>
              <span class="material-symbols-rounded ciMetricCard__icon">
                forum
              </span>
            </button>

            <button
              class="ciMetricCard ciMetricCard--action"
              type="button"
              data-ci-nav="negociaciones"
            >
              <div class="ciMetricCard__label">Ofertas activas</div>
              <div class="ciMetricCard__value">
                ${number(summary.live_offers)}
              </div>
              <div class="ciMetricCard__meta">
                Esperando resolución
              </div>
              <span class="material-symbols-rounded ciMetricCard__icon">
                contract
              </span>
            </button>

            <button
              class="ciMetricCard ciMetricCard--action"
              type="button"
              data-ci-nav="compras"
            >
              <div class="ciMetricCard__label">Pagos listos</div>
              <div class="ciMetricCard__value">
                ${number(summary.payables_ready_to_pay)}
              </div>
              <div class="ciMetricCard__meta">
                Destino ya confirmado
              </div>
              <span class="material-symbols-rounded ciMetricCard__icon">
                payments
              </span>
            </button>
          </div>
        </section>

        <section class="ciDashboardSection ciDashboardSection--attention">
          <div class="ciSectionHeading">
            <div>
              <h2>Actividad operativa</h2>
              <p>Priorizada por riesgo y urgencia.</p>
            </div>
          </div>

          ${renderAttention(attention)}
        </section>

        <section class="ciDashboardFoot">
          <article>
            <span class="material-symbols-rounded">change_circle</span>
            <div>
              <strong>${number(summary.changes_requested)}</strong>
              <span>Cambios solicitados</span>
            </div>
          </article>

          <article>
            <span class="material-symbols-rounded">select_check_box</span>
            <div>
              <strong>${number(summary.preselected)}</strong>
              <span>Preseleccionadas</span>
            </div>
          </article>

          <article>
            <span class="material-symbols-rounded">video_library</span>
            <div>
              <strong>${number(summary.library_assets)}</strong>
              <span>Assets en Biblioteca</span>
            </div>
          </article>

          <article>
            <span class="material-symbols-rounded">report</span>
            <div>
              <strong>${number(summary.incidents_open)}</strong>
              <span>Incidencias abiertas</span>
            </div>
          </article>
        </section>
      </div>
    `;
  }

  function renderLoading() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciLoading">
        <span class="ciLoading__spinner" aria-hidden="true"></span>
        <span>Cargando Control Tower…</span>
      </div>
    `;
  }

  function renderError(error) {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciErrorState">
        <span class="material-symbols-rounded" aria-hidden="true">
          error
        </span>

        <div>
          <strong>No se pudo actualizar Creative Insights</strong>
          <span>${esc(friendlyError(error))}</span>
        </div>

        <button class="ciButton ciButton--secondary" type="button" data-ci-retry>
          Reintentar
        </button>
      </div>
    `;

    root.querySelector("[data-ci-retry]")
      ?.addEventListener("click", () => {
        dashboardPromise = null;
        dashboardReadAt = null;
        render();
      });
  }

  async function readDashboard() {
    if (!dashboardPromise) {
      dashboardPromise = window.PCIRuntime.getDashboard();

      dashboardPromise.catch(() => {
        dashboardPromise = null;
      });
    }

    const result = await dashboardPromise;

    if (!dashboardReadAt) {
      dashboardReadAt = new Date();
    }

    return result;
  }

  async function refreshDashboard() {
    dashboardPromise = null;
    dashboardReadAt = null;
    await render();
  }

  async function render() {
    if (currentSection() !== "inicio") {
      renderOtherSection(currentSection());
      return;
    }

    if (!window.PCIRuntime) {
      renderError(
        new Error("Cliente PCI runtime no disponible")
      );
      return;
    }

    try {
      const connection =
        await window.PCIRuntime.getConnectionState();

      if (!connection?.signedIn) {
        renderConnection();
        return;
      }

      renderLoading();

      const dashboard = await readDashboard();
      renderDashboard(dashboard);
    } catch (error) {
      if (error?.code === "pci_auth_session_required") {
        renderConnection();
        return;
      }

      renderError(error);
    }
  }

  if (!window.__pciCreativeInsightsHomeBound) {
    window.__pciCreativeInsightsHomeBound = true;

    document.addEventListener("click", (event) => {
      const refresh = event.target.closest("[data-ci-refresh]");

      if (refresh) {
        refreshDashboard();
        return;
      }

      const target = event.target.closest("[data-ci-nav]");
      if (!target) return;

      navigateTo(target.dataset.ciNav || "inicio", {
        entityType: target.dataset.ciEntityType,
        entityId: target.dataset.ciEntityId,
        reason: target.dataset.ciReason
      });
    });

    window.addEventListener("hashchange", () => {
      render();
    });

    document.addEventListener("sazzu:page:load", () => {
      render();
    });

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        render,
        { once: true }
      );
    } else {
      render();
    }
  }
})();
