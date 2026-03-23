import { useState, useEffect, useCallback } from 'react'
import { getVapidPublicKey, savePushSubscription } from '@/api/push'

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer
}

export function usePushNotifications() {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!supported) return 'unsupported'
    return (Notification.permission as PermissionState)
  })
  const [loading, setLoading] = useState(false)

  // On mount: register SW and sync existing subscription to backend
  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.register('/sw.js', { type: 'module' })
    if (Notification.permission === 'granted') {
      syncSubscription().catch(() => {})
    }
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)
      if (result !== 'granted') return
      await syncSubscription()
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { permission, loading, enable, supported }
}

async function syncSubscription() {
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    const publicKey = await getVapidPublicKey()
    if (!publicKey) return
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await savePushSubscription(subscription.toJSON())
}
