import { test } from '@japa/runner'
import { computeOverloadedZones, recommendedBlock } from '#services/CopilotSharedRules'

test.group('CopilotSharedRules', () => {
  test('computeOverloadedZones: суммирует abs по тренировкам и применяет порог', ({ assert }) => {
    const zones = computeOverloadedZones([
      { zonesLoadAbs: { chests: 0.4, back: 0.2 } },
      { zonesLoadAbs: { chests: 0.35 } }, // total chests = 0.75 > 0.7
      { zonesLoadAbs: null },
    ])

    assert.isTrue(zones.includes('chests'))
    assert.isFalse(zones.includes('back'))
  })

  test('recommendedBlock: верх перегружен → низ', ({ assert }) => {
    assert.equal(recommendedBlock(['chests', 'back']), 'lower')
  })

  test('recommendedBlock: низ перегружен → верх', ({ assert }) => {
    assert.equal(recommendedBlock(['legs', 'glutes']), 'upper')
  })

  test('recommendedBlock: оба блока перегружены (>=2 + >=2) → cardio', ({ assert }) => {
    assert.equal(recommendedBlock(['chests', 'back', 'legs', 'glutes']), 'cardio')
  })
})

