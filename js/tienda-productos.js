(function () {
  function initProductosEditor() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.productosReady === '1') return;
    root.dataset.productosReady = '1';

    const sidePanel = root.querySelector('.builderSidePanel');
    const editor = root.querySelector('[data-builder-inner-editor]');
    const body = editor && editor.querySelector('.builderInnerEditor__body');
    const title = editor && editor.querySelector('.builderInnerEditor__header strong');
    const section = editor && editor.querySelector('.builderInnerEditor__header span');

    const products = [
      { name: 'Box Dulce Nube', detail: 'Mini torta, muffins, brownie y salsa.', price: '$ 9.800', active: true },
      { name: 'Torta Choco Cream', detail: 'Bizcochuelo húmedo, crema y cobertura.', price: '$ 12.500', active: true },
      { name: 'Pionono Dulce Clásico', detail: 'Dulce de leche, crema y lluvia de coco.', price: '$ 7.200', active: false },
      { name: 'Muffins Mix x6', detail: 'Vainilla, chocolate, frutos rojos y chips.', price: '$ 6.900', active: true }
    ];

    function makeSearch() {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const input = document.createElement('input');
      const hint = document.createElement('p');
      field.className = 'builderFormField';
      span.textContent = 'Buscar producto';
      input.type = 'search';
      input.placeholder = 'Buscar por nombre o característica';
      hint.className = 'builderFieldHint';
      hint.textContent = 'Filtro visual temporal. Luego leerá productos reales del módulo Stock/Productos por workspace.';
      field.appendChild(span);
      field.appendChild(input);
      field.appendChild(hint);
      return { field, input };
    }

    function makeToggle(label, note, checked, onChange) {
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
        if (onChange) onChange(input.checked);
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

    function productRow(product, mode) {
      const row = document.createElement('article');
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      const detail = document.createElement('small');
      const price = document.createElement('b');
      const toggle = document.createElement('div');
      const input = document.createElement('input');
      const visual = document.createElement('span');
      const label = document.createElement('em');

      row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr)96px;gap:12px;align-items:center;padding:12px;border-radius:5px;background:#fff;border:1px solid #d7d7d7;';
      copy.style.cssText = 'display:grid;gap:4px;min-width:0;';
      name.textContent = product.name;
      name.style.cssText = 'color:#1f2937;font-size:14px;font-weight:950;';
      detail.textContent = product.detail;
      detail.style.cssText = 'color:#667085;font-size:12px;line-height:1.3;';
      price.textContent = product.price;
      price.style.cssText = 'color:#9c2448;font-size:13px;font-weight:950;';

      toggle.className = 'builderToggleRow';
      toggle.style.cssText = 'position:relative;display:grid;grid-template-columns:46px minmax(0,1fr);gap:8px;align-items:center;padding:8px;border-radius:5px;background:#f8fafc;user-select:none;cursor:pointer;';
      input.type = 'checkbox';
      input.checked = product.active;
      input.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';
      label.textContent = product.active ? 'Activo' : 'Inactivo';
      label.style.cssText = 'font-style:normal;font-size:11px;font-weight:900;color:' + (product.active ? '#2479ff' : '#667085') + ';';
      toggle.appendChild(input);
      toggle.appendChild(visual);
      toggle.appendChild(label);
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        input.checked = !input.checked;
        product.active = input.checked;
        label.textContent = input.checked ? 'Activo' : 'Inactivo';
        label.style.color = input.checked ? '#2479ff' : '#667085';
        if (mode === 'hidden' && input.checked) row.style.opacity = '.45';
      });

      copy.appendChild(name);
      copy.appendChild(detail);
      copy.appendChild(price);
      row.appendChild(copy);
      row.appendChild(toggle);
      return row;
    }

    function makeProductsList(mode) {
      const wrap = document.createElement('section');
      const search = makeSearch();
      const list = document.createElement('div');
      const note = document.createElement('p');
      wrap.style.cssText = 'display:grid;gap:12px;';
      list.style.cssText = 'display:grid;gap:10px;';
      note.className = 'builderFieldHint';
      note.textContent = 'Desde este panel no se editan nombres, precios, stock ni costos. Solo visibilidad comercial en la tienda.';

      function render() {
        const q = search.input.value.trim().toLowerCase();
        list.innerHTML = '';
        products
          .filter(function (p) { return mode !== 'active' || p.active; })
          .filter(function (p) { return mode !== 'hidden' || !p.active; })
          .filter(function (p) { return !q || (p.name + ' ' + p.detail).toLowerCase().indexOf(q) >= 0; })
          .forEach(function (p) { list.appendChild(productRow(p, mode)); });
      }

      search.input.addEventListener('input', render);
      wrap.appendChild(search.field);
      wrap.appendChild(note);
      wrap.appendChild(list);
      render();
      return wrap;
    }

    function makePricePreview() {
      const box = document.createElement('section');
      const card = document.createElement('article');
      const image = document.createElement('div');
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      const price = document.createElement('b');
      const compare = document.createElement('small');
      box.style.cssText = 'display:block;padding:0;margin:0;background:transparent;';
      card.style.cssText = 'display:grid;grid-template-columns:82px minmax(0,1fr);gap:12px;align-items:center;padding:12px;border-radius:5px;background:#fff;border:1px solid #ead7c7;box-shadow:0 8px 18px rgba(15,23,42,.08);';
      image.style.cssText = 'height:82px;border-radius:5px;background:linear-gradient(135deg,#f5dfbd,#9c2448);';
      copy.style.cssText = 'display:grid;gap:5px;';
      name.textContent = 'Box Dulce Nube';
      name.style.cssText = 'color:#111827;font-size:14px;font-weight:950;';
      compare.textContent = 'Antes $ 12.900';
      compare.style.cssText = 'color:#98a2b3;font-size:12px;text-decoration:line-through;';
      price.textContent = '$ 9.800';
      price.style.cssText = 'color:#9c2448;font-size:16px;font-weight:950;';
      copy.appendChild(name);
      copy.appendChild(compare);
      copy.appendChild(price);
      card.appendChild(image);
      card.appendChild(copy);
      box.appendChild(card);
      return { box, price, compare };
    }

    function makePriceVisibilityPanel() {
      const wrap = document.createElement('section');
      const preview = makePricePreview();
      wrap.style.cssText = 'display:grid;gap:12px;';
      wrap.appendChild(preview.box);
      wrap.appendChild(makeToggle('Mostrar precios en cards de producto', 'Si se apaga, la tienda muestra productos sin precio visible hasta abrir detalle o checkout.', true, function (checked) {
        preview.price.style.display = checked ? 'block' : 'none';
        preview.compare.style.display = checked ? 'block' : 'none';
      }));
      wrap.appendChild(makeToggle('Mostrar precio tachado cuando exista oferta', 'Solo controla visualización. El precio real sigue viniendo desde Productos/Stock/Ofertas.', true, function (checked) {
        preview.compare.style.display = checked ? 'block' : 'none';
      }));
      wrap.appendChild(makeToggle('Mostrar etiqueta “Desde” en productos con variantes', 'Útil cuando el producto tiene tamaños, porciones o variantes con distintos precios.', false));
      wrap.appendChild(makeSelect('Formato de precio', ['$ 9.800', '$9.800', 'ARS 9.800', '9.800 ARS'], 'Solo define presentación visual, no modifica el precio real.'));
      wrap.appendChild(makeSelect('Dónde mostrar precio', ['Cards y detalle', 'Solo en detalle', 'Solo en checkout', 'Ocultar hasta seleccionar variante'], 'Gobierna la lectura comercial del precio dentro de la tienda.'));
      return wrap;
    }

    function openPanel(mode) {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Productos';
      if (title) {
        title.textContent = mode === 'active' ? 'Productos activos' : mode === 'hidden' ? 'Productos ocultos' : 'Ver todos';
      }
      body.appendChild(makeProductsList(mode));
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    function openPriceVisibility() {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Productos';
      if (title) title.textContent = 'Visibilidad de precio';
      body.appendChild(makePriceVisibilityPanel());
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Ver todos') openPanel('all');
        if (label === 'Productos activos') openPanel('active');
        if (label === 'Productos ocultos') openPanel('hidden');
        if (label === 'Visibilidad de precio') openPriceVisibility();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initProductosEditor);
  document.addEventListener('sazzu:page:load', initProductosEditor);
})();
