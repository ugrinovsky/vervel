/** Stored chat message prefix for a KLIPY-hosted GIF URL (HTTPS only). */
export const KLIPY_MESSAGE_PREFIX = 'klipy:' as const

const ASPECT_DIM_MAX = 4096

export type ParsedKlipyMessage = {
  url: string
  previewWidth?: number
  previewHeight?: number
}

function isTrustedKlipyMediaUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    return h === 'media.klipy.com' || h.endsWith('.klipy.com')
  } catch {
    return false
  }
}

/**
 * `klipy:https://...` or `klipy:WxH:https://...` (preview size in pixels).
 */
export function parseKlipyMessage(content: string): ParsedKlipyMessage | null {
  const t = content.trim()
  if (!t.startsWith(KLIPY_MESSAGE_PREFIX)) return null
  const rest = t.slice(KLIPY_MESSAGE_PREFIX.length).trim()
  const withDims = /^(\d{1,4})x(\d{1,4}):(https:\/\/.+)$/i.exec(rest)
  if (withDims) {
    const w = Number(withDims[1])
    const h = Number(withDims[2])
    const url = withDims[3]
    if (
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w < 1 ||
      h < 1 ||
      w > ASPECT_DIM_MAX ||
      h > ASPECT_DIM_MAX ||
      !isTrustedKlipyMediaUrl(url)
    ) {
      return null
    }
    return { url, previewWidth: w, previewHeight: h }
  }
  if (!isTrustedKlipyMediaUrl(rest)) return null
  return { url: rest }
}

/** Returns the media URL if `content` is a valid klipy message, else null. */
export function parseKlipyMessageContent(content: string): string | null {
  return parseKlipyMessage(content)?.url ?? null
}

/** Short text for push / previews. */
export function pushBodyForChatMessage(content: string): string {
  const t = content.trim()
  if (t.startsWith(KLIPY_MESSAGE_PREFIX)) {
    return parseKlipyMessageContent(t) ? 'GIF' : t.slice(0, 120)
  }
  return t
}
