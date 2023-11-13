import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, TextField, Button, Spinner, BlockStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop, foldLongLine } from "../utils/my_util";

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
              <Link url="https://shopify.dev/docs/api/storefront" target="_blank">Dev. doc</Link>
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
                    Generate a storefront API access token
                  </Button>
                  <p><APIResult res={result} loading={accessing} /></p>
                </List.Item>
                <List.Item>
                  Open the <Link onClick={() => {
                    redirect.dispatch(Redirect.Action.REMOTE, { url: `https://${window.location.hostname}/storefront?public_token=${result.public_token}`, newContext: true });
                  }}>plain custom storefont page
                  </Link> using the generated token above.
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
    return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
  }
  return (<pre>{foldLongLine(JSON.stringify(props.res, null, 4), 120)}</pre>);
}

export default Storefront