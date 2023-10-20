// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React, { useState, useEffect } from 'react';
import {
  // Extension API
  reactExtension,

  // React hooks
  useApi, 

  // UI components
  Banner,
  Text,
  List,
  ListItem
  //CalloutBanner, available only for post-purchase extensions.
  //Layout, available only for post-purchase extensions.
  //TextContainer, available only for post-purchase extensions.
} from '@shopify/ui-extensions-react/checkout';

reactExtension('purchase.checkout.contact.render-after', () => <Validation />);

/* 
* --------- Validation component for static render --------- 
* (Static extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Validation() {
  const extensionApi = useApi();
  //console.log(`my-checkout-ui-ext (Validation): extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [ip, setIp] = useState('');
  const [ipBlocked, setIpBlocked] = useState(false);

  const [text, setText] = useState('');
  const [textBlocked, setTextBlocked] = useState(false);

  const [quantity, setQuantity] = useState('');
  const [quantityReset, setQuantityReset] = useState(false);

  // Get the IP address to block from the extension settings.
  const block_ip = extensionApi.settings.current.validation_ip;
  console.log(`block_ip: ${block_ip}`);
  useEffect(() => {
    console.log(`Checking IP blocking...`);
    // Check if the current global JP is the specified one or not.
    fetch('https://api.ipify.org?format=json', {
      method: "GET"
    }).then((res) => {
      res.json().then((json) => {
        setIp(json.ip);
        if (json.ip === block_ip) {
          // Block the checkout progress.
          extensionApi.buyerJourney.intercept({
            canBlockProgress: false
          }).then((r) => {
            console.log(`intercept (block_ip): ${r}`);
            setIpBlocked(true);
          });
        }
      });
    });
  }, ['']);


  // Get the text to block from the extension settings.
  const block_text = extensionApi.settings.current.validation_text;
  console.log(`block_text: ${block_text}`);
  useEffect(() => {
    console.log(`Checking text blocking...`);
    if (block_text != null) {
      setText(block_text);
      extensionApi.buyerJourney.intercept({
        canBlockProgress: false
      }).then((r) => {
        console.log(`intercept (block_text): ${r}`);
        setTextBlocked(true);
      });
    }
  }, ['']);

  // Get the quantity to reset the cart from the extension settings.
  const reset_quantity = extensionApi.settings.current.validation_quantity;
  console.log(`reset_quantity: ${reset_quantity}`);
  useEffect(() => {
    console.log(`Checking quantity reset...`);
    if (reset_quantity != null) {
      setQuantity(reset_quantity);
      const size = extensionApi.lines.current.reduce((total, l) => {
        return total + l.quantity;
      }, 0);
      if (size > parseInt(reset_quantity)) {
        extensionApi.lines.current.map((l) => {
          extensionApi.applyCartLinesChange({
            type: "removeCartLine",
            id: l.id,
            quantity: l.quantity
          }).then((r) => {
            console.log(`removeCartLine: ${JSON.stringify(r)}`);
          }).catch((e) => {
            console.log(`removeCartLine error: ${e}`);
          });
        });
        setQuantityReset(true);
      }
    }
  }, ['']);

  // Swtich the message on the check result with the IP address
  const IpBlockInfo = function (props) {
    if (props.blocked) {
      return (
        <Text appearance="critical" size="medium">
          Your IP address: <Text emphasis="italic">{ip}</Text> was blocked and you cannot proceed the checkout. &#128561;
        </Text>
      );
    }
    return (
      <Text appearance="success" size="medium">
        Your IP address: <Text emphasis="italic">{ip}</Text> was not blocked. &#128077;
      </Text>
    );
  };

  // Swtich the message on the check result with the text
  const TextBlockInfo = function (props) {
    if (props.blocked) {
      return (
        <Text appearance="critical" size="medium">
          You cannot proceed the checkout with the given message: <Text emphasis="italic">{text}</Text> &#9940;
        </Text>
      );
    }
    return (
      <Text appearance="success" size="medium">
        You are not blocked without any message. &#128077;
      </Text>
    );
  };

  // Swtich the message on the check result with the quantity
  const QuantityResetInfo = function (props) {
    if (props.reset) {
      return (
        <Text appearance="critical" size="medium">
          Your cart was reset with a larger quantity than: <Text emphasis="italic">{quantity}</Text> &#10060;
        </Text>
      );
    }
    if (quantity == '') {
      return (
        <Text appearance="success" size="medium">
          Your cart was not reset without any quantity limit. &#128077;
        </Text>
      );
    }
    return (
      <Text appearance="success" size="medium">
        Your cart was not reset with a quantity equal to or under: <Text emphasis="italic">{quantity}</Text> &#128077;
      </Text>
    );
  };

  return (
    <Banner title={`${extensionApi.extensionPoint} <Validation />`} status='critical'>
      <List>
        <ListItem>
          <IpBlockInfo blocked={ipBlocked} />
        </ListItem>
        <ListItem>
          <TextBlockInfo blocked={textBlocked} />
        </ListItem>
        <ListItem>
          <QuantityResetInfo reset={quantityReset} />
        </ListItem>
      </List>
    </Banner>
  );

}

