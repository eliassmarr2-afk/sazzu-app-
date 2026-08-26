(function () {
  "use strict";

  let requestSeq = 0;
  let flash = null;

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

  const DECISION_LABELS = Object.freeze({
    changes_requested: "Cambios solicitados",
    preselected: "Preseleccionada",
    rejected: "Rechazada"
  });

  // PCI 2.1N · REVIEW PLAYBACK MODAL
  let reviewPlaybackContext = null;

  function cleanupReviewPlaybackDialog(dialog) {
    if (!dialog) return;

    const video =
      dialog.querySelector(
        "[data-ci-review-playback-video]"
      );

    if (video) {
      try {
        video.pause();
      } catch (_) {
        // no-op
      }

      video.removeAttribute("src");

      try {
        video.load();
      } catch (_) {
        // no-op
      }
    }

    dialog.removeAttribute(
      "data-ci-review-playback-version"
    );

    dialog.innerHTML = "";
  }

  function ensureReviewPlaybackDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-review-playback-dialog]"
      );

    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "ciReviewPlaybackDialog";
    dialog.setAttribute(
      "data-ci-review-playback-dialog",
      ""
    );

    dialog.addEventListener(
      "close",
      () => {
        cleanupReviewPlaybackDialog(dialog);
      }
    );

    dialog.addEventListener(
      "click",
      (event) => {
        if (event.target === dialog) {
          dialog.close();
        }
      }
    );

    document.body.appendChild(dialog);

    return dialog;
  }

  function playbackFact(label, value) {
    return `
      <div class="ciReviewPlaybackDialog__fact">
        <span>${esc(label)}</span>
        <strong>${esc(value || "—")}</strong>
      </div>
    `;
  }

  async function openReviewPlaybackModal() {
    const snapshot = reviewPlaybackContext;

    const currentVersion =
      snapshot?.currentVersion || null;

    if (
      !currentVersion
      || !currentVersion.submission_version_id
      || !window.PCIRuntime
        ?.getSubmissionVersionPlayback
    ) {
      return;
    }

    const submission =
      snapshot?.submission || {};

    const creator =
      snapshot?.creator || {};

    const consignment =
      snapshot?.consignment || {};

    const revision =
      snapshot?.revision || {};

    const dialog =
      ensureReviewPlaybackDialog();

    const versionId =
      currentVersion.submission_version_id;

    dialog.setAttribute(
      "data-ci-review-playback-version",
      versionId
    );

    dialog.innerHTML = `
      <div class="ciReviewPlaybackDialog__surface">
        <header class="ciReviewPlaybackDialog__header">
          <div>
            <span>REVISIÓN PRIVADA</span>

            <h2>
              V${esc(
                currentVersion.version_number || "—"
              )}
              · Visualización privada
            </h2>

            <p>
              Reproducción temporal del archivo original
              enviado por el Creator.
            </p>
          </div>

          <button
            class="ciReviewPlaybackDialog__close"
            type="button"
            aria-label="Cerrar visualización"
            data-ci-review-playback-close
          >
            <span class="material-symbols-rounded">
              close
            </span>
          </button>
        </header>

        <div class="ciReviewPlaybackDialog__grid">
          <section
            class="ciReviewPlaybackDialog__viewer"
            aria-label="Video enviado por el Creator"
          >
            <div
              class="ciReviewPlaybackDialog__media"
              data-ci-review-playback-media
            >
              <div class="ciReviewPlaybackDialog__loading">
                <span
                  class="ciLoading__spinner"
                  aria-hidden="true"
                ></span>

                <strong>
                  Preparando visualización privada…
                </strong>

                <span>
                  Generando acceso temporal al archivo.
                </span>
              </div>
            </div>
          </section>

          <aside class="ciReviewPlaybackDialog__context">
            <div class="ciReviewPlaybackDialog__contextHead">
              <span>CONTEXTO DE REVISIÓN</span>

              <h3>
                ${esc(
                  submission.concept_label ||
                  revision.title ||
                  "Entrega"
                )}
              </h3>

              <p>
                ${esc(
                  creator.display_name || "Creator"
                )}
                ${
                  creator.email
                    ? ` · ${esc(creator.email)}`
                    : ""
                }
              </p>
            </div>

            <div class="ciReviewPlaybackDialog__facts">
              ${playbackFact(
                "Consignación",
                revision.title ||
                consignment.title ||
                "—"
              )}

              ${playbackFact(
                "Brief",
                revision.revision_number
                  ? `Revisión ${revision.revision_number}`
                  : "—"
              )}

              ${playbackFact(
                "Versión",
                `V${
                  currentVersion.version_number || "—"
                } · ${humanize(
                  currentVersion.status
                )}`
              )}

              ${playbackFact(
                "Rights",
                humanize(
                  currentVersion.rights_clearance_status
                )
              )}

              ${playbackFact(
                "Archivo",
                currentVersion.original_filename ||
                "—"
              )}

              ${playbackFact(
                "Resolución",
                currentVersion.width &&
                currentVersion.height
                  ? `${currentVersion.width}×${currentVersion.height}`
                  : "—"
              )}

              ${playbackFact(
                "Duración",
                formatDuration(
                  currentVersion.duration_seconds
                )
              )}

              ${playbackFact(
                "Peso",
                formatBytes(
                  currentVersion.file_size_bytes
                )
              )}

              ${playbackFact(
                "Enviada",
                formatDate(submission.submitted_at)
              )}
            </div>

            <section class="ciReviewPlaybackDialog__brief">
              <div>
                <span>BRIEF</span>
                <h4>Dirección creativa</h4>
              </div>

              <dl>
                <div>
                  <dt>Objetivo</dt>
                  <dd>
                    ${esc(revision.objective || "—")}
                  </dd>
                </div>

                <div>
                  <dt>Ángulo creativo</dt>
                  <dd>
                    ${esc(
                      revision.creative_angle || "—"
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Hook recomendado</dt>
                  <dd>
                    ${esc(
                      revision.hook_guidance || "—"
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <div class="ciReviewPlaybackDialog__notice">
              <span class="material-symbols-rounded">
                lock
              </span>

              <div>
                <strong>
                  Vista privada de revisión
                </strong>

                <p>
                  El archivo continúa siendo propiedad
                  del Creator. La reproducción no implica
                  adquisición ni transferencia de derechos.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    dialog
      .querySelector(
        "[data-ci-review-playback-close]"
      )
      ?.addEventListener(
        "click",
        () => dialog.close()
      );

    if (!dialog.open) {
      dialog.showModal();
    }

    const media =
      dialog.querySelector(
        "[data-ci-review-playback-media]"
      );

    try {
      const playback =
        await window.PCIRuntime
          .getSubmissionVersionPlayback(
            versionId
          );

      if (
        !dialog.open
        || dialog.getAttribute(
          "data-ci-review-playback-version"
        ) !== versionId
      ) {
        return;
      }

      const signedUrl =
        String(
          playback?.playback?.signed_url || ""
        ).trim();

      if (!signedUrl) {
        throw new Error(
          "submission_version_playback_url_missing"
        );
      }

      if (!media) return;

      media.innerHTML = `
        <video
          class="ciReviewPlaybackDialog__video"
          data-ci-review-playback-video
          controls
          playsinline
          preload="metadata"
        ></video>
      `;

      const video =
        media.querySelector(
          "[data-ci-review-playback-video]"
        );

      if (!video) return;

      video.src = signedUrl;
      video.load();
    } catch (error) {
      if (
        !dialog.open
        || dialog.getAttribute(
          "data-ci-review-playback-version"
        ) !== versionId
      ) {
        return;
      }

      if (media) {
        media.innerHTML = `
          <div
            class="ciReviewPlaybackDialog__error"
            role="alert"
          >
            <span class="material-symbols-rounded">
              error
            </span>

            <strong>
              No se pudo abrir el video.
            </strong>

            <span>
              Cerrá la visualización e intentá nuevamente.
            </span>
          </div>
        `;
      }
    }
  }

  // PCI 2.1O · REVIEW NEGOTIATION ENTRY
  function openNegotiationWorkspace(
    negotiationId
  ) {
    const id = String(
      negotiationId || ""
    ).trim();

    if (!id) return;

    const url = new URL(
      window.location.href
    );

    url.searchParams.delete(
      "ci_entity_type"
    );
    url.searchParams.delete(
      "ci_entity_id"
    );
    url.searchParams.set(
      "negotiation",
      id
    );
    url.hash = "negociaciones";

    window.location.assign(
      url.toString()
    );
  }

  function reviewNegotiationMarkup(
    submission
  ) {
    const submissionId = String(
      submission?.submission_id || ""
    ).trim();

    const isPreselected =
      String(
        submission?.status || ""
      ).toLowerCase() ===
      "preselected";

    return `
      <div
        class="ciReviewNegotiationEntry"
        data-ci-review-negotiation-entry
        data-submission-id="${esc(
          submissionId
        )}"
      >
        <div
          class="ciReviewNegotiationEntry__buttons"
        >
          <button
            class="
              ciReviewNegotiationButton
              ciReviewNegotiationButton--primary
            "
            type="button"
            data-ci-review-start-conversation
            ${
              isPreselected
                ? ""
                : "disabled"
            }
          >
            <span
              class="material-symbols-rounded"
            >
              forum
            </span>

            <span
              data-ci-review-start-conversation-label
            >
              Iniciar conversación
            </span>
          </button>

          <button
            class="ciReviewNegotiationButton"
            type="button"
            data-ci-review-converse
            disabled
          >
            <span
              class="material-symbols-rounded"
            >
              chat
            </span>

            <span>Conversar</span>
          </button>
        </div>

        <p
          class="ciReviewNegotiationEntry__status"
          data-ci-review-negotiation-status
        >
          ${
            isPreselected
              ? "Comprobando conversación…"
              : "Disponible después de preseleccionar el creativo."
          }
        </p>
      </div>
    `;
  }

  function negotiationSubmissionId(
    item
  ) {
    return String(
      item?.submission_id ||
      item?.submission?.submission_id ||
      ""
    ).trim();
  }

  async function hydrateReviewNegotiationEntry(
    submission
  ) {
    const root = stage();

    const entry = root?.querySelector(
      "[data-ci-review-negotiation-entry]"
    );
    if (!entry) return;

    const start = entry.querySelector(
      "[data-ci-review-start-conversation]"
    );
    const startLabel = entry.querySelector(
      "[data-ci-review-start-conversation-label]"
    );
    const converse = entry.querySelector(
      "[data-ci-review-converse]"
    );
    const status = entry.querySelector(
      "[data-ci-review-negotiation-status]"
    );

    const submissionId = String(
      submission?.submission_id || ""
    ).trim();

    const isPreselected =
      String(
        submission?.status || ""
      ).toLowerCase() ===
      "preselected";

    if (!submissionId || !isPreselected) {
      if (start) start.disabled = true;
      if (converse) converse.disabled = true;
      return;
    }

    if (
      !window.PCIRuntime
        ?.getAdminNegotiations
    ) {
      if (status) {
        status.textContent =
          "No pudimos comprobar el estado de la conversación.";
      }
      return;
    }

    try {
      const response =
        await window.PCIRuntime
          .getAdminNegotiations();

      const items =
        Array.isArray(response?.items)
          ? response.items
          : [];

      const matches = items
        .filter(
          (item) =>
            negotiationSubmissionId(item) ===
            submissionId
        )
        .sort(
          (a, b) =>
            new Date(
              b?.updated_at ||
              b?.opened_at ||
              0
            ).getTime()
            -
            new Date(
              a?.updated_at ||
              a?.opened_at ||
              0
            ).getTime()
        );

      const existing =
        matches[0] || null;

      if (!existing) {
        if (start) start.disabled = false;
        if (startLabel) {
          startLabel.textContent =
            "Iniciar conversación";
        }
        if (converse) {
          converse.disabled = true;
          delete converse.dataset
            .negotiationId;
        }
        if (status) {
          status.textContent =
            "Todavía no existe una conversación comercial.";
        }
        return;
      }

      const negotiationId = String(
        existing?.negotiation_id || ""
      ).trim();

      const negotiationStatus = String(
        existing?.status || ""
      ).toLowerCase();

      if (start) start.disabled = true;

      if (startLabel) {
        startLabel.textContent =
          negotiationStatus === "open"
            ? "Conversación iniciada"
            : "Conversación cerrada";
      }

      if (converse && negotiationId) {
        converse.disabled = false;
        converse.dataset.negotiationId =
          negotiationId;
      }

      if (status) {
        status.textContent =
          negotiationStatus === "open"
            ? "La negociación está abierta."
            : "La conversación permanece disponible como historial.";
      }
    } catch (_) {
      if (start) start.disabled = false;
      if (converse) converse.disabled = true;
      if (status) {
        status.textContent =
          "No pudimos comprobar si ya existe una conversación.";
      }
    }
  }

  async function startReviewConversation(
    trigger
  ) {
    const entry = trigger?.closest(
      "[data-ci-review-negotiation-entry]"
    );
    if (!entry) return;

    const submissionId = String(
      entry.dataset.submissionId || ""
    ).trim();

    const status = entry.querySelector(
      "[data-ci-review-negotiation-status]"
    );

    if (
      !submissionId ||
      !window.PCIRuntime
        ?.openSubmissionNegotiation
    ) {
      return;
    }

    trigger.disabled = true;

    if (status) {
      status.textContent =
        "Iniciando conversación…";
    }

    try {
      const result =
        await window.PCIRuntime
          .openSubmissionNegotiation(
            submissionId
          );

      const negotiationId = String(
        result?.negotiation_id || ""
      ).trim();

      if (!negotiationId) {
        throw new Error(
          "pci_negotiation_id_missing"
        );
      }

      openNegotiationWorkspace(
        negotiationId
      );
    } catch (error) {
      const code = String(
        error?.code ||
        error?.payload?.code ||
        error?.message ||
        ""
      );

      if (status) {
        status.textContent =
          code.includes(
            "pci_negotiation_already_open"
          )
            ? "Ya existe una conversación. Actualizá para abrirla."
            : (
                code.includes(
                  "pci_submission_not_preselected"
                )
                  ? "El creativo ya no está preseleccionado."
                  : "No pudimos iniciar la conversación."
              );
      }

      trigger.disabled = false;
    }
  }

  function isReview() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "revision";
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

  function submissionId() {
    const url = new URL(window.location.href);

    if (
      url.searchParams.get("ci_entity_type") !== "submission"
    ) {
      return "";
    }

    const id = String(
      url.searchParams.get("ci_entity_id") || ""
    ).trim();

    return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
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

  function humanize(value) {
    const text = String(value || "").trim();
    if (!text) return "—";

    return text
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function statusLabel(value) {
    return STATUS_LABELS[value] || humanize(value);
  }

  function tone(value) {
    const map = {
      submitted: "blue",
      under_review: "blue",
      changes_requested: "amber",
      preselected: "purple",
      rejected: "red",
      acquired: "green",
      complete: "green",
      flagged: "red",
      ready: "blue"
    };

    return map[value] || "muted";
  }

  function formatMoney(amount, currency) {
    const number = Number(amount);

    if (!Number.isFinite(number)) return "—";

    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: currency || "ARS",
        maximumFractionDigits: 0
      }).format(number);
    } catch (_) {
      return `${currency || ""} ${number}`;
    }
  }

  function yesNo(value) {
    if (value === true) return "Sí";
    if (value === false) return "No";
    return "—";
  }

  function rightsSourceLabel(value) {
    const labels = {
      creator_original: "Original del Creator",
      creator_original_with_third_party_elements:
        "Original con elementos de terceros",
      licensed_third_party:
        "Material licenciado de terceros"
    };

    return labels[value] || humanize(value);
  }

  function formatBytes(value) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "—";
    }

    if (bytes >= 1024 ** 2) {
      return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    }

    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${bytes} B`;
  }

  function formatDuration(value) {
    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "—";
    }

    return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  }

  function clearSubmissionContext() {
    const url = new URL(window.location.href);

    url.searchParams.delete("ci_entity_type");
    url.searchParams.delete("ci_entity_id");
    url.searchParams.delete("ci_reason");
    url.hash = "revision";

    history.pushState(
      { ...(history.state || {}), pciSection: "revision" },
      "",
      url
    );

    window.dispatchEvent(new Event("hashchange"));
  }

  function openSubmission(id) {
    const clean = String(id || "").trim();
    if (!clean) return;

    const url = new URL(window.location.href);

    url.searchParams.set("ci_entity_type", "submission");
    url.searchParams.set("ci_entity_id", clean);
    url.searchParams.delete("ci_reason");
    url.hash = "revision";

    history.pushState(
      {
        ...(history.state || {}),
        pciSection: "revision",
        submissionId: clean
      },
      "",
      url
    );

    window.dispatchEvent(new Event("hashchange"));
  }

  function renderLoading(label = "Cargando Revisión…") {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciReviewLoading">
        <span class="ciLoading__spinner" aria-hidden="true"></span>
        <span>${esc(label)}</span>
      </div>
    `;
  }

  function renderError(message) {
    const root = stage();
    if (!root) return;

    root.innerHTML = `
      <div class="ciReviewState">
        <span class="material-symbols-rounded ciReviewState__error">
          error
        </span>

        <strong>No se pudo cargar Revisión</strong>
        <span>${esc(message)}</span>

        <button
          class="ciButton ciButton--secondary"
          type="button"
          data-ci-review-retry
        >
          Reintentar
        </button>
      </div>
    `;

    root.querySelector("[data-ci-review-retry]")
      ?.addEventListener("click", render);
  }

  function renderQueue(data) {
    const root = stage();
    if (!root) return;

    const items = Array.isArray(data?.items)
      ? data.items
      : [];

    root.innerHTML = `
      <div class="ciReviewQueue">
        <section class="ciReviewToolbar">
          <div>
            <h2>Cola de revisión</h2>
            <p>
              ${Number(data?.total || 0)}
              entregas requieren o conservan contexto de revisión.
            </p>
          </div>

          <button
            class="ciPill ciPill--action"
            type="button"
            data-ci-review-refresh
          >
            <span class="material-symbols-rounded">refresh</span>
            Actualizar
          </button>
        </section>

        ${
          items.length
            ? `
              <section class="ciReviewQueueList">
                ${items.map((item) => {
                  const version = item?.current_version || {};
                  const brief = item?.consignment || {};
                  const creator = item?.creator || {};

                  return `
                    <button
                      class="ciReviewQueueRow"
                      type="button"
                      data-ci-review-submission="${esc(
                        item.submission_id || ""
                      )}"
                    >
                      <div>
                        <strong>
                          ${esc(
                            item.concept_label ||
                            brief.title ||
                            "Entrega"
                          )}
                        </strong>

                        <span>
                          ${esc(
                            creator.display_name || "Creator"
                          )}
                          ·
                          ${esc(brief.title || "Brief")}
                          ${
                            brief.revision_number
                              ? ` · Rev. ${esc(
                                  brief.revision_number
                                )}`
                              : ""
                          }
                        </span>
                      </div>

                      <div class="ciReviewQueueRow__version">
                        <strong>
                          ${
                            version.version_number
                              ? `V${esc(version.version_number)}`
                              : "—"
                          }
                        </strong>

                        <span>
                          ${esc(humanize(version.status))}
                        </span>
                      </div>

                      <div class="ciReviewQueueRow__chips">
                        <span
                          class="ciStatusChip"
                          data-tone="${esc(tone(item.status))}"
                        >
                          ${esc(statusLabel(item.status))}
                        </span>

                        <span
                          class="ciStatusChip"
                          data-tone="${esc(
                            tone(version.rights_clearance_status)
                          )}"
                        >
                          Rights
                          ${esc(
                            humanize(
                              version.rights_clearance_status
                            )
                          )}
                        </span>
                      </div>

                      <div class="ciReviewQueueRow__date">
                        ${esc(
                          formatDate(
                            item.submitted_at ||
                            item.created_at
                          )
                        )}
                      </div>

                      <span
                        class="material-symbols-rounded
                               ciReviewQueueRow__arrow"
                        aria-hidden="true"
                      >
                        arrow_forward
                      </span>
                    </button>
                  `;
                }).join("")}
              </section>
            `
            : `
              <section class="ciReviewEmpty">
                <span class="material-symbols-rounded">
                  task_alt
                </span>

                <div>
                  <strong>La cola está al día</strong>
                  <span>
                    No hay entregas pendientes de revisión en este momento.
                  </span>
                </div>
              </section>
            `
        }
      </div>
    `;

    root.querySelector("[data-ci-review-refresh]")
      ?.addEventListener("click", render);

    root.querySelectorAll("[data-ci-review-submission]")
      .forEach((row) => {
        row.addEventListener("click", () => {
          openSubmission(
            row.dataset.ciReviewSubmission
          );
        });
      });
  }

  function renderList(title, items, emptyText) {
    if (!Array.isArray(items) || !items.length) {
      return `
        <div class="ciReviewListEmpty">
          ${esc(emptyText)}
        </div>
      `;
    }

    return `
      <div class="ciReviewTimeline">
        ${items.map((item) => {
          const isNote =
            Boolean(item.body) &&
            !item.decision;

          const heading = isNote
            ? "Nota interna"
            : (
                DECISION_LABELS[item.decision] ||
                "Actividad"
              );

          return `
            <article class="ciReviewTimelineItem">
              <span class="ciReviewTimelineItem__dot"></span>

              <div>
                <strong>
                  ${esc(heading)}
                </strong>

                ${
                  item.creator_feedback
                    ? `
                      <p>
                        ${esc(item.creator_feedback)}
                      </p>
                    `
                    : ""
                }

                ${
                  item.internal_summary
                    ? `
                      <small>
                        ${esc(item.internal_summary)}
                      </small>
                    `
                    : ""
                }

                ${
                  item.body
                    ? `
                      <p>
                        ${esc(item.body)}
                      </p>
                    `
                    : ""
                }

                <time>
                  ${esc(formatDate(item.created_at))}
                </time>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAllowedActions(allowed) {
    const actions = [
      ["start_review", "Iniciar revisión"],
      ["request_changes", "Solicitar cambios"],
      ["preselect", "Preseleccionar"],
      ["reject", "Rechazar"],
      ["add_internal_note", "Nota interna"]
    ];

    return actions.map(([key, label]) => {
      const enabled = Boolean(allowed?.[key]);

      const actionIcons = {
        start_review: "play_arrow",
        request_changes: "edit_note",
        preselect: "arrow_forward",
        reject: "close",
        add_internal_note: "add"
      };

      if (
        key === "start_review" &&
        enabled
      ) {
        return `
          <button
            class="ciAllowedAction ciAllowedAction--button"
            data-enabled="true"
            type="button"
            data-ci-review-start
          >
            <span class="material-symbols-rounded">
              play_circle
            </span>

            <span>${esc(label)}</span>
          </button>
        `;
      }

      if (
        key === "request_changes" &&
        enabled
      ) {
        return `
          <button
            class="ciAllowedAction ciAllowedAction--button"
            data-enabled="true"
            type="button"
            data-ci-review-request-changes
          >
            <span class="material-symbols-rounded">
              edit_note
            </span>

            <span>${esc(label)}</span>
          </button>
        `;
      }

      if (
        key === "preselect" &&
        enabled
      ) {
        return `
          <button
            class="ciAllowedAction ciAllowedAction--button"
            data-enabled="true"
            type="button"
            data-ci-review-preselect
          >
            <span class="material-symbols-rounded">
              arrow_forward
            </span>

            <span>${esc(label)}</span>
          </button>
        `;
      }

      if (
        key === "add_internal_note" &&
        enabled
      ) {
        return `
          <button
            class="ciAllowedAction ciAllowedAction--button"
            data-enabled="true"
            type="button"
            data-ci-review-note-toggle
          >
            <span class="material-symbols-rounded">
              add_circle
            </span>

            <span>${esc(label)}</span>
          </button>
        `;
      }

      return `
        <div
          class="ciAllowedAction"
          data-enabled="${
            enabled ? "true" : "false"
          }"
        >
          <span class="material-symbols-rounded">
            ${
              enabled
                ? (
                    actionIcons[key] ||
                    "arrow_forward"
                  )
                : "block"
            }
          </span>

          <span>${esc(label)}</span>
        </div>
      `;
    }).join("");
  }

  function renderDetail(detail, context) {
    const root = stage();
    if (!root) return;

    const currentFlash = flash;
    flash = null;

    const submission = detail?.submission || {};
    const creator = detail?.creator || {};
    const consignment = detail?.consignment || {};
    const revision = consignment?.revision || {};
    const versions = Array.isArray(detail?.versions)
      ? detail.versions
      : [];
    const reviews = Array.isArray(detail?.reviews)
      ? detail.reviews
      : [];
    const notes = Array.isArray(detail?.internal_notes)
      ? detail.internal_notes
      : [];

    const currentVersion =
      versions.find(
        (item) =>
          item.submission_version_id ===
          submission.current_version_id
      ) ||
      versions[0] ||
      null;

    const policy = context?.revision_policy || {};
    const allowed = context?.allowed_actions || {};

    reviewPlaybackContext = {
      submission,
      creator,
      consignment,
      revision,
      currentVersion
    };

    queueMicrotask(() => {
      hydrateReviewNegotiationEntry(
        submission
      );
    });

    root.innerHTML = `
      <div class="ciReviewDetail">
        <section class="ciReviewToolbar">
          <button
            class="ciReviewBack"
            type="button"
            data-ci-review-back
          >
            <span class="material-symbols-rounded">
              arrow_back
            </span>
            Cola de revisión
          </button>

          <div class="ciReviewToolbar__actions">
            <span
              class="ciStatusChip"
              data-tone="${esc(tone(submission.status))}"
            >
              ${esc(statusLabel(submission.status))}
            </span>

            <button
              class="ciPill ciPill--action"
              type="button"
              data-ci-review-refresh
            >
              <span class="material-symbols-rounded">
                refresh
              </span>
              Actualizar
            </button>
          </div>
        </section>

        ${
          currentFlash
            ? `
              <div
                class="ciReviewNotice"
                data-tone="${esc(
                  currentFlash.tone || "success"
                )}"
                role="status"
              >
                <span class="material-symbols-rounded">
                  check_circle
                </span>

                <span>
                  ${esc(currentFlash.message)}
                </span>
              </div>
            `
            : ""
        }

        <section class="ciReviewHero">
          <div>
            <div class="ciReviewHero__eyebrow">
              Submission
            </div>

            <h2>
              ${esc(
                submission.concept_label ||
                revision.title ||
                "Entrega"
              )}
            </h2>

            <p>
              ${esc(creator.display_name || "Creator")}
              ${
                creator.email
                  ? ` · ${esc(creator.email)}`
                  : ""
              }
            </p>
          </div>

          <div class="ciReviewHero__meta">
            <span>Enviada</span>
            <strong>
              ${esc(formatDate(submission.submitted_at))}
            </strong>
          </div>
        </section>

        <div class="ciReviewColumns">
          <main class="ciReviewMain">
            <section class="ciReviewSection">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Versión actual</h3>
                  <p>Archivo y estado técnico recibido.</p>
                </div>

                ${
                  currentVersion
                    ? `
                      <button
                        class="ciPill ciPill--action"
                        type="button"
                        data-ci-review-visualize
                      >
                        <span class="material-symbols-rounded">
                          visibility
                        </span>
                        Visualizar
                      </button>
                    `
                    : ""
                }
              </div>

              ${
                currentVersion
                  ? `
                    <article class="ciReviewVersionCard">
                      <div class="ciReviewVersionCard__icon">
                        <span class="material-symbols-rounded">
                          movie
                        </span>
                      </div>

                      <div class="ciReviewVersionCard__body">
                        <div>
                          <strong>
                            V${esc(
                              currentVersion.version_number || "—"
                            )}
                            ·
                            ${esc(
                              humanize(currentVersion.status)
                            )}
                          </strong>

                          <span>
                            ${esc(
                              currentVersion.original_filename ||
                              "Archivo"
                            )}
                          </span>
                        </div>

                        <div class="ciReviewVersionMeta">
                          <span>
                            ${
                              currentVersion.width &&
                              currentVersion.height
                                ? `${esc(
                                    currentVersion.width
                                  )}×${esc(
                                    currentVersion.height
                                  )}`
                                : "—"
                            }
                          </span>

                          <span>
                            ${esc(
                              formatDuration(
                                currentVersion.duration_seconds
                              )
                            )}
                          </span>

                          <span>
                            ${esc(
                              formatBytes(
                                currentVersion.file_size_bytes
                              )
                            )}
                          </span>

                          <span>
                            ${esc(
                              String(
                                currentVersion.mime_type || "—"
                              )
                                .replace("video/", "")
                                .toUpperCase()
                            )}
                          </span>
                        </div>
                      </div>

                      <span
                        class="ciStatusChip"
                        data-tone="${esc(
                          tone(
                            currentVersion.rights_clearance_status
                          )
                        )}"
                      >
                        Rights
                        ${esc(
                          humanize(
                            currentVersion.rights_clearance_status
                          )
                        )}
                      </span>
                    </article>
                  `
                  : `
                    <div class="ciReviewListEmpty">
                      No existe una versión actual.
                    </div>
                  `
              }
            </section>

            <section class="ciReviewSection">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Rights Clearance</h3>
                  <p>
                    Declaración factual ligada exactamente a esta versión.
                  </p>
                </div>

                <span
                  class="ciStatusChip"
                  data-tone="${esc(
                    tone(
                      currentVersion
                        ?.rights_clearance_status
                    )
                  )}"
                >
                  Rights
                  ${esc(
                    humanize(
                      currentVersion
                        ?.rights_clearance_status
                    )
                  )}
                </span>
              </div>

              ${
                currentVersion?.rights_declaration
                  ? `
                    <div class="ciRightsFacts">
                      <article>
                        <span>Origen</span>
                        <strong>
                          ${esc(
                            rightsSourceLabel(
                              currentVersion
                                .rights_declaration
                                ?.origin
                                ?.source_type
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Autoría confirmada</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.origin
                                ?.creator_authorship_confirmed
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>IA utilizada</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.ai
                                ?.used
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Personas identificables</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.people
                                ?.identifiable_people
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Música / audio externo</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.music_audio
                                ?.used
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Assets de terceros</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.third_party_assets
                                ?.used
                            )
                          )}
                        </strong>
                      </article>

                      <article>
                        <span>Información certificada</span>
                        <strong>
                          ${esc(
                            yesNo(
                              currentVersion
                                .rights_declaration
                                ?.certification
                                ?.information_accurate
                            )
                          )}
                        </strong>
                      </article>
                    </div>

                    ${
                      currentVersion
                        .rights_clearance_status ===
                        "pending"
                        ? `
                          <div class="ciRightsDecision">
                            <label class="ciRightsConfirm">
                              <input
                                type="checkbox"
                                data-ci-rights-confirm
                              />

                              <span>
                                Revisé la declaración y coincide
                                con el archivo presentado.
                              </span>
                            </label>

                            <div class="ciRightsDecision__actions">
                              <button
                                class="ciButton ciButton--primary"
                                type="button"
                                data-ci-rights-complete
                                disabled
                              >
                                Aprobar Rights
                              </button>

                              <button
                                class="ciButton ciButton--secondary"
                                type="button"
                                data-ci-rights-flag-toggle
                              >
                                Flaggear
                              </button>
                            </div>

                            <form
                              class="ciRightsFlag"
                              data-ci-rights-flag-form
                              hidden
                            >
                              <label>
                                <span>Motivo del flag</span>

                                <textarea
                                  rows="3"
                                  maxlength="5000"
                                  placeholder="Explicá qué requiere revisión adicional…"
                                  data-ci-rights-flag-reason
                                  required
                                ></textarea>
                              </label>

                              <div class="ciRightsDecision__actions">
                                <button
                                  class="ciButton ciButton--secondary"
                                  type="button"
                                  data-ci-rights-flag-cancel
                                >
                                  Cancelar
                                </button>

                                <button
                                  class="ciButton ciButton--primary"
                                  type="submit"
                                >
                                  Confirmar flag
                                </button>
                              </div>
                            </form>

                            <div
                              class="ciInternalNoteComposer__status"
                              data-ci-rights-status
                              role="status"
                              aria-live="polite"
                            ></div>
                          </div>
                        `
                        : ""
                    }
                  `
                  : `
                    <div class="ciReviewListEmpty">
                      Esta versión no contiene una declaración
                      de derechos registrada.
                    </div>
                  `
              }
            </section>

            <section class="ciReviewSection">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Brief aceptado</h3>
                  <p>
                    Snapshot contractual que recibió este Creator.
                  </p>
                </div>

                <span class="ciReviewSectionTag">
                  Rev. ${esc(revision.revision_number || "—")}
                </span>
              </div>

              <div class="ciBriefGrid">
                <article>
                  <span>Título</span>
                  <strong>
                    ${esc(revision.title || "—")}
                  </strong>
                </article>

                <article>
                  <span>Precio base</span>
                  <strong>
                    ${esc(
                      formatMoney(
                        revision.base_price_amount,
                        revision.currency
                      )
                    )}
                  </strong>
                </article>
              </div>

              ${
                revision.summary
                  ? `
                    <div class="ciReviewCopyBlock">
                      <span>Resumen</span>
                      <p>${esc(revision.summary)}</p>
                    </div>
                  `
                  : ""
              }

              ${
                revision.objective
                  ? `
                    <div class="ciReviewCopyBlock">
                      <span>Objetivo</span>
                      <p>${esc(revision.objective)}</p>
                    </div>
                  `
                  : ""
              }

              ${
                revision.creative_angle
                  ? `
                    <div class="ciReviewCopyBlock">
                      <span>Ángulo creativo</span>
                      <p>${esc(revision.creative_angle)}</p>
                    </div>
                  `
                  : ""
              }

              ${
                revision.hook_guidance
                  ? `
                    <div class="ciReviewCopyBlock">
                      <span>Hook guidance</span>
                      <p>${esc(revision.hook_guidance)}</p>
                    </div>
                  `
                  : ""
              }
            </section>

            <section class="ciReviewSection">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Historial de revisión</h3>
                  <p>Decisiones anteriores sobre esta entrega.</p>
                </div>
              </div>

              ${renderList(
                "Reviews",
                reviews,
                "Todavía no existen decisiones de revisión."
              )}
            </section>
          </main>

          <aside class="ciReviewAside">
            <section class="ciReviewAsideCard">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Política de revisión</h3>
                  <p>Estado calculado por backend.</p>
                </div>
              </div>

              <div class="ciReviewStat">
                <span>Cambios usados</span>
                <strong>
                  ${esc(
                    policy.changes_requested_used ?? 0
                  )}
                </strong>
              </div>

              <div class="ciReviewStat">
                <span>Cambios restantes</span>
                <strong>
                  ${
                    policy.unlimited
                      ? "Sin límite"
                      : esc(
                          policy.changes_requested_remaining ??
                          0
                        )
                  }
                </strong>
              </div>
            </section>

            <section class="ciReviewAsideCard">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Acciones disponibles</h3>
                  <p>
                    Gobernadas por estado y permisos del backend.
                  </p>
                </div>
              </div>

              <div class="ciAllowedActions">
                ${reviewNegotiationMarkup(submission)}

                ${renderAllowedActions(allowed)}
              </div>

              ${
                allowed.request_changes
                  ? `
                    <div
                      class="ciReviewCommandComposer"
                      data-ci-review-changes-composer
                      hidden
                    >
                      <form data-ci-review-changes-form>
                        <label>
                          <span>
                            Mensaje para el Creator
                          </span>

                          <textarea
                            rows="4"
                            maxlength="5000"
                            placeholder="Explicá con precisión qué debe cambiar en la próxima versión…"
                            data-ci-review-changes-feedback
                            required
                          ></textarea>
                        </label>

                        <label>
                          <span>
                            Resumen interno
                            <small>Opcional</small>
                          </span>

                          <textarea
                            rows="3"
                            maxlength="5000"
                            placeholder="Contexto interno para Protocol…"
                            data-ci-review-changes-summary
                          ></textarea>
                        </label>

                        <div class="ciReviewCommandComposer__actions">
                          <button
                            class="ciButton ciButton--secondary"
                            type="button"
                            data-ci-review-changes-cancel
                          >
                            Cancelar
                          </button>

                          <button
                            class="ciButton ciButton--primary"
                            type="submit"
                          >
                            Solicitar cambios
                          </button>
                        </div>

                        <div
                          class="ciInternalNoteComposer__status"
                          data-ci-review-changes-status
                          role="status"
                          aria-live="polite"
                        ></div>
                      </form>
                    </div>
                  `
                  : ""
              }

              ${
                allowed.preselect
                  ? `
                    <div
                      class="ciReviewCommandComposer"
                      data-ci-review-preselect-composer
                      hidden
                    >
                      <form data-ci-review-preselect-form>
                        <div class="ciReviewCommandNotice">
                          <span class="material-symbols-rounded">
                            info
                          </span>

                          <span>
                            Preseleccionar conserva esta entrega
                            para continuar el proceso comercial.
                            No representa compra, pago ni
                            activación de derechos.
                          </span>
                        </div>

                        <label>
                          <span>
                            Mensaje para el Creator
                            <small>Opcional</small>
                          </span>

                          <textarea
                            rows="3"
                            maxlength="5000"
                            placeholder="Ej.: Tu entrega fue preseleccionada para continuar la evaluación…"
                            data-ci-review-preselect-feedback
                          ></textarea>
                        </label>

                        <label>
                          <span>
                            Resumen interno
                            <small>Opcional</small>
                          </span>

                          <textarea
                            rows="3"
                            maxlength="5000"
                            placeholder="Contexto interno para Protocol…"
                            data-ci-review-preselect-summary
                          ></textarea>
                        </label>

                        <label class="ciRightsConfirm">
                          <input
                            type="checkbox"
                            data-ci-review-preselect-confirm
                          />

                          <span>
                            Confirmo que esta acción es sólo
                            una preselección y no una compra.
                          </span>
                        </label>

                        <div class="ciReviewCommandComposer__actions">
                          <button
                            class="ciButton ciButton--secondary"
                            type="button"
                            data-ci-review-preselect-cancel
                          >
                            Cancelar
                          </button>

                          <button
                            class="ciButton ciButton--primary"
                            type="submit"
                            data-ci-review-preselect-submit
                            disabled
                          >
                            Preseleccionar
                          </button>
                        </div>

                        <div
                          class="ciInternalNoteComposer__status"
                          data-ci-review-preselect-status
                          role="status"
                          aria-live="polite"
                        ></div>
                      </form>
                    </div>
                  `
                  : ""
              }

              ${
                allowed.add_internal_note
                  ? `
                    <div
                      class="ciInternalNoteComposer"
                      data-ci-review-note-composer
                      hidden
                    >
                      <form data-ci-review-note-form>
                        <label>
                          <span>Nueva nota</span>

                          <textarea
                            rows="4"
                            maxlength="5000"
                            placeholder="Escribí contexto interno para Protocol…"
                            data-ci-review-note-body
                            required
                          ></textarea>
                        </label>

                        <div class="ciInternalNoteComposer__actions">
                          <button
                            class="ciButton ciButton--secondary"
                            type="button"
                            data-ci-review-note-cancel
                          >
                            Cancelar
                          </button>

                          <button
                            class="ciButton ciButton--primary"
                            type="submit"
                          >
                            Guardar nota
                          </button>
                        </div>

                        <div
                          class="ciInternalNoteComposer__status"
                          data-ci-review-note-status
                          role="status"
                          aria-live="polite"
                        ></div>
                      </form>
                    </div>
                  `
                  : ""
              }
            </section>

            <section class="ciReviewAsideCard">
              <div class="ciReviewSectionHeading">
                <div>
                  <h3>Notas internas</h3>
                  <p>Visibles sólo para Protocol.</p>
                </div>
              </div>

              ${renderList(
                "Notas",
                notes,
                "Todavía no hay notas internas."
              )}
            </section>
          </aside>
        </div>
      </div>
    `;

    root.querySelector("[data-ci-review-back]")
      ?.addEventListener(
        "click",
        clearSubmissionContext
      );

    root.querySelector("[data-ci-review-refresh]")
      ?.addEventListener("click", render);

    const preselectAction =
      root.querySelector(
        "[data-ci-review-preselect]"
      );

    const preselectComposer =
      root.querySelector(
        "[data-ci-review-preselect-composer]"
      );

    const preselectForm =
      root.querySelector(
        "[data-ci-review-preselect-form]"
      );

    const preselectFeedback =
      root.querySelector(
        "[data-ci-review-preselect-feedback]"
      );

    const preselectSummary =
      root.querySelector(
        "[data-ci-review-preselect-summary]"
      );

    const preselectConfirm =
      root.querySelector(
        "[data-ci-review-preselect-confirm]"
      );

    const preselectSubmit =
      root.querySelector(
        "[data-ci-review-preselect-submit]"
      );

    const preselectCancel =
      root.querySelector(
        "[data-ci-review-preselect-cancel]"
      );

    const preselectStatus =
      root.querySelector(
        "[data-ci-review-preselect-status]"
      );

    const requestChanges =
      root.querySelector(
        "[data-ci-review-request-changes]"
      );

    const changesComposer =
      root.querySelector(
        "[data-ci-review-changes-composer]"
      );

    const changesForm =
      root.querySelector(
        "[data-ci-review-changes-form]"
      );

    const changesFeedback =
      root.querySelector(
        "[data-ci-review-changes-feedback]"
      );

    const changesSummary =
      root.querySelector(
        "[data-ci-review-changes-summary]"
      );

    const changesCancel =
      root.querySelector(
        "[data-ci-review-changes-cancel]"
      );

    const changesStatus =
      root.querySelector(
        "[data-ci-review-changes-status]"
      );

    const rightsConfirm =
      root.querySelector(
        "[data-ci-rights-confirm]"
      );

    const rightsComplete =
      root.querySelector(
        "[data-ci-rights-complete]"
      );

    const rightsFlagToggle =
      root.querySelector(
        "[data-ci-rights-flag-toggle]"
      );

    const rightsFlagForm =
      root.querySelector(
        "[data-ci-rights-flag-form]"
      );

    const rightsFlagCancel =
      root.querySelector(
        "[data-ci-rights-flag-cancel]"
      );

    const rightsFlagReason =
      root.querySelector(
        "[data-ci-rights-flag-reason]"
      );

    const rightsStatus =
      root.querySelector(
        "[data-ci-rights-status]"
      );

    const startReview =
      root.querySelector(
        "[data-ci-review-start]"
      );

    const noteToggle =
      root.querySelector(
        "[data-ci-review-note-toggle]"
      );

    const noteComposer =
      root.querySelector(
        "[data-ci-review-note-composer]"
      );

    const noteForm =
      root.querySelector(
        "[data-ci-review-note-form]"
      );

    const noteCancel =
      root.querySelector(
        "[data-ci-review-note-cancel]"
      );

    const noteBody =
      root.querySelector(
        "[data-ci-review-note-body]"
      );

    const noteStatus =
      root.querySelector(
        "[data-ci-review-note-status]"
      );

    preselectAction?.addEventListener(
      "click",
      () => {
        if (!preselectComposer) return;

        preselectComposer.hidden = false;
        preselectFeedback?.focus();
      }
    );

    preselectConfirm?.addEventListener(
      "change",
      () => {
        if (!preselectSubmit) return;

        preselectSubmit.disabled =
          !preselectConfirm.checked;
      }
    );

    preselectCancel?.addEventListener(
      "click",
      () => {
        if (!preselectComposer) return;

        preselectForm?.reset();
        preselectComposer.hidden = true;

        if (preselectSubmit) {
          preselectSubmit.disabled = true;
        }

        if (preselectStatus) {
          preselectStatus.textContent = "";
          preselectStatus.dataset.tone = "";
        }
      }
    );

    preselectForm?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        if (!preselectConfirm?.checked) {
          return;
        }

        const feedback = String(
          preselectFeedback?.value || ""
        ).trim();

        const summary = String(
          preselectSummary?.value || ""
        ).trim();

        const controls =
          preselectForm.querySelectorAll(
            "textarea, input, button"
          );

        controls.forEach((control) => {
          control.disabled = true;
        });

        if (preselectStatus) {
          preselectStatus.textContent =
            "Preseleccionando…";
          preselectStatus.dataset.tone =
            "loading";
        }

        try {
          await window.PCIRuntime
            .preselectSubmission(
              submission.submission_id,
              feedback,
              summary
            );

          flash = {
            tone: "success",
            message:
              "Entrega preseleccionada correctamente."
          };

          await render();
        } catch (error) {
          controls.forEach((control) => {
            control.disabled = false;
          });

          if (preselectSubmit) {
            preselectSubmit.disabled =
              !preselectConfirm?.checked;
          }

          if (preselectStatus) {
            preselectStatus.textContent =
              error?.code ===
              "pci_rights_clearance_incomplete"
                ? "Rights debe estar completo antes de preseleccionar."
                : "No se pudo preseleccionar la entrega.";

            preselectStatus.dataset.tone =
              "error";
          }
        }
      }
    );

    requestChanges?.addEventListener(
      "click",
      () => {
        if (!changesComposer) return;

        changesComposer.hidden = false;
        changesFeedback?.focus();
      }
    );

    changesCancel?.addEventListener(
      "click",
      () => {
        if (!changesComposer) return;

        changesForm?.reset();
        changesComposer.hidden = true;

        if (changesStatus) {
          changesStatus.textContent = "";
          changesStatus.dataset.tone = "";
        }
      }
    );

    changesForm?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const feedback = String(
          changesFeedback?.value || ""
        ).trim();

        const summary = String(
          changesSummary?.value || ""
        ).trim();

        if (!feedback) {
          if (changesStatus) {
            changesStatus.textContent =
              "Escribí el mensaje para el Creator.";
            changesStatus.dataset.tone =
              "error";
          }

          return;
        }

        const controls =
          changesForm.querySelectorAll(
            "textarea, button"
          );

        controls.forEach((control) => {
          control.disabled = true;
        });

        if (changesStatus) {
          changesStatus.textContent =
            "Solicitando cambios…";
          changesStatus.dataset.tone =
            "loading";
        }

        try {
          await window.PCIRuntime
            .requestSubmissionChanges(
              submission.submission_id,
              feedback,
              summary
            );

          flash = {
            tone: "success",
            message:
              "Cambios solicitados al Creator."
          };

          await render();
        } catch (error) {
          controls.forEach((control) => {
            control.disabled = false;
          });

          if (changesStatus) {
            changesStatus.textContent =
              error?.code ===
              "pci_pre_purchase_revision_limit_reached"
                ? "Se alcanzó el límite de revisiones."
                : "No se pudieron solicitar los cambios.";

            changesStatus.dataset.tone =
              "error";
          }
        }
      }
    );

    rightsConfirm?.addEventListener(
      "change",
      () => {
        if (!rightsComplete) return;

        rightsComplete.disabled =
          !rightsConfirm.checked;
      }
    );

    rightsComplete?.addEventListener(
      "click",
      async () => {
        if (
          !currentVersion
            ?.submission_version_id
        ) {
          return;
        }

        rightsComplete.disabled = true;

        if (rightsStatus) {
          rightsStatus.textContent =
            "Aprobando Rights…";
          rightsStatus.dataset.tone = "loading";
        }

        try {
          await window.PCIRuntime
            .setSubmissionVersionRightsClearance(
              currentVersion
                .submission_version_id,
              "complete"
            );

          flash = {
            tone: "success",
            message:
              "Rights Clearance aprobado."
          };

          await render();
        } catch (error) {
          if (rightsStatus) {
            rightsStatus.textContent =
              "No se pudo aprobar Rights.";
            rightsStatus.dataset.tone = "error";
          }

          rightsComplete.disabled =
            !rightsConfirm?.checked;
        }
      }
    );

    rightsFlagToggle?.addEventListener(
      "click",
      () => {
        if (!rightsFlagForm) return;

        rightsFlagForm.hidden = false;
        rightsFlagReason?.focus();
      }
    );

    rightsFlagCancel?.addEventListener(
      "click",
      () => {
        if (!rightsFlagForm) return;

        rightsFlagForm.reset();
        rightsFlagForm.hidden = true;

        if (rightsStatus) {
          rightsStatus.textContent = "";
          rightsStatus.dataset.tone = "";
        }
      }
    );

    rightsFlagForm?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const reason = String(
          rightsFlagReason?.value || ""
        ).trim();

        if (!reason) {
          if (rightsStatus) {
            rightsStatus.textContent =
              "Escribí el motivo del flag.";
            rightsStatus.dataset.tone =
              "error";
          }
          return;
        }

        const controls =
          rightsFlagForm.querySelectorAll(
            "textarea, button"
          );

        controls.forEach((control) => {
          control.disabled = true;
        });

        if (rightsStatus) {
          rightsStatus.textContent =
            "Registrando flag…";
          rightsStatus.dataset.tone =
            "loading";
        }

        try {
          await window.PCIRuntime
            .setSubmissionVersionRightsClearance(
              currentVersion
                .submission_version_id,
              "flagged",
              reason
            );

          flash = {
            tone: "success",
            message:
              "Rights Clearance marcado para revisión."
          };

          await render();
        } catch (error) {
          controls.forEach((control) => {
            control.disabled = false;
          });

          if (rightsStatus) {
            rightsStatus.textContent =
              "No se pudo registrar el flag.";
            rightsStatus.dataset.tone =
              "error";
          }
        }
      }
    );

    startReview?.addEventListener(
      "click",
      async () => {
        if (
          !submission.submission_id ||
          !window.PCIRuntime
            ?.startSubmissionReview
        ) {
          return;
        }

        startReview.disabled = true;

        const originalHtml =
          startReview.innerHTML;

        startReview.innerHTML = `
          <span
            class="ciLoading__spinner"
            aria-hidden="true"
          ></span>

          <span>Iniciando…</span>
        `;

        try {
          await window.PCIRuntime
            .startSubmissionReview(
              submission.submission_id
            );

          flash = {
            tone: "success",
            message:
              "Revisión iniciada correctamente."
          };

          await render();
        } catch (error) {
          startReview.disabled = false;
          startReview.innerHTML =
            originalHtml;

          flash = {
            tone: "error",
            message:
              error?.code ===
              "pci_submission_not_reviewable"
                ? "La entrega ya no puede iniciar revisión."
                : "No se pudo iniciar la revisión."
          };

          await render();
        }
      }
    );

    noteToggle?.addEventListener(
      "click",
      () => {
        if (!noteComposer) return;

        noteComposer.hidden = false;
        noteBody?.focus();
      }
    );

    noteCancel?.addEventListener(
      "click",
      () => {
        if (!noteComposer) return;

        noteForm?.reset();

        if (noteStatus) {
          noteStatus.textContent = "";
          noteStatus.dataset.tone = "";
        }

        noteComposer.hidden = true;
      }
    );

    noteForm?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const body =
          String(noteBody?.value || "").trim();

        if (!body) {
          if (noteStatus) {
            noteStatus.textContent =
              "Escribí una nota antes de guardar.";
            noteStatus.dataset.tone = "error";
          }

          return;
        }

        const controls =
          noteForm.querySelectorAll(
            "textarea, button"
          );

        controls.forEach((control) => {
          control.disabled = true;
        });

        if (noteStatus) {
          noteStatus.textContent =
            "Guardando nota…";
          noteStatus.dataset.tone = "loading";
        }

        try {
          await window.PCIRuntime
            .addSubmissionInternalNote(
              submission.submission_id,
              body
            );

          flash = {
            tone: "success",
            message:
              "Nota interna guardada correctamente."
          };

          await render();
        } catch (error) {
          if (noteStatus) {
            noteStatus.textContent =
              error?.code === "invalid_internal_note"
                ? "La nota no es válida."
                : "No se pudo guardar la nota.";

            noteStatus.dataset.tone = "error";
          }

          controls.forEach((control) => {
            control.disabled = false;
          });
        }
      }
    );
  }

  async function render() {
    if (!isReview()) return;

    const seq = ++requestSeq;

    if (!window.PCIRuntime) {
      renderError("Cliente PCI no disponible.");
      return;
    }

    try {
      const connection =
        await window.PCIRuntime.getConnectionState();

      if (!isReview() || seq !== requestSeq) return;

      if (!connection?.signedIn) {
        renderError(
          "Volvé a Inicio y conectá la sesión operator."
        );
        return;
      }

      const id = submissionId();

      if (!id) {
        renderLoading("Cargando cola de revisión…");

        const queue =
          await window.PCIRuntime.getReviewQueue();

        if (!isReview() || seq !== requestSeq) return;

        renderQueue(queue);
        return;
      }

      renderLoading("Cargando Submission…");

      const [detail, context] = await Promise.all([
        window.PCIRuntime.getSubmissionDetail(id),
        window.PCIRuntime.getSubmissionReviewContext(id)
      ]);

      if (!isReview() || seq !== requestSeq) return;

      renderDetail(detail, context);
    } catch (error) {
      if (!isReview() || seq !== requestSeq) return;

      const message =
        error?.message === "Failed to fetch"
          ? "No pudimos contactar el runtime seguro."
          : error?.code === "pci_submission_not_found"
          ? "La Submission no existe en este workspace."
          : "No se pudo leer el contexto de revisión.";

      renderError(message);
    }
  }

  if (!window.__pciCreativeInsightsReviewBound) {
    window.__pciCreativeInsightsReviewBound = true;

    window.addEventListener("hashchange", render);

    document.addEventListener(
      "click",
      (event) => {
        const trigger =
          event.target.closest(
            "[data-ci-review-visualize]"
          );

        if (!trigger || !isReview()) return;

        openReviewPlaybackModal();
      }
    );

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
  document.addEventListener(
    "click",
    (event) => {
      if (!isReview()) return;

      const startConversation =
        event.target.closest(
          "[data-ci-review-start-conversation]"
        );

      if (startConversation) {
        startReviewConversation(
          startConversation
        );
        return;
      }

      const converse =
        event.target.closest(
          "[data-ci-review-converse]"
        );

      if (converse) {
        openNegotiationWorkspace(
          converse.dataset.negotiationId
        );
      }
    }
  );

})();
