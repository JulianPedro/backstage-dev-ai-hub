import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AiAssetStore } from '../database/AiAssetStore';
import type { ProviderConfig } from '../types';
import type { AssetType, AiAsset } from '@julianpedro/plugin-dev-ai-hub-common';
import { getInstallPathsForAsset, getInstallPath } from '@julianpedro/plugin-dev-ai-hub-common';

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

  const POPULAR_THRESHOLD = 5;

  const toolParam     = toolFilter.trim()     || undefined;
  const providerParam = providerFilter.trim() || undefined;

  /** Base filter applied to every list query in this session. */
  const sessionFilter = { tool: toolParam, providerId: providerParam };

  const resolveProviderLabel = (id: string) =>
    providerLabel(providers.find(p => p.id === id)?.target ?? id);

  /** Returns the human-readable display name for an asset. */
  const displayName = (a: { name: string; label?: string }) => a.label ?? a.name;

  /**
   * Formats a list of assets as a markdown table for consistent display.
   * Includes a compact ID reference list so the model can use install_asset.
   */
  const buildAssetTable = (
    items: Array<{ id: string; name: string; label?: string; type: string; description?: string; tags?: string[]; installCount?: number }>,
    meta?: { totalCount: number; page: number; pageSize: number; totalPages?: number },
  ): string => {
    const header = meta
      ? `**${meta.totalCount} asset${meta.totalCount !== 1 ? 's' : ''} found** (page ${meta.page}/${meta.totalPages ?? Math.ceil(meta.totalCount / meta.pageSize)})\n\n`
      : `**${items.length} asset${items.length !== 1 ? 's' : ''}**\n\n`;

    const rows = items.map((a, i) => {
      const name = displayName(a);
      let desc = '—';
      if (a.description) {
        desc = a.description.length > 55 ? `${a.description.slice(0, 52)}…` : a.description;
      }
      const tags = a.tags?.length ? a.tags.slice(0, 3).join(', ') : '—';
      const installs = a.installCount ?? 0;
      const pop = installs >= POPULAR_THRESHOLD ? ' 🔥' : '';
      return `| ${i + 1} | **${name}** | \`${a.type}\` | ${desc} | ${tags} | ${installs}${pop} |`;
    });

    const table = [
      '| # | Name | Type | Description | Tags | Installs |',
      '|---|------|------|-------------|------|----------|',
      ...rows,
    ].join('\n');

    const ids = items
      .map((a, i) => `${i + 1}. ${displayName(a)} → \`${a.id}\``)
      .join('\n');

    return `IMPORTANT: Present the table below to the user exactly as formatted — do not convert to a list.\n\n${header}${table}\n\n**IDs for install_asset:**\n${ids}`;
  };

  /** Returns the raw-content URL for the main asset markdown. */
  const rawUrl = (assetId: string) =>
    baseUrl ? `${baseUrl}/assets/${encodeURIComponent(assetId)}/raw` : undefined;

  /** Returns the URL for an individual resource file bundled with a skill asset. */
  const resourceFileUrl = (assetId: string, resourcePath: string) => {
    if (!baseUrl) return undefined;
    const encodedPath = resourcePath.split('/').map(encodeURIComponent).join('/');
    return `${baseUrl}/assets/${encodeURIComponent(assetId)}/resources/${encodedPath}`;
  };

  /**
   * Builds the install payload shared by install_asset, install_assets, and install_bundle.
   *
   * Each resource file now has its own raw_url and install_command (curl), mirroring
   * the main asset. This makes resource installation deterministic — the LLM never
   * needs to write file content verbatim, which prevents truncation and model alterations.
   *
   * curl is built-in on Windows 10+ (since 2018), macOS, and Linux.
   * --create-dirs creates parent directories; -fsSL follows redirects silently.
   */
  const buildInstallPayload = (asset: AiAsset, recommendedPath: string, includeContent = false) => {
    const url = rawUrl(asset.id);
    const curlCmd = url
      ? `curl -fsSL --create-dirs -o ${JSON.stringify(recommendedPath)} ${JSON.stringify(url)}`
      : undefined;

    // Skill directory is the parent of SKILL.md — resource files live alongside it.
    const skillDir = recommendedPath.split('/').slice(0, -1).join('/');

    const resources = asset.resourcesContent
      ? Object.entries(asset.resourcesContent).map(([filePath, fileContent]) => {
          const installPath = skillDir ? `${skillDir}/${filePath}` : filePath;
          const resUrl = resourceFileUrl(asset.id, filePath);
          const resCurl = resUrl
            ? `curl -fsSL --create-dirs -o ${JSON.stringify(installPath)} ${JSON.stringify(resUrl)}`
            : undefined;
          return {
            path: filePath,
            install_path: installPath,
            raw_url: resUrl,
            install_command: resCurl,
            ...(includeContent ? { content: fileContent } : {}),
          };
        })
      : undefined;

    return {
      recommended_path: recommendedPath,
      raw_url: url,
      install_command: curlCmd,
      ...(includeContent ? { content: asset.content } : {}),
      resources,
    };
  };

  /**
   * Derives the filesystem directories and filename rules for scanning already-installed
   * assets for a given AI tool. Uses the same CONVENTIONS as getInstallPath.
   */
  const buildScanSpec = (tool: string) => {
    const PLACEHOLDER = '__asset__';
    const types: AssetType[] = ['instruction', 'agent', 'skill', 'workflow'];
    return types
      .map(type => {
        const fullPath = getInstallPath(type, tool, PLACEHOLDER);
        if (!fullPath) return null;
        const [before, after] = fullPath.split(PLACEHOLDER);
        const dir = before || './';
        if (type === 'skill') {
          // e.g. .claude/skills/__asset__/SKILL.md → list subdirectory names
          return { type, dir, extract: 'subdirectory_name', example: `${dir}my-skill/SKILL.md → "my-skill"` };
        }
        return { type, dir, strip_suffix: after ?? '', example: `${dir}my-asset${after ?? ''} → "my-asset"` };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s.dir !== './');
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

  if (proactiveEnabled) server.prompt(
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

  // ── suggest_assets ────────────────────────────────────────────────────────
  // Only registered when proactiveEnabled=true (default).

  if (proactiveEnabled) server.tool(
    'suggest_assets',
    [
      'Proactively suggests relevant assets based on project context (language, framework, task).',
      'Use this at the start of a session or when the user describes what they are building.',
      'Always present the results to the user as a markdown table — never as a bullet list.',
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
          text: `**Suggestions for:** ${context}\n\n${buildAssetTable(items)}`,
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
      'Always present the results to the user as a markdown table — never as a bullet list.',
      'Follow up with get_asset to preview content, or install_asset to install directly.',
    ].join(' '),
    {
      query:    z.string().optional().describe('Full-text search across name, description and content'),
      type:     z.enum(['instruction', 'agent', 'skill', 'workflow', 'bundle']).optional().describe('Filter by asset type'),
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
          text: buildAssetTable(items, { totalCount, page, pageSize }),
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
      'Always present the results to the user as a markdown table — never as a bullet list.',
      'For context-aware recommendations, prefer suggest_assets instead.',
    ].join(' '),
    {
      type:     z.enum(['instruction', 'agent', 'skill', 'workflow', 'bundle']).optional().describe('Filter by asset type'),
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
          text: buildAssetTable(items, { totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) }),
        }],
      };
    },
  );

  // ── get_asset ─────────────────────────────────────────────────────────────

  server.tool(
    'get_asset',
    [
      'Get metadata of a specific asset by ID or name.',
      'Use this to preview an asset before installing.',
      'Pass include_content=true to also receive the full markdown (adds tokens — prefer install_asset for actual installs).',
      'To install, use install_asset — it tracks the install in one step.',
    ].join(' '),
    {
      id:              z.string().optional().describe('Exact asset ID'),
      name:            z.string().optional().describe('Asset name — case-insensitive, partial match'),
      include_content: z.boolean().default(false).describe('Include full markdown content in response (increases tokens)'),
    },
    async ({ id, name, include_content }) => {
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
            ...(include_content ? { content: asset.content } : { raw_url: rawUrl(asset.id) }),
          }),
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
        content: [{ type: 'text' as const, text: JSON.stringify({ popular }) }],
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
          }),
        }],
      };
    },
  );

  // ── install_asset ─────────────────────────────────────────────────────────

  server.tool(
    'install_asset',
    [
      'Returns the install path and a pre-built install_command (curl) for a single asset.',
      'IMPORTANT: Run install_command via your terminal/shell tool (execute, run_terminal, Bash).',
      'This writes the file directly without content going through the model — prevents truncation.',
      'Fallback: use web tool (Copilot) or WebFetch (Claude Code) to fetch raw_url, then write.',
      'Pass include_content=true only when no terminal or web tool is available.',
    ].join(' '),
    {
      id:              z.string().optional().describe('Exact asset ID (preferred — avoids ambiguity)'),
      name:            z.string().optional().describe('Asset name or label — case-insensitive, partial match'),
      include_content: z.boolean().default(false).describe('Include full markdown in response (last resort — increases tokens significantly)'),
      include_related: z.boolean().default(false).describe('Include related asset suggestions'),
    },
    async ({ id, name, include_content, include_related }) => {
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

      const payload = buildInstallPayload(asset, recommendedPath, include_content);

      const related = include_related
        ? await (async () => {
            const { items: candidates } = await store.listAssets({
              ...sessionFilter,
              type: asset!.type,
              pageSize: 20,
              page: 1,
            });
            return candidates
              .filter(a => a.id !== asset!.id)
              .filter(a => asset!.tags.length === 0 || a.tags.some(t => asset!.tags.includes(t)))
              .sort((a, b) => b.installCount - a.installCount)
              .slice(0, 3)
              .map(a => ({ id: a.id, name: displayName(a), type: a.type }));
          })()
        : undefined;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action_required: payload.resources?.length
              ? 'For main file and each resources[] entry: [A] run install_command in terminal (preferred, atomic) • [B] fetch raw_url → write to install_path • [C] write content field (last resort, pass include_content=true)'
              : '[A] run install_command in terminal (preferred, atomic) • [B] fetch raw_url → write to recommended_path • [C] write content field (last resort, pass include_content=true)',
            installed: {
              id: asset.id,
              name: displayName(asset),
              type: asset.type,
              provider: { id: asset.providerId, label: resolveProviderLabel(asset.providerId) },
            },
            all_install_paths: installPaths,
            ...payload,
            ...(related ? { related_assets: related } : {}),
          }),
        }],
      };
    },
  );

  // ── install_bundle ────────────────────────────────────────────────────────
  //
  // Installs all assets belonging to a bundle in a single MCP call.
  // The AI agent receives an array of files (each with path + content + curl command)
  // and writes them all at once — no need to call install_asset N times.

  server.tool(
    'install_bundle',
    [
      'Install all assets in a bundle at once — one MCP call for the entire bundle.',
      'Returns an array of files with recommended paths and install commands.',
      'Run each install_command via your terminal tool (execute, run_terminal, Bash).',
      'Pass include_content=true only if no terminal/web tool is available.',
      'Use list_assets with type="bundle" to discover available bundles first.',
    ].join(' '),
    {
      id:              z.string().describe('Bundle asset ID'),
      include_content: z.boolean().default(false).describe('Include markdown content for each asset (last resort — increases tokens)'),
    },
    async ({ id, include_content }) => {
      const bundle = await store.getAsset(id);
      if (!bundle || bundle.type !== 'bundle') {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Bundle not found: ${id}` }) }],
          isError: true,
        };
      }

      const resolvedItems = bundle.items ?? [];
      const files: Array<Record<string, unknown>> = [];
      const notResolved: string[] = [];

      for (const item of resolvedItems) {
        if (!item.assetId) {
          notResolved.push(item.ref);
          continue;
        }

        const asset = await store.getAsset(item.assetId);
        if (!asset) {
          notResolved.push(item.ref);
          continue;
        }

        await store.incrementInstallCount(asset.id);

        const installPaths = getInstallPathsForAsset(asset.type as any, asset.tools, asset.name, {
          installPath: asset.installPath,
          installPaths: asset.installPaths,
        });
        const recommendedPath = toolParam
          ? (installPaths[toolParam] ?? Object.values(installPaths)[0])
          : Object.values(installPaths)[0];

        files.push({
          id: asset.id,
          name: displayName(asset),
          type: asset.type,
          ...buildInstallPayload(asset, recommendedPath ?? asset.name, include_content),
        });
      }

      await store.incrementInstallCount(bundle.id);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action_required: 'For each entry in files[] (and each resources[] inside it): [A] run install_command in terminal (preferred, atomic) • [B] fetch raw_url → write to install_path • [C] write content field (last resort, pass include_content=true). Process all files.',
            bundle: {
              id: bundle.id,
              name: displayName(bundle),
              description: bundle.description,
            },
            total: files.length,
            not_resolved: notResolved.length > 0 ? notResolved : undefined,
            files,
          }),
        }],
      };
    },
  );

  // ── install_assets ────────────────────────────────────────────────────────
  //
  // Batch installation: one MCP round-trip for N assets.
  // Use instead of calling install_asset N times.

  server.tool(
    'install_assets',
    [
      'Install multiple assets at once — one MCP call instead of N.',
      'ALWAYS prefer this over calling install_asset individually when installing 2 or more assets.',
      'Each file includes an install_command (curl) — run it via your terminal tool (execute, run_terminal, Bash) for atomic, truncation-free install.',
      'Pass include_content=true only if no terminal/web tool is available.',
    ].join(' '),
    {
      ids:             z.array(z.string()).min(1).max(20).describe('List of asset IDs to install'),
      include_content: z.boolean().default(false).describe('Include markdown content for each asset (last resort — increases tokens)'),
    },
    async ({ ids, include_content }) => {
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
          ...buildInstallPayload(asset, recommendedPath, include_content),
        };
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action_required: 'For each file in files[]: [A] run install_command in terminal • [B] fetch raw_url → write to recommended_path • [C] write content field (last resort, pass include_content=true). Process all files.',
            total: found.length,
            not_found: notFound.length > 0 ? notFound : undefined,
            files,
          }),
        }],
      };
    },
  );

  // ── update_assets ─────────────────────────────────────────────────────────
  //
  // Guides the LLM to find and re-install already-installed assets.
  // The MCP server has no access to the user's filesystem — this tool returns
  // the directories and filename rules so the LLM can scan with its own tools.

  server.tool(
    'update_assets',
    [
      'Re-installs all Dev AI Hub assets already present in the workspace to their latest version.',
      'Does NOT compare versions — always overwrites with the current hub version.',
      'Call when the user asks to "update", "upgrade", "refresh", or "sync" installed assets.',
      'Step 1: this tool returns the directories to scan.',
      'Step 2: use your filesystem/shell tools (Bash, ls, find) to list files in those directories.',
      'Step 3: match found filenames against available_assets using the strip_suffix or subdirectory_name rule.',
      'Step 4: call install_assets with the matched IDs to reinstall all at once.',
    ].join(' '),
    {
      tool: z.string().optional().describe(
        'AI tool whose install directories to scan (e.g. claude-code, github-copilot, cursor). Defaults to the session tool filter.',
      ),
    },
    async ({ tool: toolOverride }) => {
      const targetTool = (toolOverride ?? toolParam ?? 'claude-code').trim();
      const directories = buildScanSpec(targetTool);

      // Fetch names + IDs only — no content — for the LLM to do name matching
      const { items } = await store.listAssets({ ...sessionFilter, pageSize: 500, page: 1 });
      const available_assets = items.map(a => ({ id: a.id, name: a.name, ...(a.label ? { label: a.label } : {}) }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            instructions: [
              '1. Use your shell/filesystem tool (Bash, ls, find) to list files in each directory.',
              '2. Extract the asset name from each filename using strip_suffix (remove that suffix from the filename).',
              '   For skills (extract=subdirectory_name): list subdirectory names, ignore SKILL.md.',
              '3. Match each found name against available_assets (case-insensitive, partial match ok).',
              '4. Call install_assets with the matched IDs to reinstall all at once.',
              '5. Report which assets were updated and which filenames had no match in the hub.',
            ].join('\n'),
            target_tool: targetTool,
            directories,
            available_assets,
          }),
        }],
      };
    },
  );

  return server;
}