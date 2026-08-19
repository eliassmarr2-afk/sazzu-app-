import {
  finalizeCreatorSubmissionVersion,
  getCreatorSubmissionDetail,
  getCreatorSubmissions,
  getOnboardingState,
  getSession,
  isDemoMode,
  reserveCreatorSubmissionVersion,
} from '../api-client.js';
import {
  formatUploadBytes,
  hashVideoFile,
  inferPciVideoMime,
  readVideoMetadata,
  uploadSignedTus,
  validatePciVideoFile,
} from '../upload-client.js';

const demoSubmissions = [
  {
    submission_id: '41111111-1111-4111-8111-111111111111',
    workspace_id: 'protocol-demo',
    consignment_id: '11111111-1111-4111-8111-111111111111',
    consignment_revision_id: '21111111-1111-4111-8111-111111111111',
    consignment_revision_number: 1,
    consignment_title: 'Video UGC · Pelota interactiva para gatos',
    status: 'draft',
    concept_label: 'Gato aburrido → pelota en acción',
    created_at: '2026-08-19T09:42:00-03:00',
    submitted_at: null,
    current_version: null,
  },
  {
    submission_id: '42222222-2222-4222-8222-222222222222',
    workspace_id: 'protocol-demo',
    consignment_id: '12222222-2222-4222-8222-222222222222',
    consignment_revision_id: '22222222-2222-4222-8222-222222222222',
    consignment_revision_number: 1,
    consignment_title: 'Demostración · Producto de cuidado personal',
    status: 'changes_requested',
    concept_label: 'Demostración directa en mano',
    created_at: '2026-08-18T15:20:00-03:00',
    submitted_at: '2026-08-18T16:04:00-03:00',
    current_version: {
      submission_version_id: '52222222-2222-4222-8222-222222222222',
      version_number: 1,
      status: 'ready',
      rights_clearance_status: 'pending',
      original_filename: 'demostracion-v1.mp4',
      mime_type: 'video/mp4',
      file_size_bytes: 18450000,
      duration_seconds: 24.8,
      width: 1080,
      height: 1920,
      finalized_at: '2026-08-18T16:04:00-03:00',
    },
  },
  {
    submission_id: '43333333-3333-4333-8333-333333333333',
    workspace_id: 'protocol-demo',
    consignment_id: '13333333-3333-4333-8333-333333333333',
    consignment_revision_id: '23333333-3333-4333-8333-333333333333',
    consignment_revision_number: 1,
    consignment_title: 'Invitación · Unboxing + reseña corta',
    status: 'submitted',
    concept_label: 'Unboxing espontáneo en mesa',
    created_at: '2026-08-19T08:50:00-03:00',
    submitted_at: '2026-08-19T10:11:00-03:00',
    current_version: {
      submission_version_id: '53333333-3333-4333-8333-333333333333',
      version_number: 1,
      status: 'ready',
      rights_clearance_status: 'pending',
      original_filename: 'unboxing-v1.mov',
      mime_type: 'video/quicktime',
      file_size_bytes: 32600000,
      duration_seconds: 31.2,
      width: 1080,
      height: 1920,
      finalized_at: '2026-08-19T10:11:00-03:00',
    },
  },
];

const demoDetails = {
  '41111111-1111-4111-8111-111111111111': {
    submission: {
      ...demoSubmissions[0],
      consignment_revision_number: 1,
      concept_metadata: { creator_note: 'Quiero abrir con el gato mirando una planta y cortar rápido a la pelota.' },
    },
    versions: [],
    reviews: [],
  },
  '42222222-2222-4222-8222-222222222222': {
    submission: {
      ...demoSubmissions[1],
      concept_metadata: { creator_note: 'Demostración corta, sin voz de locutor.' },
    },
    versions: [{
      ...demoSubmissions[1].current_version,
      sha256: 'ad4d168f343f89f8252338226551c7f68fb22cb821c7379872978c9cc09e2531',
      uploaded_at: '2026-08-18T16:03:10-03:00',
      invalid_reason: null,
    }],
    reviews: [{
      review_id: '62222222-2222-4222-8222-222222222222',
      submission_version_id: '52222222-2222-4222-8222-222222222222',
      version_number: 1,
      decision: 'changes_requested',
      rejection_reason_code: null,
      creator_feedback: 'La demostración se entiende bien. Necesitamos que el producto aparezca más cerca de cámara durante los primeros 3 segundos y mantener el plano final un poco más.',
      created_at: '2026-08-19T09:10:00-03:00',
    }],
  },
  '43333333-3333-4333-8333-333333333333': {
    submission: { ...demoSubmissions[2], concept_metadata: {} },
    versions: [{
      ...demoSubmissions[2].current_version,
      sha256: '47dd6450bf4d5cf3fd6b54cdfc527b34c9915a89d38e223fa5b91ae44c51c456',
      uploaded_at: '2026-08-19T10:10:15-03:00',
      invalid_reason: null,
    }],
    reviews: [],
  },
};

const palettes = [
  ['#ef3945', '#714237', '#211918'],
  ['#d7c4ee', '#6b574a', '#211d1b'],
  ['#4e7bff', '#374a5f', '#171b25'],
  ['#55cf8b', '#2e5543', '#141b18'],
  ['#ffad32', '#665034', '#211b14'],
];

const state = {
  submissions: [],
  filtered: [],
  selectedId: null,
  detail: null,
  creatorName: 'Tomás',
  search: '',
  filter: 'all',
  file: null,
  busy: false,
  activeReservation: null,
  uploadAbortController: null,
};

const els = {
  loading: document.querySelector('[data-loading-state]'),
  listView: document.querySelector('[data-list-view]'),
  detailView: document.querySelector('[data-detail-view]'),
  grid: document.querySelector('[data-work-grid]'),
  empty: document.querySelector('[data-work-empty]'),
  count: document.querySelector('[data-work-count]'),
  search: document.querySelector('[data-work-search]'),
  detailMain: document.querySelector('[data-work-detail-main]'),
  detailSide: document.querySelector('[data-work-detail-side]'),
  toast: document.querySelector('[data-work-toast]'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', includeTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function shortId(value) { return String(value || '').replaceAll('-', '').slice(0, 8).toUpperCase(); }
function truncateHash(value) { const hash = String(value || ''); return hash.length >= 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash || '—'; }

function statusCopy(status) {
  const copy = {
    draft: ['Borrador', 'Prepará y subí tu primera versión.', 'draft'],
    submitted: ['Enviada', 'Tu versión está esperando revisión.', 'submitted'],
    under_review: ['En revisión', 'Protocol está revisando tu versión.', 'under_review'],
    changes_requested: ['Cambios solicitados', 'Subí una nueva versión siguiendo el feedback.', 'changes_requested'],
    preselected: ['Preseleccionada', 'Protocol eligió esta entrega para avanzar comercialmente.', 'preselected'],
    rejected: ['Cerrada', 'Protocol decidió no avanzar con esta entrega.', 'rejected'],
    acquired: ['Adquirida', 'Protocol adquirió y pagó una versión exacta.', 'acquired'],
  };
  return copy[status] ?? ['Estado', 'Revisá el detalle de tu entrega.', String(status || 'unknown')];
}

function paletteFor(value) {
  const seed = [...String(value || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[seed % palettes.length];
}

function actionCategory(status) {
  if (['draft', 'changes_requested'].includes(status)) return 'action';
  if (['submitted', 'under_review'].includes(status)) return 'review';
  if (['rejected', 'acquired'].includes(status)) return 'closed';
  return 'other';
}

function filterWorks() {
  const query = state.search.toLocaleLowerCase('es');
  state.filtered = state.submissions.filter((item) => {
    if (state.filter !== 'all' && actionCategory(item.status) !== state.filter) return false;
    if (!query) return true;
    return [item.consignment_title, item.concept_label, item.status]
      .map((value) => String(value ?? '').toLocaleLowerCase('es')).join(' ').includes(query);
  });
}

function renderList() {
  filterWorks();
  els.count.textContent = String(state.filtered.length);
  els.empty.hidden = state.filtered.length > 0;
  els.grid.hidden = state.filtered.length === 0;
  els.grid.innerHTML = state.filtered.map((item) => {
    const [label, description, tone] = statusCopy(item.status);
    const palette = paletteFor(item.submission_id);
    const version = item.current_version;
    return `
      <article class="pci-work-card">
        <div class="pci-work-card__visual" style="--card-accent:${palette[0]};--card-a:${palette[1]};--card-b:${palette[2]}">
          <span>${escapeHtml(item.consignment_title || 'Brief creativo')}</span>
        </div>
        <div class="pci-work-card__body">
          <div class="pci-work-card__top"><span class="pci-work-status is-${escapeHtml(tone)}">${escapeHtml(label)}</span></div>
          <h2>${escapeHtml(item.concept_label || item.consignment_title || 'Entrega sin nombre')}</h2>
          <span class="pci-work-card__brief">${escapeHtml(item.consignment_title || description)}</span>
          <div class="pci-work-card__meta">
            <span>${version?.version_number ? `<strong>V${escapeHtml(version.version_number)}</strong>` : 'Sin versión'}</span>
            <span>Creada ${escapeHtml(formatDate(item.created_at))}</span>
          </div>
        </div>
        <button class="pci-work-card__open" type="button" data-open-work="${escapeHtml(item.submission_id)}" aria-label="Abrir trabajo">›</button>
      </article>`;
  }).join('');
}

function reviewsForVersion(versionId) {
  return Array.isArray(state.detail?.reviews)
    ? state.detail.reviews.filter((review) => review.submission_version_id === versionId)
    : [];
}

function reviewLabel(decision) {
  return ({ changes_requested: 'Cambios solicitados', preselected: 'Preseleccionada', rejected: 'No seleccionada' })[decision] || 'Revisión';
}

function renderVersionTimeline() {
  const versions = Array.isArray(state.detail?.versions) ? state.detail.versions : [];
  if (!versions.length) {
    return '<div class="pci-version-timeline"><div class="pci-work-empty"><strong>Todavía no hay versiones</strong><span>Cuando subas tu V1, va a quedar registrada acá de forma permanente.</span></div></div>';
  }

  return `<div class="pci-version-timeline">${versions.map((version) => {
    const reviews = reviewsForVersion(version.submission_version_id);
    const fileMeta = [
      version.file_size_bytes ? formatUploadBytes(version.file_size_bytes) : null,
      version.duration_seconds != null ? `${Number(version.duration_seconds).toFixed(1)} s` : null,
      version.width && version.height ? `${version.width}×${version.height}` : null,
    ].filter(Boolean).join(' · ');
    return `
      <div class="pci-version-item">
        <span class="pci-version-dot is-${escapeHtml(version.status)}">V${escapeHtml(version.version_number)}</span>
        <div class="pci-version-card">
          <div class="pci-version-card__top">
            <strong>Versión ${escapeHtml(version.version_number)}</strong>
            <span>${escapeHtml(version.status === 'ready' ? formatDate(version.finalized_at, true) : version.status)}</span>
          </div>
          <div class="pci-version-card__file">${escapeHtml(version.original_filename || 'Archivo reservado')}</div>
          <div class="pci-version-card__meta">
            ${fileMeta ? `<span>${escapeHtml(fileMeta)}</span>` : ''}
            <span>Estado: ${escapeHtml(version.status)}</span>
            ${version.sha256 ? `<span>SHA <code>${escapeHtml(truncateHash(version.sha256))}</code></span>` : ''}
          </div>
          ${version.invalid_reason ? `<div class="pci-upload-error">Invalidación técnica: ${escapeHtml(version.invalid_reason)}</div>` : ''}
          ${reviews.map((review) => `
            <div class="pci-review-feedback">
              <strong>${escapeHtml(reviewLabel(review.decision))} · V${escapeHtml(review.version_number)}</strong>
              ${escapeHtml(review.creator_feedback || 'Protocol registró una decisión sobre esta versión.')}
            </div>`).join('')}
        </div>
      </div>`;
  }).join('')}</div>`;
}

function renderDetailMain() {
  const submission = state.detail?.submission;
  if (!submission) return;
  const [label, description, tone] = statusCopy(submission.status);
  els.detailMain.innerHTML = `
    <section class="pci-work-hero">
      <div class="pci-work-hero__top">
        <span class="pci-work-status is-${escapeHtml(tone)}">${escapeHtml(label)}</span>
        <span class="pci-work-hero__id">SUB-${escapeHtml(shortId(submission.submission_id))}</span>
      </div>
      <h1>${escapeHtml(submission.concept_label || submission.consignment_title || 'Tu entrega')}</h1>
      <div class="pci-work-hero__brief">${escapeHtml(submission.consignment_title || 'Brief creativo')} · Rev. ${escapeHtml(submission.consignment_revision_number || '—')}</div>
      ${submission.concept_metadata?.creator_note ? `<span class="pci-work-hero__concept">${escapeHtml(submission.concept_metadata.creator_note)}</span>` : ''}
    </section>
    <section class="pci-work-panel">
      <div class="pci-work-panel__header">
        <div><h2>Historial de versiones</h2><p>V1, V2 y siguientes permanecen registradas. Una nueva versión nunca reemplaza la anterior.</p></div>
      </div>
      ${renderVersionTimeline()}
    </section>
    <section class="pci-work-panel">
      <div class="pci-work-panel__header">
        <div><h2>Estado actual</h2><p>${escapeHtml(description)}</p></div>
      </div>
    </section>`;
}

function reservationKey(versionId) { return `pci:upload-reservation:${versionId}`; }

function saveReservation(reservation, file, mimeType) {
  const versionId = String(reservation?.submission_version_id || '');
  if (!versionId) return;
  const record = {
    reservation,
    file: { name: file.name, size: file.size, lastModified: file.lastModified, mimeType },
    savedAt: Date.now(),
  };
  try { sessionStorage.setItem(reservationKey(versionId), JSON.stringify(record)); } catch { /* best effort */ }
}

function loadReservation(versionId) {
  try {
    const raw = sessionStorage.getItem(reservationKey(versionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.reservation?.upload?.signature_token) return null;
    return parsed;
  } catch { return null; }
}

function clearReservation(versionId) {
  try { sessionStorage.removeItem(reservationKey(versionId)); } catch { /* no-op */ }
}

function uploadingVersion() {
  const versions = Array.isArray(state.detail?.versions) ? state.detail.versions : [];
  return versions.find((version) => version.status === 'uploading') ?? null;
}

function uploadAllowed() {
  return ['draft', 'changes_requested'].includes(state.detail?.submission?.status);
}

function selectedFileMarkup() {
  if (!state.file) return '';
  const mime = inferPciVideoMime(state.file) || 'Tipo no reconocido';
  return `
    <div class="pci-selected-file">
      <div class="pci-selected-file__top"><strong>${escapeHtml(state.file.name)}</strong><button type="button" data-remove-file aria-label="Quitar archivo">×</button></div>
      <div class="pci-selected-file__meta">${escapeHtml(formatUploadBytes(state.file.size))} · ${escapeHtml(mime)}</div>
    </div>`;
}

function uploadProgressMarkup() {
  return `
    <div class="pci-upload-progress" data-upload-progress hidden>
      <div class="pci-upload-progress__top"><strong data-upload-label>Preparando…</strong><span data-upload-percent>0%</span></div>
      <div class="pci-upload-progress__track"><div class="pci-upload-progress__bar" data-upload-bar></div></div>
      <div class="pci-upload-progress__phase" data-upload-phase>Validando archivo</div>
    </div>`;
}

function renderUploadCard() {
  const submission = state.detail?.submission;
  const pendingVersion = uploadingVersion();
  const stored = pendingVersion ? loadReservation(pendingVersion.submission_version_id) : null;
  state.activeReservation = stored?.reservation ?? null;

  if (!uploadAllowed()) {
    const [label, description] = statusCopy(submission?.status);
    els.detailSide.innerHTML = `
      <section class="pci-work-state-card">
        <span class="pci-work-state-card__badge">${escapeHtml(label)}</span>
        <h2>No hay una versión pendiente para subir</h2>
        <p>${escapeHtml(description)}</p>
      </section>`;
    return;
  }

  const nextNumber = pendingVersion?.version_number || Math.max(0, ...(state.detail?.versions ?? []).map((v) => Number(v.version_number) || 0)) + 1;
  const recoveryCopy = pendingVersion
    ? stored
      ? 'Encontramos una carga iniciada en esta pestaña. Seleccioná el mismo archivo para continuar la misma versión.'
      : 'Existe una versión reservada pero esta pestaña ya no conserva su permiso temporal. Si el archivo terminó de subir, podés seleccionarlo para intentar finalizarlo sin crear otra versión.'
    : `Vas a crear V${nextNumber}. La versión anterior, si existe, permanecerá intacta.`;

  els.detailSide.innerHTML = `
    <section class="pci-upload-card">
      <span class="pci-upload-card__eyebrow">${pendingVersion ? 'Carga pendiente' : 'Nueva versión'}</span>
      <h2>${pendingVersion ? `Continuar V${escapeHtml(nextNumber)}` : `Subir V${escapeHtml(nextNumber)}`}</h2>
      <p>${escapeHtml(recoveryCopy)}</p>
      <label class="pci-upload-drop" data-upload-drop>
        <span class="pci-upload-drop__icon">↑</span>
        <strong>Elegí tu MP4 o MOV</strong>
        <span>Máximo 250 MB · La carga es resumable y no sobrescribe versiones.</span>
        <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" data-video-input />
      </label>
      <div data-selected-file>${selectedFileMarkup()}</div>
      ${uploadProgressMarkup()}
      <button class="pci-upload-action" type="button" data-start-upload ${state.file ? '' : 'disabled'}>${pendingVersion ? (stored ? 'Reanudar esta versión' : 'Verificar y finalizar') : `Subir V${escapeHtml(nextNumber)}`}</button>
      <div data-upload-message></div>
      ${pendingVersion && !stored ? '<div class="pci-upload-warning">No vamos a reservar una versión nueva mientras esta V siga en estado uploading.</div>' : ''}
    </section>`;
}

function renderDetail() {
  renderDetailMain();
  renderUploadCard();
}

function showToast(message, error = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('is-error', error);
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { els.toast.hidden = true; }, 4300);
}

function friendlyError(error) {
  const code = String(error?.message || error?.payload?.code || '');
  const messages = {
    pci_video_mime_not_allowed: 'Solo podés subir archivos MP4 o MOV.',
    pci_video_size_invalid: 'El video debe pesar menos de 250 MB.',
    pci_video_metadata_unavailable: 'No pudimos leer correctamente el video. Probá exportarlo nuevamente como MP4 o MOV.',
    pci_hash_failed: 'No pudimos calcular el fingerprint del archivo.',
    pci_hash_worker_failed: 'No pudimos preparar el fingerprint del video.',
    pci_submission_version_not_allowed: 'El estado actual de la entrega no permite crear una nueva versión.',
    pci_version_limit_reached: 'Este brief ya alcanzó el máximo de versiones permitido.',
    storage_object_not_found: 'La carga anterior no llegó a completarse. No se creó una versión nueva.',
    storage_verification_failed: 'Storage no pudo verificar el archivo en este momento. Podés reintentar.',
    pci_submission_version_mime_mismatch: 'El tipo de archivo almacenado no coincide con la versión reservada.',
    pci_submission_version_not_finalizable: 'Esta versión ya no puede finalizarse.',
    pci_auth_session_required: 'Tu sesión venció. Volvé a ingresar.',
  };
  return messages[code] || 'No pudimos completar la carga. Tu historial anterior no fue modificado.';
}

function setProgress(percent, label, phase) {
  const root = document.querySelector('[data-upload-progress]');
  if (!root) return;
  root.hidden = false;
  const bounded = Math.max(0, Math.min(100, Number(percent) || 0));
  const bar = root.querySelector('[data-upload-bar]');
  const percentage = root.querySelector('[data-upload-percent]');
  const labelEl = root.querySelector('[data-upload-label]');
  const phaseEl = root.querySelector('[data-upload-phase]');
  if (bar) bar.style.width = `${bounded}%`;
  if (percentage) percentage.textContent = `${Math.round(bounded)}%`;
  if (labelEl) labelEl.textContent = label;
  if (phaseEl) phaseEl.textContent = phase;
}

function setUploadMessage(message, tone = 'warning') {
  const root = document.querySelector('[data-upload-message]');
  if (!root) return;
  root.innerHTML = message ? `<div class="pci-upload-${escapeHtml(tone)}">${escapeHtml(message)}</div>` : '';
}

function fileMatchesStored(file, stored) {
  const saved = stored?.file;
  if (!saved) return true;
  return file.name === saved.name && file.size === saved.size && file.lastModified === saved.lastModified;
}

async function hashForFlow(file) {
  if (isDemoMode()) {
    setProgress(40, 'Preparando archivo', 'Calculando fingerprint SHA-256');
    await new Promise((resolve) => setTimeout(resolve, 450));
    return 'd'.repeat(64);
  }
  return hashVideoFile(file, {
    onProgress(processed, total) {
      const pct = total ? (processed / total) * 35 : 0;
      setProgress(Math.min(35, pct), 'Preparando archivo', `Fingerprint SHA-256 · ${formatUploadBytes(processed)} de ${formatUploadBytes(total)}`);
    },
  });
}

async function finalizeFlow(versionId, sha256, metadata) {
  setProgress(96, 'Verificando archivo', 'Storage confirma tamaño, MIME y objeto exacto');
  const result = await finalizeCreatorSubmissionVersion(versionId, { sha256, ...metadata });
  setProgress(100, 'Versión enviada', 'La versión quedó READY y la entrega volvió a SUBMITTED');
  clearReservation(versionId);
  return result;
}

async function performUpload() {
  if (state.busy || !state.file || !state.detail?.submission) return;
  const validation = validatePciVideoFile(state.file);
  if (!validation.ok) {
    setUploadMessage(friendlyError(new Error(validation.code)), 'error');
    return;
  }

  const pendingVersion = uploadingVersion();
  const stored = pendingVersion ? loadReservation(pendingVersion.submission_version_id) : null;
  if (stored && !fileMatchesStored(state.file, stored)) {
    setUploadMessage('Para reanudar esta versión seleccioná exactamente el mismo archivo que comenzó la carga.', 'error');
    return;
  }
  if (pendingVersion?.original_filename && pendingVersion.original_filename !== state.file.name) {
    setUploadMessage(`Esta versión fue reservada para “${pendingVersion.original_filename}”. Seleccioná ese mismo archivo.`, 'error');
    return;
  }

  state.busy = true;
  const action = document.querySelector('[data-start-upload]');
  if (action) { action.disabled = true; action.textContent = 'Procesando…'; }
  setUploadMessage('');

  try {
    setProgress(2, 'Validando video', 'Leyendo duración y resolución sin subir todavía');
    const metadata = await readVideoMetadata(state.file);
    let reservation = stored?.reservation ?? state.activeReservation;

    if (!pendingVersion) {
      setProgress(5, 'Reservando versión', 'Protocol genera una ruta privada e inmutable');
      reservation = await reserveCreatorSubmissionVersion(
        state.detail.submission.submission_id,
        { name: state.file.name, type: validation.mimeType },
      );
      if (isDemoMode()) {
        reservation.version_number = Math.max(0, ...(state.detail.versions ?? []).map((v) => Number(v.version_number) || 0)) + 1;
      }
      state.activeReservation = reservation;
      saveReservation(reservation, state.file, validation.mimeType);
    }

    const versionId = pendingVersion?.submission_version_id || reservation?.submission_version_id;
    if (!versionId) throw new Error('pci_upload_context_invalid');

    if (pendingVersion && !reservation) {
      const sha256 = await hashForFlow(state.file);
      await finalizeFlow(versionId, sha256, metadata);
    } else {
      state.uploadAbortController = new AbortController();
      let uploadPercent = 0;
      const hashPromise = hashForFlow(state.file);
      const uploadPromise = uploadSignedTus(state.file, reservation, {
        signal: state.uploadAbortController.signal,
        onStatus(status) {
          if (status === 'resuming') setProgress(Math.max(8, uploadPercent), 'Reanudando carga', 'Continuando la misma URL TUS');
        },
        onProgress(uploaded, total) {
          uploadPercent = total ? 35 + (uploaded / total) * 58 : 35;
          setProgress(uploadPercent, 'Subiendo video', `${formatUploadBytes(uploaded)} de ${formatUploadBytes(total)} · TUS resumable`);
        },
      });
      const [sha256] = await Promise.all([hashPromise, uploadPromise]);
      await finalizeFlow(versionId, sha256, metadata);
    }

    if (isDemoMode()) {
      const nextVersion = pendingVersion?.version_number || reservation?.version_number || 1;
      const ready = {
        submission_version_id: versionId,
        version_number: nextVersion,
        status: 'ready', rights_clearance_status: 'pending', original_filename: state.file.name,
        mime_type: validation.mimeType, file_size_bytes: state.file.size,
        duration_seconds: metadata.duration_seconds, width: metadata.width, height: metadata.height,
        sha256: 'd'.repeat(64), uploaded_at: new Date().toISOString(), finalized_at: new Date().toISOString(), invalid_reason: null,
      };
      if (pendingVersion) state.detail.versions = state.detail.versions.filter((v) => v.submission_version_id !== versionId);
      state.detail.versions.unshift(ready);
      state.detail.submission.status = 'submitted';
      state.detail.submission.current_version_id = versionId;
      const listItem = state.submissions.find((item) => item.submission_id === state.detail.submission.submission_id);
      if (listItem) { listItem.status = 'submitted'; listItem.current_version = ready; listItem.submitted_at = new Date().toISOString(); }
    } else {
      const [detailResponse, listResponse] = await Promise.all([
        getCreatorSubmissionDetail(state.detail.submission.submission_id),
        getCreatorSubmissions(),
      ]);
      state.detail = detailResponse;
      state.submissions = Array.isArray(listResponse?.items) ? listResponse.items : state.submissions;
    }

    state.file = null;
    state.activeReservation = null;
    showToast('Versión enviada. Protocol ya puede revisarla.');
    renderDetail();
  } catch (error) {
    const message = friendlyError(error);
    setUploadMessage(message, 'error');
    showToast(message, true);
  } finally {
    state.busy = false;
    state.uploadAbortController = null;
    const currentAction = document.querySelector('[data-start-upload]');
    if (currentAction) currentAction.disabled = !state.file;
  }
}

function selectFile(file) {
  if (!file) return;
  const validation = validatePciVideoFile(file);
  if (!validation.ok) {
    state.file = null;
    renderUploadCard();
    setUploadMessage(friendlyError(new Error(validation.code)), 'error');
    return;
  }
  state.file = file;
  renderUploadCard();
}

async function loadDetail(id) {
  state.file = null;
  state.activeReservation = null;
  if (isDemoMode()) {
    state.detail = structuredClone(demoDetails[id] || null);
  } else {
    state.detail = await getCreatorSubmissionDetail(id);
  }
  if (!state.detail?.submission) throw new Error('pci_submission_not_found');
}

async function setSelected(id, replace = false) {
  state.selectedId = id;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
  if (replace) history.replaceState({ submissionId: id }, '', url); else history.pushState({ submissionId: id }, '', url);

  if (!id) {
    state.detail = null;
    els.detailView.hidden = true;
    els.listView.hidden = false;
    renderList();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  els.listView.hidden = true;
  els.detailView.hidden = false;
  els.detailMain.innerHTML = '<div class="pci-work-loading"><span class="pci-work-spinner"></span><p>Cargando detalle…</p></div>';
  els.detailSide.innerHTML = '';
  try {
    await loadDetail(id);
    renderDetail();
    window.scrollTo({ top: 0, behavior: 'auto' });
  } catch (error) {
    showToast(friendlyError(error), true);
    await setSelected(null, true);
  }
}

async function requireUsableCreator() {
  if (isDemoMode()) { state.creatorName = 'Tomás'; return; }
  const session = await getSession();
  if (!session?.user?.id) {
    window.location.replace('../auth/accept-invitation/');
    throw new Error('pci_auth_session_required');
  }
  const identity = await getOnboardingState();
  const activeRelationships = Array.isArray(identity?.relationships) ? identity.relationships.filter((item) => item?.status === 'active') : [];
  if (!identity?.linked || identity?.creator_status !== 'active' || activeRelationships.length === 0) {
    window.location.replace('../auth/accept-invitation/');
    throw new Error('pci_creator_not_active');
  }
  state.creatorName = identity.display_name || session.user.email || 'Creator';
}

function renderIdentity() {
  const first = String(state.creatorName || 'Creator').trim().split(/\s+/)[0] || 'Creator';
  document.querySelectorAll('[data-creator-name]').forEach((el) => { el.textContent = first; });
  document.querySelectorAll('[data-creator-avatar]').forEach((el) => { el.textContent = first.slice(0, 1).toUpperCase(); });
}

async function loadWorks() {
  await requireUsableCreator();
  if (isDemoMode()) state.submissions = structuredClone(demoSubmissions);
  else {
    const response = await getCreatorSubmissions();
    state.submissions = Array.isArray(response?.items) ? response.items : [];
  }
  renderIdentity();
  els.loading.hidden = true;
  state.selectedId = new URL(window.location.href).searchParams.get('id');
  if (state.selectedId) await setSelected(state.selectedId, true);
  else { els.listView.hidden = false; renderList(); }
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-work]');
    if (open) { setSelected(open.getAttribute('data-open-work')); return; }
    if (event.target.closest('[data-back-to-work-list]')) { setSelected(null); return; }
    if (event.target.closest('[data-remove-file]')) { state.file = null; renderUploadCard(); return; }
    if (event.target.closest('[data-start-upload]')) { performUpload(); return; }
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-video-input]');
    if (input) selectFile(input.files?.[0] || null);
  });

  document.addEventListener('dragover', (event) => {
    const drop = event.target.closest('[data-upload-drop]');
    if (!drop) return;
    event.preventDefault();
    drop.classList.add('is-dragging');
  });
  document.addEventListener('dragleave', (event) => {
    const drop = event.target.closest('[data-upload-drop]');
    drop?.classList.remove('is-dragging');
  });
  document.addEventListener('drop', (event) => {
    const drop = event.target.closest('[data-upload-drop]');
    if (!drop) return;
    event.preventDefault();
    drop.classList.remove('is-dragging');
    selectFile(event.dataTransfer?.files?.[0] || null);
  });

  els.search?.addEventListener('input', (event) => { state.search = event.target.value.trim(); renderList(); });
  document.querySelectorAll('[data-work-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.getAttribute('data-work-filter') || 'all';
      document.querySelectorAll('[data-work-filter]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
      renderList();
    });
  });

  window.addEventListener('popstate', async () => {
    const id = new URL(window.location.href).searchParams.get('id');
    await setSelected(id, true);
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

async function boot() {
  bindEvents();
  bindMobileDrawer();
  try { await loadWorks(); }
  catch (error) {
    if (String(error?.message) === 'pci_auth_session_required' || String(error?.message) === 'pci_creator_not_active') return;
    els.loading.innerHTML = `<div class="pci-upload-error">${escapeHtml(friendlyError(error))}</div>`;
  }
}

boot();