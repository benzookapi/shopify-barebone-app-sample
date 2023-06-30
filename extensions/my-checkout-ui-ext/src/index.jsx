// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React, { useState, useEffect } from 'react';
import {
  // Extension API
  render,

  // React hooks
  useExtensionApi, // All properties and methods are accessible from this 'StandardApi'
  //useAppMetafields,  // Protected customer data, filtered by shopify.ui.extension.toml
  //useCustomer, // Protected customer data
  //useEmail, // Protected customer data  
  //useExtensionData, // Metadata about the extension.
  //useExtensionLanguage, // Buyer's language, as supported by the extension
  //useShippingAddress, // Protected customer data
  useSubscription, // https://shopify.dev/docs/api/checkout-ui-extensions/unstable/react-hooks/utilities/usesubscription

  // UI components
  View,
  BlockStack,
  InlineStack,
  Banner,
  Heading,
  TextBlock,
  Text,
  Button,
  Image,
  Style,
  Divider,
  List,
  ListItem,
  BlockSpacer,
  Link,
  Icon,
  ChoiceList,
  Choice
  //CalloutBanner, available only for post-purchase extensions.
  //Layout, available only for post-purchase extensions.
  //TextContainer, available only for post-purchase extensions.
} from '@shopify/checkout-ui-extensions-react';

render('Checkout::Dynamic::Render', () => <Upsell />);
render('Checkout::Contact::RenderAfter', () => <Validation />);
render('Checkout::Actions::RenderBefore', () => <Review />);

/* 
* --------- Upsell component for dynamic render --------- 
* (Dynamitc extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#dynamic-extension-points
*/
function Upsell() {
  const extensionApi = useExtensionApi();
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [upsellProducts, setUpsellProducts] = useState([]);
  const [upsellAdded, setUpsellAdded] = useState(false);
  const [upsellUrl, setUpsellUrl] = useState('');

  //const apiVersion = 'unstable'; // This cannot be set by environmental variables during the build.
  const apiVersion = extensionApi.extension.apiVersion;
  const apiUrl = `${extensionApi.shop.storefrontUrl}api/${apiVersion}/graphql.json`;

  useEffect(() => {
    let appMetas = null;
    let count = 0;
    // appMetafields.current is blank in the first loading, with data in the second, so you need to sbscrube it.
    extensionApi.appMetafields.subscribe((d) => {
      count = count + 1;
      console.log(`appMetafields.subscribed count: ${count}`);
      // Proceed only when the data is given.
      if (d.length == 0) return;

      // Prevent duplicated calls.
      if (appMetas != null) return;
      appMetas = d;
      console.log(`appMetas: ${JSON.stringify(appMetas, null, 4)}`);

      // Get the filtered metafield values defined by the toml file.
      // See https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-appmetafields
      // The app server URL
      const app_url = appMetas.filter((m) => {
        return (m.target.type === 'shop' && m.metafield.key === 'url');
      }).map((m) => { return m.metafield.value })[0];

      // The upsell product ids.
      const upsell_product_ids = appMetas.filter((m) => {
        return (m.target.type === 'product' && m.metafield.key === 'product_id');
      }).map((m) => { return m.metafield.value });
      if (upsell_product_ids.length == 0) upsell_product_ids.push('0');

      // Getting the upsell product info in a secure way of passing shop data with SessionToken.
      extensionApi.sessionToken.get().then((token) => {
        // Retriveing upsell product data to render in the components below from the server side Admin API call.
        const url = `${app_url}/postpurchase?upsell_product_ids=${JSON.stringify(upsell_product_ids)}&token=${token}`;
        console.log(`Getting upsell product data from... ${url}`);
        fetch(url, {
          method: "POST"
        }).then((res) => {
          res.json().then((data, errors) => {
            console.log(`upsell product data: ${JSON.stringify(data, null, 4)}`);
            if (typeof errors !== 'undefined') {
              console.log(`upsell product errors: ${JSON.stringify(errors, null, 4)}`);
              return;
            }
            // Setting upsell products data to render.
            setUpsellProducts(data.products.edges);

            // Calling Storefront API mutation for creating a new checkout to use in the link below.
            // Note that all mutations are not supported and unsupported one like 'customerCreate' produces the error "Access denied for customerCreate field. Required access: `unauthenticated_write_customers` access scope."
            // Adding `unauthenticated_write_customers` to the app OAuth itself doesn't work.
            // See https://shopify.dev/docs/api/checkout-ui-extensions/configuration#api-access
            const query = {
              query: `mutation cartCreate($input: CartInput!) {
                        cartCreate(input: $input) {
                         cart {
                           id
                           checkoutUrl
                           totalQuantity
                        }
                        userErrors {
                          code
                          field
                          message
                        }
                     }
               }`,
              variables: {}
            };
            const variables = {
              "input": {
                "attributes": [
                  {
                    "key": "barebone_app_checkout-ext_storefront_api_cart",
                    "value": `${new Date().toISOString()}`
                  }
                ],
                "buyerIdentity": {
                  "countryCode": "JP",
                  //"customerAccessToken": "",
                  "deliveryAddressPreferences": [
                    {
                      "deliveryAddress": {
                        "address1": "barebone app address 1 ",
                        "address2": `address 2 ${new Date().toISOString()}`,
                        "city": "Shibuya-ku",
                        "company": "Shopify Japan K.K",
                        "country": "JP",
                        "firstName": "Barebone app first name",
                        "lastName": "Barebone app last name",
                        "phone": "0312345678",
                        "province": "Tokyo",
                        "zip": "1500001"
                      }
                    }
                  ],
                  "email": "barebone.app@example.com",
                  "phone": "+819012345678"
                },
                /*"discountCodes": [
                  ""
                ],*/
                "lines": [],
                "note": `barebone_app_checkout-ext_storefront_api_note ${new Date().toISOString()}`
              }
            };
            const lines = data.products.edges.map((product) => {
              return {
                "attributes": [
                  {
                    "key": "barebone_app_checkout-ext_storefront_api_lines",
                    "value": `${new Date().toISOString()}`
                  }
                ],
                "merchandiseId": product.node.variants.edges[0].node.id,
                "quantity": 1
                /*"sellingPlanId": ""*/
              };
            });
            variables.input.lines = lines;
            query.variables = variables;
            console.log(`Storefront API query: ${JSON.stringify(query, null, 4)}`);
            console.log(`Accessing ${apiUrl}...`);
            fetch(apiUrl, {
              method: "POST",
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(query)
            }).then((res) => {
              res.json().then((data, errors) => {
                console.log(`Storefront API data: ${JSON.stringify(data, null, 4)}`);
                if (typeof errors !== 'undefined') {
                  console.log(`Storefront API errors: ${JSON.stringify(errors, null, 4)}`);
                  return;
                }
                // Setting the new checkout URL to open in another window.
                setUpsellUrl(data.data.cartCreate.cart.checkoutUrl);
              });
            });

          });
        });
      });
    });
  }, [apiUrl]);

  // Render the component for upsell products
  const UpsellProducts = function (props) {
    return (
      <InlineStack>
        {
          props.upsell_products.map((product) => {
            const url = product.node.featuredImage != null ? product.node.featuredImage.url : "";
            return (
              <View border={["none"]} padding={["tight"]}
                maxInlineSize={150}
              >
                <Image description="product photo" source={url} />
                <View border={["none"]} padding={["base"]}>
                  <Heading inlineAlignment="center">{product.node.title}</Heading>
                  <TextBlock size="medium" inlineAlignment="center">
                    {product.node.variants.edges[0].node.price} {product.node.priceRangeV2.maxVariantPrice.currencyCode}
                  </TextBlock>
                </View>
              </View>
            );
          })
        }
      </InlineStack>
    );
  };

  // Switch the adding button rendering based on actions.
  const UpsellActions = function (props) {
    // Add a product to the current cart.
    // Using a recursive function for calling async apply methods sequentially for preventing errors.
    const addProducts = (i) => {
      const product = props.upsell_products[i];
      console.log(`Adding an upsell... ${product.node.title}`);
      extensionApi.applyCartLinesChange({
        type: "addCartLine",
        merchandiseId: product.node.variants.edges[0].node.id,
        quantity: 1,
        attributes: [
          {
            key: 'barebone_app_upsell',
            value: `${new Date().toISOString()}`
          }
        ]
      }).then((r) => {
        console.log(`applyCartLinesChange Sucess: ${JSON.stringify(r)} ${product.node.title}`);
        // Add nothers
        if (i + 1 < props.upsell_products.length) return addProducts(i + 1);

        if (r.type !== 'success') return;

        setUpsellAdded(true);

        // Setting the attributes.
        extensionApi.applyAttributeChange({
          type: 'updateAttribute',
          key: 'barebone_app_upsell_last_added',
          value: `${product.node.title}`
        }).then((r) => {
          console.log(`applyAttributeChange result: ${JSON.stringify(r)}`);
        }).catch((e) => {
          console.log(`applyAttributeChange err: ${JSON.stringify(e)}`);
        });

        // Setting the note.
        extensionApi.applyNoteChange({
          type: 'updateNote',
          note: `The last added item for your offer:  ${product.node.title}`
        }).then((r) => {
          console.log(`applyNoteChange result: ${JSON.stringify(r)}`);
        }).catch((e) => {
          console.log(`applyNoteChange err: ${JSON.stringify(e)}`);
        });

      }).catch((e) => {
        console.log(`applyCartLinesChange Error: ${JSON.stringify(e)} ${product.node.title}`);
      });
    };

    if (props.upsell_products.length == 0) {
      // No products to upsell
      return (
        <Text appearance="info" size="medium">
          Please choose products with upsell ids in metafields to get offers for you. &#128521;
        </Text>
      );
    } else {
      if (props.upsell_added) {
        // Already products added
        return (
          <Text appearance="success" size="medium">
            Thank you for your accepting our offer! &#10084;
          </Text>
        );
      } else {
        // Render the button to add products.
        return (
          <Button onPress={() => {
            // Adding upsell products with my wrapped recursive function.
            addProducts(0);
          }} >
            Love it! I buy now &#127881;
          </Button>
        );
      }
    }
  };

  return (
    <Banner title={`${extensionApi.extensionPoint} <Upsell />`} status='info'>
      {/* This custom cart lines are visible in mobile pages only switched by viewports */}
      <BlockStack overflow="hidden"
        maxBlockSize={Style.default(0)
          .when({ viewportInlineSize: { min: 'small' } }, 300)
          .when({ viewportInlineSize: { min: 'medium' } }, 0)
          .when({ viewportInlineSize: { min: 'large' } }, 0)}
      >
        <Text emphasis="bold" appearance="success" size="large">Your current cart: {extensionApi.cost.totalAmount.current.amount} {extensionApi.cost.totalAmount.current.currencyCode}</Text>
        <List>
          {
            extensionApi.lines.current.map((l) => {
              return (
                <ListItem>
                  <Text emphasis="italic">{l.merchandise.title} x {l.quantity}</Text> --- <Text emphasis="bold">{l.cost.totalAmount.amount} {l.cost.totalAmount.currencyCode}</Text>
                </ListItem>
              );
            })
          }
        </List>
        <Divider />
        <BlockSpacer spacing="loose" />
      </BlockStack>
      {/* Upsell callout */}
      <Text size="medium">
        We are offering products based on your chosen ones' metafields.
      </Text>
      {/* Upsell product list */}
      <UpsellProducts upsell_products={upsellProducts} />
      {/* Upsell actions */}
      <UpsellActions upsell_products={upsellProducts} upsell_added={upsellAdded} />
      {/* Upsell cloning using Storefront API mutation */}
      <BlockSpacer />
      <Link to={upsellUrl} external={true}>
        <Text>Create a new checkout <Icon source="cart" /></Text>
      </Link>
    </Banner>
  );
}

/* 
* --------- Validation component for static render --------- 
* (Static extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Validation() {
  const extensionApi = useExtensionApi();
  //console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

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

/* 
* --------- Review component for static render --------- 
* (Static extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#static-extension-points
*/
function Review() {
  const extensionApi = useExtensionApi();
  //console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [score, setScore] = useState('2');
  const [reviewSent, setReviewSent] = useState(false);

  // Store the given score into the browser storage to keep across the pages.
  // See https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-storage
  const writeScore = (value) => {
    extensionApi.storage.write('barebone_app_score', value);
  };
  const readScore = () => {
    extensionApi.storage.read('barebone_app_score').then((d) => {
      const s = d == null ? '2' : d;
      setScore(s);
    })
  };

  readScore();

  // Getting the app url from the shop metafield.
  useEffect(() => {
    let appMetas = null;
    let count = 0;
    // appMetafields.current is blank in the first loading, with data in the second, so you need to sbscrube it.
    extensionApi.appMetafields.subscribe((d) => {
      count = count + 1;
      console.log(`appMetafields.subscribed (Review) count: ${count}`);
      // Proceed only when the data is given.
      if (d.length == 0) return;

      // Prevent duplicated calls.
      if (appMetas != null) return;
      appMetas = d;
      console.log(`appMetas (Review): ${JSON.stringify(appMetas, null, 4)}`);

      // Get the filtered metafield values defined by the toml file.
      // See https://shopify.dev/docs/api/checkout-ui-extensions/apis/standardapi#properties-propertydetail-appmetafields
      // The app server URL
      const app_url = appMetas.filter((m) => {
        return (m.target.type === 'shop' && m.metafield.key === 'url');
      }).map((m) => { return m.metafield.value })[0];

      // Write the app url to the browser storage to use later.
      extensionApi.storage.write('barebone_app_url', app_url);

    });
  }, ['']);

  // Redner review sending button or thank you message afterwards.
  const ReviewActions = function (props) {
    if (reviewSent) {
      // Already review sent
      return (
        <Text appearance="success" size="medium">
          Thank you for your review! &#128591;
        </Text>
      );
    } else {
      // Render the button to send review.
      return (
        <Button kind="secondary" onPress={() => {
          // Setting the given score to the customer metafield in a secure way of passing shop data with SessionToken.
          extensionApi.sessionToken.get().then((token) => {
            // Updating the customer metafield with the server side Admin API call.            
            const customerId = extensionApi.buyerIdentity.email.current;
            console.log(`customerId ${customerId}`);
            // Get the stored app url from the browser storage.
            extensionApi.storage.read('barebone_app_url').then((app_url) => {
              const url = `${app_url}/postpurchase?customerId=${customerId}&score=${score}&token=${token}`;
              console.log(`Updaing the customer metafield with the given score in... ${url}`);
              fetch(url, {
                method: "POST"
              }).then((res) => {
                res.json().then((data, errors) => {
                  console.log(`review data: ${JSON.stringify(data, null, 4)}`);
                  if (typeof errors !== 'undefined') {
                    console.log(`review errors: ${JSON.stringify(errors, null, 4)}`);
                    return;
                  }
                  setReviewSent(true);
                });
              });
            });

          });
        }} >
          Give the score
        </Button>
      );
    }
  };

  return (
    <Banner title={`${extensionApi.extensionPoint} <Review />`} status='critical'>
      <Text size="medium" emphasis="italic">If you have time, could you give me a score for this checkout experience?</Text>
      <ChoiceList
        name="review"
        value={score}
        onChange={(value) => {
          console.log(`onChange event with value: ${value}`);
          setScore(value);
          writeScore(value);
        }}
      >
        <BlockStack>
          <Choice id="3">3 - Excellent</Choice>
          <Choice id="2">2 - Average</Choice>
          <Choice id="1">1 - Poor</Choice>
        </BlockStack>
      </ChoiceList>
      <BlockSpacer />
      {/* Switch the sending buttom and thank you massage */}
      <ReviewActions />
    </Banner>
  );

}

