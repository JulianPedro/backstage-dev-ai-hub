/**
 * Tests for the v2 body resolver routes (`GET /entity/:ref/raw`, `?download`,
 * `/:filename`): caller-credentialed catalog read (ADR-0006), single-file and
 * directory bodies, entry-file selection, zip assembly (ADR-0009), and the
 * 401/404/502 error mapping.
 */

import express from 'express';
import request from 'supertest';
import type { Entity } from '@backstage/catalog-model';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { pickEntryFile } from './service/bodyResolver';

const REF = 'airesource:default/approved-github-workflows';
const ENC_REF = encodeURIComponent(REF);

function entityWithLocation(sourceLocation?: string): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'AiResource',
    metadata: {
      name: 'approved-github-workflows',
      namespace: 'default',
      annotations: sourceLocation
        ? { 'backstage.io/source-location': sourceLocation }
        : {},
    },
    spec: { type: 'skill', lifecycle: 'production' },
  };
}

const noopLogger: LoggerService = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

function treeFile(path: string, content: string) {
  return { path, content: async () => Buffer.from(content) };
}

function makeApp({
  entity,
  credentials = async () => ({ principal: { type: 'user' } }),
  readUrl = jest.fn(),
  readTree = jest.fn(),
}: {
  entity?: Entity;
  credentials?: () => Promise<unknown>;
  readUrl?: jest.Mock;
  readTree?: jest.Mock;
}) {
  const catalog = { getEntityByRef: jest.fn().mockResolvedValue(entity) };
  const httpAuth = { credentials: jest.fn().mockImplementation(credentials) };
  const reader = { readUrl, readTree };

  const router = createRouter({
    logger: noopLogger,
    store: {} as any,
    telemetryStore: {} as any,
    telemetrySalt: 'test-salt',
    syncService: {} as any,
    providers: [],
    catalog: catalog as any,
    httpAuth: httpAuth as any,
    reader: reader as any,
  });

  const app = express();
  app.use(router);
  return { app, catalog, httpAuth, reader };
}

describe('GET /entity/:ref/raw — single-file body', () => {
  const FILE_URL =
    'url:https://github.com/org/repo/blob/main-nos/examples/agents/threat-modeller.md';

  it('streams the file, reading the entity as the caller (ADR-0006)', async () => {
    const readUrl = jest.fn().mockResolvedValue({
      buffer: async () => Buffer.from('# Threat modeller'),
    });
    const { app, catalog, httpAuth } = makeApp({
      entity: entityWithLocation(FILE_URL),
      readUrl,
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.text).toBe('# Threat modeller');
    expect(res.headers['content-disposition']).toBeUndefined();
    expect(readUrl).toHaveBeenCalledWith(FILE_URL.slice('url:'.length));
    expect(catalog.getEntityByRef).toHaveBeenCalledWith(REF, {
      credentials: await httpAuth.credentials.mock.results[0].value,
    });
  });

  it('serves a JSON body (mcp-config) with its own content type', async () => {
    const readUrl = jest.fn().mockResolvedValue({
      buffer: async () => Buffer.from('{"mcpServers":{}}'),
    });
    const { app } = makeApp({
      entity: entityWithLocation(
        'url:https://github.com/org/repo/blob/main-nos/examples/mcp/grafana.json',
      ),
      readUrl,
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('adds an attachment disposition with ?download=true', async () => {
    const readUrl = jest.fn().mockResolvedValue({
      buffer: async () => Buffer.from('# Threat modeller'),
    });
    const { app } = makeApp({
      entity: entityWithLocation(FILE_URL),
      readUrl,
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw?download=true`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="threat-modeller.md"',
    );
  });
});

describe('GET /entity/:ref/raw — directory body', () => {
  const DIR_URL =
    'url:https://github.com/org/repo/tree/main-nos/examples/skills/approved-github-workflows/';

  const makeTreeApp = (files: ReturnType<typeof treeFile>[]) =>
    makeApp({
      entity: entityWithLocation(DIR_URL),
      readTree: jest.fn().mockResolvedValue({ files: async () => files }),
    });

  it('streams the entry file for viewing', async () => {
    const { app } = makeTreeApp([
      treeFile('SKILL.md', '# Approved workflows'),
      treeFile('references/checklist.md', '# Checklist'),
    ]);

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.text).toBe('# Approved workflows');
  });

  it('404s when the tree has no resolvable entry file', async () => {
    const { app } = makeTreeApp([treeFile('a.md', 'a'), treeFile('b.md', 'b')]);

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(404);
  });

  it('downloads a multi-file body as one zip (ADR-0009)', async () => {
    const { app } = makeTreeApp([
      treeFile('SKILL.md', '# Approved workflows'),
      treeFile('references/checklist.md', '# Checklist'),
    ]);

    const res = await request(app)
      .get(`/entity/${ENC_REF}/raw?download=true`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="approved-github-workflows.zip"',
    );
    // zip magic number
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK');
  });

  it('downloads a single-file tree as the plain file, not a zip', async () => {
    const { app } = makeTreeApp([treeFile('SKILL.md', '# Solo')]);

    const res = await request(app).get(`/entity/${ENC_REF}/raw?download=true`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="SKILL.md"',
    );
  });

  it('serves a named file via /raw/:filename', async () => {
    const { app } = makeTreeApp([
      treeFile('SKILL.md', '# Approved workflows'),
      treeFile('references/checklist.md', '# Checklist'),
    ]);

    const res = await request(app).get(
      `/entity/${ENC_REF}/raw/${encodeURIComponent('references/checklist.md')}`,
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe('# Checklist');
  });

  it('404s for a filename outside the tree', async () => {
    const { app } = makeTreeApp([treeFile('SKILL.md', 'x')]);

    const res = await request(app).get(
      `/entity/${ENC_REF}/raw/${encodeURIComponent('../../secrets.txt')}`,
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /entity/:ref/raw — error mapping', () => {
  it('404s when the entity is missing or not visible (ADR-0006)', async () => {
    const { app } = makeApp({ entity: undefined });
    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(404);
  });

  it('404s when the entity has no source-location', async () => {
    const { app } = makeApp({ entity: entityWithLocation(undefined) });
    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(404);
  });

  it('404s when the upstream file does not exist', async () => {
    const notFound = new Error('missing');
    notFound.name = 'NotFoundError';
    const { app } = makeApp({
      entity: entityWithLocation(
        'url:https://github.com/org/repo/blob/main-nos/x.md',
      ),
      readUrl: jest.fn().mockRejectedValue(notFound),
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(404);
  });

  it('502s when the upstream read fails', async () => {
    const { app } = makeApp({
      entity: entityWithLocation(
        'url:https://github.com/org/repo/blob/main-nos/x.md',
      ),
      readUrl: jest.fn().mockRejectedValue(new Error('rate limited')),
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(502);
  });

  it('401s when the request is unauthenticated', async () => {
    const authError = new Error('Missing credentials');
    authError.name = 'AuthenticationError';
    const { app } = makeApp({
      entity: entityWithLocation(
        'url:https://github.com/org/repo/blob/main-nos/x.md',
      ),
      credentials: () => Promise.reject(authError),
    });

    const res = await request(app).get(`/entity/${ENC_REF}/raw`);
    expect(res.status).toBe(401);
  });
});

describe('pickEntryFile', () => {
  it('picks the only markdown file', () => {
    expect(pickEntryFile(['guide.md', 'script.sh'], 'dir')).toBe('guide.md');
  });

  it('prefers SKILL.md among several markdown files', () => {
    expect(pickEntryFile(['SKILL.md', 'references/a.md'], 'dir')).toBe(
      'SKILL.md',
    );
  });

  it('falls back to the directory-named markdown file', () => {
    expect(
      pickEntryFile(['azure-devops-cli.md', 'notes/a.md'], 'azure-devops-cli'),
    ).toBe('azure-devops-cli.md');
  });

  it('returns undefined when no rule matches', () => {
    expect(pickEntryFile(['a.md', 'b.md'], 'dir')).toBeUndefined();
  });
});
