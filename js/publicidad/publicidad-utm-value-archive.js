(function () {
  "use strict";

  if (window.__PUB_UTM_VALUE_ARCHIVE_BOOTED__) return;
  window.__PUB_UTM_VALUE_ARCHIVE_BOOTED__ = true;

  const BUILD =
    "PUB_UTM_VALUE_ARCHIVE_V1_20260730";

  const STATE = {
    pendingField: "",
    pendingValue: "",
    pendingPayload: null,
    confirmStage: "idle"
  };

  function clean_(value) {
    return String(
      value == null ? "" : value
    ).trim();
  }

  function esc_(value) {
    return clean_(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number_(value) {
    const result = Number(value || 0);

    return Number.isFinite(result)
      ? result
      : 0;
  }

  function format_(value) {
    return new Intl.NumberFormat(
      "es-AR"
    ).format(number_(value));
  }

  async function rpc_(name, params) {
    const cfg =
      window.SAZZU_SUPABASE_CONFIG || {};

    const rawUrl = clean_(cfg.url);

    const key = clean_(
      cfg.publishableKey ||
      cfg.anonKey ||
      cfg.key
    );

    if (!rawUrl) {
      throw new Error(
        "No existe window.SAZZU_SUPABASE_CONFIG.url."
      );
    }

    if (!key) {
      throw new Error(
        "No existe una clave pública de Supabase."
      );
    }

    let restBase =
      rawUrl.replace(/\/+$/, "");

    if (!/\/rest\/v1$/i.test(restBase)) {
      restBase += "/rest/v1";
    }

    const response = await fetch(
      restBase +
      "/rpc/" +
      encodeURIComponent(name),
      {
        method: "POST",

        headers: {
          "apikey": key,
          "Authorization":
            "Bearer " + key,
          "Content-Type":
            "application/json",
          "Accept":
            "application/json"
        },

        body: JSON.stringify(
          params || {}
        )
      }
    );

    const text =
      await response.text();

    let payload = null;

    try {
      payload = text
        ? JSON.parse(text)
        : null;
    } catch (error) {
      throw new Error(
        text ||
        "Supabase devolvió una respuesta inválida."
      );
    }

    if (!response.ok) {
      throw new Error(
        payload && payload.message
          ? payload.message
          : payload && payload.error
            ? payload.error
            : "Error HTTP al consultar Supabase."
      );
    }

    return payload;
  }

  function trashIcon_() {
    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
        fill="#EA3323"
        aria-hidden="true"
      >
        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/>
      </svg>
    `;
  }

  function ensureModal_() {
    let overlay =
      document.getElementById(
        "pubUtmValueArchiveOverlay"
      );

    if (overlay) return overlay;

    overlay =
      document.createElement("div");

    overlay.id =
      "pubUtmValueArchiveOverlay";

    /*
     * Reutilizamos exactamente el sistema visual
     * del archivado de campos.
     */
    overlay.className =
      "pubUtmFieldArchiveOverlay";

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    overlay.innerHTML = `
      <section
        class="pubUtmFieldArchiveDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pubUtmValueArchiveTitle"
      >
        <header
          class="pubUtmFieldArchiveDialog__top"
        >
          <span>Confirmación operativa</span>

          <button
            type="button"
            class="pubUtmFieldArchiveDialog__close"
            data-value-archive-close
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div
          class="pubUtmFieldArchiveDialog__body"
        >
          <div
            class="pubUtmFieldArchiveDialog__icon"
            aria-hidden="true"
          >
            ${trashIcon_()}
          </div>

          <div
            class="pubUtmFieldArchiveDialog__content"
          >
            <h3 id="pubUtmValueArchiveTitle">
              Revisando impacto
            </h3>

            <p data-value-archive-intro>
              Consultando las dependencias del valor.
            </p>

            <div
              class="pubUtmFieldArchiveDialog__details"
              data-value-archive-details
            ></div>
          </div>
        </div>

        <footer
          class="pubUtmFieldArchiveDialog__actions"
        >
          <button
            type="button"
            class="pubUtmFieldArchiveDialog__btn pubUtmFieldArchiveDialog__btn--secondary"
            data-value-archive-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="pubUtmFieldArchiveDialog__btn pubUtmFieldArchiveDialog__btn--danger"
            data-value-archive-confirm
            disabled
          >
            Eliminar valor
          </button>
        </footer>
      </section>
    `;

    document.body.appendChild(overlay);

    return overlay;
  }

  function openModal_() {
    const overlay = ensureModal_();

    overlay.classList.add("is-open");

    overlay.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeModal_() {
    const overlay =
      document.getElementById(
        "pubUtmValueArchiveOverlay"
      );

    if (!overlay) return;

    const mustReload =
      STATE.confirmStage === "success";

    overlay.classList.remove("is-open");

    overlay.setAttribute(
      "aria-hidden",
      "true"
    );

    STATE.pendingField = "";
    STATE.pendingValue = "";
    STATE.pendingPayload = null;
    STATE.confirmStage = "idle";

    if (mustReload) {
      window.location.reload();
    }
  }

  function getModalParts_() {
    const overlay = ensureModal_();

    return {
      overlay: overlay,

      title: overlay.querySelector(
        "#pubUtmValueArchiveTitle"
      ),

      intro: overlay.querySelector(
        "[data-value-archive-intro]"
      ),

      details: overlay.querySelector(
        "[data-value-archive-details]"
      ),

      confirm: overlay.querySelector(
        "[data-value-archive-confirm]"
      )
    };
  }

  function setModalLoading_(
    field,
    value
  ) {
    STATE.confirmStage = "loading";

    const parts = getModalParts_();

    if (parts.title) {
      parts.title.textContent =
        "Revisando impacto";
    }

    if (parts.intro) {
      parts.intro.textContent =
        "Validando audiencias, conjuntos, patrones, combinaciones y métricas históricas.";
    }

    if (parts.details) {
      parts.details.innerHTML = `
        <div
          class="pubUtmFieldArchiveLoading"
        >
          Revisando
          <strong>${esc_(value)}</strong>
          dentro de
          <code>${esc_(field)}</code>...
        </div>
      `;
    }

    if (parts.confirm) {
      parts.confirm.disabled = true;

      parts.confirm.textContent =
        "Eliminar valor";

      parts.confirm.classList.remove(
        "pubUtmFieldArchiveDialog__btn--secondary"
      );

      parts.confirm.classList.add(
        "pubUtmFieldArchiveDialog__btn--danger"
      );
    }

    openModal_();
  }

  function buildImpactHtml_(payload) {
    const value =
      payload.valor || {};

    const dependencies =
      payload.dependencias || {};

    const audiences =
      dependencies.audiencias || {};

    const sets =
      dependencies.conjuntos || {};

    const patterns =
      dependencies.patrones || {};

    const combinations =
      dependencies.combinaciones || {};

    const sales =
      dependencies.ventas || {};

    const analytics =
      dependencies.analytics || {};

    return `
      <div
        class="pubUtmFieldArchiveSummary"
      >
        <div
          class="pubUtmFieldArchiveSummary__field"
        >
          <span>Valor seleccionado</span>

          <strong>
            ${esc_(
              value.valor_permitido ||
              STATE.pendingValue
            )}
          </strong>

          <code>
            ${esc_(
              value.campo_utm ||
              STATE.pendingField
            )}
          </code>
        </div>

        <div
          class="pubUtmFieldArchiveSummary__grid"
        >
          <div>
            <span>Audiencias activas</span>
            <strong>
              ${format_(audiences.activas)}
            </strong>
          </div>

          <div>
            <span>Conjuntos activos</span>
            <strong>
              ${format_(sets.activos)}
            </strong>
          </div>

          <div>
            <span>Patrones activos</span>
            <strong>
              ${format_(patterns.activos)}
            </strong>
          </div>

          <div>
            <span>Combinaciones activas</span>
            <strong>
              ${format_(combinations.activas)}
            </strong>
          </div>

          <div>
            <span>Ventas históricas</span>
            <strong>
              ${format_(
                sales.ventas_historicas
              )}
            </strong>
          </div>

          <div>
            <span>Eventos históricos</span>
            <strong>
              ${format_(analytics.eventos)}
            </strong>
          </div>

          <div>
            <span>Visitas históricas</span>
            <strong>
              ${format_(
                analytics.visitas_consolidadas
              )}
            </strong>
          </div>

          <div>
            <span>Sesiones históricas</span>
            <strong>
              ${format_(
                analytics.sesiones_consolidadas
              )}
            </strong>
          </div>
        </div>

        <div
          class="pubUtmFieldArchiveSummary__notice"
        >
          <strong>
            La información existente se conservará.
          </strong>

          <p>
            Las audiencias, conjuntos, patrones,
            combinaciones, ventas y métricas históricas
            no serán eliminados.
          </p>

          <p>
            Las referencias existentes quedarán marcadas
            como pertenecientes a un valor archivado.
          </p>

          <p>
            El valor dejará de participar en nuevas
            audiencias automáticas, patrones,
            combinaciones y configuraciones.
          </p>
        </div>
      </div>
    `;
  }

  function setModalImpact_(payload) {
    STATE.confirmStage = "impact";

    const parts = getModalParts_();

    if (parts.title) {
      parts.title.textContent =
        "Confirmar eliminación";
    }

    if (parts.intro) {
      parts.intro.textContent =
        "El valor será archivado y dejará de estar disponible para nuevas construcciones.";
    }

    if (parts.details) {
      parts.details.innerHTML =
        buildImpactHtml_(payload);
    }

    if (parts.confirm) {
      parts.confirm.disabled = false;

      parts.confirm.textContent =
        "Eliminar valor";
    }
  }

  function setModalFinalConfirmation_() {
    STATE.confirmStage = "final";

    const parts = getModalParts_();

    const payload =
      STATE.pendingPayload || {};

    const value =
      payload.valor || {};

    if (parts.title) {
      parts.title.textContent =
        "Confirmación final";
    }

    if (parts.intro) {
      parts.intro.textContent =
        "Confirmá nuevamente para archivar este valor.";
    }

    if (parts.details) {
      parts.details.innerHTML = `
        <div
          class="pubUtmFieldArchiveSummary"
        >
          <div
            class="pubUtmFieldArchiveSummary__field"
          >
            <span>Valor que será archivado</span>

            <strong>
              ${esc_(
                value.valor_permitido ||
                STATE.pendingValue
              )}
            </strong>

            <code>
              ${esc_(
                value.campo_utm ||
                STATE.pendingField
              )}
            </code>
          </div>

          <div
            class="pubUtmFieldArchiveSummary__notice"
          >
            <strong>
              Esta acción bloqueará el uso futuro
              del valor.
            </strong>

            <p>
              No se eliminarán audiencias, conjuntos,
              patrones, combinaciones ni datos
              históricos.
            </p>

            <p>
              Las entidades existentes conservarán su
              composición y quedarán vinculadas a un
              valor archivado.
            </p>
          </div>
        </div>
      `;
    }

    if (parts.confirm) {
      parts.confirm.disabled = false;

      parts.confirm.textContent =
        "Confirmar eliminación";
    }
  }

  function setModalError_(message) {
    STATE.confirmStage = "error";

    const parts = getModalParts_();

    if (parts.title) {
      parts.title.textContent =
        "No se pudo revisar el valor";
    }

    if (parts.intro) {
      parts.intro.textContent =
        "Supabase devolvió un error operativo.";
    }

    if (parts.details) {
      parts.details.innerHTML = `
        <div
          class="pubUtmFieldArchiveError"
        >
          ${esc_(message)}
        </div>
      `;
    }

    if (parts.confirm) {
      parts.confirm.disabled = true;
    }
  }

  function setModalSuccess_() {
    STATE.confirmStage = "success";

    const parts = getModalParts_();

    if (parts.title) {
      parts.title.textContent =
        "El valor fue archivado exitosamente";
    }

    if (parts.intro) {
      parts.intro.textContent =
        "La operación se completó sin eliminar información histórica.";
    }

    if (parts.details) {
      parts.details.innerHTML = `
        <div
          class="pubUtmFieldArchiveLoading"
        >
          <strong>
            ${esc_(STATE.pendingValue)}
          </strong>

          dejó de estar disponible para nuevas
          configuraciones.

          <br><br>

          Las audiencias, conjuntos, patrones,
          combinaciones y métricas existentes
          fueron preservados.
        </div>
      `;
    }

    if (parts.confirm) {
      parts.confirm.disabled = false;

      parts.confirm.textContent =
        "Entendido";

      parts.confirm.classList.remove(
        "pubUtmFieldArchiveDialog__btn--danger"
      );

      parts.confirm.classList.add(
        "pubUtmFieldArchiveDialog__btn--secondary"
      );
    }
  }

  async function openArchiveFlow_(
    field,
    value
  ) {
    const cleanField = clean_(field);
    const cleanValue = clean_(value);

    if (!cleanField || !cleanValue) return;

    STATE.pendingField = cleanField;
    STATE.pendingValue = cleanValue;
    STATE.pendingPayload = null;

    setModalLoading_(
      cleanField,
      cleanValue
    );

    try {
      const payload = await rpc_(
        "rpc_panel_utm_inspeccionar_dependencias_valor",
        {
          p_campo_utm:
            cleanField,

          p_valor_permitido:
            cleanValue
        }
      );

      if (!payload || payload.ok !== true) {
        throw new Error(
          payload && payload.error
            ? payload.error
            : "No se pudo revisar el impacto."
        );
      }

      STATE.pendingPayload = payload;

      setModalImpact_(payload);
    } catch (error) {
      console.error(
        "[Publicidad UTM] Error revisando valor:",
        error
      );

      setModalError_(
        error && error.message
          ? error.message
          : error
      );
    }
  }

  async function confirmArchive_() {
    if (
      STATE.confirmStage === "impact"
    ) {
      setModalFinalConfirmation_();
      return;
    }

    if (
      STATE.confirmStage === "success"
    ) {
      window.location.reload();
      return;
    }

    if (
      STATE.confirmStage !== "final"
    ) {
      return;
    }

    const field =
      clean_(STATE.pendingField);

    const value =
      clean_(STATE.pendingValue);

    if (!field || !value) return;

    const parts = getModalParts_();

    STATE.confirmStage = "processing";

    if (parts.confirm) {
      parts.confirm.disabled = true;

      parts.confirm.textContent =
        "Archivando valor...";
    }

    try {
      const result = await rpc_(
        "rpc_panel_utm_archivar_valor",
        {
          p_campo_utm:
            field,

          p_valor_permitido:
            value,

          p_actor:
            "panel_publicidad_utm",

          p_motivo:
            "Archivado desde Gestionar valores UTM"
        }
      );

      if (!result || result.ok !== true) {
        throw new Error(
          result && result.error
            ? result.error
            : "No se pudo archivar el valor."
        );
      }

      setModalSuccess_();
    } catch (error) {
      console.error(
        "[Publicidad UTM] Error archivando valor:",
        error
      );

      setModalError_(
        error && error.message
          ? error.message
          : error
      );
    }
  }

  function bindEvents_() {
    document.addEventListener(
      "click",
      function (event) {
        const archiveButton =
          event.target.closest &&
          event.target.closest(
            "[data-value-archive-open]"
          );

        if (archiveButton) {
          event.preventDefault();
          event.stopPropagation();

          openArchiveFlow_(
            archiveButton.getAttribute(
              "data-value-archive-field"
            ),
            archiveButton.getAttribute(
              "data-value-archive-open"
            )
          );

          return;
        }

        const confirmButton =
          event.target.closest &&
          event.target.closest(
            "[data-value-archive-confirm]"
          );

        if (confirmButton) {
          event.preventDefault();
          event.stopPropagation();

          confirmArchive_();
          return;
        }

        const closeButton =
          event.target.closest &&
          event.target.closest(
            "[data-value-archive-close]"
          );

        if (closeButton) {
          event.preventDefault();
          event.stopPropagation();

          closeModal_();
          return;
        }

        if (
          event.target &&
          event.target.id ===
            "pubUtmValueArchiveOverlay"
        ) {
          closeModal_();
        }
      },
      true
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key !== "Escape") return;

        closeModal_();
      }
    );
  }

  function init_() {
    ensureModal_();
    bindEvents_();

    console.log(
      "[publicidad-utm-value-archive] OK",
      BUILD
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init_,
      { once: true }
    );
  } else {
    init_();
  }
})();
