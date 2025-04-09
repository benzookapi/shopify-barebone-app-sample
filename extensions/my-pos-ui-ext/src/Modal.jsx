import React, { useEffect } from 'react';
import {
  CameraScanner,
  Screen,
  Text,
  useScannerDataSubscription,
  reactExtension,
} from '@shopify/ui-extensions-react/point-of-sale';

const SmartGridModal = () => {
  const { data } = useScannerDataSubscription();

  useEffect(() => {
    if (data) {
      console.log('Scanner data changed:', data);
      // Call app server side to use Admin API with session token.
      // https://shopify.dev/docs/api/pos-ui-extensions/2025-01/server-communication     
    }
  }, [data]);

  return (
    <Screen
      name="CameraScanner"
      title="Camera Scanner Title"
    >
      <CameraScanner />
      <Text>{`Scanned data: ${data || ''}`}</Text>
    </Screen>
  );
};

export default reactExtension(
  'pos.home.modal.render',
  () => <SmartGridModal />,
);
