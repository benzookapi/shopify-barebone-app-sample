import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/Tile.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.tile.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/Modal.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.modal.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/PostPurchaseAction.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.purchase.post.action.menu-item.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/PostPurchaseActionModal.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.purchase.post.action.render').Api;
  const globalThis: { shopify: typeof shopify };
}
