# Dev AI Hub — Backstage Plugin

A catalog-backed browser for AI assets — **Skills**, **Agents**, **Hooks**, **MCP Configs**, **Plugins**, and **Marketplaces** — usable by **GitHub Copilot**, **Claude Code**, **Google Gemini**, **Cursor**, and other AI coding tools.

The Backstage **catalog** is the sole source of truth: entities are hand-authored `AiResource` catalog-info entries (or emitted by your own EntityProviders) pointing at content that lives in Git. The plugin never stores a second copy — the backend reads the catalog on demand, resolves each resource's body from its `source-location`, and records lightweight install/view telemetry. There's no sync service and no embedded MCP server.

![Project Screenshot](docs/screenshot.png)

---

## Installation

### 1. Copy plugin packages

Copy the four plugin directories into your Backstage monorepo's `plugins/` folder:

```
plugins/
  dev-ai-hub/
  dev-ai-hub-backend/
  dev-ai-hub-common/
  dev-ai-hub-node/
```

Then install:

```bash
yarn install
```

### 2. Register the `AiResource` catalog kind

DevAI Hub consumes `AiResource` entities but doesn't define the kind itself — that comes from Backstage's own alpha catalog module. In `packages/backend/src/index.ts`:

```typescript
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));
```

### 3. Register the backend plugin

Still in `packages/backend/src/index.ts`:

```typescript
backend.add(import('@nospt/plugin-dev-ai-hub-backend'));
```

### 4. Register the frontend plugin

DevAI Hub uses the Backstage **New Frontend System**. In `packages/app/src/App.tsx`:

```typescript
import { devAiHubPlugin } from '@nospt/plugin-dev-ai-hub';

export const app = createApp({
  features: [
    // ...existing features
    devAiHubPlugin,
  ],
});
```

The sidebar item and `/dev-ai-hub` route are registered automatically.

### 5. Configure `app-config.yaml`

```yaml
catalog:
  rules:
    # AiResource must be allow-listed alongside your other kinds.
    - allow: [Component, API, Resource, System, Domain, Location, AiResource]
  locations:
    # Hand-authored AiResource entities (ADR-0004 — DevAI Hub is a consumer,
    # never a producer). Point this at wherever your org registers them.
    - type: url
      target: https://github.com/your-org/ai-assets/blob/main/catalog-info.yaml
      rules:
        - allow: [AiResource]

devAiHub:
  telemetry:
    # Salts the per-user hash used to dedup `view` events (ADR-0007).
    # Use a real secret in production — never commit it.
    salt: ${DEV_AI_HUB_TELEMETRY_SALT}
```

All backend routes require standard Backstage authentication (ADR-0005) — there are no unauthenticated endpoints.

---

## Authoring `AiResource` entities

Each entity is a normal Backstage catalog entry with `kind: AiResource`. The body (markdown, or JSON for `mcp-config`) stays in Git — the entity only carries metadata plus a `backstage.io/source-location` pointer to it:

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: approved-github-workflows
  title: Approved GitHub Workflows Skill
  description: Ensures all GitHub Actions workflows are reviewed and approved before execution.
  tags: [security, github, ci-cd]
  annotations:
    backstage.io/source-location: url:https://github.com/your-org/ai-assets/tree/main/skills/approved-github-workflows/
    devaihub.io/compatible-frameworks: github-copilot,claude-code
    devaihub.io/version: 1.0.0
spec:
  type: skill # skill | agent | hook | mcp-config | plugin | marketplace
  lifecycle: production
  owner: group:ai-platform-team
```

`plugin` and `marketplace` resources additionally declare `spec.dependsOn` to relate to their child resources (rendered as containment on the card).

See [`docs/AIRESOURCE-SPEC.md`](docs/AIRESOURCE-SPEC.md) for the full per-type spec (required vs. recommended fields, the `devaihub.io/*` annotation namespace, and one worked example per type), and [`examples/catalog/`](examples/catalog/) for entities you can register as-is to try the plugin locally.

---

## REST API

```
GET  /api/dev-ai-hub/resources                    List AiResource entities as flat ResourceSummary items
GET  /api/dev-ai-hub/entity/:ref/raw               Resolved body (markdown or JSON, by resource shape)
GET  /api/dev-ai-hub/entity/:ref/raw/:filename     A specific file from a directory-shaped body
GET  /api/dev-ai-hub/entity/:ref/raw?download=true Download the artifact (zipped if multi-file)
POST /api/dev-ai-hub/telemetry                     Record an install/copy/download/view event
GET  /api/dev-ai-hub/telemetry/:ref                 Per-action counts for a resource
```

All routes require Backstage authentication; the frontend never talks to the catalog directly — it only ever sees the flat `ResourceSummary` contract the backend returns.

---

## Package Structure

| Package | Role | Description |
|---------|------|-------------|
| `@nospt/plugin-dev-ai-hub` | `frontend-plugin` | React UI (New Frontend System) — browse page, cards, filters, detail drawer, install dialog |
| `@nospt/plugin-dev-ai-hub-backend` | `backend-plugin` | Reads the catalog on demand, resolves resource bodies, records telemetry |
| `@nospt/plugin-dev-ai-hub-common` | `common-library` | Shared TypeScript types, the `ResourceSummary` contract, and telemetry schemas |
| `@nospt/plugin-dev-ai-hub-node` | `node-library` | Reserved for future backend-integrator extension points (currently empty) |

---

## Further reading

- [`docs/architecture.md`](docs/architecture.md) — system view and the catalog read flow
- [`docs/CONTEXT.md`](docs/CONTEXT.md) — vocabulary and glossary
- [`docs/AIRESOURCE-SPEC.md`](docs/AIRESOURCE-SPEC.md) — full `AiResource` entity spec
- [`docs/adr/`](docs/adr/) — architecture decision records

---

## License

Apache-2.0
