import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, TextField, Button, Spinner, Stack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Post-purchase sample
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
// See https://shopify.dev/docs/apps/checkout/post-purchase/getting-started-post-purchase-extension
function PostPurchase() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Post-purchase sample for switching products to upsell based on their metafields">
      <Card title="Step 1: Add used metafields and enable this post-purchase" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/docs/api/checkout-extensions/extension-points" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <List type="number">
              <List.Item>
                Add <Link url={`https://${_getAdminFromShop(shop)}/settings/custom_data`} external={true}>Metafields</Link> for <Badge status='info'>Products</Badge>
                in type of <Badge>Single line text</Badge> with namespace and key: <Badge>barebone_app_upsell.product_id</Badge>.
              </List.Item>
              <List.Item>
                Set each <Badge>product id (the last number of its detail page URL)</Badge> to each metafield above of <Link url={`https://${_getAdminFromShop(shop)}/products`} external={true}>Products</Link> for
                those you want to upsell (e.g. <b>Purchasing Product A with Product B's ID offers the B in post-purchase</b>).
              </List.Item>
              <List.Item>
                Add another metafield (<Badge>'barebone_app.url'</Badge>) to <Badge status='info'>Shop</Badge> to set this app raw URL (<Badge>https://{window.location.hostname}</Badge>) in it <b>to be accessed from Post-purchase Web Workers </b>
                using <Link url={`https://shopify.dev/docs/api/admin-graphql/2023-04/mutations/metafieldDefinitionCreate`} external={true}>metafieldDefinitionCreate (visibleToStorefrontApi: true) </Link>
                and <Link url={`https://shopify.dev/docs/api/admin-graphql/2023-04/mutations/metafieldsSet`} external={true}>metafieldsSet</Link>.
                <Stack spacing="loose">
                  <Button primary onClick={() => {
                    setAccessing(true);
                    authenticatedFetch(app)(`/postpurchase`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.data.metafieldsSet.userErrors.length == 0) {
                          setResult('Success!');
                        } else {
                          setResult('Error!');
                        }
                      }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult('Error!');
                      });
                    });
                  }}>
                    Set this app raw URL to Shop metafield
                  </Button>
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </Stack>
              </List.Item>
              <List.Item>
                Select this app as <Badge status='info'>Post-purchase page</Badge> at <Link url={`https://${_getAdminFromShop(shop)}/settings/checkout`} external={true}>Checkout Settings</Link> to enable this Post-purchase.
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
                Visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to check how your upsells work at your post-purchase.
                <b>Note that Post-purchase extensions only show up when you use a credit card payment method</b> (i.e. Shopify Payment or Bogus Gateway in general). Any other methods like wallet and
                3rd party payment app usage don't show that flow.  See <Link url={`https://shopify.dev/docs/apps/checkout/post-purchase#limitations-and-considerations`} external={true}>this limitations</Link>.
              </List.Item>
            </List>
          </Layout.Section>
        </Layout>
      </Card>
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