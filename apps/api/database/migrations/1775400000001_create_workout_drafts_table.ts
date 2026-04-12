import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateWorkoutDraftsTable extends BaseSchema {
  protected tableName = 'workout_drafts'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.jsonb('payload').notNullable()
      table.timestamps(true, true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
