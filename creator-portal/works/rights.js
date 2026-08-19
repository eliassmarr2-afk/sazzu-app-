import { getCreatorSubmissionDetail, isDemoMode } from '../api-client.js';
import { submitCreatorRightsDeclaration } from './rights-api.js';

const layout = document.querySelector('.pci-work-detail-layout');
const detailMain = document.querySelector('[data-work-detail-main]');
const detailSide = document.querySelector('[data-work-detail-side]');

const slot = document.createElement('div');
slot.className = 'pci-rights-slot';
slot.setAttribute('data-rights-slot', '');
slot.hidden = true;
if (layout && detailSide) layout.insertBefore(slot, detailSide);

const demoRightsDetails = {
  '41111111-1111-4111-8111-111111111111': {
    submission: {
      submission_id: '41111111-1111-4111-8111-111111111111',
      status: 'draft', current_version_id: null,
      consignment_title: 'Video UGC · Pelota interactiva para gatos', consignment_revision_number: 1,
    },
    versions: [], reviews: [], rights_clearance_reviews: [],
  },
  '42222222-2222-4222-8222-222222222222': {
    submission: {
      submission_id: '42222222-2222-4222-8222-222222222222',
      status: 'changes_requested', current_version_id: '52222222-2222-4222-8222-222222222222',
      consignment_title: 'Demostración · Producto de cuidado personal', consignment_revision_number: 1,
    },
    versions: [{
      submission_version_id: '52222222-2222-4222-8222-222222222222', version_number: 1, status: 'ready',
      rights_clearance_status: 'pending', rights_declaration: {}, rights_declaration_locked: false,
      finalized_at: '2026-08-18T16:04:00-03:00',
    }],
    reviews: [{ submission_version_id: '52222222-2222-4222-8222-222222222222', version_number: 1, decision: 'changes_requested', created_at: '2026-08-19T09:10:00-03:00' }],
    rights_clearance_reviews: [],
  },
  '43333333-3333-4333-8333-333333333333': {
    submission: {
      submission_id: '43333333-3333-4333-8333-333333333333',
      status: 'submitted', current_version_id: '53333333-3333-4333-8333-333333333333',
      consignment_title: 'Invitación · Unboxing + reseña corta', consignment_revision_number: 1,
    },
    versions: [{
      submission_version_id: '53333333-3333-4333-8333-333333333333', version_number: 1, status: 'ready',
      rights_clearance_status: 'pending', rights_declaration: {}, rights_declaration_locked: false,
      finalized_at: '2026-08-19T10:11:00-03:00',
    }],
    reviews: [], rights_clearance_reviews: [],
  },
};

let activeDetail = null;
let activeSubmissionId = null;
let editing = false;
let busy = false;
let refreshTimer = null;
let refreshSequence = 0;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function currentSubmissionId() {
  return new URL(window.location.href).searchParams.get('id');
}

function declarationExists(version) {
  const value = version?.rights_declaration;
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length);
}

function currentReadyVersion(detail) {
  const versions = Array.isArray(detail?.versions) ? detail.versions : [];
  const currentId = detail?.submission?.current_version_id;
  const exact = versions.find((version) => version.submission_version_id === currentId && version.status === 'ready');
  if (exact) return exact;
  return versions.filter((version) => version.status === 'ready').sort((a, b) => Number(b.version_number) - Number(a.version_number))[0] ?? null;
}

function latestReview(detail, versionId) {
  return (Array.isArray(detail?.reviews) ? detail.reviews : [])
    .filter((item) => item.submission_version_id === versionId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] ?? null;
}

function clearanceHistory(detail, versionId) {
  return (Array.isArray(detail?.rights_clearance_reviews) ? detail.rights_clearance_reviews : [])
    .filter((item) => item.submission_version_id === versionId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function reviewState(detail, version) {
  const status = detail?.submission?.status;
  const review = latestReview(detail, version?.submission_version_id);
  if (status === 'acquired') return { label: 'Adquirida', tone: 'done', description: 'Protocol adquirió y pagó una versión exacta.' };
  if (status === 'rejected') return { label: 'No seleccionada', tone: 'closed', description: 'Protocol decidió no avanzar comercialmente con esta entrega.' };
  if (status === 'preselected' || review?.decision === 'preselected') return { label: 'Preseleccionada', tone: 'done', description: 'La versión fue elegida para avanzar al circuito comercial. Todavía no equivale a una compra.' };
  if (status === 'changes_requested' || review?.decision === 'changes_requested') return { label: 'Cambios solicitados', tone: 'warning', description: 'Primero subí la nueva versión solicitada. La declaración de derechos debe corresponder al archivo exacto que siga adelante.' };
  if (status === 'under_review') return { label: 'En revisión', tone: 'current', description: 'Protocol está evaluando creativamente esta versión.' };
  if (status === 'submitted') return { label: 'Enviada', tone: 'current', description: 'La versión está disponible para revisión de Protocol.' };
  return { label: 'Borrador', tone: 'waiting', description: 'Subí una versión antes de completar la declaración.' };
}

function routeMarkup(detail, version) {
  const hasDeclaration = declarationExists(version);
  const clearance = version?.rights_clearance_status || 'pending';
  const review = reviewState(detail, version);
  const preselected = detail?.submission?.status === 'preselected' || latestReview(detail, version?.submission_version_id)?.decision === 'preselected' || detail?.submission?.status === 'acquired';
  const commerciallyReady = preselected && clearance === 'complete';

  const step = (number, title, state, copy) => `<div class="pci-rights-step ${state ? `is-${state}` : ''}"><span>${number}</span><strong>${escapeHtml(title)}</strong>${copy ? `<small>${escapeHtml(copy)}</small>` : ''}</div>`;

  return `<div class="pci-rights-route">
    ${step('01', 'Video', version?.status === 'ready' ? 'done' : 'current')}
    ${step('02', 'Declaración', hasDeclaration ? 'done' : version?.status === 'ready' ? 'current' : '')}
    ${step('03', 'Clearance', clearance === 'complete' ? 'done' : clearance === 'flagged' ? 'flagged' : hasDeclaration ? 'current' : '')}
    ${step('04', 'Preselección', preselected ? 'done' : review.tone === 'current' ? 'current' : '')}
    ${step('05', 'Negociación', detail?.submission?.status === 'acquired' ? 'done' : commerciallyReady ? 'current' : '')}
  </div>`;
}

function musicLabel(source) {
  return ({ none: 'Sin música/audio adicional', original: 'Audio o música original', licensed: 'Material licenciado', platform_library: 'Biblioteca/plataforma', other: 'Otra fuente' })[source] || 'Sin informar';
}

function declarationSummary(version) {
  const d = version?.rights_declaration ?? {};
  const third = d.third_party_assets ?? {};
  const music = d.music_audio ?? {};
  const ai = d.ai ?? {};
  const people = d.people ?? {};
  return `<div class="pci-rights-summary">
    <div class="pci-rights-summary__item"><span>Autoría</span><strong>${d.origin?.creator_authorship_confirmed ? 'Producción confirmada por el Creator' : 'Sin confirmar'}</strong></div>
    <div class="pci-rights-summary__item"><span>Terceros</span><strong>${third.used ? 'Sí · autorización confirmada' : 'No declarados'}</strong></div>
    <div class="pci-rights-summary__item"><span>Música / audio</span><strong>${escapeHtml(musicLabel(music.source))}</strong></div>
    <div class="pci-rights-summary__item"><span>IA</span><strong>${ai.used ? `Sí · ${escapeHtml(ai.tool || 'herramienta informada')}` : 'No declarada'}</strong></div>
    <div class="pci-rights-summary__item"><span>Personas identificables</span><strong>${people.identifiable_people ? 'Sí · adultos y permisos confirmados' : 'No'}</strong></div>
    <div class="pci-rights-summary__item"><span>Declaración</span><strong>Schema v${escapeHtml(d.schema_version || 1)} · ${escapeHtml(formatDate(version.rights_declaration_submitted_at))}</strong></div>
  </div>`;
}

function historyMarkup(detail, version) {
  const history = clearanceHistory(detail, version.submission_version_id);
  if (!history.length) return '';
  return `<details class="pci-rights-history"><summary>Ver historial de clearance (${history.length})</summary>${history.map((item) => `
    <div class="pci-rights-history__item"><strong>${item.clearance_status === 'complete' ? 'Clearance completo' : 'Clearance observado'}</strong> · ${escapeHtml(formatDate(item.created_at))}${item.reason ? `<br>${escapeHtml(item.reason)}` : ''}</div>
  `).join('')}</details>`;
}

function checked(value) { return value ? 'checked' : ''; }

function formMarkup(version) {
  const d = version?.rights_declaration ?? {};
  const third = d.third_party_assets ?? {};
  const music = d.music_audio ?? {};
  const ai = d.ai ?? {};
  const people = d.people ?? {};
  const hasExisting = declarationExists(version);

  return `<form class="pci-rights-form" data-rights-form>
    <p class="pci-rights-form__intro">Esta es una declaración factual sobre <strong>V${escapeHtml(version.version_number)}</strong>. No transfiere derechos ni significa que Protocol haya comprado el video.</p>

    <section class="pci-rights-group">
      <h3>Autoría y origen</h3>
      <label class="pci-rights-check"><input type="checkbox" name="creator_authorship_confirmed" ${checked(d.origin?.creator_authorship_confirmed)} required><span>Confirmo que produje o tengo legitimación para presentar este video como Creator.</span></label>
      <label class="pci-rights-field"><span>Nota de origen (opcional)</span><textarea name="origin_notes" maxlength="2000" placeholder="Ej.: filmado y editado íntegramente por mí.">${escapeHtml(d.origin?.notes || '')}</textarea></label>
    </section>

    <section class="pci-rights-group">
      <h3>Assets de terceros</h3><p>Logos ajenos, fotografías, clips, gráficos, fuentes u otros elementos que no hayas creado vos.</p>
      <label class="pci-rights-check"><input type="checkbox" name="third_party_used" data-rights-toggle="third" ${checked(third.used)}><span>Esta versión contiene assets de terceros.</span></label>
      <div class="pci-rights-dependent" data-rights-dependent="third" ${third.used ? '' : 'hidden'}>
        <label class="pci-rights-check"><input type="checkbox" name="third_party_authorized" ${checked(third.authorization_confirmed)}><span>Confirmo que cuento con autorización/licencia suficiente para este uso.</span></label>
        <label class="pci-rights-field"><span>Qué elementos y bajo qué autorización</span><textarea name="third_party_notes" maxlength="2000" placeholder="Describí brevemente los elementos y su origen.">${escapeHtml(third.notes || '')}</textarea></label>
      </div>
    </section>

    <section class="pci-rights-group">
      <h3>Música y audio</h3>
      <label class="pci-rights-check"><input type="checkbox" name="music_used" data-rights-toggle="music" ${checked(music.used)}><span>Esta versión incorpora música/audio adicional.</span></label>
      <div class="pci-rights-dependent" data-rights-dependent="music" ${music.used ? '' : 'hidden'}>
        <label class="pci-rights-field"><span>Origen</span><select name="music_source">
          <option value="none">Seleccionar…</option>
          <option value="original" ${music.source === 'original' ? 'selected' : ''}>Original / producido por mí</option>
          <option value="licensed" ${music.source === 'licensed' ? 'selected' : ''}>Licenciado</option>
          <option value="platform_library" ${music.source === 'platform_library' ? 'selected' : ''}>Biblioteca de plataforma</option>
          <option value="other" ${music.source === 'other' ? 'selected' : ''}>Otro</option>
        </select></label>
        <label class="pci-rights-check"><input type="checkbox" name="music_commercial_confirmed" ${checked(music.commercial_use_confirmed)}><span>Confirmo que ese audio puede utilizarse comercialmente en este contexto.</span></label>
        <label class="pci-rights-field"><span>Detalle (opcional)</span><textarea name="music_notes" maxlength="2000" placeholder="Ej.: pista X de biblioteca Y.">${escapeHtml(music.notes || '')}</textarea></label>
      </div>
    </section>

    <section class="pci-rights-group">
      <h3>Uso de IA</h3>
      <label class="pci-rights-check"><input type="checkbox" name="ai_used" data-rights-toggle="ai" ${checked(ai.used)}><span>Utilicé una herramienta de IA generativa en alguna parte de esta versión.</span></label>
      <div class="pci-rights-dependent" data-rights-dependent="ai" ${ai.used ? '' : 'hidden'}>
        <label class="pci-rights-field"><span>Herramienta</span><input name="ai_tool" maxlength="160" value="${escapeHtml(ai.tool || '')}" placeholder="Ej.: Adobe Firefly"></label>
        <label class="pci-rights-field"><span>Qué se generó/modificó (opcional)</span><textarea name="ai_notes" maxlength="2000">${escapeHtml(ai.notes || '')}</textarea></label>
      </div>
    </section>

    <section class="pci-rights-group">
      <h3>Personas identificables</h3><p>El MVP de PCI no admite material con menores identificables.</p>
      <label class="pci-rights-check"><input type="checkbox" name="people_present" data-rights-toggle="people" ${checked(people.identifiable_people)}><span>Aparecen otras personas identificables en esta versión.</span></label>
      <div class="pci-rights-dependent" data-rights-dependent="people" ${people.identifiable_people ? '' : 'hidden'}>
        <label class="pci-rights-check"><input type="checkbox" name="people_all_adults" ${checked(people.all_adults_confirmed)}><span>Confirmo que todas las personas identificables son adultas.</span></label>
        <label class="pci-rights-check"><input type="checkbox" name="people_permission" ${checked(people.permission_confirmed)}><span>Confirmo que cuento con su permiso/autorización para el uso comercial correspondiente.</span></label>
        <label class="pci-rights-field"><span>Detalle (opcional)</span><textarea name="people_notes" maxlength="2000">${escapeHtml(people.notes || '')}</textarea></label>
      </div>
    </section>

    <label class="pci-rights-check pci-rights-certification"><input type="checkbox" name="information_accurate" ${checked(d.certification?.information_accurate)} required><span>Confirmo que la información anterior es correcta y completa para esta versión exacta.</span></label>
    <div data-rights-form-error></div>
    <div class="pci-rights-actions"><small>${hasExisting ? 'Al guardar cambios, el clearance vuelve a pending hasta una nueva revisión de Protocol.' : 'Protocol revisará esta declaración antes de una oferta formal.'}</small><button class="pci-rights-button is-primary" type="submit" data-rights-submit>${hasExisting ? 'Guardar nueva declaración' : 'Enviar declaración'}</button></div>
  </form>`;
}

function boolField(form, name) {
  return Boolean(form.elements.namedItem(name)?.checked);
}
function textField(form, name) {
  return String(form.elements.namedItem(name)?.value ?? '').trim();
}

function buildDeclaration(form) {
  const authorship = boolField(form, 'creator_authorship_confirmed');
  const thirdUsed = boolField(form, 'third_party_used');
  const thirdAuthorized = boolField(form, 'third_party_authorized');
  const thirdNotes = textField(form, 'third_party_notes');
  const musicUsed = boolField(form, 'music_used');
  const musicSource = musicUsed ? textField(form, 'music_source') : 'none';
  const musicCommercial = boolField(form, 'music_commercial_confirmed');
  const aiUsed = boolField(form, 'ai_used');
  const aiTool = textField(form, 'ai_tool');
  const peoplePresent = boolField(form, 'people_present');
  const adults = boolField(form, 'people_all_adults');
  const peoplePermission = boolField(form, 'people_permission');
  const accurate = boolField(form, 'information_accurate');

  if (!authorship) throw new Error('rights_authorship_required');
  if (thirdUsed && (!thirdAuthorized || !thirdNotes)) throw new Error('rights_third_party_authorization_required');
  if (musicUsed && (!['original', 'licensed', 'platform_library', 'other'].includes(musicSource) || !musicCommercial)) throw new Error('rights_music_authorization_required');
  if (aiUsed && !aiTool) throw new Error('rights_ai_tool_required');
  if (peoplePresent && (!adults || !peoplePermission)) throw new Error('rights_people_confirmation_required');
  if (!accurate) throw new Error('rights_certification_required');

  const usesThirdPartyElements = thirdUsed || (musicUsed && musicSource !== 'original') || peoplePresent;

  return {
    schema_version: 1,
    origin: {
      source_type: usesThirdPartyElements ? 'creator_original_with_third_party_elements' : 'creator_original',
      creator_authorship_confirmed: true,
      notes: textField(form, 'origin_notes') || null,
    },
    third_party_assets: {
      used: thirdUsed,
      authorization_confirmed: thirdUsed ? true : null,
      notes: thirdUsed ? thirdNotes : null,
    },
    music_audio: {
      used: musicUsed,
      source: musicSource,
      commercial_use_confirmed: musicUsed ? true : null,
      notes: musicUsed ? (textField(form, 'music_notes') || null) : null,
    },
    ai: {
      used: aiUsed,
      tool: aiUsed ? aiTool : null,
      notes: aiUsed ? (textField(form, 'ai_notes') || null) : null,
    },
    people: {
      identifiable_people: peoplePresent,
      all_adults_confirmed: peoplePresent ? true : null,
      permission_confirmed: peoplePresent ? true : null,
      notes: peoplePresent ? (textField(form, 'people_notes') || null) : null,
    },
    certification: { information_accurate: true },
  };
}

function friendlyError(error) {
  const code = String(error?.message || error?.payload?.code || '');
  return ({
    rights_authorship_required: 'Confirmá la autoría/origen del video.',
    rights_third_party_authorization_required: 'Si usaste assets de terceros, confirmá la autorización y describí cuáles son.',
    rights_music_authorization_required: 'Indicá el origen del audio y confirmá que puede utilizarse comercialmente.',
    rights_ai_tool_required: 'Indicá qué herramienta de IA utilizaste.',
    rights_people_confirmation_required: 'PCI no admite menores identificables. Confirmá mayoría de edad y permisos de todas las personas que aparecen.',
    rights_certification_required: 'Confirmá que la información declarada es correcta.',
    pci_rights_declaration_invalid: 'La declaración no cumple el formato requerido. Revisá todos los campos.',
    pci_rights_declaration_locked_after_grant: 'Esta declaración ya quedó congelada porque existe una compra/derecho asociado a la versión.',
    pci_submission_version_not_ready: 'Solo podés declarar derechos sobre una versión finalizada.',
    pci_auth_session_required: 'Tu sesión venció. Volvé a ingresar.',
  })[code] || 'No pudimos guardar la declaración. No se modificó la versión del video.';
}

function render() {
  if (!slot || !activeDetail?.submission) return;
  const version = currentReadyVersion(activeDetail);
  const review = reviewState(activeDetail, version);
  slot.hidden = false;

  if (!version) {
    slot.innerHTML = `<section class="pci-rights-panel"><header class="pci-rights-panel__header"><div><h2>Derechos y origen del creativo</h2><p>La declaración se completa sobre una versión exacta, nunca sobre un borrador.</p></div></header><div class="pci-rights-body">${routeMarkup(activeDetail, null)}<div class="pci-rights-callout"><strong>Primero necesitás una versión READY</strong>Subí tu V1 para habilitar la declaración de origen y derechos.</div></div></section>`;
    return;
  }

  const hasDeclaration = declarationExists(version);
  const clearance = version.rights_clearance_status || 'pending';
  const latestClearance = clearanceHistory(activeDetail, version.submission_version_id)[0] ?? null;
  const preselected = activeDetail.submission.status === 'preselected' || latestReview(activeDetail, version.submission_version_id)?.decision === 'preselected' || activeDetail.submission.status === 'acquired';
  const readyForNegotiation = preselected && clearance === 'complete';
  const mustUploadReplacement = activeDetail.submission.status === 'changes_requested';
  const terminalWithoutPurchase = activeDetail.submission.status === 'rejected';

  let content = routeMarkup(activeDetail, version);
  content += `<div class="pci-rights-callout ${review.tone === 'warning' ? 'is-warning' : review.tone === 'done' ? 'is-success' : ''}"><strong>Review creativo · ${escapeHtml(review.label)}</strong>${escapeHtml(review.description)}</div>`;

  if (mustUploadReplacement) {
    content += '<div class="pci-rights-callout is-warning" style="margin-top:10px"><strong>No declares V1 si vas a reemplazarla</strong>Subí la nueva versión solicitada. Cuando V2 quede READY, la declaración corresponderá exactamente a V2.</div>';
  } else if (terminalWithoutPurchase && !hasDeclaration) {
    content += '<div class="pci-rights-callout" style="margin-top:10px"><strong>No se requiere otra acción</strong>Esta entrega se cerró sin avanzar a compra.</div>';
  } else if (!hasDeclaration) {
    content += formMarkup(version);
  } else {
    const statusLabel = clearance === 'complete' ? 'Clearance completo' : clearance === 'flagged' ? 'Requiere corrección' : 'En revisión';
    content += `<div style="margin-top:14px"><span class="pci-rights-status is-${escapeHtml(clearance)}">${escapeHtml(statusLabel)}</span></div>`;
    content += declarationSummary(version);

    if (clearance === 'flagged') {
      content += `<div class="pci-rights-callout is-danger" style="margin-top:10px"><strong>Protocol observó la declaración</strong>${escapeHtml(latestClearance?.reason || 'Revisá la información declarada y volvé a enviarla.')}</div>`;
    } else if (clearance === 'complete') {
      content += '<div class="pci-rights-callout is-success" style="margin-top:10px"><strong>Declaración verificada</strong>Protocol completó el clearance de esta versión exacta.</div>';
    } else {
      content += '<div class="pci-rights-callout is-warning" style="margin-top:10px"><strong>Clearance pendiente</strong>Protocol todavía debe revisar la declaración. Esto no bloquea el review creativo, pero sí una oferta formal.</div>';
    }

    if (readyForNegotiation) {
      content += '<div class="pci-rights-ready"><strong>Lista para avanzar comercialmente.</strong> La versión está preseleccionada y su clearance está completo. El próximo paso puede ser una negociación/oferta formal.</div>';
    }

    content += historyMarkup(activeDetail, version);

    if (!version.rights_declaration_locked) {
      if (editing) content += formMarkup(version);
      else content += `<div class="pci-rights-actions"><small>${clearance === 'complete' ? 'Si corregís datos, el clearance volverá a pending hasta una nueva revisión.' : 'Podés corregir datos mientras todavía no exista un Rights Grant.'}</small><button class="pci-rights-button" type="button" data-edit-rights>${clearance === 'flagged' ? 'Corregir declaración' : 'Editar declaración'}</button></div>`;
    } else {
      content += '<div class="pci-rights-callout" style="margin-top:12px"><strong>Declaración congelada</strong>Esta versión ya tiene un Rights Grant asociado y su evidencia de origen no puede modificarse.</div>';
    }
  }

  slot.innerHTML = `<section class="pci-rights-panel"><header class="pci-rights-panel__header"><div><h2>Derechos y origen del creativo</h2><p>Declaración factual ligada al archivo exacto. No transfiere derechos ni representa una compra.</p></div><span class="pci-rights-version">V${escapeHtml(version.version_number)} · ${escapeHtml(version.status.toUpperCase())}</span></header><div class="pci-rights-body">${content}</div></section>`;
  syncDependentVisibility();
}

function syncDependentVisibility() {
  slot.querySelectorAll('[data-rights-toggle]').forEach((input) => {
    const key = input.getAttribute('data-rights-toggle');
    const target = slot.querySelector(`[data-rights-dependent="${key}"]`);
    if (target) target.hidden = !input.checked;
  });
}

async function loadDetail(id) {
  if (!id) return null;
  if (isDemoMode()) return demoRightsDetails[id] ? structuredClone(demoRightsDetails[id]) : null;
  return getCreatorSubmissionDetail(id);
}

async function refresh() {
  const id = currentSubmissionId();
  if (!id || document.querySelector('[data-detail-view]')?.hidden) {
    activeDetail = null; activeSubmissionId = null; editing = false; slot.hidden = true; slot.innerHTML = '';
    return;
  }

  const sequence = ++refreshSequence;
  try {
    const detail = await loadDetail(id);
    if (sequence !== refreshSequence || !detail?.submission) return;
    activeSubmissionId = id;
    activeDetail = detail;
    editing = false;
    render();
  } catch {
    if (sequence !== refreshSequence) return;
    slot.hidden = false;
    slot.innerHTML = '<div class="pci-rights-callout is-danger"><strong>No pudimos cargar el contexto de derechos</strong>Podés seguir viendo el trabajo; reintentaremos cuando vuelvas a abrirlo.</div>';
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 90);
}

async function submitForm(form) {
  if (busy || !activeDetail) return;
  const version = currentReadyVersion(activeDetail);
  if (!version) return;
  const errorRoot = form.querySelector('[data-rights-form-error]');
  const button = form.querySelector('[data-rights-submit]');
  if (errorRoot) errorRoot.innerHTML = '';

  let declaration;
  try { declaration = buildDeclaration(form); }
  catch (error) {
    if (errorRoot) errorRoot.innerHTML = `<div class="pci-rights-form-error">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }

  busy = true;
  if (button) { button.disabled = true; button.textContent = 'Guardando…'; }
  try {
    await submitCreatorRightsDeclaration(version.submission_version_id, declaration);

    const submittedAt = new Date().toISOString();
    const localVersion = activeDetail?.versions?.find((item) => item.submission_version_id === version.submission_version_id);
    if (localVersion) {
      localVersion.rights_declaration = declaration;
      localVersion.rights_clearance_status = 'pending';
      localVersion.rights_declaration_submitted_at = submittedAt;
    }

    if (isDemoMode()) {
      const demo = demoRightsDetails[activeSubmissionId];
      const demoVersion = demo?.versions?.find((item) => item.submission_version_id === version.submission_version_id);
      if (demoVersion) {
        demoVersion.rights_declaration = declaration;
        demoVersion.rights_clearance_status = 'pending';
        demoVersion.rights_declaration_submitted_at = submittedAt;
      }
    }

    editing = false;
    render();

    try {
      const refreshed = await loadDetail(activeSubmissionId);
      if (refreshed?.submission) {
        activeDetail = refreshed;
        render();
      }
    } catch {
      setTimeout(scheduleRefresh, 1500);
    }
  } catch (error) {
    if (errorRoot) errorRoot.innerHTML = `<div class="pci-rights-form-error">${escapeHtml(friendlyError(error))}</div>`;
  } finally {
    busy = false;
    const currentButton = slot.querySelector('[data-rights-submit]');
    if (currentButton) currentButton.disabled = false;
  }
}

slot.addEventListener('change', (event) => {
  if (event.target.closest('[data-rights-toggle]')) syncDependentVisibility();
});
slot.addEventListener('click', (event) => {
  if (event.target.closest('[data-edit-rights]')) { editing = true; render(); }
});
slot.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-rights-form]');
  if (!form) return;
  event.preventDefault();
  submitForm(form);
});

if (detailMain) {
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(detailMain, { childList: true, subtree: true });
}
window.addEventListener('popstate', scheduleRefresh);
window.addEventListener('pageshow', scheduleRefresh);
scheduleRefresh();
