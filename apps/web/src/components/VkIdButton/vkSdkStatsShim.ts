/**
 * VK ID SDK шлёт метрики на id.vk.ru; для localhost нет ACAO → «Failed to fetch» в консоли.
 * Заглушка только в dev, должна выполняться до `import '@vkid/sdk'`.
 */
let vkidStatsFetchShimInstalled = false

if (import.meta.env.DEV && !vkidStatsFetchShimInstalled) {
  vkidStatsFetchShimInstalled = true
  const origFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      let url = ''
      if (typeof input === 'string') url = input
      else if (input instanceof URL) url = input.href
      else if (typeof Request !== 'undefined' && input instanceof Request) url = input.url

      if (url.includes('/stat_events_vkid_sdk')) {
        return Promise.resolve(
          new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
        )
      }
      return origFetch(input, init)
    }
}

export {}
