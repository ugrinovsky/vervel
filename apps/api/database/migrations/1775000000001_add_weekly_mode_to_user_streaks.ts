import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_streaks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('mode').defaultTo('simple').notNullable()
      table.integer('current_week_workouts').defaultTo(0).notNullable()
      table.date('current_week_start').nullable()
      table.boolean('current_week_completed').defaultTo(false).notNullable()
    })

    // Сбрасываем streak-счётчики: юнит изменился с дней на недели,
    // старые значения некорректны и будут сбивать логику.
    await this.db.rawQuery(
      `UPDATE user_streaks
       SET current_streak = 0,
           longest_streak = 0,
           streak_started_at = NULL,
           longest_streak_achieved_at = NULL`
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('mode')
      table.dropColumn('current_week_workouts')
      table.dropColumn('current_week_start')
      table.dropColumn('current_week_completed')
    })
  }
}
