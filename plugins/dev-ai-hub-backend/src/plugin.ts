import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  devAiHubProviderExtensionPoint,
  type AiAssetProvider,
} from '@julianpedro/plugin-dev-ai-hub-node';
import { AiAssetStore } from './database/AiAssetStore';
import { AiAssetSyncService } from './service/AiAssetSyncService';
import { createRouter } from './router';
import type { ProviderConfig } from './types';

export const devAiHubPlugin = createBackendPlugin({
  pluginId: 'dev-ai-hub',
  register(env) {
    const externalProviders: AiAssetProvider[] = [];

    env.registerExtensionPoint(devAiHubProviderExtensionPoint, {
      addProvider(provider) {
        externalProviders.push(provider);
      },
    });

    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        database: coreServices.database,
        scheduler: coreServices.scheduler,
        httpRouter: coreServices.httpRouter,
        urlReader: coreServices.urlReader,
        discovery: coreServices.discovery,
      },
      async init({ config, logger, database, scheduler, httpRouter, urlReader, discovery }) {
        const store = await AiAssetStore.create({ database });

        const providers: ProviderConfig[] = (
          config.getOptionalConfigArray('devAiHub.providers') ?? []
        ).map(p => ({
          id: p.getString('id'),
          type: p.getString('type') as ProviderConfig['type'],
          target: p.getString('target'),
          branch: p.getOptionalString('branch') ?? 'main',
          schedule: {
            frequency: {
              minutes: p.getOptionalNumber('schedule.frequency.minutes'),
              hours: p.getOptionalNumber('schedule.frequency.hours'),
            },
            timeout: {
              minutes: p.getOptionalNumber('schedule.timeout.minutes'),
              hours: p.getOptionalNumber('schedule.timeout.hours'),
            },
          },
          filters: p.has('filters')
            ? {
                tools: p.getOptionalStringArray('filters.tools'),
                types: p.getOptionalStringArray('filters.types'),
              }
            : undefined,
        }));

        const syncService = new AiAssetSyncService({
          logger,
          store,
          scheduler,
          urlReader,
          providers,
          externalProviders,
        });

        await syncService.start();

        const baseUrl = await discovery.getBaseUrl('dev-ai-hub');
        const router = createRouter({ logger, store, syncService, providers, baseUrl });

        httpRouter.use(router);

        httpRouter.addAuthPolicy({ path: '/assets', allow: 'unauthenticated' });
        httpRouter.addAuthPolicy({ path: '/providers', allow: 'unauthenticated' });
        httpRouter.addAuthPolicy({ path: '/stats', allow: 'unauthenticated' });
        httpRouter.addAuthPolicy({ path: '/mcp', allow: 'unauthenticated' });
      },
    });
  },
});
