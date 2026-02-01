import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'workouts';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE');

      table.date('date').notNullable();

      table.enum('workout_type', ['crossfit', 'bodybuilding', 'mixed']).defaultTo('bodybuilding');
      table.jsonb('exercises').notNullable();
      table.jsonb('zones_load').nullable();

      table.decimal('total_intensity', 3, 2).nullable();
      table.integer('total_volume').nullable();

      table.text('notes').nullable();

      table.timestamps(true, true);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
