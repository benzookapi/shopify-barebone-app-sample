import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/Upsell.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/Validation.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.contact.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/Review.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.actions.render-before').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/Address.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.address-autocomplete.suggest').Api;
  const globalThis: { shopify: typeof shopify };
}
