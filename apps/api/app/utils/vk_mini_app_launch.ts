import crypto from 'node:crypto'

/**
 * VK Mini Apps: проверка подписи параметров запуска.
 * 1) HMAC-SHA256, только `vk_*`, строка как в
 *    https://github.com/VKCOM/vk-apps-launch-params/blob/master/examples/node.js
 * 2) Старый MD5 по всем ключам кроме `sign` (если подпись — 32 hex).
 */
function collectVkPairs(params: Record<string, string>): {
  sign?: string
  pairs: { key: string; value: string }[]
} {
  let sign: string | undefined
  const pairs: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string') {
      continue
    }
    if (key === 'sign') {
      sign = value
    } else if (key.startsWith('vk_')) {
      pairs.push({ key, value })
    }
  }
  return { sign, pairs }
}

/** Снять base64-padding справа (как PHP rtrim(sign, '=')). */
function stripTrailingBase64Equals(s: string): string {
  return s.replace(/=+$/, '')
}

function buildSortedVkQueryStringForHmac(pairs: { key: string; value: string }[]): string {
  return pairs
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce((acc, { key, value }, idx) => {
      return acc + (idx === 0 ? '' : '&') + `${key}=${encodeURIComponent(value)}`
    }, '')
}

function verifyLaunchParamsSha256(params: Record<string, string>, secretKey: string): boolean {
  const { sign, pairs } = collectVkPairs(params)
  if (!sign || pairs.length === 0 || !secretKey) {
    return false
  }

  const queryString = buildSortedVkQueryStringForHmac(pairs)

  let paramsHash = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  paramsHash = stripTrailingBase64Equals(paramsHash)
  const signNorm = stripTrailingBase64Equals(sign)

  const a = Buffer.from(signNorm, 'utf8')
  const b = Buffer.from(paramsHash, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

/**
 * Как ветка `string` в официальном verifyLaunchParams (VKCOM/vk-apps-launch-params examples/node.js):
 * значения между `=` и `&` без предварительного decode — затем encodeURIComponent при сборке строки для HMAC.
 */
export function verifyVkMiniAppLaunchFromRawSearch(search: string, secretKey: string): boolean {
  if (!secretKey || typeof search !== 'string' || !search.trim()) {
    return false
  }

  const formattedSearch = search.startsWith('?') ? search.slice(1) : search
  let sign: string | undefined
  const pairs: { key: string; value: string }[] = []

  for (const param of formattedSearch.split('&')) {
    const eq = param.indexOf('=')
    if (eq < 0) {
      continue
    }
    const key = param.slice(0, eq)
    const value = param.slice(eq + 1)
    if (key === 'sign') {
      sign = value
    } else if (key.startsWith('vk_')) {
      pairs.push({ key, value })
    }
  }

  if (!sign || pairs.length === 0) {
    return false
  }

  const queryString = buildSortedVkQueryStringForHmac(pairs)
  let paramsHash = crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  paramsHash = stripTrailingBase64Equals(paramsHash)
  const signNorm = stripTrailingBase64Equals(sign)

  const a = Buffer.from(signNorm, 'utf8')
  const b = Buffer.from(paramsHash, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

function verifyLaunchParamsLegacyMd5(params: Record<string, string>, secretKey: string): boolean {
  const sign = params.sign
  if (!sign || !secretKey) {
    return false
  }
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'sign')
    .sort()
  const checkString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')
  const expected = crypto
    .createHash('md5')
    .update(checkString + secretKey)
    .digest('hex')
  const a = Buffer.from(sign, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

export function verifyVkMiniAppLaunchSignature(
  params: Record<string, string>,
  secretKey: string
): boolean {
  if (!secretKey) {
    return false
  }
  const sig = params.sign ?? ''
  const looksLikeMd5Hex = /^[a-f0-9]{32}$/i.test(sig)
  if (looksLikeMd5Hex) {
    return verifyLaunchParamsLegacyMd5(params, secretKey)
  }
  return (
    verifyLaunchParamsSha256(params, secretKey) || verifyLaunchParamsLegacyMd5(params, secretKey)
  )
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
    if (typeof v === 'boolean' && k.startsWith('vk_')) {
      out[k] = v ? '1' : '0'
      continue
    }
    out[k] = typeof v === 'string' ? v : String(v)
  }
  return Object.keys(out).length ? out : null
}
