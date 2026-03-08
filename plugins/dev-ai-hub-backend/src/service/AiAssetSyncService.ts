import type {
  RootConfigService,
  LoggerService,
  SchedulerService,
  UrlReaderService,
} from '@backstage/backend-plugin-api';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import { AssetParser } from './AssetParser';

interface Options {
  config: RootConfigService;
  logger: LoggerService;
  store: AiAssetStore;
  scheduler: SchedulerService;
  urlReader: UrlReaderService;
}

export class AiAssetSyncService {
  private readonly providers: ProviderConfig[];

  constructor(private readonly options: Options) {
    this.providers = AiAssetSyncService.readProviders(options.config);
  }

  async start(): Promise<void> {
    const { scheduler, logger } = this.options;

    if (this.providers.length === 0) {
      logger.warn(
        'dev-ai-hub: no providers configured under devAiHub.providers',
      );
      return;
    }

    for (const provider of this.providers) {
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

      // Build lookup map: normalized path → file
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

  private static readProviders(config: RootConfigService): ProviderConfig[] {
    const providersConfig = config.getOptionalConfigArray('devAiHub.providers');
    if (!providersConfig) return [];

    return providersConfig.map(p => ({
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
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Build the tree URL for Backstage's UrlReaderService.
 * Format varies by provider type — UrlReader uses the integration config
 * (integrations.gitlab, integrations.github, etc.) to resolve auth automatically.
 */
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
