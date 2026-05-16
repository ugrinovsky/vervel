import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trainer_athlete_pass_usages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .bigInteger('pass_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trainer_athlete_passes')
        .onDelete('CASCADE')
      table
        .bigInteger('workout_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workouts')
        .onDelete('SET NULL')
      table
        .bigInteger('scheduled_workout_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('scheduled_workouts')
        .onDelete('SET NULL')
      table.timestamp('consumed_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      // Индекс для быстрого подсчёта использований
      table.index('pass_id')

      // Защита от двойного списания одной тренировки
      table.unique(['pass_id', 'workout_id'], { useConstraint: true })
      table.unique(['pass_id', 'scheduled_workout_id'], { useConstraint: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
