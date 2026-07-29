# Contributing

This workspace develops the four **Dev AI Hub** Backstage plugins published under the `@nospt` scope.
There is no Backstage app in this repository — each plugin's own `dev/` harness runs it locally.

Read [AGENTS.md](../AGENTS.md) first.
It is the working agreement for this repository and it applies to humans as much as to agents.

## Setup

You need Node 24 and Yarn 4.13.0 (via Corepack).

```bash
corepack enable
yarn install --immutable
```

Install the git hooks once — [pre-commit](https://pre-commit.com) runs the same checks CI does, and catching them locally is much cheaper than a red PR:

```bash
pip install pre-commit
pre-commit install
```

Copy `.env.example` to `.env` and fill in your integration credentials.
Credentials come from `.env` and never from `app-config*.yaml`.

## Running it

```bash
yarn start              # frontend and backend dev harnesses together
yarn start:frontend     # plugins/dev-ai-hub on :3000
yarn start:backend      # plugins/dev-ai-hub-backend on :7007
```

The frontend harness runs the plugin as a real Backstage app with the catalog visible ([ADR-0012](../docs/adr/0012-dev-harness-runs-the-plugin-as-shipped.md)), so what you see locally is what ships.
`examples/catalog/` holds `AiResource` entities you can register as-is.

## Branches and issues

`main-nos` is the primary branch — branch from it and merge back to it.
`main` mirrors the upstream repository; never base work on it.

Issues and pull requests live on the [`nosportugal` fork](https://github.com/nosportugal/backstage-plugin-dev-ai-hub/issues), not upstream.
Slice issues carry a `[2.x]` label that drives both the branch name and the commit title — an issue labelled `[2.4]` becomes branch `2.4-short-description` with commits titled `[2.4] What changed`.

## Before you open a pull request

```bash
yarn lint:all
yarn tsc
yarn test
yarn build:all
```

CI runs all of the above plus `prettier --check`, markdownlint, yamllint, and Playwright end-to-end tests.
The pre-commit hook covers the formatting and lint gates on your changed files.

Pull requests get a sticky comment with test results and coverage, and inline suggestions for anything the formatters would rewrite.
Draft pull requests skip the end-to-end run until you mark them ready for review.

## Standards

- **New Frontend System** — `createFrontendPlugin`, `createExtension`, `coreExtensionData`.
- **New Backend System** — `createBackendPlugin`, `coreServices`. The legacy `createRouter` pattern is not used.
- Shared contracts live in `dev-ai-hub-common`.
  Never duplicate a contract type across packages, and never import backend code from the frontend or the reverse.
- Pin third-party GitHub Actions to a full-length commit SHA with a trailing `# vX.Y.Z` comment.
  First-party `actions/*` and `github/*` may use a version tag.

## Ask before you

- Bump `backstage.json`.
- Change the structure of any `app-config*.yaml`.
- Add or remove a database migration.

That last one is not a formality.
Migrations `001`–`006` were deleted from this repository while still present in a published release, which breaks startup for anyone upgrading from it — knex validates that every applied migration is still on disk.
Removing a migration is almost never the right move; superseding it with a new one usually is.

## Documentation

All non-root documentation lives in `docs/`.
Use ATX headers, one sentence per line, and relative internal links.

Decisions go in `docs/adr/` as a new numbered record.
Do not rewrite an existing ADR's decision — if reality diverges from it, add a note saying so and record the new decision, so the history of *why* stays readable.
Vocabulary lives in [docs/CONTEXT.md](../docs/CONTEXT.md).

## Releases

Publishing is triggered by pushing a tag, which runs `.github/workflows/cd.yaml` and pushes all four packages to npm.
This is irreversible, so make sure the commit you are tagging is green on CI first.
