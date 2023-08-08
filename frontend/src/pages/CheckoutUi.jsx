import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { Page, Card, Layout, Link, List, Badge, VerticalStack } from '@shopify/polaris';

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
      <VerticalStack gap="5">
        <Card title="Step 1: Add used metafields shared with the post-purchase configration and set an IP address to block" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/api/checkout-ui-extensions" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Go to <Link onClick={() => {
                      redirect.dispatch(Redirect.Action.APP, '/postpurchase');
                    }}>Post-purchase sample</Link> to <b>add all used metafields and set the values following the step 1</b>.
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    Add <b>three instances of this app</b> in the locations of <Badge status='info'>'<b>Checkout::Dynamic::Render</b>' = Dynamic / '<b>Checkout::Contact::RenderAfter</b>' = Static /
                      '<b>Checkout::Actions::RenderBefore</b>' = Static</Badge> seeing <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview" external={true}>this dev. page</Link> and set the IP address to <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#block-progress" external={true}>block</Link> in their settings in <Link url={`https://${_getAdminFromShop(shop)}/settings/checkout/editor`} external={true}>checkout editor</Link>. You can check your IP address in external sites
                    like <Link url="https://whatismyipaddress.com/" external={true}>this</Link>.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card title="Step 2: Try your checkout UI extensions" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/apps/checkout/build-options" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to check how your checkout UI extensions work added above. You can see the demo of this extension <Link url={`https://github.com/benzookapi/shopify-barebone-app-sample/wiki#checkout-ui-extensions`} external={true}>here</Link> too.
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    You can check the upsell products in <Link url={`https://${_getAdminFromShop(shop)}/orders`} external={true}>orders </Link> with detailed info.
                  </p>
                  <p>
                    Also, you can check the review score of each buyer in <Badge>barebone_app_review.score</Badge> of <Link url={`https://${_getAdminFromShop(shop)}/customers`} external={true}>customers</Link>.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
            <Layout.Section>
              <p>
                <b>TIPS: </b>This extension uses its own provided <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#api-access" external={true}>Storefront API calls</Link> and app <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/configuration#network-access" external={true}>server side access</Link> shared with <Link onClick={() => {
                  redirect.dispatch(Redirect.Action.APP, '/postpurchase');
                }}>Post-purchase sample</Link> wtih <Link url="https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-sessiontoken" external={true}>session tokens</Link>.
              </p>
            </Layout.Section>
          </Layout>
        </Card>
      </VerticalStack>
    </Page>
  );
}

export default CheckoutUi