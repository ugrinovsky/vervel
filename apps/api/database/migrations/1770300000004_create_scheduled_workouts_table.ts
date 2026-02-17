import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scheduled_workouts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('trainer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('scheduled_date').notNullable()
      table.json('workout_data').notNullable()
      table.json('assigned_to').notNullable()
      table
        .enum('status', ['scheduled', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('scheduled')
      table.text('notes').nullable()
      table
        .integer('template_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_templates')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['trainer_id'])
      table.index(['scheduled_date'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
