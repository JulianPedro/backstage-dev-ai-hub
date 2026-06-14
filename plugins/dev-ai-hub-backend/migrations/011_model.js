/**
 * Re-add the model column to ai_assets.
 * Previously removed in 005 (was expected to live in .md content),
 * now restored as an explicit optional envelope field for cross-tool consistency.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.table('ai_assets', table => {
    table.text('model').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.table('ai_assets', table => {
    table.dropColumn('model');
  });
};
