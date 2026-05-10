import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_custom_exercises'

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
      table.string('workout_type', 50).nullable()
      table.integer('default_sets').nullable()
      table.integer('default_reps').nullable()
      table.decimal('default_weight', 8, 2).nullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.index(['trainer_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
