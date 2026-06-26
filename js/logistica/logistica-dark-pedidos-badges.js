/* ==========================================================
   Protocol Data · Logística Dark · Badges Pedidos
   Ajuste aislado para badges del tab Pedidos en modo oscuro.
   No toca datos, Supabase, eventos ni render funcional.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkPedidosBadgesStyles';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

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

    body[data-page="logistica"].logistica-dark .logPedidosBadge *,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge *{
      color:inherit!important;
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

    /* Badges generados con estilos inline o sin variante */
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge[style],
    body[data-page="logistica"].logistica-dark .logPedidosTable span[class*="Badge"][style],
    body[data-page="logistica"].logistica-dark .logPedidosTable span[class*="badge"][style]{
      background:rgba(255,255,255,.09)!important;
      border:1px solid rgba(255,255,255,.16)!important;
      color:#d7d7d7!important;
      opacity:1!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--green[style]{
      background:rgba(68,180,116,.18)!important;
      border-color:rgba(68,180,116,.34)!important;
      color:#9ce8bf!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--orange[style]{
      background:rgba(242,138,43,.18)!important;
      border-color:rgba(242,138,43,.36)!important;
      color:#ffc078!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--red[style]{
      background:rgba(239,68,68,.18)!important;
      border-color:rgba(239,68,68,.36)!important;
      color:#ff9f9f!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--blue[style]{
      background:rgba(36,121,255,.18)!important;
      border-color:rgba(36,121,255,.34)!important;
      color:#a9caff!important;
    }

    /* Hover de fila: los badges conservan su color, no heredan blanco ni gris plano */
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.logDarkRowHover .logPedidosBadge{
      color:#d7d7d7!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--green,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.logDarkRowHover .logPedidosBadge--green{
      color:#9ce8bf!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--blue,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.logDarkRowHover .logPedidosBadge--blue{
      color:#a9caff!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--orange,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.logDarkRowHover .logPedidosBadge--orange{
      color:#ffc078!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--red,
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr.logDarkRowHover .logPedidosBadge--red{
      color:#ff9f9f!important;
    }
  `;

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
    }

    if (document.head.lastElementChild !== style) {
      document.head.appendChild(style);
    }
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(boot, 180);
  }, true);

  const observer = new MutationObserver(boot);
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
