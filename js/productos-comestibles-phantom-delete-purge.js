/*
  FIX PUNTUAL · Producto Comestible

  Objetivo único:
  - Eliminar el icono/botón fantasma que aparece abajo dentro de las cards.

  Reglas:
  - Tamaño/versiones: no debe quedar ningún botón interno.
  - Sin costo: no debe quedar ningún botón interno.
  - Extras: solo puede quedar .prodComSelectedExtraCard__delete.
  - Agregados opcionales: solo puede quedar .prodComOptionalStageADelete.

  No toca guardado, persistencia, Combos ni datos.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-phantom-delete-purge-css';
  let observerStarted = false;

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"></path></svg>';
  }

  function injectStyles() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    const old = document.getElementById(STYLE_ID);
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption > button,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption > .prodComOptionDelete,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption > .prodComOption__delete,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption > button,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption > .prodComOptionDelete,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption > .prodComOption__delete{
        display:none !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComSelectedExtraCard > button:not(.prodComSelectedExtraCard__delete),
      body[data-page="productos"] #prodComSlideBody .prodComSelectedExtraCard > .prodComOptionDelete,
      body[data-page="productos"] #prodComSlideBody .prodComSelectedExtraCard > .prodComOption__delete,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-optionals-card="1"] > button:not(.prodComOptionalStageADelete),
      body[data-page="productos"] #prodComSlideBody [data-prod-com-optionals-card="1"] > .prodComOptionDelete,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-optionals-card="1"] > .prodComOption__delete{
        display:none !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComSelectedExtraCard__delete,
      body[data-page="productos"] #prodComSlideBody .prodComOptionalStageADelete{
        width:34px !important;
        height:34px !important;
        min-width:34px !important;
        display:grid !important;
        place-items:center !important;
        border:0 !important;
        border-radius:6px !important;
        background:#fee2e2 !important;
        color:#b91c1c !important;
        padding:0 !important;
        cursor:pointer !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComSelectedExtraCard__delete svg,
      body[data-page="productos"] #prodComSlideBody .prodComOptionalStageADelete svg{
        width:17px !important;
        height:17px !important;
        display:block !important;
      }
    `;
    document.head.appendChild(style);
  }

  function isAllowedDeleteButton(button) {
    if (!button) return false;
    return button.classList.contains('prodComSelectedExtraCard__delete') || button.classList.contains('prodComOptionalStageADelete');
  }

  function removeButtonsFromSimpleCards() {
    document.querySelectorAll('#prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption, #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption').forEach(function (card) {
      card.querySelectorAll(':scope > button, :scope > .prodComOptionDelete, :scope > .prodComOption__delete, :scope > [data-prod-com-option-delete], :scope > [data-delete-option]').forEach(function (node) {
        node.remove();
      });
    });
  }

  function normalizeExtras() {
    document.querySelectorAll('#prodComSlideBody .prodComSelectedExtraCard').forEach(function (card) {
      card.querySelectorAll(':scope > button, :scope > .prodComOptionDelete, :scope > .prodComOption__delete, :scope > [data-prod-com-option-delete], :scope > [data-delete-option]').forEach(function (node) {
        if (!isAllowedDeleteButton(node)) node.remove();
      });
      const keep = card.querySelector(':scope > .prodComSelectedExtraCard__delete');
      if (keep) keep.innerHTML = trashIcon();
    });
  }

  function normalizeOptionals() {
    document.querySelectorAll('#prodComSlideBody [data-prod-com-optionals-card="1"]').forEach(function (card) {
      card.querySelectorAll(':scope > button, :scope > .prodComOptionDelete, :scope > .prodComOption__delete, :scope > [data-prod-com-option-delete], :scope > [data-delete-option]').forEach(function (node) {
        if (!isAllowedDeleteButton(node)) node.remove();
      });
      const keep = card.querySelector(':scope > .prodComOptionalStageADelete');
      if (keep) keep.innerHTML = trashIcon();
    });
  }

  function run() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    injectStyles();
    removeButtonsFromSimpleCards();
    normalizeExtras();
    normalizeOptionals();
  }

  function boot() {
    run();
    if (observerStarted) return;
    observerStarted = true;
    new MutationObserver(function () {
      setTimeout(run, 30);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('sazzu:page:load', boot);
  window.addEventListener('load', boot);
})();
