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

    function emitBuilderChange() {
      root.dispatchEvent(new CustomEvent('sazzu:builder:change', { bubbles: true }));
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

    function makeToggle(label, note, checked) {
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
      input.checked = checked !== false;
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
        emitBuilderChange();
      });

      return row;
    }

    function makeSelect(label, options, note) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const select = document.createElement('select');
      const hint = document.createElement('p');

      field.className = 'builderFormField';
      span.textContent = label;

      options.forEach(function (item) {
        const option = document.createElement('option');
        option.textContent = item;
        select.appendChild(option);
      });

      select.addEventListener('change', emitBuilderChange);

      hint.className = 'builderFieldHint';
      hint.textContent = note || '';

      field.appendChild(span);
      field.appendChild(select);
      field.appendChild(hint);

      return field;
    }

    function makeText(label, value, note) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const input = document.createElement('input');
      const hint = document.createElement('p');

      field.className = 'builderFormField';
      span.textContent = label;
      input.type = 'text';
      input.value = value || '';
      input.addEventListener('input', emitBuilderChange);
      input.addEventListener('change', emitBuilderChange);

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
      const steps = ['Código postal', 'Resumen del pedido', 'Datos del comprador', 'Dirección', 'Método de pago'];
      const total = document.createElement('div');

      box.style.cssText = 'display:block;background:transparent;margin:0;padding:0;';
      card.style.cssText = 'display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.08);';
      h.textContent = 'Vista checkout';
      h.style.cssText = 'color:#111827;font-size:15px;font-weight:950;';

      card.appendChild(h);

      steps.forEach(function (label, index) {
        const step = document.createElement('div');
        step.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border-radius:5px;background:#f8fafc;color:#475467;font-size:12px;font-weight:800;';
        step.innerHTML = '<span>' + (index + 1) + '. ' + label + '</span><b style="color:#2479ff;">Activo</b>';
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
        '<header style="position:sticky;top:0;z-index:10;display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;align-items:center;padding:14px 16px;background:#fff;border-bottom:1px solid #f1d4be;">' +
          '<button type="button" style="width:38px;height:38px;border:0;border-radius:999px;background:#fff1df;color:#9c2448;font-size:22px;font-weight:950;">‹</button>' +
          '<div style="display:grid;gap:2px;"><strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Finalizar pedido</strong><span style="color:#667085;font-size:12px;font-weight:750;">Validá tu zona y completá tus datos</span></div>' +
        '</header>' +
        '<section data-live-edit-zone="checkout-banner" data-live-zone-label="Banner checkout" style="position:relative;padding:14px 16px 10px;background:#fff7ea;">' +
          '<article style="display:grid;grid-template-columns:34px minmax(0,1fr);gap:11px;align-items:center;padding:13px;border-radius:5px;background:linear-gradient(135deg,#9c2448,#d99837);color:#fff;box-shadow:0 12px 24px rgba(156,36,72,.16);">' +
            '<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:rgba(255,255,255,.18);font-weight:950;">%</span>' +
            '<div><strong style="display:block;font-size:14px;font-weight:950;line-height:1.15;">Envíos disponibles por zona</strong><small style="display:block;margin-top:3px;font-size:11px;font-weight:750;opacity:.9;">El costo final se calcula después de validar el código postal.</small></div>' +
          '</article>' +
        '</section>' +
        '<section data-live-edit-zone="checkout-postal" data-live-zone-label="Validación postal" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
          '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div><span style="display:block;color:#9c2448;font-size:11px;font-weight:950;letter-spacing:.11em;">PASO 1</span><strong style="display:block;color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Código postal</strong></div><b style="color:#027a48;background:#ecfdf3;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:950;">Primero</b></div>' +
            '<div style="display:grid;grid-template-columns:minmax(0,1fr)94px;gap:8px;"><input value="1425" readonly style="height:42px;border:1px solid #efcdb9;border-radius:5px;padding:0 12px;background:#fff;color:#211f27;font-size:14px;font-weight:850;"><button type="button" style="border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:12px;font-weight:950;">Validar</button></div>' +
            '<p style="margin:0;padding:10px;border-radius:5px;background:#ecfdf3;color:#027a48;font-size:12px;font-weight:850;">Llegamos a tu zona · Envío estimado $1.000</p>' +
          '</article>' +
        '</section>' +
        '<section data-live-edit-zone="checkout-summary" data-live-zone-label="Resumen pedido" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
          '<article style="display:grid;gap:12px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Resumen del pedido</strong><span style="color:#9c2448;font-size:12px;font-weight:950;">Editar</span></div>' +
            checkoutRow('Box Dulce Nube', '1', '$ 9.800') + checkoutRow('Merienda Dúo', '1', '$ 12.900') +
            '<div style="display:grid;gap:7px;padding-top:10px;border-top:1px solid #f0dac8;color:#211f27;font-size:13px;font-weight:850;">' +
              '<div style="display:flex;justify-content:space-between;"><span>Subtotal</span><b>$ 22.700</b></div>' +
              '<div style="display:flex;justify-content:space-between;"><span>Envío</span><b>$ 1.000</b></div>' +
              '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:950;"><span>Total</span><b>$ 23.700</b></div>' +
            '</div>' +
          '</article>' +
        '</section>' +
        '<section data-live-edit-zone="checkout-buyer" data-live-zone-label="Datos comprador" style="position:relative;padding:10px 16px;background:#fff7ea;">' + checkoutBlock('Datos del comprador', 'Nombre completo', 'WhatsApp', 'Correo opcional') + '</section>' +
        '<section data-live-edit-zone="checkout-address" data-live-zone-label="Dirección" style="position:relative;padding:10px 16px;background:#fff7ea;">' + checkoutBlock('Dirección de entrega', 'Calle y número', 'Piso / departamento', 'Referencia') + '</section>' +
        '<section data-live-edit-zone="checkout-delivery" data-live-zone-label="Método de entrega" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
          '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
            '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Método de entrega</strong>' +
            optionPill('Envío a domicilio', 'Seleccionado', true) + optionPill('Retiro por local', 'Disponible', false) +
          '</article>' +
        '</section>' +
        '<section data-live-edit-zone="checkout-payment" data-live-zone-label="Método de pago" style="position:relative;padding:10px 16px;background:#fff7ea;">' +
          '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
            '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">Método de pago</strong>' +
            optionPill('Pago contra-entrega', 'Activo', true) + optionPill('Transferencia', 'Opcional', false) + optionPill('Mercado Pago', 'Futuro', false) +
          '</article>' +
        '</section>' +
        '<section data-live-edit-zone="checkout-confirm" data-live-zone-label="Confirmación" style="position:relative;padding:10px 16px 28px;background:#fff7ea;">' +
          '<button type="button" style="width:100%;height:50px;border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:15px;font-weight:950;box-shadow:0 12px 24px rgba(156,36,72,.22);">Confirmar pedido</button>' +
          '<p style="margin:10px 0 0;color:#667085;font-size:12px;line-height:1.35;text-align:center;">Te contactaremos para confirmar disponibilidad y horario.</p>' +
        '</section>';

      previewPanel.appendChild(phone);
      emitBuilderChange();
    }

    function checkoutRow(name, qty, price) {
      return '<div style="display:grid;grid-template-columns:minmax(0,1fr)34px 72px;gap:8px;align-items:center;color:#211f27;font-size:13px;"><strong style="font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</strong><span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:#fff1df;color:#9c2448;font-weight:950;">' + qty + '</span><b style="text-align:right;font-weight:950;">' + price + '</b></div>';
    }

    function checkoutBlock(title, a, b, c) {
      return '<article style="display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #efcdb9;">' +
        '<strong style="color:#211f27;font-size:18px;font-weight:950;letter-spacing:-.03em;">' + title + '</strong>' +
        fakeInput(a) + fakeInput(b) + fakeInput(c) +
      '</article>';
    }

    function fakeInput(label) {
      return '<div style="height:42px;display:flex;align-items:center;padding:0 12px;border:1px solid #efcdb9;border-radius:5px;background:#fff;color:#98a2b3;font-size:13px;font-weight:800;">' + label + '</div>';
    }

    function optionPill(title, meta, active) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-radius:5px;border:1px solid ' + (active ? '#9c2448' : '#efcdb9') + ';background:' + (active ? '#fff1df' : '#fff') + ';color:#211f27;font-size:13px;font-weight:850;"><span>' + title + '</span><b style="color:' + (active ? '#9c2448' : '#667085') + ';font-size:11px;font-weight:950;">' + meta + '</b></div>';
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
      body.appendChild(makeSelect('Orden del checkout', ['Código postal primero', 'Resumen primero', 'Datos del comprador primero'], 'Define el primer paso visible. Recomendado: código postal primero para validar zona antes de pago.'));
      body.appendChild(makeToggle('Mostrar banner checkout', 'Muestra un aviso superior antes de validar zona o pagar.', true));
      body.appendChild(makeToggle('Mostrar resumen del pedido', 'Muestra productos, agregados, descuentos y total antes de confirmar.', true));
      body.appendChild(makeToggle('Mostrar datos comprador', 'Solicita nombre, WhatsApp y correo según reglas del comercio.', true));
      body.appendChild(makeToggle('Mostrar dirección', 'Solicita dirección completa cuando el pedido requiere envío.', true));
      body.appendChild(makeToggle('Mostrar método de entrega', 'Permite elegir envío a domicilio o retiro por local.', true));
      body.appendChild(makeToggle('Mostrar método de pago', 'Permite elegir pago contra-entrega, transferencia o pasarela futura.', true));
      body.appendChild(makeToggle('Permitir edición del carrito dentro del checkout', 'Permite modificar cantidades antes de pagar sin volver al carrito.', true));
    }

    function openResumen() {
      if (!openBase('Resumen pedido')) return;
      body.appendChild(makeToggle('Mostrar productos agregados', 'Lista los productos seleccionados antes de confirmar.', true));
      body.appendChild(makeToggle('Permitir editar cantidades', 'Permite sumar o quitar unidades dentro del checkout.', true));
      body.appendChild(makeToggle('Permitir quitar productos', 'Reduce fricción si el comprador quiere ajustar el pedido.', true));
      body.appendChild(makeToggle('Mostrar subtotal', 'Muestra el total de productos antes del envío.', true));
      body.appendChild(makeToggle('Mostrar costo de envío', 'Se completa después de validar código postal.', true));
      body.appendChild(makeToggle('Mostrar total final', 'Suma subtotal, envío y futuros descuentos.', true));
      body.appendChild(makeText('Nota previa a validar zona', 'El costo de envío se calcula al validar tu código postal.', 'Microcopy visible cuando todavía no hay zona confirmada.'));
    }

    function openPostal() {
      if (!openBase('Validación postal')) return;
      body.appendChild(makeText('Campo visible', 'Código postal', 'Primer dato recomendado para validar zona, costo y promesa de entrega.'));
      body.appendChild(makeText('Texto del botón', 'Validar zona', 'Acción principal del primer paso.'));
      body.appendChild(makeText('Mensaje zona disponible', 'Llegamos a tu zona.', 'Mensaje positivo después de validar.'));
      body.appendChild(makeText('Mensaje zona no disponible', 'Todavía no llegamos a esta zona.', 'Mensaje negativo sin bloquear la evolución futura del sistema.'));
      body.appendChild(makeToggle('Validar código postal antes de mostrar medios de pago', 'Evita pedidos desde zonas no operativas.', true));
      body.appendChild(makeToggle('Bloquear compra si la zona no está disponible', 'Si se apaga, permite consulta manual aunque no haya cobertura.', true));
      body.appendChild(makeToggle('Mostrar costo de envío después de validar CP', 'El costo vendrá del futuro motor de Envíos.', true));
      body.appendChild(makeToggle('Mostrar promesa de entrega estimada', 'Ej: Llega hoy, llega mañana o llega entre 2 y 4 días.', true));
      body.appendChild(makeSelect('Fuente de datos para validar', ['Manual temporal', 'CSV futuro', 'Supabase futuro', 'Google Sheets futuro'], 'TODO: este checkout consumirá reglas del futuro tab Envíos. No administra tarifas acá.'));
      body.appendChild(makeText('Botón operativo futuro', 'Conectar a fuente de datos', 'Abrirá el futuro módulo Envíos para CSV, CP, zonas y tarifas.'));
    }

    function openBannerCheckout() {
      if (!openBase('Banner checkout')) return;
      body.appendChild(makeToggle('Permitir banner en checkout', 'Muestra un banner antes de pagar o antes de confirmar datos.', true));
      body.appendChild(makeSelect('Ubicación del banner', ['Antes de código postal', 'Antes del resumen', 'Antes de métodos de pago'], 'Lugar donde aparece el banner dentro del checkout.'));
      body.appendChild(makeSelect('Tipo de banner', ['General', 'Segmentado por UTM', 'Segmentado por audiencia', 'Segmentado por zona'], 'Por ahora es estructural. Luego leerá audiencias, client_id, session_id y zona.'));
      body.appendChild(makeText('Título del banner', 'Envíos disponibles por zona', 'Título visible en la parte superior del checkout.'));
      body.appendChild(makeText('Texto del banner', 'El costo final se calcula después de validar el código postal.', 'Mensaje breve para evitar dudas antes del pago.'));
    }

    function openDatos() {
      if (!openBase('Datos comprador')) return;
      body.appendChild(makeToggle('Pedir nombre completo', 'Campo básico para identificar el pedido.', true));
      body.appendChild(makeToggle('Pedir WhatsApp obligatorio', 'Clave para confirmar contra-entrega y resolver dudas rápidas.', true));
      body.appendChild(makeToggle('Pedir correo electrónico', 'Útil para recompra, tracking y flujos de Publicidad Interna.', true));
      body.appendChild(makeToggle('Permitir notas del pedido', 'Ej: mensaje para torta, horario preferido o aclaración.', true));
      body.appendChild(makeToggle('Permitir comprador invitado', 'Permite comprar sin crear cuenta. Recomendado para reducir fricción.', true));
      body.appendChild(makeToggle('Requerir login para seguimiento', 'Luego puede conectar con cuenta del comprador y tracking del pedido.', false));
    }

    function openDireccion() {
      if (!openBase('Dirección')) return;
      body.appendChild(makeToggle('Pedir calle', 'Campo base para entregar a domicilio.', true));
      body.appendChild(makeToggle('Pedir número', 'Ayuda a evitar direcciones incompletas.', true));
      body.appendChild(makeToggle('Pedir piso/departamento', 'Útil para edificios, oficinas o barrios cerrados.', true));
      body.appendChild(makeToggle('Pedir localidad', 'Puede autocompletarse luego desde el código postal.', true));
      body.appendChild(makeToggle('Pedir referencia adicional', 'Reduce errores en entregas urbanas.', true));
      body.appendChild(makeSelect('Formato de dirección', ['Calle + número + piso/referencia', 'Dirección completa en un campo', 'Dirección validada por zona'], 'Define cómo se capturan los datos de entrega.'));
    }

    function openEntrega() {
      if (!openBase('Método de entrega')) return;
      body.appendChild(makeToggle('Permitir envío a domicilio', 'Método principal para food delivery y pastelería.', true));
      body.appendChild(makeToggle('Permitir retiro por local', 'Útil para reducir costos logísticos y evitar zonas no cubiertas.', true));
      body.appendChild(makeToggle('Mostrar tiempo estimado de entrega', 'Se conectará con reglas por zona y disponibilidad futura.', true));
      body.appendChild(makeToggle('Mostrar costo de envío por zona', 'Depende de la validación postal y futuro motor de Envíos.', true));
      body.appendChild(makeSelect('Regla inicial', ['Código postal primero', 'Elegir entrega primero', 'Retiro por local primero'], 'Recomendado: código postal primero para validar cobertura antes de capturar datos.'));
    }

    function openMetodoPago() {
      if (!openBase('Método de pago')) return;
      body.appendChild(makeToggle('Permitir pago online', 'Deja preparado el flujo para Mercado Pago u otra pasarela.', true));
      body.appendChild(makeToggle('Permitir pago contra-entrega', 'El usuario paga al recibir. Puede limitarse por zona en el futuro motor de envíos.', true));
      body.appendChild(makeToggle('Permitir transferencia', 'Muestra instrucciones de transferencia y pedido pendiente de validación.', false));
      body.appendChild(makeSelect('Pasarela futura', ['Mercado Pago', 'MODO', 'Transferencia manual', 'Contra-entrega'], 'Solo estructura visual por ahora. La conexión real se hará después.'));
      body.appendChild(makeText('Texto de pago contra-entrega', 'Pagás cuando recibís tu pedido.', 'Microcopy visible para contra-entrega o pago presencial.'));
    }

    function openContraEntrega() {
      if (!openBase('Contra-entrega')) return;
      body.appendChild(makeToggle('Permitir contra-entrega', 'Activa compra con pago al recibir.', true));
      body.appendChild(makeToggle('Requerir zona válida para contra-entrega', 'Evita habilitar contra-entrega fuera de cobertura.', true));
      body.appendChild(makeToggle('Pedir confirmación por WhatsApp', 'Puede reducir pedidos falsos o incompletos.', true));
      body.appendChild(makeText('Aclaración visible', 'Pagás cuando recibís tu pedido.', 'Texto que verá el comprador antes de confirmar.'));
      body.appendChild(makeSelect('Disponibilidad por zona', ['Todas las zonas activas', 'Solo CABA', 'Solo zonas seleccionadas', 'Configurar en Envíos'], 'La regla definitiva se conectará con el futuro módulo Envíos.'));
    }

    function openConfirmacion() {
      if (!openBase('Confirmación')) return;
      body.appendChild(makeText('Texto del botón principal', 'Confirmar pedido', 'CTA final del checkout.'));
      body.appendChild(makeText('Mensaje inferior', 'Te contactaremos para confirmar disponibilidad y horario.', 'Texto de confianza debajo del botón final.'));
      body.appendChild(makeToggle('Mostrar nota de confirmación manual', 'Útil cuando el comercio debe revisar stock, horario o disponibilidad.', true));
      body.appendChild(makeToggle('Preparar conexión futura a pedido real', 'Luego generará order_id/store_id/draft_version/published_version.', true));
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