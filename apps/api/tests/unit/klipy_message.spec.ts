import { test } from '@japa/runner'
import {
  KLIPY_MESSAGE_PREFIX,
  parseKlipyMessage,
  parseKlipyMessageContent,
  pushBodyForChatMessage,
} from '#utils/klipy_message'

test.group('parseKlipyMessageContent', () => {
  test('возвращает https URL для корректного klipy: сообщения', ({ assert }) => {
    const url = 'https://media.klipy.com/media/abc/clip.gif'
    assert.equal(parseKlipyMessageContent(`  ${KLIPY_MESSAGE_PREFIX}${url}  `), url)
  })

  test('null если нет префикса', ({ assert }) => {
    assert.isNull(parseKlipyMessageContent('https://media.klipy.com/media/x/clip.gif'))
  })

  test('null для http (только https)', ({ assert }) => {
    assert.isNull(parseKlipyMessageContent(`${KLIPY_MESSAGE_PREFIX}http://media.klipy.com/x.gif`))
  })

  test('null для чужого хоста', ({ assert }) => {
    assert.isNull(parseKlipyMessageContent(`${KLIPY_MESSAGE_PREFIX}https://evil.com/x.gif`))
  })

  test('принимает поддомен *.klipy.com', ({ assert }) => {
    const url = 'https://media1.klipy.com/media/x/clip.gif'
    assert.equal(parseKlipyMessageContent(`${KLIPY_MESSAGE_PREFIX}${url}`), url)
  })
})

test.group('parseKlipyMessage (WxH + url)', () => {
  test('парсит размеры и url', ({ assert }) => {
    const url = 'https://media.klipy.com/media/abc/clip.gif'
    const raw = `${KLIPY_MESSAGE_PREFIX}200x150:${url}`
    const p = parseKlipyMessage(raw)
    assert.isNotNull(p)
    assert.equal(p!.url, url)
    assert.equal(p!.previewWidth, 200)
    assert.equal(p!.previewHeight, 150)
    assert.equal(parseKlipyMessageContent(raw), url)
  })

  test('null при неверных размерах', ({ assert }) => {
    const url = 'https://media.klipy.com/media/x/clip.gif'
    assert.isNull(parseKlipyMessage(`${KLIPY_MESSAGE_PREFIX}0x100:${url}`))
    assert.isNull(parseKlipyMessage(`${KLIPY_MESSAGE_PREFIX}100x0:${url}`))
  })

  test('null если url после WxH не klipy', ({ assert }) => {
    assert.isNull(parseKlipyMessage(`${KLIPY_MESSAGE_PREFIX}100x100:https://evil.com/x.gif`))
  })
})

test.group('pushBodyForChatMessage', () => {
  test('валидный klipy → GIF', ({ assert }) => {
    const url = 'https://media.klipy.com/media/a/clip.gif'
    assert.equal(pushBodyForChatMessage(`${KLIPY_MESSAGE_PREFIX}${url}`), 'GIF')
  })

  test('невалидный klipy: префикс → обрезка до 120 символов', ({ assert }) => {
    const raw = `${KLIPY_MESSAGE_PREFIX}https://evil.com/x`
    assert.equal(pushBodyForChatMessage(raw), raw)
    const long = `${KLIPY_MESSAGE_PREFIX}https://evil.com/` + 'a'.repeat(200)
    assert.equal(pushBodyForChatMessage(long).length, 120)
  })

  test('обычный текст без изменений', ({ assert }) => {
    assert.equal(pushBodyForChatMessage('  Привет  '), 'Привет')
  })
})
