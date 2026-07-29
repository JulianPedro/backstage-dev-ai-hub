# The dev harness runs the plugin as shipped, and e2e keeps a mocked tier on purpose

The frontend harness used `createDevApp` and mounted `<AiResourcesPage />` directly. That meant
`devAiHubPlugin` was never executed: not its `PageBlueprint` routing, not the `browse`
`SubPageBlueprint`, not its `ApiBlueprint`. The plugin's entire extension wiring could break and
both `yarn start` and the e2e suite would stay green, because neither ever loaded it. The harness
also had no catalog UI, so nothing showed that `AiResource` entities were reaching the plugin from
the catalog — the one claim ADR-0001 makes that a developer most needs to see.

The harness is therefore a **real Backstage app**: `createApp` from `@backstage/frontend-defaults`
with `features: [devAiHubPlugin, catalogPlugin, userSettingsPlugin, signInModule]`. The plugin is
mounted as a feature, never as a component. The catalog plugin rides along as a viewer onto the
entities the plugin reads, so the catalog → dev-ai-hub read path is visible end to end. User
settings carries the theme toggle, without which the app silently follows `prefers-color-scheme`
and only one theme is ever exercised. Guest sign-in is a `SignInPageBlueprint` extension, because
the v2 routes require real Backstage credentials (ADR-0005) and reject the legacy tokenless
identity.

Every harness dependency is a `devDependency`. Consumers never install them, so a harness built
from the whole Backstage app stack costs the published package nothing.

**The rule is: the harness runs the plugin as shipped.** A direct component mount is faster to
write and tests a fiction. Mounting NFS plugins into a legacy `createDevApp` is not possible, so
this is also a one-way door — the legacy harness could never have grown into this one.

The change paid for itself on first boot, which is the argument for the rule better than any
reasoning: it exposed a detail drawer that was ~90% transparent in dark mode, a missing Backstage
UI stylesheet, and a drawer that renders above the install dialog's overlay — contradicting a
premise ADR-0011 relies on. None of these were reachable from a component mount.

## Surface tokens versus layer tokens

`--bui-bg-neutral-1` is `#fff` in light mode but `oklch(100% 0 0 / 10%)` under
`[data-theme-mode='dark']`. It is a *layer* token, meant to sit over an opaque background — on a
card it produces exactly the intended tint. The detail drawer used it as the background of a
`position: fixed` panel with the page behind it, so in dark mode the page showed straight through.

An element that floats over the page brings its own opaque surface — `--bui-bg-app` — and reserves
the neutral tokens for elements that sit on one. The failure mode is invisible in light mode,
where every one of these tokens is opaque, which is why it survived until the harness put a real
app in front of a developer using a dark OS theme.

## E2E keeps a mocked tier deliberately

The suite migrated to the new harness with **no spec changes**: 50/50 pass with the frontend alone
and no backend, which is how CI runs it. `/dev-ai-hub` redirects to the `browse` sub-page, so the
existing URLs still resolve, and the plugin page issues no catalog requests at all, so the catalog
plugin's presence costs the specs nothing.

The mocked tier stays, and the reason is worth recording because "we have a real backend now, why
mock?" is the obvious question. Mocks buy determinism precisely where live data cannot: telemetry
counts accumulate in sqlite across a run and the suite asserts exact numbers under
`fullyParallel`; body resolution reaches `raw.githubusercontent.com` from shared CI addresses; and
the error paths under test — a 404 body, an unparseable `mcp-config` — have no live fixture,
because the seeded examples are all valid. A live suite would trade those assertions away.

A live smoke tier — both servers, a secretless `app-config.e2e.yaml`, a handful of specs proving
seeded entities reach the page — remains open, and would be additive rather than a replacement.

## Consequences

- `yarn start` is a real Backstage app; anything that works there works the way a consumer gets it.
- Harness dependencies track the Backstage release line in `backstage.json` and must be bumped with
  it, or the app and the plugin's peer expectations drift.
- Theme-adaptive CSS is only as tested as the themes someone looks at; the toggle makes both
  reachable, but neither is asserted automatically.
- The catalog defaults to `kind=component`, so `AiResource` entities are one filter away
  (`/catalog?filters[kind]=airesource`), not on the landing view.
- A seventh feature added to the harness is a decision about what the harness proves, not a
  convenience — each one is a package the workspace resolves and a Backstage version to keep aligned.
