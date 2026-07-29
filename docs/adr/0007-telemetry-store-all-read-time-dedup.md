# Telemetry stores all events; popularity is deduplicated at read time

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
- The dedup salt **must be stable and configured** (e.g. `devAiHub.telemetry.salt`); a
  random-per-process salt would break per-day dedup across restarts. The salt is required when
  telemetry is active.
- Popularity counts mean "distinct viewers per day + raw deliberate actions", not raw event fires.
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

## Amendment (2026-07-22, slice [2.3c] / #31)

`GET /telemetry/:ref` ships with **raw counts for all four actions**, including `view` —
the per-(hash, day)-distinct dedup for `view` described above is deferred to a follow-up issue,
not built in this slice. `actor_hash` is still captured on every write (store-all is unconditional
regardless of what the read side currently does with it), so the deferred issue can dedup the
existing history without needing a backfill. Until that issue lands, a resource's `view` count is
literally "how many view events were recorded," including render-loop repeats.
