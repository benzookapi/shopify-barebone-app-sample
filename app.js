'use strict';

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaRequest = require('koa-http-request');
const views = require('koa-views');
const serve = require('koa-static');

const crypto = require('crypto');

const mongo = require('mongodb');

const router = new Router();
const app = module.exports = new Koa();

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

// Mongo URL and DB name for date store
const MONGO_URL = `${process.env.SHOPIFY_MONGO_URL}`;
const MONGO_DB_NAME = `${process.env.SHOPIFY_MONGO_DB_NAME}`;
const MONGO_COLLECTION = 'shops';

router.get('/', async (ctx, next) => {
  console.log("+++++++++++++++ / +++++++++++++++");
  if (!checkSignature(ctx.request.query)) {
    ctx.status = 400;
    return;
  }

  const shop = ctx.request.query.shop;

  let shop_data = null;
  try {
    shop_data = await (getDB(shop));
    let install = false;
    if (shop_data == null) {
      console.log("No shop data");
      install = true;
    } else {
      let api_res = null;
      try {
        api_res = await (callGraphql(ctx, shop, `{
        shop {
          name
        }
      }`, null, GRAPHQL_PATH_ADMIN, null));
      } catch (e) { }
      if (api_res == null || typeof api_res.data.shop.name === UNDEFINED) {
        console.log("The stored access token is invalid");
        install = true;
      }
    }
    if (install) {
      console.log(`Redirecting to OAuth flow for ${shop}...`);
      ctx.redirect(`https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${API_SCOPES}&redirect_uri=https://${ctx.request.hostname}/callback&state=&grant_options[]=`);
      return;
    }
  } catch (e) {
    ctx.status = 500;
    return;
  }

  /*let my_key = '';
  if (typeof shop_data.config !== UNDEFINED) {
    my_key = shop_data.config.my_key;
  }*/

  ctx.response.set('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com;`);
  await ctx.render('index', {});

});

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

  ctx.redirect(`https://admin.shopify.com/store/${shop.replace('myshopify.com', '')}/apps/${api_res.data.app.handle}`);

});

router.get('/configure', async (ctx, next) => {
  console.log("+++++++++++++++ /configure +++++++++++++++");
  //console.log(`+++ query +++ ${JSON.stringify(ctx.request.query)}`);

  const action = ctx.request.query.action;
  const data = ctx.request.query.token;
  console.log(`+++ data +++ ${JSON.stringify(data)}`);

  const shop = data.shop;

  let shop_data = null;
  try {
    shop_data = await (getDB(shop));
    if (shop_data == null) {
      ctx.body = "No shop data";
      ctx.status = 400;
      return;
    }
  } catch (e) {
    ctx.status = 500;
    return;
  }

  if (action == 'save') {
    shop_data.config = {
      "my_key": ctx.request.query.my_key
    };
    setDB(shop, shop_data).then(function (api_res) {
      callGraphql(ctx, shop, `mutation XXX`, null, GRAPHQL_PATH_ADMIN, {
      }).then(function (api_res) { }).catch(function (e) { });
    }).catch(function (e) { });
  }

  await ctx.render('index', {
    my_key: ctx.request.query.my_key
  });

});

/* 
 * 
 * --- GDPR Webhook for customer data request ---
 * 
*/
router.post('/webhookgdprcustomerreq', async (ctx, next) => {
  console.log("*************** webhookgdprcustomerreq ***************");
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

/* 
 * 
 * --- GDPR Webhook for customer data deletion ---
 * 
*/
router.post('/webhookgdprcustomerdel', async (ctx, next) => {
  console.log("*************** webhookgdprcustomerdel ***************");
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

/* 
 * 
 * --- GDPR Webhook for shop data deletion ---
 * 
*/
router.post('/webhookgdprshopdel', async (ctx, next) => {
  console.log("*************** webhookgdprshopdel ***************");
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
  let signarure = hmac.digest('hex');
  console.log(`checkSignature ${signarure}`);
  return signarure === sig ? true : false;
};

/* --- Check if the given signarure is corect or not for Webhook --- */
const checkWebhookSignature = function (ctx, secret) {
  return new Promise(function (resolve, reject) {
    console.log(`checkWebhookSignature Headers ${JSON.stringify(ctx.headers)}`);
    let receivedSig = ctx.headers["x-shopify-hmac-sha256"];
    console.log(`checkWebhookSignature Given ${receivedSig}`);
    if (receivedSig == null) return resolve(false);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(ctx.request.rawBody, 'utf8').toString('utf8'));
    let signarure = hmac.digest('base64');
    console.log(`checkWebhookSignature Created: ${signarure}`);
    return resolve(receivedSig === signarure ? true : false);
  });
};

/* --- Call Shopify GraphQL --- */
const callGraphql = function (ctx, shop, ql, token = null, path = GRAPHQL_PATH_PAYMENT, vars = null) {
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
const insertDB = function (key, data, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`insertDB Connected: ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`insertDB Used: ${MONGO_DB_NAME} - ${collection}`);
      console.log(`insertDB insertOne, _id:${key}`);
      dbo.collection(collection).insertOne({ "_id": key, "data": data, "created_at": new Date(), "updated_at": new Date() }).then(function (res) {
        db.close();
        return resolve(0);
      }).catch(function (e) {
        console.log(`insertDB Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`insertDB Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Retrive Shopify data in database --- */
const getDB = function (key, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    console.log(`getDB MONGO_URL ${MONGO_URL}`);
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`getDB Connected ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`getDB Used ${MONGO_DB_NAME} - ${collection}`);
      console.log(`getDB findOne, _id:${key}`);
      dbo.collection(collection).findOne({ "_id": `${key}` }).then(function (res) {
        db.close();
        if (res == null) return resolve(null);
        return resolve(res.data);
      }).catch(function (e) {
        console.log(`getDB Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`getDB Error ${e}`);
      return reject(e);
    });
  });
};

/* --- Update Shopify data in database --- */
const setDB = function (key, data, collection = MONGO_COLLECTION) {
  return new Promise(function (resolve, reject) {
    mongo.MongoClient.connect(MONGO_URL).then(function (db) {
      //console.log(`setDB Connected ${MONGO_URL}`);
      var dbo = db.db(MONGO_DB_NAME);
      console.log(`setDB Used ${MONGO_DB_NAME} - ${collection}`);
      console.log(`setDB findOneAndUpdate, _id:${key}`);
      dbo.collection(collection).findOneAndUpdate({ "_id": `${key}` }, { $set: { "data": data, "updated_at": new Date() } }, { new: true }).then(function (res) {
        db.close();
        return resolve(res);
      }).catch(function (e) {
        console.log(`setDB Error ${e}`);
        return reject(e);
      });
    }).catch(function (e) {
      console.log(`setDB Error ${e}`);
      return reject(e);
    });
  });
};

app.use(router.routes());
app.use(router.allowedMethods());

if (!module.parent) app.listen(process.env.PORT || 3000);