import { getCreatorPayables, isDemoMode } from './api-client.js';

function itemsOf(payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
}

function formatMoney(value, currency = 'ARS') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
  }
}

function authoritativeReceivable(payables) {
  const totals = new Map();
  payables.forEach((payable) => {
    if (['paid', 'voided'].includes(payable?.status)) return;
    const currency = String(payable?.currency || 'ARS');
    const fallback = Math.max(Number(payable?.amount_due) || 0, 0);
    const unpaid = Number.isFinite(Number(payable?.unpaid_amount))
      ? Math.max(Number(payable.unpaid_amount), 0)
      : fallback;
    if (unpaid <= 0) return;
    totals.set(currency, (totals.get(currency) || 0) + unpaid);
  });

  const values = [...totals.entries()];
  if (!values.length) return formatMoney(0, 'ARS');
  if (values.length > 1) return 'Ver pagos';
  return formatMoney(values[0][1], values[0][0]);
}

async function hydrateAuthoritativeReceivable() {
  if (isDemoMode()) return;
  const metric = document.querySelector('[data-metric="receivable"]');
  if (!metric) return;

  try {
    const response = await getCreatorPayables();
    const value = authoritativeReceivable(itemsOf(response));
    const apply = () => {
      if (metric.textContent !== value) metric.textContent = value;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(metric, { childList: true, characterData: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  } catch (error) {
    console.warn('[PCI Creator Portal] authoritative receivable unavailable', {
      code: error?.message || 'unknown_error',
    });
  }
}

hydrateAuthoritativeReceivable();
