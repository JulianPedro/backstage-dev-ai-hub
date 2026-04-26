import type { AiAssetSummary } from '@julianpedro/plugin-dev-ai-hub-common';
interface AssetCardProps {
    asset: AiAssetSummary;
    onView: (id: string) => void;
    onInstall: (id: string) => void;
}
export declare function AssetCard({ asset, onView, onInstall }: AssetCardProps): import("react/jsx-runtime").JSX.Element;
export {};
