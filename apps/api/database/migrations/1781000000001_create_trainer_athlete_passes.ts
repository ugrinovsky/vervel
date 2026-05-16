import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_athlete_passes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('trainer_athlete_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trainer_athletes')
        .onDelete('CASCADE')
      table.string('title', 255).notNullable().defaultTo('Абонемент')
      table.decimal('price_amount', 10, 2).notNullable().defaultTo(0)
      table.integer('sessions_total').unsigned().notNullable()
      table.date('valid_from').notNullable()
      table.date('valid_until').nullable()
      table
        .enum('status', ['active', 'depleted', 'expired', 'cancelled'])
        .notNullable()
        .defaultTo('active')
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['trainer_athlete_id', 'status'], 'idx_passes_ta_status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
