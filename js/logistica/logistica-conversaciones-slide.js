/* ==========================================================
   Protocol Data · Logística · Conversaciones · Slide detalle
   Fase 2: convierte el botón Ver en un detalle tipo chat.
   ========================================================== */

(function () {
  const PAGE_EVENT = 'sazzu:page:load';
  const READY_FLAG = '__protocolLogisticaConversacionesSlideReady';

  const conversations = [
    {
      conversation_id: 'CONV-ALP-0001',
      status: 'nueva',
      priority: 'alta',
      verified: true,
      tracking_id: 'ALP-000124',
      customer_email: 'cliente@email.com',
      shopify_order_name: '#1001',
      customer_name: 'Cliente Demo',
      customer_phone: '+54 9 11 0000-0001',
      product_name: 'Bandera Argentina para Capó | Pack x3',
      sku: 'ARG-CAPO-PACK3',
      variant_name: 'Pack x3',
      shipping_address: 'Recoleta, 1189, Capital Federal',
      locality: 'Recoleta',
      province: 'Capital Federal',
      postal_code: '1189',
      payment_status: 'No pagado · cobra repartidor',
      amount_to_collect: '$15.990,00',
      shipping_status: 'Recibido',
      logistics_status: 'Preparación pendiente',
      estimated_delivery: 'Mañana · 14:00 a 18:00',
      reason: 'Quiero saber cuándo llega',
      created_at: '2026-06-04 10:42',
      assigned_to: 'Sin asignar',
      messages: [
        { sender: 'customer', name: 'Cliente Demo', body: 'Hola, completé el ID de seguimiento y necesito confirmar el horario de entrega.', at: '2026-06-04 10:42' },
        { sender: 'system', name: 'Sistema', body: 'Conversación verificada por tracking + correo electrónico. Compra asociada automáticamente.', at: '2026-06-04 10:42' }
      ]
    },
    {
      conversation_id: 'CONV-ALP-0002',
      status: 'en_proceso',
      priority: 'media',
      verified: true,
      tracking_id: 'ALP-000125',
      customer_email: 'comprador@email.com',
      shopify_order_name: '#1002',
      customer_name: 'Comprador Demo',
      customer_phone: '+54 9 11 0000-0002',
      product_name: 'Sombrero Mundialista Argentina',
      sku: 'SOM-ARG-GOMA',
      variant_name: 'Único',
      shipping_address: 'Palermo, 1414, Capital Federal',
      locality: 'Palermo',
      province: 'Capital Federal',
      postal_code: '1414',
      payment_status: 'Pagado',
      amount_to_collect: '$0,00',
      shipping_status: 'En camino',
      logistics_status: 'Distribución activa',
      estimated_delivery: 'Hoy · 16:00 a 20:00',
      reason: 'Cambiar datos de entrega',
      created_at: '2026-06-04 09:18',
      assigned_to: 'Logística',
      messages: [
        { sender: 'customer', name: 'Comprador Demo', body: 'Necesito ajustar el departamento antes de que llegue el repartidor.', at: '2026-06-04 09:18' },
        { sender: 'operator', name: 'Logística', body: 'Perfecto. Pasame el dato exacto del departamento y lo dejamos registrado como observación interna.', at: '2026-06-04 09:44' }
      ]
    },
    {
      conversation_id: 'CONV-ALP-0003',
      status: 'respondida',
      priority: 'alta',
      verified: false,
      tracking_id: 'ALP-000126',
      customer_email: 'usuario@email.com',
      shopify_order_name: '#1003',
      customer_name: 'Usuario Intervenido',
      customer_phone: '+54 9 11 0000-0003',
      product_name: 'Combo Accesorios Mundialistas',
      sku: 'COMBO-MUNDIAL-01',
      variant_name: 'Combo',
      shipping_address: 'Av. Siempre Viva 742, Buenos Aires',
      locality: 'Sin validar',
      province: 'Buenos Aires',
      postal_code: '9999',
      payment_status: 'No pagado · cobra repartidor',
      amount_to_collect: '$29.990,00',
      shipping_status: 'Despachado',
      logistics_status: 'Intervenido por dirección',
      estimated_delivery: 'A confirmar por incidencia',
      reason: 'Pedido demorado o intervenido',
      created_at: '2026-06-03 18:21',
      assigned_to: 'Soporte',
      messages: [
        { sender: 'customer', name: 'Usuario Intervenido', body: 'El CP no coincide con mi localidad. Ya envié la dirección corregida.', at: '2026-06-03 18:21' },
        { sender: 'operator', name: 'Soporte', body: 'Recibido. Dejamos el pedido intervenido hasta validar el domicilio con logística.', at: '2026-06-04 08:05' }
      ]
    }
  ];

  const statusLabels = { nueva: 'Nueva', en_proceso: 'En proceso', respondida: 'Respondida', cerrada: 'Cerrada' };
  const statusClasses = { nueva: 'logBadge--blue', en_proceso: 'logBadge--orange', respondida: 'logBadge--green', cerrada: 'logBadge--gray' };
  const priorityLabels = { alta: 'Alta', media: 'Media', baja: 'Baja' };

  function root() { return document.querySelector('main.logisticsMain'); }
  function esc(value) { return String(value || '—').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c])); }

  function ensureStyles() {
    if (document.getElementById('logConversationSlideStyles')) return;
    const style = document.createElement('style');
    style.id = 'logConversationSlideStyles';
    style.textContent = `
      .logConversationSlide{position:fixed;inset:0;z-index:2147483000;visibility:hidden;pointer-events:none}.logConversationSlide.is-open{visibility:visible;pointer-events:auto}.logConversationSlide__overlay{position:absolute;inset:0;border:0;background:rgba(15,23,42,.42);opacity:0;transition:opacity .18s ease}.logConversationSlide.is-open .logConversationSlide__overlay{opacity:1}.logConversationSlide__panel{position:absolute;top:0;right:0;bottom:0;width:min(94vw,760px);background:#ededed;transform:translateX(105%);transition:transform .24s cubic-bezier(.22,1,.36,1);box-shadow:-18px 0 48px rgba(15,23,42,.2);overflow-y:auto}.logConversationSlide.is-open .logConversationSlide__panel{transform:translateX(0)}.logConversationSlide__header{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:44px minmax(0,1fr)44px;align-items:center;gap:10px;min-height:62px;padding:10px 14px;background:#2479ff;color:#fff}.logConversationSlide__close{width:38px;height:38px;border:0;border-radius:12px;background:rgba(255,255,255,.16);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.logConversationSlide__close svg{width:24px;height:24px}.logConversationSlide__title{display:grid;gap:3px}.logConversationSlide__title strong{font-size:16px;font-weight:950;line-height:1}.logConversationSlide__title span{font-size:12px;font-weight:700;opacity:.86}.logConversationSlide__content{display:grid;gap:14px;padding:14px}.logConversationDetailGrid{display:grid;grid-template-columns:minmax(0,1fr)280px;gap:14px}.logConversationBox{background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.06);padding:14px}.logConversationBox__head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.logConversationBox__head strong{color:#252a32;font-size:15px;font-weight:950}.logConversationBox__head span{color:#697386;font-size:12px;font-weight:800}.logConversationChat{display:grid;gap:10px}.logConversationBubble{max-width:82%;display:grid;gap:5px;padding:11px 12px;border-radius:16px}.logConversationBubble--customer{justify-self:start;background:#fff;border:1px solid #dde1e8}.logConversationBubble--operator{justify-self:end;background:#2479ff;color:#fff}.logConversationBubble--system{justify-self:center;max-width:92%;background:#f7faff;border:1px dashed #b9cfff;color:#2479ff;text-align:center}.logConversationBubble strong{font-size:12px;font-weight:950}.logConversationBubble p{margin:0;font-size:13px;line-height:1.35;font-weight:650}.logConversationBubble small{font-size:11px;font-weight:750;opacity:.72}.logConversationReply{display:grid;gap:10px;margin-top:12px}.logConversationReply textarea{min-height:96px;border:1px solid rgba(15,23,42,.12);border-radius:14px;background:#fff;color:#252a32;font:inherit;padding:12px;resize:vertical;outline:none}.logConversationReply textarea:focus{border-color:#2479ff;box-shadow:0 0 0 4px rgba(36,121,255,.12)}.logConversationReply__actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.logConversationDataList{display:grid;gap:10px}.logConversationDataItem{display:grid;gap:4px;padding:10px 0;border-bottom:1px solid rgba(15,23,42,.08)}.logConversationDataItem:last-child{border-bottom:0}.logConversationDataItem span{color:#697386;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.logConversationDataItem strong{color:#252a32;font-size:13px;font-weight:850;line-height:1.3}.logConversationStatusRow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}@media(max-width:900px){.logConversationDetailGrid{grid-template-columns:1fr}.logConversationSlide__panel{width:100vw}.logConversationBubble{max-width:94%}}
    `;
    document.head.appendChild(style);
  }

  function ensureSlide() {
    const main = root();
    if (!main || main.querySelector('#logConversationSlide')) return;
    const slide = document.createElement('section');
    slide.className = 'logConversationSlide';
    slide.id = 'logConversationSlide';
    slide.setAttribute('aria-hidden', 'true');
    slide.innerHTML = `
      <button class="logConversationSlide__overlay" id="logConversationSlideOverlay" type="button" aria-label="Cerrar conversación"></button>
      <aside class="logConversationSlide__panel" role="dialog" aria-modal="true" aria-label="Detalle de conversación">
        <header class="logConversationSlide__header">
          <button class="logConversationSlide__close" id="logConversationSlideClose" type="button" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18 9 12l6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="logConversationSlide__title"><strong id="logConversationSlideTitle">Conversación</strong><span id="logConversationSlideSubtitle">Soporte logístico</span></div>
          <div style="width:38px" aria-hidden="true"></div>
        </header>
        <div class="logConversationSlide__content" id="logConversationSlideContent"></div>
      </aside>`;
    main.appendChild(slide);
  }

  function messageBubble(message) {
    const type = message.sender === 'operator' ? 'operator' : message.sender === 'system' ? 'system' : 'customer';
    return `<div class="logConversationBubble logConversationBubble--${type}"><strong>${esc(message.name)}</strong><p>${esc(message.body)}</p><small>${esc(message.at)}</small></div>`;
  }

  function dataItem(label, value) {
    return `<div class="logConversationDataItem"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function openSlide(id) {
    const main = root();
    const item = conversations.find(row => row.conversation_id === id);
    const slide = main?.querySelector('#logConversationSlide');
    const content = main?.querySelector('#logConversationSlideContent');
    if (!item || !slide || !content) return;

    main.querySelector('#logConversationSlideTitle').textContent = item.conversation_id;
    main.querySelector('#logConversationSlideSubtitle').textContent = `${item.customer_name} · ${item.tracking_id}`;
    content.innerHTML = `
      <div class="logConversationStatusRow">
        <span class="logBadge ${statusClasses[item.status] || 'logBadge--gray'}">${esc(statusLabels[item.status] || item.status)}</span>
        <span class="logBadge ${item.priority === 'alta' ? 'logBadge--red' : item.priority === 'media' ? 'logBadge--orange' : 'logBadge--gray'}">Prioridad ${esc(priorityLabels[item.priority] || item.priority)}</span>
        <span class="logConversationVerified ${item.verified ? 'logConversationVerified--yes' : 'logConversationVerified--no'}">${item.verified ? 'Verificada por tracking + email' : 'Pendiente de verificación'}</span>
      </div>
      <div class="logConversationDetailGrid">
        <section class="logConversationBox">
          <div class="logConversationBox__head"><div><strong>Historial de conversación</strong><span>Vista tipo chat preparada para Supabase</span></div></div>
          <div class="logConversationChat">${(item.messages || []).map(messageBubble).join('')}</div>
          <form class="logConversationReply" data-log-conversation-reply="${esc(item.conversation_id)}">
            <textarea placeholder="Escribir respuesta interna para el cliente..."></textarea>
            <div class="logConversationReply__actions">
              <button class="btn btn--secondary" type="button">Guardar borrador</button>
              <button class="btn btn--primary" type="submit">Enviar respuesta</button>
            </div>
          </form>
        </section>
        <aside class="logConversationBox">
          <div class="logConversationBox__head"><div><strong>Datos de compra</strong><span>Contexto operativo asociado</span></div></div>
          <div class="logConversationDataList">
            ${dataItem('Cliente', item.customer_name)}${dataItem('Email', item.customer_email)}${dataItem('Teléfono', item.customer_phone)}${dataItem('Tracking', item.tracking_id)}${dataItem('Pedido Shopify', item.shopify_order_name)}${dataItem('Producto', item.product_name)}${dataItem('SKU / variante', `${item.sku} · ${item.variant_name}`)}${dataItem('Dirección', item.shipping_address)}${dataItem('Localidad / provincia', `${item.locality} · ${item.province}`)}${dataItem('Código postal', item.postal_code)}${dataItem('Pago', item.payment_status)}${dataItem('Monto a cobrar', item.amount_to_collect)}${dataItem('Estado envío', item.shipping_status)}${dataItem('Estado logístico', item.logistics_status)}${dataItem('Entrega estimada', item.estimated_delivery)}${dataItem('Motivo', item.reason)}${dataItem('Responsable', item.assigned_to)}
          </div>
        </aside>
      </div>`;

    slide.classList.add('is-open');
    slide.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('logSlideLock');
    document.body.classList.add('logSlideLock');
  }

  function closeSlide() {
    const slide = root()?.querySelector('#logConversationSlide');
    if (!slide) return;
    slide.classList.remove('is-open');
    slide.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('logSlideLock');
    document.body.classList.remove('logSlideLock');
  }

  function bind() {
    const main = root();
    if (!main || main.dataset.logisticaConversacionesSlideBound === '1') return;
    main.dataset.logisticaConversacionesSlideBound = '1';

    main.addEventListener('click', event => {
      const open = event.target.closest('[data-log-open-conversation]');
    
      if (open && open.dataset.logOpenConversationReal === '1') {
        return;
      }
    
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openSlide(open.dataset.logOpenConversation);
        return;
      }
    
      if (event.target.closest('#logConversationSlideOverlay') || event.target.closest('#logConversationSlideClose')) {
        closeSlide();
      }
    }, true);

    main.addEventListener('submit', event => {
      const form = event.target.closest('[data-log-conversation-reply]');
      if (!form) return;
      event.preventDefault();
      const textarea = form.querySelector('textarea');
      const value = (textarea?.value || '').trim();
      if (!value) return;
      alert('Próxima fase: guardar esta respuesta en la tabla support_messages y enviar aviso al cliente.');
    });

    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSlide(); });
  }

  function boot() {
    const main = root();
    if (!main) return;
    if (window[READY_FLAG] && main.dataset.logisticaConversacionesSlideBooted === '1') return;
    window[READY_FLAG] = true;
    main.dataset.logisticaConversacionesSlideBooted = '1';
    ensureStyles();
    ensureSlide();
    bind();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener(PAGE_EVENT, boot);
  if (document.readyState !== 'loading') boot();
})();
