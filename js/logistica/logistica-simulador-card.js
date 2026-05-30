/* ==========================================================
   Protocol Data · Logística · Simulador Card
   Mejora visual del resultado del simulador de CP.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';

  function root() {
    return document.querySelector('main.logisticsMain');
  }

  function q(selector) {
    const el = root();
    return el ? el.querySelector(selector) : null;
  }

  function cfg() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function getClient() {
    if (window.__protocolLogisticaCardClient) return window.__protocolLogisticaCardClient;
    const config = cfg();
    const key = config && (config.anonKey || config.publishableKey || config.key);
    if (!window.supabase || !config || !config.url || !key) return null;
    window.__protocolLogisticaCardClient = window.supabase.createClient(config.url, key);
    return window.__protocolLogisticaCardClient;
  }

  async function rpc(name, args) {
    const client = getClient();
    if (!client) throw new Error('Supabase no configurado');
    const response = await client.rpc(name, args || {});
    if (response.error) throw response.error;
    return response.data;
  }

  function txt(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback || '—';
    return String(value);
  }

  function clean(value) {
    return txt(value, '').replace(/[&<>]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char];
    });
  }

  function statusLabel(status) {
    if (status === 'ok') return 'Disponible';
    if (status === 'ambiguous') return 'Requiere validación';
    if (status === 'not_found') return 'No encontrado';
    if (status === 'invalid') return 'Consulta inválida';
    return txt(status);
  }

  function statusClass(status) {
    if (status === 'ok') return 'logLookupExecStatus--ok';
    if (status === 'ambiguous') return 'logLookupExecStatus--warning';
    return 'logLookupExecStatus--error';
  }

  function renderError(result) {
    return `
      <div class="logLookupExec logLookupExec--error">
        <div class="logLookupExec__head">
          <div>
            <span>Resultado del simulador</span>
            <strong>${clean(statusLabel(result.status))}</strong>
            <small>CP consultado: ${clean(result.postal_code)}</small>
          </div>
          <em class="logLookupExecStatus logLookupExecStatus--error">${clean(txt(result.status))}</em>
        </div>
        <div class="logLookupExec__notice">
          <strong>${clean(result.message)}</strong>
        </div>
      </div>
    `;
  }

  function renderSuccess(result) {
    const badges = result.badges || [];
    const appliedId = result.applied_exception_id || result.applied_rule_id;
    const range = result.min_delivery_days && result.max_delivery_days
      ? `${result.min_delivery_days} a ${result.max_delivery_days} días`
      : 'A confirmar';

    return `
      <div class="logLookupExec">
        <div class="logLookupExec__head">
          <div>
            <span>Resultado del simulador</span>
            <strong>CP ${clean(result.postal_code)} · ${clean(result.locality)}</strong>
            <small>${clean(result.province)} · ${clean(result.zone_id)}</small>
          </div>
          <em class="logLookupExecStatus ${statusClass(result.status)}">${clean(statusLabel(result.status))}</em>
        </div>

        <div class="logLookupExec__hero">
          <div><span>Envío</span><strong>${clean(result.shipping_label)}</strong></div>
          <div><span>Promesa pública</span><strong>${clean(result.promise_label)}</strong></div>
          <div><span>Banda horaria</span><strong>${clean(result.time_band)}</strong></div>
        </div>

        <div class="logLookupExec__grid">
          <div><span>Modo</span><strong>${clean(result.shipping_mode)}</strong></div>
          <div><span>Disponibilidad</span><strong>${result.shipping_available ? 'Disponible' : 'No disponible'}</strong></div>
          <div><span>Rango operativo</span><strong>${clean(range)}</strong></div>
          <div><span>Candidatos CP</span><strong>${clean(txt(result.candidates_count, '0'))}</strong></div>
          <div><span>Regla / excepción aplicada</span><strong>${clean(appliedId)}</strong></div>
          <div><span>Banner público</span><strong>${clean(result.banner_id)}</strong></div>
        </div>

        <div class="logLookupExec__badges">
          <span>Badges públicos</span>
          <div>
            ${badges.length ? badges.map(function (badge) {
              const cls = badge.type === 'warning' ? 'logBadge--orange' : badge.type === 'success' ? 'logBadge--green' : 'logBadge--blue';
              return `<span class="logBadge ${cls}">${clean(badge.text)}</span>`;
            }).join('') : '<span class="logBadge logBadge--gray">Sin badges</span>'}
          </div>
        </div>

        ${result.public_message ? `<div class="logLookupExec__notice"><strong>Mensaje público</strong><span>${clean(result.public_message)}</span></div>` : ''}
      </div>
    `;
  }

  function renderResult(result) {
    const box = q('#logLookupResult');
    if (!box) return;

    if (!result || result.status === 'not_found' || result.status === 'invalid') {
      box.innerHTML = renderError(result || { status: 'invalid', message: 'No se pudo leer la respuesta.', postal_code: '—' });
      return;
    }

    box.innerHTML = renderSuccess(result);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const input = q('#logLookupInput');
    const cp = (input && input.value ? input.value : '').trim();
    if (!cp) return;

    const box = q('#logLookupResult');
    if (box) {
      box.innerHTML = `
        <div class="logLookupExec logLookupExec--loading">
          <div class="logLookupExec__head">
            <div>
              <span>Resultado del simulador</span>
              <strong>Consultando motor de envíos...</strong>
              <small>Resolviendo CP ${clean(cp)} contra Supabase</small>
            </div>
            <em class="logLookupExecStatus logLookupExecStatus--warning">Procesando</em>
          </div>
        </div>
      `;
    }

    try {
      const result = await rpc('resolve_shipping_lookup', {
        input_postal_code: cp,
        input_source_page: 'protocol_logistica_panel',
        input_customer_session_id: 'panel_preview'
      });
      renderResult(result);
    } catch (error) {
      console.warn('[Logística Simulador Card]', error);
      renderResult({
        status: 'invalid',
        postal_code: cp,
        message: 'No se pudo consultar Supabase. Revisá configuración o permisos RPC.'
      });
    }
  }

  function boot() {
    const form = q('#logLookupForm');
    if (!form || form.dataset.logisticaCardBound === '1') return;
    form.dataset.logisticaCardBound = '1';
    form.addEventListener('submit', handleSubmit, true);
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
