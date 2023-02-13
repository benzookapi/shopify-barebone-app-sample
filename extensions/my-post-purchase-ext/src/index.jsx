// Simple upsell post-purchase with metafields.
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension

import { extend, render, useExtensionInput, BlockStack, Button, Heading, Image } from '@shopify/post-purchase-ui-extensions-react';

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

  // If the upsell products found, store those data in the browser storage to set render = true.
  if (upsell_product_ids.length > 0 && typeof upsell_product_ids[0] != null) {
    // This metafield is filtered by 'shopify.ui.extension.toml' with namespace = "barebone_app" and key = "url".
    const app_url = `${inputData.shop.metafields[0].value}/postpurchase?upsell_product_ids=${JSON.stringify(upsell_product_ids)}&token=${inputData.token}`;
    console.log(`Getting upsell product data from... ${app_url}`);
    fetch(`${app_url}/`, {
      method: "POST"
    }).then(res => {
      res.json().then(json => {
        console.log(`${JSON.stringify(json)}`);
      }).catch(e => {
        console.log(`${e}`);
      });
    }).catch(e => {
      console.log(`error: ${e}`);
    });
    await storage.update({
      "upsell_product_ids": upsell_product_ids
    });
    return { render: true };

  }
  return { render: false };
});

render('Checkout::PostPurchase::Render', () => <App />);

export function App() {
  const { done } = useExtensionInput();
  return (
    <BlockStack spacing="loose" alignment="center">
      <Heading>My first post-purchase extension</Heading>
      <Button submit onPress={done}>Click me</Button>
    </BlockStack>
  )
}
