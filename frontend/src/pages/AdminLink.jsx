import { useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Badge, Text, Spinner, List } from '@shopify/polaris';

import { _decodeSessionToken, _getAdminFromShop, _getShopFromQuery } from "../utils/my_util";

// Admin link sample with App Bridge redirection
// See https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup
// See https://shopify.dev/apps/app-extensions/getting-started#add-an-admin-link
function AdminLink() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    // Raw endpoint of this menu
    const rawUrl = `${window.location.href.split('?')[0]}`;

    const shop = _getShopFromQuery(window);

    // This query parameter is supposed to be given by Admin Link extensions.
    const id = new URLSearchParams(window.location.search).get("id");
    // Supposed to be shown from the linked page like a order details.
    if (id != null) {
        const [res, setRes] = useState('');

        authenticatedFetch(app)(`/adminlink?id=${id}`).then((response) => {
            response.json().then((json) => {
                console.log(JSON.stringify(json, null, 4));
                setRes(JSON.stringify(json.result, null, 4));
            }).catch((e) => {
                console.log(`${e}`);
                setRes(``);
            });
        });

        return (
            <Page title="You seem to have come through Admin Link!">
                <Layout>
                    <Layout.Section>
                        <Text as='h2'>Your selected data id: <Badge status='info'>{id}</Badge></Text>
                        <Text>
                            <Link onClick={() => { redirect.dispatch(Redirect.Action.APP, '/adminlink'); }}>
                                Go back
                            </Link>
                        </Text>
                    </Layout.Section>
                    <Layout.Section>
                        <Badge status="attention">If you come from a <b>product detail page</b>, you must see the following GraphQL response for the given id</Badge>
                    </Layout.Section>
                    <Layout.Section>
                        <Card>
                            <APIResult res={res} />
                        </Card>
                    </Layout.Section>
                </Layout>
            </Page>
        );
    }

    return (
        <Page title="Switch the request hanlding for embedded or unembedded.">
            <Card title="Step 1: Check how external access is protected" sectioned={true}>
                <List type="bullet">
                    <List.Item>
                        This app endpoints (menus) accept embedded requests only with the parameter <Badge status="info">embedded</Badge> = 1 to be protected by <Link url="https://shopify.dev/apps/auth/oauth/getting-started#step-2-verify-the-installation-request" external={true}>hmac signature verification</Link>,
                        but this page accepts unembedded ones supposed to be <b>accessed outside Shopify to be protected by Shopify login</b> of <Link url="https://shopify.dev/apps/tools/app-bridge/getting-started/app-setup#initialize-shopify-app-bridge-in-your-app" external={true}>App Bridge force redirection</Link> (<Badge status="info">forceRedirect: true</Badge>).
                    </List.Item>
                    <List.Item>
                        Copy <Badge>{`${rawUrl}?shop=${shop}`}</Badge> to another browser in which you are not logged in to check if the page gets redirected to Shopify login (Disclaimer: the initial page should be blank for production).
                    </List.Item>
                </List>
            </Card>
            <Card title="Step 2: Add an admin link" sectioned={true}>
                <List type="bullet">
                    <List.Item>
                        Add <Badge>{`${rawUrl}`}</Badge> to <Link url="https://shopify.dev/apps/app-extensions/getting-started#add-an-admin-link" external={true}>Admin Link extension</Link> on the app extension settings and
                        go to your linked pages like <Link url={`https://${_getAdminFromShop(shop)}/products`} external={true}>Products</Link>.
                    </List.Item>
                    <List.Item>
                        Once you click your extension label in <Badge status="info">More actions</Badge>, this page shows up again in a diffrent UI checking if the <Badge status="info">id</Badge> parameter (<b>note that "id" is given by detail page links only</b>) is given from there.
                    </List.Item>
                </List>
            </Card>
        </Page>
    );
}

function APIResult(props) {
    if (Object.keys(props.res).length === 0) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="large" />;
    }
    return (<pre>{props.res}</pre>);
}

export default AdminLink