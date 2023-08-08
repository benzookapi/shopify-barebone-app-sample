import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, TextField, Button, Spinner, VerticalStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Shopify Functions for shipping method sample
// See https://shopify.dev/apps/checkout/delivery-customizations
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// See https://shopify.dev/api/functions/reference/delivery-customization
function FunctionShipping() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [rate, setRate] = useState('');
  const rateChange = useCallback((newRate) => setRate(newRate), []);

  const [zip, setZip] = useState('');
  const zipChange = useCallback((newZip) => setZip(newZip), []);

  const [id, setId] = useState('');
  const idChange = useCallback((newId) => setId(newId), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Create your original shipping rate filtering with Shopify Functions">
      <VerticalStack gap="5">
        <Card title="Step 1: Specify which shipping rate shows up only with which zip code input" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/functions/reference/delivery-customization" external={true}>Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>Input a <Badge>shipping rate name</Badge> which you want to show only, from <Link url={`https://${_getAdminFromShop(shop)}/settings/shipping`} external={true}>shipping settings</Link>.
                  <TextField
                    label=""
                    value={rate}
                    onChange={rateChange}
                    autoComplete="off"
                    placeholder="Example: Standard"
                  />
                </List.Item>
                <List.Item>Input a <Badge>zip code</Badge> which buyers input in their shipping address when the shipping rate shows up above.
                  <TextField
                    label=""
                    value={zip}
                    onChange={zipChange}
                    autoComplete="off"
                    placeholder="Example: 107-6245"
                  />
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card title="Step 2: Create your delivery customization and active it" sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/api/admin-graphql/2023-04/mutations/deliveryCustomizationCreate" external={true}>Dev. doc</Link>
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
                    placeholder="Example: 01GRE5XPEP3WDTNA1H8EV8ZMV9"
                  />
                </List.Item>
                <List.Item>
                  <Button primary onClick={() => {
                    setAccessing(true);
                    // See https://shopify.dev/api/admin-graphql/2023-04/mutations/deliveryCustomizationCreate"
                    authenticatedFetch(app)(`/functionshipping?rate=${rate}&zip=${zip}&id=${id}`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.data.deliveryCustomizationCreate.userErrors.length == 0) {
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
                    Create your delivery customization
                  </Button>&nbsp;
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Go to <Link url={`https://${_getAdminFromShop(shop)}/settings/shipping`} external={true}>shipping settings</Link> to check if the customization is created and visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to see how your customization works with your input zip code.
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

export default FunctionShipping