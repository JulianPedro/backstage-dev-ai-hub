/**
 * Tombstone. This migration created the legacy `ai_assets` and
 * `ai_asset_sync_status` tables; 008 drops them and the code behind them is
 * gone (ADR-0001). The file stays, deliberately empty, because knex validates
 * that every migration recorded in `knex_migrations` is still present on disk
 * and throws "The migration directory is corrupt" when one is not. Deleting
 * these six files broke startup for every database that had already run them.
 *
 * Do not delete a migration file. Supersede it with a new one, as 008 does.
 *
 * @param {import('knex').Knex} _knex
 */
exports.up = async function up(_knex) {};

/**
 * @param {import('knex').Knex} _knex
 */
exports.down = async function down(_knex) {};
