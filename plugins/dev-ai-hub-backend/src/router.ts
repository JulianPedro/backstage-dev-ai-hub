import express from 'express';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { AiAssetStore } from './database/AiAssetStore';
import type { AiAssetSyncService } from './service/AiAssetSyncService';
import type { ProviderConfig, AssetListFilter } from './types';
import type { AssetType } from '@nospt/plugin-dev-ai-hub-common';

interface RouterOptions {
  logger: LoggerService;
  store: AiAssetStore;
  syncService: AiAssetSyncService;
  providers: ProviderConfig[];
}

export function createRouter(options: RouterOptions): express.Router {
  const { store, syncService, providers } = options;
  const router = express.Router();

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
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (err) {
      options.logger.error('GET /assets/:id failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/assets/:id/raw', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(asset.content ?? '');
    } catch (err) {
      options.logger.error('GET /assets/:id/raw failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/assets/:id/download', async (req, res) => {
    try {
      const asset = await store.getAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      const filename = `${asset.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}.md`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(asset.content ?? '');
    } catch (err) {
      options.logger.error('GET /assets/:id/download failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/assets/:id/track-install', async (req, res) => {
    try {
      const exists = await store.getAsset(req.params.id);
      if (!exists) {
        res.status(404).json({ error: 'Asset not found' });
        return;
      }
      await store.incrementInstallCount(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      options.logger.error('POST /assets/:id/track-install failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ── Providers ─────────────────────────────────────────────────────────────

  router.get('/providers', (_req, res) => {
    res.json(providers.map(p => ({ id: p.id, type: p.type, target: p.target, branch: p.branch })));
  });

  router.get('/providers/:id/status', async (req, res) => {
    try {
      const status = await store.getSyncStatus(req.params.id);
      if (!status) {
        res.status(404).json({ error: 'Provider not found' });
        return;
      }
      res.json(status);
    } catch (err) {
      options.logger.error('GET /providers/:id/status failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/providers/:id/sync', async (req, res) => {
    try {
      const provider = providers.find(p => p.id === req.params.id);
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' });
        return;
      }
      await syncService.syncProvider(provider);
      res.json({ providerId: provider.id, status: 'syncing' });
    } catch (err) {
      options.logger.error('POST /providers/:id/sync failed', err as Error);
      res.status(500).json({ error: 'Internal server error' });
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

  return router;
}
