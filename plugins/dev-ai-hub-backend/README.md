# @nospt/plugin-dev-ai-hub-backend

The backend half of **Dev AI Hub**. It reads `AiResource` entities from the Backstage catalog on demand, resolves each resource's body from its `backstage.io/source-location`, and records lightweight install/view telemetry.

> **Requires Backstage 1.54 or later.** The `AiResource` kind comes from Backstage's own alpha catalog module, and these packages depend on `@backstage/catalog-model@^1.10.0` — first shipped in 1.54.0, along with the `plugin` and `marketplace` subtypes.

## How it works

The catalog is the sole source of truth. This plugin keeps **no second copy** of any resource — it ships no ingestion path, no EntityProvider, no Git discovery and no scheduled sync. It is a consumer, never a producer.

```text
AiResource entity  ──►  flattened to ResourceSummary  ──►  frontend
   (the catalog)              (this plugin)

  its source-location  ──►  read via UrlReader  ──►  the body
   (a URL into Git)         (your integrations)
```

Two consequences worth knowing before you install it:

- **Nothing is cached.** Edit an entity or its body in Git, and the next request reflects it as soon as the catalog has refreshed.
- **Reads resolve as the calling user.** A resource someone cannot see in the catalog is not readable through this plugin either — visibility is Backstage's to decide, not this plugin's.

## Install

```bash
yarn --cwd packages/backend add @nospt/plugin-dev-ai-hub-backend
```

In `packages/backend/src/index.ts`, register the `AiResource` kind and then this plugin:

```typescript
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));
backend.add(import('@nospt/plugin-dev-ai-hub-backend'));
```

`AiResource` must also be allow-listed in `app-config.yaml`, or the catalog will reject the entities before this plugin ever sees them:

```yaml
catalog:
  rules:
    - allow: [Component, API, Resource, System, Domain, Location, AiResource]
```

## Routes

```text
GET  /api/dev-ai-hub/resources                     List AiResource entities as flat ResourceSummary items
GET  /api/dev-ai-hub/entity/:ref/raw               Resolved body (markdown or JSON, by resource shape)
GET  /api/dev-ai-hub/entity/:ref/raw/:filename     A specific file from a directory-shaped body
GET  /api/dev-ai-hub/entity/:ref/raw?download=true Download the artifact (zipped if multi-file)
POST /api/dev-ai-hub/telemetry                     Record an install/copy/download/view event
GET  /api/dev-ai-hub/telemetry/:ref                Per-action counts for a resource
```

Every route requires standard Backstage authentication — there are no unauthenticated endpoints.

`GET /resources` returns the flat contract, never a raw catalog `Entity`:

```json
{
  "items": [
    {
      "entityRef": "airesource:default/azure-devops-cli",
      "name": "azure-devops-cli",
      "title": "Azure DevOps CLI",
      "description": "Manage Azure DevOps resources via CLI…",
      "type": "skill",
      "lifecycle": "production",
      "owner": "group:ai-platform-team",
      "sourceLocation": "url:https://github.com/your-org/ai-assets/blob/main/skills/azure-devops-cli.md",
      "frameworks": ["github-copilot", "claude-code"],
      "version": "1.0.0",
      "tags": ["azure-devops", "ci-cd"],
      "kind": "AiResource",
      "annotations": { "…": "…" }
    }
  ]
}
```

## Body resolution

A `source-location` pointing at a **file** is served as that file. One pointing at a **directory** (a trailing `/`) is served as a tree: the entry file is picked for viewing, and `?download=true` returns the whole directory zipped.

Resolution goes through Backstage's `UrlReaderService`, so GitHub, GitLab, Bitbucket and Azure all work from your existing `integrations` config with no code here. A resource with no `source-location` is browsable but not installable, by design.

## Configuration

```yaml
devAiHub:
  telemetry:
    # Optional. Salts the per-user hash used to dedup `view` events.
    # Omit it and the plugin generates one on first start and persists it in
    # its own database. Set it to keep the salt outside that database, or to
    # control rotation — a real secret, never committed, and stable once set.
    salt: ${DEV_AI_HUB_TELEMETRY_SALT}
```

## Database

The plugin owns one table for telemetry events, created by its own migrations and applied automatically on start. It runs on both SQLite and PostgreSQL and needs no manual setup.

Actor identity is stored as a **one-way hash**. Counts are deduplicated per person, but "who installed this" is deliberately unanswerable — not merely unbuilt.

## Troubleshooting

| Symptom | Usually means |
|---|---|
| `/resources` returns an empty list | No `AiResource` entities in the catalog, or the kind is missing from `catalog.rules` |
| A resource appears but its body 404s | The `source-location` points somewhere the `UrlReader` cannot reach — check `integrations` credentials and that the path still exists |
| 401 / 403 on every route | The request carries no Backstage identity; all routes are authenticated |
| Entities are rejected at catalog ingestion | `plugin-catalog-backend-module-ai-model` is not registered, so the `AiResource` kind is unknown |

## Full setup

Entity authoring, the frontend wiring and the decisions behind all of the above are covered once in the [repository README](https://github.com/nosportugal/backstage-plugin-dev-ai-hub#readme), which is the single place kept current.

## License

Apache-2.0
