import { useEffect, useSyncExternalStore } from 'react'
import { trainerApi, type UnreadCounts } from '@/api/trainer'

let cachedData: UnreadCounts | null = null
let lastFetch = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export async function refreshUnreadCounts() {
  try {
    const res = await trainerApi.getUnreadCounts()
    cachedData = res.data.data
    lastFetch = Date.now()
    emit()
  } catch {}
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

function getSnapshot() {
  return cachedData
}

function getServerSnapshot(): UnreadCounts | null {
  return null
}

export function useTrainerUnreadCounts(pollInterval?: number) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (pollInterval === undefined) return
    if (Date.now() - lastFetch > 5_000) {
      void refreshUnreadCounts()
    }
    const interval = setInterval(refreshUnreadCounts, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return { data, refresh: refreshUnreadCounts }
}
