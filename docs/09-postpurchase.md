# Post-purchase

## Purpose

The `/postpurchase` sample offers products after payment, applies accepted changes through a signed changeset, and records a review score.

## Preparation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant UI as /postpurchase page
    participant Bridge as App Bridge Direct API access
    participant AdminAPI as Admin GraphQL API
    participant Product as Product metafields

    Merchant->>UI: Add app URL to the shop metafield
    UI->>Bridge: Query shop ID with shopify:admin
    Bridge->>AdminAPI: Authenticated shop query
    AdminAPI-->>UI: Shop ID through App Bridge
    UI->>Bridge: metafieldsSet barebone_app.url
    Bridge->>AdminAPI: Authenticated setup mutation
    AdminAPI-->>UI: Preparation result through App Bridge
    Merchant->>Product: Set barebone_app_upsell.product_id
    Merchant->>Merchant: Enable extension in checkout settings
```

## Buyer Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Checkout as Shopify checkout
    participant Extension as Post-purchase extension
    participant App as /postpurchase
    participant AdminAPI as Admin GraphQL API

    Customer->>Checkout: Complete eligible payment
    Checkout->>Extension: ShouldRender with signed input data
    Extension->>Extension: Read purchased-product upsell metafields
    Extension->>App: POST product IDs with Bearer input token
    App->>App: Verify token and remove empty IDs
    App->>AdminAPI: Query upsell products and variants
    AdminAPI-->>App: Product data
    App-->>Extension: CORS-enabled JSON
    Extension-->>Customer: Render offer and review controls
    alt Customer accepts
        Extension->>App: POST requested changes with Bearer token
        App-->>Extension: Signed changeset token
        Extension->>Checkout: applyChangeset(token)
    end
    Extension->>App: POST review score with Bearer token
    App->>AdminAPI: Set customer review metafield
    Extension->>Checkout: done()
    Checkout-->>Customer: Continue to Thank you page
```

## How It Works

`ShouldRender` loads products referenced by `barebone_app_upsell.product_id`; `Render` displays the stored offers. The server verifies the input token, signs accepted changes, and updates the review metafield.

Only merchant setup uses Direct API access. Buyer-facing operations need the app server for token verification and signing.

## Common Pitfalls

- Payment and checkout restrictions can prevent the offer from appearing; see the official limitations below.
- Skip missing product metafields and avoid rendering an empty offer page.
- Verify the Bearer input token before trusting shop, purchase, or customer identity. Keep changeset signing on the server.
- Handle `OPTIONS` preflight and actual-response CORS headers consistently.
- Call `done()` on both acceptance and rejection paths.
- Merchant setup requires embedded Direct API access and Admin scopes.

## Source Map

- [Setup UI](../app/pages/PostPurchase.jsx)
- [Offer extension](../extensions/my-post-purchase-ext/src/index.jsx)
- [Server lookup and signing](../app/lib/post-purchase.server.js)
- [CORS preflight handling](../server.mjs)

## Official Shopify References

- [Post-purchase extensions](https://shopify.dev/docs/apps/build/checkout/product-offers)
- [App Bridge Resource Fetching API](https://shopify.dev/docs/api/app-home/apis/authentication-and-data/resource-fetching-api)
- [Post-purchase extension points](https://shopify.dev/docs/api/checkout-extensions/extension-points)
- [Post-purchase JWT specification](https://shopify.dev/docs/api/checkout-extensions/post-purchase/jwt-specification)
- [Post-purchase limitations and considerations](https://shopify.dev/docs/apps/checkout/post-purchase#limitations-and-considerations)
- [Checkout network access](https://shopify.dev/docs/apps/build/checkout/capabilities#network-access)
