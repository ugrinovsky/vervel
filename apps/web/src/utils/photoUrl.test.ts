import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// VITE_API_URL is not set in test env — resolvePhotoUrl uses '' as fallback
// We test with the module as-is, then override via vi.stubEnv for the prefixed case.

describe('resolvePhotoUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('возвращает null для null', async () => {
    const { resolvePhotoUrl } = await import('./photoUrl')
    expect(resolvePhotoUrl(null)).toBeNull()
  })

  it('возвращает null для undefined', async () => {
    const { resolvePhotoUrl } = await import('./photoUrl')
    expect(resolvePhotoUrl(undefined)).toBeNull()
  })

  it('возвращает null для пустой строки', async () => {
    const { resolvePhotoUrl } = await import('./photoUrl')
    expect(resolvePhotoUrl('')).toBeNull()
  })

  it('возвращает http-ссылку без изменений', async () => {
    const { resolvePhotoUrl } = await import('./photoUrl')
    const url = 'https://cdn.example.com/photo.jpg'
    expect(resolvePhotoUrl(url)).toBe(url)
  })

  it('возвращает http (не https) ссылку без изменений', async () => {
    const { resolvePhotoUrl } = await import('./photoUrl')
    const url = 'http://example.com/photo.jpg'
    expect(resolvePhotoUrl(url)).toBe(url)
  })

  it('добавляет API_BASE к относительному пути', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.vervel.ru')
    vi.resetModules()
    const { resolvePhotoUrl } = await import('./photoUrl')
    expect(resolvePhotoUrl('/uploads/photo.jpg')).toBe('https://api.vervel.ru/uploads/photo.jpg')
  })

  it('при пустом VITE_API_URL относительный путь остаётся без изменений', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()
    const { resolvePhotoUrl } = await import('./photoUrl')
    expect(resolvePhotoUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg')
  })
})
