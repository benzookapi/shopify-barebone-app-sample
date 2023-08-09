'use strict';

const Koa = require('koa');
const cors = require('@koa/cors');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const crypto = require('crypto');

const mongo = require('mongodb');
const { Client } = require('pg');
const mysql = require('mysql');

const jwt_decode = require('jwt-decode'); // For client side JWT with no signature validation
const jwt = require('jsonwebtoken'); // For server side JWT with app secret signature validation

const { v4: uuidv4 } = require('uuid'); // For JWT sign

const router = new Router();
const app = module.exports = new Koa();

app.use(cors()); // For Web Worker sandox access

app.use(bodyParser());

app.use(koaRequest({

}));

app.use(views(__dirname + '/views', {
  map: {
    html: 'underscore'
  }
}));

app.use(serve(__dirname + '/public'));

// Shopify API info.
const API_KEY = `${process.env.SHOPIFY_API_KEY}`;
const API_SECRET = `${process.env.SHOPIFY_API_SECRET}`;
const API_VERSION = `${process.env.SHOPIFY_API_VERSION}`;
const API_SCOPES = `${process.env.SHOPIFY_API_SCOPES}`;

const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_FORM = 'application/x-www-form-urlencoded';

const GRAPHQL_PATH_ADMIN = `admin/api/${API_VERSION}/graphql.json`;

const UNDEFINED = 'undefined';

// Admin path signature secret
const HMAC_SECRET = API_SECRET;

// Webhook signature secret
const WEBHOOK_SECRET = `${process.env.SHOPIFY_WEBHOOK_SECRET}`;

// DB type for data store
const DB_TYPE = `${process.env.SHOPIFY_DB_TYPE}`;

// Mongo Settings
const MONGO_URL = `${process.env.SHOPIFY_MONGO_URL}`;
const MONGO_DB_NAME = `${process.env.SHOPIFY_MONGO_DB_NAME}`;
const MONGO_COLLECTION = 'shops';

// PostgreSQL Settings
const POSTGRESQL_URL = `${process.env.SHOPIFY_POSTGRESQL_URL}`;
const POSTGRESQL_TABLE = 'shops';

// MySQL Settings
const MYSQL_HOST = `${process.env.SHOPIFY_MYSQL_HOST}`;
const MYSQL_USER = `${process.env.SHOPIFY_MYSQL_USER}`;
const MYSQL_PASSWORD = `${process.env.SHOPIFY_MYSQL_PASSWORD}`;
const MYSQL_DATABASE = `${process.env.SHOPIFY_MYSQL_DATABASE}`;
const MYSQL_TABLE = 'shops';

/* --- App top URL reigstered as the base one in the app settings in partner dashbord. --- */
// See https://shopify.dev/apps/auth/oauth/getting-started
// See https://shopify.dev/apps/best-practices/performance/admin
// See https://shopify.dev/apps/tools/app-bridge/updating-overview#ensure-compatibility-with-the-new-shopify-admin-domain
router.get('/', async (ctx, next) => {
  console.log("+++++++++++++++ / +++++++++++++++");
  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;

  let shop_data = null;
  let api_res = null;
  try {
    shop_data = await (getDB(shop));
    let install = false;
    if (shop_data == null) {
      console.log("No shop data");
      install = true;
    } else {
      try {
        api_res = await (callGraphql(ctx, shop, `{
        shop {
          name
        }
        app {
          handle
         }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      } catch (e) { }
      if (api_res == null || typeof api_res.data.shop.name === UNDEFINED) {
        console.log("The stored access token is invalid");
        install = true;
      }
    }
    if (install) {
      // See https://shopify.dev/apps/auth/oauth/getting-started
      const redirectUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${API_SCOPES}&redirect_uri=https://${ctx.request.host}/callback&state=&grant_options[]=`;
      //const redirectUrl = `https://${getAdminFromShop(shop)}/oauth/authorize?client_id=${API_KEY}&scope=${API_SCOPES}&redirect_uri=https://${ctx.request.host}/callback&state=&grant_options[]=`;
      console.log(`Redirecting to ${redirectUrl} for OAuth flow...`);
      ctx.redirect(redirectUrl);
      return;
    }
  } catch (e) {
    ctx.status = 500;
    return;
  }

  // See https://shopify.dev/apps/store/security/iframe-protection
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Callback URL redirected by Shopify after the authentication which needs to be registered as the while listed URL in the app settings in partner dashboard. --- */
// See https://shopify.dev/apps/auth/oauth/getting-started
router.get('/callback', async (ctx, next) => {
  console.log("+++++++++++++++ /callback +++++++++++++++");
  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  let req = {};
  req.client_id = API_KEY;
  req.client_secret = API_SECRET;
  req.code = ctx.request.query.code;

  const shop = ctx.request.query.shop;

  let res = null;
  try {
    // API endpoints including this access token one keep the myshopify.com domains.
    res = await (accessEndpoint(ctx, `https://${shop}/admin/oauth/access_token`, req, null, CONTENT_TYPE_FORM));
    if (typeof res.access_token === UNDEFINED) {
      ctx.status = 500;
      return;
    }
  } catch (e) {
    ctx.status = 500;
    return;
  }

  getDB(shop).then(function (shop_data) {
    if (shop_data == null) {
      insertDB(shop, res).then(function (r) { }).catch(function (e) { });
    } else {
      setDB(shop, res).then(function (r) { }).catch(function (e) { });
    }
  }).catch(function (e) {
    ctx.status = 500;
    return;
  });

  let api_res = null;
  try {
    api_res = await (callGraphql(ctx, shop, `{
        app {
          handle
         }
      }`, res.access_token, GRAPHQL_PATH_ADMIN, null));
  } catch (e) { }

  // See https://shopify.dev/apps/auth/oauth/update
  // Do server side redirection because this is NOT embedded ("embedded" parameter is not passed).
  // See https://shopify.dev/apps/tools/app-bridge/updating-overview#ensure-compatibility-with-the-new-shopify-admin-domain
  ctx.redirect(`https://${getAdminFromShop(shop)}/apps/${api_res.data.app.handle}`);

});

/* --- Session Token sample endpoint --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens
router.get('/sessiontoken', async (ctx, next) => {
  console.log("+++++++++++++++ /sessiontoken +++++++++++++++");
  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- authenticated fetch endpoint --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
router.get('/authenticated', async (ctx, next) => {
  console.log("+++++++++++++++ /authenticated +++++++++++++++");
  console.log(`request: ${JSON.stringify(ctx.request, null, 4)}`);

  // The token is the same as the client session token given by App Bridge in 'Authorization Bearer' for OAuth 2.0 Flow which encodes shop, app id, etc for YOUR OWN authorization.
  // See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
  // See https://www.rfc-editor.org/rfc/rfc6750
  const token = getTokenFromAuthHeader(ctx);

  ctx.set('Content-Type', 'application/json');

  ctx.body = {
    "request_url": ctx.request.url,
    "authentication_bearer": token,
    "result": {
      "signature_verified": false,
      "signature_generated": '',
      "shop_from_payload": '',
      "access_token": '',
      "message": ''
    }
  };

  // See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#verify-the-session-tokens-signature    
  const [verified, sig] = checkAuthFetchToken(token);
  ctx.body.result.signature_generated = sig;
  if (!verified) {
    ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
    ctx.status = 400;
    return;
  }
  ctx.body.result.signature_verified = true;

  // If the signature gets verified, we trust the token payload to get stored token for the given shop.
  // See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#optional-obtain-session-details-and-verify-the-session-token-manually
  const shop = getShopFromAuthToken(token);
  ctx.body.result.shop_from_payload = shop;

  let shop_data = null;
  try {
    shop_data = await (getDB(shop));
    if (shop_data == null) {
      ctx.body.result.message = "Authorization failed. No shop data";
      ctx.status = 400;
      return;
    }
  } catch (e) {
    ctx.body.result.message = "Internal error in retrieving shop data";
    ctx.status = 500;
    return;
  }

  // Return the stored access token for the given shop as my OAuth 2.0 flow suceess.
  ctx.body.result.access_token = shop_data.access_token;
  ctx.body.result.message = "Successfully authorized!";
  ctx.status = 200;

});

/* --- Admin Link sample endpoint --- */
// See https://shopify.dev/apps/app-extensions/getting-started#add-an-admin-link
router.get('/adminlink', async (ctx, next) => {
  console.log("+++++++++++++++ /adminlink +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  // If the app is set embedded in the app settings, "embedded" is set "1", otherwise "0" or undefined.
  // See. https://shopify.dev/apps/auth/oauth/getting-started#check-for-and-escape-the-iframe-embedded-apps-only
  if (isEmbedded(ctx)) {
    console.log('Embedded access');
    if (!checkSignature(ctx.request.query)) {
      ctx.status = 400;
      return;
    }
  } else {
    // Access by AppBride::authenticatedFetch
    if (typeof ctx.request.header.authorization !== UNDEFINED) {
      console.log('Authenticated fetch');
      const token = getTokenFromAuthHeader(ctx);

      if (!checkAuthFetchToken(token)[0]) {
        ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
        ctx.status = 400;
        return;
      }

      ctx.set('Content-Type', 'application/json');
      ctx.body = {
        "result": {
          "message": "",
          "response": {}
        }
      };

      const shop = getShopFromAuthToken(token);

      let shop_data = null;
      try {
        shop_data = await (getDB(shop));
        if (shop_data == null) {
          ctx.body.result.message = "Authorization failed. No shop data";
          ctx.status = 400;
          return;
        }
      } catch (e) {
        ctx.body.result.message = "Internal error in retrieving shop data";
        ctx.status = 500;
        return;
      }

      const id = ctx.request.query.id;

      // If an id is passed from the liked page like a product detail, retrieve its data by GraphQL.
      if (typeof id !== UNDEFINED) {
        let api_res = null;
        try {
          api_res = await (callGraphql(ctx, shop, `{
          product (id: "gid://shopify/Product/${id}") {
            id
            handle
            title
            onlineStoreUrl
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first:10) {
              edges{
                node {
                  id
                  title
                  price           
                }
              }
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
        } catch (e) {
          console.log(`${JSON.stringify(e)}`);
        }
        ctx.body.result.response = api_res;
      }
      ctx.status = 200;
      return;
    }
  }
  // If the access is not embedded or authenticated flow, 
  // this page gets redirtected to the embedded Shopify admin app page regardess embbedded or not by App Bridge force redirection config,
  // which is protected Shopify login if the access is by non logged in users or bot, etc. 
  // Check the code of 'frontennd/src/App.jsx', `forceRedirect: true`.
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Theme App Extension sample endpoint --- */
// See https://shopify.dev/apps/online-store/theme-app-extensions
router.get('/themeappextension', async (ctx, next) => {
  console.log("+++++++++++++++ /themeappextension +++++++++++++++");
  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Function Discount sample endpoint --- */
// See https://shopify.dev/apps/discounts
router.get('/functiondiscount', async (ctx, next) => {
  console.log("+++++++++++++++ /functiondiscount +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  // Access by AppBride::authenticatedFetch
  if (typeof ctx.request.header.authorization !== UNDEFINED) {
    console.log('Authenticated fetch');
    const token = getTokenFromAuthHeader(ctx);
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
      ctx.status = 400;
      return;
    }

    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      "result": {
        "message": "",
        "response": {}
      }
    };

    const shop = getShopFromAuthToken(token);
    let shop_data = null;
    try {
      shop_data = await (getDB(shop));
      if (shop_data == null) {
        ctx.body.result.message = "Authorization failed. No shop data";
        ctx.status = 400;
        return;
      }
    } catch (e) {
      ctx.body.result.message = "Internal error in retrieving shop data";
      ctx.status = 500;
      return;
    }

    const meta = ctx.request.query.meta;
    const id = ctx.request.query.id;

    const [namespace, key] = meta.split('.');

    let api_res = null;
    try {
      api_res = await (callGraphql(ctx, shop, `mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            appDiscountType {
              functionId
              targetType
            }
            discountClass
            discountId
            title
            startsAt
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "automaticAppDiscount": {
          "combinesWith": {
            "orderDiscounts": false,
            "productDiscounts": false,
            "shippingDiscounts": false
          },
          //"endsAt": "",
          "functionId": id,
          "metafields": [
            {
              "description": "Discount rate by customer metafields",
              //"id": "",
              // See https://shopify.dev/api/functions/input-query-variables
              // Setting this metafield enables no code input data filtering.
              "key": "customer_meta",
              "namespace": "barebone_app_function_discount",
              "type": "json",
              "value": JSON.stringify({
                "namespace": namespace,
                "key": key
              })
            }
          ],
          "startsAt": new Date().toISOString(),
          "title": `Barebone App Function Discount`
        }
      }));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    ctx.body.result.response = api_res;
    ctx.status = 200;
    return;
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Function Shipping method sample endpoint --- */
// See https://shopify.dev/apps/checkout/delivery-customizations
router.get('/functionshipping', async (ctx, next) => {
  console.log("+++++++++++++++ /functionshipping +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  // Access by AppBride::authenticatedFetch
  if (typeof ctx.request.header.authorization !== UNDEFINED) {
    console.log('Authenticated fetch');
    const token = getTokenFromAuthHeader(ctx);
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
      ctx.status = 400;
      return;
    }

    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      "result": {
        "message": "",
        "response": {}
      }
    };

    const shop = getShopFromAuthToken(token);
    let shop_data = null;
    try {
      shop_data = await (getDB(shop));
      if (shop_data == null) {
        ctx.body.result.message = "Authorization failed. No shop data";
        ctx.status = 400;
        return;
      }
    } catch (e) {
      ctx.body.result.message = "Internal error in retrieving shop data";
      ctx.status = 500;
      return;
    }

    const rate = ctx.request.query.rate;
    const zip = ctx.request.query.zip;
    const id = ctx.request.query.id;

    let api_res = null;
    try {
      api_res = await (callGraphql(ctx, shop, `mutation deliveryCustomizationCreate($deliveryCustomization: DeliveryCustomizationInput!) {
        deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
          deliveryCustomization {
            enabled
            id
            functionId
            title
            metafields (first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "deliveryCustomization": {
          "enabled": true,
          "functionId": id,
          "metafields": [
            {
              "description": "Shipping rate and zip code filter",
              //"id": "",
              "key": "filter",
              "namespace": "barebone_app_function_shipping",
              "type": "json",
              "value": JSON.stringify({
                "rate": rate,
                "zip": zip
              })
            }
          ],
          "title": "Barebone App Function Shipping"
        }
      }));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    ctx.body.result.response = api_res;
    ctx.status = 200;
    return;
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Function Payment method sample endpoint --- */
// See https://shopify.dev/apps/checkout/payment-customizations
router.get('/functionpayment', async (ctx, next) => {
  console.log("+++++++++++++++ /functionpayment +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  // Access by AppBride::authenticatedFetch
  if (typeof ctx.request.header.authorization !== UNDEFINED) {
    console.log('Authenticated fetch');
    const token = getTokenFromAuthHeader(ctx);
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
      ctx.status = 400;
      return;
    }

    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      "result": {
        "message": "",
        "response": {}
      }
    };

    const shop = getShopFromAuthToken(token);
    let shop_data = null;
    try {
      shop_data = await (getDB(shop));
      if (shop_data == null) {
        ctx.body.result.message = "Authorization failed. No shop data";
        ctx.status = 400;
        return;
      }
    } catch (e) {
      ctx.body.result.message = "Internal error in retrieving shop data";
      ctx.status = 500;
      return;
    }

    const method = ctx.request.query.method;
    const rate = ctx.request.query.rate;
    const id = ctx.request.query.id;

    let api_res = null;
    try {
      api_res = await (callGraphql(ctx, shop, `mutation paymentCustomizationCreate($paymentCustomization: PaymentCustomizationInput!) {
        paymentCustomizationCreate(paymentCustomization: $paymentCustomization) {
          paymentCustomization {
            enabled
            id
            functionId
            title
            metafields (first: 10) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "paymentCustomization": {
          "enabled": true,
          "functionId": id,
          "metafields": [
            {
              "description": "Payment method and shipping rate filter",
              //"id": "",
              "key": "filter",
              "namespace": "barebone_app_function_payment",
              "type": "json",
              "value": JSON.stringify({
                "method": method,
                "rate": rate
              })
            }
          ],
          "title": "Barebone App Function Payment"
        }
      }));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    ctx.body.result.response = api_res;
    ctx.status = 200;
    return;
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Web Pixel sample endpoint --- */
// See https://shopify.dev/apps/marketing/pixels
router.get('/webpixel', async (ctx, next) => {
  console.log("+++++++++++++++ /webpixel +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  // Access by AppBride::authenticatedFetch
  if (typeof ctx.request.header.authorization !== UNDEFINED) {
    console.log('Authenticated fetch');
    const token = getTokenFromAuthHeader(ctx);
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
      ctx.status = 400;
      return;
    }

    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      "result": {
        "message": "",
        "response": {}
      }
    };

    const shop = getShopFromAuthToken(token);
    let shop_data = null;
    try {
      shop_data = await (getDB(shop));
      if (shop_data == null) {
        ctx.body.result.message = "Authorization failed. No shop data";
        ctx.status = 400;
        return;
      }
    } catch (e) {
      ctx.body.result.message = "Internal error in retrieving shop data";
      ctx.status = 500;
      return;
    }

    // Create a Web Pixel
    const ga4 = ctx.request.query.ga4;
    const ga4Id = ctx.request.query.ga4Id;
    const ga4Sec = ctx.request.query.ga4Sec;
    const ga4Debug = ctx.request.query.ga4Debug;
    let api_res = null;
    try {
      api_res = await (callGraphql(ctx, shop, `mutation webPixelCreate($webPixel: WebPixelInput!) {
          webPixelCreate(webPixel: $webPixel) {
            userErrors {
              field
              message
            }
            webPixel {
              settings
              id
            }
          }
        }
        
      `, null, GRAPHQL_PATH_ADMIN, {
        "webPixel": {
          "settings": JSON.stringify({
            "ga4Id": ga4Id,
            "ga4Sec": ga4Sec,
            "ga4Debug": ga4Debug
          })
        }
      }));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    ctx.body.result.response = api_res;
    ctx.status = 200;
    return;
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Post-purchase Extension sample endpoint --- */
// See https://shopify.dev/docs/apps/checkout/post-purchase
// See https://shopify.dev/docs/api/checkout-extensions/extension-points
router.get('/postpurchase', async (ctx, next) => {
  console.log("+++++++++++++++ /postpurchase +++++++++++++++");

  // Access by AppBride::authenticatedFetch
  if (typeof ctx.request.header.authorization !== UNDEFINED) {
    console.log('Authenticated fetch');
    const token = getTokenFromAuthHeader(ctx);
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
      ctx.status = 400;
      return;
    }

    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      "result": {
        "message": "",
        "response": {}
      }
    };

    const shop = getShopFromAuthToken(token);
    let shop_data = null;
    try {
      shop_data = await (getDB(shop));
      if (shop_data == null) {
        ctx.body.result.message = "Authorization failed. No shop data";
        ctx.status = 400;
        return;
      }
    } catch (e) {
      ctx.body.result.message = "Internal error in retrieving shop data";
      ctx.status = 500;
      return;
    }

    // 1-1. Check if the app URL metafield definition exists.
    const api_errors = {
      "errors": 0,
      "apis": []
    };
    try {
      const api_res = await (callGraphql(ctx, shop, `{
        metafieldDefinitions(first:1, ownerType: SHOP, namespace:"barebone_app", key: "url") {
          edges {
            node {
              id
            }
          }
        }
      } `, null, GRAPHQL_PATH_ADMIN, null));
      if (api_res.data.metafieldDefinitions.edges.length > 0) {
        // 1-2. Delete the existing app URL metafield definition.       
        await (callGraphql(ctx, shop, `mutation metafieldDefinitionDelete($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
          metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
            deletedDefinitionId
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "deleteAllAssociatedMetafields": true,
          "id": api_res.data.metafieldDefinitions.edges[0].node.id
        }));
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    // 1-3. Create an app URL metafield definition.
    try {
      let api_res = await (callGraphql(ctx, shop, `{
        shop {
          id
          metafields(first:1, namespace: "barebone_app") {
            edges {
              node {
                id
                namespace
                key
                value
              }
            }
          }
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      const id = api_res.data.shop.id;
      if (api_res.data.shop.metafields.edges.length > 0) {
        await (callGraphql(ctx, shop, `mutation metafieldDelete($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "input": {
            "id": api_res.data.shop.metafields.edges[0].node.id
          }
        }));
      }
      api_res = await (callGraphql(ctx, shop, `mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
            ownerType
            visibleToStorefrontApi
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "definition": {
          "key": "url",
          "name": "Barebone app url",
          "namespace": "barebone_app",
          "ownerType": "SHOP",
          "type": "single_line_text_field",
          "visibleToStorefrontApi": true
        }
      }));
      if (api_res.data.metafieldDefinitionCreate.userErrors.length > 0) {
        api_errors.errors = api_errors.errors + 1;
        api_errors.apis.push(`shop ${JSON.stringify(api_res.data.metafieldDefinitionCreate.userErrors[0])}`);
      }
      // 1-4. Add a metafield for the app URL to the metafield definition.
      api_res = await (callGraphql(ctx, shop, `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "metafields": [
          {
            "key": "url",
            "namespace": "barebone_app",
            "ownerId": id,
            "value": `https://${ctx.request.host}`
          }
        ]
      }
      ));
      if (api_res.data.metafieldsSet.userErrors.length > 0) {
        api_errors.errors = api_errors.errors + 1;
        api_errors.apis.push(`shop ${JSON.stringify(api_res.data.metafieldsSet.userErrors[0])}`);
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      api_errors.errors = api_errors.errors + 1;
      api_errors.apis.push(`shop ${JSON.stringify(e)}`);
    }

    // 2-1. Check if the product id metafield definition exists.
    try {
      const api_res = await (callGraphql(ctx, shop, `{
        metafieldDefinitions(first:1, ownerType: PRODUCT, namespace:"barebone_app_upsell", key: "product_id") {
          edges {
            node {
              id
            }
          }
        }
      } `, null, GRAPHQL_PATH_ADMIN, null));
      if (api_res.data.metafieldDefinitions.edges.length > 0) {
        // 2-2. Delete thethe product id definition metafield.
        await (callGraphql(ctx, shop, `mutation metafieldDefinitionDelete($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
          metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
            deletedDefinitionId
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "deleteAllAssociatedMetafields": true,
          "id": api_res.data.metafieldDefinitions.edges[0].node.id
        }));
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    // 2-3. Create an product id metafield definition.
    try {
      const api_res = await (callGraphql(ctx, shop, `mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
            ownerType
            visibleToStorefrontApi
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "definition": {
          "key": "product_id",
          "name": "Barebone app upsell product id",
          "namespace": "barebone_app_upsell",
          "ownerType": "PRODUCT",
          "type": "single_line_text_field",
          "visibleToStorefrontApi": true,
          "pin": true
        }
      }));
      if (api_res.data.metafieldDefinitionCreate.userErrors.length > 0) {
        api_errors.errors = api_errors.errors + 1;
        api_errors.apis.push(`product ${JSON.stringify(api_res.data.metafieldDefinitionCreate.userErrors[0])}`);
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      api_errors.errors = api_errors.errors + 1;
      api_errors.apis.push(`product ${JSON.stringify(e)}`);
    }

    // 3-1. Check if the review score metafield definition exists.
    try {
      const api_res = await (callGraphql(ctx, shop, `{
        metafieldDefinitions(first:1, ownerType: CUSTOMER, namespace:"barebone_app_review", key: "score") {
          edges {
            node {
              id
            }
          }
        }
      } `, null, GRAPHQL_PATH_ADMIN, null));
      if (api_res.data.metafieldDefinitions.edges.length > 0) {
        // 3-2. Delete the review score definition metafield.
        await (callGraphql(ctx, shop, `mutation metafieldDefinitionDelete($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
          metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
            deletedDefinitionId
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "deleteAllAssociatedMetafields": true,
          "id": api_res.data.metafieldDefinitions.edges[0].node.id
        }));
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    // 3-3. Create an review score metafield definition.
    try {
      const api_res = await (callGraphql(ctx, shop, `mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
            ownerType
            visibleToStorefrontApi
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "definition": {
          "key": "score",
          "name": "Barebone app review score",
          "namespace": "barebone_app_review",
          "ownerType": "CUSTOMER",
          "type": "number_integer",
          "visibleToStorefrontApi": false,
          "pin": true
        }
      }));
      if (api_res.data.metafieldDefinitionCreate.userErrors.length > 0) {
        api_errors.errors = api_errors.errors + 1;
        api_errors.apis.push(`customer ${JSON.stringify(api_res.data.metafieldDefinitionCreate.userErrors[0])}`);
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      api_errors.errors = api_errors.errors + 1;
      api_errors.apis.push(`customer ${JSON.stringify(e)}`);
    }

    // Send the error count.
    ctx.body.result.response = api_errors;
    ctx.status = 200;
    return;
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Post-purchase CORS endpoint --- */
// Sandbox Web Workers used by Web Pixels, Checkout Extensions require CORS access.
/* Accessed like this from Web Workers.
fetch(`https://customise-manuals-zero-approximate.trycloudflare.com/postpurchase?your_key=your_value`, {
      method: "POST"
    }).then(res => {
      res.json().then(json => {
        console.log(`${JSON.stringify(json)}`);
      }).catch(e => {
        console.log(`${e}`);
      });
    }).catch(e => {
      console.log(`error: ${e}`);
    });
*/
router.post('/postpurchase', async (ctx, next) => {
  console.log("------------ postpurchase ------------");
  console.log(`request ${JSON.stringify(ctx.request, null, 4)}`);
  console.log(`query ${JSON.stringify(ctx.request.query, null, 4)}`);
  console.log(`body ${JSON.stringify(ctx.request.body, null, 4)}`);

  // if a wrong token is passed with a ummatched signature, decodeJWT fails with an exeption = works as verification as well.
  let decoded_token = null;
  try {
    decoded_token = decodeJWT(ctx.request.query.token);
  } catch (e) {
    console.log(`${e}`);
  }
  if (decoded_token == null) {
    ctx.body = { "Error": "Wrong token passed." };
    ctx.status = 400;
    return;
  }
  console.log(`decoded_token ${JSON.stringify(decoded_token, null, 4)}`);

  const input_data = typeof decoded_token.input_data !== UNDEFINED ? decoded_token.input_data : null;

  const shop = input_data != null ? input_data.shop.domain : decoded_token.dest;

  let response_data = {};

  const upsell_product_ids = ctx.request.query.upsell_product_ids;
  // ShouldRender access for retrieving variant ids for offered products.
  if (typeof upsell_product_ids !== UNDEFINED) {
    const query = JSON.parse(upsell_product_ids).map((id) => {
      return `id:${id}`;
    }).reduce((prev, next) => {
      return `${prev} OR ${next}`;
    });
    console.log(`query: ${query}`);
    try {
      const api_res = await (callGraphql(ctx, shop, `{
          products(first: 10, query: "${query}") {
            edges {
              node {
                id
                title
                featuredImage {
                  url
                }
                priceRangeV2 {
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
      response_data = api_res.data;
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
  }

  const changes = ctx.request.query.changes;
  // Render access to sign the JWT for AppBridge Checkout applyChange.
  if (typeof changes !== UNDEFINED) {
    const payload = {
      iss: API_KEY,
      jti: uuidv4(),
      iat: Date.now(),
      sub: input_data != null ? input_data.initialPurchase.referenceId : "",
      changes: JSON.parse(changes)
    };
    console.log(`payload ${JSON.stringify(payload, null, 4)}`);
    response_data = { "token": createJWT(payload) };
  }

  const customerId = ctx.request.query.customerId;
  // Render access to set the customer's review score to their metafields.
  if (typeof customerId !== UNDEFINED) {
    let ownerId = `gid://shopify/Customer/${customerId}`;
    if (customerId.indexOf('@') != -1) {
      try {
        const api_res = await (callGraphql(ctx, shop, `{
          customers(query: "email:${customerId}", first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
        ownerId = api_res.data.customers.edges[0].node.id;
      } catch (e) {
        console.log(`${JSON.stringify(e)}`);
      }
    }
    try {
      const api_res = await (callGraphql(ctx, shop, `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, {
        "metafields": [
          {
            "key": "score",
            "namespace": "barebone_app_review",
            "ownerId": ownerId,
            "value": `${ctx.request.query.score}`
          }
        ]
      }));
      response_data = api_res.data;
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
  }
  ctx.set('Content-Type', 'application/json');
  ctx.body = response_data;
  ctx.status = 200;

});

/* --- Checkout UI sample endpoint --- */
// See https://shopify.dev/docs/api/checkout-ui-extensions/extension-points-api
// See https://shopify.dev/docs/apps/checkout/product-offers/add-product-offer
router.get('/checkoutui', async (ctx, next) => {
  console.log("+++++++++++++++ /checkoutui +++++++++++++++");

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- App proxies sample endpoint --- */
// See https://shopify.dev/apps/online-store/app-proxies
// Note that ngrok blocks the proxy, so you should use cloudflare tunnel, instead.
router.get('/appproxy', async (ctx, next) => {
  console.log("+++++++++++++++ /appproxy +++++++++++++++");
  console.log(`request ${JSON.stringify(ctx.request, null, 4)}`);
  if (!checkAppProxySignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  // Use this for API calls.
  //const shop = ctx.request.query.shop;
  //const customerId = ctx.request.query.logged_in_customer_id;

  // App Proxies are supposed to be public within theme or other public sforefronts, so its external endpoint like 
  // `https://${shop}.myshopify.dom/apps/bareboneproxy` has no validation or authentication where you shouldn't return private data.
  const res = {
    "message": "CAUTION! DO NOT RETURN PRIVATE DATA OVER APP PROXY, THIS IS FULLY PUBLIC.",
    "query": ctx.request.query
  }

  const format = ctx.request.query.format;
  if (typeof format !== UNDEFINED && format == 'liquid') {
    ctx.set('Content-Type', 'application/liquid');
    ctx.body = `<h2>Liquid objects rendered by the app proxy in 'Content-Type application/liquid'</h2> 
      <ul>
        <li>&#123;&#123;shop.name&#125;&#125;: {{shop.name}}</li>    
        <li>&#123;&#123;template.name&#125;&#125;: {{template.name}}</li>
        <li>&#123;&#123;customer.email&#125;&#125;: {{customer.email}}</li>
        <li>&#123;&#123;product.title&#125;&#125;: {{product.title}}</li>
      </ul>
      <h2>Request query from the app proxy to my app endpoint</h2> 
      <pre>${JSON.stringify(res, null, 4)}</pre>
    `;
    return;
  }

  ctx.set('Content-Type', 'application/json');
  ctx.body = res;

});

/* --- Mock login for external service connection demo --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
router.get('/mocklogin', async (ctx, next) => {
  console.log("------------ mocklogin ------------");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  let target = '';
  let details = '';

  // Get the shop data from the session token supposed to be passed from AppBridge which can never be falsified.
  // For productinon code, this endpoint should be POST method to receive the token in the body, not the query.
  if (typeof ctx.request.query.sessiontoken !== UNDEFINED) {
    console.log('Session Token given');
    const token = ctx.request.query.sessiontoken;
    if (!checkAuthFetchToken(token)[0]) {
      ctx.body = "Signature unmatched. Incorrect session token sent";
      ctx.status = 400;
      return;
    }
    const shop = getShopFromAuthToken(token);

    target = `<p>You are connecting to: <h3>${shop}</h3></p>`;

    details = `<p><b>The following is the received session token with the shop data above which you can never falsify</b> 
    (try it in <a href="https://jwt.io" target="_blank">jwt.io</a> by copying the text below and change the shop to paste to '?sessiontoken=' above).</p>
    <pre>${token}</pre>
    <ul>
    <li>For the validation details, see <a href="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-3-decode-session-tokens-for-incoming-requests" target="_blank">this document</a></li>
    <li>If you don't want to reveal the token in the query, you can use body POST approach with a hidden tag, too</li>
    </ul>
    <p><a href="https://${getAdminFromShop(shop)}">Go back to Shopify admin</a></p>`;
  }

  ctx.body = `<h1>Welcome to my mock login for my dummy service</h1> 
      ${target}
      <p>Your email: <input /></p>
      <p>Your password: <input /></p>
      <p><button onClick="javascript:window.location.href='./mocklogin';">Login</button></p>
      ${details}
    `;

});

/*  --- Webhook endpoint for common usage --- */
router.post('/webhookcommon', async (ctx, next) => {
  console.log("*************** webhookcommon ***************");
  console.log(`*** request *** ${JSON.stringify(ctx.request)}`);
  // Check the signature
  const valid = await (checkWebhookSignature(ctx, WEBHOOK_SECRET));
  if (!valid) {
    console.log('Not a valid signature');
    ctx.status = 401;
    return;
  }

  console.log(`*** body *** ${JSON.stringify(ctx.request.body)}`);

  ctx.status = 200;
});

/* --- Webhook endpoint for  GDPR --- */
router.post('/webhookgdpr', async (ctx, next) => {
  console.log("*************** webhookgdpr ***************");
  console.log(`*** body *** ${JSON.stringify(ctx.request.body)}`);

  /* Check the signature */
  const valid = await (checkWebhookSignature(ctx, API_SECRET));
  if (!valid) {
    console.log('Not a valid signature');
    ctx.status = 401;
    return;
  }

  ctx.status = 200;
});

/* --- Check if the given signature is correct or not --- */
// See https://shopify.dev/apps/auth/oauth/getting-started#step-2-verify-the-installation-request
const checkSignature = function (json) {
  let temp = JSON.parse(JSON.stringify(json));
  console.log(`checkSignature ${JSON.stringify(temp)}`);
  if (typeof temp.hmac === UNDEFINED) return false;
  let sig = temp.hmac;
  delete temp.hmac;
  let msg = Object.entries(temp).sort().map(e => e.join('=')).join('&');
  //console.log(`checkSignature ${msg}`);
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(msg);
  let signature = hmac.digest('hex');
  console.log(`checkSignature ${signature}`);
  return signature === sig ? true : false;
};

/* --- Check if the given signature is correct or not for app proxies --- */
// See https://shopify.dev/apps/online-store/app-proxies#calculate-a-digital-signature
const checkAppProxySignature = function (json) {
  let temp = JSON.parse(JSON.stringify(json));
  console.log(`checkAppProxySignature ${JSON.stringify(temp)}`);
  if (typeof temp.signature === UNDEFINED) return false;
  let sig = temp.signature;
  delete temp.signature;
  let msg = Object.entries(temp).sort().map(e => e.join('=')).join('');
  //console.log(`checkAppProxySignature ${msg}`);
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(msg);
  let signarure = hmac.digest('hex');
  console.log(`checkAppProxySignature ${signarure}`);
  return signarure === sig ? true : false;
};

/* --- Check if the given signarure is corect or not for Webhook --- */
// See https://shopify.dev/apps/webhooks/configuration/https#step-5-verify-the-webhook
const checkWebhookSignature = function (ctx, secret) {
  return new Promise(function (resolve, reject) {
    console.log(`checkWebhookSignature Headers ${JSON.stringify(ctx.headers)}`);
    let receivedSig = ctx.headers["x-shopify-hmac-sha256"];
    console.log(`checkWebhookSignature Given ${receivedSig}`);
    if (receivedSig == null) return resolve(false);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(ctx.request.rawBody, 'utf8').toString('utf8'));
    let signature = hmac.digest('base64');
    console.log(`checkWebhookSignature Created: ${signature}`);
    return resolve(receivedSig === signature ? true : false);
  });
};

/* --- Get a token string from a given authorization header --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-2-authenticate-your-requests
const getTokenFromAuthHeader = function (ctx) {
  return ctx.request.header.authorization.replace('Bearer ', '');
};

/* --- Get a shop from a token from a given authorization header --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#optional-obtain-session-details-and-verify-the-session-token-manually
const getShopFromAuthToken = function (token) {
  const payload = jwt_decode(token);
  console.log(`payload: ${JSON.stringify(payload, null, 4)}`);
  return payload.dest.replace('https://', '');
};

/* --- Check if the given signarure is corect or not for App Bridge authenticated requests --- */
// See https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#verify-the-session-tokens-signature
const checkAuthFetchToken = function (token) {
  const [header, payload, signature] = token.split("\.");
  console.log(`checkAuthFetchToken header: ${header} payload: ${payload} signature: ${signature}`);
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(`${header}.${payload}`);
  const encodeBase64 = function (b) { return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') };
  let sig = encodeBase64(hmac.digest('base64'));
  console.log(`checkAuthFetchToken Recieved: ${signature} Created: ${sig}`);
  return [(signature === sig ? true : false), sig];
};

/* --- Whether the given request is embedded inside Shopify Admin or not --- */
// See. https://shopify.dev/apps/auth/oauth/getting-started#check-for-and-escape-the-iframe-embedded-apps-only
const isEmbedded = function (ctx) {
  const embedded = ctx.request.query.embedded;
  // If the app is set embedded in the app settings, "embedded" is set "1", otherwise "0" or undefined.  
  if (typeof embedded !== UNDEFINED && embedded == '1') return true;
  return false;
};

/* --- Get the id from shop domain --- */
const getIdFromShop = function (shop) {
  return shop.replace('.myshopify.com', '');
};

/* --- Get Admin domain and path from shop domain --- */
// See https://shopify.dev/apps/tools/app-bridge/updating-overview#ensure-compatibility-with-the-new-shopify-admin-domain
// See https://www.shopify.com/partners/blog/september-product-updates-for-partners-and-developers
const getAdminFromShop = function (shop) {
  return `admin.shopify.com/store/${getIdFromShop(shop)}`;
};

/* --- Set Content-Security-Policy header for admin embedded types --- */
// See https://shopify.dev/apps/store/security/iframe-protection
const setContentSecurityPolicy = function (ctx, shop) {
  if (isEmbedded(ctx)) {
    ctx.response.set('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com;`);
  } else {
    ctx.response.set('Content-Security-Policy', `frame-ancestors 'none';`);
  }
};

/* --- Create JWT to pass data encoded through URL access (Checkout Extension Web Worker) --- */
const createJWT = function (json) {
  return jwt.sign(json, API_SECRET, { algorithm: 'HS256', expiresIn: '60s' });
};

/* --- Decode JWT passed through URL access (Checkout Extension Web Worker) --- */
// If the given signature in token unmatched, the function produces an expection.
const decodeJWT = function (token) {
  return jwt.verify(token, API_SECRET);
};

/* --- Call Shopify GraphQL --- */
const callGraphql = function (ctx, shop, ql, token = null, path = GRAPHQL_PATH_ADMIN, vars = null) {
  return new Promise(function (resolve, reject) {
    let api_req = {};
    // Set Gqphql string into query field of the JSON  as string
    api_req.query = ql.replace(/\n/g, '');
    if (vars != null) {
      api_req.variables = vars;
    }
    let access_token = token;
    if (access_token == null) {
      getDB(shop).then(function (shop_data) {
        if (shop_data == null) return reject(null);
        access_token = shop_data.access_token;
        accessEndpoint(ctx, `https://${shop}/${path}`, api_req, access_token).then(function (api_res) {
          return resolve(api_res);
        }).catch(function (e) {
          //console.log(`callGraphql ${e}`);
          return reject(e);
        });
      }).catch(function (e) {
        console.log(`callGraphql ${e}`);
        return reject(e);
      });
    } else {
      accessEndpoint(ctx, `https://${shop}/${path}`, api_req, access_token).then(function (api_res) {
        return resolve(api_res);
      }).catch(function (e) {
        //console.log(`callGraphql ${e}`);
        return reject(e);
      });
    }
  });
};

/* ---  HTTP access common function for GraphQL --- */
const accessEndpoint = function (ctx, endpoint, req, token = null, content_type = CONTENT_TYPE_JSON) {
  console.log(`[ accessEndpoint ] POST ${endpoint} ${JSON.stringify(req)}`);
  return new Promise(function (resolve, reject) {
    // Success callback
    let then_func = function (res) {
      console.log(`[ accessEndpoint ] Success: POST ${endpoint} ${res}`);
      return resolve(JSON.parse(res));
    };
    // Failure callback
    let catch_func = function (e) {
      console.log(`[ accessEndpoint ] Failure: POST ${endpoint} ${e}`);
      return reject(e);
    };
    let headers = {};
    headers['Content-Type'] = content_type;
    if (token != null) {
      headers['X-Shopify-Access-Token'] = token;
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(req));
      headers['User-Agent'] = 'My_Shopify_Barebone_App';
      headers['Host'] = endpoint.split('/')[2];
    }
    console.log(`[ accessEndpoint ] ${JSON.stringify(headers)}`);
    ctx.post(endpoint, req, headers).then(then_func).catch(catch_func);
  });
};

/* --- Store Shopify data in database --- */
const insertDB = function (key, data) {
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      // PostgreSQL
      return insertDBPostgreSQL(key, data);
    case 'MYSQL':
      // MySQL
      return insertDBMySQL(key, data);
    default:
      // MongoDB
      return insertDBMongo(key, data);
  }
};

/* --- Retrive Shopify data in database --- */
const getDB = function (key) {
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      // PostgreSQL
      return getDBPostgreSQL(key);
    case 'MYSQL':
      // MySQL
      return getDBMySQL(key);
    default:
      // MongoDB
      return getDBMongo(key);
  }
};

/* --- Update Shopify data in database --- */
const setDB = function (key, data) {
  switch (DB_TYPE) {
    case 'POSTGRESQL':
      // PostgreSQL
      return setDBPostgreSQL(key, data);
    case 'MYSQL':
      // MySQL
      return setDBMySQL(key, data);
    default:
      // MongoDB
      return setDBMongo(key, data);
  }
};

/* --- Store Shopify data in database (MongoDB) --- */
const insertDBMongo = function (key, data, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`insertDB Connected: ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`insertDBMongo Used: ${MONGO_DB_NAME} - ${collection}`);
      console.log(`insertDBMongo insertOne, _id:${key}`);
      dbo.collection(collection).insertOne({ "_id": key, "data": data, "created_at": new Date(), "updated_at": new Date() }).then(function (res) {
        db.close();
        return resolve(0);
      }).catch(function (e) {
        console.log(`insertDBMongo Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`insertDBMongo Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Retrive Shopify data in database (MongoDB) --- */
const getDBMongo = function (key, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    console.log(`getDBMongo MONGO_URL ${MONGO_URL}`);
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`getDB Connected ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`getDBMongo Used ${MONGO_DB_NAME} - ${collection}`);
      console.log(`getDBMongo findOne, _id:${key}`);
      dbo.collection(collection).findOne({ "_id": `${key}` }).then(function (res) {
        db.close();
        if (res == null) return resolve(null);
        return resolve(res.data);
      }).catch(function (e) {
        console.log(`getDBMongo Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`getDBMongo Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Update Shopify data in database (MongoDB) --- */
const setDBMongo = function (key, data, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`setDB Connected ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`setDBMongo Used ${MONGO_DB_NAME} - ${collection}`);
      console.log(`setDBMongo findOneAndUpdate, _id:${key}`);
      dbo.collection(collection).findOneAndUpdate({ "_id": `${key}` }, { $set: { "data": data, "updated_at": new Date() } }, { new: true }).then(function (res) {
        db.close();
        return resolve(res);
      }).catch(function (e) {
        console.log(`setDBMongo Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`setDBMongo Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Store Shopify data in database (PostgreSQL) --- */
const insertDBPostgreSQL = function (key, data) {
  return new Promise(function (resolve, reject) {
    const client = new Client({
      connectionString: POSTGRESQL_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    client.connect().then(function () {
      //console.log(`insertDBPostgreSQL Connected: ${POSTGRESQL_URL}`);
      const sql = `INSERT INTO ${POSTGRESQL_TABLE} ( _id, data, created_at, updated_at ) VALUES ('${key}', '${JSON.stringify(data).replace(/\\"/g, '\\\\"').replace(/'/g, "\\'")}', '${new Date().toISOString()}',  '${new Date().toISOString()}')`;
      console.log(`insertDBPostgreSQL:  ${sql}`);
      client.query(sql).then(function (res) {
        client.end();
        return resolve(0);
      }).catch(function (e) {
        client.end();
        console.log(`insertDBPostgreSQL Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`insertDBPostgreSQL Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Retrive Shopify data in database (PostgreSQL) --- */
const getDBPostgreSQL = function (key) {
  return new Promise(function (resolve, reject) {
    console.log(`getDBPostgreSQL POSTGRESQL_URL ${POSTGRESQL_URL}`);
    const client = new Client({
      connectionString: POSTGRESQL_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    client.connect().then(function () {
      //console.log(`getDBPostgreSQL Connected: ${POSTGRESQL_URL}`);
      const sql = `SELECT data FROM ${POSTGRESQL_TABLE} WHERE _id = '${key}'`;
      console.log(`getDBPostgreSQL:  ${sql}`);
      client.query(sql).then(function (res) {
        client.end();
        if (res.rows.length == 0) return resolve(null);
        return resolve(res.rows[0].data);
      }).catch(function (e) {
        client.end();
        console.log(`getDBPostgreSQL Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`getDBPostgreSQL Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Update Shopify data in database (PostgreSQL) --- */
const setDBPostgreSQL = function (key, data) {
  return new Promise(function (resolve, reject) {
    const client = new Client({
      connectionString: POSTGRESQL_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    client.connect().then(function () {
      //console.log(`setDBPostgreSQL Connected: ${POSTGRESQL_URL}`);
      const sql = `UPDATE ${POSTGRESQL_TABLE} SET data = '${JSON.stringify(data).replace(/\\"/g, '\\\\"').replace(/'/g, "\\'")}', updated_at = '${new Date().toISOString()}' WHERE _id = '${key}'`;
      console.log(`setDBPostgreSQL:  ${sql}`);
      client.query(sql).then(function (res) {
        client.end();
        return resolve(res.rowCount);
      }).catch(function (e) {
        client.end();
        console.log(`setDBPostgreSQL Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`setDBPostgreSQL Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Store Shopify data in database (MySQL) --- */
const insertDBMySQL = function (key, data) {
  return new Promise(function (resolve, reject) {
    const connection = mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE
    });
    connection.connect((e) => {
      if (e) {
        console.log(`insertDBMySQL Error ${e}`);
        return reject(e);
      }
      //console.log(`insertDBMySQL Connected: ${MYSQL_HOST}`);
      const sql = `INSERT INTO ${MYSQL_TABLE} ( _id, data, created_at, updated_at ) VALUES ('${key}', '${JSON.stringify(data).replace(/\\"/g, '\\\\"').replace(/'/g, "\\'")}', '${new Date().toISOString().replace('T', ' ').replace('Z', '')}',  '${new Date().toISOString().replace('T', ' ').replace('Z', '')}')`;
      console.log(`insertDBMySQL:  ${sql}`);
      connection.query(
        sql,
        (e, res) => {
          connection.end();
          if (e) {
            console.log(`insertDBMySQL Error ${e}`);
            return reject(e);
          }
          return resolve(0);
        }
      );
    });
  });
};

/* --- Retrive Shopify data in database (MySQL) --- */
const getDBMySQL = function (key) {
  return new Promise(function (resolve, reject) {
    console.log(`getDBMySQL MYSQL_HOST ${MYSQL_HOST}`);
    const connection = mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE
    });
    connection.connect((e) => {
      //console.log(`getDBMySQL Connected: ${MYSQL_HOST}`);
      if (e) {
        console.log(`getDBMySQL Error ${e}`);
        return reject(e);
      }
      const sql = `SELECT data FROM ${MYSQL_TABLE} WHERE _id = '${key}'`;
      console.log(`getDBMySQL:  ${sql}`);
      connection.query(
        sql,
        (e, res) => {
          connection.end();
          if (e) {
            console.log(`getDBMySQL Error ${e}`);
            return reject(e);
          }
          if (res.length == 0) return resolve(null);
          return resolve(JSON.parse(res[0].data));
        }
      );
    });
  });
};

/* --- Update Shopify data in database (MySQL) --- */
const setDBMySQL = function (key, data) {
  return new Promise(function (resolve, reject) {
    console.log(`setDBMySQL MYSQL_HOST ${MYSQL_HOST}`);
    const connection = mysql.createConnection({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE
    });
    connection.connect((e) => {
      //console.log(`setDBMySQL Connected: ${MYSQL_HOST}`);
      const sql = `UPDATE ${MYSQL_TABLE} SET data = '${JSON.stringify(data).replace(/\\"/g, '\\\\"').replace(/'/g, "\\'")}', updated_at = '${new Date().toISOString().replace('T', ' ').replace('Z', '')}' WHERE _id = '${key}'`;
      console.log(`setDBMySQL:  ${sql}`);
      if (e) {
        console.log(`setDBMySQL Error ${e}`);
        return reject(e);
      }
      connection.query(
        sql,
        (e, res) => {
          connection.end();
          if (e) {
            console.log(`setDBMySQL Error ${e}`);
            return reject(e);
          }
          return resolve(res.affectedRows);
        }
      );
    });
  });
};

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);