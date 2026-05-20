(function () {
  function initSeccionesEditor() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.seccionesReady === '1') return;
    root.dataset.seccionesReady = '1';

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
      input.value = value;
      hint.className = 'builderFieldHint';
      hint.textContent = note;
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
      hint.textContent = note;
      field.appendChild(span);
      field.appendChild(select);
      field.appendChild(hint);
      return field;
    }

    function makeStars(label, value) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const input = document.createElement('input');
      const hint = document.createElement('p');
      field.className = 'builderFormField';
      span.textContent = label;
      input.type = 'number';
      input.min = '0';
      input.max = '5';
      input.value = value || '5';
      hint.className = 'builderFieldHint';
      hint.textContent = 'Cantidad de estrellas visibles dentro de cada card del carrusel.';
      field.appendChild(span);
      field.appendChild(input);
      field.appendChild(hint);
      return field;
    }

    function makePreview() {
      const box = document.createElement('section');
      const eyebrow = document.createElement('span');
      const head = document.createElement('div');
      const h = document.createElement('strong');
      const all = document.createElement('b');
      const rail = document.createElement('div');
      box.style.cssText = 'display:grid;gap:10px;padding:0;background:transparent;';
      eyebrow.textContent = 'PEDIDO RAPIDO';
      eyebrow.style.cssText = 'color:#b80f4d;font-size:11px;font-weight:900;letter-spacing:.08em;';
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';
      h.textContent = 'Más elegidos hoy';
      h.style.cssText = 'color:#111827;font-size:18px;font-weight:950;letter-spacing:-.03em;';
      all.textContent = 'Ver todo';
      all.style.cssText = 'color:#b80f4d;font-size:12px;font-weight:900;';
      rail.style.cssText = 'display:grid;grid-auto-flow:column;grid-auto-columns:72%;gap:12px;overflow:hidden;';
      rail.appendChild(card('15% OFF', 'Box Dulce Nube', '$ 9.800', '#f5dfbd'));
      rail.appendChild(card('Más pedida', 'Torta Choco Cream', '$ 12.500', '#e7d2bd'));
      head.appendChild(h);
      head.appendChild(all);
      box.appendChild(eyebrow);
      box.appendChild(head);
      box.appendChild(rail);
      return box;
    }

    function makeCombosPreview() {
      const box = document.createElement('section');
      const eyebrow = document.createElement('span');
      const head = document.createElement('div');
      const h = document.createElement('strong');
      const all = document.createElement('b');
      const rail = document.createElement('div');
      box.style.cssText = 'display:grid;gap:10px;padding:0;background:transparent;';
      eyebrow.textContent = 'COMBOS LISTOS';
      eyebrow.style.cssText = 'color:#b80f4d;font-size:11px;font-weight:900;letter-spacing:.08em;';
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';
      h.textContent = 'Combos rápidos';
      h.style.cssText = 'color:#111827;font-size:18px;font-weight:950;letter-spacing:-.03em;';
      all.textContent = 'Ver todos';
      all.style.cssText = 'color:#b80f4d;font-size:12px;font-weight:900;';
      rail.style.cssText = 'display:grid;grid-auto-flow:column;grid-auto-columns:72%;gap:12px;overflow:hidden;';
      rail.appendChild(comboCard('Combo rápido', 'Merienda Dúo', '$ 12.900', '2 muffins surtidos, 1 brownie y 2 cafés fríos.', '#f5dfbd'));
      rail.appendChild(comboCard('Más regalado', 'Cumple Express', '$ 18.500', 'Mini torta, velita y tarjeta para salir del apuro.', '#e9c7aa'));
      head.appendChild(h);
      head.appendChild(all);
      box.appendChild(eyebrow);
      box.appendChild(head);
      box.appendChild(rail);
      return box;
    }

    function card(badgeText, name, price, color) {
      const item = document.createElement('article');
      const img = document.createElement('div');
      const badge = document.createElement('span');
      const itemBody = document.createElement('div');
      const itemTitle = document.createElement('strong');
      const desc = document.createElement('small');
      const row = document.createElement('div');
      const value = document.createElement('b');
      const add = document.createElement('button');
      item.style.cssText = 'overflow:hidden;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.10);';
      img.style.cssText = 'position:relative;height:92px;background:linear-gradient(135deg,' + color + ',#b80f4d);';
      badge.textContent = badgeText;
      badge.style.cssText = 'position:absolute;left:10px;top:10px;padding:6px 8px;border-radius:4px;background:#b80f4d;color:#fff;font-size:10px;font-weight:900;';
      itemBody.style.cssText = 'display:grid;gap:6px;padding:12px;';
      itemTitle.textContent = name;
      itemTitle.style.cssText = 'color:#1f1f28;font-size:14px;font-weight:900;';
      desc.textContent = 'Producto visible en carrusel de compra rápida.';
      desc.style.cssText = 'color:#667085;font-size:11px;line-height:1.3;';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
      value.textContent = price;
      value.style.cssText = 'color:#1f1f28;font-size:15px;font-weight:950;';
      add.type = 'button';
      add.textContent = '+';
      add.style.cssText = 'width:36px;height:32px;border:0;border-radius:5px;background:#b80f4d;color:#fff;font-size:17px;font-weight:900;';
      img.appendChild(badge);
      row.appendChild(value);
      row.appendChild(add);
      itemBody.appendChild(itemTitle);
      itemBody.appendChild(desc);
      itemBody.appendChild(row);
      item.appendChild(img);
      item.appendChild(itemBody);
      return item;
    }

    function comboCard(badgeText, name, price, description, color) {
      const item = document.createElement('article');
      const img = document.createElement('div');
      const badge = document.createElement('span');
      const itemBody = document.createElement('div');
      const rowTitle = document.createElement('div');
      const itemTitle = document.createElement('strong');
      const value = document.createElement('b');
      const stars = document.createElement('span');
      const desc = document.createElement('small');
      const add = document.createElement('button');
      item.style.cssText = 'overflow:hidden;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.10);';
      img.style.cssText = 'position:relative;height:96px;background:linear-gradient(135deg,' + color + ',#b80f4d);';
      badge.textContent = badgeText;
      badge.style.cssText = 'position:absolute;left:10px;top:10px;padding:6px 8px;border-radius:4px;background:#b80f4d;color:#fff;font-size:10px;font-weight:900;';
      itemBody.style.cssText = 'display:grid;gap:7px;padding:12px;';
      rowTitle.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;';
      itemTitle.textContent = name;
      itemTitle.style.cssText = 'color:#1f1f28;font-size:14px;font-weight:900;';
      value.textContent = price;
      value.style.cssText = 'color:#9c2448;font-size:13px;font-weight:950;white-space:nowrap;';
      stars.textContent = '★★★★★';
      stars.style.cssText = 'color:#35a465;font-size:11px;letter-spacing:.02em;';
      desc.textContent = description;
      desc.style.cssText = 'color:#667085;font-size:11px;line-height:1.35;';
      add.type = 'button';
      add.textContent = '+ Añadir';
      add.style.cssText = 'height:36px;border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:12px;font-weight:900;';
      img.appendChild(badge);
      rowTitle.appendChild(itemTitle);
      rowTitle.appendChild(value);
      itemBody.appendChild(rowTitle);
      itemBody.appendChild(stars);
      itemBody.appendChild(desc);
      itemBody.appendChild(add);
      item.appendChild(img);
      item.appendChild(itemBody);
      return item;
    }

    function openMasElegidos() {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Secciones';
      if (title) title.textContent = 'Más elegidos';
      body.appendChild(makePreview());
      body.appendChild(makeText('Leyenda superior', 'PEDIDO RAPIDO', 'Texto pequeño sobre el título de la sección.'));
      body.appendChild(makeText('Título visible', 'Más elegidos hoy', 'Nombre que verá el comprador en la Home.'));
      body.appendChild(makeToggle('Mostrar botón Ver todo', 'Permite abrir una vista completa de productos destacados.', true));
      body.appendChild(makeSelect('Tipo de carrusel', ['1 card y media', '2 cards y 1/3', 'Lista vertical'], 'Define cuántas tarjetas se sugieren en el primer pantallazo.'));
      body.appendChild(makeSelect('Fuente de productos', ['Manual temporal', 'Productos destacados', 'Más vendidos', 'Supabase futuro'], 'Por ahora usa datos simulados. Luego leerá productos del workspace del comercio.'));
      body.appendChild(makeToggle('Permitir botón + en card', 'Activa compra rápida sin abrir detalle del producto.', true));
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    function openCombos() {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Secciones';
      if (title) title.textContent = 'Combos';
      body.appendChild(makeCombosPreview());
      body.appendChild(makeText('Leyenda superior', 'COMBOS LISTOS', 'Texto pequeño sobre el título del carrusel.'));
      body.appendChild(makeText('Título visible', 'Combos rápidos', 'Nombre visible de la sección en la Home.'));
      body.appendChild(makeToggle('Mostrar botón Ver todos', 'Permite abrir una vista completa de combos disponibles.', true));
      body.appendChild(makeStars('Cantidad de estrellas', '5'));
      body.appendChild(makeToggle('Permitir flujo de correo para opiniones sobre estos combos', 'Después de la compra se podrá activar un correo para pedir reseñas y alimentar Publicidad Interna.', false));
      body.appendChild(makeSelect('Combos disponibles', ['Seleccionar productos de combos', 'Merienda Dúo', 'Cumple Express', 'Supabase futuro'], 'TODO: este desplegable leerá bundles/ofertas en cantidad desde Sheets y luego desde Supabase por workspace.'));
      body.appendChild(makeSelect('Tipo de carrusel', ['2 cards y 1/3', '1 card y media', 'Lista vertical'], 'Define cómo se ve el carrusel en el primer pantallazo móvil.'));
      body.appendChild(makeToggle('Mostrar precio junto al nombre del combo', 'Alinea el precio a la derecha para acelerar lectura comercial.', true));
      body.appendChild(makeToggle('Permitir botón Añadir en card', 'Activa compra rápida sin entrar a la página del combo.', true));
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Más elegidos') openMasElegidos();
        if (label === 'Combos') openCombos();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initSeccionesEditor);
  document.addEventListener('sazzu:page:load', initSeccionesEditor);
})();
