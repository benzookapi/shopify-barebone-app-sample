# Storefront API

## Purpose

The `/storefront` sample opens a plain HTML storefront comparing tokenless, public-token, and server-side private-token access. It includes cart operations, Storefront Web Components, and optional Customer Account API login.

## Access Preparation

```mermaid
sequenceDiagram
    autonumber
    actor Merchant
    participant UI as Embedded /storefront page
    participant App as /storefront.json
    participant AdminAPI as Admin GraphQL API
    participant Store as Shop metafield storage
    participant Plain as Standalone storefront page

    Merchant->>UI: Enter Customer Account Client ID for optional login
    Merchant->>UI: Prepare Storefront access
    UI->>App: Authenticated request
    App->>AdminAPI: Query or create public Storefront access token
    App->>App: Ensure fresh offline parent token under shop lock
    App->>AdminAPI: delegateAccessTokenCreate with bounded lifetime
    AdminAPI-->>App: Public and delegated private tokens
    App->>Store: Store private token, expiry, and parent generation
    App-->>UI: Public token and callback URL
    Merchant->>UI: Open plain custom storefront page
    UI->>Plain: URL with shop, public token, and entered Client ID
```

### Delegated Token Lifecycle

Private tokens cannot outlive the parent Admin token. The server refreshes the parent when needed and regenerates delegated tokens near expiry or when the parent changes, under a per-shop lock. Run **Prepare Storefront access** once before using this mode.

See the [offline refresh sequence](00-ARCHITECTURE.md#offline-token-refresh-before-api-use) and [delegated-token helper](../app/lib/delegated-token.server.js).

## Product and Cart Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Page as views/storefront.html
    participant Components as Storefront Web Components
    participant Server as /storefront/plain
    participant API as Storefront GraphQL API

    User->>Page: Choose tokenless, public, or private mode
    User->>Page: Show products
    alt Tokenless or public mode
        Page->>API: Product query directly from browser
    else Private delegated mode
        Page->>Server: POST action=show_product
        Server->>Server: Load or regenerate delegated private token
        Server->>API: Product query with private token
    end
    API-->>Page: Ten products and variants
    Page->>Components: Bind product handles to shopify-context
    Components->>API: Resolve title, media, and price
    Components-->>Page: Render selectable product tiles
    User->>Page: Select variant and create cart
    Page->>API: cartCreate or equivalent server action
    API-->>Page: Cart, delivery groups, checkoutUrl
    Page-->>User: Show normal and sso=silent checkout links
```

## Customer Login and Buyer Identity

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Page as Standalone storefront page
    participant App as Customer Account routes
    participant Discovery as Shop OIDC discovery
    participant Account as Customer Account authorization
    participant Session as Server-side session store
    participant Storefront as Storefront Cart API

    Customer->>Page: Start Customer Account login
    Page->>App: GET /customer-account/login with entered Client ID
    App->>Discovery: Fetch OpenID configuration
    App->>App: Create state and PKCE verifier, retain Client ID temporarily
    App-->>Account: Redirect authorization request with Client ID
    Account-->>App: Callback with code and state
    App->>App: Validate and consume state
    App->>Account: Exchange code plus verifier using the same Client ID
    App->>Account: Query customer profile with customer token
    App->>Session: Store tokens and profile, then set HttpOnly session cookie
    App-->>Page: Redirect to standalone page
    Customer->>Page: Apply logged-in identity to current cart
    Page->>App: POST action=apply_customer_identity
    App->>Session: Read matching shop session
    App->>Storefront: cartBuyerIdentityUpdate with customerAccessToken
    Storefront-->>Page: Updated cart and checkoutUrl
```

## How It Works

The page defaults to public-token mode because password-protected development stores can reject tokenless access. Private calls stay on the app server. Product tiles use [Storefront Web Components](https://shopify.dev/docs/api/storefront-web-components); cart actions use explicit GraphQL mutations.

To enable customer login:

1. Open **Headless** from the management page and create a storefront with a public Customer Account API client.
2. Register the displayed `/customer-account/callback` URL and JavaScript origin in that client's settings.
3. Enter its Client ID in the management page. This is separate from the app API key; it is passed in the page URL and must be re-entered after reload. No environment-variable fallback is used.

The server handles PKCE/OIDC login and stores customer credentials behind an HttpOnly session cookie. Apply the logged-in identity to the cart explicitly; login alone does not update it. Without a Client ID, product and cart samples still work. See the [official setup guide](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started).

## Common Pitfalls

- Run **Prepare Storefront access** before token-based calls. An Online Store password can block tokenless access.
- Keep private tokens out of HTML, URLs, JavaScript, and browser storage.
- Use a Customer Account API client for the same store and its own token/header conventions, not Admin OAuth conventions.
- Refresh cart delivery choices after buyer identity or address changes; country and language affect results.
- The `sso=silent` checkout link uses an existing Customer Accounts browser session independently of the cart's stored buyer identity.

## Source Map

- [Preparation UI](../app/pages/Storefront.jsx) and [plain storefront](../views/storefront.html)
- [Storefront and cart operations](../app/lib/storefront.server.js)
- [Delegated token management](../app/lib/delegated-token.server.js)
- [Customer login and session](../app/lib/customer-account.server.js)

## Official Shopify References

- [Storefront API](https://shopify.dev/docs/api/storefront/unstable)
- [Storefront API access](https://shopify.dev/docs/api/usage/authentication#storefront-api-access-tokens)
- [Storefront Cart API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart)
- [Storefront Web Components](https://shopify.dev/docs/api/storefront-web-components)
- [Customer Account API](https://shopify.dev/docs/api/customer/unstable)
- [Get started with Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started)
- [Authenticate buyers in checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/checkout-authentication)
