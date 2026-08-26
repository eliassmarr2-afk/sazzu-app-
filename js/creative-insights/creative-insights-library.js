(() => {
  "use strict";

  let requestSeq = 0;
  let playbackSeq = 0;

  let assets = [];
  let currentFilter = "all";
  let searchTerm = "";

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

  function isLibrary() {
    return String(location.hash || "")
      .replace(/^#/, "")
      .trim()
      .toLowerCase() === "biblioteca";
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

  function formatBytes(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    if (number < 1024 * 1024) {
      return `${
        (number / 1024).toFixed(1)
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

  function formatDuration(value) {
    const seconds = Number(value);

    if (!Number.isFinite(seconds)) {
      return "—";
    }

    return `${seconds.toFixed(1)} s`;
  }

  function shortId(value) {
    const id = clean(value);

    return id
      ? id.slice(0, 8)
      : "—";
  }

  function mediaKind(item) {
    const mime =
      clean(
        item?.source?.mime_type
      ).toLowerCase();

    if (mime.startsWith("video/")) {
      return "video";
    }

    if (mime.startsWith("image/")) {
      return "image";
    }

    return "other";
  }

  function aspectLabel(item) {
    const width =
      Number(
        item?.source?.width
      );

    const height =
      Number(
        item?.source?.height
      );

    if (!width || !height) {
      return "—";
    }

    if (height > width) {
      return "Vertical";
    }

    if (width > height) {
      return "Horizontal";
    }

    return "Cuadrado";
  }

  function pill(
    label,
    tone = "gray"
  ) {
    return `
      <span
        class="
          ciLibraryPill
          is-${escapeHtml(tone)}
        "
      >
        ${escapeHtml(label)}
      </span>
    `;
  }

  function visibleAssets() {
    const query =
      searchTerm
        .trim()
        .toLowerCase();

    return assets.filter(
      (item) => {
        const kind =
          mediaKind(item);

        if (
          currentFilter !== "all" &&
          currentFilter !== kind
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          item?.creative_asset_id,
          item?.creator?.display_name,
          item?.creator?.email,
          item?.source?.concept_label,
          item?.source?.original_filename,
          item?.source?.version_number,
          item?.purchase?.purchase_id,
          item?.purchase?.total_amount,
          item?.rights?.status
        ]
          .map(
            (value) =>
              clean(value).toLowerCase()
          )
          .join(" ");

        return haystack.includes(
          query
        );
      }
    );
  }

  function filterButton(
    value,
    label
  ) {
    const active =
      currentFilter === value;

    return `
      <button
        type="button"
        class="
          ciLibraryFilter
          ${active ? "is-active" : ""}
        "
        data-ci-library-filter="${escapeHtml(
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

  function metricsMarkup() {
    const videos =
      assets.filter(
        (item) =>
          mediaKind(item) === "video"
      ).length;

    const activeRights =
      assets.filter(
        (item) =>
          clean(
            item?.rights?.status
          ).toLowerCase() === "active"
      ).length;

    const investment =
      assets.reduce(
        (sum, item) =>
          sum +
          (
            Number(
              item?.purchase?.total_amount
            ) || 0
          ),
        0
      );

    return `
      <div
        class="ciLibraryMetrics"
      >
        <article
          class="ciLibraryMetric"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            video_library
          </span>

          <strong>
            ${assets.length}
          </strong>

          <span>
            Assets adquiridos
          </span>
        </article>

        <article
          class="ciLibraryMetric"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            movie
          </span>

          <strong>
            ${videos}
          </strong>

          <span>
            Videos
          </span>
        </article>

        <article
          class="ciLibraryMetric"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            verified_user
          </span>

          <strong>
            ${activeRights}
          </strong>

          <span>
            Rights activos
          </span>
        </article>

        <article
          class="ciLibraryMetric"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            payments
          </span>

          <strong>
            ${escapeHtml(
              formatMoney(
                investment,
                "ARS"
              )
            )}
          </strong>

          <span>
            Inversión adquirida
          </span>
        </article>
      </div>
    `;
  }

  function assetCard(item) {
    const kind =
      mediaKind(item);

    const source =
      item?.source || {};

    const purchase =
      item?.purchase || {};

    const creator =
      item?.creator || {};

    const rights =
      item?.rights || {};

    return `
      <article
        class="ciLibraryCard"
      >
        <button
          type="button"
          class="ciLibraryCard__preview"
          data-ci-library-asset="${escapeHtml(
            item?.creative_asset_id
          )}"
          aria-label="Abrir activo"
        >
          <div
            class="ciLibraryCard__mediaIcon"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              ${
                kind === "image"
                  ? "image"
                  : "play_circle"
              }
            </span>
          </div>

          <div
            class="ciLibraryCard__previewMeta"
          >
            <span>
              ${escapeHtml(
                aspectLabel(item)
              )}
            </span>

            <span>
              ${
                source?.width &&
                source?.height
                  ? `${escapeHtml(
                      source.width
                    )} × ${escapeHtml(
                      source.height
                    )}`
                  : ""
              }
            </span>
          </div>
        </button>

        <div
          class="ciLibraryCard__body"
        >
          <div
            class="ciLibraryCard__pills"
          >
            ${pill(
              "Disponible",
              "green"
            )}

            ${
              clean(
                rights?.status
              ).toLowerCase() === "active"
                ? pill(
                    "Rights activos",
                    "green"
                  )
                : pill(
                    rights?.status ||
                    "Rights",
                    "violet"
                  )
            }
          </div>

          <h3>
            ${escapeHtml(
              source?.concept_label ||
              "Activo creativo"
            )}
          </h3>

          <p>
            ${escapeHtml(
              creator?.display_name ||
              "Creator"
            )}
            · V${escapeHtml(
              source?.version_number ||
              "—"
            )}
          </p>

          <div
            class="ciLibraryCard__footer"
          >
            <span>
              ${escapeHtml(
                formatMoney(
                  purchase?.total_amount,
                  purchase?.currency
                )
              )}
            </span>

            ${libraryAssetActionMarkup(
              item
            )}
          </div>
        </div>
      </article>
    `;
  }

  /* PCI 2.1U.3 · LIBRARY ASSET AVAILABILITY GATE */

  function libraryAssetStatus(
    item
  ) {
    return clean(
      item?.status ||
      item?.asset_status ||
      item?.asset?.status
    ).toLowerCase();
  }

  function libraryAssetActionMarkup(
    item
  ) {
    const status =
      libraryAssetStatus(
        item
      );

    const id =
      escapeHtml(
        item?.creative_asset_id
      );

    if (status === "available") {
      return `
        <button
          type="button"
          class="ciLibraryAssetAction"
          data-ci-library-asset="${id}"
        >
          Abrir
        </button>
      `;
    }

    if (status === "provisioning") {
      return `
        <button
          type="button"
          class="
            ciLibraryAssetAction
            is-processing
          "
          disabled
          aria-disabled="true"
          title="El archivo adquirido se está preparando"
        >
          Procesando
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="
          ciLibraryAssetAction
          is-unavailable
        "
        disabled
        aria-disabled="true"
      >
        No disponible
      </button>
    `;
  }

  function libraryAssetBlockedMarkup(
    item
  ) {
    const status =
      libraryAssetStatus(
        item
      );

    if (status === "provisioning") {
      return `
        <div
          class="ciLibraryPlaybackLoading"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            progress_activity
          </span>

          <div>
            <strong>
              Procesando activo
            </strong>

            <span>
              El archivo adquirido se está
              preparando.
            </span>
          </div>
        </div>
      `;
    }

    return `
      <div
        class="ciLibraryPlaybackError"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          error
        </span>

        <strong>
          Asset no disponible
        </strong>

        <span>
          Este activo todavía no está
          disponible para playback.
        </span>

        <button
          type="button"
          data-ci-library-close
        >
          Cerrar
        </button>
      </div>
    `;
  }

  function cardsMarkup() {
    const items =
      visibleAssets();

    if (!items.length) {
      return `
        <div
          class="ciLibraryEmpty"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            search_off
          </span>

          <strong>
            Sin assets
          </strong>

          <span>
            No hay resultados para
            este filtro.
          </span>
        </div>
      `;
    }

    return items
      .map(assetCard)
      .join("");
  }

  function shellMarkup() {
    return `
      <section
        class="ciLibraryView"
        aria-label="Biblioteca"
      >
        <div
          class="ciLibraryToolbar"
        >
          <label
            class="ciLibrarySearch"
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
              placeholder="Buscar asset, Creator o concepto"
              value="${escapeHtml(
                searchTerm
              )}"
              data-ci-library-search
            />
          </label>

          <button
            type="button"
            class="ciLibraryRefresh"
            data-ci-library-refresh
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
          class="ciLibraryFilters"
        >
          ${filterButton(
            "all",
            "Todos"
          )}

          ${filterButton(
            "video",
            "Videos"
          )}

          ${filterButton(
            "image",
            "Imágenes"
          )}
        </div>

        ${metricsMarkup()}

        <header
          class="ciLibrarySectionHeader"
        >
          <div>
            <h2>
              Activos
            </h2>

            <p>
              Archivos adquiridos con
              Rights activos.
            </p>
          </div>

          <span
            data-ci-library-count
          >
            ${visibleAssets().length}
            de
            ${assets.length}
          </span>
        </header>

        <div
          class="ciLibraryGrid"
          data-ci-library-grid
        >
          ${cardsMarkup()}
        </div>
      </section>
    `;
  }

  function updateGrid() {
    const grid =
      document.querySelector(
        "[data-ci-library-grid]"
      );

    if (grid) {
      grid.innerHTML =
        cardsMarkup();
    }

    const count =
      document.querySelector(
        "[data-ci-library-count]"
      );

    if (count) {
      count.textContent =
        `${visibleAssets().length} de ${assets.length}`;
    }
  }

  function detailField(
    label,
    value
  ) {
    return `
      <div
        class="ciLibraryDetailField"
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

  function ensureAssetDialog() {
    let dialog =
      document.querySelector(
        "[data-ci-library-dialog]"
      );

    if (dialog) {
      return dialog;
    }

    dialog =
      document.createElement(
        "dialog"
      );

    dialog.className =
      "ciLibraryDialog";

    dialog.setAttribute(
      "data-ci-library-dialog",
      ""
    );

    dialog.innerHTML = `
      <div
        class="ciLibraryDialog__surface"
      >
        <header
          class="ciLibraryDialog__header"
        >
          <div>
            <span>
              Biblioteca
            </span>

            <h2>
              Activo adquirido
            </h2>
          </div>

          <button
            type="button"
            data-ci-library-close
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
          data-ci-library-dialog-content
        ></div>
      </div>
    `;

    document.body.appendChild(
      dialog
    );

    dialog.addEventListener(
      "click",
      (event) => {
        const close =
          event.target.closest(
            "[data-ci-library-close]"
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
      "close",
      () => {
        playbackSeq += 1;

        const media =
          dialog.querySelector(
            "video, audio"
          );

        if (media) {
          try {
            media.pause();
          } catch {}

          media.removeAttribute(
            "src"
          );

          media.load?.();
        }

        const image =
          dialog.querySelector(
            "img[data-ci-library-image]"
          );

        if (image) {
          image.removeAttribute(
            "src"
          );
        }

        const content =
          dialog.querySelector(
            "[data-ci-library-dialog-content]"
          );

        if (content) {
          content.innerHTML = "";
        }
      }
    );

    return dialog;
  }

  function assetDetailMarkup(
    item,
    playback
  ) {
    const source =
      item?.source || {};

    const purchase =
      item?.purchase || {};

    const creator =
      item?.creator || {};

    const rights =
      item?.rights || {};

    const kind =
      mediaKind(item);

    const url =
      clean(
        playback
          ?.playback
          ?.signed_url
      );

    const mediaMarkup =
      kind === "image"
        ? `
          <img
            data-ci-library-image
            src="${escapeHtml(url)}"
            alt="${escapeHtml(
              source?.concept_label ||
              "Asset adquirido"
            )}"
          />
        `
        : `
          <video
            controls
            playsinline
            preload="metadata"
            src="${escapeHtml(url)}"
          ></video>
        `;

    return `
      <div
        class="ciLibraryDetail"
      >
        <section
          class="ciLibraryDetail__media"
        >
          ${mediaMarkup}
        </section>

        <section
          class="ciLibraryDetail__info"
        >
          <div
            class="ciLibraryDetail__pills"
          >
            ${pill(
              "Disponible",
              "green"
            )}

            ${pill(
              "Rights activos",
              "green"
            )}
          </div>

          <h3>
            ${escapeHtml(
              source?.concept_label ||
              "Activo creativo"
            )}
          </h3>

          <p>
            ${escapeHtml(
              source?.original_filename ||
              ""
            )}
          </p>

          <div
            class="ciLibraryDetailGrid"
          >
            ${detailField(
              "Creator",
              creator?.display_name
            )}

            ${detailField(
              "Versión",
              `V${
                source?.version_number ||
                "—"
              }`
            )}

            ${detailField(
              "Resolución",
              (
                source?.width &&
                source?.height
              )
                ? `${source.width} × ${source.height}`
                : "—"
            )}

            ${detailField(
              "Duración",
              formatDuration(
                source?.duration_seconds
              )
            )}

            ${detailField(
              "Tamaño",
              formatBytes(
                source?.file_size_bytes
              )
            )}

            ${detailField(
              "Formato",
              source?.mime_type
            )}

            ${detailField(
              "Compra",
              shortId(
                purchase?.purchase_id
              )
            )}

            ${detailField(
              "Adquisición",
              formatMoney(
                purchase?.total_amount,
                purchase?.currency
              )
            )}

            ${detailField(
              "Compra liquidada",
              formatDate(
                purchase?.settled_at
              )
            )}

            ${detailField(
              "Rights activos desde",
              formatDate(
                rights?.active_at
              )
            )}
          </div>

          <div
            class="ciLibraryRightsNotice"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              verified_user
            </span>

            <div>
              <strong>
                Rights activos
              </strong>

              <span>
                Este playback sólo está
                disponible mientras el asset
                permanezca AVAILABLE y sus
                Rights estén activos.
              </span>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  async function openAsset(
    assetId
  ) {
    const id =
      clean(assetId);

    const item =
      assets.find(
        (asset) =>
          clean(
            asset?.creative_asset_id
          ) === id
      );

    if (!item) return;

    const dialog =
      ensureAssetDialog();

    const content =
      dialog.querySelector(
        "[data-ci-library-dialog-content]"
      );

    const assetStatus =
      libraryAssetStatus(
        item
      );

    if (
      assetStatus !== "available"
    ) {
      playbackSeq += 1;

      if (content) {
        content.innerHTML =
          libraryAssetBlockedMarkup(
            item
          );
      }

      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (content) {
      content.innerHTML = `
        <div
          class="ciLibraryPlaybackLoading"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            progress_activity
          </span>

          <div>
            <strong>
              Preparando asset
            </strong>

            <span>
              Generando acceso temporal…
            </span>
          </div>
        </div>
      `;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const seq =
      ++playbackSeq;

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

      const playback =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/assets/${
              encodeURIComponent(
                id
              )
            }/playback`,
            {
              method: "POST"
            }
          );

      if (
        seq !== playbackSeq ||
        !dialog.open
      ) {
        return;
      }

      if (content) {
        content.innerHTML =
          assetDetailMarkup(
            item,
            playback
          );
      }

    } catch (error) {
      if (
        seq !== playbackSeq ||
        !dialog.open
      ) {
        return;
      }

      if (content) {
        content.innerHTML = `
          <div
            class="ciLibraryPlaybackError"
          >
            <span
              class="material-symbols-rounded"
              aria-hidden="true"
            >
              error
            </span>

            <strong>
              Asset no disponible
            </strong>

            <span>
              No se pudo generar
              el acceso temporal.
            </span>

            <button
              type="button"
              data-ci-library-close
            >
              Cerrar
            </button>
          </div>
        `;
      }
    }
  }

  function bindView() {
    const root =
      stage();

    if (!root) return;

    root
      .querySelector(
        "[data-ci-library-search]"
      )
      ?.addEventListener(
        "input",
        (event) => {
          searchTerm =
            event.target.value ||
            "";

          updateGrid();
        }
      );

    root.addEventListener(
      "click",
      (event) => {
        const refresh =
          event.target.closest(
            "[data-ci-library-refresh]"
          );

        if (refresh) {
          render();
          return;
        }

        const filter =
          event.target.closest(
            "[data-ci-library-filter]"
          );

        if (filter) {
          currentFilter =
            clean(
              filter.dataset
                .ciLibraryFilter
            ) || "all";

          root
            .querySelectorAll(
              "[data-ci-library-filter]"
            )
            .forEach(
              (button) => {
                const active =
                  clean(
                    button.dataset
                      .ciLibraryFilter
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
              }
            );

          updateGrid();
          return;
        }

        const asset =
          event.target.closest(
            "[data-ci-library-asset]"
          );

        if (asset) {
          openAsset(
            asset.dataset
              .ciLibraryAsset
          );
        }
      }
    );
  }

  function loadingMarkup() {
    return `
      <div
        class="ciLibraryLoading"
      >
        <span
          class="material-symbols-rounded"
          aria-hidden="true"
        >
          progress_activity
        </span>

        <div>
          <strong>
            Cargando Biblioteca
          </strong>

          <span>
            Consultando assets adquiridos…
          </span>
        </div>
      </div>
    `;
  }

  async function render() {
    if (!isLibrary()) return;

    const root =
      stage();

    if (!root) return;

    const seq =
      ++requestSeq;

    root.innerHTML =
      loadingMarkup();

    try {
      const connection =
        await window
          .PCIRuntime
          .getConnectionState();

      if (!connection?.signedIn) {
        throw new Error(
          "pci_auth_session_required"
        );
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

      const response =
        await window
          .PCIRuntime
          .request(
            `/v1/workspaces/${
              encodeURIComponent(
                workspace
              )
            }/library`,
            {
              method: "GET"
            }
          );

      if (
        seq !== requestSeq ||
        !isLibrary()
      ) {
        return;
      }

      assets =
        Array.isArray(
          response?.items
        )
          ? response.items
          : [];

      root.innerHTML =
        shellMarkup();

      bindView();

    } catch (error) {
      if (
        seq !== requestSeq
      ) {
        return;
      }

      root.innerHTML = `
        <div
          class="ciLibraryPlaybackError"
        >
          <span
            class="material-symbols-rounded"
            aria-hidden="true"
          >
            error
          </span>

          <strong>
            Biblioteca no disponible
          </strong>

          <span>
            No pudimos leer los
            assets adquiridos.
          </span>

          <button
            type="button"
            data-ci-library-refresh
          >
            Reintentar
          </button>
        </div>
      `;

      root
        .querySelector(
          "[data-ci-library-refresh]"
        )
        ?.addEventListener(
          "click",
          render
        );
    }
  }

  function boot() {
    if (isLibrary()) {
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
