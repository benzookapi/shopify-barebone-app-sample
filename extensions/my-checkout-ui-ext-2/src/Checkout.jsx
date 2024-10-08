// Checkout UI Sample for deep dive to how the extension gets loaded in React.
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/attributes
// See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/discounts
// See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/buyer-journey
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useApi,
  useApplyAttributeChange,
  useInstructions,
  useTranslate,
  useAppMetafields,
  useMetafields,
  useApplyDiscountCodeChange,
  useAttributeValues,
  useDiscountCodes,
  useDiscountAllocations,
  useBuyerJourneyIntercept
} from "@shopify/ui-extensions-react/checkout";
import { useEffect, useState } from "react";

export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const api = useApi();
  const translate = useTranslate();
  const instructions = useInstructions();
  const applyAttributeChange = useApplyAttributeChange();
  const applyDiscountCodeChange = useApplyDiscountCodeChange();

  // console.log(`Extension() api: ${JSON.stringify(api, null, 4)}`);

  // The following useAppMetafields can retrieve all metafields with target type specfication.
  // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/metafields#useappmetafields-propertydetail-filters
  const appMetafield1 = useAppMetafields({ "namespace": "barebone_app", "key": "url", "type": "shop" })
    .map((m) => { return m.metafield.value; }).join(' ');
  console.log(`Extension() / appMetafield1: ${appMetafield1}`);
  const appMetafield2 = useAppMetafields({ "namespace": "barebone_app_upsell", "key": "product_id", "type": "product" })
    .map((m) => { return m.metafield.value; }).join(' ');
  console.log(`Extension() / appMetafield2: ${appMetafield2}`);

  // The following useMetafields can retrieve checkout related metafields only. 
  // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/metafields#usemetafields-propertydetail-filters
  const metafield1 = useMetafields({ "namespace": "barebone_app", "key": "url" })
    .map((m) => { return m.metafield.value; }).join('');
  console.log(`Extension() / metafield1: ${metafield1}`);
  const metafield2 = useMetafields({ "namespace": "barebone_app_upsell", "key": "product_id" })
    .map((m) => { return m.metafield.value; }).join('');
  console.log(`Extension() / metafield2: ${metafield2}`);

  useEffect(() => {
    // This is the timing of some of metafields changed (including empty values).
    // If you want to do something like fetch external URL with the value, write here.
    console.log(`Extension() / useEffect() / appMetafield1: ${appMetafield1} appMetafield2: ${appMetafield2} 
      metafield1: ${metafield1} metafield2: ${metafield2}`);

    // If the metafields are not retrived yet, return and expect to get them in the next loading.
    if (appMetafield1 === '' || appMetafield2 === '') return;

    // DO SOMETHING

  }, [appMetafield1, appMetafield2, metafield1, metafield2]);

  // This is another approach for getting app metafields data without useEffect.
  // If you don't use React hooks, you can do this with subscribe() through api directly. Check `./CheckoutNoReact.js`.
  let meta1 = '';
  let meta2 = '';
  useAppMetafields().map((m) => {
    console.log(`Extension() / useAppMetafields map() / data: ${JSON.stringify(m)}`);
    if (m.target.type === 'shop' && m.metafield.namespace === 'barebone_app' && m.metafield.key === 'url') meta1 = m.metafield.value;
    if (m.target.type === 'product' && m.metafield.namespace === 'barebone_app_upsell' && m.metafield.key === 'product_id') meta2 = m.metafield.value;
    console.log(`Extension() / useAppMetafields map() / meta1: ${meta1} meta2: ${meta2}`);
  });

  // Check if the discount update eligibility.
  if (!instructions.discounts.canUpdateDiscountCodes) {
    return (
      <Banner status="warning">
        Loyalty discounts are unavailable
      </Banner>
    );
  }

  // Get the current cart attribute value of the discount code.
  const attrValue = useAttributeValues(["barebone_cart_attribute_code"]).map((v) => v).join(''); // This is supposed to the same attribute in `./my-theme-app-ext/blocks/app-block.liquid`
  console.log(`Extension() / attrValue: ${attrValue}`);

  // Get the current discount code to be in the cart attribute above.
  const discountCode = useDiscountCodes().map((c) => c.code).join('');
  console.log(`Extension() / discountCode: ${JSON.stringify(discountCode)}`);

  // Control the checkout block based on the result of applying discount code.
  const [block, setBlock] = useState(false);
  useBuyerJourneyIntercept(
    ({ canBlockProgress }) => {
      return canBlockProgress && block
        ? {
          behavior: 'block',
          reason: 'Failed to apply the given discount code',
          errors: [
            {
              message:
                'Please set the discount code again.'
            }
          ]
        }
        : {
          behavior: 'allow',
        };
    },
  );

  useEffect(() => {
    // This is the timing of the current attribute value OR discount code changed (including empty values).
    console.log(`Extension() / useEffect() / attrValue: ${attrValue}  
      discountCode: ${discountCode}`);

    // Buyer operation cases between cart and checkout
    if (attrValue === '' && discountCode === '') {
      // No discount code set in cart or checkout (Case 0).
      // Do nothing.
      console.log(`Extension() / useEffect() / Case 0`);
    } else if (attrValue !== '' && discountCode === '') {
      // The buyer set the code in cart and it is being applied to checkout initially (Case 1), or 
      // the buyer remove the code in checkout (Case 2).
      api.storage.read('applied').then((cache) => {
        // For detecting Case 1 or 2, use local storage cache in the browser.
        if (cache == null) {
          // If the cache is empty, Case 1 = initial loading.
          applyDiscountCodeChange({
            type: 'addDiscountCode',
            code: attrValue
          }).then((res) => {
            console.log(`Extension() / useEffect() / Case 1 applyDiscountCodeChange type: addDiscountCode code: ${attrValue} reponse: ${JSON.stringify(res)}`);
            if (typeof res.type !== 'undefined' && res.type === 'error') {
              // If the code fails to be applied, bloch the checkout.
              setBlock(true);
            } else {
              // If the code gets applied successfully, unblock the checkout, and wite the cache flag.
              setBlock(false);
              api.storage.write('applied', 'true');
            }
          }).catch((e) => {
            console.log(`Extension() / useEffect() / Case 1 applyDiscountCodeChange type: addDiscountCode code: ${attrValue} exception: ${JSON.stringify(e)}`);
          });
        } else {
          // If the cache exists, Case 2 = buyer's manual input after the loading.
          applyAttributeChange({
            type: "updateAttribute",
            key: "barebone_cart_attribute_code",
            value: '',
          }).then((res) => {
            console.log(`Extension() / useEffect() / Case 2 applyAttributeChange value: ${discountCode} reponse: ${JSON.stringify(res)}`);
            // Clear the cache for the next initial loading after back and forth to cart.
            api.storage.delete('applied');
          }).catch((e) => {
            console.log(`Extension() / useEffect() / Case 2 applyAttributeChange value: ${discountCode} exception: ${JSON.stringify(e)}`);
          });
        }
      });
    } else if (attrValue !== '' && discountCode !== '') {
      // The buyer set the code in cart and it has been applied to checkout (Case 3), or 
      // the buyer changed the code in checkout (Case 4).
      if (attrValue === discountCode) {
        // Case 3, do nothing.
        console.log(`Extension() / useEffect() / Case 3`);
      } else {
        // Case 4, overwrite the attribute with the current code (if they want to reset, they need to clear the code in Case 2)
        applyAttributeChange({
          type: "updateAttribute",
          key: "barebone_cart_attribute_code",
          value: discountCode,
        }).then((res) => {
          console.log(`Extension() / useEffect() / Case 4 applyAttributeChange value: ${discountCode} reponse: ${JSON.stringify(res)}`);
        }).catch((e) => {
          console.log(`Extension() / useEffect() / Case 4 applyAttributeChange value: ${discountCode} exception: ${JSON.stringify(e)}`);
        });
      }
    } else if (attrValue === '' && discountCode !== '') {
      // The buyer didn't set the code in cart but did in checkout (Case 5).
      applyAttributeChange({
        type: "updateAttribute",
        key: "barebone_cart_attribute_code",
        value: discountCode,
      }).then((res) => {
        console.log(`Extension() / useEffect() / Case 5 applyAttributeChange value: ${discountCode} reponse: ${JSON.stringify(res)}`);
      }).catch((e) => {
        console.log(`Extension() / useEffect() / Case 5 applyAttributeChange value: ${discountCode} exception: ${JSON.stringify(e)}`);
      });
    } else {
      // No cases.
    }

  }, [attrValue, discountCode]);

  // Check the current discont allocations.
  useDiscountAllocations().map((json) => {
    console.log(`Extension() / useDiscountAllocations() json: ${JSON.stringify(json)}`);
  });

  return (
    <BlockStack border={"dotted"} padding={"tight"}>
      <Banner title="api.extension.target">
        {translate("welcome", {
          target: <Text emphasis="bold">{api.extension.target}</Text>,
        })}
      </Banner>
      <Banner>
        <Text emphasis="bold">App Metafield 1 Value: </Text><Text> {appMetafield1}</Text>
      </Banner>
      <Banner>
        <Text emphasis="bold">App Metafield 2 Value: </Text><Text> {appMetafield2}</Text>
      </Banner>
      <Banner>
        <Text emphasis="bold">Your current attribute value: </Text><Text> {attrValue}</Text>
      </Banner>
      <Banner>
        <Text emphasis="bold">Your current discount code: </Text><Text> {discountCode}</Text>
      </Banner>
    </BlockStack>
  );

}