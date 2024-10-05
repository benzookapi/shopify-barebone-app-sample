import { extension, Banner, BlockStack, Text } from '@shopify/ui-extensions/checkout';

export default extension('purchase.checkout.block.render', (root, api) => {
  return Extension(root, api);
});

function Extension(root, api) {

  console.log(`Extension() api: ${JSON.stringify(api, null, 4)}`);

  let appMetafield1 = '';
  let appMetafield2 = '';
  let attrValue = '';
  let discountCode = '';

  api.appMetafields.subscribe((entry) => {
    console.log(`api.appMetafields.subscribe entry: ${JSON.stringify(entry)}`);
    entry.map((m) => {
      if (m.target === 'shop' && m.namespace === 'barebone_app' && m.key === 'url') appMetafield1 = m.value;
      if (m.target === 'product' && m.namespace === 'barebone_app_upsell' && m.key === 'product_id') appMetafield2 = m.value;
    });
    console.log(`api.appMetafields.subscribe appMetafield1: ${appMetafield1} appMetafield2 ${appMetafield2}`);
    if (appMetafield1 !== '' || appMetafield2 !== '') {
      // Instead of useEffect and useState in React
      // You have to reactive the components below.
    }
  });

  api.attributes.subscribe((entry) => {
    console.log(`api.attributes.subscribe entry: ${JSON.stringify(entry)}`);
    entry.map((m) => {
      if (m.target === 'shop' && m.namespace === 'barebone_app' && m.key === 'barebone_cart_attribute_code') attrValue = m.value;
    });
    console.log(`api.attributes.subscribe attrValue: ${attrValue}`);
    if (attrValue !== '') {
      // Instead of useEffect and useState in React
      // You have to reactive the components below.
      api.storage.read('value').then((cache) => {
        if (cache === attrValue) return;
        api.applyDiscountCodeChange({
          type: 'addDiscountCode',
          code: attrValue
        }).then((res) => {
          console.log(`Extension() / api.attributes.subscribe / applyDiscountCodeChange type: addDiscountCode code: ${attrValue} reponse: ${JSON.stringify(res)}`);
          api.storage.write('value', 'attrValue');
        }).catch((e) => {
          console.log(`Extension() / api.attributes.subscribe / applyDiscountCodeChange type: addDiscountCode code: ${attrValue} exception: ${JSON.stringify(e)}`);
        });
      });
    }
  });

  api.discountCodes.subscribe((entry) => {
    console.log(`api.discountCodes.subscribe entry: ${JSON.stringify(entry)}`);
    entry.map((m) => {
      discountCode = m.code;
    });
    console.log(`api.discountCodes.subscribe discountCode: ${discountCode}`);
    if (discountCode !== '') {
      // Instead of useEffect and useState in React
      // You have to reactive the components below.
      api.storage.read('code').then((cache) => {
        if (cache === discountCode) return;
        api.applyAttributeChange({
          type: "updateAttribute",
          key: "barebone_cart_attribute_code",
          value: discountCode,
        }).then((res) => {
          console.log(`Extension() / api.discountCodes.subscribe / applyAttributeChange value: ${discountCode} reponse: ${JSON.stringify(res)}`);
          api.storage.write('code', discountCode);
        }).catch((e) => {
          console.log(`Extension() / api.discountCodes.subscribe / applyAttributeChange value: ${discountCode} exception: ${JSON.stringify(e)}`);
        });
      });
    }
  });

  const blockStack = root.createComponent(BlockStack, {
    border: "dotted",
    padding: "tight"
  }, [
    root.createComponent(Banner, {
      title: "api.extension.target"
    }, api.i18n.translate('welcome', {
      target: root.createComponent(Text, { emphasis: "bold" }, api.extension.target)
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

  return root;

}