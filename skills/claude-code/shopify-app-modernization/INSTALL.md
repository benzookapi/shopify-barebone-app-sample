# Install and Use the Claude Code Skill

This directory contains the Claude Code edition of `shopify-app-modernization`. It audits and modernizes legacy Shopify applications while preserving server, authentication, extension, and integration behavior.

## Prerequisites

- Claude Code with skill support.
- Git available in the target repository.
- Shopify AI Toolkit installed in Claude Code for Shopify-specific generation and validation.
- A Shopify development store for manual validation when implementation reaches Shopify-hosted surfaces.

Install the Shopify AI Toolkit from inside Claude Code if it is not already available:

```text
/plugin marketplace add Shopify/shopify-ai-toolkit
/plugin install shopify-plugin@shopify-ai-toolkit
```

See the [Shopify AI Toolkit installation guide](https://shopify.dev/docs/apps/build/ai-toolkit) for current instructions.

## Install for One Repository

Claude Code discovers project skills under `.claude/skills`. From the root of this repository, copy the skill into that directory:

```bash
mkdir -p .claude/skills
cp -R skills/claude-code/shopify-app-modernization .claude/skills/
```

Restart Claude Code or reload the project after installing it. The copied installation does not receive later updates made under `skills/claude-code/` automatically, so copy it again after updating this repository.

## Install for the Current User

From this repository root:

```bash
mkdir -p "$HOME/.claude/skills"
cp -R skills/claude-code/shopify-app-modernization "$HOME/.claude/skills/"
```

User-level skills apply to every repository opened by that user. Use the project installation when a team should receive and version the skill together with a project.

Claude Code skill locations and invocation are documented in the [official Claude Code skills guide](https://code.claude.com/docs/en/skills).

## Verify the Installation

Start a new Claude Code session in the target repository and ask:

```text
What skills are available for Shopify modernization?
```

The response should include `shopify-app-modernization`. The skill should also appear as `/shopify-app-modernization` when user-invocable skills are listed.

## Use the Skill

Invoke `/shopify-app-modernization` directly or ask Claude Code to use the skill by name.

Audit without editing:

```text
/shopify-app-modernization Audit this legacy Shopify app. Inventory the server framework, authentication, routes, webhooks, extensions, API versions, and migration risks. Do not change files.
```

Create a migration plan:

```text
/shopify-app-modernization Plan an Express-to-React-Router migration. Preserve every public endpoint and Shopify authentication behavior, and identify the Shopify AI Toolkit skills and validators required for each phase.
```

Implement a migration:

```text
/shopify-app-modernization Modernize this app. Establish behavior contracts, migrate in reviewable phases, and run the applicable regression checklist.
```

Review an existing migration:

```text
/shopify-app-modernization Review this migration against the previous release and current Shopify documentation. Lead with behavior regressions and missing validation.
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

Delete the copied skill from `.claude/skills/shopify-app-modernization` or `$HOME/.claude/skills/shopify-app-modernization`. The source files under this repository's `skills/claude-code/` directory remain unchanged.
