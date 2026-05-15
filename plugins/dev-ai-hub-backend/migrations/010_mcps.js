exports.up = async function up(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.text('mcps').nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('ai_assets', table => {
    table.dropColumn('mcps');
  });
};
