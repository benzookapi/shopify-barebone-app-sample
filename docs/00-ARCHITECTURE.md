# Application Architecture

Request flows and runtime boundaries for this Node.js / React Router sample, hosted on Render. The same authentication boundaries apply to other stacks.

## Runtime Map

Use this map to find a feature's entry points; the linked guides explain each sample in detail.

| Feature | Runs in | Entry points and guides |
| --- | --- | --- |
| App Home and navigation | Merchant browser and app server | [Route map](../app/routes.js), [UI pages](../app/pages/), [app shell](../app/AppShell.jsx) |
| OAuth and token storage | App server | [OAuth](../app/lib/oauth.server.js), [token refresh](../app/lib/offline-token.server.js), [installation storage](../app/lib/shop-store.server.js) |
| Authenticated Admin API calls | Browser through App Bridge, or app server | [Direct API helper](../app/utils/direct-admin-graphql.js), [server GraphQL client](../app/lib/shopify-graphql.server.js), [session-token guide](01-sessiontoken.md) |
| Webhooks and App Proxy | App server | [Request handlers](../app/lib/public-endpoints.server.js), [webhook guide](12-eventsubscription.md), [App Proxy example](03-themeapp.md) |
| Storefront and customer login | Customer browser and app server | [Storefront guide](15-storefront.md) |
| Order and bulk operations | App server, managed from App Home | [Order management](13-ordermanage.md), [bulk operations](14-bulkoperation.md) |
| UI, theme, and analytics extensions | Shopify surfaces | [Extension samples](../extensions/), [runtime flow](#storefront-and-ui-extension-runtimes) |
| Shopify Functions | Shopify infrastructure (Wasm) | [Discount example](../extensions/my-function-discount-ext/), [runtime flow](#shopify-functions-runtime) |

Route `loader` and `action` functions run on the app server; route components and `app/pages/` render in the browser. Keep secrets and database access in `.server.js` modules.

## First Embedded Access and OAuth

The app verifies Shopify's signed entry request before trusting the shop. Missing, legacy, mismatched, or unrefreshable installations start OAuth.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant Admin as Shopify Admin
    participant Browser as Merchant browser
    participant App as Remote app server
    participant Store as Installation store
    participant OAuth as Shopify OAuth

    Merchant->>Admin: Open the app
    Admin->>Browser: Load app URL with shop, host, embedded, HMAC
    Browser->>App: GET embedded app URL
    App->>App: Verify query HMAC and shop domain
    App->>Store: Read stored installation
    Store-->>App: Missing or not owned by current client ID
    App-->>Browser: Redirect to OAuth authorization URL
    Browser->>OAuth: Merchant authorizes requested scopes
    OAuth-->>Browser: Redirect to /callback with code and HMAC
    Browser->>App: GET /callback
    App->>App: Verify callback HMAC
    App->>Store: Acquire per-shop token lock
    App->>OAuth: Exchange authorization code with expiring=1
    OAuth-->>App: Access token, refresh token, scopes, both lifetimes
    App->>Store: Save pair and absolute expiries, then release lock
    App->>OAuth: Resolve the app handle
    App-->>Browser: Redirect to Shopify Admin app URL
```

Keep Admin OAuth credentials on the server. App Bridge session tokens authenticate browser-to-app requests separately.

### Offline Token Refresh Before API Use

[Token refresh](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-refresh) runs on demand when five minutes or less remain; no periodic batch is needed. An expired access token can still be refreshed while its refresh token is valid.

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Authenticated route or server task
    participant Tokens as Offline token manager
    participant DB as Installation database
    participant OAuth as Shopify OAuth
    participant API as Admin GraphQL API

    Caller->>Tokens: Get offline credentials for shop
    Tokens->>DB: Read installation and expiry timestamps
    alt Missing, legacy, other app, or expired refresh token
        Tokens-->>Caller: Reauthorization required
        Note over Caller,OAuth: Reopen app in Shopify Admin to restart OAuth
    else Access token has more than 5 minutes left
        Tokens-->>Caller: Current access token
        Caller->>API: Execute API operation once
    else Access token is near expiry or expired
        Tokens->>DB: Lock shop and reread current pair
        alt Another request already refreshed
            DB-->>Tokens: Fresh pair
        else Refresh still required
            Tokens->>OAuth: POST access_token with grant_type=refresh_token
            OAuth-->>Tokens: New access and refresh tokens with lifetimes
            Tokens->>DB: Save complete pair, expiries, and generation
        end
        Tokens->>DB: Commit and release shop lock
        Tokens-->>Caller: Fresh access token after persistence
        Caller->>API: Execute API operation once
    end
    API-->>Caller: API result when an operation was sent
```

- Serialize acquisition/refresh per shop and save the new token pair before API use.
- Reopen the app for OAuth if refresh expires or is rejected.
- Preserve credentials on temporary failures; do not automatically replay Admin mutations.

### Related Credentials: Application-only and CLI Automation Tokens

| Credential | Typical use | Key restriction |
| --- | --- | --- |
| [Expiring offline access token](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens) | Admin API calls from batches and webhook follow-up jobs | Maintain the access/refresh pair. Supports custom apps installed on customers' stores. |
| [Application-only access token](https://shopify.dev/docs/apps/build/authentication-authorization/application-only-access-tokens) | Background Admin API calls without storing refresh tokens | **For customers' production stores in another organization, public-distribution apps only.** Custom apps are limited to stores in their own organization. |
| [App CLI automation / service account token](https://shopify.dev/docs/apps/build/cli-for-apps/service-accounts) | CI/CD deployment, release, and permitted dev store management | **Cannot read or write store data through the Admin API.** |

## Non-embedded Service Connector

Set `embedded = false` to open App Home outside the Admin iframe. App Bridge is unavailable, so the server verifies Shopify's signed entry, completes OAuth, and passes a short-lived app JWT to `/mocklogin`.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant Admin as Shopify Admin
    participant Browser as Top-level browser page
    participant App as Remote app server
    participant Store as Installation store
    participant OAuth as Shopify OAuth
    participant Service as External service page

    Merchant->>Admin: Open a non-embedded app
    Admin->>Browser: Open app URL outside an iframe with signed parameters
    Browser->>App: GET app URL
    App->>App: Verify Shopify query HMAC and shop
    App->>Store: Check installation and stored Admin token
    opt Installation is missing or stale
        App-->>Browser: Redirect to Shopify OAuth
        Browser->>OAuth: Authorize app
        OAuth-->>App: Callback with code and HMAC
        App->>OAuth: Exchange code and store Admin token
        App-->>Browser: Redirect to Shopify Admin app URL
        Browser->>App: GET signed non-embedded app URL again
    end
    App->>App: Create short-lived app-signed JWT containing shop
    App-->>Browser: Redirect to /mocklogin with app JWT
    Browser->>Service: Open plain external service page
    Service->>Service: Verify app JWT and resolve shop
    Service->>Store: Load installation for the verified shop and current app
    Store-->>Service: Stored Admin OAuth access token
    Service-->>Merchant: Render demo login page with app JWT and stored access token
```

The [entry route](../app/routes/auth.jsx) and [mock login handler](../app/lib/public-endpoints.server.js) simulate an external service. The app JWT is neither a Shopify session token nor an Admin API token. Use the verified shop to establish the service's own session; avoid retaining handoff tokens in URLs or logs.

**Test stores only:** This demo exposes the stored Admin token after authenticating the app JWT or Shopify session token, including on POS printouts. Remove the display in production and do not share pages, URLs, or printouts.

For non-embedded mode, change Admin Link `app://` destinations to absolute HTTPS URLs. The embedded alternative uses the Session Token page's **Connect to your service with the session token** button. See the [connector demo](../../../wiki#for-external-service-connection).

### Linking a Shopify Shop to an External Service User

1. Hand off a signed, short-lived, single-purpose token containing the verified shop. Validate signature, expiry, issuer/audience, and one-time use in the external service.
2. After external login, persist the user-to-shop association. Support multiple shops where needed and resolve later visits from that association.
3. Offer reconnect/disconnect controls and remove or disable links on uninstall.
4. Keep account linking in installation/onboarding. Follow Shopify's [sign-up guidance](https://shopify.dev/docs/apps/build/integrating-with-shopify#enable-seamless-sign-up-based-on-shopify-credentials) and [installation requirements](https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements#2-installation-and-setup).

A non-embedded service connector may qualify for App Store distribution, but not [Built for Shopify](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements) while its primary Admin experience remains non-embedded.

## Normal Embedded Page and Server-backed API Request

Use this path for operations needing app secrets, stored data, external integrations, or server orchestration.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Shopify Admin
    participant Browser as Embedded browser document
    participant Loader as React Router loader
    participant Bridge as App Bridge
    participant Endpoint as App JSON endpoint
    participant Store as Installation store
    participant API as Shopify Admin GraphQL API

    Admin->>Loader: GET page with signed embedded parameters
    Loader->>Loader: Verify HMAC and installation
    Loader-->>Browser: HTML and browser bundle
    Browser->>Bridge: Request idToken()
    Bridge-->>Browser: Short-lived session token
    Browser->>Endpoint: Request with Authorization: Bearer token
    Endpoint->>Endpoint: Verify JWT signature, audience, destination, and time
    Endpoint->>Store: Load shop's Admin OAuth token and refresh if needed
    Endpoint->>API: GraphQL request with OAuth token
    API-->>Endpoint: GraphQL response
    Endpoint-->>Browser: JSON response
```

- Query HMAC: verifies the initial Shopify entry.
- Session JWT: authenticates browser/extension requests to the app server.
- Offline OAuth token: authorizes server-to-Admin API calls.

## Direct Admin API Request

Admin Link queries and merchant-triggered Function, Web Pixel, and post-purchase setup use [`shopify:admin`](https://shopify.dev/docs/api/app-home/apis/authentication-and-data/resource-fetching-api) through App Bridge. Enable Direct API access and the required scopes in the deployed app TOML.

```mermaid
sequenceDiagram
    autonumber
    participant Browser as Embedded Admin page
    participant Bridge as App Bridge
    participant API as Shopify Admin GraphQL API

    Browser->>Bridge: fetch shopify:admin query or mutation
    Bridge->>API: Forward authenticated GraphQL request
    API-->>Bridge: GraphQL data or errors
    Bridge-->>Browser: GraphQL JSON response
```

No Admin token is exposed to the browser. Backend-dependent features, including OAuth, webhooks, and signing, still need server routes.

## Browser and Server Module Boundaries

```mermaid
sequenceDiagram
    participant Browser as Browser runtime
    participant RouteUI as Route component
    participant Page as app/pages component
    participant Bridge as App Bridge and Polaris
    participant HTTP as HTTP boundary
    participant RouteData as Route loader or action
    participant Lib as app/lib server module
    participant Shopify as Shopify API

    Browser->>RouteUI: Hydrate route component
    RouteUI->>Page: Render page UI
    Page->>Bridge: Use navigation, ID token, and web components
    alt Direct Admin API operation
        Page->>Bridge: fetch shopify:admin GraphQL
        Bridge->>Shopify: Forward authenticated Admin API request
        Shopify-->>Page: Return GraphQL JSON through App Bridge
    else Backend-dependent operation
        Page->>HTTP: Fetch protected .json endpoint
        HTTP->>RouteData: Dispatch request on remote server
        RouteData->>Lib: Verify and execute server logic
        Lib->>Shopify: Send authenticated API request
        Shopify-->>Lib: Return data
        Lib-->>Page: Return JSON across HTTP boundary
    end
```

Do not import secrets or server-only modules into page components. Environment variables, OAuth tokens, database access, and Admin API credentials must remain behind the HTTP boundary.

## Storefront and UI Extension Runtimes

Extensions run on their Shopify surfaces, outside the app-server process. UI extensions and app Web Pixels use isolated Worker runtimes without host DOM access; theme code runs on the storefront.

```mermaid
sequenceDiagram
    autonumber
    actor User as Merchant or customer
    participant Surface as Shopify surface
    participant Runtime as Isolated Worker runtime
    participant App as Remote app server
    participant API as Shopify API

    User->>Surface: Open storefront, checkout, account, or POS
    Surface->>Runtime: Load extension for matching target
    Runtime->>Runtime: Read target APIs, settings, and allowed metafields
    opt Extension requires app-owned data
        Runtime->>Runtime: Get a fresh extension session token
        Runtime->>App: HTTPS request with Bearer token
        App->>App: Verify token and CORS policy
        App->>API: Call Shopify API with server credential
        API-->>App: Return data
        App-->>Runtime: Return CORS-enabled response
    end
    Runtime-->>Surface: Render web components or perform target action
```

Declare required capabilities and metafields in each extension's TOML. External requests need CORS preflight support. Each placed block has isolated state; do not assume one global instance.

## Shopify Functions Runtime

The browser registers configuration through Admin API. Shopify later executes the deployed Rust/Wasm Function during cart or checkout processing.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant UI as Embedded management UI
    participant Bridge as App Bridge Direct API access
    participant AdminAPI as Shopify Admin GraphQL API
    participant Config as Function owner and metafield
    participant Checkout as Shopify cart or checkout
    participant Wasm as Deployed Function Wasm

    Merchant->>UI: Register customization
    UI->>Bridge: fetch shopify:admin with settings
    Bridge->>AdminAPI: Create discount or customization
    AdminAPI->>Config: Persist function handle and metafield
    AdminAPI-->>UI: Registration result
    Note over UI,Wasm: The remote app server is not called during registration or Function execution
    Checkout->>Wasm: Invoke with generated GraphQL input
    Config-->>Wasm: Include configured metafield data
    Wasm-->>Checkout: Return operations
    Checkout->>Checkout: Apply allowed operations
```

Use the declared input and follow the Function API's Wasm/resource limits. The app database and arbitrary network access are unavailable unless explicitly supported.

## Infrastructure Independence

Other languages and hosts can use the same design: verify HMAC/JWTs, protect server credentials and installation state, preserve HTTP/CORS contracts, and deploy app configuration with its extensions.

## Official References

- [App surfaces](https://shopify.dev/docs/apps/build/app-surfaces)
- [OAuth authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
- [Migrate to expiring offline access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/migrate-to-expiring-offline-access-tokens)
- [Access token lifetimes and rotation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens)
- [Application-only access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/application-only-access-tokens)
- [Client credentials for stores in your organization](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant)
- [CLI service accounts and App Automation Token migration](https://shopify.dev/docs/apps/build/cli-for-apps/service-accounts)
- [Session tokens](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens)
- [App Bridge](https://shopify.dev/docs/api/app-bridge-library)
- [App Bridge Resource Fetching API](https://shopify.dev/docs/api/app-home/apis/authentication-and-data/resource-fetching-api)
- [Using Polaris web components and the UI extension execution model](https://shopify.dev/docs/api/polaris/using-polaris-web-components)
- [Web pixel strict sandbox](https://shopify.dev/docs/apps/build/marketing-analytics/pixels)
- [Shopify Functions](https://shopify.dev/docs/api/functions/unstable)

## Demo

See the [OAuth flow demo](../../../wiki#oauth-flow).
