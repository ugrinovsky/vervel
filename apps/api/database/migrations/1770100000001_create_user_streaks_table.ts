import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_streaks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .references('users.id')
        .onDelete('CASCADE')
        .notNullable()
        .unique()

      table.integer('current_streak').defaultTo(0).notNullable()
      table.integer('longest_streak').defaultTo(0).notNullable()
      table.date('last_workout_date').nullable()

      table.timestamp('streak_started_at', { useTz: true }).nullable()
      table.timestamp('longest_streak_achieved_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
