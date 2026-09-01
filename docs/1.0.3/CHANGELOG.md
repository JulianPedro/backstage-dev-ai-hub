# 1.0.3

Marketplace and plugin containment is now visualized, and the packages are aligned with Backstage 1.54.

There are no database migrations and no plugin configuration changes.
Two producer-facing contract changes ship in this release despite the patch version — read "Before you upgrade" if you author `AiResource` entities.

## Before you upgrade

### The minimum Backstage version is now 1.54

The workspace moves from Backstage 1.51.0 to 1.54.5.
`@backstage/catalog-model` is now `^1.10.0`, which first shipped in 1.54.0, so 1.51–1.53 can no longer resolve these packages.
The advertised compatibility floor is corrected from 1.51 to 1.54 across all three package READMEs, the root README and `app-config.example.yaml`.

### `devaihub.io/version` is no longer read

The version chip now comes from the native `spec.version` field, verified as accepted on all six resource types by the 1.54 alpha validators.
The `devaihub.io/version` annotation is ignored — an entity left on it loses its version chip with no error.
Move the value to `spec.version`.

### `plugin` and `marketplace` entities must declare their members

`spec.skills` on a `plugin` and `spec.plugins` on a `marketplace` are now required by the per-type schemas; the catalog rejects an entity without them.
Both fields existed before as `spec.dependsOn`, which generated no relation for these types.
Rename `spec.dependsOn` to the required field — `spec.skills` for `plugin`, `spec.plugins` for `marketplace` — and the catalog generates `hasPart` / `partOf`.

## Relationship visualization

Containment is read from the native parent-side spec — `spec.skills` and `spec.plugins` — as the sole source, replacing the `devaihub.io/parent` annotation direction recorded in ADR-0013 (see ADR-0015).

The backend now returns, on each `ResourceSummary`:

- `children` — the caller-visible members of a `plugin` or `marketplace`, restricted to renderable types.
- `parents` — the in-memory inverse, so a member knows what contains it.
- `childCount` — derived from the same filtered set as `children`, so a card chip and the detail sections can never disagree.

Containment is limited to what the real Claude and Copilot manifests allow: a `marketplace` contains `plugin` entities, and a `plugin` contains `skill`, `agent`, `hook` and `mcp-config` entities.

In the UI:

- The detail panel gains linked relationship sections — **Part of**, **Includes**, and **Plugins in this marketplace** — with navigable rows.
- Cards carry a member-count chip and a **part of** chip, both in the resource type's colour.
- A shared `CollapsibleSection` wraps the JSON manifest content: expanded in the detail panel, collapsed in the install dialog. The open state survives a parent re-render.

The example `plugin` and `marketplace` entities are validated against the upstream `@backstage/catalog-model/alpha` validators in CI, so a missing `spec.skills` / `spec.plugins` regresses the build.

## Dependencies

- **npm_and_yarn group — 18 updates** ([#89](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/89)): `js-yaml`, `postcss`, `tar`, `webpack-dev-server`, `body-parser` and others, all transitive or dev-only.
- **vm2** bumped ([#91](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/91)).
- **github-actions group — 12 updates** ([#80](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/80)): `actions/checkout` 7, `actions/setup-node` 7, `actions/github-script` 9 and the reviewdog actions. CI only; not shipped in any package.

## Docs and tooling

- `AIRESOURCE-SPEC.md`, `CONTEXT.md` and `architecture.md` updated for the required container fields, the retired annotation and the reopened containment decision (ADR-0015). A pre-existing glossary error — "five subtypes", where there are six — is fixed.
- The `airesource-yaml` authoring skill told authors the container fields were optional and that `allowedTools` was array-shaped; both produced a silently dropped entity and are corrected.
- `docs/screenshot.png` is refreshed to the current UI, and detail-drawer and install-dialog captures are added.
- `reports/` is added to `.prettierignore`, so `yarn test:mutation` no longer leaves `yarn prettier:check` failing.

## Not in this release

ADR-0015 records that containment reads move to the native parent side; no read path beyond the `children` / `parents` fields described above is implemented, and there is still no write path.
