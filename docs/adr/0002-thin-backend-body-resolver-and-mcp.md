# Thin backend: body resolver, install telemetry, and MCP server

The plugin retains a thin backend, but with a drastically reduced surface. It does three things:
(1) a **body resolver** that, given an `AiResource` entity ref, reads the entity's
`backstage.io/source-location` annotation and fetches the body via `UrlReader` (and assembles a
zip for resource-bearing skills); (2) an **install telemetry** table — a single install counter
keyed by entity ref; (3) a **catalog-backed MCP server** that exposes resources to AI tools,
reading the catalog via `CatalogClient` and resolving bodies through the same resolver.

The body is deliberately not stored in the catalog (entities are metadata-only), so something must
fetch it on demand to preserve copy/download/install and to feed the MCP server. We keep this in a
backend rather than the frontend because it needs `UrlReader` (server-side, integration-scoped, no
SSRF) and a small persistent counter.

## Consequences

- No asset store, no Git enumeration, no REST asset CRUD — the backend reads the catalog and Git
  just-in-time.
- The body resolver uses `UrlReader` only (configured integrations); it never re-derives Git
  trees. This is the security boundary.
- Install count is the only mutable, plugin-owned state. It is not catalog truth.
- When upstream ships a content reference for `AiResource` (backstage/backstage#34318), the body
  resolver becomes a candidate for removal.
