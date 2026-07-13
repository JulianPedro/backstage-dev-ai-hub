import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Catalog — sole source of truth for AiResource entities (ADR-0001)
backend.add(import('@backstage/plugin-catalog-backend'));
// Registers the AiResource kind (Backstage >= 1.51, alpha)
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));

// Guest auth — the v2 routes require real Backstage credentials (ADR-0005),
// so the dev harness mints proper guest tokens instead of the legacy
// tokenless guest identity.
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// The plugin registers its own routes, database migrations, and sync scheduler
backend.add(import('../src'));

backend.start();
