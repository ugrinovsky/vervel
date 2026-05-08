import { test } from '@japa/runner'
import { resolveAfterId, formatSseEvent, createSafeSseWriter } from '#services/chat_stream_logic'

test.group('resolveAfterId: Last-Event-ID header takes precedence', () => {
  test('возвращает число из заголовка, игнорирует query-param', ({ assert }) => {
    assert.equal(resolveAfterId('42', '10'), 42)
  })

  test('возвращает 0 из заголовка, если значение "0"', ({ assert }) => {
    assert.equal(resolveAfterId('0', '10'), 0)
  })
})

test.group('resolveAfterId: fallback to query param', () => {
  test('использует query-param когда заголовок null', ({ assert }) => {
    assert.equal(resolveAfterId(null, '7'), 7)
  })

  test('использует query-param когда заголовок undefined', ({ assert }) => {
    assert.equal(resolveAfterId(undefined, '15'), 15)
  })

  test('использует query-param когда заголовок пустая строка', ({ assert }) => {
    assert.equal(resolveAfterId('', '99'), 99)
  })
})

test.group('resolveAfterId: fallback to 0', () => {
  test('возвращает 0 когда оба аргумента null', ({ assert }) => {
    assert.equal(resolveAfterId(null, null), 0)
  })

  test('возвращает 0 когда оба аргумента undefined', ({ assert }) => {
    assert.equal(resolveAfterId(undefined, undefined), 0)
  })

  test('возвращает 0 когда оба аргумента пустые строки', ({ assert }) => {
    assert.equal(resolveAfterId('', ''), 0)
  })

  test('возвращает 0 когда query-param null, заголовок null', ({ assert }) => {
    assert.equal(resolveAfterId(null, undefined), 0)
  })
})

test.group('resolveAfterId: числовое преобразование', () => {
  test('конвертирует строку в число', ({ assert }) => {
    assert.equal(resolveAfterId('123', null), 123)
    assert.isNumber(resolveAfterId('55', null))
  })
})

test.group('formatSseEvent: формат SSE-фрейма', () => {
  test('содержит строку id:', ({ assert }) => {
    const result = formatSseEvent(5, { type: 'ping' })
    assert.include(result, 'id: 5\n')
  })

  test('содержит строку data: с JSON', ({ assert }) => {
    const data = { type: 'message', text: 'hello' }
    const result = formatSseEvent(1, data)
    assert.include(result, `data: ${JSON.stringify(data)}\n`)
  })

  test('заканчивается двойным переносом строки', ({ assert }) => {
    const result = formatSseEvent(3, {})
    assert.isTrue(result.endsWith('\n\n'))
  })

  test('полный формат фрейма', ({ assert }) => {
    const data = { x: 1 }
    assert.equal(formatSseEvent(7, data), `id: 7\ndata: ${JSON.stringify(data)}\n\n`)
  })

  test('JSON-кодирует вложенный объект', ({ assert }) => {
    const data = { a: { b: [1, 2] } }
    const result = formatSseEvent(10, data)
    assert.include(result, JSON.stringify(data))
  })
})

test.group('createSafeSseWriter: безопасная запись', () => {
  test('пишет payload когда поток жив', ({ assert }) => {
    let wrote: string | null = null
    const raw = {
      writableEnded: false,
      destroyed: false,
      write: (p: string) => {
        wrote = p
      },
    }
    let cleaned = 0
    const w = createSafeSseWriter(raw, () => {
      cleaned += 1
    })

    assert.isTrue(w.safeWrite('hello'))
    assert.equal(wrote, 'hello')
    assert.isFalse(w.closed)
    assert.equal(cleaned, 0)
  })

  test('не пишет если writableEnded=true', ({ assert }) => {
    const raw = { writableEnded: true, destroyed: false, write: () => assert.fail() }
    const w = createSafeSseWriter(raw as any, () => {})
    assert.isFalse(w.safeWrite('x'))
  })

  test('не пишет если destroyed=true', ({ assert }) => {
    const raw = { writableEnded: false, destroyed: true, write: () => assert.fail() }
    const w = createSafeSseWriter(raw as any, () => {})
    assert.isFalse(w.safeWrite('x'))
  })

  test('если write кидает — закрывает и вызывает cleanup ровно один раз', ({ assert }) => {
    const raw = {
      writableEnded: false,
      destroyed: false,
      write: () => {
        throw new Error('boom')
      },
    }
    let cleaned = 0
    const w = createSafeSseWriter(raw, () => {
      cleaned += 1
    })

    assert.isFalse(w.safeWrite('x'))
    assert.isTrue(w.closed)
    assert.equal(cleaned, 1)

    // subsequent writes are no-ops and don't call cleanup again
    assert.isFalse(w.safeWrite('y'))
    assert.equal(cleaned, 1)
  })
})
