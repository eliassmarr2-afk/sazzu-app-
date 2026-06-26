/* ==========================================================
   Protocol Data · Logística Dark · Pedidos UX
   Ajuste seguro:
   1) Badges del tab Pedidos adaptados a modo oscuro.
   2) Click sobre fila abre el mismo slide de edición existente.
   Sin observers. Sin loops. Sin tocar Supabase ni render funcional.
   ========================================================== */

(function () {
  const STYLE_ID = 'logisticaDarkPedidosBadgesStyles';
  const ROW_BIND_FLAG = 'logisticaPedidosRowClickBound';

  function isLogisticaPage() {
    return document.body && document.body.getAttribute('data-page') === 'logistica';
  }

  function isDark() {
    return isLogisticaPage() && document.body.classList.contains('logistica-dark');
  }

  const css = `
    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr{
      cursor:pointer!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover td{
      background:#303030!important;
      color:#ececec!important;
    }

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
      border:1px solid rgba(255,255,255,.16)!important;
      background:rgba(255,255,255,.10)!important;
      color:#e8e8e8!important;
      box-shadow:none!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:750!important;
      white-space:nowrap!important;
      opacity:1!important;
      filter:none!important;
      text-shadow:none!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge *,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge *{
      color:inherit!important;
      opacity:1!important;
      filter:none!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--green,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--green{
      background:rgba(68,180,116,.20)!important;
      border-color:rgba(68,180,116,.42)!important;
      color:#a8f0c8!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--blue,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--blue{
      background:rgba(36,121,255,.20)!important;
      border-color:rgba(36,121,255,.42)!important;
      color:#b8d2ff!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--orange,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--orange{
      background:rgba(242,138,43,.20)!important;
      border-color:rgba(242,138,43,.44)!important;
      color:#ffd18f!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--red,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--red{
      background:rgba(239,68,68,.20)!important;
      border-color:rgba(239,68,68,.44)!important;
      color:#ffb1b1!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosBadge--gray,
    body[data-page="logistica"].logistica-dark .logPedidosTable .logPedidosBadge--gray{
      background:rgba(255,255,255,.11)!important;
      border-color:rgba(255,255,255,.20)!important;
      color:#dedede!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge{
      background:rgba(255,255,255,.13)!important;
      color:#e8e8e8!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--green{
      background:rgba(68,180,116,.24)!important;
      border-color:rgba(68,180,116,.48)!important;
      color:#a8f0c8!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--blue{
      background:rgba(36,121,255,.24)!important;
      border-color:rgba(36,121,255,.48)!important;
      color:#b8d2ff!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--orange{
      background:rgba(242,138,43,.24)!important;
      border-color:rgba(242,138,43,.50)!important;
      color:#ffd18f!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--red{
      background:rgba(239,68,68,.24)!important;
      border-color:rgba(239,68,68,.50)!important;
      color:#ffb1b1!important;
    }

    body[data-page="logistica"].logistica-dark .logPedidosTable tbody tr:hover .logPedidosBadge--gray{
      background:rgba(255,255,255,.14)!important;
      border-color:rgba(255,255,255,.24)!important;
      color:#dedede!important;
    }
  `;

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);

    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
    }

    // Debe quedar al final para ganar contra logistica-dark-reference.js.
    if (document.head.lastElementChild !== style) {
      document.head.appendChild(style);
    }
  }

  function badgePalette(badge) {
    if (badge.classList.contains('logPedidosBadge--green')) {
      return ['rgba(68,180,116,.20)', 'rgba(68,180,116,.42)', '#a8f0c8'];
    }
    if (badge.classList.contains('logPedidosBadge--blue')) {
      return ['rgba(36,121,255,.20)', 'rgba(36,121,255,.42)', '#b8d2ff'];
    }
    if (badge.classList.contains('logPedidosBadge--orange')) {
      return ['rgba(242,138,43,.20)', 'rgba(242,138,43,.44)', '#ffd18f'];
    }
    if (badge.classList.contains('logPedidosBadge--red')) {
      return ['rgba(239,68,68,.20)', 'rgba(239,68,68,.44)', '#ffb1b1'];
    }
    return ['rgba(255,255,255,.11)', 'rgba(255,255,255,.20)', '#dedede'];
  }

  function applyBadgesInline() {
    if (!isDark()) return;

    document.querySelectorAll('.logPedidosTable .logPedidosBadge').forEach((badge) => {
      const [bg, border, color] = badgePalette(badge);
      badge.style.setProperty('display', 'inline-flex', 'important');
      badge.style.setProperty('width', 'fit-content', 'important');
      badge.style.setProperty('min-height', '22px', 'important');
      badge.style.setProperty('align-items', 'center', 'important');
      badge.style.setProperty('justify-content', 'center', 'important');
      badge.style.setProperty('border-radius', '7px', 'important');
      badge.style.setProperty('padding', '5px 9px', 'important');
      badge.style.setProperty('background', bg, 'important');
      badge.style.setProperty('border', '1px solid ' + border, 'important');
      badge.style.setProperty('color', color, 'important');
      badge.style.setProperty('opacity', '1', 'important');
      badge.style.setProperty('filter', 'none', 'important');
      badge.style.setProperty('box-shadow', 'none', 'important');
    });
  }

  function bindRowClick() {
    if (!isLogisticaPage() || document.body.dataset[ROW_BIND_FLAG] === '1') return;
    document.body.dataset[ROW_BIND_FLAG] = '1';

    document.addEventListener('click', function (event) {
      const table = event.target.closest('.logPedidosTable');
      if (!table) return;

      // No duplicar acciones si el usuario toca un control real.
      if (event.target.closest('button,a,input,select,textarea,label')) return;

      const row = event.target.closest('tbody tr');
      if (!row) return;

      const editButton = row.querySelector('[data-log-pedido-edit]');
      if (!editButton) return;

      editButton.click();
    }, true);
  }

  function boot() {
    if (!isLogisticaPage()) return;
    ensureStyle();
    bindRowClick();
    window.setTimeout(applyBadgesInline, 0);
    window.setTimeout(applyBadgesInline, 120);
    window.setTimeout(applyBadgesInline, 450);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  document.addEventListener('sazzu:page:load', boot);
  document.addEventListener('click', function () {
    window.setTimeout(boot, 0);
    window.setTimeout(applyBadgesInline, 220);
  }, true);
  document.addEventListener('input', function () {
    window.setTimeout(applyBadgesInline, 160);
  }, true);
  document.addEventListener('change', function () {
    window.setTimeout(applyBadgesInline, 160);
  }, true);
})();
