(() => {
  'use strict';

  const demoState = {
    creator: {
      firstName: 'Tomás',
      notifications: 3,
    },
    metrics: {
      openOpportunities: 4,
      inReview: 2,
      changesRequested: 1,
      receivable: 85000,
      currency: 'ARS',
    },
    attention: [
      {
        id: 'submission-changes-1',
        type: 'changes_requested',
        badge: 'CAMBIOS SOLICITADOS',
        badgeTone: 'purple',
        title: 'Pelota interactiva para gatos',
        description: 'Protocol solicitó una nueva versión de tu video.',
        meta: 'V1 enviada · 18 ago 2026',
        action: 'Ver detalles',
        mediaLabel: 'Mascotas · UGC',
        mediaAccent: '#db2d35',
        mediaA: '#5e452f',
        mediaB: '#1e2024',
      },
      {
        id: 'offer-1042',
        type: 'offer',
        badge: 'OFERTA PENDIENTE',
        badgeTone: 'amber',
        title: 'Oferta por creativo #PCI-1042',
        description: 'Protocol ofrece $45.000 por tu versión V2.',
        meta: 'Vence mañana · 20/08/2026',
        metaDanger: true,
        action: 'Revisar oferta',
        mediaLabel: 'Demostración',
        mediaAccent: '#b7a6e8',
        mediaA: '#eee8df',
        mediaB: '#3b3535',
      },
    ],
    opportunities: [
      {
        id: 'opp-ugc-pets',
        title: 'Video UGC · Mascotas',
        price: 30000,
        slots: 2,
        mediaLabel: 'Mascotas',
        mediaAccent: '#ef3945',
        mediaA: '#7c4434',
        mediaB: '#251a18',
      },
      {
        id: 'opp-demo',
        title: 'Demostración Producto',
        price: 45000,
        slots: 1,
        mediaLabel: 'Producto',
        mediaAccent: '#f0e5d2',
        mediaA: '#80634e',
        mediaB: '#2f251f',
      },
      {
        id: 'opp-unboxing',
        title: 'Unboxing + Reseña',
        price: 40000,
        slots: 3,
        mediaLabel: 'Reseña',
        mediaAccent: '#48545d',
        mediaA: '#c9c8c5',
        mediaB: '#26282b',
      },
      {
        id: 'opp-context',
        title: 'Uso en Contexto',
        price: 35000,
        slots: 2,
        mediaLabel: 'Contexto',
        mediaAccent: '#272b2e',
        mediaA: '#866d59',
        mediaB: '#292320',
      },
    ],
  };

  function formatMoney(value, currency = 'ARS') {
    if (!Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderCreator() {
    document.querySelectorAll('[data-creator-first-name]').forEach((el) => {
      el.textContent = demoState.creator.firstName;
    });
    document.querySelectorAll('[data-notification-count]').forEach((el) => {
      el.textContent = String(demoState.creator.notifications);
      el.hidden = demoState.creator.notifications <= 0;
    });
  }

  function renderMetrics() {
    const values = {
      'open-opportunities': demoState.metrics.openOpportunities,
      'in-review': demoState.metrics.inReview,
      'changes-requested': demoState.metrics.changesRequested,
      receivable: formatMoney(demoState.metrics.receivable, demoState.metrics.currency),
    };

    Object.entries(values).forEach(([name, value]) => {
      const el = document.querySelector(`[data-metric="${name}"]`);
      if (el) el.textContent = String(value);
    });
  }

  function renderAttention() {
    const root = document.querySelector('[data-attention-list]');
    if (!root) return;

    root.innerHTML = demoState.attention.map((item) => `
      <article class="pci-attention-card" data-attention-id="${escapeHtml(item.id)}">
        <div
          class="pci-attention-card__media"
          data-media-label="${escapeHtml(item.mediaLabel)}"
          style="--demo-accent:${escapeHtml(item.mediaAccent)};--demo-bg-a:${escapeHtml(item.mediaA)};--demo-bg-b:${escapeHtml(item.mediaB)}"
          aria-hidden="true"
        ></div>
        <div class="pci-attention-card__body">
          <span class="pci-badge pci-badge--${escapeHtml(item.badgeTone)}">${escapeHtml(item.badge)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <span class="pci-attention-card__meta${item.metaDanger ? ' is-danger' : ''}">${escapeHtml(item.meta)}</span>
        </div>
        <div class="pci-attention-card__action">
          <button class="pci-secondary-button" type="button" data-demo-action="${escapeHtml(item.id)}">${escapeHtml(item.action)}</button>
          <span class="pci-card-arrow" aria-hidden="true">›</span>
        </div>
      </article>
    `).join('');

    const count = document.querySelector('[data-attention-count]');
    if (count) count.textContent = `(${demoState.attention.length})`;
  }

  function renderOpportunities() {
    const root = document.querySelector('[data-opportunities]');
    if (!root) return;

    root.innerHTML = demoState.opportunities.map((item) => `
      <article class="pci-opportunity-card" data-opportunity-id="${escapeHtml(item.id)}">
        <div
          class="pci-opportunity-card__media"
          data-media-label="${escapeHtml(item.mediaLabel)}"
          style="--demo-accent:${escapeHtml(item.mediaAccent)};--demo-bg-a:${escapeHtml(item.mediaA)};--demo-bg-b:${escapeHtml(item.mediaB)}"
          aria-hidden="true"
        ></div>
        <div class="pci-opportunity-card__body">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="pci-opportunity-card__price">
            ${escapeHtml(formatMoney(item.price))}
            <small>por activo</small>
          </span>
          <span class="pci-opportunity-card__slots">${item.slots} ${item.slots === 1 ? 'lugar disponible' : 'lugares disponibles'}</span>
          <button class="pci-opportunity-card__button" type="button" data-demo-action="${escapeHtml(item.id)}">Ver brief</button>
        </div>
      </article>
    `).join('');
  }

  function bindNavigation() {
    const navItems = [...document.querySelectorAll('[data-nav]')];
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-nav');
        navItems.forEach((candidate) => {
          candidate.classList.toggle('is-active', candidate.getAttribute('data-nav') === target);
        });
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function bindDemoActions() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-demo-action]');
      if (!target) return;
      const id = target.getAttribute('data-demo-action');
      console.info('[PCI Creator Portal demo] action selected', { id });
    });
  }

  function boot() {
    renderCreator();
    renderMetrics();
    renderAttention();
    renderOpportunities();
    bindNavigation();
    bindMobileDrawer();
    bindDemoActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
