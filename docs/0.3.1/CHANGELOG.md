# 0.3.1

A browse-page visual pass and one telemetry semantic change.

No API changes, no migrations, no configuration changes. Upgrading is a version bump.

**Read "A `view` now means something different" before upgrading** if you have been reading telemetry counts — the numbers will drop, and it is not a bug.

## A `view` now means something different

`view` was recorded when a resource **card rendered**. Loading the browse page therefore recorded a view for every card in the grid, and filtering or searching remounted the cards and recorded them again. A resource accumulated views from people who never looked at it.

It is now recorded when a user **opens** a resource — the detail drawer, whether by click or by a `?resource=` deep link.

This is a semantic break, not a correction to comparable data:

| | before 0.3.1 | 0.3.1 |
|---|---|---|
| A `view` means | a card was rendered | a resource was opened |
| Typical magnitude | inflated by grid renders | one per deliberate look |

**Expect view counts to fall sharply.** Existing rows are kept rather than deleted — store-all is the core of ADR-0007, and deleting rows to make a chart look continuous is exactly the write-side editing that decision rejects. The consequence is that history spans two meanings; treat the upgrade date as a discontinuity.

`install`, `copy`, and `download` are unchanged.

### Why the deduplication that was planned is not here

[#47](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/47) proposed deduplicating `view` per distinct user per day, to cancel render-loop inflation at read time. Once the trigger moved to "user opened this", every stored row is already one deliberate look and there is nothing to cancel. The issue is closed by the opposite change to the one it proposed.

`actor_hash` and `day` are still written on every row, so distinct-viewer counting can be reintroduced as a query — no backfill needed.

## The type colours are now the real NOS palette

The plugin's colour tokens described themselves as the NOS company palette. Checked against both NOS sources, **five of six values appeared in neither** — they were near-misses of NOS hues. Only the marketplace coral was genuinely sourced.

They now come from the NOS **digital** brand palette, the same source the NOS Backstage app's own themes use. Hue and saturation are the published brand values; only lightness moves, and only as far as contrast requires.

This also fixes a real accessibility defect. Every light-theme accent failed the 3:1 contrast floor against the host app's card background — hook yellow at **1.33:1**, effectively invisible. All six now clear it in both themes.

If you have overridden `--devaihub-type-*` tokens in your own theme, your overrides still win; nothing about the token names changed.

## Cards

- **No description on the card.** Clamped to two lines at card width it truncated mid-sentence. It is shown in full in the detail drawer.
- **No "View source" link on the card.** It was a second click target inside a clickable card; it remains in the drawer.
- **View and install counts are now chips**, carrying the type's colour, instead of grey footnotes.
- Rounder corners, one continuous surface instead of three banded sections, and a header that keeps its proportions whether a title is one line or two.
- Framework badges are icon-only, and all of them are shown rather than collapsing into a `+N`.
- Cards gained a `:focus-visible` ring — they were keyboard-focusable without one.

## Fixed

- The `all`-frameworks icon carried an `aria-label` but no `role="img"`, so its name was never exposed to assistive technology. It matters more now that framework badges are icon-only.
- Stat-tile text set its colour in the plugin's stylesheet, which lost to Backstage UI's own rule in host apps where BUI's styles load last — the labels changed colour between apps. Now applied inline, so it is deterministic.

## Known

The type-row treatment ships with a build-time `TILE_VARIANT` constant (`solid` | `console` | `aurora`) and three stylesheets, while the final look is chosen ([#65](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/65)). Every variant renders identical DOM and behaviour; only the stylesheet differs. `solid` is what ships.

White text on the stat tiles measures between 5.34:1 and 1.46:1 depending on the type's colour, so three of the six are below WCAG AA. This is a deliberate, recorded trade — the compliant alternatives were built, rendered, and rejected on appearance. See ADR-0008. It is contained to that row: every card accent is AA in both themes.

## Not in this release

Mutation testing (Stryker) landed in the repository but ships in none of the packages — it is repository tooling, not plugin code.

ADR-0013 (containment declared child-side via a `devaihub.io/parent` annotation) is a **design record only**. No code implements it yet; `ResourceSummary` carries no `parents` or `children` fields in 0.3.1.
