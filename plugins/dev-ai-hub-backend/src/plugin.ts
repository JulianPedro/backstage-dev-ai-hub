import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { AiAssetStore } from './database/AiAssetStore';
import { AiAssetSyncService } from './service/AiAssetSyncService';
import { createRouter } from './router';

export const devAiHubPlugin = createBackendPlugin({
  pluginId: 'dev-ai-hub',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        database: coreServices.database,
        scheduler: coreServices.scheduler,
        httpRouter: coreServices.httpRouter,
        urlReader: coreServices.urlReader,
      },
      async init({ config, logger, database, scheduler, httpRouter, urlReader }) {
        const store = await AiAssetStore.create({ database });

        const syncService = new AiAssetSyncService({
          config,
          logger,
          store,
          scheduler,
          urlReader,
        });

        // Read providers from config once so both router and syncService share them
        const providers = (config.getOptionalConfigArray('devAiHub.providers') ?? []).map(
          p => ({
            id: p.getString('id'),
            type: p.getString('type') as 'github' | 'bitbucket' | 'azure-devops' | 'gitlab' | 'git',
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
          }),
        );

        await syncService.start();

        const router = createRouter({
          logger,
          store,
          config,
          syncService,
          providers,
        });

        httpRouter.use(router);

        // Allow unauthenticated access from the frontend proxy
        httpRouter.addAuthPolicy({
          path: '/assets',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/providers',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/stats',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/mcp',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
