import crypto from 'node:crypto'

/**
 * VK Mini Apps: проверка подписи параметров запуска (HMAC-SHA256, только `vk_*`).
 * @see https://github.com/VKCOM/vk-apps-launch-params/blob/master/examples/node.js
 * @see https://dev.vk.com/mini-apps/development/launch-params-sign
 */
export function verifyVkMiniAppLaunchSignature(
  params: Record<string, string>,
  secretKey: string
): boolean {
  if (!secretKey) {
    return false
  }

  let sign: string | undefined
  const queryParams: { key: string; value: string }[] = []

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string') {
      continue
    }
    if (key === 'sign') {
      sign = value
    } else if (key.startsWith('vk_')) {
      queryParams.push({ key, value })
    }
  }

  if (!sign || queryParams.length === 0) {
    return false
  }

  const queryString = queryParams
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce((acc, { key, value }, idx) => {
      return acc + (idx === 0 ? '' : '&') + `${key}=${encodeURIComponent(value)}`
    }, '')

  const paramsHash = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '')

  const a = Buffer.from(sign, 'utf8')
  const b = Buffer.from(paramsHash, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

/** Приводит тело запроса к плоскому Record<string, string> для проверки подписи. */
export function normalizeVkLaunchParams(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === undefined) {
      continue
    }
    out[k] = typeof v === 'string' ? v : String(v)
  }
  return Object.keys(out).length ? out : null
}
