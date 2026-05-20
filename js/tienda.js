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

      wrap.style.cssText = "position:relative;display:grid;grid-template-columns:minmax(0,1fr)46px;gap:14px;align-items:center;padding:14px;border-radius:5px;background:#fff;border:1px solid #d7d7d7;cursor:pointer;";
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

    function sliderControl_(label, description, min, max, value, suffix, onInput) {
      const block = document.createElement("div");
      const head = document.createElement("div");
      const title = document.createElement("strong");
      const valueText = document.createElement("em");
      const desc = document.createElement("small");
      const range = document.createElement("input");

      block.style.cssText = "display:grid;gap:10px;padding:14px;border-radius:5px;background:#fff;border:1px solid #d7d7d7;";
      head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;";
      title.style.cssText = "color:#2f3742;font-size:14px;font-weight:900;";
      valueText.style.cssText = "color:#2479ff;font-size:12px;font-style:normal;font-weight:900;";
      desc.style.cssText = "color:#667085;font-size:12px;line-height:1.35;";
      range.type = "range";
      range.min = String(min);
      range.max = String(max);
      range.value = String(value);
      range.style.cssText = "width:100%;accent-color:#2479ff;cursor:pointer;";

      function paint_() {
        valueText.textContent = range.value + suffix;
        if (onInput) onInput(Number(range.value));
      }

      title.textContent = label;
      desc.textContent = description;
      range.addEventListener("input", paint_);
      paint_();

      head.appendChild(title);
      head.appendChild(valueText);
      block.appendChild(head);
      block.appendChild(desc);
      block.appendChild(range);
      return block;
    }

    function buttonPreviewLive_() {
      const box = document.createElement("div");
      const title = document.createElement("strong");
      const primary = document.createElement("button");
      const secondary = document.createElement("button");
      const qty = document.createElement("div");
      const minus = document.createElement("button");
      const plus = document.createElement("button");

      box.style.cssText = "display:grid;gap:12px;padding:14px;border-radius:5px;background:#fff;border:1px dashed #cfd4dc;";
      title.textContent = "Preview en tiempo real";
      title.style.cssText = "color:#2f3742;font-size:14px;font-weight:900;";

      primary.type = "button";
      primary.innerHTML = "<span>Añadir al pedido</span><small>Entrega estimada hoy</small>";
      primary.style.cssText = "display:grid;place-items:center;gap:2px;height:48px;border:0;border-radius:16px;background:#b80f4d;color:#fff;font-weight:900;box-shadow:0 12px 24px rgba(184,15,77,.22);cursor:pointer;";
      primary.querySelector("small").style.cssText = "font-size:11px;font-weight:650;opacity:.82;";

      secondary.type = "button";
      secondary.textContent = "Seguir comprando";
      secondary.style.cssText = "height:42px;border:1px solid #d7d7d7;border-radius:16px;background:#fff;color:#2f3742;font-size:13px;font-weight:850;cursor:pointer;";

      qty.style.cssText = "display:flex;gap:8px;align-items:center;";
      minus.type = "button";
      plus.type = "button";
      minus.textContent = "-";
      plus.textContent = "+";
      [minus, plus].forEach((btn) => {
        btn.style.cssText = "width:42px;height:36px;border:0;border-radius:12px;background:#2479ff;color:#fff;font-size:18px;font-weight:900;cursor:pointer;";
      });

      qty.appendChild(minus);
      qty.appendChild(plus);
      box.appendChild(title);
      box.appendChild(primary);
      box.appendChild(secondary);
      box.appendChild(qty);
      return { box, primary, secondary, minus, plus };
    }

    function buildEditor_(name) {
      if (!editorBody) return;
      editorBody.innerHTML = "";
      if (editorSection) editorSection.textContent = ["Paleta", "Botones"].indexOf(name) >= 0 ? "Diseno" : "Identidad";
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

      if (name === "Botones") {
        const preview = buttonPreviewLive_();
        editorBody.appendChild(preview.box);
        editorBody.appendChild(sliderControl_("Tamaño", "Controla el peso visual de Añadir, Continuar al pago y botones de carrito.", 60, 120, 80, "%", (value) => {
          const h = Math.round(34 + value * 0.18);
          const fs = Math.round(10 + value * 0.055);
          preview.primary.style.height = h + "px";
          preview.primary.style.fontSize = fs + "px";
          preview.secondary.style.height = Math.max(36, h - 6) + "px";
          preview.plus.style.width = Math.max(34, Math.round(28 + value * 0.18)) + "px";
          preview.minus.style.width = preview.plus.style.width;
        }));
        editorBody.appendChild(sliderControl_("Border-radius", "Define si los botones se sienten rectos, suaves o redondeados.", 0, 28, 16, "px", (value) => {
          [preview.primary, preview.secondary, preview.plus, preview.minus].forEach((btn) => { btn.style.borderRadius = value + "px"; });
        }));
        editorBody.appendChild(sliderControl_("Intensidad de sombra", "Regula cuanto se despegan visualmente los botones principales.", 0, 100, 45, "%", (value) => {
          preview.primary.style.boxShadow = value === 0 ? "none" : "0 " + Math.round(6 + value * 0.10) + "px " + Math.round(10 + value * 0.22) + "px rgba(184,15,77," + (0.08 + value * 0.0026).toFixed(2) + ")";
        }));
        editorBody.appendChild(toggle_("Usar sombra en botones principales", "Ayuda a que las acciones de compra se destaquen sin ensuciar la interfaz."));
        editorBody.appendChild(toggle_("Permitir subtitulo en botones principales", "Ideal para microcopy como Entrega estimada hoy, Cupos limitados o Llega gratis."));
        editorBody.appendChild(toggle_("Activar animacion rapida al tocar botones", "Permite una respuesta visual inmediata antes de ejecutar la accion."));
        editorBody.appendChild(toggle_("Mostrar iconos en botones clave", "Aplica iconos en Anadir, Pagar, Seguir comprando y acciones de carrito."));
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
        if (["Nombre", "Portada", "Logo", "Estado", "WhatsApp", "Email", "Paleta", "Botones"].indexOf(label) >= 0) openEditor_(label);
      });
    });

    root.querySelectorAll("[data-builder-editor-back]").forEach((button) => button.addEventListener("click", closeEditor_));
    root.querySelectorAll("[data-builder-editor-save]").forEach((button) => button.addEventListener("click", () => { syncStoreName_(); closeEditor_(); }));

    activateTab_("identity");
  }

  document.addEventListener("DOMContentLoaded", initTiendaBuilder_);
  document.addEventListener(PAGE_EVENT, initTiendaBuilder_);
})();