import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('group_athletes', (table) => {
      table.index(['athlete_id'])
    })
  }

  async down() {
    this.schema.table('group_athletes', (table) => {
      table.dropIndex(['athlete_id'])
    })
  }
}
