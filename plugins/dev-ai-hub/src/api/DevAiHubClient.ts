import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  AiAsset,
  AiAssetListResponse,
  AiHubProvider,
  AiHubStats,
  AssetListFilter,
} from '@internal/plugin-dev-ai-hub-common';

export const devAiHubApiRef = createApiRef<DevAiHubApi>({
  id: 'plugin.dev-ai-hub.service',
});

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

export class DevAiHubClient implements DevAiHubApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  private async baseUrl(): Promise<string> {
    return this.discoveryApi.getBaseUrl('dev-ai-hub');
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const base = await this.baseUrl();
    const response = await this.fetchApi.fetch(`${base}${path}`, init);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Dev AI Hub API error ${response.status}: ${text}`,
      );
    }
    return response.json() as Promise<T>;
  }

  async listAssets(filter?: AssetListFilter): Promise<AiAssetListResponse> {
    const params = new URLSearchParams();
    if (filter?.type) params.set('type', filter.type);
    if (filter?.tool) params.set('tool', filter.tool);
    if (filter?.search) params.set('search', filter.search);
    if (filter?.providerId) params.set('provider', filter.providerId);
    if (filter?.tags?.length) params.set('tags', filter.tags.join(','));
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.pageSize) params.set('pageSize', String(filter.pageSize));

    const qs = params.toString();
    return this.fetch<AiAssetListResponse>(`/assets${qs ? `?${qs}` : ''}`);
  }

  async getAsset(id: string): Promise<AiAsset> {
    return this.fetch<AiAsset>(`/assets/${encodeURIComponent(id)}`);
  }

  async getAssetRaw(id: string): Promise<string> {
    const base = await this.baseUrl();
    const response = await this.fetchApi.fetch(
      `${base}/assets/${encodeURIComponent(id)}/raw`,
    );
    if (!response.ok) throw new Error(`Failed to fetch raw asset: ${response.status}`);
    return response.text();
  }

  async trackInstall(id: string): Promise<void> {
    await this.fetch(`/assets/${encodeURIComponent(id)}/track-install`, {
      method: 'POST',
    });
  }

  async listProviders(): Promise<AiHubProvider[]> {
    return this.fetch<AiHubProvider[]>('/providers');
  }

  async getProviderStatus(id: string): Promise<AiHubProvider> {
    return this.fetch<AiHubProvider>(
      `/providers/${encodeURIComponent(id)}/status`,
    );
  }

  async triggerSync(id: string): Promise<void> {
    await this.fetch(`/providers/${encodeURIComponent(id)}/sync`, {
      method: 'POST',
    });
  }

  async getStats(): Promise<AiHubStats> {
    return this.fetch<AiHubStats>('/stats');
  }
}
