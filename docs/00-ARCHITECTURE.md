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
    App->>Store: Save both tokens and their expiry times, then release lock
    App->>OAuth: Resolve the app handle
    App-->>Browser: Redirect to Shopify Admin app URL
```

Keep Admin OAuth credentials on the server. App Bridge session tokens authenticate browser-to-app requests separately.

### Offline Token Refresh Before API Use

Each installation stores a **token pair**. The server sends the **access token** to the Admin API and uses the **refresh token** to obtain a new pair from Shopify OAuth. A valid refresh token can renew an expired access token. [Shopify's token refresh guide](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-refresh)

#### On-demand refresh with a per-shop lock (this sample)

App requests and webhook handlers that need the Admin API can call the [token manager](../app/lib/offline-token.server.js) directly, without a refresh batch or queue. Both use the same per-shop lock when the access token has five minutes or less left. Receiving a webhook by itself requires no token lock.

```mermaid
flowchart TD
    Request["Authenticated app request"] --> Read["Read the shop's stored token pair"]
    Webhook["Verified webhook needing Admin API access"] --> Read
    Read --> Fresh{"Access token has more<br/>than 5 minutes left?"}
    Fresh -->|Yes| API["Call Admin API with the saved access token"]
    Fresh -->|No| Lock["Lock this shop's token record<br/>and reread the pair"]
    Lock --> Due{"Still needs refresh?"}
    Due -->|Yes| Rotate["Refresh with Shopify OAuth<br/>Save both tokens and expiry times"]
    Due -->|No| Release["Release the shop lock"]
    Rotate --> Release
    Release --> API
```

#### Scheduled refresh by a single worker (alternative)

Only the batch refreshes tokens. Schedule it ahead of expiry. For each shop, serialize refresh and OAuth acquisition from the initial read through the final save, including retries on other instances. Webhook and app request handlers can then read the saved access token without a refresh lock.

```mermaid
sequenceDiagram
    participant Caller as Webhook or app request handler
    participant DB as Installation database
    participant Batch as Refresh batch
    participant Shopify as Shopify

    par Scheduled run for a shop
        Batch->>DB: Read the latest token pair and expiry
        opt Access token due for refresh
            Batch->>Shopify: Refresh at Shopify OAuth
            Shopify-->>Batch: New token pair and lifetimes
            Batch->>DB: Save both tokens and expiries atomically
        end
    and Webhook or request needs the Admin API
        Caller->>DB: Read saved access token and expiry
        DB-->>Caller: Access token and expiry
        alt Access token still valid
            Caller->>Shopify: Call Admin API
        else Batch is late and access token has expired
            Caller->>Caller: Defer API work, then reread after batch refresh
        end
    end
```

- Reopen the app for OAuth if installation credentials are missing or unusable, or if Shopify rejects the refresh token.
- Preserve credentials on temporary failures; do not automatically replay Admin mutations.

#### How the per-shop token lock works

When two workers refresh tokens for the same shop, the slower worker can save a token the other has already replaced. The next refresh may then fail and require the merchant to reauthorize. See [Shopify's guidance on concurrent refreshes](https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange?lang=node#send-the-refresh-request).

In this sample, OAuth acquisition and refresh share one database lock per shop across server processes. A batch that shares refresh duties with request handlers must use the same lock. Other shops can refresh in parallel. See the [lock implementation](../app/lib/shop-store.server.js).

```mermaid
flowchart TD
    Workers["Two workers try to refresh the same shop"]
    Workers --> SQL["PostgreSQL / MySQL (InnoDB)<br/>SELECT … FOR UPDATE locks the shop's row"]
    Workers --> Mongo["MongoDB<br/>findOneAndUpdate claims a 60-second lease<br/>if the shop's lease is absent or expired"]
    SQL --> Commit["Save the new pair and commit<br/>to release the row lock"]
    Mongo --> Release["Only the current lease owner can save the pair.<br/>It then clears the lease using its owner ID."]
    Commit --> Next["The waiting worker acquires the lock,<br/>rereads the record and reuses the fresh access token"]
    Release --> Next
```

#### Offline token refresh FAQ

**Does the merchant have to sign in every 90 days?**

Each successful refresh issues a new pair without a sign-in. The access token currently lasts one hour, and the new refresh token expires 90 days after that refresh. Use the returned `expires_in` and `refresh_token_expires_in` values. An app relying on this pair needs the merchant to reconnect if the refresh token expires. [Token lifetimes](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-lifetimes) · [Refresh token rotation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#how-refresh-token-rotation-works)

**How should a merchant backend integration authenticate to Shopify?**

After installation and scope approval, a custom app can export orders to the merchant's backend system (such as an ERP or another core business system) and process incoming inventory webhooks without a signed-in user.

- **Partner-owned app, client-owned store (custom distribution).** Obtain an expiring offline token at installation and refresh it on the server. [Standalone or API-only app authentication](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps?lang=node) · [Non-embedded Service Connector](#non-embedded-service-connector)
- **App and store in the merchant's Shopify organization.** The server can also use its client ID and secret to request a fresh token after months of inactivity, without a stored refresh token or a merchant session. [Client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant?lang=node) · [Compare with the application-only access token below](#four-token-types-compared)

<a name="unattended-custom-app-flows"></a>

*Unattended custom app flows*

```mermaid
flowchart TD
    Install["Merchant installs the app<br/>and approves scopes once"]
    subgraph Runtime["Sync runs without a merchant session"]
        Nightly["Scheduled order export<br/>Shopify → merchant backend"]
        Webhook["Inventory webhook<br/>Merchant backend → Shopify"]
        Nightly --> Method{"How will the custom app<br/>get its access token?"}
        Webhook --> Method
        Method -->|Any installed store| Offline["Use the offline token from installation<br/>Refresh and save both tokens if needed"]
        Method -->|Same organization only| Credentials["Reuse the access token or request one<br/>with client credentials"]
        Offline --> API["Call the Shopify Admin API"]
        Credentials --> API
    end
    Install -.-> Nightly
    Install -.-> Webhook
```

**Is an expiring offline token enough for background GraphQL Admin API calls?**

Yes. With the same approved scopes, an expiring offline token can make the same calls as a token issued through the client credentials grant, whether the app uses its client secret or a signed JWT (application-only access). [Shopify app authentication](https://shopify.dev/docs/apps/build/authentication-authorization#how-it-works)

If an inventory webhook arrives after months of inactivity and the refresh token has expired or been lost, the merchant must reconnect to resume offline refresh. For an eligible store where the app is still installed, client credentials let the server obtain a fresh token without a merchant session. [Shopify's token recovery guidance](https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange?lang=node#send-the-refresh-request) · [Eligibility by credential](#four-token-types-compared)

**Should we refresh offline tokens hourly, daily, or when work arrives?**

With on-demand refresh, check expiry when the nightly sync starts or the webhook needs the API. With a dedicated refresh batch, allow for scheduling delays when choosing how early to renew. If events may stop for months, a daily scan can refresh just the shops whose **refresh tokens** are nearing expiry. [Shopify's guidance for background jobs and idle stores](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-refresh)

**Can one batch or webhook worker handle all refreshes without a separate DB lock?**

Yes, if only one operation per app and shop can acquire or refresh tokens at a time, from reading the credentials through saving the new pair. This must hold across OAuth callbacks, retries, and all worker instances. Keep the shared lock if any of those paths can overlap. The previous access token remains usable until expiry. [Token acquisition and refresh](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-refresh) · [Concurrent refreshes and token validity](https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange?lang=node#send-the-refresh-request)

**Should webhook-driven Admin API calls go through a queue?**

Save the event to a queue before acknowledging delivery. One active job per app and shop is a simple way to smooth bursts while other shops run in parallel. Even serial calls can exhaust the GraphQL query-cost budget. Use `extensions.cost.throttleStatus` to pace requests and back off when throttled. [Queueing webhook deliveries](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries#queue-webhooks-to-handle-traffic-bursts) · [GraphQL Admin API rate limits](https://shopify.dev/docs/apps/build/apis/graphql-admin/rate-limits#graphql-response)

<a name="related-credentials-application-only-and-cli-automation-tokens"></a>

### Four Token Types Compared

| Credential | How it works | Use and limits | Example use case |
| --- | --- | --- | --- |
| [Expiring offline access token](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#token-refresh) | Store and refresh the pair issued after merchant authorization. The merchant reconnects if the refresh token expires or is lost. | Admin API calls with the app's approved scopes, including on client stores. Use an [online token](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens#online-access-tokens) for staff-specific permissions. | Merchant-triggered app operations, scheduled batches, and webhook jobs. |
| [Client credentials with a client secret](https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant?lang=node) | Request a token on demand with `grant_type=client_credentials`, the client ID, and the client secret. No refresh token. | Installed stores in the app's own organization only (24 hours). | Resume unattended jobs on the merchant's own stores without a usable refresh token. |
| [Application-only access token](https://shopify.dev/docs/apps/build/authentication-authorization/application-only-access-tokens) | Same grant, using a JWT signed with the app's private key (`client_assertion`). Request a fresh token on demand without a refresh token. | **Public distribution** covers any installed store (up to 1 hour). **Custom apps** cover only stores in their own organization (24 hours). | Resume a public app's jobs on client stores without a refresh token or merchant sign-in. |
| [App CLI automation / service account token](https://shopify.dev/docs/apps/build/cli-for-apps/service-accounts) | CI/CD deployment, release, and permitted dev store management | **Cannot read or write store data through the Admin API.** | Deploy an app from CI/CD with `shopify app deploy`. |

## Non-embedded Service Connector

With `embedded = false`, App Home opens outside the Admin iframe without App Bridge. The app issues a short-lived JWT for the handoff to `/mocklogin`. Both the installation check and `/mocklogin` obtain the shop's Admin access token through the [same refresh flow as the embedded app](#offline-token-refresh-before-api-use).

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant Admin as Shopify Admin
    participant Browser as Top-level browser page
    participant App as Remote app server
    participant Tokens as Offline token manager
    participant OAuth as Shopify OAuth
    participant Service as External service page

    Merchant->>Admin: Open a non-embedded app
    Admin->>Browser: Open app URL outside an iframe with signed parameters
    Browser->>App: GET app URL
    App->>App: Verify Shopify query HMAC and shop
    App->>Tokens: Get Admin access token for installation check
    Tokens-->>App: Current access token or reauthorization required
    opt Installation requires authorization
        App-->>Browser: Redirect to Shopify OAuth
        Browser->>OAuth: Authorize app
        OAuth-->>App: Callback with code and HMAC
        App->>Tokens: Authorize this shop with the callback code
        Tokens->>OAuth: Exchange code for access and refresh tokens
        OAuth-->>Tokens: Both tokens and their lifetimes
        Tokens-->>App: Both tokens saved for this shop
        App-->>Browser: Redirect to Shopify Admin app URL
        Browser->>App: GET signed non-embedded app URL again
    end
    App->>App: Create short-lived app-signed JWT containing shop
    App-->>Browser: Redirect to /mocklogin with app JWT
    Browser->>Service: Open plain external service page
    Service->>Service: Verify app JWT and resolve shop
    Service->>Tokens: Get Admin access token for the verified shop
    Tokens-->>Service: Current access token (refresh if needed)
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
