# Backend Migration Guide

## Contents

1. Migration decision
2. Repository inventory
3. Behavior contracts
4. Framework mapping
5. Authentication and security boundaries
6. Recommended implementation sequence
7. Completion criteria

## 1. Migration Decision

Do not equate the current Shopify CLI template with a mandatory architecture. Select one of these outcomes after inventorying the application:

| Outcome | Use when | Main risk |
|---|---|---|
| Maintain the server | The framework is supported by its own ecosystem and Shopify contracts can be updated independently | Continuing maintenance remains application-owned |
| Add current Shopify libraries | Existing routing is sound but authentication or API clients are outdated | Library assumptions can conflict with custom sessions |
| Port to React Router | The team wants the current Shopify template and can test all server behavior | Loader/action boundaries can hide lost middleware behavior |
| Build a parallel target | The application is large, tightly coupled, or lacks tests | Temporary duplication and data compatibility |
| Hybrid migration | Public endpoints, webhooks, or plain pages should remain outside the embedded shell | Multiple runtime boundaries need explicit ownership |

When the user explicitly invokes the modernization skill for implementation or explicitly requests branch isolation, use a dedicated migration branch before changing an Express or Koa application. Otherwise, follow the repository's normal branch policy. Keep the legacy implementation available through Git history as part of the test oracle. Use a parallel target or isolated worktree only when the user requests it or when both implementations must run side by side.

## 2. Repository Inventory

Search for framework and Shopify signals before reading files in depth:

- Server entry points: `app.js`, `server.js`, `server.mjs`, `index.js`, `entry.server.*`.
- Express: `express()`, `app.get`, `app.post`, `Router`, `res.redirect`, `res.json`.
- Koa: `new Koa`, `ctx.request`, `ctx.body`, `ctx.redirect`, `@koa/router`.
- Remix: `@remix-run`, `loader`, `action`, `json`, `redirect`.
- React Router: `react-router`, `@react-router/*`, `routes.ts`, `routes.js`.
- Shopify auth: OAuth authorize URLs, callback paths, HMAC checks, session-token verification, token exchange, session storage.
- Webhooks: topic registration, callback paths, raw-body access, HMAC verification, retry handling.
- Embedded behavior: App Bridge scripts, API key meta tags, `embedded`, `host`, CSP, `frame-ancestors`.
- Extension surfaces: `shopify.extension.toml`, targets, API versions, generated type files.
- API calls: Admin, Storefront, Customer Account, GraphQL endpoints, REST resources.

Create a current-state table:

| Area | Current implementation | Version | Entry point | Persistence | External caller | Test evidence |
|---|---|---|---|---|---|---|

Do not omit routes that appear to be utility endpoints. Printing, app proxies, post-purchase callbacks, Flow actions, and CORS preflight frequently depend on them.

## 3. Behavior Contracts

Use one row per externally observable operation:

| ID | Caller | Method/target | Path | Authentication | Input | Success | Failure | Side effect | Baseline |
|---|---|---|---|---|---|---|---|---|---|

Record these details where applicable:

- Whether the request originates in an Admin iframe, checkout sandbox, POS, customer account, storefront browser, Shopify webhook service, or external system.
- Whether the body must remain raw until HMAC verification.
- Whether the endpoint returns HTML, JSON, a redirect, an empty `204`, or a signed payload.
- Whether a GET requires a session token in the URL because the platform API cannot attach an authorization header.
- Whether cookies work in the caller's iframe or sandbox.
- Whether the route is allowed to render App Bridge and Polaris.
- Which shop identifier is trusted and how it is verified.

Capture a baseline without recording secrets. Save status codes, header names, redacted payload shapes, log event names, and screenshots where useful.

## 4. Framework Mapping

Treat this table as a discovery aid, not an automatic rewrite specification:

| Express or Koa concept | React Router target | Verification question |
|---|---|---|
| `app.get()` or router GET | Route `loader` or resource route | Does it return document HTML, JSON, or a redirect? |
| `app.post()` or router POST | Route `action` or server middleware | Is the body raw, form-encoded, or JSON? |
| `app.options()` or CORS middleware | Pre-router server handler or route-specific preflight handling | Can `OPTIONS` return before method rejection? |
| `req` / `ctx.request` | Web `Request` | Were proxy protocol and host normalization preserved? |
| `res.json()` / `ctx.body` | JSON `Response` or route data | Will a document request accidentally receive JSON or HTML? |
| `res.redirect()` / `ctx.redirect` | Redirect `Response` | Must the redirect escape an iframe? |
| Global middleware | Express adapter, server entry, root headers, or per-route helper | Does ordering still protect every route? |
| Error middleware | Error boundary plus server error handler | Are Shopify-required headers retained on thrown responses? |
| Session middleware | Shopify session storage or existing persistence adapter | Are online and offline sessions distinguished? |
| Static HTML route | Dedicated resource/document route outside the app shell | Could App Bridge force embedding or redirect it? |
| Webhook route | Top-level resource route or pre-router handler | Is the raw body available before parsing? |

Route names do not define semantics. Inspect callers and response consumption before assigning a loader or action.

## 5. Authentication and Security Boundaries

### OAuth and installation state

- Distinguish "token exists" from "token is valid for this app installation."
- Define how an uninstalled or revoked app forces a fresh OAuth flow.
- Keep the callback origin canonical and HTTPS in hosted environments.
- Verify OAuth `state`, callback HMAC, shop domain, scopes, and token response.
- Ensure OAuth starts outside the Shopify Admin iframe.

### Embedded requests

- Verify signed launch parameters only against the exact signed request.
- Do not manufacture a new path while retaining an HMAC from another URL.
- Use supported App Bridge navigation for embedded pages.
- Apply a shop-specific `frame-ancestors` policy to embedded HTML.
- Reject unsigned attempts to enter protected embedded pages.

### Session tokens

- Verify issuer, destination, audience, timestamps, signature, and shop binding.
- Determine whether the client sends the token in an authorization header, request body, or platform-generated URL.
- Do not confuse an ID token, authorization code, customer access token, and Admin access token.

### Webhooks

- Preserve the raw request body for HMAC validation.
- Return promptly and make processing idempotent.
- Keep webhook routes outside authenticated app layouts.
- Verify topic, shop domain, API version, and webhook identifier as required.

### Public and extension endpoints

- Define CORS origins, methods, headers, credentials, and cache duration explicitly.
- Return a valid preflight response before framework method handling.
- Authenticate post-purchase and extension requests independently of browser cookies.
- Separate public storefront pages from embedded App Bridge pages.

## 6. Recommended Implementation Sequence

1. Freeze a baseline, create a rollback point, and ensure implementation is on a dedicated migration branch when the branch-isolation rule applies.
2. Scaffold or configure the target runtime without moving business logic.
3. Port environment parsing, logging, persistence, and API clients.
4. Port OAuth, HMAC, session-token, and webhook verification.
5. Port one low-risk resource route and compare its contract.
6. Port embedded document routes and App Bridge behavior.
7. Port extension-facing endpoints, including CORS and token validation.
8. Port remaining business routes in coherent groups.
9. Migrate Shopify extension surfaces with the relevant AI Toolkit skills.
10. Remove legacy code only after all callers and behavior contracts pass.

Avoid a single commit that combines framework replacement, business-rule changes, API-version upgrades, and visual redesign.

## 7. Completion Criteria

A backend migration is complete only when:

- Every inventoried route is migrated, intentionally retained, or explicitly retired.
- OAuth install, reinstall, revoked-token recovery, and iframe escape work.
- Embedded navigation and direct access have the intended security behavior.
- Webhook HMAC verification and retries work with the raw body.
- Extension endpoints pass preflight and authenticate real requests.
- Public HTML does not accidentally load the embedded app shell.
- Automated tests and relevant manual Shopify flows pass.
- Logs distinguish routing, authentication, upstream API, and rendering failures without exposing secrets.
- Existing documentation matches the deployed behavior.
