import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

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
      // Unique ID from YooKassa
      table.string('yookassa_payment_id', 64).notNullable().unique()
      table.decimal('amount', 10, 2).notNullable()
      table.enum('status', ['pending', 'succeeded', 'canceled']).notNullable().defaultTo('pending')
      // UUID for idempotency on retries
      table.string('idempotency_key', 64).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
