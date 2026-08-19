import { getCreatorPaymentAccounts } from '../payments/api.js';
import { isDemoMode, signOut } from '../api-client.js';
import { requirePortalAccess } from '../route-guard.js';

const context = await requirePortalAccess();
const state = {
  context,
  accounts: [],
};

const els = {
  loading: document.querySelector('[data-loading-state]'),
  view: document.querySelector('[data-account-view]'),
  identity: document.querySelector('[data-identity-card]'),
  access: document.querySelector('[data-access-card]'),
  legal: document.querySelector('[data-legal-list]'),
  accounts: document.querySelector('[data-payment-account-list]'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeDocumentHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return raw;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function statusLabel(value) {
  return ({
    active: 'Activo', invited: 'Activación pendiente', restricted: 'Restringido',
    suspended: 'Suspendido', closed: 'Cerrado', pending: 'Pendiente', inactive: 'Inactiva',
  })[value] || String(value || '—');
}

function providerLabel(value) {
  return ({ mercado_pago: 'Mercado Pago', bank_transfer: 'Banco / billetera' })[value]
    || String(value || 'Cuenta de cobro').replaceAll('_', ' ');
}

function shortId(value) {
  const clean = String(value || '').replaceAll('-', '');
  return clean ? clean.slice(0, 10).toUpperCase() : '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function destinationLabel(account) {
  const alias = String(account?.alias || '').trim();
  const last4 = String(account?.account_identifier_last4 || '').trim();
  if (alias && last4) return `${alias} · •••• ${last4}`;
  if (alias) return alias;
  if (last4) return `•••• ${last4}`;
  return 'Identificador enmascarado';
}

function relationships() {
  return Array.isArray(state.context?.onboarding?.relationships) ? state.context.onboarding.relationships : [];
}

function demoRelationships() {
  const docs = [
    { legal_document_id: '10000000-0000-4000-8000-000000000001', document_type: 'creator_terms', document_version: '1.0', title: 'Términos para Creators', document_hash: 'a'.repeat(64), content_ref: '#demo-creator-terms' },
    { legal_document_id: '10000000-0000-4000-8000-000000000002', document_type: 'content_rights', document_version: '1.0', title: 'Condiciones de propiedad y adquisición', document_hash: 'b'.repeat(64), content_ref: '#demo-content-rights' },
  ];
  return [{
    workspace_id: 'protocol-demo', workspace_creator_id: '20000000-0000-4000-8000-000000000001', status: 'active', activated_at: '2026-08-19T10:00:00-03:00',
    latest_invitation: { invitation_id: '30000000-0000-4000-8000-000000000001', status: 'accepted', required_legal_documents: docs, accepted_legal_document_ids: docs.map((doc) => doc.legal_document_id) },
  }];
}

function effectiveRelationships() {
  const rows = relationships();
  return isDemoMode() && (!rows.length || !rows[0]?.latest_invitation) ? demoRelationships() : rows;
}

function renderIdentity() {
  const onboarding = state.context?.onboarding || {};
  const session = state.context?.session || {};
  const name = onboarding.display_name || 'Creator';
  const email = session.user?.email || '—';
  document.querySelectorAll('[data-creator-name]').forEach((node) => { node.textContent = name; });
  document.querySelectorAll('[data-creator-avatar]').forEach((node) => { node.textContent = String(name).slice(0, 1).toUpperCase(); });

  els.identity.innerHTML = `
    <div class="pci-account-card__top">
      <div class="pci-account-identity">
        <span class="pci-account-avatar" aria-hidden="true">${escapeHtml(String(name).slice(0, 1).toUpperCase())}</span>
        <div><h2>${escapeHtml(name)}</h2><p>${escapeHtml(email)}</p></div>
      </div>
      <span class="pci-account-status">● ${escapeHtml(statusLabel(onboarding.creator_status))}</span>
    </div>
    <div class="pci-account-details">
      <div class="pci-account-detail"><span>Creator ID</span><strong>#${escapeHtml(shortId(onboarding.creator_id))}</strong></div>
      <div class="pci-account-detail"><span>Identidad Auth</span><strong>Supabase Auth</strong></div>
      <div class="pci-account-detail"><span>Perfil</span><strong>${escapeHtml(statusLabel(onboarding.creator_status))}</strong></div>
      <div class="pci-account-detail"><span>Correo autenticado</span><strong>${escapeHtml(email)}</strong></div>
    </div>`;
}

function renderAccess() {
  const rows = effectiveRelationships();
  const active = rows.filter((row) => row?.status === 'active');
  els.access.innerHTML = `
    <div class="pci-account-card__top"><div><p class="pci-eyebrow">ACCESO</p><h2>Relación con Protocol</h2></div><span class="pci-account-status">${active.length} activa${active.length === 1 ? '' : 's'}</span></div>
    <div class="pci-account-access-list">
      ${rows.map((row) => `<div class="pci-account-access-row"><span>${escapeHtml(row.workspace_id === 'protocol-demo' ? 'Protocol' : row.workspace_id)}</span><strong>${escapeHtml(statusLabel(row.status))}${row.activated_at ? ` · ${escapeHtml(formatDate(row.activated_at))}` : ''}</strong></div>`).join('') || '<div class="pci-account-empty">No encontramos relaciones de workspace.</div>'}
    </div>`;
}

function legalRows() {
  const result = [];
  effectiveRelationships().forEach((relationship) => {
    const invitation = relationship?.latest_invitation;
    const required = Array.isArray(invitation?.required_legal_documents) ? invitation.required_legal_documents : [];
    const accepted = new Set(Array.isArray(invitation?.accepted_legal_document_ids) ? invitation.accepted_legal_document_ids : []);
    required.forEach((doc) => result.push({ ...doc, workspace_id: relationship.workspace_id, accepted: accepted.has(doc.legal_document_id) }));
  });
  return result;
}

function renderLegal() {
  const rows = legalRows();
  if (!rows.length) {
    els.legal.innerHTML = '<div class="pci-account-empty">Todavía no hay documentos legales asociados a esta relación.</div>';
    return;
  }
  els.legal.innerHTML = rows.map((doc) => {
    const href = safeDocumentHref(doc.content_ref);
    return `<article class="pci-account-list-row">
      <div><h3>${escapeHtml(doc.title || doc.document_type || 'Documento')}</h3><p>Versión ${escapeHtml(doc.document_version || '—')} · ${escapeHtml(String(doc.document_hash || '').slice(0, 12))}…</p></div>
      <div class="pci-account-list-row__meta">${escapeHtml(doc.workspace_id === 'protocol-demo' ? 'Protocol' : doc.workspace_id || '')}</div>
      <div>${doc.accepted ? '<span class="pci-account-list-row__state">Aceptado</span>' : '<span class="pci-account-list-row__state is-inactive">Pendiente</span>'}${href ? ` <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Ver</a>` : ''}</div>
    </article>`;
  }).join('');
}

function renderPaymentAccounts() {
  if (!state.accounts.length) {
    els.accounts.innerHTML = '<div class="pci-account-empty">No agregaste cuentas de cobro. Podés hacerlo desde Pagos cuando tengas una obligación pendiente.</div>';
    return;
  }
  els.accounts.innerHTML = state.accounts.map((account) => `<article class="pci-account-list-row">
    <div><h3>${escapeHtml(providerLabel(account.provider))} · ${escapeHtml(account.holder_name || 'Titular')}</h3><p>${escapeHtml(destinationLabel(account))}</p></div>
    <div class="pci-account-list-row__meta">Creada ${escapeHtml(formatDate(account.created_at))}</div>
    <span class="pci-account-list-row__state${account.status === 'active' ? '' : ' is-inactive'}">${escapeHtml(statusLabel(account.status))}</span>
  </article>`).join('');
}

function bindDrawer() {
  const drawer = document.querySelector('[data-mobile-drawer]');
  const open = document.querySelector('[data-mobile-menu]');
  if (!drawer || !open) return;
  const setOpen = (value) => {
    drawer.classList.toggle('is-open', value);
    drawer.setAttribute('aria-hidden', value ? 'false' : 'true');
    document.body.style.overflow = value ? 'hidden' : '';
  };
  open.addEventListener('click', () => setOpen(true));
  drawer.querySelectorAll('[data-mobile-menu-close]').forEach((button) => button.addEventListener('click', () => setOpen(false)));
  drawer.querySelectorAll('a').forEach((anchor) => anchor.addEventListener('click', () => setOpen(false)));
}

function bindActions() {
  document.querySelector('[data-account-scroll-top]')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.querySelector('[data-sign-out]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Cerrando sesión…';
    await signOut().catch(() => {});
    window.location.replace(new URL('../auth/accept-invitation/', window.location.href).toString());
  });
}

function focusRequestedSection() {
  const section = new URL(window.location.href).searchParams.get('section');
  if (section !== 'support') return;
  const target = document.querySelector('[data-support-section]');
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

async function boot() {
  bindDrawer();
  bindActions();
  try {
    const response = isDemoMode() ? { items: [
      { payment_account_id: 'a1111111-1111-4111-8111-111111111111', provider: 'mercado_pago', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821', status: 'active', created_at: '2026-08-18T18:00:00-03:00' },
    ] } : await getCreatorPaymentAccounts();
    state.accounts = Array.isArray(response?.items) ? response.items : [];
    renderIdentity();
    renderAccess();
    renderLegal();
    renderPaymentAccounts();
    els.loading.hidden = true;
    els.view.hidden = false;
    focusRequestedSection();
  } catch (error) {
    els.loading.innerHTML = '<div class="pci-account-empty"><strong>No pudimos cargar la cuenta.</strong><span>Reintentá en unos instantes.</span></div>';
  }
}

boot();
