# Customer account UI Extension

## Prerequisites

Before you start building your extension, make sure that you’ve created a [development store](https://shopify.dev/docs/apps/tools/development-stores) with the [Checkout and Customer Accounts Extensibility](https://shopify.dev/docs/api/release-notes/developer-previews#previewing-new-features).

## Your new Extension

Your new extension contains the following files:

- `README.md`, the file you are reading right now.
- `shopify.extension.toml`, the configuration file for your extension. This file defines your extension’s name.
- `src/*.jsx`, the Preact and Polaris web components source code for your extension.
- `locales/en.default.json` and `locales/fr.json`, which contain translations used to [localize your extension](https://shopify.dev/docs/apps/checkout/best-practices/localizing-ui-extensions).

## Order upsell flow

The order status block reads `barebone_app_upsell.product_id` from products in the completed order. It authenticates a request to the app's existing `/postpurchase` endpoint with a Customer Account extension session token, then renders the returned products. When the customer selects **Create checkout link**, the extension calls the Storefront API `cartCreate` mutation and displays the returned checkout URL.

Before testing:

1. Run `shopify app deploy`. A Git push deploys the app server to Render, but it does not release a new Shopify extension version.
2. Add this app block to the Order status page in the checkout and accounts editor, then save the page.
3. Use the app admin's Post-purchase page to prepare `barebone_app.url`.
4. Assign an upsell product ID to `barebone_app_upsell.product_id` on at least one product in the order.

The extension subscribes to order lines and metafields because Order status data can arrive after the first render. Browser diagnostics use the `[customer-account-upsell]` prefix. The server logs the requested IDs and returned Admin API products with the `[postpurchase] upsell request` and `[postpurchase] upsell response` prefixes.

## Useful Links

- [Customer account UI extension documentation](https://shopify.dev/docs/api/customer-account-ui-extensions)
  - [Configuration](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/configuration)
  - [Order status targets and APIs](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/targets/order-status)
  - [Metafields API](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/order-apis/metafields-api)
  - [Session Token API](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/platform-apis/session-token-api)
  - [Storefront API](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/target-apis/platform-apis/storefront-api)
  - [Polaris web components](https://shopify.dev/docs/api/customer-account-ui-extensions/latest/web-components)
  - [Upgrade to Polaris web components](https://shopify.dev/docs/apps/build/customer-accounts/migrate-to-web-components)
