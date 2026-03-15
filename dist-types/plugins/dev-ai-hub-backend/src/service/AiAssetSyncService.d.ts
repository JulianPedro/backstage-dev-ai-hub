import type { LoggerService, SchedulerService, UrlReaderService } from '@backstage/backend-plugin-api';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import type { AiAssetProvider } from '@internal/plugin-dev-ai-hub-node';
interface Options {
    logger: LoggerService;
    store: AiAssetStore;
    scheduler: SchedulerService;
    urlReader: UrlReaderService;
    providers: ProviderConfig[];
    externalProviders: AiAssetProvider[];
}
export declare class AiAssetSyncService {
    private readonly options;
    constructor(options: Options);
    start(): Promise<void>;
    syncProvider(provider: ProviderConfig): Promise<void>;
    private syncExternalProvider;
}
export {};
