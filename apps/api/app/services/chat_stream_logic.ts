/**
 * Pure helper functions for SSE chat streaming.
 * No framework dependencies — safe to unit-test in isolation.
 */

/**
 * Resolves the `after_id` cursor for an SSE stream connection.
 *
 * Priority:
 *  1. `Last-Event-ID` header — sent automatically by the browser on reconnect.
 *  2. `after_id` query param — supplied on the first connection.
 *  3. Falls back to 0 (stream everything from the beginning).
 */
export function resolveAfterId(
  lastEventIdHeader: string | null | undefined,
  afterIdQueryParam: string | null | undefined
): number {
  if (lastEventIdHeader !== null && lastEventIdHeader !== undefined && lastEventIdHeader !== '') {
    return Number(lastEventIdHeader)
  }
  if (afterIdQueryParam !== null && afterIdQueryParam !== undefined && afterIdQueryParam !== '') {
    return Number(afterIdQueryParam)
  }
  return 0
}

/**
 * Formats a single SSE event frame.
 *
 * Format:
 *   id: <id>\n
 *   data: <JSON>\n
 *   \n
 */
export function formatSseEvent(id: number, data: object): string {
  return `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`
}

export type SseWritableLike = {
  writableEnded?: boolean
  destroyed?: boolean
  write: (payload: string) => unknown
}

/**
 * Creates a "safe write" wrapper for SSE streams.
 * It never throws; if a write fails, it calls `cleanupOnce` and marks the writer closed.
 */
export function createSafeSseWriter(raw: SseWritableLike, cleanupOnce: () => void) {
  let closed = false

  const close = () => {
    if (closed) return
    closed = true
    cleanupOnce()
  }

  const safeWrite = (payload: string): boolean => {
    if (closed || raw.writableEnded || raw.destroyed) return false
    try {
      raw.write(payload)
      return true
    } catch {
      close()
      return false
    }
  }

  return {
    get closed() {
      return closed
    },
    close,
    safeWrite,
  }
}
