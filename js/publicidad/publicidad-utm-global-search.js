(function () {
  "use strict";

  const BUILD = "PUB_UTM_GLOBAL_SEARCH_2026_07_16";
  let requestId = 0;

  document.addEventListener("DOMContentLoaded", initGlobalSearch_);
  document.addEventListener("sazzu:page:load", initGlobalSearch_);

  window.setTimeout(initGlobalSearch_, 100);
  window.setTimeout(initGlobalSearch_, 500);

  function initGlobalSearch_() {
    const root =
      document.querySelector("#pubUtmPage") ||
      document.querySelector(".pubUtmPage") ||
      document.querySelector('[data-page="publicidad-utm"]');

    if (!root) return;
    if (root.querySelector("[data-pubutm-global-search]")) return;

    const actions = root.querySelector(
      ".pubUtmHeaderPremium__actions, .pubUtmHeader__actions"
    );

    if (!actions) return;

    const mount = document.createElement("div");
    mount.className = "pubUtmGlobalSearch";
    mount.setAttribute("data-pubutm-global-search", "1");
    mount.setAttribute("data-build", BUILD);

    mount.innerHTML = `
      <form class="pubUtmGlobalSearch__form" data-pubutm-global-search-form>
        <div class="pubUtmGlobalSearch__field">
          <span class="pubUtmGlobalSearch__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="10.5"
                cy="10.5"
                r="6.5"
                stroke="currentColor"
                stroke-width="1.8"
              ></circle>
              <path
                d="M15.5 15.5L20 20"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              ></path>
            </svg>
          </span>

          <input
            class="pubUtmGlobalSearch__input"
            type="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Buscar usuario, pedido, audiencia o conjunto..."
            aria-label="Buscar en Publicidad UTM"
            data-pubutm-global-search-input
          />

          <button
            class="pubUtmGlobalSearch__clear"
            type="button"
            aria-label="Limpiar búsqueda"
            title="Limpiar"
            hidden
            data-pubutm-global-search-clear
          >
            ×
          </button>
        </div>

        <button
          class="pubUtmGlobalSearch__submit"
          type="submit"
          data-pubutm-global-search-submit
        >
          Buscar
        </button>
      </form>

      <div
        class="pubUtmGlobalSearch__results"
        role="region"
        aria-live="polite"
        hidden
        data-pubutm-global-search-results
      ></div>
    `;

    actions.appendChild(mount);
    bindGlobalSearchEvents_(root, mount);

    window.__PUB_UTM_GLOBAL_SEARCH__ = {
      build: BUILD,
      search: function (value) {
        const input = mount.querySelector(
          "[data-pubutm-global-search-input]"
        );

        if (input) input.value = String(value || "");
        return runGlobalSearch_(root, mount);
      }
    };
  }

  function bindGlobalSearchEvents_(root, mount) {
    const form = mount.querySelector("[data-pubutm-global-search-form]");
    const input = mount.querySelector("[data-pubutm-global-search-input]");
    const clear = mount.querySelector("[data-pubutm-global-search-clear]");
    const results = mount.querySelector("[data-pubutm-global-search-results]");

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        runGlobalSearch_(root, mount);
      });
    }

    if (input) {
      input.addEventListener("input", function () {
        const hasValue = String(input.value || "").trim().length > 0;

        if (clear) clear.hidden = !hasValue;

        if (!hasValue && results) {
          results.hidden = true;
          results.innerHTML = "";
        }
      });

      input.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeGlobalSearch_(mount);
        }
      });
    }

    if (clear) {
      clear.addEventListener("click", function () {
        if (input) {
          input.value = "";
          input.focus();
        }

        clear.hidden = true;
        closeGlobalSearch_(mount);
      });
    }

    document.addEventListener("click", function (event) {
      if (mount.contains(event.target)) return;
      closeGlobalSearch_(mount);
    });
  }

  async function runGlobalSearch_(root, mount) {
    const input = mount.querySelector("[data-pubutm-global-search-input]");
    const submit = mount.querySelector("[data-pubutm-global-search-submit]");
    const results = mount.querySelector("[data-pubutm-global-search-results]");
    const query = String(input && input.value ? input.value : "").trim();

    if (!results) return null;

    if (query.length < 2) {
      results.hidden = false;
      results.innerHTML = renderGlobalSearchMessage_(
        "Escribí al menos 2 caracteres",
        "Podés buscar por nombre, email, pedido, ID, audiencia o conjunto."
      );
      return null;
    }

    const currentRequest = ++requestId;

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Buscando...";
    }

    results.hidden = false;
    results.innerHTML = renderGlobalSearchMessage_(
      "Buscando en Publicidad UTM",
      "Consultando usuarios, compras, audiencias y conjuntos."
    );

    try {
      const payload = await requestGlobalSearch_(query);

      if (currentRequest !== requestId) return null;

      if (!payload || payload.ok !== true) {
        throw new Error(
          payload && payload.error
            ? payload.error
            : "La búsqueda global no devolvió ok=true."
        );
      }

      renderGlobalSearchResults_(root, mount, payload);
      return payload;
    } catch (error) {
      if (currentRequest !== requestId) return null;

      results.hidden = false;
      results.innerHTML = renderGlobalSearchMessage_(
        "No se pudo completar la búsqueda",
        String(error && error.message ? error.message : error)
      );

      console.error("[Publicidad UTM] Buscador global:", error);
      return null;
    } finally {
      if (currentRequest === requestId && submit) {
        submit.disabled = false;
        submit.textContent = "Buscar";
      }
    }
  }

  function requestGlobalSearch_(query) {
    const config = resolveSupabaseConfig_();

    if (!config.ok) {
      return Promise.reject(new Error(config.error));
    }

    return fetch(
      config.url + "/rest/v1/rpc/rpc_panel_utm_buscar_global",
      {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: "Bearer " + config.key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_busqueda: query,
          p_limit: 20
        })
      }
    ).then(async function (response) {
      let payload = null;

      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload && (payload.message || payload.error || payload.hint)
            ? payload.message || payload.error || payload.hint
            : "Supabase respondió HTTP " + response.status + ".";

        throw new Error(message);
      }

      return payload;
    });
  }

  function resolveSupabaseConfig_() {
    const raw = window.SAZZU_SUPABASE_CONFIG || {};

    const url = String(
      raw.url ||
      raw.supabaseUrl ||
      raw.supabase_url ||
      ""
    ).replace(/\/+$/, "");

    const key = String(
      raw.anonKey ||
      raw.anon_key ||
      raw.publicAnonKey ||
      raw.key ||
      ""
    ).trim();

    if (!url) {
      return {
        ok: false,
        error: "No existe window.SAZZU_SUPABASE_CONFIG.url."
      };
    }

    if (!key) {
      return {
        ok: false,
        error: "No encontré la clave pública de Supabase."
      };
    }

    return {
      ok: true,
      url: url,
      key: key
    };
  }

  function renderGlobalSearchResults_(root, mount, payload) {
    const results = mount.querySelector("[data-pubutm-global-search-results]");
    if (!results) return;

    const usuarios = Array.isArray(payload.usuarios)
      ? payload.usuarios
      : [];

    const audiencias = Array.isArray(payload.audiencias)
      ? payload.audiencias
      : [];

    const conjuntos = Array.isArray(payload.conjuntos)
      ? payload.conjuntos
      : [];

    const summary = payload.summary || {};
    const total = Number(
      summary.resultados_total ||
      usuarios.length + audiencias.length + conjuntos.length
    );

    if (!total) {
      results.hidden = false;
      results.innerHTML = renderGlobalSearchMessage_(
        "No encontramos coincidencias",
        "Probá con otro nombre, email, pedido, ID o código."
      );
      return;
    }

    results.hidden = false;
    results.innerHTML = `
      <div class="pubUtmGlobalSearch__head">
        <strong>Resultados de búsqueda</strong>
        <span>${formatInteger_(total)} coincidencias</span>
      </div>

      ${renderUsersSection_(usuarios)}
      ${renderAudiencesSection_(audiencias)}
      ${renderSetsSection_(conjuntos)}
    `;

    bindResultActions_(root, mount);
  }

  function renderUsersSection_(items) {
    if (!items.length) return "";

    return `
      <section class="pubUtmGlobalSearch__section">
        <div class="pubUtmGlobalSearch__sectionTitle">
          <span>Usuarios</span>
          <span>${formatInteger_(items.length)}</span>
        </div>

        <div class="pubUtmGlobalSearch__list">
          ${items.map(renderUserResult_).join("")}
        </div>
      </section>
    `;
  }

  function renderUserResult_(user) {
    const orders = Array.isArray(user.pedidos) ? user.pedidos : [];
    const audiences = Array.isArray(user.audiencias)
      ? user.audiencias
      : [];
    const sets = Array.isArray(user.conjuntos)
      ? user.conjuntos
      : [];

    const order = orders[0] || {};
    const name = String(user.nombre || user.email || "Cliente");
    const email = String(user.email || "");
    const initial = getInitial_(name || email);
    const hue = stableHue_(email || name || user.usuario_id);

    return `
      <article class="pubUtmGlobalSearchUser">
        <div class="pubUtmGlobalSearchUser__top">
          <span
            class="pubUtmGlobalSearchAvatar"
            style="--pubutm-search-avatar-hue:${hue}"
            aria-hidden="true"
          >
            ${escapeHtml_(initial)}
          </span>

          <div class="pubUtmGlobalSearchUser__identity">
            <strong>${escapeHtml_(name)}</strong>
            <span>${escapeHtml_(email || user.usuario_id || "Sin email")}</span>
          </div>

          <div class="pubUtmGlobalSearchUser__order">
            <strong>${escapeHtml_(
              order.shopify_order_name ||
              order.shopify_order_number ||
              "Sin pedido"
            )}</strong>

            <span>${formatMoneyAr_(
              order.monto_total || user.facturacion_total || 0
            )}</span>
          </div>
        </div>

        <div class="pubUtmGlobalSearchUser__metrics">
          <span class="pubUtmGlobalSearchChip">
            ${formatInteger_(user.compras_count || orders.length)} compras
          </span>

          <span class="pubUtmGlobalSearchChip pubUtmGlobalSearchChip--blue">
            ${formatInteger_(audiences.length)} audiencias
          </span>

          <span class="pubUtmGlobalSearchChip pubUtmGlobalSearchChip--green">
            ${formatInteger_(sets.length)} conjuntos
          </span>

          <span class="pubUtmGlobalSearchChip ${
            String(order.utm_processing_status || "").toLowerCase() === "processed"
              ? "pubUtmGlobalSearchChip--green"
              : "pubUtmGlobalSearchChip--warning"
          }">
            UTM ${escapeHtml_(
              humanize_(
                order.utm_processing_status ||
                "sin procesar"
              )
            )}
          </span>
        </div>

        ${
          audiences.length || sets.length
            ? `
              <div class="pubUtmGlobalSearchRelations">
                ${audiences.map(renderUserAudienceRelation_).join("")}
                ${sets.map(renderUserSetRelation_).join("")}
              </div>
            `
            : `
              <div class="pubUtmGlobalSearchRelations">
                <div class="pubUtmGlobalSearchRelation">
                  <div class="pubUtmGlobalSearchRelation__copy">
                    <strong>No pertenece a una audiencia o conjunto</strong>
                    <span>La compra existe, pero no tiene membresías activas.</span>
                  </div>
                </div>
              </div>
            `
        }
      </article>
    `;
  }

  function renderUserAudienceRelation_(audience) {
    return `
      <div class="pubUtmGlobalSearchRelation">
        <div class="pubUtmGlobalSearchRelation__copy">
          <strong>${escapeHtml_(
            audience.nombre_audiencia ||
            audience.codigo_audiencia ||
            "Audiencia"
          )}</strong>

          <span>${escapeHtml_(
            audience.codigo_audiencia ||
            audience.audiencia_id ||
            "—"
          )} · ${escapeHtml_(
            audience.condiciones_texto ||
            "Sin condiciones visibles"
          )}</span>
        </div>

        <button
          class="pubUtmGlobalSearchLocate"
          type="button"
          data-pubutm-locate-audience="${escapeAttribute_(
            audience.audiencia_id || ""
          )}"
          data-pubutm-locate-audience-code="${escapeAttribute_(
            audience.codigo_audiencia || ""
          )}"
        >
          Ubicar
        </button>
      </div>
    `;
  }

  function renderUserSetRelation_(set) {
    return `
      <div class="pubUtmGlobalSearchRelation">
        <div class="pubUtmGlobalSearchRelation__copy">
          <strong>${escapeHtml_(
            set.nombre_conjunto ||
            set.codigo_conjunto ||
            "Conjunto"
          )}</strong>

          <span>${escapeHtml_(
            set.codigo_conjunto ||
            set.conjunto_id ||
            "—"
          )}</span>
        </div>

        <button
          class="pubUtmGlobalSearchLocate"
          type="button"
          data-pubutm-locate-set="${escapeAttribute_(
            set.conjunto_id || ""
          )}"
          data-pubutm-locate-set-code="${escapeAttribute_(
            set.codigo_conjunto || ""
          )}"
        >
          Ubicar
        </button>
      </div>
    `;
  }

  function renderAudiencesSection_(items) {
    if (!items.length) return "";

    return `
      <section class="pubUtmGlobalSearch__section">
        <div class="pubUtmGlobalSearch__sectionTitle">
          <span>Audiencias automáticas</span>
          <span>${formatInteger_(items.length)}</span>
        </div>

        <div class="pubUtmGlobalSearch__list">
          ${items.map(function (audience) {
            return `
              <article class="pubUtmGlobalSearchEntity">
                <div class="pubUtmGlobalSearchEntity__copy">
                  <strong>${escapeHtml_(
                    audience.nombre_audiencia ||
                    audience.codigo_audiencia ||
                    "Audiencia"
                  )}</strong>

                  <span>
                    ${escapeHtml_(
                      audience.codigo_audiencia ||
                      audience.audiencia_id ||
                      "—"
                    )}
                    · ${formatInteger_(
                      audience.miembros_actuales_count || 0
                    )} miembros
                    · ${escapeHtml_(
                      audience.condiciones_texto ||
                      "Sin condiciones visibles"
                    )}
                  </span>
                </div>

                <button
                  class="pubUtmGlobalSearchLocate"
                  type="button"
                  data-pubutm-locate-audience="${escapeAttribute_(
                    audience.audiencia_id || ""
                  )}"
                  data-pubutm-locate-audience-code="${escapeAttribute_(
                    audience.codigo_audiencia || ""
                  )}"
                >
                  Ubicar
                </button>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderSetsSection_(items) {
    if (!items.length) return "";

    return `
      <section class="pubUtmGlobalSearch__section">
        <div class="pubUtmGlobalSearch__sectionTitle">
          <span>Conjuntos</span>
          <span>${formatInteger_(items.length)}</span>
        </div>

        <div class="pubUtmGlobalSearch__list">
          ${items.map(function (set) {
            return `
              <article class="pubUtmGlobalSearchEntity">
                <div class="pubUtmGlobalSearchEntity__copy">
                  <strong>${escapeHtml_(
                    set.nombre_conjunto ||
                    set.codigo_conjunto ||
                    "Conjunto"
                  )}</strong>

                  <span>
                    ${escapeHtml_(
                      set.codigo_conjunto ||
                      set.conjunto_id ||
                      "—"
                    )}
                    · ${formatInteger_(set.audiencias_count || 0)} audiencias
                    · ${formatInteger_(
                      set.miembros_actuales_count || 0
                    )} miembros
                  </span>
                </div>

                <button
                  class="pubUtmGlobalSearchLocate"
                  type="button"
                  data-pubutm-locate-set="${escapeAttribute_(
                    set.conjunto_id || ""
                  )}"
                  data-pubutm-locate-set-code="${escapeAttribute_(
                    set.codigo_conjunto || ""
                  )}"
                >
                  Ubicar
                </button>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function bindResultActions_(root, mount) {
    mount.querySelectorAll("[data-pubutm-locate-audience]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          locateAudience_(
            root,
            mount,
            button.getAttribute("data-pubutm-locate-audience") || "",
            button.getAttribute("data-pubutm-locate-audience-code") || ""
          );
        });
      });

    mount.querySelectorAll("[data-pubutm-locate-set]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          locateSet_(
            root,
            button.getAttribute("data-pubutm-locate-set") || "",
            button.getAttribute("data-pubutm-locate-set-code") || ""
          );
        });
      });
  }

  function locateAudience_(root, mount, id, code) {
    const targetId = String(id || code || "").trim();

    if (!targetId) return;

    closeGlobalSearch_(mount);

    const openDetail =
      window.__PUB_UTM_OPEN_AUDIENCE_DETAIL__;

    if (typeof openDetail === "function") {
      openDetail(targetId, "members");
      return;
    }

    activateAudiencesTab_(root);
    locateAudienceCardWithRetry_(root, id, code, 0);
  }

  function locateAudienceCardWithRetry_(
    root,
    id,
    code,
    attempt
  ) {
    const nodes = Array.from(
      root.querySelectorAll(
        '[data-audience-card="1"][data-audience-id]'
      )
    );

    const target = nodes.find(function (node) {
      const nodeId = String(
        node.getAttribute("data-audience-id") || ""
      );

      return nodeId === id || nodeId === code;
    });

    if (target) {
      highlightResultTarget_(target);

      const membersButton = target.querySelector(
        '[data-audience-action="members"]'
      );

      if (
        membersButton &&
        typeof membersButton.click === "function"
      ) {
        window.setTimeout(function () {
          membersButton.click();
        }, 260);
      }

      return;
    }

    if (attempt >= 15) {
      console.warn(
        "[Publicidad UTM] No se pudo ubicar la audiencia:",
        id || code
      );
      return;
    }

    window.setTimeout(function () {
      locateAudienceCardWithRetry_(
        root,
        id,
        code,
        attempt + 1
      );
    }, 120);
  }

  function locateSet_(root, id, code) {
    activateAudiencesTab_(root);

    window.setTimeout(function () {
      const selectors = [
        "[data-conjunto-id]",
        "[data-set-id]",
        "[data-audience-set-id]"
      ];

      const nodes = Array.from(
        root.querySelectorAll(selectors.join(","))
      );

      const target = nodes.find(function (node) {
        const values = [
          node.getAttribute("data-conjunto-id"),
          node.getAttribute("data-set-id"),
          node.getAttribute("data-audience-set-id")
        ].map(function (value) {
          return String(value || "");
        });

        return values.indexOf(id) !== -1 || values.indexOf(code) !== -1;
      });

      highlightResultTarget_(target);
    }, 80);
  }

  function activateAudiencesTab_(root) {
    const tab = root.querySelector(
      '[data-tab-target="audiencias"], [data-pubutm-tab="audiencias"]'
    );

    if (tab && typeof tab.click === "function") {
      tab.click();
    }
  }

  function highlightResultTarget_(node) {
    if (!node) return;

    const target =
      node.closest("article") ||
      node.closest(".pubUtmAudienceSetCardV2") ||
      node;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    target.classList.add("pubUtmGlobalSearchHighlight");

    window.setTimeout(function () {
      target.classList.remove("pubUtmGlobalSearchHighlight");
    }, 2200);
  }

  function closeGlobalSearch_(mount) {
    const results = mount.querySelector(
      "[data-pubutm-global-search-results]"
    );

    if (results) results.hidden = true;
  }

  function renderGlobalSearchMessage_(title, message) {
    return `
      <div class="pubUtmGlobalSearchEmpty">
        <strong>${escapeHtml_(title)}</strong>
        <p>${escapeHtml_(message)}</p>
      </div>
    `;
  }

  function getInitial_(value) {
    const clean = String(value || "").trim();
    return clean ? clean.charAt(0).toUpperCase() : "?";
  }

  function stableHue_(value) {
    const text = String(value || "usuario");
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash) % 360;
  }

  function humanize_(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatInteger_(value) {
    return new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function formatMoneyAr_(value) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function escapeHtml_(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute_(value) {
    return escapeHtml_(value);
  }
})();
