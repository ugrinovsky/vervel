import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  parseLocalDate,
  toTimeKey,
  toApiDateTime,
  parseApiDateTime,
} from './date'

describe('toDateKey', () => {
  it('форматирует дату в YYYY-MM-DD по локальному времени', () => {
    expect(toDateKey(new Date(2024, 0, 5))).toBe('2024-01-05')
    expect(toDateKey(new Date(2024, 11, 31))).toBe('2024-12-31')
  })

  it('добавляет ведущий ноль к месяцу и дню', () => {
    expect(toDateKey(new Date(2024, 2, 3))).toBe('2024-03-03')
  })

  it('НЕ использует UTC — не сдвигает дату при любом timezone offset', () => {
    // new Date(2024, 0, 15) всегда локальный 15 января — независимо от TZ
    const d = new Date(2024, 0, 15)
    expect(toDateKey(d)).toBe('2024-01-15')
  })
})

describe('parseLocalDate', () => {
  it('парсит YYYY-MM-DD как локальную дату', () => {
    const d = parseLocalDate('2024-03-15')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(2) // март = 2
    expect(d.getDate()).toBe(15)
  })

  it('round-trip с toDateKey', () => {
    const key = '2024-07-04'
    expect(toDateKey(parseLocalDate(key))).toBe(key)
  })

  it('НЕ даёт UTC midnight — getDate() совпадает с переданным днём', () => {
    // new Date("2024-01-01") — UTC midnight, может вернуть 31 декабря в UTC-X
    // parseLocalDate должна всегда вернуть 1
    expect(parseLocalDate('2024-01-01').getDate()).toBe(1)
  })
})

describe('toTimeKey', () => {
  it('форматирует время в HH:mm', () => {
    expect(toTimeKey(new Date(2024, 0, 1, 9, 5))).toBe('09:05')
    expect(toTimeKey(new Date(2024, 0, 1, 23, 59))).toBe('23:59')
    expect(toTimeKey(new Date(2024, 0, 1, 0, 0))).toBe('00:00')
  })
})

describe('toApiDateTime', () => {
  it('строит строку YYYY-MM-DDTHH:mm:00 без timezone суффикса', () => {
    const date = new Date(2024, 5, 10)   // 10 июня 2024
    const time = new Date(2024, 0, 1, 14, 30) // 14:30
    expect(toApiDateTime(date, time)).toBe('2024-06-10T14:30:00')
  })

  it('не содержит Z или +00:00', () => {
    const result = toApiDateTime(new Date(2024, 0, 1), new Date(2024, 0, 1, 8, 0))
    expect(result).not.toContain('Z')
    expect(result).not.toContain('+')
  })
})

describe('parseApiDateTime', () => {
  it('парсит строку без timezone как локальное время', () => {
    const d = parseApiDateTime('2024-06-10T14:30:00')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
  })

  it('обрезает +00:00 суффикс от Lucid и не сдвигает время', () => {
    const d = parseApiDateTime('2024-06-10T14:30:00+00:00')
    // должно остаться 14:30 локально, а не конвертироваться из UTC
    expect(d.getHours()).toBe(14)
    expect(d.getDate()).toBe(10)
  })

  it('round-trip с toApiDateTime', () => {
    const date = new Date(2024, 3, 20)
    const time = new Date(2024, 0, 1, 18, 45)
    const str = toApiDateTime(date, time)
    const parsed = parseApiDateTime(str)
    expect(parsed.getFullYear()).toBe(2024)
    expect(parsed.getMonth()).toBe(3)
    expect(parsed.getDate()).toBe(20)
    expect(parsed.getHours()).toBe(18)
    expect(parsed.getMinutes()).toBe(45)
  })
})
