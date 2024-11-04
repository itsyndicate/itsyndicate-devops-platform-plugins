exports.up = async function (knex) {
    await knex.schema.createTable('aws_resource_cache', table => {
      table.string('key').primary();
      table.text('data').notNullable();
      table.timestamp('last_updated').defaultTo(knex.fn.now()).notNullable();
    });
  };
  
  exports.down = async function (knex) {
    await knex.schema.dropTable('aws_resource_cache');
  };