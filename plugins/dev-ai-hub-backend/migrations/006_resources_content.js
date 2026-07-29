/**
 * Tombstone — see 001_init.js. Added resource-content storage to the legacy
 * `ai_assets` table, since dropped by 008. Bodies now resolve on demand from
 * each entity's source-location and are never stored (ADR-0001/0002).
 *
 * @param {import('knex').Knex} _knex
 */
exports.up = async function up(_knex) {};

/**
 * @param {import('knex').Knex} _knex
 */
exports.down = async function down(_knex) {};
