/* PRODUCTOS · Shopify link UI sync */
(function () {
  const STORE_KEY = 'productos.shopify.linkedVariants.v1';

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  function normSku_(value) {
    return clean_(value).toUpperCase();
  }

  function appendCss_(id, href) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function appendScript_(id, src) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function ensureDarkPolish_() {
    appendCss_('productosDarkPolishCss', '../css/productos-dark-polish.css');
    appendCss_('productosDarkHardFixCss', '../css/productos-dark-hard-fix.css');
    appendCss_('productosDarkLayoutFixCss', '../css/productos-dark-layout-fix.css');
    appendCss_('productosDarkContainerCleanupCss', '../css/productos-dark-container-cleanup.css');
    appendCss_('productosOffersDarkFinalCss', '../css/productos-offers-dark-final.css');
    appendCss_('productosOfferShopifySelectorDarkFixCss', '../css/productos-offer-shopify-selector-dark-fix.css');

    /* TAB Resumen · tabla limpia + detalle lateral seguro */
appendCss_('productosResumenRowDetailCss', '../css/productos-resumen-row-detail.css');
appendScript_('productosResumenRowDetailJs', '../js/productos-resumen-row-detail.js');

/* TAB Resumen · archivado seguro de SKU */
appendScript_('productosResumenArchiveActionsJs', '../js/productos-resumen-archive-actions.js');

/* TAB Ofertas · archivado seguro */
appendScript_('productosOfertasArchiveActionsJs', '../js/productos-ofertas-archive-actions.js');

    /* TAB Ofertas · badge estado archivado */
    appendScript_('productosOfertasArchivedBadgeJs', '../js/productos-ofertas-archived-badge.js');

    /* TAB Conjuntos · constructor dark + CTA seguro */
    appendCss_('productosConjuntosDarkFixCss', '../css/productos-conjuntos-dark-fix.css');
    appendScript_('productosConjuntosTabCtaJs', '../js/productos-conjuntos-tab-cta.js');

    /* TAB Conjuntos · archivado seguro */
    appendScript_('productosConjuntosArchiveActionsJs', '../js/productos-conjuntos-archive-actions.js');

    /* Productos · archivados toggle lite */
    appendScript_('productosArchivedToggleLiteJs', '../js/productos-archived-toggle-lite.js');

    /* Productos · botón crear conjunto en tab Conjuntos */
    appendScript_('productosConjuntosCreateButtonLiteJs', '../js/productos-conjuntos-create-button-lite.js');

    /* Productos · Rentabilidad UI inicial */
    appendScript_('productosRentabilidadUiJs', '../js/productos-rentabilidad-ui.js');
  }

  function readStore_() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeStore_(value) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(value || {}));
    } catch (_) {}
  }

  function remember_(variantId, sku) {
    const id = clean_(variantId);
    if (!id) return;
    const store = readStore_();
    store[id] = { sku: clean_(sku), at: new Date().toISOString() };
    writeStore_(store);
  }

  function applyToRow_(row, sku) {
    if (!row) return;

    row.classList.add('is-linked');
    row.dataset.shopifyLinked = '1';
    row.dataset.shopifyUiLinked = '1';

    const action = row.querySelector('.prodShopifyLink__action');
    if (action) {
      const label = clean_(sku) ? 'Vinculado · ' + clean_(sku) : 'Vinculado';
      action.innerHTML = '<span class="prodShopifyLink__linkedBadge">' + label + '</span>';
    }
  }

  function restoreUiLinkedRow_(row) {
    if (!row || row.dataset.shopifyUiLinked !== '1') return;

    row.classList.remove('is-linked');
    row.dataset.shopifyLinked = '0';
    delete row.dataset.shopifyUiLinked;

    const action = row.querySelector('.prodShopifyLink__action');
    if (action) {
      action.innerHTML =
        '<button class="prodShopifyLink__useBtn" type="button" data-shopify-use-variant="1">Usar variante</button>';
    }
  }

  function resetUiLinkedRows_() {
    document
      .querySelectorAll('.prodShopifyLink__row[data-shopify-ui-linked="1"]')
      .forEach(restoreUiLinkedRow_);
  }

  function collectExistingSkuSet_() {
    const set = new Set();
    const readState = window.__PRODUCTOS_PANEL_SUPABASE_READ_STATE__;

    /*
     * La fuente autoritativa es Supabase.
     * Solo los SKU activos pueden bloquear una variante Shopify.
     */
    if (readState && Array.isArray(readState.skus)) {
      readState.skus.forEach(function (item) {
        const status = clean_(item && (item.estado || item.status)).toLowerCase();

        if (status && status !== 'active') return;

        const sku = clean_(item && (item.sku || item.product_sku));
        if (sku) set.add(normSku_(sku));
      });

      return set;
    }

    /*
     * Fallback visual, restringido a la tabla Resumen.
     * Nunca toma filas archivadas ni elementos de Ofertas/Conjuntos.
     */
    document
      .querySelectorAll(
        '#prodResumenTableBody tr[data-product-sku], ' +
        '#prodResumenTableBody tr[data-sku]'
      )
      .forEach(function (row) {
        const rowStatus = clean_(
          row.getAttribute('data-estado') ||
          row.getAttribute('data-status')
        ).toLowerCase();

        const archived =
          row.classList.contains('is-sku-archived') ||
          rowStatus === 'archived' ||
          Boolean(row.querySelector('.prodSkuArchivedLiteBadge'));

        if (archived) return;

        const sku = clean_(
          row.dataset &&
          (row.dataset.productSku || row.dataset.sku)
        );

        if (sku) set.add(normSku_(sku));
      });

    return set;
  }

  function cleanStoredVariantLinks_(activeSkus) {
    const store = readStore_();
    let changed = false;

    Object.keys(store).forEach(function (variantId) {
      const entry = store[variantId] || {};
      const sku = normSku_(entry.sku);

      if (!sku || !activeSkus.has(sku)) {
        delete store[variantId];
        changed = true;
      }
    });

    if (changed) writeStore_(store);
    return store;
  }

  function applyStoredVariantLinks_(store, activeSkus) {
    document.querySelectorAll('.prodShopifyLink__row').forEach(function (row) {
      const variantId = clean_(
        row.dataset && row.dataset.shopifyVariantId
      );

      const entry = variantId ? store[variantId] : null;
      const sku = normSku_(entry && entry.sku);

      if (entry && sku && activeSkus.has(sku)) {
        applyToRow_(row, entry.sku);
      }
    });
  }

  function applyExistingSkuLinks_(existingSkus) {
    if (!existingSkus.size) return;

    document.querySelectorAll('.prodShopifyLink__row').forEach(function (row) {
      /*
       * Un vínculo real devuelto por shopify-catalog-list se conserva.
       */
      if (
        row.dataset.shopifyLinked === '1' &&
        row.dataset.shopifyUiLinked !== '1'
      ) {
        return;
      }

      const shopifySku = normSku_(
        row.dataset && row.dataset.shopifySku
      );

      if (
        !shopifySku ||
        shopifySku === 'SKU NO INFORMADO EN SHOPIFY'
      ) {
        return;
      }

      if (existingSkus.has(shopifySku)) {
        applyToRow_(row, shopifySku);
      }
    });
  }

  function applyAll_() {
    resetUiLinkedRows_();

    const activeSkus = collectExistingSkuSet_();
    const store = cleanStoredVariantLinks_(activeSkus);

    applyStoredVariantLinks_(store, activeSkus);
    applyExistingSkuLinks_(activeSkus);
  }

  function bind_() {
    if (window.__PRODUCTOS_SHOPIFY_LINK_UI_SYNC_BOUND__ === true) return;
    window.__PRODUCTOS_SHOPIFY_LINK_UI_SYNC_BOUND__ = true;
    window.addEventListener('productos:shopify-sku-linked', function (event) {
      const detail = event && event.detail ? event.detail : {};
      remember_(detail.shopify_variant_id, detail.sku_operativo);
      applyAll_();
    });
    let syncTimer = null;

    function scheduleApplyAll_() {
      if (syncTimer) return;

      syncTimer = window.setTimeout(function () {
        syncTimer = null;

        try {
          applyAll_();
        } catch (err) {
          console.warn('[productos-shopify-link-ui-sync] applyAll falló', err);
        }
      }, 180);
    }

    function mutationTouchesRelevantArea_(mutation) {
      if (!mutation) return false;

      const target = mutation.target;
      if (target && target.closest) {
        if (
          target.closest('#prodResumenTableBody') ||
          target.closest('.prodShopifyLink__row') ||
          target.closest('#prodShopifyLinkResults') ||
          target.closest('#prodSubSlideContent')
        ) {
          return true;
        }
      }

      const nodes = Array.from(mutation.addedNodes || []);
      return nodes.some(function (node) {
        if (!node || node.nodeType !== 1) return false;

        if (
          node.id === 'prodResumenTableBody' ||
          node.id === 'prodShopifyLinkResults' ||
          node.id === 'prodSubSlideContent' ||
          (node.classList && node.classList.contains('prodShopifyLink__row'))
        ) {
          return true;
        }

        if (node.querySelector) {
          return !!(
            node.querySelector('#prodResumenTableBody') ||
            node.querySelector('.prodShopifyLink__row') ||
            node.querySelector('#prodShopifyLinkResults') ||
            node.querySelector('#prodSubSlideContent')
          );
        }

        return false;
      });
    }

    const observer = new MutationObserver(function (mutations) {
      const shouldSync = mutations.some(mutationTouchesRelevantArea_);
      if (shouldSync) scheduleApplyAll_();
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    scheduleApplyAll_();
  }

  function init_() {
    if (!document.querySelector('body[data-page="productos"]')) return;
    ensureDarkPolish_();
    bind_();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init_);
  } else {
    init_();
  }

  document.addEventListener('sazzu:page:load', init_);
  window.addEventListener('load', init_);
})();
