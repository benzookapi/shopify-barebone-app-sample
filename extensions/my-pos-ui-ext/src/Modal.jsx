import React, { useEffect } from 'react';
import {
  CameraScanner,
  Screen,
  Text,
  useScannerDataSubscription,
  useApi,
  reactExtension,
} from '@shopify/ui-extensions-react/point-of-sale';

const SmartGridModal = () => {
  const { data } = useScannerDataSubscription();

  const api = useApi();

  useEffect(() => {
    if (data) {
      console.log(`Scanner data changed: ${data}`);

      // Call app server side to use Admin API with session token.
      // https://shopify.dev/docs/api/pos-ui-extensions/unstable/server-communication 

      // or add a customer to the current cart with customer id given by barcode or QR to check their online orders, etc.
      // https://shopify.dev/docs/api/pos-ui-extensions/unstable/apis/cart-api#cartapi-propertydetail-setcustomer
      api.cart.setCustomer({
        id: Number(data)
      }).then(() => {
        console.log(`api.cart.setCustomer successful with customer id: ${data}`);
        api.toast.show(`api.cart.setCustomer successful with customer id: ${data}`);
        api.navigation.dismiss();
      }).catch((e) => {
        console.log(`api.cart.setCustomer error: ${JSON.stringify(e)}`);
        api.toast.show(`api.cart.setCustomer error: ${JSON.stringify(e)}`);
      });

      // or apply a discount code
      // https://shopify.dev/docs/api/pos-ui-extensions/unstable/apis/cart-api#cartapi-propertydetail-applycartdiscount
      /*api.cart.applyCartDiscount('Percentage', 'api.cart.applyCartDiscount()', `${data}`).then(() => {
        console.log(`api.cart.applyCartDiscount successful with ${data}%`);
        api.toast.show(`api.cart.applyCartDiscount successful with ${data}%`);
        api.navigation.dismiss();
      }).catch((e) => {
        console.log(`api.cart.applyCartDiscount error: ${JSON.stringify(e)}`);
        api.toast.show(`api.cart.applyCartDiscount error: ${JSON.stringify(e)}`);
      });*/

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
