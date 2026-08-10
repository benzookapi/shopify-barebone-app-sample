// Checkout UI sample
// Read https://shopify.dev/docs/api/checkout-ui-extensions
// Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// Read https://shopify.dev/docs/apps/checkout/product-offers
// Read https://shopify.dev/docs/api/checkout-ui-extensions/components

import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Review />, document.body);
};

/*
* --------- Review component for static render ---------
* (Static extension point)
* Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Review() {
  const extensionApi = shopify;
  console.log(`my-checkout-ui-ext (Review): extensionApi target ${extensionApi.extension.target}`);

  const [score, setScore] = useState('2');
  const [reviewSent, setReviewSent] = useState(false);
  const [res, setRes] = useState({});

  const initAttr = extensionApi.attributes.value
    .filter(({key}) => key === 'barebone_cart_attribute')
    .map(({value}) => value)
    .join(''); // This is supposed to the same attribute in `./my-theme-app-ext/blocks/app-block.liquid`
  console.log(`initAttr: ${initAttr}`);

  const [cartAttr, setCartAttr] = useState(initAttr);

  // Store the given score into the browser storage to keep across the pages.
  // Read https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-storage
  /** @param {string} value */
  const writeScore = (value) => {
    extensionApi.storage.write('barebone_app_score', value);
  };
  const readScore = () => {
    extensionApi.storage.read('barebone_app_score').then((data) => {
      const storedScore = data == null ? '2' : String(data);
      setScore(storedScore);
    });
  };

  useEffect(() => {
    readScore();
  }, []);

  // Get the filtered metafield values defined by the toml file.
  // Read https://shopify.dev/docs/api/checkout-ui-extensions/latest/apis/metafields
  /* ==========================================================================================================
  *  NOTE THAT appMetafields (and other subscribed data) doesn't return the instances at the first rendering
  *  so this area's code outside useEffect() are called many times asynchronously until
  *  they get the data (check the browser console to track it).
  *  You have to implement your code not depending on how many times they get called = be "idempotent".
  * ===========================================================================================================
  */
  const urlMeta = extensionApi.appMetafields.value.filter(({metafield}) =>
    metafield.namespace === 'barebone_app' && metafield.key === 'url'
  );
  console.log(`urlMeta (Review) ${JSON.stringify(urlMeta)}`);
  // The app server URL
  const app_url = urlMeta.map(({metafield}) => metafield.value).join('');
  console.log(`app_url (Review) ${app_url}`);

  useEffect(() => {
    // appMetafields can be empty at the first rendering or some later, and in those cases,
    // do nothing to avoid unexpected errors.
    if (app_url === '') return;

    // Write the app url to the browser storage to use later.
    console.log(`Storing the app url (Review) to local storage with the key 'barebone_app_url'...`);
    extensionApi.storage.write('barebone_app_url', app_url);
  }, [app_url]);

  // Redner review sending button or thank you message afterwards.
  const ReviewActions = function () {
    if (reviewSent) {
      // Already review sent
      if (Object.keys(res).length === 0) {
        return <s-text tone="critical">You need to login to send the review!</s-text>;
      }
      return (
        <s-stack direction="block" gap="small">
          <s-text tone="success">Thank you for your review! &#128591;</s-text>
          <s-link onClick={() => setReviewSent(false)}>My mind changed. &#129300;</s-link>
        </s-stack>
      );
    }

    // Render the button to send review.
    return (
      <s-button variant="secondary" onClick={async () => {
        try {
          // Setting the given score to the customer metafield in a secure way of passing shop data with SessionToken.
          // Read https://shopify.dev/docs/api/checkout-ui-extensions/latest/apis/session-token
          const token = await extensionApi.sessionToken.get();
          // Updating the customer metafield with the server side Admin API call.
          // Security consideration: https://shopify.dev/docs/api/checkout-ui-extensions/configuration#network-access
          // NOTE THAT you shouldn't pass the customer id directly in parameters for your production,
          // use token -> decode in your server -> token.sub, instead (but this is valid for logged-in buyers only...)
          // Get the stored app url from the browser storage.
          const storedAppUrl = await extensionApi.storage.read('barebone_app_url');
          if (!storedAppUrl) return;
          const url = `${storedAppUrl}/postpurchase?score=${score}`;
          console.log(`Updating the customer metafield with the given score in... ${url}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`},
          });
          const data = await response.json();
          console.log(`review data: ${JSON.stringify(data, null, 4)}`);
          if (!response.ok || data.errors) {
            console.log(`review errors: ${JSON.stringify(data.errors || data, null, 4)}`);
            return;
          }
          setReviewSent(true);
          setRes(data);

          // Add a discount based on the score dynamically in combination with Discount Function(../my-function-discount-ext).
          const value = score === '1' ? '0' : `${parseInt(score, 10) * 10}`;
          const result = await extensionApi.applyAttributeChange({
            type: 'updateAttribute',
            key: 'discount_rate', // This need to be the same key as you set in the customer metafield.
            value,
          });
          console.log(`applyAttributeChange: ${JSON.stringify(result)}`);
        } catch (error) {
          console.log(`Review submission failed: ${error}`);
        }
      }}>
        Give the score
      </s-button>
    );
  };

  const shippingAddress = extensionApi.shippingAddress?.value;
  console.log(`shippingAddress: ${JSON.stringify(shippingAddress)}`);

  const applyShippingAddressChange = extensionApi.applyShippingAddressChange;
  const canUpdateShippingAddress = Boolean(
    applyShippingAddressChange &&
    extensionApi.instructions.value.delivery.canSelectCustomAddress
  );

  // 1. Initial loading
  useEffect(() => {
    // This code runs endless when the screen gets loaded if useEffect() is removed.
    if (!canUpdateShippingAddress || !applyShippingAddressChange) return;
    applyShippingAddressChange({
      type: 'updateShippingAddress',
      address: {address2: `Time: ${new Date()}`},
    }).then((result) => {
      console.log(`applyShippingAddressChange: ${JSON.stringify(result)}`);
    });
  }, [canUpdateShippingAddress]);

  const selectedPaymentOptions = extensionApi.selectedPaymentOptions.value;
  const selectedPaymentOptionsKey = JSON.stringify(selectedPaymentOptions);

  // 2. Payment option change.
  useEffect(() => {
    if (!canUpdateShippingAddress || !applyShippingAddressChange || selectedPaymentOptions.length === 0) return;
    extensionApi.storage.read('option').then((storedOption) => {
      if (storedOption === selectedPaymentOptionsKey) return;
      console.log(`Payment option changed: ${selectedPaymentOptionsKey}`);
      applyShippingAddressChange({
        type: 'updateShippingAddress',
        address: {address2: `Payment option: ${selectedPaymentOptionsKey}`},
      }).then((result) => {
        console.log(`applyShippingAddressChange: ${JSON.stringify(result)}`);
        extensionApi.storage.write('option', selectedPaymentOptionsKey);
      });
    });
  }, [canUpdateShippingAddress, selectedPaymentOptionsKey]);

  // Count up each log in the console. Direct logging without map() outputs empty data.
  const discountCodes = extensionApi.discountCodes.value;
  console.log(`discountCodes: ${JSON.stringify(discountCodes)}`);
  const discountCodesKey = JSON.stringify(discountCodes);

  // 3. Discount code change.
  useEffect(() => {
    if (!canUpdateShippingAddress || !applyShippingAddressChange || discountCodes.length === 0) return;
    extensionApi.storage.read('code').then((storedCode) => {
      console.log(`code: ${storedCode}`);
      if (storedCode === discountCodesKey) return;
      console.log(`Discount code changed.`);
      applyShippingAddressChange({
        type: 'updateShippingAddress',
        address: {address2: `Discount code: ${discountCodesKey}`},
      }).then((result) => {
        console.log(`applyShippingAddressChange: ${JSON.stringify(result)}`);
        extensionApi.storage.write('code', discountCodesKey);
      });
    });
  }, [canUpdateShippingAddress, discountCodesKey]);

  extensionApi.discountAllocations.value.forEach((allocation) => {
    console.log(`discountAllocations: ${JSON.stringify(allocation)}`);
  });

  return (
    <s-banner heading={`${extensionApi.extension.target} <Review />`} tone="critical">
      <s-stack direction="block" gap="base">
        <s-text type="emphasis">
          If you have time, could you give me a score for this checkout experience?
        </s-text>
        <s-choice-list
          label="Checkout experience score"
          name="review"
          values={[score]}
          onChange={(event) => {
            const value = Reflect.get(event.currentTarget || {}, 'values')[0] || '2';
            console.log(`onChange event with value: ${value}`);
            setScore(value);
            writeScore(value);
          }}
        >
          <s-choice value="3">3 - Excellent</s-choice>
          <s-choice value="2">2 - Average</s-choice>
          <s-choice value="1">1 - Poor</s-choice>
        </s-choice-list>
        {/* Switch the sending buttom and thank you massage */}
        <ReviewActions />
        <s-select
          label="Set your cart attribute value"
          value={cartAttr}
          onChange={(event) => {
            const value = Reflect.get(event.currentTarget || {}, 'value');
            setCartAttr(value);
            extensionApi.applyAttributeChange({
              type: 'updateAttribute',
              key: 'barebone_cart_attribute', // This is supposed to the same attribute in `./my-theme-app-ext/blocks/app-block.liquid`
              value,
            }).then((result) => {
              console.log(`applyAttributeChange (for the cart attribute): ${JSON.stringify(result)}`);
            });
          }}
        >
          <s-option value="">None</s-option>
          <s-option value="Value-1">Value-1</s-option>
          <s-option value="Value-2">Value-2</s-option>
          <s-option value="Value-3">Value-3</s-option>
        </s-select>
      </s-stack>
    </s-banner>
  );
}
