# Theme App Extension

## Purpose

The `/themeapp` page explains and configures the theme app extension sample. The extension demonstrates app blocks, app embed blocks, Liquid rendering, storefront JavaScript, line-item properties, cart attributes and notes, custom pixel events, and a signed App Proxy request.

## Runtime Locations

- The management page runs in the embedded Admin app.
- Liquid blocks render in Shopify's Online Store theme runtime.
- `barebone.js` runs in the customer's storefront browser.
- App Proxy verification and private server logic run on the remote app server.

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

The extension uses standard Shopify theme forms rather than the Ajax Cart API. Its storefront JavaScript adds correctly named hidden inputs to the existing product and cart forms, and Shopify persists the submitted values through checkout into the order.

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

Theme app extensions package blocks, snippets, JavaScript, CSS, and static assets. Merchants add app blocks or enable app embeds in the theme editor without editing theme source manually.

The App Proxy gives the storefront a stable path under the shop domain. Shopify forwards requests from that path to `/appproxy` and signs the forwarded parameters. The server must verify the signature before using the supplied shop identity. A proxy endpoint is still publicly reachable through the storefront, so its response must be safe for customers to read.

## Common Pitfalls

- Deploying an extension does not automatically add its block to a theme; the merchant must place or enable it.
- App blocks and app embeds have different placement and lifecycle behavior.
- App Proxy verification differs from webhook HMAC verification; use the algorithm for the request type.
- Never expose Admin tokens or private merchant data through an App Proxy response.
- Theme JavaScript can run more than once in editor or section-rendering flows. Initialization should be idempotent.
- Cart attributes, line-item properties, and cart notes are separate data locations with different scopes.

## Key Terms

| Term | Meaning |
| --- | --- |
| App block | Merchant-placeable Liquid content rendered inside compatible theme sections |
| App embed block | Theme-level functionality that can be enabled without occupying a section block slot |
| App Proxy | A shop-domain URL that Shopify signs and forwards to an app endpoint |
| Line-item property | Custom data attached to one cart line |
| Cart attribute | Custom key/value data attached to the cart |
| Cart note | Customer or app text attached to the cart/order |

## Source Map

- [`app/pages/ThemeApp.jsx`](../app/pages/ThemeApp.jsx): Admin instructions and links
- [`app/routes/themeapp.jsx`](../app/routes/themeapp.jsx): embedded management route
- [`extensions/my-theme-app-ext/blocks/`](../extensions/my-theme-app-ext/blocks): theme blocks and app embeds
- [`extensions/my-theme-app-ext/snippets/barebone_snippet.liquid`](../extensions/my-theme-app-ext/snippets/barebone_snippet.liquid): shared Liquid snippet
- [`extensions/my-theme-app-ext/assets/barebone.js`](../extensions/my-theme-app-ext/assets/barebone.js): storefront behavior
- [`extensions/my-theme-app-ext/assets/barebone.css`](../extensions/my-theme-app-ext/assets/barebone.css): extension stylesheet
- [`app/routes/appproxy.jsx`](../app/routes/appproxy.jsx): proxy route
- [`app/lib/public-endpoints.server.js`](../app/lib/public-endpoints.server.js): App Proxy verification and response logic

## Official Shopify References

- [Theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions)
- [App blocks for themes](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-blocks-for-themes)
- [App embed blocks](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration#app-embed-blocks)
- [App proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [Line item properties](https://shopify.dev/docs/storefronts/themes/architecture/templates/product/overview#line-item-properties)
- [Cart notes and attributes](https://shopify.dev/docs/storefronts/themes/architecture/templates/cart#support-cart-notes-and-attributes)
