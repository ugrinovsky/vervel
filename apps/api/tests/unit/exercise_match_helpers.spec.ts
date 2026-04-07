import { test } from '@japa/runner'
import {
  capitalizeFirstForDisplay,
  canonicalCustomExerciseKey,
  displayNameMatchesCatalogTitle,
  normalizeExerciseLabel,
  tokenSubsetOverlap,
  tokenizeForMatch,
} from '#services/exercise_match_helpers'

test.group('capitalizeFirstForDisplay', () => {
  test('cyrillic leading lowercase', ({ assert }) => {
    assert.equal(capitalizeFirstForDisplay('румынская тяга'), 'Румынская тяга')
  })

  test('leaves rest unchanged', ({ assert }) => {
    assert.equal(capitalizeFirstForDisplay('жим ВВЕРХ'), 'Жим ВВЕРХ')
  })
})

test.group('tokenizeForMatch', () => {
  test('keeps cyrillic words length >= 2', ({ assert }) => {
    const t = tokenizeForMatch('Румынская тяга с гантелями')
    assert.isTrue(t.includes('румынская') && t.includes('тяга') && t.includes('гантелями'))
  })

  test('treats ё as е', ({ assert }) => {
    assert.deepEqual(tokenizeForMatch('Жим лёжа'), tokenizeForMatch('Жим лежа'))
  })
})

test.group('tokenSubsetOverlap', () => {
  test('full cover of shorter set', ({ assert }) => {
    const a = ['румынская', 'тяга', 'гантелями']
    const b = ['румынская', 'тяга']
    assert.equal(tokenSubsetOverlap(a, b), 1)
    assert.equal(tokenSubsetOverlap(b, a), 1)
  })
})

test.group('displayNameMatchesCatalogTitle', () => {
  test('matches extended russian name to catalog title', ({ assert }) => {
    assert.isTrue(
      displayNameMatchesCatalogTitle('Румынская тяга с 2-мя гантелями', 'Румынская тяга')
    )
  })

  test('no false match on unrelated', ({ assert }) => {
    assert.isFalse(displayNameMatchesCatalogTitle('Приседания', 'Румынская тяга'))
  })
})

test.group('canonicalCustomExerciseKey', () => {
  test('unifies case, ё/е, spaces for same custom id', ({ assert }) => {
    assert.equal(
      canonicalCustomExerciseKey('Жим  лёжа'),
      canonicalCustomExerciseKey('жим лежа')
    )
  })

  test('normalizes unicode dashes', ({ assert }) => {
    assert.equal(canonicalCustomExerciseKey('Тяга — штанга'), canonicalCustomExerciseKey('Тяга - штанга'))
  })
})

test.group('normalizeExerciseLabel', () => {
  test('unifies ё/е, dashes and spaces', ({ assert }) => {
    assert.equal(
      normalizeExerciseLabel('  Жим — лёжа  '),
      normalizeExerciseLabel('жим - лежа')
    )
  })
})
