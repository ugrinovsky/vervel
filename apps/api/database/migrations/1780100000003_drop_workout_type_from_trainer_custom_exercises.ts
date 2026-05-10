import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_custom_exercises'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('workout_type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('workout_type', 50).nullable()
    })
  }
}
