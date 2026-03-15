import type { AssetType, AiTool } from './types';
export interface InstallPathOverrides {
    /** Single path override — applies to all tools when installPaths has no entry for the tool */
    installPath?: string;
    /** Per-tool path overrides — highest priority */
    installPaths?: Record<string, string>;
}
/**
 * Returns the recommended install path for an asset in a given tool's workspace.
 * Resolution order: installPaths[tool] > installPath > built-in convention.
 */
export declare function getInstallPath(type: AssetType, tool: AiTool | string, name: string, overrides?: InstallPathOverrides): string;
/**
 * Returns install paths for all tools in the asset's tools list.
 * If tools contains 'all', returns paths for every known tool.
 */
export declare function getInstallPathsForAsset(type: AssetType, tools: (AiTool | string)[], name: string, overrides?: InstallPathOverrides): Record<string, string>;
