import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Page, Card, ResourceList, Icon, Text } from '@shopify/polaris';
import { CircleRightMajor } from '@shopify/polaris-icons';

import { _decodeSessionToken } from "../utils/my_util";

// Index for all sample UIs using ResourceList as a link list.
// See https://polaris.shopify.com/components/resource-list
function Index() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);
    // Just using a session token for this? https://shopify.dev/apps/auth/oauth/session-tokens
    getSessionToken(app).then((sessionToken) => {
        console.log(`getSessionToken ${JSON.stringify(_decodeSessionToken(sessionToken), null, 4)}`);
    });

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