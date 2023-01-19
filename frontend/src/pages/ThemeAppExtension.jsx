import { useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Stack, Link, Badge, Text, Spinner } from '@shopify/polaris';

// Theme App Extension sample with App Proxies
// See https://shopify.dev/apps/online-store/theme-app-extensions
function ThemeAppExtension() {
    const app = useAppBridge();
    //const redirect = Redirect.create(app);

    return (
        <Page title="Theme App Extension!">
            <Layout>
                <Layout.Section>

                </Layout.Section>
                <Layout.Section>

                </Layout.Section>
                <Layout.Section>

                </Layout.Section>
            </Layout>
        </Page>
    );
}

export default ThemeAppExtension