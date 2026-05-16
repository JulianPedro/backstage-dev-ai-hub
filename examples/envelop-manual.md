# Asset Envelope Reference

Every asset in Dev AI Hub is made up of **two files** with the same base name:

```
instructions/python-style.yaml   ← metadata envelope (this document)
instructions/python-style.md     ← pure Markdown content (what the AI tool reads)
```

The `.md` file is **never modified** by the plugin — it is your raw AI asset exactly as you write it. The `.yaml` envelope tells the hub what the asset is, who it is for, and where to install it.

---

## Required Fields

### `name`
**Type:** `string` (1–200 chars)

The internal identifier for the asset. Used to generate default install paths (lowercased, spaces become hyphens, special characters removed). Must be unique within the provider repository.

```yaml
name: python-code-style
```

> `python-code-style` → default install path `.claude/rules/python-code-style.md`

---

### `type`
**Type:** `enum`

Defines the asset category and determines the default install paths per tool.

| Value | Description |
|---|---|
| `instruction` | Rules and guidelines the model follows during its work |
| `agent` | Autonomous agent with defined behavior, tools, and scope |
| `skill` | Reusable skill with a `SKILL.md` entry point and optional bundled resources |
| `workflow` | Step-by-step sequence for automating a repeatable task |
| `bundle` | A collection of assets that are meant to be installed together |

```yaml
type: instruction
```

---

### `description`
**Type:** `string` (1–500 chars)

Short summary shown in the UI and returned by the MCP server. Keep it focused on what the asset does and when to use it.

```yaml
description: >-
  Enforces Python coding standards with a focus on static typing,
  readability, and documentation for medium-to-large projects.
```

---

### `tools`
**Type:** `string[]` — minimum 1 value

The AI tools this asset is compatible with. Drives both filtering in the UI/MCP and default install path resolution.

| Value | Tool |
|---|---|
| `all` | Compatible with all tools (applies to every tool on install) |
| `claude-code` | Claude Code (Anthropic) |
| `github-copilot` | GitHub Copilot (Microsoft / VS Code) |
| `google-gemini` | Google Gemini CLI |
| `cursor` | Cursor |

```yaml
tools:
  - claude-code
  - github-copilot
```

---

## Optional Fields — Identity & Display

### `label`
**Type:** `string` (1–200 chars)

Human-readable display name shown in the UI and MCP responses. Use this when `name` is a technical slug and you want a friendlier title. Falls back to `name` when omitted.

```yaml
name: python-code-style
label: "Python — Code Style Guide"
```

---

### `author`
**Type:** `string` — default: `"Unknown"`

Team or person who owns and maintains the asset.

```yaml
author: "Platform Team"
```

---

### `version`
**Type:** `string` — default: `"1.0.0"`

Semantic version of the asset. Informational — does not affect sync logic (which tracks the repository commit).

```yaml
version: "2.1.0"
```

---

### `updatedAt`
**Type:** `string` (ISO 8601 date)

Date the asset content was last intentionally updated. Informational only.

```yaml
updatedAt: "2026-03-27"
```

---

### `icon`
**Type:** `string`

URL or path to an icon displayed in the UI card. Accepts absolute URLs or paths relative to the repository root. Supported formats: PNG, SVG, JPG.

```yaml
icon: "https://cdn.example.com/icons/python.svg"
```

---

### `tags`
**Type:** `string[]` — default: `[]`

Keywords used for search, filtering, and MCP contextual suggestions. Use terms describing language, framework, domain, or purpose.

```yaml
tags:
  - python
  - code-style
  - type-hints
```

---

## Optional Fields — Content

### `content`
**Type:** `string` (file path)

Path to the `.md` content file, relative to the directory of this `.yaml` file. When omitted, the parser automatically looks for a file with the same base name (e.g. `python-code-style.yaml` → `python-code-style.md`). For skills, `SKILL.md` in the same directory is the convention.

```yaml
content: python-code-style.md
# or point to a shared file:
content: ../shared/python-rules.md
```

---

## Optional Fields — Install Paths

The hub resolves install paths automatically by combining `type` + `tool`. Use the fields below to override when you need a specific location.

**Priority order:** `installPaths[tool]` → `installPath` → automatic convention

### Default conventions

| Type | Tool | Default path |
|---|---|---|
| `instruction` | `claude-code` | `.claude/rules/<slug>.md` |
| `instruction` | `github-copilot` | `.github/instructions/<slug>.instructions.md` |
| `instruction` | `google-gemini` | `GEMINI.md` |
| `instruction` | `cursor` | `.cursor/rules/<slug>.mdc` |
| `agent` | `claude-code` | `.claude/agents/<slug>.md` |
| `agent` | `github-copilot` | `.github/agents/<slug>.agent.md` |
| `skill` | `claude-code` | `.claude/skills/<slug>/SKILL.md` |
| `skill` | `cursor` | `.cursor/skills/<slug>/SKILL.md` |
| `workflow` | `claude-code` | `.claude/workflows/<slug>.md` |
| `workflow` | `github-copilot` | `.github/workflows/<slug>.workflow.md` |
| `workflow` | `google-gemini` | `.gemini/workflows/<slug>.md` |

---

### `installPath`
**Type:** `string`

Overrides the install path for **all tools**. Useful when the asset must always go to a fixed location regardless of the tool.

```yaml
installPath: ".ai/guidelines/python-style.md"
```

---

### `installPaths`
**Type:** `Record<string, string>`

Overrides the install path **per tool**. Only the tools listed here are overridden; others fall back to `installPath` or the automatic convention.

```yaml
installPaths:
  claude-code: ".claude/rules/python-style-guide.md"
  github-copilot: ".github/instructions/python-style.instructions.md"
```

---

## Optional Fields — MCPs

### `mcps`
**Type:** `McpRequirement[]`

List of MCPs required for the asset to function correctly. Each MCP is represented as an object with `id` (string, required) and optionally `name` (string) and `icon` (string URL).

```yaml
mcps:
  - id: "jira"
    name: "Jira MCP"
    icon: "https://img.icons8.com/color/48/jira.png"
  - id: "mcp-server-beta"  # When same MCP id has registered in mcp-catalog.yaml file, name and icon will be rescued from there.
```

---

## Optional Fields — Type-specific

### `resources` *(skills only)*
**Type:** `string[]`

Additional files bundled into the `.zip` download for a skill. Paths are relative to the directory of this `.yaml` file. Use when a skill depends on setup scripts, templates, or examples beyond the main `SKILL.md`.

```yaml
resources:
  - "scripts/setup.sh"
  - "templates/config.json"
  - "examples/usage.py"
```

> Any other type-specific configuration (e.g. agent persona, workflow steps, MCP server list) belongs **inside the `.md` file** — not in the envelope.

---

## Complete Example

```yaml
name: python-code-style
label: "Python — Code Style Guide"
type: instruction
description: >-
  Enforces Python coding standards with a focus on static typing,
  readability, and documentation for medium-to-large projects.
tools:
  - claude-code
  - github-copilot
author: "Platform Team"
version: "2.1.0"
updatedAt: "2026-03-27"
icon: "https://cdn.example.com/icons/python.svg"
tags:
  - python
  - code-style
  - type-hints
content: python-code-style.md
installPaths:
  claude-code: ".claude/rules/python-style-guide.md"
  github-copilot: ".github/instructions/python-style.instructions.md"
```

---

## Validation

The hub validates every `.yaml` against the envelope schema on each sync. Assets that fail validation are **skipped with a warning** in the backend logs — they never crash the sync or affect other assets. Check the Backstage backend logs for `[dev-ai-hub] skipping asset` messages if an asset is not appearing in the UI.
