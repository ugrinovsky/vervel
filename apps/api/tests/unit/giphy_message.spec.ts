import { test } from '@japa/runner'
import {
  GIPHY_MESSAGE_PREFIX,
  parseGiphyMessage,
  parseGiphyMessageContent,
  pushBodyForChatMessage,
} from '#utils/giphy_message'

test.group('parseGiphyMessageContent', () => {
  test('возвращает https URL для корректного giphy: сообщения', ({ assert }) => {
    const url = 'https://media.giphy.com/media/abc/giphy.gif'
    assert.equal(parseGiphyMessageContent(`  ${GIPHY_MESSAGE_PREFIX}${url}  `), url)
  })

  test('null если нет префикса', ({ assert }) => {
    assert.isNull(parseGiphyMessageContent('https://media.giphy.com/media/x/giphy.gif'))
  })

  test('null для http (только https)', ({ assert }) => {
    assert.isNull(parseGiphyMessageContent(`${GIPHY_MESSAGE_PREFIX}http://media.giphy.com/x.gif`))
  })

  test('null для чужого хоста', ({ assert }) => {
    assert.isNull(
      parseGiphyMessageContent(`${GIPHY_MESSAGE_PREFIX}https://evil.com/x.gif`)
    )
  })

  test('принимает поддомен *.giphy.com', ({ assert }) => {
    const url = 'https://media1.giphy.com/media/x/giphy.gif'
    assert.equal(parseGiphyMessageContent(`${GIPHY_MESSAGE_PREFIX}${url}`), url)
  })
})

test.group('parseGiphyMessage (WxH + url)', () => {
  test('парсит размеры и url', ({ assert }) => {
    const url = 'https://media.giphy.com/media/abc/giphy.gif'
    const raw = `${GIPHY_MESSAGE_PREFIX}200x150:${url}`
    const p = parseGiphyMessage(raw)
    assert.isNotNull(p)
    assert.equal(p!.url, url)
    assert.equal(p!.previewWidth, 200)
    assert.equal(p!.previewHeight, 150)
    assert.equal(parseGiphyMessageContent(raw), url)
  })

  test('null при неверных размерах', ({ assert }) => {
    const url = 'https://media.giphy.com/media/x/giphy.gif'
    assert.isNull(parseGiphyMessage(`${GIPHY_MESSAGE_PREFIX}0x100:${url}`))
    assert.isNull(parseGiphyMessage(`${GIPHY_MESSAGE_PREFIX}100x0:${url}`))
  })

  test('null если url после WxH не giphy', ({ assert }) => {
    assert.isNull(
      parseGiphyMessage(`${GIPHY_MESSAGE_PREFIX}100x100:https://evil.com/x.gif`)
    )
  })
})

test.group('pushBodyForChatMessage', () => {
  test('валидный giphy → GIF', ({ assert }) => {
    const url = 'https://media.giphy.com/media/a/giphy.gif'
    assert.equal(pushBodyForChatMessage(`${GIPHY_MESSAGE_PREFIX}${url}`), 'GIF')
  })

  test('невалидный giphy: префикс → обрезка до 120 символов', ({ assert }) => {
    const raw = `${GIPHY_MESSAGE_PREFIX}https://evil.com/x`
    assert.equal(pushBodyForChatMessage(raw), raw)
    const long = `${GIPHY_MESSAGE_PREFIX}https://evil.com/` + 'a'.repeat(200)
    assert.equal(pushBodyForChatMessage(long).length, 120)
  })

  test('обычный текст без изменений', ({ assert }) => {
    assert.equal(pushBodyForChatMessage('  Привет  '), 'Привет')
  })
})
