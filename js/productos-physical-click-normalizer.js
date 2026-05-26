/*
  FIX INTERACCIÓN · Productos: normalizador de clic físico

  Problema observado:
  - En Mac algunos botones/cards responden al toque táctil, pero no al clic físico.

  Alcance:
  - Normaliza pointerup/mouseup sobre botones/cards críticos.
  - No modifica lógica de guardado.
  - No duplica acción si el click nativo ya ocurrió.
  - No toca persistencia, Extras ni Combos internamente.
*/
(function () {
  const TARGETS = [
    '[data-prod-com-optionals-add]',
    '[data-prod-com-optionals-pick]',
    '[data-prod-com-optionals-confirm]',
    '[data-prod-com-optionals-close]',
    '[data-open-extra-bank]',
    '[data-remove-selected-extra]',
    '.prodExtraCard.is-selectable',
    '.prodExtrasSelectConfirm',
    '.prodComBankPick',
    '.prodComAdd',
    '.prodComSecondaryAction',
    '.prodComEdit',
    '#prodComSaveBtn',
    '#prodComCloseBtn'
  ];

  const fired = new WeakMap();

  function closestTarget(event) {
    if (!event || !event.target || !event.target.closest) return null;
    for (const selector of TARGETS) {
      const node = event.target.closest(selector);
      if (node) return node;
    }
    return null;
  }

  function markNativeClick(event) {
    const target = closestTarget(event);
    if (!target) return;
    fired.set(target, Date.now());
  }

  function shouldSyntheticClick(target) {
    const last = fired.get(target) || 0;
    return Date.now() - last > 180;
  }

  function normalize(event) {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (event && event.button != null && event.button !== 0) return;

    const target = closestTarget(event);
    if (!target) return;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;

    const tag = String(target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.closest('input, textarea, select')) return;

    setTimeout(function () {
      if (!shouldSyntheticClick(target)) return;
      fired.set(target, Date.now());
      try {
        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      } catch (_) {
        if (typeof target.click === 'function') target.click();
      }
    }, 35);
  }

  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (window.__productosPhysicalClickNormalizerBound) return;
    window.__productosPhysicalClickNormalizerBound = true;

    document.addEventListener('click', markNativeClick, true);
    document.addEventListener('pointerup', normalize, true);
    document.addEventListener('mouseup', normalize, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('sazzu:page:load', boot);
  window.addEventListener('load', boot);
})();
