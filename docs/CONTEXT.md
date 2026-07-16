# DevAI Hub — Domain Context

> Pure glossary of ubiquitous language, plus a short narrative of how the concepts
> relate. No implementation details, no roadmap.
>
> Source of truth for domain vocabulary used across ADRs, architecture docs, and
> agent instructions. When a term here conflicts with code, the ADRs win; when the
> ADRs conflict with each other, the later one wins.
>
> **Note for agents:** `docs/agents/domain.md` expects this file at the repo root.
> It lives under `docs/` per issue #27. If the convention changes, move it to the
> root and update this note.

---

## Glossary

### AiResource
The Backstage catalog entity kind that represents a single AI asset. Registered by
`@backstage/plugin-catalog-backend-module-ai-model` (v1.51+, alpha). Has exactly
five subtypes distinguished by `spec.type`. The catalog is the **only** place
`AiResource` entities live — DevAI Hub never stores a second copy (ADR-0001).

### ResourceType
The `spec.type` of an `AiResource`. Exactly six canonical values:

| Token    | Meaning                                                       |
|----------|---------------------------------------------------------------|
| `skill`  | Reusable contextual knowledge; the only type with a native upstream spec (`spec.agents`, `disciplines`, `categories`). |
| `agent`  | An AI agent or subagent definition.                           |
| `hook`   | An event handler (e.g. `PostToolUse`).                        |
| `mcp`    | An MCP server configuration.                                  |
| `plugin` | A composite container (e.g. Claude Code plugin) that bundles other resources via `dependsOn` relations. |
| `marketplace` | A distribution point for plugins (e.g. a Claude Code plugin marketplace repo). A container one level above `plugin`: it bundles `plugin` resources via `dependsOn` relations — plugins only. "Install" means registering the marketplace with the AI tool (e.g. `/plugin marketplace add`), after which its plugins can be installed from it. |

Entities with an unsupported `spec.type` are silently dropped by the consumer.

### ResourceSummary
The flat JSON contract the backend returns to the frontend. Contains only the
fields the UI actually needs (`entityRef`, `name`, `title`, `description`, `tags`,
`type`, `lifecycle`, `owner`, `sourceLocation`, `frameworks`, `version`, `kind`,
`childCount`, `helpText`, `annotations`). The frontend never sees a raw
Backstage `Entity` — it only knows `ResourceSummary` (architecture.md).

### body
The consumable content of an `AiResource` — shaped by its `ResourceType`, not
uniformly markdown: skill instructions, agent definition, and hook logic are
markdown; an `mcp` body is the JSON snippet added to `.mcp.json`; a `plugin`
body carries the install link; a `marketplace` body is a markdown doc carrying
the marketplace-add command and repo link (never the `marketplace.json`
manifest itself — users register the repo, they don't copy the manifest).
Bodies are either **artifact-shaped** (skill, agent, hook, mcp — the body is
the installable content, so it can be downloaded) or **pointer-shaped**
(plugin, marketplace — the body points at a framework-native install, so
there is nothing to download). The body is **canonical for install** — copy,
download, and install always deliver the body verbatim, never content
reconstructed from annotations. Bodies **stay in Git**; they are never stored in
the plugin's database. Resolved on demand by the backend's body resolver via
`backstage.io/source-location` (ADR-0001, ADR-0002).

### source-location
The `backstage.io/source-location` annotation on an `AiResource`. A pointer in
the form `url:<scheme>://…` that tells the body resolver where the **body itself**
lives in Git — deliberately overloaded from the vanilla Backstage meaning
("where the entity YAML was authored"). DevAI Hub has no separate body-location
annotation. A URL ending in a filename points at a single-file body; a URL ending
in `/` points at a directory (a resource-bearing body with multiple files).
Required for "View body" / Install actions; without it the resource is browsable
but not actionable.

### entry file
The single markdown file that *represents* a directory-shaped (resource-bearing)
body when a human views or copies it. Resolved server-side by the body resolver:
the only `.md` in the tree, else `SKILL.md`, else the `.md` named after the
directory. Viewing shows the entry file; downloading/installing delivers the whole
body (all files) as one archive.

### producer
Any system or person that creates `AiResource` `catalog-info.yaml` files and
registers them in the Backstage catalog. DevAI Hub is **not** a producer — it is
a pure consumer (ADR-0004). Ingestion is hand-authored YAML only (no plugin-owned
Git discovery).

### consumer
DevAI Hub's role. It reads `AiResource` entities from the catalog, transforms
them into `ResourceSummary` objects, and serves them to the frontend. It never
creates, edits, or ingests entities.

### framework
An AI tool that a resource is compatible with. Tracked by the
`devaihub.io/compatible-frameworks` annotation (comma-separated). For `skill`
entities, read from the native `spec.agents` field when non-empty, falling back
to the annotation otherwise. Resolved to a canonical token by
`getFrameworks(entity)` in `-common`. Known tokens: 
`github-copilot`, `claude-code`, `cursor`, `google-gemini`, `all`.

### telemetry
Plugin-owned event storage tracking how resources are used. Two event classes:
- **view** — recorded on card/detail render; deduplicated per (salted-hash-of-user, day) to avoid render-loop inflation (ADR-0007).
- **deliberate action** — `install`, `copy`, `download`; stored raw (each occurrence counts).

Telemetry is store-all, dedup at read. The caller is recorded as a one-way salted
hash, never as a plain user identity.

### enrichment
Additive, read-time decoration of a `ResourceSummary` with GitHub-sourced data
(e.g. last-updated, stars). Enrichment is **not** the body resolver: the body
resolver streams the full markdown body on a user action; enrichment augments card
metadata at browse/detail time. Enrichment is cached with a TTL, never persisted
as a system of record, and always optional — a card must render fully from the
catalog `ResourceSummary` alone (ADR-0001). Deferred to Phase 5 / issue #9.

---

## How the concepts gel together

An **AiResource** is the atomic unit. A **producer** (a human or an automation
outside the plugin) hand-authors a `catalog-info.yaml` with a `ResourceType` and
a `source-location`, and registers it in the Backstage catalog. The catalog is the
sole source of truth.

The **consumer** — DevAI Hub's backend — reads those entities, transforms each
one into a flat **ResourceSummary**, and serves the list to the frontend. The
frontend knows only `ResourceSummary`; it imports no catalog packages.

When a user clicks "View body" or "Install", the backend's body resolver fetches
the **body** from Git (using `source-location`), re-checking catalog visibility
for the calling user on every request (ADR-0006). The body never touches the
plugin's database.

**Telemetry** events are written on every Install/Copy/Download and on every
View (deduplicated). They live in the plugin's own database and are never shared
back to the catalog.

**Enrichment** is a future additive layer that decorates the browse list with
GitHub-sourced metadata, served by the backend as an optional per-resource
endpoint. Cards render fully without it.

The six **ResourceTypes** drive the UI: each type has its own card colour, icon,
and `getFrameworks()` read path. Two types have children (via `dependsOn`
relations): a `plugin` bundles skills/agents/hooks/mcp, and a `marketplace`
bundles plugins only. `childCount` is surfaced in `ResourceSummary` for both.
