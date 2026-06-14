export type AssetType = 'instruction' | 'agent' | 'skill' | 'workflow' | 'prompt' | 'bundle';

export type AiTool = 'all' | 'github-copilot' | 'claude-code' | 'google-gemini' | 'cursor';

export interface BundleItem {
  ref: string;
  assetId?: string;
  name?: string;
  label?: string;
  type?: Exclude<AssetType, 'bundle'>;
  description?: string;
  tools?: AiTool[];
}

export interface McpCatalogEntry {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  type: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/** A single MCP server requirement declared in the asset envelope. */
export interface McpRequirement {
  id: string;
  /** Display name override — shown when the server is not in the MCP catalog. */
  name?: string;
  /** URL to a PNG icon for this MCP server. */
  icon?: string;
}

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
  /** Model identifier declared in the YAML envelope (e.g. "claude-opus-4-5"). Only set for agents. */
  model?: string;
  installCount: number;
  /** Number of items in a bundle (only set for type === 'bundle'). */
  itemCount?: number;
  /** Markdown usage guide defined in the YAML envelope. Present only when the author provided it. */
  helpText?: string;
  /** MCP servers required by this asset (only set for agent/skill types). */
  mcps?: McpRequirement[];
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
  /** Model identifier declared in the YAML envelope (e.g. "claude-opus-4-5"). Only set for agents. */
  model?: string;
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
  /** Markdown usage guide defined in the YAML envelope. Present only when the author provided it. */
  helpText?: string;
  /** MCP servers required by this asset (only set for agent/skill types). */
  mcps?: McpRequirement[];
  /**
   * Content of bundled resource files for skills (path → file content).
   * Only populated for assets of type `skill` that declare `resources` in the envelope.
   */
  resourcesContent?: Record<string, string>;
  /** Resolved bundle items — only populated for type === 'bundle'. */
  items?: BundleItem[];
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
  byType: Record<AssetType, number>;  // includes 'prompt' and 'bundle' keys
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