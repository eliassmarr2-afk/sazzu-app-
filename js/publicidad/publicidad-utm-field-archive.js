(function () {
  "use strict";

  if (window.__PUB_UTM_FIELD_ARCHIVE_BOOTED__) return;
  window.__PUB_UTM_FIELD_ARCHIVE_BOOTED__ = true;

  const BUILD =
    "PUB_UTM_FIELD_ARCHIVE_MENU_V1_20260725";

  const STATE = {
    pendingField: "",
    pendingPayload: null,
    confirmStage: "idle",
    observer: null
  };

  function clean_(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize_(value) {
    return clean_(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function format_(value) {
    return new Intl.NumberFormat("es-AR").format(
      number_(value)
    );
  }

  function isActive_(item) {
    const value = normalize_(
      item && item.activo
    );

    return (
      value === "si" ||
      value === "true" ||
      value === "1" ||
      value === "activo"
    );
  }

  function getRoot_() {
    return (
      document.querySelector(".pubUtmPage") ||
      document.querySelector(
        '[data-page="publicidad-utm"]'
      ) ||
      document.getElementById("pubUtmPage")
    );
  }

  function getField_(campoUtm) {
    const publicState =
      window.__PUB_UTM_STATE__ || {};

    const payload =
      publicState.camposConfig || {};

    const campos =
      Array.isArray(payload.campos)
        ? payload.campos
        : [];

    return (
      campos.find(function (item) {
        return clean_(item.campo_utm) ===
          clean_(campoUtm);
      }) || null
    );
  }

  async function rpc_(name, params) {
    const cfg =
      window.SAZZU_SUPABASE_CONFIG || {};

    const rawUrl = clean_(
      cfg.url
    );

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
        "No existe publishableKey/anonKey en la configuración de Supabase."
      );
    }

    let restBase = rawUrl.replace(
      /\/+$/,
      ""
    );

    if (!/\/rest\/v1$/i.test(restBase)) {
      restBase += "/rest/v1";
    }

    const url =
      restBase +
      "/rpc/" +
      encodeURIComponent(name);

    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "apikey": key,
          "Authorization": "Bearer " + key,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(
          params || {}
        )
      }
    );

    const text = await response.text();

    let payload = null;

    try {
      payload = text
        ? JSON.parse(text)
        : null;
    } catch (error) {
      throw new Error(
        text ||
        "Supabase devolvió una respuesta no válida."
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
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8 8.5v8m4-8v8m4-8v8M5.5 6h13M9 6V4.5h6V6m2.5 0-.65 13H7.15L6.5 6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
    `;
  }

  function moreIcon_() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="1.7"></circle>
        <circle cx="12" cy="12" r="1.7"></circle>
        <circle cx="19" cy="12" r="1.7"></circle>
      </svg>
    `;
  }

  function ensureModal_() {
    let overlay = document.getElementById(
      "pubUtmFieldArchiveOverlay"
    );

    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "pubUtmFieldArchiveOverlay";
    overlay.className =
      "pubUtmFieldArchiveOverlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <section
        class="pubUtmFieldArchiveDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pubUtmFieldArchiveTitle"
      >
        <header class="pubUtmFieldArchiveDialog__top">
          <span>Confirmación operativa</span>

          <button
            type="button"
            class="pubUtmFieldArchiveDialog__close"
            data-field-archive-close
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div class="pubUtmFieldArchiveDialog__body">
          <div
            class="pubUtmFieldArchiveDialog__icon"
            aria-hidden="true"
          >
            ${trashIcon_()}
          </div>

          <div class="pubUtmFieldArchiveDialog__content">
            <h3 id="pubUtmFieldArchiveTitle">
              Revisando impacto
            </h3>

            <p data-field-archive-intro>
              Consultando las dependencias del campo.
            </p>

            <div
              class="pubUtmFieldArchiveDialog__details"
              data-field-archive-details
            ></div>
          </div>
        </div>

        <footer class="pubUtmFieldArchiveDialog__actions">
          <button
            type="button"
            class="pubUtmFieldArchiveDialog__btn pubUtmFieldArchiveDialog__btn--secondary"
            data-field-archive-close
          >
            Cancelar
          </button>

          <button
            type="button"
            class="pubUtmFieldArchiveDialog__btn pubUtmFieldArchiveDialog__btn--danger"
            data-field-archive-confirm
            disabled
          >
            Eliminar campo
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
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeModal_() {
    const overlay = document.getElementById(
      "pubUtmFieldArchiveOverlay"
    );

    if (!overlay) return;

    const mustReload =
      STATE.confirmStage === "success";

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");

    STATE.pendingField = "";
    STATE.pendingPayload = null;
    STATE.confirmStage = "idle";

    if (mustReload) {
      window.location.reload();
    }
  }

  function setModalLoading_(fieldName) {
    STATE.confirmStage = "loading";

    const overlay = ensureModal_();
    const title = overlay.querySelector(
      "#pubUtmFieldArchiveTitle"
    );
    const intro = overlay.querySelector(
      "[data-field-archive-intro]"
    );
    const details = overlay.querySelector(
      "[data-field-archive-details]"
    );
    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    if (title) {
      title.textContent = "Revisando impacto";
    }

    if (intro) {
      intro.textContent =
        "Validando valores, audiencias, conjuntos, patrones y métricas históricas.";
    }

    if (details) {
      details.innerHTML = `
        <div class="pubUtmFieldArchiveLoading">
          Revisando ${esc_(fieldName)}...
        </div>
      `;
    }

    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = "Eliminar campo";

      confirm.classList.remove(
        "pubUtmFieldArchiveDialog__btn--secondary"
      );

      confirm.classList.add(
        "pubUtmFieldArchiveDialog__btn--danger"
      );
    }

    openModal_();
  }

  function buildImpactHtml_(payload) {
    const campo = payload.campo || {};
    const dependencias =
      payload.dependencias || {};

    const valores =
      dependencias.valores || {};
    const audiencias =
      dependencias.audiencias || {};
    const conjuntos =
      dependencias.conjuntos || {};
    const patrones =
      dependencias.patrones || {};
    const combinaciones =
      dependencias.combinaciones || {};
    const reglas =
      dependencias.reglas_patron || {};
    const analytics =
      dependencias.analytics || {};
    const ventas =
      dependencias.ventas || {};

    return `
      <div class="pubUtmFieldArchiveSummary">
        <div class="pubUtmFieldArchiveSummary__field">
          <span>Campo seleccionado</span>

          <strong>
            ${esc_(
              campo.nombre_visible ||
              campo.campo_utm ||
              "Campo UTM"
            )}
          </strong>

          <code>
            ${esc_(campo.campo_utm || "—")}
          </code>
        </div>

        <div class="pubUtmFieldArchiveSummary__grid">
          <div>
            <span>Valores que se archivarán</span>
            <strong>${format_(valores.activos)}</strong>
          </div>

          <div>
            <span>Audiencias activas</span>
            <strong>${format_(audiencias.activas)}</strong>
          </div>

          <div>
            <span>Conjuntos activos</span>
            <strong>${format_(conjuntos.activos)}</strong>
          </div>

          <div>
            <span>Patrones activos</span>
            <strong>${format_(patrones.activos)}</strong>
          </div>

          <div>
            <span>Combinaciones activas</span>
            <strong>${format_(combinaciones.activas)}</strong>
          </div>

          <div>
            <span>Reglas activas</span>
            <strong>${format_(reglas.activas)}</strong>
          </div>

          <div>
            <span>Eventos históricos</span>
            <strong>${format_(analytics.eventos)}</strong>
          </div>

          <div>
            <span>Visitas históricas</span>
            <strong>
              ${format_(analytics.visitas_consolidadas)}
            </strong>
          </div>

          <div>
            <span>Sesiones históricas</span>
            <strong>
              ${format_(analytics.sesiones_consolidadas)}
            </strong>
          </div>

          <div>
            <span>Ventas históricas</span>
            <strong>
              ${format_(ventas.ventas_historicas)}
            </strong>
          </div>
        </div>

        <div class="pubUtmFieldArchiveSummary__notice">
          <strong>
            La información existente se conservará.
          </strong>

          <p>
            Las audiencias, conjuntos, patrones,
            combinaciones, ventas y métricas históricas
            no serán eliminados.
          </p>

          <p>
            El campo dejará de estar disponible para
            nuevas configuraciones y sus valores activos
            quedarán archivados.
          </p>
        </div>
      </div>
    `;
  }

  function setModalImpact_(payload) {
    STATE.confirmStage = "impact";

    const overlay = ensureModal_();
    const title = overlay.querySelector(
      "#pubUtmFieldArchiveTitle"
    );
    const intro = overlay.querySelector(
      "[data-field-archive-intro]"
    );
    const details = overlay.querySelector(
      "[data-field-archive-details]"
    );
    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    if (title) {
      title.textContent = "Confirmar eliminación";
    }

    if (intro) {
      intro.textContent =
        "El campo será archivado y dejará de estar disponible para nuevas configuraciones.";
    }

    if (details) {
      details.innerHTML =
        buildImpactHtml_(payload);
    }

    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = "Eliminar campo";
    }
  }

  function setModalError_(message) {
    STATE.confirmStage = "error";

    const overlay = ensureModal_();
    const title = overlay.querySelector(
      "#pubUtmFieldArchiveTitle"
    );
    const intro = overlay.querySelector(
      "[data-field-archive-intro]"
    );
    const details = overlay.querySelector(
      "[data-field-archive-details]"
    );
    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    if (title) {
      title.textContent =
        "No se pudo revisar el campo";
    }

    if (intro) {
      intro.textContent =
        "Supabase devolvió un error operativo.";
    }

    if (details) {
      details.innerHTML = `
        <div class="pubUtmFieldArchiveError">
          ${esc_(message)}
        </div>
      `;
    }

    if (confirm) {
      confirm.disabled = true;
    }
  }

  function closeMenus_(exceptMenu) {
    document.querySelectorAll(
      "[data-field-archive-menu]"
    ).forEach(function (menu) {
      const keep =
        exceptMenu && menu === exceptMenu;

      menu.hidden = !keep;

      const wrap = menu.closest(
        "[data-field-archive-wrap]"
      );

      const trigger = wrap
        ? wrap.querySelector(
            "[data-field-archive-menu-trigger]"
          )
        : null;

      if (wrap) {
        wrap.classList.toggle(
          "is-open",
          !!keep
        );
      }

      if (trigger) {
        trigger.setAttribute(
          "aria-expanded",
          keep ? "true" : "false"
        );
      }
    });
  }

  function enhanceCard_(card) {
    if (!card || card.dataset.fieldArchiveReady === "1") {
      return;
    }

    const campo = clean_(
      card.getAttribute("data-param-card")
    );

    if (!campo) return;

    const item = getField_(campo);

    if (item && !isActive_(item)) {
      card.hidden = true;
      return;
    }

    const actions = card.querySelector(
      ".pubUtmParamCard__actions"
    );

    if (!actions) return;

    const wrap = document.createElement("div");
    wrap.className = "pubUtmFieldArchiveMore";
    wrap.setAttribute(
      "data-field-archive-wrap",
      campo
    );

    wrap.innerHTML = `
      <button
        type="button"
        class="pubUtmFieldArchiveMore__trigger"
        data-field-archive-menu-trigger="${esc_(campo)}"
        aria-label="Más acciones para ${esc_(campo)}"
        aria-expanded="false"
      >
        ${moreIcon_()}
      </button>

      <div
        class="pubUtmFieldArchiveMore__menu"
        data-field-archive-menu
        hidden
      >
        <button
          type="button"
          class="pubUtmFieldArchiveMore__delete"
          data-field-archive-open="${esc_(campo)}"
        >
          ${trashIcon_()}
          <span>Eliminar</span>
        </button>
      </div>
    `;

    actions.appendChild(wrap);
    card.dataset.fieldArchiveReady = "1";
  }

  function enhanceCards_() {
    document.querySelectorAll(
      ".pubUtmParamCard[data-param-card]"
    ).forEach(enhanceCard_);
  }

  async function openArchiveFlow_(campo) {
    const field = clean_(campo);

    if (!field) return;

    STATE.pendingField = field;
    STATE.pendingPayload = null;

    setModalLoading_(field);

    try {
      const payload = await rpc_(
        "rpc_panel_utm_inspeccionar_dependencias_campo",
        {
          p_campo_utm: field
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
        "[Publicidad UTM] Error revisando campo:",
        error
      );

      setModalError_(
        error && error.message
          ? error.message
          : error
      );
    }
  }

  /* =========================================================
     INICIO · PUB_UTM_FIELD_ARCHIVE_CONFIRMATION_V2_20260725
     Confirmación obligatoria antes del archivado
     ========================================================= */

  function setModalFinalConfirmation_() {
    const overlay = ensureModal_();

    const title = overlay.querySelector(
      "#pubUtmFieldArchiveTitle"
    );

    const intro = overlay.querySelector(
      "[data-field-archive-intro]"
    );

    const details = overlay.querySelector(
      "[data-field-archive-details]"
    );

    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    const payload =
      STATE.pendingPayload || {};

    const campo =
      payload.campo || {};

    const nombre =
      campo.nombre_visible ||
      campo.campo_utm ||
      STATE.pendingField ||
      "Campo UTM";

    STATE.confirmStage = "final";

    if (title) {
      title.textContent =
        "Confirmación final";
    }

    if (intro) {
      intro.textContent =
        "Confirmá nuevamente para archivar este campo.";
    }

    if (details) {
      details.innerHTML = `
        <div class="pubUtmFieldArchiveSummary">
          <div class="pubUtmFieldArchiveSummary__field">
            <span>Campo que será archivado</span>

            <strong>
              ${esc_(nombre)}
            </strong>

            <code>
              ${esc_(
                campo.campo_utm ||
                STATE.pendingField
              )}
            </code>
          </div>

          <div class="pubUtmFieldArchiveSummary__notice">
            <strong>
              Esta acción bloqueará el uso futuro del campo.
            </strong>

            <p>
              No se eliminarán audiencias, conjuntos,
              patrones, combinaciones, valores históricos
              ni datos de Analytics.
            </p>

            <p>
              El campo y sus valores activos serán enviados
              a la Papelera de campos UTM.
            </p>
          </div>
        </div>
      `;
    }

    if (confirm) {
      confirm.disabled = false;
      confirm.textContent =
        "Confirmar eliminación";

      confirm.classList.remove(
        "pubUtmFieldArchiveDialog__btn--secondary"
      );

      confirm.classList.add(
        "pubUtmFieldArchiveDialog__btn--danger"
      );
    }
  }


  function setModalArchiveSuccess_(field) {
    const overlay = ensureModal_();

    const title = overlay.querySelector(
      "#pubUtmFieldArchiveTitle"
    );

    const intro = overlay.querySelector(
      "[data-field-archive-intro]"
    );

    const details = overlay.querySelector(
      "[data-field-archive-details]"
    );

    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    STATE.confirmStage = "success";

    if (title) {
      title.textContent =
        "Campo archivado correctamente";
    }

    if (intro) {
      intro.textContent =
        "La operación se completó sin eliminar información histórica.";
    }

    if (details) {
      details.innerHTML = `
        <div class="pubUtmFieldArchiveLoading">
          <strong>
            ${esc_(field)}
          </strong>

          fue enviado a la Papelera de campos UTM.

          Podrá restaurarse desde allí mientras conserve
          sus dependencias e historial.
        </div>
      `;
    }

    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = "Entendido";

      confirm.classList.remove(
        "pubUtmFieldArchiveDialog__btn--danger"
      );

      confirm.classList.add(
        "pubUtmFieldArchiveDialog__btn--secondary"
      );
    }
  }


  async function confirmArchive_() {
    const field = clean_(
      STATE.pendingField
    );

    if (!field) return;

    /*
     * Primer clic:
     * dependencias → confirmación final.
     */
    if (
      STATE.confirmStage === "impact"
    ) {
      setModalFinalConfirmation_();
      return;
    }

    /*
     * Resultado:
     * Entendido → recargar biblioteca.
     */
    if (
      STATE.confirmStage === "success"
    ) {
      window.location.reload();
      return;
    }

    /*
     * El archivado solo puede ejecutarse desde
     * la confirmación final.
     */
    if (
      STATE.confirmStage !== "final"
    ) {
      return;
    }

    const overlay = ensureModal_();

    const confirm = overlay.querySelector(
      "[data-field-archive-confirm]"
    );

    STATE.confirmStage = "processing";

    if (confirm) {
      confirm.disabled = true;
      confirm.textContent =
        "Archivando campo...";
    }

    try {
      const result = await rpc_(
        "rpc_panel_utm_archivar_campo",
        {
          p_campo_utm: field,
          p_actor:
            "panel_publicidad_utm",
          p_motivo:
            "Archivado desde Biblioteca UTM"
        }
      );

      if (
        !result ||
        result.ok !== true
      ) {
        throw new Error(
          result && result.error
            ? result.error
            : "No se pudo archivar el campo."
        );
      }

      setModalArchiveSuccess_(field);
    } catch (error) {
      console.error(
        "[Publicidad UTM] Error archivando campo:",
        error
      );

      setModalError_(
        error && error.message
          ? error.message
          : error
      );
    }
  }

  /* =========================================================
     FIN · PUB_UTM_FIELD_ARCHIVE_CONFIRMATION_V2_20260725
     ========================================================= */

  function bindEvents_() {
    if (
      window.__PUB_UTM_FIELD_ARCHIVE_EVENTS_BOUND__
    ) {
      return;
    }

    window.__PUB_UTM_FIELD_ARCHIVE_EVENTS_BOUND__ =
      true;

    document.addEventListener(
      "click",
      function (event) {
        const menuTrigger =
          event.target.closest &&
          event.target.closest(
            "[data-field-archive-menu-trigger]"
          );

        if (menuTrigger) {
          event.preventDefault();
          event.stopPropagation();

          const wrap = menuTrigger.closest(
            "[data-field-archive-wrap]"
          );

          const menu = wrap
            ? wrap.querySelector(
                "[data-field-archive-menu]"
              )
            : null;

          if (!menu) return;

          const open = menu.hidden;

          closeMenus_(open ? menu : null);

          menu.hidden = !open;

          if (wrap) {
            wrap.classList.toggle(
              "is-open",
              open
            );
          }

          menuTrigger.setAttribute(
            "aria-expanded",
            open ? "true" : "false"
          );

          return;
        }

        const archiveButton =
          event.target.closest &&
          event.target.closest(
            "[data-field-archive-open]"
          );

        if (archiveButton) {
          event.preventDefault();
          event.stopPropagation();

          const campo =
            archiveButton.getAttribute(
              "data-field-archive-open"
            );

          closeMenus_();
          openArchiveFlow_(campo);
          return;
        }

        const confirmButton =
          event.target.closest &&
          event.target.closest(
            "[data-field-archive-confirm]"
          );

        if (confirmButton) {
          event.preventDefault();
          confirmArchive_();
          return;
        }

        const closeButton =
          event.target.closest &&
          event.target.closest(
            "[data-field-archive-close]"
          );

        if (closeButton) {
          event.preventDefault();
          closeModal_();
          return;
        }

        if (
          event.target &&
          event.target.id ===
            "pubUtmFieldArchiveOverlay"
        ) {
          closeModal_();
          return;
        }

        if (
          !event.target.closest(
            "[data-field-archive-wrap]"
          )
        ) {
          closeMenus_();
        }
      },
      true
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key !== "Escape") return;

        closeMenus_();
        closeModal_();
      }
    );
  }

  function init_() {
    const root = getRoot_();

    if (!root) return;

    ensureModal_();
    bindEvents_();
    enhanceCards_();

    if (!STATE.observer) {
      STATE.observer =
        new MutationObserver(function () {
          enhanceCards_();
        });

      STATE.observer.observe(root, {
        childList: true,
        subtree: true
      });
    }

    window.setTimeout(enhanceCards_, 200);
    window.setTimeout(enhanceCards_, 650);

    console.log(
      "[publicidad-utm-field-archive] OK",
      BUILD
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init_
    );
  } else {
    init_();
  }

  document.addEventListener(
    "sazzu:page:load",
    init_
  );
})();
