import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { Page, Card, Layout, Link, List, Badge, BlockStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components
function CheckoutUi() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const shop = _getShopFromQuery(window);

  return (
    <Page title="Checkout UI sample for upselling / store review / IP address blocking">
      <BlockStack gap="500">
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/api/checkout-ui-extensions" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Go to <Link onClick={() => {
                      redirect.dispatch(Redirect.Action.APP, '/postpurchase');
                    }}>Post-purchase sample</Link> to <b>add all used metafields and set the values</b>.
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    Add <b>three instances of this app</b> in the locations of <Badge status='info'>'<b>purchase.checkout.block.render</b>' = Dynamic / '<b>purchase.checkout.contact.render-after</b>' = Static /
                      '<b>purchase.checkout.actions.render-before</b>' = Static</Badge> in <Link url={`https://${_getAdminFromShop(shop)}/settings/checkout/editor`} target="_blank">checkout editor</Link>, seeing <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview" target="_blank">this dev. page</Link> and set the IP address to <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#block-progress" target="_blank">block</Link> in their settings. You can check your IP address in external sites
                    like <Link url="https://whatismyipaddress.com/" target="_blank">this</Link>.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/apps/checkout/build-options" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Visit <Link url={`https://${shop}`} target="_blank">your theme storefront</Link> to check how your checkout UI extensions work added above. You can see the demo of this extension <Link url={`https://github.com/benzookapi/shopify-barebone-app-sample/wiki#checkout-ui-extensions`} target="_blank">here</Link> too.
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    You can check the upsell products in <Link url={`https://${_getAdminFromShop(shop)}/orders`} target="_blank">orders </Link> with detailed info.
                  </p>
                  <p>
                    Also, you can check the review score of each buyer in <Badge>barebone_app_review.score</Badge> metafield of <Link url={`https://${_getAdminFromShop(shop)}/customers`} target="_blank">customers</Link>.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
            <Layout.Section>
              <p>
                <b>TIPS: </b>This extension uses its own provided <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#api-access" target="_blank">Storefront API calls</Link> and app <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#network-access" target="_blank">server side access</Link> shared with <Link onClick={() => {
                  redirect.dispatch(Redirect.Action.APP, '/postpurchase');
                }}>Post-purchase sample</Link> wtih <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/unstable/targets/block/purchase-thank-you-block-render#standardapi-propertydetail-sessiontoken" target="_blank">session tokens</Link>.
              </p>
            </Layout.Section>
          </Layout>
        </Card>
      </BlockStack>
    </Page>
  );
}

export default CheckoutUi