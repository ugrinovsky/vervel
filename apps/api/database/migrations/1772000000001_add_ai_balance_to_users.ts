import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // General wallet balance — AI features, donations, etc.
      // Default = 50 — welcome bonus for all users
      table.decimal('balance', 10, 2).notNullable().defaultTo(50)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('balance')
    })
  }
}
