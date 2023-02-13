// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension


import { extend, render, useExtensionInput, BlockStack, Button, Heading, Image } from '@shopify/post-purchase-ui-extensions-react';

extend('Checkout::PostPurchase::ShouldRender', async () => {
  return { render: true };
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
