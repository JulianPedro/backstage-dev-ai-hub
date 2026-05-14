/**
 * Add bundle_items column to ai_assets.
 * Stores the raw item refs for bundle-type assets as JSON: [{ref: string}].
 */

exports.up = async function up(knex) {
  await knex.schema.table('ai_assets', table => {
    table.text('bundle_items').nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.table('ai_assets', table => {
    table.dropColumn('bundle_items');
  });
};
