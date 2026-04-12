import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'push_subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('endpoint').notNullable()
      table.string('p256dh', 512).notNullable()
      table.string('auth', 256).notNullable()
      table.timestamp('created_at').notNullable()
      // endpoint is unique per device/browser
      table.unique(['endpoint'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
