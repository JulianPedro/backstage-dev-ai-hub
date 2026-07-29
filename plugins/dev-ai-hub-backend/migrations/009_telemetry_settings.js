/**
 * Plugin-owned settings, holding the telemetry actor salt (ADR-0007, issue
 * #56). The salt must be *stable* — a per-process value breaks per-day dedup
 * across restarts — but it does not have to come from config: generating it
 * once and persisting it here gives stability without making a missing config
 * value fail the backend's startup.
 *
 * A key/value shape rather than a single-column table so a second plugin-level
 * setting does not need a migration of its own.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('telemetry_settings', table => {
    table.string('key').primary();
    table.string('value').notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('telemetry_settings');
};
