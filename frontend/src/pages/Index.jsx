import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Page, Card, ResourceList, Icon, Text } from '@shopify/polaris';
import { CircleRightMajor } from '@shopify/polaris-icons';

// Index for all sample UIs using ResourceList as a link list.
// See https://polaris.shopify.com/components/resource-list
function Index() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);

    // Redirect to the external mock service login to connect the current shop and their users by Session Token validation.
    if (new URLSearchParams(window.location.search).get("external") != null) {
        getSessionToken(app).then((sessionToken) => {
            redirect.dispatch(Redirect.Action.REMOTE, `https://${window.location.hostname}/mocklogin?sessiontoken=${sessionToken}`);
        });
        return (<span></span>);
    }

    return (
        <Page>
            <Card>
                <ResourceList
                    showHeader={true}
                    items={[
                        {
                            id: 1,
                            onClick: (id) => {
                                // See https://shopify.dev/apps/tools/app-bridge/actions/navigation/redirect-navigate
                                // 'url' = simple link doesn't work due to lack of the right hmac signature.
                                // App Bridge redirect embeds it. 
                                redirect.dispatch(Redirect.Action.APP, '/sessiontoken');
                            },
                            name: 'Session Token',
                            location: 'Session Token sameple with App Bridge for authentication and external site validation',
                        },
                        {
                            id: 2,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/adminlink');
                            },
                            name: 'Admin Link',
                            location: 'Admin Link sample with embedded / unnembedded handling',
                        },
                        {
                            id: 3,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/themeappextension');
                            },
                            name: 'Theme App Extension',
                            location: 'Theme App Extension with App Proxies use cases',
                        },
                        {
                            id: 4,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/functiondiscount');
                            },
                            name: 'Function Discount',
                            location: 'Function implementation for discounts based on customer matafields',
                        },
                        {
                            id: 5,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/functionshipping');
                            },
                            name: 'Function Shipping',
                            location: 'Function implementation for shipping rates based on delivery address zip code',
                        },
                        {
                            id: 6,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/functionpayment');
                            },
                            name: 'Function Payment',
                            location: 'Function implementation for payment methods based on selected delivery options',
                        },
                        {
                            id: 7,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/webpixel');
                            },
                            name: 'Web Pixel',
                            location: 'Web Pixel sameple for GA4 integration',
                        },
                        {
                            id: 8,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/postpurchase');
                            },
                            name: 'Post-purchase',
                            location: 'Post-purchase sample for upselling products and getting shop review scores with metafields',
                        },
                        {
                            id: 9,
                            onClick: (id) => {
                                redirect.dispatch(Redirect.Action.APP, '/checkoutui');
                            },
                            name: 'Checkout UI',
                            location: 'Checkout UI sample with upsell and shop reviews shared with post-purchase server side, and IP address blocking',
                        }
                    ]}
                    renderItem={(item) => {
                        const { id, onClick, name, location } = item;
                        const media = <Icon source={CircleRightMajor} />;
                        return (
                            <ResourceList.Item id={id} onClick={onClick} media={media} >
                                <Text variant="bodyMd" fontWeight="bold" as="h3">
                                    {name}
                                </Text>
                                <div>{location}</div>
                            </ResourceList.Item>
                        );
                    }}
                />
            </Card>
        </Page>
    );
}

export default Index