import db from '@adonisjs/lucid/services/db'

export interface DialogItem {
  chatId: number
  type: 'personal' | 'group'
  name: string
  avatarUrl: string | null
  avatarInitials: string
  memberCount?: number
  topicCount?: number
  trainerId: number
  athleteId: number | null
  groupId: number | null
  nickname?: string | null
  lastMessage: {
    id: number
    content: string
    senderId: number
    senderName: string
    isOwnMessage: boolean
    sentAt: string
  } | null
  unreadCount: number
}

interface RawDialogRow {
  chat_id: number
  type: 'personal' | 'group'
  trainer_id: number
  group_id: number | null
  athlete_id: number | null
  trainer_name: string | null
  trainer_email: string | null
  trainer_photo_url: string | null
  group_name: string | null
  group_member_count: number
  topic_count: number
  athlete_name: string | null
  athlete_email: string | null
  athlete_photo_url: string | null
  athlete_nickname: string | null
  last_msg_id: number | null
  last_msg_content: string | null
  last_msg_sender_id: number | null
  last_msg_sender_name: string | null
  last_msg_at: string | null
  unread_count: number
}

const LIST_DIALOGS_SQL = `
  WITH user_chats AS (
    SELECT c.id, c.type, c.trainer_id, c.group_id, c.athlete_id
    FROM chats c
    WHERE c.trainer_id = :userId

    UNION

    SELECT c.id, c.type, c.trainer_id, c.group_id, c.athlete_id
    FROM chats c
    WHERE c.type = 'personal' AND c.athlete_id = :userId

    UNION

    SELECT c.id, c.type, c.trainer_id, c.group_id, c.athlete_id
    FROM chats c
    INNER JOIN group_athletes ga ON ga.group_id = c.group_id AND ga.athlete_id = :userId
    WHERE c.type = 'group'
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.chat_id)
      m.id, m.chat_id, m.content, m.sender_id, m.created_at,
      u.full_name AS sender_name
    FROM messages m
    INNER JOIN users u ON u.id = m.sender_id
    WHERE m.chat_id IN (SELECT id FROM user_chats)
    ORDER BY m.chat_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.chat_id, COUNT(*)::int AS unread
    FROM messages m
    LEFT JOIN chat_reads cr ON cr.chat_id = m.chat_id AND cr.user_id = :userId
    WHERE m.chat_id IN (SELECT id FROM user_chats)
      AND m.sender_id != :userId
      AND (cr.last_read_at IS NULL OR m.created_at > cr.last_read_at)
    GROUP BY m.chat_id
  ),
  group_member_counts AS (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM group_athletes
    GROUP BY group_id
  ),
  topic_counts AS (
    SELECT group_id, COUNT(*)::int AS cnt
    FROM topics
    GROUP BY group_id
  )
  SELECT
    uc.id                  AS chat_id,
    uc.type,
    uc.trainer_id,
    uc.group_id,
    uc.athlete_id,
    t.full_name            AS trainer_name,
    t.email                AS trainer_email,
    t.photo_url            AS trainer_photo_url,
    g.name                 AS group_name,
    COALESCE(gmc.cnt, 0)   AS group_member_count,
    COALESCE(tc.cnt, 0)    AS topic_count,
    a.full_name            AS athlete_name,
    a.email                AS athlete_email,
    a.photo_url            AS athlete_photo_url,
    ta.nickname            AS athlete_nickname,
    lm.id                  AS last_msg_id,
    lm.content             AS last_msg_content,
    lm.sender_id           AS last_msg_sender_id,
    lm.sender_name         AS last_msg_sender_name,
    lm.created_at          AS last_msg_at,
    COALESCE(un.unread, 0) AS unread_count
  FROM user_chats uc
  LEFT JOIN users t           ON t.id = uc.trainer_id
  LEFT JOIN trainer_groups g  ON g.id = uc.group_id AND g.deleted_at IS NULL
  LEFT JOIN users a           ON a.id = uc.athlete_id
  LEFT JOIN trainer_athletes ta ON ta.trainer_id = uc.trainer_id AND ta.athlete_id = uc.athlete_id
  LEFT JOIN last_messages lm       ON lm.chat_id = uc.id
  LEFT JOIN unread_counts un       ON un.chat_id = uc.id
  LEFT JOIN group_member_counts gmc ON gmc.group_id = uc.group_id
  LEFT JOIN topic_counts tc        ON tc.group_id = uc.group_id
  ORDER BY COALESCE(lm.created_at, '1970-01-01'::timestamp) DESC
`

function getInitials(name: string | null, email: string | null): string {
  const source = name ?? email ?? ''
  return source
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

export default class DialogService {
  static async listForUser(userId: number): Promise<DialogItem[]> {
    const result = await db.rawQuery(LIST_DIALOGS_SQL, { userId })

    return result.rows.map((row: RawDialogRow): DialogItem => {
      let name: string
      let avatarUrl: string | null
      let avatarInitials: string
      let nickname: string | null = null

      if (row.type === 'group') {
        name = row.group_name ?? 'Удалённая группа'
        avatarUrl = null
        avatarInitials = (name[0] ?? 'G').toUpperCase()
      } else if (row.trainer_id === userId) {
        name = row.athlete_name ?? row.athlete_email ?? 'Атлет'
        avatarUrl = row.athlete_photo_url ?? null
        avatarInitials = getInitials(row.athlete_name, row.athlete_email)
        nickname = row.athlete_nickname ?? null
      } else {
        name = row.trainer_name ?? row.trainer_email ?? 'Тренер'
        avatarUrl = row.trainer_photo_url ?? null
        avatarInitials = getInitials(row.trainer_name, row.trainer_email)
      }

      return {
        chatId: row.chat_id,
        type: row.type,
        name,
        avatarUrl,
        avatarInitials,
        memberCount: row.type === 'group' ? row.group_member_count : undefined,
        topicCount: row.type === 'group' ? row.topic_count : undefined,
        trainerId: row.trainer_id,
        athleteId: row.athlete_id ?? null,
        groupId: row.group_id ?? null,
        nickname: nickname ?? undefined,
        lastMessage: row.last_msg_id
          ? {
              id: row.last_msg_id,
              content: row.last_msg_content!,
              senderId: row.last_msg_sender_id!,
              senderName: row.last_msg_sender_name!,
              isOwnMessage: row.last_msg_sender_id === userId,
              sentAt: row.last_msg_at!,
            }
          : null,
        unreadCount: row.unread_count,
      }
    })
  }
}
