import { randomUUID } from 'crypto';
import express from 'express';
import archiver from 'archiver';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { AiAssetStore } from './database/AiAssetStore';
import type { AiAssetSyncService } from './service/AiAssetSyncService';
import { createMcpServer } from './service/McpServerService';
import type { ProviderConfig, AssetListFilter } from './types';
import type { AssetType } from '@internal/plugin-dev-ai-hub-common';

interface RouterOptions {
  logger: LoggerService;
  store: AiAssetStore;
  syncService: AiAssetSyncService;
  providers: ProviderConfig[];
  /** Base URL of this plugin, e.g. http://backstage:7007/api/dev-ai-hub */
  baseUrl: string;
}

export function createRouter(options: RouterOptions): express.Router {
  const { store, syncService, providers, baseUrl } = options;
  const router = express.Router();

  /** Active MCP sessions: sessionId → transport */
  const mcpSessions = new Map<string, StreamableHTTPServerTransport>();

  router.use(express.json());

  // ── Assets ────────────────────────────────────────────────────────────────

  router.get('/assets', async (req, res) => {
    try {
      const filter: AssetListFilter = {
        type: req.query.type as AssetType | undefined,
        tool: req.query.tool as string | undefined,
        providerId: req.query.provider as string | undefined,
        search: req.query.search as string | undefined,
        tags: req.query.tags
          ? (req.query.tags as string).split(',').filter(Boolean)
          : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      };

      const { items, totalCount } = await store.listAssets(filter);

      res.json({
        items,
        totalCount,
        page: filter.page,
        pageSize: filter.pageSize,
      });
    } catch (err) {
      options.logger.error('GET /assets failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/assets/:id', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      return res.json(asset);
    } catch (err) {
      options.logger.error('GET /assets/:id failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /** Returns the pure markdown content of the asset */
  router.get('/assets/:id/raw', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(asset.content);
    } catch (err) {
      options.logger.error('GET /assets/:id/raw failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * For skills: returns a zip with the markdown + metadata about bundled resources.
   * For other types: returns the markdown as a text file.
   */
  router.get('/assets/:id/download', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });

      const filename = `${asset.name.replace(/\s+/g, '-').toLowerCase()}`;

      if (asset.type === 'skill') {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}.zip"`,
        );
        const archive = archiver('zip');
        archive.pipe(res);
        archive.append(asset.content, { name: 'SKILL.md' });
        if (asset.resourcesContent) {
          for (const [resourcePath, resourceContent] of Object.entries(asset.resourcesContent)) {
            archive.append(resourceContent, { name: resourcePath });
          }
        }
        await archive.finalize();
      } else {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}.md"`,
        );
        return res.send(asset.content);
      }

      return undefined;
    } catch (err) {
      options.logger.error('GET /assets/:id/download failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/assets/:id/track-install', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      await store.incrementInstallCount(req.params.id);
      return res.status(204).send();
    } catch (err) {
      options.logger.error('POST /assets/:id/track-install failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Providers ─────────────────────────────────────────────────────────────

  router.get('/providers', async (_req, res) => {
    try {
      const statuses = await store.getAllSyncStatuses();
      const statusMap = new Map(statuses.map(s => [s.providerId, s]));

      const result = providers.map(p => {
        const status = statusMap.get(p.id);
        return {
          id: p.id,
          type: p.type,
          target: p.target,
          branch: p.branch,
          lastSync: status?.lastSync,
          lastCommit: status?.lastCommit,
          status: status?.status ?? 'idle',
          error: status?.error,
          assetCount: status?.assetCount ?? 0,
        };
      });

      res.json(result);
    } catch (err) {
      options.logger.error('GET /providers failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/providers/:id/status', async (req, res) => {
    try {
      const provider = providers.find(p => p.id === req.params.id);
      if (!provider) return res.status(404).json({ error: 'Provider not found' });

      const status = await store.getSyncStatus(req.params.id);
      return res.json(
        status ?? {
          providerId: req.params.id,
          status: 'idle',
          assetCount: 0,
        },
      );
    } catch (err) {
      options.logger.error('GET /providers/:id/status failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/providers/:id/sync', async (req, res) => {
    try {
      const provider = providers.find(p => p.id === req.params.id);
      if (!provider) return res.status(404).json({ error: 'Provider not found' });

      // Fire and forget — respond immediately, sync runs in background
      setImmediate(() => syncService.syncProvider(provider));

      return res.json({ message: 'Sync triggered', providerId: provider.id });
    } catch (err) {
      options.logger.error('POST /providers/:id/sync failed', err as Error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  router.get('/stats', async (_req, res) => {
    try {
      const stats = await store.getStats();
      res.json(stats);
    } catch (err) {
      options.logger.error('GET /stats failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── MCP — StreamableHTTP transport ────────────────────────────────────────
  //
  // Clients connect to /mcp?tool=<ai-tool-name> using the MCP HTTP protocol.
  // The `tool` query parameter filters assets to those compatible with that
  // AI tool. Each session is stateful: the tool filter is captured at
  // initialization time and reused for the session lifetime.
  //
  // Client configuration example (.mcp.json / mcp_settings.json):
  //
  //   {
  //     "mcpServers": {
  //       "dev-ai-hub": {
  //         "type": "http",
  //         "url": "http://<backstage-host>:7007/api/dev-ai-hub/mcp?tool=claude-code"
  //       }
  //     }
  //   }
  //
  // Set AI_HUB_TOOL in your environment and substitute it into the URL, or
  // hard-code the tool name per workspace.

  /**
   * POST /mcp — Initialize a new MCP session or handle an existing one.
   * On first request (no mcp-session-id header), a new session is created
   * and its ID is returned in the response header.
   */
  router.post('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId) {
        const transport = mcpSessions.get(sessionId);
        if (!transport) {
          res.status(404).json({ error: 'MCP session not found' });
          return;
        }
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // New session — extract filters from query params or headers
      const toolFilter =
        (req.query.tool as string | undefined) ??
        (req.headers['x-ai-hub-tool'] as string | undefined) ??
        '';
      const providerFilter =
        (req.query.provider as string | undefined) ??
        (req.headers['x-ai-hub-provider'] as string | undefined) ??
        '';
      // proactive defaults to false; pass ?proactive=true to enable check_for_assets + suggest_assets
      const proactiveEnabled =
        ((req.query.proactive as string | undefined) ??
         (req.headers['x-ai-hub-proactive'] as string | undefined) ??
         'false') === 'true';

      const newSessionId = randomUUID();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: id => {
          mcpSessions.set(id, transport);
          options.logger.debug(
            `dev-ai-hub MCP: session ${id} opened (tool="${toolFilter || 'all'}", provider="${providerFilter || 'all'}", proactive=${proactiveEnabled})`,
          );
        },
      });

      transport.onclose = () => {
        mcpSessions.delete(newSessionId);
        options.logger.debug(`dev-ai-hub MCP: session ${newSessionId} closed`);
      };

      const server = createMcpServer(store, toolFilter, providerFilter, providers, proactiveEnabled, baseUrl);
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      options.logger.error('POST /mcp failed', err as Error);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /mcp — SSE stream for server-to-client notifications on an existing session.
   */
  router.get('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'mcp-session-id header required' });
        return;
      }
      const transport = mcpSessions.get(sessionId);
      if (!transport) {
        res.status(404).json({ error: 'MCP session not found' });
        return;
      }
      await transport.handleRequest(req, res);
    } catch (err) {
      options.logger.error('GET /mcp failed', err as Error);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /mcp — Terminate an existing MCP session.
   */
  router.delete('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'mcp-session-id header required' });
        return;
      }
      const transport = mcpSessions.get(sessionId);
      if (!transport) {
        res.status(404).json({ error: 'MCP session not found' });
        return;
      }
      await transport.handleRequest(req, res);
      mcpSessions.delete(sessionId);
    } catch (err) {
      options.logger.error('DELETE /mcp failed', err as Error);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
