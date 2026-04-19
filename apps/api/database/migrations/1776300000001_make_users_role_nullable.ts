import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * OAuth / VK Mini App создают пользователя без роли до экрана /select-role.
 * Ранее в коде передавался role: null при NOT NULL в схеме — в PG это давало 500.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 20).nullable().alter()
    })
  }

  async down() {
    await this.db.rawQuery(`UPDATE ${this.tableName} SET role = 'athlete' WHERE role IS NULL`)
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 20).notNullable().alter()
    })
  }
}
