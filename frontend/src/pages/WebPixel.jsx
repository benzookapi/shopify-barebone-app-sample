import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, Button, Spinner, Stack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Web Pixel sample
// See https://shopify.dev/api/pixels
// See https://shopify.dev/apps/marketing/pixels/getting-started
function WebPixel() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [ga4, setGA4] = useState(false);
  const ga4Change = useCallback((newGA4) => setGA4(newGA4), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  const [data, setData] = useState('');

  return (
    <Page title="Web Pixel basic usage for storing customer events and Google Tag event passing">
      <Card title="Step 1: Create your Web Pixel to store the data" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/apps/marketing/pixels/getting-started" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <List type="number">
              <List.Item>
                <Stack spacing="loose">
                  <Checkbox label="Pass GA4 tag event" checked={ga4} onChange={ga4Change} />
                  <p>If you check this, enable the <Link url={`https://${_getAdminFromShop(shop)}/themes/current/editor?context=apps`} external={true}>transparent theme app embed block ("Barebone App Embed TP")</Link> to insert your GA tag manually.</p>
                </Stack>
              </List.Item>
              <List.Item>
                <Stack spacing="loose">
                  <Button primary onClick={() => {
                    setAccessing(true);
                    // See https://shopify.dev/api/admin-graphql/2023-04/mutations/webPixelCreate"
                    authenticatedFetch(app)(`/webpixel?create=true&ga4=${ga4}`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.data.webPixelCreate.userErrors.length == 0) {
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
                    Create your Web Pixel
                  </Button>
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </Stack>
              </List.Item>
              <List.Item>
                Go to <Link url={`https://${_getAdminFromShop(shop)}/settings/customer_events`} external={true}>customer events</Link> to check if the app pixel is created and visit <Link url={`https://${shop}`} external={true}>your theme storefront</Link> to create customer events like adding carts, completing checkout, etc.
              </List.Item>
            </List>
          </Layout.Section>
        </Layout>
      </Card>
      <Card title="Step 2: Check your stored data" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Button primary onClick={() => {
              authenticatedFetch(app)(`/webpixel?show=true`).then((response) => {
                response.json().then((json) => {
                  console.log(JSON.stringify(json, null, 4));
                  setData(JSON.stringify(json.result, null, 4));
                }).catch((e) => {
                  console.log(`${e}`);
                  setData(``);
                });
              });
            }}>
              Refresh
            </Button>
          </Layout.Section>
          <Layout.Section>
            <pre>{data}</pre>
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

export default WebPixel