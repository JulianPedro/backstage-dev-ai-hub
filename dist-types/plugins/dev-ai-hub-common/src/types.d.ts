export type AssetType = 'instruction' | 'agent' | 'skill' | 'workflow';
export type AiTool = 'all' | 'github-copilot' | 'claude-code' | 'google-gemini' | 'cursor';
/** Lightweight summary returned by list endpoints — no markdown content. */
export interface AiAssetSummary {
    id: string;
    providerId: string;
    name: string;
    /** Human-readable display name. Falls back to `name` when not set. */
    label?: string;
    description: string;
    type: AssetType;
    tools: AiTool[];
    tags: string[];
    author: string;
    icon?: string;
    version: string;
    installCount: number;
    syncedAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface AiAsset {
    id: string;
    providerId: string;
    name: string;
    /** Human-readable display name. Falls back to `name` when not set. */
    label?: string;
    description: string;
    type: AssetType;
    tools: AiTool[];
    tags: string[];
    author: string;
    icon?: string;
    version: string;
    /** Override the install path for all tools */
    installPath?: string;
    /** Override the install path per tool */
    installPaths?: Record<string, string>;
    /** Pure markdown content from the .md file, never modified */
    content: string;
    /** Raw YAML of the metadata file */
    yamlRaw: string;
    /** Extra metadata stored from the envelope (e.g. resources for skills) */
    metadata?: Record<string, unknown>;
    /**
     * Content of bundled resource files for skills (path → file content).
     * Only populated for assets of type `skill` that declare `resources` in the envelope.
     */
    resourcesContent?: Record<string, string>;
    /** Path of the .yaml file in the repository */
    yamlPath: string;
    /** Path of the .md file in the repository */
    mdPath: string;
    repoUrl: string;
    branch: string;
    commitSha?: string;
    installCount: number;
    syncedAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface AiAssetListResponse {
    items: AiAssetSummary[];
    totalCount: number;
    page: number;
    pageSize: number;
}
export interface AiHubProvider {
    id: string;
    type: 'github' | 'bitbucket' | 'azure-devops' | 'gitlab' | 'git';
    target: string;
    branch: string;
    lastSync?: string;
    lastCommit?: string;
    status: 'idle' | 'syncing' | 'error';
    error?: string;
    assetCount: number;
}
export interface AiHubStats {
    totalAssets: number;
    byType: Record<AssetType, number>;
    byTool: Record<string, number>;
    byProvider: Record<string, number>;
    lastSync?: string;
}
export interface AssetListFilter {
    type?: AssetType;
    tool?: string;
    tags?: string[];
    search?: string;
    providerId?: string;
    page?: number;
    pageSize?: number;
}
