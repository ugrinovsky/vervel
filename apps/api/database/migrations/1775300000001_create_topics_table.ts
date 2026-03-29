import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'topics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trainer_groups')
        .onDelete('CASCADE')
      table
        .integer('chat_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('chats')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable().defaultTo('Общий')
      table.string('emoji', 10).nullable()
      table.integer('order').unsigned().notNullable().defaultTo(0)
      table.boolean('is_default').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['group_id'])
      table.unique(['chat_id'])
    })

    // Backfill: wrap every existing group chat as the default topic
    this.defer(async (db) => {
      const groupChats = await db
        .from('chats')
        .where('type', 'group')
        .whereNotNull('group_id')
        .select('id', 'group_id')

      if (groupChats.length === 0) return

      await db.table('topics').multiInsert(
        groupChats.map((chat: { id: number; group_id: number }) => ({
          group_id: chat.group_id,
          chat_id: chat.id,
          name: 'Общий',
          emoji: '💬',
          order: 0,
          is_default: true,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
