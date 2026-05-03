import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * ИИ-чат: type = 'ai' без ALTER TYPE ADD VALUE.
 * Колонка chats.type → text + CHECK (group | personal | ai).
 * Старый PostgreSQL enum-тип (напр. public.chats_type) остаётся в каталоге, но не используется.
 */
export default class extends BaseSchema {
  async up() {
    await db.rawQuery(`
      ALTER TABLE chats
      ALTER COLUMN type TYPE text
      USING (type::text)
    `)

    await db.rawQuery(`
      DO $c$
      BEGIN
        ALTER TABLE chats ADD CONSTRAINT chats_type_values_chk
          CHECK (type IN ('group', 'personal', 'ai'));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $c$;
    `)

    await db.rawQuery(`
      ALTER TABLE chats
      ADD COLUMN IF NOT EXISTS owner_user_id INTEGER NULL
      REFERENCES users(id) ON DELETE CASCADE
    `)

    await db.rawQuery(`ALTER TABLE chats ALTER COLUMN trainer_id DROP NOT NULL`)

    await db.rawQuery(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false
    `)
    await db.rawQuery(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS ai_charge DECIMAL(10, 2) NULL
    `)

    await db.rawQuery(`ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL`)

    await db.rawQuery(`
      DO $c$
      BEGIN
        ALTER TABLE messages ADD CONSTRAINT messages_sender_ai_chk CHECK (
          (ai_generated = false AND sender_id IS NOT NULL)
          OR
          (ai_generated = true AND sender_id IS NULL)
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $c$;
    `)

    await db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS chats_ai_owner_unique
      ON chats (owner_user_id)
      WHERE (type = 'ai')
    `)
  }

  async down() {
    await db.rawQuery(`DROP INDEX IF EXISTS chats_ai_owner_unique`)
    await db.rawQuery(`DELETE FROM chats WHERE type = 'ai'`)

    await db.rawQuery(`
      ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_ai_chk
    `)

    await db.rawQuery(`
      ALTER TABLE messages ALTER COLUMN sender_id SET NOT NULL
    `)

    await db.rawQuery(`ALTER TABLE messages DROP COLUMN IF EXISTS ai_charge`)
    await db.rawQuery(`ALTER TABLE messages DROP COLUMN IF EXISTS ai_generated`)

    await db.rawQuery(`ALTER TABLE chats DROP COLUMN IF EXISTS owner_user_id`)

    await db.rawQuery(`
      ALTER TABLE chats ALTER COLUMN trainer_id SET NOT NULL
    `)

    await db.rawQuery(`
      ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_type_values_chk
    `)

    // Вернуть колонку к исходному enum (имя типа создаёт Knex: обычно chats_type).
    await db.rawQuery(`
      ALTER TABLE chats
      ALTER COLUMN type TYPE chats_type
      USING (type::chats_type)
    `)
  }
}
