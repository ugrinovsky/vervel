import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('user_measurements', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .references('users.id')
        .onDelete('CASCADE')
        .notNullable()
      // Тип показателя: 'body_weight', 'body_fat_pct', 'muscle_mass', 'visceral_fat', etc.
      table.string('type', 64).notNullable()
      table.decimal('value', 8, 3).notNullable()
      table.timestamp('logged_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['user_id', 'type', 'logged_at'])
    })
  }

  async down() {
    this.schema.dropTable('user_measurements')
  }
}
