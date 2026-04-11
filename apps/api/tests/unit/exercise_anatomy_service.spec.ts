import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { ExerciseAnatomyService, EXERCISE_ANATOMY_PROMPT_VERSION } from '#services/ExerciseAnatomyService'
import { YandexAiService } from '#services/YandexAiService'
import ExerciseAnatomyCache from '#models/exercise_anatomy_cache'
import { normalizeExerciseLabel } from '#services/exercise_match_helpers'

const yandex = YandexAiService as any

async function wipeCacheForLabel(displayLabel: string) {
  const key = normalizeExerciseLabel(displayLabel)
  await db.from('exercise_anatomy_cache').where('normalized_label', key).delete()
}

test.group('ExerciseAnatomyService', (group) => {
  let oldIsEnabled: any
  let oldCallGptRaw: any

  group.each.setup(async () => {
    oldIsEnabled = yandex.isEnabled
    oldCallGptRaw = yandex.callGptRaw
  })

  group.each.teardown(async () => {
    yandex.isEnabled = oldIsEnabled
    yandex.callGptRaw = oldCallGptRaw
  })

  test('AI выключен — null и без записи в кэш', async ({ assert }) => {
    yandex.isEnabled = () => false
    await wipeCacheForLabel('Жим лёжа')

    const z = await ExerciseAnatomyService.resolveZonesForExercise({
      name: 'Жим лёжа',
      displayName: 'Жим лёжа',
    })
    assert.isNull(z)

    const row = await ExerciseAnatomyCache.findBy('normalizedLabel', normalizeExerciseLabel('Жим лёжа'))
    assert.isNull(row)
  })

  test('два вызова GPT: биотекст затем JSON zones', async ({ assert }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Движение в плечевом и локтевом суставах, грудь и трицепс.'
      return JSON.stringify({ zones: ['chests', 'triceps', 'shoulders'] })
    }

    await wipeCacheForLabel('Жим лёжа')

    const z = await ExerciseAnatomyService.resolveZonesForExercise({
      name: 'Жим лёжа',
      displayName: 'Жим лёжа',
    })

    assert.deepEqual(z, ['chests', 'triceps', 'shoulders'])
    assert.equal(step, 2)

    const row = await ExerciseAnatomyCache.findBy('normalizedLabel', normalizeExerciseLabel('Жим лёжа'))
    assert.isNotNull(row)
    assert.equal(row!.status, 'ok')
    assert.equal(row!.promptVersion, EXERCISE_ANATOMY_PROMPT_VERSION)
    assert.deepEqual(row!.zones, ['chests', 'triceps', 'shoulders'])
  })

  test('повторный resolve с тем же названием не вызывает GPT (кэш)', async ({ assert }) => {
    yandex.isEnabled = () => true
    let calls = 0
    yandex.callGptRaw = async () => {
      calls++
      if (calls === 1) return 'Описание'
      return JSON.stringify({ zones: ['back', 'biceps'] })
    }

    await wipeCacheForLabel('Тяга верхнего блока')

    await ExerciseAnatomyService.resolveZonesForExercise({
      name: 'Тяга верхнего блока',
      displayName: 'Тяга верхнего блока',
    })
    assert.equal(calls, 2)

    calls = 0
    const z2 = await ExerciseAnatomyService.resolveZonesForExercise({
      name: 'Тяга верхнего блока',
      displayName: 'Тяга верхнего блока',
    })
    assert.equal(calls, 0)
    assert.deepEqual(z2, ['back', 'biceps'])

    await wipeCacheForLabel('Тяга верхнего блока')
  })

  test('невалидные зоны в JSON → unknown в кэш и null', async ({ assert }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Какой-то текст.'
      return JSON.stringify({ zones: ['not_a_zone'] })
    }

    await wipeCacheForLabel('Абракадабра зона')

    const z = await ExerciseAnatomyService.resolveZonesForExercise({
      name: 'Абракадабра зона',
      displayName: 'Абракадабра зона',
    })
    assert.isNull(z)

    const row = await ExerciseAnatomyCache.findBy('normalizedLabel', normalizeExerciseLabel('Абракадабра зона'))
    assert.isNotNull(row)
    assert.equal(row!.status, 'unknown')

    await wipeCacheForLabel('Абракадабра зона')
  })

  test('refineZonesForExercises: одно уникальное имя — один двухшаговый проход на два упражнения', async ({
    assert,
  }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Сгибание тазобедренного, ягодицы и задняя поверхность бедра.'
      return JSON.stringify({ zones: ['glutes', 'legs', 'back'] })
    }

    await wipeCacheForLabel('Румынская тяга')

    const input = [
      { name: 'Румынская тяга', displayName: 'Румынская тяга', sets: 3 },
      { name: 'Румынская тяга', displayName: 'Румынская тяга', sets: 4 },
    ] as any

    const out = await ExerciseAnatomyService.refineZonesForExercises(input)
    assert.deepEqual(out[0]?.zones, ['glutes', 'legs', 'back'])
    assert.deepEqual(out[1]?.zones, ['glutes', 'legs', 'back'])
    assert.equal(step, 2)

    await wipeCacheForLabel('Румынская тяга')
  })
})
