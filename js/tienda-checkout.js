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
      const step1 = document.createElement('div');
      const step2 = document.createElement('div');
      const step3 = document.createElement('div');
      const total = document.createElement('div');
      box.style.cssText = 'display:block;background:transparent;margin:0;padding:0;';
      card.style.cssText = 'display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.08);';
      h.textContent = 'Vista checkout';
      h.style.cssText = 'color:#111827;font-size:15px;font-weight:950;';
      [step1, step2, step3].forEach(function (step, index) {
        step.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border-radius:5px;background:#f8fafc;color:#475467;font-size:12px;font-weight:800;';
        step.textContent = ['Código postal', 'Datos de entrega', 'Método de pago'][index];
      });
      total.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:950;';
      total.innerHTML = '<span>Total</span><b>$ 22.700</b>';
      card.appendChild(h);
      card.appendChild(step1);
      card.appendChild(step2);
      card.appendChild(step3);
      card.appendChild(total);
      box.appendChild(card);
      return box;
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
      body.appendChild(makeToggle('Mostrar resumen del pedido', 'Muestra productos, agregados, descuentos y total antes de confirmar.', true));
      body.appendChild(makeToggle('Mostrar progreso por pasos', 'Ayuda a que el comprador entienda cuánto falta para terminar.', true));
      body.appendChild(makeToggle('Permitir edición del carrito dentro del checkout', 'Permite modificar cantidades antes de pagar sin volver al carrito.', true));
    }

    function openPagos() {
      if (!openBase('Pagos')) return;
      body.appendChild(makeToggle('Permitir pago online', 'Deja preparado el flujo para Mercado Pago u otra pasarela.', true));
      body.appendChild(makeToggle('Permitir pago contra-entrega', 'El usuario paga al recibir. Puede limitarse por zona en el futuro motor de envíos.', true));
      body.appendChild(makeToggle('Permitir transferencia', 'Muestra instrucciones de transferencia y pedido pendiente de validación.', false));
      body.appendChild(makeSelect('Pasarela futura', ['Mercado Pago', 'MODO', 'Transferencia manual', 'Contra-entrega'], 'Solo estructura visual por ahora. La conexión real se hará después.'));
      body.appendChild(makeText('Texto de pago en el momento', 'Pago en el momento', 'Microcopy visible para contra-entrega o pago presencial.'));
    }

    function openDatos() {
      if (!openBase('Datos comprador')) return;
      body.appendChild(makeToggle('Pedir nombre completo', 'Campo básico para identificar el pedido.', true));
      body.appendChild(makeToggle('Pedir WhatsApp obligatorio', 'Clave para confirmar contra-entrega y resolver dudas rápidas.', true));
      body.appendChild(makeToggle('Pedir correo electrónico', 'Útil para recompra, tracking y flujos de Publicidad Interna.', true));
      body.appendChild(makeToggle('Permitir comprador invitado', 'Permite comprar sin crear cuenta. Recomendado para reducir fricción.', true));
      body.appendChild(makeToggle('Requerir login para seguimiento', 'Luego puede conectar con cuenta del comprador y tracking del pedido.', false));
      body.appendChild(makeSelect('Campos de dirección', ['Calle + número + piso/referencia', 'Dirección completa en un campo', 'Dirección validada por zona'], 'Define cómo se capturan los datos de entrega.'));
    }

    function openPostal() {
      if (!openBase('Validación postal')) return;
      body.appendChild(makeText('Campo visible', 'Código postal', 'Primer dato recomendado para validar zona, costo y promesa de entrega.'));
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
      body.appendChild(makeSelect('Ubicación del banner', ['Antes del resumen', 'Antes de métodos de pago', 'Después del código postal'], 'Lugar donde aparece el banner dentro del checkout.'));
      body.appendChild(makeSelect('Tipo de banner', ['General', 'Segmentado por UTM', 'Segmentado por audiencia', 'Segmentado por zona'], 'Por ahora es estructural. Luego leerá audiencias, client_id, session_id y zona.'));
      body.appendChild(makeText('Texto de ejemplo', 'Agregá algo dulce antes de finalizar', 'Mensaje visible para mejorar ticket promedio.'));
    }

    function openContraEntrega() {
      if (!openBase('Contra-entrega')) return;
      body.appendChild(makeToggle('Permitir contra-entrega', 'Activa compra con pago al recibir.', true));
      body.appendChild(makeToggle('Requerir zona válida para contra-entrega', 'Evita habilitar contra-entrega fuera de cobertura.', true));
      body.appendChild(makeToggle('Pedir confirmación por WhatsApp', 'Puede reducir pedidos falsos o incompletos.', true));
      body.appendChild(makeText('Aclaración visible', 'Pagás cuando recibís tu pedido.', 'Texto que verá el comprador antes de confirmar.'));
      body.appendChild(makeSelect('Disponibilidad por zona', ['Todas las zonas activas', 'Solo CABA', 'Solo zonas seleccionadas', 'Configurar en Envíos'], 'La regla definitiva se conectará con el futuro módulo Envíos.'));
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Estructura') openEstructura();
        if (label === 'Pagos') openPagos();
        if (label === 'Datos comprador') openDatos();
        if (label === 'Validación postal') openPostal();
        if (label === 'Banner checkout') openBannerCheckout();
        if (label === 'Contra-entrega') openContraEntrega();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initCheckoutEditor);
  document.addEventListener('sazzu:page:load', initCheckoutEditor);
})();
