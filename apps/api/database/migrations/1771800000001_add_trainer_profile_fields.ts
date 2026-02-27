import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('bio').nullable()
      table.json('specializations').nullable()
      table.text('education').nullable()
      table.string('photo_url', 500).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('bio')
      table.dropColumn('specializations')
      table.dropColumn('education')
      table.dropColumn('photo_url')
    })
  }
}
