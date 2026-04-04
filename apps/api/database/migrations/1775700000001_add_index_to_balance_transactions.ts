import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'balance_transactions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['user_id', 'created_at'], 'balance_transactions_user_id_created_at_index')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['user_id', 'created_at'], 'balance_transactions_user_id_created_at_index')
    })
  }
}
