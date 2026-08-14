import { useState, useCallback } from 'react';
import { callDirectAdminGraphql } from '../utils/direct-admin-graphql';
import { getAdminFromShop, getShopFromLocation } from "../utils/shop";

const CREATE_WEB_PIXEL = `mutation WebPixelCreate($webPixel: WebPixelInput!) {
  webPixelCreate(webPixel: $webPixel) {
    userErrors {
      field
      message
    }
    webPixel {
      settings
      id
    }
  }
}`;


// Web Pixel sample
// Read https://shopify.dev/api/pixels
// Read https://shopify.dev/apps/marketing/pixels/getting-started
function WebPixel() {

  const shop = getShopFromLocation();

  const [ga4Id, setGA4Id] = useState('');
  const ga4IdChange = useCallback((newGA4Id) => setGA4Id(newGA4Id), []);
  const [ga4Sec, setGA4Sec] = useState('');
  const ga4SecChange = useCallback((newGA4Sec) => setGA4Sec(newGA4Sec), []);
  const [ga4Debug, setGA4Debug] = useState(false);
  const ga4DebugChange = useCallback((newGA4Debug) => setGA4Debug(newGA4Debug), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <s-page heading="Web Pixel basic usage for GA4 event passing">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/apps/marketing/pixels/getting-started" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <p>
                    Set up your <s-link href="https://support.google.com/analytics/answer/9303323" target="_blank">Data Streams</s-link> in <s-link href="https://analytics.google.com" target="_blank">Google Analytics</s-link>
                    to send checkout events like <s-badge tone="info">checkout_started</s-badge> within Web Pixel <s-link href="https://www.w3schools.com/html/html5_webworkers.asp" target="_blank">Web Workers</s-link> which cannot be done by
                    Theme App Extention or manual insertion of <s-badge>header GA Tag</s-badge>.
                    Other events outside checkouts like page views, adding to carts can be sent by the GA tag insertion automatically which can be tested by
                    <s-link href={`https://${ getAdminFromShop(shop)}/themes/current/editor?context=apps`} target="_blank">the app embed block named 'Barebone App Embed TP' of this app</s-link>.
                  </p>
                  <s-stack direction="block" gap="large">
                    <s-text-field label="Input your GA4 Measurement ID" value={ga4Id} onInput={(event) => ga4IdChange(event.currentTarget.value)} placeholder="G-XXXXXXXXXX"></s-text-field>
                    <s-text-field label="Input your GA4 API Secret" value={ga4Sec} onInput={(event) => ga4SecChange(event.currentTarget.value)} placeholder="sXXXXXXXX-rX_XXXXXXX"></s-text-field>
                  </s-stack>
                  <p>The values above come from <s-link href="https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?hl=ja&client_type=gtag" target="_blank">
                    Google Analytics Data Stream settings</s-link>.
                  </p>
                  <s-checkbox label="Use debug (If you want to check the result of event sending in the browser console, check this on)" checked={ga4Debug} onChange={(event) => ga4DebugChange(event.currentTarget.checked)}></s-checkbox>
                </s-list-item>
                <s-list-item>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    // Read https://shopify.dev/api/admin-graphql/2023-04/mutations/webPixelCreate"
                    callDirectAdminGraphql(CREATE_WEB_PIXEL, {
                      webPixel: {
                        settings: JSON.stringify({ ga4Id, ga4Sec, ga4Debug: String(ga4Debug) }),
                      },
                    }).then((json) => {
                        console.log(JSON.stringify({
                          userErrors: json.data.webPixelCreate.userErrors,
                          webPixelId: json.data.webPixelCreate.webPixel?.id,
                        }, null, 4));
                        setAccessing(false);
                        if (json.data.webPixelCreate.userErrors.length == 0) {
                          setResult('Success!');
                        } else {
                          setResult('Error!');
                        }
                    }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult('Error!');
                    });
                  }}>
                    Create your Web Pixel
                  </s-button>&nbsp;
                  <s-badge tone='info'>Result: <APIResult res={result} loading={accessing} /></s-badge>
                </s-list-item>
                <s-list-item>
                  Go to <s-link href={`https://${ getAdminFromShop(shop)}/settings/customer_events`} target="_blank">customer events</s-link> to check if the app pixel is created and visit <s-link href={`https://${shop}`} target="_blank">your theme storefront</s-link> with
                  <s-badge>Developer Console</s-badge> on to see which event triggered by Web Pixel. If you add <s-link href={`https://${ getAdminFromShop(shop)}/themes/current/editor`} target="_blank">the app block named 'Barebone App Block TP' of this app</s-link> to your theme app sections,
                  you can see <s-badge>your own custom event</s-badge> triggered in the pages you add the section, too.
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <p>You can check which events were sent in <s-link href="https://analytics.google.com" target="_blank">Google Analytics</s-link> dashboard.</p>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
  }
  return (<span>{props.res}</span>);
}

export default WebPixel
