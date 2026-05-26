/* FASE 1 FIX · Producto Comestible: layout estable para Agregados opcionales */
(function () {
  const STYLE_ID = 'productos-comestibles-optionals-layout-fix-css';

  function inject() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptions[data-options-key="recomendados"]{
        display:grid !important;
        gap:12px !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageACard{
        width:100% !important;
        min-height:auto !important;
        display:grid !important;
        grid-template-columns:72px minmax(0,1fr) 38px !important;
        align-items:start !important;
        gap:14px !important;
        padding:14px !important;
        border:1px solid #e5e7eb !important;
        border-radius:6px !important;
        background:#f8fbff !important;
        box-shadow:0 8px 22px rgba(15,23,42,.07),0 1px 3px rgba(15,23,42,.07) !important;
        overflow:visible !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAImage{
        width:64px !important;
        height:64px !important;
        min-width:64px !important;
        display:grid !important;
        place-items:center !important;
        overflow:hidden !important;
        border-radius:6px !important;
        background:#eaf2ff !important;
        color:#2479ff !important;
        font-size:11px !important;
        font-weight:950 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAImage img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageABody{
        min-width:0 !important;
        display:grid !important;
        gap:12px !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAHead{
        display:flex !important;
        justify-content:space-between !important;
        align-items:flex-start !important;
        gap:12px !important;
        min-width:0 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAHead strong{
        display:block !important;
        max-width:520px !important;
        color:#0f172a !important;
        font-size:14px !important;
        line-height:1.22 !important;
        font-weight:950 !important;
        overflow-wrap:anywhere !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAHead span{
        display:block !important;
        margin-top:4px !important;
        color:#64748b !important;
        font-size:12px !important;
        line-height:1.25 !important;
        font-weight:750 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAHead b{
        color:#2479ff !important;
        font-size:14px !important;
        font-weight:950 !important;
        white-space:nowrap !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields{
        display:grid !important;
        grid-template-columns:minmax(130px,.8fr) minmax(130px,.8fr) minmax(180px,1fr) !important;
        gap:10px !important;
        align-items:end !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields .prodComField{
        margin:0 !important;
        display:grid !important;
        gap:6px !important;
        min-width:0 !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields .prodComField span{
        display:block !important;
        margin:0 !important;
        color:#667085 !important;
        font-size:11px !important;
        line-height:1.15 !important;
        font-weight:950 !important;
        letter-spacing:.08em !important;
        text-transform:uppercase !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields input,
      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields select{
        width:100% !important;
        min-height:42px !important;
        height:42px !important;
        border:1px solid #d0d5dd !important;
        border-radius:6px !important;
        background:#fff !important;
        color:#0f172a !important;
        padding:0 10px !important;
        font-family:inherit !important;
        font-size:13px !important;
        font-weight:850 !important;
        box-sizing:border-box !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageADelete{
        width:34px !important;
        height:34px !important;
        display:grid !important;
        place-items:center !important;
        border:0 !important;
        border-radius:6px !important;
        background:#fee2e2 !important;
        color:#b91c1c !important;
        font-size:18px !important;
        font-weight:950 !important;
        line-height:1 !important;
        cursor:pointer !important;
      }

      body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAPicker{
        width:100% !important;
        box-sizing:border-box !important;
      }

      @media(max-width:980px){
        body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageACard{
          grid-template-columns:minmax(0,1fr) 38px !important;
        }
        body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAImage{
          display:none !important;
        }
        body[data-page="productos"] #prodComSlideBody [data-prod-com-section="recomendados"] .prodComOptionalStageAFields{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  document.addEventListener('sazzu:page:load', inject);
  window.addEventListener('load', inject);
})();
