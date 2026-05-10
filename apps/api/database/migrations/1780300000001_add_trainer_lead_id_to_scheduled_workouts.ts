import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scheduled_workouts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('trainer_lead_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('trainer_leads')
        .onDelete('SET NULL')

      table.index(['trainer_lead_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['trainer_lead_id'])
      table.dropColumn('trainer_lead_id')
    })
  }
}
