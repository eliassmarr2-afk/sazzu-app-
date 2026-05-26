/*
  FASE VISUAL · Producto Comestible: cards internas

  Alcance visual:
  - Oculta numeradores internos de Tamaño / Sin costo.
  - Agranda las imágenes 4x4 de Tamaño / Sin costo.
  - Aplica fondo celeste agua + hover/cursor a cards internas simples.

  Importante:
  - NO toca Extras. Extras tiene layout propio desde productos-extras-selector.js.
  - NO toca Agregados opcionales. Agregados opcionales tiene layout propio.
  - No modifica guardado, persistencia ni Combos.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-internal-cards-polish-css';
  let observerStarted = false;

  function isAllowedSection(card) {
    const list = card && card.closest('.prodComOptions');
    const key = list ? String(list.dataset.optionsKey || '') : '';
    return key === 'versiones' || key === 'sinCosto';
  }

  function injectStyles() {
    if (!document.querySelector('body[data-page="productos"]')) return;

    const old = document.getElementById(STYLE_ID);
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption{
        background:#eefaff !important;
        border:1px solid #d9efff !important;
        border-radius:7px !important;
        cursor:pointer !important;
        transition:background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption:hover,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption:hover{
        background:#e5f6ff !important;
        border-color:#b8e4ff !important;
        box-shadow:0 8px 24px rgba(36,121,255,.08),0 1px 3px rgba(15,23,42,.08) !important;
        transform:translateY(-1px) !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption{
        grid-template-columns:104px minmax(0,1fr) !important;
        align-items:center !important;
        gap:18px !important;
        padding:16px !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption__num,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption__num{
        display:none !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption__visual,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption__visual{
        width:96px !important;
        height:96px !important;
        min-width:96px !important;
        border-radius:7px !important;
        background:#dff3ff !important;
        color:#2479ff !important;
        font-size:12px !important;
        font-weight:950 !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption__visual img,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption__visual img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComGrid--option,
      body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComGrid--option{
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:12px !important;
      }

      @media(max-width:980px){
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption,
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption{
          grid-template-columns:1fr !important;
        }
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption__visual,
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption__visual{
          width:100% !important;
          height:140px !important;
        }
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComGrid--option,
        body[data-page="productos"] #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComGrid--option{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateVisuals(card) {
    const visuals = Array.from(card.querySelectorAll(':scope > .prodComOption__visual'));
    if (visuals.length <= 1) return;
    visuals.slice(1).forEach(function (visual) { visual.remove(); });
  }

  function normalizeCards() {
    const cards = Array.from(document.querySelectorAll('#prodComSlideBody .prodComOptions[data-options-key="versiones"] .prodComOption, #prodComSlideBody .prodComOptions[data-options-key="sinCosto"] .prodComOption'));
    cards.forEach(function (card) {
      if (!isAllowedSection(card)) return;
      const num = card.querySelector(':scope > .prodComOption__num');
      if (num) num.remove();
      removeDuplicateVisuals(card);
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
