/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('mcp_catalog_entries', table => {
    table.string('id').notNullable();
    table.string('provider_id').notNullable();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('icon').nullable();
    table.string('type').notNullable(); // 'http' | 'stdio'
    table.string('url').nullable();
    table.string('command').nullable();
    table.text('args').nullable();    // JSON array
    table.text('env').nullable();     // JSON object
    table.string('updated_at').notNullable();
    table.primary(['id', 'provider_id']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('mcp_catalog_entries');
};
