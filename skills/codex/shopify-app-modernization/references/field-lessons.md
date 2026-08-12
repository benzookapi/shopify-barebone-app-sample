# Field Lessons From a Real Shopify Modernization

## Evidence Base

These lessons were generalized from the modernization history of `shopify-barebone-app-sample`:

- Baseline tag: `pre-modern-shopify-refactor-20260610`
- Main modernization: `34b07dd` (`Modernize Shopify barebone app sample`)
- Preact migration: `584c991`
- POS Printing API migration: `1df0f4d`
- Customer Account and POS management pages: `082d484`
- Cart Transform Function sample: `b5fbfc6`

The main modernization replaced a large Koa-style single server with React Router routes and server modules while also updating App Bridge, extensions, Functions, theme code, and web pixels. The follow-up fixes are especially valuable because they expose failures that compilation and initial conversion did not catch.

Do not copy implementation details from these commits without checking current Shopify documentation. Use the cases below as diagnostic prompts and regression tests.

## Cases

### A stored token existed but the installation was invalid

**Symptom:** The app returned its normal top-level page or stayed in the Admin without completing a new OAuth callback after reinstall.

**Lesson:** Token presence is not installation validity. Bind stored installation data to the current app identity and scopes, and probe or otherwise detect revoked credentials. Invalid state must lead to a fresh OAuth flow.

### OAuth was attempted inside the embedded iframe

**Symptom:** The server logged an authorization URL, but the callback was never reached.

**Lesson:** Generating the URL is insufficient. The browser must navigate at the top level. Test the full iframe escape and callback, not only the server branch.

### The callback origin was derived incorrectly behind a proxy

**Symptom:** The OAuth URL contained an HTTP callback for a hosted HTTPS app.

**Lesson:** Use a canonical public application URL or correctly trusted proxy headers. Add an assertion or diagnostic for callback origin.

### Embedded home links produced `400` while side navigation worked

**Symptom:** In-app links reused launch query parameters or lost valid App Bridge context, causing HMAC verification failures.

**Lesson:** Do not retain an HMAC while changing the signed path or parameters. Use supported App Bridge navigation and verify signatures only on the exact request Shopify signed.

### A JSON consumer received `<!DOCTYPE html>`

**Symptom:** Client code failed with `Unexpected token '<'` and React hydration errors.

**Lesson:** Separate UI document routes from JSON resource routes. Log upstream status, content type, and a redacted response shape before parsing.

### A plain storefront page returned to the embedded app

**Symptom:** A page intended for an external tab loaded App Bridge or the embedded shell and navigated back to Admin.

**Lesson:** Serve truly public or plain HTML through a dedicated route that does not initialize App Bridge. Apply a security policy appropriate to that page rather than reusing the embedded shell.

### Extension requests failed before reaching application logic

**Symptom:** `OPTIONS` returned `405`, followed by failed post-purchase or extension fetches.

**Lesson:** Handle CORS preflight before React Router method dispatch rejects the request. Return consistent CORS headers on both success and failure.

### Post-purchase product lookup repeatedly returned `400`

**Symptom:** Product ID arrays contained `null` or malformed values, and retries repeated the same bad request.

**Lesson:** Validate and normalize extension inputs at the server boundary. Log redacted parsed inputs and reject invalid values with a useful error.

### Customer Account API rejected the exchanged value

**Symptom:** A profile query reported that the token lacked the expected access-token prefix.

**Lesson:** Keep authorization code, ID token, access token, and refresh token types explicit. Validate the token exchange response before issuing API queries.

### POS printing loaded on one device but stalled or failed on another

**Symptom:** The server endpoint worked in a browser, while the POS print flow depended on device capability and URL-loading behavior.

**Lesson:** Platform APIs must be tested on supported device classes. Preserve explicit session-token transport when the printing API loads a GET URL and cannot attach the app's normal request headers.

### Generated TypeScript settings tried to overwrite source files

**Symptom:** The editor reported that JavaScript output would overwrite input `.js` files.

**Lesson:** Extension-local TypeScript configuration must match the Preact runtime and use `noEmit` for checked JavaScript/JSX sources. Use the bundler-compatible module resolution expected by the toolchain.

### A Function hid the wrong payment method

**Symptom:** Configuration named a payment method, but the Function returned the first method ID instead of the matching ID.

**Lesson:** Migration can preserve an existing business-logic bug. Add fixtures that assert selected IDs and outputs, not merely non-empty operations.

### Customer Account metafield IDs used inconsistent formats

**Symptom:** Metafields were present, but no upsell product was resolved.

**Lesson:** Normalize numeric IDs and GraphQL GIDs at explicit boundaries. Test with runtime payloads from the actual extension surface.

### Storefront access modes appeared interchangeable

**Symptom:** Public-token requests behaved like tokenless requests, or tokenless product queries failed on a password-protected store.

**Lesson:** Keep server token, public token, and tokenless modes distinct in state and request construction. Document Online Store channel restrictions and require token preparation where applicable.

## How to Use These Lessons

During an audit, search for the underlying risk even if the exact symptom has not occurred. During implementation, turn every applicable lesson into a behavior contract and test. During review, prioritize these boundaries before style or internal abstraction findings.
