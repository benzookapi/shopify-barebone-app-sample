import { useLoaderData } from "react-router";
import { createRedirect, RedirectAction } from "../utils/app-bridge";
import { getAdminFromShop } from "../utils/shop";


// Checkout UI sample
// Read https://shopify.dev/docs/api/checkout-ui-extensions
// Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// Read https://shopify.dev/docs/apps/checkout/product-offers
// Read https://shopify.dev/docs/api/checkout-ui-extensions/components
function CheckoutUi() {
  const redirect = createRedirect();
  const { shop } = useLoaderData();

  return (
    <s-page heading="Checkout UI sample for upselling / store review / IP address blocking">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/checkout-ui-extensions/latest" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <p>
                    Go to <s-link href="#" onClick={(event) => {
                      event.preventDefault();
                      redirect.dispatch(RedirectAction.APP, '/postpurchase');
                    }}>Post-purchase sample</s-link> to <b>add all used metafields and set the values</b>.
                  </p>
                </s-list-item>
                <s-list-item>
                  <p>
                    Add <b>three instances of this app</b> in the locations of <s-badge tone='info'>'<b>purchase.checkout.block.render</b>' = Dynamic / '<b>purchase.checkout.contact.render-after</b>' = Static /
                      '<b>purchase.checkout.actions.render-before</b>' = Static</s-badge> from <s-link href={`https://${ getAdminFromShop(shop)}/settings/checkout`} target="_blank">checkout settings</s-link>, seeing <s-link href="https://shopify.dev/docs/api/checkout-ui-extensions/latest/targets/checkout/block" target="_blank">this dev. page</s-link> and set the IP address to <s-link href="https://shopify.dev/docs/apps/build/checkout/capabilities#block-progress" target="_blank">block</s-link> in their settings. You can check your IP address in external sites
                    like <s-link href="https://whatismyipaddress.com/" target="_blank">this</s-link>.
                  </p>
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/apps/checkout/build-options" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <p>
                    Visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> to check how your checkout UI extensions work added above. You can see the demo of this extension <s-link href={`https://github.com/benzookapi/shopify-barebone-app-sample/wiki#checkout-ui-extensions`} target="_blank">here</s-link> too.
                  </p>
                </s-list-item>
                <s-list-item>
                  <p>
                    You can check the upsell products in <s-link href={`https://${ getAdminFromShop(shop)}/orders`} target="_blank">orders </s-link> with detailed info.
                  </p>
                  <p>
                    Also, you can check the review score of each buyer in <s-badge>barebone_app_review.score</s-badge> metafield of <s-link href={`https://${ getAdminFromShop(shop)}/customers`} target="_blank">customers</s-link>.
                  </p>
                </s-list-item>
              </s-ordered-list>
            </s-box>
            <s-box>
              <p>
                <b>TIPS: </b>This extension uses its own provided <s-link href="https://shopify.dev/docs/apps/build/checkout/capabilities#storefront-api-access" target="_blank">Storefront API calls</s-link> and app <s-link href="https://shopify.dev/docs/apps/build/checkout/capabilities#network-access" target="_blank">server side access</s-link> shared with <s-link href="#" onClick={(event) => {
                  event.preventDefault();
                  redirect.dispatch(RedirectAction.APP, '/postpurchase');
                }}>Post-purchase sample</s-link> with <s-link href="https://shopify.dev/docs/api/checkout-ui-extensions/latest/target-apis/platform-apis/session-token-api" target="_blank">session tokens</s-link>.
              </p>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default CheckoutUi
