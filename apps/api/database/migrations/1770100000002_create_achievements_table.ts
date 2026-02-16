import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'achievements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('key', 50).notNullable().unique()
      table.enum('category', ['streak', 'workout']).notNullable()

      table.string('title', 100).notNullable()
      table.text('description').notNullable()

      table.string('icon', 10).notNullable()
      table.string('color', 20).notNullable()

      table.integer('requirement_value').nullable()
      table.string('requirement_type', 30).nullable()

      table.boolean('is_active').defaultTo(true).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['category'])
      table.index(['is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
