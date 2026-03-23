import { describe, it, expect } from 'vitest'
import { normalizeSearch, filterExercises } from './useExerciseFilters'
import type { Exercise } from '@/types/Exercise'

const ex = (title: string, category: Exercise['category'], zones: Exercise['zones']): Exercise =>
  ({ id: title, title, category, zones } as Exercise)

const catalog: Exercise[] = [
  ex('Приседания', 'strength', ['legs', 'glutes']),
  ex('Жим лёжа', 'strength', ['chests', 'triceps']),
  ex('Бёрпи', 'functional', ['legs', 'core']),
  ex('Велотренажёр', 'cardio', ['legs']),
  ex('Подтягивания', 'strength', ['back', 'biceps']),
]

// ── normalizeSearch ────────────────────────────────────────────────────────

describe('normalizeSearch', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeSearch('ЖИМ')).toBe('жим')
  })

  it('заменяет ё на е', () => {
    expect(normalizeSearch('Бёрпи')).toBe('берпи')
    expect(normalizeSearch('тёмный')).toBe('темный')
  })

  it('оба преобразования вместе', () => {
    expect(normalizeSearch('Бёрпи')).toBe('берпи')
  })

  it('пустая строка', () => {
    expect(normalizeSearch('')).toBe('')
  })
})

// ── filterExercises: поиск ─────────────────────────────────────────────────

describe('filterExercises: текстовый поиск', () => {
  it('находит по подстроке', () => {
    const r = filterExercises(catalog, 'жим', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Жим лёжа')
  })

  it('поиск регистронезависим', () => {
    expect(filterExercises(catalog, 'ПРИСЕДАНИЯ', null, null)).toHaveLength(1)
  })

  it('находит через нормализацию ё→е', () => {
    const r = filterExercises(catalog, 'берпи', null, null)
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Бёрпи')
  })

  it('пустой поиск возвращает всё', () => {
    expect(filterExercises(catalog, '', null, null)).toHaveLength(catalog.length)
  })

  it('пробелы в запросе обрезаются', () => {
    expect(filterExercises(catalog, '  жим  ', null, null)).toHaveLength(1)
  })

  it('нет совпадений → пустой массив', () => {
    expect(filterExercises(catalog, 'несуществующее', null, null)).toHaveLength(0)
  })
})

// ── filterExercises: фильтр по категории ──────────────────────────────────

describe('filterExercises: categoryFilter', () => {
  it('оставляет только нужную категорию', () => {
    const r = filterExercises(catalog, '', 'strength', null)
    expect(r.every((e) => e.category === 'strength')).toBe(true)
    expect(r).toHaveLength(3)
  })

  it('null — не фильтрует', () => {
    expect(filterExercises(catalog, '', null, null)).toHaveLength(catalog.length)
  })
})

// ── filterExercises: фильтр по зоне ───────────────────────────────────────

describe('filterExercises: zoneFilter', () => {
  it('оставляет только упражнения с нужной зоной', () => {
    const r = filterExercises(catalog, '', null, 'legs')
    expect(r.every((e) => e.zones.includes('legs'))).toBe(true)
    expect(r).toHaveLength(3)
  })

  it('null — не фильтрует', () => {
    expect(filterExercises(catalog, '', null, null)).toHaveLength(catalog.length)
  })
})

// ── filterExercises: комбинации ────────────────────────────────────────────

describe('filterExercises: комбинированные фильтры', () => {
  it('категория + зона', () => {
    const r = filterExercises(catalog, '', 'strength', 'legs')
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Приседания')
  })

  it('категория + поиск', () => {
    const r = filterExercises(catalog, 'жим', 'strength', null)
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Жим лёжа')
  })

  it('все три фильтра одновременно', () => {
    const r = filterExercises(catalog, 'приседания', 'strength', 'legs')
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Приседания')
  })

  it('несовместимые фильтры → пусто', () => {
    const r = filterExercises(catalog, '', 'cardio', 'back')
    expect(r).toHaveLength(0)
  })
})
