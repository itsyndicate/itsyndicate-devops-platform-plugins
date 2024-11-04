exports.up = async function (knex) {
  await knex.schema.createTable('terraform_resource', table => {
    table.string('id').primary(); // Primary key should be a string (ensure this matches your data)
    table.string('name').notNullable(); // Resource name
    table.string('type').notNullable(); // Resource type
    table.string('url').nullable(); // Optional URL
    table.text('dependencies').nullable(); // Using JSON for dependencies
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('terraform_resource'); // Drop the table if it exists
};
