/**
 * Tombstone — see 001_init.js. Dropped unused columns from the legacy
 * `ai_assets` table, since dropped entirely by 008.
 *
 * @param {import('knex').Knex} _knex
 */
exports.up = async function up(_knex) {};

/**
 * @param {import('knex').Knex} _knex
 */
exports.down = async function down(_knex) {};
