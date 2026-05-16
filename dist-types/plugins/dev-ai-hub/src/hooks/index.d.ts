import type { AssetListFilter } from '@julianpedro/plugin-dev-ai-hub-common';
export declare function useAssets(filter: AssetListFilter): {
    result: any;
    loading: boolean;
    error: Error | null;
};
export declare function useAssetDetail(id: string | null): {
    asset: any;
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
    stats: any;
    loading: boolean;
    error: Error | null;
};
export declare function useMcpCatalog(): {
    catalog: McpCatalogEntry[];
    loading: boolean;
    error: Error | null;
};
export declare function useCopyToClipboard(): {
    copy: (text: string) => void;
    copied: boolean;
};
