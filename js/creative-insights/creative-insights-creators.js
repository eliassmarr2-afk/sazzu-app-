(() => {
  "use strict";

  let requestSeq = 0;
  let detailSeq = 0;

  let creators = [];
  let selectedCreatorId = null;
  let currentFilter = "all";
  let searchTerm = "";

  // PCI 2.1H.1B.1B · CREATOR OPERATIONAL EDITOR
  let operationalEditorCreatorId = null;
  let operationalSaving = false;


  function clean(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function operationalLimitLabel(value) {
    const number = Number(value);

    return Number.isSafeInteger(number) &&
      number > 0
      ? String(number)
      : "Sin límite";
  }

  function operationalTagsValue(tags) {
    return (
      Array.isArray(tags)
        ? tags
        : []
    )
      .map((tag) => clean(tag))
      .filter(Boolean)
      .join(", ");
  }

  function operationalEditorMarkup(
    creator,
    relationship,
    counts,
    tags
  ) {
    const creatorId =
      clean(creator?.creator_id);

    const editing =
      operationalEditorCreatorId ===
      creatorId;

    if (!editing) {
      return `
        <div
          class="ciCreatorOperationalHeader"
        >
          <span>
            Perfil operativo
          </span>

          <button
            type="button"
            class="ciCreatorOperationalEdit"
            data-ci-creator-operational-edit="${escapeHtml(
              creatorId
            )}"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              edit
            </span>

            Editar perfil
          </button>
        </div>

        <div
          class="ciCreatorProfileFields"
        >
          ${detailField(
            "Creator ID",
            shortId(creatorId)
          )}

          ${detailField(
            "Estado",
            relationshipMeta(
              relationship?.status
            ).label
          )}

          ${detailField(
            "Tier",
            relationship
              ?.provider_tier ||
            "Sin tier"
          )}

          ${detailField(
            "Negociaciones abiertas",
            String(
              counts
                ?.negotiations_open ||
              0
            )
          )}

          ${detailField(
            "Trabajos simultáneos",
            operationalLimitLabel(
              relationship
                ?.max_simultaneous_jobs
            )
          )}

          ${detailField(
            "Obligaciones abiertas",
            operationalLimitLabel(
              relationship
                ?.max_open_obligations
            )
          )}
        </div>

        ${
          tags.length
            ? `
              <div
                class="ciCreatorTags"
              >
                ${tags.map(
                  (tag) =>
                    pill(
                      tag,
                      "blue"
                    )
                ).join("")}
              </div>
            `
            : `
              <p
                class="ciCreatorOperationalEmpty"
              >
                Sin especialidades configuradas.
              </p>
            `
        }
      `;
    }

    const tier =
      clean(
        relationship?.provider_tier
      ).toLowerCase();

    return `
      <div
        class="ciCreatorOperationalHeader"
      >
        <div>
          <span>
            Perfil operativo
          </span>

          <small>
            Configuración de trabajo
          </small>
        </div>
      </div>

      <div
        class="ciCreatorOperationalForm"
        data-ci-creator-operational-form
        data-ci-creator-operational-id="${escapeHtml(
          creatorId
        )}"
      >
        <label
          class="ciCreatorOperationalField"
        >
          <span>
            Tier
          </span>

          <select
            data-ci-creator-operational-tier
            ${operationalSaving
              ? "disabled"
              : ""}
          >
            <option
              value=""
              ${!tier
                ? "selected"
                : ""}
            >
              Sin tier
            </option>

            <option
              value="approved"
              ${tier === "approved"
                ? "selected"
                : ""}
            >
              Approved
            </option>

            <option
              value="preferred"
              ${tier === "preferred"
                ? "selected"
                : ""}
            >
              Preferred
            </option>
          </select>
        </label>

        <label
          class="
            ciCreatorOperationalField
            is-wide
          "
        >
          <span>
            Especialidades
          </span>

          <input
            type="text"
            maxlength="1219"
            data-ci-creator-operational-tags
            value="${escapeHtml(
              operationalTagsValue(
                tags
              )
            )}"
            placeholder="UGC, mascotas, gaming…"
            ${operationalSaving
              ? "disabled"
              : ""}
          />

          <small>
            Separadas por coma · máximo 20
          </small>
        </label>

        <label
          class="ciCreatorOperationalField"
        >
          <span>
            Trabajos simultáneos
          </span>

          <input
            type="number"
            min="1"
            step="1"
            data-ci-creator-operational-jobs
            value="${escapeHtml(
              relationship
                ?.max_simultaneous_jobs ??
              ""
            )}"
            placeholder="Sin límite"
            ${operationalSaving
              ? "disabled"
              : ""}
          />
        </label>

        <label
          class="ciCreatorOperationalField"
        >
          <span>
            Obligaciones abiertas
          </span>

          <input
            type="number"
            min="1"
            step="1"
            data-ci-creator-operational-obligations
            value="${escapeHtml(
              relationship
                ?.max_open_obligations ??
              ""
            )}"
            placeholder="Sin límite"
            ${operationalSaving
              ? "disabled"
              : ""}
          />
        </label>

        <div
          class="ciCreatorOperationalFeedback"
          data-ci-creator-operational-feedback
          role="status"
          aria-live="polite"
        ></div>

        <div
          class="ciCreatorOperationalActions"
        >
          <button
            type="button"
            class="ciCreatorOperationalCancel"
            data-ci-creator-operational-cancel="${escapeHtml(
              creatorId
            )}"
            ${operationalSaving
              ? "disabled"
              : ""}
          >
            Cancelar
          </button>

          <button
            type="button"
            class="ciCreatorOperationalSave"
            data-ci-creator-operational-save="${escapeHtml(
              creatorId
            )}"
            ${operationalSaving
              ? "disabled"
              : ""}
          >
            ${
              operationalSaving
                ? `
                  <span
                    class="material-symbols-rounded"
                    aria-hidden="true"
                  >
                    progress_activity
                  </span>

                  Guardando…
                `
                : `
                  <span
                    class="material-symbols-rounded"
                    aria-hidden="true"
                  >
                    save
                  </span>

                  Guardar cambios
                `
            }
          </button>
        </div>
      </div>
    `;
  }

  function parseOperationalLimit(value) {
    const raw =
      clean(value);

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    if (
      !Number.isSafeInteger(number) ||
      number <= 0
    ) {
      return false;
    }

    return number;
  }

  function operationalTagsFromInput(value) {
    const seen =
      new Set();

    const tags = [];

    String(value || "")
      .split(",")
      .map((tag) => clean(tag))
      .filter(Boolean)
      .forEach((tag) => {
        const key =
          tag.toLowerCase();

        if (seen.has(key)) {
          return;
        }

        seen.add(key);
        tags.push(tag);
      });

    return tags;
  }

  function operationalFeedback(
    form,
    message,
    tone = ""
  ) {
    const target =
      form?.querySelector(
        "[data-ci-creator-operational-feedback]"
      );

    if (!target) return;

    target.textContent =
      message || "";

    target.classList.toggle(
      "is-error",
      tone === "error"
    );

    target.classList.toggle(
      "is-success",
      tone === "success"
    );
  }

  async function saveOperationalProfile(
    creatorId
  ) {
    if (operationalSaving) {
      return;
    }

    const id =
      clean(creatorId);

    const form =
      stage()?.querySelector(
        `[data-ci-creator-operational-form][data-ci-creator-operational-id="${CSS.escape(
          id
        )}"]`
      );

    if (!id || !form) {
      return;
    }

    const tier =
      clean(
        form.querySelector(
          "[data-ci-creator-operational-tier]"
        )?.value
      ).toLowerCase();

    const tags =
      operationalTagsFromInput(
        form.querySelector(
          "[data-ci-creator-operational-tags]"
        )?.value
      );

    const jobs =
      parseOperationalLimit(
        form.querySelector(
          "[data-ci-creator-operational-jobs]"
        )?.value
      );

    const obligations =
      parseOperationalLimit(
        form.querySelector(
          "[data-ci-creator-operational-obligations]"
        )?.value
      );

    if (
      tier &&
      ![
        "approved",
        "preferred"
      ].includes(tier)
    ) {
      operationalFeedback(
        form,
        "El tier seleccionado no es válido.",
        "error"
      );

      return;
    }

    if (
      tags.length > 20 ||
      tags.some(
        (tag) =>
          tag.length > 60
      )
    ) {
      operationalFeedback(
        form,
        "Usá hasta 20 especialidades de 60 caracteres como máximo.",
        "error"
      );

      return;
    }

    if (
      jobs === false ||
      obligations === false
    ) {
      operationalFeedback(
        form,
        "Los límites deben ser números enteros mayores a cero o quedar vacíos.",
        "error"
      );

      return;
    }

    operationalSaving = true;

    operationalFeedback(
      form,
      "Guardando cambios…"
    );

    form
      .querySelectorAll(
        "input,select,button"
      )
      .forEach(
        (control) => {
          control.disabled = true;
        }
      );

    try {
      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      const workspace =
        workspaceFrom(
          connection
        );

      if (!workspace) {
        throw new Error(
          "workspace_no_resuelto"
        );
      }

      const idempotencyKey =
        crypto.randomUUID();

      await window
        .PCIRuntime
        .request(
          `/v1/workspaces/${
            encodeURIComponent(
              workspace
            )
          }/creators/${
            encodeURIComponent(id)
          }/operational-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "Idempotency-Key":
                idempotencyKey
            },
            body: JSON.stringify({
              provider_tier:
                tier || null,
              specialty_tags:
                tags,
              max_simultaneous_jobs:
                jobs,
              max_open_obligations:
                obligations
            })
          }
        );

      operationalEditorCreatorId =
        null;

      operationalSaving = false;

      await render();

    } catch (error) {
      operationalSaving = false;

      form
        .querySelectorAll(
          "input,select,button"
        )
        .forEach(
          (control) => {
            control.disabled = false;
          }
        );

      operationalFeedback(
        form,
        "No pudimos guardar los cambios. El perfil no fue modificado.",
        "error"
      );

      console.error(
        "[PCI Creators] operational profile update failed",
        error
      );
    }
  }

  function isCreators() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "creadores";
  }

  function stage() {
    return document.querySelector(
      ".ciStage"
    );
  }

  function workspaceFrom(connection) {
    return clean(
      connection?.workspace ||
      connection?.workspaceId ||
      connection?.workspace_id
    );
  }

  function requestedCreatorId() {
    const params =
      new URLSearchParams(
        location.search
      );

    if (
      params.get("ci_entity_type") !==
      "creator"
    ) {
      return "";
    }

    return clean(
      params.get("ci_entity_id")
    );
  }

  function writeCreatorToUrl(id) {
    const url =
      new URL(location.href);

    if (id) {
      url.searchParams.set(
        "ci_entity_type",
        "creator"
      );

      url.searchParams.set(
        "ci_entity_id",
        id
      );
    } else {
      url.searchParams.delete(
        "ci_entity_type"
      );

      url.searchParams.delete(
        "ci_entity_id"
      );
    }

    url.hash = "creadores";

    history.replaceState(
      {
        ...(history.state || {}),
        pciCreatorId:
          id || null
      },
      "",
      url
    );
  }

  function navigateEntity(
    type,
    id,
    section
  ) {
    const url =
      new URL(location.href);

    url.searchParams.set(
      "ci_entity_type",
      type
    );

    url.searchParams.set(
      "ci_entity_id",
      id
    );

    url.hash = section;

    location.href =
      url.toString();
  }

  function formatMoney(
    amount,
    currency = "ARS"
  ) {
    const number =
      Number(amount);

    if (!Number.isFinite(number)) {
      return "—";
    }

    try {
      return new Intl.NumberFormat(
        "es-AR",
        {
          style: "currency",
          currency:
            clean(currency)
              .toUpperCase() ||
            "ARS",
          maximumFractionDigits: 0
        }
      ).format(number);
    } catch {
      return `${currency} ${number}`;
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  }

  function shortId(value) {
    const id =
      clean(value);

    return id
      ? id.slice(0, 8)
      : "—";
  }

  function relationshipMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      active: {
        label: "Activo",
        tone: "green"
      },
      invited: {
        label: "Invitado",
        tone: "violet"
      },
      restricted: {
        label: "Restringido",
        tone: "violet"
      },
      suspended: {
        label: "Suspendido",
        tone: "red"
      },
      closed: {
        label: "Cerrado",
        tone: "gray"
      }
    };

    return (
      map[status] || {
        label:
          status || "—",
        tone: "gray"
      }
    );
  }

  function submissionMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      submitted: "Entregada",
      under_review: "En revisión",
      changes_requested:
        "Cambios solicitados",
      preselected:
        "Preseleccionada",
      rejected: "Rechazada",
      withdrawn: "Retirada",
      acquired: "Adquirida",
      draft: "Borrador"
    };

    return (
      map[status] ||
      status.replaceAll("_", " ") ||
      "—"
    );
  }

  function purchaseMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      agreed: "Acordada",
      settled: "Liquidada",
      rescinded: "Rescindida"
    };

    return (
      map[status] ||
      status ||
      "—"
    );
  }

  function payableMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      awaiting_confirmation:
        "Esperando destino",
      ready_to_pay:
        "Lista para pagar",
      processing:
        "En transferencia",
      paid:
        "Pagada",
      void:
        "Anulada"
    };

    return (
      map[status] ||
      status.replaceAll("_", " ") ||
      "—"
    );
  }

  function pill(
    label,
    tone = "gray"
  ) {
    return `
      <span
        class="
          ciCreatorPill
          is-${escapeHtml(tone)}
        "
      >
        ${escapeHtml(label)}
      </span>
    `;
  }

  function visibleCreators() {
    const query =
      searchTerm
        .trim()
        .toLowerCase();

    return creators.filter(
      (creator) => {
        const relationshipStatus =
          clean(
            creator
              ?.relationship
              ?.status
          ).toLowerCase();

        if (
          currentFilter !== "all" &&
          relationshipStatus !==
            currentFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const tags =
          Array.isArray(
            creator
              ?.relationship
              ?.specialty_tags
          )
            ? creator
                .relationship
                .specialty_tags
            : [];

        const haystack = [
          creator?.display_name,
          creator?.legal_name,
          creator?.email,
          creator?.phone,
          creator?.creator_status,
          relationshipStatus,
          creator
            ?.relationship
            ?.provider_tier,
          ...tags
        ]
          .map(
            (value) =>
              clean(value)
                .toLowerCase()
          )
          .join(" ");

        return haystack.includes(
          query
        );
      }
    );
  }

  function metricCard(
    icon,
    value,
    label,
    hint,
    tone = ""
  ) {
    return `
      <article
        class="
          ciCreatorMetric
          ${tone ? `is-${tone}` : ""}
        "
      >
        <div
          class="ciCreatorMetric__icon"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            ${escapeHtml(icon)}
          </span>
        </div>

        <strong>
          ${escapeHtml(value)}
        </strong>

        <span>
          ${escapeHtml(label)}
        </span>

        <small>
          ${escapeHtml(hint)}
        </small>
      </article>
    `;
  }

  function metricsMarkup() {
    const active =
      creators.filter(
        (item) =>
          clean(
            item
              ?.relationship
              ?.status
          ).toLowerCase() ===
          "active"
      ).length;

    const invited =
      creators.filter(
        (item) =>
          clean(
            item
              ?.relationship
              ?.status
          ).toLowerCase() ===
          "invited"
      ).length;

    const purchases =
      creators.reduce(
        (sum, item) =>
          sum +
          (
            Number(
              item?.counts?.purchases
            ) || 0
          ),
        0
      );

    const paid =
      creators.reduce(
        (sum, item) =>
          sum +
          (
            Number(
              item
                ?.financial
                ?.paid_amount
            ) || 0
          ),
        0
      );

    return `
      <div
        class="ciCreatorMetrics"
      >
        ${metricCard(
          "groups",
          String(creators.length),
          "Creators",
          "Relaciones del workspace"
        )}

        ${metricCard(
          "person_check",
          String(active),
          "Activos",
          "Habilitados para operar",
          "green"
        )}

        ${metricCard(
          "person_add",
          String(invited),
          "Invitados",
          "Onboarding pendiente",
          "violet"
        )}

        ${metricCard(
          "payments",
          formatMoney(
            paid,
            "ARS"
          ),
          "Pagado",
          `${purchases} compras registradas`,
          "blue"
        )}
      </div>
    `;
  }

  function filterButton(
    value,
    label
  ) {
    const active =
      currentFilter === value;

    return `
      <button
        type="button"
        class="
          ciCreatorFilter
          ${active ? "is-active" : ""}
        "
        data-ci-creator-filter="${escapeHtml(
          value
        )}"
        aria-pressed="${
          active
            ? "true"
            : "false"
        }"
      >
        ${escapeHtml(label)}
      </button>
    `;
  }

  function creatorRow(creator) {
    const id =
      clean(
        creator?.creator_id
      );

    const relationship =
      creator?.relationship || {};

    const counts =
      creator?.counts || {};

    const financial =
      creator?.financial || {};

    const selected =
      id ===
      selectedCreatorId;

    const meta =
      relationshipMeta(
        relationship?.status
      );

    const applicationView =
      creatorApplicationView(
        creator
      );

    return `
      <button
        type="button"
        class="
          ciCreatorRow
          ${selected ? "is-selected" : ""}
          ${
            applicationView?.state === "pending"
              ? "is-application-pending"
              : ""
          }
          ${
            applicationView?.state === "approved"
              ? "is-application-approved"
              : ""
          }
        "
        data-ci-creator-id="${escapeHtml(id)}"
        aria-pressed="${
          selected
            ? "true"
            : "false"
        }"
      >
        <div
          class="ciCreatorRow__top"
        >
          <div>
            <strong>
              ${escapeHtml(
                creator?.display_name ||
                "Creator"
              )}
            </strong>

            <span>
              ${escapeHtml(
                creator?.email || ""
              )}
            </span>
          </div>

          ${pill(
            applicationView?.label ||
              meta.label,
            applicationView?.tone ||
              meta.tone
          )}
        </div>

        <div
          class="ciCreatorRow__stats"
        >
          <span>
            ${escapeHtml(
              counts?.submissions || 0
            )}
            entregas
          </span>

          <span>
            ${escapeHtml(
              counts?.purchases || 0
            )}
            compras
          </span>

          <span>
            ${escapeHtml(
              formatMoney(
                financial?.paid_amount,
                "ARS"
              )
            )}
            pagados
          </span>
        </div>
      </button>
    `;
  }

  /* PCI 2.1T.3 · CREATOR APPLICATION ADMIN UI V4 */

  const creatorApplicationCache =
    new Map();

  const creatorApplicationLoading =
    new Set();

  function isSelfServicePendingCreator(
    value
  ) {
    return (
      clean(
        value?.profile_metadata
          ?.registration_source ||
        value?.creator
          ?.profile_metadata
          ?.registration_source
      ).toLowerCase() ===
        "self_service" &&
      clean(
        value?.relationship?.status
      ).toLowerCase() ===
        "pending"
    );
  }

  function creatorApplicationContext(
    value
  ) {
    const creatorId =
      clean(
        value?.creator_id ||
        value?.creator?.creator_id
      );

    return (
      value?.application_context ||
      (
        creatorId
          ? creatorApplicationCache.get(
              creatorId
            )
          : null
      ) ||
      null
    );
  }

  function creatorApplicationView(
    value
  ) {
    if (
      !isSelfServicePendingCreator(
        value
      )
    ) {
      return null;
    }

    const context =
      creatorApplicationContext(
        value
      );

    const decision =
      clean(
        context
          ?.relationship
          ?.application_review_decision
      ).toLowerCase();

    if (
      decision === "approved"
    ) {
      return {
        state: "approved",
        label:
          "Aprobado · esperando condiciones",
        tone: "blue"
      };
    }

    return {
      state: "pending",
      label:
        "Pendiente de aceptación",
      tone: "aqua"
    };
  }

  async function fetchCreatorApplicationContext(
    creatorId,
    workspace
  ) {
    const id =
      clean(
        creatorId
      );

    if (!id) {
      return null;
    }

    const cached =
      creatorApplicationCache.get(
        id
      );

    if (cached) {
      return cached;
    }

    if (
      creatorApplicationLoading.has(
        id
      )
    ) {
      return null;
    }

    creatorApplicationLoading.add(
      id
    );

    try {
      const result =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/creators/${
              encodeURIComponent(id)
            }/application`,
            {
              method: "GET"
            }
          );

      creatorApplicationCache.set(
        id,
        result
      );

      return result;

    } finally {
      creatorApplicationLoading.delete(
        id
      );
    }
  }

  async function hydrateVisibleCreatorApplications() {
    const candidates =
      visibleCreators()
        .filter(
          isSelfServicePendingCreator
        )
        .filter(
          (creator) => {
            const id =
              clean(
                creator?.creator_id
              );

            return (
              id &&
              !creatorApplicationCache
                .has(id) &&
              !creatorApplicationLoading
                .has(id)
            );
          }
        );

    if (!candidates.length) {
      return;
    }

    try {
      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      const workspace =
        workspaceFrom(
          connection
        );

      if (!workspace) {
        return;
      }

      await Promise.all(
        candidates.map(
          (creator) =>
            fetchCreatorApplicationContext(
              creator?.creator_id,
              workspace
            ).catch(
              (error) => {
                console.warn(
                  "[PCI Creators] application context unavailable",
                  {
                    creatorId:
                      creator?.creator_id,
                    code:
                      error?.code ||
                      error?.message ||
                      "unknown"
                  }
                );
              }
            )
        )
      );

      renderRows();

    } catch (error) {
      console.warn(
        "[PCI Creators] application hydration failed",
        error
      );
    }
  }

  function creatorApplicationActionsMarkup(
    detail
  ) {
    const view =
      creatorApplicationView(
        detail
      );

    if (!view) {
      return "";
    }

    if (
      view.state === "approved"
    ) {
      return `
        <div
          class="
            ciCreatorApplicationState
            is-approved
          "
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            verified
          </span>

          <span>
            Aprobado · esperando
            condiciones
          </span>
        </div>
      `;
    }

    const creatorId =
      clean(
        detail?.creator?.creator_id
      );

    return `
      <div
        class="ciCreatorApplicationActions"
        data-ci-creator-application-actions
      >
        <div
          class="
            ciCreatorApplicationActions__buttons
          "
        >
          <button
            type="button"
            class="
              ciCreatorApplicationButton
              is-primary
            "
            data-ci-creator-application-decision="approved"
            data-ci-creator-id="${escapeHtml(
              creatorId
            )}"
          >
            Aceptar
          </button>

          <button
            type="button"
            class="
              ciCreatorApplicationButton
              is-secondary
            "
            data-ci-creator-application-decision="rejected"
            data-ci-creator-id="${escapeHtml(
              creatorId
            )}"
          >
            Rechazar
          </button>
        </div>

        <span
          class="
            ciCreatorApplicationActions__feedback
          "
          data-ci-creator-application-feedback
          aria-live="polite"
        ></span>
      </div>
    `;
  }

  function rowsMarkup() {
    const items =
      visibleCreators();

    if (!items.length) {
      return `
        <div
          class="ciCreatorEmpty"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            person_search
          </span>

          <strong>
            Sin Creators
          </strong>

          <span>
            No hay resultados para
            este filtro.
          </span>
        </div>
      `;
    }

    return items
      .map(creatorRow)
      .join("");
  }

  function renderRows() {
    const root = stage();

    if (!root) return;

    const rows =
      root.querySelector(
        "[data-ci-creator-rows]"
      );

    if (rows) {
      rows.innerHTML =
        rowsMarkup();
    }

    const count =
      root.querySelector(
        "[data-ci-creator-count]"
      );

    if (count) {
      count.textContent =
        `${visibleCreators().length} de ${creators.length}`;
    }

    void hydrateVisibleCreatorApplications();
  }

  function shellMarkup() {
    return `
      <section
        class="ciCreatorsView"
        aria-label="Creadores"
      >
        <div
          class="ciCreatorsToolbar"
        >
          <label
            class="ciCreatorSearch"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              search
            </span>

            <input
              type="search"
              autocomplete="off"
              placeholder="Buscar Creator, email o especialidad"
              value="${escapeHtml(
                searchTerm
              )}"
              data-ci-creator-search
            />
          </label>

          <button
            type="button"
            class="ciCreatorRefresh"
            data-ci-creator-refresh
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              refresh
            </span>

            Actualizar
          </button>
        </div>

        <div
          class="ciCreatorFilters"
        >
          ${filterButton(
            "all",
            "Todos"
          )}

          ${filterButton(
            "active",
            "Activos"
          )}

          ${filterButton(
            "invited",
            "Invitados"
          )}

          ${filterButton(
            "restricted",
            "Restringidos"
          )}

          ${filterButton(
            "suspended",
            "Suspendidos"
          )}
        </div>

        ${metricsMarkup()}

        <div
          class="ciCreatorsWorkspace"
        >
          <section
            class="ciCreatorList"
          >
            <header
              class="ciCreatorList__header"
            >
              <div>
                <strong>
                  Red de Creators
                </strong>

                <span>
                  Relación operativa
                </span>
              </div>

              <div
                class="ciCreatorList__headerActions"
              >
                <span
                  data-ci-creator-count
                >
                  ${visibleCreators().length}
                  de
                  ${creators.length}
                </span>

                <button
                  type="button"
                  class="ciCreatorInviteButton"
                  data-ci-creator-invite
                >
                  <span
                    class="material-symbols-rounded"
                    aria-hidden="true"
                  >
                    person_add
                  </span>

                  Invitar Creator
                </button>
              </div>
            </header>

            <div
              class="ciCreatorList__rows"
              data-ci-creator-rows
            >
              ${rowsMarkup()}
            </div>
          </section>

          <section
            class="ciCreatorDetail"
            data-ci-creator-detail
          >
            <div
              class="ciCreatorDetailEmpty"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                badge
              </span>

              <strong>
                Seleccioná un Creator
              </strong>

              <span>
                Acá vas a ver su relación,
                trabajo y trazabilidad comercial.
              </span>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function detailField(
    label,
    value
  ) {
    return `
      <div
        class="ciCreatorDetailField"
      >
        <span>
          ${escapeHtml(label)}
        </span>

        <strong>
          ${escapeHtml(
            value || "—"
          )}
        </strong>
      </div>
    `;
  }

  function miniStat(
    value,
    label
  ) {
    return `
      <div
        class="ciCreatorMiniStat"
      >
        <strong>
          ${escapeHtml(value)}
        </strong>

        <span>
          ${escapeHtml(label)}
        </span>
      </div>
    `;
  }

  function submissionsMarkup(detail) {
    const items =
      Array.isArray(
        detail?.submissions
      )
        ? detail.submissions
        : [];

    if (!items.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin entregas todavía.
        </div>
      `;
    }

    return items
      .slice(0, 8)
      .map((item) => `
        <div
          class="ciCreatorWorkRow"
        >
          <div>
            <strong>
              ${escapeHtml(
                item?.concept_label ||
                item
                  ?.consignment
                  ?.title ||
                "Entrega"
              )}
            </strong>

            <span>
              ${escapeHtml(
                item
                  ?.consignment
                  ?.title ||
                "Consigna"
              )}
              ·
              ${escapeHtml(
                formatDate(
                  item?.submitted_at ||
                  item?.created_at
                )
              )}
            </span>
          </div>

          ${pill(
            submissionMeta(
              item?.status
            ),
            clean(
              item?.status
            ) === "acquired"
              ? "green"
              : "gray"
          )}
        </div>
      `)
      .join("");
  }

  function negotiationsMarkup(detail) {
    const items =
      Array.isArray(
        detail?.negotiations
      )
        ? detail.negotiations
        : [];

    if (!items.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin negociaciones.
        </div>
      `;
    }

    return items
      .slice(0, 6)
      .map((item) => `
        <button
          type="button"
          class="ciCreatorEntityRow"
          data-ci-creator-open-negotiation="${escapeHtml(
            item?.negotiation_id
          )}"
        >
          <div>
            <strong>
              Negociación
              ${escapeHtml(
                shortId(
                  item?.negotiation_id
                )
              )}
            </strong>

            <span>
              ${escapeHtml(
                formatDate(
                  item?.updated_at ||
                  item?.opened_at
                )
              )}
            </span>
          </div>

          <div
            class="ciCreatorEntityRow__end"
          >
            ${pill(
              clean(
                item?.status
              ) === "open"
                ? "Abierta"
                : "Cerrada",
              clean(
                item?.status
              ) === "open"
                ? "blue"
                : "gray"
            )}

            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              chevron_right
            </span>
          </div>
        </button>
      `)
      .join("");
  }

  function purchasesMarkup(detail) {
    const items =
      Array.isArray(
        detail?.purchases
      )
        ? detail.purchases
        : [];

    if (!items.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin compras.
        </div>
      `;
    }

    return items
      .slice(0, 6)
      .map((item) => `
        <button
          type="button"
          class="ciCreatorEntityRow"
          data-ci-creator-open-purchase="${escapeHtml(
            item?.purchase_id
          )}"
        >
          <div>
            <strong>
              ${escapeHtml(
                formatMoney(
                  item?.total_amount,
                  item?.currency
                )
              )}
            </strong>

            <span>
              Compra
              ${escapeHtml(
                shortId(
                  item?.purchase_id
                )
              )}
              ·
              ${escapeHtml(
                formatDate(
                  item?.agreed_at
                )
              )}
            </span>
          </div>

          <div
            class="ciCreatorEntityRow__end"
          >
            ${pill(
              purchaseMeta(
                item?.status
              ),
              clean(
                item?.status
              ) === "settled"
                ? "green"
                : "violet"
            )}

            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              chevron_right
            </span>
          </div>
        </button>
      `)
      .join("");
  }

  function latestPaymentDestination(
    detail
  ) {
    const payables =
      Array.isArray(
        detail?.payables
      )
        ? detail.payables
        : [];

    const payable =
      payables.find(
        (item) =>
          item?.payment_destination
      );

    return (
      payable
        ?.payment_destination ||
      null
    );
  }

  function paymentMarkup(detail) {
    const payables =
      Array.isArray(
        detail?.payables
      )
        ? detail.payables
        : [];

    if (!payables.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin obligaciones de pago.
        </div>
      `;
    }

    return payables
      .slice(0, 5)
      .map((item) => `
        <div
          class="ciCreatorPaymentRow"
        >
          <div>
            <strong>
              ${escapeHtml(
                formatMoney(
                  item?.amount_due,
                  item?.currency
                )
              )}
            </strong>

            <span>
              ${escapeHtml(
                formatDate(
                  item?.created_at
                )
              )}
            </span>
          </div>

          ${pill(
            payableMeta(
              item?.status
            ),
            clean(
              item?.status
            ) === "paid"
              ? "green"
              : "violet"
          )}
        </div>
      `)
      .join("");
  }

  function invitationsMarkup(detail) {
    const items =
      Array.isArray(
        detail?.invitations
      )
        ? detail.invitations
        : [];

    if (!items.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin invitaciones registradas.
        </div>
      `;
    }

    return items
      .slice(0, 4)
      .map((item) => `
        <div
          class="ciCreatorInvitationRow"
        >
          <div>
            <strong>
              ${escapeHtml(
                item?.email_snapshot ||
                "Invitación"
              )}
            </strong>

            <span>
              ${escapeHtml(
                formatDate(
                  item?.created_at
                )
              )}
              ${
                item?.delivery_method
                  ? ` · ${escapeHtml(
                      item.delivery_method
                    )}`
                  : ""
              }
            </span>
          </div>

          ${pill(
            clean(
              item?.status
            ) === "accepted"
              ? "Aceptada"
              : clean(
                  item?.status
                ) === "pending"
                  ? "Pendiente"
                  : item?.status,
            clean(
              item?.status
            ) === "accepted"
              ? "green"
              : clean(
                  item?.status
                ) === "pending"
                  ? "violet"
                  : "gray"
          )}
        </div>
      `)
      .join("");
  }


  function invitationEffectiveStatus(
    item
  ) {
    const status =
      clean(
        item?.status
      ).toLowerCase();

    if (
      status === "pending" &&
      item?.expires_at
    ) {
      const expires =
        new Date(
          item.expires_at
        ).getTime();

      if (
        Number.isFinite(expires) &&
        expires <= Date.now()
      ) {
        return "expired";
      }
    }

    return status;
  }

  function invitationStatusView(
    item
  ) {
    const status =
      invitationEffectiveStatus(
        item
      );

    const map = {
      pending: {
        label: "Pendiente",
        tone: "violet"
      },
      accepted: {
        label: "Aceptada",
        tone: "green"
      },
      expired: {
        label: "Expirada",
        tone: "gray"
      },
      revoked: {
        label: "Revocada",
        tone: "gray"
      }
    };

    return (
      map[status] || {
        label:
          status || "Sin estado",
        tone: "gray"
      }
    );
  }

  function onboardingMarkup(
    detail
  ) {
    const invitations =
      Array.isArray(
        detail?.invitations
      )
        ? detail.invitations
        : [];

    const relationshipStatus =
      clean(
        detail?.relationship?.status
      ).toLowerCase();

    const active =
      invitations.find(
        (item) =>
          invitationEffectiveStatus(
            item
          ) === "pending"
      ) || null;

    const latest =
      invitations[0] || null;

    let primary = "";

    if (active) {
      const meta =
        invitationStatusView(
          active
        );

      primary = `
        <div
          class="ciCreatorOnboarding"
        >
          <div
            class="ciCreatorOnboarding__top"
          >
            <div>
              <strong>
                Invitación pendiente
              </strong>

              <span>
                ${escapeHtml(
                  active?.email_snapshot ||
                  detail?.creator?.email ||
                  "—"
                )}
              </span>
            </div>

            ${pill(
              meta.label,
              meta.tone
            )}
          </div>

          <div
            class="ciCreatorOnboarding__facts"
          >
            <div>
              <span>
                Enviada
              </span>

              <strong>
                ${escapeHtml(
                  formatDate(
                    active?.delivered_at ||
                    active?.created_at
                  )
                )}
              </strong>
            </div>

            <div>
              <span>
                Vence
              </span>

              <strong>
                ${escapeHtml(
                  formatDate(
                    active?.expires_at
                  )
                )}
              </strong>
            </div>
          </div>

          ${
            relationshipStatus ===
            "invited"
              ? `
                <div
                  class="ciCreatorOnboarding__actions"
                >
                  <button
                    type="button"
                    class="ciCreatorOnboardingAction"
                    data-ci-creator-invitation-resend="${escapeHtml(
                      active?.invitation_id
                    )}"
                  >
                    Reenviar invitación
                  </button>

                  <button
                    type="button"
                    class="ciCreatorOnboardingAction is-danger"
                    data-ci-creator-invitation-revoke="${escapeHtml(
                      active?.invitation_id
                    )}"
                  >
                    Revocar
                  </button>
                </div>
              `
              : ""
          }
        </div>
      `;

    } else if (
      invitationEffectiveStatus(
        latest
      ) === "accepted"
    ) {
      primary = `
        <div
          class="ciCreatorOnboarding"
        >
          <div
            class="ciCreatorOnboarding__top"
          >
            <div>
              <strong>
                Acceso aceptado
              </strong>

              <span>
                ${escapeHtml(
                  latest?.email_snapshot ||
                  detail?.creator?.email ||
                  "—"
                )}
              </span>
            </div>

            ${pill(
              "Aceptada",
              "green"
            )}
          </div>

          <p
            class="ciCreatorOnboarding__message"
          >
            El Creator ya utilizó
            la invitación de acceso.
          </p>
        </div>
      `;

    } else if (
      relationshipStatus === "invited"
    ) {
      const latestMeta =
        latest
          ? invitationStatusView(
              latest
            )
          : null;

      primary = `
        <div
          class="ciCreatorOnboarding"
        >
          <div
            class="ciCreatorOnboarding__top"
          >
            <div>
              <strong>
                Sin invitación activa
              </strong>

              <span>
                La relación continúa
                como Invitado.
              </span>
            </div>

            ${
              latestMeta
                ? pill(
                    latestMeta.label,
                    latestMeta.tone
                  )
                : ""
            }
          </div>

          <div
            class="ciCreatorOnboarding__actions"
          >
            <button
              type="button"
              class="ciCreatorOnboardingAction"
              data-ci-creator-invitation-new
            >
              Enviar nueva invitación
            </button>
          </div>
        </div>
      `;

    } else {
      primary = `
        <div
          class="ciCreatorSectionEmpty"
        >
          No hay acciones de onboarding
          pendientes para esta relación.
        </div>
      `;
    }

    if (!invitations.length) {
      return primary;
    }

    return `
      ${primary}

      <div
        class="ciCreatorOnboardingHistory"
      >
        <span>
          Historial de invitaciones
        </span>

        ${invitationsMarkup(detail)}
      </div>
    `;
  }

  function timelineItems(detail) {
    const entries = [];

    (
      Array.isArray(
        detail?.submissions
      )
        ? detail.submissions
        : []
    ).forEach((item) => {
      entries.push({
        at:
          item?.acquired_at ||
          item?.submitted_at ||
          item?.created_at,
        icon:
          item?.status === "acquired"
            ? "video_library"
            : "upload_file",
        title:
          item?.status === "acquired"
            ? "Entrega adquirida"
            : "Entrega creada",
        description:
          item?.concept_label ||
          item
            ?.consignment
            ?.title ||
          "Submission"
      });
    });

    (
      Array.isArray(
        detail?.purchases
      )
        ? detail.purchases
        : []
    ).forEach((item) => {
      entries.push({
        at:
          item?.settled_at ||
          item?.agreed_at ||
          item?.created_at,
        icon:
          item?.status === "settled"
            ? "task_alt"
            : "handshake",
        title:
          item?.status === "settled"
            ? "Compra liquidada"
            : "Compra acordada",
        description:
          formatMoney(
            item?.total_amount,
            item?.currency
          )
      });
    });

    (
      Array.isArray(
        detail?.payouts
      )
        ? detail.payouts
        : []
    ).forEach((item) => {
      entries.push({
        at:
          item?.confirmed_at ||
          item?.created_at,
        icon: "payments",
        title:
          item?.status === "confirmed"
            ? "Pago confirmado"
            : "Movimiento de pago",
        description:
          formatMoney(
            item?.amount,
            item?.currency
          )
      });
    });

    (
      Array.isArray(
        detail?.invitations
      )
        ? detail.invitations
        : []
    ).forEach((item) => {
      entries.push({
        at:
          item?.accepted_at ||
          item?.created_at,
        icon: "person_add",
        title:
          item?.status === "accepted"
            ? "Invitación aceptada"
            : "Invitación creada",
        description:
          item?.email_snapshot ||
          ""
      });
    });

    return entries
      .filter(
        (item) => item.at
      )
      .sort(
        (a, b) =>
          new Date(b.at) -
          new Date(a.at)
      )
      .slice(0, 12);
  }

  function timelineMarkup(detail) {
    const items =
      timelineItems(detail);

    if (!items.length) {
      return `
        <div
          class="ciCreatorSectionEmpty"
        >
          Sin actividad registrada.
        </div>
      `;
    }

    return items
      .map((item) => `
        <div
          class="ciCreatorTimelineRow"
        >
          <div
            class="ciCreatorTimelineRow__icon"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              ${escapeHtml(
                item.icon
              )}
            </span>
          </div>

          <div>
            <strong>
              ${escapeHtml(
                item.title
              )}
            </strong>

            <span>
              ${escapeHtml(
                item.description
              )}
            </span>
          </div>

          <time>
            ${escapeHtml(
              formatDate(item.at)
            )}
          </time>
        </div>
      `)
      .join("");
  }

  function section(
    eyebrow,
    title,
    body
  ) {
    return `
      <section
        class="ciCreatorDetailSection"
      >
        <header>
          <span>
            ${escapeHtml(eyebrow)}
          </span>

          <h3>
            ${escapeHtml(title)}
          </h3>
        </header>

        <div>
          ${body}
        </div>
      </section>
    `;
  }

  function detailMarkup(detail) {
    const creator =
      detail?.creator || {};

    const relationship =
      detail?.relationship || {};

    const counts =
      detail?.counts || {};

    const financial =
      detail?.financial || {};

    const relationshipState =
      relationshipMeta(
        relationship?.status
      );

    const destination =
      latestPaymentDestination(
        detail
      );

    const tags =
      Array.isArray(
        relationship
          ?.specialty_tags
      )
        ? relationship
            .specialty_tags
        : [];

    return `
      <div
        class="ciCreatorDetailInner"
      >
        <header
          class="ciCreatorDetailHero"
        >
          <div
            class="ciCreatorDetailHero__identity"
          >
            <div
              class="ciCreatorAvatar"
              aria-hidden="true"
            >
              ${escapeHtml(
                clean(
                  creator?.display_name
                )
                  .charAt(0)
                  .toUpperCase() ||
                "C"
              )}
            </div>

            <div>
              <div
                class="ciCreatorDetailHero__pills"
              >
                ${pill(
                  creatorApplicationView(
                    detail
                  )?.label ||
                    relationshipState.label,
                  creatorApplicationView(
                    detail
                  )?.tone ||
                    relationshipState.tone
                )}
              </div>

              <h2>
                ${escapeHtml(
                  creator?.display_name ||
                  "Creator"
                )}
              </h2>

              <p>
                ${escapeHtml(
                  creator?.email || ""
                )}
              </p>
            </div>
          </div>

          <div
            class="ciCreatorDetailHero__dates"
          >
            <span>
              Relación desde
            </span>

            <strong>
              ${escapeHtml(
                formatDate(
                  relationship
                    ?.activated_at ||
                  relationship
                    ?.created_at
                )
              )}
            </strong>

            ${creatorApplicationActionsMarkup(
              detail
            )}
          </div>
        </header>

        <div
          class="ciCreatorSummary"
        >
          ${miniStat(
            String(
              counts?.submissions || 0
            ),
            "Entregas"
          )}

          ${miniStat(
            String(
              counts?.acquired || 0
            ),
            "Adquiridas"
          )}

          ${miniStat(
            String(
              counts?.purchases || 0
            ),
            "Compras"
          )}

          ${miniStat(
            formatMoney(
              financial?.paid_amount,
              "ARS"
            ),
            "Pagado"
          )}
        </div>

        <div
          class="ciCreatorProfileGrid"
        >
          <section
            class="
              ciCreatorProfileCard
              ciCreatorOperationalCard
            "
          >
            ${operationalEditorMarkup(
              creator,
              relationship,
              counts,
              tags
            )}
          </section>

          <section
            class="ciCreatorProfileCard"
          >
            <span>
              Cuenta de cobro
            </span>

            ${
              destination
                ? `
                  <strong
                    class="ciCreatorDestinationName"
                  >
                    ${escapeHtml(
                      destination
                        ?.holder_name ||
                      creator
                        ?.display_name
                    )}
                  </strong>

                  <p>
                    ${escapeHtml(
                      destination
                        ?.provider ||
                      ""
                    )}
                    ${
                      destination?.alias
                        ? ` · ${escapeHtml(
                            destination.alias
                          )}`
                        : ""
                    }
                    ${
                      destination
                        ?.account_identifier_last4
                        ? ` · •••• ${escapeHtml(
                            destination
                              .account_identifier_last4
                          )}`
                        : ""
                    }
                  </p>

                  ${pill(
                    "Destino confirmado",
                    "green"
                  )}
                `
                : `
                  <div
                    class="ciCreatorSectionEmpty is-compact"
                  >
                    Sin destino de cobro
                    asociado todavía.
                  </div>
                `
            }
          </section>
        </div>

        <div
          class="ciCreatorDetailColumns"
        >
          <div>
            ${section(
              "Trabajo",
              "Entregas",
              submissionsMarkup(detail)
            )}

            ${section(
              "Comercial",
              "Negociaciones",
              negotiationsMarkup(detail)
            )}

            ${section(
              "Comercial",
              "Compras",
              purchasesMarkup(detail)
            )}
          </div>

          <div>
            ${section(
              "Finanzas",
              "Pagos",
              paymentMarkup(detail)
            )}

            ${section(
              "Onboarding",
              "Acceso y onboarding",
              onboardingMarkup(detail)
            )}

            ${section(
              "Historial",
              "Actividad operativa",
              timelineMarkup(detail)
            )}
          </div>
        </div>
      </div>
    `;
  }

  async function renderDetail(
    creatorId
  ) {
    const root =
      document.querySelector(
        "[data-ci-creator-detail]"
      );

    if (!root) return;

    const id =
      clean(creatorId);

    if (!id) return;

    const seq =
      ++detailSeq;

    root.innerHTML = `
      <div
        class="ciCreatorDetailLoading"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <span>
          Cargando Creator…
        </span>
      </div>
    `;

    try {
      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      const workspace =
        workspaceFrom(
          connection
        );

      if (!workspace) {
        throw new Error(
          "workspace_no_resuelto"
        );
      }

      const detail =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/creators/${
              encodeURIComponent(id)
            }`,
            {
              method: "GET"
            }
          );

      if (
        isSelfServicePendingCreator(
          detail
        )
      ) {
        detail.application_context =
          await fetchCreatorApplicationContext(
            id,
            workspace
          );
      }

      if (
        seq !== detailSeq ||
        id !== selectedCreatorId ||
        !isCreators()
      ) {
        return;
      }

      activeCreatorDetail =
        detail;

      root.innerHTML =
        detailMarkup(
          detail
        );

    } catch {
      if (
        seq !== detailSeq
      ) {
        return;
      }

      root.innerHTML = `
        <div
          class="ciCreatorDetailError"
        >
          <span
            class="material-symbols-rounded"
          >
            error
          </span>

          <strong>
            Creator no disponible
          </strong>

          <span>
            No pudimos leer su detalle.
          </span>
        </div>
      `;
    }
  }

  function selectCreator(id) {
    const cleanId =
      clean(id);

    if (!cleanId) return;

    selectedCreatorId =
      cleanId;

    writeCreatorToUrl(
      cleanId
    );

    renderRows();
    renderDetail(
      cleanId
    );
  }

  function syncSelection() {
    const visible =
      visibleCreators();

    const stillVisible =
      visible.some(
        (item) =>
          clean(
            item?.creator_id
          ) ===
          selectedCreatorId
      );

    if (stillVisible) {
      return;
    }

    selectedCreatorId =
      clean(
        visible[0]
          ?.creator_id
      ) || null;

    writeCreatorToUrl(
      selectedCreatorId
    );

    if (
      selectedCreatorId
    ) {
      renderDetail(
        selectedCreatorId
      );
    }
  }


  // PCI 2.1H.1B.2B · CREATOR INVITATION UI
  let invitationSending = false;

  // PCI 2.1H.1B.2C · ONBOARDING OPERATIONS
  let activeCreatorDetail = null;
  let invitationActionBusy = false;

  function invitationErrorMessage(
    error
  ) {
    const code =
      clean(
        error?.code ||
        error?.message
      );

    const messages = {
      pci_creator_invitation_email_invalid:
        "Ingresá un email válido.",

      pci_creator_display_name_invalid:
        "Ingresá un nombre visible.",

      pci_creator_legal_name_invalid:
        "El nombre legal es demasiado largo.",

      pci_creator_invitation_expiry_invalid:
        "Elegí un vencimiento válido.",

      pci_required_legal_documents_missing:
        "No hay documentos legales publicados para activar el onboarding.",

      pci_workspace_creator_already_active:
        "Este Creator ya está activo en el workspace.",

      pci_workspace_creator_not_invitable:
        "La relación actual de este Creator no admite nuevas invitaciones.",

      pci_workspace_creator_closed:
        "La relación con este Creator está cerrada.",

      pci_creator_closed:
        "Este Creator está cerrado.",

      pci_creator_suspended:
        "Este Creator está suspendido.",

      invitation_email_delivery_failed:
        "La invitación se creó, pero el email no pudo enviarse.",

      origin_not_allowed:
        "Protocol Data no está autorizado para enviar invitaciones desde este origen.",

      pci_auth_session_required:
        "La sesión del operador venció.",

      pci_creator_invitation_not_found:
        "La invitación ya no existe.",

      pci_creator_invitation_not_revocable:
        "Esta invitación ya no puede revocarse.",

      pci_creator_invitation_revocation_context_invalid:
        "Ingresá un motivo válido para revocar.",

      invalid_invitation_id:
        "La invitación seleccionada no es válida."
    };

    return (
      messages[code] ||
      "No pudimos enviar la invitación."
    );
  }

  function ensureCreatorInvitationDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-creator-invite-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciCreatorInviteDialog";

    dialog.setAttribute(
      "data-ci-creator-invite-dialog",
      ""
    );

    dialog.innerHTML = `
      <div
        class="ciCreatorInviteDialog__surface"
      >
        <header
          class="ciCreatorInviteDialog__header"
        >
          <div>
            <span>
              Red de Creators
            </span>

            <h2>
              Invitar Creator
            </h2>

            <p>
              Sumá un Creator al workspace
              y enviá su acceso de onboarding.
            </p>
          </div>

          <button
            type="button"
            class="ciCreatorInviteDialog__close"
            data-ci-creator-invite-close
            aria-label="Cerrar"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </header>

        <form
          class="ciCreatorInviteDialog__form"
          data-ci-creator-invite-form
        >
          <label
            class="ciCreatorInviteDialog__field"
          >
            <span>
              Email
            </span>

            <input
              type="email"
              autocomplete="email"
              maxlength="320"
              required
              data-ci-creator-invite-email
              placeholder="creator@ejemplo.com"
            >
          </label>

          <label
            class="ciCreatorInviteDialog__field"
          >
            <span>
              Nombre visible
            </span>

            <input
              type="text"
              autocomplete="off"
              maxlength="160"
              required
              data-ci-creator-invite-display-name
              placeholder="Nombre del Creator"
            >
          </label>

          <label
            class="ciCreatorInviteDialog__field"
          >
            <span>
              Nombre legal
              <small>
                Opcional
              </small>
            </span>

            <input
              type="text"
              autocomplete="off"
              maxlength="240"
              data-ci-creator-invite-legal-name
              placeholder="Nombre legal"
            >
          </label>

          <label
            class="ciCreatorInviteDialog__field"
          >
            <span>
              Vencimiento
            </span>

            <select
              data-ci-creator-invite-expiry
            >
              <option value="24">
                24 horas
              </option>

              <option
                value="72"
                selected
              >
                72 horas
              </option>

              <option value="168">
                7 días
              </option>
            </select>
          </label>

          <div
            class="ciCreatorInviteDialog__notice"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              info
            </span>

            <p>
              Protocol enviará el acceso
              directamente por email.
              No se mostrará ningún token
              de invitación.
            </p>
          </div>

          <div
            class="ciCreatorInviteDialog__feedback"
            data-ci-creator-invite-feedback
            role="status"
            aria-live="polite"
          ></div>

          <div
            class="ciCreatorInviteDialog__actions"
          >
            <button
              type="button"
              class="ciCreatorInviteDialog__secondary"
              data-ci-creator-invite-close
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="ciCreatorInviteDialog__primary"
              data-ci-creator-invite-submit
            >
              Enviar invitación
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "click",
      (event) => {
        const close =
          event.target.closest(
            "[data-ci-creator-invite-close]"
          );

        if (close) {
          if (
            !invitationSending
          ) {
            dialog.close();
          }

          return;
        }

        if (
          event.target === dialog &&
          !invitationSending
        ) {
          dialog.close();
        }
      }
    );

    dialog.addEventListener(
      "cancel",
      (event) => {
        if (
          invitationSending
        ) {
          event.preventDefault();
        }
      }
    );

    dialog.addEventListener(
      "close",
      () => {
        const form =
          dialog.querySelector(
            "[data-ci-creator-invite-form]"
          );

        const feedback =
          dialog.querySelector(
            "[data-ci-creator-invite-feedback]"
          );

        form?.reset();

        const expiry =
          dialog.querySelector(
            "[data-ci-creator-invite-expiry]"
          );

        if (expiry) {
          expiry.value = "72";
        }

        if (feedback) {
          feedback.textContent = "";
          feedback.removeAttribute(
            "data-state"
          );
        }

        invitationSending = false;
      }
    );

    dialog.addEventListener(
      "submit",
      async (event) => {
        const form =
          event.target.closest(
            "[data-ci-creator-invite-form]"
          );

        if (!form) {
          return;
        }

        event.preventDefault();

        if (
          invitationSending
        ) {
          return;
        }

        const email =
          clean(
            form.querySelector(
              "[data-ci-creator-invite-email]"
            )?.value
          );

        const displayName =
          clean(
            form.querySelector(
              "[data-ci-creator-invite-display-name]"
            )?.value
          );

        const legalName =
          clean(
            form.querySelector(
              "[data-ci-creator-invite-legal-name]"
            )?.value
          );

        const expiresInHours =
          Number(
            form.querySelector(
              "[data-ci-creator-invite-expiry]"
            )?.value || 72
          );

        const feedback =
          dialog.querySelector(
            "[data-ci-creator-invite-feedback]"
          );

        const submit =
          dialog.querySelector(
            "[data-ci-creator-invite-submit]"
          );

        invitationSending = true;

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "Enviando…";
        }

        if (feedback) {
          feedback.textContent = "";
          feedback.removeAttribute(
            "data-state"
          );
        }

        try {
          const response =
            await window
              .PCIRuntime
              .createCreatorInvitation({
                email,
                display_name:
                  displayName,
                legal_name:
                  legalName || null,
                expires_in_hours:
                  expiresInHours
              });

          const creatorId =
            clean(
              response?.creator_id
            );

          if (creatorId) {
            selectedCreatorId =
              creatorId;

            writeCreatorToUrl(
              creatorId
            );
          }

          dialog.close();

          await render();

        } catch (error) {
          if (feedback) {
            feedback.textContent =
              invitationErrorMessage(
                error
              );

            feedback.setAttribute(
              "data-state",
              "error"
            );
          }

        } finally {
          invitationSending = false;

          if (
            dialog.open &&
            submit
          ) {
            submit.disabled = false;
            submit.textContent =
              "Enviar invitación";
          }
        }
      }
    );

    return dialog;
  }

  function openCreatorInvitationDialog() {
    const dialog =
      ensureCreatorInvitationDialog();

    const form =
      dialog.querySelector(
        "[data-ci-creator-invite-form]"
      );

    form?.reset();

    const expiry =
      dialog.querySelector(
        "[data-ci-creator-invite-expiry]"
      );

    if (expiry) {
      expiry.value = "72";
    }

    const feedback =
      dialog.querySelector(
        "[data-ci-creator-invite-feedback]"
      );

    if (feedback) {
      feedback.textContent = "";
      feedback.removeAttribute(
        "data-state"
      );
    }

    dialog.showModal();

    dialog
      .querySelector(
        "[data-ci-creator-invite-email]"
      )
      ?.focus();
  }


  function ensureCreatorOnboardingDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-creator-onboarding-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciCreatorOnboardingDialog";

    dialog.setAttribute(
      "data-ci-creator-onboarding-dialog",
      ""
    );

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "click",
      (event) => {
        const close =
          event.target.closest(
            "[data-ci-creator-onboarding-close]"
          );

        if (
          close &&
          !invitationActionBusy
        ) {
          dialog.close();
          return;
        }

        if (
          event.target === dialog &&
          !invitationActionBusy
        ) {
          dialog.close();
        }
      }
    );

    dialog.addEventListener(
      "cancel",
      (event) => {
        if (
          invitationActionBusy
        ) {
          event.preventDefault();
        }
      }
    );

    dialog.addEventListener(
      "submit",
      async (event) => {
        const form =
          event.target.closest(
            "[data-ci-creator-onboarding-form]"
          );

        if (!form) {
          return;
        }

        event.preventDefault();

        if (
          invitationActionBusy
        ) {
          return;
        }

        const mode =
          clean(
            dialog.dataset
              .ciCreatorOnboardingMode
          );

        const invitationId =
          clean(
            dialog.dataset
              .ciCreatorInvitationId
          );

        const feedback =
          dialog.querySelector(
            "[data-ci-creator-onboarding-feedback]"
          );

        const submit =
          dialog.querySelector(
            "[data-ci-creator-onboarding-submit]"
          );

        invitationActionBusy =
          true;

        if (submit) {
          submit.disabled = true;
          submit.textContent =
            mode === "revoke"
              ? "Revocando…"
              : "Enviando…";
        }

        if (feedback) {
          feedback.textContent = "";
          feedback.removeAttribute(
            "data-state"
          );
        }

        try {
          if (
            mode === "revoke"
          ) {
            const reason =
              clean(
                form.querySelector(
                  "[data-ci-creator-revoke-reason]"
                )?.value
              );

            await window
              .PCIRuntime
              .revokeCreatorInvitation(
                invitationId,
                reason
              );

          } else {
            const creator =
              activeCreatorDetail
                ?.creator || {};

            await window
              .PCIRuntime
              .createCreatorInvitation({
                email:
                  creator?.email,
                display_name:
                  creator?.display_name,
                legal_name:
                  creator?.legal_name ||
                  null,
                expires_in_hours:
                  72
              });
          }

          dialog.close();

          await render();

        } catch (error) {
          if (feedback) {
            feedback.textContent =
              invitationErrorMessage(
                error
              );

            feedback.setAttribute(
              "data-state",
              "error"
            );
          }

        } finally {
          invitationActionBusy =
            false;

          if (
            dialog.open &&
            submit
          ) {
            submit.disabled = false;

            submit.textContent =
              mode === "revoke"
                ? "Revocar invitación"
                : mode === "resend"
                  ? "Enviar nueva invitación"
                  : "Enviar invitación";
          }
        }
      }
    );

    return dialog;
  }

  function openCreatorOnboardingDialog(
    mode,
    invitationId = ""
  ) {
    const dialog =
      ensureCreatorOnboardingDialog();

    const creator =
      activeCreatorDetail
        ?.creator || {};

    const cleanMode =
      clean(mode);

    const isRevoke =
      cleanMode === "revoke";

    const isResend =
      cleanMode === "resend";

    dialog.dataset
      .ciCreatorOnboardingMode =
        cleanMode;

    dialog.dataset
      .ciCreatorInvitationId =
        clean(invitationId);

    const title =
      isRevoke
        ? "Revocar invitación"
        : isResend
          ? "Reenviar invitación"
          : "Enviar nueva invitación";

    const description =
      isRevoke
        ? "El enlace pendiente dejará de ser válido. Esto no elimina al Creator ni cambia el estado de su relación."
        : isResend
          ? "La invitación pendiente actual quedará invalidada y Protocol enviará una nueva con 72 horas de vigencia."
          : "Protocol enviará una nueva invitación con 72 horas de vigencia.";

    dialog.innerHTML = `
      <div
        class="ciCreatorOnboardingDialog__surface"
      >
        <header
          class="ciCreatorOnboardingDialog__header"
        >
          <div>
            <span>
              Onboarding
            </span>

            <h2>
              ${escapeHtml(title)}
            </h2>

            <p>
              ${escapeHtml(description)}
            </p>
          </div>

          <button
            type="button"
            class="ciCreatorOnboardingDialog__close"
            data-ci-creator-onboarding-close
            aria-label="Cerrar"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </header>

        <form
          class="ciCreatorOnboardingDialog__form"
          data-ci-creator-onboarding-form
        >
          <div
            class="ciCreatorOnboardingDialog__creator"
          >
            <span>
              Creator
            </span>

            <strong>
              ${escapeHtml(
                creator?.display_name ||
                "Creator"
              )}
            </strong>

            <small>
              ${escapeHtml(
                creator?.email ||
                ""
              )}
            </small>
          </div>

          ${
            isRevoke
              ? `
                <label
                  class="ciCreatorOnboardingDialog__field"
                >
                  <span>
                    Motivo
                  </span>

                  <textarea
                    maxlength="500"
                    required
                    data-ci-creator-revoke-reason
                    placeholder="Explicá por qué se revoca esta invitación"
                  ></textarea>
                </label>
              `
              : `
                <div
                  class="ciCreatorOnboardingDialog__notice"
                >
                  <span
                    class="material-symbols-rounded"
                    aria-hidden="true"
                  >
                    schedule
                  </span>

                  <p>
                    La nueva invitación
                    vencerá en 72 horas.
                  </p>
                </div>
              `
          }

          <div
            class="ciCreatorOnboardingDialog__feedback"
            data-ci-creator-onboarding-feedback
            role="status"
            aria-live="polite"
          ></div>

          <div
            class="ciCreatorOnboardingDialog__actions"
          >
            <button
              type="button"
              class="ciCreatorOnboardingDialog__secondary"
              data-ci-creator-onboarding-close
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="ciCreatorOnboardingDialog__primary ${
                isRevoke
                  ? "is-danger"
                  : ""
              }"
              data-ci-creator-onboarding-submit
            >
              ${
                isRevoke
                  ? "Revocar invitación"
                  : isResend
                    ? "Enviar nueva invitación"
                    : "Enviar invitación"
              }
            </button>
          </div>
        </form>
      </div>
    `;

    dialog.showModal();

    if (isRevoke) {
      dialog
        .querySelector(
          "[data-ci-creator-revoke-reason]"
        )
        ?.focus();
    }
  }

  function bindView() {
    const root =
      stage();

    if (!root) return;

    root
      .querySelector(
        "[data-ci-creator-search]"
      )
      ?.addEventListener(
        "input",
        (event) => {
          searchTerm =
            event.target.value || "";

          renderRows();
          syncSelection();
          renderRows();
        }
      );

    root.addEventListener(
      "click",
      (event) => {
        const invite =
          event.target.closest(
            "[data-ci-creator-invite]"
          );

        if (invite) {
          openCreatorInvitationDialog();
          return;
        }

        const resendInvitation =
          event.target.closest(
            "[data-ci-creator-invitation-resend]"
          );

        if (resendInvitation) {
          openCreatorOnboardingDialog(
            "resend",
            resendInvitation.dataset
              .ciCreatorInvitationResend
          );

          return;
        }

        const revokeInvitation =
          event.target.closest(
            "[data-ci-creator-invitation-revoke]"
          );

        if (revokeInvitation) {
          openCreatorOnboardingDialog(
            "revoke",
            revokeInvitation.dataset
              .ciCreatorInvitationRevoke
          );

          return;
        }

        const newInvitation =
          event.target.closest(
            "[data-ci-creator-invitation-new]"
          );

        if (newInvitation) {
          openCreatorOnboardingDialog(
            "new"
          );

          return;
        }

        const refresh =
          event.target.closest(
            "[data-ci-creator-refresh]"
          );

        if (refresh) {
          render();
          return;
        }

        const filter =
          event.target.closest(
            "[data-ci-creator-filter]"
          );

        if (filter) {
          currentFilter =
            clean(
              filter.dataset
                .ciCreatorFilter
            ) || "all";

          root
            .querySelectorAll(
              "[data-ci-creator-filter]"
            )
            .forEach(
              (button) => {
                const active =
                  clean(
                    button.dataset
                      .ciCreatorFilter
                  ) ===
                  currentFilter;

                button.classList.toggle(
                  "is-active",
                  active
                );

                button.setAttribute(
                  "aria-pressed",
                  active
                    ? "true"
                    : "false"
                );
              }
            );

          renderRows();
          syncSelection();
          renderRows();

          return;
        }

        const operationalEdit =
          event.target.closest(
            "[data-ci-creator-operational-edit]"
          );

        if (operationalEdit) {
          operationalEditorCreatorId =
            clean(
              operationalEdit.dataset
                .ciCreatorOperationalEdit
            );

          renderDetail(
            operationalEditorCreatorId
          );

          return;
        }

        const operationalCancel =
          event.target.closest(
            "[data-ci-creator-operational-cancel]"
          );

        if (operationalCancel) {
          if (operationalSaving) {
            return;
          }

          const creatorId =
            clean(
              operationalCancel.dataset
                .ciCreatorOperationalCancel
            );

          operationalEditorCreatorId =
            null;

          renderDetail(
            creatorId
          );

          return;
        }

        const operationalSave =
          event.target.closest(
            "[data-ci-creator-operational-save]"
          );

        if (operationalSave) {
          saveOperationalProfile(
            operationalSave.dataset
              .ciCreatorOperationalSave
          );

          return;
        }

        const creator =
          event.target.closest(
            "[data-ci-creator-id]"
          );

        if (creator) {
          selectCreator(
            creator.dataset
              .ciCreatorId
          );

          return;
        }

        const negotiation =
          event.target.closest(
            "[data-ci-creator-open-negotiation]"
          );

        if (negotiation) {
          navigateEntity(
            "negotiation",
            negotiation.dataset
              .ciCreatorOpenNegotiation,
            "negociaciones"
          );

          return;
        }

        const purchase =
          event.target.closest(
            "[data-ci-creator-open-purchase]"
          );

        if (purchase) {
          navigateEntity(
            "purchase",
            purchase.dataset
              .ciCreatorOpenPurchase,
            "compras"
          );
        }
      }
    );
  }

  function loadingMarkup() {
    return `
      <div
        class="ciCreatorsLoading"
      >
        <span
          class="material-symbols-rounded"
        >
          progress_activity
        </span>

        <div>
          <strong>
            Cargando Creators
          </strong>

          <span>
            Consultando la red operativa…
          </span>
        </div>
      </div>
    `;
  }

  async function render() {
    if (!isCreators()) return;

    const root =
      stage();

    if (!root) return;

    const seq =
      ++requestSeq;

    root.innerHTML =
      loadingMarkup();

    try {
      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      if (!connection?.signedIn) {
        throw new Error(
          "pci_auth_session_required"
        );
      }

      const workspace =
        workspaceFrom(
          connection
        );

      if (!workspace) {
        throw new Error(
          "workspace_no_resuelto"
        );
      }

      const response =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/creators?limit=200&offset=0`,
            {
              method: "GET"
            }
          );

      if (
        seq !== requestSeq ||
        !isCreators()
      ) {
        return;
      }

      creators =
        Array.isArray(
          response?.items
        )
          ? response.items
          : [];

      const requested =
        requestedCreatorId();

      if (
        requested &&
        creators.some(
          (item) =>
            clean(
              item?.creator_id
            ) === requested
        )
      ) {
        selectedCreatorId =
          requested;

      } else if (
        !creators.some(
          (item) =>
            clean(
              item?.creator_id
            ) ===
            selectedCreatorId
        )
      ) {
        selectedCreatorId =
          clean(
            creators[0]
              ?.creator_id
          ) || null;
      }

      writeCreatorToUrl(
        selectedCreatorId
      );

      root.innerHTML =
        shellMarkup();

      bindView();

      if (
        selectedCreatorId
      ) {
        renderDetail(
          selectedCreatorId
        );
      }

    } catch {
      if (
        seq !== requestSeq
      ) {
        return;
      }

      root.innerHTML = `
        <div
          class="ciCreatorDetailError"
        >
          <span
            class="material-symbols-rounded"
          >
            error
          </span>

          <strong>
            Creadores no disponible
          </strong>

          <span>
            No pudimos leer la red operativa.
          </span>
        </div>
      `;
    }
  }

  function boot() {
    if (isCreators()) {
      render();
    }
  }

  window.addEventListener(
    "hashchange",
    boot
  );

  window.addEventListener(
    "popstate",
    boot
  );

  document.addEventListener(
    "sazzu:page:load",
    boot
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }


  if (
    !window
      .__pciCreatorApplicationReviewBound
  ) {
    window
      .__pciCreatorApplicationReviewBound =
        true;

    document.addEventListener(
      "click",
      async (event) => {
        const button =
          event.target.closest(
            "[data-ci-creator-application-decision]"
          );

        if (
          !button ||
          !isCreators()
        ) {
          return;
        }

        const decision =
          clean(
            button.dataset
              .ciCreatorApplicationDecision
          ).toLowerCase();

        const creatorId =
          clean(
            button.dataset
              .ciCreatorId
          );

        if (
          !creatorId ||
          ![
            "approved",
            "rejected"
          ].includes(decision)
        ) {
          return;
        }

        if (
          decision === "rejected" &&
          !window.confirm(
            "¿Rechazar la solicitud de este Creator?"
          )
        ) {
          return;
        }

        const actions =
          button.closest(
            "[data-ci-creator-application-actions]"
          );

        const feedback =
          actions?.querySelector(
            "[data-ci-creator-application-feedback]"
          );

        const controls =
          actions
            ? Array.from(
                actions.querySelectorAll(
                  "button"
                )
              )
            : [button];

        controls.forEach(
          (control) => {
            control.disabled = true;
          }
        );

        if (feedback) {
          feedback.textContent =
            decision === "approved"
              ? "Aceptando solicitud…"
              : "Rechazando solicitud…";
        }

        try {
          const connection =
            await window
              .PCIRuntime
              .getConnectionState();

          const workspace =
            workspaceFrom(
              connection
            );

          if (!workspace) {
            throw new Error(
              "workspace_no_resuelto"
            );
          }

          const idempotencyKey =
            crypto.randomUUID();

          const result =
            await window
              .PCIRuntime
              .request(
                `/v1/workspaces/${
                  encodeURIComponent(
                    workspace
                  )
                }/creators/${
                  encodeURIComponent(
                    creatorId
                  )
                }/application/review`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                    "Idempotency-Key":
                      idempotencyKey
                  },
                  body: JSON.stringify({
                    decision,
                    idempotency_key:
                      idempotencyKey
                  })
                }
              );

          creatorApplicationCache.set(
            creatorId,
            {
              ok: true,
              creator_id:
                creatorId,
              relationship: {
                status:
                  result
                    ?.relationship_status ||
                  (
                    decision ===
                      "rejected"
                      ? "closed"
                      : "pending"
                  ),
                application_review_decision:
                  result
                    ?.application_review_decision ||
                  decision,
                application_reviewed_at:
                  result
                    ?.application_reviewed_at ||
                  new Date()
                    .toISOString(),
                required_legal_documents:
                  result
                    ?.required_legal_documents ||
                  []
              }
            }
          );

          if (
            decision === "rejected"
          ) {
            selectedCreatorId =
              null;
          }

          await render();

        } catch (error) {
          console.error(
            "[PCI Creators] application review failed",
            error
          );

          if (feedback) {
            const code =
              clean(
                error?.code ||
                error?.message
              );

            feedback.textContent =
              code ===
                "pci_creator_application_already_reviewed"
                ? "Esta solicitud ya fue revisada."
                : code ===
                    "pci_creator_application_required_legal_documents_missing"
                  ? "Faltan documentos legales publicados para aprobar."
                  : "No pudimos revisar la solicitud.";

            feedback.dataset.state =
              "error";
          }

          controls.forEach(
            (control) => {
              control.disabled = false;
            }
          );
        }
      }
    );
  }

})();
