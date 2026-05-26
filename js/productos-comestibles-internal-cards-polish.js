/*
  FASE VISUAL · Producto Comestible: cards internas

  Alcance visual:
  - Oculta numeradores internos de las cards.
  - Agranda las imágenes 4x4.
  - Aplica fondo celeste agua + hover/cursor a cards internas.
  - Normaliza botones de borrado existentes al tachito rojo estándar.
  - Elimina duplicados visuales/íconos fantasma dentro de la misma card.

  No modifica guardado, persistencia, Extras ni Combos.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-internal-cards-polish-css';
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
      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOption{
        background:#eefaff !important;
        border:1px solid #d9efff !important;
        border-radius:7px !important;
        cursor:pointer !important;
        transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOption:hover{
        background:#e5f6ff !important;
        border-color:#b8e4ff !important;
        box-shadow:0 8px 24px rgba(36,121,255,.08),0 1px 3px rgba(15,23,42,.08) !important;
        transform:translateY(-1px) !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]){
        grid-template-columns:104px minmax(0,1fr) !important;
        align-items:center !important;
        gap:18px !important;
        padding:16px !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOption__num{
        display:none !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]) .prodComOption__visual{
        width:96px !important;
        height:96px !important;
        min-width:96px !important;
        border-radius:7px !important;
        background:#dff3ff !important;
        color:#2479ff !important;
        font-size:12px !important;
        font-weight:950 !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]) .prodComOption__visual img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]) .prodComGrid--option{
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:12px !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOptionDelete,
      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOption__delete,
      body[data-page="productos"] #prodComSlideBody .prodComOptions [data-prod-com-option-delete],
      body[data-page="productos"] #prodComSlideBody .prodComOptions [data-delete-option]{
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
        line-height:1 !important;
        box-shadow:none !important;
        cursor:pointer !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOptionDelete svg,
      body[data-page="productos"] #prodComSlideBody .prodComOptions .prodComOption__delete svg,
      body[data-page="productos"] #prodComSlideBody .prodComOptions [data-prod-com-option-delete] svg,
      body[data-page="productos"] #prodComSlideBody .prodComOptions [data-delete-option] svg{
        width:17px !important;
        height:17px !important;
        display:block !important;
      }

      @media(max-width:980px){
        body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]){
          grid-template-columns:1fr !important;
        }
        body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]) .prodComOption__visual{
          width:100% !important;
          height:140px !important;
        }
        body[data-page="productos"] #prodComSlideBody .prodComOptions:not([data-options-key="recomendados"]) .prodComOption:not([data-prod-com-optionals-card="1"]) .prodComGrid--option{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeExistingDeleteButtons(card) {
    const candidates = Array.from(card.querySelectorAll('.prodComOptionDelete, .prodComOption__delete, [data-prod-com-option-delete], [data-delete-option], button[aria-label*="Eliminar"], button[title*="Eliminar"]'));
    if (!candidates.length) return;

    let keep = candidates[0];
    candidates.forEach(function (button, index) {
      if (index > 0) button.remove();
    });

    keep.type = 'button';
    keep.classList.add('prodComOptionDelete');
    keep.setAttribute('aria-label', keep.getAttribute('aria-label') || 'Eliminar opción');
    keep.innerHTML = trashIcon();
  }

  function removeDuplicateVisuals(card) {
    const visuals = Array.from(card.querySelectorAll(':scope > .prodComOption__visual'));
    if (visuals.length <= 1) return;
    visuals.slice(1).forEach(function (visual) { visual.remove(); });
  }

  function normalizeCards() {
    const cards = Array.from(document.querySelectorAll('#prodComSlideBody .prodComOptions .prodComOption'));
    cards.forEach(function (card) {
      const num = card.querySelector(':scope > .prodComOption__num');
      if (num) num.remove();
      removeDuplicateVisuals(card);
      normalizeExistingDeleteButtons(card);
    });
  }

  function run() {
    injectStyles();
    normalizeCards();
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const observer = new MutationObserver(function () {
      setTimeout(run, 60);
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
