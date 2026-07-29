import Knex from 'knex';
import { TelemetryStore } from './TelemetryStore';

/**
 * Upgrade-path guard. Migrations 001–006 were deleted from the repository
 * while still present in published 0.2.x, so every database that had run them
 * carried rows in `knex_migrations` naming files that no longer existed. knex
 * validates that list on `migrate.latest()` and throws "The migration
 * directory is corrupt", which took the backend down at boot on upgrade.
 *
 * The six files are back as tombstones. These tests pin both directions:
 * a database that already ran them must still start, and a fresh one must
 * still end up with the real schema.
 */

const LEGACY_MIGRATIONS = [
  '001_init.js',
  '002_install_count.js',
  '003_install_paths.js',
  '004_label.js',
  '005_remove_unused_fields.js',
  '006_resources_content.js',
];

const newDb = () =>
  Knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

/** Stand in for a 0.2.x database: legacy tables plus their migration rows. */
async function seedLegacyDatabase(knex: Knex.Knex) {
  await knex.schema.createTable('ai_assets', table => {
    table.string('id').primary();
  });
  await knex.schema.createTable('ai_asset_sync_status', table => {
    table.string('provider_id').primary();
  });
  await knex.schema.createTable('knex_migrations', table => {
    table.increments('id').primary();
    table.string('name');
    table.integer('batch');
    table.timestamp('migration_time');
  });
  await knex('knex_migrations').insert(
    LEGACY_MIGRATIONS.map((name, index) => ({
      name,
      batch: index + 1,
      migration_time: new Date().toISOString(),
    })),
  );
}

describe('migrating a database from a published 0.2.x release', () => {
  let knex: Knex.Knex;

  beforeEach(async () => {
    knex = newDb();
    await seedLegacyDatabase(knex);
  });

  afterEach(async () => {
    await knex.destroy();
  });

  it('starts up instead of failing on a corrupt migration directory', async () => {
    await expect(
      TelemetryStore.create({
        database: { getClient: async () => knex } as any,
      }),
    ).resolves.toBeDefined();
  });

  it('drops the legacy tables and creates the telemetry schema', async () => {
    await TelemetryStore.create({
      database: { getClient: async () => knex } as any,
    });

    await expect(knex.schema.hasTable('ai_assets')).resolves.toBe(false);
    await expect(knex.schema.hasTable('ai_asset_sync_status')).resolves.toBe(
      false,
    );
    await expect(knex.schema.hasTable('telemetry_events')).resolves.toBe(true);
    await expect(knex.schema.hasTable('telemetry_settings')).resolves.toBe(
      true,
    );
  });

  it('keeps the legacy migration rows, so a later run stays consistent', async () => {
    const database = { getClient: async () => knex } as any;
    await TelemetryStore.create({ database });

    // A second boot over the same database must not re-trip validation.
    await expect(TelemetryStore.create({ database })).resolves.toBeDefined();

    const names = await knex('knex_migrations').pluck('name');
    expect(names).toEqual(expect.arrayContaining(LEGACY_MIGRATIONS));
  });
});

describe('migrating a fresh database', () => {
  let knex: Knex.Knex;

  beforeEach(() => {
    knex = newDb();
  });

  afterEach(async () => {
    await knex.destroy();
  });

  it('records the tombstones and creates the telemetry schema', async () => {
    await TelemetryStore.create({
      database: { getClient: async () => knex } as any,
    });

    await expect(knex.schema.hasTable('telemetry_events')).resolves.toBe(true);
    await expect(knex.schema.hasTable('telemetry_settings')).resolves.toBe(
      true,
    );
    // The tombstones must run on a fresh database too, or its migration list
    // diverges from an upgraded one and the two stop being interchangeable.
    const names = await knex('knex_migrations').pluck('name');
    expect(names).toEqual(expect.arrayContaining(LEGACY_MIGRATIONS));
  });

  it('leaves no legacy tables behind', async () => {
    await TelemetryStore.create({
      database: { getClient: async () => knex } as any,
    });

    await expect(knex.schema.hasTable('ai_assets')).resolves.toBe(false);
  });
});
