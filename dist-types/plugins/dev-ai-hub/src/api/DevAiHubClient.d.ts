import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type { AiAsset, AiAssetListResponse, AiHubProvider, AiHubStats, AssetListFilter } from '@internal/plugin-dev-ai-hub-common';
export declare const devAiHubApiRef: import("@backstage/frontend-plugin-api").ApiRef<DevAiHubApi>;
export interface DevAiHubApi {
    listAssets(filter?: AssetListFilter): Promise<AiAssetListResponse>;
    getAsset(id: string): Promise<AiAsset>;
    getAssetRaw(id: string): Promise<string>;
    trackInstall(id: string): Promise<void>;
    listProviders(): Promise<AiHubProvider[]>;
    getProviderStatus(id: string): Promise<AiHubProvider>;
    triggerSync(id: string): Promise<void>;
    getStats(): Promise<AiHubStats>;
}
export declare class DevAiHubClient implements DevAiHubApi {
    private readonly discoveryApi;
    private readonly fetchApi;
    constructor(discoveryApi: DiscoveryApi, fetchApi: FetchApi);
    private baseUrl;
    private fetch;
    listAssets(filter?: AssetListFilter): Promise<AiAssetListResponse>;
    getAsset(id: string): Promise<AiAsset>;
    getAssetRaw(id: string): Promise<string>;
    trackInstall(id: string): Promise<void>;
    listProviders(): Promise<AiHubProvider[]>;
    getProviderStatus(id: string): Promise<AiHubProvider>;
    triggerSync(id: string): Promise<void>;
    getStats(): Promise<AiHubStats>;
}
