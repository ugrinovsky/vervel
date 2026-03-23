/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

const OFFLINE_PAGE = '/offline.html'
const OFFLINE_CACHE = 'offline-v1'

export function registerOffline() {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_PAGE))
    )
    self.skipWaiting()
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
  })

  self.addEventListener('fetch', (event) => {
    if (event.request.mode !== 'navigate') return

    event.respondWith(
      fetch(event.request).catch(() =>
        caches.open(OFFLINE_CACHE).then((cache) =>
          cache.match(OFFLINE_PAGE).then((r) => r ?? new Response('Offline', { status: 503 }))
        )
      )
    )
  })
}
