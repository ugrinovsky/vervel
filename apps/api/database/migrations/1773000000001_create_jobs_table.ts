import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'jobs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('type', 64).notNullable()
      table.jsonb('payload').notNullable()

      table
        .enum('status', ['queued', 'processing', 'succeeded', 'failed'])
        .notNullable()
        .defaultTo('queued')

      table.integer('attempts').notNullable().defaultTo(0)
      table.integer('max_attempts').notNullable().defaultTo(5)

      table.timestamp('run_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('locked_at', { useTz: true }).nullable()
      table.string('locked_by', 64).nullable()

      table.text('last_error').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['status', 'run_at'])
      table.index(['type', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
