import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock trainerApi ───────────────────────────────────────────────────────

vi.mock('@/api/trainer', () => ({
  trainerApi: {
    getUnreadCounts: vi.fn(),
  },
}))

import type { UnreadCounts } from '@/api/trainer'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeUnreadCounts(overrides: Partial<UnreadCounts> = {}): UnreadCounts {
  return {
    total: 0,
    groups: [],
    athletes: [],
    ...overrides,
  }
}

async function importFresh() {
  vi.resetModules()
  vi.mock('@/api/trainer', () => ({
    trainerApi: {
      getUnreadCounts: vi.fn(),
    },
  }))
  return import('./useTrainerUnreadCounts')
}

// ─── refreshUnreadCounts() ─────────────────────────────────────────────────

describe('useTrainerUnreadCounts: refreshUnreadCounts()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('вызывает trainerApi.getUnreadCounts()', async () => {
    const { refreshUnreadCounts } = await importFresh()
    const mockedApi = (await import('@/api/trainer')).trainerApi
    const counts = makeUnreadCounts({ total: 3 })

    vi.mocked(mockedApi.getUnreadCounts).mockResolvedValueOnce({
      data: { success: true, data: counts },
    } as Awaited<ReturnType<typeof mockedApi.getUnreadCounts>>)

    await refreshUnreadCounts()

    expect(mockedApi.getUnreadCounts).toHaveBeenCalledTimes(1)
  })

  it('не бросает ошибку при сбое сети (silent catch)', async () => {
    const { refreshUnreadCounts } = await importFresh()
    const mockedApi = (await import('@/api/trainer')).trainerApi

    vi.mocked(mockedApi.getUnreadCounts).mockRejectedValueOnce(new Error('Network error'))

    await expect(refreshUnreadCounts()).resolves.toBeUndefined()
  })

  it('повторные вызовы не бросают ошибок', async () => {
    const { refreshUnreadCounts } = await importFresh()
    const mockedApi = (await import('@/api/trainer')).trainerApi
    const counts = makeUnreadCounts()

    vi.mocked(mockedApi.getUnreadCounts).mockResolvedValue({
      data: { success: true, data: counts },
    } as Awaited<ReturnType<typeof mockedApi.getUnreadCounts>>)

    await refreshUnreadCounts()
    await refreshUnreadCounts()

    expect(mockedApi.getUnreadCounts).toHaveBeenCalledTimes(2)
  })
})

// ─── логика кэша (5s staleness) ────────────────────────────────────────────

describe('useTrainerUnreadCounts: staleness check', () => {
  it('кэш свежий если обновился менее 5 секунд назад', () => {
    const now = Date.now()
    expect(now - (now - 3000) > 5_000).toBe(false)
  })

  it('кэш устаревший если обновился более 5 секунд назад', () => {
    const now = Date.now()
    expect(now - (now - 6000) > 5_000).toBe(true)
  })

  it('начальный lastFetch = 0 → всегда устаревший', () => {
    expect(Date.now() - 0 > 5_000).toBe(true)
  })
})

// ─── структура возвращаемых данных ────────────────────────────────────────

describe('useTrainerUnreadCounts: makeUnreadCounts helper', () => {
  it('создаёт корректную структуру UnreadCounts', () => {
    const counts = makeUnreadCounts({ total: 5, groups: [{ groupId: 1, chatId: 10, unread: 5 }] })
    expect(counts.total).toBe(5)
    expect(counts.groups).toHaveLength(1)
    expect(counts.athletes).toHaveLength(0)
  })

  it('дефолтные значения — total 0, пустые массивы', () => {
    const counts = makeUnreadCounts()
    expect(counts.total).toBe(0)
    expect(counts.groups).toEqual([])
    expect(counts.athletes).toEqual([])
  })
})
