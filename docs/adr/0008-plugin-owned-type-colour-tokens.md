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
