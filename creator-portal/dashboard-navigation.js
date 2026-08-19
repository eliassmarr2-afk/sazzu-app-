import { getCreatorNegotiations, isDemoMode } from './api-client.js';

function normalizeOpportunitySlotCopy(root = document) {
  root.querySelectorAll('.pci-opportunity-card__slots').forEach((element) => {
    const match = element.textContent.trim().match(/^(\d+)/);
    if (!match) return;
    const count = Number(match[1]);
    element.textContent = Number.isFinite(count) && count > 0
      ? `Protocol busca ${count} ${count === 1 ? 'activo' : 'activos'}`
      : 'Cantidad de activos a definir';
  });
}

async function routeOfferToNegotiation(offerId) {
  let negotiationId = null;

  if (isDemoMode()) {
    if (offerId === 'offer-1042') negotiationId = '71111111-1111-4111-8111-111111111111';
  } else {
    try {
      const response = await getCreatorNegotiations();
      const items = Array.isArray(response?.items) ? response.items : [];
      negotiationId = items.find((item) => item?.live_offer?.offer_id === offerId)?.negotiation_id ?? null;
    } catch {
      negotiationId = null;
    }
  }

  const url = new URL('./conversations/', window.location.href);
  if (negotiationId) url.searchParams.set('id', negotiationId);
  window.location.href = url.toString();
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-portal-action-type]');
  if (!target) return;
  const id = target.getAttribute('data-portal-action');
  const type = target.getAttribute('data-portal-action-type');
  if (!id || !type) return;

  if (type === 'opportunity') {
    const url = new URL('./opportunities/', window.location.href);
    url.searchParams.set('id', id);
    window.location.href = url.toString();
    return;
  }

  if (type === 'changes_requested' || type === 'rights_declaration') {
    const url = new URL('./works/', window.location.href);
    url.searchParams.set('id', id);
    window.location.href = url.toString();
    return;
  }

  if (type === 'offer') {
    target.disabled = true;
    await routeOfferToNegotiation(id);
  }
});

const opportunitiesRoot = document.querySelector('[data-opportunities]');
if (opportunitiesRoot) {
  normalizeOpportunitySlotCopy(opportunitiesRoot);
  const observer = new MutationObserver(() => normalizeOpportunitySlotCopy(opportunitiesRoot));
  observer.observe(opportunitiesRoot, { childList: true, subtree: true });
}
