import { getCreatorDashboardSnapshot, isDemoMode } from './api-client.js';

const demoState = {
  creator: { firstName: 'Tomás', notifications: 3 },
  metrics: {
    openOpportunities: 4,
    inReview: 2,
    changesRequested: 1,
    receivable: 85000,
    currency: 'ARS',
    receivableDisplay: null,
  },
  attention: [
    {
      id: 'submission-changes-1', type: 'changes_requested', badge: 'CAMBIOS SOLICITADOS', badgeTone: 'purple',
      title: 'Pelota interactiva para gatos', description: 'Protocol solicitó una nueva versión de tu video.',
      meta: 'V1 enviada · 18 ago 2026', action: 'Ver detalles', mediaLabel: 'Mascotas · UGC',
      mediaAccent: '#db2d35', mediaA: '#5e452f', mediaB: '#1e2024',
    },
    {
      id: 'offer-1042', type: 'offer', badge: 'OFERTA PENDIENTE', badgeTone: 'amber',
      title: 'Oferta por creativo #PCI-1042', description: 'Protocol ofrece $45.000 por tu versión V2.',
      meta: 'Vence mañana · 20/08/2026', metaDanger: true, action: 'Revisar oferta', mediaLabel: 'Demostración',
      mediaAccent: '#b7a6e8', mediaA: '#eee8df', mediaB: '#3b3535',
    },
  ],
  opportunities: [
    { id: 'opp-ugc-pets', title: 'Video UGC · Mascotas', price: 30000, currency: 'ARS', slots: 2, mediaLabel: 'Mascotas', mediaAccent: '#ef3945', mediaA: '#7c4434', mediaB: '#251a18' },
    { id: 'opp-demo', title: 'Demostración Producto', price: 45000, currency: 'ARS', slots: 1, mediaLabel: 'Producto', mediaAccent: '#f0e5d2', mediaA: '#80634e', mediaB: '#2f251f' },
    { id: 'opp-unboxing', title: 'Unboxing + Reseña', price: 40000, currency: 'ARS', slots: 3, mediaLabel: 'Reseña', mediaAccent: '#48545d', mediaA: '#c9c8c5', mediaB: '#26282b' },
    { id: 'opp-context', title: 'Uso en Contexto', price: 35000, currency: 'ARS', slots: 2, mediaLabel: 'Contexto', mediaAccent: '#272b2e', mediaA: '#866d59', mediaB: '#292320' },
  ],
};

let state = structuredClone(demoState);

const palettes = [
  ['#ef3945', '#7c4434', '#251a18'],
  ['#f0e5d2', '#80634e', '#2f251f'],
  ['#48545d', '#c9c8c5', '#26282b'],
  ['#272b2e', '#866d59', '#292320'],
  ['#4e7bff', '#253e63', '#171b25'],
];

function formatMoney(value, currency = 'ARS') {
  if (!Number.isFinite(Number(value))) return '—';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${currency || ''} ${Number(value).toLocaleString('es-AR')}`.trim();
  }
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function itemsOf(payload) {
  return Array.isArray(payload?.items) ? payload.items : [];
}

function firstNameOf(displayName) {
  return String(displayName || '').trim().split(/\s+/)[0] || 'Creator';
}

function shortId(value) {
  return String(value || '').replaceAll('-', '').slice(0, 8).toUpperCase() || 'PCI';
}

function opportunityFromApi(item, index) {
  const revision = item?.revision ?? {};
  const subject = revision?.subject_snapshot ?? {};
  const palette = palettes[index % palettes.length];
  return {
    id: item.consignment_id,
    title: revision.title || subject.product_name || subject.name || 'Nueva oportunidad creativa',
    price: Number(revision.base_price_amount || 0),
    currency: revision.currency || 'ARS',
    slots: Number(revision.slots_available || 0),
    mediaLabel: subject.product_name || subject.name || revision.subject_type || 'Oportunidad',
    mediaAccent: palette[0], mediaA: palette[1], mediaB: palette[2],
  };
}

function changesAttention(submission, index) {
  const version = submission?.current_version ?? {};
  const palette = palettes[index % palettes.length];
  return {
    id: submission.submission_id,
    type: 'changes_requested',
    badge: 'CAMBIOS SOLICITADOS',
    badgeTone: 'purple',
    title: submission.concept_label || 'Tu entrega necesita cambios',
    description: 'Protocol solicitó una nueva versión de tu creativo.',
    meta: version.version_number ? `V${version.version_number} · requiere nueva versión` : 'Requiere una nueva versión',
    action: 'Ver detalles',
    mediaLabel: submission.concept_label || 'Entrega',
    mediaAccent: palette[0], mediaA: palette[1], mediaB: palette[2],
  };
}

function offerAttention(negotiation, index) {
  const offer = negotiation.live_offer ?? {};
  const palette = palettes[(index + 1) % palettes.length];
  const expiry = formatDate(offer.expires_at);
  return {
    id: offer.offer_id || negotiation.negotiation_id,
    type: 'offer',
    badge: 'OFERTA PENDIENTE',
    badgeTone: 'amber',
    title: `Oferta por creativo #${shortId(offer.offer_id)}`,
    description: `Protocol ofrece ${formatMoney(offer.total_amount, offer.currency)} por tu creativo.`,
    meta: expiry ? `Vence · ${expiry}` : 'Oferta pendiente de respuesta',
    metaDanger: Boolean(expiry),
    action: 'Revisar oferta',
    mediaLabel: negotiation?.submission?.concept_label || 'Oferta',
    mediaAccent: palette[0], mediaA: palette[1], mediaB: palette[2],
  };
}

function payableAttention(payable, index) {
  const palette = palettes[(index + 2) % palettes.length];
  return {
    id: payable.payable_id,
    type: 'payment_confirmation',
    badge: 'CONFIRMÁ TU COBRO',
    badgeTone: 'green',
    title: `Tenés ${formatMoney(payable.amount_due, payable.currency)} por cobrar`,
    description: 'Elegí o confirmá la cuenta donde querés recibir este pago.',
    meta: 'Tu confirmación es necesaria para que Protocol pueda transferir.',
    action: 'Ir a pagos',
    mediaLabel: 'Pago',
    mediaAccent: palette[0], mediaA: palette[1], mediaB: palette[2],
  };
}

function stateFromSnapshot(snapshot) {
  const opportunities = itemsOf(snapshot?.opportunities);
  const submissions = itemsOf(snapshot?.submissions);
  const negotiations = itemsOf(snapshot?.negotiations);
  const payables = itemsOf(snapshot?.payables);

  const changes = submissions.filter((item) => item?.status === 'changes_requested');
  const inReview = submissions.filter((item) => ['submitted', 'under_review'].includes(item?.status));
  const liveWorkspaceOffers = negotiations.filter((item) => item?.live_offer?.status === 'sent' && item?.live_offer?.proposed_by_type === 'workspace');
  const confirmationNeeded = payables.filter((item) => item?.status === 'awaiting_confirmation');
  const outstanding = payables.filter((item) => !['paid', 'cancelled'].includes(item?.status));
  const currencies = [...new Set(outstanding.map((item) => item?.currency).filter(Boolean))];
  const receivable = outstanding.reduce((sum, item) => sum + (Number(item?.amount_due) || 0), 0);
  const attention = [
    ...changes.map(changesAttention),
    ...liveWorkspaceOffers.map(offerAttention),
    ...confirmationNeeded.map(payableAttention),
  ];

  return {
    creator: {
      firstName: firstNameOf(snapshot?.identity?.display_name),
      notifications: attention.length,
    },
    metrics: {
      openOpportunities: opportunities.length,
      inReview: inReview.length,
      changesRequested: changes.length,
      receivable,
      currency: currencies.length === 1 ? currencies[0] : 'ARS',
      receivableDisplay: currencies.length > 1 ? 'Ver pagos' : null,
    },
    attention,
    opportunities: opportunities.map(opportunityFromApi),
  };
}

function renderCreator() {
  document.querySelectorAll('[data-creator-first-name]').forEach((el) => { el.textContent = state.creator.firstName; });
  document.querySelectorAll('[data-notification-count]').forEach((el) => {
    el.textContent = String(state.creator.notifications);
    el.hidden = state.creator.notifications <= 0;
  });
  document.querySelectorAll('.pci-profile-chip__copy strong').forEach((el) => { el.textContent = state.creator.firstName; });
  document.querySelectorAll('.pci-avatar').forEach((el) => { if (el.textContent.trim().length <= 1) el.textContent = state.creator.firstName.slice(0, 1).toUpperCase(); });
}

function renderMetrics() {
  const values = {
    'open-opportunities': state.metrics.openOpportunities,
    'in-review': state.metrics.inReview,
    'changes-requested': state.metrics.changesRequested,
    receivable: state.metrics.receivableDisplay || formatMoney(state.metrics.receivable, state.metrics.currency),
  };
  Object.entries(values).forEach(([name, value]) => {
    const el = document.querySelector(`[data-metric="${name}"]`);
    if (el) el.textContent = String(value);
  });
}

function renderAttention() {
  const root = document.querySelector('[data-attention-list]');
  if (!root) return;
  if (!state.attention.length) {
    root.innerHTML = '<div class="pci-empty-state"><strong>No tenés acciones pendientes</strong><span>Cuando Protocol pida cambios, envíe una oferta o necesite un dato de cobro, va a aparecer acá.</span></div>';
  } else {
    root.innerHTML = state.attention.map((item) => `
      <article class="pci-attention-card" data-attention-id="${escapeHtml(item.id)}">
        <div class="pci-attention-card__media" data-media-label="${escapeHtml(item.mediaLabel)}" style="--demo-accent:${escapeHtml(item.mediaAccent)};--demo-bg-a:${escapeHtml(item.mediaA)};--demo-bg-b:${escapeHtml(item.mediaB)}" aria-hidden="true"></div>
        <div class="pci-attention-card__body">
          <span class="pci-badge pci-badge--${escapeHtml(item.badgeTone)}">${escapeHtml(item.badge)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <span class="pci-attention-card__meta${item.metaDanger ? ' is-danger' : ''}">${escapeHtml(item.meta)}</span>
        </div>
        <div class="pci-attention-card__action">
          <button class="pci-secondary-button" type="button" data-portal-action="${escapeHtml(item.id)}" data-portal-action-type="${escapeHtml(item.type)}">${escapeHtml(item.action)}</button>
          <span class="pci-card-arrow" aria-hidden="true">›</span>
        </div>
      </article>
    `).join('');
  }
  const count = document.querySelector('[data-attention-count]');
  if (count) count.textContent = `(${state.attention.length})`;
}

function renderOpportunities() {
  const root = document.querySelector('[data-opportunities]');
  if (!root) return;
  if (!state.opportunities.length) {
    root.innerHTML = '<div class="pci-empty-state pci-empty-state--opportunities"><strong>No hay oportunidades abiertas por ahora</strong><span>Cuando Protocol publique un brief compatible con tu cuenta, va a aparecer acá.</span></div>';
    return;
  }
  root.innerHTML = state.opportunities.map((item) => `
    <article class="pci-opportunity-card" data-opportunity-id="${escapeHtml(item.id)}">
      <div class="pci-opportunity-card__media" data-media-label="${escapeHtml(item.mediaLabel)}" style="--demo-accent:${escapeHtml(item.mediaAccent)};--demo-bg-a:${escapeHtml(item.mediaA)};--demo-bg-b:${escapeHtml(item.mediaB)}" aria-hidden="true"></div>
      <div class="pci-opportunity-card__body">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="pci-opportunity-card__price">${escapeHtml(formatMoney(item.price, item.currency))}<small>por activo</small></span>
        <span class="pci-opportunity-card__slots">${item.slots} ${item.slots === 1 ? 'lugar disponible' : 'lugares disponibles'}</span>
        <button class="pci-opportunity-card__button" type="button" data-portal-action="${escapeHtml(item.id)}" data-portal-action-type="opportunity">Ver brief</button>
      </div>
    </article>
  `).join('');
}

function renderAll() {
  renderCreator();
  renderMetrics();
  renderAttention();
  renderOpportunities();
}

function bindNavigation() {
  const navItems = [...document.querySelectorAll('[data-nav]')];
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-nav');
      navItems.forEach((candidate) => candidate.classList.toggle('is-active', candidate.getAttribute('data-nav') === target));
    });
  });
}

function bindMobileDrawer() {
  const drawer = document.querySelector('[data-mobile-drawer]');
  const openButton = document.querySelector('[data-mobile-menu]');
  const closeButtons = [...document.querySelectorAll('[data-mobile-menu-close]')];
  if (!drawer || !openButton) return;
  const setOpen = (open) => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  openButton.addEventListener('click', () => setOpen(true));
  closeButtons.forEach((button) => button.addEventListener('click', () => setOpen(false)));
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });
}

function bindPortalActions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-portal-action]');
    if (!target) return;
    const id = target.getAttribute('data-portal-action');
    const type = target.getAttribute('data-portal-action-type');
    console.info('[PCI Creator Portal] navigation target selected', { id, type });
  });
}

async function hydrateLiveDashboard() {
  if (isDemoMode()) return;
  try {
    const snapshot = await getCreatorDashboardSnapshot();
    state = stateFromSnapshot(snapshot);
    renderAll();
  } catch (error) {
    console.error('[PCI Creator Portal] live dashboard unavailable; preserving local fallback', {
      code: error?.message || 'unknown_error',
      status: error?.status || null,
    });
  }
}

async function boot() {
  renderAll();
  bindNavigation();
  bindMobileDrawer();
  bindPortalActions();
  await hydrateLiveDashboard();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
