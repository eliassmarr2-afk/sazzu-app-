/* PRODUCTOS · RENTABILIDAD · UI conectada a Supabase */
(function () {
  "use strict";

  const BUILD = "PRODUCTOS_RENTABILIDAD_UI_2026_07_08_02";
  const RPC_NAME = "rpc_product_sales_performance";

  const State = {
    loading: false,
    payload: null,
    salesById: new Map(),
    selectedRange: "all",
    selectedType: "all",
    selectedChannel: "all"
  };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
      }).format(n);
    } catch (_) {
      return "$ " + Math.round(n).toLocaleString("es-AR");
    }
  }

  function dateLabel(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("es-AR");
    } catch (_) {
      return "—";
    }
  }

  function typeLabel(type) {
    const t = clean(type).toLowerCase();
    if (t === "bundle") return "Bundle";
    if (t === "cantidad") return "Cantidad";
    if (t === "unitario") return "Unitario";
    return t || "Sin clasificar";
  }

  function typeBadgeClass(type) {
    const t = clean(type).toLowerCase();
    if (t === "bundle") return "prodRentBadge--bundle";
    if (t === "cantidad") return "prodRentBadge--qty";
    if (t === "unitario") return "prodRentBadge--unit";
    return "";
  }

  function selectedAttr(current, value) {
    return clean(current) === clean(value) ? "selected" : "";
  }

  function rangeParams() {
    const range = State.selectedRange || "all";
    const now = new Date();

    function startOfToday(offsetDays) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() + Number(offsetDays || 0));
      return d;
    }

    if (range === "today") {
      return {
        input_date_from: startOfToday(0).toISOString(),
        input_date_to: startOfToday(1).toISOString()
      };
    }

    if (range === "7d") {
      return {
        input_date_from: startOfToday(-6).toISOString(),
        input_date_to: startOfToday(1).toISOString()
      };
    }

    if (range === "30d") {
      return {
        input_date_from: startOfToday(-29).toISOString(),
        input_date_to: startOfToday(1).toISOString()
      };
    }

    return {
      input_date_from: null,
      input_date_to: null
    };
  }

  async function rpc(name, params) {
    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== "function") {
      throw new Error("Supabase no está disponible en el panel.");
    }

    const res = await window.SazzuSupabase.rpc(name, params || {});
    if (res && res.error) throw res.error;
    return res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res;
  }

  function getTypeBreakdown(payload) {
    const rows = Array.isArray(payload && payload.type_breakdown) ? payload.type_breakdown : [];
    const map = new Map();
    rows.forEach(function (item) {
      map.set(clean(item.sale_type).toLowerCase(), item);
    });
    return map;
  }

  function metricFor(type, key) {
    const map = getTypeBreakdown(State.payload);
    const item = map.get(type) || {};
    return item[key] || 0;
  }

  function renderFilters() {
    return `
      <div class="prodRentFilters">
        <div class="prodRentFilter">
          <label for="prodRentDateRange">Rango</label>
          <select id="prodRentDateRange">
            <option value="all" ${selectedAttr(State.selectedRange, "all")}>Todos los existentes</option>
            <option value="today" ${selectedAttr(State.selectedRange, "today")}>Hoy</option>
            <option value="7d" ${selectedAttr(State.selectedRange, "7d")}>Últimos 7 días</option>
            <option value="30d" ${selectedAttr(State.selectedRange, "30d")}>Últimos 30 días</option>
          </select>
        </div>

        <div class="prodRentFilter">
          <label for="prodRentTypeFilter">Tipo de venta</label>
          <select id="prodRentTypeFilter">
            <option value="all" ${selectedAttr(State.selectedType, "all")}>Todos</option>
            <option value="unitario" ${selectedAttr(State.selectedType, "unitario")}>Unitario</option>
            <option value="cantidad" ${selectedAttr(State.selectedType, "cantidad")}>Cantidad</option>
            <option value="bundle" ${selectedAttr(State.selectedType, "bundle")}>Bundle</option>
          </select>
        </div>

        <div class="prodRentFilter">
          <label for="prodRentChannelFilter">Canal / UTM</label>
          <select id="prodRentChannelFilter" disabled>
            <option value="all">Pendiente UTM</option>
          </select>
        </div>
      </div>
    `;
  }

  function renderHeader() {
    return `
      <div class="prodRentHeader">
        <div>
          <div class="prodRentHeader__eyebrow">Performance comercial</div>
          <h2 class="prodRentHeader__title">Rentabilidad por oferta y tipo de venta</h2>
          <p class="prodRentHeader__sub">
            Lectura real desde ventas analizadas: unitarios, cantidad, bundles, ofertas y composición SKU.
          </p>
        </div>

        <div class="prodRentHeader__badge">Conectado a Protocol Data</div>
      </div>
    `;
  }

  function renderKpis(payload) {
    const kpis = payload && payload.kpis ? payload.kpis : {};
    const totalOrders = Number(kpis.total_orders || 0);

    return `
      <section class="prodRentKpiGrid" aria-label="KPIs de performance comercial">
        <article class="prodRentKpiCard">
          <div class="prodRentKpiCard__label">
            Órdenes con oferta detectada
            <span class="prodRentTooltipIcon" tabindex="0">?</span>
            <span class="prodRentTooltipText">
              Cantidad de órdenes únicas de Shopify que tuvieron al menos una oferta detectada en Protocol Data. No representa el total de pedidos Shopify.
            </span>
          </div>
          <div class="prodRentKpiCard__value">${esc(totalOrders)}</div>
          <div class="prodRentKpiCard__hint">${esc(kpis.total_sales_lines || 0)} líneas comerciales · ${money(kpis.total_net_amount)}</div>
        </article>

        <article class="prodRentKpiCard prodRentKpiCard--unit">
          <div class="prodRentKpiCard__label">
            Líneas unitarias
            <span class="prodRentTooltipIcon" tabindex="0">?</span>
            <span class="prodRentTooltipText">
              Cantidad de líneas comerciales clasificadas como venta unitaria. No son pedidos únicos: una orden puede tener varias líneas.
            </span>
          </div>
          <div class="prodRentKpiCard__value">${esc(metricFor("unitario", "sales_count"))}</div>
          <div class="prodRentKpiCard__hint">${money(metricFor("unitario", "net_amount"))} · ${esc(metricFor("unitario", "pct_amount"))}%</div>
        </article>

        <article class="prodRentKpiCard prodRentKpiCard--qty">
          <div class="prodRentKpiCard__label">
            Líneas por cantidad
            <span class="prodRentTooltipIcon" tabindex="0">?</span>
            <span class="prodRentTooltipText">
              Líneas comerciales detectadas como ofertas por cantidad, por ejemplo 2x1, 3x2 o packs por volumen. No representa pedidos únicos.
            </span>
          </div>
          <div class="prodRentKpiCard__value">${esc(metricFor("cantidad", "sales_count"))}</div>
          <div class="prodRentKpiCard__hint">${money(metricFor("cantidad", "net_amount"))} · ${esc(metricFor("cantidad", "pct_amount"))}%</div>
        </article>

        <article class="prodRentKpiCard prodRentKpiCard--bundle">
          <div class="prodRentKpiCard__label">
            Líneas bundle
            <span class="prodRentTooltipIcon" tabindex="0">?</span>
            <span class="prodRentTooltipText">
              Líneas comerciales detectadas como bundles o combinaciones de productos dentro de una oferta. No representa pedidos únicos.
            </span>
          </div>
          <div class="prodRentKpiCard__value">${esc(metricFor("bundle", "sales_count"))}</div>
          <div class="prodRentKpiCard__hint">${money(metricFor("bundle", "net_amount"))} · ${esc(metricFor("bundle", "pct_amount"))}%</div>
        </article>
      </section>
    `;
  }

  function renderBars(payload) {
    const rows = Array.isArray(payload && payload.type_breakdown) ? payload.type_breakdown : [];
    const max = Math.max.apply(null, rows.map(function (item) { return Number(item.net_amount || 0); }).concat([1]));

    if (!rows.length) {
      return `<div class="prodRentTicketList"><div><span>Sin ventas para el rango seleccionado</span><strong>—</strong></div></div>`;
    }

    return `
      <div class="prodRentBars">
        ${rows.map(function (item) {
          const width = Math.max(4, Math.round((Number(item.net_amount || 0) / max) * 100));
          return `
            <div class="prodRentBar">
              <div class="prodRentBar__head">
                <span>${esc(typeLabel(item.sale_type))}</span>
                <strong>${money(item.net_amount)}</strong>
              </div>
              <div class="prodRentBar__track"><span style="width: ${width}%"></span></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTicketList(payload) {
    const rows = Array.isArray(payload && payload.type_breakdown) ? payload.type_breakdown : [];
    if (!rows.length) {
      return `<div class="prodRentTicketList"><div><span>Sin datos</span><strong>—</strong></div></div>`;
    }

    return `
      <div class="prodRentTicketList">
        ${rows.map(function (item) {
          return `<div><span>${esc(typeLabel(item.sale_type))}</span><strong>${money(item.avg_ticket)}</strong></div>`;
        }).join("")}
      </div>
    `;
  }

  function renderTopOffers(payload) {
    const rows = Array.isArray(payload && payload.top_offers) ? payload.top_offers : [];

    if (!rows.length) {
      return `<div class="prodRentOfferRank"><div class="prodRentRankItem"><div><strong>Sin ofertas detectadas</strong><span>Cuando entren ventas, aparecerán acá.</span></div><b>—</b></div></div>`;
    }

    return `
      <div class="prodRentOfferRank">
        ${rows.map(function (item) {
          const label = item.codigo_oferta
            ? item.codigo_oferta + " · " + (item.offer_label || "Oferta")
            : item.offer_label || "Venta";

          return `
            <div class="prodRentRankItem">
              <div>
                <strong>${esc(label)}</strong>
                <span>${esc(typeLabel(item.sale_type))} · ${esc(item.sales_count || 0)} venta${Number(item.sales_count || 0) === 1 ? "" : "s"} · ${esc(item.pct_amount || 0)}%</span>
              </div>
              <b>${money(item.net_amount)}</b>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSourcesPlaceholder() {
    return `
      <div class="prodRentSourceList">
        <div><span>Meta Ads</span><strong>Pendiente UTM</strong></div>
        <div><span>Orgánico</span><strong>Pendiente UTM</strong></div>
        <div><span>Sin UTM</span><strong>Pendiente UTM</strong></div>
      </div>
    `;
  }

  function renderLatestSales(payload) {
    const rows = Array.isArray(payload && payload.latest_sales) ? payload.latest_sales : [];
    State.salesById = new Map();

    rows.forEach(function (item) {
      State.salesById.set(clean(item.sale_id), item);
    });

    if (!rows.length) {
      return `
        <tr>
          <td colspan="7">No hay ventas analizadas para mostrar.</td>
        </tr>
      `;
    }

    return rows.map(function (item) {
      return `
        <tr data-prod-rent-sale="${esc(item.sale_id)}">
          <td>${esc(dateLabel(item.fecha_hora_compra))}</td>
          <td>${esc(item.shopify_order_name || item.numero_pedido || "—")}</td>
          <td><span class="prodRentBadge ${esc(typeBadgeClass(item.sale_type))}">${esc(typeLabel(item.sale_type))}</span></td>
          <td>${esc(item.sale_label || item.codigo_oferta || item.sku_base_analitico || "—")}</td>
          <td>${money(item.net_amount)}</td>
          <td>Pendiente UTM</td>
          <td><button type="button" class="prodRentViewBtn">Ver</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderShell(payload) {
    const shell = document.querySelector("#prodPanelRentabilidad .prodRentShell");
    if (!shell) return;

    shell.innerHTML = `
      ${renderHeader()}
      ${renderFilters()}
      ${renderKpis(payload)}

      <section class="prodRentGrid">
        <article class="prodRentCard prodRentCard--chart">
          <div class="prodRentCard__top">
            <div>
              <h3>Facturación por tipo de venta</h3>
              <p>Comparación real entre venta unitaria, cantidad y bundle.</p>
            </div>

            <div class="prodRentMiniSwitch">
              <button type="button" class="is-active">Facturación</button>
              <button type="button" disabled>Pedidos</button>
            </div>
          </div>

          ${renderBars(payload)}
        </article>

        <article class="prodRentCard">
          <div class="prodRentCard__top">
            <div>
              <h3>Ticket promedio por tipo</h3>
              <p>Qué estructura empuja mejor el valor por pedido.</p>
            </div>
          </div>

          ${renderTicketList(payload)}
        </article>
      </section>

      <section class="prodRentTwoCols">
        <article class="prodRentCard">
          <div class="prodRentCard__top">
            <div>
              <h3>Top ofertas por facturación</h3>
              <p>Ranking operativo de ofertas más efectivas.</p>
            </div>
          </div>

          ${renderTopOffers(payload)}
        </article>

        <article class="prodRentCard">
          <div class="prodRentCard__top">
            <div>
              <h3>Fuente / UTM por facturación</h3>
              <p>Reservado para cruzar campañas cuando conectemos UTM.</p>
            </div>
          </div>

          ${renderSourcesPlaceholder()}
        </article>
      </section>

      <article class="prodRentCard prodRentSalesCard">
        <div class="prodRentCard__top">
          <div>
            <h3>Últimas ventas analizadas</h3>
            <p>5 filas visibles. Click para abrir composición comercial de la venta.</p>
          </div>
        </div>

        <div class="prodRentTableWrap">
          <table class="prodRentTable">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pedido</th>
                <th>Tipo</th>
                <th>Oferta / SKU</th>
                <th>Monto neto</th>
                <th>Canal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${renderLatestSales(payload)}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderLoading() {
    const shell = document.querySelector("#prodPanelRentabilidad .prodRentShell");
    if (!shell) return;

    shell.innerHTML = `
      ${renderHeader()}
      ${renderFilters()}
      <article class="prodRentCard">
        <div class="prodRentCard__top">
          <div>
            <h3>Cargando rentabilidad...</h3>
            <p>Consultando ventas analizadas en Protocol Data.</p>
          </div>
        </div>
      </article>
    `;
  }

  function renderError(err) {
    const shell = document.querySelector("#prodPanelRentabilidad .prodRentShell");
    if (!shell) return;

    shell.innerHTML = `
      ${renderHeader()}
      ${renderFilters()}
      <article class="prodRentCard">
        <div class="prodRentCard__top">
          <div>
            <h3>No se pudo cargar Rentabilidad</h3>
            <p>${esc(err && err.message ? err.message : err || "Error desconocido.")}</p>
          </div>
        </div>
      </article>
    `;
  }

  async function loadPerformance() {
    if (State.loading) return;

    State.loading = true;
    renderLoading();

    try {
      const range = rangeParams();
      const payload = await rpc(RPC_NAME, {
        input_date_from: range.input_date_from,
        input_date_to: range.input_date_to,
        input_sale_type: State.selectedType || "all"
      });

      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.message ? payload.message : "La RPC no devolvió datos válidos.");
      }

      State.payload = payload;
      renderShell(payload);
    } catch (err) {
      console.error("[productos-rentabilidad-ui] Error cargando performance", err);
      renderError(err);
    } finally {
      State.loading = false;
    }
  }

  function openDrawerBySaleId(saleId) {
    const sale = State.salesById.get(clean(saleId));
    if (!sale) return;

    const drawer = document.getElementById("prodRentDrawer");
    const overlay = document.getElementById("prodRentDrawerOverlay");
    const title = document.getElementById("prodRentDrawerTitle");
    const body = drawer ? drawer.querySelector(".prodRentDrawer__body") : null;

    if (!drawer || !overlay || !body) return;

    if (title) {
      title.textContent = "Pedido " + clean(sale.shopify_order_name || sale.numero_pedido || "—");
    }

    const components = Array.isArray(sale.components) ? sale.components : [];

    body.innerHTML = `
      <div class="prodRentDrawer__summary">
        <span class="prodRentBadge ${esc(typeBadgeClass(sale.sale_type))}">${esc(typeLabel(sale.sale_type))}</span>
        <span class="prodRentBadge">Protocol Data</span>
        <span class="prodRentBadge">Snapshot analítico</span>
      </div>

      <section class="prodRentDrawerBlock">
        <h4>Identidad de la venta</h4>
        <div class="prodRentInfoGrid">
          <div><span>Pedido Shopify</span><strong>${esc(sale.shopify_order_name || sale.numero_pedido || "—")}</strong></div>
          <div><span>Monto neto</span><strong>${money(sale.net_amount)}</strong></div>
          <div><span>Costo componentes</span><strong>${money(sale.cost_amount)}</strong></div>
          <div><span>Fecha</span><strong>${esc(dateLabel(sale.fecha_hora_compra))}</strong></div>
        </div>
      </section>

      <section class="prodRentDrawerBlock">
        <h4>Oferta asociada</h4>
        <div class="prodRentCodeList">
          <div><span>tipo_venta</span><code>${esc(sale.sale_type || "—")}</code></div>
          <div><span>codigo_oferta</span><code>${esc(sale.codigo_oferta || "—")}</code></div>
          <div><span>commercial_offer_id</span><code>${esc(sale.commercial_offer_id || "—")}</code></div>
          <div><span>offer_set_id</span><code>${esc(sale.offer_set_id || "—")}</code></div>
          <div><span>id_variante_shopify</span><code>${esc(sale.id_variante_shopify || "—")}</code></div>
        </div>
      </section>

      <section class="prodRentDrawerBlock">
        <h4>Composición</h4>
        <table class="prodRentMiniTable">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Neto</th>
              <th>Costo</th>
            </tr>
          </thead>
          <tbody>
            ${components.length ? components.map(function (item) {
              return `
                <tr>
                  <td>${esc(item.sku || item.sku_pedido || "—")}</td>
                  <td>${esc(item.nombre_producto || "—")}</td>
                  <td>${esc(item.cantidad_equivalente || item.cantidad_shopify || "—")}</td>
                  <td>${money(item.net_allocated_amount)}</td>
                  <td>${money(item.component_cost_total_snapshot)}</td>
                </tr>
              `;
            }).join("") : `<tr><td colspan="5">Sin componentes detectados.</td></tr>`}
          </tbody>
        </table>
      </section>

      <section class="prodRentDrawerBlock">
        <h4>Parámetros URL / UTM</h4>
        <div class="prodRentCodeList">
          <div><span>estado</span><code>Pendiente de conexión UTM</code></div>
        </div>
      </section>

      <section class="prodRentDrawerBlock prodRentDrawerBlock--diagnostic">
        <h4>Diagnóstico de resolución</h4>
        <p>
          Esta venta se está leyendo desde product_order_analysis_lines y se agrupa por línea comercial.
          Si tiene offer_set_id, se resuelve contra conjunto/oferta; si no, se clasifica como venta unitaria.
        </p>
      </section>
    `;

    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    const drawer = document.getElementById("prodRentDrawer");
    const overlay = document.getElementById("prodRentDrawerOverlay");

    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }

    if (overlay) overlay.classList.remove("is-open");
  }

  function bind() {
    if (window.__PRODUCTOS_RENTABILIDAD_UI_BOUND__ === true) return;
    window.__PRODUCTOS_RENTABILIDAD_UI_BOUND__ = true;

    document.addEventListener("change", function (event) {
      const range = event.target && event.target.closest ? event.target.closest("#prodRentDateRange") : null;
      if (range) {
        State.selectedRange = clean(range.value) || "all";
        loadPerformance();
        return;
      }

      const type = event.target && event.target.closest ? event.target.closest("#prodRentTypeFilter") : null;
      if (type) {
        State.selectedType = clean(type.value) || "all";
        loadPerformance();
      }
    });

    document.addEventListener("click", function (event) {
      const closeTarget = event.target && event.target.closest
        ? event.target.closest("#prodRentDrawerCloseBtn, #prodRentDrawerOverlay")
        : null;

      if (closeTarget) {
        event.preventDefault();
        closeDrawer();
        return;
      }

      const row = event.target && event.target.closest
        ? event.target.closest("[data-prod-rent-sale]")
        : null;

      if (row) {
        event.preventDefault();
        openDrawerBySaleId(row.getAttribute("data-prod-rent-sale"));
      }

      const tab = event.target && event.target.closest
        ? event.target.closest("#prodTabRentabilidad")
        : null;

      if (tab) {
        setTimeout(function () {
          if (!State.payload) loadPerformance();
        }, 120);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });
  }

  function init() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    bind();

    setTimeout(function () {
      if (document.getElementById("prodPanelRentabilidad")) {
        loadPerformance();
      }
    }, 250);

    console.log("[productos-rentabilidad-ui] OK", BUILD);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("sazzu:page:load", init);
  window.addEventListener("load", init);
})();
