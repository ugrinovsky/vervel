import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { AiZonesService } from '#services/AiZonesService'
import { YandexAiService } from '#services/YandexAiService'
import { normalizeExerciseLabel } from '#services/exercise_match_helpers'

const yandex = YandexAiService as any

async function wipeAnatomyCacheLabels(...displayLabels: string[]) {
  for (const label of displayLabels) {
    const key = normalizeExerciseLabel(label)
    await db.from('exercise_anatomy_cache').where('normalized_label', key).delete()
  }
}

test.group('AiZonesService', (group) => {
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

  test('возвращает исходные упражнения когда AI выключен', async ({ assert }) => {
    yandex.isEnabled = () => false
    const input = [{ name: 'Румынская тяга', displayName: 'Румынская тяга', sets: 3 }]
    const out = await AiZonesService.refineZonesForExercises(input as any)
    assert.deepEqual(out, input)
  })

  test('применяет zones после двухшагового ответа (био + JSON)', async ({ assert }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Сгибание в тазобедренном, нагрузка на ягодицы и заднюю поверхность бедра, спина стабилизирует.'
      return JSON.stringify({ zones: ['glutes', 'legs', 'back'] })
    }

    await wipeAnatomyCacheLabels('Румынская тяга')

    const input = [{ name: 'Румынская тяга', displayName: 'Румынская тяга', sets: 3 }]
    const out = await AiZonesService.refineZonesForExercises(input as any)
    assert.deepEqual(out[0]?.zones, ['glutes', 'legs', 'back'])

    await wipeAnatomyCacheLabels('Румынская тяга')
  })

  test('фильтрует неразрешённые зоны; непустой результат заменяет zones', async ({ assert }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Тазобедренный шарнир.'
      return JSON.stringify({ zones: ['hamstrings', 'glutes'] })
    }

    await wipeAnatomyCacheLabels('rdl')

    const input = [{ name: 'RDL', displayName: 'RDL', sets: 3, zones: ['back', 'legs'] }]
    const out = await AiZonesService.refineZonesForExercises(input as any)
    assert.deepEqual(out[0]?.zones, ['glutes'])

    await wipeAnatomyCacheLabels('rdl')
  })

  test('битый JSON на шаге 2 не ломает и возвращает исходные упражнения', async ({ assert }) => {
    yandex.isEnabled = () => true
    let step = 0
    yandex.callGptRaw = async () => {
      step++
      if (step === 1) return 'Нормальный биотекст.'
      return 'not json'
    }

    await wipeAnatomyCacheLabels('Жим лёжа')

    const input = [{ name: 'Жим лёжа', displayName: 'Жим лёжа', sets: 3, zones: ['chests'] }]
    const out = await AiZonesService.refineZonesForExercises(input as any)
    assert.deepEqual(out, input)

    await wipeAnatomyCacheLabels('Жим лёжа')
  })
})

