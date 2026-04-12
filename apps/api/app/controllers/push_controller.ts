import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import PushSubscription from '#models/push_subscription'

export default class PushController {
  /** GET /push/vapid-key — public endpoint, returns public VAPID key for frontend */
  async vapidKey({ response }: HttpContext) {
    return response.ok({ publicKey: env.get('VAPID_PUBLIC_KEY') || '' })
  }

  /** POST /push/subscribe — save push subscription for current user */
  async subscribe({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { endpoint, p256dh, auth: authKey } = request.only(['endpoint', 'p256dh', 'auth'])

    if (!endpoint || !p256dh || !authKey) {
      return response.badRequest({ message: 'endpoint, p256dh и auth обязательны' })
    }

    // Upsert by endpoint (same browser tab may re-subscribe)
    await PushSubscription.updateOrCreate({ endpoint }, { userId: user.id, p256dh, auth: authKey })

    return response.ok({ success: true })
  }

  /** DELETE /push/unsubscribe — remove push subscription */
  async unsubscribe({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { endpoint } = request.only(['endpoint'])

    if (!endpoint) {
      return response.badRequest({ message: 'endpoint обязателен' })
    }

    await PushSubscription.query().where('userId', user.id).where('endpoint', endpoint).delete()

    return response.ok({ success: true })
  }
}
