import { useState, useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Badge, Text, Spinner, List, VerticalStack, Button, ButtonGroup, FooterHelp } from '@shopify/polaris';

import { _decodeSessionToken, _getAdminFromShop, _getShopFromQuery } from "../utils/my_util";

// Order management sample for fulfillment, inventory, and fulfillment services.
// See https://shopify.dev/docs/apps/fulfillment
function OrderManage() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    const rawUrl = `${window.location.href.split('?')[0]}`;

    const shop = _getShopFromQuery(window);

    const [foIds, setFoIds] = useState([]);

    const id = new URLSearchParams(window.location.search).get("id");
    if (id != null) {
        const [res, setRes] = useState('');
        useEffect(() => {
            authenticatedFetch(app)(`/ordermanage?id=${id}`).then((response) => {
                response.json().then((json) => {
                    console.log(JSON.stringify(json, null, 4));
                    setRes(JSON.stringify(json, null, 4));
                    setFoIds(json.response.order.fulfillmentOrders.edges.map((e) => e.node.id));
                }).catch((e) => {
                    console.log(`${e}`);
                    setRes(``);
                });
            });
        }, [res]);

        return (
            <Page title="Your oder details">
                <Layout>
                    <Layout.Section>
                        <Link url="https://shopify.dev/docs/apps/fulfillment" target="_blank">Dev. doc</Link>
                    </Layout.Section>
                    <Layout.Section>
                        <Text as='h2'>Your selected data id: <Badge status='info'><Link url={`https://${_getAdminFromShop(shop)}/orders/${id}`} target="_blank">{id}</Link></Badge></Text>
                        <Text>
                            <Link onClick={() => { redirect.dispatch(Redirect.Action.APP, '/adminlink'); }}>
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
                        <ButtonGroup>
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
                            }}>Fulfillment this order</Button>
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
                            }}>Fulfillment this order</Button>
                        </ButtonGroup>
                    </Layout.Section>
                </Layout>
                <FooterHelp>

                </FooterHelp>
            </Page>
        );
    }

    return (
        <Page title="Switch the request hanlding for embedded or unembedded.">
            <VerticalStack gap="5">
                <Card sectioned={true}>
                    <Link url="https://shopify.dev/docs/apps/fulfillment" target="_blank">Dev. doc</Link>
                    <List type="bullet">
                        <List.Item>

                        </List.Item>
                    </List>
                </Card>
                <Card sectioned={true}>
                    <List type="bullet">
                        <List.Item>

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

export default OrderManage