// Protocol Data - Panel Tienda - Editor de Tarjetas
(function () {
  const PAGE_EVENT = "sazzu:page:load";

  function initTarjetasEditor_() {
    const root = document.querySelector(".tiendaBuilderSandbox");
    if (!root || root.dataset.tarjetasReady === "1") return;
    root.dataset.tarjetasReady = "1";

    const sidePanel = root.querySelector(".builderSidePanel");
    const editor = root.querySelector("[data-builder-inner-editor]");
    const editorSection = editor ? editor.querySelector(".builderInnerEditor__header span") : null;
    const editorTitle = editor ? editor.querySelector(".builderInnerEditor__header strong") : null;
    const editorBody = editor ? editor.querySelector(".builderInnerEditor__body") : null;

    function openEditor_() {
      if (!sidePanel || !editor || !editorBody) return;

      editorBody.innerHTML = "";
      if (editorSection) editorSection.textContent = "Diseño";
      if (editorTitle) editorTitle.textContent = "Tarjetas";

      const preview = cardPreview_();
      editorBody.appendChild(preview.box);

      editorBody.appendChild(sliderControl_("Border-radius", "Define que tan rectas o redondeadas seran las tarjetas de productos, combos y upsells.", 0, 28, 5, "px", function (value) {
        preview.card.style.borderRadius = value + "px";
        preview.image.style.borderRadius = Math.max(0, value - 1) + "px";
      }));

      editorBody.appendChild(colorControl_("Color de tarjeta", "#ffffff", "Este color tambien existe en Paleta, pero puede ajustarse individualmente desde Tarjetas."));

      editorBody.appendChild(sliderControl_("Intensidad de sombra", "Controla cuanto se despega visualmente la tarjeta del fondo general.", 0, 100, 35, "%", function (value) {
        preview.card.style.boxShadow = value === 0 ? "none" : "0 " + Math.round(4 + value * 0.12) + "px " + Math.round(10 + value * 0.24) + "px rgba(15,23,42," + (0.05 + value * 0.002).toFixed(2) + ")";
      }));

      editorBody.appendChild(sliderControl_("Espaciado interno", "Define que tan pegado queda el contenido al borde de la tarjeta.", 6, 26, 14, "px", function (value) {
        preview.card.style.padding = value + "px";
        preview.content.style.gap = Math.max(5, Math.round(value * 0.55)) + "px";
      }));

      editorBody.appendChild(toggle_("Aplicar tambien a tarjetas de combos y ofertas especiales", "Mantiene consistencia visual entre productos, packs, combos y ofertas.", true));
      editorBody.appendChild(toggle_("Mostrar borde fino", "Ayuda a separar tarjetas cuando el fondo de la tienda es claro.", true));
      editorBody.appendChild(toggle_("Usar sombra solo al tocar o pasar por encima", "Reduce ruido visual en pantallas chicas y mantiene feedback de accion.", false));

      sidePanel.classList.add("is-editing");
      editor.setAttribute("aria-hidden", "false");
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

      input.addEventListener("input", function () {
        swatch.style.background = input.value;
        code.textContent = input.value;
        const previewCard = root.querySelector("[data-tarjeta-preview-card]");
        if (previewCard) previewCard.style.background = input.value;
      });

      return wrap;
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

    function cardPreview_() {
      const box = document.createElement("div");
      const title = document.createElement("strong");
      const card = document.createElement("article");
      const image = document.createElement("div");
      const content = document.createElement("div");
      const badge = document.createElement("span");
      const name = document.createElement("strong");
      const desc = document.createElement("small");
      const row = document.createElement("div");
      const price = document.createElement("b");
      const action = document.createElement("button");

      box.style.cssText = "display:grid;gap:12px;padding:14px;border-radius:5px;background:#fff;border:1px dashed #cfd4dc;";
      title.textContent = "Preview en tiempo real";
      title.style.cssText = "color:#2f3742;font-size:14px;font-weight:900;";

      card.setAttribute("data-tarjeta-preview-card", "");
      card.style.cssText = "display:grid;gap:12px;padding:14px;border-radius:5px;background:#ffffff;border:1px solid #e5e7eb;box-shadow:0 8px 18px rgba(15,23,42,.12);";
      image.style.cssText = "height:92px;border-radius:4px;background:linear-gradient(135deg,#b80f4d,#f5dfbd);";
      content.style.cssText = "display:grid;gap:8px;";
      badge.textContent = "MAS PEDIDA";
      badge.style.cssText = "width:max-content;padding:5px 8px;border-radius:999px;color:#2479ff;background:#eef5ff;font-size:10px;font-weight:900;letter-spacing:.03em;";
      name.textContent = "Torta frambuesa";
      name.style.cssText = "color:#111827;font-size:16px;font-weight:900;";
      desc.textContent = "Bizcochuelo suave, crema y cobertura artesanal.";
      desc.style.cssText = "color:#667085;font-size:12px;line-height:1.35;";
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;";
      price.textContent = "$18.900";
      price.style.cssText = "color:#111827;font-size:15px;";
      action.type = "button";
      action.textContent = "+";
      action.style.cssText = "width:40px;height:34px;border:0;border-radius:5px;color:#fff;background:#2479ff;font-size:18px;font-weight:900;";

      row.appendChild(price);
      row.appendChild(action);
      content.appendChild(badge);
      content.appendChild(name);
      content.appendChild(desc);
      content.appendChild(row);
      card.appendChild(image);
      card.appendChild(content);
      box.appendChild(title);
      box.appendChild(card);

      return { box, card, image, content };
    }

    root.querySelectorAll(".builderToolCard").forEach(function (button) {
      button.addEventListener("click", function () {
        const strong = button.querySelector("strong");
        const label = strong ? strong.textContent.trim() : button.textContent.trim();
        if (label === "Tarjetas") openEditor_();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initTarjetasEditor_);
  document.addEventListener(PAGE_EVENT, initTarjetasEditor_);
})();