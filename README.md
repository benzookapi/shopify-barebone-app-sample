# Overview
This is _unofficial_ sample code for scratch building a [Shopify app](https://shopify.dev/apps) _without_ [CLI automatic code generation](https://shopify.dev/apps/getting-started/create) for learning how it works with simple React Router, React, Preact, Polaris web components, App Bridge, and GraphQL knowledge.

Making clear, simple, and fewest code is this purpose that's why it doesn't use the CLI generated code.

Reading [Shopify OAuth flow](https://shopify.dev/apps/auth/oauth/getting-started) might help you to grab the basic.

For quick start with automatically generated code, go to the [official CLI tutorial](https://shopify.dev/apps/getting-started/build-app-example).

# Code structure
| Area | Source | Role |
| --- | --- | --- |
| App server root | [app/](./app/) | React Router route modules, embedded admin UI pages, and server helpers for OAuth, session token validation, Storefront API, Customer Account API, GraphQL calls, and DB access. No Shopify CLI generated app template is used. |
| HTTP server entry | [server.mjs](./server.mjs) | Thin Express entry that handles the `/postpurchase` and POS `/mocklogin` CORS preflights, plus the authenticated post-purchase extension POST, before delegating all other requests to React Router. |
| HTML shell | [app/root.jsx](./app/root.jsx) | React Router HTML shell that loads the sample stylesheet, App Bridge, and Polaris web components from Shopify CDN. |
| Embedded app chrome | [app/AppShell.jsx](./app/AppShell.jsx) | React Router layout route that renders the App Bridge title bar and `<s-app-nav>` sidebar navigation. |
| Route map | [app/routes.js](./app/routes.js) | Central React Router route definition. |
| HTTP route modules | [app/routes/](./app/routes/) | Thin HTTP entry points. UI routes render pages, selected resource routes ending in `.json` return JSON for authenticated App Bridge fetches, and public routes handle webhooks, app proxy, and callbacks. Simple embedded Admin API operations use Direct API access instead of resource routes. |
| Embedded UI pages | [app/pages/](./app/pages/) | Admin UI samples written directly with Polaris web components such as `<s-page>`, `<s-section>`, and `<s-button>`. |
| Server helpers | [app/lib/](./app/lib/) | Server-side Shopify logic grouped by topic, including OAuth, iframe protection, token validation, Admin GraphQL, Storefront API, Customer Account API, and DB access. |
| Browser helpers | [app/utils/](./app/utils/) | Browser-side App Bridge, Direct Admin API, and URL helpers used by the embedded UI pages. |
| Static app assets | [app/assets/](./app/assets/) | Static source assets imported by route modules, such as the bulk operation sample JSONL file. |
| Global stylesheet | [app/styles.css](./app/styles.css) | Minimal shared stylesheet and a small example of using React Router stylesheet links. |
| Plain storefront view | [views/storefront.html](./views/storefront.html) | Plain custom storefront sample rendered by [app/routes/storefront-plain.jsx](./app/routes/storefront-plain.jsx) using Storefront API Cart API, tokenless access, Storefront Web Components product tiles, and Customer Account API login. |
| Build and runtime config | [package.json](./package.json), [vite.config.js](./vite.config.js), [react-router.config.js](./react-router.config.js) | pnpm scripts, React Router build tooling, Vite plugin setup, and server bundle configuration. |
| App extensions root | [extensions/](./extensions/) | Shopify CLI generated extension samples and configuration. These are deployed with `shopify app deploy`. |
| Admin link extensions | [extensions/my-admin-link-product-details/](./extensions/my-admin-link-product-details/), [extensions/my-admin-link-order-details/](./extensions/my-admin-link-order-details/) | Admin link extension samples that deep-link into this app's embedded pages. |
| Checkout and customer account extensions | [extensions/my-checkout-ui-ext/](./extensions/my-checkout-ui-ext/), [extensions/my-checkout-ui-ext-2/](./extensions/my-checkout-ui-ext-2/), [extensions/my-checkout-ui-ext-3/](./extensions/my-checkout-ui-ext-3/), [extensions/my-customer-account-ui-ext/](./extensions/my-customer-account-ui-ext/) | Preact and Polaris web component samples for checkout behavior and order-based Customer Account upsells with Storefront API cart creation. |
| Function extensions | [extensions/my-function-discount-ext/](./extensions/my-function-discount-ext/), [extensions/my-function-shipping-ext/](./extensions/my-function-shipping-ext/), [extensions/my-function-payment-ext/](./extensions/my-function-payment-ext/), [extensions/my-function-cart-ext/](./extensions/my-function-cart-ext/) | Discount, Delivery Customization, Payment Customization, and Cart Transform Functions written in Rust/Wasm. The Discount and Cart Transform samples share a configurable Customer metafield: the former applies a percentage discount, while the latter increases eligible cart line prices by the same percentage. |
| Theme, web pixel, POS, and post-purchase extensions | [extensions/my-theme-app-ext/](./extensions/my-theme-app-ext/), [extensions/my-web-pixel-ext/](./extensions/my-web-pixel-ext/), [extensions/my-pos-ui-ext/](./extensions/my-pos-ui-ext/), [extensions/my-post-purchase-ext/](./extensions/my-post-purchase-ext/) | Additional extension samples that use Shopify CLI extension structure. The POS sample uses Preact with Polaris web components; post-purchase retains its dedicated React library. |

[React Router](https://reactrouter.com/), [React](https://react.dev/) ([JSX](https://react.dev/learn/writing-markup-with-jsx), [Props](https://react.dev/learn/passing-props-to-a-component), [State](https://react.dev/learn/state-a-components-memory), [Hooks](https://react.dev/reference/react/hooks), etc.), [Preact](https://preactjs.com/), [Storefront Web Components](https://shopify.dev/docs/api/storefront-web-components), and [GraphQL](https://graphql.org/) ([Query](https://graphql.org/learn/queries/), [Edges](https://graphql.org/learn/pagination/#pagination-and-edges), [Union](https://graphql.org/learn/schema/#union-types), etc.) are used across this sample.

For creating the embedded app UI, the following contents might help you.
- [App Bridge APIs](https://shopify.dev/docs/api/app-home)
- [Polaris web components](https://shopify.dev/docs/api/app-home/web-components)

For extensions like Theme App Extensions, Shopify Functions, and Checkout UI Extensions, refer to the [App extensions](https://shopify.dev/docs/apps/build/app-extensions) and [List of app extensions](https://shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions).

# Where to start reading
If you are new to this sample, start from these files instead of reading the repository from top to bottom.

- Embedded admin UI: start with [app/root.jsx](./app/root.jsx). This file loads App Bridge and Polaris web components from Shopify CDN, so pages can use tags like `<s-page>` and `<s-button>` directly. Then read [app/AppShell.jsx](./app/AppShell.jsx) for the App Bridge title bar and Shopify Admin sidebar navigation, and [app/pages/Index.jsx](./app/pages/Index.jsx) for the first embedded UI screen.
- Project dependencies and scripts: read [package.json](./package.json) to confirm that the main app server does not use Shopify-provided app server libraries such as `@shopify/shopify-app-react-router` or `@shopify/shopify-api`. This sample intentionally shows that the same modern Shopify app patterns can be implemented with React Router, web-standard requests, App Bridge CDN scripts, and direct API calls, which also makes the approach easier to translate to other languages or non-CLI server stacks.
- OAuth and embedded app entry: read [app/routes/index.jsx](./app/routes/index.jsx) and [app/routes/auth.jsx](./app/routes/auth.jsx) first. `index.jsx` reuses the auth loader, and `auth.jsx` verifies embedded requests, checks installation state, applies Shopify iframe protection, and starts OAuth when the shop has not installed the app yet. Continue to [app/routes/auth.callback.jsx](./app/routes/auth.callback.jsx) and [app/lib/oauth.server.js](./app/lib/oauth.server.js) to see the access token exchange and storage flow.
- Server-side sample endpoints: read the thin route modules under [app/routes/](./app/routes/) together with the matching topic helpers under [app/lib/](./app/lib/). UI routes such as [app/routes/storefront.jsx](./app/routes/storefront.jsx) render embedded pages, matching resource routes such as [app/routes/storefront-json.jsx](./app/routes/storefront-json.jsx) return JSON for authenticated App Bridge fetches, and standalone HTML routes such as [app/routes/storefront-plain.jsx](./app/routes/storefront-plain.jsx) return plain HTML without the App Bridge shell. [app/routes/sessiontoken.jsx](./app/routes/sessiontoken.jsx) points to session token validation helpers.
- Browser-side Shopify helpers: read [app/utils/app-bridge.js](./app/utils/app-bridge.js) for ID token retrieval, authenticated backend fetches, embedded navigation, and external tab handling. [app/utils/direct-admin-graphql.js](./app/utils/direct-admin-graphql.js) provides App Bridge Direct API access for Admin Link queries and merchant-triggered Function, Web Pixel, and post-purchase setup mutations without exposing an Admin access token or routing those operations through the app server.
- Iframe protection: read [app/lib/http.server.js](./app/lib/http.server.js), [app/lib/embedded.server.js](./app/lib/embedded.server.js), and [app/lib/shopify-auth.server.js](./app/lib/shopify-auth.server.js). Embedded HTML pages return a shop-specific `Content-Security-Policy: frame-ancestors https://{shop} https://admin.shopify.com;` header, while standalone HTML pages use `frame-ancestors 'none';`.
- Checkout, customer account, POS, web pixel, theme, and function customizations: read the matching directories under [extensions/](./extensions/). These are deployed by Shopify CLI, even though the main app server is hand-written with React Router.
- Plain custom storefront sample: read [views/storefront.html](./views/storefront.html) after [app/routes/storefront-plain.jsx](./app/routes/storefront-plain.jsx) if you want to follow Cart API, tokenless Storefront API access, Storefront Web Components product rendering, and Customer Account API login outside the embedded admin UI. The Show products action keeps its raw GraphQL response visible, then uses each returned product GID with `shopify-context`, `shopify-data`, `shopify-media`, and `shopify-money` to render selectable product tiles. Tokenless direct browser calls can return `Online Store channel is locked` when the storefront is password protected; use public token or private delegated token mode while the storefront password is enabled.

# How to run
0. Create your Shopify partner account from [here](https://www.shopify.com/partners) and create a Shopify app **manually** (not choosing Shopify CLI) in the app menu of [your dev. dashboard](https://dev.shopify.com/dashboard). Also, [create a development store](https://shopify.dev/docs/api/development-stores#create-a-development-store-to-test-your-app) to install this app too. If you want to customize this sample code, don't forget to clone (fork) this repository to make your own one.

1. Decide if you run this app locally **or** in cloud hosting services like [Render](https://render.com/), [Fly.io](https://fly.io/), [Heroku](https://www.heroku.com/), and [AWS EC2](https://aws.amazon.com/), etc. If you run it locally, you need to use network tunneling tool like [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) because your app server URL (described as `YOUR_APP_URL` below) needs to be **public**, not localhost directly, so you need to bind your localhost to a public URL. If your company **blocks network tunneling**, you have to choose a cloud hosting service. This app has no limitation of hosting service choice, but [Render](https://render.com/) is recommended as they provide a free plan, and connecting a GitHub repository enables you to create a web service using the build and start commands below.

2. Add the following environment variables locally (export in the terminal) where you develop this sample app. Add the same variables in the cloud hosting service if you chose one as the running place.

    | Variable | Required when | Example value | Notes |
    | --- | --- | --- | --- |
    | `SHOPIFY_API_KEY` | Always | `YOUR_API_KEY` | Copy from your app settings in the Partner Dashboard. |
    | `SHOPIFY_API_SECRET` | Always | `YOUR_API_SECRET` | Copy from your app settings in the Partner Dashboard. |
    | `SHOPIFY_API_VERSION` | Always | `2026-04` | Use the same version as your app configuration. |
    | `SHOPIFY_APP_URL` | Recommended for hosted environments | `https://YOUR_APP_URL` | Public HTTPS origin used by OAuth and Customer Account API callback URLs. |
    | `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Storefront API sample's Customer Account API login flow | `YOUR_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Required only when you test the Customer Account API login flow from the custom storefront sample. This is the Customer Account API `client_id`, not the app's `SHOPIFY_API_KEY`. |
    | `SHOPIFY_DB_TYPE` | Optional | `MONGODB` / `POSTGRESQL` / `MYSQL` | Defaults to `MONGODB` when omitted. |
    | `SHOPIFY_MONGO_DB_NAME` | `SHOPIFY_DB_TYPE=MONGODB` | `YOUR_DB_NAME` | Any database name is OK. |
    | `SHOPIFY_MONGO_URL` | `SHOPIFY_DB_TYPE=MONGODB` | `mongodb://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN:YOUR_PORT/YOUR_DB_NAME` | MongoDB connection string. |
    | `SHOPIFY_POSTGRESQL_URL` | `SHOPIFY_DB_TYPE=POSTGRESQL` | `postgres://YOUR_USER:YOUR_PASSWORD@YOUR_DOMAIN(:YOUR_PORT)/YOUR_DB_NAME` | PostgreSQL connection string. |
    | `SHOPIFY_MYSQL_HOST` | `SHOPIFY_DB_TYPE=MYSQL` | `YOUR_DOMAIN` | MySQL host. |
    | `SHOPIFY_MYSQL_USER` | `SHOPIFY_DB_TYPE=MYSQL` | `YOUR_USER` | MySQL user. |
    | `SHOPIFY_MYSQL_PASSWORD` | `SHOPIFY_DB_TYPE=MYSQL` | `YOUR_PASSWORD` | MySQL password. |
    | `SHOPIFY_MYSQL_DATABASE` | `SHOPIFY_DB_TYPE=MYSQL` | `YOUR_DB_NAME` | MySQL database name. |

    Customer Account API note: `SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID` is the `client_id` shown in the Customer Account API settings for the application/storefront that uses this login flow. Do not invent a random value in this repository and do not reuse the app's Admin API `client_id` / `SHOPIFY_API_KEY`. Also register `YOUR_APP_URL/customer-account/callback` as an allowed redirect URI and `YOUR_APP_URL` as a JavaScript origin for that Customer Account API client before testing the plain storefront login. Read this setup guide for where to find the Client ID: [Getting started with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started).

    The plain storefront page keeps the Customer Account API section after the tokenless/public/private Storefront API cart examples. After login, its **Apply logged-in customer to Cart buyerIdentity** action sends the HttpOnly-session Customer Account access token from the server to `cartBuyerIdentityUpdate.customerAccessToken`; the token is never exposed to page JavaScript. The page keeps the active cart ID in `sessionStorage` so the login redirect can return to and update the same cart.

3.  If you run it locally, run the following build command (`pnpm install && pnpm run build`). If you use cloud hosting (e.g. Render), use `pnpm install --prod=false` so all project dependencies required by the React Router and Vite build toolchain remain available even when `NODE_ENV=production`. You can see the details of command definition in `package.json`.
    Use Node.js 20.19.0 or later because the React Router and Vite toolchain require it.
    ```
    Build command (local)  = pnpm install && pnpm run build
    Build command (Render) = pnpm install --prod=false && pnpm run build

    Start command = pnpm run start (= node server.mjs)
    ```

    `server.mjs` handles the CORS preflight and authenticated POST required when the Checkout UI, Customer Account UI, and post-purchase extension Web Workers call `/postpurchase` with a Shopify-signed token. It also handles the `/mocklogin` preflight used by the POS Printing API. The POS sample explicitly gets a session token and adds it to the printable document URL so `/mocklogin` can authenticate the shop. All other requests are delegated to React Router.

    The shared webhook handler logs the request path, Shopify webhook headers, HMAC result, and complete payload for `/webhookcommon`, `/webhookgdpr`, `/fulfillment_order_notification`, and `/flowaction`. Webhook payloads can contain protected customer and order data, so restrict access to logs and remove or redact full-payload logging before using this sample in production.

4. If you run it locally, install a network tunneling tool like [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and bind your localhost to their provided public URL. If you use cloud hosting, skip this step.
    ```
    `cloudflared tunnel --url localhost:3000` => This provides a dynamic URL like a "https://*********.trycloudflare.com" pointing your localhost to be used for `YOUR_APP_URL` below.
    ```

5. If you use PostgreSQL or MySQL, create the following table in your database (in `psql` or `mysql` command or other tools).
    ```
    For PostgreSQL:

    CREATE TABLE shops ( _id VARCHAR NOT NULL PRIMARY KEY, data json NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );

    For MySQL:

    CREATE TABLE shops ( _id VARCHAR(500) NOT NULL PRIMARY KEY, data JSON NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );

    ```

6. Create a `shopify.app.toml` file in the root directory copied from [this page](https://shopify.dev/docs/apps/tools/cli/configuration) and replace each value as follows.

    | TOML key | Value | Notes |
    | --- | --- | --- |
    | `name` | `YOUR_APP_NAME` | Your app name. |
    | `client_id` | `SHOPIFY_API_KEY` | Same value as the environment variable. |
    | `application_url` | `YOUR_APP_URL` | Public root URL from your network tunnel or cloud hosting service. See note 1 below. |
    | `handle` | `YOUR_APP_HANDLE` | In general, use lowercase letters from the app name, replacing `_` with `-`. Shopify uses this in the Admin app URL path and TOML file name when managing multiple apps. |
    | `[access_scopes].scopes` | `write_app_proxy,write_products,write_discounts,write_orders,write_payment_customizations,write_delivery_customizations,read_cart_transforms,write_cart_transforms,write_pixels,read_customer_events,write_customers,write_assigned_fulfillment_orders,write_merchant_managed_fulfillment_orders,write_third_party_fulfillment_orders,write_fulfillments,write_inventory,unauthenticated_read_product_listings,unauthenticated_read_selling_plans,read_locations` | Admin and Storefront API scopes used by the samples. |
    | `[access.admin].embedded_app_direct_api_access` | `true` | Enables App Bridge Direct API access used by the Admin Link query and the Function, Web Pixel, and post-purchase setup actions. |
    | `[access.admin].direct_api_mode` | `offline` | Gives these Direct API operations app-level offline access. Use `online` when they should instead be evaluated with the current Admin user's access. |
    | `[auth].redirect_urls` | `["YOUR_APP_URL/callback"]` | OAuth callback URL. |
    | `[webhooks].api_version` | `SHOPIFY_API_VERSION` | Same value as the environment variable. |
    | `[[webhooks.subscriptions]].uri` | `/webhookcommon` | Shared webhook endpoint for the sample topics and compliance topics. |
    | `[app_proxy].url` | `YOUR_APP_URL/appproxy` | App proxy endpoint. |
    | `[app_proxy].subpath` | `bareboneproxy` | App proxy subpath. |
    | `[app_proxy].prefix` | `apps` | App proxy prefix. |
    | `[app_preferences].url` | `YOUR_APP_URL` | App preferences URL when you use this section. |

    Note 1: `YOUR_APP_URL` is your network tunneling tool or cloud hosting service's root URL.

    The Admin Link product query and the merchant-triggered Function, Web Pixel, and post-purchase setup mutations use the [App Bridge Resource Fetching API](https://shopify.dev/docs/api/app-home/apis/authentication-and-data/resource-fetching-api) with the `shopify:admin` URL scheme. Shopify authenticates these Direct API requests without exposing an Admin access token to the embedded page. Direct API access is available only while App Bridge is running in the embedded app. Backend-dependent features, including OAuth, webhooks, Storefront token handling, post-purchase runtime processing, POS printing, App Proxy, and the non-embedded Service Connector, continue to use their server routes.

    **Service connector demo:** Some apps send merchants to a dashboard in an external system instead of rendering their UI inside Shopify Admin. To try this pattern, set the top-level `embedded = false` in `shopify.app.toml`. Shopify then opens App Home outside the Admin iframe, and this sample's [Home loader](./app/routes/auth.jsx) redirects to the [dummy external page](./app/lib/public-endpoints.server.js) while passing the current `shop` in a short-lived, app-signed JWT. App Bridge and its Session Token aren't available in this non-embedded mode. See [this demo](../../wiki#non-embedded-apps-cannot-use-app-bridge-or-session-token-so-should-render-the-external-page-with-your-own-jwt).

    In embedded mode, use the Session Token page's **Connect to your service with the session token** button to try the separate [external service connector flow](../../wiki#for-external-service-connection) that authenticates the shop through an App Bridge Session Token.

7. Install [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and the current stable [Rust toolchain](https://www.rust-lang.org/tools/install). Prepare the WebAssembly target used by the Function extensions, then execute `shopify app deploy` and follow its instructions (choose your partner account, connect to the existing app, include your configuration on deploy = YES, etc.).
    ```
    rustup update stable
    rustup target add wasm32-unknown-unknown
    shopify app deploy
    ```

    The Cart Transform sample uses `lineUpdate` operations, which are supported only on development stores and Shopify Plus stores. An app can register a maximum of one Cart Transform per store. Its Customer metafield value must be greater than 0 and no more than 100; cart lines with selling plans are not changed. If the Discount and Cart Transform samples are active together with a value of 30, a price of 100 is first increased to 130 and then discounted by 30%, resulting in 91.

8. Go to the app `API access` in your partner dashboard (not dev. dashboard) to `Allow network access`. => This is required for [using fetch() in Checkout UI Extensions](../../../shopify-barebone-app-sample/blob/main/extensions/my-checkout-ui-ext/src/Upsell.jsx). 

9. Go to the app `Distribution` in your partner dashboard (not dev. dashboard) to select `Public` or `Custom` (if you selected the custom app, use your development store domain for the link). => This is required for [using protected shipping address data in Checkout UI Extensions](../../../shopify-barebone-app-sample/blob/main/extensions/my-checkout-ui-ext/src/Review.jsx).

10. If you run it locally, execute the start command (`pnpm run start`). If you use cloud hosting, specify the start command in the appropriate settings or run it directly. Unsigned direct access to `YOUR_APP_URL` returns HTTP 400 with `HMAC verification failed` without loading App Bridge or Polaris and without rendering the app shell; this is expected. A valid signed non-embedded Shopify request instead redirects to the plain mock login page that displays the app-generated JWT. Make sure no other errors occur, such as 404 or 500 responses.

# How to install
Access the following endpoint.
`https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=`

Or 

you can install to your development stores from the app home `Install app` button in [dev. dashboard](https://dev.shopify.com/dashboard).

# How to update
- For app UI or server-side updates (`app/` or `views`), run the build command (`pnpm run build`) and start command (`pnpm run start`) again. Some cloud services like Render enable it with `git commit & git push`.
- If you change the value of `SHOPIFY_API_KEY`, restart the app server so `app/root.jsx` writes the new value into the App Bridge meta tag. A rebuild is not required solely for this environment-variable change, although cloud services may rebuild as part of their normal deployment process.
- If you change `SHOPIFY_API_KEY` or switch the app connected to this source code, the OAuth access tokens already stored in the `shops` DB collection belong to the previous app client. Reload the embedded app so OAuth runs again and stores a fresh token for the current app. A Shopify Admin GraphQL 401 with `Invalid API key or access token` usually means the DB returned a stored token, but Shopify rejected that token; it is not the same symptom as a missing MongoDB connection.
- For extension update (`extensions`), run `shopify app deploy` again. This needs to be done in your local (development) PC, not in the cloud hosting service.  If you change the value of `SHOPIFY_API_KEY`, you need to deploy again with the toml file updated as described below.
- For adding a new extension under `extensions`, run `shopify app generate extension` to choose your preferred one with a template.

# Sample list
All sample are available at [Wiki](../../wiki).

# TIPS
- If your app can be completed using only the Shopify APIs available to an [App Home UI extension](https://shopify.dev/docs/apps/build/app-home/app-home-ui-extensions), and doesn't require integrations with external systems, webhook receivers, background jobs, or server access from the storefront, consider [building an extension-only app](https://shopify.dev/docs/apps/build/app-extensions/build-extension-only-app). For custom-distribution apps, Shopify hosts the extension bundle, so you can provide the app without maintaining your own server infrastructure. Apps that need those server-side capabilities still require a hosted backend.
- If you fail to get [protected customer data](https://shopify.dev/docs/apps/store/data-protection/protected-customer-data) in Checkout UI Extension or API Webhook creation even in dev. stores, submit your app first which enable you get them (this is for `public app distribution` only).
- If you update some environment variables shared with `shopify.app.toml` (e.g. `SHOPIFY_API_KEY`), change the corresponding value in the file to run `shopify app deploy` to apply the change to the app configuration in Partner Dashboard (if you change other TOML file values, do the same).
- If you manage **multiple apps in this single source code** and switch the target app, follow the steps below.
    1. Change the environment variables of `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` and apply them (export).
    2. Execute `shopify app deploy --reset` and choose the target app (it is supposed to be created manually).
    3. Enter the new toml file name (use `YOUR_APP_HANDLE`) or leave blank for the app.
    4. The new toml file gets generated for the new app with the current config values in partner dashboard.
    5. Remember to replace `[access_scopes].scopes` with the same value as the original TOML file if the generated configuration does not include the scopes used by this sample.
- [Checkout UI Extension Integration Deep Dive](../../wiki/Checkout-UI-Extension-Integration-Deep-Dive) (Japanese version is [here](../../wiki/Checkout-UI-Extension-%E5%AE%9F%E8%A3%85%E8%A9%B3%E7%B4%B0)) help you to understand how the extension work deeply and avoid some pitfalls.

# Shopify app modernization
React powers the main React Router app UI and the post-purchase extension sample. Preact is a separate, lightweight React-compatible library; the Checkout UI, Customer Account UI, and POS UI Extensions use it for JSX rendering and hooks around Polaris web components, following Shopify's guidance for API version 2025-10 and later. See Shopify's upgrade guides for [Checkout UI Extensions](https://shopify.dev/docs/apps/build/checkout/migrate-to-web-components), [Customer Account UI Extensions](https://shopify.dev/docs/apps/build/customer-accounts/migrate-to-web-components), and [POS UI Extensions](https://shopify.dev/docs/apps/build/pos/upgrading-to-2025-10). For a concrete before-and-after example, see the Checkout UI Extension changes under `extensions/my-checkout-ui-ext*` in this repository's broader [modernization commit](https://github.com/shopify-apac-ts/shopify-barebone-app-sample/commit/34b07ddc5b150296b93dacb498e618108b8aa760).

This repository includes Codex and Claude Code versions of the `shopify-app-modernization` skill. The skills turn the modernization history of this sample into a reusable, behavior-preserving workflow for upgrading legacy Shopify applications.

The workflow covers more than Polaris web component conversion. It inventories and migrates server frameworks such as Express, Koa, Remix, and React Router; captures OAuth, HMAC, Session Token, webhook, CSP, CORS, and public-route behavior; delegates supported surface migrations to the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit); and applies regression checks learned from this sample's migration.

| Agent | Skill source | Installation and usage |
| --- | --- | --- |
| Codex | [skills/codex/shopify-app-modernization/SKILL.md](./skills/codex/shopify-app-modernization/SKILL.md) | [Codex installation guide](./skills/codex/shopify-app-modernization/INSTALL.md) |
| Claude Code | [skills/claude-code/shopify-app-modernization/SKILL.md](./skills/claude-code/shopify-app-modernization/SKILL.md) | [Claude Code installation guide](./skills/claude-code/shopify-app-modernization/INSTALL.md) |

The skill supports audit, planning, implementation, and migration-review modes. When the user explicitly invokes the skill by name or invocation syntax and implementation requires file changes, it first works on a dedicated migration branch so the current source branch remains untouched. Audit and planning modes do not create a branch. Normal repository work continues to use the current branch unless the prompt explicitly requests a separate branch.

The Shopify AI Toolkit remains the source for supported, surface-specific migrations such as the official [Admin UI extension upgrade to API version 2025-10](https://shopify.dev/docs/apps/build/admin/upgrading-to-2025-10). This repository's skill coordinates those tools with server-side migration decisions and application-wide regression testing.

# Disclaimer
- This code is fully _unofficial_ and NOT guaranteed to pass [the public app review](https://shopify.dev/apps/store/review) for Shopify app store. The official requirements are described [here](https://shopify.dev/apps/store/requirements). 
- You need to follow the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms) even for custom app usage.
- This code is supposed to be used as tutorials mainly for catching up Shopify app dev and does **NOT** guarantee all security covered like [this consideration](https://shopify.dev/docs/apps/build/checkout/capabilities#network-access). If you use this code for your production, **all responsibilities are owned by you**.
