/**
 * Legacy Backstage frontend system support.
 *
 * For New Frontend System (NFS) use `devAiHubPlugin` from `./plugin` instead.
 */
import type { ComponentType } from 'react';
import {
  createPlugin,
  createRoutableExtension,
  createRouteRef,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { devAiHubApiRef, DevAiHubClient } from './api/DevAiHubClient';

const rootRouteRef = createRouteRef({ id: 'dev-ai-hub' });

const devAiHubLegacyPlugin = createPlugin({
  id: 'dev-ai-hub',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: devAiHubApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new DevAiHubClient(discoveryApi, fetchApi),
    }),
  ],
});

/** Routable page extension for the legacy frontend system. */
export const DevAiHubPage: ComponentType = devAiHubLegacyPlugin.provide(
  createRoutableExtension({
    name: 'DevAiHubPage',
    component: () =>
      import('./components/DevAiHubPage').then(m => m.DevAiHubPage),
    mountPoint: rootRouteRef,
  }),
);
