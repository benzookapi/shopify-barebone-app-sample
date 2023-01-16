import { useState, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Button, Badge, TextField } from '@shopify/polaris';

// App Bridge Session Token sample
// See https://shopify.dev/apps/auth/oauth/session-tokens
function AdminLink() {
    const app = useAppBridge();
  
    return (
      <Page title="Getting started with session token authentication">
        <Card title="Step 1: Get a session token" sectioned={true}>
          
        </Card>
      </Page>
    );
  }
  
  export default AdminLink