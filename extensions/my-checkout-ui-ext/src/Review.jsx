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
  useApi,
  useAppMetafields,
  useSelectedPaymentOptions,
  useDiscountAllocations,
  useDiscountCodes,
  useShippingAddress,
  useApplyShippingAddressChange,

  // UI components
  BlockStack,
  Banner,
  Text,
  Button,
  BlockSpacer,
  ChoiceList,
  Choice,
  Link
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
  console.log(`my-checkout-ui-ext (Review): extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [score, setScore] = useState('2');
  const [reviewSent, setReviewSent] = useState(false);
  const [res, setRes] = useState({});

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

  // Get the filtered metafield values defined by the toml file.
  // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/metafields#useAppMetafields
  /* ==========================================================================================================
  *  NOTE THAT `useAppMetafields` (and other subscribed data) doesn't return the instances at the first rendering 
  *  so this area's code outside useEffect() are called many times asynchronously until 
  *  they get the data (check the browser console to track it).
  *  You have to implement your code not depending on how many times they get called = be "idempotent".
  * ===========================================================================================================
  */
  const urlMeta = useAppMetafields({ "namespace": "barebone_app", "key": "url" });
  console.log(`urlMeta (Review) ${JSON.stringify(urlMeta)}`);
  // The app server URL
  const app_url = urlMeta.map((m) => { return m.metafield.value; }).join('');
  console.log(`app_url (Review) ${app_url}`);

  useEffect(() => {
    // useAppMetafields return empty at the first rendering or some later, and in those cases, 
    // do nothing to avoid unexpected errors. 
    if (app_url === '') return;

    // Write the app url to the browser storage to use later.
    console.log(`Storing the app url (Review) to local storage with the key 'barebone_app_url'...`);
    extensionApi.storage.write('barebone_app_url', app_url);
  }, [app_url]);

  // Redner review sending button or thank you message afterwards.
  const ReviewActions = function (props) {
    if (reviewSent) {
      // Already review sent
      if (Object.keys(res).length == 0) {
        return (
          <Text appearance="critical" size="medium">
            You need to login to send the review!
          </Text>
        );
      } else {
        return (
          <>
            <Text appearance="success" size="medium">
              Thank you for your review! &#128591;
            </Text>
            <BlockSpacer />
            <Link onPress={() => {
              setReviewSent(false);
            }}>
              My mind changed. &#129300;
            </Link>
          </>
        );
      }

    } else {
      // Render the button to send review.
      return (
        <Button kind="secondary" onPress={() => {
          // Setting the given score to the customer metafield in a secure way of passing shop data with SessionToken.
          // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/standardapi#session-token-session-token-claims
          extensionApi.sessionToken.get().then((token) => {
            // Updating the customer metafield with the server side Admin API call.            
            // Security consideration : https://shopify.dev/docs/api/checkout-ui-extensions/unstable/configuration#network-access
            // NOTE THAT you shouldn't pass the customer id directly in parameters for your production, 
            // use token -> decode in your server -> token.sub, instead (but this is valid for logged-in buyers only...)
            // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/session-token
            // Get the stored app url from the browser storage.
            extensionApi.storage.read('barebone_app_url').then((app_url) => {
              const url = `${app_url}/postpurchase?score=${score}`;
              console.log(`Updaing the customer metafield with the given score in... ${url}`);
              fetch(url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }).then((res) => {
                res.json().then((data, errors) => {
                  console.log(`review data: ${JSON.stringify(data, null, 4)}`);
                  if (typeof errors !== 'undefined') {
                    console.log(`review errors: ${JSON.stringify(errors, null, 4)}`);
                    return;
                  }
                  setReviewSent(true);
                  setRes(data);

                  // Add a discount based on the score dynamically in combination with Discount Function(../my-function-discount-ext).
                  const value = score === '1' ? '0' : `${parseInt(score) * 10}`;
                  extensionApi.applyAttributeChange({
                    type: "updateAttribute",
                    key: "discount_rate", // This need to be the same key as you set in the customer metafield.
                    value: `${value}`
                  }).then((result) => {
                    console.log(`applyAttributeChange: ${result}`);
                  });
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

  const shippingAddress = useShippingAddress();
  console.log(`shippingAddress: ${JSON.stringify(shippingAddress)}`);

  const applyShippingAddressChange = useApplyShippingAddressChange();

  // 1. Initial loading
  useEffect(() => {
    // This code runs endless when the screen gets loaded if useEffect() is removed.
    applyShippingAddressChange({
      type: "updateShippingAddress",
      address: {
        address2: `Time: ${new Date()}`
      }
    }).then((result) => {
      console.log(`useApplyShippingAddressChange: ${result}`);
    });
  }, ['']);

  // 2. Payment option change.
  useSelectedPaymentOptions().map((option) => {
    const json = JSON.stringify(option);
    console.log(`useSelectedPaymentOptions().map(): ${json}`);

    extensionApi.storage.read('option').then((d) => {
      if (d != null && d === json) return;
      console.log(`Payment option changed.`);
      applyShippingAddressChange({
        type: "updateShippingAddress",
        address: {
          address2: `Payment option: ${json}`
        }
      }).then((result) => {
        console.log(`useApplyShippingAddressChange: ${result}`);
        extensionApi.storage.write('option', json);
      });
    });
  });

  // Count up each log in the console. Direct logging without map() outputs empty data.
  console.log(`extensionApi.discountCodes: ${JSON.stringify(extensionApi.discountCodes)}`);
  const discountCodes = useDiscountCodes();
  console.log(`discountCodes: ${JSON.stringify(discountCodes)}`);

  // 3. Discount code change.
  discountCodes.map((code) => {
    const json = JSON.stringify(code);
    console.log(`discountCodes.map(): ${json}`);

    extensionApi.storage.read('code').then((d) => {
      console.log(`code: ${d}`);
      if (d != null && d === json) return;
      console.log(`Discount code changed.`);
      applyShippingAddressChange({
        type: "updateShippingAddress",
        address: {
          address2: `Discount code: ${json}`
        }
      }).then((result) => {
        console.log(`useApplyShippingAddressChange: ${result}`);
        extensionApi.storage.write('code', json);
      });
    });
  });

  useDiscountAllocations().map((allocation) => {
    console.log(`useDiscountAllocations(): ${JSON.stringify(allocation)}`);
  });

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

