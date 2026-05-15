(function () {
  "use strict";

  if (window.__pubUtmBooted) return;
  window.__pubUtmBooted = true;

  const PUB_UTM_FRONT_BUILD = "PUB_UTM_FRONT_V2_2026-04-24";

  const STATE = {
    loading: false,
    dashboard: null,
    dashboardPlus: null,
    camposConfig: null,
    conjuntosAudiencias: null,

    /* INICIO · STATE · Parámetros UTM */
parametrosSearch: "",
parametrosTypeFilter: "todos",
parametrosFamilyFilter: "todas",
/* FIN · STATE · Parámetros UTM */

    /* INICIO · STATE · Biblioteca de conjuntos */
conjuntosLibrarySearch: "",
conjuntosLibraryFilter: "todos",
conjuntosLibrarySearchOpen: false,
/* FIN · STATE · Biblioteca de conjuntos */

/* INICIO · STATE · Biblioteca completa de audiencias */
audienciasLibrarySearch: "",
audienciasLibraryFilter: "todas",
audienciasLibrarySearchOpen: false,
/* FIN · STATE · Biblioteca completa de audiencias */

    /* INICIO · STATE · Filtros constructor de conjuntos */
    selectedAudiencesForSet: [],
    audienceSetSearch: "",
    audienceSetSort: "recent_desc",
    audienceSetTypeFilter: "todas",
    audienceSetFamilyFilter: "todas",
    audienceSetFiltersOpen: false,
    createSetOpen: false,
    /* FIN · STATE · Filtros constructor de conjuntos */

    activeTab: "audiencias",
activeFilter: "todas",

/* INICIO · STATE · Control motor UTM */
controlRows: [],
controlSearch: "",
controlFilter: "todos",
controlPage: 1,
controlPageSize: 10,
/* FIN · STATE · Control motor UTM */

root: null,

        /* INICIO · STATE · Miembros de conjuntos de audiencias */
        pendingDeleteReglaId: "",
        pendingSaveReglaPayload: null,
        pendingAudienceSetPayload: null,
    
        /* INICIO · STATE · Miembros de conjuntos de audiencias */
audienceSetMembersPayload: null,
audienceSetMembersSearch: "",
audienceSetMembersView: "por_audiencia",
/* FIN · STATE · Miembros de conjuntos de audiencias */

/* INICIO · STATE · Comparador por parámetro UTM */
audienceComparisonPayload: null,
audienceComparisonLoading: false,
audienceComparisonError: "",
audienceComparisonSelectedParam: null,
audienceComparisonDateRange: {
  mode: "all",
  from: "",
  to: "",
  open: false
},
audienceComparisonRequestKey: ""
/* FIN · STATE · Comparador por parámetro UTM */
        /* FIN · STATE · Miembros de conjuntos de audiencias */
  };

  window.__PUB_UTM_STATE__ = STATE;

  document.addEventListener("DOMContentLoaded", initPublicidadUtm_);
  document.addEventListener("sazzu:page:load", initPublicidadUtm_);

  /* INICIO · initPublicidadUtm_ · Boot panel Publicidad UTM */
/* INICIO · initPublicidadUtm_ · Boot panel Publicidad UTM */
function initPublicidadUtm_() {
  ensurePubUtmStyles_();

  const root = findPubUtmRoot_();
  if (!root) return;

  STATE.root = root;

  /* INICIO · Shell visual premium · Primer pantallazo */
ensurePubUtmDashboardShell_(root);
/* FIN · Shell visual premium · Primer pantallazo */

/* INICIO · Arquitectura segura por tabs · Paso 2 */
ensurePubUtmTabArchitectureSafe_(root);
/* FIN · Arquitectura segura por tabs · Paso 2 */

/* INICIO · AEVA inline · Ayuda persistente del módulo */
ensurePubUtmAevaInlineAssist_(root);
/* FIN · AEVA inline · Ayuda persistente del módulo */

ensureMounts_(root);

/* INICIO · Tabs dentro del header */
ensurePubUtmTabsInHeader_(root);
/* FIN · Tabs dentro del header */

/* INICIO · AEVA inline · Ayuda persistente del módulo */
ensurePubUtmAevaInlineAssist_(root);
/* FIN · AEVA inline · Ayuda persistente del módulo */

/* INICIO · Chrome inicial por tab activo */
syncPubUtmActiveTabChrome_(root, STATE.activeTab || "audiencias");
/* FIN · Chrome inicial por tab activo */

bindTabLogic_(root);
bindAudienceFilters_(root);
bindSlideLogic_(root);
bindPubUtmOpsMenu_(root);

/* INICIO · Footer global Publicidad UTM */
syncPubUtmGlobalFooter_(root);
/* FIN · Footer global Publicidad UTM */

  if (root.dataset.pubutmLoaded === "1") return;
  root.dataset.pubutmLoaded = "1";

  loadAllPubUtmData_(root);
}
/* FIN · initPublicidadUtm_ · Boot panel Publicidad UTM */

  function ensurePubUtmStyles_() {
    if (document.getElementById("pubUtmRuntimeCss")) return;

    const link = document.createElement("link");
    link.id = "pubUtmRuntimeCss";
    link.rel = "stylesheet";
    link.href = "/css/publicidad/publicidad-utm.css";

    document.head.appendChild(link);
  }

  function findPubUtmRoot_() {
    return (
      document.querySelector(".pubUtmPage") ||
      document.querySelector('[data-page="publicidad-utm"]') ||
      document.querySelector("#pubUtmPage")
    );
  }

/* =========================================================
   INICIO · Publicidad UTM · Arquitectura segura por tabs V2.1
   Paso 1: solo prepara clases y marca de arquitectura.
   No mueve HTML, no borra contenido y no toca mounts existentes.
   ========================================================= */

   function ensurePubUtmTabArchitectureSafe_(root) {
    if (!root) return;
  
    root.classList.add("pubUtmPage--tabArchitectureSafe");
  
    const audPanel = findTabPanel_(root, "audiencias");
    const paramsPanel = findTabPanel_(root, "conjuntos");
    const controlPanel = findTabPanel_(root, "control");
  
    if (audPanel) {
      audPanel.classList.add("pubUtmTabPanel--audiencias");
    }
  
    if (paramsPanel) {
      paramsPanel.classList.add("pubUtmTabPanel--parametros");
    }
  
    if (controlPanel) {
      controlPanel.classList.add("pubUtmTabPanel--control");
    }
  }
  


  /* =========================================================
     FIN · Publicidad UTM · Arquitectura segura por tabs V2.1
     ========================================================= */


/* =========================================================
   INICIO · AEVA inline assist · Publicidad UTM
   Persistente al lado de los tabs
   ========================================================= */

   /* =========================================================
   INICIO · AEVA inline assist · Publicidad UTM
   Inserta AEVA a la izquierda real del selector de tabs.
   ========================================================= */

/* =========================================================
   INICIO · AEVA inline assist · Publicidad UTM
   Inserta AEVA a la izquierda real del selector de tabs.
   ========================================================= */

   function ensurePubUtmAevaInlineAssist_(root) {
    if (!root) return;
  
    const headerActions = root.querySelector(".pubUtmHeaderPremium__actions");
    const tabsSlot = root.querySelector("[data-pubutm-header-tabs-slot]");
  
    if (!headerActions || !tabsSlot) return;
  
    if (root.querySelector("[data-pubutm-aeva-inline]")) return;
  
    const aevaWrap = document.createElement("div");
    aevaWrap.className = "pubUtmAevaInline";
    aevaWrap.setAttribute("data-pubutm-aeva-inline", "1");
  
    aevaWrap.innerHTML = `
      <button
        type="button"
        class="pubUtmAevaInline__trigger"
        aria-label="Abrir ayuda de AEVA para Publicidad UTM"
        title="AEVA · Ayuda del módulo"
      >
        <span class="pubUtmAevaInline__triggerIcon" aria-hidden="true">
          ${getPubUtmAevaInlineSvg_()}
        </span>
      </button>
  
      <div class="pubUtmAevaInline__flyout" aria-hidden="true">
        <div class="pubUtmAevaInline__card pubUtmAevaInline__card--aevaBg">
          <div class="pubUtmAevaInline__head">
            <div class="pubUtmAevaInline__identity">
              <span class="pubUtmAevaInline__iconBox" aria-hidden="true">
                ${getPubUtmAevaInlineSvg_()}
              </span>
  
              <div class="pubUtmAevaInline__titleWrap">
                <strong>AEVA</strong>
                <span>Asistencia del módulo</span>
              </div>
            </div>
  
            <span class="pubUtmAevaInline__corner" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 17 17 7M10 7h7v7" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>
          </div>
  
          <div class="pubUtmAevaInline__typingWrap">
            <p class="pubUtmAevaInline__typing" data-pubutm-aeva-typing></p>
          </div>
  
          <div class="pubUtmAevaInline__composer" role="button" aria-label="Abrir globo de chat de AEVA">
            <span>Escribe tu mensaje...</span>
  
            <button
              type="button"
              class="pubUtmAevaInline__send"
              data-pubutm-aeva-open
              aria-label="Abrir globo de chat"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M6.75 10.25 12 5l5.25 5.25" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  
    headerActions.insertBefore(aevaWrap, tabsSlot);
  
    bindPubUtmAevaInlineAssist_(aevaWrap);
  }
  
  /* =========================================================
     FIN · AEVA inline assist · Publicidad UTM
     ========================================================= */

/* =========================================================
   FIN · AEVA inline assist · Publicidad UTM
   ========================================================= */
  
  function bindPubUtmAevaInlineAssist_(host) {
    if (!host || host.dataset.aevaBound === "1") return;
    host.dataset.aevaBound = "1";
  
    const typingEl = host.querySelector("[data-pubutm-aeva-typing]");
    const openBtn = host.querySelector("[data-pubutm-aeva-open]");
    if (!typingEl || !openBtn) return;
  
    const message =
      "Puedo ayudarte con el módulo de Publicidad UTM. ¿Qué necesitas gestionar en este panel?";
  
    let timer = null;
  
    function resetTyping_() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      typingEl.textContent = "";
      typingEl.classList.remove("is-done");
    }
  
    function startTyping_() {
      resetTyping_();
  
      let index = 0;
      timer = setInterval(function () {
        index += 1;
        typingEl.textContent = message.slice(0, index);
  
        if (index >= message.length) {
          clearInterval(timer);
          timer = null;
          typingEl.classList.add("is-done");
        }
      }, 14);
    }
  
    host.addEventListener("mouseenter", function () {
      startTyping_();
    });
  
    host.addEventListener("mouseleave", function () {
      resetTyping_();
    });
  
    openBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
  
      window.location.href = "/panel/aeva.html?context=publicidad-utm&entry=inline";
    });
  }
  
  function getPubUtmAevaInlineSvg_() {
    return `
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path
          d="M18 49 L29.5 17.5 Q30.8 14 32 14 Q33.2 14 34.5 17.5 L46 49"
          fill="none"
          stroke="currentColor"
          stroke-width="9.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }


  /* =========================================================
   INICIO · Overlay mode · Ocultar AEVA cuando hay bibliotecas abiertas
   ========================================================= */

   function syncPubUtmOverlayMode_() {
    const body = document.body;
    if (!body) return;
  
    const hasLibraryOpen = Boolean(
      document.querySelector("[data-pubutm-conjuntos-library-slide].is-open") ||
      document.querySelector("[data-pubutm-audiencias-library-slide].is-open") ||
      document.querySelector("[data-pubutm-params-library-slide].is-open")
    );
  
    body.classList.toggle("pubUtmOverlayMode", hasLibraryOpen);
  }

/* =========================================================
   FIN · Overlay mode · Ocultar AEVA cuando hay bibliotecas abiertas
   ========================================================= */
  
  /* =========================================================
     FIN · AEVA inline assist · Publicidad UTM
     ========================================================= */

/* =========================================================
   INICIO · Publicidad UTM · Tab Audiencias ordenado V2.1
   Paso 4: agrega narrativa visual sin tocar renderizados internos.
   ========================================================= */

   /* =========================================================
   INICIO · Publicidad UTM · Tab Audiencias ordenado V2.1
   Paso 5: decoración post-render, sin romper mounts.
   ========================================================= */

function ensurePubUtmAudienciasTabScaffoldSafe_(root) {
  if (!root) return;

  const audPanel = findTabPanel_(root, "audiencias");
  if (!audPanel) return;

  const toolbar = audPanel.querySelector(".pubUtmAudienceToolbarCard");
  const conjuntosMount = audPanel.querySelector("[data-pubutm-conjuntos-list]");
  const audiencesMount = audPanel.querySelector("[data-pubutm-audiences-list]");

  if (!conjuntosMount || !audiencesMount) return;

  audPanel.classList.add("pubUtmAudienciasPanelV21");

  const oldEntry = audPanel.querySelector("[data-pubutm-audience-set-entry]");
  if (oldEntry) {
    oldEntry.classList.add("pubUtmAudienceSetEntry--legacyHidden");
  }

  if (!audPanel.querySelector("[data-pubutm-audiencias-intro]")) {
    audPanel.insertAdjacentHTML("afterbegin", `
      <!-- INICIO · Audiencias · Header interno V2.1 -->
      <section class="pubUtmModuleIntroV21 pubUtmModuleIntroV21--audiencias" data-pubutm-audiencias-intro>
        <div class="pubUtmModuleIntroV21__identity">
          <span class="pubUtmModuleIntroV21__icon" aria-hidden="true">
            ${getPubUtmHeaderIcon_("audience")}
          </span>

          <div class="pubUtmModuleIntroV21__copy">
            <div class="pubUtmCard__eyebrow">Output comercial del motor</div>
            <h2>Audiencias</h2>
            <p>
              Públicos detectados por el motor UTM y conjuntos comerciales listos para usar
              en campañas, remarketing, email, recompra o análisis interno.
            </p>
          </div>
        </div>

        <div class="pubUtmModuleIntroV21__actions">
          <button class="pubUtmBtn pubUtmBtn--primary pubUtmBtn--withIcon" type="button" data-open-create-set="1">
            <span class="pubUtmBtn__icon" aria-hidden="true">
              ${getPubUtmHeaderIcon_("plus")}
            </span>
            <span>Crear conjunto</span>
          </button>
        </div>
      </section>
      <!-- FIN · Audiencias · Header interno V2.1 -->
    `);
  }

  if (!audPanel.querySelector("[data-pubutm-conjuntos-section-title]")) {
    conjuntosMount.insertAdjacentHTML("beforebegin", `
      <!-- INICIO · Audiencias · Header conjuntos V2.1 -->
      <div class="pubUtmSectionHeaderV21" data-pubutm-conjuntos-section-title>
        <div>
          <div class="pubUtmCard__eyebrow">Conjuntos reutilizables</div>
          <h3>Biblioteca de conjuntos</h3>
          <p>
            Contenedores comerciales creados a partir de audiencias atómicas, compuestas o derivadas.
          </p>
        </div>
      </div>
      <!-- FIN · Audiencias · Header conjuntos V2.1 -->
    `);
  }

  if (!audPanel.querySelector("[data-pubutm-audiences-section-title]")) {
    audiencesMount.insertAdjacentHTML("beforebegin", `
      <!-- INICIO · Audiencias · Header audiencias automáticas V2.1 -->
      <div class="pubUtmSectionHeaderV21" data-pubutm-audiences-section-title>
        <div>
          <div class="pubUtmCard__eyebrow">Audiencias automáticas</div>
          <h3>Biblioteca de audiencias</h3>
          <p>
            Públicos detectados por parámetros, familias, patrones y reglas del ecosistema UTM.
          </p>
        </div>
      </div>
      <!-- FIN · Audiencias · Header audiencias automáticas V2.1 -->
    `);
  }

  const intro = audPanel.querySelector("[data-pubutm-audiencias-intro]");
  const conjuntosTitle = audPanel.querySelector("[data-pubutm-conjuntos-section-title]");
  const audiencesTitle = audPanel.querySelector("[data-pubutm-audiences-section-title]");

  [
    intro,
    conjuntosTitle,
    conjuntosMount,
    audiencesTitle,
    toolbar,
    audiencesMount
  ].forEach(function (node) {
    if (node) audPanel.appendChild(node);
  });

  audPanel.querySelectorAll("[data-pubutm-audiencias-intro] [data-open-create-set]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openAudienceSetCreator_(root);
    };
  });
}

/* =========================================================
   FIN · Publicidad UTM · Tab Audiencias ordenado V2.1
   ========================================================= */


  /* =========================================================
   INICIO · Shell visual premium · Publicidad UTM
   Construye el primer pantallazo sin tocar la lógica interna.
   ========================================================= */

function ensurePubUtmDashboardShell_(root) {
  if (!root || root.dataset.pubutmShellV3 === "1") return;

  root.dataset.pubutmShellV3 = "1";
  root.classList.add("pubUtmPage--premium");

  root.innerHTML = `
    <!-- INICIO · Header premium Publicidad UTM -->
    <header class="pubUtmHeader pubUtmHeader--premium">
      <div class="pubUtmHeader__copy pubUtmHeaderPremium__copy">
        <div class="pubUtmHeader__eyebrow">Sazzú · Ecosistema UTM</div>

        <div class="pubUtmHeaderPremium__titleRow">
          <h1 class="pubUtmHeader__title">Publicidad UTM</h1>

          <span class="pubUtmHeaderPremium__status">
            <span class="pubUtmHeaderPremium__statusDot" aria-hidden="true"></span>
            <strong data-kpi="estado_motor">—</strong>
          </span>
        </div>

        <div class="pubUtmHeaderPremium__micro">
          <span>Motor de audiencias</span>
          <span>Parámetros, patrones y conjuntos comerciales</span>
          <span data-pubutm-generated-at>—</span>
        </div>
      </div>

      <div class="pubUtmHeader__actions pubUtmHeaderPremium__actions">
        <button class="pubUtmBtn pubUtmBtn--primary pubUtmBtn--withIcon" type="button" data-open-create-set="1">
          <span class="pubUtmBtn__icon" aria-hidden="true">
            ${getPubUtmHeaderIcon_("plus")}
          </span>
          <span>Crear conjunto</span>
        </button>

        <details class="pubUtmOpsMenu" data-pubutm-ops-menu>
          <summary class="pubUtmOpsMenu__trigger" aria-label="Abrir acciones técnicas">
            <span></span>
            <span></span>
            <span></span>
          </summary>

          <div class="pubUtmOpsMenu__panel" role="menu" aria-label="Acciones técnicas">
            <button type="button" class="pubUtmOpsMenu__item" role="menuitem" data-pubutm-ops-action="rebuild_audiencias">
              <span class="pubUtmOpsMenu__icon pubUtmOpsMenu__icon--blue" aria-hidden="true">
                ${getPubUtmHeaderIcon_("refresh")}
              </span>
              <span>
                <strong>Rebuild Audiencias</strong>
                <small>Reconstruir lectura de públicos</small>
              </span>
            </button>

            <button type="button" class="pubUtmOpsMenu__item" role="menuitem" data-pubutm-ops-action="rebuild_control">
              <span class="pubUtmOpsMenu__icon pubUtmOpsMenu__icon--violet" aria-hidden="true">
                ${getPubUtmHeaderIcon_("control")}
              </span>
              <span>
                <strong>Rebuild Control</strong>
                <small>Actualizar gobierno y jerarquías</small>
              </span>
            </button>

            <button type="button" class="pubUtmOpsMenu__item" role="menuitem" data-pubutm-ops-action="actualizar_metricas">
              <span class="pubUtmOpsMenu__icon pubUtmOpsMenu__icon--green" aria-hidden="true">
                ${getPubUtmHeaderIcon_("chart")}
              </span>
              <span>
                <strong>Actualizar métricas</strong>
                <small>Forzar lectura del panel</small>
              </span>
            </button>

            <div class="pubUtmOpsMenu__divider"></div>

            <button type="button" class="pubUtmOpsMenu__item" role="menuitem" data-pubutm-ops-action="incidencias">
              <span class="pubUtmOpsMenu__icon pubUtmOpsMenu__icon--orange" aria-hidden="true">
                ${getPubUtmHeaderIcon_("alert")}
              </span>
              <span>
                <strong>Ver incidencias</strong>
                <small>Errores, avisos y señales del motor</small>
              </span>
            </button>

            <div class="pubUtmOpsMenu__meta">
              <strong>Build</strong>
              <span data-pubutm-build>—</span>
            </div>
          </div>
        </details>
      </div>
    </header>
    <!-- FIN · Header premium Publicidad UTM -->

    <!-- INICIO · Diagnóstico premium -->
    <section class="pubUtmHero pubUtmHero--premium" aria-label="Resumen ejecutivo">
      <article class="pubUtmKpi pubUtmKpi--engine">
        <div class="pubUtmKpi__top">
          <span class="pubUtmKpi__icon pubUtmKpi__icon--blue" aria-hidden="true">
            ${getPubUtmHeaderIcon_("engine")}
          </span>
          <div>
            <div class="pubUtmKpi__label">Motor UTM</div>
            <div class="pubUtmKpi__value" data-kpi="estado_motor">—</div>
          </div>
        </div>
        <div class="pubUtmKpi__meta">Cabecera · Detalle · Miembros · Control</div>
      </article>

      <article class="pubUtmKpi">
        <div class="pubUtmKpi__label">Audiencias activas</div>
        <div class="pubUtmKpi__value" data-kpi="audiencias_activas">—</div>
        <div class="pubUtmKpi__meta">Motor automático operativo</div>
      </article>

      <article class="pubUtmKpi">
        <div class="pubUtmKpi__label">Atómicas</div>
        <div class="pubUtmKpi__value" data-kpi="audiencias_atomicas">—</div>
        <div class="pubUtmKpi__meta">Bloques base por patrón</div>
      </article>

      <article class="pubUtmKpi">
        <div class="pubUtmKpi__label">Compuestas</div>
        <div class="pubUtmKpi__value" data-kpi="audiencias_compuestas">—</div>
        <div class="pubUtmKpi__meta">Cruces entre familias útiles</div>
      </article>

      <article class="pubUtmKpi">
        <div class="pubUtmKpi__label">Conjuntos</div>
        <div class="pubUtmKpi__value" data-kpi="conjuntos_personalizados">—</div>
        <div class="pubUtmKpi__meta">Públicos reutilizables</div>
      </article>

      <article class="pubUtmKpi">
        <div class="pubUtmKpi__label">Miembros</div>
        <div class="pubUtmKpi__value" data-kpi="miembros_totales">—</div>
        <div class="pubUtmKpi__meta">Usuarios detectados</div>
      </article>

      <article class="pubUtmKpi pubUtmKpi--lastUpdate">
        <div class="pubUtmKpi__label">Última actualización</div>
        <div class="pubUtmKpi__value" data-kpi="ultima_actualizacion">—</div>
        <div class="pubUtmKpi__meta">Marca operativa del ecosistema</div>
      </article>
    </section>
    <!-- FIN · Diagnóstico premium -->

    <!-- INICIO · Tabs premium -->
    <nav class="pubUtmTabs pubUtmTabs--premium" aria-label="Secciones de Publicidad UTM">
      <button class="pubUtmTab is-active" type="button" data-tab-target="audiencias">
        <span class="pubUtmTab__icon" aria-hidden="true">${getPubUtmHeaderIcon_("audience")}</span>
        <span>Audiencias</span>
      </button>

      <button class="pubUtmTab" type="button" data-tab-target="conjuntos">
        <span class="pubUtmTab__icon" aria-hidden="true">${getPubUtmHeaderIcon_("utm")}</span>
        <span>Parámetros UTM</span>
      </button>

      <button class="pubUtmTab" type="button" data-tab-target="control">
        <span class="pubUtmTab__icon" aria-hidden="true">${getPubUtmHeaderIcon_("control")}</span>
        <span>Control</span>
      </button>
    </nav>
    <!-- FIN · Tabs premium -->

    <!-- INICIO · Panel Audiencias -->
    <section class="pubUtmTabPanel is-active" data-tab-panel="audiencias">
      <article class="pubUtmCard pubUtmCard--full pubUtmAudienceToolbarCard">
        <div class="pubUtmToolbar">
          <div class="pubUtmSearchWrap">
            <input
              class="pubUtmSearch"
              type="text"
              placeholder="Buscar por nombre, origen o tipo..."
              disabled
            />
          </div>

          <div class="pubUtmFilters">
            <button class="pubUtmFilter is-active" type="button" data-audience-type="todas">Todas</button>
            <button class="pubUtmFilter" type="button" data-audience-type="atomica">Atómicas</button>
            <button class="pubUtmFilter" type="button" data-audience-type="compuesta">Compuestas</button>
            <button class="pubUtmFilter" type="button" data-audience-type="derivada">Derivadas</button>
          </div>
        </div>
      </article>

      <div class="pubUtmConjuntosAudienceMount" data-pubutm-conjuntos-list></div>
      <div class="pubUtmAudienceGrid" data-pubutm-audiences-list></div>
    </section>
    <!-- FIN · Panel Audiencias -->

    <!-- INICIO · Panel Parámetros UTM -->
    <section class="pubUtmTabPanel" data-tab-panel="conjuntos"></section>
    <!-- FIN · Panel Parámetros UTM -->

    <!-- INICIO · Panel Control -->
    <section class="pubUtmTabPanel" data-tab-panel="control"></section>
    <!-- FIN · Panel Control -->


    <!-- INICIO · Footer global Publicidad UTM -->
    <footer class="pubUtmGlobalFooter" data-pubutm-global-footer>
      <nav class="pubUtmGlobalFooter__nav" aria-label="Enlaces legales y soporte">
        <a href="/legal/terminos-de-servicio.html" class="pubUtmGlobalFooter__link">
          Términos de servicio
        </a>

        <a href="/legal/politicas-de-privacidad.html" class="pubUtmGlobalFooter__link">
          Políticas de privacidad
        </a>

        <a href="/legal/seguridad-y-datos.html" class="pubUtmGlobalFooter__link">
          Seguridad y datos
        </a>

        <a href="/panel/ayuda.html" class="pubUtmGlobalFooter__link">
          Centro de ayuda
        </a>

        <a href="/panel/estado-sistema.html" class="pubUtmGlobalFooter__link">
          Estado del sistema
        </a>
      </nav>

      <div class="pubUtmGlobalFooter__meta">
        <span>Protocol Data System</span>
        <span>Publicidad UTM</span>
        <span data-pubutm-footer-year></span>
      </div>
    </footer>
    <!-- FIN · Footer global Publicidad UTM -->


    <!-- INICIO · Mounts slides Publicidad UTM -->
    <div id="pubUtmSlideMount" class="pubUtmSlideMount"></div>
    <div id="pubUtmSubSlideMount" class="pubUtmSlideMount"></div>
    <!-- FIN · Mounts slides Publicidad UTM -->
  `;
}

/* =========================================================
   INICIO · Publicidad UTM · Tabs dentro del header
   Mueve los tabs existentes al lado izquierdo de Crear conjunto.
   No cambia data-tab-target ni lógica de navegación.
   ========================================================= */

   function ensurePubUtmTabsInHeader_(root) {
    if (!root) return;
  
    const headerActions = root.querySelector(".pubUtmHeaderPremium__actions");
    const tabs = root.querySelector(".pubUtmTabs--premium, .pubUtmTabs");
  
    if (!headerActions || !tabs) return;
  
    root.classList.add("pubUtmPage--tabsInHeader");
  
    let slot = headerActions.querySelector("[data-pubutm-header-tabs-slot]");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "pubUtmHeaderTabsSlot";
      slot.setAttribute("data-pubutm-header-tabs-slot", "1");
      headerActions.insertBefore(slot, headerActions.firstElementChild);
    }
  
    if (!slot.contains(tabs)) {
      slot.appendChild(tabs);
    }
  }
  
  /* =========================================================
     FIN · Publicidad UTM · Tabs dentro del header
     ========================================================= */

function bindPubUtmOpsMenu_(root) {
  if (!root || root.dataset.pubutmOpsMenuBound === "1") return;
  root.dataset.pubutmOpsMenuBound = "1";

  document.addEventListener("click", function (ev) {
    if (ev.target.closest("[data-pubutm-ops-menu]")) return;

    root.querySelectorAll("[data-pubutm-ops-menu]").forEach(function (node) {
      node.removeAttribute("open");
    });
  });

  root.querySelectorAll("[data-pubutm-ops-action]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const action = btn.getAttribute("data-pubutm-ops-action") || "";
      const menu = btn.closest("[data-pubutm-ops-menu]");

      if (menu) menu.removeAttribute("open");

      console.log("[Publicidad UTM · acción técnica]", action);
    };
  });
}

/* INICIO · Footer global Publicidad UTM */
function syncPubUtmGlobalFooter_(root) {
  if (!root) return;

  const yearNode = root.querySelector("[data-pubutm-footer-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}
/* FIN · Footer global Publicidad UTM */

function getPubUtmHeaderIcon_(type) {
  const key = String(type || "").trim().toLowerCase();

  const icons = {
    plus: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
    `,
    refresh: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M18.5 8.2A7 7 0 1 0 19 15M18.5 8.2V4.75M18.5 8.2h-3.45" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    control: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5 7h14M7.5 12h9M10 17h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
      </svg>
    `,
    chart: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5.75 18.25V6.75M5.75 18.25h12.5M9.25 15.25v-4M12 15.25V8M14.75 15.25v-2.5M17.5 15.25V9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    alert: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 8.25v4.5M12 16.25h.01M10.2 4.85 3.9 16.2A2 2 0 0 0 5.65 19h12.7a2 2 0 0 0 1.75-2.8L13.8 4.85a2.05 2.05 0 0 0-3.6 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    engine: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.75 14.1 7.2l4 .95-.28 4.1 2.68 3.1-2.68 3.1.28 4.1-4 .95L12 20.25 9.9 23.5l-4-.95.28-4.1-2.68-3.1 2.68-3.1-.28-4.1 4-.95L12 3.75Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path>
        <path d="M12 9.25a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" stroke="currentColor" stroke-width="1.6"></path>
      </svg>
    `,
    audience: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8.75 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.75 10.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19c0-3.1 2.2-5.25 4.25-5.25S13 15.9 13 19M13.25 14.25c.65-.42 1.5-.65 2.5-.65 2.05 0 3.75 1.75 3.75 4.65" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    utm: `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 7.5h10M7 12h10M7 16.5h6M4.75 5.75A1.75 1.75 0 0 1 6.5 4h11A1.75 1.75 0 0 1 19.25 5.75v12.5A1.75 1.75 0 0 1 17.5 20h-11a1.75 1.75 0 0 1-1.75-1.75V5.75Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `
  };

  return icons[key] || icons.engine;
}

/* =========================================================
   FIN · Shell visual premium · Publicidad UTM
   ========================================================= */

 /* INICIO · ensureMounts_ · Montajes Publicidad UTM */
function ensureMounts_(root) {
  ensureAudienciasMount_(root);
  ensureConjuntosAudienciasMount_(root);
  ensureAudienceSetCreatorSlide_(root);
  ensureAudienceComparisonSlide_(root);
  ensureAudienceDetailSlide_(root);
  ensureAudienceSetDetailSlide_(root);
  ensureAudienceSetMembersSlide_(root);
  ensureControlMount_(root);
  ensureCamposMount_(root);
  ensureCampoEditorSlide_(root);
  ensureValoresSlides_(root);
  ensureReglasAudienciasEntryPoint_(root);
  ensureReglasAudienciasSlide_(root);
  ensureReglasAudienciasEditorSlide_(root);
}
/* FIN · ensureMounts_ · Montajes Publicidad UTM */

  function ensureAudienciasMount_(root) {
    const audPanel = findTabPanel_(root, "audiencias");
    if (!audPanel) return;

    if (!audPanel.querySelector("[data-pubutm-audience-set-entry]")) {
      audPanel.insertAdjacentHTML("afterbegin", `
        <article class="pubUtmCard pubUtmCard--full pubUtmAudienceSetEntry" data-pubutm-audience-set-entry>
          <div class="pubUtmCard__head">
            <div>
              <div class="pubUtmCard__eyebrow">Biblioteca de públicos</div>
              <h2 class="pubUtmCard__title">Conjuntos de audiencias</h2>
            </div>

            <div class="pubUtmHeader__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-open-create-set="1">
                Crear conjunto de audiencias
              </button>
            </div>
          </div>

          <p class="pubUtmPanelSlide__text">
            Agrupá audiencias atómicas y compuestas en contenedores comerciales reutilizables.
            El conjunto no queda atado a una campaña: queda listo para email, remarketing,
            recompra, cross sell, experimentos o publicidad interna.
          </p>
        </article>
      `);
    }

    if (!root.querySelector('[data-pubutm-audiences-list]')) {
      const mount = document.createElement("div");
      mount.className = "pubUtmAudienceGrid";
      mount.setAttribute("data-pubutm-audiences-list", "1");
      audPanel.appendChild(mount);
    }
  }

/* INICIO · ensureConjuntosAudienciasMount_ · Biblioteca de conjuntos */
function ensureConjuntosAudienciasMount_(root) {
  const audPanel = findTabPanel_(root, "audiencias");
  if (!audPanel) return;

  if (audPanel.querySelector("[data-pubutm-conjuntos-list]")) return;

  const mount = document.createElement("div");
  mount.className = "pubUtmConjuntosAudienceMount";
  mount.setAttribute("data-pubutm-conjuntos-list", "1");

  const audiencesMount = audPanel.querySelector("[data-pubutm-audiences-list]");

  if (audiencesMount) {
    audPanel.insertBefore(mount, audiencesMount);
  } else {
    audPanel.appendChild(mount);
  }
}
/* FIN · ensureConjuntosAudienciasMount_ · Biblioteca de conjuntos */


    /* INICIO · ensureAudienceSetCreatorSlide_ · Slide crear conjunto */
/* INICIO · ensureAudienceSetCreatorSlide_ · Slide crear conjunto */
/* INICIO · ensureAudienceSetCreatorSlide_ · Slide crear conjunto */
function ensureAudienceSetCreatorSlide_(root) {
  if (root.querySelector("[data-pubutm-audience-set-slide]")) return;

  const mount = root.querySelector("#pubUtmSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmFieldSlide pubUtmAudienceSetSlide" data-pubutm-audience-set-slide aria-hidden="true">
      <div class="pubUtmFieldSlide__backdrop" data-audience-set-close="1"></div>

      <div class="pubUtmFieldSlide__panel">
        <div class="pubUtmFieldSlide__head pubUtmAudienceSetSlide__head">
          <div>
            <div class="pubUtmCard__eyebrow">Conjuntos de audiencias</div>
            <h2 class="pubUtmCard__title">Crear conjunto de audiencias</h2>
          </div>

          <div class="pubUtmHeader__actions pubUtmAudienceSetHeaderActions">
            <input
              class="pubUtmFieldControl pubUtmAudienceSetHeaderSearch"
              type="search"
              data-audience-set-search
              placeholder="Buscar audiencia..."
              autocomplete="off"
            />

            <button
              type="button"
              class="pubUtmBtn pubUtmBtn--primary"
              data-audience-set-save
              disabled
              title="Completá los datos del conjunto y seleccioná al menos una audiencia."
            >
              Crear conjunto
            </button>

            <button
              type="button"
              class="pubUtmBtn pubUtmBtn--ghost"
              data-audience-set-close="1"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div class="pubUtmFieldSlide__body pubUtmAudienceSetSlide__body">
          <div class="pubUtmAudienceSetLayout">
            <aside class="pubUtmAudienceSetPanel">
              <section class="pubUtmAudienceSetPanel__section" data-audience-set-section="definition">
                <div class="pubUtmCard__eyebrow">Definición</div>
                <h3 class="pubUtmCard__title">Datos del conjunto</h3>

                <div class="pubUtmAudienceSetForm">
                  <label class="pubUtmAudienceSetForm__field">
                    <span>Nombre del conjunto</span>
                    <input
                      class="pubUtmFieldControl"
                      type="text"
                      name="nombre_conjunto"
                      data-audience-set-form-field
                      placeholder="Ej: Dolor cervical · Remarketing educativo"
                    />
                  </label>

                  <label class="pubUtmAudienceSetForm__field">
                    <span>Objetivo comercial</span>
                    <input
                      class="pubUtmFieldControl"
                      type="text"
                      name="objetivo_comercial"
                      data-audience-set-form-field
                      placeholder="Ej: Preparar público para campaña de email"
                    />
                  </label>

                  <label class="pubUtmAudienceSetForm__field">
                    <span>Descripción</span>
                    <textarea
                      class="pubUtmFieldControl"
                      name="descripcion_conjunto"
                      data-audience-set-form-field
                      rows="3"
                      placeholder="Explicá para qué sirve este conjunto y cuándo debería utilizarse."
                    ></textarea>
                  </label>

                  <div class="pubUtmAudienceSetForm__grid">
                  <label class="pubUtmAudienceSetForm__field">
                  <span>Clasificación comercial</span>
                  <select class="pubUtmFieldControl" name="canal_sugerido" data-audience-set-form-field>
                    <option value="recompra">Recompra</option>
                    <option value="cross_sell">Cross sell</option>
                    <option value="upsell">Upsell</option>
                    <option value="fidelizacion">Fidelización</option>
                    <option value="reactivacion">Reactivación</option>
                    <option value="educacion_post_compra">Educación post-compra</option>
                    <option value="experimentacion">Experimentación</option>
                    <option value="mayorista_volumen">Mayorista / volumen</option>
                  </select>
                </label>

                    <label class="pubUtmAudienceSetForm__field">
                      <span>Prioridad</span>
                      <select class="pubUtmFieldControl" name="prioridad_conjunto" data-audience-set-form-field>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                        <option value="baja">Baja</option>
                      </select>
                    </label>
                  </div>

                  <div class="pubUtmAudienceSetForm__notice" data-audience-set-form-notice>
                    Completá los datos y seleccioná al menos una audiencia para habilitar el guardado.
                  </div>
                </div>
              </section>

              <div class="pubUtmAudienceSetPanel__divider"></div>

              <section class="pubUtmAudienceSetPanel__section" data-audience-set-section="selection">
                <div class="pubUtmCard__eyebrow">Selección</div>
                <h3 class="pubUtmCard__title">Audiencias seleccionadas</h3>

                <div data-audience-set-selected>
                  <p class="pubUtmPanelSlide__text">Todavía no seleccionaste audiencias.</p>
                </div>
              </section>

              <div class="pubUtmAudienceSetPanel__divider"></div>

              <section class="pubUtmAudienceSetPanel__section" data-audience-set-section="preview">
                <div class="pubUtmCard__eyebrow">Preview operativo</div>
                <h3 class="pubUtmCard__title">Cruce preliminar</h3>

                <div data-audience-set-preview>
                  <p class="pubUtmPanelSlide__text">
                    Seleccioná audiencias para ver el resumen preliminar del conjunto.
                  </p>
                </div>
              </section>
            </aside>

            <section class="pubUtmAudienceSetMain">
              <div class="pubUtmAudienceSetListScroll">
                <div data-audience-set-list>
                  <div class="pubUtmLoadingChip">Cargando audiencias...</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </aside>
  `);

  attachAudienceSetCreatorEvents_(root);
}
/* FIN · ensureAudienceSetCreatorSlide_ · Slide crear conjunto */


/* INICIO · ensureAudienceComparisonSlide_ · Sub-slide comparar audiencias */
function ensureAudienceComparisonSlide_(root) {
  if (root.querySelector("[data-pubutm-audience-comparison-slide]")) return;

  const mount =
    root.querySelector("#pubUtmSubSlideMount") ||
    root.querySelector("#pubUtmSlideMount") ||
    root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmAudienceComparisonSlide" data-pubutm-audience-comparison-slide aria-hidden="true">
      <div class="pubUtmAudienceComparisonSlide__backdrop" data-audience-comparison-close="1"></div>

      <div class="pubUtmAudienceComparisonSlide__panel">
        <div class="pubUtmAudienceComparisonSlide__head">
          <div class="pubUtmAudienceComparisonSlide__identity">
            <span class="pubUtmAudienceComparisonSlide__icon" aria-hidden="true">
              ${getAudienceComparisonIcon_()}
            </span>

            <div>
              <div class="pubUtmCard__eyebrow">Comparación operativa</div>
              <h2 class="pubUtmCard__title" data-audience-comparison-title>
                Comparación de audiencias
              </h2>
              <p class="pubUtmAudienceComparisonSlide__subtitle" data-audience-comparison-subtitle>
                Análisis preliminar antes de crear un conjunto.
              </p>
            </div>
          </div>

          <!-- INICIO · Acciones header comparador · Botones con ícono -->
<div class="pubUtmHeader__actions pubUtmAudienceComparisonSlide__actions">
  <button type="button" class="pubUtmBtn pubUtmBtn--ghost pubUtmAudienceComparisonHeaderBtn" data-audience-comparison-close="1">
    <span class="pubUtmAudienceComparisonHeaderBtn__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M15.5 6.75 10.25 12l5.25 5.25M10.75 12h8.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </span>
    <span>Volver al constructor</span>
  </button>

  <button type="button" class="pubUtmBtn pubUtmBtn--primary pubUtmAudienceComparisonHeaderBtn" data-audience-comparison-use>
    <span class="pubUtmAudienceComparisonHeaderBtn__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5.75 12.25h8.75M11.25 7l5.25 5.25-5.25 5.25" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </span>
    <span>Usar estas audiencias</span>
  </button>
</div>
<!-- FIN · Acciones header comparador · Botones con ícono -->
        </div>

        <div class="pubUtmAudienceComparisonSlide__body" data-audience-comparison-content>
          <div class="pubUtmLoadingChip">Seleccioná dos o más audiencias para comparar.</div>
        </div>
      </div>
    </aside>
  `);

  attachAudienceComparisonSlideEvents_(root);
}
/* FIN · ensureAudienceComparisonSlide_ · Sub-slide comparar audiencias */


/* INICIO · Eventos · Comparador de audiencias */
function attachAudienceComparisonSlideEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-comparison-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-audience-comparison-close]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceComparisonSlide_(root);
    };
  });

  const useBtn = slide.querySelector("[data-audience-comparison-use]");
  if (useBtn) {
    useBtn.onclick = function () {
      closeAudienceComparisonSlide_(root);
    };
  }
}

function bindAudienceComparisonOpenControls_(root) {
  if (!root) return;

  root.querySelectorAll("[data-audience-comparison-open]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      openAudienceComparisonSlide_(root);
    };
  });
}

/* INICIO · openAudienceComparisonSlide_ · Abre comparador y carga parámetros compartidos */
/* INICIO · openAudienceComparisonSlide_ · Abre comparador y carga parámetros compartidos */
function openAudienceComparisonSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-comparison-slide]");
  if (!slide) return;


  const selected = getSelectedAudiencesForSet_();


  if (selected.length < 2) {
    alert("Seleccioná al menos 2 audiencias para comparar.");
    return;
  }


  STATE.audienceComparisonPayload = null;
  STATE.audienceComparisonLoading = false;
  STATE.audienceComparisonError = "";
  STATE.audienceComparisonSelectedParam = null;
  STATE.audienceComparisonDateRange = getAudienceComparisonDefaultDateRange_();
  STATE.audienceComparisonRequestKey = "";


  renderAudienceComparisonSlide_(root);


  slide.classList.add("is-open");
  slide.setAttribute("aria-hidden", "false");


  const main = root.closest("main") || root;
  main.classList.add("pubUtmComparisonOpen");


  loadAudienceComparisonParamData_(root, null);
}
/* FIN · openAudienceComparisonSlide_ · Abre comparador y carga parámetros compartidos */
/* FIN · openAudienceComparisonSlide_ · Abre comparador y carga parámetros compartidos */

function closeAudienceComparisonSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-comparison-slide]");
  if (!slide) return;

  slide.classList.remove("is-open");
  slide.setAttribute("aria-hidden", "true");

  const main = root.closest("main") || root;
  main.classList.remove("pubUtmComparisonOpen");
}
/* FIN · Eventos · Comparador de audiencias */


/* INICIO · ensureAudienceDetailSlide_ · Slide detalle de audiencia */
function ensureAudienceDetailSlide_(root) {
  if (root.querySelector("[data-pubutm-audience-detail-slide]")) return;

  const mount = root.querySelector("#pubUtmSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmAudienceDetailSlide" data-pubutm-audience-detail-slide aria-hidden="true">
      <div class="pubUtmAudienceDetailSlide__backdrop" data-audience-detail-close="1"></div>

      <div class="pubUtmAudienceDetailSlide__panel">
      <!-- INICIO · Header rediseñado · Detalle de audiencia -->
      <div class="pubUtmAudienceDetailSlide__head pubUtmAudienceDetailSlide__head--strategic">
        <div class="pubUtmAudienceDetailHeader">
          <div class="pubUtmAudienceDetailHeader__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" fill="currentColor"></path>
              <path d="M4.75 19.25c0-3.17 3.54-5.25 7.25-5.25s7.25 2.08 7.25 5.25v.75H4.75v-.75Z" fill="currentColor"></path>
            </svg>
          </div>
      
          <div class="pubUtmAudienceDetailSlide__headCopy">
            <div class="pubUtmCard__eyebrow" data-audience-detail-eyebrow>Detalle de audiencia</div>
            <h2 class="pubUtmCard__title pubUtmAudienceDetailHeader__title" data-audience-detail-title>Audiencia</h2>
            <p class="pubUtmAudienceDetailHeader__subtitle" data-audience-detail-subtitle>
              Lectura comercial y técnica de esta audiencia.
            </p>
            <div class="pubUtmAudienceDetailSlide__badges" data-audience-detail-badges></div>
          </div>
        </div>
      
        <div class="pubUtmHeader__actions pubUtmAudienceDetailHeader__actions">
          <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-audience-detail-create-set>
            Crear conjunto con esta audiencia
          </button>
      
          <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-audience-detail-close="1">
            Cerrar
          </button>
        </div>
      </div>
      <!-- FIN · Header rediseñado · Detalle de audiencia -->

        <div class="pubUtmAudienceDetailSlide__body">
          <aside class="pubUtmAudienceDetailSlide__side">
            <section class="pubUtmAudienceDetailBlock">
              <div class="pubUtmCard__eyebrow">Resumen comercial</div>
              <h3 class="pubUtmAudienceDetailBlock__title">Qué representa este público</h3>
              <p class="pubUtmAudienceDetailBlock__text" data-audience-detail-summary>
                Seleccioná una audiencia para ver su lectura comercial.
              </p>
            </section>

            <section class="pubUtmAudienceDetailBlock">
              <div class="pubUtmCard__eyebrow">Indicadores</div>
              <div class="pubUtmAudienceDetailKpis" data-audience-detail-kpis></div>
            </section>

            <section class="pubUtmAudienceDetailBlock">
              <div class="pubUtmCard__eyebrow">Acciones recomendadas</div>
              <div class="pubUtmAudienceDetailActions" data-audience-detail-actions></div>
            </section>
          </aside>

          <section class="pubUtmAudienceDetailSlide__main">
            <article class="pubUtmAudienceDetailCard" data-audience-detail-composition></article>
            <article class="pubUtmAudienceDetailCard" data-audience-detail-members></article>
            <article class="pubUtmAudienceDetailCard" data-audience-detail-origin></article>
            <article class="pubUtmAudienceDetailCard" data-audience-detail-relations></article>
          </section>
        </div>
      </div>
    </aside>
  `);

  attachAudienceDetailSlideEvents_(root);
}
/* FIN · ensureAudienceDetailSlide_ · Slide detalle de audiencia */

/* INICIO · ensureAudienceSetDetailSlide_ · Slide detalle operativo de conjunto */
function ensureAudienceSetDetailSlide_(root) {
  if (root.querySelector("[data-pubutm-audience-set-detail-slide]")) return;

  const mount = root.querySelector("#pubUtmSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmAudienceSetDetailSlide pubUtmAudienceSetDetailSlide--operational" data-pubutm-audience-set-detail-slide aria-hidden="true">
      <div class="pubUtmAudienceSetDetailSlide__backdrop" data-set-detail-close="1"></div>

      <div class="pubUtmAudienceSetDetailSlide__panel">
        <div class="pubUtmAudienceSetDetailSlide__head">
          <div class="pubUtmAudienceSetDetailSlide__headCopy">
            <div class="pubUtmCard__eyebrow" data-set-detail-eyebrow>Detalle de conjunto</div>
            <h2 class="pubUtmCard__title" data-set-detail-title>Conjunto de audiencias</h2>

            <div class="pubUtmSetDetailHeaderMeta">
              <div data-set-detail-channel></div>
              <div class="pubUtmAudienceDetailSlide__badges" data-set-detail-badges></div>
            </div>
          </div>

          <div class="pubUtmHeader__actions">
            <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-set-detail-create-derived>
              Crear variante
            </button>

            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-set-detail-close="1">
              Cerrar
            </button>
          </div>
        </div>

        <div class="pubUtmAudienceSetDetailSlide__body pubUtmSetDetailOperationalBody">
          <aside class="pubUtmAudienceSetDetailSlide__side pubUtmSetDetailSide">
            <section class="pubUtmSetDetailHero">
              <div class="pubUtmCard__eyebrow">Resumen comercial</div>
              <h3 class="pubUtmSetDetailHero__title">Qué representa este conjunto</h3>
              <p class="pubUtmSetDetailHero__text" data-set-detail-summary>
                Seleccioná un conjunto para ver su lectura comercial.
              </p>
            </section>

            <section class="pubUtmSetDetailSideBlock">
              <div class="pubUtmCard__eyebrow">Indicadores</div>
              <div class="pubUtmSetDetailKpis" data-set-detail-kpis></div>
            </section>

            <section class="pubUtmSetDetailSideBlock">
              <div class="pubUtmCard__eyebrow">Usuarios</div>
              <div data-set-detail-users></div>
            </section>

            <section class="pubUtmSetDetailSideBlock">
              <div class="pubUtmCard__eyebrow">Acciones recomendadas</div>
              <div class="pubUtmAudienceDetailActions" data-set-detail-actions></div>
            </section>
          </aside>

          <section class="pubUtmAudienceSetDetailSlide__main pubUtmSetDetailMain">
            <article class="pubUtmSetDetailCard" data-set-detail-audiences></article>
            <article class="pubUtmSetDetailCard" data-set-detail-raw-audiences></article>
            <article class="pubUtmSetDetailCard" data-set-detail-members></article>
            <article class="pubUtmSetDetailCard" data-set-detail-origin></article>
          </section>
        </div>
      </div>
    </aside>
  `);

  attachAudienceSetDetailSlideEvents_(root);
}
/* FIN · ensureAudienceSetDetailSlide_ · Slide detalle operativo de conjunto */

/* INICIO · ensureAudienceSetMembersSlide_ · Sub-slide miembros del conjunto */
function ensureAudienceSetMembersSlide_(root) {
  if (root.querySelector("[data-pubutm-audience-set-members-slide]")) return;

  const mount = root.querySelector("#pubUtmSubSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmAudienceSetMembersSlide" data-pubutm-audience-set-members-slide aria-hidden="true">
      <div class="pubUtmAudienceSetMembersSlide__backdrop" data-set-members-close="1"></div>

      <div class="pubUtmAudienceSetMembersSlide__panel">
        <div class="pubUtmAudienceSetMembersSlide__head">
        <div class="pubUtmAudienceSetMembersSlide__headCopy">
        <div class="pubUtmAudienceSetMembersSlide__titleRow">
          <span class="pubUtmAudienceSetMembersSlide__titleIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 12.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" fill="currentColor"></path>
              <path d="M4.75 19.25c0-3.17 3.54-5.25 7.25-5.25s7.25 2.08 7.25 5.25v.75H4.75v-.75Z" fill="currentColor"></path>
            </svg>
          </span>
      
          <div class="pubUtmAudienceSetMembersSlide__titleCopy">
            <div class="pubUtmCard__eyebrow" data-set-members-eyebrow>Miembros del conjunto</div>
            <h2 class="pubUtmCard__title" data-set-members-title>Miembros</h2>
          </div>
        </div>
      
        <div class="pubUtmAudienceSetMembersSlide__badges" data-set-members-badges></div>
      </div>

          <div class="pubUtmHeader__actions">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-set-members-close="1">
              Volver al detalle
            </button>

            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-set-members-close="1">
              Cerrar
            </button>
          </div>
        </div>

        <div class="pubUtmAudienceSetMembersSlide__body">
          <aside class="pubUtmAudienceSetMembersSlide__side">
            <section class="pubUtmSetMembersSideBlock">
              <div class="pubUtmCard__eyebrow">Resumen</div>
              <div class="pubUtmSetMembersSummaryGrid" data-set-members-summary></div>
            </section>

            <section class="pubUtmSetMembersSideBlock">
              <div class="pubUtmCard__eyebrow">Audiencias incluidas</div>
              <div class="pubUtmSetMembersAudienceList" data-set-members-audiences></div>
            </section>
          </aside>

          <section class="pubUtmAudienceSetMembersSlide__main">
            <div class="pubUtmSetMembersToolbar">
              <div class="pubUtmSetMembersSearchWrap">
                <input
                  type="search"
                  class="pubUtmFieldControl pubUtmSetMembersSearch"
                  data-set-members-search
                  placeholder="Buscar por nombre, email, pedido o audiencia..."
                  autocomplete="off"
                />
              </div>

              <div class="pubUtmSetMembersTabs" role="tablist" aria-label="Vista de miembros">
                <button type="button" class="pubUtmSetMembersTab is-active" data-set-members-tab="por_audiencia">
                  Por audiencia
                </button>
                <button type="button" class="pubUtmSetMembersTab" data-set-members-tab="todos">
                  Todos
                </button>
                <button type="button" class="pubUtmSetMembersTab" data-set-members-tab="solapados">
                  Solapados
                </button>
              </div>
            </div>

            <div class="pubUtmSetMembersContent" data-set-members-content>
              <div class="pubUtmLoadingChip">Cargando miembros...</div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  `);

  attachAudienceSetMembersSlideEvents_(root);
}
/* FIN · ensureAudienceSetMembersSlide_ · Sub-slide miembros del conjunto */


  /* INICIO · ensureControlMount_ · Centro visual de gobierno UTM */
function ensureControlMount_(root) {
  const controlPanel = findTabPanel_(root, "control");
  if (!controlPanel) return;

  if (controlPanel.querySelector("[data-pubutm-control-workspace]")) return;

  controlPanel.innerHTML = `
    <section class="pubUtmControlWorkspace" data-pubutm-control-workspace>

      <!-- INICIO · Control · Header operativo -->
      <article class="pubUtmControlHero">
        <div class="pubUtmControlHero__identity">
          <span class="pubUtmControlHero__icon" aria-hidden="true">
            ${getPubUtmHeaderIcon_("control")}
          </span>

          <div class="pubUtmControlHero__copy">
            <div class="pubUtmCard__eyebrow">Gobierno del motor UTM</div>
            <h2>Control del motor</h2>
            <p>
              Supervisá la calidad de las audiencias generadas automáticamente:
              estructura, jerarquía, derivaciones, solapamientos, bloqueos y prioridad operativa.
            </p>
          </div>
        </div>

        <div class="pubUtmControlHero__actions">
          <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-control-action="issues">
            Ver incidencias
          </button>

          <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-control-action="reload">
            Actualizar control
          </button>
        </div>
      </article>
      <!-- FIN · Control · Header operativo -->


      <!-- INICIO · Control · KPIs de salud -->
      <section class="pubUtmControlHealthGrid" data-pubutm-control-health>
        <article class="pubUtmControlSkeletonCard"></article>
        <article class="pubUtmControlSkeletonCard"></article>
        <article class="pubUtmControlSkeletonCard"></article>
        <article class="pubUtmControlSkeletonCard"></article>
      </section>
      <!-- FIN · Control · KPIs de salud -->


      <!-- INICIO · Control · Diagnóstico -->
      <article class="pubUtmControlDiagnosis" data-pubutm-control-diagnosis>
        <div class="pubUtmControlDiagnosis__icon" aria-hidden="true">
          ${getPubUtmHeaderIcon_("engine")}
        </div>

        <div>
          <div class="pubUtmCard__eyebrow">Lectura operativa</div>
          <h3>Analizando control del motor...</h3>
          <p>Cuando cargue la información, vas a ver una lectura clara del estado del sistema.</p>
        </div>
      </article>
      <!-- FIN · Control · Diagnóstico -->


      <!-- INICIO · Control · Incidencias -->
      <article class="pubUtmControlIssues" data-pubutm-control-issues>
        <div class="pubUtmControlIssues__head">
          <div>
            <div class="pubUtmCard__eyebrow">Incidencias detectadas</div>
            <h3>Alertas del motor</h3>
          </div>
        </div>

        <div class="pubUtmControlIssues__body">
          <p class="pubUtmPanelSlide__text">Cargando señales de control...</p>
        </div>
      </article>
      <!-- FIN · Control · Incidencias -->


      <!-- INICIO · Control · Tabla operativa -->
      <article class="pubUtmControlTableCard">
        <div class="pubUtmControlTableCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Auditoría de audiencias</div>
            <h3>Tabla de control</h3>
            <p>
              Revisá qué audiencias están correctas, cuáles requieren atención y dónde puede haber
              ruido operativo antes de usarlas comercialmente.
            </p>
          </div>

          <div class="pubUtmControlTableCard__counter" data-control-visible-count>
            —
          </div>
        </div>

        <div class="pubUtmControlToolbar">
          <div class="pubUtmControlSearch">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10.75 18.25a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="m16.25 16.25 4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>

            <input
              type="search"
              data-control-search
              placeholder="Buscar audiencia, estructura, nivel, bloque o prioridad..."
              autocomplete="off"
            />
          </div>

          <div class="pubUtmControlFilters" aria-label="Filtros de control">
            <button type="button" class="is-active" data-control-filter="todos">Todas</button>
            <button type="button" data-control-filter="problemas">Con problemas</button>
            <button type="button" data-control-filter="riesgo">Riesgo alto</button>
            <button type="button" data-control-filter="solapamiento">Solapamiento</button>
            <button type="button" data-control-filter="sin_prioridad">Sin prioridad</button>
            <button type="button" data-control-filter="derivadas">Derivadas</button>
            <button type="button" data-control-filter="compuestas">Compuestas</button>
            <button type="button" data-control-filter="bloqueadas">Bloqueadas</button>
          </div>
        </div>

        <div class="pubUtmControlTableScroll">
        <table class="pubUtmControlTable">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Audiencia</th>
              <th>Estructura</th>
              <th>Nivel</th>
              <th>Derivada de</th>
              <th>Solapamiento</th>
              <th>Bloque</th>
              <th>Prioridad</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody data-pubutm-control-body>
            <tr>
              <td colspan="9">Cargando control…</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pubUtmControlPagination" data-control-pagination hidden></div>
      </article>
      <!-- FIN · Control · Tabla operativa -->

    </section>
  `;
}
/* FIN · ensureControlMount_ · Centro visual de gobierno UTM */

  /* INICIO · ensureCamposMount_ · Panel operativo Parámetros UTM */
/* INICIO · ensureCamposMount_ · Parámetros UTM con centro de gobierno */
function ensureCamposMount_(root) {
  const camposPanel = findTabPanel_(root, "conjuntos");
  if (!camposPanel) return;

  if (camposPanel.querySelector("[data-pubutm-fields-body]")) return;

  camposPanel.innerHTML = `
    <section class="pubUtmParamsWorkspace">

      <!-- INICIO · Centro de gobierno UTM -->
      <article class="pubUtmParamsCommandCenter">
        <div class="pubUtmParamsCommandCenter__head">
          <div class="pubUtmParamsCommandCenter__copy">
            <div class="pubUtmCard__eyebrow">Centro de gobierno UTM</div>
            <h2>Parámetros UTM</h2>
            <p>
              Administrá qué señales acepta el sistema, qué valores son válidos y qué reglas
              convierten combinaciones de familias en audiencias automáticas.
            </p>
          </div>

          <div class="pubUtmParamsCommandCenter__actions">
            <button class="pubUtmBtn pubUtmBtn--ghost" type="button" data-reglas-open>
              Ver reglas
            </button>

            <button class="pubUtmBtn pubUtmBtn--ghost" type="button" data-reglas-new>
              Nueva regla
            </button>

            <button class="pubUtmBtn pubUtmBtn--ghost" type="button" data-field-action="values-global">
              Nuevo valor
            </button>

            <button class="pubUtmBtn pubUtmBtn--primary" type="button" data-field-action="new">
              Nuevo campo
            </button>
          </div>
        </div>

        <div class="pubUtmParamsCommandCenter__grid">
          <section class="pubUtmParamsCommandPanel pubUtmParamsCommandPanel--dictionary">
            <div class="pubUtmParamsCommandPanel__head">
              <span class="pubUtmParamsCommandPanel__icon" aria-hidden="true">
                ${getPubUtmHeaderIcon_("utm")}
              </span>

              <div>
                <strong>Diccionario UTM</strong>
                <p>Campos, familias, tipos y catálogos que el motor puede reconocer.</p>
              </div>
            </div>

            <div class="pubUtmParamsCommandStats">
              <div>
                <span>Campos activos</span>
                <strong data-pubutm-fields-active-count>—</strong>
              </div>

              <div>
                <span>Familias válidas</span>
                <strong data-pubutm-fields-family-count>—</strong>
              </div>

              <div>
                <span>Tipos válidos</span>
                <strong data-pubutm-fields-type-count>—</strong>
              </div>

              <div>
                <span>Con catálogo</span>
                <strong data-pubutm-fields-catalog-count>—</strong>
              </div>
            </div>
          </section>

          <section class="pubUtmParamsCommandPanel pubUtmParamsCommandPanel--rules">
            <div class="pubUtmParamsCommandPanel__head">
              <span class="pubUtmParamsCommandPanel__icon" aria-hidden="true">
                ${getPubUtmHeaderIcon_("control")}
              </span>

              <div>
                <strong>Reglas de audiencia</strong>
                <p>Definen cuándo una combinación de familias merece convertirse en audiencia automática.</p>
              </div>
            </div>

            <div class="pubUtmParamsCommandStats pubUtmParamsCommandStats--rules">
              <div>
                <span>Reglas activas</span>
                <strong data-reglas-entry-active>—</strong>
              </div>

              <div>
                <span>Con técnico</span>
                <strong data-reglas-entry-tech>—</strong>
              </div>

              <div>
                <span>Advertencias</span>
                <strong data-reglas-entry-warnings>—</strong>
              </div>
            </div>
          </section>
        </div>
      </article>
      <!-- FIN · Centro de gobierno UTM -->


      <!-- INICIO · Biblioteca de campos -->
      <article class="pubUtmParamsLibrary">
        <div class="pubUtmParamsLibrary__head">
          <div>
            <div class="pubUtmCard__eyebrow">Campos permitidos</div>
            <h3>Biblioteca de campos UTM</h3>
            <p>
              Cada tarjeta representa un campo que el motor puede reconocer, validar y usar para construir lógica comercial.
            </p>
          </div>
        </div>

        <div class="pubUtmParamsToolbar">
          <div class="pubUtmParamsSearch">
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10.75 18.25a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="m16.25 16.25 4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </span>

            <input
              type="search"
              data-parametros-search
              placeholder="Buscar campo, nombre, familia o descripción..."
              autocomplete="off"
            />
          </div>

          <div class="pubUtmParamsFilterGroup" aria-label="Filtrar por tipo">
            <button type="button" data-parametros-type-filter="todos" class="is-active">Todos</button>
            <button type="button" data-parametros-type-filter="categoria">Categoría</button>
            <button type="button" data-parametros-type-filter="id">ID</button>
            <button type="button" data-parametros-type-filter="texto">Texto</button>
          </div>
        </div>

        <div class="pubUtmParamsFamilyFilters" data-parametros-family-filters></div>

        <div class="pubUtmParamsCardsGrid" data-pubutm-fields-body>
          <div class="pubUtmLoadingChip">Cargando campos permitidos...</div>
        </div>
      </article>
      <!-- FIN · Biblioteca de campos -->


      <!-- INICIO · Catálogos -->
      <article class="pubUtmParamsCatalog">
        <div class="pubUtmCard__eyebrow">Catálogos</div>
        <h3>Gobierno de la configuración</h3>

        <div class="pubUtmParamsCatalog__grid">
          <div>
            <strong>Familias válidas</strong>
            <span data-pubutm-catalog-families>—</span>
          </div>

          <div>
            <strong>Tipos válidos</strong>
            <span data-pubutm-catalog-types>—</span>
          </div>

          <div>
            <strong>Defaults de creación</strong>
            <span data-pubutm-defaults-summary>—</span>
          </div>
        </div>
      </article>
      <!-- FIN · Catálogos -->

    </section>
  `;
}
/* FIN · ensureCamposMount_ · Parámetros UTM con centro de gobierno */
/* FIN · ensureCamposMount_ · Panel operativo Parámetros UTM */

    /* INICIO · loadAllPubUtmData_ · Apps Script + Supabase audiencias */
function loadAllPubUtmData_(root) {
  if (STATE.loading) return;
  STATE.loading = true;

  renderLoadingState_(root);

  const apiBase = resolveApiBase_();
  if (!apiBase) {
    STATE.loading = false;
    renderFatalState_(root, "No encontré la URL del backend para Publicidad UTM.");
    return;
  }

  Promise.all([
    jsonpRequest_(apiBase, { action: "getPublicidadUtmDashboard" }),
    jsonpRequest_(apiBase, { action: "getPublicidadUtmCamposConfig" }),

    /* INICIO · Supabase · Conjuntos UTM para panel */
    loadPublicidadUtmConjuntosSupabase_().catch(function (err) {
      return {
        ok: false,
        source: "rpc_panel_utm_listar_conjuntos",
        error: String(err || "No se pudo cargar conjuntos desde Supabase.")
      };
    }),
    /* FIN · Supabase · Conjuntos UTM para panel */

    jsonpRequest_(apiBase, { action: "getPublicidadUtmDashboardPlus" }),

    /* INICIO · Supabase · Audiencias automáticas para panel */
    loadPublicidadUtmAudienciasSupabase_().catch(function (err) {
      return {
        ok: false,
        source: "rpc_panel_utm_listar_audiencias",
        error: String(err || "No se pudo cargar audiencias desde Supabase.")
      };
    })
    /* FIN · Supabase · Audiencias automáticas para panel */
  ])
    .then(function (responses) {
      STATE.loading = false;

      const dashboardRes = responses[0];
      const camposRes = responses[1];
      const conjuntosRes = responses[2];
      const dashboardPlusRes = responses[3];
      const audienciasSupabaseRes = responses[4];

      if (!dashboardRes || dashboardRes.ok !== true) {
        renderFatalState_(
          root,
          (dashboardRes && dashboardRes.error)
            ? dashboardRes.error
            : "No se pudo cargar el dashboard UTM."
        );
        return;
      }

      if (!camposRes || camposRes.ok !== true) {
        renderFatalState_(
          root,
          (camposRes && camposRes.error)
            ? camposRes.error
            : "No se pudo cargar la configuración de campos."
        );
        return;
      }

      /* INICIO · Supabase · Inyectar audiencias automáticas en dashboard */
      if (
        audienciasSupabaseRes &&
        audienciasSupabaseRes.ok === true &&
        Array.isArray(audienciasSupabaseRes.items)
      ) {
        const audienciasSupabase = normalizePublicidadUtmAudienciasSupabase_(
          audienciasSupabaseRes.items
        );

        dashboardRes.audiencias = audienciasSupabase;
        dashboardRes.audiencias_source = "supabase";
        dashboardRes.supabase_audiencias = {
          source: audienciasSupabaseRes.source || "rpc_panel_utm_listar_audiencias",
          total: audienciasSupabaseRes.total || audienciasSupabase.length,
          limit: audienciasSupabaseRes.limit || audienciasSupabase.length,
          offset: audienciasSupabaseRes.offset || 0,
          filters: audienciasSupabaseRes.filters || {}
        };

        dashboardRes.summary = patchPublicidadUtmSummaryFromSupabase_(
          dashboardRes.summary || {},
          audienciasSupabaseRes,
          audienciasSupabase
        );

        console.info(
          "[Publicidad UTM] Audiencias cargadas desde Supabase:",
          audienciasSupabase.length,
          "de",
          audienciasSupabaseRes.total
        );
      } else {
        console.warn(
          "[Publicidad UTM] Supabase no devolvió audiencias. Se mantiene fallback Apps Script:",
          audienciasSupabaseRes && audienciasSupabaseRes.error
            ? audienciasSupabaseRes.error
            : audienciasSupabaseRes
        );
      }
      /* FIN · Supabase · Inyectar audiencias automáticas en dashboard */

      STATE.dashboard = dashboardRes;
      STATE.camposConfig = camposRes;

      /* INICIO · Dashboard Plus · Métricas superiores */
      if (dashboardPlusRes && dashboardPlusRes.ok === true && dashboardPlusRes.data) {
        STATE.dashboardPlus = dashboardPlusRes.data;

        dashboardRes.dashboard_plus = dashboardPlusRes.data;
        dashboardRes.summary_plus = dashboardPlusRes.data.kpis || {};

        if (dashboardPlusRes.data.summary_patch) {
          dashboardRes.summary = Object.assign(
            {},
            dashboardRes.summary || {},
            dashboardPlusRes.data.summary_patch
          );
        }
      } else {
        STATE.dashboardPlus = null;

        console.warn(
          "[Publicidad UTM] No se pudo cargar Dashboard Plus:",
          dashboardPlusRes && dashboardPlusRes.error ? dashboardPlusRes.error : dashboardPlusRes
        );
      }
           /* FIN · Dashboard Plus · Métricas superiores */

      /* INICIO · Supabase · Reaplicar métricas de audiencias al hero */
      if (
        audienciasSupabaseRes &&
        audienciasSupabaseRes.ok === true &&
        Array.isArray(dashboardRes.audiencias)
      ) {
        dashboardRes.summary = patchPublicidadUtmSummaryFromSupabase_(
          dashboardRes.summary || {},
          audienciasSupabaseRes,
          dashboardRes.audiencias
        );

        if (STATE.dashboardPlus) {
          syncPublicidadUtmDashboardPlusFromSupabase_(
            STATE.dashboardPlus,
            dashboardRes.summary,
            dashboardRes.audiencias
          );
        }
      }
      /* FIN · Supabase · Reaplicar métricas de audiencias al hero */

            /* INICIO · Supabase · Inyectar conjuntos UTM en panel */
            if (
              conjuntosRes &&
              conjuntosRes.ok === true &&
              Array.isArray(conjuntosRes.items)
            ) {
              const conjuntosSupabase = normalizePublicidadUtmConjuntosSupabase_(
                conjuntosRes.items
              );
      
              STATE.conjuntosAudiencias = buildPublicidadUtmConjuntosPayloadSupabase_(
                conjuntosRes,
                conjuntosSupabase
              );
      
              dashboardRes.summary = patchPublicidadUtmSummaryFromConjuntosSupabase_(
                dashboardRes.summary || {},
                STATE.conjuntosAudiencias
              );
      
              console.info(
                "[Publicidad UTM] Conjuntos cargados desde Supabase:",
                conjuntosSupabase.length,
                "de",
                conjuntosRes.total
              );
            } else if (conjuntosRes && conjuntosRes.ok === true && Array.isArray(conjuntosRes.conjuntos)) {
              STATE.conjuntosAudiencias = conjuntosRes;
            } else {
              STATE.conjuntosAudiencias = {
                ok: true,
                action: "rpc_panel_utm_listar_conjuntos",
                source: "supabase_fallback_empty",
                summary: {
                  total_conjuntos: 0,
                  conjuntos_activos: 0,
                  conjuntos_borrador: 0,
                  miembros_unicos_acumulados: 0,
                  facturacion_asociada_acumulada: 0
                },
                conjuntos: []
              };
      
              dashboardRes.summary = patchPublicidadUtmSummaryFromConjuntosSupabase_(
                dashboardRes.summary || {},
                STATE.conjuntosAudiencias
              );
      
              console.warn(
                "[Publicidad UTM] No se pudieron cargar conjuntos desde Supabase:",
                conjuntosRes && conjuntosRes.error ? conjuntosRes.error : conjuntosRes
              );
            }
            /* FIN · Supabase · Inyectar conjuntos UTM en panel */

      renderDashboard_(root, dashboardRes);
      renderCamposConfig_(root, camposRes);
    })
    .catch(function (err) {
      STATE.loading = false;
      renderFatalState_(root, String(err || "Error desconocido al cargar Publicidad UTM."));
    });
}
/* FIN · loadAllPubUtmData_ · Apps Script + Supabase audiencias */
 /* INICIO · resolveApiBase_ · URL backend actual Publicidad UTM */
function resolveApiBase_() {
  return "https://script.google.com/macros/s/AKfycbzWXNLU9lgF-DtqL-5_x19EwgzV9ok_6t8wsTwcaBzPggNrAciC5IXsRl9Q9NoO6fE/exec";
}
/* FIN · resolveApiBase_ · URL backend actual Publicidad UTM */

  function jsonpRequest_(baseUrl, params) {
    return new Promise(function (resolve, reject) {
      const callbackName = "__pubUtmCb_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
      const script = document.createElement("script");
      const search = new URLSearchParams();

      Object.keys(params || {}).forEach(function (key) {
        search.set(key, params[key]);
      });

      search.set("callback", callbackName);
      search.set("_ts", String(Date.now()));

      const sep = baseUrl.indexOf("?") >= 0 ? "&" : "?";
      const src = baseUrl + sep + search.toString();

      let settled = false;

      window[callbackName] = function (payload) {
        if (settled) return;
        settled = true;
        cleanup_();
        resolve(payload);
      };

      script.onerror = function () {
        if (settled) return;
        settled = true;
        cleanup_();
        reject(new Error("Falló la carga JSONP del backend."));
      };

      function cleanup_() {
        try { delete window[callbackName]; } catch (e) {}
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.src = src;
      document.head.appendChild(script);

      setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup_();
        reject(new Error("Timeout al consultar el backend de Publicidad UTM."));
      }, 12000);
    });
  }

/* =========================================================
   INICIO · Supabase · Lectura audiencias automáticas panel
   Fuente: rpc_panel_utm_listar_audiencias
   ========================================================= */

   function loadPublicidadUtmAudienciasSupabase_() {
    const config = resolvePublicidadUtmSupabaseConfig_();
  
    if (!config.ok) {
      return Promise.resolve({
        ok: false,
        source: "rpc_panel_utm_listar_audiencias",
        error: config.error
      });
    }
  
    return supabaseRpcRequest_(config, "rpc_panel_utm_listar_audiencias", {
      p_busqueda: null,
      p_tipo_uso: null,
      p_jerarquia: null,
      p_apto_email: true,
      p_apto_recompra: null,
      p_apto_cross_sell: null,
      p_estado_revision: "aprobado",
      p_estado: "activa",
      p_solo_con_miembros: true,
      p_limit: 200,
      p_offset: 0
    }).then(function (payload) {
      if (!payload || payload.ok !== true) {
        return {
          ok: false,
          source: "rpc_panel_utm_listar_audiencias",
          error: payload && payload.error
            ? payload.error
            : "La RPC de Supabase no devolvió ok=true.",
          raw: payload
        };
      }
  
      return payload;
    });
  }
  
  function resolvePublicidadUtmSupabaseConfig_() {
    const cfg = window.SAZZU_SUPABASE_CONFIG || {};
    const rawUrl = String(cfg.url || "").trim();
    const key = String(cfg.publishableKey || cfg.anonKey || "").trim();
  
    if (!rawUrl) {
      return {
        ok: false,
        error: "No existe window.SAZZU_SUPABASE_CONFIG.url."
      };
    }
  
    if (!key) {
      return {
        ok: false,
        error: "No existe publishableKey/anonKey en window.SAZZU_SUPABASE_CONFIG."
      };
    }
  
    let restBase = rawUrl.replace(/\/+$/, "");
  
    if (!/\/rest\/v1$/i.test(restBase)) {
      restBase = restBase + "/rest/v1";
    }
  
    return {
      ok: true,
      restBase: restBase,
      key: key
    };
  }
  
  function supabaseRpcRequest_(config, rpcName, payload) {
    const url = config.restBase + "/rpc/" + encodeURIComponent(rpcName);
  
    return fetch(url, {
      method: "POST",
      headers: {
        "apikey": config.key,
        "Authorization": "Bearer " + config.key,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload || {})
    }).then(function (res) {
      return res.text().then(function (text) {
        let json = null;
  
        try {
          json = text ? JSON.parse(text) : null;
        } catch (err) {
          json = {
            ok: false,
            error: text || String(err || "Respuesta no JSON desde Supabase.")
          };
        }
  
        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            statusText: res.statusText,
            error: json && json.message
              ? json.message
              : json && json.error
                ? json.error
                : "Error HTTP al consultar Supabase.",
            details: json
          };
        }
  
        return json;
      });
    });
  }
  
  function normalizePublicidadUtmAudienciasSupabase_(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      const condiciones = Array.isArray(item.condiciones_json)
        ? item.condiciones_json
        : [];
  
      const familias = condiciones
        .map(function (c) {
          return String(c.familia_campo || "").trim();
        })
        .filter(Boolean)
        .filter(function (value, index, arr) {
          return arr.indexOf(value) === index;
        });
  
      const campos = condiciones
        .map(function (c) {
          return String(c.campo_utm || "").trim();
        })
        .filter(Boolean);
  
      const valores = condiciones
        .map(function (c) {
          return String(c.valor_utm || "").trim();
        })
        .filter(Boolean);
  
      const condicionesResumen = item.condiciones_texto ||
        condiciones.map(function (c) {
          return [c.campo_utm, c.valor_utm].filter(Boolean).join("=");
        }).filter(Boolean).join(" | ");
  
      const audienciaId = item.audiencia_id || item.id || item.codigo_audiencia || "";
      const miembros = Number(item.miembros_actuales_count || item.clientes_actuales_count || item.emails_actuales_count || 0);
      const clientes = Number(item.clientes_actuales_count || item.miembros_actuales_count || 0);
      const emails = Number(item.emails_actuales_count || item.miembros_actuales_count || 0);
      const ventas = Number(item.ventas_match_count || item.soporte_ventas || 0);
      const facturacion = Number(item.facturacion_total || item.facturacion_miembros_total || 0);
      const ticketPromedio = Number(item.ticket_promedio || 0);
  
      const canal = String(
        item.canal_destino ||
        item.canal_sugerido ||
        item.tipo_uso_sugerido ||
        (item.apto_para_email ? "email" : "publicidad_interna")
      ).trim();
  
      return Object.assign({}, item, {
        audiencia_id: audienciaId,
        id: audienciaId,
  
        codigo_audiencia: item.codigo_audiencia || audienciaId,
        nombre_audiencia: item.nombre_audiencia || item.codigo_audiencia || audienciaId || "Audiencia UTM",
        descripcion_audiencia: item.descripcion_audiencia || condicionesResumen,
  
        tipo_audiencia: item.tipo_audiencia || "automatica",
        tipo_estructura: item.tipo_estructura || "compuesta",
        tipo_visual: item.tipo_visual || item.tipo_estructura || "compuesta",
  
        nivel_operativo: item.nivel_operativo || item.jerarquia_audiencia || "",
        jerarquia_audiencia: item.jerarquia_audiencia || item.nivel_operativo || "",
        prioridad_operativa: item.prioridad_operativa || "media",
  
        canal_destino: canal,
        canal_sugerido: item.canal_sugerido || canal,
        tipo_uso_sugerido: item.tipo_uso_sugerido || canal,
  
        familias_presentes: item.familias_presentes || familias.join(", "),
        campos_presentes: item.campos_presentes || campos.join(", "),
        valores_presentes: item.valores_presentes || valores.join(", "),
  
        condicion_principal: item.condicion_principal || condicionesResumen,
        condiciones_resumen: item.condiciones_resumen || condicionesResumen,
        condiciones_texto: item.condiciones_texto || condicionesResumen,
        condiciones_json: condiciones,
  
        cantidad_miembros: miembros,
        miembros_count: miembros,
        miembros_actuales_count: miembros,
  
        clientes_count: clientes,
        clientes_actuales_count: clientes,
  
        emails_count: emails,
        emails_actuales_count: emails,
  
        ventas_asociadas: ventas,
        ventas_count: ventas,
        ventas_match_count: ventas,
        soporte_ventas: Number(item.soporte_ventas || ventas || 0),
  
        facturacion_asociada: facturacion,
        facturacion_total: facturacion,
        facturacion_miembros_total: Number(item.facturacion_miembros_total || facturacion || 0),
  
        ticket_promedio: ticketPromedio,
        score_audiencia: Number(item.score_audiencia || 0),
  
        fecha_creacion: item.fecha_creacion || "",
        fecha_actualizacion: item.fecha_actualizacion || item.fecha_ultimo_calculo || "",
        fecha_ultimo_calculo: item.fecha_ultimo_calculo || item.fecha_actualizacion || "",
  
        origen_datos: "supabase",
        source_rpc: "rpc_panel_utm_listar_audiencias"
      });
    });
  }
  function patchPublicidadUtmSummaryFromSupabase_(summary, response, audiencias) {
    const items = Array.isArray(audiencias) ? audiencias : [];
    const next = Object.assign({}, summary || {});
  
    const atomicas = items.filter(function (a) {
      return String(a.tipo_estructura || "").toLowerCase().indexOf("atom") !== -1;
    }).length;
  
    const compuestas = items.filter(function (a) {
      return String(a.tipo_estructura || "").toLowerCase().indexOf("comp") !== -1;
    }).length;
  
    const miembrosTotales = items.reduce(function (acc, a) {
      return acc + Number(a.miembros_actuales_count || a.clientes_actuales_count || 0);
    }, 0);
  
    const fechas = items
      .map(function (a) {
        return a.fecha_actualizacion || a.fecha_ultimo_calculo || a.fecha_ultimo_match || "";
      })
      .filter(Boolean)
      .sort();
  
    next.audiencias_activas = Number(response && response.total ? response.total : items.length);
    next.audiencias_atomicas = atomicas;
    next.audiencias_compuestas = compuestas;
    next.miembros_totales = miembrosTotales;
    next.ultima_actualizacion = fechas.length ? fechas[fechas.length - 1] : next.ultima_actualizacion;
    next.estado_motor = next.estado_motor || "Operativo";
  
    return next;
  }
  
  function syncPublicidadUtmDashboardPlusFromSupabase_(plus, summary, audiencias) {
    if (!plus || !summary) return;
  
    const items = Array.isArray(audiencias) ? audiencias : [];
    const miembros = Number(summary.miembros_totales || 0);
  
    plus.kpis = plus.kpis || {};
    plus.kpis.audiencias_activas = Number(summary.audiencias_activas || items.length || 0);
    plus.kpis.audiencias_atomicas = Number(summary.audiencias_atomicas || 0);
    plus.kpis.audiencias_compuestas = Number(summary.audiencias_compuestas || 0);
    plus.kpis.miembros_unicos = miembros;
  
    plus.audiencias = Object.assign({}, plus.audiencias || {}, {
      activas: Number(summary.audiencias_activas || items.length || 0),
      atomicas: Number(summary.audiencias_atomicas || 0),
      compuestas: Number(summary.audiencias_compuestas || 0)
    });
  
    plus.miembros = Object.assign({}, plus.miembros || {}, {
      unicos: miembros,
      brutos: miembros,
      solapados: Number((plus.miembros && plus.miembros.solapados) || 0)
    });
  }

/* =========================================================
   INICIO · Supabase · Lectura conjuntos UTM panel
   Fuente: rpc_panel_utm_listar_conjuntos
   ========================================================= */


/* INICIO · Supabase · Crear conjunto desde panel */
function createPublicidadUtmConjuntoSupabase_(payload) {
  const config = resolvePublicidadUtmSupabaseConfig_();

  if (!config.ok) {
    return Promise.resolve({
      ok: false,
      source: "rpc_panel_utm_crear_conjunto_desde_audiencias",
      error: config.error
    });
  }

  return supabaseRpcRequest_(config, "rpc_panel_utm_crear_conjunto_desde_audiencias", {
    p_payload: payload,
    p_calcular_miembros: true
  }).then(function (res) {
    if (!res || res.ok !== true) {
      return {
        ok: false,
        source: "rpc_panel_utm_crear_conjunto_desde_audiencias",
        error: res && res.error
          ? res.error
          : "No se pudo crear el conjunto desde Supabase.",
        raw: res
      };
    }

    return res;
  });
}

function normalizeAudienceSetObjetivoSupabase_(value) {
  const raw = String(value || "").trim().toLowerCase();

  const map = {
    publicidad_interna: "publicidad_interna",
    email: "email",
    email_marketing: "email",
    recompra: "recompra",
    cross_sell: "cross_sell",
    crosssell: "cross_sell",
    experimento: "experimento",
    test: "experimento",
    mixto: "mixto"
  };

  return map[raw] || "publicidad_interna";
}

function normalizeAudienceSetPrioridadSupabase_(value) {
  const raw = String(value || "").trim().toLowerCase();

  const map = {
    baja: "baja",
    media: "media",
    alta: "alta",
    critica: "critica",
    crítica: "critica"
  };

  return map[raw] || "media";
}

function refreshPublicidadUtmConjuntosAfterCreate_(root) {
  return loadPublicidadUtmConjuntosSupabase_()
    .then(function (res) {
      if (!res || res.ok !== true || !Array.isArray(res.items)) {
        throw new Error(
          res && res.error
            ? res.error
            : "No se pudieron refrescar los conjuntos desde Supabase."
        );
      }

      const conjuntosSupabase = normalizePublicidadUtmConjuntosSupabase_(res.items);

      STATE.conjuntosAudiencias = buildPublicidadUtmConjuntosPayloadSupabase_(
        res,
        conjuntosSupabase
      );

      if (STATE.dashboard) {
        STATE.dashboard.summary = patchPublicidadUtmSummaryFromConjuntosSupabase_(
          STATE.dashboard.summary || {},
          STATE.conjuntosAudiencias
        );
      }

      renderConjuntosAudiencias_(root);

      return STATE.conjuntosAudiencias;
    });
}
/* FIN · Supabase · Crear conjunto desde panel */

   function loadPublicidadUtmConjuntosSupabase_() {
    const config = resolvePublicidadUtmSupabaseConfig_();
  
    if (!config.ok) {
      return Promise.resolve({
        ok: false,
        source: "rpc_panel_utm_listar_conjuntos",
        error: config.error
      });
    }
  
    return supabaseRpcRequest_(config, "rpc_panel_utm_listar_conjuntos", {
      p_busqueda: null,
      p_estado: null,
      p_limit: 200,
      p_offset: 0
    }).then(function (payload) {
      if (!payload || payload.ok !== true) {
        return {
          ok: false,
          source: "rpc_panel_utm_listar_conjuntos",
          error: payload && payload.error
            ? payload.error
            : "La RPC de conjuntos no devolvió ok=true.",
          raw: payload
        };
      }
  
      return payload;
    });
  }
  
  function normalizePublicidadUtmConjuntosSupabase_(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      const conjuntoId = item.conjunto_id || item.id || item.codigo_conjunto || "";
      const miembros = Number(
        item.miembros_actuales_count ||
        item.cantidad_miembros_unicos ||
        item.miembros_brutos_count ||
        0
      );
  
      const miembrosBrutos = Number(item.miembros_brutos_count || miembros || 0);
      const miembrosSolapados = Number(item.miembros_solapados_count || 0);
      const audienciasCount = Number(item.audiencias_count || 0);
      const facturacion = Number(item.facturacion_total || item.facturacion_asociada || 0);
  
      const estado = String(item.estado || item.estado_conjunto || "activo").trim();
      const prioridad = String(
        item.prioridad_conjunto ||
        item.prioridad_operativa ||
        "media"
      ).trim();
  
      const canal = String(
        item.canal_sugerido ||
        item.objetivo_comercial ||
        "publicidad_interna"
      ).trim();
  
      return Object.assign({}, item, {
        conjunto_id: conjuntoId,
        id: conjuntoId,
  
        codigo_conjunto: item.codigo_conjunto || conjuntoId,
        nombre_conjunto: item.nombre_conjunto || item.codigo_conjunto || conjuntoId || "Conjunto UTM",
        descripcion_conjunto: item.descripcion_conjunto || "",
  
        tipo_conjunto: item.tipo_conjunto || "manual",
        estado_conjunto: estado,
        estado: estado,
        estado_revision: item.estado_revision || "aprobado",
  
        canal_sugerido: canal,
        objetivo_comercial: item.objetivo_comercial || canal,
  
        prioridad_conjunto: prioridad,
        prioridad_operativa: item.prioridad_operativa || prioridad,
  
        cantidad_miembros_unicos: miembros,
        miembros_actuales_count: miembros,
        miembros_brutos_count: miembrosBrutos,
        miembros_solapados_count: miembrosSolapados,
  
        audiencias_count: audienciasCount,
  
        facturacion_asociada: facturacion,
        facturacion_total: facturacion,
        ticket_promedio: Number(item.ticket_promedio || 0),
  
        apto_para_email: item.apto_para_email === true,
        apto_para_recompra: item.apto_para_recompra === true,
        apto_para_cross_sell: item.apto_para_cross_sell === true,
        apto_para_experimento: item.apto_para_experimento === true,
  
        fecha_creacion: item.fecha_creacion || "",
        fecha_actualizacion: item.fecha_actualizacion || item.fecha_ultimo_calculo || "",
        fecha_ultimo_calculo: item.fecha_ultimo_calculo || item.fecha_actualizacion || "",
  
        origen_datos: "supabase",
        source_rpc: "rpc_panel_utm_listar_conjuntos"
      });
    });
  }
  
  function buildPublicidadUtmConjuntosPayloadSupabase_(response, conjuntos) {
    const items = Array.isArray(conjuntos) ? conjuntos : [];
  
    const activos = items.filter(function (c) {
      return normalizeConjuntoSearchText_(c.estado_conjunto || c.estado || "").indexOf("activo") !== -1;
    }).length;
  
    const borrador = items.filter(function (c) {
      const estado = normalizeConjuntoSearchText_(c.estado_conjunto || c.estado || "");
      return estado.indexOf("borrador") !== -1 || estado.indexOf("draft") !== -1;
    }).length;
  
    const miembros = items.reduce(function (acc, c) {
      return acc + Number(c.cantidad_miembros_unicos || c.miembros_actuales_count || 0);
    }, 0);
  
    const facturacion = items.reduce(function (acc, c) {
      return acc + Number(c.facturacion_asociada || c.facturacion_total || 0);
    }, 0);
  
    return {
      ok: true,
      action: "rpc_panel_utm_listar_conjuntos",
      source: response && response.source ? response.source : "vista_utm_conjuntos_actuales",
      total: response && response.total ? Number(response.total) : items.length,
      limit: response && response.limit ? Number(response.limit) : items.length,
      offset: response && response.offset ? Number(response.offset) : 0,
      filters: response && response.filters ? response.filters : {},
      summary: {
        total_conjuntos: response && response.total ? Number(response.total) : items.length,
        conjuntos_activos: activos,
        conjuntos_borrador: borrador,
        miembros_unicos_acumulados: miembros,
        facturacion_asociada_acumulada: facturacion
      },
      conjuntos: items
    };
  }
  
  function patchPublicidadUtmSummaryFromConjuntosSupabase_(summary, conjuntosPayload) {
    const next = Object.assign({}, summary || {});
    const payload = conjuntosPayload || {};
    const summaryConjuntos = payload.summary || {};
  
    next.conjuntos_personalizados = Number(summaryConjuntos.total_conjuntos || 0);
  
    return next;
  }
  
  /* =========================================================
     FIN · Supabase · Lectura conjuntos UTM panel
     ========================================================= */

     /* INICIO · Supabase · Miembros reales de conjunto */
function loadPublicidadUtmMiembrosConjuntoSupabase_(conjuntoId, busqueda) {
  const config = resolvePublicidadUtmSupabaseConfig_();
  const rawId = String(conjuntoId || "").trim();

  if (!rawId) {
    return Promise.resolve({
      ok: false,
      source: "rpc_panel_utm_listar_miembros_conjunto",
      error: "Falta conjunto_id para cargar miembros."
    });
  }

  if (!config.ok) {
    return Promise.resolve({
      ok: false,
      source: "rpc_panel_utm_listar_miembros_conjunto",
      error: config.error
    });
  }

  const isCodigoConjunto = /^CONJ-/i.test(rawId);

  return supabaseRpcRequest_(config, "rpc_panel_utm_listar_miembros_conjunto", {
    p_conjunto_id: isCodigoConjunto ? null : rawId,
    p_codigo_conjunto: isCodigoConjunto ? rawId : null,
    p_busqueda: busqueda || null,
    p_limit: 500,
    p_offset: 0
  }).then(function (payload) {
    if (!payload || payload.ok !== true) {
      return {
        ok: false,
        source: "rpc_panel_utm_listar_miembros_conjunto",
        error: payload && payload.error
          ? payload.error
          : "La RPC de miembros del conjunto no devolvió ok=true.",
        raw: payload
      };
    }

    return normalizePublicidadUtmMiembrosConjuntoSupabase_(payload);
  });
}

function normalizePublicidadUtmMiembrosConjuntoSupabase_(payload) {
  const data = payload || {};
  const conjunto = data.conjunto || {};
  const summary = data.summary || {};

  const conjuntoId = String(
    data.conjunto_id ||
    conjunto.conjunto_id ||
    conjunto.id ||
    ""
  ).trim();

  const codigoConjunto = String(
    data.codigo_conjunto ||
    conjunto.codigo_conjunto ||
    ""
  ).trim();

  const miembrosUnicos = Array.isArray(data.miembros_unicos)
    ? data.miembros_unicos
    : [];

  const miembrosSolapados = Array.isArray(data.miembros_solapados)
    ? data.miembros_solapados
    : [];

  const audiencias = Array.isArray(data.audiencias)
    ? data.audiencias
    : [];

  return Object.assign({}, data, {
    ok: true,
    source: data.source || "rpc_panel_utm_listar_miembros_conjunto",

    conjunto_id: conjuntoId,
    codigo_conjunto: codigoConjunto,

    conjunto: Object.assign({}, conjunto, {
      conjunto_id: conjuntoId || conjunto.conjunto_id || "",
      codigo_conjunto: codigoConjunto || conjunto.codigo_conjunto || "",
      nombre_conjunto: conjunto.nombre_conjunto || codigoConjunto || conjuntoId || "Conjunto UTM"
    }),

    summary: Object.assign({
      miembros_unicos: miembrosUnicos.length,
      miembros_brutos: miembrosUnicos.length + miembrosSolapados.length,
      miembros_solapados: miembrosSolapados.length,
      audiencias_count: audiencias.length,
      ventas_match_count: 0,
      facturacion_total: 0,
      ticket_promedio: 0
    }, summary),

    audiencias: audiencias,
    miembros_unicos: miembrosUnicos,
    miembros_solapados: miembrosSolapados,

    origen_datos: "supabase"
  });
}
/* FIN · Supabase · Miembros reales de conjunto */
  /* =========================================================
     FIN · Supabase · Lectura audiencias automáticas panel
     ========================================================= */


  /* INICIO · renderDashboard_ · Render principal Publicidad UTM */
function renderDashboard_(root, payload) {
  if (root) {
    root.classList.remove("is-loading");
    root.classList.add("is-ready");
  }

  const summary = payload.summary || {};
  const audiencias = Array.isArray(payload.audiencias) ? payload.audiencias : [];
  const control = Array.isArray(payload.control) ? payload.control : [];

  renderSummary_(root, summary);
  renderConjuntosAudiencias_(root);
  renderAudiencias_(root, audiencias);
  renderControl_(root, control);
  renderMeta_(root, payload);

  applyAudienceFilter_(root, STATE.activeFilter);
}
/* FIN · renderDashboard_ · Render principal Publicidad UTM */

function renderSummary_(root, summary) {
  setKpiValue_(root, "audiencias_activas", summary.audiencias_activas);
  setKpiValue_(root, "audiencias_atomicas", summary.audiencias_atomicas);
  setKpiValue_(root, "audiencias_compuestas", summary.audiencias_compuestas);
  setKpiValue_(root, "conjuntos_personalizados", summary.conjuntos_personalizados);
  setKpiValue_(root, "miembros_totales", summary.miembros_totales);
  setKpiValue_(root, "ultima_actualizacion", formatDateTimeAr_(summary.ultima_actualizacion));
  setKpiValue_(root, "estado_motor", summary.estado_motor || "Sin datos");

  /* INICIO · Hero Plus · KPIs enriquecidos */
  renderPubUtmHeroPlus_(root);
  /* FIN · Hero Plus · KPIs enriquecidos */
}


  /* =========================================================
   INICIO · Publicidad UTM · Hero Plus
   Enriquecimiento visual de KPIs superiores con DashboardPlus.
   No mueve tabs, no toca Audiencias y no altera renderDashboard_.
   ========================================================= */

function renderPubUtmHeroPlus_(root) {
  if (!root) return;

  const plus = STATE.dashboardPlus || null;
  if (!plus || !plus.kpis) return;

  const kpis = plus.kpis || {};
  const salud = plus.motor_salud || {};

  renderPubUtmKpiPlusCard_(root, "audiencias_activas", kpis.audiencias_activas, {
    label: "Audiencias activas",
    caption: "Públicos disponibles en el motor"
  });

  renderPubUtmKpiPlusCard_(root, "audiencias_atomicas", kpis.audiencias_atomicas, {
    label: "Atómicas",
    caption: "Señales base detectadas"
  });

  renderPubUtmKpiPlusCard_(root, "audiencias_compuestas", kpis.audiencias_compuestas, {
    label: "Compuestas",
    caption: "Cruces útiles entre familias"
  });

  renderPubUtmKpiPlusCard_(root, "conjuntos_personalizados", kpis.conjuntos_personalizados, {
    label: "Conjuntos",
    caption: "Públicos reutilizables creados"
  });

  renderPubUtmKpiPlusCard_(root, "miembros_totales", kpis.miembros_unicos || plus.miembros, {
    label: "Miembros únicos",
    caption: "Usuarios reales deduplicados",
    secondary: plus.miembros
      ? formatInteger_(plus.miembros.brutos || 0) + " apariciones · " + formatInteger_(plus.miembros.solapados || 0) + " repetidas"
      : ""
  });

  renderPubUtmMotorHealthCard_(root, salud, plus.summary_patch || {});
  hidePubUtmLastUpdateCard_(root);
}

/* =========================================================
   INICIO · Publicidad UTM · KPI compactos + reloj
   ========================================================= */

   function renderPubUtmKpiPlusCard_(root, key, metric, config) {
    const node = root.querySelector('[data-kpi="' + key + '"]');
    if (!node) return;
  
    const card = node.closest(".pubUtmKpi");
    if (!card) return;
  
    const data = metric || {};
    const cfg = config || {};
  
    const delta = Number(data.delta || 0);
    const deltaPct = Number(data.delta_pct || 0);
  
    const lastMovement = formatPubUtmDateLabel_(data.ultima_fecha_movimiento || "");
    const lastUpdate = formatPubUtmDateLabel_(data.ultima_actualizacion || data.ultima_fecha_movimiento || "");
  
    const deltaLabel = delta > 0 ? "+" + formatInteger_(delta) : "0";
    const pctLabel = deltaPct > 0 ? "+" + formatPubUtmPercent_(deltaPct) : "0%";
    const tone = delta > 0 ? "positive" : "neutral";
  
    card.classList.add("pubUtmKpi--plusCompact");
  
    let plusBox = card.querySelector("[data-pubutm-kpi-plus]");
    if (!plusBox) {
      plusBox = document.createElement("div");
      plusBox.className = "pubUtmKpiPlusCompact";
      plusBox.setAttribute("data-pubutm-kpi-plus", "1");
      card.appendChild(plusBox);
    }
  
    plusBox.innerHTML = `
      <div class="pubUtmKpiPlusCompact__metrics">
        <span class="pubUtmKpiPlusCompact__delta pubUtmKpiPlusCompact__delta--${tone}">
          ${escapeHtml_(deltaLabel)}
        </span>
        <span class="pubUtmKpiPlusCompact__pct">
          ${escapeHtml_(pctLabel)}
        </span>
      </div>
  
      <div class="pubUtmKpiPlusCompact__body">
        <strong>${escapeHtml_(cfg.caption || "Indicador")}</strong>
        ${cfg.secondary ? `<small>${escapeHtml_(cfg.secondary)}</small>` : ""}
      </div>
  
      <div class="pubUtmKpiPlusCompact__clockWrap">
        ${buildPubUtmClockTooltipHtml_(lastMovement, lastUpdate)}
      </div>
    `;
  }
  
  function renderPubUtmMotorHealthCard_(root, salud, summaryPatch) {
    const node = root.querySelector('.pubUtmKpi--engine [data-kpi="estado_motor"]');
    if (!node) return;
  
    const card = node.closest(".pubUtmKpi");
    if (!card) return;
  
    const data = salud || {};
    const patch = summaryPatch || {};
  
    const tone = data.tone || "success";
    const estado = data.estado_label || patch.estado_motor || "Estable";
  
    const total = Number(data.total_registros || 0);
    const camposInvalidos = Number(data.campos_invalidos || 0);
    const valoresInvalidos = Number(data.valores_invalidos || 0);
    const bloqueos = Number(data.bloqueos || 0);
  
    const lastValidation = formatPubUtmDateLabel_(data.ultima_validacion || patch.ultima_actualizacion || "");
  
    card.classList.remove("pubUtmKpi--health-success", "pubUtmKpi--health-warning", "pubUtmKpi--health-danger");
    card.classList.add("pubUtmKpi--enginePlusCompact", "pubUtmKpi--health-" + tone);
  
    card.innerHTML = `
      <div class="pubUtmHealthMini">
        <div class="pubUtmHealthMini__top">
          <div class="pubUtmHealthMini__titleGroup">
            <span class="pubUtmHealthMini__eyebrow">VentasDetalle</span>
            <h3>Filtro UTM</h3>
          </div>
  
          <span class="pubUtmHealthMini__state pubUtmHealthMini__state--${tone}">
            ${escapeHtml_(estado)}
          </span>
        </div>
  
        <p class="pubUtmHealthMini__message">
          ${escapeHtml_(data.lectura || "Sin lectura disponible.")}
        </p>
  
        <div class="pubUtmHealthMini__grid">
          <span class="pubUtmHealthMini__pill pubUtmHealthMini__pill--${camposInvalidos > 0 ? "warning" : "success"}">
            ${formatInteger_(camposInvalidos)} campos
          </span>
  
          <span class="pubUtmHealthMini__pill pubUtmHealthMini__pill--${valoresInvalidos > 0 ? "warning" : "success"}">
            ${formatInteger_(valoresInvalidos)} valores
          </span>
  
          <span class="pubUtmHealthMini__pill pubUtmHealthMini__pill--${bloqueos > 0 ? "danger" : "success"}">
            ${formatInteger_(bloqueos)} bloqueos
          </span>
        </div>
  
        <div class="pubUtmHealthMini__foot">
          <span class="pubUtmHealthMini__footText">
            ${formatInteger_(total)} parámetros revisados
          </span>
  
          ${buildPubUtmClockTooltipHtml_("", lastValidation)}
        </div>
      </div>
    `;
  }
  
  function buildPubUtmClockTooltipHtml_(lastMovement, lastUpdate) {
    const lines = [];
  
    if (lastMovement) {
      lines.push(`<span>Último movimiento: ${escapeHtml_(lastMovement)}</span>`);
    }
  
    if (lastUpdate) {
      lines.push(`<span>Actualizado: ${escapeHtml_(lastUpdate)}</span>`);
    }
  
    if (!lines.length) {
      lines.push(`<span>Sin fecha disponible</span>`);
    }
  
    return `
      <button type="button" class="pubUtmKpiClock" aria-label="Ver detalle de fechas">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 6.75v5.1l3.25 1.9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
  
        <span class="pubUtmKpiClock__tooltip">
          ${lines.join("")}
        </span>
      </button>
    `;
  }
  
  /* =========================================================
     FIN · Publicidad UTM · KPI compactos + reloj
     ========================================================= */

function hidePubUtmLastUpdateCard_(root) {
  const node = root.querySelector('[data-kpi="ultima_actualizacion"]');
  if (!node) return;

  const card = node.closest(".pubUtmKpi");
  if (!card) return;

  card.classList.add("pubUtmKpi--lastUpdateHidden");
}

function formatPubUtmDateLabel_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(d);
    } catch (err) {
      return raw;
    }
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return match[3] + "/" + match[2] + "/" + match[1];
  }

  return raw;
}

function formatPubUtmPercent_(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";

  if (Math.abs(n) >= 100) {
    return Math.round(n) + "%";
  }

  return n.toFixed(2).replace(".", ",").replace(",00", "") + "%";
}

/* =========================================================
   FIN · Publicidad UTM · Hero Plus
   ========================================================= */

/* INICIO · Render · Biblioteca unificada de conjuntos de audiencias */
function renderConjuntosAudiencias_(root) {
  const mount = root.querySelector("[data-pubutm-conjuntos-list]");
  if (!mount) return;

  root.classList.add("pubUtmPage--conjuntosUnified");

  const payload = STATE.conjuntosAudiencias || {};
  const summary = payload.summary || {};
  const conjuntosRaw = Array.isArray(payload.conjuntos) ? payload.conjuntos : [];
  const conjuntos = filterConjuntosBiblioteca_(conjuntosRaw);
  const previewConjuntos = conjuntos.slice(0, 6);

  const totalConjuntos = summary.total_conjuntos || conjuntosRaw.length;
  const totalActivos = summary.conjuntos_activos || conjuntosRaw.filter(function (c) {
    return normalizeConjuntoSearchText_(c.estado_conjunto || "").indexOf("activo") !== -1;
  }).length;

  const searchOpen = !!STATE.conjuntosLibrarySearchOpen;
  const searchValue = String(STATE.conjuntosLibrarySearch || "").trim();
  const activeFilter = String(STATE.conjuntosLibraryFilter || "todos").trim();

  ensureConjuntosLibrarySlide_(root);

  mount.innerHTML = `
    <article class="pubUtmCard pubUtmCard--full pubUtmConjuntosShelf pubUtmConjuntosUnifiedCard">
      <div class="pubUtmConjuntosUnified__head">
        <div class="pubUtmConjuntosUnified__copy">
          <div class="pubUtmCard__eyebrow">Biblioteca de públicos</div>
          <h2 class="pubUtmCard__title">Conjuntos de audiencias</h2>
          <p>
            Agrupá audiencias atómicas y compuestas en contenedores comerciales reutilizables.
            El conjunto no queda atado a una campaña: queda listo para email, remarketing,
            recompra, cross sell, experimentos o publicidad interna.
          </p>
        </div>

        <div class="pubUtmConjuntosUnified__actions">
          <button
            type="button"
            class="pubUtmConjuntosViewAllBtn"
            data-conjuntos-library-open
            ${conjuntos.length ? "" : "disabled"}
          >
            <span>Ver todos</span>
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </i>
          </button>

          <button
            type="button"
            class="pubUtmConjuntosUnified__searchToggle ${searchOpen ? "is-active" : ""}"
            data-conjuntos-search-toggle
            aria-label="Abrir buscador de conjuntos"
            aria-expanded="${searchOpen ? "true" : "false"}"
          >
            ${buildConjuntosSearchIcon_()}
          </button>

          <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-open-create-set="1">
            Crear conjunto de audiencias
          </button>
        </div>
      </div>

      <div class="pubUtmConjuntosUnified__searchRow ${searchOpen ? "is-open" : ""}" data-conjuntos-search-row>
        <form class="pubUtmConjuntosUnified__searchForm" data-conjuntos-search-form>
          <div class="pubUtmConjuntosUnified__searchBox">
            <span aria-hidden="true">${buildConjuntosSearchIcon_()}</span>
            <input
              type="search"
              data-conjuntos-search-input
              value="${escapeHtml_(searchValue)}"
              placeholder="Buscar por nombre, ID, canal, prioridad o tipo..."
              autocomplete="off"
            />
          </div>

          <button type="submit" class="pubUtmBtn pubUtmBtn--primary">
            Buscar
          </button>
        </form>
      </div>

      <div class="pubUtmConjuntosUnified__filters">
        <div class="pubUtmConjuntosUnified__filterGroup" aria-label="Filtrar conjuntos">
          ${renderConjuntoLibraryFilterButton_("todos", "Todos", activeFilter)}
          ${renderConjuntoLibraryFilterButton_("atomicas", "Atómicas", activeFilter)}
          ${renderConjuntoLibraryFilterButton_("compuestas", "Compuestas", activeFilter)}
          ${renderConjuntoLibraryFilterButton_("derivadas", "Derivadas", activeFilter)}
        </div>

        <div class="pubUtmConjuntosUnified__meta">
          <span>${formatInteger_(totalConjuntos)} conjuntos</span>
          <span>${formatInteger_(totalActivos)} activos</span>
          ${
            searchValue
              ? `<button type="button" class="pubUtmConjuntosUnified__clearSearch" data-conjuntos-clear-search>
                   Búsqueda: ${escapeHtml_(searchValue)} · limpiar
                 </button>`
              : ""
          }
        </div>
      </div>

      <div class="pubUtmConjuntosUnified__body">
        ${
          previewConjuntos.length
            ? `<div class="pubUtmConjuntosGrid pubUtmConjuntosGrid--unified">
                 ${previewConjuntos.map(renderConjuntoAudienciaCard_).join("")}
               </div>`
            : `<div class="pubUtmConjuntosUnified__empty">
                 <strong>No hay conjuntos para esta búsqueda.</strong>
                 <span>Probá limpiar el buscador o cambiar el filtro seleccionado.</span>
               </div>`
        }

        ${
          conjuntos.length > 6
            ? `
              <div class="pubUtmConjuntosPreviewFoot">
                <span>Mostrando ${formatInteger_(previewConjuntos.length)} de ${formatInteger_(conjuntos.length)} conjuntos.</span>

                <button type="button" data-conjuntos-library-open>
                  Abrir biblioteca completa
                </button>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;

  bindConjuntosBibliotecaUnified_(root, mount);
  bindConjuntosLibraryEvents_(root);

  const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
  if (slide && slide.classList.contains("is-open")) {
    renderConjuntosLibrarySlideContent_(root);
  }
}
/* FIN · Render · Biblioteca unificada de conjuntos de audiencias */


/* =========================================================
   /* =========================================================
   INICIO · Conjuntos de audiencias · Biblioteca completa en slide
   ========================================================= */

function ensureConjuntosLibrarySlide_(root) {
  if (!root) return;
  if (root.querySelector("[data-pubutm-conjuntos-library-slide]")) return;

  const mount = root.querySelector("#pubUtmSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <aside class="pubUtmConjuntosLibrarySlide" data-pubutm-conjuntos-library-slide aria-hidden="true">
      <div class="pubUtmConjuntosLibrarySlide__backdrop" data-conjuntos-library-close="1"></div>

      <div class="pubUtmConjuntosLibrarySlide__panel">
        <header class="pubUtmConjuntosLibrarySlide__head">
          <div class="pubUtmConjuntosLibrarySlide__identity">
            <span class="pubUtmConjuntosLibrarySlide__icon" aria-hidden="true">
              ${getPubUtmHeaderIcon_("audience")}
            </span>

            <div>
              <div class="pubUtmCard__eyebrow">Biblioteca de públicos</div>
              <h2>Todos los conjuntos de audiencias</h2>
              <p>
                Explorá todos los conjuntos comerciales creados para email, remarketing,
                recompra, cross sell, experimentos o publicidad interna.
              </p>
            </div>
          </div>

          <div class="pubUtmHeader__actions">
            <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-open-create-set="1">
              Crear conjunto
            </button>

            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-conjuntos-library-close="1">
              Cerrar
            </button>
          </div>
        </header>

        <section class="pubUtmLibrarySlideTools">
          <div class="pubUtmLibrarySlideTools__row">
            <div class="pubUtmLibrarySlideSearch">
              <button
                type="button"
                class="pubUtmLibrarySlideSearch__toggle"
                data-conjuntos-library-search-toggle
                aria-label="Buscar conjuntos"
                title="Buscar conjuntos"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>

              <div class="pubUtmLibrarySlideSearch__inputWrap">
                <input
                  type="text"
                  value="${escapeHtml_(STATE.conjuntosLibrarySearch || "")}"
                  placeholder="Buscar conjunto, etiqueta o descripción..."
                  data-conjuntos-library-search-input
                />
              </div>
            </div>

            <div class="pubUtmLibraryQuickFilters">
              <button type="button" class="${STATE.conjuntosLibraryFilter === "todos" ? "is-active" : ""}" data-conjuntos-library-filter="todos">Todos</button>
              <button type="button" class="${STATE.conjuntosLibraryFilter === "atomicas" ? "is-active" : ""}" data-conjuntos-library-filter="atomicas">Atómicas</button>
              <button type="button" class="${STATE.conjuntosLibraryFilter === "compuestas" ? "is-active" : ""}" data-conjuntos-library-filter="compuestas">Compuestas</button>
              <button type="button" class="${STATE.conjuntosLibraryFilter === "derivadas" ? "is-active" : ""}" data-conjuntos-library-filter="derivadas">Derivadas</button>
            </div>
          </div>
        </section>

        <main class="pubUtmConjuntosLibrarySlide__body">
          <div data-conjuntos-library-body>
            ${renderConjuntosLibrarySkeletons_()}
          </div>
        </main>
      </div>
    </aside>
  `);
}

function bindConjuntosLibraryEvents_(root) {
  if (!root || root.dataset.conjuntosLibraryEventsBound === "1") return;
  root.dataset.conjuntosLibraryEventsBound = "1";

  root.addEventListener("click", function (ev) {
    const openBtn = ev.target.closest("[data-conjuntos-library-open]");
    if (openBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      openConjuntosLibrarySlide_(root);
      return;
    }

    const closeBtn = ev.target.closest("[data-conjuntos-library-close]");
    if (closeBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      closeConjuntosLibrarySlide_(root);
      return;
    }

    const toggleSearch = ev.target.closest("[data-conjuntos-library-search-toggle]");
    if (toggleSearch) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.conjuntosLibrarySearchOpen = !STATE.conjuntosLibrarySearchOpen;

      const wrap = root.querySelector("[data-pubutm-conjuntos-library-slide] .pubUtmLibrarySlideSearch__inputWrap");
      if (wrap) wrap.classList.toggle("is-open", STATE.conjuntosLibrarySearchOpen);

      if (STATE.conjuntosLibrarySearchOpen) {
        requestAnimationFrame(function () {
          const input = root.querySelector("[data-conjuntos-library-search-input]");
          if (input) input.focus();
        });
      }

      return;
    }

    const filterBtn = ev.target.closest("[data-conjuntos-library-filter]");
    if (filterBtn) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.conjuntosLibraryFilter = String(filterBtn.getAttribute("data-conjuntos-library-filter") || "todos");

      root.querySelectorAll("[data-conjuntos-library-filter]").forEach(function (btn) {
        btn.classList.toggle("is-active", btn === filterBtn);
      });

      const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
      if (slide) slide.setAttribute("data-visible-limit", "25");

      renderConjuntosLibrarySlideContent_(root);
      return;
    }

    const moreBtn = ev.target.closest("[data-conjuntos-library-more]");
    if (moreBtn) {
      ev.preventDefault();
      ev.stopPropagation();

      const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
      if (!slide) return;

      const current = Number(slide.getAttribute("data-visible-limit") || 25);
      slide.setAttribute("data-visible-limit", String(current + 25));

      renderConjuntosLibrarySlideContent_(root);
    }
  });

  root.addEventListener("input", function (ev) {
    const input = ev.target.closest("[data-conjuntos-library-search-input]");
    if (!input) return;

    STATE.conjuntosLibrarySearch = String(input.value || "");

    const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
    if (slide) slide.setAttribute("data-visible-limit", "25");

    renderConjuntosLibrarySlideContent_(root);
  });
}

function openConjuntosLibrarySlide_(root) {
  ensureConjuntosLibrarySlide_(root);

  const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
  const body = root.querySelector("[data-conjuntos-library-body]");
  if (!slide || !body) return;

  slide.classList.add("is-open");
  slide.setAttribute("aria-hidden", "false");
  slide.setAttribute("data-visible-limit", "25");

  root.classList.add("pubUtmConjuntosLibraryStackOpen");

  const main = root.closest("main") || root;
  main.classList.add("pubUtmSlideOpen");

  body.innerHTML = renderConjuntosLibrarySkeletons_();

  clearTimeout(root.__conjuntosLibraryTimer);
  root.__conjuntosLibraryTimer = setTimeout(function () {
    renderConjuntosLibrarySlideContent_(root);
  }, 180);

  syncPubUtmOverlayMode_();
}

function closeConjuntosLibrarySlide_(root) {
  const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
  if (!slide) return;

  slide.classList.remove("is-open");
  slide.setAttribute("aria-hidden", "true");

  root.classList.remove("pubUtmConjuntosLibraryStackOpen");

  const main = root.closest("main") || root;
  main.classList.remove("pubUtmSlideOpen");

  clearTimeout(root.__conjuntosLibraryTimer);

  syncPubUtmOverlayMode_();
}

function renderConjuntosLibrarySlideContent_(root) {
  const slide = root.querySelector("[data-pubutm-conjuntos-library-slide]");
  const body = root.querySelector("[data-conjuntos-library-body]");
  if (!slide || !body) return;

  const payload = STATE.conjuntosAudiencias || {};
  const conjuntosRaw = Array.isArray(payload.conjuntos) ? payload.conjuntos : [];
  const conjuntos = filterConjuntosBiblioteca_(conjuntosRaw);

  const limit = Number(slide.getAttribute("data-visible-limit") || 25);
  const visible = conjuntos.slice(0, limit);
  const hasMore = visible.length < conjuntos.length;

  if (!visible.length) {
    body.innerHTML = `
      <div class="pubUtmConjuntosLibrarySlide__empty">
        No hay conjuntos para la búsqueda o filtro aplicado.
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="pubUtmConjuntosLibrarySlide__meta">
      <strong>${formatInteger_(visible.length)}</strong>
      <span>de ${formatInteger_(conjuntos.length)} conjuntos visibles</span>
    </div>

    <div class="pubUtmConjuntosLibrarySlide__grid">
      ${visible.map(renderConjuntoAudienciaCard_).join("")}
    </div>

    ${
      hasMore
        ? `
          <div class="pubUtmConjuntosLibrarySlide__moreWrap">
            <button type="button" class="pubUtmConjuntosLibrarySlide__more" data-conjuntos-library-more>
              Ver más
            </button>
          </div>
        `
        : `
          <div class="pubUtmConjuntosLibrarySlide__end">
            Llegaste al final de la biblioteca.
          </div>
        `
    }
  `;

  bindConjuntosBibliotecaUnified_(root, body);
}

function renderConjuntosLibrarySkeletons_() {
  return `
    <div class="pubUtmConjuntosLibrarySlide__meta pubUtmConjuntosLibrarySlide__meta--loading">
      <span>Cargando biblioteca de conjuntos...</span>
    </div>

    <div class="pubUtmConjuntosLibrarySkeletonGrid">
      ${Array.from({ length: 9 }).map(function () {
        return `
          <article class="pubUtmConjuntosSkeletonCard">
            <div class="pubUtmConjuntosSkeletonCard__top">
              <span></span>
              <em></em>
            </div>
            <strong></strong>
            <p></p>
            <p></p>
            <div class="pubUtmConjuntosSkeletonCard__stats">
              <i></i><i></i><i></i>
            </div>
            <div class="pubUtmConjuntosSkeletonCard__footer">
              <b></b><b></b>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

/* =========================================================
   FIN · Conjuntos de audiencias · Biblioteca completa en slide
   ========================================================= */


function renderConjuntoLibraryFilterButton_(value, label, activeValue) {
  const active = String(value || "") === String(activeValue || "todos");

  return `
    <button
      type="button"
      class="pubUtmConjuntosUnified__filter ${active ? "is-active" : ""}"
      data-conjuntos-filter="${escapeHtml_(value)}"
    >
      ${escapeHtml_(label)}
    </button>
  `;
}


function filterConjuntosBiblioteca_(conjuntos) {
  const q = normalizeConjuntoSearchText_(STATE.conjuntosLibrarySearch || "");
  const filter = String(STATE.conjuntosLibraryFilter || "todos").trim();

  return (Array.isArray(conjuntos) ? conjuntos : []).filter(function (conjunto) {
    if (!matchesConjuntoLibraryFilter_(conjunto, filter)) return false;

    if (!q) return true;

    const haystack = normalizeConjuntoSearchText_([
      conjunto.conjunto_id,
      conjunto.nombre_conjunto,
      conjunto.descripcion_conjunto,
      conjunto.objetivo_comercial,
      conjunto.tipo_conjunto,
      conjunto.canal_sugerido,
      conjunto.prioridad_conjunto,
      conjunto.estado_conjunto
    ].join(" "));

    return haystack.indexOf(q) !== -1;
  });
}


function matchesConjuntoLibraryFilter_(conjunto, filter) {
  const f = String(filter || "todos").trim();
  if (f === "todos") return true;

  const tipo = normalizeConjuntoSearchText_(conjunto.tipo_conjunto || "");
  const nombre = normalizeConjuntoSearchText_(conjunto.nombre_conjunto || "");
  const descripcion = normalizeConjuntoSearchText_(conjunto.descripcion_conjunto || "");
  const origen = normalizeConjuntoSearchText_(conjunto.origen_conjunto_id || conjunto.conjunto_madre_id || conjunto.es_derivado_de || "");

  const cantidadAudiencias = Number(
    conjunto.cantidad_audiencias ||
    conjunto.audiencias_count ||
    conjunto.total_audiencias ||
    0
  );

  if (f === "atomicas") {
    return tipo.indexOf("atom") !== -1 || cantidadAudiencias === 1;
  }

  if (f === "compuestas") {
    return tipo.indexOf("comp") !== -1 ||
      tipo.indexOf("mixt") !== -1 ||
      cantidadAudiencias > 1;
  }

  if (f === "derivadas") {
    return tipo.indexOf("deriv") !== -1 ||
      tipo.indexOf("variante") !== -1 ||
      nombre.indexOf("deriv") !== -1 ||
      descripcion.indexOf("deriv") !== -1 ||
      !!origen;
  }

  return true;
}


function bindConjuntosBibliotecaUnified_(root, mount) {
  if (!root || !mount) return;

  mount.querySelectorAll("[data-open-create-set]").forEach(function (btn) {
    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      openAudienceSetCreator_(root);
    };
  });

  const searchToggle = mount.querySelector("[data-conjuntos-search-toggle]");
  if (searchToggle) {
    searchToggle.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      STATE.conjuntosLibrarySearchOpen = !STATE.conjuntosLibrarySearchOpen;
      renderConjuntosAudiencias_(root);

      if (STATE.conjuntosLibrarySearchOpen) {
        setTimeout(function () {
          const input = root.querySelector("[data-conjuntos-search-input]");
          if (input) {
            input.focus();
            input.select();
          }
        }, 30);
      }
    };
  }

  const searchForm = mount.querySelector("[data-conjuntos-search-form]");
  if (searchForm) {
    searchForm.onsubmit = function (event) {
      event.preventDefault();

      const input = mount.querySelector("[data-conjuntos-search-input]");
      STATE.conjuntosLibrarySearch = input ? String(input.value || "").trim() : "";
      STATE.conjuntosLibrarySearchOpen = false;

      renderConjuntosAudiencias_(root);
    };
  }

  const clearSearch = mount.querySelector("[data-conjuntos-clear-search]");
  if (clearSearch) {
    clearSearch.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      STATE.conjuntosLibrarySearch = "";
      STATE.conjuntosLibrarySearchOpen = false;

      renderConjuntosAudiencias_(root);
    };
  }

  mount.querySelectorAll("[data-conjuntos-filter]").forEach(function (btn) {
    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      STATE.conjuntosLibraryFilter = btn.getAttribute("data-conjuntos-filter") || "todos";
      renderConjuntosAudiencias_(root);
    };
  });

  mount.querySelectorAll("[data-open-set-detail]").forEach(function (card) {
    card.onclick = function () {
      const conjuntoId = card.getAttribute("data-open-set-detail") || "";
      openAudienceSetDetailSlide_(root, conjuntoId);
    };
  });

  mount.querySelectorAll("[data-set-actions-toggle]").forEach(function (btn) {
    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      const id = btn.getAttribute("data-set-actions-toggle") || "";
      const menu = mount.querySelector(`[data-set-actions-menu="${id}"]`);
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      mount.querySelectorAll("[data-set-actions-menu]").forEach(function (node) {
        node.hidden = true;
      });

      mount.querySelectorAll("[data-set-actions-toggle]").forEach(function (node) {
        node.setAttribute("aria-expanded", "false");
      });

      if (!isOpen && menu) {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      }
    };
  });

  mount.querySelectorAll("[data-set-actions-menu]").forEach(function (menu) {
    menu.onclick = function (event) {
      event.stopPropagation();
    };
  });

  mount.querySelectorAll("[data-set-action]").forEach(function (item) {
    item.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      const action = item.getAttribute("data-set-action") || "";
      const conjuntoId = item.getAttribute("data-set-id") || "";

      mount.querySelectorAll("[data-set-actions-menu]").forEach(function (node) {
        node.hidden = true;
      });

      mount.querySelectorAll("[data-set-actions-toggle]").forEach(function (node) {
        node.setAttribute("aria-expanded", "false");
      });

      if (action === "open") {
        openAudienceSetDetailSlide_(root, conjuntoId);
        return;
      }

      console.log("[Conjunto quick action]", action, conjuntoId);
    };
  });

  if (!window.__pubUtmSetQuickActionsOutsideClose__) {
    document.addEventListener("click", function () {
      document.querySelectorAll("[data-set-actions-menu]").forEach(function (node) {
        node.hidden = true;
      });

      document.querySelectorAll("[data-set-actions-toggle]").forEach(function (node) {
        node.setAttribute("aria-expanded", "false");
      });
    });

    window.__pubUtmSetQuickActionsOutsideClose__ = true;
  }
}


function normalizeConjuntoSearchText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


function buildConjuntosSearchIcon_() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.75 18.25a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="m16.25 16.25 4 4"
        fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

/* INICIO · Render · Card individual de conjunto */
function renderConjuntoAudienciaCard_(c) {
  const conjunto = c || {};
  const channel = getConjuntoChannelInfo_(conjunto.canal_sugerido);
  const priority = getConjuntoPriorityInfo_(conjunto.prioridad_conjunto);
  const isNew = isConjuntoRecentlyCreated_(conjunto.fecha_creacion);
  const members = Number(conjunto.cantidad_miembros_unicos || 0);
  const statusLabel = humanizeLabel_(conjunto.estado_conjunto || "—");
  const typeLabel = humanizeLabel_(conjunto.tipo_conjunto || "conjunto");

  return `
    <article
      class="pubUtmConjuntoCard pubUtmConjuntoCard--folder ${isNew ? "is-new" : ""}"
      data-open-set-detail="${escapeHtml_(conjunto.conjunto_id || "")}"
      title="Abrir conjunto ${escapeHtml_(conjunto.conjunto_id || "")}"
    >
      ${isNew ? `<span class="pubUtmConjuntoCard__newBadge">Nuevo</span>` : ""}

      <div class="pubUtmConjuntoCard__cornerTools">
        <button
          type="button"
          class="pubUtmConjuntoCard__quickBtn"
          data-set-actions-toggle="${escapeHtml_(conjunto.conjunto_id || "")}"
          aria-expanded="false"
          aria-label="Acciones rápidas"
        >
          <span></span><span></span><span></span>
        </button>

        <div class="pubUtmConjuntoCard__quickMenu" data-set-actions-menu="${escapeHtml_(conjunto.conjunto_id || "")}" hidden>
          <button type="button" class="pubUtmConjuntoCard__quickItem" data-set-action="open" data-set-id="${escapeHtml_(conjunto.conjunto_id || "")}">
            <span class="pubUtmConjuntoCard__quickIcon pubUtmConjuntoCard__quickIcon--blue" aria-hidden="true">
              ${getConjuntoQuickActionIcon_("open")}
            </span>
            <span>Abrir conjunto</span>
          </button>

          <button type="button" class="pubUtmConjuntoCard__quickItem" data-set-action="duplicate" data-set-id="${escapeHtml_(conjunto.conjunto_id || "")}">
            <span class="pubUtmConjuntoCard__quickIcon pubUtmConjuntoCard__quickIcon--indigo" aria-hidden="true">
              ${getConjuntoQuickActionIcon_("duplicate")}
            </span>
            <span>Duplicar</span>
          </button>

          <button type="button" class="pubUtmConjuntoCard__quickItem" data-set-action="flow" data-set-id="${escapeHtml_(conjunto.conjunto_id || "")}">
            <span class="pubUtmConjuntoCard__quickIcon pubUtmConjuntoCard__quickIcon--green" aria-hidden="true">
              ${getConjuntoQuickActionIcon_("flow")}
            </span>
            <span>Crear flujo</span>
          </button>

          <div class="pubUtmConjuntoCard__quickDivider"></div>

          <button type="button" class="pubUtmConjuntoCard__quickItem pubUtmConjuntoCard__quickItem--danger" data-set-action="delete" data-set-id="${escapeHtml_(conjunto.conjunto_id || "")}">
            <span class="pubUtmConjuntoCard__quickIcon pubUtmConjuntoCard__quickIcon--red" aria-hidden="true">
              ${getConjuntoQuickActionIcon_("delete")}
            </span>
            <span>Eliminar</span>
          </button>
        </div>

        <span class="pubUtmConjuntoCard__channel pubUtmConjuntoCard__channel--${escapeHtml_(channel.tone)}">
          <span class="pubUtmConjuntoCard__channelIcon" aria-hidden="true">
            ${getAudienceSetSmartSelectIcon_(channel.icon)}
          </span>
          <span>${escapeHtml_(channel.label)}</span>
        </span>
      </div>

      <div class="pubUtmConjuntoCard__head">
        <div class="pubUtmConjuntoCard__identity">
          <span class="pubUtmConjuntoCard__mainIcon" aria-hidden="true">
            ${getConjuntoAudienceIcon_()}
          </span>

          <div class="pubUtmConjuntoCard__identityCopy">
            <span class="pubUtmConjuntoCard__id">${escapeHtml_(conjunto.conjunto_id || "—")}</span>
            <h3>${escapeHtml_(conjunto.nombre_conjunto || "Conjunto sin nombre")}</h3>
          </div>
        </div>
      </div>

      <p class="pubUtmConjuntoCard__description">
        ${escapeHtml_(conjunto.descripcion_conjunto || "Sin descripción")}
      </p>

      <div class="pubUtmConjuntoCard__stats">
        <div>
          <span>Audiencias</span>
          <strong>${formatInteger_(conjunto.cantidad_audiencias || 0)}</strong>
        </div>

        <div>
          <span>Miembros únicos</span>
          <strong>${formatInteger_(members)}</strong>
        </div>

        <div>
          <span>Facturación</span>
          <strong>${formatMoneyAr_(conjunto.facturacion_asociada || 0)}</strong>
        </div>
      </div>

      <div class="pubUtmConjuntoCard__meta">
        <span class="pubUtmConjuntoCard__priority pubUtmConjuntoCard__priority--${escapeHtml_(priority.tone)}">
          ${escapeHtml_(priority.label)}
        </span>
        <span>${escapeHtml_(statusLabel)}</span>
        <span>${escapeHtml_(typeLabel)}</span>
      </div>

      <div class="pubUtmConjuntoCard__footer">
        <div class="pubUtmConjuntoCard__members">
          ${renderConjuntoMembersPreview_(conjunto)}
          <div class="pubUtmConjuntoCard__membersCopy">
            <strong>${formatInteger_(members)} usuarios</strong>
            <span>miembros únicos</span>
          </div>
        </div>

        <div class="pubUtmConjuntoCard__openHint">
          <span>Abrir conjunto</span>
          <em aria-hidden="true">→</em>
        </div>
      </div>
    </article>
  `;
}
/* FIN · Render · Card individual de conjunto */

function getConjuntoChannelInfo_(value) {
  const key = String(value || "").trim().toLowerCase();

  const map = {
    recompra: {
      label: "Recompra",
      icon: "refresh",
      tone: "green"
    },
    cross_sell: {
      label: "Cross sell",
      icon: "nodes",
      tone: "orange"
    },
    upsell: {
      label: "Upsell",
      icon: "arrow_up",
      tone: "blue"
    },
    fidelizacion: {
      label: "Fidelización",
      icon: "heart",
      tone: "pink"
    },
    reactivacion: {
      label: "Reactivación",
      icon: "power",
      tone: "red"
    },
    educacion_post_compra: {
      label: "Educación",
      icon: "book",
      tone: "indigo"
    },
    experimentacion: {
      label: "Experimentación",
      icon: "spark",
      tone: "violet"
    },
    mayorista_volumen: {
      label: "Mayorista",
      icon: "boxes",
      tone: "amber"
    },

    /* Compatibilidad con conjuntos creados antes del cambio */
    email: {
      label: "Email",
      icon: "mail",
      tone: "blue"
    },
    publicidad_interna: {
      label: "Publicidad interna",
      icon: "screen",
      tone: "indigo"
    }
  };

  return map[key] || {
    label: humanizeLabel_(value || "Sin clasificación"),
    icon: "spark",
    tone: "slate"
  };
}

function getConjuntoPriorityInfo_(value) {
  const key = String(value || "").trim().toLowerCase();

  const map = {
    alta: {
      label: "Prioridad alta",
      tone: "high"
    },
    media: {
      label: "Prioridad media",
      tone: "medium"
    },
    baja: {
      label: "Prioridad baja",
      tone: "low"
    }
  };

  return map[key] || {
    label: humanizeLabel_(value || "Sin prioridad"),
    tone: "neutral"
  };
}

function isConjuntoRecentlyCreated_(fechaCreacion) {
  const raw = String(fechaCreacion || "").trim();
  if (!raw) return false;

  const createdAt = new Date(raw).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const now = Date.now();
  const diff = now - createdAt;
  const max = 48 * 60 * 60 * 1000;

  return diff >= 0 && diff <= max;
}

function renderConjuntoMembersPreview_(conjunto) {
  const count = Math.max(0, Number(conjunto && conjunto.cantidad_miembros_unicos ? conjunto.cantidad_miembros_unicos : 0));
  const audiences = Array.isArray(conjunto && conjunto.audiencias) ? conjunto.audiencias : [];
  const baseNames = audiences
    .map(function (item) {
      return item.nombre_audiencia_snapshot ||
        (item.audiencia_actual && item.audiencia_actual.nombre_audiencia) ||
        item.audiencia_id ||
        "";
    })
    .filter(Boolean);

  const avatarCount = Math.max(1, Math.min(4, count || baseNames.length || 1));
  const names = [];

  for (let i = 0; i < avatarCount; i += 1) {
    names.push(baseNames[i] || buildConjuntoAvatarFallbackName_(conjunto, i));
  }

  const remaining = Math.max(0, count - avatarCount);

  return `
    <div class="pubUtmConjuntoCard__avatars" aria-hidden="true">
      ${names.map(function (name, idx) {
        return `
          <span class="pubUtmConjuntoCard__avatar pubUtmConjuntoCard__avatar--${idx + 1}">
            ${escapeHtml_(getConjuntoInitial_(name))}
          </span>
        `;
      }).join("")}
      ${remaining > 0 ? `<span class="pubUtmConjuntoCard__avatar pubUtmConjuntoCard__avatar--more">+${formatInteger_(remaining)}</span>` : ""}
    </div>
  `;
}

function buildConjuntoAvatarFallbackName_(conjunto, index) {
  const source = String((conjunto && conjunto.nombre_conjunto) || (conjunto && conjunto.conjunto_id) || "Usuario");
  const parts = source.split(/\s+/g).filter(Boolean);

  if (parts[index]) return parts[index];

  const fallback = ["Cliente", "Usuario", "Perfil", "Lead"];
  return fallback[index] || "Usuario";
}

function getConjuntoInitial_(value) {
  const clean = String(value || "").trim();
  if (!clean) return "U";

  const withoutTech = clean
    .replace(/^Auto\s*·\s*/i, "")
    .replace(/^utm_/i, "");

  return withoutTech.charAt(0).toUpperCase() || "U";
}

function getConjuntoAudienceIcon_() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.7 11.2a3.35 3.35 0 1 1 0-6.7 3.35 3.35 0 0 1 0 6.7Zm0-1.5a1.85 1.85 0 1 0 0-3.7 1.85 1.85 0 0 0 0 3.7Zm6.9 1.15a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Zm0-1.5a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM3.75 18.7c0-3.02 2.25-5.15 4.95-5.15s4.95 2.13 4.95 5.15a.75.75 0 0 1-.75.75h-8.4a.75.75 0 0 1-.75-.75Zm1.58-.75h6.74c-.28-1.75-1.6-2.9-3.37-2.9s-3.09 1.15-3.37 2.9Zm8.73-4.05a4.9 4.9 0 0 1 2.06 3.95.75.75 0 0 0 .75.75h2.63a.75.75 0 0 0 .75-.75c0-2.74-2.06-4.95-4.6-4.95-.57 0-1.11.09-1.59.25Z" fill="currentColor"></path>
    </svg>
  `;
}
/* FIN · Render · Biblioteca de conjuntos de audiencias */

/* INICIO · Helpers · Quick actions de conjuntos */
function getConjuntoQuickActionIcon_(type) {
  const kind = String(type || "").trim().toLowerCase();

  if (kind === "open") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.75 6.75A1.75 1.75 0 0 1 6.5 5h3.2c.5 0 .98.21 1.31.58l.88.97c.14.16.35.25.57.25h5.04a1.75 1.75 0 0 1 1.75 1.75v7.95a2.5 2.5 0 0 1-2.5 2.5H7a2.25 2.25 0 0 1-2.25-2.25V6.75Zm1.5 0v10c0 .41.34.75.75.75h9.75A1 1 0 0 0 17.75 16.5V8.55a.25.25 0 0 0-.25-.25h-5.04a2.25 2.25 0 0 1-1.67-.74l-.88-.97A.27.27 0 0 0 9.7 6.5H6.5a.25.25 0 0 0-.25.25Z" fill="currentColor"></path>
      </svg>
    `;
  }

  if (kind === "duplicate") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7.25A2.25 2.25 0 0 1 10.25 5h6.5A2.25 2.25 0 0 1 19 7.25v7.5A2.25 2.25 0 0 1 16.75 17h-6.5A2.25 2.25 0 0 1 8 14.75v-7.5Zm1.5 0v7.5c0 .41.34.75.75.75h6.5a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75h-6.5a.75.75 0 0 0-.75.75ZM5 9.5a.75.75 0 0 1 .75.75v7a.75.75 0 0 0 .75.75h7a.75.75 0 0 1 0 1.5h-7A2.25 2.25 0 0 1 4.25 17.25v-7A.75.75 0 0 1 5 9.5Z" fill="currentColor"></path>
      </svg>
    `;
  }

  if (kind === "flow") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM17.5 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM6.5 14a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm1.17-7.03 6.26 2.17a.75.75 0 1 1-.5 1.42L7.17 9.89a.75.75 0 0 1 .5-1.42Zm-.55 7.05 6.31-2.37a.75.75 0 0 1 .53 1.4l-6.31 2.37a.75.75 0 0 1-.53-1.4Z" fill="currentColor"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.53 5.22a.75.75 0 0 1 .75.75v10.56a.75.75 0 1 1-1.5 0V5.97a.75.75 0 0 1 .75-.75Zm4.94 0a.75.75 0 0 1 .75.75v10.56a.75.75 0 1 1-1.5 0V5.97a.75.75 0 0 1 .75-.75ZM5.25 7.75a.75.75 0 0 1 0-1.5h13.5a.75.75 0 0 1 0 1.5h-.69l-.6 9.17A2.25 2.25 0 0 1 15.22 19H8.78a2.25 2.25 0 0 1-2.24-2.08l-.6-9.17h-.69Zm2.19 0 .58 8.99c.03.39.35.69.76.69h6.44c.4 0 .73-.3.76-.69l.58-8.99H7.44Z" fill="currentColor"></path>
    </svg>
  `;
}
/* INICIO · renderAudiencias_ · Carrusel visual de audiencias */
function renderAudiencias_(root, audiencias) {
  const mount = root.querySelector('[data-pubutm-audiences-list]');
  if (!mount) return;

  const allAudiencias = Array.isArray(audiencias) ? audiencias : [];

  ensureAudienciasLibrarySlide_(root);

  if (!allAudiencias.length) {
    mount.innerHTML = `
      <article class="pubUtmCard pubUtmCard--full">
        <div class="pubUtmEmptyState">
          <h2>Sin audiencias disponibles</h2>
          <p>Cuando el motor UTM detecte audiencias automáticas, van a aparecer acá.</p>
        </div>
      </article>
    `;
    return;
  }

  const atomicas = allAudiencias.filter(function (a) {
    return String(a.tipo_estructura || "").toLowerCase().indexOf("atom") !== -1;
  }).length;

  const compuestas = allAudiencias.filter(function (a) {
    return String(a.tipo_estructura || "").toLowerCase().indexOf("comp") !== -1;
  }).length;

  const previewAudiencias = allAudiencias.slice(0, 12);

  mount.innerHTML = `
    <article class="pubUtmCard pubUtmCard--full pubUtmAudiencesCarouselShell">
      <div class="pubUtmAudiencesCarouselShell__head">
        <div class="pubUtmAudiencesCarouselShell__identity">
          <span class="pubUtmAudiencesCarouselShell__icon" aria-hidden="true">
            ${getConjuntoAudienceIcon_()}
          </span>

          <div>
            <div class="pubUtmCard__eyebrow">Biblioteca de audiencias</div>
            <h2 class="pubUtmCard__title">Audiencias compuestas y atómicas</h2>
            <p class="pubUtmAudiencesCarouselShell__subtitle">
              Vista rápida de audiencias generadas por cruce, repetición y reglas del motor.
            </p>
          </div>
        </div>

        <div class="pubUtmAudiencesCarouselShell__right">
          <div class="pubUtmAudiencesCarouselShell__summary">
            <span>${formatInteger_(allAudiencias.length)} audiencias</span>
            <span>${formatInteger_(compuestas)} compuestas</span>
            <span>${formatInteger_(atomicas)} atómicas</span>
          </div>

          <div class="pubUtmAudiencesCarouselShell__controls pubUtmAudiencesCarouselShell__controls--withViewAll">
            <button
              type="button"
              class="pubUtmAudienciasViewAllBtn"
              data-audiencias-library-open
            >
              <span>Ver todos</span>
              <i aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </i>
            </button>

            <button
              type="button"
              class="pubUtmAudiencesCarouselShell__arrow"
              data-audiences-carousel-prev
              aria-label="Ver audiencias anteriores"
            >
              ‹
            </button>

            <button
              type="button"
              class="pubUtmAudiencesCarouselShell__arrow"
              data-audiences-carousel-next
              aria-label="Ver más audiencias"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div class="pubUtmAudiencesCarouselShell__viewport">
        <div class="pubUtmAudiencesCarouselTrack" data-audiences-carousel-track>
          ${previewAudiencias.map(renderAudienceCarouselCard_).join("")}
        </div>
      </div>

      ${
        allAudiencias.length > previewAudiencias.length
          ? `
            <div class="pubUtmAudienciasPreviewFoot">
              <span>Mostrando ${formatInteger_(previewAudiencias.length)} de ${formatInteger_(allAudiencias.length)} audiencias automáticas.</span>

              <button type="button" data-audiencias-library-open>
                Abrir biblioteca completa
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;

  bindAudienceActionPlaceholders_(mount, allAudiencias);
  bindAudienceCarouselControls_(mount);
  bindAudienciasLibraryEvents_(root);

  const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
  if (slide && slide.classList.contains("is-open")) {
    renderAudienciasLibrarySlideContent_(root);
  }
}
/* FIN · renderAudiencias_ · Carrusel visual de audiencias */


/* =========================================================
   INICIO · Audiencias automáticas · Biblioteca completa en slide
   ========================================================= */

   function ensureAudienciasLibrarySlide_(root) {
    if (!root) return;
    if (root.querySelector("[data-pubutm-audiencias-library-slide]")) return;
  
    const mount = root.querySelector("#pubUtmSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmAudienciasLibrarySlide" data-pubutm-audiencias-library-slide aria-hidden="true">
        <div class="pubUtmAudienciasLibrarySlide__backdrop" data-audiencias-library-close="1"></div>
  
        <div class="pubUtmAudienciasLibrarySlide__panel">
          <header class="pubUtmAudienciasLibrarySlide__head">
            <div class="pubUtmAudienciasLibrarySlide__identity">
              <span class="pubUtmAudienciasLibrarySlide__icon" aria-hidden="true">
                ${getPubUtmHeaderIcon_("audience")}
              </span>
  
              <div>
                <div class="pubUtmCard__eyebrow">Audiencias automáticas</div>
                <h2>Biblioteca completa de audiencias</h2>
                <p>
                  Explorá audiencias autocreadas por el motor UTM con filtros rápidos y búsqueda operativa.
                </p>
              </div>
            </div>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-audiencias-library-close="1">
              Cerrar
            </button>
          </header>
  
          <section class="pubUtmLibrarySlideTools">
            <div class="pubUtmLibrarySlideTools__row">
              <div class="pubUtmLibrarySlideSearch">
                <button
                  type="button"
                  class="pubUtmLibrarySlideSearch__toggle"
                  data-audiencias-library-search-toggle
                  aria-label="Buscar audiencias"
                  title="Buscar audiencias"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </button>
  
                <div class="pubUtmLibrarySlideSearch__inputWrap">
                  <input
                    type="text"
                    value="${escapeHtml_(STATE.audienciasLibrarySearch || "")}"
                    placeholder="Buscar audiencia, condición o código..."
                    data-audiencias-library-search-input
                  />
                </div>
              </div>
  
              <div class="pubUtmLibraryQuickFilters">
                <button type="button" class="${STATE.audienciasLibraryFilter === "todas" ? "is-active" : ""}" data-audiencias-type-filter="todas">Todas</button>
                <button type="button" class="${STATE.audienciasLibraryFilter === "atomicas" ? "is-active" : ""}" data-audiencias-type-filter="atomicas">Atómicas</button>
                <button type="button" class="${STATE.audienciasLibraryFilter === "compuestas" ? "is-active" : ""}" data-audiencias-type-filter="compuestas">Compuestas</button>
                <button type="button" class="${STATE.audienciasLibraryFilter === "derivadas" ? "is-active" : ""}" data-audiencias-type-filter="derivadas">Derivadas</button>
              </div>
            </div>
          </section>
  
          <main class="pubUtmAudienciasLibrarySlide__body">
            <div data-audiencias-library-body>
              ${renderAudienciasLibrarySkeletons_()}
            </div>
          </main>
        </div>
      </aside>
    `);
  }
  
  function bindAudienciasLibraryEvents_(root) {
    if (!root || root.dataset.audienciasLibraryEventsBound === "1") return;
    root.dataset.audienciasLibraryEventsBound = "1";
  
    root.addEventListener("click", function (ev) {
      const openBtn = ev.target.closest("[data-audiencias-library-open]");
      if (openBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        openAudienciasLibrarySlide_(root);
        return;
      }
  
      const closeBtn = ev.target.closest("[data-audiencias-library-close]");
      if (closeBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        closeAudienciasLibrarySlide_(root);
        return;
      }
  
      const toggleSearch = ev.target.closest("[data-audiencias-library-search-toggle]");
      if (toggleSearch) {
        ev.preventDefault();
        ev.stopPropagation();
  
        STATE.audienciasLibrarySearchOpen = !STATE.audienciasLibrarySearchOpen;
  
        const wrap = root.querySelector("[data-pubutm-audiencias-library-slide] .pubUtmLibrarySlideSearch__inputWrap");
        if (wrap) wrap.classList.toggle("is-open", STATE.audienciasLibrarySearchOpen);
  
        if (STATE.audienciasLibrarySearchOpen) {
          requestAnimationFrame(function () {
            const input = root.querySelector("[data-audiencias-library-search-input]");
            if (input) input.focus();
          });
        }
  
        return;
      }
  
      const typeBtn = ev.target.closest("[data-audiencias-type-filter]");
      if (typeBtn) {
        ev.preventDefault();
        ev.stopPropagation();
  
        STATE.audienciasLibraryFilter = String(typeBtn.getAttribute("data-audiencias-type-filter") || "todas");
  
        root.querySelectorAll("[data-audiencias-type-filter]").forEach(function (btn) {
          btn.classList.toggle("is-active", btn === typeBtn);
        });
  
        const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
        if (slide) slide.setAttribute("data-visible-limit", "25");
  
        renderAudienciasLibrarySlideContent_(root);
        return;
      }
  
      const moreBtn = ev.target.closest("[data-audiencias-library-more]");
      if (moreBtn) {
        ev.preventDefault();
        ev.stopPropagation();
  
        const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
        if (!slide) return;
  
        const current = Number(slide.getAttribute("data-visible-limit") || 25);
        slide.setAttribute("data-visible-limit", String(current + 25));
  
        renderAudienciasLibrarySlideContent_(root);
      }
    });
  
    root.addEventListener("input", function (ev) {
      const input = ev.target.closest("[data-audiencias-library-search-input]");
      if (!input) return;
  
      STATE.audienciasLibrarySearch = String(input.value || "");
  
      const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
      if (slide) slide.setAttribute("data-visible-limit", "25");
  
      renderAudienciasLibrarySlideContent_(root);
    });
  }
  
  function openAudienciasLibrarySlide_(root) {
    ensureAudienciasLibrarySlide_(root);
  
    const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
    const body = root.querySelector("[data-audiencias-library-body]");
    if (!slide || !body) return;
  
    slide.classList.add("is-open");
    slide.setAttribute("aria-hidden", "false");
    slide.setAttribute("data-visible-limit", "25");
  
    root.classList.add("pubUtmAudienciasLibraryStackOpen");
  
    const main = root.closest("main") || root;
    main.classList.add("pubUtmSlideOpen");
  
    body.innerHTML = renderAudienciasLibrarySkeletons_();
  
    clearTimeout(root.__audienciasLibraryTimer);
    root.__audienciasLibraryTimer = setTimeout(function () {
      renderAudienciasLibrarySlideContent_(root);
    }, 180);
  
    syncPubUtmOverlayMode_();
  }
  
  function closeAudienciasLibrarySlide_(root) {
    const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
    if (!slide) return;
  
    slide.classList.remove("is-open");
    slide.setAttribute("aria-hidden", "true");
  
    root.classList.remove("pubUtmAudienciasLibraryStackOpen");
  
    const main = root.closest("main") || root;
    main.classList.remove("pubUtmSlideOpen");
  
    clearTimeout(root.__audienciasLibraryTimer);
  
    syncPubUtmOverlayMode_();
  }
  
  function renderAudienciasLibrarySlideContent_(root) {
    const slide = root.querySelector("[data-pubutm-audiencias-library-slide]");
    const body = root.querySelector("[data-audiencias-library-body]");
    if (!slide || !body) return;
  
    const dashboard = STATE.dashboard || {};
    const allAudiencias = Array.isArray(dashboard.audiencias) ? dashboard.audiencias : [];
  
    const query = String(STATE.audienciasLibrarySearch || "").trim().toLowerCase();
    const activeType = String(STATE.audienciasLibraryFilter || "todas");
    const limit = Number(slide.getAttribute("data-visible-limit") || 25);
  
    const filtered = allAudiencias.filter(function (audience) {
      const type = getAudienciaLibraryKind_(audience);
      const matchesType = activeType === "todas" ? true : type === activeType;
  
      if (!matchesType) return false;
  
      if (!query) return true;
  
      const haystack = [
        audience.nombre_audiencia,
        audience.audiencia_id,
        audience.condicion_principal,
        audience.condiciones_resumen,
        audience.tipo_estructura,
        audience.tipo_visual,
        audience.canal_sugerido,
        audience.canal_destino,
        audience.es_derivada_de
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
  
      return haystack.includes(query);
    });
  
    const visible = filtered.slice(0, limit);
    const hasMore = visible.length < filtered.length;
  
    if (!visible.length) {
      body.innerHTML = `
        <div class="pubUtmAudienciasLibrarySlide__empty">
          No hay audiencias para la búsqueda o filtro aplicado.
        </div>
      `;
      return;
    }
  
    body.innerHTML = `
      <div class="pubUtmAudienciasLibrarySlide__meta">
        <div>
          <strong>${formatInteger_(visible.length)}</strong>
          <span>de ${formatInteger_(filtered.length)} audiencias visibles</span>
        </div>
      </div>
  
      <div class="pubUtmAudienciasLibrarySlide__grid">
        ${visible.map(function (audience) {
          return renderAudienceCarouselCard_(audience);
        }).join("")}
      </div>
  
      ${
        hasMore
          ? `
            <div class="pubUtmAudienciasLibrarySlide__moreWrap">
              <button type="button" class="pubUtmAudienciasLibrarySlide__more" data-audiencias-library-more>
                Ver más
              </button>
            </div>
          `
          : `
            <div class="pubUtmAudienciasLibrarySlide__end">
              Llegaste al final de la biblioteca.
            </div>
          `
      }
    `;
  
    bindAudienceActionPlaceholders_(body, allAudiencias);
  }
  
  function getAudienciaLibraryKind_(audience) {
    const estructura = String(audience && audience.tipo_estructura || "").toLowerCase();
    const visual = String(audience && audience.tipo_visual || "").toLowerCase();
    const madre = String(audience && audience.es_derivada_de || "").trim();
  
    if (visual.indexOf("deriv") !== -1 || madre) return "derivadas";
    if (estructura.indexOf("atom") !== -1) return "atomicas";
    if (estructura.indexOf("comp") !== -1) return "compuestas";
  
    return "todas";
  }
  
  function renderAudienciasLibrarySkeletons_() {
    return `
      <div class="pubUtmAudienciasLibrarySlide__meta pubUtmAudienciasLibrarySlide__meta--loading">
        <span>Cargando biblioteca de audiencias...</span>
      </div>
  
      <div class="pubUtmAudienciasLibrarySkeletonGrid">
        ${Array.from({ length: 9 }).map(function () {
          return `
            <article class="pubUtmAudienciasSkeletonCard">
              <div class="pubUtmAudienciasSkeletonCard__badges">
                <i></i><i></i><i></i>
              </div>
              <strong></strong>
              <p></p>
              <div class="pubUtmAudienciasSkeletonCard__stats">
                <span></span><span></span><span></span>
              </div>
              <p></p>
              <div class="pubUtmAudienciasSkeletonCard__actions">
                <b></b><b></b><b></b><b></b>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }
  
  /* =========================================================
     FIN · Audiencias automáticas · Biblioteca completa en slide
     ========================================================= */

/* INICIO · Helpers · Carrusel visual de audiencias */
function renderAudienceCarouselCard_(a) {
  const audience = a || {};
  const badges = getAudienceCarouselBadges_(audience);
  const isAutomatic = isAutomaticAudience_(audience);
  const readableName = buildAudienceReadableName_(audience);
  const readableCondition = buildAudienceReadableCondition_(audience);
  const canal = humanizeLabel_(audience.canal_destino || "—");

  return `
    <article
      class="pubUtmAudienceCarouselCard"
      data-audience-card="1"
      data-audience-type="${escapeHtml_(audience.tipo_visual || "atomica")}"
      data-audience-id="${escapeHtml_(audience.audiencia_id || "")}"
    >
      ${isAutomatic ? `
        <div class="pubUtmAudienceCarouselCard__autoBadge">
          Audiencia automática
        </div>
      ` : ""}

      <div class="pubUtmAudienceCarouselCard__topBadges">
        ${badges.map(function (badge) {
          return `
            <span class="pubUtmAudienceCarouselBadge pubUtmAudienceCarouselBadge--${escapeHtml_(badge.tone)}">
              ${escapeHtml_(badge.label)}
            </span>
          `;
        }).join("")}
      </div>

      <div class="pubUtmAudienceCarouselCard__body">
        <div class="pubUtmAudienceCarouselCard__eyebrow">
          ${escapeHtml_(audience.audiencia_id || "—")}
        </div>

        <h3 class="pubUtmAudienceCarouselCard__title">
          ${escapeHtml_(readableName)}
        </h3>

        <div class="pubUtmAudienceCarouselCard__stats">
          <div>
            <span>Miembros</span>
            <strong>${formatInteger_(audience.cantidad_miembros || 0)}</strong>
          </div>

          <div>
            <span>Ventas</span>
            <strong>${formatInteger_(audience.ventas_asociadas || 0)}</strong>
          </div>

          <div>
            <span>Canal</span>
            <strong>${escapeHtml_(canal || "—")}</strong>
          </div>
        </div>

        <div class="pubUtmAudienceCarouselCard__condition">
          <span>Condición principal</span>
          <strong>${escapeHtml_(readableCondition || "Sin condiciones visibles")}</strong>
        </div>

        <div class="pubUtmAudienceCarouselCard__meta">
          <div>
            <span>Facturación</span>
            <strong>${formatMoneyAr_(audience.facturacion_asociada || 0)}</strong>
          </div>

          <div>
            <span>Madre</span>
            <strong>${escapeHtml_(audience.es_derivada_de || "—")}</strong>
          </div>
        </div>
      </div>

      <div class="pubUtmAudienceCarouselCard__actions">
        <button
          type="button"
          class="pubUtmAudienceCarouselAction pubUtmAudienceCarouselAction--conditions"
          data-audience-action="conditions"
          data-audience-id="${escapeHtml_(audience.audiencia_id || "")}"
        >
          <span class="pubUtmAudienceCarouselAction__icon" aria-hidden="true">
            ${getAudienceCarouselActionIcon_("conditions")}
          </span>
          <span>Ver condiciones</span>
        </button>

        <button
          type="button"
          class="pubUtmAudienceCarouselAction pubUtmAudienceCarouselAction--members"
          data-audience-action="members"
          data-audience-id="${escapeHtml_(audience.audiencia_id || "")}"
        >
          <span class="pubUtmAudienceCarouselAction__icon" aria-hidden="true">
            ${getAudienceCarouselActionIcon_("members")}
          </span>
          <span>Ver miembros</span>
        </button>

        <button
          type="button"
          class="pubUtmAudienceCarouselAction pubUtmAudienceCarouselAction--use"
          data-open-create-set="1"
          data-source-audience-id="${escapeHtml_(audience.audiencia_id || "")}"
        >
          <span class="pubUtmAudienceCarouselAction__icon" aria-hidden="true">
            ${getAudienceCarouselActionIcon_("use")}
          </span>
          <span>Usar en conjunto</span>
        </button>

        <button
          type="button"
          class="pubUtmAudienceCarouselAction pubUtmAudienceCarouselAction--origin"
          data-audience-action="origin"
          data-audience-id="${escapeHtml_(audience.audiencia_id || "")}"
        >
          <span class="pubUtmAudienceCarouselAction__icon" aria-hidden="true">
            ${getAudienceCarouselActionIcon_("origin")}
          </span>
          <span>Ver origen</span>
        </button>
      </div>
    </article>
  `;
}

function bindAudienceCarouselControls_(mount) {
  const track = mount.querySelector("[data-audiences-carousel-track]");
  const prev = mount.querySelector("[data-audiences-carousel-prev]");
  const next = mount.querySelector("[data-audiences-carousel-next]");

  if (!track) return;

  function scrollCarousel_(direction) {
    const amount = Math.max(320, Math.floor(track.clientWidth * 0.82));
    track.scrollBy({
      left: direction * amount,
      behavior: "smooth"
    });
  }

  if (prev) {
    prev.onclick = function () {
      scrollCarousel_(-1);
    };
  }

  if (next) {
    next.onclick = function () {
      scrollCarousel_(1);
    };
  }
}

function getAudienceCarouselBadges_(audience) {
  const a = audience || {};
  const out = [];

  const visual = String(a.tipo_visual || "").trim();
  const structure = String(a.tipo_estructura || "").trim();
  const priority = String(a.prioridad_visual || "").trim();

  if (visual) {
    out.push({
      label: humanizeLabel_(visual),
      tone: visual.toLowerCase().indexOf("deriv") !== -1 ? "green" : "cyan"
    });
  }

  if (structure) {
    out.push({
      label: humanizeLabel_(structure),
      tone: "black"
    });
  }

  if (priority) {
    const p = priority.toLowerCase();
    out.push({
      label: humanizeLabel_(priority),
      tone: p === "alta" ? "green" : (p === "baja" ? "cyan" : "slate")
    });
  }

  return out.slice(0, 3);
}

function isAutomaticAudience_(audience) {
  const a = audience || {};
  const haystack = [
    a.audiencia_id,
    a.nombre_audiencia,
    a.tipo_audiencia,
    a.tipo_visual
  ].join(" ").toLowerCase();

  return haystack.indexOf("auto") !== -1;
}

function buildAudienceReadableName_(audience) {
  const a = audience || {};
  const raw = String(a.nombre_audiencia || a.audiencia_id || "Audiencia").trim();

  const clean = raw
    .replace(/^auto\s*·\s*/i, "")
    .replace(/^auto\s*-\s*/i, "")
    .replace(/^auto\s*/i, "")
    .trim();

  if (clean.indexOf("=") !== -1) {
    const parts = clean.split("=");
    const field = humanizeLabel_(parts[0] || "");
    const value = humanizeLabel_(parts.slice(1).join("=") || "");

    return toAudienceReadableCase_(field) + " · " + toAudienceReadableCase_(value);
  }

  return toAudienceReadableCase_(humanizeLabel_(clean || raw));
}

function buildAudienceReadableCondition_(audience) {
  const a = audience || {};
  const raw = String(a.condiciones_resumen || "").trim();

  if (!raw) return "";

  return raw
    .split("·")
    .map(function (part) {
      const p = String(part || "").trim();

      if (p.indexOf(":") !== -1) {
        const chunks = p.split(":");
        const field = toAudienceReadableCase_(humanizeLabel_(chunks[0] || ""));
        const value = toAudienceReadableCase_(humanizeLabel_(chunks.slice(1).join(":") || ""));

        return field + ": " + value;
      }

      return toAudienceReadableCase_(humanizeLabel_(p));
    })
    .join(" · ");
}

function toAudienceReadableCase_(value) {
  const clean = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "";

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getAudienceCarouselActionIcon_(type) {
  const key = String(type || "").trim().toLowerCase();

  if (key === "conditions") {
    return `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M5.75 5.75h12.5M5.75 12h12.5M5.75 18.25h8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (key === "members") {
    return `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8.75 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.75 10.75a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19c0-3.1 2.2-5.25 4.25-5.25S13 15.9 13 19M13.25 14.25c.65-.42 1.5-.65 2.5-.65 2.05 0 3.75 1.75 3.75 4.65" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  if (key === "use") {
    return `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5.5v4.75M12 13.75v4.75M5.5 12h4.75M13.75 12h4.75M7.9 7.9l2.65 2.65M13.45 13.45l2.65 2.65M16.1 7.9l-2.65 2.65M10.55 13.45 7.9 16.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>
  `;
}
/* FIN · Helpers · Carrusel visual de audiencias */

  function getAudienceSetToneInfo_(audience) {
    const a = audience || {};
    const nivel = String(a.nivel_operativo || "").trim().toLowerCase();
    const prioridad = String(a.prioridad_visual || "").trim().toLowerCase();
    const tipoVisual = String(a.tipo_visual || "").trim().toLowerCase();
    const tipoEstructura = String(a.tipo_estructura || "").trim().toLowerCase();
    const canal = String(a.canal_destino || "").trim().toLowerCase();

    if (nivel === "principal" || prioridad === "alta") {
      return {
        className: "high",
        label: "Alta prioridad"
      };
    }

    if (canal === "email") {
      return {
        className: "email",
        label: "Email"
      };
    }

    if (canal === "experimentacion" || canal === "experimentación") {
      return {
        className: "experiment",
        label: "Experimento"
      };
    }

    if (tipoVisual === "derivada") {
      return {
        className: "derived",
        label: "Derivada"
      };
    }

    if (tipoEstructura === "compuesta") {
      return {
        className: "composite",
        label: "Compuesta"
      };
    }

    if (tipoEstructura === "atomica" || tipoEstructura === "atómica") {
      return {
        className: "atomic",
        label: "Atómica"
      };
    }

    return {
      className: "neutral",
      label: "Audiencia"
    };
  }
  /* FIN · Helpers visuales para jerarquía de audiencias en conjuntos */

  /* INICIO · Eventos · Crear conjunto de audiencias */
function attachAudienceSetCreatorEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-audience-set-close]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceSetCreator_(root);
    };
  });

  const search = slide.querySelector("[data-audience-set-search]");
  if (search) {
    search.oninput = function () {
      STATE.audienceSetSearch = String(search.value || "").trim().toLowerCase();
      renderAudienceSetCreator_(root);
    };
  }

  slide.querySelectorAll("[data-audience-set-form-field]").forEach(function (field) {
    field.oninput = function () {
      syncAudienceSetSaveButton_(root);
    };

    field.onchange = function () {
      syncAudienceSetSaveButton_(root);
    };
  });

  initAudienceSetSmartSelects_(root);

  const saveBtn = slide.querySelector("[data-audience-set-save]");
  if (saveBtn) {
    saveBtn.onclick = function () {
      prepareAudienceSetSave_(root);
    };
  }
}
/* FIN · Eventos · Crear conjunto de audiencias */

  function openAudienceSetCreator_(root, sourceAudienceId) {
    const slide = root.querySelector("[data-pubutm-audience-set-slide]");
    if (!slide) return;

    const sourceId = String(sourceAudienceId || "").trim();

    STATE.createSetOpen = true;
    STATE.audienceSetSearch = "";

    if (sourceId) {
      STATE.selectedAudiencesForSet = [sourceId];
    } else {
      STATE.selectedAudiencesForSet = [];
    }

    const search = slide.querySelector("[data-audience-set-search]");
    if (search) search.value = "";

    renderAudienceSetCreator_(root);

    slide.classList.add("is-open");
    slide.setAttribute("aria-hidden", "false");

    const main = root.closest("main") || root;
    main.classList.add("pubUtmSlideOpen");
  }

  function closeAudienceSetCreator_(root) {
    const slide = root.querySelector("[data-pubutm-audience-set-slide]");
    if (!slide) return;

    slide.classList.remove("is-open");
    slide.setAttribute("aria-hidden", "true");

    STATE.createSetOpen = false;
    STATE.selectedAudiencesForSet = [];
    STATE.audienceSetSearch = "";

    const main = root.closest("main") || root;
    main.classList.remove("pubUtmSlideOpen");
  }

  /* INICIO · renderAudienceSetCreator_ · Rediseño vivo de cards */
/* INICIO · renderAudienceSetCreator_ · Rediseño vivo + Fase B */
/* INICIO · renderAudienceSetCreator_ · Constructor con filtros operativos */
function renderAudienceSetCreator_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) return;

  /* INICIO · Decoración viva del constructor */
  decorateAudienceSetCreatorUiV2_(slide);
  /* FIN · Decoración viva del constructor */

  const audiencias = getAudienceSetSourceList_();
  const filtered = filterAudienceSetList_(audiencias, STATE.audienceSetSearch);

  syncAudienceSetFiltersUiV2_(slide, audiencias, filtered);

  const list = slide.querySelector("[data-audience-set-list]");
  const selected = slide.querySelector("[data-audience-set-selected]");
  const preview = slide.querySelector("[data-audience-set-preview]");
  const bubble = slide.querySelector("[data-audience-set-floating-v2]");
  const selectedAudiences = getSelectedAudiencesForSet_();

  if (list) {
    if (!filtered.length) {
      list.innerHTML = `
        <article class="pubUtmCard pubUtmCard--full">
          <div class="pubUtmEmptyState">
            <h2>Sin coincidencias</h2>
            <p>No encontramos audiencias para la búsqueda y filtros actuales.</p>
          </div>
        </article>
      `;
    } else {
      list.innerHTML = filtered.map(function (a) {
        const isSelected = isAudienceSelectedForSet_(a.audiencia_id);
        return renderAudienceSetBuilderCardV2_(a, isSelected);
      }).join("");
    }

    /* INICIO · Click seguro card audiencia · Ignora controles internos */
list.querySelectorAll("[data-set-audience-card]").forEach(function (card) {
  card.onclick = function (ev) {
    if (ev.target.closest("[data-set-audience-toggle]")) return;
    if (ev.target.closest("[data-audience-set-card-date]")) return;
    if (ev.target.closest("[data-audience-set-raw-params-help]")) return;

    const id = card.getAttribute("data-set-audience-card") || "";
    toggleAudienceForSet_(root, id);
  };
});
/* FIN · Click seguro card audiencia · Ignora controles internos */

    list.querySelectorAll("[data-set-audience-toggle]").forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const id = btn.getAttribute("data-set-audience-toggle") || "";
        toggleAudienceForSet_(root, id);
      };
    });
  }

  if (selected) {
    selected.innerHTML = renderAudienceSetSelectedPanelV2_(selectedAudiences);

    selected.querySelectorAll("[data-set-audience-remove]").forEach(function (btn) {
      btn.onclick = function () {
        const id = btn.getAttribute("data-set-audience-remove") || "";
        toggleAudienceForSet_(root, id);
      };
    });
  }

  if (preview) {
    preview.innerHTML = renderAudienceSetPreviewHtml_(selectedAudiences);
  }

  slide.querySelectorAll("[data-audience-set-panel-create]").forEach(function (btn) {
    btn.onclick = function () {
      prepareAudienceSetSave_(root);
    };
  });

  /* INICIO · Globo flotante + acción comparar audiencias */
if (bubble) {
  bubble.innerHTML = renderAudienceSetFloatingBubbleV2_(selectedAudiences);
  bubble.hidden = !selectedAudiences.length;
}

bindAudienceComparisonOpenControls_(root);
/* FIN · Globo flotante + acción comparar audiencias */

syncAudienceSetSaveButton_(root);
}
/* FIN · renderAudienceSetCreator_ · Constructor con filtros operativos */

/* =========================================================
   INICIO · Helpers V2 · Decoración constructor de conjuntos
   ========================================================= */

   function decorateAudienceSetCreatorUiV2_(slide) {
    if (!slide) return;
  
    decorateAudienceSetHeaderV2_(slide);
    decorateAudienceSetFormTooltipsV2_(slide);
    ensureAudienceSetFloatingBubbleV2_(slide);
  }
  
  /* INICIO · decorateAudienceSetHeaderV2_ · Header con filtros */
function decorateAudienceSetHeaderV2_(slide) {
  const head = slide.querySelector(".pubUtmAudienceSetSlide__head");
  if (!head) return;

  if (head.dataset.builderDecoratedV2 !== "1") {
    head.dataset.builderDecoratedV2 = "1";
    head.classList.add("pubUtmAudienceSetSlide__head--builderV2");

    const titleWrap = head.firstElementChild;
    if (titleWrap) {
      titleWrap.classList.add("pubUtmAudienceSetHeaderIdentityV2");

      if (!titleWrap.querySelector(".pubUtmAudienceSetHeaderIdentityV2__icon")) {
        titleWrap.insertAdjacentHTML("afterbegin", `
          <span class="pubUtmAudienceSetHeaderIdentityV2__icon" aria-hidden="true">
            ${getAudienceSetPeopleIconV2_()}
          </span>
        `);
      }
    }

    const saveBtn = slide.querySelector("[data-audience-set-save]");
    if (saveBtn && saveBtn.dataset.builderDecoratedV2 !== "1") {
      saveBtn.dataset.builderDecoratedV2 = "1";
      saveBtn.classList.add("pubUtmAudienceSetCreateBtnV2");

      saveBtn.innerHTML = `
        <span class="pubUtmAudienceSetCreateBtnV2__icon" aria-hidden="true">
          ${getAudienceSetPeopleIconV2_()}
        </span>
        <span>Crear conjunto</span>
      `;
    }
  }

  ensureAudienceSetFiltersPopoverV2_(slide);
  bindAudienceSetFiltersEventsV2_(slide);
}
/* FIN · decorateAudienceSetHeaderV2_ · Header con filtros */
  
  function decorateAudienceSetFormTooltipsV2_(slide) {
    const items = [
      {
        name: "nombre_conjunto",
        text: "Usá un nombre comercial y claro. Ejemplo: Dolor cervical · Remarketing educativo."
      },
      {
        name: "objetivo_comercial",
        text: "Definí para qué vas a usar este conjunto: email, recompra, cross sell, testeo o publicidad interna."
      },
      {
        name: "descripcion_conjunto",
        text: "Explicá cuándo conviene usar este público y qué intención comercial representa."
      }
    ];
  
    items.forEach(function (item) {
      const field = slide.querySelector('[name="' + item.name + '"]');
      if (!field) return;
  
      if (item.name === "descripcion_conjunto") {
        field.classList.add("pubUtmAudienceSetTextareaV2");
      }
  
      const label = field.closest(".pubUtmAudienceSetForm__field");
      if (!label || label.dataset.tooltipDecoratedV2 === "1") return;
  
      const span = label.querySelector("span");
      if (!span) return;
  
      label.dataset.tooltipDecoratedV2 = "1";
      span.classList.add("pubUtmAudienceSetFormLabelV2");
  
      span.insertAdjacentHTML("beforeend", `
        <em class="pubUtmAudienceSetHelpV2" tabindex="0">
          ?
          <small>${escapeHtml_(item.text)}</small>
        </em>
      `);
    });
  }
  
  function ensureAudienceSetFloatingBubbleV2_(slide) {
    if (slide.querySelector("[data-audience-set-floating-v2]")) return;
  
    const body = slide.querySelector(".pubUtmAudienceSetSlide__body") || slide;
  
    body.insertAdjacentHTML("beforeend", `
      <div class="pubUtmAudienceSetFloatingBubbleV2" data-audience-set-floating-v2 hidden></div>
    `);
  }
  
  /* INICIO · renderAudienceSetFloatingBubbleV2_ · Globo con comparar */
function renderAudienceSetFloatingBubbleV2_(audiencias) {
  if (!audiencias || !audiencias.length) return "";

  const metrics = buildAudienceSetPreviewMetrics_(audiencias);
  const label = audiencias.length === 1 ? "Audiencia seleccionada" : "Audiencias seleccionadas";
  const canCompare = audiencias.length >= 2;

  return `
    <div class="pubUtmAudienceSetFloatingBubbleV2__copy">
      <strong>${formatInteger_(audiencias.length)} ${label}</strong>
      <span>${formatInteger_(metrics.miembros_brutos)} usuarios estimados · ${formatMoneyAr_(metrics.facturacion_bruta)}</span>
    </div>

    ${
      canCompare
        ? `
          <button type="button" class="pubUtmAudienceSetFloatingBubbleV2__compare" data-audience-comparison-open>
            Comparar
          </button>
        `
        : `
          <em class="pubUtmAudienceSetFloatingBubbleV2__hint">Seleccioná 2 para comparar</em>
        `
    }
  `;
}
/* FIN · renderAudienceSetFloatingBubbleV2_ · Globo con comparar */
  
  /* =========================================================
     FIN · Helpers V2 · Decoración constructor de conjuntos
     ========================================================= */


/* =========================================================
   INICIO · Helpers V2 · Cards constructor de conjuntos
   ========================================================= */

   /* INICIO · renderAudienceSetBuilderCardV2_ · Card con fecha operativa */
function renderAudienceSetBuilderCardV2_(a, isSelected) {
  const audience = a || {};
  const tone = getAudienceSetToneInfo_(audience);
  const title = getAudienceSetReadableTitleV2_(audience);
  const condition = getAudienceSetReadableConditionV2_(audience);
  const structure = audienceSetTitleCaseV2_(humanizeLabel_(audience.tipo_estructura || audience.tipo_visual || "audiencia"));
  const channel = audienceSetTitleCaseV2_(humanizeLabel_(audience.canal_destino || "sin canal"));

  return `
    <article
      class="pubUtmCard pubUtmAudienceSetCard pubUtmAudienceSetCardV2 ${isSelected ? "is-selected" : ""}"
      data-set-audience-card="${escapeHtml_(audience.audiencia_id || "")}"
      data-set-audience-type="${escapeHtml_(audience.tipo_estructura || "")}"
    >
      <div class="pubUtmAudienceSetCardV2__top">
        <span class="pubUtmAudienceSetCardV2__icon" aria-hidden="true">
          ${getAudienceSetPeopleIconV2_()}
        </span>

        <div class="pubUtmAudienceSetCardV2__title">
          <h3>${escapeHtml_(title)}</h3>
          <p>${escapeHtml_(condition || "Sin condiciones visibles")}</p>
        </div>

        <button
          type="button"
          class="pubUtmAudienceSetSelectorV2 ${isSelected ? "is-selected" : ""}"
          data-set-audience-toggle="${escapeHtml_(audience.audiencia_id || "")}"
          aria-label="${isSelected ? "Quitar audiencia" : "Seleccionar audiencia"}"
        >
          <span></span>
        </button>
      </div>

      <div class="pubUtmAudienceSetCardV2__chips">
        <span class="pubUtmAudienceSetChipV2 pubUtmAudienceSetChipV2--${escapeHtml_(tone.className || "neutral")}">
          ${escapeHtml_(tone.label || "Audiencia")}
        </span>

        <span class="pubUtmAudienceSetChipV2 pubUtmAudienceSetChipV2--blue">
          ${escapeHtml_(structure)}
        </span>

        <span class="pubUtmAudienceSetChipV2 pubUtmAudienceSetChipV2--slate">
          ${escapeHtml_(channel)}
        </span>
      </div>

      ${renderAudienceSetCardDateV2_(audience)}

      <div class="pubUtmAudienceSetCardV2__members">
        ${renderAudienceSetAvatarStackV2_(audience)}

        <div>
          <strong>${formatInteger_(audience.cantidad_miembros || 0)} usuarios</strong>
          <span>miembros estimados</span>
        </div>
      </div>

      <div class="pubUtmAudienceSetCardV2__grid">
        <div>
          <span>Ventas</span>
          <strong>${formatInteger_(audience.ventas_asociadas || 0)}</strong>
        </div>

        <div>
          <span>Facturación</span>
          <strong>${formatMoneyAr_(audience.facturacion_asociada || 0)}</strong>
        </div>
      </div>

      <!-- INICIO · Condiciones + auditoría UTM cruda -->
<div class="pubUtmAudienceSetCardV2__conditions">
  <div class="pubUtmAudienceSetCardV2__conditionsHead">
    <span>Condiciones</span>
    ${renderAudienceSetRawParamsHelpV2_(audience)}
  </div>

  <strong>${escapeHtml_(condition || "Sin condiciones visibles")}</strong>
</div>
<!-- FIN · Condiciones + auditoría UTM cruda -->

      <div class="pubUtmAudienceSetCardV2__meta">
        <div>
          <strong>Familias</strong>
          <span>${renderAudienceSetFamilyPillsV2_(audience)}</span>
        </div>

        <div>
          <strong>Nivel</strong>
          <span>${escapeHtml_(audienceSetTitleCaseV2_(humanizeLabel_(audience.nivel_operativo || "—")))}</span>
        </div>

        <div>
          <strong>Madre</strong>
          <span>${escapeHtml_(audience.es_derivada_de || "—")}</span>
        </div>
      </div>
    </article>
  `;
}
/* FIN · renderAudienceSetBuilderCardV2_ · Card con fecha operativa */
  
  function renderAudienceSetSelectedPanelV2_(audiencias) {
    if (!audiencias || !audiencias.length) {
      return `
        <p class="pubUtmPanelSlide__text">Todavía no seleccionaste audiencias.</p>
      `;
    }
  
    return `
      <div class="pubUtmAudienceSetSelectedBoxV2">
        <div class="pubUtmAudienceSetSelectedBoxV2__head">
          <strong>Vas a crear un conjunto con:</strong>
          <span>${formatInteger_(audiencias.length)} audiencias seleccionadas</span>
        </div>
  
        <div class="pubUtmAudienceSetSelectedBoxV2__list">
          ${audiencias.map(function (a, idx) {
            return `
              <div class="pubUtmAudienceSetSelectedItemV2">
                <div>
                  <strong>${escapeHtml_(getAudienceSetReadableTitleV2_(a))}</strong>
                  <span>${idx === 0 ? "Principal" : "Soporte"} · ${escapeHtml_(audienceSetTitleCaseV2_(humanizeLabel_(a.tipo_estructura || a.tipo_visual || "audiencia")))}</span>
                </div>
  
                <button
                  type="button"
                  data-set-audience-remove="${escapeHtml_(a.audiencia_id || "")}"
                >
                  Quitar
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  
  function getAudienceSetReadableTitleV2_(audience) {
    const a = audience || {};
    const raw = String(a.nombre_audiencia || a.audiencia_id || "Audiencia").trim();
  
    const clean = raw
      .replace(/^auto\s*·\s*/i, "")
      .replace(/^auto\s*-\s*/i, "")
      .replace(/^auto\s*/i, "")
      .trim();
  
    if (clean.indexOf("=") !== -1) {
      const parts = clean.split("=");
      const field = getAudienceSetReadableFieldV2_(parts[0] || "");
      const value = audienceSetTitleCaseV2_(humanizeLabel_(parts.slice(1).join("=") || ""));
      return field + " · " + value;
    }
  
    return audienceSetTitleCaseV2_(humanizeLabel_(clean || raw));
  }
  
  function getAudienceSetReadableConditionV2_(audience) {
    const raw = String((audience && audience.condiciones_resumen) || "").trim();
    if (!raw) return "";
  
    return raw
      .split("·")
      .map(function (part) {
        const p = String(part || "").trim();
  
        if (p.indexOf(":") !== -1) {
          const chunks = p.split(":");
          const field = getAudienceSetReadableFieldV2_(chunks[0] || "");
          const value = audienceSetTitleCaseV2_(humanizeLabel_(chunks.slice(1).join(":") || ""));
          return field + ": " + value;
        }
  
        return audienceSetTitleCaseV2_(humanizeLabel_(p));
      })
      .join(" · ");
  }
  
  function getAudienceSetReadableFieldV2_(field) {
    const key = String(field || "")
      .replace(/^utm_/i, "")
      .replace(/_/g, " ")
      .trim()
      .toLowerCase();
  
    const map = {
      mensaje: "Mensaje",
      oferta: "Oferta",
      "ocasion uso": "Ocasión de uso",
      ocasion: "Ocasión",
      producto: "Producto",
      sku: "SKU",
      variant: "Variante",
      variante: "Variante",
      campaign: "Campaña",
      campana: "Campaña",
      source: "Origen",
      medium: "Medio"
    };
  
    return map[key] || audienceSetTitleCaseV2_(key);
  }
  
  function renderAudienceSetFamilyPillsV2_(audience) {
    const familias = String((audience && audience.familias_presentes) || "")
      .split(/[|,·]+/g)
      .map(function (x) { return String(x || "").trim(); })
      .filter(Boolean);
  
    if (!familias.length) return `<em>—</em>`;
  
    return familias.map(function (familia) {
      return `<em>${escapeHtml_(audienceSetTitleCaseV2_(humanizeLabel_(familia)))}</em>`;
    }).join("");
  }
  
/* =========================================================
   INICIO · Helpers V2 · Tooltip parámetros UTM crudos
   ========================================================= */

   function renderAudienceSetRawParamsHelpV2_(audience) {
    const params = buildAudienceSetRawParamsListV2_(audience);
  
    if (!params.length) {
      return `
        <button
          type="button"
          class="pubUtmAudienceSetRawHelpV2 is-empty"
          data-audience-set-raw-params-help
          aria-label="No hay parámetros UTM crudos disponibles"
        >
          <span>?</span>
          <em>Parámetro UTM</em>
  
          <small class="pubUtmAudienceSetRawHelpV2__tooltip">
            <strong>Parámetros UTM</strong>
            <span>No hay parámetros crudos disponibles para esta audiencia.</span>
          </small>
        </button>
      `;
    }
  
    const visible = params.slice(0, 8);
    const remaining = Math.max(0, params.length - visible.length);
  
    return `
      <button
        type="button"
        class="pubUtmAudienceSetRawHelpV2"
        data-audience-set-raw-params-help
        aria-label="Ver parámetros UTM crudos"
      >
        <span>?</span>
        <em>Parámetro UTM</em>
  
        <small class="pubUtmAudienceSetRawHelpV2__tooltip">
          <strong>Parámetros UTM</strong>
  
          <ul>
            ${visible.map(function (item) {
              return `<li><code>${escapeHtml_(item)}</code></li>`;
            }).join("")}
          </ul>
  
          ${remaining > 0 ? `<b>+${formatInteger_(remaining)} parámetros más</b>` : ""}
        </small>
      </button>
    `;
  }
  
  function buildAudienceSetRawParamsListV2_(audience) {
    const a = audience || {};
    const out = [];
  
    const candidates = [
      a.parametros_utm_crudos,
      a.parametros_utm,
      a.utm_parametros,
      a.condiciones_utm,
      a.condiciones_raw,
      a.condiciones_detalle,
      a.detalle_condiciones,
      a.condiciones_json,
      a.raw_conditions,
      a.pattern_params,
      a.parametros
    ];
  
    candidates.forEach(function (candidate) {
      collectAudienceSetRawParamsFromValueV2_(candidate, out);
    });
  
    if (!out.length) {
      collectAudienceSetRawParamsFromSummaryV2_(a.condiciones_resumen, out);
    }
  
    const seen = {};
    return out
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(Boolean)
      .filter(function (x) {
        const key = x.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }
  
  function collectAudienceSetRawParamsFromValueV2_(value, out) {
    if (value == null || value === "") return;
  
    if (Array.isArray(value)) {
      value.forEach(function (item) {
        collectAudienceSetRawParamsFromValueV2_(item, out);
      });
      return;
    }
  
    if (typeof value === "object") {
      const field =
        value.campo_utm ||
        value.campo ||
        value.field ||
        value.parametro ||
        value.parametro_utm ||
        "";
  
      const val =
        value.valor_permitido ||
        value.valor ||
        value.value ||
        value.valor_utm ||
        "";
  
      if (field || val) {
        out.push(String(field || "parametro") + "=" + String(val || ""));
        return;
      }
  
      Object.keys(value).forEach(function (key) {
        const v = value[key];
  
        if (v == null || v === "") return;
  
        if (typeof v === "object") {
          collectAudienceSetRawParamsFromValueV2_(v, out);
          return;
        }
  
        out.push(String(key) + "=" + String(v));
      });
  
      return;
    }
  
    const raw = String(value || "").trim();
    if (!raw) return;
  
    if (
      (raw.charAt(0) === "[" && raw.charAt(raw.length - 1) === "]") ||
      (raw.charAt(0) === "{" && raw.charAt(raw.length - 1) === "}")
    ) {
      try {
        collectAudienceSetRawParamsFromValueV2_(JSON.parse(raw), out);
        return;
      } catch (err) {}
    }
  
    if (raw.indexOf("&") !== -1 && raw.indexOf("=") !== -1) {
      raw.split("&").forEach(function (part) {
        const clean = String(part || "").trim();
        if (clean) out.push(clean);
      });
      return;
    }
  
    raw.split(/[|·;,]+/g).forEach(function (part) {
      const clean = String(part || "").trim();
      if (!clean) return;
  
      if (clean.indexOf("=") !== -1) {
        out.push(clean);
        return;
      }
  
      if (clean.indexOf(":") !== -1) {
        const chunks = clean.split(":");
        const field = String(chunks.shift() || "").trim();
        const val = String(chunks.join(":") || "").trim();
  
        if (field || val) {
          out.push(field + "=" + val);
        }
      }
    });
  }
  
  function collectAudienceSetRawParamsFromSummaryV2_(summary, out) {
    const raw = String(summary || "").trim();
    if (!raw) return;
  
    raw.split(/[|·;,]+/g).forEach(function (part) {
      const clean = String(part || "").trim();
      if (!clean) return;
  
      if (clean.indexOf("=") !== -1) {
        out.push(clean);
        return;
      }
  
      if (clean.indexOf(":") !== -1) {
        const chunks = clean.split(":");
        const field = String(chunks.shift() || "").trim();
        const val = String(chunks.join(":") || "").trim();
  
        if (field || val) {
          out.push(field + "=" + val);
        }
      }
    });
  }
  
  /* =========================================================
     FIN · Helpers V2 · Tooltip parámetros UTM crudos
     ========================================================= */


  function renderAudienceSetAvatarStackV2_(audience) {
    const total = Math.max(0, Number((audience && audience.cantidad_miembros) || 0));
    const initials = ["O", "C", "P", "L"];
    const visible = Math.min(4, total || 0);
    const more = Math.max(0, total - visible);
  
    if (!total) {
      return `
        <div class="pubUtmAudienceSetAvatarStackV2">
          <span class="pubUtmAudienceSetAvatarV2 pubUtmAudienceSetAvatarV2--empty">0</span>
        </div>
      `;
    }
  
    let html = `<div class="pubUtmAudienceSetAvatarStackV2">`;
  
    for (let i = 0; i < visible; i += 1) {
      html += `<span class="pubUtmAudienceSetAvatarV2 pubUtmAudienceSetAvatarV2--${i + 1}">${initials[i] || "U"}</span>`;
    }
  
    if (more > 0) {
      html += `<span class="pubUtmAudienceSetAvatarV2 pubUtmAudienceSetAvatarV2--more">+${formatInteger_(more)}</span>`;
    }
  
    html += `</div>`;
    return html;
  }
  
  function getAudienceSetPeopleIconV2_() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d="M185-80q-17 0-29.5-12.5T143-122v-105q0-90 56-159t144-88q-40 28-62 70.5T259-312v190q0 11 3 22t10 20h-87Zm147 0q-17 0-29.5-12.5T290-122v-190q0-70 49.5-119T459-480h189q70 0 119 49t49 119v64q0 70-49 119T648-80H332Zm148-484q-66 0-112-46t-46-112q0-66 46-112t112-46q66 0 112 46t46 112q0 66-46 112t-112 46Z"/>
      </svg>
    `;
  }
  
  function audienceSetTitleCaseV2_(value) {
    const clean = String(value || "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  
    if (!clean) return "";
  
    return clean
      .split(" ")
      .map(function (word) {
        if (String(word).toUpperCase() === "SKU") return "SKU";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  
  /* =========================================================
     FIN · Helpers V2 · Cards constructor de conjuntos
     ========================================================= */

  function getAudienceSetSourceList_() {
    const dashboard = STATE.dashboard || {};
    return Array.isArray(dashboard.audiencias) ? dashboard.audiencias : [];
  }

  /* INICIO · filterAudienceSetList_ · Búsqueda + filtros + orden */
function filterAudienceSetList_(audiencias, query) {
  const q = String(query || "").trim().toLowerCase();
  const typeFilter = String(STATE.audienceSetTypeFilter || "todas").trim().toLowerCase();
  const familyFilter = String(STATE.audienceSetFamilyFilter || "todas").trim().toLowerCase();

  let out = Array.isArray(audiencias) ? audiencias.slice() : [];

  if (q) {
    out = out.filter(function (a) {
      const haystack = [
        a.audiencia_id,
        a.nombre_audiencia,
        a.tipo_estructura,
        a.tipo_visual,
        a.nivel_operativo,
        a.canal_destino,
        a.familias_presentes,
        a.condiciones_resumen,
        a.es_derivada_de,
        a.fecha_creacion,
        a.fecha_actualizacion
      ].join(" ").toLowerCase();

      return haystack.indexOf(q) !== -1;
    });
  }

  if (typeFilter !== "todas") {
    out = out.filter(function (a) {
      const structure = String(a.tipo_estructura || "").toLowerCase();
      const visual = String(a.tipo_visual || "").toLowerCase();

      if (typeFilter === "autocreadas_recientes") {
        return isAudienceSetRecentlyAutoCreatedV2_(a);
      }

      if (typeFilter === "derivada") {
        return visual.indexOf("deriv") !== -1 || String(a.es_derivada_de || "").trim() !== "";
      }

      if (typeFilter === "atomica") {
        return structure.indexOf("atom") !== -1;
      }

      if (typeFilter === "compuesta") {
        return structure.indexOf("comp") !== -1;
      }

      return true;
    });
  }

  if (familyFilter !== "todas") {
    out = out.filter(function (a) {
      return getAudienceSetFamiliesV2_(a).indexOf(familyFilter) !== -1;
    });
  }

  return sortAudienceSetListV2_(out);
}
/* FIN · filterAudienceSetList_ · Búsqueda + filtros + orden */

/* =========================================================
   INICIO · Helpers · Filtros operativos constructor
   ========================================================= */

function ensureAudienceSetFiltersPopoverV2_(slide) {
  const actions = slide.querySelector(".pubUtmAudienceSetHeaderActions");
  if (!actions) return;

  if (actions.querySelector("[data-audience-set-filter-wrap]")) return;

  actions.insertAdjacentHTML("afterbegin", `
    <div class="pubUtmAudienceSetFilterWrapV2" data-audience-set-filter-wrap>
      <button
        type="button"
        class="pubUtmAudienceSetFilterTriggerV2"
        data-audience-set-filter-trigger
        aria-expanded="false"
      >
        <span class="pubUtmAudienceSetFilterTriggerV2__icon" aria-hidden="true">
          ${getAudienceSetFilterIconV2_()}
        </span>

        <span>Filtros</span>

        <em class="pubUtmAudienceSetFilterTriggerV2__badge" data-audience-set-filter-badge hidden>0</em>
      </button>

      <div class="pubUtmAudienceSetFilterPopoverV2" data-audience-set-filter-popover hidden>
        <div class="pubUtmAudienceSetFilterPopoverV2__head">
          <div>
            <strong>Filtros</strong>
            <span data-audience-set-filter-result>—</span>
          </div>

          <button type="button" data-audience-set-filter-close aria-label="Cerrar filtros">
            ×
          </button>
        </div>

        <div class="pubUtmAudienceSetFilterPopoverV2__section">
          <label>
            <span>Ordenar por</span>
            <select class="pubUtmFieldControl" data-audience-set-sort>
              <option value="recent_desc">Más recientes primero</option>
              <option value="recent_asc">Más antiguas primero</option>
              <option value="members_desc">Más miembros</option>
              <option value="revenue_desc">Mayor facturación</option>
              <option value="sales_desc">Más ventas asociadas</option>
            </select>
          </label>
        </div>

        <div class="pubUtmAudienceSetFilterPopoverV2__section">
          <span class="pubUtmAudienceSetFilterPopoverV2__label">Mostrar</span>

          <div class="pubUtmAudienceSetFilterPopoverV2__chips">
            <button type="button" data-audience-set-type-filter="todas">Todas</button>
            <button type="button" data-audience-set-type-filter="autocreadas_recientes">
              Últimas autocreadas
            </button>
            <button type="button" data-audience-set-type-filter="derivada">Derivadas</button>
            <button type="button" data-audience-set-type-filter="atomica">Atómicas</button>
            <button type="button" data-audience-set-type-filter="compuesta">Compuestas</button>
          </div>
        </div>

        <div class="pubUtmAudienceSetFilterPopoverV2__section">
          <span class="pubUtmAudienceSetFilterPopoverV2__label">Familias</span>

          <div class="pubUtmAudienceSetFilterPopoverV2__chips">
            <button type="button" data-audience-set-family-filter="todas">Todas</button>
            <button type="button" data-audience-set-family-filter="comercial">Comercial</button>
            <button type="button" data-audience-set-family-filter="comunicacion">Comunicación</button>
            <button type="button" data-audience-set-family-filter="contexto">Contexto</button>
            <button type="button" data-audience-set-family-filter="creativo">Creativo</button>
            <button type="button" data-audience-set-family-filter="segmentacion">Segmentación</button>
          </div>
        </div>

        <div class="pubUtmAudienceSetFilterPopoverV2__activity">
          <strong>Actividad reciente</strong>
          <span data-audience-set-filter-activity>
            Analizando últimas audiencias autocreadas.
          </span>
        </div>
      </div>
    </div>
  `);
}

function bindAudienceSetFiltersEventsV2_(slide) {
  if (!slide || slide.dataset.audienceSetFiltersBoundV2 === "1") return;

  slide.dataset.audienceSetFiltersBoundV2 = "1";

  const trigger = slide.querySelector("[data-audience-set-filter-trigger]");
  const popover = slide.querySelector("[data-audience-set-filter-popover]");
  const close = slide.querySelector("[data-audience-set-filter-close]");
  const sort = slide.querySelector("[data-audience-set-sort]");

  if (trigger && popover) {
    trigger.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceSetFiltersOpen = !STATE.audienceSetFiltersOpen;

      popover.hidden = !STATE.audienceSetFiltersOpen;
      trigger.setAttribute("aria-expanded", STATE.audienceSetFiltersOpen ? "true" : "false");
    };
  }

  if (close && popover && trigger) {
    close.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceSetFiltersOpen = false;
      popover.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };
  }

  if (sort) {
    sort.onchange = function () {
      STATE.audienceSetSort = String(sort.value || "recent_desc");
      renderAudienceSetCreator_(STATE.root || document);
    };
  }

  slide.querySelectorAll("[data-audience-set-type-filter]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceSetTypeFilter = btn.getAttribute("data-audience-set-type-filter") || "todas";
      renderAudienceSetCreator_(STATE.root || document);
    };
  });

  slide.querySelectorAll("[data-audience-set-family-filter]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceSetFamilyFilter = btn.getAttribute("data-audience-set-family-filter") || "todas";
      renderAudienceSetCreator_(STATE.root || document);
    };
  });
}

function syncAudienceSetFiltersUiV2_(slide, audiencias, filtered) {
  if (!slide) return;

  const all = Array.isArray(audiencias) ? audiencias : [];
  const visible = Array.isArray(filtered) ? filtered : [];
  const recentAutoCount = getAudienceSetRecentAutoCountV2_(all);

  const trigger = slide.querySelector("[data-audience-set-filter-trigger]");
  const badge = slide.querySelector("[data-audience-set-filter-badge]");
  const popover = slide.querySelector("[data-audience-set-filter-popover]");
  const result = slide.querySelector("[data-audience-set-filter-result]");
  const activity = slide.querySelector("[data-audience-set-filter-activity]");
  const sort = slide.querySelector("[data-audience-set-sort]");

  if (trigger) {
    trigger.setAttribute("aria-expanded", STATE.audienceSetFiltersOpen ? "true" : "false");
  }

  if (popover) {
    popover.hidden = !STATE.audienceSetFiltersOpen;
  }

  if (badge) {
    badge.textContent = formatInteger_(recentAutoCount);
    badge.hidden = recentAutoCount <= 0;
  }

  if (result) {
    result.textContent = formatInteger_(visible.length) + " visibles de " + formatInteger_(all.length);
  }

  if (activity) {
    activity.textContent = recentAutoCount > 0
      ? "Últimas audiencias autocreadas detectadas: " + formatInteger_(recentAutoCount)
      : "No hay audiencias autocreadas recientes en el rango leído.";
  }

  if (sort) {
    sort.value = STATE.audienceSetSort || "recent_desc";
  }

  slide.querySelectorAll("[data-audience-set-type-filter]").forEach(function (btn) {
    const value = btn.getAttribute("data-audience-set-type-filter") || "todas";
    btn.classList.toggle("is-active", value === String(STATE.audienceSetTypeFilter || "todas"));
  });

  slide.querySelectorAll("[data-audience-set-family-filter]").forEach(function (btn) {
    const value = btn.getAttribute("data-audience-set-family-filter") || "todas";
    btn.classList.toggle("is-active", value === String(STATE.audienceSetFamilyFilter || "todas"));
  });
}

function sortAudienceSetListV2_(audiencias) {
  const arr = Array.isArray(audiencias) ? audiencias.slice() : [];
  const sort = String(STATE.audienceSetSort || "recent_desc").trim();

  arr.sort(function (a, b) {
    if (sort === "recent_asc") {
      return getAudienceSetTimestampV2_(a) - getAudienceSetTimestampV2_(b);
    }

    if (sort === "members_desc") {
      return Number(b.cantidad_miembros || 0) - Number(a.cantidad_miembros || 0);
    }

    if (sort === "revenue_desc") {
      return Number(b.facturacion_asociada || 0) - Number(a.facturacion_asociada || 0);
    }

    if (sort === "sales_desc") {
      return Number(b.ventas_asociadas || 0) - Number(a.ventas_asociadas || 0);
    }

    return getAudienceSetTimestampV2_(b) - getAudienceSetTimestampV2_(a);
  });

  return arr;
}

function getAudienceSetRecentAutoCountV2_(audiencias) {
  return (Array.isArray(audiencias) ? audiencias : []).filter(isAudienceSetRecentlyAutoCreatedV2_).length;
}

function isAudienceSetRecentlyAutoCreatedV2_(audience) {
  const createdMs = getAudienceSetCreatedTimestampV2_(audience);
  const now = Date.now();
  const maxAge = 48 * 60 * 60 * 1000;

  if (!createdMs || !Number.isFinite(createdMs)) return false;
  if (createdMs > now) return false;
  if ((now - createdMs) > maxAge) return false;

  return isAudienceSetAutoCreatedV2_(audience);
}

function isAudienceSetAutoCreatedV2_(audience) {
  const a = audience || {};

  const haystack = [
    a.audiencia_id,
    a.nombre_audiencia,
    a.tipo_audiencia,
    a.tipo_visual,
    a.origen_creacion,
    a.origen_audiencia,
    a.creado_por
  ].join(" ").toLowerCase();

  if (
    haystack.indexOf("auto") !== -1 ||
    haystack.indexOf("motor") !== -1 ||
    haystack.indexOf("automat") !== -1
  ) {
    return true;
  }

  const created = getAudienceSetCreatedTimestampV2_(a);
  const updated = getAudienceSetUpdatedTimestampV2_(a);

  if (created && updated && Math.abs(created - updated) <= 60000) {
    return true;
  }

  return false;
}

function getAudienceSetFamiliesV2_(audience) {
  return String((audience && audience.familias_presentes) || "")
    .split(/[|,·]+/g)
    .map(function (x) {
      return String(x || "")
        .replace(/ó/g, "o")
        .replace(/í/g, "i")
        .replace(/á/g, "a")
        .replace(/é/g, "e")
        .replace(/ú/g, "u")
        .trim()
        .toLowerCase();
    })
    .filter(Boolean);
}

function renderAudienceSetCardDateV2_(audience) {
  const info = getAudienceSetDateInfoV2_(audience);
  if (!info.visible) return "";

  return `
    <div class="pubUtmAudienceSetCardV2__date" data-audience-set-card-date>
      <span>${escapeHtml_(info.label)}</span>
      <strong>${escapeHtml_(info.value)}</strong>
    </div>
  `;
}

function getAudienceSetDateInfoV2_(audience) {
  const createdRaw = getAudienceSetCreatedDateRawV2_(audience);
  const updatedRaw = getAudienceSetUpdatedDateRawV2_(audience);

  const createdMs = parseAudienceSetDateMsV2_(createdRaw);
  const updatedMs = parseAudienceSetDateMsV2_(updatedRaw);

  const hasCreated = Number.isFinite(createdMs);
  const hasUpdated = Number.isFinite(updatedMs);

  if (!hasCreated && !hasUpdated) {
    return {
      visible: false,
      label: "",
      value: ""
    };
  }

  const same = hasCreated && hasUpdated && Math.abs(createdMs - updatedMs) <= 60000;
  const label = same || !hasUpdated ? "Creada" : "Actualizada";
  const raw = hasUpdated ? updatedRaw : createdRaw;

  return {
    visible: true,
    label: label,
    value: formatAudienceSetShortDateV2_(raw)
  };
}

function getAudienceSetTimestampV2_(audience) {
  const updated = getAudienceSetUpdatedTimestampV2_(audience);
  const created = getAudienceSetCreatedTimestampV2_(audience);

  if (updated && Number.isFinite(updated)) return updated;
  if (created && Number.isFinite(created)) return created;

  return 0;
}

function getAudienceSetCreatedTimestampV2_(audience) {
  return parseAudienceSetDateMsV2_(getAudienceSetCreatedDateRawV2_(audience));
}

function getAudienceSetUpdatedTimestampV2_(audience) {
  return parseAudienceSetDateMsV2_(getAudienceSetUpdatedDateRawV2_(audience));
}

function getAudienceSetCreatedDateRawV2_(audience) {
  const a = audience || {};

  return (
    a.fecha_creacion ||
    a.fecha_creacion_audiencia ||
    a.created_at ||
    a.creado_en ||
    a.fecha_alta ||
    ""
  );
}

function getAudienceSetUpdatedDateRawV2_(audience) {
  const a = audience || {};

  return (
    a.fecha_actualizacion ||
    a.fecha_ultima_actualizacion ||
    a.ultima_actualizacion ||
    a.updated_at ||
    a.actualizado_en ||
    a.fecha_creacion ||
    ""
  );
}

function parseAudienceSetDateMsV2_(value) {
  const raw = String(value || "").trim();
  if (!raw) return NaN;

  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function formatAudienceSetShortDateV2_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";

  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  try {
    if (sameDay) {
      return "hoy · " + new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    }

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d).replace(".", "");
  } catch (err) {
    return formatDateTimeAr_(raw);
  }
}

function getAudienceSetFilterIconV2_() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.75 6.5h14.5M7.25 12h9.5M10 17.5h4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
    </svg>
  `;
}

/* =========================================================
   FIN · Helpers · Filtros operativos constructor
   ========================================================= */


  function isAudienceSelectedForSet_(audienceId) {
    const id = String(audienceId || "").trim();
    return STATE.selectedAudiencesForSet.indexOf(id) !== -1;
  }

  function toggleAudienceForSet_(root, audienceId) {
    const id = String(audienceId || "").trim();
    if (!id) return;

    const current = STATE.selectedAudiencesForSet.slice();
    const idx = current.indexOf(id);

    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(id);
    }

    STATE.selectedAudiencesForSet = current;
    renderAudienceSetCreator_(root);
  }

  function getSelectedAudiencesForSet_() {
    const byId = {};
    getAudienceSetSourceList_().forEach(function (a) {
      byId[a.audiencia_id] = a;
    });

    return STATE.selectedAudiencesForSet
      .map(function (id) {
        return byId[id] || null;
      })
      .filter(Boolean);
  }

  /* INICIO · renderAudienceSetPreviewHtml_ · Preview confirmativo V2 */
function renderAudienceSetPreviewHtml_(audiencias) {
  if (!audiencias || !audiencias.length) {
    return `
      <p class="pubUtmPanelSlide__text">
        Seleccioná audiencias para ver el resumen preliminar del conjunto.
      </p>
    `;
  }

  const metrics = buildAudienceSetPreviewMetrics_(audiencias);
  const familias = String(metrics.familias_cubiertas || "")
    .split("|")
    .map(function (x) { return String(x || "").trim(); })
    .filter(Boolean);

  return `
    <div class="pubUtmAudienceSetPreviewV2">
      <div class="pubUtmAudienceSetPreviewV2__head">
        <span class="pubUtmAudienceSetPreviewV2__icon" aria-hidden="true">
          ${getAudienceSetPeopleIconV2_()}
        </span>

        <div>
          <strong>Vas a crear un conjunto de audiencias con:</strong>
          <small>${formatInteger_(metrics.cantidad_audiencias)} audiencias seleccionadas</small>
        </div>
      </div>

      <div class="pubUtmAudienceSetPreviewV2__stats">
        <div>
          <span>Miembros brutos</span>
          <strong>${formatInteger_(metrics.miembros_brutos)}</strong>
        </div>

        <div>
          <span>Ventas brutas</span>
          <strong>${formatInteger_(metrics.ventas_brutas)}</strong>
        </div>

        <div>
          <span>Facturación bruta</span>
          <strong>${formatMoneyAr_(metrics.facturacion_bruta)}</strong>
        </div>
      </div>

      <div class="pubUtmAudienceSetPreviewV2__families">
        <strong>Familias cubiertas</strong>

        <div>
          ${
            familias.length
              ? familias.map(function (familia) {
                  return `<span>${escapeHtml_(audienceSetTitleCaseV2_(humanizeLabel_(familia)))}</span>`;
                }).join("")
              : `<span>Sin familias visibles</span>`
          }
        </div>
      </div>

      <!-- INICIO · Acciones preview conjunto -->
      <div class="pubUtmAudienceSetPreviewV2__actions">
        ${
          audiencias.length >= 2
            ? `
              <button type="button" class="pubUtmAudienceSetPanelCompareV2" data-audience-comparison-open>
                <span>
                  <strong>Comparar audiencias</strong>
                  <small>Analiza coincidencias, diferencias y valor del cruce</small>
                </span>
                <em aria-hidden="true">↗</em>
              </button>
            `
            : ""
        }
      
        <button type="button" class="pubUtmAudienceSetPanelCtaV2" data-audience-set-panel-create>
          <span>
            <strong>Crear conjunto de audiencias</strong>
            <small>Crea un mundo alrededor de estos usuarios</small>
          </span>
          <em aria-hidden="true">›</em>
        </button>
      </div>
      <!-- FIN · Acciones preview conjunto -->
    </div>
  `;
}
/* FIN · renderAudienceSetPreviewHtml_ · Preview confirmativo V2 */

  function buildAudienceSetPreviewMetrics_(audiencias) {
    const familias = {};
    const canales = {};

    let miembros = 0;
    let ventas = 0;
    let facturacion = 0;

    (audiencias || []).forEach(function (a) {
      miembros += Number(a.cantidad_miembros || 0);
      ventas += Number(a.ventas_asociadas || 0);
      facturacion += Number(a.facturacion_asociada || 0);

      String(a.familias_presentes || "")
        .split(/[|,·]+/g)
        .map(function (x) { return String(x || "").trim(); })
        .filter(Boolean)
        .forEach(function (f) {
          familias[f] = true;
        });

      const canal = String(a.canal_destino || "").trim();
      if (canal) canales[canal] = (canales[canal] || 0) + 1;
    });

    const canalOrdenado = Object.keys(canales).sort(function (a, b) {
      return canales[b] - canales[a];
    });

    return {
      cantidad_audiencias: audiencias.length,
      miembros_brutos: miembros,
      ventas_brutas: ventas,
      facturacion_bruta: facturacion,
      familias_cubiertas: Object.keys(familias).sort().join("|"),
      canal_sugerido: canalOrdenado[0] || "publicidad_interna"
    };
  }

  /* =========================================================
   INICIO · Comparador de audiencias · Nivel 1 frontend
   ========================================================= */

/* INICIO · renderAudienceComparisonSlide_ · Comparador con análisis de parámetro UTM */
function renderAudienceComparisonSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-comparison-slide]");
  if (!slide) return;

  const selected = getSelectedAudiencesForSet_();
  const content = slide.querySelector("[data-audience-comparison-content]");
  const title = slide.querySelector("[data-audience-comparison-title]");
  const subtitle = slide.querySelector("[data-audience-comparison-subtitle]");

  if (!content) return;

  if (selected.length < 2) {
    content.innerHTML = `
      <div class="pubUtmEmptyState">
        <h2>Seleccioná al menos 2 audiencias</h2>
        <p>La comparación necesita dos o más audiencias para detectar coincidencias, diferencias y utilidad operativa.</p>
      </div>
    `;
    return;
  }

  const comparison = buildAudienceComparisonPayload_(selected);

  if (title) {
    title.textContent = "Comparación de audiencias";
  }

  if (subtitle) {
    subtitle.textContent =
      formatInteger_(selected.length) +
      " audiencias seleccionadas · análisis de parámetros UTM compartidos";
  }

  content.innerHTML = `
    ${renderAudienceComparisonDiagnosis_(comparison)}
    ${renderAudienceComparisonSelectedCards_(comparison)}
    ${renderAudienceComparisonParamAnalysis_(comparison)}
    ${renderAudienceComparisonUtmBlock_(comparison)}
    ${renderAudienceComparisonFamilies_(comparison)}
    ${renderAudienceComparisonMetrics_(comparison)}
    ${renderAudienceComparisonConclusion_(comparison)}
  `;

  content.querySelectorAll("[data-audience-comparison-remove]").forEach(function (btn) {
    btn.onclick = function () {
      const id = btn.getAttribute("data-audience-comparison-remove") || "";
      if (!id) return;

      toggleAudienceForSet_(root, id);

      const updated = getSelectedAudiencesForSet_();
      if (updated.length < 2) {
        closeAudienceComparisonSlide_(root);
        return;
      }

      STATE.audienceComparisonPayload = null;
      STATE.audienceComparisonSelectedParam = null;
      STATE.audienceComparisonError = "";

      renderAudienceComparisonSlide_(root);
      loadAudienceComparisonParamData_(root, null);
    };
  });

  attachAudienceComparisonParamEvents_(root);
}
/* FIN · renderAudienceComparisonSlide_ · Comparador con análisis de parámetro UTM */

function buildAudienceComparisonPayload_(audiencias) {
  const selected = Array.isArray(audiencias) ? audiencias.slice() : [];
  const metrics = buildAudienceSetPreviewMetrics_(selected);

  const paramsByAudience = selected.map(function (audience) {
    return {
      audience: audience,
      title: getAudienceSetReadableTitleV2_(audience),
      condition: getAudienceSetReadableConditionV2_(audience),
      params: buildAudienceComparisonRawParamsMap_(audience)
    };
  });

  const paramComparison = compareAudienceParams_(paramsByAudience);
  const familyComparison = compareAudienceFamilies_(selected);
  const diagnosis = buildAudienceComparisonDiagnosis_(selected, metrics, paramComparison, familyComparison);

  return {
    audiencias: selected,
    metrics: metrics,
    paramsByAudience: paramsByAudience,
    sharedParams: paramComparison.shared,
    differentialParams: paramComparison.differential,
    familyComparison: familyComparison,
    diagnosis: diagnosis
  };
}

function buildAudienceComparisonDiagnosis_(audiencias, metrics, paramComparison, familyComparison) {
  const selected = Array.isArray(audiencias) ? audiencias : [];
  const sharedCount = Array.isArray(paramComparison.shared) ? paramComparison.shared.length : 0;
  const differentialCount = Array.isArray(paramComparison.differential) ? paramComparison.differential.length : 0;
  const usefulFamilies = (familyComparison.families || []).filter(function (item) {
    return item.key !== "tecnico";
  });

  const familyCount = usefulFamilies.length;
  const relation = detectAudienceComparisonRelation_(selected, sharedCount, differentialCount);
  const revenue = Number(metrics.facturacion_bruta || 0);
  const members = Number(metrics.miembros_brutos || 0);

  let compatibility = "Exploratoria";
  let compatibilityTone = "medium";
  let recommendation = "Revisar antes de crear conjunto";
  let risk = "El cruce todavía necesita más lectura operativa.";

  if (familyCount >= 4 && sharedCount >= 2) {
    compatibility = "Alta";
    compatibilityTone = "high";
    recommendation = "Crear conjunto para experimentación";
    risk = "Buen cruce de familias útiles. Revisar solapamiento real cuando esté disponible.";
  } else if (familyCount >= 3 || sharedCount >= 1) {
    compatibility = "Media";
    compatibilityTone = "medium";
    recommendation = "Crear conjunto de prueba";
    risk = "Puede funcionar como conjunto exploratorio. Conviene validar comportamiento con más ventas.";
  } else {
    compatibility = "Baja";
    compatibilityTone = "low";
    recommendation = "Mantener separadas por ahora";
    risk = "Las audiencias tienen pocas coincidencias visibles. Podrían representar intenciones distintas.";
  }

  return {
    compatibility: compatibility,
    compatibilityTone: compatibilityTone,
    relation: relation,
    recommendation: recommendation,
    risk: risk,
    familyCount: familyCount,
    sharedCount: sharedCount,
    differentialCount: differentialCount,
    revenue: revenue,
    members: members
  };
}

function detectAudienceComparisonRelation_(audiencias, sharedCount, differentialCount) {
  const selected = Array.isArray(audiencias) ? audiencias : [];

  const ids = {};
  selected.forEach(function (a) {
    if (a && a.audiencia_id) ids[String(a.audiencia_id)] = true;
  });

  const hasMotherChild = selected.some(function (a) {
    const mother = String((a && a.es_derivada_de) || "").trim();
    return mother && ids[mother];
  });

  if (hasMotherChild) return "Madre / derivada";
  if (sharedCount >= 4 && differentialCount <= 1) return "Muy similares";
  if (sharedCount >= 2 && differentialCount >= 2) return "Complementarias";
  if (sharedCount === 0) return "Independientes";

  return "Relacionadas";
}

function compareAudienceParams_(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const registry = {};

  list.forEach(function (item) {
    const params = item.params || {};

    Object.keys(params).forEach(function (field) {
      const value = params[field];
      const pairKey = field + "=" + value;

      if (!registry[pairKey]) {
        registry[pairKey] = {
          field: field,
          value: value,
          count: 0,
          audiences: []
        };
      }

      registry[pairKey].count += 1;
      registry[pairKey].audiences.push(item.title);
    });
  });

  const shared = [];
  const differential = [];

  Object.keys(registry).forEach(function (key) {
    const item = registry[key];

    if (item.count === total) {
      shared.push(item);
    } else {
      differential.push(item);
    }
  });

  shared.sort(function (a, b) {
    return a.field.localeCompare(b.field);
  });

  differential.sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;
    return a.field.localeCompare(b.field);
  });

  return {
    shared: shared,
    differential: differential
  };
}

function compareAudienceFamilies_(audiencias) {
  const selected = Array.isArray(audiencias) ? audiencias : [];
  const stats = {};

  selected.forEach(function (audience) {
    const families = getAudienceComparisonFamilies_(audience);
    const title = getAudienceSetReadableTitleV2_(audience);

    families.forEach(function (family) {
      if (!stats[family]) {
        stats[family] = {
          key: family,
          label: audienceSetTitleCaseV2_(humanizeLabel_(family)),
          count: 0,
          audiences: []
        };
      }

      stats[family].count += 1;
      stats[family].audiences.push(title);
    });
  });

  const families = Object.keys(stats)
    .map(function (key) { return stats[key]; })
    .sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

  return {
    totalAudiences: selected.length,
    families: families
  };
}

function buildAudienceComparisonRawParamsMap_(audience) {
  const map = {};
  let list = [];

  if (typeof buildAudienceSetRawParamsListV2_ === "function") {
    list = buildAudienceSetRawParamsListV2_(audience);
  }

  if (!list.length) {
    list = buildAudienceComparisonParamsFromCondition_(audience);
  }

  list.forEach(function (rawItem) {
    const parsed = parseAudienceComparisonParamPair_(rawItem);
    if (!parsed.field) return;

    map[parsed.field] = parsed.value;
  });

  return map;
}

function buildAudienceComparisonParamsFromCondition_(audience) {
  const raw = String((audience && audience.condiciones_resumen) || "").trim();
  if (!raw) return [];

  return raw
    .split(/[|·;,]+/g)
    .map(function (part) {
      return String(part || "").trim();
    })
    .filter(Boolean);
}

function parseAudienceComparisonParamPair_(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return {
      field: "",
      value: ""
    };
  }

  let field = "";
  let val = "";

  if (raw.indexOf("=") !== -1) {
    const chunks = raw.split("=");
    field = chunks.shift();
    val = chunks.join("=");
  } else if (raw.indexOf(":") !== -1) {
    const chunks = raw.split(":");
    field = chunks.shift();
    val = chunks.join(":");
  } else {
    field = raw;
    val = "";
  }

  return {
    field: normalizeAudienceComparisonParamField_(field),
    value: String(val || "").trim()
  };
}

function normalizeAudienceComparisonParamField_(value) {
  return String(value || "")
    .trim()
    .replace(/^utm_/i, "utm_")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function getAudienceComparisonFamilies_(audience) {
  return String((audience && audience.familias_presentes) || "")
    .split(/[|,·]+/g)
    .map(function (x) {
      return String(x || "")
        .replace(/ó/g, "o")
        .replace(/í/g, "i")
        .replace(/á/g, "a")
        .replace(/é/g, "e")
        .replace(/ú/g, "u")
        .trim()
        .toLowerCase();
    })
    .filter(Boolean);
}

/* INICIO · renderAudienceComparisonDiagnosis_ · KPIs enfocados en UTM */
function renderAudienceComparisonDiagnosis_(comparison) {
  const d = comparison.diagnosis || {};

  return `
    <section class="pubUtmAudienceCompareHero">
      <article class="pubUtmAudienceCompareKpi pubUtmAudienceCompareKpi--${escapeHtml_(d.compatibilityTone || "medium")}">
        <span>Compatibilidad</span>
        <strong>${escapeHtml_(d.compatibility || "—")}</strong>
        <small>${formatInteger_(d.familyCount || 0)} familias útiles cubiertas</small>
      </article>

      <article class="pubUtmAudienceCompareKpi">
        <span>Relación UTM</span>
        <strong>${escapeHtml_(d.relation || "—")}</strong>
        <small>Lectura basada en coincidencias y diferencias de parámetros</small>
      </article>

      <article class="pubUtmAudienceCompareKpi">
        <span>Parámetros</span>
        <strong>${formatInteger_(d.sharedCount || 0)} compartidos</strong>
        <small>${formatInteger_(d.differentialCount || 0)} señales diferenciales detectadas</small>
      </article>

      <article class="pubUtmAudienceCompareKpi pubUtmAudienceCompareKpi--action">
        <span>Recomendación</span>
        <strong>${escapeHtml_(d.recommendation || "—")}</strong>
        <small>${escapeHtml_(d.risk || "")}</small>
      </article>
    </section>
  `;
}
/* FIN · renderAudienceComparisonDiagnosis_ · KPIs enfocados en UTM */

/* INICIO · renderAudienceComparisonSelectedCards_ · Tarjetas didácticas */
function renderAudienceComparisonSelectedCards_(comparison) {
  const audiencias = comparison.audiencias || [];

  return `
    <section class="pubUtmAudienceCompareBlock pubUtmAudienceCompareBlock--softBlue">
      <div class="pubUtmAudienceCompareBlock__head">
        <div>
          <div class="pubUtmCard__eyebrow">Audiencias incluidas</div>
          <h3>Base del análisis</h3>
        </div>
      </div>

      <div class="pubUtmAudienceCompareSelectedGrid">
        ${audiencias.map(function (a, idx) {
          const title = getAudienceSetReadableTitleV2_(a);
          const condition = getAudienceSetReadableConditionV2_(a);
          const families = getAudienceComparisonFamilies_(a);
          const role = idx === 0 ? "Principal" : "Soporte";
          const structureLabel = audienceSetTitleCaseV2_(humanizeLabel_(a.tipo_estructura || a.tipo_visual || "audiencia"));

          return `
            <article class="pubUtmAudienceCompareSelectedCard pubUtmAudienceCompareSelectedCard--soft">
              <div class="pubUtmAudienceCompareSelectedCard__top">
                <span class="pubUtmAudienceCompareSelectedCard__icon" aria-hidden="true">
                  ${getAudienceSetPeopleIconV2_()}
                </span>

                <div>
                  <strong>${escapeHtml_(title)}</strong>
                  <small>
                    ${escapeHtml_(role)}
                    <em class="pubUtmAudienceCompareTypeTag">${escapeHtml_(structureLabel)}</em>
                  </small>
                </div>

                <button type="button" class="pubUtmAudienceCompareRemoveBtn" data-audience-comparison-remove="${escapeHtml_(a.audiencia_id || "")}">
                  <span aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
                    </svg>
                  </span>
                  <strong>Quitar</strong>
                </button>
              </div>

              <p>${escapeHtml_(condition || "Sin condiciones visibles")}</p>

              <div class="pubUtmAudienceCompareSelectedCard__stats">
                <span>${formatInteger_(a.cantidad_miembros || 0)} miembros</span>
                <span>${formatInteger_(a.ventas_asociadas || 0)} ventas</span>
                <span>${formatMoneyAr_(a.facturacion_asociada || 0)}</span>
              </div>

              <div class="pubUtmAudienceCompareSelectedCard__families">
                ${
                  families.length
                    ? families.map(function (family) {
                        return `<em>${escapeHtml_(audienceSetTitleCaseV2_(humanizeLabel_(family)))}</em>`;
                      }).join("")
                    : `<em>Sin familias</em>`
                }
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
/* FIN · renderAudienceComparisonSelectedCards_ · Tarjetas didácticas */

function renderAudienceComparisonUtmBlock_(comparison) {
  const shared = comparison.sharedParams || [];
  const differential = comparison.differentialParams || [];

  return `
    <section class="pubUtmAudienceCompareBlock pubUtmAudienceCompareBlock--twoCols">
      <article class="pubUtmAudienceComparePanel">
        <div class="pubUtmCard__eyebrow">Coincidencias UTM</div>
        <h3>Parámetros compartidos</h3>

        ${
          shared.length
            ? `
              <div class="pubUtmAudienceCompareParamList">
                ${shared.slice(0, 10).map(function (item) {
                  return `
                    <div>
                      <strong>${escapeHtml_(getAudienceComparisonParamLabel_(item.field))}</strong>
                      <code>${escapeHtml_(item.field + "=" + item.value)}</code>
                    </div>
                  `;
                }).join("")}
              </div>
            `
            : `
              <p class="pubUtmAudienceCompareEmptyText">
                No hay parámetros idénticos compartidos entre todas las audiencias seleccionadas.
              </p>
            `
        }
      </article>

      <article class="pubUtmAudienceComparePanel">
        <div class="pubUtmCard__eyebrow">Diferencias UTM</div>
        <h3>Parámetros diferenciales</h3>

        ${
          differential.length
            ? `
              <div class="pubUtmAudienceCompareParamList">
                ${differential.slice(0, 12).map(function (item) {
                  return `
                    <div>
                      <strong>${escapeHtml_(getAudienceComparisonParamLabel_(item.field))}</strong>
                      <code>${escapeHtml_(item.field + "=" + item.value)}</code>
                      <span>${formatInteger_(item.count)} de ${formatInteger_(comparison.audiencias.length)} audiencias</span>
                    </div>
                  `;
                }).join("")}
              </div>
            `
            : `
              <p class="pubUtmAudienceCompareEmptyText">
                No se detectaron diferencias UTM relevantes con la información disponible.
              </p>
            `
        }
      </article>
    </section>
  `;
}

function renderAudienceComparisonFamilies_(comparison) {
  const families = comparison.familyComparison.families || [];
  const total = Math.max(1, Number(comparison.familyComparison.totalAudiences || 1));

  return `
    <section class="pubUtmAudienceCompareBlock">
      <div class="pubUtmAudienceCompareBlock__head">
        <div>
          <div class="pubUtmCard__eyebrow">Familias UTM cubiertas</div>
          <h3>Mapa de riqueza del cruce</h3>
        </div>

        <span>${formatInteger_(families.length)} familias detectadas</span>
      </div>

      <div class="pubUtmAudienceCompareFamilyMap">
        ${
          families.length
            ? families.map(function (family) {
                const pct = Math.max(6, Math.min(100, Math.round((family.count / total) * 100)));

                return `
                  <div class="pubUtmAudienceCompareFamilyRow">
                    <div>
                      <strong>${escapeHtml_(family.label)}</strong>
                      <span>${formatInteger_(family.count)} de ${formatInteger_(total)} audiencias</span>
                    </div>

                    <div class="pubUtmAudienceCompareFamilyBar">
                      <em style="width:${pct}%"></em>
                    </div>
                  </div>
                `;
              }).join("")
            : `
              <p class="pubUtmAudienceCompareEmptyText">
                No hay familias visibles para comparar.
              </p>
            `
        }
      </div>
    </section>
  `;
}

/* INICIO · renderAudienceComparisonMetrics_ · Indicadores UTM del cruce */
function renderAudienceComparisonMetrics_(comparison) {
  const m = comparison.metrics || {};
  const d = comparison.diagnosis || {};

  return `
    <section class="pubUtmAudienceCompareBlock">
      <div class="pubUtmAudienceCompareBlock__head">
        <div>
          <div class="pubUtmCard__eyebrow">Indicadores del cruce</div>
          <h3>Resumen UTM acumulado</h3>
        </div>
      </div>

      <div class="pubUtmAudienceCompareMetricsGrid">
        <div>
          <span>Audiencias</span>
          <strong>${formatInteger_(m.cantidad_audiencias || 0)}</strong>
        </div>

        <div>
          <span>Parámetros compartidos</span>
          <strong>${formatInteger_(d.sharedCount || 0)}</strong>
        </div>

        <div>
          <span>Señales diferenciales</span>
          <strong>${formatInteger_(d.differentialCount || 0)}</strong>
        </div>

        <div>
          <span>Familias útiles</span>
          <strong>${formatInteger_(d.familyCount || 0)}</strong>
        </div>
      </div>
    </section>
  `;
}
/* FIN · renderAudienceComparisonMetrics_ · Indicadores UTM del cruce */

/* =========================================================
   INICIO · Comparador UTM · Endpoint + gráficos de parámetro
   ========================================================= */

   /* INICIO · renderAudienceComparisonParamAnalysis_ · Selector + fecha interna */
function renderAudienceComparisonParamAnalysis_(comparison) {
  const payload = STATE.audienceComparisonPayload || null;
  const loading = !!STATE.audienceComparisonLoading;
  const error = String(STATE.audienceComparisonError || "").trim();

  const sharedParams = payload && Array.isArray(payload.shared_params)
    ? payload.shared_params
    : normalizeAudienceComparisonSharedParams_(comparison.sharedParams || []);

  const selectedParam =
    STATE.audienceComparisonSelectedParam ||
    (payload && payload.selected_param ? payload.selected_param : null);

  const canShowDateControl =
    !!payload &&
    !loading &&
    !error &&
    !!selectedParam &&
    !!selectedParam.campo_utm &&
    !!selectedParam.valor_utm;

  return `
    <section class="pubUtmAudienceCompareBlock pubUtmAudienceCompareParamBlock">
      <div class="pubUtmAudienceCompareParamBlock__head">
        <div>
          <div class="pubUtmCard__eyebrow">Análisis del parámetro compartido</div>
          <h3>Selecciona el parámetro que deseas medir</h3>
          <p>
            Estas audiencias comparten determinados parámetros UTM <strong>(campo = valor)</strong>.
            Selecciona uno para visualizar su evolución y comparar cómo impacta en cada audiencia.
          </p>
        </div>

        <div class="pubUtmAudienceCompareParamBlock__headActions">
          ${canShowDateControl ? renderAudienceComparisonDateControl_() : ""}

          <span class="pubUtmAudienceCompareParamCount">
            ${formatInteger_(sharedParams.length)} parámetros compartidos
          </span>
        </div>
      </div>

      ${
        loading && !payload
          ? renderAudienceComparisonParamLoading_()
          : error
            ? renderAudienceComparisonParamError_(error)
            : renderAudienceComparisonParamBody_(sharedParams, selectedParam, payload)
      }
    </section>
  `;
}
/* FIN · renderAudienceComparisonParamAnalysis_ · Selector + fecha interna */
  
  function renderAudienceComparisonParamBody_(sharedParams, selectedParam, payload) {
    if (!sharedParams.length) {
      return `
        <div class="pubUtmAudienceCompareParamEmpty">
          <strong>No hay parámetros UTM compartidos para medir</strong>
          <span>
            Las audiencias seleccionadas no comparten una coincidencia exacta de campo = valor.
            Podés revisar las diferencias UTM o seleccionar otras audiencias.
          </span>
        </div>
      `;
    }
  
    return `
      <div class="pubUtmAudienceCompareParamSelector">
        <div class="pubUtmAudienceCompareParamSelector__label">
          <strong>Parámetros compartidos detectados</strong>
          <span>Elegí uno. El gráfico mostrará su evolución comparada entre las audiencias seleccionadas.</span>
        </div>
  
        <div class="pubUtmAudienceCompareParamChips">
          ${renderAudienceComparisonParamChips_(sharedParams, selectedParam)}
        </div>
      </div>
  
      ${
        STATE.audienceComparisonLoading
          ? renderAudienceComparisonChartsLoading_(selectedParam)
          : renderAudienceComparisonCharts_(payload, selectedParam)
      }
    `;
  }
  
  function renderAudienceComparisonParamChips_(sharedParams, selectedParam) {
    const activeKey = selectedParam
      ? buildAudienceComparisonParamKey_(selectedParam.campo_utm, selectedParam.valor_utm)
      : "";
  
    return (sharedParams || []).map(function (param) {
      const campo = getAudienceComparisonParamField_(param);
      const valor = getAudienceComparisonParamValue_(param);
      const key = buildAudienceComparisonParamKey_(campo, valor);
      const label = getAudienceComparisonParamChipLabel_(param);
      const active = key === activeKey;
  
      return `
        <button
          type="button"
          class="pubUtmAudienceCompareParamChip ${active ? "is-active" : ""}"
          data-audience-comparison-param
          data-param-field="${escapeHtml_(campo)}"
          data-param-value="${escapeHtml_(valor)}"
        >
          <strong>${escapeHtml_(label.primary)}</strong>
          <span>${escapeHtml_(label.secondary)}</span>
        </button>
      `;
    }).join("");
  }
  
  /* INICIO · renderAudienceComparisonCharts_ · Gráficos sin tooltip local */
function renderAudienceComparisonCharts_(payload, selectedParam) {
  if (!selectedParam || !selectedParam.campo_utm || !selectedParam.valor_utm) {
    return renderAudienceComparisonChartsEmpty_();
  }

  if (!payload || !payload.charts) {
    return renderAudienceComparisonChartsEmpty_();
  }

  if (payload.charts.empty) {
    return `
      ${renderAudienceComparisonChartsEmpty_(
        "Sin ventas para este parámetro",
        "El parámetro seleccionado existe en ambas audiencias, pero no tiene ventas asociadas en el rango leído."
      )}
      ${renderAudienceComparisonInsight_(payload)}
    `;
  }

  return `
    <div class="pubUtmAudienceCompareChartsGrid">
      ${renderAudienceComparisonLineChart_(payload)}
      ${renderAudienceComparisonTotalsChart_(payload)}
    </div>

    ${renderAudienceComparisonInsight_(payload)}
  `;
}
/* FIN · renderAudienceComparisonCharts_ · Gráficos sin tooltip local */
  
  /* INICIO · Skeleton gráfico comparador UTM */
function renderAudienceComparisonChartsEmpty_(title, description) {
  return `
    <div class="pubUtmAudienceCompareChartsGrid">
      <article class="pubUtmAudienceCompareChartCard">
        <div class="pubUtmAudienceCompareChartCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Gráfico 1</div>
            <h3>Evolución del parámetro seleccionado</h3>
          </div>
        </div>

        ${renderAudienceComparisonChartSkeleton_("line")}

        <div class="pubUtmAudienceCompareChartStatus">
          ${renderAudienceComparisonMiniLoader_()}
          <div>
            <strong>${escapeHtml_(title || "Selecciona un parámetro UTM")}</strong>
            <span>
              ${escapeHtml_(description || "Cuando selecciones un parámetro compartido, el gráfico cargará su evolución por fecha.")}
            </span>
          </div>
        </div>
      </article>

      <article class="pubUtmAudienceCompareChartCard">
        <div class="pubUtmAudienceCompareChartCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Gráfico 2</div>
            <h3>Volumen total por audiencia</h3>
          </div>
        </div>

        ${renderAudienceComparisonChartSkeleton_("bars")}

        <div class="pubUtmAudienceCompareChartStatus">
          ${renderAudienceComparisonMiniLoader_()}
          <div>
            <strong>Esperando selección</strong>
            <span>Este gráfico mostrará cuántas ventas aporta cada audiencia para el parámetro elegido.</span>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderAudienceComparisonChartsLoading_(selectedParam) {
  const label = selectedParam
    ? (selectedParam.campo_utm + " = " + selectedParam.valor_utm)
    : "parámetro seleccionado";

  return `
    <div class="pubUtmAudienceCompareChartsGrid">
      <article class="pubUtmAudienceCompareChartCard">
        <div class="pubUtmAudienceCompareChartCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Gráfico 1</div>
            <h3>Evolución del parámetro seleccionado</h3>
          </div>
        </div>

        ${renderAudienceComparisonChartSkeleton_("line")}

        <div class="pubUtmAudienceCompareChartStatus is-loading">
          ${renderAudienceComparisonMiniLoader_()}
          <div>
            <strong>Cargando...</strong>
            <span>Consultando ventas asociadas a ${escapeHtml_(label)}.</span>
          </div>
        </div>
      </article>

      <article class="pubUtmAudienceCompareChartCard">
        <div class="pubUtmAudienceCompareChartCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Gráfico 2</div>
            <h3>Volumen total por audiencia</h3>
          </div>
        </div>

        ${renderAudienceComparisonChartSkeleton_("bars")}

        <div class="pubUtmAudienceCompareChartStatus is-loading">
          ${renderAudienceComparisonMiniLoader_()}
          <div>
            <strong>Cargando...</strong>
            <span>Preparando el total por audiencia.</span>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderAudienceComparisonChartSkeleton_(type) {
  if (type === "bars") {
    return `
      <div class="pubUtmAudienceCompareSkeleton pubUtmAudienceCompareSkeleton--bars" aria-hidden="true">
        <span style="width:92%"></span>
        <span style="width:74%"></span>
        <span style="width:58%"></span>
      </div>
    `;
  }

  return `
    <div class="pubUtmAudienceCompareSkeleton pubUtmAudienceCompareSkeleton--line" aria-hidden="true">
      <i></i>
      <i></i>
      <i></i>
      <em></em>
    </div>
  `;
}

function renderAudienceComparisonMiniLoader_() {
  return `
    <span class="pubUtmMiniBoxLoader" aria-hidden="true">
      <i></i>
    </span>
  `;
}
/* FIN · Skeleton gráfico comparador UTM */
  
  function renderAudienceComparisonParamLoading_() {
    return `
      <div class="pubUtmAudienceCompareParamEmpty">
        <strong>Buscando parámetros compartidos</strong>
        <span>Estamos detectando las coincidencias UTM exactas entre las audiencias seleccionadas.</span>
      </div>
    `;
  }
  
  function renderAudienceComparisonParamError_(error) {
    return `
      <div class="pubUtmAudienceCompareParamEmpty pubUtmAudienceCompareParamEmpty--error">
        <strong>No se pudo cargar la comparación</strong>
        <span>${escapeHtml_(error)}</span>
  
        <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-audience-comparison-retry>
          Reintentar
        </button>
      </div>
    `;
  }
  
  /* INICIO · renderAudienceComparisonLineChart_ · Gráfico con grilla y degradado */
function renderAudienceComparisonLineChart_(payload) {
  const trend = payload.charts && payload.charts.trend ? payload.charts.trend : {};
  const dates = Array.isArray(trend.dates) ? trend.dates : [];
  const series = Array.isArray(trend.series) ? trend.series : [];

  if (!dates.length || !series.length) {
    return renderAudienceComparisonChartsEmpty_();
  }

  const W = 760;
  const H = 320;
  const padL = 46;
  const padR = 24;
  const padT = 26;
  const padB = 44;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baseY = padT + chartH;

  const allValues = [];
  series.forEach(function (s) {
    dates.forEach(function (_, idx) {
      allValues.push(Number((s.values || [])[idx] || 0));
    });
  });

  const maxY = Math.max.apply(null, allValues.concat([1]));

  function xAt_(idx) {
    if (dates.length === 1) return padL + (chartW / 2);
    return padL + ((chartW / (dates.length - 1)) * idx);
  }

  function yAt_(value) {
    return padT + chartH - ((Number(value || 0) / maxY) * chartH);
  }

  const grid = [0, 1, 2, 3, 4].map(function (i) {
    const value = Math.round((maxY / 4) * i);
    const y = yAt_(value);

    return `
      <g>
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="pubUtmAudienceCompareSvgGrid"></line>
        <text x="${padL - 10}" y="${y + 4}" class="pubUtmAudienceCompareSvgAxis" text-anchor="end">${value}</text>
      </g>
    `;
  }).join("");

  const defs = `
    <defs>
      <pattern id="pubUtmAudienceCompareGridPattern" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(36,121,255,.10)" stroke-width="1"></path>
      </pattern>

      ${series.map(function (s, seriesIdx) {
        const color = getAudienceComparisonColor_(s.color_index != null ? s.color_index : seriesIdx);
        return `
          <linearGradient id="pubUtmAudienceLineGradient${seriesIdx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${escapeHtml_(color)}" stop-opacity=".24"></stop>
            <stop offset="58%" stop-color="${escapeHtml_(color)}" stop-opacity=".08"></stop>
            <stop offset="100%" stop-color="${escapeHtml_(color)}" stop-opacity="0"></stop>
          </linearGradient>
        `;
      }).join("")}
    </defs>
  `;

  const paths = series.map(function (s, seriesIdx) {
    const color = getAudienceComparisonColor_(s.color_index != null ? s.color_index : seriesIdx);
    const offset = typeof getAudienceComparisonPointOffset_ === "function"
      ? getAudienceComparisonPointOffset_(seriesIdx, series.length)
      : { x: 0 };

    const values = dates.map(function (_, idx) {
      return Number((s.values || [])[idx] || 0);
    });

    const points = values.map(function (value, idx) {
      return {
        x: xAt_(idx) + offset.x,
        y: yAt_(value),
        value: value,
        date: dates[idx] || ""
      };
    });

    const d = points.map(function (point, idx) {
      const prefix = idx === 0 ? "M" : "L";
      return prefix + " " + point.x + " " + point.y;
    }).join(" ");

    const areaD = points.length
      ? d + " L " + points[points.length - 1].x + " " + baseY + " L " + points[0].x + " " + baseY + " Z"
      : "";

    /* INICIO · Hitbox tooltip · Puntos gráfico UTM */
const circles = points.map(function (point) {
  const label = s.label || s.nombre_audiencia || s.audiencia_id || "Audiencia";
  const dateLabel = formatAudienceComparisonDateLabel_(point.date);
  const valueLabel = formatInteger_(point.value) + " ventas";

  return `
    <circle
      cx="${point.x}"
      cy="${point.y}"
      r="16"
      fill="transparent"
      stroke="transparent"
      class="pubUtmAudienceCompareSvgPointHitbox"
      data-audience-comparison-tip
      data-tip-color="${escapeHtml_(color)}"
      data-tip-label="${escapeHtml_(label)}"
      data-tip-date="${escapeHtml_(dateLabel)}"
      data-tip-value="${escapeHtml_(valueLabel)}"
    ></circle>

    <circle
      cx="${point.x}"
      cy="${point.y}"
      r="5"
      class="pubUtmAudienceCompareSvgPoint"
      fill="${escapeHtml_(color)}"
      data-audience-comparison-tip
      data-tip-color="${escapeHtml_(color)}"
      data-tip-label="${escapeHtml_(label)}"
      data-tip-date="${escapeHtml_(dateLabel)}"
      data-tip-value="${escapeHtml_(valueLabel)}"
    ></circle>
  `;
}).join("");
/* FIN · Hitbox tooltip · Puntos gráfico UTM */
    return `
      <g>
        ${areaD ? `<path d="${areaD}" fill="url(#pubUtmAudienceLineGradient${seriesIdx})" class="pubUtmAudienceCompareSvgArea"></path>` : ""}
        <path d="${d}" fill="none" stroke="${escapeHtml_(color)}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="pubUtmAudienceCompareSvgLine"></path>
        ${circles}
      </g>
    `;
  }).join("");

  const xLabels = dates.map(function (date, idx) {
    if (dates.length > 8 && idx !== 0 && idx !== dates.length - 1 && idx % Math.ceil(dates.length / 5) !== 0) {
      return "";
    }

    return `
      <text x="${xAt_(idx)}" y="${H - 16}" class="pubUtmAudienceCompareSvgAxis" text-anchor="middle">
        ${escapeHtml_(formatAudienceComparisonDateShort_(date))}
      </text>
    `;
  }).join("");

  return `
    <article class="pubUtmAudienceCompareChartCard">
      <div class="pubUtmAudienceCompareChartCard__head">
        <div>
          <div class="pubUtmCard__eyebrow">Gráfico 1</div>
          <h3>Evolución del parámetro seleccionado</h3>
          <p>Ventas por fecha asociadas al parámetro dentro de cada audiencia.</p>
        </div>
      </div>

      ${
        dates.length < 2
          ? `
            <div class="pubUtmAudienceCompareChartNotice">
              Hay un solo día con actividad. Por eso se muestran puntos; la línea de tendencia aparecerá cuando exista más de un día en el rango.
            </div>
          `
          : ""
      }

      <div class="pubUtmAudienceCompareLegend">
        ${series.map(function (s, idx) {
          const color = getAudienceComparisonColor_(s.color_index != null ? s.color_index : idx);
          return `
            <span>
              <em style="background:${escapeHtml_(color)}"></em>
              ${escapeHtml_(s.label || s.audiencia_id || "Audiencia")}
            </span>
          `;
        }).join("")}
      </div>

      <div class="pubUtmAudienceCompareSvgWrap">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ventas por parámetro UTM">
          ${defs}
          <rect x="${padL}" y="${padT}" width="${chartW}" height="${chartH}" rx="5" fill="url(#pubUtmAudienceCompareGridPattern)" class="pubUtmAudienceCompareSvgPlotBg"></rect>
          ${grid}
          <line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" class="pubUtmAudienceCompareSvgAxisLine"></line>
          ${paths}
          ${xLabels}
        </svg>
      </div>
    </article>
  `;
}
/* FIN · renderAudienceComparisonLineChart_ · Gráfico con grilla y degradado */
  
  function renderAudienceComparisonTotalsChart_(payload) {
    const totals = payload.charts && payload.charts.totals ? payload.charts.totals : {};
    const items = Array.isArray(totals.items) ? totals.items : [];
  
    if (!items.length) {
      return `
        <article class="pubUtmAudienceCompareChartCard">
          <div class="pubUtmAudienceCompareChartEmpty">
            <strong>Sin volumen acumulado</strong>
            <span>No se detectaron ventas para este parámetro.</span>
          </div>
        </article>
      `;
    }
  
    const max = Math.max.apply(null, items.map(function (item) {
      return Number(item.ventas || 0);
    }).concat([1]));
  
    return `
      <article class="pubUtmAudienceCompareChartCard">
        <div class="pubUtmAudienceCompareChartCard__head">
          <div>
            <div class="pubUtmCard__eyebrow">Gráfico 2</div>
            <h3>Volumen total por audiencia</h3>
            <p>Total de ventas acumuladas para el parámetro seleccionado.</p>
          </div>
        </div>
  
        <div class="pubUtmAudienceCompareTotalBars">
          ${items.map(function (item, idx) {
            const color = getAudienceComparisonColor_(item.color_index != null ? item.color_index : idx);
            const ventas = Number(item.ventas || 0);
            const pctWidth = Math.max(4, Math.round((ventas / max) * 100));
  
            return `
              <div
                class="pubUtmAudienceCompareTotalBar"
                data-audience-comparison-tip
                data-tip-color="${escapeHtml_(color)}"
                data-tip-label="${escapeHtml_(item.label || item.nombre_audiencia || item.audiencia_id || "Audiencia")}"
                data-tip-date="Total del rango"
                data-tip-value="${escapeHtml_(formatInteger_(ventas) + " ventas · " + formatPercentSafe_(item.pct || 0))}"
              >
                <div class="pubUtmAudienceCompareTotalBar__top">
                  <strong>${escapeHtml_(item.label || item.audiencia_id || "Audiencia")}</strong>
                  <span>${formatInteger_(ventas)} ventas</span>
                </div>
  
                <div class="pubUtmAudienceCompareTotalBar__track">
                  <em style="width:${pctWidth}%; background:${escapeHtml_(color)}"></em>
                </div>
  
                <small>${formatPercentSafe_(item.pct || 0)} del volumen del parámetro</small>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }
  
  function renderAudienceComparisonInsight_(payload) {
    const summary = payload && payload.summary ? payload.summary : {};
    const selected = payload && payload.selected_param ? payload.selected_param : null;
  
    return `
      <div class="pubUtmAudienceCompareParamInsight">
        <span class="pubUtmAudienceCompareParamInsight__icon" aria-hidden="true">
          ${getAudienceComparisonIcon_()}
        </span>
  
        <div>
          <div class="pubUtmCard__eyebrow">Lectura automática</div>
          <strong>${escapeHtml_(selected ? selected.label : "Parámetro UTM")}</strong>
          <p>${escapeHtml_(summary.lectura || "Selecciona un parámetro para generar una lectura operativa.")}</p>
        </div>
      </div>
    `;
  }
  
  /* INICIO · attachAudienceComparisonParamEvents_ · Chips + calendario + tooltips */
function attachAudienceComparisonParamEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-comparison-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-audience-comparison-param]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const campo = btn.getAttribute("data-param-field") || "";
      const valor = btn.getAttribute("data-param-value") || "";

      if (!campo || !valor) return;

      loadAudienceComparisonParamData_(root, {
        campo_utm: campo,
        valor_utm: valor
      });
    };
  });

  slide.querySelectorAll("[data-audience-comparison-retry]").forEach(function (btn) {
    btn.onclick = function () {
      loadAudienceComparisonParamData_(root, STATE.audienceComparisonSelectedParam || null);
    };
  });

  const dateTrigger = slide.querySelector("[data-audience-comparison-date-trigger]");
  if (dateTrigger) {
    dateTrigger.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const range = getAudienceComparisonDateRange_();

      if (range.open) {
        STATE.audienceComparisonDateRange = closeAudienceComparisonDatePicker_(range);
      } else {
        STATE.audienceComparisonDateRange = openAudienceComparisonDatePicker_(range);
      }

      renderAudienceComparisonSlide_(root);
    };
  }

  slide.querySelectorAll("[data-audience-comparison-date-popover]").forEach(function (popover) {
    popover.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    };
  });

  slide.querySelectorAll("[data-audience-comparison-date-cancel]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceComparisonDateRange = closeAudienceComparisonDatePicker_(getAudienceComparisonDateRange_());
      renderAudienceComparisonSlide_(root);
    };
  });

  const dateAll = slide.querySelector("[data-audience-comparison-date-all]");
  if (dateAll) {
    dateAll.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      STATE.audienceComparisonDateRange = getAudienceComparisonDefaultDateRange_();

      if (STATE.audienceComparisonSelectedParam) {
        loadAudienceComparisonParamData_(root, STATE.audienceComparisonSelectedParam);
      } else {
        renderAudienceComparisonSlide_(root);
      }
    };
  }

  slide.querySelectorAll("[data-audience-comparison-calendar-nav]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const direction = Number(btn.getAttribute("data-audience-comparison-calendar-nav") || 0);
      STATE.audienceComparisonDateRange = moveAudienceComparisonCalendarMonth_(
        getAudienceComparisonDateRange_(),
        direction
      );

      renderAudienceComparisonSlide_(root);
    };
  });

  slide.querySelectorAll("[data-audience-comparison-calendar-day]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const iso = btn.getAttribute("data-audience-comparison-calendar-day") || "";
      if (!isValidAudienceComparisonIsoDate_(iso)) return;

      STATE.audienceComparisonDateRange = selectAudienceComparisonCalendarDay_(
        getAudienceComparisonDateRange_(),
        iso
      );

      renderAudienceComparisonSlide_(root);
    };
  });

  const dateApply = slide.querySelector("[data-audience-comparison-date-apply]");
  if (dateApply) {
    dateApply.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const range = getAudienceComparisonDateRange_();
      const draftFrom = String(range.draftFrom || "").trim();
      const draftTo = String(range.draftTo || "").trim();

      if (!draftFrom && !draftTo) {
        alert("Seleccioná un día de inicio y un día de cierre para aplicar el rango.");
        return;
      }

      const from = draftFrom || draftTo;
      const to = draftTo || draftFrom;

      if (!isValidAudienceComparisonIsoDate_(from) || !isValidAudienceComparisonIsoDate_(to)) {
        alert("El rango de fechas no es válido.");
        return;
      }

      if (compareAudienceComparisonIsoDates_(from, to) > 0) {
        alert("La fecha desde no puede ser posterior a la fecha hasta.");
        return;
      }

      STATE.audienceComparisonDateRange = {
        mode: "custom",
        from: from,
        to: to,
        open: false,
        draftFrom: from,
        draftTo: to,
        viewYear: range.viewYear,
        viewMonth: range.viewMonth
      };

      if (STATE.audienceComparisonSelectedParam) {
        loadAudienceComparisonParamData_(root, STATE.audienceComparisonSelectedParam);
      } else {
        renderAudienceComparisonSlide_(root);
      }
    };
  }

  bindAudienceComparisonTooltips_(slide);
}
/* FIN · attachAudienceComparisonParamEvents_ · Chips + calendario + tooltips */
  
  /* INICIO · loadAudienceComparisonParamData_ · Request con rango opcional */
function loadAudienceComparisonParamData_(root, param) {
  const selected = getSelectedAudiencesForSet_();
  if (selected.length < 2) return;

  const apiBase = resolveApiBase_();
  if (!apiBase) {
    STATE.audienceComparisonError = "No encontré la URL del backend.";
    renderAudienceComparisonSlide_(root);
    return;
  }

  const audienceIds = selected
    .map(function (a) { return a.audiencia_id; })
    .filter(Boolean)
    .join(",");

  const selectedParam = param && param.campo_utm && param.valor_utm
    ? {
        campo_utm: String(param.campo_utm || "").trim(),
        valor_utm: String(param.valor_utm || "").trim()
      }
    : null;

  const dateRange = getAudienceComparisonDateRange_();
  const hasCustomRange =
    dateRange.mode === "custom" &&
    isValidAudienceComparisonIsoDate_(dateRange.from) &&
    isValidAudienceComparisonIsoDate_(dateRange.to);

  STATE.audienceComparisonLoading = true;
  STATE.audienceComparisonError = "";

  if (selectedParam) {
    STATE.audienceComparisonSelectedParam = selectedParam;
  } else {
    STATE.audienceComparisonSelectedParam = null;
  }

  renderAudienceComparisonSlide_(root);

  const requestKey = [
    audienceIds,
    selectedParam ? selectedParam.campo_utm : "",
    selectedParam ? selectedParam.valor_utm : "",
    hasCustomRange ? dateRange.from : "",
    hasCustomRange ? dateRange.to : "",
    Date.now()
  ].join("|");

  STATE.audienceComparisonRequestKey = requestKey;

  const params = {
    action: "getPublicidadUtmComparacionParametro",
    audiencia_ids: audienceIds
  };

  if (selectedParam) {
    params.campo_utm = selectedParam.campo_utm;
    params.valor_utm = selectedParam.valor_utm;
  }

  if (selectedParam && hasCustomRange) {
    params.from = dateRange.from;
    params.to = dateRange.to;
  }

  jsonpRequest_(apiBase, params)
    .then(function (res) {
      if (STATE.audienceComparisonRequestKey !== requestKey) return;

      if (!res || res.ok !== true) {
        throw new Error((res && res.error) ? res.error : "No se pudo cargar la comparación del parámetro.");
      }

      STATE.audienceComparisonPayload = res;
      STATE.audienceComparisonLoading = false;
      STATE.audienceComparisonError = "";

      if (res.selected_param && res.selected_param.campo_utm && res.selected_param.valor_utm) {
        STATE.audienceComparisonSelectedParam = {
          campo_utm: res.selected_param.campo_utm,
          valor_utm: res.selected_param.valor_utm
        };
      }

      renderAudienceComparisonSlide_(root);
    })
    .catch(function (err) {
      if (STATE.audienceComparisonRequestKey !== requestKey) return;

      STATE.audienceComparisonLoading = false;
      STATE.audienceComparisonError = String(err && err.message ? err.message : err);
      renderAudienceComparisonSlide_(root);
    });
}
/* FIN · loadAudienceComparisonParamData_ · Request con rango opcional */
  
  /* INICIO · Tooltip global · Comparador audiencias */
function bindAudienceComparisonTooltips_(slide) {
  if (!slide) return;

  const tooltip = ensureAudienceComparisonTooltip_();
  if (!tooltip) return;

  slide.querySelectorAll("[data-audience-comparison-tip]").forEach(function (node) {
    node.onmouseenter = function (ev) {
      showAudienceComparisonTooltip_(tooltip, node, ev);
    };

    node.onmousemove = function (ev) {
      showAudienceComparisonTooltip_(tooltip, node, ev);
    };

    node.onmouseleave = function () {
      tooltip.hidden = true;
    };
  });
}

function ensureAudienceComparisonTooltip_() {
  let tooltip = document.querySelector("[data-audience-comparison-tooltip-global]");

  if (tooltip) return tooltip;

  tooltip = document.createElement("div");
  tooltip.className = "pubUtmAudienceCompareTooltip pubUtmAudienceCompareTooltip--global";
  tooltip.setAttribute("data-audience-comparison-tooltip-global", "1");
  tooltip.hidden = true;

  document.body.appendChild(tooltip);

  return tooltip;
}

function showAudienceComparisonTooltip_(tooltip, node, ev) {
  const color = node.getAttribute("data-tip-color") || "#2479FF";
  const label = node.getAttribute("data-tip-label") || "Audiencia";
  const date = node.getAttribute("data-tip-date") || "";
  const value = node.getAttribute("data-tip-value") || "";

  tooltip.innerHTML = `
    <strong style="color:${escapeHtml_(color)}">${escapeHtml_(label)}</strong>
    <span>${escapeHtml_(date)}</span>
    <b>${escapeHtml_(value)}</b>
  `;

  tooltip.hidden = false;
  positionAudienceComparisonTooltip_(tooltip, ev);
}

function positionAudienceComparisonTooltip_(tooltip, ev) {
  if (!tooltip || !ev) return;

  const offsetX = 72;
  const offsetY = 16;
  const safe = 12;

  const viewportW = window.innerWidth || document.documentElement.clientWidth || 1200;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;

  const w = tooltip.offsetWidth || 240;
  const h = tooltip.offsetHeight || 92;

  let left = ev.clientX + offsetX;
  let top = ev.clientY + offsetY;

  if (left + w > viewportW - safe) {
    left = ev.clientX - w - offsetX;
  }

  if (top + h > viewportH - safe) {
    top = ev.clientY - h - offsetY;
  }

  left = Math.max(safe, Math.min(left, viewportW - w - safe));
  top = Math.max(safe, Math.min(top, viewportH - h - safe));

  tooltip.style.left = left + "px";
  tooltip.style.top = top + "px";
}
/* FIN · Tooltip global · Comparador audiencias */

/* INICIO · Helpers fecha · Comparador audiencias */
function getAudienceComparisonDefaultDateRange_() {
  const today = new Date();

  return {
    mode: "all",
    from: "",
    to: "",
    open: false,
    draftFrom: "",
    draftTo: "",
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth()
  };
}

function getAudienceComparisonDateRange_() {
  const range = normalizeAudienceComparisonDateRange_(STATE.audienceComparisonDateRange);
  STATE.audienceComparisonDateRange = range;
  return range;
}

function normalizeAudienceComparisonDateRange_(range) {
  const r = range || {};
  const today = new Date();

  const mode = String(r.mode || "all").trim().toLowerCase();

  let from = String(r.from || "").trim();
  let to = String(r.to || "").trim();

  if (mode !== "custom" || !isValidAudienceComparisonIsoDate_(from) || !isValidAudienceComparisonIsoDate_(to)) {
    from = "";
    to = "";
  }

  const draftFromRaw = String(r.draftFrom || "").trim();
  const draftToRaw = String(r.draftTo || "").trim();

  const draftFrom = isValidAudienceComparisonIsoDate_(draftFromRaw)
    ? draftFromRaw
    : from;

  const draftTo = isValidAudienceComparisonIsoDate_(draftToRaw)
    ? draftToRaw
    : to;

  let viewYear = Number(r.viewYear);
  let viewMonth = Number(r.viewMonth);

  if (!Number.isFinite(viewYear) || !Number.isFinite(viewMonth) || viewMonth < 0 || viewMonth > 11) {
    const seed = draftFrom || from || getAudienceComparisonTodayIso_();
    const seedDate = parseAudienceComparisonIsoDate_(seed) || today;

    viewYear = seedDate.getFullYear();
    viewMonth = seedDate.getMonth();
  }

  return {
    mode: from && to ? "custom" : "all",
    from: from,
    to: to,
    open: !!r.open,
    draftFrom: draftFrom,
    draftTo: draftTo,
    viewYear: viewYear,
    viewMonth: viewMonth
  };
}

function openAudienceComparisonDatePicker_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);
  const today = new Date();

  let seedDate = today;

  if (r.mode === "custom" && r.from) {
    seedDate = parseAudienceComparisonIsoDate_(r.from) || today;
  }

  return {
    mode: r.mode,
    from: r.from,
    to: r.to,
    open: true,
    draftFrom: r.mode === "custom" ? r.from : "",
    draftTo: r.mode === "custom" ? r.to : "",
    viewYear: seedDate.getFullYear(),
    viewMonth: seedDate.getMonth()
  };
}

function closeAudienceComparisonDatePicker_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);

  return {
    mode: r.mode,
    from: r.from,
    to: r.to,
    open: false,
    draftFrom: r.from,
    draftTo: r.to,
    viewYear: r.viewYear,
    viewMonth: r.viewMonth
  };
}

function moveAudienceComparisonCalendarMonth_(range, direction) {
  const r = normalizeAudienceComparisonDateRange_(range);
  const d = new Date(r.viewYear, r.viewMonth + Number(direction || 0), 1);

  return Object.assign({}, r, {
    open: true,
    viewYear: d.getFullYear(),
    viewMonth: d.getMonth()
  });
}

function selectAudienceComparisonCalendarDay_(range, iso) {
  const r = normalizeAudienceComparisonDateRange_(range);
  const selected = String(iso || "").trim();

  if (!isValidAudienceComparisonIsoDate_(selected)) return r;

  let draftFrom = String(r.draftFrom || "").trim();
  let draftTo = String(r.draftTo || "").trim();

  if (!draftFrom || (draftFrom && draftTo)) {
    draftFrom = selected;
    draftTo = "";
  } else {
    if (compareAudienceComparisonIsoDates_(selected, draftFrom) < 0) {
      draftTo = draftFrom;
      draftFrom = selected;
    } else {
      draftTo = selected;
    }
  }

  return Object.assign({}, r, {
    open: true,
    draftFrom: draftFrom,
    draftTo: draftTo
  });
}

function renderAudienceComparisonDateControl_() {
  const range = getAudienceComparisonDateRange_();
  const isCustom = range.mode === "custom";
  const label = getAudienceComparisonDateRangeLabel_(range);

  return `
    <div class="pubUtmAudienceCompareDateControl ${range.open ? "is-open" : ""}" data-audience-comparison-date-control>
      <button
        type="button"
        class="pubUtmAudienceCompareDateTrigger ${isCustom ? "is-custom" : ""}"
        data-audience-comparison-date-trigger
        aria-expanded="${range.open ? "true" : "false"}"
      >
        <span class="pubUtmAudienceCompareDateTrigger__icon" aria-hidden="true">
          ${getAudienceComparisonCalendarIcon_()}
        </span>

        <span class="pubUtmAudienceCompareDateTrigger__copy">
          <em>Fecha</em>
          <strong>${escapeHtml_(label)}</strong>
        </span>
      </button>

      <div
        class="pubUtmAudienceCompareDatePopover pubUtmAudienceCompareDatePopover--calendar"
        data-audience-comparison-date-popover
        ${range.open ? "" : "hidden"}
      >
        <div class="pubUtmAudienceCompareDatePopover__head">
          <div>
            <strong>Rango de análisis</strong>
            <span>Seleccioná un rango o medí toda la vida útil del parámetro.</span>
          </div>

          <button type="button" data-audience-comparison-date-cancel aria-label="Cerrar selector de fechas">
            ×
          </button>
        </div>

        <button type="button" class="pubUtmAudienceCompareDateAllBtn" data-audience-comparison-date-all>
          <span class="pubUtmAudienceCompareDateAllBtn__icon" aria-hidden="true">
            ${getAudienceComparisonCalendarIcon_()}
          </span>

          <span>
            <strong>Toda la vida útil</strong>
            <em>Usa todo el histórico disponible del parámetro.</em>
          </span>
        </button>

        ${renderAudienceComparisonCalendar_(range)}

        <div class="pubUtmAudienceCompareCalendarSelection">
          <strong>${escapeHtml_(getAudienceComparisonCalendarDraftLabel_(range))}</strong>
          <span>${escapeHtml_(getAudienceComparisonCalendarDraftHint_(range))}</span>
        </div>

        <div class="pubUtmAudienceCompareDatePopover__actions">
          <button type="button" class="pubUtmAudienceCompareDateGhostBtn" data-audience-comparison-date-cancel>
            Cancelar
          </button>

          <button type="button" class="pubUtmAudienceCompareDateApplyBtn" data-audience-comparison-date-apply>
            Aplicar rango
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAudienceComparisonCalendar_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);
  const monthLabel = getAudienceComparisonCalendarMonthLabel_(r.viewYear, r.viewMonth);
  const days = buildAudienceComparisonCalendarDays_(r);

  return `
    <div class="pubUtmAudienceCompareCalendar">
      <div class="pubUtmAudienceCompareCalendar__nav">
        <button type="button" data-audience-comparison-calendar-nav="-1" aria-label="Mes anterior">
          ‹
        </button>

        <strong>${escapeHtml_(monthLabel)}</strong>

        <button type="button" data-audience-comparison-calendar-nav="1" aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div class="pubUtmAudienceCompareCalendar__weekdays" aria-hidden="true">
        <span>D</span>
        <span>L</span>
        <span>M</span>
        <span>M</span>
        <span>J</span>
        <span>V</span>
        <span>S</span>
      </div>

      <div class="pubUtmAudienceCompareCalendar__grid">
        ${days.map(function (day) {
          return `
            <button
              type="button"
              class="pubUtmAudienceCompareCalendarDay ${escapeHtml_(day.className)}"
              data-audience-comparison-calendar-day="${escapeHtml_(day.iso)}"
              aria-label="${escapeHtml_(day.aria)}"
            >
              ${escapeHtml_(day.label)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function buildAudienceComparisonCalendarDays_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);
  const first = new Date(r.viewYear, r.viewMonth, 1);
  const start = new Date(r.viewYear, r.viewMonth, 1 - first.getDay());

  const draftFrom = String(r.draftFrom || "").trim();
  const draftTo = String(r.draftTo || "").trim();
  const todayIso = getAudienceComparisonTodayIso_();

  const out = [];

  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = formatAudienceComparisonIsoDate_(d);

    const isMuted = d.getMonth() !== r.viewMonth;
    const isToday = iso === todayIso;
    const isStart = draftFrom && iso === draftFrom;
    const isEnd = draftTo && iso === draftTo;
    const hasRange = draftFrom && draftTo;
    const isInRange = hasRange && compareAudienceComparisonIsoDates_(iso, draftFrom) >= 0 && compareAudienceComparisonIsoDates_(iso, draftTo) <= 0;

    const classList = [];

    if (isMuted) classList.push("is-muted");
    if (isToday) classList.push("is-today");
    if (isInRange) classList.push("is-in-range");
    if (isStart) classList.push("is-start");
    if (isEnd) classList.push("is-end");
    if (isStart || isEnd) classList.push("is-selected");

    out.push({
      iso: iso,
      label: String(d.getDate()),
      aria: formatAudienceComparisonDateLabel_(iso),
      className: classList.join(" ")
    });
  }

  return out;
}

function getAudienceComparisonCalendarMonthLabel_(year, month) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric"
    }).format(new Date(year, month, 1));
  } catch (err) {
    return String(month + 1).padStart(2, "0") + "/" + String(year);
  }
}

function getAudienceComparisonDateRangeLabel_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);

  if (r.mode === "custom") {
    return formatAudienceComparisonDateShort_(r.from) + " → " + formatAudienceComparisonDateShort_(r.to);
  }

  return "Toda la vida";
}

function getAudienceComparisonCalendarDraftLabel_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);

  if (r.draftFrom && r.draftTo) {
    return formatAudienceComparisonDateShort_(r.draftFrom) + " → " + formatAudienceComparisonDateShort_(r.draftTo);
  }

  if (r.draftFrom && !r.draftTo) {
    return "Inicio: " + formatAudienceComparisonDateShort_(r.draftFrom);
  }

  if (r.mode === "custom" && r.from && r.to) {
    return formatAudienceComparisonDateShort_(r.from) + " → " + formatAudienceComparisonDateShort_(r.to);
  }

  return "Toda la vida útil";
}

function getAudienceComparisonCalendarDraftHint_(range) {
  const r = normalizeAudienceComparisonDateRange_(range);

  if (r.draftFrom && !r.draftTo) {
    return "Seleccioná la fecha de cierre para completar el rango.";
  }

  if (r.draftFrom && r.draftTo) {
    return "Rango listo para aplicar.";
  }

  return "Sin rango personalizado. Se usará el histórico completo del parámetro.";
}

function isValidAudienceComparisonIsoDate_(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return false;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  const date = new Date(y, m - 1, d);

  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function compareAudienceComparisonIsoDates_(a, b) {
  const left = String(a || "").trim();
  const right = String(b || "").trim();

  if (!isValidAudienceComparisonIsoDate_(left) || !isValidAudienceComparisonIsoDate_(right)) {
    return 0;
  }

  if (left > right) return 1;
  if (left < right) return -1;
  return 0;
}

function parseAudienceComparisonIsoDate_(value) {
  const raw = String(value || "").trim();
  if (!isValidAudienceComparisonIsoDate_(raw)) return null;

  const parts = raw.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatAudienceComparisonIsoDate_(date) {
  const d = date instanceof Date ? date : new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return y + "-" + m + "-" + day;
}

function getAudienceComparisonTodayIso_() {
  return formatAudienceComparisonIsoDate_(new Date());
}

function getAudienceComparisonCalendarIcon_() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.25 4.75v2.5M16.75 4.75v2.5M5.75 9.25h12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M6.75 6.25h10.5A2.25 2.25 0 0 1 19.5 8.5v8.75a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V8.5a2.25 2.25 0 0 1 2.25-2.25Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
      <path d="M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16h.01M12 16h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></path>
    </svg>
  `;
}
/* FIN · Helpers fecha · Comparador audiencias */
  
  function normalizeAudienceComparisonSharedParams_(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      return {
        campo_utm: item.campo_utm || item.field || "",
        valor_utm: item.valor_utm || item.value || "",
        key: item.key || buildAudienceComparisonParamKey_(item.campo_utm || item.field || "", item.valor_utm || item.value || ""),
        label: item.label || getAudienceComparisonParamLabel_(item.campo_utm || item.field || "")
      };
    }).filter(function (item) {
      return item.campo_utm && item.valor_utm;
    });
  }
  
  function getAudienceComparisonParamField_(param) {
    return String((param && (param.campo_utm || param.field)) || "").trim();
  }
  
  function getAudienceComparisonParamValue_(param) {
    return String((param && (param.valor_utm || param.value)) || "").trim();
  }
  
  function getAudienceComparisonParamChipLabel_(param) {
    const campo = getAudienceComparisonParamField_(param);
    const valor = getAudienceComparisonParamValue_(param);
  
    return {
      primary: audienceSetTitleCaseV2_(humanizeLabel_(valor || "Parámetro")),
      secondary: campo + " = " + valor
    };
  }
  
  function buildAudienceComparisonParamKey_(campo, valor) {
    return String(campo || "").trim().toLowerCase() + "=" + String(valor || "").trim().toLowerCase();
  }
  
  function getAudienceComparisonColor_(idx) {
    const colors = [
      "#2479FF",
      "#16A34A",
      "#F97316",
      "#7C3AED",
      "#0EA5E9",
      "#DC2626"
    ];
  
    const n = Math.max(0, Number(idx || 0));
    return colors[n % colors.length];
  }
  
/* INICIO · Offset visual · Puntos superpuestos en gráfico UTM */
function getAudienceComparisonPointOffset_(seriesIdx, totalSeries) {
  const total = Math.max(1, Number(totalSeries || 1));
  const idx = Math.max(0, Number(seriesIdx || 0));

  if (total <= 1) {
    return { x: 0 };
  }

  const spread = 10;
  const center = (total - 1) / 2;

  return {
    x: (idx - center) * spread
  };
}
/* FIN · Offset visual · Puntos superpuestos en gráfico UTM */

  function formatAudienceComparisonDateLabel_(date) {
    const raw = String(date || "").trim();
    if (!raw) return "Sin fecha";
  
    try {
      const d = new Date(raw + "T00:00:00");
      if (isNaN(d.getTime())) return raw;
  
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(d).replace(".", "");
    } catch (err) {
      return raw;
    }
  }
  
  function formatAudienceComparisonDateShort_(date) {
    const raw = String(date || "").trim();
    if (!raw) return "";
  
    try {
      const d = new Date(raw + "T00:00:00");
      if (isNaN(d.getTime())) return raw.slice(5);
  
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short"
      }).format(d).replace(".", "");
    } catch (err) {
      return raw.slice(5);
    }
  }
  
  function formatPercentSafe_(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "0%";
    return n.toFixed(n % 1 === 0 ? 0 : 2).replace(".", ",") + "%";
  }
  
  /* =========================================================
     FIN · Comparador UTM · Endpoint + gráficos de parámetro
     ========================================================= */

function renderAudienceComparisonConclusion_(comparison) {
  const d = comparison.diagnosis || {};

  return `
    <section class="pubUtmAudienceCompareConclusion">
      <div class="pubUtmAudienceCompareConclusion__icon" aria-hidden="true">
        ${getAudienceComparisonIcon_()}
      </div>

      <div>
        <div class="pubUtmCard__eyebrow">Conclusión operativa</div>
        <h3>${escapeHtml_(d.recommendation || "Revisar cruce")}</h3>

        <p>
          Estas audiencias muestran una relación <strong>${escapeHtml_(d.relation || "—")}</strong>
          con compatibilidad <strong>${escapeHtml_(d.compatibility || "—")}</strong>.
          El cruce cubre <strong>${formatInteger_(d.familyCount || 0)} familias útiles</strong>,
          comparte <strong>${formatInteger_(d.sharedCount || 0)} parámetros UTM</strong>
          y presenta <strong>${formatInteger_(d.differentialCount || 0)} señales diferenciales</strong>.
        </p>

        <small>${escapeHtml_(d.risk || "")}</small>
      </div>
    </section>
  `;
}

function getAudienceComparisonParamLabel_(field) {
  const clean = String(field || "")
    .replace(/^utm_/i, "")
    .replace(/_/g, " ")
    .trim();

  return audienceSetTitleCaseV2_(humanizeLabel_(clean || field || "Parámetro"));
}

function getAudienceComparisonIcon_() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7.5h5.2M12.2 7.5 17 16.5M7 16.5h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <circle cx="6" cy="7.5" r="2.35" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
      <circle cx="18" cy="16.5" r="2.35" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
      <circle cx="6" cy="16.5" r="2.35" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
    </svg>
  `;
}

/* =========================================================
   FIN · Comparador de audiencias · Nivel 1 frontend
   ========================================================= */

/* INICIO · Smart Select · Canal sugerido y prioridad del conjunto */
function initAudienceSetSmartSelects_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) return;

  const canalSelect = slide.querySelector('select[name="canal_sugerido"]');
  const prioridadSelect = slide.querySelector('select[name="prioridad_conjunto"]');

  if (canalSelect) {
    enhanceAudienceSetNativeSelect_(root, canalSelect, {
      title: "Clasificación comercial",
      placeholder: "Seleccionar clasificación",
      options: [
        {
          value: "recompra",
          label: "Recompra",
          description: "Para clientes que ya compraron y pueden volver a comprar el mismo producto, categoría o una variante similar.",
          icon: "refresh",
          tone: "green"
        },
        {
          value: "cross_sell",
          label: "Cross sell",
          description: "Para ofrecer productos complementarios o extensiones relacionadas con la compra anterior.",
          icon: "nodes",
          tone: "orange"
        },
        {
          value: "upsell",
          label: "Upsell",
          description: "Para llevar compradores de una unidad, pack chico o versión simple hacia una opción de mayor valor.",
          icon: "arrow_up",
          tone: "blue"
        },
        {
          value: "fidelizacion",
          label: "Fidelización",
          description: "Para mantener activa la relación con compradores recientes o clientes valiosos sin vender agresivamente.",
          icon: "heart",
          tone: "pink"
        },
        {
          value: "reactivacion",
          label: "Reactivación",
          description: "Para recuperar clientes compradores que llevan tiempo sin volver a comprar o interactuar.",
          icon: "power",
          tone: "red"
        },
        {
          value: "educacion_post_compra",
          label: "Educación post-compra",
          description: "Para explicar uso, cuidados, beneficios, instrucciones o próximos pasos después de la compra.",
          icon: "book",
          tone: "indigo"
        },
        {
          value: "experimentacion",
          label: "Experimentación",
          description: "Para testear hipótesis comerciales, ofertas, creativos, audiencias o secuencias antes de fijarlas.",
          icon: "spark",
          tone: "violet"
        },
        {
          value: "mayorista_volumen",
          label: "Mayorista / volumen",
          description: "Para compradores con potencial de comprar por cantidad, packs grandes, reposición o volumen.",
          icon: "boxes",
          tone: "amber"
        }
      ]
    });
  }

  if (prioridadSelect) {
    enhanceAudienceSetNativeSelect_(root, prioridadSelect, {
      title: "Prioridad operativa",
      placeholder: "Seleccionar prioridad",
      options: [
        {
          value: "alta",
          label: "Alta",
          description: "Público sensible para campañas activas o decisiones comerciales próximas.",
          icon: "arrowUp",
          tone: "blue"
        },
        {
          value: "media",
          label: "Media",
          description: "Público útil, pero no crítico para ejecución inmediata.",
          icon: "minus",
          tone: "slate"
        },
        {
          value: "baja",
          label: "Baja",
          description: "Público exploratorio, auxiliar o pendiente de más validación.",
          icon: "arrowDown",
          tone: "gray"
        }
      ]
    });
  }

  if (!window.__pubUtmSmartSelectGlobalCloseBound) {
    window.__pubUtmSmartSelectGlobalCloseBound = true;

    document.addEventListener("click", function (ev) {
      if (ev.target.closest(".pubUtmSmartSelect")) return;
    
      document.querySelectorAll(".pubUtmSmartSelect.is-open").forEach(function (node) {
        node.classList.remove("is-open");
        node.classList.remove("is-floating");
        clearAudienceSetSmartSelectFloating_(node);
      });
    });
    
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
    
      document.querySelectorAll(".pubUtmSmartSelect.is-open").forEach(function (node) {
        node.classList.remove("is-open");
        node.classList.remove("is-floating");
        clearAudienceSetSmartSelectFloating_(node);
      });
    });
    
    window.addEventListener("resize", repositionOpenAudienceSetSmartSelects_);
    window.addEventListener("scroll", repositionOpenAudienceSetSmartSelects_, true);
  }
}

function enhanceAudienceSetNativeSelect_(root, select, config) {
  if (!select || select.dataset.pubutmSmartSelectReady === "1") return;

  select.dataset.pubutmSmartSelectReady = "1";
  select.classList.add("pubUtmNativeSelectHidden");

  const wrapper = document.createElement("div");
  wrapper.className = "pubUtmSmartSelect";
  wrapper.setAttribute("data-smart-select-name", select.getAttribute("name") || "");

  select.insertAdjacentElement("afterend", wrapper);

  renderAudienceSetSmartSelect_(root, select, wrapper, config);
}

function renderAudienceSetSmartSelect_(root, select, wrapper, config) {
  const currentValue = String(select.value || "").trim();
  const options = Array.isArray(config.options) ? config.options : [];
  const selected = options.find(function (item) {
    return item.value === currentValue;
  }) || options[0];

  if (selected && select.value !== selected.value) {
    select.value = selected.value;
  }

  wrapper.innerHTML = `
    <button type="button" class="pubUtmSmartSelect__trigger" data-smart-select-trigger>
      <span class="pubUtmSmartSelect__icon pubUtmSmartSelect__icon--${escapeHtml_(selected.tone || "blue")}">
        ${getAudienceSetSmartSelectIcon_(selected.icon)}
      </span>

      <span class="pubUtmSmartSelect__copy">
        <strong>${escapeHtml_(selected.label || config.placeholder || "Seleccionar")}</strong>
        <em>${escapeHtml_(selected.description || "")}</em>
      </span>

      <span class="pubUtmSmartSelect__chevron" aria-hidden="true">
        <svg viewBox="0 0 20 20">
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </span>
    </button>

    <div class="pubUtmSmartSelect__menu">
      <div class="pubUtmSmartSelect__menuHead">
        <strong>${escapeHtml_(config.title || "Seleccionar opción")}</strong>
        <button type="button" class="pubUtmSmartSelect__close" data-smart-select-close aria-label="Cerrar">
          <svg viewBox="0 0 20 20">
            <path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>

      <div class="pubUtmSmartSelect__options">
        ${options.map(function (item) {
          const active = item.value === selected.value;

          return `
            <button
              type="button"
              class="pubUtmSmartSelect__option ${active ? "is-active" : ""}"
              data-smart-select-value="${escapeHtml_(item.value)}"
            >
              <span class="pubUtmSmartSelect__icon pubUtmSmartSelect__icon--${escapeHtml_(item.tone || "blue")}">
                ${getAudienceSetSmartSelectIcon_(item.icon)}
              </span>

              <span class="pubUtmSmartSelect__copy">
                <strong>${escapeHtml_(item.label || item.value)}</strong>
                <em>${escapeHtml_(item.description || "")}</em>
              </span>

              <span class="pubUtmSmartSelect__activeDot"></span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;

  const trigger = wrapper.querySelector("[data-smart-select-trigger]");
  const closeBtn = wrapper.querySelector("[data-smart-select-close]");

  if (trigger) {
    trigger.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
  
      const willOpen = !wrapper.classList.contains("is-open");
  
      document.querySelectorAll(".pubUtmSmartSelect.is-open").forEach(function (node) {
        if (node !== wrapper) {
          node.classList.remove("is-open");
          node.classList.remove("is-floating");
          clearAudienceSetSmartSelectFloating_(node);
        }
      });
  
      wrapper.classList.toggle("is-open", willOpen);
      wrapper.classList.toggle("is-floating", willOpen);
  
      if (willOpen) {
        requestAnimationFrame(function () {
          positionAudienceSetSmartSelectMenu_(wrapper);
        });
      } else {
        clearAudienceSetSmartSelectFloating_(wrapper);
      }
    };
  }

  if (closeBtn) {
    closeBtn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
  
      wrapper.classList.remove("is-open");
      wrapper.classList.remove("is-floating");
      clearAudienceSetSmartSelectFloating_(wrapper);
    };
  }

  wrapper.querySelectorAll("[data-smart-select-value]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const value = btn.getAttribute("data-smart-select-value") || "";
      select.value = value;

      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));

      wrapper.classList.remove("is-open");
wrapper.classList.remove("is-floating");
clearAudienceSetSmartSelectFloating_(wrapper);

renderAudienceSetSmartSelect_(root, select, wrapper, config);
syncAudienceSetSaveButton_(root);
    };
  });
}

/* INICIO · Posicionamiento flotante · Smart Select */
function positionAudienceSetSmartSelectMenu_(wrapper) {
  if (!wrapper) return;

  const trigger = wrapper.querySelector("[data-smart-select-trigger]");
  const menu = wrapper.querySelector(".pubUtmSmartSelect__menu");

  if (!trigger || !menu) return;

  const rect = trigger.getBoundingClientRect();

  const viewportW = window.innerWidth || document.documentElement.clientWidth || 1200;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;

  const desiredWidth = Math.min(540, Math.max(rect.width, 460), viewportW - 24);
  const left = Math.max(12, Math.min(rect.left, viewportW - desiredWidth - 12));

  const estimatedHeight = Math.min(menu.scrollHeight || 360, viewportH - 32);
  let top = rect.bottom + 8;

  if (top + estimatedHeight > viewportH - 12) {
    top = Math.max(12, rect.top - estimatedHeight - 8);
  }

  const maxHeight = Math.max(220, Math.min(estimatedHeight, viewportH - top - 12));

  wrapper.style.setProperty("--pubutm-smart-left", left + "px");
  wrapper.style.setProperty("--pubutm-smart-top", top + "px");
  wrapper.style.setProperty("--pubutm-smart-width", desiredWidth + "px");
  wrapper.style.setProperty("--pubutm-smart-max-height", maxHeight + "px");
}

function clearAudienceSetSmartSelectFloating_(wrapper) {
  if (!wrapper) return;

  wrapper.style.removeProperty("--pubutm-smart-left");
  wrapper.style.removeProperty("--pubutm-smart-top");
  wrapper.style.removeProperty("--pubutm-smart-width");
  wrapper.style.removeProperty("--pubutm-smart-max-height");
}

function repositionOpenAudienceSetSmartSelects_() {
  document.querySelectorAll(".pubUtmSmartSelect.is-open.is-floating").forEach(function (wrapper) {
    positionAudienceSetSmartSelectMenu_(wrapper);
  });
}
/* FIN · Posicionamiento flotante · Smart Select */

function getAudienceSetSmartSelectIcon_(type) {
  const key = String(type || "").trim();

  const icons = {
    mail: `
      <svg viewBox="0 0 24 24">
        <path d="M4.75 6.75h14.5v10.5H4.75V6.75Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
        <path d="m5.25 7.25 6.75 5.1 6.75-5.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    screen: `
      <svg viewBox="0 0 24 24">
        <path d="M4.75 5.75h14.5v10.5H4.75V5.75Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
        <path d="M9 19h6M12 16.25V19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
      </svg>
    `,
    spark: `
      <svg viewBox="0 0 24 24">
        <path d="M12 3.75 13.55 8.9 18.75 10.5l-5.2 1.6L12 17.25l-1.55-5.15-5.2-1.6 5.2-1.6L12 3.75Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
        <path d="M18 15.25l.65 2.1 2.1.65-2.1.65L18 20.75l-.65-2.1-2.1-.65 2.1-.65.65-2.1Z" fill="currentColor"></path>
      </svg>
    `,
    refresh: `
      <svg viewBox="0 0 24 24">
        <path d="M17.9 8.2A6.75 6.75 0 0 0 6 11.4M6.1 15.8A6.75 6.75 0 0 0 18 12.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
        <path d="M17.9 4.9v3.3h-3.3M6.1 19.1v-3.3h3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    nodes: `
      <svg viewBox="0 0 24 24">
        <path d="M7 8.5h5.2M12.2 8.5 17 15.5M7 15.5h10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
        <circle cx="6" cy="8.5" r="2.25" fill="none" stroke="currentColor" stroke-width="1.7"></circle>
        <circle cx="18" cy="15.5" r="2.25" fill="none" stroke="currentColor" stroke-width="1.7"></circle>
        <circle cx="6" cy="15.5" r="2.25" fill="none" stroke="currentColor" stroke-width="1.7"></circle>
      </svg>
    `,
    arrow_up: `
  <svg viewBox="0 0 24 24">
    <path d="M12 19V5M6.75 10.25 12 5l5.25 5.25" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M5.75 19.25h12.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path>
  </svg>
`,
heart: `
  <svg viewBox="0 0 24 24">
    <path d="M12 19.25s-6.75-4.1-8.25-8.15C2.7 8.25 4.35 5.5 7.15 5.5c1.75 0 3.05.9 3.85 2.05.8-1.15 2.1-2.05 3.85-2.05 2.8 0 4.45 2.75 3.4 5.6C18.75 15.15 12 19.25 12 19.25Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"></path>
  </svg>
`,
power: `
  <svg viewBox="0 0 24 24">
    <path d="M12 4.75v7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
    <path d="M8.05 7.25a7.25 7.25 0 1 0 7.9 0" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"></path>
  </svg>
`,
book: `
  <svg viewBox="0 0 24 24">
    <path d="M5.75 5.25h6.25c1.15 0 2 .85 2 2v11.5c0-.85-.7-1.5-1.55-1.5h-6.7V5.25Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
    <path d="M18.25 5.25h-4.25c-1.15 0-2 .85-2 2v11.5c0-.85.7-1.5 1.55-1.5h4.7V5.25Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
  </svg>
`,
boxes: `
  <svg viewBox="0 0 24 24">
    <path d="M4.75 9.25 12 5.5l7.25 3.75L12 13 4.75 9.25Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
    <path d="M4.75 9.25v6.9L12 19.9V13M19.25 9.25v6.9L12 19.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path>
    <path d="m8.3 7.4 7.25 3.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
  </svg>
`,
    arrowUp: `
      <svg viewBox="0 0 24 24">
        <path d="M12 18.25V5.75M7.25 10.5 12 5.75l4.75 4.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `,
    minus: `
      <svg viewBox="0 0 24 24">
        <path d="M6.5 12h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
      </svg>
    `,
    arrowDown: `
      <svg viewBox="0 0 24 24">
        <path d="M12 5.75v12.5M7.25 13.5 12 18.25l4.75-4.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `
  };

  return icons[key] || icons.spark;
}
/* FIN · Smart Select · Canal sugerido y prioridad del conjunto */

/* INICIO · Guardado real · Conjunto de audiencias */
function syncAudienceSetSaveButton_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) return;

  const saveBtn = slide.querySelector("[data-audience-set-save]");
  const notice = slide.querySelector("[data-audience-set-form-notice]");
  if (!saveBtn) return;

  const validation = validateAudienceSetForm_(root);

  saveBtn.disabled = !validation.ok;
  saveBtn.title = validation.ok
    ? "Crear conjunto de audiencias"
    : validation.message;

  if (notice) {
    notice.textContent = validation.ok
      ? "Listo. Podés crear el conjunto de audiencias."
      : validation.message;

    notice.classList.toggle("is-ready", validation.ok);
  }
}

function validateAudienceSetForm_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) {
    return {
      ok: false,
      message: "No se encontró el slide de creación."
    };
  }

  const nombre = readAudienceSetField_(slide, "nombre_conjunto");
  const objetivo = readAudienceSetField_(slide, "objetivo_comercial");
  const descripcion = readAudienceSetField_(slide, "descripcion_conjunto");
  const selected = getSelectedAudiencesForSet_();

  if (!nombre) {
    return {
      ok: false,
      message: "Completá el nombre del conjunto."
    };
  }

  if (!objetivo) {
    return {
      ok: false,
      message: "Completá el objetivo comercial."
    };
  }

  if (!descripcion) {
    return {
      ok: false,
      message: "Completá la descripción del conjunto."
    };
  }

  if (!selected.length) {
    return {
      ok: false,
      message: "Seleccioná al menos una audiencia."
    };
  }

  return {
    ok: true,
    message: "Listo para crear."
  };
}

function readAudienceSetField_(slide, name) {
  const el = slide.querySelector('[name="' + name + '"]');
  return el ? String(el.value || "").trim() : "";
}

function collectAudienceSetPayload_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-slide]");
  if (!slide) return null;

  const selected = getSelectedAudiencesForSet_();
  if (!selected.length) return null;

  const objetivoRaw = readAudienceSetField_(slide, "objetivo_comercial") || "publicidad_interna";
  const prioridadRaw = readAudienceSetField_(slide, "prioridad_conjunto") || "media";

  const objetivoPermitido = normalizeAudienceSetObjetivoSupabase_(objetivoRaw);
  const prioridadPermitida = normalizeAudienceSetPrioridadSupabase_(prioridadRaw);

  const audiencias = selected.map(function (aud, idx) {
    return {
      audiencia_id: aud.audiencia_id || aud.id || "",
      codigo_audiencia: aud.codigo_audiencia || aud.audiencia_id || aud.id || "",
      rol_audiencia: idx === 0 ? "principal" : "soporte",
      prioridad: idx + 1,
      peso: 1
    };
  });

  return {
    nombre_conjunto: readAudienceSetField_(slide, "nombre_conjunto"),
    descripcion_conjunto: readAudienceSetField_(slide, "descripcion_conjunto"),
    tipo_conjunto: "manual",
    objetivo_comercial: objetivoPermitido,
    prioridad_operativa: prioridadPermitida,
    audiencias: audiencias,

    /* Compatibilidad visual/local */
    mode: "create",
    canal_sugerido: objetivoPermitido,
    estado_conjunto: "activo",
    prioridad_conjunto: prioridadPermitida,
    origen_creacion: "manual_desde_panel",
    creado_por: "panel-publicidad-utm"
  };
}
function prepareAudienceSetSave_(root) {
  const validation = validateAudienceSetForm_(root);

  if (!validation.ok) {
    alert(validation.message);
    syncAudienceSetSaveButton_(root);
    return;
  }

  const payload = collectAudienceSetPayload_(root);
  if (!payload) return;

  ensureAudienceSetSaveModal_(root);
  openAudienceSetSaveModal_(root, payload);
}

function ensureAudienceSetSaveModal_(root) {
  if (root.querySelector("[data-audience-set-save-modal]")) return;

  const mount = root.querySelector("#pubUtmSubSlideMount") || root;

  mount.insertAdjacentHTML("beforeend", `
    <div class="pubUtmReglaDeleteModal pubUtmAudienceSetSaveModal" data-audience-set-save-modal hidden>
      <div class="pubUtmReglaDeleteModal__backdrop" data-audience-set-save-cancel="1"></div>

      <div class="pubUtmReglaDeleteModal__panel" role="dialog" aria-modal="true" aria-label="Crear conjunto de audiencias">
        <div class="pubUtmReglaDeleteModal__view" data-audience-set-save-view="confirm">
          <div class="pubUtmReglaDeleteModal__icon pubUtmAudienceSetSaveModal__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5.75 4A2.75 2.75 0 0 0 3 6.75v10.5A2.75 2.75 0 0 0 5.75 20h12.5A2.75 2.75 0 0 0 21 17.25V6.75A2.75 2.75 0 0 0 18.25 4H5.75Zm0 1.5h12.5c.69 0 1.25.56 1.25 1.25v10.5c0 .69-.56 1.25-1.25 1.25H5.75c-.69 0-1.25-.56-1.25-1.25V6.75c0-.69.56-1.25 1.25-1.25ZM7.5 8.75A.75.75 0 0 1 8.25 8h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 3.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7.5 12Zm0 3.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Z" fill="currentColor"></path>
            </svg>
          </div>

          <div class="pubUtmReglaDeleteModal__copy">
            <div class="pubUtmCard__eyebrow">Crear conjunto de audiencias</div>
            <h3>¿Confirmás crear este conjunto?</h3>

            <p>
              Vas a crear el conjunto <strong data-audience-set-save-name>—</strong>.
            </p>

            <p class="pubUtmReglaDeleteModal__note">
              <strong>Audiencias seleccionadas:</strong> <span data-audience-set-save-count>—</span><br>
              El sistema guardará este conjunto como una audiencia personalizada reutilizable para futuras acciones comerciales.
            </p>

            <div class="pubUtmReglaDeleteModal__feedback" data-audience-set-save-feedback hidden></div>
          </div>

          <div class="pubUtmReglaDeleteModal__actions">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-audience-set-save-cancel="1">
              Cancelar
            </button>

            <button type="button" class="pubUtmBtn pubUtmBtn--primary pubUtmBtn--loadingCapable" data-audience-set-save-confirm>
              <span class="pubUtmBtn__label" data-audience-set-save-confirm-label>Confirmar creación</span>
              <span class="pubUtmBtn__spinner" aria-hidden="true"></span>
            </button>
          </div>
        </div>

        <div class="pubUtmReglaDeleteModal__view" data-audience-set-save-view="success" hidden>
          <div class="pubUtmReglaDeleteModal__icon pubUtmReglaDeleteModal__icon--success">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.55 16.2 5.8 12.45a.9.9 0 1 1 1.27-1.27l2.48 2.48 7.38-7.38a.9.9 0 0 1 1.27 1.27l-8.02 8.02a.9.9 0 0 1-1.27 0Z" fill="currentColor"></path>
            </svg>
          </div>

          <div class="pubUtmReglaDeleteModal__copy">
            <div class="pubUtmCard__eyebrow">Audiencia personalizada creada</div>
            <h3>Se ha creado una nueva audiencia personalizada</h3>

            <p>
              El conjunto <strong data-audience-set-save-created-id>—</strong> quedó guardado correctamente.
            </p>

            <p class="pubUtmReglaDeleteModal__note">
              Los conjuntos de audiencias pueden ser utilizados o reutilizados en distintas ofertas dirigidas
              a públicos más segmentados u objetivos.
            </p>
          </div>

          <div class="pubUtmReglaDeleteModal__actions">
            <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-audience-set-save-cancel="1">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  attachAudienceSetSaveModalEvents_(root);
}

function attachAudienceSetSaveModalEvents_(root) {
  const modal = root.querySelector("[data-audience-set-save-modal]");
  if (!modal) return;

  modal.querySelectorAll("[data-audience-set-save-cancel]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceSetSaveModal_(root);
    };
  });

  const confirmBtn = modal.querySelector("[data-audience-set-save-confirm]");
  if (confirmBtn) {
    confirmBtn.onclick = function () {
      confirmAudienceSetSave_(root);
    };
  }
}

function openAudienceSetSaveModal_(root, payload) {
  const modal = root.querySelector("[data-audience-set-save-modal]");
  if (!modal) return;

  STATE.pendingAudienceSetPayload = payload;

  const nameNode = modal.querySelector("[data-audience-set-save-name]");
  const countNode = modal.querySelector("[data-audience-set-save-count]");
  const feedback = modal.querySelector("[data-audience-set-save-feedback]");
  const confirmBtn = modal.querySelector("[data-audience-set-save-confirm]");
  const confirmLabel = modal.querySelector("[data-audience-set-save-confirm-label]");

  const selected = getSelectedAudiencesForSet_();

  if (nameNode) nameNode.textContent = payload.nombre_conjunto || "Conjunto sin nombre";
  if (countNode) countNode.textContent = formatInteger_(selected.length);

  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = "";
  }

  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.classList.remove("is-loading");
  }

  if (confirmLabel) {
    confirmLabel.textContent = "Confirmar creación";
  }

  setAudienceSetSaveModalState_(modal, "confirm");

  modal.hidden = false;
}

function closeAudienceSetSaveModal_(root) {
  const modal = root.querySelector("[data-audience-set-save-modal]");
  if (!modal) return;

  modal.hidden = true;
  STATE.pendingAudienceSetPayload = null;
}

function setAudienceSetSaveModalState_(modal, state) {
  if (!modal) return;

  modal.querySelectorAll("[data-audience-set-save-view]").forEach(function (node) {
    node.hidden = node.getAttribute("data-audience-set-save-view") !== state;
  });
}

function confirmAudienceSetSave_(root) {
  const modal = root.querySelector("[data-audience-set-save-modal]");
  const payload = STATE.pendingAudienceSetPayload;

  if (!modal || !payload) return;

  const confirmBtn = modal.querySelector("[data-audience-set-save-confirm]");
  const confirmLabel = modal.querySelector("[data-audience-set-save-confirm-label]");
  const feedback = modal.querySelector("[data-audience-set-save-feedback]");
  const createdIdNode = modal.querySelector("[data-audience-set-save-created-id]");

  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = "";
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.classList.add("is-loading");
  }

  if (confirmLabel) {
    confirmLabel.textContent = "Creando en Supabase...";
  }

  createPublicidadUtmConjuntoSupabase_(payload)
    .then(function (res) {
      if (!res || res.ok !== true) {
        throw new Error(
          res && res.error
            ? res.error
            : "No se pudo crear el conjunto en Supabase."
        );
      }

      const codigo = res.codigo_conjunto || res.conjunto_id || payload.nombre_conjunto || "Conjunto creado";

      if (createdIdNode) {
        createdIdNode.textContent = codigo;
      }

      return refreshPublicidadUtmConjuntosAfterCreate_(root)
        .catch(function (refreshErr) {
          console.warn(
            "[Publicidad UTM] El conjunto se creó, pero falló el refresco visual:",
            refreshErr
          );
        })
        .then(function () {
          return res;
        });
    })
    .then(function (res) {
      STATE.pendingAudienceSetPayload = null;
      STATE.selectedAudiencesForSet = [];
      STATE.audienceSetSearch = "";

      setAudienceSetSaveModalState_(modal, "success");

      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove("is-loading");
      }

      if (confirmLabel) {
        confirmLabel.textContent = "Confirmar creación";
      }

      closeAudienceSetCreator_(root);

      console.info(
        "[Publicidad UTM] Conjunto creado desde Supabase:",
        res.codigo_conjunto || res.conjunto_id || "sin_codigo"
      );
    })
    .catch(function (err) {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = String(err && err.message ? err.message : err);
      }

      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove("is-loading");
      }

      if (confirmLabel) {
        confirmLabel.textContent = "Confirmar creación";
      }

      console.error("[Publicidad UTM] Error al crear conjunto desde Supabase:", err);
    });
}

  /* INICIO · renderControl_ · Centro visual de gobierno UTM */
function renderControl_(root, controlRows) {
  const tbody = root.querySelector("[data-pubutm-control-body]");
  if (!tbody) return;

  const rows = Array.isArray(controlRows) ? controlRows : [];
  STATE.controlRows = rows;

  bindControlEvents_(root);

  const filteredRows = filterControlRows_(rows);
  const pagination = getControlPagination_(filteredRows.length);
  const visibleRows = filteredRows.slice(pagination.start, pagination.end);

  const summary = buildControlSummary_(rows);
  const issues = buildControlIssues_(rows);

  renderControlHealth_(root, summary);
  renderControlDiagnosis_(root, summary);
  renderControlIssues_(root, issues);
  syncControlToolbar_(root, visibleRows.length, rows.length, filteredRows.length, pagination);
  renderControlPagination_(root, pagination);

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="pubUtmControlEmptyTable">
            <strong>Sin datos de control disponibles.</strong>
            <span>El backend todavía no devolvió filas dentro de <code>payload.control</code>.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  if (!filteredRows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="pubUtmControlEmptyTable">
            <strong>No hay audiencias para este filtro.</strong>
            <span>Probá limpiar la búsqueda o cambiar el filtro seleccionado.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = visibleRows.map(function (row) {
    const status = getControlRowStatus_(row);
    const audienceId = String(row.audiencia_id || "").trim();
    const audienceName = row.nombre_audiencia || row.audiencia_id || "—";
    const overlap = getControlOverlapValue_(row.porcentaje_solapamiento_miembros || 0);

    return `
      <tr class="pubUtmControlTable__row pubUtmControlTable__row--${escapeHtml_(status.tone)}">
        <td>
          <span class="pubUtmControlStatus pubUtmControlStatus--${escapeHtml_(status.tone)}">
            <i aria-hidden="true"></i>
            <span>${escapeHtml_(status.label)}</span>
          </span>
        </td>

        <td>
          <div class="pubUtmControlAudienceCell">
            <strong>${escapeHtml_(audienceName)}</strong>
            <span>${escapeHtml_(audienceId || "Sin ID")}</span>
          </div>
        </td>

        <td>
          ${renderControlSoftPill_(row.tipo_estructura || "—", getControlStructureTone_(row))}
        </td>

        <td>
          ${renderControlSoftPill_(row.nivel_operativo || "Sin nivel", row.nivel_operativo ? "blue" : "warning")}
        </td>

        <td>
          <span class="pubUtmControlMutedCell">
            ${escapeHtml_(row.es_derivada_de || "—")}
          </span>
        </td>

        <td>
          ${renderControlOverlap_(overlap)}
        </td>

        <td>
          ${renderControlSoftPill_(row.bloque_cerrado || "—", isControlBlocked_(row) ? "violet" : "slate")}
        </td>

        <td>
          ${renderControlSoftPill_(row.prioridad_visual || "Sin prioridad", getControlPriorityTone_(row.prioridad_visual))}
        </td>

        <td>
          <button
            type="button"
            class="pubUtmControlOpenBtn"
            data-control-open-audience="${escapeHtml_(audienceId)}"
            ${audienceId ? "" : "disabled"}
          >
            Ver
          </button>
        </td>
      </tr>
    `;
  }).join("");
}
/* FIN · renderControl_ · Centro visual de gobierno UTM */


/* INICIO · Control UTM · Eventos */
function bindControlEvents_(root) {
  if (!root || root.dataset.pubutmControlEventsBound === "1") return;
  root.dataset.pubutmControlEventsBound = "1";

  root.addEventListener("input", function (ev) {
    const input = ev.target.closest("[data-control-search]");
    if (!input) return;
  
    STATE.controlSearch = String(input.value || "");
    STATE.controlPage = 1;
  
    renderControl_(root, STATE.controlRows || []);
  });

  root.addEventListener("click", function (ev) {
    const filterBtn = ev.target.closest("[data-control-filter]");
if (filterBtn) {
  ev.preventDefault();
  ev.stopPropagation();

  STATE.controlFilter = filterBtn.getAttribute("data-control-filter") || "todos";
  STATE.controlPage = 1;

  renderControl_(root, STATE.controlRows || []);
  return;
}

const pageBtn = ev.target.closest("[data-control-page]");
if (pageBtn) {
  ev.preventDefault();
  ev.stopPropagation();

  const dir = pageBtn.getAttribute("data-control-page") || "";
  const rows = Array.isArray(STATE.controlRows) ? STATE.controlRows : [];
  const filteredRows = filterControlRows_(rows);
  const pagination = getControlPagination_(filteredRows.length);

  if (dir === "prev") {
    STATE.controlPage = Math.max(1, pagination.page - 1);
  }

  if (dir === "next") {
    STATE.controlPage = Math.min(pagination.totalPages, pagination.page + 1);
  }

  renderControl_(root, STATE.controlRows || []);
  return;
}

    const openBtn = ev.target.closest("[data-control-open-audience]");
    if (openBtn) {
      ev.preventDefault();
      ev.stopPropagation();

      const audienceId = openBtn.getAttribute("data-control-open-audience") || "";
      if (!audienceId) return;

      openAudienceDetailSlide_(root, audienceId, "summary");
      return;
    }

    const actionBtn = ev.target.closest("[data-control-action]");
    if (actionBtn) {
      ev.preventDefault();
      ev.stopPropagation();

      const action = actionBtn.getAttribute("data-control-action") || "";

      if (action === "reload") {
        loadAllPubUtmData_(root);
        return;
      }

      if (action === "issues") {
        const issuesNode = root.querySelector("[data-pubutm-control-issues]");
        if (issuesNode) {
          issuesNode.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  });
}
/* FIN · Control UTM · Eventos */


/* INICIO · Control UTM · Resumen */
function buildControlSummary_(rows) {
  const data = {
    total: 0,
    correctas: 0,
    revisar: 0,
    incompletas: 0,
    riesgo_alto: 0,
    solapamiento_alto: 0,
    solapamiento_medio: 0,
    sin_prioridad: 0,
    sin_nivel: 0,
    derivadas: 0,
    compuestas: 0,
    atomicas: 0,
    bloqueadas: 0
  };

  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    const status = getControlRowStatus_(row);
    const overlap = getControlOverlapValue_(row.porcentaje_solapamiento_miembros || 0);
    const structure = getControlStructureKey_(row);

    data.total += 1;

    if (status.key === "ok") data.correctas += 1;
    if (status.key === "revisar") data.revisar += 1;
    if (status.key === "incompleta") data.incompletas += 1;
    if (status.key === "riesgo") data.riesgo_alto += 1;

    if (overlap >= 70) data.solapamiento_alto += 1;
    if (overlap >= 40 && overlap < 70) data.solapamiento_medio += 1;

    if (!hasControlValue_(row.prioridad_visual)) data.sin_prioridad += 1;
    if (!hasControlValue_(row.nivel_operativo)) data.sin_nivel += 1;

    if (structure === "derivada") data.derivadas += 1;
    if (structure === "compuesta") data.compuestas += 1;
    if (structure === "atomica") data.atomicas += 1;

    if (isControlBlocked_(row)) data.bloqueadas += 1;
  });

  data.problemas = data.revisar + data.incompletas + data.riesgo_alto;
  data.salud_pct = data.total ? Math.round((data.correctas / data.total) * 100) : 0;

  return data;
}


function renderControlHealth_(root, summary) {
  const host = root.querySelector("[data-pubutm-control-health]");
  if (!host) return;

  const s = summary || {};

  host.innerHTML = `
    ${renderControlHealthCard_({
      label: "Audiencias controladas",
      value: s.total,
      caption: "Filas auditadas por el motor",
      tone: "blue"
    })}

    ${renderControlHealthCard_({
      label: "Salud operativa",
      value: String(s.salud_pct || 0) + "%",
      caption: formatInteger_(s.correctas || 0) + " audiencias correctas",
      tone: (s.salud_pct >= 80 ? "green" : (s.salud_pct >= 55 ? "orange" : "red"))
    })}

    ${renderControlHealthCard_({
      label: "Riesgo alto",
      value: s.riesgo_alto,
      caption: "Solapamiento o estructura crítica",
      tone: (s.riesgo_alto > 0 ? "red" : "green")
    })}

    ${renderControlHealthCard_({
      label: "Sin prioridad",
      value: s.sin_prioridad,
      caption: "Audiencias sin decisión comercial",
      tone: (s.sin_prioridad > 0 ? "orange" : "green")
    })}

    ${renderControlHealthCard_({
      label: "Compuestas",
      value: s.compuestas,
      caption: "Cruces entre familias o señales",
      tone: "violet"
    })}

    ${renderControlHealthCard_({
      label: "Derivadas",
      value: s.derivadas,
      caption: "Audiencias nacidas de otra base",
      tone: "cyan"
    })}
  `;
}


function renderControlHealthCard_(config) {
  const cfg = config || {};

  return `
    <article class="pubUtmControlHealthCard pubUtmControlHealthCard--${escapeHtml_(cfg.tone || "blue")}">
      <div class="pubUtmControlHealthCard__top">
        <span>${escapeHtml_(cfg.label || "Indicador")}</span>
        <i aria-hidden="true"></i>
      </div>

      <strong>${escapeHtml_(formatControlValue_(cfg.value))}</strong>
      <p>${escapeHtml_(cfg.caption || "")}</p>
    </article>
  `;
}
/* FIN · Control UTM · Resumen */


/* INICIO · Control UTM · Diagnóstico */
function renderControlDiagnosis_(root, summary) {
  const host = root.querySelector("[data-pubutm-control-diagnosis]");
  if (!host) return;

  const s = summary || {};
  const tone = getControlDiagnosisTone_(s);

  let title = "Motor UTM estable";
  let text = "Las audiencias bajo control no muestran señales críticas. Podés revisar la tabla para validar prioridades y bloques operativos.";

  if (!s.total) {
    title = "Sin datos de control";
    text = "El dashboard no devolvió filas de control. Todavía no podemos diagnosticar la calidad de las audiencias.";
  } else if (s.riesgo_alto > 0) {
    title = "Atención: hay audiencias con riesgo alto";
    text = "Se detectaron " + formatInteger_(s.riesgo_alto) + " audiencias con señales críticas. Revisá primero solapamientos altos, derivaciones incompletas y audiencias sin jerarquía.";
  } else if (s.problemas > 0) {
    title = "Control operativo con advertencias";
    text = "El motor tiene " + formatInteger_(s.problemas) + " audiencias para revisar. No es grave, pero conviene ordenar prioridad, nivel operativo o solapamientos medios.";
  }

  host.classList.remove(
    "pubUtmControlDiagnosis--green",
    "pubUtmControlDiagnosis--orange",
    "pubUtmControlDiagnosis--red",
    "pubUtmControlDiagnosis--slate"
  );

  host.classList.add("pubUtmControlDiagnosis--" + tone);

  host.innerHTML = `
    <div class="pubUtmControlDiagnosis__icon" aria-hidden="true">
      ${getPubUtmHeaderIcon_(tone === "red" ? "alert" : "engine")}
    </div>

    <div>
      <div class="pubUtmCard__eyebrow">Lectura operativa</div>
      <h3>${escapeHtml_(title)}</h3>
      <p>${escapeHtml_(text)}</p>

      <div class="pubUtmControlDiagnosis__chips">
        <span>${formatInteger_(s.total || 0)} auditadas</span>
        <span>${formatInteger_(s.problemas || 0)} con problemas</span>
        <span>${formatInteger_(s.solapamiento_alto || 0)} solapamiento alto</span>
      </div>
    </div>
  `;
}


function getControlDiagnosisTone_(summary) {
  const s = summary || {};

  if (!s.total) return "slate";
  if (s.riesgo_alto > 0 || s.salud_pct < 55) return "red";
  if (s.problemas > 0 || s.salud_pct < 80) return "orange";

  return "green";
}
/* FIN · Control UTM · Diagnóstico */


/* INICIO · Control UTM · Incidencias */
function buildControlIssues_(rows) {
  const issues = [];

  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    const status = getControlRowStatus_(row);
    const overlap = getControlOverlapValue_(row.porcentaje_solapamiento_miembros || 0);
    const audienceName = row.nombre_audiencia || row.audiencia_id || "Audiencia sin nombre";

    if (status.key === "ok") return;

    issues.push({
      tone: status.tone,
      title: status.label + " · " + audienceName,
      text: buildControlIssueText_(row, status, overlap),
      audience_id: row.audiencia_id || ""
    });
  });

  issues.sort(function (a, b) {
    const order = { danger: 1, warning: 2, incomplete: 3, ok: 4 };
    return (order[a.tone] || 9) - (order[b.tone] || 9);
  });

  return issues.slice(0, 6);
}


function renderControlIssues_(root, issues) {
  const host = root.querySelector("[data-pubutm-control-issues]");
  if (!host) return;

  const body = host.querySelector(".pubUtmControlIssues__body");
  if (!body) return;

  const list = Array.isArray(issues) ? issues : [];

  if (!list.length) {
    body.innerHTML = `
      <div class="pubUtmControlIssues__empty">
        <strong>No se detectaron incidencias relevantes.</strong>
        <span>El motor no muestra señales críticas en las filas de control disponibles.</span>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="pubUtmControlIssues__list">
      ${list.map(function (issue) {
        return `
          <article class="pubUtmControlIssue pubUtmControlIssue--${escapeHtml_(issue.tone || "warning")}">
            <span class="pubUtmControlIssue__dot" aria-hidden="true"></span>

            <div>
              <strong>${escapeHtml_(issue.title || "Incidencia")}</strong>
              <p>${escapeHtml_(issue.text || "")}</p>
            </div>

            ${
              issue.audience_id
                ? `
                  <button type="button" data-control-open-audience="${escapeHtml_(issue.audience_id)}">
                    Ver
                  </button>
                `
                : ""
            }
          </article>
        `;
      }).join("")}
    </div>
  `;
}


function buildControlIssueText_(row, status, overlap) {
  if (status.key === "riesgo") {
    return "Tiene " + formatControlOverlapLabel_(overlap) + " de solapamiento. Conviene revisar si esta audiencia duplica intención, usuarios o uso comercial.";
  }

  if (!hasControlValue_(row.prioridad_visual)) {
    return "No tiene prioridad visual asignada. El sistema puede mostrarla, pero todavía no tiene peso comercial claro.";
  }

  if (!hasControlValue_(row.nivel_operativo)) {
    return "No tiene nivel operativo asignado. Conviene definir si es principal, soporte, exploratoria o secundaria.";
  }

  if (isControlDerived_(row) && !hasControlValue_(row.es_derivada_de)) {
    return "Figura como derivada, pero no tiene una audiencia madre visible.";
  }

  if (overlap >= 40) {
    return "Tiene solapamiento medio. No es crítico, pero puede competir con otras audiencias similares.";
  }

  return "Requiere revisión operativa antes de usarla en campañas o conjuntos.";
}
/* FIN · Control UTM · Incidencias */


/* INICIO · Control UTM · Filtros y tabla */
function filterControlRows_(rows) {
  const q = normalizeControlText_(STATE.controlSearch || "");
  const filter = String(STATE.controlFilter || "todos");

  return (Array.isArray(rows) ? rows : []).filter(function (row) {
    const status = getControlRowStatus_(row);
    const structure = getControlStructureKey_(row);
    const overlap = getControlOverlapValue_(row.porcentaje_solapamiento_miembros || 0);

    if (filter === "problemas" && status.key === "ok") return false;
    if (filter === "riesgo" && status.key !== "riesgo") return false;
    if (filter === "solapamiento" && overlap < 40) return false;
    if (filter === "sin_prioridad" && hasControlValue_(row.prioridad_visual)) return false;
    if (filter === "derivadas" && structure !== "derivada") return false;
    if (filter === "compuestas" && structure !== "compuesta") return false;
    if (filter === "bloqueadas" && !isControlBlocked_(row)) return false;

    if (!q) return true;

    const haystack = normalizeControlText_([
      row.audiencia_id,
      row.nombre_audiencia,
      row.tipo_estructura,
      row.tipo_visual,
      row.nivel_operativo,
      row.es_derivada_de,
      row.bloque_cerrado,
      row.prioridad_visual,
      status.label
    ].join(" "));

    return haystack.indexOf(q) !== -1;
  });
}


function syncControlToolbar_(root, visible, total, filteredTotal, pagination) {
  const count = root.querySelector("[data-control-visible-count]");

  if (count) {
    if (pagination && filteredTotal > 0) {
      count.textContent =
        formatInteger_(pagination.start + 1) +
        "-" +
        formatInteger_(pagination.end) +
        " de " +
        formatInteger_(filteredTotal);
    } else {
      count.textContent = formatInteger_(visible || 0) + " de " + formatInteger_(total || 0);
    }
  }

  const search = root.querySelector("[data-control-search]");
  if (search && search.value !== String(STATE.controlSearch || "")) {
    search.value = STATE.controlSearch || "";
  }

  root.querySelectorAll("[data-control-filter]").forEach(function (btn) {
    const value = btn.getAttribute("data-control-filter") || "todos";
    btn.classList.toggle("is-active", value === String(STATE.controlFilter || "todos"));
  });
}

/* INICIO · Control UTM · Paginación */
function getControlPagination_(totalRows) {
  const total = Math.max(0, Number(totalRows || 0));
  const pageSize = Math.max(1, Number(STATE.controlPageSize || 10));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let page = Math.max(1, Number(STATE.controlPage || 1));
  page = Math.min(page, totalPages);

  STATE.controlPage = page;

  const start = total ? (page - 1) * pageSize : 0;
  const end = total ? Math.min(start + pageSize, total) : 0;

  return {
    page: page,
    pageSize: pageSize,
    total: total,
    totalPages: totalPages,
    start: start,
    end: end
  };
}


function renderControlPagination_(root, pagination) {
  const host = root.querySelector("[data-control-pagination]");
  if (!host) return;

  const p = pagination || getControlPagination_(0);

  if (!p.total || p.total <= p.pageSize) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }

  host.hidden = false;

  host.innerHTML = `
    <button
      type="button"
      class="pubUtmControlPagination__btn"
      data-control-page="prev"
      ${p.page <= 1 ? "disabled" : ""}
      aria-label="Ver bloque anterior"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 18 9 12l6-6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </button>

    <div class="pubUtmControlPagination__meta">
      <strong>Bloque ${formatInteger_(p.page)} de ${formatInteger_(p.totalPages)}</strong>
      <span>${formatInteger_(p.start + 1)}-${formatInteger_(p.end)} de ${formatInteger_(p.total)} audiencias</span>
    </div>

    <button
      type="button"
      class="pubUtmControlPagination__btn"
      data-control-page="next"
      ${p.page >= p.totalPages ? "disabled" : ""}
      aria-label="Ver bloque siguiente"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </button>
  `;
}
/* FIN · Control UTM · Paginación */


function getControlRowStatus_(row) {
  const overlap = getControlOverlapValue_(row && row.porcentaje_solapamiento_miembros);
  const hasPriority = hasControlValue_(row && row.prioridad_visual);
  const hasLevel = hasControlValue_(row && row.nivel_operativo);

  if (overlap >= 70) {
    return {
      key: "riesgo",
      label: "Riesgo alto",
      tone: "danger"
    };
  }

  if (isControlDerived_(row) && !hasControlValue_(row && row.es_derivada_de)) {
    return {
      key: "revisar",
      label: "Revisar",
      tone: "warning"
    };
  }

  if (!hasPriority || !hasLevel) {
    return {
      key: "incompleta",
      label: "Incompleta",
      tone: "incomplete"
    };
  }

  if (overlap >= 40) {
    return {
      key: "revisar",
      label: "Revisar",
      tone: "warning"
    };
  }

  return {
    key: "ok",
    label: "Correcta",
    tone: "ok"
  };
}


function renderControlOverlap_(value) {
  const n = Number(value || 0);
  const tone = n >= 70 ? "danger" : (n >= 40 ? "warning" : "ok");

  return `
    <div class="pubUtmControlOverlap pubUtmControlOverlap--${tone}">
      <strong>${escapeHtml_(formatControlOverlapLabel_(n))}</strong>
      <span>
        <i style="width:${Math.max(0, Math.min(100, n))}%"></i>
      </span>
    </div>
  `;
}


function renderControlSoftPill_(label, tone) {
  return `
    <span class="pubUtmControlPill pubUtmControlPill--${escapeHtml_(tone || "slate")}">
      ${escapeHtml_(humanizeLabel_(label || "—"))}
    </span>
  `;
}
/* FIN · Control UTM · Filtros y tabla */


/* INICIO · Control UTM · Helpers */
function getControlOverlapValue_(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;

  if (n > 0 && n <= 1) return n * 100;

  return n;
}


function formatControlOverlapLabel_(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0%";

  return n.toFixed(n >= 10 ? 0 : 1).replace(".", ",") + "%";
}


function getControlStructureKey_(row) {
  const raw = normalizeControlText_([
    row && row.tipo_estructura,
    row && row.tipo_visual
  ].join(" "));

  if (raw.indexOf("deriv") !== -1 || hasControlValue_(row && row.es_derivada_de)) return "derivada";
  if (raw.indexOf("comp") !== -1) return "compuesta";
  if (raw.indexOf("atom") !== -1) return "atomica";

  return "otra";
}


function getControlStructureTone_(row) {
  const key = getControlStructureKey_(row);

  if (key === "derivada") return "cyan";
  if (key === "compuesta") return "violet";
  if (key === "atomica") return "blue";

  return "slate";
}


function getControlPriorityTone_(value) {
  const key = normalizeControlText_(value);

  if (!key) return "warning";
  if (key.indexOf("alta") !== -1) return "green";
  if (key.indexOf("media") !== -1) return "blue";
  if (key.indexOf("baja") !== -1) return "slate";

  return "blue";
}


function isControlDerived_(row) {
  return getControlStructureKey_(row) === "derivada";
}


function isControlBlocked_(row) {
  const raw = normalizeControlText_(row && row.bloque_cerrado);

  return raw === "si" ||
    raw === "sí" ||
    raw === "true" ||
    raw === "bloqueado" ||
    raw === "cerrado" ||
    raw === "1";
}


function hasControlValue_(value) {
  const raw = String(value == null ? "" : value).trim();

  return raw !== "" &&
    raw !== "—" &&
    raw.toLowerCase() !== "null" &&
    raw.toLowerCase() !== "undefined" &&
    raw.toLowerCase() !== "sin prioridad" &&
    raw.toLowerCase() !== "sin nivel";
}


function normalizeControlText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


function formatControlValue_(value) {
  if (typeof value === "number") return formatInteger_(value);
  return String(value == null ? "—" : value);
}
/* FIN · Control UTM · Helpers */
  /* INICIO · renderCamposConfig_ · Cards operativas de campos UTM */
function renderCamposConfig_(root, payload) {
  const data = payload || {};
  const campos = Array.isArray(data.campos) ? data.campos : [];
  const catalogos = data.catalogos || {};
  const defaults = data.defaults || {};

  STATE.camposConfig = data;

  const body = root.querySelector("[data-pubutm-fields-body]");
  if (!body) return;

  const activos = campos.filter(function (c) {
    return String(c.activo || "").toLowerCase() === "sí";
  }).length;

  const conCatalogo = campos.filter(function (c) {
    return String(c.usa_catalogo_valores || "").toLowerCase() === "sí";
  }).length;

  setText_(root, "[data-pubutm-fields-active-count]", formatInteger_(activos));
  setText_(root, "[data-pubutm-fields-family-count]", formatInteger_((catalogos.familias || []).length));
  setText_(root, "[data-pubutm-fields-type-count]", formatInteger_((catalogos.tipos_campo || []).length));
  setText_(root, "[data-pubutm-fields-catalog-count]", formatInteger_(conCatalogo));
  setText_(root, "[data-pubutm-catalog-families]", (catalogos.familias || []).join(" · "));
  setText_(root, "[data-pubutm-catalog-types]", (catalogos.tipos_campo || []).join(" · "));
  setText_(root, "[data-pubutm-defaults-summary]", buildDefaultsSummary_(defaults));

  renderParametrosFamilyFilters_(root, catalogos.familias || []);

  ensureParametrosLibrarySlide_(root);
  ensureParametrosLibraryButton_(root);
  bindParametrosLibraryEvents_(root);

  const filtered = filterParametrosFields_(campos);
  const preview = filtered.slice(0, 6);

  if (!campos.length) {
    body.innerHTML = `
      <div class="pubUtmParamsEmpty">
        <strong>Sin campos permitidos disponibles.</strong>
        <span>Cuando crees campos UTM, van a aparecer en esta biblioteca.</span>
      </div>
    `;

    updateParametrosLibraryButton_(root, 0);
    bindCampoActionPlaceholders_(root, campos);
    bindParametrosToolbar_(root, campos);
    return;
  }

  if (!filtered.length) {
    body.innerHTML = `
      <div class="pubUtmParamsEmpty">
        <strong>No hay campos para esta búsqueda.</strong>
        <span>Probá limpiar el buscador o cambiar los filtros seleccionados.</span>
      </div>
    `;

    updateParametrosLibraryButton_(root, 0);
    bindCampoActionPlaceholders_(root, campos);
    bindParametrosToolbar_(root, campos);
    return;
  }

  body.innerHTML = preview.map(renderParametroFieldCard_).join("");

  renderParametrosPreviewFoot_(root, preview.length, filtered.length);
  updateParametrosLibraryButton_(root, filtered.length);

  bindCampoActionPlaceholders_(root, campos);
  bindParametrosToolbar_(root, campos);

  const slide = root.querySelector("[data-pubutm-params-library-slide]");
  if (slide && slide.classList.contains("is-open")) {
    renderParametrosLibrarySlideContent_(root);
  }
}
/* FIN · renderCamposConfig_ · Cards operativas de campos UTM */


/* =========================================================
   INICIO · Parámetros UTM · Biblioteca completa en slide
   Versión segura: no toca STATE, no usa observer, no rompe cards.
   ========================================================= */

   function ensureParametrosLibraryButton_(root) {
    const library = root.querySelector(".pubUtmParamsLibrary");
    if (!library) return;
  
    const head = library.querySelector(".pubUtmParamsLibrary__head") || library;
    if (head.querySelector("[data-pubutm-params-library-open]")) return;
  
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pubUtmParamsViewAllBtn";
    btn.setAttribute("data-pubutm-params-library-open", "1");
  
    btn.innerHTML = `
      <span>Ver todos</span>
      <i aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </i>
    `;
  
    head.appendChild(btn);
  }
  
  function updateParametrosLibraryButton_(root, total) {
    const btn = root.querySelector("[data-pubutm-params-library-open]");
    if (!btn) return;
  
    btn.disabled = Number(total || 0) <= 0;
    btn.setAttribute("data-total", String(total || 0));
  }
  
  function renderParametrosPreviewFoot_(root, visible, total) {
    const body = root.querySelector("[data-pubutm-fields-body]");
    if (!body) return;
  
    const library = body.closest(".pubUtmParamsLibrary");
    if (!library) return;
  
    let foot = library.querySelector("[data-pubutm-params-preview-foot]");
  
    if (!foot) {
      foot = document.createElement("div");
      foot.className = "pubUtmParamsPreviewFoot";
      foot.setAttribute("data-pubutm-params-preview-foot", "1");
      body.insertAdjacentElement("afterend", foot);
    }
  
    if (Number(total || 0) <= 6) {
      foot.hidden = true;
      foot.innerHTML = "";
      return;
    }
  
    foot.hidden = false;
    foot.innerHTML = `
      <span>Mostrando ${formatInteger_(visible)} de ${formatInteger_(total)} campos.</span>
  
      <button type="button" data-pubutm-params-library-open>
        Abrir biblioteca completa
      </button>
    `;
  }
  
  function ensureParametrosLibrarySlide_(root) {
    if (!root) return;
    if (root.querySelector("[data-pubutm-params-library-slide]")) return;
  
    const mount = root.querySelector("#pubUtmSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmParamsLibrarySlide" data-pubutm-params-library-slide aria-hidden="true">
        <div class="pubUtmParamsLibrarySlide__backdrop" data-pubutm-params-library-close="1"></div>
  
        <div class="pubUtmParamsLibrarySlide__panel">
          <header class="pubUtmParamsLibrarySlide__head">
            <div class="pubUtmParamsLibrarySlide__identity">
              <span class="pubUtmParamsLibrarySlide__icon" aria-hidden="true">
                ${getPubUtmHeaderIcon_("utm")}
              </span>
  
              <div>
                <div class="pubUtmCard__eyebrow">Biblioteca UTM</div>
                <h2>Todos los campos permitidos</h2>
                <p>
                  Explorá los campos que el motor puede reconocer, validar y usar para construir lógica comercial.
                </p>
              </div>
            </div>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-pubutm-params-library-close="1">
              Cerrar
            </button>
          </header>
  
          <main class="pubUtmParamsLibrarySlide__body">
            <div data-pubutm-params-library-body>
              ${renderParametrosLibrarySkeletons_()}
            </div>
          </main>
        </div>
      </aside>
    `);
  }
  
  function bindParametrosLibraryEvents_(root) {
    if (!root || root.dataset.paramsLibraryEventsBound === "1") return;
    root.dataset.paramsLibraryEventsBound = "1";
  
    root.addEventListener("click", function (ev) {
      const openBtn = ev.target.closest("[data-pubutm-params-library-open]");
      if (openBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        openParametrosLibrarySlide_(root);
        return;
      }
  
      const closeBtn = ev.target.closest("[data-pubutm-params-library-close]");
      if (closeBtn) {
        ev.preventDefault();
        ev.stopPropagation();
        closeParametrosLibrarySlide_(root);
        return;
      }
  
      const moreBtn = ev.target.closest("[data-pubutm-params-library-more]");
      if (moreBtn) {
        ev.preventDefault();
        ev.stopPropagation();
  
        const slide = root.querySelector("[data-pubutm-params-library-slide]");
        if (!slide) return;
  
        const current = Number(slide.getAttribute("data-visible-limit") || 25);
        slide.setAttribute("data-visible-limit", String(current + 25));
  
        renderParametrosLibrarySlideContent_(root);
      }
    });
  }
  
  function openParametrosLibrarySlide_(root) {
    ensureParametrosLibrarySlide_(root);
  
    const slide = root.querySelector("[data-pubutm-params-library-slide]");
    const body = root.querySelector("[data-pubutm-params-library-body]");
    if (!slide || !body) return;
  
    slide.classList.add("is-open");
    slide.setAttribute("aria-hidden", "false");
    slide.setAttribute("data-visible-limit", "25");
  
    root.classList.add("pubUtmParamsLibraryStackOpen");
  
    const main = root.closest("main") || root;
    main.classList.add("pubUtmSlideOpen");
  
    body.innerHTML = renderParametrosLibrarySkeletons_();
  
    clearTimeout(root.__paramsLibraryTimer);
    root.__paramsLibraryTimer = setTimeout(function () {
      renderParametrosLibrarySlideContent_(root);
    }, 220);
  
    syncPubUtmOverlayMode_();
  }
  
  function closeParametrosLibrarySlide_(root) {
    const slide = root.querySelector("[data-pubutm-params-library-slide]");
    if (!slide) return;
  
    slide.classList.remove("is-open");
    slide.setAttribute("aria-hidden", "true");
  
    root.classList.remove("pubUtmParamsLibraryStackOpen");
  
    const main = root.closest("main") || root;
    main.classList.remove("pubUtmSlideOpen");
  
    clearTimeout(root.__paramsLibraryTimer);
  
    syncPubUtmOverlayMode_();
  }
  
  function renderParametrosLibrarySlideContent_(root) {
    const slide = root.querySelector("[data-pubutm-params-library-slide]");
    const body = root.querySelector("[data-pubutm-params-library-body]");
    if (!slide || !body) return;
  
    const payload = STATE.camposConfig || {};
    const campos = Array.isArray(payload.campos) ? payload.campos : [];
    const filtered = filterParametrosFields_(campos);
  
    const limit = Number(slide.getAttribute("data-visible-limit") || 25);
    const visible = filtered.slice(0, limit);
    const hasMore = visible.length < filtered.length;
  
    if (!visible.length) {
      body.innerHTML = `
        <div class="pubUtmParamsLibrarySlide__empty">
          No hay campos UTM para los filtros actuales.
        </div>
      `;
      return;
    }
  
    body.innerHTML = `
      <div class="pubUtmParamsLibrarySlide__meta">
        <strong>${formatInteger_(visible.length)}</strong>
        <span>de ${formatInteger_(filtered.length)} campos visibles</span>
      </div>
  
      <div class="pubUtmParamsLibrarySlide__grid">
        ${visible.map(renderParametroFieldCard_).join("")}
      </div>
  
      ${
        hasMore
          ? `
            <div class="pubUtmParamsLibrarySlide__moreWrap">
              <button type="button" class="pubUtmParamsLibrarySlide__more" data-pubutm-params-library-more>
                Ver más
              </button>
            </div>
          `
          : `
            <div class="pubUtmParamsLibrarySlide__end">
              Llegaste al final de la biblioteca.
            </div>
          `
      }
    `;
  
    bindCampoActionPlaceholders_(root, campos);
  }
  
  function renderParametrosLibrarySkeletons_() {
    return `
      <div class="pubUtmParamsLibrarySlide__meta pubUtmParamsLibrarySlide__meta--loading">
        <span>Cargando biblioteca de campos...</span>
      </div>
  
      <div class="pubUtmParamsLibrarySkeletonGrid">
        ${Array.from({ length: 9 }).map(function () {
          return `
            <article class="pubUtmParamsSkeletonCard">
              <div class="pubUtmParamsSkeletonCard__top">
                <span></span>
                <em></em>
              </div>
              <strong></strong>
              <p></p>
              <p></p>
              <div class="pubUtmParamsSkeletonCard__chips">
                <i></i><i></i><i></i>
              </div>
              <div class="pubUtmParamsSkeletonCard__footer">
                <b></b><b></b><b></b>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }
  
  /* =========================================================
     FIN · Parámetros UTM · Biblioteca completa en slide
     ========================================================= */


  /* INICIO · bindCampoActionPlaceholders_ · Acciones campos + valores */
function bindCampoActionPlaceholders_(root, campos) {
  const byId = {};
  (campos || []).forEach(function (c) {
    byId[c.campo_utm] = c;
  });

  root.querySelectorAll('[data-field-action="edit"]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const id = btn.getAttribute("data-field-id") || "";
      const item = byId[id];
      if (!item) return;

      openCampoEditor_(root, "update", item);
    };
  });

  root.querySelectorAll('[data-field-action="new"]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      openCampoEditor_(root, "create", null);
    };
  });

  root.querySelectorAll('[data-field-action="values"]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const id = btn.getAttribute("data-field-id") || "";
      if (!id) return;

      openValoresFieldSelector_(root, id);
    };
  });

  root.querySelectorAll('[data-field-action="values-global"]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      openValoresFieldSelector_(root, "");
    };
  });
}
/* FIN · bindCampoActionPlaceholders_ · Acciones campos + valores */


/* =========================================================
   INICIO · Helpers · Cards Parámetros UTM
   ========================================================= */

   function renderParametroFieldCard_(campo) {
    const c = campo || {};
    const validation = c.estado_validacion_ui || { ok: true, warnings: [] };
    const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
  
    const canManageValues =
      String(c.activo || "").toLowerCase() === "sí" &&
      String(c.usa_catalogo_valores || "").toLowerCase() === "sí";
  
    const typeInfo = getParametroTypeInfo_(c.tipo_campo);
    const familyLabel = humanizeLabel_(c.familia_campo || "sin familia");
    const typeLabel = humanizeLabel_(c.tipo_campo || "sin tipo");
  
    const estadoHtml = validation.ok
      ? `<span class="pubUtmParamStatus pubUtmParamStatus--ok">OK</span>`
      : `<span class="pubUtmParamStatus pubUtmParamStatus--warning">${escapeHtml_(warnings.length + " aviso" + (warnings.length > 1 ? "s" : ""))}</span>`;
  
    return `
      <article class="pubUtmParamCard pubUtmParamCard--${escapeHtml_(typeInfo.key)}" data-param-card="${escapeHtml_(c.campo_utm || "")}">
        <div class="pubUtmParamCard__accent"></div>
  
        <div class="pubUtmParamCard__top">
          <div class="pubUtmParamCard__identity">
            <span class="pubUtmParamCard__icon pubUtmParamCard__icon--${escapeHtml_(typeInfo.key)}" aria-hidden="true">
              ${getParametroTypeIcon_(typeInfo.key)}
            </span>
  
            <div>
              <strong class="pubUtmParamCard__key">${escapeHtml_(c.campo_utm || "—")}</strong>
              <h3>${escapeHtml_(c.nombre_visible || "Sin nombre visible")}</h3>
            </div>
          </div>
  
          ${estadoHtml}
        </div>
  
        <p class="pubUtmParamCard__description">
          ${escapeHtml_(c.descripcion_funcional || "Sin descripción funcional")}
        </p>
  
        <div class="pubUtmParamCard__chips">
          <span class="pubUtmParamChip pubUtmParamChip--family">${escapeHtml_(familyLabel)}</span>
          <span class="pubUtmParamChip pubUtmParamChip--${escapeHtml_(typeInfo.key)}">${escapeHtml_(typeLabel)}</span>
          <span class="pubUtmParamChip">Prioridad ${formatInteger_(c.prioridad_analitica || 0)}</span>
          <span class="pubUtmParamChip">Peso ${formatInteger_(c.peso_analitico || 0)}</span>
        </div>
  
        <div class="pubUtmParamCard__groups">
          <div class="pubUtmParamGroup">
            <span>Construye</span>
            <div>
              ${renderParametroTinyPill_("Combinación", c.participa_en_combinacion)}
              ${renderParametroTinyPill_("Patrón", c.participa_en_patron)}
              ${renderParametroTinyPill_("Audiencia", c.participa_en_audiencia)}
            </div>
          </div>
  
          <div class="pubUtmParamGroup">
            <span>Usos comerciales</span>
            <div>
              ${renderParametroTinyPill_("Email", c.apto_para_email, c.bloqueos_ui && c.bloqueos_ui.lock_business_usage)}
              ${renderParametroTinyPill_("Recompra", c.apto_para_recompra, c.bloqueos_ui && c.bloqueos_ui.lock_business_usage)}
              ${renderParametroTinyPill_("Cross sell", c.apto_para_cross_sell, c.bloqueos_ui && c.bloqueos_ui.lock_business_usage)}
              ${renderParametroTinyPill_("Experimento", c.apto_para_experimento, c.bloqueos_ui && c.bloqueos_ui.lock_business_usage)}
            </div>
          </div>
  
          <div class="pubUtmParamGroup">
            <span>Gobierno</span>
            <div>
              ${renderParametroTinyPill_("Catálogo", c.usa_catalogo_valores)}
              ${renderParametroTinyPill_("Autojerarquía", c.permite_autojerarquia, c.bloqueos_ui && c.bloqueos_ui.lock_autojerarquia)}
              ${renderParametroTinyPill_("Autoaudiencia", c.permite_autoaudiencia, c.bloqueos_ui && c.bloqueos_ui.lock_autoaudiencia)}
              ${renderParametroTinyPill_("Revisión", c.requiere_revision_manual)}
            </div>
          </div>
        </div>
  
        ${
          warnings.length
            ? `
              <div class="pubUtmParamCard__warnings">
                ${warnings.slice(0, 2).map(function (w) {
                  return `<span>${escapeHtml_(w)}</span>`;
                }).join("")}
              </div>
            `
            : ""
        }
  
        <div class="pubUtmParamCard__actions">
          <button
            type="button"
            class="pubUtmParamAction pubUtmParamAction--ghost"
            data-field-action="edit"
            data-field-id="${escapeHtml_(c.campo_utm || "")}"
          >
            Editar
          </button>
  
          <button
            type="button"
            class="pubUtmParamAction pubUtmParamAction--ghost"
            data-field-action="values"
            data-field-id="${escapeHtml_(c.campo_utm || "")}"
            ${canManageValues ? "" : "disabled title=\"Este campo no está activo o no usa catálogo de valores\""}
          >
            Valores
          </button>
  
          <button
            type="button"
            class="pubUtmParamAction pubUtmParamAction--primary"
            data-field-action="values"
            data-field-id="${escapeHtml_(c.campo_utm || "")}"
            ${canManageValues ? "" : "disabled title=\"Este campo no está activo o no usa catálogo de valores\""}
          >
            + Valor
          </button>
        </div>
      </article>
    `;
  }
  
  function renderParametroTinyPill_(label, value, locked) {
    const normalized = String(value || "").trim().toLowerCase();
    const isOn = normalized === "sí" || normalized === "si" || normalized === "true";
    const isLocked = !!locked;
  
    const cls = isLocked
      ? "is-locked"
      : (isOn ? "is-on" : "is-off");
  
    return `
      <em class="pubUtmParamTinyPill ${cls}">
        ${escapeHtml_(label)}
      </em>
    `;
  }
  
  function getParametroTypeInfo_(tipo) {
    const clean = normalizeParametroSearchText_(tipo);
  
    if (clean.indexOf("categoria") !== -1) {
      return {
        key: "categoria",
        label: "Categoría"
      };
    }
  
    if (clean === "id" || clean.indexOf("identificador") !== -1) {
      return {
        key: "id",
        label: "ID"
      };
    }
  
    if (clean.indexOf("texto") !== -1) {
      return {
        key: "texto",
        label: "Texto"
      };
    }
  
    return {
      key: "otro",
      label: humanizeLabel_(tipo || "Otro")
    };
  }
  
  function getParametroTypeIcon_(type) {
    const key = String(type || "").trim();
  
    if (key === "id") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7.25h10M7 12h10M7 16.75h6M5.75 4.75h12.5c.55 0 1 .45 1 1v12.5c0 .55-.45 1-1 1H5.75c-.55 0-1-.45-1-1V5.75c0-.55.45-1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `;
    }
  
    if (key === "texto") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12M6 12h10M6 17h7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
        </svg>
      `;
    }
  
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.5 7.75h13M7.25 12h9.5M9.75 16.25h4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
      </svg>
    `;
  }
  
  function filterParametrosFields_(campos) {
    const q = normalizeParametroSearchText_(STATE.parametrosSearch || "");
    const typeFilter = String(STATE.parametrosTypeFilter || "todos").trim();
    const familyFilter = normalizeParametroSearchText_(STATE.parametrosFamilyFilter || "todas");
  
    return (Array.isArray(campos) ? campos : []).filter(function (c) {
      const typeInfo = getParametroTypeInfo_(c.tipo_campo);
      const family = normalizeParametroSearchText_(c.familia_campo || "");
  
      if (typeFilter !== "todos" && typeInfo.key !== typeFilter) return false;
      if (familyFilter !== "todas" && family !== familyFilter) return false;
  
      if (!q) return true;
  
      const haystack = normalizeParametroSearchText_([
        c.campo_utm,
        c.nombre_visible,
        c.descripcion_funcional,
        c.familia_campo,
        c.tipo_campo
      ].join(" "));
  
      return haystack.indexOf(q) !== -1;
    });
  }
  
  function renderParametrosFamilyFilters_(root, familias) {
    const mount = root.querySelector("[data-parametros-family-filters]");
    if (!mount) return;
  
    const active = normalizeParametroSearchText_(STATE.parametrosFamilyFilter || "todas");
    const list = Array.isArray(familias) ? familias : [];
  
    mount.innerHTML = `
      <button type="button" data-parametros-family-filter="todas" class="${active === "todas" ? "is-active" : ""}">
        Todas las familias
      </button>
  
      ${list.map(function (familia) {
        const value = normalizeParametroSearchText_(familia);
        return `
          <button
            type="button"
            data-parametros-family-filter="${escapeHtml_(value)}"
            class="${active === value ? "is-active" : ""}"
          >
            ${escapeHtml_(humanizeLabel_(familia))}
          </button>
        `;
      }).join("")}
    `;
  }
  
  function bindParametrosToolbar_(root, campos) {
    const search = root.querySelector("[data-parametros-search]");
  
    if (search) {
      if (search.value !== String(STATE.parametrosSearch || "")) {
        search.value = STATE.parametrosSearch || "";
      }
  
      search.oninput = function () {
        STATE.parametrosSearch = String(search.value || "").trim();
        renderCamposConfig_(root, STATE.camposConfig || { campos: campos || [] });
      };
    }
  
    root.querySelectorAll("[data-parametros-type-filter]").forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
  
        STATE.parametrosTypeFilter = btn.getAttribute("data-parametros-type-filter") || "todos";
        renderCamposConfig_(root, STATE.camposConfig || { campos: campos || [] });
      };
    });
  
    root.querySelectorAll("[data-parametros-family-filter]").forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
  
        STATE.parametrosFamilyFilter = btn.getAttribute("data-parametros-family-filter") || "todas";
        renderCamposConfig_(root, STATE.camposConfig || { campos: campos || [] });
      };
    });
  
    root.querySelectorAll("[data-parametros-type-filter]").forEach(function (btn) {
      const value = btn.getAttribute("data-parametros-type-filter") || "todos";
      btn.classList.toggle("is-active", value === String(STATE.parametrosTypeFilter || "todos"));
    });
  }
  
  function normalizeParametroSearchText_(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  
  /* =========================================================
     FIN · Helpers · Cards Parámetros UTM
     ========================================================= */

  function ensureCampoEditorSlide_(root) {
    if (root.querySelector("[data-pubutm-field-slide]")) return;
  
    const mount = root.querySelector("#pubUtmSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmFieldSlide" data-pubutm-field-slide aria-hidden="true">
        <div class="pubUtmFieldSlide__backdrop" data-field-slide-close="1"></div>
  
        <div class="pubUtmFieldSlide__panel">
          <div class="pubUtmFieldSlide__head">
            <div>
              <div class="pubUtmCard__eyebrow">Configuración UTM</div>
              <h2 class="pubUtmCard__title" data-field-slide-title>Nuevo campo</h2>
            </div>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-field-slide-close="1">
              Cerrar
            </button>
          </div>
  
          <div class="pubUtmFieldSlide__body">
  <div class="pubUtmFieldIntroCard">
    <div class="pubUtmFieldIntroCard__icon">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7.75A2.75 2.75 0 0 1 9.75 5h5.19c.73 0 1.43.29 1.94.8l1.52 1.52c.51.51.8 1.21.8 1.94v5.19A2.75 2.75 0 0 1 16.45 17h-6.7A2.75 2.75 0 0 1 7 14.25v-6.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.7c.69 0 1.25-.56 1.25-1.25V9.06a1 1 0 0 0-.29-.71L15.89 6.8a1 1 0 0 0-.71-.3H9.75Zm1.25 4.5a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 11 11Zm0 2.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 11 13.5Z" fill="currentColor"></path>
      </svg>
    </div>

    <div class="pubUtmFieldIntroCard__copy">
      <strong>Crea nuevos parámetros de medición</strong>
      <span>
        Definí campos UTM más específicos para medir mejor tus anuncios, ordenar jerarquías analíticas
        y habilitar su uso dentro de combinaciones, patrones, audiencias y automatizaciones del ecosistema.
      </span>
    </div>
  </div>

  <form class="pubUtmFieldForm" data-pubutm-field-form>
              <input type="hidden" name="mode" value="create" />
              <input type="hidden" name="original_campo_utm" value="" />
  
              <section class="pubUtmFieldSection">
                <div class="pubUtmFieldSection__title">Identidad</div>
  
                <div class="pubUtmFieldControlRow">
                  <div class="pubUtmFieldControlRow__copy">
                    <strong>Campo técnico</strong>
                    <span>Nombre interno único del campo. Debe ir en minúsculas y snake_case.</span>
                  </div>
                  <div class="pubUtmFieldControlRow__control">
                    <input class="pubUtmFieldControl" type="text" name="campo_utm" placeholder="utm_nuevo_campo" />
                  </div>
                </div>
  

                <div class="pubUtmFieldControlRow">
  <div class="pubUtmFieldControlRow__copy">
    <strong>Nombre visible</strong>
    <span>Nombre humano que vas a ver en interfaz, tablas, reglas y futuras pantallas del sistema.</span>
  </div>
  <div class="pubUtmFieldControlRow__control">
    <input class="pubUtmFieldControl" type="text" name="nombre_visible" placeholder="Ocasión de uso" />
  </div>
</div>

<div class="pubUtmFieldControlRow">
  <div class="pubUtmFieldControlRow__copy">
    <strong>Descripción funcional</strong>
    <span>Explica qué mide este campo y cómo debe interpretarse dentro del ecosistema UTM.</span>
  </div>
  <div class="pubUtmFieldControlRow__control">
    <textarea class="pubUtmFieldControl" name="descripcion_funcional" rows="3" placeholder="Describe el aspecto específico que este parámetro busca medir."></textarea>
  </div>
</div>
                <div class="pubUtmFieldControlRow">
                  <div class="pubUtmFieldControlRow__copy">
                    <strong>Familia del campo</strong>
                    <span>Define el grupo lógico del campo dentro del ecosistema UTM.</span>
                  </div>
                  <div class="pubUtmFieldControlRow__control">
                    <select class="pubUtmFieldControl" name="familia_campo"></select>
                  </div>
                </div>
  
                <div class="pubUtmFieldControlRow">
                  <div class="pubUtmFieldControlRow__copy">
                    <strong>Tipo de campo</strong>
                    <span>Clasifica el dato como id, categoría o texto.</span>
                  </div>
                  <div class="pubUtmFieldControlRow__control">
                    <select class="pubUtmFieldControl" name="tipo_campo"></select>
                  </div>
                </div>
              </section>
  
              <section class="pubUtmFieldSection">
                <div class="pubUtmFieldSection__title">Participación analítica</div>
  
                ${buildFieldToggleRow_("activo", "Activo", "Si está apagado, el campo no debe gobernar nada dentro del motor.")}
                ${buildFieldToggleRow_("usa_catalogo_valores", "Usa catálogo", "Si está encendido, el campo depende de valores permitidos declarados.")}
                ${buildFieldNumberRow_("prioridad_analitica", "Prioridad analítica", "Orden de prioridad del campo para la firma analítica.", "999")}
                ${buildFieldToggleRow_("participa_en_combinacion", "Participa en combinación", "Permite que el campo entre en la firma exacta de combinaciones.")}
                ${buildFieldToggleRow_("participa_en_patron", "Participa en patrón", "Permite que el campo entre en la detección de patrones repetidos.")}
                ${buildFieldToggleRow_("participa_en_audiencia", "Participa en audiencia", "Habilita el uso del campo para construir audiencias.")}
                ${buildFieldNumberRow_("peso_analitico", "Peso analítico", "Peso relativo del campo dentro de las decisiones automáticas.", "0")}
              </section>
  
              <section class="pubUtmFieldSection">
                <div class="pubUtmFieldSection__title">Usos de negocio</div>
  
                ${buildFieldToggleRow_("apto_para_email", "Apto para email", "Permite usar el campo en segmentación de email.")}
                ${buildFieldToggleRow_("apto_para_recompra", "Apto para recompra", "Permite usar el campo para detectar recompra.")}
                ${buildFieldToggleRow_("apto_para_cross_sell", "Apto para cross sell", "Permite usar el campo para recomendar ofertas relacionadas.")}
                ${buildFieldToggleRow_("apto_para_experimento", "Apto para experimento", "Permite usar el campo en pruebas y experimentos.")}
              </section>
  
              <section class="pubUtmFieldSection">
                <div class="pubUtmFieldSection__title">Automatización y seguridad</div>
  
                ${buildFieldToggleRow_("permite_autojerarquia", "Permite autojerarquía", "Autoriza al motor a usar este campo para jerarquías automáticas.")}
                ${buildFieldToggleRow_("permite_autoaudiencia", "Permite autoaudiencia", "Autoriza al motor a usar este campo para audiencias automáticas.")}
                ${buildFieldToggleRow_("requiere_revision_manual", "Requiere revisión manual", "Obliga a revisar manualmente el campo antes de confiar en su automatización.")}
              </section>
  
              <div class="pubUtmFieldWarnings" data-pubutm-field-warnings></div>
            </form>
          </div>
  
          <div class="pubUtmFieldSlide__footer">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-field-slide-close="1">
              Cancelar
            </button>
            <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-field-save-btn>
              Guardar campo
            </button>
          </div>
        </div>
      </aside>
    `);
  
    attachCampoEditorEvents_(root);
  }
  
  function buildFieldToggleRow_(name, title, desc) {
    return `
      <div class="pubUtmFieldControlRow pubUtmFieldControlRow--toggle" data-toggle-row="${name}">
        <div class="pubUtmFieldControlRow__copy">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
  
        <div class="pubUtmFieldControlRow__control">
          <button type="button" class="pubUtmSwitch" data-switch="${name}" aria-pressed="false">
            <span class="pubUtmSwitch__track">
              <span class="pubUtmSwitch__thumb"></span>
            </span>
          </button>
          <input type="hidden" name="${name}" value="no" />
        </div>
      </div>
    `;
  }
  
  function buildFieldNumberRow_(name, title, desc, placeholder) {
    return `
      <div class="pubUtmFieldControlRow">
        <div class="pubUtmFieldControlRow__copy">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
  
        <div class="pubUtmFieldControlRow__control">
          <input class="pubUtmFieldControl" type="number" name="${name}" placeholder="${escapeHtml_(placeholder)}" />
        </div>
      </div>
    `;
  }
  
  function attachCampoEditorEvents_(root) {
    const slide = root.querySelector("[data-pubutm-field-slide]");
    if (!slide) return;
  
    slide.querySelectorAll("[data-field-slide-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeCampoEditor_(root);
      });
    });
  
    slide.querySelectorAll("[data-switch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const name = btn.getAttribute("data-switch");
        toggleFieldSwitch_(slide, name);
        syncCampoEditorDependencies_(slide);
      });
    });
  
    const familySelect = slide.querySelector('select[name="familia_campo"]');
    const typeSelect = slide.querySelector('select[name="tipo_campo"]');
    const activeInput = slide.querySelector('input[name="activo"]');
    const audienciaInput = slide.querySelector('input[name="participa_en_audiencia"]');
    const patronInput = slide.querySelector('input[name="participa_en_patron"]');
  
    [familySelect, typeSelect, activeInput, audienciaInput, patronInput].forEach(function (el) {
      if (!el) return;
      el.addEventListener("change", function () {
        syncCampoEditorDependencies_(slide);
      });
    });
  
    const saveBtn = slide.querySelector("[data-field-save-btn]");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        saveCampoEditor_(root);
      });
    }
  }
  
  function openCampoEditor_(root, mode, item) {
    const slide = root.querySelector("[data-pubutm-field-slide]");
    if (!slide) return;
  
    const cfg = STATE.camposConfig || {};
    const defaults = cfg.defaults || {};
    const source = item || defaults;
  
    const title = slide.querySelector("[data-field-slide-title]");
    const form = slide.querySelector("[data-pubutm-field-form]");
    if (!form) return;
  
    if (title) {
      title.textContent = mode === "update"
        ? ("Editar campo · " + (item && item.campo_utm ? item.campo_utm : ""))
        : "Nuevo campo";
    }
  
    populateFieldSelect_(form.querySelector('select[name="familia_campo"]'), cfg.catalogos && cfg.catalogos.familias, source.familia_campo || "");
    populateFieldSelect_(form.querySelector('select[name="tipo_campo"]'), cfg.catalogos && cfg.catalogos.tipos_campo, source.tipo_campo || "texto");
  
    setFieldInputValue_(form, "mode", mode);
setFieldInputValue_(form, "original_campo_utm", mode === "update" ? (item.campo_utm || "") : "");
setFieldInputValue_(form, "campo_utm", source.campo_utm || "");
setFieldInputValue_(form, "nombre_visible", source.nombre_visible || "");
setFieldInputValue_(form, "descripcion_funcional", source.descripcion_funcional || "");
setFieldInputValue_(form, "prioridad_analitica", source.prioridad_analitica != null ? source.prioridad_analitica : 999);
setFieldInputValue_(form, "peso_analitico", source.peso_analitico != null ? source.peso_analitico : 0);
  
    setFieldSwitchValue_(slide, "activo", source.activo || "no");
    setFieldSwitchValue_(slide, "usa_catalogo_valores", source.usa_catalogo_valores || "no");
    setFieldSwitchValue_(slide, "participa_en_combinacion", source.participa_en_combinacion || "no");
    setFieldSwitchValue_(slide, "participa_en_patron", source.participa_en_patron || "no");
    setFieldSwitchValue_(slide, "participa_en_audiencia", source.participa_en_audiencia || "no");
    setFieldSwitchValue_(slide, "apto_para_email", source.apto_para_email || "no");
    setFieldSwitchValue_(slide, "apto_para_recompra", source.apto_para_recompra || "no");
    setFieldSwitchValue_(slide, "apto_para_cross_sell", source.apto_para_cross_sell || "no");
    setFieldSwitchValue_(slide, "apto_para_experimento", source.apto_para_experimento || "no");
    setFieldSwitchValue_(slide, "permite_autojerarquia", source.permite_autojerarquia || "no");
    setFieldSwitchValue_(slide, "permite_autoaudiencia", source.permite_autoaudiencia || "no");
    setFieldSwitchValue_(slide, "requiere_revision_manual", source.requiere_revision_manual || "sí");
  
    const campoInput = form.querySelector('input[name="campo_utm"]');
    if (campoInput) {
      campoInput.readOnly = mode === "update";
      campoInput.classList.toggle("is-readonly", mode === "update");
    }
  
    syncCampoEditorDependencies_(slide);
  
    slide.classList.add("is-open");
    slide.setAttribute("aria-hidden", "false");
  }
  
  function closeCampoEditor_(root) {
    const slide = root.querySelector("[data-pubutm-field-slide]");
    if (!slide) return;
  
    slide.classList.remove("is-open");
    slide.setAttribute("aria-hidden", "true");
  }
  
  function populateFieldSelect_(select, items, selected) {
    if (!select) return;
  
    const arr = Array.isArray(items) ? items : [];
    select.innerHTML = `<option value="">Seleccionar</option>` + arr.map(function (item) {
      const isSelected = String(item) === String(selected) ? ' selected' : '';
      return `<option value="${escapeHtml_(item)}"${isSelected}>${escapeHtml_(item)}</option>`;
    }).join("");
  }
  
  function setFieldInputValue_(form, name, value) {
    const input = form.querySelector('[name="' + name + '"]');
    if (!input) return;
    input.value = value == null ? "" : value;
  }
  
  function setFieldSwitchValue_(slide, name, value) {
    const hidden = slide.querySelector('input[name="' + name + '"]');
    const btn = slide.querySelector('[data-switch="' + name + '"]');
    const yes = String(value || "").toLowerCase() === "sí";
  
    if (hidden) hidden.value = yes ? "sí" : "no";
    if (btn) {
      btn.classList.toggle("is-on", yes);
      btn.setAttribute("aria-pressed", yes ? "true" : "false");
    }
  }
  
  function getFieldSwitchValue_(slide, name) {
    const hidden = slide.querySelector('input[name="' + name + '"]');
    return hidden ? String(hidden.value || "no") : "no";
  }
  
  function toggleFieldSwitch_(slide, name) {
    const btn = slide.querySelector('[data-switch="' + name + '"]');
    if (!btn || btn.disabled) return;
  
    const current = getFieldSwitchValue_(slide, name);
    setFieldSwitchValue_(slide, name, current === "sí" ? "no" : "sí");
  }
  
  function syncCampoEditorDependencies_(slide) {
    const activo = getFieldSwitchValue_(slide, "activo") === "sí";
    const participaAudiencia = getFieldSwitchValue_(slide, "participa_en_audiencia") === "sí";
    const participaPatron = getFieldSwitchValue_(slide, "participa_en_patron") === "sí";
  
    const businessFields = [
      "apto_para_email",
      "apto_para_recompra",
      "apto_para_cross_sell",
      "apto_para_experimento"
    ];
  
    const autoAudField = "permite_autoaudiencia";
    const autoJerField = "permite_autojerarquia";
  
    businessFields.forEach(function (name) {
      setFieldSwitchDisabled_(slide, name, !activo, true);
    });
  
    setFieldSwitchDisabled_(slide, autoAudField, !(activo && participaAudiencia), true);
    setFieldSwitchDisabled_(slide, autoJerField, !(activo && participaPatron), true);
  
    renderCampoEditorWarnings_(slide);
  }
  
  function setFieldSwitchDisabled_(slide, name, disabled, forceNoWhenDisabled) {
    const btn = slide.querySelector('[data-switch="' + name + '"]');
    const row = slide.querySelector('[data-toggle-row="' + name + '"]');
  
    if (btn) {
      btn.disabled = !!disabled;
      btn.classList.toggle("is-disabled", !!disabled);
    }
  
    if (row) {
      row.classList.toggle("is-disabled", !!disabled);
    }
  
    if (disabled && forceNoWhenDisabled) {
      setFieldSwitchValue_(slide, name, "no");
    }
  }
  
  function renderCampoEditorWarnings_(slide) {
    const holder = slide.querySelector("[data-pubutm-field-warnings]");
    if (!holder) return;
  
    const activo = getFieldSwitchValue_(slide, "activo");
    const usaCatalogo = getFieldSwitchValue_(slide, "usa_catalogo_valores");
    const participaAudiencia = getFieldSwitchValue_(slide, "participa_en_audiencia");
    const participaPatron = getFieldSwitchValue_(slide, "participa_en_patron");
    const autoAud = getFieldSwitchValue_(slide, "permite_autoaudiencia");
    const autoJer = getFieldSwitchValue_(slide, "permite_autojerarquia");
  
    const familia = slide.querySelector('select[name="familia_campo"]') ? slide.querySelector('select[name="familia_campo"]').value : "";
  
    const warnings = [];
  
    if (participaAudiencia === "sí" && !familia) {
      warnings.push("Participa en audiencia requiere familia_campo.");
    }
  
    if (usaCatalogo === "sí" && activo !== "sí") {
      warnings.push("Usa catálogo requiere Activo = sí.");
    }
  
    if (autoAud === "sí" && participaAudiencia !== "sí") {
      warnings.push("Autoaudiencia requiere Participa en audiencia = sí.");
    }
  
    if (autoJer === "sí" && participaPatron !== "sí") {
      warnings.push("Autojerarquía requiere Participa en patrón = sí.");
    }
  
    if (!warnings.length) {
      holder.innerHTML = `
        <div class="pubUtmFieldNotice pubUtmFieldNotice--ok">
          Configuración consistente. Ya podés guardar el campo.
        </div>
      `;
      return;
    }
  
    holder.innerHTML = `
      <div class="pubUtmFieldNotice pubUtmFieldNotice--warn">
        <strong>Revisá estas dependencias antes de guardar:</strong>
        <ul>${warnings.map(function (w) { return "<li>" + escapeHtml_(w) + "</li>"; }).join("")}</ul>
      </div>
    `;
  }
  
  function collectCampoEditorPayload_(slide) {
    const form = slide.querySelector("[data-pubutm-field-form]");
    if (!form) return null;
  
    const payload = {
      mode: readFieldValue_(form, "mode"),
      original_campo_utm: readFieldValue_(form, "original_campo_utm"),
      campo_utm: readFieldValue_(form, "campo_utm"),
      nombre_visible: readFieldValue_(form, "nombre_visible"),
      descripcion_funcional: readFieldValue_(form, "descripcion_funcional"),
      familia_campo: readFieldValue_(form, "familia_campo"),
      tipo_campo: readFieldValue_(form, "tipo_campo"),
  
      activo: readFieldValue_(form, "activo"),
      usa_catalogo_valores: readFieldValue_(form, "usa_catalogo_valores"),
  
      prioridad_analitica: readFieldValue_(form, "prioridad_analitica"),
      participa_en_combinacion: readFieldValue_(form, "participa_en_combinacion"),
      participa_en_patron: readFieldValue_(form, "participa_en_patron"),
      participa_en_audiencia: readFieldValue_(form, "participa_en_audiencia"),
  
      apto_para_email: readFieldValue_(form, "apto_para_email"),
      apto_para_recompra: readFieldValue_(form, "apto_para_recompra"),
      apto_para_cross_sell: readFieldValue_(form, "apto_para_cross_sell"),
      apto_para_experimento: readFieldValue_(form, "apto_para_experimento"),
  
      peso_analitico: readFieldValue_(form, "peso_analitico"),
      permite_autojerarquia: readFieldValue_(form, "permite_autojerarquia"),
      permite_autoaudiencia: readFieldValue_(form, "permite_autoaudiencia"),
      requiere_revision_manual: readFieldValue_(form, "requiere_revision_manual")
    };
  
    return payload;
  }
  
  function readFieldValue_(form, name) {
    const el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || "").trim() : "";
  }
  
  function saveCampoEditor_(root) {
    const slide = root.querySelector("[data-pubutm-field-slide]");
    if (!slide) return;
  
    const payload = collectCampoEditorPayload_(slide);
    if (!payload) return;
  
    const saveBtn = slide.querySelector("[data-field-save-btn]");
    const oldText = saveBtn ? saveBtn.textContent : "";
  
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }
  
    jsonpRequest_(resolveApiBase_(), Object.assign({
      action: "savePublicidadUtmCampoConfig"
    }, payload))
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo guardar el campo.");
        }
  
        closeCampoEditor_(root);
        alert("Campo guardado correctamente: " + (res.campo_utm || "—"));
        loadAllPubUtmData_(root);
      })
      .catch(function (err) {
        alert(String(err || "Error desconocido al guardar el campo."));
      })
      .finally(function () {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = oldText || "Guardar campo";
        }
      });
  }

  function ensureValoresSlides_(root) {
    if (root.querySelector("[data-pubutm-values-selector-slide]")) return;
  
    const slideMount = root.querySelector("#pubUtmSlideMount") || root;
    const subSlideMount = root.querySelector("#pubUtmSubSlideMount") || root;
  
    slideMount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmValuesSelectorSlide" data-pubutm-values-selector-slide aria-hidden="true">
        <div class="pubUtmValuesSelectorSlide__backdrop" data-values-selector-close="1"></div>
  
        <div class="pubUtmValuesSelectorSlide__panel">
          <div class="pubUtmValuesSelectorSlide__head">
            <div>
              <div class="pubUtmCard__eyebrow">Configuración UTM</div>
              <h2 class="pubUtmCard__title">Seleccionar campo para valores permitidos</h2>
            </div>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-selector-close="1">
              Cerrar
            </button>
          </div>
  
          <div class="pubUtmValuesSelectorSlide__body">
            <div class="pubUtmFieldIntroCard">
              <div class="pubUtmFieldIntroCard__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7.75A2.75 2.75 0 0 1 9.75 5h5.19c.73 0 1.43.29 1.94.8l1.52 1.52c.51.51.8 1.21.8 1.94v5.19A2.75 2.75 0 0 1 16.45 17h-6.7A2.75 2.75 0 0 1 7 14.25v-6.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.7c.69 0 1.25-.56 1.25-1.25V9.06a1 1 0 0 0-.29-.71L15.89 6.8a1 1 0 0 0-.71-.3H9.75Zm1.25 4.5a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5A.75.75 0 0 1 11 11Zm0 2.5a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 11 13.5Z" fill="currentColor"></path>
                </svg>
              </div>
  
              <div class="pubUtmFieldIntroCard__copy">
                <strong>Elegí primero el campo padre</strong>
                <span>
                  Cada valor permitido pertenece a un campo existente. Solo vas a poder administrar valores en
                  campos activos que utilicen catálogo de valores dentro del ecosistema UTM.
                </span>
              </div>
            </div>
  
            <section class="pubUtmFieldSection">
              <div class="pubUtmFieldSection__title">Selección de campo</div>
  
              <div class="pubUtmFieldControlRow">
                <div class="pubUtmFieldControlRow__copy">
                  <strong>Campo existente</strong>
                  <span>Seleccioná el campo técnico sobre el cual querés crear, editar o revisar valores permitidos.</span>
                </div>
  
                <div class="pubUtmFieldControlRow__control">
                  <select class="pubUtmFieldControl" data-values-field-select></select>
                </div>
              </div>
            </section>
  
            <article class="pubUtmCard pubUtmCard--full">
              <div class="pubUtmCard__head">
                <div>
                  <div class="pubUtmCard__eyebrow">Resumen del campo</div>
                  <h3 class="pubUtmCard__title" data-values-field-summary-title>—</h3>
                </div>
              </div>
  
              <div class="pubUtmAudienceCard__meta" data-values-field-summary-body>
                <div>Seleccioná un campo para ver su contexto operativo.</div>
              </div>
            </article>
          </div>
  
          <div class="pubUtmValuesSelectorSlide__footer">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-selector-close="1">
              Cancelar
            </button>
            <button type="button" class="pubUtmBtn pubUtmBtn--primary pubUtmBtn--withArrow" data-values-open-manager>
              Gestionar valores
              <span class="pubUtmBtn__arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </aside>
    `);
  
    subSlideMount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmValuesManagerSlide" data-pubutm-values-manager-slide aria-hidden="true">
        <div class="pubUtmValuesManagerSlide__backdrop" data-values-manager-close="1"></div>
  
        <div class="pubUtmValuesManagerSlide__panel">
          <div class="pubUtmValuesManagerSlide__head">
            <div>
              <div class="pubUtmCard__eyebrow">Valores permitidos</div>
              <h2 class="pubUtmCard__title" data-values-manager-title>Gestionar valores</h2>
            </div>
  
            <div class="pubUtmHeader__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-change-field>
                Cambiar campo
              </button>
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-manager-close="1">
                Cerrar
              </button>
            </div>
          </div>
  
          <div class="pubUtmValuesManagerSlide__body">
            <div class="pubUtmFieldIntroCard">
              <div class="pubUtmFieldIntroCard__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.75 6A2.75 2.75 0 0 0 3 8.75v6.5A2.75 2.75 0 0 0 5.75 18h12.5A2.75 2.75 0 0 0 21 15.25v-6.5A2.75 2.75 0 0 0 18.25 6H5.75Zm0 1.5h12.5c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.75c-.69 0-1.25-.56-1.25-1.25v-6.5c0-.69.56-1.25 1.25-1.25Zm2.5 2a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm0 3a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Z" fill="currentColor"></path>
                </svg>
              </div>
  
              <div class="pubUtmFieldIntroCard__copy">
                <strong>Administrá el catálogo del campo seleccionado</strong>
                <span>
                  Acá cargás y editás los valores válidos que puede reconocer el motor para este campo.
                  Si el valor no existe o está inactivo, el ecosistema puede marcarlo como no encontrado.
                </span>
              </div>
            </div>
  
            <article class="pubUtmCard pubUtmCard--full">
              <div class="pubUtmCard__head">
                <div>
                  <div class="pubUtmCard__eyebrow">Resumen operativo</div>
                  <h3 class="pubUtmCard__title" data-values-summary-title>—</h3>
                </div>
              </div>
  
              <div class="pubUtmValuesSummaryGrid">
                <div class="pubUtmMiniStat">
                  <span class="pubUtmMiniStat__label">Familia</span>
                  <strong class="pubUtmMiniStat__value" data-values-summary-family>—</strong>
                </div>
                <div class="pubUtmMiniStat">
                  <span class="pubUtmMiniStat__label">Tipo</span>
                  <strong class="pubUtmMiniStat__value" data-values-summary-type>—</strong>
                </div>
                <div class="pubUtmMiniStat">
                  <span class="pubUtmMiniStat__label">Total valores</span>
                  <strong class="pubUtmMiniStat__value" data-values-summary-total>—</strong>
                </div>
                <div class="pubUtmMiniStat">
                  <span class="pubUtmMiniStat__label">Valores activos</span>
                  <strong class="pubUtmMiniStat__value" data-values-summary-active>—</strong>
                </div>
              </div>
            </article>
  
            <article class="pubUtmCard pubUtmCard--full">
              <div class="pubUtmValuesToolbar">
                <div class="pubUtmAudienceCard__meta">
                  <div><strong>Categorías detectadas:</strong> <span data-values-categories>—</span></div>
                  <div><strong>Aplica a:</strong> <span data-values-aplica>—</span></div>
                </div>
  
                <div class="pubUtmHeader__actions">
                  <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-values-new>
                    Nuevo valor
                  </button>
                </div>
              </div>
  
              <div class="pubUtmTableWrap" style="margin-top:16px;">
                <table class="pubUtmTable">
                  <thead>
                    <tr>
                      <th>Valor</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Activo</th>
                      <th>Match exacto</th>
                      <th>Aplica a</th>
                      <th>Actualización</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody data-values-table-body>
                    <tr>
                      <td colspan="8">Cargando valores…</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </div>
  
          <div class="pubUtmValuesManagerSlide__footer">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-manager-close="1">
              Cerrar
            </button>
          </div>
  
          <div class="pubUtmValuesEditorOverlay" data-values-editor-overlay hidden>
            <div class="pubUtmValuesEditorOverlay__backdrop" data-values-editor-cancel="1"></div>
  
            <div class="pubUtmValuesEditorOverlay__panel">
              <div class="pubUtmValuesEditorOverlay__head">
                <div>
                  <div class="pubUtmCard__eyebrow">Valor permitido</div>
                  <h3 class="pubUtmCard__title" data-values-editor-title>Nuevo valor</h3>
                </div>
  
                <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-editor-cancel="1">
                  Cerrar
                </button>
              </div>
  
              <div class="pubUtmValuesEditorOverlay__body">
                <section class="pubUtmFieldSection pubUtmValuesEditor" data-values-editor>
                  <form class="pubUtmFieldForm" data-values-form>
                    <input type="hidden" name="mode" value="create" />
                    <input type="hidden" name="campo_utm" value="" />
                    <input type="hidden" name="original_valor_permitido" value="" />
  
                    <div class="pubUtmFieldControlRow">
                      <div class="pubUtmFieldControlRow__copy">
                        <strong>Valor técnico</strong>
                        <span>Valor real que va a reconocer el motor dentro del catálogo permitido.</span>
                      </div>
  
                      <div class="pubUtmFieldControlRow__control">
                        <input class="pubUtmFieldControl" type="text" name="valor_permitido" placeholder="nuevo_valor" />
                      </div>
                    </div>
  
                    <div class="pubUtmFieldControlRow">
                      <div class="pubUtmFieldControlRow__copy">
                        <strong>Descripción funcional</strong>
                        <span>Explica en lenguaje humano qué representa este valor.</span>
                      </div>
  
                      <div class="pubUtmFieldControlRow__control">
                        <textarea class="pubUtmFieldControl" name="descripcion_funcional" rows="3" placeholder="Explicación breve del valor"></textarea>
                      </div>
                    </div>
  
                    <div class="pubUtmFieldControlRow">
                      <div class="pubUtmFieldControlRow__copy">
                        <strong>Categoría</strong>
                        <span>Clasificación interna del valor para orden y gobernanza.</span>
                      </div>
  
                      <div class="pubUtmFieldControlRow__control">
                        <input class="pubUtmFieldControl" type="text" name="categoria" placeholder="angulo" />
                      </div>
                    </div>
  
                    ${buildFieldToggleRow_("valor_activo", "Activo", "Si está apagado, el valor deja de ser válido para el motor.")}
                    ${buildFieldToggleRow_("valor_match_exacto", "Requiere match exacto", "Indica si el valor debe validarse de forma exacta dentro del catálogo.")}
  
                    <div class="pubUtmFieldControlRow">
                      <div class="pubUtmFieldControlRow__copy">
                        <strong>Aplica a</strong>
                        <span>Canal o universo donde este valor tiene sentido operativo.</span>
                      </div>
  
                      <div class="pubUtmFieldControlRow__control">
                        <input class="pubUtmFieldControl" type="text" name="aplica_a" placeholder="todos" />
                      </div>
                    </div>
  
                    <div class="pubUtmFieldControlRow">
                      <div class="pubUtmFieldControlRow__copy">
                        <strong>Observaciones</strong>
                        <span>Notas internas para revisión, alcance o criterios especiales.</span>
                      </div>
  
                      <div class="pubUtmFieldControlRow__control">
                        <textarea class="pubUtmFieldControl" name="observaciones" rows="3" placeholder="Observaciones internas"></textarea>
                      </div>
                    </div>
                  </form>
                </section>
              </div>
  
              <div class="pubUtmValuesEditorOverlay__footer">
                <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-values-editor-cancel="1">
                  Cancelar
                </button>
                <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-values-editor-save>
                  Guardar valor
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    `);
  
    attachValoresSlidesEvents_(root);
  }
  
  function attachValoresSlidesEvents_(root) {
    const selectorSlide = root.querySelector("[data-pubutm-values-selector-slide]");
    const managerSlide = root.querySelector("[data-pubutm-values-manager-slide]");
  
    if (selectorSlide) {
      selectorSlide.querySelectorAll("[data-values-selector-close]").forEach(function (btn) {
        btn.onclick = function () {
          closeValoresFieldSelector_(root);
        };
      });
  
      const select = selectorSlide.querySelector("[data-values-field-select]");
      if (select) {
        select.onchange = function () {
          const field = String(select.value || "").trim();
          if (!field) return;
          openValoresFieldSelector_(root, field);
        };
      }
  
      const openManagerBtn = selectorSlide.querySelector("[data-values-open-manager]");
      if (openManagerBtn) {
        openManagerBtn.onclick = function () {
          const selectEl = selectorSlide.querySelector("[data-values-field-select]");
          const field = selectEl ? String(selectEl.value || "").trim() : "";
          if (!field) {
            alert("Seleccioná un campo para gestionar sus valores.");
            return;
          }
          loadValoresManagerForField_(root, field);
        };
      }
    }
  
    if (managerSlide) {
      managerSlide.querySelectorAll("[data-values-manager-close]").forEach(function (btn) {
        btn.onclick = function () {
          closeValoresManager_(root);
        };
      });
  
      const changeFieldBtn = managerSlide.querySelector("[data-values-change-field]");
      if (changeFieldBtn) {
        changeFieldBtn.onclick = function () {
          const current = managerSlide.getAttribute("data-current-field") || "";
          openValoresFieldSelector_(root, current);
        };
      }
  
      const newBtn = managerSlide.querySelector("[data-values-new]");
      if (newBtn) {
        newBtn.onclick = function () {
          openValorEditor_(root, "create", null);
        };
      }
  
      managerSlide.querySelectorAll("[data-values-editor-cancel]").forEach(function (btn) {
        btn.onclick = function () {
          closeValorEditor_(root);
        };
      });
  
      const saveBtn = managerSlide.querySelector("[data-values-editor-save]");
      if (saveBtn) {
        saveBtn.onclick = function () {
          saveValorEditor_(root);
        };
      }
  
      managerSlide.querySelectorAll("[data-switch]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const name = btn.getAttribute("data-switch");
          if (name === "valor_activo" || name === "valor_match_exacto") {
            toggleFieldSwitch_(managerSlide, name);
          }
        });
      });
    }
  
    if (!window.__pubUtmValuesEscBound) {
      window.__pubUtmValuesEscBound = true;
  
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Escape") return;
  
        const editorOpen = root.querySelector("[data-values-editor-overlay]:not([hidden])");
        const managerOpen = root.querySelector("[data-pubutm-values-manager-slide].is-open");
        const selectorOpen = root.querySelector("[data-pubutm-values-selector-slide].is-open");
  
        if (editorOpen) {
          closeValorEditor_(root);
          return;
        }
  
        if (managerOpen) {
          closeValoresManager_(root);
          return;
        }
  
        if (selectorOpen) {
          closeValoresFieldSelector_(root);
        }
      });
    }
  }
  
  function openValoresFieldSelector_(root, preselectedField) {
    const selectorSlide = root.querySelector("[data-pubutm-values-selector-slide]");
    if (selectorSlide) {
      selectorSlide.classList.add("is-open");
      selectorSlide.classList.remove("is-stack-behind");
      selectorSlide.setAttribute("aria-hidden", "false");
    }
  
    renderValoresFieldSelectorLoading_(root, preselectedField);
  
    const params = { action: "getPublicidadUtmValoresConfig" };
    if (preselectedField) params.campo_utm = preselectedField;
  
    jsonpRequest_(resolveApiBase_(), params)
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo cargar la selección de valores.");
        }
  
        STATE.valoresConfig = res;
        renderValoresFieldSelector_(root, res);
      })
      .catch(function (err) {
        alert(String(err || "Error desconocido al cargar valores permitidos."));
        closeValoresFieldSelector_(root);
      });
  }
  
  function closeValoresFieldSelector_(root) {
    const selectorSlide = root.querySelector("[data-pubutm-values-selector-slide]");
    const managerSlide = root.querySelector("[data-pubutm-values-manager-slide]");
  
    if (managerSlide) {
      managerSlide.classList.remove("is-open");
      managerSlide.setAttribute("aria-hidden", "true");
    }
  
    if (!selectorSlide) return;
  
    selectorSlide.classList.remove("is-open", "is-stack-behind");
    selectorSlide.setAttribute("aria-hidden", "true");
  }
  
  function renderValoresFieldSelectorLoading_(root, preselectedField) {
    const slide = root.querySelector("[data-pubutm-values-selector-slide]");
    if (!slide) return;
  
    const select = slide.querySelector("[data-values-field-select]");
    const title = slide.querySelector("[data-values-field-summary-title]");
    const body = slide.querySelector("[data-values-field-summary-body]");
    const openBtn = slide.querySelector("[data-values-open-manager]");
  
    if (select) {
      select.innerHTML = `
        <option value="${escapeHtml_(preselectedField || "")}">
          Cargando campos...
        </option>
      `;
    }
  
    if (title) title.textContent = preselectedField || "Cargando...";
    if (body) {
      body.innerHTML = `
        <div class="pubUtmSkeletonBlock">
          <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
          <div class="pubUtmSkeletonLine"></div>
          <div class="pubUtmSkeletonLine pubUtmSkeletonLine--sm"></div>
        </div>
        <div class="pubUtmLoadingChip">Cargando...</div>
      `;
    }
  
    if (openBtn) openBtn.disabled = true;
  }
  
  function renderValoresManagerLoading_(root, field) {
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    if (!slide) return;
  
    setText_(slide, "[data-values-manager-title]", "Valores permitidos · " + (field || "Cargando..."));
    setText_(slide, "[data-values-summary-title]", field || "Cargando...");
    setText_(slide, "[data-values-summary-family]", "...");
    setText_(slide, "[data-values-summary-type]", "...");
    setText_(slide, "[data-values-summary-total]", "...");
    setText_(slide, "[data-values-summary-active]", "...");
    setText_(slide, "[data-values-categories]", "Cargando...");
    setText_(slide, "[data-values-aplica]", "Cargando...");
  
    const body = slide.querySelector("[data-values-table-body]");
    if (body) {
      body.innerHTML = `
        <tr><td colspan="8"><div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div></td></tr>
        <tr><td colspan="8"><div class="pubUtmSkeletonLine"></div></td></tr>
        <tr><td colspan="8"><div class="pubUtmSkeletonLine pubUtmSkeletonLine--sm"></div></td></tr>
        <tr><td colspan="8"><span class="pubUtmLoadingChip">Cargando...</span></td></tr>
      `;
    }
  
    closeValorEditor_(root);
  }

  function renderValoresFieldSelector_(root, payload) {
    const slide = root.querySelector("[data-pubutm-values-selector-slide]");
    if (!slide) return;
  
    const campos = Array.isArray(payload.campos_elegibles) ? payload.campos_elegibles : [];
    const selected = payload.campo_seleccionado || "";
  
    const select = slide.querySelector("[data-values-field-select]");
    const title = slide.querySelector("[data-values-field-summary-title]");
    const body = slide.querySelector("[data-values-field-summary-body]");
    const openBtn = slide.querySelector("[data-values-open-manager]");
  
    if (select) {
      select.innerHTML = `<option value="">Seleccionar</option>` + campos.map(function (c) {
        const isSelected = c.campo_utm === selected ? " selected" : "";
        return `<option value="${escapeHtml_(c.campo_utm)}"${isSelected}>${escapeHtml_(c.campo_utm)}</option>`;
      }).join("");
    }
  
    if (!selected || !payload.resumen_campo) {
      if (title) title.textContent = "Sin campo seleccionado";
      if (body) {
        body.innerHTML = `<div>Seleccioná un campo activo que use catálogo de valores.</div>`;
      }
      if (openBtn) openBtn.disabled = true;
      return;
    }
  
    if (title) title.textContent = selected;
  
    const r = payload.resumen_campo;
    if (body) {
      body.innerHTML = `
        <div><strong>Familia:</strong> ${escapeHtml_(r.familia_campo || "—")}</div>
        <div><strong>Tipo:</strong> ${escapeHtml_(r.tipo_campo || "—")}</div>
        <div><strong>Prioridad:</strong> ${formatInteger_(r.prioridad_analitica || 0)}</div>
        <div><strong>Participa en audiencia:</strong> ${escapeHtml_(r.participa_en_audiencia || "—")}</div>
        <div><strong>Total de valores:</strong> ${formatInteger_(r.total_valores || 0)}</div>
        <div><strong>Valores activos:</strong> ${formatInteger_(r.valores_activos || 0)}</div>
      `;
    }
  
    if (openBtn) openBtn.disabled = false;
  }
  
  function loadValoresManagerForField_(root, field) {
    const selectorSlide = root.querySelector("[data-pubutm-values-selector-slide]");
    const managerSlide = root.querySelector("[data-pubutm-values-manager-slide]");
  
    if (selectorSlide) {
      selectorSlide.classList.add("is-open", "is-stack-behind");
      selectorSlide.setAttribute("aria-hidden", "false");
    }
  
    if (managerSlide) {
      managerSlide.classList.add("is-open");
      managerSlide.setAttribute("aria-hidden", "false");
      managerSlide.setAttribute("data-current-field", field || "");
    }
  
    renderValoresManagerLoading_(root, field);
  
    const params = {
      action: "getPublicidadUtmValoresConfig",
      campo_utm: field
    };
  
    jsonpRequest_(resolveApiBase_(), params)
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo cargar la gestión de valores.");
        }
  
        STATE.valoresConfig = res;
        renderValoresManager_(root, res);
      })
      .catch(function (err) {
        alert(String(err || "Error desconocido al cargar la gestión de valores."));
        closeValoresManager_(root);
      });
  }
  
  function closeValoresManager_(root) {
    const managerSlide = root.querySelector("[data-pubutm-values-manager-slide]");
    const selectorSlide = root.querySelector("[data-pubutm-values-selector-slide]");
  
    if (managerSlide) {
      managerSlide.classList.remove("is-open");
      managerSlide.setAttribute("aria-hidden", "true");
    }
  
    if (selectorSlide) {
      selectorSlide.classList.remove("is-stack-behind");
      selectorSlide.classList.add("is-open");
      selectorSlide.setAttribute("aria-hidden", "false");
    }
  
    closeValorEditor_(root);
  }
  
  function renderValoresManager_(root, payload) {
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    if (!slide) return;
  
    const resumen = payload.resumen_campo || {};
    const valores = Array.isArray(payload.valores) ? payload.valores : [];
    const catalogos = payload.catalogos || {};
  
    setText_(slide, "[data-values-manager-title]", "Valores permitidos · " + (payload.campo_seleccionado || "—"));
    setText_(slide, "[data-values-summary-title]", payload.campo_seleccionado || "—");
    setText_(slide, "[data-values-summary-family]", resumen.familia_campo || "—");
    setText_(slide, "[data-values-summary-type]", resumen.tipo_campo || "—");
    setText_(slide, "[data-values-summary-total]", formatInteger_(resumen.total_valores || 0));
    setText_(slide, "[data-values-summary-active]", formatInteger_(resumen.valores_activos || 0));
    setText_(slide, "[data-values-categories]", Array.isArray(catalogos.categorias) && catalogos.categorias.length ? catalogos.categorias.join(" · ") : "—");
    setText_(slide, "[data-values-aplica]", Array.isArray(catalogos.aplica_a) && catalogos.aplica_a.length ? catalogos.aplica_a.join(" · ") : "—");
  
    const body = slide.querySelector("[data-values-table-body]");
    if (!body) return;
  
    if (!valores.length) {
      body.innerHTML = `
        <tr>
          <td colspan="8">Todavía no hay valores cargados para este campo.</td>
        </tr>
      `;
    } else {
      body.innerHTML = valores.map(function (v) {
        return `
          <tr data-value-id="${escapeHtml_(v.valor_permitido || "")}">
            <td><strong>${escapeHtml_(v.valor_permitido || "—")}</strong></td>
            <td>${escapeHtml_(v.descripcion_funcional || "—")}</td>
            <td>${escapeHtml_(v.categoria || "—")}</td>
            <td>${renderSiNoPill_(v.activo)}</td>
            <td>${renderSiNoPill_(v.requiere_match_exacto)}</td>
            <td>${escapeHtml_(v.aplica_a || "—")}</td>
            <td>${escapeHtml_(formatDateTimeAr_(v.fecha_actualizacion) || "—")}</td>
            <td>
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-value-action="edit" data-value-id="${escapeHtml_(v.valor_permitido || "")}">
                Editar
              </button>
            </td>
          </tr>
        `;
      }).join("");
    }
  
    closeValorEditor_(root);
  
    const byId = {};
    valores.forEach(function (v) {
      byId[v.valor_permitido] = v;
    });
  
    slide.querySelectorAll('[data-value-action="edit"]').forEach(function (btn) {
      btn.onclick = function () {
        const id = btn.getAttribute("data-value-id") || "";
        const item = byId[id];
        if (!item) return;
        openValorEditor_(root, "update", item);
      };
    });
  }
  
  function openValorEditor_(root, mode, item) {
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    if (!slide) return;
  
    const overlay = slide.querySelector("[data-values-editor-overlay]");
    const editor = slide.querySelector("[data-values-editor]");
    const form = slide.querySelector("[data-values-form]");
    const title = slide.querySelector("[data-values-editor-title]");
    if (!overlay || !editor || !form) return;
  
    const cfg = STATE.valoresConfig || {};
    const defaults = cfg.defaults || {};
    const source = item || defaults;
    const currentField = cfg.campo_seleccionado || defaults.campo_utm || "";
  
    if (title) {
      title.textContent = mode === "update"
        ? ("Editar valor · " + (item && item.valor_permitido ? item.valor_permitido : ""))
        : "Nuevo valor";
    }
  
    setFieldInputValue_(form, "mode", mode);
    setFieldInputValue_(form, "campo_utm", currentField);
    setFieldInputValue_(form, "original_valor_permitido", mode === "update" ? (item.valor_permitido || "") : "");
    setFieldInputValue_(form, "valor_permitido", source.valor_permitido || "");
    setFieldInputValue_(form, "descripcion_funcional", source.descripcion_funcional || "");
    setFieldInputValue_(form, "categoria", source.categoria || "");
    setFieldInputValue_(form, "aplica_a", source.aplica_a || "todos");
    setFieldInputValue_(form, "observaciones", source.observaciones || "");
  
    setFieldSwitchValue_(slide, "valor_activo", source.activo || "sí");
    setFieldSwitchValue_(slide, "valor_match_exacto", source.requiere_match_exacto || "sí");
  
    const valueInput = form.querySelector('input[name="valor_permitido"]');
    if (valueInput) {
      valueInput.readOnly = mode === "update";
      valueInput.classList.toggle("is-readonly", mode === "update");
    }
  
    overlay.hidden = false;
  
    requestAnimationFrame(function () {
      if (valueInput) valueInput.focus();
    });
  }
  
  function closeValorEditor_(root) {
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    if (!slide) return;
  
    const overlay = slide.querySelector("[data-values-editor-overlay]");
    if (!overlay) return;
  
    overlay.hidden = true;
  }
  
  function collectValorEditorPayload_(root) {
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    if (!slide) return null;
  
    const form = slide.querySelector("[data-values-form]");
    if (!form) return null;
  
    return {
      mode: readFieldValue_(form, "mode"),
      campo_utm: readFieldValue_(form, "campo_utm"),
      original_valor_permitido: readFieldValue_(form, "original_valor_permitido"),
      valor_permitido: readFieldValue_(form, "valor_permitido"),
      descripcion_funcional: readFieldValue_(form, "descripcion_funcional"),
      categoria: readFieldValue_(form, "categoria"),
      activo: getFieldSwitchValue_(slide, "valor_activo"),
      requiere_match_exacto: getFieldSwitchValue_(slide, "valor_match_exacto"),
      aplica_a: readFieldValue_(form, "aplica_a"),
      observaciones: readFieldValue_(form, "observaciones")
    };
  }
  
  function saveValorEditor_(root) {
    const payload = collectValorEditorPayload_(root);
    if (!payload) return;
  
    const slide = root.querySelector("[data-pubutm-values-manager-slide]");
    const saveBtn = slide ? slide.querySelector("[data-values-editor-save]") : null;
    const oldText = saveBtn ? saveBtn.textContent : "";
  
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }
  
    jsonpRequest_(resolveApiBase_(), Object.assign({
      action: "savePublicidadUtmValorConfig"
    }, payload))
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo guardar el valor.");
        }
  
        alert("Valor guardado correctamente: " + (res.valor_permitido || "—"));
        return loadValoresManagerForField_(root, payload.campo_utm);
      })
      .catch(function (err) {
        alert(String(err || "Error desconocido al guardar el valor."));
      })
      .finally(function () {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = oldText || "Guardar valor";
        }
      });
  }
  
  /* INICIO · ensureReglasAudienciasEntryPoint_ · Bind reglas sin card separada */
function ensureReglasAudienciasEntryPoint_(root) {
  const panel = findTabPanel_(root, "conjuntos");
  if (!panel) return;

  panel.querySelectorAll("[data-reglas-open]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openReglasAudienciasSlide_(root, "list");
    };
  });

  panel.querySelectorAll("[data-reglas-new]").forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openReglasAudienciasSlide_(root, "new");
    };
  });
}
/* FIN · ensureReglasAudienciasEntryPoint_ · Bind reglas sin card separada */
  
  function ensureReglasAudienciasSlide_(root) {
    if (root.querySelector("[data-pubutm-reglas-slide]")) return;
  
    const mount = root.querySelector("#pubUtmSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmReglasSlide" data-pubutm-reglas-slide aria-hidden="true">
        <div class="pubUtmReglasSlide__backdrop" data-reglas-close="1"></div>
  
        <div class="pubUtmReglasSlide__panel">
          <div class="pubUtmReglasSlide__head">
            <div>
              <div class="pubUtmCard__eyebrow">Configuración avanzada</div>
              <h2 class="pubUtmCard__title">Reglas de audiencias</h2>
            </div>
  
            <div class="pubUtmHeader__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-reglas-refresh>
                Actualizar
              </button>
              <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-reglas-new-inside>
                Nueva regla
              </button>
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-reglas-close="1">
                Cerrar
              </button>
            </div>
          </div>
  
          <div class="pubUtmReglasSlide__body">
            <div class="pubUtmFieldIntroCard">
              <div class="pubUtmFieldIntroCard__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.5 4.5A2.5 2.5 0 0 0 3 7v10a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V7a2.5 2.5 0 0 0-2.5-2.5h-13Zm0 1.5h13A1 1 0 0 1 19.5 7v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2.25 3a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 3a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Zm0 3a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" fill="currentColor"></path>
                </svg>
              </div>
  
              <div class="pubUtmFieldIntroCard__copy">
                <strong>Definí cuándo un patrón merece convertirse en audiencia</strong>
                <span>
                  Las reglas combinan soporte mínimo, familias UTM requeridas y resultados operativos.
                  Si una regla exige campos técnicos, el sistema mostrará advertencias visuales para evitar
                  lecturas sesgadas de anuncios, campañas o IDs.
                </span>
              </div>
            </div>
  
            <section class="pubUtmReglasSummary" data-reglas-summary>
              <div class="pubUtmSkeletonBlock">
                <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
                <div class="pubUtmSkeletonLine"></div>
              </div>
            </section>
  
            <section class="pubUtmReglasGrid" data-reglas-list>
              <article class="pubUtmCard pubUtmCard--full">
                <div class="pubUtmEmptyState">
                  <h2>Cargando reglas</h2>
                  <p>Estamos leyendo la configuración de reglas de audiencias.</p>
                </div>
              </article>
            </section>
  
            <section class="pubUtmReglaEditor" data-regla-editor hidden>
              <div class="pubUtmReglaEditor__head">
                <div>
                  <div class="pubUtmCard__eyebrow">Editor visual</div>
                  <h3 class="pubUtmCard__title" data-regla-editor-title>Nueva regla</h3>
                </div>
  
                <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-editor-close>
                  Cerrar editor
                </button>
              </div>
  
              <div class="pubUtmReglaEditor__body" data-regla-editor-body></div>
            </section>
          </div>
        </div>
      </aside>
    `);
  
    attachReglasAudienciasEvents_(root);
  }
  
  function ensureReglasAudienciasEditorSlide_(root) {
    if (root.querySelector("[data-pubutm-reglas-editor-slide]")) return;
  
    const mount = root.querySelector("#pubUtmSubSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <aside class="pubUtmReglasEditorSlide" data-pubutm-reglas-editor-slide aria-hidden="true">
        <div class="pubUtmReglasEditorSlide__backdrop" data-regla-editor-slide-close="1"></div>
  
        <div class="pubUtmReglasEditorSlide__panel">
          <div class="pubUtmReglasEditorSlide__head">
            <div>
              <div class="pubUtmCard__eyebrow">Editor visual</div>
              <h2 class="pubUtmCard__title" data-regla-editor-title>Nueva regla</h2>
            </div>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-editor-slide-close="1">
              Cerrar
            </button>
          </div>
  
          <div class="pubUtmReglasEditorSlide__body" data-regla-editor-body>
            <div class="pubUtmFieldIntroCard">
              <div class="pubUtmFieldIntroCard__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5.5 4.5A2.5 2.5 0 0 0 3 7v10a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V7a2.5 2.5 0 0 0-2.5-2.5h-13Zm0 1.5h13A1 1 0 0 1 19.5 7v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" fill="currentColor"></path>
                </svg>
              </div>
  
              <div class="pubUtmFieldIntroCard__copy">
                <strong>Cargando editor de regla</strong>
                <span>Preparando la configuración visual de soporte, familias, restricciones y resultado operativo.</span>
              </div>
            </div>
          </div>
  
          <div class="pubUtmReglasEditorSlide__footer">
            <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-editor-slide-close="1">
              Cancelar
            </button>
  
            <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-regla-save disabled title="El guardado real de reglas se conecta en la siguiente etapa.">
              Guardar regla
            </button>
          </div>
        </div>
      </aside>
    `);
  
    attachReglasAudienciasEditorSlideEvents_(root);
  }
  
  function attachReglasAudienciasEditorSlideEvents_(root) {
    const editorSlide = root.querySelector("[data-pubutm-reglas-editor-slide]");
    if (!editorSlide) return;
  
    editorSlide.querySelectorAll("[data-regla-editor-slide-close]").forEach(function (btn) {
      btn.onclick = function () {
        closeReglaEditor_(root);
      };
    });
  
    if (!window.__pubUtmReglasEscBound) {
      window.__pubUtmReglasEscBound = true;
  
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Escape") return;
  
        const editorOpen = root.querySelector("[data-pubutm-reglas-editor-slide].is-open");
        const reglasOpen = root.querySelector("[data-pubutm-reglas-slide].is-open");
  
        if (editorOpen) {
          closeReglaEditor_(root);
          return;
        }
  
        if (reglasOpen) {
          closeReglasAudienciasSlide_(root);
        }
      });
    }
  }

  function ensureReglaDeleteModal_(root) {
    if (root.querySelector("[data-regla-delete-modal]")) return;
  
    const mount = root.querySelector("#pubUtmSubSlideMount") || root;
  
    mount.insertAdjacentHTML("beforeend", `
      <div class="pubUtmReglaDeleteModal" data-regla-delete-modal hidden>
        <div class="pubUtmReglaDeleteModal__backdrop" data-regla-delete-cancel="1"></div>
  
        <div class="pubUtmReglaDeleteModal__panel" role="dialog" aria-modal="true" aria-label="Eliminar regla de audiencia">
          <div class="pubUtmReglaDeleteModal__view" data-regla-delete-view="confirm">
            <div class="pubUtmReglaDeleteModal__icon pubUtmReglaDeleteModal__icon--danger">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5h-.8l-.72 12.13A3.25 3.25 0 0 1 14.49 21h-4.98a3.25 3.25 0 0 1-3.24-2.37L5.55 6.5h-.8a.75.75 0 0 1 0-1.5H9V3.75ZM10.5 5h3V3.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V5Zm-3.44 1.5.7 12.04a1.75 1.75 0 0 0 1.75.96h4.98a1.75 1.75 0 0 0 1.75-.96l.7-12.04H7.06ZM10 9.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 10 9.25Zm4 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 14 9.25Z" fill="currentColor"></path>
              </svg>
            </div>
  
            <div class="pubUtmReglaDeleteModal__copy">
              <div class="pubUtmCard__eyebrow">Eliminar regla de audiencia</div>
              <h3>¿Querés borrar esta regla?</h3>
  
              <p>
                Vas a eliminar la regla <strong data-regla-delete-id>—</strong> de
                <strong>UTM_ReglasAudiencias</strong>.
              </p>
  
              <p class="pubUtmReglaDeleteModal__note">
                Esto no elimina audiencias ya generadas. Solo evita que esta regla vuelva a crear,
                clasificar o reforzar nuevas audiencias en futuras evaluaciones, rebuilds o procesos del motor.
              </p>
  
              <div class="pubUtmReglaDeleteModal__feedback" data-regla-delete-feedback hidden></div>
            </div>
  
            <div class="pubUtmReglaDeleteModal__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-delete-cancel="1">
                Cancelar
              </button>
  
              <button type="button" class="pubUtmBtn pubUtmBtn--danger pubUtmBtn--loadingCapable" data-regla-delete-confirm>
                <span class="pubUtmBtn__label" data-regla-delete-confirm-label>Sí, borrar regla</span>
                <span class="pubUtmBtn__spinner" aria-hidden="true"></span>
              </button>
            </div>
          </div>
  
          <div class="pubUtmReglaDeleteModal__view" data-regla-delete-view="success" hidden>
            <div class="pubUtmReglaDeleteModal__icon pubUtmReglaDeleteModal__icon--success">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.55 16.2 5.8 12.45a.9.9 0 1 1 1.27-1.27l2.48 2.48 7.38-7.38a.9.9 0 0 1 1.27 1.27l-8.02 8.02a.9.9 0 0 1-1.27 0Z" fill="currentColor"></path>
              </svg>
            </div>
  
            <div class="pubUtmReglaDeleteModal__copy">
              <div class="pubUtmCard__eyebrow">Regla eliminada</div>
              <h3>La regla se borró correctamente</h3>
  
              <p>
                No se eliminaron audiencias existentes. El cambio aplicará sobre futuras evaluaciones,
                rebuilds o procesos automáticos del motor.
              </p>
            </div>
  
            <div class="pubUtmReglaDeleteModal__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-regla-delete-cancel="1">
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    `);
  
    attachReglaDeleteModalEvents_(root);
  }
  
  function attachReglaDeleteModalEvents_(root) {
    const modal = root.querySelector("[data-regla-delete-modal]");
    if (!modal) return;
  
    modal.querySelectorAll("[data-regla-delete-cancel]").forEach(function (btn) {
      btn.onclick = function () {
        closeReglaDeleteModal_(root);
      };
    });
  
    const confirmBtn = modal.querySelector("[data-regla-delete-confirm]");
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        confirmDeleteReglaAudiencia_(root);
      };
    }
  }
  
  function openReglaDeleteModal_(root, reglaId) {
    const modal = root.querySelector("[data-regla-delete-modal]");
    if (!modal) return;
  
    STATE.pendingDeleteReglaId = reglaId;
  
    const idNode = modal.querySelector("[data-regla-delete-id]");
    const feedback = modal.querySelector("[data-regla-delete-feedback]");
    const confirmBtn = modal.querySelector("[data-regla-delete-confirm]");
    const confirmLabel = modal.querySelector("[data-regla-delete-confirm-label]");
  
    if (idNode) idNode.textContent = reglaId || "—";
  
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = "";
    }
  
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove("is-loading");
    }
  
    if (confirmLabel) {
      confirmLabel.textContent = "Sí, borrar regla";
    }
  
    setReglaDeleteModalState_(modal, "confirm");
  
    modal.hidden = false;
  }
  
  function closeReglaDeleteModal_(root) {
    const modal = root.querySelector("[data-regla-delete-modal]");
    if (!modal) return;
  
    modal.hidden = true;
    STATE.pendingDeleteReglaId = "";
  }
  
  function setReglaDeleteModalState_(modal, state) {
    if (!modal) return;
  
    modal.querySelectorAll("[data-regla-delete-view]").forEach(function (node) {
      node.hidden = node.getAttribute("data-regla-delete-view") !== state;
    });
  }
  
  function confirmDeleteReglaAudiencia_(root) {
    const reglaId = String(STATE.pendingDeleteReglaId || "").trim();
    const modal = root.querySelector("[data-regla-delete-modal]");
    if (!modal || !reglaId) return;
  
    const confirmBtn = modal.querySelector("[data-regla-delete-confirm]");
    const confirmLabel = modal.querySelector("[data-regla-delete-confirm-label]");
    const feedback = modal.querySelector("[data-regla-delete-feedback]");
  
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = "";
    }
  
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.classList.add("is-loading");
    }
  
    if (confirmLabel) {
      confirmLabel.textContent = "Borrando...";
    }
  
    jsonpRequest_(resolveApiBase_(), {
      action: "deletePublicidadUtmReglaConfig",
      regla_id: reglaId
    })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo eliminar la regla.");
        }
  
        setReglaDeleteModalState_(modal, "success");
        openReglasAudienciasSlide_(root, "list");
      })
      .catch(function (err) {
        if (feedback) {
          feedback.textContent = String(err || "Error desconocido al eliminar la regla.");
          feedback.hidden = false;
        }
  
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.classList.remove("is-loading");
        }
  
        if (confirmLabel) {
          confirmLabel.textContent = "Reintentar borrado";
        }
      });
  }

  function attachReglasAudienciasEvents_(root) {
    const slide = root.querySelector("[data-pubutm-reglas-slide]");
    if (!slide) return;
  
    slide.querySelectorAll("[data-reglas-close]").forEach(function (btn) {
      btn.onclick = function () {
        closeReglasAudienciasSlide_(root);
      };
    });
  
    slide.querySelectorAll("[data-reglas-refresh]").forEach(function (btn) {
      btn.onclick = function () {
        openReglasAudienciasSlide_(root, "list");
      };
    });
  
    slide.querySelectorAll("[data-reglas-new-inside]").forEach(function (btn) {
      btn.onclick = function () {
        openReglaEditor_(root, "create", null);
      };
    });
  
    const closeEditorBtn = slide.querySelector("[data-regla-editor-close]");
    if (closeEditorBtn) {
      closeEditorBtn.onclick = function () {
        closeReglaEditor_(root);
      };
    }
  }
  
  function openReglasAudienciasSlide_(root, mode) {
    const slide = root.querySelector("[data-pubutm-reglas-slide]");
    if (!slide) return;
  
    slide.classList.add("is-open");
    slide.setAttribute("aria-hidden", "false");
  
    renderReglasLoading_(root);
  
    jsonpRequest_(resolveApiBase_(), { action: "getPublicidadUtmReglasConfig" })
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo cargar la configuración de reglas.");
        }
  
        STATE.reglasConfig = res;
        renderReglasConfig_(root, res);
  
        if (mode === "new") {
          openReglaEditor_(root, "create", null);
        }
      })
      .catch(function (err) {
        alert(String(err || "Error desconocido al cargar reglas de audiencias."));
        closeReglasAudienciasSlide_(root);
      });
  }

  function deleteReglaAudiencia_(root, reglaId) {
    if (!root || !reglaId) return;
  
    try {
      if (!root.querySelector("[data-regla-delete-modal]")) {
        ensureReglaDeleteModal_(root);
      }
  
      const modal = root.querySelector("[data-regla-delete-modal]");
  
      if (!modal) {
        alert(
          "No se pudo abrir la confirmación visual de borrado.\n\n" +
          "La regla no fue eliminada. Revisá si ensureReglaDeleteModal_ está pegada correctamente."
        );
        return;
      }
  
      openReglaDeleteModal_(root, reglaId);
    } catch (err) {
      alert(
        "No se pudo preparar el modal de borrado.\n\n" +
        String(err || "Error desconocido.")
      );
    }
  }
  
  function closeReglasAudienciasSlide_(root) {
    const slide = root.querySelector("[data-pubutm-reglas-slide]");
    if (!slide) return;
  
    slide.classList.remove("is-open");
    slide.setAttribute("aria-hidden", "true");
    closeReglaEditor_(root);
  }
  
  function renderReglasLoading_(root) {
    const summary = root.querySelector("[data-reglas-summary]");
    const list = root.querySelector("[data-reglas-list]");
  
    if (summary) {
      summary.innerHTML = `
        <div class="pubUtmSkeletonBlock">
          <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
          <div class="pubUtmSkeletonLine"></div>
          <span class="pubUtmLoadingChip">Cargando reglas...</span>
        </div>
      `;
    }
  
    if (list) {
      list.innerHTML = `
        <article class="pubUtmCard pubUtmCard--full">
          <div class="pubUtmSkeletonBlock">
            <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
            <div class="pubUtmSkeletonLine"></div>
            <div class="pubUtmSkeletonLine pubUtmSkeletonLine--sm"></div>
          </div>
        </article>
      `;
    }
  }
  
  function renderReglasConfig_(root, payload) {
    renderReglasEntryStats_(root, payload.summary || {});
    renderReglasSummary_(root, payload.summary || {});
    renderReglasList_(root, Array.isArray(payload.reglas) ? payload.reglas : []);
  }
  
  function renderReglasEntryStats_(root, summary) {
    setText_(root, "[data-reglas-entry-active]", formatInteger_(summary.reglas_activas || 0));
    setText_(root, "[data-reglas-entry-tech]", formatInteger_(summary.reglas_con_tecnico_requerido || 0));
    setText_(root, "[data-reglas-entry-warnings]", formatInteger_(summary.reglas_con_advertencias || 0));
  }
  
  function renderReglasSummary_(root, summary) {
    const mount = root.querySelector("[data-reglas-summary]");
    if (!mount) return;
  
    mount.innerHTML = `
      <article class="pubUtmCard pubUtmCard--full">
        <div class="pubUtmReglasSummaryGrid">
          <div class="pubUtmMiniStat">
            <span class="pubUtmMiniStat__label">Total reglas</span>
            <strong class="pubUtmMiniStat__value">${formatInteger_(summary.total_reglas || 0)}</strong>
          </div>
          <div class="pubUtmMiniStat">
            <span class="pubUtmMiniStat__label">Activas</span>
            <strong class="pubUtmMiniStat__value">${formatInteger_(summary.reglas_activas || 0)}</strong>
          </div>
          <div class="pubUtmMiniStat">
            <span class="pubUtmMiniStat__label">Técnico requerido</span>
            <strong class="pubUtmMiniStat__value">${formatInteger_(summary.reglas_con_tecnico_requerido || 0)}</strong>
          </div>
          <div class="pubUtmMiniStat">
            <span class="pubUtmMiniStat__label">Advertencias</span>
            <strong class="pubUtmMiniStat__value">${formatInteger_(summary.reglas_con_advertencias || 0)}</strong>
          </div>
        </div>
      </article>
    `;
  }
  
  function renderReglasList_(root, reglas) {
    const list = root.querySelector("[data-reglas-list]");
    if (!list) return;
  
    if (!reglas.length) {
      list.innerHTML = `
        <article class="pubUtmCard pubUtmCard--full">
          <div class="pubUtmEmptyState">
            <h2>Sin reglas configuradas</h2>
            <p>Cuando crees reglas de audiencias, van a aparecer acá.</p>
          </div>
        </article>
      `;
      return;
    }
  
    list.innerHTML = reglas.map(function (r) {
      const warnings = Array.isArray(r.warnings_ui) ? r.warnings_ui : [];
  
      return `
      <article class="pubUtmReglaCard pubUtmCard ${getReglaCardToneClass_(r)}" data-regla-id="${escapeHtml_(r.regla_id || "")}">
          <div class="pubUtmReglaCard__head">
            <div>
              <div class="pubUtmCard__eyebrow">${escapeHtml_(r.regla_id || "—")} · prioridad ${formatInteger_(r.prioridad_regla || 0)}</div>
              <h3 class="pubUtmReglaCard__title">${escapeHtml_(r.nombre_regla || "Regla sin nombre")}</h3>
              <p class="pubUtmReglaCard__desc">${escapeHtml_(r.descripcion_regla || "Sin descripción")}</p>
            </div>
  
            <div class="pubUtmReglaCard__badges">
              ${renderSiNoPill_(r.activo)}
              <span class="pubUtmBadge pubUtmReglaBadge--${escapeHtml_(r.tipo_visual || "general")}">${escapeHtml_(r.tipo_visual || "general")}</span>
              <span class="pubUtmBadge">${escapeHtml_(r.resultado_prioridad_operativa || "—")}</span>
            </div>
          </div>
  
          ${renderReglaWarnings_(warnings)}
  
          <div class="pubUtmReglaCard__families">
  ${renderReglaFamiliesForCard_(r)}
</div>
  
          <div class="pubUtmReglaCard__metrics">
            <div><strong>Soporte ventas:</strong> ${formatInteger_(r.minimo_soporte_ventas || 0)}</div>
            <div><strong>Soporte clientes:</strong> ${formatInteger_(r.minimo_soporte_clientes || 0)}</div>
            <div><strong>Familias útiles:</strong> ${formatInteger_(r.minimo_familias_utiles || 0)}</div>
            <div><strong>Apto audiencia:</strong> ${escapeHtml_(r.resultado_apto_para_audiencia || "—")}</div>
            <div><strong>Jerarquía:</strong> ${escapeHtml_(r.resultado_jerarquia_patron || "—")}</div>
            <div><strong>Uso sugerido:</strong> ${escapeHtml_(r.resultado_tipo_uso_sugerido || "—")}</div>
          </div>
  
          <div class="pubUtmReglaCard__actions">
  <button type="button" class="pubUtmBtn pubUtmBtn--audiencePerms" data-regla-edit="${escapeHtml_(r.regla_id || "")}">
    Editar permisos de audiencia
  </button>

  <button
    type="button"
    class="pubUtmIconBtn pubUtmIconBtn--solidDanger"
    data-regla-delete="${escapeHtml_(r.regla_id || "")}"
    title="Eliminar regla"
    aria-label="Eliminar regla ${escapeHtml_(r.regla_id || "")}"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5h-.8l-.72 12.13A3.25 3.25 0 0 1 14.49 21h-4.98a3.25 3.25 0 0 1-3.24-2.37L5.55 6.5h-.8a.75.75 0 0 1 0-1.5H9V3.75ZM10.5 5h3V3.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V5Zm-3.44 1.5.7 12.04a1.75 1.75 0 0 0 1.75.96h4.98a1.75 1.75 0 0 0 1.75-.96l.7-12.04H7.06ZM10 9.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 10 9.25Zm4 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6A.75.75 0 0 1 14 9.25Z" fill="currentColor"></path>
    </svg>
  </button>
</div>
        </article>
      `;
    }).join("");
  
    const byId = {};
reglas.forEach(function (r) {
  byId[r.regla_id] = r;
});

list.querySelectorAll("[data-regla-edit]").forEach(function (btn) {
  btn.onclick = function () {
    const id = btn.getAttribute("data-regla-edit") || "";
    const item = byId[id];

    if (!item) {
      alert("No encontré la regla para editar: " + id);
      return;
    }

    openReglaEditor_(root, "update", item);
  };
});

list.querySelectorAll("[data-regla-delete]").forEach(function (btn) {
  btn.onclick = function () {
    const id = btn.getAttribute("data-regla-delete") || "";
    if (!id) return;

    deleteReglaAudiencia_(root, id);
  };
});
  }

  function getReglaCardToneClass_(regla) {
    const tipo = String(regla && regla.tipo_visual ? regla.tipo_visual : "").trim().toLowerCase();
    const prioridad = String(regla && regla.resultado_prioridad_operativa ? regla.resultado_prioridad_operativa : "").trim().toLowerCase();
    const warnings = Array.isArray(regla && regla.warnings_ui) ? regla.warnings_ui : [];
  
    if (warnings.some(function (w) { return String(w.nivel || "").toLowerCase() === "danger"; })) {
      return "pubUtmReglaCard--danger";
    }
  
    if (warnings.length || tipo.indexOf("tecnica") !== -1) {
      return "pubUtmReglaCard--warning";
    }
  
    if (tipo === "estrategico" || prioridad === "alta") {
      return "pubUtmReglaCard--high";
    }
  
    if (tipo === "accionable" || prioridad === "media") {
      return "pubUtmReglaCard--medium";
    }
  
    if (tipo === "experimental") {
      return "pubUtmReglaCard--experimental";
    }
  
    return "pubUtmReglaCard--neutral";
  }
  
  function renderReglaFamiliesForCard_(regla) {
    const familias = Array.isArray(regla && regla.composicion_familias)
      ? regla.composicion_familias
      : [];
  
    const visibles = familias.filter(function (f) {
      const minimo = Number(f && f.minimo != null ? f.minimo : 0);
      const requerido = !!(f && f.requerido);
      const bloqueado = !!(f && f.bloqueado);
  
      return !bloqueado && (requerido || minimo > 0);
    });
  
    if (!visibles.length) {
      return `
        <div class="pubUtmReglaFamilyEmpty">
          Sin familias requeridas configuradas
        </div>
      `;
    }
  
    return visibles.map(renderReglaFamilyPill_).join("");
  }

  function renderReglaWarnings_(warnings) {
    if (!warnings || !warnings.length) return "";
  
    return `
      <div class="pubUtmReglaWarnings">
        ${warnings.map(function (w) {
          return `
            <div class="pubUtmReglaWarning pubUtmReglaWarning--${escapeHtml_(w.nivel || "warning")}">
              <strong>${escapeHtml_(w.titulo || "Advertencia")}</strong>
              <span>${escapeHtml_(w.mensaje || "")}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
  
  function renderReglaFamilyPill_(f) {
    const cls = f.bloqueado
      ? "is-blocked"
      : (f.requerido ? "is-required" : "is-allowed");
  
    const label = f.bloqueado
      ? "bloqueada"
      : (f.requerido ? "requerida" : "permitida");
  
    return `
      <div class="pubUtmReglaFamilyPill ${cls}" data-family="${escapeHtml_(f.familia || "")}">
        <strong>${escapeHtml_(f.familia || "—")}</strong>
        <span>${label} · min ${formatInteger_(f.minimo || 0)} / max ${formatInteger_(f.maximo || 0)}</span>
      </div>
    `;
  }
  
  function openReglaEditor_(root, mode, item) {
    const reglasSlide = root.querySelector("[data-pubutm-reglas-slide]");
    const editorSlide = root.querySelector("[data-pubutm-reglas-editor-slide]");
    if (!editorSlide) return;
  
    const cfg = STATE.reglasConfig || {};
    const defaults = cfg.defaults || {};
    const source = item || defaults;
  
    editorSlide.setAttribute("data-regla-editor-mode", mode || "create");
    editorSlide.setAttribute(
      "data-original-regla-id",
      mode === "update" ? String(source.regla_id || "").trim() : ""
    );
    
    const title = editorSlide.querySelector("[data-regla-editor-title]");
    const body = editorSlide.querySelector("[data-regla-editor-body]");
    if (!body) return;
  
    if (title) {
      title.textContent = mode === "update"
        ? ("Editar regla · " + (source.regla_id || "—"))
        : "Nueva regla";
    }
  
    body.innerHTML = `
      <div class="pubUtmFieldIntroCard">
        <div class="pubUtmFieldIntroCard__icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.5 4.5A2.5 2.5 0 0 0 3 7v10a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17V7a2.5 2.5 0 0 0-2.5-2.5h-13Zm0 1.5h13A1 1 0 0 1 19.5 7v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2.25 3a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm0 3a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" fill="currentColor"></path>
          </svg>
        </div>
  
        <div class="pubUtmFieldIntroCard__copy">
          <strong>Configurá cómo nace una audiencia automática</strong>
          <span>
            Definí soporte mínimo, composición por familias, restricciones de seguridad y el resultado operativo
            que el motor debe asignar cuando un patrón cumpla esta regla.
          </span>
        </div>
      </div>
  
      ${buildReglaEditorHtml_(cfg, source, mode)}
      `;
  
      hydrateReglaEditorSwitches_(editorSlide, source);
    
      if (reglasSlide) {
        reglasSlide.classList.add("is-stack-behind");
      }
  
    editorSlide.classList.add("is-open");
    editorSlide.setAttribute("aria-hidden", "false");
  
    attachReglaEditorEvents_(root);
  
    requestAnimationFrame(function () {
      const firstInput = editorSlide.querySelector("input:not([type='hidden']), textarea, button");
      if (firstInput) firstInput.focus();
    });
  }
  
  function closeReglaEditor_(root) {
    const reglasSlide = root.querySelector("[data-pubutm-reglas-slide]");
    const editorSlide = root.querySelector("[data-pubutm-reglas-editor-slide]");
  
    if (editorSlide) {
      editorSlide.classList.remove("is-open");
      editorSlide.setAttribute("aria-hidden", "true");
    }
  
    if (reglasSlide) {
      reglasSlide.classList.remove("is-stack-behind");
    }
  }

  function hydrateReglaEditorSwitches_(editorSlide, source) {
    if (!editorSlide || !source) return;

    const map = {
      regla_activo: source.activo,

      requiere_permite_autojerarquia: source.requiere_permite_autojerarquia,
      requiere_permite_autoaudiencia: source.requiere_permite_autoaudiencia,
      bloquear_si_requiere_revision_manual: source.bloquear_si_requiere_revision_manual,

      resultado_apto_para_audiencia: source.resultado_apto_para_audiencia,
      resultado_apto_para_email: source.resultado_apto_para_email,
      resultado_apto_para_recompra: source.resultado_apto_para_recompra,
      resultado_apto_para_cross_sell: source.resultado_apto_para_cross_sell,
      resultado_apto_para_experimento: source.resultado_apto_para_experimento
    };

    Object.keys(map).forEach(function (name) {
      setFieldSwitchValue_(editorSlide, name, normalizeSiNoValue_(map[name]));
    });
  }

  function normalizeSiNoValue_(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();

    if (
      raw === "sí" ||
      raw === "si" ||
      raw === "true" ||
      raw === "1" ||
      raw === "yes"
    ) {
      return "sí";
    }

    return "no";
  }
  
  function buildReglaEditorHtml_(cfg, source, mode) {
    const catalogos = cfg.catalogos || {};
    const familias = Array.isArray(catalogos.familias) ? catalogos.familias : [];
  
    return `
      <div class="pubUtmReglaEditorGrid">
        <section class="pubUtmFieldSection">
          <div class="pubUtmFieldSection__title">Identidad de la regla</div>
  
          ${buildReglaTextRow_("regla_id", "ID de regla", "Identificador único de la regla. En edición no conviene renombrarlo.", source.regla_id || "", mode === "update")}
          ${buildReglaNumberRow_("prioridad_regla", "Prioridad de evaluación", "Las reglas se evalúan por prioridad. La primera que matchea gana.", source.prioridad_regla || 999)}
          ${buildReglaTextRow_("nombre_regla", "Nombre de regla", "Nombre humano para entender rápidamente qué define esta regla.", source.nombre_regla || "", false)}
          ${buildReglaTextareaRow_("descripcion_regla", "Descripción funcional", "Explica qué patrón busca capturar y por qué debería importarle al ecosistema.", source.descripcion_regla || "")}
          ${buildFieldToggleRow_("regla_activo", "Activa", "Si está apagada, la regla no debería participar en la evaluación del motor.")}
        </section>
  
        <section class="pubUtmFieldSection">
          <div class="pubUtmFieldSection__title">Soporte mínimo</div>
  
          ${buildReglaNumberRow_("minimo_soporte_ventas", "Mínimo soporte ventas", "Cantidad mínima de ventas necesarias para considerar la regla.", source.minimo_soporte_ventas || 0)}
          ${buildReglaNumberRow_("minimo_soporte_clientes", "Mínimo soporte clientes", "Cantidad mínima de clientes únicos necesarios para considerar la regla.", source.minimo_soporte_clientes || 0)}
          ${buildReglaNumberRow_("minimo_familias_utiles", "Mínimo familias útiles", "Cantidad mínima de familias requeridas para validar la composición.", source.minimo_familias_utiles || 1)}
        </section>
      </div>
  
      <section class="pubUtmFieldSection pubUtmReglaCompositionSection">
        <div class="pubUtmFieldSection__title">Composición por familias</div>
  
        <div class="pubUtmReglaFamilyHelper pubUtmReglaFamilyHelper--featured">
          <div class="pubUtmReglaFamilyHelper__copy">
            <strong>Elegí qué familias forman esta regla</strong>
            <span>
              Una regla nace cuando ciertas familias UTM aparecen juntas con suficiente soporte.
              Usá este selector para marcar rápidamente qué familia debe ser requerida.
            </span>
          </div>
  
          ${buildReglaDropdown_(
            "familia_picker",
            "Añadir familia requerida",
            "Seleccioná una familia para sumarla como condición activa de esta regla.",
            familias.map(function (f) {
              return {
                value: f,
                title: humanizeLabel_(f),
                subtitle: buildReglaFamilySubtitle_(f),
                badge: f
              };
            }),
            ""
          )}
        </div>
  
        <div class="pubUtmReglaFamilyGrid" data-regla-family-grid>
          ${familias.map(function (familia) {
            return buildReglaFamilyEditorCard_(familia, source);
          }).join("")}
        </div>
      </section>
  
      <div class="pubUtmReglaEditorGrid">
        <section class="pubUtmFieldSection">
          <div class="pubUtmFieldSection__title">Restricciones de seguridad</div>
  
          ${buildFieldToggleRow_("requiere_permite_autojerarquia", "Requiere autojerarquía", "Solo permite que la regla aplique si los campos permiten autojerarquía.")}
          ${buildFieldToggleRow_("requiere_permite_autoaudiencia", "Requiere autoaudiencia", "Solo permite que la regla aplique si los campos permiten autoaudiencia.")}
          ${buildFieldToggleRow_("bloquear_si_requiere_revision_manual", "Bloquear si requiere revisión manual", "Evita crear audiencias automáticas si algún campo todavía requiere revisión.")}
        </section>
  
        <section class="pubUtmFieldSection pubUtmReglaResultSection">
          <div class="pubUtmFieldSection__title">Resultado y clasificación operativa</div>
  
          ${buildFieldToggleRow_("resultado_apto_para_audiencia", "Apto para audiencia", "Define si el patrón resultante puede convertirse en audiencia automática.")}
          ${buildFieldToggleRow_("resultado_apto_para_email", "Apto para email", "Habilita uso sugerido en email marketing.")}
          ${buildFieldToggleRow_("resultado_apto_para_recompra", "Apto para recompra", "Habilita uso sugerido en recompra.")}
          ${buildFieldToggleRow_("resultado_apto_para_cross_sell", "Apto para cross sell", "Habilita uso sugerido en cross sell.")}
          ${buildFieldToggleRow_("resultado_apto_para_experimento", "Apto para experimento", "Habilita uso sugerido en experimentación.")}
  
          <div class="pubUtmReglaInlineDivider"></div>
  
          <div class="pubUtmReglaInlineSubTitle">
            <strong>Clasificación operativa</strong>
            <span>Define qué jerarquía, uso, revisión y prioridad recibe el patrón cuando esta regla aplica.</span>
          </div>
  
          <div class="pubUtmReglaDropdownGrid pubUtmReglaDropdownGrid--compact">
            ${buildReglaDropdownFromCatalog_("resultado_jerarquia_patron", "Jerarquía del patrón", "Clasifica el nivel operativo del patrón.", catalogos.resultado_jerarquia_patron, source.resultado_jerarquia_patron)}
            ${buildReglaDropdownFromCatalog_("resultado_tipo_uso_sugerido", "Tipo de uso sugerido", "Define hacia dónde conviene activar esta audiencia.", catalogos.resultado_tipo_uso_sugerido, source.resultado_tipo_uso_sugerido)}
            ${buildReglaDropdownFromCatalog_("resultado_estado_revision", "Estado de revisión", "Estado interno de confianza sobre la regla.", catalogos.resultado_estado_revision, source.resultado_estado_revision)}
            ${buildReglaDropdownFromCatalog_("resultado_prioridad_operativa", "Prioridad operativa", "Prioridad visual y operativa si la regla aplica.", catalogos.resultado_prioridad_operativa, source.resultado_prioridad_operativa)}
          </div>
  
          ${buildReglaTextareaRow_("resultado_motivo", "Motivo del resultado", "Explica por qué esta regla clasifica el patrón de esa manera.", source.resultado_motivo || "")}
        </section>
      </div>
  
      <div class="pubUtmReglaEditorActions">
        <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-editor-close-inline>
          Cancelar
        </button>
        <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-regla-save disabled title="El guardado real de reglas se conecta en la siguiente etapa.">
          Guardar regla
        </button>
      </div>
    `;
  }
  
  function buildReglaFamilySubtitle_(familia) {
    const map = {
      comercial: "Oferta, producto o propuesta comercial",
      segmentacion: "Audiencia, rango, género o nicho",
      comunicacion: "Mensaje, beneficio u objeción",
      creativo: "Formato, prueba visual o pieza creativa",
      contexto: "Ocasión, entorno o situación de uso",
      tecnico: "IDs, fuente, medio, campaña o señal técnica"
    };
  
    return map[familia] || "Familia UTM";
  }
  
  function buildReglaFamilyEditorCard_(familia, source) {
    const minKey = "minimo_campos_" + familia;
    const maxKey = "maximo_campos_" + familia;
  
    const minimo = Number(source[minKey] != null ? source[minKey] : 0);
    const maximo = Number(source[maxKey] != null ? source[maxKey] : 999);
  
    const statusClass = maximo === 0
      ? "is-blocked"
      : (minimo > 0 ? "is-required" : "is-allowed");
  
    return `
      <div class="pubUtmReglaFamilyEditorCard ${statusClass}" data-regla-family-card="${escapeHtml_(familia)}">
        <div class="pubUtmReglaFamilyEditorCard__head">
          <div>
            <strong>${escapeHtml_(humanizeLabel_(familia))}</strong>
            <span>${escapeHtml_(buildReglaFamilySubtitle_(familia))}</span>
          </div>
          <span class="pubUtmReglaFamilyDot"></span>
        </div>
  
        <div class="pubUtmReglaFamilyEditorCard__inputs">
          <label>
            <span>Mínimo</span>
            <input class="pubUtmFieldControl" type="number" name="${escapeHtml_(minKey)}" value="${escapeHtml_(minimo)}" min="0" />
          </label>
  
          <label>
            <span>Máximo</span>
            <input class="pubUtmFieldControl" type="number" name="${escapeHtml_(maxKey)}" value="${escapeHtml_(maximo)}" min="0" />
          </label>
        </div>
      </div>
    `;
  }
  
  function buildReglaTextRow_(name, title, desc, value, readonly) {
    return `
      <div class="pubUtmFieldControlRow">
        <div class="pubUtmFieldControlRow__copy">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
        <div class="pubUtmFieldControlRow__control">
          <input class="pubUtmFieldControl" type="text" name="${escapeHtml_(name)}" value="${escapeHtml_(value || "")}" ${readonly ? "readonly" : ""} />
        </div>
      </div>
    `;
  }
  
  function buildReglaNumberRow_(name, title, desc, value) {
    return `
      <div class="pubUtmFieldControlRow">
        <div class="pubUtmFieldControlRow__copy">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
        <div class="pubUtmFieldControlRow__control">
          <input class="pubUtmFieldControl" type="number" name="${escapeHtml_(name)}" value="${escapeHtml_(value)}" />
        </div>
      </div>
    `;
  }
  
  function buildReglaTextareaRow_(name, title, desc, value) {
    return `
      <div class="pubUtmFieldControlRow">
        <div class="pubUtmFieldControlRow__copy">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
        <div class="pubUtmFieldControlRow__control">
          <textarea class="pubUtmFieldControl" name="${escapeHtml_(name)}" rows="3">${escapeHtml_(value || "")}</textarea>
        </div>
      </div>
    `;
  }
  
  function buildReglaDropdownFromCatalog_(name, title, desc, options, selected) {
    const arr = Array.isArray(options) ? options : [];
  
    return buildReglaDropdown_(
      name,
      title,
      desc,
      arr.map(function (x) {
        return {
          value: x,
          title: humanizeLabel_(x),
          subtitle: "Valor operativo: " + x,
          badge: x
        };
      }),
      selected || ""
    );
  }
  
  function buildReglaDropdown_(name, title, desc, options, selected) {
    const selectedItem = (options || []).find(function (x) {
      return String(x.value) === String(selected);
    });
  
    return `
      <div class="pubUtmReglaDropdown" data-regla-dropdown="${escapeHtml_(name)}">
        <input type="hidden" name="${escapeHtml_(name)}" value="${escapeHtml_(selected || "")}" />
  
        <div class="pubUtmReglaDropdown__label">
          <strong>${escapeHtml_(title)}</strong>
          <span>${escapeHtml_(desc)}</span>
        </div>
  
        <button type="button" class="pubUtmReglaDropdown__trigger" data-regla-dropdown-trigger>
          <span>
            <strong data-regla-dropdown-title>${escapeHtml_(selectedItem ? selectedItem.title : "Seleccionar")}</strong>
            <small data-regla-dropdown-subtitle>${escapeHtml_(selectedItem ? selectedItem.subtitle : "Elegí una opción del catálogo")}</small>
          </span>
          <em>⌄</em>
        </button>
  
        <div class="pubUtmReglaDropdown__menu" data-regla-dropdown-menu>
        ${(options || []).map(function (opt) {
          return `
            <button type="button" class="pubUtmReglaDropdown__option" data-regla-dropdown-option="${escapeHtml_(opt.value)}">
              <span class="pubUtmReglaDropdown__optionContent">
                <span class="pubUtmReglaDropdown__badge">${escapeHtml_(opt.badge || opt.value)}</span>
                <small>${escapeHtml_(opt.subtitle || "")}</small>
              </span>
            </button>
          `;
        }).join("")}
      </div>
      </div>
    `;
  }
  
  function attachReglaEditorEvents_(root) {
    const scope =
      root.querySelector("[data-pubutm-reglas-editor-slide]") ||
      root.querySelector("[data-pubutm-reglas-slide]");
  
    if (!scope) return;
  
    scope.querySelectorAll("[data-regla-editor-close-inline]").forEach(function (btn) {
      btn.onclick = function () {
        closeReglaEditor_(root);
      };
    });

    scope.querySelectorAll("[data-regla-save]").forEach(function (btn) {
      btn.disabled = false;
      btn.removeAttribute("title");

      btn.onclick = function () {
        prepareReglaEditorSave_(root);
      };
    });
  
    scope.querySelectorAll("[data-switch]").forEach(function (btn) {
      btn.onclick = function () {
        const name = btn.getAttribute("data-switch");
        toggleFieldSwitch_(scope, name);
      };
    });
  
    scope.querySelectorAll("[data-regla-dropdown]").forEach(function (dd) {
      const trigger = dd.querySelector("[data-regla-dropdown-trigger]");
      const menu = dd.querySelector("[data-regla-dropdown-menu]");
      const hidden = dd.querySelector("input[type='hidden']");
      const title = dd.querySelector("[data-regla-dropdown-title]");
      const subtitle = dd.querySelector("[data-regla-dropdown-subtitle]");
  
      if (!trigger || !menu || !hidden) return;
  
      trigger.onclick = function () {
        scope.querySelectorAll("[data-regla-dropdown].is-open").forEach(function (other) {
          if (other !== dd) other.classList.remove("is-open");
        });
  
        dd.classList.toggle("is-open");
      };
  
      menu.querySelectorAll("[data-regla-dropdown-option]").forEach(function (opt) {
        opt.onclick = function () {
          const value = opt.getAttribute("data-regla-dropdown-option") || "";
          const optTitle = opt.querySelector("strong") ? opt.querySelector("strong").textContent : value;
          const optSubtitle = opt.querySelector("small") ? opt.querySelector("small").textContent : "";
  
          hidden.value = value;
          if (title) title.textContent = optTitle;
          if (subtitle) subtitle.textContent = optSubtitle;
  
          dd.classList.remove("is-open");
  
          if (hidden.name === "familia_picker") {
            markReglaFamilyRequired_(scope, value);
          }
        };
      });
    });
  
    scope.querySelectorAll("[data-regla-family-card] input").forEach(function (input) {
      input.oninput = function () {
        syncReglaFamilyCardState_(input.closest("[data-regla-family-card]"));
      };
    });
  }

  function prepareReglaEditorSave_(root) {
    const editorSlide = root.querySelector("[data-pubutm-reglas-editor-slide]");
    if (!editorSlide) return;

    const payload = collectReglaEditorPayload_(editorSlide);
    if (!payload) return;

    ensureReglaSaveModal_(root);
    openReglaSaveModal_(root, payload);
  }

  function collectReglaEditorPayload_(editorSlide) {
    if (!editorSlide) return null;

    const mode = String(editorSlide.getAttribute("data-regla-editor-mode") || "create").trim().toLowerCase();
    const originalReglaId = String(editorSlide.getAttribute("data-original-regla-id") || "").trim();

    const payload = {
      mode: mode,
      original_regla_id: originalReglaId,

      regla_id: mode === "create" ? "" : readFieldValue_(editorSlide, "regla_id"),
      regla_activo: readFieldValue_(editorSlide, "regla_activo"),
      activo: readFieldValue_(editorSlide, "regla_activo"),

      prioridad_regla: readFieldValue_(editorSlide, "prioridad_regla"),
      nombre_regla: readFieldValue_(editorSlide, "nombre_regla"),
      descripcion_regla: readFieldValue_(editorSlide, "descripcion_regla"),

      minimo_soporte_ventas: readFieldValue_(editorSlide, "minimo_soporte_ventas"),
      minimo_soporte_clientes: readFieldValue_(editorSlide, "minimo_soporte_clientes"),
      minimo_familias_utiles: readFieldValue_(editorSlide, "minimo_familias_utiles"),

      minimo_campos_comercial: readFieldValue_(editorSlide, "minimo_campos_comercial"),
      maximo_campos_comercial: readFieldValue_(editorSlide, "maximo_campos_comercial"),

      minimo_campos_segmentacion: readFieldValue_(editorSlide, "minimo_campos_segmentacion"),
      maximo_campos_segmentacion: readFieldValue_(editorSlide, "maximo_campos_segmentacion"),

      minimo_campos_comunicacion: readFieldValue_(editorSlide, "minimo_campos_comunicacion"),
      maximo_campos_comunicacion: readFieldValue_(editorSlide, "maximo_campos_comunicacion"),

      minimo_campos_creativo: readFieldValue_(editorSlide, "minimo_campos_creativo"),
      maximo_campos_creativo: readFieldValue_(editorSlide, "maximo_campos_creativo"),

      minimo_campos_contexto: readFieldValue_(editorSlide, "minimo_campos_contexto"),
      maximo_campos_contexto: readFieldValue_(editorSlide, "maximo_campos_contexto"),

      minimo_campos_tecnico: readFieldValue_(editorSlide, "minimo_campos_tecnico"),
      maximo_campos_tecnico: readFieldValue_(editorSlide, "maximo_campos_tecnico"),

      requiere_permite_autojerarquia: readFieldValue_(editorSlide, "requiere_permite_autojerarquia"),
      requiere_permite_autoaudiencia: readFieldValue_(editorSlide, "requiere_permite_autoaudiencia"),
      bloquear_si_requiere_revision_manual: readFieldValue_(editorSlide, "bloquear_si_requiere_revision_manual"),

      resultado_apto_para_audiencia: readFieldValue_(editorSlide, "resultado_apto_para_audiencia"),
      resultado_apto_para_email: readFieldValue_(editorSlide, "resultado_apto_para_email"),
      resultado_apto_para_recompra: readFieldValue_(editorSlide, "resultado_apto_para_recompra"),
      resultado_apto_para_cross_sell: readFieldValue_(editorSlide, "resultado_apto_para_cross_sell"),
      resultado_apto_para_experimento: readFieldValue_(editorSlide, "resultado_apto_para_experimento"),

      resultado_jerarquia_patron: readFieldValue_(editorSlide, "resultado_jerarquia_patron"),
      resultado_tipo_uso_sugerido: readFieldValue_(editorSlide, "resultado_tipo_uso_sugerido"),
      resultado_estado_revision: readFieldValue_(editorSlide, "resultado_estado_revision"),
      resultado_prioridad_operativa: readFieldValue_(editorSlide, "resultado_prioridad_operativa"),
      resultado_motivo: readFieldValue_(editorSlide, "resultado_motivo")
    };

    return payload;
  }

  function ensureReglaSaveModal_(root) {
    if (root.querySelector("[data-regla-save-modal]")) return;

    const mount = root.querySelector("#pubUtmSubSlideMount") || root;

    mount.insertAdjacentHTML("beforeend", `
      <div class="pubUtmReglaDeleteModal pubUtmReglaSaveModal" data-regla-save-modal hidden>
        <div class="pubUtmReglaDeleteModal__backdrop" data-regla-save-cancel="1"></div>

        <div class="pubUtmReglaDeleteModal__panel" role="dialog" aria-modal="true" aria-label="Guardar regla de audiencia">
          <div class="pubUtmReglaDeleteModal__view" data-regla-save-view="confirm">
            <div class="pubUtmReglaDeleteModal__icon pubUtmReglaDeleteModal__icon--primary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5.75 4A2.75 2.75 0 0 0 3 6.75v10.5A2.75 2.75 0 0 0 5.75 20h12.5A2.75 2.75 0 0 0 21 17.25V8.62a2.75 2.75 0 0 0-.8-1.94L18.32 4.8A2.75 2.75 0 0 0 16.38 4H5.75Zm0 1.5h10.63c.33 0 .65.13.88.37l1.87 1.87c.24.23.37.55.37.88v8.63c0 .69-.56 1.25-1.25 1.25H5.75c-.69 0-1.25-.56-1.25-1.25V6.75c0-.69.56-1.25 1.25-1.25ZM7 7.75A.75.75 0 0 1 7.75 7h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 7 7.75Zm0 3.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 7 11Zm0 3.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7 14.25Z" fill="currentColor"></path>
              </svg>
            </div>

            <div class="pubUtmReglaDeleteModal__copy">
              <div class="pubUtmCard__eyebrow" data-regla-save-eyebrow>Guardar regla de audiencia</div>
              <h3 data-regla-save-title>¿Confirmás el guardado?</h3>

              <p>
                Vas a guardar la regla <strong data-regla-save-name>—</strong>.
              </p>

              <p class="pubUtmReglaDeleteModal__note">
                <strong>ID:</strong> <span data-regla-save-id>—</span><br>
                Esta acción escribe la configuración en <strong>UTM_ReglasAudiencias</strong>.
                No crea audiencias inmediatamente: deja la regla disponible para futuras evaluaciones del motor.
              </p>

              <div class="pubUtmReglaDeleteModal__feedback" data-regla-save-feedback hidden></div>
            </div>

            <div class="pubUtmReglaDeleteModal__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--ghost" data-regla-save-cancel="1">
                Cancelar
              </button>

              <button type="button" class="pubUtmBtn pubUtmBtn--primary pubUtmBtn--loadingCapable" data-regla-save-confirm>
                <span class="pubUtmBtn__label" data-regla-save-confirm-label>Confirmar guardado</span>
                <span class="pubUtmBtn__spinner" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="pubUtmReglaDeleteModal__view" data-regla-save-view="success" hidden>
            <div class="pubUtmReglaDeleteModal__icon pubUtmReglaDeleteModal__icon--success">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.55 16.2 5.8 12.45a.9.9 0 1 1 1.27-1.27l2.48 2.48 7.38-7.38a.9.9 0 0 1 1.27 1.27l-8.02 8.02a.9.9 0 0 1-1.27 0Z" fill="currentColor"></path>
              </svg>
            </div>

            <div class="pubUtmReglaDeleteModal__copy">
              <div class="pubUtmCard__eyebrow">Regla guardada</div>
              <h3>La regla se guardó correctamente</h3>

              <p>
                La regla <strong data-regla-save-saved-id>—</strong> quedó registrada en
                <strong>UTM_ReglasAudiencias</strong>.
              </p>
            </div>

            <div class="pubUtmReglaDeleteModal__actions">
              <button type="button" class="pubUtmBtn pubUtmBtn--primary" data-regla-save-cancel="1">
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    attachReglaSaveModalEvents_(root);
  }

  function attachReglaSaveModalEvents_(root) {
    const modal = root.querySelector("[data-regla-save-modal]");
    if (!modal) return;

    modal.querySelectorAll("[data-regla-save-cancel]").forEach(function (btn) {
      btn.onclick = function () {
        closeReglaSaveModal_(root);
      };
    });

    const confirmBtn = modal.querySelector("[data-regla-save-confirm]");
    if (confirmBtn) {
      confirmBtn.onclick = function () {
        confirmSaveReglaEditor_(root);
      };
    }
  }

  function openReglaSaveModal_(root, payload) {
    const modal = root.querySelector("[data-regla-save-modal]");
    if (!modal) return;

    STATE.pendingSaveReglaPayload = payload;

    const isCreate = String(payload.mode || "create").toLowerCase() === "create";

    const eyebrow = modal.querySelector("[data-regla-save-eyebrow]");
    const title = modal.querySelector("[data-regla-save-title]");
    const name = modal.querySelector("[data-regla-save-name]");
    const id = modal.querySelector("[data-regla-save-id]");
    const feedback = modal.querySelector("[data-regla-save-feedback]");
    const confirmBtn = modal.querySelector("[data-regla-save-confirm]");
    const confirmLabel = modal.querySelector("[data-regla-save-confirm-label]");

    if (eyebrow) eyebrow.textContent = isCreate ? "Crear regla de audiencia" : "Actualizar regla de audiencia";
    if (title) title.textContent = isCreate ? "¿Confirmás crear esta regla?" : "¿Confirmás actualizar esta regla?";
    if (name) name.textContent = payload.nombre_regla || "Regla sin nombre";
    if (id) id.textContent = isCreate ? "Se asignará automáticamente" : (payload.regla_id || payload.original_regla_id || "—");

    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = "";
    }

    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove("is-loading");
    }

    if (confirmLabel) {
      confirmLabel.textContent = "Confirmar guardado";
    }

    setReglaSaveModalState_(modal, "confirm");

    modal.hidden = false;
  }

  function closeReglaSaveModal_(root) {
    const modal = root.querySelector("[data-regla-save-modal]");
    if (!modal) return;

    modal.hidden = true;
    STATE.pendingSaveReglaPayload = null;
  }

  function setReglaSaveModalState_(modal, state) {
    if (!modal) return;

    modal.querySelectorAll("[data-regla-save-view]").forEach(function (node) {
      node.hidden = node.getAttribute("data-regla-save-view") !== state;
    });
  }

  function confirmSaveReglaEditor_(root) {
    const modal = root.querySelector("[data-regla-save-modal]");
    const payload = STATE.pendingSaveReglaPayload;

    if (!modal || !payload) return;

    const confirmBtn = modal.querySelector("[data-regla-save-confirm]");
    const confirmLabel = modal.querySelector("[data-regla-save-confirm-label]");
    const feedback = modal.querySelector("[data-regla-save-feedback]");
    const savedIdNode = modal.querySelector("[data-regla-save-saved-id]");

    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = "";
    }

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.classList.add("is-loading");
    }

    if (confirmLabel) {
      confirmLabel.textContent = "Guardando...";
    }

    jsonpRequest_(resolveApiBase_(), Object.assign({
      action: "savePublicidadUtmReglaConfig"
    }, payload))
      .then(function (res) {
        if (!res || res.ok !== true) {
          throw new Error((res && res.error) ? res.error : "No se pudo guardar la regla.");
        }

        if (savedIdNode) {
          savedIdNode.textContent = res.regla_id || payload.regla_id || payload.original_regla_id || "—";
        }

        setReglaSaveModalState_(modal, "success");

        closeReglaEditor_(root);
        openReglasAudienciasSlide_(root, "list");
      })
      .catch(function (err) {
        if (feedback) {
          feedback.textContent = String(err || "Error desconocido al guardar la regla.");
          feedback.hidden = false;
        }

        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.classList.remove("is-loading");
        }

        if (confirmLabel) {
          confirmLabel.textContent = "Reintentar guardado";
        }
      });
  }

  function markReglaFamilyRequired_(slide, familia) {
    const card = slide.querySelector('[data-regla-family-card="' + familia + '"]');
    if (!card) return;
  
    const minInput = card.querySelector('input[name="minimo_campos_' + familia + '"]');
    const maxInput = card.querySelector('input[name="maximo_campos_' + familia + '"]');
  
    if (minInput && Number(minInput.value || 0) < 1) minInput.value = 1;
    if (maxInput && Number(maxInput.value || 0) === 0) maxInput.value = 1;
  
    syncReglaFamilyCardState_(card);
  }
  
  function syncReglaFamilyCardState_(card) {
    if (!card) return;
  
    const familia = card.getAttribute("data-regla-family-card");
    const minInput = card.querySelector('input[name="minimo_campos_' + familia + '"]');
    const maxInput = card.querySelector('input[name="maximo_campos_' + familia + '"]');
  
    const min = Number(minInput ? minInput.value || 0 : 0);
    const max = Number(maxInput ? maxInput.value || 0 : 0);
  
    card.classList.toggle("is-required", min > 0 && max !== 0);
    card.classList.toggle("is-blocked", max === 0);
    card.classList.toggle("is-allowed", min === 0 && max !== 0);
  }

/* INICIO · Lógica · Slide detalle operativo de conjunto */
function attachAudienceSetDetailSlideEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-detail-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-set-detail-close]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceSetDetailSlide_(root);
    };
  });

  const derivedBtn = slide.querySelector("[data-set-detail-create-derived]");
  if (derivedBtn) {
    derivedBtn.onclick = function () {
      const conjuntoId = slide.getAttribute("data-current-set-id") || "";
      const conjunto = findAudienceSetById_(conjuntoId);
      if (!conjunto) return;

      closeAudienceSetDetailSlide_(root);
      openAudienceSetCreator_(root, "");

      STATE.selectedAudiencesForSet = (conjunto.audiencias || [])
        .map(function (a) { return a.audiencia_id; })
        .filter(Boolean);

      renderAudienceSetCreator_(root);
    };
  }
}

function openAudienceSetDetailSlide_(root, conjuntoId) {
  const slide = root.querySelector("[data-pubutm-audience-set-detail-slide]");
  if (!slide) return;

  const conjunto = findAudienceSetById_(conjuntoId);

  if (!conjunto) {
    alert("No encontré el conjunto: " + conjuntoId);
    return;
  }

  renderAudienceSetDetailSlide_(root, conjunto);

  slide.classList.add("is-open");
  slide.setAttribute("aria-hidden", "false");
  slide.setAttribute("data-current-set-id", conjunto.conjunto_id || "");

  const main = root.closest("main") || root;
  main.classList.add("pubUtmSlideOpen");
}

function closeAudienceSetDetailSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-detail-slide]");
  if (!slide) return;

  slide.classList.remove("is-open");
  slide.setAttribute("aria-hidden", "true");
  slide.removeAttribute("data-current-set-id");

  const main = root.closest("main") || root;
  main.classList.remove("pubUtmSlideOpen");
}

function findAudienceSetById_(conjuntoId) {
  const id = String(conjuntoId || "").trim();
  const payload = STATE.conjuntosAudiencias || {};
  const conjuntos = Array.isArray(payload.conjuntos) ? payload.conjuntos : [];

  return conjuntos.find(function (c) {
    return String(c.conjunto_id || "").trim() === id;
  }) || null;
}

function renderAudienceSetDetailSlide_(root, conjunto) {
  const slide = root.querySelector("[data-pubutm-audience-set-detail-slide]");
  if (!slide) return;

  const title = slide.querySelector("[data-set-detail-title]");
  const eyebrow = slide.querySelector("[data-set-detail-eyebrow]");
  const channel = slide.querySelector("[data-set-detail-channel]");
  const badges = slide.querySelector("[data-set-detail-badges]");
  const summary = slide.querySelector("[data-set-detail-summary]");
  const kpis = slide.querySelector("[data-set-detail-kpis]");
  const users = slide.querySelector("[data-set-detail-users]");
  const actions = slide.querySelector("[data-set-detail-actions]");
  const audiences = slide.querySelector("[data-set-detail-audiences]");
  const rawAudiences = slide.querySelector("[data-set-detail-raw-audiences]");
  const members = slide.querySelector("[data-set-detail-members]");
  const origin = slide.querySelector("[data-set-detail-origin]");

  if (title) {
    title.textContent = conjunto.nombre_conjunto || conjunto.conjunto_id || "Conjunto de audiencias";
  }

  if (eyebrow) {
    eyebrow.textContent = [
      conjunto.conjunto_id || "—",
      humanizeLabel_(conjunto.tipo_conjunto || "conjunto")
    ].join(" · ");
  }

  if (channel) channel.innerHTML = renderSetDetailChannel_(conjunto);
  if (badges) badges.innerHTML = renderAudienceSetDetailBadges_(conjunto);
  if (summary) summary.textContent = buildAudienceSetCommercialSummary_(conjunto);
  if (kpis) kpis.innerHTML = renderAudienceSetDetailKpis_(conjunto);
  if (users) users.innerHTML = renderAudienceSetDetailUsers_(conjunto);
  if (actions) actions.innerHTML = renderAudienceSetDetailActions_(conjunto);
  if (audiences) audiences.innerHTML = renderAudienceSetIncludedAudiences_(root, conjunto);
  if (rawAudiences) rawAudiences.innerHTML = renderAudienceSetRawAudiences_(root, conjunto);
  if (members) members.innerHTML = renderAudienceSetMembersSummary_(conjunto);
  if (origin) origin.innerHTML = renderAudienceSetOrigin_(conjunto);

  bindAudienceSetDetailInnerActions_(root, slide);
}

/* INICIO · bindAudienceSetDetailInnerActions_ · acciones internas detalle conjunto */
function bindAudienceSetDetailInnerActions_(root, slide) {
  if (!slide) return;

  slide.querySelectorAll("[data-set-detail-open-audience]").forEach(function (btn) {
    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      const audienceId = btn.getAttribute("data-set-detail-open-audience") || "";
      if (!audienceId) return;

      openAudienceDetailSlide_(root, audienceId, "summary");
    };
  });

  slide.querySelectorAll("[data-set-detail-open-members]").forEach(function (btn) {
    btn.onclick = function (event) {
      event.preventDefault();
      event.stopPropagation();

      const conjuntoId = slide.getAttribute("data-current-set-id") || "";
      if (!conjuntoId) {
        alert("No encontré el ID del conjunto abierto.");
        return;
      }

      openAudienceSetMembersSlide_(root, conjuntoId);
    };
  });
}
/* FIN · bindAudienceSetDetailInnerActions_ · acciones internas detalle conjunto */

/* INICIO · Lógica · Sub-slide miembros del conjunto */
function attachAudienceSetMembersSlideEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-set-members-close]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceSetMembersSlide_(root);
    };
  });

  const search = slide.querySelector("[data-set-members-search]");
  if (search) {
    search.oninput = function () {
      STATE.audienceSetMembersSearch = String(search.value || "").trim().toLowerCase();
      renderAudienceSetMembersSlide_(root, STATE.audienceSetMembersPayload);
    };
  }

  slide.querySelectorAll("[data-set-members-tab]").forEach(function (btn) {
    btn.onclick = function () {
      const view = btn.getAttribute("data-set-members-tab") || "por_audiencia";
      STATE.audienceSetMembersView = view;
      renderAudienceSetMembersSlide_(root, STATE.audienceSetMembersPayload);
    };
  });
}

function openAudienceSetMembersSlide_(root, conjuntoId) {
  ensureAudienceSetMembersSlide_(root);

  const id = String(conjuntoId || "").trim();

  if (!id) {
    alert("Falta conjunto_id para cargar miembros.");
    return;
  }

  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide) return;

  STATE.audienceSetMembersSearch = "";
  STATE.audienceSetMembersTab = "por_audiencia";
  STATE.audienceSetMembersPayload = null;

  renderAudienceSetMembersLoading_(root, id);

  slide.classList.add("is-open");
  slide.setAttribute("aria-hidden", "false");

  const main = root.closest("main") || root;
  main.classList.add("pubUtmSlideOpen");

  loadPublicidadUtmMiembrosConjuntoSupabase_(id, null)
    .then(function (res) {
      if (!res || res.ok !== true) {
        throw new Error(
          (res && res.error)
            ? res.error
            : "No se pudieron cargar los miembros del conjunto."
        );
      }

      STATE.audienceSetMembersPayload = res;

      console.info(
        "[Publicidad UTM] Miembros del conjunto cargados desde Supabase:",
        res.conjunto_id || id,
        (res.summary && res.summary.miembros_unicos) || 0
      );

      renderAudienceSetMembersSlide_(root, res);
    })
    .catch(function (err) {
      renderAudienceSetMembersError_(root, err);
    });
}

function closeAudienceSetMembersSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide) return;

  slide.classList.remove("is-open");
  slide.setAttribute("aria-hidden", "true");
  slide.removeAttribute("data-current-set-id");

  STATE.audienceSetMembersPayload = null;
  STATE.audienceSetMembersSearch = "";
  STATE.audienceSetMembersView = "por_audiencia";
}

function renderAudienceSetMembersLoading_(root, conjuntoId) {
  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide) return;

  setText_(slide, "[data-set-members-eyebrow]", "Miembros del conjunto · " + conjuntoId);
  setText_(slide, "[data-set-members-title]", "Cargando miembros");
  setText_(slide, "[data-set-members-badges]", "");

  const summary = slide.querySelector("[data-set-members-summary]");
  const audiences = slide.querySelector("[data-set-members-audiences]");
  const content = slide.querySelector("[data-set-members-content]");

  if (summary) {
    summary.innerHTML = `
      <div class="pubUtmSkeletonBlock">
        <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
        <div class="pubUtmSkeletonLine"></div>
        <div class="pubUtmSkeletonLine pubUtmSkeletonLine--sm"></div>
      </div>
    `;
  }

  if (audiences) {
    audiences.innerHTML = `<div class="pubUtmLoadingChip">Cargando audiencias...</div>`;
  }

  if (content) {
    content.innerHTML = `
      <article class="pubUtmSetMembersEmpty">
        <div class="pubUtmSkeletonBlock">
          <div class="pubUtmSkeletonLine pubUtmSkeletonLine--lg"></div>
          <div class="pubUtmSkeletonLine"></div>
          <div class="pubUtmSkeletonLine pubUtmSkeletonLine--sm"></div>
        </div>
        <div class="pubUtmLoadingChip">Cargando miembros reales del conjunto...</div>
      </article>
    `;
  }
}

function renderAudienceSetMembersError_(root, err) {
  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide) return;

  const content = slide.querySelector("[data-set-members-content]");
  if (!content) return;

  content.innerHTML = `
    <article class="pubUtmSetMembersEmpty pubUtmSetMembersEmpty--error">
      <h3>No se pudieron cargar los miembros</h3>
      <p>${escapeHtml_(String(err || "Error desconocido."))}</p>
    </article>
  `;
}

function renderAudienceSetMembersSlide_(root, payload) {
  const slide = root.querySelector("[data-pubutm-audience-set-members-slide]");
  if (!slide || !payload) return;

  const conjunto = payload.conjunto || {};
  const summary = payload.summary || {};
  const audiencias = Array.isArray(payload.audiencias) ? payload.audiencias : [];

  const title = slide.querySelector("[data-set-members-title]");
  const eyebrow = slide.querySelector("[data-set-members-eyebrow]");
  const badges = slide.querySelector("[data-set-members-badges]");
  const summaryNode = slide.querySelector("[data-set-members-summary]");
  const audiencesNode = slide.querySelector("[data-set-members-audiences]");
  const content = slide.querySelector("[data-set-members-content]");

  if (title) title.textContent = conjunto.nombre_conjunto || payload.conjunto_id || "Miembros del conjunto";
  if (eyebrow) eyebrow.textContent = (payload.conjunto_id || "—") + " · miembros reales";
  if (badges) badges.innerHTML = renderAudienceSetMembersBadges_(summary, conjunto);
  if (summaryNode) summaryNode.innerHTML = renderAudienceSetMembersSummary_(summary);
  if (audiencesNode) audiencesNode.innerHTML = renderAudienceSetMembersAudiencesSide_(audiencias);

  slide.querySelectorAll("[data-set-members-tab]").forEach(function (btn) {
    const view = btn.getAttribute("data-set-members-tab") || "";
    btn.classList.toggle("is-active", view === STATE.audienceSetMembersView);
  });

  if (!content) return;

  const view = STATE.audienceSetMembersView || "por_audiencia";

  if (view === "todos") {
    content.innerHTML = renderAudienceSetMembersAll_(payload);
    return;
  }

  if (view === "solapados") {
    content.innerHTML = renderAudienceSetMembersOverlap_(payload);
    return;
  }

  content.innerHTML = renderAudienceSetMembersByAudience_(payload);
}

function renderAudienceSetMembersBadges_(summary, conjunto) {
  return `
    <span class="pubUtmBadge">${formatInteger_(summary.miembros_unicos || 0)} únicos</span>
    <span class="pubUtmBadge">${formatInteger_(summary.miembros_brutos || 0)} brutos</span>
    <span class="pubUtmBadge">${formatInteger_(summary.usuarios_solapados || 0)} solapados</span>
    <span class="pubUtmBadge">${escapeHtml_(humanizeLabel_(conjunto.canal_sugerido || "sin canal"))}</span>
  `;
}

function renderAudienceSetMembersSummary_(summary) {
  return `
    <div class="pubUtmSetMembersKpi">
      <span>Miembros únicos</span>
      <strong>${formatInteger_(summary.miembros_unicos || 0)}</strong>
    </div>

    <div class="pubUtmSetMembersKpi">
      <span>Miembros brutos</span>
      <strong>${formatInteger_(summary.miembros_brutos || 0)}</strong>
    </div>

    <div class="pubUtmSetMembersKpi">
      <span>Solapados</span>
      <strong>${formatInteger_(summary.usuarios_solapados || 0)}</strong>
    </div>

    <div class="pubUtmSetMembersKpi">
      <span>Facturación</span>
      <strong>${formatMoneyAr_(summary.facturacion_asociada || 0)}</strong>
    </div>
  `;
}

function renderAudienceSetMembersAudiencesSide_(audiencias) {
  if (!audiencias.length) {
    return `<p class="pubUtmPanelSlide__text">Sin audiencias vinculadas.</p>`;
  }

  return audiencias.map(function (aud) {
    return `
      <div class="pubUtmSetMembersAudiencePill">
        <strong>${escapeHtml_(aud.nombre_audiencia || aud.audiencia_id || "Audiencia")}</strong>
        <span>${escapeHtml_(aud.audiencia_id || "—")} · ${escapeHtml_(humanizeLabel_(aud.rol_en_conjunto || "soporte"))}</span>
        <em>${formatInteger_(aud.miembros_count || 0)} miembros · ${formatMoneyAr_(aud.facturacion_asociada || 0)}</em>
      </div>
    `;
  }).join("");
}

function renderAudienceSetMembersByAudience_(payload) {
  const audiencias = Array.isArray(payload.audiencias) ? payload.audiencias : [];
  const q = STATE.audienceSetMembersSearch || "";

  if (!audiencias.length) {
    return renderAudienceSetMembersEmpty_("No hay audiencias con miembros para este conjunto.");
  }

  const html = audiencias.map(function (aud) {
    const members = filterAudienceSetMembers_(aud.miembros || [], q);

    if (!members.length) return "";

    return `
      <section class="pubUtmSetMembersGroup">
        <div class="pubUtmSetMembersGroup__head">
          <div>
            <div class="pubUtmCard__eyebrow">${escapeHtml_(aud.audiencia_id || "—")} · ${escapeHtml_(humanizeLabel_(aud.rol_en_conjunto || "soporte"))}</div>
            <h3>${escapeHtml_(aud.nombre_audiencia || aud.audiencia_id || "Audiencia")}</h3>
            <p>${escapeHtml_(aud.condiciones_resumen || "Sin condiciones visibles")}</p>
          </div>

          <div class="pubUtmSetMembersGroup__metrics">
            <span>${formatInteger_(members.length)} visibles</span>
            <strong>${formatMoneyAr_(aud.facturacion_asociada || 0)}</strong>
          </div>
        </div>

        <div class="pubUtmSetMembersList">
          ${members.map(renderAudienceSetMemberCard_).join("")}
        </div>
      </section>
    `;
  }).filter(Boolean).join("");

  return html || renderAudienceSetMembersEmpty_("No hay miembros que coincidan con la búsqueda actual.");
}

function renderAudienceSetMembersAll_(payload) {
  const members = filterAudienceSetMembers_(payload.miembros_unicos || [], STATE.audienceSetMembersSearch || "");

  if (!members.length) {
    return renderAudienceSetMembersEmpty_("No hay miembros únicos que coincidan con la búsqueda actual.");
  }

  return `
    <section class="pubUtmSetMembersGroup">
      <div class="pubUtmSetMembersGroup__head">
        <div>
          <div class="pubUtmCard__eyebrow">Vista deduplicada</div>
          <h3>Todos los usuarios únicos</h3>
          <p>Usuarios agrupados por email. Si no existe email, el sistema usa venta o pedido como respaldo.</p>
        </div>

        <div class="pubUtmSetMembersGroup__metrics">
          <span>${formatInteger_(members.length)} visibles</span>
          <strong>${formatMoneyAr_(sumAudienceSetMembersRevenue_(members))}</strong>
        </div>
      </div>

      <div class="pubUtmSetMembersList">
        ${members.map(renderAudienceSetMemberCard_).join("")}
      </div>
    </section>
  `;
}

function renderAudienceSetMembersOverlap_(payload) {
  const members = filterAudienceSetMembers_(payload.miembros_solapados || [], STATE.audienceSetMembersSearch || "");

  if (!members.length) {
    return renderAudienceSetMembersEmpty_("No hay usuarios solapados que coincidan con la búsqueda actual.");
  }

  return `
    <section class="pubUtmSetMembersGroup pubUtmSetMembersGroup--overlap">
      <div class="pubUtmSetMembersGroup__head">
        <div>
          <div class="pubUtmCard__eyebrow">Señales cruzadas</div>
          <h3>Usuarios solapados</h3>
          <p>Usuarios que pertenecen a dos o más audiencias dentro del mismo conjunto. Son perfiles con mayor densidad de señal.</p>
        </div>

        <div class="pubUtmSetMembersGroup__metrics">
          <span>${formatInteger_(members.length)} solapados</span>
          <strong>${formatMoneyAr_(sumAudienceSetMembersRevenue_(members))}</strong>
        </div>
      </div>

      <div class="pubUtmSetMembersList">
        ${members.map(renderAudienceSetMemberCard_).join("")}
      </div>
    </section>
  `;
}

/* INICIO · renderAudienceSetMemberCard_ · acciones operativas */
function renderAudienceSetMemberCard_(member) {
  const audiencias = Array.isArray(member.audiencias_origen) ? member.audiencias_origen : [];
  const pedidos = Array.isArray(member.pedidos) ? member.pedidos : [];
  const ventas = Array.isArray(member.ventas_utm_ids) ? member.ventas_utm_ids : [];

  return `
    <article class="pubUtmSetMemberCard ${member.es_solapado ? "is-overlap" : ""}">
      <div class="pubUtmSetMemberCard__avatar">
        ${escapeHtml_(member.inicial || getMemberInitialFallback_(member))}
      </div>

      <div class="pubUtmSetMemberCard__body">
        <div class="pubUtmSetMemberCard__top">
          <div>
            <h4>${escapeHtml_(member.nombre_cliente || member.email || "Usuario sin nombre")}</h4>
            <p>${escapeHtml_(member.email || member.miembro_key || "Sin email")}</p>
          </div>

          <div class="pubUtmSetMemberCard__badges">
            ${member.es_solapado
              ? `<span class="pubUtmSetMemberBadge pubUtmSetMemberBadge--hot">Solapado</span>`
              : `<span class="pubUtmSetMemberBadge">Único</span>`}
            <span class="pubUtmSetMemberBadge">${formatInteger_(member.cantidad_audiencias || 0)} audiencias</span>
          </div>
        </div>

        <div class="pubUtmSetMemberCard__metrics">
          <div>
            <span>Pedidos</span>
            <strong>${escapeHtml_(pedidos.length ? pedidos.join(" · ") : "—")}</strong>
          </div>

          <div>
            <span>Ventas UTM</span>
            <strong>${escapeHtml_(ventas.length ? ventas.join(" · ") : "—")}</strong>
          </div>

          <div>
            <span>Facturación</span>
            <strong>${formatMoneyAr_(member.facturacion_asociada || 0)}</strong>
          </div>

          <div>
            <span>Última compra</span>
            <strong>${escapeHtml_(formatDateTimeAr_(member.ultima_fecha_compra) || "—")}</strong>
          </div>
        </div>

        <div class="pubUtmSetMemberCard__audiences">
          ${audiencias.map(function (aud) {
            return `
              <span title="${escapeHtml_(aud.condiciones_resumen || "")}">
                ${escapeHtml_(aud.audiencia_id || "—")} · ${escapeHtml_(humanizeLabel_(aud.rol_en_conjunto || "soporte"))}
              </span>
            `;
          }).join("")}
        </div>

        <div class="pubUtmSetMemberCard__actions">
          <button
            type="button"
            class="pubUtmSetMemberAction pubUtmSetMemberAction--mail"
            title="Enviar correo rápido"
          >
            <span class="pubUtmSetMemberAction__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.75Z" stroke="currentColor" stroke-width="1.8"/>
                <path d="m5 7 7 5 7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span>Enviar correo rápido</span>
          </button>

          <button
            type="button"
            class="pubUtmSetMemberAction pubUtmSetMemberAction--orders"
            title="Información de compras"
          >
            <span class="pubUtmSetMemberAction__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6.5 6h13l-1.4 7.2a1.25 1.25 0 0 1-1.23 1H9.1a1.25 1.25 0 0 1-1.23-1L6.5 6Zm0 0-.42-2.03A1.25 1.25 0 0 0 4.86 3H3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="10.25" cy="18.25" r="1.25" fill="currentColor"/>
                <circle cx="16.75" cy="18.25" r="1.25" fill="currentColor"/>
              </svg>
            </span>
            <span>Información de compras</span>
          </button>

          <button
            type="button"
            class="pubUtmSetMemberAction pubUtmSetMemberAction--remove"
            title="Eliminar miembro"
          >
            <span class="pubUtmSetMemberAction__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 4.75h6M5.75 7h12.5M9.75 10.25v6.5M14.25 10.25v6.5M7.75 7l.55 10.08A1.25 1.25 0 0 0 9.55 18.25h4.9a1.25 1.25 0 0 0 1.25-1.17L16.25 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span>Eliminar miembro</span>
          </button>
        </div>
      </div>
    </article>
  `;
}
/* FIN · renderAudienceSetMemberCard_ · acciones operativas */

function filterAudienceSetMembers_(members, query) {
  const q = String(query || "").trim().toLowerCase();
  const arr = Array.isArray(members) ? members : [];

  if (!q) return arr;

  return arr.filter(function (member) {
    const audiencias = Array.isArray(member.audiencias_origen) ? member.audiencias_origen : [];
    const pedidos = Array.isArray(member.pedidos) ? member.pedidos : [];
    const ventas = Array.isArray(member.ventas_utm_ids) ? member.ventas_utm_ids : [];

    const haystack = [
      member.nombre_cliente,
      member.email,
      member.miembro_key,
      pedidos.join(" "),
      ventas.join(" "),
      audiencias.map(function (a) {
        return [
          a.audiencia_id,
          a.nombre_audiencia,
          a.rol_en_conjunto,
          a.condiciones_resumen,
          a.familias_presentes
        ].join(" ");
      }).join(" ")
    ].join(" ").toLowerCase();

    return haystack.indexOf(q) !== -1;
  });
}

function sumAudienceSetMembersRevenue_(members) {
  return (members || []).reduce(function (acc, member) {
    return acc + Number(member.facturacion_asociada || 0);
  }, 0);
}

function renderAudienceSetMembersEmpty_(message) {
  return `
    <article class="pubUtmSetMembersEmpty">
      <h3>Sin resultados</h3>
      <p>${escapeHtml_(message || "No hay datos para mostrar.")}</p>
    </article>
  `;
}

function getMemberInitialFallback_(member) {
  const source = String(
    (member && member.nombre_cliente) ||
    (member && member.email) ||
    (member && member.miembro_key) ||
    "U"
  ).trim();

  return source.charAt(0).toUpperCase() || "U";
}
/* FIN · Lógica · Sub-slide miembros del conjunto */


function renderSetDetailChannel_(conjunto) {
  const info = getSetDetailChannelInfo_(conjunto.canal_sugerido);

  return `
    <span class="pubUtmSetDetailChannel pubUtmSetDetailChannel--${escapeHtml_(info.tone)}">
      <span class="pubUtmSetDetailChannel__icon" aria-hidden="true">
        ${getAudienceSetSmartSelectIcon_(info.icon)}
      </span>
      <span>${escapeHtml_(info.label)}</span>
    </span>
  `;
}

function renderAudienceSetDetailBadges_(conjunto) {
  const priority = getSetDetailPriorityInfo_(conjunto.prioridad_conjunto);

  return `
    <span class="pubUtmBadge">${escapeHtml_(humanizeLabel_(conjunto.tipo_conjunto || "conjunto"))}</span>
    <span class="pubUtmBadge pubUtmSetDetailPriority pubUtmSetDetailPriority--${escapeHtml_(priority.tone)}">${escapeHtml_(priority.label)}</span>
    <span class="pubUtmBadge">${escapeHtml_(humanizeLabel_(conjunto.estado_conjunto || "—"))}</span>
  `;
}

function buildAudienceSetCommercialSummary_(conjunto) {
  const nombre = conjunto.nombre_conjunto || conjunto.conjunto_id || "este conjunto";
  const canalInfo = getSetDetailChannelInfo_(conjunto.canal_sugerido);
  const familias = String(conjunto.familias_cubiertas || "").replace(/\|/g, ", ");
  const audiencias = formatInteger_(conjunto.cantidad_audiencias || 0);

  return "El conjunto " + nombre +
    " agrupa " + audiencias + " audiencias bajo una intención comercial común. " +
    "Cubre familias " + (familias || "sin familias declaradas") +
    " y queda disponible como carpeta operativa para " + canalInfo.label +
    ", ofertas dirigidas, remarketing, email, experimentos o flujos de segmentación avanzada.";
}

function renderAudienceSetDetailKpis_(conjunto) {
  const brutos = Number(conjunto.cantidad_miembros_estimados || 0);
  const unicos = Number(conjunto.cantidad_miembros_unicos || 0);
  const solapados = Math.max(0, brutos - unicos);
  const overlapPct = brutos > 0 ? Math.round((solapados / brutos) * 100) : 0;

  return `
    <div class="pubUtmSetDetailKpi">
      <span>Audiencias</span>
      <strong>${formatInteger_(conjunto.cantidad_audiencias || 0)}</strong>
    </div>

    <div class="pubUtmSetDetailKpi">
      <span>Miembros únicos</span>
      <strong>${formatInteger_(unicos)}</strong>
    </div>

    <div class="pubUtmSetDetailKpi">
      <span>Ventas</span>
      <strong>${formatInteger_(conjunto.ventas_asociadas || 0)}</strong>
    </div>

    <div class="pubUtmSetDetailKpi">
      <span>Facturación</span>
      <strong>${formatMoneyAr_(conjunto.facturacion_asociada || 0)}</strong>
    </div>

    <div class="pubUtmSetDetailKpi">
      <span>Solapamiento</span>
      <strong>${formatInteger_(overlapPct)}%</strong>
    </div>
  `;
}

/* INICIO · renderAudienceSetDetailUsers_ · bloque lateral con acceso */
function renderAudienceSetDetailUsers_(conjunto) {
  const members = Number(conjunto.cantidad_miembros_unicos || 0);
  const brutos = Number(conjunto.cantidad_miembros_estimados || 0);

  return `
    <button
      type="button"
      class="pubUtmSetDetailUsers pubUtmSetDetailUsers--link"
      data-set-detail-open-members
      aria-label="Ver miembros del conjunto"
    >
      <div class="pubUtmSetDetailUsers__avatars">
        ${renderSetDetailAvatarStack_(conjunto)}
      </div>

      <div class="pubUtmSetDetailUsers__copy">
        <strong>${formatInteger_(members)} usuarios únicos</strong>
        <span>${formatInteger_(brutos)} miembros brutos acumulados</span>
      </div>

      <span class="pubUtmSetDetailUsers__arrow" aria-hidden="true">›</span>
    </button>
  `;
}
/* FIN · renderAudienceSetDetailUsers_ · bloque lateral con acceso */

function renderAudienceSetDetailActions_(conjunto) {
  const channel = getSetDetailChannelInfo_(conjunto.canal_sugerido);
  const familias = String(conjunto.familias_cubiertas || "").toLowerCase();

  const commercialState = familias.indexOf("comercial") >= 0 ? "is-recommended" : "is-available";
  const emailState = channel.value === "email" ? "is-recommended" : "is-available";
  const experimentState = channel.value === "experimentacion" ? "is-recommended" : "is-available";

  return `
    <div class="pubUtmAudienceDetailAction ${emailState}">
      <strong>Email / nutrición</strong>
      <span>${channel.value === "email" ? "Canal sugerido principal para este conjunto." : "Puede reutilizarse en secuencias si el flujo lo requiere."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction ${commercialState}">
      <strong>Oferta dirigida</strong>
      <span>${commercialState === "is-recommended" ? "Tiene familias comerciales útiles para segmentación de oferta." : "Requiere más señal comercial antes de escalar."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction ${experimentState}">
      <strong>Experimento</strong>
      <span>${channel.value === "experimentacion" ? "Buen candidato para prueba controlada." : "Puede servir para validar hipótesis de público."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction is-available">
    <strong>Crear flujo</strong>
    <span>Más adelante podrá conectarse con Publicidad Interna como origen de campaña.</span>
  </div>
  
  <button
    type="button"
    class="pubUtmSetDetailSendToAdsBtn"
    data-send-to-publicidad-panel
    aria-label="Enviar al Panel de Publicidad"
  >
    <span class="pubUtmSetDetailSendToAdsBtn__copy">
      <strong>Enviar al Panel de Publicidad</strong>
      <em>Crea una campaña alrededor de este conjunto</em>
    </span>
  
    <span class="pubUtmSetDetailSendToAdsBtn__arrow" aria-hidden="true">›</span>
  </button>
  `;
}

function renderAudienceSetIncludedAudiences_(root, conjunto) {
  const items = Array.isArray(conjunto.audiencias) ? conjunto.audiencias : [];

  return `
    <div class="pubUtmSetDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Audiencias incluidas</div>
        <h3>Componentes del conjunto</h3>
      </div>
      <span class="pubUtmSetDetailCard__count">${formatInteger_(items.length)}</span>
    </div>

    ${
      items.length
        ? `<div class="pubUtmSetDetailAudienceList">
            ${items.map(function (item, index) {
              return renderSetDetailAudienceMiniCard_(item, index);
            }).join("")}
          </div>`
        : `<p class="pubUtmPanelSlide__text">Este conjunto no tiene audiencias vinculadas.</p>`
    }
  `;
}

/* INICIO · renderSetDetailAudienceMiniCard_ · sin botón abrir audiencia */
function renderSetDetailAudienceMiniCard_(item, index) {
  const actual = item.audiencia_actual || {};
  const audienceId = item.audiencia_id || actual.audiencia_id || "";
  const name = item.nombre_audiencia_snapshot || actual.nombre_audiencia || audienceId || "Audiencia";
  const role = item.rol_en_conjunto || "soporte";
  const type = actual.tipo_visual || actual.tipo_estructura || item.tipo_audiencia_snapshot || "audiencia";
  const familias = item.familias_snapshot || actual.familias_presentes || "—";
  const condiciones = item.condiciones_snapshot || actual.condiciones_resumen || "Sin condiciones visibles";

  return `
    <div class="pubUtmSetDetailAudienceItem">
      <div class="pubUtmSetDetailAudienceItem__main">
        <span class="pubUtmSetDetailAudienceItem__index">${String(index + 1).padStart(2, "0")}</span>

        <div class="pubUtmSetDetailAudienceItem__copy">
          <div class="pubUtmSetDetailAudienceItem__topline">
            <strong>${escapeHtml_(name)}</strong>
            <span>${escapeHtml_(humanizeLabel_(role))}</span>
          </div>

          <em>${escapeHtml_(audienceId || "—")} · ${escapeHtml_(humanizeLabel_(type))}</em>
          <p>${escapeHtml_(condiciones)}</p>
        </div>
      </div>

      <div class="pubUtmSetDetailAudienceItem__metrics">
        <div>
          <span>Miembros</span>
          <strong>${formatInteger_(item.miembros_snapshot || actual.cantidad_miembros || 0)}</strong>
        </div>
        <div>
          <span>Ventas</span>
          <strong>${formatInteger_(item.ventas_snapshot || actual.ventas_asociadas || 0)}</strong>
        </div>
        <div>
          <span>Facturación</span>
          <strong>${formatMoneyAr_(item.facturacion_snapshot || actual.facturacion_asociada || 0)}</strong>
        </div>
      </div>

      <div class="pubUtmSetDetailAudienceItem__bottom pubUtmSetDetailAudienceItem__bottom--solo">
        <span>Familias: ${escapeHtml_(String(familias).replace(/\|/g, " · "))}</span>
      </div>
    </div>
  `;
}
/* FIN · renderSetDetailAudienceMiniCard_ · sin botón abrir audiencia */

function renderAudienceSetRawAudiences_(root, conjunto) {
  const items = Array.isArray(conjunto.audiencias) ? conjunto.audiencias : [];

  return `
    <div class="pubUtmSetDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Audiencias crudas</div>
        <h3>Condiciones UTM que componen el conjunto</h3>
      </div>
    </div>

    ${
      items.length
        ? `<div class="pubUtmSetDetailRawList">
            ${items.map(function (item) {
              return renderSetDetailRawAudience_(item);
            }).join("")}
          </div>`
        : `<p class="pubUtmPanelSlide__text">No hay condiciones crudas disponibles para este conjunto.</p>`
    }
  `;
}

function renderSetDetailRawAudience_(item) {
  const actual = item.audiencia_actual || {};
  const audienceId = item.audiencia_id || actual.audiencia_id || "";
  const name = item.nombre_audiencia_snapshot || actual.nombre_audiencia || audienceId || "Audiencia";
  const condiciones = Array.isArray(actual.condiciones) ? actual.condiciones : [];

  return `
    <div class="pubUtmSetDetailRawAudience">
      <div class="pubUtmSetDetailRawAudience__head">
        <strong>${escapeHtml_(name)}</strong>
        <span>${escapeHtml_(audienceId || "—")}</span>
      </div>

      ${
        condiciones.length
          ? `<div class="pubUtmSetDetailConditionGrid">
              ${condiciones.map(function (cond) {
                return `
                  <div class="pubUtmSetDetailCondition">
                    <span>${escapeHtml_(humanizeLabel_(cond.campo_utm || "—"))}</span>
                    <strong>${escapeHtml_(humanizeLabel_(cond.valor_utm || "—"))}</strong>
                    <em>${escapeHtml_(cond.campo_utm || "—")} = ${escapeHtml_(cond.valor_utm || "—")}</em>
                  </div>
                `;
              }).join("")}
            </div>`
          : `<p>${escapeHtml_(item.condiciones_snapshot || actual.condiciones_resumen || "Sin condiciones visibles")}</p>`
      }
    </div>
  `;
}

/* INICIO · renderAudienceSetMembersSummary_ · sin botón y KPIs en 2x2 */
function renderAudienceSetMembersSummary_(conjunto) {
  const brutos = Number(conjunto.cantidad_miembros_estimados || 0);
  const unicos = Number(conjunto.cantidad_miembros_unicos || 0);
  const ventas = Number(conjunto.ventas_asociadas || 0);
  const clientes = Number(conjunto.clientes_unicos || 0);
  const duplicados = Math.max(0, brutos - unicos);

  return `
    <div class="pubUtmSetDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Usuarios del conjunto</div>
        <h3>Resumen de miembros y ventas asociadas</h3>
      </div>
    </div>

    <div class="pubUtmSetDetailMembersHero">
      <div class="pubUtmSetDetailMembersHero__avatars">
        ${renderSetDetailAvatarStackMembersHero_(conjunto)}
      </div>

      <div>
        <strong>${formatInteger_(unicos)} usuarios únicos</strong>
        <span>${formatInteger_(duplicados)} repeticiones detectadas por solapamiento preliminar</span>
      </div>
    </div>

    <div class="pubUtmSetDetailMemberGrid pubUtmSetDetailMemberGrid--twoCols">
      <div class="pubUtmMiniStat pubUtmMiniStat--soft">
        <span class="pubUtmMiniStat__label">Miembros brutos</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(brutos)}</strong>
      </div>

      <div class="pubUtmMiniStat pubUtmMiniStat--soft">
        <span class="pubUtmMiniStat__label">Clientes únicos</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(clientes)}</strong>
      </div>

      <div class="pubUtmMiniStat pubUtmMiniStat--soft">
        <span class="pubUtmMiniStat__label">Ventas asociadas</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(ventas)}</strong>
      </div>

      <div class="pubUtmMiniStat pubUtmMiniStat--soft">
        <span class="pubUtmMiniStat__label">Facturación</span>
        <strong class="pubUtmMiniStat__value">${formatMoneyAr_(conjunto.facturacion_asociada || 0)}</strong>
      </div>
    </div>

    <p class="pubUtmPanelSlide__text pubUtmSetDetailMembersSummaryText">
      Esta vista muestra el resumen operativo del conjunto. La tabla profunda de usuarios, emails y pedidos se puede conectar después bajo demanda para no cargar datos pesados en el dashboard principal.
    </p>
  `;
}
/* FIN · renderAudienceSetMembersSummary_ · sin botón y KPIs en 2x2 */

function renderAudienceSetOrigin_(conjunto) {
  return `
    <div class="pubUtmSetDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Origen y trazabilidad</div>
        <h3>Cómo nació este conjunto</h3>
      </div>
    </div>

    <div class="pubUtmAudienceDetailInfoGrid pubUtmSetDetailInfoGrid">
      <div><strong>ID conjunto:</strong><span>${escapeHtml_(conjunto.conjunto_id || "—")}</span></div>
      <div><strong>Origen creación:</strong><span>${escapeHtml_(humanizeLabel_(conjunto.origen_creacion || "—"))}</span></div>
      <div><strong>Creado por:</strong><span>${escapeHtml_(conjunto.creado_por || "—")}</span></div>
      <div><strong>Estado:</strong><span>${escapeHtml_(humanizeLabel_(conjunto.estado_conjunto || "—"))}</span></div>
      <div><strong>Canal sugerido:</strong><span>${escapeHtml_(getSetDetailChannelInfo_(conjunto.canal_sugerido).label)}</span></div>
      <div><strong>Prioridad:</strong><span>${escapeHtml_(getSetDetailPriorityInfo_(conjunto.prioridad_conjunto).label)}</span></div>
      <div><strong>Fecha creación:</strong><span>${escapeHtml_(formatDateTimeAr_(conjunto.fecha_creacion) || "—")}</span></div>
      <div><strong>Última actualización:</strong><span>${escapeHtml_(formatDateTimeAr_(conjunto.fecha_actualizacion) || "—")}</span></div>
    </div>
  `;
}

function renderSetDetailAvatarStack_(conjunto) {
  const members = Number(conjunto.cantidad_miembros_unicos || 0);
  const audiences = Array.isArray(conjunto.audiencias) ? conjunto.audiencias : [];
  const baseNames = audiences
    .map(function (item) {
      return item.nombre_audiencia_snapshot ||
        (item.audiencia_actual && item.audiencia_actual.nombre_audiencia) ||
        item.audiencia_id ||
        "";
    })
    .filter(Boolean);

  const avatarCount = Math.max(1, Math.min(4, members || baseNames.length || 1));
  const names = [];

  for (let i = 0; i < avatarCount; i += 1) {
    names.push(baseNames[i] || ["Cliente", "Usuario", "Perfil", "Lead"][i] || "Usuario");
  }

  const remaining = Math.max(0, members - avatarCount);

  return `
    <div class="pubUtmSetDetailAvatarStack">
      ${names.map(function (name, idx) {
        return `
          <span class="pubUtmSetDetailAvatar pubUtmSetDetailAvatar--${idx + 1}">
            ${escapeHtml_(getSetDetailInitial_(name))}
          </span>
        `;
      }).join("")}
      ${remaining > 0 ? `<span class="pubUtmSetDetailAvatar pubUtmSetDetailAvatar--more">+${formatInteger_(remaining)}</span>` : ""}
    </div>
  `;
}

/* INICIO · renderSetDetailAvatarStackMembersHero_ · avatares centrados solo en resumen */
function renderSetDetailAvatarStackMembersHero_(conjunto) {
  const members = Number(conjunto.cantidad_miembros_unicos || 0);
  const audiences = Array.isArray(conjunto.audiencias) ? conjunto.audiencias : [];
  const baseNames = audiences
    .map(function (item) {
      return item.nombre_audiencia_snapshot ||
        (item.audiencia_actual && item.audiencia_actual.nombre_audiencia) ||
        item.audiencia_id ||
        "";
    })
    .filter(Boolean);

  const avatarCount = Math.max(1, Math.min(4, members || baseNames.length || 1));
  const names = [];

  for (let i = 0; i < avatarCount; i += 1) {
    names.push(baseNames[i] || ["Cliente", "Usuario", "Perfil", "Lead"][i] || "Usuario");
  }

  const remaining = Math.max(0, members - avatarCount);

  return `
    <div class="pubUtmSetDetailAvatarStack pubUtmSetDetailAvatarStack--membersHero">
      ${names.map(function (name, idx) {
        return `
          <span class="pubUtmSetDetailAvatar pubUtmSetDetailAvatar--${idx + 1}">
            <span class="pubUtmSetDetailAvatar__letter">${escapeHtml_(getSetDetailInitial_(name))}</span>
          </span>
        `;
      }).join("")}

      ${remaining > 0 ? `
        <span class="pubUtmSetDetailAvatar pubUtmSetDetailAvatar--more">
          <span class="pubUtmSetDetailAvatar__letter">+${formatInteger_(remaining)}</span>
        </span>
      ` : ""}
    </div>
  `;
}
/* FIN · renderSetDetailAvatarStackMembersHero_ · avatares centrados solo en resumen */

function getSetDetailInitial_(value) {
  const clean = String(value || "").trim();
  if (!clean) return "U";

  return clean
    .replace(/^Auto\s*·\s*/i, "")
    .replace(/^utm_/i, "")
    .charAt(0)
    .toUpperCase() || "U";
}

function getSetDetailChannelInfo_(value) {
  const key = String(value || "").trim().toLowerCase();

  const map = {
    email: {
      value: "email",
      label: "Email",
      icon: "mail",
      tone: "blue"
    },
    publicidad_interna: {
      value: "publicidad_interna",
      label: "Publicidad interna",
      icon: "screen",
      tone: "indigo"
    },
    experimentacion: {
      value: "experimentacion",
      label: "Experimentación",
      icon: "spark",
      tone: "violet"
    },
    recompra: {
      value: "recompra",
      label: "Recompra",
      icon: "refresh",
      tone: "green"
    },
    cross_sell: {
      value: "cross_sell",
      label: "Cross sell",
      icon: "nodes",
      tone: "orange"
    }
  };

  return map[key] || {
    value: key || "sin_canal",
    label: humanizeLabel_(value || "Sin canal"),
    icon: "spark",
    tone: "slate"
  };
}

function getSetDetailPriorityInfo_(value) {
  const key = String(value || "").trim().toLowerCase();

  const map = {
    alta: {
      label: "Prioridad alta",
      tone: "high"
    },
    media: {
      label: "Prioridad media",
      tone: "medium"
    },
    baja: {
      label: "Prioridad baja",
      tone: "low"
    }
  };

  return map[key] || {
    label: humanizeLabel_(value || "Sin prioridad"),
    tone: "neutral"
  };
}
/* FIN · Lógica · Slide detalle operativo de conjunto */

/* INICIO · Lógica · Slide detalle de audiencia */
function attachAudienceDetailSlideEvents_(root) {
  const slide = root.querySelector("[data-pubutm-audience-detail-slide]");
  if (!slide) return;

  slide.querySelectorAll("[data-audience-detail-close]").forEach(function (btn) {
    btn.onclick = function () {
      closeAudienceDetailSlide_(root);
    };
  });

  const createSetBtn = slide.querySelector("[data-audience-detail-create-set]");
  if (createSetBtn) {
    createSetBtn.onclick = function () {
      const audienceId = slide.getAttribute("data-current-audience-id") || "";
      if (!audienceId) return;

      closeAudienceDetailSlide_(root);
      openAudienceSetCreator_(root, audienceId);
    };
  }
}

function openAudienceDetailSlide_(root, audienceInput, focusMode) {
  const slide = root.querySelector("[data-pubutm-audience-detail-slide]");
  if (!slide) return;

  const audience = typeof audienceInput === "string"
    ? findAudienceById_(audienceInput)
    : audienceInput;

  if (!audience || !audience.audiencia_id) {
    alert("No encontré la audiencia para abrir el detalle.");
    return;
  }

  renderAudienceDetailSlide_(root, audience, focusMode || "summary");

  slide.classList.add("is-open");
  slide.setAttribute("aria-hidden", "false");
  slide.setAttribute("data-current-audience-id", audience.audiencia_id || "");

  const main = root.closest("main") || root;
  main.classList.add("pubUtmSlideOpen");
}

function closeAudienceDetailSlide_(root) {
  const slide = root.querySelector("[data-pubutm-audience-detail-slide]");
  if (!slide) return;

  slide.classList.remove("is-open");
  slide.setAttribute("aria-hidden", "true");
  slide.removeAttribute("data-current-audience-id");

  const main = root.closest("main") || root;
  main.classList.remove("pubUtmSlideOpen");
}

function renderAudienceDetailSlide_(root, audience, focusMode) {
  const slide = root.querySelector("[data-pubutm-audience-detail-slide]");
  if (!slide) return;

  const title = slide.querySelector("[data-audience-detail-title]");
  const eyebrow = slide.querySelector("[data-audience-detail-eyebrow]");
  const badges = slide.querySelector("[data-audience-detail-badges]");
  const summary = slide.querySelector("[data-audience-detail-summary]");
  const kpis = slide.querySelector("[data-audience-detail-kpis]");
  const actions = slide.querySelector("[data-audience-detail-actions]");
  const composition = slide.querySelector("[data-audience-detail-composition]");
  const members = slide.querySelector("[data-audience-detail-members]");
  const origin = slide.querySelector("[data-audience-detail-origin]");
  const relations = slide.querySelector("[data-audience-detail-relations]");

  /* INICIO · Header data · Detalle de audiencia */
const detailTitle = buildAudienceDetailReadableName_(audience);
const detailSubtitle = buildAudienceDetailHeaderSubtitle_(audience);
const subtitle = slide.querySelector("[data-audience-detail-subtitle]");

if (title) {
  title.textContent = detailTitle || "Audiencia";
}

if (eyebrow) {
  eyebrow.textContent = [
    audience.audiencia_id || "—",
    humanizeLabel_(audience.tipo_visual || audience.tipo_estructura || "audiencia")
  ].join(" · ");
}

if (subtitle) {
  subtitle.textContent = detailSubtitle;
}
/* FIN · Header data · Detalle de audiencia */

  if (badges) {
    badges.innerHTML = renderAudienceDetailBadges_(audience);
  }

  if (summary) {
    summary.textContent = buildAudienceCommercialSummary_(audience);
  }

  if (kpis) {
    kpis.innerHTML = renderAudienceDetailKpis_(audience);
  }

  if (actions) {
    actions.innerHTML = renderAudienceDetailActions_(audience);
  }

  if (composition) {
    composition.innerHTML = renderAudienceDetailComposition_(audience);
  }

  if (members) {
    members.innerHTML = renderAudienceDetailMembers_(audience);
  }

  if (origin) {
    origin.innerHTML = renderAudienceDetailOrigin_(audience);
  }

  if (relations) {
    relations.innerHTML = renderAudienceDetailRelations_(audience);
  }
  
  /* INICIO · Decoración visual segura del slide de audiencia */
  if (typeof decorateAudienceDetailUi_ === "function") {
    try {
      decorateAudienceDetailUi_(slide);
    } catch (err) {
      console.warn("No se pudo aplicar la decoración visual del slide de audiencia:", err);
    }
  }
  /* FIN · Decoración visual segura del slide de audiencia */
  
  const targetSelector = focusMode === "members"
    ? "[data-audience-detail-members]"
    : (focusMode === "origin" ? "[data-audience-detail-origin]" : "[data-audience-detail-composition]");
  
  requestAnimationFrame(function () {
    const target = slide.querySelector(targetSelector);
    if (target && focusMode !== "summary") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  }

function findAudienceById_(audienceId) {
  const id = String(audienceId || "").trim();
  const dashboard = STATE.dashboard || {};
  const audiencias = Array.isArray(dashboard.audiencias) ? dashboard.audiencias : [];

  return audiencias.find(function (a) {
    return String(a.audiencia_id || "").trim() === id;
  }) || null;
}

/* INICIO · Helpers · Header detalle audiencia */
function buildAudienceDetailReadableName_(audience) {
  const a = audience || {};
  const raw = String(a.nombre_audiencia || a.audiencia_id || "Audiencia").trim();

  const clean = raw
    .replace(/^auto\s*·\s*/i, "")
    .replace(/^auto\s*-\s*/i, "")
    .replace(/^auto\s*/i, "")
    .trim();

  if (clean.indexOf("=") !== -1) {
    const parts = clean.split("=");
    const field = buildAudienceDetailFieldLabel_(parts[0] || "");
    const value = buildAudienceDetailValueLabel_(parts.slice(1).join("=") || "");

    return field + " · " + value;
  }

  return buildAudienceDetailValueLabel_(humanizeLabel_(clean || raw));
}

function buildAudienceDetailHeaderSubtitle_(audience) {
  const a = audience || {};
  const tipo = humanizeLabel_(a.tipo_estructura || a.tipo_visual || "audiencia");
  const canal = humanizeLabel_(a.canal_destino || "sin canal");
  const condiciones = Number(a.cantidad_condiciones || 0);
  const miembros = Number(a.cantidad_miembros || 0);

  return [
    "Audiencia " + tipo,
    formatInteger_(miembros) + " miembros",
    formatInteger_(condiciones) + " condiciones",
    "Canal: " + canal
  ].join(" · ");
}

function buildAudienceDetailFieldLabel_(value) {
  const key = String(value || "")
    .replace(/^utm_/i, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();

  const map = {
    mensaje: "Mensaje",
    oferta: "Oferta",
    ocasion_uso: "Ocasión de uso",
    ocasion: "Ocasión",
    uso: "Uso",
    producto: "Producto",
    sku: "SKU",
    variant_id: "Variante",
    variante: "Variante",
    campaign: "Campaña",
    campana: "Campaña",
    source: "Origen",
    medium: "Medio"
  };

  return map[key] || toAudienceDetailReadableCase_(key);
}

function buildAudienceDetailValueLabel_(value) {
  return toAudienceDetailReadableCase_(
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function toAudienceDetailReadableCase_(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
/* FIN · Helpers · Header detalle audiencia */

/* =========================================================
   INICIO · Helpers visuales · Slide detalle de audiencia
   ========================================================= */

   function decorateAudienceDetailUi_(slide) {
    if (!slide) return;
  
    decorateAudienceDetailCreateSetButton_(slide);
    decorateAudienceDetailCards_(slide);
    injectAudienceMembersOperationalNote_(slide);
  }
  
  function decorateAudienceDetailCreateSetButton_(slide) {
    const btn = slide.querySelector("[data-audience-detail-create-set]");
    if (!btn || btn.dataset.decorated === "1") return;
  
    btn.dataset.decorated = "1";
    btn.innerHTML = `
      <span class="pubUtmAudienceDetailBtnIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="6" cy="6" r="2.25" fill="currentColor"></circle>
          <circle cx="18" cy="6" r="2.25" fill="currentColor"></circle>
          <circle cx="12" cy="18" r="2.25" fill="currentColor"></circle>
          <path d="M7.9 7.4L10.9 15.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M16.1 7.4L13.1 15.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M8.5 6H15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      </span>
      <span>Crear conjunto con esta audiencia</span>
    `;
  }
  
  function decorateAudienceDetailCards_(slide) {
    const heads = slide.querySelectorAll(".pubUtmAudienceDetailCard__head");
    if (!heads.length) return;
  
    heads.forEach(function (head) {
      if (head.querySelector(".pubUtmAudienceDetailCard__headIcon")) return;
  
      const titleEl = head.querySelector("h3");
      if (!titleEl) return;
  
      const title = normalizeAudienceDetailTitle_(titleEl.textContent || "");
      const iconSvg = getAudienceDetailCardIconSvg_(title);
  
      const iconWrap = document.createElement("span");
      iconWrap.className = "pubUtmAudienceDetailCard__headIcon";
      iconWrap.setAttribute("aria-hidden", "true");
      iconWrap.innerHTML = iconSvg;
  
      head.insertBefore(iconWrap, titleEl);
      head.classList.add("is-decorated");
    });
  }
  
  function injectAudienceMembersOperationalNote_(slide) {
    const side = slide.querySelector(".pubUtmAudienceDetailSlide__side");
    if (!side) return;
  
    const existing = side.querySelector("[data-audience-members-note]");
    if (existing) existing.remove();
  
    const note = document.createElement("article");
    note.className = "pubUtmAudienceDetailOperationalNote";
    note.setAttribute("data-audience-members-note", "1");
  
    note.innerHTML = `
      <div class="pubUtmAudienceDetailOperationalNote__head">
        <span class="pubUtmAudienceDetailOperationalNote__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"></circle>
            <path d="M12 10V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            <circle cx="12" cy="7.2" r="1.2" fill="currentColor"></circle>
          </svg>
        </span>
        <div class="pubUtmAudienceDetailOperationalNote__copy">
          <div class="pubUtmAudienceDetailOperationalNote__eyebrow">Nota de miembros</div>
          <div class="pubUtmAudienceDetailOperationalNote__title">Visualización operativa</div>
        </div>
      </div>
  
      <p class="pubUtmAudienceDetailOperationalNote__text">
        Para visualizar los miembros reales de esta audiencia, debes crear un conjunto de audiencias que la incluya.
        Puede ser la única audiencia del conjunto o formar parte de uno con varias audiencias.
      </p>
    `;
  
    side.appendChild(note);
  }
  
  function normalizeAudienceDetailTitle_(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  
  function getAudienceDetailCardIconSvg_(title) {
    if (title.includes("resumen comercial")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 18.5H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M7.5 16V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M12 16V6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M16.5 16V12.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `;
    }
  
    if (title.includes("composicion") || title.includes("condiciones")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="4" rx="2" stroke="currentColor" stroke-width="1.8"></rect>
          <rect x="4" y="10" width="16" height="4" rx="2" stroke="currentColor" stroke-width="1.8"></rect>
          <rect x="4" y="15" width="16" height="4" rx="2" stroke="currentColor" stroke-width="1.8"></rect>
        </svg>
      `;
    }
  
    if (title.includes("miembros")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.8"></circle>
          <path d="M4.8 18c.7-2.3 2.7-3.8 5.2-3.8 2.5 0 4.5 1.5 5.2 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <circle cx="17.5" cy="10" r="2.2" stroke="currentColor" stroke-width="1.6"></circle>
        </svg>
      `;
    }
  
    if (title.includes("origen tecnico")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5M17.8 17.8l-1.5-1.5M7.7 7.7 6.2 6.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `;
    }
  
    if (title.includes("relaciones")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M10 14 14 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M8.2 15.8 6.9 17a3 3 0 1 1-4.2-4.2l2.4-2.4a3 3 0 0 1 4.2 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="m15.8 8.2 1.3-1.2a3 3 0 1 1 4.2 4.2l-2.4 2.4a3 3 0 0 1-4.2 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>
      `;
    }
  
    if (title.includes("acciones")) {
      return `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 4.5 14 9l4.9.5-3.7 3.2 1.1 4.8L12 15.2 7.7 17.5l1.1-4.8L5.1 9.5 10 9l2-4.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
        </svg>
      `;
    }
  
    return `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.8"></rect>
      </svg>
    `;
  }
  
  /* =========================================================
     FIN · Helpers visuales · Slide detalle de audiencia
     ========================================================= */

/* INICIO · renderAudienceDetailBadges_ · Header estratégico */
function renderAudienceDetailBadges_(audience) {
  const a = audience || {};

  const tipo = humanizeLabel_(a.tipo_estructura || a.tipo_visual || "audiencia");
  const canal = humanizeLabel_(a.canal_destino || "sin canal");
  const prioridad = humanizeLabel_(a.prioridad_visual || "sin prioridad");
  const estado = humanizeLabel_(a.estado_audiencia || "sin estado");

  return `
    <span class="pubUtmAudienceDetailHeaderBadge pubUtmAudienceDetailHeaderBadge--black">
      ${escapeHtml_(tipo)}
    </span>

    <span class="pubUtmAudienceDetailHeaderBadge pubUtmAudienceDetailHeaderBadge--blue">
      ${escapeHtml_(canal)}
    </span>

    <span class="pubUtmAudienceDetailHeaderBadge pubUtmAudienceDetailHeaderBadge--green">
      ${escapeHtml_(estado)}
    </span>

    <span class="pubUtmAudienceDetailHeaderBadge pubUtmAudienceDetailHeaderBadge--slate">
      ${escapeHtml_(prioridad)}
    </span>
  `;
}
/* FIN · renderAudienceDetailBadges_ · Header estratégico */

function buildAudienceCommercialSummary_(audience) {
  const nombre = audience.nombre_audiencia || audience.audiencia_id || "esta audiencia";
  const tipo = humanizeLabel_(audience.tipo_estructura || audience.tipo_visual || "audiencia");
  const canal = humanizeLabel_(audience.canal_destino || "publicidad interna");
  const familias = String(audience.familias_presentes || "").replace(/\|/g, ", ");
  const condiciones = audience.condiciones_resumen || "sus condiciones UTM detectadas";

  return "La audiencia " + nombre + " es una audiencia " + tipo +
    " construida a partir de " + condiciones +
    ". Su lectura principal combina familias " + (familias || "sin familia declarada") +
    " y puede usarse como público accionable para " + canal + ".";
}

function renderAudienceDetailKpis_(audience) {
  return `
    <div class="pubUtmAudienceDetailKpi">
      <span>Miembros</span>
      <strong>${formatInteger_(audience.cantidad_miembros || 0)}</strong>
    </div>

    <div class="pubUtmAudienceDetailKpi">
      <span>Ventas</span>
      <strong>${formatInteger_(audience.ventas_asociadas || 0)}</strong>
    </div>

    <div class="pubUtmAudienceDetailKpi">
      <span>Clientes únicos</span>
      <strong>${formatInteger_(audience.clientes_unicos || 0)}</strong>
    </div>

    <div class="pubUtmAudienceDetailKpi">
      <span>Facturación</span>
      <strong>${formatMoneyAr_(audience.facturacion_asociada || 0)}</strong>
    </div>

    <div class="pubUtmAudienceDetailKpi">
      <span>Condiciones</span>
      <strong>${formatInteger_(audience.cantidad_condiciones || 0)}</strong>
    </div>
  `;
}

function renderAudienceDetailActions_(audience) {
  const canal = String(audience.canal_destino || "").toLowerCase();
  const familias = String(audience.familias_presentes || "").toLowerCase();
  const prioridad = String(audience.prioridad_visual || "").toLowerCase();

  const emailState = canal === "email" ? "is-recommended" : "";
  const experimentoState = canal.indexOf("exper") >= 0 || prioridad === "alta" ? "is-recommended" : "";
  const recompraState = familias.indexOf("comercial") >= 0 ? "is-available" : "";
  const crossSellState = familias.indexOf("comercial") >= 0 ? "is-available" : "";

  return `
    <div class="pubUtmAudienceDetailAction ${emailState}">
      <strong>Email</strong>
      <span>${emailState ? "Recomendado por canal destino." : "Disponible si se vincula a flujo de email."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction ${experimentoState}">
      <strong>Experimento</strong>
      <span>${experimentoState ? "Buen candidato para validación o prueba controlada." : "Puede probarse si necesita más señal."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction ${recompraState}">
      <strong>Recompra</strong>
      <span>${recompraState ? "Tiene señal comercial para evaluar recompra." : "Requiere más señal comercial."}</span>
    </div>

    <div class="pubUtmAudienceDetailAction ${crossSellState}">
      <strong>Cross sell</strong>
      <span>${crossSellState ? "Puede cruzarse con ofertas relacionadas." : "Conviene validar afinidad antes de usar."}</span>
    </div>
  `;
}

function renderAudienceDetailComposition_(audience) {
  const condiciones = Array.isArray(audience.condiciones) ? audience.condiciones : [];

  return `
    <div class="pubUtmAudienceDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Composición</div>
        <h3>Condiciones que forman la audiencia</h3>
      </div>
    </div>

    ${
      condiciones.length
        ? `<div class="pubUtmAudienceDetailConditionList">
            ${condiciones.map(function (c) {
              return `
                <div class="pubUtmAudienceDetailCondition">
                  <strong>${escapeHtml_(humanizeLabel_(c.campo_utm || "—"))}</strong>
                  <span>${escapeHtml_(humanizeLabel_(c.valor_utm || "—"))}</span>
                  <em>${escapeHtml_(c.campo_utm || "—")} = ${escapeHtml_(c.valor_utm || "—")}</em>
                </div>
              `;
            }).join("")}
          </div>`
        : `<p class="pubUtmPanelSlide__text">Esta audiencia no tiene condiciones visibles en el payload actual.</p>`
    }
  `;
}

function renderAudienceDetailMembers_(audience) {
  return `
    <div class="pubUtmAudienceDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Miembros</div>
        <h3>Resumen de miembros y ventas</h3>
      </div>
    </div>

    <div class="pubUtmAudienceDetailMiniGrid">
      <div class="pubUtmMiniStat">
        <span class="pubUtmMiniStat__label">Miembros</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(audience.cantidad_miembros || 0)}</strong>
      </div>

      <div class="pubUtmMiniStat">
        <span class="pubUtmMiniStat__label">Ventas asociadas</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(audience.ventas_asociadas || 0)}</strong>
      </div>

      <div class="pubUtmMiniStat">
        <span class="pubUtmMiniStat__label">Clientes únicos</span>
        <strong class="pubUtmMiniStat__value">${formatInteger_(audience.clientes_unicos || 0)}</strong>
      </div>
    </div>

    <p class="pubUtmPanelSlide__text" style="margin-top:14px;">
      Esta primera versión muestra el resumen operativo. La tabla profunda de miembros se conectará luego
      con un endpoint específico para no sobrecargar el dashboard principal.
    </p>
  `;
}

function renderAudienceDetailOrigin_(audience) {
  return `
    <div class="pubUtmAudienceDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Origen técnico</div>
        <h3>Por qué existe esta audiencia</h3>
      </div>
    </div>

    <div class="pubUtmAudienceDetailInfoGrid">
      <div><strong>Origen patrón:</strong><span>${escapeHtml_(audience.origen_patron_id || "—")}</span></div>
      <div><strong>Tipo audiencia:</strong><span>${escapeHtml_(audience.tipo_audiencia || "—")}</span></div>
      <div><strong>Tipo estructura:</strong><span>${escapeHtml_(audience.tipo_estructura || "—")}</span></div>
      <div><strong>Nivel operativo:</strong><span>${escapeHtml_(audience.nivel_operativo || "—")}</span></div>
      <div><strong>Bloque cerrado:</strong><span>${escapeHtml_(audience.bloque_cerrado || "—")}</span></div>
      <div><strong>Estado:</strong><span>${escapeHtml_(audience.estado_audiencia || "—")}</span></div>
      <div><strong>Fecha creación:</strong><span>${escapeHtml_(formatDateTimeAr_(audience.fecha_creacion) || "—")}</span></div>
      <div><strong>Última actualización:</strong><span>${escapeHtml_(formatDateTimeAr_(audience.fecha_actualizacion) || "—")}</span></div>
    </div>
  `;
}

function renderAudienceDetailRelations_(audience) {
  const all = getAudienceSetSourceList_();
  const audienciaId = String(audience.audiencia_id || "").trim();

  const derivadas = all.filter(function (a) {
    return String(a.es_derivada_de || "").trim() === audienciaId;
  });

  const conjuntos = ((STATE.conjuntosAudiencias && STATE.conjuntosAudiencias.conjuntos) || []).filter(function (c) {
    return (c.audiencias || []).some(function (item) {
      return String(item.audiencia_id || "").trim() === audienciaId;
    });
  });

  return `
    <div class="pubUtmAudienceDetailCard__head">
      <div>
        <div class="pubUtmCard__eyebrow">Relaciones</div>
        <h3>Mapa operativo de esta audiencia</h3>
      </div>
    </div>

    <div class="pubUtmAudienceDetailInfoGrid">
      <div><strong>Audiencia madre:</strong><span>${escapeHtml_(audience.es_derivada_de || "—")}</span></div>
      <div><strong>Derivadas detectadas:</strong><span>${formatInteger_(derivadas.length)}</span></div>
      <div><strong>Conjuntos donde aparece:</strong><span>${formatInteger_(conjuntos.length)}</span></div>
    </div>

    ${
      conjuntos.length
        ? `<div class="pubUtmAudienceDetailRelationList">
            ${conjuntos.map(function (c) {
              return `
                <div class="pubUtmAudienceDetailRelation">
                  <strong>${escapeHtml_(c.nombre_conjunto || c.conjunto_id || "Conjunto")}</strong>
                  <span>${escapeHtml_(c.conjunto_id || "—")} · ${escapeHtml_(c.estado_conjunto || "—")}</span>
                </div>
              `;
            }).join("")}
          </div>`
        : `<p class="pubUtmPanelSlide__text" style="margin-top:14px;">
            Esta audiencia todavía no aparece dentro de conjuntos personalizados.
          </p>`
    }
  `;
}
/* FIN · Lógica · Slide detalle de audiencia */

  /* INICIO · bindAudienceActionPlaceholders_ · Abrir detalle de audiencia */
function bindAudienceActionPlaceholders_(mount, audiencias) {
  const root = mount.closest(".pubUtmPage") || mount.closest('[data-page="publicidad-utm"]') || STATE.root;
  const byId = {};

  audiencias.forEach(function (a) {
    byId[a.audiencia_id] = a;
  });

  mount.querySelectorAll("[data-audience-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = btn.getAttribute("data-audience-id") || "";
      const action = btn.getAttribute("data-audience-action") || "";
      const item = byId[id];

      if (!item || !root) return;

      if (action === "conditions") {
        openAudienceDetailSlide_(root, item, "composition");
        return;
      }

      if (action === "members") {
        openAudienceDetailSlide_(root, item, "members");
        return;
      }

      if (action === "origin") {
        openAudienceDetailSlide_(root, item, "origin");
      }
    });
  });
}
/* FIN · bindAudienceActionPlaceholders_ · Abrir detalle de audiencia */

  function bindTabLogic_(root) {
    const tabs = Array.from(root.querySelectorAll("[data-tab-target], .pubUtmTab"));
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const target = getTabTarget_(tab);
        if (!target) return;

        STATE.activeTab = target;

/* INICIO · Chrome por tab activo */
syncPubUtmActiveTabChrome_(root, target);
/* FIN · Chrome por tab activo */

tabs.forEach(function (btn) {
  btn.classList.toggle("is-active", getTabTarget_(btn) === target);
});

        root.querySelectorAll("[data-tab-panel], .pubUtmTabPanel").forEach(function (panel) {
          const panelName = getPanelName_(panel);
          panel.classList.toggle("is-active", panelName === target);
        });
      });
    });
  }

  function bindAudienceFilters_(root) {
    const filters = Array.from(root.querySelectorAll(".pubUtmFilter[data-audience-type]"));
    if (!filters.length) return;

    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const type = String(btn.getAttribute("data-audience-type") || "todas").toLowerCase();
        STATE.activeFilter = type;

        filters.forEach(function (f) {
          f.classList.toggle("is-active", f === btn);
        });

        applyAudienceFilter_(root, type);
      });
    });
  }

  function applyAudienceFilter_(root, type) {
    const audienceCards = Array.from(root.querySelectorAll("[data-audience-card]"));
    if (!audienceCards.length) return;

    audienceCards.forEach(function (card) {
      const cardType = String(card.getAttribute("data-audience-type") || "").toLowerCase();
      const visible = (type === "todas") || (cardType === type);
      card.style.display = visible ? "" : "none";
    });
  }

  function bindSlideLogic_(root) {
    if (root.dataset.pubutmSetSlideBound === "1") return;
    root.dataset.pubutmSetSlideBound = "1";

    root.addEventListener("click", function (ev) {
      const opener = ev.target.closest("[data-open-create-set]");
      if (!opener || !root.contains(opener)) return;

      ev.preventDefault();

      const sourceAudienceId = opener.getAttribute("data-source-audience-id") || "";
      openAudienceSetCreator_(root, sourceAudienceId);
    });
  }

 /* INICIO · renderLoadingState_ · Skeletons premium */
function renderLoadingState_(root) {
  if (root) {
    root.classList.add("is-loading");
    root.classList.remove("is-ready");
  }

  setKpiValue_(root, "audiencias_activas", "—");
  setKpiValue_(root, "audiencias_atomicas", "—");
  setKpiValue_(root, "audiencias_compuestas", "—");
  setKpiValue_(root, "conjuntos_personalizados", "—");
  setKpiValue_(root, "miembros_totales", "—");
  setKpiValue_(root, "ultima_actualizacion", "—");
  setKpiValue_(root, "estado_motor", "—");
}
/* FIN · renderLoadingState_ · Skeletons premium */

  function renderFatalState_(root, message) {
    const audMount = root.querySelector('[data-pubutm-audiences-list]');
    if (audMount) {
      audMount.innerHTML = `
        <article class="pubUtmCard pubUtmCard--full">
          <div class="pubUtmEmptyState">
            <h2>No se pudo cargar Publicidad UTM</h2>
            <p>${escapeHtml_(message)}</p>
          </div>
        </article>
      `;
    }

    const controlBody = root.querySelector("[data-pubutm-control-body]");
    if (controlBody) {
      controlBody.innerHTML = `
        <tr>
          <td colspan="7">${escapeHtml_(message)}</td>
        </tr>
      `;
    }

    const fieldsBody = root.querySelector("[data-pubutm-fields-body]");
    if (fieldsBody) {
      fieldsBody.innerHTML = `
        <tr>
          <td colspan="19">${escapeHtml_(message)}</td>
        </tr>
      `;
    }
  }

  function renderMeta_(root, payload) {
    const nodes = root.querySelectorAll("[data-pubutm-build]");
    nodes.forEach(function (node) {
      node.textContent = payload.build || PUB_UTM_FRONT_BUILD;
    });

    const generatedNodes = root.querySelectorAll("[data-pubutm-generated-at]");
    generatedNodes.forEach(function (node) {
      node.textContent = formatDateTimeAr_(payload.generated_at);
    });
  }

  function setKpiValue_(root, key, value) {
    const nodes = root.querySelectorAll('[data-kpi="' + key + '"]');
    nodes.forEach(function (node) {
      node.textContent = normalizeKpiValue_(key, value);
    });
  }

  function normalizeKpiValue_(key, value) {
    if (key === "ultima_actualizacion") return value || "—";
    if (typeof value === "number") return formatInteger_(value);
    return String(value == null ? "—" : value);
  }

  function setText_(root, selector, value) {
    const node = root.querySelector(selector);
    if (!node) return;
    node.textContent = value == null ? "—" : String(value);
  }

  function buildDefaultsSummary_(defaults) {
    if (!defaults) return "—";

    return [
      "activo=" + (defaults.activo || "no"),
      "audiencia=" + (defaults.participa_en_audiencia || "no"),
      "autoaudiencia=" + (defaults.permite_autoaudiencia || "no"),
      "revisión=" + (defaults.requiere_revision_manual || "sí"),
      "tipo=" + (defaults.tipo_campo || "texto")
    ].join(" · ");
  }

  function renderSiNoPill_(value, isLocked) {
    const yes = String(value || "").toLowerCase() === "sí";
    const label = yes ? "Sí" : "No";
    const stateClass = yes ? "pubUtmBadge--on" : "pubUtmBadge--off";
    const lockText = isLocked ? ' title="Bloqueado por dependencia"' : "";

    return `<span class="pubUtmBadge ${stateClass}"${lockText}>${label}</span>`;
  }

  function buildConditionsAlertText_(item) {
    const parts = Array.isArray(item.condiciones) ? item.condiciones : [];
    if (!parts.length) {
      return "La audiencia no tiene condiciones visibles.";
    }

    const lines = parts.map(function (c) {
      return "- " + humanizeLabel_(c.campo_utm || "") + ": " + humanizeLabel_(c.valor_utm || "");
    });

    return "Condiciones de la audiencia:\n\n" + lines.join("\n");
  }

  function getTabTarget_(tab) {
    return (
      tab.getAttribute("data-tab-target") ||
      tab.getAttribute("data-tab") ||
      ""
    ).trim().toLowerCase();
  }

  function getPanelName_(panel) {
    return (
      panel.getAttribute("data-tab-panel") ||
      panel.getAttribute("data-panel") ||
      ""
    ).trim().toLowerCase();
  }

  function findTabPanel_(root, name) {
    return Array.from(root.querySelectorAll("[data-tab-panel], .pubUtmTabPanel")).find(function (panel) {
      return getPanelName_(panel) === String(name || "").toLowerCase();
    }) || null;
  }
/* =========================================================
   INICIO · Publicidad UTM · Chrome por tab activo
   Oculta o muestra bloques superiores según pestaña activa.
   ========================================================= */

   function syncPubUtmActiveTabChrome_(root, tabName) {
    if (!root) return;
  
    const active = String(tabName || STATE.activeTab || "audiencias")
      .trim()
      .toLowerCase();
  
    root.setAttribute("data-pubutm-active-tab", active);
  }
  
  /* =========================================================
     FIN · Publicidad UTM · Chrome por tab activo
     ========================================================= */
  function formatMoneyAr_(value) {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
      }).format(n);
    } catch (err) {
      return "$" + n.toFixed(2);
    }
  }

  function formatInteger_(value) {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 0
      }).format(n);
    } catch (err) {
      return String(n);
    }
  }

  function formatPercent_(value) {
    const n = Number(value || 0);
    return formatInteger_(n) + "%";
  }

  function formatDateTimeAr_(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);

    try {
      return new Intl.DateTimeFormat("es-AR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch (err) {
      return String(iso);
    }
  }

  function humanizeLabel_(value) {
    return String(value || "")
      .replace(/^utm_/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();