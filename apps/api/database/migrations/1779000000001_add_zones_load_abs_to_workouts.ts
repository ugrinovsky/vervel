import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workouts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('zones_load_abs').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('zones_load_abs')
    })
  }
}
