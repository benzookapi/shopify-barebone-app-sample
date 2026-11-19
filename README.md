# Overview

This unofficial [Shopify app](https://shopify.dev/apps) sample implements authentication and API flows directly to make them easier to learn. It uses React Router, React/Preact, App Bridge, and Polaris web components.

## CLI-generated template or scratch-built app?

| Approach | Benefit | Responsibility |
| --- | --- | --- |
| [Official CLI template](https://shopify.dev/apps/getting-started/build-app-example) | Quick start with supported structure and Shopify libraries | Understand the abstractions and maintain framework/library upgrades |
| This scratch-built sample | Learn protocols directly and choose your stack | Implement and maintain authentication, verification, storage, and security |

Both approaches use [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) for app extensions.

# Code structure

See the [architecture guide](./docs/00-ARCHITECTURE.md#runtime-map) for the runtime overview, key source files, and feature guides.

# How to run

0. Fork/clone this repository. Create a Partner account, a [development store](https://shopify.dev/docs/api/development-stores#create-a-development-store-to-test-your-app), and an app **manually** in the [Dev Dashboard](https://dev.shopify.com/dashboard).

1. Choose a host such as [Render](https://render.com/) or run locally with a public HTTPS tunnel. `YOUR_APP_URL` below is that public origin; plain localhost is insufficient. Use hosted deployment if your network blocks tunnels.

2. Set these environment variables on the app host and in your local CLI environment:

    | Variable | Set when | Value |
    | --- | --- | --- |
    | `SHOPIFY_API_KEY` | Always | App client ID from app settings |
    | `SHOPIFY_API_SECRET` | Always | App client secret |
    | `SHOPIFY_API_VERSION` | Always | API version matching the app configuration, e.g. `2026-04` |
    | `SHOPIFY_APP_URL` | Recommended for hosting | Public HTTPS origin, e.g. `https://your-app.onrender.com` |
    | `SHOPIFY_DB_TYPE` | Optional | `MONGODB` (default), `POSTGRESQL`, or `MYSQL` |
    | `SHOPIFY_MONGO_DB_NAME` | MongoDB | Database name |
    | `SHOPIFY_MONGO_URL` | MongoDB | Connection string |
    | `SHOPIFY_POSTGRESQL_URL` | PostgreSQL | Connection string |
    | `SHOPIFY_MYSQL_HOST` | MySQL | Host |
    | `SHOPIFY_MYSQL_USER` | MySQL | User |
    | `SHOPIFY_MYSQL_PASSWORD` | MySQL | Password |
    | `SHOPIFY_MYSQL_DATABASE` | MySQL | Database name |

3. Use Node.js 20.19.0 or later. Build and start with:

    ```sh
    # Local build
    pnpm install && pnpm run build

    # Render build: include devDependencies for Vite/React Router
    pnpm install --prod=false && pnpm run build

    # Start
    pnpm run start
    ```

4. For local hosting, start a tunnel such as [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). Use its HTTPS URL as `YOUR_APP_URL`:

    ```sh
    cloudflared tunnel --url localhost:3000
    ```

5. For PostgreSQL or MySQL, create the installation table. MySQL must use InnoDB for token locking.

    ```sql
    -- PostgreSQL
    CREATE TABLE shops ( _id VARCHAR NOT NULL PRIMARY KEY, data json NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );

    -- MySQL
    CREATE TABLE shops ( _id VARCHAR(500) NOT NULL PRIMARY KEY, data JSON NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL );
    ```

6. Create a local `shopify.app.toml` using the [app configuration reference](https://shopify.dev/docs/apps/tools/cli/configuration), then set:

    | TOML key | Value | Notes |
    | --- | --- | --- |
    | `name` | `YOUR_APP_NAME` | Your app name. |
    | `client_id` | `SHOPIFY_API_KEY` | Same value as the environment variable. |
    | `application_url` | `YOUR_APP_URL` | Public HTTPS origin. |
    | `handle` | `YOUR_APP_HANDLE` | Lowercase app handle. |
    | `[access_scopes].scopes` | `write_app_proxy,write_products,write_discounts,write_orders,write_payment_customizations,write_delivery_customizations,read_cart_transforms,write_cart_transforms,write_pixels,read_customer_events,write_customers,write_assigned_fulfillment_orders,write_merchant_managed_fulfillment_orders,write_third_party_fulfillment_orders,write_fulfillments,write_inventory,unauthenticated_read_product_listings,unauthenticated_read_selling_plans,read_locations` | Admin and Storefront API scopes used by the samples. |
    | `[access.admin].embedded_app_direct_api_access` | `true` | Enables browser-side Admin API calls through App Bridge. |
    | `[access.admin].direct_api_mode` | `offline` | App-level authorization; use `online` for current-user authorization. |
    | `[auth].redirect_urls` | `["YOUR_APP_URL/callback"]` | OAuth callback URL. |
    | `[network_access].allowed_navigation_hosts` | `["YOUR_APP_HOST"]` | Lowercase host only; no scheme/path. See [Security](#security). |
    | `[network_access].allowed_sources` | `["YOUR_APP_URL", "https://api.ipify.org", "https://www.google-analytics.com"]` | Browser/extension origins; see [Security](#security). |
    | `[webhooks].api_version` | `SHOPIFY_API_VERSION` | Same value as the environment variable. |
    | `[[webhooks.subscriptions]].uri` | `/webhookcommon` | Shared operational/compliance receiver. |
    | `[app_proxy].url` | `YOUR_APP_URL/appproxy` | App proxy endpoint. |
    | `[app_proxy].subpath` | `bareboneproxy` | App proxy subpath. |
    | `[app_proxy].prefix` | `apps` | App proxy prefix. |
    | `[app_preferences].url` | `YOUR_APP_URL` | Optional preferences URL. |

    To try a non-embedded external dashboard, set `embedded = false` and follow the [Service Connector guide](./docs/00-ARCHITECTURE.md#non-embedded-service-connector), including its Admin Link URL changes.

7. Install [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) and [Rust](https://www.rust-lang.org/tools/install), then build/deploy the extensions. Connect to the app created above and include its configuration:

    ```sh
    rustup update stable
    rustup target add wasm32-unknown-unknown
    shopify app deploy
    ```

8. In the app's Partner Dashboard **API access**, enable **Allow network access** for [Checkout extension fetches](./extensions/my-checkout-ui-ext/src/Upsell.jsx).

9. Select **Public** or **Custom** distribution in the Partner Dashboard. The [checkout review sample](./extensions/my-checkout-ui-ext/src/Review.jsx) also requires protected shipping-address access; see [TIPS](#tips).

10. Start locally with `pnpm run start`, or configure the host's start command. Open through Shopify after installation. An unsigned direct visit returns `400 HMAC verification failed`; this is expected.

# How to install

Use **Install app** in the [Dev Dashboard](https://dev.shopify.com/dashboard), or open:

```text
https://SHOPIFY_SHOP_DOMAIN/admin/oauth/authorize?client_id=YOUR_API_KEY&redirect_uri=YOUR_APP_URL/callback&state=&grant_options[]=
```

See the [OAuth flow demo](../../wiki#oauth-flow).

# How to update

- App UI/server changes: rebuild and restart. Render can do this automatically on Git push.
- App or extension configuration: run `shopify app deploy` locally; pushing the server does not publish Shopify configuration.
- Switching apps: update the key/secret and TOML, restart, deploy configuration, and reopen the app for OAuth. Stored tokens belong to the previous client. A key-only environment change does not itself require a rebuild.
- Add extensions with `shopify app generate extension`.

# Demo

All demos are available at [Wiki](../../wiki).

# TIPS

- For custom distribution without backend integrations, webhooks, or jobs, consider an [extension-only app](https://shopify.dev/docs/apps/build/app-extensions/build-extension-only-app) with [App Home UI extensions](https://shopify.dev/docs/apps/build/app-home/app-home-ui-extensions) to avoid hosting a server.
- For public distribution, complete the [protected customer data requirements](https://shopify.dev/docs/apps/store/data-protection/protected-customer-data), including when testing on development stores.
- To switch apps in this checkout:

    1. Set the target app's `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`.
    2. Run `shopify app deploy --reset`, select the existing app, and name its TOML using the app handle.
    3. Restore any sample scopes missing from the generated TOML and deploy it.
- See the [Checkout UI deep dive](../../wiki/Checkout-UI-Extension-Integration-Deep-Dive) ([Japanese](../../wiki/Checkout-UI-Extension-%E5%AE%9F%E8%A3%85%E8%A9%B3%E7%B4%B0)) for reactive behavior and async pitfalls.

# Shopify app modernization

The main app and post-purchase extension use React; Checkout, Customer Account, and POS extensions use Preact with Polaris web components. See the [Checkout](https://shopify.dev/docs/apps/build/checkout/migrate-to-web-components), [Customer Account](https://shopify.dev/docs/apps/build/customer-accounts/migrate-to-web-components), and [POS](https://shopify.dev/docs/apps/build/pos/upgrading-to-2025-10) upgrade guides, or this sample's [migration diff](https://github.com/shopify-apac-ts/shopify-barebone-app-sample/commit/34b07ddc5b150296b93dacb498e618108b8aa760).

The `shopify-app-modernization` skills coordinate framework, authentication, and extension migrations with the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) and regression checks.

| Agent | Installation and usage | Skill |
| --- | --- | --- |
| Codex | [Guide](./skills/codex/shopify-app-modernization/INSTALL.md) | [Instructions](./skills/codex/shopify-app-modernization/SKILL.md) |
| Claude Code | [Guide](./skills/claude-code/shopify-app-modernization/INSTALL.md) | [Instructions](./skills/claude-code/shopify-app-modernization/SKILL.md) |

When explicitly invoked, implementation uses a dedicated migration branch; audit/planning do not create one.

# Security

Follow Shopify's [app security guide](https://shopify.dev/docs/apps/build/security). These sample measures do not resolve every security-review finding.

| Item | Behavior or required action |
| --- | --- |
| Offline Admin tokens | Refresh on API use within five minutes of expiry; no batch needed. Reopen the app if refresh expires/is rejected. See the [OAuth flow](./docs/00-ARCHITECTURE.md#offline-token-refresh-before-api-use). |
| Private Storefront tokens | Regenerate near expiry or when the parent token changes. See [Storefront](./docs/15-storefront.md#delegated-token-lifecycle). |
| Network declarations | Declare the app server's HTTPS origin: UI extensions call it directly. This is separate from each extension's network capability. |
| Admin API IP allowlist | Manually add all caller services'/workers' outbound CIDRs in the [Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard/ip-allowlist). On Render, use **Connect → Outbound**. App Bridge Direct API access is exempt. |

**Domain declarations do not block undeclared HTTP requests:**

- `allowed_sources` sends `Content-Security-Policy-Report-Only`: undeclared requests can produce console warnings/reports while still proceeding, without a customer warning screen.
- `allowed_navigation_hosts` lets declared links skip exit confirmation. Undeclared links may show it; Shopify/merchant trust and malicious-host protections still apply.

Local app TOMLs are Git-ignored. Add this to each deployed configuration using your own host/origin. The other origins support the IP demo and GA4 pixel; remove them if unused. Shopify-hosted assets and shop-domain App Proxy URLs need no entries.

```toml
[network_access]
allowed_navigation_hosts = ["your-app.onrender.com"]
allowed_sources = [
  "https://your-app.onrender.com",
  "https://api.ipify.org",
  "https://www.google-analytics.com",
]
```

Validate with `shopify app config validate --json` (`--config=<name>` for named apps), then deploy and release with Shopify CLI. When changing domains, update these declarations, app/callback URLs, and extension backend URLs. See the [network access guide](https://shopify.dev/docs/apps/build/security/storefront/declare-network-access).

`pnpm test` uses simulated services; also verify OAuth and your database with a development installation.

# Disclaimer

- This unofficial learning sample does not guarantee [App Store approval](https://shopify.dev/apps/store/requirements) or production security. You are responsible for production review and operation.
- Follow the [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms), including for custom apps.
