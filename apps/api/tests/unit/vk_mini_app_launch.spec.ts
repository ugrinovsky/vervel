import { test } from '@japa/runner'
import { normalizeVkLaunchParams, verifyVkMiniAppLaunchSignature } from '#utils/vk_mini_app_launch'

/** Пример из https://github.com/VKCOM/vk-apps-launch-params/blob/master/examples/node.js */
const OFFICIAL_QUERY =
  'vk_user_id=494075&vk_app_id=6736218&vk_is_app_user=1&vk_are_notifications_enabled=1&vk_language=ru&vk_access_token_settings=&vk_platform=android&sign=htQFduJpLxz7ribXRZpDFUH-XEUhC9rBPTJkjUFEkRA'
const OFFICIAL_SECRET = 'wvl68m4dR1UpLrVRli'

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {}
  const formatted = qs.startsWith('?') ? qs.slice(1) : qs
  for (const param of formatted.split('&')) {
    const eq = param.indexOf('=')
    if (eq < 0) continue
    const key = param.slice(0, eq)
    const value = param.slice(eq + 1)
    out[key] = decodeURIComponent(value.replace(/\+/g, ' '))
  }
  return out
}

test.group('VK Mini App launch signature (HMAC-SHA256)', () => {
  test('принимает официальный пример VKCOM/vk-apps-launch-params', async ({ assert }) => {
    const params = parseQuery(OFFICIAL_QUERY)
    assert.isTrue(verifyVkMiniAppLaunchSignature(params, OFFICIAL_SECRET))
  })

  test('отклоняет неверный секрет', async ({ assert }) => {
    const params = parseQuery(OFFICIAL_QUERY)
    assert.isFalse(verifyVkMiniAppLaunchSignature(params, 'wrong-secret'))
  })

  test('normalizeVkLaunchParams', async ({ assert }) => {
    assert.deepEqual(normalizeVkLaunchParams(null), null)
    assert.deepEqual(normalizeVkLaunchParams({ a: 1, b: 'x' }), { a: '1', b: 'x' })
  })
})
