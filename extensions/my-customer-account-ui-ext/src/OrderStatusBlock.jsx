import '@shopify/ui-extensions/preact';
import {useAppMetafields, useCartLines} from '@shopify/ui-extensions/customer-account/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

/**
 * @typedef {{
 *   node: {
 *     id: string,
 *     title: string,
 *     featuredImage?: {url: string} | null,
 *     priceRangeV2: {maxVariantPrice: {amount: string, currencyCode: string}},
 *     variants: {edges: Array<{node: {id: string, price: string}}>},
 *   },
 * }} UpsellProduct
 */

export default async () => {
  console.info('[customer-account-upsell] extension loaded');
  render(<OrderUpsell />, document.body);
};

/** @param {string | number | null | undefined} value */
function normalizeShopifyId(value) {
  const id = String(value || '');
  return id.slice(id.lastIndexOf('/') + 1);
}

function OrderUpsell() {
  const extensionApi = shopify;
  const [upsellProducts, setUpsellProducts] = useState(
    /** @type {UpsellProduct[]} */ ([]),
  );
  const [loading, setLoading] = useState(false);
  const [creatingCart, setCreatingCart] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const [cartError, setCartError] = useState('');

  // These hooks subscribe to delayed Order status data and re-render when it arrives.
  const lines = useCartLines();
  const appMetafields = useAppMetafields();
  const purchasedProductIds = new Set(
    lines.map((line) => normalizeShopifyId(line.merchandise.product.id)),
  );
  const appUrlMetafield = appMetafields.find(({target, metafield}) =>
    target.type === 'shop' &&
    metafield.namespace === 'barebone_app' &&
    metafield.key === 'url',
  );
  const appUrl = String(appUrlMetafield?.metafield.value || '').replace(/\/+$/, '');
  const upsellProductIds = Array.from(new Set(
    appMetafields
      .filter(({target, metafield}) =>
        target.type === 'product' &&
        purchasedProductIds.has(normalizeShopifyId(target.id)) &&
        metafield.namespace === 'barebone_app_upsell' &&
        metafield.key === 'product_id',
      )
      .map(({metafield}) => String(metafield.value).trim())
      .filter(Boolean),
  )).sort();
  const purchasedProductIdsKey = JSON.stringify(Array.from(purchasedProductIds).sort());
  const upsellProductIdsKey = JSON.stringify(upsellProductIds);
  const appMetafieldsKey = JSON.stringify(appMetafields.map(({target, metafield}) => ({
    targetType: target.type,
    targetId: target.id,
    namespace: metafield.namespace,
    key: metafield.key,
    value: metafield.value,
  })));

  useEffect(() => {
    console.info('[customer-account-upsell] order data', JSON.stringify({
      purchasedProductIds: JSON.parse(purchasedProductIdsKey),
      appMetafields: JSON.parse(appMetafieldsKey),
      appUrl,
      upsellProductIds,
    }, null, 2));
  }, [appMetafieldsKey, appUrl, purchasedProductIdsKey, upsellProductIdsKey]);

  useEffect(() => {
    setCheckoutUrl('');
    setCartError('');
    setLoadError('');

    if (upsellProductIds.length === 0) {
      setUpsellProducts([]);
      setLoading(false);
      return;
    }

    if (appUrl === '') {
      setUpsellProducts([]);
      setLoading(false);
      setLoadError(extensionApi.i18n.translate('missingAppUrl'));
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadUpsellProducts() {
      try {
        // Authenticate the external request with the Customer Account extension session token.
        const token = await extensionApi.sessionToken.get();
        const url = `${appUrl}/postpurchase?upsell_product_ids=${encodeURIComponent(upsellProductIdsKey)}`;
        console.log(`Getting order upsell product data from ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {Authorization: `Bearer ${token}`},
        });
        const responseText = await response.text();
        console.info('[customer-account-upsell] server response', JSON.stringify({
          status: response.status,
          ok: response.ok,
          body: responseText,
        }, null, 2));
        const data = /** @type {{
         *   products?: {edges?: UpsellProduct[]},
         *   Error?: string,
         *   errors?: unknown,
         * }} */ (JSON.parse(responseText));

        if (!response.ok || data.errors) {
          throw new Error(data.Error || `Request failed with status ${response.status}`);
        }
        if (cancelled) return;

        const products = data.products?.edges || [];
        console.info('[customer-account-upsell] products loaded', JSON.stringify({
          count: products.length,
          products,
        }, null, 2));
        setUpsellProducts(products.filter(({node}) => node.variants.edges.length > 0));
      } catch (error) {
        if (cancelled) return;
        console.log(`Loading order upsell products failed: ${error}`);
        setUpsellProducts([]);
        setLoadError(extensionApi.i18n.translate('loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUpsellProducts();

    return () => {
      cancelled = true;
    };
  }, [appUrl, upsellProductIdsKey]);

  async function createCheckoutLink() {
    if (creatingCart || upsellProducts.length === 0) return;

    setCreatingCart(true);
    setCartError('');

    try {
      const query = `mutation CustomerAccountUpsellCartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            code
            field
            message
          }
        }
      }`;
      const input = {
        attributes: [{
          key: 'barebone_app_customer_account_upsell',
          value: new Date().toISOString(),
        }],
        lines: upsellProducts.map(({node}) => ({
          merchandiseId: node.variants.edges[0].node.id,
          quantity: 1,
        })),
      };
      console.log(`Customer Account Storefront API request: ${JSON.stringify({query, variables: {input}}, null, 2)}`);
      const result = await extensionApi.query(query, {variables: {input}});
      const cartCreate = /** @type {{
       *   cart?: {checkoutUrl?: string},
       *   userErrors?: Array<{message: string}>,
       * } | undefined} */ (Reflect.get(result.data || {}, 'cartCreate'));
      const userErrors = cartCreate?.userErrors || [];

      if (result.errors?.length || userErrors.length > 0 || !cartCreate?.cart?.checkoutUrl) {
        throw new Error(JSON.stringify(result.errors || userErrors));
      }

      console.log(`Customer Account Storefront API response: ${JSON.stringify(result, null, 2)}`);
      setCheckoutUrl(cartCreate.cart.checkoutUrl);
      extensionApi.toast.show(extensionApi.i18n.translate('checkoutCreated'));
    } catch (error) {
      console.log(`Creating a Customer Account upsell cart failed: ${error}`);
      setCartError(extensionApi.i18n.translate('cartError'));
    } finally {
      setCreatingCart(false);
    }
  }

  return (
    <s-section heading={extensionApi.i18n.translate('heading')}>
      <s-stack gap="base">
        <s-text>{extensionApi.i18n.translate('description')}</s-text>

        {loading && (
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-spinner accessibilityLabel={extensionApi.i18n.translate('loading')} />
            <s-text>{extensionApi.i18n.translate('loading')}</s-text>
          </s-stack>
        )}

        {loadError && <s-banner tone="critical">{loadError}</s-banner>}

        {!loading && !loadError && upsellProducts.length === 0 && (
          <s-text color="subdued">{extensionApi.i18n.translate('empty')}</s-text>
        )}

        {upsellProducts.length > 0 && (
          <s-stack direction="inline" gap="base">
            {upsellProducts.map(({node}) => {
              const variant = node.variants.edges[0].node;
              const currencyCode = node.priceRangeV2.maxVariantPrice.currencyCode;
              const price = extensionApi.i18n.formatCurrency(Number(variant.price), {
                currency: currencyCode,
              });

              return (
                <s-box key={node.id} padding="small" maxInlineSize="180px">
                  {node.featuredImage?.url && (
                    <s-image
                      src={node.featuredImage.url}
                      alt={node.title}
                      aspectRatio="1/1"
                      objectFit="cover"
                    />
                  )}
                  <s-stack gap="small">
                    <s-heading>{node.title}</s-heading>
                    <s-text>{price}</s-text>
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        )}

        {upsellProducts.length > 0 && !checkoutUrl && (
          <s-button
            variant="primary"
            loading={creatingCart}
            disabled={creatingCart}
            onClick={createCheckoutLink}
          >
            {extensionApi.i18n.translate('createCheckout')}
          </s-button>
        )}

        {cartError && <s-banner tone="critical">{cartError}</s-banner>}

        {checkoutUrl && (
          <s-link href={checkoutUrl} target="_blank">
            {extensionApi.i18n.translate('openCheckout')}
          </s-link>
        )}
      </s-stack>
    </s-section>
  );
}
