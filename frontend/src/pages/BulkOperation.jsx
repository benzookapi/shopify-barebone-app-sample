import { useState, useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Badge, Text, Spinner, List, VerticalStack, Button } from '@shopify/polaris';

import { _decodeSessionToken, _getAdminFromShop, _getShopFromQuery } from "../utils/my_util";

// Bulk opearation sample for product impporting with a file uploader.
// See https://shopify.dev/docs/api/usage/bulk-operations/imports
function BulkOperation() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    const rawUrl = `${window.location.href.split('?')[0]}`;

    const shop = _getShopFromQuery(window);

    const [result, setResult] = useState('');
    const [accessing, setAccessing] = useState(false);

    const id = new URLSearchParams(window.location.search).get("id");
    if (id != null) {
        const [res, setRes] = useState('');
        const [foIds, setFoIds] = useState([]);
        const [trans, setTrans] = useState([]);

        useEffect(() => {
            authenticatedFetch(app)(`/ordermanage?id=${id}`).then((response) => {
                response.json().then((json) => {
                    console.log(JSON.stringify(json, null, 4));
                    setRes(JSON.stringify(json, null, 4));
                    setFoIds(json.response.order.fulfillmentOrders.edges.map((e) => e.node.id));
                    setTrans(json.response.order.transactions.map((t) => `${t.id}-${t.amountSet.presentmentMoney.amount}`));
                }).catch((e) => {
                    console.log(`${e}`);
                    setRes(``);
                });
            });
        }, ['']);

        return (
            <Page title="Your oder details">
                <Layout>
                    <Layout.Section>
                        <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/fulfillmentCreateV2" target="_blank">Dev. doc (1)</Link>&nbsp;&nbsp;
                        <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/orderCapture" target="_blank">Dev. doc (2)</Link>
                    </Layout.Section>
                    <Layout.Section>
                        <Text as='h2'>Your selected data id: <Badge status='info'><Link url={`https://${_getAdminFromShop(shop)}/orders/${id}`} target="_blank">{id}</Link></Badge></Text>
                        <Text>
                            <Link onClick={() => { redirect.dispatch(Redirect.Action.APP, '/ordermanage'); }}>
                                Go back
                            </Link>
                        </Text>
                    </Layout.Section>
                    <Layout.Section>
                        <Card>
                            <APIResult res={res} />
                        </Card>
                    </Layout.Section>
                    <Layout.Section>
                        <Button primary onClick={() => {
                            setRes(``);
                            authenticatedFetch(app)(`/ordermanage?id=${id}&foids=${foIds}`).then((response) => {
                                response.json().then((json) => {
                                    console.log(JSON.stringify(json, null, 4));
                                    setRes(JSON.stringify(json, null, 4));
                                    setFoIds(json.response.order.fulfillmentOrders.edges.map((e) => e.node.id));
                                }).catch((e) => {
                                    console.log(`${e}`);
                                    setRes(``);
                                });
                            });
                        }}>Fulfillment this order</Button> with <Badge status='info'>fulfillment order ids</Badge> and <Badge status='info'>order.fulfillable = true</Badge>
                    </Layout.Section>
                    <Layout.Section>
                        <Button primary onClick={() => {
                            setRes(``);
                            authenticatedFetch(app)(`/ordermanage?id=${id}&trans=${trans}`).then((response) => {
                                response.json().then((json) => {
                                    console.log(JSON.stringify(json, null, 4));
                                    setRes(JSON.stringify(json, null, 4));
                                    setTrans(json.response.order.transactions.map((t) => `${t.id}-${t.amountSet.presentmentMoney.amount}`));
                                }).catch((e) => {
                                    console.log(`${e}`);
                                    setRes(``);
                                });
                            });
                        }}>Capture this order</Button> with <Badge status='info'>transaction ids</Badge> and <Badge status='info'>order.capturable = true</Badge>
                    </Layout.Section>
                </Layout>
            </Page>
        );
    }

    return (
        <Page title="Bulk operation sample for product importing with a file uploader">
            <VerticalStack gap="5">
                <Card sectioned={true}>
                    <Link url="https://shopify.dev/docs/apps/fulfillment" target="_blank">Dev. doc</Link>
                    <br />
                    <List type="number">
                        <List.Item>
                            Add <Badge>{`${rawUrl}`}</Badge> to <Link url="https://shopify.dev/apps/app-extensions/getting-started#add-an-admin-link" target="_blank">Admin Link extension</Link> on the app extension settings
                            for <Link url={`https://${_getAdminFromShop(shop)}/orders`} target="_blank">order details</Link>.
                        </List.Item>
                        <List.Item>
                            Once you click your extension label in <Badge status="info">More actions</Badge> in your selected order details, this page shows up again in a diffrent UI for <Badge>fulfillment / capture</Badge>, checking if the <Badge status="info">id</Badge> parameter is given or not.
                        </List.Item>
                        <List.Item>
                            Check the <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/objects/Order" target="_blank">admin order API specification</Link> to understand what data can be retrieved with it.
                        </List.Item>
                    </List>
                </Card>
                <Card sectioned={true}>
                    <Link url="https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps" target="_blank">Dev. doc</Link>
                    <br /><br />
                    <List type="number">
                        <List.Item>
                            <Button primary onClick={() => {
                                setAccessing(true);
                                authenticatedFetch(app)(`/ordermanage?fs=${true}`).then((response) => {
                                    response.json().then((json) => {
                                        console.log(JSON.stringify(json, null, 4));
                                        setAccessing(false);
                                        if (json.error === '') {
                                            setResult('Success!');
                                        } else {
                                            setResult(`Error! ${JSON.stringify(json.error)}`);
                                        }
                                    }).catch((e) => {
                                        console.log(`${e}`);
                                        setAccessing(false);
                                        setResult('Error!');
                                    });
                                });
                            }}>Create a fulfillment service for this app</Button>&nbsp;
                            <Badge status='info'>Result: <APIResult2 res={result} loading={accessing} /></Badge>
                        </List.Item>
                        <List.Item>
                            Make sure <Badge>Barebone app fulfillment service</Badge> is registed to <Badge status='info'>App locations</Badge> in <Link url={`https://${_getAdminFromShop(shop)}/settings/locations`} target="_blank">location settings</Link>.
                            Go to <Link url={`https://${_getAdminFromShop(shop)}/products`} target="_blank">product details</Link> to select <Badge>Barebone app fulfillment service</Badge> in <Badge status='info'>inventory's location</Badge> in your selected product page.
                            After you make a order of the procuct and go to <Link url={`https://${_getAdminFromShop(shop)}/orders`} target="_blank">the order page</Link>, you see the new button labeled <Badge status='info'>Request fulfillments</Badge>. Once you clich the button, you see <Badge>{`{"kind":"FULFILLMENT_REQUEST"}`}</Badge>
                            in your server log as accessing <Badge>/fulfillment_order_notification</Badge>.
                        </List.Item>
                        <List.Item>
                            The callback (<Badge>/fulfillment_order_notification</Badge>) makes fulfillments one by one and after a while, you can see the requested fulfillments get shipped automatically.
                        </List.Item>
                    </List>
                </Card>
                <Card sectioned={true}>
                    <List type="bullet">
                        <List.Item>
                            If you want to make this app a <Badge>shipping rate provider</Badge>, you have to register <Link url="https://shopify.dev/docs/api/admin-rest/unstable/resources/carrierservice#post-carrier-services" target="_blank">CarrierService</Link> which is available in <Badge>REST API</Badge> only. Instead, you can add your app defined shipping rate natively 
                            with <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/deliveryProfileCreate" target="_blank">deliveryProfileCreate</Link> API.
                        </List.Item>
                        <List.Item>
                            If you want this app to <Badge>manage inventories</Badge>, refer to <Link url="https://shopify.dev/docs/apps/fulfillment/inventory-management-apps/quantities-states" target="_blank">inventory management API</Link> which is not implemented by this sample.
                        </List.Item>
                    </List>
                </Card>
            </VerticalStack>
        </Page>
    );
}

function APIResult(props) {
    if (Object.keys(props.res).length === 0) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="large" />;
    }
    return (<pre>{props.res}</pre>);
}

function APIResult2(props) {
    if (props.loading) {
        return <Spinner accessibilityLabel="Calling Order GraphQL" size="small" />;
    }
    return (<span>{props.res}</span>);
}

export default BulkOperation