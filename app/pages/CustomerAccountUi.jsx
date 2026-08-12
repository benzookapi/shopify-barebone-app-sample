import { useLoaderData } from "react-router";
import { createRedirect, RedirectAction } from "../utils/app-bridge";
import { getAdminFromShop } from "../utils/shop";

function CustomerAccountUi() {
  const redirect = createRedirect();
  const { shop } = useLoaderData();

  return (
    <s-page heading="Customer Account UI sample for order status upsells">
      <s-stack direction="block" gap="large">
        <s-section heading="Where it appears">
          <s-stack direction="block" gap="base">
            <s-text>
              This extension uses the <s-badge>customer-account.order-status.block.render</s-badge> target. It appears as a merchant-positioned app block on an individual order status page in the customer's account.
            </s-text>
            <s-text>
              Open <s-link href={`https://${getAdminFromShop(shop)}/settings/checkout`} target="_blank">checkout settings</s-link>, customize the Order status page in the checkout and accounts editor, add this app block, and save the page.
            </s-text>
            <s-link href="https://shopify.dev/docs/api/customer-account-ui-extensions/latest/targets/order-status" target="_blank">Order status targets</s-link>
          </s-stack>
        </s-section>

        <s-section heading="How the sample works">
          <s-ordered-list>
            <s-list-item>
              Use the <s-link href="#" onClick={(event) => {
                event.preventDefault();
                redirect.dispatch(RedirectAction.APP, '/postpurchase');
              }}>Post-purchase sample</s-link> to prepare the <s-badge>barebone_app.url</s-badge> shop metafield and an upsell product ID in <s-badge>barebone_app_upsell.product_id</s-badge> on a product.
            </s-list-item>
            <s-list-item>
              Place an order containing that configured product, then open its Order status page from the customer account. The block reads the purchased products and their app metafields to find the upsell products.
            </s-list-item>
            <s-list-item>
              The extension uses its session token to request product data from the app's <s-badge>/postpurchase</s-badge> endpoint. It displays the returned products and uses the extension's Storefront API access to create a cart and checkout link.
            </s-list-item>
          </s-ordered-list>
        </s-section>

        <s-section heading="Development references">
          <s-stack direction="block" gap="small">
            <s-link href="https://shopify.dev/docs/api/customer-account-ui-extensions/latest" target="_blank">Customer Account UI extensions</s-link>
            <s-link href="https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/order-apis/metafields-api" target="_blank">Metafields API</s-link>
            <s-link href="https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/platform-apis/session-token-api" target="_blank">Session Token API</s-link>
            <s-link href="https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/platform-apis/storefront-api" target="_blank">Storefront API</s-link>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default CustomerAccountUi;
