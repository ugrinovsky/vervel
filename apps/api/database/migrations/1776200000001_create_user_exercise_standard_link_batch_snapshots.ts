import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS user_exercise_standard_link_batch_snapshots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        touches_json JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS user_ex_std_link_snap_user_idx
      ON user_exercise_standard_link_batch_snapshots (user_id, created_at DESC)
    `)
  }

  async down() {
    await this.db.rawQuery('DROP TABLE IF EXISTS user_exercise_standard_link_batch_snapshots')
  }
}
