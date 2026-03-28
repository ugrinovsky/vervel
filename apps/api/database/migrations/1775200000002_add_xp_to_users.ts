import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.integer('xp').notNullable().defaultTo(0)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('xp')
    })
  }
}
