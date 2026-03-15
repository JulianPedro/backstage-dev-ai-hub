import { type DatabaseService } from '@backstage/backend-plugin-api';
import type { AiAsset, AiAssetSummary, AiHubStats, AssetListFilter } from '@internal/plugin-dev-ai-hub-common';
import type { AiAssetInput, SyncStatus } from '../types';
export declare class AiAssetStore {
    private readonly db;
    private constructor();
    static create(options: {
        database: DatabaseService;
    }): Promise<AiAssetStore>;
    upsertAsset(input: AiAssetInput): Promise<void>;
    listAssets(filter: AssetListFilter): Promise<{
        items: AiAssetSummary[];
        totalCount: number;
    }>;
    getAsset(id: string): Promise<AiAsset | null>;
    incrementInstallCount(id: string): Promise<void>;
    deleteAssetsNotIn(providerId: string, ids: string[]): Promise<void>;
    upsertSyncStatus(status: SyncStatus): Promise<void>;
    getSyncStatus(providerId: string): Promise<SyncStatus | null>;
    getAllSyncStatuses(): Promise<SyncStatus[]>;
    getStats(): Promise<AiHubStats>;
    private rowToAssetSummary;
    private rowToAsset;
}
