exports.up = async function up(knex) {
  await knex.schema.createTable('aws_automatic_dashboard', table => {
    table.string('key').primary();
    table.text('data'); 
    table
      .timestamp('last_updated', { useTz: true })
      .defaultTo(knex.fn.now())
      .notNullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable('aws_automatic_dashboard');
};

