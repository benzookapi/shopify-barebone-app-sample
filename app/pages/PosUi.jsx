function PosUi() {
  return (
    <s-page heading="POS UI sample for customer scanning and document printing">
      <s-stack direction="block" gap="large">
        <s-section heading="Where it appears">
          <s-ordered-list>
            <s-list-item>
              The <s-badge>pos.home.tile.render</s-badge> target places the <b>My app</b> tile on the Shopify POS Home smart grid. Tapping it opens the scanner workflow in the companion <s-badge>pos.home.modal.render</s-badge> modal.
            </s-list-item>
            <s-list-item>
              After a sale, <s-badge>pos.purchase.post.action.menu-item.render</s-badge> adds an item to the post-purchase action menu. Selecting it opens the printing workflow in the companion <s-badge>pos.purchase.post.action.render</s-badge> modal.
            </s-list-item>
          </s-ordered-list>
          <s-stack direction="block" gap="small">
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/targets/home-screen" target="_blank">POS Home screen targets</s-link>
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/targets/post-purchase" target="_blank">POS post-purchase targets</s-link>
          </s-stack>
        </s-section>

        <s-section heading="How the sample works">
          <s-ordered-list>
            <s-list-item>
              Open the <b>My app</b> tile in Shopify POS and scan a barcode or QR code containing a numeric Shopify customer ID. The modal passes that ID to <s-badge>shopify.cart.setCustomer()</s-badge> and adds the customer to the current cart.
            </s-list-item>
            <s-list-item>
              Complete a purchase and open the extension from the post-purchase action menu. The modal uses <s-badge>shopify.printing.getPrinters()</s-badge> to show available hardware receipt printers. It can send the authenticated <s-badge>/mocklogin</s-badge> document directly to a connected compatible printer or use the system print dialog as a fallback.
            </s-list-item>
          </s-ordered-list>
        </s-section>

        <s-section heading="Development references">
          <s-stack direction="block" gap="small">
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest" target="_blank">POS UI extensions</s-link>
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/platform-apis/scanner-api" target="_blank">Scanner API</s-link>
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/contextual-apis/cart-api" target="_blank">Cart API</s-link>
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/standard-apis/session-api" target="_blank">Session API</s-link>
            <s-link href="https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/platform-apis/printing-api" target="_blank">Printing API</s-link>
            <s-link href="https://shopify.dev/changelog/pos-ui-extensions-can-now-print-directly-to-hardware-receipt-printers" target="_blank">Direct hardware receipt printer changelog</s-link>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default PosUi;
