import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exercise_anatomy_cache'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('normalized_label', 512).notNullable().unique()
      table.string('status', 16).notNullable()
      table.jsonb('zones').nullable()
      table.string('prompt_version', 32).notNullable()
      table.string('model_id', 128).nullable()
      table.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
