import { createExtensionPoint } from '@backstage/backend-plugin-api';
import type { AiAsset } from '@julianpedro/plugin-dev-ai-hub-common';

export interface AiAssetProvider {
  /** Unique identifier for this provider instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Fetch all assets from this provider */
  getAssets(): Promise<Omit<AiAsset, 'id' | 'syncedAt' | 'createdAt' | 'updatedAt'>[]>;
}

export interface DevAiHubProviderExtensionPoint {
  addProvider(provider: AiAssetProvider): void;
}

export const devAiHubProviderExtensionPoint =
  createExtensionPoint<DevAiHubProviderExtensionPoint>({
    id: 'dev-ai-hub.providers',
  });
