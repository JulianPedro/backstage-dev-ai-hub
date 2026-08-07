# Playwright E2E

The end-to-end suite drives the frontend plugin in a real browser and asserts what a user would see.
It lives in [`plugins/dev-ai-hub/tests/e2e`](../../../plugins/dev-ai-hub/tests/e2e), configured by [`playwright.config.ts`](../../../playwright.config.ts) at the repo root.

## What "end-to-end" means here

It does not mean a running stack.
`playwright.config.ts` starts only `yarn start:frontend`; there is no backend, no database and no catalog.
Every call to `/api/dev-ai-hub/**` is intercepted in `fixtures/base.ts` and answered from fixtures.

That is a deliberate trade: the suite is fast, hermetic and cannot flake on a backend, and in exchange it proves nothing about backend behaviour.
Anything that is a backend rule — how installs collapse per actor (ADR-0007), what the catalog returns for a caller who cannot see an entity — belongs in the backend's own tests, not here.
Where a criterion sounds end-to-end but can only be observed as a frontend contract, the spec says so in a comment rather than pretending.

## The catalog is real

The default `GET /resources` payload is not hand-written.
`fixtures/example-catalog.ts` reads the seed entities from [`examples/catalog`](../../../examples/catalog), parses each YAML into an `Entity`, and maps it with **`toResourceSummary` — the same function the backend router serves the real endpoint with**.
Bodies are read off disk from each entity's own `backstage.io/source-location`.

This matters more than it sounds.
The hand-written summaries this replaced set `annotations: {}` and a top-level `sourceLocation`, a shape the mapper never emits, so they could not have caught a mapping bug.
Real data also carries real hazards, and finding them is the point: the `azure-devops-cli` body says "**CLI Version:** 2.81.0" in its prose, which collides with the drawer's own `Version` metadata label, and its `<h1>` repeats the resource title that the drawer header already renders as `<h2>`.
Both forced assertions to become exact or level-pinned — corrections that invented fixtures would never have prompted.

`toResourceSummary` lives in `dev-ai-hub-common` rather than the backend precisely so both sides can share it.

The seed catalog is used, not tested.
Its own validation is the backend's `examples.catalog.test.ts`; changing an example is a fixture change, and the e2e assertions that quote its content are expected to be updated with it.

## Fixtures and how to vary them

`fixtures/base.ts` exposes two Playwright options.

```ts
test.use({ resources: { items: manyResources(30) } }); // what GET /resources serves
test.use({ telemetry: 'stateful' }); // let POST /telemetry move the counts
```

`resources` defaults to the seed catalog; `telemetry` defaults to `'static'`, which serves frozen counts so a number never moves however much the user clicks.
`'stateful'` seeds a per-test tally from those same numbers and lets `POST /telemetry` increment it, which is what makes "open a resource, watch the view count go up" assertable.

Three things the seeds deliberately cannot express are hand-built in `fixtures/mock-api.ts` and opted into per describe block — a resource with no `source-location`, one whose body cannot be resolved, and bulk data for the pagination boundary.
Each is commented **broken on purpose**, so nobody mistakes them for examples worth copying.

### The option-shape trap

`resources` is an object (`{ items }`) rather than a bare array, and this is not a style choice.
Playwright rejects both of the more obvious shapes:

- **A bare array** is checked against its `[value, options]` tuple heuristic, which asks whether element 1 carries a known option key. One of those keys is `title` — and every `ResourceSummary` has a `title`. So any list of two or more resources is silently unpacked as a tuple and the fixture collapses to its first element. The symptom is a page-level `(items ?? []).forEach is not a function`.
- **A factory function** is treated as a fixture *implementation* and fails with `use() was not called in fixture "resources"`.

A plain object is neither, so it survives both checks.

## Running

```bash
yarn test:e2e                     # boots the frontend dev server itself
yarn test:e2e --ui                # interactive
yarn test:e2e resource-pagination # one spec
```

`SCREENSHOT_GALLERY=false` skips the gallery captures.

Playwright transpiles specs without type checking, and `plugins/dev-ai-hub/tsconfig.json` includes only `src`, so **`yarn tsc` does not typecheck these files**.
A type error in a spec surfaces as a runtime failure, not a compile error.

## Screenshot gallery

Specs call `captureGalleryScreenshot(page, testInfo, '05-marketplace-journey')` at states worth reviewing.
The `e2e.yml` workflow publishes them to a per-PR `screenshots-pr-<N>` branch and embeds them in a single sticky PR comment, collapsed behind a `<details>` so they do not bury the results table.
The number prefix is the display order — keep it stable and unique.

## Writing a new spec

- Prefer role-based locators (`getByRole('button', { name: 'View …' })`) over text matching. The drawer keeps its content mounted through its exit animation, so a bare `getByText(title)` will match the card, the closing drawer's heading, and the rendered body all at once.
- Assert the consequence, not the mechanism, where both are available — that a count moved, not only that a request fired. `resource-installation.spec.ts` asserts the request; `resource-telemetry.spec.ts` asserts the number.
- When behaviour is wrong but out of scope, pin what the app does today and say in a comment that the test is recording the behaviour rather than endorsing it, so the fix arrives with a failing test already pointing at it.
- Do not assert a race. If two effects can settle in either order, either restructure so the ordering is not in question or leave it out with a note.
