import type {
  LoggerService,
  SchedulerService,
  UrlReaderService,
} from '@backstage/backend-plugin-api';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import type { AiAssetProvider } from '@internal/plugin-dev-ai-hub-node';
import { AssetParser } from './AssetParser';

interface Options {
  logger: LoggerService;
  store: AiAssetStore;
  scheduler: SchedulerService;
  urlReader: UrlReaderService;
  providers: ProviderConfig[];
  externalProviders: AiAssetProvider[];
}

export class AiAssetSyncService {
  constructor(private readonly options: Options) {}

  async start(): Promise<void> {
    const { scheduler, logger, providers, externalProviders } = this.options;

    if (providers.length === 0 && externalProviders.length === 0) {
      logger.warn(
        'dev-ai-hub: no providers configured under devAiHub.providers',
      );
      return;
    }

    for (const provider of providers) {
      const { frequency, timeout } = provider.schedule;
      const frequencyDuration = frequency.minutes
        ? { minutes: frequency.minutes }
        : { hours: frequency.hours ?? 1 };
      const timeoutDuration = timeout.minutes
        ? { minutes: timeout.minutes }
        : { hours: timeout.hours ?? 1 };

      await scheduler.scheduleTask({
        id: `dev-ai-hub-sync-${provider.id}`,
        frequency: frequencyDuration,
        timeout: timeoutDuration,
        initialDelay: { seconds: 15 },
        fn: async () => {
          await this.syncProvider(provider);
        },
      });

      logger.info(
        `dev-ai-hub: scheduled sync for provider "${provider.id}" every ${JSON.stringify(frequencyDuration)}`,
      );
    }

    for (const extProvider of externalProviders) {
      await scheduler.scheduleTask({
        id: `dev-ai-hub-sync-external-${extProvider.id}`,
        frequency: { minutes: 60 },
        timeout: { minutes: 5 },
        initialDelay: { seconds: 15 },
        fn: async () => {
          await this.syncExternalProvider(extProvider);
        },
      });

      logger.info(
        `dev-ai-hub: scheduled sync for external provider "${extProvider.id}"`,
      );
    }
  }

  async syncProvider(provider: ProviderConfig): Promise<void> {
    const { logger, urlReader, store } = this.options;

    logger.info(`dev-ai-hub: starting sync for provider "${provider.id}"`);

    await store.upsertSyncStatus({
      providerId: provider.id,
      status: 'syncing',
      assetCount: 0,
    });

    try {
      const treeUrl = buildTreeUrl(provider);
      const tree = await urlReader.readTree(treeUrl);
      const files = await tree.files();

      const fileMap = new Map<
        string,
        { content(): Promise<Buffer>; path: string }
      >();
      for (const file of files) {
        fileMap.set(normalizePath(file.path), file);
      }

      const syncedIds: string[] = [];

      for (const [filePath, file] of fileMap) {
        if (!filePath.endsWith('.yaml')) continue;
        if (!AssetParser.isAssetFile(filePath)) continue;

        const yamlContent = (await file.content()).toString('utf-8');
        const parsed = AssetParser.parseYaml(yamlContent, filePath);

        if (!parsed) {
          logger.warn(
            `dev-ai-hub: skipping invalid YAML at ${filePath} (provider ${provider.id})`,
          );
          continue;
        }

        if (
          provider.filters?.types &&
          !provider.filters.types.includes(parsed.meta.type)
        ) {
          continue;
        }
        if (provider.filters?.tools) {
          const hasMatchingTool = parsed.meta.tools.some(t =>
            provider.filters!.tools!.includes(t),
          );
          if (!hasMatchingTool) continue;
        }

        const mdFile = fileMap.get(normalizePath(parsed.mdPath));
        if (!mdFile) {
          logger.warn(
            `dev-ai-hub: .md not found for ${filePath} (expected ${parsed.mdPath}), skipping`,
          );
          continue;
        }

        const mdContent = (await mdFile.content()).toString('utf-8');
        const asset = AssetParser.buildAsset(
          parsed,
          mdContent,
          provider.id,
          provider.target,
          provider.branch,
          filePath,
        );

        await store.upsertAsset(asset);
        syncedIds.push(asset.id);
      }

      await store.deleteAssetsNotIn(provider.id, syncedIds);

      await store.upsertSyncStatus({
        providerId: provider.id,
        lastSync: new Date().toISOString(),
        status: 'idle',
        assetCount: syncedIds.length,
      });

      logger.info(
        `dev-ai-hub: sync complete for provider "${provider.id}" — ${syncedIds.length} assets`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.options.logger.error(
        `dev-ai-hub: sync failed for provider "${provider.id}": ${message}`,
      );
      await store.upsertSyncStatus({
        providerId: provider.id,
        status: 'error',
        error: message,
        assetCount: 0,
      });
    }
  }

  private async syncExternalProvider(provider: AiAssetProvider): Promise<void> {
    const { logger, store } = this.options;

    logger.info(`dev-ai-hub: syncing external provider "${provider.id}"`);

    await store.upsertSyncStatus({
      providerId: provider.id,
      status: 'syncing',
      assetCount: 0,
    });

    try {
      const assets = await provider.getAssets();
      const syncedIds: string[] = [];

      for (const assetData of assets) {
        const id = AssetParser.buildId(provider.id, assetData.yamlPath);
        await store.upsertAsset({ ...assetData, id });
        syncedIds.push(id);
      }

      await store.deleteAssetsNotIn(provider.id, syncedIds);

      await store.upsertSyncStatus({
        providerId: provider.id,
        lastSync: new Date().toISOString(),
        status: 'idle',
        assetCount: syncedIds.length,
      });

      logger.info(
        `dev-ai-hub: external sync complete for "${provider.id}" — ${syncedIds.length} assets`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        `dev-ai-hub: external sync failed for "${provider.id}": ${message}`,
      );
      await store.upsertSyncStatus({
        providerId: provider.id,
        status: 'error',
        error: message,
        assetCount: 0,
      });
    }
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\//, '');
}

function buildTreeUrl(provider: ProviderConfig): string {
  const base = provider.target.replace(/\.git$/, '');
  const { branch, type } = provider;

  switch (type) {
    case 'gitlab':
      return `${base}/-/tree/${branch}/`;
    case 'bitbucket':
      return `${base}/src/${branch}/`;
    case 'azure-devops':
      return `${base}?version=GB${branch}`;
    case 'github':
    case 'git':
    default:
      return `${base}/tree/${branch}/`;
  }
}
