import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { Page, Card, ResourceList, Icon, Text } from '@shopify/polaris';
import { CircleRightMajor } from '@shopify/polaris-icons';

// Index for all sample UIs using ResourceList as a link list.
// See https://polaris.shopify.com/components/resource-list
function Index() {
    const app = useAppBridge();
    const redirect = Redirect.create(app);
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
                            location: 'Admin Link sample for embedded / non-embedded verification',
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