// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React from 'react';
import {
  // Extension API
  render,
  // React hooks
  useAppMetafields,  // shopify.ui.extension.toml
  useAttributes,
  useBuyerJourney,
  useSettings,
  useCurrency,
  useCustomer, // Protected customer data
  useEmail, // Protected customer data
  useExtensionApi, // All properties and methods are accessible from this 'StandardApi'
  useExtensionData, // Metadata about the extension.
  useExtensionLanguage, // Buyer's language, as supported by the extension
  useCartLines,
  useLanguage,
  useMetafields,
  useNote,
  useShippingAddress, // Protected customer data
  useShop,
  useStorage,
  useTimezone,
  //useTranslate,
  useDiscountCodes,
  useSessionToken,
  // UI components
  BlockStack,
  Banner
} from '@shopify/checkout-ui-extensions-react';

render('Checkout::Dynamic::Render', () => <Upsell />);
render('Checkout::DeliveryAddress::RenderBefore', () => <Validation />);
render('Checkout::Actions::RenderBefore', () => <Review />);

function Upsell() {
  // See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api#react-hooks
  const appMetafields = useAppMetafields();
  const attributes = useAttributes();
  const buyerJourney = useBuyerJourney();
  const settings = useSettings();
  const currency = useCurrency();
  const customer = useCustomer();
  const email = useEmail();
  const extensionApi = useExtensionApi();
  const extensionData = useExtensionData();
  const extensionLanguage = useExtensionLanguage();
  const cartLines = useCartLines();
  const language = useLanguage();
  const metafields = useMetafields();
  const note = useNote();
  const shippingAddress = useShippingAddress();
  const shop = useShop();
  const storage = useStorage();
  const timezone = useTimezone();
  //const translate = useTranslate();
  const discountCodes = useDiscountCodes();
  const sessionToken = useSessionToken();


  console.log(`my-checkout-ui-ext: appMetafields ${JSON.stringify(appMetafields, null, 4)}`);
  console.log(`my-checkout-ui-ext: attributes ${JSON.stringify(attributes, null, 4)}`);
  console.log(`my-checkout-ui-ext: buyerJourney ${JSON.stringify(buyerJourney, null, 4)}`);
  console.log(`my-checkout-ui-ext: settings ${JSON.stringify(settings, null, 4)}`);
  console.log(`my-checkout-ui-ext: currency ${JSON.stringify(currency, null, 4)}`);
  console.log(`my-checkout-ui-ext: customer ${JSON.stringify(customer, null, 4)}`);
  console.log(`my-checkout-ui-ext: email ${JSON.stringify(email, null, 4)}`);
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);
  console.log(`my-checkout-ui-ext: extensionData ${JSON.stringify(extensionData, null, 4)}`);
  console.log(`my-checkout-ui-ext: extensionLanguage ${JSON.stringify(extensionLanguage, null, 4)}`);
  console.log(`my-checkout-ui-ext: cartLines ${JSON.stringify(cartLines, null, 4)}`);
  console.log(`my-checkout-ui-ext: language ${JSON.stringify(language, null, 4)}`);
  console.log(`my-checkout-ui-ext: metafields ${JSON.stringify(metafields, null, 4)}`);
  console.log(`my-checkout-ui-ext: note ${JSON.stringify(note, null, 4)}`);
  console.log(`my-checkout-ui-ext: shippingAddress ${JSON.stringify(shippingAddress, null, 4)}`);
  console.log(`my-checkout-ui-ext: shop ${JSON.stringify(shop, null, 4)}`);
  console.log(`my-checkout-ui-ext: storage ${JSON.stringify(storage, null, 4)}`);
  console.log(`my-checkout-ui-ext: timezone ${JSON.stringify(timezone, null, 4)}`);
  console.log(`my-checkout-ui-ext: discountCodes ${JSON.stringify(discountCodes, null, 4)}`);
  console.log(`my-checkout-ui-ext: sessionToken ${JSON.stringify(sessionToken, null, 4)}`);


  return (

    <Banner title="Upsell" status='info'>

    </Banner>

  );
}

function Validation() {
  const extensionApi = useExtensionApi();
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);



  return (

    <Banner title="Validation" status='critical'>

    </Banner>

  );

}

function Review() {
  const extensionApi = useExtensionApi();
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  return (

    <Banner title="Review" status='success'>

    </Banner>

  );

}

