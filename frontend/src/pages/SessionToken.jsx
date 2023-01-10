import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Button, Badge, TextField } from '@shopify/polaris';

import jwt_decode from "jwt-decode";

// App Bridge Session Token sample
// See https://shopify.dev/apps/auth/oauth/session-tokens
function SessionToken() {
  const app = useAppBridge();

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
            <Button onClick={() => {
              getSessionToken(app).then((sessionToken) => {
                setRaw(foldLongLine(`${sessionToken}`));
                setDecoded(JSON.stringify(jwt_decode(JSON.stringify(sessionToken)), null, 4));
              });
            }}>
              Run the code
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
              label="Input your query params (e.g. my_key=1&my_val=aaa)"
              value={param}
              onChange={paramChange}
              autoComplete="off"
            />
          </Layout.Section>
          <Layout.Section>
            <Button onClick={() => {
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
              Run the code
            </Button>
          </Layout.Section>
          <Layout.Section>
            <Badge>Request URI:</Badge>
            <pre>{uri}</pre>
            <Badge>Request Authentication Bearer:</Badge>
            <pre>{auth}</pre>
            <Badge>My OAuth 2.0 Authorization Result:</Badge>
            <pre>{res}</pre>
          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default SessionToken