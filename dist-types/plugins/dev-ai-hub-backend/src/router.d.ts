import express from 'express';
import type { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import type { AiAssetStore } from './database/AiAssetStore';
import type { AiAssetSyncService } from './service/AiAssetSyncService';
import type { ProviderConfig } from './types';
interface RouterOptions {
    logger: LoggerService;
    store: AiAssetStore;
    syncService: AiAssetSyncService;
    providers: ProviderConfig[];
    catalog: CatalogService;
    httpAuth: HttpAuthService;
}
export declare function createRouter(options: RouterOptions): express.Router;
export {};
