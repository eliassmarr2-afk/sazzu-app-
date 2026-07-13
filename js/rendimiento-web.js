(function () {
  const state = {
    options: [],
    chart: null,
    versionsPayload: null,
    activeLanding: null,
    versionsLoaded: false
  };

  const $ = (id) => document.getElementById(id);

  function todayISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function number(value) {
    return Number(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(number(value));
  }

  function formatPct(value) {
    return value === null || value === undefined
      ? '—'
      : `${number(value).toFixed(2).replace('.', ',')}%`;
  }

  function formatSeconds(value) {
    return value === null || value === undefined
      ? '—'
      : `${number(value).toFixed(2).replace('.', ',')} s`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(message, type) {
    const el = $('rwStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `rwStatus${type ? ` is-${type}` : ''}`;
  }

  function setVersionsStatus(message, type) {
    const el = $('rwVersionsStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `rwStatus${type ? ` is-${type}` : ''}`;
  }

  function setLoading(loading) {
    const button = $('rwRefreshButton');
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? 'Actualizando…' : 'Actualizar panel';
  }

  function setVersionsLoading(loading) {
    const button = $('rwVersionsRefreshButton');
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? 'Actualizando…' : 'Actualizar versiones';
  }

  function selectedLandingKey() {
    const select = $('rwLandingSelect');
    return select ? select.value || null : null;
  }

  function updateVersionOptions() {
    const landingKey = selectedLandingKey();
    const versions = Array.from(new Set(
      state.options
        .filter((item) => !landingKey || item.landing_key === landingKey)
        .map((item) => item.landing_version)
        .filter(Boolean)
    )).sort();

    const select = $('rwVersionSelect');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>' + versions
      .map((version) => `<option value="${escapeHtml(version)}">${escapeHtml(version)}</option>`)
      .join('');

    if (versions.includes(current)) select.value = current;
    if (landingKey && versions.length === 1) select.value = versions[0];
  }

  async function getClient() {
    if (!window.ProtocolAuth) {
      throw new Error('ProtocolAuth no está disponible.');
    }

    const session = await window.ProtocolAuth.getSession();
    if (!session) {
      window.location.href = window.ProtocolAuth.loginUrl(
        window.location.pathname + window.location.search
      );
      return null;
    }

    return window.ProtocolAuth.getClient();
  }

  async function loadOptions(client) {
    const response = await client.rpc('rpc_analytics_landing_options', {
      input_start_date: $('rwStartDate').value || null,
      input_end_date: $('rwEndDate').value || null
    });

    if (response.error) throw response.error;

    const payload = response.data || {};
    state.options = Array.isArray(payload.items) ? payload.items : [];

    const select = $('rwLandingSelect');
    const current = select.value;
    const grouped = new Map();

    state.options.forEach((item) => {
      if (!grouped.has(item.landing_key)) grouped.set(item.landing_key, item);
    });

    select.innerHTML = '<option value="">Todas las landings</option>' +
      Array.from(grouped.values()).map((item) => {
        const label = item.product_title || item.product_handle || item.landing_key;
        return `<option value="${escapeHtml(item.landing_key)}">${escapeHtml(label)}</option>`;
      }).join('');

    if (Array.from(grouped.keys()).includes(current)) select.value = current;
    if (!current && grouped.size === 1) {
      select.value = Array.from(grouped.keys())[0];
    }

    updateVersionOptions();
  }

  async function loadFunnel(client) {
    const params = {
      input_landing_key: selectedLandingKey(),
      input_landing_version: $('rwVersionSelect').value || null,
      input_start_date: $('rwStartDate').value || null,
      input_end_date: $('rwEndDate').value || null,
      input_utm_source: $('rwSourceInput').value.trim() || null,
      input_utm_campaign: $('rwCampaignInput').value.trim() || null,
      input_device_type: $('rwDeviceSelect').value || null
    };

    const response = await client.rpc('rpc_analytics_landing_funnel', params);
    if (response.error) throw response.error;
    renderSummary(response.data || {});
  }

  function setStageWidth(id, count, views) {
    const el = $(id);
    if (!el) return;
    const pct = views > 0 ? (count / views) * 100 : 0;
    el.style.setProperty('--stage-width', `${Math.max(28, Math.min(100, pct))}%`);
  }

  function renderSummary(payload) {
    const metrics = payload.metrics || {};
    const timing = payload.timing || {};
    const landing = payload.landing || {};
    const filters = payload.filters || {};

    const views = number(metrics.views);
    const sessions = number(metrics.sessions);
    const l1 = number(metrics.reached_l1);
    const l2 = number(metrics.reached_l2);
    const l3 = number(metrics.reached_l3);

    $('rwKpiViews').textContent = formatNumber(views);
    $('rwKpiSessions').textContent = formatNumber(sessions);
    $('rwKpiL1').textContent = formatNumber(l1);
    $('rwKpiL2').textContent = formatNumber(l2);
    $('rwKpiL3').textContent = formatNumber(l3);
    $('rwKpiConversion').textContent = formatPct(metrics.view_to_l3_pct);
    $('rwKpiL1Pct').textContent = `${formatPct(metrics.view_to_l1_pct)} · 10% + 10 s`;
    $('rwKpiL2Pct').textContent = `${formatPct(metrics.l1_to_l2_pct)} desde L1`;
    $('rwKpiL3Pct').textContent = `${formatPct(metrics.l2_to_l3_pct)} desde L2`;

    $('rwStageViewCount').textContent = formatNumber(views);
    $('rwStageL1Count').textContent = formatNumber(l1);
    $('rwStageL2Count').textContent = formatNumber(l2);
    $('rwStageL3Count').textContent = formatNumber(l3);
    $('rwStageL1Conversion').textContent = `${formatPct(metrics.view_to_l1_pct)} desde View`;
    $('rwStageL2Conversion').textContent = `${formatPct(metrics.l1_to_l2_pct)} desde L1`;
    $('rwStageL3Conversion').textContent = `${formatPct(metrics.l2_to_l3_pct)} desde L2`;
    $('rwStageL1Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l1)}`;
    $('rwStageL2Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l2)}`;
    $('rwStageL3Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l3)}`;
    $('rwStageL1Drop').textContent = `Caída: ${formatNumber(Math.max(0, views - l1))}`;
    $('rwStageL2Drop').textContent = `Caída: ${formatNumber(Math.max(0, l1 - l2))}`;
    $('rwStageL3Drop').textContent = `Caída: ${formatNumber(Math.max(0, l2 - l3))}`;

    setStageWidth('rwStageL1', l1, views);
    setStageWidth('rwStageL2', l2, views);
    setStageWidth('rwStageL3', l3, views);

    $('rwTimeL1').textContent = formatSeconds(timing.median_seconds_to_l1);
    $('rwTimeL2').textContent = formatSeconds(timing.median_seconds_to_l2);
    $('rwTimeL3').textContent = formatSeconds(timing.median_seconds_to_l3);
    $('rwTimeP75').textContent = formatSeconds(timing.p75_seconds_to_l3);
    $('rwTimeP90').textContent = formatSeconds(timing.p90_seconds_to_l3);

    const title = landing.product_title ||
      (selectedLandingKey() ? selectedLandingKey() : 'Todas las landings');

    $('rwSelectedLandingBadge').textContent = title;
    $('rwContextTitle').textContent = title;
    $('rwContextVersion').textContent = filters.landing_version || 'Todas';
    $('rwContextSource').textContent = filters.utm_source || 'Todas';
    $('rwContextCampaign').textContent = filters.utm_campaign || 'Todas';
    $('rwContextDevice').textContent = filters.device_type || 'Todos';
    $('rwContextRange').textContent = `${filters.start_date || '—'} → ${filters.end_date || '—'}`;

    renderInsight({ views, l1, l2, l3, timing });
    renderChart(Array.isArray(payload.daily) ? payload.daily : []);

    const now = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    $('rwLastUpdateBadge').textContent = `Actualizado ${now}`;
    setStatus(
      `Datos cargados: ${formatNumber(views)} visitas dentro del rango seleccionado.`,
      'success'
    );
  }

  function renderInsight(data) {
    const drops = [
      { label: 'View → L1', value: Math.max(0, data.views - data.l1) },
      { label: 'L1 → L2', value: Math.max(0, data.l1 - data.l2) },
      { label: 'L2 → L3', value: Math.max(0, data.l2 - data.l3) }
    ].sort((a, b) => b.value - a.value);

    const times = [
      { label: 'L1', value: data.timing.median_seconds_to_l1 },
      { label: 'L2', value: data.timing.median_seconds_to_l2 },
      { label: 'L3', value: data.timing.median_seconds_to_l3 }
    ]
      .filter((item) => item.value !== null && item.value !== undefined)
      .sort((a, b) => number(b.value) - number(a.value));

    const biggestDrop = drops[0];
    const slowest = times[0];

    if (!data.views) {
      $('rwInsightTitle').textContent = 'Sin visitas para este filtro';
      $('rwInsightBody').textContent =
        'Ampliá el rango o quitá filtros para recuperar datos del embudo.';
    } else {
      $('rwInsightTitle').textContent = biggestDrop.value > 0
        ? `La mayor caída está en ${biggestDrop.label}`
        : 'La visita completó todo el embudo';

      $('rwInsightBody').textContent = biggestDrop.value > 0
        ? `${formatNumber(biggestDrop.value)} visitas no avanzaron al siguiente nivel. El nivel de llegada más lenta es ${slowest ? slowest.label : '—'}.`
        : 'No se detectaron abandonos en el conjunto actual. Hace falta más volumen para evaluar patrones estables.';
    }

    $('rwInsightDropBadge').textContent =
      `Mayor caída: ${biggestDrop.label} (${formatNumber(biggestDrop.value)})`;

    $('rwInsightSpeedBadge').textContent =
      `Nivel más lento: ${slowest ? `${slowest.label} · ${formatSeconds(slowest.value)}` : '—'}`;
  }

  function renderChart(rows) {
    const canvas = $('rwDailyChart');
    if (!canvas || !window.Chart) return;
    if (state.chart) state.chart.destroy();

    state.chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: rows.map((row) => row.date),
        datasets: [
          { label: 'Visitas', data: rows.map((row) => row.views), borderColor: '#c9ced7', backgroundColor: 'rgba(201,206,215,.12)', tension: .32 },
          { label: 'L1', data: rows.map((row) => row.reached_l1), borderColor: '#2479ff', backgroundColor: 'rgba(36,121,255,.12)', tension: .32 },
          { label: 'L2', data: rows.map((row) => row.reached_l2), borderColor: '#32b9d7', backgroundColor: 'rgba(50,185,215,.12)', tension: .32 },
          { label: 'L3', data: rows.map((row) => row.reached_l3), borderColor: '#35d38a', backgroundColor: 'rgba(53,211,138,.12)', tension: .32 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#aeb6c2', usePointStyle: true, boxWidth: 8 }
          }
        },
        scales: {
          x: { ticks: { color: '#818a97' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { beginAtZero: true, ticks: { color: '#818a97', precision: 0 }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  }

  async function refreshAll() {
    setLoading(true);
    setStatus('Consultando Analytics…');

    try {
      const client = await getClient();
      if (!client) return;
      await loadOptions(client);
      await loadFunnel(client);
    } catch (error) {
      console.error('[rendimiento-web]', error);
      setStatus(
        error && error.message ? error.message : 'No se pudo cargar Analytics.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(client) {
    const response = await client.rpc('rpc_analytics_landing_versions', {
      input_landing_key: null,
      input_start_date: $('rwVersionsStartDate').value || null,
      input_end_date: $('rwVersionsEndDate').value || null,
      input_utm_source: $('rwVersionsSourceInput').value.trim() || null,
      input_utm_campaign: $('rwVersionsCampaignInput').value.trim() || null,
      input_device_type: $('rwVersionsDeviceSelect').value || null
    });

    if (response.error) throw response.error;
    state.versionsPayload = response.data || {};
    state.versionsLoaded = true;
    renderVersions(state.versionsPayload);
  }

  async function refreshVersions() {
    setVersionsLoading(true);
    setVersionsStatus('Consultando versiones e hipótesis…');

    try {
      const client = await getClient();
      if (!client) return;
      await loadVersions(client);
    } catch (error) {
      console.error('[rendimiento-web:versions]', error);
      setVersionsStatus(
        error && error.message ? error.message : 'No se pudo cargar el historial de versiones.',
        'error'
      );
    } finally {
      setVersionsLoading(false);
    }
  }

  function renderVersions(payload) {
    const summary = payload.summary || {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    $('rwVersionsLandingCount').textContent = formatNumber(summary.landing_count);
    $('rwVersionsVersionCount').textContent = formatNumber(summary.version_count);
    $('rwVersionsMeasuredCount').textContent = formatNumber(summary.measured_version_count);
    $('rwVersionsDraftCount').textContent = formatNumber(summary.draft_version_count);

    const container = $('rwVersionRows');

    if (!items.length) {
      container.innerHTML = '<div class="rwEmptyVersions">No hay landings registradas dentro del rango seleccionado.</div>';
      setVersionsStatus('Sin versiones para los filtros actuales.');
      return;
    }

    container.innerHTML = items.map((item) => {
      const title = item.product_title || item.product_handle || item.landing_key;
      return `
        <button class="rwVersionRow" type="button" data-landing-key="${escapeHtml(item.landing_key)}">
          <span class="rwVersionLanding">
            <strong>${escapeHtml(title)}</strong>
            <small>${escapeHtml(item.product_handle || item.landing_key)}</small>
          </span>
          <span class="rwVersionCell"><span class="rwVersionState rwVersionState--active">${escapeHtml(item.active_version_label || '—')}</span></span>
          <span class="rwVersionCell">${formatNumber(item.version_count)}</span>
          <span class="rwVersionCell">${formatNumber(item.total_views)}</span>
          <span class="rwVersionCell">${formatPct(item.total_view_to_l3_pct)}</span>
          <span class="rwVersionArrow">›</span>
        </button>`;
    }).join('');

    setVersionsStatus(
      `${formatNumber(items.length)} landings y ${formatNumber(summary.version_count)} versiones cargadas.`,
      'success'
    );
  }

  function statusText(status) {
    if (status === 'active') return 'Activa';
    if (status === 'draft') return 'Borrador';
    return 'Cerrada';
  }

  function miniWidth(count, views) {
    if (!views) return 100;
    return Math.max(44, Math.min(100, (number(count) / number(views)) * 100));
  }

  function versionCardHtml(version) {
    const funnel = version.funnel || {};
    const timing = version.timing || {};
    const experiment = version.experiment || {};
    const period = version.period || {};
    const status = version.status || 'closed';
    const views = number(funnel.views);

    return `
      <article class="rwVersionCard">
        <div class="rwVersionCardHead">
          <div>
            <span class="rwSectionLabel">VERSIÓN</span>
            <h3>${escapeHtml(version.version_label || '—')}</h3>
          </div>
          <span class="rwVersionState rwVersionState--${escapeHtml(status)}">${statusText(status)}</span>
        </div>

        <div class="rwVersionCardMeta">
          <span>Período</span>
          <p>${formatDate(period.activated_at)} → ${period.deactivated_at ? formatDate(period.deactivated_at) : (status === 'draft' ? 'Sin activar' : 'Actualidad')}</p>
        </div>

        <div class="rwVersionCardMeta">
          <span>Hipótesis</span>
          <p>${escapeHtml(experiment.hypothesis || 'Sin hipótesis registrada.')}</p>
        </div>

        <div class="rwVersionCardMeta">
          <span>Módulo intervenido</span>
          <p>${escapeHtml(experiment.changed_module || '—')} · Métrica: ${escapeHtml(experiment.primary_metric || '—')}</p>
        </div>

        <div class="rwMiniFunnel">
          <div class="rwMiniStage" style="--mini-width:100%"><div><span>Landing View</span><strong>${formatNumber(funnel.views)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l1" style="--mini-width:${miniWidth(funnel.reached_l1, views)}%"><div><span>L1 · ${formatPct(funnel.view_to_l1_pct)}</span><strong>${formatNumber(funnel.reached_l1)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l2" style="--mini-width:${miniWidth(funnel.reached_l2, views)}%"><div><span>L2 · ${formatPct(funnel.l1_to_l2_pct)}</span><strong>${formatNumber(funnel.reached_l2)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l3" style="--mini-width:${miniWidth(funnel.reached_l3, views)}%"><div><span>L3 · ${formatPct(funnel.view_to_l3_pct)}</span><strong>${formatNumber(funnel.reached_l3)}</strong></div></div>
        </div>

        <div class="rwMiniTiming">
          <div><span>Mediana L1</span><strong>${formatSeconds(timing.median_seconds_to_l1)}</strong></div>
          <div><span>Mediana L2</span><strong>${formatSeconds(timing.median_seconds_to_l2)}</strong></div>
          <div><span>Mediana L3</span><strong>${formatSeconds(timing.median_seconds_to_l3)}</strong></div>
        </div>
      </article>`;
  }

  function openVersionDrawer(item) {
    state.activeLanding = item;
    const versions = Array.isArray(item.versions) ? item.versions : [];
    const title = item.product_title || item.product_handle || item.landing_key;

    $('rwVersionDrawerTitle').textContent = title;
    $('rwVersionDrawerMeta').textContent =
      `${formatNumber(item.version_count)} versiones registradas · Activa: ${item.active_version_label || '—'}`;

    $('rwVersionTrack').innerHTML = versions.map(versionCardHtml).join('');

    const options = versions.map((version) =>
      `<option value="${version.version_number}">${escapeHtml(version.version_label)} · ${statusText(version.status)}</option>`
    ).join('');

    $('rwCompareA').innerHTML = options;
    $('rwCompareB').innerHTML = options;

    const measured = versions.filter((version) => number(version.funnel && version.funnel.views) > 0);
    const first = measured[0] || versions[0];
    const last = measured[measured.length - 1] || versions[versions.length - 1];

    if (first) $('rwCompareA').value = String(first.version_number);
    if (last) $('rwCompareB').value = String(last.version_number);

    renderComparison();

    $('rwVersionDrawerBackdrop').hidden = false;
    $('rwVersionDrawer').classList.add('is-open');
    $('rwVersionDrawer').setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }

  function closeVersionDrawer() {
    const drawer = $('rwVersionDrawer');
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';

    window.setTimeout(() => {
      if ($('rwVersionDrawerBackdrop')) $('rwVersionDrawerBackdrop').hidden = true;
    }, 250);
  }

  function deltaClass(value) {
    if (value > 0) return 'rwDeltaPositive';
    if (value < 0) return 'rwDeltaNegative';
    return 'rwDeltaNeutral';
  }

  function formatDelta(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2).replace('.', ',')} pp`;
  }

  function renderComparison() {
    if (!state.activeLanding) return;

    const versions = Array.isArray(state.activeLanding.versions)
      ? state.activeLanding.versions
      : [];

    const a = versions.find((version) =>
      String(version.version_number) === $('rwCompareA').value
    );

    const b = versions.find((version) =>
      String(version.version_number) === $('rwCompareB').value
    );

    if (!a || !b) {
      $('rwCompareMetrics').innerHTML = '';
      return;
    }

    const af = a.funnel || {};
    const bf = b.funnel || {};

    const metrics = [
      ['View → L1', number(bf.view_to_l1_pct) - number(af.view_to_l1_pct)],
      ['L1 → L2', number(bf.l1_to_l2_pct) - number(af.l1_to_l2_pct)],
      ['L2 → L3', number(bf.l2_to_l3_pct) - number(af.l2_to_l3_pct)],
      ['View → L3', number(bf.view_to_l3_pct) - number(af.view_to_l3_pct)]
    ];

    $('rwCompareMetrics').innerHTML = metrics.map(([label, value]) => `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong class="${deltaClass(value)}">${formatDelta(value)}</strong>
      </article>`).join('');
  }

  function switchTab(name) {
    document.querySelectorAll('[data-rw-tab]').forEach((button) => {
      const active = button.getAttribute('data-rw-tab') === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('[data-rw-panel]').forEach((panel) => {
      const active = panel.getAttribute('data-rw-panel') === name;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (name === 'versions' && !state.versionsLoaded) {
      refreshVersions();
    }
  }

  function init() {
    const main = document.querySelector('.rwMain');
    if (!main || main.dataset.rwInitialized === '1') return;
    main.dataset.rwInitialized = '1';

    $('rwStartDate').value = todayISO(-29);
    $('rwEndDate').value = todayISO(0);
    $('rwVersionsStartDate').value = todayISO(-29);
    $('rwVersionsEndDate').value = todayISO(0);

    $('rwRefreshButton').addEventListener('click', refreshAll);
    $('rwLandingSelect').addEventListener('change', () => {
      updateVersionOptions();
      refreshAll();
    });
    $('rwVersionSelect').addEventListener('change', refreshAll);

    $('rwVersionsRefreshButton').addEventListener('click', refreshVersions);
    $('rwVersionRows').addEventListener('click', (event) => {
      const row = event.target.closest('[data-landing-key]');
      if (!row || !state.versionsPayload) return;
      const items = Array.isArray(state.versionsPayload.items)
        ? state.versionsPayload.items
        : [];
      const item = items.find((candidate) =>
        candidate.landing_key === row.getAttribute('data-landing-key')
      );
      if (item) openVersionDrawer(item);
    });

    document.querySelectorAll('[data-rw-tab]').forEach((button) => {
      button.addEventListener('click', () =>
        switchTab(button.getAttribute('data-rw-tab'))
      );
    });

    $('rwVersionDrawerClose').addEventListener('click', closeVersionDrawer);
    $('rwVersionDrawerBackdrop').addEventListener('click', closeVersionDrawer);
    $('rwCompareA').addEventListener('change', renderComparison);
    $('rwCompareB').addEventListener('change', renderComparison);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeVersionDrawer();
    });

    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('sazzu:page:load', init);
})();
