---
name: shopify-app-modernization
description: Audit and modernize legacy Shopify applications while preserving behavior across server frameworks, embedded authentication, APIs, webhooks, UI extensions, Functions, themes, and web pixels. Use when Claude Code is asked to migrate Express or Koa apps to Remix or React Router, move Remix apps to React Router, respond to Shopify CLI template changes, upgrade API or package versions, migrate React UI extensions to Preact and Polaris web components, or plan and execute a repository-wide Shopify modernization.
---

# Shopify App Modernization

Modernize the application as a set of behavior-preserving migrations. Use Shopify AI Toolkit skills as the source of current Shopify-specific generation, and use this skill to inventory the complete repository, select a migration strategy, sequence the work, and verify cross-cutting behavior.

## Operating Principles

1. Preserve observable behavior before improving structure.
2. Do not infer that a new Shopify CLI template makes a framework rewrite mandatory.
3. Separate required platform upgrades from optional framework modernization.
4. When the user explicitly invokes this skill by name or invocation syntax and implementation will modify files, ensure that work is on a dedicated migration branch before the first edit. Apply the same rule when the prompt explicitly requests branch isolation. Do not infer this requirement merely because the skill matched automatically.
5. Delegate supported surface migrations to Shopify AI Toolkit instead of maintaining a competing component or API mapping.
6. Use Shopify MCP-backed documentation and validators before relying on memory.
7. Keep business rules, stored data, public endpoints, and integration contracts unless the user explicitly approves a behavior change.
8. Never report a migration as complete from a successful build alone. Run the risk-based checks in [references/regression-checklist.md](references/regression-checklist.md).

## Select the Working Mode

Infer the mode from the request:

- **Audit**: inspect only; produce an inventory, risks, and recommended target.
- **Plan**: produce a sequenced migration plan and behavior contracts without editing.
- **Implement**: audit first, then migrate in reviewable increments and validate each increment.
- **Review**: compare an existing migration against current Shopify guidance and the regression checklist.

Do not edit when the user asks only for investigation, design, or an opinion.

## Shopify AI Toolkit Prerequisite

Before generating Shopify-specific code:

1. Check whether the Shopify AI Toolkit plugin and the relevant Shopify skill are available in the current Claude Code session.
2. Use the most specific skill for the detected surface.
3. Use Shopify MCP documentation search and validation tools supplied by the toolkit.
4. If a required toolkit capability is unavailable, report that limitation instead of pretending to invoke it. Continue only with repository analysis or with an explicitly approved documentation-based fallback.

For Admin UI extensions targeting `2025-10`, invoke the official `shopify polaris admin extensions` migration workflow described in [references/shopify-toolkit-routing.md](references/shopify-toolkit-routing.md).

## Workflow

### 1. Establish Repository Safety

- Read `CLAUDE.md`, `AGENTS.md`, repository instructions, and existing documentation.
- Check the current branch, worktree status, remotes, package manager, and deployment configuration.
- Identify uncommitted user changes and generated files. Never revert unrelated work.
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

Use [references/backend-migration.md](references/backend-migration.md). Produce an inventory table before selecting a target architecture.

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

Explain why the selected strategy fits this repository. Do not force React Router solely because it is the current Shopify template.

### 5. Delegate Shopify-Specific Work

Read [references/shopify-toolkit-routing.md](references/shopify-toolkit-routing.md).

- Invoke the relevant Shopify AI Toolkit skill for each supported surface.
- Supply the actual extension directory, current API version, target API version, and behavior constraints.
- Use current Shopify documentation for the detected target.
- Validate generated components, GraphQL, Function queries, and theme files with the corresponding toolkit validators.
- Review the generated diff before moving to another subsystem.

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
- Run Shopify validation tools.
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
- Do not use one sample application's implementation as universal boilerplate. Extract behavior and verify the target against current Shopify documentation.

## References

- Read [references/backend-migration.md](references/backend-migration.md) for framework detection, route mapping, and behavior-contract templates.
- Read [references/shopify-toolkit-routing.md](references/shopify-toolkit-routing.md) before invoking Shopify AI Toolkit skills and validators.
- Read [references/regression-checklist.md](references/regression-checklist.md) before planning tests or declaring completion.
- Read [references/field-lessons.md](references/field-lessons.md) when diagnosing failures after a seemingly successful migration.
