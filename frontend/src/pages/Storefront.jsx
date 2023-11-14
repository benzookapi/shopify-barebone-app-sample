import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Button, Spinner, BlockStack, Badge } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Storefront API sample
// See https://shopify.dev/docs/api/storefront
function Storefront() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const shop = _getShopFromQuery(window);

  const [result, setResult] = useState({});
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Storefront API sample with public and private (delegated) tokens in a plain custom storefront">
      <BlockStack gap="500">
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/api/storefront" target="_blank">Dev. doc (1)</Link><br />
              <Link url="https://shopify.dev/docs/api/usage/authentication#access-tokens-for-the-storefront-api" target="_blank">Dev. doc (2)</Link><br />
              <Link url="https://shopify.dev/docs/apps/auth/oauth/delegate-access-tokens" target="_blank">Dev. doc (3)</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <Button variant="primary" onClick={() => {
                    setAccessing(true);
                    authenticatedFetch(app)(`/storefront`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        setResult(json.result.response);
                      }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult({});
                      });
                    });
                  }}>
                    Generate Storefront API access tokens
                  </Button>
                  <p><APIResult res={result} loading={accessing} /></p>
                  <List type="bullet">
                    <List.Item>
                      <Badge tone="info">Public token's access scopes</Badge> are inherited from the app OAuth scopes, but limited to
                      <Badge>unauthenticated_XXX = Storefront API's only</Badge> (<b>*You can expose the token at the client side like browser page sources</b>).
                    </List.Item>
                    <List.Item>
                      <Badge tone="info">Private token's access scopes</Badge> can be given any ones including Admin API, but limited   
                      within <Badge>the app OAuth scopes = subset token</Badge> (<b>*You can NOT share the token which should be used in the server side only</b>).
                    </List.Item>
                  </List>
                </List.Item>
                <List.Item>
                  Open the <Link onClick={() => {
                    redirect.dispatch(Redirect.Action.REMOTE, { url: `https://${window.location.hostname}/storefront?shop=${shop}&public_token=${result.public_token.accessToken}`, newContext: true });
                  }}>plain custom storefont page
                  </Link> using the generated tokens above.
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
      </BlockStack>
    </Page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <Spinner accessibilityLabel="Calling Order GraphQL" size="large" />;
  }
  return (<pre>{JSON.stringify(props.res, null, 4)}</pre>);
}

export default Storefront