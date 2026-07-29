/**
 * Tombstone — see 001_init.js. Added per-tool install paths to the legacy
 * `ai_assets` table, since dropped by 008.
 *
 * @param {import('knex').Knex} _knex
 */
exports.up = async function up(_knex) {};

/**
 * @param {import('knex').Knex} _knex
 */
exports.down = async function down(_knex) {};
