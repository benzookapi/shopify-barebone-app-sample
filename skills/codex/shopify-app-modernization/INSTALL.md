# Install and Use the Codex Skill

This directory contains the Codex edition of `shopify-app-modernization`. It audits and modernizes legacy Shopify applications while preserving server, authentication, extension, and integration behavior.

## Prerequisites

- Codex CLI, the Codex IDE extension, or the ChatGPT desktop Codex experience.
- Git available in the target repository.
- Shopify AI Toolkit skills or Shopify MCP documentation and validators available in the Codex environment for Shopify-specific generation.
- A Shopify development store for manual validation when implementation reaches Shopify-hosted surfaces.

The skill can still produce a repository inventory when Shopify tooling is unavailable, but it must report that it could not perform Shopify-specific generation or validation.

## Install for One Repository

Codex discovers repository skills under `.agents/skills`. From the root of this repository, create a relative symlink:

```bash
mkdir -p .agents/skills
ln -s ../../skills/codex/shopify-app-modernization .agents/skills/shopify-app-modernization
```

The relative symlink remains valid when the repository is cloned to another location. Restart Codex or reload the workspace after installing it.

To install by copying instead of linking:

```bash
mkdir -p .agents/skills
cp -R skills/codex/shopify-app-modernization .agents/skills/
```

The copied installation does not receive later updates made under `skills/codex/` automatically.

## Install for the Current User

From this repository root:

```bash
mkdir -p "$HOME/.agents/skills"
ln -s "$(pwd)/skills/codex/shopify-app-modernization" "$HOME/.agents/skills/shopify-app-modernization"
```

User-level skills apply to every repository opened by that user. Use the repository installation when a team should receive and version the skill together with a project.

Codex skill locations and symlink support are documented in the [official Codex skills guide](https://developers.openai.com/codex/skills/).

## Verify the Installation

Start a new Codex task in the target repository and ask:

```text
List the available skills related to Shopify modernization.
```

The response should include `shopify-app-modernization`.

## Use the Skill

Invoke it explicitly with `$shopify-app-modernization`.

Audit without editing:

```text
Use $shopify-app-modernization to audit this legacy Shopify app. Inventory the server framework, authentication, routes, webhooks, extensions, API versions, and migration risks. Do not change files.
```

Create a migration plan:

```text
Use $shopify-app-modernization to plan an Express-to-React-Router migration. Preserve every public endpoint and Shopify authentication behavior, and identify the Shopify AI Toolkit skills and validators required for each phase.
```

Implement a migration:

```text
Use $shopify-app-modernization to modernize this app. Establish behavior contracts, migrate in reviewable phases, and run the applicable regression checklist.
```

Review an existing migration:

```text
Use $shopify-app-modernization to review this migration against the previous release and current Shopify documentation. Lead with behavior regressions and missing validation.
```

## Branch Behavior

The dedicated-branch rule applies only when the user explicitly invokes this skill by name or invocation syntax, or when the prompt explicitly requests branch isolation. Automatic skill matching alone does not enable the rule.

- Audit or planning with no file changes stays on the current branch.
- Implementation first checks whether the user has supplied a dedicated migration branch.
- If no dedicated migration branch exists, the skill creates one before the first edit, following repository naming rules.
- Routine work that does not invoke this skill is unaffected.
- A separate directory or repository is not required. Use one only when the user requests it or both implementations must run side by side.

## Shopify AI Toolkit Integration

The skill coordinates Shopify AI Toolkit rather than replacing it. For example, Admin UI extension migration to API version `2025-10` should use Shopify's `polaris admin extensions` skill, followed by component validation and real Admin testing.

- [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit)
- [Admin UI extension upgrade to 2025-10](https://shopify.dev/docs/apps/build/admin/upgrading-to-2025-10)

## Remove the Installation

Delete the symlink or copied skill from `.agents/skills/shopify-app-modernization` or `$HOME/.agents/skills/shopify-app-modernization`. The source files under this repository's `skills/codex/` directory remain unchanged.
