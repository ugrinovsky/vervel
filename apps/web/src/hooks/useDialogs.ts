import { useEffect, useSyncExternalStore } from 'react'
import { chatApi, type DialogItem } from '@/api/chat'

let cachedData: DialogItem[] | null = null
let lastFetch = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export async function refreshDialogs() {
  try {
    const res = await chatApi.listDialogs()
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

function getServerSnapshot(): DialogItem[] | null {
  return null
}

export function useDialogs(pollInterval?: number) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (pollInterval === undefined) return
    if (Date.now() - lastFetch > 5_000) {
      void refreshDialogs()
    }
    const interval = setInterval(refreshDialogs, pollInterval)
    return () => clearInterval(interval)
  }, [pollInterval])

  return { data, refresh: refreshDialogs }
}
