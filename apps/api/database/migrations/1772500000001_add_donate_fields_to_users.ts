import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('donate_phone', 20).nullable()
      table.string('donate_card', 20).nullable()
      table.string('donate_yookassa_link', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('donate_phone')
      table.dropColumn('donate_card')
      table.dropColumn('donate_yookassa_link')
    })
  }
}
