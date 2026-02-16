import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'oauth_providers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('provider', ['vk', 'yandex']).notNullable()
      table.string('provider_user_id').notNullable()
      table.text('access_token').nullable()
      table.text('refresh_token').nullable()
      table.timestamp('expires_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Один аккаунт провайдера = один user
      table.unique(['provider', 'provider_user_id'])

      // Один user может иметь несколько провайдеров (VK + Yandex)
      table.index(['user_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
