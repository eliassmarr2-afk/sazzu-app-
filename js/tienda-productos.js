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

    function productRow(product) {
      const row = document.createElement('article');
      const copy = document.createElement('div');
      const name = document.createElement('strong');
      const detail = document.createElement('small');
      const price = document.createElement('b');
      const toggle = document.createElement('div');
      const input = document.createElement('input');
      const visual = document.createElement('span');
      const label = document.createElement('em');

      row.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr)92px;gap:12px;align-items:center;padding:12px;border-radius:5px;background:#fff;border:1px solid #d7d7d7;';
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
        label.textContent = input.checked ? 'Activo' : 'Inactivo';
        label.style.color = input.checked ? '#2479ff' : '#667085';
      });

      copy.appendChild(name);
      copy.appendChild(detail);
      copy.appendChild(price);
      row.appendChild(copy);
      row.appendChild(toggle);
      return row;
    }

    function makeProductsList(onlyActive) {
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
          .filter(function (p) { return !onlyActive || p.active; })
          .filter(function (p) { return !q || (p.name + ' ' + p.detail).toLowerCase().indexOf(q) >= 0; })
          .forEach(function (p) { list.appendChild(productRow(p)); });
      }

      search.input.addEventListener('input', render);
      wrap.appendChild(search.field);
      wrap.appendChild(note);
      wrap.appendChild(list);
      render();
      return wrap;
    }

    function openPanel(mode) {
      if (!sidePanel || !editor || !body) return;
      body.innerHTML = '';
      if (section) section.textContent = 'Productos';
      if (title) title.textContent = mode === 'active' ? 'Productos activos' : 'Ver todos';
      body.appendChild(makeProductsList(mode === 'active'));
      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Ver todos') openPanel('all');
        if (label === 'Productos activos') openPanel('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initProductosEditor);
  document.addEventListener('sazzu:page:load', initProductosEditor);
})();
