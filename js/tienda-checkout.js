(function () {
  function initCheckoutEditor() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.checkoutReady === '1') return;
    root.dataset.checkoutReady = '1';

    const sidePanel = root.querySelector('.builderSidePanel');
    const editor = root.querySelector('[data-builder-inner-editor]');
    const body = editor && editor.querySelector('.builderInnerEditor__body');
    const title = editor && editor.querySelector('.builderInnerEditor__header strong');
    const section = editor && editor.querySelector('.builderInnerEditor__header span');
    const previewPanel = root.querySelector('.builderPreviewPanel');

    const checkoutState = {
      showBanner: true,
      showSummary: true,
      showBuyer: true,
      showAddress: true,
      showDelivery: true,
      showPayment: true,
      showConfirm: true,
      checkoutOrder: 'Código postal primero',
      bannerPosition: 'Antes de código postal',
      bannerType: 'General',
      bannerTitle: 'Envíos disponibles por zona',
      bannerText: 'El costo final se calcula después de validar el código postal.',
      postalFieldLabel: 'Código postal',
      postalButtonText: 'Validar zona',
      postalValidMessage: 'Llegamos a tu zona · Envío estimado $1.000',
      postalInvalidMessage: 'Todavía no llegamos a esta zona.',
      postalValue: '1425',
      postalStatus: 'valid',
      postalRequiredBeforePayment: true,
      postalBlockUnavailable: true,
      postalShowShippingCost: true,
      postalShowDeliveryPromise: true,
      postalDataSource: 'Manual temporal',
      summaryShowProducts: true,
      summaryAllowQty: true,
      summaryAllowRemove: true,
      summaryShowSubtotal: true,
      summaryShowShipping: true,
      summaryShowTotal: true,
      summaryNote: 'El costo de envío se calcula al validar tu código postal.',
      buyerName: true,
      buyerWhatsapp: true,
      buyerEmail: true,
      buyerNotes: true,
      buyerGuest: true,
      buyerLogin: false,
      addressStreet: true,
      addressNumber: true,
      addressApartment: true,
      addressLocality: true,
      addressReference: true,
      addressFormat: 'Calle + número + piso/referencia',
      deliveryHome: true,
      deliveryPickup: true,
      deliveryShowEta: true,
      deliveryShowCost: true,
      deliveryRule: 'Código postal primero',
      paymentOnline: true,
      paymentCash: true,
      paymentTransfer: false,
      paymentGateway: 'Mercado Pago',
      paymentCashText: 'Pagás cuando recibís tu pedido.',
      cashEnabled: true,
      cashRequireZone: true,
      cashWhatsapp: true,
      cashNote: 'Pagás cuando recibís tu pedido.',
      cashAvailability: 'Todas las zonas activas',
      confirmButtonText: 'Confirmar pedido',
      confirmHelpText: 'Te contactaremos para confirmar disponibilidad y horario.',
      confirmManualNote: true,
      confirmFutureOrder: true
    };

    function emitBuilderChange() {
      root.dispatchEvent(new CustomEvent('sazzu:builder:change', { bubbles: true }));
    }

    function isCheckoutActive() {
      const tab = root.querySelector('[data-builder-tab="checkout"]');
      return !!(tab && tab.classList.contains('is-active'));
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function updateCheckoutState(key, value) {
      checkoutState[key] = value;
      if (isCheckoutActive()) renderCheckoutPreview();
      emitBuilderChange();
    }

    function ensureCheckoutCards() {
      const checkoutPanel = root.querySelector('[data-builder-panel="checkout"]');
      const grid = checkoutPanel && checkoutPanel.querySelector('.builderToolGrid');
      if (!grid || grid.dataset.checkoutCardsReady === '1') return;
      grid.dataset.checkoutCardsReady = '1';

      grid.innerHTML = '' +
        '<button class="builderToolCard" type="button"><span>▥</span><strong>Estructura</strong></button>' +
        '<button class="builderToolCard" type="button"><span>▤</span><strong>Resumen pedido</strong></button>' +
        '<button class="builderToolCard" type="button"><span>CP</span><strong>Validación postal</strong></button>' +
        '<button class="builderToolCard" type="button"><span>▰</span><strong>Banner checkout</strong></button>' +
        '<button class="builderToolCard" type="button"><span>☑</span><strong>Datos comprador</strong></button>' +
        '<button class="builderToolCard" type="button"><span>⌂</span><strong>Dirección</strong></button>' +
        '<button class="builderToolCard" type="button"><span>⇄</span><strong>Método de entrega</strong></button>' +
        '<button class="builderToolCard" type="button"><span>$</span><strong>Método de pago</strong></button>' +
        '<button class="builderToolCard" type="button"><span>↯</span><strong>Contra-entrega</strong></button>' +
        '<button class="builderToolCard" type="button"><span>✓</span><strong>Confirmación</strong></button>';
    }

    function makeToggle(label, note, key) {
      const row = document.createElement('div');
      const input = document.createElement('input');
      const visual = document.createElement('span');
      const copy = document.createElement('div');
      const strong = document.createElement('strong');
      const small = document.createElement('small');

      row.className = 'builderToggleRow';
      row.style.position = 'relative';
      row.style.userSelect = 'none';

      input.type = 'checkbox';
      input.checked = checkoutState[key] !== false;
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      strong.textContent = label;
      small.textContent = note;

      copy.appendChild(strong);
      copy.appendChild(small);
      row.appendChild(input);
      row.appendChild(visual);
      row.appendChild(copy);

      row.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        input.checked = !input.checked;
        updateCheckoutState(key, input.checked);
      });

      return row;
    }

    function makeSelect(label, key, options, note) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const select = document.createElement('select');
      const hint = document.createElement('p');

      field.className = 'builderFormField';
      span.textContent = label;

      options.forEach(function (item) {
        const option = document.createElement('option');
        option.textContent = item;
        option.value = item;
        select.appendChild(option);
      });

      select.value = checkoutState[key] || options[0] || '';
      select.addEventListener('change', function () { updateCheckoutState(key, select.value); });

      hint.className = 'builderFieldHint';
      hint.textContent = note || '';

      field.appendChild(span);
      field.appendChild(select);
      field.appendChild(hint);

      return field;
    }

    function makeText(label, key, note) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const input = document.createElement('input');
      const hint = document.createElement('p');

      field.className = 'builderFormField';
      span.textContent = label;
      input.type = 'text';
      input.value = checkoutState[key] || '';
      input.addEventListener('input', function () { updateCheckoutState(key, input.value); });
      input.addEventListener('change', function () { updateCheckoutState(key, input.value); });

      hint.className = 'builderFieldHint';
      hint.textContent = note || '';

      field.appendChild(span);
      field.appendChild(input);
      field.appendChild(hint);

      return field;
    }

    function makeCheckoutPreview() {
      const box = document.createElement('section');
      const card = document.createElement('article');
      const h = document.createElement('strong');
      const steps = [
        ['Código postal', true],
        ['Banner checkout', checkoutState.showBanner],
        ['Resumen del pedido', checkoutState.showSummary],
        ['Datos del comprador', checkoutState.showBuyer],
        ['Dirección', checkoutState.showAddress],
        ['Método de entrega', checkoutState.showDelivery],
        ['Método de pago', checkoutState.showPayment],
        ['Confirmación', checkoutState.showConfirm]
      ];
      const total = document.createElement('div');

      box.style.cssText = 'display:block;background:transparent;margin:0;padding:0;';
      card.style.cssText = 'display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.08);';
      h.textContent = 'Vista checkout';
      h.style.cssText = 'color:#111827;font-size:15px;font-weight:950;';

      card.appendChild(h);

      steps.forEach(function (item, index) {
        const step = document.createElement('div');
        const isActive = item[1] !== false;
        step.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border-radius:5px;background:' + (isActive ? '#f8fafc' : '#f3f4f6') + ';color:#475467;font-size:12px;font-weight:800;';
        step.innerHTML = '<span>' + (index + 1) + '. ' + item[0] + '</span><b style="color:' + (isActive ? '#2479ff' : '#98a2b3') + ';">' + (isActive ? 'Activo' : 'Oculto') + '</b>';
        card.appendChild(step);
      });

      total.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:950;';
      total.innerHTML = '<span>Total simulado</span><b>$ 22.700</b>';

      card.appendChild(total);
      box.appendChild(card);

      return box;
    }

    function renderCheckoutPreview() {
      if (!previewPanel) return;

      const currentPhone = previewPanel.querySelector('[data-live-preview-mode="checkout"]');
      const previousScroll = currentPhone ? currentPhone.scrollTop : 0;

      previewPanel.innerHTML = '';
      previewPanel.style.padding = '0';
      previewPanel.style.background = 'transparent';
      previewPanel.style.boxShadow = 'none';
      previewPanel.style.border = '0';

      const phone = document.createElement('section');
      phone.setAttribute('data-live-store-phone', '');
      phone.setAttribute('data-live-preview-mode', 'checkout');
      phone.style.cssText = 'width:min(430px,100%);height:760px;margin:0 auto;background:#fff7ea;border-radius:5px;overflow:auto;box-shadow:0 24px 60px rgba(15,23,42,.14);border:1px solid rgba(15,23,42,.08);font-family:inherit;position:relative;scrollbar-width:none;';

      phone.innerHTML = '' +
        checkoutHeader() +
        checkoutBannerSection() +
        checkoutPostalSection() +
        checkoutSummarySection() +
        checkoutBuyerSection() +
        checkoutAddressSection() +
        checkoutDeliverySection() +
        checkoutPaymentSection() +
        checkoutConfirmSection();

      previewPanel.appendChild(phone);
      window.requestAnimationFrame(function () { phone.scrollTop = previousScroll; });
    }

    function checkoutHeader() {
      return '<header style="position:sticky;top:0;z-index:10;display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;align-items:center;padding:14px 16px;background:#fff;border-bottom:1px solid #f1d4be;">' +
        '<button type="button" style="width:38px;height:38px;border:0;border-radius:999px;background:#fff1df;color:#9c2448;font-size:22px;font-weight:950;">‹</button>' +
        '<div style="display:grid;gap:2px;"><strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Finalizar pedido</strong><span style="color:#667085;font-size:12px;font-weight:750;">Validá tu zona y completá tus datos</span></div>' +
      '</header>';
    }

    function checkoutBannerSection() {
      if (!checkoutState.showBanner) return '';
      return '<section data-live-edit-zone="checkout-banner" data-live-zone-label="Banner checkout" style="position:relative;padding:14px 16px 10px;background:#fff7ea;">' +
        '<article style="display:grid;grid-template-columns:34px minmax(0,1fr);gap:11px;align-items:center;padding:13px;border-radius:5px;background:linear-gradient(135deg,#9c2448,#d99837);color:#fff;box-shadow:0 12px 24px rgba(156,36,72,.16);">' +
          '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,.18);font-weight:950;">%</span>' +
          '<div><strong style="display:block;font-size:14px;font-weight:950;line-height:1.15;">' + escapeHtml(checkoutState.bannerTitle) + '</strong><small style="display:block;margin-top:3px;font-size:11px;font-weight:750;opacity:.9;">' + escapeHtml(checkoutState.bannerText) + '</small></div>' +
        '</article>' +
      '</section>';
    }

    function checkoutPostalSection() {
      const isInvalid = checkoutState.postalStatus === 'invalid';
      const message = isInvalid ? checkoutState.postalInvalidMessage : checkoutState.postalValidMessage;
      const messageBg = isInvalid ? '#fff1f3' : '#ecfdf3';
      const messageColor = isInvalid ? '#b42318' : '#027a48';

      return '<section data-live-edit-zone="checkout-postal" data-live-zone-label="Validación postal" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
        '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div><span style="display:block;color:#9c2448;font-size:11px;font-weight:950;letter-spacing:.11em;">PASO 1</span><strong style="display:block;color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">' + escapeHtml(checkoutState.postalFieldLabel) + '</strong></div><b style="color:#027a48;background:#ecfdf3;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:950;">Primero</b></div>' +
          '<div style="display:grid;grid-template-columns:minmax(0,1fr)94px;gap:8px;"><input value="' + escapeHtml(checkoutState.postalValue) + '" readonly style="height:42px;border:1px solid #efcdb9;border-radius:5px;padding:0 12px;background:#fff;color:#211f27;font-size:14px;font-weight:850;"><button type="button" style="border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:12px;font-weight:950;">' + escapeHtml(checkoutState.postalButtonText) + '</button></div>' +
          '<p style="margin:0;padding:10px;border-radius:5px;background:' + messageBg + ';color:' + messageColor + ';font-size:12px;font-weight:850;">' + escapeHtml(message) + '</p>' +
        '</article>' +
      '</section>';
    }

    function checkoutSummarySection() {
      if (!checkoutState.showSummary) return '';

      const rows = checkoutState.summaryShowProducts ? checkoutRow('Box Dulce Nube', '1', '$ 9.800') + checkoutRow('Merienda Dúo', '1', '$ 12.900') : '<p style="margin:0;color:#667085;font-size:12px;font-weight:750;">Los productos están ocultos en el resumen.</p>';
      const totals = '' +
        (checkoutState.summaryShowSubtotal ? '<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><b>$ 22.700</b></div>' : '') +
        (checkoutState.summaryShowShipping ? '<div style="display:flex;justify-content:space-between;"><span>Envío</span><b>$ 1.000</b></div>' : '') +
        (checkoutState.summaryShowTotal ? '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:950;"><span>Total</span><b>$ 23.700</b></div>' : '');

      return '<section data-live-edit-zone="checkout-summary" data-live-zone-label="Resumen pedido" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
        '<article style="display:grid;gap:12px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Resumen del pedido</strong><span style="color:#9c2448;font-size:12px;font-weight:950;">Editar</span></div>' +
          rows +
          '<p style="margin:0;color:#667085;font-size:12px;line-height:1.35;">' + escapeHtml(checkoutState.summaryNote) + '</p>' +
          '<div style="display:grid;gap:7px;padding-top:10px;border-top:1px solid #f0dac8;color:#211f27;font-size:13px;font-weight:850;">' + totals + '</div>' +
        '</article>' +
      '</section>';
    }

    function checkoutBuyerSection() {
      if (!checkoutState.showBuyer) return '';

      const fields = [];
      if (checkoutState.buyerName) fields.push('Nombre completo');
      if (checkoutState.buyerWhatsapp) fields.push('WhatsApp');
      if (checkoutState.buyerEmail) fields.push('Correo opcional');
      if (checkoutState.buyerNotes) fields.push('Notas del pedido');

      return '<section data-live-edit-zone="checkout-buyer" data-live-zone-label="Datos comprador" style="position:relative;padding:10px 16px;background:#fff7ea;">' + checkoutBlock('Datos del comprador', fields) + '</section>';
    }

    function checkoutAddressSection() {
      if (!checkoutState.showAddress) return '';

      const fields = [];
      if (checkoutState.addressStreet) fields.push('Calle');
      if (checkoutState.addressNumber) fields.push('Número');
      if (checkoutState.addressApartment) fields.push('Piso / departamento');
      if (checkoutState.addressLocality) fields.push('Localidad');
      if (checkoutState.addressReference) fields.push('Referencia');

      return '<section data-live-edit-zone="checkout-address" data-live-zone-label="Dirección" style="position:relative;padding:10px 16px;background:#fff7ea;">' + checkoutBlock('Dirección de entrega', fields) + '</section>';
    }

    function checkoutDeliverySection() {
      if (!checkoutState.showDelivery) return '';

      const options = '' +
        (checkoutState.deliveryHome ? optionPill('Envío a domicilio', checkoutState.deliveryShowEta ? 'Llega hoy' : 'Disponible', true) : '') +
        (checkoutState.deliveryPickup ? optionPill('Retiro por local', 'Disponible', !checkoutState.deliveryHome) : '') +
        (!checkoutState.deliveryHome && !checkoutState.deliveryPickup ? '<p style="margin:0;color:#667085;font-size:12px;font-weight:750;">No hay métodos de entrega visibles.</p>' : '');

      return '<section data-live-edit-zone="checkout-delivery" data-live-zone-label="Método de entrega" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
        '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
          '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Método de entrega</strong>' + options +
        '</article>' +
      '</section>';
    }

    function checkoutPaymentSection() {
      if (!checkoutState.showPayment) return '';

      const options = '' +
        (checkoutState.paymentCash && checkoutState.cashEnabled ? optionPill('Pago contra-entrega', 'Activo', true) : '') +
        (checkoutState.paymentTransfer ? optionPill('Transferencia', 'Opcional', false) : '') +
        (checkoutState.paymentOnline ? optionPill(checkoutState.paymentGateway, 'Futuro', false) : '') +
        (!checkoutState.paymentCash && !checkoutState.paymentTransfer && !checkoutState.paymentOnline ? '<p style="margin:0;color:#667085;font-size:12px;font-weight:750;">No hay métodos de pago visibles.</p>' : '');

      return '<section data-live-edit-zone="checkout-payment" data-live-zone-label="Método de pago" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
        '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
          '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Método de pago</strong>' + options +
          '<p style="margin:0;color:#667085;font-size:12px;line-height:1.35;">' + escapeHtml(checkoutState.paymentCashText) + '</p>' +
        '</article>' +
      '</section>';
    }

    function checkoutConfirmSection() {
      if (!checkoutState.showConfirm) return '';

      return '<section data-live-edit-zone="checkout-confirm" data-live-zone-label="Confirmación" style="position:relative;padding:10px 16px 28px;background:#fff7ea;">' +
        '<button type="button" style="width:100%;height:50px;border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:15px;font-weight:950;box-shadow:0 12px 24px rgba(156,36,72,.22);">' + escapeHtml(checkoutState.confirmButtonText) + '</button>' +
        '<p style="margin:10px 0 0;color:#667085;font-size:12px;line-height:1.35;text-align:center;">' + escapeHtml(checkoutState.confirmHelpText) + '</p>' +
      '</section>';
    }

    function checkoutRow(name, qty, price) {
      return '<div style="display:grid;grid-template-columns:minmax(0,1fr)34px 72px;gap:8px;align-items:center;color:#211f27;font-size:13px;"><strong style="font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(name) + '</strong><span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:#fff1df;color:#9c2448;font-weight:950;">' + escapeHtml(qty) + '</span><b style="text-align:right;font-weight:950;">' + escapeHtml(price) + '</b></div>';
    }

    function checkoutBlock(blockTitle, fields) {
      const fieldList = fields && fields.length ? fields.map(fakeInput).join('') : '<p style="margin:0;color:#667085;font-size:12px;font-weight:750;">Todos los campos de este bloque están ocultos.</p>';

      return '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
        '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">' + escapeHtml(blockTitle) + '</strong>' + fieldList +
      '</article>';
    }

    function fakeInput(label) {
      return '<div style="height:42px;display:flex;align-items:center;padding:0 12px;border:1px solid #efcdb9;border-radius:5px;background:#fff;color:#98a2b3;font-size:13px;font-weight:800;">' + escapeHtml(label) + '</div>';
    }

    function optionPill(optionTitle, meta, active) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-radius:5px;border:1px solid ' + (active ? '#9c2448' : '#efcdb9') + ';background:' + (active ? '#fff1df' : '#fff') + ';color:#211f27;font-size:13px;font-weight:850;"><span>' + escapeHtml(optionTitle) + '</span><b style="color:' + (active ? '#9c2448' : '#667085') + ';font-size:11px;font-weight:950;">' + escapeHtml(meta) + '</b></div>';
    }

    function openBase(panelTitle) {
      if (!sidePanel || !editor || !body) return false;
      body.innerHTML = '';
      if (section) section.textContent = 'Checkout';
      if (title) title.textContent = panelTitle;
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
      return true;
    }

    function openEstructura() {
      if (!openBase('Estructura')) return;
      body.appendChild(makeCheckoutPreview());
      body.appendChild(makeSelect('Orden del checkout', 'checkoutOrder', ['Código postal primero', 'Resumen primero', 'Datos del comprador primero'], 'Define el primer paso visible. Recomendado: código postal primero para validar zona antes de pago.'));
      body.appendChild(makeToggle('Mostrar banner checkout', 'Muestra un aviso superior antes de validar zona o pagar.', 'showBanner'));
      body.appendChild(makeToggle('Mostrar resumen del pedido', 'Muestra productos, agregados, descuentos y total antes de confirmar.', 'showSummary'));
      body.appendChild(makeToggle('Mostrar datos comprador', 'Solicita nombre, WhatsApp y correo según reglas del comercio.', 'showBuyer'));
      body.appendChild(makeToggle('Mostrar dirección', 'Solicita dirección completa cuando el pedido requiere envío.', 'showAddress'));
      body.appendChild(makeToggle('Mostrar método de entrega', 'Permite elegir envío a domicilio o retiro por local.', 'showDelivery'));
      body.appendChild(makeToggle('Mostrar método de pago', 'Permite elegir pago contra-entrega, transferencia o pasarela futura.', 'showPayment'));
      body.appendChild(makeToggle('Mostrar confirmación', 'Muestra el botón final y el texto inferior de confianza.', 'showConfirm'));
    }

    function openResumen() {
      if (!openBase('Resumen pedido')) return;
      body.appendChild(makeToggle('Mostrar productos agregados', 'Lista los productos seleccionados antes de confirmar.', 'summaryShowProducts'));
      body.appendChild(makeToggle('Permitir editar cantidades', 'Deja preparado el comportamiento para modificar unidades dentro del checkout.', 'summaryAllowQty'));
      body.appendChild(makeToggle('Permitir quitar productos', 'Reduce fricción si el comprador quiere ajustar el pedido.', 'summaryAllowRemove'));
      body.appendChild(makeToggle('Mostrar subtotal', 'Muestra el total de productos antes del envío.', 'summaryShowSubtotal'));
      body.appendChild(makeToggle('Mostrar costo de envío', 'Se completa después de validar código postal.', 'summaryShowShipping'));
      body.appendChild(makeToggle('Mostrar total final', 'Suma subtotal, envío y futuros descuentos.', 'summaryShowTotal'));
      body.appendChild(makeText('Nota previa a validar zona', 'summaryNote', 'Microcopy visible cuando todavía no hay zona confirmada.'));
    }

    function openPostal() {
      if (!openBase('Validación postal')) return;
      body.appendChild(makeText('Campo visible', 'postalFieldLabel', 'Primer dato recomendado para validar zona, costo y promesa de entrega.'));
      body.appendChild(makeText('CP visible de prueba', 'postalValue', 'Dato mockeado para la preview. La simulación real queda para Fase 3.'));
      body.appendChild(makeText('Texto del botón', 'postalButtonText', 'Acción principal del primer paso.'));
      body.appendChild(makeText('Mensaje zona disponible', 'postalValidMessage', 'Mensaje positivo después de validar.'));
      body.appendChild(makeText('Mensaje zona no disponible', 'postalInvalidMessage', 'Mensaje negativo sin bloquear la evolución futura del sistema.'));
      body.appendChild(makeSelect('Estado visual temporal', 'postalStatus', ['valid', 'invalid', 'idle'], 'Base preparada para Fase 3. Todavía no valida datos reales.'));
      body.appendChild(makeToggle('Validar código postal antes de mostrar medios de pago', 'Evita pedidos desde zonas no operativas.', 'postalRequiredBeforePayment'));
      body.appendChild(makeToggle('Bloquear compra si la zona no está disponible', 'Si se apaga, permite consulta manual aunque no haya cobertura.', 'postalBlockUnavailable'));
      body.appendChild(makeToggle('Mostrar costo de envío después de validar CP', 'El costo vendrá del futuro motor de Envíos.', 'postalShowShippingCost'));
      body.appendChild(makeToggle('Mostrar promesa de entrega estimada', 'Ej: Llega hoy, llega mañana o llega entre 2 y 4 días.', 'postalShowDeliveryPromise'));
      body.appendChild(makeSelect('Fuente de datos para validar', 'postalDataSource', ['Manual temporal', 'CSV futuro', 'Supabase futuro', 'Google Sheets futuro'], 'TODO: este checkout consumirá reglas del futuro tab Envíos. No administra tarifas acá.'));
    }

    function openBannerCheckout() {
      if (!openBase('Banner checkout')) return;
      body.appendChild(makeToggle('Permitir banner en checkout', 'Muestra un banner antes de pagar o antes de confirmar datos.', 'showBanner'));
      body.appendChild(makeSelect('Ubicación del banner', 'bannerPosition', ['Antes de código postal', 'Antes del resumen', 'Antes de métodos de pago'], 'Lugar donde aparece el banner dentro del checkout.'));
      body.appendChild(makeSelect('Tipo de banner', 'bannerType', ['General', 'Segmentado por UTM', 'Segmentado por audiencia', 'Segmentado por zona'], 'Por ahora es estructural. Luego leerá audiencias, client_id, session_id y zona.'));
      body.appendChild(makeText('Título del banner', 'bannerTitle', 'Título visible en la parte superior del checkout.'));
      body.appendChild(makeText('Texto del banner', 'bannerText', 'Mensaje breve para evitar dudas antes del pago.'));
    }

    function openDatos() {
      if (!openBase('Datos comprador')) return;
      body.appendChild(makeToggle('Pedir nombre completo', 'Campo básico para identificar el pedido.', 'buyerName'));
      body.appendChild(makeToggle('Pedir WhatsApp obligatorio', 'Clave para confirmar contra-entrega y resolver dudas rápidas.', 'buyerWhatsapp'));
      body.appendChild(makeToggle('Pedir correo electrónico', 'Útil para recompra, tracking y flujos de Publicidad Interna.', 'buyerEmail'));
      body.appendChild(makeToggle('Permitir notas del pedido', 'Ej: mensaje para torta, horario preferido o aclaración.', 'buyerNotes'));
      body.appendChild(makeToggle('Permitir comprador invitado', 'Permite comprar sin crear cuenta. Recomendado para reducir fricción.', 'buyerGuest'));
      body.appendChild(makeToggle('Requerir login para seguimiento', 'Luego puede conectar con cuenta del comprador y tracking del pedido.', 'buyerLogin'));
    }

    function openDireccion() {
      if (!openBase('Dirección')) return;
      body.appendChild(makeToggle('Pedir calle', 'Campo base para entregar a domicilio.', 'addressStreet'));
      body.appendChild(makeToggle('Pedir número', 'Ayuda a evitar direcciones incompletas.', 'addressNumber'));
      body.appendChild(makeToggle('Pedir piso/departamento', 'Útil para edificios, oficinas o barrios cerrados.', 'addressApartment'));
      body.appendChild(makeToggle('Pedir localidad', 'Puede autocompletarse luego desde el código postal.', 'addressLocality'));
      body.appendChild(makeToggle('Pedir referencia adicional', 'Reduce errores en entregas urbanas.', 'addressReference'));
      body.appendChild(makeSelect('Formato de dirección', 'addressFormat', ['Calle + número + piso/referencia', 'Dirección completa en un campo', 'Dirección validada por zona'], 'Define cómo se capturan los datos de entrega.'));
    }

    function openEntrega() {
      if (!openBase('Método de entrega')) return;
      body.appendChild(makeToggle('Permitir envío a domicilio', 'Método principal para food delivery y pastelería.', 'deliveryHome'));
      body.appendChild(makeToggle('Permitir retiro por local', 'Útil para reducir costos logísticos y evitar zonas no cubiertas.', 'deliveryPickup'));
      body.appendChild(makeToggle('Mostrar tiempo estimado de entrega', 'Se conectará con reglas por zona y disponibilidad futura.', 'deliveryShowEta'));
      body.appendChild(makeToggle('Mostrar costo de envío por zona', 'Depende de la validación postal y futuro motor de Envíos.', 'deliveryShowCost'));
      body.appendChild(makeSelect('Regla inicial', 'deliveryRule', ['Código postal primero', 'Elegir entrega primero', 'Retiro por local primero'], 'Recomendado: código postal primero para validar cobertura antes de capturar datos.'));
    }

    function openMetodoPago() {
      if (!openBase('Método de pago')) return;
      body.appendChild(makeToggle('Permitir pago online', 'Deja preparado el flujo para Mercado Pago u otra pasarela.', 'paymentOnline'));
      body.appendChild(makeToggle('Permitir pago contra-entrega', 'El usuario paga al recibir. Puede limitarse por zona en el futuro motor de envíos.', 'paymentCash'));
      body.appendChild(makeToggle('Permitir transferencia', 'Muestra instrucciones de transferencia y pedido pendiente de validación.', 'paymentTransfer'));
      body.appendChild(makeSelect('Pasarela futura', 'paymentGateway', ['Mercado Pago', 'MODO', 'Transferencia manual', 'Contra-entrega'], 'Solo estructura visual por ahora. La conexión real se hará después.'));
      body.appendChild(makeText('Texto de pago contra-entrega', 'paymentCashText', 'Microcopy visible para contra-entrega o pago presencial.'));
    }

    function openContraEntrega() {
      if (!openBase('Contra-entrega')) return;
      body.appendChild(makeToggle('Permitir contra-entrega', 'Activa compra con pago al recibir.', 'cashEnabled'));
      body.appendChild(makeToggle('Requerir zona válida para contra-entrega', 'Evita habilitar contra-entrega fuera de cobertura.', 'cashRequireZone'));
      body.appendChild(makeToggle('Pedir confirmación por WhatsApp', 'Puede reducir pedidos falsos o incompletos.', 'cashWhatsapp'));
      body.appendChild(makeText('Aclaración visible', 'cashNote', 'Texto que verá el comprador antes de confirmar.'));
      body.appendChild(makeSelect('Disponibilidad por zona', 'cashAvailability', ['Todas las zonas activas', 'Solo CABA', 'Solo zonas seleccionadas', 'Configurar en Envíos'], 'La regla definitiva se conectará con el futuro módulo Envíos.'));
    }

    function openConfirmacion() {
      if (!openBase('Confirmación')) return;
      body.appendChild(makeText('Texto del botón principal', 'confirmButtonText', 'CTA final del checkout.'));
      body.appendChild(makeText('Mensaje inferior', 'confirmHelpText', 'Texto de confianza debajo del botón final.'));
      body.appendChild(makeToggle('Mostrar nota de confirmación manual', 'Útil cuando el comercio debe revisar stock, horario o disponibilidad.', 'confirmManualNote'));
      body.appendChild(makeToggle('Preparar conexión futura a pedido real', 'Luego generará order_id/store_id/draft_version/published_version.', 'confirmFutureOrder'));
    }

    function bindCheckoutCards() {
      root.querySelectorAll('.builderToolCard').forEach(function (button) {
        if (button.dataset.checkoutCardBound === '1') return;
        button.dataset.checkoutCardBound = '1';

        button.addEventListener('click', function () {
          const strong = button.querySelector('strong');
          const label = strong ? strong.textContent.trim() : button.textContent.trim();

          if (label === 'Estructura') openEstructura();
          if (label === 'Resumen pedido') openResumen();
          if (label === 'Pagos' || label === 'Método de pago') openMetodoPago();
          if (label === 'Datos comprador') openDatos();
          if (label === 'Dirección') openDireccion();
          if (label === 'Método de entrega') openEntrega();
          if (label === 'Validación postal') openPostal();
          if (label === 'Banner checkout') openBannerCheckout();
          if (label === 'Contra-entrega') openContraEntrega();
          if (label === 'Confirmación') openConfirmacion();
        });
      });
    }

    function bindCheckoutPreviewRender() {
      const checkoutTab = root.querySelector('[data-builder-tab="checkout"]');

      if (checkoutTab) {
        checkoutTab.addEventListener('click', function () {
          setTimeout(renderCheckoutPreview, 0);
        });
      }

      if (checkoutTab && checkoutTab.classList.contains('is-active')) {
        setTimeout(renderCheckoutPreview, 0);
      }
    }

    ensureCheckoutCards();
    bindCheckoutCards();
    bindCheckoutPreviewRender();
  }

  document.addEventListener('DOMContentLoaded', initCheckoutEditor);
  document.addEventListener('sazzu:page:load', initCheckoutEditor);
})();