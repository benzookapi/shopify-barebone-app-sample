# Overview
A sample code for Shopify app for scratch build. Read [this](https://shopify.dev/apps/auth/oauth/getting-started) first.


# Code structure

```
./app.js ... Koa Node.js app for backend for app install endpoints, GraphQL API calls, and DB access, etc. No Shopify libraries or CLI generated code used.

./package.json ... app.js used npm libaries.

./views ... holds index.html buit by Vite below to be rendered by app.js above on server side.

./frontend ... React code base to be built by Vite for app admin UI. All built code runs at the client = browser as minized JS + CSS.
  ../index.html ... source of ./views/index.html to be built by Vite which renders the root React compoment, App.
  ../src ... React source code with JSX of Shopify App Bridge + Polaris.
  ../package.json ... All React code used npm libraries and scripts for running Vite.
  ../vite.config.js ... Vite congfig file for building React code into real runnable minized JS + CSS on browsers.
```

# How to run

Add the following environmental variables locally or cloud platform like Render / Heroku / Fly, etc.

```
  SHOPIFY_API_KEY:              YOUR_API_KEY

  SHOPIFY_API_SECRET:           YOUR_API_SECRET

  SHOPIFY_API_VERSION:          2023-01

  SHOPIFY_API_SCOPES:           write_products,write_discounts,read_orders


  SHOPIFY_DB_TYPE:              MONGODB (Default) / POSTGRESQL 

  // The followings are required if you set SHOPIFY_DB_TYPE 'MONGODB'

  SHOPIFY_MONGO_DB_NAME:        YOUR_DB_NAME (any name is OK)

  SHOPIFY_MONGO_URL:            mongodb://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN:YOUR_PORT/YOUR_DB_NAME

  // The followings are required if you set SHOPIFY_DB_TYPE 'POSTGRESQL'

  SHOPIFY_POSTGRESQL_URL:       postgres://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN(:YOUR_PORT)/YOUR_DB_NAME
```

# Installation Endpoint
`https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=YOUR_API_SCOPES&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=`　

*Don't forget add `YOUR_APP_URL` and `YOUR_APP_URL/callback` endpoint to your app configration.

# Map your webhook paths with GDRP webhooks
https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks

customers/data_request:  /webhookgdprcustomerreq

customers/redact:  /webhookgdprcustomerdel

shop/redact:  /webhookgdprshopdel






