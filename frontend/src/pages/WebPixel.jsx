import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, TextField, Button, Spinner, BlockStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Web Pixel sample
// See https://shopify.dev/api/pixels
// See https://shopify.dev/apps/marketing/pixels/getting-started
function WebPixel() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  const [ga4Id, setGA4Id] = useState('');
  const ga4IdChange = useCallback((newGA4Id) => setGA4Id(newGA4Id), []);
  const [ga4Sec, setGA4Sec] = useState('');
  const ga4SecChange = useCallback((newGA4Sec) => setGA4Sec(newGA4Sec), []);
  const [ga4Debug, setGA4Debug] = useState(false);
  const ga4DebugChange = useCallback((newGA4Debug) => setGA4Debug(newGA4Debug), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Web Pixel basic usage for GA4 event passing">
      <BlockStack gap="500">
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/apps/marketing/pixels/getting-started" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Set up your <Link url="https://support.google.com/analytics/answer/9303323" target="_blank">Data Streams</Link> in <Link url="https://analytics.google.com" target="_blank">Google Analytics</Link>
                    to send checkout events like <Badge status="info">checkout_started</Badge> within Web Pixel <Link url="https://www.w3schools.com/html/html5_webworkers.asp" target="_blank">Web Workers</Link> which cannot be done by
                    Theme App Extention or manual insertion of <Badge>header GA Tag</Badge>.
                    Other events outside checkouts like page views, adding to carts can be sent by the GA tag insertion automatically which can be tested by
                    <Link url={`https://${_getAdminFromShop(shop)}/themes/current/editor?context=apps`} target="_blank">the app embed block named 'Barebone App Embed TP' of this app</Link>.
                  </p>
                  <BlockStack gap="500">
                    <TextField
                      label="Input your GA4 Measurement ID"
                      value={ga4Id}
                      onChange={ga4IdChange}
                      autoComplete="off"
                      placeholder="G-XXXXXXXXXX"
                    />
                    <TextField
                      label="Input your GA4 API Secret"
                      value={ga4Sec}
                      onChange={ga4SecChange}
                      autoComplete="off"
                      placeholder="sXXXXXXXX-rX_XXXXXXX"
                    />
                  </BlockStack>
                  <p>The values above come from <Link url="https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?hl=ja&client_type=gtag" target="_blank">
                    Google Analytics Data Stream settings</Link>.
                  </p>
                  <Checkbox
                    label="Use debug (If you want to check the result of event sending in the browser console, check this on)"
                    checked={ga4Debug}
                    onChange={ga4DebugChange}
                  />
                </List.Item>
                <List.Item>
                  <Button variant="primary" onClick={() => {
                    setAccessing(true);
                    // See https://shopify.dev/api/admin-graphql/2023-04/mutations/webPixelCreate"
                    authenticatedFetch(app)(`/webpixel?ga4Id=${ga4Id}&ga4Sec=${ga4Sec}&ga4Debug=${ga4Debug}`).then((response) => {
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
                  </Button>&nbsp;
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Go to <Link url={`https://${_getAdminFromShop(shop)}/settings/customer_events`} target="_blank">customer events</Link> to check if the app pixel is created and visit <Link url={`https://${shop}`} target="_blank">your theme storefront</Link> with
                  <Badge>Developer Console</Badge> on to see which event triggered by Web Pixel. If you add <Link url={`https://${_getAdminFromShop(shop)}/themes/current/editor`} target="_blank">the app block named 'Barebone App Block TP' of this app</Link> to your theme app sections,
                  you can see <Badge>your own custom event</Badge> triggered in the pages you add the section, too.
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <p>You can check which events were sent in <Link url="https://analytics.google.com" target="_blank">Google Analytics</Link> dashboard.</p>
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

export default WebPixel