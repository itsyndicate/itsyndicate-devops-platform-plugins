exports.up = async function up(knex) {
  await knex.schema.createTable('user_links', (table) => {
    table.increments('id').primary();  // Auto-incrementing ID
    table.string('user_id').notNullable();  // The ID of the user
    table.string('link').notNullable();  // The actual link
    table.string('name').notNullable().defaultTo('Unnamed Link');
    table.string('description').nullable();  // Optional description
    table.timestamps(true, true);  // created_at and updated_at timestamps
  });
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_links');
}
