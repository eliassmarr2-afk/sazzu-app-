/* ======= INICIO · SISTEMA GLOBAL DE DROPDOWNS · PROTOCOL DATA ======= */
/* Helper reutilizable para montar dropdowns custom sobre select nativo */

window.ProtocolDropdowns = window.ProtocolDropdowns || (function () {
    const instances = {};
    let outsideClickBound = false;
  
    function escapeHtml(str) {
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  
    function getBlueIconMarkup() {
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 8.5 12 4l8 4.5M4 8.5V15.5L12 20l8-4.5V8.5M4 8.5 12 13m8-4.5L12 13m0 0v7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      `;
    }
  
    function splitLabel(label, separator) {
      const raw = String(label || "").trim();
  
      if (!raw) {
        return {
          primary: "Seleccionar",
          secondary: ""
        };
      }
  
      const parts = raw.split(separator);
  
      if (parts.length >= 2) {
        return {
          primary: String(parts[0] || "").trim(),
          secondary: parts.slice(1).join(separator).trim()
        };
      }
  
      return {
        primary: raw,
        secondary: ""
      };
    }
  
    function closeAll() {
      Object.values(instances).forEach((instance) => {
        if (!instance || !instance.wrap) return;
        instance.wrap.classList.remove("is-open");
        if (instance.trigger) {
          instance.trigger.setAttribute("aria-expanded", "false");
        }
      });
    }
  
    function ensureOutsideClick() {
      if (outsideClickBound) return;
      outsideClickBound = true;
  
      document.addEventListener("click", (e) => {
        const inside = e.target.closest(".pdDropdown");
        if (!inside) {
          closeAll();
        }
      });
    }
  
    function ensureStructure(instance) {
      const { wrap, nativeSelect, trigger } = instance;
      if (!wrap || !nativeSelect || !trigger) return;
  
      wrap.classList.add("pdDropdown");
      nativeSelect.classList.add("pdDropdown__native");
      trigger.classList.add("pdDropdown__trigger");
  
      trigger.innerHTML = `
        <span class="pdDropdown__triggerInner">
          <span class="pdDropdown__icon">${getBlueIconMarkup()}</span>
  
          <span class="pdDropdown__content is-placeholder">
            <span class="pdDropdown__primary">Seleccionar</span>
            <span class="pdDropdown__secondary"></span>
          </span>
        </span>
  
        <span class="pdDropdown__chevron" aria-hidden="true"></span>
      `;
    }
  
    function bind(instance) {
      const { id, wrap, nativeSelect, trigger, dropdown } = instance;
      if (!wrap || !nativeSelect || !trigger || !dropdown) return;
      if (wrap.dataset.pdBound === "1") return;
  
      wrap.dataset.pdBound = "1";
  
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        if (trigger.disabled) return;
  
        const isOpen = wrap.classList.contains("is-open");
        closeAll();
  
        if (!isOpen) {
          wrap.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
  
      dropdown.addEventListener("click", (e) => {
        const optionBtn = e.target.closest(".pdDropdown__option");
        if (!optionBtn || optionBtn.disabled) return;
  
        const value = String(optionBtn.dataset.value || "");
        nativeSelect.value = value;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  
        wrap.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
  
        refresh(id);
      });
  
      ensureOutsideClick();
    }
  
    function refresh(id) {
      const instance = instances[id];
      if (!instance) return;
  
      const { nativeSelect, trigger, dropdown, separator, placeholder } = instance;
      if (!nativeSelect || !trigger || !dropdown) return;
  
      const content = trigger.querySelector(".pdDropdown__content");
      const primary = trigger.querySelector(".pdDropdown__primary");
      const secondary = trigger.querySelector(".pdDropdown__secondary");
  
      const options = Array.from(nativeSelect.options || []);
      const selectedValue = String(nativeSelect.value || "");
      const selectedOption =
        options.find((opt) => String(opt.value || "") === selectedValue) ||
        options[0] ||
        null;
  
      const selectedLabel = selectedOption
        ? String(selectedOption.textContent || "").trim()
        : String(placeholder || "Seleccionar");
  
      const selectedParts = splitLabel(selectedLabel, separator);
      const isPlaceholder = !selectedValue;
  
      if (primary) primary.textContent = selectedParts.primary || placeholder || "Seleccionar";
      if (secondary) secondary.textContent = selectedParts.secondary || "";
      if (content) content.classList.toggle("is-placeholder", isPlaceholder);
  
      trigger.disabled = !!nativeSelect.disabled;
  
      dropdown.classList.add("pdDropdown__dropdown");
  
      dropdown.innerHTML = options.map((opt) => {
        const value = String(opt.value || "");
        const label = String(opt.textContent || "").trim();
        const parts = splitLabel(label, separator);
        const isSelected = value === selectedValue;
        const isOptionPlaceholder = value === "";
        const disabledAttr = opt.disabled ? " disabled" : "";
  
        return `
          <button
            type="button"
            class="pdDropdown__option${isSelected ? " is-selected" : ""}${isOptionPlaceholder ? " is-placeholder" : ""}"
            data-value="${escapeHtml(value)}"
            ${disabledAttr}
          >
            <span class="pdDropdown__optionInner">
              <span class="pdDropdown__icon">${getBlueIconMarkup()}</span>
  
              <span class="pdDropdown__optionContent">
                <span class="pdDropdown__optionPrimary">${escapeHtml(parts.primary || placeholder || "Seleccionar")}</span>
                <span class="pdDropdown__optionSecondary">${escapeHtml(parts.secondary || "")}</span>
              </span>
            </span>
          </button>
        `;
      }).join("");
    }
  
    function mount(config) {
      const id = String(config.id || "").trim();
      if (!id) return;
  
      const instance = {
        id,
        separator: config.separator || "·",
        placeholder: config.placeholder || "Seleccionar",
        wrap: document.getElementById(config.wrapId),
        nativeSelect: document.getElementById(config.nativeSelectId),
        trigger: document.getElementById(config.triggerId),
        dropdown: document.getElementById(config.dropdownId)
      };
  
      if (!instance.wrap || !instance.nativeSelect || !instance.trigger || !instance.dropdown) {
        return;
      }
  
      instances[id] = instance;
  
      ensureStructure(instance);
      bind(instance);
      refresh(id);
    }
  
    return {
      mount,
      refresh,
      closeAll
    };
  })();
  /* ======= FIN · SISTEMA GLOBAL DE DROPDOWNS · PROTOCOL DATA ======= */

/* ======= INICIO · LOADER PRODUCTOS COMESTIBLES ======= */
(function () {
  function shouldLoadProductosComestibles_() {
    return !!document.querySelector('body[data-page="productos"]');
  }

  function ensureCss_(href, marker) {
    if (document.querySelector('link[data-loader="' + marker + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-loader', marker);
    document.head.appendChild(link);
  }

  function ensureScript_(src, marker) {
    if (document.querySelector('script[data-loader="' + marker + '"]')) return;
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute('data-loader', marker);
    document.body.appendChild(script);
  }

  function loadProductosComestibles_() {
    if (!shouldLoadProductosComestibles_()) return;
    ensureCss_('../css/productos-comestibles.css', 'productos-comestibles-css');
    ensureCss_('../css/productos-combos.css', 'productos-combos-css');
    ensureScript_('../js/supabase-client.js', 'supabase-client-js');
    ensureScript_('../js/productos-payloads.js', 'productos-payloads-js');
    ensureScript_('../js/productos-comestibles.js', 'productos-comestibles-js');
    ensureScript_('../js/productos-combos.js', 'productos-combos-js');
    ensureScript_('../js/productos-operaciones.js', 'productos-operaciones-js');
    ensureScript_('../js/productos-rehidratacion.js', 'productos-rehidratacion-js');
    ensureScript_('../js/productos-supabase.js', 'productos-supabase-js');
    ensureScript_('../js/productos-combo-optionals-stage-a.js', 'productos-combo-optionals-stage-a-js');
    ensureScript_('../js/productos-combo-optionals-payload-sync.js', 'productos-combo-optionals-payload-sync-js');
    ensureScript_('../js/productos-combo-optionals-collector-bridge.js', 'productos-combo-optionals-collector-bridge-js');
    ensureScript_('../js/productos-combo-optionals-payload-fields-bridge.js', 'productos-combo-optionals-payload-fields-bridge-js');
    ensureScript_('../js/productos-combo-optionals-recommended-count-bridge.js', 'productos-combo-optionals-recommended-count-bridge-js');
    ensureScript_('../js/productos-comestibles-optionals-stage-a.js', 'productos-comestibles-optionals-stage-a-js');
    ensureScript_('../js/productos-comestibles-optionals-click-fix.js', 'productos-comestibles-optionals-click-fix-js');
    ensureScript_('../js/productos-comestibles-optionals-layout-fix.js', 'productos-comestibles-optionals-layout-fix-js');
    ensureScript_('../js/productos-comestibles-optionals-pointer-fix.js', 'productos-comestibles-optionals-pointer-fix-js');
  }

  document.addEventListener('DOMContentLoaded', loadProductosComestibles_);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(loadProductosComestibles_, 80);
    setTimeout(loadProductosComestibles_, 260);
  });
})();
/* ======= FIN · LOADER PRODUCTOS COMESTIBLES ======= */
  