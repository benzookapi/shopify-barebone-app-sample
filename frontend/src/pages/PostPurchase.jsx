import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Redirect } from '@shopify/app-bridge/actions';
import { Page, Card, Layout, Link, List, Badge, Button, Spinner, VerticalStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Post-purchase sample
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension
function PostPurchase() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const shop = _getShopFromQuery(window);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Post-purchase sample for switching products to upsell and getting shop review scores with metafields">
      <VerticalStack gap="5">
        <Card title="Step 1: Add used metafields by API and enable this post-purchase" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/api/checkout-extensions/extension-points" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Add the following <Link url={`https://${_getAdminFromShop(shop)}/settings/custom_data`} external={true}>metafields</Link> used by this post-purchase by clicking the button
                    with <Link url={`https://shopify.dev/docs/api/admin-graphql/2023-04/mutations/metafieldDefinitionCreate`} external={true}>metafieldDefinitionCreate </Link>
                    and <Link url={`https://shopify.dev/docs/api/admin-graphql/2023-04/mutations/metafieldsSet`} external={true}>metafieldsSet</Link>.
                  </p>
                  <List type="bullet">
                    <List.Item>
                      <p>
                        Namespace and key: <Badge>'barebone_app.url'</Badge> for <Badge status='info'>Shop</Badge> in type of <Badge>Single line text</Badge>  (This needs <b>'storefronts'</b> checked = visibleToStorefrontApi: true)
                        which has this app raw URL (<Badge>https://{window.location.hostname}</Badge>) <b>to be accessed from Post-purchase Web Workers </b>
                      </p>
                    </List.Item>
                    <List.Item>
                      <p>Namespace and key: <Badge>barebone_app_upsell.product_id</Badge> for <Badge status='info'>Products</Badge> in type of <Badge>Single line text</Badge>
                        (This needs <b>'storefronts'</b> checked = visibleToStorefrontApi: true) which has <b>product ids to upsell passed to the post-purchase flow</b>.
                      </p>
                    </List.Item>
                    <List.Item>
                      <p>Namespace and key: <Badge>barebone_app_review.score</Badge> for <Badge status='info'>Customers</Badge> in type of <Badge>Integer</Badge>
                        which has <b>reviw scores given by customers in the post-purchase flow</b>.
                      </p>
                    </List.Item>
                  </List>
                  <Button primary onClick={() => {
                    setAccessing(true);
                    authenticatedFetch(app)(`/postpurchase`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.errors == 0) {
                          setResult('Success!');
                        } else {
                          setResult(`Error! ${JSON.stringify(json.result.response)}`);
                        }
                      }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult('Error!');
                      });
                    });
                  }}>
                    Add metafields above
                  </Button>&nbsp;
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  <p>
                    Set each <Badge>product id (the last number of its detail page URL)</Badge> to each <Badge>barebone_app_upsell.product_id</Badge> of <Link url={`https://${_getAdminFromShop(shop)}/products`} external={true}>products</Link> for
                    those you want to upsell (e.g. Purchasing a Product A with a Product B's ID offers a Product B in post-purchases).
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    Select this app in <Badge status='info'>Post-purchase page</Badge> of <Link url={`https://${_getAdminFromShop(shop)}/settings/checkout`} external={true}>checkout settings</Link> to enable this Post-purchase.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card title="Step 2: Try your post-purchase out" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to check how your upsells work at your post-purchase.
                    <b>Note that Post-purchase extensions only show up when you use a credit card payment method</b> (i.e. Shopify Payment or Bogus Gateway in general). Any other methods like wallets and
                    3rd party payment apps don't show that flow.  See <Link url={`https://shopify.dev/docs/apps/checkout/post-purchase#limitations-and-considerations`} external={true}>this limitations</Link>.
                  </p>
                </List.Item>
                <List.Item>
                  <p>
                    You can check the post purchases in <Link url={`https://${_getAdminFromShop(shop)}/orders`} external={true}>orders </Link> with each detail page (you'll see appended items and transactions there).
                  </p>
                  <p>
                    Also, you can check the review score of each buyer in <Badge>barebone_app_review.score</Badge> of <Link url={`https://${_getAdminFromShop(shop)}/customers`} external={true}>customers</Link>.
                  </p>
                </List.Item>
              </List>
            </Layout.Section>
            <Layout.Section>
              <p>
                <b>TIPS: </b>This post-purchase communicates with the app raw endpoint over <Link url={`https://shopify.dev/docs/api/checkout-extensions/extension-points#web-platform-globals`} external={true}>CORS</Link> passing shop data with <Link url={`https://shopify.dev/docs/api/checkout-extensions/jwt-specification`} external={true}>JWT validated protection</Link> like this: <Badge>https://{window.location.hostname}/postpurchase?token=eyJhbGciOiJIUzI....</Badge>
                You can check how the JWT validation protects the raw endpoint copyging the token in the acccessed URL from your browser console to <Link url={`https://jwt.io/`} external={true}>jwt.io</Link> as <Link onClick={() => { redirect.dispatch(Redirect.Action.APP, '/sessiontoken'); }}>
                  Session Token sample
                </Link> does.
              </p>
            </Layout.Section>
          </Layout>
        </Card>
      </VerticalStack>
    </Page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
  }
  return (<span>{props.res}</span>);
}

export default PostPurchase