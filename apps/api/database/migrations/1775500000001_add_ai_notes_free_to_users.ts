import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.boolean('ai_notes_free').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('ai_notes_free')
    })
  }
}
