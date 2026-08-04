# Telemetry stores all events; popularity is deduplicated at read time

> **Implemented, with the read-time dedup since removed** — the title now describes only the
> store-all half. Three things changed since the original decision, all amended below: a `view` is
> recorded when a user *opens* a resource rather than when a card renders, every action is counted
> raw at read time (no per-(hash, day) dedup), and the salt is no longer required from config.

Install telemetry records **every** event (`install`, `copy`, `download`, `view`) as its own row
and never rejects a write for deduplication purposes. "Popularity" is computed at **read time**:
`install`/`copy`/`download` are counted raw, while `view` is counted as distinct per user per day
to stop render-loop inflation. Caller identity is stored as a **salted hash** of the user ref
(not plaintext), using a stable salt supplied from config.

We chose store-all-plus-read-time-dedup over a write-time unique constraint because telemetry is
fire-and-forget from the frontend: a blocked or upsert-failing write could surface as a client
error and thus *constrain normal Backstage behaviour*. Keeping the write path unconditional means
dedup is purely a query concern and full event history is retained. Before recording, the entity
ref is validated to be a real `AiResource`, so garbage refs never land.

## Considered options

- **Write-time dedup (unique constraint / upsert)** — rejected: risks failing legitimate writes and
  constraining the caller.
- **Plaintext user ref** — rejected for privacy; the salted hash still supports per-user-per-day
  dedup without storing identifiable usage data.

## Consequences

- A new migration adds an `actor_hash` column (nullable for legacy rows).
- The dedup salt **must be stable across restarts** — a random-per-process salt would break per-day
  dedup. It need not come from config: `devAiHub.telemetry.salt` is an optional override, and when
  it is unset the backend generates a salt once and persists it in its own database. Requiring it
  from config was the original decision and it was reversed — a missing value failed plugin init and
  took the whole backend down with it
  ([#56](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/56)).
- Popularity counts are raw lifetime event totals for all four actions — see the 2026-08-03
  amendment, which dropped the read-time dedup this decision called for. **`install` is expected
  to stop being raw**: ADR-0011 and [#53](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues/53)
  require it counted as distinct actor per resource, lifetime — one human, one install, forever.
  That is deliberately unlike `view`, which recurs meaningfully where an install does not. "All
  four raw" describes the state this amendment leaves behind, not a decision overriding ADR-0011.
- Per-user attribution/audit is intentionally not possible from stored data (hash is one-way).

## Amendment (2026-07-29, #56): the salt is generated, not required from config

"The dedup salt **must be stable and configured**" conflated two things. Stability is the real
requirement — a per-process salt breaks per-day dedup across restarts. *Configured* was an
implementation choice, and it was implemented as `config.getString`, which throws when the key is
absent. Because the read is unconditional, a deployment that never configured this plugin at all
still failed, and a failing plugin `init` takes the whole backend down: verified by starting the
backend against a config with no `devAiHub` block, which produced `BackendStartupError` after
`catalog` and `auth` had already initialised.

The salt is therefore generated once and persisted in the plugin's own database (migration 009),
which is what actually delivers stability. Config remains an optional override, for deployments
that want the salt held outside the database it protects, and a configured value is never
persisted.

The cost is accepted deliberately: a generated salt lives alongside the hashes, so a database dump
yields both, and hashing protects against casual reading rather than against a dump. The threat it
still answers is the one that matters here — the user ref space is a few thousand enumerable
catalog entries, so *unsalted* hashes would be trivially reversible. A hardcoded constant in the
source was rejected outright: it ships in the npm tarball, identical and public for every
deployment, which is "plaintext user ref" (already rejected above) with extra steps.

Changing the salt source makes existing hashes incomparable with new ones. That is free while only
dev data exists and stops being free the moment production records anything, which is the argument
for landing it before the v2 release rather than after.

## Amendment (2026-08-03, #47): a `view` is an opened resource; read-time dedup is dropped

This amendment reverses the read-time dedup for `view` that the decision above rests on, and fixes
the write side instead. `#47` is therefore closed by the opposite change to the one it proposed.

**Write side: `view` now fires when a user opens a resource, not when a card renders.** It was
recorded on `ResourceCard` mount, so loading the browse page counted a view for every card in the
grid — a resource accumulated views from users who never looked at it, and simply filtering or
paginating (which remounts cards) added more. It now fires in `ResourceDetailPanel` when the drawer
opens, whether by click or by `?resource=` deep link. That matches what the count is meant to
answer, "how many people looked at this resource", and it removes render inflation at the source
rather than subtracting it at read time.

This is a semantic break in the series, not a bug fix on top of comparable data: `view` counts
recorded before this change mean "times a card was rendered" and counts after mean "times a
resource was opened". The two are not comparable, and the number will fall sharply — a card renders
far more often than it is opened. History is kept rather than reset, because the store-all rule is
the ADR's core decision and deleting rows to make a chart look continuous is exactly the write-side
editing it rejects.

**Read side: `view` is counted raw, like the other three.** The deferred [2.3c] dedup was built
first — distinct per (`actor_hash`, `day`) via a subquery — and then removed once the write-side
change landed. The card shows a resource's **total views**, not its distinct viewers per day, and
that is the number the counter is meant to convey: "this resource has been opened 412 times", the
same reading as a view count anywhere else.

Dedup was never wanted for its own sake; it was compensation for a `view` that fired on render. Once
a row means "someone opened this", collapsing rows discards real events — a person who returns to a
skill four times in a day did look at it four times. Keeping both numbers was considered and
rejected: nothing consumes a distinct-viewers figure, and an unread field on a shipped contract is
a maintenance cost with no reader.

The count is a **lifetime** total: nothing is windowed to a recent period and no row ever stops
counting.

What this gives up is the guard against a single user inflating one resource by re-opening it
repeatedly. That is accepted — it takes deliberate effort rather than happening by accident as the
render loop did, these counts inform browsing rather than anything consequential, and `actor_hash`
and `day` remain on every row, so distinct-viewer counting can be reintroduced as a query whenever
it is actually wanted. No migration was needed to drop it, and none would be needed to restore it.

Both changes push the displayed number down for an existing 0.3.0 deployment: far fewer events are
recorded from here on, and the pre-existing rows carry the old render-time meaning. That is the
intended correction, not a regression, but it is visible to anyone who watched the old figure.

## Amendment (2026-07-22, slice [2.3c] / #31) — superseded by #47 above

`GET /telemetry/:ref` ships with **raw counts for all four actions**, including `view` —
the per-(hash, day)-distinct dedup for `view` described above is deferred to a follow-up issue,
not built in this slice. `actor_hash` is still captured on every write (store-all is unconditional
regardless of what the read side currently does with it), so the deferred issue can dedup the
existing history without needing a backfill. Until that issue lands, a resource's `view` count is
literally "how many view events were recorded," including render-loop repeats.
