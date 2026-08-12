# Shopify AI Toolkit Routing

## Purpose

Use Shopify AI Toolkit and Shopify MCP as the current source of truth for platform-specific generation and validation. Use the modernization skill to coordinate these tools across a repository and preserve behavior.

## Routing Table

| Repository surface | Preferred Shopify capability | Required follow-up |
|---|---|---|
| App Home and embedded admin UI | Polaris App Home skill | Validate Polaris web components and test App Bridge navigation |
| Admin UI extension | Polaris Admin Extensions skill | Validate against the extension target and API version |
| Checkout UI extension | Polaris Checkout Extensions skill | Validate target components and test checkout capabilities |
| Customer Account UI extension | Polaris Customer Account Extensions skill | Validate target components and test real order/profile data |
| POS UI extension | POS UI skill | Validate target APIs and test supported POS devices |
| Shopify Function | Shopify Functions skill | Validate input GraphQL against the exact Function API schema and run Function tests |
| Theme app extension | Liquid skill and theme validator | Run Theme Check and test app blocks/embeds in a theme |
| Admin API | Admin GraphQL skill | Validate every generated GraphQL operation |
| Storefront API | Storefront GraphQL skill | Validate operations and test the selected access mode |
| Customer Account API | Customer Account API skill | Validate OAuth/OIDC flow and token type |
| App and extension configuration | Shopify CLI skill | Validate TOML, supported targets, and build/deploy configuration |
| App Store readiness | App Store Review skill | Run only after implementation and security checks |

If a surface is not covered by a specialized skill, use Shopify documentation search before relying on memory.

## Official Admin UI Extension Migration

Shopify's `2025-10` upgrade guide directs developers to ask their coding agent:

> Use the shopify polaris admin extensions skill to migrate the `extensions/$extensionFolder` extension to version 2025-10.

Use that official workflow for the bulk conversion from legacy Admin UI extension React components to Preact and Polaris web components. Then review:

- `shopify.extension.toml` API version and target.
- Package dependencies.
- Extension-local TypeScript configuration.
- Generated `shopify.d.ts` and the global `shopify` API.
- Hook migration and event-handler semantics.
- Component-property mappings.
- Local rendering and real Admin behavior.

Do not copy the `2025-10` target blindly. Detect the current extension version, identify the requested target, and consult current Shopify documentation.

Official guide: https://shopify.dev/docs/apps/build/admin/upgrading-to-2025-10

## Tool Invocation Rules

1. Load or invoke the API-specific Shopify skill before generating code for that surface.
2. Keep the same Shopify MCP conversation context across related documentation and validation calls when the client requires it.
3. Detect the API version from configuration; do not silently switch to `unstable` or `latest`.
4. Validate generated component code immediately with the component validator.
5. Validate GraphQL against the exact Admin, Storefront, Customer, or Function schema.
6. Validate all changed theme files with the theme validator.
7. Use Shopify CLI for configuration and build validation, but do not deploy without authorization.
8. Review generated changes before continuing to the next subsystem.

## What AI Toolkit Does Not Prove

A successful conversion or validator result does not prove:

- OAuth and token lifecycle behavior.
- Session storage compatibility.
- Correct middleware ordering.
- Raw-body webhook verification.
- CORS preflight handling.
- CSP and iframe behavior.
- Correct JSON versus HTML response boundaries.
- Store-specific scopes and capabilities.
- Device-specific POS behavior.
- Preservation of business rules.

Cover these with behavior contracts and the regression checklist.
