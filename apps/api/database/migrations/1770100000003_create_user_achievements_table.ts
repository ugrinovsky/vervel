import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_achievements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('user_id').unsigned().references('users.id').onDelete('CASCADE').notNullable()

      table
        .integer('achievement_id')
        .unsigned()
        .references('achievements.id')
        .onDelete('CASCADE')
        .notNullable()

      table.timestamp('unlocked_at', { useTz: true }).notNullable()
      table.boolean('is_seen').defaultTo(false).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.unique(['user_id', 'achievement_id'])
      table.index(['user_id'])
      table.index(['achievement_id'])
      table.index(['unlocked_at'])
      table.index(['is_seen'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
