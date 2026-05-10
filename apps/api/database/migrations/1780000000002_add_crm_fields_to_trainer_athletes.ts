import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_athletes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('crm_status', 20).notNullable().defaultTo('active')
      table.text('crm_note').nullable()
      table.timestamp('next_follow_up_at', { useTz: true }).nullable()
      table.timestamp('crm_status_changed_at', { useTz: true }).nullable()

      table.index(['trainer_id', 'crm_status'])
      table.index(['trainer_id', 'next_follow_up_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['trainer_id', 'next_follow_up_at'])
      table.dropIndex(['trainer_id', 'crm_status'])
      table.dropColumn('crm_status_changed_at')
      table.dropColumn('next_follow_up_at')
      table.dropColumn('crm_note')
      table.dropColumn('crm_status')
    })
  }
}
