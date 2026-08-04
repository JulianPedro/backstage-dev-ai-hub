# Containment is declared child-side, by annotation

A `plugin` contains skills, agents, hooks and mcp-configs; a `marketplace` contains plugins.
Both ADR-0010 and the `AiResource` spec doc recorded that containment as `spec.dependsOn` on the container, and ADR-0011 parked `plugin`'s install commands until issue #32 made "the real relationship available".
It never was available.
This decision reverses the direction of the link and the mechanism that carries it.

## The premise that turned out to be false

`@backstage/plugin-catalog-backend-module-ai-model` registers static entity models and nothing else — it adds no processor.
The relation emission lives in `@backstage/catalog-model/alpha`, and it is per-`specType`:

```js
{ name: "v1alpha1", relationFields: baseRelationFields }            // default → ownedBy, partOf
{ name: "v1alpha1", specType: "skill", relationFields: [
    ...baseRelationFields,
    { selector: { path: "spec.dependsOn" }, relation: "dependsOn",
      defaultKind: "AiResource" } ]                                  // skill only
}
```

Upstream emits `dependsOn` relations for `spec.type: skill` — a leaf — and for nothing else.
Our two containers run on the default shape, where `spec.dependsOn` is neither in the declared spec interface nor read by any relation field.
The base schema does not reject the unknown key, so the `spec.dependsOn` sitting in `examples/catalog/plugin-secure-dev-bundle.yaml` and `examples/catalog/marketplace-nos-plugin-marketplace.yaml` is accepted and inert: stored on the entity, never turned into a relation, never queryable as one.

Nothing was broken by this, because nothing ever read it.
The children section was the first consumer, and it is the reason the gap surfaced at all.

## Containment is declared by the child

The child names its container in a `devaihub.io/parent` annotation:

```yaml
metadata:
  annotations:
    devaihub.io/parent: nos-marketplace, partner-marketplace
spec:
  type: plugin
```

The value is a comma-separated list, matching `devaihub.io/compatible-frameworks` so hand-authors learn one convention rather than two.
Each entry is a bare entity name, resolved in the entity's own namespace, or a full `airesource:ns/name` ref; the backend normalises to an entityRef.
A list rather than a single value preserves ADR-0010's many-to-many: a plugin genuinely can be listed in more than one marketplace, and forcing a choice would misrepresent the tool.

`spec.dependsOn` is removed from the container examples.
Keeping both would leave two ways to say containment with no arbiter between them, which is the drift ADR-0010 refused when it rejected `devaihub.io/marketplace-url` and ADR-0011 refused when it rejected `devaihub.io/marketplace`.
Those rejections stand on their reasoning; what changed is that the alternative they preferred does not exist for these types.

We considered keeping the parent → child direction and merely moving it off the inert field onto a `devaihub.io/children` annotation.
Rejected on authoring ergonomics: a team publishing a plugin into a marketplace it does not own would need write access to someone else's `catalog-info.yaml`, and the marketplace owner would become a bottleneck on every new plugin.
Child-side declaration also hands us the inverse for free — the "part of: <container>" badge the spec doc wanted from a `dependencyOf` relation is now a field the child already carries.

We considered a relation processor in the backend, emitting real `dependsOn`/`dependencyOf` relations so containment would show in Backstage's own entity pages.
Rejected: it makes the plugin write into catalog processing, brushing against ADR-0004's consumer-not-producer line, and it is a processor to own forever for a graph nothing currently reads.

## What the contract carries

`ResourceSummary` gains `parents: string[]`, read straight off the annotation, and `children: string[]` with `childCount`, inverted backend-side over the same single catalog read that `/resources` already performs.
No second query and no new endpoint: the browse read holds every visible `AiResource`, so the index is built in memory.
Emitting both directions keeps architecture.md's rule intact — the frontend renders lists, it never derives domain structure — and finally populates the `childCount` field the contract has carried unused since the plan was written.

Allowed child types stay a rendering convention rather than hard validation, as ADR-0010 already decided: a `marketplace` renders `plugin` children only, a `plugin` renders `skill`/`agent`/`hook`/`mcp-config`, and anything else is silently not rendered.
Parents outside the caller's visible set drop out the same way, because the index is built from a read made as the caller (ADR-0006) — "hidden from you" and "misspelled" are indistinguishable by design, and a card must never leak that an entity exists.

## `plugin` install commands are unparked

ADR-0011 left `plugin` body-only because nothing in the contract linked a plugin to its marketplace.
`devaihub.io/parent` is that link, so the plugin frame now renders the same two-step journey `marketplace` renders — `/plugin marketplace add <repo>` then `/plugin install <plugin>@<marketplace-name>` — sourced from the parent's own repo slug and reusing the existing `MarketplaceJourney` component.

The journey is generated for the **first** parent only.
A plugin listed in several marketplaces shows one command that works rather than an exhaustive list, and the other memberships remain visible from each marketplace's own children section.
A plugin with no parent keeps today's framing line and typeset body: with no container to name, there is no command to generate, and inventing one would be worse than the body it replaces.

## Consequences

- `spec.dependsOn` leaves the container examples and the spec doc; ADR-0010's containment bullet and AIRESOURCE-SPEC §3.5/§3.6 are superseded by this decision.
- ADR-0011's "`plugin` stays body-only" is superseded; its reasoning against a *duplicating* annotation is retained, since `devaihub.io/parent` replaces the mechanism rather than shadowing it.
- Producers who already wrote `spec.dependsOn` see no behaviour change on upgrade — it was inert — but they must add the annotation for children to render.
- The vocabulary is still short of the real containment: a Claude Code plugin also bundles `commands/`, and there is no `command` ResourceType, so a plugin renders four of its five child classes and is silently blind to the fifth.
- If upstream later adds relation fields for non-skill `AiResource` types, this decision is the thing to revisit — the annotation is a substitute for a missing catalog mechanism, not a preference over one.
