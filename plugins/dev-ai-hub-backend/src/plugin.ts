import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { TelemetryStore } from './database/TelemetryStore';
import { createRouter } from './router';

export const devAiHubPlugin = createBackendPlugin({
  pluginId: 'dev-ai-hub',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        database: coreServices.database,
        httpRouter: coreServices.httpRouter,
        urlReader: coreServices.urlReader,
        httpAuth: coreServices.httpAuth,
        catalog: catalogServiceRef,
      },
      async init({
        config,
        logger,
        database,
        httpRouter,
        urlReader,
        httpAuth,
        catalog,
      }) {
        const telemetryStore = await TelemetryStore.create({ database });
        // Optional on purpose (#56): unset means "generate and persist one",
        // not "fail". Requiring it here took the whole backend down on any
        // deployment that had not configured this plugin.
        const telemetrySalt = await telemetryStore.resolveSalt(
          config.getOptionalString('devAiHub.telemetry.salt'),
        );

        const router = createRouter({
          logger,
          telemetryStore,
          telemetrySalt,
          catalog,
          httpAuth,
          reader: urlReader,
        });

        httpRouter.use(router);
      },
    });
  },
});
