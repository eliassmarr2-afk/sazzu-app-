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
    ensureScript_('../js/productos-combo-extras-payload-fix.js', 'productos-combo-extras-payload-fix-js');
    ensureScript_('../js/productos-payloads.js', 'productos-payloads-js');
    ensureScript_('../js/productos-comestibles.js', 'productos-comestibles-js');
    ensureScript_('../js/productos-combos.js', 'productos-combos-js');
    ensureScript_('../js/productos-operaciones.js', 'productos-operaciones-js');
    ensureScript_('../js/productos-rehidratacion.js', 'productos-rehidratacion-js');
    ensureScript_('../js/productos-supabase.js', 'productos-supabase-js');
  }

  document.addEventListener('DOMContentLoaded', loadProductosComestibles_);
  document.addEventListener('sazzu:page:load', function () {
    setTimeout(loadProductosComestibles_, 80);
    setTimeout(loadProductosComestibles_, 260);
  });
})();
/* ======= FIN · LOADER PRODUCTOS COMESTIBLES ======= */
  