console.log('[finanzas-v3.js] cargado OK');

(function () {
  const BUILD = 'FINANZAS_V3_20260811_01';
  const SHOP_DOMAIN = window.__PROTOCOL_SHOP_DOMAIN__ || 'jbijm3-ya.myshopify.com';

  const state = {
    from: '',
    to: '',
    activeTab: 'resumen',
    movements: [],
    cashflow: [],
    movementSummary: {},
    cashflowSummary: {},
    search: '',
    status: 'all',
    loading: false,
    error: ''
  };

  const moneyFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  });

  const dateFmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const dateTimeFmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  function el(id) { return document.getElementById(id); }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function money(v) { return moneyFmt.format(num(v)); }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function isoDate(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
  }
  function isoDateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
  }
  function ymd(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function startOfMonth() { const d = new Date(); d.setDate(1); return ymd(d); }
  function endOfMonth() { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return ymd(d); }
  function toStartIso(v) { return v ? `${v}T00:00:00-03:00` : null; }
  function toEndIso(v) { return v ? `${v}T23:59:59-03:00` : null; }

  function statusMeta(status) {
    const s = String(status || 'pending').toLowerCase();
    const map = {
      pending: ['A cobrar', 'pending'],
      processed: ['Procesado', 'processed'],
      intervened: ['Intervenido', 'intervened'],
      refunded: ['Reintegrado', 'terminal'],
      cancelled: ['Cancelado', 'terminal'],
      failed: ['Fallido', 'terminal']
    };
    return map[s] || [s || 'Pendiente', 'pending'];
  }

  function providerLabel(row) {
    if (row && row.is_cod) return 'Contra-entrega';
    const p = String((row && (row.provider || row.payment_gateway)) || '').toLowerCase();
    if (p.includes('mercado')) return 'Mercado Pago';
    return p ? p.replace(/_/g, ' ') : 'Pasarela';
  }

  async function rpc(name, params) {
    if (!window.SazzuSupabase || typeof window.SazzuSupabase.rpc !== 'function') {
      throw new Error('Supabase no está disponible.');
    }
    const res = await window.SazzuSupabase.rpc(name, params || {});
    if (!res || res.ok !== true) throw new Error((res && res.error) || `${name} no devolvió un payload válido.`);
    return res;
  }

  function injectStyles() {
    if (el('finanzasV3Styles')) return;
    const style = document.createElement('style');
    style.id = 'finanzasV3Styles';
    style.textContent = `
      [data-page="finanzas"] .finV3{padding:0 0 40px;color:#f5f5f5;}
      [data-page="finanzas"] .finV3 *{box-sizing:border-box;}
      [data-page="finanzas"] .finV3Toolbar{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:12px;}
      [data-page="finanzas"] .finV3Toolbar__left,[data-page="finanzas"] .finV3Toolbar__right{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
      [data-page="finanzas"] .finV3 input,[data-page="finanzas"] .finV3 select{height:36px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#171717;color:#fff;padding:0 10px;}
      [data-page="finanzas"] .finV3 button{font:inherit;}
      [data-page="finanzas"] .finV3Btn{height:36px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-weight:750;}
      [data-page="finanzas"] .finV3Btn--primary{background:#2479FF;border-color:#2479FF;}
      [data-page="finanzas"] .finV3Tabs{display:flex;gap:6px;overflow-x:auto;margin-bottom:16px;padding-bottom:2px;scrollbar-width:none;}
      [data-page="finanzas"] .finV3Tabs::-webkit-scrollbar{display:none;}
      [data-page="finanzas"] .finV3Tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:rgba(255,255,255,.62);border-radius:9px;padding:9px 13px;cursor:pointer;font-weight:800;}
      [data-page="finanzas"] .finV3Tab.is-active{background:rgba(36,121,255,.18);border-color:rgba(36,121,255,.45);color:#fff;}
      [data-page="finanzas"] .finV3View{display:none;}
      [data-page="finanzas"] .finV3View.is-active{display:block;}
      [data-page="finanzas"] .finV3Grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
      [data-page="finanzas"] .finV3Card{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.035);border-radius:12px;padding:15px;min-width:0;}
      [data-page="finanzas"] .finV3Kicker{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.45);font-weight:850;}
      [data-page="finanzas"] .finV3Value{font-size:25px;line-height:1.05;font-weight:900;margin-top:8px;color:#fff;}
      [data-page="finanzas"] .finV3Sub{font-size:12px;color:rgba(255,255,255,.48);margin-top:7px;line-height:1.4;}
      [data-page="finanzas"] .finV3Section{margin-top:14px;}
      [data-page="finanzas"] .finV3SectionHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:9px;}
      [data-page="finanzas"] .finV3SectionTitle{font-size:14px;font-weight:900;color:#fff;}
      [data-page="finanzas"] .finV3Split{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.55fr);gap:12px;}
      [data-page="finanzas"] .finV3TableWrap{overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025);}
      [data-page="finanzas"] .finV3Table{width:100%;border-collapse:collapse;min-width:920px;}
      [data-page="finanzas"] .finV3Table th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.42);text-align:left;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;}
      [data-page="finanzas"] .finV3Table td{padding:12px;border-bottom:1px solid rgba(255,255,255,.055);font-size:12px;color:rgba(255,255,255,.82);vertical-align:middle;}
      [data-page="finanzas"] .finV3Table tr:last-child td{border-bottom:0;}
      [data-page="finanzas"] .finV3Table tbody tr{cursor:pointer;}
      [data-page="finanzas"] .finV3Table tbody tr:hover{background:rgba(255,255,255,.035);}
      [data-page="finanzas"] .finV3Money{font-weight:850;color:#fff;white-space:nowrap;}
      [data-page="finanzas"] .finV3Muted{color:rgba(255,255,255,.45);}
      [data-page="finanzas"] .finV3Status{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;border:1px solid transparent;white-space:nowrap;}
      [data-page="finanzas"] .finV3Status--pending{color:#dbeafe;background:rgba(36,121,255,.15);border-color:rgba(36,121,255,.32);}
      [data-page="finanzas"] .finV3Status--processed{color:#dcfce7;background:rgba(34,197,94,.13);border-color:rgba(34,197,94,.28);}
      [data-page="finanzas"] .finV3Status--intervened{color:#fee2e2;background:rgba(239,68,68,.13);border-color:rgba(239,68,68,.30);}
      [data-page="finanzas"] .finV3Status--terminal{color:#e5e7eb;background:rgba(148,163,184,.12);border-color:rgba(148,163,184,.24);}
      [data-page="finanzas"] .finV3List{display:flex;flex-direction:column;gap:8px;}
      [data-page="finanzas"] .finV3ListItem{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);}
      [data-page="finanzas"] .finV3ListItem:last-child{border-bottom:0;}
      [data-page="finanzas"] .finV3Empty{padding:28px 14px;text-align:center;color:rgba(255,255,255,.42);}
      [data-page="finanzas"] .finV3Chart{height:260px;display:flex;align-items:flex-end;gap:8px;padding:18px 8px 26px;border-top:1px solid rgba(255,255,255,.05);position:relative;overflow-x:auto;}
      [data-page="finanzas"] .finV3ChartDay{min-width:46px;flex:1;height:100%;display:flex;align-items:flex-end;gap:3px;position:relative;border-bottom:1px solid rgba(255,255,255,.08);}
      [data-page="finanzas"] .finV3Bar{width:33%;min-height:2px;border-radius:4px 4px 0 0;}
      [data-page="finanzas"] .finV3Bar--processed{background:#22c55e;}
      [data-page="finanzas"] .finV3Bar--pending{background:#2479FF;}
      [data-page="finanzas"] .finV3Bar--intervened{background:#ef4444;}
      [data-page="finanzas"] .finV3ChartLabel{position:absolute;left:50%;transform:translateX(-50%);bottom:-22px;font-size:9px;color:rgba(255,255,255,.38);white-space:nowrap;}
      [data-page="finanzas"] .finV3Legend{display:flex;gap:13px;flex-wrap:wrap;font-size:11px;color:rgba(255,255,255,.56);margin-top:10px;}
      [data-page="finanzas"] .finV3Dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;}
      [data-page="finanzas"] .finV3Dot--processed{background:#22c55e}.finV3Dot--pending{background:#2479FF}.finV3Dot--intervened{background:#ef4444}
      [data-page="finanzas"] .finV3Drawer{position:fixed;inset:0;z-index:9999;display:none;}
      [data-page="finanzas"] .finV3Drawer.is-open{display:block;}
      [data-page="finanzas"] .finV3Drawer__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.55);}
      [data-page="finanzas"] .finV3Drawer__panel{position:absolute;top:0;right:0;height:100%;width:min(520px,92vw);background:#151515;border-left:1px solid rgba(255,255,255,.12);padding:20px;overflow:auto;box-shadow:-30px 0 70px rgba(0,0,0,.35);}
      [data-page="finanzas"] .finV3DetailGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}
      [data-page="finanzas"] .finV3Detail{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025);}
      [data-page="finanzas"] .finV3Detail b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.38);margin-bottom:5px;}
      [data-page="finanzas"] .finV3Alert{padding:12px 14px;border-radius:10px;border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.08);color:#fecaca;margin-bottom:14px;}
      [data-page="finanzas"] .finV3Loading{opacity:.55;pointer-events:none;}
      [data-page="finanzas"] .finV3LegacyCosts .finCostsGrid{margin-top:0!important;}
      @media(max-width:1100px){[data-page="finanzas"] .finV3Grid{grid-template-columns:repeat(2,minmax(0,1fr));}[data-page="finanzas"] .finV3Split{grid-template-columns:1fr;}}
      @media(max-width:680px){[data-page="finanzas"] .finV3Grid{grid-template-columns:1fr;}[data-page="finanzas"] .finV3DetailGrid{grid-template-columns:1fr;}[data-page="finanzas"] .finV3Toolbar{align-items:stretch;}[data-page="finanzas"] .finV3Toolbar__left,[data-page="finanzas"] .finV3Toolbar__right{width:100%;}.finV3Toolbar input{flex:1;min-width:120px;}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    const main = document.querySelector('[data-page="finanzas"] main.main');
    if (!main || el('finanzasV3Root')) return false;

    const header = main.querySelector('.appHeader');
    if (header) {
      const title = header.querySelector('.appHeader__title');
      const sub = header.querySelector('.appHeader__sub');
      const right = header.querySelector('.appHeader__right');
      if (title) title.textContent = 'Finanzas';
      if (sub) sub.textContent = 'Operación financiera, cashflow y conciliación';
      if (right) right.style.display = 'none';
    }

    const root = document.createElement('section');
    root.id = 'finanzasV3Root';
    root.className = 'finV3';
    root.innerHTML = `
      <div class="finV3Toolbar">
        <div class="finV3Toolbar__left">
          <strong>Rango</strong>
          <input id="finV3From" type="date" aria-label="Desde">
          <input id="finV3To" type="date" aria-label="Hasta">
          <button class="finV3Btn finV3Btn--primary" id="finV3Apply" type="button">Aplicar</button>
        </div>
        <div class="finV3Toolbar__right">
          <button class="finV3Btn" data-fin-v3-preset="month" type="button">Este mes</button>
          <button class="finV3Btn" data-fin-v3-preset="year" type="button">Año</button>
          <button class="finV3Btn" id="finV3Refresh" type="button">Actualizar</button>
        </div>
      </div>
      <div id="finV3Error"></div>
      <div class="finV3Tabs" role="tablist">
        <button class="finV3Tab is-active" data-fin-v3-tab="resumen" type="button">
          <svg class="finV3Tab__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/>
          </svg>
          <span>Resumen</span>
        </button>

        <button class="finV3Tab" data-fin-v3-tab="movimientos" type="button">
          <svg class="finV3Tab__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 6h14v2H5V6Zm0 5h14v2H5v-2Zm0 5h14v2H5v-2Z"/>
          </svg>
          <span>Movimientos</span>
        </button>

        <button class="finV3Tab" data-fin-v3-tab="cashflow" type="button">
          <svg class="finV3Tab__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18h16v2H4v-2Zm2-3 4-5 3 3 5-7 2 1.4-6.4 9-3.4-3.4L7.6 16 6 15Z"/>
          </svg>
          <span>Flujo de caja</span>
        </button>

        <button class="finV3Tab" data-fin-v3-tab="costos" type="button">
          <svg class="finV3Tab__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 2.2L17.6 8 12 10.8 6.4 8 12 5.2ZM6 9.6l5 2.5v6.3l-5-2.5V9.6Zm7 8.8v-6.3l5-2.5v6.3l-5 2.5Z"/>
          </svg>
          <span>Costos</span>
        </button>

        <button class="finV3Tab" data-fin-v3-tab="conciliacion" type="button">
          <svg class="finV3Tab__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 7.3-7.3 1.4 1.4-8.7 8.7ZM4 20v-2h16v2H4Z"/>
          </svg>
          <span>Conciliación</span>
        </button>
      </div>
      <div id="finV3Resumen" class="finV3View is-active"></div>
      <div id="finV3Movimientos" class="finV3View"></div>
      <div id="finV3Cashflow" class="finV3View"></div>
      <div id="finV3Costos" class="finV3View"><div id="finV3LegacyCosts" class="finV3LegacyCosts"></div></div>
      <div id="finV3Conciliacion" class="finV3View"></div>
      <div class="finV3Drawer" id="finV3Drawer">
        <div class="finV3Drawer__backdrop" data-fin-v3-close></div>
        <aside class="finV3Drawer__panel">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
            <div><div class="finV3Kicker">Detalle financiero</div><h2 id="finV3DrawerTitle" style="margin:5px 0 0;font-size:20px;"></h2></div>
            <button class="finV3Btn" type="button" data-fin-v3-close>Cerrar</button>
          </div>
          <div id="finV3DrawerBody"></div>
        </aside>
      </div>
    `;

    if (header && header.nextSibling) main.insertBefore(root, header.nextSibling);
    else main.appendChild(root);

    const legacyCosts = main.querySelector('.finCostsGrid');
    if (legacyCosts) el('finV3LegacyCosts').appendChild(legacyCosts);

    Array.from(main.children).forEach((child) => {
      if (child === header || child === root) return;
      child.style.display = 'none';
      child.setAttribute('data-fin-v3-hidden', '1');
    });

    return true;
  }

  function bind() {
    el('finV3From').value = state.from;
    el('finV3To').value = state.to;

    el('finV3Apply').addEventListener('click', () => {
      state.from = el('finV3From').value;
      state.to = el('finV3To').value;
      load();
    });
    el('finV3Refresh').addEventListener('click', load);

    document.querySelectorAll('[data-fin-v3-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-fin-v3-preset');
        const now = new Date();
        if (p === 'month') { state.from = startOfMonth(); state.to = endOfMonth(); }
        if (p === 'year') { state.from = `${now.getFullYear()}-01-01`; state.to = `${now.getFullYear()}-12-31`; }
        el('finV3From').value = state.from;
        el('finV3To').value = state.to;
        load();
      });
    });

    document.querySelectorAll('[data-fin-v3-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-fin-v3-tab')));
    });

    el('finV3Drawer').addEventListener('click', (ev) => {
      if (ev.target.closest('[data-fin-v3-close]')) closeDrawer();
    });
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('[data-fin-v3-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-fin-v3-tab') === tab));
    ['resumen','movimientos','cashflow','costos','conciliacion'].forEach((name) => {
      const node = el(`finV3${name.charAt(0).toUpperCase() + name.slice(1)}`);
      if (node) node.classList.toggle('is-active', name === tab);
    });
  }

  function renderStatus(status) {
    const [label, kind] = statusMeta(status);
    return `<span class="finV3Status finV3Status--${kind}">${esc(label)}</span>`;
  }

  function renderResumen() {
    const m = state.movementSummary || {};
    const c = state.cashflowSummary || {};

    const pendingRows = state.movements
      .filter((r) => r.payment_status === 'pending')
      .slice(0, 5);

    const intervened = state.movements
      .filter((r) => r.payment_status === 'intervened')
      .slice(0, 5);

    const card = (tab, icon, label, value, sub) => `
      <article
        class="finCostCard finV3SummaryCard"
        role="button"
        tabindex="0"
        data-go-tab="${tab}"
      >
        <div class="finCostCard__icon" aria-hidden="true">
          ${icon}
        </div>

        <div class="finCostCard__meta">
          <div class="finCostCard__label">${label}</div>
          <div class="finCostCard__value">${value}</div>
          <div class="u-muted finV3SummaryCard__sub">
            ${sub}
          </div>
        </div>
      </article>
    `;

    const icons = {
      sales: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M5 5h14v14H5V5Zm2 2v2h10V7H7Zm0 4v6h4v-6H7Zm6 0v2h4v-2h-4Zm0 4v2h4v-2h-4Z"/></svg>`,
      net: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M12 3v2.1c-2.4.3-4 1.7-4 3.9 0 2.5 2.1 3.3 4 3.9 1.5.5 2.5.9 2.5 2 0 .9-.8 1.6-2.3 1.6-1.7 0-2.8-.8-3.5-1.8L7 16c1 1.5 2.7 2.5 5 2.8V21h2v-2.2c2.5-.4 4-1.9 4-4 0-2.7-2.2-3.5-4.3-4.2-1.5-.5-2.4-.8-2.4-1.8 0-.9.8-1.5 2-1.5 1.3 0 2.3.5 3.1 1.3L18 7c-1-1.1-2.3-1.8-4-2V3h-2Z"/></svg>`,
      cash: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M4 18h16v2H4v-2Zm2-3 4-5 3 3 5-7 2 1.4-6.4 9-3.4-3.4L7.6 16 6 15Z"/></svg>`,
      cost: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm1 3h-2v1.2c-1.8.3-3 1.4-3 3 0 1.9 1.6 2.6 3.1 3.1 1.2.4 1.9.7 1.9 1.4 0 .7-.6 1.1-1.7 1.1-1.2 0-2.1-.6-2.7-1.3l-1.4 1.2c.8 1.1 2.1 1.8 3.8 2V20h2v-1.2c1.8-.3 3-1.5 3-3.1 0-2-1.7-2.7-3.3-3.2-1.1-.4-1.8-.6-1.8-1.3 0-.6.6-1 1.5-1 1 0 1.8.4 2.4 1l1.4-1.3c-.8-.9-1.8-1.4-3.2-1.7V7Z"/></svg>`,
      pending: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm1 4h-2v6l5 3 1-1.7-4-2.3V7Z"/></svg>`,
      processed: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M9.5 17.2 4.8 12.5l1.4-1.4 3.3 3.3 8.3-8.3 1.4 1.4-9.7 9.7Z"/></svg>`,
      intervened: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Zm0 4 6 11H6l6-11Zm-1 3v4h2v-4h-2Zm0 5.5v2h2v-2h-2Z"/></svg>`,
      terminal: `<svg class="kpiIcon" viewBox="0 0 24 24"><path d="M6 5h12v14H6V5Zm2 2v10h8V7H8Zm1.5 2h5v2h-5V9Zm0 4h5v2h-5v-2Z"/></svg>`
    };

    el('finV3Resumen').innerHTML = `
      <div class="grid grid--4 finCostsGrid finV3SummaryGrid">
        ${card(
          'movimientos',
          icons.sales,
          'Ventas brutas',
          money(m.gross_total),
          `${num(m.total)} movimientos por fecha de venta.`
        )}

        ${card(
          'movimientos',
          icons.net,
          'Neto esperado',
          money(m.net_expected_total),
          'Después de costos financieros conocidos.'
        )}

        ${card(
          'cashflow',
          icons.cash,
          'Cashflow operativo',
          money(c.counted_cashflow_total),
          'Procesado + pendiente. Intervenidos excluidos.'
        )}

        ${card(
          'costos',
          icons.cost,
          'Costo financiero',
          money(m.financial_cost_total),
          'Costo efectivo o proyectado según conciliación disponible.'
        )}
      </div>

      <div class="grid grid--4 finCostsGrid finV3SummaryGrid finV3Section">
        ${card(
          'movimientos',
          icons.pending,
          'A cobrar',
          num(m.pending_count),
          `${money(c.pending_expected_total)} previsto.`
        )}

        ${card(
          'movimientos',
          icons.processed,
          'Procesados',
          num(m.processed_count),
          `${money(c.processed_actual_total)} recibido.`
        )}

        ${card(
          'conciliacion',
          icons.intervened,
          'Intervenidos',
          num(m.intervened_count),
          `${money(c.intervened_expected_total)} fuera del cashflow operativo.`
        )}

        ${card(
          'movimientos',
          icons.terminal,
          'Estados terminales',
          num(m.terminal_count),
          'Reintegrados, cancelados o fallidos.'
        )}
      </div>

      <div class="finV3Split finV3Section">
        <article class="finV3Card">
          <div class="finV3SectionHead">
            <div class="finV3SectionTitle">Próximos ingresos</div>
            <button class="finV3Btn" data-go-tab="cashflow" type="button">Ver flujo</button>
          </div>
          ${renderMiniList(pendingRows, 'expected_payout_date')}
        </article>

        <article class="finV3Card">
          <div class="finV3SectionHead">
            <div class="finV3SectionTitle">Intervenciones</div>
            <button class="finV3Btn" data-go-tab="conciliacion" type="button">Revisar</button>
          </div>
          ${renderMiniList(intervened, 'expected_payout_date')}
        </article>
      </div>
    `;

    el('finV3Resumen').querySelectorAll('[data-go-tab]').forEach((node) => {
      node.addEventListener('click', () => {
        switchTab(node.getAttribute('data-go-tab'));
      });

      node.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        switchTab(node.getAttribute('data-go-tab'));
      });
    });
  }

  function renderMiniList(rows, dateField) {
    if (!rows.length) return '<div class="finV3Empty">Sin movimientos para mostrar.</div>';
    return `<div class="finV3List">${rows.map((r) => `<div class="finV3ListItem"><div><strong>${esc(r.id)}</strong><div class="finV3Muted" style="font-size:11px;margin-top:3px;">${esc(providerLabel(r))} · ${isoDate(r[dateField])}</div></div><div style="text-align:right;">${renderStatus(r.payment_status)}<div class="finV3Money" style="font-size:12px;margin-top:5px;">${money(r.net_expected_amount)}</div></div></div>`).join('')}</div>`;
  }

  function filteredMovements() {
    const q = state.search.trim().toLowerCase();
    return state.movements.filter((r) => {
      if (state.status !== 'all' && String(r.payment_status) !== state.status) return false;
      if (!q) return true;
      return [r.id, r.customer_name, r.payment_method, r.provider_payment_status, r.provider_payment_id].join(' ').toLowerCase().includes(q);
    });
  }

  function renderMovimientos() {
    const rows = filteredMovements();
    el('finV3Movimientos').innerHTML = `
      <div class="finV3Toolbar">
        <div class="finV3Toolbar__left"><input id="finV3Search" type="search" placeholder="Buscar pedido, cliente o pago" value="${esc(state.search)}" style="min-width:260px;"><select id="finV3StatusFilter"><option value="all">Todos los estados</option><option value="pending">A cobrar</option><option value="processed">Procesados</option><option value="intervened">Intervenidos</option><option value="refunded">Reintegrados</option><option value="cancelled">Cancelados</option><option value="failed">Fallidos</option></select></div>
        <div class="finV3Muted">${rows.length} de ${state.movements.length} movimientos</div>
      </div>
      <div class="finV3TableWrap"><table class="finV3Table"><thead><tr><th>Pedido</th><th>Venta</th><th>Cliente</th><th>Medio</th><th>Estado</th><th>Bruto</th><th>Neto</th><th>Ingreso</th><th>Cuotas</th></tr></thead><tbody>${rows.map((r, i) => `<tr data-fin-row="${esc(r.finance_order_id || String(i))}"><td><strong>${esc(r.id)}</strong></td><td>${isoDate(r.sale_date_iso)}</td><td>${esc(r.customer_name || '—')}</td><td>${esc(providerLabel(r))}<div class="finV3Muted" style="font-size:10px;margin-top:2px;">${esc(r.payment_method || '')}</div></td><td>${renderStatus(r.payment_status)}</td><td class="finV3Money">${money(r.gross_amount)}</td><td class="finV3Money">${money(r.payment_status === 'processed' ? (r.net_actual_amount ?? r.net_expected_amount) : r.net_expected_amount)}</td><td>${isoDate(r.payment_status === 'processed' ? (r.actual_payout_date || r.expected_payout_date) : r.expected_payout_date)}</td><td>${num(r.buyer_installments_count || r.installments_count || 1)}</td></tr>`).join('')}</tbody></table></div>`;

    const search = el('finV3Search');
    const filter = el('finV3StatusFilter');
    filter.value = state.status;
    search.addEventListener('input', () => { state.search = search.value; renderMovimientos(); });
    filter.addEventListener('change', () => { state.status = filter.value; renderMovimientos(); });
    el('finV3Movimientos').querySelectorAll('[data-fin-row]').forEach((tr) => tr.addEventListener('click', () => {
      const row = state.movements.find((r) => String(r.finance_order_id) === tr.getAttribute('data-fin-row'));
      if (row) openDrawer(row);
    }));
  }

  function renderCashflow() {
    const c = state.cashflowSummary || {};
    const buckets = {};
    state.cashflow.forEach((r) => {
      const key = String(r.cashflow_date_iso || '').slice(0, 10);
      if (!key) return;
      buckets[key] ||= { processed: 0, pending: 0, intervened: 0 };
      if (r.payment_status === 'processed') buckets[key].processed += num(r.cashflow_amount);
      else if (r.payment_status === 'pending') buckets[key].pending += num(r.cashflow_amount);
      else if (r.payment_status === 'intervened') buckets[key].intervened += num(r.cashflow_amount);
    });
    const dates = Object.keys(buckets).sort();
    const max = Math.max(1, ...dates.flatMap((d) => Object.values(buckets[d])));

    el('finV3Cashflow').innerHTML = `
      <div class="finV3Grid">
        <article class="finV3Card"><div class="finV3Kicker">Cashflow operativo</div><div class="finV3Value">${money(c.counted_cashflow_total)}</div><div class="finV3Sub">Dinero recibido + pendiente esperado.</div></article>
        <article class="finV3Card"><div class="finV3Kicker">Procesado real</div><div class="finV3Value">${money(c.processed_actual_total)}</div><div class="finV3Sub">Sólo dinero liberado.</div></article>
        <article class="finV3Card"><div class="finV3Kicker">Pendiente esperado</div><div class="finV3Value">${money(c.pending_expected_total)}</div><div class="finV3Sub">Ingreso futuro previsto.</div></article>
        <article class="finV3Card"><div class="finV3Kicker">Intervenido</div><div class="finV3Value">${money(c.intervened_expected_total)}</div><div class="finV3Sub">Visible, pero excluido del cashflow operativo.</div></article>
      </div>
      <article class="finV3Card finV3Section"><div class="finV3SectionHead"><div><div class="finV3SectionTitle">Flujo por fecha del dinero</div><div class="finV3Sub">Procesado usa fecha real; pendiente/intervenido usa fecha esperada.</div></div></div>
        ${dates.length ? `<div class="finV3Chart">${dates.map((d) => `<div class="finV3ChartDay"><span class="finV3Bar finV3Bar--processed" title="Procesado ${money(buckets[d].processed)}" style="height:${Math.max(2,(buckets[d].processed/max)*100)}%"></span><span class="finV3Bar finV3Bar--pending" title="Pendiente ${money(buckets[d].pending)}" style="height:${Math.max(2,(buckets[d].pending/max)*100)}%"></span><span class="finV3Bar finV3Bar--intervened" title="Intervenido ${money(buckets[d].intervened)}" style="height:${Math.max(2,(buckets[d].intervened/max)*100)}%"></span><span class="finV3ChartLabel">${d.slice(8,10)}/${d.slice(5,7)}</span></div>`).join('')}</div><div class="finV3Legend"><span><i class="finV3Dot finV3Dot--processed"></i>Procesado</span><span><i class="finV3Dot finV3Dot--pending"></i>Pendiente</span><span><i class="finV3Dot finV3Dot--intervened"></i>Intervenido</span></div>` : '<div class="finV3Empty">No hay cashflow en este rango.</div>'}
      </article>`;
  }

  function renderCostos() {
    const m = state.movementSummary || {};
    const rate = num(m.gross_total) > 0 ? (num(m.financial_cost_total) / num(m.gross_total)) * 100 : 0;
    const host = el('finV3LegacyCosts');
    const existing = host ? host.innerHTML : '';
    el('finV3Costos').innerHTML = `<div class="finV3Grid"><article class="finV3Card"><div class="finV3Kicker">Costo financiero</div><div class="finV3Value">${money(m.financial_cost_total)}</div><div class="finV3Sub">${rate.toLocaleString('es-AR',{maximumFractionDigits:2})}% del bruto del rango.</div></article><article class="finV3Card"><div class="finV3Kicker">Bruto base</div><div class="finV3Value">${money(m.gross_total)}</div><div class="finV3Sub">Base de comparación de costos financieros.</div></article></div><div class="finV3Section" id="finV3LegacyCosts">${existing || '<div class="finV3Card"><div class="finV3Empty">Los demás costos continúan en sus fuentes operativas actuales.</div></div>'}</div>`;
  }

  function renderConciliacion() {
    const rows = state.movements.filter((r) => !r.is_cod);
    el('finV3Conciliacion').innerHTML = `<div class="finV3TableWrap"><table class="finV3Table"><thead><tr><th>Pedido</th><th>Protocol</th><th>Proveedor</th><th>Liberación</th><th>Cuotas reales</th><th>Neto esperado</th><th>Última conciliación</th><th>ID proveedor</th></tr></thead><tbody>${rows.map((r) => `<tr data-fin-conc="${esc(r.finance_order_id)}"><td><strong>${esc(r.id)}</strong></td><td>${renderStatus(r.payment_status)}</td><td>${esc(r.provider_payment_status || 'Sin dato')}</td><td>${esc(r.provider_release_status || 'Sin dato')}</td><td>${num(r.buyer_installments_count || r.installments_count || 1)}</td><td class="finV3Money">${money(r.net_expected_amount)}</td><td>${isoDateTime(r.provider_synced_at)}</td><td class="finV3Muted">${esc(r.provider_payment_id || '—')}</td></tr>`).join('')}</tbody></table></div>`;
    el('finV3Conciliacion').querySelectorAll('[data-fin-conc]').forEach((tr) => tr.addEventListener('click', () => {
      const row = state.movements.find((r) => String(r.finance_order_id) === tr.getAttribute('data-fin-conc'));
      if (row) openDrawer(row);
    }));
  }

  function renderAll() {
    renderResumen();
    renderMovimientos();
    renderCashflow();
    renderCostos();
    renderConciliacion();
    switchTab(state.activeTab);
  }

  function openDrawer(r) {
    el('finV3DrawerTitle').textContent = r.id || 'Movimiento';
    el('finV3DrawerBody').innerHTML = `<div style="margin-top:12px;">${renderStatus(r.payment_status)}</div><div class="finV3DetailGrid">
      ${detail('Fecha de venta', isoDateTime(r.sale_date_iso))}
      ${detail('Cliente', r.customer_name || '—')}
      ${detail('Proveedor', providerLabel(r))}
      ${detail('Método', r.payment_method || '—')}
      ${detail('Bruto', money(r.gross_amount))}
      ${detail('Costo financiero', money(r.total_financial_cost_amount))}
      ${detail('Neto esperado', money(r.net_expected_amount))}
      ${detail('Neto real', r.net_actual_amount == null ? '—' : money(r.net_actual_amount))}
      ${detail('Cuotas comprador', String(r.buyer_installments_count || r.installments_count || 1))}
      ${detail('Ingreso esperado', isoDateTime(r.expected_payout_date))}
      ${detail('Ingreso real', isoDateTime(r.actual_payout_date))}
      ${detail('Estado proveedor', r.provider_payment_status || '—')}
      ${detail('Liberación proveedor', r.provider_release_status || '—')}
      ${detail('Última conciliación', isoDateTime(r.provider_synced_at))}
      ${detail('ID pago proveedor', r.provider_payment_id || '—')}
      ${detail('Fuente conciliación', r.reconciliation_source || '—')}
    </div>`;
    el('finV3Drawer').classList.add('is-open');
  }

  function detail(label, value) { return `<div class="finV3Detail"><b>${esc(label)}</b><span>${esc(value)}</span></div>`; }
  function closeDrawer() { el('finV3Drawer').classList.remove('is-open'); }

  async function load() {
    state.loading = true;
    state.error = '';
    el('finanzasV3Root').classList.add('finV3Loading');
    el('finV3Error').innerHTML = '';
    try {
      const [movements, cashflow] = await Promise.all([
        rpc('rpc_finance_movements_v1', {
          input_from: toStartIso(state.from),
          input_to: toEndIso(state.to),
          input_shop_domain: SHOP_DOMAIN,
          input_limit: 2000
        }),
        rpc('rpc_finance_cashflow_v2', {
          input_from: toStartIso(state.from),
          input_to: toEndIso(state.to),
          input_shop_domain: SHOP_DOMAIN
        })
      ]);
      state.movements = Array.isArray(movements.rows) ? movements.rows : [];
      state.cashflow = Array.isArray(cashflow.rows) ? cashflow.rows : [];
      state.movementSummary = movements.summary || {};
      state.cashflowSummary = cashflow.summary || {};
      renderAll();
      console.log('[finanzas-v3] load OK', { build: BUILD, movements: state.movements.length, cashflow: state.cashflow.length });
    } catch (err) {
      console.error('[finanzas-v3] load error', err);
      state.error = err && err.message ? err.message : String(err);
      el('finV3Error').innerHTML = `<div class="finV3Alert">No se pudo cargar Finanzas V3: ${esc(state.error)}</div>`;
    } finally {
      state.loading = false;
      el('finanzasV3Root').classList.remove('finV3Loading');
    }
  }

  function boot() {
    if (!document.body || document.body.getAttribute('data-page') !== 'finanzas') return;
    injectStyles();
    if (!mount()) return;
    state.from = startOfMonth();
    state.to = endOfMonth();
    bind();
    renderAll();
    load();
    console.log('[finanzas-v3] boot OK', BUILD);
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => { if (!el('finanzasV3Root')) boot(); });
  if (document.readyState !== 'loading') boot();
})();


/* =========================================================
   FINANZAS V3 · cuarentena UI legacy
   Mantiene infraestructura vieja disponible, pero evita
   que vuelva a competir visualmente con Finanzas V3.
   ========================================================= */
(function () {
  const BUILD = "FINANZAS_V3_LEGACY_QUARANTINE_20260811";

  if (window.__FINANZAS_V3_LEGACY_QUARANTINE__) return;
  window.__FINANZAS_V3_LEGACY_QUARANTINE__ = true;

  function ensureStyle() {
    if (document.getElementById("finanzasV3LegacyQuarantineStyles")) return;

    const style = document.createElement("style");
    style.id = "finanzasV3LegacyQuarantineStyles";
    style.textContent = `
      body[data-page="finanzas"] #finTopTabs,
      body[data-page="finanzas"] .finTopTabsFallbackBar,
      body[data-page="finanzas"] #finCashflowCard,
      body[data-page="finanzas"] .appHeader__right {
        display:none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function quarantine() {
    if (document.body?.getAttribute("data-page") !== "finanzas") return;

    ensureStyle();

    document.querySelectorAll("#finTopTabs, .finTopTabsFallbackBar").forEach((node) => {
      node.style.setProperty("display", "none", "important");
      node.setAttribute("data-fin-v3-quarantined", "1");
    });

    const oldCashflow = document.getElementById("finCashflowCard");
    if (oldCashflow) {
      const section = oldCashflow.closest("section");
      const target = section || oldCashflow;
      target.style.setProperty("display", "none", "important");
      target.setAttribute("data-fin-v3-quarantined", "1");
    }

    document.querySelectorAll("main.main > [data-fin-view]").forEach((node) => {
      if (node.closest("#finanzasV3Root")) return;
      node.style.setProperty("display", "none", "important");
      node.setAttribute("data-fin-v3-quarantined", "1");
    });
  }

  function boot() {
    quarantine();

    if (!document.body || window.__FINANZAS_V3_LEGACY_OBSERVER__) return;

    window.__FINANZAS_V3_LEGACY_OBSERVER__ = new MutationObserver(() => {
      window.clearTimeout(window.__FINANZAS_V3_LEGACY_TIMER__);
      window.__FINANZAS_V3_LEGACY_TIMER__ = window.setTimeout(quarantine, 20);
    });

    window.__FINANZAS_V3_LEGACY_OBSERVER__.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log("[finanzas-v3] legacy quarantine OK", BUILD);
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);

  if (document.readyState !== "loading") boot();
})();


/* FINANZAS_V3_VISUAL_PATCH_20260811 */
(function () {
  if (document.getElementById("finanzasV3VisualPatch")) return;

  const style = document.createElement("style");
  style.id = "finanzasV3VisualPatch";
  style.textContent = `
    body[data-page="finanzas"] .finV3Tabs{
      display:flex;
      align-items:flex-end;
      gap:26px;
      overflow-x:auto;

      margin:0 0 18px;
      padding:0 0 0;

      border-bottom:1px solid rgba(255,255,255,.16);

      scrollbar-width:none;
    }

    body[data-page="finanzas"] .finV3Tabs::-webkit-scrollbar{
      display:none;
    }

    body[data-page="finanzas"] .finV3Tab{
      position:relative;

      display:inline-flex;
      align-items:center;
      gap:7px;

      flex:0 0 auto;

      min-height:44px;
      padding:0 2px 12px;

      border:0 !important;
      border-radius:0 !important;
      outline:0;

      background:transparent !important;
      box-shadow:none !important;

      color:rgba(255,255,255,.68);

      font-size:14px;
      font-weight:650;

      cursor:pointer;

      transition:
        color .16s ease,
        opacity .16s ease;
    }

    body[data-page="finanzas"] .finV3Tab:hover{
      color:#ffffff;
    }

    body[data-page="finanzas"] .finV3Tab.is-active{
      color:#ffffff;
      background:transparent !important;
      border:0 !important;
    }

    body[data-page="finanzas"] .finV3Tab.is-active::after{
      content:"";
      position:absolute;
      left:0;
      right:0;
      bottom:-1px;
      height:2px;
      background:#ffffff;
      border-radius:2px 2px 0 0;
    }

    body[data-page="finanzas"] .finV3Tab__icon{
      width:13px;
      height:13px;
      flex:0 0 13px;
      display:block;
      fill:currentColor;
      opacity:.88;
    }

    body[data-page="finanzas"] .finV3SummaryGrid{
      margin-top:0;
    }

    body[data-page="finanzas"] .finV3SummaryGrid.finV3Section{
      margin-top:12px;
    }

    body[data-page="finanzas"] .finV3SummaryCard__sub{
      margin-top:4px;
      font-size:12px;
      line-height:1.4;
    }

    body[data-page="finanzas"] .finV3SummaryCard .finCostCard__value{
      margin-top:2px;
    }

    @media(max-width:780px){
      body[data-page="finanzas"] .finV3Tabs{
        gap:20px;
      }

      body[data-page="finanzas"] .finV3Tab{
        min-height:42px;
        font-size:13px;
      }
    }
  `;

  document.head.appendChild(style);
})();


/* FINANZAS_V3_TABS_FLAT_20260811 */
(function () {
  if (document.getElementById("finanzasV3TabsFlat")) return;

  const style = document.createElement("style");
  style.id = "finanzasV3TabsFlat";
  style.textContent = `
    body[data-page="finanzas"] .finV3Tabs,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs{
      background:transparent !important;
    }

    body[data-page="finanzas"] .finV3Tabs .finV3Tab,
    body[data-page="finanzas"] .finV3Tabs .finV3Tab:hover,
    body[data-page="finanzas"] .finV3Tabs .finV3Tab:focus,
    body[data-page="finanzas"] .finV3Tabs .finV3Tab:focus-visible,
    body[data-page="finanzas"] .finV3Tabs .finV3Tab:active,
    body[data-page="finanzas"] .finV3Tabs .finV3Tab.is-active,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs .finV3Tab,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs .finV3Tab:hover,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs .finV3Tab:focus,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs .finV3Tab:active,
    body[data-page="finanzas"].finanzas-dark .finV3Tabs .finV3Tab.is-active{
      background:transparent !important;
      background-color:transparent !important;
      background-image:none !important;

      border-left:0 !important;
      border-right:0 !important;
      border-top:0 !important;

      box-shadow:none !important;
      filter:none !important;
      outline:none !important;

      -webkit-appearance:none;
      appearance:none;
    }

    body[data-page="finanzas"] .finV3Tabs .finV3Tab:hover{
      color:#ffffff !important;
    }

    body[data-page="finanzas"] .finV3Tabs .finV3Tab:not(.is-active){
      color:rgba(255,255,255,.68) !important;
    }

    body[data-page="finanzas"] .finV3Tabs .finV3Tab.is-active{
      color:#ffffff !important;
    }
  `;

  document.head.appendChild(style);
})();


/* FINANZAS_V3_FORCE_FLAT_TABS_20260811 */
(function () {
  function flattenTabs() {
    document.querySelectorAll(
      'body[data-page="finanzas"] .finV3Tabs .finV3Tab'
    ).forEach((tab) => {
      tab.style.setProperty("background", "transparent", "important");
      tab.style.setProperty("background-color", "transparent", "important");
      tab.style.setProperty("background-image", "none", "important");
      tab.style.setProperty("box-shadow", "none", "important");
      tab.style.setProperty("filter", "none", "important");
      tab.style.setProperty("border-radius", "0", "important");
    });
  }

  function boot() {
    flattenTabs();

    const root = document.getElementById("finanzasV3Root");
    if (!root || window.__FIN_V3_FLAT_TABS_OBSERVER__) return;

    window.__FIN_V3_FLAT_TABS_OBSERVER__ = new MutationObserver(flattenTabs);
    window.__FIN_V3_FLAT_TABS_OBSERVER__.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);

  if (document.readyState !== "loading") boot();
})();
