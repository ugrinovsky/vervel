/** Must match server `GIPHY_MESSAGE_PREFIX` in apps/api/app/utils/giphy_message.ts */
export const GIPHY_MESSAGE_PREFIX = 'giphy:' as const

const ASPECT_DIM_MAX = 4096

export type ParsedGiphyMessage = {
  url: string
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

export function parseGiphyMessageUrl(content: string): string | null {
  return parseGiphyMessage(content)?.url ?? null
}

export function formatGiphyMessageContent(
  mediaUrl: string,
  previewWidth?: number,
  previewHeight?: number
): string {
  if (
    typeof previewWidth === 'number' &&
    typeof previewHeight === 'number' &&
    Number.isFinite(previewWidth) &&
    Number.isFinite(previewHeight) &&
    previewWidth >= 1 &&
    previewHeight >= 1 &&
    previewWidth <= ASPECT_DIM_MAX &&
    previewHeight <= ASPECT_DIM_MAX
  ) {
    const w = Math.round(previewWidth)
    const h = Math.round(previewHeight)
    return `${GIPHY_MESSAGE_PREFIX}${w}x${h}:${mediaUrl}`
  }
  return `${GIPHY_MESSAGE_PREFIX}${mediaUrl}`
}

export function isGiphyMessageContent(content: string): boolean {
  return parseGiphyMessage(content) !== null
}
