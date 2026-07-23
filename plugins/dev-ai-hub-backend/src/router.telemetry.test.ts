/**
 * Tests for `POST /telemetry` and `GET /telemetry/:ref`: request validation,
 * entity-ref existence check on write, and auth gating (ADR-0005/0007).
 */

import express from 'express';
import request from 'supertest';
import type { Entity } from '@backstage/catalog-model';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

const ENTITY: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'AiResource',
  metadata: { name: 'example-skill', namespace: 'default' },
  spec: { type: 'skill', lifecycle: 'production' },
};
const REF = 'airesource:default/example-skill';

const noopLogger: LoggerService = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

function makeApp({
  entityFound = true,
  credentials = async () => ({
    principal: { type: 'user', userEntityRef: 'user:default/jdoe' },
  }),
}: {
  entityFound?: boolean;
  credentials?: () => Promise<unknown>;
} = {}) {
  const catalog = {
    getEntityByRef: jest
      .fn()
      .mockResolvedValue(entityFound ? ENTITY : undefined),
  };
  const httpAuth = { credentials: jest.fn().mockImplementation(credentials) };
  const telemetryStore = {
    record: jest.fn().mockResolvedValue(undefined),
    getCounts: jest
      .fn()
      .mockResolvedValue({ install: 1, copy: 2, download: 3, view: 4 }),
  };

  const router = createRouter({
    logger: noopLogger,
    telemetryStore: telemetryStore as any,
    telemetrySalt: 'test-salt',
    catalog: catalog as any,
    httpAuth: httpAuth as any,
    reader: { readUrl: jest.fn(), readTree: jest.fn() } as any,
  });

  const app = express();
  app.use(router);
  return { app, catalog, httpAuth, telemetryStore };
}

describe('POST /telemetry', () => {
  it('records a valid event and returns 204', async () => {
    const { app, telemetryStore } = makeApp();
    const res = await request(app)
      .post('/telemetry')
      .send({ ref: REF, action: 'view' });

    expect(res.status).toBe(204);
    expect(telemetryStore.record).toHaveBeenCalledWith({
      entityRef: REF,
      action: 'view',
      actorHash: expect.any(String),
      tool: undefined,
    });
  });

  it('passes through an optional tool', async () => {
    const { app, telemetryStore } = makeApp();
    await request(app)
      .post('/telemetry')
      .send({ ref: REF, action: 'install', tool: 'claude-code' });

    expect(telemetryStore.record).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'claude-code' }),
    );
  });

  it('rejects an invalid action with 400 and does not write', async () => {
    const { app, telemetryStore } = makeApp();
    const res = await request(app)
      .post('/telemetry')
      .send({ ref: REF, action: 'delete' });

    expect(res.status).toBe(400);
    expect(telemetryStore.record).not.toHaveBeenCalled();
  });

  it('returns 404 when the ref is not a real catalog entity', async () => {
    const { app, telemetryStore } = makeApp({ entityFound: false });
    const res = await request(app)
      .post('/telemetry')
      .send({ ref: REF, action: 'view' });

    expect(res.status).toBe(404);
    expect(telemetryStore.record).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const authError = new Error('Missing credentials');
    authError.name = 'AuthenticationError';
    const { app } = makeApp({ credentials: () => Promise.reject(authError) });

    const res = await request(app)
      .post('/telemetry')
      .send({ ref: REF, action: 'view' });
    expect(res.status).toBe(401);
  });

  it('records actorHash: null for a non-user (service) principal', async () => {
    const { app, telemetryStore } = makeApp({
      credentials: async () => ({
        principal: { type: 'service', subject: 'plugin:catalog' },
      }),
    });
    await request(app).post('/telemetry').send({ ref: REF, action: 'view' });

    expect(telemetryStore.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorHash: null }),
    );
  });
});

describe('GET /telemetry/:ref', () => {
  it('returns raw counts for all four actions', async () => {
    const { app } = makeApp();
    const res = await request(app).get(`/telemetry/${encodeURIComponent(REF)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ install: 1, copy: 2, download: 3, view: 4 });
  });

  it('returns 401 when unauthenticated', async () => {
    const authError = new Error('Missing credentials');
    authError.name = 'AuthenticationError';
    const { app } = makeApp({ credentials: () => Promise.reject(authError) });

    const res = await request(app).get(`/telemetry/${encodeURIComponent(REF)}`);
    expect(res.status).toBe(401);
  });

  it('returns 500 when the store read fails', async () => {
    const { app, telemetryStore } = makeApp();
    telemetryStore.getCounts.mockRejectedValue(new Error('db down'));

    const res = await request(app).get(`/telemetry/${encodeURIComponent(REF)}`);
    expect(res.status).toBe(500);
  });
});
