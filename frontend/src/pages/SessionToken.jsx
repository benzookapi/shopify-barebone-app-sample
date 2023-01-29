import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Button, Badge, TextField, List } from '@shopify/polaris';

import { _decodeSessionToken } from "../utils/my_util";

// App Bridge Session Token sample
// See https://shopify.dev/apps/auth/oauth/session-tokens
function SessionToken() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const [raw, setRaw] = useState('');
  const [decoded, setDecoded] = useState('');
  const [auth, setAuth] = useState('');
  const [res, setRes] = useState('');

  const foldLongLine = function (line) {
    let tmp = line;
    let res = '';
    while (tmp.length > 0) {
      res += `${tmp.substring(0, 80)}\n`;
      tmp = tmp.substring(80);
    }
    return res;
  };

  const [param, setParam] = useState('');
  const [uri, setUri] = useState('');

  const paramChange = useCallback((newParam) => setParam(newParam), []);

  return (
    <Page title="Getting started with session token authentication">
      <Card title="Step 1: Get a session token" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-1-get-a-session-token" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <Button primary onClick={() => {
              getSessionToken(app).then((sessionToken) => {
                setRaw(foldLongLine(`${sessionToken}`));
                setDecoded(JSON.stringify(_decodeSessionToken(sessionToken), null, 4));
              });
            }}>
              Show the current session token data
            </Button>
          </Layout.Section>
          <Layout.Section>
            <Badge>Raw Data:</Badge>
            <pre>{raw}</pre>
            <Badge>Decoded Payload:</Badge>
            <pre>{decoded}</pre>
          </Layout.Section>
        </Layout>
      </Card>
      <Card title="Step 2: Authenticate your requests" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <TextField
              label="Input your query params"
              value={param}
              onChange={paramChange}
              autoComplete="off"
              placeholder="Example: my_key=1&my_val=aaa"
            />
          </Layout.Section>
          <Layout.Section>
            <Button primary onClick={() => {
              setUri('');
              setAuth('');
              setRes('');
              // The external site access is blocked by CORS policy with the following error.
              // "Access to fetch at 'https://XXX' from origin 'https://YYY' has been blocked by CORS policy:"
              //authenticatedFetch(app)(`https://shopify-barebone-app-sample.onrender.com/sessiontoken?${param}`, {
              authenticatedFetch(app)(`/sessiontoken?${param}`, {
                /*method: "POST",
                headers: { "Content-Type": "application/json" },
                body: `{}`*/
              }).then((response) => {
                response.json().then((json) => {
                  console.log(JSON.stringify(json, null, 4));
                  setUri(foldLongLine(json.request_uri));
                  setAuth(foldLongLine(json.authentication_bearer));
                  setRes(JSON.stringify(json.result, null, 4));
                }).catch((e) => {
                  console.log(`${e}`);
                  setRes(`${e}`);
                });
              });
            }}>
              Get your stored access token with the payload above in OAuth flow
            </Button>
          </Layout.Section>
          <Layout.Section>
            <Badge>Request URI:</Badge>
            <pre>{uri}</pre>
            <Badge>Request Authentication Bearer:</Badge>
            <pre>{auth}</pre>
            <Badge>My OAuth Authorization Result:</Badge>
            <pre>{res}</pre>
          </Layout.Section>
        </Layout>
      </Card>
      <Card title="Step 3: Use the session token validation for external service connection outside Shopify" sectioned={true}>
        <Layout>
          <Layout.Section>
            <List type="bullet">
              <List.Item>
                If you want to connect to your own service like <Link url={`https://${window.location.hostname}/mocklogin`} external={true}>this</Link> outside Shopify Admin,
                you can use the session token validation for getting target <Badge status="info">shop</Badge>in the secure way as follows.
              </List.Item>
              <List.Item>
                If you add the same parameter to <Link url="https://shopify.dev/apps/deployment/web#step-5-update-urls-in-the-partner-dashboard" external={true}>YOUR_APP_URL</Link> (<Badge>https://{window.location.hostname}/?external=true</Badge>),
                you can see it in the <b>app install flow and top page access</b>.
              </List.Item>
            </List>
          </Layout.Section>
          <Layout.Section>
            <Button primary onClick={() => {
              getSessionToken(app).then((sessionToken) => {
                // Use the current session token for external site validation for connectihg shops.
                // See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
                redirect.dispatch(Redirect.Action.REMOTE, { url: `https://${window.location.hostname}/mocklogin?sessiontoken=${sessionToken}`, newContext: true });
              });
            }}>Connect to your service with the session token
            </Button>
          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default SessionToken