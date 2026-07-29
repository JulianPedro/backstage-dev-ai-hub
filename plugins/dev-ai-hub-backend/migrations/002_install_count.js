/**
 * Tombstone — see 001_init.js. Added an install counter to the legacy
 * `ai_assets` table, since dropped by 008; telemetry (007) replaced it.
 *
 * @param {import('knex').Knex} _knex
 */
exports.up = async function up(_knex) {};

/**
 * @param {import('knex').Knex} _knex
 */
exports.down = async function down(_knex) {};
