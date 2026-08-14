# AiResource Catalog Entity Specification

> Version: `v1.0` (aligned with Backstage `v1.51.0+` and `@backstage/plugin-catalog-backend-module-ai-model` alpha)
>
> **Scope:** This document defines the canonical shape of `AiResource` entities that DevAI Hub consumes.
> It is the contract between **producers** (authors of `catalog-info.yaml`, EntityProviders) and
> **consumers** (the DevAI Hub frontend/backend). Where this spec and the installed alpha package
> disagree, the alpha package wins (report a bug in this doc).

---

## 1. Common shape (all six types)

Every `AiResource` entity — regardless of `spec.type` — carries this minimum shape. The plugin drops entities that deviate.

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  # Required — satisfies the Backstage name regex; lowercase kebab; no spaces.
  name: approved-github-workflows

  # Recommended — human-readable label shown on cards (falls back to name).
  title: Approved GitHub Workflows Skill

  # Recommended — one-line description shown on cards and in search.
  description: Ensures all GitHub Actions workflows are reviewed and approved before execution.

  # Optional — standard Backstage tags; rendered as filterable badges.
  tags: [security, github, review]

  annotations:
    # REQUIRED — where the body lives in Git (CONTEXT.md: body, source-location).
    # Format: url:<scheme>://...  (the url: prefix is stripped by the resolver).
    # A URL ending in a filename is a single-file body; a URL ending in `/` is a
    # directory-shaped body (e.g. a skill with resources) — viewed via its entry
    # file and downloaded as one zip.
    backstage.io/source-location: url:https://github.com/org/ai-assets/tree/main/skills/approved-github-workflows/

    # Optional but recommended — managed-by annotations help operators trace ingestion.
    backstage.io/managed-by-location: file:./catalog-info.yaml
    backstage.io/managed-by-origin-location: url:https://github.com/org/ai-assets

    # DevAI Hub custom annotations (namespace = devaihub; §4).
    devaihub.io/version: "1.2.0"

spec:
  # Required — one of: skill, agent, hook, mcp, plugin, marketplace
  type: skill

  # Required — standard Backstage lifecycle.
  lifecycle: production

  # Required — entity ref (group: or user:) responsible for this asset.
  owner: group:ai-platform-team

  # Optional — the System this resource belongs to.
  system: ai-toolkit

  # Recommended — compatibility claim, native field, honoured for any spec.type
  # (not just skill) and preferred over devaihub.io/compatible-frameworks (§2.2)
  # since it lives on the entity itself rather than a namespace we may retire.
  agents: [github-copilot, cursor, claude-code]

  # Type-specific fields live below spec (§3).
```

### 1.1 Required vs. recommended

| Field | Level | DevAI Hub behaviour if missing |
|---|---|---|
| `metadata.name` | **Required** | Catalog rejects entity outright. |
| `spec.type` | **Required** | Entity is dropped by the frontend (`getResourceType` returns null → silently filtered out). |
| `spec.lifecycle` | **Required** | If omitted, Backstage may reject depending on catalog rules. |
| `spec.owner` | **Required** | Card renders "Unknown owner"; search/filter still works. |
| `backstage.io/source-location` | **Required** | "View body" / Install actions show a 404. The resource is browsable, not actionable. |
| `metadata.title` | Recommended | `metadata.name` is displayed instead. |
| `metadata.description` | Recommended | Card shows no description; search excludes it. |
| `metadata.tags` | Recommended | No tags rendered; works fine. |
| `spec.agents` (preferred) or `devaihub.io/compatible-frameworks` | Recommended | No framework badges shown; filters exclude it. `spec.agents`, when present and non-empty, takes priority over the annotation. |

---

## 2. Controlled vocabularies

### 2.1 `spec.type` (entity type)

| Token | What it means |
|---|---|
| `skill` | Reusable contextual knowledge (structured upstream). |
| `agent` | An AI agent / subagent definition. |
| `hook` | Event handler (e.g. `PostToolUse`). |
| `mcp-config` | An MCP server configuration. |
| `plugin` | A composite container (Claude Code plugin) that bundles other resources. |
| `marketplace` | A distribution point for plugins (e.g. a Claude Code plugin marketplace repo). Bundles `plugin` resources only (ADR-0010). |

Unsupported types are silently dropped by the consumer.

### 2.2 `devaihub.io/compatible-frameworks` (annotation)

Fallback path only — prefer the native `spec.agents` array (§1, §3.1) instead, since it lives
on the entity itself rather than an annotation namespace that may be retired. This annotation
is read only when `spec.agents` is empty or absent.

Comma-separated list. Tokens are normalised by `normalizeFramework()` in `@nospt/plugin-dev-ai-hub-common`:

| Token | Normalises to | Rendered as |
|---|---|---|
| `github-copilot` / `copilot` | `github-copilot` | GitHub Copilot |
| `claude-code` / `claude` | `claude-code` | Claude Code |
| `cursor` | `cursor` | Cursor |
| `google-gemini` / `gemini` | `google-gemini` | Google Gemini |
| `all` | `all` | All tools (universal) |

Unknown tokens are passed through literally but mapped to a generic code-icon badge.

### 2.3 `spec.lifecycle`

Standard Backstage lifecycle: `experimental`, `production`, `deprecated`. Rendered as a small chip on cards.

---

## 3. Per-type specifications

### 3.1 `skill` — structured upstream (native `AiResource` subtype)

The `skill` type is the only one with a formal upstream structure. Its spec includes Backstage-native fields for AI tooling.

```yaml
spec:
  type: skill
  lifecycle: production
  owner: group:ai-platform-team
  # Native skill subtype fields (alpha — ⚠︎ VERIFY against installed package):
  agents: [github-copilot, claude-code]           # ← compatibility frameworks (native)
  disciplines: [backend, devops]                  # skill domains
  categories: [security, review]                  # topical buckets
  usecases: ["CI/CD hardening"]                   # concrete use-case strings
  allowedTools: ["read_file", "run_shell"]        # tool permissions
```

**Compatibility framework:** read from `spec.agents` (native) when non-empty — honoured for any `spec.type`, not just `skill` (§3.2–3.5 can carry it too, though it isn't part of their upstream shape). If `spec.agents` is empty or absent, falls back to the `devaihub.io/compatible-frameworks` annotation.

### 3.2 `agent` — default shape + annotations

```yaml
spec:
  type: agent
  lifecycle: experimental
  owner: group:security-team
  agents: [claude-code]

metadata:
  annotations:
    devaihub.io/role: "security-threat-modeller"
```

**No formal native spec fields.** The `devaihub.io/role` annotation is a display hint (optional, rendered as a subtitle on the card). The compatibility framework should come from `spec.agents` (preferred — see §3.1) or, failing that, `devaihub.io/compatible-frameworks`.

### 3.3 `hook` — default shape + annotations

```yaml
spec:
  type: hook
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code]

metadata:
  annotations:
    devaihub.io/hook-event: "PostToolUse"
    devaihub.io/hook-matcher: ".*"
```

**No native spec fields.** `devaihub.io/hook-event` is **recommended** — it tells the consumer which event triggers this hook (used for MCP server tool descriptions and card metadata). `devaihub.io/hook-matcher` is optional.

### 3.4 `mcp-config` — default shape + annotations

```yaml
spec:
  type: mcp-config
  lifecycle: production
  owner: group:observability
  agents: [claude-code, cursor]
```

**No native spec fields.** The body of an `mcp-config` resource **is** the JSON snippet the
user merges into `.mcp.json` (or equivalent), and it is **canonical for install** —
transport and endpoint live only there (CONTEXT.md: body). The former
`devaihub.io/mcp-type` / `devaihub.io/mcp-uri` annotations are retired: duplicating
config in annotations invited drift with the body (issue #30 decision record).

> **Design fork (§8.4 of the main spec):** an MCP server could alternatively be modelled as an `API` entity (`spec.type: mcp-server`). This spec follows the direct `AiResource:mcp-config` directive. If you need runtime endpoint semantics, emit an additional `API:mcp-server` and relate them.

### 3.5 `plugin` — composite container (ADR-0013)

A plugin does not list its children.
**Each child names the plugin**, in a `devaihub.io/parent` annotation on the child entity — upstream emits `dependsOn` relations for `spec.type: skill` only, so a container cannot express containment natively (ADR-0013).

```yaml
# The plugin itself declares no children.
spec:
  type: plugin
  lifecycle: production
  owner: group:ai-platform-team
  agents: [github-copilot, claude-code]

metadata:
  annotations:
    devaihub.io/parent: nos-plugin-marketplace   # its marketplace(s), if any
    devaihub.io/version: "2.0.0"
    devaihub.io/plugin-manifest: "true"
```

```yaml
# Each child claims membership, e.g. examples/catalog/skill-approved-github-workflows.yaml
metadata:
  name: approved-github-workflows
  annotations:
    devaihub.io/parent: secure-dev-bundle
spec:
  type: skill
```

**Rendering behaviour:** the backend inverts every `devaihub.io/parent` declaration over its catalog read and serves `parents`, `children`, and `childCount` on `ResourceSummary`.
The `PluginCard` lists its children, linking to each child's detail panel; the child card shows "part of: secure-dev-bundle" straight from its own `parents`.
Children of the wrong type (a plugin claiming a skill as parent) and parents the caller cannot see are silently not rendered.

### 3.6 `marketplace` — plugin distribution point (ADR-0010)

```yaml
# The marketplace declares no plugins; each plugin claims membership
# with devaihub.io/parent: <this marketplace's metadata.name> (ADR-0013).
spec:
  type: marketplace
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code, github-copilot]

metadata:
  annotations:
    devaihub.io/version: "1.0.0"
```

**No native spec fields.** A marketplace mirrors an AI-tool plugin marketplace (e.g. a Git repo
carrying `.claude-plugin/marketplace.json`): the user installs the marketplace into their tool
(`/plugin marketplace add org/repo`) and can then install its plugins.

- **Children are `plugin` resources only** — mirroring the real `marketplace.json`, which lists
  plugins. This is a rendering convention, not hard validation: non-plugin children are silently
  not rendered as children. Wrap a loose skill in a plugin if you want it in a marketplace.
- **The body is a markdown doc** carrying the marketplace-add command, the repo link, and usage
  notes — never the `marketplace.json` manifest itself (users register the repo; they don't copy
  the manifest). `source-location` points at that markdown file.
- **The body doc MUST live inside the marketplace repo itself**, and **`metadata.name` MUST
  equal the `name` field in `marketplace.json`**. The consumer derives the repo slug from
  `source-location` to generate copyable add commands (Claude Code + Copilot CLI — both read
  the same `.claude-plugin/marketplace.json` format), the
  `/plugin install <plugin>@<marketplace-name>` template, and a team
  `extraKnownMarketplaces` snippet. Violate either rule and the dialog degrades to the
  rendered body alone (ADR-0010).
- **Install is command-based** like `plugin`: no filesystem install path. There is no
  `devaihub.io/marketplace-url` annotation — the repo reference lives only in the body and
  `source-location` (issue #30 precedent: annotations duplicating install config invite drift).
- Child plugins appear in DevAI Hub only if the producer also authors their entities and links
  them via `dependsOn` (the plugin remains a pure consumer, ADR-0004).

---

## 4. DevAI Hub annotation namespace

All custom annotations use the `devaihub.io/` prefix. These are namespaced to avoid collisions with other plugins and upstream fields.

| Annotation | Applies to | Meaning |
|---|---|---|
| `devaihub.io/compatible-frameworks` | all types | Comma-separated framework tokens (§2.2). |
| `devaihub.io/parent` | all types | Comma-separated container(s) this resource belongs to — bare `metadata.name` (own namespace) or full `airesource:ns/name`. Containment is declared child-side (ADR-0013). |
| `devaihub.io/version` | all types | Semantic version string; displayed on cards. |
| `devaihub.io/role` | agent | Display subtitle (e.g. "security reviewer"). |
| `devaihub.io/hook-event` | hook | Event name that triggers this hook. |
| `devaihub.io/hook-matcher` | hook | Regex or glob for scope matching. |
| `devaihub.io/plugin-manifest` | plugin | Boolean-ish flag; indicates a Claude Code `.claude-plugin/plugin.json` source. |

> Retired: `devaihub.io/mcp-type` and `devaihub.io/mcp-uri` — mcp config lives only
> in the body, which is canonical for install (issue #30 decision record).

**Future:** if upstream structures a subtype for any of these, the annotation migrates into native spec and is deprecated (exit condition per ADR).

---

## 5. Example entities (one per type)

These are the **same** examples shipped in `examples/catalog/`.

### skill

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: approved-github-workflows
  title: Approved GitHub Workflows
  description: Ensures GitHub Actions workflows are reviewed before execution
  tags: [security, github, review]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/tree/main-nos/examples/skills/approved-github-workflows/
    devaihub.io/version: "1.0.0"
spec:
  type: skill
  lifecycle: production
  owner: group:ai-platform-team
  agents: [github-copilot, cursor, claude-code]
  disciplines: [security, devops]
  categories: [review, compliance]
  usecases: ["CI/CD hardening"]
```

### agent

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: security-threat-modeller
  title: Security Threat Modeller
  description: Subagent specialised in security threat modelling
  tags: [security, architecture]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/agents/security-threat-modeller.md
    devaihub.io/role: "security architect"
spec:
  type: agent
  lifecycle: experimental
  owner: group:security-team
  agents: [claude-code]
```

### hook

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: post-edit-lint
  title: Post-Edit Lint
  description: Runs lint --fix after every Write/Edit tool use
  tags: [lint, quality]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/hooks/post-edit-lint.md
    devaihub.io/hook-event: "PostToolUse"
spec:
  type: hook
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code]
```

### mcp-config

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: grafana-mcp
  title: Grafana MCP Config
  description: MCP server configuration providing Grafana dashboard and alerting tools
  tags: [observability, grafana]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/mcp/grafana-mcp.json
spec:
  type: mcp-config
  lifecycle: production
  owner: group:observability
  agents: [claude-code, cursor]
```

### plugin

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: security-toolkit
  title: Security Toolkit
  description: Bundled security skills, agents, hooks and MCP servers
  tags: [security, bundle]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/plugins/secure-dev-bundle.md
    devaihub.io/version: "2.1.0"
    devaihub.io/plugin-manifest: "true"
spec:
  type: plugin
  lifecycle: production
  owner: group:security-team
  agents: [github-copilot, claude-code]
  dependsOn:
    - airesource:default/approved-github-workflows
    - airesource:default/security-threat-modeller
    - airesource:default/post-edit-lint
    - airesource:default/grafana-mcp
```

### marketplace

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: nos-plugin-marketplace
  title: NOS Plugin Marketplace
  description: Curated marketplace of approved NOS plugins for AI coding tools
  tags: [marketplace, curated]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/examples/marketplaces/nos-plugin-marketplace.md
    devaihub.io/version: "1.0.0"
spec:
  type: marketplace
  lifecycle: production
  owner: group:ai-platform-team
  agents: [claude-code, github-copilot]
  dependsOn:
    - airesource:default/security-toolkit
```

---

## 6. Producer checklist

Before submitting a new `AiResource` catalog-info.yaml, verify:

- [ ] `kind: AiResource` is used (not `Component`, not a custom kind).
- [ ] `spec.type` is one of the six supported tokens.
- [ ] `backstage.io/source-location` points at the body: a raw file URL for a single-file body, or a `/`-terminated directory URL for a resource-bearing body (viewed via its entry file, downloaded as one zip).
- [ ] `spec.agents` (any type) or `devaihub.io/compatible-frameworks` lists at least one framework token (or `all`) — `spec.agents`, when present, is preferred over the annotation.
- [ ] For `plugin` types, `spec.dependsOn` references child `AiResource` entity refs correctly.
- [ ] For `marketplace` types, `spec.dependsOn` references `plugin`-type children only, and the body is a markdown doc with the marketplace-add command (not the `marketplace.json`).
- [ ] For `marketplace` types, the body doc lives **inside the marketplace repo** and `metadata.name` equals the `name` in `marketplace.json` (the consumer derives add commands from `source-location`).
- [ ] `metadata.name` is kebab-case and unique within the namespace.

---

## 7. Exit conditions (upstream convergence)

| If upstream ships… | Then DevAI Hub should… |
|---|---|
| Structured subtype for `agent` / `hook` / `mcp-config` / `plugin` / `marketplace` | Migrate annotation fields into native spec fields; drop annotations. |
| Content-in-catalog reference (backstage/backstage#34318) | Drop the bespoke body resolver; serve body from catalog directly. |
| AiResource graduates from alpha | Remove `/alpha` imports; drop type-guard adapters. |
