import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddRpeToWorkouts extends BaseSchema {
  protected tableName = 'workouts'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('rpe').nullable().checkBetween([1, 10])
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('rpe')
    })
  }
}
