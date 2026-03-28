import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      ALTER TABLE achievements
        DROP CONSTRAINT IF EXISTS achievements_category_check,
        ADD CONSTRAINT achievements_category_check
          CHECK (category IN ('streak', 'workout', 'usage', 'social', 'progress'))
    `)
  }

  async down() {
    await this.db.rawQuery(`
      ALTER TABLE achievements
        DROP CONSTRAINT IF EXISTS achievements_category_check,
        ADD CONSTRAINT achievements_category_check
          CHECK (category IN ('streak', 'workout', 'usage', 'social'))
    `)
  }
}
