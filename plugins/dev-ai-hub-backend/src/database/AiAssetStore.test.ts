import Knex from 'knex';
import { AiAssetStore } from './AiAssetStore';
import type { AiAssetInput } from '../types';

let knex: Knex.Knex;
let store: AiAssetStore;

beforeAll(async () => {
  knex = Knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  store = await AiAssetStore.create({
    database: { getClient: async () => knex } as any,
  });
});

afterAll(async () => {
  await knex.destroy();
});

beforeEach(async () => {
  await knex('ai_assets').delete();
  await knex('ai_asset_sync_status').delete();
});

function makeInput(overrides?: Partial<AiAssetInput>): AiAssetInput {
  return {
    id: 'test-id',
    providerId: 'provider-1',
    name: 'Test Asset',
    description: 'A test asset',
    type: 'instruction',
    tools: ['claude-code'],
    tags: ['testing'],
    author: 'Test Author',
    version: '1.0.0',
    content: '# Test content',
    yamlRaw: 'name: Test Asset\n',
    yamlPath: 'instructions/test.yaml',
    mdPath: 'instructions/test.md',
    repoUrl: 'https://github.com/org/repo',
    branch: 'main',
    ...overrides,
  };
}

describe('upsertAsset + getAsset', () => {
  it('inserts a new asset and retrieves it by id', async () => {
    await store.upsertAsset(makeInput());
    const asset = await store.getAsset('test-id');

    expect(asset).not.toBeNull();
    expect(asset!.id).toBe('test-id');
    expect(asset!.name).toBe('Test Asset');
    expect(asset!.description).toBe('A test asset');
    expect(asset!.type).toBe('instruction');
    expect(asset!.tools).toEqual(['claude-code']);
    expect(asset!.tags).toEqual(['testing']);
    expect(asset!.content).toBe('# Test content');
    expect(asset!.providerId).toBe('provider-1');
    expect(asset!.branch).toBe('main');
  });

  it('updates an existing asset on conflict (upsert)', async () => {
    await store.upsertAsset(makeInput({ name: 'Original Name' }));
    await store.upsertAsset(makeInput({ name: 'Updated Name' }));

    const asset = await store.getAsset('test-id');
    expect(asset!.name).toBe('Updated Name');
  });

  it('returns null for a non-existent id', async () => {
    const asset = await store.getAsset('does-not-exist');
    expect(asset).toBeNull();
  });

  it('persists optional fields correctly', async () => {
    await store.upsertAsset(
      makeInput({
        applyTo: '**/*.ts',
        model: 'claude-opus-4',
        installPath: 'custom/path.md',
        installPaths: { 'claude-code': 'custom/claude.md' },
        metadata: { mcpServers: { test: {} } },
        commitSha: 'abc123',
      }),
    );

    const asset = await store.getAsset('test-id');
    expect(asset!.applyTo).toBe('**/*.ts');
    expect(asset!.model).toBe('claude-opus-4');
    expect(asset!.installPath).toBe('custom/path.md');
    expect(asset!.installPaths).toEqual({ 'claude-code': 'custom/claude.md' });
    expect(asset!.metadata?.mcpServers).toBeDefined();
    expect(asset!.commitSha).toBe('abc123');
  });
});

describe('listAssets', () => {
  it('returns all assets when no filter is applied', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', name: 'Asset 1', type: 'instruction' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Asset 2', type: 'agent' }));

    const { items, totalCount } = await store.listAssets({ page: 1, pageSize: 20 });
    expect(totalCount).toBe(2);
    expect(items).toHaveLength(2);
  });

  it('filters by type', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', type: 'instruction' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Agent', type: 'agent' }));

    const { items, totalCount } = await store.listAssets({ type: 'agent', page: 1, pageSize: 20 });
    expect(totalCount).toBe(1);
    expect(items[0].type).toBe('agent');
  });

  it('filters by tool', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', tools: ['claude-code'] }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Copilot Asset', tools: ['github-copilot'] }));

    const { items } = await store.listAssets({ tool: 'claude-code', page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a1');
  });

  it('includes assets with tool "all" in any tool filter', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', tools: ['all'] }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Copilot Asset', tools: ['github-copilot'] }));

    const { items } = await store.listAssets({ tool: 'claude-code', page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a1');
  });

  it('filters by providerId', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', providerId: 'provider-1' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'P2 Asset', providerId: 'provider-2' }));

    const { items } = await store.listAssets({ providerId: 'provider-2', page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a2');
  });

  it('filters by search term (matches name)', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', name: 'Python Linting' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'TypeScript Config' }));

    const { items } = await store.listAssets({ search: 'Python', page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a1');
  });

  it('filters by search term (matches description)', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', description: 'Instructions for FastAPI projects' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'React Asset', description: 'Instructions for React projects' }));

    const { items } = await store.listAssets({ search: 'FastAPI', page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a1');
  });

  it('filters by tags', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', tags: ['python', 'linting'] }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'TS Asset', tags: ['typescript'] }));

    const { items } = await store.listAssets({ tags: ['python'], page: 1, pageSize: 20 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('a1');
  });

  it('respects pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await store.upsertAsset(makeInput({ id: `a${i}`, name: `Asset ${i}` }));
    }

    const { items, totalCount } = await store.listAssets({ page: 2, pageSize: 2 });
    expect(totalCount).toBe(5);
    expect(items).toHaveLength(2);
  });

  it('returns items sorted by name ascending', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', name: 'Zebra' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Apple' }));

    const { items } = await store.listAssets({ page: 1, pageSize: 20 });
    expect(items[0].name).toBe('Apple');
    expect(items[1].name).toBe('Zebra');
  });
});

describe('incrementInstallCount', () => {
  it('increments the install count by 1 on each call', async () => {
    await store.upsertAsset(makeInput());

    await store.incrementInstallCount('test-id');
    await store.incrementInstallCount('test-id');

    const asset = await store.getAsset('test-id');
    expect(asset!.installCount).toBe(2);
  });
});

describe('deleteAssetsNotIn', () => {
  it('deletes assets from a provider that are not in the keep list', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', providerId: 'p1' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Asset 2', providerId: 'p1' }));
    await store.upsertAsset(makeInput({ id: 'a3', name: 'Asset 3', providerId: 'p2' }));

    await store.deleteAssetsNotIn('p1', ['a1']);

    expect(await store.getAsset('a1')).not.toBeNull();
    expect(await store.getAsset('a2')).toBeNull();
    expect(await store.getAsset('a3')).not.toBeNull(); // different provider, untouched
  });

  it('deletes all assets for a provider when keep list is empty', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', providerId: 'p1' }));

    await store.deleteAssetsNotIn('p1', []);

    expect(await store.getAsset('a1')).toBeNull();
  });
});

describe('sync status', () => {
  it('upserts and retrieves sync status', async () => {
    await store.upsertSyncStatus({
      providerId: 'p1',
      status: 'syncing',
      assetCount: 10,
      lastSync: '2026-01-01T00:00:00Z',
      lastCommit: 'abc123',
    });

    const status = await store.getSyncStatus('p1');
    expect(status).not.toBeNull();
    expect(status!.providerId).toBe('p1');
    expect(status!.status).toBe('syncing');
    expect(status!.assetCount).toBe(10);
    expect(status!.lastSync).toBe('2026-01-01T00:00:00Z');
    expect(status!.lastCommit).toBe('abc123');
  });

  it('updates existing sync status on conflict', async () => {
    await store.upsertSyncStatus({ providerId: 'p1', status: 'idle', assetCount: 5 });
    await store.upsertSyncStatus({ providerId: 'p1', status: 'error', assetCount: 0, error: 'boom' });

    const status = await store.getSyncStatus('p1');
    expect(status!.status).toBe('error');
    expect(status!.error).toBe('boom');
    expect(status!.assetCount).toBe(0);
  });

  it('returns null for an unknown provider', async () => {
    const status = await store.getSyncStatus('unknown');
    expect(status).toBeNull();
  });

  it('getAllSyncStatuses returns statuses for all providers', async () => {
    await store.upsertSyncStatus({ providerId: 'p1', status: 'idle', assetCount: 3 });
    await store.upsertSyncStatus({ providerId: 'p2', status: 'syncing', assetCount: 7 });

    const statuses = await store.getAllSyncStatuses();
    expect(statuses).toHaveLength(2);
    const ids = statuses.map(s => s.providerId).sort();
    expect(ids).toEqual(['p1', 'p2']);
  });
});

describe('getStats', () => {
  it('returns correct totals by type, tool, and provider', async () => {
    await store.upsertAsset(makeInput({ id: 'a1', type: 'instruction', tools: ['claude-code'], providerId: 'p1' }));
    await store.upsertAsset(makeInput({ id: 'a2', name: 'Agent', type: 'agent', tools: ['github-copilot'], providerId: 'p1' }));
    await store.upsertAsset(makeInput({ id: 'a3', name: 'P2 Instruction', type: 'instruction', tools: ['claude-code'], providerId: 'p2' }));

    const stats = await store.getStats();

    expect(stats.totalAssets).toBe(3);
    expect(stats.byType.instruction).toBe(2);
    expect(stats.byType.agent).toBe(1);
    expect(stats.byType.skill).toBe(0);
    expect(stats.byTool['claude-code']).toBe(2);
    expect(stats.byTool['github-copilot']).toBe(1);
    expect(stats.byProvider.p1).toBe(2);
    expect(stats.byProvider.p2).toBe(1);
  });

  it('returns zero totals for an empty store', async () => {
    const stats = await store.getStats();

    expect(stats.totalAssets).toBe(0);
    expect(stats.byType.instruction).toBe(0);
    expect(stats.lastSync).toBeUndefined();
  });
});
