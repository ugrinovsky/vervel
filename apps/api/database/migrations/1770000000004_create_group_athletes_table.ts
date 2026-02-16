import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'group_athletes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trainer_groups')
        .onDelete('CASCADE')
      table
        .integer('athlete_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()

      table.unique(['group_id', 'athlete_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
