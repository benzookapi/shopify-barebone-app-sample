import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, TextField, Button, Spinner, VerticalStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Shopify Functions for payment method sample
// See https://shopify.dev/apps/checkout/payment-customizations
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// See https://shopify.dev/api/functions/reference/payment-customization
function FunctionPayment() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [method, setMethod] = useState('');
  const methodChange = useCallback((newMethod) => setMethod(newMethod), []);

  const [rate, setRate] = useState('');
  const rateChange = useCallback((newRate) => setRate(newRate), []);

  const [id, setId] = useState('');
  const idChange = useCallback((newId) => setId(newId), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Create your original payment method filtering with Shopify Functions">
      <VerticalStack gap="5">
        <Card title="Step 1: Specify which payment method shows up only with which shipping rate used" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/functions/reference/payment-customization" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>Input a <Badge>payment method name</Badge> which you want to show only, from <Link url={`https://${shop}`} external={true}>your checkout page</Link> (note that the method name needs to be <b>the buyer facing one</b>, not admin).
                  <TextField
                    label=""
                    value={method}
                    onChange={methodChange}
                    autoComplete="off"
                    placeholder="Example: Cash on Delivery (COD)"
                  />
                </List.Item>
                <List.Item>Input a <Badge>shipping rate name</Badge> which buyers select when the payment method shows up above, from <Link url={`https://${_getAdminFromShop(shop)}/settings/shipping`} external={true}>shipping settings</Link> or <Link url={`https://${_getAdminFromShop(shop)}/orders`} external={true}>past orders</Link>
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
        <Card title="Step 2: Create your payment customization and active it" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/admin-graphql/2023-04/mutations/paymentCustomizationCreate" external={true}>Dev. doc</Link>
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
                    placeholder="Example: 01GQZ4VR42WB6BHKZQ9XME2SN4"
                  />
                </List.Item>
                <List.Item>
                  <Button primary onClick={() => {
                    setAccessing(true);
                    // See https://shopify.dev/api/admin-graphql/2023-04/mutations/paymentCustomizationCreate"
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
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Go to <Link url={`https://${_getAdminFromShop(shop)}/settings/payments`} external={true}>payment settings</Link> to check if the customization is created and visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to see how your customization works with your selected shipping rate.
                </List.Item>
              </List>
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

export default FunctionPayment