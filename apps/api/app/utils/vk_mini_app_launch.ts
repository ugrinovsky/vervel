import crypto from 'node:crypto'

/**
 * VK Mini Apps: проверка подписи параметров запуска (MD5).
 * @see https://dev.vk.com/mini-apps/development/launch-params
 */
export function verifyVkMiniAppLaunchSignature(
  params: Record<string, string>,
  clientSecret: string
): boolean {
  const sign = params.sign
  if (!sign || !clientSecret) {
    return false
  }

  const sortedKeys = Object.keys(params).filter((k) => k !== 'sign').sort()
  const checkString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')
  const expected = crypto.createHash('md5').update(checkString + clientSecret).digest('hex')
  const a = Buffer.from(sign, 'utf8')
  const b = Buffer.from(expected, 'utf8')
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
