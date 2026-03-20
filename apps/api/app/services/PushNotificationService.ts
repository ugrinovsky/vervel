import webpush from 'web-push'
import env from '#start/env'
import PushSubscription from '#models/push_subscription'
import db from '@adonisjs/lucid/services/db'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const publicKey = env.get('VAPID_PUBLIC_KEY')
  const privateKey = env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(
    env.get('VAPID_SUBJECT') || 'mailto:nazar9505@yandex.ru',
    publicKey,
    privateKey
  )
  vapidConfigured = true
}

export interface PushPayload {
  title: string
  body: string
  /** URL to open when notification is clicked */
  url?: string
}

export class PushNotificationService {
  static async sendToUser(userId: number, payload: PushPayload): Promise<void> {
    ensureVapid()
    if (!vapidConfigured) return

    const subscriptions = await PushSubscription.query().where('userId', userId)
    if (subscriptions.length === 0) return

    const data = JSON.stringify(payload)

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            data
          )
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await sub.delete()
          }
        }
      })
    )
  }

  static async sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map((id) => this.sendToUser(id, payload)))
  }

  /** Resolve athlete IDs from assignedTo array (same logic as in scheduled_workout_controller) */
  static async resolveAthleteIds(
    assignedTo: { type: 'group' | 'athlete'; id: number }[]
  ): Promise<number[]> {
    const ids = new Set<number>()
    for (const a of assignedTo) {
      if (a.type === 'athlete') {
        ids.add(a.id)
      } else {
        const rows = await db.from('group_athletes').where('group_id', a.id)
        for (const r of rows) ids.add(r.athlete_id)
      }
    }
    return [...ids]
  }
}
