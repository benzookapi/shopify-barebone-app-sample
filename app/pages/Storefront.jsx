import { useEffect, useState } from 'react';
import { authenticatedJson } from "../utils/app-bridge";
import { getShopFromLocation } from "../utils/shop";


// Storefront API sample
// Read https://shopify.dev/docs/api/storefront
function Storefront() {
  const [shop, setShop] = useState('');
  const [result, setResult] = useState({});
  const [accessing, setAccessing] = useState(false);

  useEffect(() => {
    setShop(getShopFromLocation());
  }, []);

  const storefrontPageUrl = buildStorefrontPageUrl(shop || result.shop, result.public_token?.accessToken);

  return (
    <s-page heading="Storefront API sample with Cart API, tokenless access, and Customer Account API">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/docs/api/storefront/latest" target="_blank">Storefront API</s-link><br />
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
                        setResult({});
                    });
                  }}>
                    Prepare Storefront API access tokens
                  </s-button>
                  <p><APIResult res={result} loading={accessing} /></p>
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
                    : <s-text>plain custom storefront page</s-text>} using Cart API, tokenless access, and Customer Account API login.
                </s-list-item>
              </s-ordered-list>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function buildStorefrontPageUrl(shop, publicToken) {
  if (typeof window === 'undefined' || !shop) return '';
  const storefrontUrl = new URL('/storefront/plain', window.location.origin);
  storefrontUrl.searchParams.set('shop', shop);
  if (publicToken) storefrontUrl.searchParams.set('public_token', publicToken);
  return storefrontUrl.toString();
}

function APIResult(props) {
  if (props.loading) {
    return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
  }
  return (<pre>{JSON.stringify(props.res, null, 4)}</pre>);
}

export default Storefront
