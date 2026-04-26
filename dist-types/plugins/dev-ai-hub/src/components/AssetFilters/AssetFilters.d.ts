import type { AssetType, AiTool, AiHubProvider } from '@julianpedro/plugin-dev-ai-hub-common';
export interface AssetFiltersValue {
    types: AssetType[];
    tools: AiTool[];
    search: string;
    tags: string[];
    providerId?: string;
}
interface AssetFiltersProps {
    value: AssetFiltersValue;
    onChange: (value: AssetFiltersValue) => void;
    availableTags?: string[];
    providers?: AiHubProvider[];
}
export declare function AssetFilters({ value, onChange, availableTags, providers }: AssetFiltersProps): import("react/jsx-runtime").JSX.Element;
export {};
