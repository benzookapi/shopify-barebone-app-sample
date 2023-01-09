import { useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Button, Badge, TextContainer } from '@shopify/polaris';

import jwt_decode from "jwt-decode";

// App Bridge Session Token sample
// See https://shopify.dev/apps/auth/oauth/session-tokens
function SessionToken() {
  const app = useAppBridge();
  //const redirect = Redirect.create(app);

  const [raw, setRaw] = useState('');
  const [decoded, setDecoded] = useState('');

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
                let token = JSON.stringify(sessionToken);
                let rawToken = '';
                while (token.length > 0) {
                  rawToken += `${token.substring(0, 80)}\n`;
                  token = token.substring(80);
                }
                let decodedToken = JSON.stringify(jwt_decode(JSON.stringify(sessionToken)), null, 4);
                setRaw(rawToken);
                setDecoded(decodedToken);
              });
            }}>
              Run the code
            </Button>
          </Layout.Section>
          <Layout.Section>
            <Badge>Raw data:</Badge>
            <pre>{raw}</pre>
            <Badge>Decoded data:</Badge>
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
            <Button onClick={() => {
            }}>
              Run the code
            </Button>
          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default SessionToken