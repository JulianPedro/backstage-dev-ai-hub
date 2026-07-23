import Knex from 'knex';
import { TelemetryStore } from './TelemetryStore';

let knex: Knex.Knex;
let store: TelemetryStore;

beforeAll(async () => {
  knex = Knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  store = await TelemetryStore.create({
    database: { getClient: async () => knex } as any,
  });
});

afterAll(async () => {
  await knex.destroy();
});

beforeEach(async () => {
  await knex('telemetry_events').delete();
});

const REF = 'airesource:default/example-skill';

describe('getCounts', () => {
  it('returns zero counts for a ref with no events', async () => {
    await expect(store.getCounts(REF)).resolves.toEqual({
      install: 0,
      copy: 0,
      download: 0,
      view: 0,
    });
  });

  it('counts every stored event raw, per action', async () => {
    await store.record({ entityRef: REF, action: 'view', actorHash: 'h1' });
    await store.record({ entityRef: REF, action: 'view', actorHash: 'h1' });
    await store.record({ entityRef: REF, action: 'install', actorHash: 'h1' });
    await store.record({ entityRef: REF, action: 'copy', actorHash: null });
    await store.record({
      entityRef: REF,
      action: 'download',
      actorHash: 'h2',
      tool: 'claude-code',
    });

    await expect(store.getCounts(REF)).resolves.toEqual({
      install: 1,
      copy: 1,
      download: 1,
      view: 2,
    });
  });

  it('does not mix counts across different resources', async () => {
    await store.record({ entityRef: REF, action: 'view', actorHash: 'h1' });
    await store.record({
      entityRef: 'airesource:default/other',
      action: 'view',
      actorHash: 'h1',
    });

    await expect(store.getCounts(REF)).resolves.toMatchObject({ view: 1 });
  });

  it('stores every write unconditionally — repeat events are never rejected or deduped at write time', async () => {
    for (let i = 0; i < 3; i++) {
      await store.record({
        entityRef: REF,
        action: 'install',
        actorHash: 'h1',
      });
    }
    await expect(store.getCounts(REF)).resolves.toMatchObject({ install: 3 });
  });
});
