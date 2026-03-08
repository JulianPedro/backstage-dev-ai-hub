/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('ai_assets', table => {
    table.string('id').primary();
    table.string('provider_id').notNullable().index();
    table.string('name').notNullable().index();
    table.text('description').notNullable();
    table.string('type').notNullable().index();
    table.text('tools').notNullable(); // JSON array
    table.text('tags'); // JSON array
    table.string('author');
    table.text('icon');
    table.string('version');
    table.text('apply_to');
    table.string('model');
    table.text('content').notNullable();
    table.text('yaml_raw').notNullable();
    table.text('metadata'); // JSON object
    table.string('yaml_path').notNullable();
    table.string('md_path').notNullable();
    table.text('repo_url').notNullable();
    table.string('branch').notNullable().defaultTo('main');
    table.string('commit_sha');
    table.timestamp('synced_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('ai_asset_sync_status', table => {
    table.string('provider_id').primary();
    table.timestamp('last_sync');
    table.string('last_commit');
    table.string('status').notNullable().defaultTo('idle');
    table.text('error');
    table.integer('asset_count').defaultTo(0);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('ai_asset_sync_status');
  await knex.schema.dropTableIfExists('ai_assets');
};
