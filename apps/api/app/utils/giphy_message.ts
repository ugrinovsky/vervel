/** Stored chat message prefix for a Giphy-hosted GIF URL (HTTPS only). */
export const GIPHY_MESSAGE_PREFIX = 'giphy:' as const

const ASPECT_DIM_MAX = 4096

export type ParsedGiphyMessage = {
  url: string
  /** Из ответа GIPHY (рендер превью); иначе клиент берёт natural* у полного GIF. */
  previewWidth?: number
  previewHeight?: number
}

function isTrustedGiphyMediaUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    return h === 'media.giphy.com' || h.endsWith('.giphy.com')
  } catch {
    return false
  }
}

/**
 * `giphy:https://...` или `giphy:WxH:https://...` (размеры превью из API, пиксели).
 */
export function parseGiphyMessage(content: string): ParsedGiphyMessage | null {
  const t = content.trim()
  if (!t.startsWith(GIPHY_MESSAGE_PREFIX)) return null
  const rest = t.slice(GIPHY_MESSAGE_PREFIX.length).trim()

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
      !isTrustedGiphyMediaUrl(url)
    ) {
      return null
    }
    return { url, previewWidth: w, previewHeight: h }
  }

  if (!isTrustedGiphyMediaUrl(rest)) return null
  return { url: rest }
}

/** Returns the media URL if `content` is a valid giphy message, else null. */
export function parseGiphyMessageContent(content: string): string | null {
  return parseGiphyMessage(content)?.url ?? null
}

/** Short text for push / previews. */
export function pushBodyForChatMessage(content: string): string {
  const t = content.trim()
  if (t.startsWith(GIPHY_MESSAGE_PREFIX)) {
    return parseGiphyMessageContent(t) ? 'GIF' : t.slice(0, 120)
  }
  return t
}
