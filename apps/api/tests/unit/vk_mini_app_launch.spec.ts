import { test } from '@japa/runner'
import crypto from 'node:crypto'
import { normalizeVkLaunchParams, verifyVkMiniAppLaunchSignature } from '#utils/vk_mini_app_launch'

function signParams(params: Record<string, string>, secret: string): Record<string, string> {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'sign')
    .sort()
  const checkString = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')
  const sign = crypto
    .createHash('md5')
    .update(checkString + secret)
    .digest('hex')
  return { ...params, sign }
}

test.group('VK Mini App launch signature', () => {
  test('принимает корректную подпись', async ({ assert }) => {
    const secret = 'my_secret_key'
    const base = {
      vk_app_id: '123',
      vk_user_id: '456',
      vk_ts: '1700000000',
    }
    const signed = signParams(base, secret)
    assert.isTrue(verifyVkMiniAppLaunchSignature(signed, secret))
  })

  test('отклоняет неверный секрет', async ({ assert }) => {
    const signed = signParams({ vk_app_id: '1', vk_user_id: '2' }, 'a')
    assert.isFalse(verifyVkMiniAppLaunchSignature(signed, 'b'))
  })

  test('normalizeVkLaunchParams', async ({ assert }) => {
    assert.deepEqual(normalizeVkLaunchParams(null), null)
    assert.deepEqual(normalizeVkLaunchParams({ a: 1, b: 'x' }), { a: '1', b: 'x' })
  })
})
