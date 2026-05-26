/*
  FASE 2 · Higiene visual de Agregados opcionales en Producto Comestible

  Alcance:
  - Unifica el botón eliminar en un solo tachito rojo.
  - Elimina botones fantasma heredados de renders anteriores.
  - Ordena y deduplica el selector visual de productos.
  - No toca Extras. No toca Combos. No toca persistencia durable.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-optionals-visual-stability-css';
  let observerStarted = false;

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" fill="currentColor"></path><path d="M7 8h10l-.85 12.25A2 2 0 0 1 14.16 22H9.84a2 2 0 0 1-1.99-1.75L7 8Z" fill="currentColor"></path><path d="M10 11v7M14 11v7" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"></path></svg>';
  }

  function injectStyles() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] .prodComOption__num,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] .prodComOption__visual,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] [data-extra-delete],
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] [data-delete-extra],
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] .prodComSelectedExtraCard__delete,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] .prodComExtraDelete{
        display:none !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] > .prodComOptionalStageADelete{
        align-self:start !important;
        justify-self:end !important;
        width:34px !important;
        height:34px !important;
        min-width:34px !important;
        display:grid !important;
        place-items:center !important;
        border:0 !important;
        border-radius:6px !important;
        background:#fee2e2 !important;
        color:#b91c1c !important;
        box-shadow:none !important;
        padding:0 !important;
        line-height:1 !important;
        cursor:pointer !important;
        overflow:hidden !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] > .prodComOptionalStageADelete svg{
        width:17px !important;
        height:17px !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"] > .prodComOptionalStageADelete:not(:first-of-type){
        display:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeDeleteButtons() {
    const cards = Array.from(document.querySelectorAll('#prodComSlideBody [data-prod-com-section="recomendados"] [data-prod-com-optionals-card="1"]'));

    cards.forEach(function (card) {
      Array.from(card.querySelectorAll('.prodComOption__num, .prodComOption__visual')).forEach(function (node) {
        node.remove();
      });

      const deleteButtons = Array.from(card.querySelectorAll('[data-prod-com-optionals-delete], .prodComOptionalStageADelete'));
      let keep = deleteButtons.find(function (button) { return button.parentElement === card; }) || deleteButtons[0] || null;

      deleteButtons.forEach(function (button) {
        if (button !== keep) button.remove();
      });

      if (!keep) {
        keep = document.createElement('button');
        keep.type = 'button';
        card.appendChild(keep);
      }

      if (keep.parentElement !== card) {
        card.appendChild(keep);
      }

      keep.type = 'button';
      keep.className = 'prodComOptionalStageADelete';
      keep.setAttribute('data-prod-com-optionals-delete', '1');
      keep.setAttribute('aria-label', 'Eliminar producto agregado');
      keep.innerHTML = trashIcon();
    });
  }

  function normalizePickerGrid() {
    const grids = Array.from(document.querySelectorAll('[data-prod-com-optionals-grid]'));

    grids.forEach(function (grid) {
      const buttons = Array.from(grid.querySelectorAll('[data-prod-com-optionals-pick]'));
      if (!buttons.length) return;

      const seen = new Set();
      const unique = [];

      buttons.forEach(function (button) {
        const id = String(button.dataset.productId || '').trim();
        const title = String((button.querySelector('strong') || {}).textContent || '').trim().toLowerCase();
        const key = id || title;
        if (!key || seen.has(key)) {
          button.remove();
          return;
        }
        seen.add(key);
        unique.push(button);
      });

      unique.sort(function (a, b) {
        const aText = String((a.querySelector('strong') || {}).textContent || '').trim().toLowerCase();
        const bText = String((b.querySelector('strong') || {}).textContent || '').trim().toLowerCase();
        return aText.localeCompare(bText, 'es');
      });

      unique.forEach(function (button) { grid.appendChild(button); });
    });
  }

  function run() {
    injectStyles();
    normalizeDeleteButtons();
    normalizePickerGrid();
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const observer = new MutationObserver(function () {
      setTimeout(run, 40);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    run();
    startObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('sazzu:page:load', boot);
  window.addEventListener('load', boot);
})();
