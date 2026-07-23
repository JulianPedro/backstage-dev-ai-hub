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

## Amendment (2026-07-22, slice [2.3c] / #31)

`GET /telemetry/:ref` ships with **raw counts for all four actions**, including `view` —
the per-(hash, day)-distinct dedup for `view` described above is deferred to a follow-up issue,
not built in this slice. `actor_hash` is still captured on every write (store-all is unconditional
regardless of what the read side currently does with it), so the deferred issue can dedup the
existing history without needing a backfill. Until that issue lands, a resource's `view` count is
literally "how many view events were recorded," including render-loop repeats.
