/* ============================================================
   Protocol Data · Experiencias
   Lectura real del dashboard desde Supabase.
   Sin escrituras, automatizaciones ni envíos.
   ============================================================ */

(function () {
  "use strict";

  const PAGE_EVENT = "sazzu:page:load";

  const state = {
    search: "",
    status: "all",
    requestId: 0,
    searchTimer: null,

    opinionSearch: "",
    opinionRequestId: 0,
    opinionSearchTimer: null,
    detailSessionId: null,
    sendNowBusy: false
  };

  function getRoot_() {
    return document.getElementById("experienciasPage");
  }

  function escapeHtml_(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate_(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  }

  function formatRating_(value) {
    const rating = Number(value);

    if (!Number.isFinite(rating) || rating <= 0) {
      return "—";
    }

    return (
      rating.toLocaleString("es-AR", {
        minimumFractionDigits:
          Number.isInteger(rating) ? 0 : 1,
        maximumFractionDigits: 2
      }) + " / 5"
    );
  }

  function emailState_(status) {
    const states = {
      pending: {
        key: "scheduled",
        label: "Programado"
      },
      processing: {
        key: "scheduled",
        label: "Procesando"
      },
      sent: {
        key: "sent",
        label: "Enviado"
      },
      error: {
        key: "error",
        label: "Error"
      },
      skipped: {
        key: "error",
        label: "Omitido"
      },
      cancelled: {
        key: "error",
        label: "Cancelado"
      }
    };

    return states[status] || {
      key: "scheduled",
      label: "Sin evento"
    };
  }

  function experienceState_(row) {
    if (
      row.submitted_at ||
      row.session_status === "submitted"
    ) {
      return {
        key: "submitted",
        label: "Respondida"
      };
    }

    if (row.opened_at) {
      return {
        key: "opened",
        label: "Abierta"
      };
    }

    if (
      row.email_status === "error" ||
      row.session_status === "error"
    ) {
      return {
        key: "error",
        label: "Con error"
      };
    }

    if (row.email_status === "sent") {
      return {
        key: "sent",
        label: "Enviada"
      };
    }

    return {
      key: "scheduled",
      label: "Programada"
    };
  }

  function stateChip_(stateInfo) {
    return `
      <span
        class="expStateChip expStateChip--${stateInfo.key}"
      >
        ${escapeHtml_(stateInfo.label)}
      </span>
    `;
  }

  function renderMetrics_(root, metrics) {
    const values = {
      scheduled: Number(metrics.scheduled || 0),
      sent: Number(metrics.sent || 0),
      opened: Number(metrics.opened || 0),
      submitted: Number(metrics.submitted || 0),
      rating: Number(metrics.rating || 0)
    };

    Object.entries(values).forEach(([key, value]) => {
      const element = root.querySelector(
        `[data-exp-kpi="${key}"]`
      );

      if (!element) return;

      if (key === "rating") {
        element.textContent = value
          ? value.toLocaleString("es-AR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2
            })
          : "0";
        return;
      }

      element.textContent =
        value.toLocaleString("es-AR");
    });
  }

  function renderEmpty_(tbody, payload) {
    const total = Number(payload.total || 0);

    tbody.innerHTML = `
      <tr class="expEmptyRow">
        <td colspan="8">
          <div class="expEmptyState">
            <div
              class="expEmptyState__icon"
              aria-hidden="true"
            >
              ✦
            </div>

            <h3 data-exp-empty-title>
              ${
                total === 0
                  ? "Todavía no hay experiencias registradas"
                  : "No hay experiencias para este filtro"
              }
            </h3>

            <p data-exp-empty-copy>
              ${
                total === 0
                  ? "Las experiencias aparecerán cuando un pedido sea marcado como entregado."
                  : "Probá cambiando la búsqueda o el estado seleccionado."
              }
            </p>
          </div>
        </td>
      </tr>
    `;
  }

  function renderRows_(root, payload) {
    const tbody = root.querySelector(
      "[data-exp-table-body]"
    );

    if (!tbody) return;

    const rows = Array.isArray(payload.rows)
      ? payload.rows
      : [];

    if (!rows.length) {
      renderEmpty_(tbody, payload);
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const emailState = emailState_(
          row.email_status
        );

        const experienceState =
          experienceState_(row);

        const order =
          row.shopify_order_name ||
          row.shopify_order_id ||
          "Pedido sin identificar";

        const customer =
          row.customer_first_name || "Cliente";

        const scheduledFor =
          row.email_scheduled_for ||
          row.scheduled_for;

        return `
          <tr data-exp-session-id="${escapeHtml_(
            row.session_id
          )}">
            <td>
              <strong>${escapeHtml_(order)}</strong>
              <br />
              <span>
                ${escapeHtml_(
                  row.tracking_id || "Sin tracking"
                )}
              </span>
            </td>

            <td>
              <strong>${escapeHtml_(customer)}</strong>
              <br />
              <span>
                ${escapeHtml_(
                  row.customer_email || "Sin correo"
                )}
              </span>
            </td>

            <td>
              ${escapeHtml_(
                formatDate_(row.delivered_at)
              )}
            </td>

            <td>
              ${escapeHtml_(
                formatDate_(scheduledFor)
              )}
            </td>

            <td>
              ${stateChip_(emailState)}
            </td>

            <td>
              ${stateChip_(experienceState)}
            </td>

            <td>
              ${escapeHtml_(
                formatRating_(row.general_rating)
              )}
            </td>

            <td class="expTable__actionsCol">
              <button
                class="expBtn expBtn--ghost"
                type="button"
                data-exp-open-drawer
                data-exp-open-detail="${escapeHtml_(row.session_id)}"
              >
                Ver
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }


  function ratingStars_(value) {
    const rating = Math.max(
      0,
      Math.min(5, Number(value) || 0)
    );

    const filled = "★".repeat(Math.round(rating));
    const empty = "☆".repeat(5 - Math.round(rating));

    return filled + empty;
  }

  function eventLabel_(value) {
    const labels = {
      session_scheduled: "Experiencia programada",
      email_send_now_requested: "Envío inmediato solicitado",
      email_claimed: "Correo tomado por el worker",
      email_sent: "Correo enviado",
      email_error: "Error de envío",
      email_skipped: "Correo omitido",
      session_opened: "Experiencia abierta",
      session_submitted: "Opinión recibida"
    };

    return labels[value] || String(value || "Evento");
  }

  function setDrawerLoading_(root) {
    const drawer = root.querySelector(
      "[data-exp-drawer]"
    );

    if (!drawer) return;

    const title = drawer.querySelector(
      ".expDrawer__title"
    );

    const subtitle = drawer.querySelector(
      ".expDrawer__subtitle"
    );

    const body = drawer.querySelector(
      ".expDrawer__body"
    );

    if (title) {
      title.textContent = "Cargando experiencia…";
    }

    if (subtitle) {
      subtitle.textContent =
        "Consultando la información real en Supabase.";
    }

    if (body) {
      body.innerHTML = `
        <section class="expDrawerSection">
          <div class="expTimelinePlaceholder">
            Cargando pedido, productos, opiniones y eventos…
          </div>
        </section>
      `;
    }
  }

  function configureSubmittedFooter_(
    root,
    session
  ) {
    const footer = root.querySelector(
      ".expDrawer__footer"
    );

    if (!footer) return;

    const primaryButton = footer.querySelector(
      ".expBtn--primary"
    );

    const secondaryButtons = Array.from(
      footer.querySelectorAll(
        ".expBtn--ghost"
      )
    );

    const submitted = Boolean(
      session?.submitted_at ||
      session?.status === "submitted"
    );

    footer.classList.toggle(
      "is-submitted",
      submitted
    );

    secondaryButtons.forEach((button) => {
      button.hidden = submitted;

      button.style.display = submitted
        ? "none"
        : "";
    });

    if (!primaryButton) return;

    if (submitted) {
      primaryButton.removeAttribute(
        "data-exp-send-now"
      );

      primaryButton.setAttribute(
        "data-exp-close-drawer",
        "1"
      );

      primaryButton.textContent =
        "Cerrar detalle";

      primaryButton.disabled = false;

      return;
    }

    primaryButton.removeAttribute(
      "data-exp-close-drawer"
    );
  }

  function renderDetail_(root, payload) {
    const drawer = root.querySelector(
      "[data-exp-drawer]"
    );

    if (!drawer) return;

    const session = payload.session || {};
    const email = payload.email || {};
    const response = payload.response || {};
    const items = Array.isArray(payload.items)
      ? payload.items
      : [];
    const events = Array.isArray(payload.events)
      ? payload.events
      : [];

    const order =
      session.shopify_order_name ||
      session.shopify_order_id ||
      "Pedido sin identificar";

    const customer =
      session.customer_first_name || "Cliente";

    const title = drawer.querySelector(
      ".expDrawer__title"
    );

    const subtitle = drawer.querySelector(
      ".expDrawer__subtitle"
    );

    const body = drawer.querySelector(
      ".expDrawer__body"
    );

    if (title) {
      title.textContent = `Experiencia ${order}`;
    }

    if (subtitle) {
      subtitle.textContent =
        `${customer} · ${
          session.customer_email || "Sin correo"
        }`;
    }

    if (!body) return;

    configureSendNowButton_(
      root,
      session,
      email
    );

    configureSubmittedFooter_(
      root,
      session
    );

    const productMarkup = items.length
      ? items.map((item) => {
          const productName =
            item.product_title ||
            item.line_item_name ||
            "Producto";

          const review =
            String(item.review_text || "").trim();

          return `
            <div class="expProductPlaceholder">
              <strong>
                ${escapeHtml_(productName)}
              </strong>

              <br />

              <span>
                SKU:
                ${escapeHtml_(item.sku || "—")}
                · Cantidad:
                ${escapeHtml_(item.quantity || 1)}
              </span>

              <br />

              <span class="expRatingPlaceholder">
                ${escapeHtml_(ratingStars_(item.rating))}
              </span>

              <br />

              <span>
                ${
                  review
                    ? escapeHtml_(review)
                    : "Sin comentario individual."
                }
              </span>
            </div>
          `;
        }).join("")
      : `
          <div class="expProductPlaceholder">
            No se encontraron productos asociados.
          </div>
        `;

    const eventsMarkup = events.length
      ? events.map((eventRow) => `
          <div class="expTimelinePlaceholder">
            <strong>
              ${escapeHtml_(
                eventLabel_(eventRow.event_type)
              )}
            </strong>

            <br />

            <span>
              ${escapeHtml_(
                formatDate_(eventRow.occurred_at)
              )}
              ·
              ${escapeHtml_(
                eventRow.event_source || "sistema"
              )}
            </span>
          </div>
        `).join("")
      : `
          <div class="expTimelinePlaceholder">
            No hay eventos registrados.
          </div>
        `;

    const generalRating =
      Number(response.general_rating || 0);

    body.innerHTML = `
      <section class="expDrawerSection">
        <div class="expDrawerSection__head">
          <span>Pedido y cliente</span>
          ${stateChip_(experienceState_({
            ...session,
            session_status: session.status,
            email_status: email.status
          }))}
        </div>

        <dl class="expDefinitionGrid">
          <div>
            <dt>Pedido</dt>
            <dd>${escapeHtml_(order)}</dd>
          </div>

          <div>
            <dt>Cliente</dt>
            <dd>${escapeHtml_(customer)}</dd>
          </div>

          <div>
            <dt>Correo</dt>
            <dd>
              ${escapeHtml_(
                session.customer_email || "—"
              )}
            </dd>
          </div>

          <div>
            <dt>Tracking</dt>
            <dd>
              ${escapeHtml_(
                session.tracking_id || "—"
              )}
            </dd>
          </div>

          <div>
            <dt>Entrega</dt>
            <dd>
              ${escapeHtml_(
                formatDate_(session.delivered_at)
              )}
            </dd>
          </div>

          <div>
            <dt>Vencimiento</dt>
            <dd>
              ${escapeHtml_(
                formatDate_(session.expires_at)
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section class="expDrawerSection">
        <div class="expDrawerSection__head">
          <span>Correo de invitación</span>
          ${stateChip_(emailState_(email.status))}
        </div>

        <dl class="expDefinitionGrid">
          <div>
            <dt>Programado</dt>
            <dd>
              ${escapeHtml_(
                formatDate_(
                  email.scheduled_for ||
                  session.scheduled_for
                )
              )}
            </dd>
          </div>

          <div>
            <dt>Enviado</dt>
            <dd>
              ${escapeHtml_(
                formatDate_(
                  email.sent_at ||
                  session.email_sent_at
                )
              )}
            </dd>
          </div>

          <div>
            <dt>Intentos</dt>
            <dd>
              ${escapeHtml_(email.attempts || 0)}
            </dd>
          </div>

          <div>
            <dt>Proveedor</dt>
            <dd>
              ${escapeHtml_(email.provider || "Brevo")}
            </dd>
          </div>
        </dl>

        ${
          email.error_message
            ? `
              <div class="expTimelinePlaceholder">
                <strong>Error:</strong>
                ${escapeHtml_(email.error_message)}
              </div>
            `
            : ""
        }
      </section>

      <section class="expDrawerSection">
        <div class="expDrawerSection__head">
          <span>Productos comprados</span>
        </div>

        ${productMarkup}
      </section>

      <section class="expDrawerSection">
        <div class="expDrawerSection__head">
          <span>Valoración general</span>
        </div>

        <div class="expRatingPlaceholder">
          ${escapeHtml_(ratingStars_(generalRating))}
        </div>

        <dl class="expDefinitionGrid expDefinitionGrid--ratings">
          <div>
            <dt>General</dt>
            <dd>${escapeHtml_(
              formatRating_(response.general_rating)
            )}</dd>
          </div>

          <div>
            <dt>Entrega</dt>
            <dd>${escapeHtml_(
              formatRating_(response.delivery_rating)
            )}</dd>
          </div>

          <div>
            <dt>Soporte</dt>
            <dd>${escapeHtml_(
              formatRating_(response.support_rating)
            )}</dd>
          </div>

          <div>
            <dt>Empaque</dt>
            <dd>${escapeHtml_(
              formatRating_(response.packaging_rating)
            )}</dd>
          </div>

          <div>
            <dt>Incidencia</dt>
            <dd>
              ${escapeHtml_(
                response.issue_category || "Ninguna"
              )}
            </dd>
          </div>

          <div>
            <dt>Solicita contacto</dt>
            <dd>
              ${
                response.contact_requested
                  ? "Sí"
                  : "No"
              }
            </dd>
          </div>
        </dl>

        ${
          response.issue_detail
            ? `
              <div class="expTimelinePlaceholder">
                ${escapeHtml_(response.issue_detail)}
              </div>
            `
            : ""
        }
      </section>

      <section class="expDrawerSection">
        <div class="expDrawerSection__head">
          <span>Historial de eventos</span>
        </div>

        ${eventsMarkup}
      </section>
    `;
  }


  function sendNowMessage_(payload) {
    const code = String(payload?.code || "");

    const messages = {
      missing_or_invalid_recipient_email:
        "No se puede preparar el envío: el correo del cliente está vacío o no es válido.",

      experience_already_submitted:
        "Esta experiencia ya fue respondida.",

      experience_session_expired:
        "Esta experiencia ya venció y no puede enviarse.",

      experience_session_unavailable:
        "Esta experiencia no está disponible para envío.",

      email_already_processing:
        "El correo ya está siendo procesado.",

      experience_session_not_found:
        "No se encontró la experiencia seleccionada.",

      authentication_required:
        "La sesión de Protocol Data no está autenticada.",

      invalid_user_session:
        "La sesión actual de Protocol Data no es válida.",

      real_email_send_disabled:
        "Los envíos reales están desactivados. No se preparó ni se envió ningún correo.",

      admin_function_not_configured:
        "La función administrativa de Experiencias no está configurada.",

      experience_session_lookup_failed:
        "No se pudo consultar la experiencia seleccionada.",

      email_event_not_claimed:
        "El evento de correo no pudo ser tomado para procesamiento.",

      invalid_session_id:
        "La experiencia seleccionada no tiene un identificador válido."
    };

    return messages[code] ||
      "No se pudo preparar el correo de opinión.";
  }

  function showSendFeedback_(root, message, success) {
    const body = root.querySelector(
      ".expDrawer__body"
    );

    if (!body) return;

    let notice = body.querySelector(
      "[data-exp-send-feedback]"
    );

    if (!notice) {
      notice = document.createElement("div");
      notice.className = "expTimelinePlaceholder";
      notice.setAttribute(
        "data-exp-send-feedback",
        "1"
      );

      body.prepend(notice);
    }

    notice.innerHTML = `
      <strong>
        ${escapeHtml_(success ? "Acción preparada" : "No se realizó el envío")}
      </strong>
      <br />
      <span>${escapeHtml_(message)}</span>
    `;
  }

  function configureSendNowButton_(
    root,
    session,
    email
  ) {
    const button = root.querySelector(
      ".expDrawer__footer .expBtn--primary"
    );

    state.detailSessionId =
      session?.id || null;

    if (!button) return;

    button.setAttribute(
      "data-exp-send-now",
      "1"
    );

    button.textContent = "Enviar ahora";
    button.disabled = !state.detailSessionId;

    if (
      session?.submitted_at ||
      session?.status === "submitted"
    ) {
      button.textContent = "Opinión recibida";
      button.disabled = true;
      return;
    }

    if (
      session?.status === "expired" ||
      session?.status === "cancelled" ||
      session?.status === "revoked" ||
      session?.status === "error"
    ) {
      button.textContent = "No disponible";
      button.disabled = true;
      return;
    }

    if (email?.status === "sent") {
      button.textContent = "Correo enviado";
      button.disabled = true;
      return;
    }

    if (email?.status === "processing") {
      button.textContent = "Procesando";
      button.disabled = true;
      return;
    }

    if (
      email?.status === "pending" &&
      email?.scheduled_for
    ) {
      const scheduledTime =
        new Date(email.scheduled_for).getTime();

      if (
        Number.isFinite(scheduledTime) &&
        scheduledTime <= Date.now() + 60000
      ) {
        button.textContent =
          "Pendiente de envío";

        button.disabled = true;
      }
    }
  }

  async function sendNow_() {
    const root = getRoot_();
    const sessionId = state.detailSessionId;

    if (
      !root ||
      !sessionId ||
      state.sendNowBusy
    ) {
      return;
    }

    const confirmed = window.confirm(
      "¿Enviar ahora el correo de opinión?\n\n" +
      "Protocol Data solicitará el procesamiento inmediato de esta invitación. " +
      "Si los envíos reales están desactivados, no se enviará ningún correo."
    );

    if (!confirmed) return;

    const button = root.querySelector(
      "[data-exp-send-now]"
    );

    state.sendNowBusy = true;

    if (button) {
      button.disabled = true;
      button.textContent = "Procesando…";
    }

    try {
      const client = await getClient_();

      if (!client) return;

      const {
        data: sessionData,
        error: sessionError
      } = await client.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const session = sessionData?.session;

      if (!session) {
        throw new Error(
          "authentication_required"
        );
      }

      const config =
        window.SAZZU_SUPABASE_CONFIG ||
        window.PROTOCOL_SUPABASE_CONFIG ||
        {};

      const supabaseUrl =
        String(config.url || "")
          .trim()
          .replace(/\/+$/g, "");

      const publicKey =
        config.publishableKey ||
        config.anonKey ||
        config.key ||
        "";

      if (!supabaseUrl || !publicKey) {
        throw new Error(
          "Supabase no está configurado."
        );
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/postpurchase-experience-admin`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            apikey: publicKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "send_now",
            session_id: sessionId
          })
        }
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        payload.ok !== true
      ) {
        const worker =
          payload.worker &&
          typeof payload.worker === "object"
            ? payload.worker
            : {};

        const prepared =
          worker.prepared &&
          typeof worker.prepared === "object"
            ? worker.prepared
            : {};

        const code =
          prepared.code ||
          worker.code ||
          payload.code ||
          "experience_send_now_failed";

        showSendFeedback_(
          root,
          sendNowMessage_({ code }),
          false
        );

        if (button) {
          button.disabled = false;
          button.textContent = "Enviar ahora";
        }

        return;
      }

      const worker =
        payload.worker &&
        typeof payload.worker === "object"
          ? payload.worker
          : {};

      const message =
        worker.already_sent === true
          ? "El correo ya había sido enviado anteriormente."
          : "El correo de opinión fue procesado correctamente.";

      await loadDashboard_();
      await loadDetail_(sessionId);

      showSendFeedback_(
        root,
        message,
        true
      );
    } catch (error) {
      console.error(
        "[Experiencias] Error al solicitar envío:",
        error
      );

      const code =
        error instanceof Error
          ? error.message
          : "";

      showSendFeedback_(
        root,
        sendNowMessage_({ code }),
        false
      );

      if (button) {
        button.disabled = false;
        button.textContent = "Enviar ahora";
      }
    } finally {
      state.sendNowBusy = false;
    }
  }

  function renderDetailError_(root, error) {
    const drawer = root.querySelector(
      "[data-exp-drawer]"
    );

    if (!drawer) return;

    console.error(
      "[Experiencias] Error al cargar detalle:",
      error
    );

    const body = drawer.querySelector(
      ".expDrawer__body"
    );

    if (body) {
      body.innerHTML = `
        <section class="expDrawerSection">
          <div class="expTimelinePlaceholder">
            No se pudo cargar el detalle de esta experiencia.
          </div>
        </section>
      `;
    }
  }

  async function loadDetail_(sessionId) {
    const root = getRoot_();

    if (!root || !sessionId) return;

    setDrawerLoading_(root);

    try {
      const client = await getClient_();

      if (!client) return;

      const response = await client.rpc(
        "rpc_experience_detail",
        {
          input_session_id: sessionId
        }
      );

      if (response.error) {
        throw response.error;
      }

      const payload = response.data || {};

      if (!payload.ok) {
        throw new Error(
          payload.code ||
          "experience_detail_unavailable"
        );
      }

      renderDetail_(root, payload);
    } catch (error) {
      renderDetailError_(root, error);
    }
  }

  function renderError_(root, error) {
    const tbody = root.querySelector(
      "[data-exp-table-body]"
    );

    if (!tbody) return;

    console.error(
      "[Experiencias] Error de lectura:",
      error
    );

    tbody.innerHTML = `
      <tr class="expEmptyRow">
        <td colspan="8">
          <div class="expEmptyState">
            <div
              class="expEmptyState__icon"
              aria-hidden="true"
            >
              !
            </div>

            <h3>No se pudieron cargar las experiencias</h3>

            <p>
              Revisá la sesión de Protocol Data y la conexión con Supabase.
            </p>
          </div>
        </td>
      </tr>
    `;
  }

  function setLoading_(root, loading) {
    const table = root.querySelector(".expTable");

    if (table) {
      table.setAttribute(
        "aria-busy",
        String(Boolean(loading))
      );
    }

    if (
      loading &&
      root.dataset.expDataLoaded !== "1"
    ) {
      root
        .querySelectorAll("[data-exp-kpi]")
        .forEach((element) => {
          element.textContent = "…";
        });
    }
  }

  async function getClient_() {
    if (!window.ProtocolAuth) {
      throw new Error(
        "ProtocolAuth no está disponible."
      );
    }

    const session =
      await window.ProtocolAuth.getSession();

    if (!session) {
      window.location.href =
        window.ProtocolAuth.loginUrl(
          window.location.pathname +
            window.location.search
        );

      return null;
    }

    return window.ProtocolAuth.getClient();
  }

  function opinionIssueLabel_(value) {
    const labels = {
      product: "Producto",
      logistics: "Entrega",
      support: "Soporte",
      packaging: "Empaque",
      payment: "Pago",
      other: "Otra"
    };

    return labels[value] || "Incidencia";
  }

  function opinionHasIssue_(row) {
    const category = String(
      row?.issue_category || ""
    ).trim().toLowerCase();

    return Boolean(
      category &&
      category !== "none"
    );
  }

  function renderOpinionMetrics_(root, rows) {
    const safeRows = Array.isArray(rows)
      ? rows
      : [];

    const ratings = safeRows
      .map((row) => Number(row.general_rating))
      .filter((rating) => (
        Number.isFinite(rating) &&
        rating > 0
      ));

    const average = ratings.length
      ? ratings.reduce(
          (total, rating) => total + rating,
          0
        ) / ratings.length
      : 0;

    const values = {
      received: safeRows.length,

      rating: average
        ? average.toLocaleString("es-AR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })
        : "—",

      contact: safeRows.filter(
        (row) => row.contact_requested === true
      ).length,

      issues: safeRows.filter(
        opinionHasIssue_
      ).length
    };

    Object.entries(values).forEach(
      ([key, value]) => {
        const element = root.querySelector(
          `[data-exp-opinion-kpi="${key}"]`
        );

        if (element) {
          element.textContent = String(value);
        }
      }
    );
  }

  function opinionSignalsMarkup_(row) {
    const signals = [];

    if (row.contact_requested === true) {
      signals.push(`
        <span
          class="expOpinionSignal expOpinionSignal--contact"
        >
          Solicita contacto
        </span>
      `);
    }

    if (opinionHasIssue_(row)) {
      signals.push(`
        <span
          class="expOpinionSignal expOpinionSignal--issue"
        >
          ${escapeHtml_(
            opinionIssueLabel_(
              String(row.issue_category).trim().toLowerCase()
            )
          )}
        </span>
      `);
    }

    if (!signals.length) {
      signals.push(`
        <span
          class="expOpinionSignal expOpinionSignal--clear"
        >
          Sin alertas
        </span>
      `);
    }

    return signals.join("");
  }

  function renderOpinionRows_(root, payload) {
    const tbody = root.querySelector(
      "[data-exp-opinions-body]"
    );

    if (!tbody) return;

    const rows = Array.isArray(payload.rows)
      ? payload.rows
      : [];

    renderOpinionMetrics_(root, rows);

    if (!rows.length) {
      const query = String(
        state.opinionSearch || ""
      ).trim();

      tbody.innerHTML = `
        <tr class="expEmptyRow">
          <td colspan="7">
            <div class="expEmptyState">
              <div
                class="expEmptyState__icon"
                aria-hidden="true"
              >
                ★
              </div>

              <h3>
                ${
                  query
                    ? `Sin resultados para “${escapeHtml_(query)}”`
                    : "Todavía no hay opiniones recibidas"
                }
              </h3>

              <p>
                ${
                  query
                    ? "La búsqueda no encontró opiniones coincidentes."
                    : "Las respuestas completadas aparecerán en esta sección."
                }
              </p>
            </div>
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = rows.map((row) => {
      const order =
        row.shopify_order_name ||
        row.shopify_order_id ||
        "—";

      const customer =
        row.customer_first_name ||
        "Cliente";

      const email =
        row.customer_email ||
        "Sin correo";

      const submittedAt =
        row.response_submitted_at ||
        row.submitted_at;

      const rating =
        Number(row.general_rating || 0);

      const products =
        Number(row.items_count || 0);

      return `
        <tr>
          <td>
            <strong>
              ${escapeHtml_(order)}
            </strong>
          </td>

          <td>
            <div class="expOpinionCustomer">
              <strong>
                ${escapeHtml_(customer)}
              </strong>

              <span>
                ${escapeHtml_(email)}
              </span>
            </div>
          </td>

          <td>
            <span class="expOpinionDate">
              ${escapeHtml_(
                formatDate_(submittedAt)
              )}
            </span>
          </td>

          <td>
            <div class="expOpinionRating">
              <span
                class="expOpinionRating__stars"
                aria-hidden="true"
              >
                ${escapeHtml_(
                  ratingStars_(rating)
                )}
              </span>

              <span class="expOpinionRating__value">
                ${escapeHtml_(
                  formatRating_(rating)
                )}
              </span>
            </div>
          </td>

          <td>
            <span class="expOpinionProducts">
              ${escapeHtml_(products)}
              ${
                products === 1
                  ? "producto"
                  : "productos"
              }
            </span>
          </td>

          <td>
            <div class="expOpinionSignals">
              ${opinionSignalsMarkup_(row)}
            </div>
          </td>

          <td class="expTable__actionsCol">
            <button
              class="expBtn expBtn--ghost"
              type="button"
              data-exp-open-detail="${escapeHtml_(
                row.session_id || ""
              )}"
              data-exp-open-drawer
            >
              Ver opinión
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function setOpinionsLoading_(root, loading) {
    const tbody = root.querySelector(
      "[data-exp-opinions-body]"
    );

    const table = root.querySelector(
      ".expOpinionTable"
    );

    if (table) {
      table.setAttribute(
        "aria-busy",
        String(Boolean(loading))
      );
    }

    if (
      !tbody ||
      !loading ||
      root.dataset.expOpinionsLoaded === "1"
    ) {
      return;
    }

    tbody.innerHTML = `
      <tr class="expEmptyRow">
        <td colspan="7">
          <div class="expEmptyState">
            <div
              class="expEmptyState__icon"
              aria-hidden="true"
            >
              ★
            </div>

            <h3>Cargando opiniones</h3>

            <p>
              Consultando las respuestas reales en Supabase.
            </p>
          </div>
        </td>
      </tr>
    `;

    root
      .querySelectorAll("[data-exp-opinion-kpi]")
      .forEach((element) => {
        element.textContent = "…";
      });
  }

  function renderOpinionsError_(root, error) {
    const tbody = root.querySelector(
      "[data-exp-opinions-body]"
    );

    console.error(
      "[Experiencias] Error en Opiniones:",
      error
    );

    if (!tbody) return;

    tbody.innerHTML = `
      <tr class="expEmptyRow">
        <td colspan="7">
          <div class="expEmptyState">
            <div
              class="expEmptyState__icon"
              aria-hidden="true"
            >
              !
            </div>

            <h3>
              No se pudieron cargar las opiniones
            </h3>

            <p>
              ${escapeHtml_(
                error?.message ||
                "Error de lectura."
              )}
            </p>
          </div>
        </td>
      </tr>
    `;
  }

  async function loadOpinions_() {
    const root = getRoot_();

    if (!root) return;

    const currentRequest =
      ++state.opinionRequestId;

    setOpinionsLoading_(root, true);

    try {
      const client = await getClient_();

      if (!client) return;

      const response = await client.rpc(
        "rpc_experience_dashboard",
        {
          input_search:
            state.opinionSearch || null,

          input_status:
            "submitted",

          input_limit:
            100,

          input_offset:
            0
        }
      );

      if (response.error) {
        throw response.error;
      }

      if (
        currentRequest !==
        state.opinionRequestId
      ) {
        return;
      }

      const payload =
        response.data || {};

      if (payload.ok === false) {
        throw new Error(
          payload.code ||
          "No se pudieron consultar las opiniones."
        );
      }

      renderOpinionRows_(root, payload);

      root.dataset.expOpinionsLoaded = "1";
    } catch (error) {
      if (
        currentRequest !==
        state.opinionRequestId
      ) {
        return;
      }

      renderOpinionsError_(root, error);
    } finally {
      if (
        currentRequest ===
        state.opinionRequestId
      ) {
        setOpinionsLoading_(root, false);
      }
    }
  }

  async function loadDashboard_() {
    const root = getRoot_();

    if (!root) return;

    const currentRequest = ++state.requestId;

    setLoading_(root, true);

    try {
      const client = await getClient_();

      if (!client) return;

      const response = await client.rpc(
        "rpc_experience_dashboard",
        {
          input_search:
            state.search || null,
          input_status:
            state.status || "all",
          input_limit: 100,
          input_offset: 0
        }
      );

      if (response.error) {
        throw response.error;
      }

      if (currentRequest !== state.requestId) {
        return;
      }

      const payload = response.data || {};

      renderMetrics_(
        root,
        payload.metrics || {}
      );

      renderRows_(root, payload);

      root.dataset.expDataLoaded = "1";
    } catch (error) {
      if (currentRequest !== state.requestId) {
        return;
      }

      renderError_(root, error);
    } finally {
      if (currentRequest === state.requestId) {
        setLoading_(root, false);
      }
    }
  }

  function bind_(root) {
    if (!root) return;

    if (root.dataset.expDataInitialized === "1") {
      loadDashboard_();
      loadOpinions_();
      return;
    }

    root.dataset.expDataInitialized = "1";

    loadOpinions_();

    const activeFilter = root.querySelector(
      "[data-exp-filter].is-active"
    );

    state.status =
      activeFilter?.getAttribute(
        "data-exp-filter"
      ) || "all";

    root.addEventListener("click", (event) => {
      const sendNowButton = event.target.closest(
        "[data-exp-send-now]"
      );

      if (sendNowButton) {
        sendNow_();
        return;
      }

      const detailButton = event.target.closest(
        "[data-exp-open-detail]"
      );

      if (detailButton) {
        loadDetail_(
          detailButton.getAttribute(
            "data-exp-open-detail"
          )
        );
        return;
      }

      const filter = event.target.closest(
        "[data-exp-filter]"
      );

      if (!filter) return;

      state.status =
        filter.getAttribute("data-exp-filter") ||
        "all";

      loadDashboard_();
    });

    const opinionSearch = root.querySelector(
      "[data-exp-opinion-search]"
    );

    if (opinionSearch) {
      state.opinionSearch = String(
        opinionSearch.value || ""
      );

      opinionSearch.addEventListener(
        "input",
        () => {
          window.clearTimeout(
            state.opinionSearchTimer
          );

          state.opinionSearchTimer =
            window.setTimeout(
              () => {
                state.opinionSearch =
                  String(
                    opinionSearch.value || ""
                  ).trim();

                loadOpinions_();
              },
              280
            );
        }
      );
    }

    const search = root.querySelector(
      "[data-exp-search]"
    );

    if (search) {
      state.search = String(search.value || "");

      search.addEventListener("input", () => {
        state.search =
          String(search.value || "").trim();

        window.clearTimeout(
          state.searchTimer
        );

        state.searchTimer =
          window.setTimeout(
            loadDashboard_,
            320
          );
      });
    }

    loadDashboard_();
  }

  window.ProtocolExperienciasReload =
    loadDashboard_;

  document.addEventListener(
    "DOMContentLoaded",
    () => bind_(getRoot_())
  );

  document.addEventListener(
    PAGE_EVENT,
    () => bind_(getRoot_())
  );
})();
