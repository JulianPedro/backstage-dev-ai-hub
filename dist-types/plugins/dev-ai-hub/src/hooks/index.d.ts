import type { AiAsset, AiAssetListResponse, AiHubProvider, AiHubStats, AssetListFilter } from '@julianpedro/plugin-dev-ai-hub-common';
export declare function useAssets(filter: AssetListFilter): {
    result: AiAssetListResponse | null;
    loading: boolean;
    error: Error | null;
};
export declare function useAssetDetail(id: string | null): {
    asset: AiAsset | null;
    loading: boolean;
    error: Error | null;
};
export declare function useProviders(): {
    providers: AiHubProvider[];
    loading: boolean;
    error: Error | null;
    reload: () => void;
};
export declare function useStats(): {
    stats: AiHubStats | null;
    loading: boolean;
    error: Error | null;
};
export declare function useCopyToClipboard(): {
    copy: (text: string) => void;
    copied: boolean;
};
