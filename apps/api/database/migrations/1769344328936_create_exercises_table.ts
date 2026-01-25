import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'exercises';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary();

      table.string('title').notNullable();

      table.jsonb('keywords').notNullable();
      table.jsonb('zones').notNullable();

      table.decimal('intensity', 3, 2).notNullable().checkBetween([0, 1]);

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
