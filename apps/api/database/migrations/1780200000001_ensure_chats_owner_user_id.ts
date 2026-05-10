import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Идемпотентно гарантирует колонку owner_user_id для ИИ-чатов (type = 'ai').
 * Дублирует шаг из 1779200000001 на случай БД без этой колонки (частично применённые/старые схемы).
 */
export default class extends BaseSchema {
  async up() {
    await db.rawQuery(`
      ALTER TABLE chats
      ADD COLUMN IF NOT EXISTS owner_user_id INTEGER NULL
      REFERENCES users(id) ON DELETE CASCADE
    `)
    await db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS chats_ai_owner_unique
      ON chats (owner_user_id)
      WHERE (type = 'ai')
    `)
  }

  async down() {
    // Колонка может существовать с 1779200000001 — откат только индекса «на всякий случай».
    await db.rawQuery(`DROP INDEX IF EXISTS chats_ai_owner_unique`)
  }
}
