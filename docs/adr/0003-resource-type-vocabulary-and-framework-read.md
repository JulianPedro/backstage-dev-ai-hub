# Resource-type vocabulary and best-effort framework reads

The kind is always `AiResource`. DevAI Hub recognises five `spec.type` values —
`skill`, `agent`, `hook`, `mcp`, `plugin` — each rendered by its own card. Only `skill` has a
structured upstream spec; the other four use the default `AiResource` spec plus `metadata`
annotations for display data.

Because the plugin is a pure consumer, it cannot guarantee that non-skill entities carry
framework metadata. "Compatible frameworks" is therefore read **best-effort**, via a single
`getFrameworks(entity)` resolver shared by the cards and the MCP server:

1. `spec.type === 'skill'` → read native `spec.agents`;
2. otherwise → parse the `devaihub/compatible-frameworks` annotation (comma-separated);
3. otherwise → empty (render no badges, but still show the entity).

Unknown framework tokens pass through and display as-is rather than being dropped, since
producers are outside our control.

The annotation convention is **producer-facing documentation only** — non-normative. We document
how to author an `AiResource` that DevAI Hub displays richly, but entities without our annotations
still appear. We deliberately did not reintroduce the upstream `rule` type or fold legacy
`instruction`/`workflow`/`prompt`/`bundle` types into the five; their disposition is tracked
separately.

## MCP modelling: `AiResource:mcp` now, `API:mcp-server` later

MCP servers are modelled as `AiResource` with `spec.type: mcp` for v1, keeping the uniform
single-kind model (one catalog query, one registry keyed by `spec.type`). Upstream also offers a
*structured* alternative — the native `API` kind with `spec.type: mcp-server` and a typed
`spec.remotes: [{ type, url }]`. We do not read it yet, but we leave seams so it is additive later:
the `McpCard` is reachable from more than one source, the catalog query is factored so a second
`kind=API, spec.type=mcp-server` query can be added without rework, and the `spec.remotes` mapping
is documented in the authoring contract as a future read path. MCP servers authored the
Backstage-native way will not appear until that seam is activated.

## Consequences

- The shared resolver lives in `-common` so cards and MCP can never disagree.
- Cards must degrade gracefully when framework metadata (or any optional annotation) is absent.
- Adding a sixth type touches only the type→card registry in `-common` and the cards — no schema
  change (the kind is fixed).
- The MCP read path is deliberately extensible to a second kind without a rebuild.
