import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, TextField, Button, Spinner, VerticalStack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Multipass sample
// See https://shopify.dev/docs/api/multipass
function Multipass() {
  const app = useAppBridge();
  const redirect = Redirect.create(app);

  const shop = _getShopFromQuery(window);

  const [secret, setSecret] = useState('');
  const secretChange = useCallback((newSecret) => setSecret(newSecret), []);

  const [result, setResult] = useState('');
  const [accessing, setAccessing] = useState(false);

  return (
    <Page title="Multipass SSO sample">
      <VerticalStack gap="5">
        <Card sectioned={true}>
          <Layout>
            <Layout.Section>
              <Link url="https://shopify.dev/docs/api/multipass" target="_blank">Dev. doc</Link>
            </Layout.Section>
            <Layout.Section>
              <List type="number">
                <List.Item>
                  <p>
                    Make sure your Multipass turned on in <Link url={`https://${_getAdminFromShop(shop)}/settings/customer_accounts`} target="_blank">Customer account settings</Link>. Copy your <Badge status='info'>Multipass secret</Badge> from there to paste to the following input.
                  </p>
                  <VerticalStack gap="5">
                    <TextField
                      label="Multipass secret"
                      value={secret}
                      onChange={secretChange}
                      autoComplete="off"
                      placeholder="c8b****************5e9"
                    />
                  </VerticalStack>
                </List.Item>
                <List.Item>
                  <Button primary onClick={() => {
                    setAccessing(true);
                    authenticatedFetch(app)(`/multipass?secret=${secret}`).then((response) => {
                      response.json().then((json) => {
                        console.log(JSON.stringify(json, null, 4));
                        setAccessing(false);
                        if (json.result.response.errors == 0) {
                          setResult('Success!');
                        } else {
                          setResult(`Error! ${JSON.stringify(json.result.response)}`);
                        }
                      }).catch((e) => {
                        console.log(`${e}`);
                        setAccessing(false);
                        setResult('Error!');
                      });
                    });
                  }}>
                    Add your secret to shop metafields
                  </Button>&nbsp;
                  <Badge status='info'>Result: <APIResult res={result} loading={accessing} /></Badge>
                </List.Item>
                <List.Item>
                  Open the <Link onClick={() => {
                    getSessionToken(app).then((sessionToken) => {
                      redirect.dispatch(Redirect.Action.REMOTE, { url: `https://${window.location.hostname}/multipass?sessiontoken=${sessionToken}`, newContext: true });
                    });
                  }}>mock login page with the session token
                  </Link> to test how Multipass SSO works.
                </List.Item>
              </List>
            </Layout.Section>
          </Layout>
        </Card>
      </VerticalStack>
    </Page>
  );
}

function APIResult(props) {
  if (props.loading) {
    return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
  }
  return (<span>{props.res}</span>);
}

export default Multipass