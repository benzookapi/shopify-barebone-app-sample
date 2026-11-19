# Theme App Extension

## Purpose

The `/themeapp` sample demonstrates theme blocks and embeds, cart data, custom pixel events, and signed App Proxy requests.

## Storefront Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Theme as Shopify theme runtime
    participant Browser as Storefront browser
    participant Script as Theme extension JavaScript
    participant Proxy as Shopify App Proxy
    participant App as /appproxy app endpoint

    Customer->>Theme: Open a page containing the app block
    Theme->>Theme: Render Liquid block and snippet
    Theme-->>Browser: HTML, CSS, and extension JavaScript
    Browser->>Script: Initialize rendered extension elements
    Script->>Script: Read or update cart-related values
    opt App-owned server data is requested
        Script->>Proxy: Request /apps/bareboneproxy
        Proxy->>App: Forward signed proxy request
        App->>App: Verify Shopify proxy signature
        App-->>Proxy: Return JSON or application/liquid
        Proxy-->>Script: Return public storefront response
    end
    Script-->>Customer: Update the storefront UI
```

## Cart Data Persistence Sequence

Hidden inputs on standard product and cart forms carry properties, attributes, and notes through checkout to the order.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Block as Theme app block
    participant Script as barebone.js
    participant ProductForm as Product form<br/>POST /cart/add
    participant CartForm as Cart form<br/>POST /cart
    participant Cart as Shopify cart
    participant Checkout as Shopify checkout
    participant Order as Shopify order

    alt Add line-item property
        Customer->>Block: Enter a line-item property value
        Block->>Script: Dispatch input change
        Script->>ProductForm: Add properties[barebone_line_item_property]
        Customer->>ProductForm: Submit Add to cart
        ProductForm->>Cart: Add merchandise and submitted property
        Cart->>Cart: Store property on that cart line
    else Add cart note and attributes
        Customer->>Block: Enter note and attribute values
        Block->>Script: Dispatch input changes
        Script->>CartForm: Add note and attributes[...] fields
        Customer->>CartForm: Submit cart form or proceed to checkout
        CartForm->>Cart: Update cart note and attributes
        Cart->>Cart: Store values at cart level
    end

    Customer->>Checkout: Continue with the populated cart
    Checkout->>Order: Complete the purchase
    Order->>Order: Keep properties on order line items
    Order->>Order: Keep note and attributes as order-level data
```

## How It Works

Merchants add blocks or enable embeds in the theme editor. App Proxy requests use a shop-domain URL; the app server verifies Shopify's signature before returning customer-visible data.

## Common Pitfalls

- Deploying does not place a block or enable an embed; use the theme editor.
- App Proxy signatures use a different verification algorithm from webhook HMACs.
- App Proxy responses are public. Never return Admin tokens or private merchant data.
- Theme initialization can repeat; make it safe to run more than once.
- Line-item properties belong to individual lines; cart attributes and notes belong to the cart.

## Source Map

- [Theme blocks and embeds](../extensions/my-theme-app-ext/blocks/)
- [Storefront JavaScript](../extensions/my-theme-app-ext/assets/barebone.js)
- [App Proxy handler](../app/lib/public-endpoints.server.js)

## Official Shopify References

- [Theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)
- [App blocks for themes](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-blocks-for-themes)
- [App embed blocks](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-embed-blocks)
- [App proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [Line item properties](https://shopify.dev/docs/storefronts/themes/architecture/templates/product/overview#line-item-properties)
- [Cart notes and attributes](https://shopify.dev/docs/storefronts/themes/architecture/templates/cart#support-cart-notes-and-attributes)
