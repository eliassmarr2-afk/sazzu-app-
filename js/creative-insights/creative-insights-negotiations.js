(() => {
  "use strict";

  let requestSeq = 0;
  let selectedNegotiationId = null;

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

  function isNegotiations() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "negociaciones";
  }

  function stage() {
    return document.querySelector(".ciStage");
  }

  function workspaceFrom(connection) {
    return clean(
      connection?.workspace ||
      connection?.workspaceId ||
      connection?.workspace_id
    );
  }

  function requestedNegotiationId() {
    const params =
      new URLSearchParams(location.search);

    if (
      params.get("ci_entity_type") !==
      "negotiation"
    ) {
      return "";
    }

    return clean(
      params.get("ci_entity_id")
    );
  }

  function setNegotiationId(id) {
    const url = new URL(location.href);

    if (id) {
      url.searchParams.set(
        "ci_entity_type",
        "negotiation"
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

    url.hash = "negociaciones";

    history.pushState(
      {},
      "",
      url
    );

    selectedNegotiationId =
      id || null;

    render();
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

  function formatMoney(
    amount,
    currency = "ARS"
  ) {
    const number = Number(amount);

    if (!Number.isFinite(number)) {
      return "—";
    }

    try {
      return new Intl.NumberFormat(
        "es-AR",
        {
          style: "currency",
          currency:
            clean(currency).toUpperCase() ||
            "ARS",
          maximumFractionDigits: 0
        }
      ).format(number);
    } catch {
      return `${currency} ${number}`;
    }
  }

  function formatBytes(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    if (number < 1024) {
      return `${number} B`;
    }

    if (number < 1024 * 1024) {
      return `${(
        number / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      number / 1024 / 1024
    ).toFixed(1)} MB`;
  }

  function labelStatus(value) {
    const status =
      clean(value).toLowerCase();

    const labels = {
      open: "Abierta",
      closed: "Cerrada",
      purchase_agreed:
        "Compra acordada",

      sent: "Enviada",
      accepted: "Aceptada",
      rejected: "Rechazada",
      withdrawn: "Retirada",
      expired: "Vencida",

      preselected:
        "Preseleccionada",

      ready: "Ready",

      complete:
        "Rights Complete",

      flagged:
        "Rights Flagged"
    };

    return (
      labels[status] ||
      status.replaceAll("_", " ") ||
      "—"
    );
  }

  function closeReasonText(
    status,
    reason
  ) {
    const negotiationStatus =
      clean(status).toLowerCase();

    const closeReason =
      clean(reason).toLowerCase();

    if (
      negotiationStatus ===
        "purchase_agreed" ||
      closeReason ===
        "purchase_agreed"
    ) {
      return (
        "La oferta fue aceptada. " +
        "La negociación quedó cerrada."
      );
    }

    if (!closeReason) {
      return "";
    }

    return (
      "Motivo de cierre: " +
      labelStatus(closeReason) +
      "."
    );
  }

  function statusTone(value) {
    const status =
      clean(value).toLowerCase();

    if (
      [
        "accepted",
        "purchase_agreed",
        "complete"
      ].includes(status)
    ) {
      return "success";
    }

    if (
      [
        "preselected",
        "sent"
      ].includes(status)
    ) {
      return "commerce";
    }

    if (
      [
        "open",
        "ready"
      ].includes(status)
    ) {
      return "action";
    }

    if (
      [
        "rejected",
        "flagged"
      ].includes(status)
    ) {
      return "danger";
    }

    return "neutral";
  }

  function statusPill(value) {
    return `
      <span
        class="ciNegotiationPill"
        data-tone="${
          escapeHtml(
            statusTone(value)
          )
        }"
      >
        ${
          escapeHtml(
            labelStatus(value)
          )
        }
      </span>
    `;
  }

  async function api(path) {
    return window.PCIRuntime.request(
      path,
      {
        method: "GET"
      }
    );
  }

  async function getNegotiations(
    workspace
  ) {
    return api(
      `/v1/workspaces/${
        encodeURIComponent(workspace)
      }/negotiations`
    );
  }

  async function getNegotiationDetail(
    workspace,
    id
  ) {
    return api(
      `/v1/workspaces/${
        encodeURIComponent(workspace)
      }/negotiations/${
        encodeURIComponent(id)
      }`
    );
  }

  async function sendNegotiationMessage(
    workspace,
    negotiationId,
    body
  ) {
    const message =
      clean(body);

    if (
      !message ||
      message.length > 5000
    ) {
      const error =
        new Error(
          "invalid_message"
        );

      error.code =
        "invalid_message";

      throw error;
    }

    if (
      !window.crypto ||
      typeof window.crypto
        .randomUUID !==
        "function"
    ) {
      const error =
        new Error(
          "pci_idempotency_generator_unavailable"
        );

      error.code =
        "pci_idempotency_generator_unavailable";

      throw error;
    }

    return window.PCIRuntime.request(
      `/v1/workspaces/${
        encodeURIComponent(
          workspace
        )
      }/negotiations/${
        encodeURIComponent(
          negotiationId
        )
      }/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          body: message,
          idempotency_key:
            window.crypto.randomUUID()
        })
      }
    );
  }

  /* PCI 2.1E.4G · OPERATOR COUNTEROFFER ACTIONS */

  function operatorWorkspace(
    connection
  ) {
    return String(
      connection?.workspace ||
      connection?.workspaceId ||
      connection?.workspace_id ||
      ""
    ).trim();
  }

  function liveNegotiationOffer(
    detail
  ) {
    const offers =
      Array.isArray(detail?.offers)
        ? detail.offers
        : [];

    return (
      offers
        .filter(
          offer =>
            offer?.status === "sent"
        )
        .sort(
          (a, b) =>
            new Date(
              b?.sent_at ||
              b?.created_at ||
              0
            ) -
            new Date(
              a?.sent_at ||
              a?.created_at ||
              0
            )
        )[0] ||
      null
    );
  }

  function creatorCounterNote(
    offer
  ) {
    return String(
      offer?.counter_note ||
      offer
        ?.commercial_terms_snapshot
        ?.creator_counter_note ||
      ""
    ).trim();
  }

  function commercialTermsForReply(
    offer
  ) {
    const source =
      offer
        ?.commercial_terms_snapshot &&
      typeof offer
        .commercial_terms_snapshot ===
        "object"
        ? {
            ...offer
              .commercial_terms_snapshot
          }
        : {};

    delete source
      .creator_counter_note;

    return source;
  }

  async function rejectCreatorOffer(
    workspace,
    offerId
  ) {
    return window.PCIRuntime.request(
      `/v1/workspaces/${
        encodeURIComponent(
          workspace
        )
      }/offers/${
        encodeURIComponent(
          offerId
        )
      }/reject`,
      {
        method: "POST",

        body: JSON.stringify({
          idempotency_key:
            crypto.randomUUID()
        })
      }
    );
  }

  async function sendCounterResponseOffer(
    workspace,
    negotiationId,
    offer,
    versionId,
    amount
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      const error =
        new Error(
          "pci_offer_amount_invalid"
        );

      error.code =
        "pci_offer_amount_invalid";

      throw error;
    }

    if (
      !offer?.offer_id ||
      !versionId
    ) {
      const error =
        new Error(
          "pci_offer_context_required"
        );

      error.code =
        "pci_offer_context_required";

      throw error;
    }

    const rights =
      offer
        ?.rights_package_snapshot;

    const payment =
      offer
        ?.payment_terms_snapshot;

    if (
      !rights ||
      typeof rights !== "object"
    ) {
      const error =
        new Error(
          "pci_offer_rights_snapshot_required"
        );

      error.code =
        "pci_offer_rights_snapshot_required";

      throw error;
    }

    if (
      !payment ||
      typeof payment !== "object"
    ) {
      const error =
        new Error(
          "pci_offer_payment_terms_required"
        );

      error.code =
        "pci_offer_payment_terms_required";

      throw error;
    }

    return window.PCIRuntime.request(
      `/v1/workspaces/${
        encodeURIComponent(
          workspace
        )
      }/negotiations/${
        encodeURIComponent(
          negotiationId
        )
      }/offers`,
      {
        method: "POST",

        body: JSON.stringify({
          submission_version_id:
            versionId,

          total_amount:
            numericAmount,

          currency:
            String(
              offer?.currency ||
              "ARS"
            ).toUpperCase(),

          expires_at:
            offer?.expires_at ||
            null,

          rights_package_snapshot:
            rights,

          payment_terms_snapshot:
            payment,

          bonus_terms_snapshot:
            offer
              ?.bonus_terms_snapshot &&
            typeof offer
              .bonus_terms_snapshot ===
              "object"
              ? offer
                  .bonus_terms_snapshot
              : {},

          commercial_terms_snapshot:
            commercialTermsForReply(
              offer
            ),

          parent_offer_id:
            offer.offer_id,

          idempotency_key:
            crypto.randomUUID()
        })
      }
    );
  }

  /* PCI 2.1O.2 · INITIAL FORMAL OFFER */

  function hasObjectKeys(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length
    );
  }

  function initialOfferEligible(
    detail
  ) {
    const negotiation =
      detail?.negotiation || {};

    const submission =
      detail?.submission || {};

    const version =
      detail?.current_version || {};

    const offers =
      Array.isArray(detail?.offers)
        ? detail.offers
        : [];

    return (
      negotiation.status === "open" &&
      submission.status ===
        "preselected" &&
      version.status === "ready" &&
      version
        .rights_clearance_status ===
        "complete" &&
      Boolean(
        version.submission_version_id
      ) &&
      Boolean(version.sha256) &&
      offers.length === 0
    );
  }

  function initialOfferActionMarkup(
    detail
  ) {
    if (!initialOfferEligible(detail)) {
      return "";
    }

    const negotiation =
      detail.negotiation;

    const submission =
      detail.submission;

    const version =
      detail.current_version;

    return `
      <div
        class="
          ciNegotiationCommercialAction
          ciNegotiationCommercialAction--initial
        "
        data-ci-initial-offer-action
      >
        <div
          class="
            ciNegotiationCommercialAction__head
          "
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            request_quote
          </span>

          <div>
            <strong>
              Oferta Formal
            </strong>

            <p>
              La conversación está abierta.
              Podés emitir la propuesta
              comercial por esta versión.
            </p>
          </div>
        </div>

        <div
          class="
            ciNegotiationCommercialAction__buttons
          "
        >
          <button
            type="button"
            class="
              ciNegotiationCommercialButton
              is-primary
            "
            data-ci-send-initial-offer
            data-negotiation-id="${
              escapeHtml(
                negotiation.negotiation_id
              )
            }"
            data-submission-id="${
              escapeHtml(
                submission.submission_id
              )
            }"
            data-version-id="${
              escapeHtml(
                version.submission_version_id
              )
            }"
          >
            Enviar Oferta Formal
          </button>
        </div>
      </div>
    `;
  }

  function initialPaymentTermsSnapshot() {
    return {
      method:
        "Transferencia a la cuenta de cobro confirmada en Protocol",
      timing:
        "Después de aceptar la oferta y confirmar la cuenta de cobro"
    };
  }

  function acceptedRevisionContract(
    submissionDetail
  ) {
    const submission =
      submissionDetail?.submission ||
      {};

    const revision =
      submissionDetail
        ?.consignment
        ?.revision ||
      {};

    const revisionId =
      String(
        revision
          .consignment_revision_id ||
        ""
      ).trim();

    const acceptedRevisionId =
      String(
        submission
          .consignment_revision_id ||
        ""
      ).trim();

    if (
      !revisionId ||
      revisionId !==
        acceptedRevisionId
    ) {
      const error =
        new Error(
          "pci_offer_consignment_revision_mismatch"
        );

      error.code =
        "pci_offer_consignment_revision_mismatch";

      throw error;
    }

    const amount =
      Number(
        revision.base_price_amount
      );

    const currency =
      String(
        revision.currency ||
        "ARS"
      )
        .trim()
        .toUpperCase();

    const rights =
      revision
        .rights_package_snapshot;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      const error =
        new Error(
          "pci_offer_base_price_missing"
        );

      error.code =
        "pci_offer_base_price_missing";

      throw error;
    }

    if (
      !/^[A-Z]{3}$/.test(currency)
    ) {
      const error =
        new Error(
          "pci_offer_currency_invalid"
        );

      error.code =
        "pci_offer_currency_invalid";

      throw error;
    }

    if (!hasObjectKeys(rights)) {
      const error =
        new Error(
          "pci_offer_rights_snapshot_required"
        );

      error.code =
        "pci_offer_rights_snapshot_required";

      throw error;
    }

    return {
      revision_id: revisionId,
      revision_number:
        revision.revision_number,
      amount,
      currency,
      rights,
      bonus:
        hasObjectKeys(
          revision
            .performance_bonus_policy
        )
          ? revision
              .performance_bonus_policy
          : {},
    };
  }

  async function sendInitialPurchaseOffer(
    workspace,
    negotiationId,
    submissionVersionId,
    amount,
    contract
  ) {
    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      const error =
        new Error(
          "pci_offer_amount_invalid"
        );

      error.code =
        "pci_offer_amount_invalid";

      throw error;
    }

    return window.PCIRuntime.request(
      `/v1/workspaces/${
        encodeURIComponent(
          workspace
        )
      }/negotiations/${
        encodeURIComponent(
          negotiationId
        )
      }/offers`,
      {
        method: "POST",

        body: JSON.stringify({
          submission_version_id:
            submissionVersionId,

          total_amount:
            numericAmount,

          currency:
            contract.currency,

          expires_at:
            null,

          rights_package_snapshot:
            contract.rights,

          payment_terms_snapshot:
            initialPaymentTermsSnapshot(),

          bonus_terms_snapshot:
            contract.bonus,

          commercial_terms_snapshot: {
            source:
              "accepted_consignment_revision",

            consignment_revision_id:
              contract.revision_id,

            consignment_revision_number:
              contract.revision_number,

            agreed_base_price_amount:
              contract.amount,

            agreed_currency:
              contract.currency
          },

          parent_offer_id:
            null,

          idempotency_key:
            crypto.randomUUID()
        })
      }
    );
  }

  /* PCI 2.1O.3 · OFFER DIALOG SUBMIT RESET
     The same dialog is reused for:
     - initial Protocol offer
     - response to Creator counteroffer
     - accept-exact counteroffer

     A previous submit may leave its button disabled after the
     dialog closes. Always restore UI-only transient state.
  */
  function resetNegotiationOfferDialogControls(
    dialog
  ) {
    if (!dialog) return;

    const submit =
      dialog.querySelector(
        "[data-ci-counter-response-submit]"
      );

    const amount =
      dialog.querySelector(
        "[data-ci-counter-response-amount]"
      );

    if (submit) {
      submit.disabled = false;
    }

    if (amount) {
      amount.disabled = false;
    }
  }

  function ensureCounterResponseDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-counter-response-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciNegotiationOfferDialog";

    dialog.dataset
      .ciCounterResponseDialog =
      "";

    dialog.innerHTML = `
      <form
        method="dialog"
        class="
          ciNegotiationOfferDialog__frame
        "
        data-ci-counter-response-form
      >
        <div
          class="
            ciNegotiationOfferDialog__top
          "
        >
          <div>
            <span
              class="
                ciNegotiationOfferDialog__eyebrow
              "
            >
              Oferta formal
            </span>

            <h2
              data-ci-counter-response-title
            >
              Responder contraoferta
            </h2>

            <p
              data-ci-counter-response-description
            >
              Emití una nueva oferta
              vinculada a la propuesta
              del Creator.
            </p>
          </div>

          <button
            type="button"
            class="
              ciNegotiationOfferDialog__close
            "
            data-ci-counter-response-close
            aria-label="Cerrar"
          >
            <span
              class="
                material-symbols-rounded
              "
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </div>

        <label
          class="
            ciNegotiationOfferDialog__field
          "
        >
          <span>
            Nuevo importe
          </span>

          <div
            class="
              ciNegotiationOfferDialog__money
            "
          >
            <span>
              ARS
            </span>

            <input
              type="number"
              min="1"
              step="1"
              inputmode="decimal"
              name="amount"
              required
              data-ci-counter-response-amount
            />
          </div>
        </label>

        <div
          class="
            ciNegotiationOfferDialog__notice
          "
        >
          <span
            class="
              material-symbols-rounded
            "
            aria-hidden="true"
          >
            info
          </span>

          <p>
            Esto crea una nueva
            oferta formal.
            <strong>
              No crea todavía una
              compra ni un payable.
            </strong>
          </p>
        </div>

        <p
          class="
            ciNegotiationOfferDialog__status
          "
          data-ci-counter-response-status
        ></p>

        <div
          class="
            ciNegotiationOfferDialog__actions
          "
        >
          <button
            type="button"
            class="
              ciNegotiationCommercialButton
            "
            data-ci-counter-response-cancel
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="
              ciNegotiationCommercialButton
              is-primary
            "
            data-ci-counter-response-submit
          >
            Enviar oferta formal
          </button>
        </div>
      </form>
    `;

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "close",
      () => {
        resetNegotiationOfferDialogControls(
          dialog
        );
      }
    );

    return dialog;
  }

  function renderLoading() {
    const root = stage();

    if (!root) return;

    root.innerHTML = `
      <div
        class="ciNegotiationsLoading"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <span>
          Cargando negociaciones…
        </span>
      </div>
    `;
  }

  function renderError(message) {
    const root = stage();

    if (!root) return;

    root.innerHTML = `
      <section
        class="ciNegotiationsState"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          error
        </span>

        <strong>
          No pudimos cargar
          Negociaciones
        </strong>

        <p>
          ${escapeHtml(message)}
        </p>

        <button
          type="button"
          class="ciNegotiationsRefresh"
          data-ci-negotiations-retry
        >
          Reintentar
        </button>
      </section>
    `;

    root
      .querySelector(
        "[data-ci-negotiations-retry]"
      )
      ?.addEventListener(
        "click",
        render
      );
  }

  function renderEmpty() {
    return `
      <div
        class="ciNegotiationsEmpty"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          handshake
        </span>

        <strong>
          Sin negociaciones
        </strong>

        <p>
          Las entregas
          preseleccionadas aparecerán
          acá cuando se abra una
          conversación comercial.
        </p>
      </div>
    `;
  }

  function negotiationRow(
    item,
    activeId
  ) {
    const creator =
      item?.creator || {};

    const submission =
      item?.submission || {};

    const offer =
      item?.live_offer;

    const active =
      item?.negotiation_id ===
      activeId;

    return `
      <button
        type="button"
        class="
          ciNegotiationRow
          ${
            active
              ? "is-active"
              : ""
          }
        "
        data-ci-negotiation-id="${
          escapeHtml(
            item?.negotiation_id
          )
        }"
      >
        <div
          class="ciNegotiationRow__top"
        >
          <strong>
            ${
              escapeHtml(
                creator.display_name ||
                "Creator"
              )
            }
          </strong>

          ${
            statusPill(
              item?.status
            )
          }
        </div>

        <div
          class="ciNegotiationRow__concept"
        >
          ${
            escapeHtml(
              submission.concept_label ||
              "Entrega sin título"
            )
          }
        </div>

        <div
          class="ciNegotiationRow__meta"
        >
          <span>
            ${
              Number(
                item?.message_count ||
                0
              )
            }
            mensaje${
              Number(
                item?.message_count ||
                0
              ) === 1
                ? ""
                : "s"
            }
          </span>

          <span>
            ${
              escapeHtml(
                formatDate(
                  item?.updated_at
                )
              )
            }
          </span>
        </div>

        ${
          offer
            ? `
              <div
                class="ciNegotiationRow__offer"
              >
                <span>
                  Oferta activa
                </span>

                <strong>
                  ${
                    escapeHtml(
                      formatMoney(
                        offer.total_amount,
                        offer.currency
                      )
                    )
                  }
                </strong>
              </div>
            `
            : `
              <div
                class="
                  ciNegotiationRow__noOffer
                "
              >
                Sin oferta activa
              </div>
            `
        }
      </button>
    `;
  }

  function timeline(detail) {
    const events = [];

    const negotiation =
      detail?.negotiation || {};

    if (negotiation.opened_at) {
      events.push({
        type: "system",
        date:
          negotiation.opened_at,
        title:
          "Negociación abierta",
        text:
          "Se abrió el espacio comercial con el Creator."
      });
    }

    for (
      const message of
      detail?.messages || []
    ) {
      events.push({
        type: "message",
        date:
          message.created_at,
        sender:
          message.sender_type,
        text:
          message.body
      });
    }

    for (
      const offer of
      detail?.offers || []
    ) {
      events.push({
        type: "offer",
        date:
          offer.sent_at ||
          offer.created_at,
        offer
      });
    }

    if (negotiation.closed_at) {
      events.push({
        type: "system",
        date:
          negotiation.closed_at,
        title:
          (
            negotiation.status ===
              "purchase_agreed" ||
            negotiation.close_reason ===
              "purchase_agreed"
          )
            ? "Compra acordada"
            : "Negociación cerrada",
        text:
          closeReasonText(
            negotiation.status,
            negotiation.close_reason
          )
      });
    }

    return events.sort(
      (a, b) =>
        new Date(a.date || 0) -
        new Date(b.date || 0)
    );
  }

  function timelineItem(event) {
    if (
      event.type ===
      "message"
    ) {
      const creator =
        event.sender ===
        "creator";

      return `
        <article
          class="
            ciNegotiationMessage
            ${
              creator
                ? "is-creator"
                : "is-operator"
            }
          "
        >
          <div
            class="
              ciNegotiationMessage__meta
            "
          >
            <strong>
              ${
                creator
                  ? "Creator"
                  : "Protocol"
              }
            </strong>

            <span>
              ${
                escapeHtml(
                  formatDate(
                    event.date
                  )
                )
              }
            </span>
          </div>

          <p>
            ${
              escapeHtml(
                event.text
              )
            }
          </p>
        </article>
      `;
    }

    if (
      event.type ===
      "offer"
    ) {
      const offer =
        event.offer || {};

      return `
        <article
          class="ciNegotiationOffer"
        >
          <div
            class="
              ciNegotiationOffer__head
            "
          >
            <div>
              <span
                class="
                  ciNegotiationOffer__label
                "
              >
                Oferta formal
              </span>

              <strong>
                ${
                  escapeHtml(
                    formatMoney(
                      offer.total_amount,
                      offer.currency
                    )
                  )
                }
              </strong>
            </div>

            ${
              statusPill(
                offer.status
              )
            }
          </div>

          <div
            class="
              ciNegotiationOffer__meta
            "
          >
            <span>
              ${
                offer.proposed_by_type ===
                "creator"
                  ? "Propuesta del Creator"
                  : "Propuesta de Protocol"
              }
            </span>

            <span>
              ${
                escapeHtml(
                  formatDate(
                    offer.sent_at
                  )
                )
              }
            </span>
          </div>
        </article>
      `;
    }

    return `
      <div
        class="ciNegotiationSystem"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          timeline
        </span>

        <div>
          <div
            class="
              ciNegotiationSystem__meta
            "
          >
            <strong>
              ${
                escapeHtml(
                  event.title
                )
              }
            </strong>

            <span>
              ${
                escapeHtml(
                  formatDate(
                    event.date
                  )
                )
              }
            </span>
          </div>

          ${
            event.text
              ? `
                <p>
                  ${
                    escapeHtml(
                      event.text
                    )
                  }
                </p>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  /* PCI 2.1E.4H2 · INLINE COUNTEROFFER RESPONSE */

  function counterofferResponseMarkup(
    detail
  ) {
    const offer =
      liveNegotiationOffer(
        detail
      );

    const negotiation =
      detail?.negotiation || {};

    if (
      !offer ||
      offer.status !== "sent" ||
      offer.proposed_by_type !==
        "creator" ||
      negotiation.status !==
        "open"
    ) {
      return "";
    }

    const note =
      creatorCounterNote(
        offer
      );

    return `
      <article
        class="
          ciNegotiationCommercialAction
          ciNegotiationCommercialAction--timeline
        "
      >
        <div
          class="
            ciNegotiationCommercialAction__head
          "
        >
          <span
            class="
              material-symbols-rounded
            "
            aria-hidden="true"
          >
            swap_horiz
          </span>

          <div>
            <strong>
              Contraoferta recibida
            </strong>

            <p>
              El Creator espera una
              respuesta comercial.
            </p>
          </div>
        </div>

        ${
          note
            ? `
              <blockquote
                class="
                  ciNegotiationCommercialAction__note
                "
              >
                ${
                  escapeHtml(
                    note
                  )
                }
              </blockquote>
            `
            : ""
        }

        <div
          class="
            ciNegotiationCommercialAction__buttons
          "
        >
          <button
            type="button"
            class="
              ciNegotiationCommercialButton
              is-danger
            "
            data-ci-reject-creator-offer
            data-offer-id="${
              escapeHtml(
                offer.offer_id
              )
            }"
          >
            Rechazar
          </button>

          <button
            type="button"
            class="
              ciNegotiationCommercialButton
              is-primary
            "
            data-ci-respond-creator-offer
            data-negotiation-id="${
              escapeHtml(
                negotiation
                  .negotiation_id
              )
            }"
            data-offer-id="${
              escapeHtml(
                offer.offer_id
              )
            }"
            data-amount="${
              escapeHtml(
                offer.total_amount
              )
            }"
          >
            Responder contraoferta
          </button>

          <button
            type="button"
            class="
              ciNegotiationCommercialButton
              is-primary
            "
            data-ci-respond-creator-offer
            data-ci-accept-exact
            data-negotiation-id="${
              escapeHtml(
                negotiation
                  .negotiation_id
              )
            }"
            data-offer-id="${
              escapeHtml(
                offer.offer_id
              )
            }"
            data-amount="${
              escapeHtml(
                offer.total_amount
              )
            }"
          >
            Aceptar ${
              escapeHtml(
                formatMoney(
                  offer.total_amount,
                  offer.currency
                )
              )
            }
          </button>
        </div>
      </article>
    `;
  }

  function contextPanel(detail) {
    const submission =
      detail?.submission || {};

    const version =
      detail?.current_version;

    const offers =
      Array.isArray(
        detail?.offers
      )
        ? detail.offers
        : [];

    const latestOffer =
      offers.length
        ? offers[
            offers.length - 1
          ]
        : null;

    return `
      <aside
        class="ciNegotiationContext"
      >
        <section>
          <span
            class="
              ciNegotiationContext__label
            "
          >
            Entrega
          </span>

          <strong
            class="
              ciNegotiationContext__title
            "
          >
            ${
              escapeHtml(
                submission.concept_label ||
                "Submission"
              )
            }
          </strong>

          ${
            version
              ? `
                <div
                  class="
                    ciNegotiationContext__sub
                  "
                >
                  V${
                    escapeHtml(
                      version.version_number
                    )
                  }
                  ·
                  ${
                    escapeHtml(
                      labelStatus(
                        version.status
                      )
                    )
                  }
                </div>

                <div
                  class="
                    ciNegotiationContext__pills
                  "
                >
                  ${
                    statusPill(
                      version.status
                    )
                  }

                  ${
                    statusPill(
                      version
                        .rights_clearance_status
                    )
                  }
                </div>
              `
              : ""
          }
        </section>

        ${
          version
            ? `
              <section>
                <span
                  class="
                    ciNegotiationContext__label
                  "
                >
                  Archivo exacto
                </span>

                <dl
                  class="
                    ciNegotiationFacts
                  "
                >
                  <div>
                    <dt>
                      Archivo
                    </dt>
                    <dd>
                      ${
                        escapeHtml(
                          version
                            .original_filename
                        )
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Resolución
                    </dt>
                    <dd>
                      ${
                        version.width &&
                        version.height
                          ? `${
                              escapeHtml(
                                version.width
                              )
                            } × ${
                              escapeHtml(
                                version.height
                              )
                            }`
                          : "—"
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Duración
                    </dt>
                    <dd>
                      ${
                        Number.isFinite(
                          Number(
                            version
                              .duration_seconds
                          )
                        )
                          ? `${
                              Number(
                                version
                                  .duration_seconds
                              ).toFixed(1)
                            } s`
                          : "—"
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>
                      Tamaño
                    </dt>
                    <dd>
                      ${
                        escapeHtml(
                          formatBytes(
                            version
                              .file_size_bytes
                          )
                        )
                      }
                    </dd>
                  </div>
                </dl>
              </section>
            `
            : ""
        }

        <section>
          <span
            class="
              ciNegotiationContext__label
            "
          >
            Comercial
          </span>

          ${
            latestOffer
              ? `
                <strong
                  class="
                    ciNegotiationContext__amount
                  "
                >
                  ${
                    escapeHtml(
                      formatMoney(
                        latestOffer
                          .total_amount,
                        latestOffer
                          .currency
                      )
                    )
                  }
                </strong>

                <div
                  class="
                    ciNegotiationContext__pills
                  "
                >
                  ${
                    statusPill(
                      latestOffer.status
                    )
                  }
                </div>
              `
              : `
                <p
                  class="
                    ciNegotiationContext__muted
                  "
                >
                  Todavía no hay una
                  oferta formal.
                </p>

                ${
                  initialOfferActionMarkup(
                    detail
                  )
                }
              `
          }
        </section>

        ${
          latestOffer &&
          latestOffer.status === "sent" &&
          latestOffer
            .proposed_by_type ===
            "creator" &&
          detail
            ?.negotiation
            ?.status === "open"
            ? `
              <div
                class="
                  ciNegotiationCommercialAction
                "
              >
                <div
                  class="
                    ciNegotiationCommercialAction__head
                  "
                >
                  <span
                    class="
                      material-symbols-rounded
                    "
                    aria-hidden="true"
                  >
                    swap_horiz
                  </span>

                  <div>
                    <strong>
                      Contraoferta recibida
                    </strong>

                    <p>
                      El Creator espera una
                      respuesta comercial.
                    </p>
                  </div>
                </div>

                ${
                  creatorCounterNote(
                    latestOffer
                  )
                    ? `
                      <blockquote
                        class="
                          ciNegotiationCommercialAction__note
                        "
                      >
                        ${
                          escapeHtml(
                            creatorCounterNote(
                              latestOffer
                            )
                          )
                        }
                      </blockquote>
                    `
                    : ""
                }

                <div
                  class="
                    ciNegotiationCommercialAction__buttons
                  "
                >
                  <button
                    type="button"
                    class="
                      ciNegotiationCommercialButton
                      is-danger
                    "
                    data-ci-reject-creator-offer
                    data-offer-id="${
                      escapeHtml(
                        latestOffer.offer_id
                      )
                    }"
                  >
                    Rechazar
                  </button>

                  <button
                    type="button"
                    class="
                      ciNegotiationCommercialButton
                      is-primary
                    "
                    data-ci-respond-creator-offer
                    data-negotiation-id="${
                      escapeHtml(
                        detail
                          .negotiation
                          .negotiation_id
                      )
                    }"
                    data-offer-id="${
                      escapeHtml(
                        latestOffer.offer_id
                      )
                    }"
                    data-amount="${
                      escapeHtml(
                        latestOffer
                          .total_amount
                      )
                    }"
                  >
                    Responder contraoferta
                  </button>
                </div>
              </div>
            `
            : `
              <div
                class="
                  ciNegotiationReadOnly
                "
              >
                <span
                  class="
                    material-symbols-rounded
                  "
                  aria-hidden="true"
                >
                  visibility
                </span>

                <div>
                  <strong>
                    ${
                      latestOffer &&
                      latestOffer
                        .proposed_by_type ===
                        "workspace" &&
                      latestOffer.status ===
                        "sent"
                        ? "Esperando al Creator"
                        : "Vista de lectura"
                    }
                  </strong>

                  <p>
                    ${
                      latestOffer &&
                      latestOffer
                        .proposed_by_type ===
                        "workspace" &&
                      latestOffer.status ===
                        "sent"
                        ? "La oferta formal fue enviada. El Creator debe responder."
                        : "No hay una acción comercial pendiente para Protocol."
                    }
                  </p>
                </div>
              </div>
            `
        }
      </aside>
    `;
  }

  function detailPanel(detail) {
    const creator =
      detail?.creator || {};

    const negotiation =
      detail?.negotiation || {};

    const events =
      timeline(detail);

    return `
      <div
        class="ciNegotiationConversation"
      >
        <header
          class="
            ciNegotiationConversation__header
          "
        >
          <button
            type="button"
            class="
              ciNegotiationMobileBack
            "
            data-ci-negotiations-back
            aria-label="
              Volver a Negociaciones
            "
          >
            <span
              class="material-symbols-rounded"
            >
              arrow_back
            </span>
          </button>

          <div
            class="
              ciNegotiationConversation__identity
            "
          >
            <strong>
              ${
                escapeHtml(
                  creator.display_name ||
                  "Creator"
                )
              }
            </strong>

            <span>
              ${
                escapeHtml(
                  creator.email || ""
                )
              }
            </span>
          </div>

          ${
            statusPill(
              negotiation.status
            )
          }
        </header>

        <div
          class="
            ciNegotiationTimeline
          "
        >
          ${
            events.length
              ? events
                  .map(
                    event => {
                      const item =
                        timelineItem(
                          event
                        );

                      const liveOffer =
                        liveNegotiationOffer(
                          detail
                        );

                      const isLiveCreatorOffer =
                        event.type ===
                          "offer" &&
                        event
                          ?.offer
                          ?.offer_id ===
                          liveOffer
                            ?.offer_id &&
                        liveOffer
                          ?.status ===
                          "sent" &&
                        liveOffer
                          ?.proposed_by_type ===
                          "creator";

                      return (
                        item +
                        (
                          isLiveCreatorOffer
                            ? counterofferResponseMarkup(
                                detail
                              )
                            : ""
                        )
                      );
                    }
                  )
                  .join("")
              : `
                <div
                  class="
                    ciNegotiationTimeline__empty
                  "
                >
                  <span
                    class="material-symbols-rounded"
                  >
                    forum
                  </span>

                  <strong>
                    Sin actividad
                  </strong>

                  <p>
                    Esta negociación todavía
                    no tiene mensajes ni
                    ofertas.
                  </p>
                </div>
              `
          }
        </div>

        ${
          negotiation.status ===
          "open"
            ? `
              <form
                class="
                  ciNegotiationComposer
                "
                data-ci-negotiation-composer
                data-negotiation-id="${
                  escapeHtml(
                    negotiation
                      .negotiation_id
                  )
                }"
              >
                <div
                  class="
                    ciNegotiationComposer__field
                  "
                >
                  <textarea
                    rows="1"
                    maxlength="5000"
                    placeholder="Escribí un mensaje al Creator…"
                    aria-label="Mensaje al Creator"
                    data-ci-negotiation-message
                  ></textarea>

                  <button
                    type="submit"
                    class="
                      ciNegotiationComposer__send
                    "
                    aria-label="Enviar mensaje"
                    title="Enviar mensaje"
                  >
                    <span
                      class="
                        material-symbols-rounded
                      "
                      aria-hidden="true"
                    >
                      send
                    </span>
                  </button>
                </div>

                <div
                  class="
                    ciNegotiationComposer__footer
                  "
                >
                  <span>
                    Creator verá al comprador
                    como Protocol.
                  </span>

                  <span
                    data-ci-negotiation-message-status
                  ></span>
                </div>
              </form>
            `
            : ""
        }
      </div>

      ${contextPanel(detail)}
    `;
  }

  function page(
    items,
    detail,
    activeId
  ) {
    const mobile =
      window.matchMedia(
        "(max-width: 760px)"
      ).matches;

    const mobileDetail =
      mobile && Boolean(detail);

    return `
      <section
        class="
          ciNegotiations
          ${
            mobileDetail
              ? "is-mobile-detail"
              : ""
          }
        "
      >
        <div
          class="ciNegotiationsToolbar"
        >
          <div>
            <strong>
              Conversaciones
            </strong>

            <span>
              ${
                items.length
              }
              negociación${
                items.length === 1
                  ? ""
                  : "es"
              }
            </span>
          </div>

          <button
            type="button"
            class="
              ciNegotiationsRefresh
            "
            data-ci-negotiations-refresh
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
          class="
            ciNegotiationsWorkspace
          "
        >
          <aside
            class="
              ciNegotiationsList
            "
          >
            ${
              items.length
                ? items
                    .map(
                      item =>
                        negotiationRow(
                          item,
                          activeId
                        )
                    )
                    .join("")
                : renderEmpty()
            }
          </aside>

          <main
            class="
              ciNegotiationsDetail
            "
          >
            ${
              detail
                ? detailPanel(detail)
                : `
                  <div
                    class="
                      ciNegotiationsSelect
                    "
                  >
                    <span
                      class="material-symbols-rounded"
                    >
                      handshake
                    </span>

                    <strong>
                      Elegí una negociación
                    </strong>

                    <p>
                      Revisá conversación,
                      ofertas y contexto
                      comercial.
                    </p>
                  </div>
                `
            }
          </main>
        </div>
      </section>
    `;
  }

  function bind() {
    const root = stage();

    if (!root) return;

    root
      .querySelectorAll(
        "[data-ci-negotiation-id]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            () => {
              const id =
                clean(
                  button.dataset
                    .ciNegotiationId
                );

              if (id) {
                setNegotiationId(
                  id
                );
              }
            }
          );
        }
      );

    root
      .querySelector(
        "[data-ci-negotiations-back]"
      )
      ?.addEventListener(
        "click",
        () => {
          setNegotiationId("");
        }
      );

    root
      .querySelector(
        "[data-ci-negotiations-refresh]"
      )
      ?.addEventListener(
        "click",
        render
      );

    const composer =
      root.querySelector(
        "[data-ci-negotiation-composer]"
      );

    composer?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const textarea =
          composer.querySelector(
            "[data-ci-negotiation-message]"
          );

        const status =
          composer.querySelector(
            "[data-ci-negotiation-message-status]"
          );

        const button =
          composer.querySelector(
            'button[type="submit"]'
          );

        const body =
          clean(textarea?.value);

        const negotiationId =
          clean(
            composer.dataset
              .negotiationId
          );

        if (!body) {
          if (status) {
            status.textContent =
              "Escribí un mensaje.";
            status.dataset.tone =
              "error";
          }

          textarea?.focus();
          return;
        }

        if (
          body.length > 5000
        ) {
          if (status) {
            status.textContent =
              "El mensaje es demasiado largo.";
            status.dataset.tone =
              "error";
          }

          return;
        }

        try {
          const connection =
            await window.PCIRuntime
              .getConnectionState();

          const workspace =
            workspaceFrom(
              connection
            );

          if (
            !connection?.signedIn ||
            !workspace
          ) {
            throw new Error(
              "pci_auth_session_required"
            );
          }

          if (textarea) {
            textarea.disabled =
              true;
          }

          if (button) {
            button.disabled =
              true;
          }

          if (status) {
            status.textContent =
              "Enviando…";
            status.dataset.tone =
              "loading";
          }

          await sendNegotiationMessage(
            workspace,
            negotiationId,
            body
          );

          if (status) {
            status.textContent =
              "Enviado";
            status.dataset.tone =
              "success";
          }

          await render();

        } catch (error) {
          if (textarea) {
            textarea.disabled =
              false;
          }

          if (button) {
            button.disabled =
              false;
          }

          if (status) {
            status.textContent =
              error?.code ===
              "pci_negotiation_not_open"
                ? "La negociación ya no está abierta."
                : "No se pudo enviar.";

            status.dataset.tone =
              "error";
          }
        }
      }
    );
  }

  async function render() {
    if (!isNegotiations()) {
      return;
    }

    const root = stage();

    if (!root) {
      return;
    }

    const seq =
      ++requestSeq;

    renderLoading();

    try {
      if (!window.PCIRuntime) {
        throw new Error(
          "pci_runtime_unavailable"
        );
      }

      const connection =
        await window.PCIRuntime
          .getConnectionState();

      if (
        !isNegotiations() ||
        seq !== requestSeq
      ) {
        return;
      }

      if (!connection?.signedIn) {
        renderError(
          "Volvé a Inicio y conectá la sesión operator."
        );

        return;
      }

      const workspace =
        workspaceFrom(
          connection
        );

      if (!workspace) {
        renderError(
          "No encontramos el workspace operator."
        );

        return;
      }

      const list =
        await getNegotiations(
          workspace
        );

      if (
        !isNegotiations() ||
        seq !== requestSeq
      ) {
        return;
      }

      const items =
        Array.isArray(list?.items)
          ? list.items
          : [];

      const requestedId =
        requestedNegotiationId();

      const mobile =
        window.matchMedia(
          "(max-width: 760px)"
        ).matches;

      const activeId =
        requestedId ||
        selectedNegotiationId ||
        (
          !mobile
            ? items[0]
                ?.negotiation_id
            : ""
        );

      selectedNegotiationId =
        activeId || null;

      let detail = null;

      if (activeId) {
        detail =
          await getNegotiationDetail(
            workspace,
            activeId
          );

        if (
          !isNegotiations() ||
          seq !== requestSeq
        ) {
          return;
        }
      }

      root.innerHTML =
        page(
          items,
          detail,
          activeId
        );

      bind();

    } catch (error) {
      if (
        !isNegotiations() ||
        seq !== requestSeq
      ) {
        return;
      }

      const message =
        error?.message ===
        "Failed to fetch"
          ? "No pudimos contactar el runtime seguro."
          : error?.code ===
            "pci_negotiation_not_found"
          ? "La negociación ya no existe."
          : "No se pudo leer el contexto comercial.";

      renderError(message);
    }
  }

  if (
    !window
      .__pciCreativeInsightsNegotiationsBound
  ) {
    window
      .__pciCreativeInsightsNegotiationsBound =
      true;

    window.addEventListener(
      "hashchange",
      render
    );

    window.addEventListener(
      "popstate",
      render
    );

    document.addEventListener(
      "sazzu:page:load",
      render
    );

    if (
      document.readyState ===
      "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        render,
        {
          once: true
        }
      );
    } else {
      render();
    }
  }

  if (
    !window
      .__pciNegotiationCommercialActionsBound
  ) {
    window
      .__pciNegotiationCommercialActionsBound =
      true;

    document.addEventListener(
      "click",
      async event => {
        const initialButton =
          event.target.closest(
            "[data-ci-send-initial-offer]"
          );

        if (initialButton) {
          const negotiationId =
            String(
              initialButton
                .dataset
                .negotiationId ||
              ""
            ).trim();

          const submissionId =
            String(
              initialButton
                .dataset
                .submissionId ||
              ""
            ).trim();

          const versionId =
            String(
              initialButton
                .dataset
                .versionId ||
              ""
            ).trim();

          if (
            !negotiationId ||
            !submissionId ||
            !versionId
          ) {
            return;
          }

          try {
            initialButton.disabled =
              true;

            const submissionDetail =
              await window.PCIRuntime
                .getSubmissionDetail(
                  submissionId
                );

            const contract =
              acceptedRevisionContract(
                submissionDetail
              );

            const dialog =
              ensureCounterResponseDialog();

            const title =
              dialog.querySelector(
                "[data-ci-counter-response-title]"
              );

            const description =
              dialog.querySelector(
                "[data-ci-counter-response-description]"
              );

            const submitLabel =
              dialog.querySelector(
                "[data-ci-counter-response-submit]"
              );

            const amount =
              dialog.querySelector(
                "[data-ci-counter-response-amount]"
              );

            const moneyCurrency =
              dialog.querySelector(
                ".ciNegotiationOfferDialog__money > span"
              );

            const status =
              dialog.querySelector(
                "[data-ci-counter-response-status]"
              );

            dialog.dataset.offerMode =
              "initial";

            dialog.dataset
              .negotiationId =
              negotiationId;

            dialog.dataset
              .submissionId =
              submissionId;

            dialog.dataset
              .versionId =
              versionId;

            dialog.dataset.offerId =
              "";

            if (amount) {
              amount.disabled =
                false;

              amount.readOnly =
                false;

              amount.value =
                String(
                  contract.amount
                );
            }

            if (moneyCurrency) {
              moneyCurrency.textContent =
                contract.currency;
            }

            if (title) {
              title.textContent =
                "Enviar Oferta Formal";
            }

            if (description) {
              description.textContent =
                `Valor acordado originalmente: ${
                  formatMoney(
                    contract.amount,
                    contract.currency
                  )
                }. Podés modificar el importe antes de enviar.`;
            }

            if (submitLabel) {
              submitLabel.disabled =
                false;
              submitLabel.textContent =
                "Enviar Oferta Formal";
            }

            if (status) {
              status.textContent =
                "La oferta referencia la versión exacta y la revisión de Consignación aceptada por el Creator.";

              status.dataset.tone =
                "";
            }

            dialog.showModal();

            requestAnimationFrame(
              () => {
                amount?.focus();
                amount?.select();
              }
            );

          } catch (error) {
            console.error(
              "No se pudo preparar la primera Oferta Formal.",
              error
            );

            window.alert(
              error?.code ===
                "pci_offer_base_price_missing"
                ? "La Consignación aceptada no tiene un valor base válido para precargar."
                : error?.code ===
                    "pci_offer_rights_snapshot_required"
                  ? "La Consignación aceptada no tiene un paquete de derechos definido."
                  : "No pudimos preparar la Oferta Formal."
            );

          } finally {
            initialButton.disabled =
              false;
          }

          return;
        }

        const respondButton =
          event.target.closest(
            "[data-ci-respond-creator-offer]"
          );

        if (respondButton) {
          const dialog =
            ensureCounterResponseDialog();


          const acceptExact =
            respondButton.hasAttribute(
              "data-ci-accept-exact"
            );

          const title =
            dialog.querySelector(
              "[data-ci-counter-response-title]"
            );

          const description =
            dialog.querySelector(
              "[data-ci-counter-response-description]"
            );

          const submitLabel =
            dialog.querySelector(
              "[data-ci-counter-response-submit]"
            );

          const amount =
            dialog.querySelector(
              "[data-ci-counter-response-amount]"
            );

          const status =
            dialog.querySelector(
              "[data-ci-counter-response-status]"
            );

          dialog.dataset.offerMode =
            "counter";

          dialog.dataset
            .negotiationId =
            respondButton
              .dataset
              .negotiationId ||
            "";

          dialog.dataset
            .offerId =
            respondButton
              .dataset
              .offerId ||
            "";

          const moneyCurrency =
            dialog.querySelector(
              ".ciNegotiationOfferDialog__money > span"
            );

          if (moneyCurrency) {
            moneyCurrency.textContent =
              "ARS";
          }

          if (amount) {
            amount.value =
              String(
                Number(
                  respondButton
                    .dataset
                    .amount ||
                  0
                )
              );

            /*
             * Aceptar significa confirmar
             * exactamente la propuesta del
             * Creator.
             *
             * Responder permite editar.
             */
            amount.readOnly =
              acceptExact;
          }

          if (title) {
            title.textContent =
              acceptExact
                ? "Aceptar contraoferta"
                : "Responder contraoferta";
          }

          if (description) {
            description.textContent =
              acceptExact
                ? "Protocol confirmará exactamente el importe propuesto por el Creator mediante una nueva Oferta Formal."
                : "Emití una nueva oferta vinculada a la propuesta del Creator.";
          }

          if (submitLabel) {
            submitLabel.disabled =
              false;
            submitLabel.textContent =
              acceptExact
                ? "Confirmar y enviar oferta"
                : "Enviar oferta formal";
          }

          if (status) {
            status.textContent =
              "";
            status.dataset.tone =
              "";
          }

          dialog.showModal();

          requestAnimationFrame(
            () => {
              amount?.focus();
              amount?.select();
            }
          );

          return;
        }

        const rejectButton =
          event.target.closest(
            "[data-ci-reject-creator-offer]"
          );

        if (rejectButton) {
          const offerId =
            String(
              rejectButton
                .dataset
                .offerId ||
              ""
            );

          if (!offerId) {
            return;
          }

          const confirmed =
            window.confirm(
              "¿Rechazar esta contraoferta? " +
              "La propuesta dejará de estar activa."
            );

          if (!confirmed) {
            return;
          }

          try {
            rejectButton.disabled =
              true;

            const connection =
              await window.PCIRuntime
                .getConnectionState();

            const workspace =
              operatorWorkspace(
                connection
              );

            if (
              !connection?.signedIn ||
              !workspace
            ) {
              throw new Error(
                "pci_auth_session_required"
              );
            }

            await rejectCreatorOffer(
              workspace,
              offerId
            );

            await render();

          } catch (error) {
            rejectButton.disabled =
              false;

            console.error(
              "No se pudo rechazar "
              + "la contraoferta.",
              error
            );
          }

          return;
        }

        if (
          event.target.closest(
            "[data-ci-counter-response-close]"
          ) ||
          event.target.closest(
            "[data-ci-counter-response-cancel]"
          )
        ) {
          document
            .querySelector(
              "[data-ci-counter-response-dialog]"
            )
            ?.close();
        }
      }
    );

    document.addEventListener(
      "submit",
      async event => {
        const form =
          event.target.closest(
            "[data-ci-counter-response-form]"
          );

        if (!form) {
          return;
        }

        event.preventDefault();

        const dialog =
          form.closest(
            "[data-ci-counter-response-dialog]"
          );

        const amountInput =
          form.querySelector(
            "[data-ci-counter-response-amount]"
          );

        const status =
          form.querySelector(
            "[data-ci-counter-response-status]"
          );

        const submitButton =
          form.querySelector(
            "[data-ci-counter-response-submit]"
          );

        const amount =
          Number(
            amountInput?.value
          );

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          if (status) {
            status.textContent =
              "Ingresá un importe válido.";

            status.dataset.tone =
              "error";
          }

          return;
        }

        const negotiationId =
          String(
            dialog
              ?.dataset
              .negotiationId ||
            ""
          );

        const offerId =
          String(
            dialog
              ?.dataset
              .offerId ||
            ""
          );

        const offerMode =
          String(
            dialog
              ?.dataset
              .offerMode ||
            "counter"
          );

        const submissionId =
          String(
            dialog
              ?.dataset
              .submissionId ||
            ""
          );

        const initialVersionId =
          String(
            dialog
              ?.dataset
              .versionId ||
            ""
          );

        try {
          if (amountInput) {
            amountInput.disabled =
              true;
          }

          if (submitButton) {
            submitButton.disabled =
              true;
          }

          if (status) {
            status.textContent =
              "Enviando oferta formal…";

            status.dataset.tone =
              "loading";
          }

          const connection =
            await window.PCIRuntime
              .getConnectionState();

          const workspace =
            operatorWorkspace(
              connection
            );

          if (
            !connection?.signedIn ||
            !workspace
          ) {
            throw new Error(
              "pci_auth_session_required"
            );
          }

          if (
            offerMode === "initial"
          ) {
            const detail =
              await window.PCIRuntime
                .request(
                  `/v1/workspaces/${
                    encodeURIComponent(
                      workspace
                    )
                  }/negotiations/${
                    encodeURIComponent(
                      negotiationId
                    )
                  }`,
                  {
                    method: "GET"
                  }
                );

            const liveOffer =
              liveNegotiationOffer(
                detail
              );

            const version =
              detail
                ?.current_version ||
              {};

            if (
              detail
                ?.negotiation
                ?.status !== "open" ||
              detail
                ?.submission
                ?.status !==
                "preselected" ||
              version.status !==
                "ready" ||
              version
                .rights_clearance_status !==
                "complete"
            ) {
              const error =
                new Error(
                  "pci_initial_offer_state_changed"
                );

              error.code =
                "pci_initial_offer_state_changed";

              throw error;
            }

            if (liveOffer) {
              const error =
                new Error(
                  "pci_live_offer_exists"
                );

              error.code =
                "pci_live_offer_exists";

              throw error;
            }

            if (
              String(
                version
                  .submission_version_id ||
                ""
              ) !==
              initialVersionId
            ) {
              const error =
                new Error(
                  "pci_offer_version_changed"
                );

              error.code =
                "pci_offer_version_changed";

              throw error;
            }

            const submissionDetail =
              await window.PCIRuntime
                .getSubmissionDetail(
                  submissionId
                );

            const contract =
              acceptedRevisionContract(
                submissionDetail
              );

            await sendInitialPurchaseOffer(
              workspace,
              negotiationId,
              initialVersionId,
              amount,
              contract
            );

            if (status) {
              status.textContent =
                "Oferta Formal enviada.";

              status.dataset.tone =
                "success";
            }

            dialog?.close();

            await render();

            return;
          }

          /*
           * Existing counteroffer path:
           * untouched below.
           */

          /*
           * Re-read del servidor antes
           * de mutar.
           */
          const detail =
            await window.PCIRuntime
              .request(
                `/v1/workspaces/${
                  encodeURIComponent(
                    workspace
                  )
                }/negotiations/${
                  encodeURIComponent(
                    negotiationId
                  )
                }`,
                {
                  method: "GET"
                }
              );

          const offer =
            liveNegotiationOffer(
              detail
            );

          if (
            !offer ||
            offer.offer_id !==
              offerId ||
            offer.status !==
              "sent" ||
            offer.proposed_by_type !==
              "creator"
          ) {
            const error =
              new Error(
                "pci_parent_offer_not_live"
              );

            error.code =
              "pci_parent_offer_not_live";

            throw error;
          }

          const versionId =
            detail
              ?.current_version
              ?.submission_version_id;

          await sendCounterResponseOffer(
            workspace,
            negotiationId,
            offer,
            versionId,
            amount
          );

          if (status) {
            status.textContent =
              "Oferta formal enviada.";

            status.dataset.tone =
              "success";
          }

          dialog?.close();

          await render();

        } catch (error) {
          if (amountInput) {
            amountInput.disabled =
              false;
          }

          if (submitButton) {
            submitButton.disabled =
              false;
          }

          if (status) {
            status.textContent =
              error?.code ===
              "pci_initial_offer_state_changed"
                ? "La entrega cambió de estado. Actualizá antes de volver a intentar."
                : error?.code ===
                    "pci_offer_version_changed"
                  ? "La versión actual cambió. Actualizá la negociación antes de ofertar."
                  : error?.code ===
                      "pci_live_offer_exists"
                    ? "Ya existe una Oferta Formal activa."
                    : error?.code ===
                        "pci_offer_base_price_missing"
                      ? "La Consignación aceptada no tiene un valor base válido."
                      : error?.code ===
                          "pci_offer_rights_snapshot_required"
                        ? "Falta el paquete de derechos de la Consignación aceptada."
                        : error?.code ===
              "pci_parent_offer_not_live"
                ? "La contraoferta ya no está activa."
                : error?.code ===
                  "pci_offer_amount_invalid"
                ? "El importe no es válido."
                : "No se pudo enviar la oferta.";

            status.dataset.tone =
              "error";
          }

          console.error(
            "Error respondiendo "
            + "contraoferta:",
            error
          );
        }
      }
    );
  }

})();
