/**
 * Tests for the v2 catalog-backed `GET /resources` route: entity → summary
 * mapping, unknown-type dropping, the empty state, and auth gating.
 */

import express from 'express';
import request from 'supertest';
import type { Entity } from '@backstage/catalog-model';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

const SKILL_ENTITY: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'AiResource',
  metadata: {
    name: 'approved-github-workflows',
    namespace: 'default',
    title: 'Approved GitHub Workflows Skill',
    description: 'CI/CD hardening skill',
    tags: ['security'],
    annotations: {
      'backstage.io/source-location':
        'url:https://github.com/org/repo/blob/main/skill.yaml',
      'devaihub.io/compatible-frameworks': 'cursor',
      'devaihub.io/version': '1.0.0',
    },
  },
  spec: {
    type: 'skill',
    lifecycle: 'production',
    owner: 'group:ai-platform-team',
    agents: ['github-copilot', 'claude-code'],
  },
};

const UNKNOWN_TYPE_ENTITY: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'AiResource',
  metadata: { name: 'mystery', namespace: 'default' },
  spec: { type: 'rule', lifecycle: 'experimental' },
};

const noopLogger: LoggerService = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

function makeApp({
  entities = [] as Entity[],
  credentials = async () => ({ principal: { type: 'user' } }),
}: {
  entities?: Entity[];
  credentials?: () => Promise<unknown>;
} = {}) {
  const catalog = {
    getEntities: jest.fn().mockResolvedValue({ items: entities }),
  };
  const httpAuth = { credentials: jest.fn().mockImplementation(credentials) };

  const router = createRouter({
    logger: noopLogger,
    telemetryStore: {} as any,
    telemetrySalt: 'test-salt',
    catalog: catalog as any,
    httpAuth: httpAuth as any,
    reader: { readUrl: jest.fn(), readTree: jest.fn() } as any,
  });

  const app = express();
  app.use(router);
  return { app, catalog, httpAuth };
}

describe('GET /resources', () => {
  it('maps AiResource entities to ResourceSummary items', async () => {
    const { app, catalog, httpAuth } = makeApp({ entities: [SKILL_ENTITY] });
    const res = await request(app).get('/resources');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      entityRef: 'airesource:default/approved-github-workflows',
      name: 'approved-github-workflows',
      title: 'Approved GitHub Workflows Skill',
      type: 'skill',
      lifecycle: 'production',
      owner: 'group:default/ai-platform-team',
      frameworks: ['github-copilot', 'claude-code'],
      version: '1.0.0',
      kind: 'AiResource',
      sourceLocation: 'url:https://github.com/org/repo/blob/main/skill.yaml',
    });

    // reads the catalog as the calling user (ADR-0006)
    expect(httpAuth.credentials).toHaveBeenCalled();
    expect(catalog.getEntities).toHaveBeenCalledWith(
      { filter: { kind: 'AiResource' } },
      { credentials: await httpAuth.credentials.mock.results[0].value },
    );
  });

  it('silently drops entities with an unsupported spec.type', async () => {
    const { app } = makeApp({ entities: [SKILL_ENTITY, UNKNOWN_TYPE_ENTITY] });
    const res = await request(app).get('/resources');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('approved-github-workflows');
  });

  it('returns an empty items array for an empty catalog', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/resources');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('returns 401 when the request is unauthenticated', async () => {
    const authError = new Error('Missing credentials');
    authError.name = 'AuthenticationError';
    const { app } = makeApp({ credentials: () => Promise.reject(authError) });

    const res = await request(app).get('/resources');
    expect(res.status).toBe(401);
  });

  it('returns 500 when the catalog read fails', async () => {
    const { app, catalog } = makeApp();
    catalog.getEntities.mockRejectedValue(new Error('catalog down'));

    const res = await request(app).get('/resources');
    expect(res.status).toBe(500);
  });
});
