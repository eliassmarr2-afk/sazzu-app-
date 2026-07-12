(function () {
  const state = { options: [], chart: null };
  const $ = (id) => document.getElementById(id);

  function todayISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }

  function number(value) {
    return Number(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(number(value));
  }

  function formatPct(value) {
    return value === null || value === undefined ? '—' : `${number(value).toFixed(2).replace('.', ',')}%`;
  }

  function formatSeconds(value) {
    return value === null || value === undefined ? '—' : `${number(value).toFixed(2).replace('.', ',')} s`;
  }

  function setStatus(message, type) {
    const el = $('rwStatus');
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

  function selectedLandingKey() {
    return $('rwLandingSelect').value || null;
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
    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>' + versions.map((version) => `<option value="${escapeHtml(version)}">${escapeHtml(version)}</option>`).join('');
    if (versions.includes(current)) select.value = current;
    if (landingKey && versions.length === 1) select.value = versions[0];
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function getClient() {
    if (!window.ProtocolAuth) throw new Error('ProtocolAuth no está disponible.');
    const session = await window.ProtocolAuth.getSession();
    if (!session) {
      window.location.href = window.ProtocolAuth.loginUrl(window.location.pathname + window.location.search);
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

    select.innerHTML = '<option value="">Todas las landings</option>' + Array.from(grouped.values()).map((item) => {
      const label = item.product_title || item.product_handle || item.landing_key;
      return `<option value="${escapeHtml(item.landing_key)}">${escapeHtml(label)}</option>`;
    }).join('');

    if (Array.from(grouped.keys()).includes(current)) select.value = current;
    if (!current && grouped.size === 1) select.value = Array.from(grouped.keys())[0];
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
    render(response.data || {});
  }

  function setStageWidth(id, count, views) {
    const el = $(id);
    if (!el) return;
    const pct = views > 0 ? (count / views) * 100 : 0;
    el.style.setProperty('--stage-width', `${Math.max(28, Math.min(100, pct))}%`);
  }

  function render(payload) {
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

    const title = landing.product_title || (selectedLandingKey() ? selectedLandingKey() : 'Todas las landings');
    $('rwSelectedLandingBadge').textContent = title;
    $('rwContextTitle').textContent = title;
    $('rwContextVersion').textContent = filters.landing_version || 'Todas';
    $('rwContextSource').textContent = filters.utm_source || 'Todas';
    $('rwContextCampaign').textContent = filters.utm_campaign || 'Todas';
    $('rwContextDevice').textContent = filters.device_type || 'Todos';
    $('rwContextRange').textContent = `${filters.start_date || '—'} → ${filters.end_date || '—'}`;

    renderInsight({ views, l1, l2, l3, timing });
    renderChart(Array.isArray(payload.daily) ? payload.daily : []);

    const now = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    $('rwLastUpdateBadge').textContent = `Actualizado ${now}`;
    setStatus(`Datos cargados: ${formatNumber(views)} visitas dentro del rango seleccionado.`, 'success');
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
    ].filter((item) => item.value !== null && item.value !== undefined)
      .sort((a, b) => number(b.value) - number(a.value));

    const biggestDrop = drops[0];
    const slowest = times[0];

    if (!data.views) {
      $('rwInsightTitle').textContent = 'Sin visitas para este filtro';
      $('rwInsightBody').textContent = 'Ampliá el rango o quitá filtros para recuperar datos del embudo.';
    } else {
      $('rwInsightTitle').textContent = biggestDrop.value > 0 ? `La mayor caída está en ${biggestDrop.label}` : 'La visita completó todo el embudo';
      $('rwInsightBody').textContent = biggestDrop.value > 0
        ? `${formatNumber(biggestDrop.value)} visitas no avanzaron al siguiente nivel. El nivel de llegada más lenta es ${slowest ? slowest.label : '—'}.`
        : 'No se detectaron abandonos en el conjunto actual. Hace falta más volumen para evaluar patrones estables.';
    }

    $('rwInsightDropBadge').textContent = `Mayor caída: ${biggestDrop.label} (${formatNumber(biggestDrop.value)})`;
    $('rwInsightSpeedBadge').textContent = `Nivel más lento: ${slowest ? `${slowest.label} · ${formatSeconds(slowest.value)}` : '—'}`;
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
          legend: { labels: { color: '#aeb6c2', usePointStyle: true, boxWidth: 8 } }
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
      setStatus(error && error.message ? error.message : 'No se pudo cargar Analytics.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    if (!$('rwRefreshButton')) return;
    $('rwStartDate').value = todayISO(-29);
    $('rwEndDate').value = todayISO(0);
    $('rwRefreshButton').addEventListener('click', refreshAll);
    $('rwLandingSelect').addEventListener('change', () => {
      updateVersionOptions();
      refreshAll();
    });
    $('rwVersionSelect').addEventListener('change', refreshAll);
    refreshAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
