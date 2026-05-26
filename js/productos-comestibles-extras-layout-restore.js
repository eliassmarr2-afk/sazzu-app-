/*
  RESTORE VISUAL · Producto Comestible: Extras

  Corrige el layout de Extras después del polish general:
  - imagen izquierda
  - contenido central
  - meta/precio ordenado
  - tachito rojo arriba a la derecha
  - sin botones abajo

  No modifica lógica, persistencia ni selector de extras.
*/
(function () {
  const STYLE_ID = 'productos-comestibles-extras-layout-restore-css';

  function officialTrashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM6 8h12l-1 13H7L6 8Z" fill="currentColor"></path></svg>';
  }

  function injectStyles() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComOptions[data-options-key="extras"]{
        display:grid !important;
        gap:12px !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard{
        position:relative !important;
        display:grid !important;
        grid-template-columns:104px minmax(0,1fr) minmax(150px,auto) 34px !important;
        align-items:start !important;
        gap:18px !important;
        padding:16px !important;
        min-height:118px !important;
        border:1px solid #b8e4ff !important;
        border-radius:7px !important;
        background:#e5f6ff !important;
        cursor:pointer !important;
        box-shadow:0 8px 24px rgba(36,121,255,.08),0 1px 3px rgba(15,23,42,.08) !important;
        transform:none !important;
        transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,transform .16s ease !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard:hover{
        background:#def3ff !important;
        border-color:#93d5ff !important;
        transform:translateY(-1px) !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__image{
        width:82px !important;
        height:82px !important;
        min-width:82px !important;
        display:grid !important;
        place-items:center !important;
        overflow:hidden !important;
        border-radius:7px !important;
        background:#dff3ff !important;
        color:#2479ff !important;
        font-size:12px !important;
        font-weight:950 !important;
        align-self:start !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__image img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__body{
        min-width:0 !important;
        display:grid !important;
        align-content:start !important;
        gap:6px !important;
        padding-top:2px !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__body strong{
        display:block !important;
        color:#0f172a !important;
        font-size:14px !important;
        line-height:1.22 !important;
        font-weight:950 !important;
        overflow-wrap:anywhere !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__body span{
        display:block !important;
        color:#64748b !important;
        font-size:12px !important;
        line-height:1.35 !important;
        font-weight:750 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__meta{
        display:flex !important;
        align-items:center !important;
        justify-content:flex-end !important;
        gap:10px !important;
        align-self:center !important;
        min-width:0 !important;
        white-space:nowrap !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__badge{
        display:inline-flex !important;
        align-items:center !important;
        min-height:26px !important;
        padding:0 10px !important;
        border-radius:999px !important;
        background:#eff6ff !important;
        color:#2479ff !important;
        font-size:11px !important;
        font-weight:950 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__badge--soft{
        background:#f2f4f7 !important;
        color:#667085 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__meta b{
        color:#2479ff !important;
        font-size:14px !important;
        font-weight:950 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__delete{
        width:34px !important;
        height:34px !important;
        min-width:34px !important;
        display:grid !important;
        place-items:center !important;
        align-self:start !important;
        justify-self:end !important;
        border:0 !important;
        border-radius:6px !important;
        background:#fee2e2 !important;
        color:#b91c1c !important;
        box-shadow:none !important;
        padding:0 !important;
        line-height:1 !important;
        cursor:pointer !important;
        overflow:hidden !important;
        transform:none !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__delete svg{
        width:17px !important;
        height:17px !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard > .prodComOption__num,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard > .prodComOption__visual,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard .prodComOptionDelete:not(.prodComSelectedExtraCard__delete),
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard .prodComOption__delete:not(.prodComSelectedExtraCard__delete),
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard [data-prod-com-option-delete],
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard [data-delete-option]{
        display:none !important;
      }

      @media(max-width:980px){
        body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard{
          grid-template-columns:82px minmax(0,1fr) 34px !important;
        }
        body[data-page="productos"] #prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard__meta{
          grid-column:2 / -1 !important;
          justify-content:flex-start !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeExtraDeleteButtons() {
    const cards = Array.from(document.querySelectorAll('#prodComSlideBody [data-prod-com-section="extras"] .prodComSelectedExtraCard'));
    cards.forEach(function (card) {
      Array.from(card.querySelectorAll(':scope > .prodComOption__num, :scope > .prodComOption__visual')).forEach(function (node) {
        node.remove();
      });

      const buttons = Array.from(card.querySelectorAll('.prodComSelectedExtraCard__delete, .prodComOptionDelete, .prodComOption__delete, [data-prod-com-option-delete], [data-delete-option]'));
      let keep = buttons.find(function (btn) { return btn.classList.contains('prodComSelectedExtraCard__delete'); }) || buttons[0] || null;

      buttons.forEach(function (btn) {
        if (btn !== keep) btn.remove();
      });

      if (!keep) {
        keep = document.createElement('button');
        keep.type = 'button';
        card.appendChild(keep);
      }

      if (keep.parentElement !== card) card.appendChild(keep);
      keep.type = 'button';
      keep.className = 'prodComSelectedExtraCard__delete';
      keep.setAttribute('aria-label', keep.getAttribute('aria-label') || 'Eliminar extra');
      keep.innerHTML = officialTrashIcon();
    });
  }

  function run() {
    injectStyles();
    normalizeExtraDeleteButtons();
  }

  function boot() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    run();
    if (window.__prodComExtrasLayoutRestoreBound) return;
    window.__prodComExtrasLayoutRestoreBound = true;
    const observer = new MutationObserver(function () {
      setTimeout(run, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('sazzu:page:load', boot);
  window.addEventListener('load', boot);
})();
