import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import type { AssetType } from '@internal/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@internal/plugin-dev-ai-hub-common';

/** Derives a human-readable label from a Git target URL. */
function providerLabel(target: string): string {
  return target.split('/').pop()?.replace(/\.git$/, '') ?? target;
}

/**
 * Creates an McpServer instance connected to the AiAssetStore.
 *
 * @param store        - Asset store
 * @param toolFilter   - Captured from `?tool=` at session init; filters assets by tool compatibility
 * @param providerFilter - Captured from `?provider=` at session init; scopes assets to a single provider
 * @param providers    - Full provider config list (for `list_providers` and label resolution)
 */
export function createMcpServer(
  store: AiAssetStore,
  toolFilter: string,
  providerFilter: string,
  providers: ProviderConfig[],
): McpServer {
  const server = new McpServer({ name: 'dev-ai-hub', version: '0.1.0' });

  const toolParam     = toolFilter.trim()     || undefined;
  const providerParam = providerFilter.trim() || undefined;

  /** Base filter applied to every list query in this session. */
  const sessionFilter = { tool: toolParam, providerId: providerParam };

  const resolveProviderLabel = (id: string) =>
    providerLabel(providers.find(p => p.id === id)?.target ?? id);

  // ── MCP Prompt: check_for_assets ─────────────────────────────────────────
  //
  // Teaches the model to proactively check the hub when it detects project
  // context. Supported by Claude Code (/mcp), and other MCP-compatible tools.

  server.prompt(
    'check_for_assets',
    'Check Dev AI Hub for relevant instructions, agents, or skills before starting work on a project.',
    {
      context: z.string().describe(
        'Describe what you are about to work on (e.g. "Python FastAPI REST API", "React TypeScript frontend")',
      ),
    },
    ({ context }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I'm about to work on: ${context}`,
              '',
              'Before starting, call suggest_assets with this context to find relevant assets from Dev AI Hub.',
              'If you find relevant instructions, agents, or skills, briefly describe each and offer to install them.',
              'When the user confirms, call install_asset and write the file to the recommended_path for your tool.',
              'After installing, check related_assets in the response and offer those too.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  // ── suggest_assets ────────────────────────────────────────────────────────

  server.tool(
    'suggest_assets',
    [
      'Proactively suggests relevant assets based on project context (language, framework, task).',
      'Use this at the start of a session or when the user describes what they are building.',
      'Prefer this over search_assets for proactive recommendations.',
    ].join(' '),
    {
      context: z.string().describe(
        'Describe the project or task (e.g. "Python FastAPI REST API", "React TypeScript frontend with testing")',
      ),
      limit: z.number().int().positive().max(10).default(5),
    },
    async ({ context, limit }) => {
      const { items } = await store.listAssets({
        ...sessionFilter,
        search: context,
        pageSize: limit,
        page: 1,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            context,
            suggestions: items.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              description: a.description,
              tags: a.tags,
              installCount: a.installCount,
              provider: { id: a.providerId, label: resolveProviderLabel(a.providerId) },
              install_hint: `install_asset(name: "${a.name}")`,
            })),
          }, null, 2),
        }],
      };
    },
  );

  // ── search_assets ─────────────────────────────────────────────────────────

  server.tool(
    'search_assets',
    [
      'Search AI assets by text query, type, and tags.',
      'Use when the user explicitly asks to find or browse assets.',
      'Follow up with get_asset to preview content, or install_asset to install directly.',
    ].join(' '),
    {
      query:    z.string().optional().describe('Full-text search across name, description and content'),
      type:     z.enum(['instruction', 'agent', 'skill', 'workflow']).optional().describe('Filter by asset type'),
      tags:     z.array(z.string()).optional().describe('Filter by one or more tags'),
      page:     z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    },
    async ({ query, type, tags, page, pageSize }) => {
      const { items, totalCount } = await store.listAssets({
        ...sessionFilter,
        search: query,
        type: type as AssetType | undefined,
        tags,
        page,
        pageSize,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount,
            page,
            pageSize,
            results: items.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              description: a.description,
              tools: a.tools,
              tags: a.tags,
              version: a.version,
              author: a.author,
              installCount: a.installCount,
              provider: { id: a.providerId, label: resolveProviderLabel(a.providerId) },
            })),
          }, null, 2),
        }],
      };
    },
  );

  // ── list_assets ───────────────────────────────────────────────────────────

  server.tool(
    'list_assets',
    [
      'List all available AI assets, optionally filtered by type.',
      'Use for browsing or when the user asks what assets are available.',
      'For context-aware recommendations, prefer suggest_assets instead.',
    ].join(' '),
    {
      type:     z.enum(['instruction', 'agent', 'skill', 'workflow']).optional().describe('Filter by asset type'),
      page:     z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(20),
    },
    async ({ type, page, pageSize }) => {
      const { items, totalCount } = await store.listAssets({
        ...sessionFilter,
        type: type as AssetType | undefined,
        page,
        pageSize,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalCount,
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
            items: items.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              description: a.description,
              tags: a.tags,
              version: a.version,
              author: a.author,
              installCount: a.installCount,
              provider: { id: a.providerId, label: resolveProviderLabel(a.providerId) },
            })),
          }, null, 2),
        }],
      };
    },
  );

  // ── get_asset ─────────────────────────────────────────────────────────────

  server.tool(
    'get_asset',
    [
      'Get full markdown content and metadata of a specific asset by ID or name.',
      'Use this to preview an asset before installing.',
      'To install, use install_asset — it fetches content and tracks the install in one step.',
    ].join(' '),
    {
      id:   z.string().optional().describe('Exact asset ID'),
      name: z.string().optional().describe('Asset name — case-insensitive, partial match'),
    },
    async ({ id, name }) => {
      let asset = null;

      if (id) {
        asset = await store.getAsset(id);
      } else if (name) {
        const { items } = await store.listAssets({ ...sessionFilter, search: name, pageSize: 10 });
        const summary = items.find(a => a.name.toLowerCase() === name.toLowerCase()) ?? items[0] ?? null;
        asset = summary ? await store.getAsset(summary.id) : null;
      }

      if (!asset) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Asset not found.' }) }],
          isError: true,
        };
      }

      const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
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
            provider: { id: asset.providerId, label: resolveProviderLabel(asset.providerId) },
            installPaths,
            content: asset.content,
          }, null, 2),
        }],
      };
    },
  );

  // ── get_popular ───────────────────────────────────────────────────────────

  server.tool(
    'get_popular',
    'Returns the most-installed assets in the hub. Use when the user asks what is popular, trending, or most used.',
    {
      limit: z.number().int().positive().max(20).default(5),
      type:  z.enum(['instruction', 'agent', 'skill', 'workflow']).optional(),
    },
    async ({ limit, type }) => {
      const { items } = await store.listAssets({
        ...sessionFilter,
        type: type as AssetType | undefined,
        pageSize: 100,
        page: 1,
      });

      const popular = [...items]
        .sort((a, b) => b.installCount - a.installCount)
        .slice(0, limit)
        .map(a => ({
          id: a.id,
          name: a.name,
          type: a.type,
          description: a.description,
          installCount: a.installCount,
          tags: a.tags,
          provider: { id: a.providerId, label: resolveProviderLabel(a.providerId) },
        }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ popular }, null, 2) }],
      };
    },
  );

  // ── list_providers ────────────────────────────────────────────────────────

  server.tool(
    'list_providers',
    'Lists all asset repositories configured in Dev AI Hub with sync status and asset counts.',
    {},
    async () => {
      const statuses = await store.getAllSyncStatuses();
      const statusMap = new Map(statuses.map(s => [s.providerId, s]));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            providers: providers.map(p => {
              const status = statusMap.get(p.id);
              return {
                id: p.id,
                label: providerLabel(p.target),
                type: p.type,
                target: p.target,
                branch: p.branch,
                assetCount: status?.assetCount ?? 0,
                lastSync: status?.lastSync,
                status: status?.status ?? 'idle',
              };
            }),
          }, null, 2),
        }],
      };
    },
  );

  // ── install_asset ─────────────────────────────────────────────────────────

  server.tool(
    'install_asset',
    [
      'Fetches asset content and the correct install path, then writes the file to the workspace.',
      'Accepts asset ID or name. Automatically tracks the install.',
      'Use recommended_path to determine where to write the file for the current tool.',
      'After installing, offer the assets listed in related_assets to complement the installation.',
    ].join(' '),
    {
      id:   z.string().optional().describe('Asset ID'),
      name: z.string().optional().describe('Asset name — case-insensitive, partial match'),
    },
    async ({ id, name }) => {
      let asset = null;

      if (id) {
        asset = await store.getAsset(id);
      } else if (name) {
        const { items } = await store.listAssets({ ...sessionFilter, search: name, pageSize: 10 });
        const summary = items.find(a => a.name.toLowerCase() === name.toLowerCase()) ?? items[0] ?? null;
        asset = summary ? await store.getAsset(summary.id) : null;
      }

      if (!asset) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Asset not found: ${id ?? name}` }) }],
          isError: true,
        };
      }

      await store.incrementInstallCount(asset.id);

      const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
        installPath: asset.installPath,
        installPaths: asset.installPaths,
      });

      const recommendedPath = toolParam
        ? (installPaths[toolParam] ?? Object.values(installPaths)[0])
        : Object.values(installPaths)[0];

      // Related: same type with overlapping tags, sorted by popularity
      const { items: candidates } = await store.listAssets({
        ...sessionFilter,
        type: asset.type,
        pageSize: 20,
        page: 1,
      });

      const related = candidates
        .filter(a => a.id !== asset!.id)
        .filter(a => asset!.tags.length === 0 || a.tags.some(t => asset!.tags.includes(t)))
        .sort((a, b) => b.installCount - a.installCount)
        .slice(0, 3)
        .map(a => ({ id: a.id, name: a.name, type: a.type, description: a.description }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            installed: {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              provider: { id: asset.providerId, label: resolveProviderLabel(asset.providerId) },
            },
            recommended_path: recommendedPath,
            all_install_paths: installPaths,
            content: asset.content,
            related_assets: related,
          }, null, 2),
        }],
      };
    },
  );

  return server;
}
