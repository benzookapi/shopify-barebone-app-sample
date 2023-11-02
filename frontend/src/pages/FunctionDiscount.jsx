import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, TextField, Button, Spinner, BlockStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Shopify Functions for discounts sample
// See https://shopify.dev/apps/discounts
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// See https://shopify.dev/api/functions/reference/order-discounts/
function FunctionDiscount() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [meta, setMeta] = useState('');
  const metaChange = useCallback((newMeta) => setMeta(newMeta), []);

  const [id, setId] = useState('');
  const idChange = useCallback((newId) => setId(newId), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Create your original order discount with Shopify Functions">
      <BlockStack gap="500">
        <Card sectioned={true} >
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/functions/reference/order-discounts/" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>Add <Link url={`https://${_getAdminFromShop(shop)}/settings/custom_data`} target="_blank">Metafields</Link> for <Badge status='info'>Customers</Badge>
                  in type of <Badge>Integer</Badge> and input your Metafield <Badge>Namespace and key</Badge>
                  <TextField
                    label=""
                    value={meta}
                    onChange={metaChange}
                    autoComplete="off"
                    placeholder="Example: barebone_app.my_customer_discount_rate"
                  />
                </List.Item>
                <List.Item>
                  Set the Metafields to <Link url={`https://${_getAdminFromShop(shop)}/customers`} target="_blank">Customers</Link> to specify how much discounted they get as a number
                  (e.g. 30 = 30% discounted)
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/admin-graphql/2023-04/mutations/discountAutomaticAppCreate" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  Input your <Badge>Shopify Functions ID</Badge> available in your app extension overview in <Link url="https://shopify.dev/api/functions/errors#debugging" target="_blank">partner dashboard</Link> given by <Badge>`npm run deploy`</Badge>
                  <TextField
                    label=""
                    value={id}
                    onChange={idChange}
                    autoComplete="off"
                    placeholder="Example: 01GQVSPSWHVQDASZXCTXYSBHH9"
                  />
                </List.Item>
                <List.Item>
                  <Button variant="primary" onClick={() => {
                    setAccessing(true);
                    // See https://shopify.dev/api/admin-graphql/2023-01/mutations/discountAutomaticAppCreate"
                    authenticatedFetch(app)(`/functiondiscount?meta=${meta}&id=${id}`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.data.discountAutomaticAppCreate.userErrors.length == 0) {
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
                    Register your discount
                  </Button>&nbsp;
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Go to <Link url={`https://${_getAdminFromShop(shop)}/discounts`} target="_blank">Discounts</Link> to check if the discount is activated and visit <Link url={`https://${shop}`} target="_blank">your theme storefront</Link> to see how your discount works with your specified customers
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
      </BlockStack>
    </Page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
  }
  return (<span>{props.res}</span>);
}

export default FunctionDiscount