console.log("[productos.js] cargado OK");

/* ======= INICIO · BACKEND PRODUCTOS / OFERTAS ======= */
/* URL unificada del backend activo para productos + ofertas + resumen SKU */
window.__PRODUCTOS_BACKEND_URL__ =
  window.__PRODUCTOS_BACKEND_URL__ ||
  "https://script.google.com/macros/s/AKfycbyWYtXZ8_j3hSUGQeYel5ue1WE4C5dSWz7bdNJprCGMF0Eqz_Q4bFQbowBV2N09vwI/exec";
/* ======= FIN · BACKEND PRODUCTOS / OFERTAS ======= */
const PRODUCTOS_BACKEND_URL = window.__PRODUCTOS_BACKEND_URL__;
window.__PRODUCTOS_CACHE__ = window.__PRODUCTOS_CACHE__ || null;

/* ======= INICIO · STATE DE PRODUCTOS ======= */
/* Estado principal de la pantalla Productos */
const ProductosState = {
  all: [],
  filtered: [],
  search: "",
  type: "todos",
  activeTab: "resumen",
  offersSummary: null,

  /* ======= INICIO · STATE TAB OFERTAS ======= */
  offersLoaded: false,
  offersLoading: false,
  offersAll: [],
  offersFiltered: [],
  offersSearch: "",
  offersDateFrom: "",
  offersDateTo: "",
  offersSort: "fecha_desc",
  /* ======= FIN · STATE TAB OFERTAS ======= */

  /* ======= INICIO · STATE PANEL CONJUNTOS ======= */
  productSetsLoaded: false,
  productSetsLoading: false,
  productSets: []
  /* ======= FIN · STATE PANEL CONJUNTOS ======= */
};

const ProductosUiState = {
  mainSlideReqId: 0,
  subSlideReqId: 0,
  mainSlideLoading: false,
  subSlideLoading: false
};

const ProductosCreateSkuState = {
  pendingPayload: null,
  scenariosLoaded: false,
  scenariosLoading: false
};
/* ======= FIN · STATE DE PRODUCTOS ======= */

function getProductosTbody_() {
  return document.getElementById("prodResumenTableBody");
}

function setProductosDebugRow_(msg) {
  const tbody = getProductosTbody_();
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="prodTableEmpty">${String(msg || "")}</td>
    </tr>
  `;
}

const PRODUCTOS_JSONP_INFLIGHT = new Map();
const PRODUCTOS_JSONP_CACHE = new Map();

function getProductosJsonpAction_(url) {
  try {
    const absoluteUrl = new URL(url, window.location.origin);
    return String(absoluteUrl.searchParams.get("action") || "").trim();
  } catch (err) {
    return "";
  }
}

function isProductosJsonpReadAction_(action) {
  return [
    "getProductos",
    "getOffersSummary",
    "getSkuResumen",
    "getProductSets",
    "getFinancialScenarios",
    "getOrders",
    "getHomeSummary",
    "getCashflow",
    "getFinHistory"
  ].includes(String(action || "").trim());
}

function normalizeProductosJsonpKey_(url) {
  try {
    const absoluteUrl = new URL(url, window.location.origin);
    absoluteUrl.searchParams.delete("_t");
    absoluteUrl.searchParams.delete("_nocache");
    absoluteUrl.searchParams.delete("callback");
    return absoluteUrl.toString();
  } catch (err) {
    return String(url || "");
  }
}

function readProductosJsonpCache_(key) {
  const hit = PRODUCTOS_JSONP_CACHE.get(key);
  if (!hit) return null;

  if (Date.now() > hit.expiresAt) {
    PRODUCTOS_JSONP_CACHE.delete(key);
    return null;
  }

  return hit.payload || null;
}

function writeProductosJsonpCache_(key, payload, ttlMs) {
  PRODUCTOS_JSONP_CACHE.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs
  });
}

function jsonp(url, options) {
  const opts = options && typeof options === "object" ? options : {};
  const action = getProductosJsonpAction_(url);
  const isRead = isProductosJsonpReadAction_(action);
  const cacheKey = normalizeProductosJsonpKey_(url);

  const timeoutMs = Number(
    opts.timeoutMs != null
      ? opts.timeoutMs
      : (isRead ? 15000 : 12000)
  );

  const retries = Number(
    opts.retries != null
      ? opts.retries
      : (isRead ? 1 : 0)
  );

  const retryDelayMs = Number(
    opts.retryDelayMs != null
      ? opts.retryDelayMs
      : 450
  );

  const cacheTtlMs = Number(
    opts.cacheTtlMs != null
      ? opts.cacheTtlMs
      : (isRead ? 12000 : 0)
  );

  if (isRead && cacheTtlMs > 0) {
    const cached = readProductosJsonpCache_(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  if (isRead && PRODUCTOS_JSONP_INFLIGHT.has(cacheKey)) {
    return PRODUCTOS_JSONP_INFLIGHT.get(cacheKey);
  }

  const runAttempt_ = (attempt) => new Promise((resolve) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let done = false;

    const finish = (payload) => {
      if (done) return;
      done = true;

      try { delete window[cbName]; } catch (e) {}
      if (script && script.parentNode) script.parentNode.removeChild(script);

      const isTimeout =
        !payload ||
        payload.ok === false &&
        typeof payload.error === "string" &&
        payload.error.toLowerCase().includes("timeout");

      if (isRead && isTimeout && attempt < retries) {
        setTimeout(() => {
          runAttempt_(attempt + 1).then(resolve);
        }, retryDelayMs);
        return;
      }

      resolve(payload);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        error: `Timeout JSONP: el backend no respondió en ${Math.round(timeoutMs / 1000)} segundos.`
      });
    }, timeoutMs);

    window[cbName] = (data) => {
      clearTimeout(timer);
      finish(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      finish({
        ok: false,
        error: "Error cargando JSONP. La URL del backend no respondió como script."
      });
    };

    script.src =
      url +
      (url.includes("?") ? "&" : "?") +
      "callback=" + cbName +
      "&_nocache=" + Math.random();

    document.body.appendChild(script);
  });

  const promise = runAttempt_(0).then((payload) => {
    if (isRead) {
      PRODUCTOS_JSONP_INFLIGHT.delete(cacheKey);

      if (payload && payload.ok === true && cacheTtlMs > 0) {
        writeProductosJsonpCache_(cacheKey, payload, cacheTtlMs);
      }
    }

    return payload;
  }).catch((err) => {
    if (isRead) {
      PRODUCTOS_JSONP_INFLIGHT.delete(cacheKey);
    }

    return {
      ok: false,
      error: String(err && err.message ? err.message : err || "Error inesperado en JSONP.")
    };
  });

  if (isRead) {
    PRODUCTOS_JSONP_INFLIGHT.set(cacheKey, promise);
  }

  return promise;
}

function normalize_(v) {
  return String(v || "").trim().toLowerCase();
}

function escapeHtml_(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoneyAr_(value) {
  const n = Number(value || 0);
  return "$ " + n.toLocaleString("es-AR");
}
/* ======= INICIO · HELPERS SLIDE OFERTAS ======= */

function formatOfferOrigin_(item) {
  const rowType = String(item && item.row_type || "").trim().toLowerCase();
  if (rowType === "bundle") return "Bundle";
  if (rowType === "equivalencia") return "Equivalencia";
  return "Oferta";
}

function formatOfferDescription_(item) {
  const rowType = String(item && item.row_type || "").trim().toLowerCase();
  const filas = Number(item && item.cantidad_filas || 0);
  const skus = Array.isArray(item && item.skus) ? item.skus.length : 0;

  if (rowType === "bundle") {
    return `Bundle activo con ${filas} fila${filas === 1 ? "" : "s"} interna${filas === 1 ? "" : "s"} y ${skus} SKU${skus === 1 ? "" : "s"} detectado${skus === 1 ? "" : "s"}.`;
  }

  return "Oferta activa de equivalencia asociada a una variante Shopify.";
}

function getActiveOffersForSlide_() {
  const summary = ProductosState.offersSummary || {};
  const detalle = summary.detalle || {};

  const equivalencias = Array.isArray(detalle.equivalencias) ? detalle.equivalencias : [];
  const bundles = Array.isArray(detalle.bundles) ? detalle.bundles : [];

  const eqActivas = equivalencias
    .filter(item => String(item && item.estado || "").toLowerCase() === "activo")
    .map(item => ({
      ...item,
      origen_tabla: "TablaEquivalencias"
    }));

  const buActivas = bundles
    .filter(item => String(item && item.estado || "").toLowerCase() === "activo")
    .map(item => ({
      ...item,
      origen_tabla: "TablaBundles"
    }));

  return eqActivas.concat(buActivas);
}

/* ======= FIN · HELPERS SLIDE OFERTAS ======= */
function inferTipoProducto_(item) {
  return "SKU";
}

function getActiveCount_(list) {
  return list.filter(p => p.activo === true).length;
}
/* ======= INICIO · HELPERS KPI OFERTAS ======= */
/* Extrae números del resumen de ofertas sin romper la UI si el backend todavía no respondió */
function getOffersSummaryNumbers_() {
  const resumen = ProductosState.offersSummary && ProductosState.offersSummary.resumen
    ? ProductosState.offersSummary.resumen
    : null;

  return {
    ofertasActivasTotal: resumen ? Number(resumen.ofertas_activas_total || 0) : 0,
    ofertasEquivalenciasTotal: resumen ? Number(resumen.ofertas_equivalencias_total || 0) : 0,
    ofertasBundlesTotal: resumen ? Number(resumen.ofertas_bundles_total || 0) : 0
  };
}
/* ======= FIN · HELPERS KPI OFERTAS ======= */
function applyProductosFilters_() {
  const q = normalize_(ProductosState.search);
  const type = normalize_(ProductosState.type);
  const base = Array.isArray(ProductosState.all) ? ProductosState.all.slice() : [];

  ProductosState.filtered = base.filter((item) => {
    const sku = normalize_(item.sku);
    const nombre = normalize_(item.nombre);
    const tipo = normalize_(inferTipoProducto_(item));

    const matchesSearch = !q || sku.includes(q) || nombre.includes(q);
    const matchesType = (type === "todos" || type === "sku") ? true : tipo === type;

    return matchesSearch && matchesType;
  });
}

/* ======= INICIO · RENDER DE KPIs SUPERIORES ======= */
/* Pinta las 4 tarjetas superiores del módulo Productos */
function renderProductosKpis_() {
  const totalActivos = getActiveCount_(ProductosState.all);
  const offers = getOffersSummaryNumbers_();

  const elSkus = document.getElementById("prodKpiSkus");
  const elOfertas = document.getElementById("prodKpiOfertas");
  const elPacks = document.getElementById("prodKpiPacks");
  const elBundles = document.getElementById("prodKpiBundles");

  if (elSkus) elSkus.textContent = String(totalActivos);
  if (elOfertas) elOfertas.textContent = String(offers.ofertasActivasTotal);
  if (elPacks) elPacks.textContent = String(offers.ofertasEquivalenciasTotal);
  if (elBundles) elBundles.textContent = String(offers.ofertasBundlesTotal);
}
/* ======= FIN · RENDER DE KPIs SUPERIORES ======= */

function renderProductosTable_() {
  const tbody = getProductosTbody_();
  if (!tbody) return;

  const rows = ProductosState.filtered;

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="prodTableEmpty">No se encontraron productos con los filtros actuales.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((item, index) => {
    const tipo = inferTipoProducto_(item);

    const badgeSets = [
      `
        <span class="prodRelBadge prodRelBadge--paquete">
          <span class="prodRelBadge__icon" aria-hidden="true">◌</span>
          <span class="prodRelBadge__divider" aria-hidden="true"></span>
          <span class="prodRelBadge__label">Paquete</span>
        </span>
      `,
      `
        <span class="prodRelBadge prodRelBadge--unidad">
          <span class="prodRelBadge__icon" aria-hidden="true">◔</span>
          <span class="prodRelBadge__divider" aria-hidden="true"></span>
          <span class="prodRelBadge__label">Unidad</span>
        </span>
      `,
      `
        <span class="prodRelBadge prodRelBadge--cantidad">
          <span class="prodRelBadge__icon" aria-hidden="true">◍</span>
          <span class="prodRelBadge__divider" aria-hidden="true"></span>
          <span class="prodRelBadge__label">Cantidad</span>
        </span>
      `
    ];

    const visualRelation = badgeSets[index % badgeSets.length];

    return `
      <tr>
        <td>
          <div class="prodRelCell" aria-label="Relación de venta de ${escapeHtml_(item.sku)}">
            ${visualRelation}
          </div>
        </td>
        <td><div class="prodTable__sku">${escapeHtml_(item.sku)}</div></td>
        <td><div class="prodTable__name">${escapeHtml_(item.nombre)}</div></td>
        <td><div class="prodTable__money">${formatMoneyAr_(item.neto_pretendido)}</div></td>
        <td><div class="prodTable__money">${formatMoneyAr_(item.precio_venta)}</div></td>
        <td><span class="badge">${escapeHtml_(tipo)}</span></td>
      </tr>
    `;
  }).join("");
}

function wireProductosLocalSwitches_() {
  document.querySelectorAll(".prodSwitch__input").forEach((input) => {
    input.addEventListener("change", () => {
      const visibleIndex = Number(input.dataset.index);
      const item = ProductosState.filtered[visibleIndex];
      if (!item) return;

      item.activo = !!input.checked;

      const original = ProductosState.all.find(p => p.sku === item.sku);
      if (original) original.activo = item.activo;

      renderProductosKpis_();
      renderProductosTable_();
      wireProductosLocalSwitches_();
    });
  });
}
/* ======= INICIO · SLIDE CONTROL ======= */

/* ======= INICIO · OPEN PRODUCTOS SLIDE CON TIPO DE LAYOUT ======= */
function openProductosSlide_(title, partialPath) {
  const overlay = document.getElementById("prodSlideOverlay");
  const panel = document.getElementById("prodSlidePanel");
  const content = document.getElementById("prodSlideContent");
  const titleEl = document.getElementById("prodSlideTitle");
  const subSlide = document.getElementById("prodSubSlide");
  const subContent = document.getElementById("prodSubSlideContent");

  if (!overlay || !panel || !content) return;

  const reqId = ++ProductosUiState.mainSlideReqId;
  ProductosUiState.mainSlideLoading = true;

  if (titleEl) titleEl.textContent = title || "Detalle";

  panel.classList.remove("is-subslide-open");

  /* Detectamos el tipo de slide principal */
  if (partialPath.includes("productos-slide-ofertas-activas.html")) {
    panel.setAttribute("data-main-layout", "cards");
  } else if (
    partialPath.includes("productos-slide-ofertas-cantidad.html") ||
    partialPath.includes("productos-slide-bundles.html")
  ) {
    panel.setAttribute("data-main-layout", "table");
  } else {
    panel.setAttribute("data-main-layout", "default");
  }

  if (subSlide) {
    subSlide.classList.remove("is-active");
    subSlide.setAttribute("aria-hidden", "true");
  }

  if (subContent) {
    subContent.innerHTML = "";
  }

  content.innerHTML = `<div class="prodSlideLoading">Cargando contenido...</div>`;

  overlay.classList.add("is-active");
  panel.classList.add("is-active");
  panel.setAttribute("aria-hidden", "false");

  fetch(partialPath + "?_t=" + Date.now())
    .then(res => res.text())
    .then(html => {
      if (reqId !== ProductosUiState.mainSlideReqId) return;

      content.innerHTML = html;

      if (partialPath.includes("productos-slide-ofertas-activas.html")) {
        renderProductosSlideOfertasActivas_();
      }

      ProductosUiState.mainSlideLoading = false;
    })
    .catch(() => {
      if (reqId !== ProductosUiState.mainSlideReqId) return;
      content.innerHTML = "<div>Error cargando contenido</div>";
      ProductosUiState.mainSlideLoading = false;
    });
}
/* ======= FIN · OPEN PRODUCTOS SLIDE CON TIPO DE LAYOUT ======= */

function closeProductosSlide_() {
  const overlay = document.getElementById("prodSlideOverlay");
  const panel = document.getElementById("prodSlidePanel");
  const content = document.getElementById("prodSlideContent");
  const subSlide = document.getElementById("prodSubSlide");
  const subContent = document.getElementById("prodSubSlideContent");

  if (!overlay || !panel) return;

  ProductosUiState.mainSlideReqId++;
  ProductosUiState.subSlideReqId++;
  ProductosUiState.mainSlideLoading = false;
  ProductosUiState.subSlideLoading = false;

  panel.classList.remove("is-subslide-open");

  if (subSlide) {
    subSlide.classList.remove("is-active");
    subSlide.setAttribute("aria-hidden", "true");
  }

  if (subContent) {
    subContent.innerHTML = "";
  }

  if (content) {
    content.innerHTML = "";
  }

  overlay.classList.remove("is-active");
  panel.classList.remove("is-active");
  panel.setAttribute("aria-hidden", "true");
}

/* ======= FIN · SLIDE CONTROL ======= */

/* ======= INICIO · SLIDE NUEVO PRODUCTO ======= */
function openProductosCreateProductSlide_() {
  const overlay = document.getElementById("prodCreateProductOverlay");
  const panel = document.getElementById("prodCreateProductPanel");
  const content = document.getElementById("prodCreateProductContent");

  if (!overlay || !panel || !content) return;

  content.innerHTML = `<div class="prodSlideLoading">Cargando contenido...</div>`;

  overlay.classList.add("is-active");
  panel.classList.add("is-active");
  panel.setAttribute("aria-hidden", "false");

  fetch("/partials/prod-slide-crear-producto.html?_t=" + Date.now())
    .then((res) => res.text())
    .then((html) => {
      content.innerHTML = html;
      loadProductosCreateProductFinancialScenarios_();
      wireProductosCreateProductSubSlideUi_();
      closeProductosCreateProductSubSlide_();
    })
    .catch(() => {
      content.innerHTML = `<div class="prodSlideLoading">Error cargando el formulario de creación de producto.</div>`;
    });
}

function closeProductosCreateProductSlide_() {
  const overlay = document.getElementById("prodCreateProductOverlay");
  const panel = document.getElementById("prodCreateProductPanel");
  const content = document.getElementById("prodCreateProductContent");

  closeProductosCreateProductSubSlide_();

  if (content) {
    content.innerHTML = "";
  }

  if (overlay) {
    overlay.classList.remove("is-active");
  }

  if (panel) {
    panel.classList.remove("is-active");
    panel.setAttribute("aria-hidden", "true");
  }
}

/* ======= INICIO · SUB-SLIDE CARGA LOTE / NUEVO PRODUCTO ======= */
function openProductosCreateProductSubSlide_(title, partialPath) {
  const panel = document.getElementById("prodCreateProductPanel");
  const subSlide = document.getElementById("prodCreateProductSubSlide");
  const subTitle = document.getElementById("prodCreateProductSubSlideTitle");
  const subContent = document.getElementById("prodCreateProductSubSlideContent");

  if (!panel || !subSlide || !subContent) return;

  if (subTitle) {
    subTitle.textContent = title || "Detalle";
  }

  subContent.innerHTML = `
    <div class="prodCreateProductSubSlide__loading">
      Cargando contenido...
    </div>
  `;

  panel.classList.add("is-subslide-open");
  subSlide.classList.add("is-active");
  subSlide.setAttribute("aria-hidden", "false");

  fetch(partialPath + "?_t=" + Date.now())
  .then((res) => res.text())
  .then(async (html) => {
    subContent.innerHTML = html;

    wireProductosCreateProductSubSlideUi_();
    wireProductosLoteSkuDelegation_();

    if (partialPath.includes("prod-subslide-cargar-lote.html")) {
      await loadProductosLoteSkuOptions_();
    }
  })
  .catch(() => {
    subContent.innerHTML = `
      <div class="prodCreateProductSubSlide__error">
        Error cargando el sub-slide de lotes.
      </div>
    `;
  });
}

function closeProductosCreateProductSubSlide_() {
  const panel = document.getElementById("prodCreateProductPanel");
  const subSlide = document.getElementById("prodCreateProductSubSlide");
  const subContent = document.getElementById("prodCreateProductSubSlideContent");

  if (panel) {
    panel.classList.remove("is-subslide-open");
  }

  if (subSlide) {
    subSlide.classList.remove("is-active");
    subSlide.setAttribute("aria-hidden", "true");
  }

  if (subContent) {
    subContent.innerHTML = "";
  }
}

/* ======= INICIO · CARGA DE LOTE · SUB-SLIDE ======= */

function getProductosLotePayload_() {
  const loteIdEl = document.getElementById("prodLoteId");
  const fechaCompraEl = document.getElementById("prodLoteFechaCompra");
  const fechaRecepcionEl = document.getElementById("prodLoteFechaRecepcion");
  const proveedorEl = document.getElementById("prodLoteProveedor");
  const tipoCompraEl = document.getElementById("prodLoteTipoCompra");
  const usuarioCargaEl = document.getElementById("prodLoteUsuarioCarga");

  const monedaEl = document.getElementById("prodLoteMoneda");
  const tipoCambioEl = document.getElementById("prodLoteTipoCambio");
  const costoEnvioEl = document.getElementById("prodLoteCostoEnvio");
  const otrosCostosEl = document.getElementById("prodLoteOtrosCostos");

  const compTipoEl = document.getElementById("prodLoteCompTipo");
  const compNumeroEl = document.getElementById("prodLoteCompNumero");
  const compUrlEl = document.getElementById("prodLoteCompUrl");

  const doc1TipoEl = document.getElementById("prodLoteDoc1Tipo");
  const doc1NumeroEl = document.getElementById("prodLoteDoc1Numero");
  const doc1UrlEl = document.getElementById("prodLoteDoc1Url");

  const doc2TipoEl = document.getElementById("prodLoteDoc2Tipo");
  const doc2NumeroEl = document.getElementById("prodLoteDoc2Numero");
  const doc2UrlEl = document.getElementById("prodLoteDoc2Url");

  const estadoIngresoEl = document.getElementById("prodLoteEstadoIngreso");
  const observacionesGeneralesEl = document.getElementById("prodLoteObservacionesGenerales");

  const skuRows = Array.from(document.querySelectorAll(".prodLoteSkuItem"));

  const skus = skuRows.map((row, index) => {
    const line = String(row.getAttribute("data-sku-line") || (index + 1)).trim();

    const skuEl = document.getElementById(`prodLoteSku_${line}`);
    const nombreEl = document.getElementById(`prodLoteNombreRaw_${line}`);
    const cantidadEl = document.getElementById(`prodLoteCantidad_${line}`);
    const costoEl = document.getElementById(`prodLoteCostoUnitario_${line}`);
    const obsEl = document.getElementById(`prodLoteObsLinea_${line}`);

    return {
      sku: String(skuEl && skuEl.value || "").trim(),
      nombre_producto_raw: String(nombreEl && nombreEl.value || "").trim(),
      cantidad: Number(String(cantidadEl && cantidadEl.value || "").replace(",", ".")) || 0,
      costo_unitario_compra: Number(String(costoEl && costoEl.value || "").replace(",", ".")) || 0,
      observaciones_linea: String(obsEl && obsEl.value || "").trim()
    };
  }).filter(item =>
    item.sku ||
    item.nombre_producto_raw ||
    item.cantidad ||
    item.costo_unitario_compra ||
    item.observaciones_linea
  );

  return {
    lote_id: String(loteIdEl && loteIdEl.value || "").trim(),
    fecha_compra: String(fechaCompraEl && fechaCompraEl.value || "").trim(),
    fecha_recepcion: String(fechaRecepcionEl && fechaRecepcionEl.value || "").trim(),
    proveedor: String(proveedorEl && proveedorEl.value || "").trim(),
    tipo_compra: String(tipoCompraEl && tipoCompraEl.value || "").trim(),
    creado_por: String(usuarioCargaEl && usuarioCargaEl.value || "").trim(),

    moneda: String(monedaEl && monedaEl.value || "").trim(),
    tipo_cambio: Number(String(tipoCambioEl && tipoCambioEl.value || "").replace(",", ".")) || 0,
    costo_envio_lote: Number(String(costoEnvioEl && costoEnvioEl.value || "").replace(",", ".")) || 0,
    otros_costos_lote: Number(String(otrosCostosEl && otrosCostosEl.value || "").replace(",", ".")) || 0,

    comprobante_principal_tipo: String(compTipoEl && compTipoEl.value || "").trim(),
    comprobante_principal_numero: String(compNumeroEl && compNumeroEl.value || "").trim(),
    comprobante_principal_url: String(compUrlEl && compUrlEl.value || "").trim(),

    doc_secundario_1_tipo: String(doc1TipoEl && doc1TipoEl.value || "").trim(),
    doc_secundario_1_numero: String(doc1NumeroEl && doc1NumeroEl.value || "").trim(),
    doc_secundario_1_url: String(doc1UrlEl && doc1UrlEl.value || "").trim(),

    doc_secundario_2_tipo: String(doc2TipoEl && doc2TipoEl.value || "").trim(),
    doc_secundario_2_numero: String(doc2NumeroEl && doc2NumeroEl.value || "").trim(),
    doc_secundario_2_url: String(doc2UrlEl && doc2UrlEl.value || "").trim(),

    estado_ingreso: String(estadoIngresoEl && estadoIngresoEl.value || "pendiente").trim(),
    observaciones_generales: String(observacionesGeneralesEl && observacionesGeneralesEl.value || "").trim(),

    skus: skus
  };
}

function validarProductosLotePayload_(payload) {
  if (!payload.lote_id) {
    throw new Error("Debes completar el Lote ID.");
  }

  if (!payload.proveedor) {
    throw new Error("Debes completar el proveedor.");
  }

  if (!payload.fecha_compra) {
    throw new Error("Debes completar la fecha de compra.");
  }

  if (!payload.tipo_compra) {
    throw new Error("Debes seleccionar el tipo de compra.");
  }

  if (!payload.moneda) {
    throw new Error("Debes seleccionar la moneda.");
  }

  if (!Array.isArray(payload.skus) || !payload.skus.length) {
    throw new Error("Debes cargar al menos una línea SKU.");
  }

  payload.skus.forEach((item, index) => {
    const fila = index + 1;

    if (!item.sku && !item.nombre_producto_raw) {
      throw new Error("La línea SKU " + fila + " no tiene SKU ni nombre.");
    }

    if (!(item.cantidad > 0)) {
      throw new Error("La línea SKU " + fila + " tiene una cantidad inválida.");
    }

    if (!(item.costo_unitario_compra > 0)) {
      throw new Error("La línea SKU " + fila + " tiene un costo unitario inválido.");
    }
  });
}

async function enviarLoteAlBackend_(payload) {
  const query = new URLSearchParams({
    action: "processIngresoLoteTest",
    payload: JSON.stringify(payload),
    _t: String(Date.now())
  });

  const url = `${PRODUCTOS_BACKEND_URL}?${query.toString()}`;
  const res = await jsonp(url, { retries: 0, cacheTtlMs: 0, timeoutMs: 20000 });

  if (!res || res.ok !== true) {
    throw new Error(res && res.error ? String(res.error) : "No se pudo procesar el lote.");
  }

  return res;
}

function clearProductosLoteForm_() {
  const ids = [
    "prodLoteId",
    "prodLoteProveedor",
    "prodLoteFechaCompra",
    "prodLoteFechaRecepcion",
    "prodLoteTipoCompra",
    "prodLoteUsuarioCarga",
    "prodLoteMoneda",
    "prodLoteTipoCambio",
    "prodLoteCostoEnvio",
    "prodLoteOtrosCostos",
    "prodLoteCompTipo",
    "prodLoteCompNumero",
    "prodLoteCompUrl",
    "prodLoteDoc1Tipo",
    "prodLoteDoc1Numero",
    "prodLoteDoc1Url",
    "prodLoteDoc2Tipo",
    "prodLoteDoc2Numero",
    "prodLoteDoc2Url",
    "prodLoteEstadoIngreso",
    "prodLoteObservacionesGenerales"
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.tagName === "SELECT") {
      if (id === "prodLoteEstadoIngreso") {
        el.value = "pendiente";
      } else {
        el.value = "";
      }
      return;
    }

    el.value = "";
  });

  const list = document.getElementById("prodLoteSkuList");
  if (!list) return;
  
  const rows = Array.from(list.querySelectorAll(".prodLoteSkuItem"));
  
  rows.forEach((row, index) => {
    if (index > 0) {
      row.remove();
      return;
    }
  
    const line = String(row.getAttribute("data-sku-line") || "1").trim();
  
    const skuEl = document.getElementById(`prodLoteSku_${line}`);
    const nombreEl = document.getElementById(`prodLoteNombreRaw_${line}`);
    const cantidadEl = document.getElementById(`prodLoteCantidad_${line}`);
    const costoEl = document.getElementById(`prodLoteCostoUnitario_${line}`);
    const obsEl = document.getElementById(`prodLoteObsLinea_${line}`);
  
    if (skuEl) skuEl.value = "";
    if (nombreEl) nombreEl.value = "";
    if (cantidadEl) cantidadEl.value = "";
    if (costoEl) costoEl.value = "";
    if (obsEl) obsEl.value = "";
  });
  
  hydrateProductosLoteSkuSelects_();
}

function setProductosLoteConfirmModalMode_(mode) {
  const modal = document.getElementById("prodLoteConfirmModal");
  const iconEl = modal ? modal.querySelector(".prodLoteConfirmModal__icon") : null;
  const titleEl = modal ? modal.querySelector(".prodLoteConfirmModal__title") : null;
  const descEl = modal ? modal.querySelector(".prodLoteConfirmModal__desc") : null;
  const cancelBtn = document.getElementById("prodLoteConfirmCancelBtn");
  const confirmBtn = document.getElementById("prodLoteConfirmSubmitBtn");

  if (!modal || !iconEl || !titleEl || !descEl || !cancelBtn || !confirmBtn) return;

  if (mode === "success") {
    modal.setAttribute("data-mode", "success");
    iconEl.textContent = "✓";
    iconEl.classList.add("is-success");

    titleEl.textContent = "El lote ha sido guardado exitosamente";
    descEl.textContent = "La operación fue registrada correctamente y los datos ya impactaron en las hojas correspondientes del sistema.";

    cancelBtn.style.display = "none";
    confirmBtn.textContent = "Entendido";
    confirmBtn.disabled = false;
    return;
  }

  modal.setAttribute("data-mode", "confirm");
  iconEl.textContent = "i";
  iconEl.classList.remove("is-success");

  titleEl.textContent = "Confirma el ingreso del lote";
  descEl.textContent = "Confirmas la carga de un nuevo lote de compra. Esta acción registrará la operación y luego impactará en las hojas correspondientes del sistema.";

  cancelBtn.style.display = "";
  cancelBtn.disabled = false;
  confirmBtn.textContent = "Confirmar";
  confirmBtn.disabled = false;
}

function openProductosLoteConfirmModal_() {
  const overlay = document.getElementById("prodLoteConfirmOverlay");
  const modal = document.getElementById("prodLoteConfirmModal");

  if (!overlay || !modal) return;

  setProductosLoteConfirmModalMode_("confirm");

  overlay.classList.add("is-active");
  modal.classList.add("is-active");
  modal.setAttribute("aria-hidden", "false");
}

function closeProductosLoteConfirmModal_() {
  const overlay = document.getElementById("prodLoteConfirmOverlay");
  const modal = document.getElementById("prodLoteConfirmModal");

  if (overlay) overlay.classList.remove("is-active");
  if (modal) {
    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");
    modal.removeAttribute("data-mode");
  }
}

async function confirmarCargaLote_() {
  const modal = document.getElementById("prodLoteConfirmModal");
  const confirmBtn = document.getElementById("prodLoteConfirmSubmitBtn");
  const cancelBtn = document.getElementById("prodLoteConfirmCancelBtn");
  const saveBtn = document.getElementById("prodLoteSaveBtn");

  const mode = modal ? String(modal.getAttribute("data-mode") || "confirm") : "confirm";

  if (mode === "success") {
    closeProductosLoteConfirmModal_();
    clearProductosLoteForm_();
    closeProductosCreateProductSubSlide_();

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar lote";
    }

    return;
  }

  try {
    const payload = getProductosLotePayload_();
    validarProductosLotePayload_(payload);

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Guardando...";
    }

    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }

    const res = await enviarLoteAlBackend_(payload);

    console.log("[productos.js] lote procesado OK:", res);

    setProductosLoteConfirmModalMode_("success");

  } catch (err) {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirmar";
    }

    if (cancelBtn) {
      cancelBtn.disabled = false;
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar lote";
    }

    alert(String(err && err.message ? err.message : err || "Error procesando lote."));
  }
}

/* ======= FIN · CARGA DE LOTE · SUB-SLIDE ======= */

/* ======= INICIO · SKUS DINÁMICOS · SUB-SLIDE LOTE ======= */

const ProductosLoteState = {
  skusLoaded: false,
  skusLoading: false,
  skusOptions: []
};

function escapeAttr_(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function loadProductosLoteSkuOptions_() {
  if (ProductosLoteState.skusLoading) return;
  if (ProductosLoteState.skusLoaded) {
    hydrateProductosLoteSkuSelects_();
    return;
  }

  ProductosLoteState.skusLoading = true;

  try {
    const url = `${PRODUCTOS_BACKEND_URL}?action=getProductos&_t=${Date.now()}`;
    const res = await jsonp(url, { retries: 0, cacheTtlMs: 0, timeoutMs: 20000 });

    if (!res || res.ok !== true || !Array.isArray(res.productos)) {
      throw new Error(res && res.error ? String(res.error) : "No se pudieron cargar los SKUs.");
    }

    ProductosLoteState.skusOptions = res.productos.map((item) => ({
      sku: String(item && item.sku || "").trim(),
      nombre: String(item && item.nombre || "").trim()
    })).filter(item => item.sku);

    ProductosLoteState.skusLoaded = true;
    hydrateProductosLoteSkuSelects_();
  } catch (err) {
    console.error("[productos.js] error cargando SKUs para lote:", err);
    alert("No se pudieron cargar los SKUs para el lote.");
  } finally {
    ProductosLoteState.skusLoading = false;
  }
}

function buildProductosLoteSkuOptionsHtml_(selectedValue) {
  const current = String(selectedValue || "").trim();

  return [
    `<option value="">Seleccionar SKU</option>`,
    ...ProductosLoteState.skusOptions.map(item => {
      const selected = item.sku === current ? "selected" : "";
      return `<option value="${escapeAttr_(item.sku)}" ${selected}>${escapeHtml_(item.sku)} — ${escapeHtml_(item.nombre)}</option>`;
    })
  ].join("");
}

function hydrateProductosLoteSkuSelects_() {
  const selects = Array.from(document.querySelectorAll('[id^="prodLoteSku_"]'));

  selects.forEach((select) => {
    const currentValue = String(select.value || "").trim();
    select.innerHTML = buildProductosLoteSkuOptionsHtml_(currentValue);
  });

  mountAllProductosLoteSkuDropdowns_();
}

function mountProductosLoteSkuDropdown_(line) {
  const nativeSelect = document.getElementById(`prodLoteSku_${line}`);
  const wrap = document.getElementById(`prodLoteSkuWrap_${line}`);
  const trigger = document.getElementById(`prodLoteSkuTrigger_${line}`);
  const dropdown = document.getElementById(`prodLoteSkuDropdown_${line}`);

  if (!nativeSelect || !wrap || !trigger || !dropdown) return;
  if (!window.ProtocolDropdowns || typeof window.ProtocolDropdowns.mount !== "function") return;

  window.ProtocolDropdowns.mount({
    id: `prodLoteSku_${line}`,
    wrapId: `prodLoteSkuWrap_${line}`,
    nativeSelectId: `prodLoteSku_${line}`,
    triggerId: `prodLoteSkuTrigger_${line}`,
    dropdownId: `prodLoteSkuDropdown_${line}`,
    separator: "—",
    placeholder: "Seleccionar SKU"
  });
}

function mountAllProductosLoteSkuDropdowns_() {
  const skuRows = Array.from(document.querySelectorAll(".prodLoteSkuItem"));

  skuRows.forEach((row, index) => {
    const line = String(row.getAttribute("data-sku-line") || (index + 1)).trim();
    mountProductosLoteSkuDropdown_(line);
  });
}

function getProductoNombreBySku_(sku) {
  const cleanSku = String(sku || "").trim();
  if (!cleanSku) return "";

  const match = ProductosLoteState.skusOptions.find(item => item.sku === cleanSku);
  return match ? match.nombre : "";
}

function syncProductosLoteNombreFromSku_(line) {
  const skuEl = document.getElementById(`prodLoteSku_${line}`);
  const nombreEl = document.getElementById(`prodLoteNombreRaw_${line}`);

  if (!skuEl || !nombreEl) return;

  const nombre = getProductoNombreBySku_(skuEl.value);
  nombreEl.value = nombre || "";
}


function createProductosLoteSkuRowHtml_(line) {
  return `
    <div class="prodLoteSkuItem" data-sku-line="${line}">
      <div class="prodLoteSkuItem__top">
        <div class="prodLoteSkuItem__title">SKU entrante ${line}</div>

        <button
          type="button"
          class="prodLoteSkuItem__removeBtn"
          data-remove-sku-line="${line}"
          aria-label="Eliminar SKU entrante ${line}"
          title="Eliminar SKU"
        >
          ×
        </button>
      </div>

      <div class="prodLoteFields prodLoteFields--two">
        <div class="prodLoteField">
          <label for="prodLoteSku_${line}" class="prodLoteField__label">SKU</label>

          <div class="pdDropdown" id="prodLoteSkuWrap_${line}">
            <select id="prodLoteSku_${line}" class="prodLoteField__select pdDropdown__native">
              <option value="">Seleccionar SKU</option>
            </select>

            <button
              type="button"
              class="pdDropdown__trigger"
              id="prodLoteSkuTrigger_${line}"
              aria-expanded="false"
              aria-haspopup="listbox"
            ></button>

            <div
              class="pdDropdown__dropdown"
              id="prodLoteSkuDropdown_${line}"
              role="listbox"
            ></div>
          </div>
        </div>

        <div class="prodLoteField">
          <label for="prodLoteNombreRaw_${line}" class="prodLoteField__label">Nombre producto</label>
          <input type="text" id="prodLoteNombreRaw_${line}" class="prodLoteField__input" placeholder="Se completará según SKU" />
        </div>

        <div class="prodLoteField">
          <label for="prodLoteCantidad_${line}" class="prodLoteField__label">Cantidad</label>
          <input type="number" id="prodLoteCantidad_${line}" class="prodLoteField__input" placeholder="Ej: 50" />
        </div>

        <div class="prodLoteField">
          <label for="prodLoteCostoUnitario_${line}" class="prodLoteField__label">Costo unitario compra</label>
          <input type="number" id="prodLoteCostoUnitario_${line}" class="prodLoteField__input" placeholder="Ej: 1250" />
        </div>

        <div class="prodLoteField prodLoteField--wide">
          <label for="prodLoteObsLinea_${line}" class="prodLoteField__label">Observaciones línea</label>
          <input type="text" id="prodLoteObsLinea_${line}" class="prodLoteField__input" placeholder="Ej: llegó incompleto / variante especial / observación interna" />
        </div>
      </div>
    </div>
  `;
}

function addProductosLoteSkuRow_() {
  const list = document.getElementById("prodLoteSkuList");
  if (!list) return;

  const rows = Array.from(list.querySelectorAll(".prodLoteSkuItem"));
  const nextLine = rows.length + 1;

  list.insertAdjacentHTML("beforeend", createProductosLoteSkuRowHtml_(nextLine));
  hydrateProductosLoteSkuSelects_();
}

function removeProductosLoteSkuRow_(line) {
  const list = document.getElementById("prodLoteSkuList");
  if (!list) return;

  const rows = Array.from(list.querySelectorAll(".prodLoteSkuItem"));
  if (rows.length <= 1) return;

  const target = list.querySelector(`.prodLoteSkuItem[data-sku-line="${line}"]`);
  if (!target) return;

  target.remove();

  const remainingRows = Array.from(list.querySelectorAll(".prodLoteSkuItem"));
  remainingRows.forEach((row, index) => {
    const newLine = String(index + 1);

    row.setAttribute("data-sku-line", newLine);

    const titleEl = row.querySelector(".prodLoteSkuItem__title");
    if (titleEl) {
      titleEl.textContent = `SKU entrante ${newLine}`;
    }

    const removeBtn = row.querySelector(".prodLoteSkuItem__removeBtn");
    if (removeBtn) {
      removeBtn.setAttribute("data-remove-sku-line", newLine);
      removeBtn.setAttribute("aria-label", `Eliminar SKU entrante ${newLine}`);
    }

    const skuLabel = row.querySelector(`label[for^="prodLoteSku_"]`);
    const nombreLabel = row.querySelector(`label[for^="prodLoteNombreRaw_"]`);
    const cantidadLabel = row.querySelector(`label[for^="prodLoteCantidad_"]`);
    const costoLabel = row.querySelector(`label[for^="prodLoteCostoUnitario_"]`);
    const obsLabel = row.querySelector(`label[for^="prodLoteObsLinea_"]`);

    const wrapEl = row.querySelector(`[id^="prodLoteSkuWrap_"]`);
    const skuEl = row.querySelector(`[id^="prodLoteSku_"]`);
    const triggerEl = row.querySelector(`[id^="prodLoteSkuTrigger_"]`);
    const dropdownEl = row.querySelector(`[id^="prodLoteSkuDropdown_"]`);
    const nombreEl = row.querySelector(`[id^="prodLoteNombreRaw_"]`);
    const cantidadEl = row.querySelector(`[id^="prodLoteCantidad_"]`);
    const costoEl = row.querySelector(`[id^="prodLoteCostoUnitario_"]`);
    const obsEl = row.querySelector(`[id^="prodLoteObsLinea_"]`);

    if (wrapEl) wrapEl.id = `prodLoteSkuWrap_${newLine}`;
    if (skuEl) skuEl.id = `prodLoteSku_${newLine}`;
    if (triggerEl) triggerEl.id = `prodLoteSkuTrigger_${newLine}`;
    if (dropdownEl) dropdownEl.id = `prodLoteSkuDropdown_${newLine}`;
    if (nombreEl) nombreEl.id = `prodLoteNombreRaw_${newLine}`;
    if (cantidadEl) cantidadEl.id = `prodLoteCantidad_${newLine}`;
    if (costoEl) costoEl.id = `prodLoteCostoUnitario_${newLine}`;
    if (obsEl) obsEl.id = `prodLoteObsLinea_${newLine}`;

    if (skuLabel) skuLabel.setAttribute("for", `prodLoteSku_${newLine}`);
    if (nombreLabel) nombreLabel.setAttribute("for", `prodLoteNombreRaw_${newLine}`);
    if (cantidadLabel) cantidadLabel.setAttribute("for", `prodLoteCantidad_${newLine}`);
    if (costoLabel) costoLabel.setAttribute("for", `prodLoteCostoUnitario_${newLine}`);
    if (obsLabel) obsLabel.setAttribute("for", `prodLoteObsLinea_${newLine}`);
  });

  hydrateProductosLoteSkuSelects_();
}

function wireProductosLoteSkuDelegation_() {
  const root = document.getElementById("prodCreateProductSubSlideContent");
  if (!root || root.dataset.loteSkuDelegationBound === "1") return;

  root.dataset.loteSkuDelegationBound = "1";

  root.addEventListener("change", (event) => {
    const target = event.target;

    if (target && target.id && target.id.startsWith("prodLoteSku_")) {
      const line = String(target.id).replace("prodLoteSku_", "").trim();
      syncProductosLoteNombreFromSku_(line);
    }
  });

  root.addEventListener("click", (event) => {
    const addBtn = event.target.closest("#prodLoteAddSkuBtn");
    if (addBtn) {
      event.preventDefault();
      addProductosLoteSkuRow_();
      return;
    }
  
    const removeBtn = event.target.closest(".prodLoteSkuItem__removeBtn");
    if (removeBtn) {
      event.preventDefault();
      const line = String(removeBtn.getAttribute("data-remove-sku-line") || "").trim();
      removeProductosLoteSkuRow_(line);
    }
  });
}

/* ======= FIN · SKUS DINÁMICOS · SUB-SLIDE LOTE ======= */

function wireProductosCreateProductSubSlideUi_() {
  const backBtn = document.getElementById("prodCreateProductSubSlideBackBtn");
  const closeBtn = document.getElementById("prodCreateProductSubSlideCloseBtn");

  const saveBtn = document.getElementById("prodLoteSaveBtn");
  const clearBtn = document.getElementById("prodLoteClearBtn");

  const confirmOverlay = document.getElementById("prodLoteConfirmOverlay");
  const confirmCancelBtn = document.getElementById("prodLoteConfirmCancelBtn");
  const confirmSubmitBtn = document.getElementById("prodLoteConfirmSubmitBtn");

  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "1";
    backBtn.addEventListener("click", closeProductosCreateProductSubSlide_);
  }

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", closeProductosCreateProductSubSlide_);
  }

  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = "1";
    clearBtn.addEventListener("click", clearProductosLoteForm_);
  }

  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = "1";
    saveBtn.addEventListener("click", () => {
      try {
        const payload = getProductosLotePayload_();
        validarProductosLotePayload_(payload);
        openProductosLoteConfirmModal_();
      } catch (err) {
        alert(String(err && err.message ? err.message : err || "Error validando lote."));
      }
    });
  }

  if (confirmOverlay && !confirmOverlay.dataset.bound) {
    confirmOverlay.dataset.bound = "1";
    confirmOverlay.addEventListener("click", closeProductosLoteConfirmModal_);
  }

  if (confirmCancelBtn && !confirmCancelBtn.dataset.bound) {
    confirmCancelBtn.dataset.bound = "1";
    confirmCancelBtn.addEventListener("click", () => {
      const modal = document.getElementById("prodLoteConfirmModal");
      const mode = modal ? String(modal.getAttribute("data-mode") || "confirm") : "confirm";
  
      if (mode === "confirm") {
        closeProductosLoteConfirmModal_();
      }
    });
  }

  if (confirmSubmitBtn && !confirmSubmitBtn.dataset.bound) {
    confirmSubmitBtn.dataset.bound = "1";
    confirmSubmitBtn.addEventListener("click", confirmarCargaLote_);
  }
}
/* ======= FIN · SUB-SLIDE CARGA LOTE / NUEVO PRODUCTO ======= */

function wireProductosCreateProductSlide_() {
  const newProductBtn = document.getElementById("prodNewProductBtn");
  const overlay = document.getElementById("prodCreateProductOverlay");
  const closeBtn = document.getElementById("prodCreateProductCloseBtn");
  const volumeBtn = document.getElementById("prodCreateProductVolumeBtn");

  if (newProductBtn && !newProductBtn.dataset.bound) {
    newProductBtn.dataset.bound = "1";
    newProductBtn.addEventListener("click", openProductosCreateProductSlide_);
  }

  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", closeProductosCreateProductSlide_);
  }

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", closeProductosCreateProductSlide_);
  }

  if (volumeBtn && !volumeBtn.dataset.bound) {
    volumeBtn.dataset.bound = "1";
    volumeBtn.addEventListener("click", () => {
      openProductosCreateProductSubSlide_(
        "Carga de lote",
        "/partials/prod-subslide-cargar-lote.html"
      );
    });
  }
}


/* ======= FIN · SLIDE NUEVO PRODUCTO ======= */




/* ======= INICIO · LÓGICA FORMULARIO NUEVO SKU ======= */

function getProductosCreateProductEls_() {
  return {
    sku: document.getElementById("prodSkuCreateSku"),
    nombre: document.getElementById("prodSkuCreateNombre"),
    costoProveedor: document.getElementById("prodSkuCreateCostoProveedor"),
    costoHandling: document.getElementById("prodSkuCreateCostoHandling"),
    cpa: document.getElementById("prodSkuCreateCpa"),
    envio: document.getElementById("prodSkuCreateEnvio"),
    margen: document.getElementById("prodSkuCreateMargen"),
    escenario: document.getElementById("prodSkuCreateEscenario"),
    clearBtn: document.getElementById("prodSkuFooterClearBtn") || document.querySelector(".prodSkuFooter__secondaryBtn"),
    saveBtn: document.getElementById("prodSkuFooterSaveBtn") || document.querySelector(".prodSkuFooter__primaryBtn")
  };
}

function parseProductosCreateProductNumber_(value) {
  const normalized = String(value || "").replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function getProductosCreateProductPayload_() {
  const els = getProductosCreateProductEls_();

  return {
    sku: String(els.sku && els.sku.value || "").trim(),
    nombre_producto: String(els.nombre && els.nombre.value || "").trim(),
    costo_proveedor: parseProductosCreateProductNumber_(els.costoProveedor && els.costoProveedor.value),
    costo_handling: parseProductosCreateProductNumber_(els.costoHandling && els.costoHandling.value),
    cpa_costo: parseProductosCreateProductNumber_(els.cpa && els.cpa.value),
    costo_envio_promedio: parseProductosCreateProductNumber_(els.envio && els.envio.value),
    margen_pretendido_pct: parseProductosCreateProductNumber_(els.margen && els.margen.value),
    escenario_financiero_id: String(els.escenario && els.escenario.value || "").trim()
  };
}

function validateProductosCreateProductPayload_(payload) {
  if (!payload.sku) {
    return { ok: false, message: "Debes completar el SKU." };
  }

  if (!payload.nombre_producto) {
    return { ok: false, message: "Debes completar el nombre del producto." };
  }

  if (!(payload.costo_proveedor > 0)) {
    return { ok: false, message: "Debes completar el costo proveedor." };
  }

  if (!(payload.costo_handling >= 0)) {
    return { ok: false, message: "Debes completar el costo handling." };
  }

  if (!(payload.cpa_costo >= 0)) {
    return { ok: false, message: "Debes completar el CPA costo." };
  }

  if (!(payload.costo_envio_promedio >= 0)) {
    return { ok: false, message: "Debes completar el costo envío promedio." };
  }

  if (!(payload.margen_pretendido_pct > 0)) {
    return { ok: false, message: "Debes completar el margen pretendido." };
  }

  if (!payload.escenario_financiero_id) {
    return { ok: false, message: "Debes seleccionar un escenario financiero." };
  }

  return { ok: true };
}

function resetProductosCreateProductForm_() {
  const els = getProductosCreateProductEls_();

  if (els.sku) els.sku.value = "";
  if (els.nombre) els.nombre.value = "";
  if (els.costoProveedor) els.costoProveedor.value = "";
  if (els.costoHandling) els.costoHandling.value = "";
  if (els.cpa) els.cpa.value = "";
  if (els.envio) els.envio.value = "";
  if (els.margen) els.margen.value = "";
  if (els.escenario) els.escenario.value = "";

  ProductosCreateSkuState.pendingPayload = null;
}

function openProductosCreateSkuConfirmModal_(payload) {
  const overlay = document.getElementById("prodSkuConfirmOverlay");
  const modal = document.getElementById("prodSkuConfirmModal");
  const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");
  const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");
  const dialog = modal ? modal.querySelector(".prodSkuConfirmModal__dialog") : null;

  if (!overlay || !modal || !cancelBtn || !confirmBtn) return;

  ProductosCreateSkuState.pendingPayload = payload;

  overlay.classList.add("is-active");
  modal.classList.add("is-active");
  modal.setAttribute("aria-hidden", "false");

  if (overlay._skuConfirmCloseHandler) {
    overlay.removeEventListener("click", overlay._skuConfirmCloseHandler);
  }

  if (cancelBtn._skuConfirmCloseHandler) {
    cancelBtn.removeEventListener("click", cancelBtn._skuConfirmCloseHandler);
  }

  if (confirmBtn._skuConfirmSubmitHandler) {
    confirmBtn.removeEventListener("click", confirmBtn._skuConfirmSubmitHandler);
  }

  if (dialog && dialog._skuConfirmStopHandler) {
    dialog.removeEventListener("click", dialog._skuConfirmStopHandler);
  }

  overlay._skuConfirmCloseHandler = function () {
    closeProductosCreateSkuConfirmModal_();
  };

  cancelBtn._skuConfirmCloseHandler = function (event) {
    event.preventDefault();
    closeProductosCreateSkuConfirmModal_();
  };

  confirmBtn._skuConfirmSubmitHandler = function (event) {
    event.preventDefault();
    confirmProductosCreateSkuSave_();
  };

  if (dialog) {
    dialog._skuConfirmStopHandler = function (event) {
      event.stopPropagation();
    };
    dialog.addEventListener("click", dialog._skuConfirmStopHandler);
  }

  overlay.addEventListener("click", overlay._skuConfirmCloseHandler);
  cancelBtn.addEventListener("click", cancelBtn._skuConfirmCloseHandler);
  confirmBtn.addEventListener("click", confirmBtn._skuConfirmSubmitHandler);
}

function closeProductosCreateSkuConfirmModal_() {
  const overlay = document.getElementById("prodSkuConfirmOverlay");
  const modal = document.getElementById("prodSkuConfirmModal");
  const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");
  const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");
  const dialog = modal ? modal.querySelector(".prodSkuConfirmModal__dialog") : null;

  if (overlay) {
    overlay.classList.remove("is-active");
    if (overlay._skuConfirmCloseHandler) {
      overlay.removeEventListener("click", overlay._skuConfirmCloseHandler);
      overlay._skuConfirmCloseHandler = null;
    }
  }

  if (cancelBtn && cancelBtn._skuConfirmCloseHandler) {
    cancelBtn.removeEventListener("click", cancelBtn._skuConfirmCloseHandler);
    cancelBtn._skuConfirmCloseHandler = null;
  }

  if (confirmBtn && confirmBtn._skuConfirmSubmitHandler) {
    confirmBtn.removeEventListener("click", confirmBtn._skuConfirmSubmitHandler);
    confirmBtn._skuConfirmSubmitHandler = null;
  }

  if (dialog && dialog._skuConfirmStopHandler) {
    dialog.removeEventListener("click", dialog._skuConfirmStopHandler);
    dialog._skuConfirmStopHandler = null;
  }

  if (modal) {
    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");
  }
}

function handleProductosCreateSkuSaveClick_() {
  const payload = getProductosCreateProductPayload_();
  const validation = validateProductosCreateProductPayload_(payload);

  if (!validation.ok) {
    alert(validation.message);
    return;
  }

  openProductosCreateSkuConfirmModal_(payload);
}

async function confirmProductosCreateSkuSave_() {
  const payload = ProductosCreateSkuState.pendingPayload;
  if (!payload) return;

  const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");
  const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Guardando...";
  }

  if (cancelBtn) {
    cancelBtn.disabled = true;
  }

  try {
    const query = new URLSearchParams({
      action: "saveSku",
      sku: String(payload.sku || "").trim(),
      nombre_producto: String(payload.nombre_producto || "").trim(),
      costo_proveedor: String(payload.costo_proveedor || 0),
      costo_handling: String(payload.costo_handling || 0),
      cpa_costo: String(payload.cpa_costo || 0),
      costo_envio_promedio: String(payload.costo_envio_promedio || 0),
      margen_pretendido_pct: String(payload.margen_pretendido_pct || 0),
      escenario_financiero_id: String(payload.escenario_financiero_id || "").trim(),
      _t: String(Date.now())
    });

    const url = `${PRODUCTOS_BACKEND_URL}?${query.toString()}`;
    const res = await jsonp(url, { retries: 0, cacheTtlMs: 0 });

    if (!res || res.ok !== true) {
      throw new Error(res && res.error ? String(res.error) : "No se pudo guardar el SKU.");
    }

    console.log("[productos.js] SKU guardado correctamente:", res);

    closeProductosCreateSkuConfirmModal_();
    resetProductosCreateProductForm_();

    alert(`SKU guardado correctamente: ${payload.sku}`);
  } catch (err) {
    alert(String(err && err.message ? err.message : err || "Error guardando SKU."));
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirmar";
    }

    if (cancelBtn) {
      cancelBtn.disabled = false;
    }
  }
}

function extractFinancialScenarioOptions_(res) {
  if (!res || res.ok !== true) return [];

  const candidates = []
    .concat(Array.isArray(res.scenarios) ? res.scenarios : [])
    .concat(Array.isArray(res.escenarios) ? res.escenarios : [])
    .concat(Array.isArray(res.data) ? res.data : []);

  return candidates
    .map((item) => ({
      id: String(
        item && (
          item.id_escenario ||
          item.escenario_financiero_id ||
          item.id ||
          item.value ||
          ""
        )
      ).trim(),
      label: String(
        item && (
          item.descripcion_escenario ||
          item.escenario_financiero_resumen ||
          item.label ||
          item.nombre ||
          item.text ||
          ""
        )
      ).trim()
    }))
    .filter((item) => item.id && item.label);
}

async function loadProductosCreateProductFinancialScenarios_() {
  const els = getProductosCreateProductEls_();
  if (!els.escenario) return;

  if (ProductosCreateSkuState.scenariosLoading) return;

  ProductosCreateSkuState.scenariosLoading = true;

  try {
    const url = `${PRODUCTOS_BACKEND_URL}?action=getFinancialScenarios&_t=${Date.now()}`;
    const res = await jsonp(url);
    const options = extractFinancialScenarioOptions_(res);

    if (!options.length) return;

    els.escenario.innerHTML = `
      <option value="">Seleccionar escenario</option>
      ${options.map(item => `
        <option value="${escapeHtml_(item.id)}">${escapeHtml_(item.label)}</option>
      `).join("")}
    `;

    ProductosCreateSkuState.scenariosLoaded = true;
  } catch (err) {
    console.warn("[productos.js] No se pudieron cargar escenarios financieros del SKU", err);
  } finally {
    ProductosCreateSkuState.scenariosLoading = false;
  }
}

function wireProductosCreateSkuConfirmModal_() {
  const overlay = document.getElementById("prodSkuConfirmOverlay");
  const cancelBtn = document.getElementById("prodSkuConfirmCancelBtn");
  const confirmBtn = document.getElementById("prodSkuConfirmSubmitBtn");

  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", closeProductosCreateSkuConfirmModal_);
  }

  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = "1";
    cancelBtn.addEventListener("click", closeProductosCreateSkuConfirmModal_);
  }

  if (confirmBtn && !confirmBtn.dataset.bound) {
    confirmBtn.dataset.bound = "1";
    confirmBtn.addEventListener("click", confirmProductosCreateSkuSave_);
  }
}

function initProductosCreateProductForm_() {
  /* Inicializador reservado para futuras extensiones del formulario SKU */
}

/* ======= FIN · LÓGICA FORMULARIO NUEVO SKU ======= */

/* ======= INICIO · EVENTOS DELEGADOS · FORM SKU ======= */
function wireProductosCreateProductDelegatedUi_() {
  const content = document.getElementById("prodCreateProductContent");
  if (!content || content.dataset.bound === "1") return;

  content.dataset.bound = "1";

  content.addEventListener("click", (event) => {
    const clearBtn = event.target.closest("#prodSkuFooterClearBtn");
    if (clearBtn) {
      event.preventDefault();
      resetProductosCreateProductForm_();
      return;
    }

    const saveBtn = event.target.closest("#prodSkuFooterSaveBtn");
    if (saveBtn) {
      event.preventDefault();
      handleProductosCreateSkuSaveClick_();
      return;
    }
  });
}

function wireProductosCreateSkuConfirmDelegatedUi_() {
  /* Intencionalmente vacía.
     El modal SKU ahora se enlaza al abrirse para evitar handlers muertos. */
}
/* ======= FIN · EVENTOS DELEGADOS · FORM SKU ======= */
/* ======= INICIO · MODAL NUEVA OFERTA ======= */
const ProductosNuevaOfertaState = {
  sets: [],
  selectedId: "",
  loading: false,
  activating: false,
  saving: false,
  reqId: 0,
  currentStep: 1,
  selectedSet: null,
  activationResult: null,
  form: {
    nombre_interno: "",
    nombre_comercial: "",
    subtitulo_oferta: "",
    descripcion_corta: "",
    politica_compra: "Predeterminado",
    politica_envio: "Predeterminado",
    politica_devolucion: "Predeterminado",
    condiciones_generales: "Predeterminado",
    vigencia_desde: "",
    vigencia_hasta: ""
  }
};
function openProductosNuevaOfertaModal_() {
  const overlay = document.getElementById("prodOfferModalOverlay");
  const modal = document.getElementById("prodOfferModal");
  const content = document.getElementById("prodOfferModalContent");

  if (!overlay || !modal || !content) return;

  const reqId = ++ProductosNuevaOfertaState.reqId;

  ProductosNuevaOfertaState.selectedId = "";
  ProductosNuevaOfertaState.activating = false;
  ProductosNuevaOfertaState.saving = false;
  ProductosNuevaOfertaState.currentStep = 1;
  ProductosNuevaOfertaState.selectedSet = null;
  ProductosNuevaOfertaState.activationResult = null;
  ProductosNuevaOfertaState.form = {
    nombre_interno: "",
    nombre_comercial: "",
    subtitulo_oferta: "",
    descripcion_corta: "",
    politica_compra: "Predeterminado",
    politica_envio: "Predeterminado",
    politica_devolucion: "Predeterminado",
    condiciones_generales: "Predeterminado",
    vigencia_desde: "",
    vigencia_hasta: ""
  };

  content.innerHTML = `<div class="offerWizardLoading">Cargando nueva oferta...</div>`;

  overlay.classList.add("is-active");
  modal.classList.add("is-active");
  modal.setAttribute("aria-hidden", "false");

  fetch("/partials/conj-productos-popup-nuevaoferta.html?_t=" + Date.now())
    .then((res) => res.text())
    .then((html) => {
      if (reqId !== ProductosNuevaOfertaState.reqId) return;
      content.innerHTML = html;
      initProductosNuevaOfertaPopup_();
    })
    .catch(() => {
      if (reqId !== ProductosNuevaOfertaState.reqId) return;
      content.innerHTML = `<div class="offerWizardLoading offerWizardLoading--error">Error cargando el popup de nueva oferta.</div>`;
    });
}

function closeProductosNuevaOfertaModal_() {
  const overlay = document.getElementById("prodOfferModalOverlay");
  const modal = document.getElementById("prodOfferModal");
  const content = document.getElementById("prodOfferModalContent");

  ProductosNuevaOfertaState.reqId++;
  ProductosNuevaOfertaState.selectedId = "";
  ProductosNuevaOfertaState.activating = false;
  ProductosNuevaOfertaState.saving = false;
  ProductosNuevaOfertaState.currentStep = 1;
  ProductosNuevaOfertaState.selectedSet = null;
  ProductosNuevaOfertaState.activationResult = null;
  ProductosNuevaOfertaState.form = {
    nombre_interno: "",
    nombre_comercial: "",
    subtitulo_oferta: "",
    descripcion_corta: "",
    politica_compra: "Predeterminado",
    politica_envio: "Predeterminado",
    politica_devolucion: "Predeterminado",
    condiciones_generales: "Predeterminado",
    vigencia_desde: "",
    vigencia_hasta: ""
  };

  if (content) {
    content.innerHTML = "";
  }

  if (overlay) {
    overlay.classList.remove("is-active");
  }

  if (modal) {
    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");
  }
}

function initOfferSetSelectUi_() {
  const wrap = document.getElementById("offerSetSelectUi");
  const nativeSelect = document.getElementById("offerSetSelect");
  const trigger = document.getElementById("offerSetSelectTrigger");
  const valueEl = document.getElementById("offerSetSelectValue");
  const dropdown = document.getElementById("offerSetSelectDropdown");

  if (!wrap || !nativeSelect || !trigger || !valueEl || !dropdown) return;
  if (wrap.dataset.bound === "1") return;

  wrap.dataset.bound = "1";

  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    wrap.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", wrap.classList.contains("is-open") ? "true" : "false");
  });

  dropdown.addEventListener("click", (e) => {
    const optionBtn = e.target.closest(".offerWizardSelect__option");
    if (!optionBtn || optionBtn.disabled) return;

    const value = String(optionBtn.dataset.value || "");
    nativeSelect.value = value;

    nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    wrap.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  refreshOfferSetSelectUi_();
}

/* ======= INICIO · REFRESH VISUAL DEL DROPDOWN NUEVA OFERTA ======= */
/* Mantiene la lógica actual del popup y solo mejora el render visual del selector */

function refreshOfferSetSelectUi_() {
  const wrap = document.getElementById("offerSetSelectUi");
  const nativeSelect = document.getElementById("offerSetSelect");
  const trigger = document.getElementById("offerSetSelectTrigger");
  const valueEl = document.getElementById("offerSetSelectValue");
  const dropdown = document.getElementById("offerSetSelectDropdown");

  if (!wrap || !nativeSelect || !trigger || !valueEl || !dropdown) return;

  const options = Array.from(nativeSelect.options || []);
  const selectedValue = String(nativeSelect.value || "");
  const selectedOption = options.find((opt) => String(opt.value || "") === selectedValue);

  /* ======= INICIO · RENDER VALOR SELECCIONADO ======= */
  const fallbackLabel = options[0]
    ? String(options[0].textContent || "").trim()
    : "Selecciona un conjunto disponible";

  const selectedLabel = selectedOption
    ? String(selectedOption.textContent || "").trim()
    : fallbackLabel;

  const partsSel = selectedLabel.split("·");
  const primarySel = (partsSel[0] || "").trim();
  const secondarySel = (partsSel[1] || "").trim();

    /* ======= INICIO · RENDER VALOR SELECCIONADO CON ICONO ======= */
    valueEl.innerHTML = `
    <span style="display:flex;align-items:center;gap:10px;min-width:0;">
      <span style="width:18px;height:18px;min-width:18px;display:inline-flex;align-items:center;justify-content:center;color:#2479FF;">
        <svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px;display:block;">
          <path d="M4 8.5 12 4l8 4.5M4 8.5V15.5L12 20l8-4.5V8.5M4 8.5 12 13m8-4.5L12 13m0 0v7"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </span>

      <span style="display:flex;flex-direction:column;line-height:1.2;min-width:0;">
        <span style="font-weight:700;color:#172033;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml_(primarySel)}</span>
        <span style="font-size:12px;color:#8a94a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml_(secondarySel)}</span>
      </span>
    </span>
  `;
  /* ======= FIN · RENDER VALOR SELECCIONADO CON ICONO ======= */
  /* ======= FIN · RENDER VALOR SELECCIONADO ======= */

  trigger.disabled = !!nativeSelect.disabled;

  dropdown.innerHTML = options.map((opt) => {
    const value = String(opt.value || "");
    const label = String(opt.textContent || "").trim();
    const selectedClass = value === selectedValue ? " is-selected" : "";
    const disabledAttr = opt.disabled ? " disabled" : "";

    /* ======= INICIO · RENDER VISUAL OPCION DROPDOWN NUEVA OFERTA ======= */
    const parts = label.split("·");
    const primary = (parts[0] || "").trim();
    const secondary = (parts[1] || "").trim();

    return `
      <button
        type="button"
        class="offerWizardSelect__option${selectedClass}"
        data-value="${escapeHtml_(value)}"
        ${disabledAttr}
      >
        <span class="offerWizardSelect__optionInner">
          <span class="offerWizardSelect__icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 8.5 12 4l8 4.5M4 8.5V15.5L12 20l8-4.5V8.5M4 8.5 12 13m8-4.5L12 13m0 0v7"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </span>

          <span class="offerWizardSelect__text">
            <span class="offerWizardSelect__primary">${escapeHtml_(primary)}</span>
            <span class="offerWizardSelect__secondary">${escapeHtml_(secondary)}</span>
          </span>
        </span>
      </button>
    `;
    /* ======= FIN · RENDER VISUAL OPCION DROPDOWN NUEVA OFERTA ======= */
  }).join("");
}
/* ======= FIN · REFRESH VISUAL DEL DROPDOWN NUEVA OFERTA ======= */

async function initProductosNuevaOfertaPopup_() {
  initOfferSetSelectUi_();
  wireProductosNuevaOfertaPopupUi_();
  await loadProductosNuevaOfertaSets_();
}

function wireProductosNuevaOfertaPopupUi_() {
  const selectEl = document.getElementById("offerSetSelect");
  const nextBtn = document.getElementById("offerSetNextBtn");

  if (selectEl && !selectEl.dataset.bound) {
    selectEl.dataset.bound = "1";
    selectEl.addEventListener("change", () => {
      ProductosNuevaOfertaState.selectedId = String(selectEl.value || "").trim();
      refreshOfferSetSelectUi_();
      renderProductosNuevaOfertaSelectedSet_();
    });
  }

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "1";
    nextBtn.addEventListener("click", handleProductosNuevaOfertaStep1Next_);
  }
}

async function loadProductosNuevaOfertaSets_() {
  if (ProductosNuevaOfertaState.loading) return;

  const selectEl = document.getElementById("offerSetSelect");
  const statusEl = document.getElementById("offerWizardStatus");

  ProductosNuevaOfertaState.loading = true;

  if (selectEl) {
    selectEl.innerHTML = `<option value="">Cargando conjuntos disponibles...</option>`;
    selectEl.disabled = true;
  }

  if (statusEl) {
    statusEl.textContent = "Cargando conjuntos disponibles...";
    statusEl.className = "offerWizard__status";
  }

  try {
    let sets = [];

    if (ProductosState.productSetsLoaded && Array.isArray(ProductosState.productSets) && ProductosState.productSets.length) {
      sets = ProductosState.productSets.slice();
    } else {
      const url = `${PRODUCTOS_BACKEND_URL}?action=getProductSets&_t=${Date.now()}`;
      const res = await jsonp(url);
      sets = res && res.ok === true && Array.isArray(res.sets) ? res.sets : [];
    }

    ProductosNuevaOfertaState.sets = sets
      .map((item) => ({
        id_variante: String(item.id_variante || "").trim(),
        tipo_oferta: String(item.tipo_oferta || "").trim().toLowerCase(),
        composicion_resumen: String(item.composicion_resumen || "").trim(),
        costo_productos: Number(item.costo_productos || 0) || 0,
        base_operativa_pack: Number(item.base_operativa_pack || 0) || 0,
        precio_final_pack: Number(item.precio_final_pack || 0) || 0,
        escenario_financiero_id: String(item.escenario_financiero_id || "").trim()
      }))
      .filter((item) => item.id_variante)
      .sort((a, b) => a.id_variante.localeCompare(b.id_variante, "es"));

    populateProductosNuevaOfertaSelect_();
    renderProductosNuevaOfertaSelectedSet_();

    if (statusEl) {
      statusEl.textContent = ProductosNuevaOfertaState.sets.length
        ? "Selecciona un componente para continuar."
        : "No hay conjuntos disponibles todavía.";
      statusEl.className = "offerWizard__status";
    }
  } catch (err) {
    console.warn("[productos.js] Error cargando conjuntos para nueva oferta", err);

    if (selectEl) {
      selectEl.innerHTML = `<option value="">Error cargando conjuntos</option>`;
      selectEl.disabled = true;
    }

    if (statusEl) {
      statusEl.textContent = "No se pudieron cargar los conjuntos.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
  } finally {
    ProductosNuevaOfertaState.loading = false;
  }
}

function populateProductosNuevaOfertaSelect_() {
  const selectEl = document.getElementById("offerSetSelect");
  if (!selectEl) return;

  const sets = ProductosNuevaOfertaState.sets || [];

  let html = `<option value="">Selecciona un conjunto disponible</option>`;

  html += sets.map((item) => {
    const tipo = item.tipo_oferta === "cantidad" ? "Cantidad" : "Bundle";
    return `<option value="${escapeHtml_(item.id_variante)}">${escapeHtml_(item.id_variante)} · ${tipo}</option>`;
  }).join("");

  selectEl.innerHTML = html;
  selectEl.disabled = sets.length === 0;
  refreshOfferSetSelectUi_();
}
function renderProductosNuevaOfertaSelectedSet_() {
  const preview = document.getElementById("offerSetPreview");
  const nextBtn = document.getElementById("offerSetNextBtn");

  if (!preview || !nextBtn) return;

  const selectedId = String(ProductosNuevaOfertaState.selectedId || "").trim();

  if (!selectedId) {
    preview.innerHTML = `
      <div class="offerWizardPreview__empty">
        Selecciona un conjunto para visualizar todos sus componentes y parámetros operativos.
      </div>
    `;
    nextBtn.disabled = true;
    return;
  }

  const item = (ProductosNuevaOfertaState.sets || []).find((x) => String(x.id_variante || "").trim() === selectedId);

  if (!item) {
    preview.innerHTML = `
      <div class="offerWizardPreview__empty">
        No se encontró el conjunto seleccionado.
      </div>
    `;
    nextBtn.disabled = true;
    return;
  }

  const tipoLabel = item.tipo_oferta === "cantidad" ? "Cantidad" : "Bundle";
  const tipoClass = item.tipo_oferta === "cantidad"
    ? "offerWizardPreview__type offerWizardPreview__type--cantidad"
    : "offerWizardPreview__type offerWizardPreview__type--bundle";

  preview.innerHTML = `
    <div class="offerWizardPreview__header">
      <div>
        <div class="offerWizardPreview__eyebrow">Componente seleccionado</div>
        <div class="offerWizardPreview__id">${escapeHtml_(item.id_variante)}</div>
      </div>
      <div class="${tipoClass}">${tipoLabel}</div>
    </div>

    <div class="offerWizardPreview__grid">
      <div class="offerWizardPreview__card">
        <div class="offerWizardPreview__label">Composición</div>
        <div class="offerWizardPreview__value offerWizardPreview__value--composition">${escapeHtml_(item.composicion_resumen || "-")}</div>
      </div>

      <div class="offerWizardPreview__card">
        <div class="offerWizardPreview__label">Costo productos</div>
        <div class="offerWizardPreview__value">${formatMoneyAr_(item.costo_productos)}</div>
      </div>

      <div class="offerWizardPreview__card">
        <div class="offerWizardPreview__label">Base operativa</div>
        <div class="offerWizardPreview__value">${formatMoneyAr_(item.base_operativa_pack)}</div>
      </div>

      <div class="offerWizardPreview__card">
        <div class="offerWizardPreview__label">Precio final pack</div>
        <div class="offerWizardPreview__value">${formatMoneyAr_(item.precio_final_pack)}</div>
      </div>

      <div class="offerWizardPreview__card">
        <div class="offerWizardPreview__label">Escenario financiero</div>
        <div class="offerWizardPreview__value">${escapeHtml_(item.escenario_financiero_id || "-")}</div>
      </div>
    </div>
  `;

  nextBtn.disabled = false;
}

function updateOfferWizardTimeline_(step) {
  const steps = Array.from(document.querySelectorAll(".offerWizard__step"));
  if (!steps.length) return;

  steps.forEach((el, index) => {
    el.classList.remove("offerWizard__step--active");
    if (index === (step - 1)) {
      el.classList.add("offerWizard__step--active");
    }
  });
}

function getOfferWizardSection_() {
  return document.querySelector(".offerWizard__section");
}

function getSelectedNuevaOfertaSet_() {
  const selectedId = String(ProductosNuevaOfertaState.selectedId || "").trim();
  if (!selectedId) return null;

  return (ProductosNuevaOfertaState.sets || []).find(
    (x) => String(x.id_variante || "").trim() === selectedId
  ) || null;
}

function renderProductosNuevaOfertaStep2_() {
  const section = getOfferWizardSection_();
  const set = ProductosNuevaOfertaState.selectedSet || getSelectedNuevaOfertaSet_();
  if (!section || !set) return;

  ProductosNuevaOfertaState.currentStep = 2;
  updateOfferWizardTimeline_(2);

  const form = ProductosNuevaOfertaState.form || {};

  section.innerHTML = `
    <div class="offerWizard__sectionHead">
      <div>
        <div class="offerWizard__eyebrow">Paso 2</div>
        <h3 class="offerWizard__title">Identidad comercial</h3>
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerNombreInterno" class="offerWizard__label">Nombre de la oferta (interno)</label>
      <input
        type="text"
        id="offerNombreInterno"
        class="offerWizard__input"
        value="${escapeHtml_(form.nombre_interno || "")}"
        placeholder="Ej: Oferta Día de la Madre"
      />
      <div class="offerWizard__hint">
        Nombre interno visible en tabla y gestión del sistema.
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerNombreComercial" class="offerWizard__label">Nombre comercial</label>
      <input
        type="text"
        id="offerNombreComercial"
        class="offerWizard__input"
        value="${escapeHtml_(form.nombre_comercial || "")}"
        placeholder="Ej: Pack especial para regalar"
      />
      <div class="offerWizard__hint">
        Este será el título visible que se verá en la página.
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerSubtitulo" class="offerWizard__label">Subtítulo de la oferta</label>
      <input
        type="text"
        id="offerSubtitulo"
        class="offerWizard__input"
        value="${escapeHtml_(form.subtitulo_oferta || "")}"
        placeholder="Ej: Ahorra más llevando esta oferta especial"
      />
      <div class="offerWizard__hint">
        Este subtítulo también se verá en la página.
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerDescripcionCorta" class="offerWizard__label">Descripción corta</label>
      <textarea
        id="offerDescripcionCorta"
        class="offerWizard__textarea"
        rows="4"
        placeholder="Describe brevemente el beneficio principal de esta oferta."
      >${escapeHtml_(form.descripcion_corta || "")}</textarea>
      <div class="offerWizard__hint">
        Esta descripción corta también se verá en la página.
      </div>
    </div>

    <div id="offerWizardStatus" class="offerWizard__status">
      Completa la identidad comercial de la oferta para continuar.
    </div>

    <div class="offerWizard__footer">
      <button type="button" class="offerWizard__backBtn" id="offerIdentityBackBtn">
        Volver
      </button>
      <button type="button" class="offerWizard__nextBtn" id="offerIdentityNextBtn">
        Siguiente
      </button>
    </div>
  `;

  wireProductosNuevaOfertaStep2Ui_();
}

function wireProductosNuevaOfertaStep2Ui_() {
  const backBtn = document.getElementById("offerIdentityBackBtn");
  const nextBtn = document.getElementById("offerIdentityNextBtn");

  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "1";
    backBtn.addEventListener("click", renderProductosNuevaOfertaStep1FromState_);
  }

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "1";
    nextBtn.addEventListener("click", handleProductosNuevaOfertaStep2Next_);
  }
}

function persistProductosNuevaOfertaStep2Form_() {
  ProductosNuevaOfertaState.form.nombre_interno = String((document.getElementById("offerNombreInterno") || {}).value || "").trim();
  ProductosNuevaOfertaState.form.nombre_comercial = String((document.getElementById("offerNombreComercial") || {}).value || "").trim();
  ProductosNuevaOfertaState.form.subtitulo_oferta = String((document.getElementById("offerSubtitulo") || {}).value || "").trim();
  ProductosNuevaOfertaState.form.descripcion_corta = String((document.getElementById("offerDescripcionCorta") || {}).value || "").trim();
}

function handleProductosNuevaOfertaStep2Next_() {
  const statusEl = document.getElementById("offerWizardStatus");

  persistProductosNuevaOfertaStep2Form_();

  const form = ProductosNuevaOfertaState.form || {};

  if (!form.nombre_interno) {
    if (statusEl) {
      statusEl.textContent = "Debes completar el nombre interno de la oferta.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  if (!form.nombre_comercial) {
    if (statusEl) {
      statusEl.textContent = "Debes completar el nombre comercial.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  if (!form.subtitulo_oferta) {
    if (statusEl) {
      statusEl.textContent = "Debes completar el subtítulo de la oferta.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  if (!form.descripcion_corta) {
    if (statusEl) {
      statusEl.textContent = "Debes completar la descripción corta.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  renderProductosNuevaOfertaStep3_();
}

function renderProductosNuevaOfertaStep3_() {
  const section = getOfferWizardSection_();
  const set = ProductosNuevaOfertaState.selectedSet || getSelectedNuevaOfertaSet_();
  if (!section || !set) return;

  ProductosNuevaOfertaState.currentStep = 3;
  updateOfferWizardTimeline_(3);

  const form = ProductosNuevaOfertaState.form || {};

  section.innerHTML = `
    <div class="offerWizard__sectionHead">
      <div>
        <div class="offerWizard__eyebrow">Paso 3</div>
        <h3 class="offerWizard__title">Condiciones y publicación</h3>
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerPoliticaCompra" class="offerWizard__label">Política de compra</label>
      <select id="offerPoliticaCompra" class="offerWizard__select">
        <option value="Predeterminado" selected>Predeterminado</option>
      </select>
    </div>

    <div class="offerWizard__field">
      <label for="offerPoliticaEnvio" class="offerWizard__label">Política de envío</label>
      <select id="offerPoliticaEnvio" class="offerWizard__select">
        <option value="Predeterminado" selected>Predeterminado</option>
      </select>
    </div>

    <div class="offerWizard__field">
      <label for="offerPoliticaDevolucion" class="offerWizard__label">Política de devolución</label>
      <select id="offerPoliticaDevolucion" class="offerWizard__select">
        <option value="Predeterminado" selected>Predeterminado</option>
      </select>
    </div>

    <div class="offerWizard__field">
      <label for="offerCondicionesGenerales" class="offerWizard__label">Condiciones generales</label>
      <select id="offerCondicionesGenerales" class="offerWizard__select">
        <option value="Predeterminado" selected>Predeterminado</option>
      </select>
    </div>

    <div class="offerWizard__field">
      <label for="offerVigenciaDesde" class="offerWizard__label">Fecha de vigencia desde</label>
      <input
        type="date"
        id="offerVigenciaDesde"
        class="offerWizard__input"
        value="${escapeHtml_(form.vigencia_desde || "")}"
      />
      <div class="offerWizard__hint">
        Si no defines una fecha, en la hoja se guardará como “A definir”.
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerVigenciaHasta" class="offerWizard__label">Fecha de vigencia hasta</label>
      <input
        type="date"
        id="offerVigenciaHasta"
        class="offerWizard__input"
        value="${escapeHtml_(form.vigencia_hasta || "")}"
      />
      <div class="offerWizard__hint">
        Si no defines una fecha, en la hoja se guardará como “A definir”.
      </div>
    </div>

    <div id="offerWizardStatus" class="offerWizard__status">
      Completa condiciones y vigencias. Si no defines fechas, se guardarán como A definir.
    </div>

    <div class="offerWizard__footer">
      <button type="button" class="offerWizard__backBtn" id="offerConditionsBackBtn">
        Volver
      </button>
      <button type="button" class="offerWizard__nextBtn" id="offerSaveBtn">
        Guardar oferta
      </button>
    </div>
  `;

  const compra = document.getElementById("offerPoliticaCompra");
  const envio = document.getElementById("offerPoliticaEnvio");
  const devolucion = document.getElementById("offerPoliticaDevolucion");
  const condiciones = document.getElementById("offerCondicionesGenerales");

  if (compra) compra.value = form.politica_compra || "Predeterminado";
  if (envio) envio.value = form.politica_envio || "Predeterminado";
  if (devolucion) devolucion.value = form.politica_devolucion || "Predeterminado";
  if (condiciones) condiciones.value = form.condiciones_generales || "Predeterminado";

  wireProductosNuevaOfertaStep3Ui_();
}

function wireProductosNuevaOfertaStep3Ui_() {
  const backBtn = document.getElementById("offerConditionsBackBtn");
  const saveBtn = document.getElementById("offerSaveBtn");

  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "1";
    backBtn.addEventListener("click", () => {
      persistProductosNuevaOfertaStep3Form_();
      renderProductosNuevaOfertaStep2_();
    });
  }

  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = "1";
    saveBtn.addEventListener("click", saveProductosNuevaOferta_);
  }
}

function persistProductosNuevaOfertaStep3Form_() {
  ProductosNuevaOfertaState.form.politica_compra = String((document.getElementById("offerPoliticaCompra") || {}).value || "Predeterminado").trim() || "Predeterminado";
  ProductosNuevaOfertaState.form.politica_envio = String((document.getElementById("offerPoliticaEnvio") || {}).value || "Predeterminado").trim() || "Predeterminado";
  ProductosNuevaOfertaState.form.politica_devolucion = String((document.getElementById("offerPoliticaDevolucion") || {}).value || "Predeterminado").trim() || "Predeterminado";
  ProductosNuevaOfertaState.form.condiciones_generales = String((document.getElementById("offerCondicionesGenerales") || {}).value || "Predeterminado").trim() || "Predeterminado";
  ProductosNuevaOfertaState.form.vigencia_desde = String((document.getElementById("offerVigenciaDesde") || {}).value || "").trim();
  ProductosNuevaOfertaState.form.vigencia_hasta = String((document.getElementById("offerVigenciaHasta") || {}).value || "").trim();
}

function renderProductosNuevaOfertaStep1FromState_() {
  const section = getOfferWizardSection_();
  if (!section) return;

  ProductosNuevaOfertaState.currentStep = 1;
  updateOfferWizardTimeline_(1);

  section.innerHTML = `
    <div class="offerWizard__sectionHead">
      <div>
        <div class="offerWizard__eyebrow">Paso 1</div>
        <h3 class="offerWizard__title">Componente de la oferta</h3>
      </div>
    </div>

    <div class="offerWizard__field">
      <label for="offerSetSelect" class="offerWizard__label">Conjunto disponible</label>

      <div class="offerWizardSelect" id="offerSetSelectUi">
        <select id="offerSetSelect" class="offerWizard__selectNative">
          <option value="">Cargando conjuntos disponibles...</option>
        </select>

        <button
          type="button"
          class="offerWizardSelect__trigger"
          id="offerSetSelectTrigger"
          aria-haspopup="listbox"
          aria-expanded="false"
        >
          <span class="offerWizardSelect__value" id="offerSetSelectValue">
            Cargando conjuntos disponibles...
          </span>

          <span class="offerWizardSelect__chevron" aria-hidden="true"></span>
        </button>

        <div class="offerWizardSelect__dropdown" id="offerSetSelectDropdown" role="listbox"></div>
      </div>

      <div class="offerWizard__hint">
        Selecciona un id_variante ya creado en Conjuntos de productos.
      </div>
    </div>

    <div id="offerSetPreview" class="offerWizardPreview">
      <div class="offerWizardPreview__empty">
        Selecciona un conjunto para visualizar todos sus componentes y parámetros operativos.
      </div>
    </div>

    <div id="offerWizardStatus" class="offerWizard__status">
      Selecciona un conjunto para continuar.
    </div>

    <div class="offerWizard__footer">
      <button type="button" class="offerWizard__nextBtn" id="offerSetNextBtn" ${ProductosNuevaOfertaState.activating ? "disabled" : ""}>
        Siguiente
      </button>
    </div>
  `;

  initOfferSetSelectUi_();
  wireProductosNuevaOfertaPopupUi_();
  populateProductosNuevaOfertaSelect_();

  const selectEl = document.getElementById("offerSetSelect");
  if (selectEl) {
    selectEl.value = String(ProductosNuevaOfertaState.selectedId || "");
  }

  refreshOfferSetSelectUi_();
  renderProductosNuevaOfertaSelectedSet_();

  const statusEl = document.getElementById("offerWizardStatus");
  if (statusEl && ProductosNuevaOfertaState.activationResult && ProductosNuevaOfertaState.selectedId) {
    statusEl.textContent = `Componente activado en ${ProductosNuevaOfertaState.activationResult.target_sheet}. Filas creadas: ${ProductosNuevaOfertaState.activationResult.inserted_rows}.`;
    statusEl.className = "offerWizard__status offerWizard__status--success";
  }
}

async function handleProductosNuevaOfertaStep1Next_() {
  if (ProductosNuevaOfertaState.activating) return;

  const selectedId = String(ProductosNuevaOfertaState.selectedId || "").trim();
  const statusEl = document.getElementById("offerWizardStatus");
  const nextBtn = document.getElementById("offerSetNextBtn");

  if (!selectedId) {
    if (statusEl) {
      statusEl.textContent = "Primero selecciona un conjunto.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  ProductosNuevaOfertaState.activating = true;

  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.textContent = "Activando...";
  }

  if (statusEl) {
    statusEl.textContent = "Activando estructura operativa...";
    statusEl.className = "offerWizard__status";
  }

  try {
    const url = `${PRODUCTOS_BACKEND_URL}?action=activateProductSet&id_variante=${encodeURIComponent(selectedId)}&_t=${Date.now()}`;
    const res = await jsonp(url);

    if (!res || res.ok !== true) {
      throw new Error(res && res.error ? String(res.error) : "No se pudo activar el conjunto.");
    }

    ProductosNuevaOfertaState.activationResult = res;
    ProductosNuevaOfertaState.selectedSet = getSelectedNuevaOfertaSet_();

    renderProductosNuevaOfertaStep2_();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = String(err && err.message ? err.message : err || "Error activando el conjunto.");
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }

    if (nextBtn) {
      nextBtn.textContent = "Siguiente";
      nextBtn.disabled = false;
    }
  } finally {
    ProductosNuevaOfertaState.activating = false;
  }
}

async function saveProductosNuevaOferta_() {
  if (ProductosNuevaOfertaState.saving) return;

  persistProductosNuevaOfertaStep3Form_();

  const set = ProductosNuevaOfertaState.selectedSet || getSelectedNuevaOfertaSet_();
  const form = ProductosNuevaOfertaState.form || {};
  const statusEl = document.getElementById("offerWizardStatus");
  const saveBtn = document.getElementById("offerSaveBtn");

  if (!set || !set.id_variante || !set.tipo_oferta) {
    if (statusEl) {
      statusEl.textContent = "No se encontró la estructura base de la oferta.";
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }
    return;
  }

  ProductosNuevaOfertaState.saving = true;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";
  }

  if (statusEl) {
    statusEl.textContent = "Guardando identidad comercial y condiciones...";
    statusEl.className = "offerWizard__status";
  }

  try {
    const query = new URLSearchParams({
      action: "saveOffer",
      id_variante: String(set.id_variante || "").trim(),
      tipo_oferta: String(set.tipo_oferta || "").trim(),
      nombre_interno: String(form.nombre_interno || "").trim(),
      nombre_comercial: String(form.nombre_comercial || "").trim(),
      subtitulo_oferta: String(form.subtitulo_oferta || "").trim(),
      descripcion_corta: String(form.descripcion_corta || "").trim(),
      politica_compra: String(form.politica_compra || "Predeterminado").trim(),
      politica_envio: String(form.politica_envio || "Predeterminado").trim(),
      politica_devolucion: String(form.politica_devolucion || "Predeterminado").trim(),
      condiciones_generales: String(form.condiciones_generales || "Predeterminado").trim(),
      vigencia_desde: String(form.vigencia_desde || "").trim(),
      vigencia_hasta: String(form.vigencia_hasta || "").trim(),
      _t: String(Date.now())
    });

    const url = `${PRODUCTOS_BACKEND_URL}?${query.toString()}`;
    const res = await jsonp(url);

    if (!res || res.ok !== true) {
      throw new Error(res && res.error ? String(res.error) : "No se pudo guardar la oferta.");
    }

    if (statusEl) {
      statusEl.textContent = `Oferta guardada correctamente. ID generado: ${res.oferta_id}.`;
      statusEl.className = "offerWizard__status offerWizard__status--success";
    }

    if (saveBtn) {
      saveBtn.textContent = "Oferta guardada";
      saveBtn.disabled = true;
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = String(err && err.message ? err.message : err || "Error guardando la oferta.");
      statusEl.className = "offerWizard__status offerWizard__status--error";
    }

    if (saveBtn) {
      saveBtn.textContent = "Guardar oferta";
      saveBtn.disabled = false;
    }
  } finally {
    ProductosNuevaOfertaState.saving = false;
  }
}
/* ======= FIN · MODAL NUEVA OFERTA ======= */
/* ======= INICIO · RENDER PARTIAL OFERTAS ACTIVAS ======= */
function openProductosSubSlide_(title, partialPath) {
  const panel = document.getElementById("prodSlidePanel");
  const subSlide = document.getElementById("prodSubSlide");
  const subTitle = document.getElementById("prodSubSlideTitle");
  const subContent = document.getElementById("prodSubSlideContent");

  if (!panel || !subSlide || !subContent) return;
  if (ProductosUiState.mainSlideLoading) return;

  const reqId = ++ProductosUiState.subSlideReqId;
  ProductosUiState.subSlideLoading = true;

  if (subTitle) subTitle.textContent = title || "Detalle";

  subContent.innerHTML = `<div class="prodSlideLoading">Cargando contenido...</div>`;

  fetch(partialPath + "?_t=" + Date.now())
    .then(res => res.text())
    .then(html => {
      if (reqId !== ProductosUiState.subSlideReqId) return;

      subContent.innerHTML = html;

      if (
        partialPath &&
        String(partialPath).includes("productos-slide-crear-conjunto")
      ) {
        try {
          initProductosSetBuilder_();
        } catch (err) {
          console.warn("[productos.js] Error inicializando constructor de conjuntos", err);
        }
      }
  
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (reqId !== ProductosUiState.subSlideReqId) return;
  
          panel.classList.add("is-subslide-open");
          subSlide.classList.add("is-active");
          subSlide.setAttribute("aria-hidden", "false");
          ProductosUiState.subSlideLoading = false;
        });
      });
    })
    .catch(() => {
      if (reqId !== ProductosUiState.subSlideReqId) return;
      subContent.innerHTML = "<div>Error cargando contenido</div>";
      ProductosUiState.subSlideLoading = false;
    });
}
function closeProductosSubSlide_() {
  const panel = document.getElementById("prodSlidePanel");
  const subSlide = document.getElementById("prodSubSlide");
  const subContent = document.getElementById("prodSubSlideContent");

  if (!panel || !subSlide) return;

  ProductosUiState.subSlideReqId++;
  ProductosUiState.subSlideLoading = false;

  panel.classList.remove("is-subslide-open");
  subSlide.classList.remove("is-active");
  subSlide.setAttribute("aria-hidden", "true");

  /* ======= INICIO · RESET DEL CONSTRUCTOR AL CERRAR EL SUB-SLIDE ======= */
  if (document.getElementById("prodSetIdInput")) {
    resetProductosSetBuilder_();
  }
  /* ======= FIN · RESET DEL CONSTRUCTOR AL CERRAR EL SUB-SLIDE ======= */

  setTimeout(() => {
    if (subContent) subContent.innerHTML = "";
  }, 260);
}
function wireProductosSlideHeaderActions_() {
  const createSetBtn = document.getElementById("prodSlideCreateSetBtn");
  const closeBtn = document.getElementById("prodSlideCloseBtn");
  const subCloseBtn = document.getElementById("prodSubSlideCloseBtn");
  const subBackBtn = document.getElementById("prodSubSlideBackBtn");
  const overlay = document.getElementById("prodSlideOverlay");

  if (createSetBtn && !createSetBtn.dataset.bound) {
    createSetBtn.dataset.bound = "1";
    createSetBtn.addEventListener("click", () => {
      openProductosSubSlide_(
        "Crear conjunto de productos",
        "/partials/productos-slide-crear-conjunto.html"
      );
    });
  }

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", closeProductosSlide_);
  }

  if (subCloseBtn && !subCloseBtn.dataset.bound) {
    subCloseBtn.dataset.bound = "1";
    subCloseBtn.addEventListener("click", closeProductosSubSlide_);
  }

  if (subBackBtn && !subBackBtn.dataset.bound) {
    subBackBtn.dataset.bound = "1";
    subBackBtn.addEventListener("click", closeProductosSubSlide_);
  }

  if (overlay && !overlay.dataset.bound) {
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", closeProductosSlide_);
  }
}
/* ======= FIN · SLIDE CONTROL ======= */

/* =========================================================
   INICIO · CONSTRUCTOR DE CONJUNTOS
   Carga SKU desde CalculosCostosSku + autocompletado + resumen
   ========================================================= */
   /* ======= INICIO · UI CUSTOM SKU SELECT · CONSTRUCTOR · V2 ======= */
/* Dropdown visual de SKU con dos líneas e ícono azul, sin tocar la lógica operativa */

function getProductosSetBuilderSkuIcon_() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8.5 12 4l8 4.5M4 8.5V15.5L12 20l8-4.5V8.5M4 8.5 12 13m8-4.5L12 13m0 0v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function splitProductosSetBuilderSkuLabel_(label) {
  const raw = String(label || "").trim();

  if (!raw) {
    return {
      sku: "Seleccionar SKU",
      name: ""
    };
  }

  const parts = raw.split("—");
  if (parts.length >= 2) {
    return {
      sku: String(parts[0] || "").trim(),
      name: parts.slice(1).join("—").trim()
    };
  }

  return {
    sku: raw,
    name: ""
  };
}

function ensureProductosSetBuilderSkuSelectUi_(slot) {
  const nativeSelect = document.getElementById(`prodSetSku${slot}`);
  if (!nativeSelect) return null;

  const field = nativeSelect.closest(".prodSetItem__field");
  if (!field) return null;

  field.classList.add("prodSetItem__field--sku");
  nativeSelect.classList.add("prodSetItem__selectNative");

  let ui = field.querySelector(".prodSetSkuSelect");
  if (!ui) {
    ui = document.createElement("div");
    ui.className = "prodSetSkuSelect";
    ui.setAttribute("data-slot", String(slot));

    ui.innerHTML = `
      <button
        type="button"
        class="prodSetSkuSelect__trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="prodSetSkuSelect__triggerInner">
          <span class="prodSetSkuSelect__triggerIcon">${getProductosSetBuilderSkuIcon_()}</span>

          <span class="prodSetSkuSelect__triggerContent is-placeholder">
            <span class="prodSetSkuSelect__triggerSku">Seleccionar SKU</span>
            <span class="prodSetSkuSelect__triggerName"></span>
          </span>
        </span>

        <span class="prodSetSkuSelect__chevron" aria-hidden="true"></span>
      </button>

      <div class="prodSetSkuSelect__dropdown" role="listbox"></div>
    `;

    nativeSelect.insertAdjacentElement("afterend", ui);
  }

  if (ui.dataset.bound !== "1") {
    const trigger = ui.querySelector(".prodSetSkuSelect__trigger");
    const dropdown = ui.querySelector(".prodSetSkuSelect__dropdown");

    ui.dataset.bound = "1";

    trigger.addEventListener("click", (e) => {
      e.preventDefault();

      if (nativeSelect.disabled) return;

      const isOpen = ui.classList.contains("is-open");
      closeProductosSetBuilderSkuSelects_();

      if (!isOpen) {
        ui.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    dropdown.addEventListener("click", (e) => {
      const optionBtn = e.target.closest(".prodSetSkuSelect__option");
      if (!optionBtn || optionBtn.disabled) return;

      const value = String(optionBtn.dataset.value || "");
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

      closeProductosSetBuilderSkuSelects_();
      refreshProductosSetBuilderSkuSelectUi_(slot);
    });
  }

  return ui;
}

function refreshProductosSetBuilderSkuSelectUi_(slot) {
  const nativeSelect = document.getElementById(`prodSetSku${slot}`);
  if (!nativeSelect) return;

  const ui = ensureProductosSetBuilderSkuSelectUi_(slot);
  if (!ui) return;

  const trigger = ui.querySelector(".prodSetSkuSelect__trigger");
  const triggerContent = ui.querySelector(".prodSetSkuSelect__triggerContent");
  const triggerSku = ui.querySelector(".prodSetSkuSelect__triggerSku");
  const triggerName = ui.querySelector(".prodSetSkuSelect__triggerName");
  const dropdown = ui.querySelector(".prodSetSkuSelect__dropdown");

  const options = Array.from(nativeSelect.options || []);
  const selectedValue = String(nativeSelect.value || "");
  const selectedOption = options.find((opt) => String(opt.value || "") === selectedValue) || options[0] || null;

  const selectedLabel = selectedOption ? String(selectedOption.textContent || "").trim() : "Seleccionar SKU";
  const selectedParts = splitProductosSetBuilderSkuLabel_(selectedLabel);
  const isPlaceholder = !selectedValue;

  triggerSku.textContent = selectedParts.sku || "Seleccionar SKU";
  triggerName.textContent = selectedParts.name || "";
  triggerContent.classList.toggle("is-placeholder", isPlaceholder);

  trigger.disabled = !!nativeSelect.disabled;
  ui.classList.toggle("is-disabled", !!nativeSelect.disabled);

  dropdown.innerHTML = options.map((opt) => {
    const value = String(opt.value || "");
    const label = String(opt.textContent || "").trim();
    const parts = splitProductosSetBuilderSkuLabel_(label);
    const isSelected = value === selectedValue;
    const isOptionPlaceholder = value === "";

    return `
      <button
        type="button"
        class="prodSetSkuSelect__option${isSelected ? " is-selected" : ""}${isOptionPlaceholder ? " is-placeholder" : ""}"
        data-value="${escapeHtml_(value)}"
      >
        <span class="prodSetSkuSelect__optionInner">
          <span class="prodSetSkuSelect__optionIcon">${getProductosSetBuilderSkuIcon_()}</span>

          <span class="prodSetSkuSelect__optionContent">
            <span class="prodSetSkuSelect__optionSku">${escapeHtml_(parts.sku || "Seleccionar SKU")}</span>
            <span class="prodSetSkuSelect__optionName">${escapeHtml_(parts.name || "")}</span>
          </span>
        </span>
      </button>
    `;
  }).join("");
}

function initProductosSetBuilderSkuSelectsUi_() {
  ["1", "2", "3"].forEach((slot) => {
    ensureProductosSetBuilderSkuSelectUi_(slot);
    refreshProductosSetBuilderSkuSelectUi_(slot);
  });

  if (!document.body.dataset.prodSetSkuOutsideBound) {
    document.body.dataset.prodSetSkuOutsideBound = "1";

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".prodSetSkuSelect")) {
        closeProductosSetBuilderSkuSelects_();
      }
    });
  }
}

function closeProductosSetBuilderSkuSelects_() {
  document.querySelectorAll(".prodSetSkuSelect.is-open").forEach((ui) => {
    ui.classList.remove("is-open");

    const trigger = ui.querySelector(".prodSetSkuSelect__trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

function refreshAllProductosSetBuilderSkuSelects_() {
  ["1", "2", "3"].forEach((slot) => {
    refreshProductosSetBuilderSkuSelectUi_(slot);
  });
}
/* ======= FIN · UI CUSTOM SKU SELECT · CONSTRUCTOR · V2 ======= */

/* ======= INICIO · UI CUSTOM ESCENARIO FINANCIERO · CONSTRUCTOR ======= */
function getProductosSetBuilderFinanceIcon_() {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 8.2 12 4.5l8.5 3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M5.5 9.5h13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M7 9.5v7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M12 9.5v7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M17 9.5v7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M4.5 17.5h15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M3.5 19.5h17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

function splitProductosSetBuilderFinanceLabel_(label) {
  const raw = String(label || "").trim();

  if (!raw) {
    return {
      primary: "Seleccionar escenario",
      secondary: ""
    };
  }

  if (raw === "Seleccionar escenario") {
    return {
      primary: raw,
      secondary: ""
    };
  }

  if (raw.includes("·")) {
    const parts = raw.split("·");
    return {
      primary: String(parts[0] || "").trim(),
      secondary: parts.slice(1).join("·").trim()
    };
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.*?)(sin cuotas|\d+\s+cuotas)$/i);

  if (match) {
    return {
      primary: String(match[1] || "").trim(),
      secondary: String(match[2] || "").trim()
    };
  }

  return {
    primary: raw,
    secondary: ""
  };
}

function normalizeProductosSetBuilderFinanceOptionLabel_(label) {
  const parts = splitProductosSetBuilderFinanceLabel_(label);
  if (!parts.secondary) return parts.primary;
  return `${parts.primary} · ${parts.secondary}`;
}

function ensureProductosSetBuilderFinanceSelectUi_() {
  const nativeSelect = document.getElementById("prodSetFinanceScenario");
  if (!nativeSelect) return null;

  const field = nativeSelect.closest(".prodSetEconomics__field");
  if (!field) return null;

  field.classList.add("prodSetEconomics__field--finance");
  nativeSelect.classList.add("prodSetEconomics__selectNative");

  let ui = field.querySelector(".prodSetFinanceSelect");
  if (!ui) {
    ui = document.createElement("div");
    ui.className = "prodSetFinanceSelect";

    ui.innerHTML = `
      <button
        type="button"
        class="prodSetFinanceSelect__trigger"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="prodSetFinanceSelect__triggerInner">
          <span class="prodSetFinanceSelect__triggerIcon">${getProductosSetBuilderFinanceIcon_()}</span>

          <span class="prodSetFinanceSelect__triggerContent is-placeholder">
            <span class="prodSetFinanceSelect__triggerPrimary">Seleccionar escenario</span>
            <span class="prodSetFinanceSelect__triggerSecondary"></span>
          </span>
        </span>

        <span class="prodSetFinanceSelect__chevron" aria-hidden="true"></span>
      </button>

      <div class="prodSetFinanceSelect__dropdown" role="listbox"></div>
    `;

    nativeSelect.insertAdjacentElement("afterend", ui);
  }

  if (ui.dataset.bound !== "1") {
    const trigger = ui.querySelector(".prodSetFinanceSelect__trigger");
    const dropdown = ui.querySelector(".prodSetFinanceSelect__dropdown");

    ui.dataset.bound = "1";

    trigger.addEventListener("click", (e) => {
      e.preventDefault();

      if (nativeSelect.disabled) return;

      const isOpen = ui.classList.contains("is-open");
      closeProductosSetBuilderFinanceSelect_();

      if (!isOpen) {
        ui.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    dropdown.addEventListener("click", (e) => {
      const optionBtn = e.target.closest(".prodSetFinanceSelect__option");
      if (!optionBtn || optionBtn.disabled) return;

      const value = String(optionBtn.dataset.value || "");
      nativeSelect.value = value;
      nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

      closeProductosSetBuilderFinanceSelect_();
      refreshProductosSetBuilderFinanceSelectUi_();
    });
  }

  return ui;
}

function refreshProductosSetBuilderFinanceSelectUi_() {
  const nativeSelect = document.getElementById("prodSetFinanceScenario");
  if (!nativeSelect) return;

  const ui = ensureProductosSetBuilderFinanceSelectUi_();
  if (!ui) return;

  const trigger = ui.querySelector(".prodSetFinanceSelect__trigger");
  const triggerContent = ui.querySelector(".prodSetFinanceSelect__triggerContent");
  const triggerPrimary = ui.querySelector(".prodSetFinanceSelect__triggerPrimary");
  const triggerSecondary = ui.querySelector(".prodSetFinanceSelect__triggerSecondary");
  const dropdown = ui.querySelector(".prodSetFinanceSelect__dropdown");

  const options = Array.from(nativeSelect.options || []);
  const selectedValue = String(nativeSelect.value || "");
  const selectedOption =
    options.find((opt) => String(opt.value || "") === selectedValue) ||
    options[0] ||
    null;

  const selectedLabel = selectedOption
    ? normalizeProductosSetBuilderFinanceOptionLabel_(String(selectedOption.textContent || "").trim())
    : "Seleccionar escenario";

  const selectedParts = splitProductosSetBuilderFinanceLabel_(selectedLabel);
  const isPlaceholder = !selectedValue;

  triggerPrimary.textContent = selectedParts.primary || "Seleccionar escenario";
  triggerSecondary.textContent = selectedParts.secondary || "";
  triggerContent.classList.toggle("is-placeholder", isPlaceholder);

  trigger.disabled = !!nativeSelect.disabled;
  ui.classList.toggle("is-disabled", !!nativeSelect.disabled);

  dropdown.innerHTML = options.map((opt) => {
    const value = String(opt.value || "");
    const label = normalizeProductosSetBuilderFinanceOptionLabel_(String(opt.textContent || "").trim());
    const parts = splitProductosSetBuilderFinanceLabel_(label);
    const isSelected = value === selectedValue;
    const isPlaceholderOption = value === "";

    return `
      <button
        type="button"
        class="prodSetFinanceSelect__option${isSelected ? " is-selected" : ""}${isPlaceholderOption ? " is-placeholder" : ""}"
        data-value="${escapeHtml_(value)}"
      >
        <span class="prodSetFinanceSelect__optionInner">
          <span class="prodSetFinanceSelect__optionIcon">${getProductosSetBuilderFinanceIcon_()}</span>

          <span class="prodSetFinanceSelect__optionContent">
            <span class="prodSetFinanceSelect__optionPrimary">${escapeHtml_(parts.primary || "Seleccionar escenario")}</span>
            <span class="prodSetFinanceSelect__optionSecondary">${escapeHtml_(parts.secondary || "")}</span>
          </span>
        </span>
      </button>
    `;
  }).join("");
}

function initProductosSetBuilderFinanceSelectUi_() {
  ensureProductosSetBuilderFinanceSelectUi_();
  refreshProductosSetBuilderFinanceSelectUi_();

  if (!document.body.dataset.prodSetFinanceOutsideBound) {
    document.body.dataset.prodSetFinanceOutsideBound = "1";

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".prodSetFinanceSelect")) {
        closeProductosSetBuilderFinanceSelect_();
      }
    });
  }
}

function closeProductosSetBuilderFinanceSelect_() {
  document.querySelectorAll(".prodSetFinanceSelect.is-open").forEach((ui) => {
    ui.classList.remove("is-open");

    const trigger = ui.querySelector(".prodSetFinanceSelect__trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}
/* ======= FIN · UI CUSTOM ESCENARIO FINANCIERO · CONSTRUCTOR ======= */

const ProductosSetBuilderState = {
    mounted: false,
    loading: false,
    loadingFinancialScenarios: false,
    saved: false,
    products: [],
    financialScenarios: []
  };
  
  /* ======= INICIO · INIT DEL CONSTRUCTOR CON UI CUSTOM SKU ======= */
/* Inicializa listeners, monta dropdowns custom y carga datos del constructor */

function initProductosSetBuilder_() {
  const root = document.getElementById("prodSubSlideContent");
  const sku1 = document.getElementById("prodSetSku1");
  const sku2 = document.getElementById("prodSetSku2");
  const sku3 = document.getElementById("prodSetSku3");

  if (!root || !sku1 || !sku2 || !sku3) return;

  initProductosSetBuilderSkuSelectsUi_();
  initProductosSetBuilderFinanceSelectUi_();
  wireProductosSetBuilderUi_();
  loadProductosSetBuilderProducts_();
  loadProductosSetBuilderFinancialScenarios_();
  syncProductosSetBuilderRuleTag_();
  syncProductosSetBuilderLocks_();
  updateProductosSetBuilderSummary_();
  refreshAllProductosSetBuilderSkuSelects_();
  refreshProductosSetBuilderFinanceSelectUi_();
}
/* ======= FIN · INIT DEL CONSTRUCTOR CON UI CUSTOM SKU ======= */
  
  async function loadProductosSetBuilderProducts_() {
    if (ProductosSetBuilderState.loading) return;
  
    const url = `${PRODUCTOS_BACKEND_URL}?action=getProductos&_t=${Date.now()}`;
    ProductosSetBuilderState.loading = true;
  
    try {
      const res = await jsonp(url);
  
      if (!res || res.ok !== true) {
        console.warn("[productos.js] No se pudieron cargar productos para el constructor", res);
        ProductosSetBuilderState.loading = false;
        return;
      }
  
      const productos = Array.isArray(res.productos) ? res.productos : [];
  
      ProductosSetBuilderState.products = productos
  .filter((item) => item && item.activo === true && String(item.sku || "").trim())
  .map((item) => ({
    sku: String(item.sku || "").trim(),
    nombre: String(item.nombre || "").trim(),
    costo_producto: Number(
      item &&
      item.source &&
      item.source.costo_proveedor !== undefined
        ? item.source.costo_proveedor
        : 0
    ) || 0
  }))
  .sort((a, b) => {
    const aa = `${a.sku} ${a.nombre}`.toLowerCase();
    const bb = `${b.sku} ${b.nombre}`.toLowerCase();
    return aa.localeCompare(bb, "es");
  });
      populateProductosSetBuilderSelects_();
      syncProductosSetBuilderFieldsFromSelection_();
      updateProductosSetBuilderSummary_();
    } catch (err) {
      console.warn("[productos.js] Error cargando productos del constructor", err);
    } finally {
      ProductosSetBuilderState.loading = false;
    }
  }
  async function loadProductosSetBuilderFinancialScenarios_() {
    if (ProductosSetBuilderState.loadingFinancialScenarios) return;
  
    const url = `${PRODUCTOS_BACKEND_URL}?action=getFinancialScenarios&_t=${Date.now()}`;
    ProductosSetBuilderState.loadingFinancialScenarios = true;
  
    try {
      const res = await jsonp(url);
  
      if (!res || res.ok !== true) {
        console.warn("[productos.js] No se pudieron cargar escenarios financieros", res);
        ProductosSetBuilderState.loadingFinancialScenarios = false;
        return;
      }
  
      const escenarios = Array.isArray(res.escenarios) ? res.escenarios : [];
  
      ProductosSetBuilderState.financialScenarios = escenarios.map((item) => ({
        id_escenario: String(item.id_escenario || "").trim(),
        descripcion_escenario: String(item.descripcion_escenario || "").trim(),
        proveedor_pago: String(item.proveedor_pago || "").trim(),
        plazo_dias: Number(item.plazo_dias || 0) || 0,
        cuotas: Number(item.cuotas || 0) || 0,
        factor_neto: Number(item.factor_neto || 0) || 0
      }));
  
      populateProductosSetBuilderFinancialScenarioSelect_();
      updateProductosSetBuilderSummary_();
    } catch (err) {
      console.warn("[productos.js] Error cargando escenarios financieros", err);
    } finally {
      ProductosSetBuilderState.loadingFinancialScenarios = false;
    }
  }
  function wireProductosSetBuilderUi_() {
    const root = document.getElementById("prodSubSlideContent");
    if (!root) return;
  
    ["1", "2", "3"].forEach((n) => {
      const skuEl = document.getElementById(`prodSetSku${n}`);
      const qtyEl = document.getElementById(`prodSetQty${n}`);
  
      if (skuEl) {
        skuEl.addEventListener("change", () => {
          fillProductosSetBuilderProductSlot_(n);
          syncProductosSetBuilderLocks_();
          updateProductosSetBuilderSummary_();
        });
      }
  
      if (qtyEl) {
        qtyEl.addEventListener("input", () => {
          syncProductosSetBuilderLocks_();
          updateProductosSetBuilderSummary_();
        });
      }
    });
  
    const idInput = document.getElementById("prodSetIdInput");
    const cpa = document.getElementById("prodSetCpa");
    const shipping = document.getElementById("prodSetShipping");
    const margin = document.getElementById("prodSetMargin");
    const finance = document.getElementById("prodSetFinanceScenario");
  
    [idInput, cpa, shipping, margin, finance].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        syncProductosSetBuilderLocks_();
        updateProductosSetBuilderSummary_();
      });
      el.addEventListener("change", () => {
        syncProductosSetBuilderLocks_();
        updateProductosSetBuilderSummary_();
      });
    });
  
    document.querySelectorAll(".prodSetIdentity__typeBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".prodSetIdentity__typeBtn").forEach((b) => {
          b.classList.remove("is-active");
        });
    
        btn.classList.add("is-active");
        syncProductosSetBuilderRuleTag_();
        syncProductosSetBuilderLocks_();
        updateProductosSetBuilderSummary_();
      });
    });
    
        /* ======= INICIO · BOTONES DEL CONSTRUCTOR ======= */
        const saveBtn = document.getElementById("prodSetSaveBtn");
        const createAnotherBtn = document.getElementById("prodSetCreateAnotherBtn");
    
        if (saveBtn && !saveBtn.dataset.bound) {
          saveBtn.dataset.bound = "1";
          saveBtn.addEventListener("click", askConfirmSaveProductosSetBuilder_);
        }
    
        if (createAnotherBtn && !createAnotherBtn.dataset.bound) {
          createAnotherBtn.dataset.bound = "1";
          createAnotherBtn.addEventListener("click", () => {
            resetProductosSetBuilder_();
          });
        }
    
        syncProductosSetBuilderActionState_();
        /* ======= FIN · BOTONES DEL CONSTRUCTOR ======= */
    }


  /* ======= INICIO · POPULATE SKU SELECTS + REFRESCO UI CUSTOM ======= */
/* Carga las opciones reales en los select nativos y luego refresca el dropdown visual */

function populateProductosSetBuilderSelects_() {
  ["1", "2", "3"].forEach((n) => {
    const select = document.getElementById(`prodSetSku${n}`);
    if (!select) return;

    const currentValue = String(select.value || "").trim();

    let html = `<option value="">Seleccionar SKU</option>`;

    ProductosSetBuilderState.products.forEach((item) => {
      html += `<option value="${escapeHtml_(item.sku)}">${escapeHtml_(item.sku)} — ${escapeHtml_(item.nombre)}</option>`;
    });

    select.innerHTML = html;

    if (
      currentValue &&
      ProductosSetBuilderState.products.some((item) => item.sku === currentValue)
    ) {
      select.value = currentValue;
    } else {
      select.value = "";
    }

    refreshProductosSetBuilderSkuSelectUi_(n);
  });
}
/* ======= FIN · POPULATE SKU SELECTS + REFRESCO UI CUSTOM ======= */
function populateProductosSetBuilderFinancialScenarioSelect_() {
  const select = document.getElementById("prodSetFinanceScenario");
  if (!select) return;

  const currentValue = String(select.value || "").trim();

  let html = `<option value="">Seleccionar escenario</option>`;

  ProductosSetBuilderState.financialScenarios.forEach((item) => {
    const label = normalizeProductosSetBuilderFinanceOptionLabel_(
      String(item.descripcion_escenario || "").trim()
    );

    html += `<option value="${escapeHtml_(item.id_escenario)}">${escapeHtml_(label)}</option>`;
  });

  select.innerHTML = html;

  if (
    currentValue &&
    ProductosSetBuilderState.financialScenarios.some((item) => item.id_escenario === currentValue)
  ) {
    select.value = currentValue;
  } else {
    select.value = "";
  }

  refreshProductosSetBuilderFinanceSelectUi_();
}

  function syncProductosSetBuilderFieldsFromSelection_() {
    fillProductosSetBuilderProductSlot_("1");
    fillProductosSetBuilderProductSlot_("2");
    fillProductosSetBuilderProductSlot_("3");
  }
  
  function fillProductosSetBuilderProductSlot_(slot) {
    const skuEl = document.getElementById(`prodSetSku${slot}`);
    const nameEl = document.getElementById(`prodSetName${slot}`);
    const costEl = document.getElementById(`prodSetCost${slot}`);
  
    if (!skuEl || !nameEl || !costEl) return;
  
    const sku = String(skuEl.value || "").trim();
  
    if (!sku) {
      nameEl.value = "";
      costEl.value = "";
      return;
    }
  
    const found = ProductosSetBuilderState.products.find((item) => item.sku === sku);
  
    if (!found) {
      nameEl.value = "";
      costEl.value = "";
      return;
    }
  
    nameEl.value = found.nombre || "";
    costEl.value = moneyARNoSymbol_(found.costo_producto);
  }
  
  function updateProductosSetBuilderSummary_() {
    const skuCountEl = document.getElementById("prodSetSummarySkuCount");
    const unitCountEl = document.getElementById("prodSetSummaryUnitCount");
    const supplierCostEl = document.getElementById("prodSetSummarySupplierCost");
    const typeEl = document.getElementById("prodSetSummaryType");
    const scenarioEl = document.getElementById("prodSetSummaryScenario");
    const finalPriceEl = document.getElementById("prodSetSummaryFinalPrice");
    const finalPriceHintEl = document.getElementById("prodSetSummaryFinalPriceHint");
    const statusEl = document.getElementById("prodSetSummaryStatus");
    const messageEl = document.getElementById("prodSetSummaryMessage");
    const headerStatusEl = document.querySelector(".prodSetIdentity__status");
  
    const selectedType = getProductosSetBuilderSelectedType_();
    const idValue = String(
      (document.getElementById("prodSetIdInput") || {}).value || ""
    ).trim();
  
    const cpaValue = String((document.getElementById("prodSetCpa") || {}).value || "").trim();
    const shippingValue = String((document.getElementById("prodSetShipping") || {}).value || "").trim();
    const marginValue = String((document.getElementById("prodSetMargin") || {}).value || "").trim();
  
    const financeSelect = document.getElementById("prodSetFinanceScenario");
    const financeValue = String((financeSelect || {}).value || "").trim();
    const financeLabel = financeSelect && financeSelect.selectedIndex >= 0
      ? String((financeSelect.options[financeSelect.selectedIndex] || {}).text || "").trim()
      : "";
  
      const slots = ["1", "2", "3"].map((n) => {
        const skuEl = document.getElementById(`prodSetSku${n}`);
        const qtyEl = document.getElementById(`prodSetQty${n}`);
        const isDisabled = !!((skuEl && skuEl.disabled) || (qtyEl && qtyEl.disabled));
    
        const sku = isDisabled
          ? ""
          : String((skuEl || {}).value || "").trim();
    
        const qty = isDisabled
          ? 0
          : (Number((qtyEl || {}).value || 0) || 0);
    
        const found = ProductosSetBuilderState.products.find((item) => item.sku === sku);
    
        return {
          slot: n,
          sku,
          qty,
          nombre: found ? found.nombre : "",
          costo: found ? Number(found.costo_producto || 0) : 0
        };
      });
  
    const usedSlots = slots.filter((item) => item.sku);
    const skuCount = usedSlots.length;
    const unitCount = slots.reduce((acc, item) => acc + (item.qty > 0 ? item.qty : 0), 0);
    const supplierCost = slots.reduce((acc, item) => {
      return acc + ((item.qty > 0 ? item.qty : 0) * (Number(item.costo || 0) || 0));
    }, 0);
  
    let status = "Borrador";
    let message = "Completa la identidad, la composición y los parámetros económicos para avanzar con el conjunto.";
  
    const hasEconomics = !!(cpaValue && shippingValue && marginValue);
  
    if (!idValue && skuCount === 0 && !hasEconomics) {
      status = "Borrador";
      message = "Completa la identidad, la composición y los parámetros económicos para avanzar con el conjunto.";
    } else if (selectedType === "bundle") {
      const validBundle =
        slots[0].sku &&
        slots[0].qty > 0 &&
        slots[1].sku &&
        slots[1].qty > 0 &&
        hasEconomics;
  
      if (validBundle) {
        status = "Completo";
        message = "El conjunto ya tiene una estructura base válida. El precio final pack se resolverá con la lógica real de TablaConstructorPacks.";
      } else {
        status = "Borrador";
        message = "Un conjunto con más de un SKU requiere Producto 1, Producto 2 y parámetros económicos completos.";
      }
    } else {
      const validCantidad =
        slots[0].sku &&
        slots[0].qty > 1 &&
        hasEconomics;
  
      if (validCantidad) {
        status = "Completo";
        message = "La oferta en cantidad ya tiene una estructura base válida. El precio final pack se resolverá con la lógica real de TablaConstructorPacks.";
      } else {
        status = "Borrador";
        message = "Una oferta en cantidad requiere Producto 1 con cantidad mayor a 1 y parámetros económicos completos.";
      }
    }
  
    if (skuCountEl) skuCountEl.textContent = String(skuCount);
    if (unitCountEl) unitCountEl.textContent = String(unitCount);
    if (supplierCostEl) supplierCostEl.textContent = formatMoneyAr_(supplierCost);
  
    if (typeEl) {
      typeEl.textContent = selectedType === "cantidad"
        ? "Mismo SKU x cantidad"
        : "Más de un SKU";
    }
  
    if (scenarioEl) {
      scenarioEl.textContent = financeValue
        ? (financeLabel || financeValue)
        : "Sin definir";
    }
  
    if (finalPriceEl) {
      finalPriceEl.textContent = hasEconomics && skuCount > 0
        ? "Pendiente"
        : "—";
    }
  
    if (finalPriceHintEl) {
      finalPriceHintEl.textContent = hasEconomics && skuCount > 0
        ? "Se calculará con la lógica real de TablaConstructorPacks."
        : "Completa productos y parámetros económicos para habilitar este cálculo.";
    }
  
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.classList.remove("prodSetSummary__statusValue--draft", "prodSetSummary__statusValue--complete");
      statusEl.classList.add(
        status === "Completo"
          ? "prodSetSummary__statusValue--complete"
          : "prodSetSummary__statusValue--draft"
      );
    }
  
    if (messageEl) {
      messageEl.textContent = message;
    }
  
    if (headerStatusEl) {
      headerStatusEl.textContent = status;
      headerStatusEl.classList.remove("prodSetIdentity__status--draft", "prodSetIdentity__status--complete");
      headerStatusEl.classList.add(
        status === "Completo"
          ? "prodSetIdentity__status--complete"
          : "prodSetIdentity__status--draft"
      );
    }
  }
  
  function getProductosSetBuilderSelectedType_() {
    const activeBtn = document.querySelector(".prodSetIdentity__typeBtn.is-active");
    const type = activeBtn ? String(activeBtn.dataset.type || "").trim() : "";
    return type === "cantidad" ? "cantidad" : "bundle";
  }
  
  function syncProductosSetBuilderRuleTag_() {
    const tag = document.getElementById("prodSetComposeRuleTag");
    if (!tag) return;
  
    const selectedType = getProductosSetBuilderSelectedType_();
  
    tag.classList.remove(
      "prodSetCompose__ruleTag--cantidad",
      "prodSetCompose__ruleTag--bundle"
    );
  
    if (selectedType === "cantidad") {
      tag.textContent = "Solo puedes seleccionar 1 producto para ofertas en cantidad";
      tag.classList.add("prodSetCompose__ruleTag--cantidad");
    } else {
      tag.textContent = "Selecciona al menos 2 productos";
      tag.classList.add("prodSetCompose__ruleTag--bundle");
    }
  }
  function moneyARNoSymbol_(value) {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }
  
  function collectProductosSetBuilderPayload_() {
    const financeSelect = document.getElementById("prodSetFinanceScenario");
  
    const payload = {
      id_variante: String((document.getElementById("prodSetIdInput") || {}).value || "").trim(),
      tipo_oferta: getProductosSetBuilderSelectedType_(),
  
      sku1: String((document.getElementById("prodSetSku1") || {}).value || "").trim(),
      qty1: Number((document.getElementById("prodSetQty1") || {}).value || 0) || 0,
  
      sku2: String((document.getElementById("prodSetSku2") || {}).value || "").trim(),
      qty2: Number((document.getElementById("prodSetQty2") || {}).value || 0) || 0,
  
      sku3: String((document.getElementById("prodSetSku3") || {}).value || "").trim(),
      qty3: Number((document.getElementById("prodSetQty3") || {}).value || 0) || 0,
  
      cpa: Number((document.getElementById("prodSetCpa") || {}).value || 0) || 0,
      envio: Number((document.getElementById("prodSetShipping") || {}).value || 0) || 0,
      margen: Number((document.getElementById("prodSetMargin") || {}).value || 0) || 0,
  
      escenario_financiero_id: String((financeSelect || {}).value || "").trim()
    };
  
    if (payload.tipo_oferta === "cantidad") {
      payload.sku2 = "";
      payload.qty2 = 0;
      payload.sku3 = "";
      payload.qty3 = 0;
    }
  
    return payload;
  }
  
  function validateProductosSetBuilderPayload_(payload) {
    if (!payload.id_variante) {
      return "Debes completar el ID del conjunto.";
    }
  
    if (!payload.sku1 || payload.qty1 <= 0) {
      return "Debes completar Producto 1 con una cantidad válida.";
    }
  
    if (!payload.escenario_financiero_id) {
      return "Debes seleccionar un escenario financiero.";
    }
  
    if (payload.tipo_oferta === "bundle") {
      if (!payload.sku2 || payload.qty2 <= 0) {
        return "Para productos combinados debes completar al menos Producto 1 y Producto 2.";
      }
    }
  
    if (payload.tipo_oferta === "cantidad") {
      if (payload.qty1 <= 1) {
        return "Para ofertas en cantidad, Producto 1 debe tener cantidad mayor a 1.";
      }
    }
  
    return "";
  }

  async function saveProductosSetBuilder_() {
    const payload = collectProductosSetBuilderPayload_();
    const error = validateProductosSetBuilderPayload_(payload);
  
    const saveBtn = document.getElementById("prodSetSaveBtn");
    const messageEl = document.getElementById("prodSetSummaryMessage");
  
    if (error) {
      if (messageEl) messageEl.textContent = error;
      alert(error);
      return;
    }
  
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Guardando...";
    }
  
    try {
      const query = new URLSearchParams({
        action: "saveProductSet",
        id_variante: payload.id_variante,
        tipo_oferta: payload.tipo_oferta,
  
        sku1: payload.sku1,
        qty1: String(payload.qty1),
  
        sku2: payload.sku2,
        qty2: String(payload.qty2),
  
        sku3: payload.sku3,
        qty3: String(payload.qty3),
  
        cpa: String(payload.cpa),
        envio: String(payload.envio),
        margen: String(payload.margen),
        escenario_financiero_id: payload.escenario_financiero_id,
  
        _t: String(Date.now())
      });
  
      const url = `${PRODUCTOS_BACKEND_URL}?${query.toString()}`;
      const res = await jsonp(url);
  
      if (!res || res.ok !== true) {
        const errMsg = res && res.error
          ? String(res.error)
          : "No se pudo guardar el conjunto.";
        if (messageEl) messageEl.textContent = errMsg;
        alert(errMsg);
        return;
      }
  
          /* ======= INICIO · ESTADO POST-GUARDADO ======= */
          ProductosSetBuilderState.saved = true;

          showProductosSetSuccessNotice_();
          syncProductosSetBuilderLocks_();
          syncProductosSetBuilderActionState_();
          /* ======= FIN · ESTADO POST-GUARDADO ======= */

    } catch (err) {
      const errMsg = "Error guardando el conjunto: " + String(err && err.message ? err.message : err);
      if (messageEl) messageEl.textContent = errMsg;
      alert(errMsg);
    } finally {
      if (saveBtn) {
        saveBtn.textContent = "Guardar conjunto";
      }

      /* ======= INICIO · SINCRONIZACIÓN FINAL DE BOTONES ======= */
      syncProductosSetBuilderActionState_();
      /* ======= FIN · SINCRONIZACIÓN FINAL DE BOTONES ======= */
    }
  }

  function showProductosSetSuccessNotice_() {
    const root = document.getElementById("prodSubSlideContent");
    if (!root) return;
  
    // Evitar duplicados
    if (document.getElementById("prodSetSuccessNotice")) return;
  
    const notice = document.createElement("div");
    notice.id = "prodSetSuccessNotice";
    notice.className = "prodSetSuccessNotice";
  
    notice.innerHTML = `
      <div class="prodSetSuccessNotice__icon">✔</div>
      <div class="prodSetSuccessNotice__text">
        El conjunto fue guardado exitosamente
      </div>
    `;
  
    // Lo insertamos arriba de todo el sub-slide
    root.prepend(notice);
  }
  
  function ensureProductosSetConfirmModal_() {
    let modal = document.getElementById("prodSetConfirmModal");
    if (modal) return modal;
  
    modal = document.createElement("div");
    modal.className = "prodSetConfirmModal";
    modal.id = "prodSetConfirmModal";
    modal.innerHTML = `
      <div class="prodSetConfirmModal__backdrop" data-close="1"></div>
      <div class="prodSetConfirmModal__dialog" role="dialog" aria-modal="true" aria-labelledby="prodSetConfirmModalTitle">
        <div class="prodSetConfirmModal__title" id="prodSetConfirmModalTitle">
          Vas a generar un nuevo conjunto de productos. ¿Deseas continuar con esta operación?
        </div>
        <div class="prodSetConfirmModal__text">
          Podrás encontrar este conjunto en la sección de Conjuntos de productos dentro del gestor de productos.
        </div>
        <div class="prodSetConfirmModal__actions">
          <button type="button" class="prodSetConfirmModal__btn prodSetConfirmModal__btn--ghost" id="prodSetConfirmCancelBtn">
            Cancelar
          </button>
          <button type="button" class="prodSetConfirmModal__btn prodSetConfirmModal__btn--primary" id="prodSetConfirmAcceptBtn">
            Confirmar guardado
          </button>
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
  
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.close === "1") {
        modal.classList.remove("is-active");
      }
    });
  
    const cancelBtn = modal.querySelector("#prodSetConfirmCancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        modal.classList.remove("is-active");
      });
    }
  
    return modal;
  }
  
  function askConfirmSaveProductosSetBuilder_() {
    if (ProductosSetBuilderState.saved) return;
  
    const modal = ensureProductosSetConfirmModal_();
    if (!modal) return;
  
    const acceptBtn = modal.querySelector("#prodSetConfirmAcceptBtn");
    if (acceptBtn) {
      acceptBtn.onclick = async () => {
        modal.classList.remove("is-active");
        await saveProductosSetBuilder_();
      };
    }
  
    modal.classList.add("is-active");
  }
  
  /* =========================================================
     FIN · CONSTRUCTOR DE CONJUNTOS
     ========================================================= */

     function isProductosSetBuilderIdentityComplete_() {
      const idValue = String(
        (document.getElementById("prodSetIdInput") || {}).value || ""
      ).trim();
    
      return !!idValue;
    }
    
    function setProductosSetBuilderSectionLocked_(selector, locked) {
      const el = document.querySelector(selector);
      if (!el) return;
      el.classList.toggle("is-locked", !!locked);
    }
    
   /* ======= INICIO · LOCK DE SLOT + REFRESCO UI CUSTOM ======= */
/* Bloquea o desbloquea cada slot del constructor y sincroniza el dropdown visual */

function setProductosSetBuilderProductLocked_(slot, locked) {
  const card = document.querySelector(`.prodSetItem[data-pack-item="${slot}"]`);
  if (!card) return;

  card.classList.toggle("is-locked", !!locked);

  const skuEl = document.getElementById(`prodSetSku${slot}`);
  const qtyEl = document.getElementById(`prodSetQty${slot}`);

  if (skuEl) skuEl.disabled = !!locked;
  if (qtyEl) qtyEl.disabled = !!locked;

  if (locked) {
    if (skuEl) skuEl.value = "";
    if (qtyEl) qtyEl.value = "";

    const nameEl = document.getElementById(`prodSetName${slot}`);
    const costEl = document.getElementById(`prodSetCost${slot}`);

    if (nameEl) nameEl.value = "";
    if (costEl) costEl.value = "";
  }

  refreshProductosSetBuilderSkuSelectUi_(slot);
}
/* ======= FIN · LOCK DE SLOT + REFRESCO UI CUSTOM ======= */
    
/* ======= INICIO · ESTADO DE BOTONES DEL CONSTRUCTOR ======= */
function syncProductosSetBuilderActionState_() {
  const createAnotherBtn = document.getElementById("prodSetCreateAnotherBtn");
  const saveBtn = document.getElementById("prodSetSaveBtn");
  const draftBtn = document.getElementById("prodSetDraftBtn");
  const cancelBtn = document.getElementById("prodSetCancelBtn");

  if (createAnotherBtn) {
    createAnotherBtn.hidden = !ProductosSetBuilderState.saved;
    createAnotherBtn.disabled = false;
  }

  if (saveBtn) {
    saveBtn.disabled = !!ProductosSetBuilderState.saved;
  }

  if (draftBtn) {
    draftBtn.disabled = !!ProductosSetBuilderState.saved;
  }

  if (cancelBtn) {
    cancelBtn.disabled = false;
  }
}
/* ======= FIN · ESTADO DE BOTONES DEL CONSTRUCTOR ======= */

function syncProductosSetBuilderLocks_() {
  const identityComplete = isProductosSetBuilderIdentityComplete_();
  const selectedType = getProductosSetBuilderSelectedType_();
  const fullyLocked = ProductosSetBuilderState.saved === true;

  const identityCard = document.querySelector(".prodSetIdentity__card");
  if (identityCard) {
    identityCard.classList.toggle("is-complete", identityComplete && !fullyLocked);
    identityCard.classList.toggle("is-locked", fullyLocked);
  }

  setProductosSetBuilderSectionLocked_(".prodSetCompose", fullyLocked || !identityComplete);
  setProductosSetBuilderSectionLocked_(".prodSetEconomics", fullyLocked || !identityComplete);
  setProductosSetBuilderSectionLocked_(".prodSetSummary", fullyLocked || !identityComplete);
  /* ======= INICIO · ACCIONES NO BLOQUEADAS TRAS GUARDAR ======= */
  setProductosSetBuilderSectionLocked_(".prodSetActions", !identityComplete);
  /* ======= FIN · ACCIONES NO BLOQUEADAS TRAS GUARDAR ======= */
  const idInput = document.getElementById("prodSetIdInput");
  const cpa = document.getElementById("prodSetCpa");
  const shipping = document.getElementById("prodSetShipping");
  const margin = document.getElementById("prodSetMargin");
  const finance = document.getElementById("prodSetFinanceScenario");

  [idInput, cpa, shipping, margin, finance].forEach((el) => {
    if (el) el.disabled = fullyLocked;
  });

  document.querySelectorAll(".prodSetIdentity__typeBtn").forEach((btn) => {
    btn.disabled = fullyLocked;
  });

  /* ======= INICIO · REFRESCO DE BOTONES INFERIORES ======= */
  syncProductosSetBuilderActionState_();
  /* ======= FIN · REFRESCO DE BOTONES INFERIORES ======= */

  if (fullyLocked) {
    setProductosSetBuilderProductLocked_("1", true);
    setProductosSetBuilderProductLocked_("2", true);
    setProductosSetBuilderProductLocked_("3", true);
    return;
  }

  if (!identityComplete) {
    setProductosSetBuilderProductLocked_("2", true);
    setProductosSetBuilderProductLocked_("3", true);
    return;
  }

  if (selectedType === "cantidad") {
    setProductosSetBuilderProductLocked_("2", true);
    setProductosSetBuilderProductLocked_("3", true);
  } else {
    setProductosSetBuilderProductLocked_("2", false);
    setProductosSetBuilderProductLocked_("3", false);
  }
}
/* ======= INICIO · RESET COMPLETO DEL CONSTRUCTOR + UI CUSTOM ======= */
/* Reinicia el constructor, limpia campos, restaura el tipo bundle y sincroniza los dropdowns visuales */

function resetProductosSetBuilder_() {
  ProductosSetBuilderState.saved = false;

  const root = document.getElementById("prodSubSlideContent");
  if (!root) return;

  const idInput = document.getElementById("prodSetIdInput");
  const cpa = document.getElementById("prodSetCpa");
  const shipping = document.getElementById("prodSetShipping");
  const margin = document.getElementById("prodSetMargin");
  const finance = document.getElementById("prodSetFinanceScenario");

  if (idInput) idInput.value = "";
  if (cpa) cpa.value = "";
  if (shipping) shipping.value = "";
  if (margin) margin.value = "";
  if (finance) finance.value = "";

  document.querySelectorAll(".prodSetIdentity__typeBtn").forEach((btn) => {
    btn.classList.remove("is-active");
    btn.disabled = false;

    if (String(btn.dataset.type || "") === "bundle") {
      btn.classList.add("is-active");
    }
  });

  ["1", "2", "3"].forEach((slot) => {
    const skuEl = document.getElementById(`prodSetSku${slot}`);
    const qtyEl = document.getElementById(`prodSetQty${slot}`);
    const nameEl = document.getElementById(`prodSetName${slot}`);
    const costEl = document.getElementById(`prodSetCost${slot}`);

    if (skuEl) {
      skuEl.value = "";
      skuEl.disabled = false;
    }

    if (qtyEl) {
      qtyEl.value = "";
      qtyEl.disabled = false;
    }

    if (nameEl) nameEl.value = "";
    if (costEl) costEl.value = "";

    const card = document.querySelector(`.prodSetItem[data-pack-item="${slot}"]`);
    if (card) card.classList.remove("is-locked");
  });

  const successNotice = document.querySelector(".prodSetSuccessNotice");
  if (successNotice) successNotice.remove();

  syncProductosSetBuilderRuleTag_();
  syncProductosSetBuilderLocks_();
  updateProductosSetBuilderSummary_();
  syncProductosSetBuilderActionState_();
  refreshAllProductosSetBuilderSkuSelects_();
  closeProductosSetBuilderSkuSelects_();
}
/* ======= FIN · RESET COMPLETO DEL CONSTRUCTOR + UI CUSTOM ======= */

function renderProductosSlideOfertasActivas_() {
  const summaryWrap = document.getElementById("prodSlideOffersSummary");
  const list = document.getElementById("prodSlideOffersActivasList");

  if (!summaryWrap || !list) return;

  const resumen = ProductosState.offersSummary && ProductosState.offersSummary.resumen
    ? ProductosState.offersSummary.resumen
    : null;

  const items = getActiveOffersForSlide_();

  const activasTotales = resumen ? Number(resumen.ofertas_activas_total || 0) : 0;
  const equivalencias = resumen ? Number(resumen.ofertas_equivalencias_activas || 0) : 0;
  const bundles = resumen ? Number(resumen.ofertas_bundles_activas || 0) : 0;

  summaryWrap.innerHTML = `
    <div class="prodSlideOffersMini">
      <div class="prodSlideOffersMini__label">Activas totales</div>
      <div class="prodSlideOffersMini__value">${activasTotales}</div>
    </div>
    <div class="prodSlideOffersMini">
      <div class="prodSlideOffersMini__label">Equivalencias</div>
      <div class="prodSlideOffersMini__value">${equivalencias}</div>
    </div>
    <div class="prodSlideOffersMini">
      <div class="prodSlideOffersMini__label">Bundles</div>
      <div class="prodSlideOffersMini__value">${bundles}</div>
    </div>
  `;

  if (!items.length) {
    list.innerHTML = `
      <div class="prodSlideOffersEmpty">
        No se encontraron ofertas activas para mostrar en este momento.
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((item) => {
    const origin = formatOfferOrigin_(item);
    const desc = formatOfferDescription_(item);
    const filas = Number(item.cantidad_filas || 0);
    const estado = String(item.estado || "inactivo");
    const origenTabla = String(item.origen_tabla || item.sheet || "-");
    const skus = Array.isArray(item.skus) ? item.skus : [];

    const skuHtml = skus.length
      ? `
        <div class="prodOfferSkuList">
          ${skus.map((sku) => `
            <span class="prodOfferSkuTag">${escapeHtml_(sku)}</span>
          `).join("")}
        </div>
      `
      : `
        <div class="prodOfferSkuList">
          <span class="prodOfferSkuEmpty">Sin SKU visible</span>
        </div>
      `;

    return `
      <article class="prodOfferCard">
        <div class="prodOfferCard__top">
          <div class="prodOfferCard__chips">
            <span class="prodOfferChip prodOfferChip--blue">${escapeHtml_(origin)}</span>
            <span class="prodOfferChip prodOfferChip--green">${escapeHtml_(estado)}</span>
            <span class="prodOfferChip prodOfferChip--purple">${escapeHtml_(origenTabla)}</span>
          </div>
        </div>

        <h3 class="prodOfferCard__id">${escapeHtml_(item.id_variante || "-")}</h3>
        <p class="prodOfferCard__desc">${escapeHtml_(desc)}</p>

        <div class="prodOfferMeta">
          <div class="prodOfferMeta__item">
            <div class="prodOfferMeta__label">ID Variante</div>
            <div class="prodOfferMeta__value">${escapeHtml_(item.id_variante || "-")}</div>
          </div>

          <div class="prodOfferMeta__item">
            <div class="prodOfferMeta__label">Filas internas</div>
            <div class="prodOfferMeta__value">${filas}</div>
          </div>

          <div class="prodOfferMeta__item">
            <div class="prodOfferMeta__label">SKUs detectados</div>
            <div class="prodOfferMeta__value">${skus.length}</div>
          </div>
        </div>

        <div class="prodOfferSkuBlock">
          <div class="prodOfferSkuBlock__label">SKUs involucrados</div>
          ${skuHtml}
        </div>
      </article>
    `;
  }).join("");
}

/* ======= FIN · RENDER PARTIAL OFERTAS ACTIVAS ======= */
/* ======= FIN · SLIDE CONTROL ======= */
function renderProductos_() {
  applyProductosFilters_();
  renderProductosKpis_();
  renderProductosTable_();
  wireProductosLocalSwitches_();
  wireProductosTableSearch_();
  syncProductosTableSearchValue_();
}

async function loadProductos_() {
  setProductosDebugRow_("Consultando backend de productos...");

  const url = `${PRODUCTOS_BACKEND_URL}?action=getProductos&_t=${Date.now()}`;
  const res = await jsonp(url);

  if (!res || res.ok !== true) {
    setProductosDebugRow_(
      `Error al cargar productos: ${
        (res && res.error) ? escapeHtml_(res.error) : "respuesta inválida del backend"
      }`
    );
    return;
  }

  const productos = Array.isArray(res.productos) ? res.productos : [];

  if (!productos.length) {
    setProductosDebugRow_("El backend respondió OK, pero no devolvió productos.");
    return;
  }

  ProductosState.all = productos.map((item) => ({
    sku: String(item.sku || "").trim(),
    nombre: String(item.nombre || "").trim(),
    activo: item.activo === true,
    neto_pretendido: Number(item.neto_pretendido || 0),
    precio_venta: Number(item.precio_venta || 0)
  }));

  window.__PRODUCTOS_CACHE__ = {
    productos: ProductosState.all.map((p) => ({ ...p }))
  };

  renderProductos_();
}
/* ======= INICIO · CARGA RESUMEN DE OFERTAS ======= */
/* Consulta el endpoint getOffersSummary y alimenta las 3 tarjetas de ofertas */
async function loadOffersSummary_() {
  const url = `${PRODUCTOS_BACKEND_URL}?action=getOffersSummary&_t=${Date.now()}`;
  const res = await jsonp(url);

  if (!res || res.ok !== true) {
    console.warn("[productos.js] getOffersSummary no respondió OK", res);
    return;
  }

  ProductosState.offersSummary = res;

  window.__PRODUCTOS_CACHE__ = window.__PRODUCTOS_CACHE__ || {};
  window.__PRODUCTOS_CACHE__.offersSummary = JSON.parse(JSON.stringify(res));

  renderProductosKpis_();
}
/* ======= FIN · CARGA RESUMEN DE OFERTAS ======= */

/* ======= INICIO · TAB OFERTAS ======= */

function getProdOffersTbody_() {
  return document.getElementById("prodOffersTableBody");
}

function getProdOffersNote_() {
  return document.getElementById("prodOffersTableNote");
}

function formatOfferDateDisplay_(value) {
  const s = String(value || "").trim();
  if (!s) return "—";
  if (s === "A definir") return "A definir";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split("-");
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const ms = Date.parse(s);
  if (!isNaN(ms)) {
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return s;
}

function formatOfferDateTimeDisplay_(value) {
  const s = String(value || "").trim();
  if (!s) return "—";

  const ms = Date.parse(s);
  if (isNaN(ms)) return s;

  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatOfferVigencia_(item) {
  const desde = String(item && item.vigencia_desde || "").trim();
  const hasta = String(item && item.vigencia_hasta || "").trim();

  const desdeTxt = formatOfferDateDisplay_(desde);
  const hastaTxt = formatOfferDateDisplay_(hasta);

  if ((!desde || desde === "A definir") && (!hasta || hasta === "A definir")) {
    return "A definir";
  }

  return `${desdeTxt} → ${hastaTxt}`;
}

function parseOfferCreationMs_(item) {
  const s = String(item && item.fecha_creacion || "").trim();
  const ms = Date.parse(s);
  return isNaN(ms) ? 0 : ms;
}

function applyOffersFilters_() {
  const q = normalize_(ProductosState.offersSearch);
  const from = String(ProductosState.offersDateFrom || "").trim();
  const to = String(ProductosState.offersDateTo || "").trim();
  const sort = String(ProductosState.offersSort || "fecha_desc").trim();

  let rows = Array.isArray(ProductosState.offersAll)
    ? ProductosState.offersAll.slice()
    : [];

  rows = rows.filter((item) => {
    const haystack = [
      item.oferta_id,
      item.id_variante,
      item.tipo_oferta,
      item.nombre_interno,
      item.nombre_comercial,
      item.subtitulo_oferta,
      item.descripcion_corta
    ].join(" | ").toLowerCase();

    if (q && !haystack.includes(q)) return false;

    const fechaCreacion = String(item.fecha_creacion || "").trim();
    const ms = Date.parse(fechaCreacion);

    if (from) {
      const fromMs = Date.parse(`${from}T00:00:00-03:00`);
      if (!isNaN(ms) && ms < fromMs) return false;
    }

    if (to) {
      const toMs = Date.parse(`${to}T23:59:59-03:00`);
      if (!isNaN(ms) && ms > toMs) return false;
    }

    return true;
  });

  rows.sort((a, b) => {
    if (sort === "fecha_asc") {
      return parseOfferCreationMs_(a) - parseOfferCreationMs_(b);
    }

    if (sort === "nombre_asc") {
      return String(a.nombre_comercial || a.nombre_interno || "")
        .localeCompare(String(b.nombre_comercial || b.nombre_interno || ""), "es");
    }

    if (sort === "tipo_asc") {
      return String(a.tipo_oferta || "")
        .localeCompare(String(b.tipo_oferta || ""), "es");
    }

    return parseOfferCreationMs_(b) - parseOfferCreationMs_(a);
  });

  ProductosState.offersFiltered = rows;
}

/* ======= INICIO · BUSCADOR LOCAL TABLA SKUS ======= */
function getProductosTableSearchInput_() {
  return document.getElementById("prodTableSearchInput");
}

function syncProductosTableSearchValue_() {
  const input = getProductosTableSearchInput_();
  if (!input) return;

  const stateValue = String(ProductosState.search || "");
  if (input.value !== stateValue) {
    input.value = stateValue;
  }
}

function wireProductosTableSearch_() {
  const input = getProductosTableSearchInput_();
  if (!input || input.dataset.bound === "1") return;

  input.dataset.bound = "1";

  input.addEventListener("input", () => {
    ProductosState.search = String(input.value || "").trim();

    applyProductosFilters_();
    renderProductosTable_();
    wireProductosLocalSwitches_();
  });
}
/* ======= FIN · BUSCADOR LOCAL TABLA SKUS ======= */

function renderOffersLoading_() {
  const tbody = getProdOffersTbody_();
  const note = getProdOffersNote_();

  if (note) note.textContent = "Cargando ofertas...";
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="prodTableEmpty">Cargando ofertas...</td>
    </tr>
  `;
}

function renderOffersError_(message) {
  const tbody = getProdOffersTbody_();
  const note = getProdOffersNote_();

  if (note) note.textContent = "Error de carga";
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="prodTableEmpty">${escapeHtml_(message || "No se pudieron cargar las ofertas.")}</td>
    </tr>
  `;
}

function renderOffersTable_() {
  const tbody = getProdOffersTbody_();
  const note = getProdOffersNote_();
  if (!tbody) return;

  applyOffersFilters_();

  const rows = Array.isArray(ProductosState.offersFiltered)
    ? ProductosState.offersFiltered
    : [];

  if (note) {
    note.textContent = rows.length
      ? `${rows.length} oferta${rows.length === 1 ? "" : "s"} encontrada${rows.length === 1 ? "" : "s"}`
      : "No hay ofertas para mostrar.";
  }

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="prodTableEmpty">No se encontraron ofertas con los filtros actuales.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((item, index) => {
    const detailId = `prodOfferDetailRow_${index}`;
    const nombrePrincipal = item.nombre_comercial || item.nombre_interno || "Sin nombre";
    const subtitulo = item.subtitulo_oferta || "Sin subtítulo";
    const tipo = item.tipo_oferta === "cantidad" ? "Cantidad" : "Bundle";
    const vigencia = formatOfferVigencia_(item);
    const fechaCreacion = formatOfferDateTimeDisplay_(item.fecha_creacion);

    return `
      <tr
        class="prodOffersRow prodOffersRow--main"
        data-detail-id="${detailId}"
        aria-expanded="false"
      >
        <td>
          <button type="button" class="prodOffersExpandBtn" aria-label="Ver detalle de oferta">
            <span class="prodOffersExpandBtn__chevron"></span>
          </button>
        </td>
        <td><div class="prodTable__sku">${escapeHtml_(item.oferta_id || "—")}</div></td>
        <td>
          <div class="prodTable__name">${escapeHtml_(nombrePrincipal)}</div>
          <div class="prodOffersRow__sub">${escapeHtml_(subtitulo)}</div>
        </td>
        <td><span class="badge">${escapeHtml_(tipo)}</span></td>
        <td><div class="prodTable__sku">${escapeHtml_(item.id_variante || "—")}</div></td>
        <td><div class="prodOffersRow__vigencia">${escapeHtml_(vigencia)}</div></td>
        <td><div class="prodOffersRow__date">${escapeHtml_(fechaCreacion)}</div></td>
      </tr>

      <tr
      id="${detailId}"
      class="prodOffersRow prodOffersRow--detail"
      hidden
    >
      <td colspan="7">
        <div class="prodOffersExpand">
          <div class="prodOffersExpand__topbar">
            <button
              type="button"
              class="prodOffersEditBtn"
              aria-label="Editar oferta"
              title="Editar oferta"
            >
              <span class="prodOffersEditBtn__icon" aria-hidden="true"></span>
            </button>
          </div>

          <div class="prodOffersExpand__grid">
            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Nombre interno</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.nombre_interno || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Descripción corta</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.descripcion_corta || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Política de compra</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.politica_compra || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Política de envío</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.politica_envio || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Política de devolución</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.politica_devolucion || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Condiciones generales</div>
              <div class="prodOffersExpand__value">${escapeHtml_(item.condiciones_generales || "—")}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Fecha creación</div>
              <div class="prodOffersExpand__value">${escapeHtml_(formatOfferDateTimeDisplay_(item.fecha_creacion))}</div>
            </div>

            <div class="prodOffersExpand__block">
              <div class="prodOffersExpand__label">Fecha actualización</div>
              <div class="prodOffersExpand__value">${escapeHtml_(formatOfferDateTimeDisplay_(item.fecha_actualizacion))}</div>
            </div>
          </div>
        </div>
      </td>
    </tr>
    `;
  }).join("");

  wireOffersExpandable_();
}

function wireOffersExpandable_() {
  const tbody = getProdOffersTbody_();
  if (!tbody || tbody.dataset.expandableWired === "true") return;

  tbody.dataset.expandableWired = "true";

  tbody.addEventListener("click", (event) => {
    const triggerRow = event.target.closest(".prodOffersRow--main");
    if (!triggerRow || !tbody.contains(triggerRow)) return;

    const detailId = triggerRow.getAttribute("data-detail-id");
    if (!detailId) return;

    const detailRow = document.getElementById(detailId);
    if (!detailRow) return;

    const willOpen = detailRow.hidden;

    tbody.querySelectorAll(".prodOffersRow--main.is-open").forEach((row) => {
      row.classList.remove("is-open");
      row.setAttribute("aria-expanded", "false");
    });

    tbody.querySelectorAll(".prodOffersRow--detail").forEach((row) => {
      row.hidden = true;
    });

    if (willOpen) {
      triggerRow.classList.add("is-open");
      triggerRow.setAttribute("aria-expanded", "true");
      detailRow.hidden = false;
    }
  });
}

function wireOffersFilters_() {
  const input = document.getElementById("prodOffersSearchInput");
  const fromEl = document.getElementById("prodOffersDateFrom");
  const toEl = document.getElementById("prodOffersDateTo");
  const sortEl = document.getElementById("prodOffersSort");

  if (input && !input.dataset.bound) {
    input.dataset.bound = "1";
    input.addEventListener("input", () => {
      ProductosState.offersSearch = String(input.value || "");
      renderOffersTable_();
    });
  }

  if (fromEl && !fromEl.dataset.bound) {
    fromEl.dataset.bound = "1";
    fromEl.addEventListener("change", () => {
      ProductosState.offersDateFrom = String(fromEl.value || "");
      renderOffersTable_();
    });
  }

  if (toEl && !toEl.dataset.bound) {
    toEl.dataset.bound = "1";
    toEl.addEventListener("change", () => {
      ProductosState.offersDateTo = String(toEl.value || "");
      renderOffersTable_();
    });
  }

  if (sortEl && !sortEl.dataset.bound) {
    sortEl.dataset.bound = "1";
    sortEl.addEventListener("change", () => {
      ProductosState.offersSort = String(sortEl.value || "fecha_desc");
      renderOffersTable_();
    });
  }
}

function initPanelOfertas_() {
  const tbody = getProdOffersTbody_();
  if (!tbody) return;

  wireOffersFilters_();

  if (ProductosState.offersLoaded) {
    renderOffersTable_();
    return;
  }

  loadOffers_();
}

async function loadOffers_() {
  if (ProductosState.offersLoading) return;

  const tbody = getProdOffersTbody_();
  if (!tbody) return;

  ProductosState.offersLoading = true;
  renderOffersLoading_();

  try {
    const url = `${PRODUCTOS_BACKEND_URL}?action=getOffers&_t=${Date.now()}`;
    const res = await jsonp(url);

    if (!res || res.ok !== true) {
      renderOffersError_(res && res.error ? String(res.error) : "No se pudieron cargar las ofertas.");
      return;
    }

    const offers = Array.isArray(res.offers) ? res.offers : [];

    ProductosState.offersAll = offers.map((item) => ({
      oferta_id: String(item.oferta_id || "").trim(),
      id_variante: String(item.id_variante || "").trim(),
      tipo_oferta: String(item.tipo_oferta || "").trim(),
      nombre_interno: String(item.nombre_interno || "").trim(),
      nombre_comercial: String(item.nombre_comercial || "").trim(),
      subtitulo_oferta: String(item.subtitulo_oferta || "").trim(),
      descripcion_corta: String(item.descripcion_corta || "").trim(),
      politica_compra: String(item.politica_compra || "").trim(),
      politica_envio: String(item.politica_envio || "").trim(),
      politica_devolucion: String(item.politica_devolucion || "").trim(),
      condiciones_generales: String(item.condiciones_generales || "").trim(),
      estado_oferta: String(item.estado_oferta || "").trim(),
      vigencia_desde: String(item.vigencia_desde || "").trim(),
      vigencia_hasta: String(item.vigencia_hasta || "").trim(),
      prioridad_oferta: String(item.prioridad_oferta || "").trim(),
      canal_previsto: String(item.canal_previsto || "").trim(),
      permite_publicacion: String(item.permite_publicacion || "").trim(),
      observaciones_internas: String(item.observaciones_internas || "").trim(),
      fecha_creacion: String(item.fecha_creacion || "").trim(),
      fecha_actualizacion: String(item.fecha_actualizacion || "").trim(),
      creada_por: String(item.creada_por || "").trim(),
      actualizada_por: String(item.actualizada_por || "").trim(),
      origen_registro: String(item.origen_registro || "").trim()
    }));

    ProductosState.offersLoaded = true;

    window.__PRODUCTOS_CACHE__ = window.__PRODUCTOS_CACHE__ || {};
    window.__PRODUCTOS_CACHE__.offers = JSON.parse(JSON.stringify(ProductosState.offersAll));

    renderOffersTable_();
  } catch (err) {
    console.error("[productos.js] Error cargando ofertas:", err);
    renderOffersError_("Error cargando ofertas desde el backend.");
  } finally {
    ProductosState.offersLoading = false;
  }
}

/* ======= FIN · TAB OFERTAS ======= */

function switchProductosTab_(tabName) {
  ProductosState.activeTab = tabName;

  document.querySelectorAll(".prodTab").forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  /* ======= INICIO · MAPA DE PANELES DE PRODUCTOS ======= */
  const map = {
    resumen: document.getElementById("prodPanelResumen"),
    skus: document.getElementById("prodPanelSkus"),
    ofertas: document.getElementById("prodPanelOfertas"),
    conjuntos: document.getElementById("prodPanelConjuntos"),
    rentabilidad: document.getElementById("prodPanelRentabilidad")
  };
  /* ======= FIN · MAPA DE PANELES DE PRODUCTOS ======= */

  Object.keys(map).forEach((key) => {
    const panel = map[key];
    if (!panel) return;
    panel.style.display = key === tabName ? "block" : "none";
  });

  /* ======= INICIO · INIT TAB OFERTAS ======= */
  if (tabName === "ofertas") {
    initPanelOfertas_();
  }
  /* ======= FIN · INIT TAB OFERTAS ======= */

  /* ======= INICIO · INIT TAB CONJUNTOS ======= */
  if (tabName === "conjuntos") {
    initPanelConjuntos_();
  }
  /* ======= FIN · INIT TAB CONJUNTOS ======= */
}
function wireProductosTabs_() {
  document.querySelectorAll(".prodTab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = String(btn.dataset.tab || "resumen");
      switchProductosTab_(tab);
    });
  });
}

function wireProductosFilters_() {
  const input = document.getElementById("prodSearchInput");
  const select = document.getElementById("prodTypeFilter");

  if (input) {
    input.addEventListener("input", () => {
      ProductosState.search = input.value || "";
      renderProductos_();
    });
  }

  if (select) {
    select.addEventListener("change", () => {
      ProductosState.type = String(select.value || "todos");
      renderProductos_();
    });
  }
}
/* ========================================================= */
/* INICIO · PANEL CONJUNTOS DE PRODUCTOS */
/* ========================================================= */

function initPanelConjuntos_() {
  if (ProductosState.productSetsLoading) return;

  if (ProductosState.productSetsLoaded) {
    renderProductSetsTable_(Array.isArray(ProductosState.productSets) ? ProductosState.productSets : []);
    return;
  }

  loadProductSets_();
}

async function loadProductSets_() {
  if (ProductosState.productSetsLoading) return;

  ProductosState.productSetsLoading = true;
  renderProductSetsLoading_();

  const url = `${PRODUCTOS_BACKEND_URL}?action=getProductSets&_t=${Date.now()}`;
  const res = await jsonp(url);

  try {
    if (!res || res.ok !== true) {
      renderProductSetsError_("No se pudieron cargar los conjuntos desde el backend.");
      return;
    }

    const sets = Array.isArray(res.sets) ? res.sets : [];

    ProductosState.productSets = sets;
    ProductosState.productSetsLoaded = true;

    renderProductSetsTable_(sets);
  } catch (err) {
    console.error("[productos.js] Error cargando conjuntos:", err);
    renderProductSetsError_("Error interpretando los conjuntos.");
  } finally {
    ProductosState.productSetsLoading = false;
  }
}

function renderProductSetsLoading_() {
  const tbody = document.getElementById("prodSetsTableBody");
  const note = document.getElementById("prodSetsTableNote");

  if (note) {
    note.textContent = "Cargando conjuntos...";
  }

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="prodSetsTable__empty">Cargando conjuntos...</td>
    </tr>
  `;
}

function renderProductSetsError_(message) {
  const tbody = document.getElementById("prodSetsTableBody");
  const note = document.getElementById("prodSetsTableNote");

  if (note) {
    note.textContent = "Error de carga";
  }

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="prodSetsTable__empty">${escapeHtml_(message)}</td>
    </tr>
  `;
}

function wireProductSetsExpandable_() {
  const tbody = document.getElementById("prodSetsTableBody");
  if (!tbody || tbody.dataset.expandableWired === "true") return;

  tbody.dataset.expandableWired = "true";

  tbody.addEventListener("click", (event) => {
    const triggerRow = event.target.closest(".prodSetsRow--main");
    if (!triggerRow || !tbody.contains(triggerRow)) return;

    const detailId = triggerRow.getAttribute("data-detail-id");
    if (!detailId) return;

    const detailRow = document.getElementById(detailId);
    if (!detailRow) return;

    const willOpen = detailRow.hidden;

    tbody.querySelectorAll(".prodSetsRow--main.is-open").forEach((row) => {
      row.classList.remove("is-open");
      row.setAttribute("aria-expanded", "false");
    });

    tbody.querySelectorAll(".prodSetsRow--detail").forEach((row) => {
      row.hidden = true;
    });

    if (willOpen) {
      triggerRow.classList.add("is-open");
      triggerRow.setAttribute("aria-expanded", "true");
      detailRow.hidden = false;
    }
  });
}

function renderProductSetsTable_(sets) {
  const tbody = document.getElementById("prodSetsTableBody");
  const note = document.getElementById("prodSetsTableNote");

  if (!tbody) return;

  wireProductSetsExpandable_();

  if (!Array.isArray(sets) || !sets.length) {
    if (note) {
      note.textContent = "Sin conjuntos cargados";
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="prodSetsTable__empty">No hay conjuntos disponibles.</td>
      </tr>
    `;
    return;
  }

  if (note) {
    note.textContent = `${sets.length} conjuntos cargados`;
  }

  tbody.innerHTML = sets.map((item, index) => {
    const tipo = String(item.tipo_oferta || "").trim().toLowerCase();
    const tipoLabel = tipo === "cantidad" ? "Cantidad" : "Bundle";
    const tipoClass = tipo === "cantidad"
      ? "prodSetsCell__type prodSetsCell__type--cantidad"
      : "prodSetsCell__type prodSetsCell__type--bundle";

    const detailId = `prodSetsDetailRow_${index}`;
    const idVariante = escapeHtml_(item.id_variante || "-");
    const composicion = escapeHtml_(item.composicion_resumen || "-");
    const escenario = escapeHtml_(item.escenario_financiero_id || "-");

    return `
      <tr
        class="prodSetsRow--main"
        data-detail-id="${detailId}"
        aria-expanded="false"
      >
        <td>
          <div class="prodSetsCell__idWrap">
            <span class="prodSetsCell__caret" aria-hidden="true"></span>
            <div class="prodSetsCell__id">${idVariante}</div>
          </div>
        </td>
        <td><span class="${tipoClass}">${tipoLabel}</span></td>
        <td><div class="prodSetsCell__composition">${composicion}</div></td>
        <td><div class="prodSetsCell__money">${formatMoneyAr_(item.costo_productos)}</div></td>
        <td><div class="prodSetsCell__money">${formatMoneyAr_(item.base_operativa_pack)}</div></td>
        <td><div class="prodSetsCell__money">${formatMoneyAr_(item.precio_final_pack)}</div></td>
        <td><div class="prodSetsCell__scenario">${escenario}</div></td>
      </tr>

      <tr
        id="${detailId}"
        class="prodSetsRow--detail"
        hidden
      >
        <td colspan="7">
          <div class="prodSetsExpand">
            <div class="prodSetsExpand__grid">
              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">ID de variante</div>
                <div class="prodSetsExpand__value">${idVariante}</div>
              </div>

              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">Tipo de oferta</div>
                <div class="prodSetsExpand__value">${tipoLabel}</div>
              </div>

              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">Costo productos</div>
                <div class="prodSetsExpand__value">${formatMoneyAr_(item.costo_productos)}</div>
              </div>

              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">Base operativa</div>
                <div class="prodSetsExpand__value">${formatMoneyAr_(item.base_operativa_pack)}</div>
              </div>

              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">Precio final</div>
                <div class="prodSetsExpand__value">${formatMoneyAr_(item.precio_final_pack)}</div>
              </div>

              <div class="prodSetsExpand__item">
                <div class="prodSetsExpand__label">Escenario financiero</div>
                <div class="prodSetsExpand__value">${escenario}</div>
              </div>
            </div>

            <div class="prodSetsExpand__block">
              <div class="prodSetsExpand__label">Composición completa</div>
              <div class="prodSetsExpand__value prodSetsExpand__value--composition">${composicion}</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/* ========================================================= */
/* FIN · PANEL CONJUNTOS DE PRODUCTOS */
/* ========================================================= */

/* ======= INICIO · INIT DE PRODUCTOS ======= */
/* Inicializa tabs, filtros, tabla, KPIs y resumen de ofertas */
function initProductos_() {
  const tableBody = getProductosTbody_();
  const tabResumen = document.getElementById("prodTabResumen");

  if (!tableBody) return;
  if (!tabResumen) return;
  if (window.__productosInited === true) return;

  window.__productosInited = true;

  wireProductosSlideHeaderActions_();
  wireProductosCreateProductSlide_();
  wireProductosCreateProductDelegatedUi_();
  wireProductosCreateSkuConfirmDelegatedUi_();
  wireProductosTabs_();
  wireProductosFilters_();
  switchProductosTab_("resumen");
  /* ======= INICIO · CLICK EN KPIs ======= */

const kpiOfertas = document.getElementById("prodKpiOfertas");
const kpiPacks = document.getElementById("prodKpiPacks");
const kpiBundles = document.getElementById("prodKpiBundles");

if (kpiOfertas && !kpiOfertas.dataset.bound) {
  kpiOfertas.dataset.bound = "1";
  kpiOfertas.addEventListener("click", () => {
    openProductosSlide_(
      "Ofertas activas",
      "/partials/productos-slide-ofertas-activas.html"
    );
  });
}

if (kpiPacks && !kpiPacks.dataset.bound) {
  kpiPacks.dataset.bound = "1";
  kpiPacks.addEventListener("click", () => {
    openProductosSlide_(
      "Ofertas en cantidad",
      "/partials/productos-slide-ofertas-cantidad.html"
    );
  });
}

if (kpiBundles && !kpiBundles.dataset.bound) {
  kpiBundles.dataset.bound = "1";
  kpiBundles.addEventListener("click", () => {
    openProductosSlide_(
      "Productos combinados",
      "/partials/productos-slide-bundles.html"
    );
  });
}

/* ======= FIN · CLICK EN KPIs ======= */
/* ======= INICIO · CIERRE SLIDE ======= */

const closeBtn = document.getElementById("prodSlideCloseBtn");
const overlay = document.getElementById("prodSlideOverlay");
const createSetBtn = document.getElementById("prodSlideCreateSetBtn");
const subSlideBackBtn = document.getElementById("prodSubSlideBackBtn");
const subSlideCloseBtn = document.getElementById("prodSubSlideCloseBtn");

const newOfferBtn = document.getElementById("prodNewOfferBtn");
const offerModalOverlay = document.getElementById("prodOfferModalOverlay");
const offerModalCloseBtn = document.getElementById("prodOfferModalCloseBtn");

if (closeBtn && !closeBtn.dataset.bound) {
  closeBtn.dataset.bound = "1";
  closeBtn.addEventListener("click", closeProductosSlide_);
}

if (overlay && !overlay.dataset.bound) {
  overlay.dataset.bound = "1";
  overlay.addEventListener("click", closeProductosSlide_);
}
if (subSlideBackBtn && !subSlideBackBtn.dataset.bound) {
  subSlideBackBtn.dataset.bound = "1";
  subSlideBackBtn.addEventListener("click", closeProductosSubSlide_);
}

if (subSlideCloseBtn && !subSlideCloseBtn.dataset.bound) {
  subSlideCloseBtn.dataset.bound = "1";
  subSlideCloseBtn.addEventListener("click", closeProductosSubSlide_);
}

if (newOfferBtn && !newOfferBtn.dataset.bound) {
  newOfferBtn.dataset.bound = "1";
  newOfferBtn.addEventListener("click", openProductosNuevaOfertaModal_);
}

if (offerModalOverlay && !offerModalOverlay.dataset.bound) {
  offerModalOverlay.dataset.bound = "1";
  offerModalOverlay.addEventListener("click", closeProductosNuevaOfertaModal_);
}

if (offerModalCloseBtn && !offerModalCloseBtn.dataset.bound) {
  offerModalCloseBtn.dataset.bound = "1";
  offerModalCloseBtn.addEventListener("click", closeProductosNuevaOfertaModal_);
}

/* ======= FIN · CIERRE SLIDE ======= */

  const cache = window.__PRODUCTOS_CACHE__;

  if (cache && Array.isArray(cache.productos) && cache.productos.length) {
    ProductosState.all = cache.productos.map((p) => ({ ...p }));
  }

  if (cache && cache.offersSummary) {
    ProductosState.offersSummary = JSON.parse(JSON.stringify(cache.offersSummary));
  }

  if (cache && Array.isArray(cache.offers) && cache.offers.length) {
    ProductosState.offersAll = cache.offers.map((item) => ({ ...item }));
    ProductosState.offersLoaded = true;
  }

  renderProductos_();
  loadOffersSummary_();

  if (!cache || !Array.isArray(cache.productos) || !cache.productos.length) {
    loadProductos_();
  }
}
/* ======= FIN · INIT DE PRODUCTOS ======= */
function bootProductos_() {
  const tbody = getProductosTbody_();
  if (!tbody) return;
  window.__productosInited = false;
  initProductos_();
}

document.addEventListener("DOMContentLoaded", bootProductos_);

document.addEventListener("sazzu:page:load", () => {
  setTimeout(bootProductos_, 50);
  setTimeout(bootProductos_, 250);
  setTimeout(bootProductos_, 600);
});

window.ProductosMount = function () {
  setTimeout(bootProductos_, 50);
  setTimeout(bootProductos_, 250);
  setTimeout(bootProductos_, 600);
};
/* =========================================================
   PRODUCTOS - DONA RESUMEN SKU
   Pegar al final de productos.js, debajo de window.ProductosMount
   ========================================================= */

   (function () {
    const SKU_DONUT_CACHE_KEY = "__productosSkuResumenCache__";
  
    const state = {
      metric: "facturacion",
      data: null,
      animatedOnce: false,
      booted: false
    };
  
    const els = {};
  
    function qs(id) {
      return document.getElementById(id);
    }
  
    function moneyAR_(value) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    }
  
    function numberAR_(value) {
      return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    }
  
    function escapeHtml_(str) {
      return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  
    function getBackendUrl_() {
      return (
        window.__PRODUCTOS_BACKEND_URL__ ||
        PRODUCTOS_BACKEND_URL ||
        window.BACKEND_URL ||
        window.API_URL ||
        window.__BACKEND_URL__ ||
        window.SAZZU_BACKEND_URL ||
        ""
      );
    }
  
    function getRangeParams_() {
      const from = els.from && els.from.value ? `${els.from.value}T00:00:00-03:00` : "";
      const to = els.to && els.to.value ? `${els.to.value}T23:59:59-03:00` : "";
      return { from, to };
    }
  
    function rangeKey_(params) {
      return `${params.from || "all"}__${params.to || "all"}`;
    }
  
    function getSkuResumenStore_() {
      if (!window[SKU_DONUT_CACHE_KEY]) window[SKU_DONUT_CACHE_KEY] = {};
      return window[SKU_DONUT_CACHE_KEY];
    }
  
    function captureSkuEls_() {
      els.card = qs("prodSkuDonutChart");
      els.tooltip = qs("prodSkuTooltip");
      els.from = qs("prodSkuFrom");
      els.to = qs("prodSkuTo");
      els.apply = qs("prodSkuApplyRange");
    
      els.metricFact = qs("prodMetricFacturacion");
      els.metricVol = qs("prodMetricVolumen");
    
      els.facturacionTotal = qs("prodSkuFacturacionTotal");
      els.ventasTotal = qs("prodSkuVentasTotal");
      els.volumenTotal = qs("prodSkuVolumenTotal");
    
      /* REEMPLAZO: Eliminamos referencias a textos centrales borrados */
    els.centerKicker = null;
    els.centerValue = null;
    els.centerSub    = null;
    
      els.legendNote = qs("prodSkuLegendNote");
      els.legendList = qs("prodSkuLegendList");
      els.slices = qs("prodSkuDonutSlices");
    }
  
    function polarToCartesian_(cx, cy, r, angleDeg) {
      const angle = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: cx + (r * Math.cos(angle)),
        y: cy + (r * Math.sin(angle))
      };
    }
  
    function describeArc_(cx, cy, r, startAngle, endAngle) {
      const start = polarToCartesian_(cx, cy, r, endAngle);
      const end = polarToCartesian_(cx, cy, r, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
      return [
        "M", start.x, start.y,
        "A", r, r, 0, largeArcFlag, 0, end.x, end.y
      ].join(" ");
    }
  
    function getSoftPalette_() {
      return [
        "#2479FF", // azul
        "#FF4D4F", // rojo
        "#22C55E", // verde
        "#F59E0B", // ámbar
        "#7C3AED",
        "#06B6D4",
        "#EC4899",
        "#64748B"
      ];
    }
  
    function getCurrentDataset_() {
      if (!state.data) return [];
      return state.metric === "volumen"
        ? (state.data.donut_volumen || [])
        : (state.data.donut_facturacion || []);
    }
  
    function renderSkuError_(message) {
      if (els.legendList) {
        els.legendList.innerHTML = `<div class="prodSkuLegendEmpty">${escapeHtml_(message)}</div>`;
      }
      if (els.centerValue) els.centerValue.textContent = "—";
    }
  
    function renderTotals_() {
      if (!state.data) return;
  
      const totals = state.data.totals || {};
  
      if (els.facturacionTotal) {
        els.facturacionTotal.textContent = moneyAR_(totals.total_facturacion || 0);
      }
      if (els.ventasTotal) {
        els.ventasTotal.textContent = numberAR_(totals.total_ventas_sku || 0);
      }
      if (els.volumenTotal) {
        els.volumenTotal.textContent = numberAR_(totals.total_volumen_unidades || 0);
      }
    }
  
   /* =========================================================
   INICIO · REEMPLAZO SEGURO DE RENDERCENTER
   Esta versión no busca elementos borrados y evita errores.
   ========================================================= */
function renderCenter_() {
  if (!state.data) return;

  // Solo actualizamos la nota de la leyenda que vive fuera de la dona
  if (els.legendNote) {
    els.legendNote.textContent = state.metric === "volumen"
      ? "Participación por volumen"
      : "Participación por facturación";
  }
  
  // Nota: Se eliminaron las referencias a centerKicker, centerValue y centerSub 
  // para que el JS no se rompa al no encontrarlos en el HTML.
}
/* =========================================================
   FIN · REEMPLAZO SEGURO
   ========================================================= */
  
    function renderLegend_() {
      if (!els.legendList) return;
    
      const items = getCurrentDataset_()
      .slice()
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 4);      const palette = getSoftPalette_();
    
      if (!items.length) {
        els.legendList.innerHTML = `<div class="prodSkuLegendEmpty">Sin datos para el rango seleccionado</div>`;
        return;
      }
    
      els.legendList.innerHTML = items.map(function (item, index) {
        const color = palette[index % palette.length];
        const mainValue = state.metric === "volumen"
          ? `${numberAR_(item.value || 0)} u`
          : moneyAR_(item.value || 0);
    
        const subValue = state.metric === "volumen"
          ? `Facturación: ${moneyAR_(item.facturacion_total_sku || 0)}`
          : `Promedio SKU: ${moneyAR_(item.facturacion_promedio_por_sku || 0)}`;
    
          return `
          <div class="prodSkuLegendItem" style="--sku-color:${color};">
            <div class="prodSkuLegendItem__left">
              <span class="prodSkuLegendItem__dot"></span>
              <div class="prodSkuLegendItem__txt">
                <div class="prodSkuLegendItem__sku">${escapeHtml_(item.sku || "-")}</div>
                <div class="prodSkuLegendItem__sub">${escapeHtml_(subValue)}</div>
              </div>
            </div>
            <div class="prodSkuLegendItem__right">
              <div class="prodSkuLegendItem__value">${escapeHtml_(mainValue)}</div>
              <div class="prodSkuLegendItem__pct">${escapeHtml_(numberAR_(item.pct || 0) + "%")}</div>
            </div>
          </div>
        `;
      }).join("");
    }
    function hideSkuTooltip_() {
      if (!els.tooltip) return;
      els.tooltip.classList.remove("is-visible");
    }
    
    function showSkuTooltip_(event, item) {
      if (!els.tooltip || !els.card || !item) return;
    
      const rect = els.card.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
    
      const volumenMatch = Array.isArray(state.data?.donut_volumen)
        ? state.data.donut_volumen.find(function (row) {
            return String(row && row.sku || "") === String(item.sku || "");
          })
        : null;
    
      const facturacionValue = state.metric === "facturacion"
        ? Number(item.value || 0)
        : Number(item.facturacion_total_sku || 0);
    
      const volumenValue = state.metric === "facturacion"
        ? Number((volumenMatch && volumenMatch.value) || item.volumen_total_sku || 0)
        : Number(item.value || 0);
    
      const facturacion = moneyAR_(facturacionValue);
      const volumen = `${numberAR_(volumenValue)} u`;
      const pct = `${numberAR_(item.pct || 0)}%`;
    
      els.tooltip.innerHTML = `
        <div class="prodSkuTooltip__title">${escapeHtml_(item.sku || "-")}</div>
        <div class="prodSkuTooltip__row"><span>Facturación</span><strong>${facturacion}</strong></div>
        <div class="prodSkuTooltip__row"><span>Volumen</span><strong>${volumen}</strong></div>
        <div class="prodSkuTooltip__row"><span>Participación</span><strong>${pct}</strong></div>
      `;
    
      els.tooltip.style.left = `${localX}px`;
      els.tooltip.style.top = `${localY}px`;
      els.tooltip.classList.add("is-visible");
    }
    function renderSvgDonut_() {
      if (!els.slices) return;
    
      const items = getCurrentDataset_()
      .slice()
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 4);      const total = items.reduce(function (acc, item) {
        return acc + Number(item.value || 0);
      }, 0);
    
      els.slices.innerHTML = "";
hideSkuTooltip_();

if (!items.length || total <= 0) return;
    
      const palette = getSoftPalette_();
const cx = 110;
const cy = 110;
const r = 56;
const strokeWidth = 34;
const circumference = 2 * Math.PI * r;
let currentOffset = 0;
    
items.forEach(function (item, index) {
  const value = Number(item.value || 0);
  const fraction = total > 0 ? (value / total) : 0;
  const dash = circumference * fraction;

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", palette[index % palette.length]);
  circle.setAttribute("stroke-width", strokeWidth);
  circle.setAttribute("stroke-linecap", "butt");
  circle.setAttribute("transform", `rotate(-90 110 110)`);
  circle.setAttribute("stroke-dasharray", `${dash} ${circumference}`);
  circle.setAttribute("stroke-dashoffset", `${-currentOffset}`);
  circle.style.cursor = "pointer";

  circle.addEventListener("mousemove", function (event) {
    showSkuTooltip_(event, item);
  });

  circle.addEventListener("mouseleave", function () {
    hideSkuTooltip_();
  });

  if (!state.animatedOnce) {
    circle.style.opacity = "0";
    circle.style.transition = `opacity 360ms ease ${index * 90}ms`;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        circle.style.opacity = "1";
      });
    });
  }

  els.slices.appendChild(circle);
  currentOffset += dash;
});
    
      state.animatedOnce = true;
    }
  
    function syncMetricUI_() {
      if (els.metricFact) {
        const active = state.metric === "facturacion";
        els.metricFact.classList.toggle("is-active", active);
        els.metricFact.setAttribute("aria-pressed", active ? "true" : "false");
      }
  
      if (els.metricVol) {
        const active = state.metric === "volumen";
        els.metricVol.classList.toggle("is-active", active);
        els.metricVol.setAttribute("aria-pressed", active ? "true" : "false");
      }
    }
  
    function renderSkuResumen_() {
      if (!state.data) return;
      renderTotals_();
      renderCenter_();
      renderSvgDonut_();
      renderLegend_();
      syncMetricUI_();
    }
  
    async function fetchSkuResumen_(params) {
      const backendUrl = getBackendUrl_();
      if (!backendUrl) {
        renderSkuError_("No se encontró BACKEND_URL para Productos");
        return;
      }
    
      const query = new URLSearchParams({ action: "getSkuResumen" });
      if (params.from) query.set("from", params.from);
      if (params.to) query.set("to", params.to);
      query.set("_t", String(Date.now()));
    
      const url = `${backendUrl}?${query.toString()}`;
      return await jsonp(url);
    }
  
    async function loadSkuResumen_(params) {
      const store = getSkuResumenStore_();
      const key = rangeKey_(params);
  
      if (store[key]) {
        state.data = store[key];
        renderSkuResumen_();
        return;
      }
  
      try {
        const json = await fetchSkuResumen_(params);
  
        if (!json || !json.ok) {
          renderSkuError_(json && json.error ? json.error : "No se pudo cargar el resumen SKU");
          return;
        }
  
        store[key] = json;
        state.data = json;
        renderSkuResumen_();
      } catch (err) {
        renderSkuError_("Error cargando resumen SKU: " + String(err && err.message ? err.message : err));
      }
    }
  
    function bindSkuResumenEvents_() {
      if (els.metricFact && !els.metricFact.dataset.bound) {
        els.metricFact.dataset.bound = "1";
        els.metricFact.addEventListener("click", function () {
          state.metric = "facturacion";
          renderSkuResumen_();
        });
      }
  
      if (els.metricVol && !els.metricVol.dataset.bound) {
        els.metricVol.dataset.bound = "1";
        els.metricVol.addEventListener("click", function () {
          state.metric = "volumen";
          renderSkuResumen_();
        });
      }
  
      if (els.apply && !els.apply.dataset.bound) {
        els.apply.dataset.bound = "1";
        els.apply.addEventListener("click", function () {
          state.animatedOnce = true;
          loadSkuResumen_(getRangeParams_());
        });
      }
    }
  
    function bootSkuResumenCard_() {
      captureSkuEls_();
      if (!els.card) return;
  
      bindSkuResumenEvents_();
      loadSkuResumen_(getRangeParams_());
    }
  
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(bootSkuResumenCard_, 80);
    });
  
    document.addEventListener("sazzu:page:load", function () {
      setTimeout(bootSkuResumenCard_, 80);
      setTimeout(bootSkuResumenCard_, 260);
    });
  
    window.ProductosSkuResumenMount = function () {
      setTimeout(bootSkuResumenCard_, 80);
      setTimeout(bootSkuResumenCard_, 260);
    };
  })();
  /* ========================================================= */
/* INICIO · MÓDULO CONJUNTOS DE PRODUCTOS (AISLADO) */
/* ========================================================= */

function initConjuntos_() {
  console.log("[Productos] Init Conjuntos");

  const btnCrear = document.getElementById("prodConjuntosCrearBtn");

  if (!btnCrear) return;

  btnCrear.addEventListener("click", () => {
    console.log("[Conjuntos] Crear nueva oferta");

    // Futuro: abrir sub-slide o builder
    openSubSlideConjuntos_();
  });
}


/* ===== INICIO · ACCIÓN ABRIR SUB-SLIDE ===== */
function openSubSlideConjuntos_() {
  console.log("[Conjuntos] openSubSlide");

  const subSlide = document.getElementById("prodSubSlide");
  const overlay = document.getElementById("prodSlideOverlay");

  if (!subSlide || !overlay) return;

  subSlide.classList.add("is-active");
  subSlide.setAttribute("aria-hidden", "false");

  overlay.classList.add("is-active");
}
/* ===== FIN · ACCIÓN ABRIR SUB-SLIDE ===== */


/* ========================================================= */
/* FIN · MÓDULO CONJUNTOS DE PRODUCTOS */
/* ========================================================= */