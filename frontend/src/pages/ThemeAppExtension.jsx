import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { Page, Card, Layout, Link, Badge, List, Button } from '@shopify/polaris';

import { _getShopFromQuery } from "../utils/my_util";

// Theme App Extension sample with App Proxies
// See https://shopify.dev/apps/online-store/theme-app-extensions
// See https://shopify.dev/apps/online-store/app-proxies
function ThemeAppExtension() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    const shop = _getShopFromQuery(window);

    return (
        <Page title="Theme App Extension usage of Schema, Metafields and App proxies for server communication">
            <Card title="Step 1: Cofigure and activate your Theme App Extension in the theme editor" sectioned={true}>
                <Layout>
                    <Layout.Section>
                        <Link url="https://shopify.dev/apps/online-store/theme-app-extensions/extensions-framework" external={true}>Dev. doc</Link>
                    </Layout.Section>
                    <Layout.Section>
                        <Button onClick={() => {
                            // See https://shopify.dev/apps/online-store/theme-app-extensions/extensions-framework#simplified-installation-flow-with-deep-linking
                            const path = `/themes/current/editor?context=apps&activateAppId=${MY_THEME_APP_EXT_ID}/app-embed-block`;
                            console.log(path);
                            redirect.dispatch(Redirect.Action.ADMIN_PATH, {
                                path: path,
                                newContext: true
                            });
                        }}>
                            Active your extension settings in the theme editor
                        </Button>
                    </Layout.Section>
                    <Layout.Section>
                        <List type="bullet">
                            <List.Item>Yellow shirt</List.Item>
                            <List.Item>Red shirt</List.Item>
                            <List.Item>Green shirt</List.Item>
                        </List>
                    </Layout.Section>
                </Layout>

            </Card>
            <Card title="Step 2: Add the app proxy to your app with the following values" sectioned={true}>
                <Layout>
                    <Layout.Section>
                        <Link url="https://shopify.dev/apps/online-store/app-proxies" external={true}>Dev. doc</Link>
                    </Layout.Section>
                    <Layout.Section>
                        <List type="bullet">
                            <List.Item>Subpath prefix: <Badge>apps</Badge></List.Item>
                            <List.Item>Subpath: <Badge>bareboneproxy</Badge></List.Item>
                            <List.Item>Proxy URL: <Badge>https://{shop}/apps/bareboneproxy</Badge></List.Item>
                        </List>
                    </Layout.Section>
                    <Layout.Section>
                        <Button onClick={() => {
                            redirect.dispatch(Redirect.Action.REMOTE, {
                                url: `https://${shop}`,
                                newContext: true
                            });
                        }}>
                            Check your theme storefront
                        </Button>
                    </Layout.Section>
                </Layout>
            </Card>
        </Page>
    );
}

export default ThemeAppExtension