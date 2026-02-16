import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_athletes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('trainer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('athlete_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('invite_token', 255).nullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['trainer_id', 'athlete_id'])
      table.index(['invite_token'])
      table.index(['athlete_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
