(() => {
  "use strict";

  let requestSeq = 0;
  let detailSeq = 0;
  let items = [];
  let selectedId = "";
  let workspaceId = "";
  let search = "";
  let status = "all";
  let visibility = "all";
  let createBusy = false;
  let publishBusy = false;
  let inviteBusy = false;
  let selectedDetail = null;

  const clean = (value) =>
    String(value ?? "").trim();

  const esc = (value) =>
    clean(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const isHere = () =>
    clean(location.hash)
      .replace(/^#/, "")
      .toLowerCase() === "consignaciones";

  const stage = () =>
    document.querySelector(".ciStage");

  const workspaceFrom = (connection) =>
    clean(
      connection?.workspace ||
      connection?.workspaceId ||
      connection?.workspace_id
    );

  function money(amount, currency = "ARS") {
    const number = Number(amount);

    if (!Number.isFinite(number)) return "—";

    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: clean(currency).toUpperCase() || "ARS",
        maximumFractionDigits: 0
      }).format(number);
    } catch {
      return `${currency} ${number}`;
    }
  }

  function date(value) {
    if (!value) return "—";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(parsed);
  }

  function statusView(value) {
    const map = {
      draft: ["Borrador", "gray"],
      open: ["Activa", "blue"],
      paused: ["Pausada", "violet"],
      closed: ["Cerrada", "green"],
      cancelled: ["Cancelada", "gray"],
      archived: ["Archivada", "gray"]
    };

    return map[clean(value).toLowerCase()] || [
      clean(value) || "Sin estado",
      "gray"
    ];
  }

  function visibilityView(value) {
    return clean(value).toLowerCase() === "invite_only"
      ? ["Por invitación", "violet"]
      : ["Abierta", "blue"];
  }

  function pill(label, tone = "gray") {
    return `
      <span class="ciConsignmentPill is-${esc(tone)}">
        ${esc(label)}
      </span>
    `;
  }

  function tagsMarkup(tags) {
    const list = Array.isArray(tags)
      ? tags.map(clean).filter(Boolean)
      : [];

    return list.length
      ? list.map((tag) => pill(tag, "blue")).join("")
      : `<span class="ciConsignmentNoTags">Sin tags</span>`;
  }

  function currentVisibleItems() {
    const q = clean(search).toLowerCase();

    return items.filter((item) => {
      const revision = item?.current_revision || {};
      const tags = Array.isArray(revision?.matching_tags)
        ? revision.matching_tags
        : [];

      const searchable = [
        revision?.title,
        revision?.summary,
        item?.status,
        item?.visibility,
        ...tags
      ]
        .map(clean)
        .join(" ")
        .toLowerCase();

      return (
        (!q || searchable.includes(q)) &&
        (status === "all" || clean(item?.status) === status) &&
        (
          visibility === "all" ||
          clean(item?.visibility) === visibility
        )
      );
    });
  }

  function summaryCard(value, label) {
    return `
      <div class="ciConsignmentSummaryItem">
        <strong>${esc(value)}</strong>
        <span>${esc(label)}</span>
      </div>
    `;
  }

  function totalSettled() {
    const financials = items.map(
      (item) => item?.financial || {}
    );

    const currencies = new Set(
      financials
        .filter((f) => Number(f?.settled_amount || 0) > 0)
        .map((f) => clean(f?.currency).toUpperCase())
        .filter(Boolean)
    );

    if (currencies.size > 1) {
      return "Monedas mixtas";
    }

    const currency = [...currencies][0] || "ARS";

    const amount = financials.reduce(
      (sum, f) => sum + Number(f?.settled_amount || 0),
      0
    );

    return money(amount, currency);
  }

  function summaryMarkup() {
    const active = items.filter(
      (item) => clean(item?.status) === "open"
    ).length;

    const submissions = items.reduce(
      (sum, item) =>
        sum + Number(item?.counts?.submissions || 0),
      0
    );

    const acquired = items.reduce(
      (sum, item) =>
        sum + Number(item?.counts?.acquired || 0),
      0
    );

    return `
      <div class="ciConsignmentSummary">
        ${summaryCard(items.length, "Consignaciones")}
        ${summaryCard(active, "Activas")}
        ${summaryCard(submissions, "Entregas")}
        ${summaryCard(acquired, "Adquiridas")}
        ${summaryCard(totalSettled(), "Liquidado")}
      </div>
    `;
  }

  function rowMarkup(item) {
    const revision = item?.current_revision || {};
    const counts = item?.counts || {};
    const financial = item?.financial || {};

    const [statusLabel, statusTone] =
      statusView(item?.status);

    const [visibilityLabel, visibilityTone] =
      visibilityView(item?.visibility);

    const id = clean(item?.consignment_id);
    const selected = id === selectedId;

    return `
      <button
        type="button"
        class="ciConsignmentRow ${selected ? "is-selected" : ""}"
        data-ci-consignment-id="${esc(id)}"
      >
        <div class="ciConsignmentRowHead">
          <div>
            <strong>
              ${esc(revision?.title || "Consignación sin título")}
            </strong>

            <span>
              Revisión ${esc(revision?.revision_number || "—")}
            </span>
          </div>

          <span class="material-symbols-rounded">
            chevron_right
          </span>
        </div>

        <div class="ciConsignmentRowPills">
          ${pill(statusLabel, statusTone)}
          ${pill(visibilityLabel, visibilityTone)}
        </div>

        <div class="ciConsignmentRowTags">
          ${tagsMarkup(revision?.matching_tags)}
        </div>

        <div class="ciConsignmentRowMetrics">
          <span>
            <strong>${esc(counts?.participants || 0)}</strong>
            participantes
          </span>

          <span>
            <strong>${esc(counts?.submissions || 0)}</strong>
            entregas
          </span>

          <span>
            <strong>${esc(counts?.acquired || 0)}</strong>
            adquiridas
          </span>
        </div>

        <div class="ciConsignmentRowMoney">
          <span>Liquidado</span>

          <strong>
            ${esc(
              money(
                financial?.settled_amount || 0,
                financial?.currency || revision?.currency || "ARS"
              )
            )}
          </strong>
        </div>
      </button>
    `;
  }

  function renderRows() {
    const root = document.querySelector(
      "[data-ci-consignment-rows]"
    );

    if (!root) return;

    const visible = currentVisibleItems();

    if (
      selectedId &&
      !visible.some(
        (item) => clean(item?.consignment_id) === selectedId
      )
    ) {
      selectedId = clean(visible[0]?.consignment_id);
    }

    root.innerHTML = visible.length
      ? visible.map(rowMarkup).join("")
      : `
        <div class="ciConsignmentEmpty">
          <span class="material-symbols-rounded">search_off</span>
          <strong>Sin resultados</strong>
          <span>No hay consignaciones para estos filtros.</span>
        </div>
      `;
  }

  function field(label, value) {
    return `
      <div class="ciConsignmentField">
        <span>${esc(label)}</span>
        <strong>${esc(value ?? "—")}</strong>
      </div>
    `;
  }

  function candidateMarkup(candidate) {
    const match = candidate?.matching || {};
    const capacity = candidate?.capacity || {};
    const history = candidate?.history || {};
    const relation = candidate?.relationship || {};

    const required = Number(match?.required_tag_count || 0);
    const matched = Number(match?.match_count || 0);

    const available = Boolean(
      capacity?.available_for_new_assignment
    );

    return `
      <article class="ciConsignmentCandidate">
        <div class="ciConsignmentCandidateHead">
          <div>
            <strong>${esc(candidate?.display_name || "Creator")}</strong>
            <span>${esc(relation?.provider_tier || "Sin tier")}</span>
          </div>

          ${pill(
            available ? "Disponible" : "Sin capacidad",
            available ? "blue" : "gray"
          )}
        </div>

        <div class="ciConsignmentMatchValue">
          <strong>${matched} / ${required}</strong>
          <span>coincidencias</span>
        </div>

        <div class="ciConsignmentCandidateTags">
          ${
            Array.isArray(match?.matched_tags) &&
            match.matched_tags.length
              ? `
                <div>
                  <span>Coincide</span>
                  ${match.matched_tags
                    .map((tag) => pill(tag, "green"))
                    .join("")}
                </div>
              `
              : ""
          }

          ${
            Array.isArray(match?.missing_tags) &&
            match.missing_tags.length
              ? `
                <div>
                  <span>Faltan</span>
                  ${match.missing_tags
                    .map((tag) => pill(tag, "gray"))
                    .join("")}
                </div>
              `
              : ""
          }
        </div>

        <div class="ciConsignmentCandidateFacts">
          ${field(
            "Trabajos",
            `${capacity?.active_jobs_count ?? 0} / ${
              capacity?.max_simultaneous_jobs ?? "∞"
            }`
          )}

          ${field(
            "Obligaciones",
            `${capacity?.open_obligations_count ?? 0} / ${
              capacity?.max_open_obligations ?? "∞"
            }`
          )}

          ${field("Entregas", history?.submissions ?? 0)}
          ${field("Adquiridas", history?.acquired ?? 0)}
          ${field("Compras", history?.purchases ?? 0)}
          ${field("Pagado", money(history?.paid_amount || 0, "ARS"))}
        </div>
      </article>
    `;
  }


  function createIdempotencyKey() {
    if (
      !window.crypto ||
      typeof window.crypto.randomUUID !== "function"
    ) {
      const error = new Error(
        "pci_idempotency_generator_unavailable"
      );
      error.code =
        "pci_idempotency_generator_unavailable";
      throw error;
    }

    return window.crypto.randomUUID();
  }

  function optionalPositiveInteger(value) {
    const raw = clean(value);
    if (!raw) return null;

    const number = Number(raw);

    return Number.isSafeInteger(number) && number > 0
      ? number
      : false;
  }

  function optionalNonNegativeInteger(value) {
    const raw = clean(value);
    if (!raw) return null;

    const number = Number(raw);

    return Number.isSafeInteger(number) && number >= 0
      ? number
      : false;
  }

  function optionalNonNegativeNumber(value) {
    const raw = clean(value);
    if (!raw) return null;

    const number = Number(raw);

    return Number.isFinite(number) && number >= 0
      ? number
      : false;
  }

  function localDateTimeToIso(value) {
    const raw = clean(value);
    if (!raw) return null;

    const parsed = new Date(raw);

    return Number.isNaN(parsed.getTime())
      ? false
      : parsed.toISOString();
  }

  function isoToLocalDateTime(value) {
    const raw = clean(value);
    if (!raw) return "";

    const parsed = new Date(raw);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    const pad = (number) =>
      String(number).padStart(2, "0");

    return [
      parsed.getFullYear(),
      "-",
      pad(parsed.getMonth() + 1),
      "-",
      pad(parsed.getDate()),
      "T",
      pad(parsed.getHours()),
      ":",
      pad(parsed.getMinutes())
    ].join("");
  }

  function objectSnapshot(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? { ...value }
      : {};
  }

  function setDialogValue(dialog, selector, value) {
    const field = dialog.querySelector(selector);

    if (field) {
      field.value =
        value === null || value === undefined
          ? ""
          : String(value);
    }
  }

  function isStandardRights(snapshot) {
    const rights = objectSnapshot(snapshot);

    return (
      rights.scope === "purchased_asset_only" &&
      rights.activation === "after_payment" &&
      rights.pre_purchase_use === "evaluation_only"
    );
  }

  function matchingTagsFrom(value) {
    const tags = clean(value)
      .split(",")
      .map(clean)
      .filter(Boolean);

    const result = [];
    const seen = new Set();

    for (const tag of tags) {
      const key = tag.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        result.push(tag);
      }
    }

    if (
      result.length > 20 ||
      result.some((tag) => tag.length > 60)
    ) {
      return null;
    }

    return result;
  }

  function createErrorMessage(error) {
    const code = clean(error?.code);

    const map = {
      pci_consignment_title_required:
        "Ingresá un título para la consignación.",
      pci_consignment_matching_tags_invalid:
        "Revisá los tags. Podés usar hasta 20, separados por comas.",
      pci_invalid_consignment_visibility:
        "La visibilidad seleccionada no es válida.",
      pci_invalid_submission_limit:
        "El máximo de entregas por Creator debe ser mayor a cero.",
      pci_invalid_version_limit:
        "El máximo de versiones por entrega debe ser mayor a cero.",
      pci_invalid_consignment_window:
        "La fecha de cierre debe ser posterior a la fecha de apertura.",
      invalid_consignment_datetime:
        "Revisá las fechas de apertura y cierre.",
      idempotency_key_required:
        "No pudimos generar una clave segura para guardar el borrador.",
      pci_auth_session_required:
        "Tu sesión venció. Volvé a iniciar sesión."
    };

    return map[code] ||
      "No pudimos guardar la consignación. Revisá los datos e intentá nuevamente.";
  }

  function ensureCreateDialog() {
    let dialog = document.querySelector(
      "[data-ci-consignment-create-dialog]"
    );

    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "ciConsignmentDialog";
    dialog.setAttribute(
      "data-ci-consignment-create-dialog",
      ""
    );

    dialog.innerHTML = `
      <div class="ciConsignmentDialog__surface">
        <header class="ciConsignmentDialog__header">
          <div>
            <span data-ci-consignment-dialog-kicker>CONSIGNACIONES</span>
            <h2 data-ci-consignment-dialog-title>Nueva consignación</h2>
            <p data-ci-consignment-dialog-description>
              Armá el brief operativo. Se guardará como borrador
              y podrás revisarlo antes de publicarlo.
            </p>
          </div>

          <button
            type="button"
            class="ciConsignmentDialog__close"
            data-ci-consignment-create-close
            aria-label="Cerrar"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >close</span>
          </button>
        </header>

        <form
          class="ciConsignmentDialog__form"
          data-ci-consignment-create-form
        >
          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>INFORMACIÓN</span>
              <h3>Base del brief</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field is-full">
                <span>Título</span>
                <input
                  type="text"
                  maxlength="180"
                  required
                  autocomplete="off"
                  placeholder="Ej. Pelota interactiva · UGC demostración"
                  data-ci-consignment-create-title
                >
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Resumen</span>
                <textarea
                  maxlength="3000"
                  placeholder="Contexto breve para entender la consignación."
                  data-ci-consignment-create-summary
                ></textarea>
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Objetivo</span>
                <textarea
                  maxlength="3000"
                  placeholder="Qué tiene que conseguir el creativo."
                  data-ci-consignment-create-objective
                ></textarea>
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>DIRECCIÓN CREATIVA</span>
              <h3>Qué queremos ver</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field is-full">
                <span>Ángulo creativo</span>
                <textarea
                  maxlength="3000"
                  placeholder="Problema, enfoque o concepto central."
                  data-ci-consignment-create-angle
                ></textarea>
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Hook</span>
                <textarea
                  maxlength="3000"
                  placeholder="Guía para los primeros segundos."
                  data-ci-consignment-create-hook
                ></textarea>
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Tipo de pieza</span>
                <select data-ci-consignment-create-format-type>
                  <option value="video" selected>Video</option>
                  <option value="image">Imagen</option>
                </select>
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Orientación</span>
                <select data-ci-consignment-create-orientation>
                  <option value="vertical" selected>Vertical</option>
                  <option value="square">Cuadrada</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Indicaciones de formato</span>
                <textarea
                  maxlength="3000"
                  placeholder="Duración, encuadre, edición, audio u otras condiciones."
                  data-ci-consignment-create-format-notes
                ></textarea>
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Criterios de aceptación</span>
                <textarea
                  maxlength="3000"
                  placeholder="Qué condiciones debe cumplir para considerarse correcto."
                  data-ci-consignment-create-acceptance
                ></textarea>
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>MATCHING</span>
              <h3>Perfil buscado</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field is-full">
                <span>Tags requeridos <small>separados por comas</small></span>
                <input
                  type="text"
                  maxlength="1220"
                  autocomplete="off"
                  placeholder="UGC, Mascotas, Producto"
                  data-ci-consignment-create-tags
                >
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>COMERCIAL</span>
              <h3>Oferta y límites</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field">
                <span>Precio base</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputmode="decimal"
                  placeholder="30000"
                  data-ci-consignment-create-price
                >
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Moneda</span>
                <select data-ci-consignment-create-currency>
                  <option value="ARS" selected>ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Cupos</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  placeholder="Sin límite"
                  data-ci-consignment-create-slots
                >
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Revisiones incluidas</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  value="1"
                  data-ci-consignment-create-revisions
                >
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Entregas por Creator</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value="1"
                  data-ci-consignment-create-max-submissions
                >
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Versiones por entrega</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value="3"
                  data-ci-consignment-create-max-versions
                >
              </label>

              <label class="ciConsignmentDialog__field is-full">
                <span>Bonus <small>opcional</small></span>
                <textarea
                  maxlength="3000"
                  placeholder="Condición del bonus y criterio de pago."
                  data-ci-consignment-create-bonus
                ></textarea>
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>VISIBILIDAD</span>
              <h3>Quién puede verla</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field is-full">
                <span>Visibilidad</span>
                <select data-ci-consignment-create-visibility>
                  <option value="open" selected>Abierta</option>
                  <option value="invite_only">Sólo por invitación</option>
                </select>
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>VENTANA</span>
              <h3>Disponibilidad</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field">
                <span>Desde <small>opcional</small></span>
                <input
                  type="datetime-local"
                  data-ci-consignment-create-opens
                >
              </label>

              <label class="ciConsignmentDialog__field">
                <span>Hasta <small>opcional</small></span>
                <input
                  type="datetime-local"
                  data-ci-consignment-create-closes
                >
              </label>
            </div>
          </section>

          <section class="ciConsignmentDialog__section">
            <div class="ciConsignmentDialog__sectionHead">
              <span>DERECHOS</span>
              <h3>Paquete de uso</h3>
            </div>

            <div class="ciConsignmentDialog__grid">
              <label class="ciConsignmentDialog__field is-full">
                <span>Derechos</span>
                <select data-ci-consignment-create-rights>
                  <option value="standard" selected>
                    Asset adquirido · uso habilitado después del pago
                  </option>
                  <option value="unset">
                    Sin paquete definido todavía
                  </option>
                </select>
              </label>
            </div>
          </section>

          <div class="ciConsignmentDialog__notice">
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >info</span>

            <p data-ci-consignment-dialog-notice>
              Guardar no publica la consignación. Primero quedará
              en borrador para revisión y publicación explícita.
            </p>
          </div>

          <div
            class="ciConsignmentDialog__feedback"
            data-ci-consignment-create-feedback
            role="status"
            aria-live="polite"
          ></div>

          <div class="ciConsignmentDialog__actions">
            <button
              type="button"
              class="ciConsignmentDialog__secondary"
              data-ci-consignment-create-close
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="ciConsignmentDialog__primary"
              data-ci-consignment-create-submit
            >
              Guardar borrador
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener("click", (event) => {
      if (
        event.target.closest(
          "[data-ci-consignment-create-close]"
        )
      ) {
        if (!createBusy) dialog.close();
        return;
      }

      if (event.target === dialog && !createBusy) {
        dialog.close();
      }
    });

    dialog.addEventListener("cancel", (event) => {
      if (createBusy) {
        event.preventDefault();
      }
    });

    dialog.addEventListener("close", () => {
      const form = dialog.querySelector(
        "[data-ci-consignment-create-form]"
      );

      const feedback = dialog.querySelector(
        "[data-ci-consignment-create-feedback]"
      );

      form?.reset();

      if (feedback) {
        feedback.textContent = "";
        feedback.removeAttribute("data-state");
      }

      dialog.dataset.idempotencyKey = "";
      dialog.dataset.mode = "";
      dialog.dataset.consignmentId = "";
      dialog.dataset.rightsSnapshot = "";
      createBusy = false;

      // PCI CONSIGNMENT DIALOG BUTTON RESET
      const submit = dialog.querySelector(
        "[data-ci-consignment-create-submit]"
      );

      if (submit) {
        submit.disabled = false;
      }
    });

    dialog.addEventListener("input", () => {
      if (!createBusy) {
        dialog.dataset.idempotencyKey = "";
      }
    });

    dialog.addEventListener("submit", async (event) => {
      const form = event.target.closest(
        "[data-ci-consignment-create-form]"
      );

      if (!form) return;

      event.preventDefault();

      if (createBusy) return;

      const title = clean(
        form.querySelector(
          "[data-ci-consignment-create-title]"
        )?.value
      );

      const tags = matchingTagsFrom(
        form.querySelector(
          "[data-ci-consignment-create-tags]"
        )?.value
      );

      const basePrice = optionalNonNegativeNumber(
        form.querySelector(
          "[data-ci-consignment-create-price]"
        )?.value
      );

      const slots = optionalPositiveInteger(
        form.querySelector(
          "[data-ci-consignment-create-slots]"
        )?.value
      );

      const revisions = optionalNonNegativeInteger(
        form.querySelector(
          "[data-ci-consignment-create-revisions]"
        )?.value
      );

      const maxSubmissions = optionalPositiveInteger(
        form.querySelector(
          "[data-ci-consignment-create-max-submissions]"
        )?.value
      );

      const maxVersions = optionalPositiveInteger(
        form.querySelector(
          "[data-ci-consignment-create-max-versions]"
        )?.value
      );

      const opensAt = localDateTimeToIso(
        form.querySelector(
          "[data-ci-consignment-create-opens]"
        )?.value
      );

      const closesAt = localDateTimeToIso(
        form.querySelector(
          "[data-ci-consignment-create-closes]"
        )?.value
      );

      const feedback = dialog.querySelector(
        "[data-ci-consignment-create-feedback]"
      );

      if (!title) {
        if (feedback) {
          feedback.textContent =
            "Ingresá un título para la consignación.";
          feedback.dataset.state = "error";
        }
        return;
      }

      if (tags === null) {
        if (feedback) {
          feedback.textContent =
            "Revisá los tags. Podés usar hasta 20, separados por comas.";
          feedback.dataset.state = "error";
        }
        return;
      }

      if (
        basePrice === false ||
        slots === false ||
        revisions === false ||
        maxSubmissions === false ||
        maxVersions === false
      ) {
        if (feedback) {
          feedback.textContent =
            "Revisá los valores numéricos del bloque Comercial.";
          feedback.dataset.state = "error";
        }
        return;
      }

      if (opensAt === false || closesAt === false) {
        if (feedback) {
          feedback.textContent =
            "Revisá las fechas de apertura y cierre.";
          feedback.dataset.state = "error";
        }
        return;
      }

      if (
        opensAt &&
        closesAt &&
        Date.parse(closesAt) <= Date.parse(opensAt)
      ) {
        if (feedback) {
          feedback.textContent =
            "La fecha de cierre debe ser posterior a la fecha de apertura.";
          feedback.dataset.state = "error";
        }
        return;
      }

      const summary = clean(
        form.querySelector(
          "[data-ci-consignment-create-summary]"
        )?.value
      );

      const objective = clean(
        form.querySelector(
          "[data-ci-consignment-create-objective]"
        )?.value
      );

      const creativeAngle = clean(
        form.querySelector(
          "[data-ci-consignment-create-angle]"
        )?.value
      );

      const hookGuidance = clean(
        form.querySelector(
          "[data-ci-consignment-create-hook]"
        )?.value
      );

      const formatType = clean(
        form.querySelector(
          "[data-ci-consignment-create-format-type]"
        )?.value
      ) || "video";

      const orientation = clean(
        form.querySelector(
          "[data-ci-consignment-create-orientation]"
        )?.value
      ) || "vertical";

      const formatNotes = clean(
        form.querySelector(
          "[data-ci-consignment-create-format-notes]"
        )?.value
      );

      const acceptance = clean(
        form.querySelector(
          "[data-ci-consignment-create-acceptance]"
        )?.value
      );

      const bonus = clean(
        form.querySelector(
          "[data-ci-consignment-create-bonus]"
        )?.value
      );

      const currency = clean(
        form.querySelector(
          "[data-ci-consignment-create-currency]"
        )?.value
      ).toUpperCase() || "ARS";

      const visibilityValue = clean(
        form.querySelector(
          "[data-ci-consignment-create-visibility]"
        )?.value
      ) || "open";

      const rights = clean(
        form.querySelector(
          "[data-ci-consignment-create-rights]"
        )?.value
      );

      const editMode =
        dialog.dataset.mode === "edit";

      const sourceRevision =
        editMode
          ? (selectedDetail?.current_revision || {})
          : {};

      const formatRequirements =
        objectSnapshot(sourceRevision?.format_requirements);

      formatRequirements.type = formatType;
      formatRequirements.orientation = orientation;

      if (formatNotes) {
        formatRequirements.notes = formatNotes;
      } else {
        delete formatRequirements.notes;
      }

      const acceptanceCriteria =
        objectSnapshot(sourceRevision?.acceptance_criteria);

      if (acceptance) {
        acceptanceCriteria.notes = acceptance;
      } else {
        delete acceptanceCriteria.notes;
      }

      const performanceBonus =
        objectSnapshot(
          sourceRevision?.performance_bonus_policy
        );

      performanceBonus.enabled = Boolean(bonus);

      if (bonus) {
        performanceBonus.description = bonus;
      } else {
        delete performanceBonus.description;
      }

      let rightsSnapshot = {};

      if (rights === "standard") {
        rightsSnapshot = {
          scope: "purchased_asset_only",
          activation: "after_payment",
          pre_purchase_use: "evaluation_only"
        };
      } else if (rights === "preserve" && editMode) {
        try {
          rightsSnapshot =
            objectSnapshot(
              JSON.parse(
                dialog.dataset.rightsSnapshot || "{}"
              )
            );
        } catch (_) {
          rightsSnapshot =
            objectSnapshot(
              sourceRevision?.rights_package_snapshot
            );
        }
      }

      const payload = {
        revision: {
          title,
          summary: summary || null,
          objective: objective || null,
          creative_angle: creativeAngle || null,
          hook_guidance: hookGuidance || null,
          matching_tags: tags,
          format_requirements: formatRequirements,
          acceptance_criteria: acceptanceCriteria,
          subject_type:
            editMode
              ? (sourceRevision?.subject_type ?? null)
              : null,
          subject_ref:
            editMode
              ? (sourceRevision?.subject_ref ?? null)
              : null,
          subject_snapshot:
            editMode
              ? objectSnapshot(
                  sourceRevision?.subject_snapshot
                )
              : {},
          base_price_amount: basePrice,
          currency,
          slots_available: slots,
          performance_bonus_policy: performanceBonus,
          pre_purchase_revision_limit: revisions,
          rights_package_snapshot: rightsSnapshot
        },
        visibility: visibilityValue,
        max_submissions_per_creator: maxSubmissions,
        max_versions_per_submission: maxVersions,
        opens_at: opensAt,
        closes_at: closesAt,
        idempotency_key:
          clean(dialog.dataset.idempotencyKey) ||
          createIdempotencyKey()
      };

      dialog.dataset.idempotencyKey =
        payload.idempotency_key;

      const submit = dialog.querySelector(
        "[data-ci-consignment-create-submit]"
      );

      createBusy = true;

      if (submit) {
        submit.disabled = true;
        submit.textContent =
          editMode ? "Guardando cambios…" : "Guardando…";
      }

      if (feedback) {
        feedback.textContent = "";
        feedback.removeAttribute("data-state");
      }

      try {
        const consignmentId =
          editMode
            ? clean(dialog.dataset.consignmentId)
            : "";

        if (editMode && !consignmentId) {
          const error =
            new Error("invalid_consignment_id");

          error.code = "invalid_consignment_id";
          throw error;
        }

        const path =
          editMode
            ? `/v1/workspaces/${encodeURIComponent(
                workspaceId
              )}/consignments/${encodeURIComponent(
                consignmentId
              )}/draft`
            : `/v1/workspaces/${encodeURIComponent(
                workspaceId
              )}/consignments`;

        const response = await window.PCIRuntime.request(
          path,
          {
            method: "POST",
            body: JSON.stringify(payload)
          }
        );

        selectedId =
          editMode
            ? consignmentId
            : clean(response?.consignment_id);

        dialog.close();

        await render();

      } catch (error) {
        console.error(
          "[PCI consignments create]",
          error
        );

        if (feedback) {
          feedback.textContent =
            createErrorMessage(error);
          feedback.dataset.state = "error";
        }

      } finally {
        createBusy = false;

        if (dialog.open && submit) {
          submit.disabled = false;
          submit.textContent =
            editMode ? "Guardar cambios" : "Guardar borrador";
        }
      }
    });

    return dialog;
  }

  function prepareDraftDialog(dialog, mode) {
    const form = dialog.querySelector(
      "[data-ci-consignment-create-form]"
    );

    form?.reset();

    dialog.dataset.mode = mode;
    dialog.dataset.idempotencyKey = "";
    dialog.dataset.consignmentId = "";
    dialog.dataset.rightsSnapshot = "";

    const rightsSelect = dialog.querySelector(
      "[data-ci-consignment-create-rights]"
    );

    rightsSelect
      ?.querySelector('option[value="preserve"]')
      ?.remove();

    const feedback = dialog.querySelector(
      "[data-ci-consignment-create-feedback]"
    );

    if (feedback) {
      feedback.textContent = "";
      feedback.removeAttribute("data-state");
    }

    return form;
  }

  function setDraftDialogCopy(
    dialog,
    {
      title,
      description,
      notice,
      submitLabel
    }
  ) {
    const titleNode = dialog.querySelector(
      "[data-ci-consignment-dialog-title]"
    );

    const descriptionNode = dialog.querySelector(
      "[data-ci-consignment-dialog-description]"
    );

    const noticeNode = dialog.querySelector(
      "[data-ci-consignment-dialog-notice]"
    );

    const submitNode = dialog.querySelector(
      "[data-ci-consignment-create-submit]"
    );

    if (titleNode) titleNode.textContent = title;
    if (descriptionNode) {
      descriptionNode.textContent = description;
    }
    if (noticeNode) noticeNode.textContent = notice;
    if (submitNode) submitNode.textContent = submitLabel;
  }

  function openCreateDialog() {
    const dialog = ensureCreateDialog();

    prepareDraftDialog(dialog, "create");

    setDraftDialogCopy(dialog, {
      title: "Nueva consignación",
      description:
        "Armá el brief operativo. Se guardará como borrador y podrás revisarlo antes de publicarlo.",
      notice:
        "Guardar no publica la consignación. Primero quedará en borrador para revisión y publicación explícita.",
      submitLabel: "Guardar borrador"
    });

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-revisions]",
      1
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-max-submissions]",
      1
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-max-versions]",
      3
    );

    dialog.showModal();

    dialog.querySelector(
      "[data-ci-consignment-create-title]"
    )?.focus();
  }

  function openEditDraftDialog() {
    const detail = selectedDetail;
    const lifecycle = detail?.lifecycle || {};
    const allowed = lifecycle?.allowed_actions || {};

    if (!allowed.update_initial_draft) {
      return;
    }

    const dialog = ensureCreateDialog();
    prepareDraftDialog(dialog, "edit");

    const consignment = detail?.consignment || {};
    const revision = detail?.current_revision || {};
    const format =
      objectSnapshot(revision?.format_requirements);
    const acceptance =
      objectSnapshot(revision?.acceptance_criteria);
    const bonus =
      objectSnapshot(revision?.performance_bonus_policy);
    const rights =
      objectSnapshot(revision?.rights_package_snapshot);

    dialog.dataset.consignmentId =
      clean(consignment?.consignment_id);

    dialog.dataset.rightsSnapshot =
      JSON.stringify(rights);

    setDraftDialogCopy(dialog, {
      title: "Editar borrador",
      description:
        "Actualizá la revisión 1. Se guardará el snapshot completo sin publicarlo.",
      notice:
        "Guardar cambios mantiene la consignación en borrador. Publicar seguirá siendo una acción separada.",
      submitLabel: "Guardar cambios"
    });

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-title]",
      revision?.title
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-summary]",
      revision?.summary
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-objective]",
      revision?.objective
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-angle]",
      revision?.creative_angle
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-hook]",
      revision?.hook_guidance
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-format-type]",
      format?.type || "video"
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-orientation]",
      format?.orientation || "vertical"
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-format-notes]",
      format?.notes
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-acceptance]",
      acceptance?.notes
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-tags]",
      Array.isArray(revision?.matching_tags)
        ? revision.matching_tags.join(", ")
        : ""
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-price]",
      revision?.base_price_amount
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-currency]",
      revision?.currency || "ARS"
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-slots]",
      revision?.slots_available
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-revisions]",
      revision?.pre_purchase_revision_limit
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-max-submissions]",
      consignment?.max_submissions_per_creator
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-max-versions]",
      consignment?.max_versions_per_submission
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-bonus]",
      bonus?.enabled ? bonus?.description : ""
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-visibility]",
      consignment?.visibility || "open"
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-opens]",
      isoToLocalDateTime(consignment?.opens_at)
    );

    setDialogValue(
      dialog,
      "[data-ci-consignment-create-closes]",
      isoToLocalDateTime(consignment?.closes_at)
    );

    const rightsSelect = dialog.querySelector(
      "[data-ci-consignment-create-rights]"
    );

    if (rightsSelect) {
      if (isStandardRights(rights)) {
        rightsSelect.value = "standard";
      } else if (Object.keys(rights).length) {
        const option = document.createElement("option");
        option.value = "preserve";
        option.textContent = "Mantener paquete actual";
        rightsSelect.appendChild(option);
        rightsSelect.value = "preserve";
      } else {
        rightsSelect.value = "unset";
      }
    }

    dialog.showModal();

    dialog.querySelector(
      "[data-ci-consignment-create-title]"
    )?.focus();
  }

  function ensurePublishDialog() {
    let dialog = document.querySelector(
      "[data-ci-consignment-publish-dialog]"
    );

    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className =
      "ciConsignmentDialog ciConsignmentPublishDialog";

    dialog.setAttribute(
      "data-ci-consignment-publish-dialog",
      ""
    );

    dialog.innerHTML = `
      <div class="ciConsignmentDialog__surface">
        <header class="ciConsignmentDialog__header">
          <div>
            <span>CONSIGNACIONES</span>
            <h2>Publicar consignación</h2>
            <p data-ci-consignment-publish-description>
              Revisá el borrador antes de publicarlo.
            </p>
          </div>

          <button
            type="button"
            class="ciConsignmentDialog__close"
            data-ci-consignment-publish-close
            aria-label="Cerrar"
          >
            <span class="material-symbols-rounded">close</span>
          </button>
        </header>

        <div class="ciConsignmentDialog__notice">
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >publish</span>

          <p>
            Publicar cambiará el estado de Borrador a Activa.
            Es una acción explícita y separada del guardado.
          </p>
        </div>

        <div
          class="ciConsignmentDialog__feedback"
          data-ci-consignment-publish-feedback
          role="status"
          aria-live="polite"
        ></div>

        <div class="ciConsignmentDialog__actions">
          <button
            type="button"
            class="ciConsignmentDialog__secondary"
            data-ci-consignment-publish-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="ciConsignmentDialog__primary"
            data-ci-consignment-publish-confirm
          >
            Publicar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener("click", async (event) => {
      if (
        event.target.closest(
          "[data-ci-consignment-publish-close]"
        )
      ) {
        if (!publishBusy) dialog.close();
        return;
      }

      if (event.target === dialog && !publishBusy) {
        dialog.close();
        return;
      }

      if (
        !event.target.closest(
          "[data-ci-consignment-publish-confirm]"
        )
      ) {
        return;
      }

      if (publishBusy) return;

      const id = clean(dialog.dataset.consignmentId);

      if (
        !id ||
        !selectedDetail?.lifecycle?.allowed_actions
          ?.publish_initial
      ) {
        return;
      }

      const feedback = dialog.querySelector(
        "[data-ci-consignment-publish-feedback]"
      );

      const confirm = dialog.querySelector(
        "[data-ci-consignment-publish-confirm]"
      );

      const idempotencyKey =
        clean(dialog.dataset.idempotencyKey) ||
        createIdempotencyKey();

      dialog.dataset.idempotencyKey =
        idempotencyKey;

      publishBusy = true;

      if (confirm) {
        confirm.disabled = true;
        confirm.textContent = "Publicando…";
      }

      if (feedback) {
        feedback.textContent = "";
        feedback.removeAttribute("data-state");
      }

      try {
        await window.PCIRuntime.request(
          `/v1/workspaces/${encodeURIComponent(
            workspaceId
          )}/consignments/${encodeURIComponent(
            id
          )}/publish`,
          {
            method: "POST",
            body: JSON.stringify({
              idempotency_key: idempotencyKey
            })
          }
        );

        selectedId = id;
        dialog.close();

        await render();

      } catch (error) {
        console.error(
          "[PCI consignments publish]",
          error
        );

        if (feedback) {
          feedback.textContent =
            createErrorMessage(error);
          feedback.dataset.state = "error";
        }

      } finally {
        publishBusy = false;

        if (dialog.open && confirm) {
          confirm.disabled = false;
          confirm.textContent = "Publicar";
        }
      }
    });

    dialog.addEventListener("cancel", (event) => {
      if (publishBusy) {
        event.preventDefault();
      }
    });

    dialog.addEventListener("close", () => {
      dialog.dataset.consignmentId = "";
      dialog.dataset.idempotencyKey = "";
      publishBusy = false;

      const confirm = dialog.querySelector(
        "[data-ci-consignment-publish-confirm]"
      );

      if (confirm) {
        confirm.disabled = false;
        confirm.textContent = "Publicar";
      }
    });

    return dialog;
  }

  function openPublishDialog() {
    const detail = selectedDetail;
    const allowed =
      detail?.lifecycle?.allowed_actions || {};

    if (!allowed.publish_initial) {
      return;
    }

    const dialog = ensurePublishDialog();
    const revision = detail?.current_revision || {};

    dialog.dataset.consignmentId =
      clean(detail?.consignment?.consignment_id);

    dialog.dataset.idempotencyKey = "";

    const description = dialog.querySelector(
      "[data-ci-consignment-publish-description]"
    );

    if (description) {
      description.textContent =
        `Vas a publicar “${clean(
          revision?.title
        ) || "esta consignación"}”.`;
    }

    const feedback = dialog.querySelector(
      "[data-ci-consignment-publish-feedback]"
    );

    if (feedback) {
      feedback.textContent = "";
      feedback.removeAttribute("data-state");
    }

    dialog.showModal();
  }


  function invitationErrorMessage(error) {
    const code = clean(error?.code);

    const map = {
      pci_consignment_not_open:
        "La consignación ya no está disponible para nuevas invitaciones.",
      pci_consignment_invitation_mode_required:
        "Esta consignación no está configurada para invitaciones dirigidas.",
      pci_consignment_revision_not_published:
        "La revisión actual todavía no está publicada.",
      pci_consignment_creator_not_eligible:
        "Uno de los Creators seleccionados ya no es elegible.",
      pci_consignment_creator_participation_conflict:
        "Uno de los Creators seleccionados ya tiene otra participación en esta consignación.",
      pci_consignment_invite_creator_ids_invalid:
        "Seleccioná al menos un Creator válido.",
      pci_auth_session_required:
        "Tu sesión venció. Volvé a iniciar sesión."
    };

    return map[code] ||
      "No pudimos enviar las invitaciones. Intentá nuevamente.";
  }

  function inviteCandidateStatus(candidate) {
    const participation =
      clean(candidate?.current_participation_status);

    if (participation === "invited") {
      return ["Invitado", false];
    }

    if (participation === "active") {
      return ["Activo", false];
    }

    if (participation) {
      return ["No disponible", false];
    }

    if (!candidate?.eligible_for_assignment) {
      return ["No elegible", false];
    }

    if (!candidate?.capacity?.available_for_new_assignment) {
      return ["Sin capacidad", false];
    }

    return ["Disponible", true];
  }

  function inviteCandidateMarkup(candidate) {
    const creatorId = clean(candidate?.creator_id);
    const [statusLabel, selectable] =
      inviteCandidateStatus(candidate);

    const match = candidate?.matching || {};
    const capacity = candidate?.capacity || {};
    const relation = candidate?.relationship || {};

    const matched = Number(match?.match_count || 0);
    const required = Number(match?.required_tag_count || 0);

    const remaining =
      capacity?.simultaneous_jobs_remaining;

    const matchedTags =
      Array.isArray(match?.matched_tags)
        ? match.matched_tags
        : [];

    const specialties =
      Array.isArray(relation?.specialty_tags)
        ? relation.specialty_tags
        : [];

    const searchText = [
      candidate?.display_name,
      candidate?.email,
      ...matchedTags,
      ...specialties
    ]
      .map(clean)
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return `
      <label
        class="ciConsignmentInviteCandidate ${
          selectable ? "" : "is-disabled"
        }"
        data-ci-consignment-invite-candidate
        data-search="${esc(searchText)}"
      >
        <div class="ciConsignmentInviteCandidate__body">
          <div class="ciConsignmentInviteCandidate__head">
            <div>
              <strong>
                ${esc(candidate?.display_name || "Creator")}
              </strong>

              <span>
                ${esc(candidate?.email || "Sin email")}
              </span>
            </div>

            <span
              class="ciConsignmentInviteCandidate__status ${
                selectable ? "is-available" : ""
              }"
            >
              ${esc(statusLabel)}
            </span>
          </div>

          <div class="ciConsignmentInviteCandidate__facts">
            <span>
              <strong>${esc(matched)} / ${esc(required)}</strong>
              tags coincidentes
            </span>

            <span>
              <strong>${esc(capacity?.active_jobs_count ?? 0)}</strong>
              trabajos activos
            </span>

            <span>
              <strong>${esc(remaining ?? "∞")}</strong>
              capacidad disponible
            </span>
          </div>

          ${
            matchedTags.length
              ? `
                <div class="ciConsignmentInviteCandidate__tags">
                  ${matchedTags
                    .map(
                      (tag) =>
                        `<span>${esc(tag)}</span>`
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>

        <input
          type="checkbox"
          value="${esc(creatorId)}"
          data-ci-consignment-invite-select
          ${selectable ? "" : "disabled"}
          aria-label="Seleccionar ${esc(
            candidate?.display_name || "Creator"
          )}"
        >
      </label>
    `;
  }

  function updateInviteSubmit(dialog) {
    const selected = Array.from(
      dialog.querySelectorAll(
        "[data-ci-consignment-invite-select]:checked"
      )
    );

    const submit = dialog.querySelector(
      "[data-ci-consignment-invite-submit]"
    );

    const count = selected.length;

    if (!submit) return;

    submit.disabled = inviteBusy || count < 1;

    submit.textContent =
      count > 1
        ? `Enviar ${count} invitaciones`
        : "Enviar invitación";
  }

  function filterInviteCandidates(dialog) {
    const query = clean(
      dialog.querySelector(
        "[data-ci-consignment-invite-search]"
      )?.value
    ).toLowerCase();

    const rows = Array.from(
      dialog.querySelectorAll(
        "[data-ci-consignment-invite-candidate]"
      )
    );

    let visible = 0;

    for (const row of rows) {
      const haystack = clean(row.dataset.search);

      const show =
        !query || haystack.includes(query);

      row.hidden = !show;

      if (show) visible += 1;
    }

    const empty = dialog.querySelector(
      "[data-ci-consignment-invite-empty]"
    );

    if (empty) {
      empty.hidden = visible > 0;
    }
  }

  function ensureInviteDialog() {
    let dialog = document.querySelector(
      "[data-ci-consignment-invite-dialog]"
    );

    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className =
      "ciConsignmentDialog ciConsignmentInviteDialog";

    dialog.setAttribute(
      "data-ci-consignment-invite-dialog",
      ""
    );

    dialog.innerHTML = `
      <div class="ciConsignmentDialog__surface">
        <header class="ciConsignmentDialog__header">
          <div>
            <span>CONSIGNACIONES</span>
            <h2>Elegir Creator</h2>
            <p>
              Seleccioná uno o varios Creators para enviarles
              esta consignación por invitación.
            </p>
          </div>

          <button
            type="button"
            class="ciConsignmentDialog__close"
            data-ci-consignment-invite-close
            aria-label="Cerrar"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >close</span>
          </button>
        </header>

        <div class="ciConsignmentInviteDialog__search">
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >search</span>

          <input
            type="search"
            autocomplete="off"
            placeholder="Buscar Creator"
            data-ci-consignment-invite-search
          >
        </div>

        <div
          class="ciConsignmentInviteDialog__list"
          data-ci-consignment-invite-list
        >
          <div class="ciConsignmentInviteDialog__loading">
            <span class="material-symbols-rounded">
              progress_activity
            </span>
            <span>Cargando Creators…</span>
          </div>
        </div>

        <div
          class="ciConsignmentInviteDialog__empty"
          data-ci-consignment-invite-empty
          hidden
        >
          No hay Creators para esta búsqueda.
        </div>

        <div
          class="ciConsignmentDialog__feedback"
          data-ci-consignment-invite-feedback
        ></div>

        <div class="ciConsignmentDialog__actions">
          <button
            type="button"
            class="ciConsignmentDialog__secondary"
            data-ci-consignment-invite-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="ciConsignmentDialog__primary"
            data-ci-consignment-invite-submit
            disabled
          >
            Enviar invitación
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelectorAll(
      "[data-ci-consignment-invite-close]"
    ).forEach((button) => {
      button.addEventListener("click", () => {
        if (!inviteBusy) {
          dialog.close();
        }
      });
    });

    dialog.querySelector(
      "[data-ci-consignment-invite-search]"
    )?.addEventListener("input", () => {
      filterInviteCandidates(dialog);
    });

    dialog.addEventListener("change", (event) => {
      if (
        event.target.matches(
          "[data-ci-consignment-invite-select]"
        )
      ) {
        updateInviteSubmit(dialog);
      }
    });

    dialog.querySelector(
      "[data-ci-consignment-invite-submit]"
    )?.addEventListener("click", async () => {
      if (inviteBusy) return;

      const consignmentId =
        clean(dialog.dataset.consignmentId);

      const creatorIds = Array.from(
        dialog.querySelectorAll(
          "[data-ci-consignment-invite-select]:checked"
        )
      )
        .map((input) => clean(input.value))
        .filter(Boolean);

      if (!consignmentId || !creatorIds.length) {
        return;
      }

      const submit = dialog.querySelector(
        "[data-ci-consignment-invite-submit]"
      );

      const feedback = dialog.querySelector(
        "[data-ci-consignment-invite-feedback]"
      );

      inviteBusy = true;

      if (submit) {
        submit.disabled = true;
        submit.textContent =
          creatorIds.length > 1
            ? "Enviando invitaciones…"
            : "Enviando invitación…";
      }

      if (feedback) {
        feedback.textContent = "";
        feedback.removeAttribute("data-state");
      }

      try {
        let idempotencyKey =
          clean(dialog.dataset.idempotencyKey);

        if (!idempotencyKey) {
          idempotencyKey = createIdempotencyKey();
          dialog.dataset.idempotencyKey =
            idempotencyKey;
        }

        await window.PCIRuntime.request(
          `/v1/workspaces/${encodeURIComponent(
            workspaceId
          )}/consignments/${encodeURIComponent(
            consignmentId
          )}/invitations`,
          {
            method: "POST",
            body: JSON.stringify({
              creator_ids: creatorIds,
              idempotency_key: idempotencyKey
            })
          }
        );

        dialog.close();

        if (consignmentId === selectedId) {
          await render();
        }

      } catch (error) {
        console.error(
          "[PCI consignment invitations]",
          error
        );

        if (feedback) {
          feedback.textContent =
            invitationErrorMessage(error);
          feedback.dataset.state = "error";
        }

      } finally {
        inviteBusy = false;

        if (dialog.open) {
          updateInviteSubmit(dialog);
        }
      }
    });

    dialog.addEventListener("cancel", (event) => {
      if (inviteBusy) {
        event.preventDefault();
      }
    });

    dialog.addEventListener("close", () => {
      inviteBusy = false;
      dialog.dataset.consignmentId = "";
      dialog.dataset.idempotencyKey = "";

      const search = dialog.querySelector(
        "[data-ci-consignment-invite-search]"
      );

      if (search) {
        search.value = "";
      }

      const feedback = dialog.querySelector(
        "[data-ci-consignment-invite-feedback]"
      );

      if (feedback) {
        feedback.textContent = "";
        feedback.removeAttribute("data-state");
      }

      const submit = dialog.querySelector(
        "[data-ci-consignment-invite-submit]"
      );

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Enviar invitación";
      }
    });

    return dialog;
  }

  async function openInviteDialog() {
    const detail = selectedDetail;
    const allowed =
      detail?.lifecycle?.allowed_actions || {};

    if (!allowed.invite_creators) {
      return;
    }

    const consignmentId =
      clean(detail?.consignment?.consignment_id);

    if (!consignmentId) return;

    const dialog = ensureInviteDialog();
    const list = dialog.querySelector(
      "[data-ci-consignment-invite-list]"
    );

    const empty = dialog.querySelector(
      "[data-ci-consignment-invite-empty]"
    );

    const feedback = dialog.querySelector(
      "[data-ci-consignment-invite-feedback]"
    );

    dialog.dataset.consignmentId =
      consignmentId;
    dialog.dataset.idempotencyKey = "";

    if (feedback) {
      feedback.textContent = "";
      feedback.removeAttribute("data-state");
    }

    if (empty) {
      empty.hidden = true;
    }

    if (list) {
      list.innerHTML = `
        <div class="ciConsignmentInviteDialog__loading">
          <span class="material-symbols-rounded">
            progress_activity
          </span>
          <span>Cargando Creators…</span>
        </div>
      `;
    }

    updateInviteSubmit(dialog);
    dialog.showModal();

    try {
      const response =
        await window.PCIRuntime.request(
          `/v1/workspaces/${encodeURIComponent(
            workspaceId
          )}/consignments/${encodeURIComponent(
            consignmentId
          )}/candidates`,
          { method: "GET" }
        );

      if (
        !dialog.open ||
        clean(dialog.dataset.consignmentId) !==
          consignmentId
      ) {
        return;
      }

      const candidates =
        Array.isArray(response?.items)
          ? response.items
          : [];

      if (list) {
        list.innerHTML = candidates.length
          ? candidates
              .map(inviteCandidateMarkup)
              .join("")
          : "";
      }

      if (empty) {
        empty.hidden = candidates.length > 0;
        empty.textContent =
          "No hay Creators disponibles para esta consignación.";
      }

      filterInviteCandidates(dialog);
      updateInviteSubmit(dialog);

    } catch (error) {
      console.error(
        "[PCI consignment candidates]",
        error
      );

      if (list) {
        list.innerHTML = "";
      }

      if (empty) {
        empty.hidden = false;
        empty.textContent =
          "No pudimos cargar los Creators.";
      }

      if (feedback) {
        feedback.textContent =
          "No pudimos leer los candidatos de matching.";
        feedback.dataset.state = "error";
      }
    }
  }

  /* PCI CONSIGNMENT PARTICIPATION HISTORY */
  function consignmentParticipationTimestamp(participation) {
    const status = clean(participation?.status);

    const raw =
      status === "declined"
        ? participation?.declined_at
        : status === "active"
          ? participation?.joined_at
          : status === "withdrawn"
            ? participation?.withdrawn_at
            : participation?.created_at;

    if (!raw) return "";

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) return "";

    const datePart = new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    )
      .format(date)
      .replace(/\./g, "");

    const timePart = new Intl.DateTimeFormat(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(date);

    return `${datePart} · ${timePart}`;
  }

  function consignmentParticipationState(participation) {
    const status = clean(participation?.status);

    if (status === "active") {
      return {
        label: "Participando",
        sentence: "está participando",
        tone: "active"
      };
    }

    if (status === "invited") {
      return {
        label: "Invitación pendiente",
        sentence: "tiene una invitación pendiente",
        tone: "invited"
      };
    }

    if (status === "declined") {
      return {
        label: "Invitación rechazada",
        sentence: "rechazó la invitación",
        tone: "declined"
      };
    }

    if (status === "withdrawn") {
      return {
        label: "Retirado",
        sentence: "se retiró de la consignación",
        tone: "withdrawn"
      };
    }

    return {
      label: status || "Estado",
      sentence: "registró una participación",
      tone: "neutral"
    };
  }

  function consignmentParticipationHistoryMarkup(participants) {
    const rows =
      Array.isArray(participants)
        ? participants
        : [];

    if (!rows.length) return "";

    return `
      <div
        class="ciConsignmentParticipationHistory"
        data-ci-consignment-participation-history
      >
        <div class="ciConsignmentParticipationHistory__header">
          <span>INVITACIONES Y PARTICIPACIÓN</span>
        </div>

        <div class="ciConsignmentParticipationHistory__list">
          ${rows
            .map((participation) => {
              const creator =
                participation?.creator || {};

              const state =
                consignmentParticipationState(
                  participation
                );

              const timestamp =
                consignmentParticipationTimestamp(
                  participation
                );

              const creatorName =
                clean(creator?.display_name) ||
                clean(creator?.email) ||
                "Creator";

              return `
                <div
                  class="ciConsignmentParticipationHistory__row"
                >
                  <div
                    class="ciConsignmentParticipationHistory__body"
                  >
                    <strong>
                      ${esc(creatorName)}
                    </strong>

                    <span>
                      ${esc(
                        `${creatorName} ${state.sentence}`
                      )}
                    </span>

                    ${
                      timestamp
                        ? `
                          <time>
                            ${esc(timestamp)}
                          </time>
                        `
                        : ""
                    }
                  </div>

                  <span
                    class="ciConsignmentParticipationHistory__status is-${esc(
                      state.tone
                    )}"
                  >
                    ${esc(state.label)}
                  </span>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function detailMarkup(detail) {
    const consignment = detail?.consignment || {};
    const revision = detail?.current_revision || {};
    const counts = detail?.counts || {};
    const financial = detail?.financial || {};

    const candidates = Array.isArray(detail?.matching_candidates)
      ? detail.matching_candidates
      : [];

    const [statusLabel, statusTone] =
      statusView(consignment?.status);

    const [visibilityLabel, visibilityTone] =
      visibilityView(consignment?.visibility);

    const currency =
      financial?.currency ||
      revision?.currency ||
      "ARS";

    const allowed =
      detail?.lifecycle?.allowed_actions || {};

    const canEditDraft =
      Boolean(allowed.update_initial_draft);

    const canPublishInitial =
      Boolean(allowed.publish_initial);

    const canInviteCreators =
      Boolean(allowed.invite_creators);

    const participationHistory =
      Array.isArray(detail?.participants)
        ? detail.participants
        : [];

    const inviteActionLabel =
      participationHistory.length > 0
        ? "Sumar Creator"
        : "Elegir Creator";

    const participationHistoryMarkup =
      canInviteCreators &&
      participationHistory.length > 0
        ? consignmentParticipationHistoryMarkup(
            participationHistory
          )
        : "";

    const actionsMarkup =
      canEditDraft ||
      canPublishInitial ||
      canInviteCreators
        ? `
          <div class="ciConsignmentHeroActions">
            ${
              canEditDraft
                ? `
                  <button
                    type="button"
                    class="ciConsignmentAction is-secondary"
                    data-ci-consignment-edit-draft
                  >
                    <span class="material-symbols-rounded">edit</span>
                    Editar borrador
                  </button>
                `
                : ""
            }

            ${
              canPublishInitial
                ? `
                  <button
                    type="button"
                    class="ciConsignmentAction is-primary"
                    data-ci-consignment-publish
                  >
                    <span class="material-symbols-rounded">publish</span>
                    Publicar
                  </button>
                `
                : ""
            }

            ${
              canInviteCreators
                ? `
                  <button
                    type="button"
                    class="ciConsignmentAction is-primary"
                    data-ci-consignment-invite-creators
                  >
                    <span class="material-symbols-rounded">person_add</span>
                    ${esc(inviteActionLabel)}
                  </button>
                `
                : ""
            }
          </div>

          ${participationHistoryMarkup}
        `
        : "";

    return `
      <div class="ciConsignmentDetailContent">
        <header class="ciConsignmentHero">
          <span>CONSIGNACIÓN</span>

          <h2>
            ${esc(revision?.title || "Consignación")}
          </h2>

          <p>
            ${esc(revision?.summary || "Sin resumen cargado.")}
          </p>

          <div class="ciConsignmentHeroPills">
            ${pill(statusLabel, statusTone)}
            ${pill(visibilityLabel, visibilityTone)}
            ${pill(
              `Revisión ${revision?.revision_number || "—"}`,
              "gray"
            )}
          </div>

          <div class="ciConsignmentHeroTags">
            ${tagsMarkup(revision?.matching_tags)}
          </div>

          ${actionsMarkup}
        </header>

        <div class="ciConsignmentDetailStats">
          ${summaryCard(counts?.participants || 0, "Participantes")}
          ${summaryCard(counts?.submissions || 0, "Entregas")}
          ${summaryCard(counts?.acquired || 0, "Adquiridas")}
          ${summaryCard(financial?.purchases || 0, "Compras")}
          ${summaryCard(
            money(financial?.settled_amount || 0, currency),
            "Liquidado"
          )}
        </div>

        <section class="ciConsignmentSection">
          <span class="ciConsignmentEyebrow">BRIEF</span>
          <h3>Dirección creativa</h3>

          <div class="ciConsignmentBrief">
            ${field("Objetivo", revision?.objective || "—")}
            ${field("Ángulo creativo", revision?.creative_angle || "—")}
            ${field("Hook", revision?.hook_guidance || "—")}
            ${field(
              "Precio base",
              money(
                revision?.base_price_amount,
                revision?.currency || "ARS"
              )
            )}
            ${field("Cupos", revision?.slots_available ?? "Sin límite")}
            ${field("Publicada", date(revision?.published_at))}
          </div>
        </section>

        <section class="ciConsignmentSection">
          <span class="ciConsignmentEyebrow">MATCHING</span>
          <h3>Creators compatibles</h3>

          <small>
            ${esc(candidates.length)} candidatos operativos
          </small>

          <div class="ciConsignmentCandidates">
            ${
              candidates.length
                ? candidates.map(candidateMarkup).join("")
                : `<p class="ciConsignmentMuted">
                    No hay Creators elegibles.
                   </p>`
            }
          </div>
        </section>

        <section class="ciConsignmentSection">
          <span class="ciConsignmentEyebrow">RESULTADO</span>
          <h3>Resultado económico</h3>

          <div class="ciConsignmentResult">
            ${field("Compras", financial?.purchases || 0)}
            ${field(
              "Comprometido",
              money(financial?.committed_amount || 0, currency)
            )}
            ${field(
              "Liquidado",
              money(financial?.settled_amount || 0, currency)
            )}
            ${field(
              "Moneda",
              financial?.currency_mixed ? "Mixta" : currency
            )}
          </div>
        </section>
      </div>
    `;
  }

  async function loadDetail(id) {
    const root = document.querySelector(
      "[data-ci-consignment-detail]"
    );

    if (!root || !id) return;

    const seq = ++detailSeq;

    root.innerHTML = `
      <div class="ciConsignmentLoading">
        <span class="material-symbols-rounded">progress_activity</span>
        <strong>Cargando consignación…</strong>
      </div>
    `;

    try {
      const [detail, lifecycle] =
        await Promise.all([
          window.PCIRuntime.request(
            `/v1/workspaces/${encodeURIComponent(
              workspaceId
            )}/consignments/${encodeURIComponent(id)}`,
            { method: "GET" }
          ),
          window.PCIRuntime.request(
            `/v1/workspaces/${encodeURIComponent(
              workspaceId
            )}/consignments/${encodeURIComponent(
              id
            )}/lifecycle`,
            { method: "GET" }
          )
        ]);

      if (
        seq !== detailSeq ||
        id !== selectedId ||
        !isHere()
      ) {
        return;
      }

      detail.lifecycle = lifecycle;
      selectedDetail = detail;

      root.innerHTML = detailMarkup(detail);

    } catch (error) {
      console.error("[PCI consignments detail]", error);

      if (id === selectedId) {
        selectedDetail = null;
      }

      root.innerHTML = `
        <div class="ciConsignmentEmpty">
          <span class="material-symbols-rounded">error</span>
          <strong>No pudimos cargar el detalle.</strong>
        </div>
      `;
    }
  }

  function shellMarkup() {
    return `
      <div class="ciConsignmentsView">
        <div class="ciConsignmentToolbar">
          <label class="ciConsignmentSearch">
            <span class="material-symbols-rounded">search</span>
            <input
              type="search"
              placeholder="Buscar consignaciones"
              data-ci-consignment-search
            >
          </label>

          <select data-ci-consignment-status>
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="open">Activas</option>
            <option value="paused">Pausadas</option>
            <option value="closed">Cerradas</option>
            <option value="archived">Archivadas</option>
          </select>

          <select data-ci-consignment-visibility>
            <option value="all">Toda visibilidad</option>
            <option value="open">Abiertas</option>
            <option value="invite_only">Por invitación</option>
          </select>

          <button
            type="button"
            class="ciConsignmentCreate"
            data-ci-consignment-create
          >
            <span class="material-symbols-rounded">add</span>
            Nueva consignación
          </button>
        </div>

        ${summaryMarkup()}

        <div class="ciConsignmentWorkspace">
          <aside class="ciConsignmentList">
            <div class="ciConsignmentListHead">
              <div>
                <strong>Consignaciones</strong>
                <span>${esc(items.length)} registros</span>
              </div>

              <button
                type="button"
                data-ci-consignment-refresh
                title="Actualizar"
              >
                <span class="material-symbols-rounded">refresh</span>
              </button>
            </div>

            <div data-ci-consignment-rows></div>
          </aside>

          <section
            class="ciConsignmentDetail"
            data-ci-consignment-detail
          ></section>
        </div>
      </div>
    `;
  }

  function bind() {
    const root = stage();
    if (!root) return;

    root.querySelector(
      "[data-ci-consignment-search]"
    )?.addEventListener("input", (event) => {
      search = event.target.value || "";
      renderRows();
    });

    root.querySelector(
      "[data-ci-consignment-status]"
    )?.addEventListener("change", (event) => {
      status = clean(event.target.value) || "all";
      renderRows();
    });

    root.querySelector(
      "[data-ci-consignment-visibility]"
    )?.addEventListener("change", (event) => {
      visibility = clean(event.target.value) || "all";
      renderRows();
    });

    root.addEventListener("click", (event) => {
      if (
        event.target.closest(
          "[data-ci-consignment-create]"
        )
      ) {
        openCreateDialog();
        return;
      }

      if (
        event.target.closest(
          "[data-ci-consignment-edit-draft]"
        )
      ) {
        openEditDraftDialog();
        return;
      }

      if (
        event.target.closest(
          "[data-ci-consignment-publish]"
        )
      ) {
        openPublishDialog();
        return;
      }

      if (
        event.target.closest(
          "[data-ci-consignment-invite-creators]"
        )
      ) {
        openInviteDialog();
        return;
      }

      if (
        event.target.closest(
          "[data-ci-consignment-refresh]"
        )
      ) {
        render();
        return;
      }

      const row = event.target.closest(
        "[data-ci-consignment-id]"
      );

      if (!row) return;

      selectedId = clean(
        row.dataset.ciConsignmentId
      );

      selectedDetail = null;

      renderRows();
      loadDetail(selectedId);
    });
  }

  async function render() {
    if (!isHere()) return;

    const root = stage();
    if (!root) return;

    const seq = ++requestSeq;

    root.innerHTML = `
      <div class="ciConsignmentLoading">
        <span class="material-symbols-rounded">progress_activity</span>
        <strong>Cargando consignaciones…</strong>
      </div>
    `;

    try {
      const connection =
        await window.PCIRuntime.getConnectionState();

      if (!connection?.signedIn) {
        throw new Error("pci_auth_session_required");
      }

      workspaceId = workspaceFrom(connection);

      if (!workspaceId) {
        throw new Error("workspace_no_resuelto");
      }

      const response =
        await window.PCIRuntime.request(
          `/v1/workspaces/${encodeURIComponent(
            workspaceId
          )}/consignments`,
          { method: "GET" }
        );

      if (seq !== requestSeq || !isHere()) {
        return;
      }

      items = Array.isArray(response?.items)
        ? response.items
        : [];

      if (
        !selectedId ||
        !items.some(
          (item) =>
            clean(item?.consignment_id) === selectedId
        )
      ) {
        selectedId =
          clean(items[0]?.consignment_id);
      }

      root.innerHTML = shellMarkup();

      bind();
      renderRows();

      if (selectedId) {
        loadDetail(selectedId);
      }

    } catch (error) {
      console.error("[PCI consignments]", error);

      root.innerHTML = `
        <div class="ciConsignmentEmpty">
          <span class="material-symbols-rounded">error</span>
          <strong>Consignaciones no disponible</strong>
          <span>No pudimos leer el módulo operativo.</span>
        </div>
      `;
    }
  }

  function boot() {
    if (isHere()) render();
  }

  window.addEventListener("hashchange", boot);
  window.addEventListener("popstate", boot);
  document.addEventListener("sazzu:page:load", boot);

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }
})();
