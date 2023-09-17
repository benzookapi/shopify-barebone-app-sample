// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React, { useState, useEffect } from 'react';
import {
  // Extension API
  reactExtension,

  // React hooks
  useApi, // All properties and methods are accessible from this 'StandardApi'
  //useAppMetafields,  // Protected customer data, filtered by shopify.ui.extension.toml
  //useCustomer, // Protected customer data
  //useEmail, // Protected customer data  
  //useExtensionData, // Metadata about the extension.
  //useExtensionLanguage, // Buyer's language, as supported by the extension
  //useShippingAddress, // Protected customer data
  useSubscription, // https://shopify.dev/docs/api/checkout-ui-extensions/unstable/react-hooks/utilities/usesubscription

  // UI components
  BlockStack,
  Banner,
  Text,
  Button,
  BlockSpacer,
  ChoiceList,
  Choice
  //CalloutBanner, available only for post-purchase extensions.
  //Layout, available only for post-purchase extensions.
  //TextContainer, available only for post-purchase extensions.
} from '@shopify/ui-extensions-react/checkout';

reactExtension('purchase.checkout.actions.render-before', () => <Review />);

/* 
* --------- Review component for static render --------- 
* (Static extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Review() {
  const extensionApi = useApi();
  //console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [score, setScore] = useState('2');
  const [reviewSent, setReviewSent] = useState(false);

  // Store the given score into the browser storage to keep across the pages.
  // See https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-storage
  const writeScore = (value) => {
    extensionApi.storage.write('barebone_app_score', value);
  };
  const readScore = () => {
    extensionApi.storage.read('barebone_app_score').then((d) => {
      const s = d == null ? '2' : d;
      setScore(s);
    })
  };

  readScore();

  // Getting the app url from the shop metafield.
  useEffect(() => {
    let appMetas = null;
    let count = 0;
    // appMetafields.current is blank in the first loading, with data in the second, so you need to sbscrube it.
    extensionApi.appMetafields.subscribe((d) => {
      count = count + 1;
      console.log(`appMetafields.subscribed (Review) count: ${count}`);
      // Proceed only when the data is given.
      if (d.length == 0) return;

      // Prevent duplicated calls.
      if (appMetas != null) return;
      appMetas = d;
      console.log(`appMetas (Review): ${JSON.stringify(appMetas, null, 4)}`);

      // Get the filtered metafield values defined by the toml file.
      // See https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-appmetafields
      // The app server URL
      const app_url = appMetas.filter((m) => {
        return (m.target.type === 'shop' && m.metafield.key === 'url');
      }).map((m) => { return m.metafield.value })[0];

      // Write the app url to the browser storage to use later.
      extensionApi.storage.write('barebone_app_url', app_url);

    });
  }, ['']);

  // Redner review sending button or thank you message afterwards.
  const ReviewActions = function (props) {
    if (reviewSent) {
      // Already review sent
      return (
        <Text appearance="success" size="medium">
          Thank you for your review! &#128591;
        </Text>
      );
    } else {
      // Render the button to send review.
      return (
        <Button kind="secondary" onPress={() => {
          // Setting the given score to the customer metafield in a secure way of passing shop data with SessionToken.
          extensionApi.sessionToken.get().then((token) => {
            // Updating the customer metafield with the server side Admin API call.            
            const customerId = extensionApi.buyerIdentity.email.current;
            console.log(`customerId ${customerId}`);
            // Get the stored app url from the browser storage.
            extensionApi.storage.read('barebone_app_url').then((app_url) => {
              const url = `${app_url}/postpurchase?customerId=${customerId}&score=${score}&token=${token}`;
              console.log(`Updaing the customer metafield with the given score in... ${url}`);
              fetch(url, {
                method: "POST"
              }).then((res) => {
                res.json().then((data, errors) => {
                  console.log(`review data: ${JSON.stringify(data, null, 4)}`);
                  if (typeof errors !== 'undefined') {
                    console.log(`review errors: ${JSON.stringify(errors, null, 4)}`);
                    return;
                  }
                  setReviewSent(true);
                });
              });
            });

          });
        }} >
          Give the score
        </Button>
      );
    }
  };

  return (
    <Banner title={`${extensionApi.extensionPoint} <Review />`} status='critical'>
      <Text size="medium" emphasis="italic">If you have time, could you give me a score for this checkout experience?</Text>
      <ChoiceList
        name="review"
        value={score}
        onChange={(value) => {
          console.log(`onChange event with value: ${value}`);
          setScore(value);
          writeScore(value);
        }}
      >
        <BlockStack>
          <Choice id="3">3 - Excellent</Choice>
          <Choice id="2">2 - Average</Choice>
          <Choice id="1">1 - Poor</Choice>
        </BlockStack>
      </ChoiceList>
      <BlockSpacer />
      {/* Switch the sending buttom and thank you massage */}
      <ReviewActions />
    </Banner>
  );

}

