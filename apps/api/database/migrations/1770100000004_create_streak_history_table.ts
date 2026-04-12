import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'streak_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      table.date('date').notNullable()

      table
        .enum('event_type', [
          'workout_completed',
          'streak_continued',
          'streak_broken',
          'new_record',
        ])
        .notNullable()

      table.integer('streak_value').notNullable()

      table.jsonb('metadata').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['user_id', 'date'])
      table.index(['event_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
