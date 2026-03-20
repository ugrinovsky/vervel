import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_athletes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('nickname', 100).nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('nickname')
    })
  }
}
