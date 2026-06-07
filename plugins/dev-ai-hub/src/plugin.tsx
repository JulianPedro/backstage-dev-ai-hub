import {
  createFrontendPlugin,
  PageBlueprint,
  SubPageBlueprint,
  ApiBlueprint,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { TranslationBlueprint } from '@backstage/plugin-app-react';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExtensionIcon from '@mui/icons-material/Extension';
import GridViewIcon from '@mui/icons-material/GridView';
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
      },
    }),
    SubPageBlueprint.make({
      name: 'assets',
      params: {
        path: 'assets',
        title: 'Assets',
        icon: <GridViewIcon />,
        loader: () =>
          import('./components/AssetsTab').then(m => <m.AssetsTab />),
      },
    }),
    SubPageBlueprint.make({
      name: 'mcp',
      params: {
        path: 'mcp',
        title: 'MCP',
        icon: <ExtensionIcon />,
        loader: () =>
          import('./components/McpPage').then(m => <m.McpPage />),
      },
    }),
    SubPageBlueprint.make({
      name: 'admin',
      params: {
        path: 'admin',
        title: 'Admin',
        icon: <AdminPanelSettingsIcon />,
        loader: () =>
          import('./components/AdminPage').then(m => <m.AdminPage />),
      },
    }),
  ],
});