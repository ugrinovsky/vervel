import { describe, it, expect } from 'vitest'
import { deduplicateMessage, resolveActiveChatId } from './chatUtils'

describe('deduplicateMessage', () => {
  it('возвращает null при дублирующемся id', () => {
    const prev = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]
    expect(deduplicateMessage(prev, { id: 1, text: 'dup' })).toBeNull()
  })

  it('добавляет новое сообщение в конец списка', () => {
    const prev = [{ id: 1, text: 'a' }]
    const result = deduplicateMessage(prev, { id: 2, text: 'b' })
    expect(result).toEqual([{ id: 1, text: 'a' }, { id: 2, text: 'b' }])
  })

  it('добавляет сообщение в пустой массив', () => {
    const result = deduplicateMessage([], { id: 5, text: 'first' })
    expect(result).toEqual([{ id: 5, text: 'first' }])
  })

  it('не мутирует исходный массив', () => {
    const prev = [{ id: 1, text: 'a' }]
    const result = deduplicateMessage(prev, { id: 2, text: 'b' })
    expect(result).not.toBe(prev)
    expect(prev).toHaveLength(1)
  })
})

describe('resolveActiveChatId', () => {
  it('возвращает null для null', () => {
    expect(resolveActiveChatId(null)).toBeNull()
  })

  it('возвращает null для пустой строки', () => {
    expect(resolveActiveChatId('')).toBeNull()
  })

  it('возвращает null для нечислового значения', () => {
    expect(resolveActiveChatId('abc')).toBeNull()
  })

  it('возвращает число для строки "42"', () => {
    expect(resolveActiveChatId('42')).toBe(42)
  })

  it('возвращает число для строки "0"', () => {
    expect(resolveActiveChatId('0')).toBe(0)
  })
})
