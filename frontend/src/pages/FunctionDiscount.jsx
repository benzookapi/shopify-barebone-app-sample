import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
//import { Redirect } from '@shopify/app-bridge/actions';
//import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, TextField, Button } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Shopify Functions for discounts sample
// See https://shopify.dev/apps/discounts
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// See https://shopify.dev/api/functions/reference/order-discounts/
function FunctionDiscount() {
  const app = useAppBridge();
  //const redirect = Redirect.create(app);

  const shop = _getShopFromQuery(window);

  const [meta, setMeta] = useState('');
  const metaChange = useCallback((newMeta) => setMeta(newMeta), []);

  const [id, setId] = useState('');
  const idChange = useCallback((newId) => setId(newId), []);

  return (
    <Page title="Create your original order discount with Shopify Functions">
      <Card title="Step 1: Specify who can get discounts by Metafields on Customers" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/api/functions/reference/order-discounts/" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <List type="number">
              <List.Item>Add <Link url={`https://${_getAdminFromShop(shop)}/metafields`} external={true}>Metafields</Link> for <Badge>Customers</Badge> as
                in type of <Badge>Integer</Badge> and input your Metafield <Badge>Namespace and key</Badge>
                <TextField
                  label=""
                  value={meta}
                  onChange={metaChange}
                  autoComplete="off"
                  placeholder="Example: custom.my_customer_metafield_1"
                />
              </List.Item>
              <List.Item>
                Set the Metafields to <Link url={`https://${_getAdminFromShop(shop)}/customers`} external={true}>Customers</Link> to specify how much discounted they get as a number
                (e.g. 30 = 30% discounted)
              </List.Item>
            </List>
          </Layout.Section>
        </Layout>
      </Card>
      <Card title="Step 2: Register your discount and active it" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/api/admin-graphql/2023-01/mutations/discountAutomaticAppCreate" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <List type="number">
              <List.Item>
                Input your <Badge>Shopify Functions ID</Badge> available in your app extension overview in <Link url="https://shopify.dev/api/functions/errors#debugging" external={true}>partner dashboard</Link> given by <Badge>`npm run deploy`</Badge>
                <TextField
                  label=""
                  value={id}
                  onChange={idChange}
                  autoComplete="off"
                  placeholder="Example: 01GQVSPSWHVQDASZXCTXYSBHH9"
                />
              </List.Item>
              <List.Item>
                <Button primary onClick={() => {
                  // See https://shopify.dev/apps/online-store/theme-app-extensions/extensions-framework#simplified-installation-flow-with-deep-linking
                  const path = `/themes/current/editor?context=apps&activateAppId=${MY_THEME_APP_EXT_ID}/app-embed-block`;
                  console.log(path);
                  redirect.dispatch(Redirect.Action.ADMIN_PATH, {
                    path: path,
                    newContext: true
                  });
                }}>
                  Register your discount!
                </Button>
              </List.Item>
              <List.Item>
                Go to <Link url={`https://${_getAdminFromShop(shop)}/discounts`} external={true}>Discounts</Link> to active and check <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to see how your discount works with your specified customers
              </List.Item>
            </List>
          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default FunctionDiscount