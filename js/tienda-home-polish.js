(function () {
  function initHomePolish() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.homePolishReady === '1') return;
    root.dataset.homePolishReady = '1';

    const panel = root.querySelector('.builderPreviewPanel');
    let lastPhone = null;

    function activateTab(tabName) {
      root.querySelectorAll('[data-builder-tab]').forEach(function (tab) {
        tab.classList.toggle('is-active', tab.dataset.builderTab === tabName);
      });
      root.querySelectorAll('[data-builder-panel]').forEach(function (section) {
        section.classList.toggle('is-active', section.dataset.builderPanel === tabName);
      });
    }

    function activateInicio() {
      activateTab('home');
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

    function getOutline(phone) {
      let outline = phone.querySelector('[data-live-hover-outline]');
      if (!outline) {
        outline = document.createElement('div');
        outline.setAttribute('data-live-hover-outline', '');
        outline.innerHTML = '<span data-live-hover-label></span>';
        phone.appendChild(outline);
      }
      return outline;
    }

    function paintOutline(outline, labelText) {
      outline.style.cssText += 'border:2px solid rgba(36,121,255,.88);border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.72),0 0 0 4px rgba(36,121,255,.10);pointer-events:none;z-index:40;opacity:1;transform:translateY(0);transition:opacity .16s ease, transform .16s ease;';
      const label = outline.querySelector('[data-live-hover-label]');
      if (label) {
        label.textContent = labelText;
        label.style.cssText = 'position:absolute;left:12px;top:12px;padding:5px 8px;border-radius:999px;background:#2479ff;color:#fff;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 18px rgba(36,121,255,.22);';
      }
    }

    function hideOutline(phone) {
      if (!phone) return;
      const outline = phone.querySelector('[data-live-hover-outline]');
      if (!outline) return;
      outline.style.opacity = '0';
      outline.style.transform = 'translateY(2px)';
      phone.style.cursor = 'default';
    }

    function showHomeOutline(phone) {
      const outline = getOutline(phone);
      const bottom = getHomeBottom(phone);
      outline.style.cssText = 'position:absolute;left:0;right:0;top:0;height:' + bottom + 'px;';
      paintOutline(outline, 'Inicio');
      phone.style.cursor = 'pointer';
    }

    function showZoneOutline(phone, zone) {
      const outline = getOutline(phone);
      const label = zone.getAttribute('data-live-zone-label') || 'Sección';
      const top = zone.offsetTop;
      const height = zone.offsetHeight;
      outline.style.cssText = 'position:absolute;left:0;right:0;top:' + top + 'px;height:' + height + 'px;';
      paintOutline(outline, label);
      phone.style.cursor = 'pointer';
    }

    function clickToolCard(label) {
      const cards = Array.from(root.querySelectorAll('.builderToolCard'));
      const card = cards.find(function (button) {
        const strong = button.querySelector('strong');
        return strong && strong.textContent.trim() === label;
      });
      if (card) card.click();
    }

    function openFromPreview(kind) {
      const sectionMap = {
        banner: 'Banner',
        'mas-elegidos': 'Más elegidos',
        combos: 'Combos',
        'sumar-pedido': 'Sumar pedido'
      };

      if (kind === 'home') {
        activateTab('home');
        setTimeout(function () { clickToolCard('Nombre'); }, 40);
        return;
      }

      if (kind === 'pestanas') {
        activateTab('tabs');
        setTimeout(function () { clickToolCard('Editar pestañas'); }, 40);
        return;
      }

      if (sectionMap[kind]) {
        activateTab('sections');
        setTimeout(function () { clickToolCard(sectionMap[kind]); }, 40);
      }
    }

    function bindHoverCursor(phone) {
      if (!phone || phone.dataset.homeHoverReady === '1') return;
      phone.dataset.homeHoverReady = '1';

      phone.addEventListener('mousemove', function (event) {
        const targetZone = event.target.closest ? event.target.closest('[data-live-edit-zone]') : null;
        if (targetZone && phone.contains(targetZone)) {
          showZoneOutline(phone, targetZone);
          return;
        }

        const rect = phone.getBoundingClientRect();
        const y = event.clientY - rect.top + phone.scrollTop;
        const bottom = getHomeBottom(phone);
        if (y >= 0 && y <= bottom) {
          showHomeOutline(phone);
          return;
        }

        hideOutline(phone);
      });

      phone.addEventListener('click', function (event) {
        const targetZone = event.target.closest ? event.target.closest('[data-live-edit-zone]') : null;

        if (targetZone && phone.contains(targetZone)) {
          event.preventDefault();
          event.stopPropagation();
          openFromPreview(targetZone.getAttribute('data-live-edit-zone'));
          return;
        }

        const rect = phone.getBoundingClientRect();
        const y = event.clientY - rect.top + phone.scrollTop;
        const bottom = getHomeBottom(phone);
        if (y >= 0 && y <= bottom) {
          event.preventDefault();
          event.stopPropagation();
          openFromPreview('home');
        }
      });

      phone.addEventListener('mouseleave', function () {
        hideOutline(phone);
      });

      phone.addEventListener('scroll', function () {
        hideOutline(phone);
      }, { passive: true });
    }

    function paintHomeOutline() {
      if (!panel) return;
      const phone = panel.querySelector('[data-live-store-phone]');
      if (!phone) return;
      lastPhone = phone;
      getOutline(phone).style.opacity = '0';
      bindHoverCursor(phone);
    }

    root.addEventListener('click', function (event) {
      const tab = event.target.closest('[data-builder-tab]');
      if (tab) {
        setTimeout(function () {
          renameEditorSection();
          paintHomeOutline();
          if (lastPhone) hideOutline(lastPhone);
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