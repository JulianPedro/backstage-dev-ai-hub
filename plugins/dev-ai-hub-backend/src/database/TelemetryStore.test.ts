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

/**
 * A view recorded on a given calendar day. `record` always stamps today, so
 * spreading events across days — the axis `view` dedup turns on — needs a
 * direct write.
 */
const recordViewOn = (day: string, actorHash: string | null, ref = REF) =>
  knex('telemetry_events').insert({
    entity_ref: ref,
    action: 'view',
    actor_hash: actorHash,
    tool: null,
    day,
    occurred_at: `${day}T09:00:00.000Z`,
  });

describe('resolveSalt', () => {
  beforeEach(async () => {
    await knex('telemetry_settings').delete();
  });

  it('generates and persists a salt when none is configured', async () => {
    const salt = await store.resolveSalt();

    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    await expect(
      knex('telemetry_settings').where('key', 'actor_salt').first('value'),
    ).resolves.toEqual({ value: salt });
  });

  it('returns the same salt on every call, so hashes survive restarts', async () => {
    const first = await store.resolveSalt();

    // A second store over the same database stands in for a restart.
    const restarted = await TelemetryStore.create({
      database: { getClient: async () => knex } as any,
    });

    await expect(restarted.resolveSalt()).resolves.toBe(first);
  });

  it('prefers a configured salt and does not persist it', async () => {
    await expect(store.resolveSalt('from-config')).resolves.toBe('from-config');
    await expect(
      knex('telemetry_settings').where('key', 'actor_salt').first('value'),
    ).resolves.toBeUndefined();
  });

  it('keeps the stored salt when a configured one is supplied later', async () => {
    const generated = await store.resolveSalt();

    await expect(store.resolveSalt('from-config')).resolves.toBe('from-config');
    await expect(store.resolveSalt()).resolves.toBe(generated);
  });
});

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

  it('counts every view of a resource, including repeats by the same user on one day', async () => {
    await recordViewOn('2026-07-01', 'h1');
    await recordViewOn('2026-07-01', 'h1');
    await recordViewOn('2026-07-01', 'h1');

    await expect(store.getCounts(REF)).resolves.toMatchObject({ view: 3 });
  });

  it('is a lifetime total — old days keep counting and never roll off', async () => {
    // Two users, one view each per day, spread across three months.
    const days = ['2026-01-04', '2026-02-17', '2026-06-30', '2026-07-01'];
    for (const day of days) {
      await recordViewOn(day, 'h1');
      await recordViewOn(day, 'h2');
    }

    await expect(store.getCounts(REF)).resolves.toMatchObject({
      view: days.length * 2,
    });
  });

  it('counts views with and without an actor hash alike', async () => {
    await recordViewOn('2026-07-01', null);
    await recordViewOn('2026-07-01', null);
    await recordViewOn('2026-07-01', 'h1');

    await expect(store.getCounts(REF)).resolves.toMatchObject({ view: 3 });
  });

  it('does not mix counts across different resources', async () => {
    await recordViewOn('2026-07-01', 'h1');
    await recordViewOn('2026-07-01', 'h1', 'airesource:default/other');
    await recordViewOn('2026-07-02', 'h1', 'airesource:default/other');

    await expect(store.getCounts(REF)).resolves.toMatchObject({ view: 1 });
    await expect(
      store.getCounts('airesource:default/other'),
    ).resolves.toMatchObject({ view: 2 });
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
