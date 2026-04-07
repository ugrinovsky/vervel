import { describe, it, expect } from 'vitest';
import { normalizeExerciseLabel } from './textNormalize';
import { canonicalCustomExerciseKey } from './canonicalCustomExerciseKey';

describe('normalizeExerciseLabel', () => {
  it('унифицирует ё/е', () => {
    expect(normalizeExerciseLabel('Жим лёжа')).toBe(normalizeExerciseLabel('Жим лежа'));
  });

  it('унифицирует unicode-тире и пробелы', () => {
    expect(normalizeExerciseLabel('  Жим — лёжа  ')).toBe(normalizeExerciseLabel('жим - лежа'));
  });
});

describe('canonicalCustomExerciseKey', () => {
  it('даёт одинаковый ключ для эквивалентных названий', () => {
    expect(canonicalCustomExerciseKey('Жим  лёжа')).toBe(canonicalCustomExerciseKey('жим лежа'));
  });
});

