// Checkout UI sample
// See https://shopify.dev/docs/api/checkout-ui-extensions
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers
// See https://shopify.dev/docs/api/checkout-ui-extensions/components

import React from 'react';
import {
  // Extension API
  render,

  // React hooks
  useExtensionApi, // All properties and methods are accessible from this 'StandardApi'
  //useAppMetafields,  // shopify.ui.extension.toml
  //useAttributes,
  //useBuyerJourney,
  //useSettings,
  //useCurrency,
  //useCustomer, // Protected customer data
  //useEmail, // Protected customer data  
  //useExtensionData, // Metadata about the extension.
  //useExtensionLanguage, // Buyer's language, as supported by the extension
  //useCartLines,
  //useLanguage,
  //useMetafields,
  //useNote,
  //useShippingAddress, // Protected customer data
  //useShop,
  //useStorage,
  //useTimezone,
  //useTranslate,
  //useDiscountCodes,
  //useSessionToken,

  // UI components
  BlockStack,
  Banner
} from '@shopify/checkout-ui-extensions-react';

render('Checkout::Dynamic::Render', () => <Upsell />);
render('Checkout::DeliveryAddress::RenderBefore', () => <Validation />);
render('Checkout::Actions::RenderBefore', () => <Review />);

function Upsell() {
  // See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api#react-hooks
  const extensionApi = useExtensionApi();
  // All sub hook data as follows are accesible through extensionApi.  
  //const appMetafields = useAppMetafields();
  //const attributes = useAttributes();
  //const buyerJourney = useBuyerJourney();
  //const settings = useSettings();
  //const currency = useCurrency();
  //const customer = useCustomer();
  //const email = useEmail();  
  //const extensionData = useExtensionData();
  //const extensionLanguage = useExtensionLanguage();
  //const cartLines = useCartLines();
  //const language = useLanguage();
  //const metafields = useMetafields();
  //const note = useNote();
  //const shippingAddress = useShippingAddress();
  //const shop = useShop();
  //const storage = useStorage();
  //const timezone = useTimezone();
  //const translate = useTranslate();
  //const discountCodes = useDiscountCodes();
  //const sessionToken = useSessionToken();

  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);
  //console.log(`my-checkout-ui-ext: appMetafields ${JSON.stringify(appMetafields, null, 4)}`);
  //console.log(`my-checkout-ui-ext: attributes ${JSON.stringify(attributes, null, 4)}`);
  //console.log(`my-checkout-ui-ext: buyerJourney ${JSON.stringify(buyerJourney, null, 4)}`);
  //console.log(`my-checkout-ui-ext: settings ${JSON.stringify(settings, null, 4)}`);
  //console.log(`my-checkout-ui-ext: currency ${JSON.stringify(currency, null, 4)}`);
  //console.log(`my-checkout-ui-ext: customer ${JSON.stringify(customer, null, 4)}`);
  //console.log(`my-checkout-ui-ext: email ${JSON.stringify(email, null, 4)}`);  
  //console.log(`my-checkout-ui-ext: extensionData ${JSON.stringify(extensionData, null, 4)}`);
  //console.log(`my-checkout-ui-ext: extensionLanguage ${JSON.stringify(extensionLanguage, null, 4)}`);
  //console.log(`my-checkout-ui-ext: cartLines ${JSON.stringify(cartLines, null, 4)}`);
  //console.log(`my-checkout-ui-ext: language ${JSON.stringify(language, null, 4)}`);
  //console.log(`my-checkout-ui-ext: metafields ${JSON.stringify(metafields, null, 4)}`);
  //console.log(`my-checkout-ui-ext: note ${JSON.stringify(note, null, 4)}`);
  //console.log(`my-checkout-ui-ext: shippingAddress ${JSON.stringify(shippingAddress, null, 4)}`);
  //console.log(`my-checkout-ui-ext: shop ${JSON.stringify(shop, null, 4)}`);
  //console.log(`my-checkout-ui-ext: storage ${JSON.stringify(storage, null, 4)}`);
  //console.log(`my-checkout-ui-ext: timezone ${JSON.stringify(timezone, null, 4)}`);
  //console.log(`my-checkout-ui-ext: discountCodes ${JSON.stringify(discountCodes, null, 4)}`);
  //console.log(`my-checkout-ui-ext: sessionToken ${JSON.stringify(sessionToken, null, 4)}`);

  //const apiVersion = 'unstable'; // This cannot be set by environmental variables during the build.
  const apiVersion = extensionApi.extension.apiVersion;
  const apiQuery = {
    query: `query ($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          variants(first: 1) {
            nodes {
              id
              title
            }
          }
        }
      }
    }`,
    variables: {
      first: 1
    }
  };
  // This produces the error "Access denied for customerCreate field. Required access: `unauthenticated_write_customers` access scope."
  // Adding `unauthenticated_write_customers` to the app OAuth itself doesn't work.
  /*const apiMutation = {
    query: `mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }`,
    variables: {
      "input": {
        "acceptsMarketing": true,
        "email": `barebone-checkout-ext-${new Date()}@example.com`,
        "firstName": `barebone-checkout-ext-${new Date()} first name`,
        "lastName": `barebone-checkout-ext-${new Date()} last name`,
        "password": `testtest`,
        "phone": `0312345678`
      }
    }
  };*/
  const apiMutation = {
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
    variables: {
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
        "lines": [
          {
            "attributes": [
              {
                "key": "barebone_app_checkout-ext_storefront_api_lines",
                "value": `${new Date().toISOString()}`
              }
            ],
            "merchandiseId": "",
            "quantity": 1
            /*"sellingPlanId": ""*/
          }
        ],
        "note": `barebone_app_checkout-ext_storefront_api_note ${new Date().toISOString()}`
      }
    }

  };
  const apiUrl = `${extensionApi.shop.storefrontUrl}api/${apiVersion}/graphql.json`;
  console.log(`Accessing ${apiUrl}...`);
  console.log(`Storefront API [query] ${JSON.stringify(apiQuery, null, 4)}`);
  // Storefront API query
  fetch(apiUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiQuery)
  }).then((res) => {
    res.json().then((data, errors) => {
      console.log(`Storefront API [query] data: ${JSON.stringify(data, null, 4)}`);
      console.log(`Storefront API [query] errors: ${JSON.stringify(errors, null, 4)}`);

      apiMutation.variables.input.lines[0].merchandiseId = data.data.products.nodes[0].variants.nodes[0].id;
      console.log(`Storefront API [mutation] ${JSON.stringify(apiMutation, null, 4)}`);
      // Storefront API mutation
      fetch(apiUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiMutation)
      }).then((res) => {
        res.json().then((data, errors) => {
          console.log(`Storefront API [mutation] data: ${JSON.stringify(data, null, 4)}`);
          console.log(`Storefront API [mutation] errors: ${JSON.stringify(errors, null, 4)}`);
        });
      });

    });
  });


  return (

    <Banner title="Checkout::Dynamic::Render <Upsell />" status='info'>

    </Banner>

  );
}

function Validation() {
  const extensionApi = useExtensionApi();
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);



  return (

    <Banner title="Checkout::DeliveryAddress::RenderBefore <Validation />" status='critical'>

    </Banner>

  );

}

function Review() {
  const extensionApi = useExtensionApi();
  console.log(`my-checkout-ui-ext: extensionApi ${JSON.stringify(extensionApi, null, 4)}`);

  return (

    <Banner title="Checkout::Actions::RenderBefore' <Review />" status='success'>

    </Banner>

  );

}

