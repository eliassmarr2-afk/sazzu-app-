/* ==========================================================
   Protocol Data · Logística Supabase Bridge
   Tablas paginadas + acciones protegidas.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const PAGE_SIZE_OPTIONS = [25, 50, 100];

  const state = {
    rules: { limit: 25, offset: 0, total: 0 },
    exceptions: { limit: 25, offset: 0, total: 0 },
    postal: { limit: 50, offset: 0, total: 0, query: '' },
    banners: { limit: 25, offset: 0, total: 0 }
  };

  function root() { return document.querySelector('main.logisticsMain'); }
  function q(sel) { const r = root(); return r ? r.querySelector(sel) : null; }

  function ensureStyles() {
    if (document.querySelector('link[data-logistica-tables="1"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/logistica/logistica-tables.css';
    link.dataset.logisticaTables = '1';
    document.head.appendChild(link);
  }

  function cfg() { return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null; }

  function client() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const shared = window.ProtocolAuth.getClient();
      if (shared) return shared;
    }
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

  function text(v, f) { return v === null || v === undefined || v === '' ? (f || '—') : String(v); }
  function n(v) { return Number(v || 0).toLocaleString('es-AR'); }
  function esc(v) { return text(v, '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c])); }

  function badge(msg, type) {
    const el = q('#logConnectionBadge');
    if (!el) return;
    el.textContent = msg;
    el.className = 'logConnectionBadge ' + (type || 'is-demo');
  }

  function toast(message, type) {
    let el = document.querySelector('#logToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'logToast';
      document.body.appendChild(el);
    }
    el.className = 'logToast is-visible is-' + (type || 'info');
    el.textContent = message;
    window.clearTimeout(window.__logToastTimer);
    window.__logToastTimer = window.setTimeout(() => { el.classList.remove('is-visible'); }, 2600);
  }

  function renderKpis(s) {
    const set = (id, value) => { const el = q(id); if (el) el.textContent = n(value); };
    set('#logKpiActive', s.postal_codes_total);
    set('#logKpiRules', s.rules_active);
    set('#logKpiExceptions', s.exceptions_active);
    set('#logKpiLookups', s.lookup_logs_total);
  }

  function renderZones(s) {
    const el = q('#logStateList');
    if (!el) return;
    const zones = s.postal_codes_by_zone || [];
    el.innerHTML = zones.map(z => `<div class="logStateItem"><div><strong>${esc(z.zone_id)}</strong><span>${n(z.total)} códigos postales activos</span></div><span class="logBadge logBadge--blue">${n(z.total)}</span></div>`).join('');
  }

  function renderInsights() {
    const el = q('#logInsightList');
    if (!el) return;
    el.innerHTML = [
      '<div class="logInsightItem"><strong>Supabase activo</strong><span>El panel está leyendo el motor real de envíos mediante RPC.</span></div>',
      '<div class="logInsightItem"><strong>Tablas controladas</strong><span>Reglas, excepciones y banners se gestionan con acciones protegidas por sesión.</span></div>',
      '<div class="logInsightItem"><strong>CP protegidos</strong><span>Los códigos postales son base maestra: no se eliminan desde el panel operativo.</span></div>'
    ].join('');
  }

  function rangeLabel(p) {
    if (!p.total) return 'Sin resultados';
    const from = p.offset + 1;
    const to = Math.min(p.offset + p.limit, p.total);
    return `Mostrando ${n(from)}-${n(to)} de ${n(p.total)}`;
  }

  function pager(entity) {
    const p = state[entity];
    const pageSize = PAGE_SIZE_OPTIONS.map(size => `<option value="${size}" ${p.limit === size ? 'selected' : ''}>${size}</option>`).join('');
    return `<div class="logDataToolbar" data-log-pager="${entity}">
      <span class="logDataMeta">${rangeLabel(p)}</span>
      <div class="logPager">
        <span class="logDataMeta">Filas</span>
        <select class="logPageSize" data-log-pagesize="${entity}">${pageSize}</select>
        <button class="logPager__btn" type="button" data-log-page="prev" data-entity="${entity}" ${p.offset <= 0 ? 'disabled' : ''}>Anterior</button>
        <button class="logPager__btn" type="button" data-log-page="next" data-entity="${entity}" ${(p.offset + p.limit) >= p.total ? 'disabled' : ''}>Siguiente</button>
      </div>
    </div>`;
  }

  function tableShell(entity, html) {
    return `<div class="logDataShell">${html}${pager(entity)}</div>`;
  }

  function renderRules(data) {
    const el = q('#logRulesList');
    if (!el) return;
    const p = state.rules;
    p.total = Number(data.total || 0);
    const items = data.items || [];
    const rows = items.map(r => `<tr>
      <td><strong>${esc(r.rule_id)}</strong><br><span>${esc(r.rule_name)}</span></td>
      <td>${esc(r.scope_type)}<br><span>${esc(r.scope_value, 'default')}</span></td>
      <td>${esc(r.shipping_label)}<br><span>${esc(r.promise_label)}</span></td>
      <td>${esc(r.priority)}</td>
      <td><span class="logBadge ${r.is_active ? 'logBadge--green' : 'logBadge--gray'}">${r.is_active ? 'Activa' : 'Inactiva'}</span></td>
      <td><div class="logTableActions"><button class="logDangerBtn" type="button" data-log-deactivate="rule" data-log-id="${esc(r.rule_id)}">Desactivar</button></div></td>
    </tr>`).join('') || '<tr><td colspan="6">No hay reglas para mostrar.</td></tr>';
    el.innerHTML = tableShell('rules', `<div class="logTableWrap"><table class="logTable logTable--compact"><thead><tr><th>Regla</th><th>Alcance</th><th>Envío</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  function renderExceptions(data) {
    const el = q('#logIssueList');
    if (!el) return;
    const p = state.exceptions;
    p.total = Number(data.total || 0);
    const items = data.items || [];
    const rows = items.map(x => `<tr>
      <td><strong>${esc(x.exception_id)}</strong><br><span>${esc(x.exception_name)}</span></td>
      <td>${esc(x.scope_type)}<br><span>${esc(x.scope_value)}</span></td>
      <td>${esc(x.exception_type)}<br><span>${esc(x.shipping_label)} · ${esc(x.promise_label)}</span></td>
      <td>${esc(x.priority)}</td>
      <td><span class="logBadge ${x.is_active ? 'logBadge--red' : 'logBadge--gray'}">${x.is_active ? 'Activa' : 'Inactiva'}</span></td>
      <td><div class="logTableActions"><button class="logDangerBtn" type="button" data-log-deactivate="exception" data-log-id="${esc(x.exception_id)}">Desactivar</button></div></td>
    </tr>`).join('') || '<tr><td colspan="6">No hay excepciones para mostrar.</td></tr>';
    el.innerHTML = tableShell('exceptions', `<div class="logTableWrap"><table class="logTable logTable--compact"><thead><tr><th>Excepción</th><th>Alcance</th><th>Condición</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  function renderBanners(data) {
    const el = q('#logBannerList');
    if (!el) return;
    const all = data.items || [];
    state.banners.total = Number(data.total || all.length || 0);
    const p = state.banners;
    const items = all.slice(p.offset, p.offset + p.limit);
    const rows = items.map(b => `<tr>
      <td><strong>${esc(b.banner_id)}</strong></td>
      <td>${n(b.total)} usos</td>
      <td>${(b.sources || []).map(s => `${esc(s.source_type)}: ${n(s.total)}`).join('<br>')}</td>
      <td><div class="logTableActions"><button class="logDangerBtn" type="button" data-log-deactivate="banner" data-log-id="${esc(b.banner_id)}">Quitar uso</button></div></td>
    </tr>`).join('') || '<tr><td colspan="4">No hay banners para mostrar.</td></tr>';
    el.innerHTML = tableShell('banners', `<div class="logTableWrap"><table class="logTable logTable--compact"><thead><tr><th>Banner ID</th><th>Uso</th><th>Origen</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  function renderPostal(data) {
    const el = q('#logCpTbody');
    if (!el) return;
    state.postal.total = Number(data.total || 0);
    const items = data.items || [];
    el.innerHTML = items.map(cp => `<tr>
      <td><strong>${esc(cp.postal_code)}</strong></td><td>${esc(cp.locality)}</td><td>${esc(cp.province)}</td><td><span class="logBadge logBadge--blue">${esc(cp.zone_id)}</span></td><td>${esc(cp.source)}</td><td><button class="logMutedBtn" type="button" disabled>Protegido</button></td>
    </tr>`).join('') || '<tr><td colspan="6">No hay resultados.</td></tr>';
    ensurePostalPager();
    const pagerBox = q('#logCpPager');
    if (pagerBox) pagerBox.innerHTML = pager('postal');
  }

  function ensurePostalPager() {
    const table = q('#logCpTbody');
    if (!table) return;
    const card = table.closest('.logCard');
    if (!card || q('#logCpPager')) return;
    const div = document.createElement('div');
    div.id = 'logCpPager';
    div.className = 'logDataShell';
    card.appendChild(div);
  }

  function renderLookup(res) {
    const el = q('#logLookupResult');
    if (!el || !res) return;
    if (res.status === 'not_found' || res.status === 'invalid') {
      el.innerHTML = `<div class="logLookupResult__status logLookupResult__status--error">${text(res.status)}</div><strong>${esc(res.message)}</strong><span>CP: ${esc(res.postal_code)}</span>`;
      return;
    }
    const badges = res.badges || [];
    el.innerHTML = `<div class="logLookupResult__status ${res.status === 'ok' ? 'logLookupResult__status--ok' : 'logLookupResult__status--warning'}">${esc(res.status)}</div><div class="logLookupGrid"><div><span>CP</span><strong>${esc(res.postal_code)}</strong></div><div><span>Zona</span><strong>${esc(res.zone_id)}</strong></div><div><span>Provincia</span><strong>${esc(res.province)}</strong></div><div><span>Localidad</span><strong>${esc(res.locality)}</strong></div><div><span>Envío</span><strong>${esc(res.shipping_label)} · ${esc(res.promise_label)}</strong></div><div><span>Regla</span><strong>${esc(res.applied_rule_id || res.applied_exception_id)}</strong></div><div><span>Candidatos</span><strong>${esc(res.candidates_count, '0')}</strong></div><div><span>Banner</span><strong>${esc(res.banner_id)}</strong></div></div><div class="logLookupBadges">${badges.length ? badges.map(b => `<span class="logBadge ${b.type === 'warning' ? 'logBadge--orange' : b.type === 'success' ? 'logBadge--green' : 'logBadge--blue'}">${esc(b.text)}</span>`).join('') : '<span class="logBadge logBadge--gray">Sin badges</span>'}</div>`;
  }

  async function loadSummary() {
    const summary = await rpc('protocol_logistics_shipping_summary');
    renderKpis(summary || {});
    renderZones(summary || {});
    renderInsights();
  }

  async function loadRules() {
    const p = state.rules;
    const data = await rpc('protocol_logistics_shipping_rules', { input_limit: p.limit, input_offset: p.offset });
    renderRules(data || { total: 0, items: [] });
  }

  async function loadExceptions() {
    const p = state.exceptions;
    const data = await rpc('protocol_logistics_shipping_exceptions', { input_limit: p.limit, input_offset: p.offset });
    renderExceptions(data || { total: 0, items: [] });
  }

  async function loadPostal() {
    const p = state.postal;
    const data = await rpc('protocol_logistics_postal_search', { input_query: p.query, input_limit: p.limit, input_offset: p.offset });
    renderPostal(data || { total: 0, items: [] });
  }

  async function loadBanners() {
    const data = await rpc('protocol_logistics_shipping_banners');
    renderBanners(data || { total: 0, items: [] });
  }

  async function loadAll() {
    const r = root();
    if (!r) return;
    badge('Sincronizando...', 'is-loading');
    try {
      await Promise.all([loadSummary(), loadRules(), loadExceptions(), loadPostal(), loadBanners()]);
      badge('Supabase activo', 'is-live');
    } catch (e) {
      console.warn('[Logística Supabase]', e);
      badge('Modo demo', 'is-demo');
    }
  }

  async function refreshAfterMutation() {
    await loadSummary();
    await Promise.all([loadRules(), loadExceptions(), loadPostal(), loadBanners()]);
  }

  async function deactivate(entity, id) {
    if (!window.ProtocolAuth) {
      toast('Iniciá sesión interna para modificar logística.', 'error');
      return;
    }
    const session = await window.ProtocolAuth.getSession().catch(() => null);
    if (!session) {
      toast('Iniciá sesión interna para modificar logística.', 'error');
      return;
    }
    const labels = { rule: 'la regla', exception: 'la excepción', banner: 'el uso del banner', postal_code: 'el CP' };
    const ok = window.confirm(`¿Confirmás desactivar/quitar ${labels[entity] || 'el item'} “${id}”?`);
    if (!ok) return;
    const result = await rpc('protocol_logistics_deactivate_shipping_item', { input_entity: entity, input_id: id });
    if (!result || result.status !== 'ok') {
      toast(text(result && result.message, 'No se pudo completar la acción.'), 'error');
      return;
    }
    toast(text(result.message, 'Acción completada.'), 'success');
    await refreshAfterMutation();
  }

  window.ProtocolLogisticaSupabaseRefresh = loadAll;

  function bind() {
    const r = root();
    if (!r || r.dataset.logisticaSupabaseBound === '1') return;
    r.dataset.logisticaSupabaseBound = '1';
    ensureStyles();

    q('#logBtnSyncSupabase')?.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      loadAll();
    }, true);

    q('#logCpSearch')?.addEventListener('input', debounce(() => {
      state.postal.query = q('#logCpSearch')?.value || '';
      state.postal.offset = 0;
      loadPostal();
    }, 250));

    r.addEventListener('click', function (event) {
      const pageBtn = event.target.closest('[data-log-page]');
      if (pageBtn) {
        const entity = pageBtn.dataset.entity;
        const dir = pageBtn.dataset.logPage;
        const p = state[entity];
        if (!p) return;
        p.offset = dir === 'next' ? Math.min(p.offset + p.limit, Math.max(p.total - 1, 0)) : Math.max(p.offset - p.limit, 0);
        if (entity === 'rules') loadRules();
        if (entity === 'exceptions') loadExceptions();
        if (entity === 'postal') loadPostal();
        if (entity === 'banners') loadBanners();
        return;
      }

      const danger = event.target.closest('[data-log-deactivate]');
      if (danger) {
        deactivate(danger.dataset.logDeactivate, danger.dataset.logId);
      }
    });

    r.addEventListener('change', function (event) {
      const select = event.target.closest('[data-log-pagesize]');
      if (!select) return;
      const entity = select.dataset.logPagesize;
      const p = state[entity];
      if (!p) return;
      p.limit = Number(select.value || p.limit);
      p.offset = 0;
      if (entity === 'rules') loadRules();
      if (entity === 'exceptions') loadExceptions();
      if (entity === 'postal') loadPostal();
      if (entity === 'banners') loadBanners();
    });

    q('#logLookupForm')?.addEventListener('submit', async ev => {
      ev.preventDefault();
      const cp = (q('#logLookupInput')?.value || '').trim();
      if (!cp) return;
      const box = q('#logLookupResult');
      if (box) box.innerHTML = 'Consultando motor de envíos...';
      try {
        const res = await rpc('resolve_shipping_lookup', { input_postal_code: cp, input_source_page: 'protocol_logistica_panel', input_customer_session_id: 'panel_preview' });
        renderLookup(res);
        await loadSummary();
      } catch (e) {
        renderLookup({ status: 'invalid', postal_code: cp, message: 'No se pudo consultar Supabase. Revisá configuración o permisos RPC.' });
      }
    });
  }

  function boot() { bind(); loadAll(); }
  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
