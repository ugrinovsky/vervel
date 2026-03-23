import { describe, it, expect } from 'vitest'
import { formatVolume, formatVolumeCompact, getWorkoutTypeLabel } from './utils'

describe('formatVolume', () => {
  it('показывает кг при значении < 1000', () => {
    expect(formatVolume(0)).toBe('0 кг')
    expect(formatVolume(999)).toBe('999 кг')
    expect(formatVolume(500)).toBe('500 кг')
  })

  it('переключается на тонны при >= 1000', () => {
    expect(formatVolume(1000)).toBe('1.0 т')
    expect(formatVolume(1500)).toBe('1.5 т')
    expect(formatVolume(10000)).toBe('10.0 т')
  })

  it('округляет до одного знака после запятой', () => {
    expect(formatVolume(1234)).toBe('1.2 т')
    expect(formatVolume(1999)).toBe('2.0 т')
  })
})

describe('formatVolumeCompact', () => {
  it('показывает кг без пробела при < 1000', () => {
    expect(formatVolumeCompact(500)).toBe('500кг')
  })

  it('показывает тонны без пробела при >= 1000', () => {
    expect(formatVolumeCompact(1500)).toBe('1.5т')
  })
})

describe('getWorkoutTypeLabel', () => {
  it('возвращает известные типы', () => {
    expect(getWorkoutTypeLabel('crossfit')).toBe('Кроссфит')
    expect(getWorkoutTypeLabel('bodybuilding')).toBe('Силовая')
    expect(getWorkoutTypeLabel('cardio')).toBe('Кардио')
  })

  it('возвращает fallback для неизвестного типа', () => {
    expect(getWorkoutTypeLabel('unknown')).toBe('Тренировка')
    expect(getWorkoutTypeLabel('')).toBe('Тренировка')
  })
})
