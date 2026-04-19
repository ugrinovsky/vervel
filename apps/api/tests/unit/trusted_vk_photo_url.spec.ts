import { test } from '@japa/runner'
import { isTrustedVkPhotoUrl } from '#utils/trusted_vk_photo_url'

test.group('trusted_vk_photo_url', () => {
  test('принимает типичный CDN userapi', async ({ assert }) => {
    assert.isTrue(
      isTrustedVkPhotoUrl(
        'https://sun9-21.userapi.com/impg/something/crop.jpg?size=200x200&quality=96&sign=abc'
      )
    )
  })

  test('отклоняет http и произвольный хост', async ({ assert }) => {
    assert.isFalse(isTrustedVkPhotoUrl('http://sun9-21.userapi.com/x.jpg'))
    assert.isFalse(isTrustedVkPhotoUrl('https://evil.com/sun9-21.userapi.com.jpg'))
  })
})
