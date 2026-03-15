import express from 'express';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { AiAssetStore } from './database/AiAssetStore';
import type { AiAssetSyncService } from './service/AiAssetSyncService';
import type { ProviderConfig } from './types';
interface RouterOptions {
    logger: LoggerService;
    store: AiAssetStore;
    syncService: AiAssetSyncService;
    providers: ProviderConfig[];
}
export declare function createRouter(options: RouterOptions): express.Router;
export {};
