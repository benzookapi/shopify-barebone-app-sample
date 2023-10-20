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
  useAppMetafields,

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
  //CalloutBanner, available only for post-purchase extensions.
  //Layout, available only for post-purchase extensions.
  //TextContainer, available only for post-purchase extensions.
} from '@shopify/ui-extensions-react/checkout';

reactExtension('purchase.checkout.block.render', () => <Upsell />);

/* 
* --------- Upsell component for dynamic render --------- 
* (Dynamitc extension point)
* See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-overview#dynamic-extension-points
*/
function Upsell() {
  const extensionApi = useApi();
  //console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  const [upsellProducts, setUpsellProducts] = useState([]);
  const [upsellAdded, setUpsellAdded] = useState(false);
  const [upsellUrl, setUpsellUrl] = useState('');

  const apiVersion = extensionApi.extension.apiVersion;
  const apiUrl = `https://${extensionApi.shop.myshopifyDomain}/api/${apiVersion}/graphql.json`;

  // Get the filtered metafield values defined by the toml file.
  // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/metafields#useAppMetafields
  /* ==========================================================================================================
  *  NOTE THAT `useAppMetafields` (and other subscribed data) doesn't return the instances at the first rendering 
  *  so this area's code outside useEffect() are called many times asynchronously until 
  *  they get the data (check the browser console to track it).
  *  You have to implement your code not depending on how many times they get called = be "idempotent".
  * ===========================================================================================================
  */
  const urlMeta = useAppMetafields({ "namespace": "barebone_app", "key": "url" });
  console.log(`urlMeta ${JSON.stringify(urlMeta)}`);
  const upsellMeta = useAppMetafields({ "namespace": "barebone_app_upsell", "key": "product_id" });
  console.log(`upsellMeta ${JSON.stringify(upsellMeta)}`);
  // The app server URL
  const app_url = urlMeta.map((m) => { return m.metafield.value; }).join('');
  console.log(`app_url ${app_url}`);
  // The upsell product ids.
  const upsell_product_ids = upsellMeta.map((m) => {
    return m.metafield.value;
  });
  console.log(`upsell_product_ids ${upsell_product_ids}`);

  useEffect(() => {
    // useAppMetafields return empty at the first rendering or some later, and in those cases, 
    // do nothing to avoid unexpected errors. 
    if (app_url === '' || upsell_product_ids.length == 0) return;

    // Getting the upsell product info in a secure way of passing shop data with SessionToken.
    // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/apis/standardapi
    extensionApi.sessionToken.get().then((token) => {
      // Retriveing upsell product data to render in the components below from the server side Admin API call.
      const url = `${app_url}/postpurchase?upsell_product_ids=${JSON.stringify(upsell_product_ids)}`;
      console.log(`Getting upsell product data from... ${url}`);
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

    // Testing the app proxy access.
    // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/configuration#network-access
    // Note that dev. store app proxies are protected with their passwords which means this fetch always fails.
    const appProxy = `https://${extensionApi.shop.myshopifyDomain}/apps/bareboneproxy`;
    console.log(`Accessing the app proxy ${appProxy}...`);
    fetch(appProxy, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ "Checkout UI Extension WebWorker": JSON.stringify(this) })
    }).then((res) => {
      res.json().then((data, errors) => {
        if (typeof errors !== 'undefined') {
          console.log(`The app proxy POST failed with the error: ${errors}`);
        } else {
          console.log(`Response from the app proxy POST: ${JSON.stringify(data, null, 4)}`);
        }
      }).catch((e) => {
        console.log(`The app proxy fetch() -> json() failed with the error: ${e}`);
      });
    }).catch((e) => {
      console.log(`The app proxy fetch() failed with the error: ${e}`);
    });

  }, [app_url]);

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



