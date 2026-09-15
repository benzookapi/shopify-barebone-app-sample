import { useEffect, useState } from 'react';
import { authenticatedJson } from "../utils/app-bridge";
import { getAdminFromShop, getShopFromLocation } from "../utils/shop";


// Storefront API sample
// Read https://shopify.dev/docs/api/storefront
// Read https://shopify.dev/docs/api/storefront-web-components
function Storefront() {
  const [shop, setShop] = useState('');
  const [result, setResult] = useState(null);
  const [accessing, setAccessing] = useState(false);
  const [customerAccountClientId, setCustomerAccountClientId] = useState('');
  const [appOrigin, setAppOrigin] = useState('');

  useEffect(() => {
    setShop(getShopFromLocation());
    setAppOrigin(window.location.origin);
  }, []);

  const currentShop = shop || result?.shop;
  const headlessUrl = currentShop ? `https://${getAdminFromShop(currentShop)}/apps/headless` : '';
  const callbackUrl = result?.customer_account_callback_url || (appOrigin ? `${appOrigin}/customer-account/callback` : '');
  const storefrontPageUrl = buildStorefrontPageUrl(currentShop, result?.public_token?.accessToken, customerAccountClientId);

  return (
    <s-page heading="Storefront API sample with Cart API, Storefront Web Components, and Customer Account API">
      <s-stack direction="block" gap="large">
        <s-section heading="Customer Account API setup (optional)">
          <s-stack direction="block" gap="base">
            <s-ordered-list>
              <s-list-item>
                Open {headlessUrl
                  ? <s-link href={headlessUrl} target="_blank">Headless</s-link>
                  : <s-text>Headless</s-text>} in this store's Shopify admin and create a storefront.
              </s-list-item>
              <s-list-item>
                In that storefront's Customer Account API settings, use a public client and copy its Client ID into the field below.
              </s-list-item>
              <s-list-item>
                In the same settings, add <code style={{ overflowWrap: 'anywhere' }}>{callbackUrl}</code> to the allowed callback URLs and <code style={{ overflowWrap: 'anywhere' }}>{appOrigin}</code> to the JavaScript origins.
              </s-list-item>
            </s-ordered-list>
            <s-text-field
              label="Customer Account API client ID"
              value={customerAccountClientId}
              onInput={(event) => setCustomerAccountClientId(event.currentTarget.value)}
              autocomplete="off"
            ></s-text-field>
            <s-paragraph>
              Required only for customer login. The value is not saved; enter it before opening the plain storefront page. Use the Customer Account API Client ID, not the app's API key or an access token.
            </s-paragraph>
            <s-link href="https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started" target="_blank">Customer Account API setup guide</s-link>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/storefront/latest" target="_blank">Storefront API</s-link><br />
              <s-link href="https://shopify.dev/docs/api/storefront-web-components" target="_blank">Storefront Web Components</s-link><br />
              <s-link href="https://shopify.dev/docs/api/customer/latest" target="_blank">Customer Account API</s-link><br />
              <s-link href="https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate" target="_blank">cartCreate</s-link>
            </s-box>
            <s-box>
              <s-ordered-list>
                <s-list-item>
                  <s-button variant="primary" onClick={() => {
                    setAccessing(true);
                    authenticatedJson(`/storefront.json`).then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        setResult(json.result.response);
                    }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult(null);
                    });
                  }}>
                    Prepare Storefront API access tokens
                  </s-button>
                  <div><APIResult res={result} loading={accessing} /></div>
                  <s-unordered-list>
                    <s-list-item>
                      <s-badge tone="info">Tokenless Storefront API</s-badge> can run the cart sample without a Storefront access token.
                    </s-list-item>
                    <s-list-item>
                      <s-badge tone="info">Public Storefront token</s-badge> is still generated so the sample can compare tokenless and token-based browser calls.
                    </s-list-item>
                    <s-list-item>
                      <s-badge tone="info">Private delegated token</s-badge> is kept server-side only for the server-call comparison.
                    </s-list-item>
                  </s-unordered-list>
                </s-list-item>
                <s-list-item>
                  Open the {storefrontPageUrl
                    ? <s-link href={storefrontPageUrl} target="_blank">plain custom storefront page</s-link>
                    : <s-text>plain custom storefront page</s-text>} using Cart API, tokenless access, Storefront Web Components product tiles, and Customer Account API login.
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function buildStorefrontPageUrl(shop, publicToken, customerAccountClientId) {
  if (typeof window === 'undefined' || !shop) return '';
  const storefrontUrl = new URL('/storefront/plain', window.location.origin);
  storefrontUrl.searchParams.set('shop', shop);
  if (publicToken) storefrontUrl.searchParams.set('public_token', publicToken);
  if (customerAccountClientId.trim()) storefrontUrl.searchParams.set('customer_account_client_id', customerAccountClientId.trim());
  return storefrontUrl.toString();
}

function APIResult(props) {
  if (props.loading) {
    return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
  }
  return (<pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(props.res || {}, null, 4)}</pre>);
}

export default Storefront
