import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  ResourceListResponse,
  ResourceSummary,
} from '@nospt/plugin-dev-ai-hub-common';

/**
 * v2 API client: consumes the catalog-backed `/resources` endpoint and knows
 * only the flat `ResourceSummary` contract (architecture.md). Kept separate
 * from the legacy asset-model `DevAiHubClient`, which is deleted with the
 * legacy silo (issue #34).
 */
export const devAiHubResourceApiRef = createApiRef<DevAiHubResourceApi>({
  id: 'plugin.dev-ai-hub.resources',
});

export interface DevAiHubResourceApi {
  getResources(): Promise<ResourceSummary[]>;
}

export class DevAiHubResourceClient implements DevAiHubResourceApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async getResources(): Promise<ResourceSummary[]> {
    const base = await this.discoveryApi.getBaseUrl('dev-ai-hub');
    const response = await this.fetchApi.fetch(`${base}/resources`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Dev AI Hub API error ${response.status}: ${text}`);
    }
    const body = (await response.json()) as ResourceListResponse;
    return body.items;
  }
}
