import type { AiAsset, AssetListFilter } from '@julianpedro/plugin-dev-ai-hub-common';
export interface ProviderConfig {
    id: string;
    type: 'github' | 'bitbucket' | 'azure-devops' | 'gitlab' | 'git';
    target: string;
    branch: string;
    schedule: {
        frequency: {
            minutes?: number;
            hours?: number;
        };
        timeout: {
            minutes?: number;
            hours?: number;
        };
    };
    filters?: {
        tools?: string[];
        types?: string[];
    };
}
export interface AiAssetInput extends Omit<AiAsset, 'id' | 'syncedAt' | 'createdAt' | 'updatedAt' | 'installCount'> {
    id: string;
}
export interface SyncStatus {
    providerId: string;
    lastSync?: string;
    lastCommit?: string;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
    assetCount: number;
}
export { AssetListFilter };
