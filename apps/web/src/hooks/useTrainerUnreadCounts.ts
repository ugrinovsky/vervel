import { useState, useEffect } from 'react'
import { trainerApi, type UnreadCounts } from '@/api/trainer'

// Module-level shared state — all hook instances share the same data
let cachedData: UnreadCounts | null = null
let lastFetch = 0
const listeners = new Set<(data: UnreadCounts | null) => void>()

export async function refreshUnreadCounts() {
  try {
    const res = await trainerApi.getUnreadCounts()
    cachedData = res.data.data
    lastFetch = Date.now()
    listeners.forEach((l) => l(cachedData))
  } catch {}
}

export function useTrainerUnreadCounts(pollInterval?: number) {
  const [data, setData] = useState<UnreadCounts | null>(cachedData)

  useEffect(() => {
    if (pollInterval === undefined) return

    listeners.add(setData)

    // Fetch immediately if cache is stale (older than 5s)
    if (Date.now() - lastFetch > 5_000) {
      refreshUnreadCounts()
    } else {
      setData(cachedData)
    }

    const interval = setInterval(refreshUnreadCounts, pollInterval)
    return () => {
      listeners.delete(setData)
      clearInterval(interval)
    }
  }, [pollInterval])

  return { data, refresh: refreshUnreadCounts }
}
