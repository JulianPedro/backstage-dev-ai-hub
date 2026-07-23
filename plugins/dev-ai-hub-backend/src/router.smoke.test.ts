/**
 * Smoke tests for the Express router created by `createRouter`.
 *
 * These tests verify that all route patterns are correctly resolved by
 * path-to-regexp (via Express), that :id parameters are captured, and that the
 * right status codes are returned — without starting a real Backstage backend.
 */

import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import type { AiAssetStore } from './database/AiAssetStore';
import type { AiAssetSyncService } from './service/AiAssetSyncService';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { ProviderConfig } from './types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ASSET_SUMMARY = {
  id: 'asset-123',
  providerId: 'provider-1',
  name: 'Test Instruction',
  description: 'A test asset',
  type: 'instruction',
  tools: ['github-copilot'],
  tags: ['test'],
  author: 'tester',
  version: '1.0.0',
  installCount: 5,
  syncedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} as const;

const ASSET_FULL = {
  ...ASSET_SUMMARY,
  content: '# Test Instruction\n\nSome content.',
  yamlRaw: 'name: test',
  yamlPath: 'instructions/test.yaml',
  mdPath: 'instructions/test.md',
  repoUrl: 'https://github.com/org/repo',
  branch: 'main',
  resourcesContent: null,
  installPaths: null,
  installPath: null,
  icon: null,
  label: null,
  metadata: null,
};

const PROVIDER: ProviderConfig = {
  id: 'provider-1',
  type: 'github',
  target: 'https://github.com/org/repo',
  branch: 'main',
  schedule: {
    frequency: { hours: 1 },
    timeout: { minutes: 5 },
  },
};

// ── Mocks ────────────────────────────────────────────────────────────────────

function makeStoreMock(overrides: Partial<AiAssetStore> = {}): AiAssetStore {
  return {
    listAssets: jest
      .fn()
      .mockResolvedValue({ items: [ASSET_SUMMARY], totalCount: 1 }),
    getAsset: jest
      .fn()
      .mockImplementation(async (id: string) =>
        id === 'asset-123' ? ASSET_FULL : null,
      ),
    incrementInstallCount: jest.fn().mockResolvedValue(undefined),
    getAllSyncStatuses: jest
      .fn()
      .mockResolvedValue([
        { providerId: 'provider-1', status: 'idle', assetCount: 1 },
      ]),
    getSyncStatus: jest
      .fn()
      .mockImplementation(async (id: string) =>
        id === 'provider-1'
          ? { providerId: 'provider-1', status: 'idle', assetCount: 1 }
          : null,
      ),
    getStats: jest.fn().mockResolvedValue({
      totalAssets: 1,
      byType: { instruction: 1, agent: 0, skill: 0, workflow: 0 },
      byTool: { 'github-copilot': 1 },
      byProvider: { 'provider-1': 1 },
    }),
    // remaining methods not needed by router
    upsertAsset: jest.fn(),
    deleteAssetsNotIn: jest.fn(),
    upsertSyncStatus: jest.fn(),
    ...overrides,
  } as unknown as AiAssetStore;
}

function makeSyncServiceMock(): AiAssetSyncService {
  return {
    syncProvider: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
  } as unknown as AiAssetSyncService;
}

const noopLogger: LoggerService = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

// ── Test app factory ──────────────────────────────────────────────────────────

function makeApp(storeOverrides: Partial<AiAssetStore> = {}) {
  const store = makeStoreMock(storeOverrides);
  const syncService = makeSyncServiceMock();

  const router = createRouter({
    logger: noopLogger,
    store,
    telemetryStore: {} as any,
    telemetrySalt: 'test-salt',
    syncService,
    providers: [PROVIDER],
    catalog: {
      getEntities: jest.fn().mockResolvedValue({ items: [] }),
    } as any,
    reader: { readUrl: jest.fn(), readTree: jest.fn() } as any,
    httpAuth: {
      credentials: jest.fn().mockResolvedValue({ principal: { type: 'user' } }),
    } as any,
  });

  const app = express();
  app.use(express.json());
  app.use(router);
  return { app, store, syncService };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('router smoke tests (path-to-regexp route matching)', () => {
  // ── /assets ────────────────────────────────────────────────────────────────

  describe('GET /assets', () => {
    it('returns 200 with paginated asset list', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: expect.any(Array),
        totalCount: 1,
      });
    });

    it('forwards query parameters to the store', async () => {
      const { app, store } = makeApp();
      await request(app).get(
        '/assets?type=instruction&search=test&page=2&pageSize=5',
      );
      expect(store.listAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'instruction',
          search: 'test',
          page: 2,
          pageSize: 5,
        }),
      );
    });
  });

  describe('GET /assets/:id', () => {
    it('returns 200 for a known asset and captures the :id param', async () => {
      const { app, store } = makeApp();
      const res = await request(app).get('/assets/asset-123');
      expect(res.status).toBe(200);
      expect(store.getAsset).toHaveBeenCalledWith('asset-123');
      expect(res.body.id).toBe('asset-123');
    });

    it('returns 404 for an unknown asset', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('GET /assets/:id/raw', () => {
    it('returns 200 with text/markdown content type', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets/asset-123/raw');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/markdown/);
    });

    it('returns 404 when asset does not exist', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets/missing/raw');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /assets/:id/download', () => {
    it('returns 200 with Content-Disposition header for non-skill assets', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets/asset-123/download');
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toMatch(/\.md/);
    });

    it('returns 404 when asset does not exist', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/assets/missing/download');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /assets/:id/track-install', () => {
    it('returns 204 and increments count for known asset', async () => {
      const { app, store } = makeApp();
      const res = await request(app).post('/assets/asset-123/track-install');
      expect(res.status).toBe(204);
      expect(store.incrementInstallCount).toHaveBeenCalledWith('asset-123');
    });

    it('returns 404 for unknown asset', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/assets/missing/track-install');
      expect(res.status).toBe(404);
    });
  });

  // ── /providers ─────────────────────────────────────────────────────────────

  describe('GET /providers', () => {
    it('returns 200 with provider list', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/providers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toMatchObject({ id: 'provider-1' });
    });
  });

  describe('GET /providers/:id/status', () => {
    it('returns 200 for a known provider and captures :id param', async () => {
      const { app, store } = makeApp();
      const res = await request(app).get('/providers/provider-1/status');
      expect(res.status).toBe(200);
      expect(store.getSyncStatus).toHaveBeenCalledWith('provider-1');
    });

    it('returns 404 for an unknown provider', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/providers/unknown-provider/status');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /providers/:id/sync', () => {
    it('returns 200 and fires background sync for known provider', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/providers/provider-1/sync');
      expect(res.status).toBe(200);
      expect(res.body.providerId).toBe('provider-1');
    });

    it('returns 404 for an unknown provider', async () => {
      const { app } = makeApp();
      const res = await request(app).post('/providers/unknown-provider/sync');
      expect(res.status).toBe(404);
    });
  });

  // ── /stats ─────────────────────────────────────────────────────────────────

  describe('GET /stats', () => {
    it('returns 200 with stats object', async () => {
      const { app } = makeApp();
      const res = await request(app).get('/stats');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ totalAssets: 1 });
    });
  });
});
