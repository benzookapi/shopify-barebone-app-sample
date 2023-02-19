// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React from 'react';
import {
  useExtensionApi,
  render,
  Banner,
  useTranslate,
} from '@shopify/checkout-ui-extensions-react';

render('Checkout::Dynamic::Render', () => <App />);

function App() {
  const {extensionPoint} = useExtensionApi();
  const translate = useTranslate();

  console.log(`AAAAAAAAAAAA`);

  
  return (
    <Banner title="my-checkout-ui-ext">
      {translate('welcome', {extensionPoint})}
    </Banner>
  );
}