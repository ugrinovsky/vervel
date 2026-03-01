import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'balance_transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      // Positive = credit (topup/bonus), negative = charge
      table.decimal('amount', 10, 2).notNullable()
      table.decimal('balance_after', 10, 2).notNullable()
      table.enum('type', ['charge', 'topup', 'bonus', 'refund', 'donation']).notNullable()
      table.string('description', 255).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
