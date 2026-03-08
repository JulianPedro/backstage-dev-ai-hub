import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { AssetType } from '@internal/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@internal/plugin-dev-ai-hub-common';

/**
 * Creates an McpServer instance connected directly to the AiAssetStore.
 * Assets are automatically filtered to only those that include `toolFilter`
 * in their `tools` array. Pass an empty string to return all assets.
 */
export function createMcpServer(store: AiAssetStore, toolFilter: string): McpServer {
  const server = new McpServer({
    name: 'dev-ai-hub',
    version: '0.1.0',
  });

  const toolParam = toolFilter.trim() || undefined;

  // ── search_assets ──────────────────────────────────────────────────────────

  server.tool(
    'search_assets',
    'Search AI assets in the Dev AI Hub catalog by text, type, and tags.',
    {
      query: z.string().optional().describe('Full-text search across name, description and content'),
      type: z
        .enum(['instruction', 'agent', 'skill', 'workflow'])
        .optional()
        .describe('Filter by asset type'),
      tags: z.array(z.string()).optional().describe('Filter by one or more tags'),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    },
    async ({ query, type, tags, page, pageSize }) => {
      const { items, totalCount } = await store.listAssets({
        search: query,
        type: type as AssetType | undefined,
        tool: toolParam,
        tags,
        page,
        pageSize,
      });

      const results = items.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        description: a.description,
        tools: a.tools,
        tags: a.tags,
        version: a.version,
        author: a.author,
      }));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ results, totalCount, page, pageSize }, null, 2),
          },
        ],
      };
    },
  );

  // ── get_asset ──────────────────────────────────────────────────────────────

  server.tool(
    'get_asset',
    'Get the full markdown content and metadata of a specific AI asset by ID or name.',
    {
      id: z.string().optional().describe('Exact asset ID'),
      name: z.string().optional().describe('Asset name — case-insensitive, partial match'),
    },
    async ({ id, name }) => {
      let asset = null;

      if (id) {
        asset = await store.getAsset(id);
      } else if (name) {
        const { items } = await store.listAssets({
          search: name,
          tool: toolParam,
          pageSize: 10,
        });
        asset =
          items.find(a => a.name.toLowerCase() === name.toLowerCase()) ??
          items[0] ??
          null;
      }

      if (!asset) {
        return {
          content: [{ type: 'text' as const, text: 'Asset not found.' }],
          isError: true,
        };
      }

      const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: asset.id,
                name: asset.name,
                type: asset.type,
                description: asset.description,
                tools: asset.tools,
                tags: asset.tags,
                version: asset.version,
                author: asset.author,
                applyTo: asset.applyTo,
                model: asset.model,
                metadata: asset.metadata,
                installPaths,
                content: asset.content,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── list_assets ────────────────────────────────────────────────────────────

  server.tool(
    'list_assets',
    'List all available AI assets, optionally filtered by type.',
    {
      type: z
        .enum(['instruction', 'agent', 'skill', 'workflow'])
        .optional()
        .describe('Filter by asset type'),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    },
    async ({ type, page, pageSize }) => {
      const { items, totalCount } = await store.listAssets({
        type: type as AssetType | undefined,
        tool: toolParam,
        page,
        pageSize,
      });

      const totalPages = Math.ceil(totalCount / pageSize);
      const lines: string[] = [
        `**${totalCount} asset(s)** — page ${page} of ${totalPages}`,
        '',
        ...items.map(
          a =>
            `- **${a.name}** \`[${a.type}]\` — ${a.description}\n  ID: \`${a.id}\` | Tags: ${a.tags.join(', ') || 'none'}`,
        ),
      ];

      return {
        content: [{ type: 'text' as const, text: lines.join('\n') }],
      };
    },
  );

  // ── install_asset ──────────────────────────────────────────────────────────
  //
  // The model already knows which tool it is (from the MCP session's tool filter).
  // This tool returns the pure markdown content + the correct install path for
  // each compatible tool so the model can write the file directly.

  server.tool(
    'install_asset',
    'Get the pure markdown content and recommended install paths for an asset. ' +
      'Use the install path matching your tool to create the file in the workspace.',
    {
      id: z.string().describe('Asset ID'),
    },
    async ({ id }) => {
      const asset = await store.getAsset(id);
      if (!asset) {
        return {
          content: [{ type: 'text' as const, text: `Asset not found: ${id}` }],
          isError: true,
        };
      }

      await store.incrementInstallCount(id);

      const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                id: asset.id,
                name: asset.name,
                type: asset.type,
                installPaths,
                content: asset.content,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
