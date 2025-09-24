import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, TextField, Button, Spinner, BlockStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Shopify Functions for payment method sample
// Read https://shopify.dev/apps/checkout/payment-customizations
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// Read https://shopify.dev/api/functions/reference/payment-customization
function FunctionPayment() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [method, setMethod] = useState('Cash on Delivery (COD)');
  const methodChange = useCallback((newMethod) => setMethod(newMethod), []);

  const [rate, setRate] = useState('Standard');
  const rateChange = useCallback((newRate) => setRate(newRate), []);

  const [id, setId] = useState('');
  const idChange = useCallback((newId) => setId(newId), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Create your original payment method filtering with Shopify Functions">
      <BlockStack gap="500">
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/functions/reference/payment-customization" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>Input a <Badge>payment method name</Badge> which you want to show only, from <Link url={`https://${shop}`} target="_blank">your checkout page</Link> (note that the method name needs to be <b>the buyer facing one</b>, not admin).
                  <TextField
                    label=""
                    value={method}
                    onChange={methodChange}
                    autoComplete="off"
                    placeholder="Example: Cash on Delivery (COD)"
                  />
                </List.Item>
                <List.Item>Input a <Badge>shipping rate name</Badge> which buyers select when the payment method shows up above, from <Link url={`https://${_getAdminFromShop(shop)}/settings/shipping`} target="_blank">shipping settings</Link> or <Link url={`https://${_getAdminFromShop(shop)}/orders`} target="_blank">past orders</Link>
                  <TextField
                    label=""
                    value={rate}
                    onChange={rateChange}
                    autoComplete="off"
                    placeholder="Example: Standard"
                  />
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/admin-graphql/2023-04/mutations/paymentCustomizationCreate" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  Input your <Badge>Shopify Functions ID (uid)</Badge> in <Badge>extensions/my-function-payment-ext/shopify.extension.toml</Badge> or 
                  <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/queries/shopifyFunctions" target="_blank">Shopify Functions Admin API</Link>
                  <TextField
                    label=""
                    value={id}
                    onChange={idChange}
                    autoComplete="off"
                    placeholder="Example: db1fde78-bf9a-42ea-afb6-89f0edbb4797"
                  />
                </List.Item>
                <List.Item>
                  <Button variant="primary" onClick={() => {
                    setAccessing(true);
                    // Read https://shopify.dev/api/admin-graphql/2023-04/mutations/paymentCustomizationCreate"
                    authenticatedFetch(app)(`/functionpayment?method=${method}&rate=${rate}&id=${id}`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.data.paymentCustomizationCreate.userErrors.length == 0) {
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
                    Create your payment customization
                  </Button>&nbsp;
                  <Badge tone='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Go to <Link url={`https://${_getAdminFromShop(shop)}/settings/payments`} target="_blank">payment settings</Link> to check if the customization is created and visit <Link url={`https://${shop}`} target="_blank">your theme storefront</Link> to see how your customization works with your selected shipping rate.
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

export default FunctionPayment