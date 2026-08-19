import {
  createCreatorSubmission,
  getCreatorOpportunities,
  getOnboardingState,
  getSession,
  isDemoMode,
  joinCreatorOpportunity,
} from '../api-client.js';

const demoOpportunities = [
  {
    consignment_id: '11111111-1111-4111-8111-111111111111',
    workspace_id: 'protocol-demo',
    visibility: 'open',
    status: 'open',
    published_at: '2026-08-18T12:00:00-03:00',
    closes_at: '2026-08-25T23:59:00-03:00',
    participation: null,
    revision: {
      consignment_revision_id: '21111111-1111-4111-8111-111111111111',
      revision_number: 1,
      title: 'Video UGC · Pelota interactiva para gatos',
      summary: 'Mostrá de forma natural cómo la pelota convierte un momento de aburrimiento en juego. Buscamos una pieza que se sienta casera, espontánea y fácil de entender.',
      objective: 'Comunicar que el producto ayuda a estimular al gato sin que el dueño tenga que participar todo el tiempo.',
      creative_angle: 'Tu gato no es malo. Está aburrido. La pieza debe arrancar desde ese problema y mostrar la pelota como una salida rápida y entretenida.',
      hook_guidance: 'Primeros 2–3 segundos: una escena reconocible de aburrimiento o travesura. Evitar introducciones de marca y saludos largos.',
      format_requirements: {
        formato: 'Video vertical 9:16',
        duracion: '20–35 segundos',
        resolucion_minima: '1080 × 1920',
        audio: 'Voz clara + sonido ambiente natural',
        archivo_final: 'MP4 o MOV',
      },
      acceptance_criteria: {
        producto_visible: 'La pelota debe verse con claridad en uso.',
        naturalidad: 'La escena debe sentirse real; evitar estética de publicidad demasiado producida.',
        demostracion: 'Debe existir al menos una secuencia donde el gato interactúe con el producto.',
        texto: 'Sin afirmaciones médicas ni promesas que no estén en el brief.',
      },
      subject_type: 'product',
      subject_ref: 'ALP-PEL-GATOS-001',
      subject_snapshot: { product_name: 'Pelota interactiva para gatos', category: 'Mascotas' },
      base_price_amount: 30000,
      currency: 'ARS',
      slots_available: 2,
      performance_bonus_policy: { aplica: true, descripcion: 'Puede existir un bono adicional si Protocol activa esta pieza y alcanza los criterios de performance publicados para la campaña.' },
      pre_purchase_revision_limit: 1,
      rights_package_snapshot: {
        uso_comercial: 'Protocol obtiene uso comercial únicamente después del pago confirmado.',
        version: 'Los derechos aplican solo sobre la versión exacta adquirida.',
        autor: 'La autoría permanece atribuida al Creator.',
      },
    },
  },
  {
    consignment_id: '12222222-2222-4222-8222-222222222222',
    workspace_id: 'protocol-demo',
    visibility: 'open',
    status: 'open',
    published_at: '2026-08-18T13:00:00-03:00',
    closes_at: '2026-08-24T20:00:00-03:00',
    participation: { participation_id: '32222222-2222-4222-8222-222222222222', status: 'active', joined_at: '2026-08-19T09:30:00-03:00' },
    revision: {
      consignment_revision_id: '22222222-2222-4222-8222-222222222222',
      revision_number: 1,
      title: 'Demostración · Producto de cuidado personal',
      summary: 'Una demostración corta y clara donde el producto se entienda sin sobreexplicar.',
      objective: 'Mostrar facilidad de uso y resultado visual inmediato.',
      creative_angle: 'De la duda al resultado en una sola secuencia.',
      hook_guidance: 'Abrir con el producto ya en mano y una pregunta simple sobre su uso.',
      format_requirements: { formato: '9:16', duracion: '15–25 segundos', archivo_final: 'MP4 o MOV' },
      acceptance_criteria: { producto_visible: 'Sí', buena_luz: 'Rostro/manos y producto deben verse claramente.', resultado: 'Mostrar el resultado final sin filtros agresivos.' },
      subject_type: 'product',
      subject_ref: 'DEMO-002',
      subject_snapshot: { product_name: 'Producto de cuidado personal', category: 'Belleza' },
      base_price_amount: 45000,
      currency: 'ARS',
      slots_available: 1,
      performance_bonus_policy: {},
      pre_purchase_revision_limit: 1,
      rights_package_snapshot: { uso_comercial: 'Se activa solo después del pago.', version_exacta: true },
    },
  },
  {
    consignment_id: '13333333-3333-4333-8333-333333333333',
    workspace_id: 'protocol-demo',
    visibility: 'invite_only',
    status: 'open',
    published_at: '2026-08-19T08:00:00-03:00',
    closes_at: '2026-08-23T20:00:00-03:00',
    participation: { participation_id: '33333333-3333-4333-8333-333333333333', status: 'invited', joined_at: null },
    revision: {
      consignment_revision_id: '23333333-3333-4333-8333-333333333333',
      revision_number: 1,
      title: 'Invitación · Unboxing + reseña corta',
      summary: 'Protocol te invitó específicamente a producir una variante de unboxing con tono casual.',
      objective: 'Capturar primera impresión y facilidad de puesta en marcha.',
      creative_angle: 'Lo abrí y en menos de un minuto ya lo estaba usando.',
      hook_guidance: 'Primer plano de la caja + reacción breve y natural.',
      format_requirements: { formato: '9:16', duracion: '25–40 segundos', audio: 'Voz propia', archivo_final: 'MP4 o MOV' },
      acceptance_criteria: { unboxing_real: 'La apertura debe ocurrir en cámara.', producto_en_uso: 'Mostrar una escena de uso.', tono: 'Conversacional, no lectura de guion.' },
      subject_type: 'product',
      subject_ref: 'DIRECT-003',
      subject_snapshot: { product_name: 'Accesorio tecnológico', category: 'Tecnología' },
      base_price_amount: 40000,
      currency: 'ARS',
      slots_available: 1,
      performance_bonus_policy: { aplica: false },
      pre_purchase_revision_limit: 1,
      rights_package_snapshot: { uso_comercial: 'Solo si Protocol compra y paga la versión seleccionada.' },
    },
  },
];

const palettes = [
  ['#ef3945', '#714237', '#211918'],
  ['#d7c4ee', '#6b574a', '#211d1b'],
  ['#4e7bff', '#374a5f', '#171b25'],
  ['#55cf8b', '#2e5543', '#141b18'],
  ['#ffad32', '#665034', '#211b14'],
];

const state = {
  opportunities: [],
  filtered: [],
  selectedId: null,
  filter: 'all',
  search: '',
  creatorName: 'Tomás',
  createdSubmissions: new Map(),
  busy: false,
};

const els = {
  loading: document.querySelector('[data-loading-state]'),
  listView: document.querySelector('[data-list-view]'),
  detailView: document.querySelector('[data-detail-view]'),
  grid: document.querySelector('[data-opportunity-grid]'),
  empty: document.querySelector('[data-opportunity-empty]'),
  count: document.querySelector('[data-opportunity-count]'),
  search: document.querySelector('[data-opportunity-search]'),
  briefMain: document.querySelector('[data-brief-main]'),
  briefAction: document.querySelector('[data-brief-action]'),
  toast: document.querySelector('[data-toast]'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(value, currency = 'ARS') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency || ''} ${amount.toLocaleString('es-AR')}`.trim();
  }
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Sin fecha definida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha definida';
  const options = includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('es-AR', options).format(date);
}

function humanizeKey(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueToText(value) {
  if (value == null || value === '') return 'No especificado';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map(valueToText).join(' · ');
  if (typeof value === 'object') return Object.entries(value).map(([key, child]) => `${humanizeKey(key)}: ${valueToText(child)}`).join(' · ');
  return String(value);
}

function structuredRows(value) {
  const entries = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  if (!entries.length) return '<p>No se especificaron condiciones adicionales para este punto.</p>';
  return `<div class="pci-structured-list">${entries.map(([key, child]) => `
    <div class="pci-structured-row">
      <span class="pci-structured-row__key">${escapeHtml(humanizeKey(key))}</span>
      <span class="pci-structured-row__value">${escapeHtml(valueToText(child))}</span>
    </div>
  `).join('')}</div>`;
}

function paletteFor(item, index = 0) {
  const id = String(item?.consignment_id || '');
  const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), index);
  return palettes[seed % palettes.length];
}

function opportunityStatus(item) {
  const participation = item?.participation?.status;
  if (participation === 'active') return { key: 'active', label: 'Participando' };
  if (participation === 'invited') return { key: 'invited', label: 'Invitación para vos' };
  return { key: 'available', label: 'Disponible' };
}

function subjectName(item) {
  const revision = item?.revision ?? {};
  const subject = revision?.subject_snapshot ?? {};
  return subject.product_name || subject.name || subject.title || humanizeKey(revision.subject_type || 'Brief creativo');
}

function formatTargetAssets(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 'A definir';
  return `${count} ${count === 1 ? 'activo' : 'activos'}`;
}

function filterOpportunities() {
  const query = state.search.toLocaleLowerCase('es');
  state.filtered = state.opportunities.filter((item) => {
    const status = opportunityStatus(item).key;
    if (state.filter !== 'all' && status !== state.filter) return false;
    if (!query) return true;
    const revision = item.revision ?? {};
    const haystack = [revision.title, revision.summary, revision.objective, revision.creative_angle, subjectName(item), revision.subject_type]
      .map((value) => String(value ?? '').toLocaleLowerCase('es'))
      .join(' ');
    return haystack.includes(query);
  });
}

function renderList() {
  filterOpportunities();
  els.count.textContent = String(state.opportunities.length);
  els.empty.hidden = state.filtered.length > 0;
  els.grid.hidden = state.filtered.length === 0;

  els.grid.innerHTML = state.filtered.map((item, index) => {
    const revision = item.revision ?? {};
    const status = opportunityStatus(item);
    const palette = paletteFor(item, index);
    return `
      <article class="pci-opportunity-list-card">
        <div class="pci-opportunity-list-card__visual" style="--card-accent:${palette[0]};--card-a:${palette[1]};--card-b:${palette[2]}">
          <span>${escapeHtml(subjectName(item))}</span>
        </div>
        <div class="pci-opportunity-list-card__body">
          <div class="pci-opportunity-list-card__topline">
            <span class="pci-opportunity-list-card__status is-${status.key}">${escapeHtml(status.label)}</span>
            <span class="pci-opportunity-list-card__deadline">Cierra ${escapeHtml(formatDate(item.closes_at))}</span>
          </div>
          <h2>${escapeHtml(revision.title || 'Oportunidad creativa')}</h2>
          <p class="pci-opportunity-list-card__summary">${escapeHtml(revision.summary || revision.objective || 'Abrí el brief para ver todos los requisitos.')}</p>
          <div class="pci-opportunity-list-card__facts">
            <div class="pci-opportunity-list-card__fact"><span>Pago base</span><strong class="is-money">${escapeHtml(formatMoney(revision.base_price_amount, revision.currency))}</strong></div>
            <div class="pci-opportunity-list-card__fact"><span>Protocol busca</span><strong>${escapeHtml(formatTargetAssets(revision.slots_available))}</strong></div>
          </div>
          <button class="pci-opportunity-list-card__button" type="button" data-open-opportunity="${escapeHtml(item.consignment_id)}">Ver brief</button>
        </div>
      </article>
    `;
  }).join('');
}

function briefSection(eyebrow, title, content) {
  if (!content) return '';
  return `<section class="pci-brief-section"><span class="pci-brief-section__eyebrow">${escapeHtml(eyebrow)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(content)}</p></section>`;
}

function detailHero(item, palette) {
  const revision = item.revision ?? {};
  const status = opportunityStatus(item);
  return `
    <section class="pci-brief-hero">
      <div class="pci-brief-hero__visual" style="--brief-accent:${palette[0]};--brief-a:${palette[1]};--brief-b:${palette[2]}"></div>
      <div class="pci-brief-hero__body">
        <div class="pci-brief-hero__meta">
          <span class="pci-brief-chip ${status.key === 'invited' ? 'is-invited' : 'is-open'}">${escapeHtml(status.label)}</span>
          <span class="pci-brief-chip">Rev. ${escapeHtml(revision.revision_number || 1)}</span>
          <span class="pci-brief-chip">${escapeHtml(subjectName(item))}</span>
        </div>
        <h1>${escapeHtml(revision.title || 'Oportunidad creativa')}</h1>
        <p class="pci-brief-hero__summary">${escapeHtml(revision.summary || 'Revisá todos los puntos del brief antes de participar.')}</p>
      </div>
    </section>
  `;
}

function renderBriefMain(item) {
  const revision = item.revision ?? {};
  const palette = paletteFor(item);
  els.briefMain.innerHTML = [
    detailHero(item, palette),
    briefSection('Objetivo', 'Qué necesita Protocol', revision.objective),
    `<div class="pci-brief-duo">
      ${briefSection('Dirección creativa', 'Ángulo', revision.creative_angle)}
      ${briefSection('Primeros segundos', 'Hook recomendado', revision.hook_guidance)}
    </div>`,
    `<section class="pci-brief-section"><span class="pci-brief-section__eyebrow">Entrega</span><h2>Formato y requisitos técnicos</h2>${structuredRows(revision.format_requirements)}</section>`,
    `<section class="pci-brief-section"><span class="pci-brief-section__eyebrow">Evaluación</span><h2>Cómo se aprueba</h2>${structuredRows(revision.acceptance_criteria)}</section>`,
    `<section class="pci-brief-section"><span class="pci-brief-section__eyebrow">Derechos</span><h2>Qué ocurre si Protocol compra tu creativo</h2>${structuredRows(revision.rights_package_snapshot)}</section>`,
    `<section class="pci-brief-section"><span class="pci-brief-section__eyebrow">Performance</span><h2>Bono adicional</h2>${structuredRows(revision.performance_bonus_policy)}</section>`,
  ].filter(Boolean).join('');
}

function actionFacts(item) {
  const revision = item.revision ?? {};
  return `
    <div class="pci-brief-action__facts">
      <div class="pci-brief-action__fact"><span>Protocol busca</span><strong>${escapeHtml(formatTargetAssets(revision.slots_available))}</strong></div>
      <div class="pci-brief-action__fact"><span>Cierre</span><strong>${escapeHtml(formatDate(item.closes_at, true))}</strong></div>
      <div class="pci-brief-action__fact"><span>Revisiones incluidas</span><strong>${revision.pre_purchase_revision_limit == null ? 'Según brief' : escapeHtml(String(revision.pre_purchase_revision_limit))}</strong></div>
      <div class="pci-brief-action__fact"><span>Modalidad</span><strong>${item.visibility === 'invite_only' ? 'Invitación directa' : 'Consignación abierta'}</strong></div>
    </div>
  `;
}

function createSubmissionForm(item) {
  const created = state.createdSubmissions.get(item.consignment_id);
  if (created) {
    return `
      <div class="pci-submission-created">
        <strong>Entrega creada en borrador</strong>
        <span>Tu Submission ya existe. En el siguiente paso vas a subir la V1 desde Mis trabajos.</span>
        <span><code>${escapeHtml(created.submission_id)}</code></span>
      </div>
    `;
  }
  return `
    <form class="pci-create-submission" data-create-submission-form>
      <label for="concept-label">Nombre de tu idea <span style="color:var(--pci-muted);font-weight:500">(opcional)</span></label>
      <input id="concept-label" name="concept_label" maxlength="160" placeholder="Ej. Gato aburrido → pelota en acción" autocomplete="off" />
      <label for="concept-note">Enfoque o nota para Protocol <span style="color:var(--pci-muted);font-weight:500">(opcional)</span></label>
      <textarea id="concept-note" name="concept_note" maxlength="1000" rows="3" placeholder="Una breve idea de cómo pensás resolver el brief."></textarea>
      <small>Esto todavía no envía un video. Crea el espacio de trabajo donde después subirás tu V1.</small>
      <button class="pci-primary-action" type="submit" data-create-submission>Crear mi entrega</button>
    </form>
  `;
}

function renderBriefAction(item) {
  const revision = item.revision ?? {};
  const participationStatus = item?.participation?.status ?? null;
  const active = participationStatus === 'active';
  const invited = participationStatus === 'invited';
  const joinLabel = invited ? 'Aceptar invitación' : 'Quiero participar';

  els.briefAction.innerHTML = `
    <span class="pci-brief-action__label">Pago base por activo adquirido</span>
    <strong class="pci-brief-action__price">${escapeHtml(formatMoney(revision.base_price_amount, revision.currency))}</strong>
    <span class="pci-brief-action__unit">El pago nace solo si Protocol compra una versión exacta.</span>
    ${actionFacts(item)}
    ${active ? `<div class="pci-participation-state">✓ Ya estás participando de este brief. Podés crear tu entrega cuando quieras.</div>${createSubmissionForm(item)}` : `
      <button class="pci-primary-action" type="button" data-join-opportunity>${escapeHtml(joinLabel)}</button>
      <span class="pci-brief-action__note">Participar no transfiere derechos ni garantiza una compra. Tu material sigue siendo tuyo mientras Protocol no lo compre y pague.</span>
    `}
    <div data-action-error></div>
  `;
}

function selectedOpportunity() {
  return state.opportunities.find((item) => item.consignment_id === state.selectedId) ?? null;
}

function renderDetail() {
  const item = selectedOpportunity();
  if (!item) {
    showToast('La oportunidad ya no está disponible o no pertenece a tu cuenta.', true);
    setSelected(null, true);
    return;
  }
  renderBriefMain(item);
  renderBriefAction(item);
}

function setSelected(id, replace = false) {
  state.selectedId = id;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
  if (replace) history.replaceState({ opportunityId: id }, '', url); else history.pushState({ opportunityId: id }, '', url);
  showCurrentView();
}

function showCurrentView() {
  const hasDetail = Boolean(state.selectedId);
  els.listView.hidden = hasDetail;
  els.detailView.hidden = !hasDetail;
  if (hasDetail) renderDetail(); else renderList();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showToast(message, error = false) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.toggle('is-error', error);
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { els.toast.hidden = true; }, 4200);
}

function friendlyError(error) {
  const code = String(error?.message || error?.payload?.code || '');
  const messages = {
    pci_consignment_not_open: 'Esta oportunidad ya no está abierta.',
    pci_consignment_invitation_required: 'Esta invitación ya no es válida. Protocol debe emitir una nueva invitación para el brief vigente.',
    pci_creator_workspace_access_denied: 'Tu cuenta no tiene acceso activo a este workspace.',
    pci_participation_not_joinable: 'Esta participación ya no puede activarse.',
    pci_active_participation_required: 'Primero tenés que participar del brief.',
    pci_submission_limit_reached: 'Ya alcanzaste el máximo de entregas permitido para este brief.',
    pci_auth_session_required: 'Tu sesión venció. Volvé a ingresar.',
  };
  return messages[code] || 'No pudimos completar la acción. No se guardó ningún cambio parcial.';
}

async function joinSelected() {
  if (state.busy) return;
  const item = selectedOpportunity();
  if (!item) return;
  const button = document.querySelector('[data-join-opportunity]');
  const errorRoot = document.querySelector('[data-action-error]');
  state.busy = true;
  if (button) { button.disabled = true; button.textContent = 'Procesando…'; }
  if (errorRoot) errorRoot.innerHTML = '';
  try {
    const result = await joinCreatorOpportunity(item.consignment_id);
    item.participation = {
      participation_id: result.participation_id,
      status: 'active',
      joined_at: new Date().toISOString(),
    };
    renderBriefAction(item);
    showToast(item.visibility === 'invite_only' ? 'Invitación aceptada. Ya podés crear tu entrega.' : 'Ya estás participando. Podés crear tu entrega.');
  } catch (error) {
    const message = friendlyError(error);
    if (errorRoot) errorRoot.innerHTML = `<div class="pci-inline-error">${escapeHtml(message)}</div>`;
    showToast(message, true);
  } finally {
    state.busy = false;
  }
}

async function createSubmission(event) {
  event.preventDefault();
  if (state.busy) return;
  const item = selectedOpportunity();
  const form = event.currentTarget;
  if (!item || !(form instanceof HTMLFormElement)) return;
  const submitButton = form.querySelector('[data-create-submission]');
  const errorRoot = document.querySelector('[data-action-error]');
  const data = new FormData(form);
  const conceptLabel = String(data.get('concept_label') || '').trim();
  const conceptNote = String(data.get('concept_note') || '').trim();
  state.busy = true;
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Creando…'; }
  if (errorRoot) errorRoot.innerHTML = '';
  try {
    const result = await createCreatorSubmission(
      item.consignment_id,
      conceptLabel || null,
      conceptNote ? { creator_note: conceptNote, source: 'creator_portal' } : { source: 'creator_portal' },
    );
    state.createdSubmissions.set(item.consignment_id, result);
    renderBriefAction(item);
    showToast('Entrega creada en borrador. El próximo paso será subir tu V1.');
  } catch (error) {
    const message = friendlyError(error);
    if (errorRoot) errorRoot.innerHTML = `<div class="pci-inline-error">${escapeHtml(message)}</div>`;
    showToast(message, true);
  } finally {
    state.busy = false;
  }
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-opportunity]');
    if (open) {
      setSelected(open.getAttribute('data-open-opportunity'));
      return;
    }
    if (event.target.closest('[data-back-to-list]')) {
      setSelected(null);
      return;
    }
    if (event.target.closest('[data-join-opportunity]')) {
      joinSelected();
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.matches('[data-create-submission-form]')) createSubmission(event);
  });

  els.search?.addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderList();
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.getAttribute('data-filter') || 'all';
      document.querySelectorAll('[data-filter]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
      renderList();
    });
  });

  window.addEventListener('popstate', () => {
    state.selectedId = new URL(window.location.href).searchParams.get('id');
    showCurrentView();
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

async function requireUsableCreator() {
  if (isDemoMode()) {
    state.creatorName = 'Tomás';
    return;
  }
  const session = await getSession();
  if (!session?.user?.id) {
    window.location.replace('../auth/accept-invitation/');
    throw new Error('pci_auth_session_required');
  }
  const identity = await getOnboardingState();
  const activeRelationships = Array.isArray(identity?.relationships)
    ? identity.relationships.filter((item) => item?.status === 'active')
    : [];
  if (!identity?.linked || identity?.creator_status !== 'active' || activeRelationships.length === 0) {
    window.location.replace('../auth/accept-invitation/');
    throw new Error('pci_creator_not_active');
  }
  state.creatorName = identity.display_name || session.user.email || 'Creator';
}

function renderCreatorIdentity() {
  const firstName = String(state.creatorName || 'Creator').trim().split(/\s+/)[0] || 'Creator';
  document.querySelectorAll('[data-creator-name]').forEach((el) => { el.textContent = firstName; });
  document.querySelectorAll('[data-creator-avatar]').forEach((el) => { el.textContent = firstName.slice(0, 1).toUpperCase(); });
}

async function loadOpportunities() {
  await requireUsableCreator();
  if (isDemoMode()) {
    state.opportunities = structuredClone(demoOpportunities);
  } else {
    const response = await getCreatorOpportunities();
    state.opportunities = Array.isArray(response?.items) ? response.items : [];
  }
  renderCreatorIdentity();
  state.selectedId = new URL(window.location.href).searchParams.get('id');
  els.loading.hidden = true;
  showCurrentView();
}

async function boot() {
  bindEvents();
  bindMobileDrawer();
  try {
    await loadOpportunities();
  } catch (error) {
    if (String(error?.message) === 'pci_auth_session_required' || String(error?.message) === 'pci_creator_not_active') return;
    els.loading.innerHTML = `<div class="pci-inline-error">${escapeHtml(friendlyError(error))}</div>`;
  }
}

boot();
