import '@shopify/ui-extensions/preact';
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
  render(<OrderUpsell />, document.body);
};

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

  const purchasedProductIds = new Set(
    extensionApi.lines.value.map((line) => line.merchandise.product.id),
  );
  const appMetafields = extensionApi.appMetafields.value;
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
        purchasedProductIds.has(target.id) &&
        metafield.namespace === 'barebone_app_upsell' &&
        metafield.key === 'product_id',
      )
      .map(({metafield}) => String(metafield.value).trim())
      .filter(Boolean),
  )).sort();
  const upsellProductIdsKey = JSON.stringify(upsellProductIds);

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
        const data = /** @type {{
         *   products?: {edges?: UpsellProduct[]},
         *   Error?: string,
         *   errors?: unknown,
         * }} */ (await response.json());

        if (!response.ok || data.errors) {
          throw new Error(data.Error || `Request failed with status ${response.status}`);
        }
        if (cancelled) return;

        const products = data.products?.edges || [];
        console.log(`Order upsell product data: ${JSON.stringify(products, null, 2)}`);
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
