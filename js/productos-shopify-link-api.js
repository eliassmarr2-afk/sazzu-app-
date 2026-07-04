/* PRODUCTOS · Shopify SKU link API */
(function () {
  const LINK_UPSERT_URL = 'https://cuuzsbhpjmjbbnghtiny.supabase.co/functions/v1/shopify-sku-link-upsert';

  function clean_(value) {
    return String(value == null ? '' : value).trim();
  }

  window.productosShopifySkuLinkUpsert = async function productosShopifySkuLinkUpsert(payload) {
    const input = payload && typeof payload === 'object' ? payload : {};
    const skuOperativo = clean_(input.sku_operativo || input.sku);
    const variantId = clean_(input.shopify_variant_id || input.variant_id);

    if (!skuOperativo || !variantId) {
      return { ok: false, message: 'Falta SKU operativo o variant_id Shopify.' };
    }

    const response = await fetch(LINK_UPSERT_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.assign({}, input, {
        sku_operativo: skuOperativo,
        shopify_variant_id: variantId,
        source: clean_(input.source) || 'productos-panel-nuevo-sku'
      }))
    });

    const json = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      return { ok: false, message: json.message || ('HTTP ' + response.status), raw: json };
    }

    return json;
  };
})();
