import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_custom_exercises'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('default_sets')
      table.dropColumn('default_reps')
      table.dropColumn('default_weight')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('default_sets').nullable()
      table.integer('default_reps').nullable()
      table.decimal('default_weight', 8, 2).nullable()
    })
  }
}
