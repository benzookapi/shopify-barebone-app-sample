import {useAppBridge} from '@shopify/app-bridge-react';

import {
    AppProvider,
    Page,
    Card,
    ResourceList,
    Icon,
    Text,
} from '@shopify/polaris';
import {CircleRightMajor} from '@shopify/polaris-icons';

// Copying from Polaris site snipets. https://polaris.shopify.com/components/app-provider
function Index() {
    const app = useAppBridge();

    return (
        <AppProvider >
            <Page>
                <Card>
                    <ResourceList
                        showHeader={false}
                        items={[
                            {
                                id: 1,
                                url: 'sessiontoken',
                                name: 'Session Token',
                                location: 'Session Token usage sameple with App Bridge',
                            },
                        ]}
                        renderItem={(item) => {
                            const { id, url, name, location } = item;
                            const media = <Icon source={CircleRightMajor} />;
                            return (
                                <ResourceList.Item id={id} url={url} media={media} >
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