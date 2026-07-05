/* =========================================================
   PRODUCTOS · TAB RESUMEN · tabla limpia + detalle lateral
   Parche seguro:
   - No toca + Nuevo producto
   - No toca + Nueva oferta
   - No toca Conjuntos
   - No toca Supabase ni Shopify
   ========================================================= */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_RESUMEN_ROW_DETAIL_2026_07_05_01";

  function isProductosPage_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function safe_(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtmlLocal_(value) {
    return safe_(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttrLocal_(value) {
    return escapeHtmlLocal_(value).replace(/`/g, "&#096;");
  }

  function formatMoneyLocal_(value) {
    if (value == null || value === "") return "—";

    const n = Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return "—";

    if (typeof formatMoneyAr_ === "function") {
      return formatMoneyAr_(n);
    }

    return "$ " + n.toLocaleString("es-AR");
  }

  function formatPercentLocal_(value) {
    if (value == null || value === "") return "—";

    const n = Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return "—";

    return n.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + "%";
  }

  function raw_(item) {
    return item && item.raw_supabase && typeof item.raw_supabase === "object"
      ? item.raw_supabase
      : {};
  }

  function pick_(item, keys) {
    const source = item || {};
    const raw = raw_(item);

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] != null &&
        safe_(source[key]) !== ""
      ) {
        return source[key];
      }

      if (
        Object.prototype.hasOwnProperty.call(raw, key) &&
        raw[key] != null &&
        safe_(raw[key]) !== ""
      ) {
        return raw[key];
      }
    }

    return "";
  }

  function pickNumber_(item, keys) {
    const value = pick_(item, keys);
    if (value === "") return null;

    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function textOrDash_(value) {
    const txt = safe_(value);
    return txt ? escapeHtmlLocal_(txt) : "—";
  }

  function getSku_(item) {
    return safe_(pick_(item, ["sku", "SKU"]));
  }

  function getName_(item) {
    return safe_(pick_(item, ["nombre", "nombre_producto", "nombre_comercial", "product_name"]));
  }

  function getActiveProductList_() {
    if (typeof ProductosState === "undefined") return [];

    const all = Array.isArray(ProductosState.all) ? ProductosState.all : [];
    const filtered = Array.isArray(ProductosState.filtered) ? ProductosState.filtered : [];

    return all.length ? all : filtered;
  }

  function findProductBySku_(sku) {
    const target = safe_(sku).toUpperCase();
    if (!target) return null;

    const all = getActiveProductList_();
    return all.find((item) => getSku_(item).toUpperCase() === target) || null;
  }

  function getShopifyBlock_(item) {
    const productId = pick_(item, [
      "shopify_product_id",
      "product_id_shopify",
      "shopifyProductId"
    ]);

    const variantId = pick_(item, [
      "shopify_variant_id",
      "variant_id_shopify",
      "id_variante_shopify",
      "shopifyVariantId"
    ]);

    const shopifyPrice = pick_(item, [
      "shopify_price",
      "shopify_variant_price",
      "precio_shopify",
      "price_shopify"
    ]);

    const productTitle = pick_(item, [
      "shopify_product_title",
      "product_title_snapshot",
      "product_title_shopify",
      "nombre_shopify"
    ]);

    const variantTitle = pick_(item, [
      "shopify_variant_title",
      "variant_title_snapshot",
      "variant_title_shopify"
    ]);

    const hasShopify = !!(
      safe_(productId) ||
      safe_(variantId) ||
      safe_(shopifyPrice) ||
      safe_(productTitle) ||
      safe_(variantTitle)
    );

    if (!hasShopify) {
      return `
        <div class="prodResumenDetail__empty">
          Sin vínculo Shopify registrado para este SKU.
        </div>
      `;
    }

    return `
      <div class="prodResumenDetail__items">
        <div class="prodResumenDetail__item">
          <span class="prodResumenDetail__label">product_id</span>
          <span class="prodResumenDetail__value">${textOrDash_(productId)}</span>
        </div>

        <div class="prodResumenDetail__item">
          <span class="prodResumenDetail__label">variant_id</span>
          <span class="prodResumenDetail__value">${textOrDash_(variantId)}</span>
        </div>

        <div class="prodResumenDetail__item">
          <span class="prodResumenDetail__label">Precio Shopify</span>
          <span class="prodResumenDetail__value">${safe_(shopifyPrice) ? formatMoneyLocal_(shopifyPrice) : "—"}</span>
        </div>

        <div class="prodResumenDetail__item">
          <span class="prodResumenDetail__label">Nombre Shopify</span>
          <span class="prodResumenDetail__value">${textOrDash_(productTitle)}</span>
        </div>

        <div class="prodResumenDetail__item">
          <span class="prodResumenDetail__label">Variante Shopify</span>
          <span class="prodResumenDetail__value">${textOrDash_(variantTitle)}</span>
        </div>
      </div>
    `;
  }

  function buildDetailHtml_(item) {
    const sku = getSku_(item);
    const nombre = getName_(item);

    const costoProveedor = pickNumber_(item, ["costo_proveedor_actual", "costo_proveedor"]);
    const costoHandling = pickNumber_(item, ["costo_handling"]);
    const cpaCosto = pickNumber_(item, ["cpa_costo"]);
    const costoEnvio = pickNumber_(item, ["costo_envio_promedio"]);
    const margen = pickNumber_(item, ["margen_pretendido_pct"]);
    const escenario = pick_(item, ["escenario_financiero_id", "id_escenario", "financial_scenario_id"]);
    const cpaBreakEven = pickNumber_(item, ["cpa_break_even", "cpa_break_even_estimado", "cpa_break_even_calculado"]);
    const netoPretendido = pickNumber_(item, ["neto_pretendido"]);
    const precioVenta = pickNumber_(item, ["precio_venta_estimado", "precio_venta"]);
    const precioBlindado = pickNumber_(item, ["precio_blindado", "precio_blindado_estimado"]);
    const escenarioResumen = pick_(item, ["escenario_financiero_resumen", "resumen_escenario_financiero", "financial_scenario_summary"]) || escenario;

    return `
      <div class="prodResumenDetail">
        <section class="prodResumenDetail__hero">
          <div class="prodResumenDetail__eyebrow">Detalle operativo del SKU</div>
          <h2 class="prodResumenDetail__title">${textOrDash_(nombre)}</h2>
          <div class="prodResumenDetail__sku">${textOrDash_(sku)}</div>
        </section>

        <section class="prodResumenDetail__grid">
          <article class="prodResumenDetail__card">
            <div class="prodResumenDetail__cardTitle">Identidad del producto</div>
            <div class="prodResumenDetail__items">
              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">SKU</span>
                <span class="prodResumenDetail__value">${textOrDash_(sku)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Nombre del producto</span>
                <span class="prodResumenDetail__value">${textOrDash_(nombre)}</span>
              </div>
            </div>
          </article>

          <article class="prodResumenDetail__card">
            <div class="prodResumenDetail__cardTitle">Costo base del SKU</div>
            <div class="prodResumenDetail__items">
              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Costo proveedor</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(costoProveedor)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Costo handling</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(costoHandling)}</span>
              </div>
            </div>
          </article>

          <article class="prodResumenDetail__card">
            <div class="prodResumenDetail__cardTitle">Costos de comercialización</div>
            <div class="prodResumenDetail__items">
              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">CPA costo</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(cpaCosto)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Costo envío promedio</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(costoEnvio)}</span>
              </div>
            </div>
          </article>

          <article class="prodResumenDetail__card">
            <div class="prodResumenDetail__cardTitle">Objetivo económico</div>
            <div class="prodResumenDetail__items">
              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Margen pretendido %</span>
                <span class="prodResumenDetail__value">${formatPercentLocal_(margen)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Escenario financiero</span>
                <span class="prodResumenDetail__value">${textOrDash_(escenario)}</span>
              </div>
            </div>
          </article>

          <article class="prodResumenDetail__card prodResumenDetail__card--wide">
            <div class="prodResumenDetail__cardTitle">Resultados automáticos</div>
            <div class="prodResumenDetail__items">
              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">CPA break even</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(cpaBreakEven)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Neto pretendido</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(netoPretendido)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Precio venta</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(precioVenta)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Precio blindado</span>
                <span class="prodResumenDetail__value">${formatMoneyLocal_(precioBlindado)}</span>
              </div>

              <div class="prodResumenDetail__item">
                <span class="prodResumenDetail__label">Resumen escenario financiero</span>
                <span class="prodResumenDetail__value">${textOrDash_(escenarioResumen)}</span>
              </div>
            </div>
          </article>

          <article class="prodResumenDetail__card prodResumenDetail__card--wide">
            <div class="prodResumenDetail__cardTitle">Vínculo Shopify</div>
            ${getShopifyBlock_(item)}
          </article>
        </section>
      </div>
    `;
  }

  function normalizeHeaderAndSearch_() {
    const card = document.querySelector("#prodPanelResumen .prodBoardCard--table");
    if (!card) return;

    const head = card.querySelector(".prodSectionHead");
    if (head) {
      head.classList.add("prodSectionHead--resumenTable");

      const eyebrow = head.querySelector(".prodSectionHead__eyebrow");
      if (eyebrow) eyebrow.remove();

      const right = head.querySelector(".prodSectionHead__right");
      if (right) {
        right.classList.add("prodSectionHead__right--search");
        right.innerHTML = "";

        const searchWrap = card.querySelector(".prodTableSearchWrap");
        if (searchWrap) {
          searchWrap.classList.add("prodTableSearchWrap--head");
          right.appendChild(searchWrap);
        }
      }
    }

    const tableTopbar = card.querySelector(".prodTableTopbar");
    if (tableTopbar) tableTopbar.remove();

    const headerRow = card.querySelector(".prodTable thead tr");
    if (headerRow) {
      headerRow.innerHTML = `
        <th>SKU</th>
        <th>Nombre comercial</th>
        <th>Neto pretendido</th>
        <th>Precio de venta (financ)</th>
        <th>Estado</th>
      `;
    }

    const emptyCell = card.querySelector("#prodResumenTableBody .prodTableEmpty");
    if (emptyCell) emptyCell.setAttribute("colspan", "5");
  }

  function clearProductDetailSlideKind_() {
    const panel = document.getElementById("prodSlidePanel");
    if (!panel) return;

    if (panel.getAttribute("data-slide-kind") === "product-detail") {
      panel.removeAttribute("data-slide-kind");
    }
  }

  function patchExistingSlideOpenClose_() {
    if (
      typeof openProductosSlide_ === "function" &&
      window.__PRODUCTOS_RESUMEN_DETAIL_OPEN_PATCHED__ !== true
    ) {
      window.__PRODUCTOS_RESUMEN_DETAIL_OPEN_PATCHED__ = true;

      const originalOpen = openProductosSlide_;

      openProductosSlide_ = function patchedOpenProductosSlide_() {
        clearProductDetailSlideKind_();
        return originalOpen.apply(this, arguments);
      };

      window.openProductosSlide_ = openProductosSlide_;
    }

    if (
      typeof closeProductosSlide_ === "function" &&
      window.__PRODUCTOS_RESUMEN_DETAIL_CLOSE_PATCHED__ !== true
    ) {
      window.__PRODUCTOS_RESUMEN_DETAIL_CLOSE_PATCHED__ = true;

      const originalClose = closeProductosSlide_;

      closeProductosSlide_ = function patchedCloseProductosSlide_() {
        const result = originalClose.apply(this, arguments);
        clearProductDetailSlideKind_();
        return result;
      };

      window.closeProductosSlide_ = closeProductosSlide_;
    }
  }

  function openProductDetailSlide_(sku) {
    const item = findProductBySku_(sku);
    if (!item) return;

    const overlay = document.getElementById("prodSlideOverlay");
    const panel = document.getElementById("prodSlidePanel");
    const content = document.getElementById("prodSlideContent");
    const titleEl = document.getElementById("prodSlideTitle");
    const subSlide = document.getElementById("prodSubSlide");
    const subContent = document.getElementById("prodSubSlideContent");

    if (!overlay || !panel || !content) return;

    if (typeof ProductosUiState !== "undefined") {
      ProductosUiState.mainSlideReqId++;
      ProductosUiState.subSlideReqId++;
      ProductosUiState.mainSlideLoading = false;
      ProductosUiState.subSlideLoading = false;
    }

    panel.classList.remove("is-subslide-open");
    panel.setAttribute("data-slide-kind", "product-detail");
    panel.setAttribute("data-main-layout", "product-detail");

    if (subSlide) {
      subSlide.classList.remove("is-active");
      subSlide.setAttribute("aria-hidden", "true");
    }

    if (subContent) {
      subContent.innerHTML = "";
    }

    if (titleEl) {
      titleEl.textContent = "Detalle de producto";
    }

    content.innerHTML = buildDetailHtml_(item);

    overlay.classList.add("is-active");
    panel.classList.add("is-active");
    panel.setAttribute("aria-hidden", "false");
  }

  function wireProductosResumenRowDetail_() {
    const tbody = document.getElementById("prodResumenTableBody");
    if (!tbody || tbody.dataset.productDetailBound === "1") return;

    tbody.dataset.productDetailBound = "1";

    tbody.addEventListener("click", function (event) {
      const row = event.target.closest("tr[data-product-sku]");
      if (!row || !tbody.contains(row)) return;

      const sku = safe_(row.getAttribute("data-product-sku"));
      if (!sku) return;

      openProductDetailSlide_(sku);
    });

    tbody.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;

      const row = event.target.closest("tr[data-product-sku]");
      if (!row || !tbody.contains(row)) return;

      event.preventDefault();

      const sku = safe_(row.getAttribute("data-product-sku"));
      if (!sku) return;

      openProductDetailSlide_(sku);
    });
  }

  function patchResumenTableRender_() {
    if (typeof renderProductosTable_ !== "function") return;
    if (window.__PRODUCTOS_RESUMEN_TABLE_RENDER_PATCHED__ === true) return;

    window.__PRODUCTOS_RESUMEN_TABLE_RENDER_PATCHED__ = true;

    renderProductosTable_ = function patchedRenderProductosTable_() {
      normalizeHeaderAndSearch_();

      const tbody = document.getElementById("prodResumenTableBody");
      if (!tbody) return;

      const rows =
        typeof ProductosState !== "undefined" && Array.isArray(ProductosState.filtered)
          ? ProductosState.filtered
          : [];

      if (!rows.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="prodTableEmpty">No se encontraron productos con los filtros actuales.</td>
          </tr>
        `;
        wireProductosResumenRowDetail_();
        return;
      }

      tbody.innerHTML = rows.map((item) => {
        const sku = getSku_(item);
        const nombre = getName_(item);
        const tipo = typeof inferTipoProducto_ === "function" ? inferTipoProducto_(item) : "SKU";

        const netoPretendido = pickNumber_(item, ["neto_pretendido"]);
        const precioVenta = pickNumber_(item, ["precio_venta_estimado", "precio_venta"]);

        return `
          <tr
            class="prodTableRow--clickable"
            data-product-sku="${escapeAttrLocal_(sku)}"
            tabindex="0"
            aria-label="Ver detalle de producto ${escapeAttrLocal_(sku)}"
          >
            <td><div class="prodTable__sku">${textOrDash_(sku)}</div></td>
            <td><div class="prodTable__name">${textOrDash_(nombre)}</div></td>
            <td><div class="prodTable__money">${formatMoneyLocal_(netoPretendido)}</div></td>
            <td><div class="prodTable__money">${formatMoneyLocal_(precioVenta)}</div></td>
            <td><span class="badge">${escapeHtmlLocal_(tipo)}</span></td>
          </tr>
        `;
      }).join("");

      wireProductosResumenRowDetail_();
    };

    window.renderProductosTable_ = renderProductosTable_;
  }

  function init_() {
    if (!isProductosPage_()) return;

    normalizeHeaderAndSearch_();
    patchExistingSlideOpenClose_();
    patchResumenTableRender_();
    wireProductosResumenRowDetail_();

    if (typeof renderProductosTable_ === "function") {
      renderProductosTable_();
    }

    console.log("[productos-resumen-row-detail] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init_);
  } else {
    init_();
  }

  document.addEventListener("sazzu:page:load", init_);
  window.addEventListener("load", init_);
})();
