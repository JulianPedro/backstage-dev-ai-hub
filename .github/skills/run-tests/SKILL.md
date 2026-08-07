---
name: run-tests
description: "Run tests in this repository. Use when: running tests, executing test suite, checking test results, running a specific test file, debugging failing tests, running tests for a plugin."
argument-hint: "Optional: plugin name (e.g. dev-ai-hub-backend) or test file path"
---

# Run Tests

This repository uses Jest via `backstage-cli package test` for all plugins.

## Commands

### Run all tests (all plugins in parallel)

```sh
yarn test
```

### Run tests for a specific plugin

```sh
yarn workspace @nospt/plugin-dev-ai-hub test
yarn workspace @nospt/plugin-dev-ai-hub-backend test
yarn workspace @nospt/plugin-dev-ai-hub-common test
```

### Run a specific test file

```sh
yarn workspace @nospt/plugin-dev-ai-hub-backend backstage-cli package test --testPathPattern=AssetParser
yarn workspace @nospt/plugin-dev-ai-hub-backend backstage-cli package test --testPathPattern=router.smoke
```

### Run in watch mode

```sh
yarn workspace @nospt/plugin-dev-ai-hub-backend backstage-cli package test --watch
```

## Test Files

- `plugins/dev-ai-hub-backend/src/router.smoke.test.ts` — HTTP smoke tests for all Express routes; verifies path-to-regexp route matching (`:id` params, status codes, headers). Uses `supertest` with mocked `AiAssetStore`, `AiAssetSyncService`, and `LoggerService`. Run these after any dependency bump to `path-to-regexp` or `express`.
- `plugins/dev-ai-hub-backend/src/service/AssetParser.test.ts`
- `plugins/dev-ai-hub-backend/src/database/AiAssetStore.test.ts`
- `plugins/dev-ai-hub-common/src/installPaths.test.ts`

## Procedure

1. Only run tests for the relevant plugin if possible and if it exists.
2. Run the terminal command from the workspace root (`/Users/ricardocalcado/dev/backstage-plugin-dev-ai-hub`).
3. Inspect output for failures — Jest prints `FAIL`, file path, and diff.
4. If a test fails, read the relevant test file and source file.
5. Fix the source code (or test if it's incorrect), then re-run.
6. Confirm all tests pass before finishing.
