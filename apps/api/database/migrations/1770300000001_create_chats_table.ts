import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.enum('type', ['group', 'personal']).notNullable()
      table
        .integer('trainer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('group_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('trainer_groups')
        .onDelete('CASCADE')
      table
        .integer('athlete_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['trainer_id'])
      table.index(['group_id'])
      table.index(['athlete_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
