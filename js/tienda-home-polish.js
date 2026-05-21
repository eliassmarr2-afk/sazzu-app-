(function () {
  function initHomePolish() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.homePolishReady === '1') return;
    root.dataset.homePolishReady = '1';

    const panel = root.querySelector('.builderPreviewPanel');
    let lastPhone = null;

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

    function getHomeBottom(phone) {
      const cover = phone.querySelector('[data-live-cover]');
      const whiteBlock = cover ? cover.nextElementSibling : null;
      if (!cover || !whiteBlock) return 420;
      return Math.ceil(whiteBlock.offsetTop + whiteBlock.offsetHeight);
    }

    function showOutline(phone, show) {
      const outline = phone.querySelector('[data-live-home-outline]');
      if (!outline) return;
      outline.style.opacity = show ? '1' : '0';
      outline.style.transform = show ? 'translateY(0)' : 'translateY(2px)';
      phone.style.cursor = show ? 'pointer' : 'default';
    }

    function bindHoverCursor(phone) {
      if (!phone || phone.dataset.homeHoverReady === '1') return;
      phone.dataset.homeHoverReady = '1';

      phone.addEventListener('mousemove', function (event) {
        const rect = phone.getBoundingClientRect();
        const y = event.clientY - rect.top;
        const bottom = getHomeBottom(phone);
        const activeTab = root.querySelector('[data-builder-tab].is-active');
        const isHome = !activeTab || activeTab.dataset.builderTab === 'home';
        showOutline(phone, isHome && y >= 0 && y <= bottom);
      });

      phone.addEventListener('mouseleave', function () {
        showOutline(phone, false);
      });
    }

    function paintHomeOutline() {
      if (!panel) return;
      const phone = panel.querySelector('[data-live-store-phone]');
      if (!phone) return;
      lastPhone = phone;

      let outline = phone.querySelector('[data-live-home-outline]');
      if (!outline) {
        outline = document.createElement('div');
        outline.setAttribute('data-live-home-outline', '');
        outline.innerHTML = '<span>Inicio</span>';
        phone.appendChild(outline);
      }

      const bottom = getHomeBottom(phone);
      outline.style.cssText = 'position:absolute;left:0;right:0;top:0;height:' + bottom + 'px;border:2px solid rgba(36,121,255,.86);border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.70),0 0 0 4px rgba(36,121,255,.10);pointer-events:none;z-index:20;opacity:0;transform:translateY(2px);transition:opacity .16s ease, transform .16s ease;';

      const label = outline.querySelector('span');
      if (label) {
        label.style.cssText = 'position:absolute;left:12px;top:12px;padding:5px 8px;border-radius:999px;background:#2479ff;color:#fff;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 18px rgba(36,121,255,.22);';
      }

      bindHoverCursor(phone);
    }

    root.addEventListener('click', function (event) {
      const tab = event.target.closest('[data-builder-tab]');
      if (tab) {
        setTimeout(function () {
          renameEditorSection();
          paintHomeOutline();
          if (lastPhone) showOutline(lastPhone, false);
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
