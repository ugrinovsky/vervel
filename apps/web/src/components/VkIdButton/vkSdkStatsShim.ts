/**
 * VK ID SDK ходит на id.vk.ru из браузера без пригодного CORS для сторонних сайтов:
 * — POST …/vkid_sdk_get_config — ломает init OneTap на проде → проксируем через VITE_API_URL;
 * — POST …/stat_events_vkid_sdk — только метрики → заглушка.
 *
 * Файл импортировать строкой выше `import '@vkid/sdk'`.
 */

let vkidFetchShimInstalled = false

function installVkidFetchShim() {
  if (vkidFetchShimInstalled) return
  vkidFetchShimInstalled = true

  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  const origFetch = window.fetch.bind(window)

  window.fetch = (...args: Parameters<typeof fetch>) => {
    const [input, init] = args
    let url = ''
    if (typeof input === 'string') url = input
    else if (input instanceof URL) url = input.href
    else if (typeof Request !== 'undefined' && input instanceof Request) url = input.url

    if (url.includes('/stat_events_vkid_sdk')) {
      return Promise.resolve(
        new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
    }

    if (apiBase && url.startsWith('https://id.vk.ru/vkid_sdk_get_config')) {
      const q = url.includes('?') ? url.slice(url.indexOf('?')) : ''
      const proxyUrl = `${apiBase}/oauth/vk/vkid-sdk-config-proxy${q}`
      if (typeof Request !== 'undefined' && input instanceof Request) {
        const fwd: RequestInit & { duplex?: 'half' } = {
          method: input.method,
          headers: input.headers,
          signal: input.signal,
        }
        if (input.method !== 'GET' && input.method !== 'HEAD' && input.body != null) {
          fwd.body = input.body
          fwd.duplex = 'half'
        }
        return origFetch(proxyUrl, fwd)
      }
      return origFetch(proxyUrl, {
        method: init?.method ?? 'POST',
        ...init,
      })
    }

    return origFetch(...args)
  }
}

installVkidFetchShim()

export {}
