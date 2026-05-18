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

  /* INICIO · Configuración tabla inteligente · Publicidad Interna */
  const PI_TABLE_STORAGE_KEY = "sazzu.publicidadInterna.tableConfig.v1";

  const PI_TABLE_COLUMNS = [
    {
      id: "select",
      label: "",
      width: 46,
      minWidth: 42,
      maxWidth: 70,
      locked: true,
      draggable: false,
      resizable: false,
      freezeable: false
    },
    {
      id: "entrega",
      label: "Entrega",
      icon: "sync",
      width: 82,
      minWidth: 68,
      maxWidth: 120,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "campania",
      label: "Campaña",
      icon: "campaign",
      width: 360,
      minWidth: 220,
      maxWidth: 620,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "objetivo",
      label: "Objetivo",
      icon: "list",
      width: 140,
      minWidth: 100,
      maxWidth: 240,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "estado",
      label: "Estado",
      icon: "check",
      width: 150,
      minWidth: 110,
      maxWidth: 260,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "destino",
      label: "Destino Brevo",
      icon: "send",
      width: 240,
      minWidth: 160,
      maxWidth: 420,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "sincronizados",
      label: "Sincronizados",
      icon: "users",
      width: 140,
      minWidth: 110,
      maxWidth: 220,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "errores",
      label: "Errores",
      icon: "sync",
      width: 110,
      minWidth: 90,
      maxWidth: 180,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "progreso",
      label: "Progreso",
      icon: "sequence",
      width: 160,
      minWidth: 120,
      maxWidth: 260,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "trabajo",
      label: "Trabajo",
      icon: "check",
      width: 140,
      minWidth: 110,
      maxWidth: 220,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "ultima",
      label: "Última ejecución",
      icon: "open",
      width: 170,
      minWidth: 130,
      maxWidth: 260,
      draggable: true,
      resizable: true,
      freezeable: true
    },
    {
      id: "accion",
      label: "Acción",
      icon: "open",
      width: 130,
      minWidth: 110,
      maxWidth: 180,
      draggable: true,
      resizable: true,
      freezeable: true
    }
  ];
  /* FIN · Configuración tabla inteligente · Publicidad Interna */

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

    audienceDropdownOpen: false,
    audienceSearch: "",
    audienceSort: "recent",

    loadingAudienceSets: false,
    audienceSetsError: "",
    audienceSetsRequested: false,

    brevoDestinations: [],
    selectedBrevoDestinationId: "",
    brevoDestinationDropdownOpen: false,
    brevoDestinationSearch: "",
    loadingBrevoDestinations: false,
    brevoDestinationsError: "",
    brevoDestinationsRequested: false,

    adminTopbar: null,
    adminTabs: [],
    adminOperators: [],
    activeAdminTab: "campanias",
    selectedOperatorCode: "OP_PI_001",
    operatorDropdownOpen: false,
    selectedCampaignIds: [],
    dateRange: "todo",
    loadingAdminContext: false,
    adminContextError: "",

    tableConfig: null,
    tableDragColumnId: "",
    tableResize: null
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
    <!-- INICIO · Administrador Publicidad Interna -->
    <header class="piAdminTopbar">
      <div class="piAdminTopbar__left">
        <div class="piAdminBrand">
          <div class="piEyebrow">Motores de crecimiento</div>
          <h1 class="piTitle">Publicidad Interna</h1>
        </div>

        <div class="piOperator" data-pi-operator>
          <button class="piOperator__trigger" type="button" data-pi-operator-trigger>
            <span class="piOperator__avatar piOperator__avatar--azul" data-pi-operator-avatar>1</span>
            <span class="piOperator__copy">
              <strong data-pi-operator-name>Usuario 1</strong>
              <small data-pi-operator-role>operador_publicidad</small>
            </span>
            <span class="piOperator__chevron">⌄</span>
          </button>

          <div class="piOperator__dropdown" data-pi-operator-dropdown></div>
        </div>
      </div>

      <div class="piAdminTopbar__right">
        <div class="piAdminRefreshState">
          <span data-pi-admin-updated>Actualizado desde Supabase</span>
          <small data-pi-admin-updated-detail>Sincronización operativa</small>
        </div>

        <button class="piBtn piBtn--ghost" type="button" data-pi-refresh-admin>
          <span class="piBtn__icon" aria-hidden="true">${icon_("sync")}</span>
          <span>Actualizar</span>
        </button>

        <button class="piBtn piBtn--primary" type="button" data-pi-review-drafts>
          <span>Revisar cambios</span>
          <strong data-pi-review-count>0</strong>
        </button>

        <span class="piAdminAvatar piAdminAvatar--azul" data-pi-admin-avatar>1</span>
      </div>
    </header>

    <section class="piAdminSegments" aria-label="Segmentos operativos">
    <div class="piAdminSegments__left">
      <button class="piSegment is-active" type="button" data-pi-filter="todas">
        <span>${icon_("list")}</span>
        <strong>Todos</strong>
      </button>

      <button class="piSegment" type="button" data-pi-filter="ejecucion">
        <span>${icon_("sync")}</span>
        <strong>Con ejecución</strong>
      </button>

      <button class="piSegment" type="button" data-pi-filter="acciones">
        <span>${icon_("open")}</span>
        <strong>Acciones requeridas</strong>
      </button>

      <button class="piSegment" type="button" data-pi-filter="activa">
        <span>${icon_("campaign")}</span>
        <strong>Activas</strong>
      </button>

      <button class="piSegment" type="button" data-pi-filter="borrador">
        <span>${icon_("check")}</span>
        <strong>Borradores</strong>
      </button>

      <button class="piSegment" type="button" data-pi-filter="error">
        <span>${icon_("sync")}</span>
        <strong>Errores</strong>
      </button>
    </div>

    <button class="piCreateViewBtn" type="button" data-pi-admin-disabled="vista">
      <span aria-hidden="true">${icon_("sequence")}</span>
      <strong>Crear vista</strong>
    </button>
  </section>

    <section class="piAdminSearchPanel">
      <label class="piAdminSearch" aria-label="Buscar campaña, conjunto o contenido">
        <span class="piAdminSearch__icon" aria-hidden="true">
          ${icon_("search")}
        </span>
        <input type="search" placeholder="Buscar por campaña, lista Brevo, estado, objetivo o conjunto..." data-pi-search>
      </label>
    </section>

    <section class="piAdminWorkspace">
      <div class="piAdminTabsRow">
        <div class="piAdminTabs" data-pi-admin-tabs>
          <button class="piAdminTab is-active" type="button" data-pi-admin-tab="campanias">
            <strong>Campañas</strong>
            <small>0</small>
          </button>

          <button class="piAdminTab" type="button" data-pi-admin-tab="conjuntos">
            <strong>Conjuntos de audiencia</strong>
            <small>0</small>
          </button>

          <button class="piAdminTab" type="button" data-pi-admin-tab="contenidos">
            <strong>Contenidos</strong>
            <small>0</small>
          </button>
        </div>

        <select class="piAdminDateRange" data-pi-date-range>
          <option value="todo">Todo el historial</option>
          <option value="hoy">Hoy</option>
          <option value="7d">Últimos 7 días</option>
          <option value="mes">Este mes</option>
        </select>
      </div>

      <div class="piAdminActionBar">
        <button class="piBtn piBtn--primary" type="button" data-pi-open-slide="new">
          <span class="piBtn__icon" aria-hidden="true">${icon_("plus")}</span>
          <span>Crear campaña</span>
        </button>

        <button class="piBtn piBtn--ghost" type="button" data-pi-admin-disabled="duplicar">
          Duplicar
        </button>

        <button class="piBtn piBtn--ghost" type="button" data-pi-admin-disabled="pausar">
          Pausar
        </button>

        
      </div>

      <!-- INICIO · KPIs Publicidad Interna -->
      <section class="piKpiGrid" data-pi-kpis aria-label="Resumen de Publicidad Interna"></section>
      <!-- FIN · KPIs Publicidad Interna -->

      <!-- INICIO · Listado campañas / tabs -->
      <section class="piCampaignList" data-pi-campaigns aria-label="Administrador de campañas internas"></section>
      <!-- FIN · Listado campañas / tabs -->
    </section>
    <!-- FIN · Administrador Publicidad Interna -->

      <!-- INICIO · Layer slides Publicidad Interna -->
      <div class="piSlideLayer" data-pi-slide-layer aria-hidden="true">
        <button class="piSlideBackdrop" type="button" data-pi-close-slide aria-label="Cerrar panel lateral"></button>

        <!-- INICIO · Slide Nueva campaña -->
        <aside class="piSlide piCampaignBuilderSlide" data-pi-slide="new" aria-label="Nueva campaña interna">
          <div class="piSlide__header piCampaignBuilderHeader">
            <div>
              <div class="piSlide__eyebrow">Constructor operativo</div>
              <h2 class="piSlide__title">Crear campaña interna</h2>
              <p class="piCampaignBuilderHeader__sub">
                Configurá públicos, destino Brevo y reglas operativas antes de guardar el borrador.
              </p>
            </div>

            <div class="piCampaignBuilderHeader__right">
              <span class="piBuilderStatus piBuilderStatus--draft">Borrador</span>
              <button class="piSlide__close" type="button" data-pi-close-slide aria-label="Cerrar">
                ${icon_("close")}
              </button>
            </div>
          </div>

          <div class="piSlide__body piCampaignBuilderBody">
            <form class="piForm piCampaignBuilderForm" data-pi-new-form>
              <div class="piCampaignBuilderGrid">

                <!-- INICIO · Columna izquierda configuración -->
                <div class="piCampaignBuilderMain">

                  <section class="piBuilderSection">
                    <div class="piBuilderSection__head">
                      <span class="piMiniIcon" aria-hidden="true">
                        ${icon_("list")}
                      </span>
                      <div>
                        <h3>Identidad de campaña</h3>
                        <p>Definí cómo se identifica la campaña dentro de Protocol Data.</p>
                      </div>
                    </div>

                    <div class="piBuilderFields">
                      <label class="piField">
                        <span>Nombre de campaña</span>
                        <input
                          type="text"
                          value="Recompra Pack Camping"
                          placeholder="Ej: Recompra Pack Camping"
                          data-pi-campaign-name
                        >
                      </label>

                      <label class="piField">
                        <span>Descripción interna</span>
                        <textarea
                          rows="3"
                          placeholder="Describe brevemente para qué sirve esta campaña."
                          data-pi-campaign-description
                        >Campaña interna creada desde Protocol Data.</textarea>
                      </label>

                      <div class="piFieldGrid">
                        <label class="piField">
                          <span>Objetivo</span>
                          <select data-pi-campaign-objective>
                            <option value="recompra">Recompra</option>
                            <option value="cross_sell">Venta cruzada</option>
                            <option value="reactivacion">Reactivación</option>
                            <option value="postventa">Postventa</option>
                            <option value="publicidad_interna">Publicidad interna</option>
                          </select>
                        </label>

                        <label class="piField">
                          <span>Canal</span>
                          <select data-pi-campaign-channel>
                            <option value="email">Email</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="sms">SMS</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class="piBuilderSection">
                    <div class="piBuilderSection__head piBuilderSection__head--withHelp">
                      <span class="piMiniIcon" aria-hidden="true">
                        ${icon_("users")}
                      </span>

                      <div>
                        <h3>Conjuntos de audiencia</h3>
                        <p>Seleccioná los públicos que participarán en la campaña.</p>
                      </div>

                      <div class="piAudienceHelp">
                        <button type="button" class="piAudienceHelp__btn" aria-label="Ayuda sobre selección de conjuntos">
                          ?
                        </button>

                        <div class="piAudienceHelp__tooltip" role="tooltip">
                          <strong>Selección de conjuntos</strong>
                          <p>
                            Para seleccionar un conjunto de audiencias, primero debe existir al menos uno creado y disponible desde Publicidad UTM.
                            Podés combinar varios conjuntos en una misma campaña; luego Make/Brevo usará esa selección para sincronizar los contactos del flujo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="piAudienceMockList" data-pi-audiences-list>
                      <div class="piEmpty">
                        <strong>Cargando conjuntos disponibles...</strong>
                        <p>Supabase está preparando los conjuntos creados desde Publicidad UTM.</p>
                      </div>
                    </div>
                  </section>

                  <!-- INICIO · Destino Brevo -->
                  <section class="piBuilderSection">
                    <div class="piBuilderSection__head">
                      <span class="piMiniIcon" aria-hidden="true">
                        ${icon_("send")}
                      </span>
                      <div>
                        <h3>Destino Brevo</h3>
                        <p>Seleccioná la lista, automatización o ruta de envío que ejecutará esta campaña.</p>
                      </div>
                    </div>

                    <div class="piField">
                      <span>Ruta de envío</span>
                      <div data-pi-brevo-destination-picker-shell>
                        <div class="piEmpty">
                          <strong>Cargando destinos Brevo...</strong>
                          <p>Consultando rutas disponibles desde Supabase.</p>
                        </div>
                      </div>
                    </div>

                    <div data-pi-brevo-destination-detail>
                      <div class="piEmpty">
                        <strong>Seleccioná un destino Brevo.</strong>
                        <p>Protocol Data usará este destino para indicar a Make/Brevo dónde sincronizar los contactos.</p>
                      </div>
                    </div>

                    <div class="piBrevoManagedNotice">
                      <span class="piBrevoManagedNotice__icon" aria-hidden="true">
                        ${icon_("send")}
                      </span>

                      <div>
                        <strong>Contenido gestionado desde Brevo</strong>
                        <p>
                          Protocol Data selecciona públicos y rutas de ejecución. El asunto, plantilla, contenido,
                          demoras y automatización final se editan directamente dentro de Brevo.
                        </p>
                      </div>
                    </div>
                  </section>
                  <!-- FIN · Destino Brevo -->

                </div>
                <!-- FIN · Columna izquierda configuración -->

                <!-- INICIO · Columna derecha control operativo -->
                <aside class="piCampaignBuilderSide">
                  <div class="piCampaignBuilderSide__sticky">

                    <section class="piBuilderPanel" data-pi-campaign-builder-summary>
                      <div class="piBuilderPanel__head">
                        <span class="piMiniIcon" aria-hidden="true">
                          ${icon_("check")}
                        </span>
                        <div>
                          <h3>Resumen operativo</h3>
                          <p>Seleccioná públicos y destino para construir la lectura previa.</p>
                        </div>
                      </div>

                      <div class="piBuilderSummarySkeleton">
                        <strong>Campaña en preparación</strong>
                        <p>El resumen se actualizará cuando selecciones conjuntos y destino Brevo.</p>
                      </div>
                    </section>

                    <section class="piBuilderPanel">
                      <div class="piBuilderPanel__head">
                        <span class="piMiniIcon" aria-hidden="true">
                          ${icon_("sequence")}
                        </span>
                        <div>
                          <h3>Reglas de presión comercial</h3>
                          <p>Preparado para la siguiente fase de idempotencia y control de repetición.</p>
                        </div>
                      </div>

                      <div class="piBuilderRuleList">
                        <div class="piBuilderRule is-pending">
                          <strong>No duplicar contactos</strong>
                          <span>Próxima fase</span>
                        </div>

                        <div class="piBuilderRule is-pending">
                          <strong>Prioridad entre conjuntos</strong>
                          <span>Próxima fase</span>
                        </div>

                        <div class="piBuilderRule is-pending">
                          <strong>Ventana de no repetición</strong>
                          <span>Próxima fase</span>
                        </div>
                      </div>
                    </section>

                    <section class="piBuilderPanel">
                      <div class="piBuilderPanel__head">
                        <span class="piMiniIcon" aria-hidden="true">
                          ${icon_("open")}
                        </span>
                        <div>
                          <h3>Responsabilidad del contenido</h3>
                          <p>Protocol Data gobierna públicos y rutas; Brevo gobierna correo y automatización.</p>
                        </div>
                      </div>

                      <div class="piBuilderOwnership">
                        <div>
                          <strong>Protocol Data</strong>
                          <span>Audiencias, conjuntos, destino, publicación y sincronización.</span>
                        </div>

                        <div>
                          <strong>Brevo</strong>
                          <span>Plantilla, asunto, contenido, delays y automatización.</span>
                        </div>
                      </div>
                    </section>

                  </div>
                </aside>
                <!-- FIN · Columna derecha control operativo -->

              </div>

              <div class="piSlide__footer piCampaignBuilderFooter">
                <button class="piBtn piBtn--ghost" type="button" data-pi-close-slide>Cancelar</button>
                <button class="piBtn piBtn--primary" type="submit" data-pi-builder-save-draft disabled>
  <span class="piBtn__icon" aria-hidden="true">
    ${icon_("check")}
  </span>
  <span data-pi-builder-save-label>Completar requisitos</span>
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

    initCampaignTableConfig_();

    document.body.setAttribute("data-page", "publicidadinterna");

    ensurePublicidadInternaShell_(root);

    bindEvents_(root);

    if (!STATE.campaigns.length) {
      STATE.campaigns = FALLBACK_CAMPAIGNS.slice();
    }

    render_(root);

    if (root.dataset.piDataRequested !== "1") {
      root.dataset.piDataRequested = "1";
      loadPublicidadInternaAdminContext_(root);
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

      const refreshBtn = event.target.closest("[data-pi-refresh-admin]");
      if (refreshBtn) {
        event.preventDefault();
        loadPublicidadInternaAdminContext_(root);
        loadCampaniasDesdeSupabase_(root);
        showToast_(root, "Actualizando administrador desde Supabase.");
        return;
      }

      const reviewBtn = event.target.closest("[data-pi-review-drafts]");
      if (reviewBtn) {
        event.preventDefault();

        STATE.filter = "borrador";

        root.querySelectorAll("[data-pi-filter]").forEach(function (btn) {
          btn.classList.toggle("is-active", btn.dataset.piFilter === "borrador");
        });

        renderCampaigns_(root);
        showToast_(root, "Mostrando campañas en borrador.");
        return;
      }

      const tabBtn = event.target.closest("[data-pi-admin-tab]");
      if (tabBtn) {
        event.preventDefault();

        STATE.activeAdminTab = tabBtn.dataset.piAdminTab || "campanias";

        root.querySelectorAll("[data-pi-admin-tab]").forEach(function (btn) {
          btn.classList.toggle("is-active", btn === tabBtn);
        });

        renderCampaigns_(root);
        return;
      }

      const operatorTrigger = event.target.closest("[data-pi-operator-trigger]");
      if (operatorTrigger) {
        event.preventDefault();
        STATE.operatorDropdownOpen = !STATE.operatorDropdownOpen;
        renderAdminOperator_(root);
        return;
      }

      const operatorPick = event.target.closest("[data-pi-operator-pick]");
      if (operatorPick) {
        event.preventDefault();

        STATE.selectedOperatorCode = String(operatorPick.dataset.piOperatorPick || "OP_PI_001");
        STATE.operatorDropdownOpen = false;

        renderAdminTopbar_(root);
        renderAdminOperator_(root);
        showToast_(root, "Operador visual actualizado.");
        return;
      }


      const freezeColumnBtn = event.target.closest("[data-pi-freeze-column]");
      if (freezeColumnBtn) {
        event.preventDefault();
        event.stopPropagation();

        const columnId = String(freezeColumnBtn.dataset.piFreezeColumn || "").trim();
        toggleFrozenColumn_(columnId);

        renderCampaigns_(root);
        showToast_(root, "Columnas fijas actualizadas.");
        return;
      }


      const disabledAdminBtn = event.target.closest("[data-pi-admin-disabled]");
      if (disabledAdminBtn) {
        event.preventDefault();
        showToast_(root, "Acción preparada para una fase posterior.");
        return;
      }

      const openSlideBtn = event.target.closest("[data-pi-open-slide]");
      if (openSlideBtn) {
        const slideName = openSlideBtn.dataset.piOpenSlide || "";

        openSlide_(root, slideName);

        if (slideName === "new") {
          loadConjuntosDisponiblesDesdeSupabase_(root);
          loadBrevoDestinosDisponiblesDesdeSupabase_(root);
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

      const publishBtn = event.target.closest("[data-pi-publish-campaign]");
      if (publishBtn) {
        publicarCampaniaInterna_(root, publishBtn.dataset.piPublishCampaign, publishBtn);
        return;
      }

      const audienceTrigger = event.target.closest("[data-pi-audience-trigger]");
      if (audienceTrigger) {
        event.preventDefault();
        STATE.audienceDropdownOpen = !STATE.audienceDropdownOpen;
        renderConjuntosDisponibles_(root);
        return;
      }

      const audienceSortBtn = event.target.closest("[data-pi-audience-sort]");
      if (audienceSortBtn) {
        event.preventDefault();
        STATE.audienceSort = audienceSortBtn.dataset.piAudienceSort || "recent";
        STATE.audienceDropdownOpen = true;
        renderConjuntosDisponibles_(root);
        renderCampaignBuilderSummary_(root);
        return;
      }

      const audiencePickBtn = event.target.closest("[data-pi-audience-pick]");
      if (audiencePickBtn) {
        event.preventDefault();

        const id = String(audiencePickBtn.dataset.piAudiencePick || "").trim();
        if (!id) return;

        if (STATE.selectedAudienceSetIds.includes(id)) {
          STATE.selectedAudienceSetIds = STATE.selectedAudienceSetIds.filter(function (item) {
            return item !== id;
          });
        } else {
          STATE.selectedAudienceSetIds.push(id);
        }

        STATE.audienceDropdownOpen = true;
        renderConjuntosDisponibles_(root);
        renderCampaignBuilderSummary_(root);
        return;
      }

      const audienceRemoveBtn = event.target.closest("[data-pi-audience-remove]");
      if (audienceRemoveBtn) {
        event.preventDefault();

        const id = String(audienceRemoveBtn.dataset.piAudienceRemove || "").trim();
        STATE.selectedAudienceSetIds = STATE.selectedAudienceSetIds.filter(function (item) {
          return item !== id;
        });

        renderConjuntosDisponibles_(root);
        renderCampaignBuilderSummary_(root);
        return;
      }

      const audienceClearBtn = event.target.closest("[data-pi-audience-clear]");
      if (audienceClearBtn) {
        event.preventDefault();

        STATE.selectedAudienceSetIds = [];
        renderConjuntosDisponibles_(root);
        renderCampaignBuilderSummary_(root);
        return;
      }

      const brevoTrigger = event.target.closest("[data-pi-brevo-destination-trigger]");
      if (brevoTrigger) {
        event.preventDefault();
        STATE.brevoDestinationDropdownOpen = !STATE.brevoDestinationDropdownOpen;
        renderBrevoDestinos_(root);
        return;
      }

      const brevoPickBtn = event.target.closest("[data-pi-brevo-destination-pick]");
      if (brevoPickBtn) {
        event.preventDefault();

        STATE.selectedBrevoDestinationId = String(brevoPickBtn.dataset.piBrevoDestinationPick || "").trim();
        STATE.brevoDestinationDropdownOpen = false;

        applyBrevoDestinoDefaults_(root);
        renderBrevoDestinos_(root);
        renderBrevoDestinoDetalle_(root);
        renderCampaignBuilderSummary_(root);
        return;
      }

      const brevoCreateBtn = event.target.closest("[data-pi-brevo-create-destination]");
      if (brevoCreateBtn) {
        event.preventDefault();
        showToast_(root, "Próximo paso: crear nueva lista Brevo desde Protocol Data.");
        return;
      }

      if (STATE.audienceDropdownOpen && !event.target.closest("[data-pi-audience-picker]")) {
        STATE.audienceDropdownOpen = false;
        renderConjuntosDisponibles_(root);
      }

      if (STATE.brevoDestinationDropdownOpen && !event.target.closest("[data-pi-brevo-destination-picker]")) {
        STATE.brevoDestinationDropdownOpen = false;
        renderBrevoDestinos_(root);
      }

      const mockActionBtn = event.target.closest("[data-pi-mock-action]");
      if (mockActionBtn) {
        showToast_(root, "Acción visual preparada. Todavía no conecta con Supabase.");
      }
    });



    /* INICIO · Eventos tabla inteligente · Publicidad Interna */
    root.addEventListener("mousedown", function (event) {
      const columnResize = event.target.closest("[data-pi-resize-column]");
      if (columnResize) {
        event.preventDefault();
        event.stopPropagation();

        startColumnResize_(root, columnResize.dataset.piResizeColumn, event);
        return;
      }

      const rowResize = event.target.closest("[data-pi-resize-rows]");
      if (rowResize) {
        event.preventDefault();
        event.stopPropagation();

        startRowResize_(root, event);
      }
    });

    root.addEventListener("dragstart", function (event) {
      const header = event.target.closest("[data-pi-column-drag]");
      if (!header) return;

      const columnId = String(header.dataset.piColumnDrag || "").trim();
      const column = getTableColumnById_(columnId);

      if (!column || column.draggable === false) {
        event.preventDefault();
        return;
      }

      STATE.tableDragColumnId = columnId;
      header.classList.add("is-dragging");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", columnId);
      }
    });

    root.addEventListener("dragover", function (event) {
      const header = event.target.closest("[data-pi-column-drag]");
      if (!header || !STATE.tableDragColumnId) return;

      event.preventDefault();

      root.querySelectorAll(".piTableHeadCell.is-drag-over").forEach(function (node) {
        node.classList.remove("is-drag-over");
      });

      header.classList.add("is-drag-over");
    });

    root.addEventListener("dragleave", function (event) {
      const header = event.target.closest("[data-pi-column-drag]");
      if (!header) return;

      header.classList.remove("is-drag-over");
    });

    root.addEventListener("drop", function (event) {
      const header = event.target.closest("[data-pi-column-drag]");
      if (!header || !STATE.tableDragColumnId) return;

      event.preventDefault();

      const targetColumnId = String(header.dataset.piColumnDrag || "").trim();

      moveTableColumn_(STATE.tableDragColumnId, targetColumnId);

      STATE.tableDragColumnId = "";

      root.querySelectorAll(".piTableHeadCell.is-dragging, .piTableHeadCell.is-drag-over").forEach(function (node) {
        node.classList.remove("is-dragging", "is-drag-over");
      });

      renderCampaigns_(root);
      showToast_(root, "Columna reordenada.");
    });

    root.addEventListener("dragend", function () {
      STATE.tableDragColumnId = "";

      root.querySelectorAll(".piTableHeadCell.is-dragging, .piTableHeadCell.is-drag-over").forEach(function (node) {
        node.classList.remove("is-dragging", "is-drag-over");
      });
    });
    /* FIN · Eventos tabla inteligente · Publicidad Interna */


                /* INICIO · Selectores con búsqueda · Publicidad Interna */
                root.addEventListener("input", function (event) {
                  const builderInput = event.target.closest("[data-pi-campaign-name], [data-pi-campaign-description]");
                  if (builderInput) {
                    renderCampaignBuilderSummary_(root);
                  }
                  const audienceSearchInput = event.target.closest("[data-pi-audience-search]");
                  if (audienceSearchInput) {
                    STATE.audienceSearch = String(audienceSearchInput.value || "");
                    STATE.audienceDropdownOpen = true;
        
                    renderConjuntosDisponibles_(root);
        
                    const nextInput = root.querySelector("[data-pi-audience-search]");
                    if (nextInput) {
                      nextInput.focus();
                      const len = nextInput.value.length;
                      try {
                        nextInput.setSelectionRange(len, len);
                      } catch (error) {}
                    }
        
                    return;
                  }
        
                  const brevoSearchInput = event.target.closest("[data-pi-brevo-destination-search]");
                  if (brevoSearchInput) {
                    STATE.brevoDestinationSearch = String(brevoSearchInput.value || "");
                    STATE.brevoDestinationDropdownOpen = true;
        
                    renderBrevoDestinos_(root);
        
                    const nextInput = root.querySelector("[data-pi-brevo-destination-search]");
                    if (nextInput) {
                      nextInput.focus();
                      const len = nextInput.value.length;
                      try {
                        nextInput.setSelectionRange(len, len);
                      } catch (error) {}
                    }
                  }
                });
                /* FIN · Selectores con búsqueda · Publicidad Interna */

        /* INICIO · Selección de conjuntos y destino Brevo · Publicidad Interna */
        root.addEventListener("change", function (event) {
          const builderSelect = event.target.closest("[data-pi-campaign-objective], [data-pi-campaign-channel]");
          if (builderSelect) {
            renderCampaignBuilderSummary_(root);
            return;
          }

          const selectAllCampaigns = event.target.closest("[data-pi-select-all-campaigns]");
          if (selectAllCampaigns) {
            const visibleCampaigns = getFilteredCampaigns_();

            STATE.selectedCampaignIds = selectAllCampaigns.checked
              ? visibleCampaigns.map(function (campaign) {
                  return campaign.id;
                })
              : [];

            renderCampaigns_(root);
            return;
          }

          const campaignCheckbox = event.target.closest("[data-pi-select-campaign]");
          if (campaignCheckbox) {
            const id = String(campaignCheckbox.value || "").trim();

            if (!id) return;

            if (campaignCheckbox.checked) {
              if (!STATE.selectedCampaignIds.includes(id)) {
                STATE.selectedCampaignIds.push(id);
              }
            } else {
              STATE.selectedCampaignIds = STATE.selectedCampaignIds.filter(function (item) {
                return item !== id;
              });
            }

            renderCampaigns_(root);
            return;
          }

          const audienceCheckbox = event.target.closest("[data-pi-audience-checkbox]");
          if (audienceCheckbox) {
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
    
            applyBrevoDestinoDefaults_(root);
            renderBrevoDestinoDetalle_(root);
            renderCampaignBuilderSummary_(root);
            return;
          }
    
          const brevoSelect = event.target.closest("[data-pi-brevo-destination-select]");
          if (brevoSelect) {
            STATE.selectedBrevoDestinationId = String(brevoSelect.value || "").trim();
    
            applyBrevoDestinoDefaults_(root);
            renderBrevoDestinoDetalle_(root);
            return;
          }
        });
        /* FIN · Selección de conjuntos y destino Brevo · Publicidad Interna */

    const searchInput = root.querySelector("[data-pi-search]");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        STATE.search = searchInput.value.trim().toLowerCase();
        renderCampaigns_(root);
      });
    }

    const newForm = root.querySelector("[data-pi-new-form]");
    if (newForm) {
      newForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        await guardarCampaniaInternaBorrador_(root, newForm);
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
    renderAdminTopbar_(root);
    renderAdminTabs_(root);
    renderKpis_(root);
    renderCampaigns_(root);
    renderCampaignBuilderSummary_(root);
  }


    /* INICIO · Administrador visual · Publicidad Interna */
    async function loadPublicidadInternaAdminContext_(root) {
      if (!root) return;

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
        STATE.adminContextError = "Falta configurar Supabase URL o publishable key.";
        renderAdminTopbar_(root);
        renderAdminTabs_(root);
        return;
      }

      STATE.loadingAdminContext = true;
      STATE.adminContextError = "";

      try {
        const headers = {
          "apikey": key,
          "Authorization": "Bearer " + key,
          "Accept": "application/json"
        };

        const topbarEndpoint = [
          url,
          "/rest/v1/vista_publicidad_interna_topbar_operativa",
          "?select=*",
          "&limit=1"
        ].join("");

        const tabsEndpoint = [
          url,
          "/rest/v1/vista_publicidad_interna_tabs_resumen",
          "?select=*"
        ].join("");

        const operatorsEndpoint = [
          url,
          "/rest/v1/pi_publicidad_operadores",
          "?select=*",
          "&estado=eq.activo",
          "&order=codigo_operador.asc"
        ].join("");

        const responses = await Promise.all([
          fetch(topbarEndpoint, { method: "GET", headers: headers }),
          fetch(tabsEndpoint, { method: "GET", headers: headers }),
          fetch(operatorsEndpoint, { method: "GET", headers: headers })
        ]);

        for (let i = 0; i < responses.length; i += 1) {
          if (!responses[i].ok) {
            const text = await responses[i].text();
            throw new Error("HTTP " + responses[i].status + " · " + text);
          }
        }

        const topbarRows = await responses[0].json();
        const tabRows = await responses[1].json();
        const operatorRows = await responses[2].json();

        STATE.adminTopbar = Array.isArray(topbarRows) && topbarRows.length
          ? normalizeAdminTopbar_(topbarRows[0])
          : null;

        STATE.adminTabs = Array.isArray(tabRows)
          ? tabRows.map(normalizeAdminTab_)
          : [];

        STATE.adminOperators = Array.isArray(operatorRows)
          ? operatorRows.map(normalizeAdminOperator_)
          : [];

        if (STATE.adminTopbar && STATE.adminTopbar.codigoOperador) {
          STATE.selectedOperatorCode = STATE.selectedOperatorCode || STATE.adminTopbar.codigoOperador;
        }

        STATE.loadingAdminContext = false;
        STATE.adminContextError = "";

        renderAdminTopbar_(root);
        renderAdminTabs_(root);
      } catch (error) {
        STATE.loadingAdminContext = false;
        STATE.adminContextError = String(error && error.message ? error.message : error);
        console.error("[publicidadinterna] Error cargando contexto administrador:", error);

        renderAdminTopbar_(root);
        renderAdminTabs_(root);
      }
    }

    function normalizeAdminTopbar_(row) {
      return {
        operadorId: String(row.operador_id || ""),
        codigoOperador: String(row.codigo_operador || "OP_PI_001"),
        nombreOperador: String(row.nombre_operador || "Usuario 1"),
        inicialVisible: String(row.inicial_visible || "1"),
        colorToken: String(row.color_token || "azul"),
        rolOperativo: String(row.rol_operativo || "operador_publicidad"),

        campaniasTotales: toNumber_(row.campanias_totales),
        campaniasActivas: toNumber_(row.campanias_activas),
        campaniasBorrador: toNumber_(row.campanias_borrador),
        trabajosEnMovimiento: toNumber_(row.trabajos_en_movimiento),
        campaniasConError: toNumber_(row.campanias_con_error),
        cambiosParaRevisar: toNumber_(row.cambios_para_revisar),
        contactosEstimados: toNumber_(row.contactos_estimados),
        contactosSincronizados: toNumber_(row.contactos_sincronizados),
        contactosError: toNumber_(row.contactos_error),

        ultimaActualizacionOperativa: String(row.ultima_actualizacion_operativa || ""),
        consultaGeneradaEn: String(row.consulta_generada_en || ""),
        lecturaActualizacion: String(row.lectura_actualizacion || "Actualizado desde Supabase")
      };
    }

    function normalizeAdminTab_(row) {
      return {
        id: String(row.tab_id || ""),
        label: String(row.tab_label || ""),
        total: toNumber_(row.total_items),
        activos: toNumber_(row.activos),
        borradores: toNumber_(row.borradores),
        errores: toNumber_(row.errores),
        descripcion: String(row.descripcion || "")
      };
    }

    function normalizeAdminOperator_(row) {
      return {
        codigo: String(row.codigo_operador || ""),
        nombre: String(row.nombre_operador || "Usuario"),
        inicial: String(row.inicial_visible || "?"),
        color: String(row.color_token || "azul"),
        rol: String(row.rol_operativo || "operador_publicidad")
      };
    }

    function getSelectedAdminOperator_() {
      const selected = STATE.adminOperators.find(function (operator) {
        return operator.codigo === STATE.selectedOperatorCode;
      });

      if (selected) return selected;

      if (STATE.adminTopbar) {
        return {
          codigo: STATE.adminTopbar.codigoOperador,
          nombre: STATE.adminTopbar.nombreOperador,
          inicial: STATE.adminTopbar.inicialVisible,
          color: STATE.adminTopbar.colorToken,
          rol: STATE.adminTopbar.rolOperativo
        };
      }

      return {
        codigo: "OP_PI_001",
        nombre: "Usuario 1",
        inicial: "1",
        color: "azul",
        rol: "operador_publicidad"
      };
    }

    function renderAdminTopbar_(root) {
      if (!root) return;

      const operator = getSelectedAdminOperator_();
      const topbar = STATE.adminTopbar || {};
      const avatarClass = "piAdminAvatar--" + normalizeOperatorColor_(operator.color);

      const operatorName = root.querySelector("[data-pi-operator-name]");
      const operatorRole = root.querySelector("[data-pi-operator-role]");
      const operatorAvatar = root.querySelector("[data-pi-operator-avatar]");
      const adminAvatar = root.querySelector("[data-pi-admin-avatar]");
      const updated = root.querySelector("[data-pi-admin-updated]");
      const updatedDetail = root.querySelector("[data-pi-admin-updated-detail]");
      const reviewCount = root.querySelector("[data-pi-review-count]");

      if (operatorName) operatorName.textContent = operator.nombre;
      if (operatorRole) operatorRole.textContent = titleCase_(operator.rol);
      if (operatorAvatar) {
        operatorAvatar.textContent = operator.inicial;
        operatorAvatar.className = "piOperator__avatar " + avatarClass;
      }
      if (adminAvatar) {
        adminAvatar.textContent = operator.inicial;
        adminAvatar.className = "piAdminAvatar " + avatarClass;
      }

      if (updated) {
        updated.textContent = topbar.lecturaActualizacion || "Actualizado desde Supabase";
      }

      if (updatedDetail) {
        updatedDetail.textContent = topbar.ultimaActualizacionOperativa
          ? "Última ejecución: " + formatDateTime_(topbar.ultimaActualizacionOperativa)
          : "Sin ejecuciones registradas";
      }

      if (reviewCount) {
        reviewCount.textContent = formatNumber_(topbar.cambiosParaRevisar || 0);
      }

      renderAdminOperator_(root);
    }

    function renderAdminOperator_(root) {
      const dropdown = root.querySelector("[data-pi-operator-dropdown]");
      if (!dropdown) return;

      if (!STATE.operatorDropdownOpen) {
        dropdown.innerHTML = "";
        dropdown.classList.remove("is-open");
        return;
      }

      const operators = STATE.adminOperators.length
        ? STATE.adminOperators
        : [
            { codigo: "OP_PI_001", nombre: "Usuario 1", inicial: "1", color: "azul", rol: "operador_publicidad" },
            { codigo: "OP_PI_002", nombre: "Usuario 2", inicial: "2", color: "violeta", rol: "operador_publicidad" },
            { codigo: "OP_PI_003", nombre: "Usuario 3", inicial: "3", color: "verde", rol: "supervisor_publicidad" }
          ];

      dropdown.classList.add("is-open");
      dropdown.innerHTML = operators.map(function (operator) {
        const selected = operator.codigo === STATE.selectedOperatorCode;

        return [
          '<button type="button" class="piOperator__option ', selected ? "is-selected" : "", '" data-pi-operator-pick="', escapeHtml_(operator.codigo), '">',
            '<span class="piOperator__avatar piAdminAvatar--', escapeHtml_(normalizeOperatorColor_(operator.color)), '">', escapeHtml_(operator.inicial), '</span>',
            '<span>',
              '<strong>', escapeHtml_(operator.nombre), '</strong>',
              '<small>', escapeHtml_(titleCase_(operator.rol)), '</small>',
            '</span>',
          '</button>'
        ].join("");
      }).join("");
    }
    function getAdminTabIcon_(tabId) {
      const id = String(tabId || "").toLowerCase();

      if (id === "campanias") return "campaign";
      if (id === "conjuntos") return "users";
      if (id === "contenidos") return "open";

      return "list";
    }

    function renderAdminTabs_(root) {
      const node = root.querySelector("[data-pi-admin-tabs]");
      if (!node) return;

      const tabs = STATE.adminTabs.length
        ? STATE.adminTabs
        : [
            { id: "campanias", label: "Campañas", total: getCampaignSource_().length, descripcion: "Campañas internas." },
            { id: "conjuntos", label: "Conjuntos de audiencia", total: 0, descripcion: "Vista futura." },
            { id: "contenidos", label: "Contenidos", total: 0, descripcion: "Vista futura." }
          ];

            node.innerHTML = tabs.map(function (tab) {
        const active = STATE.activeAdminTab === tab.id;
        const iconName = getAdminTabIcon_(tab.id);

        return [
          '<button class="piAdminTab ', active ? "is-active" : "", '" type="button" data-pi-admin-tab="', escapeHtml_(tab.id), '" title="', escapeHtml_(tab.descripcion), '">',
            '<span class="piAdminTab__icon" aria-hidden="true">', icon_(iconName), '</span>',
            '<span class="piAdminTab__copy">',
              '<strong>', escapeHtml_(tab.label), '</strong>',
              '<small>', escapeHtml_(formatNumber_(tab.total)), '</small>',
            '</span>',
          '</button>'
        ].join("");
      }).join("");
    }

    function normalizeOperatorColor_(value) {
      const color = String(value || "azul").toLowerCase();
      if (color.includes("violeta")) return "violeta";
      if (color.includes("verde")) return "verde";
      if (color.includes("naranja")) return "naranja";
      return "azul";
    }
    /* FIN · Administrador visual · Publicidad Interna */



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
          "/rest/v1/vista_publicidad_interna_campanias_operativas",
          "?select=*",
          "&order=fecha_ultimo_trabajo.desc.nullslast,campania_id.desc"
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
        showToast_(root, "Vista operativa cargada desde Supabase.");
      } catch (error) {
        STATE.loading = false;
        STATE.error = String(error && error.message ? error.message : error);
        STATE.usingFallback = true;
        STATE.campaigns = FALLBACK_CAMPAIGNS.slice();
  
        console.error("[publicidadinterna] Error leyendo vista operativa Supabase:", error);
        render_(root);
        showToast_(root, "No se pudo leer la vista operativa. Usando respaldo visual.");
      }
    }
  
    function normalizeCampaniaDesdeSupabase_(row) {
      const campania = String(row.campania_nombre || row.campania || "Campaña sin nombre");
      const estadoOperativo = String(row.estado_operativo_panel || "configuracion_incompleta");
      const trabajoEstado = String(row.trabajo_estado || "");
      const contactosEstimados = toNumber_(row.contactos_estimados || row.miembros_estimados);
      const contactosSincronizados = toNumber_(row.contactos_sincronizados || row.enviados);
      const contactosError = toNumber_(row.contactos_error);
      const progresoSync = toNumber_(row.progreso_sync_pct);
      const brevoListaId = String(row.trabajo_brevo_lista_id || row.brevo_lista_id_destino || "").trim();
      const brevoListaNombre = String(row.brevo_lista_nombre_destino || "").trim();
  
      return {
        id: String(row.campania_id || campania),
        campania: campania,
        descripcion: String(row.campania_descripcion || row.descripcion || ""),
        objetivo: String(row.objetivo || row.brevo_objetivo_comercial || "publicidad_interna"),
        canal: String(row.canal || "email"),
        proveedor_envio: String(row.proveedor_envio || "brevo"),
  
        estado_campania: String(row.campania_estado || row.estado_campania || "borrador"),
        estado_visible: labelEstadoOperativo_(estadoOperativo, row.campania_estado || row.estado_campania),
        estado_operativo_panel: estadoOperativo,
        accion_principal_sugerida: String(row.accion_principal_sugerida || "Ver detalle"),
        lectura_rapida: String(row.lectura_operativa || row.lectura_rapida || "Campaña cargada desde Supabase."),
  
        conjuntos_asociados: toNumber_(row.conjuntos_activos || row.conjuntos_asociados),
        miembros_estimados: contactosEstimados,
        miembros_reales_activos: contactosSincronizados,
        miembros_no_disponibles: contactosError,
  
        pasos_totales: toNumber_(row.pasos_totales),
        pasos_borrador: toNumber_(row.pasos_borrador),
        pasos_activos_o_programados: toNumber_(row.pasos_activos_o_programados),
  
        trabajos_totales: toNumber_(row.trabajos_totales),
        trabajos_pendientes: toNumber_(row.trabajos_pendientes),
        trabajos_procesando: toNumber_(row.trabajos_procesando),
        trabajos_completados: toNumber_(row.trabajos_completados),
        trabajos_error: toNumber_(row.trabajos_error),
  
        trabajo_id: String(row.trabajo_id || ""),
        trabajo_estado: trabajoEstado,
        trabajo_fecha_creacion: String(row.trabajo_fecha_creacion || ""),
        trabajo_fecha_programada: String(row.trabajo_fecha_programada || ""),
        fecha_ultimo_trabajo: String(row.fecha_ultimo_trabajo || ""),
  
        brevo_destino_envio_id: String(row.brevo_destino_envio_id || ""),
        brevo_codigo_destino: String(row.brevo_codigo_destino || ""),
        brevo_nombre_destino: String(row.brevo_nombre_destino || ""),
        brevo_lista_id_destino: String(row.brevo_lista_id_destino || ""),
        brevo_lista_nombre_destino: brevoListaNombre,
        brevo_automatizacion_nombre_destino: String(row.brevo_automatizacion_nombre_destino || ""),
        brevo_trigger_destino: String(row.brevo_trigger_destino || ""),
        trabajo_brevo_lista_id: brevoListaId,
  
        contactos_estimados: contactosEstimados,
        contactos_sincronizados: contactosSincronizados,
        contactos_error: contactosError,
        progreso_sync_pct: progresoSync,
  
        enviados: contactosSincronizados,
        entregados: contactosSincronizados,
        abiertos: toNumber_(row.abiertos),
        clicks: toNumber_(row.clicks),
        rebotes: toNumber_(row.rebotes),
        desuscripciones: toNumber_(row.desuscripciones),
  
        tasa_entrega_pct: contactosEstimados ? Math.round((contactosSincronizados / contactosEstimados) * 100) : 0,
        tasa_apertura_pct: toNumber_(row.tasa_apertura_pct),
        tasa_click_pct: toNumber_(row.tasa_click_pct),
        tasa_rebote_pct: toNumber_(row.tasa_rebote_pct),
        tasa_desuscripcion_pct: toNumber_(row.tasa_desuscripcion_pct),
  
        conjuntos: [
          {
            nombre: "Conjuntos asociados",
            rol: "Principal",
            miembros_estimados: contactosEstimados,
            miembros_reales: contactosSincronizados
          }
        ],
  
        pasos: buildPasosResumen_(row)
      };
    }
  
    function labelEstadoOperativo_(estadoOperativo, estadoCampania) {
      const estado = String(estadoOperativo || "").toLowerCase();
      const campania = String(estadoCampania || "").toLowerCase();

      const map = {
        borrador: "Borrador",
        activa_sin_trabajo: "Activa · sin trabajo",
        pendiente_make: "Pendiente Make",
        procesando_make: "Procesando",
        sincronizada: "Sincronizada",
        sincronizada_con_errores: "Sincronizada con errores",
        error_make_brevo: "Error Make/Brevo",
        pausada: "Pausada",
        inactiva: "Inactiva",
        estado_no_clasificado: "Sin clasificar"
      };

      if (map[estado]) return map[estado];

      if (campania === "activa") return "Activa";
      if (campania === "borrador") return "Borrador";
      if (campania === "pausada") return "Pausada";
      if (campania === "inactiva") return "Inactiva";

      return "Borrador";
    }

    function labelTrabajoEstado_(estado) {
      const value = String(estado || "").toLowerCase();

      const map = {
        pendiente: "Pendiente",
        procesando: "Procesando",
        completado: "Completado",
        error: "Error"
      };

      return map[value] || "Sin trabajo";
    }

    function formatBrevoListCardLabel_(campaign) {
      const id = String(
        campaign.trabajo_brevo_lista_id ||
        campaign.brevo_lista_id_destino ||
        ""
      ).trim();

      const name = String(campaign.brevo_lista_nombre_destino || "").trim();

      if (id && name) return "Lista #" + id + " · " + name;
      if (id) return "Lista #" + id;
      if (name) return name;

      return "Sin lista Brevo";
    }

    /* INICIO · Motor tabla inteligente · Publicidad Interna */
    function initCampaignTableConfig_() {
      if (STATE.tableConfig) return;

      STATE.tableConfig = loadCampaignTableConfig_();
    }

    function getDefaultCampaignTableConfig_() {
      const widths = {};

      PI_TABLE_COLUMNS.forEach(function (column) {
        widths[column.id] = column.width;
      });

      return {
        columnOrder: PI_TABLE_COLUMNS.map(function (column) {
          return column.id;
        }),
        columnWidths: widths,
        frozenUntilColumnId: "",
        rowHeight: 48
      };
    }

    function loadCampaignTableConfig_() {
      const fallback = getDefaultCampaignTableConfig_();

      try {
        const raw = window.localStorage ? window.localStorage.getItem(PI_TABLE_STORAGE_KEY) : "";
        if (!raw) return fallback;

        const parsed = JSON.parse(raw);

        const next = {
          columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : fallback.columnOrder,
          columnWidths: parsed.columnWidths && typeof parsed.columnWidths === "object" ? parsed.columnWidths : fallback.columnWidths,
          frozenUntilColumnId: String(parsed.frozenUntilColumnId || ""),
          rowHeight: toNumber_(parsed.rowHeight) || fallback.rowHeight
        };

        PI_TABLE_COLUMNS.forEach(function (column) {
          if (!next.columnOrder.includes(column.id)) {
            next.columnOrder.push(column.id);
          }

          next.columnWidths[column.id] = clampNumber_(
            toNumber_(next.columnWidths[column.id]) || column.width,
            column.minWidth || 60,
            column.maxWidth || 700
          );
        });

        next.columnOrder = next.columnOrder.filter(function (columnId) {
          return !!getTableColumnById_(columnId);
        });

        next.rowHeight = clampNumber_(next.rowHeight, 38, 120);

        return next;
      } catch (error) {
        console.warn("[publicidadinterna] No se pudo leer configuración de tabla:", error);
        return fallback;
      }
    }

    function saveCampaignTableConfig_() {
      if (!STATE.tableConfig) return;

      try {
        if (window.localStorage) {
          window.localStorage.setItem(PI_TABLE_STORAGE_KEY, JSON.stringify(STATE.tableConfig));
        }
      } catch (error) {
        console.warn("[publicidadinterna] No se pudo guardar configuración de tabla:", error);
      }
    }

    function getTableColumnById_(columnId) {
      const id = String(columnId || "");
      return PI_TABLE_COLUMNS.find(function (column) {
        return column.id === id;
      }) || null;
    }

    function getOrderedTableColumns_() {
      initCampaignTableConfig_();

      return STATE.tableConfig.columnOrder
        .map(getTableColumnById_)
        .filter(Boolean);
    }

    function getTableColumnWidth_(columnId) {
      initCampaignTableConfig_();

      const column = getTableColumnById_(columnId);
      const width = toNumber_(STATE.tableConfig.columnWidths[columnId]);

      if (!column) return 120;

      return clampNumber_(width || column.width, column.minWidth || 60, column.maxWidth || 700);
    }

    function getTableRowHeight_() {
      initCampaignTableConfig_();
      return clampNumber_(toNumber_(STATE.tableConfig.rowHeight) || 48, 38, 120);
    }

    function getTableTotalWidth_(columns) {
      return columns.reduce(function (acc, column) {
        return acc + getTableColumnWidth_(column.id);
      }, 0);
    }

    function getFrozenColumnIds_() {
      initCampaignTableConfig_();

      const frozenUntil = String(STATE.tableConfig.frozenUntilColumnId || "");
      if (!frozenUntil) return [];

      const columns = getOrderedTableColumns_();
      const index = columns.findIndex(function (column) {
        return column.id === frozenUntil;
      });

      if (index < 0) return [];

      return columns.slice(0, index + 1).map(function (column) {
        return column.id;
      });
    }

    function getColumnFrozenInfo_(columnId) {
      const frozenIds = getFrozenColumnIds_();
      const id = String(columnId || "");
      const index = frozenIds.indexOf(id);

      if (index < 0) {
        return {
          frozen: false,
          edge: false,
          left: 0
        };
      }

      let left = 0;

      for (let i = 0; i < index; i += 1) {
        left += getTableColumnWidth_(frozenIds[i]);
      }

      return {
        frozen: true,
        edge: index === frozenIds.length - 1,
        left: left
      };
    }

    function buildTableCellStyle_(columnId) {
      const width = getTableColumnWidth_(columnId);
      const frozenInfo = getColumnFrozenInfo_(columnId);

      const parts = [
        "width:" + width + "px",
        "min-width:" + width + "px",
        "max-width:" + width + "px"
      ];

      if (frozenInfo.frozen) {
        parts.push("left:" + frozenInfo.left + "px");
      }

      return parts.join(";");
    }

    function toggleFrozenColumn_(columnId) {
      initCampaignTableConfig_();

      const id = String(columnId || "").trim();
      const column = getTableColumnById_(id);

      if (!column || column.freezeable === false) return;

      STATE.tableConfig.frozenUntilColumnId =
        STATE.tableConfig.frozenUntilColumnId === id ? "" : id;

      saveCampaignTableConfig_();
    }

    function moveTableColumn_(fromColumnId, toColumnId) {
      initCampaignTableConfig_();

      const fromId = String(fromColumnId || "").trim();
      const toId = String(toColumnId || "").trim();

      if (!fromId || !toId || fromId === toId) return;

      const fromColumn = getTableColumnById_(fromId);
      const toColumn = getTableColumnById_(toId);

      if (!fromColumn || !toColumn) return;
      if (fromColumn.draggable === false || toColumn.draggable === false) return;

      const order = STATE.tableConfig.columnOrder.slice();
      const fromIndex = order.indexOf(fromId);
      const toIndex = order.indexOf(toId);

      if (fromIndex < 0 || toIndex < 0) return;

      order.splice(fromIndex, 1);

      const nextTargetIndex = order.indexOf(toId);
      order.splice(nextTargetIndex, 0, fromId);

      STATE.tableConfig.columnOrder = order;

      saveCampaignTableConfig_();
    }

    function startColumnResize_(root, columnId, event) {
      initCampaignTableConfig_();

      const id = String(columnId || "").trim();
      const column = getTableColumnById_(id);

      if (!column || column.resizable === false) return;

      const startX = event.clientX;
      const startWidth = getTableColumnWidth_(id);

      document.body.classList.add("piIsResizingColumn");

      function onMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        const nextWidth = clampNumber_(
          startWidth + delta,
          column.minWidth || 60,
          column.maxWidth || 700
        );

        STATE.tableConfig.columnWidths[id] = nextWidth;
        saveCampaignTableConfig_();
        renderCampaigns_(root);
      }

      function onUp() {
        document.body.classList.remove("piIsResizingColumn");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    function startRowResize_(root, event) {
      initCampaignTableConfig_();

      const startY = event.clientY;
      const startHeight = getTableRowHeight_();

      document.body.classList.add("piIsResizingRow");

      function onMove(moveEvent) {
        const delta = moveEvent.clientY - startY;
        const nextHeight = clampNumber_(startHeight + delta, 38, 120);

        STATE.tableConfig.rowHeight = nextHeight;
        saveCampaignTableConfig_();
        renderCampaigns_(root);
      }

      function onUp() {
        document.body.classList.remove("piIsResizingRow");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    function clampNumber_(value, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return min;
      return Math.max(min, Math.min(max, number));
    }
    /* FIN · Motor tabla inteligente · Publicidad Interna */


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
      const uuid = String(row.conjunto_audiencia_id || row.id || "").trim();
      const nombre = String(row.nombre || row.nombre_conjunto || "Conjunto sin nombre").trim();

      const metadata = row && typeof row.metadata === "object" && row.metadata
        ? row.metadata
        : {};

      const miembrosActivos = toNumber_(row.miembros_activos_reales || row.miembros_actuales_count);
      const cantidadMiembros = toNumber_(row.cantidad_miembros || row.miembros_count);
      const miembros = miembrosActivos || cantidadMiembros || 0;

      const audienciasCount = toNumber_(
        row.audiencias_count ||
        row.cantidad_audiencias ||
        metadata.audiencias_count ||
        metadata.audienciasCount
      );

      const parametrosCount = toNumber_(
        row.parametros_count ||
        row.parametros_totales ||
        row.condiciones_count ||
        metadata.parametros_count ||
        metadata.parametrosTotales ||
        metadata.condiciones_count
      );

      const clasificacion = String(
        row.clasificacion ||
        row.objetivo_comercial ||
        metadata.objetivo_comercial ||
        "publicidad_interna"
      ).trim();

      return {
        id: uuid || sourceId || nombre,
        sourceId: sourceId,
        nombre: nombre,
        descripcion: String(row.descripcion || row.descripcion_conjunto || "").trim(),
        moduloOrigen: String(row.modulo_origen || "").trim(),
        clasificacion: clasificacion,
        estado: String(row.estado || "activo").trim(),

        cantidadMiembros: cantidadMiembros,
        miembrosActivos: miembrosActivos,
        miembros: miembros,

        audienciasCount: audienciasCount,
        parametrosCount: parametrosCount,

        fechaCreacion: String(row.fecha_creacion || row.created_at || "").trim(),
        fechaActualizacion: String(row.fecha_actualizacion || row.updated_at || "").trim()
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

      const selected = getSelectedAudienceSets_();
      const visible = getVisibleAudienceSets_();
      const selectedMembers = selected.reduce(function (acc, item) {
        return acc + toNumber_(item.miembros || item.miembrosActivos || item.cantidadMiembros);
      }, 0);

      node.innerHTML = [
        '<div class="piAudiencePicker ', STATE.audienceDropdownOpen ? "is-open" : "", '" data-pi-audience-picker>',

          '<button type="button" class="piAudiencePicker__trigger" data-pi-audience-trigger>',
            '<span class="piAudiencePicker__triggerIcon" aria-hidden="true">', icon_("users"), '</span>',
            '<span class="piAudiencePicker__triggerCopy">',
              '<strong>',
                selected.length
                  ? escapeHtml_(selected.length + " conjunto" + (selected.length === 1 ? " seleccionado" : "s seleccionados"))
                  : 'Seleccionar conjuntos de audiencia',
              '</strong>',
              '<small>',
                selected.length
                  ? escapeHtml_(formatNumber_(selectedMembers) + " usuarios estimados · " + selected.length + " público" + (selected.length === 1 ? "" : "s"))
                  : 'Buscá por nombre, clasificación, estado o código.',
              '</small>',
            '</span>',
            '<span class="piAudiencePicker__chevron" aria-hidden="true">⌄</span>',
          '</button>',

          STATE.audienceDropdownOpen ? [
            '<div class="piAudiencePicker__dropdown">',
              '<div class="piAudiencePicker__searchRow">',
                '<span class="piAudiencePicker__searchIcon" aria-hidden="true">', icon_("search"), '</span>',
                '<input type="search" data-pi-audience-search value="', escapeHtml_(STATE.audienceSearch || ""), '" placeholder="Buscar conjunto, clasificación o código...">',
              '</div>',

              '<div class="piAudiencePicker__sortRow" aria-label="Ordenar conjuntos">',
                renderAudienceSortButton_("recent", "Más recientes"),
                renderAudienceSortButton_("oldest", "Más antiguos"),
              '</div>',

              '<div class="piAudiencePicker__list">',
                visible.length
                  ? visible.map(renderConjuntoDisponibleDropdownItem_).join("")
                  : renderAudienceDropdownEmpty_(),
              '</div>',
            '</div>'
          ].join("") : '',

          renderSelectedAudienceSummary_(selected, selectedMembers),

        '</div>'
      ].join("");
    }

    function getSelectedAudienceSets_() {
      return STATE.selectedAudienceSetIds
        .map(function (id) {
          return STATE.audienceSets.find(function (item) {
            return item.id === id;
          }) || null;
        })
        .filter(Boolean);
    }

    function getVisibleAudienceSets_() {
      const query = String(STATE.audienceSearch || "").trim().toLowerCase();
      const sort = String(STATE.audienceSort || "recent");

      let items = STATE.audienceSets.slice();

      if (query) {
        items = items.filter(function (item) {
          return [
            item.nombre,
            item.sourceId,
            item.descripcion,
            item.estado,
            item.clasificacion,
            labelObjetivo_(item.clasificacion)
          ].join(" ").toLowerCase().includes(query);
        });
      }

      items.sort(function (a, b) {
        if (sort === "oldest") {
          return getAudienceSetSortTime_(a) - getAudienceSetSortTime_(b);
        }

        return getAudienceSetSortTime_(b) - getAudienceSetSortTime_(a);
      });

      return items;
    }

    function getAudienceSetSortTime_(item) {
      const raw = item.fechaCreacion || item.fechaActualizacion || "";
      const time = Date.parse(raw);
      return Number.isFinite(time) ? time : 0;
    }

    function isNewAudienceSet_(item) {
      const raw = item.fechaCreacion || item.fechaActualizacion || "";
      const time = Date.parse(raw);

      if (!Number.isFinite(time)) return false;

      const diffMs = Date.now() - time;
      return diffMs >= 0 && diffMs <= (48 * 60 * 60 * 1000);
    }

    function renderAudienceSortButton_(sort, label) {
      const active = String(STATE.audienceSort || "recent") === sort ? " is-active" : "";

      return [
        '<button type="button" class="piAudiencePicker__sortBtn', active, '" data-pi-audience-sort="', escapeHtml_(sort), '">',
          escapeHtml_(label),
        '</button>'
      ].join("");
    }

    function renderAudienceDropdownEmpty_() {
      return [
        '<div class="piAudiencePicker__empty">',
          '<strong>No encontramos conjuntos con ese filtro.</strong>',
          '<span>Probá buscar por clasificación, nombre, código o estado.</span>',
        '</div>'
      ].join("");
    }

    function renderConjuntoDisponibleDropdownItem_(item) {
      const selected = STATE.selectedAudienceSetIds.includes(item.id);
      const miembros = item.miembros || item.miembrosActivos || item.cantidadMiembros || 0;
      const commercialKey = normalizeCommercialKind_(item.clasificacion);
      const composition = buildAudienceCompositionLabel_(item);

      return [
        '<button type="button" class="piAudiencePicker__item ', selected ? "is-selected" : "", '" data-pi-audience-pick="', escapeHtml_(item.id), '">',

          '<span class="piAudiencePicker__itemIcon piAudiencePicker__itemIcon--', escapeHtml_(commercialKey), '" aria-hidden="true">',
            commercialIcon_(commercialKey),
          '</span>',

          '<span class="piAudiencePicker__itemMain">',
            '<span class="piAudiencePicker__itemTop">',
              '<strong>', escapeHtml_(item.nombre), '</strong>',
              isNewAudienceSet_(item) ? '<em>Nuevo</em>' : '',
            '</span>',

            '<small>',
              escapeHtml_(formatNumber_(miembros)),
              ' usuarios activos · ',
              escapeHtml_(labelObjetivo_(item.clasificacion)),
              ' · ',
              escapeHtml_(item.estado),
            '</small>',

            item.descripcion
              ? '<small class="piAudiencePicker__itemDesc">' + escapeHtml_(item.descripcion) + '</small>'
              : '',

            '<span class="piAudiencePicker__composition">',
              escapeHtml_(composition),
            '</span>',
          '</span>',

          '<span class="piAudiencePicker__itemSide">',
            renderAudienceMiniBubbles_(item),
            '<span class="piAudiencePicker__check">', selected ? "✓" : "", '</span>',
          '</span>',

        '</button>'
      ].join("");
    }

       /* INICIO · Constructor campaña · Resumen operativo */
       function getCampaignBuilderSnapshot_(root) {
        const nameInput = root.querySelector("[data-pi-campaign-name]");
        const descriptionInput = root.querySelector("[data-pi-campaign-description]");
        const objectiveSelect = root.querySelector("[data-pi-campaign-objective]");
        const channelSelect = root.querySelector("[data-pi-campaign-channel]");
  
        const campaignName = String(nameInput && nameInput.value ? nameInput.value : "").trim();
        const description = String(descriptionInput && descriptionInput.value ? descriptionInput.value : "").trim();
        const objective = String(objectiveSelect && objectiveSelect.value ? objectiveSelect.value : "recompra").trim();
        const channel = String(channelSelect && channelSelect.value ? channelSelect.value : "email").trim();
  
        const selectedAudiences = getSelectedAudienceSets_();
        const selectedMembers = selectedAudiences.reduce(function (acc, item) {
          return acc + toNumber_(item.miembros || item.miembrosActivos || item.cantidadMiembros);
        }, 0);
  
        const destino = getSelectedBrevoDestino_();
  
        const audienceKinds = selectedAudiences.map(function (item) {
          return normalizeCommercialKind_(item.clasificacion);
        });
  
        const uniqueAudienceKinds = audienceKinds.filter(function (kind, index) {
          return audienceKinds.indexOf(kind) === index;
        });
  
        const normalizedObjective = normalizeCommercialKind_(objective);
        const normalizedDestinationObjective = normalizeCommercialKind_(destino ? destino.objetivoComercial : "");
  
        return {
          campaignName: campaignName,
          description: description,
          objective: objective,
          normalizedObjective: normalizedObjective,
          channel: channel,
  
          selectedAudiences: selectedAudiences,
          selectedMembers: selectedMembers,
          uniqueAudienceKinds: uniqueAudienceKinds,
  
          destino: destino,
          normalizedDestinationObjective: normalizedDestinationObjective
        };
      }
  
      function getCampaignBuilderValidation_(root) {
        const snapshot = getCampaignBuilderSnapshot_(root);
  
        const hasName = snapshot.campaignName.length >= 4;
        const hasAudience = snapshot.selectedAudiences.length > 0;
        const hasMembers = snapshot.selectedMembers > 0;
        const hasDestination = !!snapshot.destino;
        const hasBrevoList = !!(snapshot.destino && snapshot.destino.brevoListaId);
        const destinationIsActive = !!(snapshot.destino && String(snapshot.destino.estado || "").toLowerCase() === "activo");
        const channelMatchesDestination = !snapshot.destino || !snapshot.destino.canal || snapshot.channel === snapshot.destino.canal;
        const objectiveMatchesDestination =
          !snapshot.destino ||
          !snapshot.normalizedDestinationObjective ||
          snapshot.normalizedDestinationObjective === "publicidad_interna" ||
          snapshot.normalizedObjective === snapshot.normalizedDestinationObjective;
  
        const critical = [
          {
            key: "name",
            label: "Nombre de campaña válido",
            ok: hasName,
            hint: "Usá un nombre claro para identificar la campaña en la tabla."
          },
          {
            key: "audiences",
            label: "Al menos 1 conjunto seleccionado",
            ok: hasAudience,
            hint: "La campaña necesita un público operativo."
          },
          {
            key: "destination",
            label: "Destino Brevo seleccionado",
            ok: hasDestination,
            hint: "Seleccioná la lista/ruta donde Make enviará contactos."
          },
          {
            key: "brevo_list",
            label: "Lista Brevo válida",
            ok: hasBrevoList,
            hint: "El destino debe tener un ID de lista Brevo."
          },
          {
            key: "destination_active",
            label: "Destino Brevo activo",
            ok: destinationIsActive,
            hint: "El destino debe estar activo para evitar campañas muertas."
          }
        ];
  
        const warnings = [
          {
            key: "members",
            label: "Conjuntos con contactos estimados",
            ok: hasMembers,
            hint: "La campaña puede guardarse, pero podría no sincronizar contactos."
          },
          {
            key: "channel_match",
            label: "Canal alineado con destino",
            ok: channelMatchesDestination,
            hint: "El canal elegido no coincide con el canal del destino Brevo."
          },
          {
            key: "objective_match",
            label: "Objetivo alineado con ruta Brevo",
            ok: objectiveMatchesDestination,
            hint: "El objetivo comercial no coincide con la ruta Brevo seleccionada."
          }
        ];
  
        const canSave = critical.every(function (item) {
          return item.ok;
        });
  
        return {
          snapshot: snapshot,
          critical: critical,
          warnings: warnings,
          canSave: canSave,
          pendingCritical: critical.filter(function (item) { return !item.ok; }),
          pendingWarnings: warnings.filter(function (item) { return !item.ok; })
        };
      }
  
      function renderCampaignBuilderSummary_(root) {
        if (!root) return;
  
        const node = root.querySelector("[data-pi-campaign-builder-summary]");
        if (!node) return;
  
        const validation = getCampaignBuilderValidation_(root);
        const snapshot = validation.snapshot;
        const destino = snapshot.destino;
  
        syncCampaignBuilderSubmit_(root, validation);
  
        node.innerHTML = [
          '<div class="piBuilderPanel__head">',
            '<span class="piMiniIcon" aria-hidden="true">', icon_("check"), '</span>',
            '<div>',
              '<h3>Resumen operativo</h3>',
              '<p>', validation.canSave ? 'La campaña está lista para guardarse como borrador.' : 'Completá los requisitos críticos para guardar el borrador.', '</p>',
            '</div>',
          '</div>',
  
          '<div class="piBuilderSummaryHero ', validation.canSave ? 'is-ready' : 'is-draft', '">',
            '<strong>', escapeHtml_(snapshot.campaignName || "Campaña sin nombre"), '</strong>',
            '<span>', escapeHtml_(labelObjetivo_(snapshot.objective)), ' · ', escapeHtml_(snapshot.channel.toUpperCase()), '</span>',
          '</div>',
  
          '<div class="piBuilderSummaryGrid">',
            '<div>',
              '<span>Conjuntos</span>',
              '<strong>', formatNumber_(snapshot.selectedAudiences.length), '</strong>',
            '</div>',
            '<div>',
              '<span>Contactos estimados</span>',
              '<strong>', formatNumber_(snapshot.selectedMembers), '</strong>',
            '</div>',
            '<div>',
              '<span>Lista Brevo</span>',
              '<strong>', destino && destino.brevoListaId ? '#' + escapeHtml_(destino.brevoListaId) : 'Pendiente', '</strong>',
            '</div>',
            '<div>',
              '<span>Trigger</span>',
              '<strong>', destino ? escapeHtml_(formatBrevoTrigger_(destino.triggerBrevo)) : 'Pendiente', '</strong>',
            '</div>',
          '</div>',
  
          '<div class="piBuilderValidationBlock">',
            '<div class="piBuilderValidationBlock__title">',
              '<strong>Validaciones críticas</strong>',
              '<span>', formatNumber_(validation.critical.length - validation.pendingCritical.length), '/', formatNumber_(validation.critical.length), '</span>',
            '</div>',
            '<div class="piBuilderValidation">',
              validation.critical.map(renderBuilderValidationItem_).join(""),
            '</div>',
          '</div>',
  
          '<div class="piBuilderValidationBlock">',
            '<div class="piBuilderValidationBlock__title">',
              '<strong>Alertas operativas</strong>',
              '<span>', validation.pendingWarnings.length ? formatNumber_(validation.pendingWarnings.length) + ' alerta' + (validation.pendingWarnings.length === 1 ? '' : 's') : 'Sin alertas', '</span>',
            '</div>',
            '<div class="piBuilderValidation piBuilderValidation--warnings">',
              validation.warnings.map(renderBuilderValidationItem_).join(""),
            '</div>',
          '</div>',
  
          '<div class="piBuilderTechSnapshot">',
            '<strong>Snapshot técnico</strong>',
            '<code>',
              'audiencias=', escapeHtml_(String(snapshot.selectedAudiences.length)),
              ' · miembros=', escapeHtml_(String(snapshot.selectedMembers)),
              ' · destino=', escapeHtml_(destino ? destino.codigoDestino || destino.id : 'pendiente'),
              ' · lista=', escapeHtml_(destino && destino.brevoListaId ? destino.brevoListaId : 'pendiente'),
              ' · modo=borrador',
            '</code>',
          '</div>'
        ].join("");
      }
  
      function renderBuilderValidationItem_(item) {
        return [
          '<div class="piBuilderValidation__item ', item.ok ? 'is-ok' : 'is-pending', '" title="', escapeHtml_(item.hint || ""), '">',
            '<span>', item.ok ? '✓' : '•', '</span>',
            '<strong>', escapeHtml_(item.label), '</strong>',
            item.ok ? '' : '<small>' + escapeHtml_(item.hint || '') + '</small>',
          '</div>'
        ].join("");
      }
  
      function syncCampaignBuilderSubmit_(root, validation) {
        const submitBtn = root.querySelector("[data-pi-builder-save-draft]");
        const label = root.querySelector("[data-pi-builder-save-label]");
  
        if (!submitBtn) return;
  
        submitBtn.disabled = !validation.canSave;
        submitBtn.classList.toggle("is-disabled", !validation.canSave);
  
        if (label) {
          label.textContent = validation.canSave ? "Guardar borrador" : "Completar requisitos";
        }
  
        submitBtn.title = validation.canSave
          ? "Guardar campaña como borrador."
          : "Faltan requisitos críticos para guardar el borrador.";
      }
  
      function focusCampaignBuilderFirstError_(root, validation) {
        if (!root || !validation || validation.canSave) return;
  
        const first = validation.pendingCritical[0];
  
        if (!first) return;
  
        if (first.key === "name") {
          const input = root.querySelector("[data-pi-campaign-name]");
          if (input) input.focus();
          return;
        }
  
        if (first.key === "audiences") {
          const trigger = root.querySelector("[data-pi-audience-trigger]");
          if (trigger) trigger.focus();
          return;
        }
  
        if (first.key === "destination" || first.key === "brevo_list" || first.key === "destination_active") {
          const trigger = root.querySelector("[data-pi-brevo-destination-trigger]");
          if (trigger) trigger.focus();
        }
      }
      /* FIN · Constructor campaña · Resumen operativo */

    function renderSelectedAudienceSummary_(selected, totalMembers) {
      if (!selected.length) {
        return [
          '<div class="piAudiencePicker__summary is-empty">',
            '<strong>Sin conjuntos seleccionados</strong>',
            '<span>La campaña necesita al menos un público para poder guardarse.</span>',
          '</div>'
        ].join("");
      }

      return [
        '<div class="piAudiencePicker__summary piAudiencePicker__summary--selected">',
          '<div class="piAudiencePicker__summaryHead">',
            '<strong>', escapeHtml_(selected.length + " conjunto" + (selected.length === 1 ? "" : "s") + " seleccionado" + (selected.length === 1 ? "" : "s")), '</strong>',
            '<button type="button" data-pi-audience-clear>Limpiar selección</button>',
          '</div>',

          '<div class="piAudiencePicker__selectedGrid">',
            selected.map(function (item) {
              const miembros = item.miembros || item.miembrosActivos || item.cantidadMiembros || 0;
              const subtitle = [
                formatNumber_(miembros) + " usuarios",
                labelObjetivo_(item.clasificacion),
                item.estado || "activo"
              ].filter(Boolean).join(" · ");

              return [
                '<article class="piAudiencePicker__selectedCard">',
                  '<span class="piAudiencePicker__selectedIcon piAudiencePicker__itemIcon--', escapeHtml_(normalizeCommercialKind_(item.clasificacion)), '" aria-hidden="true">',
                    commercialIcon_(normalizeCommercialKind_(item.clasificacion)),
                  '</span>',

                  '<span class="piAudiencePicker__selectedCopy">',
                    '<strong title="', escapeHtml_(item.nombre), '">', escapeHtml_(item.nombre), '</strong>',
                    '<small title="', escapeHtml_(subtitle), '">', escapeHtml_(subtitle), '</small>',
                  '</span>',

                  '<button type="button" data-pi-audience-remove="', escapeHtml_(item.id), '" aria-label="Quitar conjunto">×</button>',
                '</article>'
              ].join("");
            }).join(""),
          '</div>',

          '<p>',
            escapeHtml_(formatNumber_(totalMembers)),
            ' usuarios estimados antes de depuración Make/Brevo.',
          '</p>',
        '</div>'
      ].join("");
    }

    function buildAudienceCompositionLabel_(item) {
      const parts = [];

      if (item.audienciasCount) {
        parts.push(formatNumber_(item.audienciasCount) + " audiencias");
      }

      if (item.parametrosCount) {
        parts.push(formatNumber_(item.parametrosCount) + " parámetros");
      }

      if (!parts.length && item.sourceId) {
        parts.push("Código " + item.sourceId);
      }

      if (!parts.length) {
        parts.push("Composición disponible al ampliar la vista UTM");
      }

      return parts.join(" · ");
    }

    function renderAudienceMiniBubbles_(item) {
      const miembros = toNumber_(item.miembros || item.miembrosActivos || item.cantidadMiembros);
      const words = String(item.nombre || item.clasificacion || "U")
        .split(/\s+/)
        .map(function (word) {
          return word.replace(/[^a-zA-Z0-9ÁÉÍÓÚÜÑáéíóúüñ]/g, "");
        })
        .filter(Boolean);

      const initials = words.slice(0, 3).map(function (word) {
        return word.slice(0, 1).toUpperCase();
      });

      while (initials.length < 3) {
        initials.push(String(item.clasificacion || "U").slice(initials.length, initials.length + 1).toUpperCase() || "U");
      }

      return [
        '<span class="piAudiencePicker__bubbles" title="', escapeHtml_(formatNumber_(miembros) + " usuarios estimados"), '">',
          initials.slice(0, 3).map(function (letter, index) {
            return '<i class="piAudiencePicker__bubble piAudiencePicker__bubble--' + index + '">' + escapeHtml_(letter) + '</i>';
          }).join(""),
          miembros > 3 ? '<i class="piAudiencePicker__bubble piAudiencePicker__bubble--more">+' + escapeHtml_(String(Math.max(miembros - 3, 0))) + '</i>' : '',
        '</span>'
      ].join("");
    }

    function normalizeCommercialKind_(value) {
      const raw = String(value || "").trim().toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");

      if (raw.includes("recompra")) return "recompra";
      if (raw.includes("cross")) return "cross_sell";
      if (raw.includes("upsell") || raw.includes("up_sell")) return "upsell";
      if (raw.includes("fidel")) return "fidelizacion";
      if (raw.includes("react")) return "reactivacion";
      if (raw.includes("educ")) return "educacion";
      if (raw.includes("exper")) return "experimentacion";
      if (raw.includes("mayor") || raw.includes("volumen")) return "mayorista";

      return "publicidad_interna";
    }

    function commercialIcon_(kind) {
      const icons = {
        recompra: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7h8a5 5 0 0 1 0 10h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 7l3-3M7 7l3 3M17 17H9a5 5 0 0 1 0-10h1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 17l-3-3M17 17l-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        cross_sell: '<svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="6" r="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="18" r="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M8.3 11l7.4-4M8.3 13l7.4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        upsell: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7 10l5-5 5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
        fidelizacion: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
        reactivacion: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4v7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.2 6.8A7 7 0 1 0 16.8 6.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        educacion: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 5.5h10a3 3 0 0 1 3 3V19H8a3 3 0 0 1-3-3V5.5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h7M8 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        experimentacion: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.4 4.3L18 9l-4.6 1.7L12 15l-1.4-4.3L6 9l4.6-1.7L12 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
        mayorista: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8l8-4 8 4-8 4-8-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 8v8l8 4 8-4V8" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 12v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        publicidad_interna: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 13V7a2 2 0 0 1 2-2h3l7-2v18l-7-2H6a2 2 0 0 1-2-2v-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 7v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      };

      return icons[kind] || icons.publicidad_interna;
    }
    /* FIN · Conjuntos disponibles desde Supabase · Publicidad Interna */


    /* FIN · Conjuntos disponibles desde Supabase · Publicidad Interna */

    /* INICIO · Destinos Brevo desde Supabase · Publicidad Interna */
    async function loadBrevoDestinosDisponiblesDesdeSupabase_(root) {
      if (!root) return;

      if (STATE.loadingBrevoDestinations) {
        renderBrevoDestinos_(root);
        return;
      }

      if (STATE.brevoDestinationsRequested && STATE.brevoDestinations.length) {
        renderBrevoDestinos_(root);
        renderBrevoDestinoDetalle_(root);
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
        STATE.brevoDestinationsError = "Falta configurar Supabase URL o publishable key.";
        STATE.loadingBrevoDestinations = false;
        STATE.brevoDestinationsRequested = true;
        renderBrevoDestinos_(root);
        showToast_(root, "No se pudieron cargar destinos Brevo: falta configuración de Supabase.");
        return;
      }

      STATE.loadingBrevoDestinations = true;
      STATE.brevoDestinationsError = "";
      STATE.brevoDestinationsRequested = true;

      renderBrevoDestinos_(root);

      try {
        const endpoint = [
          url,
          "/rest/v1/vista_brevo_destinos_envio_disponibles",
          "?select=*",
          "&order=prioridad.asc,nombre_destino.asc"
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

        STATE.brevoDestinations = Array.isArray(rows)
          ? rows.map(normalizeBrevoDestinoDesdeSupabase_)
          : [];

        const validIds = STATE.brevoDestinations.map(function (item) {
          return item.id;
        });

        if (STATE.selectedBrevoDestinationId && !validIds.includes(STATE.selectedBrevoDestinationId)) {
          STATE.selectedBrevoDestinationId = "";
        }

        STATE.loadingBrevoDestinations = false;
        STATE.brevoDestinationsError = "";

        renderBrevoDestinos_(root);
        renderBrevoDestinoDetalle_(root);

        if (STATE.brevoDestinations.length) {
          showToast_(root, "Destinos Brevo cargados desde Supabase.");
        } else {
          showToast_(root, "Supabase respondió, pero no hay destinos Brevo activos.");
        }
      } catch (error) {
        STATE.loadingBrevoDestinations = false;
        STATE.brevoDestinationsError = String(error && error.message ? error.message : error);
        console.error("[publicidadinterna] Error leyendo destinos Brevo:", error);

        renderBrevoDestinos_(root);
        renderBrevoDestinoDetalle_(root);
        showToast_(root, "No se pudieron cargar los destinos Brevo.");
      }
    }

    function normalizeBrevoDestinoDesdeSupabase_(row) {
      return {
        id: String(row.brevo_destino_envio_id || "").trim(),
        codigoDestino: String(row.codigo_destino || "").trim(),
        esDefault: row.es_default === true,
        nombre: String(row.nombre_destino || "Destino Brevo sin nombre").trim(),
        descripcion: String(row.descripcion || "").trim(),

        tipoDestino: String(row.tipo_destino || "lista_automatizacion").trim(),
        canal: String(row.canal || "email").trim(),
        proveedorEnvio: String(row.proveedor_envio || "brevo").trim(),
        estado: String(row.estado || "activo").trim(),
        objetivoComercial: String(row.objetivo_comercial || "publicidad_interna").trim(),

        brevoListaId: String(row.brevo_lista_id || "").trim(),
        brevoListaNombre: String(row.brevo_lista_nombre || "").trim(),

        brevoSegmentoId: String(row.brevo_segmento_id || "").trim(),
        brevoSegmentoNombre: String(row.brevo_segmento_nombre || "").trim(),

        brevoAutomatizacionId: String(row.brevo_automatizacion_id || "").trim(),
        brevoAutomatizacionNombre: String(row.brevo_automatizacion_nombre || "").trim(),

        brevoTemplateId: String(row.brevo_template_id || "").trim(),
        brevoTemplateNombre: String(row.brevo_template_nombre || "").trim(),

        triggerBrevo: String(row.trigger_brevo || "contacto_agregado_a_lista").trim(),

        asuntoDefault: String(row.asunto_default || "").trim(),
        preheaderDefault: String(row.preheader_default || "").trim(),
        mensajeBaseDefault: String(row.mensaje_base_default || "").trim(),
        urlCtaDefault: String(row.url_cta_default || "").trim(),

        prioridad: toNumber_(row.prioridad)
      };
    }

    function renderBrevoDestinos_(root) {
      const shell = root.querySelector("[data-pi-brevo-destination-picker-shell]");
      if (!shell) return;

      if (STATE.loadingBrevoDestinations) {
        shell.innerHTML = [
          '<div class="piBrevoDestinationPicker">',
            '<button type="button" class="piBrevoDestinationPicker__trigger is-loading" disabled>',
              '<span class="piBrevoDestinationPicker__triggerIcon" aria-hidden="true">', icon_("send"), '</span>',
              '<span class="piBrevoDestinationPicker__triggerCopy">',
                '<strong>Cargando destinos Brevo...</strong>',
                '<small>Consultando rutas de envío desde Supabase.</small>',
              '</span>',
            '</button>',
          '</div>'
        ].join("");
        return;
      }

      if (STATE.brevoDestinationsError) {
        shell.innerHTML = [
          '<div class="piBrevoDestinationPicker">',
            '<button type="button" class="piBrevoDestinationPicker__trigger is-error" disabled>',
              '<span class="piBrevoDestinationPicker__triggerIcon" aria-hidden="true">', icon_("send"), '</span>',
              '<span class="piBrevoDestinationPicker__triggerCopy">',
                '<strong>No se pudieron cargar destinos Brevo</strong>',
                '<small>', escapeHtml_(STATE.brevoDestinationsError), '</small>',
              '</span>',
            '</button>',
          '</div>'
        ].join("");
        return;
      }

      if (!STATE.brevoDestinations.length) {
        shell.innerHTML = [
          '<div class="piBrevoDestinationPicker">',
            '<button type="button" class="piBrevoDestinationPicker__trigger" data-pi-brevo-destination-trigger>',
              '<span class="piBrevoDestinationPicker__triggerIcon" aria-hidden="true">', icon_("send"), '</span>',
              '<span class="piBrevoDestinationPicker__triggerCopy">',
                '<strong>No hay destinos Brevo activos</strong>',
                '<small>Creá o sincronizá una lista Brevo para continuar.</small>',
              '</span>',
              '<span class="piBrevoDestinationPicker__chevron" aria-hidden="true">⌄</span>',
            '</button>',
            '<button type="button" class="piBrevoDestinationPicker__createSolo" data-pi-brevo-create-destination>',
              '+ Nueva lista',
            '</button>',
          '</div>'
        ].join("");
        return;
      }

      const destino = getSelectedBrevoDestino_();
      const visible = getVisibleBrevoDestinos_();

      const triggerTitle = destino
        ? destino.nombre
        : "Seleccionar destino Brevo";

      const triggerSubtitle = destino
        ? [
            destino.brevoListaId ? "Lista #" + destino.brevoListaId : "",
            destino.objetivoComercial ? labelObjetivo_(destino.objetivoComercial) : "",
            destino.brevoAutomatizacionNombre ? "Automatización activa" : "Sin automatización registrada"
          ].filter(Boolean).join(" · ")
        : "Elegí la ruta donde Make/Brevo sincronizará los contactos.";

      shell.innerHTML = [
        '<div class="piBrevoDestinationPicker ', STATE.brevoDestinationDropdownOpen ? "is-open" : "", '" data-pi-brevo-destination-picker>',

          '<button type="button" class="piBrevoDestinationPicker__trigger" data-pi-brevo-destination-trigger>',
            '<span class="piBrevoDestinationPicker__triggerIcon piBrevoDestinationPicker__triggerIcon--', escapeHtml_(normalizeCommercialKind_(destino ? destino.objetivoComercial : "publicidad_interna")), '" aria-hidden="true">',
              commercialIcon_(normalizeCommercialKind_(destino ? destino.objetivoComercial : "publicidad_interna")),
            '</span>',

            '<span class="piBrevoDestinationPicker__triggerCopy">',
              '<strong>', escapeHtml_(triggerTitle), '</strong>',
              '<small>', escapeHtml_(triggerSubtitle), '</small>',
            '</span>',

            destino && destino.esDefault ? '<span class="piBrevoDestinationPicker__default">Default</span>' : '',

            '<span class="piBrevoDestinationPicker__chevron" aria-hidden="true">⌄</span>',
          '</button>',

          STATE.brevoDestinationDropdownOpen ? [
            '<div class="piBrevoDestinationPicker__dropdown">',
              '<div class="piBrevoDestinationPicker__searchRow">',
                '<span class="piBrevoDestinationPicker__searchIcon" aria-hidden="true">', icon_("search"), '</span>',
                '<input type="search" data-pi-brevo-destination-search value="', escapeHtml_(STATE.brevoDestinationSearch || ""), '" placeholder="Buscar destino, lista, automatización u objetivo...">',
              '</div>',

              '<div class="piBrevoDestinationPicker__hint">',
                '<strong>Elegí por objetivo operativo.</strong>',
                '<span>La lista debe coincidir con el tipo de campaña: recompra, cross sell, fidelización, reactivación u otra ruta activa.</span>',
              '</div>',

              '<div class="piBrevoDestinationPicker__list">',
                visible.length
                  ? visible.map(renderBrevoDestinoDropdownItem_).join("")
                  : renderBrevoDestinationEmpty_(),
              '</div>',

              '<div class="piBrevoDestinationPicker__footer">',
                '<button type="button" data-pi-brevo-create-destination>',
                  '<span aria-hidden="true">+</span>',
                  '<strong>Nueva lista</strong>',
                  '<small>Crear destino Brevo desde Protocol Data</small>',
                '</button>',
              '</div>',
            '</div>'
          ].join("") : '',

        '</div>'
      ].join("");
    }

    
    function getVisibleBrevoDestinos_() {
      const query = String(STATE.brevoDestinationSearch || "").trim().toLowerCase();

      let items = Array.isArray(STATE.brevoDestinations)
        ? STATE.brevoDestinations.slice()
        : [];

      if (query) {
        items = items.filter(function (item) {
          return [
            item.nombre,
            item.codigoDestino,
            item.descripcion,
            item.tipoDestino,
            item.canal,
            item.estado,
            item.objetivoComercial,
            labelObjetivo_(item.objetivoComercial),
            item.brevoListaId,
            item.brevoListaNombre,
            item.brevoAutomatizacionId,
            item.brevoAutomatizacionNombre,
            item.brevoTemplateId,
            item.brevoTemplateNombre,
            item.triggerBrevo
          ].join(" ").toLowerCase().includes(query);
        });
      }

      items.sort(function (a, b) {
        const prioridadA = toNumber_(a.prioridad || 100);
        const prioridadB = toNumber_(b.prioridad || 100);

        if (prioridadA !== prioridadB) return prioridadA - prioridadB;

        if (a.esDefault !== b.esDefault) return a.esDefault ? -1 : 1;

        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
      });

      return items;
    }

    function renderBrevoDestinationEmpty_() {
      return [
        '<div class="piBrevoDestinationPicker__empty">',
          '<strong>No encontramos destinos con ese filtro.</strong>',
          '<span>Probá buscar por nombre de lista, automatización, objetivo o código.</span>',
        '</div>'
      ].join("");
    }

    function renderBrevoDestinoDropdownItem_(item) {
      const selected = item.id === STATE.selectedBrevoDestinationId;
      const kind = normalizeCommercialKind_(item.objetivoComercial);
      const listLabel = item.brevoListaId
        ? "Lista #" + item.brevoListaId + (item.brevoListaNombre ? " · " + item.brevoListaNombre : "")
        : (item.brevoListaNombre || "Lista no definida");

      const automationLabel = item.brevoAutomatizacionNombre || item.brevoAutomatizacionId || "Sin automatización registrada";
      const triggerLabel = formatBrevoTrigger_(item.triggerBrevo);

      return [
        '<button type="button" class="piBrevoDestinationPicker__item ', selected ? "is-selected" : "", '" data-pi-brevo-destination-pick="', escapeHtml_(item.id), '">',

          '<span class="piBrevoDestinationPicker__itemIcon piBrevoDestinationPicker__itemIcon--', escapeHtml_(kind), '" aria-hidden="true">',
            commercialIcon_(kind),
          '</span>',

          '<span class="piBrevoDestinationPicker__itemMain">',
            '<span class="piBrevoDestinationPicker__itemTop">',
              '<strong>', escapeHtml_(item.nombre), '</strong>',
              item.esDefault ? '<em>Default</em>' : '',
              item.estado === "activo" ? '<em class="is-active">Activo</em>' : '',
            '</span>',

            '<small>',
              escapeHtml_(labelObjetivo_(item.objetivoComercial)),
              ' · ',
              escapeHtml_(formatBrevoDestinoTipo_(item.tipoDestino)),
              ' · ',
              escapeHtml_(item.canal || "email"),
            '</small>',

            '<span class="piBrevoDestinationPicker__itemRoute">',
              '<b>', escapeHtml_(listLabel), '</b>',
              '<b>', escapeHtml_(automationLabel), '</b>',
              '<b>', escapeHtml_(triggerLabel), '</b>',
            '</span>',

            item.descripcion
              ? '<span class="piBrevoDestinationPicker__itemDesc">' + escapeHtml_(item.descripcion) + '</span>'
              : '',
          '</span>',

          '<span class="piBrevoDestinationPicker__itemSide">',
            item.codigoDestino
              ? '<small>' + escapeHtml_(item.codigoDestino) + '</small>'
              : '',
            '<span class="piBrevoDestinationPicker__check">', selected ? "✓" : "", '</span>',
          '</span>',

        '</button>'
      ].join("");
    }

    function renderBrevoDestinoDetalle_(root) {
      const node = root.querySelector("[data-pi-brevo-destination-detail]");
      if (!node) return;

      if (STATE.loadingBrevoDestinations) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>Cargando destino Brevo...</strong>',
            '<p>Consultando rutas de envío disponibles.</p>',
          '</div>'
        ].join("");
        return;
      }

      if (STATE.brevoDestinationsError) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>No se pudieron cargar los destinos Brevo.</strong>',
            '<p>', escapeHtml_(STATE.brevoDestinationsError), '</p>',
          '</div>'
        ].join("");
        return;
      }

      const destino = getSelectedBrevoDestino_();

      if (!destino) {
        node.innerHTML = [
          '<div class="piEmpty">',
            '<strong>Seleccioná un destino Brevo.</strong>',
            '<p>Protocol Data usará esta ruta para indicar a Make/Brevo dónde sincronizar los contactos.</p>',
          '</div>'
        ].join("");
        return;
      }

      node.innerHTML = [
        '<div class="piBrevoRouteCard">',
          '<div class="piBrevoRouteCard__top">',
            '<span class="piBrevoRouteCard__icon" aria-hidden="true">', icon_("send"), '</span>',
            '<div>',
              '<strong>', escapeHtml_(destino.nombre), '</strong>',
              '<p>', escapeHtml_(destino.descripcion || "Ruta de envío disponible para campañas internas."), '</p>',
            '</div>',
          '</div>',

          '<div class="piBrevoRouteGrid">',
            '<div class="piBrevoRouteMetric">',
              '<span>Lista Brevo</span>',
              '<strong>',
                destino.brevoListaId ? '#'+escapeHtml_(destino.brevoListaId) + ' · ' : '',
                escapeHtml_(destino.brevoListaNombre || "No definida"),
              '</strong>',
            '</div>',

            '<div class="piBrevoRouteMetric">',
              '<span>Automatización</span>',
              '<strong>', escapeHtml_(destino.brevoAutomatizacionNombre || destino.brevoAutomatizacionId || "No definida"), '</strong>',
            '</div>',

            '<div class="piBrevoRouteMetric">',
              '<span>Tipo de ruta</span>',
              '<strong>', escapeHtml_(formatBrevoDestinoTipo_(destino.tipoDestino)), '</strong>',
            '</div>',

            '<div class="piBrevoRouteMetric">',
              '<span>Trigger</span>',
              '<strong>', escapeHtml_(formatBrevoTrigger_(destino.triggerBrevo)), '</strong>',
            '</div>',
          '</div>',

          '<div class="piBrevoRouteCard__managed">',
            '<strong>El contenido del correo se edita desde Brevo.</strong>',
            '<p>Protocol Data solo enviará contactos a esta ruta. Make ejecutará la sincronización y Brevo manejará plantilla, asunto, tiempos y automatización.</p>',
          '</div>',
        '</div>'
      ].join("");
    }

    function applyBrevoDestinoDefaults_(root) {
      /*
        Publicidad Interna no edita contenido de correo desde Protocol Data.
        El destino Brevo define la ruta operativa.
        Asunto, preheader, plantilla, delays y contenido se gestionan dentro de Brevo.
      */
      const destino = getSelectedBrevoDestino_();
      if (!root || !destino) return;
    }

    function getSelectedBrevoDestino_() {
      if (!STATE.selectedBrevoDestinationId) return null;

      return STATE.brevoDestinations.find(function (item) {
        return item.id === STATE.selectedBrevoDestinationId;
      }) || null;
    }

    function formatBrevoDestinoTipo_(tipo) {
      const map = {
        lista: "Lista",
        segmento: "Segmento",
        automatizacion: "Automatización",
        lista_automatizacion: "Lista + Automatización",
        template_directo: "Template directo"
      };

      return map[tipo] || tipo || "Destino";
    }

    function formatBrevoTrigger_(trigger) {
      const map = {
        contacto_agregado_a_lista: "Contacto agregado a lista"
      };

      return map[trigger] || trigger || "Trigger no definido";
    }
    /* FIN · Destinos Brevo desde Supabase · Publicidad Interna */


    /* FIN · Destinos Brevo desde Supabase · Publicidad Interna */

    /* INICIO · Guardar campaña real en Supabase · Publicidad Interna */
    async function guardarCampaniaInternaBorrador_(root, form) {
      if (!root || !form) return;

      const validation = getCampaignBuilderValidation_(root);
      renderCampaignBuilderSummary_(root);

      if (!validation.canSave) {
        const firstError = validation.pendingCritical[0];

        showToast_(
          root,
          firstError && firstError.hint
            ? firstError.hint
            : "Completá los requisitos críticos antes de guardar el borrador."
        );

        focusCampaignBuilderFirstError_(root, validation);
        return;
      }

      const nombreInput = form.querySelector("[data-pi-campaign-name]");
      const descripcionInput = form.querySelector("[data-pi-campaign-description]");
      const objetivoInput = form.querySelector("[data-pi-campaign-objective]");
      const canalInput = form.querySelector("[data-pi-campaign-channel]");

      const subjectInput = form.querySelector("[data-pi-email-subject]");
      const preheaderInput = form.querySelector("[data-pi-email-preheader]");
      const messageInput = form.querySelector("[data-pi-email-message]");
      const ctaInput = form.querySelector("[data-pi-email-cta]");

      const nombre = String(nombreInput ? nombreInput.value : "").trim();
      const descripcion = String(descripcionInput ? descripcionInput.value : "").trim();
      const objetivo = String(objetivoInput ? objetivoInput.value : "publicidad_interna").trim();
      const canal = String(canalInput ? canalInput.value : "email").trim();

      const asunto = String(subjectInput ? subjectInput.value : "").trim();
      const preheader = String(preheaderInput ? preheaderInput.value : "").trim();
      const mensaje = String(messageInput ? messageInput.value : "").trim();
      const urlCta = String(ctaInput ? ctaInput.value : "").trim();

      const destino = getSelectedBrevoDestino_();
      const selectedAudiences = getSelectedAudienceSets_();

      const payload = {
        nombre: nombre,
        descripcion: descripcion,
        objetivo: objetivo,
        canal: canal,

        conjuntos_audiencia_ids: STATE.selectedAudienceSetIds.slice(),
        brevo_destino_envio_id: STATE.selectedBrevoDestinationId,

        asunto_email: asunto,
        preheader_email: preheader,
        mensaje_base: mensaje,
        url_cta: urlCta,

        metadata_constructor: {
          origen: "constructor_publicidad_interna",
          validacion_frontend: {
            can_save: validation.canSave,
            warnings_count: validation.pendingWarnings.length,
            warnings: validation.pendingWarnings.map(function (item) {
              return item.key;
            })
          },
          snapshot: {
            conjuntos_count: selectedAudiences.length,
            contactos_estimados_frontend: validation.snapshot.selectedMembers,
            brevo_lista_id: destino ? destino.brevoListaId : null,
            brevo_destino_codigo: destino ? destino.codigoDestino : null,
            operador_visual: STATE.selectedOperatorCode || null
          }
        }
      };

      const submitBtn = form.querySelector("[data-pi-builder-save-draft]") || form.querySelector('button[type="submit"]');
      const previousHtml = submitBtn ? submitBtn.innerHTML : "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Guardando borrador...</span>';
      }

      try {
        const result = await crearCampaniaInternaBorradorEnSupabase_(payload);

        if (!result || result.ok !== true) {
          throw new Error(result && result.error ? result.error : "Supabase no confirmó la creación del borrador.");
        }

        showToast_(
          root,
          "Campaña guardada como borrador con " +
            result.conjuntos_vinculados +
            " conjunto" +
            (Number(result.conjuntos_vinculados) === 1 ? "" : "s") +
            " y " +
            result.miembros_estimados_activos +
            " contacto" +
            (Number(result.miembros_estimados_activos) === 1 ? "" : "s") +
            " estimado" +
            (Number(result.miembros_estimados_activos) === 1 ? "" : "s") +
            "."
        );

        closeSlides_(root);

        STATE.selectedAudienceSetIds = [];
        STATE.selectedBrevoDestinationId = "";
        STATE.brevoDestinationDropdownOpen = false;
        STATE.audienceDropdownOpen = false;

        await loadCampaniasDesdeSupabase_(root);
        loadPublicidadInternaAdminContext_(root);
      } catch (error) {
        console.error("[publicidadinterna] Error creando campaña borrador:", error);
        showToast_(
          root,
          "No se pudo guardar el borrador: " +
            String(error && error.message ? error.message : error)
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = previousHtml;
          renderCampaignBuilderSummary_(root);
        }
      }
    }

    async function crearCampaniaInternaBorradorEnSupabase_(payload) {
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
        "/rest/v1/rpc/rpc_crear_campania_interna_borrador"
      ].join("");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": key,
          "Authorization": "Bearer " + key,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          p_payload: payload
        })
      });

      const text = await response.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        data = {
          ok: false,
          error: text || "Respuesta no JSON desde Supabase."
        };
      }

      if (!response.ok) {
        throw new Error(
          "HTTP " +
            response.status +
            " · " +
            (data && data.error ? data.error : text)
        );
      }

      return data;
    }
    /* FIN · Guardar campaña real en Supabase · Publicidad Interna */


    /* FIN · Guardar campaña real en Supabase · Publicidad Interna */

    /* INICIO · Publicar campaña real en Supabase · Publicidad Interna */
    async function publicarCampaniaInterna_(root, campaniaId, button) {
      const id = String(campaniaId || "").trim();

      if (!id) {
        showToast_(root, "No se pudo identificar la campaña a publicar.");
        return;
      }

      const previousHtml = button ? button.innerHTML : "";

      if (button) {
        button.disabled = true;
        button.innerHTML = "<span>Publicando...</span>";
      }

      try {
        const result = await publicarCampaniaInternaEnSupabase_(id);

        if (!result || result.ok !== true) {
          throw new Error(result && result.error ? result.error : "Supabase no confirmó la publicación.");
        }

        showToast_(
          root,
          "Campaña publicada. Trabajo Make/Brevo pendiente creado para " +
            result.miembros_estimados +
            " contacto" +
            (Number(result.miembros_estimados) === 1 ? "" : "s") +
            "."
        );

        await loadCampaniasDesdeSupabase_(root);
      } catch (error) {
        console.error("[publicidadinterna] Error publicando campaña:", error);

        showToast_(
          root,
          "No se pudo publicar la campaña: " +
            String(error && error.message ? error.message : error)
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = previousHtml;
        }
      }
    }

    async function publicarCampaniaInternaEnSupabase_(campaniaId) {
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
        "/rest/v1/rpc/rpc_publicar_campania_interna"
      ].join("");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": key,
          "Authorization": "Bearer " + key,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          p_payload: {
            campania_id: campaniaId
          }
        })
      });

      const text = await response.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        data = {
          ok: false,
          error: text || "Respuesta no JSON desde Supabase."
        };
      }

      if (!response.ok) {
        throw new Error(
          "HTTP " +
            response.status +
            " · " +
            (data && data.error ? data.error : text)
        );
      }

      return data;
    }
    /* FIN · Publicar campaña real en Supabase · Publicidad Interna */

    /* FIN · Supabase read · Publicidad Interna */

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

    if (STATE.activeAdminTab === "conjuntos") {
      node.innerHTML = renderAdminTabPlaceholder_({
        icon: "users",
        title: "Conjuntos de audiencia",
        text: "Esta vista mostrará los conjuntos usados por campañas internas. La administración principal seguirá viviendo en Publicidad UTM.",
        action: "Vista preparada"
      });
      return;
    }

    if (STATE.activeAdminTab === "contenidos") {
      node.innerHTML = renderAdminTabPlaceholder_({
        icon: "open",
        title: "Contenidos",
        text: "Esta vista mostrará automatizaciones, plantillas y correos gestionados desde Brevo. Por ahora Protocol Data solo gobierna públicos y rutas.",
        action: "Brevo como fuente"
      });
      return;
    }

    const campaigns = getFilteredCampaigns_();

    if (!campaigns.length) {
      node.innerHTML = [
        '<div class="piEmpty piEmpty--table">',
          '<strong>No hay campañas para este filtro.</strong>',
          '<p>Probá cambiar el filtro o crear una nueva campaña interna.</p>',
        '</div>'
      ].join("");
      return;
    }

    node.innerHTML = renderCampaignsTable_(campaigns);
  }
  
        /* INICIO · Tabla inteligente de campañas · Publicidad Interna */
        function renderCampaignsTable_(campaigns) {
          initCampaignTableConfig_();
    
          const selectedCount = STATE.selectedCampaignIds.length;
          const columns = getOrderedTableColumns_();
          const tableWidth = getTableTotalWidth_(columns);
    
          const allVisibleSelected = campaigns.length > 0 && campaigns.every(function (campaign) {
            return STATE.selectedCampaignIds.includes(campaign.id);
          });
    
          return [
            '<div class="piCampaignTableShell">',
              '<div class="piCampaignTableTop">',
                '<div>',
                  '<strong>Campañas internas</strong>',
                  '<p>', formatNumber_(campaigns.length), ' campaña', campaigns.length === 1 ? '' : 's', ' visibles · ', formatNumber_(selectedCount), ' seleccionada', selectedCount === 1 ? '' : 's', '</p>',
                '</div>',
    
                '<div class="piCampaignTableTop__actions">',
                  '<button class="piTableMiniBtn" type="button" data-pi-admin-disabled="columnas">',
                    '<span aria-hidden="true">', icon_("list"), '</span>',
                    '<strong>Columnas: Operativo</strong>',
                  '</button>',
                  '<button class="piTableMiniBtn" type="button" data-pi-admin-disabled="desglose">',
                    '<span aria-hidden="true">', icon_("sequence"), '</span>',
                    '<strong>Desglose</strong>',
                  '</button>',
                '</div>',
              '</div>',
    
              '<div class="piCampaignTableScroll">',
                '<table class="piCampaignTable" style="width:', tableWidth, 'px; min-width:', tableWidth, 'px;">',
                  '<colgroup>',
                    columns.map(function (column) {
                      const width = getTableColumnWidth_(column.id);
                      return '<col style="width:' + escapeHtml_(String(width)) + 'px;">';
                    }).join(""),
                  '</colgroup>',
                  '<thead>',
                    '<tr>',
                      columns.map(function (column) {
                        return renderCampaignTableHeaderCell_(column, allVisibleSelected);
                      }).join(""),
                    '</tr>',
                  '</thead>',
                  '<tbody>',
                    campaigns.map(function (campaign) {
                      return renderCampaignRow_(campaign, columns);
                    }).join(""),
                  '</tbody>',
                '</table>',
              '</div>',
            '</div>'
          ].join("");
        }
    
        function renderCampaignTableHeaderCell_(column, allVisibleSelected) {
          const width = getTableColumnWidth_(column.id);
          const frozenInfo = getColumnFrozenInfo_(column.id);
          const classes = [
            "piTableHeadCell",
            column.locked ? "is-locked" : "",
            column.draggable === false ? "is-not-draggable" : "",
            column.resizable === false ? "is-not-resizable" : "",
            frozenInfo.frozen ? "is-frozen" : "",
            frozenInfo.edge ? "is-frozen-edge" : ""
          ].filter(Boolean).join(" ");
    
          const style = buildTableCellStyle_(column.id);
    
          if (column.id === "select") {
            return [
              '<th class="', classes, '" data-pi-col="', escapeHtml_(column.id), '" style="', style, '">',
                '<label class="piTableCheck">',
                  '<input type="checkbox" data-pi-select-all-campaigns ', allVisibleSelected ? 'checked' : '', '>',
                  '<span></span>',
                '</label>',
                column.resizable !== false ? '<span class="piColumnResizeHandle" data-pi-resize-column="' + escapeHtml_(column.id) + '"></span>' : '',
              '</th>'
            ].join("");
          }
    
          return [
            '<th class="', classes, '" data-pi-col="', escapeHtml_(column.id), '" style="', style, '" draggable="', column.draggable === false ? 'false' : 'true', '" data-pi-column-drag="', escapeHtml_(column.id), '">',
              '<div class="piTableHeadInner">',
                '<span class="piTableHeadIcon" aria-hidden="true">', icon_(column.icon || "list"), '</span>',
                '<strong>', escapeHtml_(column.label), '</strong>',
                column.freezeable === false ? '' : [
                  '<button class="piFreezeColumnBtn ', frozenInfo.frozen ? 'is-active' : '', '" type="button" draggable="false" data-pi-freeze-column="', escapeHtml_(column.id), '" title="Congelar hasta esta columna">',
                    '<span></span>',
                  '</button>'
                ].join(""),
              '</div>',
              column.resizable === false ? '' : '<span class="piColumnResizeHandle" data-pi-resize-column="' + escapeHtml_(column.id) + '"></span>',
            '</th>'
          ].join("");
        }
    
        function renderCampaignRow_(campaign, columns) {
          const selected = STATE.selectedCampaignIds.includes(campaign.id);
          const hasError = campaign.contactos_error > 0 || String(campaign.estado_operativo_panel || "").includes("error");
          const rowHeight = getTableRowHeight_();
    
          return [
            '<tr class="piCampaignRow ', selected ? 'is-selected ' : '', hasError ? 'has-error ' : '', '" style="height:', rowHeight, 'px;">',
              columns.map(function (column) {
                return renderCampaignTableCell_(campaign, column);
              }).join(""),
            '</tr>'
          ].join("");
        }
    
        function renderCampaignTableCell_(campaign, column) {
          const frozenInfo = getColumnFrozenInfo_(column.id);
          const classes = [
            "piTableCell",
            frozenInfo.frozen ? "is-frozen" : "",
            frozenInfo.edge ? "is-frozen-edge" : "",
            column.id === "accion" ? "piColActions" : "",
            column.id === "select" ? "piColSelect" : ""
          ].filter(Boolean).join(" ");
    
          return [
            '<td class="', classes, '" data-pi-col="', escapeHtml_(column.id), '" style="', buildTableCellStyle_(column.id), '">',
              renderCampaignTableCellContent_(campaign, column.id),
            '</td>'
          ].join("");
        }
    
        function renderCampaignTableCellContent_(campaign, columnId) {
          const selected = STATE.selectedCampaignIds.includes(campaign.id);
          const syncLabel = formatNumber_(campaign.contactos_sincronizados) + " / " + formatNumber_(campaign.contactos_estimados);
          const progress = Math.max(0, Math.min(100, toNumber_(campaign.progreso_sync_pct)));
          const brevoListLabel = formatBrevoListCardLabel_(campaign);
          const isActive = String(campaign.estado_campania || "").toLowerCase() === "activa";
          const isDraft = String(campaign.estado_campania || "").toLowerCase() === "borrador";
          const hasError = campaign.contactos_error > 0 || String(campaign.estado_operativo_panel || "").includes("error");
          const lastExecution = campaign.fecha_ultimo_trabajo || campaign.trabajo_fecha_creacion || "";
    
          if (columnId === "select") {
            return [
              '<label class="piTableCheck">',
                '<input type="checkbox" value="', escapeHtml_(campaign.id), '" data-pi-select-campaign ', selected ? 'checked' : '', '>',
                '<span></span>',
              '</label>',
              '<span class="piRowResizeHandle" data-pi-resize-rows title="Ajustar altura de filas"></span>'
            ].join("");
          }
    
          if (columnId === "entrega") {
            return [
              '<button class="piToggle ', isActive ? 'is-on' : '', '" type="button" data-pi-admin-disabled="toggle" title="Activar/pausar estará disponible en una próxima fase.">',
                '<span></span>',
              '</button>'
            ].join("");
          }
    
          if (columnId === "campania") {
            return [
              '<div class="piTableCampaign">',
                '<span class="piTableCampaign__icon" aria-hidden="true">', icon_("campaign"), '</span>',
                '<div>',
                  '<strong>', escapeHtml_(campaign.campania), '</strong>',
                  '<small>', escapeHtml_(campaign.lectura_rapida || "Campaña interna."), '</small>',
                '</div>',
              '</div>'
            ].join("");
          }
    
          if (columnId === "objetivo") {
            return '<span class="piTablePill">' + escapeHtml_(labelObjetivo_(campaign.objetivo)) + '</span>';
          }
    
          if (columnId === "estado") {
            return '<span class="piStatus ' + statusClass_(campaign) + '">' + escapeHtml_(campaign.estado_visible) + '</span>';
          }
    
          if (columnId === "destino") {
            return [
              '<div class="piTableBrevo">',
                '<strong>', escapeHtml_(brevoListLabel), '</strong>',
                '<small>', escapeHtml_(campaign.brevo_automatizacion_nombre_destino || "Automatización no informada"), '</small>',
              '</div>'
            ].join("");
          }
    
          if (columnId === "sincronizados") {
            return '<strong class="piTableNumber">' + escapeHtml_(syncLabel) + '</strong>';
          }
    
          if (columnId === "errores") {
            return '<strong class="piTableNumber ' + (campaign.contactos_error > 0 ? 'is-danger' : '') + '">' + formatNumber_(campaign.contactos_error) + '</strong>';
          }
    
          if (columnId === "progreso") {
            return [
              '<div class="piTableProgress">',
                '<div><span style="width:', escapeHtml_(String(progress)), '%"></span></div>',
                '<strong>', formatNumber_(progress), '%</strong>',
              '</div>'
            ].join("");
          }
    
          if (columnId === "trabajo") {
            return '<span class="piTableJob ' + (hasError ? 'is-error' : '') + '">' + escapeHtml_(labelTrabajoEstado_(campaign.trabajo_estado)) + '</span>';
          }
    
          if (columnId === "ultima") {
            return '<span class="piTableDate">' + escapeHtml_(lastExecution ? formatDateTime_(lastExecution) : "Sin ejecución") + '</span>';
          }
    
          if (columnId === "accion") {
            if (isDraft) {
              return [
                '<button class="piTableAction piTableAction--primary" type="button" data-pi-publish-campaign="', escapeHtml_(campaign.id), '">',
                  'Publicar',
                '</button>'
              ].join("");
            }
    
            return [
              '<button class="piTableAction" type="button" data-pi-open-detail="', escapeHtml_(campaign.id), '">',
                hasError ? 'Revisar' : 'Detalle',
              '</button>'
            ].join("");
          }
    
          return "—";
        }
        /* FIN · Tabla inteligente de campañas · Publicidad Interna */
  
  function renderCampaignCard_(campaign) {
    const syncLabel = formatNumber_(campaign.contactos_sincronizados) + " / " + formatNumber_(campaign.contactos_estimados);
    const progressLabel = formatNumber_(campaign.progreso_sync_pct) + "%";
    const brevoListLabel = formatBrevoListCardLabel_(campaign);

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
            metric_("Sincronizados", syncLabel),
            metric_("Errores", campaign.contactos_error),
            metric_("Progreso", progressLabel),
            metric_("Trabajo", labelTrabajoEstado_(campaign.trabajo_estado)),
          '</div>',
        '</div>',

        '<div class="piCampaignCard__footer">',
          '<div class="piCampaignCard__footnote">',
            escapeHtml_(campaign.conjuntos_asociados), ' conjunto · ',
            escapeHtml_(campaign.pasos_totales), ' pasos · ',
            escapeHtml_(brevoListLabel),
          '</div>',

          '<div class="piCampaignCard__actions">',
            '<button class="piBtn piBtn--ghost" type="button" data-pi-open-detail="', escapeHtml_(campaign.id), '">',
              'Ver detalle',
            '</button>',
            renderCampaignPrimaryAction_(campaign),
          '</div>',
        '</div>',
      '</article>'
    ].join("");
  }

  /* INICIO · Acción principal por estado · Publicidad Interna */
  function renderCampaignPrimaryAction_(campaign) {
    const estado = String(campaign && campaign.estado_campania ? campaign.estado_campania : "").toLowerCase();
    const operativo = String(campaign && campaign.estado_operativo_panel ? campaign.estado_operativo_panel : "").toLowerCase();
    const id = String(campaign && campaign.id ? campaign.id : "");

    if (estado === "borrador") {
      return [
        '<button class="piBtn piBtn--primary" type="button" data-pi-publish-campaign="', escapeHtml_(id), '">',
          'Publicar campaña',
        '</button>'
      ].join("");
    }

    if (operativo === "error_make_brevo" || operativo === "sincronizada_con_errores") {
      return [
        '<button class="piBtn piBtn--primary" type="button" data-pi-open-detail="', escapeHtml_(id), '">',
          'Revisar errores',
        '</button>'
      ].join("");
    }

    return [
      '<button class="piBtn piBtn--primary" type="button" data-pi-open-detail="', escapeHtml_(id), '">',
        escapeHtml_(campaign.accion_principal_sugerida || "Ver detalle"),
      '</button>'
    ].join("");
  }
  /* FIN · Acción principal por estado · Publicidad Interna */

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

    const targetSlide = root.querySelector('[data-pi-slide="' + slideName + '"]');
    if (!targetSlide) return;

    window.clearTimeout(closeSlides_._timer);

    root.querySelectorAll("[data-pi-slide]").forEach(function (slide) {
      slide.classList.remove("is-active", "piSlide--entered", "piSlide--leaving");
    });

    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");

    targetSlide.classList.add("is-active");

    /*
      Forzamos un reflow para que el navegador pinte primero:
      is-active + translateX(110%).
      Luego agregamos piSlide--entered y recién ahí anima hacia translateX(0).
    */
    void targetSlide.offsetWidth;

    window.requestAnimationFrame(function () {
      targetSlide.classList.add("piSlide--entered");
    });
  }

  function closeSlides_(root) {
    const layer = root.querySelector("[data-pi-slide-layer]");
    if (!layer) return;

    const activeSlide = root.querySelector("[data-pi-slide].is-active");

    if (activeSlide) {
      activeSlide.classList.remove("piSlide--entered");
      activeSlide.classList.add("piSlide--leaving");
    }

    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");

    window.clearTimeout(closeSlides_._timer);

    closeSlides_._timer = window.setTimeout(function () {
      root.querySelectorAll("[data-pi-slide]").forEach(function (slide) {
        slide.classList.remove("is-active", "piSlide--entered", "piSlide--leaving");
      });
    }, 360);
  }
  function getFilteredCampaigns_() {
    return getCampaignSource_().filter(function (campaign) {
      const searchHaystack = [
        campaign.campania,
        campaign.objetivo,
        campaign.estado_visible,
        campaign.estado_operativo_panel,
        campaign.trabajo_estado,
        campaign.brevo_lista_nombre_destino,
        campaign.brevo_nombre_destino
      ].join(" ").toLowerCase();

      const matchesSearch = !STATE.search || searchHaystack.includes(STATE.search);

      if (!matchesSearch) return false;

      const operativo = String(campaign.estado_operativo_panel || "").toLowerCase();

      if (STATE.filter === "todas") return true;

      if (STATE.filter === "ejecucion") {
        return !!campaign.trabajo_id || campaign.trabajos_totales > 0;
      }

      if (STATE.filter === "acciones") {
        return (
          campaign.estado_campania === "borrador" ||
          campaign.trabajos_error > 0 ||
          campaign.contactos_error > 0 ||
          operativo === "error_make_brevo" ||
          operativo === "sincronizada_con_errores" ||
          operativo === "activa_sin_trabajo"
        );
      }

      if (STATE.filter === "activa") return campaign.estado_campania === "activa";
      if (STATE.filter === "borrador") return campaign.estado_campania === "borrador";
      if (STATE.filter === "pendiente") {
        return (
          campaign.trabajos_pendientes > 0 ||
          campaign.trabajos_procesando > 0 ||
          operativo === "pendiente_make" ||
          operativo === "procesando_make"
        );
      }
      if (STATE.filter === "error") {
        return (
          campaign.trabajos_error > 0 ||
          campaign.contactos_error > 0 ||
          operativo === "error_make_brevo" ||
          operativo === "sincronizada_con_errores"
        );
      }

      return true;
    });
  }


  function renderAdminTabPlaceholder_(config) {
    return [
      '<div class="piAdminPlaceholder">',
        '<span class="piAdminPlaceholder__icon" aria-hidden="true">', icon_(config.icon || "list"), '</span>',
        '<div>',
          '<strong>', escapeHtml_(config.title || "Vista preparada"), '</strong>',
          '<p>', escapeHtml_(config.text || "Esta sección será habilitada en una próxima fase."), '</p>',
          '<small>', escapeHtml_(config.action || "Preparado"), '</small>',
        '</div>',
      '</div>'
    ].join("");
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
    const operativo = String(campaign && campaign.estado_operativo_panel ? campaign.estado_operativo_panel : "").toLowerCase();
    const estado = String(campaign && campaign.estado_campania ? campaign.estado_campania : "").toLowerCase();

    if (operativo === "error_make_brevo" || operativo === "sincronizada_con_errores") return "piStatus--error";
    if (operativo === "pendiente_make" || operativo === "procesando_make") return "piStatus--pending";
    if (operativo === "sincronizada") return "piStatus--active";

    if (estado === "activa") return "piStatus--active";
    if (estado === "borrador") return "piStatus--draft";
    if (estado === "error") return "piStatus--error";

    if (campaign.trabajos_pendientes > 0) return "piStatus--pending";
    if (campaign.trabajos_error > 0) return "piStatus--error";

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