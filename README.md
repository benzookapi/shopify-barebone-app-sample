# Overview
A sample code for Shopify app for scratch build. Read [this](https://shopify.dev/apps/auth/oauth/getting-started) first.


# How to run
Just pushing to Heroku or Render with the following system variables is the easiest way to run, or npm start locally maybe.

SHOPIFY_API_KEY:              YOUR_API_KEY

SHOPIFY_API_SECRET:           YOUR_API_SECRET

SHOPIFY_API_VERSION:          2023-01

SHOPIFY_API_SCOPES:           write_products,write_discounts,read_orders

SHOPIFY_MONGO_DB_NAME:        YOUR_DB_NAME (any name is OK)

SHOPIFY_MONGO_URL:            mongodb://YOUR_ID:YOUR_PASSWORD@YOUR_DOMAIN:YOUR_PORT/YOUR_DB_NAME

# Installation Endpoint
`https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=YOUR_API_SCOPES&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=`　

*Don't forget add `YOUR_APP_URL` and `YOUR_APP_URL/callback` endpoint to your app configration.

# Map your webhook paths with GDRP webhooks
https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks

customers/data_request:  /webhookgdprcustomerreq

customers/redact:  /webhookgdprcustomerdel

shop/redact:  /webhookgdprshopdel






