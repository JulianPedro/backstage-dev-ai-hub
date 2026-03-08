import {
  createPlugin,
  createApiFactory,
  createRoutableExtension,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { devAiHubApiRef, DevAiHubClient } from './api/DevAiHubClient';
import { rootRouteRef } from './routes';

export const devAiHubPlugin = createPlugin({
  id: 'dev-ai-hub',
  apis: [
    createApiFactory({
      api: devAiHubApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DevAiHubClient(discoveryApi, fetchApi),
    }),
  ],
  routes: {
    root: rootRouteRef,
  },
});

export const DevAiHubPage = devAiHubPlugin.provide(
  createRoutableExtension({
    name: 'DevAiHubPage',
    component: () =>
      import('./components/DevAiHubPage').then(m => m.DevAiHubPage),
    mountPoint: rootRouteRef,
  }),
);
