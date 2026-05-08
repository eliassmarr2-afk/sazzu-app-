/* ============================================================
INICIO - Publicidad Interna · Protocol Data
Render visual inicial con datos mock.
No conecta todavía con Supabase, Make ni Brevo.
============================================================ */

(function () {
  "use strict";

  if (window.__pubInternaBooted) return;
  window.__pubInternaBooted = true;

  const PAGE_FILE = "publicidadinterna.html";
  const PUB_INTERNA_FRONT_BUILD = "PUB_INTERNA_FRONT_V1_2026-05-06";

  const FALLBACK_CAMPAIGNS = [
    {
      id: "camp-001",
      campania: "Recompra Pack Camping",
      descripcion: "Campaña ficticia para probar el flujo de Publicidad Interna usando un conjunto creado desde Publicidad UTM.",
      objetivo: "recompra",
      canal: "email",
      proveedor_envio: "brevo",
      estado_campania: "activa",
      estado_visible: "Activa",
      estado_operativo_panel: "activa_con_metricas",
      accion_principal_sugerida: "Ver métricas",
      lectura_rapida: "La campaña ya registra clicks.",
      conjuntos_asociados: 1,
      miembros_estimados: 280,
      miembros_reales_activos: 5,
      miembros_no_disponibles: 0,
      pasos_totales: 3,
      pasos_borrador: 0,
      pasos_activos_o_programados: 3,
      trabajos_totales: 1,
      trabajos_pendientes: 0,
      trabajos_completados: 1,
      trabajos_error: 0,
      enviados: 5,
      entregados: 4,
      abiertos: 2,
      clicks: 1,
      rebotes: 1,
      desuscripciones: 1,
      tasa_entrega_pct: 80,
      tasa_apertura_pct: 50,
      tasa_click_pct: 25,
      tasa_rebote_pct: 20,
      tasa_desuscripcion_pct: 20,
      conjuntos: [
        {
          nombre: "Camping verano compradores",
          rol: "Principal",
          miembros_estimados: 280,
          miembros_reales: 5
        }
      ],
      pasos: [
        {
          orden: 1,
          nombre: "Email inicial",
          delay: "Día 0",
          estado: "Activo"
        },
        {
          orden: 2,
          nombre: "Recordatorio",
          delay: "Día 2",
          estado: "Activo"
        },
        {
          orden: 3,
          nombre: "Último aviso",
          delay: "Día 5",
          estado: "Activo"
        }
      ]
    }
  ];

  const STATE = {
    filter: "todas",
    search: "",
    root: null,
    campaigns: [],
    loading: false,
    error: "",
    usingFallback: true,

    audienceSets: [],
    selectedAudienceSetIds: [],
    loadingAudienceSets: false,
    audienceSetsError: "",
    audienceSetsRequested: false
  };

  window.__PUB_INTERNA_STATE__ = STATE;

  function currentFile_() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
  }

  function isPublicidadInternaPage_() {
    const file = currentFile_();
    const bodyPage = document.body ? document.body.getAttribute("data-page") : "";
    const hasRoot = !!document.querySelector("#pubInternaPage, [data-pi-root], .piShell");

    return (
      file === PAGE_FILE ||
      bodyPage === "publicidadinterna" ||
      location.pathname.includes("/panel/publicidad/publicidadinterna") ||
      hasRoot
    );
  }

  function ensurePublicidadInternaStyles_() {
    if (document.getElementById("pubInternaRuntimeCss")) return;

    const link = document.createElement("link");
    link.id = "pubInternaRuntimeCss";
    link.rel = "stylesheet";
    link.href = "/css/publicidad/publicidadinterna.css";

    document.head.appendChild(link);
  }

  function findOrCreatePublicidadInternaRoot_() {
    let root =
      document.querySelector("#pubInternaPage") ||
      document.querySelector("[data-pi-root]") ||
      document.querySelector(".piShell");

    if (root) return root;

    const main =
      document.querySelector("main.main") ||
      document.querySelector("main") ||
      document.body;

    root = document.createElement("section");
    root.id = "pubInternaPage";
    root.className = "piShell";
    root.setAttribute("data-pi-root", "1");
    root.setAttribute("aria-label", "Panel Publicidad Interna");

    main.innerHTML = "";
    main.appendChild(root);

    return root;
  }

  function ensurePublicidadInternaShell_(root) {
    if (!root) return;

    root.classList.add("piShell");
    root.setAttribute("data-pi-root", "1");

    if (root.dataset.piShellReady === "1") return;

    root.dataset.piShellReady = "1";

    root.innerHTML = `
      <!-- INICIO · Header Publicidad Interna -->
      <header class="piHeader">
        <div class="piHeader__copy">
          <div class="piEyebrow">Motores de crecimiento</div>
          <h1 class="piTitle">Publicidad Interna</h1>
          <p class="piSubtitle">
            Crea campañas internas sobre conjuntos de audiencia, configura secuencias y controla el estado operativo con Make y Brevo.
          </p>
          <p class="piHeader__meta">
          <div class="piHeader__metaRow">
          <p class="piHeader__meta">
            Build <strong data-pi-build>${escapeHtml_(PUB_INTERNA_FRONT_BUILD)}</strong>
          </p>

          <div class="piDataSource is-fallback" data-pi-data-source title="Origen actual de los datos del panel">
            <span class="piDataSource__dot" aria-hidden="true"></span>
            <span data-pi-data-source-label>Fuente: respaldo visual</span>
          </div>
        </div>
          </p>
        </div>

        <div class="piHeader__actions">
          <button class="piBtn piBtn--primary" type="button" data-pi-open-slide="new">
            <span class="piBtn__icon" aria-hidden="true">
              ${icon_("plus")}
            </span>
            <span>Nueva campaña</span>
          </button>
        </div>
      </header>
      <!-- FIN · Header Publicidad Interna -->

      <!-- INICIO · KPIs Publicidad Interna -->
      <section class="piKpiGrid" data-pi-kpis aria-label="Resumen de Publicidad Interna"></section>
      <!-- FIN · KPIs Publicidad Interna -->

      <!-- INICIO · Toolbar Publicidad Interna -->
      <section class="piToolbar" aria-label="Filtros de campañas">
        <div class="piToolbar__left">
          <button class="piFilter is-active" type="button" data-pi-filter="todas">Todas</button>
          <button class="piFilter" type="button" data-pi-filter="activa">Activas</button>
          <button class="piFilter" type="button" data-pi-filter="borrador">Borrador</button>
          <button class="piFilter" type="button" data-pi-filter="pendiente">Pendientes</button>
          <button class="piFilter" type="button" data-pi-filter="error">Errores</button>
        </div>

        <label class="piSearch" aria-label="Buscar campaña">
          <span class="piSearch__icon" aria-hidden="true">
            ${icon_("search")}
          </span>
          <input type="search" placeholder="Buscar campaña..." data-pi-search>
        </label>
      </section>
      <!-- FIN · Toolbar Publicidad Interna -->

      <!-- INICIO · Listado campañas -->
      <section class="piCampaignList" data-pi-campaigns aria-label="Listado de campañas internas"></section>
      <!-- FIN · Listado campañas -->

      <!-- INICIO · Layer slides Publicidad Interna -->
      <div class="piSlideLayer" data-pi-slide-layer aria-hidden="true">
        <button class="piSlideBackdrop" type="button" data-pi-close-slide aria-label="Cerrar panel lateral"></button>

        <!-- INICIO · Slide Nueva campaña -->
        <aside class="piSlide" data-pi-slide="new" aria-label="Nueva campaña interna">
          <div class="piSlide__header">
            <div>
              <div class="piSlide__eyebrow">Nueva campaña</div>
              <h2 class="piSlide__title">Crear campaña interna</h2>
            </div>

            <button class="piSlide__close" type="button" data-pi-close-slide aria-label="Cerrar">
              ${icon_("close")}
            </button>
          </div>

          <div class="piSlide__body">
            <form class="piForm" data-pi-new-form>
              <div class="piFormBlock">
                <div class="piFormBlock__head">
                  <span class="piMiniIcon" aria-hidden="true">
                    ${icon_("list")}
                  </span>
                  <div>
                    <h3>Datos principales</h3>
                    <p>Definí el nombre, objetivo y canal principal de la campaña.</p>
                  </div>
                </div>

                <label class="piField">
                  <span>Nombre de campaña</span>
                  <input type="text" value="Recompra Pack Camping" placeholder="Ej: Recompra Pack Camping">
                </label>

                <div class="piFieldGrid">
                  <label class="piField">
                    <span>Objetivo</span>
                    <select>
                      <option>Recompra</option>
                      <option>Venta cruzada</option>
                      <option>Reactivación</option>
                      <option>Postventa</option>
                    </select>
                  </label>

                  <label class="piField">
                    <span>Canal</span>
                    <select>
                      <option>Email</option>
                      <option>WhatsApp</option>
                      <option>SMS</option>
                    </select>
                  </label>
                </div>
              </div>

              <div class="piFormBlock">
                <div class="piFormBlock__head">
                  <span class="piMiniIcon" aria-hidden="true">
                    ${icon_("users")}
                  </span>
                  <div>
                    <h3>Conjuntos de audiencia</h3>
                    <p>Seleccioná los públicos que participarán en la campaña.</p>
                  </div>
                </div>

                <div class="piAudienceMockList" data-pi-audiences-list>
                <div class="piEmpty">
                  <strong>Cargando conjuntos disponibles...</strong>
                  <p>Supabase está preparando los conjuntos creados desde Publicidad UTM.</p>
                </div>
              </div>
              </div>

              <div class="piFormBlock">
                <div class="piFormBlock__head">
                  <span class="piMiniIcon" aria-hidden="true">
                    ${icon_("sequence")}
                  </span>
                  <div>
                    <h3>Secuencia inicial</h3>
                    <p>Esta versión visual simula una secuencia de 3 pasos.</p>
                  </div>
                </div>

                <div class="piSequencePreview">
                  <div class="piStep">
                    <span>1</span>
                    <div>
                      <strong>Email inicial</strong>
                      <small>Día 0 · Presenta la oferta principal</small>
                    </div>
                  </div>

                  <div class="piStep">
                    <span>2</span>
                    <div>
                      <strong>Recordatorio</strong>
                      <small>Día 2 · Si el contacto no compró</small>
                    </div>
                  </div>

                  <div class="piStep">
                    <span>3</span>
                    <div>
                      <strong>Último aviso</strong>
                      <small>Día 5 · Cierra el flujo</small>
                    </div>
                  </div>
                </div>
              </div>

              <div class="piSlide__footer">
                <button class="piBtn piBtn--ghost" type="button" data-pi-close-slide>Cancelar</button>
                <button class="piBtn piBtn--primary" type="submit">
                  <span class="piBtn__icon" aria-hidden="true">
                    ${icon_("check")}
                  </span>
                  <span>Guardar borrador</span>
                </button>
              </div>
            </form>
          </div>
        </aside>
        <!-- FIN · Slide Nueva campaña -->

        <!-- INICIO · Slide Detalle campaña -->
        <aside class="piSlide" data-pi-slide="detail" aria-label="Detalle de campaña interna">
          <div class="piSlide__header">
            <div>
              <div class="piSlide__eyebrow">Detalle de campaña</div>
              <h2 class="piSlide__title" data-pi-detail-title>Campaña interna</h2>
            </div>

            <button class="piSlide__close" type="button" data-pi-close-slide aria-label="Cerrar">
              ${icon_("close")}
            </button>
          </div>

          <div class="piSlide__body" data-pi-detail-body></div>
        </aside>
        <!-- FIN · Slide Detalle campaña -->
      </div>
      <!-- FIN · Layer slides Publicidad Interna -->

      <div class="piToast" data-pi-toast aria-live="polite"></div>
    `;
  }

  function initPublicidadInterna_() {
    if (!isPublicidadInternaPage_()) return;

    ensurePublicidadInternaStyles_();

    const root = findOrCreatePublicidadInternaRoot_();
    if (!root) return;

    STATE.root = root;

    document.body.setAttribute("data-page", "publicidadinterna");

    ensurePublicidadInternaShell_(root);

    bindEvents_(root);

    if (!STATE.campaigns.length) {
      STATE.campaigns = FALLBACK_CAMPAIGNS.slice();
    }

    render_(root);

    if (root.dataset.piDataRequested !== "1") {
      root.dataset.piDataRequested = "1";
      loadCampaniasDesdeSupabase_(root);
    }

    console.log("[publicidadinterna] montado");
  }

  function bindEvents_(root) {
    if (!root || root.dataset.piEventsBound === "1") return;
    root.dataset.piEventsBound = "1";

    root.addEventListener("click", function (event) {
      const filterBtn = event.target.closest("[data-pi-filter]");
      if (filterBtn) {
        STATE.filter = filterBtn.dataset.piFilter || "todas";

        root.querySelectorAll("[data-pi-filter]").forEach(function (btn) {
          btn.classList.toggle("is-active", btn === filterBtn);
        });

        renderCampaigns_(root);
        return;
      }

      const openSlideBtn = event.target.closest("[data-pi-open-slide]");
      if (openSlideBtn) {
        const slideName = openSlideBtn.dataset.piOpenSlide || "";

        openSlide_(root, slideName);

        if (slideName === "new") {
          loadConjuntosDisponiblesDesdeSupabase_(root);
        }

        return;
      }

      const closeSlideBtn = event.target.closest("[data-pi-close-slide]");
      if (closeSlideBtn) {
        closeSlides_(root);
        return;
      }

      const detailBtn = event.target.closest("[data-pi-open-detail]");
      if (detailBtn) {
        openDetail_(root, detailBtn.dataset.piOpenDetail);
        return;
      }

      const mockActionBtn = event.target.closest("[data-pi-mock-action]");
      if (mockActionBtn) {
        showToast_(root, "Acción visual preparada. Todavía no conecta con Supabase.");
      }
    });

    /* INICIO · Selección de conjuntos disponibles · Publicidad Interna */
    root.addEventListener("change", function (event) {
      const audienceCheckbox = event.target.closest("[data-pi-audience-checkbox]");
      if (!audienceCheckbox) return;

      const id = String(audienceCheckbox.value || "").trim();
      if (!id) return;

      if (audienceCheckbox.checked) {
        if (!STATE.selectedAudienceSetIds.includes(id)) {
          STATE.selectedAudienceSetIds.push(id);
        }
      } else {
        STATE.selectedAudienceSetIds = STATE.selectedAudienceSetIds.filter(function (item) {
          return item !== id;
        });
      }

      renderConjuntosDisponibles_(root);
    });
    /* FIN · Selección de conjuntos disponibles · Publicidad Interna */

    const searchInput = root.querySelector("[data-pi-search]");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        STATE.search = searchInput.value.trim().toLowerCase();
        renderCampaigns_(root);
      });
    }

    const newForm = root.querySelector("[data-pi-new-form]");
    if (newForm) {
      newForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const totalSeleccionados = STATE.selectedAudienceSetIds.length;

        if (!totalSeleccionados) {
          showToast_(root, "Seleccioná al menos un conjunto de audiencia para crear la campaña.");
          return;
        }

        showToast_(
          root,
          "Borrador visual preparado con " +
            totalSeleccionados +
            " conjunto" +
            (totalSeleccionados === 1 ? "" : "s") +
            " seleccionado" +
            (totalSeleccionados === 1 ? "" : "s") +
            "."
        );

        closeSlides_(root);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeSlides_(root);
      }
    });
  }

  function render_(root) {
    renderDataSource_(root);
    renderKpis_(root);
    renderCampaigns_(root);
  }
    /* INICIO · Indicador fuente de datos · Publicidad Interna */
    function renderDataSource_(root) {
      const badge = root.querySelector("[data-pi-data-source]");
      const label = root.querySelector("[data-pi-data-source-label]");
  
      if (!badge || !label) return;
  
      badge.classList.remove("is-supabase", "is-fallback", "is-loading", "is-error");
  
      if (STATE.loading) {
        badge.classList.add("is-loading");
        label.textContent = "Fuente: conectando Supabase";
        badge.title = "El panel está intentando leer datos reales desde Supabase.";
        return;
      }
  
      if (!STATE.usingFallback && !STATE.error) {
        badge.classList.add("is-supabase");
        label.textContent = "Fuente: Supabase";
        badge.title = "El panel está leyendo datos reales desde vista_panel_publicidad_interna.";
        return;
      }
  
      if (STATE.error) {
        badge.classList.add("is-error");
        label.textContent = "Fuente: respaldo visual";
        badge.title = "Supabase no respondió correctamente. Error: " + STATE.error;
        return;
      }
  
      badge.classList.add("is-fallback");
      label.textContent = "Fuente: respaldo visual";
      badge.title = "El panel está usando datos visuales internos como respaldo temporal.";
    }
    /* FIN · Indicador fuente de datos · Publicidad Interna */

    /* INICIO · Supabase read · Publicidad Interna */
    async function loadCampaniasDesdeSupabase_(root) {
      const config = window.SAZZU_SUPABASE_CONFIG || {};

      let url = String(config.url || config.projectUrl || config.apiUrl || "").trim();
      url = url.replace(/\/$/, "");
      url = url.replace(/\/rest\/v1$/, "");
  
      const key = String(
        config.anonKey ||
        config.publishableKey ||
        config.publicKey ||
        config.key ||
        ""
      ).trim();
  
      if (!url || !key) {
        STATE.error = "Falta configurar Supabase URL o publishable key.";
        STATE.usingFallback = true;
        console.warn("[publicidadinterna] Supabase config incompleta.");
        showToast_(root, "Supabase no está configurado. Usando datos visuales.");
        render_(root);
        return;
      }
  
      STATE.loading = true;
      STATE.error = "";
  
      renderDataSource_(root);
  
      try {
        const endpoint = [
          url,
          "/rest/v1/vista_panel_publicidad_interna",
          "?select=*"
        ].join("");
  
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Accept": "application/json"
          }
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error("HTTP " + response.status + " · " + errorText);
        }
  
        const rows = await response.json();
  
        if (!Array.isArray(rows) || !rows.length) {
          STATE.campaigns = [];
          STATE.usingFallback = false;
          STATE.loading = false;
          render_(root);
          showToast_(root, "Supabase respondió, pero no hay campañas todavía.");
          return;
        }
  
        STATE.campaigns = rows.map(normalizeCampaniaDesdeSupabase_);
        STATE.usingFallback = false;
        STATE.loading = false;
        STATE.error = "";
  
        render_(root);
        showToast_(root, "Datos reales cargados desde Supabase.");
      } catch (error) {
        STATE.loading = false;
        STATE.error = String(error && error.message ? error.message : error);
        STATE.usingFallback = true;
        STATE.campaigns = FALLBACK_CAMPAIGNS.slice();
  
        console.error("[publicidadinterna] Error leyendo Supabase:", error);
        render_(root);
        showToast_(root, "No se pudo leer Supabase. Usando respaldo visual.");
      }
    }
  
    function normalizeCampaniaDesdeSupabase_(row) {
      const campania = String(row.campania || "Campaña sin nombre");
  
      return {
        id: String(row.campania_id || campania),
        campania: campania,
        descripcion: String(row.descripcion || ""),
        objetivo: String(row.objetivo || "publicidad_interna"),
        canal: String(row.canal || "email"),
        proveedor_envio: String(row.proveedor_envio || "brevo"),
  
        estado_campania: String(row.estado_campania || "borrador"),
        estado_visible: String(row.estado_visible || row.estado_campania || "Borrador"),
        estado_operativo_panel: String(row.estado_operativo_panel || "configuracion_incompleta"),
        accion_principal_sugerida: String(row.accion_principal_sugerida || "Ver detalle"),
        lectura_rapida: String(row.lectura_rapida || "Campaña cargada desde Supabase."),
  
        conjuntos_asociados: toNumber_(row.conjuntos_asociados),
        miembros_estimados: toNumber_(row.miembros_estimados),
        miembros_reales_activos: toNumber_(row.miembros_reales_activos),
        miembros_no_disponibles: toNumber_(row.miembros_no_disponibles),
  
        pasos_totales: toNumber_(row.pasos_totales),
        pasos_borrador: toNumber_(row.pasos_borrador),
        pasos_activos_o_programados: toNumber_(row.pasos_activos_o_programados),
  
        trabajos_totales: toNumber_(row.trabajos_totales),
        trabajos_pendientes: toNumber_(row.trabajos_pendientes),
        trabajos_completados: toNumber_(row.trabajos_completados),
        trabajos_error: toNumber_(row.trabajos_error),
  
        enviados: toNumber_(row.enviados),
        entregados: toNumber_(row.entregados),
        abiertos: toNumber_(row.abiertos),
        clicks: toNumber_(row.clicks),
        rebotes: toNumber_(row.rebotes),
        desuscripciones: toNumber_(row.desuscripciones),
  
        tasa_entrega_pct: toNumber_(row.tasa_entrega_pct),
        tasa_apertura_pct: toNumber_(row.tasa_apertura_pct),
        tasa_click_pct: toNumber_(row.tasa_click_pct),
        tasa_rebote_pct: toNumber_(row.tasa_rebote_pct),
        tasa_desuscripcion_pct: toNumber_(row.tasa_desuscripcion_pct),
  
        conjuntos: [
          {
            nombre: "Conjuntos asociados",
            rol: "Principal",
            miembros_estimados: toNumber_(row.miembros_estimados),
            miembros_reales: toNumber_(row.miembros_reales_activos)
          }
        ],
  
        pasos: buildPasosResumen_(row)
      };
    }
  
    function buildPasosResumen_(row) {
      const total = Math.max(toNumber_(row.pasos_totales), 0);
  
      if (!total) {
        return [
          {
            orden: 1,
            nombre: "Sin pasos configurados",
            delay: "Pendiente",
            estado: "Borrador"
          }
        ];
      }
  
      return Array.from({ length: total }).map(function (_, index) {
        const orden = index + 1;
  
        const nombres = {
          1: "Email inicial",
          2: "Recordatorio",
          3: "Último aviso"
        };
  
        const delays = {
          1: "Día 0",
          2: "Día 2",
          3: "Día 5"
        };
  
        return {
          orden: orden,
          nombre: nombres[orden] || "Paso " + orden,
          delay: delays[orden] || "Secuencia",
          estado: toNumber_(row.pasos_activos_o_programados) > 0 ? "Activo" : "Borrador"
        };
      });
    }
  
    function getCampaignSource_() {
      return Array.isArray(STATE.campaigns) ? STATE.campaigns : [];
    }
  
    function toNumber_(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }

    /* INICIO · Conjuntos disponibles desde Supabase · Publicidad Interna */
    async function loadConjuntosDisponiblesDesdeSupabase_(root) {
      if (!root) return;

      if (STATE.loadingAudienceSets) {
        renderConjuntosDisponibles_(root);
        return;
      }

      if (STATE.audienceSetsRequested && STATE.audienceSets.length) {
        renderConjuntosDisponibles_(root);
        return;
      }

      const config = window.SAZZU_SUPABASE_CONFIG || {};

      let url = String(config.url || config.projectUrl || config.apiUrl || "").trim();
      url = url.replace(/\/$/, "");
      url = url.replace(/\/rest\/v1$/, "");

      const key = String(
        config.anonKey ||
        config.publishableKey ||
        config.publicKey ||
        config.key ||
        ""
      ).trim();

      if (!url || !key) {
        STATE.audienceSetsError = "Falta configurar Supabase URL o publishable key.";
        STATE.loadingAudienceSets = false;
        STATE.audienceSetsRequested = true;
        renderConjuntosDisponibles_(root);
        showToast_(root, "No se pudieron cargar conjuntos: falta configuración de Supabase.");
        return;
      }

      STATE.loadingAudienceSets = true;
      STATE.audienceSetsError = "";
      STATE.audienceSetsRequested = true;

      renderConjuntosDisponibles_(root);

      try {
        const endpoint = [
          url,
          "/rest/v1/vista_conjuntos_audiencia_disponibles",
          "?select=*",
          "&order=fecha_actualizacion.desc"
        ].join("");

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error("HTTP " + response.status + " · " + errorText);
        }

        const rows = await response.json();

        STATE.audienceSets = Array.isArray(rows)
          ? rows.map(normalizeConjuntoDisponibleDesdeSupabase_)
          : [];

        const validIds = STATE.audienceSets.map(function (item) {
          return item.id;
        });

        STATE.selectedAudienceSetIds = STATE.selectedAudienceSetIds.filter(function (id) {
          return validIds.includes(id);
        });

        STATE.loadingAudienceSets = false;
        STATE.audienceSetsError = "";

        renderConjuntosDisponibles_(root);

        if (STATE.audienceSets.length) {
          showToast_(root, "Conjuntos reales cargados desde Supabase.");
        } else {
          showToast_(root, "Supabase respondió, pero no hay conjuntos disponibles.");
        }
      } catch (error) {
        STATE.loadingAudienceSets = false;
        STATE.audienceSetsError = String(error && error.message ? error.message : error);
        console.error("[publicidadinterna] Error leyendo conjuntos disponibles:", error);

        renderConjuntosDisponibles_(root);
        showToast_(root, "No se pudieron cargar los conjuntos disponibles.");
      }
    }

    function normalizeConjuntoDisponibleDesdeSupabase_(row) {
      const sourceId = String(row.source_conjunto_id || "").trim();
      const uuid = String(row.conjunto_audiencia_id || "").trim();
      const nombre = String(row.nombre || "Conjunto sin nombre").trim();

      const miembrosActivos = toNumber_(row.miembros_activos_reales);
      const cantidadMiembros = toNumber_(row.cantidad_miembros);
      const miembros = miembrosActivos || cantidadMiembros || 0;

      return {
        id: uuid || sourceId || nombre,
        sourceId: sourceId,
        nombre: nombre,
        descripcion: String(row.descripcion || "").trim(),
        moduloOrigen: String(row.modulo_origen || "").trim(),
        clasificacion: String(row.clasificacion || "publicidad_interna").trim(),
        estado: String(row.estado || "activo").trim(),
        cantidadMiembros: cantidadMiembros,
        miembrosActivos: miembrosActivos,
        miembros: miembros,
        fechaActualizacion: String(row.fecha_actualizacion || "").trim()
      };
    }

    function renderConjuntosDisponibles_(root) {
      const node = root.querySelector("[data-pi-audiences-list]");
      if (!node) return;

      if (STATE.loadingAudienceSets) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>Cargando conjuntos disponibles...</strong>',
            '<p>Consultando Supabase para traer los públicos creados desde Publicidad UTM.</p>',
          '</div>'
        ].join("");
        return;
      }

      if (STATE.audienceSetsError) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>No se pudieron cargar los conjuntos.</strong>',
            '<p>', escapeHtml_(STATE.audienceSetsError), '</p>',
          '</div>'
        ].join("");
        return;
      }

      if (!STATE.audienceSets.length) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>No hay conjuntos disponibles.</strong>',
            '<p>Primero creá o sincronizá conjuntos desde Publicidad UTM.</p>',
          '</div>'
        ].join("");
        return;
      }

      node.innerHTML = STATE.audienceSets.map(renderConjuntoDisponibleOption_).join("");
    }

    function renderConjuntoDisponibleOption_(item) {
      const checked = STATE.selectedAudienceSetIds.includes(item.id) ? " checked" : "";
      const sourceLabel = item.sourceId ? item.sourceId + " · " : "";
      const miembros = item.miembros || item.miembrosActivos || item.cantidadMiembros || 0;

      return [
        '<label class="piAudienceOption" data-pi-audience-option="', escapeHtml_(item.id), '">',
          '<input ',
            'type="checkbox" ',
            'value="', escapeHtml_(item.id), '" ',
            'data-pi-audience-checkbox',
            checked,
          '>',
          '<span>',
            '<strong>',
              escapeHtml_(sourceLabel),
              escapeHtml_(item.nombre),
            '</strong>',
            '<small>',
              formatNumber_(miembros),
              ' miembros activos · ',
              escapeHtml_(labelObjetivo_(item.clasificacion)),
              ' · ',
              escapeHtml_(item.estado),
            '</small>',
            item.descripcion
              ? '<small>' + escapeHtml_(item.descripcion) + '</small>'
              : '',
          '</span>',
        '</label>'
      ].join("");
    }
    /* FIN · Conjuntos disponibles desde Supabase · Publicidad Interna */

    /* FIN · Supabase read · Publicidad Interna */

  function renderKpis_(root) {
    const node = root.querySelector("[data-pi-kpis]");
    if (!node) return;

    const campaigns = getCampaignSource_();

    const active = campaigns.filter(function (item) {
      return item.estado_campania === "activa";
    }).length;

    const sent = sum_(campaigns, "enviados");
    const opened = sum_(campaigns, "abiertos");
    const clicks = sum_(campaigns, "clicks");
    const pendingJobs = sum_(campaigns, "trabajos_pendientes");

    const kpis = [
      {
        label: "Campañas activas",
        value: active,
        note: "Flujos operativos",
        icon: "campaign"
      },
      {
        label: "Enviados",
        value: sent,
        note: "Eventos registrados",
        icon: "send"
      },
      {
        label: "Abiertos",
        value: opened,
        note: "Contactos con apertura",
        icon: "open"
      },
      {
        label: "Clicks",
        value: clicks,
        note: "Interacciones útiles",
        icon: "click"
      },
      {
        label: "Pendientes",
        value: pendingJobs,
        note: "Trabajos Make/Brevo",
        icon: "sync"
      }
    ];

    node.innerHTML = kpis.map(function (kpi) {
      return [
        '<article class="piKpi">',
          '<div class="piKpi__top">',
            '<div class="piKpi__label">', escapeHtml_(kpi.label), '</div>',
            '<span class="piKpi__icon" aria-hidden="true">', icon_(kpi.icon), '</span>',
          '</div>',
          '<div>',
            '<div class="piKpi__value">', formatNumber_(kpi.value), '</div>',
            '<div class="piKpi__note">', escapeHtml_(kpi.note), '</div>',
          '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderCampaigns_(root) {
    const node = root.querySelector("[data-pi-campaigns]");
    if (!node) return;

    const campaigns = getFilteredCampaigns_();

    if (!campaigns.length) {
      node.innerHTML = [
        '<div class="piEmpty">',
          '<strong>No hay campañas para este filtro.</strong>',
          '<p>Probá cambiar el filtro o crear una nueva campaña interna.</p>',
        '</div>'
      ].join("");
      return;
    }

    node.innerHTML = campaigns.map(renderCampaignCard_).join("");
  }

  function renderCampaignCard_(campaign) {
    return [
      '<article class="piCampaignCard">',
        '<div class="piCampaignCard__top">',
          '<div class="piCampaignCard__identity">',
            '<span class="piCampaignIcon" aria-hidden="true">', icon_("campaign"), '</span>',
            '<div>',
              '<h2 class="piCampaignCard__title">', escapeHtml_(campaign.campania), '</h2>',
              '<div class="piCampaignCard__meta">',
                '<span class="piChip">', labelObjetivo_(campaign.objetivo), '</span>',
                '<span class="piChip">', escapeHtml_(campaign.canal), '</span>',
                '<span class="piChip">', escapeHtml_(campaign.proveedor_envio), '</span>',
              '</div>',
            '</div>',
          '</div>',

          '<span class="piStatus ', statusClass_(campaign), '">',
            escapeHtml_(campaign.estado_visible),
          '</span>',
        '</div>',

        '<div class="piCampaignCard__body">',
          '<div class="piReading">',
            '<strong>', escapeHtml_(campaign.accion_principal_sugerida), '</strong>',
            '<p>', escapeHtml_(campaign.lectura_rapida), '</p>',
          '</div>',

          '<div class="piMetricGrid">',
            metric_("Miembros", campaign.miembros_reales_activos + " / " + campaign.miembros_estimados),
            metric_("Enviados", campaign.enviados),
            metric_("Apertura", campaign.tasa_apertura_pct + "%"),
            metric_("Click", campaign.tasa_click_pct + "%"),
          '</div>',
        '</div>',

        '<div class="piCampaignCard__footer">',
          '<div class="piCampaignCard__footnote">',
            escapeHtml_(campaign.conjuntos_asociados), ' conjunto · ',
            escapeHtml_(campaign.pasos_totales), ' pasos · ',
            escapeHtml_(campaign.trabajos_completados), ' trabajo Make/Brevo completado',
          '</div>',

          '<div class="piCampaignCard__actions">',
            '<button class="piBtn piBtn--ghost" type="button" data-pi-open-detail="', escapeHtml_(campaign.id), '">',
              'Ver detalle',
            '</button>',
            '<button class="piBtn piBtn--primary" type="button" data-pi-mock-action>',
              '<span class="piBtn__icon" aria-hidden="true">', icon_("chart"), '</span>',
              escapeHtml_(campaign.accion_principal_sugerida),
            '</button>',
          '</div>',
        '</div>',
      '</article>'
    ].join("");
  }

  async function openDetail_(root, campaignId) {
    const campaign = getCampaignSource_().find(function (item) {
      return String(item.id) === String(campaignId);
    });

    if (!campaign) {
      showToast_(root, "No se encontró la campaña seleccionada.");
      return;
    }

    const title = root.querySelector("[data-pi-detail-title]");
    const body = root.querySelector("[data-pi-detail-body]");

    if (title) title.textContent = campaign.campania;

    if (body) {
      body.innerHTML = renderDetailLoading_(campaign);
    }

    openSlide_(root, "detail");

    try {
      const detalle = await loadDetalleCampaniaDesdeSupabase_(campaign.id);
      renderDetailReal_(root, campaign, detalle);
      showToast_(root, "Detalle real cargado desde Supabase.");
    } catch (error) {
      console.error("[publicidadinterna] Error cargando detalle Supabase:", error);

      const fallbackDetalle = buildFallbackDetalle_(campaign);
      renderDetailReal_(root, campaign, fallbackDetalle, {
        fallback: true,
        error: String(error && error.message ? error.message : error)
      });

      showToast_(root, "No se pudo leer el detalle real. Usando respaldo visual.");
    }
  }

  function renderDetailLoading_(campaign) {
    return [
      '<section class="piDetailHero">',
        '<div class="piDetailHero__top">',
          '<div>',
            '<h3>', escapeHtml_(campaign.campania), '</h3>',
            '<p>Conectando con Supabase para cargar el detalle operativo de la campaña.</p>',
          '</div>',
          '<span class="piStatus ', statusClass_(campaign), '">', escapeHtml_(campaign.estado_visible), '</span>',
        '</div>',

        '<div class="piReading" style="margin-top:14px;">',
          '<strong>Cargando detalle real</strong>',
          '<p>Estamos consultando conjuntos, pasos, trabajos Make/Brevo y eventos recientes.</p>',
        '</div>',
      '</section>'
    ].join("");
  }

  async function loadDetalleCampaniaDesdeSupabase_(campaignId) {
    const config = window.SAZZU_SUPABASE_CONFIG || {};

    let url = String(config.url || config.projectUrl || config.apiUrl || "").trim();
    url = url.replace(/\/$/, "");
    url = url.replace(/\/rest\/v1$/, "");

    const key = String(
      config.anonKey ||
      config.publishableKey ||
      config.publicKey ||
      config.key ||
      ""
    ).trim();

    if (!url || !key) {
      throw new Error("Falta configurar Supabase URL o publishable key.");
    }

    const endpoint = [
      url,
      "/rest/v1/vista_detalle_campania_interna",
      "?select=*",
      "&campania_id=eq.",
      encodeURIComponent(campaignId),
      "&limit=1"
    ].join("");

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "apikey": key,
        "Authorization": "Bearer " + key,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("HTTP " + response.status + " · " + errorText);
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || !rows.length) {
      throw new Error("Supabase no devolvió detalle para esta campaña.");
    }

    return normalizeDetalleCampania_(rows[0]);
  }

  function normalizeDetalleCampania_(row) {
    return {
      campania_id: String(row.campania_id || ""),
      campania: String(row.campania || "Campaña sin nombre"),
      descripcion: String(row.descripcion || ""),
      objetivo: String(row.objetivo || "publicidad_interna"),
      canal: String(row.canal || "email"),
      proveedor_envio: String(row.proveedor_envio || "brevo"),
      estado_campania: String(row.estado_campania || "borrador"),
      fecha_inicio_programada: row.fecha_inicio_programada || "",
      fecha_fin_programada: row.fecha_fin_programada || "",
      zona_horaria: String(row.zona_horaria || ""),

      conjuntos: ensureArray_(row.conjuntos),
      pasos: ensureArray_(row.pasos),
      trabajos: ensureArray_(row.trabajos),
      eventos_recientes: ensureArray_(row.eventos_recientes)
    };
  }

  function buildFallbackDetalle_(campaign) {
    return {
      campania_id: campaign.id,
      campania: campaign.campania,
      descripcion: campaign.descripcion,
      objetivo: campaign.objetivo,
      canal: campaign.canal,
      proveedor_envio: campaign.proveedor_envio,
      estado_campania: campaign.estado_campania,
      fecha_inicio_programada: "",
      fecha_fin_programada: "",
      zona_horaria: "",

      conjuntos: (campaign.conjuntos || []).map(function (conjunto) {
        return {
          nombre: conjunto.nombre,
          rol_conjunto: conjunto.rol,
          cantidad_miembros: conjunto.miembros_estimados,
          miembros_reales: conjunto.miembros_reales,
          clasificacion: campaign.objetivo,
          estado: "activo"
        };
      }),

      pasos: (campaign.pasos || []).map(function (paso) {
        return {
          orden: paso.orden,
          nombre_paso: paso.nombre,
          estado: paso.estado,
          delay_cantidad: paso.delay ? paso.delay.replace(/\D/g, "") : "",
          delay_unidad: "dias",
          tipo_accion: "enviar_email",
          proveedor_envio: campaign.proveedor_envio,
          asunto_email: ""
        };
      }),

      trabajos: [
        {
          tipo_trabajo: "sincronizar_campania",
          proveedor_orquestacion: "make",
          proveedor_envio: campaign.proveedor_envio,
          estado: campaign.trabajos_error > 0 ? "error" : "completado",
          intento_actual: 1,
          max_intentos: 3,
          cantidad_contactos_estimados: campaign.miembros_estimados,
          cantidad_contactos_sincronizados: campaign.miembros_reales_activos,
          cantidad_contactos_error: 0,
          make_execution_id: "fallback-visual"
        }
      ],

      eventos_recientes: []
    };
  }

  function renderDetailReal_(root, campaign, detalle, options) {
    const body = root.querySelector("[data-pi-detail-body]");
    if (!body) return;

    const isFallback = !!(options && options.fallback);

    body.innerHTML = [
      renderDetailHero_(campaign, detalle, isFallback),
      renderDetailConjuntos_(detalle.conjuntos),
      renderDetailPasos_(detalle.pasos),
      renderDetailTrabajos_(detalle.trabajos),
      renderDetailEventos_(detalle.eventos_recientes)
    ].join("");
  }

  function renderDetailHero_(campaign, detalle, isFallback) {
    return [
      '<section class="piDetailHero">',
        '<div class="piDetailHero__top">',
          '<div>',
            '<h3>', escapeHtml_(detalle.campania || campaign.campania), '</h3>',
            '<p>', escapeHtml_(detalle.descripcion || campaign.descripcion || "Detalle operativo de campaña interna."), '</p>',
          '</div>',
          '<span class="piStatus ', statusClass_(campaign), '">', escapeHtml_(campaign.estado_visible), '</span>',
        '</div>',

        '<div class="piDetailGrid">',
          metric_("Canal", titleCase_(detalle.canal || campaign.canal)),
          metric_("Proveedor", titleCase_(detalle.proveedor_envio || campaign.proveedor_envio)),
          metric_("Origen", isFallback ? "Respaldo visual" : "Supabase"),
          metric_("Conjuntos", ensureArray_(detalle.conjuntos).length),
          metric_("Pasos", ensureArray_(detalle.pasos).length),
          metric_("Eventos", ensureArray_(detalle.eventos_recientes).length),
        '</div>',
      '</section>'
    ].join("");
  }

  function renderDetailConjuntos_(conjuntos) {
    const items = ensureArray_(conjuntos);

    return [
      '<section class="piDetailBlock">',
        '<div class="piDetailBlock__head">',
          '<span class="piMiniIcon" aria-hidden="true">', icon_("users"), '</span>',
          '<div>',
            '<h3>Conjuntos asociados</h3>',
            '<p>Audiencias reales vinculadas a la campaña.</p>',
          '</div>',
        '</div>',

        items.length ? items.map(function (conjunto) {
          return [
            '<div class="piStep">',
              '<span>', escapeHtml_(String(conjunto.rol_conjunto || "P").slice(0, 1).toUpperCase()), '</span>',
              '<div>',
                '<strong>', escapeHtml_(conjunto.nombre || "Conjunto sin nombre"), '</strong>',
                '<small>',
                  escapeHtml_(titleCase_(conjunto.clasificacion || "sin clasificación")),
                  ' · ',
                  escapeHtml_(conjunto.cantidad_miembros || 0),
                  ' miembros estimados · ',
                  escapeHtml_(titleCase_(conjunto.estado || "activo")),
                '</small>',
              '</div>',
            '</div>'
          ].join("");
        }).join("") : renderDetailEmpty_("No hay conjuntos asociados todavía."),

      '</section>'
    ].join("");
  }

  function renderDetailPasos_(pasos) {
    const items = ensureArray_(pasos);

    return [
      '<section class="piDetailBlock">',
        '<div class="piDetailBlock__head">',
          '<span class="piMiniIcon" aria-hidden="true">', icon_("sequence"), '</span>',
          '<div>',
            '<h3>Pasos de secuencia</h3>',
            '<p>Orden real de emails y acciones configuradas.</p>',
          '</div>',
        '</div>',

        items.length ? items.map(function (paso) {
          return [
            '<div class="piStep">',
              '<span>', escapeHtml_(paso.orden || "-"), '</span>',
              '<div>',
                '<strong>', escapeHtml_(paso.nombre_paso || "Paso sin nombre"), '</strong>',
                '<small>',
                  escapeHtml_(formatDelay_(paso.delay_cantidad, paso.delay_unidad)),
                  ' · ',
                  escapeHtml_(titleCase_(paso.estado || "borrador")),
                  ' · ',
                  escapeHtml_(titleCase_(paso.tipo_accion || "acción")),
                '</small>',
                paso.asunto_email ? '<small>Asunto: ' + escapeHtml_(paso.asunto_email) + '</small>' : '',
              '</div>',
            '</div>'
          ].join("");
        }).join("") : renderDetailEmpty_("No hay pasos configurados todavía."),

      '</section>'
    ].join("");
  }

  function renderDetailTrabajos_(trabajos) {
    const items = ensureArray_(trabajos);

    return [
      '<section class="piDetailBlock">',
        '<div class="piDetailBlock__head">',
          '<span class="piMiniIcon" aria-hidden="true">', icon_("sync"), '</span>',
          '<div>',
            '<h3>Estado Make/Brevo</h3>',
            '<p>Últimos trabajos técnicos de sincronización.</p>',
          '</div>',
        '</div>',

        items.length ? items.map(function (trabajo) {
          return [
            '<div class="piStep">',
              '<span>', escapeHtml_(String(trabajo.estado || "P").slice(0, 1).toUpperCase()), '</span>',
              '<div>',
                '<strong>', escapeHtml_(titleCase_(trabajo.tipo_trabajo || "Trabajo")), '</strong>',
                '<small>',
                  escapeHtml_(titleCase_(trabajo.estado || "pendiente")),
                  ' · ',
                  escapeHtml_(titleCase_(trabajo.proveedor_orquestacion || "make")),
                  ' → ',
                  escapeHtml_(titleCase_(trabajo.proveedor_envio || "brevo")),
                '</small>',
                '<small>',
                  escapeHtml_(trabajo.cantidad_contactos_sincronizados || 0),
                  ' sincronizados / ',
                  escapeHtml_(trabajo.cantidad_contactos_error || 0),
                  ' errores',
                '</small>',
              '</div>',
            '</div>'
          ].join("");
        }).join("") : renderDetailEmpty_("No hay trabajos Make/Brevo registrados."),

      '</section>'
    ].join("");
  }

  function renderDetailEventos_(eventos) {
    const items = ensureArray_(eventos);

    return [
      '<section class="piDetailBlock">',
        '<div class="piDetailBlock__head">',
          '<span class="piMiniIcon" aria-hidden="true">', icon_("open"), '</span>',
          '<div>',
            '<h3>Eventos recientes</h3>',
            '<p>Últimos eventos recibidos desde Brevo.</p>',
          '</div>',
        '</div>',

        items.length ? items.slice(0, 10).map(function (evento) {
          return [
            '<div class="piStep">',
              '<span>', escapeHtml_(String(evento.tipo_evento || "E").slice(0, 1).toUpperCase()), '</span>',
              '<div>',
                '<strong>', escapeHtml_(titleCase_(evento.tipo_evento || "Evento")), '</strong>',
                '<small>',
                  escapeHtml_(evento.email || "sin email"),
                  ' · ',
                  escapeHtml_(formatDateTime_(evento.fecha_evento)),
                '</small>',
                evento.url_click ? '<small>URL: ' + escapeHtml_(evento.url_click) + '</small>' : '',
              '</div>',
            '</div>'
          ].join("");
        }).join("") : renderDetailEmpty_("Todavía no hay eventos recientes."),

      '</section>'
    ].join("");
  }

  function renderDetailEmpty_(message) {
    return [
      '<div class="piEmpty">',
        '<strong>', escapeHtml_(message), '</strong>',
      '</div>'
    ].join("");
  }

  function ensureArray_(value) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    return [];
  }

  function formatDelay_(cantidad, unidad) {
    const number = toNumber_(cantidad);
    const unit = String(unidad || "dias");

    if (!number) return "Sin espera";

    if (unit === "horas") return number + " hora" + (number === 1 ? "" : "s");
    if (unit === "minutos") return number + " minuto" + (number === 1 ? "" : "s");

    return number + " día" + (number === 1 ? "" : "s");
  }

  function formatDateTime_(value) {
    if (!value) return "Sin fecha";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function titleCase_(value) {
    return String(value == null ? "" : value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function openSlide_(root, slideName) {
    const layer = root.querySelector("[data-pi-slide-layer]");
    if (!layer) return;

    root.querySelectorAll("[data-pi-slide]").forEach(function (slide) {
      slide.classList.toggle("is-active", slide.dataset.piSlide === slideName);
    });

    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
  }

  function closeSlides_(root) {
    const layer = root.querySelector("[data-pi-slide-layer]");
    if (!layer) return;

    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");

    root.querySelectorAll("[data-pi-slide]").forEach(function (slide) {
      slide.classList.remove("is-active");
    });
  }

  function getFilteredCampaigns_() {
    return getCampaignSource_().filter(function (campaign) {
      const matchesSearch = !STATE.search ||
        campaign.campania.toLowerCase().includes(STATE.search) ||
        campaign.objetivo.toLowerCase().includes(STATE.search) ||
        campaign.estado_visible.toLowerCase().includes(STATE.search);

      if (!matchesSearch) return false;

      if (STATE.filter === "todas") return true;
      if (STATE.filter === "activa") return campaign.estado_campania === "activa";
      if (STATE.filter === "borrador") return campaign.estado_campania === "borrador";
      if (STATE.filter === "pendiente") return campaign.trabajos_pendientes > 0;
      if (STATE.filter === "error") return campaign.trabajos_error > 0;

      return true;
    });
  }

  function metric_(label, value) {
    return [
      '<div class="piMetric">',
        '<span>', escapeHtml_(label), '</span>',
        '<strong>', escapeHtml_(value), '</strong>',
      '</div>'
    ].join("");
  }

  function statusClass_(campaign) {
    if (campaign.estado_campania === "activa") return "piStatus--active";
    if (campaign.estado_campania === "borrador") return "piStatus--draft";
    if (campaign.trabajos_pendientes > 0) return "piStatus--pending";
    if (campaign.trabajos_error > 0 || campaign.estado_campania === "error") return "piStatus--error";
    return "piStatus--draft";
  }

  function labelObjetivo_(objetivo) {
    const map = {
      recompra: "Recompra",
      venta_cruzada: "Venta cruzada",
      reactivacion: "Reactivación",
      postventa: "Postventa",
      publicidad_interna: "Publicidad interna"
    };

    return map[objetivo] || objetivo;
  }

  function sum_(items, key) {
    return items.reduce(function (acc, item) {
      return acc + (Number(item[key]) || 0);
    }, 0);
  }

  function formatNumber_(value) {
    return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
  }

  function showToast_(root, message) {
    const toast = root.querySelector("[data-pi-toast]");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(showToast_._timer);
    showToast_._timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon_(name) {
    const icons = {
      plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>',
      close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"></path></svg>',
      search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M16.5 16.5L21 21"></path></svg>',
      list: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h10M4 17h7"></path></svg>',
      campaign: '<svg viewBox="0 0 24 24"><path d="M4 13V7a2 2 0 0 1 2-2h4l8-2v18l-8-2H6a2 2 0 0 1-2-2v-4z"></path><path d="M10 6v12"></path></svg>',
      send: '<svg viewBox="0 0 24 24"><path d="M21 3L10 14"></path><path d="M21 3l-7 18-4-7-7-4 18-7z"></path></svg>',
      open: '<svg viewBox="0 0 24 24"><path d="M4 8l8 6 8-6"></path><path d="M4 8v10h16V8"></path><path d="M4 8l8-5 8 5"></path></svg>',
      click: '<svg viewBox="0 0 24 24"><path d="M8 3l7 18 2-7 4-2L8 3z"></path><path d="M13 13l5 5"></path></svg>',
      sync: '<svg viewBox="0 0 24 24"><path d="M20 7h-5a6 6 0 0 0-10 3"></path><path d="M4 17h5a6 6 0 0 0 10-3"></path><path d="M20 7l-3-3"></path><path d="M4 17l3 3"></path></svg>',
      chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M12 16V8"></path><path d="M16 16v-7"></path></svg>',
      users: '<svg viewBox="0 0 24 24"><path d="M16 11a4 4 0 1 0-8 0"></path><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
      sequence: '<svg viewBox="0 0 24 24"><path d="M6 6h12v4H6z"></path><path d="M6 14h12v4H6z"></path><path d="M12 10v4"></path></svg>'
    };

    return icons[name] || icons.campaign;
  }

  document.addEventListener("DOMContentLoaded", initPublicidadInterna_);
  document.addEventListener("sazzu:page:load", initPublicidadInterna_);
  window.addEventListener("load", initPublicidadInterna_);

  window.setTimeout(initPublicidadInterna_, 80);
  window.setTimeout(initPublicidadInterna_, 350);

  window.PublicidadInternaMount = initPublicidadInterna_;
})();

/* ============================================================
FIN - Publicidad Interna · Protocol Data
============================================================ */