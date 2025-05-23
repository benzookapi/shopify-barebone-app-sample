// Checkout UI Sample for deep dive to how the extension gets loaded in Vanila JS without React JSX or hooks.
// Read https://shopify.dev/docs/api/checkout-ui-extensions
// Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/attributes
// Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/discounts
// Read https://shopify.dev/docs/api/checkout-ui-extensions/components

import {
  extension,

  Banner,
  BlockStack,
  Text
} from '@shopify/ui-extensions/checkout';

// My own common functions shared by multiple files.
import { commonFuncExternal } from "./common";

// The following extension registrations need to be the same as `./shopify.extension.toml`.
// Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/configuration
// Added for the dynamic target (generated by CLI by default)
export default extension('purchase.checkout.block.render', (root, api) => {
  return Extension(root, api);
});
// Added for the static target.
extension('purchase.checkout.actions.render-before', (root, api) => {
  return ExtensionStatic(root, api);
});

function Extension(root, api) {

  console.log(`Extension() api: ${JSON.stringify(api, null, 4)}`);

  const read_metafields = api.settings.current.read_metafields;
  const read_attributes = api.settings.current.read_attributes;
  const read_discounts = api.settings.current.read_discounts;
  console.log(`Extension() / api.settings read_metafields: ${read_metafields} read_attributes: ${read_attributes} read_discounts: ${read_discounts}`);

  let appMetafield1 = '';
  let appMetafield2 = '';
  let attrValue = '';
  let discountCode = '';

  // Function to reactivate (render again) the components that is called when the following metafileds / attributes / discounts codes 
  // subscribe() callbacks get new values.
  // Read https://github.com/Shopify/ui-extensions/blob/unstable/packages/ui-extensions/docs/surfaces/checkout/staticPages/examples/extension-apis.example.ts
  const renderUI = () => {
    for (const child of root.children) {
      root.removeChild(child);
    }
    const blockStack = root.createComponent(BlockStack, {
      border: "dotted",
      padding: "tight"
    }, [
      root.createComponent(Banner, {
        title: "api.extension.target (Vanila JS)"
      }, api.i18n.translate('welcome', {
        target: root.createComponent(Text, { emphasis: "bold" }, `Dynamic: ${api.extension.target}`)
      })),
      root.createComponent(Banner, undefined, [
        root.createComponent(Text, { emphasis: "bold" }, 'App Metafield 1 Value: '),
        root.createComponent(Text, undefined, appMetafield1),
      ]),
      root.createComponent(Banner, undefined, [
        root.createComponent(Text, { emphasis: "bold" }, 'App Metafield 2 Value: '),
        root.createComponent(Text, undefined, appMetafield2),
      ]),
      root.createComponent(Banner, undefined, [
        root.createComponent(Text, { emphasis: "bold" }, 'Your current attribute value: '),
        root.createComponent(Text, undefined, attrValue),
      ]),
      root.createComponent(Banner, undefined, [
        root.createComponent(Text, { emphasis: "bold" }, 'Your current discount code: '),
        root.createComponent(Text, undefined, discountCode),
      ])
    ]);
    root.appendChild(blockStack);
  };

  if (read_metafields == null || read_metafields == true) {
    // Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/metafields#standardapi-propertydetail-appmetafields
    // Check `console.log(`Extension() api:` output in your browser above to find `current` in some fields including this metafields.
    // The fields with `current` with its type as `StatefulRemoteSubscribable` in dev. doc need to be subscribed as below.
    // NOTE TAHT subscribe's callback (entry) => {} happens async, so appMetafield1 and appMetafield2 are always empty in 
    // the next sequential steps. 
    // Also  (entry) => {} is not triggered in other callbacks like Button.onPress(), which means you have to read the data 
    // in the loading, not in button clicks.
    api.appMetafields.subscribe((entry) => {
      console.log(`Extension() / api.appMetafields.subscribe entry: ${JSON.stringify(entry)}`);
      entry.map((m) => {
        if (m.target.type === 'shop' && m.metafield.namespace === 'barebone_app' && m.metafield.key === 'url') appMetafield1 = m.metafield.value;
        if (m.target.type === 'product' && m.metafield.namespace === 'barebone_app_upsell' && m.metafield.key === 'product_id') appMetafield2 = m.metafield.value;
      });
      console.log(`Extension() / api.appMetafields.subscribe appMetafield1: ${appMetafield1} appMetafield2 ${appMetafield2}`);
      if (appMetafield1 !== '' || appMetafield2 !== '') {
        // Instead of useEffect and useState in React hooks, you have to reactive the components by yourself.
        renderUI();
      }
    });
  }

  if (read_attributes == null || read_attributes == true) {
    // Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/attributes#standardapi-propertydetail-attributes
    api.attributes.subscribe((entry) => {
      // Unlike React hooks in `Checkout.jsx`, Vanila JS doesn't load Extension() again when the used values have changed,
      // just call subscribe callbacks.
      console.log(`Extension() / api.attributes.subscribe entry: ${JSON.stringify(entry)}`);
      entry.map((m) => {
        if (m.key === 'barebone_cart_attribute_code') attrValue = m.value;
      });
      if (entry.length == 0) attrValue = '';
      console.log(`Extension() / api.attributes.subscribe attrValue: ${attrValue}`);
      // Instead of useEffect and useState in React hooks, you have to reactive the components by yourself.
      renderUI();
      if (attrValue !== '') {
        api.storage.read('value').then((cache) => {
          // Update the code only when the value has changed using local storage cache.
          if (cache === attrValue) return;
          api.applyDiscountCodeChange({
            type: 'addDiscountCode',
            code: attrValue
          }).then((res) => {
            console.log(`Extension() / api.attributes.subscribe / applyDiscountCodeChange type: addDiscountCode code: ${attrValue} reponse: ${JSON.stringify(res)}`);
            // Write the cache.
            api.storage.write('value', 'attrValue');
          }).catch((e) => {
            console.log(`Extension() / api.attributes.subscribe / applyDiscountCodeChange type: addDiscountCode code: ${attrValue} exception: ${JSON.stringify(e)}`);
          });
        });
      }
    });
  }

  if (read_discounts == null || read_discounts == true) {
    // Read https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/discounts#standardapi-propertydetail-discountcodes
    api.discountCodes.subscribe((entry) => {
      console.log(`Extension() / api.discountCodes.subscribe entry: ${JSON.stringify(entry)}`);
      entry.map((m) => {
        discountCode = m.code;
      });
      if (entry.length == 0) discountCode = '';
      console.log(`Extension() / api.discountCodes.subscribe discountCode: ${discountCode}`);
      // Instead of useEffect and useState in React hooks, you have to reactive the components by yourself.
      renderUI();
      if (discountCode !== '') {
        api.storage.read('code').then((cache) => {
          // Update the attribute only when the value has changed using local storage cache as a flag.
          if (cache === discountCode) return;
          api.applyAttributeChange({
            type: "updateAttribute",
            key: "barebone_cart_attribute_code",
            value: discountCode,
          }).then((res) => {
            console.log(`Extension() / api.discountCodes.subscribe / applyAttributeChange value: ${discountCode} reponse: ${JSON.stringify(res)}`);
            // Write the cache.
            api.storage.write('code', discountCode);
          }).catch((e) => {
            console.log(`Extension() / api.discountCodes.subscribe / applyAttributeChange value: ${discountCode} exception: ${JSON.stringify(e)}`);
          });
        });
      }
    });
  }

  // Checking the common function in the same file.
  commonFuncInFile(`Extension() / test text 1`);
  // Checking the common function in the external file.
  commonFuncExternal(`Extension() / test text 1`);

  renderUI();

  return root;

}

function ExtensionStatic(root, api) {
  console.log(`ExtensionStatic() / Do nothing, no UI`);
  // Checking the common function in the same file.
  commonFuncInFile(`ExtensionStatic() / test text 2`);
  // Checking the common function in the external file.
  commonFuncExternal(`ExtensionStatic() / test text 2`);

  // `current` instance of the api doesn't make multiple loading.
  const read_metafields = api.settings.current.read_metafields;
  const read_attributes = api.settings.current.read_attributes;
  const read_discounts = api.settings.current.read_discounts;
  console.log(`ExtensionStatic() / api.settings read_metafields: ${read_metafields} read_attributes: ${read_attributes} read_discounts: ${read_discounts}`);

  root.appendChild(root.createComponent(Banner, {
    title: "api.extension.target (Vanila JS)",
    status: "critical"
  }, api.i18n.translate('welcome', {
    target: root.createComponent(Text, { emphasis: "bold" }, `Static: ${api.extension.target}`)
  })));

  return root;
}

// Common function in the same file.
const commonFuncInFile = (text) => {
  console.log(`commonFuncInFile outputs with text: ${text}`);
}