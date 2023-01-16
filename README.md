# Overview
A sample code for scratch building [Shopify app](https://shopify.dev/apps) _WITHOUT_ [CLI automatic cocde generation](https://shopify.dev/apps/getting-started/create).

Read [this](https://shopify.dev/apps/auth/oauth/getting-started) first.

# Code structure
```
--------- Backend process in a server (Node.js) ---------
app.js ... Koa Node.js app for backend for app install endpoints, GraphQL API calls, and DB access, etc. No Shopify libraries or CLI generated code used.

package.json ... app.js used npm libaries and scripts for building and running this app.

views/ ... holds Koa Node.js dynamic rendering htmls. This is a SPA app which uses index.html only generated by Vite build in frontend.
  ./index.html ... Koa top page view rendered by app.js server code (for code running, this needs replaced with Vite built one).
public/ ... holds static files hosted by app.js server code (for code running, this needs replaced with Vite built one).

--------- Frontend UI in a browser (React) ---------
frontend/ ... React code base to be built by Vite for app admin UI. All built code runs at the client = browser as minized JS + CSS.

  ./src/ ... React source code with JSX of Shopify App Bridge + Polaris.
  ./index.html ... replaces views/index.html as a Vite built file which renders the root React compoment.  
  ./public/ ... Static files used by React code.
  
  ./package.json ... React code used npm libraries and scripts for building React code with Vite.
  ./vite.config.js ... Vite congfig file for building React code into real runnable minized JS + CSS on browsers.

--------- Extensions with Shopify CLI generation and deployment (Liquid/JavaScript/Wasm, etc.) ---------
extensions/ ... automatically generated directory and code by Shopify CLI `npm run generate extension`.

.env ... automatically generated file by CLI above too.

shopify.app.toml ... required file by CLI commands.

```

For creating React frontend, the following contents might help you.
- [App Bridge Actions by React](https://shopify.dev/apps/tools/app-bridge/actions)
- [Polaris Compoments by React](https://polaris.shopify.com/components)

For extensions like Admin Link, Theme App Extensinons, Shopify Functtions, and Checkout Extensions, refer to the following page.
- [App extensions](https://shopify.dev/apps/app-extensions)

In this sample, [CLI generated extensions](https://shopify.dev/apps/tools/cli/commands#generate-extension) have some hacky ways for applying to the existing non-CLI-generated codes as bellow.
```
1. Execute `npm install --save @shopify/app @shopify/cli` instead of `npm init @shopify/app@latest`, to add those library dependencies to 'package.json' avoiding overwriting the exising code.

2. Add the following script to 'package.json' "scripts" from another npm init generated app to execute extension commands.
   "shopify": "shopify",
   "dev": "shopify app dev",
   "info": "shopify app info",
   "generate": "shopify app generate",
   "deploy": "shopify app deploy"

3. Add 'shopify.app.toml' copied from another generated code too.

4. For creating extensions to new apps from exsiting codes in '/extensions/', execute `npm run dev --reset` to make a draft extension, and enable "Development Store Preview" in the created extension setting of your partner dashboard 
(NOTE THAT `npm generate extension` is for the initial code generation only, not required for the extension registration or push).
```

# How to run
1. Add the following environmental variables locally or in cloud platforms like Render / Heroku / Fly, etc.
```
  SHOPIFY_API_KEY:              YOUR_API_KEY (Copy and paste from your app settings in the partner dashbord)
  SHOPIFY_API_SECRET:           YOUR_API_SECRET (Copy and paste from your app settings in the partner dashbord)
  SHOPIFY_API_VERSION:          2023-01
  SHOPIFY_API_SCOPES:           write_products,write_discounts,read_orders

  SHOPIFY_DB_TYPE:              MONGODB (Default) / POSTGRESQL

  // The followings are required if you set SHOPIFY_DB_TYPE 'MONGODB'
  SHOPIFY_MONGO_DB_NAME:        YOUR_DB_NAME (any name is OK)
  SHOPIFY_MONGO_URL:            mongodb://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN:YOUR_PORT/YOUR_DB_NAME

  // The followings are required if you set SHOPIFY_DB_TYPE 'POSTGRESQL'
  SHOPIFY_POSTGRESQL_URL:       postgres://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN(:YOUR_PORT)/YOUR_DB_NAME
```

2. Build and run the app server locally or in cloud platforms. All settings are described in ./package.json.
```
Build command = npm install && npm run build (= cd frontend && npm install && npm run build && rm -rf ../public && mv dist ../public && mv ../public/index.html ../views/index.html  *Replacing Koa view files with Vite buit code)

Start command = npm run start (= node app.js)
```

3. If you run locally, you need to ngrok tunnel for public URL as follows (otherwise, the commands above are usable in Render or other platform settings).
```
cd NGROK_DIR && ngrok http 3000
```

4. Set `YOUR_APP_URL` (your ngrok or other platform URL) and `YOUR_APP_URL/callback` to your app settings.

5. (For PostgreSQL user only,) create the used table in your database (in `psql` command or other tools).
```
CREATE TABLE shops ( _id VARCHAR NOT NULL PRIMARY KEY, data json NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );
```
6. For CLI generated extensions, execute `npm run dev --reset` to follow the instruction (choose your partner account, connecting to the exising app, etc.) which registers a draft extensions to your exising app. After the command starts successfully, exit with Ctrl+C and go to the created extension and enable the preview (for dev. store installs, it's enough for testing).

7. For updating the extensions, execute `npm run deploy` to apply (upload) your local code to the created extensions.


# How to install
Access to the following endpoit.
`https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&scope=YOUR_API_SCOPES&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=`　

Or 

`you can install to development stores from the app settings in partner dashbard.`

# Map your webhook paths with GDPR webhooks
https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks

```
customers/data_request:  /webhookgdprcustomerreq

customers/redact:  /webhookgdprcustomerdel

shop/redact:  /webhookgdprshopdel
```

# Sample list

- _Session Token_: '/sessiontoken' 
  - What's App Bridge session token about and how the authenticated request works.
- _Admin Link_: '/adminlink' 
  - How to manage and protect admin links regardless of embedded or unembedded.
- _Theme App Extension_: '/themeappextension' 
  - Basis usage in combination with App Proxies and Theme Editor
- _Function Discount_: '/functiondiscount' 
  - Simple implementation with customer data (TBD, developer preveiw only as of 2023.01)
- _Function Shipping_: '/functionshipping' 
  - Basic usage (TBD, developer preveiw only as of 2023.01)
- _Function Payment_: '/functionpayment' 
  - COD usage with its shipping rate (TBD, developer preveiw only as of 2023.01)
- _Web Pixel_: '/webpixel' 
  - Basic usage (TBD)
- _Checkout Extension_: '/checkoutextension' 
  - Basic usage (TBD, Plus only for live)
- _Fulfillment_: '/fulfillment' 
  - How to create and control fulfillments (shipping) via API for a specific order (TBD)
- _Transaction_: '/transaction' 
  - How to create and control transactions (payments) via API for a specific order (TBD)
- Metaobject: '/metaobject' 
  - Basic usage (TBD)
- _Multipass_: '/multipass' 
  - Simple SSO login implementation (TBD, Plus only for live)
- _B2B_: '/b2b' 
  - Sample for creating a company and its onwed customers for B2B checkout (TBD, Plus only for live)
- _ShopifyQL_: '/shopifyql' 
  - Your own ShopifyQL notebook with API. (TBD)
- _Marketing Activity_: '/marketingactivity' 
  - Basic usage. (TBD)


