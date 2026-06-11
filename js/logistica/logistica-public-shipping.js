/* ==========================================================
   Protocol Data · Logística · Public Shipping Adapter
   CP → resolve_shipping_lookup → contrato limpio para Shopify.
   ========================================================== */

(function () {
  const DEFAULT_SOURCE_PAGE = 'alpaso_product_landing';
  const DEFAULT_SESSION_KEY = 'protocol_shipping_public_session_id';

  function cfg() {
    return window.SAZZU_SUPABASE_CONFIG || window.PROTOCOL_SUPABASE_CONFIG || null;
  }

  function getClient() {
    if (window.ProtocolAuth && typeof window.ProtocolAuth.getClient === 'function') {
      const shared = window.ProtocolAuth.getClient();
      if (shared) return shared;
    }

    if (window.__protocolPublicShippingClient) return window.__protocolPublicShippingClient;

    const config = cfg();
    const key = config && (config.anonKey || config.publishableKey || config.key);

    if (!window.supabase || !config || !config.url || !key) {
      throw new Error('Supabase no configurado para logística pública');
    }

    window.__protocolPublicShippingClient = window.supabase.createClient(config.url, key);
    return window.__protocolPublicShippingClient;
  }

  function getSessionId() {
    try {
      const existing = window.localStorage.getItem(DEFAULT_SESSION_KEY);
      if (existing) return existing;

      const generated = 'alp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(DEFAULT_SESSION_KEY, generated);
      return generated;
    } catch (error) {
      return 'alp_session_unavailable';
    }
  }

  function normalizePostalCode(value) {
    return String(value || '').trim().toUpperCase();
  }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i += 1) {
      if (arguments[i] !== undefined && arguments[i] !== null && arguments[i] !== '') return arguments[i];
    }
    return null;
  }

  function toNumber(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;

    if (typeof value === 'string') {
      const cleaned = value.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const parsedCleaned = Number(cleaned);
      if (Number.isFinite(parsedCleaned)) return parsedCleaned;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readShippingCost(raw) {
    const value = firstDefined(
      raw.shipping_price,
      raw.shippingPrice,
      raw.shipping_cost,
      raw.shippingCost,
      raw.envio_valor,
      raw.delivery_cost,
      raw.deliveryCost,
      raw.price,
      raw.cost
    );

    return toNumber(value, null);
  }

  function isFreeShipping(raw, shippingCost) {
    const mode = String(raw.shipping_mode || raw.shippingMode || '').toLowerCase();
    const label = String(raw.shipping_label || raw.shippingLabel || raw.envio || '').toLowerCase();
    const status = String(raw.shipping_status || raw.shippingStatus || raw.envio_estado || '').toLowerCase();

    if (raw.is_free === true || raw.isFree === true) return true;
    if (mode === 'free' || label.includes('gratis') || status.includes('gratis')) return true;
    if (mode === 'paid' || mode === 'pago' || label.includes('$') || status.includes('paid') || status.includes('pago')) return false;
    if (shippingCost !== null) return shippingCost === 0;

    return false;
  }

  function normalizeLookupResponse(raw, requestedPostalCode) {
    const source = raw || {};
    const status = String(source.status || '').toLowerCase();
    const ok = status === 'ok' || source.ok === true;
    const postalCode = normalizePostalCode(source.postal_code || source.postalCode || requestedPostalCode);
    const shippingCost = readShippingCost(source);
    const isFree = ok ? isFreeShipping(source, shippingCost) : false;
    const promise = source.promise_label || source.promise || source.public_message || source.publicMessage || source.publicText || source.estimatedText || source.deliveryText || source.message || '';
    const minDays = source.min_delivery_days ?? source.minDeliveryDays ?? source.min_days ?? source.minDays ?? source.minimum_days ?? null;
    const maxDays = source.max_delivery_days ?? source.maxDeliveryDays ?? source.max_days ?? source.maxDays ?? source.maximum_days ?? null;
    const ruleId = source.applied_rule_id || source.appliedRuleId || source.rule_id || source.ruleId || null;
    const exceptionId = source.applied_exception_id || source.appliedExceptionId || source.exception_id || null;
    const shippingLabel = isFree ? 'Envío gratis' : 'ENVIO RASTREABLE';

    if (!ok) {
      return {
        ok: false,
        status: status || 'invalid',
        postalCode,
        isFree: false,
        shippingCost: null,
        shippingLabel: 'ENVIO RASTREABLE',
        promise: promise || 'Ingresá un código postal válido',
        minDays,
        maxDays,
        ruleId,
        exceptionId,
        locality: source.locality || source.localidad || null,
        province: source.province || source.provincia || null,
        zoneId: source.zone_id || source.zoneId || null,
        timeWindow: source.time_band || source.timeBand || source.time_window || source.timeWindow || source.banda_horaria || null,
        banner: source.banner_id || source.bannerId || null,
        shippingAvailable: source.shipping_available ?? source.shippingAvailable ?? false,
        candidatesCount: toNumber(source.candidates_count || source.candidatesCount, 0),
        raw: source,
        source: 'protocol_data'
      };
    }

    return {
      ok: true,
      status: 'ok',
      postalCode,
      isFree,
      shippingCost: shippingCost === null ? 0 : shippingCost,
      shippingLabel,
      promise: promise || (isFree ? 'Llega mañana' : 'Llega con envío rastreable'),
      minDays,
      maxDays,
      ruleId,
      exceptionId,
      locality: source.locality || source.localidad || null,
      province: source.province || source.provincia || null,
      zoneId: source.zone_id || source.zoneId || null,
      timeWindow: source.time_band || source.timeBand || source.time_window || source.timeWindow || source.banda_horaria || null,
      banner: source.banner_id || source.bannerId || null,
      shippingAvailable: source.shipping_available ?? source.shippingAvailable ?? true,
      badges: Array.isArray(source.badges) ? source.badges : [],
      candidatesCount: toNumber(source.candidates_count || source.candidatesCount, 0),
      raw: source,
      source: 'protocol_data'
    };
  }

  async function resolveByPostalCode(postalCode, options) {
    const normalizedPostalCode = normalizePostalCode(postalCode);

    if (!normalizedPostalCode) {
      return normalizeLookupResponse({
        status: 'invalid',
        message: 'Ingresá un código postal válido'
      }, postalCode);
    }

    const client = getClient();
    const args = {
      input_postal_code: normalizedPostalCode,
      input_source_page: (options && options.sourcePage) || DEFAULT_SOURCE_PAGE,
      input_customer_session_id: (options && options.customerSessionId) || getSessionId()
    };

    const response = await client.rpc('resolve_shipping_lookup', args);

    if (response.error) throw response.error;

    return normalizeLookupResponse(response.data, normalizedPostalCode);
  }

  async function resolveAndDispatch(postalCode, options) {
    const result = await resolveByPostalCode(postalCode, options || {});

    window.dispatchEvent(new CustomEvent('alpaso:shipping:updated', { detail: result }));
    window.dispatchEvent(new CustomEvent('protocol:shipping:lookup-resolved', { detail: result }));

    return result;
  }

  window.ProtocolLogisticaPublicShipping = {
    resolveByPostalCode,
    resolveAndDispatch,
    normalizeLookupResponse,
    normalizePostalCode
  };
})();
