/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

export function registerPush() {
  self.addEventListener('push', (event) => {
    if (!event.data) return

    let payload: { title?: string; body?: string; url?: string }
    try {
      payload = event.data.json()
    } catch {
      payload = { title: 'Vervel', body: event.data.text() }
    }

    const { title = 'Vervel', body, url } = payload

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/logo.svg',
        badge: '/logo.svg',
        data: { url: url || '/' },
      })
    )
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const url: string = event.notification.data?.url || '/'

    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          for (const client of windowClients) {
            if ('focus' in client) {
              client.focus()
              client.navigate(url)
              return
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(url)
          }
        })
    )
  })
}
