# AGENTS.md

A workspace for developing the **Dev AI Hub** [Backstage](https://backstage.io) plugins, published as NPM packages.
The deliverable is the three packages under `plugins/`; there is no app in this repo — the plugins' own `dev/` harnesses run them locally.
See [docs/CONTEXT.md](docs/CONTEXT.md) for vocabulary, [docs/architecture.md](docs/architecture.md) for the system view, and [docs/adr/](docs/adr/) for decisions.

## Branches

- `main-nos` is the primary branch — all work branches from and merges to it.
- `main` mirrors the upstream repository; never base work on it.
- Issues and PRs live on the `nosportugal` fork; slice issue labels (e.g. `[2.4]`) drive branch names and commit titles.

## Commands

```bash
yarn install --immutable

yarn start                # frontend + backend dev servers together
yarn start:frontend       # plugins/dev-ai-hub dev harness on :3000
yarn start:backend        # plugins/dev-ai-hub-backend dev harness on :7007

yarn build:all

yarn tsc                  # typecheck (also emits dist-types)

yarn test                          # all workspaces
yarn test:all                      # full suite with coverage
yarn test:e2e                      # Playwright (auto-starts the frontend dev server; see docs/testing/playwright/playwright.md)
yarn workspace <workspace> test    # single package
yarn test:mutation                 # Stryker mutation testing (backend + common; see docs/testing/mutation/mutation-testing.md)

yarn lint:all
yarn prettier:check
yarn lint:md
```

Local git hooks use [pre-commit](https://pre-commit.com) — one-time setup: `pip install pre-commit`, then `pre-commit install`.

## Architecture

Three packages under `plugins/`, published in lockstep under the `@nospt` scope:

- **`dev-ai-hub`** — frontend plugin (New Frontend System only; the legacy shim was removed in the 2.6 slice).
- **`dev-ai-hub-backend`** — backend plugin: routes, database migrations, catalog reads.
  It ships no ingestion path — no EntityProvider, no Git discovery, no scheduled sync (ADR-0004).
- **`dev-ai-hub-common`** — isomorphic contracts (`ResourceSummary`, schemas, install paths) shared by frontend and backend.

The catalog is the sole source of truth for `AiResource` entities (ADR-0001); the backend resolves bodies on demand and never stores a second copy.

### Standards

- Use the **Backstage New Frontend System** — `createFrontendPlugin`, `createExtension`, `coreExtensionData`.
- Use the **Backstage New Backend System** — `createBackendPlugin`, `coreServices`. Legacy `createRouter` is not used.
- Shared frontend/backend contracts live in `dev-ai-hub-common` — never duplicate a contract type in two packages and never import backend code into the frontend (or vice versa) directly.
- When authoring GitHub Actions workflows, verify and use the latest released version of each action, and pin third-party actions to a full-length commit SHA (with a trailing `# vX.Y.Z` comment for readability). First-party/verified actions (`actions/*`, `github/*`) may use a version tag.
- Never reference third-party GitHub Actions by mutable tag or branch without a SHA pin.

### Boundaries

- ⚠️ **Ask first:** Bumping `backstage.json`, changing `app-config*.yaml` structure, or adding/removing a database migration.
- 🚫 **Never:** Commit secrets or literal credentials in `app-config*.yaml` (integration credentials come from `.env` — see `.env.example`).
- 🚫 **Never:** Run git commit/push — the user handles all git operations.

## Documentation Standards

All non-root documentation lives in `docs/`.
ATX headers, one sentence per line, relative internal links.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on the `nosportugal` fork. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles map to label strings in GitHub. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: the glossary lives at `docs/CONTEXT.md` (not the repo root — see the note at its top) with decisions in `docs/adr/`. See `docs/agents/domain.md`.
