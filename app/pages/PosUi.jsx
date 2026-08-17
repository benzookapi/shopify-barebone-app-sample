import { useLoaderData } from "react-router";
import { getAdminFromShop } from "../utils/shop";

function PosUi() {
  const { shop } = useLoaderData();
  const posEditorUrl = `https://${getAdminFromShop(shop)}/apps/point-of-sale-channel/editor?currentEditor=pointOfSale&mode=sections`;

  return (
    <s-page heading="POS UI sample for customer scanning and document printing">
      <s-stack direction="block" gap="large">
        <s-section heading="Before testing">
          <s-ordered-list>
            <s-list-item>
              Install the <s-link href="https://apps.shopify.com/shopify-pos" target="_blank">Shopify POS sales channel</s-link> in the test store.
            </s-list-item>
            <s-list-item>
              Install the Shopify POS mobile app for <s-link href="https://apps.apple.com/us/app/shopify-point-of-sale-pos/id686830644" target="_blank">iOS</s-link> or <s-link href="https://play.google.com/store/apps/details?id=com.shopify.pos" target="_blank">Android</s-link>, then sign in to the same store with an authorized staff account.
            </s-list-item>
            <s-list-item>
              Add the sample tile from Shopify POS or the <s-link href={posEditorUrl} target="_blank">Shopify POS smart-grid editor</s-link> in Shopify admin.
            </s-list-item>
          </s-ordered-list>
        </s-section>

        <s-section heading="Where it appears">
          <s-ordered-list>
            <s-list-item>
              The <s-badge>pos.home.tile.render</s-badge> target provides the sample's Shopify POS Home smart-grid tile. The Shopify admin editor lists it as <b>A Preact POS UI extension</b>, using the extension description. The running tile is rendered by <s-badge>Tile.jsx</s-badge>, and tapping it opens the scanner workflow in the companion <s-badge>pos.home.modal.render</s-badge> modal.
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
              Open the sample's smart-grid tile in Shopify POS and scan a barcode or QR code containing a numeric Shopify customer ID. The modal passes that ID to <s-badge>shopify.cart.setCustomer()</s-badge> and adds the customer to the current cart.
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
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default PosUi;
