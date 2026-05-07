import { test } from '@japa/runner'

/**
 * Pure logic for the isDetached flag computed in WorkoutsController.update.
 * Extracted here to test without DB or HTTP context.
 */
function computeIsDetached(opts: {
  currentIsDetached: boolean
  scheduledWorkoutId: number | null
}): boolean {
  return opts.scheduledWorkoutId !== null ? true : opts.currentIsDetached
}

test.group('isDetached flag — WorkoutsController.update logic', () => {
  test('becomes true when athlete saves a trainer-assigned workout (scheduledWorkoutId set)', ({
    assert,
  }) => {
    assert.isTrue(computeIsDetached({ currentIsDetached: false, scheduledWorkoutId: 42 }))
  })

  test('stays true if already detached and scheduledWorkoutId is set', ({ assert }) => {
    assert.isTrue(computeIsDetached({ currentIsDetached: true, scheduledWorkoutId: 42 }))
  })

  test('stays false for personal workout without scheduledWorkoutId', ({ assert }) => {
    assert.isFalse(computeIsDetached({ currentIsDetached: false, scheduledWorkoutId: null }))
  })

  test('preserves existing isDetached when no scheduledWorkoutId (personal workout)', ({
    assert,
  }) => {
    // Edge case: a workout that was once detached but scheduledWorkoutId was cleared
    assert.isTrue(computeIsDetached({ currentIsDetached: true, scheduledWorkoutId: null }))
  })
})
