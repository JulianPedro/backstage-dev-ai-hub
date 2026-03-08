/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.integer('install_count').notNullable().defaultTo(0);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.dropColumn('install_count');
  });
};
