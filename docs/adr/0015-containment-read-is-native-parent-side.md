# Containment is read from the native parent-side fields, not the child annotation

ADR-0013 declared containment child-side, in a `devaihub.io/parent` annotation, on the premise that the container types *could not* express containment natively.
Backstage 1.54.0 falsified that premise: `plugin` and `marketplace` gained structured subtypes whose schemas make `spec.skills` and `spec.plugins` **required**, and upstream generates `hasPart`/`partOf` relations from them.
ADR-0013 named exactly this — "if upstream later adds relation fields for non-skill `AiResource` types, this decision is the thing to revisit" — as its revisit trigger.
This decision resolves the open question `CONTEXT.md` and the spec doc parked for ADR-0015: the backend reads the **native parent-side** fields, and the `devaihub.io/parent` annotation is retired.

## Decision

The container declares its own contents.
The backend builds the relationship graph from `spec.plugins` (marketplace → plugins) and `spec.skills` (plugin → skills/agents/hooks/mcp-configs), read over the single catalog read `/resources` already performs.
`ResourceSummary` carries `children: string[]` straight off those fields, `parents: string[]` as the in-memory inverted index, and the long-unpopulated `childCount`.
The frontend resolves each ref against the summaries it already holds; a ref outside the caller's visible set — hidden by permissions, an unsupported `spec.type`, or a child of the wrong type — resolves to nothing and is silently not rendered, exactly as ADR-0013 specified for the annotation path.

## Why the direction flipped

The native fields are **mandatory**: an entity missing them is rejected by the catalog, so — unlike the optional annotation — they are guaranteed present on every container the plugin sees.
They are what issue #90's example entities already use, and reading them keeps the plugin aligned with upstream `hasPart`/`partOf` rather than maintaining a parallel convention that would drift.

The deciding argument is governance, and it inverts ADR-0013's ergonomics reasoning rather than merely outweighing it.
ADR-0013 preferred child-side declaration so a team could publish a plugin into a marketplace without write access to the marketplace's `catalog-info.yaml`.
That same property means **any** plugin author could list themselves into **any** marketplace unilaterally.
Parent-side declaration makes the marketplace owner the sole gatekeeper of its membership — the marketplace's contents are edited only by whoever owns the marketplace entity — which is the intended authority model.
The authoring friction ADR-0013 tried to avoid is moot: the native field is required regardless, so it must be authored either way.

## Considered and rejected

Keeping `devaihub.io/parent` as a second, child-side path was rejected: two ways to declare containment with no arbiter between them is the drift ADR-0010 and ADR-0011 both refused, and it reopens the self-listing governance hole above.
Emitting real `dependsOn`/`dependencyOf` relations from a backend processor was rejected by ADR-0013 already and stays rejected: it makes the plugin write into catalog processing, against ADR-0004's consumer-not-producer line.

## Consequences

- ADR-0013 is superseded on mechanism and direction; its contract shape (`parents`, `children`, `childCount` on `ResourceSummary`) is retained, with `children` now sourced directly rather than by inversion.
- `devaihub.io/parent` is retired from the spec doc, `CONTEXT.md`, `architecture.md`, and the authoring skill; no example catalog entity or code path ever read it, so no producer data migrates.
- ADR-0011's parked `plugin` install journey is *enabled* by the `parents` field this decision populates but is **not** turned on here — that unparking is a separate follow-up slice, with this work as its prerequisite.
- Allowed child types remain a rendering convention, not catalog validation: upstream's `spec.skills`/`spec.plugins` carry `allowedKinds: ["AiResource"]` with no `specType` restriction, so any AiResource type is a legal member. `toResourceSummaries` narrows that once — a marketplace keeps `plugin` children only, a plugin keeps `skill`/`agent`/`hook`/`mcp-config` — so `children`, `childCount`, `parents`, the card chip and the detail sections cannot disagree. Off-convention members (and refs the caller cannot see) are silently dropped.
- The narrowing is chosen to stay **compliant with the real Claude Code / GitHub Copilot manifests**, not as an arbitrary product rule. The `claude-code-marketplace.json` schema requires a marketplace's `plugins` array to list plugins only, and a plugin manifest's component kinds are `skills`/`agents`/`hooks`/`mcpServers` (plus `commands`, `lspServers`, `themes`, `outputStyles`, `channels`, `monitors`, which DevAI Hub does not model, and `dependencies`, which is a dependency rather than containment). The allowed sets are named `MARKETPLACE_MEMBER_TYPES` and `PLUGIN_MEMBER_TYPES` in `-common` so this boundary is explicit.
- A visual relationship graph (e.g. Mermaid) is deferred; the `children`/`parents` data this decision lands is the substrate a later graph would render, requiring no contract change.
