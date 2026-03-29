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
