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

    // Supposed to be redirect to the external mock service login to connect the current shop and their users.
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
                            location: 'Session Token usage sameple with App Bridge',
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
                            location: 'Simple implementation with customer data',
                        },
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