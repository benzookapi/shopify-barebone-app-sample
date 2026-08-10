# Checkout UI Extension

Checkout UI extensions let app developers build custom functionality that merchants can install at defined targets in the checkout flow. You can learn more about checkout UI extensions in Shopify’s [developer documentation](https://shopify.dev/api/checkout-extensions/checkout).

## Prerequisites

Before you start building your extension, make sure that you have a [development store](https://shopify.dev/docs/apps/tools/development-stores) where Checkout UI extensions can be tested.

## Your new Extension

Your new extension contains the following files:

- `README.md`, the file you are reading right now.
- `shopify.extension.toml`, the configuration file for your extension. This file defines your extension’s name, where it will appear in the checkout, and other metadata.
- `src/Checkout.jsx`, the Preact and Polaris web components source shared by the target entry modules.
- `src/CheckoutStatic.jsx`, the thin entry module for the static target.
- `src/Checkout.js` and `src/CheckoutStatic.js`, equivalent Vanilla JavaScript examples that create the same Polaris custom elements directly.
- `locales/en.default.json` and `locales/fr.json`, which contain translations used to [localized your extension](https://shopify.dev/docs/apps/checkout/best-practices/localizing-ui-extensions).

The extension targets `purchase.checkout.block.render` and `purchase.checkout.actions.render-before`. Current Checkout UI extension versions use one module entry point per target, so the static target uses a thin entry module while keeping the shared `Extension` and `ExtensionStatic` functions in `Checkout.jsx`.

To build your extension, you will need to use APIs provided by Shopify that let you render content, and to read and write data in the checkout. The following resources will help you get started with checkout extensions:

- [APIs by extension target](https://shopify.dev/docs/api/checkout-ui-extensions/targets)
- [All APIs for reading and writing checkout data](https://shopify.dev/docs/api/checkout-ui-extensions/apis)
- [Available components and their properties](https://shopify.dev/docs/api/checkout-ui-extensions/components)

## Useful Links

- [Checkout app documentation](https://shopify.dev/apps/checkout)
- [Checkout UI extension documentation](https://shopify.dev/api/checkout-extensions)
  - [Configuration](https://shopify.dev/docs/api/checkout-ui-extensions/configuration)
  - [Extension Targets](https://shopify.dev/docs/api/checkout-ui-extensions/targets)
  - [API Reference](https://shopify.dev/docs/api/checkout-ui-extensions/apis)
  - [UI Components](https://shopify.dev/docs/api/checkout-ui-extensions/components)
- [Checkout UI extension tutorials](https://shopify.dev/docs/apps/checkout)
  - [Enable extended delivery instructions](https://shopify.dev/apps/checkout/delivery-instructions)
  - [Creating a custom banner](https://shopify.dev/apps/checkout/custom-banners)
  - [Thank you and order status pages](https://shopify.dev/docs/apps/checkout/thank-you-order-status)
  - [Adding field validation](https://shopify.dev/apps/checkout/validation)
  - [Localizing an extension](https://shopify.dev/apps/checkout/localize-ui-extensions)
