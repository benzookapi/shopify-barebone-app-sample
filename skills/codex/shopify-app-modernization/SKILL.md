---
name: shopify-app-modernization
description: Audit and modernize legacy Shopify applications while preserving behavior across server frameworks, embedded authentication, APIs, webhooks, UI extensions, Functions, themes, and web pixels. Use when Codex is asked to migrate Express or Koa apps to Remix or React Router, move Remix apps to React Router, respond to Shopify CLI template changes, upgrade API or package versions, migrate React UI extensions to Preact and Polaris web components, or plan and execute a repository-wide Shopify modernization.
---

# Shopify App Modernization

Modernize the application as a set of behavior-preserving migrations. Treat Shopify AI Toolkit skills as authoritative converters for supported Shopify surfaces, and use this skill to inventory the whole repository, select a migration strategy, sequence the work, and prevent cross-cutting regressions.

## Operating Principles

1. Preserve observable behavior before improving structure.
2. Do not infer that a new Shopify CLI template makes a framework rewrite mandatory.
3. Separate required platform upgrades from optional framework modernization.
4. When the user explicitly invokes this skill by name or invocation syntax and implementation will modify files, ensure that work is on a dedicated migration branch before the first edit. Apply the same rule when the prompt explicitly requests branch isolation. Do not infer this requirement merely because the skill matched automatically.
5. Delegate surface-specific generation to the relevant Shopify skill or MCP documentation instead of maintaining a competing component or API mapping.
6. Validate generated Shopify component, GraphQL, Function, and theme code with the available Shopify validators.
7. Keep business rules, stored data, public endpoints, and integration contracts unless the user explicitly approves a behavior change.
8. Never report a migration as complete from a successful build alone. Run the risk-based checks in [references/regression-checklist.md](references/regression-checklist.md).

## Select the Working Mode

Infer the mode from the request:

- **Audit**: inspect only; produce an inventory, risks, and recommended target.
- **Plan**: produce a sequenced migration plan and behavior contracts without editing.
- **Implement**: audit first, then migrate in reviewable increments and validate each increment.
- **Review**: compare an existing migration against current Shopify guidance and the regression checklist.

Do not edit when the user asks only for investigation, design, or an opinion.

## Workflow

### 1. Establish Repository Safety

- Read repository instructions and existing documentation.
- Check the current branch, worktree status, remotes, package manager, and deployment configuration.
- Identify user changes and generated files. Never revert unrelated work.
- Locate a pre-migration tag, branch, release, or commit when available.
- When the dedicated-branch rule applies, reuse a migration branch identified by the user or create one before editing. Follow repository branch-naming rules. Otherwise, retain the current branch unless other instructions require a change.
- Keep the migration in the existing repository by default. Use an adjacent scaffold or worktree only when the user requests it or a side-by-side runnable comparison is technically necessary.

### 2. Inventory the Application

Inspect at least:

- Server framework and runtime: Express, Koa, Remix, React Router, custom Node server, or another stack.
- Shopify packages, versions, API versions, CLI version, and package manager.
- HTTP routes and methods, including `OPTIONS`, callbacks, app proxy routes, webhooks, and public pages.
- OAuth, online/offline access tokens, session tokens, HMAC verification, session storage, uninstall behavior, and token refresh logic.
- Embedded and non-embedded entry points, App Bridge initialization, CSP, iframe escape, and navigation.
- Admin, Storefront, Customer Account, and Partner API calls.
- UI extensions, Functions, theme app extensions, web pixels, Flow actions, and post-purchase surfaces.
- Databases, queues, external services, environment variables, and deployment assumptions.
- Tests, logs, manual setup steps, and existing operational documentation.

Use the templates and mappings in [references/backend-migration.md](references/backend-migration.md). Produce an inventory table before selecting a target architecture.

### 3. Capture Behavior Contracts

For every externally reachable route or extension, record:

- Method, path or extension target, caller, and authentication mechanism.
- Required query parameters, headers, body shape, and raw-body requirements.
- Success response, redirect, error response, CORS policy, and security headers.
- Shopify scopes, token type, API operation, and persisted data.
- Side effects such as webhook registration, database writes, cart mutation, or printing.
- A reproducible baseline test or log signature.

Treat these contracts as migration acceptance criteria. Do not rely only on file-by-file parity.

### 4. Choose a Migration Strategy

Choose one strategy per subsystem:

- **Maintain**: keep the framework and update only unsupported APIs, packages, or security behavior.
- **Adapt**: introduce current Shopify packages within the existing server.
- **Replace**: scaffold the target framework and port behavior route by route.
- **Isolate**: keep a plain HTML, app proxy, webhook, or external service endpoint outside the embedded app shell.
- **Retire**: remove behavior only with explicit approval and evidence that it is unused.

Explain why the selected strategy is safer than the alternatives for this repository. Do not force React Router solely because it is the current template.

### 5. Route Work Through Shopify AI Toolkit

Read [references/shopify-toolkit-routing.md](references/shopify-toolkit-routing.md) before generating Shopify-specific code.

- Load the relevant Shopify skill or API context before implementation.
- For supported migrations, invoke the official Shopify AI Toolkit skill with the detected surface and target version.
- For Admin UI extensions targeting `2025-10`, use the official `shopify polaris admin extensions` migration workflow rather than recreating its component mapping.
- Use current documentation for the detected target. Do not treat examples in this skill as a substitute for Shopify documentation.
- Validate every generated Shopify component or GraphQL operation with the corresponding validator.

### 6. Implement in Reviewable Increments

Use dependency order:

1. Runtime, package manager, configuration, and environment contracts.
2. Session storage, OAuth, token lifecycle, HMAC, and webhook authentication.
3. Server routes and API clients.
4. Embedded shell, App Bridge, CSP, navigation, and public-page isolation.
5. UI extensions and their server endpoints.
6. Functions, themes, web pixels, and optional surfaces.
7. Documentation and deployment configuration.

Keep UI document routes separate from JSON or other resource routes. Preserve HTTP methods and content types. Handle preflight requests before framework routing rejects them.

After each increment:

- Build or type-check the affected workspace.
- Run focused tests.
- Validate Shopify artifacts.
- Compare the behavior contract.
- Update existing documentation made stale by the change.

### 7. Validate and Report

Apply [references/regression-checklist.md](references/regression-checklist.md) according to the affected surfaces. Clearly separate:

- Automated checks completed.
- Manual Shopify Admin, checkout, storefront, customer account, or POS checks completed.
- Checks that require credentials, a development store, deployment, or user action.
- Intentional behavior changes.
- Remaining deprecated packages, API versions, and migration risks.

## Required Outputs

For an audit or plan, produce:

1. Current-state inventory.
2. Behavior-contract table.
3. Target recommendation and alternatives.
4. Sequenced migration plan with risk and validation per phase.
5. Blockers and manual Shopify tests.

For implementation, additionally produce:

1. A scoped change summary.
2. Validation evidence.
3. Remaining work and rollback boundary.

## Guardrails

- Apply the dedicated-branch requirement only when this skill is explicitly invoked or the prompt explicitly requests branch isolation. Do not impose it on unrelated repository work.
- Do not rotate credentials, reinstall the app, deploy, or mutate production data without explicit authorization.
- Do not expose access tokens, session tokens, authorization codes, HMAC secrets, or webhook payload PII in reports.
- Do not silently replace custom authentication or persistence with a template default.
- Do not discard old routes until callers and webhook registrations have been traced.
- Do not assume a `200` document response proves that OAuth, hydration, extension rendering, or client-side JSON loading succeeded.
- Do not use this repository's implementation as universal boilerplate. Extract the behavior and verify the target against current Shopify documentation.

## References

- Read [references/backend-migration.md](references/backend-migration.md) for framework detection, route mapping, and behavior-contract templates.
- Read [references/shopify-toolkit-routing.md](references/shopify-toolkit-routing.md) before delegating work to Shopify AI Toolkit skills and validators.
- Read [references/regression-checklist.md](references/regression-checklist.md) before planning tests or declaring completion.
- Read [references/field-lessons.md](references/field-lessons.md) when diagnosing failures after a seemingly successful migration.
