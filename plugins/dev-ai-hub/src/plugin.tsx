import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
  NavItemBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import HubIcon from '@mui/icons-material/Hub';
import { devAiHubApiRef, DevAiHubClient } from './api/DevAiHubClient';
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
        routeRef: rootRouteRef,
        loader: () =>
          import('./components/DevAiHubPage').then(m => <m.DevAiHubPage />),
      },
    }),
    NavItemBlueprint.make({
      params: {
        title: 'AI Hub',
        routeRef: rootRouteRef,
        icon: HubIcon,
      },
    }),
  ],
});
