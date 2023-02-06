import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, List, Badge, Checkbox, TextField, Button, Spinner, Stack } from '@shopify/polaris';

import { _getShopFromQuery, _getAdminFromShop } from "../utils/my_util";

// Post Purchase sample
// See https://shopify.dev/api/pixels
// See https://shopify.dev/apps/marketing/pixels/getting-started
function PostPurchase() {
  const app = useAppBridge();

  const shop = _getShopFromQuery(window);

  return (
    <Page title="Post Purchase">
      <Card title="Step 1: " sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/apps/checkout/post-purchase/getting-started-post-purchase-extension" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <List type="number">
              <List.Item>
                <Stack spacing="loose">


                </Stack>
              </List.Item>
              <List.Item>
                <Stack spacing="loose">

                </Stack>
              </List.Item>
              <List.Item>

              </List.Item>
            </List>
          </Layout.Section>
        </Layout>
      </Card>
      <Card title="Step 2: " sectioned={true}>
        <Layout>
          <Layout.Section>

          </Layout.Section>
          <Layout.Section>

          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default PostPurchase