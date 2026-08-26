(() => {
  "use strict";

  let requestSeq = 0;
  let detailSeq = 0;

  let selectedPurchaseId = null;
  let currentFilter = "all";
  let searchTerm = "";
  let paymentContextSeq = 0;
  let payoutConfirmationSeq = 0;

  let purchases = [];
  let payables = [];
  let payouts = [];

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

  function isPurchases() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "compras";
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

  function requestedPurchaseId() {
    const params =
      new URLSearchParams(
        location.search
      );

    if (
      params.get("ci_entity_type") !==
      "purchase"
    ) {
      return "";
    }

    return clean(
      params.get("ci_entity_id")
    );
  }

  function writePurchaseToUrl(id) {
    const url =
      new URL(location.href);

    if (id) {
      url.searchParams.set(
        "ci_entity_type",
        "purchase"
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

    url.hash = "compras";

    history.replaceState(
      {
        ...(history.state || {}),
        pciPurchaseId: id || null
      },
      "",
      url
    );
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
            clean(currency)
              .toUpperCase() ||
            "ARS",
          maximumFractionDigits: 0
        }
      ).format(number);
    } catch {
      return `${
        clean(currency) || "ARS"
      } ${number}`;
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

  function formatBytes(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    if (number < 1024) {
      return `${number} B`;
    }

    if (number < 1024 * 1024) {
      return `${
        (
          number / 1024
        ).toFixed(1)
      } KB`;
    }

    return `${
      (
        number /
        1024 /
        1024
      ).toFixed(1)
    } MB`;
  }

  function shortId(value) {
    const id = clean(value);

    if (id.length <= 8) {
      return id || "—";
    }

    return id.slice(0, 8);
  }

  function purchaseStatusMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      agreed: {
        label: "Acordada",
        tone: "violet"
      },
      settled: {
        label: "Liquidada",
        tone: "green"
      },
      rescinded: {
        label: "Rescindida",
        tone: "red"
      }
    };

    return (
      map[status] || {
        label:
          status.replaceAll(
            "_",
            " "
          ) || "—",
        tone: "gray"
      }
    );
  }

  function payableStatusMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      awaiting_confirmation: {
        label:
          "Esperando destino",
        tone: "violet"
      },
      ready_to_pay: {
        label:
          "Lista para pagar",
        tone: "blue"
      },
      processing: {
        label:
          "Pago en proceso",
        tone: "blue"
      },
      paid: {
        label: "Pagada",
        tone: "green"
      },
      void: {
        label: "Anulada",
        tone: "gray"
      }
    };

    return (
      map[status] || {
        label:
          status.replaceAll(
            "_",
            " "
          ) || "Sin payable",
        tone: "gray"
      }
    );
  }

  function rightsStatusMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      pending_payment: {
        label:
          "Rights pendientes",
        tone: "violet"
      },
      active: {
        label:
          "Rights activos",
        tone: "green"
      },
      suspended: {
        label:
          "Rights suspendidos",
        tone: "red"
      },
      expired: {
        label:
          "Rights vencidos",
        tone: "gray"
      },
      revoked: {
        label:
          "Rights revocados",
        tone: "red"
      }
    };

    return (
      map[status] || {
        label:
          status.replaceAll(
            "_",
            " "
          ) || "Sin Rights",
        tone: "gray"
      }
    );
  }

  function payoutStatusMeta(value) {
    const status =
      clean(value).toLowerCase();

    const map = {
      initiated: {
        label: "Registrado",
        tone: "blue"
      },
      processing: {
        label: "Procesando",
        tone: "blue"
      },
      confirmed: {
        label: "Confirmado",
        tone: "green"
      },
      paid: {
        label: "Pagado",
        tone: "green"
      },
      failed: {
        label: "Fallido",
        tone: "red"
      },
      reversed: {
        label: "Revertido",
        tone: "red"
      }
    };

    return (
      map[status] || {
        label:
          status.replaceAll(
            "_",
            " "
          ) || "—",
        tone: "gray"
      }
    );
  }

  function pill(meta) {
    return `
      <span
        class="
          ciPurchasePill
          is-${escapeHtml(
            meta?.tone || "gray"
          )}
        "
      >
        ${escapeHtml(
          meta?.label || "—"
        )}
      </span>
    `;
  }

  function payableForPurchase(
    purchase
  ) {
    if (purchase?.payable) {
      return purchase.payable;
    }

    return payables.find(
      (item) =>
        clean(
          item?.purchase_id
        ) ===
        clean(
          purchase?.purchase_id
        )
    ) || null;
  }

  function rightsForPurchase(
    purchase
  ) {
    return Array.isArray(
      purchase?.rights
    )
      ? purchase.rights
      : [];
  }

  function effectiveRightsStatus(
    purchase
  ) {
    const rights =
      rightsForPurchase(
        purchase
      );

    if (!rights.length) {
      return "";
    }

    if (
      rights.some(
        (right) =>
          clean(
            right?.status
          ).toLowerCase() ===
          "active"
      )
    ) {
      return "active";
    }

    return clean(
      rights[0]?.status
    ).toLowerCase();
  }

  function purchaseBucket(
    purchase
  ) {
    const payable =
      payableForPurchase(
        purchase
      );

    const status =
      clean(
        payable?.status
      ).toLowerCase();

    if (
      status ===
      "awaiting_confirmation"
    ) {
      return "waiting";
    }

    if (
      status ===
      "ready_to_pay"
    ) {
      return "ready";
    }

    if (
      status ===
      "processing"
    ) {
      return "processing";
    }

    if (
      status === "paid" ||
      clean(
        purchase?.status
      ).toLowerCase() ===
        "settled"
    ) {
      return "paid";
    }

    return "other";
  }

  function visiblePurchases() {
    const query =
      searchTerm
        .trim()
        .toLowerCase();

    return purchases.filter(
      (purchase) => {
        const bucket =
          purchaseBucket(
            purchase
          );

        if (
          currentFilter !== "all" &&
          bucket !== currentFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const payable =
          payableForPurchase(
            purchase
          );

        const haystack = [
          purchase?.purchase_id,
          purchase?.status,
          purchase?.currency,
          purchase?.total_amount,
          purchase?.creator?.display_name,
          purchase?.creator?.email,
          payable?.status,
          payable?.amount_due,
          effectiveRightsStatus(
            purchase
          )
        ]
          .map((value) =>
            clean(value).toLowerCase()
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
          ciPurchaseMetric
          ${
            tone
              ? `is-${tone}`
              : ""
          }
        "
      >
        <div
          class="ciPurchaseMetric__icon"
          aria-hidden="true"
        >
          <span
            class="material-symbols-rounded"
          >
            ${escapeHtml(icon)}
          </span>
        </div>

        <div
          class="ciPurchaseMetric__value"
        >
          ${escapeHtml(value)}
        </div>

        <div
          class="ciPurchaseMetric__label"
        >
          ${escapeHtml(label)}
        </div>

        <div
          class="ciPurchaseMetric__hint"
        >
          ${escapeHtml(hint)}
        </div>
      </article>
    `;
  }

  function metricsMarkup() {
    const agreed =
      purchases.filter(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "agreed"
      ).length;

    const waiting =
      payables.filter(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "awaiting_confirmation"
      ).length;

    const ready =
      payables.filter(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "ready_to_pay"
      ).length;

    const paid =
      payables.filter(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "paid"
      ).length;

    return `
      <div
        class="ciPurchaseMetrics"
        aria-label="Resumen de compras y pagos"
      >
        ${metricCard(
          "handshake",
          String(agreed),
          "Acordadas",
          "Compras aún no liquidadas",
          "violet"
        )}

        ${metricCard(
          "account_balance_wallet",
          String(waiting),
          "Esperando destino",
          "El Creator debe confirmar dónde cobrar",
          "violet"
        )}

        ${metricCard(
          "payments",
          String(ready),
          "Listas para pagar",
          "Destino de cobro ya confirmado",
          "blue"
        )}

        ${metricCard(
          "task_alt",
          String(paid),
          "Pagadas",
          "Obligaciones ya liquidadas",
          "green"
        )}
      </div>
    `;
  }

  function filterChip(
    value,
    label
  ) {
    const active =
      currentFilter === value;

    return `
      <button
        type="button"
        class="
          ciPurchaseFilter
          ${
            active
              ? "is-active"
              : ""
          }
        "
        data-ci-purchase-filter="${escapeHtml(
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

  function purchaseRow(
    purchase
  ) {
    const id =
      clean(
        purchase?.purchase_id
      );

    const creator =
      purchase?.creator || {};

    const payable =
      payableForPurchase(
        purchase
      );

    const purchaseMeta =
      purchaseStatusMeta(
        purchase?.status
      );

    const payableMeta =
      payableStatusMeta(
        payable?.status
      );

    const rightsStatus =
      effectiveRightsStatus(
        purchase
      );

    const rightsMeta =
      rightsStatusMeta(
        rightsStatus
      );

    const selected =
      id ===
      selectedPurchaseId;

    return `
      <button
        type="button"
        class="
          ciPurchaseRow
          ${
            selected
              ? "is-selected"
              : ""
          }
        "
        data-ci-purchase-id="${escapeHtml(
          id
        )}"
        aria-pressed="${
          selected
            ? "true"
            : "false"
        }"
      >
        <div
          class="ciPurchaseRow__top"
        >
          <div
            class="ciPurchaseRow__creator"
          >
            ${escapeHtml(
              creator?.display_name ||
              "Creator"
            )}
          </div>

          <div
            class="ciPurchaseRow__amount"
          >
            ${escapeHtml(
              formatMoney(
                purchase?.total_amount,
                purchase?.currency
              )
            )}
          </div>
        </div>

        <div
          class="ciPurchaseRow__meta"
        >
          Compra ${escapeHtml(
            shortId(id)
          )}
          ·
          ${escapeHtml(
            formatDate(
              purchase?.agreed_at
            )
          )}
        </div>

        <div
          class="ciPurchaseRow__states"
        >
          ${pill(purchaseMeta)}
          ${pill(payableMeta)}
          ${
            rightsStatus
              ? pill(rightsMeta)
              : ""
          }
        </div>
      </button>
    `;
  }

  function rowsMarkup() {
    const items =
      visiblePurchases();

    if (!items.length) {
      return `
        <div
          class="ciPurchaseListEmpty"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            search_off
          </span>

          <strong>
            Sin operaciones
          </strong>

          <span>
            No hay compras que coincidan
            con este filtro.
          </span>
        </div>
      `;
    }

    return items
      .map(purchaseRow)
      .join("");
  }

  function renderRows() {
    const node =
      document.querySelector(
        "[data-ci-purchase-rows]"
      );

    if (!node) return;

    node.innerHTML =
      rowsMarkup();

    const count =
      document.querySelector(
        "[data-ci-purchase-count]"
      );

    if (count) {
      count.textContent =
        `${visiblePurchases().length} de ${purchases.length}`;
    }
  }

  function loadingMarkup() {
    return `
      <section
        class="ciPurchasesLoading"
        aria-live="polite"
      >
        <span
          class="
            material-symbols-rounded
            ciPurchasesLoading__icon
          "
          aria-hidden="true"
        >
          progress_activity
        </span>

        <div>
          <strong>
            Cargando compras y pagos
          </strong>

          <span>
            Consultando el runtime seguro…
          </span>
        </div>
      </section>
    `;
  }

  function friendlyError(
    error
  ) {
    const code =
      clean(error?.code);

    if (
      code ===
      "pci_workspace_access_denied"
    ) {
      return (
        "La sesión operator no tiene " +
        "acceso a este workspace."
      );
    }

    if (
      code ===
      "pci_auth_session_required" ||
      Number(
        error?.status
      ) === 401
    ) {
      return (
        "La sesión operator venció. " +
        "Volvé a conectarla."
      );
    }

    if (
      clean(
        error?.message
      ) === "Failed to fetch"
    ) {
      return (
        "No pudimos contactar " +
        "el runtime seguro."
      );
    }

    return (
      "No se pudieron cargar " +
      "las compras y pagos."
    );
  }

  function errorMarkup(error) {
    return `
      <section
        class="ciPurchasesError"
        role="alert"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          error
        </span>

        <div>
          <strong>
            Compras no disponibles
          </strong>

          <span>
            ${escapeHtml(
              friendlyError(error)
            )}
          </span>
        </div>

        <button
          type="button"
          class="ciPurchaseRefresh"
          data-ci-purchase-refresh
        >
          Reintentar
        </button>
      </section>
    `;
  }

  function shellMarkup() {
    return `
      <section
        class="ciPurchasesView"
        aria-label="Compras y pagos"
      >
        <div
          class="ciPurchasesToolbar"
        >
          <label
            class="ciPurchaseSearch"
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
              placeholder="Buscar compra, Creator o estado"
              value="${escapeHtml(
                searchTerm
              )}"
              data-ci-purchase-search
              aria-label="Buscar compras"
            />
          </label>

          <button
            type="button"
            class="ciPurchaseRefresh"
            data-ci-purchase-refresh
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
          class="ciPurchaseFilters"
          aria-label="Filtrar compras"
        >
          ${filterChip(
            "all",
            "Todas"
          )}

          ${filterChip(
            "waiting",
            "Esperando destino"
          )}

          ${filterChip(
            "ready",
            "Listas para pagar"
          )}

          ${filterChip(
            "processing",
            "En proceso"
          )}

          ${filterChip(
            "paid",
            "Pagadas"
          )}
        </div>

        ${metricsMarkup()}

        <div
          class="ciPurchasesWorkspace"
        >
          <section
            class="ciPurchaseList"
            aria-label="Operaciones"
          >
            <header
              class="ciPurchaseList__header"
            >
              <div>
                <strong>
                  Operaciones
                </strong>

                <span>
                  Compras y obligaciones
                </span>
              </div>

              <span
                class="ciPurchaseList__count"
                data-ci-purchase-count
              >
                ${visiblePurchases().length}
                de
                ${purchases.length}
              </span>
            </header>

            <div
              class="ciPurchaseList__rows"
              data-ci-purchase-rows
            >
              ${rowsMarkup()}
            </div>
          </section>

          <section
            class="ciPurchaseDetail"
            data-ci-purchase-detail
            aria-live="polite"
          >
            <div
              class="ciPurchaseDetailEmpty"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                receipt_long
              </span>

              <strong>
                Seleccioná una compra
              </strong>

              <span>
                Acá vas a ver su trazabilidad
                comercial, financiera y de Rights.
              </span>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  /* PCI 2.1F.3A · PAYMENT PREPARATION */

  function ensurePaymentPreparationDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-payment-prep-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciPaymentPrepDialog";

    dialog.setAttribute(
      "data-ci-payment-prep-dialog",
      ""
    );

    dialog.innerHTML = `
      <div
        class="ciPaymentPrepDialog__surface"
      >
        <header
          class="ciPaymentPrepDialog__header"
        >
          <div>
            <span>
              Pago seguro
            </span>

            <h2>
              Preparar pago
            </h2>
          </div>

          <button
            type="button"
            class="ciPaymentPrepDialog__close"
            data-ci-payment-prep-close
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

        <div
          class="ciPaymentPrepDialog__content"
          data-ci-payment-prep-content
        ></div>
      </div>
    `;

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "click",
      (event) => {
        const register =
          event.target.closest(
            "[data-ci-register-payout]"
          );

        if (register) {
          registerPaymentTransfer(
            dialog
          );

          return;
        }

        const close =
          event.target.closest(
            "[data-ci-payment-prep-close]"
          );

        if (close) {
          dialog.close();
          return;
        }

        if (
          event.target === dialog
        ) {
          dialog.close();
        }
      }
    );

    /*
     * Los datos exactos de cobro
     * se eliminan del DOM al cerrar.
     */
    dialog.addEventListener(
      "input",
      () => {
        syncPaymentSubmitState(
          dialog
        );
      }
    );

    dialog.addEventListener(
      "change",
      () => {
        syncPaymentSubmitState(
          dialog
        );
      }
    );

    dialog.addEventListener(
      "close",
      () => {
        paymentContextSeq += 1;

        const shouldRefresh =
          dialog.dataset
            .registrationComplete ===
          "true";

        const content =
          dialog.querySelector(
            "[data-ci-payment-prep-content]"
          );

        if (content) {
          content.innerHTML = "";
        }

        delete dialog.dataset.payableId;
        delete dialog.dataset.purchaseId;
        delete dialog.dataset.paymentAmount;
        delete dialog.dataset.paymentCurrency;
        delete dialog.dataset.paymentBusy;
        delete dialog.dataset.registrationComplete;

        if (
          shouldRefresh &&
          isPurchases()
        ) {
          render();
        }
      }
    );

    return dialog;
  }

  function paymentContextLoadingMarkup() {
    return `
      <div
        class="ciPaymentPrepLoading"
        aria-live="polite"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <div>
          <strong>
            Preparando contexto seguro
          </strong>

          <span>
            Obteniendo el destino de cobro
            confirmado por el Creator…
          </span>
        </div>
      </div>
    `;
  }

  /* PCI 2.1F.3B · REGISTER TRANSFER */

  const PAYMENT_PROOF_TYPES =
    new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ]);

  const PAYMENT_PROOF_MAX_BYTES =
    20 * 1024 * 1024;

  function normalizePaymentCode(
    value
  ) {
    return clean(value)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(
        /[^a-z0-9_:-]/g,
        ""
      )
      .slice(0, 80);
  }

  function localDateTimeValue(
    date = new Date()
  ) {
    const pad = (number) =>
      String(number).padStart(
        2,
        "0"
      );

    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      "T",
      pad(date.getHours()),
      ":",
      pad(date.getMinutes())
    ].join("");
  }

  function paymentFormValues(
    dialog
  ) {
    const providerInput =
      dialog.querySelector(
        "[data-ci-payout-provider]"
      );

    const methodInput =
      dialog.querySelector(
        "[data-ci-payout-method]"
      );

    const referenceInput =
      dialog.querySelector(
        "[data-ci-payout-reference]"
      );

    const transferredInput =
      dialog.querySelector(
        "[data-ci-payout-transferred-at]"
      );

    const proofInput =
      dialog.querySelector(
        "[data-ci-payout-proof]"
      );

    const provider =
      normalizePaymentCode(
        providerInput?.value
      );

    const method =
      normalizePaymentCode(
        methodInput?.value
      );

    const reference =
      clean(
        referenceInput?.value
      );

    const transferredRaw =
      clean(
        transferredInput?.value
      );

    const transferredDate =
      transferredRaw
        ? new Date(transferredRaw)
        : null;

    const file =
      proofInput?.files?.[0] ||
      null;

    const amount =
      Number(
        dialog.dataset
          .paymentAmount
      );

    return {
      providerInput,
      methodInput,
      referenceInput,
      transferredInput,
      proofInput,
      provider,
      method,
      reference,
      transferredDate,
      file,
      amount
    };
  }

  function paymentFormValidation(
    dialog
  ) {
    const values =
      paymentFormValues(
        dialog
      );

    if (
      !/^[a-z0-9_:-]{1,80}$/
        .test(values.provider)
    ) {
      return {
        ok: false,
        message:
          "Ingresá el proveedor utilizado."
      };
    }

    if (
      !/^[a-z0-9_:-]{1,80}$/
        .test(values.method)
    ) {
      return {
        ok: false,
        message:
          "Ingresá el método de pago."
      };
    }

    if (
      !values.reference ||
      values.reference.length > 200
    ) {
      return {
        ok: false,
        message:
          "Ingresá la referencia de la operación."
      };
    }

    if (
      !values.transferredDate ||
      Number.isNaN(
        values.transferredDate
          .getTime()
      )
    ) {
      return {
        ok: false,
        message:
          "Ingresá la fecha y hora de transferencia."
      };
    }

    if (
      values.transferredDate
        .getTime() >
      Date.now() + 5 * 60 * 1000
    ) {
      return {
        ok: false,
        message:
          "La transferencia no puede tener una fecha futura."
      };
    }

    if (
      !Number.isFinite(
        values.amount
      ) ||
      values.amount <= 0
    ) {
      return {
        ok: false,
        message:
          "El importe disponible no es válido."
      };
    }

    if (values.file) {
      if (
        !PAYMENT_PROOF_TYPES
          .has(values.file.type)
      ) {
        return {
          ok: false,
          message:
            "El comprobante debe ser PDF, JPG, PNG o WebP."
        };
      }

      if (
        values.file.size <= 0 ||
        values.file.size >
          PAYMENT_PROOF_MAX_BYTES
      ) {
        return {
          ok: false,
          message:
            "El comprobante supera el máximo de 20 MB."
        };
      }
    }

    return {
      ok: true,
      message: "",
      values
    };
  }

  function setPaymentFormStatus(
    dialog,
    message,
    tone = ""
  ) {
    const node =
      dialog.querySelector(
        "[data-ci-payment-form-status]"
      );

    if (!node) return;

    node.textContent =
      message || "";

    node.dataset.tone =
      tone;
  }

  function syncPaymentSubmitState(
    dialog
  ) {
    const button =
      dialog.querySelector(
        "[data-ci-register-payout]"
      );

    if (!button) return;

    if (
      dialog.dataset
        .paymentBusy === "true"
    ) {
      button.disabled = true;
      return;
    }

    const validation =
      paymentFormValidation(
        dialog
      );

    button.disabled =
      !validation.ok;

    setPaymentFormStatus(
      dialog,
      validation.ok
        ? ""
        : validation.message,
      validation.ok
        ? ""
        : "muted"
    );
  }

  function setPaymentFormBusy(
    dialog,
    busy
  ) {
    dialog.dataset.paymentBusy =
      busy
        ? "true"
        : "false";

    dialog
      .querySelectorAll(
        ".ciPaymentPrepForm input, " +
        "[data-ci-register-payout]"
      )
      .forEach(
        (element) => {
          element.disabled =
            Boolean(busy);
        }
      );

    const button =
      dialog.querySelector(
        "[data-ci-register-payout]"
      );

    if (button) {
      button.textContent =
        busy
          ? "Registrando…"
          : "Registrar transferencia";
    }

    if (!busy) {
      syncPaymentSubmitState(
        dialog
      );
    }
  }

  async function uploadPaymentProof(
    workspace,
    payableId,
    file
  ) {
    if (!file) {
      return null;
    }

    const reservation =
      await window
        .PCIRuntime
        .request(
          `/v1/workspaces/${
            encodeURIComponent(
              workspace
            )
          }/payables/${
            encodeURIComponent(
              payableId
            )
          }/payout-proof-upload`,
          {
            method: "POST",
            body: JSON.stringify({
              mime_type:
                file.type
            })
          }
        );

    const bucket =
      clean(
        reservation
          ?.storage_bucket
      );

    const path =
      clean(
        reservation
          ?.storage_path
      );

    const token =
      clean(
        reservation
          ?.signed_upload_token
      );

    if (
      !bucket ||
      !path ||
      !token
    ) {
      const error =
        new Error(
          "payout_proof_reservation_invalid"
        );

      error.code =
        "payout_proof_reservation_invalid";

      throw error;
    }

    const client =
      await window
        .PCIRuntime
        .getClient();

    const result =
      await client
        .storage
        .from(bucket)
        .uploadToSignedUrl(
          path,
          token,
          file,
          {
            contentType:
              file.type,
            upsert: false
          }
        );

    if (result.error) {
      const error =
        new Error(
          result.error.message ||
          "payout_proof_upload_failed"
        );

      error.code =
        "payout_proof_upload_failed";

      throw error;
    }

    return path;
  }

  function paymentRegistrationSuccessMarkup(
    result
  ) {
    return `
      <div
        class="ciPaymentPrepSuccess"
      >
        <div
          class="ciPaymentPrepSuccess__icon"
          aria-hidden="true"
        >
          <span
            class="material-symbols-rounded"
          >
            check
          </span>
        </div>

        <span
          class="ciPaymentPrepSuccess__eyebrow"
        >
          Transferencia registrada
        </span>

        <h3>
          ${escapeHtml(
            formatMoney(
              result?.amount,
              result?.currency
            )
          )}
        </h3>

        ${pill({
          label: "Pago en proceso",
          tone: "blue"
        })}

        <div
          class="ciPaymentPrepSuccess__grid"
        >
          ${detailField(
            "Payout",
            shortId(
              result?.payout_id
            )
          )}

          ${detailField(
            "Referencia",
            result
              ?.provider_reference
          )}

          ${detailField(
            "Proveedor",
            result?.provider
          )}

          ${detailField(
            "Transferida",
            formatDate(
              result
                ?.transferred_at
            )
          )}
        </div>

        <div
          class="ciPaymentPrepSuccess__notice"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            verified_user
          </span>

          <span>
            El Payable quedó en procesamiento.
            Los Rights continúan pendientes hasta
            que Protocol confirme la acreditación.
          </span>
        </div>

        <div
          class="ciPaymentPrepActions"
        >
          <button
            type="button"
            class="
              ciPaymentPrepButton
              is-primary
            "
            data-ci-payment-prep-close
          >
            Cerrar y actualizar
          </button>
        </div>
      </div>
    `;
  }

  async function registerPaymentTransfer(
    dialog
  ) {
    if (
      dialog.dataset
        .paymentBusy === "true"
    ) {
      return;
    }

    const validation =
      paymentFormValidation(
        dialog
      );

    if (!validation.ok) {
      setPaymentFormStatus(
        dialog,
        validation.message,
        "error"
      );

      syncPaymentSubmitState(
        dialog
      );

      return;
    }

    const values =
      validation.values;

    const payableId =
      clean(
        dialog.dataset
          .payableId
      );

    if (!payableId) {
      return;
    }

    setPaymentFormBusy(
      dialog,
      true
    );

    setPaymentFormStatus(
      dialog,
      values.file
        ? "Subiendo comprobante…"
        : "Registrando transferencia…",
      "working"
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

      /*
       * Transparencia:
       * lo que ve el operador queda
       * normalizado exactamente como
       * lo recibirá el backend.
       */
      if (
        values.providerInput
      ) {
        values.providerInput
          .value =
          values.provider;
      }

      if (
        values.methodInput
      ) {
        values.methodInput
          .value =
          values.method;
      }

      const proofPath =
        await uploadPaymentProof(
          workspace,
          payableId,
          values.file
        );

      setPaymentFormStatus(
        dialog,
        "Registrando transferencia…",
        "working"
      );

      const result =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/payables/${
              encodeURIComponent(
                payableId
              )
            }/payouts`,
            {
              method: "POST",
              body: JSON.stringify({
                amount:
                  values.amount,

                provider:
                  values.provider,

                method:
                  values.method,

                provider_reference:
                  values.reference,

                transferred_at:
                  values
                    .transferredDate
                    .toISOString(),

                proof_storage_path:
                  proofPath,

                idempotency_key:
                  window.crypto
                    .randomUUID()
              })
            }
          );

      dialog.dataset
        .registrationComplete =
        "true";

      const content =
        dialog.querySelector(
          "[data-ci-payment-prep-content]"
        );

      if (content) {
        content.innerHTML =
          paymentRegistrationSuccessMarkup(
            result
          );
      }

    } catch (error) {
      setPaymentFormStatus(
        dialog,
        clean(error?.code) ||
        clean(error?.message) ||
        "No se pudo registrar la transferencia.",
        "error"
      );

      setPaymentFormBusy(
        dialog,
        false
      );
    }
  }

  function paymentContextMarkup(
    context
  ) {
    const destination =
      context?.payment_destination ||
      {};

    const creator =
      context?.creator ||
      {};

    const identifier =
      clean(
        destination
          ?.account_identifier
      );

    const holderDocument =
      clean(
        destination
          ?.holder_document_masked
      );

    return `
      <div
        class="ciPaymentPrep"
      >
        <section
          class="ciPaymentPrepHero"
        >
          <div>
            <span
              class="ciPaymentPrepHero__eyebrow"
            >
              Creator
            </span>

            <h3>
              ${escapeHtml(
                creator?.display_name ||
                "Creator"
              )}
            </h3>

            <p>
              ${escapeHtml(
                creator?.email ||
                ""
              )}
            </p>
          </div>

          <div
            class="ciPaymentPrepHero__amount"
          >
            <span>
              Importe bloqueado
            </span>

            <strong>
              ${escapeHtml(
                formatMoney(
                  context
                    ?.remaining_amount ??
                  context
                    ?.amount_due,
                  context
                    ?.currency
                )
              )}
            </strong>

            ${pill({
              label: "Lista para pagar",
              tone: "blue"
            })}
          </div>
        </section>

        <section
          class="ciPaymentPrepSection"
        >
          <div
            class="ciPaymentPrepSection__heading"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              account_balance
            </span>

            <div>
              <span>
                Destino de transferencia
              </span>

              <strong>
                Datos confirmados por el Creator
              </strong>
            </div>
          </div>

          <div
            class="ciPaymentDestinationGrid"
          >
            ${detailField(
              "Titular",
              destination
                ?.holder_name
            )}

            ${detailField(
              "Documento",
              holderDocument || "—"
            )}

            ${detailField(
              "Proveedor",
              destination
                ?.provider
            )}

            ${detailField(
              "Tipo de cuenta",
              destination
                ?.account_type
            )}

            ${detailField(
              "Alias",
              destination
                ?.alias
            )}

            <div
              class="
                ciPurchaseDetailField
                ciPaymentIdentifier
              "
            >
              <span>
                CBU / CVU / cuenta
              </span>

              <strong>
                ${escapeHtml(
                  identifier || "—"
                )}
              </strong>
            </div>
          </div>

          <div
            class="ciPaymentPrepSecurity"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              shield_lock
            </span>

            <span>
              El identificador exacto sólo se
              solicita al abrir esta preparación
              de pago y se elimina de la interfaz
              al cerrarla.
            </span>
          </div>
        </section>

        <section
          class="ciPaymentPrepSection"
        >
          <div
            class="ciPaymentPrepSection__heading"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              receipt_long
            </span>

            <div>
              <span>
                Registro
              </span>

              <strong>
                Datos de la transferencia realizada
              </strong>
            </div>
          </div>

          <form
            class="ciPaymentPrepForm"
            data-ci-payment-prep-form
          >
            <label
              class="ciPaymentPrepField"
            >
              <span>
                Proveedor utilizado
              </span>

              <input
                type="text"
                autocomplete="off"
                placeholder="Ej. mercado_pago"
                data-ci-payout-provider
              />
            </label>

            <label
              class="ciPaymentPrepField"
            >
              <span>
                Método
              </span>

              <input
                type="text"
                autocomplete="off"
                placeholder="Ej. transferencia"
                data-ci-payout-method
              />
            </label>

            <label
              class="
                ciPaymentPrepField
                is-wide
              "
            >
              <span>
                Referencia / ID de operación
              </span>

              <input
                type="text"
                autocomplete="off"
                placeholder="Referencia del proveedor"
                data-ci-payout-reference
              />
            </label>

            <label
              class="ciPaymentPrepField"
            >
              <span>
                Fecha y hora
              </span>

              <input
                type="datetime-local"
                data-ci-payout-transferred-at
              />
            </label>

            <label
              class="ciPaymentPrepField"
            >
              <span>
                Comprobante
              </span>

              <input
                type="file"
                accept="
                  application/pdf,
                  image/jpeg,
                  image/png,
                  image/webp
                "
                data-ci-payout-proof
              />

              <small>
                Opcional · PDF, JPG, PNG o WebP · máximo 20 MB.
              </small>
            </label>
          </form>
        </section>

        <div
          class="ciPaymentPrepFormStatus"
          data-ci-payment-form-status
          role="status"
          aria-live="polite"
        ></div>

        <footer
          class="ciPaymentPrepActions"
        >
          <button
            type="button"
            class="ciPaymentPrepButton"
            data-ci-payment-prep-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="
              ciPaymentPrepButton
              is-primary
            "
            disabled
            data-ci-register-payout
          >
            Registrar transferencia
          </button>
        </footer>

        <div
          class="ciPaymentPrepGateNote"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            info
          </span>

          <span>
            Registrar transferencia crea el payout
            y mueve el Payable a procesamiento.
            Todavía NO confirma la acreditación
            ni activa Rights.
          </span>
        </div>
      </div>
    `;
  }

  async function openPaymentPreparation(
    payableId,
    purchaseId
  ) {
    const id =
      clean(payableId);

    if (!id) {
      return;
    }

    const dialog =
      ensurePaymentPreparationDialog();

    const content =
      dialog.querySelector(
        "[data-ci-payment-prep-content]"
      );

    dialog.dataset.payableId =
      id;

    dialog.dataset.purchaseId =
      clean(purchaseId);

    if (content) {
      content.innerHTML =
        paymentContextLoadingMarkup();
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const seq =
      ++paymentContextSeq;

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

      /*
       * POST semánticamente read-only:
       * sólo obtiene el execution context
       * y desencripta el destino exacto.
       *
       * NO crea payout.
       */
      const context =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/payables/${
              encodeURIComponent(id)
            }/execution-context`,
            {
              method: "POST"
            }
          );

      if (
        seq !== paymentContextSeq ||
        !dialog.open
      ) {
        return;
      }

      /*
       * Sólo retenemos en dataset
       * información financiera no sensible.
       *
       * El identificador exacto permanece
       * únicamente dentro del DOM del modal.
       */
      dialog.dataset.paymentAmount =
        String(
          Number(
            context?.remaining_amount ??
            context?.amount_due ??
            0
          )
        );

      dialog.dataset.paymentCurrency =
        clean(
          context?.currency
        );

      dialog.dataset.paymentBusy =
        "false";

      if (content) {
        content.innerHTML =
          paymentContextMarkup(
            context
          );

        const transferredAt =
          content.querySelector(
            "[data-ci-payout-transferred-at]"
          );

        if (
          transferredAt &&
          !transferredAt.value
        ) {
          transferredAt.value =
            localDateTimeValue();
        }
      }

      syncPaymentSubmitState(
        dialog
      );

    } catch (error) {
      if (
        seq !== paymentContextSeq ||
        !dialog.open
      ) {
        return;
      }

      if (content) {
        content.innerHTML = `
          <div
            class="ciPaymentPrepError"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              error
            </span>

            <strong>
              No pudimos preparar el pago
            </strong>

            <span>
              ${escapeHtml(
                friendlyError(error)
              )}
            </span>

            <button
              type="button"
              class="ciPaymentPrepButton"
              data-ci-payment-prep-close
            >
              Cerrar
            </button>
          </div>
        `;
      }
    }
  }

  /* PCI 2.1F.4A · PAYOUT CONFIRMATION REVIEW */

  function ensurePayoutConfirmationDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-payout-confirm-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciPayoutConfirmDialog";

    dialog.setAttribute(
      "data-ci-payout-confirm-dialog",
      ""
    );

    dialog.innerHTML = `
      <div
        class="ciPayoutConfirmDialog__surface"
      >
        <header
          class="ciPayoutConfirmDialog__header"
        >
          <div>
            <span>
              Confirmación financiera
            </span>

            <h2>
              Confirmar acreditación
            </h2>
          </div>

          <button
            type="button"
            class="ciPayoutConfirmDialog__close"
            data-ci-payout-confirm-close
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

        <div
          data-ci-payout-confirm-content
        ></div>
      </div>
    `;

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "click",
      (event) => {
        const submit =
          event.target.closest(
            "[data-ci-payout-confirm-submit]"
          );

        if (submit) {
          confirmPayoutAccreditation(
            dialog
          );

          return;
        }

        const close =
          event.target.closest(
            "[data-ci-payout-confirm-close]"
          );

        if (close) {
          dialog.close();
          return;
        }

        if (
          event.target === dialog
        ) {
          dialog.close();
        }
      }
    );

    dialog.addEventListener(
      "change",
      () => {
        const checkbox =
          dialog.querySelector(
            "[data-ci-payout-confirm-check]"
          );

        const button =
          dialog.querySelector(
            "[data-ci-payout-confirm-submit]"
          );

        if (button) {
          button.disabled =
            !checkbox?.checked;
        }
      }
    );

    dialog.addEventListener(
      "close",
      () => {
        payoutConfirmationSeq += 1;

        const shouldRefresh =
          dialog.dataset
            .confirmationComplete ===
          "true";

        const content =
          dialog.querySelector(
            "[data-ci-payout-confirm-content]"
          );

        if (content) {
          content.innerHTML = "";
        }

        delete dialog.dataset.payoutId;
        delete dialog.dataset.purchaseId;
        delete dialog.dataset.confirmationBusy;
        delete dialog.dataset.confirmationComplete;

        if (
          shouldRefresh &&
          isPurchases()
        ) {
          render();
        }
      }
    );

    return dialog;
  }

  function payoutConfirmationLoadingMarkup() {
    return `
      <div
        class="ciPayoutConfirmLoading"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <div>
          <strong>
            Verificando payout
          </strong>

          <span>
            Releyendo el estado financiero
            antes de habilitar la confirmación…
          </span>
        </div>
      </div>
    `;
  }

  function payoutConfirmationMarkup(
    detail
  ) {
    const payout =
      detail?.payout || {};

    const creator =
      detail?.creator || {};

    const payable =
      detail?.payable || {};

    const destination =
      detail?.payment_destination ||
      {};

    return `
      <div
        class="ciPayoutConfirm"
      >
        <section
          class="ciPayoutConfirmHero"
        >
          <div>
            <span>
              Creator
            </span>

            <strong>
              ${escapeHtml(
                creator?.display_name ||
                "Creator"
              )}
            </strong>
          </div>

          <div>
            <span>
              Importe
            </span>

            <strong
              class="ciPayoutConfirmHero__amount"
            >
              ${escapeHtml(
                formatMoney(
                  payout?.amount,
                  payout?.currency
                )
              )}
            </strong>
          </div>
        </section>

        <section
          class="ciPayoutConfirmFacts"
        >
          <div>
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              check_circle
            </span>

            <div>
              <strong>
                Transferencia registrada
              </strong>

              <span>
                ${escapeHtml(
                  payout?.provider ||
                  "Proveedor"
                )}
                ·
                ${escapeHtml(
                  payout?.method ||
                  "Método"
                )}
              </span>
            </div>
          </div>

          <div>
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              verified_user
            </span>

            <div>
              <strong>
                Destino verificado
              </strong>

              <span>
                ${escapeHtml(
                  destination?.alias ||
                  destination
                    ?.holder_name ||
                  "Destino confirmado"
                )}

                ${
                  destination
                    ?.account_identifier_last4
                    ? ` · •••• ${escapeHtml(
                        destination
                          .account_identifier_last4
                      )}`
                    : ""
                }
              </span>
            </div>
          </div>
        </section>

        <section
          class="ciPayoutConfirmImpact"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            account_balance_wallet
          </span>

          <div>
            <strong>
              Qué ocurrirá al confirmar
            </strong>

            <ul>
              <li>
                Payout → Confirmado
              </li>

              <li>
                Payable → Pagado
              </li>

              <li>
                Rights → Activos
              </li>

              <li>
                Asset → Provisioning
              </li>
            </ul>
          </div>
        </section>

        <label
          class="ciPayoutConfirmConsent"
        >
          <input
            type="checkbox"
            data-ci-payout-confirm-check
          />

          <span>
            Confirmo que la transferencia
            fue acreditada al Creator.
          </span>
        </label>

        <div
          class="ciPayoutConfirmMeta"
        >
          ${detailField(
            "Payout",
            shortId(
              payout?.payout_id
            )
          )}

          ${detailField(
            "Referencia",
            payout
              ?.provider_reference
          )}

          ${detailField(
            "Payable",
            shortId(
              payable?.payable_id
            )
          )}

          ${detailField(
            "Estado actual",
            payableStatusMeta(
              payable?.status
            ).label
          )}
        </div>

        <footer
          class="ciPayoutConfirmActions"
        >
          <button
            type="button"
            class="ciPayoutConfirmButton"
            data-ci-payout-confirm-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="
              ciPayoutConfirmButton
              is-primary
            "
            disabled
            data-ci-payout-confirm-submit
          >
            Confirmar acreditación
          </button>
        </footer>

        <div
          class="ciPayoutConfirmGate"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            info
          </span>

          <span>
            Confirmá únicamente si verificaste
            que el dinero fue acreditado
            al Creator.
          </span>
        </div>
      </div>
    `;
  }

  async function openPayoutConfirmation(
    payoutId,
    purchaseId
  ) {
    const id =
      clean(payoutId);

    if (!id) return;

    const dialog =
      ensurePayoutConfirmationDialog();

    const content =
      dialog.querySelector(
        "[data-ci-payout-confirm-content]"
      );

    dialog.dataset.payoutId =
      id;

    dialog.dataset.purchaseId =
      clean(purchaseId);

    if (content) {
      content.innerHTML =
        payoutConfirmationLoadingMarkup();
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const seq =
      ++payoutConfirmationSeq;

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
            }/payouts/${
              encodeURIComponent(id)
            }`,
            {
              method: "GET"
            }
          );

      if (
        seq !==
          payoutConfirmationSeq ||
        !dialog.open
      ) {
        return;
      }

      const payoutStatus =
        clean(
          detail?.payout?.status
        ).toLowerCase();

      const payableStatus =
        clean(
          detail?.payable?.status
        ).toLowerCase();

      const detailPurchaseId =
        clean(
          detail?.payable
            ?.purchase_id
        );

      if (
        payoutStatus !==
          "initiated" ||
        payableStatus !==
          "processing" ||
        (
          purchaseId &&
          detailPurchaseId !==
            clean(purchaseId)
        )
      ) {
        throw new Error(
          "payout_confirmation_state_changed"
        );
      }

      if (content) {
        content.innerHTML =
          payoutConfirmationMarkup(
            detail
          );
      }

    } catch (error) {
      if (
        seq !==
        payoutConfirmationSeq ||
        !dialog.open
      ) {
        return;
      }

      if (content) {
        content.innerHTML = `
          <div
            class="ciPayoutConfirmError"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              error
            </span>

            <strong>
              No se puede confirmar
              este payout
            </strong>

            <span>
              El estado financiero cambió
              o ya no cumple las condiciones
              de confirmación.
            </span>

            <button
              type="button"
              class="ciPayoutConfirmButton"
              data-ci-payout-confirm-close
            >
              Cerrar
            </button>
          </div>
        `;
      }
    }
  }

  /* PCI 2.1F.4B · CONFIRM PAYOUT */

  function setPayoutConfirmationBusy(
    dialog,
    busy
  ) {
    dialog.dataset
      .confirmationBusy =
      busy
        ? "true"
        : "false";

    const checkbox =
      dialog.querySelector(
        "[data-ci-payout-confirm-check]"
      );

    const submit =
      dialog.querySelector(
        "[data-ci-payout-confirm-submit]"
      );

    if (checkbox) {
      checkbox.disabled =
        Boolean(busy);
    }

    if (submit) {
      submit.disabled =
        Boolean(busy) ||
        !checkbox?.checked;

      submit.textContent =
        busy
          ? "Confirmando…"
          : "Confirmar acreditación";
    }
  }

  function payoutConfirmedMarkup(
    result
  ) {
    return `
      <div
        class="ciPayoutConfirmed"
      >
        <div
          class="ciPayoutConfirmed__icon"
          aria-hidden="true"
        >
          <span
            class="material-symbols-rounded"
          >
            check
          </span>
        </div>

        <span
          class="ciPayoutConfirmed__eyebrow"
        >
          Pago acreditado
        </span>

        <h3>
          ${escapeHtml(
            formatMoney(
              result?.amount,
              result?.currency
            )
          )}
        </h3>

        ${pill({
          label: "Pagado",
          tone: "green"
        })}

        <div
          class="ciPayoutConfirmed__grid"
        >
          ${detailField(
            "Payout",
            shortId(
              result?.payout_id
            )
          )}

          ${detailField(
            "Estado",
            "Confirmado"
          )}

          ${detailField(
            "Payable",
            shortId(
              result?.payable_id
            )
          )}

          ${detailField(
            "Payable status",
            result
              ?.payable_status ||
            "paid"
          )}

          ${detailField(
            "Confirmado",
            formatDate(
              result?.confirmed_at
            )
          )}

          ${detailField(
            "Saldo restante",
            formatMoney(
              result?.remaining_due,
              result?.currency
            )
          )}
        </div>

        <div
          class="ciPayoutConfirmed__rights"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            verified_user
          </span>

          <div>
            <strong>
              Pago confirmado
            </strong>

            <span>
              El Payable quedó pagado.
              El sistema ya puede activar los Rights
              y crear el asset en provisioning.
            </span>
          </div>
        </div>

        <div
          class="ciPayoutConfirmActions"
        >
          <button
            type="button"
            class="
              ciPayoutConfirmButton
              is-primary
            "
            data-ci-payout-confirm-close
          >
            Cerrar y actualizar
          </button>
        </div>
      </div>
    `;
  }

  async function confirmPayoutAccreditation(
    dialog
  ) {
    if (
      dialog.dataset
        .confirmationBusy ===
      "true"
    ) {
      return;
    }

    const checkbox =
      dialog.querySelector(
        "[data-ci-payout-confirm-check]"
      );

    if (!checkbox?.checked) {
      return;
    }

    const payoutId =
      clean(
        dialog.dataset
          .payoutId
      );

    const purchaseId =
      clean(
        dialog.dataset
          .purchaseId
      );

    if (!payoutId) {
      return;
    }

    setPayoutConfirmationBusy(
      dialog,
      true
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

      /*
       * Re-read obligatorio inmediatamente
       * antes de la mutación.
       */
      const detail =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/payouts/${
              encodeURIComponent(
                payoutId
              )
            }`,
            {
              method: "GET"
            }
          );

      const currentPayoutStatus =
        clean(
          detail?.payout?.status
        ).toLowerCase();

      const currentPayableStatus =
        clean(
          detail?.payable?.status
        ).toLowerCase();

      const currentPurchaseId =
        clean(
          detail?.payable
            ?.purchase_id
        );

      if (
        currentPayoutStatus !==
          "initiated" ||
        currentPayableStatus !==
          "processing" ||
        (
          purchaseId &&
          currentPurchaseId !==
            purchaseId
        )
      ) {
        const error =
          new Error(
            "payout_confirmation_state_changed"
          );

        error.code =
          "payout_confirmation_state_changed";

        throw error;
      }

      /*
       * Única mutación de 2.1F.4B.
       *
       * Backend:
       * payout initiated -> confirmed
       * payable processing -> paid
       *
       * Trigger:
       * rights -> active
       * asset -> provisioning
       */
      const result =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/payouts/${
              encodeURIComponent(
                payoutId
              )
            }/confirm`,
            {
              method: "POST",
              body: JSON.stringify({
                idempotency_key:
                  window.crypto
                    .randomUUID()
              })
            }
          );

      dialog.dataset
        .confirmationComplete =
        "true";

      const content =
        dialog.querySelector(
          "[data-ci-payout-confirm-content]"
        );

      if (content) {
        content.innerHTML =
          payoutConfirmedMarkup(
            result
          );
      }

    } catch (error) {
      setPayoutConfirmationBusy(
        dialog,
        false
      );

      const content =
        dialog.querySelector(
          "[data-ci-payout-confirm-content]"
        );

      const code =
        clean(error?.code);

      if (content) {
        content.innerHTML = `
          <div
            class="ciPayoutConfirmError"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              error
            </span>

            <strong>
              No se confirmó el pago
            </strong>

            <span>
              ${
                code ===
                "payout_confirmation_state_changed"
                  ? "El estado financiero cambió antes de confirmar."
                  : escapeHtml(
                      code ||
                      error?.message ||
                      "La operación fue rechazada."
                    )
              }
            </span>

            <button
              type="button"
              class="ciPayoutConfirmButton"
              data-ci-payout-confirm-close
            >
              Cerrar
            </button>
          </div>
        `;
      }
    }
  }

  function detailField(
    label,
    value
  ) {
    return `
      <div
        class="ciPurchaseDetailField"
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

  function timelineMarkup(detail) {
    const purchase =
      detail?.purchase || {};

    const offer =
      detail?.offer || {};

    const payable =
      (
        Array.isArray(
          detail?.payables
        )
          ? detail.payables
          : []
      ).find(
        (item) =>
          clean(
            item?.concept_type
          ) ===
          "base_purchase"
      ) ||
      detail?.payables?.[0] ||
      null;

    const detailPayouts =
      Array.isArray(
        detail?.payouts
      )
        ? detail.payouts
        : [];

    const rights =
      Array.isArray(
        detail?.rights
      )
        ? detail.rights
        : [];

    const assets =
      Array.isArray(
        detail?.assets
      )
        ? detail.assets
        : [];

    const activeRight =
      rights.find(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "active"
      );

    const availableAsset =
      assets.find(
        (item) =>
          clean(
            item?.status
          ).toLowerCase() ===
          "available"
      );

    const steps = [
      {
        label:
          "Oferta final aceptada",
        description:
          "El Creator aceptó la Oferta Formal de Protocol.",
        done:
          Boolean(
            offer?.accepted_at
          ),
        at:
          offer?.accepted_at
      },
      {
        label:
          "Compra acordada",
        description:
          "Purchase creado a partir del acuerdo comercial.",
        done:
          Boolean(
            purchase?.agreed_at
          ),
        at:
          purchase?.agreed_at
      },
      {
        label:
          "Payable creado",
        description:
          "La obligación de pago quedó registrada.",
        done:
          Boolean(payable),
        at:
          payable?.created_at
      },
      {
        label:
          "Destino de cobro confirmado",
        description:
          payable
            ?.payment_account_confirmed_at
            ? "El Creator confirmó el destino de cobro."
            : "Esperando confirmación del Creator.",
        done:
          Boolean(
            payable
              ?.payment_account_confirmed_at
          ),
        at:
          payable
            ?.payment_account_confirmed_at
      },
      {
        label:
          "Transferencia registrada",
        description:
          detailPayouts.length
            ? "Existe un payout asociado a esta compra."
            : "Todavía no existe un payout para esta compra.",
        done:
          detailPayouts.length > 0,
        at:
          detailPayouts[0]
            ?.transferred_at ||
          detailPayouts[0]
            ?.created_at
      },
      {
        label:
          "Pago confirmado",
        description:
          clean(
            payable?.status
          ).toLowerCase() ===
          "paid"
            ? "La obligación quedó pagada."
            : "El payable todavía no está pagado.",
        done:
          clean(
            payable?.status
          ).toLowerCase() ===
          "paid",
        at:
          payable?.paid_at
      },
      {
        label:
          "Rights activos",
        description:
          activeRight
            ? "Los derechos comerciales ya están activos."
            : "Los Rights se activan únicamente después del pago.",
        done:
          Boolean(activeRight),
        at:
          activeRight?.active_at
      },
      {
        label:
          "Asset disponible",
        description:
          availableAsset
            ? "El archivo adquirido ya está disponible en Biblioteca."
            : "El asset todavía no está disponible para uso.",
        done:
          Boolean(
            availableAsset
          ),
        at:
          availableAsset
            ?.provisioned_at
      }
    ];

    let currentAssigned = false;

    return steps
      .map((step) => {
        const current =
          !step.done &&
          !currentAssigned;

        if (current) {
          currentAssigned = true;
        }

        return `
          <div
            class="
              ciPurchaseTimelineStep
              ${
                step.done
                  ? "is-done"
                  : current
                    ? "is-current"
                    : "is-pending"
              }
            "
          >
            <div
              class="ciPurchaseTimelineStep__marker"
              aria-hidden="true"
            >
              <span
                class="material-symbols-rounded"
              >
                ${
                  step.done
                    ? "check"
                    : current
                      ? "schedule"
                      : "radio_button_unchecked"
                }
              </span>
            </div>

            <div
              class="ciPurchaseTimelineStep__copy"
            >
              <strong>
                ${escapeHtml(
                  step.label
                )}
              </strong>

              <span>
                ${escapeHtml(
                  step.description
                )}
              </span>
            </div>

            <time>
              ${
                step.at
                  ? escapeHtml(
                      formatDate(
                        step.at
                      )
                    )
                  : ""
              }
            </time>
          </div>
        `;
      })
      .join("");
  }

  function detailMarkup(detail) {
    const purchase =
      detail?.purchase || {};

    const creator =
      detail?.creator || {};

    const offer =
      detail?.offer || {};

    const items =
      Array.isArray(
        offer?.items
      )
        ? offer.items
        : [];

    const item =
      items[0] || {};

    const submission =
      item?.submission || {};

    const version =
      item?.version || {};

    const detailPayables =
      Array.isArray(
        detail?.payables
      )
        ? detail.payables
        : [];

    const payable =
      detailPayables.find(
        (entry) =>
          clean(
            entry?.concept_type
          ) ===
          "base_purchase"
      ) ||
      detailPayables[0] ||
      null;

    const detailPayouts =
      Array.isArray(
        detail?.payouts
      )
        ? detail.payouts
        : [];

    const rights =
      Array.isArray(
        detail?.rights
      )
        ? detail.rights
        : [];

    const assets =
      Array.isArray(
        detail?.assets
      )
        ? detail.assets
        : [];

    const purchaseMeta =
      purchaseStatusMeta(
        purchase?.status
      );

    const payableMeta =
      payableStatusMeta(
        payable?.status
      );

    const destination =
      payable
        ?.payment_destination ||
      null;

    const rightsMarkup =
      rights.length
        ? rights
            .map((right) => `
              <div
                class="ciPurchaseRightsRow"
              >
                <div>
                  <strong>
                    V${escapeHtml(
                      version?.version_number ||
                      ""
                    )}
                  </strong>

                  <span>
                    Grant ${escapeHtml(
                      shortId(
                        right
                          ?.rights_grant_id
                      )
                    )}
                  </span>
                </div>

                ${pill(
                  rightsStatusMeta(
                    right?.status
                  )
                )}
              </div>
            `)
            .join("")
        : `
          <div
            class="ciPurchaseMuted"
          >
            Sin Rights asociados.
          </div>
        `;

    const payoutMarkup =
      detailPayouts.length
        ? detailPayouts
            .map((payout) => `
              <div
                class="ciPurchasePayoutRow"
              >
                <div>
                  <strong>
                    ${escapeHtml(
                      formatMoney(
                        payout?.amount,
                        payout?.currency
                      )
                    )}
                  </strong>

                  <span>
                    ${
                      escapeHtml(
                        payout?.provider ||
                        "Proveedor"
                      )
                    }
                    ·
                    ${
                      escapeHtml(
                        payout?.method ||
                        "Método"
                      )
                    }
                  </span>
                </div>

                <div
                  class="ciPurchasePayoutRow__actions"
                >
                  ${pill(
                    payoutStatusMeta(
                      payout?.status
                    )
                  )}

                  ${
                    clean(
                      payout?.status
                    ).toLowerCase() ===
                    "initiated"
                      ? `
                        <button
                          type="button"
                          class="ciPayoutConfirmTrigger"
                          data-ci-payout-confirm-open
                          data-payout-id="${escapeHtml(
                            payout?.payout_id
                          )}"
                          data-purchase-id="${escapeHtml(
                            purchase?.purchase_id
                          )}"
                        >
                          Confirmar acreditación
                        </button>
                      `
                      : ""
                  }
                </div>
              </div>
            `)
            .join("")
        : `
          <div
            class="ciPurchaseMuted"
          >
            No hay payouts asociados
            a esta compra.
          </div>
        `;

    const asset =
      assets[0] || null;

    return `
      <div
        class="ciPurchaseDetailInner"
      >
        <header
          class="ciPurchaseDetailHero"
        >
          <div>
            <span
              class="ciPurchaseDetailHero__eyebrow"
            >
              Compra
              ${escapeHtml(
                shortId(
                  purchase
                    ?.purchase_id
                )
              )}
            </span>

            <h2>
              ${escapeHtml(
                formatMoney(
                  purchase?.total_amount,
                  purchase?.currency
                )
              )}
            </h2>

            <div
              class="ciPurchaseDetailHero__status"
            >
              ${pill(purchaseMeta)}
              ${pill(payableMeta)}
            </div>
          </div>

          <div
            class="ciPurchaseDetailHero__date"
          >
            <span>
              Acordada
            </span>

            <strong>
              ${escapeHtml(
                formatDate(
                  purchase?.agreed_at
                )
              )}
            </strong>
          </div>
        </header>

        <div
          class="ciPurchaseDetailGrid"
        >
          <section
            class="ciPurchaseDetailCard"
          >
            <div
              class="ciPurchaseDetailCard__title"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                person
              </span>

              Creator
            </div>

            <h3>
              ${escapeHtml(
                creator?.display_name ||
                "Creator"
              )}
            </h3>

            <p>
              ${escapeHtml(
                creator?.email ||
                "—"
              )}
            </p>

            <div
              class="ciPurchaseDetailFields"
            >
              ${detailField(
                "Estado",
                creator?.status
              )}

              ${detailField(
                "Creator ID",
                shortId(
                  creator?.creator_id
                )
              )}
            </div>
          </section>

          <section
            class="ciPurchaseDetailCard"
          >
            <div
              class="ciPurchaseDetailCard__title"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                movie
              </span>

              Entrega exacta
            </div>

            <h3>
              ${escapeHtml(
                submission
                  ?.concept_label ||
                "Entrega adquirida"
              )}
            </h3>

            <p>
              ${
                version
                  ?.version_number
                  ? `V${escapeHtml(
                      version.version_number
                    )}`
                  : "Versión exacta"
              }
              ·
              ${escapeHtml(
                version?.status ||
                "—"
              )}
            </p>

            <div
              class="ciPurchaseDetailFields"
            >
              ${detailField(
                "Archivo",
                version
                  ?.original_filename
              )}

              ${detailField(
                "Resolución",
                (
                  version?.width &&
                  version?.height
                )
                  ? `${version.width} × ${version.height}`
                  : "—"
              )}

              ${detailField(
                "Duración",
                Number.isFinite(
                  Number(
                    version
                      ?.duration_seconds
                  )
                )
                  ? `${
                      Number(
                        version
                          .duration_seconds
                      ).toFixed(1)
                    } s`
                  : "—"
              )}

              ${detailField(
                "Tamaño",
                formatBytes(
                  version
                    ?.file_size_bytes
                )
              )}
            </div>
          </section>

          <section
            class="
              ciPurchaseDetailCard
              ciPurchaseDetailCard--payment
            "
          >
            <div
              class="ciPurchaseDetailCard__title"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                payments
              </span>

              Pago
            </div>

            <div
              class="ciPurchasePaymentHeadline"
            >
              <div>
                <span>
                  Obligación
                </span>

                <strong>
                  ${escapeHtml(
                    formatMoney(
                      payable
                        ?.amount_due,
                      payable
                        ?.currency ||
                      purchase
                        ?.currency
                    )
                  )}
                </strong>
              </div>

              ${pill(payableMeta)}
            </div>

            ${
              destination
                ? `
                  <div
                    class="ciPurchaseDestination"
                  >
                    <span>
                      Destino confirmado
                    </span>

                    <strong>
                      ${escapeHtml(
                        destination
                          ?.holder_name ||
                        "Titular"
                      )}
                    </strong>

                    <p>
                      ${
                        escapeHtml(
                          destination
                            ?.provider ||
                          ""
                        )
                      }
                      ${
                        destination
                          ?.alias
                          ? `· ${escapeHtml(
                              destination.alias
                            )}`
                          : ""
                      }
                      ${
                        destination
                          ?.account_identifier_last4
                          ? `· •••• ${escapeHtml(
                              destination
                                .account_identifier_last4
                            )}`
                          : ""
                      }
                    </p>
                  </div>
                `
                : `
                  <div
                    class="
                      ciPurchaseDestination
                      is-pending
                    "
                  >
                    <span
                      class="material-symbols-rounded"
                      aria-hidden="true"
                    >
                      schedule
                    </span>

                    <div>
                      <strong>
                        Esperando confirmación
                        del Creator
                      </strong>

                      <p>
                        Todavía no existe
                        un destino de cobro
                        confirmado.
                      </p>
                    </div>
                  </div>
                `
            }

            ${
              clean(
                payable?.status
              ).toLowerCase() ===
              "ready_to_pay"
                ? `
                  <div
                    class="ciPurchasePrepareAction"
                  >
                    <button
                      type="button"
                      class="ciPurchasePrepareButton"
                      data-ci-prepare-payment
                      data-payable-id="${escapeHtml(
                        payable?.payable_id
                      )}"
                      data-purchase-id="${escapeHtml(
                        purchase?.purchase_id
                      )}"
                    >
                      <span
                        class="material-symbols-rounded"
                        aria-hidden="true"
                      >
                        payments
                      </span>

                      Preparar pago
                    </button>

                    <span>
                      Muestra el destino exacto sólo
                      durante la preparación.
                    </span>
                  </div>
                `
                : ""
            }

            <div
              class="ciPurchaseDetailFields"
            >
              ${detailField(
                "Payable",
                shortId(
                  payable
                    ?.payable_id
                )
              )}

              ${detailField(
                "Confirmado",
                payable
                  ?.payment_account_confirmed_at
                  ? formatDate(
                      payable
                        .payment_account_confirmed_at
                    )
                  : "Pendiente"
              )}

              ${detailField(
                "Pagado",
                payable?.paid_at
                  ? formatDate(
                      payable
                        .paid_at
                    )
                  : "No"
              )}
            </div>
          </section>

          <section
            class="ciPurchaseDetailCard"
          >
            <div
              class="ciPurchaseDetailCard__title"
            >
              <span
                class="material-symbols-rounded"
                aria-hidden="true"
              >
                verified_user
              </span>

              Rights
            </div>

            <div
              class="ciPurchaseRightsList"
            >
              ${rightsMarkup}
            </div>

            <p
              class="ciPurchaseDetailNote"
            >
              Los Rights comerciales
              sólo pueden activarse
              después de que el pago
              quede confirmado.
            </p>
          </section>
        </div>

        <section
          class="ciPurchaseDetailSection"
        >
          <header>
            <div>
              <span
                class="ciPurchaseDetailSection__eyebrow"
              >
                Payouts
              </span>

              <h3>
                Movimientos de pago
              </h3>
            </div>

            <span
              class="ciPurchaseDetailSection__count"
            >
              ${detailPayouts.length}
            </span>
          </header>

          <div
            class="ciPurchasePayoutList"
          >
            ${payoutMarkup}
          </div>
        </section>

        <section
          class="ciPurchaseDetailSection"
        >
          <header>
            <div>
              <span
                class="ciPurchaseDetailSection__eyebrow"
              >
                Trazabilidad
              </span>

              <h3>
                Estado de la adquisición
              </h3>
            </div>
          </header>

          <div
            class="ciPurchaseTimeline"
          >
            ${timelineMarkup(
              detail
            )}
          </div>
        </section>

        ${
          asset
            ? `
              <section
                class="ciPurchaseAssetReady"
              >
                <span
                  class="material-symbols-rounded"
                  aria-hidden="true"
                >
                  video_library
                </span>

                <div>
                  <strong>
                    Asset ${
                      escapeHtml(
                        asset?.status ||
                        ""
                      )
                    }
                  </strong>

                  <span>
                    ${escapeHtml(
                      shortId(
                        asset
                          ?.creative_asset_id
                      )
                    )}
                  </span>
                </div>
              </section>
            `
            : ""
        }
      </div>
    `;
  }

  async function renderDetail(
    purchaseId
  ) {
    const root =
      document.querySelector(
        "[data-ci-purchase-detail]"
      );

    if (!root) return;

    if (!purchaseId) {
      root.innerHTML = `
        <div
          class="ciPurchaseDetailEmpty"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            receipt_long
          </span>

          <strong>
            Seleccioná una compra
          </strong>

          <span>
            Acá vas a ver su trazabilidad
            comercial, financiera y de Rights.
          </span>
        </div>
      `;
      return;
    }

    const seq =
      ++detailSeq;

    root.innerHTML = `
      <div
        class="ciPurchaseDetailLoading"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <span>
          Cargando detalle…
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
            }/purchases/${
              encodeURIComponent(
                purchaseId
              )
            }`,
            {
              method: "GET"
            }
          );

      if (
        seq !== detailSeq ||
        !isPurchases() ||
        purchaseId !==
          selectedPurchaseId
      ) {
        return;
      }

      root.innerHTML =
        detailMarkup(
          detail
        );

    } catch (error) {
      if (
        seq !== detailSeq
      ) {
        return;
      }

      root.innerHTML = `
        <div
          class="ciPurchaseDetailError"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            error
          </span>

          <strong>
            No pudimos abrir
            esta compra.
          </strong>

          <span>
            ${escapeHtml(
              friendlyError(error)
            )}
          </span>
        </div>
      `;
    }
  }

  function selectPurchase(
    id
  ) {
    const cleanId =
      clean(id);

    if (!cleanId) return;

    selectedPurchaseId =
      cleanId;

    writePurchaseToUrl(
      cleanId
    );

    document
      .querySelectorAll(
        "[data-ci-purchase-id]"
      )
      .forEach((row) => {
        const selected =
          clean(
            row.dataset
              .ciPurchaseId
          ) ===
          cleanId;

        row.classList.toggle(
          "is-selected",
          selected
        );

        row.setAttribute(
          "aria-pressed",
          selected
            ? "true"
            : "false"
        );
      });

    renderDetail(
      cleanId
    );
  }

  function syncSelectionAfterFilter() {
    const visible =
      visiblePurchases();

    if (
      visible.some(
        (item) =>
          clean(
            item?.purchase_id
          ) ===
          selectedPurchaseId
      )
    ) {
      return;
    }

    selectedPurchaseId =
      clean(
        visible[0]
          ?.purchase_id
      ) || null;

    writePurchaseToUrl(
      selectedPurchaseId
    );

    if (
      selectedPurchaseId
    ) {
      renderDetail(
        selectedPurchaseId
      );
    }
  }

  function bindView() {
    const root =
      stage();

    if (!root) return;

    const search =
      root.querySelector(
        "[data-ci-purchase-search]"
      );

    if (search) {
      search.addEventListener(
        "input",
        () => {
          searchTerm =
            search.value || "";

          renderRows();
          syncSelectionAfterFilter();
          renderRows();
        }
      );
    }

    root.addEventListener(
      "click",
      (event) => {
        const confirmPayout =
          event.target.closest(
            "[data-ci-payout-confirm-open]"
          );

        if (confirmPayout) {
          openPayoutConfirmation(
            confirmPayout.dataset
              .payoutId,
            confirmPayout.dataset
              .purchaseId
          );

          return;
        }

        const preparePayment =
          event.target.closest(
            "[data-ci-prepare-payment]"
          );

        if (preparePayment) {
          openPaymentPreparation(
            preparePayment.dataset
              .payableId,
            preparePayment.dataset
              .purchaseId
          );

          return;
        }

        const refresh =
          event.target.closest(
            "[data-ci-purchase-refresh]"
          );

        if (refresh) {
          render();
          return;
        }

        const filter =
          event.target.closest(
            "[data-ci-purchase-filter]"
          );

        if (filter) {
          currentFilter =
            clean(
              filter.dataset
                .ciPurchaseFilter
            ) || "all";

          root
            .querySelectorAll(
              "[data-ci-purchase-filter]"
            )
            .forEach((button) => {
              const active =
                clean(
                  button.dataset
                    .ciPurchaseFilter
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
            });

          renderRows();
          syncSelectionAfterFilter();
          renderRows();

          return;
        }

        const row =
          event.target.closest(
            "[data-ci-purchase-id]"
          );

        if (row) {
          selectPurchase(
            row.dataset
              .ciPurchaseId
          );
        }
      }
    );
  }

  async function render() {
    if (!isPurchases()) {
      return;
    }

    const root =
      stage();

    if (!root) return;

    const seq =
      ++requestSeq;

    root.innerHTML =
      loadingMarkup();

    try {
      if (
        !window.PCIRuntime
      ) {
        throw new Error(
          "pci_runtime_unavailable"
        );
      }

      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      if (
        !connection?.signedIn
      ) {
        const error =
          new Error(
            "pci_auth_session_required"
          );

        error.code =
          "pci_auth_session_required";

        throw error;
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

      const base =
        `/v1/workspaces/${
          encodeURIComponent(
            workspace
          )
        }`;

      const [
        purchasesResponse,
        payablesResponse,
        payoutsResponse
      ] =
        await Promise.all([
          window.PCIRuntime.request(
            `${base}/purchases`,
            {
              method: "GET"
            }
          ),
          window.PCIRuntime.request(
            `${base}/payables`,
            {
              method: "GET"
            }
          ),
          window.PCIRuntime.request(
            `${base}/payouts`,
            {
              method: "GET"
            }
          )
        ]);

      if (
        seq !== requestSeq ||
        !isPurchases()
      ) {
        return;
      }

      purchases =
        Array.isArray(
          purchasesResponse?.items
        )
          ? purchasesResponse.items
          : [];

      payables =
        Array.isArray(
          payablesResponse?.items
        )
          ? payablesResponse.items
          : [];

      payouts =
        Array.isArray(
          payoutsResponse?.items
        )
          ? payoutsResponse.items
          : [];

      const requested =
        requestedPurchaseId();

      if (
        requested &&
        purchases.some(
          (item) =>
            clean(
              item?.purchase_id
            ) ===
            requested
        )
      ) {
        selectedPurchaseId =
          requested;
      } else if (
        !purchases.some(
          (item) =>
            clean(
              item?.purchase_id
            ) ===
            selectedPurchaseId
        )
      ) {
        selectedPurchaseId =
          clean(
            purchases[0]
              ?.purchase_id
          ) || null;
      }

      writePurchaseToUrl(
        selectedPurchaseId
      );

      root.innerHTML =
        shellMarkup();

      bindView();

      if (
        selectedPurchaseId
      ) {
        renderDetail(
          selectedPurchaseId
        );
      }

    } catch (error) {
      if (
        seq !== requestSeq
      ) {
        return;
      }

      root.innerHTML =
        errorMarkup(error);

      root
        .querySelector(
          "[data-ci-purchase-refresh]"
        )
        ?.addEventListener(
          "click",
          render
        );
    }
  }

  function boot() {
    if (isPurchases()) {
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
})();
