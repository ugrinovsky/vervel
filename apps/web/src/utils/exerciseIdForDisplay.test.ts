import { describe, it, expect } from 'vitest';
import { exerciseIdForDisplay } from './exerciseIdForDisplay';

describe('exerciseIdForDisplay', () => {
  it('убирает custom: и подчёркивания', () => {
    expect(exerciseIdForDisplay('custom:румынская тяга')).toBe('румынская тяга');
    expect(exerciseIdForDisplay('Custom:Берпи')).toBe('Берпи');
    expect(exerciseIdForDisplay('Romanian_Deadlift')).toBe('Romanian Deadlift');
  });

  it('обычные названия не ломает', () => {
    expect(exerciseIdForDisplay('Жим лёжа')).toBe('Жим лёжа');
  });
});
