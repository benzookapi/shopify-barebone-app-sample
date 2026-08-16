# Web Pixel

## Purpose

The `/webpixel` sample registers a custom Web Pixel and forwards selected standard customer events to Google Analytics 4 through the Measurement Protocol.

## Runtime Locations

- The management UI runs in the embedded Admin browser.
- App Bridge Direct API access registers pixel settings through Admin GraphQL without an app-server API route.
- The app Web Pixel extension runs in a strict Web Worker sandbox in the visitor's browser on buyer-facing pages.
- Measurement requests go from the pixel runtime to Google's GA4 endpoint.

## Registration and Event Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant UI as /webpixel page
    participant Bridge as App Bridge Direct API access
    participant AdminAPI as Admin GraphQL API
    participant Storefront as Shopify storefront or checkout
    participant Pixel as Web Pixel sandbox
    participant GA4 as GA4 Measurement Protocol

    Merchant->>UI: Enter measurement ID, API secret, validation setting
    UI->>Bridge: fetch shopify:admin with webPixelCreate
    Bridge->>AdminAPI: Authenticated mutation with settings
    AdminAPI-->>UI: Pixel registration result through App Bridge
    actor Customer
    Customer->>Storefront: Perform a buyer action
    Storefront->>Pixel: Publish permitted customer event
    Pixel->>Pixel: Map Shopify event to GA4 payload
    Pixel->>GA4: HTTPS Measurement Protocol request
    GA4-->>Pixel: Request response
```

## How It Works

The Admin page calls `webPixelCreate` through App Bridge Direct API access. Shopify then supplies those settings to the deployed extension. The pixel subscribes to customer events, maps supported Shopify payloads into GA4 event parameters, and sends them with `fetch`, including `keepalive` where supported.

The extension explicitly declares its customer privacy behavior. An app Web Pixel's strict Web Worker sandbox exposes only a controlled set of globals and APIs; it cannot read or write the storefront DOM. Event availability and field visibility depend on consent state and the surface that emitted the event.

## Common Pitfalls

- A successful `webPixelCreate` response proves registration, not that GA4 accepted a later event.
- Pixel code runs in a sandbox, not as unrestricted theme JavaScript. DOM and browser APIs are limited.
- Browser console output can be difficult to find because the extension runs in an isolated context.
- Consent and regional privacy rules can prevent or delay events.
- Measurement IDs and API secrets are pixel settings visible to the pixel runtime; do not treat them as server-only credentials.
- Direct API registration requires an embedded App Bridge context and the app's configured Direct API access and Admin scopes.
- The shared Direct API logger redacts the complete `settings` value so the GA4 API secret is not written to browser logs.
- Validate both the request payload and GA4 DebugView or Realtime reports when troubleshooting.

## Key Terms

| Term | Meaning |
| --- | --- |
| Web Pixel | A Shopify-managed analytics extension running in a strict Web Worker customer-events sandbox |
| Customer event | A standardized event published by Shopify, such as checkout or cart activity |
| Measurement Protocol | Google's HTTP interface for sending GA4 events |
| Pixel settings | Merchant-configured values passed to the extension by Shopify |
| Customer privacy | Consent and data-processing rules controlling pixel activation and data access |

## Source Map

- [`app/pages/WebPixel.jsx`](../app/pages/WebPixel.jsx): registration UI and `webPixelCreate` mutation
- [`app/utils/direct-admin-graphql.js`](../app/utils/direct-admin-graphql.js): shared App Bridge Direct API client and secret-safe logging
- [`extensions/my-web-pixel-ext/src/index.js`](../extensions/my-web-pixel-ext/src/index.js): event subscriptions
- [`extensions/my-web-pixel-ext/src/ga4.js`](../extensions/my-web-pixel-ext/src/ga4.js): GA4 payload conversion and delivery
- [`extensions/my-web-pixel-ext/src/index.test.js`](../extensions/my-web-pixel-ext/src/index.test.js): pixel behavior tests
- [`extensions/my-web-pixel-ext/shopify.extension.toml`](../extensions/my-web-pixel-ext/shopify.extension.toml): settings schema and privacy declaration

## Official Shopify References

- [Web Pixels API](https://shopify.dev/docs/api/web-pixels-api)
- [Create a custom pixel](https://shopify.dev/docs/apps/build/marketing-analytics/pixels)
- [App Bridge Resource Fetching API](https://shopify.dev/docs/api/app-home/apis/authentication-and-data/resource-fetching-api)
- [Customer events reference](https://shopify.dev/docs/api/web-pixels-api/standard-events)
- [Web pixel privacy settings](https://shopify.dev/docs/apps/build/marketing-analytics/pixels#requesting-consent)
