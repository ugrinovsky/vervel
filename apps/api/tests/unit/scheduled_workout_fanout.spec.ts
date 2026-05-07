import { test } from '@japa/runner'
import { computeFanoutActions } from '#services/ScheduledWorkoutFanoutService'

// Helper to build a fake existing Workout row
function row(id: number, userId: number, isDetached: boolean) {
  return { id, userId, isDetached }
}

test.group('computeFanoutActions — mode=create', () => {
  test('creates rows for all target athletes when no existing rows', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'create',
      targetAthleteIds: [1, 2, 3],
      existingRows: [],
    })

    const creates = actions.filter((a) => a.action === 'create').map((a) => a.athleteId)
    assert.sameMembers(creates, [1, 2, 3])
    assert.equal(actions.filter((a) => a.action !== 'create').length, 0)
  })

  test('deletes stale rows not in target list', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'create',
      targetAthleteIds: [1],
      existingRows: [row(10, 99, false)],
    })

    const deletes = actions.filter((a) => a.action === 'delete')
    assert.lengthOf(deletes, 1)
    assert.equal(deletes[0].athleteId, 99)
  })

  test('creates for empty target list produces no actions', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'create',
      targetAthleteIds: [],
      existingRows: [],
    })

    assert.lengthOf(actions, 0)
  })
})

test.group('computeFanoutActions — mode=update, no existing rows', () => {
  test('creates rows for all target athletes', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1, 2],
      existingRows: [],
    })

    const creates = actions.filter((a) => a.action === 'create').map((a) => a.athleteId)
    assert.sameMembers(creates, [1, 2])
  })
})

test.group('computeFanoutActions — mode=update, non-detached athletes', () => {
  test('updates existing non-detached rows', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1, 2],
      existingRows: [row(10, 1, false), row(11, 2, false)],
    })

    const updates = actions.filter((a) => a.action === 'update')
    assert.lengthOf(updates, 2)
    assert.sameDeepMembers(
      updates.map((a) => ({ athleteId: a.athleteId, workoutId: (a as any).workoutId })),
      [
        { athleteId: 1, workoutId: 10 },
        { athleteId: 2, workoutId: 11 },
      ]
    )
  })

  test('deletes row when non-detached athlete removed from assignedTo', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1],
      existingRows: [row(10, 1, false), row(11, 2, false)],
    })

    const deletes = actions.filter((a) => a.action === 'delete')
    assert.lengthOf(deletes, 1)
    assert.equal(deletes[0].athleteId, 2)
    assert.equal((deletes[0] as any).workoutId, 11)
  })

  test('creates new row for newly added athlete', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1, 3],
      existingRows: [row(10, 1, false)],
    })

    const creates = actions.filter((a) => a.action === 'create').map((a) => a.athleteId)
    assert.sameMembers(creates, [3])
    const updates = actions.filter((a) => a.action === 'update').map((a) => a.athleteId)
    assert.sameMembers(updates, [1])
  })
})

test.group('computeFanoutActions — mode=update, detached athletes', () => {
  test('skips detached athlete still in assignedTo — trainer edit does not overwrite', ({
    assert,
  }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1, 2],
      existingRows: [row(10, 1, true), row(11, 2, false)],
    })

    const skipped = actions.filter((a) => a.action === 'skip_detached').map((a) => a.athleteId)
    assert.sameMembers(skipped, [1])

    const updates = actions.filter((a) => a.action === 'update').map((a) => a.athleteId)
    assert.sameMembers(updates, [2])
  })

  test('skips detached athlete removed from assignedTo — row becomes personal workout', ({
    assert,
  }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [],
      existingRows: [row(10, 1, true)],
    })

    const skipped = actions.filter((a) => a.action === 'skip_detached').map((a) => a.athleteId)
    assert.sameMembers(skipped, [1])

    const deletes = actions.filter((a) => a.action === 'delete')
    assert.lengthOf(deletes, 0)
  })

  test('mixed: detached skipped, non-detached removed deleted, new athlete created', ({
    assert,
  }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [3, 4],
      existingRows: [
        row(10, 1, true), // detached, removed from assignedTo → skip
        row(11, 2, false), // non-detached, removed → delete
        row(12, 3, false), // non-detached, stays → update
      ],
    })

    const skipped = actions.filter((a) => a.action === 'skip_detached').map((a) => a.athleteId)
    assert.sameMembers(skipped, [1])

    const deletes = actions.filter((a) => a.action === 'delete').map((a) => a.athleteId)
    assert.sameMembers(deletes, [2])

    const updates = actions.filter((a) => a.action === 'update').map((a) => a.athleteId)
    assert.sameMembers(updates, [3])

    const creates = actions.filter((a) => a.action === 'create').map((a) => a.athleteId)
    assert.sameMembers(creates, [4])
  })

  test('all athletes detached — no deletes, no updates', ({ assert }) => {
    const actions = computeFanoutActions({
      mode: 'update',
      targetAthleteIds: [1, 2],
      existingRows: [row(10, 1, true), row(11, 2, true)],
    })

    assert.equal(actions.filter((a) => a.action === 'delete').length, 0)
    assert.equal(actions.filter((a) => a.action === 'update').length, 0)
    assert.equal(actions.filter((a) => a.action === 'skip_detached').length, 2)
  })
})
