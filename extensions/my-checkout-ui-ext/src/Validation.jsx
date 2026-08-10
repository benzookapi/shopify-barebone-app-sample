// Checkout UI sample
// Read https://shopify.dev/docs/api/checkout-ui-extensions
// Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// Read https://shopify.dev/docs/apps/checkout/product-offers
// Read https://shopify.dev/docs/api/checkout-ui-extensions/components

import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Validation />, document.body);
};

/*
* --------- Validation component for static render ---------
* (Static extension point)
* Read https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Validation() {
  const extensionApi = shopify;
  console.log(`my-checkout-ui-ext (Validation): extensionApi target ${extensionApi.extension.target}`);

  const [ip, setIp] = useState('');
  const [ipBlocked, setIpBlocked] = useState(false);

  const [text, setText] = useState('');
  const [textBlocked, setTextBlocked] = useState(false);

  const [quantity, setQuantity] = useState('');
  const [quantityReset, setQuantityReset] = useState(false);

  const block_ip = extensionApi.settings.value.validation_ip;
  console.log(`block_ip: ${block_ip}`);

  const block_text = extensionApi.settings.value.validation_text;
  console.log(`block_text: ${block_text}`);

  const reset_quantity = extensionApi.settings.value.validation_quantity;
  console.log(`reset_quantity: ${reset_quantity}`);

  useEffect(() => {
    // The callback is invoked by the platform when the buyer tries to navigate.
    const interceptPromise = extensionApi.buyerJourney.intercept(({canBlockProgress}) => {
      if (canBlockProgress && (ipBlocked || textBlocked)) {
        const message = ipBlocked
          ? `Your IP address ${ip} was blocked and you cannot proceed the checkout.`
          : `Checkout is blocked due to: ${text}`;
        return {
          behavior: 'block',
          reason: 'InvalidExtensionState',
          errors: [{message}],
        };
      }
      return {behavior: 'allow'};
    });

    return () => {
      interceptPromise.then((stopIntercepting) => stopIntercepting());
    };
  }, [ip, ipBlocked, text, textBlocked]);

  useEffect(() => {
    console.log(`Checking IP blocking...`);
    fetch('https://api.ipify.org?format=json', {method: 'GET'})
      .then((response) => response.json())
      .then((json) => {
        setIp(json.ip);
        setIpBlocked(Boolean(block_ip && json.ip === block_ip));
      })
      .catch((error) => console.log(`Checking IP blocking failed: ${error}`));
  }, [block_ip]);

  useEffect(() => {
    console.log(`Checking text blocking...`);
    const value = block_text == null ? '' : String(block_text);
    setText(value);
    setTextBlocked(block_text != null);
  }, [block_text]);

  useEffect(() => {
    console.log(`Checking quantity reset...`);
    if (reset_quantity == null || reset_quantity === '') {
      setQuantity('');
      setQuantityReset(false);
      return;
    }

    const value = String(reset_quantity);
    setQuantity(value);
    const lines = extensionApi.lines.value;
    const size = lines.reduce((total, line) => total + line.quantity, 0);
    if (size <= parseInt(value, 10)) {
      setQuantityReset(false);
      return;
    }

    lines.forEach((line) => {
      extensionApi.applyCartLinesChange({
        type: 'removeCartLine',
        id: line.id,
        quantity: line.quantity,
      }).then((result) => {
        console.log(`removeCartLine: ${JSON.stringify(result)}`);
      }).catch((error) => {
        console.log(`removeCartLine error: ${error}`);
      });
    });
    setQuantityReset(true);
  }, [reset_quantity]);

  // Swtich the message on the check result with the IP address
  function IpBlockInfo(props = {blocked: false}) {
    if (props.blocked) {
      return (
        <s-text tone="critical">
          Your IP address: <s-text type="emphasis">{ip}</s-text> was blocked and you cannot proceed the checkout. &#128561;
        </s-text>
      );
    }
    return (
      <s-text tone="success">
        Your IP address: <s-text type="emphasis">{ip}</s-text> was not blocked. &#128077;
      </s-text>
    );
  }

  // Swtich the message on the check result with the text
  function TextBlockInfo(props = {blocked: false}) {
    if (props.blocked) {
      return (
        <s-text tone="critical">
          You cannot proceed the checkout with the given message: <s-text type="emphasis">{text}</s-text> &#9940;
        </s-text>
      );
    }
    return <s-text tone="success">You are not blocked without any message. &#128077;</s-text>;
  }

  // Swtich the message on the check result with the quantity
  function QuantityResetInfo(props = {reset: false}) {
    if (props.reset) {
      return (
        <s-text tone="critical">
          Your cart was reset with a larger quantity than: <s-text type="emphasis">{quantity}</s-text> &#10060;
        </s-text>
      );
    }
    if (quantity === '') {
      return <s-text tone="success">Your cart was not reset without any quantity limit. &#128077;</s-text>;
    }
    return (
      <s-text tone="success">
        Your cart was not reset with a quantity equal to or under: <s-text type="emphasis">{quantity}</s-text> &#128077;
      </s-text>
    );
  }

  return (
    <s-banner heading={`${extensionApi.extension.target} <Validation />`} tone="critical">
      <s-unordered-list>
        <s-list-item><IpBlockInfo blocked={ipBlocked} /></s-list-item>
        <s-list-item><TextBlockInfo blocked={textBlocked} /></s-list-item>
        <s-list-item><QuantityResetInfo reset={quantityReset} /></s-list-item>
      </s-unordered-list>
    </s-banner>
  );
}
