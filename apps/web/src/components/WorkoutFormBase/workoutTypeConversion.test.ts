import { describe, it, expect } from 'vitest'
import { convertExercisesForType, convertAiResult } from './workoutTypeConversion'
import type { ExerciseData } from '@/api/trainer'

// ── convertExercisesForType ────────────────────────────────────────────────

describe('convertExercisesForType: bodybuilding → crossfit', () => {
  it('берёт reps/weight из первого setsDetail', () => {
    const ex: ExerciseData = { name: 'Жим', setsDetail: [{ reps: 8, weight: 80 }, { reps: 6, weight: 90 }] }
    const [result] = convertExercisesForType([ex], 'bodybuilding', 'crossfit')
    expect(result.reps).toBe(8)
    expect(result.weight).toBe(80)
    expect(result.setsDetail).toBeUndefined()
    expect(result.sets).toBeUndefined()
  })

  it('fallback на ex.reps если setsDetail пустой', () => {
    const ex: ExerciseData = { name: 'Жим', reps: 10, setsDetail: [] }
    const [result] = convertExercisesForType([ex], 'bodybuilding', 'crossfit')
    expect(result.reps).toBe(10)
  })

  it('fallback 10 если нет ни setsDetail ни reps', () => {
    const ex: ExerciseData = { name: 'Жим' }
    const [result] = convertExercisesForType([ex], 'bodybuilding', 'crossfit')
    expect(result.reps).toBe(10)
  })

  it('удаляет blockId', () => {
    const ex: ExerciseData = { name: 'Жим', blockId: 'block-1', reps: 5 }
    const [result] = convertExercisesForType([ex], 'bodybuilding', 'crossfit')
    expect(result.blockId).toBeUndefined()
  })
})

describe('convertExercisesForType: crossfit → bodybuilding', () => {
  it('создаёт 3 одинаковых setsDetail из reps/weight', () => {
    const ex: ExerciseData = { name: 'Бёрпи', reps: 12, weight: 0, rounds: 3 }
    const [result] = convertExercisesForType([ex], 'crossfit', 'bodybuilding')
    expect(result.setsDetail).toHaveLength(3)
    expect(result.setsDetail![0]).toEqual({ reps: 12, weight: 0 })
    expect(result.rounds).toBeUndefined()
    expect(result.wodType).toBeUndefined()
  })

  it('не добавляет setsDetail если у упражнения есть duration', () => {
    const ex: ExerciseData = { name: 'Бег', duration: 30 }
    const [result] = convertExercisesForType([ex], 'crossfit', 'bodybuilding')
    expect(result.setsDetail).toBeUndefined()
    expect(result.duration).toBe(30)
  })
})

describe('convertExercisesForType: * → cardio', () => {
  it('удаляет все силовые поля и ставит duration 20', () => {
    const ex: ExerciseData = { name: 'Жим', sets: 3, reps: 10, weight: 80, setsDetail: [{ reps: 10 }], blockId: 'b1', rounds: 5 }
    const [result] = convertExercisesForType([ex], 'bodybuilding', 'cardio')
    expect(result.duration).toBe(20)
    expect(result.sets).toBeUndefined()
    expect(result.reps).toBeUndefined()
    expect(result.weight).toBeUndefined()
    expect(result.setsDetail).toBeUndefined()
    expect(result.blockId).toBeUndefined()
    expect(result.rounds).toBeUndefined()
    expect(result.name).toBe('Жим')
  })
})

describe('convertExercisesForType: cardio → crossfit', () => {
  it('удаляет duration и ставит reps 10', () => {
    const ex: ExerciseData = { name: 'Бег', duration: 30 }
    const [result] = convertExercisesForType([ex], 'cardio', 'crossfit')
    expect(result.duration).toBeUndefined()
    expect(result.reps).toBe(10)
  })

  it('не трогает упражнения без duration', () => {
    const ex: ExerciseData = { name: 'Бег', reps: 5 }
    const [result] = convertExercisesForType([ex], 'cardio', 'crossfit')
    expect(result).toEqual(ex)
  })
})

describe('convertExercisesForType: cardio → bodybuilding', () => {
  it('удаляет duration и создаёт 3 подхода 3×10', () => {
    const ex: ExerciseData = { name: 'Эллипс', duration: 45 }
    const [result] = convertExercisesForType([ex], 'cardio', 'bodybuilding')
    expect(result.duration).toBeUndefined()
    expect(result.sets).toBe(3)
    expect(result.reps).toBe(10)
    expect(result.setsDetail).toHaveLength(3)
  })
})

// ── convertAiResult ────────────────────────────────────────────────────────

describe('convertAiResult: cardio', () => {
  it('использует duration из AI или fallback 20', () => {
    const result = convertAiResult({ workoutType: 'cardio', exercises: [
      { name: 'run', sets: 1, duration: 30 },
      { name: 'bike', sets: 1 },
    ]})
    expect(result[0].duration).toBe(30)
    expect(result[1].duration).toBe(20)
    expect(result[0].reps).toBeUndefined()
  })
})

describe('convertAiResult: crossfit', () => {
  it('использует reps/weight, не создаёт setsDetail', () => {
    const result = convertAiResult({ workoutType: 'crossfit', exercises: [
      { name: 'burpee', sets: 3, reps: 15, weight: 0 },
    ]})
    expect(result[0].reps).toBe(15)
    expect(result[0].weight).toBe(0)
    expect(result[0].setsDetail).toBeUndefined()
  })

  it('fallback reps 10 если нет', () => {
    const result = convertAiResult({ workoutType: 'crossfit', exercises: [{ name: 'pull-up', sets: 3 }]})
    expect(result[0].reps).toBe(10)
  })
})

describe('convertAiResult: bodybuilding', () => {
  it('создаёт setsDetail по количеству sets', () => {
    const result = convertAiResult({ workoutType: 'bodybuilding', exercises: [
      { name: 'bench', sets: 4, reps: 8, weight: 100 },
    ]})
    expect(result[0].setsDetail).toHaveLength(4)
    expect(result[0].setsDetail![0]).toEqual({ reps: 8, weight: 100 })
  })

  it('fallback 3 подхода если sets undefined', () => {
    const result = convertAiResult({ workoutType: 'bodybuilding', exercises: [{ name: 'squat', sets: undefined as any }]})
    expect(result[0].setsDetail).toHaveLength(3)
  })

  it('использует displayName если есть', () => {
    const result = convertAiResult({ workoutType: 'bodybuilding', exercises: [
      { name: 'bench_press', displayName: 'Жим лёжа', sets: 3 },
    ]})
    expect(result[0].name).toBe('Жим лёжа')
  })

  it('генерирует ai-N exerciseId если нет реального', () => {
    const result = convertAiResult({ workoutType: 'bodybuilding', exercises: [{ name: 'x', sets: 3 }]})
    expect(result[0].exerciseId).toBe('ai-0')
  })
})
