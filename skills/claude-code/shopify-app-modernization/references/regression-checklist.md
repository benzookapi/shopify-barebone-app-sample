# Modernization Regression Checklist

Apply only the sections affected by the migration, but never skip authentication and routing checks after a server-framework change.

## Installation and OAuth

- [ ] First installation obtains and persists the intended token type.
- [ ] Opening the app with a valid installation does not restart OAuth.
- [ ] Reinstalling after uninstall does not trust a stale token merely because it exists.
- [ ] Revoked or invalid tokens trigger a fresh authorization flow.
- [ ] OAuth escapes the Admin iframe before reaching the authorization endpoint.
- [ ] Callback HMAC, `state`, shop domain, and scopes are verified.
- [ ] Callback and application URLs use the canonical HTTPS origin in hosted environments.
- [ ] Token and authorization-code values are redacted from logs.

## Embedded App and Navigation

- [ ] A signed Shopify launch request renders the embedded app.
- [ ] Unsigned protected entry requests are rejected or redirected as designed.
- [ ] App Bridge receives the correct API key and host context.
- [ ] Side navigation and in-page navigation reach every route without invalid HMAC reuse.
- [ ] Browser back/forward and direct reload work.
- [ ] CSP allows only the intended Shopify Admin ancestors.
- [ ] OAuth and external links can escape the iframe where required.
- [ ] Non-embedded mode does not accidentally render embedded-only controls.

## Server Routes and Responses

- [ ] Every inventoried method/path pair returns the expected status and content type.
- [ ] HTML document routes never return JSON expected by client code, and JSON resource routes never return HTML error documents.
- [ ] Redirect status, location, and query preservation match the baseline.
- [ ] `HEAD` requests are harmless where hosting or Shopify probes them.
- [ ] `OPTIONS` preflight returns before framework method rejection.
- [ ] CORS headers are present on success and error responses where required.
- [ ] Proxy protocol and host handling produce correct public URLs.
- [ ] Errors identify the failed boundary without leaking secrets.

## Sessions and Tokens

- [ ] Online and offline Admin sessions are not confused.
- [ ] Session-token claims and shop binding are verified.
- [ ] Customer Account authorization codes are exchanged for the correct token type.
- [ ] Customer Account API calls use the customer access token, not the authorization code or ID token.
- [ ] POS or platform APIs that load a URL via GET receive any required session token through a supported mechanism.
- [ ] Token refresh and expiry behavior are tested.

## Webhooks and App Proxy

- [ ] Webhook HMAC is calculated from the unmodified raw body.
- [ ] Webhook routes are reachable without embedded-app authentication.
- [ ] Duplicate deliveries are safe or idempotent.
- [ ] App-uninstalled processing invalidates or removes installation state.
- [ ] App proxy signatures and response requirements are preserved.
- [ ] Payload logging is structured, redacted, and appropriate for production data.

## Shopify API Calls

- [ ] GraphQL operations validate against the configured API version.
- [ ] Required scopes match deployed configuration.
- [ ] Upstream non-JSON and error responses are handled before JSON parsing.
- [ ] Resource IDs use the expected GID or numeric format at every boundary.
- [ ] Storefront public-token, private/server, and tokenless modes remain distinct.
- [ ] Password-protected or locked Online Store behavior is documented and tested.
- [ ] Rate limits, retries, and idempotency requirements are preserved.

## UI Extensions

- [ ] The API version and extension target are supported.
- [ ] Components validate for the exact target.
- [ ] React-to-Preact hook and event semantics are tested, not only compiled.
- [ ] The global `shopify` API is available where expected.
- [ ] Generated type files and `tsconfig` do not emit over source files.
- [ ] Extension fetches authenticate and pass CORS preflight.
- [ ] Metafield owner IDs and value formats match runtime data.
- [ ] Empty, loading, error, and success states render.

## Functions

- [ ] Function target and input query match the configured API version.
- [ ] Input GraphQL validates against the exact Function schema.
- [ ] Configuration metafields match the runtime parser.
- [ ] Operations reference the intended IDs rather than the first array element.
- [ ] Positive, negative, missing-config, and malformed-config fixtures pass.
- [ ] Configuration UI behavior matches Function behavior.

## Theme and Web Pixel

- [ ] Theme validation and Theme Check pass.
- [ ] App blocks and embeds render with default and empty settings.
- [ ] Assets and locale/schema references resolve.
- [ ] Web pixel privacy settings are explicit.
- [ ] Nullable analytics payload fields do not crash serialization.
- [ ] Network delivery is observable without logging sensitive customer data.

## Checkout, Post-Purchase, Customer Account, and POS

- [ ] Checkout blocking returns allow/block behavior that matches the displayed message.
- [ ] Post-purchase requests authenticate and return the expected signed data.
- [ ] Upsell identifiers exclude null or malformed entries.
- [ ] Customer Account extensions receive real order data and resolve configured metafields.
- [ ] POS actions are tested on each supported device class needed by the app.
- [ ] Printing reaches a printable document and records platform API failures.

## Deployment and Documentation

- [ ] Production build uses the intended package manager and installs build dependencies.
- [ ] Environment-variable requirements are documented without secret values.
- [ ] Shopify TOML redirect URLs, scopes, embedded mode, and extension targets match deployment.
- [ ] Existing README and architecture documentation describe the migrated behavior.
- [ ] A rollback point and data compatibility statement exist.
- [ ] Remaining manual tests and unsupported surfaces are reported explicitly.
