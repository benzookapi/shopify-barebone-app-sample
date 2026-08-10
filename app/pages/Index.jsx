import { navigateApp } from "../utils/app-bridge";

const samples = [
    {
        path: '/sessiontoken',
        name: 'Session Token',
        location: 'Session Token sample with App Bridge for authentication and external site validation',
    },
    {
        path: '/adminlink',
        name: 'Admin Link',
        location: 'Admin Link sample with embedded / unembedded handling',
    },
    {
        path: '/themeapp',
        name: 'Theme App Extension',
        location: 'Theme App Extension with App Proxies use cases',
    },
    {
        path: '/functiondiscount',
        name: 'Function Discount',
        location: 'Function implementation for discounts based on customer metafields',
    },
    {
        path: '/functionshipping',
        name: 'Function Shipping',
        location: 'Function implementation for shipping rates based on delivery address zip code',
    },
    {
        path: '/functionpayment',
        name: 'Function Payment',
        location: 'Function implementation for payment methods based on selected delivery options',
    },
    {
        path: '/webpixel',
        name: 'Web Pixel',
        location: 'Web Pixel sample for GA4 integration',
    },
    {
        path: '/postpurchase',
        name: 'Post-purchase',
        location: 'Post-purchase sample for upselling products and getting shop review scores with metafields',
    },
    {
        path: '/checkoutui',
        name: 'Checkout UI',
        location: 'Checkout UI sample with upsell, shop reviews, and IP address blocking',
    },
    {
        path: '/ordermanage',
        name: 'Order Management',
        location: 'Order management sample for fulfillments, transactions, and fulfillment services with inventory management',
    },
    {
        path: '/bulkoperation',
        name: 'Bulk Operation',
        location: 'Bulk Operation sample for product importing with file uploading',
    },
    {
        path: '/storefront',
        name: 'Storefront API',
        location: 'Storefront API sample with Cart API, tokenless access, and Customer Account API',
    },
];

// Index for all sample UIs using Polaris web components directly.
function Index() {
    return (
        <s-page heading="Barebone app samples">
            <s-section padding="none">
                <s-stack direction="block">
                    {samples.map((sample) => (
                        <s-clickable
                            key={sample.path}
                            borderStyle="solid none none none"
                            border="base"
                            paddingInline="base"
                            paddingBlock="small"
                            onClick={() => navigateApp(sample.path)}
                        >
                            <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                                <s-box>
                                    <s-heading>{sample.name}</s-heading>
                                    <s-text>{sample.location}</s-text>
                                </s-box>
                                <s-icon type="chevron-right"></s-icon>
                            </s-grid>
                        </s-clickable>
                    ))}
                </s-stack>
            </s-section>
        </s-page>
    );
}

export default Index
