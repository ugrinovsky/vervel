self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Vervel', body: event.data.text() }
  }

  const { title, body, url } = payload

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

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If app is already open — focus and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus()
            client.navigate(url)
            return
          }
        }
        // Otherwise open new tab
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
