import { useState, useEffect, useCallback } from 'react';
import { authenticatedJson, createRedirect, RedirectAction } from "../utils/app-bridge";
import { getAdminFromShop, getQueryParam, getShopFromLocation } from "../utils/shop";


// Order management sample for fulfillment, inventory, and fulfillment services with inventory management.
// Read https://shopify.dev/docs/apps/fulfillment
function OrderManage() {
    const redirect = createRedirect();

    const [pageContext, setPageContext] = useState({
        ready: false,
        id: null,
        shop: '',
    });
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
    const [res, setRes] = useState('');
    const [foIds, setFoIds] = useState([]);
    const [trans, setTrans] = useState([]);

    useEffect(() => {
        setPageContext({
            ready: true,
            id: getQueryParam("id"),
            shop: getShopFromLocation(),
        });
    }, []);

    const { ready, id, shop } = pageContext;

    useEffect(() => {
        if (!id) {
            setRes('');
            setFoIds([]);
            setTrans([]);
            return undefined;
        }

        let cancelled = false;
        setRes('');

        authenticatedJson(`/ordermanage.json?id=${encodeURIComponent(id)}`).then((json) => {
            console.log(JSON.stringify(json, null, 4));
            if (cancelled) return;
            setRes(JSON.stringify(json, null, 4));
            setFoIds(json.response.order.fulfillmentOrders.edges.map((e) => e.node.id));
            setTrans(json.response.order.transactions.map((t) => `${t.id}-${t.amountSet.presentmentMoney.amount}`));
        }).catch((e) => {
            console.log(`${e}`);
            if (!cancelled) setRes(`${e}`);
        });

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (!ready) {
        return (
            <s-page heading="Order management">
                <s-spinner accessibilityLabel="Loading Order management"></s-spinner>
            </s-page>
        );
    }

    if (id != null) {
        return (
            <s-page heading="Your oder details">
                <s-stack direction="block" gap="base">
                    <s-box>
                        <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/fulfillmentCreateV2" target="_blank">Dev. doc (1)</s-link>&nbsp;&nbsp;
                        <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/orderCapture" target="_blank">Dev. doc (2)</s-link>
                    </s-box>
                    <s-box>
                        <s-heading>Your selected data id: <s-badge tone='info'><s-link href={`https://${ getAdminFromShop(shop)}/orders/${id}`} target="_blank">{id}</s-link></s-badge></s-heading>
                        <s-text>
                            <s-link href="#" onClick={(event) => {
                                event.preventDefault();
                                redirect.dispatch(RedirectAction.APP, '/ordermanage');
                            }}>
                                Go back
                            </s-link>
                        </s-text>
                    </s-box>
                    <s-box>
                        <s-section>
                            <APIResult res={res} />
                        </s-section>
                    </s-box>
                    <s-box>
                        <s-button variant="primary" onClick={() => {
                            setRes(``);
                            authenticatedJson(`/ordermanage.json?id=${encodeURIComponent(id)}&foids=${encodeURIComponent(foIds.join(','))}`).then((json) => {
                                console.log(JSON.stringify(json, null, 4));
                                setRes(JSON.stringify(json, null, 4));
                                setFoIds(json.response.order.fulfillmentOrders.edges.map((e) => e.node.id));
                            }).catch((e) => {
                                console.log(`${e}`);
                                setRes(`${e}`);
                            });
                        }}>Fulfillment this order</s-button> with <s-badge tone='info'>fulfillment order ids</s-badge> and <s-badge tone='info'>order.fulfillable = true</s-badge>
                    </s-box>
                    <s-box>
                        <s-button variant="primary" onClick={() => {
                            setRes(``);
                            authenticatedJson(`/ordermanage.json?id=${encodeURIComponent(id)}&trans=${encodeURIComponent(trans.join(','))}`).then((json) => {
                                console.log(JSON.stringify(json, null, 4));
                                setRes(JSON.stringify(json, null, 4));
                                setTrans(json.response.order.transactions.map((t) => `${t.id}-${t.amountSet.presentmentMoney.amount}`));
                            }).catch((e) => {
                                console.log(`${e}`);
                                setRes(`${e}`);
                            });
                        }}>Capture this order</s-button> with <s-badge tone='info'>transaction ids</s-badge> and <s-badge tone='info'>order.capturable = true</s-badge>
                    </s-box>
                </s-stack>
            </s-page>
        );
    }

    return (
        <s-page heading="Order namagement sample for fulfillments, transactions, and filfillment services with inventory management">
            <s-stack direction="block" gap="large">
                <s-section>
                    <s-link href="https://shopify.dev/docs/apps/fulfillment" target="_blank">Dev. doc</s-link>
                    <br /><br />
                    <s-ordered-list>
                        <s-list-item>
                            Check if <s-badge>app://ordermanage</s-badge> is added in the admin link extension setting in <s-badge>extensions/my-admin-link-order-details/shopify.extension.toml</s-badge> file
                            for <s-link href={`https://${ getAdminFromShop(shop)}/orders`} target="_blank">order details</s-link>.
                        </s-list-item>
                        <s-list-item>
                            Once you click your extension label in <s-badge tone="info">More actions</s-badge> in your selected order details, this page shows up again in a diffrent UI for <s-badge>fulfillment / capture</s-badge>, checking if the <s-badge tone="info">id</s-badge> parameter is given or not.
                        </s-list-item>
                        <s-list-item>
                            Check the <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/objects/Order" target="_blank">admin order API specification</s-link> to understand what data can be retrieved with it.
                        </s-list-item>
                    </s-ordered-list>
                </s-section>
                <s-section>
                    <s-link href="https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps" target="_blank">Dev. doc (1)</s-link>
                    <br />
                    <s-link href="https://shopify.dev/docs/apps/fulfillment/inventory-management-apps" target="_blank">Dev. doc (2)</s-link>
                    <br />
                    <s-link href="https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps/manage-fulfillments" target="_blank">Dev. doc (3)</s-link>
                    <br /><br />
                    <s-ordered-list>
                        <s-list-item>
                            <s-button variant="primary" onClick={() => {
                                setAccessing(true);
                                authenticatedJson(`/ordermanage.json?fs=true`).then((json) => {
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
                            }}>Create a fulfillment service for this app</s-button>&nbsp;
                            <s-badge tone='info'>Result: <APIResult2 res={result} loading={accessing} /></s-badge>
                        </s-list-item>
                        <s-list-item>
                            Make sure <s-badge>Barebone app fulfillment service</s-badge> is registed to <s-badge tone='info'>App locations</s-badge> in <s-link href={`https://${ getAdminFromShop(shop)}/settings/locations`} target="_blank">location settings</s-link>.
                            Go to <s-link href={`https://${ getAdminFromShop(shop)}/products`} target="_blank">product details</s-link> to check <s-badge>Barebone app fulfillment service</s-badge> in <s-badge tone='info'>[Inventory] &gt; [Edit locations]</s-badge> in your selected product page
                            (If you have inventories in <b>other locations</b> for the product, <b>set zero</b> to use this app location for online checkout).
                        </s-list-item>
                        <s-list-item>
                            <p>Add inventories with the amount (+/-), state, and reason to this app's location.</p>
                            <p style={{ width: "300px" }}>
                                <s-text-field
                                    label="Amount:"
                                    value={delta}
                                    onInput={(event) => deltaChange(event.currentTarget.value)}
                                ></s-text-field>
                                <s-select
                                    label="State:"
                                    value={name}
                                    onChange={(event) => nameChange(event.currentTarget.value)}
                                >
                                    <s-option value="incoming">Incoming</s-option>
                                    <s-option value="available">Available</s-option>
                                    <s-option value="reserved">Reserved</s-option>
                                    <s-option value="damaged">Damaged</s-option>
                                    <s-option value="safety_stock">Safety stock</s-option>
                                    <s-option value="quality_control">Quality control</s-option>
                                </s-select>
                                <s-select
                                    label="Reason:"
                                    value={reason}
                                    onChange={(event) => reasonChange(event.currentTarget.value)}
                                >
                                    <s-option value="correction">Correction</s-option>
                                    <s-option value="cycle_count_available">Cycle count available</s-option>
                                    <s-option value="damaged">Damaged</s-option>
                                    <s-option value="other">Other</s-option>
                                    <s-option value="promotion">Promotion</s-option>
                                    <s-option value="quality_control">Quality control</s-option>
                                    <s-option value="received">Received</s-option>
                                    <s-option value="reservation_created">Reservation created</s-option>
                                    <s-option value="reservation_deleted">Reservation deleted</s-option>
                                    <s-option value="reservation_updated">Reservation updated</s-option>
                                    <s-option value="restock">Restock</s-option>
                                    <s-option value="safety_stock">Safety stock</s-option>
                                    <s-option value="shrinkage">Shrinkage</s-option>
                                </s-select>
                                <s-text-field
                                    label="Ledger document URI:"
                                    value={uri}
                                    onInput={(event) => uriChange(event.currentTarget.value)}
                                    placeholder='https://www.shopify.com/'
                                ></s-text-field>
                            </p>
                            <br />
                            <s-button variant="primary" onClick={() => {
                                setAccessing2(true);
                                authenticatedJson(`/ordermanage.json?delta=${encodeURIComponent(delta)}&name=${encodeURIComponent(name)}&reason=${encodeURIComponent(reason)}&uri=${encodeURIComponent(uri)}`).then((json) => {
                                    console.log(JSON.stringify(json, null, 4));
                                    setAccessing2(false);
                                    if (json.error === '') {
                                        setResult2('Success!');
                                        setLink(`https://${ getAdminFromShop(shop)}/products/inventory?location_id=${json.response.fulfillmentService.location.id.replace('gid://shopify/Location/', '')}`);
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
                            }}>Add inventories to this fulfillment service location</s-button>&nbsp;
                            <s-badge tone='info'>Result: <APIResult2 res={result2} loading={accessing2} /></s-badge>
                            <br /><br />
                            <InventoryLink link={link}></InventoryLink>
                        </s-list-item>
                        <s-list-item>
                            After you make a order of the procuct above through <s-link href={`https://${shop}`} target="_blank">the storefront</s-link> and go to <s-link href={`https://${ getAdminFromShop(shop)}/orders`} target="_blank">the order page</s-link>, you see the new button labeled <s-badge tone='info'>Request fulfillments</s-badge>. Once you click the button, you see <s-badge>{`{"kind":"FULFILLMENT_REQUEST"}`}</s-badge>
                            in your server log as accessing <s-badge>/fulfillment_order_notification</s-badge>.
                        </s-list-item>
                        <s-list-item>
                            The callback (<s-badge>/fulfillment_order_notification</s-badge>) makes fulfillments one by one and after a while, you can see the requested fulfillments get shipped automatically.
                            The callback (<s-badge>/fetch_stock.json</s-badge>) returns the initial inventories per SKU when a product is set to use this app inventory management.
                            The callback (<s-badge>/fetch_tracking_numbers.json</s-badge>) returns the tracking numbers dynamically (this demo has fixed values and is not in this case).
                        </s-list-item>
                    </s-ordered-list>
                </s-section>
                <s-section>
                    <s-unordered-list>
                        <s-list-item>
                            <p>The inventory status changes as follows.</p>
                            <p><b>Before checkout:</b> <s-badge>Available</s-badge> -&gt; <b>After checkout:</b> <s-badge>Committed</s-badge> -&gt; <b>After fulfillment:</b> <s-badge>No status = the quantity is decreased</s-badge></p>
                            You can catch the change in <s-link href='https://shopify.dev/docs/api/admin-graphql/unstable/enums/WebhookSubscriptionTopic#enums-INVENTORY_LEVELS_UPDATE' target='_blank'>inventory_levels/update webhook</s-link> to query <s-link href='https://shopify.dev/docs/apps/fulfillment/inventory-management-apps/quantities-states' target='_blank'>Inventory Item & Inventory Level</s-link> to send back the latest quantities and status to your external system.
                        </s-list-item>
                    </s-unordered-list>
                    <s-unordered-list>
                        <s-list-item>
                            If you want to make this app a <s-badge>shipping rate provider</s-badge>, you have to call <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/carrierServiceCreate" target="_blank">carrierServiceCreate</s-link> API for app defined rate registration. Instead, you can add your app defined shipping rate natively
                            with <s-link href="https://shopify.dev/docs/api/admin-graphql/unstable/mutations/deliveryProfileCreate" target="_blank">deliveryProfileCreate</s-link> API.
                        </s-list-item>
                    </s-unordered-list>
                </s-section>
            </s-stack>
        </s-page>
    );
}

function APIResult(props) {
    if (Object.keys(props.res).length === 0) {
        return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
    }
    return (<pre>{props.res}</pre>);
}

function APIResult2(props) {
    if (props.loading) {
        return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
    }
    return (<span>{props.res}</span>);
}

function InventoryLink(props) {
    if (props.link === '') {
        return (<></>);
    }
    return (<><p><b>Check the <s-link href={props.link} target="_blank">inventory of this app location</s-link>.</b></p></>);
}

export default OrderManage
