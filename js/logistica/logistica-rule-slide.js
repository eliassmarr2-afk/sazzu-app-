/* ==========================================================
   Protocol Data · Logística · Slide Nueva Regla
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
    if (window.__protocolLogisticaRuleClient) return window.__protocolLogisticaRuleClient;
    const config = cfg();
    const key = config && (config.anonKey || config.publishableKey || config.key);
    if (!window.supabase || !config || !config.url || !key) return null;
    window.__protocolLogisticaRuleClient = window.supabase.createClient(config.url, key);
    return window.__protocolLogisticaRuleClient;
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

  function openSlide() {
    const slide = q('#logRuleSlide');
    if (!slide) return;
    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('logRuleSlideLock');
    document.body.classList.add('logRuleSlideLock');
    updatePreview();
    window.setTimeout(function () {
      q('#logRuleScopeValue')?.focus({ preventScroll: true });
    }, 120);
  }

  function closeSlide() {
    const slide = q('#logRuleSlide');
    if (!slide) return;
    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('logRuleSlideLock');
    document.body.classList.remove('logRuleSlideLock');
  }

  function setMessage(type, message) {
    const box = q('#logRuleMessage');
    if (!box) return;
    box.className = 'logRuleMessage is-visible is-' + type;
    box.textContent = message;
  }

  function clearMessage() {
    const box = q('#logRuleMessage');
    if (!box) return;
    box.className = 'logRuleMessage';
    box.textContent = '';
  }

  function readForm() {
    const scopeType = q('#logRuleScopeType')?.value || 'zone';
    const scopeValue = (q('#logRuleScopeValue')?.value || '').trim();
    const shippingMode = q('#logRuleShippingMode')?.value || 'paid';
    const price = (q('#logRuleShippingPrice')?.value || '').trim();
    const priority = (q('#logRulePriority')?.value || '').trim();
    const isActive = Boolean(q('#logRuleIsActive')?.checked);

    return {
      rule_id: (q('#logRuleId')?.value || '').trim(),
      rule_name: (q('#logRuleName')?.value || '').trim(),
      scope_type: scopeType,
      scope_value: scopeType === 'default' ? 'default' : scopeValue,
      zone_id: (q('#logRuleZoneId')?.value || '').trim(),
      shipping_mode: shippingMode,
      shipping_price: shippingMode === 'free' ? '0' : price,
      shipping_label: (q('#logRuleShippingLabel')?.value || '').trim(),
      promise_label: (q('#logRulePromise')?.value || '').trim(),
      min_delivery_days: (q('#logRuleMinDays')?.value || '').trim(),
      max_delivery_days: (q('#logRuleMaxDays')?.value || '').trim(),
      time_band: (q('#logRuleTimeBand')?.value || '').trim(),
      banner_id: (q('#logRuleBanner')?.value || '').trim(),
      priority: priority,
      is_active: isActive,
      shipping_available: shippingMode === 'unavailable' ? false : true
    };
  }

  function validate(payload) {
    if (payload.scope_type !== 'default' && !payload.scope_value) {
      return 'El valor de la regla es obligatorio.';
    }

    if (payload.shipping_mode === 'paid' && !payload.shipping_price) {
      return 'Para envío pagado, el precio es obligatorio.';
    }

    const min = Number(payload.min_delivery_days || 0);
    const max = Number(payload.max_delivery_days || 0);
    if (min && max && min > max) {
      return 'El mínimo de días no puede ser mayor al máximo.';
    }

    return '';
  }

  function formatMode(mode) {
    if (mode === 'free') return 'Gratis';
    if (mode === 'paid') return 'Pagado';
    if (mode === 'quote_required') return 'A confirmar';
    if (mode === 'unavailable') return 'No disponible';
    return mode;
  }

  function updatePreview() {
    const data = readForm();
    const title = q('#logRulePreviewTitle');
    const scope = q('#logRulePreviewScope');
    const mode = q('#logRulePreviewMode');
    const promise = q('#logRulePreviewPromise');
    const priority = q('#logRulePreviewPriority');
    const banner = q('#logRulePreviewBanner');

    if (title) title.textContent = data.rule_name || `Nueva regla · ${data.scope_type}`;
    if (scope) scope.textContent = `${data.scope_type} · ${data.scope_value || 'sin valor'}`;
    if (mode) mode.textContent = `${formatMode(data.shipping_mode)} · ${data.shipping_mode === 'free' ? 'Gratis' : '$' + (data.shipping_price || '0')}`;
    if (promise) promise.textContent = data.promise_label || 'Llega en 3 a 7 días';
    if (priority) priority.textContent = data.priority || 'Automática';
    if (banner) banner.textContent = data.banner_id || 'ban_navid_003';
  }

  async function refreshPanel() {
    if (typeof window.ProtocolLogisticaInit === 'function') {
      window.ProtocolLogisticaInit();
    }

    q('#logBtnSyncSupabase')?.click();
  }

  async function saveRule(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearMessage();

    const payload = readForm();
    const error = validate(payload);
    if (error) {
      setMessage('error', error);
      return;
    }

    const client = getClient();
    if (!client) {
      setMessage('error', 'Supabase no está configurado en este navegador.');
      return;
    }

    const sessionResult = await client.auth.getSession();
    const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

    if (!session) {
      setMessage('info', 'El slide ya está listo. Para guardar reglas reales falta iniciar sesión interna en Supabase Auth. Por seguridad, la RPC no permite escritura anónima.');
      return;
    }

    const submit = q('#logRuleSubmit');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Guardando regla...';
    }

    try {
      const result = await rpc('protocol_logistics_upsert_shipping_rule', { input_rule: payload });

      if (!result || result.status !== 'ok') {
        setMessage('error', txt(result && result.message, 'No se pudo guardar la regla.'));
        return;
      }

      setMessage('success', 'Regla guardada correctamente. El panel se sincronizará con Supabase.');
      await refreshPanel();
      window.setTimeout(closeSlide, 900);
    } catch (err) {
      console.warn('[Nueva regla logística]', err);
      setMessage('error', 'No se pudo guardar la regla. Revisá si ejecutaste la migración 005 y si la sesión está autenticada.');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Guardar regla';
      }
    }
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.ruleSlideBound === '1') return;
    main.dataset.ruleSlideBound = '1';

    q('#logBtnNewRule')?.addEventListener('click', function (event) {
      event.preventDefault();
      openSlide();
    }, true);

    q('#logRuleSlideOverlay')?.addEventListener('click', closeSlide);
    q('#logRuleSlideClose')?.addEventListener('click', closeSlide);
    q('#logRuleForm')?.addEventListener('submit', saveRule, true);

    ['#logRuleScopeType', '#logRuleScopeValue', '#logRuleShippingMode', '#logRuleShippingPrice', '#logRulePromise', '#logRulePriority', '#logRuleBanner', '#logRuleName'].forEach(function (selector) {
      q(selector)?.addEventListener('input', updatePreview);
      q(selector)?.addEventListener('change', updatePreview);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSlide();
    });
  }

  function boot() {
    bind();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
