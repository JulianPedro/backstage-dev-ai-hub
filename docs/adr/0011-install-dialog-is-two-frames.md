# The install dialog is two frames, and install is counted where it actually happens

The install dialog grew one type at a time, and it showed: `marketplace` had a numbered journey with
per-host commands and deep links, `mcp-config` had a body preview and links, while `skill` — the type
users have most of — had a hint sentence above a four-row path table and nothing else. The six types
read as six different products. This ADR records the shape we settled on, and a companion correction
to what the `install` telemetry action actually measures.

## Two frames, not one skeleton

We considered forcing all six types through a single `① Get → ② Place → ③ Verify` skeleton for
consistency. Rejected: `plugin` and `marketplace` have nothing to "get" and no filesystem path to
place it in, so the shared skeleton would have to be bent into a lie for two of the six.

Instead the dialog has **two frames**, and the split is one the domain already made — it is exactly
`hasDownloadableArtifact`, and exactly ADR-0009's amendment between bodies that *are* the artifact
and bodies that are pointer-shaped:

- **Artifact-shaped** (`skill`, `agent`, `hook`, `mcp-config`) — the body is the thing being
  installed. Frame: what you are installing → where it goes, per host → act.
- **Command-shaped** (`plugin`, `marketplace`) — the body is instructions; the tool installs it.
  Frame: numbered commands with copy buttons and, where a host has a URI handler, a launcher.

Adding a seventh type means choosing a frame, not designing a layout.

## The preview shows content, not a manifest

The artifact frame opens with a collapsed `<details>` preview of the body.

We considered showing the artifact's *shape* instead — filename, file count, "downloads as .zip" —
on the reasoning that the detail drawer behind already renders the body, so the dialog should say
what lands on disk rather than repeat what it says. Rejected on cost: `ResourceBody` is
`{ content, contentType }` with no file listing, so an accurate manifest for a multi-file skill needs
a new backend contract. The drawer is also modally obscured while the dialog is open, so re-showing
the body is not pure duplication. Collapsed-by-default keeps it from crowding the frame.

## Compatibility is a property of the resource, not of the viewer

Every framework the resource declares gets its own block, carrying that host's install path and that
host's launcher. There is no framework picker and no personalisation.

We designed and rejected a remembered segmented picker (persisted selection, one path shown, a note
when the resource does not support your usual tool). It read well and would have cut a four-row table
to one — but it makes the dialog say different things to different people about the same resource.
Compatibility is a fact about the resource. The dialog reports it; it does not filter it. The plugin
stores nothing about the viewer anywhere as a result.

## Install is counted where it happens

`install` was recorded when the dialog *opened* — so the "🔥 N installs" on every card counted
dialog opens, and clicking the deep link that actually installs the thing recorded nothing. The
`tool` column that migration 007 added, and that the telemetry schema has always accepted, was never
once populated.

The rule is now: **record `install` at the most specific point available.**

- Where the host has a launcher, the launch button records `install` with that host as `tool`,
  giving per-tool attribution the schema was built for.
- Where a type has no launcher for any host, the first click on Install records it.

To make the first arm reachable for every artifact-shaped type, `skill` and `hook` gain launchers on
the **generic prompt handlers** — pre-filled, user-reviewed, never auto-executed, and a harmless
no-op where the scheme is unregistered.

Two tools expose such a handler, and the distinction matters more than it first appears. A launcher
does not need a purpose-built *install* route; it needs any route that opens the agent with text.
Claude Code has `claude-cli://open?q=` and **Cursor has
`cursor://anysphere.cursor-deeplink/prompt?text=`** — so both can install any artifact-shaped type,
including the two with no dedicated route anywhere. Cursor truncates at the first raw `&` and caps
the URL near 8000 characters, both handled by percent-encoding a short prompt.

The other two cannot. Copilot's editor has purpose-built routes (`vscode://chat-plugin/…`,
`vscode:mcp/install`, `vscode:chat-agent/install`) but no prompt handler, so it covers `agent`,
`mcp-config` and `marketplace` and stops there — VS Code registers exactly three URL handlers and
none accepts a skill. Gemini's only prompt URL drives the web app, which cannot write to a local
workspace, so it gets no launcher rather than a broken one. A
`hook` prompt asks the agent to *merge into* the existing settings file rather than write it, matching
the `merge` install mode the path list now marks.

Install counts read as **distinct actor per resource, lifetime** — one human, one install, forever.
This departs from the per-`(hash, day)` rule ADR-0007 anticipated for `view`, deliberately: a view
recurs meaningfully, an install does not. ADR-0007's store-all write path is untouched; this stays a
read-time concern.

## `plugin` stays body-only

> **Superseded by [ADR-0013](0013-containment-is-declared-child-side.md).** The relationship this
> section waited on does not exist upstream for non-`skill` types, so containment moved to a
> `devaihub.io/parent` annotation and `plugin` now generates the same two-step journey
> `marketplace` does. The argument below against an annotation that *duplicates* an existing
> mechanism still holds — `devaihub.io/parent` replaces the mechanism rather than shadowing it.

`plugin` is command-shaped but can generate no commands: nothing in the contract links a plugin to
its marketplace, and `childCount` is unpopulated until containment lands (issue #32). We considered a
`devaihub.io/marketplace` annotation to unblock it now, and rejected it — ADR-0010 already refused a
`devaihub.io/marketplace-url` annotation on the grounds that annotations duplicating install config
invite drift, and the same reasoning applies here. `plugin` renders its hand-authored body with a
clear framing line until #32 makes the real relationship available.

## Consequences

- The dialog splits into two frame components keyed off `hasDownloadableArtifact`; per-type
  divergence shrinks to content, not layout.
- Historical `install` rows mean "dialog opened" and are not comparable across this change. Counts
  will drop. This needs a release note — the repo has no CHANGELOG, which is a gap this change makes
  concrete.
- Install counts require a distinct-actor read path in `TelemetryStore`, not the current raw count.
- Attribution is only as complete as launcher coverage: a resource declaring only Copilot or Gemini
  for `skill`/`hook` shows a path and no button, and falls back to the dialog-open signal. Closing
  that needs handlers those tools do not currently offer.
- The rule for adding a launcher is "does this host expose *any* prompt route", not "does it have an
  installer for this type". Re-check that question per host when a new type lands, rather than
  assuming the answer from a type-specific search.
- Nothing about the viewer is stored, so the dialog stays cacheable and identical for all users —
  keep it that way if a "recently used tool" idea resurfaces.
