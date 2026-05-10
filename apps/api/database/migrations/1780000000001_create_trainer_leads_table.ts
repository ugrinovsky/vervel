import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_leads'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('trainer_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('phone', 64).notNullable()
      table.string('email', 255).nullable()
      table.string('source', 100).nullable()
      table.string('crm_status', 20).notNullable().defaultTo('new')
      table.text('note').nullable()
      table.timestamp('next_follow_up_at', { useTz: true }).nullable()
      table
        .integer('converted_athlete_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['trainer_id', 'crm_status'])
      table.index(['trainer_id', 'next_follow_up_at'])
      table.index(['converted_athlete_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
