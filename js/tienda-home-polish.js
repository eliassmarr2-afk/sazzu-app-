(function () {
  function initHomePolish() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.homePolishReady === '1') return;
    root.dataset.homePolishReady = '1';

    const panel = root.querySelector('.builderPreviewPanel');

    function activateInicio() {
      root.querySelectorAll('[data-builder-tab]').forEach(function (tab) {
        tab.classList.toggle('is-active', tab.dataset.builderTab === 'home');
      });
      root.querySelectorAll('[data-builder-panel]').forEach(function (section) {
        section.classList.toggle('is-active', section.dataset.builderPanel === 'home');
      });
    }

    function renameEditorSection() {
      const sectionLabel = root.querySelector('.builderInnerEditor__header span');
      if (sectionLabel && sectionLabel.textContent.trim() === 'Identidad') {
        sectionLabel.textContent = 'Inicio';
      }
    }

    function paintHomeOutline() {
      if (!panel) return;
      const phone = panel.querySelector('[data-live-store-phone]');
      if (!phone) return;

      let outline = phone.querySelector('[data-live-home-outline]');
      if (!outline) {
        outline = document.createElement('div');
        outline.setAttribute('data-live-home-outline', '');
        outline.innerHTML = '<span>Inicio</span>';
        phone.appendChild(outline);
      }

      outline.style.cssText = 'position:absolute;left:7px;right:7px;top:7px;height:365px;border:2px solid rgba(36,121,255,.82);border-radius:8px;box-shadow:0 0 0 4px rgba(36,121,255,.10);pointer-events:none;z-index:20;transition:opacity .18s ease, transform .18s ease;';
      const label = outline.querySelector('span');
      if (label) {
        label.style.cssText = 'position:absolute;left:10px;top:10px;padding:5px 8px;border-radius:999px;background:#2479ff;color:#fff;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 18px rgba(36,121,255,.22);';
      }

      const activeTab = root.querySelector('[data-builder-tab].is-active');
      const isHome = !activeTab || activeTab.dataset.builderTab === 'home';
      outline.style.opacity = isHome ? '1' : '.22';
    }

    root.addEventListener('click', function (event) {
      const tab = event.target.closest('[data-builder-tab]');
      if (tab) {
        setTimeout(function () {
          renameEditorSection();
          paintHomeOutline();
        }, 0);
      }
    });

    root.addEventListener('sazzu:builder:change', function () {
      setTimeout(function () {
        renameEditorSection();
        paintHomeOutline();
      }, 0);
    });

    if (panel) {
      const observer = new MutationObserver(function () {
        paintHomeOutline();
      });
      observer.observe(panel, { childList: true, subtree: true });
    }

    setTimeout(function () {
      activateInicio();
      renameEditorSection();
      paintHomeOutline();
    }, 80);
  }

  document.addEventListener('DOMContentLoaded', initHomePolish);
  document.addEventListener('sazzu:page:load', initHomePolish);
})();
