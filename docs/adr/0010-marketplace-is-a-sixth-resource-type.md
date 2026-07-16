# `marketplace` is a sixth ResourceType — a browsable container, not an ingestion source

DevAI Hub adds `marketplace` to the `spec.type` vocabulary (extending ADR-0003's five values).
A marketplace mirrors the AI-tool marketplace concept (e.g. a Claude Code plugin marketplace:
a Git repo carrying `.claude-plugin/marketplace.json`): the user first *installs the
marketplace* into their tool (`/plugin marketplace add org/repo`), and can then install
plugins from it.

Two models were on the table:

1. **A sixth ResourceType** — the marketplace is itself a browsable `AiResource`, hand-authored
   by a producer like every other entity. Its child plugins appear in DevAI Hub only if the
   producer also authors their entities and links them via `dependsOn`.
2. **An ingestion source** — DevAI Hub reads the marketplace manifest and materialises its
   plugins as resources.

We chose **(1)**. Option (2) would make DevAI Hub a producer, overturning ADR-0004 (ingestion
is hand-authored, never plugin-owned) and ADR-0001 (catalog is the sole source of truth), for
a payoff — automatic plugin discovery — that belongs in a producer-side automation *outside*
the plugin if it is ever wanted.

## Shape of the type

- **Containment:** `marketplace ⊃ plugin ⊃ {skill, agent, hook, mcp}` — a marketplace
  `dependsOn` **plugins only**, mirroring the real `marketplace.json`, which lists plugins.
  A producer who wants a loose skill in a marketplace wraps it in a plugin, exactly as the
  real tool forces. Plugins-only is a rendering convention, not hard validation: non-plugin
  children are silently not rendered as children (consistent with `plugin` containment).
  A plugin may belong to several marketplaces (`dependsOn` is many-to-many); the inverse
  `dependencyOf` relation lets a plugin card show "part of: <marketplace>".
- **Body:** a markdown doc carrying the marketplace-add command, repo link, and usage notes —
  mirroring `plugin`, whose body carries the install link. The body is **not** the
  `marketplace.json` manifest: users register the repo, they never copy the manifest, so a
  JSON body would make copy/download deliver something non-actionable. No
  `devaihub.io/marketplace-url` annotation — the repo reference lives only in the body and
  the mandatory `source-location`, per the issue #30 precedent (annotations duplicating
  install config invite drift).
- **Guided journey (derived, not annotated):** the install dialog generates copyable
  per-framework add commands (Claude Code `/plugin marketplace add …`, Copilot CLI
  `copilot plugin marketplace add …` — both tools consume the same
  `.claude-plugin/marketplace.json` format; Cursor/Gemini have no marketplace concept and get
  no row), an install-from-it template (`/plugin install <plugin>@<marketplace-name>`), and a
  copyable team-distribution `extraKnownMarketplaces` snippet. The Claude Code row also carries
  a one-click "Add in Claude" deep link on the documented `claude-cli://open?q=` handler — it
  opens a Claude Code session with the add command pre-filled, never auto-executes, and no-ops
  harmlessly where the scheme is unregistered, so it complements the copy button rather than
  replacing it. Copilot's CLI has no URI scheme, so its row stays copy-only. The repo slug is
  **derived from
  `source-location`**, which two producer-contract rules make sound by construction:
  the marketplace's body doc MUST live inside the marketplace repo itself, and
  `metadata.name` MUST equal the `name` in `marketplace.json`. When the slug cannot be
  derived, the dialog silently falls back to the rendered body alone — the body stays
  canonical.
- **Install semantics:** command-based like `plugin` — no filesystem install path
  (`INSTALL_PATHS.marketplace = {}`), `bodyShape = markdown`. A marketplace also has **no
  downloadable artifact**: installing means *registering* the repo with the AI tool, which
  then fetches and auto-updates the marketplace itself. The UI therefore hides Download
  (`hasDownloadableArtifact`) and body copy (`hasCopyableBody`) for this type — the only
  thing either could deliver is the instructions doc, which would misrepresent itself as the
  marketplace; the actionable copies are the journey's own command buttons.
- **Card identity:** store icon; **NOS Coral `#F26B43`** as the sixth palette colour — taken
  from the in-repo NOS brand reference
  (`.github/skills/nos-presenting-colors/references/branding.md`), not invented — delivered as
  the plugin-owned `--devaihub-type-marketplace` token pair per ADR-0008.

## Why this is safe upstream

The upstream `AiResource` JSON schema validates `spec.type` as any non-empty string (only
`skill` has a structured subtype schema), so `spec.type: marketplace` ingests without any
catalog change — verified against the installed `@backstage/catalog-model` alpha schema.

## Consequences

- ADR-0003's "exactly five" becomes six; the registry-driven design means the change is one
  entry in `-common`, one CSS token pair, and one card mapping (as ADR-0003 predicted).
- Two types now have children; the children-section machinery (issue #32) must key off a
  per-type "allowed child types" rule (`plugin → skill/agent/hook/mcp`, `marketplace → plugin`)
  rather than hard-coding `plugin`.
- Marketplace plugins do **not** auto-appear: producers must author child plugin entities and
  wire `dependsOn` by hand. If that burden bites, the remedy is a producer-side generator from
  `marketplace.json` — outside the plugin, per ADR-0004.
- If upstream ever ships a structured `marketplace` subtype, migrate per the §7 exit
  conditions in the spec.
