import { useState, useEffect, useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { Page, Card, Layout, Link, Badge, Text, Spinner, List, BlockStack, Button, Select, TextField } from '@shopify/polaris';

import { _decodeSessionToken, _getAdminFromShop, _getShopFromQuery } from "../utils/my_util";

// Order management sample for fulfillment, inventory, and fulfillment services with inventory management.
// See https://shopify.dev/docs/apps/fulfillment
function OrderManage() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    const rawUrl = `${window.location.href.split('?')[0]}`;

    const shop = _getShopFromQuery(window);

    const [result, setResult] = useState('');
    const [accessing, setAccessing] = useState(false);
    const [result2, setResult2] = useState('');
    const [accessing2, setAccessing2] = useState(false);

    const [delta, setDelta] = useState(1);
    const [name, setName] = useState('available');
    const [reason, setReason] = useState('received');
    const [uri, setUri] = useState('');
    const deltaChange = useCallback((newDelta) => setDelta(newDelta), []);
    const nameChange = useCallback((newName) => setName(newName), []);
    const reasonChange = useCallback((newReason) => setReason(newReason), []);
    const uriChange = useCallback((newUri) => setUri(newUri), []);

    const [link, setLink] = useState('');

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
                        <Button variant="primary" onClick={() => {
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
                        <Button variant="primary" onClick={() => {
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
        <Page title="Order namagement sample for fulfillments, transactions, and filfillment services with inventory management">
            <BlockStack gap="500">
                <Card sectioned={true}>
                    <Link url="https://shopify.dev/docs/apps/fulfillment" target="_blank">Dev. doc</Link>
                    <br /><br />
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
                    <br />
                    <Link url="https://shopify.dev/docs/apps/fulfillment/inventory-management-apps" target="_blank">Dev. doc</Link>
                    <br />
                    <Link url="https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps/manage-fulfillments" target="_blank">Dev. doc</Link>
                    <br /><br />
                    <List type="number">
                        <List.Item>
                            <Button variant="primary" onClick={() => {
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
                            Go to <Link url={`https://${_getAdminFromShop(shop)}/products`} target="_blank">product details</Link> to check <Badge>Barebone app fulfillment service</Badge> in <Badge status='info'>[Inventory] &gt; [Edit locations]</Badge> in your selected product page
                            (If you have inventories in <b>other locations</b> for the product, <b>set zero</b> to use this app location for online checkout).
                        </List.Item>
                        <List.Item>
                            <p>Add inventories with the amount (+/-), state, and reason to this app's location.</p>
                            <p style={{ width: "300px" }}>
                                <TextField
                                    label="Amount:"
                                    type="number"
                                    value={delta}
                                    onChange={deltaChange}
                                    autoComplete="off"
                                />
                                <Select
                                    label="State:"
                                    options={[
                                        { label: 'Incoming', value: 'incoming' },
                                        { label: 'Available', value: 'available' },
                                        { label: 'Reserved', value: 'reserved' },
                                        { label: 'Damaged', value: 'damaged' },
                                        { label: 'Safety stock', value: 'safety_stock' },
                                        { label: 'Quality control', value: 'quality_control' }
                                    ]}
                                    onChange={nameChange}
                                    value={name}
                                />
                                <Select
                                    label="Reason:"
                                    options={[
                                        { label: 'Correction', value: 'correction' },
                                        { label: 'Cycle count available', value: 'cycle_count_available' },
                                        { label: 'Damaged', value: 'damaged' },
                                        { label: 'Other', value: 'other' },
                                        { label: 'Promotion', value: 'promotion' },
                                        { label: 'Quality control', value: 'quality_control' },
                                        { label: 'Received', value: 'received' },
                                        { label: 'Reservation created', value: 'reservation_created' },
                                        { label: 'Reservation deleted', value: 'reservation_deleted' },
                                        { label: 'Reservation updated', value: 'reservation_updated' },
                                        { label: 'Restock', value: 'restock' },
                                        { label: 'Safety stock', value: 'safety_stock' },
                                        { label: 'Shrinkage', value: 'shrinkage' }
                                    ]}
                                    onChange={reasonChange}
                                    value={reason}
                                />
                                <TextField
                                    label="Ledger document URI:"
                                    type="text"
                                    value={uri}
                                    onChange={uriChange}
                                    placeholder='https://www.shopify.com/'
                                    autoComplete="off"
                                />
                            </p>
                            <br />
                            <Button variant="primary" onClick={() => {
                                setAccessing2(true);
                                authenticatedFetch(app)(`/ordermanage?delta=${delta}&name=${name}&reason=${reason}&uri=${uri}`).then((response) => {
                                    response.json().then((json) => {
                                        console.log(JSON.stringify(json, null, 4));
                                        setAccessing2(false);
                                        if (json.error === '') {
                                            setResult2('Success!');
                                            setLink(`https://${_getAdminFromShop(shop)}/products/inventory?location_id=${json.response.fulfillmentService.location.id.replace('gid://shopify/Location/', '')}`);
                                        } else {
                                            setResult2(`Error! ${JSON.stringify(json.error)}`);
                                            setLink('');
                                        }
                                    }).catch((e) => {
                                        console.log(`${e}`);
                                        setAccessing2(false);
                                        setResult2('Error!');
                                        setLink('');
                                    });
                                });
                            }}>Add inventories to this fulfillment service location</Button>&nbsp;
                            <Badge status='info'>Result: <APIResult2 res={result2} loading={accessing2} /></Badge>
                            <br /><br />
                            <InventoryLink link={link}></InventoryLink>
                        </List.Item>
                        <List.Item>
                            After you make a order of the procuct above through <Link url={`https://${shop}`} target="_blank">the storefront</Link> and go to <Link url={`https://${_getAdminFromShop(shop)}/orders`} target="_blank">the order page</Link>, you see the new button labeled <Badge status='info'>Request fulfillments</Badge>. Once you click the button, you see <Badge>{`{"kind":"FULFILLMENT_REQUEST"}`}</Badge>
                            in your server log as accessing <Badge>/fulfillment_order_notification</Badge>.
                        </List.Item>
                        <List.Item>
                            The callback (<Badge>/fulfillment_order_notification</Badge>) makes fulfillments one by one and after a while, you can see the requested fulfillments get shipped automatically.
                            The callback (<Badge>/fetch_stock.json</Badge>) returns the initial inventories per SKU when a product is set to use this app inventory management.
                            The callback (<Badge>/fetch_tracking_numbers.json</Badge>) returns the tracking numbers dynamically (this demo has fixed values and is not in this case).
                        </List.Item>
                    </List>
                </Card>
                <Card sectioned={true}>
                    <List type="bullet">
                        <List.Item>
                            <p>The inventory status changes as follows.</p>
                            <p><b>Before checkout:</b> <Badge>Available</Badge> -&gt; <b>After checkout:</b> <Badge>Committed</Badge> -&gt; <b>After fulfillment:</b> <Badge>No status = the quantity is decreased</Badge></p>
                            You can catch the change in <Link url='https://shopify.dev/docs/api/admin-graphql/unstable/enums/WebhookSubscriptionTopic#value-inventorylevelsupdate' target='_blank'>inventory_levels/update webhook</Link> to query <Link url='https://shopify.dev/docs/apps/fulfillment/inventory-management-apps/quantities-states' target='_blank'>Inventory Item & Inventory Level</Link> to send back the latest quantities and status to your external system.
                        </List.Item>
                    </List>
                    <List type="bullet">
                        <List.Item>
                            If you want to make this app a <Badge>shipping rate provider</Badge>, you have to register <Link url="https://shopify.dev/docs/api/admin-rest/unstable/resources/carrierservice#post-carrier-services" target="_blank">CarrierService</Link> which is available in <Badge>REST API</Badge> only. Instead, you can add your app defined shipping rate natively
                            with <Link url="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/deliveryProfileCreate" target="_blank">deliveryProfileCreate</Link> API.
                        </List.Item>
                    </List>
                </Card>
            </BlockStack>
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

function InventoryLink(props) {
    if (props.link === '') {
        return (<></>);
    }
    return (<><p><b>Check the <Link url={props.link} target="_blank">inventory of this app location</Link>.</b></p></>);
}

export default OrderManage