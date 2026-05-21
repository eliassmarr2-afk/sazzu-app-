(function () {
  function initLiveStorePreview() {
    const root = document.querySelector('.tiendaBuilderSandbox');
    if (!root || root.dataset.livePreviewReady === '1') return;
    root.dataset.livePreviewReady = '1';

    const panel = root.querySelector('.builderPreviewPanel');
    if (!panel) return;

    const state = {
      activeTab: 'identity',
      name: 'Dulce Nube',
      legend: 'PASTELERÍA ARTESANAL',
      description: 'Tortas, piononos, muffins y postres listos para pedir.',
      logoText: 'DN',
      delivery: '35-50 min',
      shipping: '$1.000',
      minimum: '$7.500'
    };

    function renderHomePreview() {
      panel.innerHTML = '';
      panel.style.padding = '0';
      panel.style.background = 'transparent';
      panel.style.boxShadow = 'none';
      panel.style.border = '0';

      const phone = document.createElement('section');
      phone.setAttribute('data-live-store-phone', '');
      phone.style.cssText = 'width:min(430px,100%);min-height:760px;margin:0 auto;background:#fff7ea;border-radius:5px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.14);border:1px solid rgba(15,23,42,.08);font-family:inherit;position:relative;';

      phone.innerHTML = '' +
        '<div data-live-cover style="height:165px;background:linear-gradient(135deg,#6b3a31 0%,#9c5a4a 45%,#f5dfbd 100%);position:relative;">' +
          '<button type="button" style="position:absolute;left:16px;top:14px;width:38px;height:38px;border:0;border-radius:999px;background:rgba(17,24,39,.38);color:#fff;font-size:22px;font-weight:900;">‹</button>' +
          '<button type="button" style="position:absolute;right:16px;top:14px;width:38px;height:38px;border:0;border-radius:999px;background:rgba(17,24,39,.38);color:#fff;font-size:18px;font-weight:900;">↗</button>' +
        '</div>' +
        '<section style="position:relative;background:#fff;padding:52px 20px 16px;">' +
          '<div data-live-logo style="position:absolute;left:20px;top:-36px;width:74px;height:74px;border-radius:999px;background:linear-gradient(135deg,#9c2448,#f5dfbd);border:4px solid #fff;box-shadow:0 8px 20px rgba(15,23,42,.16);display:grid;place-items:center;color:#fff;font-size:18px;font-weight:950;">DN</div>' +
          '<span data-live-legend style="display:block;color:#9c2448;font-size:12px;font-weight:950;letter-spacing:.11em;text-transform:uppercase;margin-bottom:4px;">PASTELERÍA ARTESANAL</span>' +
          '<h2 data-live-name style="margin:0;color:#211f27;font-size:29px;font-weight:950;letter-spacing:-.05em;line-height:1.05;">Dulce Nube</h2>' +
          '<p data-live-description style="margin:10px 0 0;color:#667085;font-size:15px;line-height:1.35;">Tortas, piononos, muffins y postres listos para pedir.</p>' +
          '<div style="display:flex;align-items:center;gap:6px;margin-top:12px;color:#35303a;font-size:13px;font-weight:800;">' +
            '<span>4.9</span><span style="color:#9c2448;letter-spacing:.02em;">★★★★★</span><span style="color:#667085;">+850 pedidos dulces</span>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;">' +
            metricCard('Entrega', state.delivery) + metricCard('Envío', state.shipping) + metricCard('Mínimo', state.minimum) +
          '</div>' +
        '</section>' +
        '<section style="padding:14px 18px;background:#fff1df;">' +
          '<article style="display:grid;grid-template-columns:minmax(0,1fr)62px;gap:12px;align-items:center;padding:14px;border-radius:5px;background:linear-gradient(135deg,#9c2448,#d99837);color:#fff;">' +
            '<div><span style="display:block;font-size:11px;font-weight:950;letter-spacing:.12em;">OFERTA ACTIVA</span><strong style="display:block;font-size:15px;line-height:1.2;margin-top:4px;">Box dulce con muffins + mini torta con 15% OFF</strong></div>' +
            '<button type="button" style="height:38px;border:0;border-radius:5px;background:#fff;color:#9c2448;font-weight:950;">Ver</button>' +
          '</article>' +
        '</section>' +
        '<nav style="display:flex;gap:10px;overflow:hidden;padding:0 18px 12px;background:#fff7ea;">' +
          tabPill('Destacados', true) + tabPill('Tortas') + tabPill('Piononos') + tabPill('Muffins') +
        '</nav>' +
        '<section style="padding:0 18px 90px;background:#fff7ea;">' +
          '<div style="display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px;">' +
            '<div><span style="display:block;color:#9c2448;font-size:11px;font-weight:950;letter-spacing:.11em;">PEDIDO RÁPIDO</span><strong style="display:block;color:#211f27;font-size:21px;font-weight:950;letter-spacing:-.04em;">Más elegidos hoy</strong></div>' +
            '<b style="color:#9c2448;font-size:13px;">Ver todo</b>' +
          '</div>' +
          '<div style="display:grid;grid-auto-flow:column;grid-auto-columns:72%;gap:12px;overflow:hidden;">' +
            productCard('15% OFF','Box Dulce Nube','$ 9.800','#f5dfbd') + productCard('Más pedida','Torta Choco Cream','$ 12.500','#d7a98f') +
          '</div>' +
        '</section>' +
        '<footer style="position:absolute;left:0;right:0;bottom:0;height:64px;background:#fff;display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid rgba(15,23,42,.10);">' +
          navItem('Envios') + navItem('Inicio', true) + navItem('Carrito') +
        '</footer>';

      panel.appendChild(phone);
      syncPreviewFromOpenFields();
    }

    function metricCard(label, value) {
      return '<article style="padding:12px 10px;border:1px solid #efcdb9;border-radius:5px;background:#fff;"><span style="display:block;color:#667085;font-size:11px;font-weight:900;">' + label + '</span><strong style="display:block;color:#211f27;font-size:14px;font-weight:950;margin-top:4px;">' + value + '</strong></article>';
    }

    function tabPill(text, active) {
      return '<button type="button" style="height:38px;padding:0 14px;border-radius:5px;border:1px solid ' + (active ? '#9c2448' : '#efcdb9') + ';background:' + (active ? '#9c2448' : '#fff') + ';color:' + (active ? '#fff' : '#9c2448') + ';font-weight:950;white-space:nowrap;">' + text + '</button>';
    }

    function productCard(badge, name, price, color) {
      return '<article style="overflow:hidden;border-radius:5px;background:#fff;border:1px solid #efcdb9;"><div style="position:relative;height:112px;background:linear-gradient(135deg,' + color + ',#9c2448);"><span style="position:absolute;left:10px;top:10px;padding:6px 9px;border-radius:4px;background:#9c2448;color:#fff;font-size:11px;font-weight:950;">' + badge + '</span></div><div style="display:grid;gap:6px;padding:12px;"><strong style="font-size:15px;color:#211f27;">' + name + '</strong><small style="font-size:12px;line-height:1.35;color:#667085;">Producto destacado listo para compra rápida.</small><div style="display:flex;align-items:center;justify-content:space-between;"><b style="font-size:16px;color:#211f27;">' + price + '</b><button type="button" style="width:38px;height:34px;border:0;border-radius:5px;background:#9c2448;color:#fff;font-size:18px;font-weight:950;">+</button></div></div></article>';
    }

    function navItem(text, active) {
      return '<button type="button" style="border:0;background:' + (active ? '#9c2448' : '#fff') + ';color:' + (active ? '#fff' : '#9c2448') + ';font-size:11px;font-weight:950;">' + text + '</button>';
    }

    function syncPreviewFromOpenFields() {
      const nameInput = root.querySelector('[data-store-name-input]');
      const legendInput = root.querySelector('[data-store-legend-input]');
      const descriptionInput = root.querySelector('[data-store-description-input]');

      state.name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : state.name;
      state.legend = legendInput && legendInput.value.trim() ? legendInput.value.trim() : state.legend;
      state.description = descriptionInput && descriptionInput.value.trim() ? descriptionInput.value.trim() : state.description;

      const liveName = panel.querySelector('[data-live-name]');
      const liveLegend = panel.querySelector('[data-live-legend]');
      const liveDescription = panel.querySelector('[data-live-description]');
      const liveLogo = panel.querySelector('[data-live-logo]');

      if (liveName) liveName.textContent = state.name;
      if (liveLegend) liveLegend.textContent = state.legend;
      if (liveDescription) liveDescription.textContent = state.description;
      if (liveLogo) liveLogo.textContent = state.name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) { return word[0]; }).join('').toUpperCase() || 'DN';
    }

    function bindLiveFieldSync() {
      document.addEventListener('input', function (event) {
        if (!root.contains(event.target)) return;
        if (event.target.matches('[data-store-name-input], [data-store-legend-input], [data-store-description-input]')) {
          syncPreviewFromOpenFields();
        }
      });
    }

    function bindTabPreview() {
      root.querySelectorAll('[data-builder-tab]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          state.activeTab = tab.dataset.builderTab || 'identity';
          if (state.activeTab === 'identity') renderHomePreview();
          if (state.activeTab !== 'identity') renderHomePreview();
        });
      });
    }

    renderHomePreview();
    bindLiveFieldSync();
    bindTabPreview();
  }

  document.addEventListener('DOMContentLoaded', initLiveStorePreview);
  document.addEventListener('sazzu:page:load', initLiveStorePreview);
})();
