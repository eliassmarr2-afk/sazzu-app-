// Protocol Data - Panel Tienda
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  function initTiendaBuilder_() {
    const root = document.querySelector(".tiendaBuilderSandbox");
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";

    const tabs = Array.from(root.querySelectorAll("[data-builder-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-builder-panel]"));
    const sidePanel = root.querySelector(".builderSidePanel");
    const editor = root.querySelector("[data-builder-inner-editor]");
    const editorSection = editor ? editor.querySelector(".builderInnerEditor__header span") : null;
    const editorTitle = editor ? editor.querySelector(".builderInnerEditor__header strong") : null;
    const editorBody = editor ? editor.querySelector(".builderInnerEditor__body") : null;
    const nameTargets = Array.from(root.querySelectorAll("[data-store-name-preview-small], [data-store-name-preview-title], [data-store-name-preview-row]"));

    function activateTab_(tabName) {
      tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.builderTab === tabName));
      panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.builderPanel === tabName));
    }

    function syncStoreName_() {
      const input = root.querySelector("[data-store-name-input]");
      const value = input && input.value.trim() ? input.value.trim() : "Nombre de tienda";
      nameTargets.forEach((target) => { target.textContent = value; });
    }

    function field_(label, type, value, attr) {
      const wrap = document.createElement("label");
      wrap.className = "builderFormField";
      const span = document.createElement("span");
      span.textContent = label;
      const input = document.createElement(type === "textarea" ? "textarea" : "input");
      if (type !== "textarea") input.type = type || "text";
      input.value = value || "";
      if (attr) input.setAttribute(attr, "");
      wrap.appendChild(span);
      wrap.appendChild(input);
      return wrap;
    }

    function hint_(text, isWarn) {
      const p = document.createElement("p");
      p.className = isWarn ? "builderFieldHint builderFieldHint--warn" : "builderFieldHint";
      p.textContent = text;
      return p;
    }

    function validation_(label, status) {
      const box = document.createElement("div");
      box.className = status === "verified" ? "builderValidation is-verified" : "builderValidation is-unverified";
      const dot = document.createElement("span");
      const text = document.createElement("strong");
      dot.setAttribute("aria-hidden", "true");
      text.textContent = label;
      box.appendChild(dot);
      box.appendChild(text);
      return box;
    }

    function uploadBox_() {
      const box = document.createElement("div");
      box.className = "builderUploadBox";
      const title = document.createElement("strong");
      const text = document.createElement("span");
      title.textContent = "Subir archivo";
      text.textContent = "Modulo inactivo por ahora. Luego se conectara a Storage/Supabase.";
      box.appendChild(title);
      box.appendChild(text);
      return box;
    }

    function toggle_(title, text, checked) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const visual = document.createElement("span");
      const copy = document.createElement("div");
      const strong = document.createElement("strong");
      const small = document.createElement("small");
      label.className = "builderToggleRow";
      input.type = "checkbox";
      input.checked = checked !== false;
      strong.textContent = title;
      small.textContent = text;
      copy.appendChild(strong);
      copy.appendChild(small);
      label.appendChild(input);
      label.appendChild(visual);
      label.appendChild(copy);
      return label;
    }

    function days_() {
      const wrap = document.createElement("div");
      wrap.className = "builderDaysPicker";
      ["L", "M", "M", "J", "V", "S", "D"].forEach((day, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = day;
        if (index < 6) btn.classList.add("is-selected");
        btn.addEventListener("click", () => btn.classList.toggle("is-selected"));
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function paletteGrid_() {
      const grid = document.createElement("div");
      grid.className = "builderPaletteList";
      ["Frambuesa + Beige", "Cafe + Crema", "Rotiseria Calida", "Oliva + Arena", "Negro Premium"].forEach((item, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = index === 0 ? "builderPaletteItem is-selected" : "builderPaletteItem";
        btn.textContent = item;
        btn.addEventListener("click", () => {
          grid.querySelectorAll(".builderPaletteItem").forEach((el) => el.classList.remove("is-selected"));
          btn.classList.add("is-selected");
        });
        grid.appendChild(btn);
      });
      return grid;
    }

    function buildEditor_(name) {
      if (!editorBody) return;
      editorBody.innerHTML = "";
      if (editorSection) editorSection.textContent = name === "Paleta" ? "Diseno" : "Identidad";
      if (editorTitle) editorTitle.textContent = name;

      if (name === "Nombre") {
        editorBody.appendChild(field_("Nombre de la tienda", "text", "Dulce Nube", "data-store-name-input"));
        editorBody.appendChild(field_("Leyenda", "text", "PASTELERIA ARTESANAL", "data-store-legend-input"));
        editorBody.appendChild(field_("Descripcion del negocio", "textarea", "Tortas, piononos, muffins y postres listos para pedir.", "data-store-description-input"));
        editorBody.appendChild(hint_("Estos datos aparecen directamente en el perfil y Home del sitio del negocio."));
      }

      if (name === "Portada" || name === "Logo") {
        editorBody.appendChild(uploadBox_());
        editorBody.appendChild(field_("URL", "url", ""));
        editorBody.appendChild(hint_("Las imagenes con URL suelen correr mas rapido.", true));
      }

      if (name === "Estado") {
        const row = document.createElement("div");
        row.className = "builderInlineFields";
        row.appendChild(field_("Horario de apertura", "time", "10:00"));
        row.appendChild(field_("Horario de cierre", "time", "20:00"));
        editorBody.appendChild(row);
        editorBody.appendChild(days_());
        editorBody.appendChild(toggle_("Permitir compras aunque este cerrado", "El pedido se procesara al momento de apertura."));
        editorBody.appendChild(hint_("Si desactivas esta opcion, la compra se bloquea fuera de los dias u horarios operativos. Se recomienda dejar encendido.", true));
        editorBody.appendChild(toggle_("Mostrar estado Abierto/Cerrado en la Home", "Mostrara un relojito con Abierto o Cerrado y el proximo horario disponible."));
      }

      if (name === "WhatsApp") {
        editorBody.appendChild(field_("Numero de WhatsApp", "tel", "+54 9 11 1234 5678", "data-store-whatsapp-input"));
        editorBody.appendChild(validation_("El numero NO esta verificado", "unverified"));
        editorBody.appendChild(toggle_("Mostrar globo de WhatsApp en la web", "El usuario podra clickear en el globo de WhatsApp y sera redirigido. Esto puede generar rebote en el sitio."));
        editorBody.appendChild(toggle_("Permitir solo usuarios registrados para enviar mensajes de WhatsApp", "Los usuarios deberan crear una cuenta para enviar mensajes.", false));
      }

      if (name === "Email") {
        editorBody.appendChild(field_("Correo electronico", "email", "contacto@dulcenube.com", "data-store-email-input"));
        editorBody.appendChild(validation_("Correo NO validado", "unverified"));
        editorBody.appendChild(toggle_("Utilizar este correo para recompra y acciones comerciales", "Es recomendable activar este flujo para una mejor tasa de conversion y reconversion dentro de Publicidad UTM y Publicidad Interna."));
      }

      if (name === "Paleta") {
        editorBody.appendChild(paletteGrid_());
        editorBody.appendChild(field_("Color principal", "text", "#b80f4d"));
        editorBody.appendChild(field_("Color secundario", "text", "#f5dfbd"));
        editorBody.appendChild(field_("Color de acento", "text", "#2479ff"));
        editorBody.appendChild(hint_("Estos colores se aplican a botones, badges, tabs y elementos activos."));
      }

      const nameInput = root.querySelector("[data-store-name-input]");
      if (nameInput) nameInput.addEventListener("input", syncStoreName_);
    }

    function openEditor_(name) {
      buildEditor_(name);
      if (sidePanel) sidePanel.classList.add("is-editing");
      if (editor) editor.setAttribute("aria-hidden", "false");
      const firstInput = editorBody ? editorBody.querySelector("input, textarea, select") : null;
      setTimeout(() => { if (firstInput) firstInput.focus(); }, 220);
    }

    function closeEditor_() {
      if (sidePanel) sidePanel.classList.remove("is-editing");
      if (editor) editor.setAttribute("aria-hidden", "true");
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => activateTab_(tab.dataset.builderTab)));

    root.querySelectorAll(".builderToolCard").forEach((button) => {
      button.addEventListener("click", () => {
        const strong = button.querySelector("strong");
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (["Nombre", "Portada", "Logo", "Estado", "WhatsApp", "Email", "Paleta"].indexOf(label) >= 0) openEditor_(label);
      });
    });

    root.querySelectorAll("[data-builder-editor-back]").forEach((button) => button.addEventListener("click", closeEditor_));
    root.querySelectorAll("[data-builder-editor-save]").forEach((button) => button.addEventListener("click", () => { syncStoreName_(); closeEditor_(); }));

    activateTab_("identity");
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();