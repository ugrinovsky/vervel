import { publicApi } from './http/publicApi'
import { privateApi } from './http/privateApi'

export async function getVapidPublicKey(): Promise<string> {
  const res = await publicApi.get<{ publicKey: string }>('/push/vapid-key')
  return res.data.publicKey
}

function parsePushKeys(raw: PushSubscriptionJSON['keys']): { p256dh: string; auth: string } | null {
  if (raw == null || typeof raw !== 'object') return null
  const p256dh = 'p256dh' in raw ? raw.p256dh : undefined
  const auth = 'auth' in raw ? raw.auth : undefined
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null
  return { p256dh, auth }
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const keys = parsePushKeys(subscription.keys)
  if (!keys) return
  await privateApi.post('/push/subscribe', {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await privateApi.delete('/push/unsubscribe', { data: { endpoint } })
}
