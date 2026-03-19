import { publicApi } from './http/publicApi'
import { privateApi } from './http/privateApi'

export async function getVapidPublicKey(): Promise<string> {
  const res = await publicApi.get<{ publicKey: string }>('/push/vapid-key')
  return res.data.publicKey
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const keys = subscription.keys as { p256dh: string; auth: string }
  await privateApi.post('/push/subscribe', {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await privateApi.delete('/push/unsubscribe', { data: { endpoint } })
}
