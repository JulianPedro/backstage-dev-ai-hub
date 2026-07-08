import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Catalog — sole source of truth for AiResource entities (ADR-0001)
backend.add(import('@backstage/plugin-catalog-backend'));
// Registers the AiResource kind (Backstage >= 1.51, alpha)
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));

// The plugin registers its own routes, database migrations, and sync scheduler
backend.add(import('../src'));

backend.start();
