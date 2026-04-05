import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Идемпотентно: повторный запуск не падает, если таблицы уже есть (обрыв миграции, старый volume).
 * Используем raw SQL с IF NOT EXISTS — надёжнее, чем schema.hasTable в некоторых окружениях.
 */
export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS user_exercise_standards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        catalog_exercise_id VARCHAR(512) NULL,
        display_label VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS user_exercise_standards_user_id_index
      ON user_exercise_standards (user_id)
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS user_exercise_standard_aliases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_exercise_id VARCHAR(512) NOT NULL,
        standard_id INTEGER NOT NULL REFERENCES user_exercise_standards(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_exercise_standard_aliases_user_source_unique
      ON user_exercise_standard_aliases (user_id, source_exercise_id)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS user_exercise_standard_aliases_user_id_index
      ON user_exercise_standard_aliases (user_id)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS user_exercise_standard_aliases_standard_id_index
      ON user_exercise_standard_aliases (standard_id)
    `)

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_exercise_standards_user_catalog_unique
      ON user_exercise_standards (user_id, catalog_exercise_id)
      WHERE catalog_exercise_id IS NOT NULL
    `)
  }

  async down() {
    await this.db.rawQuery('DROP INDEX IF EXISTS user_exercise_standards_user_catalog_unique')
    await this.db.rawQuery('DROP TABLE IF EXISTS user_exercise_standard_aliases')
    await this.db.rawQuery('DROP TABLE IF EXISTS user_exercise_standards')
  }
}
