// Simple upsell post-purchase with metafields.
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension

import { extend, render, useExtensionInput, BlockStack, Button, TextContainer, Text, Layout, CalloutBanner, Banner, Heading, Image, View } from '@shopify/post-purchase-ui-extensions-react';

extend('Checkout::PostPurchase::ShouldRender', async ({ inputData, storage }) => {
  console.log(`Post-purchase inputData: ${JSON.stringify(inputData, null, 4)}`);

  // Check if the purchases products have the upsell product ids in their meta fields defined by 'shopify.ui.extension.toml'.
  const upsell_product_ids = inputData.initialPurchase.lineItems.map((item) => {
    const upsell_product_meta = item.product.metafields.find((meta) => {
      return (meta.namespace == 'barebone_app_upsell' && meta.key == 'product_id');
    });
    if (typeof upsell_product_meta !== 'undefined' && upsell_product_meta.value != null) {
      return upsell_product_meta.value;
    }
  });
  console.log(`upsell_product_ids: ${JSON.stringify(upsell_product_ids, null, 4)}`);

  // If the upsell products found, get GraphQL Admin responses of those data from the app server and 
  // store them to the browser storage.
  if (upsell_product_ids.length > 0 && upsell_product_ids[0] != null) {
    // This metafield is filtered by 'shopify.ui.extension.toml' with namespace = "barebone_app" and key = "url".
    const app_url = `${inputData.shop.metafields[0].value}/postpurchase?upsell_product_ids=${JSON.stringify(upsell_product_ids)}&token=${inputData.token}`;

    console.log(`Getting upsell product data from... ${app_url}`);

    const json = await (await fetch(app_url, {
      method: "POST"
    })).json();

    console.log(`${JSON.stringify(json, null, 4)}`);

    // Store the upsell product details from API to the local storage.
    await storage.update({
      "upsell_products": json
    });

    // Notify that the post-purchase shows up.
    return { render: true };

  }
  // Notify that the post-purchase doesn't show up because no upsell products found.
  return { render: false };

});

render('Checkout::PostPurchase::Render', () => <App />);

export function App() {
  const { storage, inputData, calculateChangeset, applyChangeset, done } = useExtensionInput();

  console.log(`storage ${JSON.stringify(storage, null, 4)}`);

  const upsell_products = storage.initialData.upsell_products.products.edges;
  //console.log(`Render: upsell_products ${JSON.stringify(upsell_products)}`);

  // See https://shopify.dev/docs/api/checkout-extensions/components
  return (
    <BlockStack spacing="loose" alignment="center">
      <CalloutBanner>
        <Text size="large" emphasized>
          Barebone App Post-purchase Demo
        </Text>
      </CalloutBanner>
      <Banner status="info" title="We are offering this product based on your purchased one's metafield." />
      {
        upsell_products.map((product) => {
          const product_id = product.node.id;
          return (
            <Layout>
              <BlockStack spacing="tight" alignment="center">
                <Layout media={[
                  { viewportSize: 'small', sizes: [1, 0, 1], maxInlineSize: 0.9 },
                  { viewportSize: 'medium', sizes: [532, 0, 1], maxInlineSize: 420 },
                  { viewportSize: 'large', sizes: [560, 38, 340] },
                ]}>
                  <Image description="product photo" source={product.node.featuredImage.url} />
                </Layout>
                <Heading>{product.node.title}</Heading>
                <TextContainer>
                  <Text size="medium">
                    {product.node.variants.edges[0].node.price} {product.node.priceRangeV2.maxVariantPrice.currencyCode}
                  </Text>
                </TextContainer>
              </BlockStack>
            </Layout>
          )
        })
      }
      <Button submit onPress={done}>Love it! I buy now &#127881;</Button>
      <Button plain onPress={done}>No Thanks &#9995;</Button>
    </BlockStack>
  )
}
