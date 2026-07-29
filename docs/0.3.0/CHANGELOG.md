# 0.3.0

Dev AI Hub is now a **catalog consumer**.
`AiResource` entities live in the Backstage catalog and nothing else, the backend resolves each resource's body from Git on demand, and the plugin's own database holds telemetry only.

This replaces the 0.2.x model, in which the backend synced assets out of Git into its own store and served them from there.
Almost every 0.2.x integration point is gone.
Read the whole of "Breaking changes" before upgrading.

## Upgrading

### Before you start

**If you are running 0.2.x, upgrade to 0.3.0 directly — do not attempt to run any 0.2.x release published between this one and 0.2.4.**
Migrations `001`–`006` were deleted from the repository during development while still present in published 0.2.x.
knex validates that every applied migration is still on disk and refuses to start when one is missing, so an intermediate build would fail at boot with `The migration directory is corrupt`.
0.3.0 restores those six files as no-op tombstones, so both a fresh database and one upgraded from 0.2.x start cleanly.

The 0.3.0 upgrade drops the legacy `ai_assets` and `ai_asset_sync_status` tables.
Everything they held is now read from the catalog.
**This is irreversible** — take a backup first if you want the option to roll back, because the `down()` migration deliberately does not recreate them.

### 1. Requires Backstage 1.51 or later

The `AiResource` kind comes from Backstage's own alpha catalog module and is not available before 1.51.

### 2. Register the `AiResource` kind

The plugin consumes the kind but no longer defines it.
In `packages/backend/src/index.ts`:

```typescript
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));
backend.add(import('@nospt/plugin-dev-ai-hub-backend'));
```

### 3. Allow the kind in the catalog

`AiResource` must be allow-listed or entities are rejected before the plugin ever sees them:

```yaml
catalog:
  rules:
    - allow: [Component, API, Resource, System, Domain, Location, AiResource]
```

### 4. Replace your provider configuration with catalog locations

The `devAiHub.providers` block no longer exists and is ignored if left in place.
Register your `AiResource` entities as ordinary catalog locations instead:

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/your-org/ai-assets/blob/main/catalog-info.yaml
      rules:
        - allow: [AiResource]
```

Your existing asset YAML does not carry over.
`AiResource` entities are hand-authored Backstage entities — see [`docs/AIRESOURCE-SPEC.md`](../AIRESOURCE-SPEC.md) for the per-type spec and [`examples/catalog/`](../../examples/catalog/) for entities you can register as-is.

### 5. Check freshness expectations

The plugin schedules nothing of its own and reads the catalog live on every request.
How quickly an edit shows up is governed entirely by `catalog.processingInterval`, which defaults to a random 100–150s per entity.

## Breaking changes

### Ingestion is gone

There is no sync service, no `EntityProvider`, no Git discovery, and no scheduled job.
The plugin reads entities; it never produces them (ADR-0004).
Producers are separate and are yours to run.

### The asset store is gone

`AiAssetStore`, `AiAssetSyncService`, and `AssetParser` were deleted along with the tables behind them.
Bodies are never stored — the backend resolves them from each entity's `backstage.io/source-location` through `UrlReader` at request time (ADR-0001, ADR-0002).

### REST routes replaced

Every 0.2.x route is gone. There is no compatibility shim.

| 0.2.x | 0.3.0 |
|---|---|
| `GET /assets` | `GET /resources` |
| `GET /assets/:id` | `GET /resources` (flat list; there is no per-item metadata route) |
| `GET /assets/:id/raw` | `GET /entity/:ref/raw` |
| `GET /assets/:id/download` | `GET /entity/:ref/raw?download=true` |
| `POST /assets/:id/track-install` | `POST /telemetry` |
| `GET /providers`, `GET /providers/:id/status`, `POST /providers/:id/sync` | removed — there are no providers |
| `GET /stats` | `GET /telemetry/:ref` |
| `POST/GET/DELETE /mcp` | removed — see below |

Resources are addressed by **entity ref**, not by an opaque asset id.
All routes require standard Backstage authentication; there are no unauthenticated endpoints (ADR-0005).
Body reads re-fetch the entity as the calling user, so catalog visibility is the authorization gate (ADR-0006).

### The embedded MCP server is gone

The backend no longer hosts an MCP server, and the `/mcp` routes were removed.
Any session TTL or concurrency configuration you had is ignored.

Note that `mcp-config` is a *resource type* — an entity describing an MCP server someone else runs.
That is unrelated, and it still works.

### `@nospt/plugin-dev-ai-hub-common` exports replaced

`./types`, `./schemas`, and `./installPaths` were removed; `./resources` and `./telemetry` replace them.
The central contract is now `ResourceSummary`, the flat shape the backend returns and the only catalog-derived type the frontend knows.
The `installPaths` helpers went with the 0.2.x install model.

### `@nospt/plugin-dev-ai-hub-node` exports nothing

`devAiHubProviderExtensionPoint`, `AiAssetProvider`, and `DevAiHubProviderExtensionPoint` were removed with the ingestion path.
The package remains published, reserved for future extension points.
If you implemented a provider against it, that code has no replacement — register catalog entities instead.

### Frontend is New Frontend System only

The legacy shim was removed. Registration is unchanged from 0.2.0:

```typescript
import { devAiHubPlugin } from '@nospt/plugin-dev-ai-hub';

export const app = createApp({ features: [devAiHubPlugin] });
```

The UI is built on Backstage UI design tokens.
If your app predates `create-app` loading them, import `@backstage/ui/css/styles.css` in `packages/app/src/index.tsx` or the components render unstyled.

### Resource type vocabulary replaced

0.2.x's instruction/workflow/bundle vocabulary is gone.
The six types are `skill`, `agent`, `hook`, `mcp-config`, `plugin`, and `marketplace` (ADR-0003, ADR-0010).
`mcp` was renamed to `mcp-app` and then to `mcp-config` during development; only `mcp-config` is valid.
Unsupported `spec.type` values are dropped silently by the consumer.

## Added

- **Six resource types**, including `plugin` and `marketplace` composites that declare children via `spec.dependsOn`.
- **Body resolution on demand** — view, copy, download, and install stream a resource's real body from Git. Directory-shaped bodies resolve an entry file for viewing and are served as a zip for download (ADR-0009, an interim delivery mechanism).
- **Usage telemetry** — `install`, `copy`, `download`, and `view` are recorded and surfaced as per-resource counts. Caller identity is a salted one-way hash, never a plaintext user ref (ADR-0007).
- **Optional telemetry salt.** `devAiHub.telemetry.salt` is an override, not a requirement. Left unset, the backend generates a salt once and persists it in its own database. Set it to keep the salt outside that database or to control rotation; it must then stay stable across restarts.
- **Plugin-owned type colours** as design tokens (ADR-0008).
- **Playwright end-to-end coverage** across browse, filtering, detail, and install.

## Fixed

- **Startup no longer fails on a corrupt migration directory.** Migrations `001`–`006` are back as no-op tombstones, so a database upgraded from 0.2.x — which has those names recorded in `knex_migrations` — passes knex's validation instead of throwing at boot. Covered by regression tests for both the upgraded and the fresh path.
- **The published packages contain only what they should.** All four now declare a `files` allowlist. 0.2.x tarballs shipped `.eslintrc.js`, the `dev/` harness, a stray `package.json-prepack`, and compiled output for code that had already been deleted.
- **The backend's config schema now ships.** `config.d.ts` was never included in a published tarball and no `configSchema` field pointed at it, so `devAiHub.telemetry.salt` was an undeclared key — harmless under default validation, rejected under `noUndeclaredProperties`, and never marked `@visibility secret`. Both are now in place.

## Known gaps

Shipped deliberately, tracked, and worth knowing before you deploy:

- **Install is a download, not an install.** There are no per-tool launchers for Claude Code or Cursor yet ([#51](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/51), [#52](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/52)), and `install` is recorded where the dialog opens rather than where the install lands ([#53](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/53)). Treat install counts as intent, not completion.
- **`view` counts are raw event fires.** The per-user-per-day dedup ADR-0007 calls for is not implemented ([#47](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/47)), so a render loop can inflate them. The salted actor hash is already recorded, so no data is lost in the meantime.
- **`plugin` and `marketplace` children do not render.** The `dependsOn` relation is stored and readable in the catalog, but the cards do not show containment ([#32](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/32)).
- **No response caching.** Every list hits the catalog and every body read hits your Git host through `UrlReader`. On a large catalog or under load, watch your integration's rate limits.
- **Multi-file downloads are assembled in memory.** There is no size or file-count cap on the zip path (ADR-0009), so a very large source directory is best avoided.
