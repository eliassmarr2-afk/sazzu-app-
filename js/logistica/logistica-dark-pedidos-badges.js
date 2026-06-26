/* ==========================================================
   Protocol Data · Logística Dark · Badges Pedidos
   Versión segura: solo inserta CSS una vez. Sin observers ni listeners.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkPedidosBadgesStyles';

  if (document.getElementById(STYLE_ID)) return;

  const css = `
    body[data-page="logistica"].logistica-dark .logPedidosBadge,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge,
    body[data-page="logistica"].logistica-dark .logPedidosTable span.logPedidosBadge{
      display:inline-flex!important;
      width:fit-content!important;
      min-height:22px!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      border-radius:7px!important;
      padding:5px 9px!important;
      border:1px solid rgba(255,255,255,.12)!important;
      background:rgba(255,255,255,.08)!important;
      color:#ececec!important;
      box-shadow:none!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:750!important;
      white-space:nowrap!important;
      opacity:1!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--green,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--green{
      background:rgba(68,180,116,.18)!important;
      border-color:rgba(68,180,116,.34)!important;
      color:#9ce8bf!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--blue,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--blue{
      background:rgba(36,121,255,.18)!important;
      border-color:rgba(36,121,255,.34)!important;
      color:#a9caff!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--orange,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--orange{
      background:rgba(242,138,43,.18)!important;
      border-color:rgba(242,138,43,.36)!important;
      color:#ffc078!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--red,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--red{
      background:rgba(239,68,68,.18)!important;
      border-color:rgba(239,68,68,.36)!important;
      color:#ff9f9f!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--gray,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--gray{
      background:rgba(255,255,255,.09)!important;
      border-color:rgba(255,255,255,.16)!important;
      color:#d7d7d7!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge *,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge *{
      color:inherit!important;
      opacity:1!important;
    }
  `;

  function inject() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once:true });
  } else {
    inject();
  }
})();
