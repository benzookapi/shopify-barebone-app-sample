import { useState } from 'react';
import { authenticatedFetch, createRedirect, decodeSessionToken, getSessionToken, RedirectAction } from "../utils/app-bridge";
import { foldLongLine, getCurrentHost } from "../utils/shop";


// App Bridge Session Token sample
// Read https://shopify.dev/apps/auth/oauth/session-tokens
function SessionToken() {
  const redirect = createRedirect();

  const [raw, setRaw] = useState('');
  const [decoded, setDecoded] = useState('');

  const [url, setUrl] = useState('');
  const [auth, setAuth] = useState('');
  const [res, setRes] = useState('');

  return (
    <s-page heading="Getting started with session token authentication">
      <s-stack direction="block" gap="large">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-1-get-a-session-token" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-button variant="primary" onClick={() => {
                getSessionToken().then((sessionToken) => {
                  setRaw(foldLongLine(`${sessionToken}`, 80));
                  setDecoded(JSON.stringify(decodeSessionToken(sessionToken), null, 4));
                });
              }}>
                Show the current session token data
              </s-button>
            </s-box>
            <s-box>
              <s-badge>Raw Data:</s-badge>
              <pre>{raw}</pre>
              <s-badge>Decoded Payload:</s-badge>
              <pre>{decoded}</pre>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-link href="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests" target="_blank">Dev. doc</s-link>
            </s-box>
            <s-box>
              <s-button variant="primary" onClick={() => {
                setUrl('');
                setAuth('');
                setRes('');
                authenticatedFetch(`/authenticated`, {
                  /*method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: `{}`*/
                }).then((response) => {
                  response.json().then((json) => {
                    console.log(JSON.stringify(json, null, 4));
                    setUrl(json.request_url);
                    setAuth(foldLongLine(json.authentication_bearer, 80));
                    setRes(JSON.stringify(json.result, null, 4));
                  }).catch((e) => {
                    console.log(`${e}`);
                    setRes(`${e}`);
                  });
                });
              }}>
                Get your stored access token with the payload above in OAuth flow
              </s-button>
            </s-box>
            <s-box>
              <s-badge>Request URL:</s-badge>
              <pre>{url}</pre>
              <s-badge>Request Authentication Bearer:</s-badge>
              <pre>{auth}</pre>
              <s-badge>My OAuth Authorization Result:</s-badge>
              <pre>{res}</pre>
            </s-box>
          </s-stack>
        </s-section>
        <s-section>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-paragraph>
                If you want to connect to your own service like <s-link href={`https://${getCurrentHost()}/mocklogin`} target="_blank">this</s-link> outside Shopify Admin,
                you can use the session token validation for passing <s-badge tone="info">shop</s-badge> in a secure way as the following button does.
              </s-paragraph>
            </s-box>
            <s-box>
              <s-button variant="primary" onClick={() => {
                getSessionToken().then((sessionToken) => {
                  // Use the current session token for external site validation for connectihg shops.
                  // Read https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
                  redirect.dispatch(RedirectAction.REMOTE, { url: `https://${getCurrentHost()}/mocklogin?sessiontoken=${sessionToken}`, newContext: true });
                });
              }}>Connect to your service with the session token
              </s-button>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export default SessionToken
