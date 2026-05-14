import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type { AiAsset, AiAssetListResponse, AiHubProvider, AiHubStats, AssetListFilter, McpCatalogEntry } from '@julianpedro/plugin-dev-ai-hub-common';
export declare const devAiHubApiRef: import("@backstage/frontend-plugin-api").ApiRef<DevAiHubApi>;
export interface DevAiHubApi {
    listAssets(filter?: AssetListFilter): Promise<AiAssetListResponse>;
    getAsset(id: string): Promise<AiAsset>;
    getAssetRaw(id: string): Promise<string>;
    /** Returns the absolute URL for the download endpoint (zip for skills/bundles, md for others). */
    getDownloadUrl(id: string, tool?: string): Promise<string>;
    /** Returns the absolute URL for the .agent.md endpoint used in VSCode deep links. */
    getAgentMdUrl(id: string): Promise<string>;
    trackInstall(id: string): Promise<void>;
    listProviders(): Promise<AiHubProvider[]>;
    getProviderStatus(id: string): Promise<AiHubProvider>;
    triggerSync(id: string): Promise<void>;
    getStats(): Promise<AiHubStats>;
    getMcpCatalog(): Promise<McpCatalogEntry[]>;
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
    getDownloadUrl(id: string, tool?: string): Promise<string>;
    getAgentMdUrl(id: string): Promise<string>;
    trackInstall(id: string): Promise<void>;
    listProviders(): Promise<AiHubProvider[]>;
    getProviderStatus(id: string): Promise<AiHubProvider>;
    triggerSync(id: string): Promise<void>;
    getStats(): Promise<AiHubStats>;
    getMcpCatalog(): Promise<McpCatalogEntry[]>;
}
