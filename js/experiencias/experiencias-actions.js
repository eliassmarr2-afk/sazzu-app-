/* ============================================================
   Protocol Data · Experiencias
   Cancelación y reprogramación de invitaciones.
   ============================================================ */

(function () {
  "use strict";

  const PAGE_EVENT = "sazzu:page:load";

  const state = {
    sessionId: "",
    detail: null,
    busy: false,
    requestId: 0
  };

  function getRoot_() {
    return document.getElementById(
      "experienciasPage"
    );
  }

  function clean_(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml_(value) {
    return clean_(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function findFooterButtons_() {
    const root = getRoot_();

    if (!root) {
      return {};
    }

    const footer = root.querySelector(
      ".expDrawer__footer"
    );

    if (!footer) {
      return {};
    }

    let cancel = footer.querySelector(
      "[data-exp-cancel-invitation]"
    );

    let reschedule = footer.querySelector(
      "[data-exp-reschedule-invitation]"
    );

    footer
      .querySelectorAll("button")
      .forEach((button) => {
        const label = clean_(
          button.textContent
        ).toLowerCase();

        if (
          label === "cancelar invitación"
        ) {
          cancel = button;

          button.setAttribute(
            "data-exp-cancel-invitation",
            ""
          );
        }

        if (label === "reprogramar") {
          reschedule = button;

          button.setAttribute(
            "data-exp-reschedule-invitation",
            ""
          );
        }
      });

    return {
      footer,
      cancel,
      reschedule
    };
  }

  async function getContext_() {
    if (!window.ProtocolAuth) {
      throw new Error(
        "ProtocolAuth no está disponible."
      );
    }

    const session =
      await window.ProtocolAuth.getSession();

    if (!session) {
      throw new Error(
        "authentication_required"
      );
    }

    const client =
      window.ProtocolAuth.getClient();

    if (!client) {
      throw new Error(
        "Supabase no está disponible."
      );
    }

    return {
      session,
      client
    };
  }

  function terminalStatus_(status) {
    return [
      "submitted",
      "cancelled",
      "expired",
      "revoked"
    ].includes(
      clean_(status).toLowerCase()
    );
  }

  function updateButtons_() {
    const {
      cancel,
      reschedule
    } = findFooterButtons_();

    if (!cancel && !reschedule) {
      return;
    }

    const detail = state.detail || {};
    const session = detail.session || {};
    const email = detail.email || {};

    const sessionStatus =
      clean_(session.status).toLowerCase();

    const emailStatus =
      clean_(email.status).toLowerCase();

    const closed = Boolean(
      session.submitted_at ||
      terminalStatus_(sessionStatus)
    );

    if (cancel) {
      cancel.hidden = closed;

      cancel.style.display =
        closed ? "none" : "";

      cancel.disabled = Boolean(
        state.busy ||
        !state.sessionId ||
        emailStatus === "processing"
      );
    }

    if (reschedule) {
      const sent = Boolean(
        session.email_sent_at ||
        email.sent_at
      );

      const unavailableEmail = [
        "processing",
        "sent",
        "cancelled",
        "skipped"
      ].includes(emailStatus);

      reschedule.hidden = closed;

      reschedule.style.display =
        closed ? "none" : "";

      reschedule.disabled = Boolean(
        state.busy ||
        !state.sessionId ||
        sent ||
        unavailableEmail
      );
    }
  }

  async function loadDetail_(sessionId) {
    sessionId = clean_(sessionId);

    if (!sessionId) {
      return;
    }

    const requestId =
      ++state.requestId;

    const {
      client
    } = await getContext_();

    const {
      data,
      error
    } = await client.rpc(
      "rpc_experience_detail",
      {
        input_session_id: sessionId
      }
    );

    if (error) {
      throw error;
    }

    if (requestId !== state.requestId) {
      return;
    }

    const payload =
      data &&
      typeof data === "object"
        ? data
        : {};

    if (payload.ok === false) {
      throw new Error(
        payload.code ||
        "experience_detail_failed"
      );
    }

    state.sessionId = sessionId;
    state.detail = payload;

    updateButtons_();
  }

  function localInputValue_(value) {
    const date = new Date(
      value ||
      Date.now() + 86400000
    );

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    const localDate = new Date(
      date.getTime() -
      date.getTimezoneOffset() *
        60000
    );

    return localDate
      .toISOString()
      .slice(0, 16);
  }

  function errorMessage_(code) {
    const messages = {
      authentication_required:
        "La sesión del panel venció. Volvé a iniciar sesión.",

      invalid_user_session:
        "La sesión del panel ya no es válida.",

      invalid_session_id:
        "No se encontró la experiencia seleccionada.",

      experience_session_not_found:
        "No se encontró la experiencia seleccionada.",

      experience_already_submitted:
        "La opinión ya fue respondida y no puede modificarse.",

      experience_already_cancelled:
        "La invitación ya estaba cancelada.",

      experience_session_unavailable:
        "La experiencia ya no está disponible para operar.",

      email_already_processing:
        "El correo está siendo procesado. Probá nuevamente en unos instantes.",

      experience_email_already_sent:
        "El correo ya fue enviado y no puede reprogramarse.",

      email_event_not_reschedulable:
        "El evento de correo ya no admite reprogramación.",

      scheduled_for_must_be_future:
        "La nueva fecha debe estar en el futuro.",

      invalid_scheduled_for:
        "Ingresá una fecha y hora válidas.",

      experience_cancel_failed:
        "No se pudo cancelar la invitación.",

      experience_reschedule_failed:
        "No se pudo reprogramar la invitación."
    };

    return (
      messages[code] ||
      "No se pudo completar la operación."
    );
  }

  function getModal_() {
    let overlay = document.querySelector(
      "[data-exp-action-modal]"
    );

    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");

    overlay.className =
      "expActionModal";

    overlay.setAttribute(
      "data-exp-action-modal",
      ""
    );

    overlay.hidden = true;

    overlay.innerHTML = `
      <div
        class="expActionModal__backdrop"
        data-exp-action-close
      ></div>

      <section
        class="expActionModal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expActionModalTitle"
      >
        <header class="expActionModal__header">
          <div>
            <div class="expActionModal__eyebrow">
              Experiencias · Postcompra
            </div>

            <h3
              id="expActionModalTitle"
              class="expActionModal__title"
              data-exp-action-title
            >
              Confirmar operación
            </h3>

            <p
              class="expActionModal__subtitle"
              data-exp-action-subtitle
            ></p>
          </div>

          <button
            class="expActionModal__close"
            type="button"
            data-exp-action-close
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div
          class="expActionModal__body"
          data-exp-action-body
        ></div>

        <div
          class="expActionModal__feedback"
          data-exp-action-feedback
          hidden
        ></div>

        <footer class="expActionModal__footer">
          <button
            class="expBtn expBtn--ghost"
            type="button"
            data-exp-action-close
          >
            Volver
          </button>

          <button
            class="expBtn expBtn--primary"
            type="button"
            data-exp-action-confirm
          >
            Confirmar
          </button>
        </footer>
      </section>
    `;

    document.body.appendChild(
      overlay
    );

    return overlay;
  }

  function setFeedback_(
    overlay,
    message,
    success
  ) {
    const feedback =
      overlay.querySelector(
        "[data-exp-action-feedback]"
      );

    if (!feedback) {
      return;
    }

    feedback.hidden = !message;
    feedback.textContent = message || "";

    feedback.classList.toggle(
      "is-success",
      Boolean(success)
    );

    feedback.classList.toggle(
      "is-error",
      Boolean(message) &&
      !success
    );
  }

  function setBusy_(
    overlay,
    busy
  ) {
    state.busy = Boolean(busy);

    const confirm =
      overlay.querySelector(
        "[data-exp-action-confirm]"
      );

    const closers =
      overlay.querySelectorAll(
        "[data-exp-action-close]"
      );

    if (confirm) {
      confirm.disabled = state.busy;

      if (state.busy) {
        confirm.dataset.originalText =
          confirm.textContent || "";

        confirm.textContent =
          "Procesando…";
      } else {
        const original =
          confirm.dataset.originalText;

        if (original) {
          confirm.textContent =
            original;

          delete confirm.dataset
            .originalText;
        }
      }
    }

    closers.forEach((button) => {
      button.disabled = state.busy;
    });

    updateButtons_();
  }

  function closeModal_() {
    const overlay = getModal_();

    if (state.busy) {
      return;
    }

    overlay.hidden = true;

    document.body.classList.remove(
      "expActionModalOpen"
    );
  }

  async function openModal_(mode) {
    if (
      state.busy ||
      !state.sessionId
    ) {
      return;
    }

    if (!state.detail) {
      await loadDetail_(
        state.sessionId
      );
    }

    const overlay = getModal_();

    const title =
      overlay.querySelector(
        "[data-exp-action-title]"
      );

    const subtitle =
      overlay.querySelector(
        "[data-exp-action-subtitle]"
      );

    const body =
      overlay.querySelector(
        "[data-exp-action-body]"
      );

    const confirm =
      overlay.querySelector(
        "[data-exp-action-confirm]"
      );

    const detail = state.detail || {};
    const session = detail.session || {};

    const order =
      session.shopify_order_name ||
      "Experiencia seleccionada";

    overlay.dataset.actionMode = mode;

    setFeedback_(
      overlay,
      "",
      false
    );

    if (mode === "reschedule") {
      const minimum =
        localInputValue_(
          Date.now() + 5 * 60000
        );

      const current =
        localInputValue_(
          session.scheduled_for
        );

      title.textContent =
        "Reprogramar invitación";

      subtitle.textContent =
        `${order} · Elegí la nueva fecha y hora de envío.`;

      body.innerHTML = `
        <label class="expActionModal__field">
          <span>Nueva fecha y hora</span>

          <input
            type="datetime-local"
            data-exp-reschedule-date
            min="${escapeHtml_(minimum)}"
            value="${escapeHtml_(current)}"
          />

          <small>
            La hora se interpreta según la zona horaria
            configurada en este dispositivo.
          </small>
        </label>

        <div class="expActionModal__notice">
          Reprogramar no envía el correo ahora.
          Solo actualiza su próxima fecha de ejecución.
        </div>
      `;

      confirm.textContent =
        "Guardar reprogramación";

      confirm.classList.remove(
        "expBtn--danger"
      );
    } else {
      title.textContent =
        "Cancelar invitación";

      subtitle.textContent =
        `${order} · El correo pendiente dejará de enviarse.`;

      body.innerHTML = `
        <div class="expActionModal__warning">
          <strong>
            Esta acción cancela la invitación.
          </strong>

          <p>
            El evento pendiente quedará cancelado y el
            acceso todavía no utilizado será invalidado.
          </p>
        </div>

        <label class="expActionModal__field">
          <span>
            Motivo
            <small>Opcional</small>
          </span>

          <textarea
            rows="4"
            maxlength="500"
            data-exp-cancel-reason
            placeholder="Ej: El cliente pidió no recibir la encuesta."
          ></textarea>
        </label>
      `;

      confirm.textContent =
        "Cancelar invitación";

      confirm.classList.add(
        "expBtn--danger"
      );
    }

    overlay.hidden = false;

    document.body.classList.add(
      "expActionModalOpen"
    );

    window.setTimeout(() => {
      overlay
        .querySelector(
          "input, textarea"
        )
        ?.focus();
    }, 30);
  }

  async function callAdmin_(
    action,
    input
  ) {
    const {
      session
    } = await getContext_();

    const config =
      window.SAZZU_SUPABASE_CONFIG ||
      window.PROTOCOL_SUPABASE_CONFIG ||
      {};

    const supabaseUrl =
      clean_(config.url)
        .replace(/\/+$/g, "");

    const publicKey =
      config.publishableKey ||
      config.anonKey ||
      config.key ||
      "";

    if (
      !supabaseUrl ||
      !publicKey
    ) {
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

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          action,
          ...input
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
      throw new Error(
        payload.code ||
        payload.status ||
        "experience_operation_failed"
      );
    }

    return payload;
  }

  async function confirmAction_() {
    if (
      state.busy ||
      !state.sessionId
    ) {
      return;
    }

    const overlay = getModal_();

    const mode =
      overlay.dataset.actionMode;

    const input = {
      session_id: state.sessionId
    };

    if (mode === "reschedule") {
      const rawDate = clean_(
        overlay.querySelector(
          "[data-exp-reschedule-date]"
        )?.value
      );

      const date =
        new Date(rawDate);

      if (
        !rawDate ||
        Number.isNaN(date.getTime())
      ) {
        setFeedback_(
          overlay,
          "Ingresá una fecha y hora válidas.",
          false
        );

        return;
      }

      if (
        date.getTime() <= Date.now()
      ) {
        setFeedback_(
          overlay,
          "La nueva fecha debe estar en el futuro.",
          false
        );

        return;
      }

      input.scheduled_for =
        date.toISOString();
    } else if (mode === "cancel") {
      input.reason = clean_(
        overlay.querySelector(
          "[data-exp-cancel-reason]"
        )?.value
      );
    } else {
      return;
    }

    setFeedback_(
      overlay,
      "",
      false
    );

    setBusy_(
      overlay,
      true
    );

    try {
      await callAdmin_(
        mode === "reschedule"
          ? "reschedule"
          : "cancel",

        input
      );

      setFeedback_(
        overlay,

        mode === "reschedule"
          ? "La invitación fue reprogramada correctamente."
          : "La invitación fue cancelada correctamente.",

        true
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      console.error(
        "[Experiencias] Error en acción:",
        error
      );

      setFeedback_(
        overlay,

        errorMessage_(
          error instanceof Error
            ? error.message
            : ""
        ),

        false
      );

      setBusy_(
        overlay,
        false
      );
    }
  }

  function handleClick_(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const detailButton =
      target.closest(
        "[data-exp-open-detail]"
      );

    if (detailButton) {
      const sessionId = clean_(
        detailButton.getAttribute(
          "data-exp-open-detail"
        )
      );

      if (sessionId) {
        state.sessionId = sessionId;
        state.detail = null;

        window.setTimeout(() => {
          loadDetail_(sessionId)
            .catch((error) => {
              console.error(
                "[Experiencias] No se pudo preparar las acciones:",
                error
              );
            });
        }, 0);
      }

      return;
    }

    const reschedule =
      target.closest(
        "[data-exp-reschedule-invitation]"
      );

    if (reschedule) {
      event.preventDefault();
      event.stopPropagation();

      openModal_("reschedule")
        .catch((error) => {
          console.error(
            "[Experiencias] Modal reprogramar:",
            error
          );
        });

      return;
    }

    const cancel =
      target.closest(
        "[data-exp-cancel-invitation]"
      );

    if (cancel) {
      event.preventDefault();
      event.stopPropagation();

      openModal_("cancel")
        .catch((error) => {
          console.error(
            "[Experiencias] Modal cancelar:",
            error
          );
        });

      return;
    }

    if (
      target.closest(
        "[data-exp-action-close]"
      )
    ) {
      event.preventDefault();
      closeModal_();
      return;
    }

    if (
      target.closest(
        "[data-exp-action-confirm]"
      )
    ) {
      event.preventDefault();
      confirmAction_();
    }
  }

  function init_() {
    const root = getRoot_();

    if (!root) {
      return;
    }

    findFooterButtons_();
    updateButtons_();

    if (
      document.documentElement
        .dataset
        .expActionsBound !== "1"
    ) {
      document.documentElement
        .dataset
        .expActionsBound = "1";

      document.addEventListener(
        "click",
        handleClick_,
        true
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Escape" &&
            !state.busy
          ) {
            closeModal_();
          }
        }
      );
    }

    if (
      root.dataset
        .expActionsObserved !== "1"
    ) {
      root.dataset
        .expActionsObserved = "1";

      const observer =
        new MutationObserver(() => {
          findFooterButtons_();
          updateButtons_();
        });

      observer.observe(
        root,
        {
          childList: true,
          subtree: true
        }
      );
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    init_
  );

  document.addEventListener(
    PAGE_EVENT,
    init_
  );

  init_();
})();
