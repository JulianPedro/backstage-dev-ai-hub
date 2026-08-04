# Plugin-owned colour tokens for the five type roles

The five per-type cards need five visually distinct colour identities that hold in
light and dark themes. The original plan said "bind the colour roles to BUI theme
tokens, not raw hex" — but BUI (`@backstage/ui` 0.15) ships exactly four semantic
colours (`info`, `success`, `warning`, `danger`) plus neutrals. There is no fifth
hue and no categorical palette, so the letter of that plan is unsatisfiable.

We considered reusing the four intents plus neutral as the fifth role. Rejected:
intent tokens carry meaning — a `danger`-red HookCard reads as "this is dangerous",
and whichever type lands on neutral has no identity at all.

Instead, the plugin owns its own tokens, layered on BUI's theming mechanism:

- One CSS file in the frontend declares a `--devaihub-type-<type>` bg/fg pair per
  `ResourceType`, with values under `[data-theme-mode='light']` and
  `[data-theme-mode='dark']` — the same root attribute BUI itself themes with, so
  the colours follow the app's theme toggle automatically.
- Raw hex exists in exactly that one file. Components reference only the custom
  properties.
- The type→card registry in `-common` stores the **role name** (the type token),
  never a colour value; the CSS file is the single place a role resolves to paint.

## Consequences

- Five distinct hues with stable identity in both themes; no semantic misuse.
- Adding a sixth type means one registry entry plus one CSS token pair.
- If a future BUI version ships a categorical palette, migration is confined to
  the one CSS file.
- Deviates knowingly from the plan text of issue #29 (Q3); this ADR is the record
  of why.

## Amendment (2026-08-03): the hexes now come from the NOS digital brand

The mechanism above is unchanged — plugin-owned tokens, one CSS file, role names in
the registry. What changed is **where the hex values come from**, and the honesty of
the claim attached to them.

The token file described its values as "NOS company palette — do not substitute other
colours". That was true of exactly one of the six. Checked against both NOS sources
available to this repo — the presentation brand reference in
`.github/skills/nos-presenting-colors/references/branding.md`, and the NOS digital
palette in `nosportugal/backstage` `packages/app/src/themes/palette.ts` — five of the
six hexes appear in neither. They were near-misses of NOS hues: right hue family,
wrong value. Only marketplace coral (`#f26b43`) was genuinely sourced.

There are two authentic NOS palettes and they disagree, because they serve different
media: the skill is the **presentation** brand (teal-led, `#00b3ad`), and
`palette.ts` is the **digital** brand (blue-led, `#4f60d2`). This plugin renders
inside the digital one, so that is the source of truth for anything painted in a
Backstage page. The presentation palette stays where it belongs — decks.

The six roles keep the hues they always had; only the values are now real:

| Role | NOS brand colour | light | dark |
|---|---|---|---|
| skill | green `#6ea514` | `#609112` | `#6ea514` |
| agent | pink `#eb84cd` | `#e042b2` | `#eb84cd` |
| hook | yellow `#fcd200` | `#9b8100` | `#fcd200` |
| plugin | blue `#4f60d2` | `#4f60d2` | `#5d6dd6` |
| mcp-config | turquoise `#4bdbc5` | `#1d9381` | `#4bdbc5` |
| marketplace | NOS Coral `#f26b43` | `#ef4716` | `#f26b43` |

Hue and saturation are fixed at the brand value; only lightness moves, and only as
far as 3:1 against that theme's card background (`--bui-bg-neutral-1`: `#ededeb` in
`nos-light`, `#252830` in `nos-dark`) requires. Half the values are the brand hex
untouched.

**marketplace does not take `brand.red`** (`#e04232`), even though it is the nearest
brand hue. That palette binds red to `error`; using it for identity is the semantic
misuse this ADR was written to avoid. NOS Coral is itself a NOS colour and carries no
status meaning, so it stays.

### Why this was a defect and not a preference

Every light-theme value failed contrast against the host app's off-white card
(`#ededeb`): between 1.33:1 (hook) and 2.57:1 (marketplace), where 3:1 is the floor
for meaningful non-text UI. Hook yellow was effectively invisible. Dark mode was
fine throughout — this was a light-theme-only defect, and it was worse in the real
app than in this repo's dev harness, whose background is lighter still.

The stat tiles are a knowing exception, and the one place in the plugin where measured
contrast was traded for appearance. They are solid blocks of the brand hex with white
on them: 5.34:1 (blue), 3.02:1 (coral), 2.98:1 (green), 2.41:1 (pink), 1.72:1
(turquoise), 1.46:1 (yellow) — three of six below AA even at the large-text 3:1 floor.

Both compliant alternatives were built and rendered before this was settled. Ink on
bright tiles passes everywhere (4.58–8.44:1) and was rejected on appearance. Keeping
white and darkening the hues until it passes was rejected twice on sight, because any
yellow dark enough to carry white has stopped looking like NOS yellow — the ceiling is
the hue, not the contrast floor chosen, and lowering the floor from 4.5 to 3:1 barely
moved the two worst tiles.

**Do not silently "fix" this.** It is a decision made by the owner with the options in
front of them, not an oversight. Mitigations that do not change the measurement: the
text is large and bold, it carries a shadow (the device `nosportugal/backstage` itself
uses for white header text over its brand gradient), and the coloured field is about
half the area it was before the layout was compacted.

### The tile labels were not honouring the token at all

Worth recording, because the symptom pointed away from the cause. `.tile .tileValue`
sets the colour in this plugin's stylesheet, but BUI's `Text` sets its own, and which
one wins depends on the order BUI's styles land relative to the plugin's **in the host
app** — not something this plugin controls. In an app where BUI came last, the tile
labels fell back to BUI's foreground: invisible in light mode, since that foreground
is dark and so were the labels, and glaring in dark mode, where the value and label
turned white while the icon — a plain SVG, unaffected by BUI — stayed dark. It read as
"the icons are wrong". The colour is now applied inline on the `Text` elements, which
beats stylesheet order everywhere, so the tile foreground is no longer a per-app
lottery.

### Chrome accents are not plugin-owned

`--devaihub-brand-teal` is retired. It held the presentation teal and was used for
the drawer's fallback edge and the source-link colour — a third accent competing with
the host app's blue and turquoise, which is precisely the clash this amendment exists
to remove. Both usages now read `--bui-fg-info`, which the host app already points at
its own brand blue. Plugin-owned tokens are for the categorical type palette only,
where BUI genuinely has no equivalent; anything else follows the host theme.

### The type filter is not a KPI row

The tiles keep a small palette of their own — `--devaihub-tile-<role>`, one solid
brand hex per type, plus `--devaihub-tile-fg: #ffffff` — separate from the accents
above. The separation is the point of this section.

**A fill and an accent are different jobs.** `--devaihub-type-*` values are tuned to
read *against* a card surface, which in light mode means darkened: hook is `#9b8100`,
mcp-config `#1d9381`. Filling a tile with those produces an olive, dull row — this was
built and rendered, and it is the failure mode to remember. A filled tile has no page
behind it to react to, so it takes the brand hex as published, identically in both
themes.

The layout is the compact one that came out of a rebuild in between, when the tiles
were briefly neutral surfaces: icon square, count, small-caps label on one line of
sight. Solid fill over that layout gives roughly half the coloured area of the original
slabs. That rebuild also produced the shape of the row — see the guidance below, which
still applies.

**The row is a filter, not a KPI dashboard**, and the published guidance says so:
counts belong inside the filter control rather than being the hero, tile size should
carry priority instead of "decorative color application", and segmented selectors are
comfortable at 2–5 options rather than six. The compact layout answers all three while
keeping the colour, which is the property the owner cares about.

Selection is a `--bui-fg-primary` ring *outside* the tile, on the page background. On a
solid fill nothing internal works: a tint disappears, and an inset white ring is
invisible on precisely the yellow and turquoise tiles where selection most needs to
read.

The contrast trade is unchanged and is recorded above: white measures 1.46:1 on yellow.
It is confined to this row, and every type accent on the cards remains AA in both
themes.
