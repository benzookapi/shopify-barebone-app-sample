import { useEffect, useState } from 'react';
import { createRedirect, RedirectAction } from "../utils/app-bridge";
import { callDirectAdminGraphql } from "../utils/direct-admin-graphql";
import { getAdminFromShop, getQueryParam, getShopFromLocation } from "../utils/shop";

const ADMIN_LINKED_PRODUCT_QUERY = `query AdminLinkedProduct($id: ID!) {
    product(id: $id) {
        id
        handle
        title
        onlineStoreUrl
        priceRangeV2 {
            maxVariantPrice {
                amount
                currencyCode
            }
            minVariantPrice {
                amount
                currencyCode
            }
        }
        variants(first: 10) {
            edges {
                node {
                    id
                    title
                    price
                }
            }
        }
    }
}`;


// Admin link extension sample
// Read https://shopify.dev/apps/app-extensions/getting-started#add-an-admin-link
function AdminLink() {
    const redirect = createRedirect();
    const [pageContext, setPageContext] = useState({
        ready: false,
        id: null,
        shop: '',
    });
    const [res, setRes] = useState('');

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
            return undefined;
        }

        let cancelled = false;
        setRes('');

        callDirectAdminGraphql(ADMIN_LINKED_PRODUCT_QUERY, {
            id: `gid://shopify/Product/${id}`,
        }).then((response) => {
            const json = {
                result: {
                    message: '',
                    response,
                },
            };
            console.log(JSON.stringify(json, null, 4));
            if (!cancelled) setRes(JSON.stringify(json.result, null, 4));
        }).catch((error) => {
            console.log(`${error}`);
            if (!cancelled) setRes(`${error}`);
        });

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (!ready) {
        return (
            <s-page heading="Admin Link">
                <s-spinner accessibilityLabel="Loading Admin Link"></s-spinner>
            </s-page>
        );
    }

    // This query parameter is supposed to be given by Admin Link extensions.
    // Supposed to be shown from the linked page like a order details.
    if (id != null) {
        return (
            <s-page heading="You seem to have come through Admin Link!">
                <s-stack direction="block" gap="base">
                    <s-box>
                        <s-heading>Your selected data id: <s-badge tone='info'>{id}</s-badge></s-heading>
                        <s-text>
                            <s-link href="#" onClick={(event) => {
                                event.preventDefault();
                                redirect.dispatch(RedirectAction.APP, '/adminlink');
                            }}>
                                Go back
                            </s-link>
                        </s-text>
                    </s-box>
                    <s-box>
                        <s-badge tone="warning">If you come from a <b>product detail page</b>, you must see the following GraphQL response for the given id</s-badge>
                    </s-box>
                    <s-box>
                        <s-section>
                            <APIResult res={res} />
                        </s-section>
                    </s-box>
                </s-stack>
            </s-page>
        );
    }

    return (
        <s-page heading="Admin Link extension sample">
            <s-stack direction="block" gap="large">
                <s-section>
                    <s-unordered-list>
                        <s-list-item>
                            Check if <s-badge>app://adminlink</s-badge> is added in the admin extension link setting in <s-badge>extensions/my-admin-link-product-details/shopify.extension.toml</s-badge> file
                            for <s-link href={`https://${ getAdminFromShop(shop)}/products`} target="_blank">product details</s-link>.
                        </s-list-item>
                        <s-list-item>
                            Once you click your extension label in <s-badge tone="info">More actions</s-badge> in your selected product details, this page shows up again in a diffrent UI checking if the <s-badge tone="info">id</s-badge> parameter is given or not.
                        </s-list-item>
                    </s-unordered-list>
                </s-section>
            </s-stack>
        </s-page>
    );
}

function APIResult(props) {
    if (props.res === '') {
        return <s-spinner accessibilityLabel="Calling Order GraphQL"></s-spinner>;
    }
    return (<pre>{props.res}</pre>);
}

export default AdminLink
