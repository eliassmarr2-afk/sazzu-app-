/* ==========================================================
   Protocol Data · Logística · Lookup Activity
   Microactividad operativa de consultas de entrega.
   ========================================================== */

(function () {
  'use strict';

  const PAGE_EVENT = 'sazzu:page:load';
  const TIME_ZONE = 'America/Argentina/Buenos_Aires';
  const REFRESH_MS = 30000;

  let refreshTimer = null;
  let tooltipCloseTimer = null;

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function cfg() {
    return (
      window.SAZZU_SUPABASE_CONFIG ||
      window.PROTOCOL_SUPABASE_CONFIG ||
      null
    );
  }

  async function getClient() {
    if (
      window.ProtocolAuth &&
      typeof window.ProtocolAuth.getClient === 'function'
    ) {
      const shared = await window.ProtocolAuth.getClient();
      if (shared) return shared;
    }

    if (window.__protocolLookupActivityClient) {
      return window.__protocolLookupActivityClient;
    }

    const config = cfg();
    const key =
      config &&
      (
        config.anonKey ||
        config.publishableKey ||
        config.key
      );

    if (
      !window.supabase ||
      !config ||
      !config.url ||
      !key
    ) {
      return null;
    }

    window.__protocolLookupActivityClient =
      window.supabase.createClient(
        config.url,
        key
      );

    return window.__protocolLookupActivityClient;
  }

  function number(value) {
    return Number(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-AR')
      .format(number(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function card() {
    const r = root();
    if (!r) return null;

    const enhanced =
      r.querySelector('.logLookupActivityCard');

    if (enhanced) return enhanced;

    const legacy =
      r.querySelector('#logKpiLookups');

    return legacy
      ? legacy.closest('.logHeroCard')
      : null;
  }

  function formatTimestamp(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('es-AR', {
      timeZone: TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
      .format(date)
      .replace(',', ' ·');
  }

  function parseLocalDay(value) {
    if (!value) return null;

    const parts = String(value)
      .split('-')
      .map(Number);

    if (
      parts.length !== 3 ||
      !parts[0] ||
      !parts[1] ||
      !parts[2]
    ) {
      return null;
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
      12,
      0,
      0
    );
  }

  function dayLetter(value) {
    const date = parseLocalDay(value);
    if (!date) return '—';

    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'narrow'
    })
      .format(date)
      .toUpperCase();
  }

  function longDayLabel(value) {
    const date = parseLocalDay(value);
    if (!date) return '—';

    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  function humanizeHandle(handle) {
    return String(handle || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function sourceLabel(sourcePage) {
    const source = String(sourcePage || '').trim();

    if (!source) {
      return 'Landing sin identificar';
    }

    if (source === 'alpaso_product_landing') {
      return 'Landing de producto';
    }

    if (source === 'protocol_logistica_panel') {
      return 'Panel Logística';
    }

    if (source.indexOf('/products/') === 0) {
      const handle =
        source.split('/products/')[1]
          .split(/[?#]/)[0];

      return humanizeHandle(handle) ||
        'Landing de producto';
    }

    if (source.indexOf('product_') === 0) {
      return 'Landing ' + source;
    }

    return source;
  }

  function locationLabel(row) {
    const parts = [];

    if (row.locality) parts.push(row.locality);

    if (
      row.province &&
      row.province !== row.locality
    ) {
      parts.push(row.province);
    }

    return parts.length
      ? parts.join(' · ')
      : 'Ubicación no informada';
  }

  function ensureShell() {
    const el = card();
    if (!el) return null;

    if (
      el.dataset.lookupActivityReady === '1'
    ) {
      return el;
    }

    el.dataset.lookupActivityReady = '1';
    el.classList.add('logLookupActivityCard');

    /*
      Importante:
      eliminamos #logKpiLookups del DOM.
      Así el renderKpis legacy deja de sobrescribir
      esta tarjeta con el total histórico.
    */
    el.innerHTML = `
      <div class="logLookupActivityHeader">
        <span class="logHeroCard__label">
          Consultas de entrega
        </span>

        <button
          class="logLookupActivityInfo"
          type="button"
          aria-label="Ver últimas consultas de clientes"
          aria-expanded="false"
          data-log-lookup-info
        >i</button>
      </div>

      <div class="logLookupActivityBody">
        <div class="logLookupActivityMetric">
          <div
            class="logLookupActivityValue"
            data-log-lookup-customer-today
          >0</div>

          <div class="logLookupActivityCaption">
            clientes hoy
          </div>
        </div>

        <div
          class="logLookupActivityChart"
          data-log-lookup-chart
          aria-label="Consultas de clientes de los últimos siete días"
        ></div>
      </div>

      <div class="logLookupActivityFooter">
        <span>
          <b data-log-lookup-users>0</b>
          usuarios
        </span>

        <span class="logLookupActivityDot">
          ·
        </span>

        <span>
          <b data-log-lookup-panel>0</b>
          panel
        </span>
      </div>

      <div
        class="logLookupActivityTooltip"
        data-log-lookup-tooltip
        role="dialog"
        aria-label="Últimas consultas de clientes"
      >
        <div class="logLookupActivityTooltip__head">
          <span>Últimas consultas</span>
          <small>Clientes</small>
        </div>

        <div
          class="logLookupActivityRecent"
          data-log-lookup-recent
        >
          <div class="logLookupActivityEmpty">
            Cargando actividad…
          </div>
        </div>
      </div>
    `;

    bindTooltip(el);

    return el;
  }

  function tooltipElements(el) {
    return {
      button:
        el.querySelector('[data-log-lookup-info]'),

      tooltip:
        el.querySelector('[data-log-lookup-tooltip]')
    };
  }

  function openTooltip(el) {
    const refs = tooltipElements(el);

    window.clearTimeout(tooltipCloseTimer);

    el.classList.add('is-tooltip-open');

    if (refs.button) {
      refs.button.setAttribute(
        'aria-expanded',
        'true'
      );
    }
  }

  function closeTooltip(el) {
    const refs = tooltipElements(el);

    el.classList.remove('is-tooltip-open');

    if (refs.button) {
      refs.button.setAttribute(
        'aria-expanded',
        'false'
      );
    }
  }

  function scheduleCloseTooltip(el) {
    window.clearTimeout(tooltipCloseTimer);

    tooltipCloseTimer =
      window.setTimeout(function () {
        closeTooltip(el);
      }, 120);
  }

  function bindTooltip(el) {
    const refs = tooltipElements(el);

    if (!refs.button || !refs.tooltip) return;

    refs.button.addEventListener(
      'mouseenter',
      function () {
        openTooltip(el);
      }
    );

    refs.button.addEventListener(
      'mouseleave',
      function () {
        scheduleCloseTooltip(el);
      }
    );

    refs.tooltip.addEventListener(
      'mouseenter',
      function () {
        window.clearTimeout(
          tooltipCloseTimer
        );
      }
    );

    refs.tooltip.addEventListener(
      'mouseleave',
      function () {
        scheduleCloseTooltip(el);
      }
    );

    refs.button.addEventListener(
      'click',
      function (event) {
        event.stopPropagation();

        if (
          el.classList.contains(
            'is-tooltip-open'
          )
        ) {
          closeTooltip(el);
        } else {
          openTooltip(el);
        }
      }
    );

    document.addEventListener(
      'click',
      function (event) {
        if (!el.contains(event.target)) {
          closeTooltip(el);
        }
      }
    );

    document.addEventListener(
      'keydown',
      function (event) {
        if (event.key === 'Escape') {
          closeTooltip(el);
        }
      }
    );
  }

  function renderChart(el, rows) {
    const chart =
      el.querySelector(
        '[data-log-lookup-chart]'
      );

    if (!chart) return;

    const data =
      Array.isArray(rows)
        ? rows.slice(-7)
        : [];

    const maxValue = Math.max(
      1,
      ...data.map(function (row) {
        return number(
          row.customer_lookups
        );
      })
    );

    if (!data.length) {
      chart.innerHTML =
        '<span class="logLookupActivityEmptyChart">Sin datos</span>';
      return;
    }

    chart.innerHTML =
      data.map(function (row) {
        const consultations =
          number(row.customer_lookups);

        const users =
          number(
            row.unique_customer_sessions
          );

        const ratio =
          consultations / maxValue;

        const height =
          consultations > 0
            ? Math.max(
                7,
                Math.round(ratio * 30)
              )
            : 3;

        const title =
          longDayLabel(row.date) +
          ' · ' +
          formatNumber(consultations) +
          ' consultas · ' +
          formatNumber(users) +
          ' usuarios';

        return `
          <div
            class="logLookupActivityBar"
            title="${escapeHtml(title)}"
          >
            <span
              class="logLookupActivityBar__fill"
              style="height:${height}px"
            ></span>

            <small>
              ${escapeHtml(dayLetter(row.date))}
            </small>
          </div>
        `;
      }).join('');
  }

  function renderRecent(el, rows) {
    const recent =
      el.querySelector(
        '[data-log-lookup-recent]'
      );

    if (!recent) return;

    const items =
      Array.isArray(rows)
        ? rows.slice(0, 3)
        : [];

    if (!items.length) {
      recent.innerHTML = `
        <div class="logLookupActivityEmpty">
          Todavía no hay consultas de clientes.
        </div>
      `;
      return;
    }

    recent.innerHTML =
      items.map(function (row) {
        return `
          <div class="logLookupActivityRecentItem">
            <div class="logLookupActivityRecentItem__top">
              <span>
                ${escapeHtml(
                  sourceLabel(
                    row.source_page
                  )
                )}
              </span>

              <time>
                ${escapeHtml(
                  formatTimestamp(
                    row.created_at
                  )
                )}
              </time>
            </div>

            <div class="logLookupActivityRecentItem__bottom">
              CP ${escapeHtml(
                row.postal_code || '—'
              )}
              ·
              ${escapeHtml(
                locationLabel(row)
              )}
            </div>
          </div>
        `;
      }).join('');
  }

  function render(payload) {
    const el = ensureShell();
    if (!el) return;

    const today =
      payload && payload.today
        ? payload.today
        : {};

    const customerToday =
      number(today.customer_lookups);

    const usersToday =
      number(
        today.unique_customer_sessions
      );

    const panelToday =
      number(today.panel_lookups);

    const value =
      el.querySelector(
        '[data-log-lookup-customer-today]'
      );

    const users =
      el.querySelector(
        '[data-log-lookup-users]'
      );

    const panel =
      el.querySelector(
        '[data-log-lookup-panel]'
      );

    if (value) {
      value.textContent =
        formatNumber(customerToday);
    }

    if (users) {
      users.textContent =
        formatNumber(usersToday);
    }

    if (panel) {
      panel.textContent =
        formatNumber(panelToday);
    }

    renderChart(
      el,
      payload.daily || []
    );

    renderRecent(
      el,
      payload.recent_customer_lookups || []
    );

    el.classList.remove(
      'is-lookup-loading',
      'is-lookup-error'
    );

    el.classList.remove(
      'has-customer-activity',
      'has-no-customer-activity'
    );

    el.classList.add(
      customerToday > 0
        ? 'has-customer-activity'
        : 'has-no-customer-activity'
    );
  }

  function renderError() {
    const el = ensureShell();
    if (!el) return;

    el.classList.remove(
      'is-lookup-loading'
    );

    el.classList.add(
      'is-lookup-error'
    );

    const recent =
      el.querySelector(
        '[data-log-lookup-recent]'
      );

    if (recent) {
      recent.innerHTML = `
        <div class="logLookupActivityEmpty">
          No se pudo cargar la actividad.
        </div>
      `;
    }
  }

  async function refresh() {
    const el = ensureShell();
    if (!el) return;

    const client = await getClient();

    if (!client) {
      renderError();
      return;
    }

    el.classList.add(
      'is-lookup-loading'
    );

    try {
      const response =
        await client.rpc(
          'protocol_logistics_lookup_activity'
        );

      if (response.error) {
        throw response.error;
      }

      render(response.data || {});
    } catch (error) {
      console.warn(
        '[Logística Lookup Activity]',
        error
      );

      renderError();
    }
  }

  function startPolling() {
    window.clearInterval(refreshTimer);

    refreshTimer =
      window.setInterval(function () {
        if (
          document.visibilityState ===
          'visible'
        ) {
          refresh();
        }
      }, REFRESH_MS);
  }

  function boot() {
    const el = ensureShell();
    if (!el) return;

    refresh();
    startPolling();
  }

  document.addEventListener(
    'DOMContentLoaded',
    boot
  );

  document.addEventListener(
    PAGE_EVENT,
    boot
  );

  document.addEventListener(
    'visibilitychange',
    function () {
      if (
        document.visibilityState ===
        'visible'
      ) {
        refresh();
      }
    }
  );

  if (
    document.readyState !== 'loading'
  ) {
    boot();
  }

  window.ProtocolLogisticaLookupActivity = {
    refresh: refresh
  };
})();
