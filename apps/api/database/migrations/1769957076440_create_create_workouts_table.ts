import { BaseSchema } from '@adonisjs/lucid/schema';

export default class Workouts extends BaseSchema {
  protected tableName = 'workouts';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable();

      table.timestamp('date', { useTz: true }).notNullable();

      table
        .enum('workout_type', ['crossfit', 'bodybuilding', 'cardio'])
        .defaultTo('bodybuilding');

      table.jsonb('exercises').notNullable();
      table.jsonb('zones_load').nullable();

      table.decimal('total_intensity', 5, 2).nullable();
      table.decimal('total_volume', 10, 2).nullable();

      table.text('notes').nullable();

      table.timestamps(true, true);

      table.index(['user_id', 'date'], 'workouts_user_date_idx');
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
