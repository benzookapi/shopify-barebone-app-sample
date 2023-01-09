import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import {
    AppProvider,
    Page,
    Card,
    ResourceList,
    Icon,
    Text,
} from '@shopify/polaris';
import { CircleRightMajor } from '@shopify/polaris-icons';

// All Polaris compoments which you can copy the React snipets from. https://polaris.shopify.com/components
// AppProvider is the base layout compoment. https://polaris.shopify.com/components/app-provider
function Index() {
    const app = useAppBridge();

    const redirect = Redirect.create(app);

    return (
        <AppProvider >
            <Page>
                <Card>
                    <ResourceList
                        showHeader={false}
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
        </AppProvider>
    );
}

export default Index