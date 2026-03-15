import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// The plugin registers its own routes, database migrations, and sync scheduler
backend.add(import('../src'));

backend.start();
