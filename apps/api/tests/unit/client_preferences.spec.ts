import { test } from '@japa/runner'
import {
  mergeClientPreferences,
  patchClientPreferencesFromBody,
} from '#utils/client_preferences'

test.group('client_preferences: patchClientPreferencesFromBody', () => {
  test('принимает только известные поля', ({ assert }) => {
    const p = patchClientPreferencesFromBody({
      athleteOnboardingComplete: true,
      trainerWorkStyle: 'both',
      foo: 'bar',
    })
    assert.deepEqual(p, {
      athleteOnboardingComplete: true,
      trainerWorkStyle: 'both',
    })
  })

  test('неизвестное тело → пустой patch', ({ assert }) => {
    assert.deepEqual(patchClientPreferencesFromBody(null), {})
    assert.deepEqual(patchClientPreferencesFromBody({ x: 1 }), {})
  })

  test('отбрасывает невалидные значения enum', ({ assert }) => {
    const p = patchClientPreferencesFromBody({
      athleteCoachIntent: 'invalid',
      trainerWorkStyle: 'invalid',
    })
    assert.deepEqual(p, {})
  })
})

test.group('client_preferences: mergeClientPreferences', () => {
  test('накладывает patch поверх существующего JSON', ({ assert }) => {
    const merged = mergeClientPreferences(
      { athleteOnboardingComplete: true, trainerWorkStyle: 'individual' },
      { athleteCoachIntent: 'solo' }
    )
    assert.deepEqual(merged, {
      athleteOnboardingComplete: true,
      trainerWorkStyle: 'individual',
      athleteCoachIntent: 'solo',
    })
  })

  test('null/undefined → как пустой объект', ({ assert }) => {
    const merged = mergeClientPreferences(null, { coachTeamBannerDismissed: true })
    assert.deepEqual(merged, { coachTeamBannerDismissed: true })
  })
})
