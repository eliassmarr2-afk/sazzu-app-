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

    function colorControl_(label, value, description) {
      const wrap = document.createElement("label");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const desc = document.createElement("small");
      const swatch = document.createElement("span");
      const input = document.createElement("input");
      const code = document.createElement("em");

      wrap.style.cssText = "position:relative;display:grid;grid-template-columns:minmax(0,1fr)46px;gap:14px;align-items:center;padding:14px;border-radius:13px;background:#fff;border:1px solid #d7d7d7;cursor:pointer;";
      copy.style.cssText = "display:grid;gap:4px;";
      title.style.cssText = "color:#2f3742;font-size:14px;font-weight:800;";
      desc.style.cssText = "color:#667085;font-size:12px;line-height:1.35;";
      swatch.style.cssText = "width:42px;height:42px;border-radius:999px;border:3px solid #fff;box-shadow:0 0 0 1px #d7d7d7,0 10px 18px rgba(15,23,42,.10);background:" + value + ";";
      input.type = "color";
      input.value = value;
      input.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;";
      code.style.cssText = "display:inline-block;margin-top:2px;color:#2479ff;font-size:11px;font-style:normal;font-weight:800;";
      code.textContent = value;

      title.textContent = label;
      desc.textContent = description;
      copy.appendChild(title);
      copy.appendChild(desc);
      copy.appendChild(code);
      wrap.appendChild(copy);
      wrap.appendChild(swatch);
      wrap.appendChild(input);

      input.addEventListener("input", () => {
        swatch.style.background = input.value;
        code.textContent = input.value;
      });

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
        btn.style.cssText = "border:1px solid #d7d7d7;border-radius:999px;padding:10px 12px;background:#fff;color:#2f3742;font-size:12px;font-weight:800;cursor:pointer;";
        btn.addEventListener("click", () => {
          grid.querySelectorAll(".builderPaletteItem").forEach((el) => {
            el.classList.remove("is-selected");
            el.style.background = "#fff";
            el.style.color = "#2f3742";
            el.style.borderColor = "#d7d7d7";
          });
          btn.classList.add("is-selected");
          btn.style.background = "#2479ff";
          btn.style.color = "#fff";
          btn.style.borderColor = "#2479ff";
        });
        if (index === 0) {
          btn.style.background = "#2479ff";
          btn.style.color = "#fff";
          btn.style.borderColor = "#2479ff";
        }
        grid.appendChild(btn);
      });
      grid.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
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
        editorBody.appendChild(colorControl_("Color principal", "#fff7ea", "Este color afectara al fondo de todas las paginas del sitio."));
        editorBody.appendChild(colorControl_("Color de tarjetas", "#ffffff", "Esto afectara a colores de tarjetas de productos."));
        editorBody.appendChild(toggle_("Utilizar este color tambien para tarjetas de combos u ofertas especiales", "Permite mantener una experiencia visual consistente entre productos y ofertas."));
        editorBody.appendChild(colorControl_("Color de botones primarios", "#b80f4d", "Afecta a botones de Anadir, Continuar al pago, botones de +, -, Sumar y acciones principales."));
        editorBody.appendChild(colorControl_("Color de botones secundarios", "#f5dfbd", "Afecta a botones como Seguir comprando y acciones de menor prioridad."));
        editorBody.appendChild(colorControl_("Color de tabs", "#2479ff", "Afecta a seleccionadores de pestanas en la Home y en las paginas de productos."));
        editorBody.appendChild(colorControl_("Color de textos primarios", "#111827", "Afecta a titulos y leyendas principales."));
        editorBody.appendChild(colorControl_("Color de textos secundarios", "#667085", "Afecta a textos de caracteristicas, descripciones y ayudas visuales."));
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