(function () {
  "use strict";

  const PAGE_SIZE = 25;

  const FILTERS = Object.freeze([
    ["", "Todas"],
    ["submitted", "Enviadas"],
    ["under_review", "En revisión"],
    ["changes_requested", "Cambios solicitados"],
    ["preselected", "Preseleccionadas"],
    ["acquired", "Adquiridas"],
    ["draft", "Borradores"],
    ["rejected", "Rechazadas"],
    ["withdrawn", "Retiradas"]
  ]);

  const STATUS_LABELS = Object.freeze({
    draft: "Borrador",
    submitted: "Enviada",
    under_review: "En revisión",
    changes_requested: "Cambios solicitados",
    preselected: "Preseleccionada",
    rejected: "Rechazada",
    withdrawn: "Retirada",
    acquired: "Adquirida"
  });

  const RIGHTS_LABELS = Object.freeze({
    complete: "Rights complete",
    flagged: "Rights flagged",
    pending: "Rights pendiente",
    not_reviewed: "Rights sin revisar"
  });

  const state = {
    status: "",
    offset: 0,
    loading: false,
    requestSeq: 0
  };

  function isDeliveries() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "entregas";
  }

  function stage() {
    return document.querySelector(".ciStage");
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatDuration(value) {
    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }

    return `${seconds.toFixed(
      seconds < 10 ? 1 : 0
    )} s`;
  }

  function humanize(value) {
    const raw = String(value || "").trim();

    if (!raw) return "—";

    return raw
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function statusLabel(value) {
    return STATUS_LABELS[value] || humanize(value);
  }

  function rightsLabel(value) {
    return RIGHTS_LABELS[value] || humanize(value);
  }

  function statusTone(value) {
    const tones = {
      draft: "muted",
      submitted: "blue",
      under_review: "blue",
      changes_requested: "amber",
      preselected: "purple",
      rejected: "red",
      withdrawn: "muted",
      acquired: "green"
    };

    return tones[value] || "muted";
  }

  function rightsTone(value) {
    if (value === "complete") return "green";
    if (value === "flagged") return "red";
    return "muted";
  }

  function currentVersionLabel(version) {
    if (!version) return "Sin versión";

    const bits = [];

    if (version.version_number) {
      bits.push(`V${version.version_number}`);
    }

    if (version.status) {
      bits.push(humanize(version.status));
    }

    return bits.join(" · ") || "Versión";
  }

  function technicalMeta(version) {
    if (!version) return "Todavía no hay archivo asociado.";

    const bits = [];

    if (version.width && version.height) {
      bits.push(`${version.width}×${version.height}`);
    }

    const duration = formatDuration(version.duration_seconds);
    if (duration) bits.push(duration);

    if (version.mime_type) {
      bits.push(
        String(version.mime_type)
          .replace("video/", "")
          .toUpperCase()
      );
    }

    return bits.join(" · ") || "Metadata pendiente";
  }

  function navigateToReview(submissionId) {
    const id = String(submissionId || "").trim();
    if (!id) return;

    const url = new URL(window.location.href);

    url.searchParams.set("ci_entity_type", "submission");
    url.searchParams.set("ci_entity_id", id);
    url.searchParams.delete("ci_reason");
    url.hash = "revision";

    history.pushState(
      {
        ...(history.state || {}),
        pciSection: "revision",
        submissionId: id
      },
      "",
      url
    );

    window.dispatchEvent(new Event("hashchange"));
  }

  function renderLoading() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciDeliveries">
        <div class="ciDeliveriesToolbar">
          <div class="ciDeliveriesToolbar__copy">
            <h2>Entregas</h2>
            <p>Inventario creativo recibido de Creators.</p>
          </div>
        </div>

        <div class="ciDeliveriesLoading">
          <span class="ciLoading__spinner" aria-hidden="true"></span>
          <span>Cargando entregas…</span>
        </div>
      </div>
    `;
  }

  function renderSessionRequired() {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciDeliveriesState">
        <span class="material-symbols-rounded" aria-hidden="true">
          lock
        </span>

        <strong>Sesión PCI requerida</strong>

        <span>
          Volvé a Inicio y conectá la sesión operator del runtime.
        </span>

        <button
          class="ciButton ciButton--secondary"
          type="button"
          data-ci-deliveries-home
        >
          Ir a Inicio
        </button>
      </div>
    `;

    root.querySelector("[data-ci-deliveries-home]")
      ?.addEventListener("click", () => {
        const url = new URL(window.location.href);
        url.hash = "inicio";

        history.pushState(
          { ...(history.state || {}), pciSection: "inicio" },
          "",
          url
        );

        window.dispatchEvent(new Event("hashchange"));
      });
  }

  function renderError(error) {
    const root = stage();
    if (!root) return;

    const message =
      error?.message === "Failed to fetch"
        ? "No pudimos contactar el runtime seguro."
        : "No se pudieron cargar las entregas.";

    root.innerHTML = `
      <div class="ciDeliveriesState">
        <span
          class="material-symbols-rounded ciDeliveriesState__error"
          aria-hidden="true"
        >
          error
        </span>

        <strong>${esc(message)}</strong>

        <span>
          La Control Tower no modificó ningún dato.
        </span>

        <button
          class="ciButton ciButton--secondary"
          type="button"
          data-ci-deliveries-retry
        >
          Reintentar
        </button>
      </div>
    `;

    root.querySelector("[data-ci-deliveries-retry]")
      ?.addEventListener("click", render);
  }

  function renderFilters() {
    return FILTERS.map(([value, label]) => `
      <button
        type="button"
        class="ciDeliveryFilter ${
          state.status === value ? "is-active" : ""
        }"
        data-ci-delivery-filter="${esc(value)}"
      >
        ${esc(label)}
      </button>
    `).join("");
  }

  function renderEmpty() {
    return `
      <div class="ciDeliveriesEmpty">
        <span class="material-symbols-rounded" aria-hidden="true">
          inbox
        </span>

        <div>
          <strong>No hay entregas en este estado</strong>
          <span>
            Probá otro filtro para ampliar el inventario.
          </span>
        </div>
      </div>
    `;
  }

  function renderRow(item) {
    const creator = item?.creator || {};
    const consignment = item?.consignment || {};
    const revision = consignment?.accepted_revision || {};
    const version = item?.current_version || {};

    const title =
      String(item?.concept_label || "").trim() ||
      String(revision?.title || "").trim() ||
      String(version?.original_filename || "").trim() ||
      "Entrega sin título";

    const brief =
      String(revision?.title || "").trim() ||
      "Brief sin título";

    return `
      <button
        type="button"
        class="ciDeliveryRow"
        data-ci-delivery-id="${esc(item?.submission_id || "")}"
        aria-label="Abrir ${esc(title)} en Revisión"
      >
        <div class="ciDeliveryRow__primary">
          <div class="ciDeliveryRow__title">
            ${esc(title)}
          </div>

          <div class="ciDeliveryRow__creator">
            ${esc(creator?.display_name || "Creator")}
            ${
              creator?.email
                ? `<span>· ${esc(creator.email)}</span>`
                : ""
            }
          </div>

          <div class="ciDeliveryRow__brief">
            <span class="material-symbols-rounded" aria-hidden="true">
              assignment
            </span>

            <span>
              ${esc(brief)}
              ${
                revision?.revision_number
                  ? ` · Rev. ${esc(revision.revision_number)}`
                  : ""
              }
            </span>
          </div>
        </div>

        <div class="ciDeliveryRow__version">
          <strong>${esc(currentVersionLabel(version))}</strong>
          <span>${esc(technicalMeta(version))}</span>

          ${
            version?.original_filename
              ? `<small>${esc(version.original_filename)}</small>`
              : ""
          }
        </div>

        <div class="ciDeliveryRow__states">
          <span
            class="ciStatusChip"
            data-tone="${esc(statusTone(item?.status))}"
          >
            ${esc(statusLabel(item?.status))}
          </span>

          ${
            version?.rights_clearance_status
              ? `
                <span
                  class="ciStatusChip"
                  data-tone="${esc(
                    rightsTone(version.rights_clearance_status)
                  )}"
                >
                  ${esc(
                    rightsLabel(version.rights_clearance_status)
                  )}
                </span>
              `
              : `
                <span
                  class="ciStatusChip"
                  data-tone="muted"
                >
                  Rights —
                </span>
              `
          }
        </div>

        <div class="ciDeliveryRow__date">
          <span>Enviada</span>
          <strong>
            ${esc(
              formatDate(
                item?.submitted_at ||
                item?.created_at
              )
            )}
          </strong>
        </div>

        <div class="ciDeliveryRow__open" aria-hidden="true">
          <span class="material-symbols-rounded">
            arrow_forward
          </span>
        </div>
      </button>
    `;
  }

  function renderPagination(data) {
    const total = Number(data?.total || 0);
    const offset = Number(data?.offset || 0);
    const limit = Number(data?.limit || PAGE_SIZE);

    const start = total ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);

    return `
      <div class="ciDeliveriesPagination">
        <span>
          ${start}–${end} de ${total}
        </span>

        <div>
          <button
            type="button"
            class="ciIconButton"
            aria-label="Página anterior"
            data-ci-deliveries-prev
            ${offset <= 0 ? "disabled" : ""}
          >
            <span class="material-symbols-rounded">
              chevron_left
            </span>
          </button>

          <button
            type="button"
            class="ciIconButton"
            aria-label="Página siguiente"
            data-ci-deliveries-next
            ${offset + limit >= total ? "disabled" : ""}
          >
            <span class="material-symbols-rounded">
              chevron_right
            </span>
          </button>
        </div>
      </div>
    `;
  }

  function renderData(data) {
    const root = stage();
    if (!root) return;

    const items = Array.isArray(data?.items)
      ? data.items
      : [];

    root.innerHTML = `
      <div class="ciDeliveries">
        <section class="ciDeliveriesToolbar">
          <div class="ciDeliveriesToolbar__copy">
            <h2>Inventario de entregas</h2>

            <p>
              ${Number(data?.total || 0)} entregas
              ${
                state.status
                  ? ` · ${esc(statusLabel(state.status))}`
                  : " en el workspace"
              }
            </p>
          </div>

          <button
            class="ciPill ciPill--action"
            type="button"
            data-ci-deliveries-refresh
          >
            <span class="material-symbols-rounded" aria-hidden="true">
              refresh
            </span>
            Actualizar
          </button>
        </section>

        <section
          class="ciDeliveryFilters"
          aria-label="Filtrar entregas por estado"
        >
          ${renderFilters()}
        </section>

        <section class="ciDeliveriesList">
          ${
            items.length
              ? items.map(renderRow).join("")
              : renderEmpty()
          }
        </section>

        ${renderPagination(data)}
      </div>
    `;

    bindRenderedActions(data);
  }

  function bindRenderedActions(data) {
    const root = stage();
    if (!root) return;

    root.querySelectorAll("[data-ci-delivery-filter]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const next =
            String(
              button.dataset.ciDeliveryFilter || ""
            ).trim();

          if (next === state.status) return;

          state.status = next;
          state.offset = 0;

          render();
        });
      });

    root.querySelector("[data-ci-deliveries-refresh]")
      ?.addEventListener("click", render);

    root.querySelector("[data-ci-deliveries-prev]")
      ?.addEventListener("click", () => {
        state.offset = Math.max(
          0,
          state.offset - PAGE_SIZE
        );

        render();
      });

    root.querySelector("[data-ci-deliveries-next]")
      ?.addEventListener("click", () => {
        const total = Number(data?.total || 0);

        if (state.offset + PAGE_SIZE >= total) {
          return;
        }

        state.offset += PAGE_SIZE;
        render();
      });

    root.querySelectorAll("[data-ci-delivery-id]")
      .forEach((row) => {
        row.addEventListener("click", () => {
          navigateToReview(
            row.dataset.ciDeliveryId
          );
        });
      });
  }

  async function render() {
    if (!isDeliveries()) return;
    if (state.loading) return;

    const root = stage();
    if (!root) return;

    if (!window.PCIRuntime?.getSubmissions) {
      renderError(
        new Error("Cliente de Entregas no disponible")
      );
      return;
    }

    state.loading = true;
    const seq = ++state.requestSeq;

    renderLoading();

    try {
      const connection =
        await window.PCIRuntime.getConnectionState();

      if (!isDeliveries() || seq !== state.requestSeq) {
        return;
      }

      if (!connection?.signedIn) {
        renderSessionRequired();
        return;
      }

      const data =
        await window.PCIRuntime.getSubmissions({
          status: state.status,
          limit: PAGE_SIZE,
          offset: state.offset
        });

      if (!isDeliveries() || seq !== state.requestSeq) {
        return;
      }

      renderData(data);
    } catch (error) {
      if (!isDeliveries() || seq !== state.requestSeq) {
        return;
      }

      if (
        error?.code === "pci_auth_session_required" ||
        error?.status === 401
      ) {
        renderSessionRequired();
        return;
      }

      renderError(error);
    } finally {
      if (seq === state.requestSeq) {
        state.loading = false;
      }
    }
  }

  if (!window.__pciCreativeInsightsDeliveriesBound) {
    window.__pciCreativeInsightsDeliveriesBound = true;

    window.addEventListener("hashchange", render);

    document.addEventListener(
      "sazzu:page:load",
      render
    );

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
