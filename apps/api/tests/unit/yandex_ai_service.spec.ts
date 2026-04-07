import { test } from '@japa/runner'
import { YandexAiService } from '#services/YandexAiService'

// Доступ к приватным методам через приведение типа
const svc = YandexAiService as any

// ─── parseWorkoutJson ──────────────────────────────────────────────────────

test.group('YandexAiService: parseWorkoutJson', () => {
  test('парсит корректный JSON тренировки', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [
        {
          name: 'Barbell Bench Press',
          displayName: 'Жим штанги лёжа',
          sets: 3,
          reps: 10,
          weight: 80,
          duration: null,
          notes: 'Грудные',
          supersetGroup: null,
        },
      ],
      notes: 'Тренировка груди',
    })
    const result = svc.parseWorkoutJson(json)
    assert.equal(result.workoutType, 'bodybuilding')
    assert.equal(result.exercises.length, 1)
    assert.equal(result.exercises[0].name, 'Barbell Bench Press')
    assert.equal(result.exercises[0].displayName, 'Жим штанги лёжа')
    assert.equal(result.exercises[0].sets, 3)
    assert.equal(result.exercises[0].reps, 10)
    assert.equal(result.exercises[0].weight, 80)
    assert.equal(result.notes, 'Тренировка груди')
  })

  test('убирает markdown ```json блок из ответа', ({ assert }) => {
    const raw = '```json\n{"workoutType":"crossfit","exercises":[],"notes":null}\n```'
    const result = svc.parseWorkoutJson(raw)
    assert.equal(result.workoutType, 'crossfit')
  })

  test('убирает markdown ``` без json из ответа', ({ assert }) => {
    const raw = '```\n{"workoutType":"cardio","exercises":[]}\n```'
    const result = svc.parseWorkoutJson(raw)
    assert.equal(result.workoutType, 'cardio')
  })

  test('бросает ошибку при невалидном JSON', ({ assert }) => {
    assert.throws(() => svc.parseWorkoutJson('not json at all'), /некорректный JSON/)
  })

  test('использует bodybuilding как дефолт при неизвестном workoutType', ({ assert }) => {
    const json = JSON.stringify({ workoutType: 'powerlifting', exercises: [] })
    assert.equal(svc.parseWorkoutJson(json).workoutType, 'bodybuilding')
  })

  test('принимает все три валидных типа тренировки', ({ assert }) => {
    for (const type of ['crossfit', 'bodybuilding', 'cardio']) {
      const json = JSON.stringify({ workoutType: type, exercises: [] })
      assert.equal(svc.parseWorkoutJson(json).workoutType, type)
    }
  })

  test('переключает workoutType на crossfit по маркерам AMRAP/EMOM в контексте', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Burpee', displayName: 'Бёрпи', sets: 1, reps: 10 }],
    })
    const result = svc.parseWorkoutJson(json, 'AMRAP 12 min\nBurpees 10')
    assert.equal(result.workoutType, 'crossfit')
  })

  test('переключает workoutType на cardio по duration без веса', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Run', displayName: 'Бег', sets: 1, duration: 30, weight: null }],
    })
    const result = svc.parseWorkoutJson(json, 'Бег 30 мин')
    assert.equal(result.workoutType, 'cardio')
  })

  test('если ИИ вернул cardio, но есть вес — корректирует на bodybuilding', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'cardio',
      exercises: [{ name: 'Bench', displayName: 'Жим', sets: 3, reps: 10, weight: 80 }],
    })
    const result = svc.parseWorkoutJson(json, 'Жим 3х10 80кг')
    assert.equal(result.workoutType, 'bodybuilding')
  })

  test('нормализует sets — минимум 1 при нулевом значении', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Squat', displayName: 'Присед', sets: 0, reps: 10 }],
    })
    assert.equal(svc.parseWorkoutJson(json).exercises[0].sets, 1)
  })

  test('нормализует sets — минимум 1 при отсутствующем значении', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Squat', displayName: 'Присед' }],
    })
    assert.equal(svc.parseWorkoutJson(json).exercises[0].sets, 1)
  })

  test('reps, weight, duration — undefined если null', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Curl', displayName: 'Сгибание', sets: 3, reps: null, weight: null, duration: null }],
    })
    const ex = svc.parseWorkoutJson(json).exercises[0]
    assert.isUndefined(ex.reps)
    assert.isUndefined(ex.weight)
    assert.isUndefined(ex.duration)
  })

  test('понимает десятичные значения с запятой (4,6 → 4.6)', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Махи', displayName: 'Махи', sets: 1, reps: 15, weight: '4,6' }],
    })
    const ex = svc.parseWorkoutJson(json).exercises[0]
    assert.equal(ex.weight, 4.6)
  })

  test('setData сохраняет разные веса по подходам', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [
        {
          name: 'Сгибания голени сидя',
          displayName: 'Сгибания голени сидя',
          setData: [
            { reps: 15, weight: 14 },
            { reps: 12, weight: 18 },
            { reps: 12, weight: 18 },
            { reps: 12, weight: 18 },
          ],
        },
      ],
    })
    const ex = svc.parseWorkoutJson(json).exercises[0]
    assert.equal(ex.sets, 4)
    assert.deepEqual(
      ex.setData?.map((s: any) => [s.reps, s.weight]),
      [
        [15, 14],
        [12, 18],
        [12, 18],
        [12, 18],
      ]
    )
  })

  test('notes — undefined если null', ({ assert }) => {
    const json = JSON.stringify({ workoutType: 'cardio', exercises: [], notes: null })
    assert.isUndefined(svc.parseWorkoutJson(json).notes)
  })

  test('supersetGroup — undefined если null', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Press', displayName: 'Жим', sets: 3, supersetGroup: null }],
    })
    assert.isUndefined(svc.parseWorkoutJson(json).exercises[0].supersetGroup)
  })

  test('supersetGroup сохраняется если задан', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Press', displayName: 'Жим', sets: 3, supersetGroup: 'A' }],
    })
    assert.equal(svc.parseWorkoutJson(json).exercises[0].supersetGroup, 'A')
  })

  test('displayName берётся из name если displayName пустой', ({ assert }) => {
    const json = JSON.stringify({
      workoutType: 'bodybuilding',
      exercises: [{ name: 'Pull-Up', displayName: '', sets: 3 }],
    })
    assert.equal(svc.parseWorkoutJson(json).exercises[0].displayName, 'Pull-Up')
  })

  test('обрабатывает пустой массив упражнений', ({ assert }) => {
    const json = JSON.stringify({ workoutType: 'crossfit', exercises: [] })
    assert.deepEqual(svc.parseWorkoutJson(json).exercises, [])
  })

  test('обрабатывает отсутствие поля exercises', ({ assert }) => {
    const json = JSON.stringify({ workoutType: 'crossfit' })
    assert.deepEqual(svc.parseWorkoutJson(json).exercises, [])
  })
})

// ─── toOcrMimeType ─────────────────────────────────────────────────────────

test.group('YandexAiService: toOcrMimeType', () => {
  test('image/jpeg → JPEG', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('image/jpeg'), 'JPEG')
  })

  test('image/jpg → JPEG', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('image/jpg'), 'JPEG')
  })

  test('image/png → PNG', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('image/png'), 'PNG')
  })

  test('application/pdf → PDF', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('application/pdf'), 'PDF')
  })

  test('image/webp → JPEG', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('image/webp'), 'JPEG')
  })

  test('image/heic → JPEG', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('image/heic'), 'JPEG')
  })

  test('неизвестный тип → JPEG по умолчанию', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('application/octet-stream'), 'JPEG')
  })

  test('регистр не важен', ({ assert }) => {
    assert.equal(svc.toOcrMimeType('IMAGE/JPEG'), 'JPEG')
    assert.equal(svc.toOcrMimeType('Image/PNG'), 'PNG')
  })
})

// ─── isEnabled ─────────────────────────────────────────────────────────────
// Примечание: env.get() в AdonisJS читается при старте приложения,
// поэтому тестируем только тип возврата.

test.group('YandexAiService: isEnabled', () => {
  test('возвращает boolean', ({ assert }) => {
    assert.isBoolean(YandexAiService.isEnabled())
  })
})
