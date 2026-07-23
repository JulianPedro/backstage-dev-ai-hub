/**
 * Telemetry event log (ADR-0007): one row per install/copy/download/view
 * event, store-all — no write-time dedup or unique constraint. `day` is the
 * UTC calendar day computed by the application at write time, not derived
 * from `occurred_at` at read time, so dedup queries stay identical across
 * sqlite (dev) and Postgres (prod) without DB-specific date functions.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('telemetry_events', table => {
    table.increments('id').primary();
    table.string('entity_ref').notNullable();
    table.string('action').notNullable();
    table.string('actor_hash').nullable();
    table.string('tool').nullable();
    table.string('day').notNullable();
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    table.index(['entity_ref', 'action']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('telemetry_events');
};
