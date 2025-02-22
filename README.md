# Overview
This is _unoffical_ sample code for scratch building [Shopify app](https://shopify.dev/apps) _without_ [CLI automatic cocde generation](https://shopify.dev/apps/getting-started/create) for learing how it works with simple React and GraphQL knowledge.

Making clear, simple, and fewest code is this purpose that's why it doesn't use the CLI generated code.

Reading [Shopify OAuth flow](https://shopify.dev/apps/auth/oauth/getting-started) might help you to grab the basic.

For quick start with automatically generated code, go to the [official CLI tutorial](https://shopify.dev/apps/getting-started/build-app-example).

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

--------- Extensions with Shopify CLI generation and deployment (Liquid/React/JavaScript/Wasm, etc.) ---------
extensions/ ... automatically generated directory and code by Shopify CLI `npm run generate extension`.

  ./my-XXXXX-ext ... each extension (Theme App / Shopify Functions / Checkout UI / Post-purchase / Web Pixels /... etc.) source.
    ../shopify.extension.toml ... each extension configuration required by CLI commands.
```

[React](https://react.dev/) ([JSX](https://react.dev/learn/writing-markup-with-jsx), [Props](https://react.dev/learn/passing-props-to-a-component), [State](https://react.dev/learn/state-a-components-memory), [Hooks](https://react.dev/reference/react/hooks), etc.) and [GraphQL](https://graphql.org/) ([Query](https://graphql.org/learn/queries/), [Edges](https://graphql.org/learn/pagination/#pagination-and-edges), [Union](https://graphql.org/learn/schema/#union-types), etc.) are mandatory technologies for manipulating this sample.


For creating React frontend, the following contents might help you.
- [App Bridge Actions](https://shopify.dev/apps/tools/app-bridge/actions)
- [Polaris Compoments by React](https://polaris.shopify.com/components)

For extensions like Admin Link, Theme App Extensinons, Shopify Functtions, and Checkout Extensions, refer to the [app extensions](https://shopify.dev/apps/app-extensions) page.

# How to run
1. Add the following environmental variables locally or in cloud platforms like Render / Heroku / Fly, etc.
    ```
    SHOPIFY_API_KEY:              YOUR_API_KEY (Copy and paste from your app settings in partner dashboard)
    SHOPIFY_API_SECRET:           YOUR_API_SECRET (Copy and paste from your app settings in partner dashboard)
    SHOPIFY_API_VERSION:          unstable         

    SHOPIFY_DB_TYPE:              MONGODB (Default) / POSTGRESQL / MYSQL

    // The followings are required if you set SHOPIFY_DB_TYPE 'MONGODB'
    SHOPIFY_MONGO_DB_NAME:        YOUR_DB_NAME (any name is OK)
    SHOPIFY_MONGO_URL:            mongodb://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN:YOUR_PORT/YOUR_DB_NAME

    // The followings are required if you set SHOPIFY_DB_TYPE 'POSTGRESQL'
    SHOPIFY_POSTGRESQL_URL:       postgres://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN(:YOUR_PORT)/YOUR_DB_NAME

    // The followings are required if you set SHOPIFY_DB_TYPE 'MYSQL'
    SHOPIFY_MYSQL_HOST:           YOUR_DOMAIN
    SHOPIFY_MYSQL_USER:           YOUR_USER
    SHOPIFY_MYSQL_PASSWORD:       YOUR_PASSWORD
    SHOPIFY_MYSQL_DATABASE:       YOUR_DB_NAME

    // The followings are required if you use `webhookcommon` endpoint as a manually created webhook target.
    SHOPIFY_WEBHOOK_SECRET:       YOUR_TEST_STORE_WEBHOOK_SIGNATURE given by the webhook creation settings

    ```

2. Install [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and build and run the app server locally or in cloud platforms. All settings are described in `package.json` (note that the built React code contains `SHOPIFY_API_KEY` value from its envrionment variable, so if you run it with your own app, you have to run the build command below at least one time).
    ```
    Build command = npm install && npm run build (= cd frontend && npm install && npm run build && rm -rf ../public/assets && mv dist/assets ../public/assets && mv dist/index.html ../views/index.html  *Replacing Koa intex file with Vite buit code)

    Start command = npm run start (= node app.js)
    ```

3. If you run locally, you need to tunnel localhost for public URL as follows (otherwise, you should use the command lines above for Render or other cloud platform deploy scripts).
    ```
    cloudflared tunnel --url localhost:3000 or ./ngrok http 3000
    ```

4. (For PostgreSQL or MySQL users only,) create the following table in your database (in `psql` or `mysql` command or other tools).
    ```
    For PostgreSQL:

    CREATE TABLE shops ( _id VARCHAR NOT NULL PRIMARY KEY, data json NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );

    For MySQL:

    CREATE TABLE shops ( _id VARCHAR(500) NOT NULL PRIMARY KEY, data JSON NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );

    ```

5. Turn **OFF** [Development store preview] in app extensions menu.

6. Create `shopify.app.toml` file in the root directory copied from [this page](https://shopify.dev/docs/apps/tools/cli/configuration) and replace each value as follows.
    - _name_ = `YOUR_APP_NAME`
    - _client_id_ = `SHOPIFY_API_KEY`
    - _application_url_ = `YOUR_APP_URL` (***1**)
    - _handle_ = `YOUR_CREATED_ONE_IN_PARTNER_DASHBOARD`
    - _scopes in [access_scopes]_ = "write_products,write_discounts,write_orders,write_payment_customizations,write_delivery_customizations,write_pixels,read_customer_events,write_customers,write_assigned_fulfillment_orders,write_merchant_managed_fulfillment_orders,write_third_party_fulfillment_orders,write_fulfillments,write_inventory,unauthenticated_write_checkouts,unauthenticated_read_product_listings,unauthenticated_write_customers,unauthenticated_read_selling_plans"
    - _redirect_urls in [auth]_ = [`YOUR_APP_URL/callback`]
    - _api_version in [webhooks]_ = `SHOPIFY_API_VERSION`
    - _customer_deletion_url in [webhooks]_ = `YOUR_APP_URL/webhookgdpr`
    - _customer_data_request_url in [webhooks]_ = `YOUR_APP_URL/webhookgdpr`
    - _shop_deletion_url in [webhooks]_ = `YOUR_APP_URL/webhookgdpr`
    - _url in [app_proxy]_ = `YOUR_APP_URL/appproxy`
    - _subpath in [app_proxy]_ = "bareboneproxy"
    - _prefix in [app_proxy]_ = "apps"
    - _url in [app_preferences]_ = `YOUR_APP_URL`

    ***1** `YOUR_APP_URL` is your cloudflared or ngrok or other platform `root` URL. If you add `?external=true` parameter to `YOUR_APP_URL`, the app UX turns into a [service connector](https://github.com/benzookapi/shopify-barebone-app-sample/wiki#for-external-service-connection) which tries to connect Shopify stores with their users. **Note that if you disable the app embedded (non embedeed app), App Bridge and its Session Token cannot be used so this app shows the same external page using its own JWT which contains "shop", instead of Session Token.** (See [this demo](https://github.com/benzookapi/shopify-barebone-app-sample/wiki#non-embedded-apps-cannot-use-app-bridge-or-session-token-so-should-render-the-external-page-with-your-own-jwt))

7. Execute `shopify app deploy --reset` and follow its instruction (choose your partner account, connecting to the exising app, include your configuration on deploy = YES, etc.) which registers extensions to your exising app and create `/.env` file which has extensiton ids used by this sample app (For [Shopify Functions](https://shopify.dev/api/functions) deployment using [Rust](https://www.rust-lang.org/), you need [Cargo](https://doc.rust-lang.org/cargo/) Wasm package installed first by `cargo install cargo-wasi`).

8. For updating the extensions, execute `shopify app deploy` (without `--reset`) to apply (upload) your local modified files to the created extensions (`--reset` is used for changing your targeted app only).

# How to install
Access to the following endpoit.
`https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=`　

Or 

`you can install to your development stores from the app settings in partner dashboard.`

# Sample list
All sample are available at [Wiki](../../wiki).

# Trouble shooting
- Your server needs to render the top page at acceptable speed in the right way. Too slow access, error HTTP codes, or server shutdown causes the error above in live stores (not in development ones). Some cloud plarform like Render, Heroku, etc do the very slow response for the first time in a while with free plans, so you need to swtich to [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or [ngrok](https://ngrok.com/) hosting or pay those services for higher performence.

# TIPS
- If you want to create other language versions of this app like PHP, Java, Ruby, Python, etc., the best way is [creating an extension-only app](https://shopify.dev/docs/apps/app-extensions/extension-only-apps) by **not choosing a Remix template in CLI steps** to add your server side code manually. 
- If you fail to get [protected customer data](https://shopify.dev/docs/apps/store/data-protection/protected-customer-data) in Checkout UI Extension or API Webhook creation even in dev. stores, submit your app first which enable you get them (this is for `public app distribution` only).
- If you update some environment variables shared with `shopify.app.toml` (e.g. `SHOPIFY_API_KEY`), change the coressponding value in the file to run `shopify app deploy` to apply the change to the app configration in partner dashboard (if you change other toml file values, do the same).
- If you manage multiple apps in this single source code and swtich the target app, follow the steps below.
    1. Change the environment variables of `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` and apply them (export).
    2. Execute `shopify app deploy --reset` and choose the target app (it is supposed to be created manually).
    3. Enter the new toml file name or leave blank for the app.
    4. The new toml file gets generated for the new app with the current config values in partner dashboard.
    5. Remember to replace `scopes in [auth]` with the same value as the original toml file which must be blank by default.
- [Checkout UI Extension Integration Deep Dive](../../wiki/Checkout-UI-Extension-Integration-Deep-Dive) (Japanese version is [here](../../wiki/Checkout-UI-Extension-%E5%AE%9F%E8%A3%85%E8%A9%B3%E7%B4%B0)) help you to understand how the extension work deeply and avoid some pitfalls.

# Disclaimer
- This code is fully _unofficial_ and NOT guaranteed to pass [the public app review](https://shopify.dev/apps/store/review) for Shopify app store. The official requirements are described [here](https://shopify.dev/apps/store/requirements). 
- You need to follow [Shopi API Licene and Terms of Use](https://www.shopify.com/legal/api-terms) even for custom app usage.
- This code is supposed to be used as tutorials mainly for catching up Shopify app dev and does **NOT** guarantees all security covered like [this consideration](https://shopify.dev/docs/api/checkout-ui-extensions/unstable/configuration#network-access). If you use this code for your production, **all resposibilties are owned by you**.
