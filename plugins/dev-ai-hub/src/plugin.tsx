import {
  createFrontendPlugin,
  PageBlueprint,
  SubPageBlueprint,
  ApiBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { RiRobot3Fill } from '@remixicon/react';
import { devAiHubApiRef, DevAiHubClient } from './api/DevAiHubClient';
import {
  devAiHubResourceApiRef,
  DevAiHubResourceClient,
} from './api/DevAiHubResourceClient';
import { rootRouteRef } from './routes';

export const devAiHubPlugin = createFrontendPlugin({
  pluginId: 'dev-ai-hub',
  routes: {
    root: rootRouteRef,
  },
  extensions: [
    ApiBlueprint.make({
      params: defineParams =>
        defineParams(
          createApiFactory({
            api: devAiHubApiRef,
            deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
            factory: ({ discoveryApi, fetchApi }) =>
              new DevAiHubClient(discoveryApi, fetchApi),
          }),
        ),
    }),
    PageBlueprint.make({
      params: {
        path: '/dev-ai-hub',
        title: 'Dev AI Hub',
        icon: <RiRobot3Fill />,
        routeRef: rootRouteRef,
      },
    }),
    ApiBlueprint.make({
      name: 'resources',
      params: defineParams =>
        defineParams(
          createApiFactory({
            api: devAiHubResourceApiRef,
            deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
            factory: ({ discoveryApi, fetchApi }) =>
              new DevAiHubResourceClient(discoveryApi, fetchApi),
          }),
        ),
    }),
    SubPageBlueprint.make({
      name: 'browse',
      params: {
        path: 'browse',
        title: 'Browse',
        loader: () =>
          import('./components/DevAiHubPage').then(m => <m.DevAiHubPage />),
      },
    }),
    // v2 catalog-backed page; replaces `browse` when the legacy silo is
    // deleted (issue #34).
    SubPageBlueprint.make({
      name: 'resources',
      params: {
        path: 'resources',
        title: 'Resources',
        loader: () =>
          import('./components/AiResourcesPage').then(m => <m.AiResourcesPage />),
      },
    }),
  ],
});
