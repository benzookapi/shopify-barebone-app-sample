import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Button, Badge, TextField } from '@shopify/polaris';

import { _decodeSessionToken } from "../utils/my_util";

// Shopify Functions for discounts sample
// See https://shopify.dev/apps/discounts
// This sample doesn't use Shopify given libraries for the app UX, create an extention manually. 
// See https://shopify.dev/apps/discounts/create#step-4-add-and-deploy-a-product-discount-extension
function FunctionDiscount() {
  const app = useAppBridge();

  return (
    <Page title="Getting started with session token authentication">
      <Card title="Step 1: Get a session token" sectioned={true}>
        <Layout>
          <Layout.Section>
            <Link url="https://shopify.dev/apps/discounts" external={true}>Dev. doc</Link>
          </Layout.Section>
          <Layout.Section>
            <Button onClick={() => {

            }}>
              Run the code
            </Button>
          </Layout.Section>
          <Layout.Section>

          </Layout.Section>
        </Layout>
      </Card>
    </Page>
  );
}

export default FunctionDiscount