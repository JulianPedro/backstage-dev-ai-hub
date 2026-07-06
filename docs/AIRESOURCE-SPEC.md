# AiResource Catalog Entity Specification

> Version: `v1.0` (aligned with Backstage `v1.51.0+` and `@backstage/plugin-catalog-backend-module-ai-model` alpha)
>
> **Scope:** This document defines the canonical shape of `AiResource` entities that DevAI Hub consumes.
> It is the contract between **producers** (authors of `catalog-info.yaml`, EntityProviders) and
> **consumers** (the DevAI Hub frontend/backend). Where this spec and the installed alpha package
> disagree, the alpha package wins (report a bug in this doc).

---

## 1. Common shape (all five types)

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
    # REQUIRED — where the body (markdown) lives in Git.
    # Format: url:<scheme>://...  (the url: prefix is stripped by the resolver).
    backstage.io/source-location: url:https://github.com/org/ai-assets/blob/main/skills/approved-github-workflows/SKILL.md

    # Optional but recommended — managed-by annotations help operators trace ingestion.
    backstage.io/managed-by-location: file:./catalog-info.yaml
    backstage.io/managed-by-origin-location: url:https://github.com/org/ai-assets

    # DevAI Hub custom annotations (namespace = devaihub; §4).
    devaihub/compatible-frameworks: "github-copilot,cursor,claude"
    devaihub/version: "1.2.0"

spec:
  # Required — one of: skill, agent, hook, mcp, plugin
  type: skill

  # Required — standard Backstage lifecycle.
  lifecycle: production

  # Required — entity ref (group: or user:) responsible for this asset.
  owner: group:ai-platform-team

  # Optional — the System this resource belongs to.
  system: ai-toolkit

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
| `devaihub/compatible-frameworks` | Recommended | No framework badges shown; filters exclude it. |

---

## 2. Controlled vocabularies

### 2.1 `spec.type` (entity type)

| Token | What it means |
|---|---|
| `skill` | Reusable contextual knowledge (structured upstream). |
| `agent` | An AI agent / subagent definition. |
| `hook` | Event handler (e.g. `PostToolUse`). |
| `mcp` | An MCP server configuration. |
| `plugin` | A composite container (Claude Code plugin) that bundles other resources. |

Unsupported types are silently dropped by the consumer.

### 2.2 `devaihub/compatible-frameworks` (annotation)

Comma-separated list. Tokens are normalised by `normalizeFramework()` in `@julianpedro/plugin-dev-ai-hub-common`:

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

**Compatibility framework for skills:** read from `spec.agents` (native). If `spec.agents` is empty, fall back to the `devaihub/compatible-frameworks` annotation.

### 3.2 `agent` — default shape + annotations

```yaml
spec:
  type: agent
  lifecycle: experimental
  owner: group:security-team

metadata:
  annotations:
    devaihub/compatible-frameworks: "claude-code"
    devaihub/role: "security-threat-modeller"
```

**No native spec fields.** The `devaihub/role` annotation is a display hint (optional, rendered as a subtitle on the card). The compatibility framework **must** come from `devaihub/compatible-frameworks`.

### 3.3 `hook` — default shape + annotations

```yaml
spec:
  type: hook
  lifecycle: production
  owner: group:ai-platform-team

metadata:
  annotations:
    devaihub/compatible-frameworks: "claude-code"
    devaihub/hook-event: "PostToolUse"
    devaihub/hook-matcher: ".*"
```

**No native spec fields.** `devaihub/hook-event` is **recommended** — it tells the consumer which event triggers this hook (used for MCP server tool descriptions and card metadata). `devaihub/hook-matcher` is optional.

### 3.4 `mcp` — default shape + annotations

```yaml
spec:
  type: mcp
  lifecycle: production
  owner: group:observability

metadata:
  annotations:
    devaihub/compatible-frameworks: "claude-code,cursor"
    devaihub/mcp-type: "http"          # http | stdio | sse
    devaihub/mcp-uri: "http://mcp.example.com/sse"
```

**No native spec fields.** `devaihub/mcp-type` is **recommended** — drives whether the MCP card shows "HTTP", "STDIO", or "SSE". `devaihub/mcp-uri` is optional (used when the MCP server is externally addressable). The body of an `mcp` resource is typically `.mcp.json` or equivalent config.

> **Design fork (§8.4 of the main spec):** an MCP server could alternatively be modelled as an `API` entity (`spec.type: mcp-server`). This spec follows the direct `AiResource:mcp` directive. If you need runtime endpoint semantics, emit an additional `API:mcp-server` and relate them.

### 3.5 `plugin` — composite container with relations

```yaml
spec:
  type: plugin
  lifecycle: production
  owner: group:ai-platform-team
  # Relations: the plugin *contains* these child resources.
  dependsOn:
    - airesource:default/approved-github-workflows
    - airesource:default/security-threat-modeller
    - airesource:default/post-edit-lint
    - airesource:default/grafana-mcp

metadata:
  annotations:
    devaihub/compatible-frameworks: "github-copilot,claude-code"
    devaihub/version: "2.0.0"
    devaihub/plugin-manifest: "true"
```

**Rendering behaviour:** the `PluginCard` lists all `dependsOn` children, linking to each child's detail panel. The **inverse** relation (`dependencyOf`) lets a child card show "part of: security-toolkit".

---

## 4. DevAI Hub annotation namespace

All custom annotations use the `devaihub/` prefix. These are namespaced to avoid collisions with other plugins and upstream fields.

| Annotation | Applies to | Meaning |
|---|---|---|
| `devaihub/compatible-frameworks` | all types | Comma-separated framework tokens (§2.2). |
| `devaihub/version` | all types | Semantic version string; displayed on cards. |
| `devaihub/role` | agent | Display subtitle (e.g. "security reviewer"). |
| `devaihub/hook-event` | hook | Event name that triggers this hook. |
| `devaihub/hook-matcher` | hook | Regex or glob for scope matching. |
| `devaihub/mcp-type` | mcp | Transport type: `http`/`stdio`/`sse`. |
| `devaihub/mcp-uri` | mcp | External endpoint URL (optional). |
| `devaihub/plugin-manifest` | plugin | Boolean-ish flag; indicates a Claude Code `.claude-plugin/plugin.json` source. |

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
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-dev-ai-hub/blob/main/examples/skills/approved-github-workflows/SKILL.md
    devaihub/compatible-frameworks: "github-copilot,cursor,claude"
    devaihub/version: "1.0.0"
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
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-dev-ai-hub/blob/main/examples/agents/security-threat-modeller.md
    devaihub/compatible-frameworks: "claude-code"
    devaihub/role: "security architect"
spec:
  type: agent
  lifecycle: experimental
  owner: group:security-team
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
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-dev-ai-hub/blob/main/examples/hooks/post-edit-lint.json
    devaihub/compatible-frameworks: "claude-code"
    devaihub/hook-event: "PostToolUse"
spec:
  type: hook
  lifecycle: production
  owner: group:ai-platform-team
```

### mcp

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: grafana-mcp
  title: Grafana MCP Server
  description: MCP server providing Grafana dashboard and alerting tools
  tags: [observability, grafana]
  annotations:
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-dev-ai-hub/blob/main/examples/mcp/grafana-mcp/.mcp.json
    devaihub/compatible-frameworks: "claude-code,cursor"
    devaihub/mcp-type: "http"
    devaihub/mcp-uri: "http://grafana-mcp.example.com/sse"
spec:
  type: mcp
  lifecycle: production
  owner: group:observability
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
    backstage.io/source-location: url:https://github.com/nosportugal/backstage-dev-ai-hub/blob/main/examples/plugin/security-toolkit/.claude-plugin/plugin.json
    devaihub/compatible-frameworks: "github-copilot,claude-code"
    devaihub/version: "2.1.0"
    devaihub/plugin-manifest: "true"
spec:
  type: plugin
  lifecycle: production
  owner: group:security-team
  dependsOn:
    - airesource:default/approved-github-workflows
    - airesource:default/security-threat-modeller
    - airesource:default/post-edit-lint
    - airesource:default/grafana-mcp
```

---

## 6. Producer checklist

Before submitting a new `AiResource` catalog-info.yaml, verify:

- [ ] `kind: AiResource` is used (not `Component`, not a custom kind).
- [ ] `spec.type` is one of the five supported tokens.
- [ ] `backstage.io/source-location` points at the **raw** markdown/config file in Git (not a directory).
- [ ] `devaihub/compatible-frameworks` lists at least one framework token (or `all`).
- [ ] For `plugin` types, `spec.dependsOn` references child `AiResource` entity refs correctly.
- [ ] For `skill` types, `spec.agents` is preferred over the annotation for frameworks.
- [ ] `metadata.name` is kebab-case and unique within the namespace.

---

## 7. Exit conditions (upstream convergence)

| If upstream ships… | Then DevAI Hub should… |
|---|---|
| Structured subtype for `agent` / `hook` / `mcp` / `plugin` | Migrate annotation fields into native spec fields; drop annotations. |
| Content-in-catalog reference (backstage/backstage#34318) | Drop the bespoke body resolver; serve body from catalog directly. |
| AiResource graduates from alpha | Remove `/alpha` imports; drop type-guard adapters. |

