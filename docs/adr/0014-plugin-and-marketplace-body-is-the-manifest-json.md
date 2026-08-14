# `plugin` and `marketplace` bodies render as the manifest JSON, not a hand-authored doc

ADR-0010 required a `plugin`/`marketplace` body to be a hand-written Markdown doc pointing at the resource, explicitly never `.claude-plugin/plugin.json` or `marketplace.json` themselves — "users register the repo, they never copy the manifest, so a JSON body would make copy/download deliver something non-actionable."
In practice, producers pointed `source-location` straight at the real manifest anyway: it is the file that already exists in the plugin's repo, describing the plugin, which is exactly what a body is for.
Writing a second, hand-maintained doc to say the same thing is the kind of authoring friction ADR-0004 already tries to keep out of this plugin's story.

Because `getBodyShape` hard-coded `markdown` for both types, the fetched manifest JSON was pushed through `ReactMarkdown` regardless.
Markdown has no syntax for raw structured text, so it rendered as a single unbroken paragraph — the bug that prompted this decision.

## The premise that turned out to be false

ADR-0010's `hasDownloadableArtifact`/`hasCopyableBody` exclusions for `plugin`/`marketplace` were reasoned from the body being a **pointer doc** — copying or downloading it would misrepresent a set of instructions as the installable thing.
That reasoning assumed the body would in fact be a pointer doc.
Once the body is the actual manifest, copying or downloading it delivers exactly what it claims to: the real `plugin.json`/`marketplace.json`.

## Decision

`getBodyShape` (`dev-ai-hub-common/src/resources.ts`) returns `'json'` for `plugin` and `marketplace`, joining `mcp-config`:

```ts
export function getBodyShape(type: ResourceType): BodyShape {
  return type === 'mcp-config' || type === 'plugin' || type === 'marketplace'
    ? 'json'
    : 'markdown';
}
```

This is a pure `spec.type` switch, matching every other body-shape and install-semantics function in `-common` — not a sniff of the fetched content or an annotation opt-in.
`plugin` and `marketplace` bodies **are** the manifest now, full stop; there is no longer a supported alternate convention where their `source-location` points at a Markdown doc instead.
A resource of either type whose `source-location` happens to point at real Markdown will now render as JSON, falling into the raw-text fallback below since it won't parse — a known narrowing, not an oversight.
Simplicity was chosen over accommodating a mixed convention that would leave a `plugin` or `marketplace` entity ambiguous about which shape to expect without reading its `source-location`.

`hasDownloadableArtifact` and `hasCopyableBody` drop their `plugin`/`marketplace` exclusions and return `true` unconditionally — every type's body is now either the installable artifact (`skill`/`agent`/`hook`/`mcp-config`, ADR-0009) or the manifest itself (`plugin`/`marketplace`).

Rendering is pretty-printed and syntax-highlighted (`JsonBody` in `dev-ai-hub`), not the bare, unformatted dump the `mcp-config` code block used before.
`JSON.parse` failure falls back to the raw fetched text, unhighlighted — a malformed or foreign file must stay visible, never blank the panel.
Token colours are drawn from the app's own `--bui-fg-*` tokens rather than a canned Prism theme, so highlighting follows the active Backstage theme (light/dark) instead of shipping a fixed palette that would go unreadable in whichever mode it wasn't built for.

## What this does not change

The `marketplace` guided journey (`MarketplaceJourney`: per-framework add commands, the `/plugin install <plugin>@<marketplace-name>` template, the team `extraKnownMarketplaces` snippet) is untouched and still generates whenever a repo slug can be derived from `source-location`.
The JSON body is additive, not a replacement: it renders as a reference alongside the journey rather than being suppressed when the journey is present, because it is no longer "the same instructions said twice" (ADR-0010's reason for the old markdown-body suppression) — it is the actual file, which the journey never showed.

## Alternatives considered

**A producer-side `marketplace.json`-to-YAML generator**, which ADR-0010 itself named as the remedy for authoring burden ("outside the plugin, per ADR-0004").
Rejected for this problem specifically: the burden here isn't authoring the *catalog entity* (producers already did that correctly) — it's the now-removed requirement to *also* hand-write a companion Markdown doc purely so the existing renderer wouldn't mangle the real manifest.
A generator would still need to produce that doc, or this same rendering fix, to avoid the mangling; it solves a different, later problem (bulk onboarding a marketplace's plugins) that remains open per ADR-0010.

**Content-type-driven `bodyShape`**, sniffing the already-fetched response's content-type (the backend already sets it from the file extension in `bodyResolver.ts`, and the frontend client already captures it into `ResourceBody.contentType` unused) rather than switching on `spec.type`.
Rejected for extra indirection with no present payoff: no producer currently wants a `plugin` or `marketplace` body that is Markdown, and a type-driven switch keeps this function's contract identical in shape to `hasDownloadableArtifact`/`hasCopyableBody`, which must stay type-driven regardless — they gate UI before any body fetch happens.
If a real need for mixed shapes appears, `ResourceBody.contentType` is sitting there, ready to be wired in without any new plumbing.

## Consequences

- ADR-0010's "the body is not the `marketplace.json` manifest... never" and its `hasDownloadableArtifact`/`hasCopyableBody` exclusions are superseded by this decision.
  ADR-0010's containment, guided-journey, and card-identity sections are untouched.
- ADR-0009's amendment ("A `plugin` or `marketplace` body is pointer-shaped... downloading it delivers a doc that misrepresents itself as the thing") is superseded for these two types; its reasoning for `skill`/`agent`/`hook`/`mcp-config` stands.
- Producer entities that already point `source-location` at the real `plugin.json`/`marketplace.json` (the natural, previously-broken thing to do) now render correctly with zero changes on their side.
- A producer who deliberately wants a hand-written Markdown pointer doc for a `plugin` or `marketplace` — e.g. to add prose the manifest doesn't carry — has no supported path to that today; revisit via `ResourceBody.contentType` (see alternatives) if that need materialises.
