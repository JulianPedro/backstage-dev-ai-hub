# Mutation Testing

Line/branch coverage proves code *ran* during a test, not that the test would notice if the code were wrong.
Mutation testing closes that gap: [Stryker Mutator](https://stryker-mutator.io/) rewrites the source in small, deliberate ways (a `?? []` becomes `?? ["Stryker was here"]`, a `===` becomes `==`, a string literal becomes `""`) and reruns the test suite against each mutant.
A mutant that makes no test fail is a **survivor** — a sign the suite wouldn't catch that class of bug in production either.

## Scope

Mutation testing runs only against `dev-ai-hub-backend` and `dev-ai-hub-common`, and only against the files with real logic in them:

- `dev-ai-hub-backend`: `database/TelemetryStore.ts`, `service/*.ts`, `router.ts`.
- `dev-ai-hub-common`: `resources.ts`, `telemetry.ts`.

Wiring/DI files (`plugin.ts`, `index.ts` barrels) and the frontend package are excluded.
Frontend component tests are mostly render/interaction assertions where mutation testing yields low signal for the cost; see [ADR-index](adr/) for how other quality tooling was scoped in this repo.

## Running locally

```bash
yarn test:mutation:backend   # ~5-10 min
yarn test:mutation:common    # ~10-15 min (resources.ts is the biggest file in the repo)
yarn test:mutation           # both, sequentially
```

Each run opens an interactive HTML report at `reports/mutation/<package>/mutation.html` (gitignored) showing every survivor with its diff.

## How it's wired

Both `stryker.backend.config.json` and `stryker.common.config.json` live at the repo root, not inside the plugin packages.
Stryker's sandbox model copies the working tree it's run from into a temp directory per run; running it from inside a single workspace package would strand it without the hoisted root `node_modules` and the yarn workspace context.
Running from the root and pointing `mutate` at `plugins/<pkg>/src/**` keeps the sandbox whole while still scoping the mutation set.

The test runner is Stryker's built-in `command` runner (`commandRunner.command: "yarn workspace <pkg> run test"`) rather than the dedicated `@stryker-mutator/jest-runner` plugin.
`backstage-cli package test` resolves its Jest config dynamically (role-based transforms, a custom caching module loader for frontend/common-library roles) via an async config export — reusing that safely inside Stryker's in-process jest-runner would mean re-deriving or fighting that logic.
Shelling out to the exact same `yarn test` command CI already runs sidesteps all of it, at the cost of re-running the package's *entire* test suite per mutant instead of just the relevant test file (`coverageAnalysis` must be `"off"` for the command runner — there's no per-test granularity).
That's fine at the current suite size; if either package's test suite grows enough to make this slow, revisit with the jest-runner plugin.

The `typescript` checker (`@stryker-mutator/typescript-checker`) runs before each mutant executes and discards mutants that don't type-check.
A meaningful fraction of generated mutants (~25-30% on `router.ts`) fall in this bucket — e.g. mutating `catch (error) { ...; res.status(500)... }` to `catch (error) {}` breaks a function's declared return type.
These show up as `CompileError` in the report; they are not a sign of test-suite weakness or CI flakiness, and are excluded from the mutation score.

`timeoutMS`/`timeoutFactor` are set higher than Stryker's defaults, and `concurrency` is capped at 2.
Each "mutant" here reruns a whole Jest process (DB setup, SWC transform, etc.), which has more run-to-run variance than a single assertion; the defaults produced false timeouts under concurrent load before these were tuned.

## Reading the score

Mutation score = `(killed + timeout) / (killed + timeout + survived + noCoverage) × 100`.
`CompileError`, `RuntimeError`, and `Ignored` mutants are excluded from both sides of that ratio — they were never a real test of the suite.

## When it runs

Two CI workflows cover different moments, both informational — neither has `thresholds.break` set, so neither can fail a build:

- **`mutation-testing.yml`** — the full sweep (every mutant in the mutate scope), on a weekly schedule and via manual dispatch. Posts a per-package score summary to the job step summary and uploads the full HTML report as the `mutation-report` artifact. This is the baseline signal; it doesn't run on PRs because it takes 5-15 minutes per package (see above).
  A step at the end checks each package's score against its `thresholds.low` (read straight from `stryker.*.config.json`, so the number can't drift between the run and the alert). Only when a package is below that line — or its Stryker run itself failed to produce a report — does the workflow open or update a single tracking issue titled "🧬 Mutation testing below threshold" (label `mutation-testing`). It stays quiet on healthy weeks, and closes the issue with a comment once every package recovers. This is the only mechanism that actively notifies anyone; the score summary/artifact above are pull, not push.
- **`mutation-testing-pr.yml`** — a fast, PR-scoped run. It diffs the PR against its base ref, intersects the changed files with each package's mutate scope (`git diff ... -- <same paths as stryker.*.config.json's "mutate">`), and passes only those files to `stryker run --mutate <fileList>`. A typical PR touching a few functions finishes in well under a minute instead of several. Results post as a sticky PR comment, including the diff for every survived/timed-out mutant.

Stryker has no built-in "only test what changed since a git ref" flag (`--since` isn't real, despite how often it comes up when discussing this) — `--incremental` is the closest built-in feature, but it works by caching per-mutant results across runs (keyed by file hash) rather than diffing against a ref, and needs that cache file persisted between CI runs. Computing the changed-file list ourselves via `git diff` and passing it to `--mutate` gets the same practical effect (small, fast runs on a PR) without that extra caching infrastructure. Worth revisiting if the change-diff approach ever proves too limited.

## Known limitation: cross-package coverage

`dev-ai-hub-common/src/telemetry.ts` defines the zod schemas used to validate telemetry events, but it has no dedicated unit test in the `common` package — validation is exercised by the backend's router tests instead.
Because mutation testing here is scoped per-package, mutants in `telemetry.ts` can show as survived even though the schema is indirectly exercised by backend integration tests.
Treat a `common`-package survivor as a prompt to check whether backend tests cover it before assuming it's an uncovered gap.
