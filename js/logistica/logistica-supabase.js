/* ==========================================================
   Protocol Data · Logística Supabase Bridge
   Lee RPC del motor de envíos y pisa el mock visual inicial.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function q(sel) {
    const r = root();
    return r ? r.querySelector(sel) : null;
  }

  function qa(sel) {
    const r = root();
    return r ? Array.from(r.querySelectorAll(sel)) : [];
  }

  function cfg() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function client() {
    if (window.__protocolLogisticaClient) return window.__protocolLogisticaClient;
    const c = cfg();
    const key = c && (c.anonKey || c.publishableKey || c.key);
    if (!window.supabase || !c || !c.url || !key) return null;
    window.__protocolLogisticaClient = window.supabase.createClient(c.url, key);
    return window.__protocolLogisticaClient;
  }

  async function rpc(name, args) {
    const c = client();
    if (!c) throw new Error('Supabase no configurado');
    const res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  function text(v, f) {
    return v === null || v === undefined || v === '' ? (f || '—') : String(v);
  }

  function badge(msg, type) {
    const el = q('#logConnectionBadge');
    if (!el) return;
    el.textContent = msg;
    el.className = 'logConnectionBadge ' + (type || 'is-demo');
  }

  function renderKpis(s) {
    const set = (id, value) => {
      const el = q(id);
      if (el) el.textContent = Number(value || 0).toLocaleString('es-AR');
    };
    set('#logKpiActive', s.postal_codes_total);
    set('#logKpiRules', s.rules_active);
    set('#logKpiExceptions', s.exceptions_active);
    set('#logKpiLookups', s.lookup_logs_total);
  }

  function renderZones(s) {
    const el = q('#logStateList');
    if (!el) return;
    const zones = s.postal_codes_by_zone || [];
    el.innerHTML = zones.map(z => `
      <div class="logStateItem">
        <div><strong>${text(z.zone_id)}</strong><span>${Number(z.total || 0).toLocaleString('es-AR')} códigos postales activos</span></div>
        <span class="logBadge logBadge--blue">${Number(z.total || 0).toLocaleString('es-AR')}</span>
      </div>
    `).join('');
  }

  function renderInsights() {
    const el = q('#logInsightList');
    if (!el) return;
    el.innerHTML = [
      '<div class="logInsightItem"><strong>Supabase activo</strong><span>El panel está leyendo el motor real de envíos mediante RPC.</span></div>',
      '<div class="logInsightItem"><strong>Motor de resolución</strong><span>Prioridad: excepción, CP, localidad, provincia, zona y default.</span></div>',
      '<div class="logInsightItem"><strong>Siguiente etapa</strong><span>Habilitar edición de reglas y excepciones con permisos autenticados.</span></div>'
    ].join('');
  }

  function renderRules(data) {
    const el = q('#logRulesList');
    if (!el) return;
    const items = data.items || [];
    el.innerHTML = items.map(r => `
      <div class="logRuleItem">
        <div class="logItemTopline"><strong>${text(r.rule_id)}</strong><span class="logBadge ${r.is_active ? 'logBadge--green' : 'logBadge--gray'}">${r.is_active ? 'Activa' : 'Inactiva'}</span></div>
        <span>${text(r.scope_type)} · ${text(r.scope_value, 'default')} · ${text(r.shipping_label)} · ${text(r.promise_label)} · Prioridad ${text(r.priority)}</span>
      </div>
    `).join('');
  }

  function renderExceptions(data) {
    const el = q('#logIssueList');
    if (!el) return;
    const items = data.items || [];
    el.innerHTML = items.length ? items.map(x => `
      <div class="logIssueItem">
        <div class="logItemTopline"><strong>${text(x.exception_id)}</strong><span class="logBadge ${x.is_active ? 'logBadge--red' : 'logBadge--gray'}">${x.is_active ? 'Activa' : 'Inactiva'}</span></div>
        <span>${text(x.scope_type)} · ${text(x.scope_value)} · ${text(x.exception_type)} · ${text(x.shipping_label)} · ${text(x.promise_label)}</span>
      </div>
    `).join('') : '<div class="logIssueItem"><strong>Sin excepciones</strong><span>No hay excepciones cargadas.</span></div>';
  }

  function renderBanners(data) {
    const el = q('#logBannerList');
    if (!el) return;
    const items = data.items || [];
    el.innerHTML = items.map(b => `
      <div class="logBannerItem"><strong>${text(b.banner_id)}</strong><span>${Number(b.total || 0)} usos detectados</span></div>
    `).join('');
  }

  function renderPostal(data) {
    const el = q('#logCpTbody');
    if (!el) return;
    const items = data.items || [];
    el.innerHTML = items.map(cp => `
      <tr><td><strong>${text(cp.postal_code)}</strong></td><td>${text(cp.locality)}</td><td>${text(cp.province)}</td><td><span class="logBadge logBadge--blue">${text(cp.zone_id)}</span></td><td>${text(cp.source)}</td></tr>
    `).join('') || '<tr><td colspan="5">No hay resultados.</td></tr>';
  }

  function renderLookup(res) {
    const el = q('#logLookupResult');
    if (!el || !res) return;
    if (res.status === 'not_found' || res.status === 'invalid') {
      el.innerHTML = `<div class="logLookupResult__status logLookupResult__status--error">${text(res.status)}</div><strong>${text(res.message)}</strong><span>CP: ${text(res.postal_code)}</span>`;
      return;
    }
    const badges = res.badges || [];
    el.innerHTML = `
      <div class="logLookupResult__status ${res.status === 'ok' ? 'logLookupResult__status--ok' : 'logLookupResult__status--warning'}">${text(res.status)}</div>
      <div class="logLookupGrid">
        <div><span>CP</span><strong>${text(res.postal_code)}</strong></div><div><span>Zona</span><strong>${text(res.zone_id)}</strong></div><div><span>Provincia</span><strong>${text(res.province)}</strong></div><div><span>Localidad</span><strong>${text(res.locality)}</strong></div>
        <div><span>Envío</span><strong>${text(res.shipping_label)} · ${text(res.promise_label)}</strong></div><div><span>Regla</span><strong>${text(res.applied_rule_id || res.applied_exception_id)}</strong></div><div><span>Candidatos</span><strong>${text(res.candidates_count, '0')}</strong></div><div><span>Banner</span><strong>${text(res.banner_id)}</strong></div>
      </div>
      <div class="logLookupBadges">${badges.length ? badges.map(b => `<span class="logBadge ${b.type === 'warning' ? 'logBadge--orange' : b.type === 'success' ? 'logBadge--green' : 'logBadge--blue'}">${text(b.text)}</span>`).join('') : '<span class="logBadge logBadge--gray">Sin badges</span>'}</div>
    `;
  }

  async function loadAll() {
    const r = root();
    if (!r) return;
    badge('Sincronizando...', 'is-loading');
    try {
      const [summary, rules, exceptions, postal, banners] = await Promise.all([
        rpc('protocol_logistics_shipping_summary'),
        rpc('protocol_logistics_shipping_rules', { input_limit: 120, input_offset: 0 }),
        rpc('protocol_logistics_shipping_exceptions', { input_limit: 120, input_offset: 0 }),
        rpc('protocol_logistics_postal_search', { input_query: '', input_limit: 50, input_offset: 0 }),
        rpc('protocol_logistics_shipping_banners')
      ]);
      renderKpis(summary || {});
      renderZones(summary || {});
      renderInsights();
      renderRules(rules || { items: [] });
      renderExceptions(exceptions || { items: [] });
      renderPostal(postal || { items: [] });
      renderBanners(banners || { items: [] });
      badge('Supabase activo', 'is-live');
    } catch (e) {
      console.warn('[Logística Supabase]', e);
      badge('Modo demo', 'is-demo');
    }
  }

  function bind() {
    const r = root();
    if (!r || r.dataset.logisticaSupabaseBound === '1') return;
    r.dataset.logisticaSupabaseBound = '1';

    q('#logBtnSyncSupabase')?.addEventListener('click', loadAll);

    q('#logCpSearch')?.addEventListener('input', debounce(async () => {
      try {
        const data = await rpc('protocol_logistics_postal_search', { input_query: q('#logCpSearch')?.value || '', input_limit: 50, input_offset: 0 });
        renderPostal(data || { items: [] });
      } catch (e) {
        console.warn('[Logística CP]', e);
      }
    }, 250));

    q('#logLookupForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const cp = (q('#logLookupInput')?.value || '').trim();
      if (!cp) return;
      const box = q('#logLookupResult');
      if (box) box.innerHTML = 'Consultando motor de envíos...';
      try {
        const res = await rpc('resolve_shipping_lookup', { input_postal_code: cp, input_source_page: 'protocol_logistica_panel', input_customer_session_id: 'panel_preview' });
        renderLookup(res);
        const summary = await rpc('protocol_logistics_shipping_summary');
        renderKpis(summary || {});
      } catch (e) {
        renderLookup({ status: 'invalid', postal_code: cp, message: 'No se pudo consultar Supabase. Revisá configuración o permisos RPC.' });
      }
    });
  }

  function boot() {
    bind();
    loadAll();
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
