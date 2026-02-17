import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'workout_templates'

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
      table.enum('workout_type', ['crossfit', 'bodybuilding', 'cardio']).notNullable()
      table.json('exercises').notNullable()
      table.text('description').nullable()
      table.boolean('is_public').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['trainer_id'])
      table.index(['workout_type'])
      table.index(['is_public'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
