// Checkout UI sample
// Read https://shopify.dev/docs/api/checkout-ui-extensions
// Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// Read https://shopify.dev/docs/apps/checkout/product-offers
// Read https://shopify.dev/docs/api/checkout-ui-extensions/components

import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Upsell />, document.body);
};

/*
* --------- Upsell component for dynamic render ---------
* (Dynamitc extension point)
* Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#dynamic-extension-points
*/
function Upsell() {
  const extensionApi = shopify;
  console.log(`my-checkout-ui-ext: extensionApi target ${extensionApi.extension.target}`);

  const [upsellProducts, setUpsellProducts] = useState([]);
  const [upsellAdded, setUpsellAdded] = useState(false);
  const [upsellUrl, setUpsellUrl] = useState('');

  // Get the filtered metafield values defined by the toml file.
  // Read https://shopify.dev/docs/api/checkout-ui-extensions/latest/apis/metafields
  /* ==========================================================================================================
  *  NOTE THAT appMetafields (and other subscribed data) doesn't return the instances at the first rendering
  *  so this area's code outside useEffect() are called many times asynchronously until
  *  they get the data (check the browser console to track it).
  *  You have to implement your code not depending on how many times they get called = be "idempotent".
  * ===========================================================================================================
  */
  const appMetafields = extensionApi.appMetafields.value;
  const urlMeta = appMetafields.filter(({metafield}) =>
    metafield.namespace === 'barebone_app' && metafield.key === 'url'
  );
  console.log(`urlMeta ${JSON.stringify(urlMeta)}`);
  const upsellMeta = appMetafields.filter(({metafield}) =>
    metafield.namespace === 'barebone_app_upsell' && metafield.key === 'product_id'
  );
  console.log(`upsellMeta ${JSON.stringify(upsellMeta)}`);
  // The app server URL
  const app_url = urlMeta.map(({metafield}) => metafield.value).join('');
  console.log(`app_url ${app_url}`);
  // The upsell product ids.
  const upsell_product_ids = upsellMeta.map(({metafield}) => metafield.value);
  const upsellProductIdsKey = JSON.stringify(upsell_product_ids);
  console.log(`upsell_product_ids ${upsell_product_ids}`);

  useEffect(() => {
    // appMetafields can be empty at the first rendering or some later, and in those cases,
    // do nothing to avoid unexpected errors.
    if (app_url === '' || upsell_product_ids.length === 0) return;

    let cancelled = false;

    async function loadUpsellProducts() {
      try {
        // Getting the upsell product info in a secure way of passing shop data with SessionToken.
        // Read https://shopify.dev/docs/api/checkout-ui-extensions/latest/apis/session-token
        const token = await extensionApi.sessionToken.get();
        // Retriveing upsell product data to render in the components below from the server side Admin API call.
        const url = `${app_url}/postpurchase?upsell_product_ids=${encodeURIComponent(upsellProductIdsKey)}`;
        console.log(`Getting upsell product data from... ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {Authorization: `Bearer ${token}`},
        });
        const data = await response.json();
        console.log(`upsell product data: ${JSON.stringify(data, null, 4)}`);
        if (!response.ok || data.errors) {
          console.log(`upsell product errors: ${JSON.stringify(data.errors || data, null, 4)}`);
          return;
        }
        if (cancelled) return;

        // Setting upsell products data to render.
        const products = data.products?.edges || [];
        setUpsellProducts(products);

        // Calling Storefront API mutation for creating a new cart to use in the link below.
        // Note that all mutations are not supported and unsupported ones produce an access error.
        // Adding an unauthenticated scope to the app OAuth itself doesn't grant unavailable checkout capabilities.
        // Read https://shopify.dev/docs/api/checkout-ui-extensions/configuration#api-access
        const query = `mutation cartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              id
              checkoutUrl
              totalQuantity
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
            key: 'barebone_app_checkout-ext_storefront_api_cart',
            value: new Date().toISOString(),
          }],
          buyerIdentity: {
            countryCode: 'JP',
            // customerAccessToken: '',
            deliveryAddressPreferences: [{
              deliveryAddress: {
                address1: 'barebone app address 1 ',
                address2: `address 2 ${new Date().toISOString()}`,
                city: 'Shibuya-ku',
                company: 'Shopify Japan K.K',
                country: 'JP',
                firstName: 'Barebone app first name',
                lastName: 'Barebone app last name',
                phone: '0312345678',
                province: 'Tokyo',
                zip: '1500001',
              },
            }],
            email: 'barebone.app@example.com',
            phone: '+819012345678',
          },
          /* discountCodes: [''], */
          lines: products.map((/** @type {any} */ product) => ({
            attributes: [{
              key: 'barebone_app_checkout-ext_storefront_api_lines',
              value: new Date().toISOString(),
            }],
            merchandiseId: product.node.variants.edges[0].node.id,
            quantity: 1,
            /* sellingPlanId: '', */
          })),
          note: `barebone_app_checkout-ext_storefront_api_note ${new Date().toISOString()}`,
        };
        console.log(`Storefront API query: ${JSON.stringify({query, variables: {input}}, null, 4)}`);
        const result = await extensionApi.query(query, {variables: {input}});
        console.log(`Storefront API data: ${JSON.stringify(result, null, 4)}`);
        const cartCreate = Reflect.get(result.data || {}, 'cartCreate');
        const userErrors = cartCreate?.userErrors || [];
        if (result.errors?.length || userErrors.length) {
          console.log(`Storefront API errors: ${JSON.stringify(result.errors || userErrors, null, 4)}`);
          return;
        }
        if (!cancelled) setUpsellUrl(cartCreate?.cart?.checkoutUrl || '');
      } catch (error) {
        console.log(`Loading upsell products failed: ${error}`);
      }
    }

    loadUpsellProducts();

    // Testing the app proxy access.
    // Read https://shopify.dev/docs/api/checkout-ui-extensions/configuration#network-access
    // Note that dev. store app proxies are protected with their passwords which means this fetch always fails.
    const appProxy = `https://${extensionApi.shop.myshopifyDomain}/apps/bareboneproxy`;
    console.log(`Accessing the app proxy ${appProxy}...`);
    fetch(appProxy, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({'Checkout UI Extension WebWorker': 'Upsell()'}),
    }).then(async (response) => {
      const data = await response.json();
      console.log(`Response from the app proxy POST: ${JSON.stringify(data, null, 4)}`);
    }).catch((error) => {
      console.log(`The app proxy fetch() failed with the error: ${error}`);
    });

    return () => {
      cancelled = true;
    };
  }, [app_url, upsellProductIdsKey]);

  // Render the component for upsell products
  /** @param {{upsell_products: any[]}} props */
  const UpsellProducts = function (props) {
    return (
      <s-stack direction="inline" gap="base">
        {props.upsell_products.map((/** @type {any} */ product) => {
          const url = product.node.featuredImage?.url || '';
          return (
            <s-box key={product.node.id} padding="small" maxInlineSize="150px">
              <s-image alt="product photo" src={url} />
              <s-stack direction="block" gap="small" alignItems="center">
                <s-heading>{product.node.title}</s-heading>
                <s-text>
                  {product.node.variants.edges[0].node.price}{' '}
                  {product.node.priceRangeV2.maxVariantPrice.currencyCode}
                </s-text>
              </s-stack>
            </s-box>
          );
        })}
      </s-stack>
    );
  };

  // Switch the adding button rendering based on actions.
  /** @param {{upsell_products: any[], upsell_added: boolean}} props */
  const UpsellActions = function (props) {
    // Add a product to the current cart.
    // Using a recursive function for calling async apply methods sequentially for preventing errors.
    /** @param {number} i */
    const addProducts = async (i) => {
      const product = props.upsell_products[i];
      console.log(`Adding an upsell... ${product.node.title}`);
      try {
        const result = await extensionApi.applyCartLinesChange({
          type: 'addCartLine',
          merchandiseId: product.node.variants.edges[0].node.id,
          quantity: 1,
          attributes: [{
            key: 'barebone_app_upsell',
            value: new Date().toISOString(),
          }],
        });
        console.log(`applyCartLinesChange Success: ${JSON.stringify(result)} ${product.node.title}`);
        // Add others.
        if (i + 1 < props.upsell_products.length) return addProducts(i + 1);
        if (result.type !== 'success') return;

        setUpsellAdded(true);

        // Setting the attributes.
        extensionApi.applyAttributeChange({
          type: 'updateAttribute',
          key: 'barebone_app_upsell_last_added',
          value: product.node.title,
        }).then((response) => {
          console.log(`applyAttributeChange result: ${JSON.stringify(response)}`);
        }).catch((error) => {
          console.log(`applyAttributeChange err: ${JSON.stringify(error)}`);
        });

        // Setting the note.
        extensionApi.applyNoteChange({
          type: 'updateNote',
          note: `The last added item for your offer:  ${product.node.title}`,
        }).then((response) => {
          console.log(`applyNoteChange result: ${JSON.stringify(response)}`);
        }).catch((error) => {
          console.log(`applyNoteChange err: ${JSON.stringify(error)}`);
        });
      } catch (error) {
        console.log(`applyCartLinesChange Error: ${JSON.stringify(error)} ${product.node.title}`);
      }
    };

    if (props.upsell_products.length === 0) {
      // No products to upsell
      return (
        <s-text tone="info">
          Please choose products with upsell ids in metafields to get offers for you. &#128521;
        </s-text>
      );
    }
    if (props.upsell_added) {
      // Already products added
      return (
        <s-text tone="success">
          Thank you for your accepting our offer! &#10084;
        </s-text>
      );
    }
    // Render the button to add products.
    return (
      <s-button onClick={() => addProducts(0)}>
        Love it! I buy now &#127881;
      </s-button>
    );
  };

  const totalAmount = extensionApi.cost.totalAmount.value;
  const lines = extensionApi.lines.value;

  return (
    <s-banner heading={`${extensionApi.extension.target} <Upsell />`} tone="info">
      <s-stack direction="block" gap="base">
        {/* This custom cart lines are visible in mobile pages only switched by container size. */}
        <s-query-container>
          <s-box display="@container (inline-size > 600px) none, block" overflow="hidden">
            <s-text type="strong" tone="success">
              Your current cart: {totalAmount.amount} {totalAmount.currencyCode}
            </s-text>
            <s-unordered-list>
              {lines.map((line) => (
                <s-list-item key={line.id}>
                  <s-text type="emphasis">{line.merchandise.title} x {line.quantity}</s-text>
                  {' --- '}
                  <s-text type="strong">{line.cost.totalAmount.amount} {line.cost.totalAmount.currencyCode}</s-text>
                </s-list-item>
              ))}
            </s-unordered-list>
            <s-divider />
          </s-box>
        </s-query-container>
        {/* Upsell callout */}
        <s-text>We are offering products based on your chosen ones' metafields.</s-text>
        {/* Upsell product list */}
        <UpsellProducts upsell_products={upsellProducts} />
        {/* Upsell actions */}
        <UpsellActions upsell_products={upsellProducts} upsell_added={upsellAdded} />
        {/* Upsell cloning using Storefront API mutation */}
        {upsellUrl && (
          <s-link href={upsellUrl} target="_blank">
            Create a new checkout <s-icon type="cart" />
          </s-link>
        )}
      </s-stack>
    </s-banner>
  );
}
