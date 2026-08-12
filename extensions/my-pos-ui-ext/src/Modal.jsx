import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

const SmartGridModal = () => {
  const [data, setData] = useState(
    shopify.scanner.scannerData.current.value.data || '',
  );
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    const unsubscribe = shopify.scanner.scannerData.current.subscribe((result) => {
      const scannedData = result.data || '';
      setData(scannedData);
      if (!scannedData) return;

      console.log(`Scanner data changed: ${scannedData}`);

      // Call app server side to use Admin API with session token.
      // https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/standard-apis/session-api

      // or add a customer to the current cart with customer id given by barcode or QR to check their online orders, etc.
      // https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/platform-apis/cart-api
      shopify.cart.setCustomer({
        id: Number(scannedData),
      }).then(() => {
        console.log(`shopify.cart.setCustomer successful with customer id: ${scannedData}`);
        shopify.toast.show(`shopify.cart.setCustomer successful with customer id: ${scannedData}`);
        shopify.scanner.hideCameraScanner();
        setCustomerId(scannedData);
      }).catch((e) => {
        console.log(`shopify.cart.setCustomer error: ${JSON.stringify(e)}`);
        shopify.toast.show(`shopify.cart.setCustomer error: ${JSON.stringify(e)}`);
      });

      // or apply a discount code
      // https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/platform-apis/cart-api
      /*shopify.cart.applyCartDiscount('Percentage', 'shopify.cart.applyCartDiscount()', scannedData).then(() => {
        console.log(`shopify.cart.applyCartDiscount successful with ${scannedData}%`);
        shopify.toast.show(`shopify.cart.applyCartDiscount successful with ${scannedData}%`);
        window.close();
      }).catch((e) => {
        console.log(`shopify.cart.applyCartDiscount error: ${JSON.stringify(e)}`);
        shopify.toast.show(`shopify.cart.applyCartDiscount error: ${JSON.stringify(e)}`);
      });*/
    });

    shopify.scanner.showCameraScanner();

    return () => {
      unsubscribe();
      shopify.scanner.hideCameraScanner();
    };
  }, []);

  return (
    <s-page heading="Camera Scanner Title">
      <s-scroll-box padding="base">
        <s-stack gap="base">
          {customerId ? (
            <s-stack gap="base">
              <s-text>{`Customer ${customerId} was added to the cart.`}</s-text>
              <s-button variant="primary" onClick={() => window.close()}>
                Return to cart
              </s-button>
            </s-stack>
          ) : (
            <>
              <s-button onClick={() => shopify.scanner.showCameraScanner()}>
                Open camera scanner
              </s-button>
              <s-text>{`Scanned data: ${data}`}</s-text>
            </>
          )}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
};

export default async () => {
  render(<SmartGridModal />, document.body);
};
