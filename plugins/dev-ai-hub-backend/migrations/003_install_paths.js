/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.text('install_path').nullable();
    table.text('install_paths').nullable(); // JSON map: { tool: path }
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.dropColumn('install_path');
    table.dropColumn('install_paths');
  });
};
