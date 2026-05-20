(function () {
  function initBannerEditor() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.bannerReady === '1') return;
    root.dataset.bannerReady = '1';

    const sidePanel = root.querySelector('.builderSidePanel');
    const editor = root.querySelector('[data-builder-inner-editor]');
    const body = editor && editor.querySelector('.builderInnerEditor__body');
    const title = editor && editor.querySelector('.builderInnerEditor__header strong');
    const section = editor && editor.querySelector('.builderInnerEditor__header span');

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

    function makeBannerPreview() {
      const box = document.createElement('section');
      const banner = document.createElement('article');
      const tag = document.createElement('span');
      const copy = document.createElement('div');
      const headline = document.createElement('strong');
      const text = document.createElement('small');
      const action = document.createElement('button');

      box.style.cssText = 'display:grid;gap:10px;padding:0;background:transparent;';
      banner.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr)auto;gap:12px;align-items:center;padding:14px;border-radius:5px;background:linear-gradient(135deg,#9c2448,#e9c7aa);color:#fff;box-shadow:0 10px 22px rgba(156,36,72,.18);';
      tag.textContent = 'BANNER DINÁMICO';
      tag.style.cssText = 'grid-column:1/-1;width:max-content;padding:5px 8px;border-radius:5px;background:rgba(255,255,255,.18);font-size:10px;font-weight:900;letter-spacing:.08em;';
      copy.style.cssText = 'display:grid;gap:4px;';
      headline.textContent = '15% OFF por volver hoy';
      headline.style.cssText = 'font-size:15px;font-weight:950;line-height:1.12;';
      text.textContent = 'Mensaje preparado para audiencia o banner general.';
      text.style.cssText = 'font-size:11px;line-height:1.3;opacity:.86;';
      action.type = 'button';
      action.textContent = 'Ver oferta';
      action.style.cssText = 'border:0;border-radius:5px;padding:9px 10px;background:#fff;color:#9c2448;font-size:11px;font-weight:900;';
      copy.appendChild(headline);
      copy.appendChild(text);
      banner.appendChild(tag);
      banner.appendChild(copy);
      banner.appendChild(action);
      box.appendChild(banner);
      return box;
    }

    function makeRuleBox() {
      const box = document.createElement('section');
      const title = document.createElement('strong');
      const flow = document.createElement('div');
      const line1 = document.createElement('span');
      const line2 = document.createElement('span');
      const line3 = document.createElement('span');
      box.style.cssText = 'display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #d7d7d7;';
      title.textContent = 'Gobernador de audiencia → banner';
      title.style.cssText = 'color:#2f3742;font-size:14px;font-weight:900;';
      flow.style.cssText = 'display:grid;gap:8px;color:#667085;font-size:12px;line-height:1.35;';
      line1.textContent = 'Si el usuario pertenece a: Conjunto A / Conjunto B';
      line2.textContent = 'Mostrar: Banner seleccionado para ese segmento';
      line3.textContent = 'Si no pertenece a ningún segmento: mostrar banner general';
      flow.appendChild(line1);
      flow.appendChild(line2);
      flow.appendChild(line3);
      box.appendChild(title);
      box.appendChild(flow);
      return box;
    }

    function openBanner() {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Secciones';
      if (title) title.textContent = 'Banner';

      body.appendChild(makeBannerPreview());
      body.appendChild(makeSelect('Página donde se va a mostrar', ['Home', 'Página de producto', 'Carrito', 'Checkout', 'Tracking de pedido', 'Todas las páginas'], 'Define en qué parte general de la tienda aparece el banner.'));
      body.appendChild(makeSelect('Posición del banner', ['Debajo del perfil', 'Antes de Más elegidos', 'Antes de Combos', 'Antes del checkout', 'Sticky superior'], 'Ubicación estructural del banner dentro de la página seleccionada.'));
      body.appendChild(makeText('Título del banner', '15% OFF por volver hoy', 'Texto principal visible para el comprador.'));
      body.appendChild(makeText('Descripción del banner', 'Oferta preparada para audiencia o banner general.', 'Texto secundario debajo del título.'));
      body.appendChild(makeText('Texto del botón', 'Ver oferta', 'CTA visible dentro del banner.'));
      body.appendChild(makeToggle('Mostrar banner de acuerdo al conjunto de audiencias al que pertenece el usuario', 'Activa reglas condicionales basadas en Publicidad UTM / conjuntos de audiencias.', false));
      body.appendChild(makeRuleBox());
      body.appendChild(makeSelect('Si el usuario pertenece a', ['Conjunto de audiencias A', 'Conjunto de audiencias B', 'Compradores descanso', 'Interés cumpleaños', 'Supabase futuro'], 'TODO: este desplegable leerá conjuntos creados en Publicidad UTM por workspace.'));
      body.appendChild(makeSelect('Mostrar banner', ['Banner 15% OFF', 'Banner envío gratis', 'Banner últimos cupos', 'Banner recompra', 'Crear nuevo banner'], 'Banner que se mostrará para el conjunto seleccionado.'));
      body.appendChild(makeSelect('Si no pertenece a ningún segmento', ['Banner general', 'Ocultar banner', 'Banner tienda abierta', 'Banner envío gratis'], 'Fallback para usuarios sin audiencia identificada.'));
      body.appendChild(makeToggle('Permitir múltiples reglas de audiencia', 'Más adelante permitirá encadenar varias reglas con prioridad operativa.', false));
      body.appendChild(makeToggle('Preparar tracking de clicks del banner', 'Deja lista la medición para client_id, session_id, UTM y evento comercial.', true));

      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Banner') openBanner();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initBannerEditor);
  document.addEventListener('sazzu:page:load', initBannerEditor);
})();
