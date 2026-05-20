(function () {
  function initFondoEditor() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.fondoReady === '1') return;
    root.dataset.fondoReady = '1';

    const sidePanel = root.querySelector('.builderSidePanel');
    const editor = root.querySelector('[data-builder-inner-editor]');
    const editorBody = editor && editor.querySelector('.builderInnerEditor__body');
    const editorTitle = editor && editor.querySelector('.builderInnerEditor__header strong');
    const editorSection = editor && editor.querySelector('.builderInnerEditor__header span');

    function makeToggle(title, text) {
      const row = document.createElement('label');
      const input = document.createElement('input');
      const visual = document.createElement('span');
      const copy = document.createElement('div');
      const strong = document.createElement('strong');
      const small = document.createElement('small');
      row.className = 'builderToggleRow';
      input.type = 'checkbox';
      input.checked = true;
      strong.textContent = title;
      small.textContent = text;
      copy.appendChild(strong);
      copy.appendChild(small);
      row.appendChild(input);
      row.appendChild(visual);
      row.appendChild(copy);
      return row;
    }

    function makeColor(title, value, text) {
      const field = document.createElement('label');
      const span = document.createElement('span');
      const input = document.createElement('input');
      const hint = document.createElement('p');
      field.className = 'builderFormField';
      span.textContent = title;
      input.type = 'color';
      input.value = value;
      hint.className = 'builderFieldHint';
      hint.textContent = text;
      field.appendChild(span);
      field.appendChild(input);
      field.appendChild(hint);
      return field;
    }

    function openFondo() {
      if (!sidePanel || !editor || !editorBody) return;
      editorBody.innerHTML = '';
      if (editorSection) editorSection.textContent = 'Diseño';
      if (editorTitle) editorTitle.textContent = 'Fondo';

      editorBody.appendChild(makeToggle('Lineas divisorias entre secciones', 'Muestra separadores finos entre bloques de la tienda.'));
      editorBody.appendChild(makeColor('Color general', '#fff7ea', 'Tambien se puede editar desde Paleta. Este control debe ser espejo del color general del sitio.'));
      editorBody.appendChild(makeColor('Color en fondos especiales', '#f5dfbd', 'Afecta combos, banners, ofertas especiales o secciones de alta intencion.'));
      editorBody.appendChild(makeToggle('Usar patron suave', 'Agrega una textura ligera para que el fondo no se sienta plano.'));
      editorBody.appendChild(makeToggle('Respetar fondos especiales', 'Permite que combos, promociones y banners tengan un fondo distinto al general.'));

      sidePanel.classList.add('is-editing');
      editor.setAttribute('aria-hidden', 'false');
    }

    root.querySelectorAll('.builderToolCard').forEach(function (button) {
      button.addEventListener('click', function () {
        const strong = button.querySelector('strong');
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === 'Fondo') openFondo();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initFondoEditor);
  document.addEventListener('sazzu:page:load', initFondoEditor);
})();
