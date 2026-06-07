import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { TranslationBlueprint } from '@backstage/plugin-app-react';
import HubIcon from '@mui/icons-material/Hub';
import { devAiHubApiRef, DevAiHubClient } from './api/DevAiHubClient';
import { devAiHubTranslationResource } from './translation';
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
    TranslationBlueprint.make({
      params: { resource: devAiHubTranslationResource },
    }),
    PageBlueprint.make({
      params: {
        path: '/dev-ai-hub',
        routeRef: rootRouteRef,
        title: 'AI Hub',
        icon: <HubIcon />,
        loader: () =>
          import('./components/DevAiHubPage').then(m => <m.DevAiHubPage />),
      },
    }),
  ],
});