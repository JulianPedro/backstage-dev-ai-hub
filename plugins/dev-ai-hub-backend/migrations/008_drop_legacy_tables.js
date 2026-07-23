/**
 * Tear down the legacy asset-store silo (issue #34). `ai_assets` and
 * `ai_asset_sync_status` were created by 001_init.js (since-deleted); every
 * capability they backed is now served from the catalog (ADR-0001). Nothing
 * else depends on these tables, including `telemetry_events` (007).
 *
 * This is irreversible: recreating the exact legacy schema in `down()`
 * would resurrect dead code paths that no longer exist.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.dropTableIfExists('ai_asset_sync_status');
  await knex.schema.dropTableIfExists('ai_assets');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down() {
  throw new Error(
    '008_drop_legacy_tables is irreversible — the legacy asset-store schema is gone from the codebase.',
  );
};
