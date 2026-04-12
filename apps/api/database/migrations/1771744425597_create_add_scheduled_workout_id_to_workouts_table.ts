import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workouts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('scheduled_workout_id')
        .nullable()
        .references('id')
        .inTable('scheduled_workouts')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('scheduled_workout_id')
    })
  }
}
