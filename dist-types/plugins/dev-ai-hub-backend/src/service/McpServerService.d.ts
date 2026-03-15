import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
/**
 * Creates an McpServer instance connected to the AiAssetStore.
 *
 * @param store        - Asset store
 * @param toolFilter   - Captured from `?tool=` at session init; filters assets by tool compatibility
 * @param providerFilter - Captured from `?provider=` at session init; scopes assets to a single provider
 * @param providers    - Full provider config list (for `list_providers` and label resolution)
 */
export declare function createMcpServer(store: AiAssetStore, toolFilter: string, providerFilter: string, providers: ProviderConfig[]): McpServer;
