import { useState, useEffect } from 'react'
import { chatApi, type DialogItem } from '@/api/chat'

// Module-level shared state — all hook instances share the same data
let cachedData: DialogItem[] | null = null
let lastFetch = 0
const listeners = new Set<(data: DialogItem[] | null) => void>()

export async function refreshDialogs() {
  try {
    const res = await chatApi.listDialogs()
    cachedData = res.data.data
    lastFetch = Date.now()
    listeners.forEach((l) => l(cachedData))
  } catch {}
}

export function useDialogs(pollInterval?: number) {
  const [data, setData] = useState<DialogItem[] | null>(cachedData)

  useEffect(() => {
    if (pollInterval === undefined) return

    listeners.add(setData)

    if (Date.now() - lastFetch > 5_000) {
      refreshDialogs()
    } else {
      setData(cachedData)
    }

    const interval = setInterval(refreshDialogs, pollInterval)
    return () => {
      listeners.delete(setData)
      clearInterval(interval)
    }
  }, [pollInterval])

  return { data, refresh: refreshDialogs }
}
