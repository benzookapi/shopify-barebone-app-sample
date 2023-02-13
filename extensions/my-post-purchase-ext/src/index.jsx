// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension


import { extend, render, useExtensionInput, BlockStack, Button, Heading, Image } from '@shopify/post-purchase-ui-extensions-react';

extend('Checkout::PostPurchase::ShouldRender', async ({ inputData, storage }) => {
  console.log(`Post-purchase inputData: ${JSON.stringify(inputData, null, 4)}`);

  const upsell_product_ids = inputData.initialPurchase.lineItems.map((item) => {
    const upsell_product_meta = item.product.metafields.find((meta) => {
      return (meta.namespace == 'barebone_app_upsell' && meta.key == 'product_id');
    });
    if (typeof upsell_product_meta !== 'undefined' && upsell_product_meta.value != null) {
      return upsell_product_meta.value;
    }
  });
  console.log(`upsell_product_ids: ${JSON.stringify(upsell_product_ids, null, 4)}`);

  if (upsell_product_ids.length > 0 && typeof upsell_product_ids[0] != null) {
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
