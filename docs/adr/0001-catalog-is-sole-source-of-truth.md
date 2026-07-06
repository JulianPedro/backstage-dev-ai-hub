# Catalog is the sole source of truth for AI resources

DevAI Hub reads AI coding assets exclusively from the Backstage software catalog as native
`AiResource` entities (alpha kind, registered by `@backstage/plugin-catalog-backend-module-ai-model`).
The plugin maintains no parallel asset database as a system of record. If the catalog contains no
`AiResource` entities, the page shows an empty state rather than any fallback or mock data.

We chose this over the prior model (a plugin-owned SQLite/Postgres asset store synced from Git)
to avoid a "Frankenstein" plugin that duplicates catalog responsibilities. The catalog already
provides entity storage, ownership, relations, search and lifecycle. Owning a second store would
mean perpetual divergence from upstream and a siloed component.

## Consequences

- The plugin is a pure **consumer**; it never produces or mutates `AiResource` entities.
- Entities arrive in the catalog by normal Backstage means (hand-authored `catalog-info.yaml`,
  registered as Locations). See ADR-0004.
- The legacy asset store, Git sync service, REST asset API and asset parser are retired.
