# @nospt/plugin-dev-ai-hub-common

Isomorphic contracts shared by the **Dev AI Hub** frontend and backend plugins.

> **Requires Backstage 1.54 or later.** The `AiResource` kind comes from Backstage's own alpha catalog module, and these packages depend on `@backstage/catalog-model@^1.10.0` — first shipped in 1.54.0, along with the `plugin` and `marketplace` subtypes.

**You do not install this package directly.** It arrives as a dependency of [`@nospt/plugin-dev-ai-hub`](https://www.npmjs.com/package/@nospt/plugin-dev-ai-hub) and [`@nospt/plugin-dev-ai-hub-backend`](https://www.npmjs.com/package/@nospt/plugin-dev-ai-hub-backend), and the three publish in lockstep at the same version.

## Why it exists

A contract duplicated across two packages is a contract that will drift. Anything the frontend and backend must agree on lives here exactly once, and neither plugin imports the other.

It is genuinely isomorphic — no Node-only and no browser-only code — which is why the same package can back both halves.

## The main contract

`ResourceSummary` is the flat shape the backend serves and the frontend consumes. The frontend never sees a raw catalog `Entity`; this is the whole of what it knows about a resource.

```typescript
interface ResourceSummary {
  entityRef: string; // "airesource:default/azure-devops-cli"
  name: string;
  title?: string;
  description?: string;
  tags: string[];
  type: ResourceType;
  lifecycle: string;
  owner?: string;
  sourceLocation?: string; // absent → browsable, not installable
  frameworks: string[]; // "claude-code", "github-copilot", …
  version?: string;
  kind: string;
  children: string[]; // renderable container members (spec.skills/spec.plugins)
  parents: string[]; // in-memory inverse of children
  childCount?: number; // = children.length
  helpText?: string;
  annotations: Record<string, string>;
}
```

`toResourceSummary(entity)` maps one `Entity`; `toResourceSummaries(entities)` maps a whole catalog read and resolves containment in both directions (ADR-0015). Both are exported here so the backend router and the test fixtures cannot disagree about them.

## Also in here

- **The `ResourceType` vocabulary** — `skill`, `agent`, `hook`, `mcp-config`, `plugin`, `marketplace` — and the rules derived from it: which body shape a type renders as (`mcp-config` is JSON, the rest markdown), whether its body is a downloadable artifact or merely a pointer, and its per-framework install paths.
- **Framework tokens and normalisation**, so `claude-code` means the same thing on both sides.
- **Telemetry schemas** for the event contract.

## Full documentation

See the [repository README](https://github.com/nosportugal/backstage-plugin-dev-ai-hub#readme) for setup, and [`docs/AIRESOURCE-SPEC.md`](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/blob/main-nos/docs/AIRESOURCE-SPEC.md) for the full `AiResource` entity spec.

## License

Apache-2.0
