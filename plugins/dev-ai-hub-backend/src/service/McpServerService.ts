import { createHash } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import type { AssetType, AiAsset } from '@internal/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset } from '@internal/plugin-dev-ai-hub-common';

/** SHA-256 hex digest of a UTF-8 string. */
function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Derives a human-readable label from a Git target URL. */
function providerLabel(target: string): string {
  return target.split('/').pop()?.replace(/\.git$/, '') ?? target;
}

/**
 * Creates an McpServer instance connected to the AiAssetStore.
 *
 * @param store            - Asset store
 * @param toolFilter       - Captured from `?tool=` at session init; filters assets by tool compatibility
 * @param providerFilter   - Captured from `?provider=` at session init; scopes assets to a single provider
 * @param providers        - Full provider config list (for `list_providers` and label resolution)
 * @param proactiveEnabled - When false, the `check_for_assets` prompt and `suggest_assets` tool are not registered
 * @param baseUrl          - Base URL of the plugin (e.g. http://backstage:7007/api/dev-ai-hub), used to generate raw_url
 */
export function createMcpServer(
  store: AiAssetStore,
  toolFilter: string,
  providerFilter: string,
  providers: ProviderConfig[],
  proactiveEnabled = false,
  baseUrl = '',
): McpServer {
  const server = new McpServer({ name: 'dev-ai-hub', version: '0.1.0' });

  const toolParam     = toolFilter.trim()     || undefined;
  const providerParam = providerFilter.trim() || undefined;

  /** Base filter applied to every list query in this session. */
  const sessionFilter = { tool: toolParam, providerId: providerParam };

  const resolveProviderLabel = (id: string) =>
    providerLabel(providers.find(p => p.id === id)?.target ?? id);

  /** Returns the human-readable display name for an asset. */
  const displayName = (a: { name: string; label?: string }) => a.label ?? a.name;

    /** Returns the raw-content URL for an asset (empty string when baseUrl is not configured). */
  const rawUrl = (assetId: string) =>
    baseUrl ? `${baseUrl}/assets/${encodeURIComponent(assetId)}/raw` : undefined;

  /**
   * Builds the install payload shared by install_asset and install_assets.
   * Contains everything the model needs to write the file and verify integrity.
   */
  const buildInstallPayload = (asset: AiAsset, recommendedPath: string) => {
    const contentSha256 = sha256(asset.content);
    const expectedBytes = Buffer.byteLength(asset.content, 'utf8');
    const url = rawUrl(asset.id);
    const resources = asset.resourcesContent
      ? Object.entries(asset.resourcesContent).map(([filePath, fileContent]) => ({
          path: filePath,
          content: fileContent,
          sha256: sha256(fileContent),
          bytes: Buffer.byteLength(fileContent, 'utf8'),
        }))
      : undefined;

    return {
      recommended_path: recommendedPath,
      raw_url: url,
      content: asset.content,
      content_sha256: contentSha256,
      expected_bytes: expectedBytes,
      resources,
    };
  };

  /**
   * Resolves an asset by name: tries exact match on name/label first,
   * then label/name contains match, then falls back to first search result.
   */
  const resolveByName = async (name: string) => {
    const { items } = await store.listAssets({ ...sessionFilter, search: name, pageSize: 20 });
    const lower = name.toLowerCase();
    return (
      items.find(a => a.name.toLowerCase() === lower) ??
      items.find(a => (a.label ?? '').toLowerCase() === lower) ??
      items.find(a => a.name.toLowerCase().includes(lower)) ??
      items.find(a => (a.label ?? '').toLowerCase().includes(lower)) ??
      items[0] ??
      null
    );
  };

  // ── MCP Prompt: check_for_assets ─────────────────────────────────────────
  //
  // Teaches the model to proactively check the hub when it detects project
  // context. Supported by Claude Code (/mcp), and other MCP-compatible tools.
  // Only registered when proactiveEnabled=true (default).

  if (proactiveEnabled) {
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
                'When the user confirms, call install_asset and then immediately write the "content" field to "recommended_path", creating parent directories if needed.',
                'After installing, check related_assets in the response and offer those too.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  }

  // ── suggest_assets ────────────────────────────────────────────────────────
  // Only registered when proactiveEnabled=true (default).

  if (proactiveEnabled) {
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
                name: displayName(a),
                type: a.type,
                description: a.description,
                tags: a.tags,
                installCount: a.installCount,
                provider: { id: a.providerId, label: resolveProviderLabel(a.providerId) },
                install_hint: `install_asset(id: "${a.id}")`,
              })),
            }, null, 2),
          }],
        };
      },
    );
  }

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
              name: displayName(a),
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
              name: displayName(a),
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
        const summary = await resolveByName(name);
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
            name: displayName(asset),
            type: asset.type,
            description: asset.description,
            tools: asset.tools,
            tags: asset.tags,
            version: asset.version,
            author: asset.author,
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
          name: displayName(a),
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
      'Fetches asset content and the recommended install path for this tool.',
      'Accepts asset ID or name (partial match supported).',
      'IMPORTANT: After calling this tool you MUST write the file yourself:',
      '1. Use recommended_path as the destination.',
      '2. Create all parent directories if they do not exist.',
      '3. Write the value of "content" verbatim to that path.',
      'Calling this tool alone does NOT write any file — you must perform the write.',
      'After installing, offer the assets listed in related_assets to complement the installation.',
    ].join(' '),
    {
      id:   z.string().optional().describe('Exact asset ID (preferred — avoids ambiguity)'),
      name: z.string().optional().describe('Asset name or label — case-insensitive, partial match'),
    },
    async ({ id, name }) => {
      let asset = null;

      if (id) {
        asset = await store.getAsset(id);
      } else if (name) {
        const summary = await resolveByName(name);
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
        .map(a => ({ id: a.id, name: displayName(a), type: a.type, description: a.description }));

      const payload = buildInstallPayload(asset, recommendedPath);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action_required: [
              'PREFERRED — if your tool has a built-in fetch/HTTP tool:',
              '  1. Call fetch(raw_url) to download the exact content.',
              '  2. Write the fetched content verbatim to recommended_path (create parent directories if needed).',
              'FALLBACK — if no fetch tool is available:',
              '  1. Write the "content" field verbatim to recommended_path (create parent directories if needed).',
              'REQUIRED in both cases:',
              '  • Read the written file back and call verify_install(id, read_content) to confirm integrity.',
              '  • If verify_install returns ok=false, re-write the file from scratch.',
              payload.resources?.length
                ? '  • Also write each file in "resources[]" to its "path" relative to the skill directory, verifying each one.'
                : null,
            ].filter(Boolean).join('\n'),
            installed: {
              id: asset.id,
              name: displayName(asset),
              type: asset.type,
              provider: { id: asset.providerId, label: resolveProviderLabel(asset.providerId) },
            },
            all_install_paths: installPaths,
            path_override_hint: 'Paths can be customised per-tool in the asset YAML: installPaths: { claude-code: ".claude/rules/custom.md" }',
            ...payload,
            related_assets: related,
          }, null, 2),
        }],
      };
    },
  );

  // ── verify_install ────────────────────────────────────────────────────────
  //
  // Called after the model writes a file. The model reads the written file
  // back and passes the content here; the backend compares SHA-256 hashes.
  // Works on any OS, any AI tool — no shell commands required.

  server.tool(
    'verify_install',
    [
      'Verify that an asset was written to disk correctly by comparing SHA-256 hashes.',
      'ALWAYS call this after writing an asset file.',
      'Steps: (1) write the file, (2) read the file back with your file-read tool, (3) call verify_install with the read content.',
      'If ok=false, re-write the file verbatim from the content returned by install_asset and verify again.',
    ].join(' '),
    {
      id: z.string().describe('Asset ID returned by install_asset'),
      installed_content: z.string().describe('Exact content of the file as you read it back from disk after writing'),
    },
    async ({ id, installed_content }) => {
      const asset = await store.getAsset(id);
      if (!asset) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Asset not found: ${id}` }) }],
          isError: true,
        };
      }

      const expected_sha256 = sha256(asset.content);
      const actual_sha256   = sha256(installed_content);
      const ok              = expected_sha256 === actual_sha256;
      const expected_bytes  = Buffer.byteLength(asset.content, 'utf8');
      const actual_bytes    = Buffer.byteLength(installed_content, 'utf8');

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ok,
            message: ok
              ? 'Asset installed correctly.'
              : `Content mismatch — re-write the file verbatim. Expected ${expected_bytes} bytes, got ${actual_bytes} bytes.`,
            expected_sha256,
            actual_sha256,
            expected_bytes,
            actual_bytes,
          }, null, 2),
        }],
      };
    },
  );

  // ── install_assets ────────────────────────────────────────────────────────
  //
  // Batch installation: one MCP round-trip for N assets.
  // Returns a lean response (only what is needed to write + verify each file).
  // Use instead of calling install_asset N times.

  server.tool(
    'install_assets',
    [
      'Install multiple assets at once — one MCP call instead of N.',
      'ALWAYS prefer this over calling install_asset individually when installing 2 or more assets.',
      'Returns a lean list: path + raw_url + content + sha256 for each asset.',
      'For each file: write it (preferably via fetch(raw_url)), then call verify_install.',
    ].join(' '),
    {
      ids: z.array(z.string()).min(1).max(20).describe('List of asset IDs to install'),
    },
    async ({ ids }) => {
      const results = await Promise.all(ids.map(id => store.getAsset(id)));

      const found    = results.filter((a): a is AiAsset => a !== null);
      const notFound = ids.filter((_, i) => results[i] === null);

      // Track installs for all found assets in parallel
      await Promise.all(found.map(a => store.incrementInstallCount(a.id)));

      const files = found.map(asset => {
        const installPaths = getInstallPathsForAsset(asset.type, asset.tools, asset.name, {
          installPath: asset.installPath,
          installPaths: asset.installPaths,
        });
        const recommendedPath = toolParam
          ? (installPaths[toolParam] ?? Object.values(installPaths)[0])
          : Object.values(installPaths)[0];

        return {
          id: asset.id,
          name: displayName(asset),
          type: asset.type,
          ...buildInstallPayload(asset, recommendedPath),
        };
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action_required: [
              'For EACH file in files[]:',
              '  PREFERRED — if your tool has a built-in fetch/HTTP tool:',
              '    1. Call fetch(raw_url) to download the exact content.',
              '    2. Write the fetched content verbatim to recommended_path (create parent directories if needed).',
              '  FALLBACK — if no fetch tool is available:',
              '    1. Write the "content" field verbatim to recommended_path (create parent directories if needed).',
              '  REQUIRED after each write:',
              '    • Read the written file back and call verify_install(id, read_content).',
              '    • If verify_install returns ok=false, re-write that file from scratch and verify again.',
            ].join('\n'),
            total: found.length,
            not_found: notFound.length > 0 ? notFound : undefined,
            files,
          }, null, 2),
        }],
      };
    },
  );

  return server;
}
