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
    } else if (!isEmbedded(ctx)) {
      // If the app is not embedded, App Bridge and its Session Token cannot be used, so the page should be redirect to the 
      // external one using its own JWT token, instead of Session Token.
      const redirectUrl = `/mocklogin?my_token=${createJWT({ "shop": shop })}`;
      console.log(`Redirecting to ${redirectUrl} for the non embedded app to show the mock login as an external service...`);
      ctx.redirect(redirectUrl);
      return;
    }
  } catch (e) {
    console.log(`${e}`);
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

    const api_errors = {
      "errors": 0,
      "apis": []
    };

    try {
      let api_res = await (callGraphql(ctx, shop, `{
        shop {
          id
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      const id = api_res.data.shop.id;
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
            "type": "single_line_text_field",
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
      method: "POST",
      headers: {
        Authorization: `Bearer ${YOUR_SESSION_TOKEN}`,
      },
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

  const token = getTokenFromAuthHeader(ctx);
  if (!checkAuthFetchToken(token)[0]) {
    ctx.body = { "Error": "Signature unmatched. Incorrect authentication bearer sent" };
    ctx.status = 400;
    return;
  }

  const decoded_token = jwt_decode(token);
  console.log(`decoded_token: ${JSON.stringify(decoded_token)}`);

  const input_data = typeof decoded_token.input_data !== UNDEFINED ? decoded_token.input_data : null;
  console.log(`input_data: ${JSON.stringify(input_data)}`);

  // See https://shopify.dev/docs/api/checkout-extensions/post-purchase/api#inputdata
  // See https://shopify.dev/docs/api/checkout-ui-extensions/unstable/configuration#network-access
  const shop = input_data != null ? input_data.shop.domain : decoded_token.dest;
  console.log(`shop: ${shop}`);
  const customer_id = input_data != null ? `${input_data.initialPurchase.customerId}` : typeof decoded_token.sub !== UNDEFINED ? `${decoded_token.sub}` : '';
  console.log(`customer_id: ${customer_id}`);

  let response_data = {};

  const upsell_product_ids = ctx.request.query.upsell_product_ids;
  // Retrieving variant ids for offered products.
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
  // Sign the JWT for AppBridge Checkout applyChange.
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

  const score = ctx.request.query.score;
  // Set the customer's review score to their metafields.
  if (typeof score !== UNDEFINED && customer_id !== '') {
    const ownerId = customer_id.indexOf('gid') != -1 ? customer_id : `gid://shopify/Customer/${customer_id}`;
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
            "type": "number_integer",
            "value": `${parseInt(score)}`
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

/* --- Order management sample endpoint --- */
// See https://shopify.dev/docs/apps/fulfillment
router.get('/ordermanage', async (ctx, next) => {
  console.log("+++++++++++++++ /ordermanage +++++++++++++++");
  console.log(`query ${JSON.stringify(ctx.request.query)}`);

  if (isEmbedded(ctx)) {
    console.log('Embedded access');
    if (!checkSignature(ctx.request.query)) {
      ctx.status = 400;
      return;
    }
    const shop = ctx.request.query.shop;
    setContentSecurityPolicy(ctx, shop);
    return await ctx.render('index', {});
  }

  const token = getTokenFromAuthHeader(ctx);
  if (!checkAuthFetchToken(token)[0]) {
    ctx.body.result.message = "Signature unmatched. Incorrect authentication bearer sent";
    ctx.status = 400;
    return;
  }

  const shop = getShopFromAuthToken(token);

  let shop_data = null;
  try {
    shop_data = await (getDB(shop));
    if (shop_data == null) {
      ctx.body = `{ "Error": "Authorization failed. No shop data"}`;
      ctx.status = 400;
      return;
    }
  } catch (e) {
    ctx.body = `{ "Error": "Internal error in retrieving shop data"}`;
    ctx.status = 500;
    return;
  }

  let error = '';
  let api_res = null;

  // 1. Show the details of selected order for its fulfillemnt and payment capture.
  const id = ctx.request.query.id;
  if (typeof id !== UNDEFINED && id !== '') {
    const order_id = `gid://shopify/Order/${id}`;

    const foids = ctx.request.query.foids;
    if (typeof foids !== UNDEFINED && foids !== '') {
      const ids = foids.split(',');
      for await (const id of ids) {
        try {
          const res = await (callGraphql(ctx, shop, `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
                fulfillmentCreateV2(fulfillment: $fulfillment) {
                  fulfillment {
                    id
                    name
                    fulfillmentOrders(first: 3, reverse: true) {
                      edges {
                        node {
                          id
                          createdAt
                          status
                          requestStatus
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`, null, GRAPHQL_PATH_ADMIN, {
            "fulfillment": {
              "lineItemsByFulfillmentOrder": [
                {
                  "fulfillmentOrderId": id
                }
              ],
              "trackingInfo": {
                "company": "Dummy shipping carrier",
                "number": `manual-${new Date().getTime()}`,
                "url": "https://example.com"
              }
            }
          }));
          if (res.data.fulfillmentCreateV2.userErrors.length > 0) {
            error += res.data.fulfillmentCreateV2.userErrors.map((e) => { e.message }).toString();
          }
        } catch (e) {
          console.log(`${JSON.stringify(e)}`);
          error += e;
        }
      }
    }

    const trans = ctx.request.query.trans;
    if (typeof trans !== UNDEFINED && trans !== '') {
      const trs = trans.split(',');
      for await (const tr of trs) {
        try {
          const res = await (callGraphql(ctx, shop, `mutation orderCapture($input: OrderCaptureInput!) {
            orderCapture(input: $input) {
              transaction {
                id
                status
                gateway
                kind
              }
              userErrors {
                field
                message
              }
            }
          }`, null, GRAPHQL_PATH_ADMIN, {
            "input": {
              "amount": tr.split('-')[1],
              "id": order_id,
              "parentTransactionId": tr.split('-')[0]
            }
          }));
          if (res.data.orderCapture.userErrors.length > 0) {
            error += res.data.orderCapture.userErrors.map((e) => { e.message }).toString();
          }
        } catch (e) {
          console.log(`${JSON.stringify(e)}`);
          error += e;
        }
      }
    }

    try {
      api_res = await (callGraphql(ctx, shop, `{
          order (id: "${order_id}") {
            id
            name
            displayFulfillmentStatus
            fulfillable
            displayFinancialStatus
            capturable         
            fulfillments(first: 10) {
              id
              createdAt
              deliveredAt
              displayStatus
              status
              trackingInfo {
                number
                company
              }
              service {
                id
                handle
                serviceName
                type
              }         
            }            
            transactions(first: 10) {
              id
              status
              gateway
              formattedGateway
              kind
              manuallyCapturable
              amountSet {
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              parentTransaction {
                id
              }
              paymentDetails {
                ... on CardPaymentDetails {
                  avsResultCode
                  bin
                  company
                  cvvResultCode
                  expirationMonth
                  expirationYear
                  name
                  number
                  paymentMethodName
                  wallet
                }
              }              
            }
            fulfillmentOrders(first: 10) {
              edges {
                node {
                  id
                  createdAt
                  status
                  requestStatus
                  supportedActions {
                    action
                    externalUrl
                  }
                }
              }
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      error += e;
    }
  }

  // 2. Register this app's fulfillment service as a location.
  const fs = ctx.request.query.fs;
  if (typeof fs !== UNDEFINED && fs === 'true') {
    try {
      api_res = await (callGraphql(ctx, shop, `{
        shop {
          id
          metafield(namespace: "barebone_app", key: "fullfillment_service") {
            value
          }
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      const shop_id = api_res.data.shop.id;
      let fs_id = null;
      if (api_res.data.shop.metafield != null) {
        fs_id = api_res.data.shop.metafield.value;
      }
      if (fs_id != null) {
        api_res = await (callGraphql(ctx, shop, `mutation fulfillmentServiceDelete($id: ID!) {
          fulfillmentServiceDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "id": fs_id
        }));
        if (api_res.data.fulfillmentServiceDelete.userErrors.length > 0) {
          error += api_res.data.fulfillmentServiceDelete.userErrors.map((e) => { return e.message; }).toString();
        }
        fs_id = null;
      }
      api_res = await (callGraphql(ctx, shop, `mutation fulfillmentServiceCreate($callbackUrl: URL!, $fulfillmentOrdersOptIn: Boolean!, 
        $inventoryManagement: Boolean!, $permitsSkuSharing: Boolean!, $trackingSupport: Boolean!, $name: String!) {
        fulfillmentServiceCreate(callbackUrl: $callbackUrl, fulfillmentOrdersOptIn: $fulfillmentOrdersOptIn, 
          inventoryManagement: $inventoryManagement, permitsSkuSharing: $permitsSkuSharing, trackingSupport: $trackingSupport, name: $name) {
          fulfillmentService {
            id
            serviceName
            callbackUrl
            fulfillmentOrdersOptIn
            inventoryManagement            
            permitsSkuSharing
            location {
              id
            }
            type          
          }
          userErrors {
            field
            message
          }
        }
      }`, null, GRAPHQL_PATH_ADMIN, {
        "callbackUrl": `https://${ctx.request.host}`,
        "fulfillmentOrdersOptIn": true,
        "inventoryManagement": true,
        "permitsSkuSharing": true,
        "trackingSupport": true,
        "name": "Barebone app fulfillment service"
      }));
      if (api_res.data.fulfillmentServiceCreate.userErrors.length > 0) {
        error += api_res.data.fulfillmentServiceCreate.userErrors.map((e) => { return e.message; }).toString();
      } else {
        fs_id = api_res.data.fulfillmentServiceCreate.fulfillmentService.id;
      }
      if (fs_id != null) {
        api_res = await (callGraphql(ctx, shop, `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, {
          "metafields": [
            {
              "key": "fullfillment_service",
              "namespace": "barebone_app",
              "ownerId": shop_id,
              "value": `${fs_id}`,
              "type": "single_line_text_field"
            }
          ]
        }));
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      error += e;
    }
  }

  // 3. Send inventories to this app's fuilfillment service location.
  const delta = ctx.request.query.delta;
  const name = ctx.request.query.name;
  const reason = ctx.request.query.reason;
  const uri = ctx.request.query.uri;
  if (typeof delta !== UNDEFINED && typeof name !== UNDEFINED && typeof reason !== UNDEFINED && typeof uri !== UNDEFINED) {
    try {
      api_res = await (callGraphql(ctx, shop, `{
        shop {
          id
          metafield(namespace: "barebone_app", key: "fullfillment_service") {
            value
          }
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      let fs_id = null;
      if (api_res.data.shop.metafield == null) {
        error += "This app's fulfillment service is not found!";
      } else {
        fs_id = api_res.data.shop.metafield.value;
      }
      if (fs_id != null) {
        api_res = await (callGraphql(ctx, shop, `{
          fulfillmentService(id: "${fs_id}") {
            id
            serviceName
            location {
              id
              inventoryLevels(first: 10) {
                edges {
                  node {
                    id
                    item {
                      id
                      variant {
                        id
                        title
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
        if (api_res.data.fulfillmentService.location.inventoryLevels.edges.length == 0) {
          error += "This app's fulfillment service has no inventoryLevels! Check if it is used by at least one product as inventort location.";
        } else {
          for await (const edge of api_res.data.fulfillmentService.location.inventoryLevels.edges) {
            const res = await (callGraphql(ctx, shop, `mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
                inventoryAdjustQuantities(input: $input) {
                  inventoryAdjustmentGroup {
                    id
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`, null, GRAPHQL_PATH_ADMIN, {
              "input": {
                "changes": [
                  {
                    "delta": parseInt(delta),
                    "inventoryItemId": edge.node.item.id,
                    "locationId": api_res.data.fulfillmentService.location.id,
                    "ledgerDocumentUri": uri
                  }
                ],
                "name": name,
                "reason": reason
              }
            }));
            if (res.data.inventoryAdjustQuantities.userErrors.length > 0) {
              error += res.data.inventoryAdjustQuantities.userErrors.map((e) => { return e.message; }).toString();
            }
          }
        }
      }
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
      error += e;
    }
  }

  ctx.set('Content-Type', 'application/json');
  ctx.body = {
    "response": api_res.data,
    "error": error
  };
  console.log(`body: ${JSON.stringify(ctx.body)}`);
  ctx.status = 200;

});

/* --- Fulfillment service endpoint --- */
// See https://shopify.dev/docs/api/admin-graphql/unstable/objects/FulfillmentService
// The validation and request data are the same as webhooks.
router.post('/fulfillment_order_notification', async (ctx, next) => {
  console.log("*************** fulfillment_order_notification ***************");
  console.log(`*** request *** ${JSON.stringify(ctx.request)}`);
  console.log(`*** body *** ${JSON.stringify(ctx.request.body)}`);

  /* Check the signature */
  const valid = await (checkWebhookSignature(ctx, API_SECRET));
  if (!valid) {
    console.log('Not a valid signature');
    ctx.status = 401;
    return;
  }

  const shop = ctx.request.header["x-shopify-shop-domain"];

  callGraphql(ctx, shop, `query {
      shop {
        assignedFulfillmentOrders(first: 10, assignmentStatus: FULFILLMENT_REQUESTED) {
          edges {
            node {
              id
              destination {
                firstName
                lastName
                address1
                city
                province
                zip
                countryCode
                phone
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    productTitle
                    sku
                    remainingQuantity
                  }
                }
              }
              merchantRequests(first: 10, kind: FULFILLMENT_REQUEST) {
                edges {
                  node {
                    message
                    requestOptions
                  }
                }
              }
            }
          }
        }
      }
    }`, null, GRAPHQL_PATH_ADMIN, null).then((api_res) => {
    api_res.data.shop.assignedFulfillmentOrders.edges.map((e) => {
      callGraphql(ctx, shop, `mutation acceptFulfillmentRequest {
            fulfillmentOrderAcceptFulfillmentRequest(
              id: "${e.node.id}",
              message: "Your request has been accepted!"){
              fulfillmentOrder {
                status
                requestStatus
              }
            }
          }`, null, GRAPHQL_PATH_ADMIN, null).then((res) => {
        callGraphql(ctx, shop, `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
                fulfillmentCreateV2(fulfillment: $fulfillment) {
                  fulfillment {
                    id
                    name
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`, null, GRAPHQL_PATH_ADMIN, {
          "fulfillment": {
            "lineItemsByFulfillmentOrder": [
              {
                "fulfillmentOrderId": e.node.id
              }
            ],
            "trackingInfo": {
              "company": "Barebone app shipping carrier",
              "number": `service-${new Date().getTime()}`,
              "url": "https://github.com/benzookapi"
            }
          }
        });
      });
    });
  });

  ctx.status = 200;
});

/* --- Fulfillment service tracking number endpoint --- */
// See https://shopify.dev/docs/api/admin-graphql/unstable/objects/FulfillmentService
// See https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps/manage-fulfillments#step-8-optional-enable-tracking-support
router.get('/fetch_tracking_numbers.json', async (ctx, next) => {
  console.log("*************** fetch_tracking_numbers.json ***************");
  console.log(`*** request *** ${JSON.stringify(ctx.request)}`);
  console.log(`*** query *** ${JSON.stringify(ctx.request.query)}`);

  const shop = ctx.request.query.shop;
  console.log(`shop ${shop}`);

  const order_names = ctx.request.query["order_names[]"];
  console.log(`order_names ${JSON.stringify(order_names)}`);

  const body = {
    "tracking_numbers": {},
    "message": "Successfully received the tracking numbers",
    "success": true
  };

  order_names.map((n) => {
    body.tracking_numbers[n] = `service-fetch-${new Date().getTime()}`;
  });

  console.log(`body ${JSON.stringify(body)}`);

  ctx.set('Content-Type', 'application/json');
  ctx.body = body;
  ctx.status = 200;
});

/* --- Fulfillment service inventory endpoint --- */
// See https://shopify.dev/docs/api/admin-graphql/unstable/objects/FulfillmentService
// See https://shopify.dev/docs/apps/fulfillment/fulfillment-service-apps/manage-fulfillments#step-9-optional-share-inventory-levels-with-shopify
router.get('/fetch_stock.json', async (ctx, next) => {
  console.log("*************** fetch_stock.json ***************");
  console.log(`*** request *** ${JSON.stringify(ctx.request)}`);
  console.log(`*** query *** ${JSON.stringify(ctx.request.query)}`);

  const shop = ctx.request.query.shop;
  console.log(`shop ${shop}`);
  const location_id = ctx.request.query.location_id;
  console.log(`location_id ${location_id}`);
  const sku = ctx.request.query.sku;
  console.log(`sku ${sku}`);

  const body = {};
  // THIS IS DUMMY CODE, you need to retrieve real SKU and iventory data somehow.
  if (typeof sku !== UNDEFINED) {
    body[sku] = Math.floor(Math.random() * 2000);
  } else {
    body.DUMMYSKU2000 = Math.floor(Math.random() * 3000);
    body.DUMMYSKU3000 = Math.floor(Math.random() * 4000);
  }

  console.log(`body ${JSON.stringify(body)}`);

  ctx.set('Content-Type', 'application/json');
  ctx.body = body;
  ctx.status = 200;
});

/* --- Multipass sample endpoint for admin --- */
// See https://shopify.dev/docs/api/multipass
router.get('/multipass', async (ctx, next) => {
  console.log("+++++++++++++++ /multipass +++++++++++++++");

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

    const api_errors = {
      "errors": 0,
      "apis": []
    };

    try {
      let api_res = await (callGraphql(ctx, shop, `{
        shop {
          id
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      const id = api_res.data.shop.id;
      const secret = ctx.request.query.secret;
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
            "key": "multipass_secret",
            "namespace": "barebone_app",
            "ownerId": id,
            "type": "single_line_text_field",
            "value": secret
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

    // Send the error count.
    ctx.body.result.response = api_errors;
    ctx.status = 200;
    return;
  }

  if (typeof ctx.request.query.login_shop !== UNDEFINED) {
    const shop = ctx.request.query.login_shop;
    return await ctx.render('sso', {
      shop: shop
    });
  }

  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }
  const shop = ctx.request.query.shop;
  setContentSecurityPolicy(ctx, shop);
  await ctx.render('index', {});

});

/* --- Multipass sample endpoint for login --- */
// See https://shopify.dev/docs/api/multipass
router.post('/multipass', async (ctx, next) => {
  console.log("+++++++++++++++ /multipass +++++++++++++++");
  console.log(`body: ${JSON.stringify(ctx.request.body, null, 4)}`);

  const shop = ctx.request.body.shop;

  console.log(`shop ${shop}`);

  const email = ctx.request.body.email;
  const identifier = ctx.request.body.identifier;
  const first_name = ctx.request.body.first_name;
  const last_name = ctx.request.body.last_name;
  const tag_string = ctx.request.body.tag_string;
  const remote_ip = ctx.request.body.remote_ip;
  const return_to = ctx.request.body.return_to;

  const json = {};
  if (email !== '') json.email = email;
  if (identifier !== '') json.identifier = identifier;
  if (first_name !== '') json.first_name = first_name;
  if (last_name !== '') json.last_name = last_name;
  if (tag_string !== '') json.tag_string = tag_string;
  if (remote_ip !== '') json.remote_ip = remote_ip;
  if (return_to !== '') json.return_to = return_to;
  json.created_at = new Date().toISOString();

  try {
    const api_res = await (callGraphql(ctx, shop, `{
      shop {
        id
        metafield(namespace: "barebone_app", key: "multipass_secret") {
          id
          value
        }
      }
    }`, null, GRAPHQL_PATH_ADMIN, null));

    const token = generateMultipassToken(json, api_res.data.shop.metafield.value);

    ctx.redirect(`https://${shop}/account/login/multipass/${token}`);

  } catch (e) {
    console.log(`${e}`);
    ctx.status = 500;
    ctx.body = { "Error": "Wrong store domain or secret passed" };
    return;
  }

});

/* --- Bulk operation sample endpoint --- */
// See https://shopify.dev/docs/api/usage/bulk-operations
router.get('/bulkoperation', async (ctx, next) => {
  console.log("+++++++++++++++ /bulkoperation +++++++++++++++");
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

    ctx.set('Content-Type', 'application/json');

    let api_res = {};

    const key = ctx.request.query.key;
    if (typeof key !== UNDEFINED && key !== '') {
      try {
        api_res = await (callGraphql(ctx, shop, `mutation {
          bulkOperationRunMutation(
            mutation: "mutation call($input: ProductInput!) { productCreate(input: $input) { product {id title variants(first: 10) {edges {node {id title inventoryQuantity }}}} userErrors { message field } } }",
            stagedUploadPath: "${key}") {
            bulkOperation {
              id
              url
              status
            }
            userErrors {
              message
              field
            }
          }
        }`, null, GRAPHQL_PATH_ADMIN, null));
      } catch (e) {
        console.log(`${JSON.stringify(e)}`);
      }
      ctx.body = api_res;
      return;
    }

    const check = ctx.request.query.check;
    if (typeof check !== UNDEFINED && check === 'true') {
      try {
        api_res = await (callGraphql(ctx, shop, `{
          currentBulkOperation(type: MUTATION) {
             id
             status
             errorCode
             createdAt
             completedAt
             objectCount
             fileSize
             url
             partialDataUrl
          }
         }`, null, GRAPHQL_PATH_ADMIN, null));
      } catch (e) {
        console.log(`${JSON.stringify(e)}`);
      }
      ctx.body = api_res;
      return;
    }

    const id = ctx.request.query.id;
    if (typeof id !== UNDEFINED && id !== '') {
      try {
        api_res = await (callGraphql(ctx, shop, `mutation {
          bulkOperationCancel(id: "${id}") {
            bulkOperation {
              status
            }
            userErrors {
              field
              message
            }
          }
        }
        `, null, GRAPHQL_PATH_ADMIN, null));
      } catch (e) {
        console.log(`${JSON.stringify(e)}`);
      }
      ctx.body = api_res;
      return;
    }

    try {
      api_res = await (callGraphql(ctx, shop, `mutation {
        stagedUploadsCreate(input:{
          resource: BULK_MUTATION_VARIABLES,
          filename: "bulk_op_vars",
          mimeType: "text/jsonl",
          httpMethod: POST
        }){
          userErrors{
            field,
            message
          },
          stagedTargets{
            url,
            resourceUrl,
            parameters {
              name,
              value
            }
          }
        }
      }
      `, null, GRAPHQL_PATH_ADMIN, null));
    } catch (e) {
      console.log(`${JSON.stringify(e)}`);
    }
    ctx.body = api_res;
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

/* --- App proxies sample endpoint --- */
// See https://shopify.dev/apps/online-store/app-proxies
router.all('/appproxy', async (ctx, next) => {
  console.log("+++++++++++++++ /appproxy +++++++++++++++");
  console.log(`request ${JSON.stringify(ctx.request, null, 4)}`);
  console.log(`body ${JSON.stringify(ctx.request.body, null, 4)}`);

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
    "query": ctx.request.query,
    "body": ctx.request.body,
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
    <li>For the validation details, see <a href="https://shopify.dev/apps/auth/oauth/session-tokens/getting-started#step-3-decode-session-tokens-for-incoming-requests" target="_blank">this document</a>.</li>
    <li>If you don't want to reveal the token in the query, you can use body POST approach with a hidden tag, too.</li>
    </ul>
    <p><a href="https://${getAdminFromShop(shop)}">Go back to Shopify admin</a></p>`;
  }

  // If the app is not embedded, the app top URL passes the shop in its own JWT with this paramater. 
  if (typeof ctx.request.query.my_token !== UNDEFINED) {
    console.log('My Token given');
    const token = ctx.request.query.my_token;
    let decoded_token = null;
    try {
      decoded_token = decodeJWT(token);
    } catch (e) {
      console.log(`${e}`);
    }
    if (decoded_token == null) {
      ctx.body = { "Error": "Wrong token passed." };
      ctx.status = 400;
      return;
    }
    console.log(`decoded_token ${JSON.stringify(decoded_token, null, 4)}`);

    const shop = decoded_token.shop;

    target = `<p>You are connecting to: <h3>${shop}</h3></p>`;

    details = `<p><b>The following is the received your own JWT token with the shop which you can never falsify</b> 
    (try it in <a href="https://jwt.io" target="_blank">jwt.io</a> by copying the text below and change the shop to paste to '?my_token=' above).</p>
    <pre>${token}</pre>
    <ul>
    <li>This is supposed to be used for <b>Non embedded apps</b> which cannot use AppBridge or its Session Token.</li>
    <li>If you don't want to reveal the token in the query, you can use body POST approach with a hidden tag, too.</li>
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
  console.log(`*** body *** ${JSON.stringify(ctx.request.body)}`);

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
  console.log(`*** request *** ${JSON.stringify(ctx.request)}`);
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

/* --- Generate a token for Multipass with a given customer data and secret --- */
// See https://shopify.dev/docs/api/multipass
const generateMultipassToken = function (json, secret) {
  const json_str = JSON.stringify(json);
  console.log(`generateMultipassToken json ${json_str} secret ${secret}`);
  const keyMaterial = crypto.createHash('sha256').update(secret).digest();
  const encryptionKey = keyMaterial.slice(0, 16);
  const signatureKey = keyMaterial.slice(16, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-128-cbc', encryptionKey, iv);
  const cipherText = Buffer.concat([iv, cipher.update(json_str, 'utf8'), cipher.final()]);
  const signed = crypto.createHmac("SHA256", signatureKey).update(cipherText).digest();
  const token = Buffer.concat([cipherText, signed]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  console.log(`generateMultipassToken token ${token}`);
  return token;
}

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